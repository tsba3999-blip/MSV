'use strict';

/* ============================================================
   Неоплаченное место уходит в продажу само

   Правило МСВ: за следующий месяц платят до 24:00 15 числа текущего.
   Правила проживания, п. 17.2.1 и 17.2.2: за просрочку — пени, а
   «Администрация вправе выставить неоплаченное место на продажу
   с 16 числа».

   Раньше это было решением модератора. Теперь делает система: 14-го
   предупреждает, что завтра последний день, а 16-го выставляет место
   на продажу и пишет резиденту, что выбор у него такой — заплатить
   месяц и пени или расторгнуть договор и потерять депозит
   (решение заказчика 24.09.2026).

   Пометка «освободится» ставится с флагом release_auto: если резидент
   заплатит, система снимет свою пометку и не тронет ту, которую
   поставил руками модератор.
   ============================================================ */

const { query } = require('./db');
const notify = require('./notify');

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
                'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

function human(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  return d.getUTCDate() + ' ' + MONTHS[d.getUTCMonth()];
}

async function sweepSale() {
  /* due — месяц, который уже должен быть оплачен: следующий за текущим. */
  const info = await query(
    `SELECT (date_trunc('month', CURRENT_DATE) + interval '1 month')::date AS due,
            (date_trunc('month', CURRENT_DATE)::date + 13) AS warn_day,
            (date_trunc('month', CURRENT_DATE)::date + 14) AS deadline,
            CURRENT_DATE AS today`);
  const { due, warn_day, deadline, today } = info.rows[0];
  const dueStr = due.toISOString ? due.toISOString().slice(0, 10) : String(due).slice(0, 10);

  const r = await query(`
    SELECT b.id, b.user_id, b.release_from, b.release_auto, b.warn_period, b.sale_period,
           bd.label, rm.name AS room,
           COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.booking_id = b.id), 0) AS paid,
           COALESCE((SELECT SUM(ch.amount) FROM charges ch
                      WHERE ch.booking_id = b.id AND ch.cancelled_at IS NULL
                        AND ch.kind IN ('rent', 'deposit')
                        AND ch.period IS NOT NULL AND ch.period <= $1), 0) AS owed,
           EXISTS (SELECT 1 FROM charges ch WHERE ch.booking_id = b.id AND ch.cancelled_at IS NULL
                     AND ch.kind IN ('rent', 'deposit') AND ch.period = $1) AS billed
      FROM bookings b
      JOIN contracts c ON c.id = b.contract_id
      JOIN beds bd ON bd.id = b.bed_id
      JOIN rooms rm ON rm.id = bd.room_id
     WHERE b.user_id IS NOT NULL
       AND c.ended_at IS NULL
       AND c.date_to >= $1
       AND b.date_to >= CURRENT_DATE`, [dueStr]);

  let touched = 0;

  for (const x of r.rows) {
    const covered = x.billed && Number(x.paid) >= Number(x.owed);
    const sameWarn = x.warn_period && String(x.warn_period).slice(0, 10) === dueStr;
    const sameSale = x.sale_period && String(x.sale_period).slice(0, 10) === dueStr;

    if (covered) {
      // заплатил — снимаем свою пометку, чужую не трогаем
      if (x.release_auto) {
        await query(`UPDATE bookings SET release_from = NULL, release_auto = false, sale_period = NULL
                      WHERE id = $1`, [x.id]);
        touched++;
      }
      continue;
    }

    // 14-е число: напоминаем, пока ещё ничего не случилось
    if (String(today) === String(warn_day) && !sameWarn) {
      await query(`UPDATE bookings SET warn_period = $1 WHERE id = $2`, [dueStr, x.id]);
      await notify.notifyResident(x.user_id, 'pay',
        'Завтра последний день оплаты за ' + monthName(dueStr) + '. Оплатить нужно до 24:00 15 числа. ' +
        'После этого начисляются пени и место (' + x.room + ', ' + x.label + ') выставляется на продажу.')
        .catch(() => {});
      touched++;
      continue;
    }

    // после 15-го: место уходит в продажу
    if (today > deadline && !sameSale) {
      await query(`UPDATE bookings SET release_from = $1, release_auto = true, sale_period = $1
                    WHERE id = $2`, [dueStr, x.id]);
      await query(`INSERT INTO audit_log (actor_id, action, target, payload)
                   VALUES (NULL, 'booking.sale.auto', $1, $2)`,
        ['booking:' + x.id, JSON.stringify({ period: dueStr })]);
      await notify.notifyResident(x.user_id, 'pay',
        'Ваше место (' + x.room + ', ' + x.label + ') выставлено на продажу: оплата за ' +
        monthName(dueStr) + ' не поступила до 24:00 15 числа. ' +
        'Чтобы сохранить место, оплатите месяц и начисленные пени. ' +
        'Иначе договор расторгается, и депозит не возвращается.')
        .catch(() => {});
      touched++;
    }
  }
  return touched;
}

function monthName(dueStr) {
  const d = new Date(dueStr + 'T00:00:00Z');
  const nom = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
               'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь'];
  return nom[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
}

module.exports = { sweepSale, human };
