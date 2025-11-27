import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["tests/setupTests.ts"],
    globals: true,
    pool: "threads",
    maxThreads: 1,
    minThreads: 1,
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
