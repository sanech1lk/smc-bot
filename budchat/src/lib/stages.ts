export const DEFAULT_STAGE_NAMES = [
  "Подготовка",
  "Демонтаж",
  "Электрика",
  "Сантехника",
  "Штукатурка",
  "Стяжка",
  "Плитка",
  "Ламинат",
  "Покраска",
  "Сдача"
] as const;

export const STAGE_STATUS_META: Record<
  "NOT_STARTED" | "IN_PROGRESS" | "DONE" | "PROBLEM",
  { label: string; color: string; dot: string }
> = {
  NOT_STARTED: { label: "Не начато", color: "text-status-gray", dot: "bg-status-gray" },
  IN_PROGRESS: { label: "В работе", color: "text-status-yellow", dot: "bg-status-yellow" },
  DONE: { label: "Готово", color: "text-status-green", dot: "bg-status-green" },
  PROBLEM: { label: "Проблема", color: "text-status-red", dot: "bg-status-red" }
};
