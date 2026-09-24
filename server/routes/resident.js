'use strict';

/* ============================================================
   /api/me — кабинет резидента
   /api/payments — оплата (администратор отмечает вручную)

   GET  /api/me/home           → всё для главной резидента
   PUT  /api/me/profile        → сохранить анкету
   POST /api/bookings          → резидент бронирует место
   POST /api/payments          → модератор+ отмечает платёж
   ============================================================ */

const auth = require('../lib/auth');
const notify = require('../lib/notify');
const { json, fail, readJson } = require('../lib/http');
const { query, tx } = require('../lib/db');

function iso(d) { return d ? (typeof d === 'string' ? d.slice(0, 10) : d.toISOString().slice(0, 10)) : null; }

module.exports = function register(route) {

  /* ---------- Главная резидента: бронь, баланс, заявки, уведомления ---------- */

  /* Подписи документов. Резидент подписывает договор, правила и согласие
     заново при каждой оплате, поэтому отдаём весь список: страницам документа
     нужна последняя подпись, разделу «Подписанные документы» — все. Старые
     записи (до журнала) подставляем из даты принятия анкеты. */
  route('GET', '/api/me/docs', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');
    const r = await query(`SELECT p.docs_signed_at,
        (SELECT min(pay.paid_at) FROM payments pay
           JOIN bookings b ON b.id = pay.booking_id
          WHERE b.user_id = $1) AS first_paid,
        u.name
      FROM users u LEFT JOIN resident_profiles p ON p.user_id = u.id
      WHERE u.id = $1`, [s.uid]);
    const row = r.rows[0] || {};

    const sg = await query(
      `SELECT kind, signed_at FROM doc_signatures WHERE user_id = $1 ORDER BY signed_at DESC`, [s.uid]);
    const list = sg.rows.map((x) => ({ kind: x.kind, at: x.signed_at, exact: true }));

    // Резиденты, подписавшие до появления журнала: одна запись по каждому документу
    if (!list.length && (row.first_paid || row.docs_signed_at)) {
      const at = row.first_paid || row.docs_signed_at;
      ['contract', 'rules', 'consent'].forEach((k) => list.push({ kind: k, at, exact: !!row.first_paid }));
    }

    json(res, 200, {
      name: row.name || '',
      signatures: list,
      // старые поля — чтобы ничего не сломалось, если страница ещё не обновилась
      signedAt: list.length ? list[0].at : null,
      exact: list.length ? list[0].exact : false
    });
  });

  /* Репутация резидента: баллы −30 … +50 (сумма событий), три жизни (каждое нарушение
     модератора сжигает одну), история событий */
  route('GET', '/api/me/reputation', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');
    const r = await query(`SELECT title, details, delta, is_negative, created_at FROM reputation_events
      WHERE user_id = $1 ORDER BY created_at DESC`, [s.uid]);
    let points = 0, burned = 0;
    r.rows.forEach((e) => { points += Number(e.delta); if (e.is_negative) burned += 1; });
    points = Math.max(-30, Math.min(50, Math.round(points)));
    json(res, 200, {
      points, lives: Math.max(0, 3 - burned),
      events: r.rows.map((e) => ({ when: e.created_at, title: e.title, details: e.details || '', delta: Number(e.delta), negative: e.is_negative }))
    });
  });

  route('GET', '/api/me/home', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');

    const [u, bk, notices, tickets] = await Promise.all([
      query(`SELECT u.id, u.name, u.phone, u.email, p.* FROM users u
             LEFT JOIN resident_profiles p ON p.user_id = u.id WHERE u.id = $1`, [s.uid]),
      query(`SELECT b.id, b.bed_id, b.date_from, b.date_to, bd.label, bd.price, bd.tier,
                    r.name AS room_name, r.number AS room_number, rs.title AS residence,
                    COALESCE(bal.accrued, 0) AS accrued, COALESCE(bal.paid, 0) AS paid
             FROM bookings b
             JOIN beds bd ON bd.id = b.bed_id JOIN rooms r ON r.id = bd.room_id
             JOIN residences rs ON rs.id = r.residence_id
             LEFT JOIN booking_balance bal ON bal.booking_id = b.id
             WHERE b.user_id = $1 ORDER BY b.date_from DESC LIMIT 1`, [s.uid]),
      query(`SELECT id, kind, text, is_read, created_at FROM notices WHERE user_id = $1
             ORDER BY created_at DESC LIMIT 20`, [s.uid]),
      query(`SELECT id, category, status, created_at FROM tickets WHERE user_id = $1
             ORDER BY created_at DESC LIMIT 10`, [s.uid])
    ]);

    const user = u.rows[0];
    if (!user) return fail(res, 404, 'Нет пользователя');
    const b = bk.rows[0] || null;
    const dep = b ? await query(`SELECT 1 FROM charges WHERE booking_id = $1 AND kind = 'deposit' LIMIT 1`, [b.id]) : { rows: [] };

    json(res, 200, {
      me: { id: String(user.id), name: user.name, phone: user.phone, email: user.email },
      profile: user.user_id ? {
        lastName: user.last_name, firstName: user.first_name, middleName: user.middle_name,
        birthday: iso(user.birthday), city: user.city, university: user.university,
        course: user.course, faculty: user.faculty, about: user.about, gender: user.gender || null,
        messengers: user.messengers || [], docsSignedAt: iso(user.docs_signed_at)
      } : null,
      booking: b ? {
        id: String(b.id), bedId: b.bed_id, label: b.label, tier: b.tier, price: b.price,
        depositPaid: !!(dep.rows[0]),
        room: b.room_name, roomNumber: b.room_number, residence: b.residence,
        from: iso(b.date_from), to: iso(b.date_to),
        accrued: Number(b.accrued), paid: Number(b.paid), balance: Number(b.accrued) - Number(b.paid)
      } : null,
      notices: notices.rows.map((n) => ({ id: String(n.id), kind: n.kind, text: n.text, read: n.is_read, at: n.created_at })),
      tickets: tickets.rows.map((t) => ({ id: String(t.id), category: t.category, status: t.status, at: t.created_at }))
    });
  });

  /* Своя действующая регистрация — для страницы «Регистрация» */
  route('GET', '/api/me/registration', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');
    const [u, r, f] = await Promise.all([
      query(`SELECT name FROM users WHERE id = $1`, [s.uid]),
      query(`SELECT number, issued_at, valid_until, address FROM registrations WHERE user_id = $1 ORDER BY valid_until DESC LIMIT 1`, [s.uid]),
      query(`SELECT url FROM resident_files WHERE user_id = $1 AND kind = 'other' ORDER BY uploaded_at DESC LIMIT 1`, [s.uid])
    ]);
    const x = r.rows[0];
    json(res, 200, { name: u.rows[0] ? u.rows[0].name : '', registration: x ? {
      number: x.number, issued: iso(x.issued_at), until: iso(x.valid_until), address: x.address,
      expired: new Date(x.valid_until) < new Date(), fileUrl: f.rows[0] ? f.rows[0].url : null
    } : null });
  });

  /* ---------- Анкета ---------- */

  /* Анкета, как она сохранена. Нужна самим страницам анкеты: человек должен
     видеть свои прежние ответы, а не пустые поля (24.09.2026). */
  route('GET', '/api/me/profile', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');
    const r = await query(`SELECT u.phone, p.* FROM users u
      LEFT JOIN resident_profiles p ON p.user_id = u.id WHERE u.id = $1`, [s.uid]);
    const p = r.rows[0];
    if (!p || !p.user_id) return json(res, 200, null);
    json(res, 200, {
      lastName: p.last_name, firstName: p.first_name, middleName: p.middle_name,
      phone: p.phone, gender: p.gender, birthday: iso(p.birthday), city: p.city,
      university: p.university, course: p.course, faculty: p.faculty, about: p.about,
      messengers: p.messengers || [], tgNick: p.tg_nick,
      healthScore: p.health_score, healthNote: p.health_note,
      contactPerson: p.contact_person, vk: p.vk
    });
  });

  route('PUT', '/api/me/profile', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');
    const b = await readJson(req);

    const str = (v, n) => v === undefined || v === null ? null : String(v).slice(0, n);
    const bday = /^\d{4}-\d{2}-\d{2}$/.test(String(b.birthday || '')) ? b.birthday : null;
    const health = Number.isInteger(b.healthScore) && b.healthScore >= 1 && b.healthScore <= 5 ? b.healthScore : null;
    const mess = Array.isArray(b.messengers) ? b.messengers.filter((m) => m === 'tg' || m === 'max') : [];
    const gender = b.gender === 'м' || b.gender === 'ж' ? b.gender : null;

    await tx(async (q) => {
      /* COALESCE, а не прямая запись: в форме анкеты нет города, контактного
         лица и ВК — их заполняет модератор. Без этого каждое сохранение
         анкеты стирало бы его работу. Пустая строка из формы — это осознанная
         очистка, она проходит; отсутствие поля — нет (24.09.2026). */
      await q(`INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, birthday, city,
                 university, course, faculty, about, health_score, contact_person, vk, messengers, gender,
                 tg_nick, health_note, updated_at)
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17, now())
               ON CONFLICT (user_id) DO UPDATE SET
                 last_name = COALESCE(EXCLUDED.last_name, resident_profiles.last_name),
                 first_name = COALESCE(EXCLUDED.first_name, resident_profiles.first_name),
                 middle_name = COALESCE(EXCLUDED.middle_name, resident_profiles.middle_name),
                 birthday = COALESCE(EXCLUDED.birthday, resident_profiles.birthday),
                 city = COALESCE(EXCLUDED.city, resident_profiles.city),
                 university = COALESCE(EXCLUDED.university, resident_profiles.university),
                 course = COALESCE(EXCLUDED.course, resident_profiles.course),
                 faculty = COALESCE(EXCLUDED.faculty, resident_profiles.faculty),
                 about = COALESCE(EXCLUDED.about, resident_profiles.about),
                 health_score = COALESCE(EXCLUDED.health_score, resident_profiles.health_score),
                 contact_person = COALESCE(EXCLUDED.contact_person, resident_profiles.contact_person),
                 vk = COALESCE(EXCLUDED.vk, resident_profiles.vk),
                 messengers = EXCLUDED.messengers,
                 gender = COALESCE(EXCLUDED.gender, resident_profiles.gender),
                 tg_nick = COALESCE(EXCLUDED.tg_nick, resident_profiles.tg_nick),
                 health_note = COALESCE(EXCLUDED.health_note, resident_profiles.health_note),
                 updated_at = now()`,
        [s.uid, str(b.lastName, 100), str(b.firstName, 100), str(b.middleName, 100), bday, str(b.city, 100),
         str(b.university, 200), str(b.course, 20), str(b.faculty, 200), str(b.about, 600), health,
         str(b.contactPerson, 200), str(b.vk, 200), mess, gender,
         str(b.tgNick, 100), str(b.healthNote, 300)]);

      // Имя в учётной записи — из анкеты
      const full = [b.lastName, b.firstName, b.middleName].filter(Boolean).join(' ').trim();
      if (full) await q(`UPDATE users SET name = $1 WHERE id = $2`, [full.slice(0, 200), s.uid]);
      if (b.phone) await q(`UPDATE users SET phone = COALESCE(phone, $1) WHERE id = $2`, [String(b.phone).slice(0, 30), s.uid]);
    });

    json(res, 200, { ok: true });
  });

  /* ---------- Бронь: резидент выбирает место и месяц ---------- */

  route('POST', '/api/bookings', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');
    const b = await readJson(req);

    if (!b.bedId || !/^\d{4}-\d{2}-\d{2}$/.test(String(b.from || ''))) return fail(res, 400, 'Нужны место и дата заезда');
    /* Документы подписываются галочками на «Проверке данных» — без них
       бронь не создаётся (решение заказчика 23.09.2026). Проверяем и на
       сервере: страницу можно обойти, сервер обойти нельзя. */
    if (!(b.docs && b.docs.contract && b.docs.rules && b.docs.consent)) {
      return fail(res, 400, 'Сначала прими договор, правила и согласие на обработку данных');
    }
    const from = b.from;
    // Годовой контракт: выезд через год минус день, если не задано иначе
    const to = /^\d{4}-\d{2}-\d{2}$/.test(String(b.to || '')) ? b.to : null;

    try {
      const out = await tx(async (q) => {
        const bed = await q(`SELECT price FROM beds WHERE id = $1`, [b.bedId]);
        if (!bed.rows[0]) throw Object.assign(new Error('Такого места нет'), { code: 'nobed' });

        const ins = await q(
          `INSERT INTO bookings (user_id, bed_id, date_from, date_to, source)
           VALUES ($1, $2, $3, COALESCE($4::date, $3::date + interval '1 year' - interval '1 day'), 'site')
           RETURNING id, date_from, date_to`, [s.uid, b.bedId, from, to]);
        const id = ins.rows[0].id;

        // Первое начисление — за месяц заезда; депозит — если попросили
        const price = bed.rows[0].price;
        await q(`INSERT INTO charges (booking_id, kind, period, amount, due_date)
                 VALUES ($1, 'rent', date_trunc('month', $2::date)::date, $3, date_trunc('month', $2::date)::date + 14)`,
          [id, from, price]);
        if (b.deposit) {
          await q(`INSERT INTO charges (booking_id, kind, amount) VALUES ($1, 'deposit', $2)`, [id, price]);
        }
        /* Подписи документов: отдельная запись на каждый документ и каждую оплату */
        for (const kind of ['contract', 'rules', 'consent']) {
          await q(`INSERT INTO doc_signatures (user_id, kind, booking_id) VALUES ($1, $2, $3)`, [s.uid, kind, id]);
        }
        await q(`UPDATE resident_profiles SET docs_signed_at = COALESCE(docs_signed_at, CURRENT_DATE) WHERE user_id = $1`, [s.uid]);
        await q(`INSERT INTO audit_log (actor_id, action, target, payload)
                 VALUES ($1, 'docs.accept', $2, $3)`,
          [s.uid, 'booking:' + id, JSON.stringify({ contract: true, rules: true, consent: true })]);
        return ins.rows[0];
      });
      json(res, 201, { id: String(out.id), from: iso(out.date_from), to: iso(out.date_to) });
    } catch (e) {
      if (e.code === '23P01') return fail(res, 409, 'Место уже занято на эти даты');
      if (e.code === 'nobed') return fail(res, 400, e.message);
      throw e;
    }
  });

  /* ---------- Платёж отмечает администрация ---------- */

  route('POST', '/api/payments', async (req, res) => {
    const s = auth.readSession(req);
    if (!s) return fail(res, 401, 'Не выполнен вход');
    if (!auth.atLeast(s, 'moderator')) return fail(res, 403, 'Отмечать оплату может модератор или администратор');
    const b = await readJson(req);

    const bookingId = Number(b.bookingId), amount = Number(b.amount);
    if (!Number.isInteger(bookingId) || !Number.isInteger(amount) || amount <= 0) return fail(res, 400, 'Нужны бронь и сумма');
    const METHODS = ['sbp', 'card', 'cash', 'transfer', 'other'];
    const method = METHODS.indexOf(b.method) >= 0 ? b.method : 'other';

    const r = await query(`INSERT INTO payments (booking_id, amount, method, note) VALUES ($1, $2, $3, $4) RETURNING id`,
      [bookingId, amount, method, b.note ? String(b.note).slice(0, 300) : null]);
    await query(`INSERT INTO audit_log (actor_id, action, target, payload) VALUES ($1, 'payment.add', $2, $3)`,
      [s.uid, 'booking:' + bookingId, JSON.stringify({ amount, method })]);

    // дата первой оплаты = дата подписания документов
    await query(`UPDATE resident_profiles p SET docs_signed_at = COALESCE(p.docs_signed_at, CURRENT_DATE)
                 FROM bookings bk WHERE bk.id = $1 AND p.user_id = bk.user_id`, [bookingId]);

    json(res, 201, { id: String(r.rows[0].id) });

    const who = await query(`SELECT user_id FROM bookings WHERE id = $1`, [bookingId]);
    if (who.rows[0]) {
      notify.notifyResident(who.rows[0].user_id, 'pay', `Оплата ${amount.toLocaleString('ru-RU')} руб. получена. Спасибо.`).catch(() => {});
    }
  });
};
