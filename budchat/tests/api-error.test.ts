import { describe, expect, it } from "vitest";
import { API_ERROR_MESSAGES, apiError, type ApiErrorCode } from "@/lib/api-error";
import { apiErrorMessage } from "@/lib/i18n/api-error-message";
import { SUPPORTED_LOCALES, translate, type Dictionary } from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/locales";

const SERVER_CODES = Object.keys(API_ERROR_MESSAGES) as ApiErrorCode[];

function apiErrorKeysOf(dict: Dictionary): string[] {
  return Object.keys((dict as unknown as { apiError: Record<string, string> }).apiError);
}

/**
 * The server sends a code, the client looks it up. Nothing at compile time
 * connects the two — a new code added to a route would silently fall back to
 * the Russian sentence in every language. These tests are that connection.
 */
describe("коды ошибок API и словари", () => {
  it.each(SUPPORTED_LOCALES.map((l) => l.code))("в словаре %s есть все коды сервера", (locale) => {
    const keys = new Set(apiErrorKeysOf(getDictionary(locale)));
    const missing = SERVER_CODES.filter((code) => !keys.has(code));
    expect(missing, `нет перевода для: ${missing.join(", ")}`).toEqual([]);
  });

  it.each(SUPPORTED_LOCALES.map((l) => l.code))("в словаре %s нет лишних кодов", (locale) => {
    const serverCodes = new Set<string>(SERVER_CODES);
    const extra = apiErrorKeysOf(getDictionary(locale)).filter((key) => !serverCodes.has(key));
    expect(extra, `коды, которых нет на сервере: ${extra.join(", ")}`).toEqual([]);
  });

  it("плейсхолдеры совпадают во всех языках", () => {
    const placeholdersOf = (text: string) => (text.match(/\{(\w+)\}/g) ?? []).sort().join(",");

    for (const code of SERVER_CODES) {
      const expected = placeholdersOf(API_ERROR_MESSAGES[code]);
      for (const { code: locale } of SUPPORTED_LOCALES) {
        const dict = getDictionary(locale);
        const translated = translate(dict, dict, `apiError.${code}`);
        expect(placeholdersOf(translated), `${locale} / ${code}`).toBe(expected);
      }
    }
  });
});

describe("apiError()", () => {
  it("отдаёт код, сообщение и статус", async () => {
    const response = apiError("stageNotFound", 404);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Этап не найден",
      code: "stageNotFound"
    });
  });

  it("подставляет параметры и передаёт их клиенту", async () => {
    const response = apiError("fileTooLarge", 400, { limit: 25 });
    const body = await response.json();
    expect(body.error).toBe("Файл слишком большой (максимум 25 МБ)");
    expect(body.params).toEqual({ limit: 25 });
  });
});

describe("apiErrorMessage()", () => {
  const en = getDictionary("en");
  const ru = getDictionary("ru");
  const t = (path: string, params?: Record<string, string | number>) =>
    translate(en, ru, path, params);

  it("переводит известный код на язык интерфейса", () => {
    expect(apiErrorMessage(t, { error: "Этап не найден", code: "stageNotFound" }, "x")).toBe(
      "Stage not found"
    );
  });

  it("подставляет параметры в перевод", () => {
    const message = apiErrorMessage(
      t,
      { error: "…", code: "fileTooLarge", params: { limit: 25 } },
      "x"
    );
    expect(message).toBe("File is too large (maximum 25 MB)");
  });

  it("для незнакомого кода показывает текст сервера, а не заглушку", () => {
    // Старый клиент против нового сервера: чужой язык лучше пустоты.
    expect(apiErrorMessage(t, { error: "Что-то новое", code: "somethingNew" }, "common.save")).toBe(
      "Что-то новое"
    );
  });

  it("без тела ответа берёт запасной ключ", () => {
    expect(apiErrorMessage(t, {}, "common.save")).toBe("Save");
    expect(apiErrorMessage(t, null, "common.save")).toBe("Save");
  });
});
