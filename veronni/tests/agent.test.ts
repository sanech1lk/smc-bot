import { describe, expect, it } from "vitest";
import type Anthropic from "@anthropic-ai/sdk";
import { MAX_TOOL_ROUNDS, runAgent, trimHistory } from "../src/agent/run.js";
import type { OrderWithItems } from "../src/order.js";
import {
  OPEN_TIME,
  emptyCustomer,
  makeMenuItems,
  scriptedLlm,
  stubCreateOrder,
  textMessage,
  toolMessage,
} from "./helpers.js";

const menuItems = makeMenuItems();

function baseInput(overrides: Partial<Parameters<typeof runAgent>[0]> = {}) {
  return {
    chatId: "test",
    userText: "привет",
    history: [] as Anthropic.MessageParam[],
    cart: [],
    customer: emptyCustomer(),
    menuItems,
    now: OPEN_TIME,
    ...overrides,
  };
}

describe("цикл агента", () => {
  it("возвращает простой ответ без инструментов", async () => {
    const llm = scriptedLlm([textMessage("Привет! Что будете заказывать?")]);
    const result = await runAgent(baseInput(), llm.call, { createOrder: stubCreateOrder() });

    expect(result.reply).toBe("Привет! Что будете заказывать?");
    expect(result.order).toBeNull();
    expect(llm.used()).toBe(1);
  });

  it("кладёт меню и инструкции в кэшируемый блок, а состояние — отдельно", async () => {
    const llm = scriptedLlm([textMessage("ок")]);
    await runAgent(baseInput(), llm.call, { createOrder: stubCreateOrder() });

    const system = llm.calls[0]?.params.system as Anthropic.TextBlockParam[];
    expect(system).toHaveLength(2);
    expect(system[0]?.cache_control).toEqual({ type: "ephemeral" });
    expect(system[0]?.text).toContain("id=margherita-32");
    // Изменчивое — время и корзина — во втором блоке, иначе кэш ломался бы
    // на каждом сообщении.
    expect(system[1]?.cache_control).toBeUndefined();
    expect(system[1]?.text).toContain("Корзина:");
  });

  it("наполняет корзину и отдаёт модели суммы, посчитанные кодом", async () => {
    const llm = scriptedLlm([
      toolMessage([
        {
          name: "add_to_cart",
          input: {
            items: [
              { item_id: "margherita-32", quantity: 2 },
              { item_id: "cola-05", quantity: 1 },
            ],
          },
        },
      ]),
      textMessage("Записал: две Margherita 32 и кола, 73,00 zł."),
    ]);

    const result = await runAgent(
      baseInput({ userText: "две маргариты 32 и колу" }),
      llm.call,
      { createOrder: stubCreateOrder() }
    );

    expect(result.cart).toEqual([
      { itemId: "margherita-32", quantity: 2 },
      { itemId: "cola-05", quantity: 1 },
    ]);
    // Модель получила готовые числа, а не считала сама
    expect(llm.calls[1]?.toolResults[0]).toContain("Сумма: 73,00 zł");
  });

  it("не добавляет выдуманные позиции", async () => {
    const llm = scriptedLlm([
      toolMessage([
        { name: "add_to_cart", input: { items: [{ item_id: "pizza-с-ананасом-и-чем-угодно", quantity: 1 }] } },
      ]),
      textMessage("Такой у нас нет."),
    ]);

    const result = await runAgent(baseInput(), llm.call, { createOrder: stubCreateOrder() });

    expect(result.cart).toEqual([]);
    expect(llm.calls[1]?.toolResults[0]).toContain("В меню нет таких id");
  });

  it("отказывается оформлять заказ без данных и объясняет чего не хватает", async () => {
    const sink: { last?: OrderWithItems } = {};
    const llm = scriptedLlm([
      toolMessage([
        { name: "add_to_cart", input: { items: [{ item_id: "margherita-32", quantity: 1 }] } },
      ]),
      toolMessage([{ name: "place_order", input: {} }]),
      textMessage("Подскажите, пожалуйста, имя и телефон."),
    ]);

    const result = await runAgent(baseInput(), llm.call, { createOrder: stubCreateOrder(sink) });

    expect(sink.last).toBeUndefined();
    expect(result.order).toBeNull();
    const refusal = llm.calls[2]?.toolResults[0] ?? "";
    expect(refusal).toContain("Заказ НЕ оформлен");
    expect(refusal).toContain("имя");
    expect(refusal).toContain("телефон");
  });

  it("оформляет заказ, когда всё собрано", async () => {
    const sink: { last?: OrderWithItems } = {};
    const llm = scriptedLlm([
      toolMessage([
        { name: "add_to_cart", input: { items: [{ item_id: "margherita-32", quantity: 2 }] } },
      ]),
      toolMessage([
        {
          name: "set_order_details",
          input: {
            customer_name: "Ola",
            phone: "123 456 789",
            delivery_mode: "delivery",
            address: "Długa 12/5",
          },
        },
      ]),
      toolMessage([{ name: "place_order", input: {} }]),
      textMessage("Готово, заказ принят."),
    ]);

    const result = await runAgent(baseInput(), llm.call, { createOrder: stubCreateOrder(sink) });

    expect(result.order).not.toBeNull();
    expect(sink.last?.customerName).toBe("Ola");
    // Телефон нормализован кодом, а не переписан моделью
    expect(sink.last?.phone).toBe("+48123456789");
    expect(sink.last?.subtotalGr).toBe(6400);
    expect(sink.last?.deliveryGr).toBe(0);
    expect(sink.last?.totalGr).toBe(6400);
    // Корзина очищена: повторное place_order не создаст дубль
    expect(result.cart).toEqual([]);
  });

  it("не оформляет второй заказ в том же ходе", async () => {
    const sink: { last?: OrderWithItems } = {};
    const llm = scriptedLlm([
      toolMessage([
        { name: "add_to_cart", input: { items: [{ item_id: "margherita-32", quantity: 2 }] } },
      ]),
      toolMessage([
        {
          name: "set_order_details",
          input: { customer_name: "Ola", phone: "123456789", delivery_mode: "pickup" },
        },
      ]),
      toolMessage([{ name: "place_order", input: {} }]),
      toolMessage([{ name: "place_order", input: {} }]),
      textMessage("Заказ уже оформлен."),
    ]);

    const result = await runAgent(baseInput(), llm.call, { createOrder: stubCreateOrder(sink) });

    expect(llm.calls[4]?.toolResults[0]).toContain("уже оформлен");
    expect(result.order?.number).toBe(sink.last?.number);
  });

  it("не даёт модели зациклиться на инструментах", async () => {
    const loop = Array.from({ length: MAX_TOOL_ROUNDS }, () =>
      toolMessage([{ name: "clear_cart", input: {} }])
    );
    const llm = scriptedLlm([...loop, textMessage("Извините, давайте сначала.")]);

    const result = await runAgent(baseInput(), llm.call, { createOrder: stubCreateOrder() });

    expect(llm.used()).toBe(MAX_TOOL_ROUNDS + 1);
    // Последний запрос — без инструментов: модель обязана ответить словами
    expect(llm.calls[MAX_TOOL_ROUNDS]?.params.tools).toBeUndefined();
    expect(result.reply).toBe("Извините, давайте сначала.");
  });

  it("не оставляет клиента без ответа, если модель промолчала", async () => {
    const llm = scriptedLlm([textMessage("")]);
    const result = await runAgent(baseInput(), llm.call, { createOrder: stubCreateOrder() });
    expect(result.reply).toContain("Повторите");
  });

  it("сохраняет историю целиком, включая вызовы инструментов", async () => {
    const llm = scriptedLlm([
      toolMessage([{ name: "clear_cart", input: {} }]),
      textMessage("Корзина пуста."),
    ]);
    const result = await runAgent(baseInput(), llm.call, { createOrder: stubCreateOrder() });

    // user → assistant(tool_use) → user(tool_result) → assistant(text)
    expect(result.history).toHaveLength(4);
    expect(result.history[0]?.role).toBe("user");
    expect(result.history[2]?.role).toBe("user");
  });
});

