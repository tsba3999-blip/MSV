-- МСВ — сотрудники (от заказчика 16.09.2026). После schema.sql.
-- Контакты для входа не сообщены: заведены служебные почты вида staff-N@import.msv.local.
-- Замените на настоящие телефоны и выдайте коды входа в разделе «Сотрудники».
BEGIN;
WITH s(name, role, email, position, place, birthday, started_at, salary) AS (VALUES
  ('Чупахина Юлия',    'moderator', 'staff-1@import.msv.local', 'Модератор',                'all',  '1972-12-13'::date, '2025-01-15'::date, NULL::integer),
  ('Зорина Марина',    'staff',     'staff-2@import.msv.local', 'Горничная-администратор',  NULL,   '1977-07-04'::date, '2023-09-01'::date, 60000),
  ('Мирзоева Фарогат', 'staff',     'staff-3@import.msv.local', 'Горничная-администратор',  NULL,   '1990-01-15'::date, '2026-08-25'::date, 80000),
  ('Лэкэтуш Наталья',  'staff',     'staff-4@import.msv.local', 'Горничная-администратор',  NULL,   '1983-05-14'::date, '2025-10-01'::date, 60000),
  ('Харина Елена',     'staff',     'staff-5@import.msv.local', 'Ассистент',                NULL,   NULL,               NULL,               NULL)
), u AS (
  INSERT INTO users (role, name, email) SELECT role::user_role, name, email FROM s
  ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role RETURNING id, email
)
INSERT INTO staff_profiles (user_id, position, place, birthday, started_at, salary, relation)
SELECT u.id, s.position, s.place, s.birthday, s.started_at, s.salary, 'уточнить' FROM u JOIN s ON s.email = u.email
ON CONFLICT (user_id) DO UPDATE SET position = EXCLUDED.position, place = COALESCE(EXCLUDED.place, staff_profiles.place),
  birthday = EXCLUDED.birthday, started_at = EXCLUDED.started_at, salary = EXCLUDED.salary;
COMMIT;
