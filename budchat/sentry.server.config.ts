import * as Sentry from "@sentry/nextjs";
import { baseOptions, sentryEnabled } from "@/lib/sentry-options";

// Server-side errors: API routes, server components, database failures.
if (sentryEnabled) {
  Sentry.init({
    ...baseOptions(),
    // Off by default in the SDK, pinned here on purpose: capturing local
    // variables would ship the contents of a login handler's `password` or a
    // client's phone number straight into the error report.
    includeLocalVariables: false
  });
}
