// Base64 Converter - pure vanilla JS, handles UTF-8

function showMsg(text, type) {
  var el = document.getElementById('msg');
  el.textContent = text;
  el.className = 'msg ' + type;
  el.style.display = 'block';
}

function hideMsg() {
  document.getElementById('msg').style.display = 'none';
}

function setOutput(text, className) {
  var out = document.getElementById('output');
  out.textContent = text;
  out.className = 'output' + (className ? ' ' + className : '');
}

// UTF-8 safe Base64 encode
function encodeBase64() {
  var input = document.getElementById('input').value;
  if (!input) {
    showMsg('Please enter some text first.', 'error');
    return;
  }
  try {
    // Handle UTF-8 properly
    var utf8 = unescape(encodeURIComponent(input));
    var encoded = btoa(utf8);
    setOutput(encoded);
    showMsg('Encoded successfully.', 'success');
  } catch (e) {
    setOutput('Error: ' + e.message, 'error');
    showMsg('Encoding failed: ' + e.message, 'error');
  }
}

// UTF-8 safe Base64 decode
function decodeBase64() {
  var input = document.getElementById('input').value.trim();
  if (!input) {
    showMsg('Please enter some Base64 text first.', 'error');
    return;
  }
  try {
    var decoded = atob(input);
    var utf8 = decodeURIComponent(escape(decoded));
    setOutput(utf8);
    showMsg('Decoded successfully.', 'success');
  } catch (e) {
    setOutput('Error: Invalid Base64 input.', 'error');
    showMsg('Invalid Base64: ' + e.message, 'error');
  }
}

function copyOutput() {
  var text = document.getElementById('output').textContent;
  if (!text) {
    showMsg('Nothing to copy.', 'error');
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
  document.getElementById('input').value = '';
  setOutput('');
  hideMsg();
}
