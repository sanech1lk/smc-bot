"""
Парсер OLX.pl.

Как работает:
  1. Собираем обычную ссылку поиска OLX (такую же, как в адресной строке браузера).
  2. Скачиваем страницу через requests.
  3. Достаём карточки объявлений через BeautifulSoup.

Если OLX ответил 403 (защита от ботов) — пробуем открыть ту же страницу
настоящим браузером через Playwright (если он установлен, см. README).
"""

import re
from urllib.parse import quote, urlencode

import requests
from bs4 import BeautifulSoup

from . import BlockedError, ParserError, parse_price, slugify

BASE_URL = "https://www.olx.pl"

# Категории: "кусочек адреса OLX" -> "название в интерфейсе".
# Чтобы добавить свою: откройте нужную категорию на olx.pl и скопируйте
# часть адреса после "olx.pl/", например "elektronika/telefony".
CATEGORIES = {
    "": "Все категории",
    "elektronika": "Электроника",
    "moda": "Одежда и обувь (Moda)",
    "motoryzacja": "Авто и запчасти (Motoryzacja)",
}

# Заголовки как у обычного браузера Chrome на Windows
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "pl-PL,pl;q=0.9,en;q=0.8",
}


def build_search_url(keywords, min_price=None, max_price=None, city="", category="") -> str:
    """
    Собирает ссылку поиска. Примеры:
      https://www.olx.pl/oferty/q-iphone-13/
      https://www.olx.pl/elektronika/warszawa/q-iphone-13/
    """
    parts = []
    if category:
        parts.append(category.strip("/"))
    if city:
        parts.append(slugify(city))
    if not parts:
        parts.append("oferty")  # "все объявления"

    # "iphone 13 pro" -> "q-iphone-13-pro"
    query = "-".join(keywords.split())
    parts.append("q-" + quote(query))

    params = {"search[order]": "created_at:desc"}  # сначала самые новые
    if min_price is not None:
        params["search[filter_float_price:from]"] = int(min_price)
    if max_price is not None:
        params["search[filter_float_price:to]"] = int(max_price)

    return f"{BASE_URL}/{'/'.join(parts)}/?{urlencode(params)}"


def fetch_html_requests(url: str) -> str:
    """Скачивает страницу простым HTTP-запросом."""
    try:
        response = requests.get(url, headers=HEADERS, timeout=20)
    except requests.RequestException as error:
        raise ParserError(f"OLX: нет соединения ({type(error).__name__})") from error

    if response.status_code in (403, 429, 503):
        raise BlockedError(f"OLX заблокировал запрос (код {response.status_code})")
    if response.status_code == 404:
        raise ParserError("OLX: страница не найдена (404). Проверьте написание города.")
    if response.status_code != 200:
        raise ParserError(f"OLX ответил кодом {response.status_code}")
    return response.text


def fetch_html_playwright(url: str) -> str:
    """
    Запасной вариант: открывает страницу настоящим браузером Chromium.
    Медленнее (5-10 секунд), но проходит большинство защит.
    """
    try:
        from playwright.sync_api import sync_playwright
    except ImportError as error:
        raise BlockedError(
            "OLX блокирует обычные запросы, а Playwright не установлен. "
            "Установите его: pip install playwright, затем playwright install chromium"
        ) from error

    try:
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            page = browser.new_page(locale="pl-PL", user_agent=HEADERS["User-Agent"])
            page.goto(url, wait_until="domcontentloaded", timeout=45000)
            try:
                # Ждём появления карточек; если их нет — просто берём что есть
                page.wait_for_selector('[data-cy="l-card"]', timeout=10000)
            except Exception:
                pass
            html = page.content()
            browser.close()
            return html
    except Exception as error:
        raise ParserError(f"OLX (Playwright): {type(error).__name__}: {error}") from error


def parse_html(html: str) -> list[dict]:
    """Достаёт объявления из HTML страницы поиска."""
    soup = BeautifulSoup(html, "html.parser")
    cards = soup.select('[data-cy="l-card"]')

    # Карточек нет. Это либо "ничего не найдено", либо нам подсунули не ту страницу.
    if not cards:
        if 'data-testid="listing-grid"' in html or "total-count" in html:
            return []  # нормальная страница, просто пусто
        raise ParserError(
            "OLX вернул страницу без списка объявлений — сработала защита "
            "или изменилась вёрстка сайта"
        )

    items = []
    for card in cards:
        link = card.select_one("a[href]")
        if not link:
            continue
        url = link["href"]
        if url.startswith("/"):
            url = BASE_URL + url
        url = url.split("#")[0]  # отрезаем служебный хвост

        # ID объявления: атрибут id карточки, а если его нет — берём из ссылки
        item_id = card.get("id")
        if not item_id:
            match = re.search(r"ID(\w+)\.html", url)
            item_id = match.group(1) if match else url

        title_tag = card.select_one("h4, h6")
        image = card.select_one("img[alt]")
        title = title_tag.get_text(strip=True) if title_tag else (image["alt"] if image else "")

        price_tag = card.select_one('[data-testid="ad-price"]')
        price = price_tag.get_text(" ", strip=True) if price_tag else ""

        # Текст вида "Warszawa, Mokotów - Dzisiaj o 12:30" — берём часть до " - "
        place_tag = card.select_one('[data-testid="location-date"]')
        place = place_tag.get_text(" ", strip=True) if place_tag else ""
        city = place.split(" - ")[0].strip()

        items.append(
            {
                "id": str(item_id),
                "title": title,
                "price": price,
                "price_value": parse_price(price),
                "city": city,
                "url": url,
            }
        )
    return items


def search(keywords, min_price=None, max_price=None, city="", category="", use_playwright=False) -> list[dict]:
    """Главная функция: возвращает список свежих объявлений по фильтру."""
    url = build_search_url(keywords, min_price, max_price, city, category)

    if use_playwright:
        html = fetch_html_playwright(url)
    else:
        try:
            html = fetch_html_requests(url)
        except BlockedError:
            # Обычный запрос заблокирован — пробуем через браузер
            html = fetch_html_playwright(url)

    return parse_html(html)
