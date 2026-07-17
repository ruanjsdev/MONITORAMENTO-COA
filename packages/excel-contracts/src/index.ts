export type ExcelCommandType =
  | "CHECK_EXCEL_INSTALLED"
  | "LIST_OPEN_WORKBOOKS"
  | "OPEN_DEV_WORKBOOK"
  | "OPEN_LOCAL_WORKBOOK"
  | "OPEN_LOCAL_FOLDER"
  | "LIST_WORKSHEETS"
  | "READ_CELL"
  | "READ_RANGE"
  | "READ_OPERATION_SHEETS"
  | "FIND_EQUIPMENT"
  | "PREVIEW_CHANGE"
  | "APPLY_CHANGE"
  | "VERIFY_CHANGE"
  | "SAVE_DEV_WORKBOOK"
  | "COPY_RANGE_AS_PICTURE"
  | "EXPORT_TEMP_IMAGE"
  | "DELETE_TEMP_IMAGE"
  | "HEALTH_CHECK"
  | "PREPARE_OFFICIAL_PILOT"
  | "APPLY_OFFICIAL_PILOT"
  | "ROLLBACK_OFFICIAL_PILOT";
export type ExcelCommandPayload = {
  cell?: string;
  range?: string;
  sheets?: Array<{ operation: string; worksheet: string; range: string }>;
  fleet?: string;
  implement?: string;
  fleetColumn?: string;
  implementColumn?: string;
  headerRow?: number;
  row?: number;
  statusCell?: string;
  descriptionCell?: string;
  timeCell?: string;
  startDateCell?: string;
  startTimeCell?: string;
  forecastDateCell?: string;
  forecastTimeCell?: string;
  expectedCurrent?: Record<string, unknown>;
  proposed?: Record<string, unknown>;
  editableFields?: string[];
  mappingConfirmed?: boolean;
  tempPath?: string;
  backupPath?: string;
  backupHash?: string;
  expectedWorkbookHash?: string;
  expectedCurrentHash?: string;
  confirmation?: string;
};
export type ExcelAgentCommand = {
  commandId: string;
  correlationId: string;
  requestedAt: string;
  requestedBy: string;
  type: ExcelCommandType;
  workbook?: string;
  worksheet?: string;
  payload: ExcelCommandPayload;
  simulation: boolean;
  timeoutMs?: number;
  expiresAt?: string;
};
export type ExcelCommandResult = {
  commandId: string;
  correlationId: string;
  type: ExcelCommandType;
  success: boolean;
  result?: unknown;
  error?: { code: string; message: string; details?: unknown };
  duration: number;
  completedAt: string;
  simulation: boolean;
  executed: boolean;
  macrosExecuted: false;
  officialWorkbookTouched: boolean;
};
export type ExcelMapping = {
  operation: string;
  workbook: string;
  worksheet: string;
  fleetColumn: string;
  statusColumn: string;
  descriptionColumn: string;
  timeColumn?: string;
  forecastColumn?: string;
  pictureRange: string;
  headerRow: number;
  editableFields: string[];
  confirmed: boolean;
  confirmedBy?: string;
  confirmedAt?: string;
};
export type ExcelChangePreview = {
  workbook: string;
  worksheet: string;
  row: number;
  fleet: string;
  attachments: string[];
  current: Record<string, unknown>;
  proposed: Record<string, unknown>;
  changedCells: Array<{ field: string; cell: string; from: unknown; to: unknown }>;
  unchangedFields: string[];
  baselineHash: string;
  mappingConfirmed: boolean;
};
export type EquipmentMatch = {
  status: "NOT_FOUND" | "UNIQUE_MATCH" | "AMBIGUOUS_MATCH";
  fleet: string;
  candidates: Array<{ row: number; cell: string; value: string; mergedArea?: string }>;
};
export type ExcelAgentStatus = {
  agentId: string;
  online: boolean;
  operatingSystem: string;
  version: string;
  simulationMode: boolean;
  homologationMode: boolean;
  excelInstalled: boolean | "unknown";
  configuredFiles: Array<{ path: string; exists: boolean; authorized: boolean }>;
  lastHeartbeat?: string;
};
export type OperationalEventExcelCommand = {
  type: "PROJECT_OPERATIONAL_EVENT";
  eventId: string;
  fleet: string;
  status?: string;
  description?: string;
  sector?: string;
  execute: false;
  simulated: true;
};
export * from "./operational-rules.js";
export * from "./official-pilot.js";
export * from "./local-workbooks.js";
