// api.php 1.27.0 (CONTRACT 95): ScopeDue's paid plan through Stripe. A real api.php on a fresh database (as t_api70) and a stand-in
// for Stripe's API on a local port: it answers prices, customers, Checkout and portal sessions and subscriptions, and records what it
// was asked. Webhooks are signed here the way Stripe signs them. SD_PHP, SD_PHP_EXT, SD_MYSQL_BIN.
const path = require('path'), http = require('http'), crypto = require('crypto');
const ROOT = path.resolve(process.env.SD_ROOT || path.join(__dirname, '..'));
const WHSEC = 'whsec_test_127', SK = 'sk_test_127', DAY = 86400000;
let fails = 0, n = 0, srv = null, fake = null;
const ok = (c, m, x) => { n++; console.log((c ? 'PASS ' : 'FAIL ') + m + (c || x === undefined ? '' : ' :: ' + JSON.stringify(x).slice(0, 400))); if (!c) fails++; };

/* the stand-in for api.stripe.com */
const S = { prices: {}, subs: {}, asked: [], cus: 0 };
function startFake(port) {
  return new Promise(res => {
    const h = http.createServer((q, r) => {
      let b = ''; q.on('data', d => { b += d; }); q.on('end', () => {
        const u = new URL(q.url, 'http://x'), form = Object.fromEntries(new URLSearchParams(b));
        S.asked.push({ m: q.method, p: u.pathname, form, auth: q.headers.authorization, ver: q.headers['stripe-version'] });
        const send = (s, j) => { r.writeHead(s, { 'Content-Type': 'application/json' }); r.end(JSON.stringify(j)); };
        let m;
        if (q.method === 'GET' && (m = u.pathname.match(/^\/v1\/prices\/(\w+)$/))) return S.prices[m[1]] ? send(200, S.prices[m[1]]) : send(404, { error: { message: 'No such price' } });
        if (q.method === 'POST' && u.pathname === '/v1/customers') return send(200, { id: 'cus_T' + (++S.cus), email: form.email });
        if (q.method === 'POST' && u.pathname === '/v1/checkout/sessions') return send(200, { id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/cs_test_1' });
        if (q.method === 'POST' && u.pathname === '/v1/billing_portal/sessions') return send(200, { id: 'bps_1', url: 'https://billing.stripe.com/p/session/test_1' });
        if (q.method === 'GET' && (m = u.pathname.match(/^\/v1\/subscriptions\/(\w+)$/))) return S.subs[m[1]] ? send(200, S.subs[m[1]]) : send(404, { error: { message: 'No such subscription' } });
        send(404, { error: { message: 'Unknown' } });
      });
    });
    h.listen(port, '127.0.0.1', () => res(h));
  });
}
const price = (id, cents, interval) => ({ id, object: 'price', active: true, currency: 'usd', unit_amount: cents, type: 'recurring', recurring: { interval: interval || 'month', interval_count: 1, usage_type: 'licensed' } });
const sub = (id, cus, status, end, more) => Object.assign({ id, object: 'subscription', customer: cus, status, current_period_end: Math.floor(end / 1000), cancel_at_period_end: false, cancel_at: null, items: { data: [{ price: { id: 'price_m290' } }] } }, more || {});
function sign(raw, t) { t = t || Math.floor(Date.now() / 1000); return 't=' + t + ',v1=' + crypto.createHmac('sha256', WHSEC).update(t + '.' + raw).digest('hex'); }
async function hook(type, object, o) {
  o = o || {};
  const raw = JSON.stringify({ id: 'evt_' + Math.random().toString(36).slice(2), object: 'event', type, data: { object } });
  const r = await fetch(srv.api + '?r=/v1/billing/stripe', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Stripe-Signature': o.sig || sign(o.body || raw, o.t) }, body: raw });
  let j = null; try { j = await r.json(); } catch (e) {}
  return { s: r.status, j };
}
async function plan(key, at) {
  const r = await fetch(srv.api + '?r=/v1/billing', { headers: Object.assign({ Authorization: 'Bearer ' + key }, at ? { 'X-Test-Now': String(at) } : {}) });
  return (await r.json()).plan;
}
async function boot(port, db, env, keep) {
  ['SCOPEDUE_STRIPE_SECRET', 'SCOPEDUE_STRIPE_WEBHOOK_SECRET', 'SCOPEDUE_STRIPE_PRICE', 'SCOPEDUE_STRIPE_API'].forEach(k => { delete process.env[k]; });
  Object.assign(process.env, env || {});
  if (srv) srv.stop();
  srv = await require('./php-server')({ root: ROOT, files: ['api.php'], port, db, keep });
  return srv;
}

(async () => {
  fake = await startFake(8199);
  const STRIPE = { SCOPEDUE_STRIPE_SECRET: SK, SCOPEDUE_STRIPE_WEBHOOK_SECRET: WHSEC, SCOPEDUE_STRIPE_API: 'http://127.0.0.1:8199' };
  S.prices.price_m290 = price('price_m290', 290); S.prices.price_old = price('price_old', 1500); S.prices.price_y = price('price_y', 290, 'year');

  /* 1 · nothing set: no plan is sold, and a webhook is refused */
  await boot(8127, 'sd_api127');
  ok((await srv.call(null, 'GET', '/v1/health')).j.version === '1.32.1', 'health: version 1.32.1');
  let a = await srv.account('Robert', 'robert@example.com');
  let p = await plan(a);
  ok(p && p.name === 'free' && p.buy === false && p.manage === false && p.price.usd === 2.9, 'without Stripe set up: Free, nothing to buy', p);
  let r = await srv.call(a, 'POST', '/v1/billing/checkout', {});
  ok(r.s === 503 && r.j.error.code === 'billing_off', 'Upgrade says paid plans are not available', r);
  ok((await hook('checkout.session.completed', {})).s === 400, 'a webhook is refused while no secret is set');

  /* 2 · a price that is not USD 2.90 a month is never sold */
  for (const [id, what] of [['price_old', 'USD 15'], ['price_y', 'yearly']]) {
    await boot(8127, 'sd_api127', Object.assign({ SCOPEDUE_STRIPE_PRICE: id }, STRIPE));
    a = await srv.account('Robert', 'robert@example.com'); S.asked = [];
    r = await srv.call(a, 'POST', '/v1/billing/checkout', {});
    ok(r.s === 503 && r.j.error.code === 'billing_off' && !S.asked.some(x => x.p === '/v1/checkout/sessions'), 'a ' + what + ' price is refused before any checkout', [r, S.asked.map(x => x.p)]);
  }

  /* 3 · the plan, bought and changed */
  await boot(8127, 'sd_api127', Object.assign({ SCOPEDUE_STRIPE_PRICE: 'price_m290' }, STRIPE));
  a = await srv.account('Robert', 'robert@example.com');
  const b = await srv.account('Lan', 'lan@example.com');
  const uid = srv.my(['-N', '-e', "SELECT id FROM users WHERE email = 'robert@example.com'", srv.db]).toString().trim();
  p = await plan(a);
  ok(p.name === 'free' && p.buy === true && p.manage === false, 'set up: Free, with Upgrade', p);
  r = await srv.call(a, 'POST', '/v1/billing/portal', {});
  ok(r.s === 409 && r.j.error.code === 'no_customer', 'Manage billing before any purchase: nothing to manage', r);

  S.asked = [];
  r = await srv.call(a, 'POST', '/v1/billing/checkout', {});
  ok(r.s === 201 && r.j.url === 'https://checkout.stripe.com/c/pay/cs_test_1', 'Upgrade answers the Checkout page', r);
  const cu = S.asked.find(x => x.p === '/v1/customers'), cs = S.asked.find(x => x.p === '/v1/checkout/sessions');
  ok(cu && cu.form.email === 'robert@example.com' && cu.form['metadata[sd_user]'] === uid && cu.auth === 'Bearer ' + SK && cu.ver === '2024-06-20', 'a Stripe customer is made for the account, with its id', cu);
  ok(cs && cs.form.mode === 'subscription' && cs.form.customer === 'cus_T1' && cs.form['line_items[0][price]'] === 'price_m290' && cs.form['line_items[0][quantity]'] === '1' &&
    cs.form.client_reference_id === uid && /paid\.html#paid$/.test(cs.form.success_url) && /paid\.html#cancel$/.test(cs.form.cancel_url) && !('automatic_tax[enabled]' in cs.form),
    'the Checkout session: the plan\'s price, once, for that customer, back to paid.html', cs && cs.form);
  ok(S.asked.filter(x => x.p === '/v1/prices/price_m290').length === 1, 'the price was checked with Stripe');
  ok(cs && !('allow_promotion_codes' in cs.form), '1.31.4 (136): the Checkout page has no promotion code box', cs && cs.form);
  p = await plan(a);
  ok(p.name === 'free' && p.manage === true, 'before Stripe says it is paid, the plan stays Free', p);
  S.asked = [];
  r = await srv.call(a, 'POST', '/v1/billing/checkout', {});
  ok(r.s === 201 && !S.asked.some(x => x.p === '/v1/customers') && S.asked.find(x => x.p === '/v1/checkout/sessions').form.customer === 'cus_T1' && !S.asked.some(x => x.p.startsWith('/v1/prices')),
    'a second Upgrade keeps the same customer, and the price check is kept an hour', S.asked.map(x => x.p));

  /* the webhook: only Stripe's signature opens it */
  S.subs.sub_A = sub('sub_A', 'cus_T1', 'active', Date.now() + 30 * DAY);
  ok((await hook('checkout.session.completed', { mode: 'subscription', subscription: 'sub_A', customer: 'cus_T1' }, { sig: 't=' + Math.floor(Date.now() / 1000) + ',v1=00' })).s === 400, 'a wrong signature is refused');
  ok((await hook('checkout.session.completed', { mode: 'subscription', subscription: 'sub_A', customer: 'cus_T1' }, { t: Math.floor(Date.now() / 1000) - 600 })).s === 400, 'a signature older than 5 minutes is refused');
  ok((await hook('checkout.session.completed', { mode: 'subscription', subscription: 'sub_A', customer: 'cus_T1' }, { body: '{"forged":1}' })).s === 400, 'a signature for other bytes is refused');
  ok((await plan(a)).name === 'free', 'none of them changed the plan');
  /* 1.31.4 (136): the account sells other products' plans too: a subscription to another price is not ScopeDue's plan */
  S.subs.sub_O = sub('sub_O', 'cus_T1', 'active', Date.now() + 30 * DAY, { items: { data: [{ price: { id: 'price_other' } }] } });
  ok((await hook('customer.subscription.created', { id: 'sub_O' })).s === 200 && (await plan(a)).name === 'free', '1.31.4 (136): a subscription to another product\'s price leaves the plan Free');
  const n0 = (await srv.call(a, 'GET', '/v1/pulse')).j.n;
  r = await hook('checkout.session.completed', { mode: 'subscription', subscription: 'sub_A', customer: 'cus_T1', client_reference_id: uid });
  ok(r.s === 200, 'Stripe\'s checkout.session.completed is taken', r);
  p = await plan(a);
  ok(p.name === 'paid' && p.until === Math.floor(S.subs.sub_A.current_period_end) * 1000 && p.ends === false && p.late === false && p.buy === false && p.manage === true, 'the plan is Paid until the end of the period Stripe said', p);
  ok((await srv.call(a, 'GET', '/v1/pulse')).j.n > n0, 'the account\'s pulse moved, so the app asks again');
  ok((await plan(b)).name === 'free', 'another account is still Free');
  r = await srv.call(a, 'POST', '/v1/billing/checkout', {});
  ok(r.s === 409 && r.j.error.code === 'already', 'Upgrade on a paid plan is refused', r);
  r = await srv.call(a, 'POST', '/v1/billing/portal', {});
  ok(r.s === 201 && r.j.url.startsWith('https://billing.stripe.com/') && /paid\.html#back$/.test(S.asked.find(x => x.p === '/v1/billing_portal/sessions').form.return_url), 'Manage billing answers Stripe\'s portal, back to paid.html', r);

  /* what an event says is not believed: the subscription is read back from Stripe */
  ok((await hook('customer.subscription.updated', { id: 'sub_A', customer: 'cus_T1', status: 'canceled' })).s === 200 && (await plan(a)).name === 'paid', 'an event saying canceled, while Stripe says active, leaves it Paid');
  S.subs.sub_A.cancel_at_period_end = true;
  await hook('customer.subscription.updated', { id: 'sub_A' });
  p = await plan(a); ok(p.name === 'paid' && p.ends === true, 'cancelled in the portal: still Paid, and says it ends', p);
  S.subs.sub_A.cancel_at_period_end = false; S.subs.sub_A.status = 'past_due';
  await hook('invoice.payment_failed', { subscription: 'sub_A', customer: 'cus_T1' });
  p = await plan(a); ok(p.name === 'paid' && p.late === true, 'a failed payment: still Paid while Stripe tries, and says so', p);
  S.subs.sub_A.status = 'active';
  await hook('invoice.paid', { parent: { subscription_details: { subscription: 'sub_A' } }, customer: 'cus_T1' });
  p = await plan(a); ok(p.name === 'paid' && p.late === false, 'invoice.paid in the newer shape (parent.subscription_details) is read too', p);
  S.subs.sub_B = sub('sub_B', 'cus_T1', 'incomplete_expired', Date.now() + 30 * DAY);
  await hook('customer.subscription.updated', { id: 'sub_B' });
  ok((await plan(a)).name === 'paid', 'a second subscription that is not paid does not hide the paid one');
  S.subs.sub_X = sub('sub_X', 'cus_nobody', 'active', Date.now() + 30 * DAY);
  ok((await hook('customer.subscription.created', { id: 'sub_X' })).s === 200 && (await plan(b)).name === 'free', 'a subscription of a customer no account has changes nothing');
  ok((await hook('payment_intent.succeeded', { id: 'pi_1' })).s === 200, 'an event it does not need is answered and left');

  /* a webhook that never comes cannot keep the plan paid: 3 days past the period's end it is Free */
  p = await plan(a, Date.now() + 32 * DAY); ok(p.name === 'paid', '2 days past the period end: still Paid (Stripe may be late)', p);
  p = await plan(a, Date.now() + 34 * DAY); ok(p.name === 'free' && p.buy === true, '4 days past it with no word from Stripe: Free', p);

  /* the end */
  S.subs.sub_A.status = 'canceled';
  await hook('customer.subscription.deleted', { id: 'sub_A', customer: 'cus_T1' });
  p = await plan(a); ok(p.name === 'free' && p.buy === true && p.manage === true, 'the subscription ended: Free, Upgrade again, and the billing history stays', p);

  /* 4 · 1.31.1 (CONTRACT 133): Stripe's test and live modes never mix. The same database, the server started again */
  const sql = q => srv.my(['-N', '-e', q, srv.db]).toString().trim();
  S.subs.sub_A.status = 'active'; S.subs.sub_A.current_period_end = Math.floor((Date.now() + 30 * DAY) / 1000);
  await hook('customer.subscription.updated', { id: 'sub_A' });
  ok((await plan(a)).name === 'paid' && sql('SELECT mode FROM api_billing WHERE user_id = ' + uid) === 'test' && sql("SELECT v FROM api_kv WHERE k = 'stripe_mode'") === 'test', 'test mode: Paid again, the row and the server say test');
  await boot(8127, 'sd_api127', {}, true);
  ok((await plan(a)).name === 'paid', 'paid plans turned off (no key): the server stays in the mode it was last in, so a paid plan stays paid');
  srv.my(['-e', "UPDATE api_billing SET mode = NULL; DELETE FROM api_kv WHERE k = 'stripe_mode'", srv.db]);
  p = await plan(a);
  ok(p.name === 'free' && p.manage === false, 'a row from before 1.31.1 (test) on a server that never said its mode and has no key now: Free (scopedue.com on 14 Nov)', p);
  await boot(8127, 'sd_api127', Object.assign({ SCOPEDUE_STRIPE_PRICE: 'price_m290' }, STRIPE, { SCOPEDUE_STRIPE_SECRET: 'sk_live_127' }), true);
  p = await plan(a);
  ok(p.name === 'free' && p.buy === true && p.manage === false && sql("SELECT v FROM api_kv WHERE k = 'stripe_mode'") === 'live', 'live keys in: the test checkout is no paid plan, Upgrade is offered, no billing to manage', p);
  r = await srv.call(a, 'POST', '/v1/billing/portal', {});
  ok(r.s === 409 && r.j.error.code === 'no_customer', 'Manage billing does not open the test customer in live mode', r);
  ok((await hook('customer.subscription.updated', { id: 'sub_A' })).s === 200 && (await plan(a)).name === 'free', 'a webhook about the test subscription changes nothing in live mode');
  S.asked = []; const cus0 = S.cus;
  r = await srv.call(a, 'POST', '/v1/billing/checkout', {});
  const made = S.asked.find(x => x.p === '/v1/customers'), co = S.asked.find(x => x.p === '/v1/checkout/sessions');
  ok(r.s === 201 && made && co && co.form.customer === 'cus_T' + (cus0 + 1) && co.auth === 'Bearer sk_live_127', 'Upgrade in live mode makes a new customer, not the test one', [r, S.asked.map(x => x.p)]);
  ok(sql('SELECT CONCAT_WS("|", customer, IFNULL(sub, "-"), status, mode) FROM api_billing WHERE user_id = ' + uid) === 'cus_T' + (cus0 + 1) + '|-||live', 'the row starts again in live mode: the new customer, no subscription, no status');
  S.subs.sub_L = sub('sub_L', 'cus_T' + (cus0 + 1), 'active', Date.now() + 30 * DAY);
  await hook('checkout.session.completed', { mode: 'subscription', subscription: 'sub_L' });
  p = await plan(a); ok(p.name === 'paid' && p.manage === true, 'paid in live mode: Paid, and Manage billing opens', p);
  await boot(8127, 'sd_api127', Object.assign({ SCOPEDUE_STRIPE_PRICE: 'price_m290' }, STRIPE), true);
  ok((await plan(a)).name === 'free', 'back on test keys: the live plan is not counted there either');
})().catch(e => { console.error(e); fails++; }).finally(() => {
  if (srv) srv.stop(); if (fake) fake.close();
  console.log('\n' + (n - fails) + '/' + n + ' passed'); process.exit(fails ? 1 : 0);
});
