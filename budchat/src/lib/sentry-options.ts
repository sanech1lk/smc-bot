import type { ErrorEvent, NodeOptions } from "@sentry/nextjs";
import { scrubEvent } from "@/lib/sentry-scrub";

// The SDK doesn't re-export the transaction event type, so derive it from the
// callback that consumes it — this stays correct across SDK upgrades.
type TransactionEvent = Parameters<NonNullable<NodeOptions["beforeSendTransaction"]>>[0];

/**
 * Shared Sentry configuration for the browser, the Node server and the edge
 * runtime.
 *
 * Everything here is safe to bundle into the browser: a Sentry DSN is a public
 * value by design (it only allows writing events), and no secret is read.
 *
 * Without `NEXT_PUBLIC_SENTRY_DSN` the SDK is never initialised at all, so an
 * install with no error tracking behaves exactly like one without the package.
 */

/**
 * The browser can only see `NEXT_PUBLIC_SENTRY_DSN`, and only as it was at
 * build time. The server accepts either, read at startup — so a DSN added to
 * the hosting panel starts catching server errors after a restart, with no
 * rebuild.
 */
export const SENTRY_DSN =
  process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN || "";

export const sentryEnabled = SENTRY_DSN.length > 0;

/**
 * Share of requests traced for performance. Off unless explicitly set, because
 * traces burn through a free Sentry plan far faster than errors do.
 */
function tracesSampleRate(): number {
  const raw = Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE);
  if (!Number.isFinite(raw) || raw < 0 || raw > 1) return 0;
  return raw;
}

/**
 * Noise that would otherwise eat the monthly error quota without ever pointing
 * at a real defect: a benign layout-observer warning, and the errors a browser
 * raises when the user walks out of mobile coverage mid-request — which on a
 * building site is normal, and is what the offline queue exists to handle.
 */
const IGNORED_ERRORS = [
  "ResizeObserver loop limit exceeded",
  "ResizeObserver loop completed with undelivered notifications",
  "Failed to fetch",
  "NetworkError when attempting to fetch resource",
  "Load failed",
  "AbortError"
];

export function baseOptions() {
  return {
    dsn: SENTRY_DSN,
    environment:
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
      process.env.SENTRY_ENVIRONMENT ||
      process.env.NODE_ENV ||
      "development",
    tracesSampleRate: tracesSampleRate(),
    // Never let the SDK attach IP addresses, cookies or headers on its own.
    sendDefaultPii: false,
    ignoreErrors: IGNORED_ERRORS,
    beforeSend: (event: ErrorEvent) => scrubEvent(event),
    beforeSendTransaction: (event: TransactionEvent) => scrubEvent(event)
  };
}
