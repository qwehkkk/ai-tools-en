// Run from any directory: every path in this file is repo-relative.
process.chdir(require('path').join(__dirname, '..'));
const fs = require('fs');
const vm = require('vm');

const code = fs.readFileSync('js/cron-explainer.js', 'utf8');

function makeEl() {
  return {
    value: '', textContent: '', className: '', innerHTML: '',
    style: {}, checked: false, focus() {},
    addEventListener() {}
  };
}

function boot() {
  const ids = ['expr', 'msg', 'result', 'desc', 'next', 'fields'];
  const els = {};
  ids.forEach(id => (els[id] = makeEl()));
  const ctx = {
    document: { getElementById: id => els[id] || null, createElement: () => makeEl() },
    console,
    Date,
    els
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return ctx;
}

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  -> ' + extra : '')); }
}

function explain(expr) {
  const c = boot();
  c.els.expr.value = expr;
  c.explain();
  return c;
}

// 1. every N minutes
{
  const c = explain('*/5 * * * *');
  check('1 no error', !c.els.msg.textContent.includes('could not'), c.els.msg.textContent);
  check('1 desc', c.els.desc.textContent === 'Every 5 minutes.', c.els.desc.textContent);
  check('1 result shown', c.els.result.style.display === '');
}

// 2. weekday mornings
{
  const c = explain('0 9 * * 1-5');
  const d = c.els.desc.textContent;
  check('2 has 09:00', /09:00/.test(d), d);
  check('2 has Friday', /Friday/.test(d), d);
  check('2 has Monday', /Monday/.test(d), d);
}

// 3. every minute
{
  const c = explain('* * * * *');
  check('3 desc', c.els.desc.textContent === 'Every minute.', c.els.desc.textContent);
}

// 4. once a year
{
  const c = explain('0 0 1 1 *');
  const d = c.els.desc.textContent;
  check('4 midnight', /00:00/.test(d), d);
  check('4 day 1', /day 1/.test(d), d);
  check('4 January', /January/.test(d), d);
}

// 5. month names
{
  const c = explain('0 12 * JAN,JUL *');
  check('5 months named', /January, July/.test(c.els.desc.textContent), c.els.desc.textContent);
}

// 6. weekday names
{
  const c = explain('30 2 * * MON-FRI');
  check('6 weekday names', /Monday, Tuesday, Wednesday, Thursday, Friday/.test(c.els.desc.textContent), c.els.desc.textContent);
}

// 7. six fields (Quartz / Spring)
{
  const c = explain('0 0 12 * * ?');
  check('7 has seconds', /second/.test(c.els.msg.textContent), c.els.msg.textContent);
  check('7 noon', /12:00/.test(c.els.desc.textContent), c.els.desc.textContent);
}

// 8. last day of month
{
  const c = explain('0 0 L * *');
  check('8 last day', /last day of the month/.test(c.els.desc.textContent), c.els.desc.textContent);
}

// 9. last Friday
{
  const c = explain('0 0 ? * 5L');
  check('9 last Friday', /last Friday of the month/.test(c.els.desc.textContent), c.els.desc.textContent);
}

// 10. third Tuesday
{
  const c = explain('0 0 ? * 2#3');
  check('10 third Tuesday', /3rd Tuesday of the month/.test(c.els.desc.textContent), c.els.desc.textContent);
}

// 11. weekday nearest
{
  const c = explain('0 0 15W * *');
  check('11 nearest weekday', /weekday nearest day 15/.test(c.els.desc.textContent), c.els.desc.textContent);
}

// 12. invalid field count
{
  const c = explain('* * *');
  check('12 field count error', /5, 6 or 7 fields/.test(c.els.msg.textContent), c.els.msg.textContent);
  check('12 hides result', c.els.result.style.display === 'none');
}

// 13. out of range
{
  const c = explain('99 * * * *');
  check('13 range error', /between 0 and 59/.test(c.els.msg.textContent), c.els.msg.textContent);
}

// 14. garbage
{
  const c = explain('abc * * * *');
  check('14 parse error', /could not understand/.test(c.els.msg.textContent), c.els.msg.textContent);
}

// 15. empty
{
  const c = explain('   ');
  check('15 empty error', /Type a cron expression/.test(c.els.msg.textContent), c.els.msg.textContent);
}

// 16. next runs: count and ordering, using a fixed clock
{
  const c = boot();
  const p = c.window.__cron.parse('0 9 * * 1-5');
  const start = new Date(2026, 0, 1, 0, 0, 0); // Thursday 1 Jan 2026
  const r = c.window.__cron.nextRuns(p, start, 5);
  check('16 five runs', r.runs.length === 5, String(r.runs.length));
  check('16 first is Thu 1 Jan 09:00',
    r.runs[0].getFullYear() === 2026 && r.runs[0].getMonth() === 0 && r.runs[0].getDate() === 1 && r.runs[0].getHours() === 9,
    r.runs[0] && r.runs[0].toString());
  // 1 Jan 2026 is a Thursday, so five weekday runs land on 1, 2, 5, 6, 7
  check('16 last is Wed 7 Jan 09:00',
    r.runs[4].getDate() === 7 && r.runs[4].getDay() === 3, r.runs[4] && r.runs[4].toString());
  check('16 skips the weekend', r.runs.every(d => d.getDay() >= 1 && d.getDay() <= 5));
  check('16 ascending', r.runs.every((d, i) => i === 0 || d.getTime() > r.runs[i - 1].getTime()));
}

