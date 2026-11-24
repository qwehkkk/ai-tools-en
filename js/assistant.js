// assistant.js — AI Docs Assistant UI. Talks to /api/ask (Cloudflare Pages Function).
// The endpoint returns { answer, sources: [{title, url, section}] }.
// Citation markers like [1] in the answer are turned into clickable source links.

(function () {
  'use strict';

  var log = document.getElementById('chat-log');
  var input = document.getElementById('chat-input');
  var sendBtn = document.getElementById('chat-send');
  var chips = document.getElementById('chat-chips');

  function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function addBubble(html, cls) {
    var div = document.createElement('div');
    div.className = 'chat-msg ' + cls;
    div.innerHTML = html;
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
    return div;
  }

  function renderAnswer(answer, sources) {
    // [n] -> citation link to sources[n-1]
    var html = esc(answer).replace(/\[(\d+)\]/g, function (_, n) {
      var s = sources[Number(n) - 1];
      return s ? '<a href="' + esc(s.url) + '" title="' + esc(s.section) + '">[' + n + ']</a>' : '[' + n + ']';
    });
    html = html.replace(/\n/g, '<br>');
    var bubble = addBubble(html, 'chat-bot');
    if (sources.length) {
      var list = sources.map(function (s) {
        return '<a href="' + esc(s.url) + '">' + esc(s.title) + '</a>';
      }).join(' · ');
      var src = document.createElement('p');
      src.className = 'chat-sources';
      src.innerHTML = 'Sources: ' + list;
      bubble.appendChild(src);
    }
  }

  function ask(q) {
    q = (q || '').trim();
    if (!q) return;
    chips.style.display = 'none';
    addBubble(esc(q), 'chat-user');
    input.value = '';
    sendBtn.disabled = true;

    var typing = addBubble('<span class="chat-typing">Thinking…</span>', 'chat-bot chat-typing-bubble');

    fetch('/api/ask', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q })
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        typing.remove();
        if (res.ok && res.j.answer) {
          renderAnswer(res.j.answer, res.j.sources || []);
        } else {
          addBubble(esc(res.j.error || 'Something went wrong. Please try again.'), 'chat-bot');
        }
      })
      .catch(function () {
        typing.remove();
        addBubble('Network error. Please try again.', 'chat-bot');
      })
      .finally(function () {
        sendBtn.disabled = false;
        input.focus();
      });
  }

  sendBtn.addEventListener('click', function () { ask(input.value); });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') ask(input.value);
  });
  chips.addEventListener('click', function (e) {
    var btn = e.target.closest('.chip');
    if (btn) ask(btn.getAttribute('data-q'));
  });
})();
