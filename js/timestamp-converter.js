(function () {
  var nowSec = document.getElementById('nowSec');
  var nowMs = document.getElementById('nowMs');
  var tsInput = document.getElementById('ts');
  var dateInput = document.getElementById('dateStr');
  var msg1 = document.getElementById('msg1');
  var msg2 = document.getElementById('msg2');

  var OUT = {
    utc: document.getElementById('r-utc'),
    local: document.getElementById('r-local'),
    iso: document.getElementById('r-iso'),
    day: document.getElementById('r-day'),
    rel: document.getElementById('r-rel'),
    ms: document.getElementById('r-ms')
  };

  var REV = {
    sec: document.getElementById('d-sec'),
    ms: document.getElementById('d-ms'),
    iso: document.getElementById('d-iso'),
    utc: document.getElementById('d-utc')
  };

  function say(el, text, kind) {
    if (!el) return;
    el.textContent = text;
    el.className = 'msg ' + (kind || '');
    el.style.display = text ? 'block' : 'none';
  }

  function tick() {
    var d = new Date();
    nowSec.textContent = Math.floor(d.getTime() / 1000);
    nowMs.textContent = d.getTime();
  }

  function relative(d) {
    var diff = Math.round((d.getTime() - Date.now()) / 1000);
    var abs = Math.abs(diff);
    var units = [
      [31536000, 'year'],
      [2592000, 'month'],
      [86400, 'day'],
      [3600, 'hour'],
      [60, 'minute'],
      [1, 'second']
    ];
    if (abs < 5) return 'just now';
    for (var i = 0; i < units.length; i++) {
      var size = units[i][0];
      if (abs >= size) {
        var n = Math.floor(abs / size);
        var label = n + ' ' + units[i][1] + (n === 1 ? '' : 's');
        return diff > 0 ? 'in ' + label : label + ' ago';
      }
    }
    return 'just now';
  }

  function fillForward(d) {
    OUT.utc.textContent = d.toUTCString();
    OUT.local.textContent = d.toLocaleString(undefined, {
      dateStyle: 'full',
      timeStyle: 'medium'
    });
    OUT.iso.textContent = d.toISOString();
    OUT.day.textContent = d.toLocaleDateString('en-US', { weekday: 'long' });
    OUT.rel.textContent = relative(d);
    OUT.ms.textContent = d.getTime();
  }

  window.convertTs = function () {
    var raw = tsInput.value.trim().replace(/[\s,]/g, '');
    if (!raw) {
      say(msg1, 'Enter a timestamp first.', 'error');
      return;
    }
    if (!/^-?\d+$/.test(raw)) {
      say(msg1, 'Timestamps contain digits only. Remove any letters or symbols.', 'error');
      return;
    }
    var n = Number(raw);
    if (!isFinite(n)) {
      say(msg1, 'That number is too large to convert.', 'error');
      return;
    }
    // 13+ digits means milliseconds; anything shorter is treated as seconds
    var ms = raw.replace('-', '').length >= 13 ? n : n * 1000;
    var d = new Date(ms);
    if (isNaN(d.getTime())) {
      say(msg1, 'That timestamp is out of range.', 'error');
      return;
    }
    fillForward(d);
    say(msg1, 'Converted ' + (ms === n ? 'milliseconds' : 'seconds') + '.', 'success');
  };

  window.useNow = function () {
    tsInput.value = String(Math.floor(Date.now() / 1000));
    window.convertTs();
  };

  window.convertDate = function () {
    var raw = dateInput.value.trim();
    if (!raw) {
      say(msg2, 'Enter a date first.', 'error');
      return;
    }
    var d;
    if (/^\d+$/.test(raw)) {
      var n = Number(raw);
      d = new Date(raw.length >= 13 ? n : n * 1000);
    } else {
      d = new Date(raw);
    }
    if (isNaN(d.getTime())) {
      say(msg2, 'Could not parse that date. Try 2026-10-20 or 2026-10-20T10:00:00Z.', 'error');
      return;
    }
    REV.sec.textContent = Math.floor(d.getTime() / 1000);
    REV.ms.textContent = d.getTime();
    REV.iso.textContent = d.toISOString();
    REV.utc.textContent = d.toUTCString();
    say(msg2, '', '');
  };

  window.useNowDate = function () {
    var d = new Date();
    var pad = function (n) { return String(n).padStart(2, '0'); };
    dateInput.value = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    window.convertDate();
  };

  window.copyText = function (id) {
    var el = document.getElementById(id);
    if (!el || el.textContent === '—') return;
    var text = el.textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
    }
  };

  // Enter key converts in the matching box
  tsInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') window.convertTs();
  });
  dateInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') window.convertDate();
  });

  tick();
  setInterval(tick, 1000);

  // Pre-fill with the current time so the page shows real output on load
  tsInput.value = String(Math.floor(Date.now() / 1000));
  window.convertTs();
  window.useNowDate();
})();
