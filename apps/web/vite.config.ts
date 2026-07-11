import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@coa-bot/shared": path.resolve(__dirname, "../../packages/shared/src/index.ts")
    }
  },
  server: {
    port: Number(process.env.WEB_PORT ?? 5173)
  }
});
