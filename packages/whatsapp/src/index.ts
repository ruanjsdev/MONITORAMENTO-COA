import { ONLY_ALLOWED_REACTION, canSendReaction } from "@coa-bot/shared";

export type WhatsAppConnectionMode = "qr" | "pairing-code";

export type OperationalEventWhatsAppCommand = {
  type: "RECORD_OPERATIONAL_EVENT";
  eventId: string;
  group?: string;
  text: string;
  execute: false;
  simulated: true;
  reaction: null;
};

export type WhatsAppClient = {
  connect(mode: WhatsAppConnectionMode): Promise<void>;
  listGroups(): Promise<Array<{ id: string; name: string }>>;
  receiveMessages(): AsyncIterable<unknown>;
  reactToOriginalMessage(input: {
    messageId: string;
    reaction: string;
    approvedByAdmin: boolean;
    databaseUpdated: boolean;
    excelUpdated: boolean;
    cellsConfirmed: boolean;
    historyRegistered: boolean;
  }): Promise<{ sent: boolean; reason: string }>;
  sendShiftReport(groupId: string, text: string): Promise<{ simulated: boolean }>;
};

export class SimulatedWhatsAppClient implements WhatsAppClient {
  constructor(private readonly simulationMode = true) {}

  async connect(): Promise<void> {
    return;
  }

  async listGroups(): Promise<Array<{ id: string; name: string }>> {
    return [{ id: "sim-group-coa", name: "COA Simulado" }];
  }

  async *receiveMessages(): AsyncIterable<unknown> {
    yield {
      id: "sim-message-1",
      group: "COA Simulado",
      sender: "Operador Simulado",
      text: "Frota 625 parada por falha no bico injetor"
    };
  }

  async reactToOriginalMessage(input: {
    messageId: string;
    reaction: string;
    approvedByAdmin: boolean;
    databaseUpdated: boolean;
    excelUpdated: boolean;
    cellsConfirmed: boolean;
    historyRegistered: boolean;
  }): Promise<{ sent: boolean; reason: string }> {
    const allowed = canSendReaction({ ...input, simulationMode: this.simulationMode });
    if (!allowed) {
      return {
        sent: false,
        reason:
          input.reaction !== ONLY_ALLOWED_REACTION
            ? "A unica reacao permitida e 👍."
            : "Reacao bloqueada por simulacao ou pre-condicoes incompletas."
      };
    }
    return { sent: true, reason: "👍 enviado." };
  }

  async sendShiftReport(): Promise<{ simulated: boolean }> {
    return { simulated: this.simulationMode };
  }
}
