import { PrismaClient, ChangeStatus, IntegrationKind, IntegrationState } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import {
  DashboardSnapshot,
  IntegrationState as SharedIntegrationState,
  Operation,
  PendingChange,
  SIMULATION_BANNER,
  UserSession,
  WhatsAppGroup
} from "@coa-bot/shared";
import { Store } from "../store.js";
import { HttpError } from "../errors/http-error.js";

export type LoginResult = {
  user: UserSession & { mustChangePassword?: boolean };
  tokenId: string;
};

export type TestExecutionInput = {
  type: string;
  userId?: string;
  operation: string;
  groupName: string;
  shift: string;
  legend?: string;
};

export type DataSource = {
  simulationMode: boolean;
  login(email: string, password: string, ip?: string): Promise<LoginResult>;
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
  logout(tokenId: string, userId?: string): Promise<void>;
  dashboard(): Promise<DashboardSnapshot>;
  listGroups(): Promise<WhatsAppGroup[]>;
  createGroup(input: Partial<WhatsAppGroup>, userId?: string): Promise<WhatsAppGroup>;
  updateGroup(id: string, input: Partial<WhatsAppGroup>, userId?: string): Promise<WhatsAppGroup>;
  deleteGroup(id: string, userId?: string): Promise<unknown>;
  testGroup(id: string, userId?: string): Promise<{ simulated: boolean; ok: boolean; message: string }>;
  listOperations(): Promise<Operation[]>;
  createOperation(input: Partial<Operation>, userId?: string): Promise<Operation>;
  updateOperation(id: string, input: Partial<Operation>, userId?: string): Promise<Operation>;
  deleteOperation(id: string, userId?: string): Promise<unknown>;
  listPendingChanges(): Promise<PendingChange[]>;
  decidePendingChange(id: string, decision: string, description?: string, userId?: string): Promise<unknown>;
  simulateMessage(input: {
    idempotencyKey: string;
    group: string;
    sender: string;
    message: string;
    operation: string;
    equipment: string;
    newStatus: string;
  }, userId?: string): Promise<PendingChange>;
  spreadsheets(): Promise<unknown>;
  reanalyzeSpreadsheets(userId?: string): Promise<{ simulated: boolean; message: string }>;
  testNotification(userId?: string): Promise<unknown>;
  registerExcelAgent(input: unknown): Promise<unknown>;
  excelAgentStatus(): Promise<unknown>;
  runTest(input: TestExecutionInput): Promise<unknown>;
  listTestExecutions(): Promise<unknown[]>;
  logs(): Promise<unknown[]>;
  log(action: string, message: string, options?: { userId?: string; entity?: string; entityId?: string; beforeValue?: unknown; afterValue?: unknown; metadata?: unknown; ipAddress?: string; result?: string }): Promise<void>;
};

function sharedState(state: IntegrationState): SharedIntegrationState {
  if (state === "ONLINE") return "online";
  if (state === "OFFLINE") return "offline";
  if (state === "ERROR") return "error";
  return "simulated";
}

function mapOperation(operation: any): Operation {
  return {
    id: operation.id,
    name: operation.name,
    shortName: operation.shortName ?? "",
    emoji: operation.emoji,
    description: operation.description ?? "",
    spreadsheetFile: operation.spreadsheetFile ?? "",
    sheetName: operation.sheetName ?? "",
    groupIds: operation.groups?.map((item: any) => item.groupId) ?? [],
    destinationGroupId: operation.destinationGroupId ?? "",
    allowedStatuses: operation.allowedStatuses ?? [],
    synonyms: operation.synonyms ?? "",
    shifts: operation.shifts ?? [],
    reportTimes: operation.reportTimes ?? "",
    legendTemplate: operation.legendTemplate ?? "",
    requiresApproval: operation.requiresApproval,
    imageRange: operation.imageRange ?? "",
    fleetColumn: operation.fleetColumn ?? "",
    implementColumn: operation.implementColumn ?? "",
    statusColumn: operation.statusColumn ?? "",
    descriptionColumn: operation.descriptionColumn ?? "",
    timeColumn: operation.timeColumn ?? "",
    fleetCount: operation.fleetCount ?? 0,
    automaticReport: operation.automaticReport,
    monitor: operation.monitor,
    status: operation.status,
    lastUpdate: operation.updatedAt?.toISOString?.()
  };
}

