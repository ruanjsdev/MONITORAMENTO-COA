import { WhatsAppGroup } from "../../types";

export function emptyGroup(): WhatsAppGroup {
  return {
    id: "",
    name: "",
    externalId: "",
    description: "",
    isActive: true,
    isMonitored: true,
    receivesReports: false,
    allowTests: true,
    allowedHours: "",
    notes: "",
    isTestGroup: false,
    operationIds: [],
    defaultMessage: "",
    connectionStatus: "simulated",
    processedMessages: 0
  };
}
