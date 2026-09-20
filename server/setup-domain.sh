#!/usr/bin/env bash
# ============================================================
#  МСВ — подключение домена и https
#
#  Запуск на сервере (один раз, когда A-запись домена уже
#  указывает на этот сервер):
#     bash /var/www/MSV/server/setup-domain.sh go.1msv.ru почта@для.уведомлений
#
#  Что делает:
#   1. пишет конфиг nginx: домен → наш сервер на порту из .env
#   2. ставит certbot и получает сертификат Let's Encrypt
#   3. включает переадресацию http → https
#  Продление сертификата дальше автоматическое (таймер certbot).
#  Повторный запуск безопасен.
# ============================================================

set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"
[ -n "$DOMAIN" ] && [ -n "$EMAIL" ] || { echo "Использование: $0 домен почта"; exit 1; }

PORT="$(grep -oP '^PORT=\K[0-9]+' /opt/msv/server/.env 2>/dev/null || echo 3031)"

echo "==> Проверка DNS: $DOMAIN"
MY_IP="$(curl -fs https://api.ipify.org || hostname -I | awk '{print $1}')"
DNS_IP="$(getent ahostsv4 "$DOMAIN" | awk '{print $1}' | head -1 || true)"
if [ "$DNS_IP" != "$MY_IP" ]; then
  echo "ОШИБКА: $DOMAIN указывает на '${DNS_IP:-ничего}', а этот сервер — $MY_IP."
  echo "Добавьте A-запись и подождите, пока она разойдётся (5–30 минут)."
  exit 1
fi
echo "    $DOMAIN → $MY_IP, верно"

echo "==> nginx"
cat > /etc/nginx/sites-available/msv <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name $DOMAIN;

    client_max_body_size 20m;

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF
ln -sf /etc/nginx/sites-available/msv /etc/nginx/sites-enabled/msv
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
echo "    nginx: $DOMAIN → 127.0.0.1:$PORT"

echo "==> certbot"
if ! command -v certbot >/dev/null; then
  export DEBIAN_FRONTEND=noninteractive
  apt-get update -qq
  apt-get install -y -qq certbot python3-certbot-nginx >/dev/null
fi
certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect
systemctl reload nginx

echo
echo "ГОТОВО. Сайт: https://$DOMAIN/"
