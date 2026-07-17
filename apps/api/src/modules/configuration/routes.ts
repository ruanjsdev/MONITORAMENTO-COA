import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { LOCAL_OPERATIONAL_WORKBOOKS, validateLocalOperationalWorkbook } from "@coa-bot/excel-contracts";
import { asyncHandler } from "../../middleware/async-handler.js";
import { HttpError } from "../../errors/http-error.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
const workbookRoot = path.resolve(projectRoot, process.env.LOCAL_OPERATIONAL_WORKBOOK_ROOT?.trim() || "planilhas-homologacao");
const officialRoot = path.resolve(projectRoot, "planilhas");

export const configurationImportSchema = z.object({
  schemaVersion: z.literal(1),
  exportedAt: z.string(),
  configuration: z.object({
    operations: z.array(z.object({
      name: z.string().min(1),
      shortName: z.string().optional().nullable(),
      emoji: z.string().optional().nullable(),
      spreadsheetFile: z.string().optional().nullable(),
      sheetName: z.string().optional().nullable(),
      imageRange: z.string().optional().nullable(),
      fleetColumn: z.string().optional().nullable(),
      implementColumn: z.string().optional().nullable(),
      statusColumn: z.string().optional().nullable(),
      descriptionColumn: z.string().optional().nullable(),
      timeColumn: z.string().optional().nullable(),
      allowedStatuses: z.array(z.string()).optional()
    })).default([]),
    mappings: z.array(z.object({
      operationName: z.string(),
      sheetName: z.string(),
      headerRow: z.number().int().nullable().optional(),
      fleetColumn: z.string().nullable().optional(),
      implementColumn: z.string().nullable().optional(),
      statusColumn: z.string().nullable().optional(),
      descriptionColumn: z.string().nullable().optional(),
      timeColumn: z.string().nullable().optional(),
      imageRange: z.string().nullable().optional(),
      confirmationStatus: z.string().nullable().optional()
    })).default([]),
    groups: z.array(z.object({
      name: z.string(),
      description: z.string().nullable().optional(),
      isActive: z.boolean().optional(),
      isMonitored: z.boolean().optional(),
      receivesReports: z.boolean().optional(),
      allowTests: z.boolean().optional()
    })).default([]),
    settings: z.record(z.unknown()).default({}),
    visualPreferences: z.record(z.unknown()).default({})
  })
});

export const allowedConfigurationSettings = ["OPERATIONAL_MODE", "SIMULATION_MODE", "SHIFT_CONFIG", "PANEL_PREFERENCES", "WHATSAPP_GROUP_REFRESH"] as const;
const allowedSettings = new Set<string>(allowedConfigurationSettings);

