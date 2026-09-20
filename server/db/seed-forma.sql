-- МСВ — реальные резиденты Формы (PDF заказчика от 14.09.2026). После schema.sql и seed.sql.
BEGIN;

INSERT INTO beds (id, room_id, label, tier, price) VALUES
  ('forma-b1-1', 'forma-r1', '1.1.н', 'нижнее', 38170),
  ('forma-b1-2', 'forma-r1', '1.2.н', 'нижнее', 38170),
  ('forma-b1-3', 'forma-r1', '1.3.в', 'верхнее', 34100),
  ('forma-b1-4', 'forma-r1', '1.4.в', 'верхнее', 34100),
  ('forma-b2-1', 'forma-r2', '2.1.н', 'нижнее', 38170),
  ('forma-b2-2', 'forma-r2', '2.2.н', 'нижнее', 38170),
  ('forma-b2-3', 'forma-r2', '2.3.в', 'верхнее', 34100),
  ('forma-b2-4', 'forma-r2', '2.4.в', 'верхнее', 34100),
  ('forma-b3-1', 'forma-r3', '3.1.н', 'нижнее', 38170),
  ('forma-b3-2', 'forma-r3', '3.2.н', 'нижнее', 38170),
  ('forma-b3-3', 'forma-r3', '3.3.в', 'верхнее', 34100),
  ('forma-b3-4', 'forma-r3', '3.4.в', 'верхнее', 34100),
  ('forma-b4-1', 'forma-r4', '4.1.н', 'нижнее', 38170),
  ('forma-b4-2', 'forma-r4', '4.2.н', 'нижнее', 38170),
  ('forma-b4-3', 'forma-r4', '4.3.в', 'верхнее', 34100),
  ('forma-b4-4', 'forma-r4', '4.4.в', 'верхнее', 34100),
  ('forma-b5-1', 'forma-r5', '5.1.в', 'верхнее', 43700),
  ('forma-b5-2', 'forma-r5', '5.2.н', 'нижнее', 47750),
  ('forma-b6-1', 'forma-r6', '6.1', NULL, 38500),
  ('forma-b7-1', 'forma-r7', '7.1.в', 'верхнее', 43700),
  ('forma-b7-2', 'forma-r7', '7.2.н', 'нижнее', 47750),
  ('forma-b8-1', 'forma-r8', '8.1.в', 'верхнее', 31350),
  ('forma-b8-2', 'forma-r8', '8.2.н', 'нижнее', 34100),
  ('forma-b8-3', 'forma-r8', '8.3.в', 'верхнее', 31350),
  ('forma-b8-4', 'forma-r8', '8.4.н', 'нижнее', 34100),
  ('forma-b9-1', 'forma-r9', '9.1.в', 'верхнее', 39050),
  ('forma-b9-2', 'forma-r9', '9.2.н', 'нижнее', 44350),
  ('forma-b10-1', 'forma-r10', '10.1.в', 'верхнее', 27280),
  ('forma-b10-2', 'forma-r10', '10.2.н', 'нижнее', 31350),
  ('forma-b10-3', 'forma-r10', '10.3.в', 'верхнее', 27280),
  ('forma-b10-4', 'forma-r10', '10.4.н', 'нижнее', 31350),
  ('forma-b10-5', 'forma-r10', '10.5.в', 'верхнее', 27280),
  ('forma-b10-6', 'forma-r10', '10.6.н', 'нижнее', 31350),
  ('forma-b10-7', 'forma-r10', '10.7.в', 'верхнее', 27280),
  ('forma-b10-8', 'forma-r10', '10.8.н', 'нижнее', 31350),
  ('forma-b11-1', 'forma-r11', '11.1', NULL, 38500),
  ('forma-b12-1', 'forma-r12', '12.1.в', 'верхнее', 31350),
  ('forma-b12-2', 'forma-r12', '12.2.н', 'нижнее', 34100),
  ('forma-b12-3', 'forma-r12', '12.3.в', 'верхнее', 31350),
  ('forma-b12-4', 'forma-r12', '12.4.н', 'нижнее', 34100),
  ('forma-b13-1', 'forma-r13', '13.1.в', 'верхнее', 27280),
  ('forma-b13-2', 'forma-r13', '13.2.н', 'нижнее', 31350),
  ('forma-b13-3', 'forma-r13', '13.3.в', 'верхнее', 27280),
  ('forma-b13-4', 'forma-r13', '13.4.н', 'нижнее', 31350),
  ('forma-b13-5', 'forma-r13', '13.5.в', 'верхнее', 27280),
  ('forma-b13-6', 'forma-r13', '13.6.н', 'нижнее', 31350),
  ('forma-b13-7', 'forma-r13', '13.7.в', 'верхнее', 27280),
  ('forma-b13-8', 'forma-r13', '13.8.н', 'нижнее', 31350),
  ('forma-b14-1', 'forma-r14', '14.1', NULL, 38500),
  ('forma-b15-1', 'forma-r15', '15.1.в', 'верхнее', 31350),
  ('forma-b15-2', 'forma-r15', '15.2.в', 'верхнее', 31350),
  ('forma-b15-3', 'forma-r15', '15.3.н', 'нижнее', 34100),
  ('forma-b15-4', 'forma-r15', '15.4.н', 'нижнее', 34100),
  ('forma-b16-1', 'forma-r16', '16.1.в', 'верхнее', 31350),
  ('forma-b16-2', 'forma-r16', '16.2.в', 'верхнее', 31350),
  ('forma-b16-3', 'forma-r16', '16.3.н', 'нижнее', 34100),
  ('forma-b16-4', 'forma-r16', '16.4.н', 'нижнее', 34100)
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, tier = EXCLUDED.tier, price = EXCLUDED.price;
UPDATE rooms SET gender = 'м' WHERE id = 'forma-r1';
UPDATE rooms SET gender = 'м' WHERE id = 'forma-r2';
UPDATE rooms SET gender = 'м' WHERE id = 'forma-r3';
UPDATE rooms SET gender = 'ж' WHERE id = 'forma-r4';
UPDATE rooms SET gender = 'м' WHERE id = 'forma-r5';
UPDATE rooms SET gender = 'ж' WHERE id = 'forma-r6';
UPDATE rooms SET gender = 'ж' WHERE id = 'forma-r7';
UPDATE rooms SET gender = 'ж' WHERE id = 'forma-r8';
UPDATE rooms SET gender = 'ж' WHERE id = 'forma-r9';
UPDATE rooms SET gender = 'ж' WHERE id = 'forma-r10';
UPDATE rooms SET gender = 'ж' WHERE id = 'forma-r11';
UPDATE rooms SET gender = 'ж' WHERE id = 'forma-r12';
UPDATE rooms SET gender = 'м' WHERE id = 'forma-r13';
UPDATE rooms SET gender = 'ж' WHERE id = 'forma-r14';
UPDATE rooms SET gender = 'м' WHERE id = 'forma-r15';
UPDATE rooms SET gender = 'ж' WHERE id = 'forma-r16';

WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Гекк Дмитрий', '+79952781646', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Гекк', 'Дмитрий', NULL, 'ИСИ', NULL, '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b13-5', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b13-5' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 27280, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Сабельников Арсений', '+79052492242', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Сабельников', 'Арсений', NULL, 'РГГУ', NULL, '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b15-2', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b15-2' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 31350, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, email, first_login) VALUES ('resident', 'Штана Василиса', 'forma-3@import.msv.local', now())
  ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Штана', 'Василиса', NULL, 'РГГУ', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b8-3', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b8-3' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 31350, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Таньков Юрий', '+79186817854', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Таньков', 'Юрий', NULL, 'МГТУ им. Баумана', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b13-8', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b13-8' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 31350, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Натхина Яна', '+79001332634', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Натхина', 'Яна', NULL, 'МАБиУ', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b16-4', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b16-4' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 34100, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Новикова Мария', '+79882506041', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Новикова', 'Мария', NULL, 'BID', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b8-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b8-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 31350, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Гисматуллин Эрик', '+79050049473', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Гисматуллин', 'Эрик', NULL, 'ВШЭ', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b3-4', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b3-4' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 34100, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Федотов Арсений', '+79231358855', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Федотов', 'Арсений', NULL, 'РГУ нефти и газа им. Губкина', NULL, '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b2-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b2-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 38170, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Скрипов Владислав', '+79220109369', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Скрипов', 'Владислав', NULL, 'МИРЭА', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b2-3', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b2-3' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 34100, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Туманов Семен', '+79871147416', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Туманов', 'Семен', NULL, 'РУТ', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b15-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b15-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 31350, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Вавилова Амина', '+375291385802', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Вавилова', 'Амина', NULL, 'ВШЭ', 'Беларусь', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b8-2', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b8-2' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 34100, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Конторина Ксения', '+79029401133', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Конторина', 'Ксения', NULL, 'РГГУ', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b9-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b9-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 39050, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Будейкин Артемий', '+79115787836', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Будейкин', 'Артемий', NULL, 'ГМПИ', NULL, '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b1-2', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b1-2' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 38170, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Гвоздинский Егор', '+79087082774', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Гвоздинский', 'Егор', NULL, 'МГИ музыки им. Шнитке', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b13-6', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b13-6' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 31350, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Марьин Марк', '+79229405511', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Марьин', 'Марк', NULL, 'МГМСУ им. А.И. Евдокимова', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b13-7', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b13-7' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 27280, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Мухторов Ойбек', '+79253231486', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Мухторов', 'Ойбек', NULL, 'ММУ', 'Узбекистан', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b15-3', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b15-3' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 34100, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Пузырёва Вера', '+79002073743', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Пузырёва', 'Вера', NULL, 'МГЛУ', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b16-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b16-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 31350, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Кобельская Анастасия', '+79867946796', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Кобельская', 'Анастасия', NULL, 'ВГУЮ', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b12-4', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b12-4' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 34100, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Сафуанова Сара', '+79173672521', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Сафуанова', 'Сара', NULL, 'ВШЭ', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b11-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b11-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 38500, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Бородкина Мария', '+79125905009', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Бородкина', 'Мария', NULL, 'ИСИ', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b10-8', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b10-8' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 31350, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Федорова Диана', '+79108477239', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Федорова', 'Диана', NULL, 'Лицей МИФИ 1523', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b14-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b14-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 38500, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Торосян Роберт', '+79614200070', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Торосян', 'Роберт', NULL, 'ВШЭ', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b1-3', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b1-3' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 34100, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Рябчикова Арина', '+79112947585', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Рябчикова', 'Арина', NULL, 'РНИМУ им. Пирогова', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b4-2', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b4-2' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 38170, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Мустафокулов Самандар', '+79651791376', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Мустафокулов', 'Самандар', NULL, 'РЭУ им. Плеханова', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b15-4', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b15-4' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 34100, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Горина Ульяна', '+79263771466', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Горина', 'Ульяна', NULL, 'ВШЭ', NULL, '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b16-2', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b16-2' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 31350, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Красовская Вера', '+79267799337', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Красовская', 'Вера', NULL, 'ВШЭ', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b16-3', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b16-3' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 34100, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Буртасов Егор', '+79277088822', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Буртасов', 'Егор', NULL, 'ВШЭ', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b1-4', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b1-4' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 34100, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Набыжева Виктория', '+79107615940', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Набыжева', 'Виктория', NULL, 'МГМУ им. Сеченова', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b8-4', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b8-4' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 34100, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Бурцев Сергей', '+79774944254', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Бурцев', 'Сергей', NULL, 'РМ', 'Украина', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b13-3', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b13-3' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 27280, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Родина Серафима', '+79658858589', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Родина', 'Серафима', NULL, 'Институт кино и телевидения ГИТР', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b12-2', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b12-2' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 34100, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Мельникова Александра', '+79520891523', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Мельникова', 'Александра', NULL, 'ФУ', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b12-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b12-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 31350, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Збаразский Макар', '+79997858893', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Збаразский', 'Макар', NULL, 'МИРЭА', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b3-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b3-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 38170, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Скворцова София', '+79997235346', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Скворцова', 'София', NULL, 'МИРЭА', NULL, '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b10-4', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b10-4' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 31350, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Семенов Егор', '+79201091910', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Семенов', 'Егор', NULL, 'ВШЭ', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b3-2', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b3-2' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 38170, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Осипова Кристина', '+79523877682', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Осипова', 'Кристина', NULL, 'МКБиД', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b10-2', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b10-2' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 31350, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Кузнецова София', '+79375670111', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Кузнецова', 'София', NULL, 'МГЛУ', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b12-3', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b12-3' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 31350, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Калажокова Лиана', '+79094896666', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Калажокова', 'Лиана', NULL, 'ВШЭ', NULL, '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b10-6', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b10-6' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 31350, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Каримова Елизавета', '+79173488538', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Каримова', 'Елизавета', NULL, 'Колледж АД и Р 26', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b10-3', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b10-3' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 27280, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Посунько Давид', '+79959241689', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Посунько', 'Давид', NULL, 'МИРЭА', NULL, '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b1-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b1-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 38170, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Столяров Антон', '+79272195701', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Столяров', 'Антон', NULL, 'ВШЭ', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b2-2', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b2-2' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 38170, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Аталиков Азрет', '+79380827003', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Аталиков', 'Азрет', NULL, 'ВШЭ', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b2-4', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b2-4' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 34100, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Жуков Егор', '+79530872047', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Жуков', 'Егор', NULL, 'МГТУ им. Баумана', NULL, '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b3-3', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b3-3' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 34100, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Игнатьева Милана', '+79625143355', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Игнатьева', 'Милана', NULL, 'ВШЭ', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b4-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b4-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 38170, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Высоцкая Полина', '+79615913936', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Высоцкая', 'Полина', NULL, 'Колледж РАНХиГС', NULL, '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b7-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b7-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 43700, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Крякова Анна', '+79272082695', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Крякова', 'Анна', NULL, 'МИБиУ', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b4-3', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b4-3' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 34100, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Черкасов Матвей', '+79641091105', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Черкасов', 'Матвей', NULL, 'РУДН', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b5-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b5-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 43700, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Чекючоглу Суде', '+79179155124', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Чекючоглу', 'Суде', NULL, 'МГМУ 1 им. Сеченова', 'Турция', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b4-4', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b4-4' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 34100, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Курт-оглы Яна', '+79673282939', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Курт-оглы', 'Яна', NULL, 'ВШЭ', NULL, '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b9-2', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b9-2' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 44350, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Харина Александра', '+79027567818', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Харина', 'Александра', NULL, 'ВШЭ', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b7-2', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b7-2' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 47750, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Борисова Дарья', '+79204215323', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Борисова', 'Дарья', NULL, 'абитуриент', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b6-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b6-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 38500, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Шаргинова Яна', '+79165403513', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Шаргинова', 'Яна', NULL, 'МУ им. Грибоедова', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b10-7', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b10-7' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 27280, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Лысюк Антонина', '+79222599265', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Лысюк', 'Антонина', NULL, 'ВШЭ', NULL, '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b10-1', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b10-1' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 27280, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, email, first_login) VALUES ('resident', 'Зиганшина Анастасия', 'forma-53@import.msv.local', now())
  ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Зиганшина', 'Анастасия', NULL, NULL, 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b10-5', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b10-5' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 27280, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Мищенко Александр', '+79180156755', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Мищенко', 'Александр', NULL, 'РМ', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b13-2', '2026-09-01', '2026-09-20', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b13-2' AND x.date_from < '2026-09-20'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 31350, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Одинцов Матвей', '+79917212517', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Одинцов', 'Матвей', NULL, 'ГБПОУ', NULL, '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b13-4', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b13-4' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 31350, '2026-09-15'::date FROM b;
