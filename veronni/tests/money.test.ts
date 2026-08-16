import { describe, expect, it } from "vitest";
import { formatPrice, parsePrice, sumLines } from "../src/money.js";

describe("деньги", () => {
  it("разбирает цену с запятой и точкой", () => {
    expect(parsePrice("19,90")).toBe(1990);
    expect(parsePrice("19.90")).toBe(1990);
    expect(parsePrice("32")).toBe(3200);
    expect(parsePrice("0,5")).toBe(50);
  });

  it("отказывается от мусора", () => {
    expect(() => parsePrice("дорого")).toThrow();
    expect(() => parsePrice("19,999")).toThrow();
    expect(() => parsePrice("")).toThrow();
  });

  it("печатает по-польски, с запятой и двумя знаками", () => {
    expect(formatPrice(1990)).toBe("19,90 zł");
    expect(formatPrice(3200)).toBe("32,00 zł");
    expect(formatPrice(5)).toBe("0,05 zł");
    expect(formatPrice(0)).toBe("0,00 zł");
    expect(formatPrice(-900)).toBe("-9,00 zł");
  });

  it("складывает без потерь на плавающей точке", () => {
    // 10,10 + 20,20 в double дало бы 30,299999999999997
    const total = sumLines([
      { priceGr: 1010, quantity: 1 },
      { priceGr: 2020, quantity: 1 },
    ]);
    expect(total).toBe(3030);
    expect(formatPrice(total)).toBe("30,30 zł");
  });

  it("умножает на количество", () => {
    expect(sumLines([{ priceGr: 3200, quantity: 3 }])).toBe(9600);
    expect(sumLines([])).toBe(0);
  });

  it("не принимает дробные гроши и отрицательное количество", () => {
    expect(() => sumLines([{ priceGr: 19.9, quantity: 1 }])).toThrow();
    expect(() => sumLines([{ priceGr: 1990, quantity: -1 }])).toThrow();
  });
});
