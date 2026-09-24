'use strict';

/* ============================================================
   Доступ резидента закрывается после выезда

   Правило заказчика (25.09.2026): модератор ставит дату выезда —
   запланированную или уже случившуюся, — и на следующий день после
   неё человек перестаёт входить в кабинет.

   Считаем не по одной дате, а по всем контрактам человека: доступ
   открыт, пока есть хоть один живой. Так закрывается и второй
   случай — контракт просто кончился в августе и не продлён. Появился
   новый контракт — доступ открывается сам.

   Данные при этом никуда не деваются. Брони, начисления, документы и
   подписи остаются в шахматке и в карточке резидента навсегда, пока
   заказчик не попросит убрать старое отдельно. Поэтому учётная запись
   отключается, а не удаляется: удаление оборвало бы историю.

   Отключаем только тех, кого закрыла сама система, — и открываем
   обратно тоже только их. Запись, отключённую руками, не трогаем.
   ============================================================ */

const { query } = require('./db');

async function sweepAccess() {
  /* Тот же выключатель, что у пеней и продажи мест. Пока идёт перенос со
     старой шахматки, контракты у части резидентов восстановлены по броням
     и кончаются раньше, чем на самом деле. Без выключателя система в первый
     же час заперла живущего человека — Мищенко Александра (25.09.2026). */
  const on = await query(`SELECT value FROM settings WHERE key = 'money_rules'`);
  if (!on.rows[0] || on.rows[0].value !== '1') return { closed: 0, opened: 0, off: true };

  /* Закрыть: резидент, доступ открыт, контракты были, но живого нет. */
  const closed = await query(`
    UPDATE users u SET is_active = false, closed_by_system = true
     WHERE u.role = 'resident' AND u.is_active
       AND EXISTS (SELECT 1 FROM contracts c WHERE c.user_id = u.id)
       AND NOT EXISTS (
         SELECT 1 FROM contracts c
          WHERE c.user_id = u.id
            AND COALESCE(c.ended_at, c.date_to) >= CURRENT_DATE)
     RETURNING u.id, u.name`);

  /* Открыть обратно: появился живой контракт, а закрывала система. */
  const opened = await query(`
    UPDATE users u SET is_active = true, closed_by_system = false
     WHERE u.role = 'resident' AND NOT u.is_active AND u.closed_by_system
       AND EXISTS (
         SELECT 1 FROM contracts c
          WHERE c.user_id = u.id
            AND COALESCE(c.ended_at, c.date_to) >= CURRENT_DATE)
     RETURNING u.id, u.name`);

  for (const x of closed.rows) {
    await query(`INSERT INTO audit_log (actor_id, action, target, payload)
                 VALUES (NULL, 'access.close', $1, $2)`,
      ['user:' + x.id, JSON.stringify({ name: x.name, why: 'выехал' })]);
  }
  for (const x of opened.rows) {
    await query(`INSERT INTO audit_log (actor_id, action, target, payload)
                 VALUES (NULL, 'access.open', $1, $2)`,
      ['user:' + x.id, JSON.stringify({ name: x.name, why: 'новый контракт' })]);
  }

  return { closed: closed.rowCount, opened: opened.rowCount };
}

module.exports = { sweepAccess };