describe("обрезка истории", () => {
  it("не трогает короткий диалог", () => {
    const history: Anthropic.MessageParam[] = [
      { role: "user", content: "привет" },
      { role: "assistant", content: "здравствуйте" },
    ];
    expect(trimHistory(history, 40)).toHaveLength(2);
  });

  it("режет по реплике клиента, а не посередине пары tool_use/tool_result", () => {
    const history: Anthropic.MessageParam[] = [
      { role: "user", content: "первое" },
      { role: "assistant", content: [{ type: "tool_use", id: "t1", name: "clear_cart", input: {} }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: "ок" }] },
      { role: "assistant", content: "готово" },
      { role: "user", content: "второе" },
      { role: "assistant", content: "и вам" },
    ];

    const trimmed = trimHistory(history, 3);
    expect(trimmed).toHaveLength(2);
    expect(trimmed[0]).toEqual({ role: "user", content: "второе" });
  });

  it("отдаёт пустую историю, если границы не нашлось", () => {
    const history: Anthropic.MessageParam[] = [
      { role: "user", content: "первое" },
      { role: "assistant", content: [{ type: "tool_use", id: "t1", name: "clear_cart", input: {} }] },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "t1", content: "ок" }] },
    ];
    expect(trimHistory(history, 2)).toEqual([]);
  });
});
