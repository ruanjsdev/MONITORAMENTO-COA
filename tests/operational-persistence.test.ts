import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { OperationalPrismaContext } from "../apps/api/src/repositories/operational-prisma";

const prisma = new PrismaClient();
const enabled = Boolean(process.env.DATABASE_URL);

describe.skipIf(!enabled)("persistência operacional Prisma", () => {
  const suffix = randomUUID();

  beforeAll(async () => {
    await prisma.operationalPending.deleteMany({ where: { message: { idempotencyKey: { contains: suffix } } } });
    await prisma.operationalMessage.deleteMany({ where: { idempotencyKey: { contains: suffix } } });
    await prisma.operationalEvent.deleteMany({ where: { originalMessage: { contains: suffix } } });
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
});
