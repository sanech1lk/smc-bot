import { loadConversation, saveConversation } from "./conversation.js";
import { loadMenu } from "./menu.js";
import { runAgent, type LlmCall } from "./agent/run.js";
import type { OrderWithItems } from "./order.js";
import { defaultToolDeps, type ToolDeps } from "./agent/tools.js";

export type HandleResult = { reply: string; order: OrderWithItems | null };

// Клиент дописывает «и колу» через секунду после первого сообщения. Без
// очереди оба хода читают одну и ту же корзину и второй затирает первый.
const chains = new Map<string, Promise<unknown>>();

function enqueue<T>(chatId: string, task: () => Promise<T>): Promise<T> {
  const previous = chains.get(chatId) ?? Promise.resolve();
  const next = previous.then(task, task);
  chains.set(
    chatId,
    next.catch(() => undefined)
  );
  return next;
}

export async function handleMessage(
  chatId: string,
  userText: string,
  call: LlmCall,
  deps: ToolDeps = defaultToolDeps
): Promise<HandleResult> {
  return enqueue(chatId, async () => {
    const [state, menuItems] = await Promise.all([loadConversation(chatId), loadMenu()]);

    const result = await runAgent(
      {
        chatId,
        userText,
        history: state.history,
        cart: state.cart,
        customer: state.customer,
        menuItems,
      },
      call,
      deps
    );

    await saveConversation({
      chatId,
      history: result.history,
      cart: result.cart,
      customer: result.customer,
    });

    return { reply: result.reply, order: result.order };
  });
}
