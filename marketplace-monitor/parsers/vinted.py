"""
Парсер Vinted.pl.

У Vinted нет открытого API, поэтому используем готовую библиотеку,
которая сама получает нужные cookies и обращается к внутреннему API сайта.

Поддерживаются ДВЕ библиотеки (обе ставят модуль с именем "vinted",
поэтому одновременно может быть установлена только одна):
  - vinted-api-kit      (основная, стоит в requirements.txt)
  - vinted-api-wrapper  (запасная; как переключиться — см. README)
Код сам определяет, какая из них установлена.

Важно: Vinted не умеет искать по городу, поэтому поле "город" игнорируется.
"""

import asyncio
from urllib.parse import urlencode

from . import BlockedError, ParserError

BASE_URL = "https://www.vinted.pl"

# Категории: "ID каталога Vinted" -> "название в интерфейсе".
# ID виден в адресе, когда вы открываете категорию на сайте:
# vinted.pl/catalog/2994-electronics  ->  ID = 2994
CATEGORIES = {
    "": "Все категории",
    "1904": "Одежда и обувь — женское (Kobiety)",
    "5": "Одежда и обувь — мужское (Mężczyźni)",
    "2994": "Электроника",
}

PER_PAGE = 40  # сколько самых новых объявлений брать за одну проверку


def build_search_url(keywords, min_price=None, max_price=None, category="") -> str:
    """Собирает обычную ссылку поиска Vinted (её же можно открыть в браузере)."""
    params = [("search_text", keywords), ("order", "newest_first")]
    if min_price is not None:
        params.append(("price_from", int(min_price)))
    if max_price is not None:
        params.append(("price_to", int(max_price)))
    if min_price is not None or max_price is not None:
        params.append(("currency", "PLN"))
    if category:
        params.append(("catalog[]", category))
    return f"{BASE_URL}/catalog?{urlencode(params)}"


def _format_price(amount, currency) -> str:
    """12.0, 'PLN' -> '12.00 zł'"""
    try:
        text = f"{float(amount):.2f}"
    except (TypeError, ValueError):
        return ""
    return f"{text} {'zł' if currency in ('PLN', '', None) else currency}"


# ---------- Вариант 1: vinted-api-kit (асинхронная) ----------

async def _search_kit(url: str) -> list[dict]:
    from vinted import VintedClient

    async with VintedClient() as client:
        found = await client.search_items(url=url, per_page=PER_PAGE, order="newest_first")

    return [
        {
            "id": str(item.id),
            "title": item.title,
            "price": _format_price(item.price, item.currency),
            "price_value": float(item.price) if item.price else None,
            "city": "",
            "url": item.url,
        }
        for item in found
    ]


# ---------- Вариант 2: vinted-api-wrapper (обычная, не асинхронная) ----------

def _search_wrapper(keywords, min_price, max_price, category) -> list[dict]:
    from vinted import Vinted

    client = Vinted(domain="pl")
    result = client.search(
        query=keywords,
        price_from=min_price,
        price_to=max_price,
        order="newest_first",
        per_page=PER_PAGE,
        catalog_ids=int(category) if category else None,
    )

    items = []
    for item in result.items:
        # Цена бывает объектом (amount + currency_code) или просто строкой
        amount = getattr(item.price, "amount", item.price)
        currency = getattr(item.price, "currency_code", "PLN")
        try:
            price_value = float(amount)
        except (TypeError, ValueError):
            price_value = None
        url = item.url if str(item.url).startswith("http") else BASE_URL + str(item.url)
        items.append(
            {
                "id": str(item.id),
                "title": item.title,
                "price": _format_price(amount, currency),
                "price_value": price_value,
                "city": "",
                "url": url,
            }
        )
    return items


def search(keywords, min_price=None, max_price=None, city="", category="") -> list[dict]:
    """Главная функция: возвращает список свежих объявлений по фильтру."""
    try:
        import vinted
    except ImportError as error:
        raise ParserError(
            "Библиотека для Vinted не установлена: pip install vinted-api-kit"
        ) from error

    try:
        if hasattr(vinted, "VintedClient"):
            # Установлена vinted-api-kit. Она асинхронная, а наш код обычный,
            # поэтому запускаем её через asyncio.run()
            url = build_search_url(keywords, min_price, max_price, category)
            return asyncio.run(_search_kit(url))
        # Иначе считаем, что установлена vinted-api-wrapper
        return _search_wrapper(keywords, min_price, max_price, category)
    except ParserError:
        raise
    except Exception as error:
        kind = type(error).__name__
        text = f"{kind}: {error}"[:200]
        # По названию ошибки понимаем, что случилось
        if "Network" in kind or "Timeout" in kind or "Connection" in kind:
            raise ParserError(f"Vinted: нет соединения ({text})") from error
        if "RateLimit" in kind or "Auth" in kind or any(code in text for code in ("401", "403", "429")):
            raise BlockedError(f"Vinted заблокировал запрос ({text})") from error
        raise ParserError(f"Vinted: {text}") from error
