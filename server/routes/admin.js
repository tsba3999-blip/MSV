'use strict';

/* ============================================================
   Управление резиденциями (модератор+) и загрузка файлов

   PATCH  /api/rooms/:id            { name, gender, note }
   POST   /api/rooms                { residenceId, number, name, gender, size, note }
   DELETE /api/rooms/:id            — только если нет броней на местах комнаты
   PATCH  /api/beds/:id             { label, tier, price }
   POST   /api/beds                 { roomId, label, tier, price }
   DELETE /api/beds/:id             — только если нет броней
   POST   /api/upload               тело — сам файл, заголовок X-File-Name → { url }
   POST   /api/rooms/:id/photos     { url }
   DELETE /api/photos/:id
   GET    /api/rooms/:id/photos     → [{ id, url }]
   PUT    /api/rooms/:id/photos/order { ids }  — порядок показа (перетаскивание в кабинете)
   ============================================================ */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const auth = require('../lib/auth');
const { json, fail, readJson } = require('../lib/http');
const { query, config } = require('../lib/db');

const UPLOAD_DIR = path.join(config.webDir, 'uploads');
const MAX_UPLOAD = 8 * 1024 * 1024;   // 8 МБ
const TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

function mod(req, res) {
  const s = auth.readSession(req);
  if (!s) { fail(res, 401, 'Не выполнен вход'); return null; }
  if (!auth.atLeast(s, 'moderator')) { fail(res, 403, 'Только модератор или администратор'); return null; }
  return s;
}

async function audit(actor, action, target, payload) {
  await query(`INSERT INTO audit_log (actor_id, action, target, payload) VALUES ($1, $2, $3, $4)`,
    [actor, action, target, JSON.stringify(payload || {})]);
}

/* Читаем тело как есть — файл целиком, с ограничением размера */
function readRaw(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('big')); req.destroy(); return; } chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

/* Проверяем, что это картинка, по первым байтам, а не по заголовку —
   заголовок присылает клиент, ему верить нельзя. */
function sniff(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xFF && buf[1] === 0xD8) return 'image/jpeg';
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47) return 'image/png';
  if (buf.slice(0, 4).toString() === 'GIF8') return 'image/gif';
  if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return 'image/webp';
  return null;
}

