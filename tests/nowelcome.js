// Older suites open the app like a returning user who chose the samples: no first-run welcome in their way.
const pw = require('/opt/npm-tools/node_modules/playwright');
const seed = () => { try { if (sessionStorage.getItem('sd-nw')) return; sessionStorage.setItem('sd-nw', '1'); if (!localStorage.getItem('sd-first')) localStorage.setItem('sd-first', 'sample'); } catch (e) {} };
const L = pw.chromium.launch.bind(pw.chromium);
pw.chromium.launch = async (...a) => {
  const b = await L(...a);
  const NC = b.newContext.bind(b), NP = b.newPage.bind(b);
  b.newContext = async (...o) => { const c = await NC(...o); await c.addInitScript(seed); return c; };
  b.newPage = async (...o) => { const p = await NP(...o); await p.addInitScript(seed); return p; };
  return b;
};
