// Image Compressor - uses Canvas API, runs entirely in browser

var originalImage = null;
var compressedDataUrl = null;
var originalSize = 0;

document.getElementById('fileInput').addEventListener('change', function(e) {
  var file = e.target.files[0];
  if (!file) return;
  originalSize = file.size;
  var reader = new FileReader();
  reader.onload = function(ev) {
    var img = new Image();
    img.onload = function() {
      originalImage = img;
      document.getElementById('fileInfo').textContent =
        'Original: ' + file.name + ' | ' + (file.size / 1024).toFixed(1) + ' KB | ' + img.width + 'x' + img.height;
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
});

function showMsg(text, type) {
  var el = document.getElementById('msg');
  el.textContent = text;
  el.className = 'msg ' + type;
  el.style.display = 'block';
}

function hideMsg() {
  document.getElementById('msg').style.display = 'none';
}

function compressImage() {
  if (!originalImage) {
    showMsg('Please choose an image first.', 'error');
    return;
  }
  var quality = parseInt(document.getElementById('quality').value) / 100;
  var maxWidth = parseInt(document.getElementById('maxWidth').value) || 0;
  var format = document.getElementById('format').value;

  var canvas = document.createElement('canvas');
  var ctx = canvas.getContext('2d');

  var width = originalImage.width;
  var height = originalImage.height;

  if (maxWidth > 0 && width > maxWidth) {
    height = Math.round(height * (maxWidth / width));
    width = maxWidth;
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(originalImage, 0, 0, width, height);

  // PNG ignores quality parameter, so set high
  var q = format === 'image/png' ? undefined : quality;
  compressedDataUrl = canvas.toDataURL(format, q);

  // Display preview
  var container = document.getElementById('previewContainer');
  container.innerHTML = '';
  container.style.padding = '0';
  var imgEl = document.createElement('img');
  imgEl.src = compressedDataUrl;
  imgEl.style.maxWidth = '100%';
  imgEl.style.height = 'auto';
  imgEl.style.borderRadius = 'var(--radius)';
  container.appendChild(imgEl);

  // Calculate compressed size
  var base64 = compressedDataUrl.split(',')[1];
  var compressedBytes = Math.round(base64.length * 3 / 4);
  var compressedKB = (compressedBytes / 1024).toFixed(1);
  var originalKB = (originalSize / 1024).toFixed(1);
  var reduction = ((1 - compressedBytes / originalSize) * 100).toFixed(0);

  showMsg('Compressed: ' + originalKB + ' KB → ' + compressedKB + ' KB (reduced ' + reduction + '%).', 'success');
}

function downloadCompressed() {
  if (!compressedDataUrl) {
    showMsg('Please compress an image first.', 'error');
    return;
  }
  var format = document.getElementById('format').value;
  var ext = format === 'image/jpeg' ? 'jpg' : (format === 'image/png' ? 'png' : 'webp');
  var a = document.createElement('a');
  a.href = compressedDataUrl;
  a.download = 'compressed-' + Date.now() + '.' + ext;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  showMsg('Image downloaded.', 'success');
}
