"""
Работа с базой данных SQLite (файл monitor.db создаётся сам).

Две таблицы:
  filters  — ваши фильтры отслеживания
  listings — найденные объявления. Эта же таблица служит "памятью":
             если ID объявления уже есть в таблице, повторно оно не присылается.
             Из неё же считается рыночная цена и ведётся учёт покупок.
"""

import sqlite3
import statistics
from datetime import datetime, timedelta

from config import BASE_DIR
from parsers import parse_price

DB_PATH = BASE_DIR / "monitor.db"

# Дополнительные столбцы. Они добавляются сами, если база создана старой версией
# приложения — поэтому старый monitor.db удалять не нужно.
EXTRA_COLUMNS = {
    "filters": {
        "notify_mode": "TEXT DEFAULT 'deals'",  # deals = только ниже рынка, all = все новые
        "discount_pct": "REAL DEFAULT 20",      # насколько % дешевле рынка считать выгодным
        "resale_price": "REAL",                 # ваша цена продажи (если знаете сами)
        "deleted": "INTEGER DEFAULT 0",         # 1 = фильтр удалён (покупки по нему сохраняются)
    },
    "listings": {
        "price_value": "REAL",                  # цена числом (для расчётов)
        "market_price": "REAL",                 # рыночная цена на момент находки
        "discount": "REAL",                     # на сколько % дешевле рынка
        "photo": "TEXT DEFAULT ''",
        "status": "TEXT DEFAULT 'new'",         # new / favorite / bought / sold / hidden
        "buy_price": "REAL",                    # за сколько купили
        "sell_price": "REAL",                   # за сколько продали
        "note": "TEXT DEFAULT ''",
    },
}

LISTING_STATUSES = ("new", "favorite", "bought", "sold", "hidden")


