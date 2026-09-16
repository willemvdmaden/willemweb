// journal kernel — home.html: memory notes, account, export, clear-data.
// Auth-gated; all journal data stays in this browser (see store.js).
(function () {
    'use strict';

    var msg = document.getElementById('homeMessage');

    function flash(text, kind) {
        if (!msg) return;
        msg.textContent = text;
        msg.className = 'flash' + (kind ? ' ' + kind : '');
        msg.hidden = false;
    }

    window.JK.auth.requireSession().then(function (session) {
        var user = session.user;
        window.JK.store.init(user.id);

        var greeting = document.getElementById('homeGreeting');
        if (greeting) {
            greeting.textContent = 'Welcome, ' + window.JK.auth.displayName(user) +
                ' — manage your memory, account, and privacy here.';
        }

        // ---------- kernel memory ----------

        var notesEl = document.getElementById('memoryNotes');
        var defaultEl = document.getElementById('memoryDefault');
        var saveMemoryBtn = document.getElementById('saveMemoryBtn');

        if (notesEl) notesEl.value = window.JK.store.memory.getNotes();
        if (defaultEl) defaultEl.checked = window.JK.store.memory.getEnabled();

        if (saveMemoryBtn) {
            saveMemoryBtn.addEventListener('click', function () {
                window.JK.store.memory.setNotes(notesEl ? notesEl.value : '');
                // setEnabled also resets this device's per-entry override to
                // match (the sync rule) — the nav pill only ever writes the
                // override.
                window.JK.store.memory.setEnabled(defaultEl ? defaultEl.checked : true);
                flash('Memory settings saved.', 'success');
            });
        }

        // ---------- change password ----------

        var pwForm = document.getElementById('changePasswordForm');
        if (pwForm) {
            pwForm.addEventListener('submit', function (e) {
                e.preventDefault();
                var pw = document.getElementById('newPassword').value || '';
                var pw2 = document.getElementById('newPasswordConfirm').value || '';
                if (pw.length < 8) {
                    flash('Password too short — use at least 8 characters.', 'error');
                    return;
                }
                if (pw !== pw2) {
                    flash('The two passwords do not match.', 'error');
                    return;
                }
                var btn = document.getElementById('changePasswordBtn');
                if (btn) btn.disabled = true;
                window.JK.auth.setPassword(pw).then(function () {
                    flash('Password updated.', 'success');
                    pwForm.reset();
                }).catch(function (err) {
                    flash(err.message, 'error');
                }).finally(function () {
                    if (btn) btn.disabled = false;
                });
            });
        }

        // ---------- export (data-loss mitigation) ----------

        var downloadBtn = document.getElementById('downloadDataBtn');
        if (downloadBtn) {
            downloadBtn.addEventListener('click', function () {
                try {
                    var payload = JSON.stringify(window.JK.store.exportAll(), null, 2);
                    var blob = new Blob([payload], { type: 'application/json' });
                    var a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = 'journal-kernel-export-' +
                        new Date().toISOString().slice(0, 10) + '.json';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
                } catch (e) {
                    flash('Sorry, the export failed. Please try again.', 'error');
                }
            });
        }

        // ---------- danger zone ----------

        var clearBtn = document.getElementById('clearDataBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', function () {
                var sure = window.confirm(
                    'Permanently delete every entry, reflection, and the kernel memory ' +
                    'stored in this browser for your account?\n\n' +
                    'Your journal lives ONLY in this browser — this cannot be undone. ' +
                    'Consider "Download my journal (JSON)" first.'
                );
                if (!sure) return;
                window.JK.store.clearAll();
                if (notesEl) notesEl.value = '';
                if (defaultEl) defaultEl.checked = window.JK.store.memory.getEnabled();
                flash('This browser\'s journal data for your account has been deleted.', 'success');
            });
        }
    });
})();
