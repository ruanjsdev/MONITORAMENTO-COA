import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { OFFICIAL_PILOT_ACTIVATION } from "@coa-bot/excel-contracts";
import { pilotRuntimeBlockers } from "../official-pilot/policy.js";
import { HttpError } from "../../errors/http-error.js";

export type OperationalMode = "SIMULATION" | "SHADOW" | "LOCAL_OPERATIONAL" | "LIVE_APPROVAL_PILOT";
const confirmations: Record<OperationalMode, string> = {
  SIMULATION: "ATIVAR SIMULATION",
  SHADOW: "ATIVAR SHADOW SOMENTE LEITURA",
  LOCAL_OPERATIONAL: "ATIVAR OPERACIONAL LOCAL",
  LIVE_APPROVAL_PILOT: OFFICIAL_PILOT_ACTIVATION
};

export function operationalModeRoutes(prisma = new PrismaClient()) {
  const router = Router();
  router.get("/", async (_req, res, next) => {
    try {
      res.json(await status(prisma, res.locals.user));
    } catch (error) {
      next(error);
    }
  });
  router.post("/", async (req, res, next) => {
    try {
      if (!res.locals.user?.roles.includes("ADMIN"))
        return res
          .status(403)
          .json({ message: "Permissão ADMIN obrigatória para alterar o modo operacional." });
      const mode = String(req.body.mode ?? "") as OperationalMode;
      if (!(mode in confirmations))
        return res.status(400).json({ message: "Modo operacional inválido." });
      if (req.body.confirmation !== confirmations[mode])
        return res.status(409).json({ message: `Confirmação exigida: ${confirmations[mode]}` });
      if (mode === "LIVE_APPROVAL_PILOT") {
        const blockers = pilotRuntimeBlockers(res.locals.user);
        if (blockers.length)
          return res
            .status(409)
            .json({
              message: "Ambiente ou conta administrativa ainda não está seguro para o piloto.",
              code: blockers[0],
              blockers
            });
      }
      const userId = await validUserId(prisma, res.locals.user?.id);
      await prisma.$transaction(async (tx) => {
        const lock = await tx.$queryRaw<
          Array<{ locked: boolean }>
        >`SELECT pg_try_advisory_xact_lock(731531830) AS locked`;
        if (!lock[0]?.locked)
          throw new HttpError(409, "Piloto oficial ocupado por outra operação.", {
            code: "PILOT_WRITE_IN_PROGRESS"
          });
        const current = await tx.generalSetting.findUnique({ where: { key: "OPERATIONAL_MODE" } });
        const active = await tx.officialPilotWrite.findFirst({
          where: {
            status: {
              in: [
                "APPROVAL_RECORDED",
                "BASELINE_VALIDATED",
                "BACKUP_CREATED",
                "WRITING",
                "SAVED",
                "ROLLBACK_PENDING"
              ]
            }
          }
        });
        if (active && current?.value === "LIVE_APPROVAL_PILOT" && mode !== "LIVE_APPROVAL_PILOT")
          throw new HttpError(
            409,
            "Não é possível trocar o modo durante escrita/rollback oficial.",
            { code: "PILOT_WRITE_IN_PROGRESS", writeId: active.id }
          );
        if (mode === "LIVE_APPROVAL_PILOT") {
          const preview = await tx.officialPilotWrite.findFirst({
            where: {
              status: "PREVIEW_READY",
              confirmed: false,
              originalHash: { not: null },
              backupHash: { not: null }
            }
          });
          if (!preview || preview.originalHash !== preview.backupHash)
            throw new HttpError(
              409,
              "Prévia com backup e hashes idênticos é obrigatória antes de ativar o piloto.",
              { code: "PILOT_PREVIEW_REQUIRED" }
            );
          const job = await tx.excelAgentJob.findFirst({
            where: { scope: "OFFICIAL_PILOT", status: { in: ["QUEUED", "RUNNING"] } }
          });
          if (job)
            throw new HttpError(409, "Excel Agent ainda possui job oficial em andamento.", {
              code: "PILOT_WRITE_IN_PROGRESS",
              commandId: job.commandId
            });
        }
        await tx.generalSetting.upsert({
          where: { key: "OPERATIONAL_MODE" },
          update: { value: mode, version: { increment: 1 } },
          create: { key: "OPERATIONAL_MODE", value: mode }
        });
        await tx.systemLog.create({
          data: {
            userId,
            action: "OPERATIONAL_MODE_CHANGED",
            entity: "GeneralSetting",
            message: `Modo alterado para ${mode} com confirmação explícita.`,
            metadata: {
              mode,
              officialExcelWrite: mode === "LIVE_APPROVAL_PILOT",
              officialExcelWriteScope:
                mode === "LIVE_APPROVAL_PILOT" ? "PILOT_WHITELIST_ONLY" : "BLOCKED",
              whatsappSend: false,
              whatsappReaction: false
            },
            result: "SUCCESS"
          }
        });
      });
      res.json(await status(prisma, res.locals.user));
    } catch (error) {
      next(error);
    }
  });
  return router;
}

async function status(prisma: PrismaClient, user?: { mustChangePassword?: boolean }) {
  const setting = await prisma.generalSetting.findUnique({ where: { key: "OPERATIONAL_MODE" } });
  const mode = (setting?.value ?? "SIMULATION") as OperationalMode;
  const whatsappStatus = await prisma.integrationStatus.findUnique({ where: { kind: "WHATSAPP" } });
  const pilot = mode === "LIVE_APPROVAL_PILOT";
  const runtimeBlockers = pilotRuntimeBlockers(user);
  return {
    mode,
    confirmationRequired: confirmations,
    postgres: "CONNECTED",
    whatsapp:
      whatsappStatus?.state === "ONLINE"
        ? "CONNECTED"
        : mode === "SIMULATION"
          ? "SIMULATED"
          : "NOT_CONNECTED",
    whatsappSource: whatsappStatus?.state === "ONLINE" ? "REAL_SHADOW" : null,
    whatsappReadOnly: mode === "SHADOW" || pilot,
    officialExcelReadOnly: !pilot,
    officialExcelWrite: pilot && runtimeBlockers.length === 0,
    officialExcelWriteScope: pilot ? "PILOT_WHITELIST_ONLY" : "BLOCKED",
    sendMessage: false,
    sendReaction: false,
    groupUpdate: false,
    deleteMessage: false,
    shadowFallback: true,
    runtimeBlockers,
    localOperationalExcelWrite:
      mode === "LOCAL_OPERATIONAL" && process.env.LOCAL_OPERATIONAL_EXCEL_WRITE === "true",
    banner:
      mode === "LOCAL_OPERATIONAL"
        ? "OPERAÇÃO ATIVA — WhatsApp conectado para leitura; Excel real habilitado para alterações aprovadas."
        : "OPERAÇÃO AGUARDANDO ATIVAÇÃO"
  };
}

async function validUserId(prisma: PrismaClient, userId?: string) {
  if (!userId) return undefined;
  return (await prisma.user.findUnique({ where: { id: userId }, select: { id: true } }))?.id;
}
