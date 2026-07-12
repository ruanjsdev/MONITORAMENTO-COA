import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@coa-bot/shared": path.resolve(__dirname, "packages/shared/src/index.ts"),
      "@coa-bot/validation": path.resolve(__dirname, "packages/validation/src/index.ts"),
      "@coa-bot/whatsapp": path.resolve(__dirname, "packages/whatsapp/src/index.ts"),
      "@coa-bot/excel-contracts": path.resolve(__dirname, "packages/excel-contracts/src/index.ts"),
      "@coa-bot/database": path.resolve(__dirname, "packages/database/src/index.ts")
    }
  },
  test: {
    environment: "node",
    exclude: ["**/node_modules/**", "**/dist/**", "tests/**/*.integration.test.ts"]
  }
});