function mapGroup(group: any): WhatsAppGroup {
  return {
    id: group.id,
    name: group.name,
    externalId: group.externalId ?? "",
    description: group.description ?? "",
    isActive: group.isActive,
    isMonitored: group.isMonitored,
    receivesReports: group.receivesReports,
    allowTests: group.allowTests,
    allowedHours: group.allowedHours ?? "",
    notes: group.notes ?? "",
    isTestGroup: group.isTestGroup,
    operationIds: group.operations?.map((item: any) => item.operationId) ?? [],
    defaultMessage: group.defaultMessage,
    lastMessage: group.lastMessage ?? undefined,
    lastActivity: group.lastActivity?.toISOString?.(),
    processedMessages: group.processedMessages,
    connectionStatus: "simulated"
  };
}

function mapPending(change: any): PendingChange {
  return {
    id: change.id,
    operation: change.operation?.name ?? "Operacao nao vinculada",
    equipment: change.equipmentCode,
    currentStatus: change.currentStatus,
    newStatus: change.newStatus,
    description: change.description,
    originalMessage: change.incomingMessage?.content ?? change.description,
    group: change.incomingMessage?.group?.name ?? "Grupo simulado",
    sender: change.incomingMessage?.sender ?? "Operador simulado",
    receivedAt: change.createdAt.toISOString(),
    confidence: change.confidence,
    status: change.status,
    idempotencyKey: change.incomingMessage?.idempotencyKey ?? change.id
  };
}

export function createMemoryDataSource(store: Store): DataSource {
  return {
    simulationMode: store.simulationMode,
    async login(email, password) {
      const user = store.users.find((candidate) => candidate.email === email);
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        throw new HttpError(401, "Credenciais invalidas.");
      }
      store.log("LOGIN", "Login realizado.", { email });
      return { user: { ...store.sessionFor(user), mustChangePassword: false }, tokenId: randomUUID() };
    },
    async logout() {},
    async changePassword() {},
    async dashboard() { return store.dashboard(); },
    async listGroups() { return store.groups; },
    async createGroup(input) {
      const group = { ...input, id: store.makeId("group") } as WhatsAppGroup;
      store.groups.push(group);
      return group;
    },
    async updateGroup(id, input) {
      const group = store.groups.find((item) => item.id === id);
      if (!group) throw new HttpError(404, "Grupo nao encontrado.");
      Object.assign(group, input);
      return group;
    },
    async deleteGroup(id) {
      const index = store.groups.findIndex((item) => item.id === id);
      if (index === -1) throw new HttpError(404, "Grupo nao encontrado.");
      return store.groups.splice(index, 1)[0];
    },
    async testGroup(id) {
      const group = store.groups.find((item) => item.id === id);
      if (!group) throw new HttpError(404, "Grupo nao encontrado.");
      return { simulated: true, ok: true, message: `SIMULADO: grupo ${group.name} validado sem envio real.` };
    },
    async listOperations() { return store.operations; },
    async createOperation(input) {
      const operation = { ...input, id: store.makeId("op"), status: "active" } as Operation;
      store.operations.push(operation);
      return operation;
    },
    async updateOperation(id, input) {
      const operation = store.operations.find((item) => item.id === id);
      if (!operation) throw new HttpError(404, "Operacao nao encontrada.");
      Object.assign(operation, input);
      return operation;
    },
    async deleteOperation(id) {
      const index = store.operations.findIndex((item) => item.id === id);
      if (index === -1) throw new HttpError(404, "Operacao nao encontrada.");
      return store.operations.splice(index, 1)[0];
    },
    async listPendingChanges() { return store.pendingChanges; },
    async decidePendingChange(id, decision, description) {
      const change = store.pendingChanges.find((item) => item.id === id);
      if (!change) throw new HttpError(404, "Alteracao nao encontrada.");
      change.status = decision === "approve" ? "APPROVED_SIMULATED" : decision === "reject" ? "REJECTED" : "DEFERRED";
      change.description = description ?? change.description;
      return { change, externalActions: { excelUpdated: false, whatsappReactionSent: false, reason: "SIMULATION_MODE=true bloqueia Excel e WhatsApp." } };
    },
    async simulateMessage(input) {
      if (store.pendingChanges.some((change) => change.idempotencyKey === input.idempotencyKey)) {
        throw new HttpError(409, "Mensagem duplicada.");
      }
      const change: PendingChange = {
        id: store.makeId("chg"),
        operation: input.operation,
        equipment: input.equipment,
        currentStatus: "RODANDO",
        newStatus: input.newStatus,
        description: input.message,
        originalMessage: input.message,
        group: input.group,
        sender: input.sender,
        receivedAt: new Date().toISOString(),
        confidence: 0.82,
        status: "PENDING",
        idempotencyKey: input.idempotencyKey
      };
      store.pendingChanges.unshift(change);
      return change;
    },
    async spreadsheets() {
      const [plantio, tratos, risks] = await Promise.all([
        import("../../../../analysis/workbook-plantio.json", { assert: { type: "json" } }),
        import("../../../../analysis/workbook-tratos.json", { assert: { type: "json" } }),
        import("../../../../analysis/integration-risks.json", { assert: { type: "json" } })
      ]);
      return workbookResponse([plantio.default, tratos.default], risks.default, store.operations);
    },
    async reanalyzeSpreadsheets() {
      return { simulated: true, message: "SIMULADO: reanalise em modo leitura registrada. Execute npm run analyze:workbooks para regenerar os arquivos." };
    },
    async testNotification() {
      return { simulated: true, title: "COA-BOT", body: "Notificacao de teste: abrir alteracoes pendentes.", target: "/pendencias" };
    },
    async registerExcelAgent() { return { ok: true, simulationMode: store.simulationMode }; },
    async excelAgentStatus() { return { online: true, simulationMode: store.simulationMode, status: "simulated" }; },
    async runTest(input) { return testResult(input); },
    async listTestExecutions() { return []; },
    async logs() { return store.logs; },
    async log(action, message, options) { store.log(action, message, options); }
  };
}

