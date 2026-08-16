import { describe, expect, it } from "vitest";
import { priceCart } from "../src/cart.js";
import {
  isOpen,
  localHour,
  normalizePhone,
  renderKitchenTicket,
  validateOrder,
} from "../src/order.js";
import { CLOSED_TIME, OPEN_TIME, emptyCustomer, makeMenu, stubCreateOrder } from "./helpers.js";

const menu = makeMenu();

describe("телефон", () => {
  it("приводит польские номера к одному виду", () => {
    expect(normalizePhone("123456789")).toBe("+48123456789");
    expect(normalizePhone("123 456 789")).toBe("+48123456789");
    expect(normalizePhone("123-456-789")).toBe("+48123456789");
    expect(normalizePhone("+48 123 456 789")).toBe("+48123456789");
    expect(normalizePhone("0048123456789")).toBe("+48123456789");
  });

  it("пропускает иностранные с кодом страны", () => {
    expect(normalizePhone("+380671234567")).toBe("+380671234567");
  });

  it("не принимает то, что телефоном не является", () => {
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("позвоните мне")).toBeNull();
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("1234567890123456789")).toBeNull();
  });
});

describe("часы работы", () => {
  it("считает час по времени пиццерии, а не сервера", () => {
    // 12:00 UTC в мае — это 14:00 в Варшаве (летнее время)
    expect(localHour(OPEN_TIME)).toBe(14);
  });

  it("открыто днём и закрыто ночью", () => {
    expect(isOpen(OPEN_TIME)).toBe(true);
    expect(isOpen(CLOSED_TIME)).toBe(false);
  });
});

describe("проверка заказа", () => {
  const fullCart = priceCart([{ itemId: "margherita-32", quantity: 1 }], menu, "pickup");

  it("не пропускает пустую корзину", () => {
    const problems = validateOrder(priceCart([], menu, "pickup"), emptyCustomer(), OPEN_TIME);
    expect(problems.map((p) => p.field)).toContain("cart");
  });

  it("требует имя, телефон и способ получения", () => {
    const problems = validateOrder(fullCart, emptyCustomer(), OPEN_TIME);
    const fields = problems.map((p) => p.field);
    expect(fields).toContain("customer_name");
    expect(fields).toContain("phone");
    expect(fields).toContain("delivery_mode");
  });

  it("ловит выдуманный телефон", () => {
    const problems = validateOrder(
      fullCart,
      { ...emptyCustomer(), customerName: "Ola", phone: "не помню", deliveryMode: "pickup" },
      OPEN_TIME
    );
    expect(problems.map((p) => p.field)).toContain("phone");
  });

  it("для доставки требует адрес и минимальную сумму", () => {
    const cart = priceCart([{ itemId: "cola-05", quantity: 1 }], menu, "delivery");
    const problems = validateOrder(
      cart,
      { ...emptyCustomer(), customerName: "Ola", phone: "123456789", deliveryMode: "delivery" },
      OPEN_TIME
    );
    const messages = problems.map((p) => p.message).join(" ");
    expect(messages).toContain("адрес");
    expect(messages).toContain("Минимальная сумма");
  });

  it("самовывоза минимальная сумма не касается", () => {
    const cart = priceCart([{ itemId: "cola-05", quantity: 1 }], menu, "pickup");
    const problems = validateOrder(
      cart,
      { ...emptyCustomer(), customerName: "Ola", phone: "123456789", deliveryMode: "pickup" },
      OPEN_TIME
    );
    expect(problems).toEqual([]);
  });

  it("не принимает заказ в нерабочее время", () => {
    const problems = validateOrder(
      fullCart,
      { ...emptyCustomer(), customerName: "Ola", phone: "123456789", deliveryMode: "pickup" },
      CLOSED_TIME
    );
    expect(problems.map((p) => p.field)).toContain("hours");
  });

  it("не даёт заказать снятое с меню", () => {
    const cart = priceCart([{ itemId: "исчезло", quantity: 1 }], menu, "pickup");
    const problems = validateOrder(
      cart,
      { ...emptyCustomer(), customerName: "Ola", phone: "123456789", deliveryMode: "pickup" },
      OPEN_TIME
    );
    expect(problems.map((p) => p.message).join(" ")).toContain("больше нет в меню");
  });
});

describe("талон на кухню", () => {
  it("содержит всё, что нужно повару и курьеру", async () => {
    const cart = priceCart(
      [
        { itemId: "margherita-32", quantity: 2 },
        { itemId: "cola-05", quantity: 1 },
      ],
      menu,
      "delivery"
    );
    const order = await stubCreateOrder()({
      chatId: "42",
      cart,
      customer: {
        customerName: "Ola",
        phone: "+48123456789",
        address: "Długa 12/5",
        deliveryMode: "delivery",
        note: "bez cebuli",
      },
    });

    const ticket = renderKitchenTicket(order);
    expect(ticket).toContain("ДОСТАВКА");
    expect(ticket).toContain("Margherita 32 cm × 2");
    expect(ticket).toContain("Coca-Cola 0,5 l × 1");
    expect(ticket).toContain("Długa 12/5");
    expect(ticket).toContain("+48123456789");
    expect(ticket).toContain("bez cebuli");
    // 2×32,00 + 9,00 = 73,00 — выше порога бесплатной доставки (60,00)
    expect(ticket).toContain("К оплате при получении: 73,00 zł");
    expect(ticket).not.toContain("Доставка:");
  });
});
