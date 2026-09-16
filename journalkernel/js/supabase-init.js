// journal kernel — Supabase client bootstrap.
//
// Load order (every page): config.js -> pinned supabase-js UMD CDN build ->
// this file -> auth.js. Creates window.jkSupabase.
//
// IMPORTANT (hash-token race): invite/recovery links land with the token in
// location.hash, and supabase-js (detectSessionInUrl) strips that hash while
// consuming it. We capture the hash synchronously HERE, before createClient
// runs, so auth.js can still route on it (type=invite / type=recovery /
// error_code=otp_expired) after the library has eaten the URL.
(function () {
    'use strict';
    window.JK = window.JK || {};

    // Synchronous capture — must happen before createClient() below.
    window.JK.__initialHash = window.location.hash || '';

    var cfg = window.JK_CONFIG || {};
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) {
        // config.js missing or unfilled. Leave a clear breadcrumb; auth.js
        // degrades to a visible error instead of a silent broken page.
        window.jkSupabase = null;
        window.JK.__configError =
            'Missing Supabase config: copy js/config.example.js to js/config.js and fill it in.';
        return;
    }

    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
        window.jkSupabase = null;
        window.JK.__configError = 'Could not load the Supabase client library (CDN blocked?).';
        return;
    }

    // flowType is pinned to 'implicit' deliberately: invite and recovery
    // links are initiated server-side (dashboard invite / recovery email),
    // so a PKCE flow would have no code_verifier in the browser that clicks
    // the link (or the link may be opened in a different browser than the
    // one that requested the reset). Do not rely on the library default.
    window.jkSupabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: {
            flowType: 'implicit',
            detectSessionInUrl: true,
            persistSession: true,
            autoRefreshToken: true
        }
    });
})();
