/**
 * Next.js calls this once per runtime before any request is handled, which is
 * the only place Sentry can install its Node instrumentation early enough.
 * Works with the custom `server.js` too, since Next owns this hook.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}