export function configurationRoutes(prisma = new PrismaClient()) {
  const router = Router();

  router.get("/export", asyncHandler(async (_req, res) => {
    const [operations, mappings, groups, settings] = await Promise.all([
      prisma.operation.findMany({ orderBy: { name: "asc" } }),
      prisma.spreadsheetMapping.findMany({ where: { active: true }, orderBy: { operationName: "asc" } }),
      prisma.whatsAppGroup.findMany({ orderBy: { name: "asc" } }),
      prisma.generalSetting.findMany({ where: { key: { in: [...allowedSettings] }, active: true } })
    ]);
    res.json({
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      configuration: {
        operations: operations.map(({ name, shortName, emoji, spreadsheetFile, sheetName, imageRange, fleetColumn, implementColumn, statusColumn, descriptionColumn, timeColumn, allowedStatuses, shifts, reportTimes, legendTemplate, requiresApproval, monitor }) => ({ name, shortName, emoji, spreadsheetFile, sheetName, imageRange, fleetColumn, implementColumn, statusColumn, descriptionColumn, timeColumn, allowedStatuses, shifts, reportTimes, legendTemplate, requiresApproval, monitor })),
        mappings: mappings.map(({ operationName, sheetName, headerRow, fleetColumn, implementColumn, statusColumn, descriptionColumn, timeColumn, imageRange, confirmationStatus, editableFields, protectedFields, notes }) => ({ operationName, sheetName, headerRow, fleetColumn, implementColumn, statusColumn, descriptionColumn, timeColumn, imageRange, confirmationStatus, editableFields, protectedFields, notes })),
        groups: groups.map(({ name, description, isActive, isMonitored, receivesReports, allowTests, allowedHours, notes }) => ({ name, description, isActive, isMonitored, receivesReports, allowTests, allowedHours, notes })),
        settings: Object.fromEntries(settings.map(setting => [setting.key, setting.value])),
        visualPreferences: {}
      }
    });
  }));

  router.post("/import", asyncHandler(async (req, res) => {
    const parsed = configurationImportSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "Arquivo de configuração inválido.", parsed.error.issues);
    const value = parsed.data.configuration;
    await prisma.$transaction(async tx => {
      for (const operation of value.operations) {
        await tx.operation.upsert({
          where: { name: operation.name },
          update: { ...operation, emoji: operation.emoji ?? "🚜", allowedStatuses: operation.allowedStatuses ?? [] },
          create: { ...operation, emoji: operation.emoji ?? "🚜", allowedStatuses: operation.allowedStatuses ?? [] }
        });
      }
      for (const group of value.groups) {
        const existing = await tx.whatsAppGroup.findFirst({ where: { name: group.name } });
        if (existing) await tx.whatsAppGroup.update({ where: { id: existing.id }, data: group });
        else await tx.whatsAppGroup.create({ data: { name: group.name, description: group.description ?? "", isActive: group.isActive ?? true, isMonitored: group.isMonitored ?? false, receivesReports: group.receivesReports ?? false, allowTests: group.allowTests ?? true } });
      }
      for (const [key, setting] of Object.entries(value.settings)) {
        if (!allowedSettings.has(key)) continue;
        await tx.generalSetting.upsert({ where: { key }, update: { value: setting as never, version: { increment: 1 } }, create: { key, value: setting as never } });
      }
      await tx.systemLog.create({ data: { action: "CONFIGURATION_IMPORTED", message: "Configuração operacional importada sem segredos ou dados operacionais.", metadata: { schemaVersion: parsed.data.schemaVersion, operations: value.operations.length, groups: value.groups.length } } });
    });
    res.json({ imported: true, schemaVersion: parsed.data.schemaVersion, operations: value.operations.length, groups: value.groups.length });
  }));

  router.get("/first-run", asyncHandler(async (_req, res) => {
    const [userCount, operationCount, selectedGroup, mode] = await Promise.all([
      prisma.user.count(),
      prisma.operation.count(),
      prisma.whatsAppGroup.findFirst({ where: { isTestGroup: true, isMonitored: true, isActive: true, active: true } }),
      prisma.generalSetting.findUnique({ where: { key: "OPERATIONAL_MODE" } })
    ]);
    const workbooks = LOCAL_OPERATIONAL_WORKBOOKS.map(item => {
      const validation = validateLocalOperationalWorkbook({ id: item.id, root: workbookRoot, officialRoot, mustExist: false });
      return { id: item.id, name: item.fileName, complete: validation.exists };
    });
    const steps = [
      { id: "environment", title: "Ambiente", complete: Boolean(process.env.JWT_SECRET && process.env.EXCEL_AGENT_TOKEN && process.env.WHATSAPP_SHADOW_TOKEN) },
      { id: "database", title: "Banco de dados", complete: userCount > 0 },
      { id: "workbooks", title: "Planilhas locais", complete: workbooks.every(item => item.complete), workbooks },
      { id: "excel", title: "Excel", complete: false, note: "Validado pelo setup Windows/Excel Agent" },
      { id: "whatsapp", title: "WhatsApp", complete: false, note: "Conecte pelo QR no diagnóstico" },
      { id: "group", title: "Grupo monitorado", complete: Boolean(selectedGroup) },
      { id: "operation", title: "Operação", complete: operationCount > 0 },
      { id: "summary", title: "Resumo e iniciar", complete: mode?.value === "LOCAL_OPERATIONAL" }
    ];
    res.json({ newInstall: steps.some(step => !step.complete), steps });
  }));

  return router;
}
