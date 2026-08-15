const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    ignoreDuringBuilds: true
  },
  experimental: {
    // Required on Next 14 for src/instrumentation.ts to run at startup.
    instrumentationHook: true
  },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "**" },
      { protocol: "https", hostname: "**" }
    ]
  }
};

// Uploading source maps turns minified stack traces back into readable file
// names and line numbers. It needs a Sentry auth token, so builds without one
// simply skip it — the errors still arrive, just harder to read.
const uploadSourceMaps = Boolean(
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
);

// The wrapper is applied unconditionally: it is what teaches Next.js to hand
// route-handler and server-component errors to Sentry, and that wiring has to
// exist at build time even when the DSN is only added later in production.
module.exports = withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  telemetry: false,
  widenClientFileUpload: true,
  webpack: {
    // Strips Sentry's own debug logging out of the browser bundle.
    treeshake: { removeDebugLogging: true }
  },
  sourcemaps: {
    disable: !uploadSourceMaps,
    // Source maps must never be left in `public/` — they would expose the
    // whole server-side source to anyone who opens devtools.
    deleteSourcemapsAfterUpload: true
  },
  // Routes Sentry traffic through the app's own domain so ad blockers and
  // corporate firewalls don't silently swallow error reports from the site.
  tunnelRoute: "/monitoring"
});
