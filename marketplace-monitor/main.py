"""
Главный файл приложения.

Запуск:   uvicorn main:app --reload   (или двойной щелчок по start.bat)
Открыть:  http://127.0.0.1:8000

Здесь: веб-сервер FastAPI, адреса API (к ним обращается страница index.html)
и планировщик, который проверяет объявления по таймеру.
"""

import os
import threading
import webbrowser
from contextlib import asynccontextmanager
from typing import Literal

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

import database
import monitor
import notifier
from config import BASE_DIR, MIN_INTERVAL_MINUTES, load_config, save_config
from parsers import facebook, olx, vinted

# Планировщик запускает monitor.check_all() в фоновом потоке
scheduler = BackgroundScheduler()
JOB_ID = "check_all"

# Список площадок и их категорий — отдаётся в интерфейс.
# Категории лежат в словарях вида {"значение": "название"} (см. файлы в parsers/)
PLATFORMS = {
    "olx": {"name": "OLX", "categories": olx.CATEGORIES, "auto": True},
    "vinted": {"name": "Vinted", "categories": vinted.CATEGORIES, "auto": True},
    "facebook": {"name": "Facebook Marketplace", "categories": facebook.CATEGORIES, "auto": False},
}


def schedule_job() -> None:
    """Ставит (или переставляет) таймер проверки с интервалом из настроек."""
    minutes = load_config()["check_interval_minutes"]
    scheduler.add_job(
        monitor.check_all,
        "interval",
        minutes=minutes,
        id=JOB_ID,
        replace_existing=True,   # если таймер уже был — заменить
        max_instances=1,
        coalesce=True,           # пропущенные запуски не накапливать
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Код до yield выполняется при старте приложения, после — при остановке."""
    database.init_db()
    save_config({})  # создаёт config.json, если его ещё нет
    scheduler.start()
    schedule_job()
    # start.bat ставит переменную MM_OPEN_BROWSER=1 — тогда открываем браузер сами,
    # через 1.5 секунды, когда сервер уже точно принимает подключения
    if os.environ.get("MM_OPEN_BROWSER") == "1":
        threading.Timer(1.5, webbrowser.open, args=["http://127.0.0.1:8000"]).start()
    yield
    scheduler.shutdown(wait=False)


app = FastAPI(title="Marketplace Monitor", lifespan=lifespan)


# ---------- Форматы данных, которые присылает страница ----------

class FilterIn(BaseModel):
    platform: str
    keywords: str = Field(min_length=1, max_length=200)
    min_price: float | None = Field(default=None, ge=0)
    max_price: float | None = Field(default=None, ge=0)
    city: str = Field(default="", max_length=100)
    category: str = Field(default="", max_length=100)
    notify_mode: Literal["deals", "all"] = "deals"
    discount_pct: float = Field(default=20, ge=1, le=95)
    resale_price: float | None = Field(default=None, gt=0)


class ListingUpdate(BaseModel):
    # new = обычное, favorite = избранное, bought = куплено, sold = продано, hidden = скрыто
    status: Literal["new", "favorite", "bought", "sold", "hidden"] | None = None
    buy_price: float | None = Field(default=None, ge=0)
    sell_price: float | None = Field(default=None, ge=0)
    note: str | None = Field(default=None, max_length=500)


class SettingsIn(BaseModel):
    telegram_token: str = ""
    telegram_chat_id: str = ""
    check_interval_minutes: int = Field(default=10, ge=MIN_INTERVAL_MINUTES, le=1440)
    blacklist: list[str] = []
    olx_use_playwright: bool = False


def clean_filter(data: FilterIn) -> dict:
    """Проверяет фильтр и превращает его в словарь для базы."""
    if data.platform not in PLATFORMS:
        raise HTTPException(400, "Неизвестная площадка")
    values = data.model_dump()
    values["keywords"] = data.keywords.strip()
    values["city"] = "" if data.platform == "vinted" else data.city.strip()
    if not values["keywords"]:
        raise HTTPException(400, "Введите ключевые слова")
    if data.min_price is not None and data.max_price is not None and data.min_price > data.max_price:
        raise HTTPException(400, "Минимальная цена больше максимальной")
    if data.category not in PLATFORMS[data.platform]["categories"]:
        raise HTTPException(400, "Эта категория не подходит для выбранной площадки")
    return values


# ---------- Страница ----------

@app.get("/")
def index():
    """Отдаёт главную (и единственную) страницу."""
    return FileResponse(BASE_DIR / "static" / "index.html")


# ---------- API: справочники ----------

@app.get("/api/meta")
def get_meta():
    """Площадки и категории для выпадающих списков."""
    # Категории отдаём списком пар [значение, название], чтобы сохранить порядок
    return {
        key: {**info, "categories": list(info["categories"].items())}
        for key, info in PLATFORMS.items()
    }


# ---------- API: фильтры ----------

@app.get("/api/filters")
def list_filters():
    filters = database.get_filters()
    for f in filters:
        # Рыночная цена и сколько объявлений в неё вошло — для подсказки в интерфейсе
        f["market_price"], f["market_samples"] = database.market_stats(f["id"])
        f["min_samples"] = monitor.MIN_MARKET_SAMPLES
        # Для Facebook добавляем готовую ссылку поиска — её откроет кнопка
        if f["platform"] == "facebook":
            f["search_url"] = facebook.build_search_url(
                f["keywords"], f["min_price"], f["max_price"], f["city"], f["category"]
            )
    return filters


@app.post("/api/filters")
def create_filter(data: FilterIn):
    return {"id": database.add_filter(clean_filter(data))}


@app.put("/api/filters/{filter_id}")
def edit_filter(filter_id: int, data: FilterIn):
    if database.get_filter(filter_id) is None:
        raise HTTPException(404, "Фильтр не найден")
    database.update_filter(filter_id, clean_filter(data))
    return {"ok": True}


@app.delete("/api/filters/{filter_id}")
def remove_filter(filter_id: int):
    database.delete_filter(filter_id)
    return {"ok": True}


@app.post("/api/check")
def check_now():
    """Кнопка "Проверить сейчас". Отвечает, когда проверка закончится."""
    return monitor.check_all()


# ---------- API: объявления и покупки ----------

@app.get("/api/listings")
def list_listings():
    return database.get_listings()


@app.patch("/api/listings/{listing_id}")
def change_listing(listing_id: int, data: ListingUpdate):
    # exclude_unset — меняем только те поля, которые прислала страница
    database.update_listing(listing_id, data.model_dump(exclude_unset=True))
    return {"ok": True}


# ---------- API: настройки ----------

@app.get("/api/settings")
def get_settings():
    config = load_config()
    job = scheduler.get_job(JOB_ID)
    next_run = job.next_run_time.strftime("%H:%M") if job and job.next_run_time else None
    return {**config, "next_run": next_run, "min_interval": MIN_INTERVAL_MINUTES}


@app.post("/api/settings")
def update_settings(data: SettingsIn):
    values = data.model_dump()
    values["telegram_token"] = values["telegram_token"].strip()
    values["telegram_chat_id"] = values["telegram_chat_id"].strip()
    # Убираем пустые строки и лишние пробелы из чёрного списка
    values["blacklist"] = [w.strip() for w in values["blacklist"] if w.strip()]
    save_config(values)
    schedule_job()  # интервал мог измениться — переставляем таймер
    return {"ok": True}


@app.post("/api/telegram/test")
def telegram_test():
    ok, info = notifier.send_message("✅ Тест: уведомления Marketplace Monitor работают!")
    return {"ok": ok, "message": info}
