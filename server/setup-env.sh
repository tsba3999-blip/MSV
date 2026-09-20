#!/usr/bin/env bash
# ============================================================
#  МСВ — одноразовое создание /opt/msv/server/.env
#
#  Запуск на сервере (один раз, после первого deploy.sh):
#     bash /var/www/MSV/server/setup-env.sh
#
#  Берёт DATABASE_URL из старого /opt/msv/.env (его создал
#  deploy-msv.sh), генерирует SESSION_SECRET и пишет новый .env.
#  Порт — 3031: на него уже смотрит nginx, менять его не нужно.
#  Секреты на экран не выводятся.
# ============================================================

set -euo pipefail

APP="/opt/msv"
OLD="$APP/.env"
NEW="$APP/server/.env"

[ -f "$OLD" ] || { echo "ОШИБКА: нет $OLD — старые настройки не найдены"; exit 1; }

DB_URL="$(grep -oP '^DATABASE_URL=\K.*' "$OLD" || true)"
[ -n "$DB_URL" ] || { echo "ОШИБКА: в $OLD нет строки DATABASE_URL"; exit 1; }

if [ -f "$NEW" ] && grep -q '^SESSION_SECRET=' "$NEW" && ! grep -q 'замените' "$NEW"; then
  echo "$NEW уже заполнен — ничего не меняю."
  exit 0
fi

SECRET="$(openssl rand -hex 32)"
mkdir -p "$APP/server"

cat > "$NEW" <<EOF
# Создано setup-env.sh $(date +%F) на основе $OLD
DATABASE_URL=$DB_URL
PORT=3031
SESSION_SECRET=$SECRET
WEB_DIR=../web
DEMO_MODE=1
EOF

chmod 600 "$NEW"
id -u msv >/dev/null 2>&1 && chown msv:msv "$NEW"

echo "Готово: $NEW создан."
echo "Содержимое (секреты скрыты):"
sed -e 's#\(DATABASE_URL=postgres://[^:]*:\)[^@]*#\1***#' \
    -e 's#\(SESSION_SECRET=\).*#\1***#' "$NEW"
