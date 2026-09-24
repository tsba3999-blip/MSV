-- ============================================================
--  МСВ — схема базы данных
--  PostgreSQL 14+
--
--  Таблицы повторяют структуры, которые уже работают во
--  фронтенде: residences.js, demo-bookings.js, demo-tickets.js.
--  Всё, что сайт сейчас берёт из вымышленных данных, здесь
--  получает постоянное место.
--
--  Применить: psql msv -f db/schema.sql
--  Схема идемпотентна — повторный запуск ничего не ломает.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
--  Роли и люди
-- ------------------------------------------------------------

-- Четыре роли из раздела «Права доступа». Резидент — тоже
-- пользователь: у него есть вход, но нет доступа к кабинетам
-- сотрудника и администратора.
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'moderator', 'staff', 'resident');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS users (
  id            bigserial PRIMARY KEY,
  role          user_role NOT NULL DEFAULT 'resident',
  name          text NOT NULL,
  email         text UNIQUE,
  phone         text UNIQUE,
  -- Постоянный пин: выдаёт модератор при приглашении, резидент
  -- может сменить в кабинете. Хранится только хэш.
  pin_hash      text,
  -- Одноразовый код (если когда-нибудь подключим смс): срок жизни
  pin_expires   timestamptz,
  pin_attempts  smallint NOT NULL DEFAULT 0,
  -- После трёх неудачных попыток вход закрыт до этого времени
  locked_until  timestamptz,
  -- Приглашённый, но ещё не входивший: анкета не заполнена
  invited_by    bigint REFERENCES users(id) ON DELETE SET NULL,
  invited_at    timestamptz,
  first_login   timestamptz,
  -- Telegram: chat_id появляется, когда резидент напишет боту
  tg_chat_id    bigint,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT users_contact_present CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Попытки входа по контактам, которых нет в базе: посторонний, который
-- перебирает коды, блокируется по телефону после трёх промахов.
CREATE TABLE IF NOT EXISTS login_attempts (
  contact       text PRIMARY KEY,
  attempts      smallint NOT NULL DEFAULT 0,
  locked_until  timestamptz,
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Анкета резидента. Отдельно от users: у сотрудников её нет,
-- а у резидента она большая.
CREATE TABLE IF NOT EXISTS resident_profiles (
  user_id        bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  last_name      text,
  first_name     text,
  middle_name    text,
  birthday       date,
  city           text,
  university     text,
  course         text,                    -- '1'..'4' или 'Другое'
  faculty        text,
  about          text,
  health_score   smallint CHECK (health_score BETWEEN 1 AND 5),
  contact_person text,                    -- ФИО и телефон родителя или попечителя
  vk             text,
  photo_url      text,
  messengers     text[] NOT NULL DEFAULT '{}',   -- 'tg', 'max'
  docs_signed_at date,                    -- = дате первой оплаты
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Файлы анкеты: фото, паспорт, студенческий, согласие родителей
DO $$ BEGIN
  CREATE TYPE doc_kind AS ENUM ('photo', 'passport', 'student_id', 'parent_consent', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS resident_files (
  id          bigserial PRIMARY KEY,
  user_id     bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        doc_kind NOT NULL,
  url         text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS resident_files_user_idx ON resident_files(user_id);

-- ------------------------------------------------------------
--  Резиденции, комнаты, места
--  Один в один с residences.js
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS residences (
  id        text PRIMARY KEY,             -- 'forma', 'uyut', 'molod'
  name      text NOT NULL,                -- 'FORMA'
  title     text NOT NULL,                -- 'Резиденция FORMA'
  logo_url  text,
  sort      smallint NOT NULL DEFAULT 0
);

DO $$ BEGIN
  CREATE TYPE room_gender AS ENUM ('м', 'ж');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Пол резидента — из анкеты; по нему на выборе комнаты закрываются чужие комнаты
ALTER TABLE resident_profiles ADD COLUMN IF NOT EXISTS gender room_gender;
-- Анкета спрашивала ник в Telegram и пояснение к оценке здоровья,
-- а хранить их было негде — ответы пропадали (24.09.2026).
ALTER TABLE resident_profiles ADD COLUMN IF NOT EXISTS tg_nick text;
ALTER TABLE resident_profiles ADD COLUMN IF NOT EXISTS health_note text;

CREATE TABLE IF NOT EXISTS rooms (
  id           text PRIMARY KEY,          -- 'forma-r1'
  residence_id text NOT NULL REFERENCES residences(id) ON DELETE CASCADE,
  number       text NOT NULL,
  name         text NOT NULL,             -- '№1 Рерих'
  gender       room_gender,               -- NULL — не указан
  size         smallint NOT NULL CHECK (size > 0),
  note         text,
  UNIQUE (residence_id, number)
);

DO $$ BEGIN
  CREATE TYPE bed_tier AS ENUM ('нижнее', 'верхнее');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS beds (
  id       text PRIMARY KEY,              -- 'forma-b1-1'
  room_id  text NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  label    text NOT NULL,                 -- '1.1.н'
  tier     bed_tier,                      -- NULL — места равноценные
  price    integer NOT NULL CHECK (price >= 0),   -- руб. в месяц, годовой контракт
  UNIQUE (room_id, label)
);

CREATE TABLE IF NOT EXISTS room_photos (
  id          bigserial PRIMARY KEY,
  room_id     text NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  url         text NOT NULL,
  sort        smallint NOT NULL DEFAULT 0,
  uploaded_by bigint REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS room_photos_room_idx ON room_photos(room_id, sort);

-- ------------------------------------------------------------
--  Брони
-- ------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE booking_source AS ENUM ('site', 'desk', 'transfer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS bookings (
  id          bigserial PRIMARY KEY,
  user_id     bigint NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  bed_id      text NOT NULL REFERENCES beds(id) ON DELETE RESTRICT,
  date_from   date NOT NULL,
  date_to     date NOT NULL,
  check_in    time NOT NULL DEFAULT '14:00',
  check_out   time NOT NULL DEFAULT '12:00',
  source      booking_source NOT NULL DEFAULT 'site',
  tariff      text NOT NULL DEFAULT 'Годовой контракт',
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bookings_dates CHECK (date_to > date_from)
);

-- Бесплатная бронь на 24 или 48 часов: модератор придерживает место,
-- пока человек думает или едет оплачивать (решение заказчика 24.09.2026).
-- Это обычная строка bookings, но с заполненным hold_until — так место
-- блокируется тем же ограничением, что и настоящие брони. Резидента у
-- такой брони может не быть: имя и контакт человека со стороны лежат
-- рядом. Поэтому user_id стал необязательным.
ALTER TABLE bookings ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hold_until     timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hold_name      text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hold_contact   text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hold_warned_at timestamptz;
CREATE INDEX IF NOT EXISTS bookings_hold_idx ON bookings(hold_until) WHERE hold_until IS NOT NULL;

-- Место занято, но резидент уезжает и модератор уже выставил его в продажу.
-- В этой колонке дата, с которой можно заезжать следующему (решение
-- заказчика 23.09.2026). Пусто — место просто занято.
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS release_from date;
-- Пометку «освободится» может поставить и модератор руками, и система,
-- когда месяц не оплачен к 15 числу. Свою система потом снимет сама,
-- чужую не тронет — отсюда флаг и два месяца-отметки, за какой месяц
-- резиденту уже написали (24.09.2026).
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS release_auto boolean NOT NULL DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS warn_period date;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sale_period date;
CREATE INDEX IF NOT EXISTS bookings_release_idx ON bookings(release_from) WHERE release_from IS NOT NULL;

CREATE INDEX IF NOT EXISTS bookings_bed_idx  ON bookings(bed_id, date_from, date_to);
CREATE INDEX IF NOT EXISTS bookings_user_idx ON bookings(user_id);

-- Две брони на одном месте не могут пересекаться по датам.
-- Стык день в день допускается: выезд в 12:00, заезд в 14:00 —
-- ровно то правило, по которому шахматка разрешает переселение.
-- ------------------------------------------------------------
--  Контракт: обязательство жить и платить до конца августа
--
--  Бронь отвечает на вопрос «кто занимает это место и когда»,
--  контракт — «до какого числа человек обязался и по какой цене».
--  Они разные: при переезде бронь закрывается и открывается новая,
--  в другой комнате, а контракт остаётся тот же. Этим и держится
--  связь между строками шахматки (решение заказчика 24.09.2026).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contracts (
  id          bigserial PRIMARY KEY,
  user_id     bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date_from   date NOT NULL,
  date_to     date NOT NULL,             -- 31 августа: конец годового контракта
  annual      boolean NOT NULL DEFAULT true,   -- отказался от годового — цена без скидки
  price       integer,                   -- цена месяца, по которой считаем начисления
  ended_at    date,                      -- досрочное расторжение
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS contracts_user_idx ON contracts(user_id);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS contract_id bigint REFERENCES contracts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS bookings_contract_idx ON bookings(contract_id);

-- Брони, заведённые до появления контрактов, остались бы без него, и
-- шахматке нечего было бы рисовать контуром. Заводим каждой свой контракт
-- с её же сроком. Повторный запуск ничего не делает: берём только те, у
-- которых контракта ещё нет (24.09.2026).
DO $$
DECLARE r RECORD; cid bigint;
BEGIN
  FOR r IN SELECT b.id, b.user_id, b.date_from, b.date_to, bd.price
             FROM bookings b JOIN beds bd ON bd.id = b.bed_id
            WHERE b.contract_id IS NULL AND b.user_id IS NOT NULL
  LOOP
    INSERT INTO contracts (user_id, date_from, date_to, annual, price)
    VALUES (r.user_id, r.date_from, r.date_to, true, r.price)
    RETURNING id INTO cid;
    UPDATE bookings SET contract_id = cid WHERE id = r.id;
  END LOOP;
END $$;

-- Разовая правка демонстрационных данных (решение заказчика 24.09.2026).
-- У выдуманных жильцов договор кончался 1 октября 2026 — при том, что в
-- нём написано «Годовой контракт». Из-за этого система считала, что
-- первого октября пустеет вся сеть, и «Освободятся скоро» показывал
-- целые резиденции. Годовой контракт идёт до конца августа.
--
-- Места, где на новые даты уже стоит чужая бронь, пропускаем: иначе
-- сработает запрет на двойную продажу и выкладывание встанет.
-- Повторный запуск ничего не делает: таких дат в базе больше нет.
UPDATE bookings b SET date_to = DATE '2027-08-31'
 WHERE b.date_to = DATE '2026-10-01'
   AND b.user_id IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM bookings o
      WHERE o.bed_id = b.bed_id AND o.id <> b.id
        AND daterange(o.date_from, o.date_to, '[)')
         && daterange(b.date_from, DATE '2027-08-31', '[)')
   );

UPDATE contracts c SET date_to = DATE '2027-08-31'
  FROM bookings b
 WHERE b.contract_id = c.id
   AND b.date_to = DATE '2027-08-31'
   AND c.date_to = DATE '2026-10-01';

-- Разово: снимаем пометки «освободится», которые система успела поставить
-- до того, как в неё занесли оплаты — иначе занятые места выглядят
-- свободными. Ручные пометки модератора не трогаем: у них release_auto
-- равен false. Признак того, что правка уже была, — наличие выключателя
-- auto_sale; поэтому при повторном выкладывании ничего не произойдёт,
-- и законные автоматические пометки останутся на месте (24.09.2026).
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM settings WHERE key = 'auto_sale') THEN
    UPDATE bookings SET release_from = NULL, release_auto = false, sale_period = NULL
     WHERE release_auto = true;
    INSERT INTO settings (key, value) VALUES ('auto_sale', '0');
  END IF;
END $$;

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- EXCLUDE создаёт индекс, поэтому при повторе ошибка не duplicate_object,
-- а duplicate_table — проверяем наличие явно, чтобы deploy.sh проходил снова.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_no_overlap'
  ) THEN
    ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap
      EXCLUDE USING gist (
        bed_id WITH =,
        daterange(date_from, date_to, '[)') WITH &&
      );
  END IF;
END $$;

-- ------------------------------------------------------------
--  Деньги
-- ------------------------------------------------------------

-- Начисление: «за такой-то месяц столько-то». Пени — тоже
-- начисление, отдельной строкой с kind = 'penalty'.
DO $$ BEGIN
  CREATE TYPE charge_kind AS ENUM ('rent', 'deposit', 'penalty', 'service', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS charges (
  id          bigserial PRIMARY KEY,
  booking_id  bigint NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  kind        charge_kind NOT NULL DEFAULT 'rent',
  period      date,                       -- первое число месяца, за который начислено
  amount      integer NOT NULL CHECK (amount >= 0),
  due_date    date,                       -- до какого числа оплатить
  note        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS charges_booking_idx ON charges(booking_id, period);

-- Снятое начисление. Пени начисляет система, а отменить их может только
-- модератор или администратор — снятое в долг не идёт и заново не
-- начисляется (правило заказчика, 24.09.2026).
ALTER TABLE charges ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;
ALTER TABLE charges ADD COLUMN IF NOT EXISTS cancelled_by bigint REFERENCES users(id) ON DELETE SET NULL;

-- Платёж: сколько и когда пришло. Может закрывать несколько
-- начислений, поэтому не привязан к одному из них.
DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('sbp', 'card', 'cash', 'transfer', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS payments (
  id          bigserial PRIMARY KEY,
  booking_id  bigint NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  amount      integer NOT NULL CHECK (amount > 0),
  paid_at     timestamptz NOT NULL DEFAULT now(),
  method      payment_method NOT NULL DEFAULT 'sbp',
  period      date,                       -- за какой месяц, если известно
  external_id text,                       -- номер операции у банка
  note        text
);

CREATE INDEX IF NOT EXISTS payments_booking_idx ON payments(booking_id, paid_at);

-- ------------------------------------------------------------
--  Миграционный учёт
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS registrations (
  id          bigserial PRIMARY KEY,
  user_id     bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  number      text,
  issued_at   date NOT NULL,
  valid_until date NOT NULL,
  address     text,
  CONSTRAINT registrations_dates CHECK (valid_until >= issued_at)
);

CREATE INDEX IF NOT EXISTS registrations_user_idx ON registrations(user_id, valid_until DESC);

-- ------------------------------------------------------------
--  Заявки в сервис
-- ------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE ticket_priority AS ENUM ('critical', 'urgent', 'normal', 'consult');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE ticket_status AS ENUM ('accepted', 'in_progress', 'done', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS tickets (
  id          bigserial PRIMARY KEY,
  user_id     bigint NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  booking_id  bigint REFERENCES bookings(id) ON DELETE SET NULL,
  category    text NOT NULL,              -- 'Сантехника', 'Электрика', …
  place       text,                       -- 'В комнате', 'В душевой', …
  room_number text,
  text        text NOT NULL CHECK (length(text) <= 1000),
  priority    ticket_priority NOT NULL DEFAULT 'normal',
  status      ticket_status NOT NULL DEFAULT 'accepted',
  master_id   bigint REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  closed_at   timestamptz
);

CREATE INDEX IF NOT EXISTS tickets_status_idx ON tickets(status, created_at DESC);
CREATE INDEX IF NOT EXISTS tickets_master_idx ON tickets(master_id);

CREATE TABLE IF NOT EXISTS ticket_files (
  id          bigserial PRIMARY KEY,
  ticket_id   bigint NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  url         text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
--  Репутация
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS reputation_events (
  id          bigserial PRIMARY KEY,
  user_id     bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  details     text,
  delta       numeric(3,1) NOT NULL,      -- +0.3, -0.5 …
  is_negative boolean NOT NULL DEFAULT false,
  author_id   bigint REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reputation_user_idx ON reputation_events(user_id, created_at DESC);

-- ------------------------------------------------------------
--  Уведомления
-- ------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE notice_kind AS ENUM ('alarm', 'pay', 'info', 'ok');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS notices (
  id          bigserial PRIMARY KEY,
  user_id     bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        notice_kind NOT NULL DEFAULT 'info',
  text        text NOT NULL,
  is_read     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notices_user_idx ON notices(user_id, is_read, created_at DESC);

-- ------------------------------------------------------------
--  Журнал действий администрации
--  Кто, когда и что сделал: выдал права, переселил, начислил пени.
--  Отвечает на один из пяти вопросов раздела «Права доступа».
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS audit_log (
  id          bigserial PRIMARY KEY,
  actor_id    bigint REFERENCES users(id) ON DELETE SET NULL,
  action      text NOT NULL,              -- 'booking.move', 'user.role', 'charge.penalty'
  target      text,                       -- 'booking:42', 'user:7'
  payload     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_time_idx ON audit_log(created_at DESC);

-- ------------------------------------------------------------
--  История входов: кто, когда, откуда и чем (решение заказчика 22.09.2026).
--  Нужна и резиденту («это точно был я?»), и администрации при разборе.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS login_log (
  id          bigserial PRIMARY KEY,
  user_id     bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ok          boolean NOT NULL DEFAULT true,   -- false: код не подошёл
  ip          text,
  agent       text,                            -- строка браузера, обрезанная до 200 знаков
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS login_log_user_idx ON login_log(user_id, created_at DESC);

-- ------------------------------------------------------------
--  Правки содержимого страниц (карандаш администратора)
--  Ключ — путь элемента в разметке. Одна правка на элемент.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS content_overrides (
  page        text NOT NULL,              -- 'index.html'
  key         text NOT NULL,              -- 'div:0/main:1/p:2'
  html        text NOT NULL,
  updated_by  bigint REFERENCES users(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (page, key)
);

-- ------------------------------------------------------------
--  Настройки сайта: ключ — значение
--  Периодичность резервных копий, реквизиты, тексты рассылок.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS settings (
  key         text PRIMARY KEY,
  value       text NOT NULL,
  updated_by  bigint REFERENCES users(id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO settings (key, value) VALUES
  ('backup_every_days', '1'),
  ('backup_keep', '3'),
  ('tg_bot_token', ''),
  ('tg_admin_chat', ''),
  ('notify_admin_tickets', '1'),
  ('notify_admin_partners', '1'),
  ('notify_admin_debts', '1'),
  ('notify_resident_pay', '1'),
  ('notify_resident_tickets', '1'),
  ('notify_resident_news', '0')
ON CONFLICT (key) DO NOTHING;

-- Что и куда отправлено: чтобы не слать дважды и видеть, что дошло
DO $$ BEGIN
  CREATE TYPE notify_channel AS ENUM ('tg', 'max', 'email');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS notify_log (
  id          bigserial PRIMARY KEY,
  user_id     bigint REFERENCES users(id) ON DELETE SET NULL,
  channel     notify_channel NOT NULL,
  kind        text NOT NULL,                -- 'pay', 'ticket', 'news', 'alarm', 'admin'
  text        text NOT NULL,
  ok          boolean NOT NULL,
  error       text,
  sent_at     timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
--  Заявки от владельцев объектов: «подключить отель или общежитие»
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS partner_requests (
  id          bigserial PRIMARY KEY,
  object_name text NOT NULL,
  city        text,
  person      text,
  contact     text NOT NULL,
  note        text,
  handled     boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
--  Обращения «Хочу сказать» — от резидентов и сотрудников
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS feedback (
  id          bigserial PRIMARY KEY,
  user_id     bigint REFERENCES users(id) ON DELETE SET NULL,   -- NULL — анонимно
  topic       text NOT NULL,
  text        text NOT NULL CHECK (length(text) <= 1500),
  answered    boolean NOT NULL DEFAULT false,
  answer      text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
--  Запросы резидента: документы, исправление данных, переселение
-- ------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE request_kind AS ENUM ('registration', 'residence_cert', 'guardian_contract', 'fix', 'relocation');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE request_status AS ENUM ('accepted', 'in_progress', 'done', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS doc_requests (
  id          bigserial PRIMARY KEY,
  user_id     bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        request_kind NOT NULL,
  note        text,
  status      request_status NOT NULL DEFAULT 'accepted',
  result_url  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  closed_at   timestamptz
);

CREATE INDEX IF NOT EXISTS doc_requests_user_idx ON doc_requests(user_id, created_at DESC);

-- ------------------------------------------------------------
--  Рассылки: сотрудник предлагает, модератор согласует
-- ------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE mailing_status AS ENUM ('draft', 'approved', 'sent', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS mailings (
  id           bigserial PRIMARY KEY,
  author_id    bigint REFERENCES users(id) ON DELETE SET NULL,
  residence_id text REFERENCES residences(id) ON DELETE SET NULL,   -- NULL — всем
  kind         text NOT NULL,                                       -- 'news', 'alarm', 'pay'
  title        text NOT NULL,
  text         text NOT NULL CHECK (length(text) <= 1000),
  status       mailing_status NOT NULL DEFAULT 'draft',
  approved_by  bigint REFERENCES users(id) ON DELETE SET NULL,
  sent_count   integer,
  created_at   timestamptz NOT NULL DEFAULT now(),
  sent_at      timestamptz
);
-- Рассылка одному резиденту (сотрудник выбирает конкретного человека)
ALTER TABLE mailings ADD COLUMN IF NOT EXISTS user_id bigint REFERENCES users(id) ON DELETE SET NULL;

-- ------------------------------------------------------------
--  Очередь на свободное место
--  Резидент или кандидат оставляет заявку: где хочет жить и какая
--  комната. Когда место освобождается — уведомляются ВСЕ подходящие
--  заявки сразу, место достаётся тому, кто первым оплатит.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS waitlist (
  id           bigserial PRIMARY KEY,
  user_id      bigint REFERENCES users(id) ON DELETE CASCADE,
  contact      text,                                  -- если заявитель ещё не в базе
  name         text,
  residence_id text REFERENCES residences(id) ON DELETE CASCADE,   -- NULL — любая
  room_size    smallint,                              -- NULL — любая
  tier         bed_tier,                              -- NULL — любое
  note         text,
  active       boolean NOT NULL DEFAULT true,
  notified_at  timestamptz,                           -- когда последний раз сообщали
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS waitlist_active_idx ON waitlist(active, residence_id);

-- ------------------------------------------------------------
--  Сотрудники: анкета и начисления зарплаты
--  Зарплаты видит и начисляет ТОЛЬКО администратор — модератору
--  сервер отвечает 403. Сотрудник видит только свои строки.
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS staff_profiles (
  user_id      bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  position     text,                                  -- должность
  place        text,                                  -- 'forma', 'uyut', 'molod', 'all'
  birthday     date,
  started_at   date,
  salary       integer CHECK (salary IS NULL OR salary >= 0),   -- оклад, руб.
  pay_to       text,                                  -- куда переводить: телефон, банк
  relation     text,                                  -- договор, самозанятость, иное
  can_edit_shahmatka boolean NOT NULL DEFAULT false,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payroll (
  id           bigserial PRIMARY KEY,
  user_id      bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  period       text NOT NULL,                         -- 'аванс за сентябрь 2026'
  amount       integer NOT NULL CHECK (amount >= 0),
  bonus        integer NOT NULL DEFAULT 0 CHECK (bonus >= 0),
  paid_by      bigint REFERENCES users(id) ON DELETE SET NULL,   -- администратор
  paid_at      timestamptz NOT NULL DEFAULT now(),    -- «Начислено» нажато
  received_at  timestamptz                            -- «Получил» нажал сотрудник
);

CREATE INDEX IF NOT EXISTS payroll_user_idx ON payroll(user_id, paid_at DESC);

-- ------------------------------------------------------------
--  Удобные представления
-- ------------------------------------------------------------

-- Баланс по брони: начислено, оплачено, остаток. Именно эти три
-- числа показывают шахматка, «Начисления» и кабинет резидента.
CREATE OR REPLACE VIEW booking_balance AS
SELECT
  b.id                                        AS booking_id,
  b.user_id,
  b.bed_id,
  COALESCE(SUM(c.amount), 0)                  AS accrued,
  COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.booking_id = b.id), 0) AS paid,
  COALESCE(SUM(c.amount), 0)
    - COALESCE((SELECT SUM(p.amount) FROM payments p WHERE p.booking_id = b.id), 0) AS balance
FROM bookings b
LEFT JOIN charges c ON c.booking_id = b.id AND c.cancelled_at IS NULL
GROUP BY b.id;

-- Кто живёт сейчас: одна строка на занятое место
CREATE OR REPLACE VIEW occupancy_today AS
SELECT
  bd.id AS bed_id, bd.label, r.id AS room_id, r.name AS room_name,
  r.residence_id, bk.id AS booking_id, bk.user_id, u.name AS resident_name
FROM beds bd
JOIN rooms r ON r.id = bd.room_id
LEFT JOIN bookings bk ON bk.bed_id = bd.id
  AND bk.date_from <= CURRENT_DATE AND bk.date_to >= CURRENT_DATE
LEFT JOIN users u ON u.id = bk.user_id;

-- Журнал подписей документов.
-- Резидент подписывает договор, правила и согласие заново при каждой оплате
-- (решение заказчика 23.09.2026), поэтому храним не одну дату, а список.
CREATE TABLE IF NOT EXISTS doc_signatures (
  id          bigserial PRIMARY KEY,
  user_id     bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        text NOT NULL,              -- 'contract' | 'rules' | 'consent'
  booking_id  bigint REFERENCES bookings(id) ON DELETE SET NULL,
  signed_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS doc_signatures_user_idx ON doc_signatures (user_id, signed_at DESC);

COMMIT;
