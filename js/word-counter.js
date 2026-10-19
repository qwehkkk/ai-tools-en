// Word & Character Counter - real-time stats as you type

function countWords(text) {
  var trimmed = text.trim();
  if (!trimmed) return 0;
  // Split on any whitespace, filter empty
  return trimmed.split(/\s+/).length;
}

function countSentences(text) {
  if (!text.trim()) return 0;
  // Split on . ! ? followed by space or end, filter empty
  var matches = text.match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g);
  return matches ? matches.length : 0;
}

function countParagraphs(text) {
  if (!text.trim()) return 0;
  // Split on two or more newlines; fallback to single newline
  var paras = text.split(/\n{2,}/);
  var count = 0;
  for (var i = 0; i < paras.length; i++) {
    if (paras[i].trim()) count++;
  }
  return count;
}

function formatReadingTime(seconds) {
  if (seconds < 60) return seconds + 's';
  var mins = Math.floor(seconds / 60);
  var secs = seconds % 60;
  if (mins < 60) return secs > 0 ? mins + 'm ' + secs + 's' : mins + 'm';
  var hrs = Math.floor(mins / 60);
  var remMins = mins % 60;
  return remMins > 0 ? hrs + 'h ' + remMins + 'm' : hrs + 'h';
}

function updateStats() {
  var text = document.getElementById('input').value;
  var words = countWords(text);
  var chars = text.length;
  var charsNoSpace = text.replace(/\s/g, '').length;
  var sentences = countSentences(text);
  var paragraphs = countParagraphs(text);
  var readingSeconds = Math.ceil((words / 200) * 60);

  document.getElementById('stat-words').textContent = words.toLocaleString();
  document.getElementById('stat-chars').textContent = chars.toLocaleString();
  document.getElementById('stat-chars-nospace').textContent = charsNoSpace.toLocaleString();
  document.getElementById('stat-sentences').textContent = sentences.toLocaleString();
  document.getElementById('stat-paragraphs').textContent = paragraphs.toLocaleString();
  document.getElementById('stat-reading').textContent = formatReadingTime(readingSeconds);
}

function copyStats() {
  var text = document.getElementById('input').value;
  if (!text.trim()) return;
  var words = countWords(text);
  var chars = text.length;
  var charsNoSpace = text.replace(/\s/g, '').length;
  var sentences = countSentences(text);
  var paragraphs = countParagraphs(text);
  var readingSeconds = Math.ceil((words / 200) * 60);

  var summary =
    'Words: ' + words + '\n' +
    'Characters: ' + chars + '\n' +
    'Characters (no spaces): ' + charsNoSpace + '\n' +
    'Sentences: ' + sentences + '\n' +
    'Paragraphs: ' + paragraphs + '\n' +
    'Reading time: ' + formatReadingTime(readingSeconds);

  if (navigator.clipboard) {
    navigator.clipboard.writeText(summary).then(function() {
      flashButton('Copied!');
    }).catch(function() {
      flashButton('Copy failed');
    });
  } else {
    var ta = document.createElement('textarea');
    ta.value = summary;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); flashButton('Copied!'); }
    catch (e) { flashButton('Copy failed'); }
    document.body.removeChild(ta);
  }
}

function flashButton(msg) {
  var btn = event.target;
  var original = btn.textContent;
  btn.textContent = msg;
  setTimeout(function() { btn.textContent = original; }, 1500);
}

function clearAll() {
  document.getElementById('input').value = '';
  updateStats();
}

// Real-time counting
document.getElementById('input').addEventListener('input', updateStats);

// Initial render
updateStats();
