  /* ---------- research with AI (prefix mai): prompt, parse, check, plan, apply ---------- */
  var MAI_SCHEMA = 'scopedue.market.v1', MAI_MODES = ['discover', 'refresh_monthly', 'refresh_quarterly', 'challenge'];
  var MAI_LANGS = [['English', 'English'], ['Vietnamese', 'Tiếng Việt']];
  var mai = { pid: '', mode: 'discover', scope: true, lang: 'English', focus: '', step: 1, raw: '', ck: null, plan: null, sel: {}, ack: false, gen: 0, snap: '', copied: false };
  /* v74: the answer comes back in the project's language (p.lang, set in New project or the project menu; else the one ScopeDue
     is in). Changing it here is for this research only */
  function maiProjLang(p) { return pjLang(p) === 'vi' ? 'Vietnamese' : 'English'; }

  function maiNorm(s) { return prvText(s).toLowerCase(); }
  function maiKey(s) { return slug(String(s == null ? '' : s)); }
  function maiUrl(u) { try { var o = new URL(u); return (o.hostname.replace(/^www\./, '') + o.pathname.replace(/\/+$/, '') + o.search).toLowerCase(); } catch (e) { return ''; } }
  function maiExSrc(p, id) { var m = /^s(\d+)$/.exec(String(id)); return m ? prvSrc(p, +m[1]) : null; }
  function maiDiff(a, b) {
    var la = a.map(maiNorm), lb = b.map(maiNorm);
    return { add: b.filter(function (x) { return la.indexOf(maiNorm(x)) < 0; }), del: a.filter(function (x) { return lb.indexOf(maiNorm(x)) < 0; }) };
  }

  /* the prompt */
  function maiEmbed(p) {
    var o = prvExportObj(p); delete o.meta; delete o.notes; delete o.project.thesis;
    o.sources.forEach(function (s) { if (s.quote.length > 160) s.quote = s.quote.slice(0, 159) + '…'; });
    return JSON.stringify(o, null, 1);
  }
  var MAI_TASK = {
    discover: ['DISCOVER', [
      'Build the first map of this market.',
      '1. List 4 to 8 jobs the customer is trying to get done, worded the way the customer would say them (for example "Keep brand files in the studio\'s own Drive"). Write jobs only and leave features out.',
      '2. For each job, look for evidence of demand (rule 3) in pricing pages, reviews, forums, communities, job boards and template marketplaces.',
      '3. List 5 to 10 competitors that already cover these jobs, plus at least one substitute. For each: one line of positioning, a price band, up to 6 strengths and up to 6 weaknesses.',
      '4. Rate how well each competitor covers each job (rule 4), with a source.',
      '5. If ALREADY KNOWN is present, keep it and extend it. Do not duplicate what is there.',
      '6. Only if the project data lets you judge it, write the founder\'s wedge (one sentence: why would someone switch to this product) and list strengths, weaknesses and risks. Otherwise leave them empty.',
      '7. Clone hunt. Search Product Hunt, the Chrome Web Store, GitHub, Show HN and posts like "I built" on Reddit from the last 24 months for products that do almost exactly what this project plans. Add each as a competitor with "clone": true. If one shut down, keep it with "dead": true and say why in "died", from a source.',
      '8. Channels. List up to 6 places where these customers gather and talk about these jobs (communities, forums, newsletters, marketplaces), each with a link, its size if the page shows it, and why it fits.']],
    refresh_monthly: ['REFRESH · MONTHLY', [
      'Update what the founder already holds. Do not rebuild it. Look at what changed since {since}.',
      '- Competitors: price and plan changes, new features, shutdowns, acquisitions, funding, layoffs.',
      '- New rivals or substitutes that appeared.',
      '- New evidence of demand for existing jobs, or signs that demand faded.',
      '- Ratings that no longer hold.',
      'Return only what is new or changed, plus every competitor you re-checked. For each re-checked competitor include the fresh source (the pricing or product page you opened), even when nothing changed. Keep every existing key exactly as it is.']],
    refresh_quarterly: ['REFRESH · QUARTERLY', [
      'Review the whole map and be harder on it than last time.',
      '- Re-test every job: is the demand still real, and is it paid or a workaround? Retire a job only when the evidence says it is gone or was never real.',
      '- Re-check every competitor: still active? Re-rate every pair where the product or price changed. Retire a competitor only when it is gone.',
      '- Look for 2 to 3 rivals or substitutes that were missed.',
      '- Re-judge the wedge: does it still rest on a job that no competitor covers in full? Update strengths, weaknesses and risks, and say why in notes.',
      '- Repeat the clone hunt for the last 3 months.',
      '- Return every job and competitor you reviewed, each with a fresh source. Keep every existing key exactly as it is.']],
    challenge: ['CHALLENGE', [
      'Argue against this product. Look for the reasons it will fail, not for reasons it will work.',
      '1. Find the rival that already wins with these customers, and why it wins.',
      '2. Find clones that shut down and why they died. Mark them "clone": true and "dead": true, with "died" from a source.',
      '3. Find evidence that customers will not pay for this, or already get it free.',
      '4. Find channels that will not work for this product, or that are saturated.',
      '5. Put the strongest 3 to 6 reasons in project.risks, each under 80 characters. Leave the wedge, strengths and weaknesses empty.',
      '6. If ALREADY KNOWN is present, keep its keys. Add only what is new.']]
  };
  var MAI_SHAPE = [
    '{',
    '  "schema": "scopedue.market.v1",',
    '  "meta": { "mode": "{mode}","model": "<your model name>", "browsing": true, "as_of": "YYYY-MM-DD", "project": "<project name>" },',
    '  "project": { "wedge": "<one sentence or null>", "wedge_job": "<job key or null>", "strengths": [], "weaknesses": [], "risks": [] },',
    '  "jobs": [',
    '    { "key": "kebab-case-key", "title": "<the job, in the customer\'s words>", "status": "active | retired", "reason": "<only when retired>",',
    '      "demand": [ { "kind": "paid | workaround | complaint | mention", "note": "<what you found>", "source": "<source id or null>" } ] }',
    '  ],',
    '  "competitors": [',
    '    { "key": "kebab-case-key", "name": "<product>", "positioning": "<one line>", "price": "$ | $$ | $$$ | Free | null", "substitute": false,',
    '      "strengths": [], "weaknesses": [],',
    '      "coverage": [ { "job": "<job key>", "level": "full | partial | none", "source": "<source id or null>" } ],',
    '      "sources": ["<source id>"], "status": "active | retired", "reason": "<only when retired>",',
    '      "clone": false, "dead": false, "died": "<why it shut down, or null>" }',
    '  ],',
    '  "channels": [ { "name": "<community or place>", "url": "https://…", "size": "<members or traffic as the page shows it, or null>", "why": "<what these customers talk about there>", "source": "<source id or null>" } ],',
    '  "queries": ["<every search you ran, as you typed it>"],',
    '  "sources": [ { "id": "n1", "title": "<page title>", "url": "https://…", "quote": "<exact words copied from the page>", "accessed": "YYYY-MM-DD" } ],',
    '  "notes": ["<anything the founder must know, including what you could not find>"]',
    '}'];
  function maiPrompt(p, o) {
    var pv = p.pv, today = prvIso(Date.now()), cad = prvCad(p), L = [], t = MAI_TASK[o.mode] || MAI_TASK.discover, known = pv.jobs.length + pv.comps.length > 0;
    L.push('You are a skeptical market analyst. A solo founder is deciding whether a product is worth building. Your job is to find out whether a real gap exists and to report it plainly. If the evidence shows a crowded market or nobody paying, let the data you return show it.', '');
    L.push('TOOLS', 'Search the web and open the pages you cite. Do not answer from memory. If you cannot browse, set meta.browsing to false, explain in notes, and do not guess.', '');
    L.push('PROJECT', 'Name: ' + p.n, 'Thesis: ' + (p.thesis || '(none yet)'), 'Today: ' + today);
    if (prvText(o.focus)) L.push('Focus: ' + prvText(o.focus));
    if (o.scope) {
      var inn = prvBucket(p, 'in').slice(0, 15).map(function (x) { return x.t; }), nxt = prvBucket(p, 'next').slice(0, 10).map(function (x) { return x.t; }), out = prvBucket(p, 'out').slice(0, 10).map(function (x) { return x.t; }), shp = prvBucket(p, 'shipped').slice(0, 10).map(function (x) { return x.t; });
      if (inn.length || nxt.length || out.length) { L.push('Scope today:'); if (inn.length) L.push('- Now (this release): ' + inn.join('; ')); if (nxt.length) L.push('- Next (after this release): ' + nxt.join('; ')); if (out.length) L.push('- Never (ruled out): ' + out.join('; ')); if (shp.length) L.push('- Already shipped: ' + shp.join('; ')); }
    }
    L.push('', 'TASK · ' + t[0]);
    t[1].forEach(function (l) { L.push(l.replace('{since}', cad.any ? prvIso(cad.any) : 'a month ago')); });
    if (known || pv.ret.length) L.push('', o.mode === 'discover' ? 'ALREADY KNOWN (what the founder already holds; keep these keys)' : 'CURRENT DATA (what the founder already holds; quotes are shortened here)', maiEmbed(p));
    if (pv.ret.length) L.push('Items in "retired" were set aside on purpose. Do not bring them back unless you find new evidence, and then say so in notes.');
    L.push('', 'OUTPUT FORMAT', 'Return exactly one JSON object inside one ```json code block. Nothing before it and nothing after it. Use this shape:');
    L.push.apply(L, MAI_SHAPE.map(function (l) { return l.replace('{mode}', MAI_TASK[o.mode] ? o.mode : 'discover'); }));
    L.push('', 'RULES',
      '1. Evidence or nothing. Every demand note and coverage rating cites a source from "sources", and every price rests on the pricing page listed in that competitor\'s "sources". A source is a page you opened: its title, its url, an exact quote copied from the page (at most 400 characters, in the language of the page) and the date you accessed it.',
      '2. Never invent. If you did not find it, use null (or [] for a list). Do not make up competitors, prices, quotes or links. An honest gap in the data is better than a plausible guess.',
      '3. Demand: "paid" = someone pays for it now (a priced plan, a paid service, a paid gig). "workaround" = people stitch tools, spreadsheets or templates together to do the job. "complaint" = someone is unhappy with what exists. "mention" = someone says they want it. Only paid and workaround evidence proves a gap. Never upgrade a complaint into a paid signal. A rival\'s own pricing or product page proves the market is served, not that a gap exists: cite it under that competitor, never as demand.',
      '4. Coverage: "full" = a customer would not need to look elsewhere for this job. "partial" = covers part of it, or only on a higher plan, or with workarounds. "none" = does not do it. Rate against the job. Ignore the marketing.',
      '5. Competitors: include real rivals and at least one substitute ("substitute": true), such as a spreadsheet, a generic tool or doing it by hand.',
      '6. Keys are kebab-case and stable. Keep every key that appears in the data above exactly as it is. New source ids are "n1", "n2" and so on. An existing id ("s1" and so on) may be used only to point at a page already listed above.',
      '7. Retire, never delete. Set "status": "retired" with a reason only when the evidence shows a job or competitor is gone or was never real. Anything you leave out stays as it is.',
      '8. Size. At most 15 jobs, 20 competitors, 8 channels, 12 demand notes per job and 40 sources: ScopeDue refuses a longer list, so keep the strongest. A job title is at most 80 characters, a note at most 200. Strengths, weaknesses and risks: at most 6 items of at most 80 characters each. Price: "$" under about 15 USD a month, "$$" 15 to 60, "$$$" above 60, "Free", or null.',
      '9. Language. Write every free-text value in ' + o.lang + '. Keys, enum values and dates stay in English. Quotes stay in the language of the page.',
      '10. No verdict, no advice and no markdown inside values. ScopeDue works out the verdict itself from what you return.',
      '11. Clones: "clone": true means it does almost exactly what this project plans. "dead": true means it shut down; give the reason in "died" with a source, and leave its coverage empty.',
      '12. List every search you ran in "queries", exactly as you typed it.', '',
      'CHECK BEFORE YOU ANSWER',
      '- The JSON parses: double quotes, no trailing commas, no comments.',
      '- Every "source" value and every item in "sources" points to an id in "sources" (or to an existing id above).',
      '- Every coverage "job" is a key in "jobs" (or in the data above).',
      '- meta.browsing is true only if you really opened the pages.');
    return L.join('\n');
  }
  function maiFixPrompt(ck) {
    var L = ['Your last answer could not be imported into ScopeDue. Fix only what is listed below and return the complete corrected JSON object in one ```json code block. Nothing before it and nothing after it.', '', 'PROBLEMS'];
    if (ck.bad) { L.push('- The answer is not valid JSON: ' + ck.err.msg + (ck.err.line ? ' Near line ' + ck.err.line + ', column ' + ck.err.col + '.' : '') + (ck.err.cut ? ' It looks cut off. Return the whole object again, shorter if needed (fewer sources, shorter notes).' : '')); }
    else ck.v.E.slice(0, 20).forEach(function (e) { L.push('- ' + e.path + ' ' + e.msg); });
    return L.join('\n');
  }

  /* find the JSON inside whatever the model sent back */
  function maiScan(t) {
    var spans = [], depth = 0, str = false, esc = false, start = -1, i, c;
    for (i = 0; i < t.length; i++) {
      c = t.charAt(i);
      if (str) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') str = false; continue; }
      if (c === '"') { if (depth > 0) str = true; continue; }
      if (c === '{') { if (depth === 0) start = i; depth++; }
      else if (c === '}' && depth > 0) { depth--; if (depth === 0) spans.push([start, i + 1]); }
    }
    return { spans: spans, open: depth };
  }
  function maiRepair(s) {
    var out = '', str = false, esc = false, i, c, j;
    for (i = 0; i < s.length; i++) {
      c = s.charAt(i);
      if (str) { out += c; if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') str = false; continue; }
      if (c === '"') { str = true; out += c; continue; }
      if (c === ',') { j = i + 1; while (j < s.length && /\s/.test(s.charAt(j))) j++; if (s.charAt(j) === '}' || s.charAt(j) === ']') continue; }
      out += c;
    }
    return out;
  }
  function maiTry(s) {
    try { return { v: JSON.parse(s), fixed: false }; } catch (e) {}
    try { return { v: JSON.parse(maiRepair(s)), fixed: true }; } catch (e2) {}
    return null;
  }
  /* index of the first syntax error in a JSON text, or -1. Used only to say where, because engines differ in what they report. */
  function maiPos(s) {
    var i = 0, n = s.length;
    function ws() { while (i < n && ' \t\r\n'.indexOf(s.charAt(i)) > -1) i++; }
    function str() {
      var c;
      i++;
      while (i < n) { c = s.charAt(i); if (c === '\\') i += 2; else if (c === '"') { i++; return true; } else if (c === '\n') return false; else i++; }
      return false;
    }
    function val() {
      var c, m, obj;
      ws(); c = s.charAt(i);
      if (c === '{' || c === '[') {
        obj = c === '{'; i++; ws();
        if (s.charAt(i) === (obj ? '}' : ']')) { i++; return true; }
        for (;;) {
          ws();
          if (obj) { if (s.charAt(i) !== '"' || !str()) return false; ws(); if (s.charAt(i) !== ':') return false; i++; }
          if (!val()) return false;
          ws();
          if (s.charAt(i) === ',') { i++; continue; }
          if (s.charAt(i) === (obj ? '}' : ']')) { i++; return true; }
          return false;
        }
      }
      if (c === '"') return str();
      m = /^(-?\d+(\.\d+)?([eE][+-]?\d+)?|true|false|null)/.exec(s.slice(i, i + 40));
      if (m) { i += m[0].length; return true; }
      return false;
    }
    if (!val()) return i;
    ws();
    return i < n ? i : -1;
  }
  function maiExtract(text) {
    var t = String(text || '').replace(/^﻿/, '').trim(), c = [], re = /```[a-zA-Z]*[ \t]*\r?\n?([\s\S]*?)```/g, m, i, r, fb = null, sc, ix;
    if (!t) return { empty: true };
    while ((m = re.exec(t))) c.push({ s: m[1].trim(), via: 'fence' });
    ix = t.search(/\{\s*"schema"\s*:/);
    if (ix >= 0) { sc = maiScan(t.slice(ix)); if (sc.spans[0] && !(ix === 0 && sc.spans[0][1] === t.length)) c.push({ s: t.slice(ix + sc.spans[0][0], ix + sc.spans[0][1]), via: 'text' }); }
    c.push({ s: t, via: 'raw' });
    maiScan(t).spans.forEach(function (sp) { c.push({ s: t.slice(sp[0], sp[1]), via: 'text' }); });
    for (i = 0; i < c.length; i++) {
      r = maiTry(c[i].s);
      if (r && r.v && typeof r.v === 'object' && !Array.isArray(r.v)) { r.via = c[i].via === 'raw' ? 'raw' : c[i].via; if (r.v.schema === MAI_SCHEMA) return r; if (!fb) fb = r; }
    }
    if (fb) return fb;
    var from = t.indexOf('{'), body, msg = '', line = 0, col = 0, cut = false, pos;
    if (from < 0) return { err: { msg: 'No JSON object found. The answer must start with { and end with }.', line: 0, col: 0, cut: false } };
    body = c.filter(function (x) { return x.via === 'fence' && x.s.indexOf('{') > -1; })[0];
    body = body ? body.s.slice(body.s.indexOf('{')) : t.slice(from);
    cut = maiScan(body).open > 0;
    try { JSON.parse(body); } catch (e) {
      msg = String(e.message || e);
      var mp = /position (\d+)/.exec(msg), ml = /line (\d+) column (\d+)/.exec(msg);
      if (ml) { line = +ml[1]; col = +ml[2]; }
      else { pos = mp ? +mp[1] : (cut ? -1 : maiPos(body)); if (pos > -1) { var up = body.slice(0, pos).split('\n'); line = up.length; col = up[up.length - 1].length + 1; } }
    }
    msg = msg.replace(/^JSON\.parse: /, '').replace(/ in JSON at position \d+.*/, '').replace(/\s*\(line \d+ column \d+\)/, '').replace(/ at line \d+ column \d+.*/, '').replace(/,\s*(\.\.\.)?"[\s\S]*" is not valid JSON\s*$/, '').replace(/^"[\s\S]*" is not valid JSON\s*$/, 'Text that is not JSON');
    if (cut) msg = 'The answer looks cut off: the JSON is not closed.';
    msg = msg ? msg.replace(/[\s.]+$/, '') + '.' : 'The text could not be read as JSON.';
    return { err: { msg: msg, line: line, col: col, cut: cut } };
  }

  /* check the shape. Errors block the import and name the path. Small things are fixed silently or become a warning. */
  function maiCheckObj(o, p) {
    var E = [], W = [], N = { meta: {}, proj: {}, jobs: [], comps: [], srcs: [], notes: [] }, trimmed = 0, today = prvIso(Date.now()), K = prvKeys(p), exJ = {}, exK = {}, retK = {}, sids = {}, jk = {}, ckk = {}, noLink = 0, noQuote = 0, dateMiss = 0, skipRet = 0;
    p.pv.jobs.forEach(function (j) { exJ[K.jk[j.id]] = 1; }); p.pv.comps.forEach(function (c) { exK[K.ck[c.id]] = 1; }); p.pv.ret.forEach(function (r) { retK[r.key] = 1; });
    function err(path, msg) { E.push({ path: path, msg: msg }); }
    function isO(v) { return v && typeof v === 'object' && !Array.isArray(v); }
    function str(v, path, max, req, min) {
      if (v == null || v === '') { if (req) err(path, 'is required'); return ''; }
      if (typeof v !== 'string') { err(path, 'must be text, not ' + (Array.isArray(v) ? 'a list' : typeof v)); return ''; }
      var s = prvText(v);
      if (min && s.length < min) err(path, 'is too short (at least ' + min + ' characters)');
      if (s.length > max) { s = s.slice(0, max - 1) + '…'; trimmed++; }
      return s;
    }
    function list(v, path, max, imax) {
      if (v == null) return null;
      if (!Array.isArray(v)) { err(path, 'must be a list'); return null; }
      var out = [];
      v.forEach(function (x, i) { var s = str(x, path + '[' + i + ']', imax, true, 2); if (!s) return; if (out.some(function (y) { return maiNorm(y) === maiNorm(s); })) return; if (out.length >= max) { trimmed++; return; } out.push(s); });
      return out.length ? out : null;
    }
    function en(v, path, set, req) {
      if (v == null || v === '') { if (req) err(path, 'is required. Use one of: ' + set.join(', ')); return ''; }
      var s = String(v).trim().toLowerCase();
      if (set.indexOf(s) < 0) { err(path, '“' + prvT(String(v), 30) + '” is not allowed. Use one of: ' + set.join(', ')); return ''; }
      return s;
    }
    function arr(v, path, max) {
      if (v == null) return [];
      if (!Array.isArray(v)) { err(path, 'must be a list'); return []; }
      if (v.length > max) { err(path, 'has ' + v.length + ' items. At most ' + max + ' are accepted; ask the model for fewer.'); return v.slice(0, max); }
      return v;
    }
    function isDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)); }
    if (!isO(o)) { err('(root)', 'must be one JSON object'); return { E: E, W: W, N: N }; }
    if (o.schema !== MAI_SCHEMA) err('schema', 'must be "' + MAI_SCHEMA + '"' + (o.schema ? ', not "' + prvT(String(o.schema), 40) + '"' : ''));
    if (o.meta != null && !isO(o.meta)) err('meta', 'must be an object');
    var m = isO(o.meta) ? o.meta : {};
    N.meta.mode = MAI_MODES.indexOf(m.mode) > -1 ? m.mode : '';
    N.meta.model = prvT(prvText(typeof m.model === 'string' ? m.model : ''), 60);
    N.meta.exp = m.mode === 'export';
    N.meta.browsing = N.meta.exp ? null : m.browsing === true ? true : m.browsing === false ? false : null;
    N.meta.as_of = isDate(m.as_of) ? (m.as_of > today ? today : m.as_of) : today;
    if (!isDate(m.as_of)) W.push('meta.as_of is missing or not a date. Today is used.');
    /* sources first: everything else points at them */
    arr(o.sources, 'sources', 40).forEach(function (s, i) {
      var pa = 'sources[' + i + ']';
      if (!isO(s)) return err(pa, 'must be an object');
      var id = str(s.id, pa + '.id', 24, true), u = '', host = '';
      if (id && sids[id]) err(pa + '.id', '“' + id + '” is used twice');
      if (s.url != null && typeof s.url !== 'string') err(pa + '.url', 'must be text');
      else if (typeof s.url === 'string' && s.url.trim()) {
        u = s.url.trim();
        try { var uo = new URL(/^[a-z][a-z0-9+.-]*:/i.test(u) ? u : 'https://' + u); if (/^https?:$/.test(uo.protocol) && uo.hostname.indexOf('.') > 0) { u = uo.href; host = uo.hostname.replace(/^www\./, ''); } else { err(pa + '.url', 'is not a web link'); u = ''; } } catch (e) { err(pa + '.url', 'is not a web link'); u = ''; }
      }
      var title = str(s.title, pa + '.title', 120, true, 2), quote = str(s.quote, pa + '.quote', 4000, false), dt = s.accessed;
      if (!u && !(s.url != null && typeof s.url === 'string' && s.url.trim())) noLink++;
      if (!quote) noQuote++;
      if (!isDate(dt)) { dateMiss++; dt = N.meta.as_of; } else if (dt > today) dt = today;
      var x = { id: id, title: title, url: u, host: host, quote: quote, date: dt };
      if (id) sids[id] = x;
      N.srcs.push(x);
    });
    function ref(v, path) {
      if (v == null || v === '') return null;
      if (typeof v !== 'string') { err(path, 'must be a source id (text) or null'); return null; }
      var id = v.trim();
      if (sids[id] || maiExSrc(p, id)) return id;
      err(path, 'points to “' + prvT(id, 24) + '”, which is not in sources and is not an existing source'); return null;
    }
    /* jobs */
    arr(o.jobs, 'jobs', 15).forEach(function (j, i) {
      var pa = 'jobs[' + i + ']';
      if (!isO(j)) return err(pa, 'must be an object');
      var title = str(j.title, pa + '.title', 80, true, 4), key = maiKey(j.key || title), st = en(j.status == null ? 'active' : j.status, pa + '.status', ['active', 'retired']), dem = [];
      if (!j.key && !title) key = '';
      if (key && jk[key]) err(pa + '.key', 'duplicates “' + key + '”');
      arr(j.demand, pa + '.demand', 12).forEach(function (d, k) {
        var pd2 = pa + '.demand[' + k + ']';
        if (!isO(d)) return err(pd2, 'must be an object');
        dem.push({ k: en(d.kind, pd2 + '.kind', Object.keys(PRV_DEM), true), x: str(d.note, pd2 + '.note', 200, true, 4), src: ref(d.source, pd2 + '.source') });
      });
      var it = { key: key, title: title, status: st || 'active', reason: str(j.reason, pa + '.reason', 160), dem: dem };
      if (key) jk[key] = it;
      N.jobs.push(it);
    });
    function jobKnown(k) { return !!(jk[k] || exJ[k] || retK[k]); }
    /* competitors */
    arr(o.competitors, 'competitors', 20).forEach(function (c, i) {
      var pa = 'competitors[' + i + ']';
      if (!isO(c)) return err(pa, 'must be an object');
      var name = str(c.name, pa + '.name', 60, true, 2), key = maiKey(c.key || name), st = en(c.status == null ? 'active' : c.status, pa + '.status', ['active', 'retired']);
      if (key && ckk[key]) err(pa + '.key', 'duplicates “' + key + '”');
      var pos = c.positioning == null ? null : str(c.positioning, pa + '.positioning', 80), price = null, sub = null;
      if (c.price != null && c.price !== '') {
        var pr = String(c.price).trim().toLowerCase(), canon = PRV_PRICE.filter(function (x) { return x.toLowerCase() === pr; })[0];
        if (canon) price = canon; else W.push(pa + '.price “' + prvT(String(c.price), 20) + '” is not one of $, $$, $$$, Free. It was ignored.');
      }
      if (c.substitute != null) { if (typeof c.substitute === 'boolean') sub = c.substitute; else err(pa + '.substitute', 'must be true or false'); }
      var cov = [], seen = {};
      arr(c.coverage, pa + '.coverage', 20).forEach(function (v, k) {
        var pc = pa + '.coverage[' + k + ']';
        if (!isO(v)) return err(pc, 'must be an object');
        var job = v.job == null ? '' : maiKey(String(v.job));
        if (!job) err(pc + '.job', 'is required'); else if (!jobKnown(job)) err(pc + '.job', '“' + prvT(job, 40) + '” is not a job key in this answer or in the project');
        var lv = en(v.level, pc + '.level', ['none', 'partial', 'full'], true), r = ref(v.source, pc + '.source');
        if (job && seen[job]) { W.push(pa + '.coverage rates “' + prvT(job, 30) + '” twice. The first rating is used.'); return; }
        if (job) seen[job] = 1;
        cov.push({ job: job, l: lv, src: r });
      });
      var srcs = [];
      if (c.sources != null && !Array.isArray(c.sources)) err(pa + '.sources', 'must be a list of source ids');
      else (c.sources || []).forEach(function (x, k) { var r = ref(x, pa + '.sources[' + k + ']'); if (r && srcs.indexOf(r) < 0) srcs.push(r); });
      var bo = function (v, f) { if (v == null) return null; if (typeof v !== 'boolean') { err(pa + '.' + f, 'must be true or false'); return null; } return v; };
      var it = { key: key, name: name, status: st || 'active', reason: str(c.reason, pa + '.reason', 160), pos: pos, price: price, sub: sub, str: list(c.strengths, pa + '.strengths', 6, 80), weak: list(c.weaknesses, pa + '.weaknesses', 6, 80), cov: cov, srcs: srcs, clone: bo(c.clone, 'clone'), dead: bo(c.dead, 'dead'), died: str(c.died, pa + '.died', 160) };
      if (key) ckk[key] = it;
      N.comps.push(it);
    });
    /* channels, and the searches the model says it ran */
    N.chans = [];
    arr(o.channels, 'channels', 8).forEach(function (c, i) {
      var pa = 'channels[' + i + ']'; if (!isO(c)) return err(pa, 'must be an object');
      var u = '';
      if (typeof c.url === 'string' && c.url.trim()) { try { var uo = new URL(/^[a-z][a-z0-9+.-]*:/i.test(c.url.trim()) ? c.url.trim() : 'https://' + c.url.trim()); if (/^https?:$/.test(uo.protocol) && uo.hostname.indexOf('.') > 0) u = uo.href; else W.push(pa + '.url is not a web link. It was left out.'); } catch (e) { W.push(pa + '.url is not a web link. It was left out.'); } }
      var nm = str(c.name, pa + '.name', 60, true, 2); if (!nm) return;
      N.chans.push({ name: nm, url: u, size: str(c.size, pa + '.size', 60), why: str(c.why, pa + '.why', 140), src: ref(c.source, pa + '.source') });
    });
    N.qs = list(o.queries, 'queries', 40, 140) || [];
    /* the founder's own plan */
    if (o.project != null && !isO(o.project)) err('project', 'must be an object');
    var pr = isO(o.project) ? o.project : {};
    N.proj.wedge = pr.wedge == null ? null : (str(pr.wedge, 'project.wedge', 160) || null);
    N.proj.wj = null;
    if (pr.wedge_job != null && pr.wedge_job !== '') { var wk = maiKey(String(pr.wedge_job)); if (!jobKnown(wk)) err('project.wedge_job', '“' + prvT(wk, 40) + '” is not a job key in this answer or in the project'); else N.proj.wj = wk; }
    N.proj.str = list(pr.strengths, 'project.strengths', 6, 80); N.proj.weak = list(pr.weaknesses, 'project.weaknesses', 6, 80); N.proj.risk = list(pr.risks, 'project.risks', 6, 80);
    N.notes = (Array.isArray(o.notes) ? o.notes : []).filter(function (x) { return typeof x === 'string' && prvText(x); }).slice(0, 8).map(function (x) { return prvT(prvText(x), 300); });
    if (trimmed) W.push(trimmed + (trimmed === 1 ? ' value was' : ' values were') + ' longer than allowed and was shortened.');
    if (noLink) W.push(noLink + (noLink === 1 ? ' source has' : ' sources have') + ' no link, so you cannot check ' + (noLink === 1 ? 'it' : 'them') + ' yourself.');
    if (noQuote) W.push(noQuote + (noQuote === 1 ? ' source has' : ' sources have') + ' no quote.');
    if (dateMiss) W.push(dateMiss + (dateMiss === 1 ? ' source has' : ' sources have') + ' no valid accessed date. The answer date is used.');
    if (N.meta.browsing === null && !N.meta.exp) W.push('The model did not say whether it browsed the web (meta.browsing).');
    if (N.meta.exp) W.push('This is a ScopeDue export, so it holds no new research. Nothing in it counts as new evidence.');
    var age = prvAge(Date.parse(N.meta.as_of + 'T12:00:00')); if (age > 7) W.push('The answer is dated ' + N.meta.as_of + ', ' + age + ' days ago.');
    return { E: E, W: W, N: N };
  }

  /* the plan: what would change, row by row. Nothing is touched here. */
  function maiPlan(p, N, fps, mode) {
    var pv = p.pv, K = prvKeys(p), jBy = {}, kBy = {}, rows = [], rid = 0, jm = {}, newSrc = [], sres = {}, sdt = {}, plan = { N: N, mode: mode, rows: rows, same: 0, skipped: 0, untJ: 0, untK: 0, warns: [], notes: N.notes, nobrowse: N.meta.browsing === false, snap: prvSnap(p) };
    pv.jobs.forEach(function (j) { jBy[K.jk[j.id]] = j; }); pv.comps.forEach(function (c) { kBy[K.ck[c.id]] = c; });
    N.srcs.forEach(function (s) {
      if (s.id) sdt[s.id] = Date.parse(s.date + 'T12:00:00') || 0;
      var hit = pv.src.filter(function (e) { return s.url ? (e.u && maiUrl(e.u) === maiUrl(s.url) && maiNorm(e.txt) === maiNorm(s.quote)) : (!e.u && maiNorm(e.t) === maiNorm(s.title) && maiNorm(e.txt) === maiNorm(s.quote)); })[0];
      if (hit) { sres[s.id] = { n: hit.n }; return; }
      if (maiExSrc(p, s.id)) plan.warns.push('Source ' + s.id + ' is already in the project with other text. The new text is kept as a separate snapshot.');
      sres[s.id] = { i: newSrc.length }; newSrc.push({ s: s, fp: fps[s.id] || '' });
    });
    plan.newSrc = newSrc;
    function R(id) { if (!id) return null; if (sres[id]) return sres[id]; var e = maiExSrc(p, id); return e ? { n: e.n } : null; }
    function sname(r) { if (!r) return ''; var s = r.n ? prvSrc(p, r.n) : newSrc[r.i].s; return s ? (s.t || s.title) : ''; }
    var used = {};
    N.jobs.forEach(function (j) {
      var cur = jBy[j.key] || pv.jobs.filter(function (x) { return maiNorm(x.t) === maiNorm(j.title); })[0] || null;
      if (cur) { used[cur.id] = 1; jm[j.key] = { id: cur.id }; }
      if (j.status === 'retired') {
        if (cur) rows.push({ id: 'r' + (++rid), kind: 'job', op: 'ret', cur: cur.id, key: K.jk[cur.id], title: cur.t, why: j.reason, lines: [{ o: '−', x: j.reason || 'No reason given.' }], on: false });
        else plan.skipped++;
        return;
      }
      var dem = j.dem.map(function (d) { return { d: d, r: R(d.src) }; });
      if (!cur) {
        var id = 'r' + (++rid); jm[j.key] = { row: id };
        rows.push({ id: id, kind: 'job', op: 'new', cur: null, key: j.key, title: j.title, N: j, dem: dem, on: true,
          lines: dem.length ? dem.map(function (a) { return { o: '+', x: PRV_DEM[a.d.k] + ': ' + prvT(a.d.x, 90) + (a.r ? '' : ' (no source)') }; }) : [{ o: '', x: 'No demand evidence yet.' }] });
        return;
      }
      var lines = [], add = [], setSrc = [], ren = maiNorm(cur.t) !== maiNorm(j.title);
      if (ren) lines.push({ o: '~', x: 'Renamed from “' + prvT(cur.t, 50) + '”' });
      dem.forEach(function (a) {
        var e = cur.dem.filter(function (x) { return x.k === a.d.k && maiNorm(x.x) === maiNorm(a.d.x); })[0];
        if (e) { if (!e.src && a.r) { setSrc.push({ e: e.id, r: a.r }); lines.push({ o: '~', x: 'Source added: “' + prvT(a.d.x, 60) + '”' }); } }
        else { add.push(a); lines.push({ o: '+', x: PRV_DEM[a.d.k] + ': ' + prvT(a.d.x, 90) + (a.r ? '' : ' (no source)') }); }
      });
      if (!lines.length) { plan.same++; return; }
      rows.push({ id: 'r' + (++rid), kind: 'job', op: 'chg', cur: cur.id, key: K.jk[cur.id], title: ren ? j.title : cur.t, N: j, ren: ren, add: add, setSrc: setSrc, lines: lines, on: true });
    });
    plan.untJ = pv.jobs.filter(function (j) { return !used[j.id]; }).length;
    function target(key) { return jm[key] || (jBy[key] ? { id: jBy[key].id } : null); }
    function tname(t) { if (t.id) return prvById(pv.jobs, t.id).t; var rr = rows.filter(function (x) { return x.id === t.row; })[0]; return rr ? rr.title : ''; }
    var usedK = {};
    N.comps.forEach(function (c) {
      var cur = kBy[c.key] || pv.comps.filter(function (x) { return maiNorm(x.n) === maiNorm(c.name); })[0] || null;
      if (cur) usedK[cur.id] = 1;
      if (c.status === 'retired') {
        if (cur) rows.push({ id: 'r' + (++rid), kind: 'comp', op: 'ret', cur: cur.id, key: K.ck[cur.id], title: cur.n, why: c.reason, lines: [{ o: '−', x: c.reason || 'No reason given.' }], on: false });
        else plan.skipped++;
        return;
      }
      var cov = [], lines = [], skipCov = 0;
      c.cov.forEach(function (v) {
        var t = target(v.job), r = R(v.src);
        if (!t) { skipCov++; return; }
        var old = cur && t.id ? cur.cov[t.id] : null, jn = tname(t);
        if (!old) { cov.push({ t: t, l: v.l, r: r }); lines.push({ o: '+', x: 'Rating · ' + prvT(jn, 50) + ': ' + PRV_LV[v.l] + (r ? '' : ' (no source)') }); }
        else if (old.l !== v.l) { cov.push({ t: t, l: v.l, r: r }); lines.push({ o: '~', x: 'Rating · ' + prvT(jn, 50) + ': ' + PRV_LV[old.l] + ' → ' + PRV_LV[v.l] }); }
        else if (!old.s && r) { cov.push({ t: t, l: v.l, r: r }); lines.push({ o: '~', x: 'Rating · ' + prvT(jn, 50) + ': source added' }); }
      });
      var srcs = c.srcs.map(R).filter(Boolean);
      if (cur) srcs = srcs.filter(function (r) { return !(r.n && cur.src.indexOf(r.n) > -1); });
      if (skipCov) plan.warns.push(c.name + ': ' + skipCov + (skipCov === 1 ? ' rating points' : ' ratings point') + ' at a job that is not on the map. Skipped.');
      if (!cur) {
        var id = 'r' + (++rid), head = [c.pos, c.price].filter(Boolean).join(' · '), sl = [];
        if (head) sl.push({ o: '', x: head });
        if (c.str) sl.push({ o: '+', x: 'Strengths: ' + prvT(c.str.join(', '), 90) });
        if (c.weak) sl.push({ o: '+', x: 'Weaknesses: ' + prvT(c.weak.join(', '), 90) });
        if (c.dead) sl.push({ o: '', x: 'Shut down' + (c.died ? ': ' + prvT(c.died, 90) : '') });
        rows.push({ id: id, kind: 'comp', op: 'new', cur: null, key: c.key, title: c.name, sub: !!c.sub, clone: !!c.clone, N: c, cov: c.dead ? [] : cov, srcs: srcs, on: true, lines: sl.concat(c.dead ? [] : lines.length ? lines : [{ o: '', x: 'No ratings yet.' }]) });
        return;
      }
      var set = {}, cited = c.srcs.concat(c.cov.map(function (v) { return v.src; })).filter(function (id) { return id && sdt[id]; }), seen = Math.max.apply(null, [0].concat(cited.map(function (id) { return sdt[id]; })));
      if (c.pos && maiNorm(c.pos) !== maiNorm(cur.pos)) { set.pos = c.pos; lines.unshift({ o: '~', x: 'Positioning: ' + prvT(c.pos, 80) }); }
      if (c.price && c.price !== cur.price) { set.price = c.price; lines.unshift({ o: '~', x: 'Price: ' + (cur.price || 'unknown') + ' → ' + c.price }); }
      if (c.sub !== null && c.sub !== cur.sub) { set.sub = c.sub; lines.unshift({ o: '~', x: c.sub ? 'Now counted as a substitute' : 'No longer counted as a substitute' }); }
      /* a false copied from the shape is not evidence: taking a mark off needs a page the model opened for this rival in this answer */
      if (c.clone !== null && c.clone !== !!cur.clone && (c.clone || cited.length)) { set.clone = c.clone; lines.unshift({ o: '~', x: c.clone ? 'Marked as a clone' : 'No longer a clone' }); }
      if (c.dead !== null && c.dead !== !!cur.dead && (c.dead || cited.length)) { set.dead = c.dead; set.died = c.died || ''; lines.unshift({ o: '~', x: c.dead ? 'Shut down' + (c.died ? ': ' + prvT(c.died, 80) : '') : 'Active again' }); }
      /* re-checked: the same page with the same words is not a new source, but it is a fresh check, so the rival is no longer stale */
      var ck0 = cur.chk || 0; cur.src.forEach(function (n) { var so = prvSrc(p, n); if (so && so.ts > ck0) ck0 = so.ts; });
      if (seen && prvIso(seen) > prvIso(ck0)) { set.chk = Math.min(seen, Date.now()); if (!lines.length && !srcs.length) lines.push({ o: '~', x: 'Checked again on ' + prvDate(seen) + '. Nothing changed' }); }
      [['str', 'str', 'Strength'], ['weak', 'weak', 'Weakness']].forEach(function (f) {
        if (!c[f[0]]) return;
        var d = maiDiff(cur[f[1]], c[f[0]]);
        if (d.add.length || d.del.length) { set[f[0]] = c[f[0]]; d.add.forEach(function (x) { lines.push({ o: '+', x: f[2] + ': ' + x }); }); d.del.forEach(function (x) { lines.push({ o: '−', x: f[2] + ' dropped: ' + x }); }); }
      });
      srcs.forEach(function (r) { lines.push({ o: '~', x: 'Fresh source: ' + prvT(sname(r), 70) }); });
      if (!lines.length) { plan.same++; return; }
      rows.push({ id: 'r' + (++rid), kind: 'comp', op: 'chg', cur: cur.id, key: K.ck[cur.id], title: cur.n, N: c, set: set, cov: cov, srcs: srcs, lines: lines, on: true });
    });
    plan.untK = pv.comps.filter(function (c) { return !usedK[c.id]; }).length;
    var haveCh = (pv.channels || []).map(function (c) { return maiNorm(c.n); });
    (N.chans || []).forEach(function (c) {
      if (haveCh.indexOf(maiNorm(c.name)) > -1) { plan.same++; return; }
      haveCh.push(maiNorm(c.name));
      rows.push({ id: 'r' + (++rid), kind: 'chan', op: 'new', cur: null, key: '', title: c.name, N: c, r: R(c.src), on: true, lines: [{ o: '', x: [c.size, c.why].filter(Boolean).join(' · ') || 'No notes' }].concat(c.url ? [{ o: '', x: c.url }] : []) });
    });
    plan.qs = N.qs || [];
    /* the founder's own plan: off by default */
    var P = N.proj, pl = {}, pln = [], ch = mode === 'challenge';
    /* a challenge argues against the product: it may add risks, and leaves the wedge, strengths and weaknesses as they are */
    if (ch) P = { risk: P.risk };
    if (P.wedge && maiNorm(P.wedge) !== maiNorm(pv.wedge.t)) { pl.wedge = P.wedge; pln.push({ o: '~', x: 'Wedge: “' + prvT(P.wedge, 100) + '”' }); }
    if (P.wj) { var tw = target(P.wj); if (tw && (tw.row || tw.id !== pv.wedge.job)) { pl.wj = tw; pln.push({ o: '~', x: 'Wedge rests on “' + prvT(tname(tw), 60) + '”' }); } }
    [['str', 'win', 'Strength'], ['weak', 'weak', 'Weakness'], ['risk', 'risk', 'Risk']].forEach(function (f) {
      if (!P[f[0]]) return;
      var d = maiDiff(pv.asm[f[1]].map(function (x) { return x.t; }), P[f[0]]);
      if (d.add.length || d.del.length) { pl[f[0]] = P[f[0]]; d.add.forEach(function (x) { pln.push({ o: '+', x: f[2] + ': ' + x }); }); d.del.forEach(function (x) { pln.push({ o: '−', x: f[2] + ' dropped: ' + x }); }); }
    });
    if (pln.length) rows.push({ id: 'r' + (++rid), kind: 'plan', op: 'chg', cur: null, key: '', title: mode === 'challenge' ? 'Risks it found' : 'Your wedge and risks', pl: pl, lines: mode === 'challenge' ? pln.filter(function (l) { return l.o !== '−'; }) : pln, on: mode === 'challenge' });
    return plan;
  }

  /* apply a plan to a project (the real one, or a throwaway copy for the preview) */
  function maiApply(p, plan, sel) {
    var pv = p.pv, now = Date.now(), impId = prvId('a'), jid = {}, usedS = {}, cnt = { jn: 0, jc: 0, jr: 0, kn: 0, kc: 0, kr: 0, sn: 0, pl: 0 }, want = function (r) { return sel[r.id] === true; };
    function useSrc(r) {
      if (!r) return 0;
      if (r.n) return r.n;
      if (usedS[r.i]) return usedS[r.i];
      var ns = plan.newSrc[r.i], s = ns.s, d = Date.parse(s.date + 'T12:00:00'), o;
      o = { n: pv.sn++, t: s.title, u: s.url, host: s.host || 'No link', txt: s.quote, ts: isNaN(d) ? now : Math.min(d, now), fp: ns.fp, sample: false, ai: true, ver: false, imp: impId };
      pv.src.push(o); cnt.sn++; usedS[r.i] = o.n; return o.n;
    }
    function jobOf(t) { if (!t) return ''; if (t.id) return prvById(pv.jobs, t.id) ? t.id : ''; return jid[t.row] || ''; }
    plan.rows.filter(function (r) { return want(r) && r.kind === 'job' && r.op === 'new'; }).forEach(function (r) {
      var j = { id: prvId('j'), t: r.N.title, ts: now, dem: [], items: [], imp: impId };
      r.dem.forEach(function (a) { j.dem.push({ id: prvId('e'), k: a.d.k, x: a.d.x, src: useSrc(a.r) }); });
      pv.jobs.push(j); jid[r.id] = j.id; cnt.jn++;
    });
    plan.rows.filter(function (r) { return want(r) && r.kind === 'job' && r.op === 'chg'; }).forEach(function (r) {
      var j = prvById(pv.jobs, r.cur); if (!j) return;
      if (r.ren) j.t = r.N.title;
      r.setSrc.forEach(function (s) { var e = prvById(j.dem, s.e); if (e && !e.src) e.src = useSrc(s.r); });
      r.add.forEach(function (a) { j.dem.push({ id: prvId('e'), k: a.d.k, x: a.d.x, src: useSrc(a.r) }); });
      cnt.jc++;
    });
    plan.rows.filter(function (r) { return want(r) && r.kind === 'comp' && r.op !== 'ret'; }).forEach(function (r) {
      var c;
      if (r.op === 'new') {
        c = { id: prvId('m'), n: r.N.name, pos: r.N.pos || '', price: r.N.price || '', str: (r.N.str || []).slice(), weak: (r.N.weak || []).slice(), src: [], ts: now, sub: !!r.N.sub, cov: {}, chk: 0, imp: impId, clone: !!r.N.clone, dead: !!r.N.dead, died: r.N.died || '' };
        pv.comps.push(c); cnt.kn++;
      } else {
        c = prvById(pv.comps, r.cur); if (!c) return;
        ['pos', 'price', 'sub', 'str', 'weak', 'clone', 'dead', 'died', 'chk'].forEach(function (f) { if (r.set[f] !== undefined) c[f] = f === 'str' || f === 'weak' ? r.set[f].slice() : r.set[f]; });
        cnt.kc++;
      }
      r.cov.forEach(function (v) { var j = jobOf(v.t); if (!j) return; var old = c.cov[j]; c.cov[j] = { l: v.l, s: v.r ? useSrc(v.r) : (old && old.l === v.l ? old.s : 0) }; });
      r.srcs.forEach(function (x) { var n = useSrc(x); if (n && c.src.indexOf(n) < 0) c.src.push(n); });
    });
    plan.rows.filter(function (r) { return want(r) && r.kind === 'plan'; }).forEach(function (r) {
      var pl = r.pl, w = pv.wedge;
      if (pl.wedge) w.t = pl.wedge;
      if (pl.wj) { var jj = jobOf(pl.wj); if (jj) w.job = jj; }
      [['str', 'win'], ['weak', 'weak'], ['risk', 'risk']].forEach(function (f) {
        if (!pl[f[0]]) return;
        var old = pv.asm[f[1]];
        if (plan.mode === 'challenge') { pl[f[0]].forEach(function (t) { if (!old.some(function (x) { return maiNorm(x.t) === maiNorm(t); })) old.push({ id: prvId('w'), t: t }); }); return; }
        pv.asm[f[1]] = pl[f[0]].map(function (t) { var e = old.filter(function (x) { return maiNorm(x.t) === maiNorm(t); })[0]; return e || { id: prvId('w'), t: t }; });
      });
      cnt.pl = 1;
    });
    plan.rows.filter(function (r) { return want(r) && r.op === 'ret'; }).sort(function (a, b) { return (a.kind === 'comp' ? 0 : 1) - (b.kind === 'comp' ? 0 : 1); }).forEach(function (r) {
      if (r.kind === 'job') {
        var j = prvById(pv.jobs, r.cur); if (!j) return;
        var cv = {}; pv.comps.forEach(function (c) { if (c.cov[j.id]) { cv[c.id] = c.cov[j.id]; delete c.cov[j.id]; } });
        pv.ret.push({ id: prvId('r'), kind: 'job', key: r.key, ts: now, why: r.why || '', d: j, cov: cv, wedge: pv.wedge.job === j.id, imp: impId });
        pv.jobs.splice(pv.jobs.indexOf(j), 1); if (pv.wedge.job === j.id) pv.wedge.job = '';
        cnt.jr++;
      } else {
        var k = prvById(pv.comps, r.cur); if (!k) return;
        pv.ret.push({ id: prvId('r'), kind: 'comp', key: r.key, ts: now, why: r.why || '', d: k, cov: {}, wedge: false, imp: impId });
        pv.comps.splice(pv.comps.indexOf(k), 1); cnt.kr++;
      }
    });
    plan.rows.filter(function (r) { return want(r) && r.kind === 'chan'; }).forEach(function (r) {
      pfArr(pv, 'channels').push({ id: prvId('h'), n: r.N.name, u: r.N.url, size: r.N.size || '', why: r.N.why || '', src: r.r ? useSrc(r.r) : 0, ts: now, imp: impId }); cnt.ch = (cnt.ch || 0) + 1;
    });
    pv.imp.push({ id: impId, ts: now, mode: plan.mode, model: plan.N.meta.model, as_of: plan.N.meta.as_of, sample: false, n: cnt, q: (plan.qs || []).slice(0, 40) });
    return cnt;
  }
  function maiPreview(p, plan, sel) {
    var q = { id: p.id, n: p.n, thesis: p.thesis, pv: JSON.parse(JSON.stringify(p.pv)) }, cnt = maiApply(q, plan, sel);
    return { k: prvVerdict(q).k, cnt: cnt };
  }

  /* ---------- research with AI: the drawer ---------- */
  var MAI = function (id) { return document.getElementById('mai-' + id); };
  var maiNav = MAI('steps'), maiPanes = [MAI('s1'), MAI('s2'), MAI('s3')], maiFoots = [MAI('f1'), MAI('f2'), MAI('f3')], maiModesEl = MAI('modes'), maiSw = MAI('sc'), maiLang = MAI('lang'), maiFocus = MAI('focus'), maiPr = MAI('prompt'), maiPc = MAI('pcnt');
  var maiIn = MAI('in'), maiChk = MAI('chk'), maiFile = MAI('file'), maiRv = MAI('rv'), maiCopy = MAI('copy'), maiNext = MAI('next'), maiFix = MAI('fix'), maiGo2 = MAI('go2'), maiOk = MAI('apply'), maiHint = MAI('hint'), maiTm = 0;
  maiLang.innerHTML = MAI_LANGS.map(function (l) { return '<option value="' + esc(l[0]) + '">' + esc(l[1]) + '</option>'; }).join('');
  var MAI_HINT = ['Use a model with web search', 'Code fences and extra text are fine', 'Applied as AI · unverified. Undo stays available'];

  function maiModesHTML(p) {
    var c = prvCad(p), sug = c.any ? c.mode : 'discover';
    return MAI_MODES.map(function (k) {
      var m = PRV_MODE[k], on = mai.mode === k;
      return '<button type="button" class="npj-kind" role="radio" aria-checked="' + (on ? 'true' : 'false') + '" tabindex="' + (on ? '0' : '-1') + '" data-m="' + k + '"><span class="npj-ic" aria-hidden="true">' + IC(m[1]) + '</span><b>' + esc(m[0]) + (k === sug ? ' <span class="chip ' + (c.due ? 'warn' : 'ok') + '">' + (c.due ? 'Due' : 'Suggested') + '</span>' : '') + '</b><small>' + esc(m[2]) + '</small></button>';
    }).join('');
  }
  function maiPromptSync() {
    mai.lang = maiLang.value; mai.focus = maiFocus.value;
    var t = maiPrompt(pd.p, mai); maiPr.value = t; maiPr.scrollTop = 0;
    maiPc.textContent = '≈ ' + (Math.round(t.length / 400) / 10).toFixed(1) + 'k tokens · ' + t.length.toLocaleString('en-US') + ' characters';
    mai.copied = false; maiCopy.textContent = 'Copy prompt'; maiCopy.className = 'btn-primary btn-sm'; maiNext.className = 'btn-ghost btn-sm';
  }
  function maiNavSync() {
    [].forEach.call(maiNav.querySelectorAll('button'), function (b) {
      var k = +b.getAttribute('data-s');
      if (k === mai.step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      b.classList.toggle('done', k < mai.step || (k === 2 && mai.step === 3));
      b.disabled = k === 3 && !mai.plan;
    });
  }
  function maiStep(n, focusSel) {
    mai.step = n;
    maiPanes.forEach(function (s, i) { s.hidden = i + 1 !== n; });
    maiFoots.forEach(function (s, i) { s.hidden = i + 1 !== n; });
    maiHint.textContent = MAI_HINT[n - 1];
    maiNavSync();
    var body = maiPanes[n - 1].closest('.dr-body'); if (body) body.scrollTop = 0;
    var f = focusSel && document.querySelector(focusSel);
    if (f) setTimeout(function () { f.focus({ preventScroll: true }); }, 40);
  }
  function maiOnOpen() {
    var p = pd.p, c = prvCad(p), hasScope = p.pv.items.some(function (x) { return x.sec === 'in' || x.sec === 'next' || x.sec === 'out'; });
    if (mai.pid !== p.id) { mai.pid = p.id; mai.raw = ''; mai.ck = null; mai.plan = null; mai.sel = {}; mai.ack = false; mai.focus = ''; mai.mode = c.any ? c.mode : 'discover'; mai.lang = mai.pl = maiProjLang(p); }
    else if (!mai.raw.trim()) mai.mode = c.any ? c.mode : 'discover';
    if (mai.pl !== maiProjLang(p)) mai.lang = mai.pl = maiProjLang(p);   /* the project's language changed since */
    if (mai.plan && mai.plan.snap !== prvSnap(p)) mai.plan = null;
    mai.scope = hasScope ? mai.scope !== false : false;
    maiModesEl.innerHTML = maiModesHTML(p);
    maiSw.setAttribute('aria-checked', mai.scope ? 'true' : 'false'); maiSw.disabled = !hasScope;
    MAI('sc-d').textContent = hasScope ? 'Lets the model judge fit. Sends the titles of your scope items, nothing else from Scope.' : 'Nothing is in scope yet, so there is nothing to send.';
    maiLang.value = mai.lang; maiFocus.value = mai.focus;
    maiIn.value = mai.raw;
    maiPromptSync();
    if (mai.raw.trim() && !mai.plan) maiCheck(true); else maiShow();
    if (mai.plan) { maiRenderReview(); maiStep(3, '#mai-apply'); return '#mai-apply'; }
    if (mai.raw.trim()) { maiStep(2, '#mai-in'); return '#mai-in'; }
    maiStep(1, '#mai-copy'); return '#mai-copy';
  }

  /* step 2: the answer */
  function maiShow() {
    var ck = mai.ck, h = '', st = 'idle', ok = false;
    if (!mai.raw.trim()) h = '<b>Waiting for the answer</b><p>ScopeDue checks it as you paste. Nothing is applied yet.</p>';
    else if (!ck) h = '<b>Checking…</b>';
    else if (ck.bad) {
      st = 'bad';
      h = '<b>This is not valid JSON</b><p>' + esc(ck.err.msg) + (ck.err.line ? ' Near line ' + ck.err.line + ', column ' + ck.err.col + '.' : '') + '</p><p class="mai-sm">Copy the fix request, paste it back to the model, then paste its new answer here.</p>';
    } else if (ck.v.E.length) {
      st = 'bad';
      h = '<b>' + ck.v.E.length + (ck.v.E.length === 1 ? ' problem to fix' : ' problems to fix') + '</b><ul class="mai-er">' + ck.v.E.slice(0, 8).map(function (e) { return '<li><code>' + esc(e.path) + '</code> <span>' + esc(e.msg) + '</span></li>'; }).join('') + '</ul>' + (ck.v.E.length > 8 ? '<p class="mai-sm">and ' + (ck.v.E.length - 8) + ' more</p>' : '') + '<p class="mai-sm">Copy the fix request, paste it back to the model, then paste its new answer here.</p>';
    } else {
      var N = ck.v.N, bits = [N.jobs.length + (N.jobs.length === 1 ? ' job' : ' jobs'), N.comps.length + (N.comps.length === 1 ? ' competitor' : ' competitors'), N.srcs.length + (N.srcs.length === 1 ? ' source' : ' sources')];
      ok = true; st = N.meta.browsing === false ? 'warn' : 'ok';
      h = '<b>' + (N.meta.browsing === false ? 'Readable, but the model did not browse' : 'Valid answer') + '</b><p>' + esc(MAI_SCHEMA) + ' · ' + bits.join(' · ') + (N.meta.model ? ' · ' + esc(N.meta.model) : '') + ' · <span>as of ' + esc(prvDate(Date.parse(N.meta.as_of + 'T12:00:00'))) + '</span></p>';   /* its own text, so "{0} of {1}" cannot take the whole line */
      var ex = [];
      if (ck.via === 'text') ex.push('Found the JSON inside the text.'); if (ck.fixed) ex.push('Removed trailing commas.');
      if (ex.length) h += '<p class="mai-sm">' + esc(ex.join(' ')) + '</p>';
      if (ck.v.W.length) h += '<ul class="mai-wr">' + ck.v.W.slice(0, 5).map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>';
    }
    maiChk.setAttribute('data-st', st); maiChk.innerHTML = h;
    maiGo2.disabled = !ok; maiFix.hidden = !(ck && (ck.bad || ck.v.E.length));
  }
  function maiCheck(now) {
    clearTimeout(maiTm);
    var run = function () {
      var t = maiIn.value; mai.raw = t; mai.plan = null; maiNavSync();
      if (!t.trim()) { mai.ck = null; return maiShow(); }
      var ex = maiExtract(t);
      if (ex.err) mai.ck = { bad: true, err: ex.err };
      else mai.ck = { v: maiCheckObj(ex.v, pd.p), via: ex.via, fixed: ex.fixed };
      maiShow();
    };
    if (now) run(); else { mai.raw = maiIn.value; mai.ck = null; maiShow(); maiTm = setTimeout(run, 260); }
  }
  function maiReview() {
    var ck = mai.ck; if (!ck || ck.bad || ck.v.E.length) return;
    var p = pd.p, N = ck.v.N, gen = ++mai.gen, list = N.srcs, fps = {}, i = 0, fail = false;
    maiGo2.disabled = true; maiGo2.textContent = 'Checking…';
    function done() {
      if (gen !== mai.gen) return;
      maiGo2.textContent = 'Review changes';
      if (fail) { maiChk.setAttribute('data-st', 'bad'); maiChk.innerHTML = '<b>This browser cannot fingerprint sources</b><p>Sources are saved with a SHA-256 fingerprint, and this browser could not compute one here.</p>'; maiGo2.disabled = false; return; }
      mai.plan = maiPlan(p, N, fps, mai.mode); mai.sel = {}; mai.plan.rows.forEach(function (r) { mai.sel[r.id] = !!r.on; }); mai.ack = false;
      maiGo2.disabled = false; maiRenderReview(); maiStep(3, '#mai-rv-h');
    }
    (function next() {
      if (gen !== mai.gen) return;
      if (i >= list.length) return done();
      var s = list[i++];
      pdeShaText(s.title + '\n' + s.url + '\n' + s.quote, function (hex) { fps[s.id] = hex; next(); }, function () { fail = true; done(); });
    })();
  }

  /* step 3: review */
  function maiRowHTML(r) {
    var tag = r.kind === 'job' ? 'Job' : r.kind === 'comp' ? (r.clone ? 'Clone' : r.sub ? 'Substitute' : 'Competitor') : r.kind === 'chan' ? 'Channel' : 'Plan', on = mai.sel[r.id], ls = r.lines, more = ls.length > 5;
    function li(l) { return '<li' + (l.o ? ' data-o="' + (l.o === '−' ? '-' : l.o) + '"' : '') + '><i aria-hidden="true">' + (l.o || '') + '</i><span>' + esc(l.x) + '</span></li>'; }
    return '<li class="mai-r' + (on ? ' on' : '') + '" data-r="' + r.id + '"><label class="mai-rl"><input type="checkbox" data-r="' + r.id + '"' + (on ? ' checked' : '') + '><span class="mai-ck" aria-hidden="true"></span><span class="mai-rt"><b>' + esc(r.title) + '</b><span class="chip neutral">' + tag + '</span></span></label>' +
      '<ul class="mai-ln">' + ls.slice(0, 5).map(li).join('') + '</ul>' + (more ? '<details class="mai-more"><summary>' + (ls.length - 5) + ' more</summary><ul class="mai-ln">' + ls.slice(5).map(li).join('') + '</ul></details>' : '') + '</li>';
  }
  function maiRenderReview() {
    var p = pd.p, pl = mai.plan, rows = pl.rows, h = '', grp = [['new', 'New', 'Added to your map'], ['chg', 'Changed', 'Updated in place'], ['ret', 'Proposed to retire', 'Set aside and kept. You can restore them']];
    h += '<div class="mai-sum" id="mai-sum" role="status" aria-live="polite"></div>';
    if (pl.nobrowse) h += '<div class="mai-al crit"><b>This model says it did not browse the web</b><p>Competitors, prices and quotes may come from memory, and some may not exist. Use a model with web search for anything you will rely on.</p><label class="mai-ack"><input type="checkbox" id="mai-ack"><span class="mai-ck" aria-hidden="true"></span><span>I understand. I will check every source myself before I rely on it.</span></label></div>';
    var W = mai.ck.v.W.concat(pl.warns);
    if (W.length) h += '<details class="mai-al warn"><summary><b>' + W.length + (W.length === 1 ? ' thing to know' : ' things to know') + '</b></summary><ul>' + W.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul></details>';
    grp.forEach(function (g) {
      var rs = rows.filter(function (r) { return r.op === g[0]; });
      if (!rs.length) return;
      h += '<div class="mai-gt"><h3 class="pd-eb mai-gh">' + g[1] + ' <span class="n">' + rs.length + '</span></h3><p class="mai-gs">' + g[2] + '.</p></div><ul class="mai-rows">' + rs.map(maiRowHTML).join('') + '</ul>';
    });
    if (!rows.length) h += '<div class="mai-empty"><b>Nothing new in this answer</b><p>Everything it says is already on your map, so there is nothing to apply.</p></div>';
    var un = []; if (pl.untJ) un.push(pl.untJ + (pl.untJ === 1 ? ' job' : ' jobs')); if (pl.untK) un.push(pl.untK + (pl.untK === 1 ? ' competitor' : ' competitors'));
    if (pl.same || un.length) h += '<p class="pd-note mai-keep">' + (pl.same ? pl.same + (pl.same === 1 ? ' item' : ' items') + ' came back unchanged. ' : '') + (un.length ? 'The model did not mention ' + un.join(' and ') + '. They stay exactly as they are; leaving something out never deletes it.' : '') + (pl.skipped ? ' ' + pl.skipped + (pl.skipped === 1 ? ' item' : ' items') + ' marked retired ' + (pl.skipped === 1 ? 'is' : 'are') + ' not on your map and ' + (pl.skipped === 1 ? 'was' : 'were') + ' skipped.' : '') + '</p>';
    if (pl.qs && pl.qs.length) h += '<details class="mai-qs"><summary>' + pl.qs.length + (pl.qs.length === 1 ? ' search it says it ran' : ' searches it says it ran') + '</summary><ul>' + pl.qs.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></details>';
    else if (mai.mode !== 'challenge') h += '<p class="pd-note mai-keep">The model listed no searches, so you cannot see how it looked.</p>';
    if (pl.notes.length) h += '<section class="mai-nt"><h3 class="pd-eb">Notes from the model</h3><ul>' + pl.notes.map(function (n) { return '<li>' + esc(n) + '</li>'; }).join('') + '</ul></section>';
    maiRv.innerHTML = '<h3 class="sr-only" id="mai-rv-h" tabindex="-1">Review changes</h3>' + h;
    maiRefresh();
  }
  function maiRefresh() {
    var p = pd.p, pl = mai.plan, n = pl.rows.filter(function (r) { return mai.sel[r.id]; }).length, cur = prvVerdict(p).k, pv = maiPreview(p, pl, mai.sel), nk = pv.k, s = MAI('sum');
    var vdot = '<span class="prv-vd-dot" data-k="' + nk + '" aria-hidden="true"></span>';
    s.innerHTML = '<div class="mai-vd">' + vdot + '<div><span class="pd-eb">Verdict after applying</span><b>' + (cur === nk ? PRV_VK[nk][0] + ' <small>no change</small>' : PRV_VK[cur][0] + ' <i aria-hidden="true">→</i> ' + PRV_VK[nk][0]) + '</b></div></div><p class="mai-ct">' + n + (n === 1 ? ' change selected' : ' changes selected') + (pv.cnt.sn ? ' · adds ' + pv.cnt.sn + (pv.cnt.sn === 1 ? ' source' : ' sources') + ' marked AI · unverified' : '') + '</p>';
    maiOk.textContent = n ? 'Apply ' + n + (n === 1 ? ' change' : ' changes') : 'Nothing selected';
    maiOk.disabled = !n || (pl.nobrowse && !mai.ack);
    [].forEach.call(maiRv.querySelectorAll('.mai-r'), function (li) { li.classList.toggle('on', !!mai.sel[li.getAttribute('data-r')]); });
  }
  function maiConfirm() {
    var p = pd.p, pl = mai.plan; if (!pl || maiOk.disabled) return;
    if (x8Role(p) !== 'Owner') { x8No(p); return; }   /* CONTRACT 119: the drawer opens to look (X8_LOOK); applying changes the project */
    var snap = prvSnap(p), cnt = maiApply(p, pl, mai.sel), parts = [];
    if (cnt.jn + cnt.kn) parts.push((cnt.jn + cnt.kn) + ' new');
    if (cnt.jc + cnt.kc + cnt.pl) parts.push((cnt.jc + cnt.kc + cnt.pl) + ' changed');
    if (cnt.jr + cnt.kr) parts.push((cnt.jr + cnt.kr) + ' retired');
    var msg = prvVMsg(p, 'AI update applied: ' + (parts.join(', ') || 'no changes') + (cnt.sn ? '. ' + cnt.sn + (cnt.sn === 1 ? ' source is' : ' sources are') + ' marked AI · unverified.' : '.'));
    mai.raw = ''; mai.ck = null; mai.plan = null; mai.sel = {}; maiIn.value = '';
    closeDrawer(true);
    if (pd.tab !== 'market') pdSelect('market');
    prvDone(p, snap, 'You applied an AI update', msg, '.prv-rcd [data-pd="prv:mai"]', '.prv-rcd');
  }

  /* wiring */
  maiModesEl.addEventListener('click', function (e) {
    var b = e.target.closest('.npj-kind'); if (!b) return;
    mai.mode = b.getAttribute('data-m');
    [].forEach.call(maiModesEl.querySelectorAll('.npj-kind'), function (x) { var on = x === b; x.setAttribute('aria-checked', on ? 'true' : 'false'); x.tabIndex = on ? 0 : -1; });
    maiPromptSync();
  });
  maiModesEl.addEventListener('keydown', function (e) {
    var k = e.key, bs = [].slice.call(maiModesEl.querySelectorAll('.npj-kind')), i = bs.indexOf(document.activeElement), d = k === 'ArrowDown' || k === 'ArrowRight' ? 1 : k === 'ArrowUp' || k === 'ArrowLeft' ? -1 : 0;
    if (!d || i < 0) return;
    e.preventDefault(); var t = bs[(i + d + bs.length) % bs.length]; t.focus(); t.click();
  });
  maiSw.addEventListener('click', function () { mai.scope = maiSw.getAttribute('aria-checked') !== 'true'; maiSw.setAttribute('aria-checked', mai.scope ? 'true' : 'false'); maiPromptSync(); });
  maiLang.addEventListener('change', maiPromptSync);
  maiFocus.addEventListener('input', function () { clearTimeout(maiFocus._t); maiFocus._t = setTimeout(maiPromptSync, 200); });
  maiCopy.addEventListener('click', function () {
    copyText(maiPr.value, function () { mai.copied = true; maiCopy.textContent = 'Copied'; maiCopy.className = 'btn-ghost btn-sm'; maiNext.className = 'btn-primary btn-sm'; showToast('Prompt copied. Paste it into an AI model with web search.'); });
  });
  maiPr.addEventListener('click', function () { maiPr.select(); });
  maiNext.addEventListener('click', function () { maiStep(2, '#mai-in'); });
  maiNav.addEventListener('click', function (e) { var b = e.target.closest('button[data-s]'); if (!b || b.disabled) return; var k = +b.getAttribute('data-s'); if (k === 3) { maiRenderReview(); maiStep(3, '#mai-apply'); } else maiStep(k, k === 1 ? '#mai-copy' : '#mai-in'); });
  maiIn.addEventListener('input', function () { maiCheck(false); });
  MAI('clear').addEventListener('click', function () { maiIn.value = ''; maiCheck(true); maiIn.focus(); });
  MAI('file-b').addEventListener('click', function () { maiFile.click(); });
  function maiRead(f) {
    if (!f) return;
    if (f.size > 1500000) { mai.raw = ' '; maiIn.value = ''; maiChk.setAttribute('data-st', 'bad'); maiChk.innerHTML = '<b>That file is too large</b><p>An answer should be well under 1.5 MB.</p>'; return; }
    var r = new FileReader(); r.onload = function () { maiIn.value = String(r.result || ''); maiCheck(true); }; r.readAsText(f);
  }
  maiFile.addEventListener('change', function () { maiRead(maiFile.files[0]); maiFile.value = ''; });
  maiIn.addEventListener('dragover', function (e) { e.preventDefault(); });
  maiIn.addEventListener('drop', function (e) { if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) { e.preventDefault(); maiRead(e.dataTransfer.files[0]); } });
  maiFix.addEventListener('click', function () { if (!mai.ck) return; copyText(maiFixPrompt(mai.ck), function () { maiFix.textContent = 'Copied'; clearTimeout(maiFix._t); maiFix._t = setTimeout(function () { maiFix.textContent = 'Copy fix request'; }, 1600); showToast('Fix request copied. Paste it back to the model.'); }); });
  maiGo2.addEventListener('click', maiReview);
  MAI('back2').addEventListener('click', function () { maiStep(1, '#mai-copy'); });
  MAI('back3').addEventListener('click', function () { maiStep(2, '#mai-in'); });
  maiOk.addEventListener('click', maiConfirm);
  maiRv.addEventListener('change', function (e) {
    var c = e.target;
    if (c.id === 'mai-ack') { mai.ack = c.checked; maiRefresh(); return; }
    var id = c.getAttribute && c.getAttribute('data-r'); if (!id || c.type !== 'checkbox') return;
    mai.sel[id] = c.checked; maiRefresh();
  });
  document.getElementById('drawer-mai').addEventListener('keydown', function (e) {
    if (!(e.metaKey || e.ctrlKey) || e.key !== 'Enter') return;
    e.preventDefault();
    if (mai.step === 1) maiCopy.click(); else if (mai.step === 2) { if (!maiGo2.disabled) maiReview(); } else maiConfirm();
  });

  /* ---------- events ---------- */
  function pdGo(tab, f, crId, v) {
    if (f && f.indexOf('dec:') === 0) { pd.pv.ds = f.slice(4); f = null; }
    var pfk = f && f.indexOf('pf:') === 0 ? f.slice(3) : null, late = f === 'late', wed = f === 'wedge'; if (pfk || late || wed) f = null;
    var pf = f === 'ship' || f === 'tri' ? f : null; if (pf) f = null;
    if (f === 'wk') { pd.wk.seg = 'work'; f = null; } else if (f === 'owner') pd.wk.seg = 'people';
    if (crId && pd.p.crs) { var c = pdCr(pd.p, crId); if (c) { pd.cr = c.id; pd.crf = pdCrOpen(c) ? 'open' : 'closed'; } }
    pdSelect(tab);
    /* Needs can open the Ship form or Triage. A tab change clears open forms, so these are set after it */
    if (pf === 'ship' && pd.p.kind === 'private') { pd.pv.sh = true; pdRerender('#prv-sm'); var shp = pdPanel.querySelector('.prv-shp'); if (shp) shp.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' }); }
    if (pf === 'tri' && pd.p.kind === 'private') { pd.pv.tri = 1; pd.pv.trn = 0; pd.pv.sk = []; pdRerender('.prv-focus .prv-pro'); }
    if (pfk && pd.p.kind === 'private' && pd.tab === 'market') { pd.pv.pf = pfk; pdRerender(); pfFocus(pfk === 'dec' ? 'input[name="o"]:checked' : pfk === 'log' ? '.pq-lf input' : '#pq-q'); }
    if (late && pd.p.kind === 'private') { var lc = pdPanel.querySelector('.prv-late'); if (lc) prvFlash(lc, true); }
    if (wed && pd.p.kind === 'private' && pd.tab === 'market') { pd.pv.we = true; pdRerender('#prv-wt'); var wf = pdPanel.querySelector('.prv-wf'); if (wf && !reduced) wf.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
    if (v != null && pd.p.sc) { var lt = pdLatest(pd.p); pd.view = lt && v < lt.v ? v : null; if (pd.tab === 'scope') pdRerender(); }
    if (f === 'focus') pdEditStart('focus');
    else if (f === 'next') pdEditStart('next');
    else if (f === 'later') { var lc = document.getElementById('x6-later'); if (lc) { lc.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' }); prvFlash(lc, true); } }
    else if (f === 'thesis') pdEditStart('thesis');
    else if (f === 'cf') { var cc = document.getElementById('cf-card'); if (cc) { cc.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' }); prvFlash(cc, true); } }
    else if (f === 'owner') { var s = document.getElementById('pd-owner'); if (s) s.focus({ preventScroll: false }); }
  }
  function pdSeg(btn) {
    var seg = btn.closest('.seg'), kind = seg.getAttribute('data-seg'), f = btn.getAttribute('data-f'), p = pd.p;
    if (kind === 'cty') {
      var c = pdSelCr(p); if (!c || !c.cmp) return;
      c.cmp.ty = f; setPressed(seg, f); pdSyncCompose(seg.closest('form'));
      var form = seg.closest('form'); form.removeAttribute('data-err');
    } else if (kind === 'dlk') {
      pd.dlk = f; setPressed(seg, f);
    } else if (kind === 'crf') {
      pd.crf = f; var g = pdCrGroup(p); pd.cr = g[0] ? g[0].id : null;
      pdRerender('.seg[data-seg="crf"] [data-f="' + f + '"]');
    } else if (kind === 'evf') {
      pd.evf = f; pd.evn = 8; pd.ev = null; pdRerender('.seg[data-seg="evf"] [data-f="' + f + '"]');
    } else if (kind === 'clf') {
      pd.clf = f; pdRerender('.seg[data-seg="clf"] [data-f="' + f + '"]');
    } else if (kind === 'hf') {
      pd.hf = f; pd.hn = 12; pdRerender('.seg[data-seg="hf"] [data-f="' + f + '"]');
    } else if (kind === 'dtf') {
      pd.pv.dt = f; pd.pv.ds = null; pd.pv.dn = {}; pdRerender('.seg[data-seg="dtf"] [data-f="' + f + '"]');
    } else if (kind === 'hr') {
      pd.pv.hr = f; pdRerender('.seg[data-seg="hr"] [data-f="' + f + '"]');   /* v122 (94): how far back the Activity chart goes */
    } else if (kind === 'fbf') {
      FB.f = f; FB.sel = ''; pdRerender('.seg[data-seg="fbf"] [data-f="' + f + '"]');
    } else if (kind === 'tmv') {
      pd.wk.seg = f; pd.wk.sk = null; pdRerender('.seg[data-seg="tmv"] [data-f="' + f + '"]');
    }
  }
  pdPanel.addEventListener('click', function (e) {
    var sb = e.target.closest('.seg button[data-f]');
    if (sb && pdPanel.contains(sb)) { pdSeg(sb); return; }
    var a = e.target.closest('[data-pd]'); if (!a || !pdPanel.contains(a)) return;
    e.preventDefault();
    var act = a.getAttribute('data-pd'), p = pd.p;
    if (act.indexOf('x8:') === 0) { x8Act(act.slice(3), a); return; }
    if (p && x8Block(p, act, a)) return;
    if (act.indexOf('prv:') === 0) prvAct(act.slice(4), a);
    else if (act.indexOf('wk:') === 0) wkAct(act.slice(3), a);
    else if (act.indexOf('pf:') === 0) pfAct(act.slice(3), a);
    else if (act.indexOf('dl:') === 0) dlAct(act.slice(3), a);
    else if (act.indexOf('x6:') === 0) x6Act(act.slice(3), a);
    else if (act.indexOf('dv:') === 0) dvAct(act.slice(3), a);   /* v69: the project kept in Drive (29.16) */
    else if (act.indexOf('fb:') === 0) fbAct(act.slice(3), a);   /* v70: Feedback from Viewers (32) */
    else if (act.indexOf('vp:') === 0) vpAct(act.slice(3), a);   /* v70: the Viewer portal (32.6) */
    else if (act.indexOf('cf:') === 0) cfAct(act.slice(3), a);   /* v96: changes that crossed (41) */
    else if (act.indexOf('sv:') === 0) svAct(act.slice(3));   /* v99: since your last visit (50) */
    else if (act.indexOf('cp:') === 0) cpAct(act.slice(3), a);   /* v102: pictures from the client (59) */
    else if (act === 'x7:stop') x7StopOrphan(p, a.getAttribute('data-id'));
    else if (act === 'x9:add') x9Open(p, a.getAttribute('data-id'), wkHostPd);
    else if (act === 'x9:rm') x9Unlink(p, a.getAttribute('data-id'), +a.getAttribute('data-i'), wkHostPd);
    else if (act === 'ag:upgrade') agUpgrade(p);
    else if (act === 'sylink') syPanelAct(act, p, a);
    else if (act === 'goto') pdGo(a.getAttribute('data-tab'), a.getAttribute('data-f'), a.getAttribute('data-cr'));
    else if (act === 'edit') pdEditStart(a.getAttribute('data-f'));
    else if (act === 'cancel') pdCancel();
    else if (act === 'done') pdDone();
    else if (act === 'addlink') { pd.adding = true; pd.edit = null; pdRerender(); }
    else if (act === 'invite') openDrawer('invite', a);
    else if (act === 'roster') stGo('team');
    else if (act === 'client') { if (p.cid && byId(p.cid)) openClient(p.cid); }   /* CONTRACT 119: the client card's "Open client page" had no handler */
    else if (act === 'sdportal') { if (sdSample(p)) sdpOpenClient(byId(p.cid)); }   /* CONTRACT 120 */
    else if (act === 'vpdemo') { if (sdSample(p)) sdpOpenViewer(p, a.getAttribute('data-e')); }
    else if (act === 'drive') stGo('drive');
    else if (act === 'rm') pdRemove(+a.getAttribute('data-i'));
    else if (act === 'issue') openDrawer('issue', a);
    else if (act === 'crnew') openDrawer('cr', a);
    else if (act === 'itadd') { pd.as = a.getAttribute('data-sec'); pd.ie = null; pdRerender(); }
    else if (act === 'itedit') { pd.ie = a.getAttribute('data-id'); pd.as = null; pdRerender(); }
    else if (act === 'itcancel') pdItCancel();
    else if (act === 'itrm') pdItRm(a.getAttribute('data-id'));
    else if (act === 'itundo') pdItUndo(a.getAttribute('data-id'));
    else if (act === 'discard') pdDiscard();
    else if (act === 'viewver') { pd.view = +a.getAttribute('data-v'); pd.ie = null; pd.as = null; pdRerender('[data-pd="viewcur"]'); }
    else if (act === 'viewcur') { pd.view = null; pdRerender('[data-pd="viewver"]'); }
    else if (act === 'tocr') pdGo('change', null, a.getAttribute('data-cr'));
    else if (act === 'toscope') pdGo('scope');
    else if (act === 'cr2sc') { var c = pdSelCr(p); if (c) pdCrToScope(c); }
    else if (act === 'crsel') {
      pd.cr = a.getAttribute('data-cr'); pdRerender('.pd-cr[data-cr="' + pd.cr + '"]');
      if (window.innerWidth <= 1100) { var d = pdPanel.querySelector('.pd-cr-d'); if (d) d.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' }); }
    }
    else if (act === 'simappr') pdSimApprove();
    else if (act === 'termsedit') pdTermsEdit();
    else if (act === 'termscancel') pdTermsCancel();
    else if (act === 'termsadd') pdTermsAdd(a);
    else if (act === 'revlog') pdRevLog(1);
    else if (act === 'revundo') pdRevLog(-1);
    else if (act === 'evsel') {
      pd.ev = a.getAttribute('data-ev'); pdRerender('.pd-cr.ev[data-ev="' + pd.ev + '"]');
      if (window.innerWidth <= 1100) { var d2 = pdPanel.querySelector('.pde-d'); if (d2) d2.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' }); }
    }
    else if (act === 'evmore') { var on = pd.evn; pd.evn += 8; pdRerender(); var evr = pdPanel.querySelectorAll('.pd-cr.ev'); if (evr[on]) evr[on].focus({ preventScroll: true }); }
    else if (act === 'evcap') openDrawer('cap', a);
    else if (act === 'evprep') { var pit = pdeById(p, pd.ev); if (pit) { pd.prep = pit.id; openDrawer('prep', a); } }
    else if (act === 'evunshare') pdeUnshare(pd.ev);
    else if (act === 'evverify') { var vf = pdPanel.querySelector('#pde-vf'); if (vf) { vf.value = ''; vf.click(); } }
    else if (act === 'evcheck') pdeCheckText();
    else if (act === 'evfpcopy') copyText(a.getAttribute('data-fp'), function () { flashCopied(a); showToast('Fingerprint copied'); });
    else if (act === 'evgoto') { var rf = a.getAttribute('data-ref'); if (/^v\d+$/.test(rf)) pdGo('scope', null, null, +rf.slice(1)); else pdGo('change', null, rf); }
    else if (act === 'clreq') { if (a.getAttribute('data-k') === 'cr') pdGo('change', null, a.getAttribute('data-cr')); else pdGo('scope', null, null, +a.getAttribute('data-v')); }
    else if (act === 'preview') openDrawer('preview', a);
    else if (act === 'ptheme') openDrawer('ptheme', a);
    else if (act === 'needsall') { pd.nall = !pd.nall; pdRerender('[data-pd="needsall"]'); }
    else if (act === 'clcopy') { var pcl = byId(p.cid); if (pcl && (SY.key || syOnPortal(pcl))) syMailLink(pcl, a, syMine(p) ? p : null); else if (pcl) copyText('https://' + portalUrl(pcl), function () { flashCopied(a); showToast('Portal link copied'); }); }
    else if (act === 'hgo') {
      var hev = a.getAttribute('data-ev'); if (hev) { pd.ev = hev; pd.evf = 'all'; }
      pdGo(a.getAttribute('data-tab'), null, a.getAttribute('data-cr'), a.hasAttribute('data-v') ? +a.getAttribute('data-v') : null);
    }
    else if (act === 'hagr') { pd.ha = !pd.ha; pd.hn = 12; pdRerender('[data-pd="hagr"]'); }   // v116
    else if (act === 'hmore') { var hn0 = pd.hn; pd.hn += 12; pdRerender(); var hl = pdPanel.querySelectorAll('.pdh-e'); if (hl[hn0]) { var hb = hl[hn0].querySelector('button'); (hb || hl[hn0]).focus && (hb || hl[hn0]).focus({ preventScroll: true }); } }
  });
  pdPanel.addEventListener('submit', function (e) {
    var f = e.target.closest('[data-pd-form]'); if (!f) return;
    e.preventDefault();
    var k = f.getAttribute('data-pd-form');
    if (pd.p && x8BlockForm(pd.p, k, f)) return;
    if (k === 'edit') pdSave(f.getAttribute('data-f'), f.querySelector('textarea').value);
    else if (k === 'addlink') pdAddLink(f);
    else if (k === 'itedit' || k === 'additem') pdItSave(f);
    else if (k === 'send') pdSend(f);
    else if (k === 'terms') (f.classList.contains('ag-trf') ? agTermsSave : pdTermsSave)(f);
    else if (k.indexOf('dl:') === 0) dlSubmit(k.slice(3), f);
    else if (k.indexOf('x6:') === 0) x6Submit(k.slice(3), f);
    else if (k === 'sim') pdSim(f);
    else if (k.indexOf('prv:') === 0) prvSubmit(k.slice(4), f);
    else if (k.indexOf('wk:') === 0) wkSubmit(k.slice(3), f);
    else if (k.indexOf('pf:') === 0) pfSubmit(k.slice(3), f);
    else if (k.indexOf('fb:') === 0) fbSubmit(k.slice(3), f);
  });
  pdPanel.addEventListener('input', function (e) {
    if (/^(hrs|mv|inc)$/.test(e.target.name || '') && e.target.closest('.pd-compose')) agQuoteSync(e.target.closest('form'));
    var f = e.target.closest('.pd-edit, .pd-add, .pd-itf, .pd-compose, .pd-proto-b, .prv-f, .pd-trf, .x6-ntf, .x6-aup'); if (f) f.removeAttribute('data-err');
    if (e.target.hasAttribute('data-max') && e.target.closest('.prv-asf, .pd-edit')) prvAsmCount(e.target);   /* v121 (89); v122 (93): the thesis, focus and next step too */
    if (e.target.hasAttribute('aria-invalid') && e.target.closest('.pd-compose, .pd-proto-b')) e.target.removeAttribute('aria-invalid');
    var cm = e.target.closest('.pd-compose');
    if (cm && e.target.name) { var c = pdSelCr(pd.p); if (c && c.cmp) c.cmp[e.target.name] = e.target.value; }
  });
  pdPanel.addEventListener('change', function (e) {
    if (/^(hrs|mv|inc)$/.test(e.target.name || '') && e.target.closest('.pd-compose')) agQuoteSync(e.target.closest('form'));
    var t = e.target;
    if (t.classList.contains('x6-fin')) { if (pd.p && t.files && t.files.length) x6FilesUp(pd.p, t.files, pd.x6to); return; }
    if (pd.p && x8Role(pd.p) !== 'Owner' && (t.hasAttribute('data-pd-role') || t.hasAttribute('data-pd-owner') || t.hasAttribute('data-prv') || t.name === 'pfm')) { x8No(pd.p); pdRerender(); return; }
    if (t.name === 'fbk') fbKind(t);
    else if (t.id === 'fb-kab') fbChkAb(t);   /* v95 (40.1): the steps follow what is checked */
    else if (t.hasAttribute('data-vp-sh')) vpShChange(t);
    else if (t.hasAttribute('data-pd-role')) pdRole(+t.getAttribute('data-pd-role'), t.value);
    else if (t.hasAttribute('data-pd-owner')) pdOwner(t.value);
    else if (t.id === 'pde-vf') pdeVerify(t.files && t.files[0]);
    else if (t.hasAttribute('data-wk')) wkChange(t);
    else if (t.name === 'pfm') pfChange(t);
    else if (t.hasAttribute('data-prv')) prvChange(t);
    else if (t.name === 'ty' && t.closest('.pd-proto-b')) { var am = t.closest('.pd-proto-b').querySelector('[data-sim-amt]'); if (am) am.hidden = t.value !== 'counter'; }
  });
  pdPanel.addEventListener('toggle', function (e) { if (e.target.matches && e.target.matches('.pd-proto')) pd.sim = e.target.open; }, true);
  pdPanel.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && pd.wk && pd.wk.sk) { e.preventDefault(); e.stopPropagation(); wkAct('cancel', e.target); return; }
    if (e.key === 'Escape' && prvEditing()) { e.preventDefault(); e.stopPropagation(); var pvb = pd.pv.back; prvReset(); pdRerender(pvb); return; }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && e.target.closest('.x6-ntf')) { e.preventDefault(); var ntf = e.target.closest('.x6-ntf'); if (ntf.requestSubmit) ntf.requestSubmit(); return; }
    if (e.key === 'Escape' && pd.x6au && e.target.closest('.x6-aup')) { e.preventDefault(); e.stopPropagation(); var auk = pd.x6au; pd.x6au = null; pdRerender('[data-pd="x6:aud"][data-k="' + auk + '"]'); return; }
    if (e.key === 'Escape' && pd.x6nt && e.target.closest('.x6-nt')) { e.preventDefault(); e.stopPropagation(); var ntk = pd.x6nt; pd.x6nt = null; pdRerender('[data-pd="x6:nt"][data-k="' + ntk + '"]'); return; }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && e.target.closest('.prv-f')) { e.preventDefault(); var pvf = e.target.closest('.prv-f'); if (pvf.requestSubmit) pvf.requestSubmit(); return; }
    if (e.key === 'Escape' && pd.p && pd.p.sc && pd.p.sc.te && e.target.closest('.pd-trf')) { e.preventDefault(); e.stopPropagation(); pdTermsCancel(); return; }
    if (e.key === 'Escape' && (pd.edit || pd.adding || pd.ie || pd.as)) { e.preventDefault(); e.stopPropagation(); if (pd.ie || pd.as) pdItCancel(); else pdCancel(); return; }
    if (e.key === 'Enter' && !e.shiftKey && e.target.matches('.pd-edit textarea')) { e.preventDefault(); var f = e.target.closest('.pd-edit'); pdSave(f.getAttribute('data-f'), e.target.value); return; }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && e.target.closest('.pd-compose')) { e.preventDefault(); pdSend(e.target.closest('form')); return; }
    var cr = e.target.closest('.pd-cr');
    if (cr && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      var list = [].slice.call(pdPanel.querySelectorAll('.pd-cr')), n = list.indexOf(cr) + (e.key === 'ArrowDown' ? 1 : -1);
      if (list[n]) { e.preventDefault(); list[n].focus(); }
    }
  });

