import { OFFICIAL_PILOT_POLICY, OfficialPilotField } from "@coa-bot/excel-contracts";

export type PilotScope = {
  groupName: string;
  groupJid: string;
  operation: string;
  workbook: string;
  worksheet: string;
  fleet: string;
  implement: string;
  columns?: string[];
};

export function configuredPilotGroupJid() {
  return process.env.OFFICIAL_PILOT_GROUP_JID?.trim() ?? "";
}

export function pilotRuntimeBlockers(user?: { mustChangePassword?: boolean }): string[] {
  const blockers: string[] = [];
  if (process.env.OFFICIAL_EXCEL_WRITE !== "true") blockers.push("OFFICIAL_EXCEL_WRITE_DISABLED");
  const jwt = process.env.JWT_SECRET?.trim() ?? "";
  const excelToken = process.env.EXCEL_AGENT_TOKEN?.trim() ?? "";
  const whatsappToken = process.env.WHATSAPP_SHADOW_TOKEN?.trim() ?? "";
  const host = process.env.API_HOST?.trim() || "127.0.0.1";
  if (jwt.length < 32 || jwt === "change-me-in-development") blockers.push("PILOT_JWT_SECRET_WEAK");
  if (excelToken.length < 32) blockers.push("PILOT_EXCEL_TOKEN_WEAK");
  if (whatsappToken.length < 32) blockers.push("PILOT_WHATSAPP_TOKEN_WEAK");
  if (!process.env.OFFICIAL_PLANTIO_WORKBOOK?.trim()) blockers.push("PILOT_WORKBOOK_CONFIG_MISSING");
  if (!configuredPilotGroupJid()) blockers.push("PILOT_GROUP_CONFIG_MISSING");
  if (!new Set(["127.0.0.1", "localhost", "::1"]).has(host.toLowerCase())) blockers.push("PILOT_API_NETWORK_EXPOSED");
  if (user?.mustChangePassword) blockers.push("PILOT_PASSWORD_CHANGE_REQUIRED");
  return blockers;
}

export function pilotScopeBlockers(scope: PilotScope): string[] {
  const policy = OFFICIAL_PILOT_POLICY;
  const allowedGroupJid = configuredPilotGroupJid();
  const blockers: string[] = [];
  if (!allowedGroupJid) blockers.push("PILOT_GROUP_CONFIG_MISSING");
  else if (scope.groupName.trim() !== policy.groupName || scope.groupJid !== allowedGroupJid) blockers.push("PILOT_GROUP_BLOCKED");
  if (scope.operation !== policy.operation) blockers.push("PILOT_OPERATION_BLOCKED");
  if (!scope.workbook.toLowerCase().endsWith(policy.workbookName.toLowerCase())) blockers.push("PILOT_WORKBOOK_BLOCKED");
  if (scope.worksheet !== policy.worksheet) blockers.push("PILOT_WORKSHEET_BLOCKED");
  if (scope.fleet !== policy.fleet) blockers.push("PILOT_FLEET_BLOCKED");
  if (scope.implement !== policy.implement) blockers.push("PILOT_IMPLEMENT_BLOCKED");
  if (scope.columns) {
    const allowed = new Set(Object.values(policy.columns));
    if (scope.columns.length !== allowed.size || scope.columns.some(column => !allowed.has(column as never))) blockers.push("PILOT_COLUMNS_BLOCKED");
  }
  return blockers;
}

export function pilotProposedValues(normalized: Record<string, unknown>) {
  const status = String(normalized.status ?? "").toUpperCase();
  const values: Record<OfficialPilotField, unknown> = {
    status,
    startDate: normalized.startDate ?? "",
    startTime: normalized.startTime ?? "",
    forecastDate: normalized.forecastDate ?? "",
    forecastTime: normalized.forecastTime ?? "",
    description: normalized.description ?? ""
  };
  if (status === "R") {
    values.description = "RODANDO";
    values.startDate = "";
    values.startTime = "";
    values.forecastDate = "";
    values.forecastTime = "";
  }
  return values;
}

export function firstPilotProposalBlockers(input: { currentStatus: string; newStatus: string; description: string; pendingStatus: string; source: unknown; normalized: Record<string, unknown> }) {
  const blockers: string[] = [];
  if (!['PENDING', 'APPROVED_SIMULATED'].includes(input.pendingStatus)) blockers.push("PILOT_PENDING_STATE_BLOCKED");
  if (input.source !== "WHATSAPP_SHADOW") blockers.push("PILOT_SOURCE_BLOCKED");
  if (input.currentStatus !== "P" || input.newStatus !== "R") blockers.push("PILOT_TRANSITION_BLOCKED");
  const proposed = pilotProposedValues(input.normalized);
  if (input.description.trim().toUpperCase() !== "RODANDO" || proposed.status !== "R" || proposed.description !== "RODANDO" || [proposed.startDate, proposed.startTime, proposed.forecastDate, proposed.forecastTime].some(value => value !== "")) blockers.push("PILOT_PROPOSAL_BLOCKED");
  return blockers;
}

export function maskPilotJid(jid: string) {
  const [number, domain] = jid.split("@");
  return `${number.slice(0, 5)}••••${number.slice(-4)}@${domain ?? "g.us"}`;
}
