// journal kernel — entries.html: the past-entries archive.
// Reads everything from this browser's localStorage (JK.store); nothing is
// fetched from a server. Each card: date+time, word count, full text,
// "Open in editor" (deep link ./index.html?entry=<id>) and Delete.
(function () {
    'use strict';

    function renderEntries(container) {
        var entries = window.JK.store.listEntries();
        container.textContent = '';

        if (entries.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'empty-state';
            var h2 = document.createElement('h2');
            h2.textContent = 'No entries yet';
            var p = document.createElement('p');
            p.textContent = 'Start journaling to see your entries here';
            var a = document.createElement('a');
            a.href = './index.html';
            a.textContent = 'Write your first entry';
            empty.appendChild(h2);
            empty.appendChild(p);
            empty.appendChild(a);
            container.appendChild(empty);
            return;
        }

        entries.forEach(function (entry) {
            var card = document.createElement('div');
            card.className = 'entry-card';

            var meta = document.createElement('div');
            meta.className = 'entry-meta';
            var dateEl = document.createElement('div');
            dateEl.className = 'entry-date';
            dateEl.textContent = window.JK.util.formatEntryDate(entry.timestamp);
            var wcEl = document.createElement('div');
            wcEl.className = 'entry-word-count';
            wcEl.textContent = entry.word_count + ' words';
            meta.appendChild(dateEl);
            meta.appendChild(wcEl);

            // Full text, always via textContent (CSS pre-wraps it).
            var textEl = document.createElement('div');
            textEl.className = 'entry-text';
            textEl.textContent = entry.text || '';

            var actions = document.createElement('div');
            actions.className = 'entry-actions';

            var openLink = document.createElement('a');
            openLink.className = 'delete-button open-button';
            openLink.style.marginRight = '8px';
            openLink.href = './index.html?entry=' + encodeURIComponent(entry.id);
            openLink.textContent = 'Open in editor';

            var delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'delete-button';
            delBtn.textContent = 'Delete';
            delBtn.addEventListener('click', function () {
                if (!confirm('Are you sure you want to delete this entry?')) return;
                window.JK.store.deleteEntry(entry.id);
                renderEntries(container);
            });

            actions.appendChild(openLink);
            actions.appendChild(delBtn);

            card.appendChild(meta);
            card.appendChild(textEl);
            card.appendChild(actions);
            container.appendChild(card);
        });
    }

    function start() {
        window.JK.auth.requireSession().then(function (session) {
            window.JK.store.init(session.user.id);
            var container = document.getElementById('entriesContainer');
            if (container) renderEntries(container);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
})();
