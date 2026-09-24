'use strict';

/* ============================================================
   МСВ — сервер
   node index.js

   Одна зависимость — pg. Всё остальное на встроенных средствах
   Node.js. Отдаёт сайт из папки web/ и API под /api/.
   ============================================================ */

const http = require('http');
const { config, assertConfig, query } = require('./lib/db');
const { createRouter, serveStatic, fail, createLimiter, clientIp, securityHeaders, loginFails } = require('./lib/http');

/* Лимиты: обычные запросы — 300 в минуту с адреса; попытки входа —
   60 в минуту, но промахов не больше двадцати (см. lib/http.js).
   Считать все входы, как раньше, нельзя: общежитие выходит в сеть
   одним адресом, и десяток честных заселяющихся запирал остальных. */
const limitAll = createLimiter({ windowMs: 60000, max: 300 });
const limitAuth = createLimiter({ windowMs: 60000, max: 60 });

const router = createRouter();
require('./routes/auth')(router.route);
require('./routes/data')(router.route);
require('./routes/tickets')(router.route);
require('./routes/content')(router.route);
require('./routes/settings')(router.route);
require('./routes/admin')(router.route);
require('./routes/resident')(router.route);
require('./routes/forms')(router.route);
require('./routes/waitlist')(router.route);
require('./routes/staff')(router.route);
require('./routes/card')(router.route);
require('./routes/holds')(router.route);

/* Бесплатные брони: раз в десять минут гасим сгоревшие и предупреждаем
   тех, у кого до конца меньше четырёх часов (решение заказчика 24.09.2026) */
const holds = require('./routes/holds');
setInterval(() => { holds.sweepHolds().catch((e) => console.error('[holds]', e.message)); }, 10 * 60 * 1000);
setTimeout(() => { holds.sweepHolds().catch(() => {}); }, 20 * 1000);

/* Пени за просрочку оплаты. Пересчёт идемпотентный — можно гонять часто,
   лишнего не начислит (правило заказчика, 24.09.2026) */
const penalty = require('./lib/penalty');
setInterval(() => { penalty.sweepPenalties().catch((e) => console.error('[penalty]', e.message)); }, 60 * 60 * 1000);
setTimeout(() => { penalty.sweepPenalties().catch(() => {}); }, 40 * 1000);

/* Неоплаченное место уходит в продажу само: 14-го предупреждение,
   16-го — на продажу и письмо резиденту (решение заказчика 24.09.2026) */
const sale = require('./lib/sale');
setInterval(() => { sale.sweepSale().catch((e) => console.error('[sale]', e.message)); }, 60 * 60 * 1000);
setTimeout(() => { sale.sweepSale().catch(() => {}); }, 60 * 1000);

/* Выехал — на следующий день доступ в кабинет закрывается. Данные
   остаются: отключаем запись, а не удаляем (решение заказчика 25.09.2026) */
const access = require('./lib/access');
setInterval(() => { access.sweepAccess().catch((e) => console.error('[access]', e.message)); }, 60 * 60 * 1000);
setTimeout(() => { access.sweepAccess().catch(() => {}); }, 80 * 1000);

// Проверка живости — для nginx и для себя
router.route('GET', '/api/health', async (req, res) => {
  try {
    /* Отдаём и дату базы: по ней самопроверка видит, что сервер живёт
       по Москве, а не по Гринвичу. Из-за этого расхождения система
       считала, что выехавший ещё живёт (найдено 25.09.2026). */
    const d = await query('SELECT CURRENT_DATE::text AS today');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, today: d.rows[0].today }));
  } catch (e) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'база недоступна' }));
  }
});

const server = http.createServer(async (req, res) => {
  const started = Date.now();
  try {
    securityHeaders(res);

    const ip = clientIp(req);
    if (!limitAll(ip)) return fail(res, 429, 'Слишком много запросов. Подожди минуту.');
    if (req.url.startsWith('/api/auth/verify-pin')) {
      if (!limitAuth(ip)) return fail(res, 429, 'Слишком много попыток входа. Подожди минуту.');
      if (!loginFails.ok(ip)) {
        return fail(res, 429, 'С этого адреса слишком много неверных кодов. Подожди минуту.');
      }
    }

    const handled = await router.dispatch(req, res);
    if (handled !== false) return;

    if (req.path.startsWith('/api/')) return fail(res, 404, 'Нет такого адреса');
    if (req.method !== 'GET' && req.method !== 'HEAD') return fail(res, 405, 'Метод не поддерживается');

    /* Адрес /uploads/… остаётся прежним, а файлы берутся из своей
       папки: страницам и записям в базе ничего менять не нужно. */
    if (req.path.startsWith('/uploads/')) {
      req.path = req.path.slice('/uploads'.length);
      if (!serveStatic(config.uploadDir, req, res)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Файл не найден');
      }
      return;
    }

    if (!serveStatic(config.webDir, req, res)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Страница не найдена');
    }
  } catch (err) {
    console.error(`[${req.method} ${req.url}]`, err);
    if (!res.headersSent) fail(res, 500, 'Ошибка сервера');
  } finally {
    if (process.env.LOG_REQUESTS === '1') {
      console.log(`${req.method} ${req.url} ${res.statusCode} ${Date.now() - started}мс`);
    }
  }
});

function start() {
  assertConfig();
  server.listen(config.port, () => {
    console.log(`МСВ сервер: http://localhost:${config.port}`);
    console.log(`сайт из: ${config.webDir}`);
    if (config.demoMode) console.log('ВНИМАНИЕ: DEMO_MODE=1 — код 7777 открывает вход. Перед запуском выключить.');
  });
}

// Корректно закрываемся по сигналу от systemd
process.on('SIGTERM', () => { server.close(() => process.exit(0)); });

if (require.main === module) start();

module.exports = { server, router };