module.exports = function register(route) {

  /* ---------- Комнаты ---------- */

  route('PATCH', '/api/rooms/:id', async (req, res) => {
    const s = mod(req, res); if (!s) return;
    const b = await readJson(req);
    const sets = [], vals = [];
    if (b.name !== undefined) { vals.push(String(b.name).slice(0, 100)); sets.push(`name = $${vals.length}`); }
    if (b.gender !== undefined) { vals.push(b.gender === 'ж' || b.gender === 'м' ? b.gender : null); sets.push(`gender = $${vals.length}`); }
    if (b.note !== undefined) { vals.push(String(b.note).slice(0, 300)); sets.push(`note = $${vals.length}`); }
    if (!sets.length) return fail(res, 400, 'Нечего менять');
    vals.push(req.params.id);
    const r = await query(`UPDATE rooms SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING id`, vals);
    if (!r.rows[0]) return fail(res, 404, 'Комната не найдена');
    await audit(s.uid, 'room.update', 'room:' + req.params.id, b);
    json(res, 200, { ok: true });
  });

  route('POST', '/api/rooms', async (req, res) => {
    const s = mod(req, res); if (!s) return;
    const b = await readJson(req);
    if (!b.residenceId || !b.number) return fail(res, 400, 'Нужны резиденция и номер');
    const id = `${b.residenceId}-r${String(b.number).replace(/\W/g, '')}`;
    try {
      await query(`INSERT INTO rooms (id, residence_id, number, name, gender, size, note) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [id, String(b.residenceId), String(b.number), String(b.name || ('№' + b.number)).slice(0, 100),
         b.gender === 'ж' || b.gender === 'м' ? b.gender : null, Math.max(1, Number(b.size) || 1), String(b.note || '').slice(0, 300)]);
    } catch (e) {
      if (e.code === '23505') return fail(res, 409, 'Комната с таким номером уже есть');
      if (e.code === '23503') return fail(res, 400, 'Такой резиденции нет');
      throw e;
    }
    await audit(s.uid, 'room.create', 'room:' + id, b);
    json(res, 201, { id });
  });

  route('DELETE', '/api/rooms/:id', async (req, res) => {
    const s = mod(req, res); if (!s) return;
    const busy = await query(`SELECT 1 FROM bookings bk JOIN beds bd ON bd.id = bk.bed_id WHERE bd.room_id = $1 LIMIT 1`, [req.params.id]);
    if (busy.rows[0]) return fail(res, 409, 'В комнате есть брони — сначала переселите людей');
    const r = await query(`DELETE FROM rooms WHERE id = $1 RETURNING id`, [req.params.id]);
    if (!r.rows[0]) return fail(res, 404, 'Комната не найдена');
    await audit(s.uid, 'room.delete', 'room:' + req.params.id);
    json(res, 200, { ok: true });
  });

  /* ---------- Места ---------- */

  route('PATCH', '/api/beds/:id', async (req, res) => {
    const s = mod(req, res); if (!s) return;
    const b = await readJson(req);
    const sets = [], vals = [];
    if (b.label !== undefined) { vals.push(String(b.label).slice(0, 30)); sets.push(`label = $${vals.length}`); }
    if (b.tier !== undefined) { vals.push(b.tier === 'нижнее' || b.tier === 'верхнее' ? b.tier : null); sets.push(`tier = $${vals.length}`); }
    if (b.price !== undefined) {
      const p = Number(b.price);
      if (!Number.isInteger(p) || p < 0 || p > 1000000) return fail(res, 400, 'Цена — целое число рублей');
      vals.push(p); sets.push(`price = $${vals.length}`);
    }
    if (!sets.length) return fail(res, 400, 'Нечего менять');
    vals.push(req.params.id);
    const r = await query(`UPDATE beds SET ${sets.join(', ')} WHERE id = $${vals.length} RETURNING id`, vals);
    if (!r.rows[0]) return fail(res, 404, 'Место не найдено');
    await audit(s.uid, 'bed.update', 'bed:' + req.params.id, b);
    json(res, 200, { ok: true });
  });

  route('POST', '/api/beds', async (req, res) => {
    const s = mod(req, res); if (!s) return;
    const b = await readJson(req);
    if (!b.roomId || !b.label) return fail(res, 400, 'Нужны комната и обозначение места');
    const id = `${b.roomId}-b${Date.now().toString(36)}`;
    try {
      await query(`INSERT INTO beds (id, room_id, label, tier, price) VALUES ($1, $2, $3, $4, $5)`,
        [id, String(b.roomId), String(b.label).slice(0, 30), b.tier === 'нижнее' || b.tier === 'верхнее' ? b.tier : null, Math.max(0, Number(b.price) || 0)]);
    } catch (e) {
      if (e.code === '23505') return fail(res, 409, 'Место с таким обозначением уже есть');
      if (e.code === '23503') return fail(res, 400, 'Такой комнаты нет');
      throw e;
    }
    await audit(s.uid, 'bed.create', 'bed:' + id, b);
    json(res, 201, { id });
  });

  route('DELETE', '/api/beds/:id', async (req, res) => {
    const s = mod(req, res); if (!s) return;
    const busy = await query(`SELECT 1 FROM bookings WHERE bed_id = $1 LIMIT 1`, [req.params.id]);
    if (busy.rows[0]) return fail(res, 409, 'На месте есть брони — сначала переселите');
    const r = await query(`DELETE FROM beds WHERE id = $1 RETURNING id`, [req.params.id]);
    if (!r.rows[0]) return fail(res, 404, 'Место не найдено');
    await audit(s.uid, 'bed.delete', 'bed:' + req.params.id);
    json(res, 200, { ok: true });
  });

  /* ---------- Регистрация резидента (миграционный учёт) ---------- */

  route('POST', '/api/users/:id/registration', async (req, res) => {
    const s = mod(req, res); if (!s) return;
    const b = await readJson(req);
    const uid = Number(req.params.id);
    if (!Number.isInteger(uid)) return fail(res, 400, 'Неверный пользователь');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(b.until || ''))) return fail(res, 400, 'Срок в виде ГГГГ-ММ-ДД');
    const issued = /^\d{4}-\d{2}-\d{2}$/.test(String(b.issued || '')) ? b.issued : null;
    const file = /^\/uploads\/[a-f0-9]+\.(jpg|png|webp|gif)$/.test(String(b.fileUrl || '')) ? b.fileUrl : null;
    const r = await query(
      `INSERT INTO registrations (user_id, number, issued_at, valid_until, address)
       VALUES ($1, $2, COALESCE($3::date, CURRENT_DATE), $4, $5) RETURNING id`,
      [uid, String(b.number || '').slice(0, 50), issued, b.until, String(b.address || '').slice(0, 200)]);
    if (file) await query(`INSERT INTO resident_files (user_id, kind, url) VALUES ($1, 'other', $2)`, [uid, file]);
    await audit(s.uid, 'registration.add', 'user:' + uid, { until: b.until, number: b.number });
    json(res, 201, { id: String(r.rows[0].id) });
  });

  /* ---------- Фото ---------- */

  route('POST', '/api/upload', async (req, res) => {
    const s = mod(req, res); if (!s) return;
    let buf;
    try { buf = await readRaw(req, MAX_UPLOAD); }
    catch (e) { return fail(res, 413, 'Файл больше 8 МБ'); }

    const type = sniff(buf);
    if (!type) return fail(res, 400, 'Это не изображение (JPEG, PNG, WebP, GIF)');

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const name = crypto.randomBytes(12).toString('hex') + TYPES[type];
    fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
    await audit(s.uid, 'file.upload', 'file:' + name, { bytes: buf.length, type });
    json(res, 201, { url: '/uploads/' + name });
  });

  /* Своё фото в кружок профиля. Единственная загрузка, доступная любому
     вошедшему: человек меняет своё лицо, а не чужие данные. Файл проходит
     ту же проверку, что и фото комнат, — по содержимому, а не по имени
     (решение заказчика 25.09.2026). */
  route('POST', '/api/me/photo', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');

    let buf;
    try { buf = await readRaw(req, MAX_UPLOAD); }
    catch (e) { return fail(res, 413, 'Файл больше 8 МБ'); }

    const type = sniff(buf);
    if (!type) return fail(res, 400, 'Это не изображение (JPEG, PNG, WebP, GIF)');

    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    const name = crypto.randomBytes(12).toString('hex') + TYPES[type];
    fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
    const url = '/uploads/' + name;
    await query(`UPDATE users SET photo_url = $2 WHERE id = $1`, [s.uid, url]);
    await audit(s.uid, 'me.photo', 'user:' + s.uid, { url });
    json(res, 201, { url });
  });

  route('DELETE', '/api/me/photo', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');
    await query(`UPDATE users SET photo_url = NULL WHERE id = $1`, [s.uid]);
    await audit(s.uid, 'me.photo.clear', 'user:' + s.uid, {});
    json(res, 200, { ok: true });
  });

  route('GET', '/api/rooms/:id/photos', async (req, res) => {
    const r = await query(`SELECT id, url FROM room_photos WHERE room_id = $1 ORDER BY sort, id`, [req.params.id]);
    json(res, 200, r.rows.map((x) => ({ id: String(x.id), url: x.url })));
  });

  route('POST', '/api/rooms/:id/photos', async (req, res) => {
    const s = mod(req, res); if (!s) return;
    const b = await readJson(req);
    if (!/^\/uploads\/[a-f0-9]+\.(jpg|png|webp|gif)$/.test(String(b.url || ''))) return fail(res, 400, 'Сначала загрузите файл через /api/upload');
    const r = await query(`INSERT INTO room_photos (room_id, url, uploaded_by, sort)
      VALUES ($1, $2, $3, (SELECT COALESCE(max(sort), 0) + 1 FROM room_photos WHERE room_id = $1)) RETURNING id`,
      [req.params.id, b.url, s.uid]);
    json(res, 201, { id: String(r.rows[0].id) });
  });

  route('PUT', '/api/rooms/:id/photos/order', async (req, res) => {
    const s = mod(req, res); if (!s) return;
    const b = await readJson(req);
    const ids = Array.isArray(b.ids) ? b.ids.map(Number).filter(Number.isInteger) : [];
    if (!ids.length) return fail(res, 400, 'Нужен список фото');
    // порядок — позиция в списке; чужие id (не этой комнаты) молча пропускаем
    for (let i = 0; i < ids.length; i++) {
      await query(`UPDATE room_photos SET sort = $1 WHERE id = $2 AND room_id = $3`, [i + 1, ids[i], req.params.id]);
    }
    await audit(s.uid, 'photo.order', 'room:' + req.params.id, { ids });
    json(res, 200, { ok: true });
  });

  route('DELETE', '/api/photos/:id', async (req, res) => {
    const s = mod(req, res); if (!s) return;
    const r = await query(`DELETE FROM room_photos WHERE id = $1 RETURNING url`, [Number(req.params.id) || 0]);
    if (!r.rows[0]) return fail(res, 404, 'Фото не найдено');
    // файл на диске тоже убираем — иначе загрузки копятся
    const file = path.join(UPLOAD_DIR, path.basename(r.rows[0].url));
    fs.unlink(file, () => {});
    await audit(s.uid, 'photo.delete', 'photo:' + req.params.id);
    json(res, 200, { ok: true });
  });
};
