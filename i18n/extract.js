// Extract user-visible English strings from the ScopeDue single-file page.
// usage: node extract.js SRC.html OUT.json
const fs = require('fs'), acorn = require('acorn'), walk = require('acorn-walk'), parse5 = require('parse5');
const [src, out] = process.argv.slice(2);
let h = fs.readFileSync(src, 'utf8');
if (/\.js$/.test(src)) h = '<html><body>\n<script>\n' + h + '</script>\n</body>';
else if (!/<script>\n/.test(h.slice(h.indexOf('<body>')))) h = h.replace('</body>', '<script>\n</script>\n</body>');
const bodyStart = h.indexOf('<body>'), js0 = h.indexOf('<script>\n', bodyStart) + 9, js1 = h.lastIndexOf('</script>\n</body>');
const js = h.slice(js0, js1), lineOff = h.slice(0, js0).split('\n').length - 1;
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', hellip: '…', middot: '·', mdash: '—', ndash: '–', rarr: '→', larr: '←', times: '×', rsaquo: '›', lsaquo: '‹', bull: '•', copy: '©', minus: '−', thinsp: ' ', zwj: '', shy: '' };
const dec = s => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : +e.slice(1)) : (e in ENT ? ENT[e] : m));
const norm = s => s.replace(/[\s ]+/g, ' ').trim();
const PH = '\u0001';
const items = new Map(); // key -> {k, kind, lines:Set}
function add(k, kind, line) {
  k = norm(k); if (!k) return;
  if (!/[A-Za-z]{2,}/.test(k.split(PH).join(''))) return;
  const e = items.get(kind + '|' + k) || { k, kind, lines: new Set() };
  e.lines.add(line); items.set(kind + '|' + k, e);
}
// ---- static HTML (head title + body without the script)
const htmlPart = h.slice(0, js0 - 9);
const doc = parse5.parse(htmlPart, { sourceCodeLocationInfo: true });
const ATTRS = ['placeholder', 'title', 'aria-label', 'data-tip', 'alt', 'aria-roledescription', 'aria-valuetext', 'data-label', 'label'];
(function rec(n) {
  if (n.nodeName === 'style' || n.nodeName === 'script') return;
  if (n.nodeName === '#text') { const ln = n.sourceCodeLocation ? n.sourceCodeLocation.startLine : 0; add(n.value, 'html', ln); }
  if (n.attrs) for (const a of n.attrs) if (ATTRS.includes(a.name) || (a.name === 'value' && n.attrs.some(x => x.name === 'type' && /button|submit/.test(x.value)))) add(a.value, 'attr', n.sourceCodeLocation ? n.sourceCodeLocation.startLine : 0);
  (n.childNodes || []).forEach(rec); if (n.content) (n.content.childNodes || []).forEach(rec);
})(doc);
// ---- JS
const ast = acorn.parse(js, { ecmaVersion: 2022, locations: true });
const inChain = new Set();
function flat(n, parts) { // returns list of alternatives (each a list of {t} or {ph,expr})
  if (n.type === 'BinaryExpression' && n.operator === '+') {
    const a = flat(n.left), b = flat(n.right), r = [];
    for (const x of a) for (const y of b) { r.push(x.concat(y)); if (r.length > 16) break; }
    return r.slice(0, 16);
  }
  if (n.type === 'Literal' && typeof n.value === 'string') return [[{ t: n.value }]];
  if (n.type === 'Literal' && typeof n.value === 'number') return [[{ ph: 1, num: 1 }]];
  if (n.type === 'TemplateLiteral') { const p = []; n.quasis.forEach((q, i) => { p.push({ t: q.value.cooked }); if (i < n.expressions.length) p.push({ ph: 1, tag: isTag(n.expressions[i]) }); }); return [p]; }
  if (n.type === 'ConditionalExpression') {
    const a = flat(n.consequent), b = flat(n.alternate);
    if (a.length + b.length <= 8 && [...a, ...b].every(x => x.length <= 6)) return a.concat(b);
  }
  if (n.type === 'LogicalExpression' && n.operator === '||' && n.right.type === 'Literal' && typeof n.right.value === 'string') return [[{ ph: 1 }]];
  return [[{ ph: 1, tag: isTag(n) }]];
}
function isTag(n) { // expressions that render markup, not text
  if (n.type === 'CallExpression') { const c = n.callee, nm = c.type === 'Identifier' ? c.name : c.type === 'MemberExpression' && c.property.name; return /^(IC|ic|icon|svg|av|avatar|chip|btn|.*HTML|.*Html|.*El|.*Chip|.*Pill|.*Av)$/.test(nm || '') || /^(IC)/.test(nm || ''); }
  return false;
}
function emitTpl(parts, line) {
  let s = '';
  for (const p of parts) s += p.t != null ? p.t : (p.tag ? '<x>' : PH);
  // labels inside the markup: aria-label="…", title="…"
  const ar = /\b(?:aria-label|title|placeholder|data-tip|alt|data-label)="([^"<>]*)"/g; let am;
  while ((am = ar.exec(s))) { const v = dec(am[1]); if (v.includes(PH)) { const k = norm(v); if (k.split(PH).join('').replace(/[^A-Za-z]/g, '').length >= 2) add(k, 'tpl', line); } else add(v, 'js', line); }
  // split into text segments between tags
  s.split(/<[^>]*>/).forEach(seg => {
    seg = dec(seg);
    if (!seg.trim()) return;
    if (seg.includes(PH)) { const k = norm(seg); if (k.split(PH).join('').replace(/[^A-Za-z]/g, '').length >= 2) add(k, 'tpl', line); }
    else add(seg, 'js', line);
  });
}
walk.fullAncestor(ast, (n, anc) => {
  if (n.type === 'BinaryExpression' && n.operator === '+') {
    const p = anc[anc.length - 2];
    if (p && p.type === 'BinaryExpression' && p.operator === '+') return; // only top chain
    flat(n).forEach(parts => emitTpl(parts, n.loc.start.line + lineOff));
  } else if (n.type === 'Literal' && typeof n.value === 'string') {
    const p = anc[anc.length - 2];
    if (p && p.type === 'BinaryExpression' && p.operator === '+') return;
    emitTpl([{ t: n.value }], n.loc.start.line + lineOff);
  } else if (n.type === 'TemplateLiteral') {
    emitTpl(flat(n)[0], n.loc.start.line + lineOff);
  }
});
const res = [...items.values()].map(e => ({ k: e.k, kind: e.kind, lines: [...e.lines].sort((a, b) => a - b) }));
fs.writeFileSync(out, JSON.stringify(res, null, 0));
const by = {}; res.forEach(r => by[r.kind] = (by[r.kind] || 0) + 1); console.log(res.length, by);
