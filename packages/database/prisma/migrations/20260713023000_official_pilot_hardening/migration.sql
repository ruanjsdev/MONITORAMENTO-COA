ALTER TYPE "OfficialPilotWriteStatus" ADD VALUE IF NOT EXISTS 'ROLLBACK_FAILED' BEFORE 'ROLLED_BACK';

ALTER TABLE "OfficialPilotWrite"
  ADD COLUMN "pendingVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "contextHash" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "writtenHash" TEXT;

CREATE TYPE "ExcelAgentJobStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'CANCELLED', 'EXPIRED');

CREATE TABLE "ExcelAgentJob" (
  "id" TEXT NOT NULL,
  "commandId" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "command" JSONB NOT NULL,
  "status" "ExcelAgentJobStatus" NOT NULL DEFAULT 'QUEUED',
  "result" JSONB,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "leasedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExcelAgentJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExcelAgentJob_commandId_key" ON "ExcelAgentJob"("commandId");
CREATE INDEX "ExcelAgentJob_scope_status_createdAt_idx" ON "ExcelAgentJob"("scope", "status", "createdAt");
