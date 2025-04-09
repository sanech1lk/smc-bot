
import os
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Rectangle
from binance.client import Client
from dotenv import load_dotenv
import telebot

load_dotenv()
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
BINANCE_API_KEY = os.getenv("BINANCE_API_KEY")
BINANCE_API_SECRET = os.getenv("BINANCE_API_SECRET")

bot = telebot.TeleBot(TELEGRAM_TOKEN)
client = Client(api_key=BINANCE_API_KEY, api_secret=BINANCE_API_SECRET)

def detect_ob_zones(df):
    zones = []
    for i in range(3, len(df)):
        if df['close'].iloc[i-1] < df['open'].iloc[i-1] and df['high'].iloc[i-1] > df['high'].iloc[i-2]:
            zones.append((i-1, df['open'].iloc[i-1], df['high'].iloc[i-1]))
        elif df['close'].iloc[i-1] > df['open'].iloc[i-1] and df['low'].iloc[i-1] < df['low'].iloc[i-2]:
            zones.append((i-1, df['low'].iloc[i-1], df['open'].iloc[i-1]))
    return zones[-2:]  # только 2 последних

def detect_imbalances(df):
    imbalances = []
    for i in range(2, len(df)):
        if df['low'].iloc[i] > df['high'].iloc[i-2]:
            imbalances.append((i, df['high'].iloc[i-2], df['low'].iloc[i]))
        elif df['high'].iloc[i] < df['low'].iloc[i-2]:
            imbalances.append((i, df['high'].iloc[i], df['low'].iloc[i-2]))
    imbalances.sort(key=lambda x: abs(x[2] - x[1]), reverse=True)
    return imbalances[:2]  # самые широкие

def detect_bos(df):
    bos = []
    for i in range(2, len(df)):
        if df['low'].iloc[i] < df['low'].iloc[i-2]:
            bos.append(('BoS↓', i, df['low'].iloc[i]))
        elif df['high'].iloc[i] > df['high'].iloc[i-2]:
            bos.append(('BoS↑', i, df['high'].iloc[i]))
    return bos[-2:]  # только 2 последних

def plot_smc_chart(symbol="BTCUSDT", interval="15m"):
    klines = client.get_klines(symbol=symbol, interval=interval, limit=150)
    df = pd.DataFrame(klines, columns=[
        'timestamp', 'open', 'high', 'low', 'close', 'volume',
        'close_time', 'quote_asset_volume', 'num_trades',
        'taker_buy_base_vol', 'taker_buy_quote_vol', 'ignore'
    ])
    df = df.astype(float)
    df['timestamp'] = pd.to_datetime(df['timestamp'], unit='ms')
    df.set_index('timestamp', inplace=True)

    fig, ax = plt.subplots(figsize=(14, 6), facecolor='white')
    ax.set_facecolor('white')

    for i in range(len(df)):
        o, c, h, l = df['open'].iloc[i], df['close'].iloc[i], df['high'].iloc[i], df['low'].iloc[i]
        color = '#2ca02c' if c >= o else '#d62728'
        ax.plot([i, i], [l, h], color='black', linewidth=0.5)
        ax.add_patch(plt.Rectangle((i - 0.25, min(o, c)), 0.5, abs(o - c), color=color, alpha=0.9))

    for i, y1, y2 in detect_ob_zones(df):
        ax.add_patch(Rectangle((i - 1.5, y1), 6, y2 - y1, color='red' if y2 > y1 else 'blue', alpha=0.2))
        ax.text(i, y2, 'OB', fontsize=9, color='black')

    for i, y1, y2 in detect_imbalances(df):
        ax.add_patch(Rectangle((i - 1.5, y1), 3, y2 - y1, color='orange', alpha=0.2))
        ax.text(i, y2, 'FVG', fontsize=8, color='orange')

    for label, i, lvl in detect_bos(df):
        ax.annotate('', xy=(i, lvl), xytext=(i, lvl + 70 if '↑' in label else lvl - 70),
                    arrowprops=dict(arrowstyle='-|>', color='green' if '↑' in label else 'red', lw=1.4))
        ax.text(i, lvl, label, fontsize=9, color='green' if '↑' in label else 'red')

    ax.set_title(f"{symbol} | {interval} | SMC v2.7 Clean", fontsize=13)
    ax.set_xticks([])
    ax.set_yticks([])
    plt.tight_layout()

    filepath = f"{symbol}_{interval}_v27_clean.png"
    plt.savefig(filepath)
    plt.close()
    return filepath

@bot.message_handler(commands=['start'])
def start(message):
    bot.reply_to(message, "Привет! Отправь: /signal BTCUSDT 15m")

@bot.message_handler(commands=['signal'])
def signal(message):
    try:
        _, symbol, interval = message.text.strip().split()
    except:
        bot.reply_to(message, "❗ Формат: /signal BTCUSDT 15m")
        return

    bot.send_message(message.chat.id, f"Анализирую {symbol} на таймфрейме {interval}...")

    try:
        chart_path = plot_smc_chart(symbol, interval)
        with open(chart_path, 'rb') as photo:
            bot.send_photo(message.chat.id, photo)
        os.remove(chart_path)
    except Exception as e:
        bot.send_message(message.chat.id, f"Ошибка: {e}")

bot.polling()
