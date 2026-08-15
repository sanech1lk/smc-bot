import { describe, expect, it } from "vitest";
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  detectPreferredLocale,
  isLocaleCode,
  translate,
  type Dictionary
} from "@/lib/i18n";
import { getDictionary } from "@/lib/i18n/locales";
import { ru } from "@/lib/i18n/locales/ru";

describe("detectPreferredLocale", () => {
  it("matches a plain language tag", () => {
    expect(detectPreferredLocale(["pl"])).toBe("pl");
  });

  it("matches a region-qualified tag by its primary subtag", () => {
    expect(detectPreferredLocale(["en-US"])).toBe("en");
    expect(detectPreferredLocale(["de-AT"])).toBe("de");
    expect(detectPreferredLocale(["pl-DE"])).toBe("pl");
  });

  it("is case-insensitive", () => {
    expect(detectPreferredLocale(["EN-us"])).toBe("en");
  });

  it("walks the preference list in order until a supported locale is found", () => {
    expect(detectPreferredLocale(["fr-FR", "es-ES", "uk-UA"])).toBe("uk");
  });

  it("falls back to the default when nothing matches", () => {
    expect(detectPreferredLocale(["fr-FR", "es-ES", "ja-JP"])).toBe(DEFAULT_LOCALE);
  });

  it("falls back to the default on an empty list", () => {
    expect(detectPreferredLocale([])).toBe(DEFAULT_LOCALE);
  });

  it("supports exactly the six requested languages", () => {
    const codes = SUPPORTED_LOCALES.map((l) => l.code).sort();
    expect(codes).toEqual(["cs", "de", "en", "pl", "ru", "uk"].sort());
  });
});

describe("isLocaleCode", () => {
  it("accepts every supported code", () => {
    for (const { code } of SUPPORTED_LOCALES) expect(isLocaleCode(code)).toBe(true);
  });

  it("rejects unsupported or malformed values", () => {
    expect(isLocaleCode("fr")).toBe(false);
    expect(isLocaleCode("")).toBe(false);
    expect(isLocaleCode(null)).toBe(false);
    expect(isLocaleCode(42)).toBe(false);
  });
});

describe("translate", () => {
  const dict = getDictionary("en");

  it("resolves a nested dot-path", () => {
    expect(translate(dict, ru, "common.save")).toBe("Save");
    expect(translate(dict, ru, "auth.login.submit")).toBe("Sign in");
  });

  it("interpolates {param} placeholders", () => {
    const withParam = {
      common: { greeting: "Hello, {name}!" }
    } as unknown as Dictionary;
    expect(translate(withParam, ru, "common.greeting", { name: "Igor" })).toBe("Hello, Igor!");
  });

  it("leaves an unmatched placeholder untouched rather than dropping it", () => {
    const withParam = { common: { greeting: "Hi {name}" } } as unknown as Dictionary;
    expect(translate(withParam, ru, "common.greeting", {})).toBe("Hi {name}");
  });

  it("falls back to the Russian dictionary when a key is missing", () => {
    const incomplete = { common: {} } as unknown as Dictionary;
    expect(translate(incomplete, ru, "common.save")).toBe(ru.common.save);
  });

  it("falls back to the raw path when no dictionary has the key", () => {
    expect(translate(dict, ru, "nothing.here")).toBe("nothing.here");
  });

  it("does not throw when the path walks through a non-object", () => {
    expect(translate(dict, ru, "common.save.tooDeep")).toBe("common.save.tooDeep");
  });
});

describe("dictionary parity", () => {
  const locales = SUPPORTED_LOCALES.map((l) => l.code);

  function leafPaths(obj: Record<string, unknown>, prefix = ""): string[] {
    return Object.entries(obj).flatMap(([key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      return typeof value === "string" ? [path] : leafPaths(value as Record<string, unknown>, path);
    });
  }

  const ruPaths = leafPaths(ru).sort();

  it.each(locales)("%s has exactly the same keys as ru", (code) => {
    const dict = getDictionary(code);
    const paths = leafPaths(dict as unknown as Record<string, unknown>).sort();
    expect(paths).toEqual(ruPaths);
  });

  it.each(locales)("%s has no empty translation strings", (code) => {
    const dict = getDictionary(code);
    for (const path of ruPaths) {
      const value = path.split(".").reduce<unknown>((cur, key) => (cur as Record<string, unknown>)[key], dict);
      expect(typeof value, `${code}.${path}`).toBe("string");
      expect((value as string).trim().length, `${code}.${path} is empty`).toBeGreaterThan(0);
    }
  });
});