export function createPrismaDataSource(prisma = new PrismaClient()): DataSource {
  const simulationMode = process.env.SIMULATION_MODE !== "false";
  return {
    simulationMode,
    async login(email, password, ip) {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { roles: { include: { role: true } } }
      });
      if (!user || !user.isActive) throw new HttpError(401, "Credenciais invalidas.");
      if (user.lockedUntil && user.lockedUntil > new Date()) throw new HttpError(423, "Usuario temporariamente bloqueado.");
      const ok = await bcrypt.compare(password, user.passwordHash);
      if (!ok) {
        const attempts = user.failedLoginAttempts + 1;
        await prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: attempts,
            lockedUntil: attempts >= Number(process.env.MAX_LOGIN_ATTEMPTS ?? 5)
              ? new Date(Date.now() + Number(process.env.LOGIN_LOCK_MINUTES ?? 15) * 60_000)
              : null
          }
        });
        throw new HttpError(401, "Credenciais invalidas.");
      }
      const tokenId = randomUUID();
      const ttl = Number(process.env.SESSION_TTL_HOURS ?? 12);
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() }
      });
      await prisma.authSession.create({
        data: { userId: user.id, tokenId, expiresAt: new Date(Date.now() + ttl * 60 * 60_000) }
      });
      await this.log("LOGIN", "Login realizado.", { userId: user.id, ipAddress: ip });
      return {
        tokenId,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          roles: user.roles.map((role) => role.role.name as any),
          mustChangePassword: user.mustChangePassword
        }
      };
    },
    async logout(tokenId, userId) {
      await prisma.authSession.updateMany({ where: { tokenId, revokedAt: null }, data: { revokedAt: new Date() } });
      await this.log("LOGOUT", "Logout realizado.", { userId });
    },
    async changePassword(userId, currentPassword, newPassword) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) throw new HttpError(401, "Senha atual invalida.");
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: await bcrypt.hash(newPassword, 12), mustChangePassword: false }
      });
      await this.log("PASSWORD_CHANGED", "Senha alterada pelo usuario.", { userId });
    },
    async dashboard() {
      const [groupsCount, operationsCount, pendingChanges, statuses] = await Promise.all([
        prisma.whatsAppGroup.count({ where: { active: true } }),
        prisma.operation.count({ where: { active: true } }),
        prisma.pendingChange.count({ where: { status: "PENDING", active: true } }),
        prisma.integrationStatus.findMany()
      ]);
      const state = new Map(statuses.map((item) => [item.kind, sharedState(item.state)]));
      const latestMessages = await prisma.incomingMessage.findMany({ take: 5, orderBy: { receivedAt: "desc" } });
      const latestEvents = await prisma.systemLog.findMany({ take: 5, orderBy: { createdAt: "desc" } });
      return {
        simulationMode,
        api: state.get("API") ?? "online",
        database: state.get("DATABASE") ?? "simulated",
        whatsapp: state.get("WHATSAPP") ?? "simulated",
        excelAgent: state.get("EXCEL_AGENT") ?? "simulated",
        groupsCount,
        operationsCount,
        pendingChanges,
        latestMessages: latestMessages.map((item) => item.content),
        latestEvents: latestEvents.map((item) => item.message),
        nextScheduledReport: "Simulado: 06:00",
        nextShiftChange: "Simulado: Turno C - 05:45"
      };
    },
    async listGroups() {
      return (await prisma.whatsAppGroup.findMany({ where: { active: true }, include: { operations: true }, orderBy: { createdAt: "desc" } })).map(mapGroup);
    },
    async createGroup(input, userId) {
      const group = await prisma.whatsAppGroup.create({
        data: groupData(input, userId),
        include: { operations: true }
      });
      await linkGroupOperations(prisma, group.id, input.operationIds ?? []);
      await this.log("GROUP_CREATED", "Grupo criado.", { userId, entity: "WhatsAppGroup", entityId: group.id, afterValue: input });
      return mapGroup(await prisma.whatsAppGroup.findUniqueOrThrow({ where: { id: group.id }, include: { operations: true } }));
    },
    async updateGroup(id, input, userId) {
      const current = await prisma.whatsAppGroup.findUnique({ where: { id }, include: { operations: true } });
      if (!current || !current.active) throw new HttpError(404, "Grupo nao encontrado.");
      const version = Number((input as any).version ?? current.version);
      if (version !== current.version) throw new HttpError(409, "Este registro foi alterado por outro usuário. Atualize os dados antes de salvar.");
      await prisma.whatsAppGroup.update({ where: { id }, data: { ...groupData(input, userId), version: { increment: 1 } } });
      if (input.operationIds) await linkGroupOperations(prisma, id, input.operationIds);
      const updated = await prisma.whatsAppGroup.findUniqueOrThrow({ where: { id }, include: { operations: true } });
      await this.log("GROUP_UPDATED", "Grupo editado.", { userId, entity: "WhatsAppGroup", entityId: id, beforeValue: current, afterValue: updated });
      return mapGroup(updated);
    },
    async deleteGroup(id, userId) {
      const current = await prisma.whatsAppGroup.findUnique({ where: { id } });
      if (!current || !current.active) throw new HttpError(404, "Grupo nao encontrado.");
      const removed = await prisma.whatsAppGroup.update({ where: { id }, data: { active: false, isActive: false, updatedBy: userId, version: { increment: 1 } } });
      await this.log("GROUP_DELETED", "Grupo removido logicamente.", { userId, entity: "WhatsAppGroup", entityId: id, beforeValue: current, afterValue: removed });
      return { simulated: true, removed: mapGroup({ ...removed, operations: [] }) };
    },
    async testGroup(id, userId) {
      const group = await prisma.whatsAppGroup.findUnique({ where: { id } });
      if (!group || !group.active) throw new HttpError(404, "Grupo nao encontrado.");
      await this.log("GROUP_TEST_SIMULATED", "Configuracao de grupo testada em simulacao.", { userId, entity: "WhatsAppGroup", entityId: id });
      return { simulated: true, ok: true, message: `SIMULADO: grupo ${group.name} validado sem envio real.` };
    },
    async listOperations() {
      return (await prisma.operation.findMany({ where: { active: true }, include: { groups: true }, orderBy: { createdAt: "desc" } })).map(mapOperation);
    },
    async createOperation(input, userId) {
      const operation = await prisma.operation.create({ data: operationData(input, userId), include: { groups: true } });
      if (input.groupIds) await linkOperationGroups(prisma, operation.id, input.groupIds);
      await this.log("OPERATION_CREATED", "Operacao criada.", { userId, entity: "Operation", entityId: operation.id, afterValue: input });
      return mapOperation(await prisma.operation.findUniqueOrThrow({ where: { id: operation.id }, include: { groups: true } }));
    },
    async updateOperation(id, input, userId) {
      const current = await prisma.operation.findUnique({ where: { id }, include: { groups: true } });
      if (!current || !current.active) throw new HttpError(404, "Operacao nao encontrada.");
      const version = Number((input as any).version ?? current.version);
      if (version !== current.version) throw new HttpError(409, "Este registro foi alterado por outro usuário. Atualize os dados antes de salvar.");
      await prisma.operation.update({ where: { id }, data: { ...operationData(input, userId), version: { increment: 1 } } });
      if (input.groupIds) await linkOperationGroups(prisma, id, input.groupIds);
      const updated = await prisma.operation.findUniqueOrThrow({ where: { id }, include: { groups: true } });
      await this.log("OPERATION_UPDATED", "Operacao editada.", { userId, entity: "Operation", entityId: id, beforeValue: current, afterValue: updated });
      return mapOperation(updated);
    },
    async deleteOperation(id, userId) {
      const current = await prisma.operation.findUnique({ where: { id } });
      if (!current || !current.active) throw new HttpError(404, "Operacao nao encontrada.");
      const removed = await prisma.operation.update({ where: { id }, data: { active: false, status: "paused", updatedBy: userId, version: { increment: 1 } } });
      await this.log("OPERATION_DELETED", "Operacao removida logicamente.", { userId, entity: "Operation", entityId: id, beforeValue: current, afterValue: removed });
      return { simulated: true, removed: mapOperation({ ...removed, groups: [] }) };
    },
    async listPendingChanges() {
      return (await prisma.pendingChange.findMany({ where: { active: true }, include: { operation: true, incomingMessage: { include: { group: true } } }, orderBy: { createdAt: "desc" } })).map(mapPending);
    },
    async decidePendingChange(id, decision, description, userId) {
      const current = await prisma.pendingChange.findUnique({ where: { id } });
      if (!current) throw new HttpError(404, "Alteracao nao encontrada.");
      const status = decision === "approve" ? ChangeStatus.APPROVED_SIMULATED : decision === "reject" ? ChangeStatus.REJECTED : ChangeStatus.DEFERRED;
      const safeDescription = description?.trim() ? description.trim() : current.description;
      const change = await prisma.pendingChange.update({ where: { id }, data: { status, description: safeDescription, updatedBy: userId, version: { increment: 1 } } });
      const mode = await prisma.generalSetting.findUnique({ where: { key: "OPERATIONAL_MODE" } });
      const shadow = mode?.value === "SHADOW";
      await this.log(`PENDING_CHANGE_${status}`, shadow ? "Decisão registrada em SHADOW; nenhuma ação externa executada." : "Decisão de alteração em simulação.", { userId, entity: "PendingChange", entityId: id, beforeValue: current, afterValue: change, metadata: { mode: mode?.value, officialExcelWrite: false, sendMessage: false, sendReaction: false } });
      return { change, externalActions: { excelUpdated: false, whatsappReactionSent: false, reason: shadow ? "Aprovação registrada. Escrita oficial bloqueada pelo modo SHADOW." : "SIMULATION_MODE=true bloqueia Excel e WhatsApp." } };
    },
    async simulateMessage(input, userId) {
      const existing = await prisma.incomingMessage.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
      if (existing) throw new HttpError(409, "Mensagem duplicada.");
      const operation = await prisma.operation.findFirst({ where: { name: input.operation, active: true } });
      const message = await prisma.incomingMessage.create({ data: { idempotencyKey: input.idempotencyKey, sender: input.sender, content: input.message, receivedAt: new Date() } });
      const change = await prisma.pendingChange.create({
        data: { incomingMessageId: message.id, operationId: operation?.id, equipmentCode: input.equipment, currentStatus: "RODANDO", newStatus: input.newStatus, description: input.message, confidence: 0.82, createdBy: userId },
        include: { operation: true, incomingMessage: { include: { group: true } } }
      });
      await this.log("MESSAGE_RECEIVED_SIMULATED", "Mensagem simulada recebida.", { userId, entity: "IncomingMessage", entityId: message.id, afterValue: input });
      return mapPending(change);
    },
    async spreadsheets() {
      const spreadsheets = await prisma.spreadsheet.findMany({ where: { active: true }, include: { sheets: true }, orderBy: { fileName: "asc" } });
      return {
        files: spreadsheets.map((workbook) => ({
          file: workbook.fileName,
          path: workbook.path,
          sizeBytes: workbook.sizeBytes,
          sheetCount: workbook.sheets.length,
          sheets: workbook.sheets.map((sheet) => sheet.name),
          sheetDetails: workbook.sheets.map((sheet) => ({
            name: sheet.name,
            state: sheet.state,
            dimension: sheet.usedRange,
            formulas: sheet.formulas,
            mergedCells: sheet.mergedCells,
            protected: sheet.protected,
            official: sheet.official,
            confirmationStatus: sheet.confirmationStatus,
            humanNotes: sheet.humanNotes,
            candidateColumns: sheet.candidateColumns,
            candidateImageArea: sheet.candidateImageArea
          })),
          hiddenSheets: workbook.sheets.filter((sheet) => sheet.state !== "visible").length,
          macrosDetected: workbook.macrosDetected,
          externalLinksDetected: workbook.externalLinksDetected,
          linkedOperations: [],
          risks: workbook.risks ?? [],
          analysisState: "persistido",
          excelAgentStatus: "simulated",
          lastAnalysis: workbook.lastAnalysisAt?.toISOString()
        })),
        risks: []
      };
    },
    async reanalyzeSpreadsheets(userId) {
      await this.log("SPREADSHEET_REANALYZE_SIMULATED", "Reanalise solicitada em simulacao.", { userId, metadata: { mode: "read-only" } });
      return { simulated: true, message: "SIMULADO: reanalise em modo leitura registrada. Execute npm run analyze:workbooks e npm run db:seed para atualizar metadados." };
    },
    async testNotification(userId) {
      await this.log("NOTIFICATION_TEST", "Notificacao de teste simulada.", { userId, metadata: { opens: "/pendencias" } });
      return { simulated: true, title: "COA-BOT", body: "Notificacao de teste: abrir alteracoes pendentes.", target: "/pendencias" };
    },
    async registerExcelAgent(input) {
      await prisma.integrationStatus.upsert({ where: { kind: "EXCEL_AGENT" }, update: { state: "SIMULATED", message: "Agente registrado em simulacao" }, create: { kind: "EXCEL_AGENT", state: "SIMULATED", message: "Agente registrado em simulacao" } });
      await this.log("EXCEL_AGENT_ONLINE", "Agente Excel registrado.", { metadata: input });
      return { ok: true, simulationMode };
    },
    async excelAgentStatus() {
      const status = await prisma.integrationStatus.findUnique({ where: { kind: "EXCEL_AGENT" } });
      return { online: true, simulationMode, status: status ? sharedState(status.state) : "simulated" };
    },
    async runTest(input) {
      const started = Date.now();
      const result = testResult(input);
      const created = await prisma.testExecution.create({
        data: { type: input.type, userId: input.userId, operation: input.operation, groupName: input.groupName, spreadsheet: (result as any).spreadsheet, sheet: (result as any).sheet, range: (result as any).range, legend: input.legend, result: JSON.stringify(result), status: "SUCCESS", simulatedData: result as any, durationMs: Date.now() - started, createdBy: input.userId }
      });
      await this.log("TEST_EXECUTED", "Teste executado em simulacao.", { userId: input.userId, entity: "TestExecution", entityId: created.id, afterValue: result });
      return { ...(result as any), id: created.id };
    },
    async listTestExecutions() {
      return prisma.testExecution.findMany({ where: { active: true }, orderBy: { createdAt: "desc" }, take: 50 });
    },
    async logs() {
      return prisma.systemLog.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
    },
    async log(action, message, options = {}) {
      const validUser = options.userId ? await prisma.user.findUnique({ where: { id: options.userId }, select: { id: true } }) : null;
      await prisma.systemLog.create({
        data: { action, message, userId: validUser?.id, entity: options.entity, entityId: options.entityId, beforeValue: options.beforeValue as any, afterValue: options.afterValue as any, metadata: options.metadata as any, ipAddress: options.ipAddress, result: options.result ?? "SUCCESS" }
      });
    }
  };
}

