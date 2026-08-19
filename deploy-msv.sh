#!/usr/bin/env bash
# ============================================================================
#  МСВ — полное развёртывание на VPS Timeweb (Ubuntu 22.04 / 24.04)
#  Устанавливает: Node.js 20, PostgreSQL, nginx, systemd-сервис msv
#  Использование:
#     cat > /root/deploy-msv.sh   (вставить содержимое, затем Ctrl+D)
#     bash /root/deploy-msv.sh
# ============================================================================
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

echo "==> [1/8] Установка пакетов (nginx, PostgreSQL, утилиты)..."
apt-get update -y
apt-get install -y nginx postgresql postgresql-contrib curl openssl ca-certificates gnupg

echo "==> [2/8] Установка Node.js 20 (если нет node >= 18)..."
NEED_NODE=1
if command -v node >/dev/null 2>&1; then
  MAJOR=$(node -p 'process.versions.node.split(".")[0]')
  [ "$MAJOR" -ge 18 ] && NEED_NODE=0
fi
if [ "$NEED_NODE" = "1" ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "    Node: $(node --version)"

echo "==> [3/8] Пользователь и каталог проекта..."
id -u msv >/dev/null 2>&1 || useradd --system --home /opt/msv --shell /usr/sbin/nologin msv
mkdir -p /opt/msv/data /opt/msv/assets

echo "    записываю server.js"
cat > /opt/msv/server.js << 'MSV_FILE_END'
// МСВ — сервер платформы (PostgreSQL-версия)
// API полностью совместим с прежней JSON-версией: app.js менять не нужно.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool, types } = require('pg');

// BIGINT (oid 20) отдаём числом: id проекта — Date.now(), это заведомо меньше Number.MAX_SAFE_INTEGER,
// а фронтенд сравнивает id строгим === с числами.
types.setTypeParser(20, v => (v === null ? null : Number(v)));

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 3031);
const HOST = process.env.HOST || '127.0.0.1';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://msv:msv@127.0.0.1:5432/msv'
});

// ---------- пароли ----------
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}
function verifyPassword(password, stored) {
  const [salt, key] = String(stored || '').split(':');
  if (!salt || !key) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(key, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

// ---------- helpers ----------
function json(res, status, data, headers = {}) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(JSON.stringify(data));
}
function parseCookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').map(x => x.trim()).filter(Boolean).map(x => {
    const i = x.indexOf('='); return [x.slice(0, i), decodeURIComponent(x.slice(i + 1))];
  }));
}
async function body(req) {
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > 1e6) throw new Error('Слишком большой запрос'); }
  return raw ? JSON.parse(raw) : {};
}
const SESSION_TTL = 7 * 864e5;

// ---------- SQL: маппинг строк в формат фронтенда ----------
const USER_COLS = `id, name, email, phone, university, role, created_at AS "createdAt"`;
const ROOM_COLS = `id, hostel, address, type, places, price, gender, active, image`;
const BOOKING_COLS = `id, user_id AS "userId", room_id AS "roomId", from_date AS "from", to_date AS "to", status, created`;
const BED_COLS = `id, room_id AS "roomId", number, place, status, user_id AS "userId"`;
const CHARGE_COLS = `id, user_id AS "userId", booking_id AS "bookingId", title, period, amount, status, due_date AS "dueDate", created_at AS "createdAt"`;
const PAYMENT_COLS = `id, charge_id AS "chargeId", user_id AS "userId", amount, status, provider, order_id AS "orderId", created_at AS "createdAt", confirmed_at AS "confirmedAt"`;
const TICKET_COLS = `id, user_id AS "userId", type, subject, message, status, answer, created_at AS "createdAt", updated_at AS "updatedAt"`;

async function q(text, params) { return (await pool.query(text, params)).rows; }
async function one(text, params) { return (await pool.query(text, params)).rows[0] || null; }

async function currentUser(req) {
  const sid = parseCookies(req).msv_session;
  if (!sid) return null;
  const s = await one(`SELECT user_id, expires FROM sessions WHERE sid=$1`, [sid]);
  if (!s) return null;
  if (Number(s.expires) < Date.now()) { await q(`DELETE FROM sessions WHERE sid=$1`, [sid]); return null; }
  return one(`SELECT ${USER_COLS}, password_hash FROM users WHERE id=$1`, [s.user_id]);
}
function publicUser(u) { if (!u) return null; const { password_hash, ...safe } = u; return safe; }
async function requireUser(req, res, role) {
  const u = await currentUser(req);
  if (!u) { json(res, 401, { error: 'Требуется вход' }); return null; }
  if (role && u.role !== role) { json(res, 403, { error: 'Недостаточно прав' }); return null; }
  return u;
}
async function createSession(res, userId, status, payload) {
  const sid = crypto.randomBytes(32).toString('hex');
  await q(`INSERT INTO sessions(sid, user_id, expires) VALUES($1,$2,$3)`, [sid, userId, Date.now() + SESSION_TTL]);
  json(res, status, payload, { 'Set-Cookie': `msv_session=${sid}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800` });
}
async function audit(user, action, entity, entityId) {
  await q(`INSERT INTO audit(id, user_id, action, entity, entity_id, created_at) VALUES($1,$2,$3,$4,$5,now())`,
    [Date.now(), user.id, action, entity, entityId]);
  await q(`DELETE FROM audit WHERE id NOT IN (SELECT id FROM audit ORDER BY created_at DESC LIMIT 1000)`);
}
const newId = () => Date.now() + Math.floor(Math.random() * 100); // защита от коллизий в одну миллисекунду

