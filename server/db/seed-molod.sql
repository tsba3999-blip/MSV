-- МСВ — реальные резиденты Молодежки (таблица заказчика от 22.09.2026). После schema.sql и seed.sql.
-- Шесть девушек, заезд 01.09.2026 14:00, выезд 01.10.2026 12:00, годовой контракт.
-- Места: 1.1.н — нижнее, 1.2.в — верхнее, 2.1/2.2 — средняя комната, 3.1/3.2 — большая («гостиная»).
-- Повторный запуск безопасен: ON CONFLICT по телефону, бронь не дублируется.
BEGIN;

UPDATE rooms SET gender = 'ж' WHERE id IN ('molod-r1', 'molod-r2', 'molod-r3');

WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Дуйшенова София', '+79035680818', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, gender, university, city, docs_signed_at)
  SELECT id, 'Дуйшенова', 'София', NULL, 'ж', 'Синергия', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET gender = EXCLUDED.gender, university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'molod-b2-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'molod-b2-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 32000, '2026-09-15'::date FROM b;

WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Юдина Вероника', '+79293287628', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, gender, university, city, docs_signed_at)
  SELECT id, 'Юдина', 'Вероника', NULL, 'ж', 'ИСИ', NULL, '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET gender = EXCLUDED.gender, university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'molod-b1-2', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'molod-b1-2' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 25000, '2026-09-15'::date FROM b;

WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Володина Светлана', '+79683907099', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, gender, university, city, docs_signed_at)
  SELECT id, 'Володина', 'Светлана', NULL, 'ж', 'МПК', NULL, '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET gender = EXCLUDED.gender, university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'molod-b2-2', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'molod-b2-2' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 32000, '2026-09-15'::date FROM b;

WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Рахматуллина Надира', '+79172937943', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, gender, university, city, docs_signed_at)
  SELECT id, 'Рахматуллина', 'Надира', NULL, 'ж', 'ИСИ', NULL, '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET gender = EXCLUDED.gender, university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'molod-b3-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'molod-b3-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 35000, '2026-09-15'::date FROM b;

WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Лебедева Светлана', '+79969231000', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, gender, university, city, docs_signed_at)
  SELECT id, 'Лебедева', 'Светлана', NULL, 'ж', 'МГИМО', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET gender = EXCLUDED.gender, university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'molod-b3-2', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'molod-b3-2' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 35000, '2026-09-15'::date FROM b;

WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Дидыч Анна', '+79508982713', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, gender, university, city, docs_signed_at)
  SELECT id, 'Дидыч', 'Анна', NULL, 'ж', 'ИСИ', NULL, '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET gender = EXCLUDED.gender, university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'molod-b1-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'molod-b1-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 28000, '2026-09-15'::date FROM b;

COMMIT;
