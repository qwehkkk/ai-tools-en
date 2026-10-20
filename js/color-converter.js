(function () {
  var input = document.getElementById('color');
  var swatch = document.getElementById('swatch');
  var msg = document.getElementById('msg');
  var o = {
    hex: document.getElementById('o-hex'),
    rgb: document.getElementById('o-rgb'),
    hsl: document.getElementById('o-hsl'),
    css: document.getElementById('o-css')
  };

  function say(text, kind) {
    msg.textContent = text;
    msg.className = 'msg ' + (kind || '');
    msg.style.display = text ? 'block' : 'none';
  }

  function clamp(v, min, max) {
    return Math.min(max, Math.max(min, v));
  }

  function parseHex(s) {
    var m = s.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!m) return null;
    var h = m[1];
    if (h.length === 3) {
      h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    }
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16)
    };
  }

  function parseRgb(s) {
    var m = s.match(/^rgba?\(([^)]+)\)$/i);
    if (!m) return null;
    var parts = m[1].split(/[,\s\/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    var vals = parts.slice(0, 3).map(function (p) {
      var pct = p.indexOf('%') > -1;
      var n = parseFloat(p);
      if (isNaN(n)) return null;
      return Math.round(pct ? (n / 100) * 255 : n);
    });
    if (vals.some(function (v) { return v === null; })) return null;
    return { r: clamp(vals[0], 0, 255), g: clamp(vals[1], 0, 255), b: clamp(vals[2], 0, 255) };
  }

  function parseHsl(s) {
    var m = s.match(/^hsla?\(([^)]+)\)$/i);
    if (!m) return null;
    var parts = m[1].split(/[,\s\/]+/).filter(Boolean);
    if (parts.length < 3) return null;
    var h = parseFloat(parts[0]);
    var sat = parseFloat(parts[1]);
    var lig = parseFloat(parts[2]);
    if (isNaN(h) || isNaN(sat) || isNaN(lig)) return null;
    return hslToRgb(((h % 360) + 360) % 360, clamp(sat, 0, 100) / 100, clamp(lig, 0, 100) / 100);
  }

  // Ask the browser to resolve anything else it understands (named colors, etc.)
  function parseViaBrowser(s) {
    var probe = document.createElement('span');
    probe.style.color = '';
    probe.style.color = s;
    if (!probe.style.color) return null;
    document.body.appendChild(probe);
    var computed = getComputedStyle(probe).color;
    document.body.removeChild(probe);
    return parseRgb(computed);
  }

  function parseColor(raw) {
    var s = String(raw || '').trim().toLowerCase();
    if (!s) return null;
    return parseHex(s) || parseRgb(s) || parseHsl(s) || parseViaBrowser(s);
  }

  function hslToRgb(h, s, l) {
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var hp = h / 60;
    var x = c * (1 - Math.abs((hp % 2) - 1));
    var r = 0, g = 0, b = 0;
    if (hp < 1) { r = c; g = x; }
    else if (hp < 2) { r = x; g = c; }
    else if (hp < 3) { g = c; b = x; }
    else if (hp < 4) { g = x; b = c; }
    else if (hp < 5) { r = x; b = c; }
    else { r = c; b = x; }
    var m = l - c / 2;
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var d = max - min;
    var l = (max + min) / 2;
    var h = 0;
    var s = 0;
    if (d !== 0) {
      s = d / (1 - Math.abs(2 * l - 1));
      if (max === r) h = 60 * (((g - b) / d) % 6);
      else if (max === g) h = 60 * ((b - r) / d + 2);
      else h = 60 * ((r - g) / d + 4);
    }
    if (h < 0) h += 360;
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  }

  function toHex(n) {
    var s = n.toString(16);
    return s.length === 1 ? '0' + s : s;
  }

  function luminance(c) {
    var f = function (v) {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }

  function render(color, raw) {
    var hex = '#' + toHex(color.r) + toHex(color.g) + toHex(color.b);
    var hsl = rgbToHsl(color.r, color.g, color.b);

    o.hex.textContent = hex.toUpperCase();
    o.rgb.textContent = 'rgb(' + color.r + ', ' + color.g + ', ' + color.b + ')';
    o.hsl.textContent = 'hsl(' + hsl.h + ', ' + hsl.s + '%, ' + hsl.l + '%)';
    o.css.textContent = hex.toUpperCase();

    swatch.style.background = hex;
    swatch.style.color = luminance(color) > 0.5 ? '#0d1117' : '#ffffff';
    swatch.style.borderColor = 'transparent';
    swatch.textContent = hex.toUpperCase();

    say('', '');
    if (raw) say('Input interpreted as ' + raw + '.', '');
  }

  window.tryColor = function (value) {
    input.value = value;
    run();
  };

  function run() {
    var parsed = parseColor(input.value);
    if (!parsed) {
      say('Unrecognised color. Try #0969da, rgb(9, 105, 218) or hsl(212, 92%, 44%).', 'error');
      return;
    }
    var raw = input.value.trim().toLowerCase();
    var kind = parseHex(raw) ? 'HEX'
      : parseRgb(raw) ? 'RGB'
      : parseHsl(raw) ? 'HSL'
      : 'a CSS color name';
    render(parsed, kind);
  }

  window.copyText = function (id) {
    var el = document.getElementById(id);
    if (!el || el.textContent === '—') return;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(el.textContent).then(function () {
        say('Copied ' + el.textContent + '.', 'success');
      }, function () {});
    }
  };

  input.addEventListener('input', run);
  run();
})();
