'use strict';

/* ============================================================
   HTTP-каркас без внешних библиотек

   Разбор JSON-тела, ответы, маршруты с параметрами и отдача
   статических файлов сайта. Ровно столько, сколько нужно.
   ============================================================ */

const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

/* ---------- Ответы ---------- */

function json(res, status, data, headers) {
  const body = JSON.stringify(data);
  res.writeHead(status, Object.assign({
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  }, headers || {}));
  res.end(body);
}

function fail(res, status, message) {
  json(res, status, { error: message });
}

/* ---------- Тело запроса ---------- */

function readJson(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > (limit || 256 * 1024)) { reject(new Error('Слишком большой запрос')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch (e) { reject(new Error('Тело запроса — не JSON')); }
    });
    req.on('error', reject);
  });
}

/* ---------- Маршруты ----------
   route('GET', '/api/tickets/:id', handler). Параметры пути
   попадают в req.params, строка запроса — в req.query. */

function createRouter() {
  const routes = [];

  function route(method, pattern, handler) {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/\/:(\w+)/g, (_, k) => { keys.push(k); return '/([^/]+)'; }) + '/?$');
    routes.push({ method, re, keys, handler });
  }

  async function dispatch(req, res) {
    const url = new URL(req.url, 'http://localhost');
    req.path = url.pathname;
    req.query = Object.fromEntries(url.searchParams.entries());

    for (const r of routes) {
      if (r.method !== req.method) continue;
      const m = r.re.exec(req.path);
      if (!m) continue;
      req.params = {};
      r.keys.forEach((k, i) => { req.params[k] = decodeURIComponent(m[i + 1]); });
      return r.handler(req, res);
    }
    return false;   // маршрут не найден
  }

  return { route, dispatch };
}

/* ---------- Статика ----------
   Отдаём файлы сайта. Путь нормализуется, чтобы ../ не выводил
   за пределы папки. Для / — index.html. */

function serveStatic(root, req, res) {
  let rel = decodeURIComponent(req.path);
  if (rel === '/') rel = '/index.html';

  const file = path.normalize(path.join(root, rel));
  if (!file.startsWith(root)) { fail(res, 403, 'Нет доступа'); return true; }

  let stat;
  try { stat = fs.statSync(file); } catch (e) { return false; }
  if (!stat.isFile()) return false;

  const ext = path.extname(file).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  // HTML не кэшируем — правки должны быть видны сразу; остальное — на час
  const cache = ext === '.html' ? 'no-cache' : 'public, max-age=3600';

  res.writeHead(200, { 'Content-Type': type, 'Content-Length': stat.size, 'Cache-Control': cache });
  fs.createReadStream(file).pipe(res);
  return true;
}

/* ---------- Ограничение частоты ----------
   Считаем запросы с одного адреса за окно. Против массового
   выкачивания сайта скриптом и перебора кодов входа. Честный
   посетитель в лимит не упирается: он открывает страницу за страницей,
   а не сотню за секунду. */

function createLimiter(opts) {
  const windowMs = (opts && opts.windowMs) || 60000;
  const max = (opts && opts.max) || 300;
  const hits = new Map();

  // раз в минуту чистим устаревшие записи, чтобы память не росла
  setInterval(() => {
    const now = Date.now();
    for (const [ip, h] of hits) if (now - h.start > windowMs) hits.delete(ip);
  }, 60000).unref();

  return function check(ip) {
    const now = Date.now();
    let h = hits.get(ip);
    if (!h || now - h.start > windowMs) { h = { start: now, n: 0 }; hits.set(ip, h); }
    h.n++;
    return h.n <= max;
  };
}

function clientIp(req) {
  // за nginx настоящий адрес — в заголовке
  const fwd = req.headers['x-forwarded-for'];
  return (fwd ? String(fwd).split(',')[0].trim() : req.socket.remoteAddress) || '';
}

/* Заголовки, которые не дают встраивать сайт в чужие страницы и
   исполнять скрипты с посторонних доменов. */
function securityHeaders(res) {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'self'");
}

module.exports = { json, fail, readJson, createRouter, serveStatic, createLimiter, clientIp, securityHeaders };
