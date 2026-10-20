(function () {
  var pattern = document.getElementById('pattern');
  var test = document.getElementById('test');
  var replacement = document.getElementById('replacement');
  var msg = document.getElementById('msg');
  var stats = document.getElementById('stats');
  var highlight = document.getElementById('highlight');
  var highlightLabel = document.getElementById('highlightLabel');
  var matchesEl = document.getElementById('matches');
  var matchLabel = document.getElementById('matchLabel');
  var replaced = document.getElementById('replaced');
  var replaceLabel = document.getElementById('replaceLabel');

  var MAX_MATCHES = 10000;
  var MAX_TEXT = 200000;
  var MAX_SHOWN = 50;
  var MAX_GROUP_ROWS = 20;

  var lastMatches = [];

  function say(text, type) {
    if (!msg) return;
    msg.textContent = text;
    msg.className = 'msg ' + (type || '');
    msg.style.display = text ? 'block' : 'none';
  }

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function currentFlags() {
    var out = '';
    var list = ['g', 'i', 'm', 's', 'u'];
    for (var i = 0; i < list.length; i++) {
      var el = document.getElementById('flag-' + list[i]);
      if (el && el.checked) out += list[i];
    }
    return out;
  }

  function hide(label, el) {
    if (label) label.style.display = 'none';
    if (el) el.innerHTML = '';
  }

  function collect(re, text) {
    var list = [];
    var capped = false;
    if (re.global) {
      re.lastIndex = 0;
      var m;
      var guard = 0;
      while ((m = re.exec(text)) !== null) {
        list.push(m);
        // A zero-length match never advances lastIndex on its own.
        if (m[0] === '') re.lastIndex++;
        if (++guard >= MAX_MATCHES) {
          capped = true;
          break;
        }
      }
    } else {
      var one = re.exec(text);
      if (one) list.push(one);
    }
    return { list: list, capped: capped };
  }

  function highlightText(text, list) {
    var out = '';
    var pos = 0;
    for (var i = 0; i < list.length; i++) {
      var m = list[i];
      if (m.index < pos) continue;
      out += esc(text.slice(pos, m.index));
      out += '<mark class="' + (i % 2 ? 'm2' : 'm1') + '">' + esc(m[0]) + '</mark>';
      pos = m.index + m[0].length;
    }
    out += esc(text.slice(pos));
    return out;
  }

  function groupRows(m, idx) {
    var html = '';
    var names = {};
    if (m.groups) {
      for (var k in m.groups) {
        if (Object.prototype.hasOwnProperty.call(m.groups, k)) names[k] = m.groups[k];
      }
    }
    for (var i = 1; i < m.length; i++) {
      var val = m[i];
      var label = 'group ' + i;
      for (var n in names) {
        if (Object.prototype.hasOwnProperty.call(names, n) && names[n] === val && val !== undefined) {
          label += ' · ' + n;
          delete names[n];
          break;
        }
      }
      html +=
        '<div class="result-row"><span class="label">' +
        esc(label) +
        '</span><span class="value">' +
        (val === undefined ? '<em>undefined</em>' : esc(val)) +
        '</span></div>';
    }
    return html;
  }

  function statCard(num, key) {
    return '<div class="stat-card"><div class="num">' + num + '</div><div class="key">' + key + '</div></div>';
  }

  window.run = function () {
    var src = pattern.value;
    if (!src) {
      say('Enter a regular expression first.', 'error');
      hide(highlightLabel, highlight);
      hide(matchLabel, matchesEl);
      hide(replaceLabel, null);
      stats.style.display = 'none';
      return;
    }

    var flags = currentFlags();
    var re;
    try {
      re = new RegExp(src, flags);
    } catch (e) {
      say('Invalid regular expression: ' + e.message, 'error');
      hide(highlightLabel, highlight);
      hide(matchLabel, matchesEl);
      hide(replaceLabel, null);
      stats.style.display = 'none';
      return;
    }

    var text = test.value;
    var truncated = false;
    if (text.length > MAX_TEXT) {
      text = text.slice(0, MAX_TEXT);
      truncated = true;
    }

    var res = collect(re, text);
    var list = res.list;
    lastMatches = list;

    // ---- stats ----
    var unique = {};
    var uniqueCount = 0;
    for (var i = 0; i < list.length; i++) {
      if (!Object.prototype.hasOwnProperty.call(unique, list[i][0])) {
        unique[list[i][0]] = true;
        uniqueCount++;
      }
    }
    var groupCount = list.length ? list[0].length - 1 : 0;
    stats.innerHTML =
      statCard(list.length, list.length === 1 ? 'match' : 'matches') +
      statCard(groupCount, 'capture groups') +
      statCard(uniqueCount, 'distinct matches');
    stats.style.display = '';

    // ---- highlight ----
    highlightLabel.style.display = '';
    highlight.innerHTML = highlightText(text, list) || '<em>&nbsp;</em>';

    // ---- match list ----
    if (!list.length) {
      hide(matchLabel, matchesEl);
    } else {
      var html = '';
      var shown = Math.min(list.length, MAX_SHOWN);
      for (var j = 0; j < shown; j++) {
        var m = list[j];
        html +=
          '<div class="result-row"><span class="label">#' +
          (j + 1) +
          ' @' +
          m.index +
          '</span><span class="value">' +
          esc(m[0] === '' ? '(empty match)' : m[0]) +
          '</span></div>';
        if (j < MAX_GROUP_ROWS && m.length > 1) html += groupRows(m, j);
      }
      if (list.length > shown) {
        html += '<div class="result-row"><span class="label">&hellip;</span><span class="value">' +
          (list.length - shown) + ' more matches not listed</span></div>';
      }
      matchLabel.style.display = '';
      matchesEl.innerHTML = html;
    }

    // ---- replacement ----
    if (replacement.value !== '') {
      try {
        replaced.value = text.replace(re, replacement.value);
        replaceLabel.style.display = '';
      } catch (e2) {
        hide(replaceLabel, null);
        say('Replacement failed: ' + e2.message, 'error');
      }
    } else {
      hide(replaceLabel, null);
    }

    // ---- message ----
    if (!list.length) {
      say(truncated ? 'No matches in the first ' + MAX_TEXT + ' characters.' : 'No matches found.', '');
    } else if (res.capped) {
      say('Stopped at ' + MAX_MATCHES + ' matches — the pattern matches a lot. Narrow it down for a complete list.', '');
    } else if (truncated) {
      say('Found ' + list.length + ' matches (first ' + MAX_TEXT + ' characters only).', 'success');
    } else {
      say('Found ' + list.length + (list.length === 1 ? ' match.' : ' matches.'), 'success');
    }
  };

  window.loadSample = function () {
    pattern.value = '([a-z]+)@([a-z]+)\\.(com|org|net)';
    document.getElementById('flag-g').checked = true;
    document.getElementById('flag-i').checked = true;
    test.value =
      'Reach us at support@getoolkit.com or sales@getoolkit.org.\n' +
      'For press enquiries: press@getoolkit.net.\n' +
      'Not an address: user@localhost, and hello@getoolkit.io is out of range.';
    replacement.value = '$2.$1@example.com';
    run();
  };

  window.copyMatches = function () {
    if (!lastMatches.length) {
      say('Nothing to copy yet — run a test first.', 'error');
      return;
    }
    var text = lastMatches
      .map(function (m) {
        return m[0];
      })
      .join('\n');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        function () {
          say('Copied ' + lastMatches.length + ' matches to the clipboard.', 'success');
        },
        function () {
          say('Clipboard blocked by the browser.', 'error');
        }
      );
    } else {
      say('Clipboard is not available in this browser.', 'error');
    }
  };

  window.clearAll = function () {
    pattern.value = '';
    test.value = '';
    replacement.value = '';
    lastMatches = [];
    hide(highlightLabel, highlight);
    hide(matchLabel, matchesEl);
    hide(replaceLabel, null);
    stats.style.display = 'none';
    say('', '');
    pattern.focus();
  };
})();
