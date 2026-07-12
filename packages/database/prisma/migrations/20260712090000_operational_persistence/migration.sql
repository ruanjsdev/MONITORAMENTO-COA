CREATE TABLE "OperationalMessage" (
  "id" TEXT NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "groupName" TEXT NOT NULL,
  "sender" TEXT NOT NULL,
  "receivedAt" TIMESTAMP(3) NOT NULL,
  "shift" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "interpretations" JSONB NOT NULL,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OperationalMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OperationalPending" (
  "id" TEXT NOT NULL,
  "messageId" TEXT NOT NULL,
  "interpretation" JSONB NOT NULL,
  "baselineStatus" TEXT,
  "baselineDescription" TEXT,
  "baselineSector" TEXT,
  "status" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL,
  "resolvedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OperationalPending_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OperationalProjection" (
  "id" TEXT NOT NULL,
  "value" JSONB NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OperationalProjection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OperationalReportDraft" (
  "id" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OperationalReportDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OperationalMessage_idempotencyKey_key" ON "OperationalMessage"("idempotencyKey");
CREATE INDEX "OperationalPending_status_createdAt_idx" ON "OperationalPending"("status", "createdAt");
CREATE INDEX "OperationalPending_messageId_idx" ON "OperationalPending"("messageId");
ALTER TABLE "OperationalPending" ADD CONSTRAINT "OperationalPending_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "OperationalMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
