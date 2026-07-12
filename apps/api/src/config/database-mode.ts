export type DatabaseMode = "memory" | "prisma";

export function resolveDatabaseMode(env = process.env): DatabaseMode {
  const value = env.DATABASE_MODE;
  if (value === "memory" || value === "prisma") return value;
  if (env.NODE_ENV === "test" && !env.DATABASE_URL) return "memory";
  return "prisma";
}

export function assertDatabaseConfiguration(env = process.env) {
  const mode = resolveDatabaseMode(env);
  if (mode === "prisma" && !env.DATABASE_URL) {
    const message = "DATABASE_MODE=prisma exige DATABASE_URL configurada. Em testes unitarios use DATABASE_MODE=memory.";
    if (env.NODE_ENV === "production") throw new Error(`Erro fatal de configuracao: ${message}`);
    throw new Error(message);
  }
  if (env.NODE_ENV === "production" && mode !== "prisma") {
    throw new Error("Erro fatal de configuracao: producao exige DATABASE_MODE=prisma.");
  }
  return mode;
}
