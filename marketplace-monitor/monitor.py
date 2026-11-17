"""
Логика мониторинга: берём фильтры из базы, спрашиваем площадки,
находим новые объявления, сравниваем цену с рынком и отправляем выгодные в Telegram.
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

# Сколько объявлений нужно увидеть, чтобы доверять рыночной цене
MIN_MARKET_SAMPLES = 5


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


def reference_price(f: dict) -> tuple[float | None, str]:
    """
    Цена, с которой сравниваем новые объявления:
      1) ваша цена продажи, если вы её указали в фильтре;
      2) иначе рыночная — медиана цен похожих объявлений за 30 дней.
    """
    if f.get("resale_price"):
        return float(f["resale_price"]), "ваша цена продажи"
    median, count = database.market_stats(f["id"])
    if count >= MIN_MARKET_SAMPLES:
        return median, "рынок"
    return None, ""


def check_filter(f: dict, config: dict) -> dict:
    """Проверяет один фильтр. Возвращает краткий итог для интерфейса."""
    name = f"{f['platform'].upper()} «{f['keywords']}»"

    try:
        items = fetch_items(f, config)
    except ParserError as error:
        database.update_filter_status(f["id"], f"Ошибка: {error}")
        return {"filter": name, "ok": False, "new": 0, "deals": 0, "message": str(error)}
    except Exception as error:  # любая неожиданная ошибка не должна ронять приложение
        message = f"{type(error).__name__}: {error}"
        database.update_filter_status(f["id"], f"Ошибка: {message}")
        return {"filter": name, "ok": False, "new": 0, "deals": 0, "message": message}

    items = [item for item in items if passes_filters(item, f, config.get("blacklist", []))]

    # Сайт отдаёт объявления "от новых к старым". Сохраняем в обратном порядке,
    # чтобы самое свежее оказалось в таблице последним (и показывалось сверху).
    items.reverse()

    # Первая проверка фильтра: всё, что уже есть на сайте, просто запоминаем
    # без уведомлений — иначе в Telegram прилетело бы сразу 40 сообщений.
    # Эти объявления заодно дают данные для расчёта рыночной цены.
    if not f["initialized"]:
        for item in items:
            database.save_listing_if_new(f["id"], f["platform"], item, is_new=False)
        message = f"Первая проверка: запомнено {len(items)} объявл. Дальше придут только новые."
        database.update_filter_status(f["id"], message, initialized=True)
        return {"filter": name, "ok": True, "new": 0, "deals": 0, "message": message}

    # Рыночную цену считаем ДО добавления новых объявлений
    reference, reference_label = reference_price(f)
    threshold = f.get("discount_pct") or 20
    only_deals = f.get("notify_mode", "deals") == "deals"

    to_notify = []   # (объявление, скидка, выгодное ли)
    new_count = deal_count = 0
    for item in items:
        price = item.get("price_value")
        discount = None
        if reference and price:
            discount = round((reference - price) / reference * 100)
        is_deal = discount is not None and discount >= threshold

        if not database.save_listing_if_new(f["id"], f["platform"], item, is_new=True,
                                            market_price=reference, discount=discount):
            continue  # уже видели
        new_count += 1
        deal_count += is_deal

        if not only_deals or is_deal:
            to_notify.append((item, discount, is_deal))
        elif reference is None and price:
            # Рыночной цены ещё нет (мало данных) — лучше прислать, чем пропустить
            to_notify.append((item, None, False))

    # Отправляем уведомления
    send_error = ""
    for item, discount, is_deal in to_notify[-MAX_MESSAGES_PER_FILTER:]:
        text = notifier.format_listing(f["platform"], f["keywords"], item,
                                       reference, reference_label, discount, is_deal)
        ok, info = notifier.send_listing(text, item.get("url", ""), item.get("photo", ""))
        if not ok:
            send_error = info
            break
        time.sleep(1)  # Telegram не любит сообщения чаще раза в секунду
    if len(to_notify) > MAX_MESSAGES_PER_FILTER and not send_error:
        rest = len(to_notify) - MAX_MESSAGES_PER_FILTER
        notifier.send_message(f"…и ещё {rest} по фильтру «{f['keywords']}» — смотрите в приложении.")

    message = f"Новых: {new_count}, выгодных: {deal_count}"
    if to_notify and send_error:
        message += f" (Telegram не отправлен: {send_error})"
    database.update_filter_status(f["id"], message)
    return {"filter": name, "ok": True, "new": new_count, "deals": deal_count, "message": message}


def check_all() -> dict:
    """Проверяет все фильтры по очереди. Вызывается таймером и кнопкой."""
    # Если проверка уже идёт — вторую не запускаем
    if not _check_lock.acquire(blocking=False):
        return {"busy": True, "results": [], "total_new": 0, "total_deals": 0}

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
            "total_deals": sum(r["deals"] for r in results),
        }
    finally:
        _check_lock.release()
