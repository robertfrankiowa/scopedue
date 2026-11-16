// Speed of the extension's new tab: cold starts with the CPU slowed 4x, median of N (default 7). Usage: node perf68.js [extension folder …]
//   ready_ms: until the app has drawn the Dashboard from the saved data; fcp_ms: first paint. Compare an older build by passing its folder.
const { chromium } = require('/opt/npm-tools/node_modules/playwright');
const path = require('path'); const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
const dirs = process.argv.length > 2 ? process.argv.slice(2) : [path.join(ROOT, 'scopedue-extension')], N = +(process.env.N || 7);
(async () => {
  const b = await chromium.launch(); const rows = [];
  for (const dir of dirs) {
    const WEB = await require('./serve')(dir);
    for (const lang of ['en', 'vi']) {
      const r = { ready: [], fcp: [], script: [], layout: [], style: [], heap: [] };
      for (let i = 0; i < N; i++) {
        const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } }); await ctx.route(/fonts\.(googleapis|gstatic)/, x => x.abort());
        await ctx.addInitScript(l => { localStorage.setItem('sd.lang', l); localStorage.setItem('sd-first', 'sample'); (function w() { if (window.__sy) { window.__ready = performance.now(); return; } requestAnimationFrame(w); })(); }, lang);
        const p = await ctx.newPage(); const cdp = await ctx.newCDPSession(p);
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await cdp.send('Performance.enable');
        await p.goto(WEB.base + 'app.html?test'); await p.waitForFunction(() => window.__ready, null, { timeout: 20000 }); await p.waitForTimeout(800);
        const m = Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(x => [x.name, x.value]));
        const v = await p.evaluate(() => ({ ready: window.__ready, fcp: (performance.getEntriesByName('first-contentful-paint')[0] || {}).startTime || 0 }));
        r.ready.push(v.ready); r.fcp.push(v.fcp); r.script.push(m.ScriptDuration * 1000); r.layout.push(m.LayoutDuration * 1000); r.style.push(m.RecalcStyleDuration * 1000); r.heap.push(m.JSHeapUsedSize / 1048576);
        await ctx.close();
      }
      const med = a => { const s = a.slice().sort((x, y) => x - y); return Math.round(s[s.length >> 1] * 10) / 10; };
      rows.push({ build: path.basename(path.dirname(dir)), lang, ready_ms: Math.round(med(r.ready)), fcp_ms: Math.round(med(r.fcp)), script_ms: Math.round(med(r.script)), layout_ms: Math.round(med(r.layout)), style_ms: Math.round(med(r.style)), heap_MB: med(r.heap) });
    }
    WEB.close();
  }
  console.table(rows); await b.close();
})();
