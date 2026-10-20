(function () {
  var typeEl = document.getElementById('type');
  var countEl = document.getElementById('count');
  var classicEl = document.getElementById('startClassic');
  var output = document.getElementById('output');
  var msg = document.getElementById('msg');

  var WORDS = ('lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore ' +
    'et dolore magna aliqua enim ad minim veniam quis nostrud exercitation ullamco laboris nisi aliquip ex ea ' +
    'commodo consequat duis aute irure in reprehenderit voluptate velit esse cillum eu fugiat nulla pariatur ' +
    'excepteur sint occaecat cupidatat non proident sunt culpa qui officia deserunt mollit anim id est laborum ' +
    'curabitur pretium tincidunt lacus nulla gravida orci a odio vestibulum eleifend diam nonummy nibh euismod ' +
    'tincidunt ut laoreet dolore magna aliquam erat volutpat wisi enim ad minim veniam quis nostrud').split(' ');

  var CLASSIC = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';

  function say(text, kind) {
    if (!msg) return;
    msg.textContent = text;
    msg.className = 'msg ' + (kind || '');
    msg.style.display = text ? 'block' : 'none';
  }

  function rand(n) {
    return Math.floor(Math.random() * n);
  }

  function pick() {
    return WORDS[rand(WORDS.length)];
  }

  function sentence() {
    var len = 6 + rand(9); // 6-14 words
    var parts = [];
    for (var i = 0; i < len; i++) parts.push(pick());
    var s = parts.join(' ');
    return s.charAt(0).toUpperCase() + s.slice(1) + '.';
  }

  function paragraph() {
    var count = 3 + rand(4); // 3-6 sentences
    var out = [];
    for (var i = 0; i < count; i++) out.push(sentence());
    return out.join(' ');
  }

  function clamp(n, min, max) {
    n = parseInt(n, 10);
    if (isNaN(n)) return min;
    return Math.min(max, Math.max(min, n));
  }

  window.generate = function () {
    var type = typeEl.value;
    var amount = clamp(countEl.value, 1, 100);
    countEl.value = amount;

    var result = '';
    if (type === 'words') {
      var words = [];
      for (var i = 0; i < amount; i++) words.push(pick());
      result = words.join(' ');
    } else if (type === 'sentences') {
      var sentences = [];
      for (var j = 0; j < amount; j++) sentences.push(sentence());
      result = sentences.join(' ');
    } else {
      var paras = [];
      for (var k = 0; k < amount; k++) paras.push(paragraph());
      result = paras.join('\n\n');
    }

    if (classicEl.checked && type !== 'words') {
      result = CLASSIC + (type === 'paragraphs' ? '\n\n' : ' ') + result;
    } else if (classicEl.checked && type === 'words' && amount > 4) {
      result = CLASSIC.replace(/[.,]/g, '').split(' ').slice(0, 4).join(' ') + ' ' + result;
    }

    output.value = result;
    say('Generated ' + (type === 'words' ? amount + ' words' : amount + ' ' + type) + '.', 'success');
  };

  window.copyResult = function () {
    if (!output.value) {
      say('Generate some text first.', 'error');
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(output.value).then(function () {
        say('Copied to clipboard.', 'success');
      }, function () {
        output.select();
        say('Press Ctrl/Cmd + C to copy.', '');
      });
    } else {
      output.select();
      say('Press Ctrl/Cmd + C to copy.', '');
    }
  };

  window.clearAll = function () {
    output.value = '';
    say('', '');
  };

  // Generate something immediately so the page is never empty
  window.generate();
})();
