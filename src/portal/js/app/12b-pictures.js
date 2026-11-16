/* ───── v102 (CONTRACT 59): pictures from the client ─────
   A request, a question, a note, I'd like changes and Not as agreed can carry up to 6 pictures. Each is made smaller here before it
   goes (a JPEG of at most 1600 px, as on the Viewer portal). The server lists each one on the record with the fingerprint of what
   arrived, and holds the bytes only until the studio has them, so the record shows a picture by name, size and fingerprint. This tab
   keeps what it sent, to show the pictures themselves until it is closed. */
var PIC_MAX = 6;
var PIC_SENT = {};   // 'e|<project>|<CR>|<idx>' or 'm|<project>|<event>' -> the data addresses this tab sent
function picFld() {
  var sn = studioName();
  return '<div class="fld pic-f"><span>Pictures <em>(optional)</em></span><label class="pic-drop" id="pic-drop"><input type="file" id="f-pics" accept="image/*" multiple>' + IC('plus', 16, 1.8) +
    '<span><b>Add pictures</b><small id="pic-n"></small></span></label><div class="pic-l" id="pic-l"></div><p class="pic-why">' + esc('Pictures go to ' + sn + ' through ScopeDue’s server, which deletes them once ' + sn + ' has them.') + '</p></div>';
}
function picPaint() {
  var el = $('#pic-l'), pn = $('#pic-n'), dz = $('#pic-drop'), ps = (DL && DL.pics) || []; if (!el) return;
  if (pn) pn.textContent = ps.length ? ps.length + ' of ' + PIC_MAX + ' added' : 'Up to ' + PIC_MAX + ', made smaller before they go';
  if (dz) dz.classList.toggle('full', ps.length >= PIC_MAX);
  el.innerHTML = ps.map(function (x, i) { return '<span class="pic"><img alt="" src="' + picUrl(x.data) + '"><button type="button" data-a="unpic" data-i="' + i + '" aria-label="Remove picture ' + (i + 1) + '">' + IC('x', 14, 2) + '</button></span>'; }).join('');
}
function picUrl(b64) { return /^[A-Za-z0-9+\/]+=*$/.test(String(b64)) ? 'data:image/jpeg;base64,' + b64 : ''; }
function picHex(buf) { return [].map.call(new Uint8Array(buf), function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
/* a picture made smaller, with the fingerprint of the bytes that will go (the server records the same one) */
function picShrink(file) {
  return new Promise(function (res) {
    var img = new Image(), rd = new FileReader();   // read as data: (the portal's CSP takes data: images, not blob:)
    img.onload = function () {
      var k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas'), q = 0.82, out, g;
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); g = c.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);   // a JPEG has no transparency: what was see-through turns white
      g.drawImage(img, 0, 0, c.width, c.height);
      do { out = c.toDataURL('image/jpeg', q); q -= 0.12; } while (out.length > 590000 && q > 0.3);
      if (out.length > 600000) return res(null);
      var data = out.split(',')[1], bin = atob(data), bytes = new Uint8Array(bin.length), i;
      for (i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      var p = { name: (file.name || 'picture').replace(/\.[^.]{1,5}$/, '').slice(0, 74) + '.jpg', type: 'image/jpeg', data: data, size: bytes.length, sha: '' };
      try { crypto.subtle.digest('SHA-256', bytes).then(function (h) { p.sha = picHex(h); res(p); }, function () { res(p); }); } catch (e) { res(p); }
    };
    img.onerror = function () { res(null); };
    rd.onload = function () { img.src = String(rd.result || ''); };
    rd.onerror = function () { res(null); };
    rd.readAsDataURL(file);
  });
}
function picAdd(files) {
  if (!DL) return; DL.pics = DL.pics || [];
  var fs = [].slice.call(files || [], 0).filter(function (f) { return /^image\//.test(f.type); }).slice(0, PIC_MAX - DL.pics.length);
  if (!fs.length) return;
  DL.picBusy = true; syncDlg();
  Promise.all(fs.map(picShrink)).then(function (ps) {
    var bad = ps.filter(function (x) { return !x; }).length;
    if (DL) { DL.pics = DL.pics.concat(ps.filter(Boolean)).slice(0, PIC_MAX); DL.picBusy = false; picPaint(); syncDlg(); }
    if (bad) dlgErr(bad === 1 ? 'One picture could not be read. Try another file.' : bad + ' pictures could not be read. Try other files.');
  });
}
document.addEventListener('change', function (e) { if (e.target && e.target.id === 'f-pics') { picAdd(e.target.files); e.target.value = ''; } });
/* what goes to the server, and what this tab keeps to show */
function picBody() { return ((DL && DL.pics) || []).map(function (x) { return { name: x.name, type: x.type, data: x.data }; }); }
function picKeep(key) { var ps = (DL && DL.pics) || []; if (ps.length) PIC_SENT[key] = ps.map(function (x) { return picUrl(x.data); }); }
/* the record's own list, for a demo entry made here */
function picMeta() { return ((DL && DL.pics) || []).map(function (x) { return { n: x.name, type: x.type, size: x.size, sha: x.sha, st: 'held' }; }); }
function picSize(n) { return n < 1024 ? n + ' B' : n < 1048576 ? Math.round(n / 1024) + ' KB' : (n / 1048576).toFixed(1) + ' MB'; }
/* the pictures on an entry or a delivery answer: the picture itself while this tab has it, then its name, size, fingerprint and
   where it is: on its way, with the studio, or deleted after 30 days because the studio never took it */
function picsHTML(ps, key) {
  if (!ps || !ps.length) return '';
  var urls = PIC_SENT[key] || [], sn = studioName();
  return '<ul class="en-pics">' + ps.map(function (x, i) {
    var st = x.st === 'taken' ? 'Received by ' + sn : x.st === 'gone' ? 'Not received: deleted after 30 days' : 'On its way to ' + sn;
    return '<li' + (x.st === 'gone' ? ' class="gone"' : '') + '>' + (urls[i] ? '<img alt="" src="' + urls[i] + '">' : '<span class="pic-ic" aria-hidden="true">' + IC('doc', 16) + '</span>') +
      '<span><b>' + esc(x.n) + '</b><small>' + esc(picSize(x.size)) + (x.sha ? ' · <span class="mono" title="SHA-256 ' + esc(x.sha) + '">' + esc(x.sha.slice(0, 12)) + '</span>' : '') + ' · ' + esc(st) + '</small></span></li>';
  }).join('') + '</ul><p class="pic-note">Pictures are listed with their own fingerprints.</p>';
}
