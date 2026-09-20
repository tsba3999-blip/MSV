'use strict';

/* ============================================================
   /api/content — правки содержимого страниц (карандаш)
   /api/partners — заявки владельцев объектов

   GET  /api/content?page=index.html        → [{ key, html }]   (всем)
   POST /api/content { page, changes:[…] }   → { ok }           (модератор+)
   POST /api/partners { name, city, person, contact } → { ok }  (всем)
   ============================================================ */

const auth = require('../lib/auth');
const { json, fail, readJson } = require('../lib/http');
const { query, tx } = require('../lib/db');
const notify = require('../lib/notify');

/* Убираем то, что не должно попасть на страницу из редактора:
   скрипты, обработчики событий, javascript:-ссылки. Модератор —
   свой человек, но одной ошибки достаточно, чтобы сломать сайт всем. */
function sanitize(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi, '$1=$2#$2')
    .slice(0, 20000);
}

function validPage(p) { return /^[\w.-]+\.html$/.test(String(p || '')); }
function validKey(k) { return /^[a-z0-9]+:\d+(\/[a-z0-9]+:\d+)*$/.test(String(k || '')) && k.length < 400; }

module.exports = function register(route) {

  route('GET', '/api/content', async (req, res) => {
    const page = req.query.page;
    if (!validPage(page)) return fail(res, 400, 'Укажи страницу');
    const r = await query(`SELECT key, html FROM content_overrides WHERE page = $1`, [page]);
    json(res, 200, r.rows, { 'Cache-Control': 'no-cache' });
  });

  /* Сколько правок на странице, кто и когда правил последним */
  route('GET', '/api/content/meta', async (req, res) => {
    const page = req.query.page;
    if (!validPage(page)) return fail(res, 400, 'Укажи страницу');
    const r = await query(`
      SELECT count(*)::int AS count,
             (SELECT u.name FROM content_overrides c2 LEFT JOIN users u ON u.id = c2.updated_by
              WHERE c2.page = $1 ORDER BY c2.updated_at DESC LIMIT 1) AS last_by,
             max(updated_at) AS last_at
      FROM content_overrides WHERE page = $1`, [page]);
    const m = r.rows[0] || {};
    json(res, 200, { count: m.count || 0, lastBy: m.last_by || null, lastAt: m.last_at || null });
  });

  route('POST', '/api/content', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');
    if (!auth.atLeast(s, 'moderator')) return fail(res, 403, 'Правка содержимого — для администратора и модератора');

    const b = await readJson(req);
    if (!validPage(b.page)) return fail(res, 400, 'Неверная страница');
    const changes = Array.isArray(b.changes) ? b.changes : [];
    if (!changes.length) return fail(res, 400, 'Нечего сохранять');
    if (changes.length > 200) return fail(res, 400, 'Слишком много правок за раз');
    for (const c of changes) if (!validKey(c.key)) return fail(res, 400, 'Неверный ключ элемента');

    await tx(async (q) => {
      for (const c of changes) {
        await q(`INSERT INTO content_overrides (page, key, html, updated_by)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (page, key) DO UPDATE SET html = EXCLUDED.html,
                   updated_by = EXCLUDED.updated_by, updated_at = now()`,
          [b.page, c.key, sanitize(c.html), s.uid]);
      }
      await q(`INSERT INTO audit_log (actor_id, action, target, payload) VALUES ($1, 'content.edit', $2, $3)`,
        [s.uid, 'page:' + b.page, JSON.stringify({ count: changes.length })]);
    });

    json(res, 200, { ok: true, saved: changes.length });
  });

  route('POST', '/api/partners', async (req, res) => {
    const b = await readJson(req);
    const name = String(b.name || '').trim(), contact = String(b.contact || '').trim();
    if (!name || !contact) return fail(res, 400, 'Нужны название объекта и контакт');
    await query(`INSERT INTO partner_requests (object_name, city, person, contact) VALUES ($1, $2, $3, $4)`,
      [name.slice(0, 200), String(b.city || '').slice(0, 100), String(b.person || '').slice(0, 200), contact.slice(0, 200)]);
    json(res, 201, { ok: true });
    // в служебный чат — не дожидаясь: ответ заявителю уже ушёл
    notify.notifyAdmin('partners', `<b>Новая заявка на подключение</b>\n${name}${b.city ? ', ' + b.city : ''}\n${b.person || ''} · ${contact}`)
      .catch(() => {});
  });
};
