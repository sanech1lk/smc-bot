import { describe, expect, it } from "vitest";
import {
  MAX_QUANTITY_PER_LINE,
  addToCart,
  deliveryFee,
  describeCart,
  parseCart,
  priceCart,
  removeFromCart,
} from "../src/cart.js";
import { makeMenu } from "./helpers.js";

const menu = makeMenu();

describe("корзина", () => {
  it("копит одинаковые позиции в одну строку", () => {
    let cart = addToCart([], "margherita-32", 1);
    cart = addToCart(cart, "margherita-32", 1);
    expect(cart).toEqual([{ itemId: "margherita-32", quantity: 2 }]);
  });

  it("упирается в потолок количества", () => {
    const cart = addToCart([], "margherita-32", 999);
    expect(cart[0]?.quantity).toBe(MAX_QUANTITY_PER_LINE);
  });

  it("убирает частично и целиком", () => {
    const cart = addToCart([], "cola-05", 3);
    expect(removeFromCart(cart, "cola-05", 1)).toEqual([{ itemId: "cola-05", quantity: 2 }]);
    expect(removeFromCart(cart, "cola-05")).toEqual([]);
    // Убрать больше, чем есть, — это ноль, а не отрицательное количество.
    expect(removeFromCart(cart, "cola-05", 10)).toEqual([]);
  });

  it("считает сумму по ценам из меню, а не по тому, что передали", () => {
    const cart = [
      { itemId: "margherita-32", quantity: 2 },
      { itemId: "cola-05", quantity: 1 },
    ];
    const priced = priceCart(cart, menu, "pickup");
    expect(priced.subtotalGr).toBe(3200 * 2 + 900);
    expect(priced.deliveryGr).toBe(0);
    expect(priced.totalGr).toBe(7300);
  });

  it("помечает снятые с продажи позиции вместо того, чтобы считать их бесплатно", () => {
    const priced = priceCart([{ itemId: "снято-с-меню", quantity: 1 }], menu, "pickup");
    expect(priced.lines).toHaveLength(0);
    expect(priced.unavailable).toEqual(["снято-с-меню"]);
    expect(priced.totalGr).toBe(0);
  });

  it("берёт за доставку по порогу и только при доставке", () => {
    expect(deliveryFee(3000, "delivery")).toBe(900);
    expect(deliveryFee(5999, "delivery")).toBe(900);
    expect(deliveryFee(6000, "delivery")).toBe(0);
    expect(deliveryFee(3000, "pickup")).toBe(0);
    expect(deliveryFee(3000, null)).toBe(0);
    expect(deliveryFee(0, "delivery")).toBe(0);
  });

  it("в итог доставки включает её стоимость", () => {
    const priced = priceCart([{ itemId: "margherita-32", quantity: 1 }], menu, "delivery");
    expect(priced.subtotalGr).toBe(3200);
    expect(priced.deliveryGr).toBe(900);
    expect(priced.totalGr).toBe(4100);
  });

  it("описывает корзину человеческим текстом", () => {
    const priced = priceCart([{ itemId: "margherita-32", quantity: 2 }], menu, "delivery");
    const text = describeCart(priced, "delivery");
    expect(text).toContain("Margherita 32 cm × 2 = 64,00 zł");
    expect(text).toContain("Доставка: бесплатно");
    expect(text).toContain("Итого: 64,00 zł");
  });

  it("переживает битый JSON в базе", () => {
    expect(parseCart("не json")).toEqual([]);
    expect(parseCart('{"itemId":"x"}')).toEqual([]);
    expect(parseCart('[{"itemId":"x","quantity":0},{"itemId":"y","quantity":2}]')).toEqual([
      { itemId: "y", quantity: 2 },
    ]);
  });
});
