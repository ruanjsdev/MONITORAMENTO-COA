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

export type StopMetrics={todayMinutes:number;shiftMinutes:number;weekMinutes:number;stopCount:number;longestMinutes:number;lastStopAt?:string;runningSince?:string};
export type FleetState={fleet:string;status:string;description:string;operation:string;sector:string;updatedAt:string;stoppedMinutes:number;stopMetrics:StopMetrics};
export type OperationalEventView={id:string;timestamp:string;type:string;operation?:string;fleet?:string;implement?:string;group?:string;shift?:string;user?:string;newStatus?:string;newDescription?:string;source:string;originalMessage?:string;observation?:string;approved:boolean;responsible?:string;priority:string};
export type FleetHistory={state:FleetState;events:OperationalEventView[];today:OperationalEventView[];week:OperationalEventView[];month:OperationalEventView[];messages:OperationalEventView[];pendencies:OperationalEventView[]};
export type OperationalSearchResult={currentState:FleetState[];events:OperationalEventView[];histories:FleetHistory[]};
export type OperationalSnapshot={simulationMode:boolean;shift:string;shiftEndsAt:string;fleets:FleetState[];messages:Array<{id:string;text:string;status:string;receivedAt:string}>;pendencies:Array<{id:string;operation:string;subject:string;reason:string;since:string;priority:string;status:string}>;systems:Array<{id:string;name:string;state:string;message:string}>;operations:string[];operationSummary:Array<{operation:string;machines:number;stopped:number;updatedAt:string}>;timeline:OperationalEventView[];nextReport:string;shiftReportStatus:string};
