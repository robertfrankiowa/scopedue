const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../scopedue-extension');
const server = http.createServer((req, res) => {
  const file = path.join(root, req.url.split('?')[0]);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  let body = fs.readFileSync(file, 'utf8');
  if (file.endsWith('app.js')) {
    // Expose closure state only in the test response to exercise session transitions.
    const end = body.lastIndexOf('})();');
    body = body.slice(0, end) + 'window.profileAuthTest = { showView, openDrawer, syPaint, syDisconnect, SY };\n' + body.slice(end);
  }
  res.setHeader('Content-Type', file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html');
  res.end(body);
});
(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => { localStorage.setItem('sd-first', 'sample'); localStorage.setItem('sd.lang', 'en'); });
    await page.goto(`http://127.0.0.1:${server.address().port}/app.html`);
    await page.waitForFunction(() => window.profileAuthTest);
    await page.locator('.user').click();
    await page.locator('[data-a="profile"]').click();
    assert.equal(await page.locator('#drawer-sync').getAttribute('data-open'), '');
    assert.equal(await page.locator('#pf-name').isVisible(), false);
    assert.equal(await page.locator('#sy-email').isVisible(), false);
    assert.equal(await page.locator('#sy-password').isVisible(), false);
    assert.equal(await page.locator('#sy-mode').isVisible(), false);
    await page.evaluate(() => SDI18N.set('vi'));
    await page.waitForFunction(() => document.querySelector('#sy-email-toggle').textContent === 'Tiếp tục bằng email');
    assert.equal(await page.locator('#sy-google').textContent(), 'Tiếp tục với Google');
    assert.equal(await page.locator('#sy-gnote').textContent(), 'Đăng nhập Google hoạt động trong tiện ích ScopeDue. Trên trang này, hãy chọn Tiếp tục bằng email.');
    assert.equal(await page.locator('#sy-email').isVisible(), false);
    await page.evaluate(() => SDI18N.set('en'));
    await page.waitForFunction(() => document.querySelector('#sy-email-toggle').textContent === 'Continue with email');
    assert.equal(await page.locator('#sy-gnote').textContent(), 'Google sign-in works in the ScopeDue extension. On this page, choose Continue with email.');
    await page.waitForTimeout(550);
    await page.screenshot({ path: path.resolve(__dirname, '../screenshots/sign-in-google-first.png') });
    await page.locator('#sy-email-toggle').focus();
    await page.locator('#sy-email-toggle').press('Enter');
    assert.equal(await page.locator('#sy-email').isVisible(), true);
    assert.equal(await page.locator('#sy-name').isVisible(), false);
    assert.equal(await page.locator('#sy-confirm').isVisible(), false);
    assert.equal(await page.locator('#sy-send').textContent(), 'Sign in');
    await page.evaluate(() => SDI18N.set('vi'));
    await page.waitForFunction(() => document.querySelector('#sy-title').textContent === 'Đăng nhập');
    assert.equal(await page.locator('#sy-email-toggle').textContent(), 'Tiếp tục bằng email');
    await page.locator('#sy-email-toggle').click();
    assert.equal(await page.locator('#sy-password').isVisible(), false);
    await page.locator('#sy-email-toggle').click();
    assert.equal(await page.locator('#sy-password').isVisible(), true);
    assert.equal(await page.locator('#sy-mode').textContent(), 'Đăng ký');
    assert.equal(await page.locator('#sy-switch-note').textContent(), 'Chưa có tài khoản?');
    assert.equal(await page.locator('#sy-send').textContent(), 'Đăng nhập');
    await page.locator('#sy-mode').click();
    await page.waitForFunction(() => document.querySelector('#sy-title').textContent === 'Đăng ký');
    assert.equal(await page.locator('#sy-mode').textContent(), 'Đăng nhập');
    assert.equal(await page.locator('#sy-send').textContent(), 'Tạo tài khoản');
    assert.equal(await page.locator('#sy-switch-note').textContent(), 'Đã có tài khoản?');
    assert.equal(await page.locator('#drawer-sync .dr-x').getAttribute('aria-label'), 'Đóng đăng ký');
    assert.ok((await page.locator('#sy-signup-note').textContent()).startsWith('Chúng tôi gửi mã 6 chữ số'));
    await page.locator('#sy-mode').click();
    await page.waitForFunction(() => document.querySelector('#sy-title').textContent === 'Đăng nhập');
    await page.evaluate(() => SDI18N.set('en'));
    await page.waitForFunction(() => document.querySelector('#sy-title').textContent === 'Sign in');
    let loginRequests = 0;
    let requests = 0;
    await page.route('https://scopedue.com/api/api.php**', async route => {
      const url = new URL(route.request().url());
      if (url.searchParams.get('r') === '/v1/health') return route.fulfill({ json: { ok: true } });
      if (url.searchParams.get('r') === '/v1/studios/login') {
        loginRequests++;
        assert.deepEqual(route.request().postDataJSON(), { email: 'robert@example.com', password: 'Correct pass 123' });
        return route.fulfill({ status: 401, json: { error: { code: 'credentials_invalid', message: 'Could not sign in with these details. Check your email and password.' } } });
      }
      requests++;
      const body = route.request().postDataJSON();
      assert.equal(body.password, 'Correct pass 123');
      assert.equal(body.password_confirm, body.password);
      return route.fulfill({ status: 202, json: { challenge: 'abc123', tries: 3 } });
    });
    await page.locator('#sy-email').fill('robert@example.com');
    await page.locator('#sy-password').fill('Correct pass 123');
    await page.locator('#sy-password').press('Enter');
    await page.waitForFunction(() => !document.querySelector('#sy-gerr').hidden);
    await page.evaluate(() => SDI18N.set('vi'));
    await page.waitForFunction(() => document.querySelector('#sy-gerr').textContent === 'Không thể đăng nhập với thông tin này. Hãy kiểm tra email và mật khẩu.');
    await page.evaluate(() => SDI18N.set('en'));
    await page.waitForFunction(() => document.querySelector('#sy-title').textContent === 'Sign in');
    assert.equal(loginRequests, 1);
    assert.equal(requests, 0);
    await page.locator('#sy-mode').click();
    assert.equal(await page.locator('#sy-name').isVisible(), true);
    assert.equal(await page.locator('#sy-confirm').isVisible(), true);
    assert.equal(await page.locator('#sy-title').textContent(), 'Sign up');
    await page.locator('#sy-name').fill('Robert');
    await page.locator('#sy-email').fill('robert@example.com');
    await page.locator('#sy-password').fill('short');
    await page.locator('#sy-confirm').fill('short');
    await page.locator('#sy-send').click();
    assert.ok(await page.locator('#f-sy-password').getAttribute('data-err') !== null);
    await page.locator('#sy-password').fill('Correct pass 123');
    await page.locator('#sy-send').click();
    assert.ok(await page.locator('#f-sy-confirm').getAttribute('data-err') !== null);
    assert.equal(requests, 0);
    await page.evaluate(() => SDI18N.set('vi'));
    await page.waitForFunction(() => document.querySelector('label[for="sy-password"]').textContent === 'Mật khẩu');
    assert.equal(await page.locator('label[for="sy-confirm"]').textContent(), 'Nhập lại mật khẩu');
    await page.waitForFunction(() => document.querySelector('#e-sy-confirm').textContent === 'Hai mật khẩu không khớp.');
    assert.equal(await page.locator('#sy-password-hint').textContent(), 'Mật khẩu phải có 8–64 ký tự.');
    assert.equal(await page.locator('#sy-password').inputValue(), 'Correct pass 123');
    assert.equal(await page.locator('#sy-name').inputValue(), 'Robert');
    assert.equal(await page.locator('#sy-email').inputValue(), 'robert@example.com');
    for (const message of ['Could not sign in with these details. Check your email and password.', 'Ask for a new code and sign in with your password.', 'This code has expired. Ask for a new one. Send a new code.', 'That code did not match. 2 tries left.']) {
      assert.notEqual(await page.evaluate(s => SDI18N.t(s), message), message);
    }
    await page.evaluate(() => SDI18N.set('en'));
    await page.waitForFunction(() => document.querySelector('#e-sy-confirm').textContent === 'Passwords do not match.');
    assert.equal(await page.locator('label[for="sy-password"]').textContent(), 'Password');
    await page.screenshot({ path: path.resolve(__dirname, '../screenshots/sign-in-password-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.resolve(__dirname, '../screenshots/sign-in-password-mobile.png') });
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.locator('#sy-confirm').fill('Correct pass 123');
    await page.locator('#sy-send').click();
    await page.locator('#sy-code').waitFor({ state: 'visible' });
    await page.evaluate(() => SDI18N.set('vi'));
    await page.waitForFunction(() => document.querySelector('#sy-title').textContent === 'Xác minh email');
    assert.equal(await page.locator('#sy-again').textContent(), 'Gửi mã mới');
    assert.equal(requests, 1);
    await page.locator('#sy-again').click();
    assert.equal(requests, 2);
    assert.equal(await page.evaluate(() => Object.values(localStorage).some(v => v.includes('Correct pass 123'))), false);
    await page.evaluate(() => profileAuthTest.openDrawer('photo'));
    assert.equal(await page.locator('#drawer-photo').getAttribute('data-open'), null);
    for (const st of ['ok', 'err']) {
      await page.evaluate(st => { Object.assign(profileAuthTest.SY, { key: 'sdk_test', st }); profileAuthTest.showView('profile'); }, st);
      assert.equal(await page.locator('#pf-name').isVisible(), true);
      assert.equal(await page.locator('#sy-password').inputValue(), '');
    }
    await page.evaluate(() => { profileAuthTest.SY.st = 'auth'; profileAuthTest.syPaint(); profileAuthTest.showView('profile'); });
    assert.equal(await page.locator('#pf-name').isVisible(), false);
    assert.equal(await page.locator('#drawer-sync').getAttribute('data-open'), '');
    assert.equal(await page.locator('#sy-email').isVisible(), false);
    await page.evaluate(() => { profileAuthTest.SY.st = 'ok'; profileAuthTest.showView('profile'); profileAuthTest.syDisconnect(); });
    assert.equal(await page.locator('#pf-name').isVisible(), false);
    assert.deepEqual(errors, []);
    console.log('PASS: Profile access; password length/match, request/resend payloads, no password storage and clearing on close');
  } finally { await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; server.close(); });