function groupData(input: Partial<WhatsAppGroup>, userId?: string): any {
  return {
    name: input.name,
    externalId: input.externalId || null,
    description: input.description ?? "",
    isActive: input.isActive ?? true,
    isMonitored: input.isMonitored ?? true,
    receivesReports: input.receivesReports ?? false,
    allowTests: input.allowTests ?? true,
    allowedHours: input.allowedHours ?? "",
    notes: input.notes ?? "",
    isTestGroup: input.isTestGroup ?? false,
    defaultMessage: input.defaultMessage ?? "",
    updatedBy: userId,
    createdBy: userId
  };
}

function operationData(input: Partial<Operation>, userId?: string): any {
  return {
    name: input.name,
    shortName: input.shortName ?? "",
    emoji: input.emoji ?? "🚜",
    description: input.description ?? "",
    spreadsheetFile: input.spreadsheetFile ?? "",
    sheetName: input.sheetName ?? "",
    destinationGroupId: input.destinationGroupId ?? "",
    allowedStatuses: input.allowedStatuses ?? ["RODANDO", "PARADO"],
    synonyms: input.synonyms ?? "",
    shifts: input.shifts ?? [],
    reportTimes: input.reportTimes ?? "",
    legendTemplate: input.legendTemplate ?? "",
    requiresApproval: input.requiresApproval ?? true,
    imageRange: input.imageRange ?? "",
    fleetColumn: input.fleetColumn ?? "",
    implementColumn: input.implementColumn ?? "",
    statusColumn: input.statusColumn ?? "",
    descriptionColumn: input.descriptionColumn ?? "",
    timeColumn: input.timeColumn ?? "",
    fleetCount: input.fleetCount ?? 0,
    automaticReport: input.automaticReport ?? false,
    monitor: input.monitor ?? true,
    status: input.status ?? "active",
    updatedBy: userId,
    createdBy: userId
  };
}