// ---------- API ----------
async function api(req, res, url) {
  // --- auth ---
  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    const b = await body(req);
    const u = await one(`SELECT ${USER_COLS}, password_hash FROM users WHERE lower(email)=lower($1)`, [String(b.email || '')]);
    if (!u || !verifyPassword(String(b.password || ''), u.password_hash)) return json(res, 401, { error: 'Неверная почта или пароль' });
    return createSession(res, u.id, 200, { user: publicUser(u) });
  }
  if (req.method === 'POST' && url.pathname === '/api/auth/register') {
    const b = await body(req);
    if (!b.name || !b.email || String(b.password || '').length < 6) return json(res, 400, { error: 'Заполните обязательные поля; пароль — минимум 6 символов' });
    const exists = await one(`SELECT 1 FROM users WHERE lower(email)=lower($1)`, [String(b.email)]);
    if (exists) return json(res, 409, { error: 'Пользователь уже зарегистрирован' });
    const u = await one(
      `INSERT INTO users(id, name, email, phone, password_hash, role, created_at) VALUES($1,$2,$3,$4,$5,'client',now()) RETURNING ${USER_COLS}`,
      [newId(), String(b.name).trim(), String(b.email).trim(), String(b.phone || '').trim(), hashPassword(String(b.password))]);
    return createSession(res, u.id, 201, { user: u });
  }
  if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
    const sid = parseCookies(req).msv_session;
    if (sid) await q(`DELETE FROM sessions WHERE sid=$1`, [sid]);
    return json(res, 200, { ok: true }, { 'Set-Cookie': 'msv_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' });
  }
  if (req.method === 'GET' && url.pathname === '/api/auth/me') return json(res, 200, { user: publicUser(await currentUser(req)) });

  // --- bootstrap ---
  if (req.method === 'GET' && url.pathname === '/api/bootstrap') {
    const u = await requireUser(req, res); if (!u) return;
    const admin = u.role === 'admin';
    const [rooms, bookings, users, beds, charges, payments, tickets] = await Promise.all([
      q(`SELECT ${ROOM_COLS} FROM rooms ORDER BY id`),
      admin ? q(`SELECT ${BOOKING_COLS} FROM bookings ORDER BY id`) : q(`SELECT ${BOOKING_COLS} FROM bookings WHERE user_id=$1 ORDER BY id`, [u.id]),
      admin ? q(`SELECT ${USER_COLS} FROM users ORDER BY id`) : Promise.resolve([]),
      admin ? q(`SELECT ${BED_COLS} FROM beds ORDER BY id`) : q(`SELECT ${BED_COLS} FROM beds WHERE user_id=$1 ORDER BY id`, [u.id]),
      admin ? q(`SELECT ${CHARGE_COLS} FROM charges ORDER BY id`) : q(`SELECT ${CHARGE_COLS} FROM charges WHERE user_id=$1 ORDER BY id`, [u.id]),
      admin ? q(`SELECT ${PAYMENT_COLS} FROM payments ORDER BY id`) : q(`SELECT ${PAYMENT_COLS} FROM payments WHERE user_id=$1 ORDER BY id`, [u.id]),
      admin ? q(`SELECT ${TICKET_COLS} FROM tickets ORDER BY created_at DESC`) : q(`SELECT ${TICKET_COLS} FROM tickets WHERE user_id=$1 ORDER BY created_at DESC`, [u.id])
    ]);
    return json(res, 200, { user: publicUser(u), rooms, bookings, users, beds, charges, payments, tickets });
  }

  // --- bookings ---
  if (req.method === 'POST' && url.pathname === '/api/bookings') {
    const u = await requireUser(req, res); if (!u) return;
    const b = await body(req);
    const room = await one(`SELECT id FROM rooms WHERE id=$1 AND active=true`, [Number(b.roomId)]);
    if (!room) return json(res, 404, { error: 'Общежитие не найдено' });
    const booking = await one(
      `INSERT INTO bookings(id, user_id, room_id, from_date, to_date, status, created) VALUES($1,$2,$3,$4,$5,'На рассмотрении',$6) RETURNING ${BOOKING_COLS}`,
      [newId(), u.id, room.id, b.from || null, b.to || null, new Date().toLocaleDateString('ru-RU')]);
    await audit(u, 'create', 'booking', booking.id);
    return json(res, 201, { booking });
  }
  const bookingMatch = url.pathname.match(/^\/api\/bookings\/(\d+)$/);
  if (req.method === 'PATCH' && bookingMatch) {
    const u = await requireUser(req, res, 'admin'); if (!u) return;
    const b = await body(req);
    if (!['На рассмотрении', 'Подтверждено', 'Отклонено'].includes(b.status)) return json(res, 400, { error: 'Недопустимый статус' });
    const booking = await one(`UPDATE bookings SET status=$1 WHERE id=$2 RETURNING ${BOOKING_COLS}`, [b.status, Number(bookingMatch[1])]);
    if (!booking) return json(res, 404, { error: 'Заявка не найдена' });
    await audit(u, 'update', 'booking', booking.id);
    return json(res, 200, { booking });
  }

  // --- rooms ---
  if (req.method === 'POST' && url.pathname === '/api/rooms') {
    const u = await requireUser(req, res, 'admin'); if (!u) return;
    const b = await body(req);
    if (!b.hostel || !b.address) return json(res, 400, { error: 'Укажите название и адрес' });
    const room = await one(
      `INSERT INTO rooms(id, hostel, address, type, places, price, gender, active, image) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'') RETURNING ${ROOM_COLS}`,
      [newId(), String(b.hostel), String(b.address), String(b.type || 'Место в общей комнате'), Number(b.places || 0), Number(b.price || 0), String(b.gender || 'Любой'), b.active !== false]);
    await audit(u, 'create', 'room', room.id);
    return json(res, 201, { room });
  }
  const roomMatch = url.pathname.match(/^\/api\/rooms\/(\d+)$/);
  if (req.method === 'PATCH' && roomMatch) {
    const u = await requireUser(req, res, 'admin'); if (!u) return;
    const b = await body(req);
    const room = await one(`SELECT ${ROOM_COLS} FROM rooms WHERE id=$1`, [Number(roomMatch[1])]);
    if (!room) return json(res, 404, { error: 'Общежитие не найдено' });
    for (const k of ['hostel', 'address', 'type', 'gender']) if (b[k] !== undefined) room[k] = String(b[k]);
    for (const k of ['places', 'price']) if (b[k] !== undefined) room[k] = Number(b[k]);
    if (b.active !== undefined) room.active = Boolean(b.active);
    const saved = await one(
      `UPDATE rooms SET hostel=$1,address=$2,type=$3,gender=$4,places=$5,price=$6,active=$7 WHERE id=$8 RETURNING ${ROOM_COLS}`,
      [room.hostel, room.address, room.type, room.gender, room.places, room.price, room.active, room.id]);
    await audit(u, 'update', 'room', room.id);
    return json(res, 200, { room: saved });
  }
  if (req.method === 'DELETE' && roomMatch) {
    const u = await requireUser(req, res, 'admin'); if (!u) return;
    const room = await one(`UPDATE rooms SET active=false WHERE id=$1 RETURNING id`, [Number(roomMatch[1])]);
    if (!room) return json(res, 404, { error: 'Общежитие не найдено' });
    await audit(u, 'archive', 'room', room.id);
    return json(res, 200, { ok: true });
  }

  // --- profile ---
  if (req.method === 'PATCH' && url.pathname === '/api/profile') {
    const u = await requireUser(req, res); if (!u) return;
    const b = await body(req);
    const vals = {
      name: b.name !== undefined ? String(b.name) : u.name,
      phone: b.phone !== undefined ? String(b.phone) : u.phone,
      university: b.university !== undefined ? String(b.university) : u.university
    };
    const user = await one(`UPDATE users SET name=$1, phone=$2, university=$3 WHERE id=$4 RETURNING ${USER_COLS}`,
      [vals.name, vals.phone, vals.university, u.id]);
    return json(res, 200, { user });
  }

  // --- beds ---
  if (req.method === 'POST' && url.pathname === '/api/beds') {
    const u = await requireUser(req, res, 'admin'); if (!u) return;
    const b = await body(req);
    const room = await one(`SELECT id FROM rooms WHERE id=$1`, [Number(b.roomId)]);
    if (!room) return json(res, 404, { error: 'Объект не найден' });
    const bed = await one(
      `INSERT INTO beds(id, room_id, number, place, status, user_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING ${BED_COLS}`,
      [newId(), room.id, String(b.number || ''), String(b.place || 'Нижнее'), String(b.status || 'Свободно'), b.userId ? Number(b.userId) : null]);
    await audit(u, 'create', 'bed', bed.id);
    return json(res, 201, { bed });
  }
  const bedMatch = url.pathname.match(/^\/api\/beds\/(\d+)$/);
  if (req.method === 'PATCH' && bedMatch) {
    const u = await requireUser(req, res, 'admin'); if (!u) return;
    const b = await body(req);
    const bed = await one(`SELECT ${BED_COLS} FROM beds WHERE id=$1`, [Number(bedMatch[1])]);
    if (!bed) return json(res, 404, { error: 'Место не найдено' });
    for (const k of ['number', 'place', 'status']) if (b[k] !== undefined) bed[k] = String(b[k]);
    if (b.roomId !== undefined) bed.roomId = Number(b.roomId);
    if (b.userId !== undefined) bed.userId = b.userId ? Number(b.userId) : null;
    const saved = await one(`UPDATE beds SET number=$1, place=$2, status=$3, room_id=$4, user_id=$5 WHERE id=$6 RETURNING ${BED_COLS}`,
      [bed.number, bed.place, bed.status, bed.roomId, bed.userId, bed.id]);
    await audit(u, 'update', 'bed', bed.id);
    return json(res, 200, { bed: saved });
  }

  // --- charges ---
  if (req.method === 'POST' && url.pathname === '/api/charges') {
    const u = await requireUser(req, res, 'admin'); if (!u) return;
    const b = await body(req);
    const client = await one(`SELECT id FROM users WHERE id=$1`, [Number(b.userId)]);
    if (!client) return json(res, 404, { error: 'Клиент не найден' });
    const charge = await one(
      `INSERT INTO charges(id, user_id, booking_id, title, period, amount, status, due_date, created_at) VALUES($1,$2,$3,$4,$5,$6,'Ожидает оплаты',$7,now()) RETURNING ${CHARGE_COLS}`,
      [newId(), client.id, b.bookingId ? Number(b.bookingId) : null, String(b.title || 'Проживание в общежитии'), String(b.period || ''), Number(b.amount || 0), String(b.dueDate || '')]);
    await audit(u, 'create', 'charge', charge.id);
    return json(res, 201, { charge });
  }

  // --- tickets ---
  if (req.method === 'POST' && url.pathname === '/api/tickets') {
    const u = await requireUser(req, res); if (!u) return;
    const b = await body(req);
    const ticket = await one(
      `INSERT INTO tickets(id, user_id, type, subject, message, status, created_at) VALUES($1,$2,$3,$4,$5,'Новое',now()) RETURNING ${TICKET_COLS}`,
      [newId(), u.id, String(b.type || 'Обращение'), String(b.subject || ''), String(b.message || '')]);
    await audit(u, 'create', 'ticket', ticket.id);
    return json(res, 201, { ticket });
  }
  const ticketMatch = url.pathname.match(/^\/api\/tickets\/(\d+)$/);
  if (req.method === 'PATCH' && ticketMatch) {
    const u = await requireUser(req, res, 'admin'); if (!u) return;
    const b = await body(req);
    const ticket = await one(`SELECT ${TICKET_COLS} FROM tickets WHERE id=$1`, [Number(ticketMatch[1])]);
    if (!ticket) return json(res, 404, { error: 'Обращение не найдено' });
    if (b.status !== undefined) ticket.status = String(b.status);
    if (b.answer !== undefined) ticket.answer = String(b.answer);
    const saved = await one(`UPDATE tickets SET status=$1, answer=$2, updated_at=now() WHERE id=$3 RETURNING ${TICKET_COLS}`,
      [ticket.status, ticket.answer, ticket.id]);
    await audit(u, 'update', 'ticket', ticket.id);
    return json(res, 200, { ticket: saved });
  }

  // --- payments ---
  if (req.method === 'POST' && url.pathname === '/api/payments/init') {
    const u = await requireUser(req, res); if (!u) return;
    const b = await body(req);
    const charge = await one(`SELECT ${CHARGE_COLS} FROM charges WHERE id=$1 AND user_id=$2`, [Number(b.chargeId), u.id]);
    if (!charge) return json(res, 404, { error: 'Начисление не найдено' });
    if (charge.status === 'Оплачено') return json(res, 409, { error: 'Начисление уже оплачено' });
    const provider = process.env.TBANK_TERMINAL_KEY ? 'tbank' : 'sandbox';
    const payment = await one(
      `INSERT INTO payments(id, charge_id, user_id, amount, status, provider, order_id, created_at) VALUES($1,$2,$3,$4,'NEW',$5,$6,now()) RETURNING ${PAYMENT_COLS}`,
      [newId(), charge.id, u.id, charge.amount, provider, `MSV-${charge.id}-${Date.now()}`]);
    if (process.env.TBANK_TERMINAL_KEY) return json(res, 503, { error: 'Боевой терминал указан, но запрос к банку будет включён после настройки NotificationURL' });
    return json(res, 201, { payment, paymentUrl: `/payment-sandbox.html?id=${payment.id}` });
  }
  const paymentMatch = url.pathname.match(/^\/api\/payments\/(\d+)\/simulate$/);
  if (req.method === 'POST' && paymentMatch) {
    const u = await requireUser(req, res); if (!u) return;
    const payment = await one(`UPDATE payments SET status='CONFIRMED', confirmed_at=now() WHERE id=$1 AND user_id=$2 RETURNING ${PAYMENT_COLS}`,
      [Number(paymentMatch[1]), u.id]);
    if (!payment) return json(res, 404, { error: 'Платёж не найден' });
    await q(`UPDATE charges SET status='Оплачено' WHERE id=$1`, [payment.chargeId]);
    return json(res, 200, { payment });
  }

  return json(res, 404, { error: 'Маршрут не найден' });
}

// ---------- статика ----------
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.json': 'application/json; charset=utf-8' };
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname.startsWith('/api/')) return await api(req, res, url);
    let rel = decodeURIComponent(url.pathname) === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
    const file = path.resolve(ROOT, rel);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': mime[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  } catch (e) { console.error(e); json(res, 500, { error: 'Внутренняя ошибка сервера' }); }
});

// чистка просроченных сессий раз в час
setInterval(() => q(`DELETE FROM sessions WHERE expires < $1`, [Date.now()]).catch(() => {}), 36e5).unref();

server.listen(PORT, HOST, () => console.log(`MSV server: http://${HOST}:${PORT}`));
MSV_FILE_END

