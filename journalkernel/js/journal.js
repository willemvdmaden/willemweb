// journal kernel — editor page (index.html).
//
// Faithful port of the v2 paths of journal-mvp/static/experimental.js:
//   - three mode pills (PAJ / Open / Auto) with full state wipe on switch
//   - PAJ locked editor until a prompt is chosen; 18ms/char typewriter
//   - trigger engine: >=20 words first fire; 5s pause when the text ends
//     with sentence punctuation, else 15s fallback (deliberately NOT
//     re-checked at fire time); >=40 net-new chars + caret-at-end +
//     changed-text guards for re-fires
//   - pause-progress SVG ring at the caret line -> "Thinking…" spin
//   - queue-if-typing suggestion delivery
//   - v2 auto-open 320px margin card at the caret line, chevron markers,
//     keep (bookmark) / dismiss (trash) icons, on-demand explanations
//     (auto-streamed in Auto mode)
//   - draft autosave (debounced ~300ms + flush on blur/hide/unload),
//     save via icon + Cmd/Ctrl+S, entries sidebar, ?new= / ?entry= links
//
// Server-side persistence is gone: entries/drafts/memory live in
// localStorage via JK.store; AI calls go through JK.ai (Edge Function).
(function () {
    'use strict';

    var U = window.JK.util;
    var PROMPTS = window.JK.prompts.PROMPTS;

    // ============= CONSTANTS (verbatim from the reference) =============
    var MIN_WORDS_FIRST_TRIGGER = 20;   // words before the first question fires
    var MIN_NEW_CHARS_RETRIGGER = 40;   // net-new tail chars before a re-fire
    var PAUSE_THRESHOLD_MS = 5000;      // pause after sentence punctuation
    var LONG_PAUSE_MS = 15000;          // fallback for unpunctuated writers
    var DRAFT_DEBOUNCE_MS = 300;

    // ============= STATE =============
    var store = null;                   // JK.store, after init
    var currentVariant = 'paj';
    var currentPromptKey = null;
    var currentEntryId = null;
    var memoryOn = true;

    var cardHistory = [];
    var cardCounter = 0;
    var activeMarkerId = null;

    var typingTimer = null;             // NOTE: cleared but deliberately not
                                        // nulled in handleTyping — a truthy
                                        // stale id is how onSuggestionReady
                                        // knows the user typed since (queue).
    var lastProcessedText = '';
    var hasTriggeredOnce = false;
    var lastJournalText = '';
    var currentReflection = '';
    var questionReadyButUserTyping = false;
    var pendingQuestion = '';

    var typewriterInterval = null;
    var draftTimer = null;

    function byId(id) { return document.getElementById(id); }

    // ============= TEXT EXTRACTION =============

    /** Plain text of the entry: clone the editor and strip transient +
     *  zero-width nodes first (insert markers anchor cards but are not
     *  prose; the pause ring is pure UI). */
    function getJournalText() {
        var editor = byId('editor');
        if (!editor) return '';
        var clone = editor.cloneNode(true);
        clone.querySelectorAll('.reflection-insert-marker, .pause-progress')
            .forEach(function (n) { n.remove(); });
        return clone.innerText || clone.textContent || '';
    }

    /** Editor HTML for persistence: transient UI stripped, insert markers
     *  KEPT (they re-anchor the margin markers on restore). */
    function cleanEditorHtml() {
        var editor = byId('editor');
        if (!editor) return '';
        var clone = editor.cloneNode(true);
        clone.querySelectorAll('.pause-progress').forEach(function (n) { n.remove(); });
        return clone.innerHTML;
    }

    function updateWordCount() {
        var el = byId('wordCount');
        if (el) el.textContent = U.countWords(getJournalText());
    }

    // Auto uses Open's prompts on the backend; the only difference is the
    // client behavior (explanations auto-stream).
    function backendVariant(v) { return v === 'auto' ? 'open' : v; }

    function pajPromptTextForRequest() {
        return (currentVariant === 'paj' && currentPromptKey && PROMPTS[currentPromptKey])
            ? PROMPTS[currentPromptKey].text
            : '';
    }

    // ============= DRAFT AUTOSAVE (debounced) =============

    function writeDraftNow() {
        if (!store) return;
        store.draft.save({
            html: cleanEditorHtml(),
            cards: serializeCardHistory(),
            entryId: currentEntryId,
            variant: currentVariant,
            promptKey: currentVariant === 'paj' ? currentPromptKey : null
        });
    }

    /** Trailing ~300ms debounce: serializing full innerHTML + card state on
     *  every keystroke janks long entries for zero durability gain. */
    function scheduleDraftSave() {
        clearTimeout(draftTimer);
        draftTimer = setTimeout(writeDraftNow, DRAFT_DEBOUNCE_MS);
    }

    function flushDraftNow() {
        clearTimeout(draftTimer);
        writeDraftNow();
    }

    // ============= TRIGGER ENGINE =============

    /** True when there's no real text between the caret and the end of the
     *  editor. Compares the TEXT from caret to end (not DOM offsets):
     *  contenteditable leaves trailing <br>/empty divs in Safari that the
     *  user can't navigate past, which would otherwise make a strict
     *  end-of-tree check return false on every keystroke. */
    function isCursorAtEditorEnd() {
        try {
            var editor = byId('editor');
            if (!editor) return true;
            var sel = window.getSelection();
            if (!sel || sel.rangeCount === 0) return true;
            var range = sel.getRangeAt(0);
            if (!range.collapsed) return false;
            if (!editor.contains(range.endContainer)) return true;
            var tail = document.createRange();
            tail.setStart(range.endContainer, range.endOffset);
            tail.setEnd(editor, editor.childNodes.length);
            return /^\s*$/.test(tail.toString());
        } catch (e) {
            return true;
        }
    }

    function shouldTriggerSuggestion(text) {
        if (text.trim() === lastProcessedText.trim()) return false;
        if (!hasTriggeredOnce) {
            if (text.trim().split(/\s+/).length < MIN_WORDS_FIRST_TRIGGER) return false;
        }
        return true;
    }

    function handleTyping() {
        removePauseProgress();

        // Clear any existing timer. Deliberately NOT nulled: a truthy stale
        // id tells onSuggestionReady the user typed since the request left.
        clearTimeout(typingTimer);

        scheduleDraftSave();

        // PAJ with no prompt chosen: the editor is locked anyway.
        if (currentVariant === 'paj' && !currentPromptKey) return;

        var currentText = getJournalText().trim();
        var endsWithSentence = /[.?!…‽]\s*$/.test(currentText);
        var effectivePauseMs = endsWithSentence ? PAUSE_THRESHOLD_MS : LONG_PAUSE_MS;

        // Don't re-fire while the caret is mid-text — the writer is editing
        // earlier prose, not extending it.
        if (!isCursorAtEditorEnd()) return;

        // After the first trigger, require meaningful new content at the
        // tail before re-firing. Polishing existing text shouldn't count.
        if (hasTriggeredOnce &&
            currentText.length - lastProcessedText.trim().length < MIN_NEW_CHARS_RETRIGGER) {
            return;
        }

        // Only show the progress circle if a suggestion would actually fire.
        var wouldTrigger = currentText !== lastProcessedText.trim() &&
            (hasTriggeredOnce || currentText.split(/\s+/).length >= MIN_WORDS_FIRST_TRIGGER);
        if (!wouldTrigger && !pendingQuestion) return;

        showPauseProgress(effectivePauseMs);

        typingTimer = setTimeout(function () {
            transitionProgressToLoading();
            typingTimer = null; // so onSuggestionReady knows the user isn't typing
            var text = getJournalText();
            // Deliberately NOT re-checking sentence-end here: the long-pause
            // fallback (15s without punctuation) is the whole point —
            // re-checking would re-introduce the bug where unpunctuated
            // writers never get suggestions.

            // A question queued while the user was typing takes precedence.
            if (questionReadyButUserTyping && pendingQuestion) {
                removePauseProgress();
                autoOpenSuggestionCard(pendingQuestion);
                questionReadyButUserTyping = false;
                pendingQuestion = '';
                return;
            }

            if (shouldTriggerSuggestion(text)) {
                generateSuggestion(text);
            } else {
                removePauseProgress();
            }
        }, effectivePauseMs);
    }

    function generateSuggestion(text) {
        lastProcessedText = text;
        hasTriggeredOnce = true;
        lastJournalText = text;

        var previousQuestions = cardHistory
            .map(function (c) { return c.question; })
            .filter(Boolean)
            .map(function (q) { return '- ' + q; })
            .join('\n');

        window.JK.ai.streamSuggestion({
            journal_text: text,
            variant: backendVariant(currentVariant),
            paj_prompt: pajPromptTextForRequest(),
            previous_questions: previousQuestions,
            user_memory: memoryOn ? store.memory.getNotes() : '',
            recent_gist: memoryOn ? store.memory.recentGist() : ''
        }, {
            onComplete: function (full) {
                if (!full || !full.trim()) { removePauseProgress(); return; }
                currentReflection = full.trim();
                onSuggestionReady(currentReflection);
            },
            onError: function (err) {
                // Suggestion failures are silent by design (the writer just
                // keeps writing).
                if (window.console) console.error('Suggestion error:', err);
                removePauseProgress();
            }
        });
    }

    function onSuggestionReady(question) {
        // The user typed since the request left: queue for the next pause.
        if (typingTimer) {
            questionReadyButUserTyping = true;
            pendingQuestion = question;
            return;
        }
        autoOpenSuggestionCard(question);
    }

    // ============= PAUSE PROGRESS RING (v2 margin placement) =============

    function caretAnchorTop() {
        var editor = byId('editor');
        var anchorTop;
        try {
            var sel = window.getSelection();
            if (sel && sel.rangeCount > 0 && editor.contains(sel.getRangeAt(0).startContainer)) {
                var r = sel.getRangeAt(0).getBoundingClientRect();
                if (r.top > 0) anchorTop = r.top + r.height / 2;
            }
        } catch (e) { /* fall through */ }
        if (anchorTop === undefined) {
            var editorRect = editor.getBoundingClientRect();
            anchorTop = editorRect.bottom - 20;
        }
        return anchorTop;
    }

    function showPauseProgress(durationMs) {
        removePauseProgress();

        var journalCard = byId('journalCard');
        if (!journalCard) return;

        var radius = 8;
        var circumference = 2 * Math.PI * radius;

        var wrapper = document.createElement('span');
        wrapper.className = 'pause-progress pause-progress-v2';
        wrapper.contentEditable = 'false';
        wrapper.style.setProperty('--pause-duration', durationMs + 'ms');
        wrapper.style.setProperty('--ring-circumference', circumference);
        wrapper.innerHTML =
            '<svg viewBox="0 0 20 20"><circle class="track" cx="10" cy="10" r="' + radius + '" />'
            + '<circle class="fill" cx="10" cy="10" r="' + radius + '" stroke-dasharray="' + circumference
            + '" stroke-dashoffset="' + circumference + '" /></svg>'
            + '<span class="pause-progress-label">Thinking…</span>';

        // Position at the right margin, at the caret's vertical position —
        // the same spot where the suggestion card will land.
        var cardRect = journalCard.getBoundingClientRect();
        var topPos = caretAnchorTop() - cardRect.top + journalCard.scrollTop;
        wrapper.style.position = 'absolute';
        wrapper.style.top = topPos + 'px';
        wrapper.style.transform = 'translateY(-50%)';
        journalCard.appendChild(wrapper);
    }

    function removePauseProgress() {
        document.querySelectorAll('.pause-progress').forEach(function (el) { el.remove(); });
    }

    function transitionProgressToLoading() {
        var indicator = document.querySelector('.pause-progress');
        if (indicator) indicator.classList.add('loading');
    }

    // ============= CARDS (v2 auto-open margin card) =============

    function findCard(cardId) {
        for (var i = 0; i < cardHistory.length; i++) {
            if (cardHistory[i].id === cardId) return cardHistory[i];
        }
        return null;
    }

    function serializeCardHistory() {
        return cardHistory.map(function (c) {
            return {
                id: c.id,
                question: c.question,
                explanation: c.explanation,
                explanationLoaded: c.explanationLoaded,
                engaged: !!c.engaged,
                dismissed: !!c.dismissed
            };
        });
    }

    /** Auto-open the suggestion card in the side margin (no nudge gate).
     *  The cursor stays in the journal text so the writer can keep typing —
     *  the card just appears off to the side. */
    function autoOpenSuggestionCard(question) {
        removePauseProgress();

        var editor = byId('editor');
        var journalCard = byId('journalCard');
        if (!editor || !journalCard) return;

        var nextCardId = cardCounter + 1;

        // Anchor at the caret line; fall back to the bottom of the text.
        var cardRect = journalCard.getBoundingClientRect();
        var markerTopPos = caretAnchorTop() - cardRect.top + journalCard.scrollTop;

        // Zero-width insert marker at the caret — the durable anchor that
        // lets a saved/restored entry rebuild its margin markers.
        var marker = document.createElement('span');
        marker.className = 'reflection-insert-marker';
        marker.id = 'reflection-insert-marker-' + nextCardId;
        try {
            var sel = window.getSelection();
            if (sel && sel.rangeCount > 0 && editor.contains(sel.getRangeAt(0).startContainer)) {
                sel.getRangeAt(0).insertNode(marker);
            } else {
                editor.appendChild(marker);
            }
        } catch (e) {
            editor.appendChild(marker);
        }

        cardCounter++;
        var cardData = {
            id: cardCounter,
            question: question,
            explanation: '',
            explanationLoaded: false,
            explanationLoading: false,
            engaged: false,
            dismissed: false,
            markerElement: marker,
            journalTextAtCreation: lastJournalText
        };
        cardHistory.push(cardData);

        // Auto mode: the explanation streams alongside, no click required.
        if (currentVariant === 'auto') {
            requestExplanation(cardCounter);
        }

        createMarginMarkerEl(cardCounter, markerTopPos, journalCard);

        // Open the floating card automatically.
        toggleMarkerCard(cardCounter);

        // Critical: return focus to the editor so the writer keeps typing
        // without interruption.
        setTimeout(function () { editor.focus(); }, 60);

        scheduleDraftSave();
    }

    function createMarginMarkerEl(cardId, topPos, journalCard) {
        var markerEl = document.createElement('div');
        markerEl.className = 'margin-marker';
        markerEl.id = 'margin-marker-' + cardId;
        markerEl.dataset.cardId = cardId;
        markerEl.style.top = topPos + 'px';
        markerEl.innerHTML = '&#x203A;'; // ›  ("tap to open")
        markerEl.addEventListener('click', function (e) {
            e.stopPropagation();
            toggleMarkerCard(parseInt(this.dataset.cardId, 10));
        });
        journalCard.appendChild(markerEl);
    }

    // Inline SVGs for the keep (bookmark) / dismiss (trash) header icons.
    var ICON_KEEP_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>';
    var ICON_DISMISS_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m1 0v14a2 2 0 01-2 2H8a2 2 0 01-2-2V6"/></svg>';

    /** CRITICAL (documented reference bug fix): derive the keep icon's
     *  "active" state from the persisted cardData.engaged flag, NOT from a
     *  transient DOM class — the floating card's innerHTML is rebuilt every
     *  time it re-opens, and rendering a fixed un-kept state made kept
     *  suggestions silently show as un-kept. */
    function v2IconActionsHtml(cardId) {
        var cardData = findCard(cardId);
        var kept = !!(cardData && cardData.engaged);
        var keepCls = 'card-action-icon card-action-keep' + (kept ? ' active' : '');
        var keepTip = kept ? 'Keeping this suggestion' : 'Keep this suggestion';
        return '<div class="card-v2-icons">'
            + '<button type="button" class="' + keepCls + '" data-card="' + cardId + '" '
            + 'data-tooltip="' + keepTip + '" aria-label="' + keepTip + '">' + ICON_KEEP_SVG + '</button>'
            + '<button type="button" class="card-action-icon card-action-dismiss" data-card="' + cardId + '" '
            + 'data-tooltip="Dismiss this suggestion" aria-label="Dismiss this suggestion">' + ICON_DISMISS_SVG + '</button>'
            + '</div>';
    }

    function toggleMarkerCard(cardId) {
        if (activeMarkerId === cardId) {
            closeMarkerCard();
            return;
        }
        if (activeMarkerId !== null) {
            closeMarkerCard();
        }

        var cardData = findCard(cardId);
        if (!cardData || cardData.dismissed) return;

        var markerDom = byId('margin-marker-' + cardId);
        if (!markerDom) return;

        markerDom.classList.add('active');
        markerDom.innerHTML = '&#x2039;'; // ‹  ("tap to close")
        activeMarkerId = cardId;

        // Close the left sidebar to make room for the floating card.
        var leftSidebar = byId('entriesSidebar');
        if (leftSidebar) {
            if (window.innerWidth <= 1024) {
                leftSidebar.classList.remove('open');
            } else if (!leftSidebar.classList.contains('collapsed')) {
                leftSidebar.classList.add('collapsed');
                store.setSidebarCollapsed(true);
            }
        }

        var journalCard = byId('journalCard');
        var fc = byId('marginFloatingCard');
        if (!fc) {
            fc = document.createElement('div');
            fc.className = 'floating-reflection-card';
            fc.id = 'marginFloatingCard';
            journalCard.appendChild(fc);
        }

        // Position at the marker's Y, to the right of the journal card. The
        // card's top padding is ~16px; the small-caps "Suggestion" label
        // shifts the first salient line down ~13px more — compensate so the
        // chevron stays in line with the suggestion text.
        var topOffset = 34;
        fc.style.top = (parseInt(markerDom.style.top, 10) - topOffset) + 'px';
        fc.style.left = '100%';
        fc.style.marginLeft = '16px';
        fc.style.position = 'absolute';

        var isAuto = currentVariant === 'auto';
        var whyOpen = cardData.explanationLoaded || isAuto || cardData.explanationLoading;
        var whyBtnHtml = !isAuto
            ? '<button type="button" class="floating-card-why" id="floatingWhy-' + cardId + '">'
              + (whyOpen ? 'Hide explanation' : 'Why this suggestion?') + '</button>'
            : '';

        // Initial explanation pane: streamed text when already loaded, the
        // loading dots when the pane opens immediately (Auto / in flight).
        var explanationInnerHtml = '';
        if (cardData.explanation) {
            explanationInnerHtml = U.parseMarkdownBold(cardData.explanation);
        } else if (isAuto || cardData.explanationLoading) {
            explanationInnerHtml = '<span class="loading-dots">Thinking</span>';
        }

        fc.dataset.cardId = cardId;
        fc.innerHTML = v2IconActionsHtml(cardId)
            + '<div class="card-section-label">Suggestion</div>'
            + '<div class="floating-card-question" id="floatingQuestion-' + cardId + '">'
            + U.parseMarkdownBold(cardData.question) + '</div>'
            + '<div class="floating-card-actions">' + whyBtnHtml + '</div>'
            + '<div class="card-section-label">Why this suggestion</div>'
            + '<div class="floating-card-explanation' + (whyOpen ? ' expanded' : '') + '" '
            + 'id="floatingExpl-' + cardId + '">' + explanationInnerHtml + '</div>';

        // Wire the freshly-rendered controls (no inline onclick globals).
        var keepBtn = fc.querySelector('.card-action-keep');
        if (keepBtn) {
            keepBtn.addEventListener('click', function () { keepSuggestion(cardId); });
        }
        var dismissBtn = fc.querySelector('.card-action-dismiss');
        if (dismissBtn) {
            dismissBtn.addEventListener('click', function () { dismissSuggestion(cardId); });
        }
        var whyBtn = byId('floatingWhy-' + cardId);
        if (whyBtn) {
            whyBtn.addEventListener('click', function () { requestExplanation(cardId); });
        }

        // Shift the journal card left to make room.
        journalCard.classList.add('reflection-open');

        requestAnimationFrame(function () { fc.classList.add('visible'); });
    }

    function closeMarkerCard() {
        var fc = byId('marginFloatingCard');
        if (fc) fc.classList.remove('visible');
        if (activeMarkerId !== null) {
            var m = byId('margin-marker-' + activeMarkerId);
            if (m) {
                m.classList.remove('active');
                m.innerHTML = '&#x203A;'; // › back to "tap to open"
            }
        }
        activeMarkerId = null;
        var journalCard = byId('journalCard');
        if (journalCard) journalCard.classList.remove('reflection-open');
    }

    function keepSuggestion(cardId) {
        var cardData = findCard(cardId);
        if (!cardData || cardData.engaged) return;
        cardData.engaged = true;

        document.querySelectorAll('.card-action-keep[data-card="' + cardId + '"]')
            .forEach(function (btn) {
                btn.classList.add('active');
                btn.setAttribute('data-tooltip', 'Keeping this suggestion');
                btn.setAttribute('aria-label', 'Keeping this suggestion');
            });

        // One-shot green flash so the writer knows the keep registered.
        var editor = byId('editor');
        if (editor) {
            editor.style.transition = 'box-shadow 0.3s ease';
            editor.style.boxShadow = '0 0 0 2px rgba(94, 156, 74, 0.25)';
            setTimeout(function () { editor.style.boxShadow = ''; }, 600);
            setTimeout(function () { editor.focus(); }, 80);
        }
        scheduleDraftSave();
    }

    function dismissSuggestion(cardId) {
        var cardData = findCard(cardId);
        if (!cardData || cardData.dismissed) return;
        cardData.dismissed = true;

        // Animate the floating card out, then remove it from the DOM.
        var fc = byId('marginFloatingCard');
        if (fc) {
            fc.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            fc.style.opacity = '0';
            fc.style.transform = 'translateX(24px)';
            setTimeout(function () {
                if (fc.parentNode) fc.parentNode.removeChild(fc);
                var jc = byId('journalCard');
                if (jc) jc.classList.remove('reflection-open');
            }, 210);
        }

        // Remove the margin marker dot permanently.
        var markerDot = byId('margin-marker-' + cardId);
        if (markerDot) {
            markerDot.style.transition = 'opacity 0.2s ease';
            markerDot.style.opacity = '0';
            setTimeout(function () {
                if (markerDot.parentNode) markerDot.parentNode.removeChild(markerDot);
            }, 210);
        }

        // And the zero-width insert marker from the journal text.
        var insertMark = byId('reflection-insert-marker-' + cardId);
        if (insertMark && insertMark.parentNode) insertMark.parentNode.removeChild(insertMark);
        cardData.markerElement = null;

        activeMarkerId = null;

        var editor = byId('editor');
        if (editor) setTimeout(function () { editor.focus(); }, 80);

        scheduleDraftSave();
    }

    // ============= EXPLANATIONS =============

    /** On-demand ("Why this suggestion?") + cached toggle; called directly
     *  in Auto mode so the explanation streams alongside the suggestion. */
    function requestExplanation(cardId) {
        var cardData = findCard(cardId);
        if (!cardData) return;
        if (cardData.explanationLoading) return; // one request at a time

        var el = byId('floatingExpl-' + cardId);
        var whyBtn = byId('floatingWhy-' + cardId);

        // Already loaded: just toggle visibility.
        if (cardData.explanationLoaded && cardData.explanation) {
            if (!el) return;
            if (el.classList.contains('expanded')) {
                el.classList.remove('expanded');
                if (whyBtn) whyBtn.textContent = 'Why this suggestion?';
            } else {
                el.innerHTML = U.parseMarkdownBold(cardData.explanation);
                el.classList.add('expanded');
                if (whyBtn) whyBtn.textContent = 'Hide explanation';
            }
            return;
        }

        cardData.explanationLoading = true;
        if (el) {
            el.innerHTML = '<span class="loading-dots">Thinking</span>';
            el.classList.add('expanded');
        }
        if (whyBtn) whyBtn.textContent = 'Hide explanation';

        var previousExplanations = cardHistory
            .map(function (c) { return c.explanation; })
            .filter(Boolean)
            .map(function (e) { return '- ' + e; })
            .join('\n');

        window.JK.ai.streamExplanation({
            journal_text: cardData.journalTextAtCreation || lastJournalText,
            reflection_question: cardData.question,
            variant: backendVariant(currentVariant),
            paj_prompt: pajPromptTextForRequest(),
            previous_explanations: previousExplanations,
            user_memory: memoryOn ? store.memory.getNotes() : '',
            recent_gist: memoryOn ? store.memory.recentGist() : ''
        }, {
            onDelta: function (full) {
                var live = byId('floatingExpl-' + cardId);
                if (live) live.innerHTML = U.parseMarkdownBold(full);
            },
            onComplete: function (full) {
                cardData.explanation = full;
                cardData.explanationLoaded = true;
                cardData.explanationLoading = false;
                var live = byId('floatingExpl-' + cardId);
                if (live) {
                    live.innerHTML = U.parseMarkdownBold(full);
                    live.classList.add('expanded');
                }
                scheduleDraftSave();
            },
            onError: function (err) {
                cardData.explanationLoading = false;
                var live = byId('floatingExpl-' + cardId);
                if (live) live.innerHTML = 'Unable to load explanation.';
                if (window.console) console.error('Explanation error:', err);
            }
        });
    }

    // ============= CARD RESTORE (draft / saved entry) =============

    function clearCardState() {
        cardHistory = [];
        cardCounter = 0;
        document.querySelectorAll('.margin-marker').forEach(function (m) { m.remove(); });
        closeMarkerCard();
    }

    function restoreReflectionCards(cards) {
        if (!cards || cards.length === 0) return;

        var journalCard = byId('journalCard');
        var editor = byId('editor');
        if (!journalCard || !editor) return;

        clearCardState();

        cardCounter = cards.reduce(function (max, c) {
            return Math.max(max, typeof c.id === 'number' ? c.id : 0);
        }, 0);

        cards.forEach(function (card) {
            var markerSpan = editor.querySelector('#reflection-insert-marker-' + card.id);
            var cardData = {
                id: card.id,
                question: card.question || '',
                explanation: card.explanation || '',
                explanationLoaded: !!card.explanationLoaded,
                explanationLoading: false,
                engaged: !!card.engaged,
                dismissed: !!card.dismissed,
                markerElement: markerSpan,
                journalTextAtCreation: ''
            };
            cardHistory.push(cardData);

            // Dismissed cards stay in history (their questions still feed
            // the previous_questions dedup) but get no marker back.
            if (cardData.dismissed || !markerSpan) return;
            createMarginMarkerForRestoredCard(card.id, markerSpan, journalCard);
        });
    }

    /** Position a restored chevron by its anchor element; deferred a frame
     *  so layout is computed. */
    function createMarginMarkerForRestoredCard(cardId, anchorElement, journalCard) {
        requestAnimationFrame(function () {
            var cardRect = journalCard.getBoundingClientRect();
            var anchorTop;
            // Prefer the text content just BEFORE the anchor (the marker
            // itself is zero-width and may sit on a wrapped line).
            var prevNode = anchorElement.previousSibling;
            if (prevNode && prevNode.nodeType === Node.TEXT_NODE &&
                prevNode.textContent.trim().length > 0) {
                var tempRange = document.createRange();
                tempRange.setStart(prevNode, Math.max(0, prevNode.textContent.length - 1));
                tempRange.setEnd(prevNode, prevNode.textContent.length);
                var rects = tempRange.getClientRects();
                if (rects.length > 0) {
                    var lastRect = rects[rects.length - 1];
                    anchorTop = lastRect.top + (lastRect.height / 2);
                } else {
                    anchorTop = anchorElement.getBoundingClientRect().top;
                }
            } else {
                var anchorRect = anchorElement.getBoundingClientRect();
                if (anchorRect.height === 0 && anchorRect.width === 0 && anchorRect.top === 0) {
                    return; // anchor has no layout position — skip the marker
                }
                anchorTop = anchorRect.top + (anchorRect.height / 2);
            }
            var markerTopPos = anchorTop - cardRect.top + journalCard.scrollTop;
            createMarginMarkerEl(cardId, markerTopPos, journalCard);
        });
    }

    // ============= MODES (PAJ / Open / Auto) =============

    function applyVariantUI(variant) {
        var pajArea = byId('pajPromptArea');
        var openArea = byId('openPromptArea');
        var editor = byId('editor');

        document.querySelectorAll('#modePills .variant-btn').forEach(function (btn) {
            btn.classList.toggle('active', btn.dataset.variant === variant);
        });

        if (variant === 'open' || variant === 'auto') {
            if (pajArea) pajArea.hidden = true;
            if (openArea) openArea.hidden = false;
            if (editor) {
                editor.contentEditable = 'true';
                editor.setAttribute('data-placeholder', 'Start writing...');
            }
        } else {
            if (pajArea) pajArea.hidden = false;
            if (openArea) openArea.hidden = true;
            if (editor && !currentPromptKey) {
                editor.contentEditable = 'false';
                editor.setAttribute('data-placeholder', 'To start writing, select a prompt above');
            }
        }
    }

    function stopTypewriter() {
        if (typewriterInterval) {
            clearInterval(typewriterInterval);
            typewriterInterval = null;
        }
    }

    function resetPajPromptUI() {
        currentPromptKey = null;
        var select = byId('pajPromptSelect');
        if (select) select.selectedIndex = 0;
        var textEl = byId('pajPromptText');
        if (textEl) textEl.textContent = '';
        stopTypewriter();
    }

    /** Full state wipe shared by mode switch / new entry / wipe. */
    function resetSessionState() {
        store.draft.clear();
        clearCardState();
        hasTriggeredOnce = false;
        lastProcessedText = '';
        lastJournalText = '';
        currentReflection = '';
        questionReadyButUserTyping = false;
        pendingQuestion = '';
        clearTimeout(typingTimer);
        typingTimer = null;
        removePauseProgress();
        stopTypewriter();
    }

    function setJournalVariant(variant) {
        if (variant !== 'paj' && variant !== 'open' && variant !== 'auto') return;
        if (variant === currentVariant) return; // no-op on the active pill

        currentVariant = variant;
        store.setVariant(variant);

        // Full state wipe so modes don't bleed into each other.
        resetSessionState();
        currentEntryId = null;
        var editor = byId('editor');
        if (editor) editor.innerHTML = '';
        resetPajPromptUI();

        applyVariantUI(variant);
        updateWordCount();
        renderEntriesList();

        if (variant === 'open' || variant === 'auto') {
            if (editor) editor.focus();
        }
    }

    function selectPrompt(promptKey, animate) {
        var prompt = PROMPTS[promptKey];
        if (!prompt) return;

        currentPromptKey = promptKey;

        var selectEl = byId('pajPromptSelect');
        if (selectEl) selectEl.value = promptKey;

        var textEl = byId('pajPromptText');
        stopTypewriter();
        if (textEl) {
            if (animate) {
                textEl.textContent = '';
                var i = 0;
                var fullText = prompt.text;
                typewriterInterval = setInterval(function () {
                    textEl.textContent += fullText[i];
                    i++;
                    if (i >= fullText.length) stopTypewriter();
                }, 18);
            } else {
                textEl.textContent = prompt.text;
            }
        }

        var editor = byId('editor');
        if (editor) {
            editor.contentEditable = 'true';
            editor.setAttribute('data-placeholder', 'Start writing...');
            editor.innerHTML = '';
            editor.focus();
        }

        // Fresh prompt = fresh entry: clear the draft + trigger state.
        store.draft.clear();
        clearCardState();
        hasTriggeredOnce = false;
        lastProcessedText = '';
        updateWordCount();
    }

    // ============= SAVE / WIPE / NEW =============

    function saveCurrentEntry() {
        var text = getJournalText().trim();
        if (!text) return;

        var savedId = store.saveEntry(currentEntryId, {
            text: text,
            html: cleanEditorHtml(),
            cards: serializeCardHistory(),
            variant: currentVariant,
            prompt_key: currentVariant === 'paj' ? currentPromptKey : null
        });

        if (!savedId) {
            alert('Sorry, could not save your entry. Please try again.');
            return;
        }

        currentEntryId = savedId;
        store.draft.clear();
        clearTimeout(draftTimer);
        showSaveFeedback();
        renderEntriesList();

        // Feedback probe: after a successful save, ask whether there is one
        // question worth this moment. JK.probe shows its card after the save
        // feedback, off to the side; no journal content is ever sent, and
        // failures are silent.
        if (window.JK.probe) window.JK.probe.afterSave();

        // Post-save kernel-memory update — fire-and-forget, silent on
        // failure. Deliberate deviation from the Flask reference: when the
        // memory toggle is OFF we skip the call ENTIRELY (the pill promises
        // "write this entry in isolation"; sending the text to the model and
        // mutating "What the kernel remembers" would betray that). Such
        // entries keep summary = '' and are skipped by recentGist().
        if (memoryOn) {
            try {
                window.JK.ai.updateMemory({
                    entry_text: text,
                    current_memory: store.memory.getNotes()
                }).then(function (r) {
                    store.setSummary(savedId, r.summary);
                    store.memory.setNotes(r.memory);
                }).catch(function () { /* silent */ });
            } catch (e) { /* silent */ }
        }
    }

    function showSaveFeedback() {
        var fb = byId('saveFeedback');
        if (!fb) return;
        fb.classList.add('show');
        setTimeout(function () { fb.classList.remove('show'); }, 1800);
    }

    function confirmWipeEntry() {
        var editor = byId('editor');
        var text = (editor && editor.textContent || '').trim();
        if (!text) return;
        if (!confirm('Clear this journal entry? This will erase your current draft.')) return;

        editor.innerHTML = '';
        store.draft.clear();
        clearCardState();
        removePauseProgress();
        updateWordCount();
        editor.focus();
    }

    function createNewEntry() {
        var editor = byId('editor');
        if (editor) editor.innerHTML = '';
        currentEntryId = null;
        resetSessionState();
        resetPajPromptUI();
        applyVariantUI(currentVariant);
        updateWordCount();
        renderEntriesList();
        if ((currentVariant === 'open' || currentVariant === 'auto') && editor) {
            editor.focus();
        }
    }

    // ============= LOAD ENTRY / ENTRIES SIDEBAR =============

    function loadEntry(entryId) {
        var entry = store.getEntry(entryId);
        if (!entry) return;

        var meta = entry.metadata || {};

        resetSessionState();
        resetPajPromptUI();

        // Switch the journaling mode to match the entry, if recorded.
        if (meta.variant && meta.variant !== currentVariant &&
            (meta.variant === 'paj' || meta.variant === 'open' || meta.variant === 'auto')) {
            currentVariant = meta.variant;
            store.setVariant(currentVariant);
        }
        applyVariantUI(currentVariant);
        if (currentVariant === 'paj' && meta.prompt_key) {
            selectPrompt(meta.prompt_key, false); // no animation on restore
        }

        // Prefer the saved HTML (sanitized by the store on the way out);
        // fall back to plain text via textContent (never innerHTML).
        var editor = byId('editor');
        if (editor) {
            editor.contentEditable = 'true';
            if (meta.html && meta.html.trim()) {
                editor.innerHTML = meta.html;
            } else {
                editor.textContent = entry.text || '';
            }
        }

        currentEntryId = entry.id;
        updateWordCount();
        renderEntriesList();

        if (meta.cards && meta.cards.length > 0) {
            restoreReflectionCards(meta.cards);
        }

        // Persist as the live draft so a refresh reopens this same entry.
        flushDraftNow();
    }

    function renderEntriesList() {
        var entriesList = byId('entriesList');
        if (!entriesList) return;

        var entries = store.listEntries();
        entriesList.textContent = '';

        if (entries.length === 0) {
            var empty = document.createElement('div');
            empty.style.cssText = 'padding: 20px; text-align: center; color: #9CA3AF; font-size: 13px;';
            empty.textContent = 'No entries yet';
            entriesList.appendChild(empty);
            return;
        }

        var thisYear = new Date().getFullYear();
        entries.forEach(function (entry) {
            var date = new Date(entry.timestamp);
            var dateOpts = { month: 'short', day: 'numeric' };
            if (date.getFullYear() !== thisYear) dateOpts.year = 'numeric';
            var formattedDate = date.toLocaleDateString('en-US', dateOpts);
            var formattedTime = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

            var item = document.createElement('div');
            item.className = 'entry-item' + (currentEntryId === entry.id ? ' active' : '');

            var main = document.createElement('div');
            main.addEventListener('click', function () { loadEntry(entry.id); });

            var dateEl = document.createElement('div');
            dateEl.className = 'entry-date';
            dateEl.textContent = formattedDate + ' at ' + formattedTime;

            var previewEl = document.createElement('div');
            previewEl.className = 'entry-preview';
            var t = entry.text || '';
            previewEl.textContent = t.substring(0, 100) + (t.length > 100 ? '...' : '');

            var wcEl = document.createElement('div');
            wcEl.className = 'entry-word-count';
            wcEl.textContent = entry.word_count + ' words';

            main.appendChild(dateEl);
            main.appendChild(previewEl);
            main.appendChild(wcEl);

            var actions = document.createElement('div');
            actions.className = 'entry-actions';
            var delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'delete-entry-btn';
            delBtn.textContent = 'Delete';
            delBtn.addEventListener('click', function (e) {
                e.stopPropagation();
                deleteEntryFromSidebar(entry.id);
            });
            actions.appendChild(delBtn);

            item.appendChild(main);
            item.appendChild(actions);
            entriesList.appendChild(item);
        });
    }

    function deleteEntryFromSidebar(entryId) {
        if (!confirm('Are you sure you want to delete this entry?')) return;
        store.deleteEntry(entryId);
        if (currentEntryId === entryId) {
            createNewEntry();
        } else {
            renderEntriesList();
        }
    }

    function toggleLeftSidebar() {
        var sidebar = byId('entriesSidebar');
        if (!sidebar) return;
        if (window.innerWidth <= 1024) {
            var isOpening = !sidebar.classList.contains('open');
            sidebar.classList.toggle('open');
            if (isOpening && activeMarkerId !== null) closeMarkerCard();
        } else {
            var opening = sidebar.classList.contains('collapsed');
            sidebar.classList.toggle('collapsed');
            if (opening && activeMarkerId !== null) closeMarkerCard();
            store.setSidebarCollapsed(sidebar.classList.contains('collapsed'));
        }
    }

    function restoreSidebarState() {
        var sidebar = byId('entriesSidebar');
        if (!sidebar) return;
        // Collapsed by default; only expand on desktop when the saved
        // preference says so (<=1024 uses the overlay 'open' class instead).
        if (!store.getSidebarCollapsed() && window.innerWidth > 1024) {
            sidebar.classList.remove('collapsed');
        }
    }

    // ============= MEMORY PILL =============

    function updateMemoryToggleUI() {
        var btn = byId('memoryToggle');
        var label = byId('memoryToggleLabel');
        if (!btn) return;
        btn.classList.toggle('on', memoryOn);
        btn.classList.toggle('off', !memoryOn);
        if (label) label.textContent = memoryOn ? 'Memory on' : 'Memory off';
        btn.title = memoryOn
            ? 'Across-entries memory is ON. Click to write this entry in isolation.'
            : 'Across-entries memory is OFF (instanced). Click to let the kernel use what it remembers.';
    }

    function toggleMemory() {
        memoryOn = !memoryOn;
        // The nav pill writes the per-device override only — the account
        // default lives on home.html (which also resets this override).
        store.memory.setToggle(memoryOn);
        updateMemoryToggleUI();
    }

    // ============= DRAFT RESTORE =============

    function restoreDraft() {
        var d = store.draft.load();
        if (!d) return;

        // The draft is cleared on every mode switch, so its variant should
        // match — but trust the draft if they ever disagree.
        if (d.variant && d.variant !== currentVariant &&
            (d.variant === 'paj' || d.variant === 'open' || d.variant === 'auto')) {
            currentVariant = d.variant;
            store.setVariant(currentVariant);
            applyVariantUI(currentVariant);
        }

        if (currentVariant === 'paj') {
            if (d.promptKey && PROMPTS[d.promptKey]) {
                selectPrompt(d.promptKey, false); // clears editor + draft
            } else {
                return; // PAJ with no prompt chosen: nothing to restore
            }
        }

        if (d.html && d.html.trim()) {
            var editor = byId('editor');
            if (editor) editor.innerHTML = d.html;
            currentEntryId = d.entryId || null;
            if (d.cards && d.cards.length > 0) {
                restoreReflectionCards(d.cards);
            }
        }

        // selectPrompt cleared the stored draft — re-persist what we restored.
        flushDraftNow();
        updateWordCount();
    }

    // ============= BOOT =============

    function wireEvents() {
        var editor = byId('editor');
        if (editor) {
            editor.addEventListener('input', function () {
                updateWordCount();
                handleTyping();
            });
            editor.addEventListener('blur', flushDraftNow);
        }

        var saveBtn = byId('saveBtn');
        if (saveBtn) saveBtn.addEventListener('click', saveCurrentEntry);

        var wipeBtn = byId('wipeBtn');
        if (wipeBtn) wipeBtn.addEventListener('click', confirmWipeEntry);

        document.addEventListener('keydown', function (e) {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                saveCurrentEntry();
            }
        });

        // Close the floating card when clicking outside of it.
        document.addEventListener('click', function (e) {
            if (activeMarkerId === null) return;
            if (!e.target.closest('.margin-marker') &&
                !e.target.closest('.floating-reflection-card') &&
                !e.target.closest('.journal-card')) {
                closeMarkerCard();
            }
        });

        var modePills = byId('modePills');
        if (modePills) {
            modePills.querySelectorAll('.variant-btn').forEach(function (btn) {
                btn.addEventListener('click', function () {
                    setJournalVariant(btn.dataset.variant);
                });
            });
        }

        var promptSelect = byId('pajPromptSelect');
        if (promptSelect) {
            promptSelect.addEventListener('change', function () {
                if (promptSelect.value) selectPrompt(promptSelect.value, true);
            });
        }

        var memoryToggle = byId('memoryToggle');
        if (memoryToggle) memoryToggle.addEventListener('click', toggleMemory);

        var sidebarToggle = byId('sidebarToggle');
        if (sidebarToggle) sidebarToggle.addEventListener('click', toggleLeftSidebar);
        var collapseBtn = byId('sidebarCollapseBtn');
        if (collapseBtn) collapseBtn.addEventListener('click', toggleLeftSidebar);

        var newEntryBtn = byId('newEntryBtn');
        if (newEntryBtn) newEntryBtn.addEventListener('click', createNewEntry);

        // Draft durability: flush on hide/unload (debounce is trailing).
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) flushDraftNow();
        });
        window.addEventListener('beforeunload', flushDraftNow);
    }

    function boot(session) {
        store = window.JK.store;
        store.init(session.user.id);

        // Memory pill: initialize the label/dot on page load (fixes the
        // reference quirk where the label stayed stale until first click).
        memoryOn = store.memory.getToggle();
        updateMemoryToggleUI();

        var dateEl = byId('currentDate');
        if (dateEl) dateEl.textContent = U.formatLongDate(new Date());

        currentVariant = store.getVariant();
        applyVariantUI(currentVariant);

        restoreSidebarState();
        renderEntriesList();
        wireEvents();

        // Feedback probe: announce the app booted (powers Requisite's
        // "installed" health check). Once per page load; failures silent.
        if (window.JK.probe) window.JK.probe.hello();

        var params = new URLSearchParams(window.location.search);
        var isNewEntry = params.get('new') === 'true';
        var deepLinkEntry = params.get('entry');

        if (isNewEntry) {
            store.draft.clear();
            window.history.replaceState({}, document.title, window.location.pathname);
            createNewEntry();
        } else if (deepLinkEntry) {
            window.history.replaceState({}, document.title, window.location.pathname);
            loadEntry(deepLinkEntry);
        } else {
            restoreDraft();
        }

        updateWordCount();
    }

    function start() {
        window.JK.auth.requireSession().then(boot);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
