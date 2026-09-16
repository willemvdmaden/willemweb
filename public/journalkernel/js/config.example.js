// journal kernel — deployment config template.
//
// Copy this file to config.js (same folder) and fill in the values for your
// Supabase project. config.js is gitignored so each deploy fills its own copy;
// build.sh refuses to build without it.
//
// The anon key is public by design (it is shipped to every browser). It grants
// nothing by itself: journal content never touches the server, and the AI
// Edge Function separately verifies the caller's user session.
//
// NEVER put the OpenRouter API key (or any secret) in this file or anywhere
// else in client code — it lives only in Supabase Edge Function secrets.
window.JK_CONFIG = {
    // https://<project-ref>.supabase.co
    SUPABASE_URL: '',
    // Project anon (public) key from the Supabase dashboard.
    SUPABASE_ANON_KEY: '',
    // https://<project-ref>.supabase.co/functions/v1
    FUNCTIONS_URL: ''
};
