"""
Главный файл приложения.

Запуск:   uvicorn main:app --reload
Открыть:  http://127.0.0.1:8000

Здесь: веб-сервер FastAPI, адреса API (к ним обращается страница index.html)
и планировщик, который проверяет объявления по таймеру.
"""

from contextlib import asynccontextmanager

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


class SettingsIn(BaseModel):
    telegram_token: str = ""
    telegram_chat_id: str = ""
    check_interval_minutes: int = Field(default=10, ge=MIN_INTERVAL_MINUTES, le=1440)
    blacklist: list[str] = []
    olx_use_playwright: bool = False


# ---------- Страница ----------

@app.get("/")
def index():
    """Отдаёт главную (и единственную) страницу."""
    return FileResponse(BASE_DIR / "static" / "index.html")


# ---------- API ----------

@app.get("/api/meta")
def get_meta():
    """Площадки и категории для выпадающих списков."""
    # Категории отдаём списком пар [значение, название], чтобы сохранить порядок
    return {
        key: {**info, "categories": list(info["categories"].items())}
        for key, info in PLATFORMS.items()
    }


@app.get("/api/filters")
def list_filters():
    filters = database.get_filters()
    for f in filters:
        # Для Facebook добавляем готовую ссылку поиска — её откроет кнопка
        if f["platform"] == "facebook":
            f["search_url"] = facebook.build_search_url(
                f["keywords"], f["min_price"], f["max_price"], f["city"], f["category"]
            )
    return filters


@app.post("/api/filters")
def create_filter(data: FilterIn):
    if data.platform not in PLATFORMS:
        raise HTTPException(400, "Неизвестная площадка")
    keywords = data.keywords.strip()
    if not keywords:
        raise HTTPException(400, "Введите ключевые слова")
    if data.min_price is not None and data.max_price is not None and data.min_price > data.max_price:
        raise HTTPException(400, "Минимальная цена больше максимальной")
    if data.category not in PLATFORMS[data.platform]["categories"]:
        raise HTTPException(400, "Эта категория не подходит для выбранной площадки")

    filter_id = database.add_filter(
        data.platform, keywords, data.min_price, data.max_price, data.city.strip(), data.category
    )
    return {"id": filter_id}


@app.delete("/api/filters/{filter_id}")
def remove_filter(filter_id: int):
    database.delete_filter(filter_id)
    return {"ok": True}


@app.post("/api/check")
def check_now():
    """Кнопка "Проверить сейчас". Отвечает, когда проверка закончится."""
    return monitor.check_all()


@app.get("/api/listings")
def list_listings():
    return database.get_listings()


@app.get("/api/settings")
def get_settings():
    config = load_config()
    job = scheduler.get_job(JOB_ID)
    next_run = job.next_run_time.strftime("%H:%M:%S") if job and job.next_run_time else None
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
