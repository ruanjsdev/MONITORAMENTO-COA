import { Operation, WhatsAppGroup } from "@coa-bot/shared";

export type { Operation, WhatsAppGroup };

export type Dashboard = {
  simulationMode: boolean;
  api: string;
  database: string;
  whatsapp: string;
  excelAgent: string;
  groupsCount: number;
  operationsCount: number;
  pendingChanges: number;
  latestMessages: string[];
  latestEvents: string[];
  nextScheduledReport: string;
  nextShiftChange: string;
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
  status: string;
};

export type SpreadsheetFile = {
  file: string;
  path: string;
  sizeBytes: number;
  sheetCount: number;
  sheets: string[];
  sheetDetails: Array<{
    name: string;
    state: string;
    dimension: string;
    formulas: number;
    mergedCells: number;
    protected: boolean;
    official?: boolean;
    confirmationStatus?: string;
    humanNotes?: string;
    candidateColumns: Record<string, Array<{ column: string; header: string; row: number }>>;
    candidateImageArea: string;
  }>;
  hiddenSheets: number;
  macrosDetected: boolean;
  externalLinksDetected: boolean;
  linkedOperations: string[];
  risks: string[];
  analysisState: string;
  excelAgentStatus: string;
  lastAnalysis: string;
};

export type SpreadsheetResponse = {
  files: SpreadsheetFile[];
  risks: unknown;
};

export type TestResult = {
  simulated: boolean;
  action: string;
  title: string;
  operation: string;
  group: string;
  shift: string;
  usedAt: string;
  spreadsheet: string;
  sheet: string;
  range: string;
  logs: string[];
};
