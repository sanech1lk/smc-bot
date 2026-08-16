import Anthropic from "@anthropic-ai/sdk";
import { config } from "../config.js";
import type { LlmCall } from "./run.js";

let client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: config.anthropicKey });
  return client;
}

/** Обёртка в одну функцию: цикл агента не знает про SDK и подменяется в тестах. */
export function createLlmCall(): LlmCall {
  return (params) => anthropic().messages.create(params);
}
