/**
 * User preferences: shared shape, defaults and validation.
 *
 * Kept free of server imports so the settings screen, the chat and the API
 * route all agree on exactly one definition of what a valid setting is.
 */

export interface UserSettingsShape {
  soundEnabled: boolean;
  soundName: string;
  soundVolume: number;
  vibrationEnabled: boolean;
  soundInOpenChat: boolean;
  soundOnSend: boolean;
  quietEnabled: boolean;
  quietFrom: number;
  quietTo: number;
  notifyMessages: boolean;
  notifyTasks: boolean;
  notifyChangeOrders: boolean;
  notifyPunch: boolean;
  notifyPhotos: boolean;
  textScale: number;
  adsPersonalized: boolean;
}

export const DEFAULT_SETTINGS: UserSettingsShape = {
  soundEnabled: true,
  soundName: "ping",
  soundVolume: 70,
  vibrationEnabled: true,
  soundInOpenChat: false,
  soundOnSend: false,
  quietEnabled: false,
  quietFrom: 22 * 60,
  quietTo: 7 * 60,
  notifyMessages: true,
  notifyTasks: true,
  notifyChangeOrders: true,
  notifyPunch: true,
  notifyPhotos: false,
  textScale: 100,
  adsPersonalized: false
};

export interface SoundOption {
  id: string;
  label: string;
  description: string;
}

/**
 * Deliberately short, dry signals. A melodic ringtone is unusable next to a
 * perforator, and a long one arrives after the moment has passed.
 */
export const SOUND_OPTIONS: SoundOption[] = [
  { id: "ping", label: "Пинг", description: "Короткий чистый сигнал" },
  { id: "knock", label: "Стук", description: "Глухой двойной удар" },
  { id: "chirp", label: "Свист", description: "Высокий, слышно в шуме" },
  { id: "bell", label: "Колокольчик", description: "Мягкий, для тихого офиса" },
  { id: "none", label: "Без звука", description: "Только вибрация" }
];

export const TEXT_SCALES = [100, 115, 130] as const;

export function isValidSoundName(value: unknown): value is string {
  return typeof value === "string" && SOUND_OPTIONS.some((s) => s.id === value);
}

export function isValidTextScale(value: unknown): value is number {
  return typeof value === "number" && (TEXT_SCALES as readonly number[]).includes(value);
}

/** Volume is a percentage; anything outside 0–100 is clamped, not rejected. */
export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_SETTINGS.soundVolume;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** Minutes from midnight, wrapped into a single day. */
export function clampMinuteOfDay(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const rounded = Math.round(value);
  return ((rounded % 1440) + 1440) % 1440;
}

export function formatMinuteOfDay(minutes: number): string {
  const m = clampMinuteOfDay(minutes);
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/**
 * Whether the given moment falls inside the quiet window.
 *
 * The window normally wraps midnight (22:00 → 07:00), so a plain `from <= now
 * < to` comparison is wrong for the common case. An empty window (from equal
 * to to) is treated as "never quiet" on purpose: silently muting every
 * notification because of a slip in the time picker would cost the user money
 * on a live site.
 */
export function isQuietAt(
  settings: Pick<UserSettingsShape, "quietEnabled" | "quietFrom" | "quietTo">,
  at: Date = new Date()
): boolean {
  if (!settings.quietEnabled) return false;

  const from = clampMinuteOfDay(settings.quietFrom);
  const to = clampMinuteOfDay(settings.quietTo);
  if (from === to) return false;

  const now = at.getHours() * 60 + at.getMinutes();
  return from < to ? now >= from && now < to : now >= from || now < to;
}

/** True when a sound should actually be produced for an incoming message. */
export function shouldPlayMessageSound(
  settings: UserSettingsShape,
  options: { chatIsOpen: boolean; at?: Date }
): boolean {
  if (!settings.soundEnabled) return false;
  if (settings.soundName === "none") return false;
  if (options.chatIsOpen && !settings.soundInOpenChat) return false;
  return !isQuietAt(settings, options.at);
}

/**
 * True when a vibration should fire for an incoming message. Independent of
 * the sound toggle — a user with sound off but vibration on should still feel
 * the buzz — but shares the same quiet-hours and open-chat suppression.
 */
export function shouldVibrateForMessage(
  settings: UserSettingsShape,
  options: { chatIsOpen: boolean; at?: Date }
): boolean {
  if (!settings.vibrationEnabled) return false;
  if (options.chatIsOpen && !settings.soundInOpenChat) return false;
  return !isQuietAt(settings, options.at);
}

/**
 * Takes whatever the client sent and returns only the fields that are both
 * known and valid. Anything unrecognised is dropped rather than rejected, so a
 * newer client talking to an older server degrades instead of failing.
 */
export function sanitizeSettingsPatch(input: unknown): Partial<UserSettingsShape> {
  if (input === null || typeof input !== "object") return {};
  const raw = input as Record<string, unknown>;
  const patch: Partial<UserSettingsShape> = {};

  const booleans = [
    "soundEnabled",
    "vibrationEnabled",
    "soundInOpenChat",
    "soundOnSend",
    "quietEnabled",
    "notifyMessages",
    "notifyTasks",
    "notifyChangeOrders",
    "notifyPunch",
    "notifyPhotos",
    "adsPersonalized"
  ] as const;

  for (const key of booleans) {
    if (typeof raw[key] === "boolean") patch[key] = raw[key] as boolean;
  }

  if (isValidSoundName(raw.soundName)) patch.soundName = raw.soundName;
  if (typeof raw.soundVolume === "number") patch.soundVolume = clampVolume(raw.soundVolume);
  if (typeof raw.quietFrom === "number") patch.quietFrom = clampMinuteOfDay(raw.quietFrom);
  if (typeof raw.quietTo === "number") patch.quietTo = clampMinuteOfDay(raw.quietTo);
  if (isValidTextScale(raw.textScale)) patch.textScale = raw.textScale;

  return patch;
}
