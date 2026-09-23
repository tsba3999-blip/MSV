'use strict';

/* ============================================================
   Вход по пинкоду и сессии

   Пинкод: четыре цифры, живёт 10 минут, пять попыток. В базе
   хранится не сам код, а его хэш с солью. Пространство кодов
   маленькое, поэтому хэш защищает слабо — защиту дают срок
   и предел попыток.

   Сессия: подписанная cookie без состояния на сервере. Внутри —
   id пользователя, роль и срок. Подпись HMAC на SESSION_SECRET;
   подделать без секрета нельзя, а прочитать — можно, поэтому
   ничего лишнего туда не кладём.
   ============================================================ */

const crypto = require('crypto');
const { config, query } = require('./db');

const COOKIE = 'msv_session';

/* ---------- Контакт: почта или телефон ---------- */

function normalizeContact(raw) {
  const v = String(raw || '').trim();
  if (!v) return null;
  if (v.includes('@')) {
    return /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/.test(v) ? { kind: 'email', value: v.toLowerCase() } : null;
  }
  const d = v.replace(/\D/g, '');
  if (d.length === 11 && (d[0] === '7' || d[0] === '8')) return { kind: 'phone', value: '+7' + d.slice(1) };
  if (d.length === 10) return { kind: 'phone', value: '+7' + d };
  return null;
}

/* ---------- Пинкод ---------- */

function newPin() {
  // crypto, а не Math.random: код должен быть непредсказуем
  return String(crypto.randomInt(0, 10000)).padStart(4, '0');
}

function hashPin(pin, userId) {
  return crypto.createHmac('sha256', config.sessionSecret)
    .update(`${userId}:${pin}`).digest('hex');
}

async function findUser(contact) {
  const col = contact.kind === 'email' ? 'email' : 'phone';
  const r = await query(
    `SELECT id, role, name, is_active FROM users WHERE ${col} = $1 LIMIT 1`, [contact.value]);
  return r.rows[0] || null;
}

/* Сколько промахов до блокировки и на сколько блокировать */
const MAX_ATTEMPTS = 3;
const LOCK_MINUTES = 30;

/* Запросить код. В новой модели код не рассылается — его выдаёт
   модератор при приглашении. Этот вызов оставлен для совместимости
   и для будущего смс-канала: сейчас просто отвечает «ок». */
async function requestPin(rawContact) {
  const contact = normalizeContact(rawContact);
  if (!contact) return { ok: false, error: 'Проверь запись: почта вида ivan@mail.ru или телефон из 11 цифр.' };
  return { ok: true };
}

/* Блокировка для контактов, которых нет в базе: посторонний
   перебирает коды — после трёх промахов телефон закрыт на полчаса. */
async function strangerAttempt(contact) {
  const r = await query(
    `INSERT INTO login_attempts (contact, attempts, updated_at) VALUES ($1, 1, now())
     ON CONFLICT (contact) DO UPDATE SET
       attempts = CASE WHEN login_attempts.locked_until IS NOT NULL AND login_attempts.locked_until < now()
                       THEN 1 ELSE login_attempts.attempts + 1 END,
       locked_until = CASE WHEN login_attempts.attempts + 1 >= $2
                           THEN now() + ($3 || ' minutes')::interval ELSE login_attempts.locked_until END,
       updated_at = now()
     RETURNING attempts, locked_until`,
    [contact.value, MAX_ATTEMPTS, String(LOCK_MINUTES)]);
  return r.rows[0];
}

async function strangerLocked(contact) {
  const r = await query(`SELECT locked_until FROM login_attempts WHERE contact = $1`, [contact.value]);
  const row = r.rows[0];
  return !!(row && row.locked_until && new Date(row.locked_until) > new Date());
}

/* Проверить пин. Один ответ на все неудачи — «код не подошёл»:
   по тексту нельзя понять, существует ли контакт. */
