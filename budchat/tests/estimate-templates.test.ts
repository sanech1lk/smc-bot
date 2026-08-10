import { describe, expect, it } from "vitest";
import { ESTIMATE_TEMPLATES, getTemplate, templatesForStage } from "@/lib/estimate-templates";
import { DEFAULT_STAGE_NAMES } from "@/lib/stages";

describe("estimate templates", () => {
  it("uses unique ids", () => {
    const ids = ESTIMATE_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has only positive quantities and prices", () => {
    for (const template of ESTIMATE_TEMPLATES) {
      expect(template.items.length).toBeGreaterThan(0);
      for (const item of template.items) {
        expect(item.quantity).toBeGreaterThan(0);
        expect(item.unitPrice).toBeGreaterThan(0);
        expect(item.unit.length).toBeGreaterThan(0);
      }
    }
  });

  it("only references stage names the app actually creates", () => {
    const known = new Set<string>(DEFAULT_STAGE_NAMES);
    for (const template of ESTIMATE_TEMPLATES) {
      for (const stage of template.stages) {
        expect(known.has(stage)).toBe(true);
      }
    }
  });

  it("puts templates matching the stage first", () => {
    const sorted = templatesForStage("Электрика");
    expect(sorted[0].stages).toContain("Электрика");
    expect(sorted).toHaveLength(ESTIMATE_TEMPLATES.length);
  });

  it("looks templates up by id", () => {
    expect(getTemplate("demolition")?.name).toBe("Демонтаж под ключ");
    expect(getTemplate("does-not-exist")).toBeUndefined();
  });
});
