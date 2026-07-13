CREATE UNIQUE INDEX "PendingChange_incomingMessageId_equipmentCode_createdBy_key"
ON "PendingChange"("incomingMessageId", "equipmentCode", "createdBy");

ALTER TABLE "ExcelAgentJob" ADD COLUMN "reconciledAt" TIMESTAMP(3);

DROP INDEX "ExcelAgentJob_scope_status_createdAt_idx";
CREATE INDEX "ExcelAgentJob_scope_status_reconciledAt_createdAt_idx"
ON "ExcelAgentJob"("scope", "status", "reconciledAt", "createdAt");
