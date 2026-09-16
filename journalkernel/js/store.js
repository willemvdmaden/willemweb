// journal kernel — localStorage store.
//
// ALL journal content (entries, reflections/cards, drafts, kernel memory)
// lives ONLY in this browser's localStorage. The server side never stores
// journal content.
//
// Keys are namespaced per Supabase user id: "jk:<user.id>:<suffix>", so the
// 4 testers stay separate on a shared machine. supabase-js keeps its own
// session key (sb-<ref>-auth-token) — untouched here.
//
// Schema (suffixes under the prefix):
//   schema               "1" (migration hook)
//   entries:index        JSON array of entry ids, newest first
//   entry:<id>           JSON entry object (see saveEntry)
//   memory:notes         string <= 1500 ("What the kernel remembers")
//   memory:enabled       "true"/"false" — account-level default (default true)
//   memory:on            per-device toggle override (nav pill)
//   draft:html, draft:cards, draft:entryId, draft:variant, draft:promptKey
//   variant              "paj" | "open" | "auto" (default "paj")
//   ui:sidebarCollapsed  "true"/"false" (default "true")
//
// Hardening: every localStorage read/write is wrapped; quota/parse failure on
// an entry save surfaces the standard alert (caller decides), everything else
// fails silently. HTML stored by us is sanitized again on the way OUT
// (restore path) — localStorage is same-origin-writable, the save-side strip
// alone does not protect reads.
(function () {
    'use strict';
    window.JK = window.JK || {};

    var SCHEMA_VERSION = '1';
    var MEMORY_NOTES_MAX = 1500;
    var SUMMARY_MAX = 500;
    var RECENT_GIST_COUNT = 5;

    var prefix = null; // "jk:<userId>:" — set by init()

    // ---------- low-level guarded access ----------

    function key(suffix) {
        if (!prefix) throw new Error('JK.store.init(userId) must be called first');
        return prefix + suffix;
    }

    function rawGet(suffix) {
        try { return localStorage.getItem(key(suffix)); } catch (e) { return null; }
    }

    /** Returns true on success, false on quota/availability failure. */
    function rawSet(suffix, value) {
        try { localStorage.setItem(key(suffix), value); return true; } catch (e) { return false; }
    }

    function rawRemove(suffix) {
        try { localStorage.removeItem(key(suffix)); } catch (e) { /* silent */ }
    }

    function jsonGet(suffix, fallback) {
        var raw = rawGet(suffix);
        if (raw == null) return fallback;
        try { return JSON.parse(raw); } catch (e) { return fallback; }
    }

    function jsonSet(suffix, value) {
        try { return rawSet(suffix, JSON.stringify(value)); } catch (e) { return false; }
    }

    function sanitize(html) {
        return (window.JK.util && window.JK.util.sanitizeHtml)
            ? window.JK.util.sanitizeHtml(html)
            : '';
    }

    // ---------- init ----------

    /** Must be called (with the Supabase user id) before any other method. */
    function init(userId) {
        if (!userId) throw new Error('JK.store.init: userId required');
        prefix = 'jk:' + userId + ':';
        if (rawGet('schema') !== SCHEMA_VERSION) {
            rawSet('schema', SCHEMA_VERSION);
        }
    }

    function isInitialized() { return prefix !== null; }

    // ---------- entries ----------

    function getIndex() {
        var idx = jsonGet('entries:index', []);
        return Array.isArray(idx) ? idx : [];
    }

    /** All entries, newest first. Skips ids whose record is missing/corrupt. */
    function listEntries() {
        var out = [];
        getIndex().forEach(function (id) {
            var e = getEntry(id);
            if (e) out.push(e);
        });
        return out;
    }

    /** One entry by id, with metadata.html sanitized for the restore path. */
    function getEntry(id) {
        var e = jsonGet('entry:' + id, null);
        if (!e || typeof e !== 'object' || !e.id) return null;
        e.metadata = e.metadata || {};
        e.metadata.html = sanitize(e.metadata.html || '');
        if (!Array.isArray(e.metadata.cards)) e.metadata.cards = [];
        return e;
    }

    var VERSION_IDS = { paj: 'paj_v1', open: 'open_v1', auto: 'auto_v1' };

    /**
     * Create or update an entry.
     *   entryOrNull: existing entry object or id string -> update in place;
     *                null -> create a new entry.
     *   payload: { text, html, cards, variant, prompt_key, summary? }
     * Returns the entry id on success, or null when localStorage rejected the
     * write (caller shows the save-failure alert and keeps in-memory state).
     */
    function saveEntry(entryOrNull, payload) {
        payload = payload || {};
        var now = new Date().toISOString();
        var existingId = entryOrNull
            ? (typeof entryOrNull === 'string' ? entryOrNull : entryOrNull.id)
            : null;
        var existing = existingId ? getEntry(existingId) : null;

        var variant = payload.variant || (existing && existing.metadata.variant) || 'paj';
        var text = payload.text != null ? String(payload.text) : (existing ? existing.text : '');

        var entry = {
            id: existing ? existing.id : (window.JK.util ? window.JK.util.uid('e') : 'e_' + Date.now()),
            timestamp: existing ? existing.timestamp : now,
            updated_at: now,
            text: text,
            word_count: window.JK.util ? window.JK.util.countWords(text) : 0,
            version_id: VERSION_IDS[variant] || 'open_v1',
            summary: payload.summary != null
                ? String(payload.summary).slice(0, SUMMARY_MAX)
                : (existing ? (existing.summary || '') : ''),
            metadata: {
                html: sanitize(payload.html != null ? payload.html : (existing ? existing.metadata.html : '')),
                cards: Array.isArray(payload.cards)
                    ? payload.cards
                    : (existing ? existing.metadata.cards : []),
                prompt_key: payload.prompt_key != null
                    ? payload.prompt_key
                    : (existing ? (existing.metadata.prompt_key || null) : null),
                variant: variant
            }
        };

        if (!jsonSet('entry:' + entry.id, entry)) return null;

        var idx = getIndex();
        if (idx.indexOf(entry.id) === -1) {
            idx.unshift(entry.id); // newest first
            if (!jsonSet('entries:index', idx)) {
                rawRemove('entry:' + entry.id);
                return null;
            }
        }
        return entry.id;
    }

    /** Overwrite the summary of a saved entry (post-save memory update). */
    function setSummary(id, summary) {
        var e = jsonGet('entry:' + id, null);
        if (!e || typeof e !== 'object') return false;
        e.summary = String(summary == null ? '' : summary).slice(0, SUMMARY_MAX);
        return jsonSet('entry:' + id, e);
    }

    function deleteEntry(id) {
        rawRemove('entry:' + id);
        var idx = getIndex().filter(function (x) { return x !== id; });
        jsonSet('entries:index', idx);
    }

    // ---------- draft ----------

    var draft = {
        /** payload: { html, cards, entryId, variant, promptKey } */
        save: function (payload) {
            payload = payload || {};
            rawSet('draft:html', payload.html != null ? String(payload.html) : '');
            jsonSet('draft:cards', Array.isArray(payload.cards) ? payload.cards : []);
            if (payload.entryId) rawSet('draft:entryId', String(payload.entryId));
            else rawRemove('draft:entryId');
            rawSet('draft:variant', payload.variant || 'paj');
            if (payload.promptKey) rawSet('draft:promptKey', String(payload.promptKey));
            else rawRemove('draft:promptKey');
        },
        /** Returns { html, cards, entryId, variant, promptKey } or null when
         *  there is no draft. html is sanitized for the restore path. */
        load: function () {
            var html = rawGet('draft:html');
            var cards = jsonGet('draft:cards', null);
            if (html == null && cards == null) return null;
            return {
                html: sanitize(html || ''),
                cards: Array.isArray(cards) ? cards : [],
                entryId: rawGet('draft:entryId') || null,
                variant: rawGet('draft:variant') || null,
                promptKey: rawGet('draft:promptKey') || null
            };
        },
        clear: function () {
            ['draft:html', 'draft:cards', 'draft:entryId', 'draft:variant', 'draft:promptKey']
                .forEach(rawRemove);
        }
    };

    // ---------- memory ----------

    var memory = {
        getNotes: function () {
            return (rawGet('memory:notes') || '').slice(0, MEMORY_NOTES_MAX);
        },
        setNotes: function (notes) {
            return rawSet('memory:notes', String(notes == null ? '' : notes).slice(0, MEMORY_NOTES_MAX));
        },
        /** Account-level default. Default: true. */
        getEnabled: function () {
            var v = rawGet('memory:enabled');
            return v == null ? true : v === 'true';
        },
        /** Sync rule: changing the account default also resets this device's
         *  per-entry override to match, so a months-old override can never
         *  silently win over a changed default. */
        setEnabled: function (enabled) {
            var v = enabled ? 'true' : 'false';
            rawSet('memory:enabled', v);
            rawSet('memory:on', v);
        },
        /** Effective per-device toggle (nav pill). Initialized from the
         *  account default on first read. */
        getToggle: function () {
            var v = rawGet('memory:on');
            if (v == null) {
                var d = memory.getEnabled();
                rawSet('memory:on', d ? 'true' : 'false');
                return d;
            }
            return v === 'true';
        },
        /** Nav pill writes the device override only — never the default. */
        setToggle: function (on) {
            rawSet('memory:on', on ? 'true' : 'false');
        },
        /**
         * "- " lines built from the summaries of the 5 most recent entries
         * (newest first), skipping empty summaries (e.g. entries saved with
         * memory off). Returns '' when there is nothing to send.
         */
        recentGist: function () {
            var lines = [];
            var ids = getIndex().slice(0, RECENT_GIST_COUNT);
            ids.forEach(function (id) {
                var e = jsonGet('entry:' + id, null);
                var s = e && typeof e.summary === 'string' ? e.summary.trim() : '';
                if (s) lines.push('- ' + s);
            });
            return lines.join('\n');
        }
    };

    // ---------- small prefs ----------

    function getVariant() {
        var v = rawGet('variant');
        return (v === 'paj' || v === 'open' || v === 'auto') ? v : 'paj';
    }
    function setVariant(v) {
        if (v === 'paj' || v === 'open' || v === 'auto') rawSet('variant', v);
    }

    function getSidebarCollapsed() {
        var v = rawGet('ui:sidebarCollapsed');
        return v == null ? true : v === 'true';
    }
    function setSidebarCollapsed(collapsed) {
        rawSet('ui:sidebarCollapsed', collapsed ? 'true' : 'false');
    }

    // ---------- export / clear (data-loss mitigation) ----------

    /** Every key under this user's prefix, raw, for the JSON download on
     *  home.html. Lossless: values stay exactly as stored. */
    function exportAll() {
        var data = {};
        try {
            for (var i = 0; i < localStorage.length; i++) {
                var k = localStorage.key(i);
                if (k && k.indexOf(prefix) === 0) {
                    data[k] = localStorage.getItem(k);
                }
            }
        } catch (e) { /* return what we have */ }
        return {
            app: 'journal kernel',
            format: 'jk-localstorage-export',
            schema: SCHEMA_VERSION,
            exported_at: new Date().toISOString(),
            data: data
        };
    }

    /** Delete ONLY this user's keys (prefix-scoped). Other users on the same
     *  browser, and the supabase session key, are untouched. */
    function clearAll() {
        var doomed = [];
        try {
            for (var i = 0; i < localStorage.length; i++) {
                var k = localStorage.key(i);
                if (k && k.indexOf(prefix) === 0) doomed.push(k);
            }
            doomed.forEach(function (k) { localStorage.removeItem(k); });
        } catch (e) { /* silent */ }
    }

    window.JK.store = {
        init: init,
        isInitialized: isInitialized,
        listEntries: listEntries,
        getEntry: getEntry,
        saveEntry: saveEntry,
        setSummary: setSummary,
        deleteEntry: deleteEntry,
        draft: draft,
        memory: memory,
        getVariant: getVariant,
        setVariant: setVariant,
        getSidebarCollapsed: getSidebarCollapsed,
        setSidebarCollapsed: setSidebarCollapsed,
        exportAll: exportAll,
        clearAll: clearAll
    };
})();