echo "    записываю init-db.js"
cat > /opt/msv/init-db.js << 'MSV_FILE_END'
// МСВ — инициализация базы PostgreSQL: схема + стартовые данные.
// Если рядом лежит data/store.json (старая JSON-база) — импортирует данные из него.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://msv:msv@127.0.0.1:5432/msv'
});

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT DEFAULT '',
  university TEXT DEFAULT '',
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'client',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS rooms (
  id BIGINT PRIMARY KEY,
  hostel TEXT NOT NULL,
  address TEXT NOT NULL,
  type TEXT DEFAULT 'Место в общей комнате',
  places INT DEFAULT 0,
  price INT DEFAULT 0,
  gender TEXT DEFAULT 'Любой',
  active BOOLEAN DEFAULT true,
  image TEXT DEFAULT ''
);
CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  room_id BIGINT REFERENCES rooms(id),
  from_date TEXT,
  to_date TEXT,
  status TEXT DEFAULT 'На рассмотрении',
  created TEXT
);
CREATE TABLE IF NOT EXISTS beds (
  id BIGINT PRIMARY KEY,
  room_id BIGINT REFERENCES rooms(id),
  number TEXT DEFAULT '',
  place TEXT DEFAULT 'Нижнее',
  status TEXT DEFAULT 'Свободно',
  user_id BIGINT REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS charges (
  id BIGINT PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  booking_id BIGINT,
  title TEXT DEFAULT 'Проживание в общежитии',
  period TEXT DEFAULT '',
  amount INT DEFAULT 0,
  status TEXT DEFAULT 'Ожидает оплаты',
  due_date TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS payments (
  id BIGINT PRIMARY KEY,
  charge_id BIGINT REFERENCES charges(id),
  user_id BIGINT REFERENCES users(id),
  amount INT DEFAULT 0,
  status TEXT DEFAULT 'NEW',
  provider TEXT DEFAULT 'sandbox',
  order_id TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS tickets (
  id BIGINT PRIMARY KEY,
  user_id BIGINT REFERENCES users(id),
  type TEXT DEFAULT 'Обращение',
  subject TEXT DEFAULT '',
  message TEXT DEFAULT '',
  status TEXT DEFAULT 'Новое',
  answer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS audit (
  id BIGINT PRIMARY KEY,
  user_id BIGINT,
  action TEXT,
  entity TEXT,
  entity_id BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
  sid TEXT PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  expires BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_charges_user ON charges(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_user ON tickets(user_id);
`;

const seedRooms = [
  { id: 1, hostel: 'МСВ Шаболовская', address: 'Москва, Конный пер., 12 (м. Шаболовская)', type: 'Место в общей комнате', places: 4, price: 20000, gender: 'Любой', active: true, image: '/assets/source-site/001-fd2dfed-Frame-5.png' },
  { id: 2, hostel: 'Уют на Варшавке', address: 'Москва, Варшавское шоссе, 18к2 (м. Нагатинская)', type: 'Место в общей комнате', places: 3, price: 18000, gender: 'Любой', active: true, image: '/assets/source-site/002-3bb02eb-Frame-4.png' },
  { id: 3, hostel: 'МСВ Молодёжная', address: 'Москва, ул. Партизанская, 40 (м. Молодёжная)', type: 'Место в общей комнате', places: 2, price: 20000, gender: 'Любой', active: true, image: '/assets/source-site/003-0afcdf6-444.png' }
];

async function main() {
  await pool.query(SCHEMA);
  const { rows } = await pool.query('SELECT count(*)::int AS n FROM users');
  if (rows[0].n > 0) { console.log('База уже инициализирована — пропускаю сид.'); await pool.end(); return; }

  const storePath = path.join(__dirname, 'data', 'store.json');
  let store = null;
  if (fs.existsSync(storePath)) {
    try { store = JSON.parse(fs.readFileSync(storePath, 'utf8')); console.log('Найден data/store.json — импортирую данные из старой JSON-базы.'); }
    catch (e) { console.log('store.json повреждён, использую стартовые данные:', e.message); }
  }

  const adminPassword = process.env.MSV_ADMIN_PASSWORD || 'admin';

  if (store && Array.isArray(store.users) && store.users.length) {
    for (const u of store.users) {
      await pool.query(`INSERT INTO users(id,name,email,phone,university,password_hash,role,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (id) DO NOTHING`,
        [u.id, u.name, u.email, u.phone || '', u.university || '', u.passwordHash || hashPassword(u.password || 'changeme'), u.role || 'client', u.createdAt || new Date().toISOString()]);
    }
    for (const r of (store.rooms || [])) {
      await pool.query(`INSERT INTO rooms(id,hostel,address,type,places,price,gender,active,image) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
        [r.id, r.hostel, r.address, r.type || '', r.places || 0, r.price || 0, r.gender || 'Любой', r.active !== false, r.image || '']);
    }
    for (const b of (store.bookings || [])) {
      await pool.query(`INSERT INTO bookings(id,user_id,room_id,from_date,to_date,status,created) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [b.id, b.userId, b.roomId, b.from || null, b.to || null, b.status || 'На рассмотрении', b.created || '']);
    }
    for (const b of (store.beds || [])) {
      await pool.query(`INSERT INTO beds(id,room_id,number,place,status,user_id) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT (id) DO NOTHING`,
        [b.id, b.roomId, String(b.number || ''), b.place || 'Нижнее', b.status || 'Свободно', b.userId || null]);
    }
    for (const c of (store.charges || [])) {
      await pool.query(`INSERT INTO charges(id,user_id,booking_id,title,period,amount,status,due_date,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
        [c.id, c.userId, c.bookingId || null, c.title || '', c.period || '', c.amount || 0, c.status || 'Ожидает оплаты', c.dueDate || '', c.createdAt || new Date().toISOString()]);
    }
    for (const p of (store.payments || [])) {
      await pool.query(`INSERT INTO payments(id,charge_id,user_id,amount,status,provider,order_id,created_at,confirmed_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
        [p.id, p.chargeId, p.userId, p.amount || 0, p.status || 'NEW', p.provider || 'sandbox', p.orderId || '', p.createdAt || new Date().toISOString(), p.confirmedAt || null]);
    }
    for (const t of (store.tickets || [])) {
      await pool.query(`INSERT INTO tickets(id,user_id,type,subject,message,status,answer,created_at,updated_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) ON CONFLICT (id) DO NOTHING`,
        [t.id, t.userId, t.type || 'Обращение', t.subject || '', t.message || '', t.status || 'Новое', t.answer || null, t.createdAt || new Date().toISOString(), t.updatedAt || null]);
    }
    console.log('Импорт из store.json завершён.');
    if (process.env.MSV_ADMIN_PASSWORD) {
      await pool.query(`UPDATE users SET password_hash=$1 WHERE role='admin'`, [hashPassword(process.env.MSV_ADMIN_PASSWORD)]);
      console.log('Пароль администратора обновлён из MSV_ADMIN_PASSWORD.');
    }
  } else {
    await pool.query(`INSERT INTO users(id,name,email,phone,password_hash,role) VALUES
      (1,'Тестовый клиент','ts@tsba.ru','+7 999 555-22-22',$1,'client'),
      (2,'Администратор МСВ','admin@msv.ru','+7 926 127-39-99',$2,'admin')`,
      [hashPassword('555222'), hashPassword(adminPassword)]);
    for (const r of seedRooms) {
      await pool.query(`INSERT INTO rooms(id,hostel,address,type,places,price,gender,active,image) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [r.id, r.hostel, r.address, r.type, r.places, r.price, r.gender, r.active, r.image]);
    }
    await pool.query(`INSERT INTO bookings(id,user_id,room_id,from_date,to_date,status,created) VALUES(1001,1,1,'2026-08-01','2027-06-30','Подтверждено','12.07.2026')`);
    await pool.query(`INSERT INTO beds(id,room_id,number,place,status,user_id) VALUES
      (101,1,'2','Верхнее','Занято',1),(102,1,'2','Нижнее','Свободно',NULL),
      (201,2,'5','Верхнее','Свободно',NULL),(301,3,'3','Нижнее','Свободно',NULL)`);
    await pool.query(`INSERT INTO charges(id,user_id,booking_id,title,period,amount,status,due_date) VALUES
      (5001,1,1001,'Проживание в общежитии','Август 2026',20000,'Ожидает оплаты','2026-08-05')`);
    console.log('Стартовые данные загружены.');
  }
  await pool.end();
  console.log('Инициализация БД завершена.');
}

main().catch(e => { console.error('Ошибка инициализации:', e); process.exit(1); });
MSV_FILE_END

echo "    записываю app.js"
cat > /opt/msv/app.js << 'MSV_FILE_END'
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const db={
  rooms:[
    {id:1,hostel:'МСВ Шаболовская',address:'Москва, Конный пер., 12 (м. Шаболовская)',type:'Место в общей комнате',places:4,price:20000,gender:'Любой'},
    {id:2,hostel:'Уют на Варшавке',address:'Москва, Варшавское шоссе, 18к2 (м. Нагатинская)',type:'Место в общей комнате',places:3,price:18000,gender:'Любой'},
    {id:3,hostel:'МСВ Молодёжная',address:'Москва, ул. Партизанская, 40 (м. Молодёжная)',type:'Место в общей комнате',places:2,price:20000,gender:'Любой'}
  ],
  users:JSON.parse(localStorage.getItem('msv_users')||'null')||[
    {id:1,name:'Тестовый клиент',email:'ts@tsba.ru',phone:'+7 999 555-22-22',password:'555222',role:'client'},
    {id:2,name:'Администратор МСВ',email:'admin@msv.ru',phone:'+7 926 127-39-99',password:'admin',role:'admin'}
  ],
  bookings:JSON.parse(localStorage.getItem('msv_bookings')||'null')||[
    {id:1001,userId:1,roomId:1,from:'2026-08-01',to:'2027-06-30',status:'Подтверждено',created:'12.07.2026'}
  ]
};
let session=null;let view='home';
async function api(url,options={}){const res=await fetch(url,{...options,headers:{'Content-Type':'application/json',...(options.headers||{})}});const data=await res.json().catch(()=>({}));if(!res.ok)throw new Error(data.error||'Ошибка сервера');return data}
async function refreshData(){const data=await api('/api/bootstrap');session={userId:data.user.id};db.users=data.users.length?data.users:[data.user];if(!db.users.some(u=>u.id===data.user.id))db.users.push(data.user);db.rooms=data.rooms;db.bookings=data.bookings;db.beds=data.beds||[];db.charges=data.charges||[];db.payments=data.payments||[];db.tickets=data.tickets||[];}
function save(){}
function money(n){return new Intl.NumberFormat('ru-RU').format(n)+' ₽';}
function toast(t){document.body.insertAdjacentHTML('beforeend',`<div class="toast">${t}</div>`);setTimeout(()=>$('.toast')?.remove(),2500)}
function render(){if(!session)return landing();dashboard()}
function landing(){
 $('#app').innerHTML=`<main class="public"><nav class="topbar"><div class="logo"><b class="logo-mark">М</b><span>МСВ</span></div><div class="nav-actions"><button class="btn btn-ghost" data-auth="register">Регистрация</button><button class="btn btn-light" data-auth="login">Войти</button></div></nav>
 <section class="hero"><div><h1>Сеть общежитий высокой культуры</h1><p>Для молодёжи и студентов. Только студенты. Только годовые контракты — минимум 12 месяцев.</p><div class="hero-actions"><button class="btn btn-light" data-auth="register">Подать заявку</button><button class="btn btn-ghost" onclick="document.querySelector('#how').scrollIntoView()">Выбрать общежитие</button></div></div><div class="hero-visual" style="display:grid;place-items:center"><img class="brand-original" src="assets/original/asset-0004.png" alt="Москва в студентов верит"></div></section>
 <section class="section" id="how"><h2>Общежитие высокой культуры для студентов</h2><div class="benefits"><article class="benefit"><h3>Всё необходимое уже есть</h3><p>Постельное бельё, утюг, отпариватель, фены и швейный набор. Сушка бесплатно.</p><b class="step-num">01</b></article><article class="benefit dark"><h3>Безопасное пространство</h3><p>Здание и отель находятся под постоянным видеонаблюдением. На каждом объекте живёт администратор.</p><b class="step-num">02</b></article><div class="benefits-bottom"><article class="benefit"><h3>Шаболовская</h3><p>Конный пер., 12. Исторический центр Москвы.</p></article><article class="benefit"><h3>Нагатинская</h3><p>Уют на Варшавке, Варшавское шоссе, 18к2.</p></article><article class="benefit"><h3>Молодёжная</h3><p>Ул. Партизанская, 40.</p></article></div></div><div class="partner-row"><img src="assets/original/asset-0001.png" alt="FORMA"><img src="assets/original/asset-0002.png" alt="Уют на Варшавке"><img src="assets/original/asset-0003.png" alt="Молодёжка"></div></section>
 <section class="cta"><h2>Найдите подходящее место уже сегодня</h2><button class="btn btn-light" data-auth="register">Создать аккаунт</button></section><footer class="footer"><b>МСВ — Москва в студентов верит</b><span>+7 (926) 127-39-99 · info@msv.ru</span></footer></main>`;
 $$('[data-auth]').forEach(b=>b.onclick=()=>auth(b.dataset.auth));
}
function auth(mode='login'){$('#app').innerHTML=`<div class="auth-screen"><section class="auth-copy"><div class="logo"><b class="logo-mark">М</b><span>МСВ</span></div><h1>Ваше пространство для жизни в Москве</h1><p>Бронирование, документы, платежи и обращения — в одном личном кабинете.</p></section><section class="auth-panel"><button class="btn btn-sm" style="align-self:flex-start;margin-bottom:25px" onclick="session=null;render()">← На главную</button><h2>${mode==='login'?'Вход в кабинет':'Создание аккаунта'}</h2><p class="subtle">Используйте электронную почту и пароль</p><div class="tabs"><button class="tab ${mode==='login'?'active':''}" data-mode="login">Войти</button><button class="tab ${mode==='register'?'active':''}" data-mode="register">Регистрация</button></div><form id="auth-form">${mode==='register'?'<div class="field"><label>ФИО</label><input class="input" name="name" required></div><div class="field"><label>Телефон</label><input class="input" name="phone" required></div>':''}<div class="field"><label>Электронная почта</label><input class="input" name="email" type="email" required></div><div class="field"><label>Пароль</label><input class="input" name="password" type="password" required minlength="4"></div><div class="error" id="auth-error"></div><button class="btn btn-primary full">${mode==='login'?'Войти':'Зарегистрироваться'}</button></form>${mode==='login'?'<p class="subtle" style="margin-top:20px">Демо-админ: admin@msv.ru / admin</p>':''}</section></div>`;
 $$('.tab').forEach(t=>t.onclick=()=>auth(t.dataset.mode));$('#auth-form').onsubmit=e=>{e.preventDefault();let f=Object.fromEntries(new FormData(e.target));if(mode==='login'){let u=db.users.find(x=>x.email.toLowerCase()===f.email.toLowerCase()&&x.password===f.password);if(!u)return $('#auth-error').textContent='Неверная почта или пароль';session={userId:u.id};localStorage.setItem('msv_session',JSON.stringify(session));view='home';render()}else{if(db.users.some(x=>x.email.toLowerCase()===f.email.toLowerCase()))return $('#auth-error').textContent='Пользователь с такой почтой уже зарегистрирован';let u={id:Date.now(),...f,role:'client'};db.users.push(u);save();session={userId:u.id};localStorage.setItem('msv_session',JSON.stringify(session));render()}};
}
const clientMenu=[['home','⌂','Главная'],['catalog','▦','Выбрать общежитие'],['bookings','▣','Моё место'],['payments','₽','Оплата'],['documents','□','Документы'],['services','+','Услуги'],['memo','!','Памятка'],['support','?','Поддержка'],['profile','○','Мой профиль']];
const adminMenu=[['adminhome','⌂','Обзор'],['requests','▣','Заявки'],['rooms','▦','Общежития'],['users','○','Клиенты']];
function dashboard(){let u=db.users.find(x=>x.id===session.userId);if(!u){logout();return}let menu=u.role==='admin'?adminMenu:clientMenu;if(u.role==='admin'&&!view.startsWith('admin')&&!['requests','rooms','users','inventory','chargesadmin','ticketsadmin'].includes(view))view='adminhome';if(u.role==='client'&&view==='adminhome')view='home';$('#app').innerHTML=`<div class="shell"><aside class="sidebar"><div class="logo"><b class="logo-mark">М</b><span>МСВ</span></div><div class="side-user"><strong>${u.name}</strong><small>${u.role==='admin'?'Администратор':'Личный кабинет'}</small></div><nav class="menu">${menu.map(m=>`<button data-view="${m[0]}" class="${view===m[0]?'active':''}"><span class="ico">${m[1]}</span><span class="label">${m[2]}</span></button>`).join('')}</nav></aside><main class="main"><header class="header"><h1>${menu.find(m=>m[0]===view)?.[2]||'Личный кабинет'}</h1><button class="btn btn-sm btn-danger" id="logout">Выйти</button></header><div class="content" id="content"></div></main></div>`;$$('[data-view]').forEach(b=>b.onclick=()=>{view=b.dataset.view;dashboard()});$('#logout').onclick=logout;pages[view]?.(u)}
function logout(){session=null;localStorage.removeItem('msv_session');render()}
const pages={
 home(u){let bs=db.bookings.filter(b=>b.userId===u.id);$('#content').innerHTML=`<div class="cards"><div class="stat"><span>Активные заявки</span><strong>${bs.length}</strong></div><div class="stat"><span>Доступно мест</span><strong>${db.rooms.reduce((a,r)=>a+r.places,0)}</strong></div><div class="stat"><span>К оплате</span><strong>${bs.length?money(19500):'0 ₽'}</strong></div><div class="stat"><span>Документы</span><strong>4 / 4</strong></div></div><div class="grid2"><section class="panel"><div class="panel-head"><h2>Текущее проживание</h2></div>${bs.length?bookingCard(bs[0]):'<div class="empty">У вас пока нет бронирований<br><br><button class="btn btn-primary" data-go>Выбрать место</button></div>'}</section><section class="panel"><div class="panel-head"><h2>Что нужно сделать</h2></div><p><span class="status ok">Готово</span> Профиль заполнен</p><p><span class="status ok">Готово</span> Документы загружены</p><p><span class="status wait">Ожидает</span> Оплатить следующий месяц</p></section></div>`;$('[data-go]')?.addEventListener('click',()=>{view='catalog';dashboard()})},
 catalog(){catalogPage(false)},rooms(){catalogPage(true)},
 bookings(u){let bs=db.bookings.filter(b=>b.userId===u.id);$('#content').innerHTML=`<section class="panel"><div class="panel-head"><h2>Мои заявки и бронирования</h2><button class="btn btn-primary" data-new>Новое бронирование</button></div>${bookingsTable(bs,false)}</section>`;$('[data-new]').onclick=()=>{view='catalog';dashboard()}},
 payments(u){let bs=db.bookings.filter(b=>b.userId===u.id);$('#content').innerHTML=`<section class="panel"><div class="panel-head"><h2>Начисления и платежи</h2></div>${bs.length?`<table><thead><tr><th>Назначение</th><th>Период</th><th>Сумма</th><th>Статус</th><th></th></tr></thead><tbody><tr><td>Проживание в общежитии</td><td>Август 2026</td><td>${money(db.rooms.find(r=>r.id===bs[0].roomId)?.price||0)}</td><td><span class="status wait">Ожидает оплаты</span></td><td><button class="btn btn-primary btn-sm" onclick="toast('Платёжный модуль будет подключён на следующем этапе')">Оплатить</button></td></tr></tbody></table>`:'<div class="empty">Начислений пока нет</div>'}</section>`},
 documents(){let docs=['Договор о проживании','Правила проживания','Согласие на обработку персональных данных','Политика обработки персональных данных','Памятка для приезжающих','Ваучер на заселение'];$('#content').innerHTML=`<section class="panel"><div class="panel-head"><h2>Документы</h2></div><div class="info-note">Обязательно ознакомьтесь с Договором и Правилами проживания.</div><div class="document-list" style="margin-top:18px">${docs.map((d,i)=>`<div class="document-item"><span><b>${d}</b><br><small class="subtle">Редакция от 01.01.2026</small></span><button class="btn btn-sm" onclick="toast('Файл будет привязан после переноса хранилища Bubble')">${i<4?'Открыть':'Сформировать'}</button></div>`).join('')}</div></section>`},
 services(){$('#content').innerHTML=`<div class="grid2"><section class="panel"><h2>Заказ услуг и документов</h2><p>Заказать справку о проживании</p><button class="btn btn-primary" onclick="toast('Заявка на справку отправлена')">Заказать справку</button></section><section class="panel"><h2>Заявка технику</h2><p>Если что-то сломалось, опишите проблему администрации.</p><button class="btn btn-primary" onclick="toast('Заявка технику отправлена')">Подать заявку</button></section><section class="panel"><h2>Заявка на выселение</h2><p>Укажите планируемую дату и объект размещения.</p><button class="btn" onclick="toast('Заявка на выселение создана')">Подать заявку на выселение</button></section></div>`},
 memo(){let rs=['Относитесь к другим так, как хотите, чтобы относились к вам','Приём пищи только на кухне','Не храните вне холодильника то, что требует охлаждения','Соблюдайте правило тишины','Сообщайте администратору, если что-то сломалось','Алкоголь запрещён'];$('#content').innerHTML=`<section class="panel"><h2>Шесть важнейших правил</h2><p class="subtle">Ознакомление и соблюдение рекомендаций облегчает адаптацию, повышает комфорт и безопасность.</p><div class="rules">${rs.map(r=>`<div class="rule">${r}</div>`).join('')}</div></section><section class="panel"><h2>Не берите лишнего. Не берите чемоданы.</h2><p>Чемоданы занимают много ценного пространства. Рекомендуем свои тапочки и полотенце. Всё остальное необходимое уже есть.</p></section>`},
 support(){$('#content').innerHTML=`<section class="panel" style="max-width:720px"><h2>Поддержка</h2><p>Просьба обращаться к администрации из одного чата — когда пишут разные родственники с разных номеров, теряется история переписки.</p><div class="info-note"><b>Телеграм и мобильный:</b> +7 926 127-39-99<br><b>Телефон администратора:</b> +7 926 127-39-99</div><form id="support-form" style="margin-top:20px"><div class="field"><label>Тема</label><select class="input"><option>ВУЗ, документы и т.д.</option><option>Оплата</option><option>Заселение</option><option>Техническая проблема</option></select></div><div class="field"><label>Сообщение</label><textarea class="input" rows="5" required></textarea></div><button class="btn btn-primary">Отправить</button></form></section>`;$('#support-form').onsubmit=e=>{e.preventDefault();toast('Сообщение отправлено администрации');e.target.reset()}},
 profile(u){$('#content').innerHTML=`<section class="panel" style="max-width:720px"><div class="panel-head"><h2>Личные данные</h2></div><form id="profile"><div class="grid2"><div class="field"><label>ФИО</label><input class="input" name="name" value="${u.name}"></div><div class="field"><label>Телефон</label><input class="input" name="phone" value="${u.phone||''}"></div></div><div class="field"><label>Электронная почта</label><input class="input" name="email" value="${u.email}"></div><div class="field"><label>Учебное заведение</label><input class="input" name="university" value="${u.university||''}" placeholder="Укажите название"></div><button class="btn btn-primary">Сохранить</button></form></section>`;$('#profile').onsubmit=e=>{e.preventDefault();Object.assign(u,Object.fromEntries(new FormData(e.target)));save();toast('Данные сохранены')}},
 adminhome(){let pending=db.bookings.filter(b=>b.status==='На рассмотрении').length;$('#content').innerHTML=`<div class="cards"><div class="stat"><span>Всего клиентов</span><strong>${db.users.filter(u=>u.role==='client').length}</strong></div><div class="stat"><span>Новые заявки</span><strong>${pending}</strong></div><div class="stat"><span>Свободные места</span><strong>${db.rooms.reduce((a,r)=>a+r.places,0)}</strong></div><div class="stat"><span>Заполняемость</span><strong>84%</strong></div></div><div class="grid2"><section class="panel"><div class="panel-head"><h2>Последние заявки</h2></div>${bookingsTable(db.bookings.slice(-5),true)}</section><section class="panel"><div class="panel-head"><h2>Загрузка общежитий</h2></div>${db.rooms.slice(0,4).map(r=>`<p><b>${r.hostel}</b><br><span class="subtle">Свободно мест: ${r.places}</span></p>`).join('')}</section></div>`},
 requests(){renderRequests()},users(){let us=db.users.filter(u=>u.role==='client');$('#content').innerHTML=`<section class="panel"><div class="panel-head"><h2>Клиенты</h2><span class="subtle">${us.length} записей</span></div><div class="table-wrap"><table><thead><tr><th>Клиент</th><th>Контакты</th><th>Бронирований</th><th>Роль</th></tr></thead><tbody>${us.map(u=>`<tr><td><b>${u.name}</b></td><td>${u.email}<br>${u.phone||''}</td><td>${db.bookings.filter(b=>b.userId===u.id).length}</td><td><span class="status ok">Клиент</span></td></tr>`).join('')}</tbody></table></div></section>`}
};
function bookingCard(b){let r=db.rooms.find(x=>x.id===b.roomId);return `<h3>${r?.hostel}</h3><p class="subtle">${r?.address}</p><p>${r?.type}</p><p><b>${b.from} — ${b.to}</b></p><span class="status ${b.status==='Подтверждено'?'ok':'wait'}">${b.status}</span>`}
function bookingsTable(bs,admin){if(!bs.length)return '<div class="empty">Заявок пока нет</div>';return `<div class="table-wrap"><table><thead><tr><th>№</th>${admin?'<th>Клиент</th>':''}<th>Общежитие</th><th>Даты</th><th>Статус</th></tr></thead><tbody>${bs.map(b=>`<tr><td>#${b.id}</td>${admin?`<td>${db.users.find(u=>u.id===b.userId)?.name||'—'}</td>`:''}<td>${db.rooms.find(r=>r.id===b.roomId)?.hostel||'—'}</td><td>${b.from} — ${b.to}</td><td><span class="status ${b.status==='Подтверждено'?'ok':b.status==='Отклонено'?'bad':'wait'}">${b.status}</span></td></tr>`).join('')}</tbody></table></div>`}
function catalogPage(admin){$('#content').innerHTML=`<section class="panel"><div class="panel-head"><h2>${admin?'Управление общежитиями':'Доступные варианты'}</h2><div><select class="input" id="filter"><option>Все варианты</option><option>Мужской</option><option>Женский</option></select></div></div><div class="booking-grid" id="rooms-list"></div></section>`;let draw=()=>{$('#rooms-list').innerHTML=db.rooms.filter(r=>$('#filter').value==='Все варианты'||r.gender===$('#filter').value).map(r=>`<article class="room"><div class="room-img"></div><div class="room-body"><h3>${r.hostel}</h3><div class="room-meta">${r.address}<br>${r.type} · ${r.gender}</div><div class="panel-head"><span><b class="price">${money(r.price)}</b><br><small>в месяц</small></span><span class="status ok">${r.places} мест</span></div>${admin?`<button class="btn btn-light full" onclick="toast('Редактирование объекта будет доступно в полной версии')">Редактировать</button>`:`<button class="btn btn-primary full" onclick="book(${r.id})">Забронировать</button>`}</div></article>`).join('')};draw();$('#filter').onchange=draw}
function book(id){let r=db.rooms.find(x=>x.id===id);document.body.insertAdjacentHTML('beforeend',`<div class="modal-back"><form class="modal" id="book-form"><h2>Заявка на бронирование</h2><p><b>${r.hostel}</b><br><span class="subtle">${r.type}, ${money(r.price)} в месяц</span></p><div class="grid2"><div class="field"><label>Дата заезда</label><input class="input" type="date" name="from" required value="2026-08-01"></div><div class="field"><label>Дата выезда</label><input class="input" type="date" name="to" required value="2027-06-30"></div></div><div class="field"><label>Комментарий</label><textarea class="input" rows="3" placeholder="Дополнительная информация"></textarea></div><div class="modal-actions"><button type="button" class="btn" data-close>Отмена</button><button class="btn btn-primary">Отправить заявку</button></div></form></div>`);$('[data-close]').onclick=()=>$('.modal-back').remove();$('#book-form').onsubmit=e=>{e.preventDefault();let d=Object.fromEntries(new FormData(e.target));db.bookings.push({id:Date.now(),userId:session.userId,roomId:id,...d,status:'На рассмотрении',created:new Date().toLocaleDateString('ru-RU')});save();$('.modal-back').remove();toast('Заявка отправлена администратору');view='bookings';dashboard()}}
function renderRequests(){$('#content').innerHTML=`<section class="panel"><div class="panel-head"><h2>Все заявки</h2><span class="subtle">${db.bookings.length} записей</span></div><div class="table-wrap"><table><thead><tr><th>№</th><th>Клиент</th><th>Общежитие</th><th>Даты</th><th>Статус</th><th>Действия</th></tr></thead><tbody>${db.bookings.map(b=>`<tr><td>#${b.id}</td><td>${db.users.find(u=>u.id===b.userId)?.name||'—'}</td><td>${db.rooms.find(r=>r.id===b.roomId)?.hostel}</td><td>${b.from} — ${b.to}</td><td><span class="status ${b.status==='Подтверждено'?'ok':b.status==='Отклонено'?'bad':'wait'}">${b.status}</span></td><td><button class="btn btn-sm btn-primary" onclick="setStatus(${b.id},'Подтверждено')">Принять</button> <button class="btn btn-sm btn-danger" onclick="setStatus(${b.id},'Отклонено')">Отклонить</button></td></tr>`).join('')}</tbody></table></div></section>`}
function setStatus(id,s){db.bookings.find(b=>b.id===id).status=s;save();renderRequests();toast('Статус заявки изменён')}
auth = function(mode='login'){
  $('#app').innerHTML=`<div class="auth-screen"><section class="auth-copy"><div class="logo"><b class="logo-mark">М</b><span>МСВ</span></div><h1>Ваше пространство для жизни в Москве</h1><p>Бронирование, документы, платежи и обращения — в одном личном кабинете.</p></section><section class="auth-panel"><button class="btn btn-sm" style="align-self:flex-start;margin-bottom:25px" id="back-home">← На главную</button><h2>${mode==='login'?'Вход в кабинет':'Создание аккаунта'}</h2><p class="subtle">Данные защищены собственной серверной системой МСВ</p><div class="tabs"><button class="tab ${mode==='login'?'active':''}" data-mode="login">Войти</button><button class="tab ${mode==='register'?'active':''}" data-mode="register">Регистрация</button></div><form id="auth-form">${mode==='register'?'<div class="field"><label>ФИО</label><input class="input" name="name" required></div><div class="field"><label>Телефон</label><input class="input" name="phone" required></div>':''}<div class="field"><label>Электронная почта</label><input class="input" name="email" type="email" required></div><div class="field"><label>Пароль</label><input class="input" name="password" type="password" required minlength="${mode==='login'?1:6}"></div><div class="error" id="auth-error"></div><button class="btn btn-primary full">${mode==='login'?'Войти':'Зарегистрироваться'}</button></form>${mode==='login'?'<p class="subtle" style="margin-top:20px">Администратор: admin@msv.ru / admin</p>':''}</section></div>`;
  $('#back-home').onclick=()=>{session=null;render()};$$('.tab').forEach(t=>t.onclick=()=>auth(t.dataset.mode));
  $('#auth-form').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));const button=$('button[type="submit"],button.btn-primary',e.target);button.disabled=true;try{const endpoint=mode==='login'?'/api/auth/login':'/api/auth/register';const result=await api(endpoint,{method:'POST',body:JSON.stringify(f)});session={userId:result.user.id};await refreshData();view=result.user.role==='admin'?'adminhome':'home';render()}catch(err){$('#auth-error').textContent=err.message}finally{button.disabled=false}};
};

logout = async function(){try{await api('/api/auth/logout',{method:'POST'})}catch{}session=null;render()};

book = function(id){let r=db.rooms.find(x=>x.id===id);document.body.insertAdjacentHTML('beforeend',`<div class="modal-back"><form class="modal" id="book-form"><h2>Заявка на бронирование</h2><p><b>${r.hostel}</b><br><span class="subtle">${r.type}, ${money(r.price)} в месяц</span></p><div class="grid2"><div class="field"><label>Дата заезда</label><input class="input" type="date" name="from" required value="2026-08-01"></div><div class="field"><label>Дата выезда</label><input class="input" type="date" name="to" required value="2027-06-30"></div></div><div class="field"><label>Комментарий</label><textarea class="input" name="comment" rows="3"></textarea></div><div class="modal-actions"><button type="button" class="btn" data-close>Отмена</button><button class="btn btn-primary">Отправить заявку</button></div></form></div>`);$('[data-close]').onclick=()=>$('.modal-back').remove();$('#book-form').onsubmit=async e=>{e.preventDefault();try{const d=Object.fromEntries(new FormData(e.target));await api('/api/bookings',{method:'POST',body:JSON.stringify({roomId:id,...d})});await refreshData();$('.modal-back').remove();toast('Заявка отправлена администратору');view='bookings';dashboard()}catch(err){toast(err.message)}}};

setStatus = async function(id,status){try{await api(`/api/bookings/${id}`,{method:'PATCH',body:JSON.stringify({status})});await refreshData();renderRequests();toast('Статус заявки изменён')}catch(err){toast(err.message)}};

function roomForm(room){const isEdit=Boolean(room);document.body.insertAdjacentHTML('beforeend',`<div class="modal-back"><form class="modal" id="room-form"><h2>${isEdit?'Редактирование':'Новое общежитие'}</h2><div class="field"><label>Название</label><input class="input" name="hostel" required value="${room?.hostel||''}"></div><div class="field"><label>Адрес</label><input class="input" name="address" required value="${room?.address||''}"></div><div class="field"><label>Тип размещения</label><input class="input" name="type" value="${room?.type||'Место в общей комнате'}"></div><div class="grid2"><div class="field"><label>Свободных мест</label><input class="input" name="places" type="number" min="0" value="${room?.places??0}"></div><div class="field"><label>Цена в месяц</label><input class="input" name="price" type="number" min="0" value="${room?.price??0}"></div></div><div class="field"><label>Размещение</label><select class="input" name="gender">${['Любой','Мужской','Женский'].map(x=>`<option ${room?.gender===x?'selected':''}>${x}</option>`).join('')}</select></div><label style="display:flex;gap:9px;align-items:center"><input type="checkbox" name="active" ${room?.active!==false?'checked':''}> Объект доступен для бронирования</label><div class="modal-actions"><button type="button" class="btn" data-close>Отмена</button><button class="btn btn-primary">Сохранить</button></div></form></div>`);$('[data-close]').onclick=()=>$('.modal-back').remove();$('#room-form').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));f.places=Number(f.places);f.price=Number(f.price);f.active=Boolean(f.active);try{await api(isEdit?`/api/rooms/${room.id}`:'/api/rooms',{method:isEdit?'PATCH':'POST',body:JSON.stringify(f)});await refreshData();$('.modal-back').remove();catalogPage(true);toast('Объект сохранён')}catch(err){toast(err.message)}}}

