import { NextResponse } from "next/server";

/**
 * Every API failure travels as a stable machine code plus a Russian sentence.
 *
 * The interface speaks six languages, but a route handler has no idea which
 * one the caller is using — the choice lives in the browser. So the server
 * sends `code`, the client looks it up in its own dictionary (`apiError.*`),
 * and the Russian `error` text stays in the payload as a last-resort
 * fallback and as something readable in server logs and Sentry.
 *
 * Codes are part of the contract with the client: rename one and the message
 * silently falls back to Russian, so treat them as you would a URL.
 */
export const API_ERROR_MESSAGES = {
  // Auth and access
  unauthorized: "Не авторизован",
  forbidden: "Доступ запрещён",
  insufficientRights: "Недостаточно прав",
  notProjectMember: "Вы не участник объекта",
  wrongCurrentPassword: "Текущий пароль неверный",
  passwordSameAsCurrent: "Новый пароль совпадает с текущим",
  emailAlreadyRegistered: "Пользователь с таким email уже существует",
  linkInvalidOrExpired: "Ссылка недействительна или истекла. Запросите новую.",
  tooManyAttempts: "Слишком много попыток. Попробуйте позже.",
  tooManyRegistrations: "Слишком много регистраций с этого адреса. Попробуйте позже.",
  rateLimited: "Слишком много запросов, подождите немного",

  // Missing entities
  projectNotFound: "Объект не найден",
  stageNotFound: "Этап не найден",
  taskNotFound: "Задача не найдена",
  photoNotFound: "Фото не найдено",
  estimateItemNotFound: "Позиция не найдена",
  checklistItemNotFound: "Пункт не найден",
  templateNotFound: "Шаблон не найден",
  planNotFound: "План не найден",
  pinNotFound: "Метка не найдена",
  memberNotFound: "Участник не найден",
  userNotFound: "Пользователь не найден",
  invitationNotFound: "Приглашение не найдено",
  shiftNotFound: "Смена не найдена",
  dailyLogNotFound: "Отчёт не найден",
  changeOrderNotFound: "Допработа не найдена",
  punchNotFound: "Дефект не найден",
  materialNotFound: "Материал не найден",
  documentNotFound: "Документ не найден",
  visitNotFound: "Выезд не найден",

  // Invalid input
  badRequest: "Некорректный запрос",
  validationFailed: "Проверьте правильность заполнения полей",
  invalidDate: "Некорректная дата",
  invalidCategory: "Некорректная категория",
  invalidPhotoTag: "Некорректный тег фото",
  invalidTemplate: "Некорректный шаблон",
  invalidLink: "Некорректная ссылка",
  fileMissing: "Файл не передан",
  unsupportedFileType: "Неподдерживаемый формат файла",
  fileTooLarge: "Файл слишком большой (максимум {limit} МБ)",
  signatureTooLarge: "Подпись слишком большая",
  nothingToSave: "Нечего сохранять",
  stageOrderInvalid: "Список этапов должен содержать все этапы объекта без повторов",

  // Business rules
  stageNotInProject: "Этап не относится к этому объекту",
  assigneeNotMember: "Исполнитель не состоит в объекте",
  userAlreadyMember: "Пользователь уже добавлен в объект",
  invitationAlreadySent: "Приглашение уже отправлено на этот email",
  lastAdminLocked: "Нельзя удалить последнего администратора",
  lastStageLocked: "Нельзя удалить последний этап объекта",
  shiftAlreadyOpen: "Смена уже открыта",
  shiftAlreadyClosed: "Смена уже закрыта",
  decisionAlreadyMade: "Решение уже принято",
  decisionClientOnly: "Решение принимает заказчик",
  verifyClientOrAdminOnly: "Принять устранение может заказчик или админ",
  approvedChangeOrderLocked: "Согласованную допработу удалить нельзя",

  // Server configuration
  pushNotConfigured: "Push-уведомления не настроены на сервере"
} as const;

export type ApiErrorCode = keyof typeof API_ERROR_MESSAGES;

export type ApiErrorParams = Record<string, string | number>;

function interpolate(template: string, params?: ApiErrorParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in params ? String(params[key]) : match
  );
}

/**
 * Builds the error response. `params` travels alongside the code so the
 * client can fill the same placeholders in its own language — a size limit
 * reads "maximum 25 MB" in English without the server knowing that.
 */
export function apiError(
  code: ApiErrorCode,
  status: number,
  params?: ApiErrorParams,
  headers?: Record<string, string>
) {
  return NextResponse.json(
    { error: interpolate(API_ERROR_MESSAGES[code], params), code, ...(params ? { params } : {}) },
    { status, ...(headers ? { headers } : {}) }
  );
}

/** 429 with the Retry-After header clients and proxies expect. */
export function rateLimitedError(code: ApiErrorCode, retryAfterSeconds: number) {
  return apiError(code, 429, undefined, { "Retry-After": String(retryAfterSeconds) });
}
