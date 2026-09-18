// journal kernel — human-feedback probe client (window.JK.probe).
//
// Talks to the same `journal-ai` Edge Function as JK.ai (JWT + anon apikey);
// the function forwards four ops to Requisite's probe API server-side, using
// its own REQUISITE_URL + REQUISITE_PROBE_KEY secrets. This client never
// holds the Requisite URL or key, and never talks to Requisite directly:
//   probe_hello     fired once per journal-page load ("installed" health ping)
//   probe_next      fired after a successful entry save ("ask something now?")
//   probe_answer    one tapped answer (numeric value)
//   probe_dismiss   the card's × (recorded as dismissed:true, no value)
//   probe_direction free text the journaler typed INTO THE SUGGESTION BOX
//
// Privacy: NO journal content ever rides a probe op. That rule is unchanged
// and is the one that matters; what changed on 2026-09-18 is that it used to
// be enforced by a blunter one — "no free text at all" — which also ruled out
// the journaler telling us anything in their own words.
//
// The distinction the blunter rule could not make: journal text is written
// FOR THEMSELVES and we happen to process it, while the suggestion box is
// written TO US, deliberately, in a field that says so and starts empty every
// time. Only the second travels. Nothing reads the editor, the entry store or
// the clipboard; the only string that can leave is one typed into that box
// and then sent by pressing Send.
//
// Identity is a pseudonymous id the Edge Function derives (SHA-256 of the
// Supabase user id); this file sends nothing identifying at all.
//
// Failure model: feedback is optional, journaling never breaks. Everything
// here is fire-and-forget; when the function reports {off:true} (probe not
// configured) or anything errors, the card simply never appears.
//
// UX rules (enforced here): at most one card per save; the card appears
// AFTER the save feedback, fixed bottom-right — never over the editor and
// never grabbing focus; dismiss removes it, and answering turns it into the
// suggestion box rather than closing it.
//
// The suggestion box is also reachable on its own, from the top-nav button,
// with no question in front of it and no eligibility gate at all — that is
// what makes it a standing channel rather than a reward for answering. The
// two paths post the same op; the only difference is whether questionId is
// filled in.
(function () {
    'use strict';
    window.JK = window.JK || {};

    // "Entry saved" feedback shows for 1.8s — the card lands just after it.
    var SAVE_FEEDBACK_MS = 2000;

    var helloFired = false;
    var inFlight = false;     // one probe_next per save, max
    var currentAsk = null;    // the ask on screen (or scheduled), if any

    // ?probe=test rehearsal mode: answers are stored upstream but marked
    // test (excluded from aggregates, no ask-budget consumed). Captured at
    // load — journal.js strips query params via replaceState later.
    var testMode = false;
    try {
        testMode = new URLSearchParams(window.location.search).get('probe') === 'test';
    } catch (e) { /* noop */ }

    function endpoint() {
        var cfg = window.JK_CONFIG || {};
        var base = String(cfg.FUNCTIONS_URL || '').replace(/\/+$/, '');
        return base + '/journal-ai';
    }

    /** POST the op payload with the caller's Supabase JWT + anon apikey —
     *  the same calling pattern as JK.ai. */
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

    function postJson(body) {
        return post(body).then(function (response) {
            if (!response.ok) throw new Error('HTTP error ' + response.status);
            return response.json();
        });
    }

    /** Fire-and-forget send — probe failures are always silent. */
    function send(body) {
        try {
            postJson(body).catch(function () { /* silent */ });
        } catch (e) { /* silent */ }
    }

    // ---------- card ----------

    function removeCard(animate) {
        currentAsk = null;
        var el = document.getElementById('probeCard');
        if (!el) return;
        if (animate) {
            el.classList.remove('visible');
            setTimeout(function () {
                if (el.parentNode) el.parentNode.removeChild(el);
            }, 250);
        } else if (el.parentNode) {
            el.parentNode.removeChild(el);
        }
    }

    function sendAnswer(ask, value) {
        var body = {
            op: 'probe_answer',
            questionId: ask.questionId,
            questionVersion: ask.questionVersion,
            value: value
        };
        // Echo how the question came to be chosen, so the answer stays
        // re-weightable upstream.
        if (typeof ask.propensity === 'number') body.propensity = ask.propensity;
        if (typeof ask.exploring === 'boolean') body.exploring = ask.exploring;
        if (testMode) body.test = true;
        send(body);
    }

    /** One suggestion. `ask` is null when it came from the standing surface —
     *  a direction belongs to no question, and saying which one they had just
     *  answered is context upstream, never a parent. */
    function sendDirection(text, ask) {
        var body = { op: 'probe_direction', body: String(text).slice(0, 2000) };
        if (ask && ask.questionId) body.questionId = ask.questionId;
        if (testMode) body.test = true;
        // Not fire-and-forget, unlike every other op here. Somebody typed this
        // on purpose and is entitled to know it did not arrive; the caller
        // renders the difference.
        return postJson(body);
    }

    function sendDismiss(ask) {
        var body = {
            op: 'probe_dismiss',
            questionId: ask.questionId,
            questionVersion: ask.questionVersion
        };
        if (testMode) body.test = true;
        send(body);
    }

    /**
     * Turn the card into the suggestion box.
     *
     * The same card, rewritten in place, rather than a second card appearing:
     * a new panel after an answer reads as a second interruption, and this is
     * meant to read as the other half of the one they already chose to have.
     *
     * `ask` may be null — from the top-nav button there is no question behind
     * it at all, and the copy changes accordingly: after an answer this is a
     * follow-on, and on its own it has to say what it is for.
     */
    function showSuggestionStep(card, ask) {
        // Everything belonging to the question goes. The lead isolated THAT
        // question, the scale is answered, the anchors describe a row that is
        // no longer on screen.
        ['probe-card-lead', 'probe-card-question', 'probe-card-answers', 'probe-card-anchors'].forEach(
            function (cls) {
                var el = card.querySelector('.' + cls);
                if (el) el.parentNode.removeChild(el);
            },
        );

        var q = document.createElement('div');
        q.className = 'probe-card-question';
        q.textContent = ask
            ? 'Thanks. Anything we should be looking at?'
            : 'What should we be looking at?';
        card.appendChild(q);

        var hint = document.createElement('div');
        hint.className = 'probe-card-hint';
        hint.textContent = ask
            ? 'Whatever you think deserves attention — it goes to Willem, not to the model.'
            : 'Something that bothers you, something you wish it did, something worth measuring. It goes to Willem, not to the model.';
        card.appendChild(hint);

        var box = document.createElement('textarea');
        box.className = 'probe-card-text';
        box.rows = 3;
        box.maxLength = 2000;
        box.placeholder = 'One line is plenty';
        box.setAttribute('aria-label', 'What should we be looking at?');
        card.appendChild(box);

        var status = document.createElement('div');
        status.className = 'probe-card-status';
        card.appendChild(status);

        var row = document.createElement('div');
        row.className = 'probe-card-send';

        var send = document.createElement('button');
        send.type = 'button';
        send.className = 'probe-send-btn';
        send.textContent = 'Send';
        row.appendChild(send);

        // Its own Skip, rather than relabelling the ×. The cross closes the
        // card and must keep meaning that at every step; a control that
        // changes what it does mid-card is how somebody closes by accident.
        var skip = document.createElement('button');
        skip.type = 'button';
        skip.className = 'probe-skip-btn';
        skip.textContent = ask ? 'Skip' : 'Close';
        skip.addEventListener('click', function () { removeCard(true); });
        row.appendChild(skip);

        card.appendChild(row);

        var sending = false;
        send.addEventListener('click', function () {
            var text = (box.value || '').trim();
            if (!text || sending) return;
            sending = true;
            send.disabled = true;
            send.textContent = 'Sending';
            status.textContent = '';
            sendDirection(text, ask).then(function () {
                status.className = 'probe-card-status ok';
                status.textContent = 'Sent. Thank you.';
                setTimeout(function () { removeCard(true); }, 1200);
            }).catch(function () {
                // Said out loud, unlike every other probe failure. The rest are
                // things we asked for and can ask for again; this is something
                // they chose to write, and silently dropping it would be the
                // app pretending to have listened.
                sending = false;
                send.disabled = false;
                send.textContent = 'Send';
                status.className = 'probe-card-status err';
                status.textContent = 'That did not send. Try again in a moment.';
            });
        });

        box.focus();
    }

    /** The standing surface: the suggestion box with no question in front of
     *  it, on demand, subject to no eligibility rule whatsoever. */
    function openSuggestion() {
        removeCard(false);
        var card = document.createElement('div');
        card.className = 'probe-card';
        card.id = 'probeCard';
        currentAsk = null;

        var close = document.createElement('button');
        close.type = 'button';
        close.className = 'probe-card-close';
        close.setAttribute('aria-label', 'Close');
        close.textContent = '\u00d7';
        close.addEventListener('click', function () { removeCard(true); });
        card.appendChild(close);

        var label = document.createElement('div');
        label.className = 'card-section-label';
        label.textContent = 'Suggest a direction';
        card.appendChild(label);

        document.body.appendChild(card);
        showSuggestionStep(card, null);
        requestAnimationFrame(function () { card.classList.add('visible'); });
    }

    /** Render the question card. All API-provided strings are set via
     *  textContent — never innerHTML. */
    function showCard(ask) {
        removeCard(false);

        var card = document.createElement('div');
        card.className = 'probe-card';
        card.id = 'probeCard';

        var done = false; // one tap total: first answer/dismiss wins

        var close = document.createElement('button');
        close.type = 'button';
        close.className = 'probe-card-close';
        close.setAttribute('aria-label', 'Dismiss this question');
        close.textContent = '×';
        close.addEventListener('click', function () {
            if (done) return;
            done = true;
            sendDismiss(ask);
            removeCard(true);
        });
        card.appendChild(close);

        var label = document.createElement('div');
        label.className = 'card-section-label';
        label.textContent = 'Quick question';
        card.appendChild(label);

        if (ask.lead && String(ask.lead).trim()) {
            var lead = document.createElement('div');
            lead.className = 'probe-card-lead';
            lead.textContent = String(ask.lead);
            card.appendChild(lead);
        }

        var q = document.createElement('div');
        q.className = 'probe-card-question';
        q.textContent = String(ask.text || '');
        card.appendChild(q);

        var answers = Array.isArray(ask.answers) ? ask.answers : [];
        // Numbered scale (labels are numerals): equal-width row + the two
        // anchor words from `labels`. Worded scale / yes-no: wrapping pills.
        var numbered = answers.length > 0 && answers.every(function (a) {
            return a && /^\d+$/.test(String(a.label));
        });

        var row = document.createElement('div');
        row.className = 'probe-card-answers' + (numbered ? ' numbered' : '');
        answers.forEach(function (a) {
            if (!a || typeof a.value !== 'number') return;
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'probe-answer-btn';
            btn.textContent = String(a.label);
            btn.addEventListener('click', function () {
                if (done) return;
                done = true;
                // The answer goes NOW, on its own row, before the suggestion
                // step is offered. Deferring it until they resolve the second
                // step would lose the rating for anyone who closes the tab
                // there — and the rating is the part that was asked for.
                sendAnswer(ask, a.value);
                showSuggestionStep(card, ask);
            });
            row.appendChild(btn);
        });

        // No tappable options (shouldn't happen per the contract) — never
        // show a question that can't be answered.
        if (row.children.length === 0) {
            currentAsk = null;
            return;
        }
        card.appendChild(row);

        if (numbered && Array.isArray(ask.labels) && ask.labels.length >= 2) {
            var anchors = document.createElement('div');
            anchors.className = 'probe-card-anchors';
            var lo = document.createElement('span');
            lo.textContent = String(ask.labels[0]);
            var hi = document.createElement('span');
            hi.textContent = String(ask.labels[ask.labels.length - 1]);
            anchors.appendChild(lo);
            anchors.appendChild(hi);
            card.appendChild(anchors);
        }

        document.body.appendChild(card);
        requestAnimationFrame(function () { card.classList.add('visible'); });
    }

    // ---------- public API ----------

    /** "The app booted in a live page" — Requisite's installed-vs-silent
     *  health check. Once per page load; failures silent. */
    function hello() {
        if (helloFired) return;
        helloFired = true;
        send({ op: 'probe_hello', path: window.location.pathname });
    }

    /** Ask for (at most) one question after a successful entry save. */
    function afterSave() {
        // Never more than one card per save: skip while a request is in
        // flight or a card is already on screen / scheduled.
        if (inFlight || currentAsk) return;
        inFlight = true;
        var body = { op: 'probe_next' };
        if (testMode) body.test = true;
        postJson(body).then(function (data) {
            inFlight = false;
            if (!data || data.off || !data.ask) return;
            var ask = data.ask;
            if (!ask.questionId || typeof ask.questionVersion !== 'number') return;
            currentAsk = ask;
            // Land after the save feedback has come and gone.
            setTimeout(function () {
                if (currentAsk === ask) showCard(ask);
            }, SAVE_FEEDBACK_MS);
        }).catch(function () {
            inFlight = false; // silent — journaling never breaks
        });
    }

    // The standing surface wires itself, rather than waiting for journal.js to
    // call it: the button has to work on a page where the probe is switched
    // off upstream ({off:true}) as well as on one where it is on. Sending is
    // what can fail there, and the box says so; not opening at all would look
    // like a broken button.
    function mountSuggestButton() {
        var btn = document.getElementById('suggestBtn');
        if (!btn) return;
        btn.addEventListener('click', function () {
            if (document.getElementById('probeCard')) removeCard(false);
            openSuggestion();
        });
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mountSuggestButton);
    } else {
        mountSuggestButton();
    }

    window.JK.probe = {
        hello: hello,
        afterSave: afterSave,
        openSuggestion: openSuggestion
    };
})();
