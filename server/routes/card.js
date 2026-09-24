'use strict';

/* ============================================================
   /api/residents/:id/card — всё, что система знает о резиденте

   GET  /api/residents/:id/card     — карточка целиком (модератор и выше)
   PUT  /api/residents/:id/profile  — правка анкеты за резидента

   Зачем один большой запрос вместо десяти маленьких: карточку
   открывают из шахматки одним щелчком, и сотруднику нужно сразу
   видеть человека целиком — анкету, документы, деньги, репутацию,
   заявки, входы. Десять запросов подряд открывали бы её рывками.

   Кто видит: модератор, куратор и администратор. Сотрудник-мастер
   к чужим анкетам доступа не имеет — ему хватает заявок.
   ============================================================ */

const auth = require('../lib/auth');
const { json, fail, readJson } = require('../lib/http');
const { query, tx } = require('../lib/db');

const iso = (d) => d ? (typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10)) : null;

function staffOnly(req, res) {
  const s = auth.readSession(req);
  if (!s) { fail(res, 401, 'Не выполнен вход'); return null; }
  if (!auth.atLeast(s, 'moderator')) { fail(res, 403, 'Карточку резидента смотрит модератор или администратор'); return null; }
  return s;
}

const TICKET_STATUS = { accepted: 'Принята', in_progress: 'В работе', done: 'Выполнена', rejected: 'Отклонена' };
const TICKET_PRIO = { critical: 'Критическая авария', urgent: 'Срочная поломка', normal: 'Текущая неисправность', consult: 'Консультация' };
const REQ_KIND = {
  registration: 'Регистрация по месту пребывания',
  residence_cert: 'Справка о проживании',
  guardian_contract: 'Договор для опекуна',
  fix: 'Исправление данных',
  relocation: 'Переселение'
};
const REQ_STATUS = { accepted: 'Принят', in_progress: 'В работе', done: 'Готов', rejected: 'Отклонён' };
const FILE_KIND = {
  photo: 'Фотография', passport: 'Паспорт', student_id: 'Студенческий',
  parent_consent: 'Согласие родителей', other: 'Другое'
};
const DOC_NAME = { contract: 'Договор-оферта', rules: 'Правила проживания', consent: 'Согласие на обработку данных' };

