#!/usr/bin/env bash
# ============================================================
#  МСВ — развёртывание новой версии
#
#  Запуск на сервере:
#     bash /var/www/MSV/server/deploy.sh
#
#  Что делает:
#   1. копирует web/ и server/ из репозитория в /opt/msv
#   2. ставит зависимости (одна — pg)
#   3. применяет схему и первичные данные к базе
#   4. ставит службу и перезапускает
#
#  Ничего не генерирует и не пересобирает: сайт живёт в git,
#  а не внутри скрипта. Повторный запуск безопасен.
# ============================================================

set -euo pipefail

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP="/opt/msv"

echo "==> Проверка"
[ -d "$REPO/web" ]    || { echo "ОШИБКА: нет папки web/ в $REPO"; exit 1; }
[ -d "$REPO/server" ] || { echo "ОШИБКА: нет папки server/ в $REPO"; exit 1; }
command -v node >/dev/null || { echo "ОШИБКА: node не установлен"; exit 1; }
command -v psql >/dev/null || { echo "ОШИБКА: psql не установлен"; exit 1; }

echo "==> Копирование в $APP"
mkdir -p "$APP"
rsync -a --delete "$REPO/web/"    "$APP/web/"
rsync -a --delete --exclude='.env' --exclude='node_modules' "$REPO/server/" "$APP/server/"

if [ ! -f "$APP/server/.env" ]; then
  cp "$APP/server/.env.example" "$APP/server/.env"
  echo
  echo "    !!! Создан $APP/server/.env из примера."
  echo "    !!! Откройте его, впишите DATABASE_URL и SESSION_SECRET, затем запустите скрипт снова."
  echo "    !!! Пароль базы — в старом /opt/msv/.env (DB_PASSWORD или похожее)."
  echo
  exit 2
fi

echo "==> Зависимости"
cd "$APP/server"
npm install --omit=dev --silent

echo "==> База данных"
sudo -u postgres psql -v ON_ERROR_STOP=1 msv -f db/schema.sql >/dev/null
sudo -u postgres psql -v ON_ERROR_STOP=1 msv -f db/seed.sql >/dev/null
echo "    схема и первичные данные применены"

# Таблицы создаёт postgres, а сайт ходит под пользователем из DATABASE_URL —
# без явных прав он получает «permission denied for table users».
DB_USER="$(grep -oP '^DATABASE_URL=postgres://\K[^:@]+' "$APP/server/.env" || echo msv)"
sudo -u postgres psql -v ON_ERROR_STOP=1 msv >/dev/null <<SQL
GRANT USAGE ON SCHEMA public TO "$DB_USER";
GRANT ALL ON ALL TABLES IN SCHEMA public TO "$DB_USER";
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO "$DB_USER";
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO "$DB_USER";
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO "$DB_USER";
SQL
echo "    права на таблицы выданы пользователю $DB_USER"

echo "==> Права"
id -u msv >/dev/null 2>&1 || useradd --system --home "$APP" --shell /usr/sbin/nologin msv
chown -R msv:msv "$APP"
chmod 600 "$APP/server/.env"

echo "==> Служба"
cp "$APP/server/msv.service" /etc/systemd/system/msv.service
systemctl daemon-reload
systemctl enable msv >/dev/null 2>&1 || true
systemctl restart msv
sleep 2

if systemctl is-active --quiet msv; then
  echo "    служба msv запущена"
else
  echo "    ОШИБКА: служба не поднялась. Логи: journalctl -u msv -n 50 --no-pager"
  exit 1
fi

echo "==> Резервные копии"
cp "$APP/server/backup/msv-backup.service" "$APP/server/backup/msv-backup.timer" /etc/systemd/system/
systemctl daemon-reload
systemctl enable --now msv-backup.timer >/dev/null 2>&1 && echo "    таймер копий включён (03:30 ежедневно)"

echo "==> Проверка"
PORT="$(grep -oP '^PORT=\K[0-9]+' "$APP/server/.env" || echo 3000)"
if curl -fs "http://127.0.0.1:$PORT/api/health" >/dev/null; then
  echo "    сервер отвечает, база доступна"
else
  echo "    ПРЕДУПРЕЖДЕНИЕ: /api/health не ответил. Проверьте DATABASE_URL в .env"
fi

echo
echo "ГОТОВО. Сайт: http://$(hostname -I 2>/dev/null | awk '{print $1}')/"
echo "Если старый nginx-конфиг проксировал на другой порт — проверьте /etc/nginx/sites-enabled/"
