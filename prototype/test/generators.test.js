// Property tests for every question generator. Run: node test/generators.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const m = html.match(/<script>([\s\S]*?)<\/script>/);
if (!m) throw new Error('no inline script found');

const el = () => new Proxy(function () {}, { get: (_, k) => (k === 'style' ? {} : k === 'classList' ? { add() {}, remove() {}, toggle() {} } : el()), set: () => true, apply: () => el() });
const sb = { console, Math, Date, JSON, setTimeout, clearTimeout, setInterval, clearInterval, __PIP_TEST: true,
  document: { getElementById: el, querySelector: el, querySelectorAll: () => [], addEventListener() {}, documentElement: el(), body: el(), createElement: el },
  localStorage: { getItem: () => null, setItem() {} }, navigator: { language: 'en' },
  matchMedia: () => ({ matches: false }), requestAnimationFrame() {}, addEventListener() {} };
sb.window = sb; vm.createContext(sb); vm.runInContext(m[1], sb);
const P = sb.__pip; if (!P) throw new Error('__pip not exposed');

let fails = 0, checks = 0;
const bad = (msg) => { fails++; if (fails < 25) console.error('FAIL', msg); };
const clean = (s) => !/NaN|undefined|Infinity|null|\[object/.test(String(s));

for (const lang of ['en', 'es']) {
  P.S.lang = lang;
  for (const t of P.TOPICS) for (let g = 1; g <= 6; g++) for (let d = 0; d <= 2; d++) for (let i = 0; i < 60; i++) {
    const tag = `${lang}/${t.id}/g${g}/d${d}`; checks++;
    let q; try { q = t.gen(g, d); } catch (e) { bad(tag + ' threw ' + e.stack); continue; }
    if (!q.prompt || typeof q.prompt !== 'string') bad(tag + ' prompt');
    if (!['choice', 'num'].includes(q.kind)) bad(tag + ' kind');
    for (const f of ['prompt', 'vis', 'hint', 'why']) if (typeof q[f] !== 'string' || !clean(q[f])) bad(`${tag} field ${f}: ${q[f]}`);
    if (!q.hint || !q.why) bad(tag + ' empty hint/why');
    if (q.kind === 'choice') {
      if (!Array.isArray(q.opts) || q.opts.length < 2 || new Set(q.opts).size !== q.opts.length) bad(`${tag} opts ${JSON.stringify(q.opts)}`);
      else if (!q.opts.includes(q.answer)) bad(`${tag} answer missing ${q.answer} in ${JSON.stringify(q.opts)}`);
      else if (!q.opts.every(clean)) bad(tag + ' opt text');
      if (!P.check(q, q.answer)) bad(tag + ' check choice');
    } else {
      if (typeof q.answer !== 'number' || !isFinite(q.answer)) bad(`${tag} num answer ${q.answer}`);
      else {
        if (q.answer < 0 && !q.neg) bad(`${tag} negative ${q.answer}`);
        if (!P.check(q, String(q.answer))) bad(tag + ' check num');
        if (!P.check(q, String(q.answer).replace('.', ','))) bad(tag + ' check comma');
        if (P.check(q, String(q.answer + 1))) bad(tag + ' accepts wrong');
      }
    }
  }
  for (let g = 1; g <= 6; g++) for (let i = 0; i < 60; i++) {
    checks++; const q = P.raceQ(g);
    if (!q.opts.includes(q.answer) || new Set(q.opts).size !== q.opts.length || !clean(q.prompt)) bad(`race g${g} ${JSON.stringify(q)}`);
  }
}
const li = P.levelInfo(0), l2 = P.levelInfo(5000);
if (li.level !== 1 || l2.level <= li.level || l2.pct < 0 || l2.pct > 100) bad('levelInfo');
console.log(`${checks} checks, ${fails} failures`);
process.exit(fails ? 1 : 0);
