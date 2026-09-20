#!/usr/bin/env bash
# ============================================================
#  МСВ — одноразовое удаление таблиц первой (тестовой) версии
#
#  Запуск на сервере, один раз, перед первым deploy.sh:
#     bash /var/www/MSV/server/reset-old-db.sh
#
#  Старая версия (deploy-msv.sh) создала таблицы users, rooms,
#  bookings, beds, charges, payments, tickets, audit, sessions.
#  Имена совпадают с новой схемой, а устройство — нет (например,
#  rooms.id там text, а не bigint), поэтому schema.sql на них падает.
#  В них только тестовый клиент и администратор — живых данных нет.
#
#  Защита: если users уже новая (есть колонка pin_hash) — ничего
#  не делает. Повторный запуск безопасен.
# ============================================================

set -euo pipefail
cd /tmp

psql_msv() { sudo -u postgres psql -v ON_ERROR_STOP=1 -Atq msv "$@"; }

if ! psql_msv -c "SELECT 1 FROM pg_tables WHERE tablename = 'users'" | grep -q 1; then
  echo "Таблицы users нет — база чистая, удалять нечего."
  exit 0
fi

if psql_msv -c "SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'pin_hash'" | grep -q 1; then
  echo "users уже новая (есть pin_hash) — старых таблиц нет, ничего не трогаю."
  exit 0
fi

echo "==> Удаление таблиц старой версии"
psql_msv -c "DROP TABLE IF EXISTS users, rooms, bookings, beds, charges, payments, tickets, audit, sessions CASCADE;"
echo "    удалены: users, rooms, bookings, beds, charges, payments, tickets, audit, sessions"
