#!/usr/bin/env bash
# ============================================================
#  МСВ — установка шахматки заселения на сервер
#
#  Запуск:
#     bash /var/www/MSV/shahmatka/install-shahmatka.sh
#
#  Что делает:
#   1. копирует shahmatka.css и shahmatka.js в /opt/msv/shahmatka/
#   2. добавляет две строки подключения в /opt/msv/index.html
#   3. перезапускает сервис msv
#
#  Скрипт безопасно запускать повторно: если строки уже добавлены,
#  он их не продублирует. Перед правкой index.html делается копия.
# ============================================================

set -euo pipefail

APP_DIR="/opt/msv"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST_DIR="$APP_DIR/shahmatka"
INDEX="$APP_DIR/index.html"
STAMP="$(date +%Y%m%d-%H%M%S)"

echo "==> Проверка окружения"
[ -d "$APP_DIR" ] || { echo "ОШИБКА: каталог $APP_DIR не найден. Приложение установлено?"; exit 1; }
[ -f "$INDEX" ]   || { echo "ОШИБКА: файл $INDEX не найден."; exit 1; }
[ -f "$SRC_DIR/shahmatka.js" ]  || { echo "ОШИБКА: рядом со скриптом нет shahmatka.js"; exit 1; }
[ -f "$SRC_DIR/shahmatka.css" ] || { echo "ОШИБКА: рядом со скриптом нет shahmatka.css"; exit 1; }

echo "==> Копирование файлов в $DEST_DIR"
mkdir -p "$DEST_DIR"
cp "$SRC_DIR/shahmatka.js"  "$DEST_DIR/"
cp "$SRC_DIR/shahmatka.css" "$DEST_DIR/"
[ -f "$SRC_DIR/demo.html" ] && cp "$SRC_DIR/demo.html" "$DEST_DIR/"

# Права: приложение работает от пользователя msv
if id -u msv >/dev/null 2>&1; then
  chown -R msv:msv "$DEST_DIR"
  echo "    права переданы пользователю msv"
else
  echo "    ПРЕДУПРЕЖДЕНИЕ: пользователь msv не найден, права не менялись"
fi

echo "==> Подключение в index.html"
cp "$INDEX" "$INDEX.bak-$STAMP"
echo "    резервная копия: $INDEX.bak-$STAMP"

if grep -q "shahmatka.css" "$INDEX"; then
  echo "    стили уже подключены — пропускаю"
else
  # вставляем перед закрывающим </head>
  sed -i 's|</head>|<link rel="stylesheet" href="/shahmatka/shahmatka.css">\n</head>|' "$INDEX"
  echo "    добавлена строка со стилями"
fi

if grep -q "shahmatka.js" "$INDEX"; then
  echo "    скрипт уже подключён — пропускаю"
else
  # ВАЖНО: до app.js, чтобы к моменту его запуска MSVShahmatka уже существовал
  sed -i 's|<script src="/app.js">|<script src="/shahmatka/shahmatka.js"></script>\n<script src="/app.js">|' "$INDEX"
  echo "    добавлена строка со скриптом"
fi

if ! grep -q "shahmatka.js" "$INDEX"; then
  echo "    ПРЕДУПРЕЖДЕНИЕ: не удалось найти строку <script src=\"/app.js\"> в index.html."
  echo "    Добавьте вручную перед </body>:"
  echo '      <script src="/shahmatka/shahmatka.js"></script>'
fi

echo "==> Проверка отдачи файлов через nginx"
if ! grep -qs "location /shahmatka" /etc/nginx/sites-enabled/* 2>/dev/null; then
  echo "    (если файлы не откроются по адресу /shahmatka/shahmatka.js —"
  echo "     значит, их отдаёт Node.js как статику; проверьте в браузере)"
fi

echo "==> Перезапуск сервиса"
if systemctl list-unit-files 2>/dev/null | grep -q '^msv\.service'; then
  systemctl restart msv
  sleep 1
  systemctl is-active --quiet msv && echo "    сервис msv запущен" || {
    echo "    ОШИБКА: сервис не поднялся. Логи: journalctl -u msv -n 50 --no-pager"
    exit 1
  }
else
  echo "    сервис msv не найден — перезапустите приложение вручную"
fi

echo
echo "============================================================"
echo " ГОТОВО."
echo
echo " Проверьте демо-страницу в браузере:"
echo "   http://$(hostname -I 2>/dev/null | awk '{print $1}')/shahmatka/demo.html"
echo
echo " Если что-то сломалось, вернуть index.html:"
echo "   cp $INDEX.bak-$STAMP $INDEX && systemctl restart msv"
echo "============================================================"
