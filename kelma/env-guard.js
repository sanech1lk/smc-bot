/**
 * Fail-fast checks for the environment variables a deployment cannot work
 * without — run from server.js before Next.js boots, so a misconfigured
 * production instance dies loudly at startup instead of silently serving
 * forgeable sessions.
 *
 * The placeholder check matters as much as the presence check: .env.example
 * and docker-compose ship with a dummy secret, and "it started fine" is
 * exactly how that dummy ends up in production.
 */

const PLACEHOLDER_MARKERS = ["change-me", "changeme", "your-secret", "replace-me"];

/** NextAuth derives its encryption key from this, so shortness is real weakness. */
const MIN_SECRET_LENGTH = 32;

function looksLikePlaceholder(value) {
  const lowered = value.toLowerCase();
  return PLACEHOLDER_MARKERS.some((marker) => lowered.includes(marker));
}

/**
 * @returns {{ errors: string[], warnings: string[] }}
 */
function collectEnvProblems(env) {
  const isProduction = env.NODE_ENV === "production";
  const errors = [];
  const warnings = [];

  const databaseUrl = (env.DATABASE_URL ?? "").trim();
  if (!databaseUrl) {
    errors.push("DATABASE_URL не задан — приложению негде хранить данные.");
  }

  const secret = (env.NEXTAUTH_SECRET ?? "").trim();
  if (!secret) {
    const message =
      "NEXTAUTH_SECRET не задан. Сгенерируйте: openssl rand -base64 32";
    if (isProduction) errors.push(message);
    else warnings.push(`${message} (в разработке сессии будут сбрасываться при перезапуске)`);
  } else if (looksLikePlaceholder(secret)) {
    const message =
      "NEXTAUTH_SECRET оставлен шаблонным из .env.example — с ним чужие сессии подделываются. " +
      "Сгенерируйте свой: openssl rand -base64 32";
    if (isProduction) errors.push(message);
    else warnings.push(message);
  } else if (secret.length < MIN_SECRET_LENGTH) {
    const message = `NEXTAUTH_SECRET короче ${MIN_SECRET_LENGTH} символов — это слабый ключ подписи сессий.`;
    if (isProduction) errors.push(message);
    else warnings.push(message);
  }

  // NextAuth решает по этой переменной, ставить ли защищённую cookie сессии,
  // а браузер по той же схеме — разрешать ли геолокацию, push и service
  // worker. http:// в проде ломает всё это тихо, без единой ошибки в логе.
  const authUrl = (env.NEXTAUTH_URL ?? "").trim();
  if (isProduction && authUrl.startsWith("http://")) {
    const isLocalhost = /^http:\/\/(localhost|127\.0\.0\.1)(:|$)/.test(authUrl);
    const message =
      "NEXTAUTH_URL начинается с http:// — сессии не получат защищённую cookie, " +
      "а геолокация, push-уведомления и офлайн-режим будут заблокированы браузером. " +
      "Нужен https:// (см. docker-compose.prod.yml).";
    if (isLocalhost) warnings.push(message);
    else errors.push(message);
  }

  // Push is optional by design, but half a key pair means it silently no-ops.
  const hasPublicVapid = Boolean((env.VAPID_PUBLIC_KEY ?? "").trim());
  const hasPrivateVapid = Boolean((env.VAPID_PRIVATE_KEY ?? "").trim());
  if (hasPublicVapid !== hasPrivateVapid) {
    warnings.push(
      "Задан только один из ключей VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY — push-уведомления работать не будут. " +
        "Сгенерируйте пару: npx web-push generate-vapid-keys"
    );
  }

  return { errors, warnings };
}

/** Prints findings and exits the process when a production-critical one is fatal. */
function assertEnv(env = process.env) {
  const { errors, warnings } = collectEnvProblems(env);

  for (const warning of warnings) {
    console.warn(`[env] Предупреждение: ${warning}`);
  }

  if (errors.length > 0) {
    console.error("\n[env] Запуск остановлен — исправьте переменные окружения:\n");
    for (const error of errors) console.error(`  • ${error}`);
    console.error("");
    process.exit(1);
  }
}

module.exports = { assertEnv, collectEnvProblems };
