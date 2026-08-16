import type Anthropic from "@anthropic-ai/sdk";
import type { MenuItem } from "@prisma/client";
import { config } from "../config.js";
import { describeCart, priceCart, type CartLine } from "../cart.js";
import { indexMenu, renderMenuForPrompt } from "../menu.js";
import type { CustomerDraft, OrderWithItems } from "../order.js";
import { buildInstructions, buildStateBlock } from "./prompt.js";
import { defaultToolDeps, executeTool, tools, type AgentSession, type ToolDeps } from "./tools.js";

/** Одна функция вместо всего SDK — так цикл можно прогнать на заглушке в тестах. */
export type LlmCall = (
  params: Anthropic.MessageCreateParamsNonStreaming
) => Promise<Anthropic.Message>;

/** Сколько раз подряд модель может сходить в инструменты за один ответ клиенту. */
export const MAX_TOOL_ROUNDS = 6;
/** Сколько сообщений диалога держим в контексте. */
export const MAX_HISTORY_MESSAGES = 40;

export type AgentInput = {
  chatId: string;
  userText: string;
  history: Anthropic.MessageParam[];
  cart: CartLine[];
  customer: CustomerDraft;
  menuItems: MenuItem[];
  now?: Date;
};

export type AgentResult = {
  reply: string;
  history: Anthropic.MessageParam[];
  cart: CartLine[];
  customer: CustomerDraft;
  /** Не null, если в этом ходе заказ действительно создан. */
  order: OrderWithItems | null;
};

/**
 * Обрезка истории по границе реплики клиента.
 *
 * Резать «последние N сообщений» нельзя: если срез придётся между tool_use и
 * tool_result, API вернёт 400. Поэтому отступаем назад до ближайшего обычного
 * сообщения клиента — там пара всегда закрыта.
 */
export function trimHistory(
  history: Anthropic.MessageParam[],
  maxMessages = MAX_HISTORY_MESSAGES
): Anthropic.MessageParam[] {
  if (history.length <= maxMessages) return history;
  for (let index = history.length - maxMessages; index < history.length; index += 1) {
    const message = history[index];
    if (message && message.role === "user" && typeof message.content === "string") {
      return history.slice(index);
    }
  }
  return [];
}

function collectText(content: Anthropic.ContentBlock[]): string {
  return content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text.trim())
    .filter((text) => text.length > 0)
    .join("\n\n");
}

export async function runAgent(
  input: AgentInput,
  call: LlmCall,
  deps: ToolDeps = defaultToolDeps
): Promise<AgentResult> {
  const now = input.now ?? new Date();
  const menu = indexMenu(input.menuItems);

  const session: AgentSession = {
    chatId: input.chatId,
    cart: input.cart,
    customer: { ...input.customer },
    menu,
    now,
    placedOrder: null,
  };

  const messages: Anthropic.MessageParam[] = [
    ...trimHistory(input.history),
    { role: "user", content: input.userText },
  ];

  // Постоянный префикс: инструкции + меню. Точка кэширования стоит на нём —
  // это самая большая и самая неизменная часть запроса.
  const staticSystem = `${buildInstructions()}\n\n${renderMenuForPrompt(input.menuItems)}`;
  const replies: string[] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
    const priced = priceCart(session.cart, session.menu, session.customer.deliveryMode);
    const system: Anthropic.TextBlockParam[] = [
      { type: "text", text: staticSystem, cache_control: { type: "ephemeral" } },
      {
        type: "text",
        text: buildStateBlock({
          now,
          cartSummary: describeCart(priced, session.customer.deliveryMode),
          customer: session.customer,
        }),
      },
    ];

    const response = await call({
      model: config.model,
      max_tokens: 2000,
      system,
      messages,
      tools,
      thinking: { type: "adaptive" },
    });

    messages.push({ role: "assistant", content: response.content });

    const text = collectText(response.content);
    if (text) replies.push(text);

    const toolUses = response.content.filter(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );
    if (response.stop_reason !== "tool_use" || toolUses.length === 0) break;

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUses) {
      const output = await executeTool(toolUse.name, toolUse.input, session, deps);
      results.push({ type: "tool_result", tool_use_id: toolUse.id, content: output });
    }
    messages.push({ role: "user", content: results });

    // Последний круг израсходован, а модель всё ещё зовёт инструменты: даём ей
    // договорить без них, иначе клиент останется вообще без ответа.
    if (round === MAX_TOOL_ROUNDS - 1) {
      const final = await call({
        model: config.model,
        max_tokens: 1000,
        system,
        messages,
      });
      messages.push({ role: "assistant", content: final.content });
      const finalText = collectText(final.content);
      if (finalText) replies.push(finalText);
    }
  }

  const reply =
    replies.join("\n\n").trim() ||
    `Что-то я подвис. Повторите, пожалуйста, или позвоните нам: ${config.restaurant.phone}`;

  return {
    reply,
    history: messages,
    cart: session.cart,
    customer: session.customer,
    order: session.placedOrder,
  };
}