async function linkGroupOperations(prisma: PrismaClient, groupId: string, operationIds: string[]) {
  await prisma.groupOperation.deleteMany({ where: { groupId } });
  for (const operationId of operationIds) {
    await prisma.groupOperation.create({ data: { groupId, operationId } }).catch(() => undefined);
  }
}

async function linkOperationGroups(prisma: PrismaClient, operationId: string, groupIds: string[]) {
  await prisma.groupOperation.deleteMany({ where: { operationId } });
  for (const groupId of groupIds) {
    await prisma.groupOperation.create({ data: { groupId, operationId } }).catch(() => undefined);
  }
}

function testResult(input: TestExecutionInput) {
  const operation = input.operation ?? "Plantio Mecanizado";
  return {
    simulated: true,
    action: input.type,
    title: `SIMULADO: ${input.type}`,
    operation,
    group: input.groupName,
    shift: (input as any).shift ?? "C",
    usedAt: new Date().toISOString(),
    spreadsheet: operation.includes("CPD") ? "Acompanhamento Tratos Culturais.xlsm" : "Planilha Plantio cana.xlsm",
    sheet: operation.includes("CPD") ? "CPD" : "PLANTIO",
    range: operation.includes("CPD") ? "A1:AH51" : "A1:AI26",
    logs: [
      "SIMULADO: nenhuma mensagem real foi enviada.",
      "SIMULADO: nenhuma reacao real foi feita.",
      "SIMULADO: nenhuma planilha real foi alterada.",
      `SIMULADO: acao ${input.type} concluida para ${operation}.`
    ]
  };
}

