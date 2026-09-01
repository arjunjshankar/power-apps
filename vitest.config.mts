import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    env: { DATABASE_URL: "file:./test.db" },
    globalSetup: "tests/unit/global-setup.ts",
    fileParallelism: false,
  },
});
