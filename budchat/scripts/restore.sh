#!/usr/bin/env bash
#
# Восстановление BudChat из копии, сделанной scripts/backup.sh.
#
#   ./scripts/restore.sh ./backups/2026-08-11_03-00-00
#
# ВНИМАНИЕ: операция затирает текущую базу и текущие файлы. Скрипт требует
# подтверждения вслепую не нажимаемым словом — по той же причине, по которой
# удаление аккаунта в приложении просит набрать «УДАЛИТЬ».
#
# Проверять восстановление надо заранее, на тестовом сервере. Бэкап, который
# ни разу не разворачивали, — это надежда, а не резервная копия.

set -euo pipefail

cd "$(dirname "$0")/.."

SOURCE="${1:-}"
COMPOSE="${COMPOSE:-docker compose}"

if [[ -z "${SOURCE}" ]]; then
  echo "Укажите папку с копией: ./scripts/restore.sh ./backups/2026-08-11_03-00-00" >&2
  exit 1
fi

if [[ ! -f "${SOURCE}/database.sql.gz" || ! -f "${SOURCE}/uploads.tar.gz" ]]; then
  echo "В ${SOURCE} нет database.sql.gz и/или uploads.tar.gz" >&2
  exit 1
fi

echo "Копия:  ${SOURCE}"
[[ -f "${SOURCE}/manifest.txt" ]] && cat "${SOURCE}/manifest.txt"
echo
echo "Текущие база и файлы будут ЗАМЕНЕНЫ содержимым этой копии."
read -r -p "Наберите ВОССТАНОВИТЬ, чтобы продолжить: " CONFIRM
if [[ "${CONFIRM}" != "ВОССТАНОВИТЬ" ]]; then
  echo "Отменено."
  exit 1
fi

echo "→ Останавливаю приложение, чтобы оно не писало во время наката"
$COMPOSE stop app

echo "→ Восстанавливаю базу"
gunzip -c "${SOURCE}/database.sql.gz" \
  | $COMPOSE exec -T postgres psql --username=budchat --dbname=budchat --quiet

echo "→ Восстанавливаю файлы"
$COMPOSE start app
# Ждём, пока контейнер снова примет команды.
until $COMPOSE exec -T app true 2>/dev/null; do sleep 1; done
$COMPOSE exec -T app sh -c 'rm -rf /app/public/uploads/* && mkdir -p /app/public/uploads'
$COMPOSE exec -T app tar xzf - -C /app/public/uploads < "${SOURCE}/uploads.tar.gz"

echo "→ Догоняю схему базы, если копия старше текущей версии кода"
$COMPOSE exec -T app npx prisma migrate deploy

echo
echo "Готово. Проверьте: откройте объект, посмотрите фото и смету."
