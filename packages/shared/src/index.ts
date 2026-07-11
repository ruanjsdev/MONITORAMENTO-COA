export const SIMULATION_BANNER = "MODO DE SIMULAÇÃO ATIVO — nenhuma alteração externa será executada.";

export const ONLY_ALLOWED_REACTION = "👍";

export type RoleName = "ADMIN" | "GESTOR" | "OPERADOR" | "SUPORTE";

export type IntegrationState = "online" | "offline" | "simulated" | "error";

export type PendingChangeStatus = "PENDING" | "APPROVED_SIMULATED" | "REJECTED" | "DEFERRED";

export type OperationStatus = "active" | "paused" | "not_updated";

export type AuditAction =
  | "LOGIN"
  | "GROUP_CREATED"
  | "OPERATION_CREATED"
  | "MESSAGE_RECEIVED_SIMULATED"
  | "PENDING_CHANGE_CREATED"
  | "PENDING_CHANGE_APPROVED_SIMULATED"
  | "PENDING_CHANGE_REJECTED"
  | "PENDING_CHANGE_DEFERRED"
  | "NOTIFICATION_TEST"
  | "EXCEL_AGENT_ONLINE"
  | "EXTERNAL_ACTION_BLOCKED_BY_SIMULATION";

export type UserSession = {
  id: string;
  name: string;
  email: string;
  roles: RoleName[];
};

export type WhatsAppGroup = {
  id: string;
  name: string;
  externalId?: string;
  description?: string;
  isActive: boolean;
  isMonitored: boolean;
  receivesReports: boolean;
  allowTests?: boolean;
  allowedHours?: string;
  notes?: string;
  operationIds: string[];
  defaultMessage: string;
  lastMessage?: string;
  lastActivity?: string;
  processedMessages?: number;
  connectionStatus?: IntegrationState;
  isTestGroup?: boolean;
};

export type Operation = {
  id: string;
  name: string;
  shortName?: string;
  emoji: string;
  description?: string;
  spreadsheetFile: string;
  sheetName: string;
  groupIds: string[];
  destinationGroupId?: string;
  allowedStatuses: string[];
  synonyms?: string;
  shifts?: string[];
  reportTimes?: string;
  legendTemplate?: string;
  requiresApproval?: boolean;
  imageRange?: string;
  fleetColumn?: string;
  implementColumn?: string;
  statusColumn?: string;
  descriptionColumn?: string;
  timeColumn?: string;
  fleetCount?: number;
  automaticReport?: boolean;
  monitor: boolean;
  status: OperationStatus;
  lastUpdate?: string;
};

export type PendingChange = {
  id: string;
  operation: string;
  equipment: string;
  currentStatus: string;
  newStatus: string;
  description: string;
  originalMessage: string;
  group: string;
  sender: string;
  receivedAt: string;
  confidence: number;
  status: PendingChangeStatus;
  idempotencyKey: string;
};

export type DashboardSnapshot = {
  simulationMode: boolean;
  api: IntegrationState;
  database: IntegrationState;
  whatsapp: IntegrationState;
  excelAgent: IntegrationState;
  groupsCount: number;
  operationsCount: number;
  pendingChanges: number;
  latestMessages: string[];
  latestEvents: string[];
  nextScheduledReport: string;
  nextShiftChange: string;
};

export function canSendReaction(options: {
  simulationMode: boolean;
  approvedByAdmin: boolean;
  databaseUpdated: boolean;
  excelUpdated: boolean;
  cellsConfirmed: boolean;
  historyRegistered: boolean;
  reaction: string;
}): boolean {
  return (
    !options.simulationMode &&
    options.reaction === ONLY_ALLOWED_REACTION &&
    options.approvedByAdmin &&
    options.databaseUpdated &&
    options.excelUpdated &&
    options.cellsConfirmed &&
    options.historyRegistered
  );
}
