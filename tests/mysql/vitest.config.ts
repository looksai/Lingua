import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/mysql/**/*.integration.ts"],
    hookTimeout: 60000,
    testTimeout: 60000,
    fileParallelism: false,
  },
});