function editRoom(id){roomForm(db.rooms.find(r=>r.id===id))}
async function archiveRoom(id){if(!confirm('Скрыть объект из бронирования?'))return;try{await api(`/api/rooms/${id}`,{method:'DELETE'});await refreshData();catalogPage(true);toast('Объект скрыт')}catch(err){toast(err.message)}}

catalogPage = function(admin){$('#content').innerHTML=`<section class="panel"><div class="panel-head"><h2>${admin?'Управление общежитиями':'Доступные варианты'}</h2><div style="display:flex;gap:10px">${admin?'<button class="btn btn-primary" id="add-room">Добавить объект</button>':''}<select class="input" id="filter"><option>Все варианты</option><option>Мужской</option><option>Женский</option></select></div></div><div class="booking-grid" id="rooms-list"></div></section>`;if(admin)$('#add-room').onclick=()=>roomForm(null);let draw=()=>{$('#rooms-list').innerHTML=db.rooms.filter(r=>(admin||r.active!==false)&&($('#filter').value==='Все варианты'||r.gender===$('#filter').value)).map(r=>`<article class="room"><div class="room-img" style="background-image:url('${r.image||'/assets/source-site/004-site-screenshot.png'}');background-size:cover;background-position:center"><span class="status ${r.active===false?'bad':'ok'}" style="position:absolute;top:12px;right:12px;z-index:1">${r.active===false?'Скрыто':r.places+' мест'}</span></div><div class="room-body"><h3>${r.hostel}</h3><div class="room-meta">${r.address}<br>${r.type} · ${r.gender}</div><div class="panel-head"><span><b class="price">${money(r.price)}</b><br><small>в месяц</small></span></div>${admin?`<div style="display:flex;gap:8px"><button class="btn btn-primary full" onclick="editRoom(${r.id})">Редактировать</button><button class="btn btn-danger" onclick="archiveRoom(${r.id})">Скрыть</button></div>`:`<button class="btn btn-primary full" onclick="book(${r.id})">Забронировать</button>`}</div></article>`).join('')};draw();$('#filter').onchange=draw};

