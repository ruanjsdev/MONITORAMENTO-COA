import { PrismaClient } from "@prisma/client";
import { rebuildProjections } from "../apps/api/src/services/operational-engine.js";

const write = process.argv.includes("--write");
const prisma = new PrismaClient();

try {
  const events = await prisma.operationalEvent.findMany({ orderBy: { timestamp: "asc" } });
  const mapped = events.map(event => ({
    id: event.id,
    timestamp: event.timestamp.toISOString(),
    type: event.type as never,
    operation: event.operation ?? undefined,
    fleet: event.fleet ?? undefined,
    implement: event.implement ?? undefined,
    group: event.groupName ?? undefined,
    shift: event.shift ?? undefined,
    user: event.userName ?? undefined,
    previousStatus: event.previousStatus ?? undefined,
    newStatus: event.newStatus ?? undefined,
    previousDescription: event.previousDescription ?? undefined,
    newDescription: event.newDescription ?? undefined,
    previousSector: event.previousSector ?? undefined,
    newSector: event.newSector ?? undefined,
    source: event.source as never,
    originalMessage: event.originalMessage ?? undefined,
    observation: event.observation ?? undefined,
    simulated: event.simulated,
    approved: event.approved,
    responsible: event.responsible ?? undefined,
    priority: event.priority as never
  }));
  const current = await prisma.operationalProjection.findUnique({ where: { id: "current" } });
  const proposed = rebuildProjections(mapped);
  const currentText = JSON.stringify(current?.value ?? null);
  const proposedText = JSON.stringify(proposed);

  console.log(`Modo: ${write ? "gravacao" : "dry-run"}`);
  console.log(`Eventos: ${events.length}`);
  console.log(`Projecoes atuais: ${current ? 1 : 0}`);
  console.log(`Projecoes propostas: ${proposed.currentState.length}`);
  console.log(`Diferencas encontradas: ${currentText === proposedText ? 0 : 1}`);

  if (!write) {
    console.log("Nenhuma alteracao gravada. Use --write para persistir.");
  } else {
    await prisma.operationalProjection.upsert({
      where: { id: "current" },
      create: { id: "current", value: proposed, version: 1 },
      update: { value: proposed, version: { increment: 1 } }
    });
    console.log("Projecoes operacionais reconstruidas sem excluir eventos.");
  }
} finally {
  await prisma.$disconnect();
}