function workbookResponse(workbooks: any[], risks: any, operations: Operation[]) {
  return {
    files: workbooks.map((workbook) => ({
      file: workbook.fileName,
      path: workbook.fullPath,
      sizeBytes: workbook.sizeBytes,
      sheetCount: workbook.sheets.length,
      sheets: workbook.sheets.map((sheet: any) => sheet.name),
      sheetDetails: workbook.sheets.map((sheet: any) => ({
        name: sheet.name,
        state: sheet.state,
        dimension: sheet.dimension,
        formulas: sheet.formulas.length,
        mergedCells: sheet.mergedCells.length,
        protected: sheet.protected,
        candidateColumns: sheet.candidateColumns,
        candidateImageArea: sheet.printArea ?? sheet.dimension ?? "necessita confirmação"
      })),
      hiddenSheets: workbook.sheets.filter((sheet: any) => sheet.state !== "visible").length,
      macrosDetected: workbook.vba.hasVbaProject,
      externalLinksDetected: workbook.externalLinks.length > 0,
      linkedOperations: operations.filter((operation) => operation.spreadsheetFile === workbook.fileName).map((operation) => operation.name),
      risks: workbook.risks,
      analysisState: "analisado",
      excelAgentStatus: "simulated",
      lastAnalysis: risks.generatedAt
    })),
    risks
  };
}
