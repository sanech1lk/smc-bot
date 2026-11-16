"""
Настройки приложения.

Все настройки лежат в файле config.json рядом с этим файлом.
Файл создаётся автоматически при первом запуске, а менять его удобнее
через веб-интерфейс (блок "Настройки").
"""

import json
from pathlib import Path

# Папка, в которой лежит проект
BASE_DIR = Path(__file__).parent
CONFIG_PATH = BASE_DIR / "config.json"

# Значения по умолчанию — используются, если в config.json чего-то нет
DEFAULTS = {
    "telegram_token": "",            # токен бота от @BotFather
    "telegram_chat_id": "",          # ваш chat_id (куда слать уведомления)
    "check_interval_minutes": 10,    # как часто проверять объявления
    "blacklist": ["uszkodzony", "uszkodzona", "na części", "zamienię"],
    "olx_use_playwright": False,     # True = всегда открывать OLX через браузер Playwright
}

# Чаще, чем раз в 3 минуты, проверять нельзя — так выше шанс блокировки
MIN_INTERVAL_MINUTES = 3


def load_config() -> dict:
    """Читает config.json и возвращает словарь настроек."""
    config = dict(DEFAULTS)
    if CONFIG_PATH.exists():
        try:
            saved = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
            config.update(saved)
        except (json.JSONDecodeError, OSError):
            # Файл испорчен — работаем на значениях по умолчанию
            print("ВНИМАНИЕ: не удалось прочитать config.json, использую настройки по умолчанию")
    return config


def save_config(new_values: dict) -> dict:
    """Обновляет настройки и сохраняет их в config.json."""
    config = load_config()
    config.update(new_values)

    # Защита от слишком частых проверок и от мусора в поле интервала
    try:
        interval = int(config["check_interval_minutes"])
    except (TypeError, ValueError):
        interval = DEFAULTS["check_interval_minutes"]
    config["check_interval_minutes"] = max(MIN_INTERVAL_MINUTES, interval)

    CONFIG_PATH.write_text(
        json.dumps(config, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return config
