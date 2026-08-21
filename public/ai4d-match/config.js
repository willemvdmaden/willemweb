// Group Matcher — public configuration.
// This file ships to every student's browser. ONLY the anon key belongs here.
//
// The service_role key goes NOWHERE in this codebase. matcher.html asks for
// it on load and keeps it in sessionStorage only.

// From Supabase: Project Settings -> API
const SUPABASE_URL = "https://xgscdvevbkerpniencyn.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_MwlX_EZqHN4nfQOMnSHcvw_GBQUi-54";

// Where index.html lives once deployed (used in the absentee reminder email).
const FORM_URL = "https://willemvandermaden.com/ai4d-match/";

// Placeholders Willem fills before class:
const ABSENTEE_DEADLINE_TEXT = "today (Monday 24 Aug) by 14:00"; // in the reminder email
const DELETION_DATE_TEXT = "7 September 2026";                   // in the form's privacy footer
