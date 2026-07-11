export type ExcelAgentCommand =
  | { type: "READ_CELL"; workbookPath: string; sheet: string; cell: string }
  | { type: "READ_RANGE"; workbookPath: string; sheet: string; range: string }
  | { type: "LOCATE_EQUIPMENT"; workbookPath: string; sheet: string; equipment: string }
  | { type: "UPDATE_STATUS"; workbookPath: string; sheet: string; rowKey: string; status: string }
  | { type: "UPDATE_DESCRIPTION"; workbookPath: string; sheet: string; rowKey: string; description: string }
  | { type: "UPDATE_TIME"; workbookPath: string; sheet: string; rowKey: string; time: string }
  | { type: "SAVE_FILE"; workbookPath: string }
  | { type: "CONFIRM_UPDATE"; workbookPath: string; sheet: string; cell: string; expectedValue: string }
  | { type: "COPY_PICTURE"; workbookPath: string; sheet: string; range: string }
  | { type: "EXPORT_TEMP_IMAGE"; tempPath: string }
  | { type: "DELETE_TEMP_IMAGE"; tempPath: string };

export type ExcelAgentStatus = {
  agentId: string;
  online: boolean;
  operatingSystem: string;
  version: string;
  simulationMode: boolean;
  excelInstalled: boolean | "unknown";
  configuredFiles: Array<{ path: string; exists: boolean }>;
};
