  /* ---------- settings: what is kept ----------
     Settings apply the moment they are changed. Only choices the person made are stored (sd-prefs, this browser only, like the Profile):
     vf     how long a new quote stays valid, in days ("0" is no expiry)
     link   how long a portal link works, in days (the server takes 1 to 30)
     notify a choice made while no portal was connected; it is sent once on connecting, then the server holds it
     Theme and sidebar keep their own keys (sd-theme, sd-side). Everything here is gone after Erase, like every sd-* key. */
  var ST_LS = 'sd-prefs', ST_VF = ['7', '14', '30', '0'], ST_LN = [7, 14, 30];
  function stLoad() {
    var o, r = {};
    try { o = JSON.parse(localStorage.getItem(ST_LS) || 'null'); } catch (e) { o = null; }
    if (!o || typeof o !== 'object') return r;
    if (ST_VF.indexOf(o.vf) > -1) r.vf = o.vf;
    if (ST_LN.indexOf(o.link) > -1) r.link = o.link;
    if (typeof o.notify === 'boolean') r.notify = o.notify;
    return r;
  }
  var ST = stLoad();
  function stSave() { try { if (Object.keys(ST).length) localStorage.setItem(ST_LS, JSON.stringify(ST)); else localStorage.removeItem(ST_LS); } catch (e) {} }
  function stQuoteDays() { return (ST && ST.vf) || '14'; }
  function stLinkDays() { return (ST && ST.link) || 14; }

  /* ---------- profile ---------- */
  var PF_TONES = ['#24365a', '#2f4a7a', '#3f5f5a', '#5a4a6e', '#6b4f3a', '#7a3f4d'];
  var PF_TONE_N = ['Navy', 'Steel blue', 'Teal', 'Plum', 'Umber', 'Rosewood'];
  var PF_TZ = [['auto', 'Auto-detect from this device'], ['America/Los_Angeles', 'Pacific Time · Los Angeles'], ['America/Denver', 'Mountain Time · Denver'], ['America/Chicago', 'Central Time · Chicago'], ['America/New_York', 'Eastern Time · New York'], ['America/Sao_Paulo', 'Brasília · São Paulo'], ['Europe/London', 'London'], ['Europe/Berlin', 'Central Europe · Berlin'], ['Asia/Dubai', 'Dubai'], ['Asia/Kolkata', 'India · Kolkata'], ['Asia/Bangkok', 'Bangkok'], ['Asia/Ho_Chi_Minh', 'Hanoi · Ho Chi Minh City'], ['Asia/Singapore', 'Singapore'], ['Asia/Tokyo', 'Tokyo'], ['Australia/Sydney', 'Sydney'], ['Pacific/Auckland', 'Auckland']];
  var PF_DN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  var PF_REPLY = { same: 'Usually replies the same day', '1d': 'Usually replies within 1 business day', '2d': 'Usually replies within 2 business days' };
  var PF_MAX = { name: 60, title: 60, biz: 60, email: 90, phone: 24, city: 60, bio: 240 };
  var PF_DEF = { name: 'ScopeDue user', title: '', biz: '', email: '', phone: '', city: '', tz: 'auto', bio: '', days: [0, 1, 2, 3, 4], from: '09:00', to: '17:00', reply: '1d', se: true, sp: false, sl: true, tone: 0, photo: '' };
  /* a Profile filled in by a sample from before v72 (sd-profile-sample); since then the sample leaves the Profile to its owner */
  function pfSampleHas() { try { return !!localStorage.getItem('sd-profile-sample'); } catch (e) { return false; } }
  function pfSampleClear() {
    xaSetFirst('empty');
    if (!pfSampleHas()) return;
    var p = pfClone(PF_DEF); p.name = pfSaved.name;
    try { localStorage.removeItem('sd-profile-sample'); } catch (e) {}
    pfApplyState(p, p);
  }
  var PF_GROUP = { photo: 'Photo', tone: 'Photo', name: 'Name', title: 'Job title', biz: 'Business', email: 'Email', phone: 'Phone', city: 'Location', tz: 'Time zone', bio: 'Bio', days: 'Availability', from: 'Availability', to: 'Availability', reply: 'Availability', se: 'Visibility', sp: 'Visibility', sl: 'Visibility' };
  var pfId = function (i) { return document.getElementById(i); };
  var pfClone = function (p) { var c = {}; Object.keys(p).forEach(function (k) { c[k] = Array.isArray(p[k]) ? p[k].slice() : p[k]; }); return c; };
  /* v68: the client portal's themes (src/portal/css/themes, written in by build.py): id, name, note, and the values of its small picture */
  var PF_PT = /*SD_PORTAL_THEMES*/[];
  /* "<theme>" or "<theme>.<palette>" (a theme's colour palette): [the theme's card, the palette or null] */
  function ptSplit(v) { var a = String(v || '').split('.'), t = PF_PT.filter(function (x) { return x.id === a[0]; })[0] || null; return [t, t && a[1] ? (t.pal || []).filter(function (x) { return x.id === a[1]; })[0] || null : null]; }
  function ptValid(v) { var a = String(v).split('.'), x = ptSplit(v); return v === '' || (!!x[0] && (a.length === 1 || (a.length === 2 && !!x[1]))); }
  var pfHours = []; for (var pfh = 5; pfh <= 23; pfh++) pfHours.push((pfh < 10 ? '0' : '') + pfh + ':00');

  function pfSane(o) {
    var p = pfClone(PF_DEF); o = o || {};
    ['name', 'title', 'biz', 'email', 'phone', 'city', 'bio'].forEach(function (k) { if (typeof o[k] === 'string') p[k] = o[k].slice(0, PF_MAX[k]); });
    if (!p.name.trim()) p.name = PF_DEF.name;
    if (PF_TZ.some(function (z) { return z[0] === o.tz; })) p.tz = o.tz;
    if (Array.isArray(o.days)) {
      var d = o.days.filter(function (x, i, a) { return typeof x === 'number' && x === Math.floor(x) && x >= 0 && x <= 6 && a.indexOf(x) === i; });
      if (d.length) p.days = d;
    }
    if (pfHours.indexOf(o.from) > -1) p.from = o.from;
    if (pfHours.indexOf(o.to) > -1) p.to = o.to;
    if (p.to <= p.from) { p.from = PF_DEF.from; p.to = PF_DEF.to; }
    if (PF_REPLY[o.reply]) p.reply = o.reply;
    ['se', 'sp', 'sl'].forEach(function (k) { if (typeof o[k] === 'boolean') p[k] = o[k]; });
    if (typeof o.tone === 'number' && o.tone >= 0 && o.tone < PF_TONES.length && o.tone === Math.floor(o.tone)) p.tone = o.tone;
    if (typeof o.photo === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+\/=]+$/.test(o.photo)) p.photo = o.photo;
    return p;
  }
  function pfLoad() { var o = {}; try { o = JSON.parse(localStorage.getItem('sd-profile') || '{}') || {}; } catch (e) { o = {}; } return o; }
  function pfNorm(p) {
    return { name: p.name.trim().replace(/\s+/g, ' '), title: p.title.trim(), biz: p.biz.trim(), email: p.email.trim(), phone: p.phone.trim(), city: p.city.trim(), tz: p.tz, bio: p.bio.trim(), days: p.days.slice().sort(), from: p.from, to: p.to, reply: p.reply, se: p.se, sp: p.sp, sl: p.sl, tone: p.tone, photo: p.photo };
  }
  function pfDiff(a, b) { var A = pfNorm(a), B = pfNorm(b); return Object.keys(A).filter(function (k) { return String(A[k]) !== String(B[k]); }); }
  function pfInitials(name) {
    var w = String(name || '').normalize('NFC').trim().split(/\s+/).filter(Boolean);
    if (!w.length) return '?';
    var a = Array.from(w[0]), s = w.length > 1 ? a[0] + Array.from(w[w.length - 1])[0] : a.slice(0, 2).join('');
    return s.toLocaleUpperCase();
  }
  function pfPaint(el, p) {
    var tone = PF_TONES[p.tone] || PF_TONES[0];
    el.style.setProperty('--c', tone); el.style.backgroundColor = tone;
    (el.querySelector('.pf-ini') || el).textContent = pfInitials(p.name);
    if (p.photo) { el.style.backgroundImage = 'url("' + p.photo + '")'; el.classList.add('has-img'); }
    else { el.style.backgroundImage = ''; el.classList.remove('has-img'); }
  }
  function pfDays(d) {
    d = d.slice().sort(function (a, b) { return a - b; });
    if (d.length === 7) return 'Every day';
    var out = [], i = 0;
    while (i < d.length) {
      var j = i; while (j + 1 < d.length && d[j + 1] === d[j] + 1) j++;
      out.push(j - i >= 2 ? PF_DN[d[i]] + '–' + PF_DN[d[j]] : d.slice(i, j + 1).map(function (x) { return PF_DN[x]; }).join(', '));
      i = j + 1;
    }
    return out.join(', ');
  }
  function pfZone(v) { if (v === 'auto') { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch (e) { return 'UTC'; } } return v; }
  function pfLocalTime(v) { try { return new Intl.DateTimeFormat(window.SDI18N && SDI18N.lang === 'vi' ? 'vi-VN' : 'en-US', { hour: 'numeric', minute: '2-digit', timeZone: pfZone(v) }).format(new Date()); } catch (e) { return ''; } }

  var pfSaved = pfSane(pfLoad()), pfDraft = pfClone(pfSaved), pfTab = 'portal', pfNameShown = 'ScopeDue user';
  var pfEl = { name: pfId('pf-name'), title: pfId('pf-ttl'), biz: pfId('pf-biz'), email: pfId('pf-email'), phone: pfId('pf-phone'), city: pfId('pf-city'), tz: pfId('pf-tz'), bio: pfId('pf-bio'), from: pfId('pf-from'), to: pfId('pf-to') };
  var pfReply = pfId('pf-reply'), pfPvSeg = pfId('pf-pvseg'), pfDaysEl = pfId('pf-days'), pfBar = pfId('pf-bar'), pfUser = document.querySelector('.user');
  var PF_SW = [['se', 'pf-sw-se'], ['sp', 'pf-sw-sp'], ['sl', 'pf-sw-sl']];
  var PF_STEPIDS = { photo: 'pfp', title: 'pf-ttl', biz: 'pf-biz', email: 'pf-email', bio: 'pf-bio', city: 'pf-city' };
  document.querySelectorAll('.c-pp[aria-label*="ScopeDue user"]').forEach(function (n) { n.setAttribute('data-tpl', n.getAttribute('aria-label').split('ScopeDue user').join('{me}')); });

  /* ---------- v68: a project's portal theme. A picker: a small picture of each theme in the studio's colour, and the chosen
     theme's colour tones under it. Used by New project and by the project page (Change portal theme). ---------- */
  function ptMini(t, cls) {
    var v = t.v || t, st = '--p:' + v.page + ';--t:' + v.top + ';--c:' + v.card + ';--k:' + v.ink + ';--m:' + v.muted + ';--l:' + v.line + ';--a:' + v.acc + ';--pa:' + v.pa + ';--pb:' + v.pb + ';--cr:' + v.cream + ';--am:' + v.amber + ';--sh:' + (v.sh || 'linear-gradient(165deg,' + v.pa + ',' + v.pb + ')') + ';--f:' + v.font + ';--w:' + v.dw;
    return '<span class="pt-m' + (cls ? ' ' + cls : '') + '" style="' + esc(st) + '" aria-hidden="true"><i class="pt-bar"><i class="pt-dot"></i></i><span class="pt-aa" translate="no">Aa</span><i class="pt-ln"></i><i class="pt-ln s"></i><i class="pt-chip"></i><i class="pt-pn"><i></i></i></span>';
  }
  /* "Ivory · Navy", "Automatic" */
  function ptLabel(v) { var x = ptSplit(v); return x[0] ? x[0].name + (x[1] ? ' · ' + x[1].name : '') : 'Automatic'; }
  /* host: an empty element. opts.compact: names only, four across. opts.label: the group's name. opts.change(v) */
  function ptPicker(host, opts) {
    opts = opts || {};
    var val = '', light = PF_PT[0], dark = PF_PT.filter(function (t) { return t.dark; })[0] || light;
    var rows = [{ id: '', name: 'Automatic', note: 'Light or dark, as your client’s device is set.', pic: ptMini(light) + ptMini(dark, 'pt-split') }].concat(PF_PT.map(function (t) { return { id: t.id, name: t.name, note: t.note, pic: ptMini(t) }; }));
    host.classList.add('pt-host'); if (opts.compact) host.classList.add('pt-compact');
    host.innerHTML = '<div class="pt-grid" role="radiogroup" aria-label="' + esc(opts.label || 'Portal theme') + '">' + rows.map(function (r) {
      return '<button type="button" role="radio" class="pt-o" data-pt="' + esc(r.id) + '" aria-checked="false" tabindex="-1"><span class="pt-pic">' + r.pic + '<span class="pt-ck"><svg class="i"><use href="#i-tick"/></svg></span></span><span class="pt-t"><b>' + esc(r.name) + '</b>' + (opts.compact ? '' : '<small>' + esc(r.note) + '</small>') + '</span></button>';
    }).join('') + '</div><div class="pt-pal" hidden><div class="pt-pal-h">Color tone</div><div class="pt-sws" role="radiogroup" aria-label="Color tone"></div></div>';
    var grid = host.querySelector('.pt-grid'), w = host.querySelector('.pt-pal'), pl = host.querySelector('.pt-sws');
    function paint() {
      var x = ptSplit(val), tid = x[0] ? x[0].id : '';
      grid.querySelectorAll('.pt-o').forEach(function (b) {
        var bid = b.getAttribute('data-pt'), on = bid === tid, t = ptSplit(bid)[0];
        b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1;
        if (t && t.pal) { var pic = b.querySelector('.pt-pic'), ck = pic.querySelector('.pt-ck'); pic.innerHTML = ptMini(on && x[1] ? x[1].v : t); pic.appendChild(ck); }   /* the theme's picture, in the chosen tone */
      });
      /* the chosen theme's tones: its own colours first (named by the theme, else the photo's colour), then the others */
      w.hidden = !(x[0] && x[0].pal && x[0].pal.length);
      if (w.hidden) { pl.innerHTML = ''; pl.removeAttribute('data-for'); return; }
      if (pl.getAttribute('data-for') !== tid) {
        pl.setAttribute('data-for', tid);
        pl.innerHTML = [{ id: '', name: x[0].pal0 || 'Your photo’s color', v: { page: x[0].v.page, acc: x[0].v.acc } }].concat(x[0].pal).map(function (q) {
          return '<button type="button" role="radio" class="pt-sw" data-pal="' + esc(q.id) + '" aria-checked="false" tabindex="-1"><span class="pt-dotw" style="' + esc('--p:' + q.v.page + ';--a:' + q.v.acc) + '" aria-hidden="true"><i></i></span><span class="pt-sn">' + esc(q.name) + '</span></button>';
        }).join('');
      }
      var pid = x[1] ? x[1].id : '';
      pl.querySelectorAll('.pt-sw').forEach(function (b) { var on = b.getAttribute('data-pal') === pid; b.setAttribute('aria-checked', on ? 'true' : 'false'); b.tabIndex = on ? 0 : -1; });
    }
    function set(v, quiet) { val = ptValid(v) ? v : ''; paint(); if (!quiet && opts.change) opts.change(val); }
    function pick(b, focus) {
      var bid = b.getAttribute('data-pt'), cur = ptSplit(val)[0];
      set(cur && cur.id === bid ? val : bid);   /* the same theme again keeps its tone */
      if (focus) grid.querySelector('[data-pt="' + bid + '"]').focus();
    }
    function pickPal(b, focus) {
      var t = ptSplit(val)[0]; if (!t) return;
      var pal = b.getAttribute('data-pal'); set(t.id + (pal ? '.' + pal : ''));
      if (focus) pl.querySelector('[data-pal="' + pal + '"]').focus();
    }
    function arrows(sel, fn) {   /* a radio group: the arrows move the choice */
      return function (e) {
        var k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!k) return;
        var l = [].slice.call(this.querySelectorAll(sel)), i = l.indexOf(document.activeElement); if (i < 0) return;
        e.preventDefault(); fn(l[(i + k + l.length) % l.length], true);
      };
    }
    grid.addEventListener('click', function (e) { var b = e.target.closest('.pt-o'); if (b) pick(b, false); });
    grid.addEventListener('keydown', arrows('.pt-o', pick));
    pl.addEventListener('click', function (e) { var b = e.target.closest('.pt-sw'); if (b) pickPal(b, false); });
    pl.addEventListener('keydown', arrows('.pt-sw', pickPal));
    paint();
    return {
      set: function (v) { set(v, true); },
      value: function () { return val; },
      tone: function (hex) { host.style.setProperty('--tone', hex); }
    };
  }
  /* "See it": the portal's own demo in a theme, when the server says where the portal is (GET /v1/health → portal) */
  function ptSeeUrl(v) {
    var base = typeof SY !== 'undefined' && SY.portal || '';
    return base ? base + (base.indexOf('?') > -1 ? '&' : '?') + 'demo' + (v ? '&theme=' + encodeURIComponent(v) : '') + (window.SDI18N ? '&lang=' + SDI18N.lang : '') : '';
  }
  function ptTone() { return PF_TONES[(typeof pfSaved !== 'undefined' && pfSaved ? pfSaved.tone : 0)] || PF_TONES[0]; }

  /* validation */
  var PF_RULES = {
    name: function (n) { return n.name.length < 2 ? 'Add the name your clients know you by.' : ''; },
    email: function (n) { return n.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(n.email) ? 'That email address does not look right.' : ''; },
    phone: function (n) { var d = n.phone.replace(/\D/g, ''); return n.phone && (!/^[+()\d][\d\s().\-]*$/.test(n.phone) || d.length < 7 || d.length > 15) ? 'Use 7 to 15 digits, like +1 555 010 2030.' : ''; },
    days: function (n) { return n.days.length ? '' : 'Pick at least one working day.'; },
    to: function (n) { return n.to <= n.from ? 'Finish time must be after the start.' : ''; }
  };
  var PF_WRAP = { name: 'f-pf-name', email: 'f-pf-email', phone: 'f-pf-phone', days: 'f-pf-days', to: 'f-pf-to' };
  function pfErr(key, msg) {
    var f = pfId(PF_WRAP[key]), e = f.querySelector('.err'), c = f.querySelector('input,select,textarea');
    if (msg) { f.setAttribute('data-err', ''); e.textContent = msg; if (c) c.setAttribute('aria-invalid', 'true'); }
    else { f.removeAttribute('data-err'); e.textContent = ''; if (c) c.removeAttribute('aria-invalid'); }
  }
  function pfCheck(key) { var m = PF_RULES[key](pfNorm(pfDraft)); pfErr(key, m); return !m; }
  function pfClear(key) { if (PF_WRAP[key] && pfId(PF_WRAP[key]).hasAttribute('data-err')) pfErr(key, ''); }

  /* form <-> draft */
  function pfWrite(p) {
    ['name', 'title', 'biz', 'email', 'phone', 'city', 'bio', 'tz', 'from', 'to'].forEach(function (k) { pfEl[k].value = p[k]; });
    pfDaysEl.querySelectorAll('.pf-day').forEach(function (b) { b.setAttribute('aria-pressed', p.days.indexOf(+b.getAttribute('data-d')) > -1 ? 'true' : 'false'); });
    setPressed(pfReply, p.reply);
    PF_SW.forEach(function (s) { pfId(s[1]).setAttribute('aria-checked', p[s[0]] ? 'true' : 'false'); });
    Object.keys(PF_WRAP).forEach(function (k) { pfErr(k, ''); });
  }
  ['name', 'title', 'biz', 'email', 'phone', 'city', 'bio'].forEach(function (k) {
    pfEl[k].addEventListener('input', function () { pfDraft[k] = pfEl[k].value; pfClear(k); pfRender(); });
  });
  ['name', 'email', 'phone'].forEach(function (k) { pfEl[k].addEventListener('blur', function () { if (pfEl[k].value.trim() || k === 'name') pfCheck(k); }); });
  pfEl.tz.addEventListener('change', function () { pfDraft.tz = pfEl.tz.value; pfRender(); });
  ['from', 'to'].forEach(function (k) { pfEl[k].addEventListener('change', function () { pfDraft[k] = pfEl[k].value; pfClear('to'); pfRender(); }); });
  pfDaysEl.addEventListener('click', function (e) {
    var b = e.target.closest('.pf-day'); if (!b) return;
    var d = +b.getAttribute('data-d'), i = pfDraft.days.indexOf(d);
    if (i > -1) pfDraft.days.splice(i, 1); else pfDraft.days.push(d);
    b.setAttribute('aria-pressed', i > -1 ? 'false' : 'true'); pfClear('days'); pfRender();
  });
  pfReply.addEventListener('click', function (e) { var b = e.target.closest('button[data-f]'); if (!b) return; pfDraft.reply = b.getAttribute('data-f'); setPressed(pfReply, pfDraft.reply); pfRender(); });
  PF_SW.forEach(function (s) { pfId(s[1]).addEventListener('click', function () { pfDraft[s[0]] = !pfDraft[s[0]]; this.setAttribute('aria-checked', pfDraft[s[0]] ? 'true' : 'false'); pfRender(); }); });
  pfPvSeg.addEventListener('click', function (e) { var b = e.target.closest('button[data-f]'); if (!b) return; pfTab = b.getAttribute('data-f'); setPressed(pfPvSeg, pfTab); pfPreview(pfNorm(pfDraft), true); });
  pfId('pf-rm').addEventListener('click', function () { pfDraft.photo = ''; pfRender(); });

  /* render */
  function pfSteps(n) {
    return [['photo', !!n.photo, 'Add a photo', 'Add photo'], ['title', !!n.title, 'Add your job title', 'Add title'], ['biz', !!n.biz, 'Add your business name', 'Add name'],
      ['email', !!n.email && PF_RULES.email(n) === '', 'Add a contact email', 'Add email'], ['bio', !!n.bio, 'Write a short bio', 'Write bio'], ['city', !!n.city, 'Add your location', 'Add location']];
  }
  function pfStrength(n) {
    var st = pfSteps(n), done = st.filter(function (x) { return x[1]; }).length, next = st.filter(function (x) { return !x[1]; })[0];
    pfId('pf-ticks').querySelectorAll('i').forEach(function (t, i) { t.style.setProperty('--k', i); t.classList.toggle('on', i < done); });
    pfId('pf-str-t').innerHTML = next ? '<b>' + done + ' of 6</b>Next: ' + next[2].charAt(0).toLowerCase() + next[2].slice(1) : '<b>Complete</b>Clients see everything they need.';
    var go = pfId('pf-str-go'); go.hidden = !next || next[0] === 'photo';   // the photo has its own button, just above
    xbPhotoBtn(n);
    if (next) { go.textContent = next[3]; go.setAttribute('data-k', next[0]); }
  }
  function pfPreview(n, animate) {
    var stage = pfId('pv-stage'), role = [n.title, n.biz].filter(Boolean).join(' · '), html;
    if (pfTab === 'portal') {
      var rows = [IC('chat') + '<span>' + PF_REPLY[n.reply] + '</span>', IC('clock') + '<span>' + pfDays(n.days) + ' · ' + n.from + '–' + n.to + '</span>'];
      if (n.sl) { var lt = pfLocalTime(n.tz); rows.push(IC('pin') + '<span>' + (n.city ? esc(n.city) + (lt ? ' · ' : '') : '') + (lt ? lt + ' local time' : '') + '</span>'); }
      if (n.se && n.email) rows.push(IC('mail') + '<span>' + esc(n.email) + '</span>');
      if (n.sp && n.phone) rows.push(IC('phone') + '<span>' + esc(n.phone) + '</span>');
      html = '<div class="pv-panel' + (animate ? ' in' : '') + '"><div class="pv-eyebrow">Client portal · welcome card</div>' +
        '<div class="pv-who"><span class="pv-av" id="pv-av"></span><div><b>' + esc(n.name || 'Your name') + '</b><small' + (role ? '' : ' class="empty"') + '>' + esc(role || 'Your job title and business') + '</small></div></div>' +
        '<p class="pv-bio' + (n.bio ? '' : ' empty') + '">' + esc(n.bio || 'Your bio appears here.') + '</p>' +
        '<ul class="pv-rows">' + rows.map(function (r) { return '<li>' + r + '</li>'; }).join('') + '</ul><p class="pv-acc"><i style="background:' + (PF_TONES[n.tone] || PF_TONES[0]) + '"></i>Your portal uses your photo’s color.</p></div>';
    } else {
      html = '<div class="pv-panel' + (animate ? ' in' : '') + '"><div class="pv-eyebrow">Team chat · project</div>' +
        '<div class="pv-msg"><span class="pv-av" id="pv-av"></span><div><div class="nm">' + esc(n.name || 'Your name') + (n.title ? '<span>' + esc(n.title) + '</span>' : '') + '</div><div class="pv-bub">Draft is ready for review. I will share it with the client once you have had a look.</div></div></div>' +
        '<div class="pv-team"><span class="avs"><span class="av" id="pv-av2"></span><span class="av" style="--c:#2f4a7a">LA</span><span class="av" style="--c:#3d5a8f">QB</span></span><div>Online store<small>Your photo shows on tasks and approvals.</small></div></div></div>';
    }
    stage.innerHTML = html;
    var a = pfId('pv-av'), b = pfId('pv-av2'); if (a) pfPaint(a, pfDraft); if (b) pfPaint(b, pfDraft);
  }
  function pfRender() {
    var n = pfNorm(pfDraft), role = [n.title, n.biz].filter(Boolean).join(' · '), re = pfId('pf-hrole'), diff = pfDiff(pfSaved, pfDraft);
    pfId('pf-hname').textContent = n.name || 'Your name';
    re.textContent = role || 'Add your job title and business'; re.classList.toggle('empty', !role);
    pfPaint(pfId('pf-av'), pfDraft);
    pfId('pf-rm').hidden = !n.photo;
    var len = pfDraft.bio.length, c = pfId('pf-cnt'); c.textContent = len + ' / ' + PF_MAX.bio; c.classList.toggle('near', len >= 200);
    pfStrength(n); pfPreview(n, false);
    var labels = []; diff.forEach(function (k) { if (labels.indexOf(PF_GROUP[k]) < 0) labels.push(PF_GROUP[k]); });
    pfId('pf-bar-s').textContent = labels.length ? labels.slice(0, 2).join(', ') + (labels.length > 2 ? ' +' + (labels.length - 2) : '') : '';
    if (diff.length) pfBar.setAttribute('data-show', ''); else pfBar.removeAttribute('data-show');
    if (diff.length) pfUser.setAttribute('data-dirty', ''); else pfUser.removeAttribute('data-dirty');
  }
  function pfShared() {
    var p = pfSaved;
    pfPaint(pfUser.querySelector('.avatar'), p);
    pfUser.querySelector('.user-txt b').textContent = p.name;
    pfUser.setAttribute('data-tip', p.name); acctPaint();
    document.querySelectorAll('.av.me').forEach(function (n) { pfPaint(n, p); });
    document.querySelectorAll('.c-pp[data-tpl]').forEach(function (n) { n.setAttribute('aria-label', n.getAttribute('data-tpl').split('{me}').join(p.name)); });
  }
  function pfPersist() { try { localStorage.setItem('sd-profile', JSON.stringify(pfSaved)); } catch (e) {} }
  function pfApplyState(saved, draft) { pfSaved = saved; pfDraft = pfClone(draft); pfPersist(); pfWrite(pfDraft); pfShared(); pfRender(); syProfileSoon(); }

  /* save / discard */
  function pfSave() {
    if (!pfDiff(pfSaved, pfDraft).length) return;
    var bad = null;
    ['name', 'email', 'phone', 'days', 'to'].forEach(function (k) { if (!pfCheck(k) && !bad) bad = k; });
    if (bad) {
      var t = bad === 'days' ? pfDaysEl.querySelector('.pf-day') : pfEl[bad];
      if (t) { t.focus({ preventScroll: true }); t.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }); }
      return;
    }
    var prev = pfSaved, next = pfSane(pfNorm(pfDraft));
    pfApplyState(next, next);
    var av = pfId('pf-av'); av.classList.remove('pop'); void av.offsetWidth; av.classList.add('pop');
    var undo = function () { pfApplyState(prev, next); };
    showToast('Profile saved', undo);
  }
  function pfDiscard() {
    if (!pfDiff(pfSaved, pfDraft).length) return;
    var snap = pfClone(pfDraft);
    pfDraft = pfClone(pfSaved); pfWrite(pfDraft); pfRender();
    var undo = function () { pfDraft = snap; pfWrite(pfDraft); pfRender(); };
    showToast('Changes discarded', undo);
  }
  pfId('pf').addEventListener('submit', function (e) { e.preventDefault(); pfSave(); });
  pfId('pf-discard').addEventListener('click', pfDiscard);
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's' && curView === 'profile' && !openEl) { e.preventDefault(); pfSave(); }
  });
  window.addEventListener('beforeunload', function (e) { if (pfDiff(pfSaved, pfDraft).length) { e.preventDefault(); e.returnValue = ''; } });
  pfId('pf-str-go').addEventListener('click', function () {
    var k = this.getAttribute('data-k');
    if (k === 'photo') { openDrawer('photo', this); return; }
    var f = pfId(PF_STEPIDS[k]); if (!f) return;
    f.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' }); f.focus({ preventScroll: true });
  });
  function pfEnter() { moveThumb(pfReply, false); moveThumb(pfPvSeg, false); pfRender(); }

  /* ---------- profile photo drawer ---------- */
  var pfpD = pfId('drawer-photo'), pfpDrop = pfId('pfp-drop'), pfpFile = pfId('pfp-file'), pfpErrEl = pfId('pfp-err'), pfpCur = pfId('pfp-cur'), pfpEdit = pfId('pfp-edit');
  var pfpStage = pfId('pfp-stage'), pfpImg = pfId('pfp-img'), pfpMask = pfId('pfp-mask'), pfpZ = pfId('pfp-z'), pfpTonesEl = pfId('pfp-tones'), pfpGo = pfId('pfp-go');
  var pfp = { mode: 'empty', img: null, url: null, iw: 0, ih: 0, z: 1, ox: 0, oy: 0, photo: '', tone: 0 };
  var PFP_MAXB = 5 * 1024 * 1024;

  function pfpClamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function pfpErr(msg) { pfpErrEl.hidden = !msg; pfpErrEl.textContent = msg || ''; }
  function pfpFree() { if (pfp.url) { URL.revokeObjectURL(pfp.url); pfp.url = null; } pfp.img = null; pfpImg.removeAttribute('src'); }
  function pfpOnOpen() {
    pfpFree(); pfpErr('');
    pfp.photo = pfDraft.photo; pfp.tone = pfDraft.tone; pfp.mode = pfp.photo ? 'current' : 'empty';
    pfpTones(); pfpRender();
    return pfp.mode === 'current' ? '#pfp-again' : '#pfp-drop';
  }
  function pfpTones() {
    var ini = pfInitials(pfDraft.name);
    pfpTonesEl.innerHTML = PF_TONES.map(function (c, i) { return '<button type="button" class="pfp-tone" role="radio" aria-checked="' + (i === pfp.tone) + '" tabindex="' + (i === pfp.tone ? 0 : -1) + '" style="--c:' + c + '" aria-label="' + PF_TONE_N[i] + '" data-i="' + i + '">' + esc(ini) + '</button>'; }).join('');
  }
  function pfpToneSel(i, focus) {
    pfp.tone = i;
    pfpTonesEl.querySelectorAll('.pfp-tone').forEach(function (b, k) { b.setAttribute('aria-checked', k === i ? 'true' : 'false'); b.tabIndex = k === i ? 0 : -1; if (k === i && focus) b.focus(); });
    pfpRender();
  }
  function pfpRender() {
    pfpDrop.hidden = pfp.mode !== 'empty'; pfpCur.hidden = pfp.mode !== 'current'; pfpEdit.hidden = pfp.mode !== 'crop';
    if (pfp.mode === 'current') pfPaint(pfId('pfp-circle'), { name: pfDraft.name, photo: pfp.photo, tone: pfp.tone });
    pfpGo.textContent = pfp.mode === 'crop' ? 'Use photo' : 'Done';
    if (pfp.mode === 'crop') pfpLayout();
  }
  function pfpLayout() {
    var S = pfpStage.clientWidth; if (!S || !pfp.img) return;
    var V = Math.round(S * 0.86), sc = (V / Math.min(pfp.iw, pfp.ih)) * pfp.z, w = pfp.iw * sc, h = pfp.ih * sc;
    var mx = Math.max(0, (w - V) / 2), my = Math.max(0, (h - V) / 2);
    pfp.ox = pfpClamp(pfp.ox, -mx, mx); pfp.oy = pfpClamp(pfp.oy, -my, my);
    pfpMask.style.width = pfpMask.style.height = V + 'px';
    pfpImg.style.width = w + 'px'; pfpImg.style.height = h + 'px';
    pfpImg.style.transform = 'translate(calc(-50% + ' + pfp.ox + 'px), calc(-50% + ' + pfp.oy + 'px))';
    pfpZ.value = Math.round(pfp.z * 100); pfpZ.style.setProperty('--p', ((pfp.z - 1) / 2 * 100) + '%');
  }
  function pfpZoom(z) { z = pfpClamp(z, 1, 3); var r = z / pfp.z; pfp.ox *= r; pfp.oy *= r; pfp.z = z; pfpLayout(); }
  function pfpLoad(f) {
    pfpErr('');
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) { pfpErr('Choose a JPG, PNG or WebP image.'); return; }
    if (f.size > PFP_MAXB) { pfpErr('That photo is over 5 MB. Choose a smaller one.'); return; }
    var url = URL.createObjectURL(f), im = new Image();
    im.onload = function () {
      if (Math.min(im.naturalWidth, im.naturalHeight) < 80) { URL.revokeObjectURL(url); pfpErr('That image is too small. Use one at least 80 px wide.'); return; }
      pfpFree(); pfp.url = url; pfp.img = im; pfp.iw = im.naturalWidth; pfp.ih = im.naturalHeight; pfp.z = 1; pfp.ox = 0; pfp.oy = 0; pfp.mode = 'crop';
      pfpImg.src = url;
      pfId('pfp-note').textContent = Math.min(pfp.iw, pfp.ih) < 240 ? 'This image is small, so it may look soft.' : 'Drag to reposition. Scroll or use the slider to zoom.';
      pfpRender();
      if (pfD_open()) pfpStage.focus({ preventScroll: true });
    };
    im.onerror = function () { URL.revokeObjectURL(url); pfpErr('We could not read that image. Try a different file.'); };
    im.src = url;
  }
  function pfD_open() { return pfpD.hasAttribute('data-open'); }
  function pfpExport() {
    var S = pfpStage.clientWidth, V = Math.round(S * 0.86), sc = (V / Math.min(pfp.iw, pfp.ih)) * pfp.z;
    var sx = pfp.iw / 2 + (-V / 2 - pfp.ox) / sc, sy = pfp.ih / 2 + (-V / 2 - pfp.oy) / sc, sw = V / sc;
    var c = document.createElement('canvas'); c.width = c.height = 320;
    var g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 320, 320); g.imageSmoothingQuality = 'high';
    g.drawImage(pfp.img, sx, sy, sw, sw, 0, 0, 320, 320);
    return c.toDataURL('image/jpeg', 0.86);
  }
  function pfpApply() {
    if (pfp.mode === 'crop') { try { pfp.photo = pfpExport(); } catch (e) { pfpErr('We could not process that photo. Try a different one.'); return; } }
    var changed = pfDraft.photo !== pfp.photo || pfDraft.tone !== pfp.tone;
    pfDraft.photo = pfp.photo; pfDraft.tone = pfp.tone;
    pfpFree(); pfRender(); closeDrawer();
    if (changed) { var av = pfId('pf-av'); av.classList.remove('pop'); void av.offsetWidth; av.classList.add('pop'); }
  }
  pfpGo.addEventListener('click', pfpApply);
  pfpD.addEventListener('keydown', function (e) { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); pfpApply(); } });
  function pfpPick() { pfpFile.click(); }
  pfpDrop.addEventListener('click', pfpPick);
  pfpDrop.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pfpPick(); } });
  pfId('pfp-again').addEventListener('click', pfpPick);
  pfId('pfp-again2').addEventListener('click', pfpPick);
  pfId('pfp-rm').addEventListener('click', function () { pfp.photo = ''; pfp.mode = 'empty'; pfpRender(); pfpDrop.focus({ preventScroll: true }); });
  pfpFile.addEventListener('change', function () { var f = pfpFile.files && pfpFile.files[0]; pfpFile.value = ''; pfpLoad(f); });
  pfpTonesEl.addEventListener('click', function (e) { var b = e.target.closest('.pfp-tone'); if (b) pfpToneSel(+b.getAttribute('data-i'), false); });
  pfpTonesEl.addEventListener('keydown', function (e) {
    var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0; if (!d) return;
    e.preventDefault(); pfpToneSel((pfp.tone + d + PF_TONES.length) % PF_TONES.length, true);
  });
  /* crop interactions */
  var pfpDrag = null;
  pfpStage.addEventListener('pointerdown', function (e) {
    if (pfp.mode !== 'crop') return;
    pfpDrag = { x: e.clientX, y: e.clientY, ox: pfp.ox, oy: pfp.oy };
    try { pfpStage.setPointerCapture(e.pointerId); } catch (x) {}
    pfpStage.classList.add('dragging'); pfpStage.focus({ preventScroll: true });
  });
  pfpStage.addEventListener('pointermove', function (e) { if (!pfpDrag) return; pfp.ox = pfpDrag.ox + (e.clientX - pfpDrag.x); pfp.oy = pfpDrag.oy + (e.clientY - pfpDrag.y); pfpLayout(); });
  ['pointerup', 'pointercancel'].forEach(function (ev) { pfpStage.addEventListener(ev, function () { pfpDrag = null; pfpStage.classList.remove('dragging'); }); });
  pfpStage.addEventListener('wheel', function (e) { if (pfp.mode !== 'crop') return; e.preventDefault(); pfpZoom(pfp.z * Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
  pfpStage.addEventListener('keydown', function (e) {
    if (pfp.mode !== 'crop') return;
    var st = e.shiftKey ? 32 : 8, k = e.key, used = true;
    if (k === 'ArrowLeft') pfp.ox += st; else if (k === 'ArrowRight') pfp.ox -= st; else if (k === 'ArrowUp') pfp.oy += st; else if (k === 'ArrowDown') pfp.oy -= st;
    else if (k === '+' || k === '=') pfpZoom(pfp.z + 0.1); else if (k === '-' || k === '_') pfpZoom(pfp.z - 0.1); else used = false;
    if (used) { e.preventDefault(); pfpLayout(); }
  });
  pfpZ.addEventListener('input', function () { pfpZoom(pfpZ.value / 100); });
  window.addEventListener('resize', function () { if (pfp.mode === 'crop' && pfD_open()) pfpLayout(); });
  /* drag and drop (drawer + hero avatar) */
  function pfHasFiles(e) { return e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') > -1; }
  pfpD.addEventListener('dragover', function (e) { if (!pfHasFiles(e)) return; e.preventDefault(); pfpDrop.classList.add('drag'); });
  pfpD.addEventListener('dragleave', function (e) { if (!pfpD.contains(e.relatedTarget)) pfpDrop.classList.remove('drag'); });
  pfpD.addEventListener('drop', function (e) { if (!pfHasFiles(e)) return; e.preventDefault(); pfpDrop.classList.remove('drag'); pfpLoad(e.dataTransfer.files[0]); });
  var pfAv = pfId('pf-av');
  pfAv.addEventListener('dragover', function (e) { if (!pfHasFiles(e)) return; e.preventDefault(); pfAv.classList.add('drag'); });
  pfAv.addEventListener('dragleave', function () { pfAv.classList.remove('drag'); });
  pfAv.addEventListener('drop', function (e) {
    if (!pfHasFiles(e)) return; e.preventDefault(); pfAv.classList.remove('drag');
    var f = e.dataTransfer.files[0]; openDrawer('photo', pfAv); pfpLoad(f);
  });

  /* init */
  pfEl.tz.innerHTML = PF_TZ.map(function (z) { return '<option value="' + z[0] + '">' + esc(z[1]) + '</option>'; }).join('');
  pfEl.from.innerHTML = pfEl.to.innerHTML = pfHours.map(function (h) { return '<option value="' + h + '">' + h + '</option>'; }).join('');
  pfWrite(pfDraft); pfShared();   /* v68: the Profile page itself is drawn when it is opened (pfEnter), not at start */