const originalProfilePage=pages.profile;
pages.profile=function(u){originalProfilePage(u);$('#profile').onsubmit=async e=>{e.preventDefault();try{const f=Object.fromEntries(new FormData(e.target));const result=await api('/api/profile',{method:'PATCH',body:JSON.stringify(f)});const index=db.users.findIndex(x=>x.id===result.user.id);if(index>=0)db.users[index]=result.user;toast('Данные сохранены')}catch(err){toast(err.message)}}};

adminMenu.splice(3,0,['inventory','▤','Комнаты и места'],['chargesadmin','₽','Начисления'],['ticketsadmin','?','Обращения']);

pages.payments=function(){const charges=db.charges||[];$('#content').innerHTML=`<section class="panel"><div class="panel-head"><h2>Начисления и платежи</h2><span class="subtle">Оплата картой или СБП через Т‑Банк</span></div>${charges.length?`<div class="table-wrap"><table><thead><tr><th>Назначение</th><th>Период</th><th>Срок</th><th>Сумма</th><th>Статус</th><th></th></tr></thead><tbody>${charges.map(c=>`<tr><td>${c.title}</td><td>${c.period}</td><td>${c.dueDate||'—'}</td><td><b>${money(c.amount)}</b></td><td><span class="status ${c.status==='Оплачено'?'ok':'wait'}">${c.status}</span></td><td>${c.status!=='Оплачено'?`<button class="btn btn-primary btn-sm" onclick="startPayment(${c.id})">Оплатить</button>`:'—'}</td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Начислений пока нет</div>'}<div class="info-note" style="margin-top:18px">Пока включён тестовый платёжный режим. После добавления TerminalKey и секретного пароля откроется форма Т‑Банка.</div></section>`};
async function startPayment(chargeId){try{const result=await api('/api/payments/init',{method:'POST',body:JSON.stringify({chargeId})});location.href=result.paymentUrl}catch(err){toast(err.message)}}

pages.support=function(){$('#content').innerHTML=`<div class="grid2"><section class="panel"><h2>Новое обращение</h2><form id="ticket-form"><div class="field"><label>Тип</label><select class="input" name="type"><option>Обращение</option><option>Заявка технику</option><option>Справка о проживании</option><option>Заявка на выселение</option></select></div><div class="field"><label>Тема</label><input class="input" name="subject" required></div><div class="field"><label>Сообщение</label><textarea class="input" name="message" rows="5" required></textarea></div><button class="btn btn-primary">Отправить</button></form></section><section class="panel"><h2>Мои обращения</h2>${(db.tickets||[]).length?(db.tickets||[]).map(t=>`<div class="document-item"><span><b>${t.subject||t.type}</b><br><small class="subtle">${new Date(t.createdAt).toLocaleString('ru-RU')}</small></span><span class="status ${t.status==='Закрыто'?'ok':'wait'}">${t.status}</span></div>`).join(''):'<div class="empty">Обращений пока нет</div>'}</section></div>`;$('#ticket-form').onsubmit=async e=>{e.preventDefault();try{await api('/api/tickets',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});await refreshData();pages.support();toast('Обращение отправлено')}catch(err){toast(err.message)}}};

pages.inventory=function(){const beds=db.beds||[];$('#content').innerHTML=`<section class="panel"><div class="panel-head"><h2>Комнаты и койко-места</h2><button class="btn btn-primary" id="add-bed">Добавить место</button></div><div class="table-wrap"><table><thead><tr><th>Объект</th><th>Комната</th><th>Место</th><th>Статус</th><th>Жилец</th></tr></thead><tbody>${beds.map(b=>`<tr><td>${db.rooms.find(r=>r.id===b.roomId)?.hostel||'—'}</td><td>№ ${b.number}</td><td>${b.place}</td><td><span class="status ${b.status==='Свободно'?'ok':'wait'}">${b.status}</span></td><td>${db.users.find(u=>u.id===b.userId)?.name||'—'}</td></tr>`).join('')}</tbody></table></div></section>`;$('#add-bed').onclick=()=>bedForm()};
function bedForm(){document.body.insertAdjacentHTML('beforeend',`<div class="modal-back"><form class="modal" id="bed-form"><h2>Новое койко-место</h2><div class="field"><label>Общежитие</label><select class="input" name="roomId">${db.rooms.map(r=>`<option value="${r.id}">${r.hostel}</option>`).join('')}</select></div><div class="field"><label>Номер комнаты</label><input class="input" name="number" required></div><div class="field"><label>Тип места</label><select class="input" name="place"><option>Нижнее</option><option>Верхнее</option><option>Односпальное</option></select></div><div class="modal-actions"><button type="button" class="btn" data-close>Отмена</button><button class="btn btn-primary">Сохранить</button></div></form></div>`);$('[data-close]').onclick=()=>$('.modal-back').remove();$('#bed-form').onsubmit=async e=>{e.preventDefault();try{await api('/api/beds',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});await refreshData();$('.modal-back').remove();pages.inventory();toast('Место добавлено')}catch(err){toast(err.message)}}}

