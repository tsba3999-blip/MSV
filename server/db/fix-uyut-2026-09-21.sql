-- Сверка с системой заказчика 21.09.2026 (скриншоты шахматки):
--   №1 Иваново, №2 Казань, №3 Ярославль — по 4 места; мест 1.5, 1.6, 2.5, 2.6, 3.5, 3.6 нет,
--   брони шести человек на них — ошибка выгрузки от 16.09.
--   №12 Сочи — 12 мест (в плане было 8).
--   Места 2.1, 2.2, 3.1, 3.2 — верхние (ярус не был указан).
-- Применять один раз: sudo -u postgres psql msv -f fix-uyut-2026-09-21.sql
-- Затем: bash /var/www/MSV/server/seed-people.sh — подтянет ярусы из seed-uyut.sql.

BEGIN;

DELETE FROM bookings WHERE bed_id IN ('uyut-b1-5','uyut-b1-6','uyut-b2-5','uyut-b2-6','uyut-b3-5','uyut-b3-6');
DELETE FROM beds     WHERE id     IN ('uyut-b1-5','uyut-b1-6','uyut-b2-5','uyut-b2-6','uyut-b3-5','uyut-b3-6');

UPDATE beds SET label = '2.1.в', tier = 'верхнее' WHERE id = 'uyut-b2-1';
UPDATE beds SET label = '2.2.в', tier = 'верхнее' WHERE id = 'uyut-b2-2';
UPDATE beds SET label = '3.1.в', tier = 'верхнее' WHERE id = 'uyut-b3-1';
UPDATE beds SET label = '3.2.в', tier = 'верхнее' WHERE id = 'uyut-b3-2';

UPDATE rooms SET size = 12 WHERE id = 'uyut-r12';

COMMIT;

SELECT r.name, r.size, count(b.id) AS beds,
       count(*) FILTER (WHERE b.tier IS NULL) AS untiered
FROM rooms r LEFT JOIN beds b ON b.room_id = r.id
WHERE r.id IN ('uyut-r1','uyut-r2','uyut-r3','uyut-r12')
GROUP BY r.name, r.size ORDER BY r.name;