// 17. every minute from a fixed clock
{
  const c = boot();
  const p = c.window.__cron.parse('* * * * *');
  const start = new Date(2026, 5, 10, 23, 58, 30);
  const r = c.window.__cron.nextRuns(p, start, 3);
  check('17 crosses midnight', r.runs[2].getDate() === 11 && r.runs[2].getHours() === 0, r.runs.map(String).join(' | '));
  check('17 seconds zeroed', r.runs.every(d => d.getSeconds() === 0));
}

// 18. monthly on the 31st skips short months
{
  const c = boot();
  const p = c.window.__cron.parse('0 0 31 * *');
  const start = new Date(2026, 0, 1, 0, 0, 0);
  const r = c.window.__cron.nextRuns(p, start, 3);
  const days = r.runs.map(d => d.getMonth() + 1 + '/' + d.getDate());
  check('18 only long months', days.join(',') === '1/31,3/31,5/31', days.join(','));
}

// 19. Feb 29 sparse expression terminates
{
  const c = boot();
  // The scan is bounded at two years, so start close enough to 2028-02-29
  const p = c.window.__cron.parse('0 0 29 2 *');
  const start = new Date(2027, 0, 1, 0, 0, 0);
  const t0 = Date.now();
  const r = c.window.__cron.nextRuns(p, start, 1);
  const ms = Date.now() - t0;
  check('19 finds 2028 leap day', r.runs.length === 1 && r.runs[0].getFullYear() === 2028 && r.runs[0].getDate() === 29,
    r.runs.map(String).join(','));
  check('19 under 2s', ms < 2000, ms + 'ms');
}

// 20. seconds field honoured
{
  const c = boot();
  const p = c.window.__cron.parse('30 0 12 * * ?');
  const start = new Date(2026, 2, 1, 0, 0, 0);
  const r = c.window.__cron.nextRuns(p, start, 2);
  check('20 second 30', r.runs[0].getSeconds() === 30, String(r.runs[0].getSeconds()));
  check('20 at 12:00:30', r.runs[0].getHours() === 12 && r.runs[0].getMinutes() === 0, r.runs[0].toString());
}

// 21. dom OR dow
{
  const c = boot();
  const p = c.window.__cron.parse('0 0 1 * SUN');
  const start = new Date(2026, 0, 1, 0, 0, 0);
  const r = c.window.__cron.nextRuns(p, start, 5);
  const desc = c.window.__cron.humanize(p);
  check('21 or in desc', / or on /.test(desc), desc);
  check('21 Sundays and the 1st', r.runs.length === 5, String(r.runs.length));
}

// 22. step with range
{
  const c = explain('0 9-17/4 * * *');
  check('22 hours 9,13,17', /09:00, 13:00, 17:00/.test(c.els.desc.textContent), c.els.desc.textContent);
}

// 23. wrap-around weekday range
{
  const c = boot();
  const p = c.window.__cron.parse('0 0 * * FRI-MON');
  const desc = c.window.__cron.humanize(p);
  check('23 wrap includes Sunday', /Sunday/.test(desc), desc);
}

// 24. field breakdown rendered
{
  const c = explain('*/15 9-17 * * 1-5');
  const html = c.els.fields.innerHTML;
  check('24 five rows', (html.match(/class="result-row"/g) || []).length === 5, String((html.match(/class="result-row"/g) || []).length));
  check('24 escapes raw', html.includes('<code>*/15</code>'), html.slice(0, 200));
}

// 25. sample loads and explains
{
  const c = boot();
  c.loadSample();
  check('25 sample explained', c.els.result.style.display === '' && /15, 30, 45/.test(c.els.fields.innerHTML), c.els.fields.innerHTML.slice(0, 300));
}

// 26. clear
{
  const c = explain('0 9 * * *');
  c.clearAll();
  check('26 clear hides', c.els.result.style.display === 'none' && c.els.expr.value === '');
}

// 27. no run found is reported, not hung
{
  const c = boot();
  const p = c.window.__cron.parse('0 0 30 2 *'); // 30 February never happens
  const r = c.window.__cron.nextRuns(p, new Date(2026, 0, 1), 1);
  check('27 impossible date yields none', r.runs.length === 0 && r.exhausted, JSON.stringify({ n: r.runs.length, e: r.exhausted }));
}

console.log('\n=== cron-explainer: ' + pass + ' passed, ' + fail + ' failed ===');
process.exit(fail ? 1 : 0);
