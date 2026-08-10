import * as Sentry from "@sentry/nextjs";
import { baseOptions, sentryEnabled } from "@/lib/sentry-options";

// The edge runtime only runs middleware here, but Next.js loads this file
// regardless, so it has to initialise the same way.
if (sentryEnabled) {
  Sentry.init(baseOptions());
}
