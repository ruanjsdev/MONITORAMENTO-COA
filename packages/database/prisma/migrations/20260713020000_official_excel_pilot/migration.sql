CREATE TYPE "OfficialPilotWriteStatus" AS ENUM (
  'PREPARING',
  'PREVIEW_READY',
  'APPROVAL_RECORDED',
  'BASELINE_VALIDATED',
  'BACKUP_CREATED',
  'WRITING',
  'SAVED',
  'VERIFIED',
  'CELL_CONFLICT',
  'WRITE_VERIFICATION_FAILED',
  'FAILED',
  'ROLLBACK_PENDING',
  'ROLLED_BACK'
);

CREATE TABLE "OfficialPilotWrite" (
  "id" TEXT NOT NULL,
  "pendingChangeId" TEXT NOT NULL,
  "status" "OfficialPilotWriteStatus" NOT NULL DEFAULT 'PREPARING',
  "confirmed" BOOLEAN NOT NULL DEFAULT false,
  "prepareCommandId" TEXT NOT NULL,
  "commandId" TEXT,
  "rollbackCommandId" TEXT,
  "correlationId" TEXT NOT NULL,
  "userId" TEXT,
  "userName" TEXT NOT NULL,
  "groupName" TEXT NOT NULL,
  "groupJid" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "originalMessage" TEXT NOT NULL,
  "operation" TEXT NOT NULL,
  "fleet" TEXT NOT NULL,
  "implement" TEXT NOT NULL,
  "workbook" TEXT NOT NULL,
  "worksheet" TEXT NOT NULL,
  "row" INTEGER,
  "cells" JSONB NOT NULL,
  "baselineValues" JSONB,
  "proposedValues" JSONB NOT NULL,
  "rereadValues" JSONB,
  "backupPath" TEXT NOT NULL,
  "originalHash" TEXT,
  "backupHash" TEXT,
  "sizeBytes" INTEGER,
  "result" TEXT,
  "errorCode" TEXT,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "durationMs" INTEGER,
  "rolledBackAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OfficialPilotWrite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OfficialPilotWriteEvent" (
  "id" TEXT NOT NULL,
  "writeId" TEXT NOT NULL,
  "step" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "userId" TEXT,
  "detail" TEXT,
  "data" JSONB,
  "durationMs" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OfficialPilotWriteEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OfficialPilotWrite_pendingChangeId_key" ON "OfficialPilotWrite"("pendingChangeId");
CREATE UNIQUE INDEX "OfficialPilotWrite_prepareCommandId_key" ON "OfficialPilotWrite"("prepareCommandId");
CREATE UNIQUE INDEX "OfficialPilotWrite_commandId_key" ON "OfficialPilotWrite"("commandId");
CREATE UNIQUE INDEX "OfficialPilotWrite_rollbackCommandId_key" ON "OfficialPilotWrite"("rollbackCommandId");
CREATE UNIQUE INDEX "OfficialPilotWrite_correlationId_key" ON "OfficialPilotWrite"("correlationId");
CREATE INDEX "OfficialPilotWrite_status_createdAt_idx" ON "OfficialPilotWrite"("status", "createdAt");
CREATE INDEX "OfficialPilotWriteEvent_writeId_createdAt_idx" ON "OfficialPilotWriteEvent"("writeId", "createdAt");
ALTER TABLE "OfficialPilotWriteEvent" ADD CONSTRAINT "OfficialPilotWriteEvent_writeId_fkey" FOREIGN KEY ("writeId") REFERENCES "OfficialPilotWrite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE OR REPLACE FUNCTION prevent_official_pilot_event_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'OfficialPilotWriteEvent is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER official_pilot_event_no_update
BEFORE UPDATE OR DELETE ON "OfficialPilotWriteEvent"
FOR EACH ROW EXECUTE FUNCTION prevent_official_pilot_event_mutation();
