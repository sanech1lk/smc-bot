import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  clampMinuteOfDay,
  clampVolume,
  formatMinuteOfDay,
  isQuietAt,
  isValidSoundName,
  isValidTextScale,
  sanitizeSettingsPatch,
  shouldPlayMessageSound,
  shouldVibrateForMessage
} from "@/lib/settings";

describe("clampVolume", () => {
  it("clamps to 0..100", () => {
    expect(clampVolume(-10)).toBe(0);
    expect(clampVolume(150)).toBe(100);
    expect(clampVolume(42)).toBe(42);
  });

  it("falls back to the default on garbage input", () => {
    expect(clampVolume(NaN)).toBe(DEFAULT_SETTINGS.soundVolume);
  });
});

describe("clampMinuteOfDay", () => {
  it("wraps values outside a single day", () => {
    expect(clampMinuteOfDay(1440)).toBe(0);
    expect(clampMinuteOfDay(1500)).toBe(60);
    expect(clampMinuteOfDay(-30)).toBe(1410);
  });

  it("passes through an in-range value", () => {
    expect(clampMinuteOfDay(600)).toBe(600);
  });
});

describe("formatMinuteOfDay", () => {
  it("formats as zero-padded HH:MM", () => {
    expect(formatMinuteOfDay(0)).toBe("00:00");
    expect(formatMinuteOfDay(90)).toBe("01:30");
    expect(formatMinuteOfDay(22 * 60)).toBe("22:00");
  });
});

describe("isQuietAt", () => {
  const base = { quietEnabled: true, quietFrom: 22 * 60, quietTo: 7 * 60 };

  it("is false whenever quiet hours are disabled", () => {
    expect(isQuietAt({ ...base, quietEnabled: false }, new Date(2026, 0, 1, 23, 0))).toBe(false);
  });

  it("handles a window that wraps past midnight", () => {
    expect(isQuietAt(base, new Date(2026, 0, 1, 23, 0))).toBe(true); // 23:00
    expect(isQuietAt(base, new Date(2026, 0, 1, 3, 0))).toBe(true); // 03:00
    expect(isQuietAt(base, new Date(2026, 0, 1, 12, 0))).toBe(false); // noon
  });

  it("is inclusive of the start minute and exclusive of the end minute", () => {
    expect(isQuietAt(base, new Date(2026, 0, 1, 22, 0))).toBe(true);
    expect(isQuietAt(base, new Date(2026, 0, 1, 7, 0))).toBe(false);
  });

  it("handles a same-day window that does not wrap midnight", () => {
    const daytime = { quietEnabled: true, quietFrom: 13 * 60, quietTo: 14 * 60 };
    expect(isQuietAt(daytime, new Date(2026, 0, 1, 13, 30))).toBe(true);
    expect(isQuietAt(daytime, new Date(2026, 0, 1, 15, 0))).toBe(false);
  });

  it("treats an empty window (from === to) as never quiet, not always quiet", () => {
    const empty = { quietEnabled: true, quietFrom: 600, quietTo: 600 };
    expect(isQuietAt(empty, new Date(2026, 0, 1, 10, 0))).toBe(false);
    expect(isQuietAt(empty, new Date(2026, 0, 1, 23, 0))).toBe(false);
  });
});

describe("shouldPlayMessageSound", () => {
  const daytime = new Date(2026, 0, 1, 12, 0);

  it("requires soundEnabled", () => {
    expect(
      shouldPlayMessageSound({ ...DEFAULT_SETTINGS, soundEnabled: false }, { chatIsOpen: false, at: daytime })
    ).toBe(false);
  });

  it("is false when the chosen sound is 'none'", () => {
    expect(
      shouldPlayMessageSound({ ...DEFAULT_SETTINGS, soundName: "none" }, { chatIsOpen: false, at: daytime })
    ).toBe(false);
  });

  it("is suppressed while the chat is open unless soundInOpenChat is set", () => {
    expect(shouldPlayMessageSound(DEFAULT_SETTINGS, { chatIsOpen: true, at: daytime })).toBe(false);
    expect(
      shouldPlayMessageSound(
        { ...DEFAULT_SETTINGS, soundInOpenChat: true },
        { chatIsOpen: true, at: daytime }
      )
    ).toBe(true);
  });

  it("is suppressed during quiet hours", () => {
    const night = new Date(2026, 0, 1, 23, 0);
    expect(
      shouldPlayMessageSound(
        { ...DEFAULT_SETTINGS, quietEnabled: true },
        { chatIsOpen: false, at: night }
      )
    ).toBe(false);
  });

  it("plays by default for a closed chat outside quiet hours", () => {
    expect(shouldPlayMessageSound(DEFAULT_SETTINGS, { chatIsOpen: false, at: daytime })).toBe(true);
  });
});

describe("shouldVibrateForMessage", () => {
  const daytime = new Date(2026, 0, 1, 12, 0);

  it("is independent of the sound toggle", () => {
    const soundOffVibrateOn = { ...DEFAULT_SETTINGS, soundEnabled: false, vibrationEnabled: true };
    expect(shouldVibrateForMessage(soundOffVibrateOn, { chatIsOpen: false, at: daytime })).toBe(true);
  });

  it("still respects quiet hours", () => {
    const night = new Date(2026, 0, 1, 23, 0);
    expect(
      shouldVibrateForMessage({ ...DEFAULT_SETTINGS, quietEnabled: true }, { chatIsOpen: false, at: night })
    ).toBe(false);
  });

  it("requires vibrationEnabled", () => {
    expect(
      shouldVibrateForMessage(
        { ...DEFAULT_SETTINGS, vibrationEnabled: false },
        { chatIsOpen: false, at: daytime }
      )
    ).toBe(false);
  });
});

describe("isValidSoundName / isValidTextScale", () => {
  it("accepts only known sound ids", () => {
    expect(isValidSoundName("ping")).toBe(true);
    expect(isValidSoundName("none")).toBe(true);
    expect(isValidSoundName("dubstep-airhorn")).toBe(false);
    expect(isValidSoundName(42)).toBe(false);
  });

  it("accepts only the three defined text scales", () => {
    expect(isValidTextScale(100)).toBe(true);
    expect(isValidTextScale(130)).toBe(true);
    expect(isValidTextScale(200)).toBe(false);
  });
});

describe("sanitizeSettingsPatch", () => {
  it("keeps only known, valid fields", () => {
    const patch = sanitizeSettingsPatch({
      soundEnabled: false,
      soundName: "bell",
      soundVolume: 250, // clamped, not rejected
      textScale: 999, // invalid, dropped
      quietFrom: -60, // wrapped, not rejected
      notThing: "ignored",
      adsPersonalized: true
    });

    expect(patch).toEqual({
      soundEnabled: false,
      soundName: "bell",
      soundVolume: 100,
      quietFrom: 1380,
      adsPersonalized: true
    });
  });

  it("returns an empty patch for non-object input", () => {
    expect(sanitizeSettingsPatch(null)).toEqual({});
    expect(sanitizeSettingsPatch("nope")).toEqual({});
    expect(sanitizeSettingsPatch(42)).toEqual({});
  });

  it("rejects a sound name that isn't one of the known options", () => {
    expect(sanitizeSettingsPatch({ soundName: "airhorn" })).toEqual({});
  });
});
