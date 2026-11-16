"""
Работа с базой данных SQLite (файл monitor.db создаётся сам).

Две таблицы:
  filters  — ваши фильтры отслеживания
  listings — найденные объявления. Эта же таблица служит "памятью":
             если ID объявления уже есть в таблице, повторно оно не присылается.
"""

import sqlite3
from datetime import datetime

from config import BASE_DIR

DB_PATH = BASE_DIR / "monitor.db"


def get_connection() -> sqlite3.Connection:
    """Открывает соединение с базой. Строки возвращаются как словари."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def now() -> str:
    """Текущее время в виде строки, например 2026-01-31 14:05:00."""
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def init_db() -> None:
    """Создаёт таблицы, если их ещё нет. Вызывается при старте приложения."""
    with get_connection() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS filters (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                platform     TEXT NOT NULL,          -- olx / vinted / facebook
                keywords     TEXT NOT NULL,
                min_price    REAL,
                max_price    REAL,
                city         TEXT DEFAULT '',
                category     TEXT DEFAULT '',
                created_at   TEXT NOT NULL,
                initialized  INTEGER DEFAULT 0,      -- 1 = первая проверка уже была
                last_checked TEXT,
                last_status  TEXT DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS listings (
                id          INTEGER PRIMARY KEY AUTOINCREMENT,
                filter_id   INTEGER NOT NULL REFERENCES filters(id) ON DELETE CASCADE,
                platform    TEXT NOT NULL,
                external_id TEXT NOT NULL,           -- ID объявления на самой площадке
                title       TEXT,
                price       TEXT,
                city        TEXT,
                url         TEXT,
                found_at    TEXT NOT NULL,
                is_new      INTEGER DEFAULT 1,       -- 0 = было на сайте ещё при первой проверке
                UNIQUE (platform, external_id)       -- одно объявление хранится один раз
            );
            """
        )


# ---------- Фильтры ----------

def add_filter(platform, keywords, min_price, max_price, city, category) -> int:
    with get_connection() as conn:
        cur = conn.execute(
            """INSERT INTO filters (platform, keywords, min_price, max_price, city, category, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (platform, keywords, min_price, max_price, city, category, now()),
        )
        return cur.lastrowid


def get_filters() -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM filters ORDER BY id DESC").fetchall()
        return [dict(row) for row in rows]


def delete_filter(filter_id: int) -> None:
    """Удаляет фильтр вместе с найденными по нему объявлениями."""
    with get_connection() as conn:
        conn.execute("DELETE FROM filters WHERE id = ?", (filter_id,))


def update_filter_status(filter_id: int, status: str, initialized: bool | None = None) -> None:
    """Записывает результат последней проверки фильтра."""
    with get_connection() as conn:
        conn.execute(
            "UPDATE filters SET last_checked = ?, last_status = ? WHERE id = ?",
            (now(), status, filter_id),
        )
        if initialized is not None:
            conn.execute(
                "UPDATE filters SET initialized = ? WHERE id = ?",
                (1 if initialized else 0, filter_id),
            )


# ---------- Объявления ----------

def save_listing_if_new(filter_id: int, platform: str, item: dict, is_new: bool) -> bool:
    """
    Пытается сохранить объявление.
    Возвращает True, если такого ID ещё не было (объявление действительно новое),
    и False, если мы его уже видели.
    """
    with get_connection() as conn:
        cur = conn.execute(
            """INSERT OR IGNORE INTO listings
               (filter_id, platform, external_id, title, price, city, url, found_at, is_new)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                filter_id,
                platform,
                str(item["id"]),
                item.get("title", ""),
                item.get("price", ""),
                item.get("city", ""),
                item.get("url", ""),
                now(),
                1 if is_new else 0,
            ),
        )
        # rowcount == 1 — строка вставлена; 0 — такой ID уже был (сработал IGNORE)
        return cur.rowcount == 1


def get_listings(limit: int = 300) -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT * FROM listings ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(row) for row in rows]
