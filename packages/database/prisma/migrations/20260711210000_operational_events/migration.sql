CREATE TABLE "OperationalEvent" (
  "id" TEXT NOT NULL,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "type" TEXT NOT NULL,
  "operation" TEXT,
  "fleet" TEXT,
  "implement" TEXT,
  "groupName" TEXT,
  "shift" TEXT,
  "userName" TEXT,
  "previousStatus" TEXT,
  "newStatus" TEXT,
  "previousDescription" TEXT,
  "newDescription" TEXT,
  "previousSector" TEXT,
  "newSector" TEXT,
  "source" TEXT NOT NULL,
  "originalMessage" TEXT,
  "observation" TEXT,
  "simulated" BOOLEAN NOT NULL DEFAULT true,
  "approved" BOOLEAN NOT NULL DEFAULT false,
  "responsible" TEXT,
  "priority" TEXT NOT NULL DEFAULT 'normal',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OperationalEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OperationalEvent_fleet_timestamp_idx" ON "OperationalEvent"("fleet", "timestamp");
CREATE INDEX "OperationalEvent_operation_timestamp_idx" ON "OperationalEvent"("operation", "timestamp");
CREATE INDEX "OperationalEvent_type_timestamp_idx" ON "OperationalEvent"("type", "timestamp");
