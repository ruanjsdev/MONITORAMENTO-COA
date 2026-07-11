import bcrypt from "bcryptjs";
import {
  DashboardSnapshot,
  IntegrationState,
  Operation,
  PendingChange,
  SIMULATION_BANNER,
  UserSession,
  WhatsAppGroup
} from "@coa-bot/shared";

export type Store = ReturnType<typeof createStore>;

function id(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createStore() {
  const simulationMode = process.env.SIMULATION_MODE !== "false";
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@coa.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "change-me";
  const passwordHash = bcrypt.hashSync(adminPassword, 12);
  const now = new Date().toISOString();

  const users = [
    {
      id: "user_admin",
      name: "Administrador COA",
      email: adminEmail,
      passwordHash,
      roles: ["ADMIN" as const]
    }
  ];

  const groups: WhatsAppGroup[] = [
    {
      id: "group_coa_sim",
      name: "COA Simulado",
      externalId: "sim-group-coa@g.us",
      description: "Grupo de desenvolvimento para testes sem envio real.",
      isActive: true,
      isMonitored: true,
      receivesReports: true,
      allowTests: true,
      allowedHours: "00:00-23:59",
      notes: "Nenhuma mensagem real sera enviada enquanto SIMULATION_MODE=true.",
      isTestGroup: true,
      operationIds: ["op_plantio", "op_cpd"],
      defaultMessage: "Grupo simulado para desenvolvimento.",
      lastMessage: "Frota 625 parou por falha no bico injetor",
      lastActivity: now,
      processedMessages: 1,
      connectionStatus: "simulated"
    }
  ];

  const operations: Operation[] = [
    {
      id: "op_plantio",
      name: "Plantio Mecanizado",
      shortName: "Plantio",
      emoji: "🚜",
      description: "Operacao de plantio mecanizado vinculada a aba PLANTIO.",
      spreadsheetFile: "Planilha Plantio cana.xlsm",
      sheetName: "PLANTIO",
      groupIds: ["group_coa_sim"],
      destinationGroupId: "group_coa_sim",
      allowedStatuses: ["RODANDO", "PARADO", "MANUTENCAO", "DISPONIVEL"],
      synonyms: "rodando=em operação; parado=parada; manutenção=oficina",
      shifts: ["A", "B", "C"],
      reportTimes: "05:45, 13:45, 21:45",
      legendTemplate: "{emoji} {operacao}: {resumo}",
      requiresApproval: true,
      imageRange: "A1:AI26",
      fleetColumn: "F",
      implementColumn: "G",
      statusColumn: "H",
      descriptionColumn: "S",
      timeColumn: "L",
      fleetCount: 8,
      automaticReport: false,
      monitor: true,
      status: "active",
      lastUpdate: now
    },
    {
      id: "op_cpd",
      name: "CPD",
      shortName: "CPD",
      emoji: "🧪",
      description: "Operacao de CPD vinculada a planilha de tratos culturais.",
      spreadsheetFile: "Acompanhamento Tratos Culturais.xlsm",
      sheetName: "CPD",
      groupIds: ["group_coa_sim"],
      destinationGroupId: "group_coa_sim",
      allowedStatuses: ["RODANDO", "PARADO", "MANUTENCAO", "DISPONIVEL"],
      synonyms: "aplicando=rodando; parado=parada",
      shifts: ["A", "B", "C"],
      reportTimes: "05:45",
      legendTemplate: "{emoji} {operacao}: {situacao}",
      requiresApproval: true,
      imageRange: "A1:AH51",
      fleetColumn: "F",
      implementColumn: "G",
      statusColumn: "H",
      descriptionColumn: "S",
      timeColumn: "L",
      fleetCount: 3,
      automaticReport: false,
      monitor: true,
      status: "active",
      lastUpdate: now
    },
    {
      id: "op_colheita_muda",
      name: "Colheita de Muda",
      shortName: "Muda",
      emoji: "🌱",
      description: "Colheita e transporte de muda.",
      spreadsheetFile: "Planilha Plantio cana.xlsm",
      sheetName: "COLHEITA E TRANSPORTE DE MUDA",
      groupIds: ["group_coa_sim"],
      destinationGroupId: "group_coa_sim",
      allowedStatuses: ["RODANDO", "PARADO", "DESLOCAMENTO", "DISPONIVEL"],
      synonyms: "",
      shifts: ["A", "B", "C"],
      reportTimes: "",
      legendTemplate: "{emoji} {operacao}: {resumo}",
      requiresApproval: true,
      imageRange: "A1:AJ25",
      fleetColumn: "F",
      implementColumn: "G",
      statusColumn: "H",
      descriptionColumn: "S",
      timeColumn: "L",
      fleetCount: 5,
      automaticReport: false,
      monitor: true,
      status: "active",
      lastUpdate: now
    },
    {
      id: "op_preparo_solo",
      name: "Preparo de Solo",
      shortName: "Preparo",
      emoji: "🚛",
      description: "Preparo de solo com mapeamento em homologacao.",
      spreadsheetFile: "Planilha Plantio cana.xlsm",
      sheetName: "PREPARO DE SOLO",
      groupIds: ["group_coa_sim"],
      destinationGroupId: "group_coa_sim",
      allowedStatuses: ["RODANDO", "PARADO", "SEM AREA", "AGUARDANDO SOLO"],
      synonyms: "",
      shifts: ["A", "B", "C"],
      reportTimes: "",
      legendTemplate: "{emoji} {operacao}: {resumo}",
      requiresApproval: true,
      imageRange: "A1:AL37",
      fleetColumn: "F",
      implementColumn: "G",
      statusColumn: "H",
      descriptionColumn: "S",
      timeColumn: "L",
      fleetCount: 4,
      automaticReport: false,
      monitor: true,
      status: "not_updated",
      lastUpdate: now
    },
    {
      id: "op_cultivo",
      name: "Cultivo",
      shortName: "Cultivo",
      emoji: "🌿",
      description: "Cultivo em tratos culturais.",
      spreadsheetFile: "Acompanhamento Tratos Culturais.xlsm",
      sheetName: "CULTIVO",
      groupIds: ["group_coa_sim"],
      destinationGroupId: "group_coa_sim",
      allowedStatuses: ["RODANDO", "PARADO", "MANUTENCAO", "DISPONIVEL"],
      synonyms: "",
      shifts: ["A", "B", "C"],
      reportTimes: "",
      legendTemplate: "{emoji} {operacao}: {resumo}",
      requiresApproval: true,
      imageRange: "A1:AH50",
      fleetColumn: "F",
      implementColumn: "G",
      statusColumn: "H",
      descriptionColumn: "S",
      timeColumn: "L",
      fleetCount: 6,
      automaticReport: false,
      monitor: true,
      status: "active",
      lastUpdate: now
    },
    {
      id: "op_correcao_solo",
      name: "Correção de Solo",
      shortName: "Correção",
      emoji: "🧱",
      description: "Correção de solo em tratos culturais.",
      spreadsheetFile: "Acompanhamento Tratos Culturais.xlsm",
      sheetName: "CORREÇÃO DE SOLO",
      groupIds: ["group_coa_sim"],
      destinationGroupId: "group_coa_sim",
      allowedStatuses: ["RODANDO", "PARADO", "DISPONIVEL"],
      synonyms: "",
      shifts: ["A", "B", "C"],
      reportTimes: "",
      legendTemplate: "{emoji} {operacao}: {resumo}",
      requiresApproval: true,
      imageRange: "A1:AH36",
      fleetColumn: "F",
      implementColumn: "G",
      statusColumn: "H",
      descriptionColumn: "S",
      timeColumn: "L",
      fleetCount: 2,
      automaticReport: false,
      monitor: true,
      status: "active",
      lastUpdate: now
    },
    {
      id: "op_compostagem",
      name: "Compostagem",
      shortName: "Compostagem",
      emoji: "♻️",
      description: "Transporte e operacao de compostagem.",
      spreadsheetFile: "Acompanhamento Tratos Culturais.xlsm",
      sheetName: "COMPOSTAGEM",
      groupIds: ["group_coa_sim"],
      destinationGroupId: "group_coa_sim",
      allowedStatuses: ["RODANDO", "PARADO", "DISPONIVEL"],
      synonyms: "",
      shifts: ["A", "B", "C"],
      reportTimes: "",
      legendTemplate: "{emoji} {operacao}: {resumo}",
      requiresApproval: true,
      imageRange: "A1:AH29",
      fleetColumn: "F",
      implementColumn: "G",
      statusColumn: "H",
      descriptionColumn: "S",
      timeColumn: "L",
      fleetCount: 4,
      automaticReport: false,
      monitor: true,
      status: "active",
      lastUpdate: now
    }
  ];

  const pendingChanges: PendingChange[] = [
    {
      id: "chg_625",
      operation: "Plantio Mecanizado",
      equipment: "625",
      currentStatus: "RODANDO",
      newStatus: "PARADO",
      description: "Frota 625 parada por falha no bico injetor.",
      originalMessage: "Frota 625 parou por falha no bico injetor",
      group: "COA Simulado",
      sender: "Operador Simulado",
      receivedAt: now,
      confidence: 0.91,
      status: "PENDING",
      idempotencyKey: "seed-message-625"
    }
  ];

  const latestMessages = ["Frota 625 parou por falha no bico injetor"];
  const latestEvents = ["Pendência simulada criada para frota 625"];
  const logs: Array<{ action: string; message: string; metadata?: unknown; createdAt: string }> = [
    { action: "SYSTEM_BOOT", message: SIMULATION_BANNER, createdAt: now }
  ];

  function dashboard(): DashboardSnapshot {
    return {
      simulationMode,
      api: "online",
      database: "simulated",
      whatsapp: "simulated",
      excelAgent: "simulated",
      groupsCount: groups.length,
      operationsCount: operations.length,
      pendingChanges: pendingChanges.filter((change) => change.status === "PENDING").length,
      latestMessages,
      latestEvents,
      nextScheduledReport: "Simulado: 06:00",
      nextShiftChange: "Simulado: Turno C - 05:45"
    };
  }

  return {
    simulationMode,
    users,
    groups,
    operations,
    pendingChanges,
    latestMessages,
    latestEvents,
    logs,
    integrationStatus: new Map<string, IntegrationState>([
      ["api", "online"],
      ["database", "simulated"],
      ["whatsapp", "simulated"],
      ["excelAgent", "simulated"]
    ]),
    dashboard,
    makeId: id,
    log(action: string, message: string, metadata?: unknown) {
      logs.unshift({ action, message, metadata, createdAt: new Date().toISOString() });
    },
    sessionFor(user: (typeof users)[number]): UserSession {
      return { id: user.id, name: user.name, email: user.email, roles: [...user.roles] };
    }
  };
}
