"use client";

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;
const GEOLOCATION_TIMEOUT_MS = 6000;

export interface StampedPhoto {
  blob: Blob;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
}

/**
 * Re-encodes a photo with a burned-in date/time + GPS-coordinate stamp
 * (à la CompanyCam) so it stays tamper-evident site proof even outside the
 * app. Geolocation is best-effort: if permission is denied or times out,
 * the photo still uploads, just without a location line.
 */
export async function stampPhoto(file: File): Promise<StampedPhoto> {
  const [position, bitmap] = await Promise.all([getPosition(), loadBitmap(file)]);

  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas недоступен в этом браузере");

  ctx.drawImage(bitmap, 0, 0, width, height);

  const lines = buildStampLines(position);
  drawStampBar(ctx, width, height, lines);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
  );
  if (!blob) throw new Error("Не удалось обработать фото");

  return {
    blob,
    lat: position?.coords.latitude ?? null,
    lng: position?.coords.longitude ?? null,
    accuracy: position?.coords.accuracy ?? null
  };
}

function getPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    const timer = setTimeout(() => resolve(null), GEOLOCATION_TIMEOUT_MS);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve(pos);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
      { enableHighAccuracy: true, timeout: GEOLOCATION_TIMEOUT_MS, maximumAge: 60000 }
    );
  });
}

async function loadBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    return createImageBitmap(file);
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    return await createImageBitmap(img);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function buildStampLines(position: GeolocationPosition | null): string[] {
  const now = new Date();
  const dateLine = now.toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  if (!position) {
    return [dateLine, "Геолокация недоступна"];
  }

  const { latitude, longitude, accuracy } = position.coords;
  const geoLine = `${latitude.toFixed(5)}, ${longitude.toFixed(5)} (±${Math.round(accuracy)} м)`;
  return [dateLine, geoLine];
}

function drawStampBar(ctx: CanvasRenderingContext2D, width: number, height: number, lines: string[]) {
  const fontSize = Math.max(14, Math.round(width * 0.026));
  const lineHeight = fontSize * 1.4;
  const padding = fontSize * 0.6;
  const barHeight = lines.length * lineHeight + padding * 2;

  const gradient = ctx.createLinearGradient(0, height - barHeight, 0, height);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(1, "rgba(0,0,0,0.65)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, height - barHeight, width, barHeight);

  ctx.font = `600 ${fontSize}px -apple-system, "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "alphabetic";
  ctx.shadowColor = "rgba(0,0,0,0.8)";
  ctx.shadowBlur = 4;

  lines.forEach((line, i) => {
    const y = height - padding - (lines.length - 1 - i) * lineHeight;
    ctx.fillText(line, padding, y);
  });

  ctx.shadowBlur = 0;
}
