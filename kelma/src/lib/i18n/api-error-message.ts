type Translate = (path: string, params?: Record<string, string | number>) => string;

interface ApiErrorPayload {
  error?: unknown;
  code?: unknown;
  params?: unknown;
}

/**
 * Turns an error response body into a sentence in the reader's language.
 *
 * The server picks the code, the browser picks the language — see
 * lib/api-error.ts. Three levels of fallback, in order of preference:
 *
 *  1. the code, translated (and interpolated, so "maximum 25 MB" works);
 *  2. the Russian sentence the server sent, for a code this build of the
 *     client doesn't know yet — a stale service worker against a newer
 *     server, say. Wrong language beats no explanation;
 *  3. the caller's own fallback key, when the response carried nothing
 *     useful at all (a proxy 502, a dropped connection).
 */
export function apiErrorMessage(t: Translate, data: unknown, fallbackKey: string): string {
  const payload = (data ?? {}) as ApiErrorPayload;

  if (typeof payload.code === "string" && payload.code) {
    const path = `apiError.${payload.code}`;
    const params =
      payload.params && typeof payload.params === "object"
        ? (payload.params as Record<string, string | number>)
        : undefined;
    const translated = t(path, params);
    // translate() echoes the path back when the key is missing, which is how
    // an unknown code is detected without throwing.
    if (translated !== path) return translated;
  }

  if (typeof payload.error === "string" && payload.error) return payload.error;

  return t(fallbackKey);
}
