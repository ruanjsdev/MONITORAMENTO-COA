import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL nao configurada. Execute npm run setup ou exporte a URL do PostgreSQL antes de npm run test:integration.");
  process.exit(1);
}

const result = spawnSync("npx", ["vitest", "run", "tests/operational-persistence.test.ts"], {
  stdio: "inherit",
  env: { ...process.env, DATABASE_MODE: "prisma" }
});

process.exit(result.status ?? 1);
