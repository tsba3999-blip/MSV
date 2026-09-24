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
      SELECT u.id, u.name, u.role, u.phone, u.email, u.photo_url, p.position, p.place, p.birthday, p.started_at, p.salary, p.pay_to, p.relation, p.can_edit_shahmatka, p.can_payroll
      FROM users u LEFT JOIN staff_profiles p ON p.user_id = u.id
      WHERE u.role IN ('staff', 'moderator', 'admin') AND u.is_active ORDER BY u.name`);
    json(res, 200, r.rows.map((x) => ({ id: String(x.id), userId: String(x.id), name: x.name, role: x.role, phone: x.phone, email: x.email,
      position: x.position || '', place: x.place || '', birthday: iso(x.birthday), started: iso(x.started_at),
      salary: x.salary, payTo: x.pay_to || '', relation: x.relation || '',
      photo: x.photo_url || '',
      canEditShahmatka: !!x.can_edit_shahmatka, canPayroll: !!x.can_payroll })));
  });

  /* Своя анкета сотрудника. Раньше данные в ней были зашиты в вёрстку —
     у администратора всегда «Соколова Ирина Андреевна», у сотрудника
     «Ким Сергей Владимирович», кто бы ни вошёл, — а кнопка «Сохранить»
     только писала «Сохранено» и ничего не сохраняла (24.09.2026). */
  route('GET', '/api/me/staff', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');
    const r = await query(`
      SELECT u.name, u.role, u.phone, u.email,
             p.position, p.place, p.started_at, p.relation, p.salary
        FROM users u LEFT JOIN staff_profiles p ON p.user_id = u.id
       WHERE u.id = $1`, [s.uid]);
    const x = r.rows[0];
    if (!x) return fail(res, 404, 'Нет учётной записи');

    /* «Резиденции» показываем словами, а не кодом */
    let place = '';
    if (x.place === 'all' || x.role === 'admin' || x.role === 'moderator') {
      const all = await query(`SELECT title, name FROM residences ORDER BY id`);
      place = all.rows.map((y) => y.title || y.name).join(', ');
    } else if (x.place) {
      const one = await query(`SELECT title, name FROM residences WHERE id = $1`, [x.place]);
      place = one.rows[0] ? (one.rows[0].title || one.rows[0].name) : x.place;
    }

    json(res, 200, {
      name: x.name || '', role: x.role, phone: x.phone || '', email: x.email || '',
      position: x.position || '', place, started: iso(x.started_at), relation: x.relation || '',
      salary: x.salary === null || x.salary === undefined ? null : Number(x.salary)
    });
  });

  /* Правит сотрудник сам: имя, телефон, почту и должность. Остальное —
     резиденции, дата выхода, зарплата — меняет администратор. */
  route('PUT', '/api/me/staff', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');
    const b = await readJson(req);
    const name = String(b.name || '').trim();
    if (!name) return fail(res, 400, 'Нужны фамилия и имя');

    const phone = String(b.phone || '').trim();
    const email = String(b.email || '').trim();
    if (phone && !auth.normalizeContact(phone)) return fail(res, 400, 'Проверь телефон');
    if (email && !auth.normalizeContact(email)) return fail(res, 400, 'Проверь почту');

    try {
      await query(`UPDATE users SET name = $1, phone = NULLIF($2, ''), email = NULLIF($3, '') WHERE id = $4`,
        [name.slice(0, 200), phone.slice(0, 30), email.slice(0, 200), s.uid]);
    } catch (e) {
      if (e.code === '23505') return fail(res, 409, 'Такой телефон или почта уже заняты');
      throw e;
    }
    await query(`INSERT INTO staff_profiles (user_id, position, updated_at) VALUES ($1, $2, now())
                 ON CONFLICT (user_id) DO UPDATE SET position = EXCLUDED.position, updated_at = now()`,
      [s.uid, String(b.position || '').slice(0, 100)]);
    await query(`INSERT INTO audit_log (actor_id, action, target, payload) VALUES ($1, 'staff.self', $2, $3)`,
      [s.uid, 'user:' + s.uid, JSON.stringify({ name, position: b.position || '' })]);
    json(res, 200, { ok: true });
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

    /* Имя и контакт для входа тоже правит администратор: при заведении
       сотрудника контакт мог быть временным, а сменить его было нечем
       (24.09.2026). Контакт — это логин, поэтому проверяем и ловим
       занятость. */
    if (b.name !== undefined || b.phone !== undefined || b.email !== undefined) {
      const name = b.name === undefined ? null : String(b.name).trim().slice(0, 200);
      const phone = b.phone === undefined ? null : String(b.phone).trim();
      const email = b.email === undefined ? null : String(b.email).trim();
      if (name !== null && !name) return fail(res, 400, 'Нужны фамилия и имя');
      if (phone) { const c = auth.normalizeContact(phone); if (!c) return fail(res, 400, 'Проверь телефон'); }
      if (email) { const c = auth.normalizeContact(email); if (!c) return fail(res, 400, 'Проверь почту'); }
      try {
        await query(`UPDATE users SET
                       name  = COALESCE($2, name),
                       phone = CASE WHEN $3::text IS NULL THEN phone ELSE NULLIF($3, '') END,
                       email = CASE WHEN $4::text IS NULL THEN email ELSE NULLIF($4, '') END
                     WHERE id = $1`, [uid, name, phone, email]);
      } catch (e) {
        if (e.code === '23505') return fail(res, 409, 'Такой телефон или почта уже заняты');
        throw e;
      }
    }
    /* Роль — это права. Меняет её только администратор и только чужую:
       сняв роль с себя, человек запер бы сам себя снаружи. Последнего
       администратора понизить нельзя по той же причине — иначе права
       менять станет некому (решение заказчика 25.09.2026). */
    if (b.role !== undefined) {
      const ROLES = ['staff', 'moderator', 'admin'];
      if (ROLES.indexOf(b.role) < 0) return fail(res, 400, 'Неизвестная роль');
      if (uid === Number(s.uid)) return fail(res, 400, 'Свою роль менять нельзя — попросите второго администратора');
      const cur = await query(`SELECT role FROM users WHERE id = $1`, [uid]);
      if (!cur.rows[0]) return fail(res, 404, 'Учётная запись не найдена');
      if (cur.rows[0].role === 'admin' && b.role !== 'admin') {
        const n = await query(`SELECT count(*)::int n FROM users WHERE role = 'admin' AND is_active`);
        if (n.rows[0].n <= 1) return fail(res, 400, 'Это последний администратор — менять роль некому будет');
      }
      await query(`UPDATE users SET role = $2 WHERE id = $1`, [uid, b.role]);
    }

    await query(`INSERT INTO staff_profiles (user_id, position, place, birthday, started_at, salary, pay_to, relation, can_edit_shahmatka, can_payroll, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, false), COALESCE($11, false), now())
      ON CONFLICT (user_id) DO UPDATE SET
        position = COALESCE(EXCLUDED.position, staff_profiles.position), place = COALESCE(EXCLUDED.place, staff_profiles.place),
        birthday = COALESCE(EXCLUDED.birthday, staff_profiles.birthday), started_at = COALESCE(EXCLUDED.started_at, staff_profiles.started_at),
        /* Пустое значение стирает зарплату, а не сохраняет прежнюю:
           иначе выдуманное число невозможно убрать (24.09.2026) */
        salary = CASE WHEN $10 THEN EXCLUDED.salary ELSE COALESCE(EXCLUDED.salary, staff_profiles.salary) END, pay_to = COALESCE(EXCLUDED.pay_to, staff_profiles.pay_to),
        relation = COALESCE(EXCLUDED.relation, staff_profiles.relation),
        can_edit_shahmatka = COALESCE($9, staff_profiles.can_edit_shahmatka),
        can_payroll = COALESCE($11, staff_profiles.can_payroll), updated_at = now()`,
      [uid, b.position ?? null, b.place ?? null, b.birthday ?? null, b.started ?? null, Number.isInteger(b.salary) ? b.salary : null,
       b.payTo ?? null, b.relation ?? null, typeof b.canEditShahmatka === 'boolean' ? b.canEditShahmatka : null,
       Object.prototype.hasOwnProperty.call(b, 'salary'),
       typeof b.canPayroll === 'boolean' ? b.canPayroll : null]);
    await query(`INSERT INTO audit_log (actor_id, action, target, payload) VALUES ($1, 'staff.update', $2, $3)`, [s.uid, 'user:' + uid, JSON.stringify(b)]);
    json(res, 200, { ok: true });
  });

  route('GET', '/api/users/:id/files', async (req, res) => {
    if (!adminOnly(req, res)) return;
    const r = await query(`SELECT id, kind, url, uploaded_at FROM resident_files WHERE user_id = $1 ORDER BY uploaded_at DESC`, [Number(req.params.id)]);
    json(res, 200, r.rows.map((x) => ({ id: String(x.id), kind: x.kind, url: x.url, at: x.uploaded_at })));
  });

  /* ---------- Зарплата ---------- */

  /* Выдать новый код входа. Своего кода человек не помнит — сменить его
     самому нечем: смена требует действующий. До сих пор забывший код
     терял доступ насовсем (24.09.2026).

     Кто кому может: модератор — резидентам и сотрудникам, администратор —
     всем. Сколько угодно раз: код не ценность, ценность — учётная запись.
     Каждая выдача попадает в журнал. */
  /* Отключить учётную запись сотрудника. Не удалить: журнал действий
     должен остаться связным — кто что делал, видно и через год. Отключённый
     не может войти, и из списков пропадает (решение заказчика 24.09.2026). */
  route('POST', '/api/staff/:id/active', async (req, res) => {
    const s = adminOnly(req, res); if (!s) return;
    const uid = Number(req.params.id);
    if (!Number.isInteger(uid)) return fail(res, 400, 'Неверный номер');
    if (uid === Number(s.uid)) return fail(res, 400, 'Себя отключить нельзя');

    const b = await readJson(req);
    const active = b.active === true;
    const r = await query(`UPDATE users SET is_active = $2 WHERE id = $1 RETURNING name, role`, [uid, active]);
    const who = r.rows[0];
    if (!who) return fail(res, 404, 'Учётная запись не найдена');

    await query(`INSERT INTO audit_log (actor_id, action, target, payload) VALUES ($1, $2, $3, $4)`,
      [s.uid, active ? 'user.enable' : 'user.disable', 'user:' + uid,
       JSON.stringify({ name: who.name, role: who.role })]);
    json(res, 200, { ok: true, name: who.name, active });
  });

  route('POST', '/api/users/:id/pin', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');
    if (!auth.atLeast(s, 'moderator')) return fail(res, 403, 'Выдать код может модератор или администратор');

    const uid = Number(req.params.id);
    if (!Number.isInteger(uid)) return fail(res, 400, 'Неверный номер');
    const b = await readJson(req);
    const bad = auth.validPin(b.pin);
    if (bad) return fail(res, 400, bad);

    const r = await query(`SELECT id, name, role FROM users WHERE id = $1 AND is_active`, [uid]);
    const who = r.rows[0];
    if (!who) return fail(res, 404, 'Учётная запись не найдена');
    if (s.role !== 'admin' && (who.role === 'admin' || who.role === 'moderator')) {
      return fail(res, 403, 'Код модератору и администратору выдаёт администратор');
    }

    const out = await auth.setPin(uid, b.pin, null, true);
    if (!out.ok) return fail(res, 400, out.error);
    await query(`INSERT INTO audit_log (actor_id, action, target, payload) VALUES ($1, 'pin.issue', $2, $3)`,
      [s.uid, 'user:' + uid, JSON.stringify({ name: who.name, role: who.role })]);
    json(res, 200, { ok: true, name: who.name });
  });

  /* Кому видны чужие зарплаты: администратору и тому, кому это поручено
     отдельно. Свою зарплату видит каждый — модератор такой же работник,
     и прятать от него его же выплаты незачем (решение заказчика
     24.09.2026). */
  async function seesAllPayroll(s) {
    if (s.role === 'admin') return true;
    const r = await query(`SELECT can_payroll FROM staff_profiles WHERE user_id = $1`, [s.uid]);
    return !!(r.rows[0] && r.rows[0].can_payroll);
  }

  route('GET', '/api/payroll', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');
    if (s.role === 'resident') return fail(res, 403, 'Раздел для сотрудников');
    const mine = !(await seesAllPayroll(s));
    const r = await query(`SELECT p.*, u.name FROM payroll p JOIN users u ON u.id = p.user_id ${mine ? 'WHERE p.user_id = $1' : ''} ORDER BY p.paid_at DESC LIMIT 200`, mine ? [s.uid] : []);
    json(res, 200, r.rows.map((x) => ({ id: String(x.id), userId: String(x.user_id), name: x.name, period: x.period, amount: x.amount, bonus: x.bonus,
      total: x.amount + x.bonus, paidAt: x.paid_at, receivedAt: x.received_at })));
  });

  route('POST', '/api/payroll', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');
    if (!(await seesAllPayroll(s))) return fail(res, 403, 'Начислять зарплату может администратор или тот, кому это поручено');
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
