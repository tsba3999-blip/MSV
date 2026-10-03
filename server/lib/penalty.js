'use strict';

/* ============================================================
   Пени за просрочку оплаты

   Правила проживания, п. 17.2.1 и договор, п. 17.2.1: оплата за следующий
   месяц — не позднее 24:00 15 числа. За первые сутки просрочки — 3 000 руб.,
   далее 500 руб. за каждые сутки. Просрочка больше 10 дней — принудительное
   выселение; это решает человек, система только считает деньги.

   Платежи в базе не привязаны к начислениям, поэтому закрываем начисления
   по очереди, от старых к новым: сколько пришло денег, столько начислений
   с начала и закрыто. Сами пени в эту очередь не входят — иначе оплата за
   комнату уходила бы сперва на штраф, а месяц оставался бы неоплаченным и
   штраф рос бы дальше.

   Пени — отдельная строка начисления (kind = 'penalty') с тем же месяцем,
   что и просроченная аренда. Пересчитывается каждый день, пока месяц не
   оплачен. Снятые модератором пени (cancelled_at) заново не начисляются.
   ============================================================ */

const { query } = require('./db');

const FIRST_DAY = 3000;   // за первые сутки просрочки
const PER_DAY = 500;      // за каждые следующие

function amountFor(daysLate) {
  if (daysLate < 1) return 0;
  return FIRST_DAY + PER_DAY * (daysLate - 1);
}

async function sweepPenalties() {
  /* Денежные правила ждут команды. Пока идёт перенос данных со старой
     шахматки, «не оплачено» означает «ещё не внесли», а не «человек не
     заплатил» — начислять по такой причине пени живым людям нельзя.
     Включается одним выключателем в настройках, когда перенос закончен
     (решение заказчика 24.09.2026). */
  const on = await query(`SELECT value FROM settings WHERE key = 'money_rules'`);
  if (!on.rows[0] || on.rows[0].value !== '1') return 0;

  /* Начисления за проживание и депозит — в порядке, в котором их закрывают
     деньги. Пени сюда не берём. */
  const r = await query(`
    SELECT c.id, c.booking_id, COALESCE('contract:'||b.contract_id,'booking:'||b.id) AS ledger, c.kind, c.period, c.amount, c.due_date,
           (CURRENT_DATE - c.due_date) AS days_late,
           COALESCE((SELECT SUM(p.amount) FROM payments p JOIN bookings x ON x.id=p.booking_id WHERE x.id=b.id OR x.contract_id=b.contract_id), 0) AS paid
      FROM charges c JOIN bookings b ON b.id=c.booking_id
     WHERE c.kind IN ('rent', 'deposit') AND c.cancelled_at IS NULL
     ORDER BY ledger, COALESCE(c.period, c.created_at::date), c.id`);

  let bookingId = null;
  let left = 0;                        // сколько денег ещё не разнесено
  let touched = 0;

  for (const c of r.rows) {
    if (c.ledger !== bookingId) { bookingId = c.ledger; left = Number(c.paid); }
    const amount = Number(c.amount);
    const covered = Math.min(left, amount);
    left -= covered;
    const unpaid = amount - covered;

    if (c.kind !== 'rent' || !c.period || !c.due_date) continue;
    const days = Number(c.days_late);
    const due = unpaid > 0 ? amountFor(days) : 0;
    if (due <= 0) continue;

    const has = await query(
      `SELECT ch.id, ch.amount, ch.cancelled_at FROM charges ch JOIN bookings x ON x.id=ch.booking_id
        WHERE (x.id=$1 OR x.contract_id=(SELECT contract_id FROM bookings WHERE id=$1)) AND ch.kind='penalty' AND ch.period=$2 LIMIT 1`,
      [c.booking_id, c.period]);
    const row = has.rows[0];

    if (!row) {
      await query(
        `INSERT INTO charges (booking_id, kind, period, amount, due_date, note)
         VALUES ($1, 'penalty', $2, $3, CURRENT_DATE, $4)`,
        [c.booking_id, c.period, due, 'Пени за просрочку оплаты, дней: ' + days]);
      touched++;
    } else if (!row.cancelled_at && Number(row.amount) !== due) {
      await query(
        `UPDATE charges SET amount = $1, note = $2 WHERE id = $3`,
        [due, 'Пени за просрочку оплаты, дней: ' + days, row.id]);
      touched++;
    }
  }
  return touched;
}

module.exports = { sweepPenalties, amountFor, FIRST_DAY, PER_DAY };
