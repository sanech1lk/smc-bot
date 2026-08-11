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

export type StageStatusCode = "NOT_STARTED" | "IN_PROGRESS" | "DONE" | "PROBLEM";

/** Purely visual metadata — the label lives in the i18n dictionary instead,
 *  looked up via STAGE_STATUS_KEY + useLocale().t() at the call site. */
export const STAGE_STATUS_META: Record<
  StageStatusCode,
  { color: string; dot: string; chip: string }
> = {
  NOT_STARTED: {
    color: "text-status-gray",
    dot: "bg-status-gray",
    chip: "bg-status-gray/15 text-text-secondary"
  },
  IN_PROGRESS: {
    color: "text-status-yellow",
    dot: "bg-status-yellow",
    chip: "bg-status-yellow/15 text-status-yellow"
  },
  DONE: {
    color: "text-status-green",
    dot: "bg-status-green",
    chip: "bg-status-green/15 text-status-green"
  },
  PROBLEM: {
    color: "text-status-red",
    dot: "bg-status-red",
    chip: "bg-status-red/15 text-status-red"
  }
};

/** Maps the Prisma enum value to its dictionary key under `stageStatus.*`. */
export const STAGE_STATUS_KEY: Record<StageStatusCode, string> = {
  NOT_STARTED: "stageStatus.notStarted",
  IN_PROGRESS: "stageStatus.inProgress",
  DONE: "stageStatus.done",
  PROBLEM: "stageStatus.problem"
};