pages.chargesadmin=function(){const charges=db.charges||[];$('#content').innerHTML=`<section class="panel"><div class="panel-head"><h2>Начисления</h2><button class="btn btn-primary" id="add-charge">Создать начисление</button></div><div class="table-wrap"><table><thead><tr><th>Клиент</th><th>Назначение</th><th>Период</th><th>Сумма</th><th>Статус</th></tr></thead><tbody>${charges.map(c=>`<tr><td>${db.users.find(u=>u.id===c.userId)?.name||'—'}</td><td>${c.title}</td><td>${c.period}</td><td>${money(c.amount)}</td><td><span class="status ${c.status==='Оплачено'?'ok':'wait'}">${c.status}</span></td></tr>`).join('')}</tbody></table></div></section>`;$('#add-charge').onclick=()=>chargeForm()};
function chargeForm(){const clients=db.users.filter(u=>u.role==='client');document.body.insertAdjacentHTML('beforeend',`<div class="modal-back"><form class="modal" id="charge-form"><h2>Новое начисление</h2><div class="field"><label>Клиент</label><select class="input" name="userId">${clients.map(u=>`<option value="${u.id}">${u.name}</option>`).join('')}</select></div><div class="field"><label>Назначение</label><select class="input" name="title"><option>Проживание в общежитии</option><option>Депозит</option><option>Доплата</option><option>Услуга</option></select></div><div class="field"><label>Период</label><input class="input" name="period" placeholder="Август 2026" required></div><div class="grid2"><div class="field"><label>Сумма, ₽</label><input class="input" type="number" min="1" name="amount" required></div><div class="field"><label>Оплатить до</label><input class="input" type="date" name="dueDate"></div></div><div class="modal-actions"><button type="button" class="btn" data-close>Отмена</button><button class="btn btn-primary">Создать</button></div></form></div>`);$('[data-close]').onclick=()=>$('.modal-back').remove();$('#charge-form').onsubmit=async e=>{e.preventDefault();try{await api('/api/charges',{method:'POST',body:JSON.stringify(Object.fromEntries(new FormData(e.target)))});await refreshData();$('.modal-back').remove();pages.chargesadmin();toast('Начисление создано')}catch(err){toast(err.message)}}}