async function verifyPin(rawContact, rawPin) {
  const contact = normalizeContact(rawContact);
  const pin = String(rawPin || '').replace(/\D/g, '');
  if (!contact || pin.length !== 4) return { ok: false, error: 'Код — четыре цифры.' };

  const locked = 'Слишком много попыток. Вход с этого номера закрыт на ' + LOCK_MINUTES + ' минут.';

  const user = await findUser(contact);

  if (!user || !user.is_active) {
    if (await strangerLocked(contact)) return { ok: false, error: locked };
    const a = await strangerAttempt(contact);
    if (a.locked_until && new Date(a.locked_until) > new Date()) return { ok: false, error: locked };
    return { ok: false, error: 'Код не подошёл.' };
  }

  const r = await query(
    `SELECT pin_hash, pin_expires, pin_attempts, locked_until, first_login FROM users WHERE id = $1`, [user.id]);
  const row = r.rows[0];

  if (row.locked_until && new Date(row.locked_until) > new Date()) return { ok: false, error: locked };

  // ВРЕМЕННО: демо-код открывает вход любому существующему пользователю.
  if (config.demoMode && pin === config.demoPin) {
    await afterLogin(user.id, row.first_login);
    return { ok: true, user, firstLogin: !row.first_login };
  }

  if (!row.pin_hash) return { ok: false, error: 'Код не подошёл.' };
  // Одноразовый код (если выдан) — со сроком; постоянный — без
  if (row.pin_expires && new Date(row.pin_expires) < new Date()) return { ok: false, error: 'Код устарел.' };

  const good = crypto.timingSafeEqual(
    Buffer.from(row.pin_hash, 'hex'), Buffer.from(hashPin(pin, user.id), 'hex'));

  if (!good) {
    const upd = await query(
      `UPDATE users SET pin_attempts = pin_attempts + 1,
         locked_until = CASE WHEN pin_attempts + 1 >= $2 THEN now() + ($3 || ' minutes')::interval ELSE locked_until END
       WHERE id = $1 RETURNING pin_attempts, locked_until`,
      [user.id, MAX_ATTEMPTS, String(LOCK_MINUTES)]);
    const u = upd.rows[0];
    if (u.locked_until && new Date(u.locked_until) > new Date()) return { ok: false, error: locked };
    return { ok: false, error: 'Код не подошёл. Осталось попыток: ' + (MAX_ATTEMPTS - u.pin_attempts) };
  }

  await afterLogin(user.id, row.first_login);
  return { ok: true, user, firstLogin: !row.first_login };
}

/* ВРЕМЕННО, только в DEMO_MODE: открытый вход по роли, без кода.
   Кнопка на первой странице сразу открывает кабинет под первой
   учётной записью этой роли. Когда DEMO_MODE=0 — отвечает отказом,
   и остаётся обычный вход по коду. */
async function demoLogin(rawRole) {
  if (!config.demoMode) return { ok: false, error: 'Открытый вход выключен' };
  const role = String(rawRole || '');
  if (!RANK.hasOwnProperty(role)) return { ok: false, error: 'Неизвестная роль' };
  const r = await query(
    `SELECT id, role, name FROM users WHERE role = $1 AND is_active ORDER BY id LIMIT 1`, [role]);
  const user = r.rows[0];
  if (!user) return { ok: false, error: 'В базе нет ни одной учётной записи с ролью ' + role };
  return { ok: true, user };
}

async function afterLogin(userId, firstLogin) {
  await query(
    `UPDATE users SET pin_attempts = 0, locked_until = NULL,
       first_login = COALESCE(first_login, now()) WHERE id = $1`, [userId]);
}

/* Постоянный пин: задаёт модератор при приглашении или сам резидент
   в кабинете. Четыре цифры, не «0000» и не «1234» — слишком очевидны. */
function validPin(pin) {
  const p = String(pin || '');
  if (!/^\d{4}$/.test(p)) return 'Код — четыре цифры';
  if (/^(\d)\1{3}$/.test(p)) return 'Четыре одинаковые цифры — слишком просто';
  if (p === '1234' || p === '4321' || p === '0000') return 'Слишком простой код';
  return null;
}

