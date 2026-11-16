"""
Facebook Marketplace — БЕЗ автоматического парсинга.

Официального API у Marketplace нет, а автоматический сбор данных ненадёжен
и грозит блокировкой аккаунта. Поэтому здесь мы только собираем ссылку поиска
с вашими фильтрами — приложение открывает её в браузере по кнопке,
и вы смотрите объявления сами под своим обычным входом в Facebook.
"""

from urllib.parse import urlencode

from . import slugify

# У Facebook свои (английские) названия крупных городов в адресе
CITY_SLUGS = {
    "warszawa": "warsaw",
    "krakow": "krakow",
    "wroclaw": "wroclaw",
    "poznan": "poznan",
    "gdansk": "gdansk",
    "lodz": "lodz",
    "katowice": "katowice",
    "lublin": "lublin",
    "szczecin": "szczecin",
}

# Категории для Facebook не используются (поиск идёт по ключевым словам)
CATEGORIES = {"": "Все категории"}


def build_search_url(keywords, min_price=None, max_price=None, city="", category="") -> str:
    """Собирает ссылку поиска Facebook Marketplace."""
    params = {
        "query": keywords,
        "sortBy": "creation_time_descend",  # сначала новые
        "daysSinceListed": 1,               # только за последние сутки
        "exact": "false",
    }
    if min_price is not None:
        params["minPrice"] = int(min_price)
    if max_price is not None:
        params["maxPrice"] = int(max_price)

    # Если город указан — подставляем его в адрес. Для небольших городов
    # Facebook может не узнать название: тогда он покажет поиск по
    # местоположению из вашего профиля — поправьте город прямо на странице.
    path = "marketplace"
    if city:
        slug = slugify(city)
        path += "/" + CITY_SLUGS.get(slug, slug)

    return f"https://www.facebook.com/{path}/search?{urlencode(params)}"
