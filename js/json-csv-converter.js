// JSON to CSV / CSV to JSON Converter - pure vanilla JS

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

// Flatten nested objects for CSV
function flatten(obj, prefix) {
  var result = {};
  prefix = prefix || '';
  for (var key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    var value = obj[key];
    var newKey = prefix ? prefix + '.' + key : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      var flat = flatten(value, newKey);
      for (var fk in flat) result[fk] = flat[fk];
    } else if (Array.isArray(value)) {
      result[newKey] = JSON.stringify(value);
    } else {
      result[newKey] = value;
    }
  }
  return result;
}

// Escape a CSV field
function csvEscape(value) {
  if (value === null || value === undefined) return '';
  var str = String(value);
  if (str.indexOf(',') !== -1 || str.indexOf('"') !== -1 || str.indexOf('\n') !== -1 || str.indexOf('\r') !== -1) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

function jsonToCsv() {
  var input = document.getElementById('input').value.trim();
  if (!input) {
    showMsg('Please paste JSON first.', 'error');
    return;
  }
  try {
    var data = JSON.parse(input);
    if (!Array.isArray(data)) {
      showMsg('JSON must be an array of objects.', 'error');
      return;
    }
    if (data.length === 0) {
      setOutput('');
      showMsg('Empty array, nothing to convert.', 'error');
      return;
    }
    // Flatten all objects and collect headers
    var flatData = data.map(function(item) { return flatten(item); });
    var headers = [];
    flatData.forEach(function(row) {
      for (var key in row) {
        if (headers.indexOf(key) === -1) headers.push(key);
      }
    });
    // Build CSV
    var lines = [headers.map(csvEscape).join(',')];
    flatData.forEach(function(row) {
      var line = headers.map(function(h) { return csvEscape(row[h]); });
      lines.push(line.join(','));
    });
    var csv = lines.join('\n');
    setOutput(csv);
    showMsg('Converted to CSV (' + data.length + ' rows, ' + headers.length + ' columns).', 'success');
  } catch (e) {
    setOutput('Error: ' + e.message, 'error');
    showMsg('Invalid JSON: ' + e.message, 'error');
  }
}

// Simple CSV parser (handles quoted fields)
function parseCsv(text) {
  var rows = [];
  var current = [];
  var field = '';
  var inQuotes = false;
  for (var i = 0; i < text.length; i++) {
    var ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ',') { current.push(field); field = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        current.push(field); field = '';
        rows.push(current); current = [];
      } else { field += ch; }
    }
  }
  if (field !== '' || current.length > 0) { current.push(field); rows.push(current); }
  return rows.filter(function(r) { return r.length > 1 || (r.length === 1 && r[0] !== ''); });
}

function csvToJson() {
  var input = document.getElementById('input').value.trim();
  if (!input) {
    showMsg('Please paste CSV first.', 'error');
    return;
  }
  try {
    var rows = parseCsv(input);
    if (rows.length < 2) {
      showMsg('CSV needs a header row and at least one data row.', 'error');
      return;
    }
    var headers = rows[0];
    var json = [];
    for (var i = 1; i < rows.length; i++) {
      var obj = {};
      for (var j = 0; j < headers.length; j++) {
        obj[headers[j]] = rows[i][j] !== undefined ? rows[i][j] : '';
      }
      json.push(obj);
    }
    setOutput(JSON.stringify(json, null, 2));
    showMsg('Converted to JSON (' + json.length + ' objects).', 'success');
  } catch (e) {
    setOutput('Error: ' + e.message, 'error');
    showMsg('Conversion failed: ' + e.message, 'error');
  }
}

function copyOutput() {
  var text = document.getElementById('output').textContent;
  if (!text) { showMsg('Nothing to copy.', 'error'); return; }
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(function() {
      showMsg('Copied to clipboard.', 'success');
    }).catch(function() { showMsg('Copy failed.', 'error'); });
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

function downloadResult() {
  var text = document.getElementById('output').textContent;
  if (!text) { showMsg('Nothing to download.', 'error'); return; }
  var isCsv = !text.trim().startsWith('[') && !text.trim().startsWith('{');
  var filename = isCsv ? 'converted.csv' : 'converted.json';
  var blob = new Blob([text], { type: 'text/plain' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showMsg('Downloaded as ' + filename + '.', 'success');
}

function clearAll() {
  document.getElementById('input').value = '';
  setOutput('');
  hideMsg();
}
