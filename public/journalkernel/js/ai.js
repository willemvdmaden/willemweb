// journal kernel — Edge Function client (window.JK.ai).
//
// Talks to the `journal-ai` Supabase Edge Function, which holds the
// OpenRouter key and re-emits the reference Flask SSE contract:
//   data: {"type":"suggestion"|"explanation","chunk":...,"full":...}\n\n  (repeated)
//   data: {"type":"suggestion_complete"|"explanation_complete","full":...}\n\n
//   data: {"type":"done"}\n\n
//   data: {"type":"error","message":...}\n\n   (on mid-stream failure)
//
// The client uses raw fetch + response.body.getReader() (not
// supabase.functions.invoke) so streaming reads work identically to the
// reference app's SSE-over-POST reader (buffer on "\n\n", parse "data: "
// lines, render `full`).
//
// Payload field names mirror the Flask endpoints exactly (see the Edge
// Function's index.ts): journal_text, variant ("paj"|"open" — callers map
// auto→open), paj_prompt, previous_questions / previous_explanations,
// reflection_question, user_memory, recent_gist, entry_text, current_memory.
(function () {
    'use strict';
    window.JK = window.JK || {};

    function endpoint() {
        var cfg = window.JK_CONFIG || {};
        var base = String(cfg.FUNCTIONS_URL || '').replace(/\/+$/, '');
        return base + '/journal-ai';
    }

    /** POST the op payload with the caller's Supabase JWT + anon apikey. */
    function post(body) {
        return window.JK.auth.getAccessToken().then(function (token) {
            if (!token) throw new Error('Not signed in');
            var cfg = window.JK_CONFIG || {};
            return fetch(endpoint(), {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'apikey': cfg.SUPABASE_ANON_KEY || '',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
        });
    }

    /**
     * Stream one SSE-over-POST op.
     *   body:      the request payload (op already set)
     *   eventType: "suggestion" | "explanation"
     *   cbs:       { onDelta(full), onComplete(full), onError(err) }
     * onComplete fires exactly once, on <eventType>_complete (the trimmed
     * final text). A stream that ends without a complete event, an HTTP
     * error, or a {"type":"error"} event all route to onError.
     */
    function streamOp(body, eventType, cbs) {
        cbs = cbs || {};
        var completeType = eventType + '_complete';
        var completed = false;
        var errored = false;

        function fail(err) {
            if (completed || errored) return;
            errored = true;
            if (cbs.onError) cbs.onError(err);
        }

        post(body).then(function (response) {
            if (!response.ok) {
                throw new Error('HTTP error ' + response.status);
            }
            var reader = response.body.getReader();
            var decoder = new TextDecoder();
            var buffer = '';

            function pump() {
                return reader.read().then(function (r) {
                    if (r.done) {
                        if (!completed) fail(new Error('Stream ended without completion'));
                        return;
                    }
                    buffer += decoder.decode(r.value, { stream: true });
                    var lines = buffer.split('\n\n');
                    buffer = lines.pop() || '';
                    for (var i = 0; i < lines.length; i++) {
                        var line = lines[i];
                        if (line.indexOf('data: ') !== 0) continue;
                        var data;
                        try {
                            data = JSON.parse(line.slice(6));
                        } catch (parseErr) {
                            continue; // partial/garbled event — skip
                        }
                        if (data.type === eventType) {
                            if (!completed && cbs.onDelta) cbs.onDelta(data.full || '');
                        } else if (data.type === completeType) {
                            completed = true;
                            if (cbs.onComplete) cbs.onComplete(data.full || '');
                        } else if (data.type === 'error') {
                            fail(new Error(data.message || 'Streaming error'));
                            return;
                        }
                        // "done" carries nothing further.
                    }
                    return pump();
                });
            }
            return pump();
        }).catch(fail);
    }

    /**
     * payload: { journal_text, variant, paj_prompt, previous_questions,
     *            user_memory, recent_gist }
     */
    function streamSuggestion(payload, cbs) {
        var body = Object.assign({ op: 'suggest' }, payload);
        streamOp(body, 'suggestion', cbs);
    }

    /**
     * payload: { journal_text (text at card creation), reflection_question,
     *            variant, paj_prompt, previous_explanations, user_memory,
     *            recent_gist }
     */
    function streamExplanation(payload, cbs) {
        var body = Object.assign({ op: 'explain' }, payload);
        streamOp(body, 'explanation', cbs);
    }

    /**
     * Post-save kernel-memory update (non-streaming).
     *   { entry_text, current_memory } -> Promise<{summary, memory}>
     * The function returns 200 with the memory unchanged when the model's
     * output can't be parsed, so callers can treat any resolved value as
     * safe to store. Callers must swallow rejections silently (the save
     * itself already succeeded).
     */
    function updateMemory(payload) {
        var body = Object.assign({ op: 'memory' }, payload);
        return post(body).then(function (response) {
            if (!response.ok) throw new Error('HTTP error ' + response.status);
            return response.json();
        }).then(function (data) {
            return {
                summary: typeof data.summary === 'string' ? data.summary : '',
                memory: typeof data.memory === 'string' ? data.memory : ''
            };
        });
    }

    window.JK.ai = {
        streamSuggestion: streamSuggestion,
        streamExplanation: streamExplanation,
        updateMemory: updateMemory
    };
})();
