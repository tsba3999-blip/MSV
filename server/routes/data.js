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

  /* Занятость мест для выбора комнаты: только идентификаторы занятых мест,
     без имён и броней. Доступно любому вошедшему — резидент должен видеть,
     какое место уже продано (до этого шахматка была закрыта ролью staff,
     и на странице комнат всё выглядело свободным). */
  route('GET', '/api/occupancy', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');
    const resId = String(req.query.res || '');
    const r = await query(`
      SELECT b.bed_id, b.release_from, b.date_to FROM bookings b
      JOIN beds bd ON bd.id = b.bed_id
      JOIN rooms rm ON rm.id = bd.room_id
      WHERE b.date_from <= CURRENT_DATE AND b.date_to >= CURRENT_DATE
        AND ($1::text = '' OR rm.residence_id = $1)`, [resId]);

    /* busy — занято сейчас.
       soon — занято, но уже известно, когда освободится. Дата берётся сама
       из даты выезда, которую модератор поставил резиденту (решение заказчика
       23.09.2026). Годовые контракты сюда не попадают: показываем только то,
       что освобождается в ближайшие SOON_DAYS дней. Поле release_from —
       ручная пометка модератора, она главнее расчётной даты. */
    const SOON_DAYS = 90;
    const horizon = new Date(Date.now() + SOON_DAYS * 86400000);
    const soon = {};
    r.rows.forEach((x) => {
      if (x.release_from) { soon[x.bed_id] = isoDate(x.release_from); return; }
      if (x.date_to && new Date(x.date_to) <= horizon) soon[x.bed_id] = isoDate(x.date_to);
    });
    json(res, 200, { busy: r.rows.map((x) => x.bed_id), soon, soonDays: SOON_DAYS });
  });

  /* ---------- Шахматка одной резиденции ---------- */

  route('GET', '/api/shahmatka', async (req, res) => {
    // чтение — с роли staff (список резидентов в кабинете сотрудника); менять брони — moderator+
    if (!requireRole(req, res, 'staff')) return;
    const resId = String(req.query.res || '');
    if (!resId) return fail(res, 400, 'Укажи резиденцию: ?res=forma');

    const bookings = await query(`
      SELECT b.id, b.bed_id, b.user_id, b.date_from, b.date_to, b.check_in, b.check_out,
             b.source, b.tariff, b.note, b.created_at, b.release_from, b.release_auto,
             b.hold_until, b.hold_name, b.hold_contact, b.contract_id,
             c.date_from AS contract_from, c.date_to AS contract_to, c.annual, c.ended_at,
             COALESCE(bal.accrued, 0) AS accrued, COALESCE(bal.paid, 0) AS paid,
             EXISTS (SELECT 1 FROM charges ch WHERE ch.booking_id = b.id
                       AND ch.kind = 'deposit' AND ch.cancelled_at IS NULL) AS has_deposit
      FROM bookings b
      LEFT JOIN contracts c ON c.id = b.contract_id
      JOIN beds bd ON bd.id = b.bed_id
      JOIN rooms r ON r.id = bd.room_id
      LEFT JOIN booking_balance bal ON bal.booking_id = b.id
      WHERE r.residence_id = $1`, [resId]);

    /* У бесплатной брони резидента нет вовсе — в список людей она не идёт */
    const userIds = [...new Set(bookings.rows.map((b) => b.user_id).filter(Boolean))];
    if (!userIds.length && !bookings.rows.length) return json(res, 200, { residents: [], bookings: [], payments: [] });

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

    /* Какие месяцы оплачены. Платежи в базе не привязаны к начислениям,
       поэтому закрываем начисления по очереди, от старых к новым: месяц
       считается оплаченным, когда денег хватило на него и на всё, что
       начислено раньше (24.09.2026). */
    const bookingIds = bookings.rows.map((b) => b.id);
    const paidBy = {};
    if (bookingIds.length) {
      const cum = await query(`
        SELECT booking_id, to_char(period, 'YYYY-MM') AS month,
               SUM(amount) OVER (PARTITION BY booking_id ORDER BY period, id
                                 ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS upto
          FROM charges
         WHERE cancelled_at IS NULL AND kind IN ('rent', 'deposit') AND period IS NOT NULL
           AND booking_id = ANY($1)
         ORDER BY booking_id, period, id`, [bookingIds]);
      const money = {};
      bookings.rows.forEach((b) => { money[b.id] = Number(b.paid); });
      cum.rows.forEach((x) => {
        if (Number(x.upto) > (money[x.booking_id] || 0)) return;   // денег не хватило
        (paidBy[x.booking_id] = paidBy[x.booking_id] || []).push(x.month);
      });
    }

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
        id: String(b.id), bedId: b.bed_id, residentId: b.user_id ? String(b.user_id) : '',
        holdUntil: b.hold_until, holdName: b.hold_name || '', holdContact: b.hold_contact || '',
        from: isoDate(b.date_from), to: isoDate(b.date_to),
        checkIn: String(b.check_in).slice(0, 5), checkOut: String(b.check_out).slice(0, 5),
        source: SOURCE[b.source] || b.source, tariff: b.tariff, note: b.note || '',
        accrued: Number(b.accrued), paid: Number(b.paid), bookedAt: isoDate(b.created_at),
        releaseFrom: isoDate(b.release_from), releaseAuto: !!b.release_auto,
        /* Контракт: до какого числа человек обязался и какие месяцы оплачены.
           По ним шахматка рисует контур и заливку внутри него. */
        contractId: b.contract_id ? String(b.contract_id) : '',
        contractFrom: isoDate(b.contract_from), contractTo: isoDate(b.contract_to),
        contractEnded: isoDate(b.ended_at), annual: b.annual === null ? true : !!b.annual,
        depositCharged: !!b.has_deposit,
        paidMonths: paidBy[b.id] || []
      })),
      payments: pays.rows.map((p) => ({
        id: String(p.id), residentId: String(p.user_id), bookingId: String(p.booking_id),
        amount: p.amount, date: isoDate(p.paid_at),
        period: p.period ? isoDate(p.period) : ''
      }))
    });
  });

  /* ---------- Переселение и сдвиг дат ----------
     Тело: { bedId, from, to, releaseFrom } — любое поле можно опустить.
     releaseFrom — дата, с которой место выставлено в продажу, хотя ещё
     занято; null убирает пометку.
     Пересечение с другой бронью отклонит сама база (EXCLUDE) —
     здесь только переводим её ошибку в понятный ответ. */

  /* Депозит равен месячной плате и засчитывается оплатой августа —
     последнего месяца годового контракта (Правила, п. 6.1).

     Кнопка нужна на время переноса данных: у резидентов, заселившихся до
     появления системы, депозит внесён давно, а в базе его нет. Для новых
     резидентов ничего нажимать не надо — депозит приходит галочкой на
     «Проверке данных» (решение заказчика 24.09.2026). */
  route('POST', '/api/bookings/:id/deposit', async (req, res) => {
    const s = requireRole(req, res, 'moderator');
    if (!s) return;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return fail(res, 400, 'Неверный номер брони');

    const r = await query(`
      SELECT b.id, b.user_id, COALESCE(c.price, bd.price) AS price,
             COALESCE(c.date_to, b.date_to) AS finish
        FROM bookings b
        JOIN beds bd ON bd.id = b.bed_id
        LEFT JOIN contracts c ON c.id = b.contract_id
       WHERE b.id = $1`, [id]);
    const b = r.rows[0];
    if (!b) return fail(res, 404, 'Бронь не найдена');
    if (!b.user_id) return fail(res, 400, 'Это бронь без резидента');

    const out = await tx(async (q) => {
      const had = await q(`SELECT id, amount FROM charges
                            WHERE booking_id = $1 AND kind = 'deposit' AND cancelled_at IS NULL
                            LIMIT 1`, [id]);
      let amount;
      if (had.rows[0]) {
        amount = Number(had.rows[0].amount);
      } else {
        amount = Number(b.price) || 0;
        if (!amount) throw Object.assign(new Error('У места не задана цена'), { code: 'noprice' });
        await q(`INSERT INTO charges (booking_id, kind, period, amount, note)
                 VALUES ($1, 'deposit', make_date(EXTRACT(YEAR FROM $2::date)::int, 8, 1), $3,
                         'Оплата августа — последнего месяца годового контракта')`,
          [id, b.finish, amount]);
      }
      await q(`INSERT INTO payments (booking_id, amount, method, note)
               VALUES ($1, $2, 'other', 'Депозит')`, [id, amount]);
      await q(`INSERT INTO audit_log (actor_id, action, target, payload)
               VALUES ($1, 'deposit.add', $2, $3)`,
        [s.uid, 'booking:' + id, JSON.stringify({ amount })]);
      return amount;
    });

    json(res, 201, { ok: true, amount: out });
  });

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
    if (body.releaseFrom === null) { sets.push(`release_from = NULL`); }
    else if (body.releaseFrom) { vals.push(String(body.releaseFrom).slice(0, 10)); sets.push(`release_from = $${vals.length}`); }
    if (!sets.length) return fail(res, 400, 'Нечего менять');
    vals.push(id);

    try {
      const out = await tx(async (q) => {
        const before = await q(`SELECT bed_id, date_from, date_to, release_from FROM bookings WHERE id = $1 FOR UPDATE`, [id]);
        if (!before.rows[0]) return null;

        const upd = await q(
          `UPDATE bookings SET ${sets.join(', ')} WHERE id = $${vals.length}
           RETURNING id, bed_id, date_from, date_to, release_from`, vals);

        /* Модератор поставил дату выезда — значит, человек уходит раньше срока.
           Контракт на этом и кончается: место с этой даты уходит в продажу, а
           система перестаёт напоминать про следующие месяцы. Снял дату —
           контракт снова действует (решение заказчика 24.09.2026). */
        if (body.releaseFrom === null) {
          await q(`UPDATE contracts c SET ended_at = NULL
                     FROM bookings b WHERE b.contract_id = c.id AND b.id = $1`, [id]);
          await q(`UPDATE bookings SET release_auto = false, sale_period = NULL WHERE id = $1`, [id]);
        } else if (body.releaseFrom) {
          await q(`UPDATE contracts c SET ended_at = $2::date
                     FROM bookings b WHERE b.contract_id = c.id AND b.id = $1`, [id, String(body.releaseFrom).slice(0, 10)]);
          await q(`UPDATE bookings SET release_auto = false WHERE id = $1`, [id]);
        }

        await q(`INSERT INTO audit_log (actor_id, action, target, payload) VALUES ($1, 'booking.move', $2, $3)`,
          [s.uid, 'booking:' + id, JSON.stringify({ before: before.rows[0], after: upd.rows[0] })]);

        return upd.rows[0];
      });

      if (!out) return fail(res, 404, 'Бронь не найдена');
      json(res, 200, { id: String(out.id), bedId: out.bed_id, from: isoDate(out.date_from), to: isoDate(out.date_to), releaseFrom: isoDate(out.release_from) });
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
