// journal kernel — auth module + per-page wiring.
//
// Load order (every page): config.js -> pinned supabase-js UMD -> supabase-init.js
// -> this file. supabase-init.js captured location.hash synchronously into
// window.JK.__initialHash BEFORE the supabase client (detectSessionInUrl) could
// strip it, so invite/recovery routing below never races the library.
//
// Auth model (see README): 4 invite-only Supabase users; project signups are
// OFF; each user sets their own password on first login via a single-use
// emailed link (type=invite) or the recovery flow (type=recovery). There is no
// registration surface anywhere in this app.
//
// Exports (window.JK.auth):
//   requireSession() -> Promise<{user, access_token}>   (page guard; redirects)
//   getAccessToken() -> Promise<string|null>
//   currentUser()    -> user|null (after requireSession resolved)
//   displayName(user)-> user_metadata.name, else email local-part
//   signIn(email,pw), signOut(), setPassword(pw), sendReset(email), routeAuthHash()
(function () {
    'use strict';
    window.JK = window.JK || {};

    var client = window.jkSupabase || null;

    // ---------- initial-hash routing (invite / recovery / link errors) ----------

    var initialHash = String(window.JK.__initialHash || '');
    if (initialHash.charAt(0) === '#') initialHash = initialHash.slice(1);
    var hashParams = new URLSearchParams(initialHash);

    /**
     * What did the URL's hash carry when the page loaded?
     *   {kind:'token', type:'invite'|'recovery'|...}  — a live auth token
     *   {kind:'error', code, description}             — e.g. otp_expired
     *   {kind:'none'}
     */
    function routeAuthHash() {
        if (hashParams.get('error') || hashParams.get('error_code')) {
            return {
                kind: 'error',
                code: hashParams.get('error_code') || hashParams.get('error') || 'unknown',
                description: (hashParams.get('error_description') || '').replace(/\+/g, ' ')
            };
        }
        if (hashParams.get('access_token')) {
            return { kind: 'token', type: hashParams.get('type') || 'unknown' };
        }
        return { kind: 'none' };
    }

    function isSetPasswordToken(route) {
        return route.kind === 'token' &&
            (route.type === 'invite' || route.type === 'recovery' || route.type === 'signup');
    }

    // ---------- small helpers ----------

    /** A promise that never resolves — returned after a redirect so callers
     *  of requireSession() simply stop instead of running against a page that
     *  is about to be replaced. */
    function never() { return new Promise(function () {}); }

    function goto(page) { window.location.replace(page); }

    function onSetPasswordPage() {
        return /(^|\/)set-password\.html$/.test(window.location.pathname);
    }

    /** Wait for supabase-js to establish a session (it consumes hash tokens
     *  asynchronously). Resolves with the session, or null on timeout. */
    function waitForSession(timeoutMs) {
        if (!client) return Promise.resolve(null);
        return new Promise(function (resolve) {
            var done = false;
            var sub = null;
            function finish(session) {
                if (done) return;
                done = true;
                try { if (sub) sub.subscription.unsubscribe(); } catch (e) { /* noop */ }
                resolve(session || null);
            }
            try {
                sub = client.auth.onAuthStateChange(function (_event, session) {
                    if (session) finish(session);
                }).data;
            } catch (e) { /* fall through to getSession */ }
            client.auth.getSession().then(function (r) {
                if (r && r.data && r.data.session) finish(r.data.session);
            }).catch(function () { /* keep waiting for the event */ });
            setTimeout(function () { finish(null); }, timeoutMs || 8000);
        });
    }

    function mustSetPassword(user) {
        return !!(user && user.user_metadata && user.user_metadata.must_set_password);
    }

    function displayName(user) {
        if (!user) return '';
        var md = user.user_metadata || {};
        if (md.name && String(md.name).trim()) return String(md.name).trim();
        // Dashboard invites cannot set metadata at invite time — fall back to
        // the email local-part.
        var email = user.email || '';
        return email.indexOf('@') > 0 ? email.slice(0, email.indexOf('@')) : email;
    }

    function friendlyAuthError(error) {
        var m = (error && error.message) ? String(error.message) : '';
        if (/invalid login credentials/i.test(m)) return 'Invalid name or password.';
        // No mailbox exists behind the account addresses, so telling anyone to check their email
        // for an invite link is a dead end. The only cure is the operator ticking Auto Confirm.
        if (/email not confirmed/i.test(m)) return 'This account was created without being confirmed, so it cannot be used yet. Ask Willem to re-create it with "Auto Confirm User" ticked.';
        if (/rate limit|too many/i.test(m)) return 'Too many attempts — wait a minute and try again.';
        if (/auth session missing/i.test(m)) return 'Your link has expired. Go to the login page and use "Forgot password?" to get a new one.';
        if (/(should be different|different from the old)/i.test(m)) return 'The new password must be different from your current one.';
        if (/at least|password/i.test(m) && /characters/i.test(m)) return 'Password too short — use at least 8 characters.';
        return m || 'Something went wrong. Please try again.';
    }

    // ---------- session guard ----------

    var cachedUser = null;
    var sessionPromise = null;

    /**
     * Page guard for index/home/entries. Resolves {user, access_token}, or
     * redirects (login, or set-password for invite/recovery tokens and the
     * must_set_password fallback flow) and never resolves.
     */
    function requireSession() {
        if (sessionPromise) return sessionPromise;
        sessionPromise = (function () {
            if (!client) {
                showConfigError();
                return never();
            }
            var route = routeAuthHash();
            if (isSetPasswordToken(route)) {
                // An invite/recovery link landed here (e.g. Site URL default).
                // Do NOT bounce to login — let supabase-js consume the token,
                // then route to the set-password screen.
                return waitForSession(8000).then(function () {
                    goto('./set-password.html');
                    return never();
                });
            }
            return client.auth.getSession().then(function (r) {
                var session = r && r.data ? r.data.session : null;
                if (!session) { goto('./login.html'); return never(); }
                if (mustSetPassword(session.user)) { goto('./set-password.html'); return never(); }
                cachedUser = session.user;
                return { user: session.user, access_token: session.access_token };
            });
        })();
        return sessionPromise;
    }

    /** Fresh access token (supabase-js refreshes it as needed). */
    function getAccessToken() {
        if (!client) return Promise.resolve(null);
        return client.auth.getSession().then(function (r) {
            return (r && r.data && r.data.session) ? r.data.session.access_token : null;
        });
    }

    function currentUser() { return cachedUser; }

    // ---------- auth actions ----------

    /**
     * Sign-in is by first name; Supabase accounts are keyed by a synthetic address derived from
     * it. The domain is a convention, not a mailbox — nothing is ever sent there — and it must
     * match the addresses the 4 accounts were created with AND the ALLOWED_EMAILS secret.
     */
    var NAME_DOMAIN = 'journalkernel.willemvandermaden.com';
    function toEmail(name) {
        var v = name.trim().toLowerCase().replace(/\s+/g, '');
        // Anyone who has seen the account's address types the whole thing, and appending the domain
        // to an address that already carries one built 'willem@…com@…com' and answered with a flat
        // "invalid name or password" — a dead end with no way to see the cause.
        return v.indexOf('@') === -1 ? v + '@' + NAME_DOMAIN : v;
    }

    function signIn(email, password) {
        return client.auth.signInWithPassword({ email: email, password: password })
            .then(function (r) {
                if (r.error) throw new Error(friendlyAuthError(r.error));
                cachedUser = r.data.user;
                return r.data.user;
            });
    }

    /**
     * scope:'local' is deliberate — the default global scope revokes the
     * user's refresh tokens on EVERY device, so logging out on a shared test
     * machine would silently kill the same user's session on their own laptop.
     */
    function signOut() {
        var p = client
            ? client.auth.signOut({ scope: 'local' }).catch(function () { /* still redirect */ })
            : Promise.resolve();
        return p.then(function () {
            cachedUser = null;
            sessionPromise = null;
            goto('./login.html');
        });
    }

    /** Set the signed-in user's password. Clearing must_set_password in the
     *  same call finishes the temp-password fallback flow (client-side gate
     *  only, by design — fine for 4 trusted users). */
    function setPassword(password) {
        return client.auth.updateUser({
            password: password,
            data: { password_set: true, must_set_password: false }
        }).then(function (r) {
            if (r.error) throw new Error(friendlyAuthError(r.error));
            cachedUser = r.data.user;
            return r.data.user;
        });
    }

    /** Recovery email. redirectTo is computed at runtime so the same build
     *  works at localhost:8000, localhost:4321, and production (the URL must
     *  also be in the dashboard's Redirect URLs allowlist). */
    function sendReset(email) {
        var redirectTo = new URL('./set-password.html', window.location.href).href;
        return client.auth.resetPasswordForEmail(email, { redirectTo: redirectTo })
            .then(function (r) {
                if (r.error) throw new Error(friendlyAuthError(r.error));
                return true;
            });
    }

    // ---------- messages ----------

    function flash(el, text, kind) {
        if (!el) return;
        el.textContent = text;
        el.className = 'flash' + (kind ? ' ' + kind : '');
        el.hidden = false;
    }

    function messageEl() {
        return document.getElementById('authMessage') || document.getElementById('homeMessage');
    }

    function showConfigError() {
        var text = window.JK.__configError || 'App configuration error.';
        var el = messageEl();
        if (el) flash(el, text, 'error');
        else if (window.console) console.error(text);
    }

    // ---------- page wiring ----------

    function wireLogin() {
        var form = document.getElementById('loginForm');
        var msg = document.getElementById('authMessage');
        var loginBtn = document.getElementById('loginBtn');
        var forgotBtn = document.getElementById('forgotBtn');
        var route = routeAuthHash();

        if (isSetPasswordToken(route)) {
            // Invite/recovery link redirected here — hand over to set-password.
            waitForSession(8000).then(function () { goto('./set-password.html'); });
            return;
        }
        if (route.kind === 'error') {
            flash(msg, 'That link has expired or was already used — enter your email and use "Forgot password?" to get a new one.', 'info');
        }

        // Already signed in? Skip the form.
        client.auth.getSession().then(function (r) {
            var session = r && r.data ? r.data.session : null;
            if (session) {
                goto(mustSetPassword(session.user) ? './set-password.html' : './index.html');
            }
        });

        if (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                var name = (document.getElementById('name').value || '').trim();
                var password = document.getElementById('password').value || '';
                if (!name || !password) return;
                if (loginBtn) { loginBtn.disabled = true; loginBtn.textContent = 'Logging in…'; }
                if (msg) msg.hidden = true;
                // The address is shown on failure on purpose. Supabase answers "invalid
                // credentials" identically for a wrong password and an account that does not
                // exist, so without naming what was tried there is no way to tell a typo in the
                // name from a typo in the account, and nothing on screen can be acted on.
                var attempted = toEmail(name);
                signIn(attempted, password).then(function (user) {
                    goto(mustSetPassword(user) ? './set-password.html' : './index.html');
                }).catch(function (err) {
                    var hint = /invalid name or password/i.test(err.message)
                        ? ' Tried ' + attempted + '.'
                        : '';
                    flash(msg, err.message + hint, 'error');
                    if (loginBtn) { loginBtn.disabled = false; loginBtn.textContent = 'Log in'; }
                });
            });
        }

        if (forgotBtn) {
            forgotBtn.addEventListener('click', function () {
                var email = (document.getElementById('email').value || '').trim();
                if (!email) {
                    flash(msg, 'Enter your email above first, then click "Forgot password?".', 'info');
                    return;
                }
                forgotBtn.disabled = true;
                sendReset(email).then(function () {
                    flash(msg, 'If that address has an account, a password link is on its way. The link opens the set-password screen.', 'success');
                }).catch(function (err) {
                    flash(msg, err.message, 'error');
                }).finally(function () { forgotBtn.disabled = false; });
            });
        }
    }

    function wireSetPassword() {
        var working = document.getElementById('authWorking');
        var expired = document.getElementById('linkExpired');
        var form = document.getElementById('setPasswordForm');
        var msg = document.getElementById('authMessage');
        var btn = document.getElementById('setPasswordBtn');
        var route = routeAuthHash();

        function showExpired() {
            if (working) working.hidden = true;
            if (form) form.hidden = true;
            if (expired) expired.hidden = false;
        }
        function showForm() {
            if (working) working.hidden = true;
            if (expired) expired.hidden = true;
            if (form) {
                form.hidden = false;
                var pw = document.getElementById('password');
                if (pw) pw.focus();
            }
        }

        if (route.kind === 'error') {
            // e.g. #error=access_denied&error_code=otp_expired — a human
            // message instead of a form that would silently fail.
            showExpired();
            return;
        }

        if (route.kind === 'token') {
            // A live invite/recovery token is in the URL; supabase-js
            // consumes it asynchronously — wait for the session.
            waitForSession(8000).then(function (session) {
                if (session) { showForm(); return; }
                // Token was present but no session came of it (consumed /
                // invalid). Same recovery path as an expired link.
                showExpired();
            });
        } else {
            // No token: only an existing session counts (the temp-password
            // must_set_password flow, or a password change revisit). One
            // immediate check — don't sit on the 8s token timeout.
            client.auth.getSession().then(function (r) {
                var session = r && r.data ? r.data.session : null;
                if (session) showForm();
                else goto('./login.html');
            });
        }

        if (form) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                var pw = document.getElementById('password').value || '';
                var pw2 = document.getElementById('passwordConfirm').value || '';
                if (pw.length < 8) {
                    flash(msg, 'Password too short — use at least 8 characters.', 'error');
                    return;
                }
                if (pw !== pw2) {
                    flash(msg, 'The two passwords do not match.', 'error');
                    return;
                }
                if (btn) { btn.disabled = true; btn.textContent = 'Setting password…'; }
                if (msg) msg.hidden = true;
                setPassword(pw).then(function () {
                    goto('./index.html');
                }).catch(function (err) {
                    flash(msg, err.message, 'error');
                    if (btn) { btn.disabled = false; btn.textContent = 'Set password'; }
                });
            });
        }
    }

    function wirePage() {
        if (!client) { showConfigError(); return; }

        // A recovery link can technically land anywhere in the allowlist —
        // supabase-js announces it; route to the set-password screen.
        try {
            client.auth.onAuthStateChange(function (event) {
                if (event === 'PASSWORD_RECOVERY' && !onSetPasswordPage()) {
                    goto('./set-password.html');
                }
            });
        } catch (e) { /* noop */ }

        var logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function () { signOut(); });
        }

        if (document.getElementById('loginForm')) {
            wireLogin();
        } else if (document.getElementById('setPasswordForm')) {
            wireSetPassword();
        } else {
            // Every other page (editor, home, entries) is auth-gated. Page
            // scripts also call requireSession(); it is cached, so this is
            // one shared check, and it keeps the gate enforced even on pages
            // whose script failed to load.
            requireSession();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', wirePage);
    } else {
        wirePage();
    }

    window.JK.auth = {
        requireSession: requireSession,
        getAccessToken: getAccessToken,
        currentUser: currentUser,
        displayName: displayName,
        signIn: signIn,
        signOut: signOut,
        setPassword: setPassword,
        sendReset: sendReset,
        routeAuthHash: routeAuthHash
    };
})();
