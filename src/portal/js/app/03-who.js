/* ───────── Who is who ───────── */
var TONES = ['#24365a', '#2f4a7a', '#3f5f5a', '#5a4a6e', '#6b4f3a', '#7a3f4d'];
var PF_REPLY = { same: 'Usually replies the same day', '1d': 'Usually replies within 1 business day', '2d': 'Usually replies within 2 business days' };
var PF_DN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
var STUDIO = { name: 'Maya Chen', title: 'Product designer and developer', biz: 'Lumen Studio', email: 'maya@lumenstudio.example', phone: '+1 512 555 0142', city: 'Austin, Texas', tz: 'America/Chicago',
  bio: 'I design and build websites and small apps for local businesses. I keep scope in writing so we both know what has been agreed.', days: [0, 1, 2, 3, 4], from: '09:00', to: '17:00', reply: '1d', se: true, sp: false, sl: true, tone: 2, photo: '' };
var studioName = function () { return STUDIO.biz || STUDIO.name; };
var CLIENTS = [
  { id: 'lotus-wellness', name: 'Mai Võ', first: 'Mai', biz: 'Lotus Wellness', email: 'mai@lotuswellness.example', projects: ['online-store', 'booking-app'] },
  { id: 'greenhome', name: 'Hà Trần', first: 'Hà', biz: 'GreenHome', email: 'ha@greenhome.example', projects: ['greenhome'] },
  { id: 'minh-phat', name: 'Phát Nguyễn', first: 'Phát', biz: 'Minh Phát Furniture', email: 'phat@minhphat.example', projects: ['minh-phat-website'] }
];
var META = {
  'minh-phat-website': { n: 'Minh Phát Furniture website', cid: 'minh-phat', phase: 4 },
  'greenhome': { n: 'E-commerce GreenHome', cid: 'greenhome', phase: 5 },
  'online-store': { n: 'Online store', cid: 'lotus-wellness', phase: 3 },
  'booking-app': { n: 'Booking app', cid: 'lotus-wellness', phase: 2 }
};
var PHASES = ['Scoping', 'Design', 'Build', 'Review', 'Handoff'];
/* a stage name is the portal's own word: shown in the client's language even when a project has a deliverable called "Design" */
function phN(i) { var t = PHASES[i]; return t && window.SDI18N ? SDI18N.app(t) : t; }
var SEC = [['in', 'Deliverables'], ['out', 'Exclusions'], ['tl', 'Timeline & payment']];
var TYL = { request: 'Request', question: 'Question', quote: 'Quote', counter: 'Counter offer', accept: 'Approved', decline: 'Declined', note: 'Note', dispute: 'Disagrees' };
var P = {};
/* v120 (CONTRACT 88): the demo shows the sample's client project, put in by the build in the shape the server sends it (build.py
   portal_demo), and read the way the server's answer is (liveMap): what the studio and the client wrote stays as it was written,
   in every language; the portal turns only its own words. Its studio is the portal's sample studio above. ?proto keeps the
   prototype's projects (and its dock), for the portal's own tests */
var DEMOS = /[?&]proto\b/.test(location.search) ? null : /*SD_PORTAL_DEMO*/null, STUDIO0 = STUDIO;
/* v128 (CONTRACT 103): one demo for each client project of the sample. ?demo opens the first (Nha khoa Minh Tâm); ?demo=<client>
   another, by the start of its name without dashes (?demo=saobac: Sao Bắc Logistics). A name that matches none opens the first,
   or, with ?lang=en, the English sample's first (Maple Ridge Dental; ?demo=northstar: Northstar Logistics) */
function demoPick(m) {
  var q = ((/[?&]demo=([A-Za-z0-9-]+)/.exec(location.search) || [])[1] || '').toLowerCase().replace(/[^a-z0-9]/g, ''), k,
    lg = (/[?&]lang=([a-z]{2})\b/.exec(location.search) || [])[1];
  if (q) for (k in m) if (k && k.charAt(0) !== '@' && k.indexOf(q) === 0) return m[k];
  return (lg && m['@' + lg]) || m[''] || null;   /* CONTRACT 124: ?demo&lang=en opens the English sample's first client */
}
var DEMO = DEMOS ? demoPick(DEMOS) : null;
/* the sample is to look at, not to act on: everything a client does (approve, answer, ask, decline, report, say it works, pay,
   receive, send pictures) is stopped with a word; opening, reading, the record, history, language and look stay */
var DEMO_RO = { approve: 1, 'approve-from': 1, resend: 1, confirm: 1, mailfill: 1, ckok: 1, recv: 1, dispute: 1, bugdispute: 1, bug: 1, fixok: 1,
  ckissue: 1, unpic: 1, ask: 1, counter: 1, decline: 1, note: 1, newquote: 1, 'new': 1, changes: 1, notmet: 1, flag: 1, sent: 1, endp: 1, paid: 1, dform: 1 };
var DEMO_RO_MSG = 'This is a sample to look around in. Nothing can be done in it.';
function demoRo(a) { return !!(DEMO && !LIVEON && DEMO_RO[a]); }
function demoData() {
  var d = JSON.parse(JSON.stringify(DEMO)), s = {}, k;
  for (k in STUDIO0) s[k] = STUDIO0[k];
  if (d.studio0) for (k in d.studio0) s[k] = d.studio0[k];   /* a demo from a studio of its own (Studio Bắc Nam), not the portal's sample studio */
  s.lang = ''; s.theme = ''; d.studio = s; d.now = Date.now();
  return liveMap(d);
}
function buildData() {
  if (DEMO) { P = demoData(); return; }
  STUDIO = STUDIO0;
  P = {};
  Object.keys(META).forEach(function (id) {
    var m = META[id], s = PD_SEEDS[id]();
    P[id] = { id: id, n: m.n, cid: m.cid, phase: m.phase, cur: s.cur, vers: s.vers, crs: s.crs, rev: { used: s.rev || 0 }, evd: pdeSeed({ id: id }), mev: s.mev || [] };
    P[id].vers.forEach(function (v) { delete v.by; });
  });
}
function pdeRefLabel(ref) { return !ref ? '' : /^v\d+$/.test(ref) ? 'Scope ' + ref : ref; }
function client(id) { return CLIENTS.filter(function (c) { return c.id === id; })[0]; }

