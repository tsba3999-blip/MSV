'use strict';

/* ============================================================
   Формы: обращения, запросы документов, рассылки

   POST /api/feedback     { topic, text, anonymous }   — резидент, сотрудник
   GET  /api/requests                                  — свои запросы
   POST /api/requests     { kind, note }               — резидент
   POST /api/mailings     { to, kind, title, text }    — сотрудник+, уходит на согласование
   POST /api/mailings/:id/send                          — модератор+: согласовать и отправить
   ============================================================ */

const auth = require('../lib/auth');
const notify = require('../lib/notify');
const { json, fail, readJson } = require('../lib/http');
const { query } = require('../lib/db');

const KIND_NAME = { registration: 'Регистрация', residence_cert: 'Справка о проживании',
  guardian_contract: 'Договор для опеки', fix: 'Исправление данных', relocation: 'Переселение' };
const STATUS_NAME = { accepted: 'Принят', in_progress: 'В работе', done: 'Готово', rejected: 'Отклонён' };

function fmt(d) { const x = new Date(d); return String(x.getDate()).padStart(2, '0') + '.' + String(x.getMonth() + 1).padStart(2, '0') + '.' + x.getFullYear(); }

module.exports = function register(route) {

  route('POST', '/api/feedback', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');
    const b = await readJson(req);
    const text = String(b.text || '').trim();
    if (!text) return fail(res, 400, 'Напиши хоть пару слов');
    if (text.length > 1500) return fail(res, 400, 'Не длиннее 1500 знаков');
    await query(`INSERT INTO feedback (user_id, topic, text) VALUES ($1, $2, $3)`,
      [b.anonymous ? null : s.uid, String(b.topic || 'Другое').slice(0, 50), text]);
    json(res, 201, { ok: true });
    notify.notifyAdmin('tickets', `<b>Хочу сказать · ${String(b.topic || 'Другое')}</b>\n${text.slice(0, 300)}${b.anonymous ? '\n(анонимно)' : ''}`).catch(() => {});
  });

  route('GET', '/api/requests', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');
    const r = await query(`SELECT id, kind, note, status, created_at FROM doc_requests WHERE user_id = $1 ORDER BY created_at DESC`, [s.uid]);
    json(res, 200, r.rows.map((x) => ({ id: String(x.id), kind: x.kind, note: x.note || '', status: STATUS_NAME[x.status], at: fmt(x.created_at) })));
  });

  route('POST', '/api/requests', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');
    const b = await readJson(req);
    if (!KIND_NAME[b.kind]) return fail(res, 400, 'Неизвестный вид запроса');
    const r = await query(`INSERT INTO doc_requests (user_id, kind, note) VALUES ($1, $2, $3) RETURNING id`,
      [s.uid, b.kind, String(b.note || '').slice(0, 500)]);
    json(res, 201, { id: String(r.rows[0].id) });
    notify.notifyAdmin('tickets', `<b>Запрос: ${KIND_NAME[b.kind]}</b>${b.note ? '\n' + String(b.note).slice(0, 200) : ''}`).catch(() => {});
  });

  /* Токены репутации — заносит модератор или администратор */
  route('POST', '/api/reputation', async (req, res) => {
    const s = auth.readSession(req);
    if (!s || !auth.atLeast(s, 'moderator')) return fail(res, 403, 'Токены заносит модератор или администратор');
    const b = await readJson(req);
    const uid = Number(b.userId), delta = Number(b.delta);
    if (!Number.isInteger(uid) || !isFinite(delta) || Math.abs(delta) > 5) return fail(res, 400, 'Нужны резидент и токены от −5 до +5');
    const title = String(b.title || '').trim(); if (!title) return fail(res, 400, 'Нужно название события');
    const r = await query(`INSERT INTO reputation_events (user_id, title, details, delta, is_negative, author_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [uid, title.slice(0, 120), String(b.details || '').slice(0, 500), delta.toFixed(1), delta < 0, s.uid]);
    await query(`INSERT INTO audit_log (actor_id, action, target, payload) VALUES ($1, 'reputation.add', $2, $3)`, [s.uid, 'user:' + uid, JSON.stringify({ delta, title })]);
    json(res, 201, { id: String(r.rows[0].id) });
    notify.notifyResident(uid, 'news', `Репутация: ${delta > 0 ? '+' : ''}${delta.toFixed(1)} — ${title}`).catch(() => {});
  });

  route('POST', '/api/mailings', async (req, res) => {
    const s = auth.readSession(req);
    if (!s || !auth.atLeast(s, 'staff')) return fail(res, 403, 'Только сотрудники');
    const b = await readJson(req);
    const title = String(b.title || '').trim(), text = String(b.text || '').trim();
    if (!title || !text) return fail(res, 400, 'Нужны заголовок и текст');
    if (!['news', 'alarm', 'pay'].includes(b.kind)) return fail(res, 400, 'Неверный вид');
    // to: 'all' | id резиденции | 'user:<id>' — одному резиденту
    const oneUser = /^user:(\d+)$/.test(String(b.to || '')) ? Number(String(b.to).slice(5)) : null;
    const resId = !oneUser && b.to && b.to !== 'all' ? String(b.to) : null;
    // модератор и выше отправляет сразу, сотрудник — на согласование
    const status = auth.atLeast(s, 'moderator') ? 'approved' : 'draft';
    const r = await query(`INSERT INTO mailings (author_id, residence_id, user_id, kind, title, text, status, approved_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [s.uid, resId, oneUser, b.kind, title.slice(0, 200), text.slice(0, 1000), status, status === 'approved' ? s.uid : null]);
    json(res, 201, { id: String(r.rows[0].id), status });
    if (status === 'approved') sendMailing(r.rows[0].id).catch((e) => console.error('[mailing]', e.message));
    else notify.notifyAdmin('tickets', `<b>Рассылка на согласование</b>\n${title}`).catch(() => {});
  });

  route('POST', '/api/mailings/:id/send', async (req, res) => {
    const s = auth.readSession(req);
    if (!s || !auth.atLeast(s, 'moderator')) return fail(res, 403, 'Согласует модератор или администратор');
    const id = Number(req.params.id);
    const r = await query(`UPDATE mailings SET status = 'approved', approved_by = $1 WHERE id = $2 AND status = 'draft' RETURNING id`, [s.uid, id]);
    if (!r.rows[0]) return fail(res, 404, 'Рассылка не найдена или уже отправлена');
    json(res, 200, { ok: true });
    sendMailing(id).catch((e) => console.error('[mailing]', e.message));
  });

  /* Отправка всем резидентам резиденции (или всем) в их каналы */
  async function sendMailing(id) {
    const m = (await query(`SELECT * FROM mailings WHERE id = $1`, [id])).rows[0];
    if (!m) return;
    // одному человеку — только ему; иначе всем живущим в резиденции (или везде)
    const who = m.user_id ? { rows: [{ user_id: m.user_id }] } : await query(`
      SELECT DISTINCT b.user_id FROM bookings b
      JOIN beds bd ON bd.id = b.bed_id JOIN rooms r ON r.id = bd.room_id
      WHERE b.date_from <= CURRENT_DATE AND b.date_to >= CURRENT_DATE
        AND ($1::text IS NULL OR r.residence_id = $1)`, [m.residence_id]);
    let sent = 0;
    for (const row of who.rows) {
      const out = await notify.notifyResident(row.user_id, m.kind === 'pay' ? 'pay' : 'news', `<b>${m.title}</b>\n${m.text}`);
      if (out && out.ok) sent++;
      await query(`INSERT INTO notices (user_id, kind, text) VALUES ($1, $2, $3)`,
        [row.user_id, m.kind === 'alarm' ? 'alarm' : (m.kind === 'pay' ? 'pay' : 'info'), m.title + '. ' + m.text]);
    }
    await query(`UPDATE mailings SET status = 'sent', sent_count = $1, sent_at = now() WHERE id = $2`, [sent, id]);
  }
};
