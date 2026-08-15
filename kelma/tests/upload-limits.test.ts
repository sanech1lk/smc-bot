import { beforeEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import {
  enforceRateLimit,
  MESSAGE_LIMIT,
  UPLOAD_LIMIT,
  __resetRateLimits
} from "@/lib/rate-limit";
import { isProcessableImage, processPhoto, processPlan } from "@/lib/image";

beforeEach(() => __resetRateLimits());

describe("лимиты на загрузку и сообщения", () => {
  it("пропускает обычную дневную нагрузку бригады", () => {
    for (let i = 0; i < UPLOAD_LIMIT.limit; i++) {
      expect(enforceRateLimit("upload-photo", "user-1", UPLOAD_LIMIT)).toBeNull();
    }
  });

  it("останавливает поток, забивающий диск", async () => {
    for (let i = 0; i < UPLOAD_LIMIT.limit; i++) {
      enforceRateLimit("upload-photo", "user-1", UPLOAD_LIMIT);
    }

    const blocked = enforceRateLimit("upload-photo", "user-1", UPLOAD_LIMIT);
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);
    expect(blocked!.headers.get("Retry-After")).toBeTruthy();
    await expect(blocked!.json()).resolves.toMatchObject({ code: "rateLimited" });
  });

  it("считает лимит по аккаунту, а не на всех сразу", () => {
    for (let i = 0; i < UPLOAD_LIMIT.limit; i++) {
      enforceRateLimit("upload-photo", "user-1", UPLOAD_LIMIT);
    }
    // Упёрся один — остальная бригада продолжает работать.
    expect(enforceRateLimit("upload-photo", "user-2", UPLOAD_LIMIT)).toBeNull();
  });

  it("разделяет лимиты разных действий одного пользователя", () => {
    for (let i = 0; i < UPLOAD_LIMIT.limit; i++) {
      enforceRateLimit("upload-photo", "user-1", UPLOAD_LIMIT);
    }
    // Исчерпав загрузку фото, человек всё ещё может писать в чат.
    expect(enforceRateLimit("message", "user-1", MESSAGE_LIMIT)).toBeNull();
  });
});

/** Builds a JPEG of the given size, noisy so it can't compress away to nothing. */
async function fakePhoto(width: number, height: number) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: "#808080",
      noise: { type: "gaussian", mean: 128, sigma: 40 }
    }
  })
    .jpeg({ quality: 95 })
    .toBuffer();
}

describe("обработка изображений при загрузке", () => {
  it(
    "ужимает фото с телефона до разумного размера",
    async () => {
      const original = await fakePhoto(4032, 3024);
      const result = await processPhoto(original, "image/jpeg");

      expect(result.processed).toBe(true);
      expect(result.buffer.byteLength).toBeLessThan(original.byteLength / 2);

      const meta = await sharp(result.buffer).metadata();
      expect(Math.max(meta.width!, meta.height!)).toBe(2048);
    },
    // Кодирование картинки в полный размер камеры — секунды CPU, не мгновение.
    30_000
  );

  it("не растягивает маленькое изображение", async () => {
    const original = await fakePhoto(800, 600);
    const result = await processPhoto(original, "image/jpeg");

    const meta = await sharp(result.buffer).metadata();
    expect(meta.width).toBe(800);
    expect(meta.height).toBe(600);
  });

  it("срезает метаданные, включая GPS из камеры", async () => {
    // Координаты хранятся в отдельной колонке, где доступом управляет
    // приложение, а не внутри файла, который можно скачать.
    const withExif = await sharp({
      create: { width: 100, height: 100, channels: 3, background: "#888" }
    })
      .withExif({ IFD0: { Copyright: "Kelma", Software: "test" } })
      .jpeg()
      .toBuffer();

    const result = await processPhoto(withExif, "image/jpeg");
    const meta = await sharp(result.buffer).metadata();
    expect(meta.exif).toBeUndefined();
  });

  it(
    "планам оставляет больше деталей, чем фото",
    async () => {
      // 3000px: выше потолка для фото (2048), но ниже потолка для плана (3500),
      // поэтому разница в лимитах видна на одном исходнике.
      const original = await fakePhoto(3000, 2250);
      const asPlan = await sharp((await processPlan(original, "image/jpeg")).buffer).metadata();
      const asPhoto = await sharp((await processPhoto(original, "image/jpeg")).buffer).metadata();

      expect(asPhoto.width).toBe(2048);
      expect(asPlan.width).toBe(3000);
    },
    30_000
  );

  it("не теряет файл, который не смог разобрать", async () => {
    // Снимок с объекта важнее аккуратности хранения: сохраняем как есть.
    const broken = Buffer.from("это не изображение");
    const result = await processPhoto(broken, "image/png");

    expect(result.processed).toBe(false);
    expect(result.buffer).toEqual(broken);
    expect(result.ext).toBe("png");
  });

  it("отличает изображения от договоров и чертежей", () => {
    expect(isProcessableImage("image/jpeg")).toBe(true);
    expect(isProcessableImage("image/heic")).toBe(true);
    // Переподписанный PDF — уже не тот документ, что подписывали.
    expect(isProcessableImage("application/pdf")).toBe(false);
    expect(
      isProcessableImage(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      )
    ).toBe(false);
  });
});
