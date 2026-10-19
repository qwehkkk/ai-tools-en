// URL Encoder & Decoder - pure vanilla JS, UTF-8 safe

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

function encodeURL() {
  var input = document.getElementById('input').value;
  if (!input) {
    showMsg('Please enter some text first.', 'error');
    return;
  }
  try {
    var encoded = encodeURIComponent(input);
    setOutput(encoded);
    showMsg('Encoded successfully.', 'success');
  } catch (e) {
    setOutput('Error: ' + e.message, 'error');
    showMsg('Encoding failed: ' + e.message, 'error');
  }
}

function decodeURL() {
  var input = document.getElementById('input').value.trim();
  if (!input) {
    showMsg('Please enter some URL-encoded text first.', 'error');
    return;
  }
  try {
    var decoded = decodeURIComponent(input);
    setOutput(decoded);
    showMsg('Decoded successfully.', 'success');
  } catch (e) {
    setOutput('Error: Invalid URL-encoded input.', 'error');
    showMsg('Invalid URL encoding: ' + e.message, 'error');
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
