// journal kernel — shared utilities (no dependencies).
// Loaded as a classic script; everything hangs off window.JK.util.
(function () {
    'use strict';
    window.JK = window.JK || {};

    /** HTML-escape arbitrary text (model output, user text) before it goes
     *  anywhere near innerHTML. */
    function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text == null ? '' : String(text);
        return div.innerHTML;
    }

    /** Render model/user text safely: escape everything, then allow ONLY the
     *  **bold** / *italic* markdown subset. Bold renders gold (see CSS
     *  `strong { color: var(--jk-gold) }` on card containers). */
    function parseMarkdownBold(text) {
        var escaped = escapeHtml(text);
        return escaped
            .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
            .replace(/\*([^*]+)\*/g, '<em>$1</em>');
    }

    /** Long-form date for the editor header, e.g. "Tuesday, September 16, 2026". */
    function formatLongDate(date) {
        var d = date instanceof Date ? date : new Date(date || Date.now());
        return d.toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    /** Short date+time for entry lists, e.g. "Tue, Sep 16, 2026, 02:14 PM". */
    function formatEntryDate(iso) {
        var d = new Date(iso);
        if (isNaN(d.getTime())) return '';
        return d.toLocaleDateString('en-US', {
            weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    }

    /** Word count over plain text. */
    function countWords(text) {
        if (!text) return 0;
        var words = String(text).trim().split(/\s+/).filter(function (w) { return w.length > 0; });
        return words.length;
    }

    /** Unique-enough id: "<prefix>_<epoch-ms>_<rand4>". */
    function uid(prefix) {
        var rand4 = Math.random().toString(36).slice(2, 6);
        return (prefix || 'id') + '_' + Date.now() + '_' + rand4;
    }

    /**
     * Sanitize stored/restored editor HTML before it is assigned to
     * innerHTML. localStorage is same-origin-writable (extensions, devtools),
     * so the read path must be as defensive as the write path:
     *  - drop script/style/iframe/object/embed/link/meta/form nodes
     *  - drop transient UI nodes (pause-progress ring) if any leaked into a save
     *  - strip every on* attribute and any javascript: URL attribute
     * Insert markers (.reflection-insert-marker) are kept — they anchor cards.
     */
    function sanitizeHtml(html) {
        if (!html) return '';
        var tpl = document.createElement('template');
        tpl.innerHTML = String(html);

        var BAD_TAGS = 'script,style,iframe,object,embed,link,meta,base,form,input,button,textarea,select';
        tpl.content.querySelectorAll(BAD_TAGS).forEach(function (el) { el.remove(); });
        tpl.content.querySelectorAll('.pause-progress').forEach(function (el) { el.remove(); });

        var walker = document.createTreeWalker(tpl.content, NodeFilter.SHOW_ELEMENT);
        var el;
        while ((el = walker.nextNode())) {
            // Copy the attribute list first; removing while iterating skips items.
            var attrs = Array.prototype.slice.call(el.attributes);
            for (var i = 0; i < attrs.length; i++) {
                var name = attrs[i].name.toLowerCase();
                var value = String(attrs[i].value || '');
                if (name.indexOf('on') === 0) {
                    el.removeAttribute(attrs[i].name);
                } else if ((name === 'href' || name === 'src' || name === 'xlink:href' || name === 'action' || name === 'formaction') &&
                           /^\s*javascript:/i.test(value)) {
                    el.removeAttribute(attrs[i].name);
                }
            }
        }

        var div = document.createElement('div');
        div.appendChild(tpl.content.cloneNode(true));
        return div.innerHTML;
    }

    window.JK.util = {
        escapeHtml: escapeHtml,
        parseMarkdownBold: parseMarkdownBold,
        formatLongDate: formatLongDate,
        formatEntryDate: formatEntryDate,
        countWords: countWords,
        uid: uid,
        sanitizeHtml: sanitizeHtml
    };
})();
