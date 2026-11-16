/* ───── sign out, and the screens for when there is no session ───── */
function liveSignOut() {
  apiCall('DELETE', '/v1/session').then(function () { });
  liveForget(); closeAllD(); closeMenus(); wall('out');
}
function wall(kind) {
  LIVE.walled = true; clearInterval(LIVE.timer); cancelVerify(); closeAllD();
  root.classList.add('wall', 'go', 'seen', 'nodelay'); $('#dock').hidden = true;   // the demo's dock never shows on a wall (a link-less visit is not the demo)
  var sn = LIVE.name, slug = LIVE.slug || (BOOT.slug || ''), T, B, form = false;
  if (kind === 'expired') { T = 'This link has expired'; B = 'Links last for a short time so they stay safe. ' + (slug ? 'Enter your email and we will send you a new one.' : 'Ask ' + (sn || 'your studio') + ' to send you a new one.'); form = !!slug; }
  else if (kind === 'ended') { T = 'Your session has ended'; B = 'For your security the portal signs you out after a while. ' + (slug ? 'Enter your email and we will send you a fresh link.' : 'Open the link in your email again.'); form = !!slug; }
  else if (kind === 'out') { T = 'You are signed out'; B = 'To come back, open the link in your email. ' + (slug ? 'You can also ask for a new link below.' : ''); form = !!slug; }
  else if (kind === 'closed') { T = 'This portal is closed'; B = (sn || 'Your studio') + ' has closed this portal. Contact them if you need anything.'; }
  else if (kind === 'busy') { T = 'Please try again in a moment'; B = 'The portal is busy right now. Wait a minute, then try again.'; }
  else if (kind === 'offline') { T = 'We could not reach the server'; B = 'Check your connection and try again. Nothing was lost.'; }
  else { T = 'Open your portal link'; B = 'Your portal opens from the personal link in the email from your studio. ' + (slug ? 'Lost it? Enter your email and we will send a new one.' : 'If you cannot find it, ask your studio to send it again.'); form = !!slug; }
  $('#logo').innerHTML = IC('check', 16, 2.4); $('#logo').style.backgroundImage = '';
  $('#brandB').textContent = sn || 'Client portal'; $('#brandS').textContent = sn ? 'Client portal' : '';
  $('#view').innerHTML = '<main class="wallm" id="wallm"><h1 id="wallT" tabindex="-1">' + esc(T) + '</h1><p>' + esc(B) + '</p>' +
    (form ? '<form id="wform" novalidate><label class="fld"><span>Your email</span><input id="w-email" type="email" inputmode="email" autocomplete="email" placeholder="you@company.com" required><i class="em" hidden></i></label><div class="dlg-f"><button type="submit" class="solid" id="wgo">Email me a new link</button></div></form>' : '') +
    (kind === 'offline' || kind === 'busy' ? '<div class="dlg-f"><button type="button" class="solid" data-a="wretry">Try again</button></div>' : '') +
    '</main>';
  document.title = T + ' · Client portal' + (sn ? ' · ' + sn : '');
  var h = $('#wallT'); if (h) h.focus({ preventScroll: true });
}
document.addEventListener('submit', function (e) {
  if (e.target.id !== 'wform') return;
  e.preventDefault();
  var inp = $('#w-email'), em = inp.value.trim(), box = inp.closest('.fld'), msg = $('.em', box), go = $('#wgo');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { box.classList.add('err'); msg.hidden = false; msg.textContent = 'Enter the email address your studio has for you.'; inp.focus(); return; }
  box.classList.remove('err'); msg.hidden = true; go.disabled = true; go.textContent = 'Sending…';
  var slug = LIVE.slug || BOOT.slug;
  apiCall('POST', '/v1/login', { studio: slug, email: em }).then(function (r) {
    if (r.status === 202) {
      // the server answers the same for every address, so the words must not promise an email
      $('#wallm').innerHTML = '<h1 id="wallT" tabindex="-1">Check your email</h1><p>If ' + esc(em) + ' is the address ' + esc(LIVE.name || 'your studio') + ' has for you, a new link is on its way. It can take a minute. Open it on this device to continue.</p>';
      $('#wallT').focus({ preventScroll: true });
    } else {
      go.disabled = false; go.textContent = 'Email me a new link';
      box.classList.add('err'); msg.hidden = false;
      msg.textContent = r.status === 429 ? 'Too many requests. Try again in a little while.' : r.net ? 'We could not reach the server. Check your connection and try again.' : (errText(r) || 'Something went wrong. Try again.');
    }
  });
});

