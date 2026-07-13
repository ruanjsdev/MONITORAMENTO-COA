import { PrismaClient } from "@prisma/client";
import { Router } from "express";

export type OperationalMode = "SIMULATION" | "SHADOW" | "LIVE_APPROVAL";
const confirmations: Record<OperationalMode, string> = {
  SIMULATION: "ATIVAR SIMULATION",
  SHADOW: "ATIVAR SHADOW SOMENTE LEITURA",
  LIVE_APPROVAL: "ATIVAR LIVE APPROVAL CONTROLADO"
};

export function operationalModeRoutes(prisma = new PrismaClient()) {
  const router = Router();
  router.get("/", async (_req, res, next) => {
    try { res.json(await status(prisma)); } catch (error) { next(error); }
  });
  router.post("/", async (req, res, next) => {
    try {
      const mode = String(req.body.mode ?? "") as OperationalMode;
      if (!(mode in confirmations)) return res.status(400).json({ message: "Modo operacional inválido." });
      if (req.body.confirmation !== confirmations[mode]) return res.status(409).json({ message: `Confirmação exigida: ${confirmations[mode]}` });
      await prisma.generalSetting.upsert({ where: { key: "OPERATIONAL_MODE" }, update: { value: mode, version: { increment: 1 } }, create: { key: "OPERATIONAL_MODE", value: mode } });
      await prisma.systemLog.create({ data: { action: "OPERATIONAL_MODE_CHANGED", entity: "GeneralSetting", message: `Modo alterado para ${mode} com confirmação explícita.`, metadata: { mode, officialExcelWrite: false, whatsappSend: false, whatsappReaction: false }, result: "SUCCESS" } });
      res.json(await status(prisma));
    } catch (error) { next(error); }
  });
  return router;
}

async function status(prisma: PrismaClient) {
  const setting = await prisma.generalSetting.findUnique({ where: { key: "OPERATIONAL_MODE" } });
  const mode = (setting?.value ?? "SIMULATION") as OperationalMode;
  const whatsappStatus = await prisma.integrationStatus.findUnique({ where: { kind: "WHATSAPP" } });
  return {
    mode,
    confirmationRequired: confirmations,
    postgres: "CONNECTED",
    whatsapp: whatsappStatus?.state === "ONLINE" ? "CONNECTED" : mode === "SIMULATION" ? "SIMULATED" : "NOT_CONNECTED",
    whatsappSource: whatsappStatus?.state === "ONLINE" ? "REAL_SHADOW" : null,
    whatsappReadOnly: mode === "SHADOW",
    officialExcelReadOnly: mode !== "SIMULATION",
    officialExcelWrite: false,
    sendMessage: false,
    sendReaction: false,
    groupUpdate: false,
    deleteMessage: false,
    banner: mode === "SHADOW" ? "MODO SHADOW ATIVO — mensagens reais em leitura; escrita, envio e reação bloqueados." : mode
  };
}
