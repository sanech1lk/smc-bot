"""
Отправка уведомлений в Telegram.

Используем обычный HTTP-запрос к Telegram Bot API — отдельная библиотека не нужна.
Объявление приходит фото с подписью и кнопкой «Открыть объявление».
"""

import html

import requests

from config import load_config

# Красивые названия площадок для сообщений
PLATFORM_NAMES = {"olx": "OLX", "vinted": "Vinted", "facebook": "Facebook"}

# Если скидка больше этого — вероятно, это аксессуар, запчасть или мошенник
SUSPICIOUS_DISCOUNT = 70


def _call(method: str, payload: dict) -> tuple[bool, str]:
    """
    Вызывает метод Telegram Bot API (sendMessage, sendPhoto...).
    Возвращает (успех, пояснение) — пояснение показывается в интерфейсе.
    """
    config = load_config()
    token = str(config.get("telegram_token", "")).strip()
    chat_id = str(config.get("telegram_chat_id", "")).strip()

    if not token or not chat_id:
        return False, "Не заполнены токен бота или chat_id"

    try:
        response = requests.post(
            f"https://api.telegram.org/bot{token}/{method}",
            json={"chat_id": chat_id, **payload},
            timeout=20,
        )
    except requests.RequestException as error:
        # В тексте ошибки может оказаться адрес с токеном — наружу его не показываем
        return False, f"Нет связи с Telegram ({type(error).__name__})"

    if response.status_code == 200:
        return True, "Сообщение отправлено"

    # Telegram объясняет причину в поле description
    try:
        reason = response.json().get("description", "")
    except ValueError:
        reason = ""
    hints = {
        401: "неверный токен бота",
        400: "неверный chat_id (или вы ещё не написали боту /start)",
        403: "бот заблокирован вами или вы не нажали /start",
    }
    hint = hints.get(response.status_code, "")
    return False, f"Telegram ответил {response.status_code}: {reason} {('— ' + hint) if hint else ''}".strip()


def send_message(text: str) -> tuple[bool, str]:
    """Отправляет обычное текстовое сообщение."""
    return _call("sendMessage", {"text": text, "parse_mode": "HTML", "disable_web_page_preview": True})


def zl(value: float | None) -> str:
    """1480.0 -> '1 480 zł'"""
    if value is None:
        return "—"
    return f"{value:,.0f}".replace(",", " ") + " zł"


def format_listing(platform: str, keywords: str, item: dict,
                   reference: float | None = None, reference_label: str = "",
                   discount: float | None = None, is_deal: bool = False) -> str:
    """Собирает подпись к уведомлению об одном объявлении."""
    # html.escape нужен, чтобы символы < > & в названии не сломали разметку
    title = html.escape(item.get("title") or "Без названия")
    if is_deal:
        head = f"🔥 <b>−{discount:.0f}%</b> · <b>{title}</b>"
    else:
        head = f"🆕 <b>{title}</b>"

    lines = [head, f"💰 <b>{html.escape(item.get('price') or 'цена не указана')}</b>"]

    price = item.get("price_value")
    if reference and price:
        profit = reference - price
        lines.append(f"📊 {reference_label} ~{zl(reference)} · выгода ≈ {zl(profit)}")
    if discount is not None and discount >= SUSPICIOUS_DISCOUNT:
        lines.append("⚠️ Подозрительно дёшево — проверьте, что это не аксессуар, "
                     "запчасть или мошенник. Не платите заранее!")
    if item.get("city"):
        lines.append(f"📍 {html.escape(item['city'])}")
    lines.append(f"🏷 {PLATFORM_NAMES.get(platform, platform)} · фильтр «{html.escape(keywords)}»")
    return "\n".join(lines)


def send_listing(text: str, url: str, photo: str = "") -> tuple[bool, str]:
    """
    Отправляет объявление: фото + подпись + кнопка со ссылкой.
    Если фото не получилось отправить — отправляет просто текст.
    """
    buttons = {"inline_keyboard": [[{"text": "Открыть объявление", "url": url}]]} if url.startswith("http") else None
    payload = {"parse_mode": "HTML"}
    if buttons:
        payload["reply_markup"] = buttons

    if photo.startswith("http"):
        ok, info = _call("sendPhoto", {**payload, "photo": photo, "caption": text[:1024]})
        if ok:
            return ok, info
        # Фото не прошло (битая ссылка и т.п.) — пробуем без него

    return _call("sendMessage", {**payload, "text": text + ("" if buttons else "\n" + html.escape(url)),
                                 "disable_web_page_preview": True})
