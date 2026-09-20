'use strict';

/* ============================================================
   /api/tickets — заявки в сервис

   GET   /api/tickets            → список (роль решает, что видно)
   POST  /api/tickets            → новая заявка (резидент)
   PATCH /api/tickets/:id        → статус, мастер (сотрудник+)
   ============================================================ */

const auth = require('../lib/auth');
const { json, fail, readJson } = require('../lib/http');
const { query } = require('../lib/db');
const notify = require('../lib/notify');

const PRIORITY = { critical: 'Критическая авария', urgent: 'Срочная поломка', normal: 'Текущая неисправность', consult: 'Консультация' };
const HOURS = { critical: 2, urgent: 12, normal: 72, consult: 120 };
const STATUS = { accepted: 'Принята', in_progress: 'В работе', done: 'Выполнена', rejected: 'Отклонена' };
const STATUS_IN = { 'Принята': 'accepted', 'В работе': 'in_progress', 'Выполнена': 'done', 'Отклонена': 'rejected' };

function shape(t, now) {
  const ageHours = Math.floor((now - new Date(t.created_at)) / 3600000);
  const closed = t.status === 'done' || t.status === 'rejected';
  return {
    id: String(t.id), residentId: String(t.user_id), resident: t.resident_name,
    residence: t.residence_title || '', residenceId: t.residence_id || '',
    room: t.room_name || '', bed: t.bed_label || '',
    category: t.category, place: t.place || '', text: t.text,
    priority: t.priority, priorityName: PRIORITY[t.priority], deadlineHours: HOURS[t.priority],
    status: STATUS[t.status], ageHours, created: new Date(t.created_at).getTime(),
    overdue: !closed && ageHours > HOURS[t.priority],
    master: t.master_name || '', masterId: t.master_id ? String(t.master_id) : ''
  };
}

const SELECT = `
  SELECT t.*, u.name AS resident_name, m.name AS master_name,
         r.name AS room_name, bd.label AS bed_label, s.id AS residence_id, s.title AS residence_title
  FROM tickets t
  JOIN users u ON u.id = t.user_id
  LEFT JOIN users m ON m.id = t.master_id
  LEFT JOIN bookings b ON b.id = t.booking_id
  LEFT JOIN beds bd ON bd.id = b.bed_id
  LEFT JOIN rooms r ON r.id = bd.room_id
  LEFT JOIN residences s ON s.id = r.residence_id`;

module.exports = function register(route) {

  route('GET', '/api/tickets', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');

    // Резидент видит только свои. Сотрудник и выше — все.
    const where = s.role === 'resident' ? 'WHERE t.user_id = $1' : '';
    const params = s.role === 'resident' ? [s.uid] : [];
    const r = await query(`${SELECT} ${where} ORDER BY t.created_at DESC`, params);
    const now = Date.now();
    json(res, 200, r.rows.map((t) => shape(t, now)));
  });

  route('POST', '/api/tickets', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');
    const b = await readJson(req);

    const text = String(b.text || '').trim();
    if (!text) return fail(res, 400, 'Опиши, что случилось');
    if (text.length > 1000) return fail(res, 400, 'Не длиннее 1000 знаков');
    if (!PRIORITY[b.priority]) return fail(res, 400, 'Неверная срочность');

    // Текущая бронь резидента — чтобы знать комнату
    const bk = await query(
      `SELECT id FROM bookings WHERE user_id = $1 AND date_from <= CURRENT_DATE AND date_to >= CURRENT_DATE
       ORDER BY date_from DESC LIMIT 1`, [s.uid]);

    const r = await query(
      `INSERT INTO tickets (user_id, booking_id, category, place, room_number, text, priority)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [s.uid, bk.rows[0] ? bk.rows[0].id : null, String(b.category || 'Другое'),
       b.place ? String(b.place) : null, b.room ? String(b.room) : null, text, b.priority]);

    json(res, 201, { id: String(r.rows[0].id) });

    notify.notifyAdmin('tickets', `<b>Новая заявка · ${PRIORITY[b.priority]}</b>\n${b.category || 'Другое'}${b.room ? ', к. ' + b.room : ''}\n${text.slice(0, 200)}`)
      .catch(() => {});
  });

  route('PATCH', '/api/tickets/:id', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');
    if (!auth.atLeast(s, 'staff')) return fail(res, 403, 'Недостаточно прав');

    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return fail(res, 400, 'Неверный номер заявки');
    const b = await readJson(req);

    const sets = [], vals = [];
    if (b.status) {
      const st = STATUS_IN[b.status] || (STATUS[b.status] ? b.status : null);
      if (!st) return fail(res, 400, 'Неверный статус');
      vals.push(st); sets.push(`status = $${vals.length}`);
      if (st === 'done' || st === 'rejected') sets.push('closed_at = now()');
    }
    if (b.take) { vals.push(s.uid); sets.push(`master_id = $${vals.length}`); }
    if (b.masterId !== undefined && auth.atLeast(s, 'moderator')) {
      vals.push(b.masterId ? Number(b.masterId) : null); sets.push(`master_id = $${vals.length}`);
    }
    if (!sets.length) return fail(res, 400, 'Нечего менять');

    vals.push(id);
    const r = await query(`UPDATE tickets SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING id`, vals);
    if (!r.rows[0]) return fail(res, 404, 'Заявка не найдена');

    await query(`INSERT INTO audit_log (actor_id, action, target, payload) VALUES ($1, 'ticket.update', $2, $3)`,
      [s.uid, 'ticket:' + id, JSON.stringify(b)]);

    json(res, 200, { ok: true });

    if (b.status) {
      const t = await query(`SELECT user_id, category, status FROM tickets WHERE id = $1`, [id]);
      const row = t.rows[0];
      if (row) {
        const say = { in_progress: 'взята в работу', done: 'выполнена', rejected: 'отклонена', accepted: 'принята' }[row.status];
        notify.notifyResident(row.user_id, 'tickets', `Заявка «${row.category}» ${say}.`).catch(() => {});
      }
    }
  });
};
