(function () {
  var left = document.getElementById('left');
  var right = document.getElementById('right');
  var msg = document.getElementById('msg');
  var stats = document.getElementById('stats');
  var diffView = document.getElementById('diffView');
  var diffLabel = document.getElementById('diffLabel');
  var cbCase = document.getElementById('ignoreCase');
  var cbSpace = document.getElementById('ignoreSpace');
  var cbInline = document.getElementById('inlineDiff');

  // Largest comparison table we are willing to allocate. 4M cells at 2 bytes
  // each is about 8 MB, which keeps the tab responsive for realistic input.
  var MAX_CELLS = 4000000;
  var INLINE_MAX_CELLS = 200000;

  var lastPlain = '';

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

  function rawLines(text) {
    var t = String(text).replace(/\r\n?/g, '\n');
    var lines = t.split('\n');
    if (lines.length && lines[lines.length - 1] === '') lines.pop();
    return lines;
  }

  function normLines(lines, opts) {
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i];
      if (opts.ignoreSpace) l = l.replace(/^[\s﻿]+|[\s﻿]+$/g, '');
      if (opts.ignoreCase) l = l.toLowerCase();
      out.push(l);
    }
    return out;
  }

  /**
   * Longest-common-subsequence diff over two arrays of comparable items.
   * Returns { ops, truncated } where ops are {type: 'same'|'del'|'add', value}.
   */
  function lcsOps(a, b, maxCells) {
    var n = a.length;
    var m = b.length;
    var ops = [];
    var i, j;

    if (n === 0 || m === 0) {
      for (i = 0; i < n; i++) ops.push({ type: 'del', value: a[i] });
      for (j = 0; j < m; j++) ops.push({ type: 'add', value: b[j] });
      return { ops: ops, truncated: false };
    }

    if ((n + 1) * (m + 1) > maxCells) {
      // Too big for the full table: trim the shared head and tail and treat
      // everything in between as a replacement. Better than freezing the tab.
      var p = 0;
      while (p < n && p < m && a[p] === b[p]) {
        ops.push({ type: 'same', value: a[p] });
        p++;
      }
      var q = 0;
      while (q < n - p && q < m - p && a[n - 1 - q] === b[m - 1 - q]) q++;
      for (i = p; i < n - q; i++) ops.push({ type: 'del', value: a[i] });
      for (j = p; j < m - q; j++) ops.push({ type: 'add', value: b[j] });
      for (i = n - q; i < n; i++) ops.push({ type: 'same', value: a[i] });
      return { ops: ops, truncated: true };
    }

    var w = m + 1;
    var dp = new Uint16Array((n + 1) * w);
    for (i = n - 1; i >= 0; i--) {
      for (j = m - 1; j >= 0; j--) {
        dp[i * w + j] =
          a[i] === b[j]
            ? dp[(i + 1) * w + j + 1] + 1
            : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1]);
      }
    }

    i = 0;
    j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) {
        ops.push({ type: 'same', value: a[i] });
        i++;
        j++;
      } else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) {
        ops.push({ type: 'del', value: a[i] });
        i++;
      } else {
        ops.push({ type: 'add', value: b[j] });
        j++;
      }
    }
    while (i < n) {
      ops.push({ type: 'del', value: a[i] });
      i++;
    }
    while (j < m) {
      ops.push({ type: 'add', value: b[j] });
      j++;
    }
    return { ops: ops, truncated: false };
  }

  /** Join runs of removals/additions into single "changed" pairs */
  function pairChanges(ops) {
    var out = [];
    var i = 0;
    while (i < ops.length) {
      if (ops[i].type === 'same') {
        out.push(ops[i]);
        i++;
        continue;
      }
      var dels = [];
      var adds = [];
      while (i < ops.length && ops[i].type !== 'same') {
        if (ops[i].type === 'del') dels.push(ops[i].value);
        else adds.push(ops[i].value);
        i++;
      }
      var k = Math.min(dels.length, adds.length);
      var x;
      for (x = 0; x < k; x++) out.push({ type: 'mod', old: dels[x], value: adds[x] });
      for (x = k; x < dels.length; x++) out.push({ type: 'del', value: dels[x] });
      for (x = k; x < adds.length; x++) out.push({ type: 'add', value: adds[x] });
    }
    return out;
  }

  // Numbers (including dotted ones like 1.2.0) stay whole so that a version
  // bump highlights the changed part instead of every digit separately.
  function tokenize(s) {
    return String(s).match(/\s+|\d+(?:\.\d+)*|[0-9A-Za-z_]+|[\s\S]/g) || [];
  }

  /** Word-level highlight for a changed line pair */
  function renderInline(oldText, newText) {
    if (oldText.length > 4000 || newText.length > 4000) return null;
    var a = tokenize(oldText);
    var b = tokenize(newText);
    if ((a.length + 1) * (b.length + 1) > INLINE_MAX_CELLS) return null;

    var res = lcsOps(a, b, INLINE_MAX_CELLS);
    var pairs = pairChanges(res.ops);
    var oldHtml = '';
    var newHtml = '';
    for (var i = 0; i < pairs.length; i++) {
      var o = pairs[i];
      if (o.type === 'same') {
        oldHtml += esc(o.value);
        newHtml += esc(o.value);
      } else if (o.type === 'del') {
        oldHtml += '<del>' + esc(o.value) + '</del>';
      } else if (o.type === 'add') {
        newHtml += '<ins>' + esc(o.value) + '</ins>';
      } else {
        oldHtml += '<del>' + esc(o.old) + '</del>';
        newHtml += '<ins>' + esc(o.value) + '</ins>';
      }
    }
    return { oldHtml: oldHtml, newHtml: newHtml };
  }

  function lineRow(cls, leftNo, rightNo, html) {
    return (
      '<div class="diff-line ' +
      cls +
      '"><span class="diff-num">' +
      (leftNo || '') +
      '</span><span class="diff-num">' +
      (rightNo || '') +
      '</span><span class="diff-text">' +
      html +
      '</span></div>'
    );
  }

  function statCard(num, key) {
    return '<div class="stat-card"><div class="num">' + num + '</div><div class="key">' + key + '</div></div>';
  }

  window.compare = function () {
    var leftRaw = rawLines(left.value);
    var rightRaw = rawLines(right.value);

    if (!leftRaw.length && !rightRaw.length) {
      say('Paste text into both boxes first.', 'error');
      diffView.style.display = 'none';
      diffLabel.style.display = 'none';
      stats.style.display = 'none';
      return;
    }

    var opts = { ignoreCase: !!(cbCase && cbCase.checked), ignoreSpace: !!(cbSpace && cbSpace.checked) };
    var a = normLines(leftRaw, opts);
    var b = normLines(rightRaw, opts);

    var res = lcsOps(a, b, MAX_CELLS);
    var rows = pairChanges(res.ops);

    var html = '';
    var plain = [];
    var oldNo = 0;
    var newNo = 0;
    var added = 0;
    var removed = 0;
    var changed = 0;
    var same = 0;

    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      if (r.type === 'same') {
        oldNo++;
        newNo++;
        same++;
        html += lineRow('same', oldNo, newNo, esc(r.value));
        plain.push('  ' + r.value);
      } else if (r.type === 'del') {
        oldNo++;
        removed++;
        html += lineRow('del', oldNo, '', esc(r.value));
        plain.push('- ' + r.value);
      } else if (r.type === 'add') {
        newNo++;
        added++;
        html += lineRow('add', '', newNo, esc(r.value));
        plain.push('+ ' + r.value);
      } else {
        oldNo++;
        newNo++;
        changed++;
        added++;
        removed++;
        var inl = cbInline && cbInline.checked ? renderInline(r.old, r.value) : null;
        html += lineRow('del', oldNo, '', inl ? inl.oldHtml : esc(r.old));
        html += lineRow('add', '', newNo, inl ? inl.newHtml : esc(r.value));
        plain.push('- ' + r.old);
        plain.push('+ ' + r.value);
      }
    }

    lastPlain = plain.join('\n');

    stats.innerHTML =
      statCard(added, 'lines added') +
      statCard(removed, 'lines removed') +
      statCard(changed, 'lines changed') +
      statCard(same, 'lines unchanged');
    stats.style.display = '';

    diffLabel.style.display = '';
    diffView.innerHTML = html;
    diffView.style.display = '';

    if (added === 0 && removed === 0) {
      say('No differences found. The two texts are identical under the current options.', 'success');
    } else if (res.truncated) {
      say(
        'Large input — showing a simplified diff for the changed region (added ' +
          added +
          ', removed ' +
          removed +
          ').',
        ''
      );
    } else {
      say('Compared ' + oldNo + ' and ' + newNo + ' lines.', 'success');
    }
  };

  window.swap = function () {
    var t = left.value;
    left.value = right.value;
    right.value = t;
    say('Sides swapped. Press Compare to see the diff from the other direction.', '');
  };

  window.loadSample = function () {
    left.value =
      '{\n  "name": "getoolkit",\n  "version": "1.2.0",\n  "cache": true,\n  "timeout": 30,\n  "features": ["json", "hash", "uuid"]\n}';
    right.value =
      '{\n  "name": "getoolkit",\n  "version": "1.3.0",\n  "cache": false,\n  "timeout": 60,\n  "features": ["json", "hash", "uuid", "diff"]\n}';
    compare();
  };

  window.copyDiff = function () {
    if (!lastPlain) {
      say('Nothing to copy yet — run a comparison first.', 'error');
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(lastPlain).then(
        function () {
          say('Diff copied to clipboard.', 'success');
        },
        function () {
          say('Clipboard blocked by the browser. Select the result and copy manually.', 'error');
        }
      );
    } else {
      say('Clipboard is not available in this browser.', 'error');
    }
  };

  window.clearAll = function () {
    left.value = '';
    right.value = '';
    lastPlain = '';
    diffView.innerHTML = '';
    diffView.style.display = 'none';
    diffLabel.style.display = 'none';
    stats.style.display = 'none';
    say('', '');
    left.focus();
  };
})();
