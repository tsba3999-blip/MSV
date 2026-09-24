'use strict';

/* ============================================================
   /api/staff — сотрудники и зарплаты

   GET  /api/staff                    — список с анкетой (администратор)
   POST /api/staff                    — новый сотрудник + код входа (администратор)
   PATCH /api/staff/:id               — анкета сотрудника (администратор)
   GET  /api/users/:id/files          — документы сотрудника (администратор)
   GET  /api/payroll                  — свои начисления (сотрудник) / все (администратор)
   POST /api/payroll                  — «Начислено» (ТОЛЬКО администратор)
   POST /api/payroll/:id/received     — «Получил» (сотрудник, своё)

   Модератор к зарплатам доступа не имеет вообще — ни чтения, ни записи.
   ============================================================ */

const auth = require('../lib/auth');
const notify = require('../lib/notify');
const { json, fail, readJson } = require('../lib/http');
const { query, tx } = require('../lib/db');

function adminOnly(req, res) {
  const s = auth.readSession(req);
  if (!s) { fail(res, 401, 'Не выполнен вход'); return null; }
  if (s.role !== 'admin') { fail(res, 403, 'Только администратор'); return null; }
  return s;
}
const iso = (d) => d ? (typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10)) : null;

module.exports = function register(route) {

  route('GET', '/api/staff', async (req, res) => {
    if (!adminOnly(req, res)) return;
    const r = await query(`
      SELECT u.id, u.name, u.role, u.phone, u.email, p.position, p.place, p.birthday, p.started_at, p.salary, p.pay_to, p.relation, p.can_edit_shahmatka
      FROM users u LEFT JOIN staff_profiles p ON p.user_id = u.id
      WHERE u.role IN ('staff', 'moderator') AND u.is_active ORDER BY u.name`);
    json(res, 200, r.rows.map((x) => ({ id: String(x.id), userId: String(x.id), name: x.name, role: x.role, phone: x.phone, email: x.email,
      position: x.position || '', place: x.place || '', birthday: iso(x.birthday), started: iso(x.started_at),
      salary: x.salary, payTo: x.pay_to || '', relation: x.relation || '', canEditShahmatka: !!x.can_edit_shahmatka })));
  });

  route('POST', '/api/staff', async (req, res) => {
    const s = adminOnly(req, res); if (!s) return;
    const b = await readJson(req);
    const name = String(b.name || '').trim(); if (!name) return fail(res, 400, 'Нужны фамилия и имя');
    const contact = auth.normalizeContact(b.contact);
    if (!contact) return fail(res, 400, 'Нужен телефон или почта для входа');
    const bad = auth.validPin(b.pin); if (bad) return fail(res, 400, bad);
    /* Администратора тоже нужно уметь заводить: иначе единственный
       администратор — тот, что появился при первой установке, и владелец
       не может создать себе учётную запись. Заводить администратора может
       только администратор (24.09.2026). */
    const ROLES = ['staff', 'moderator', 'admin'];
    const role = ROLES.indexOf(b.role) >= 0 ? b.role : 'staff';
    const out = await tx(async (q) => {
      const col = contact.kind === 'email' ? 'email' : 'phone';
      const u = await q(`INSERT INTO users (role, name, ${col}, invited_by, invited_at) VALUES ($1, $2, $3, $4, now()) RETURNING id`, [role, name, contact.value, s.uid]);
      const id = u.rows[0].id;
      await q(`INSERT INTO staff_profiles (user_id, position, place, birthday, started_at, salary, pay_to, relation)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [id, String(b.position || '').slice(0, 100), b.place || null, b.birthday || null, b.started || null,
         Number.isInteger(b.salary) ? b.salary : null, String(b.payTo || '').slice(0, 200), String(b.relation || '').slice(0, 100)]);
      return id;
    });
    await auth.setPin(out, b.pin);
    await query(`INSERT INTO audit_log (actor_id, action, target, payload) VALUES ($1, 'staff.create', $2, $3)`, [s.uid, 'user:' + out, JSON.stringify({ name, role })]);
    json(res, 201, { id: String(out) });
  });

  route('PATCH', '/api/staff/:id', async (req, res) => {
    const s = adminOnly(req, res); if (!s) return;
    const uid = Number(req.params.id); const b = await readJson(req);
    await query(`INSERT INTO staff_profiles (user_id, position, place, birthday, started_at, salary, pay_to, relation, can_edit_shahmatka, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, false), now())
      ON CONFLICT (user_id) DO UPDATE SET
        position = COALESCE(EXCLUDED.position, staff_profiles.position), place = COALESCE(EXCLUDED.place, staff_profiles.place),
        birthday = COALESCE(EXCLUDED.birthday, staff_profiles.birthday), started_at = COALESCE(EXCLUDED.started_at, staff_profiles.started_at),
        salary = COALESCE(EXCLUDED.salary, staff_profiles.salary), pay_to = COALESCE(EXCLUDED.pay_to, staff_profiles.pay_to),
        relation = COALESCE(EXCLUDED.relation, staff_profiles.relation),
        can_edit_shahmatka = COALESCE($9, staff_profiles.can_edit_shahmatka), updated_at = now()`,
      [uid, b.position ?? null, b.place ?? null, b.birthday ?? null, b.started ?? null, Number.isInteger(b.salary) ? b.salary : null,
       b.payTo ?? null, b.relation ?? null, typeof b.canEditShahmatka === 'boolean' ? b.canEditShahmatka : null]);
    await query(`INSERT INTO audit_log (actor_id, action, target, payload) VALUES ($1, 'staff.update', $2, $3)`, [s.uid, 'user:' + uid, JSON.stringify(b)]);
    json(res, 200, { ok: true });
  });

  route('GET', '/api/users/:id/files', async (req, res) => {
    if (!adminOnly(req, res)) return;
    const r = await query(`SELECT id, kind, url, uploaded_at FROM resident_files WHERE user_id = $1 ORDER BY uploaded_at DESC`, [Number(req.params.id)]);
    json(res, 200, r.rows.map((x) => ({ id: String(x.id), kind: x.kind, url: x.url, at: x.uploaded_at })));
  });

  /* ---------- Зарплата ---------- */

  route('GET', '/api/payroll', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');
    if (s.role === 'moderator') return fail(res, 403, 'Зарплаты видит только администратор');
    const mine = s.role !== 'admin';
    const r = await query(`SELECT p.*, u.name FROM payroll p JOIN users u ON u.id = p.user_id ${mine ? 'WHERE p.user_id = $1' : ''} ORDER BY p.paid_at DESC LIMIT 200`, mine ? [s.uid] : []);
    json(res, 200, r.rows.map((x) => ({ id: String(x.id), userId: String(x.user_id), name: x.name, period: x.period, amount: x.amount, bonus: x.bonus,
      total: x.amount + x.bonus, paidAt: x.paid_at, receivedAt: x.received_at })));
  });

  route('POST', '/api/payroll', async (req, res) => {
    const s = adminOnly(req, res); if (!s) return;
    const b = await readJson(req);
    const uid = Number(b.userId), amount = Number(b.amount), bonus = Number(b.bonus) || 0;
    if (!Number.isInteger(uid) || !Number.isInteger(amount) || amount <= 0 || bonus < 0) return fail(res, 400, 'Нужны сотрудник и сумма');
    const period = String(b.period || '').trim().slice(0, 80); if (!period) return fail(res, 400, 'Укажи период');
    const r = await query(`INSERT INTO payroll (user_id, period, amount, bonus, paid_by) VALUES ($1, $2, $3, $4, $5) RETURNING id`, [uid, period, amount, bonus, s.uid]);
    await query(`INSERT INTO audit_log (actor_id, action, target, payload) VALUES ($1, 'payroll.add', $2, $3)`, [s.uid, 'user:' + uid, JSON.stringify({ period, amount, bonus })]);
    json(res, 201, { id: String(r.rows[0].id) });

    const text = `Начислена зарплата: ${period} — ${amount.toLocaleString('ru-RU')} руб.${bonus ? ' Премия ' + bonus.toLocaleString('ru-RU') + ' руб.' : ''} Когда деньги придут, нажмите «Получил» в разделе «Мои зарплаты».`;
    query(`INSERT INTO notices (user_id, kind, text) VALUES ($1, 'ok', $2)`, [uid, text]).catch(() => {});
    // сотруднику — в Telegram, если он подключил бота (канал резидента работает и для сотрудников)
    query(`SELECT tg_chat_id FROM users WHERE id = $1`, [uid]).then((u) => {
      if (u.rows[0] && u.rows[0].tg_chat_id) return notify.sendTelegram(u.rows[0].tg_chat_id, text);
    }).catch(() => {});
  });

  route('POST', '/api/payroll/:id/received', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');
    const r = await query(`UPDATE payroll SET received_at = now() WHERE id = $1 AND user_id = $2 AND received_at IS NULL RETURNING id`, [Number(req.params.id), s.uid]);
    if (!r.rows[0]) return fail(res, 404, 'Начисление не найдено или уже отмечено');
    json(res, 200, { ok: true });
  });
};
