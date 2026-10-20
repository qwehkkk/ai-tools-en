(function () {
  var input = document.getElementById('expr');
  var msg = document.getElementById('msg');
  var result = document.getElementById('result');
  var descEl = document.getElementById('desc');
  var nextEl = document.getElementById('next');
  var fieldsEl = document.getElementById('fields');

  var MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
  var MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July',
    'August', 'September', 'October', 'November', 'December'];
  var DOW_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var DOW_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  function say(text, type) {
    if (!msg) return;
    msg.textContent = text;
    msg.className = 'msg ' + (type || '');
    msg.style.display = text ? 'block' : 'none';
  }

  /* ---------------------------------------------------------------- parsing */

  /**
   * Parse one cron field into { all, set, list, special, error }.
   * `set` is a plain object used as a hash so lookups stay O(1) even when the
   * next-run scan walks over a million minutes.
   */
  function parseField(raw, min, max, names, allowSpecial) {
    var s = String(raw == null ? '' : raw).trim().toUpperCase();
    if (!s) return { error: 'a field is empty' };

    if (names) {
      s = s.replace(/[A-Z]{3}/g, function (m) {
        var i = names.indexOf(m.toLowerCase());
        return i < 0 ? m : String(min + i);
      });
    }

    var out = { all: false, set: {}, list: [], special: null, error: null, min: min, max: max };
    var special = null;

    if (allowSpecial === 'dom') {
      if (s === 'L') special = { last: true };
      var ml = s.match(/^L-(\d{1,2})$/);
      if (ml) special = { lastOffset: parseInt(ml[1], 10) };
      var mw = s.match(/^(\d{1,2})W$/);
      if (mw) special = { nearestWeekday: parseInt(mw[1], 10) };
    } else if (allowSpecial === 'dow') {
      var mld = s.match(/^(\d)L$/);
      if (mld) special = { lastDow: parseInt(mld[1], 10) };
      var mn = s.match(/^(\d)#(\d)$/);
      if (mn) special = { nth: [parseInt(mn[1], 10), parseInt(mn[2], 10)] };
    }

    if (special) {
      out.special = special;
      out.all = false;
      if (allowSpecial === 'dow' && special.nth && (special.nth[1] < 1 || special.nth[1] > 5)) {
        out.error = 'the # operator only supports the 1st through 5th occurrence';
      }
      return out;
    }

    var parts = s.split(',');
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i].trim();
      if (part === '?' || part === '*') {
        // A bare * in one field of an otherwise plain expression means "any".
        // We keep going: a list like "*,5" is still just "any".
        out.all = true;
        continue;
      }
      // "*/5" is shorthand for "min-max/5".
      var star = part.match(/^\*\/(\d{1,4})$/);
      if (star) part = min + '-' + max + '/' + star[1];
      var m = part.match(/^(\d{1,4})(?:-(\d{1,4}))?(?:\/(\d{1,4}))?$/);
      if (!m) {
        out.error = 'could not understand "' + parts[i] + '"';
        return out;
      }
      var start = parseInt(m[1], 10);
      var end = m[2] === undefined ? (m[3] === undefined ? start : max) : parseInt(m[2], 10);
      var step = m[3] === undefined ? 1 : parseInt(m[3], 10);
      if (step < 1) {
        out.error = 'the step after / must be 1 or more';
        return out;
      }
      if (start < min || start > max || end < min || end > max) {
        out.error = 'values must be between ' + min + ' and ' + max;
        return out;
      }
      // Ranges may wrap around (FRI-MON = 5,6,0,1).
      var v = start;
      var guard = 0;
      while (true) {
        out.set[v] = true;
        if (v === end || guard++ > max) break;
        v = v + step;
        if (v > max) v = min + (v - max - 1);
        if (guard > max) break;
      }
    }

    for (var k in out.set) {
      if (Object.prototype.hasOwnProperty.call(out.set, k)) out.list.push(parseInt(k, 10));
    }
    out.list.sort(function (a, b) {
      return a - b;
    });
    if (out.list.length === max - min + 1) out.all = true;
    return out;
  }

  function checkField(label, f) {
    if (f && f.error) return label + ': ' + f.error;
    return null;
  }

  /**
   * Accept 5 fields (Unix: min hour dom mon dow), 6 fields (Quartz/Spring:
   * sec min hour dom mon dow) and 7 fields (Quartz with a year).
   */
  function parse(raw) {
    var parts = String(raw == null ? '' : raw).trim().split(/\s+/).filter(function (x) {
      return x.length > 0;
    });
    if (parts.length < 5 || parts.length > 7) {
      return { error: 'a cron expression needs 5, 6 or 7 fields — this one has ' + parts.length };
    }

    var hasSeconds = parts.length >= 6;
    var p = { hasSeconds: hasSeconds, raw: parts.slice() };

    if (hasSeconds) {
      p.sec = parseField(parts[0], 0, 59, null, null);
      p.min = parseField(parts[1], 0, 59, null, null);
      p.hour = parseField(parts[2], 0, 23, null, null);
      p.dom = parseField(parts[3], 1, 31, null, 'dom');
      p.mon = parseField(parts[4], 1, 12, MONTHS, null);
      p.dow = parseField(parts[5], 0, 7, ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'], 'dow');
      p.year = parts.length === 7 ? parseField(parts[6], 1970, 2099, null, null) : null;
    } else {
      p.min = parseField(parts[0], 0, 59, null, null);
      p.hour = parseField(parts[1], 0, 23, null, null);
      p.dom = parseField(parts[2], 1, 31, null, 'dom');
      p.mon = parseField(parts[3], 1, 12, MONTHS, null);
      p.dow = parseField(parts[4], 0, 7, ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'], 'dow');
    }

    var err =
      checkField('Second', p.sec) ||
      checkField('Minute', p.min) ||
      checkField('Hour', p.hour) ||
      checkField('Day of month', p.dom) ||
      checkField('Month', p.mon) ||
      checkField('Day of week', p.dow) ||
      checkField('Year', p.year);
    if (err) return { error: err };

    // Normalise Sunday: 7 and 0 mean the same thing.
    if (p.dow.set[7]) p.dow.set[0] = true;
    p.dow.list = [];
    for (var k in p.dow.set) {
      if (Object.prototype.hasOwnProperty.call(p.dow.set, k)) p.dow.list.push(parseInt(k, 10));
    }
    p.dow.list.sort(function (a, b) {
      return a - b;
    });
    if (p.dow.list.length === 8) p.dow.all = true;

    return p;
  }

  /* ------------------------------------------------------------- describing */

  function compress(list) {
    if (!list.length) return '';
    var out = [];
    var start = list[0];
    var prev = list[0];
    for (var i = 1; i <= list.length; i++) {
      var v = list[i];
      if (v !== prev + 1) {
        out.push(start === prev ? String(start) : start + '-' + prev);
        start = v;
      }
      prev = v;
    }
    return out.join(', ');
  }

  /**
   * Detect a field that steps evenly across its whole range, so a "every N"
   * field reads as "every 5 minutes" instead of listing twelve numbers.
   * Returns the step, or null when the values are not a clean sweep from the
   * lowest to the highest.
   */
  function uniformStep(f) {
    if (!f || f.all || f.special || f.list.length < 2) return null;
    var step = f.list[1] - f.list[0];
    if (step < 1) return null;
    for (var i = 1; i < f.list.length; i++) {
      if (f.list[i] - f.list[i - 1] !== step) return null;
    }
    if (f.list[0] !== f.min) return null;
    if (f.list[f.list.length - 1] + step <= f.max) return null;
    return step;
  }

  function pad(n, w) {
    var s = String(n);
    while (s.length < w) s = '0' + s;
    return s;
  }

  function named(list, full) {
    return list
      .map(function (v) {
        return full[v];
      })
      .join(', ');
  }

  /** Build a plain-English sentence for the whole expression. */
  function humanize(p) {
    var minAll = p.min.all;
    var hourAll = p.hour.all;
    var secAll = !p.sec || p.sec.all;

    var minStep = uniformStep(p.min);
    var hourStep = uniformStep(p.hour);
    var minOne = !p.min.all && !p.min.special && p.min.list.length === 1;

    // ---- time of day ----
    var time;
    if (minAll && hourAll && secAll) {
      time = 'Every minute';
    } else if (minStep && hourAll && secAll) {
      time = minStep === 1 ? 'Every minute' : 'Every ' + minStep + ' minutes';
    } else if (minStep) {
      time = 'Every ' + minStep + ' minutes past hour ' + compress(p.hour.list);
      if (!secAll) time += ', at second ' + compress(p.sec.list);
    } else if (minOne && hourStep) {
      time =
        'Every ' +
        hourStep +
        (hourStep === 1 ? ' hour' : ' hours') +
        ' at minute ' +
        p.min.list[0];
      if (!secAll) time += ', at second ' + compress(p.sec.list);
    } else if (minAll && hourAll) {
      time = 'Every minute, at second ' + compress(p.sec.list);
    } else if (minAll) {
      time = 'Every minute past hour ' + compress(p.hour.list);
    } else if (hourAll) {
      time = 'At minute ' + compress(p.min.list) + ' of every hour';
      if (!secAll) time += ', at second ' + compress(p.sec.list);
    } else {
      var combos = [];
      for (var i = 0; i < p.hour.list.length && combos.length < 24; i++) {
        for (var j = 0; j < p.min.list.length && combos.length < 24; j++) {
          combos.push(pad(p.hour.list[i], 2) + ':' + pad(p.min.list[j], 2));
        }
      }
      if (combos.length <= 12) {
        time = 'At ' + combos.join(', ');
        if (!secAll) time += ' and ' + compress(p.sec.list) + ' seconds';
      } else {
        time = 'At minute ' + compress(p.min.list) + ' past hour ' + compress(p.hour.list);
        if (!secAll) time += ', at second ' + compress(p.sec.list);
      }
    }

    // ---- which days ----
    var domRestricted = !p.dom.all || !!p.dom.special;
    var dowRestricted = !p.dow.all || !!p.dow.special;
    var monRestricted = !p.mon.all;

    var dowPart = '';
    var domPart = '';

    if (dowRestricted) {
      if (p.dow.special) {
        if (p.dow.special.lastDow != null) {
          dowPart = 'the last ' + DOW_FULL[p.dow.special.lastDow] + ' of the month';
        } else {
          dowPart =
            'the ' + ordinal(p.dow.special.nth[1]) + ' ' + DOW_FULL[p.dow.special.nth[0]] + ' of the month';
        }
      } else {
        dowPart = named(p.dow.list.filter(function (v) {
          return v < 7;
        }), DOW_FULL);
      }
    }

    if (domRestricted) {
      if (p.dom.special) {
        if (p.dom.special.last) domPart = 'the last day of the month';
        else if (p.dom.special.lastOffset != null)
          domPart = 'the ' + ordinal(p.dom.special.lastOffset) + '-to-last day of the month';
        else domPart = 'the weekday nearest day ' + p.dom.special.nearestWeekday + ' of the month';
      } else {
        domPart = 'day ' + compress(p.dom.list) + ' of the month';
      }
    }

    var bits = [time];
    if (domRestricted && dowRestricted) bits.push('on ' + domPart + ' or on ' + dowPart);
    else if (domRestricted) bits.push('on ' + domPart);
    else if (dowRestricted) bits.push('on ' + dowPart);

    if (monRestricted) bits.push('in ' + named(p.mon.list.map(function (v) {
      return v - 1;
    }), MONTHS_FULL));
    if (p.year && !p.year.all) bits.push('only in ' + compress(p.year.list));

    return bits.join(', ') + '.';
  }

  function ordinal(n) {
    var s = ['th', 'st', 'nd', 'rd'];
    var v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  }

  /* ------------------------------------------------------------- scheduling */

  function matchField(f, v, ctx) {
    if (!f) return true;
    if (f.all) return true;
    if (f.special) {
      var sp = f.special;
      if (sp.last) return v === ctx.lastDay;
      if (sp.lastOffset != null) return v === ctx.lastDay - sp.lastOffset;
      if (sp.nearestWeekday != null) return v === nearestWeekday(ctx, sp.nearestWeekday);
      if (sp.lastDow != null) return ctx.dow === sp.lastDow && v > ctx.lastDay - 7;
      if (sp.nth) {
        return (
          ctx.dow === sp.nth[0] && v >= (sp.nth[1] - 1) * 7 + 1 && v <= sp.nth[1] * 7
        );
      }
      return false;
    }
    return f.set[v] === true;
  }

  function nearestWeekday(ctx, want) {
    var target = Math.min(want, ctx.lastDay);
    var d = new Date(ctx.year, ctx.month - 1, target);
    var w = d.getDay();
    if (w === 6 && target - 1 >= 1) target -= 1;
    else if (w === 0 && target + 1 <= ctx.lastDay) target += 1;
    return target;
  }

  function matches(p, d) {
    var ctx = {
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      date: d.getDate(),
      dow: d.getDay(),
      lastDay: new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    };
    if (!matchField(p.min, d.getMinutes(), ctx)) return false;
    if (!matchField(p.hour, d.getHours(), ctx)) return false;
    if (!matchField(p.mon, ctx.month, ctx)) return false;
    if (p.year && !matchField(p.year, ctx.year, ctx)) return false;

    var domR = !p.dom.all || !!p.dom.special;
    var dowR = !p.dow.all || !!p.dow.special;
    var domOk = matchField(p.dom, ctx.date, ctx);
    var dowOk = matchField(p.dow, ctx.dow, ctx);

    // Vixie behaviour: when both day fields are restricted they are OR'ed.
    if (domR && dowR) return domOk || dowOk;
    if (domR) return domOk;
    if (dowR) return dowOk;
    return true;
  }

  function fmt(d) {
    return (
      d.getFullYear() +
      '-' +
      pad(d.getMonth() + 1, 2) +
      '-' +
      pad(d.getDate(), 2) +
      ' ' +
      pad(d.getHours(), 2) +
      ':' +
      pad(d.getMinutes(), 2) +
      ':' +
      pad(d.getSeconds(), 2) +
      '  ' +
      DOW_SHORT[d.getDay()]
    );
  }

  /**
   * Walk forward minute by minute, then pick seconds inside a matching minute.
   * Bounded at two years so a sparse expression such as "0 0 29 2 *" still
   * terminates instead of hanging the tab.
   */
  function nextRuns(p, start, count) {
    var out = [];
    var d = new Date(start.getTime());
    var limit = 366 * 24 * 60 * 2;
    var scanned = 0;

    while (out.length < count && scanned < limit) {
      if (matches(p, d)) {
        if (!p.sec || p.sec.all) {
          var cand = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), 0);
          if (cand.getTime() >= start.getTime()) out.push(cand);
        } else {
          var fromMin = 0;
          if (
            d.getFullYear() === start.getFullYear() &&
            d.getMonth() === start.getMonth() &&
            d.getDate() === start.getDate() &&
            d.getHours() === start.getHours() &&
            d.getMinutes() === start.getMinutes()
          ) {
            fromMin = start.getSeconds();
          }
          for (var s = fromMin; s <= 59; s++) {
            if (p.sec.set[s]) {
              var c2 = new Date(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes(), s);
              if (c2.getTime() >= start.getTime()) {
                out.push(c2);
                break;
              }
            }
          }
        }
      }
      d.setSeconds(0, 0);
      d.setMinutes(d.getMinutes() + 1);
      scanned++;
    }

    return { runs: out.slice(0, count), exhausted: out.length < count };
  }

  /* ------------------------------------------------------------------- view */

  function fieldRow(label, raw, f) {
    var value;
    if (f.special) {
      if (f.special.last) value = 'last day of the month';
      else if (f.special.lastOffset != null) value = 'the ' + ordinal(f.special.lastOffset) + '-to-last day';
      else if (f.special.nearestWeekday != null) value = 'weekday nearest the ' + ordinal(f.special.nearestWeekday);
      else if (f.special.lastDow != null) value = 'last ' + DOW_FULL[f.special.lastDow] + ' of the month';
      else value = ordinal(f.special.nth[1]) + ' ' + DOW_FULL[f.special.nth[0]] + ' of the month';
    } else if (f.all) {
      value = 'every value';
    } else {
      value = compress(f.list);
    }
    return (
      '<div class="result-row"><span class="label">' +
      label +
      '</span><span class="value"><code>' +
      escapeHtml(raw) +
      '</code> &rarr; ' +
      escapeHtml(value) +
      '</span></div>'
    );
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  window.explain = function () {
    var raw = input.value;
    if (!String(raw).trim()) {
      say('Type a cron expression first.', 'error');
      if (result) result.style.display = 'none';
      return;
    }

    var p = parse(raw);
    if (p.error) {
      say(p.error + '.', 'error');
      if (result) result.style.display = 'none';
      return;
    }

    descEl.textContent = humanize(p);

    var res = nextRuns(p, new Date(), 5);
    if (!res.runs.length) {
      nextEl.textContent = 'No matching run time found in the next two years.';
      nextEl.className = 'output error';
    } else {
      nextEl.className = 'output';
      nextEl.innerHTML = res.runs
        .map(function (d) {
          return '<div class="cron-run">' + fmt(d) + '</div>';
        })
        .join('');
    }

    var rows = '';
    if (p.hasSeconds) rows += fieldRow('Second', p.raw[0], p.sec);
    rows += fieldRow('Minute', p.raw[p.hasSeconds ? 1 : 0], p.min);
    rows += fieldRow('Hour', p.raw[p.hasSeconds ? 2 : 1], p.hour);
    rows += fieldRow('Day of month', p.raw[p.hasSeconds ? 3 : 2], p.dom);
    rows += fieldRow('Month', p.raw[p.hasSeconds ? 4 : 3], p.mon);
    rows += fieldRow('Day of week', p.raw[p.hasSeconds ? 5 : 4], p.dow);
    if (p.year) rows += fieldRow('Year', p.raw[6], p.year);
    fieldsEl.innerHTML = rows;

    if (result) result.style.display = '';
    say(
      (p.hasSeconds ? 'Read as 6 fields (second first, Quartz / Spring style).' : 'Read as 5 fields (standard Unix).') +
        ' Times use your device time zone.',
      'success'
    );
  };

  window.loadSample = function () {
    input.value = '*/15 9-17 * * 1-5';
    window.explain();
  };

  window.clearAll = function () {
    input.value = '';
    if (result) result.style.display = 'none';
    say('', '');
    input.focus();
  };

  if (input) {
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') window.explain();
    });
  }

  // Exposed so the Node test harness can drive the parser directly.
  window.__cron = {
    parse: parse,
    humanize: humanize,
    nextRuns: nextRuns,
    matches: matches
  };
})();
