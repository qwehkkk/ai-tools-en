// UUID Generator - uses crypto.randomUUID() with fallback

function showMsg(text, type) {
  var el = document.getElementById('msg');
  el.textContent = text;
  el.className = 'msg ' + type;
  el.style.display = 'block';
}

function hideMsg() {
  document.getElementById('msg').style.display = 'none';
}

// RFC 4122 v4 UUID with crypto.getRandomValues fallback
function uuidv4() {
  // Prefer the native crypto.randomUUID() (modern browsers)
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  // Fallback: manual v4 using getRandomValues
  if (window.crypto && window.crypto.getRandomValues) {
    var bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    // Set version (4) and variant (10xx)
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    var hex = [];
    for (var i = 0; i < 16; i++) hex.push(bytes[i].toString(16).padStart(2, '0'));
    return (
      hex[0] + hex[1] + hex[2] + hex[3] + '-' +
      hex[4] + hex[5] + '-' +
      hex[6] + hex[7] + '-' +
      hex[8] + hex[9] + '-' +
      hex[10] + hex[11] + hex[12] + hex[13] + hex[14] + hex[15]
    );
  }
  // Last-resort fallback (not crypto-secure)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0;
    var v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function generateUUIDs() {
  var count = parseInt(document.getElementById('count').value, 10);
  if (!count || count < 1) {
    showMsg('Please enter a valid number (1-1000).', 'error');
    return;
  }
  if (count > 1000) {
    showMsg('Maximum is 1000 UUIDs at a time.', 'error');
    return;
  }
  var results = [];
  for (var i = 0; i < count; i++) {
    results.push(uuidv4());
  }
  var out = document.getElementById('output');
  out.textContent = results.join('\n');
  out.className = 'output';
  showMsg('Generated ' + count + ' UUID' + (count === 1 ? '' : 's') + '.', 'success');
}

function copyOutput() {
  var text = document.getElementById('output').textContent;
  if (!text) {
    showMsg('Nothing to copy. Generate first.', 'error');
    return;
  }
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function() {
      showMsg('Copied to clipboard.', 'success');
    }).catch(function() {
      showMsg('Copy failed. Please select and copy manually.', 'error');
    });
  } else {
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showMsg('Copied to clipboard.', 'success'); }
    catch (e) { showMsg('Copy failed.', 'error'); }
    document.body.removeChild(ta);
  }
}

function clearAll() {
  document.getElementById('output').textContent = '';
  document.getElementById('output').className = 'output';
  hideMsg();
}

// Allow Enter key on the count input to trigger generate
document.getElementById('count').addEventListener('keydown', function(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    generateUUIDs();
  }
});
