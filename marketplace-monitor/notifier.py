"""
Отправка уведомлений в Telegram.

Используем обычный HTTP-запрос к Telegram Bot API — отдельная библиотека не нужна.
"""

import html

import requests

from config import load_config

# Красивые названия площадок для сообщений
PLATFORM_NAMES = {"olx": "OLX", "vinted": "Vinted", "facebook": "Facebook"}


def send_message(text: str) -> tuple[bool, str]:
    """
    Отправляет сообщение в Telegram.
    Возвращает (успех, пояснение) — пояснение показывается в интерфейсе.
    """
    config = load_config()
    token = str(config.get("telegram_token", "")).strip()
    chat_id = str(config.get("telegram_chat_id", "")).strip()

    if not token or not chat_id:
        return False, "Не заполнены токен бота или chat_id"

    try:
        response = requests.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={
                "chat_id": chat_id,
                "text": text,
                "parse_mode": "HTML",
                "disable_web_page_preview": False,
            },
            timeout=15,
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


def format_listing(platform: str, keywords: str, item: dict) -> str:
    """Собирает текст уведомления об одном объявлении."""
    # html.escape нужен, чтобы символы < > & в названии не сломали разметку
    lines = [
        f"🆕 <b>{html.escape(item.get('title') or 'Без названия')}</b>",
        f"💰 {html.escape(item.get('price') or 'цена не указана')}",
    ]
    if item.get("city"):
        lines.append(f"📍 {html.escape(item['city'])}")
    lines.append(f"🏷 {PLATFORM_NAMES.get(platform, platform)} · фильтр «{html.escape(keywords)}»")
    lines.append(html.escape(item.get("url", "")))
    return "\n".join(lines)