def get_connection() -> sqlite3.Connection:
    """Открывает соединение с базой. Строки возвращаются как словари."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def now() -> str:
    """Текущее время в виде строки, например 2026-01-31 14:05:00."""
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def init_db() -> None:
    """Создаёт таблицы и недостающие столбцы. Вызывается при старте приложения."""
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
                filter_id   INTEGER NOT NULL,
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

        # Добавляем столбцы, которых нет (обновление старой базы)
        for table, columns in EXTRA_COLUMNS.items():
            existing = {row["name"] for row in conn.execute(f"PRAGMA table_info({table})")}
            for name, definition in columns.items():
                if name not in existing:
                    conn.execute(f"ALTER TABLE {table} ADD COLUMN {name} {definition}")

        # В старых записях цена была только текстом — достаём из неё число
        rows = conn.execute(
            "SELECT id, price FROM listings WHERE price_value IS NULL AND price != ''"
        ).fetchall()
        for row in rows:
            conn.execute(
                "UPDATE listings SET price_value = ? WHERE id = ?",
                (parse_price(row["price"]), row["id"]),
            )


# ---------- Фильтры ----------

FILTER_FIELDS = (
    "platform", "keywords", "min_price", "max_price", "city", "category",
    "notify_mode", "discount_pct", "resale_price",
)


def add_filter(data: dict) -> int:
    values = [data.get(name) for name in FILTER_FIELDS]
    with get_connection() as conn:
        cur = conn.execute(
            f"""INSERT INTO filters ({", ".join(FILTER_FIELDS)}, created_at)
                VALUES ({", ".join("?" * len(FILTER_FIELDS))}, ?)""",
            (*values, now()),
        )
        return cur.lastrowid


def update_filter(filter_id: int, data: dict) -> None:
    """Меняет условия фильтра. Если поменялся сам поиск — начинаем его "с нуля"."""
    old = get_filter(filter_id)
    if old is None:
        return
    search_changed = any(
        old[name] != data.get(name)
        for name in ("platform", "keywords", "min_price", "max_price", "city", "category")
    )
    assignments = ", ".join(f"{name} = ?" for name in FILTER_FIELDS)
    with get_connection() as conn:
        conn.execute(
            f"UPDATE filters SET {assignments} WHERE id = ?",
            (*[data.get(name) for name in FILTER_FIELDS], filter_id),
        )
        if search_changed:
            # Следующая проверка снова будет "первой": запомнит текущие
            # объявления без уведомлений, чтобы не прислать сразу 40 штук
            conn.execute(
                "UPDATE filters SET initialized = 0, last_status = '' WHERE id = ?",
                (filter_id,),
            )


def get_filter(filter_id: int) -> dict | None:
    with get_connection() as conn:
        row = conn.execute(
            "SELECT * FROM filters WHERE id = ? AND deleted = 0", (filter_id,)
        ).fetchone()
        return dict(row) if row else None


def get_filters() -> list[dict]:
    with get_connection() as conn:
        rows = conn.execute("SELECT * FROM filters WHERE deleted = 0 ORDER BY id DESC").fetchall()
        return [dict(row) for row in rows]


def delete_filter(filter_id: int) -> None:
    """
    Удаляет фильтр и найденные по нему объявления.
    Купленные и проданные вещи остаются — это ваш учёт прибыли.
    """
    with get_connection() as conn:
        conn.execute("UPDATE filters SET deleted = 1 WHERE id = ?", (filter_id,))
        conn.execute(
            "DELETE FROM listings WHERE filter_id = ? AND status NOT IN ('bought', 'sold')",
            (filter_id,),
        )


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


# ---------- Рыночная цена ----------

def market_stats(filter_id: int, days: int = 30) -> tuple[float | None, int]:
    """
    Рыночная цена = медиана цен всех объявлений этого фильтра за последние `days` дней.
    Медиана — "серединная" цена: половина объявлений дешевле, половина дороже.
    В отличие от среднего, её не портят единичные объявления за 1 zł или за 99 999 zł.
    Возвращает (медиана, сколько объявлений учтено).
    """
    since = (datetime.now() - timedelta(days=days)).strftime("%Y-%m-%d %H:%M:%S")
    with get_connection() as conn:
        rows = conn.execute(
            """SELECT price_value FROM listings
               WHERE filter_id = ? AND price_value > 0 AND found_at >= ?""",
            (filter_id, since),
        ).fetchall()
    prices = [row["price_value"] for row in rows]
    if not prices:
        return None, 0
    return statistics.median(prices), len(prices)


# ---------- Объявления ----------

def save_listing_if_new(filter_id: int, platform: str, item: dict, is_new: bool,
                        market_price: float | None = None, discount: float | None = None) -> bool:
    """
    Пытается сохранить объявление.
    Возвращает True, если такого ID ещё не было (объявление действительно новое),
    и False, если мы его уже видели.
    """
    with get_connection() as conn:
        cur = conn.execute(
            """INSERT OR IGNORE INTO listings
               (filter_id, platform, external_id, title, price, price_value, city, url,
                photo, found_at, is_new, market_price, discount)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                filter_id,
                platform,
                str(item["id"]),
                item.get("title", ""),
                item.get("price", ""),
                item.get("price_value"),
                item.get("city", ""),
                item.get("url", ""),
                item.get("photo", ""),
                now(),
                1 if is_new else 0,
                market_price,
                discount,
            ),
        )
        # rowcount == 1 — строка вставлена; 0 — такой ID уже был (сработал IGNORE)
        return cur.rowcount == 1


def get_listings(limit: int = 500) -> list[dict]:
    """
    Последние `limit` объявлений (кроме скрытых) + все покупки и продажи,
    даже очень старые — чтобы учёт прибыли был полным.
    """
    with get_connection() as conn:
        rows = conn.execute(
            """SELECT l.*, f.keywords AS filter_keywords
               FROM listings l LEFT JOIN filters f ON f.id = l.filter_id
               WHERE l.status IN ('bought', 'sold')
                  OR l.id IN (SELECT id FROM listings WHERE status != 'hidden'
                              ORDER BY id DESC LIMIT ?)
               ORDER BY l.id DESC""",
            (limit,),
        ).fetchall()
        return [dict(row) for row in rows]


def update_listing(listing_id: int, fields: dict) -> None:
    """Меняет статус, цены покупки/продажи или заметку объявления."""
    allowed = {k: v for k, v in fields.items() if k in ("status", "buy_price", "sell_price", "note")}
    if not allowed:
        return
    assignments = ", ".join(f"{name} = ?" for name in allowed)
    with get_connection() as conn:
        conn.execute(
            f"UPDATE listings SET {assignments} WHERE id = ?",
            (*allowed.values(), listing_id),
        )