pages.ticketsadmin=function(){const tickets=db.tickets||[];$('#content').innerHTML=`<section class="panel"><div class="panel-head"><h2>Обращения клиентов</h2><span class="subtle">${tickets.length} записей</span></div>${tickets.length?`<div class="table-wrap"><table><thead><tr><th>Клиент</th><th>Тип</th><th>Тема</th><th>Статус</th><th></th></tr></thead><tbody>${tickets.map(t=>`<tr><td>${db.users.find(u=>u.id===t.userId)?.name||'—'}</td><td>${t.type}</td><td>${t.subject}</td><td><span class="status ${t.status==='Закрыто'?'ok':'wait'}">${t.status}</span></td><td><button class="btn btn-sm" onclick="closeTicket(${t.id})">Закрыть</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">Обращений пока нет</div>'}</section>`};
async function closeTicket(id){try{await api(`/api/tickets/${id}`,{method:'PATCH',body:JSON.stringify({status:'Закрыто'})});await refreshData();pages.ticketsadmin();toast('Обращение закрыто')}catch(err){toast(err.message)}}

async function init(){try{const me=await api('/api/auth/me');if(me.user){session={userId:me.user.id};await refreshData();view=me.user.role==='admin'?'adminhome':'home'}}catch(err){console.error(err)}render()}
init();
MSV_FILE_END

echo "    записываю styles.css"
cat > /opt/msv/styles.css << 'MSV_FILE_END'
@font-face{font-family:Roboto;src:url('assets/fonts/roboto-300.ttf') format('truetype');font-weight:300;font-display:swap}@font-face{font-family:Roboto;src:url('assets/fonts/roboto-400.ttf') format('truetype');font-weight:400;font-display:swap}@font-face{font-family:Roboto;src:url('assets/fonts/roboto-500.ttf') format('truetype');font-weight:500;font-display:swap}@font-face{font-family:Roboto;src:url('assets/fonts/roboto-600.ttf') format('truetype');font-weight:600;font-display:swap}@font-face{font-family:Roboto;src:url('assets/fonts/roboto-700.ttf') format('truetype');font-weight:700;font-display:swap}
:root{--ink:#18212b;--muted:#6f7782;--line:#e5e8eb;--blue:#008cdd;--blue2:#015e94;--green:#69c765;--red:#ef314d;--bg:#f4f6f8;--card:#fff;--nav:#015e94;--shadow:0 10px 35px rgba(24,33,43,.08)}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;color:var(--ink);background:var(--bg);font:14px/1.5 Roboto,"Open Sans",Arial,sans-serif}button,input,select,textarea{font:inherit}button{cursor:pointer}a{color:inherit;text-decoration:none}.hidden{display:none!important}
.public{min-height:100vh;background:#fff;overflow-x:hidden}.topbar{height:72px;display:flex;align-items:center;justify-content:space-between;padding:0 max(28px,calc((100vw - 1180px)/2));border-bottom:1px solid rgba(255,255,255,.15);position:absolute;z-index:3;width:100%;color:#fff}.logo{display:flex;align-items:center;gap:12px;font-size:24px;font-weight:800;letter-spacing:.02em}.logo-mark{width:38px;height:38px;display:grid;place-items:center;border-radius:10px;background:#fff;color:var(--blue);font-size:18px}.nav-actions{display:flex;gap:10px}.btn{border:0;border-radius:8px;padding:11px 18px;font-weight:600;transition:.2s}.btn:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(0,0,0,.12)}.btn-primary{background:var(--blue);color:#fff}.btn-light{background:#fff;color:var(--ink)}.btn-ghost{background:transparent;color:inherit;border:1px solid currentColor}.btn-danger{background:#fff0f0;color:var(--red)}.btn-sm{padding:8px 12px;font-size:13px}.hero{min-height:680px;color:#fff;padding:150px max(28px,calc((100vw - 1180px)/2)) 90px;display:grid;grid-template-columns:1.08fr .92fr;gap:70px;align-items:center;background:radial-gradient(circle at 75% 25%,#397bd4 0,transparent 34%),linear-gradient(130deg,#102235 0,#164f8e 58%,#0f3157 100%)}.hero h1{font-size:clamp(44px,5vw,70px);line-height:1.03;letter-spacing:-.045em;margin:0 0 24px;max-width:1180px}.hero p{font-size:19px;color:#dce9f8;max-width:620px;margin:0 0 34px}.hero-actions{display:flex;gap:12px}.hero-visual{position:relative;min-height:400px}.building{position:absolute;inset:0;border-radius:28px;background:linear-gradient(135deg,rgba(255,255,255,.25),rgba(255,255,255,.05));border:1px solid rgba(255,255,255,.25);box-shadow:0 40px 80px rgba(0,0,0,.3);overflow:hidden;transform:rotate(2deg)}.building:before{content:"";position:absolute;inset:45px;background:repeating-linear-gradient(90deg,rgba(255,255,255,.72) 0 40px,transparent 40px 57px),repeating-linear-gradient(0deg,transparent 0 34px,rgba(9,35,61,.45) 34px 48px);border-radius:10px}.float-card{position:absolute;z-index:2;background:#fff;color:var(--ink);padding:18px 20px;border-radius:14px;box-shadow:var(--shadow)}.float-card strong{display:block;font-size:18px}.float-card.one{left:-35px;bottom:55px}.float-card.two{right:-20px;top:55px}.section{padding:120px max(28px,calc((100vw - 1180px)/2))}.section h2{font-size:42px;letter-spacing:-.03em;margin:0 0 45px}.benefits{display:grid;grid-template-columns:7fr 5fr;grid-auto-flow:dense;gap:18px}.benefit{min-height:230px;border-radius:18px;padding:32px;background:#eef4fb;overflow:hidden;position:relative}.benefit:nth-child(2){background:#172534;color:#fff}.benefit:nth-child(n+3){grid-column:span 1}.benefits-bottom{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.benefit h3{font-size:25px;margin:0 0 12px}.benefit p{color:var(--muted);max-width:420px}.benefit.dark p{color:#b7c2cf}.step-num{font-size:70px;font-weight:800;color:rgba(22,102,216,.13);position:absolute;right:25px;bottom:0}.cta{margin:0 max(28px,calc((100vw - 1180px)/2)) 90px;background:var(--blue);color:#fff;border-radius:24px;padding:70px;display:flex;justify-content:space-between;align-items:center}.cta h2{font-size:38px;margin:0;max-width:650px}.footer{padding:35px max(28px,calc((100vw - 1180px)/2));background:#102030;color:#bfc9d3;display:flex;justify-content:space-between}
.auth-screen{min-height:100vh;display:grid;grid-template-columns:1fr 480px;background:linear-gradient(130deg,#102235,#1d64ac)}.auth-copy{color:#fff;padding:80px max(50px,8vw);display:flex;flex-direction:column;justify-content:center}.auth-copy h1{font-size:56px;line-height:1.05;max-width:680px;margin:25px 0}.auth-copy p{font-size:18px;color:#d9e7f5;max-width:570px}.auth-panel{background:#fff;padding:54px;display:flex;flex-direction:column;justify-content:center}.auth-panel h2{font-size:30px;margin:0 0 8px}.subtle{color:var(--muted)}.tabs{display:flex;border-bottom:1px solid var(--line);margin:25px 0}.tab{padding:12px 16px;border:0;background:none;color:var(--muted);border-bottom:2px solid transparent}.tab.active{color:var(--blue);border-color:var(--blue);font-weight:600}.field{display:flex;flex-direction:column;gap:7px;margin-bottom:16px}.field label{font-weight:600}.input{width:100%;border:1px solid #d9dee3;border-radius:8px;padding:12px 13px;background:#fff;outline:none}.input:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(22,102,216,.1)}.error{color:var(--red);min-height:20px}.full{width:100%}
.shell{min-height:100vh;display:grid;grid-template-columns:250px 1fr}.sidebar{background:var(--nav);color:#dce3ea;padding:25px 16px;position:sticky;top:0;height:100vh}.sidebar .logo{padding:0 10px 26px}.side-user{padding:18px 12px;border-top:1px solid #314050;border-bottom:1px solid #314050;margin-bottom:18px}.side-user strong{display:block;color:#fff}.menu{display:grid;gap:5px}.menu button{border:0;background:transparent;color:#bfc9d3;text-align:left;border-radius:8px;padding:11px 13px;display:flex;gap:11px;align-items:center}.menu button:hover,.menu button.active{background:#24384c;color:#fff}.menu .ico{width:20px;text-align:center}.main{min-width:0}.header{height:72px;background:#fff;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 30px;position:sticky;top:0;z-index:2}.header h1{font-size:21px;margin:0}.content{padding:30px;max-width:1400px}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;margin-bottom:24px}.stat,.panel{background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:0 3px 12px rgba(20,30,40,.03)}.stat{padding:20px}.stat span{color:var(--muted)}.stat strong{display:block;font-size:28px;margin-top:8px}.panel{padding:24px;margin-bottom:20px}.panel-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px}.panel h2{font-size:19px;margin:0}.grid2{display:grid;grid-template-columns:1fr 1fr;gap:20px}.booking-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.room{border:1px solid var(--line);border-radius:12px;overflow:hidden;background:#fff;transition:.2s}.room:hover{transform:translateY(-3px);box-shadow:var(--shadow)}.room-img{height:145px;background:linear-gradient(135deg,#c6dbed,#7ca8cf);position:relative;overflow:hidden}.room-img:after{content:"";position:absolute;inset:30px 35px 0;background:repeating-linear-gradient(90deg,#fff 0 35px,#a9c4dc 35px 45px);border-radius:8px 8px 0 0}.room-body{padding:18px}.room h3{margin:0 0 5px}.room-meta{color:var(--muted);margin-bottom:14px}.price{font-size:20px;font-weight:700}.status{display:inline-block;padding:5px 9px;border-radius:30px;font-size:12px;font-weight:600}.ok{color:#13784b;background:#e9f7f0}.wait{color:#9a6500;background:#fff5db}.bad{color:#a53030;background:#fdecec}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;white-space:nowrap}th,td{text-align:left;padding:13px 12px;border-bottom:1px solid var(--line)}th{font-size:12px;text-transform:uppercase;color:var(--muted);background:#fafbfc}.empty{padding:45px;text-align:center;color:var(--muted)}.modal-back{position:fixed;inset:0;background:rgba(12,23,35,.55);display:grid;place-items:center;z-index:9;padding:20px}.modal{background:#fff;width:min(560px,100%);max-height:90vh;overflow:auto;border-radius:14px;padding:27px;box-shadow:0 30px 80px rgba(0,0,0,.25)}.modal h2{margin:0 0 20px}.modal-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:22px}.toast{position:fixed;right:25px;bottom:25px;background:#172534;color:#fff;padding:14px 18px;border-radius:9px;z-index:20;box-shadow:var(--shadow)}
@media(max-width:900px){.hero{grid-template-columns:1fr}.hero-visual{display:none}.benefits{grid-template-columns:1fr}.auth-screen{grid-template-columns:1fr}.auth-copy{display:none}.auth-panel{max-width:none}.shell{grid-template-columns:76px 1fr}.sidebar{padding:20px 10px}.sidebar .logo span,.side-user,.menu .label{display:none}.menu button{justify-content:center}.cards,.booking-grid{grid-template-columns:repeat(2,1fr)}.grid2{grid-template-columns:1fr}.cta{padding:40px;display:block}.cta .btn{margin-top:25px}}
@media(max-width:580px){.topbar{padding:0 18px}.nav-actions .btn-ghost{display:none}.hero{padding:130px 20px 70px;min-height:620px}.hero h1{font-size:42px}.section{padding:80px 20px}.benefits-bottom{grid-template-columns:1fr}.cta{margin:0 20px 50px}.footer{padding:30px 20px;display:block}.shell{display:block}.sidebar{height:64px;width:100%;position:fixed;bottom:0;top:auto;z-index:7;display:flex}.sidebar .logo,.side-user{display:none}.menu{display:flex;width:100%;justify-content:space-around}.menu button{padding:9px}.header{padding:0 18px}.content{padding:18px 18px 85px}.cards,.booking-grid{grid-template-columns:1fr}.auth-panel{padding:30px}}
.room-img[style]:after{display:none}
.brand-original{width:min(100%,490px);height:auto;display:block;filter:drop-shadow(0 24px 42px rgba(0,0,0,.2));background:#fff;border-radius:18px}.partner-row{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:28px}.partner-row img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:14px}.document-list{display:grid;gap:10px}.document-item{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:16px;border:1px solid var(--line);border-radius:9px}.info-note{padding:16px 18px;border-left:4px solid var(--blue);background:#eef8fd;border-radius:0 8px 8px 0}.rules{counter-reset:rule;display:grid;gap:12px}.rule{counter-increment:rule;padding:16px 18px 16px 54px;background:#f7f9fb;border-radius:10px;position:relative}.rule:before{content:counter(rule);position:absolute;left:18px;top:15px;width:25px;height:25px;background:var(--blue);color:#fff;border-radius:50%;display:grid;place-items:center;font-weight:700}@media(max-width:580px){.partner-row{grid-template-columns:1fr}.document-item{align-items:flex-start;flex-direction:column}.menu{overflow-x:auto;justify-content:flex-start}.menu button{min-width:58px}}
MSV_FILE_END

echo "    записываю index.html"
cat > /opt/msv/index.html << 'MSV_FILE_END'
<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>МСВ — Москва в студентов верит</title>
<meta name="description" content="Сеть студенческих общежитий МСВ: бронирование мест, личный кабинет, оплата проживания.">
<link rel="icon" href="/assets/source-site/017-ec4fe60-favicon_rounded.png" type="image/png">
<link rel="apple-touch-icon" href="/assets/source-site/018-ac46586-apple_touch_icon_precomposed.png">
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<div id="app"></div>
<script src="/app.js"></script>
</body>
</html>
MSV_FILE_END

echo "    записываю payment-sandbox.html"
cat > /opt/msv/payment-sandbox.html << 'MSV_FILE_END'
<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Тестовая оплата МСВ</title><link rel="stylesheet" href="styles.css"></head><body><main style="min-height:100vh;display:grid;place-items:center;padding:20px;background:#eef4f8"><section class="panel" style="max-width:500px;width:100%;text-align:center;padding:42px"><div class="logo" style="justify-content:center"><b class="logo-mark" style="background:#008cdd;color:white">М</b><span>МСВ</span></div><h1>Тестовая оплата</h1><p class="subtle">Это безопасная имитация платёжной формы. Денежные средства не списываются.</p><button class="btn btn-primary full" id="pay">Подтвердить тестовый платёж</button><p><a href="/" class="subtle">Вернуться без оплаты</a></p><div id="result"></div></section></main><script>const id=new URLSearchParams(location.search).get('id');document.querySelector('#pay').onclick=async()=>{const r=await fetch('/api/payments/'+id+'/simulate',{method:'POST',headers:{'Content-Type':'application/json'}});const d=await r.json();if(r.ok){document.querySelector('#result').innerHTML='<p class="status ok">Оплата подтверждена</p><p><a class="btn btn-primary" href="/">Вернуться в кабинет</a></p>';document.querySelector('#pay').remove()}else document.querySelector('#result').textContent=d.error||'Ошибка'};</script></body></html>
MSV_FILE_END

echo "    записываю data/store.json"
cat > /opt/msv/data/store.json << 'MSV_FILE_END'
{
  "users": [
    {
      "id": 1,
      "name": "Тестовый клиент",
      "email": "ts@tsba.ru",
      "phone": "+7 999 555-22-22",
      "passwordHash": "d44b28123ed6b1e9a2a51853100f1330:bdd26f25a00b0d71aea22a9440bdecb4fb9269c937312ce1485487431799a9c7e465992fba22696ec48c1809fcafa4c63528808e688a64381236d64de9b6f6c7",
      "role": "client",
      "createdAt": "2026-07-12T16:07:18.321Z"
    },
    {
      "id": 2,
      "name": "Администратор МСВ",
      "email": "admin@msv.ru",
      "phone": "+7 926 127-39-99",
      "passwordHash": "846642c0055b35d7239b6c6e0a079775:d208f99c5c08057f2d090f6b0b3840bbb3ee9f877afdec7046d6f35026cef611d6eba8e52b3eaa75cc9fbd67268f8ab0255f50676d4e7b0d93b9e4592a3a8f7f",
      "role": "admin",
      "createdAt": "2026-07-12T16:07:18.353Z"
    }
  ],
  "rooms": [
    {
      "id": 1,
      "hostel": "МСВ Шаболовская",
      "address": "Москва, Конный пер., 12 (м. Шаболовская)",
      "type": "Место в общей комнате",
      "places": 4,
      "price": 20000,
      "gender": "Любой",
      "active": true,
      "image": "/assets/source-site/001-fd2dfed-Frame-5.png"
    },
    {
      "id": 2,
      "hostel": "Уют на Варшавке",
      "address": "Москва, Варшавское шоссе, 18к2 (м. Нагатинская)",
      "type": "Место в общей комнате",
      "places": 3,
      "price": 18000,
      "gender": "Любой",
      "active": true,
      "image": "/assets/source-site/002-3bb02eb-Frame-4.png"
    },
    {
      "id": 3,
      "hostel": "МСВ Молодёжная",
      "address": "Москва, ул. Партизанская, 40 (м. Молодёжная)",
      "type": "Место в общей комнате",
      "places": 2,
      "price": 20000,
      "gender": "Любой",
      "active": true,
      "image": "/assets/source-site/003-0afcdf6-444.png"
    }
  ],
  "bookings": [
    {
      "id": 1001,
      "userId": 1,
      "roomId": 1,
      "from": "2026-08-01",
      "to": "2027-06-30",
      "status": "Отклонено",
      "created": "12.07.2026"
    }
  ],
  "audit": [
    {
      "id": 1783873895726,
      "userId": 2,
      "action": "update",
      "entity": "booking",
      "entityId": 1001,
      "createdAt": "2026-07-12T16:31:35.726Z"
    },
    {
      "id": 1783873323432,
      "userId": 2,
      "action": "update",
      "entity": "ticket",
      "entityId": 1783873323359,
      "createdAt": "2026-07-12T16:22:03.432Z"
    },
    {
      "id": 1783873323359,
      "userId": 1,
      "action": "create",
      "entity": "ticket",
      "entityId": 1783873323359,
      "createdAt": "2026-07-12T16:22:03.359Z"
    },
    {
      "id": 1783872468194,
      "userId": 2,
      "action": "update",
      "entity": "room",
      "entityId": 1,
      "createdAt": "2026-07-12T16:07:48.194Z"
    }
  ],
  "beds": [
    {
      "id": 101,
      "roomId": 1,
      "number": "2",
      "place": "Верхнее",
      "status": "Занято",
      "userId": 1
    },
    {
      "id": 102,
      "roomId": 1,
      "number": "2",
      "place": "Нижнее",
      "status": "Свободно",
      "userId": null
    },
    {
      "id": 201,
      "roomId": 2,
      "number": "5",
      "place": "Верхнее",
      "status": "Свободно",
      "userId": null
    },
    {
      "id": 301,
      "roomId": 3,
      "number": "3",
      "place": "Нижнее",
      "status": "Свободно",
      "userId": null
    }
  ],
  "charges": [
    {
      "id": 5001,
      "userId": 1,
      "bookingId": 1001,
      "title": "Проживание в общежитии",
      "period": "Август 2026",
      "amount": 20000,
      "status": "Оплачено",
      "dueDate": "2026-08-05",
      "createdAt": "2026-07-12T16:21:19.017Z"
    }
  ],
  "payments": [
    {
      "id": 1783873299947,
      "chargeId": 5001,
      "userId": 1,
      "amount": 20000,
      "status": "CONFIRMED",
      "provider": "sandbox",
      "orderId": "MSV-5001-1783873299947",
      "createdAt": "2026-07-12T16:21:39.947Z",
      "confirmedAt": "2026-07-12T16:21:39.957Z"
    }
  ],
  "tickets": [
    {
      "id": 1783873323359,
      "userId": 1,
      "type": "?????? ???????",
      "subject": "???????? ???????",
      "message": "???????? ?????????",
      "status": "???????",
      "createdAt": "2026-07-12T16:22:03.359Z",
      "answer": "???????? ?????????",
      "updatedAt": "2026-07-12T16:22:03.432Z"
    }
  ],
  "schemaVersion": 2
}
MSV_FILE_END

cat > /opt/msv/package.json << 'MSV_FILE_END'
{
  "name": "msv-hostel-platform",
  "version": "2.0.0",
  "private": true,
  "description": "Платформа МСВ на Node.js + PostgreSQL",
  "scripts": {
    "start": "node server.js",
    "init-db": "node init-db.js",
    "check": "node --check server.js && node --check app.js && node --check init-db.js"
  },
  "engines": { "node": ">=18" },
  "dependencies": { "pg": "^8.13.0" }
}
MSV_FILE_END

echo "==> [4/8] База данных PostgreSQL..."
systemctl enable --now postgresql

# пароли: генерируем один раз, при повторном запуске переиспользуем .env
if [ -f /opt/msv/.env ]; then
  DB_PASS=$(grep -oP '(?<=postgres://msv:)[^@]+' /opt/msv/.env)
  ADMIN_PASS=$(grep -oP '(?<=^MSV_ADMIN_PASSWORD=).*' /opt/msv/.env || true)
else
  DB_PASS=$(openssl rand -hex 16)
  ADMIN_PASS=$(openssl rand -base64 12 | tr -d '+/=' | cut -c1-14)
fi
[ -n "${ADMIN_PASS:-}" ] || ADMIN_PASS=$(openssl rand -base64 12 | tr -d '+/=' | cut -c1-14)

sudo -u postgres psql -v ON_ERROR_STOP=1 << SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'msv') THEN
    CREATE ROLE msv LOGIN PASSWORD '${DB_PASS}';
  ELSE
    ALTER ROLE msv WITH PASSWORD '${DB_PASS}';
  END IF;
END
\$\$;
SQL
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='msv'" | grep -q 1 || sudo -u postgres createdb -O msv msv

cat > /opt/msv/.env << ENVEOF
DATABASE_URL=postgres://msv:${DB_PASS}@127.0.0.1:5432/msv
PORT=3031
HOST=127.0.0.1
MSV_ADMIN_PASSWORD=${ADMIN_PASS}
# Для боевого эквайринга Т-Банка добавить:
# TBANK_TERMINAL_KEY=...
# TBANK_SECRET=...
ENVEOF

echo "==> [5/8] Зависимости и инициализация БД..."
cd /opt/msv
npm install --omit=dev --no-audit --no-fund
set -a; . /opt/msv/.env; set +a
node init-db.js
chown -R msv:msv /opt/msv
chmod 640 /opt/msv/.env

echo "==> [6/8] systemd-сервис msv..."
cat > /etc/systemd/system/msv.service << 'MSV_FILE_END'
[Unit]
Description=MSV hostel platform (Node.js + PostgreSQL)
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=msv
Group=msv
WorkingDirectory=/opt/msv
EnvironmentFile=/opt/msv/.env
ExecStart=/usr/bin/node /opt/msv/server.js
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=full
ProtectHome=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
MSV_FILE_END
systemctl daemon-reload
systemctl enable --now msv
systemctl restart msv

echo "==> [7/8] nginx (reverse proxy + статика assets)..."
cat > /etc/nginx/sites-available/msv << 'MSV_FILE_END'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    client_max_body_size 5m;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    # тяжёлую статику раздаёт сам nginx
    location /assets/ {
        alias /opt/msv/assets/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:3031;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
MSV_FILE_END
ln -sf /etc/nginx/sites-available/msv /etc/nginx/sites-enabled/msv
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "==> [8/8] Файрвол (правила добавляются, но ufw не включается автоматически)..."
if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH >/dev/null 2>&1 || true
  ufw allow 'Nginx Full' >/dev/null 2>&1 || true
fi

sleep 2
STATUS=$(systemctl is-active msv || true)
IP=$(curl -s -4 --max-time 5 https://api.github.com/meta >/dev/null 2>&1; hostname -I | awk '{print $1}')

echo ""
echo "============================================================================"
echo "  ГОТОВО. Статус сервиса msv: ${STATUS}"
echo "----------------------------------------------------------------------------"
echo "  Сайт:                  http://${IP}/"
echo "  Администратор:         admin@msv.ru"
echo "  Пароль администратора: ${ADMIN_PASS}"
echo "  Тестовый клиент:       ts@tsba.ru / 555222  (удалите на бою!)"
echo "----------------------------------------------------------------------------"
echo "  ВАЖНО: сохраните пароль администратора. Он также лежит в /opt/msv/.env"
echo ""
echo "  ОСТАЛОСЬ СДЕЛАТЬ ВРУЧНУЮ:"
echo "  1) Загрузить картинки и шрифты (папка assets из архива) по SFTP"
echo "     в каталог /opt/msv/assets/  (в Termius: вкладка SFTP)."
echo "     Затем: chown -R msv:msv /opt/msv/assets"
echo "  2) Если есть домен — направить A-запись на ${IP}, затем HTTPS:"
echo "     apt-get install -y certbot python3-certbot-nginx"
echo "     certbot --nginx -d ваш-домен.ru"
echo ""
echo "  Полезные команды:"
echo "     systemctl status msv          — статус приложения"
echo "     journalctl -u msv -f          — живые логи"
echo "     systemctl restart msv         — перезапуск"
echo "     sudo -u postgres psql msv     — консоль базы данных"
echo "============================================================================"
