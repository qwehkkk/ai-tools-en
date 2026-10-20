(function () {
  var input = document.getElementById('input');
  var msg = document.getElementById('msg');

  var ROWS = [
    ['MD5', 'r-md5'],
    ['SHA-1', 'r-sha1'],
    ['SHA-256', 'r-sha256'],
    ['SHA-384', 'r-sha384'],
    ['SHA-512', 'r-sha512']
  ];

  var timer = null;

  function say(text, kind) {
    msg.textContent = text;
    msg.className = 'msg ' + (kind || '');
    msg.style.display = text ? 'block' : 'none';
  }

  function toHex(buffer) {
    var bytes = new Uint8Array(buffer);
    var out = '';
    for (var i = 0; i < bytes.length; i++) {
      out += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
    }
    return out;
  }

  function setRow(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  async function digestAll() {
    var text = input.value;

    if (!text) {
      ROWS.forEach(function (row) { setRow(row[1], '—'); });
      say('', '');
      return;
    }

    setRow('r-md5', window.md5Hex(text));

    if (!(window.crypto && window.crypto.subtle)) {
      ROWS.slice(1).forEach(function (row) { setRow(row[1], 'unavailable'); });
      say('SHA hashing requires a secure (https) connection. MD5 still works.', 'error');
      return;
    }

    var data = new TextEncoder().encode(text);

    try {
      var results = await Promise.all([
        window.crypto.subtle.digest('SHA-1', data),
        window.crypto.subtle.digest('SHA-256', data),
        window.crypto.subtle.digest('SHA-384', data),
        window.crypto.subtle.digest('SHA-512', data)
      ]);
      for (var i = 0; i < results.length; i++) {
        setRow(ROWS[i + 1][1], toHex(results[i]));
      }
      say('Hashed ' + text.length + ' characters (' + data.length + ' bytes as UTF-8).', '');
    } catch (err) {
      say('Hashing failed: ' + err.message, 'error');
    }
  }

  window.run = function () {
    digestAll();
  };

  window.copyText = function (id) {
    var el = document.getElementById(id);
    if (!el || el.textContent === '—') return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(el.textContent).then(function () {
        say('Copied to clipboard.', 'success');
      }, function () {});
    }
  };

  window.copyAll = function () {
    if (!input.value) {
      say('Type something to hash first.', 'error');
      return;
    }
    var lines = ROWS.map(function (row) {
      var el = document.getElementById(row[1]);
      return row[0] + ': ' + (el ? el.textContent : '');
    }).join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lines).then(function () {
        say('All five hashes copied.', 'success');
      }, function () {
        say('Clipboard blocked by the browser.', 'error');
      });
    }
  };

  window.clearAll = function () {
    input.value = '';
    ROWS.forEach(function (row) { setRow(row[1], '—'); });
    say('', '');
    input.focus();
  };

  // Live hashing with a short debounce so typing stays smooth
  input.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(digestAll, 180);
  });
})();
