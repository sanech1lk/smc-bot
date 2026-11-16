"""
Логика мониторинга: берём фильтры из базы, спрашиваем площадки,
находим новые объявления и отправляем их в Telegram.
"""

import random
import threading
import time

import database
import notifier
from config import load_config
from parsers import ParserError, olx, vinted

# "Замок", чтобы две проверки не шли одновременно
# (например, вы нажали "Проверить сейчас", а в этот момент сработал таймер)
_check_lock = threading.Lock()

# Не больше стольких сообщений в Telegram по одному фильтру за одну проверку —
# защита от спама, если разом появилось много объявлений
MAX_MESSAGES_PER_FILTER = 10


def fetch_items(f: dict, config: dict) -> list[dict]:
    """Вызывает нужный парсер для фильтра f."""
    if f["platform"] == "olx":
        return olx.search(
            f["keywords"], f["min_price"], f["max_price"], f["city"], f["category"],
            use_playwright=bool(config.get("olx_use_playwright")),
        )
    if f["platform"] == "vinted":
        return vinted.search(f["keywords"], f["min_price"], f["max_price"], f["city"], f["category"])
    raise ParserError(f"Неизвестная площадка: {f['platform']}")


def passes_filters(item: dict, f: dict, blacklist: list[str]) -> bool:
    """Проверяет объявление: чёрный список слов и границы цены."""
    title = (item.get("title") or "").lower()
    for word in blacklist:
        word = word.strip().lower()
        if word and word in title:
            return False

    # Цену перепроверяем сами — на случай, если сайт проигнорировал фильтр
    value = item.get("price_value")
    if value is not None:
        if f["min_price"] is not None and value < f["min_price"]:
            return False
        if f["max_price"] is not None and value > f["max_price"]:
            return False
    return True


def check_filter(f: dict, config: dict) -> dict:
    """Проверяет один фильтр. Возвращает краткий итог для интерфейса."""
    name = f"{f['platform'].upper()} «{f['keywords']}»"

    try:
        items = fetch_items(f, config)
    except ParserError as error:
        database.update_filter_status(f["id"], f"Ошибка: {error}")
        return {"filter": name, "ok": False, "new": 0, "message": str(error)}
    except Exception as error:  # любая неожиданная ошибка не должна ронять приложение
        message = f"{type(error).__name__}: {error}"
        database.update_filter_status(f["id"], f"Ошибка: {message}")
        return {"filter": name, "ok": False, "new": 0, "message": message}

    items = [item for item in items if passes_filters(item, f, config.get("blacklist", []))]

    # Сайт отдаёт объявления "от новых к старым". Сохраняем в обратном порядке,
    # чтобы самое свежее оказалось в таблице последним (и показывалось сверху).
    items.reverse()

    # Первая проверка фильтра: всё, что уже есть на сайте, просто запоминаем
    # без уведомлений — иначе в Telegram прилетело бы сразу 40 сообщений.
    if not f["initialized"]:
        for item in items:
            database.save_listing_if_new(f["id"], f["platform"], item, is_new=False)
        message = f"Первая проверка: запомнено {len(items)} объявл. Уведомления пойдут о следующих новых."
        database.update_filter_status(f["id"], message, initialized=True)
        return {"filter": name, "ok": True, "new": 0, "message": message}

    # Обычная проверка: новым считается то, чего ещё нет в базе
    new_items = [
        item for item in items
        if database.save_listing_if_new(f["id"], f["platform"], item, is_new=True)
    ]

    # Отправляем уведомления
    send_error = ""
    for item in new_items[-MAX_MESSAGES_PER_FILTER:]:
        ok, info = notifier.send_message(notifier.format_listing(f["platform"], f["keywords"], item))
        if not ok:
            send_error = info
            break
        time.sleep(1)  # Telegram не любит сообщения чаще раза в секунду
    if len(new_items) > MAX_MESSAGES_PER_FILTER and not send_error:
        rest = len(new_items) - MAX_MESSAGES_PER_FILTER
        notifier.send_message(f"…и ещё {rest} новых по фильтру «{f['keywords']}» — смотрите в приложении.")

    message = f"Новых: {len(new_items)}"
    if new_items and send_error:
        message += f" (Telegram не отправлен: {send_error})"
    database.update_filter_status(f["id"], message)
    return {"filter": name, "ok": True, "new": len(new_items), "message": message}


def check_all() -> dict:
    """Проверяет все фильтры по очереди. Вызывается таймером и кнопкой."""
    # Если проверка уже идёт — вторую не запускаем
    if not _check_lock.acquire(blocking=False):
        return {"busy": True, "results": [], "total_new": 0}

    try:
        config = load_config()
        # Фильтры Facebook не проверяются автоматически (см. parsers/facebook.py)
        filters = [f for f in database.get_filters() if f["platform"] != "facebook"]

        results = []
        for index, f in enumerate(filters):
            if index > 0:
                # Случайная пауза между запросами — так мы меньше похожи на робота
                time.sleep(random.uniform(3, 8))
            results.append(check_filter(f, config))

        return {
            "busy": False,
            "results": results,
            "total_new": sum(r["new"] for r in results),
        }
    finally:
        _check_lock.release()
