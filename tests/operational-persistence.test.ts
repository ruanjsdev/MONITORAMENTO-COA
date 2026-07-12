import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { OperationalPrismaContext } from "../apps/api/src/repositories/operational-prisma";

const prisma = new PrismaClient();
const enabled = process.env.DATABASE_MODE === "prisma" && Boolean(process.env.DATABASE_URL);

describe.skipIf(!enabled)("persistência operacional Prisma", () => {
  const suffix = randomUUID();

  beforeAll(async () => {
    await prisma.operationalPending.deleteMany({ where: { message: { idempotencyKey: { contains: suffix } } } });
    await prisma.operationalMessage.deleteMany({ where: { idempotencyKey: { contains: suffix } } });
    await prisma.operationalProjection.deleteMany({ where: { id: `test-${suffix}` } });
    await prisma.operationalReportDraft.deleteMany({ where: { id: "shift-report" } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("mantém mensagem, pendência e evento após recriar o contexto", async () => {
    const first = await OperationalPrismaContext.load(prisma, []);
    const before = new Set(first.engine.all().map(event => event.id));
    const message = first.workflow.simulate({ idempotencyKey: `persist-${suffix}`, group: "Persistência", sender: "Teste", shift: "C", text: `777 = parado, teste ${suffix}` });
    const pendings = first.workflow.createPendings(message.id);
    await first.persistMessages();
    await first.persistPendings();
    await first.persistNewEvents(before);
    await first.persistProjection();

    const second = await OperationalPrismaContext.load(prisma, []);
    expect(second.workflow.messages.findByKey(`persist-${suffix}`)?.text).toContain(suffix);
    expect(second.workflow.pendings.find(pendings[0].id)?.status).toBe("OPEN");
    expect(second.engine.timeline().some(event => event.originalMessage?.includes(suffix))).toBe(true);
  });

  it("persiste aprovação, projeção e rascunho de troca de turno", async () => {
    const first = await OperationalPrismaContext.load(prisma, []);
    const pending = first.workflow.pendings.list().find(item => item.status === "OPEN" && item.interpretation.originalText.includes(suffix));
    expect(pending).toBeDefined();
    const before = new Set(first.engine.all().map(event => event.id));
    first.workflow.approve(pending!.id, "Persistência");
    await first.persistPendings();
    await first.persistNewEvents(before);
    const projection = await first.persistProjection();
    await first.persistDraft(`*📋 RELATÓRIO DE TROCA DE TURNO*\n\nRascunho persistido ${suffix}`);

    const second = await OperationalPrismaContext.load(prisma, []);
    expect(second.workflow.pendings.find(pending!.id)?.status).toBe("APPROVED");
    expect(second.engine.currentState("777")[0]?.status).toBe("PARADO");
    expect(second.projections.get()).toEqual(projection);
    expect(second.workflow.reports.getDraft()).toContain(suffix);
  });

  it("faz rollback completo quando a aprovação falha dentro da transação", async () => {
    const context = await OperationalPrismaContext.load(prisma, []);
    const pending = await createPending(context, `rollback-${suffix}`, "778");
    await expect(context.approvePending(pending.id, "Persistência", { failAfterEvent: true })).rejects.toThrow(/Falha simulada/);

    const reloaded = await OperationalPrismaContext.load(prisma, []);
    expect(reloaded.workflow.pendings.find(pending.id)?.status).toBe("OPEN");
    expect(reloaded.engine.timeline().filter(event => event.originalMessage?.includes(`rollback-${suffix}`) && event.approved && event.type === "STOPPED")).toHaveLength(0);
    expect(reloaded.engine.currentState("778")[0]).toBeUndefined();
  });

  it("resolve aprovação concorrente com apenas um vencedor", async () => {
    const setup = await OperationalPrismaContext.load(prisma, []);
    const pending = await createPending(setup, `concurrent-${suffix}`, "779");
    const first = await OperationalPrismaContext.load(prisma, []);
    const second = await OperationalPrismaContext.load(prisma, []);
    const results = await Promise.allSettled([
      first.approvePending(pending.id, "Aprovador A"),
      second.approvePending(pending.id, "Aprovador B")
    ]);

    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter(result => result.status === "rejected")).toHaveLength(1);
    const reloaded = await OperationalPrismaContext.load(prisma, []);
    expect(reloaded.workflow.pendings.find(pending.id)?.status).toBe("APPROVED");
    expect(reloaded.engine.timeline().filter(event => event.originalMessage?.includes(`concurrent-${suffix}`) && event.approved && event.type === "STOPPED")).toHaveLength(1);
    expect(reloaded.engine.currentState("779")[0]?.status).toBe("PARADO");
  });

  it("bloqueia update e delete de OperationalEvent no PostgreSQL", async () => {
    const context = await OperationalPrismaContext.load(prisma, []);
    const before = new Set(context.engine.all().map(event => event.id));
    const message = context.workflow.simulate({ idempotencyKey: `append-${suffix}`, group: "Persistência", sender: "Teste", shift: "C", text: `780 = parado, append ${suffix}` });
    await context.persistMessages();
    await context.persistNewEvents(before);
    const event = context.engine.all().find(item => !before.has(item.id));
    expect(event).toBeDefined();

    await expect(prisma.operationalEvent.update({ where: { id: event!.id }, data: { observation: "mutado" } })).rejects.toThrow();
    await expect(prisma.operationalEvent.delete({ where: { id: event!.id } })).rejects.toThrow();
  });
});

async function createPending(context: OperationalPrismaContext, key: string, fleet: string) {
  const before = new Set(context.engine.all().map(event => event.id));
  const message = context.workflow.simulate({ idempotencyKey: key, group: "Persistência", sender: "Teste", shift: "C", text: `${fleet} = parado, teste ${key}` });
  const pending = context.workflow.createPendings(message.id)[0];
  await context.persistMessages();
  await context.persistPendings();
  await context.persistNewEvents(before);
  await context.persistProjection();
  return pending;
}
