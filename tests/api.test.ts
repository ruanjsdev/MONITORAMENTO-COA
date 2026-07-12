import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { Server } from "node:http";
import { createApp } from "../apps/api/src/app";
import { createStore } from "../apps/api/src/store";
import { createMemoryDataSource } from "../apps/api/src/repositories/data-source";
import { canSendReaction } from "@coa-bot/shared";
import { getStatus, handleCommand } from "../apps/excel-agent/src/index";

let server: Server;
let baseUrl: string;

async function start() {
  process.env.SIMULATION_MODE = "true";
  process.env.ADMIN_EMAIL = "admin@coa.local";
  process.env.ADMIN_PASSWORD = "change-me";
  const app = createApp(createMemoryDataSource(createStore()));
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Invalid test server address");
  baseUrl = `http://127.0.0.1:${address.port}`;
}

async function stop() {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}

async function request(path: string, options: RequestInit = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });
}

async function login() {
  const response = await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "admin@coa.local", password: "change-me" })
  });
  expect(response.status).toBe(200);
  return (await response.json()).token as string;
}

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

beforeEach(start);
afterEach(stop);

describe("COA-BOT API em simulacao", () => {
  it("realiza login e bloqueia dashboard sem token", async () => {
    const blocked = await request("/dashboard");
    expect(blocked.status).toBe(401);
    const token = await login();
    const dashboard = await request("/dashboard", { headers: auth(token) });
    expect(dashboard.status).toBe(200);
    expect((await dashboard.json()).simulationMode).toBe(true);
  });

  it("cria grupo e operacao", async () => {
    const token = await login();
    const group = await request("/groups", {
      method: "POST",
      headers: auth(token),
      body: JSON.stringify({
        name: "Grupo Teste",
        isActive: true,
        isMonitored: true,
        receivesReports: false,
        operationIds: [],
        defaultMessage: "Teste"
      })
    });
    expect(group.status).toBe(201);

    const operation = await request("/operations", {
      method: "POST",
      headers: auth(token),
      body: JSON.stringify({
        name: "Operacao Teste",
        emoji: "🚜",
        spreadsheetFile: "Planilha Plantio cana.xlsm",
        sheetName: "PLANTIO",
        groupIds: [],
        allowedStatuses: ["RODANDO", "PARADO"],
        monitor: true
      })
    });
    expect(operation.status).toBe(201);
  });

  it("edita grupo, vincula operacao e testa configuracao", async () => {
    const token = await login();
    const groups = await request("/groups", { headers: auth(token) });
    const [group] = await groups.json();
    const updated = await request(`/groups/${group.id}`, {
      method: "PATCH",
      headers: auth(token),
      body: JSON.stringify({
        name: "COA Editado",
        operationIds: ["op_plantio", "op_cpd"],
        isMonitored: true,
        receivesReports: true
      })
    });
    expect(updated.status).toBe(200);
    const body = await updated.json();
    expect(body.name).toBe("COA Editado");
    expect(body.operationIds).toContain("op_cpd");

    const test = await request(`/groups/${group.id}/test`, {
      method: "POST",
      headers: auth(token),
      body: "{}"
    });
    expect(test.status).toBe(200);
    expect((await test.json()).simulated).toBe(true);
  });

  it("edita operacao em homologacao", async () => {
    const token = await login();
    const operations = await request("/operations", { headers: auth(token) });
    const [operation] = await operations.json();
    const updated = await request(`/operations/${operation.id}`, {
      method: "PATCH",
      headers: auth(token),
      body: JSON.stringify({
        imageRange: "A1:Z20",
        allowedStatuses: ["RODANDO", "PARADO", "DISPONIVEL"]
      })
    });
    expect(updated.status).toBe(200);
    const body = await updated.json();
    expect(body.imageRange).toBe("A1:Z20");
    expect(body.allowedStatuses).toContain("DISPONIVEL");
  });

  it("cria alteracao pendente por mensagem simulada e bloqueia duplicidade", async () => {
    const token = await login();
    const payload = {
      idempotencyKey: "message-duplicate-test",
      group: "COA Simulado",
      sender: "Operador",
      message: "Frota 700 parada",
      operation: "Plantio Mecanizado",
      equipment: "700",
      newStatus: "PARADO"
    };
    const first = await request("/messages/simulate", {
      method: "POST",
      headers: auth(token),
      body: JSON.stringify(payload)
    });
    expect(first.status).toBe(201);
    const duplicated = await request("/messages/simulate", {
      method: "POST",
      headers: auth(token),
      body: JSON.stringify(payload)
    });
    expect(duplicated.status).toBe(409);
  });

  it("aprova e rejeita em modo simulado sem Excel e sem WhatsApp", async () => {
    const token = await login();
    const list = await request("/pending-changes", { headers: auth(token) });
    const [change] = await list.json();
    const approved = await request(`/pending-changes/${change.id}/decision`, {
      method: "POST",
      headers: auth(token),
      body: JSON.stringify({ decision: "approve" })
    });
    expect(approved.status).toBe(200);
    const approvedBody = await approved.json();
    expect(approvedBody.externalActions.excelUpdated).toBe(false);
    expect(approvedBody.externalActions.whatsappReactionSent).toBe(false);
  });

  it("simula notificacao de teste apontando para pendencias", async () => {
    const token = await login();
    const response = await request("/notifications/test", {
      method: "POST",
      headers: auth(token),
      body: "{}"
    });
    expect(response.status).toBe(200);
    expect((await response.json()).target).toBe("/pendencias");
  });

  it("retorna planilhas em formato visualizavel e executa central de testes", async () => {
    const token = await login();
    const spreadsheets = await request("/spreadsheets", { headers: auth(token) });
    expect(spreadsheets.status).toBe(200);
    const spreadsheetBody = await spreadsheets.json();
    expect(spreadsheetBody.files[0].sheetDetails.length).toBeGreaterThan(0);
    expect(spreadsheetBody.files[0]).toHaveProperty("macrosDetected");

    const testRun = await request("/tests/run", {
      method: "POST",
      headers: auth(token),
      body: JSON.stringify({ action: "gerar previa", operation: "Plantio Mecanizado", group: "COA Simulado", shift: "C" })
    });
    expect(testRun.status).toBe(200);
    const result = await testRun.json();
    expect(result.simulated).toBe(true);
    expect(result.logs.join(" ")).toContain("nenhuma mensagem real");
  });

  it("bloqueia qualquer reacao diferente de 👍 e bloqueia 👍 em simulacao", () => {
    expect(
      canSendReaction({
        simulationMode: false,
        approvedByAdmin: true,
        databaseUpdated: true,
        excelUpdated: true,
        cellsConfirmed: true,
        historyRegistered: true,
        reaction: "✅"
      })
    ).toBe(false);
    expect(
      canSendReaction({
        simulationMode: true,
        approvedByAdmin: true,
        databaseUpdated: true,
        excelUpdated: true,
        cellsConfirmed: true,
        historyRegistered: true,
        reaction: "👍"
      })
    ).toBe(false);
  });

  it("agente Excel informa status e nao executa comandos reais", async () => {
    const status = getStatus();
    expect(status.simulationMode).toBe(true);
    const result = await handleCommand({
      type: "UPDATE_STATUS",
      workbookPath: "planilhas/Planilha Plantio cana.xlsm",
      sheet: "PLANTIO",
      rowKey: "625",
      status: "PARADO"
    });
    expect(result.executed).toBe(false);
    expect(result.simulated).toBe(true);
  });

  it("entrega Meu Turno, estados de mensagens e status detalhado em simulacao", async () => {
    const token = await login();
    const response = await request("/operational/snapshot", { headers: auth(token) });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.simulationMode).toBe(true);
    expect(body.messages.map((item: any) => item.status)).toContain("PENDING_APPROVAL");
    expect(body.messages.map((item: any) => item.status)).toContain("FAILED");
    expect(body.systems).toHaveLength(8);
    expect(body.fleets.find((item: any) => item.fleet === "625").description).toContain("fumaça preta");
  });

  it("pesquisa por frota e descricao nos dados de demonstracao", async () => {
    const token = await login();
    const fleet = await request("/operational/search?q=625", { headers: auth(token) });
    expect((await fleet.json()).currentState[0].fleet).toBe("625");
    const description = await request("/operational/search?q=cilindro", { headers: auth(token) });
    expect((await description.json()).currentState[0].fleet).toBe("626");
  });

  it("resolve pendencia somente em memoria", async () => {
    const token = await login();
    const response = await request("/operational/pendencies/pen-625/action", { method: "POST", headers: auth(token), body: JSON.stringify({ action: "resolve" }) });
    const body = await response.json();
    expect(body.simulated).toBe(true);
    expect(body.externalActionExecuted).toBe(false);
    expect(body.item.status).toBe("resolved");
  });

  it("gera previa e troca de turno sem enviar mensagem real", async () => {
    const token = await login();
    const preview = await request("/operational/send-preview", { headers: auth(token) });
    expect((await preview.json()).range).toBe("A1:AI26");
    const sent = await request("/operational/send-preview/confirm", { method: "POST", headers: auth(token), body: JSON.stringify({ destination: "group", legend: "Teste" }) });
    expect((await sent.json()).externalActionExecuted).toBe(false);
    const report = await request("/operational/shift-report", { headers: auth(token) });
    expect((await report.json()).text).toContain("RELATÓRIO DE TROCA DE TURNO");
  });

  it("executa mensagem simulada do parser ate aprovacao sem acao externa", async () => {
    const token=await login();
    const parsed=await request("/operational/messages/parse",{method:"POST",headers:auth(token),body:JSON.stringify({text:"1602/1063 = aguardando área",operation:"Cultivo",shift:"C"})});
    const parsedBody=await parsed.json();expect(parsedBody.mainEquipment).toBe("1602");expect(parsedBody.proposedStatus).toBeNull();
    const simulated=await request("/operational/messages/simulate",{method:"POST",headers:auth(token),body:JSON.stringify({idempotencyKey:"api-flow-1602",group:"Cultivo",sender:"Teste",shift:"C",text:"1602/1063 = aguardando área"})});
    const message=await simulated.json();
    const created=await request(`/operational/messages/${message.id}/create-pending-change`,{method:"POST",headers:auth(token),body:"{}"});
    const [pending]=await created.json();expect(pending.reason).toBe("DOUBT");
    const approved=await request(`/operational/pending/${pending.id}/approve`,{method:"POST",headers:auth(token),body:JSON.stringify({responsible:"Admin"})});
    const result=await approved.json();expect(result.externalActionExecuted).toBe(false);expect(result.excelCommands[0].execute).toBe(false);expect(result.whatsAppCommands[0].reaction).toBeNull();
  });

  it("reconstroi projecoes e gera rascunho apenas com confirmado e pendente separado",async()=>{
    const token=await login();const rebuilt=await request("/operational/projections/rebuild",{method:"POST",headers:auth(token),body:"{}"});expect(rebuilt.status).toBe(200);
    const draft=await request("/operational/shift-report/draft",{headers:auth(token)});const body=await draft.json();expect(body.simulated).toBe(true);expect(body.text).toContain("PENDÊNCIAS NÃO CONFIRMADAS");
  });

  it("enfileira e cancela comando Excel de homologacao",async()=>{const token=await login();const queued=await request("/excel-homologation/commands",{method:"POST",headers:auth(token),body:JSON.stringify({type:"READ_CELL",workbook:"planilhas-homologacao/Planilha Plantio cana.dev.xlsm",worksheet:"PLANTIO",payload:{cell:"F8"},simulation:true})});expect(queued.status).toBe(201);const command=await queued.json();const cancelled=await request(`/excel-homologation/commands/${command.commandId}/cancel`,{method:"POST",headers:auth(token),body:"{}"});expect((await cancelled.json()).status).toBe("CANCELLED")});
});
