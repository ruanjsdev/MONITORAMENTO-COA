import { spawnSync } from "node:child_process";
import path from "node:path";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL nao configurada. Execute npm run setup ou exporte a URL do PostgreSQL antes de npm run test:integration.");
  process.exit(1);
}

const vitestEntry = path.resolve("node_modules/vitest/vitest.mjs");
const result = spawnSync(process.execPath, [vitestEntry, "run", "tests/operational-persistence.test.ts"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_MODE: "prisma" }
});

if (result.error) console.error(result.error);

process.exit(result.status ?? 1);
