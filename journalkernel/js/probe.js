// journal kernel — human-feedback probe client (window.JK.probe).
//
// Talks to the same `journal-ai` Edge Function as JK.ai (JWT + anon apikey);
// the function forwards four ops to Requisite's probe API server-side, using
// its own REQUISITE_URL + REQUISITE_PROBE_KEY secrets. This client never
// holds the Requisite URL or key, and never talks to Requisite directly:
//   probe_hello    fired once per journal-page load ("installed" health ping)
//   probe_next     fired after a successful entry save ("ask something now?")
//   probe_answer   one tapped answer (numeric value)
//   probe_dismiss  the card's × (recorded as dismissed:true, no value)
//
// Privacy: NO journal content ever rides a probe op — question ids and
// numeric answer values only (the card renders only the options the API
// returns; there is no free-text input). Identity is a pseudonymous id the
// Edge Function derives (SHA-256 of the Supabase user id); this file sends
// nothing identifying at all.
//
// Failure model: feedback is optional, journaling never breaks. Everything
// here is fire-and-forget; when the function reports {off:true} (probe not
// configured) or anything errors, the card simply never appears.
//
// UX rules (enforced here): at most one card per save; the card appears
// AFTER the save feedback, fixed bottom-right — never over the editor and
// never grabbing focus; answer or dismiss removes it.
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

    function sendDismiss(ask) {
        var body = {
            op: 'probe_dismiss',
            questionId: ask.questionId,
            questionVersion: ask.questionVersion
        };
        if (testMode) body.test = true;
        send(body);
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
                sendAnswer(ask, a.value);
                removeCard(true);
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

    window.JK.probe = {
        hello: hello,
        afterSave: afterSave
    };
})();
