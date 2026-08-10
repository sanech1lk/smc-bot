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
  { label: string; color: string; dot: string; chip: string }
> = {
  NOT_STARTED: {
    label: "Не начато",
    color: "text-status-gray",
    dot: "bg-status-gray",
    chip: "bg-status-gray/15 text-text-secondary"
  },
  IN_PROGRESS: {
    label: "В работе",
    color: "text-status-yellow",
    dot: "bg-status-yellow",
    chip: "bg-status-yellow/15 text-status-yellow"
  },
  DONE: {
    label: "Готово",
    color: "text-status-green",
    dot: "bg-status-green",
    chip: "bg-status-green/15 text-status-green"
  },
  PROBLEM: {
    label: "Проблема",
    color: "text-status-red",
    dot: "bg-status-red",
    chip: "bg-status-red/15 text-status-red"
  }
};
