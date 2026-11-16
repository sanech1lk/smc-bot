"""
Общие вещи для всех парсеров.

Каждый парсер возвращает список объявлений в одинаковом виде:
    {"id": "...", "title": "...", "price": "1 200 zł", "price_value": 1200.0,
     "city": "Warszawa", "url": "https://..."}
"""

import re


class ParserError(Exception):
    """Парсер не смог получить объявления (текст ошибки показывается в интерфейсе)."""


class BlockedError(ParserError):
    """Сайт заблокировал запрос (403, капча, слишком частые запросы)."""


def parse_price(text: str) -> float | None:
    """
    Достаёт число из строки с ценой: "1 200,50 zł" -> 1200.5
    Если числа нет ("Zamienię", "Za darmo") — возвращает None.
    """
    if not text:
        return None
    # Убираем пробелы (в т.ч. неразрывные) между разрядами
    cleaned = text.replace("\xa0", "").replace(" ", "")
    match = re.search(r"\d+(?:[.,]\d+)?", cleaned)
    if not match:
        return None
    return float(match.group().replace(",", "."))


def slugify(text: str) -> str:
    """
    Превращает польское название в кусочек адреса: "Zielona Góra" -> "zielona-gora"
    """
    table = str.maketrans("ąćęłńóśźż", "acelnoszz")
    text = text.strip().lower().translate(table)
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")
