(function () {
  var input = document.getElementById('input');
  var output = document.getElementById('output');
  var msg = document.getElementById('msg');

  var BASIC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  function say(text, type) {
    if (!msg) return;
    msg.textContent = text;
    msg.className = 'msg ' + (type || '');
    msg.style.display = text ? 'block' : 'none';
  }

  function escapeBasic(str) {
    return str.replace(/[&<>"']/g, function (c) {
      return BASIC[c];
    });
  }

  function escapeNonAscii(str) {
    var out = '';
    for (var i = 0; i < str.length; i++) {
      var code = str.charCodeAt(i);
      var ch = str[i];
      if (code < 128) {
        out += BASIC[ch] || ch;
      } else {
        // Emit the full code point for surrogate pairs
        var cp = str.codePointAt(i);
        if (cp > 0xffff) i++;
        out += '&#x' + cp.toString(16).toUpperCase() + ';';
      }
    }
    return out;
  }

  // Decoding through a <textarea> lets the browser resolve every named and
  // numeric entity for us. Textarea content is never parsed as markup, so this
  // is safe even for untrusted input.
  function decodeEntities(str) {
    var ta = document.createElement('textarea');
    ta.innerHTML = str;
    return ta.value;
  }

  function countEntities(str) {
    return (str.match(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g) || []).length;
  }

  function render(text) {
    output.value = text;
  }

  window.encodeBasic = function () {
    var text = input.value;
    if (!text.trim()) {
      say('Paste some text first.', 'error');
      return;
    }
    render(escapeBasic(text));
    say('Encoded ' + text.length + ' characters.', 'success');
  };

  window.encodeAll = function () {
    var text = input.value;
    if (!text.trim()) {
      say('Paste some text first.', 'error');
      return;
    }
    render(escapeNonAscii(text));
    say('Encoded all non-ASCII characters as numeric entities.', 'success');
  };

  window.decodeAll = function () {
    var text = input.value;
    if (!text.trim()) {
      say('Paste some text first.', 'error');
      return;
    }
    var found = countEntities(text);
    var decoded = decodeEntities(text);
    render(decoded);
    if (found === 0) {
      say('No entities found — output is identical to the input.', '');
    } else {
      say('Decoded ' + found + ' entities.', 'success');
    }
  };

  window.copyResult = function () {
    if (!output.value) {
      say('Nothing to copy yet.', 'error');
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(output.value).then(function () {
        say('Copied to clipboard.', 'success');
      }, function () {
        output.select();
        say('Press Ctrl/Cmd + C to copy.', '');
      });
    } else {
      output.select();
      say('Press Ctrl/Cmd + C to copy.', '');
    }
  };

  window.clearAll = function () {
    input.value = '';
    output.value = '';
    say('', '');
    input.focus();
  };
})();
