#!/usr/bin/env bash
#
# Резервная копия BudChat: база данных + загруженные файлы.
#
# Копировать надо именно оба: в базе лежат сообщения, сметы и ссылки на
# файлы, а сами фотографии, планы и документы — в томе с файлами. Дамп без
# файлов оставит битые картинки, файлы без дампа — набор безымянных JPEG.
#
# Использование:
#   ./scripts/backup.sh                # в ./backups
#   BACKUP_DIR=/mnt/disk ./scripts/backup.sh
#
# Восстановление — scripts/restore.sh.

set -euo pipefail

cd "$(dirname "$0")/.."

BACKUP_DIR="${BACKUP_DIR:-./backups}"
KEEP_DAYS="${KEEP_DAYS:-30}"
STAMP="$(date +%Y-%m-%d_%H-%M-%S)"
TARGET="${BACKUP_DIR}/${STAMP}"

# Позволяет запускать скрипт и на проде, где compose собран из двух файлов.
COMPOSE="${COMPOSE:-docker compose}"

echo "→ Копия в ${TARGET}"
mkdir -p "${TARGET}"

echo "→ Дамп базы данных"
# --clean --if-exists делает дамп пригодным для наката поверх существующей
# базы, не требуя пересоздавать её вручную.
$COMPOSE exec -T postgres pg_dump \
  --username=budchat \
  --dbname=budchat \
  --clean --if-exists --no-owner \
  | gzip > "${TARGET}/database.sql.gz"

echo "→ Архив загруженных файлов"
# Читаем том через сам контейнер приложения: путь внутри него стабилен и не
# зависит от того, как том называется на хосте.
$COMPOSE exec -T app tar czf - -C /app/public/uploads . > "${TARGET}/uploads.tar.gz"

# Пригодится, чтобы через полгода понять, откуда копия и чем её разворачивать.
cat > "${TARGET}/manifest.txt" <<EOF
BudChat backup
Дата:      $(date --iso-8601=seconds)
Хост:      $(hostname)
Git:       $(git rev-parse --short HEAD 2>/dev/null || echo "не репозиторий")
База:      database.sql.gz  ($(du -h "${TARGET}/database.sql.gz" | cut -f1))
Файлы:     uploads.tar.gz   ($(du -h "${TARGET}/uploads.tar.gz" | cut -f1))

Восстановление: ./scripts/restore.sh ${TARGET}
EOF

echo "→ Удаление копий старше ${KEEP_DAYS} дней"
find "${BACKUP_DIR}" -mindepth 1 -maxdepth 1 -type d -mtime "+${KEEP_DAYS}" -exec rm -rf {} +

echo
cat "${TARGET}/manifest.txt"
echo
echo "Готово. Копия на том же сервере — это ещё не бэкап:"
echo "отвезите ${TARGET} на другую машину или в облако."
