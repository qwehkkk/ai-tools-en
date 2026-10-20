(function () {
  var textEl = document.getElementById('qrText');
  var levelEl = document.getElementById('qrLevel');
  var sizeEl = document.getElementById('qrSize');
  var fgEl = document.getElementById('qrFg');
  var bgEl = document.getElementById('qrBg');
  var canvas = document.getElementById('qrCanvas');
  var preview = document.getElementById('preview');
  var meta = document.getElementById('qrMeta');
  var msg = document.getElementById('msg');

  var MARGIN = 4; // quiet zone, in modules — scanners need this to find the code
  var current = null;
  var timer = null;

  function say(text, type) {
    if (!msg) return;
    msg.textContent = text;
    msg.className = 'msg ' + (type || '');
    msg.style.display = text ? 'block' : 'none';
  }

  function level() {
    return parseInt(levelEl.value, 10) || 0;
  }

  function draw(res, targetPx) {
    var total = res.size + MARGIN * 2;
    var scale = Math.max(1, Math.floor((targetPx || 320) / total));
    var px = total * scale;
    var cv = document.createElement('canvas');
    cv.width = px;
    cv.height = px;
    var ctx = cv.getContext('2d');
    ctx.fillStyle = bgEl.value || '#ffffff';
    ctx.fillRect(0, 0, px, px);
    ctx.fillStyle = fgEl.value || '#000000';
    for (var r = 0; r < res.size; r++) {
      for (var c = 0; c < res.size; c++) {
        if (res.modules[r][c]) ctx.fillRect((c + MARGIN) * scale, (r + MARGIN) * scale, scale, scale);
      }
    }
    return cv;
  }

  /** Relative luminance, so we can warn when the colours are inverted. */
  function luminance(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return 0;
    var v = parseInt(m[1], 16);
    var r = (v >> 16) & 255;
    var g = (v >> 8) & 255;
    var b = v & 255;
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function render() {
    var text = textEl.value.replace(/^\s+|\s+$/g, '');
    if (!text) {
      preview.style.display = 'none';
      current = null;
      say('', '');
      return;
    }

    var res = QR.encode(text, level());
    if (res.error) {
      preview.style.display = 'none';
      current = null;
      say(res.error, 'error');
      return;
    }
    current = res;

    var drawn = draw(res, 300);
    canvas.width = drawn.width;
    canvas.height = drawn.height;
    canvas.getContext('2d').drawImage(drawn, 0, 0);
    preview.style.display = '';

    meta.textContent =
      'Version ' +
      res.version +
      ' \u00b7 ' +
      res.size +
      '\u00d7' +
      res.size +
      ' modules \u00b7 level ' +
      res.level +
      ' \u00b7 ' +
      res.bytes +
      ' bytes';

    if (luminance(fgEl.value) >= luminance(bgEl.value)) {
      say('Foreground is not darker than the background — most phone cameras will fail to read this. Swap the two colours.', 'error');
    } else {
      say('', '');
    }
  }

  function schedule() {
    if (timer) clearTimeout(timer);
    timer = setTimeout(render, 200);
  }

  function download(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 2000);
  }

  window.downloadPng = function () {
    if (!current) {
      say('Type something to encode first.', 'error');
      return;
    }
    var px = parseInt(sizeEl.value, 10) || 512;
    var cv = draw(current, px);
    if (!cv.toBlob) {
      say('This browser cannot export the image. Try downloading the SVG instead.', 'error');
      return;
    }
    cv.toBlob(function (blob) {
      if (!blob) {
        say('Export failed. Try the SVG option instead.', 'error');
        return;
      }
      download(blob, 'qr-code-' + current.size + 'px.png');
      say('PNG saved.', 'success');
    }, 'image/png');
  };

  window.downloadSvg = function () {
    if (!current) {
      say('Type something to encode first.', 'error');
      return;
    }
    var total = current.size + MARGIN * 2;
    var d = '';
    for (var r = 0; r < current.size; r++) {
      for (var c = 0; c < current.size; c++) {
        if (current.modules[r][c]) d += 'M' + (c + MARGIN) + ' ' + (r + MARGIN) + 'h1v1h-1z';
      }
    }
    var scale = Math.max(1, Math.round(512 / total));
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' +
      total * scale +
      '" height="' +
      total * scale +
      '" viewBox="0 0 ' +
      total +
      ' ' +
      total +
      '" shape-rendering="crispEdges">' +
      '<rect width="' +
      total +
      '" height="' +
      total +
      '" fill="' +
      (bgEl.value || '#ffffff') +
      '"/>' +
      '<path d="' +
      d +
      '" fill="' +
      (fgEl.value || '#000000') +
      '"/></svg>';

    download(new Blob([svg], { type: 'image/svg+xml' }), 'qr-code.svg');
    say('SVG saved.', 'success');
  };

  window.loadSample = function () {
    textEl.value = 'https://getoolkit.com';
    render();
  };

  window.clearAll = function () {
    textEl.value = '';
    current = null;
    preview.style.display = 'none';
    say('', '');
    textEl.focus();
  };

  if (textEl) {
    textEl.addEventListener('input', schedule);
    textEl.addEventListener('keyup', schedule);
  }
  if (levelEl) levelEl.addEventListener('change', render);
  if (fgEl) fgEl.addEventListener('input', render);
  if (bgEl) bgEl.addEventListener('input', render);

  // Exposed for the Node test harness.
  window.__qrUi = { draw: draw, luminance: luminance, render: render };
})();
