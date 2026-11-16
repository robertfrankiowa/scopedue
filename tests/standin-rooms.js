// A stand-in for api.php's team rooms (CONTRACT.md 22.8), in memory, for tests that need team sync without MySQL. It answers
// https://scopedue.com/api/api.php?r=/v1/... as api.php 1.3.0 does for these routes, with its checks: who may write (Viewers may
// not), who may change a room (its owner), each write on the latest version and generation, a key only for a device in the room.
// Accounts are the bearer keys given: { 'sdk_x': 'person@example' }. Any other route answers 503, like a server that is away.
module.exports = function (accounts) {
  const dev = {}, rooms = {}, log = [];
  const J = (route, status, body) => route.fulfill({ status, body: JSON.stringify(body), headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } });
  const fail = (status, code, message) => { const e = new Error(message); e.status = status; e.code = code; throw e; };
  const devsOf = email => Object.keys(dev).filter(k => dev[k].email === email).map(k => ({ kid: k, pub: dev[k].pub }));
  const me = (r, email) => { const m = r.members.find(x => x.email === email); if (!m) fail(404, 'not_found', 'Unknown room'); m.joined = true; return m; };
  const owner = (r, email) => { if (r.owner !== email) fail(403, 'forbidden', 'Only the owner can change who is in this project'); };
  const get = id => { const r = rooms[id]; if (!r) fail(404, 'not_found', 'Unknown room'); return r; };
  const out = (r, email) => {
    const m = me(r, email), o = { id: r.id, role: m.role, gen: r.gen, ver: r.ver, updated_at: r.upd, owner: { email: r.owner },
      members: r.members.map(x => ({ email: x.email, name: x.name, role: x.role, joined: !!x.joined, devs: devsOf(x.email) })),
      keys: r.keys.filter(k => dev[k.kid] && dev[k.kid].email === email).map(k => ({ gen: k.gen, kid: k.kid, wrapped: k.wrapped })), rescue: [] };
    if (r.owner === email) { o.need = []; o.members.forEach(x => x.devs.forEach(d => { if (!r.keys.some(k => k.gen === r.gen && k.kid === d.kid)) o.need.push({ email: x.email, kid: d.kid, pub: d.pub }); })); }
    return o;
  };
  const push = (r, email, role, base, blob) => {
    if (r.ver !== base) fail(409, 'stale', 'Someone saved first. Get the latest and try again.');
    if (blob.g !== r.gen) fail(409, 'stale_key', 'The project key changed. Get the latest and try again.');
    if (blob.o && role !== 'Owner') fail(422, 'invalid', 'Unknown field: o');   // api.php 1.5.1: only the Owner's versions carry o (CONTRACT 29.20)
    r.ver++; r.upd = Date.now(); r.versions.push({ ver: r.ver, blob, by: email, role, ts: r.upd }); r.versions = r.versions.slice(-60);
    return r.ver;
  };
  const handle = (method, path, b, email) => {
    let m;
    if (method === 'PUT' && path === '/v1/devkey') { if (dev[b.kid] && dev[b.kid].email !== email) fail(409, 'conflict', 'That key id is taken'); if (!dev[b.kid]) dev[b.kid] = { email, pub: { kty: 'EC', crv: 'P-256', x: b.pub.x, y: b.pub.y } }; return [200, { kid: b.kid }]; }
    if (method === 'GET' && path === '/v1/health') return [200, { ok: true, limits: { body: 2000000, team: true } }];
    if (method === 'GET' && path === '/v1/rooms') return [200, { me: email, rooms: Object.values(rooms).filter(r => r.members.some(x => x.email === email)).map(r => out(r, email)) }];
    if (method === 'POST' && path === '/v1/rooms') {
      if (rooms[b.id]) fail(409, 'conflict', 'That room exists');
      const r = rooms[b.id] = { id: b.id, owner: email, gen: 1, ver: 0, upd: Date.now(), members: [{ email, name: b.name || '', role: 'Owner', joined: true }], keys: [], versions: [] };
      (b.members || []).forEach(x => { const e = String(x.email).toLowerCase(); if (e !== email) r.members.push({ email: e, name: x.name || '', role: x.role === 'Viewer' ? 'Viewer' : 'Editor', joined: false }); });
      Object.keys(b.wrapped || {}).forEach(k => { if (!dev[k] || dev[k].email !== email) fail(422, 'invalid', 'A wrapped key is for a device that is not yours'); r.keys.push({ gen: 1, kid: k, wrapped: b.wrapped[k] }); });
      return [201, { room: out(r, email) }];
    }
    if ((m = path.match(/^\/v1\/rooms\/([\w-]{16,43})$/))) {
      const r = get(m[1]), mm = me(r, email);
      if (method === 'GET') return [200, { room: out(r, email), versions: r.versions.map(v => ({ ver: v.ver, blob: mm.role === 'Owner' || !v.blob.o ? v.blob : Object.assign({}, v.blob, { o: undefined }), ts: v.ts, by: v.by, role: v.role })) }];
      if (method === 'PUT') { if (mm.role === 'Viewer') fail(403, 'forbidden', 'Viewers can read this project, not change it'); return [200, { ver: push(r, email, mm.role, b.base, b.blob) }]; }
      if (method === 'DELETE') { owner(r, email); delete rooms[r.id]; log.push({ deleted: r.id, by: email }); return [200, { deleted: true }]; }
    }
    if ((m = path.match(/^\/v1\/rooms\/([\w-]{16,43})\/(members|keys|rotate|nudge)$/)) && method === 'POST') {
      const r = get(m[1]); me(r, email);
      if (m[2] === 'nudge') return [200, { sent: false }];
      owner(r, email);
      if (m[2] === 'members') { const e = String(b.email).toLowerCase(), x = r.members.find(y => y.email === e); if (x) x.role = b.role; else r.members.push({ email: e, name: b.name || '', role: b.role === 'Viewer' ? 'Viewer' : 'Editor', joined: false }); return [200, { room: out(r, email) }]; }
      if (m[2] === 'keys') {
        if (b.gen !== r.gen) fail(409, 'stale_key', 'The project key changed');
        Object.keys(b.wrapped || {}).forEach(k => { if (!dev[k] || !r.members.some(x => x.email === dev[k].email)) fail(422, 'invalid', 'A wrapped key is for a device outside this project'); r.keys = r.keys.filter(y => !(y.gen === r.gen && y.kid === k)); r.keys.push({ gen: r.gen, kid: k, wrapped: b.wrapped[k] }); });
        return [200, { stored: Object.keys(b.wrapped || {}).length }];
      }
      if (m[2] === 'rotate') {
        if (b.gen !== r.gen + 1) fail(409, 'stale_key', 'The project key changed');
        r.members = r.members.filter(x => x.role === 'Owner' || !(b.remove || []).includes(x.email));
        r.gen = b.gen; Object.keys(b.wrapped || {}).forEach(k => r.keys.push({ gen: r.gen, kid: k, wrapped: b.wrapped[k] }));
        const v = push(r, email, 'Owner', b.base, b.blob); r.versions = r.versions.filter(x => x.ver >= v); r.keys = r.keys.filter(k => k.gen >= r.gen);
        return [200, { ver: v, gen: r.gen }];
      }
    }
    fail(503, 'away', 'Not here');
  };
  const route = async rt => {
    const req = rt.request(), u = new URL(req.url()), path = u.searchParams.get('r') || '';
    if (req.method() === 'OPTIONS') return rt.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } });
    if (!/^\/v1\/(rooms|devkey|health)/.test(path)) return J(rt, 503, {});
    const auth = (req.headers()['authorization'] || '').replace(/^Bearer /, ''), email = accounts[auth];
    if (!email) return J(rt, 401, { error: { code: 'auth', message: 'Sign in again' } });
    let b = {}; try { b = req.postData() ? JSON.parse(req.postData()) : {}; } catch (e) {}
    try { const [st, body] = handle(req.method(), path, b, email); return J(rt, st, body); }
    catch (e) { return J(rt, e.status || 500, { error: { code: e.code || 'error', message: e.message } }); }
  };
  return { route, rooms, dev, log, handle };
};
