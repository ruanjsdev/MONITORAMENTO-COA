import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(12)
});

export const groupSchema = z.object({
  name: z.string().min(2),
  externalId: z.string().optional().default(""),
  description: z.string().optional().default(""),
  isActive: z.boolean().default(true),
  isMonitored: z.boolean().default(true),
  receivesReports: z.boolean().default(false),
  allowTests: z.boolean().default(true),
  allowedHours: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  isTestGroup: z.boolean().default(false),
  operationIds: z.array(z.string()).default([]),
  defaultMessage: z.string().max(500).default("")
});

export const operationSchema = z.object({
  name: z.string().min(2),
  shortName: z.string().optional().default(""),
  emoji: z.string().min(1).max(8),
  description: z.string().optional().default(""),
  spreadsheetFile: z.string().min(1),
  sheetName: z.string().min(1),
  groupIds: z.array(z.string()).default([]),
  destinationGroupId: z.string().optional().default(""),
  allowedStatuses: z.array(z.string()).min(1),
  synonyms: z.string().optional().default(""),
  shifts: z.array(z.string()).default([]),
  reportTimes: z.string().optional().default(""),
  legendTemplate: z.string().optional().default(""),
  requiresApproval: z.boolean().default(true),
  imageRange: z.string().optional().default(""),
  fleetColumn: z.string().optional().default(""),
  implementColumn: z.string().optional().default(""),
  statusColumn: z.string().optional().default(""),
  descriptionColumn: z.string().optional().default(""),
  timeColumn: z.string().optional().default(""),
  automaticReport: z.boolean().default(false),
  monitor: z.boolean().default(true)
});

export const pendingChangeDecisionSchema = z.object({
  decision: z.enum(["approve", "reject", "defer"]),
  description: z.string().max(1000).optional()
});

export const simulatedMessageSchema = z.object({
  idempotencyKey: z.string().min(8),
  group: z.string().min(1),
  sender: z.string().min(1),
  message: z.string().min(1),
  operation: z.string().min(1).default("Plantio Mecanizado"),
  equipment: z.string().min(1).default("Frota simulada"),
  newStatus: z.string().min(1).default("PARADO")
});