module.exports = function register(route) {

  route('GET', '/api/residents/:id/card', async (req, res) => {
    const s = staffOnly(req, res);
    if (!s) return;

    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return fail(res, 400, 'Неверный номер резидента');

    const u = await query(`
      SELECT u.id, u.name, u.role, u.phone, u.email, u.is_active, u.created_at, u.first_login, u.invited_at,
             p.last_name, p.first_name, p.middle_name, p.birthday, p.city, p.university, p.course,
             p.faculty, p.about, p.health_score, p.contact_person, p.vk, p.photo_url, p.messengers,
             p.gender, p.docs_signed_at, p.updated_at
      FROM users u LEFT JOIN resident_profiles p ON p.user_id = u.id
      WHERE u.id = $1`, [id]);
    const row = u.rows[0];
    if (!row) return fail(res, 404, 'Резидент не найден');

    const [bookings, files, regs, tickets, rep, reqs, fb, logins, signs, notices] = await Promise.all([
      query(`SELECT b.id, b.bed_id, b.date_from, b.date_to, b.tariff, b.source, b.note, b.created_at,
                    b.release_from, bd.label, bd.tier, bd.price, r.name AS room, r.number AS room_number,
                    rs.title AS residence,
                    COALESCE(bal.accrued, 0) AS accrued, COALESCE(bal.paid, 0) AS paid
             FROM bookings b
             JOIN beds bd ON bd.id = b.bed_id
             JOIN rooms r ON r.id = bd.room_id
             JOIN residences rs ON rs.id = r.residence_id
             LEFT JOIN booking_balance bal ON bal.booking_id = b.id
             WHERE b.user_id = $1 ORDER BY b.date_from DESC`, [id]),
      query(`SELECT id, kind, url, uploaded_at FROM resident_files WHERE user_id = $1 ORDER BY uploaded_at DESC`, [id]),
      query(`SELECT number, issued_at, valid_until, address FROM registrations WHERE user_id = $1 ORDER BY valid_until DESC`, [id]),
      query(`SELECT t.id, t.category, t.place, t.room_number, t.text, t.priority, t.status, t.created_at, t.closed_at,
                    m.name AS master
             FROM tickets t LEFT JOIN users m ON m.id = t.master_id
             WHERE t.user_id = $1 ORDER BY t.created_at DESC`, [id]),
      query(`SELECT e.id, e.title, e.details, e.delta, e.is_negative, e.created_at, a.name AS author
             FROM reputation_events e LEFT JOIN users a ON a.id = e.author_id
             WHERE e.user_id = $1 ORDER BY e.created_at DESC`, [id]),
      query(`SELECT id, kind, note, status, result_url, created_at, closed_at
             FROM doc_requests WHERE user_id = $1 ORDER BY created_at DESC`, [id]),
      query(`SELECT id, topic, text, answered, answer, created_at FROM feedback WHERE user_id = $1 ORDER BY created_at DESC`, [id]),
      query(`SELECT ok, ip, agent, created_at FROM login_log WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`, [id]),
      query(`SELECT kind, signed_at FROM doc_signatures WHERE user_id = $1 ORDER BY signed_at DESC`, [id]),
      query(`SELECT id, kind, text, is_read, created_at FROM notices WHERE user_id = $1 ORDER BY created_at DESC LIMIT 30`, [id])
    ]);

    const bookingIds = bookings.rows.map((b) => b.id);
    const [charges, payments] = bookingIds.length
      ? await Promise.all([
          query(`SELECT id, booking_id, kind, period, amount, due_date, note, created_at, cancelled_at
                 FROM charges WHERE booking_id = ANY($1) ORDER BY COALESCE(period, created_at::date) DESC`, [bookingIds]),
          query(`SELECT id, booking_id, amount, paid_at, method, period, note
                 FROM payments WHERE booking_id = ANY($1) ORDER BY paid_at DESC`, [bookingIds])
        ])
      : [{ rows: [] }, { rows: [] }];

    /* Репутация: −30 … +50, как в кабинете резидента */
    const score = rep.rows.reduce((sum, e) => sum + Number(e.delta), 0);
    const lives = 3 - rep.rows.filter((e) => e.is_negative).length;

    const loginCount = await query(`SELECT count(*) AS n FROM login_log WHERE user_id = $1 AND ok`, [id]);

    json(res, 200, {
      me: {
        id: String(row.id), name: row.name, role: row.role, phone: row.phone || '', email: row.email || '',
        isActive: row.is_active, createdAt: row.created_at, firstLogin: row.first_login, invitedAt: row.invited_at
      },
      profile: {
        lastName: row.last_name || '', firstName: row.first_name || '', middleName: row.middle_name || '',
        birthday: iso(row.birthday), city: row.city || '', university: row.university || '',
        course: row.course || '', faculty: row.faculty || '', about: row.about || '',
        healthScore: row.health_score, contactPerson: row.contact_person || '', vk: row.vk || '',
        photo: row.photo_url || '', messengers: row.messengers || [], gender: row.gender || '',
        docsSignedAt: iso(row.docs_signed_at), updatedAt: row.updated_at
      },
      bookings: bookings.rows.map((b) => ({
        id: String(b.id), bedId: b.bed_id, label: b.label, tier: b.tier, price: b.price,
        room: b.room, roomNumber: b.room_number, residence: b.residence,
        from: iso(b.date_from), to: iso(b.date_to), releaseFrom: iso(b.release_from),
        tariff: b.tariff, source: b.source, note: b.note || '', bookedAt: b.created_at,
        accrued: Number(b.accrued), paid: Number(b.paid), balance: Number(b.accrued) - Number(b.paid)
      })),
      charges: charges.rows.map((c) => ({
        id: String(c.id), kind: c.kind, period: iso(c.period), amount: c.amount,
        due: iso(c.due_date), note: c.note || '', at: c.created_at,
        cancelled: c.cancelled_at ? c.cancelled_at : null
      })),
      payments: payments.rows.map((p) => ({
        id: String(p.id), amount: p.amount, at: p.paid_at, method: p.method,
        period: iso(p.period), note: p.note || ''
      })),
      files: files.rows.map((f) => ({ id: String(f.id), kind: f.kind, kindName: FILE_KIND[f.kind] || f.kind, url: f.url, at: f.uploaded_at })),
      registrations: regs.rows.map((r) => ({ number: r.number || '', issued: iso(r.issued_at), until: iso(r.valid_until), address: r.address || '' })),
      signatures: signs.rows.map((x) => ({ kind: x.kind, name: DOC_NAME[x.kind] || x.kind, at: x.signed_at })),
      tickets: tickets.rows.map((t) => ({
        id: String(t.id), category: t.category, place: t.place || '', room: t.room_number || '',
        text: t.text, priority: TICKET_PRIO[t.priority] || t.priority,
        status: TICKET_STATUS[t.status] || t.status, master: t.master || '',
        at: t.created_at, closedAt: t.closed_at
      })),
      requests: reqs.rows.map((r) => ({
        id: String(r.id), kind: REQ_KIND[r.kind] || r.kind, note: r.note || '',
        status: REQ_STATUS[r.status] || r.status, url: r.result_url || '', at: r.created_at, closedAt: r.closed_at
      })),
      feedback: fb.rows.map((f) => ({ id: String(f.id), topic: f.topic, text: f.text, answered: f.answered, answer: f.answer || '', at: f.created_at })),
      reputation: { score: Math.round(score * 10) / 10, lives: Math.max(0, lives), events: rep.rows.map((e) => ({
        id: String(e.id), title: e.title, details: e.details || '', delta: Number(e.delta),
        negative: e.is_negative, author: e.author || '', at: e.created_at
      })) },
      logins: { total: Number(loginCount.rows[0].n), last: logins.rows.map((l) => ({ ok: l.ok, ip: l.ip || '', agent: l.agent || '', at: l.created_at })) },
      notices: notices.rows.map((n) => ({ id: String(n.id), kind: n.kind, text: n.text, read: n.is_read, at: n.created_at }))
    });
  });

  /* ---------- Правка анкеты за резидента ----------
     Поля те же, что резидент заполняет сам (PUT /api/me/profile).
     Каждая правка попадает в журнал: видно, кто и что менял. */

  /* Удалить резидента целиком — вместе с бронями, начислениями, платежами,
     заявками и документами. Нужно для выдуманных записей, которыми набивали
     базу: настоящего резидента так не убирают.

     Двойное согласие: мало нажать кнопку — нужно ещё прислать имя резидента,
     набранное руками. Промах по кнопке ничего не удалит. Брони и заявки
     снимаем явно: база держит их на RESTRICT, и молча они бы не ушли.
     (решение заказчика 24.09.2026) */
  route('POST', '/api/residents/:id/delete', async (req, res) => {
    const s = staffOnly(req, res);
    if (!s) return;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return fail(res, 400, 'Неверный номер резидента');
    if (id === Number(s.uid)) return fail(res, 400, 'Нельзя удалить самого себя');

    const b = await readJson(req);
    const u = await query(`SELECT id, name, role FROM users WHERE id = $1`, [id]);
    const user = u.rows[0];
    if (!user) return fail(res, 404, 'Резидент не найден');
    if (user.role !== 'resident') return fail(res, 400, 'Удалять можно только резидентов');

    const plain = (v) => String(v || '').trim().replace(/\s+/g, ' ').toLowerCase();
    if (b.confirm !== true) return fail(res, 400, 'Нужно подтверждение');
    if (!plain(b.name) || plain(b.name) !== plain(user.name)) {
      return fail(res, 400, 'Имя набрано не так, как записано у резидента');
    }

    await tx(async (q) => {
      await q(`INSERT INTO audit_log (actor_id, action, target, payload)
               VALUES ($1, 'user.delete', $2, $3)`,
        [s.uid, 'user:' + id, JSON.stringify({ name: user.name })]);
      await q(`DELETE FROM tickets WHERE user_id = $1`, [id]);
      await q(`DELETE FROM bookings WHERE user_id = $1`, [id]);
      await q(`DELETE FROM users WHERE id = $1`, [id]);
    });
    json(res, 200, { ok: true });
  });

  /* Снять начисленные пени. Система начисляет их сама, отменяет только
     человек — модератор или администратор (правило заказчика, 24.09.2026). */
  route('POST', '/api/charges/:id/cancel', async (req, res) => {
    const s = staffOnly(req, res);
    if (!s) return;
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return fail(res, 400, 'Неверный номер начисления');
    const r = await query(`SELECT kind, cancelled_at FROM charges WHERE id = $1`, [id]);
    const c = r.rows[0];
    if (!c) return fail(res, 404, 'Начисление не найдено');
    if (c.kind !== 'penalty') return fail(res, 400, 'Снять можно только пени');
    if (c.cancelled_at) return json(res, 200, { ok: true });
    await query(`UPDATE charges SET cancelled_at = now(), cancelled_by = $1 WHERE id = $2`, [s.uid, id]);
    await query(`INSERT INTO audit_log (actor_id, action, target, payload)
                 VALUES ($1, 'charge.cancel', $2, $3)`,
      [s.uid, 'charge:' + id, JSON.stringify({ kind: 'penalty' })]);
    json(res, 200, { ok: true });
  });

  route('PUT', '/api/residents/:id/profile', async (req, res) => {
    const s = staffOnly(req, res);
    if (!s) return;

    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return fail(res, 400, 'Неверный номер резидента');
    const b = await readJson(req);

    const str = (v, n) => v === undefined || v === null ? null : String(v).slice(0, n);
    const bday = /^\d{4}-\d{2}-\d{2}$/.test(String(b.birthday || '')) ? b.birthday : null;
    const health = Number.isInteger(b.healthScore) && b.healthScore >= 1 && b.healthScore <= 5 ? b.healthScore : null;
    const mess = Array.isArray(b.messengers) ? b.messengers.filter((m) => m === 'tg' || m === 'max') : [];
    const gender = b.gender === 'м' || b.gender === 'ж' ? b.gender : null;

    const exists = await query(`SELECT 1 FROM users WHERE id = $1`, [id]);
    if (!exists.rows[0]) return fail(res, 404, 'Резидент не найден');

    await tx(async (q) => {
      const before = await q(`SELECT * FROM resident_profiles WHERE user_id = $1`, [id]);

      await q(`INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, birthday, city,
                 university, course, faculty, about, health_score, contact_person, vk, messengers, gender, updated_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15, now())
               ON CONFLICT (user_id) DO UPDATE SET
                 last_name = EXCLUDED.last_name, first_name = EXCLUDED.first_name, middle_name = EXCLUDED.middle_name,
                 birthday = EXCLUDED.birthday, city = EXCLUDED.city, university = EXCLUDED.university,
                 course = EXCLUDED.course, faculty = EXCLUDED.faculty, about = EXCLUDED.about,
                 health_score = EXCLUDED.health_score, contact_person = EXCLUDED.contact_person,
                 vk = EXCLUDED.vk, messengers = EXCLUDED.messengers, gender = EXCLUDED.gender, updated_at = now()`,
        [id, str(b.lastName, 100), str(b.firstName, 100), str(b.middleName, 100), bday, str(b.city, 100),
         str(b.university, 200), str(b.course, 20), str(b.faculty, 200), str(b.about, 600), health,
         str(b.contactPerson, 200), str(b.vk, 200), mess, gender]);

      const full = [b.lastName, b.firstName, b.middleName].filter(Boolean).join(' ').trim();
      if (full) await q(`UPDATE users SET name = $1 WHERE id = $2`, [full.slice(0, 200), id]);
      if (b.phone !== undefined) await q(`UPDATE users SET phone = $1 WHERE id = $2`, [str(b.phone, 30), id]);
      if (b.email !== undefined) await q(`UPDATE users SET email = $1 WHERE id = $2`, [str(b.email, 200), id]);

      await q(`INSERT INTO audit_log (actor_id, action, target, payload) VALUES ($1, 'resident.profile', $2, $3)`,
        [s.uid, 'user:' + id, JSON.stringify({ before: before.rows[0] || null, after: b })]);
    });

    json(res, 200, { ok: true });
  });
};