/* Смена кода: сначала подтверждаем действующий (решение заказчика 22.09.2026).
   current обязателен, если код уже установлен: иначе чужой человек за
   разблокированным телефоном сменил бы код в два касания. */
async function setPin(userId, pin, current) {
  const bad = validPin(pin);
  if (bad) return { ok: false, error: bad };
  const cur = await query(`SELECT pin_hash FROM users WHERE id = $1`, [userId]);
  const row = cur.rows[0];
  if (row && row.pin_hash) {
    if (!/^\d{4}$/.test(String(current || ""))) return { ok: false, error: "Введи действующий код" };
    const same = crypto.timingSafeEqual(Buffer.from(row.pin_hash, "hex"), Buffer.from(hashPin(current, userId), "hex"));
    if (!same) return { ok: false, error: "Действующий код не подошёл" };
  }
  await query(`UPDATE users SET pin_hash = $1, pin_expires = NULL, pin_attempts = 0 WHERE id = $2`,
    [hashPin(pin, userId), userId]);
  return { ok: true };
}

/* Приглашение: модератор создаёт учётную запись и выдаёт код. */
async function invite(actorId, rawContact, name, pin) {
  const contact = normalizeContact(rawContact);
  if (!contact) return { ok: false, error: 'Нужен телефон или почта' };
  const bad = validPin(pin);
  if (bad) return { ok: false, error: bad };
  if (!String(name || '').trim()) return { ok: false, error: 'Укажи имя' };

  const exists = await findUser(contact);
  if (exists) return { ok: false, error: 'Такой контакт уже зарегистрирован' };

  const col = contact.kind === 'email' ? 'email' : 'phone';
  const r = await query(
    `INSERT INTO users (role, name, ${col}, invited_by, invited_at) VALUES ('resident', $1, $2, $3, now()) RETURNING id`,
    [String(name).trim(), contact.value, actorId]);
  const id = r.rows[0].id;
  await query(`UPDATE users SET pin_hash = $1 WHERE id = $2`, [hashPin(pin, id), id]);
  await query(`INSERT INTO audit_log (actor_id, action, target, payload) VALUES ($1, 'user.invite', $2, $3)`,
    [actorId, 'user:' + id, JSON.stringify({ contact: contact.value, name })]);
  return { ok: true, id };
}

/* ---------- Сессия в cookie ---------- */

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', config.sessionSecret).update(body).digest('base64url');
  return `${body}.${mac}`;
}

function verify(token) {
  if (!token || typeof token !== 'string') return null;
  const i = token.lastIndexOf('.');
  if (i < 0) return null;
  const body = token.slice(0, i), mac = token.slice(i + 1);
  const expect = crypto.createHmac('sha256', config.sessionSecret).update(body).digest('base64url');
  if (mac.length !== expect.length ||
      !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expect))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!p.uid || !p.role || !p.exp || p.exp < Date.now()) return null;
    return p;
  } catch (e) { return null; }
}

function sessionCookie(user) {
  const exp = Date.now() + config.sessionDays * 86400000;
  const token = sign({ uid: user.id, role: user.role, exp });
  // HttpOnly — скрипту на странице cookie не видна; SameSite — не уходит на чужие сайты
  return `${COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${config.sessionDays * 86400}`;
}

function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}

function readSession(req) {
  const raw = req.headers.cookie || '';
  const m = raw.match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([^;]+)'));
  return m ? verify(m[1]) : null;
}

/* ---------- Роли ---------- */

const RANK = { resident: 0, staff: 1, moderator: 2, admin: 3 };

function atLeast(session, role) {
  return !!session && (RANK[session.role] || 0) >= (RANK[role] || 0);
}

module.exports = {
  normalizeContact, requestPin, verifyPin, demoLogin, setPin, invite, validPin,
  sessionCookie, clearCookie, readSession, atLeast,
  _internal: { sign, verify, hashPin, newPin }
};
