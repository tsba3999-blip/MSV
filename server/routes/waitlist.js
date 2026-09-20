'use strict';

/* ============================================================
   /api/waitlist — очередь на свободное место

   GET    /api/waitlist            — свои заявки (резидент) / все (модератор+)
   POST   /api/waitlist            { residenceId, roomSize, tier, note }
   DELETE /api/waitlist/:id        — снять заявку
   POST   /api/waitlist/check      — модератор+: проверить свободные места
                                     и разослать всем подходящим

   Рассылка идёт ВСЕМ подходящим заявкам сразу, а не по одному:
   место достаётся тому, кто первым оплатит — как в правилах про
   овербукинг (п. 17.6.2). Повторно тем же людям о том же месте
   не пишем сутки: notified_at.
   ============================================================ */

const auth = require('../lib/auth');
const notify = require('../lib/notify');
const { json, fail, readJson } = require('../lib/http');
const { query } = require('../lib/db');

module.exports = function register(route) {

  route('GET', '/api/waitlist', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');
    const mine = !auth.atLeast(s, 'moderator');
    const r = await query(`
      SELECT w.id, w.user_id, u.name, w.residence_id, rs.title AS residence, w.room_size, w.tier, w.note, w.active, w.notified_at, w.created_at
      FROM waitlist w LEFT JOIN users u ON u.id = w.user_id LEFT JOIN residences rs ON rs.id = w.residence_id
      WHERE w.active ${mine ? 'AND w.user_id = $1' : ''} ORDER BY w.created_at`, mine ? [s.uid] : []);
    json(res, 200, r.rows.map((x) => ({ id: String(x.id), name: x.name, residence: x.residence || 'любая', residenceId: x.residence_id,
      roomSize: x.room_size, tier: x.tier, note: x.note || '', notifiedAt: x.notified_at, at: x.created_at })));
  });

  route('POST', '/api/waitlist', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');
    const b = await readJson(req);
    const size = b.roomSize ? Number(b.roomSize) : null;
    if (size !== null && !(Number.isInteger(size) && size >= 1 && size <= 12)) return fail(res, 400, 'Размер комнаты — от 1 до 12');
    const tier = b.tier === 'нижнее' || b.tier === 'верхнее' ? b.tier : null;
    const r = await query(`INSERT INTO waitlist (user_id, residence_id, room_size, tier, note) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [s.uid, b.residenceId ? String(b.residenceId) : null, size, tier, String(b.note || '').slice(0, 300)]);
    json(res, 201, { id: String(r.rows[0].id) });
    // если подходящее место уже свободно — скажем сразу
    checkAndNotify().catch((e) => console.error('[waitlist]', e.message));
  });

  route('DELETE', '/api/waitlist/:id', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');
    const id = Number(req.params.id);
    const cond = auth.atLeast(s, 'moderator') ? '' : ' AND user_id = $2';
    const r = await query(`UPDATE waitlist SET active = false WHERE id = $1${cond} RETURNING id`, auth.atLeast(s, 'moderator') ? [id] : [id, s.uid]);
    if (!r.rows[0]) return fail(res, 404, 'Заявка не найдена');
    json(res, 200, { ok: true });
  });

  route('POST', '/api/waitlist/check', async (req, res) => {
    const s = auth.readSession(req);
    if (!s || !auth.atLeast(s, 'moderator')) return fail(res, 403, 'Только модератор или администратор');
    const out = await checkAndNotify();
    json(res, 200, out);
  });
};

/* Свободные сегодня места → все активные заявки, которым они подходят.
   Одному человеку — одно сообщение со всеми подходящими местами. */
async function checkAndNotify() {
  const free = await query(`
    SELECT bd.id, bd.label, bd.tier, bd.price, r.name AS room, r.size, r.residence_id, rs.title AS residence
    FROM beds bd JOIN rooms r ON r.id = bd.room_id JOIN residences rs ON rs.id = r.residence_id
    WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.bed_id = bd.id AND b.date_from <= CURRENT_DATE AND b.date_to >= CURRENT_DATE)`);
  if (!free.rows.length) return { free: 0, notified: 0 };

  const wl = await query(`SELECT * FROM waitlist WHERE active AND user_id IS NOT NULL
    AND (notified_at IS NULL OR notified_at < now() - interval '1 day')`);
  let notified = 0;
  for (const w of wl.rows) {
    const match = free.rows.filter((f) =>
      (!w.residence_id || f.residence_id === w.residence_id) &&
      (!w.room_size || f.size === w.room_size) &&
      (!w.tier || f.tier === w.tier));
    if (!match.length) continue;
    const lines = match.slice(0, 6).map((f) => `• ${f.residence}, ${f.room}, место ${f.label}${f.tier ? ' (' + f.tier + ')' : ''} — ${f.price.toLocaleString('ru-RU')} руб./мес.`);
    const text = `<b>Освободилось место</b>\n${lines.join('\n')}${match.length > 6 ? '\n…и ещё ' + (match.length - 6) : ''}\n\nМесто получит тот, кто первым оплатит. Забронировать: в кабинете → Оплатить.`;
    await notify.notifyResident(w.user_id, 'news', text);
    await query(`INSERT INTO notices (user_id, kind, text) VALUES ($1, 'info', $2)`, [w.user_id, text.replace(/<[^>]+>/g, '')]);
    await query(`UPDATE waitlist SET notified_at = now() WHERE id = $1`, [w.id]);
    notified++;
  }
  return { free: free.rows.length, notified };
}

module.exports.checkAndNotify = checkAndNotify;
