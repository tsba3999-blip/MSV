'use strict';

/* ============================================================
   Уведомления

   Три канала: Telegram, Max, почта. Telegram работает через Bot API
   без сторонних библиотек. Почта и Max — с готовым местом: подключить
   провайдера, дописать одну функцию.

   Виды сообщений и кому они идут — из таблицы settings, их меняет
   администратор в разделе «Настройки». Каждая отправка пишется
   в notify_log: видно, что дошло, а что нет.

   Как резидент получает Telegram-уведомления: он должен один раз
   написать боту — тогда сервер узнаёт его chat_id. Удобнее всего
   дать ссылку t.me/<бот>?start=<телефон> — резидент нажимает,
   бот получает /start с телефоном и связывает чат с учётной записью.
   Это делает вебхук /api/telegram/webhook.
   ============================================================ */

const https = require('https');
const { query } = require('./db');

/* ---------- Настройки ---------- */

async function setting(key, fallback) {
  const r = await query(`SELECT value FROM settings WHERE key = $1`, [key]);
  return r.rows[0] ? r.rows[0].value : (fallback === undefined ? '' : fallback);
}

async function enabled(key) {
  return (await setting(key, '0')) === '1';
}

/* ---------- Telegram ---------- */

function tgCall(token, method, payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const req = https.request({
      hostname: 'api.telegram.org', path: `/bot${token}/${method}`, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
      timeout: 10000
    }, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          j.ok ? resolve(j.result) : reject(new Error(j.description || 'Telegram: ошибка'));
        } catch (e) { reject(new Error('Telegram: неверный ответ')); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error('Telegram: нет ответа')); });
    req.write(body);
    req.end();
  });
}

async function sendTelegram(chatId, text) {
  const token = await setting('tg_bot_token');
  if (!token) throw new Error('Не задан токен бота (Настройки → Telegram)');
  if (!chatId) throw new Error('Нет chat_id получателя');
  return tgCall(token, 'sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true });
}

/* ---------- Почта и Max: место под провайдера ---------- */

async function sendEmail(to, subject, text) {
  // ЗДЕСЬ БУДЕТ ПРОВАЙДЕР: SMTP или почтовый сервис (Unisender, SendGrid, свой Postfix).
  // Сигнатура уже согласована с остальным кодом — менять придётся только тело.
  throw new Error('Почта ещё не подключена');
}

async function sendMax(phone, text) {
  // ЗДЕСЬ БУДЕТ MAX: у мессенджера есть Bot API, формат уточнить в документации.
  throw new Error('Max ещё не подключён');
}

/* ---------- Журнал ---------- */

async function log(userId, channel, kind, text, ok, error) {
  try {
    await query(`INSERT INTO notify_log (user_id, channel, kind, text, ok, error) VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId || null, channel, kind, text.slice(0, 2000), ok, error ? String(error).slice(0, 500) : null]);
  } catch (e) { console.error('[notify] журнал:', e.message); }
}

/* ---------- Администрации ---------- */

/* Сообщение в служебный чат. kind — 'tickets', 'partners', 'debts':
   каждый вид включается отдельно в настройках. */
async function notifyAdmin(kind, text) {
  if (!(await enabled('notify_admin_' + kind))) return { skipped: true };
  const chat = await setting('tg_admin_chat');
  try {
    await sendTelegram(chat, text);
    await log(null, 'tg', 'admin.' + kind, text, true);
    return { ok: true };
  } catch (e) {
    await log(null, 'tg', 'admin.' + kind, text, false, e.message);
    return { ok: false, error: e.message };
  }
}

/* ---------- Резиденту ---------- */

/* kind — 'pay', 'tickets', 'news'. Идёт во все каналы, которые резидент
   указал в анкете и до которых сервер умеет достучаться. */
async function notifyResident(userId, kind, text) {
  if (!(await enabled('notify_resident_' + kind))) return { skipped: true };

  const r = await query(`
    SELECT u.email, u.phone, u.tg_chat_id, COALESCE(p.messengers, '{}') AS messengers
    FROM users u LEFT JOIN resident_profiles p ON p.user_id = u.id WHERE u.id = $1`, [userId]);
  const u = r.rows[0];
  if (!u) return { ok: false, error: 'Нет пользователя' };

  const results = [];
  const wants = (ch) => (u.messengers || []).indexOf(ch) !== -1;

  if (wants('tg')) {
    try { await sendTelegram(u.tg_chat_id, text); await log(userId, 'tg', kind, text, true); results.push('tg'); }
    catch (e) { await log(userId, 'tg', kind, text, false, e.message); }
  }
  if (wants('max')) {
    try { await sendMax(u.phone, text); await log(userId, 'max', kind, text, true); results.push('max'); }
    catch (e) { await log(userId, 'max', kind, text, false, e.message); }
  }
  if (u.email) {
    try { await sendEmail(u.email, 'МСВ', text); await log(userId, 'email', kind, text, true); results.push('email'); }
    catch (e) { await log(userId, 'email', kind, text, false, e.message); }
  }
  return { ok: results.length > 0, sent: results };
}

/* ---------- Вебхук Telegram: связать чат с резидентом ---------- */

/* Резидент нажимает t.me/<бот>?start=79990001122 → бот получает
   «/start 79990001122» → находим пользователя по телефону, запоминаем chat_id. */
async function handleWebhook(update) {
  const msg = update && update.message;
  if (!msg || !msg.text) return;
  const m = /^\/start\s+(\d{10,11})/.exec(msg.text.trim());
  const token = await setting('tg_bot_token');
  if (!token) return;

  if (!m) {
    await tgCall(token, 'sendMessage', { chat_id: msg.chat.id,
      text: 'Это бот МСВ. Чтобы получать уведомления, открой ссылку из своего кабинета на сайте.' });
    return;
  }

  let d = m[1];
  if (d.length === 11 && d[0] === '8') d = '7' + d.slice(1);
  if (d.length === 10) d = '7' + d;
  const phone = '+' + d;

  const r = await query(`UPDATE users SET tg_chat_id = $1 WHERE phone = $2 AND is_active RETURNING name`, [msg.chat.id, phone]);
  const text = r.rows[0]
    ? `Готово, ${r.rows[0].name}. Теперь уведомления МСВ будут приходить сюда.`
    : 'Не нашли резидента с таким телефоном. Проверь номер в кабинете.';
  await tgCall(token, 'sendMessage', { chat_id: msg.chat.id, text });
}

module.exports = { setting, sendTelegram, notifyAdmin, notifyResident, handleWebhook };
