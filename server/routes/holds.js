'use strict';

/* ============================================================
   /api/holds — бесплатная бронь на 24 или 48 часов

   POST   /api/holds         — поставить (модератор и выше)
   DELETE /api/holds/:id     — снять досрочно (модератор и выше)

   Зачем: человек пришёл на собеседование, место надо придержать,
   пока он думает или едет платить. Оплаты нет, начислений нет —
   только занятое место и час, в который бронь сгорит.

   Как устроено: это обычная строка в bookings, но с заполненным
   hold_until. Так место блокируется тем же ограничением базы, что
   и настоящие брони, и его видно везде, где видно занятость, —
   отдельную таблицу пришлось бы учитывать в десятке запросов.
   Резидента у такой брони может не быть вовсе: имя и контакт
   человека со стороны лежат в hold_name и hold_contact.

   Сгоревшие брони убирает sweepHolds() — его вызывает таймер
   в index.js. За четыре часа до конца тому, кто оставил почту,
   уходит письмо.
   ============================================================ */

const auth = require('../lib/auth');
const notify = require('../lib/notify');
const { json, fail, readJson } = require('../lib/http');
const { query } = require('../lib/db');

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

/* «26 сентября, 18:00» — время московское, сервер живёт в нём же */
function whenText(d) {
  const t = new Date(d);
  return t.getDate() + ' ' + MONTHS[t.getMonth()] + ', ' +
    String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
}

function isEmail(s) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim()); }

module.exports = function register(route) {

  route('POST', '/api/holds', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');
    if (!auth.atLeast(s, 'moderator')) return fail(res, 403, 'Бронь без оплаты ставит модератор или администратор');

    const b = await readJson(req);
    const hours = Number(b.hours) === 48 ? 48 : 24;
    const name = String(b.name || '').trim().slice(0, 120);
    const contact = String(b.contact || '').trim().slice(0, 200);
    if (!b.bedId) return fail(res, 400, 'Не выбрано место');
    if (!name) return fail(res, 400, 'Нужно имя — на кого держим место');

    const bed = await query(`SELECT id FROM beds WHERE id = $1`, [String(b.bedId)]);
    if (!bed.rows[0]) return fail(res, 400, 'Такого места нет');

    /* Бронь по дням, а срок — по часам. Чтобы место было занято всё
       время удержания, берём диапазон от сегодня до дня, следующего
       за днём сгорания. */
    try {
      const r = await query(`
        INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff, note,
                              hold_until, hold_name, hold_contact)
        VALUES (NULL, $1, CURRENT_DATE,
                (now() + ($2 || ' hours')::interval)::date + 1,
                'desk', 'Бронь без оплаты', $3,
                now() + ($2 || ' hours')::interval, $4, $5)
        RETURNING id, hold_until`,
        [String(b.bedId), String(hours), 'Поставил ' + (s.name || 'модератор'), name, contact]);

      const row = r.rows[0];
      await query(`INSERT INTO audit_log (actor_id, action, target, payload) VALUES ($1, 'hold.create', $2, $3)`,
        [s.uid, 'booking:' + row.id, JSON.stringify({ bedId: b.bedId, hours, name, contact })]);

      json(res, 201, { id: String(row.id), holdUntil: row.hold_until, until: whenText(row.hold_until) });
    } catch (err) {
      if (err.code === '23P01') return fail(res, 409, 'Место уже занято на эти даты');
      throw err;
    }
  });

  route('DELETE', '/api/holds/:id', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');
    if (!auth.atLeast(s, 'moderator')) return fail(res, 403, 'Снимает бронь модератор или администратор');

    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return fail(res, 400, 'Неверный номер брони');

    const r = await query(`DELETE FROM bookings WHERE id = $1 AND hold_until IS NOT NULL RETURNING id`, [id]);
    if (!r.rows[0]) return fail(res, 404, 'Такой брони нет — возможно, она уже сгорела');

    await query(`INSERT INTO audit_log (actor_id, action, target, payload) VALUES ($1, 'hold.cancel', $2, '{}')`,
      [s.uid, 'booking:' + id]);
    json(res, 200, { ok: true });
  });
};

/* ---------- уборка: предупредить и погасить ----------
   Вызывается таймером каждые десять минут. Два действия:
   1. За четыре часа до конца — письмо тому, кто оставил почту.
      Телеграм-ник без переписки с ботом использовать нельзя, поэтому
      по нему предупреждаем не человека, а администрацию.
   2. Сгоревшие брони удаляем: место снова свободно, очередь узнает
      об этом сама — её проверка запускается тут же. */

async function sweepHolds() {
  const soon = await query(`
    SELECT b.id, b.hold_until, b.hold_name, b.hold_contact, bd.label, r.name AS room, rs.title AS residence
    FROM bookings b
    JOIN beds bd ON bd.id = b.bed_id
    JOIN rooms r ON r.id = bd.room_id
    JOIN residences rs ON rs.id = r.residence_id
    WHERE b.hold_until IS NOT NULL
      AND b.hold_warned_at IS NULL
      AND b.hold_until > now()
      AND b.hold_until <= now() + interval '4 hours'`);

  for (const h of soon.rows) {
    const place = `${h.room} · место ${h.label} · ${h.residence}`;
    const text = `Бронь на место ${place} сгорит ${whenText(h.hold_until)}. Если хотите его сохранить — свяжитесь с администрацией и оплатите.`;
    try {
      if (isEmail(h.hold_contact)) {
        await notify.sendEmail(h.hold_contact, 'Бронь МСВ скоро сгорит', text);
      } else if (h.hold_contact) {
        /* Телеграм без переписки с ботом недоступен — сообщаем администрации */
        await notify.notifyAdmin('hold', `Предупредите ${h.hold_name} (${h.hold_contact}): ${text}`);
      }
      await query(`UPDATE bookings SET hold_warned_at = now() WHERE id = $1`, [h.id]);
    } catch (e) {
      console.error('[holds] предупреждение не ушло:', e.message);
    }
  }

  const gone = await query(`DELETE FROM bookings WHERE hold_until IS NOT NULL AND hold_until <= now() RETURNING id`);
  if (gone.rows.length) {
    console.log('[holds] сгорело броней:', gone.rows.length);
    try {
      const wl = require('./waitlist');
      if (wl.checkAndNotify) await wl.checkAndNotify();
    } catch (e) { console.error('[holds] очередь не проверена:', e.message); }
  }
  return { warned: soon.rows.length, expired: gone.rows.length };
}

module.exports.sweepHolds = sweepHolds;
