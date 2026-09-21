#!/usr/bin/env bash
# ============================================================
#  МСВ — загрузка сотрудников и резидентов в базу
#
#  Запуск на сервере:
#     bash /var/www/MSV/server/seed-people.sh
#
#  Применяет db/seed-staff.sql, db/seed-uyut.sql, db/seed-forma.sql, db/seed-molod.sql —
#  реальные люди от заказчика. deploy.sh их не трогает: это данные,
#  а не схема. Файлы написаны с ON CONFLICT, повторный запуск безопасен.
# ============================================================

set -euo pipefail

DB="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/db"

for f in seed-staff seed-uyut seed-forma seed-molod; do
  sudo -u postgres psql -v ON_ERROR_STOP=1 -q msv -f "$DB/$f.sql"
  echo "    $f: загружен"
done

echo "==> Учётные записи по ролям"
cd /tmp
sudo -u postgres psql -Atc 'SELECT role || '"'"': '"'"' || count(*) FROM users GROUP BY role ORDER BY role' msv
