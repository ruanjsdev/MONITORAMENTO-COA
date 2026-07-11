import { Operation } from "../../types";

export function emptyOperation(): Operation {
  return {
    id: "",
    name: "",
    shortName: "",
    emoji: "🚜",
    description: "",
    spreadsheetFile: "Planilha Plantio cana.xlsm",
    sheetName: "PLANTIO",
    groupIds: [],
    destinationGroupId: "",
    allowedStatuses: ["RODANDO", "PARADO"],
    synonyms: "",
    shifts: ["A", "B", "C"],
    reportTimes: "",
    legendTemplate: "",
    requiresApproval: true,
    imageRange: "",
    fleetColumn: "",
    implementColumn: "",
    statusColumn: "",
    descriptionColumn: "",
    timeColumn: "",
    fleetCount: 0,
    automaticReport: false,
    monitor: true,
    status: "active"
  };
}
