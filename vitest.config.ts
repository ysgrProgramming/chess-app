import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["tests/setupTests.ts"],
    globals: true,
    pool: "threads",
    poolOptions: {
      threads: {
        singleThread: true,
        isolate: true
      }
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"]
    }
  }
});
