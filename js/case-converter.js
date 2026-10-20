(function () {
  var input = document.getElementById('input');
  var msg = document.getElementById('msg');
  var results = document.getElementById('results');

  var OUT = ['camel', 'pascal', 'snake', 'kebab', 'constant', 'title', 'sentence'];

  function say(text, type) {
    if (!msg) return;
    msg.textContent = text;
    msg.className = 'msg ' + (type || '');
    msg.style.display = text ? 'block' : 'none';
  }

  function set(id, value) {
    var el = document.getElementById('out-' + id);
    if (el) el.textContent = value;
  }

  /**
   * Split loose text into words: first on separators, then on case boundaries
   * so that getToolkit and XMLHttpRequest both come apart correctly.
   */
  function toWords(s) {
    return String(s)
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
      .replace(/[_\-.]+/g, ' ')
      .split(/[^A-Za-z0-9]+/)
      .filter(function (w) {
        return w.length > 0;
      });
  }

  function cap(w) {
    return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  }

  function camel(ws) {
    return ws
      .map(function (w, i) {
        return i === 0 ? w.toLowerCase() : cap(w);
      })
      .join('');
  }

  function pascal(ws) {
    return ws.map(cap).join('');
  }

  function snake(ws) {
    return ws
      .map(function (w) {
        return w.toLowerCase();
      })
      .join('_');
  }

  function kebab(ws) {
    return ws
      .map(function (w) {
        return w.toLowerCase();
      })
      .join('-');
  }

  function constant(ws) {
    return ws
      .map(function (w) {
        return w.toUpperCase();
      })
      .join('_');
  }

  function title(ws) {
    return ws.map(cap).join(' ');
  }

  function sentence(ws) {
    if (!ws.length) return '';
    return (
      cap(ws[0]) +
      (ws.length > 1
        ? ' ' +
          ws
            .slice(1)
            .map(function (w) {
              return w.toLowerCase();
            })
            .join(' ')
        : '')
    );
  }

  window.convert = function () {
    var text = input.value;
    var words = toWords(text);
    if (!words.length) {
      say('Type or paste some text first.', 'error');
      results.style.display = 'none';
      return;
    }

    set('camel', camel(words));
    set('pascal', pascal(words));
    set('snake', snake(words));
    set('kebab', kebab(words));
    set('constant', constant(words));
    set('title', title(words));
    set('sentence', sentence(words));

    results.style.display = '';
    say('Converted ' + words.length + (words.length === 1 ? ' word.' : ' words.'), 'success');
  };

  window.copyOne = function (id) {
    var el = document.getElementById(id);
    if (!el || !el.textContent) {
      say('Nothing to copy yet.', 'error');
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(el.textContent).then(
        function () {
          say('Copied.', 'success');
        },
        function () {
          say('Clipboard blocked by the browser.', 'error');
        }
      );
    } else {
      say('Clipboard is not available in this browser.', 'error');
    }
  };

  window.loadSample = function () {
    input.value = 'getToolkit user id';
    convert();
  };

  window.clearAll = function () {
    input.value = '';
    for (var i = 0; i < OUT.length; i++) set(OUT[i], '');
    results.style.display = 'none';
    say('', '');
    input.focus();
  };
})();
