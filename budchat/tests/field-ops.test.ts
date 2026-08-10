import { describe, expect, it } from "vitest";
import { parseAnnotations } from "@/lib/annotations";
import { shiftMinutes, formatDuration, materialOverrun } from "@/lib/field-ops";

describe("shift duration", () => {
  it("counts whole minutes between start and end", () => {
    const start = new Date("2026-08-10T08:00:00Z");
    const end = new Date("2026-08-10T16:30:00Z");
    expect(shiftMinutes(start, end)).toBe(510);
  });

  it("treats an unfinished shift as null rather than zero", () => {
    expect(shiftMinutes(new Date(), null)).toBeNull();
  });

  it("never returns a negative duration for clock skew", () => {
    const start = new Date("2026-08-10T10:00:00Z");
    const end = new Date("2026-08-10T09:59:00Z");
    expect(shiftMinutes(start, end)).toBe(0);
  });
});

describe("formatDuration", () => {
  it("shows only minutes under an hour", () => {
    expect(formatDuration(45)).toBe("45 мин");
  });

  it("shows hours and minutes above an hour", () => {
    expect(formatDuration(510)).toBe("8 ч 30 мин");
  });

  it("keeps whole hours readable", () => {
    expect(formatDuration(120)).toBe("2 ч 0 мин");
  });
});

describe("materialOverrun", () => {
  it("flags consumption above plan", () => {
    expect(materialOverrun({ quantityPlanned: 30, quantityUsed: 34 })).toBe(true);
  });

  it("does not flag consumption within plan", () => {
    expect(materialOverrun({ quantityPlanned: 30, quantityUsed: 30 })).toBe(false);
  });

  it("does not flag when nothing was planned yet", () => {
    expect(materialOverrun({ quantityPlanned: 0, quantityUsed: 5 })).toBe(false);
  });
});

describe("photo annotations", () => {
  it("returns an empty list for missing or blank markup", () => {
    expect(parseAnnotations(null)).toEqual([]);
    expect(parseAnnotations(undefined)).toEqual([]);
    expect(parseAnnotations("")).toEqual([]);
  });

  it("never throws on corrupted markup", () => {
    expect(parseAnnotations("{not json")).toEqual([]);
    expect(parseAnnotations('{"a":1}')).toEqual([]);
  });

  it("round-trips valid strokes", () => {
    const strokes = [{ color: "#ef4444", width: 0.008, points: [{ x: 0.1, y: 0.2 }] }];
    expect(parseAnnotations(JSON.stringify(strokes))).toEqual(strokes);
  });
});
