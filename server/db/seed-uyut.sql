-- МСВ — реальные резиденты Уюта (файл заказчика от 14.09.2026).
-- Применять после schema.sql и seed.sql: sudo -u postgres psql msv -f server/db/seed-uyut.sql

BEGIN;

-- Структура по факту: комнаты 1–3 по 6 мест, Сочи — 12 капсул
-- Пояснение про основные и дополнительные места снято заказчиком 23.09.2026:
-- количество мест и так стоит строкой выше в карточке
UPDATE rooms SET size = 6, note = NULL WHERE id IN ('uyut-r1','uyut-r2','uyut-r3');
UPDATE rooms SET size = 12 WHERE id = 'uyut-r12';

INSERT INTO beds (id, room_id, label, tier, price) VALUES
  ('uyut-b1-1', 'uyut-r1', '1.1.в', 'верхнее', 24200),
  ('uyut-b1-2', 'uyut-r1', '1.2.в', 'верхнее', 24200),
  ('uyut-b1-3', 'uyut-r1', '1.3.н', 'нижнее', 27500),
  ('uyut-b1-4', 'uyut-r1', '1.4.н', 'нижнее', 27500),
  ('uyut-b2-1', 'uyut-r2', '2.1.в', 'верхнее', 24200),
  ('uyut-b2-2', 'uyut-r2', '2.2.в', 'верхнее', 24200),
  ('uyut-b2-3', 'uyut-r2', '2.3.н', 'нижнее', 27500),
  ('uyut-b2-4', 'uyut-r2', '2.4.н', 'нижнее', 27500),
  ('uyut-b3-1', 'uyut-r3', '3.1.в', 'верхнее', 24200),
  ('uyut-b3-2', 'uyut-r3', '3.2.в', 'верхнее', 24200),
  ('uyut-b3-3', 'uyut-r3', '3.3.н', 'нижнее', 27500),
  ('uyut-b3-4', 'uyut-r3', '3.4.н', 'нижнее', 27500),
  ('uyut-b4-1', 'uyut-r4', '4.1.в', 'верхнее', 35200),
  ('uyut-b4-2', 'uyut-r4', '4.2.н', 'нижнее', 38500),
  ('uyut-b6-1', 'uyut-r6', '6.1.в', 'верхнее', 24200),
  ('uyut-b6-2', 'uyut-r6', '6.2.в', 'верхнее', 24200),
  ('uyut-b6-3', 'uyut-r6', '6.3.н', 'нижнее', 27500),
  ('uyut-b6-4', 'uyut-r6', '6.4.н', 'нижнее', 27500),
  ('uyut-b7-1', 'uyut-r7', '7.1.в', 'верхнее', 24200),
  ('uyut-b7-2', 'uyut-r7', '7.2.в', 'верхнее', 24200),
  ('uyut-b7-3', 'uyut-r7', '7.3.н', 'нижнее', 27500),
  ('uyut-b7-4', 'uyut-r7', '7.4.н', 'нижнее', 27500),
  ('uyut-b8-1', 'uyut-r8', '8.1.в', 'верхнее', 24200),
  ('uyut-b8-2', 'uyut-r8', '8.2.в', 'верхнее', 24200),
  ('uyut-b8-3', 'uyut-r8', '8.3.н', 'нижнее', 27500),
  ('uyut-b8-4', 'uyut-r8', '8.4.н', 'нижнее', 27500),
  ('uyut-b9-1', 'uyut-r9', '9.1.в', 'верхнее', 24200),
  ('uyut-b9-2', 'uyut-r9', '9.2.в', 'верхнее', 24200),
  ('uyut-b9-3', 'uyut-r9', '9.3.н', 'нижнее', 27500),
  ('uyut-b9-4', 'uyut-r9', '9.4.н', 'нижнее', 27500),
  ('uyut-b10-1', 'uyut-r10', '10.1.в', 'верхнее', 35200),
  ('uyut-b10-2', 'uyut-r10', '10.2.н', 'нижнее', 38500),
  ('uyut-b11-1', 'uyut-r11', '11.1.в', 'верхнее', 22000),
  ('uyut-b11-2', 'uyut-r11', '11.2.в', 'верхнее', 22000),
  ('uyut-b11-3', 'uyut-r11', '11.3.в', 'верхнее', 22000),
  ('uyut-b11-4', 'uyut-r11', '11.4.н', 'нижнее', 25300),
  ('uyut-b11-5', 'uyut-r11', '11.5.н', 'нижнее', 25300),
  ('uyut-b11-6', 'uyut-r11', '11.6.н', 'нижнее', 25300),
  ('uyut-b12-1', 'uyut-r12', '12.1.в', 'верхнее', 20900),
  ('uyut-b12-2', 'uyut-r12', '12.2.в', 'верхнее', 20900),
  ('uyut-b12-3', 'uyut-r12', '12.3.в', 'верхнее', 20900),
  ('uyut-b12-4', 'uyut-r12', '12.4.в', 'верхнее', 20900),
  ('uyut-b12-5', 'uyut-r12', '12.5.в', 'верхнее', 20900),
  ('uyut-b12-6', 'uyut-r12', '12.6.в', 'верхнее', 20900),
  ('uyut-b12-7', 'uyut-r12', '12.7.н', 'нижнее', 24200),
  ('uyut-b12-8', 'uyut-r12', '12.8.н', 'нижнее', 24200),
  ('uyut-b12-9', 'uyut-r12', '12.9.н', 'нижнее', 24200),
  ('uyut-b12-10', 'uyut-r12', '12.10.н', 'нижнее', 24200),
  ('uyut-b12-11', 'uyut-r12', '12.11.н', 'нижнее', 24200),
  ('uyut-b12-12', 'uyut-r12', '12.12.н', 'нижнее', 24200),
  ('uyut-b13-1', 'uyut-r13', '13.1.в', 'верхнее', 24200),
  ('uyut-b13-2', 'uyut-r13', '13.2.в', 'верхнее', 24200),
  ('uyut-b13-3', 'uyut-r13', '13.3.н', 'нижнее', 27500),
  ('uyut-b13-4', 'uyut-r13', '13.4.н', 'нижнее', 27500),
  ('uyut-b14-1', 'uyut-r14', '14.1.в', 'верхнее', 35200),
  ('uyut-b14-2', 'uyut-r14', '14.2.н', 'нижнее', 38500),
  ('uyut-b15-1', 'uyut-r15', '15.1.в', 'верхнее', 24200),
  ('uyut-b15-2', 'uyut-r15', '15.2.в', 'верхнее', 24200),
  ('uyut-b15-3', 'uyut-r15', '15.3.н', 'нижнее', 27500),
  ('uyut-b15-4', 'uyut-r15', '15.4.н', 'нижнее', 27500),
  ('uyut-b16-1', 'uyut-r16', '16.1.в', 'верхнее', 20900),
  ('uyut-b16-2', 'uyut-r16', '16.2.в', 'верхнее', 20900),
  ('uyut-b16-3', 'uyut-r16', '16.3.в', 'верхнее', 20900),
  ('uyut-b16-4', 'uyut-r16', '16.4.в', 'верхнее', 20900),
  ('uyut-b16-5', 'uyut-r16', '16.5.н', 'нижнее', 24200),
  ('uyut-b16-6', 'uyut-r16', '16.6.н', 'нижнее', 24200),
  ('uyut-b16-7', 'uyut-r16', '16.7.н', 'нижнее', 24200),
  ('uyut-b16-8', 'uyut-r16', '16.8.н', 'нижнее', 24200),
  ('uyut-b17-1', 'uyut-r17', '17.1.в', 'верхнее', 24200),
  ('uyut-b17-2', 'uyut-r17', '17.2.в', 'верхнее', 24200),
  ('uyut-b17-3', 'uyut-r17', '17.3.н', 'нижнее', 27500),
  ('uyut-b17-4', 'uyut-r17', '17.4.н', 'нижнее', 27500)
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, tier = EXCLUDED.tier, price = EXCLUDED.price;
-- Старые сгенерированные метки мест убираем, если на них нет броней
DELETE FROM beds WHERE room_id LIKE 'uyut-r%' AND id NOT IN ('uyut-b1-1', 'uyut-b1-2', 'uyut-b1-3', 'uyut-b1-4', 'uyut-b2-1', 'uyut-b2-2', 'uyut-b2-3', 'uyut-b2-4', 'uyut-b3-1', 'uyut-b3-2', 'uyut-b3-3', 'uyut-b3-4', 'uyut-b4-1', 'uyut-b4-2', 'uyut-b6-1', 'uyut-b6-2', 'uyut-b6-3', 'uyut-b6-4', 'uyut-b7-1', 'uyut-b7-2', 'uyut-b7-3', 'uyut-b7-4', 'uyut-b8-1', 'uyut-b8-2', 'uyut-b8-3', 'uyut-b8-4', 'uyut-b9-1', 'uyut-b9-2', 'uyut-b9-3', 'uyut-b9-4', 'uyut-b10-1', 'uyut-b10-2', 'uyut-b11-1', 'uyut-b11-2', 'uyut-b11-3', 'uyut-b11-4', 'uyut-b11-5', 'uyut-b11-6', 'uyut-b12-1', 'uyut-b12-2', 'uyut-b12-3', 'uyut-b12-4', 'uyut-b12-5', 'uyut-b12-6', 'uyut-b12-7', 'uyut-b12-8', 'uyut-b12-9', 'uyut-b12-10', 'uyut-b12-11', 'uyut-b12-12', 'uyut-b13-1', 'uyut-b13-2', 'uyut-b13-3', 'uyut-b13-4', 'uyut-b14-1', 'uyut-b14-2', 'uyut-b15-1', 'uyut-b15-2', 'uyut-b15-3', 'uyut-b15-4', 'uyut-b16-1', 'uyut-b16-2', 'uyut-b16-3', 'uyut-b16-4', 'uyut-b16-5', 'uyut-b16-6', 'uyut-b16-7', 'uyut-b16-8', 'uyut-b17-1', 'uyut-b17-2', 'uyut-b17-3', 'uyut-b17-4') AND NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = beds.id);

WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Рудов Матвей', '+79508582208', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Рудов', 'Матвей', NULL, 'МИРЭА', NULL, '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b15-4', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b15-4' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 27500, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, email, first_login) VALUES ('resident', 'Сущинская Виталина', 'uyut-2@import.msv.local', now())
  ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Сущинская', 'Виталина', NULL, 'МИБиУ', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b9-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b9-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 24200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Михалев Максим', '+79771425208', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Михалев', 'Максим', NULL, 'Чуйкова', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b15-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b15-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 24200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Радомская Виктория', '+79912108890', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Радомская', 'Виктория', NULL, 'колледж Останкино', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b2-3', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b2-3' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 27500, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Морозов Влад', '+79616643783', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Морозов', 'Влад', NULL, 'МИРЭА', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b14-2', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b14-2' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 38500, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Ярохно Яросвет', '+79923510474', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Ярохно', 'Яросвет', NULL, 'Синергия', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b7-2', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b7-2' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 24200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Бондарев Тимофей', '+79639391739', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Бондарев', 'Тимофей', NULL, 'ТПСК им. Максимчука', NULL, '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b12-11', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b12-11' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 24200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Морозова Вероника', '+79774844677', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Морозова', 'Вероника', NULL, 'Чуйкова', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b2-4', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b2-4' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 27500, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Копылова Виктория', '+79521239103', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Копылова', 'Виктория', NULL, 'Чуйкова', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b8-2', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b8-2' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 24200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Дорофеев Михаил', '+79627560609', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Дорофеев', 'Михаил', NULL, 'ГИТР', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b17-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b17-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 24200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Хван Лия', '+79374820444', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Хван', 'Лия', NULL, 'РУДН', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b1-3', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b1-3' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 27500, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Гёзюток Дерья', '+79277339349', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Гёзюток', 'Дерья', NULL, 'Сеченова', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b2-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b2-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 24200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Калчев Владислав', '+79995990323', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Калчев', 'Владислав', NULL, 'МФЮА', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b13-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b13-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 24200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Федосеев Николай', '+79532336795', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Федосеев', 'Николай', NULL, 'НИИ МАИ', NULL, '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b13-2', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b13-2' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 24200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Ежова Кристина', '+79176903710', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Ежова', 'Кристина', NULL, 'МАБиУ', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b1-4', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b1-4' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 27500, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Бердюгина Лилия', '+79516000746', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Бердюгина', 'Лилия', NULL, 'МПГУ ИПП', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b1-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b1-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 24200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Евдешин Михаил', '+79506978913', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Евдешин', 'Михаил', NULL, 'ОЧУ ВО ММА', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b16-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b16-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 20900, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Соловьева Александра', '+79802077782', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Соловьева', 'Александра', NULL, 'Синергия', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b11-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b11-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 22000, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Донской Лев', '+79526233353', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Донской', 'Лев', NULL, 'РАНХиГС', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b3-3', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b3-3' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 27500, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Смирнова Анастасия', '+37251986055', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Смирнова', 'Анастасия', NULL, 'НИТИ им. Ершова', 'Эстония', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b11-4', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b11-4' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 25300, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Варфоломеева Елена', '+79518677095', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Варфоломеева', 'Елена', NULL, 'МАИ', NULL, '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b1-2', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b1-2' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 24200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Икрянников Владимир', '+79047735864', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Икрянников', 'Владимир', NULL, 'РУДН Инженерная Академия', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b3-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b3-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 24200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Тельтевской Матвей', '+79527925179', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Тельтевской', 'Матвей', NULL, 'Колледж СУ №10', NULL, '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b3-2', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b3-2' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 24200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Акопян Карен', '+79294240584', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Акопян', 'Карен', NULL, 'МТИ', NULL, '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b13-3', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b13-3' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 27500, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Шлык Алексей', '+79315858308', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Шлык', 'Алексей', NULL, 'РМ', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b12-3', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b12-3' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 20900, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Бургуван Александр', '+79042966515', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Бургуван', 'Александр', NULL, 'МИРЭА', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b12-4', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b12-4' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 20900, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Фофанов Руслан', '+79027777707', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Фофанов', 'Руслан', NULL, 'Синергия', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b12-6', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b12-6' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 20900, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Артемьева Алина', '+79121622081', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Артемьева', 'Алина', NULL, 'МГППУ', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b4-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b4-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 35200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Медведева Дарья', '+79375723504', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Медведева', 'Дарья', NULL, 'Чуйкова', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b4-2', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b4-2' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 38500, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Некипелов Лев', '+79197097743', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Некипелов', 'Лев', NULL, 'РУДН', NULL, '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b6-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b6-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 24200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Никоненко Ярослава', '+79082163035', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Никоненко', 'Ярослава', NULL, 'ИСИ', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b11-3', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b11-3' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 22000, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Дрозд Борис', '+79141595237', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Дрозд', 'Борис', NULL, 'ИСИ', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b13-4', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b13-4' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 27500, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Глушин Игорь', '+79201657374', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Глушин', 'Игорь', NULL, 'Чуйкова', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b6-2', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b6-2' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 24200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Бабкин Максим', '+79217146848', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Бабкин', 'Максим', NULL, 'ИСИ', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b6-3', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b6-3' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 27500, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Подгорный Максим', '+79171239575', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Подгорный', 'Максим', NULL, 'Синергия', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b6-4', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b6-4' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 27500, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Думанская Анна', '+79100914177', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Думанская', 'Анна', NULL, 'Чуйкова', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b8-4', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b8-4' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 27500, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Киряш Эдуард', '+37498753340', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Киряш', 'Эдуард', NULL, 'Синергия', 'Казахстан', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b7-3', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b7-3' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 27500, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, email, first_login) VALUES ('resident', 'Орехов Александр', 'uyut-39@import.msv.local', now())
  ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Орехов', 'Александр', NULL, 'Чуйкова', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b7-4', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b7-4' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 27500, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Рахимова Эльвира', '+79269784149', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Рахимова', 'Эльвира', NULL, 'Чуйкова', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b9-3', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b9-3' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 27500, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Мхабела Аян Ксонги', '+79809405623', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Мхабела', 'Аян', 'Ксонги', 'МГМУ им. Сеченова', 'Южно-Африканская Республика', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b8-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b8-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 24200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Лучинин Кирилл', '+79962492815', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Лучинин', 'Кирилл', NULL, 'ВИТТЕ', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b15-2', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b15-2' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 24200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Федоров Александр', '+79643117220', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Федоров', 'Александр', NULL, 'МГТУ', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b15-3', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b15-3' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 27500, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Киур Мария', '+79517085022', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Киур', 'Мария', NULL, 'Синергия', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b11-6', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b11-6' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 25300, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, email, first_login) VALUES ('resident', 'Бердюгин Тимофей', 'uyut-45@import.msv.local', now())
  ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Бердюгин', 'Тимофей', NULL, 'Колледж МЧС им. Чуйкова', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b16-3', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b16-3' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 20900, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Гайнуллин Карим', '+79174831858', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Гайнуллин', 'Карим', NULL, 'Синергия', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b16-5', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b16-5' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 24200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Морозов Богдан', '+77058097020', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Морозов', 'Богдан', NULL, 'ММУ', 'Кыргызская Республика', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b16-6', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b16-6' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 24200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Хон Никита', '+79810483430', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Хон', 'Никита', NULL, 'РМ', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b16-7', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b16-7' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 24200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Безуглый Константин', '+79533262636', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Безуглый', 'Константин', NULL, 'ГИТР', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b16-8', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b16-8' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 24200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Сушенцов Никита', '+79195118681', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Сушенцов', 'Никита', NULL, NULL, 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b17-3', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b17-3' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 27500, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Передереев Иван', '+79157581953', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Передереев', 'Иван', NULL, 'РУДН', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b17-2', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b17-2' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 24200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Бурданов Руслан', '+79936100779', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Бурданов', 'Руслан', NULL, 'КАДР №26', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b17-4', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b17-4' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 27500, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Попов Максим', '+79517453773', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Попов', 'Максим', NULL, 'РГГУ', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b14-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b14-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 35200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Копылов Арсений', '+79069858499', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Копылов', 'Арсений', NULL, 'АНОПО им. Грибоедова', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b16-2', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b16-2' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 20900, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Трещев Максим', '+79102077739', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Трещев', 'Максим', NULL, 'РУТ МИИТ', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b12-5', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b12-5' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 20900, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Куценко Варвара', '+79777111509', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Куценко', 'Варвара', NULL, 'Синергия', 'Украина', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b11-5', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b11-5' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 25300, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Савинов Дмитрий', '+79951060883', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Савинов', 'Дмитрий', NULL, NULL, 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b12-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b12-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 20900, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Тагбаев Ахлиддин', '+79939149104', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Тагбаев', 'Ахлиддин', NULL, 'МГКЭИТ', NULL, '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b12-2', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b12-2' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 20900, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, email, first_login) VALUES ('resident', 'Корепанов Егор', 'uyut-61@import.msv.local', now())
  ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Корепанов', 'Егор', NULL, NULL, 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b12-8', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b12-8' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 24200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Павлов Константин ГБПОУ ТПСК ИМ', '+79160838242', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Павлов', 'Константин', 'ГБПОУ ТПСК ИМ', 'Менделеева', NULL, '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b3-4', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b3-4' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 27500, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Назаров Александр', '+79278252697', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Назаров', 'Александр', NULL, 'МАИ', NULL, '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b12-10', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b12-10' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 24200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Князьков Даниил', '+79014851923', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Князьков', 'Даниил', NULL, 'РЭУ Плеханова', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b12-12', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b12-12' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 24200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Хижба Баграт', '+79289052148', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Хижба', 'Баграт', NULL, 'РГГУ', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b10-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b10-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 35200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Поспелова Анастасия', '+79504259069', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Поспелова', 'Анастасия', NULL, 'МГЭУ', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b11-2', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b11-2' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 22000, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Холстинина Дарья', '+79809523149', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Холстинина', 'Дарья', NULL, 'ФГБНУ РНЦХ им. Петровского', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b9-2', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b9-2' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 24200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Кузина Варвара', '+79521166932', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Кузина', 'Варвара', NULL, 'ВАВТ', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b2-2', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b2-2' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 24200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Былинкин Андрей', '+79271498557', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Былинкин', 'Андрей', NULL, 'РМ', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b12-7', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b12-7' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 24200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Редькина Ксения', '+79206238119', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Редькина', 'Ксения', NULL, 'МГЛУ', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b9-4', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b9-4' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 27500, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Быкова Екатерина', '+79898335824', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Быкова', 'Екатерина', NULL, 'РАНХиГС', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b8-3', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b8-3' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 27500, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Мизинов Егор', '+79610132487', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Мизинов', 'Егор', NULL, 'ГМПИ', 'Российская Федерация', '2026-09-01' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b12-9', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b12-9' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 24200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Кузьменко Святослав', '+79510778809', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Кузьменко', 'Святослав', NULL, 'Чуйкова', 'Российская Федерация', '2026-09-05' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b7-1', '2026-09-05', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b7-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-05'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 24200, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Яковлев Максим', '+79149369452', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Яковлев', 'Максим', NULL, 'МИРЭА', 'Российская Федерация', '2026-09-05' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b10-2', '2026-09-05', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b10-2' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-05'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 38500, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Попков Алексей', '+79190392668', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Попков', 'Алексей', NULL, 'МПГУ', 'Российская Федерация', '2026-09-09' FROM u ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'uyut-b16-4', '2026-09-09', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'uyut-b16-4' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-09'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 20900, '2026-09-15'::date FROM b;

COMMIT;
