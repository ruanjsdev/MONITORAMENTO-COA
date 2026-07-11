-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "ChangeStatus" AS ENUM ('PENDING', 'APPROVED_SIMULATED', 'APPROVED', 'REJECTED', 'DEFERRED', 'DUPLICATE');

-- CreateEnum
CREATE TYPE "IntegrationKind" AS ENUM ('API', 'DATABASE', 'WHATSAPP', 'EXCEL_AGENT', 'SPREADSHEET');

-- CreateEnum
CREATE TYPE "IntegrationState" AS ENUM ('ONLINE', 'OFFLINE', 'SIMULATED', 'ERROR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "WhatsAppGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "externalId" TEXT,
    "description" TEXT DEFAULT '',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isMonitored" BOOLEAN NOT NULL DEFAULT true,
    "receivesReports" BOOLEAN NOT NULL DEFAULT false,
    "allowTests" BOOLEAN NOT NULL DEFAULT true,
    "allowedHours" TEXT DEFAULT '',
    "notes" TEXT DEFAULT '',
    "isTestGroup" BOOLEAN NOT NULL DEFAULT false,
    "defaultMessage" TEXT NOT NULL DEFAULT '',
    "lastMessage" TEXT,
    "lastActivity" TIMESTAMP(3),
    "processedMessages" INTEGER NOT NULL DEFAULT 0,
    "connectionStatus" TEXT NOT NULL DEFAULT 'simulated',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT DEFAULT '',
    "emoji" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "spreadsheetFile" TEXT,
    "sheetName" TEXT,
    "destinationGroupId" TEXT DEFAULT '',
    "allowedStatuses" TEXT[],
    "synonyms" TEXT DEFAULT '',
    "shifts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "reportTimes" TEXT DEFAULT '',
    "legendTemplate" TEXT DEFAULT '',
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "imageRange" TEXT DEFAULT '',
    "fleetColumn" TEXT DEFAULT '',
    "implementColumn" TEXT DEFAULT '',
    "statusColumn" TEXT DEFAULT '',
    "descriptionColumn" TEXT DEFAULT '',
    "timeColumn" TEXT DEFAULT '',
    "fleetCount" INTEGER NOT NULL DEFAULT 0,
    "automaticReport" BOOLEAN NOT NULL DEFAULT false,
    "monitor" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Operation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupOperation" (
    "groupId" TEXT NOT NULL,
    "operationId" TEXT NOT NULL,

    CONSTRAINT "GroupOperation_pkey" PRIMARY KEY ("groupId","operationId")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "operationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Spreadsheet" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL DEFAULT 0,
    "macrosDetected" BOOLEAN NOT NULL DEFAULT false,
    "externalLinksDetected" BOOLEAN NOT NULL DEFAULT false,
    "risks" JSONB,
    "lastAnalysisAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Spreadsheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpreadsheetSheet" (
    "id" TEXT NOT NULL,
    "spreadsheetId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "usedRange" TEXT,
    "formulas" INTEGER NOT NULL DEFAULT 0,
    "mergedCells" INTEGER NOT NULL DEFAULT 0,
    "protected" BOOLEAN NOT NULL DEFAULT false,
    "official" BOOLEAN NOT NULL DEFAULT false,
    "candidateColumns" JSONB,
    "candidateImageArea" TEXT,
    "humanNotes" TEXT DEFAULT '',
    "confirmationStatus" TEXT NOT NULL DEFAULT 'NEEDS_ANALYSIS',

    CONSTRAINT "SpreadsheetSheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpreadsheetMapping" (
    "id" TEXT NOT NULL,
    "spreadsheetId" TEXT NOT NULL,
    "operationName" TEXT NOT NULL,
    "sheetName" TEXT NOT NULL,
    "headerRow" INTEGER,
    "fleetColumn" TEXT,
    "implementColumn" TEXT,
    "statusColumn" TEXT,
    "descriptionColumn" TEXT,
    "timeColumn" TEXT,
    "imageRange" TEXT,
    "confidence" TEXT DEFAULT 'necessita confirmação',
    "confirmationStatus" TEXT NOT NULL DEFAULT 'NEEDS_ANALYSIS',
    "editableFields" JSONB,
    "protectedFields" JSONB,
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "SpreadsheetMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IncomingMessage" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "groupId" TEXT,
    "sender" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IncomingMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParsedMessage" (
    "id" TEXT NOT NULL,
    "incomingMessageId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "parsedJson" JSONB NOT NULL,

    CONSTRAINT "ParsedMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingChange" (
    "id" TEXT NOT NULL,
    "incomingMessageId" TEXT,
    "operationId" TEXT,
    "equipmentCode" TEXT NOT NULL,
    "currentStatus" TEXT NOT NULL,
    "newStatus" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" "ChangeStatus" NOT NULL DEFAULT 'PENDING',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovedChange" (
    "id" TEXT NOT NULL,
    "pendingChangeId" TEXT NOT NULL,
    "simulated" BOOLEAN NOT NULL DEFAULT true,
    "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovedChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RejectedChange" (
    "id" TEXT NOT NULL,
    "pendingChangeId" TEXT NOT NULL,
    "reason" TEXT,
    "rejectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RejectedChange_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Occurrence" (
    "id" TEXT NOT NULL,
    "operationId" TEXT,
    "equipment" TEXT,
    "statusFrom" TEXT,
    "statusTo" TEXT,
    "description" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "validation" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Occurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentStatusHistory" (
    "id" TEXT NOT NULL,
    "equipmentId" TEXT NOT NULL,
    "previousStatus" TEXT,
    "newStatus" TEXT NOT NULL,
    "reason" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "EquipmentStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startsAt" TEXT NOT NULL,
    "endsAt" TEXT NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShiftReport" (
    "id" TEXT NOT NULL,
    "shiftId" TEXT NOT NULL,
    "reportDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "draftText" TEXT NOT NULL,
    "finalText" TEXT,

    CONSTRAINT "ShiftReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationSubscription" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "keys" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotificationSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT,
    "entityId" TEXT,
    "message" TEXT NOT NULL,
    "beforeValue" JSONB,
    "afterValue" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "result" TEXT NOT NULL DEFAULT 'SUCCESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationStatus" (
    "id" TEXT NOT NULL,
    "kind" "IntegrationKind" NOT NULL,
    "state" "IntegrationState" NOT NULL,
    "message" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TestExecution" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "userId" TEXT,
    "operation" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "spreadsheet" TEXT,
    "sheet" TEXT,
    "range" TEXT,
    "legend" TEXT,
    "result" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "simulatedData" JSONB,
    "durationMs" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TestExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneralSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneralSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppGroup_externalId_key" ON "WhatsAppGroup"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Operation_name_key" ON "Operation"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_code_key" ON "Equipment"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Spreadsheet_path_key" ON "Spreadsheet"("path");

-- CreateIndex
CREATE UNIQUE INDEX "IncomingMessage_idempotencyKey_key" ON "IncomingMessage"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovedChange_pendingChangeId_key" ON "ApprovedChange"("pendingChangeId");

-- CreateIndex
CREATE UNIQUE INDEX "RejectedChange_pendingChangeId_key" ON "RejectedChange"("pendingChangeId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationSubscription_endpoint_key" ON "NotificationSubscription"("endpoint");

-- CreateIndex
CREATE UNIQUE INDEX "IntegrationStatus_kind_key" ON "IntegrationStatus"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_tokenId_key" ON "AuthSession"("tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "GeneralSetting_key_key" ON "GeneralSetting"("key");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupOperation" ADD CONSTRAINT "GroupOperation_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "WhatsAppGroup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupOperation" ADD CONSTRAINT "GroupOperation_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpreadsheetSheet" ADD CONSTRAINT "SpreadsheetSheet_spreadsheetId_fkey" FOREIGN KEY ("spreadsheetId") REFERENCES "Spreadsheet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpreadsheetMapping" ADD CONSTRAINT "SpreadsheetMapping_spreadsheetId_fkey" FOREIGN KEY ("spreadsheetId") REFERENCES "Spreadsheet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomingMessage" ADD CONSTRAINT "IncomingMessage_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "WhatsAppGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParsedMessage" ADD CONSTRAINT "ParsedMessage_incomingMessageId_fkey" FOREIGN KEY ("incomingMessageId") REFERENCES "IncomingMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingChange" ADD CONSTRAINT "PendingChange_incomingMessageId_fkey" FOREIGN KEY ("incomingMessageId") REFERENCES "IncomingMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingChange" ADD CONSTRAINT "PendingChange_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovedChange" ADD CONSTRAINT "ApprovedChange_pendingChangeId_fkey" FOREIGN KEY ("pendingChangeId") REFERENCES "PendingChange"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RejectedChange" ADD CONSTRAINT "RejectedChange_pendingChangeId_fkey" FOREIGN KEY ("pendingChangeId") REFERENCES "PendingChange"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Occurrence" ADD CONSTRAINT "Occurrence_operationId_fkey" FOREIGN KEY ("operationId") REFERENCES "Operation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentStatusHistory" ADD CONSTRAINT "EquipmentStatusHistory_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShiftReport" ADD CONSTRAINT "ShiftReport_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SystemLog" ADD CONSTRAINT "SystemLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