WITH u AS (
  INSERT INTO users (role, name, phone, first_login) VALUES ('resident', 'Сайнахов Владимир', '+79307621168', now())
  ON CONFLICT (phone) DO UPDATE SET name = EXCLUDED.name RETURNING id
), p AS (
  INSERT INTO resident_profiles (user_id, last_name, first_name, middle_name, university, city, docs_signed_at)
  SELECT id, 'Сайнахов', 'Владимир', NULL, 'РХТУ', 'Российская Федерация', '2026-09-01' FROM u
  ON CONFLICT (user_id) DO UPDATE SET university = EXCLUDED.university, city = EXCLUDED.city
), b AS (
  INSERT INTO bookings (user_id, bed_id, date_from, date_to, source, tariff)
  SELECT id, 'forma-b5-2', '2026-09-01', '2026-10-01', 'desk', 'Годовой контракт' FROM u
  WHERE NOT EXISTS (SELECT 1 FROM bookings x WHERE x.bed_id = 'forma-b5-2' AND x.date_from < '2026-10-01'::date AND x.date_to > '2026-09-01'::date)
  RETURNING id
)
INSERT INTO charges (booking_id, kind, period, amount, due_date) SELECT id, 'rent', '2026-09-01'::date, 47750, '2026-09-15'::date FROM b;

COMMIT;
