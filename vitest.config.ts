import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    clearMocks: true,
    // Modules that read the JWT secret now fail-fast if `secret_key` is unset
    // (see src/lib/server/jwtSecret.ts). Tests import those modules (they mock
    // `jose`), so provide a dummy secret for the test environment.
    env: {
      secret_key: "test-secret-key-vitest-only",
    },
  },
});
