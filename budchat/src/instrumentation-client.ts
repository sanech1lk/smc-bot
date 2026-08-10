import * as Sentry from "@sentry/nextjs";
import { baseOptions, sentryEnabled } from "@/lib/sentry-options";

/**
 * Browser-side errors: a crash inside a React tree, a failed request, anything
 * the crew hits on their phone that never reaches the server log.
 *
 * The Sentry build plugin injects this file into the client bundle, so it runs
 * before the app mounts. Note that the DSN here is fixed at build time — the
 * browser cannot read environment variables at runtime.
 */
if (sentryEnabled) {
  Sentry.init({
    ...baseOptions(),
    // Session replay records the screen. On a building site that would capture
    // client addresses and signatures, so it stays off.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0
  });
}

/**
 * Lets Sentry tie an error to the screen the user was moving to, instead of
 * the one they were leaving. Harmless when tracing is off, and the SDK asks
 * for it on every startup if it is missing.
 */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
