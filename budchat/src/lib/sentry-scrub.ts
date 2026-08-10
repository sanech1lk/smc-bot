/**
 * Strips personal data out of a Sentry event before it leaves the browser or
 * the server.
 *
 * This is not a formality for this app. Password-reset links carry their token
 * in the query string, site photos carry GPS coordinates, and an acceptance
 * signature is a drawing of a real person's hand — none of that may end up in
 * a third-party service. The rule here is an allowlist for headers and a
 * denylist for keys, applied at every nesting depth.
 */

export const REDACTED = "[скрыто]";

/** The only request headers kept — a user agent helps debug device-specific bugs. */
const KEPT_HEADERS = new Set(["user-agent"]);

/** Keys redacted on an exact match. Short names that would over-match as substrings. */
const SENSITIVE_KEY_EXACT = new Set([
  "lat",
  "lng",
  "latitude",
  "longitude",
  "email",
  "phone",
  "name",
  "address",
  "startlat",
  "startlng",
  "endlat",
  "endlng"
]);

/** Keys redacted when the name merely contains one of these. */
const SENSITIVE_KEY_PARTS = [
  "token",
  "password",
  "secret",
  "authorization",
  "cookie",
  "apikey",
  "api_key",
  "signature",
  "credential"
];

/** How deep to walk nested structures before giving up. */
const MAX_DEPTH = 6;

export function isSensitiveKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (SENSITIVE_KEY_EXACT.has(lower)) return true;
  return SENSITIVE_KEY_PARTS.some((part) => lower.includes(part));
}

/**
 * Drops the query string and fragment from a URL. A reset-password link is
 * useless to an attacker without its token, so this alone defuses the worst
 * case. Never throws: an unparseable URL is returned untouched apart from a
 * plain cut at the first `?` or `#`.
 */
export function stripQuery(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

/**
 * Replaces sensitive values anywhere in a nested structure. Returns a new
 * value; the input is never mutated, so a scrub failure can't corrupt the
 * caller's data.
 */
export function redactDeep(value: unknown, depth = 0): unknown {
  if (depth >= MAX_DEPTH) return REDACTED;
  if (Array.isArray(value)) return value.map((item) => redactDeep(item, depth + 1));
  if (value === null || typeof value !== "object") return value;

  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    out[key] = isSensitiveKey(key) ? REDACTED : redactDeep(item, depth + 1);
  }
  return out;
}

export interface ScrubbableEvent {
  request?: {
    url?: string;
    headers?: Record<string, string>;
    cookies?: unknown;
    data?: unknown;
    query_string?: unknown;
  };
  user?: Record<string, unknown>;
  extra?: Record<string, unknown>;
  contexts?: Record<string, unknown>;
  tags?: Record<string, unknown>;
  server_name?: string;
}

/**
 * The single entry point wired into Sentry's `beforeSend`. Keeps what makes an
 * error debuggable — the route, the user id, the stack — and throws away
 * everything that identifies a person.
 */
export function scrubEvent<T extends ScrubbableEvent>(event: T): T {
  if (event.request) {
    const { url, headers } = event.request;

    // Bodies and cookies are dropped wholesale: a request body here can be a
    // chat message, an estimate, or a base64 signature.
    delete event.request.cookies;
    delete event.request.data;
    delete event.request.query_string;

    if (typeof url === "string") event.request.url = stripQuery(url);

    if (headers) {
      const kept: Record<string, string> = {};
      for (const [key, value] of Object.entries(headers)) {
        if (KEPT_HEADERS.has(key.toLowerCase())) kept[key] = value;
      }
      event.request.headers = kept;
    }
  }

  if (event.user) {
    // An id and a role are enough to answer "who hit this and what could they
    // do"; a name or an email answers questions nobody needs to ask.
    const { id, role } = event.user as { id?: unknown; role?: unknown };
    const user: Record<string, unknown> = {};
    if (typeof id === "string") user.id = id;
    if (typeof role === "string") user.role = role;
    event.user = user;
  }

  if (event.extra) event.extra = redactDeep(event.extra) as Record<string, unknown>;
  if (event.contexts) event.contexts = redactDeep(event.contexts) as Record<string, unknown>;
  if (event.tags) event.tags = redactDeep(event.tags) as Record<string, unknown>;

  // The container hostname is noise on a single-server deploy and leaks the
  // internal naming scheme on a bigger one.
  delete event.server_name;

  return event;
}
