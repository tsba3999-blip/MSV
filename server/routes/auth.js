'use strict';

/* ============================================================
   /api/auth — вход и выход

   POST /api/auth/request-pin  { contact }        → { ok }
   POST /api/auth/verify-pin   { contact, pin }   → { role, name } + cookie
   POST /api/auth/logout                           → { ok }
   GET  /api/auth/me                               → { role, name } | 401
   ============================================================ */

const auth = require('../lib/auth');
const { json, fail, readJson, clientIp } = require('../lib/http');
const { query } = require('../lib/db');

/* Запись входа: одна строка на попытку. Браузер обрезаем — нам нужен
   только вид устройства, а не полная подпись. */
async function logLogin(req, userId, ok) {
  try {
    await query(`INSERT INTO login_log (user_id, ok, ip, agent) VALUES ($1, $2, $3, $4)`,
      [userId, ok, clientIp(req), String(req.headers['user-agent'] || '').slice(0, 200)]);
  } catch (e) { /* журнал не должен мешать входу */ }
}

module.exports = function register(route) {

  route('POST', '/api/auth/request-pin', async (req, res) => {
    const body = await readJson(req);
    const r = await auth.requestPin(body.contact);
    if (!r.ok) return fail(res, 400, r.error);
    // sent не отдаём: по нему можно было бы перебирать, кто зарегистрирован
    json(res, 200, { ok: true });
  });

  route('POST', '/api/auth/verify-pin', async (req, res) => {
    const body = await readJson(req);
    const r = await auth.verifyPin(body.contact, body.pin);
    if (!r.ok) return fail(res, 401, r.error);

    /* Роль приходит из учётной записи. Кнопка на первой странице
       ничего не решает — здесь и закрывается вопрос, который мы
       обсуждали: три кнопки — указатель, а не разграничение. */
    // firstLogin — сайт отправит на анкету, а не в кабинет
    await logLogin(req, r.user.id, true);
    json(res, 200, { role: r.user.role, name: r.user.name, firstLogin: !!r.firstLogin },
         { 'Set-Cookie': auth.sessionCookie(r.user) });
  });

  /* ВРЕМЕННО: открытый вход по роли, только пока DEMO_MODE=1.
     Кнопка на первой странице → сразу кабинет. Убрать вместе с DEMO_MODE. */
  route('POST', '/api/auth/demo-login', async (req, res) => {
    const body = await readJson(req);
    const r = await auth.demoLogin(body.role);
    if (!r.ok) return fail(res, 403, r.error);
    await logLogin(req, r.user.id, true);
    json(res, 200, { role: r.user.role, name: r.user.name, firstLogin: false },
         { 'Set-Cookie': auth.sessionCookie(r.user) });
  });

  /* История входов: последние 50 записей вошедшего. */
  route('GET', '/api/me/logins', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');
    const r = await query(`SELECT ok, ip, agent, created_at FROM login_log
      WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`, [s.uid]);
    json(res, 200, r.rows.map((x) => ({ at: x.created_at, ok: x.ok, ip: x.ip || '', agent: x.agent || '' })));
  });

  /* Смена пина в кабинете. Нужен текущий вход. */
  route('POST', '/api/auth/set-pin', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');
    const body = await readJson(req);
    const r = await auth.setPin(s.uid, body.pin, body.current);
    if (!r.ok) return fail(res, 400, r.error);
    json(res, 200, { ok: true });
  });

  /* Приглашение резидента: модератор или администратор. */
  route('POST', '/api/auth/invite', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');
    if (!auth.atLeast(s, 'moderator')) return fail(res, 403, 'Приглашать может модератор или администратор');
    const body = await readJson(req);
    const r = await auth.invite(s.uid, body.contact, body.name, body.pin);
    if (!r.ok) return fail(res, 400, r.error);
    json(res, 201, { ok: true, id: String(r.id) });
  });

  route('POST', '/api/auth/logout', async (req, res) => {
    json(res, 200, { ok: true }, { 'Set-Cookie': auth.clearCookie() });
  });

  route('GET', '/api/auth/me', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');
    const r = await query(`SELECT u.id, u.role, u.name, u.is_active, p.place, p.can_edit_shahmatka
                           FROM users u LEFT JOIN staff_profiles p ON p.user_id = u.id WHERE u.id = $1`, [s.uid]);
    const u = r.rows[0];
    if (!u || !u.is_active) return fail(res, 401, 'Учётная запись отключена');
    // сотруднику — его резиденции и право редактировать шахматку
    const residences = u.place === 'all' || u.role === 'admin' || u.role === 'moderator' ? ['forma', 'uyut', 'molod'] : (u.place ? [u.place] : []);
    json(res, 200, { id: u.id, role: u.role, name: u.name, residences, canEditShahmatka: u.role !== 'staff' || !!u.can_edit_shahmatka });
  });
};
