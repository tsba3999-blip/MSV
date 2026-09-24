'use strict';

/* ============================================================
   /api/settings — настройки сайта (администратор)
   /api/notify/test — проверочное сообщение в служебный чат
   /api/telegram/webhook — входящие от бота

   GET  /api/settings              → { key: value, … }
   POST /api/settings { key: value } → { ok }
   POST /api/notify/test           → { ok } | { error }
   POST /api/telegram/webhook      → 200 всегда (Telegram ждёт быстрый ответ)
   ============================================================ */

const auth = require('../lib/auth');
const notify = require('../lib/notify');
const { json, fail, readJson } = require('../lib/http');
const { query, tx } = require('../lib/db');

/* Что разрешено менять через API и какие значения допустимы */
const ALLOWED = {
  backup_every_days: (v) => /^\d{1,2}$/.test(v) && +v >= 1 && +v <= 30,
  backup_keep: (v) => /^\d{1,2}$/.test(v) && +v >= 1 && +v <= 30,
  tg_bot_token: (v) => v === '' || /^\d+:[\w-]{30,}$/.test(v),
  tg_admin_chat: (v) => v === '' || /^-?\d+$/.test(v),
  notify_admin_tickets: (v) => v === '0' || v === '1',
  notify_admin_partners: (v) => v === '0' || v === '1',
  notify_admin_debts: (v) => v === '0' || v === '1',
  notify_resident_pay: (v) => v === '0' || v === '1',
  notify_resident_tickets: (v) => v === '0' || v === '1',
  notify_resident_news: (v) => v === '0' || v === '1',
  /* Денежные правила включаются, когда в системе есть все оплаты и
     депозиты: до этого «не оплачено» означает «ещё не внесли» (24.09.2026) */
  auto_penalty: (v) => v === '0' || v === '1',
  auto_sale: (v) => v === '0' || v === '1'
};

module.exports = function register(route) {

  route('GET', '/api/settings', async (req, res) => {
    const s = auth.readSession(req);
    if (!s || !auth.atLeast(s, 'admin')) return fail(res, 403, 'Настройки — только для администратора');
    const r = await query(`SELECT key, value FROM settings`);
    const out = {};
    r.rows.forEach((x) => { out[x.key] = x.key === 'tg_bot_token' && x.value ? '••••' + x.value.slice(-6) : x.value; });
    json(res, 200, out);
  });

  route('POST', '/api/settings', async (req, res) => {
    const s = auth.readSession(req);
    if (!s || !auth.atLeast(s, 'admin')) return fail(res, 403, 'Настройки — только для администратора');
    const body = await readJson(req);

    const entries = Object.entries(body || {}).filter(([k]) => ALLOWED[k]);
    if (!entries.length) return fail(res, 400, 'Нечего сохранять');
    for (const [k, v] of entries) {
      if (typeof v !== 'string' || !ALLOWED[k](v)) return fail(res, 400, 'Недопустимое значение: ' + k);
    }

    await tx(async (q) => {
      for (const [k, v] of entries) {
        // токен с точками — это замаскированный старый, его не трогаем
        if (k === 'tg_bot_token' && v.startsWith('••••')) continue;
        await q(`INSERT INTO settings (key, value, updated_by) VALUES ($1, $2, $3)
                 ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()`,
          [k, v, s.uid]);
      }
      await q(`INSERT INTO audit_log (actor_id, action, target, payload) VALUES ($1, 'settings.update', 'settings', $2)`,
        [s.uid, JSON.stringify(entries.map(([k]) => k))]);
    });
    json(res, 200, { ok: true });
  });

  route('POST', '/api/notify/test', async (req, res) => {
    const s = auth.readSession(req);
    if (!s || !auth.atLeast(s, 'admin')) return fail(res, 403, 'Только администратор');
    const chat = await notify.setting('tg_admin_chat');
    try {
      await notify.sendTelegram(chat, 'МСВ: проверка связи. Уведомления настроены.');
      json(res, 200, { ok: true });
    } catch (e) {
      fail(res, 400, e.message);
    }
  });

  /* Telegram шлёт сюда входящие. Отвечаем 200 сразу, обрабатываем как можем:
     иначе Telegram будет повторять запрос. */
  route('POST', '/api/telegram/webhook', async (req, res) => {
    let update = {};
    try { update = await readJson(req); } catch (e) { /* пустое тело */ }
    json(res, 200, { ok: true });
    notify.handleWebhook(update).catch((e) => console.error('[telegram]', e.message));
  });
};
