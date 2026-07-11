import { spawnSync } from "node:child_process";

const databaseUrl = "postgresql://coa_bot:coa_bot_dev@localhost:5433/coa_bot?schema=public";

const setupEnv = {
  ...process.env,
  SIMULATION_MODE: process.env.SIMULATION_MODE ?? "true",
  POSTGRES_DB: "coa_bot",
  POSTGRES_USER: "coa_bot",
  POSTGRES_PASSWORD: "coa_bot_dev",
  POSTGRES_PORT: "5433",
  DATABASE_URL: databaseUrl,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL ?? "admin@coa.local",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD ?? "change-me-dev-only",
};

function run(command: string, args: string[], options: { silent?: boolean } = {}) {
  const result = spawnSync(command, args, {
    env: setupEnv,
    encoding: "utf8",
    stdio: options.silent ? "pipe" : "inherit",
  });

  return result;
}

function ensureDockerIsAvailable() {
  const docker = run("docker", ["--version"], { silent: true });

  if (docker.error || docker.status !== 0) {
    console.error("Docker nao esta disponivel neste ambiente.");
    console.error("Instale/inicie o Docker e execute novamente: npm run setup");
    process.exit(1);
  }

  const compose = run("docker", ["compose", "version"], { silent: true });

  if (compose.error || compose.status !== 0) {
    console.error("Docker Compose nao esta disponivel neste ambiente.");
    console.error("Instale o plugin Docker Compose e execute novamente: npm run setup");
    process.exit(1);
  }
}

function waitForPostgresHealthcheck() {
  const startedAt = Date.now();
  const timeoutMs = 90_000;
  let lastStatus = "unknown";
  const sleepBuffer = new SharedArrayBuffer(4);
  const sleepArray = new Int32Array(sleepBuffer);

  process.stdout.write("Aguardando PostgreSQL do COA-BOT ficar saudavel");

  while (Date.now() - startedAt < timeoutMs) {
    const health = run("docker", ["inspect", "-f", "{{.State.Health.Status}}", "coa-bot-postgres"], {
      silent: true,
    });

    lastStatus = health.stdout?.trim() || health.stderr?.trim() || "unknown";

    if (health.status === 0 && lastStatus === "healthy") {
      process.stdout.write("\n");
      return;
    }

    process.stdout.write(".");
    Atomics.wait(sleepArray, 0, 0, 2000);
  }

  process.stdout.write("\n");
  console.error(`PostgreSQL nao ficou saudavel dentro do tempo esperado. Ultimo status: ${lastStatus}`);
  process.exit(1);
}

function runRequiredStep(label: string, command: string, args: string[]) {
  console.log(`\n${label}`);
  const result = run(command, args);

  if (result.error || result.status !== 0) {
    console.error(`Falha ao executar etapa: ${label}`);
    process.exit(result.status ?? 1);
  }
}

ensureDockerIsAvailable();

console.log("Configurando ambiente de desenvolvimento do COA-BOT");
console.log("PostgreSQL Docker: localhost:5433 -> container:5432");
console.log(`DATABASE_URL: ${databaseUrl}`);

runRequiredStep("Subindo apenas o PostgreSQL do COA-BOT", "docker", ["compose", "up", "-d", "postgres"]);
waitForPostgresHealthcheck();
runRequiredStep("Gerando Prisma Client", "npx", [
  "prisma",
  "generate",
  "--schema",
  "packages/database/prisma/schema.prisma",
]);
runRequiredStep("Executando migrations", "npm", ["run", "db:migrate"]);
runRequiredStep("Executando seed", "npm", ["run", "db:seed"]);

console.log("\nSetup concluido.");
console.log("Login inicial de desenvolvimento:");
console.log(`Email: ${setupEnv.ADMIN_EMAIL}`);
console.log(`Senha: ${setupEnv.ADMIN_PASSWORD}`);
console.log("\nPara iniciar o sistema:");
console.log("npm run dev");
