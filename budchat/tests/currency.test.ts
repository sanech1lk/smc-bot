import { describe, expect, it } from "vitest";
import { formatAmount, formatMoney, getCurrency, isSupportedCurrency } from "@/lib/currency";

describe("currency", () => {
  it("falls back to the rouble for unknown or missing codes", () => {
    expect(getCurrency(undefined).code).toBe("RUB");
    expect(getCurrency(null).code).toBe("RUB");
    expect(getCurrency("NOPE").code).toBe("RUB");
  });

  it("recognises supported codes", () => {
    expect(isSupportedCurrency("EUR")).toBe(true);
    expect(isSupportedCurrency("PLN")).toBe(true);
    expect(isSupportedCurrency("XXX")).toBe(false);
  });

  it("appends the right symbol for each currency", () => {
    expect(formatMoney(1000, "RUB")).toContain("₽");
    expect(formatMoney(1000, "EUR")).toContain("€");
    expect(formatMoney(1000, "PLN")).toContain("zł");
  });

  it("keeps at most two decimals", () => {
    expect(formatAmount(1234.5678, "EUR")).toBe("1.234,57");
  });
});
