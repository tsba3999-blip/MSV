#!/usr/bin/env bash
# ============================================================
#  МСВ — резервная копия базы данных
#
#  Запускается таймером systemd раз в сутки. Периодичность и число
#  хранимых копий читает из таблицы settings — их меняет
#  администратор в настройках сайта:
#     backup_every_days  — раз в сколько дней делать копию (1 = каждую ночь)
#     backup_keep        — сколько последних копий хранить (3)
#
#  Копии лежат в /opt/msv/backups/msv-ГГГГ-ММ-ДД-ЧЧММ.sql.gz
#  Восстановить:  gunzip -c файл.sql.gz | sudo -u postgres psql msv
# ============================================================

set -euo pipefail

DB="msv"
DIR="/opt/msv/backups"
mkdir -p "$DIR"

# Настройки из базы; если таблицы ещё нет — значения по умолчанию
every=$(sudo -u postgres psql -Atqc "SELECT value FROM settings WHERE key='backup_every_days'" "$DB" 2>/dev/null || echo 1)
keep=$(sudo -u postgres psql -Atqc "SELECT value FROM settings WHERE key='backup_keep'" "$DB" 2>/dev/null || echo 3)
every=${every:-1}; keep=${keep:-3}

# Пора ли: смотрим на самую свежую копию
latest=$(ls -1t "$DIR"/msv-*.sql.gz 2>/dev/null | head -1 || true)
if [ -n "$latest" ]; then
  age_days=$(( ( $(date +%s) - $(stat -c %Y "$latest") ) / 86400 ))
  if [ "$age_days" -lt "$every" ]; then
    echo "последняя копия $age_days дн. назад, период $every дн. — пропускаю"
    exit 0
  fi
fi

# Заодно проверяем очередь на места: выезд по дате не вызывает событий,
# поэтому раз в сутки спрашиваем сервер сами (нужна сессия администратора —
# внутренний вызов через переменную WAITLIST_TOKEN в .env, если задана)
if [ -n "${WAITLIST_URL:-}" ]; then curl -fs -X POST "$WAITLIST_URL" >/dev/null 2>&1 || true; fi

file="$DIR/msv-$(date +%Y-%m-%d-%H%M).sql.gz"
sudo -u postgres pg_dump --no-owner --no-privileges "$DB" | gzip -9 > "$file"
echo "сделана копия: $file ($(du -h "$file" | cut -f1))"

# Оставляем только последние N
ls -1t "$DIR"/msv-*.sql.gz | tail -n +"$((keep + 1))" | while read -r old; do
  rm -f "$old"; echo "удалена старая: $old"
done
