'use strict';

/* ============================================================
   Начисления за проживание по месяцам

   Правило заказчика: оплата за следующий месяц — до 24:00 15 числа
   текущего. Чтобы это правило работало, у месяца должно быть
   начисление: пени считаются от него, продажа места — от него,
   долг в шахматке — от него.

   До сих пор начисление появлялось только в момент брони и только
   за выбранные при заезде месяцы. Дальше — ничего: человек с годовым
   контрактом, оплативший сентябрь, за октябрь счёта не получал
   никогда. Долга не возникало, пени не начислялись, место на продажу
   не выставлялось. Всё правило оплаты существовало на бумаге
   (найдено на прогоне 25.09.2026).

   Что делает этот обход: раз в час проверяет живые контракты и
   доводит начисления до текущего и следующего месяца. Назад не
   заглядывает — месяцы до сегодняшнего оставлены человеку: при
   переносе со старой шахматки история оплат неполная, и придумывать
   за неё долги нельзя.

   Август последнего года контракта не начисляем, если по нему уже
   проведён депозит: депозит — это и есть оплата августа (Правила,
   п. 6.1).
   ============================================================ */

const { query } = require('./db');

function monthKey(d) { return d.toISOString().slice(0, 7); }

async function sweepAccrual() {
  /* Тот же выключатель, что у пеней, продажи мест и закрытия доступа:
     денежные правила включаются разом, когда перенос закончен. */
  const on = await query(`SELECT value FROM settings WHERE key = 'money_rules'`);
  if (!on.rows[0] || on.rows[0].value !== '1') return { added: 0, off: true };

  /* Живые контракты и последняя бронь каждого: начисление вешаем на
     ту бронь, где человек живёт сейчас, — после переезда это новая. */
  const live = await query(`
    SELECT c.id, c.price, c.date_from::text AS from, c.date_to::text AS to,
           COALESCE(c.ended_at, c.date_to)::text AS until,
           (SELECT b.id FROM bookings b WHERE b.contract_id = c.id
             ORDER BY b.date_from DESC LIMIT 1) AS booking_id
      FROM contracts c
     WHERE COALESCE(c.ended_at, c.date_to) >= CURRENT_DATE`);

  const now = new Date();
  const thisMonth = monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
  const nextMonth = monthKey(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)));

  let added = 0;
  for (const c of live.rows) {
    if (!c.booking_id || !c.price) continue;

    for (const period of [thisMonth, nextMonth]) {
      /* Месяц должен попадать внутрь контракта */
      if (period < String(c.from).slice(0, 7)) continue;
      if (period > String(c.until).slice(0, 7)) continue;

      /* Уже начислено за этот месяц по этому контракту? Смотрим по всем
         броням контракта: после переезда бронь другая, а месяц тот же. */
      const has = await query(`
        SELECT 1 FROM charges ch
          JOIN bookings b ON b.id = ch.booking_id
         WHERE b.contract_id = $1 AND ch.kind IN ('rent', 'deposit')
           AND to_char(ch.period, 'YYYY-MM') = $2 AND ch.cancelled_at IS NULL
         LIMIT 1`, [c.id, period]);
      if (has.rows[0]) continue;

      await query(`
        INSERT INTO charges (booking_id, kind, period, amount, due_date)
        VALUES ($1, 'rent', ($2 || '-01')::date, $3,
                GREATEST((($2 || '-01')::date - interval '1 month')::date + 14, CURRENT_DATE))`,
        [c.booking_id, period, c.price]);
      added++;
    }
  }

  if (added) {
    await query(`INSERT INTO audit_log (actor_id, action, target, payload)
                 VALUES (NULL, 'accrual.add', 'system', $1)`,
      [JSON.stringify({ added, months: [thisMonth, nextMonth] })]);
  }
  return { added };
}

module.exports = { sweepAccrual };
