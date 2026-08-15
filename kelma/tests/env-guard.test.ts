import { describe, expect, it } from "vitest";
// The guard runs from server.js before Next boots, so it is plain CommonJS.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { collectEnvProblems } = require("../env-guard.js") as {
  collectEnvProblems: (env: Record<string, string | undefined>) => {
    errors: string[];
    warnings: string[];
  };
};

const GOOD_SECRET = "Kx7pQ2mNvR8sT4wZ1aB6cD9eF3gH5jL0aBcDeFgH";

const production = (overrides: Record<string, string | undefined> = {}) => ({
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://user:pass@db:5432/kelma",
  NEXTAUTH_SECRET: GOOD_SECRET,
  ...overrides
});

describe("проверка окружения на старте", () => {
  it("пропускает корректную production-конфигурацию", () => {
    const { errors } = collectEnvProblems(production());
    expect(errors).toEqual([]);
  });

  it("не даёт стартовать с шаблонным секретом из .env.example", () => {
    // Ровно тот случай, ради которого проверка и написана: значение из
    // примера конфигурации уезжает в прод и подписывает реальные сессии.
    const { errors } = collectEnvProblems(
      production({ NEXTAUTH_SECRET: "change-me-to-a-random-32-byte-string" })
    );
    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("NEXTAUTH_SECRET");
  });

  it("не даёт стартовать без секрета и без базы", () => {
    const { errors } = collectEnvProblems(
      production({ NEXTAUTH_SECRET: undefined, DATABASE_URL: undefined })
    );
    expect(errors).toHaveLength(2);
  });

  it("отклоняет слишком короткий секрет", () => {
    const { errors } = collectEnvProblems(production({ NEXTAUTH_SECRET: "короткий" }));
    expect(errors).toHaveLength(1);
  });

  it("в разработке те же проблемы — предупреждения, а не остановка", () => {
    const { errors, warnings } = collectEnvProblems({
      NODE_ENV: "development",
      DATABASE_URL: "postgresql://localhost:5432/kelma",
      NEXTAUTH_SECRET: "change-me-to-a-random-32-byte-string"
    });
    expect(errors).toEqual([]);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("предупреждает про половину пары ключей VAPID", () => {
    const { errors, warnings } = collectEnvProblems(
      production({ VAPID_PUBLIC_KEY: "abc", VAPID_PRIVATE_KEY: "" })
    );
    // Push — опциональная функция, поэтому это не повод падать.
    expect(errors).toEqual([]);
    expect(warnings.join(" ")).toContain("VAPID");
  });

  it("молчит, когда обе половины VAPID заданы", () => {
    const { warnings } = collectEnvProblems(
      production({ VAPID_PUBLIC_KEY: "abc", VAPID_PRIVATE_KEY: "def" })
    );
    expect(warnings).toEqual([]);
  });
});
