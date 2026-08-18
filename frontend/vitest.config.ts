import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Separate from vite.config.ts on purpose — that config runs the Lovable
 * TanStack Start plugin chain, which does not need to load for unit tests and
 * slows them down considerably.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
