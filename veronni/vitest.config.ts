import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    env: {
      // PrismaClient проверяет наличие url при создании, а тесты в базу не ходят.
      DATABASE_URL: "file:./test-placeholder.db",
    },
  },
});
