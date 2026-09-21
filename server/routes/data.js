'use strict';

/* ============================================================
   /api/residences, /api/shahmatka, /api/bookings

   GET   /api/residences               → резиденции, комнаты, места (всем)
   GET   /api/shahmatka?res=forma      → данные для шахматки (модератор+)
   PATCH /api/bookings/:id             → переселение / сдвиг дат (модератор+)
   ============================================================ */

const auth = require('../lib/auth');
const { json, fail, readJson } = require('../lib/http');
const { query, tx } = require('../lib/db');
const waitlist = require('./waitlist');

function requireRole(req, res, role) {
  const s = auth.readSession(req);
  if (!s) { fail(res, 401, 'Не выполнен вход'); return null; }
  if (!auth.atLeast(s, role)) { fail(res, 403, 'Недостаточно прав'); return null; }
  return s;
}

/* Дата из базы приходит объектом Date — отдаём как 'YYYY-MM-DD',
   в том виде, который фронтенд уже умеет читать. */
function isoDate(d) {
  if (!d) return null;
  if (typeof d === 'string') return d.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

module.exports = function register(route) {

  /* ---------- Резиденции: тот же вид, что residences.js ---------- */

  route('GET', '/api/residences', async (req, res) => {
    const [r, rooms, beds] = await Promise.all([
      query(`SELECT id, name, title, logo_url FROM residences ORDER BY sort, id`),
      query(`SELECT id, residence_id, number, name, gender, size, note FROM rooms ORDER BY residence_id, number::int`),
      query(`SELECT id, room_id, label, tier, price FROM beds ORDER BY room_id, label`)
    ]);

    const out = r.rows.map((x) => ({
      id: x.id, name: x.name, title: x.title, logo: x.logo_url,
      rooms: rooms.rows.filter((m) => m.residence_id === x.id).map((m) => ({
        id: m.id, buildingId: m.residence_id, number: m.number, name: m.name,
        gender: m.gender || '', size: m.size, note: m.note || ''
      })),
      beds: []
    }));

    const byRoom = {};
    rooms.rows.forEach((m) => { byRoom[m.id] = m.residence_id; });
    beds.rows.forEach((b) => {
      const res_ = out.find((x) => x.id === byRoom[b.room_id]);
      if (res_) res_.beds.push({ id: b.id, roomId: b.room_id, label: b.label, tier: b.tier || '', price: b.price });
    });

    json(res, 200, out);
  });

  /* ---------- Шахматка одной резиденции ---------- */

  route('GET', '/api/shahmatka', async (req, res) => {
    // чтение — с роли staff (список резидентов в кабинете сотрудника); менять брони — moderator+
    if (!requireRole(req, res, 'staff')) return;
    const resId = String(req.query.res || '');
    if (!resId) return fail(res, 400, 'Укажи резиденцию: ?res=forma');

    const bookings = await query(`
      SELECT b.id, b.bed_id, b.user_id, b.date_from, b.date_to, b.check_in, b.check_out,
             b.source, b.tariff, b.note, b.created_at,
             COALESCE(bal.accrued, 0) AS accrued, COALESCE(bal.paid, 0) AS paid
      FROM bookings b
      JOIN beds bd ON bd.id = b.bed_id
      JOIN rooms r ON r.id = bd.room_id
      LEFT JOIN booking_balance bal ON bal.booking_id = b.id
      WHERE r.residence_id = $1`, [resId]);

    const userIds = [...new Set(bookings.rows.map((b) => b.user_id))];
    if (!userIds.length) return json(res, 200, { residents: [], bookings: [], payments: [] });

    const [users, regs, pays] = await Promise.all([
      query(`
        SELECT u.id, u.name, u.phone, p.birthday, p.city, p.university, p.faculty,
               p.contact_person, p.vk, p.photo_url, p.messengers, p.docs_signed_at
        FROM users u LEFT JOIN resident_profiles p ON p.user_id = u.id
        WHERE u.id = ANY($1)`, [userIds]),
      query(`SELECT user_id, number, issued_at, valid_until, address FROM registrations
             WHERE user_id = ANY($1) ORDER BY issued_at DESC`, [userIds]),
      query(`SELECT p.id, p.booking_id, b.user_id, p.amount, p.paid_at, p.period
             FROM payments p JOIN bookings b ON b.id = p.booking_id
             WHERE b.user_id = ANY($1) ORDER BY p.paid_at DESC`, [userIds])
    ]);

    const SOURCE = { site: 'Сайт', desk: 'От стойки', transfer: 'Перевод' };

    json(res, 200, {
      residents: users.rows.map((u) => ({
        id: String(u.id), name: u.name, phone: u.phone || '',
        birthday: isoDate(u.birthday), city: u.city || '',
        university: u.university || '', program: u.faculty || '',
        contactPerson: u.contact_person || '', vk: u.vk || '', photo: u.photo_url || '',
        messengers: u.messengers || [], signedAt: isoDate(u.docs_signed_at),
        docsSigned: !!u.docs_signed_at,
        registrations: regs.rows.filter((r) => r.user_id === u.id).map((r) => ({
          number: r.number || '', issued: isoDate(r.issued_at), until: isoDate(r.valid_until), address: r.address || ''
        }))
      })),
      bookings: bookings.rows.map((b) => ({
        id: String(b.id), bedId: b.bed_id, residentId: String(b.user_id),
        from: isoDate(b.date_from), to: isoDate(b.date_to),
        checkIn: String(b.check_in).slice(0, 5), checkOut: String(b.check_out).slice(0, 5),
        source: SOURCE[b.source] || b.source, tariff: b.tariff, note: b.note || '',
        accrued: Number(b.accrued), paid: Number(b.paid), bookedAt: isoDate(b.created_at)
      })),
      payments: pays.rows.map((p) => ({
        id: String(p.id), residentId: String(p.user_id), bookingId: String(p.booking_id),
        amount: p.amount, date: isoDate(p.paid_at),
        period: p.period ? isoDate(p.period) : ''
      }))
    });
  });

  /* ---------- Переселение и сдвиг дат ----------
     Тело: { bedId, from, to } — любое поле можно опустить.
     Пересечение с другой бронью отклонит сама база (EXCLUDE) —
     здесь только переводим её ошибку в понятный ответ. */

  route('PATCH', '/api/bookings/:id', async (req, res) => {
    const s = requireRole(req, res, 'moderator');
    if (!s) return;

    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return fail(res, 400, 'Неверный номер брони');
    const body = await readJson(req);

    const sets = [], vals = [];
    if (body.bedId) { vals.push(String(body.bedId)); sets.push(`bed_id = $${vals.length}`); }
    if (body.from)  { vals.push(String(body.from).slice(0, 10)); sets.push(`date_from = $${vals.length}`); }
    if (body.to)    { vals.push(String(body.to).slice(0, 10)); sets.push(`date_to = $${vals.length}`); }
    if (!sets.length) return fail(res, 400, 'Нечего менять');
    vals.push(id);

    try {
      const out = await tx(async (q) => {
        const before = await q(`SELECT bed_id, date_from, date_to FROM bookings WHERE id = $1 FOR UPDATE`, [id]);
        if (!before.rows[0]) return null;

        const upd = await q(
          `UPDATE bookings SET ${sets.join(', ')} WHERE id = $${vals.length}
           RETURNING id, bed_id, date_from, date_to`, vals);

        await q(`INSERT INTO audit_log (actor_id, action, target, payload) VALUES ($1, 'booking.move', $2, $3)`,
          [s.uid, 'booking:' + id, JSON.stringify({ before: before.rows[0], after: upd.rows[0] })]);

        return upd.rows[0];
      });

      if (!out) return fail(res, 404, 'Бронь не найдена');
      json(res, 200, { id: String(out.id), bedId: out.bed_id, from: isoDate(out.date_from), to: isoDate(out.date_to) });
      // переселение освобождает место — сообщаем всем в очереди
      waitlist.checkAndNotify().catch(() => {});
    } catch (err) {
      // 23P01 — нарушение EXCLUDE: место занято на эти даты
      if (err.code === '23P01') return fail(res, 409, 'Место занято на эти даты');
      if (err.code === '23503') return fail(res, 400, 'Такого места нет');
      if (err.code === '23514') return fail(res, 400, 'Выезд должен быть позже заезда');
      throw err;
    }
  });
};
