'use strict';
/* Проверки без базы данных: то, что можно проверить локально.
   Запуск: node test/run.js */

process.env.SESSION_SECRET = 'test-secret-that-is-long-enough-0123';
process.env.DATABASE_URL = 'postgres://x:y@localhost/z';
process.env.DEMO_MODE = '1';

const assert = require('assert');
const http = require('http');
const path = require('path');
let passed = 0, failed = 0;

function t(name, fn) {
  return Promise.resolve().then(fn).then(() => { passed++; console.log('ok  ', name); },
    (e) => { failed++; console.log('FAIL', name, '—', e.message); });
}

const auth = require('../lib/auth');
const httpLib = require('../lib/http');

(async () => {

  // ---------- контакты ----------
  await t('почта нормализуется', () => {
    assert.deepStrictEqual(auth.normalizeContact(' Ivan@Mail.RU '), { kind: 'email', value: 'ivan@mail.ru' });
  });
  await t('телефон в трёх форматах даёт одно значение', () => {
    for (const p of ['+7 999 000-11-22', '89990001122', '9990001122'])
      assert.strictEqual(auth.normalizeContact(p).value, '+79990001122');
  });
  await t('мусор отклоняется', () => {
    assert.strictEqual(auth.normalizeContact('abc'), null);
    assert.strictEqual(auth.normalizeContact('ivan@'), null);
    assert.strictEqual(auth.normalizeContact('12345'), null);
  });

  // ---------- сессии ----------
  const { sign, verify, newPin } = auth._internal;
  await t('подпись сессии проверяется', () => {
    const tok = sign({ uid: 7, role: 'admin', exp: Date.now() + 10000 });
    const p = verify(tok);
    assert.strictEqual(p.uid, 7); assert.strictEqual(p.role, 'admin');
  });
  await t('подделка роли не проходит', () => {
    const tok = sign({ uid: 7, role: 'resident', exp: Date.now() + 10000 });
    const body = Buffer.from(JSON.stringify({ uid: 7, role: 'admin', exp: Date.now() + 10000 })).toString('base64url');
    const forged = body + '.' + tok.split('.')[1];
    assert.strictEqual(verify(forged), null);
  });
  await t('просроченная сессия отклоняется', () => {
    assert.strictEqual(verify(sign({ uid: 1, role: 'admin', exp: Date.now() - 1 })), null);
  });
  await t('мусор вместо токена', () => {
    assert.strictEqual(verify('abc'), null); assert.strictEqual(verify(''), null); assert.strictEqual(verify(null), null);
  });
  await t('пинкод — четыре цифры', () => {
    for (let i = 0; i < 200; i++) assert.match(newPin(), /^\d{4}$/);
  });
  await t('cookie HttpOnly и SameSite', () => {
    const c = auth.sessionCookie({ id: 1, role: 'admin' });
    assert.ok(c.includes('HttpOnly') && c.includes('SameSite=Lax'));
  });
  await t('роли ранжируются', () => {
    assert.ok(auth.atLeast({ role: 'admin' }, 'moderator'));
    assert.ok(auth.atLeast({ role: 'moderator' }, 'staff'));
    assert.ok(!auth.atLeast({ role: 'staff' }, 'moderator'));
    assert.ok(!auth.atLeast({ role: 'resident' }, 'staff'));
    assert.ok(!auth.atLeast(null, 'resident'));
  });

  // ---------- маршрутизатор ----------
  await t('маршрут с параметром', async () => {
    const r = httpLib.createRouter();
    let got = null;
    r.route('PATCH', '/api/bookings/:id', (req) => { got = req.params.id; return true; });
    const ok = await r.dispatch({ method: 'PATCH', url: '/api/bookings/42?x=1', headers: {} }, {});
    assert.strictEqual(got, '42'); assert.notStrictEqual(ok, false);
  });
  await t('неизвестный маршрут возвращает false', async () => {
    const r = httpLib.createRouter();
    r.route('GET', '/api/a', () => true);
    assert.strictEqual(await r.dispatch({ method: 'GET', url: '/api/b', headers: {} }, {}), false);
  });
  await t('метод учитывается', async () => {
    const r = httpLib.createRouter();
    r.route('GET', '/api/a', () => true);
    assert.strictEqual(await r.dispatch({ method: 'POST', url: '/api/a', headers: {} }, {}), false);
  });
  await t('строка запроса разбирается', async () => {
    const r = httpLib.createRouter();
    let q = null;
    r.route('GET', '/api/shahmatka', (req) => { q = req.query; return true; });
    await r.dispatch({ method: 'GET', url: '/api/shahmatka?res=forma', headers: {} }, {});
    assert.strictEqual(q.res, 'forma');
  });

  // ---------- статика ----------
  const web = path.resolve(__dirname, '..', '..', 'web');
  // Заглушка ответа — настоящий поток записи, чтобы pipe() из статики работал
  const { Writable } = require('stream');
  function fakeRes() {
    const r = new Writable({ write(c, e, cb) { r.body += c; cb(); } });
    r.headers = null; r.status = 0; r.body = '';
    r.writeHead = (s, h) => { r.status = s; r.headers = h; };
    return r;
  }
  await t('index.html отдаётся по /', () => {
    const res = fakeRes();
    const ok = httpLib.serveStatic(web, { path: '/' }, res);
    assert.ok(ok); assert.strictEqual(res.status, 200);
    assert.ok(res.headers['Content-Type'].startsWith('text/html'));
  });
  await t('выход за пределы папки запрещён', () => {
    const res = fakeRes();
    httpLib.serveStatic(web, { path: '/../server/.env.example' }, res);
    assert.ok(res.status === 403 || res.status === 0);
  });
  await t('несуществующий файл — false', () => {
    assert.strictEqual(httpLib.serveStatic(web, { path: '/nope.html' }, fakeRes()), false);
  });
  await t('css с нужным типом', () => {
    const res = fakeRes();
    httpLib.serveStatic(web, { path: '/tokens.css' }, res);
    assert.ok(res.headers['Content-Type'].startsWith('text/css'));
  });

  // ---------- сервер целиком: 404 для API, статика для страниц ----------
  const app = require('../index');
  await new Promise((r) => app.server.listen(0, r));
  const port = app.server.address().port;
  const get = (p) => new Promise((resolve) => http.get({ port, path: p }, (res) => {
    let b = ''; res.on('data', (c) => b += c); res.on('end', () => resolve({ status: res.statusCode, body: b, headers: res.headers }));
  }));

  await t('GET /api/нет → 404 JSON', async () => {
    const r = await get('/api/nothing');
    assert.strictEqual(r.status, 404); assert.ok(JSON.parse(r.body).error);
  });
  await t('GET /api/auth/me без cookie → 401', async () => {
    assert.strictEqual((await get('/api/auth/me')).status, 401);
  });
  await t('GET /api/shahmatka без входа → 401', async () => {
    assert.strictEqual((await get('/api/shahmatka?res=forma')).status, 401);
  });
  await t('GET / отдаёт сайт', async () => {
    const r = await get('/');
    assert.strictEqual(r.status, 200); assert.ok(r.body.includes('<!doctype html>'));
  });
  await t('GET /login.html отдаётся', async () => {
    assert.strictEqual((await get('/login.html')).status, 200);
  });
  await t('GET /api/health без базы → 503, но не падает', async () => {
    const r = await get('/api/health');
    assert.ok(r.status === 503 || r.status === 200);
  });

  app.server.close();
  console.log(`\n${passed} прошло, ${failed} провалено`);
  process.exit(failed ? 1 : 0);
})();
