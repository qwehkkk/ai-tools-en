// JSON Formatter - pure vanilla JS, runs in browser

function showMsg(text, type) {
  var el = document.getElementById('msg');
  el.textContent = text;
  el.className = 'msg ' + type;
  el.style.display = 'block';
}

function hideMsg() {
  document.getElementById('msg').style.display = 'none';
}

function getOutput() {
  return document.getElementById('output');
}

function setOutput(text, className) {
  var out = getOutput();
  out.textContent = text;
  out.className = 'output' + (className ? ' ' + className : '');
}

function formatJSON() {
  var input = document.getElementById('input').value.trim();
  if (!input) {
    showMsg('Please paste some JSON first.', 'error');
    return;
  }
  try {
    var parsed = JSON.parse(input);
    var formatted = JSON.stringify(parsed, null, 2);
    setOutput(formatted);
    showMsg('JSON formatted successfully.', 'success');
  } catch (e) {
    setOutput('Error: ' + e.message, 'error');
    showMsg('Invalid JSON: ' + e.message, 'error');
  }
}

function minifyJSON() {
  var input = document.getElementById('input').value.trim();
  if (!input) {
    showMsg('Please paste some JSON first.', 'error');
    return;
  }
  try {
    var parsed = JSON.parse(input);
    var minified = JSON.stringify(parsed);
    setOutput(minified);
    showMsg('JSON minified successfully.', 'success');
  } catch (e) {
    setOutput('Error: ' + e.message, 'error');
    showMsg('Invalid JSON: ' + e.message, 'error');
  }
}

function validateJSON() {
  var input = document.getElementById('input').value.trim();
  if (!input) {
    showMsg('Please paste some JSON first.', 'error');
    return;
  }
  try {
    JSON.parse(input);
    setOutput('Valid JSON', 'success');
    showMsg('Your JSON is valid.', 'success');
  } catch (e) {
    setOutput('Invalid JSON: ' + e.message, 'error');
    showMsg('Invalid JSON: ' + e.message, 'error');
  }
}

function copyOutput() {
  var out = getOutput();
  var text = out.textContent;
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
    // Fallback for older browsers
    var ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showMsg('Copied to clipboard.', 'success');
    } catch (e) {
      showMsg('Copy failed. Please select and copy manually.', 'error');
    }
    document.body.removeChild(ta);
  }
}

function clearAll() {
  document.getElementById('input').value = '';
  setOutput('');
  hideMsg();
}
