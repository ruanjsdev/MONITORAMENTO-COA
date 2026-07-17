import { PrismaClient, IntegrationKind, IntegrationState } from "@prisma/client";
import bcrypt from "bcryptjs";
import plantio from "../../../analysis/workbook-plantio.json" assert { type: "json" };
import tratos from "../../../analysis/workbook-tratos.json" assert { type: "json" };

const prisma = new PrismaClient();

type WorkbookAnalysis = any;

async function seedRolesAndAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL ?? "admin@coa.local";
  const adminPassword = process.env.ADMIN_PASSWORD ?? "change-me-dev-only";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: { name: "ADMIN" }
  });

  for (const key of [
    "dashboard:read",
    "groups:write",
    "operations:write",
    "spreadsheets:confirm",
    "tests:run",
    "logs:read"
  ]) {
    const permission = await prisma.permission.upsert({
      where: { key },
      update: {},
      create: { key }
    });
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: permission.id }
    });
  }

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      isActive: true
    },
    create: {
      name: "Administrador COA",
      email: adminEmail,
      passwordHash,
      mustChangePassword: true
    }
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: adminRole.id } },
    update: {},
    create: { userId: user.id, roleId: adminRole.id }
  });
}

async function seedOperations() {
  const operations = [
    [
      "Plantio Mecanizado",
      "Plantio",
      "🚜",
      "Planilha Plantio cana.xlsm",
      "PLANTIO",
      "A1:AI26",
      "F",
      "G",
      "H",
      "S",
      "L",
      8
    ],
    [
      "Colheita de Muda",
      "Muda",
      "🌱",
      "Planilha Plantio cana.xlsm",
      "COLHEITA E TRANSPORTE DE MUDA",
      "A1:AJ25",
      "F",
      "G",
      "H",
      "S",
      "L",
      5
    ],
    [
      "Preparo de Solo",
      "Preparo",
      "🚛",
      "Planilha Plantio cana.xlsm",
      "PREPARO DE SOLO",
      "A1:AL37",
      "F",
      "G",
      "H",
      "S",
      "L",
      4
    ],
    [
      "CPD",
      "CPD",
      "🧪",
      "Acompanhamento Tratos Culturais.xlsm",
      "CPD",
      "A1:AH51",
      "F",
      "G",
      "H",
      "S",
      "L",
      3
    ],
    [
      "Compostagem",
      "Compostagem",
      "♻️",
      "Acompanhamento Tratos Culturais.xlsm",
      "COMPOSTAGEM",
      "A1:AH29",
      "F",
      "G",
      "H",
      "S",
      "L",
      4
    ],
    [
      "Cultivo",
      "Cultivo",
      "🌿",
      "Acompanhamento Tratos Culturais.xlsm",
      "CULTIVO",
      "A1:AH50",
      "F",
      "G",
      "H",
      "S",
      "L",
      6
    ],
    [
      "Correção de Solo",
      "Correção",
      "🧱",
      "Acompanhamento Tratos Culturais.xlsm",
      "CORREÇÃO DE SOLO",
      "A1:AH36",
      "F",
      "G",
      "H",
      "S",
      "L",
      2
    ]
  ] as const;

  for (const [
    name,
    shortName,
    emoji,
    spreadsheetFile,
    sheetName,
    imageRange,
    fleetColumn,
    implementColumn,
    statusColumn,
    descriptionColumn,
    timeColumn,
    fleetCount
  ] of operations) {
    await prisma.operation.upsert({
      where: { name },
      update: {
        shortName,
        emoji,
        spreadsheetFile,
        sheetName,
        imageRange,
        fleetColumn,
        implementColumn,
        statusColumn,
        descriptionColumn,
        timeColumn,
        fleetCount,
        active: true,
        status: "active"
      },
      create: {
        name,
        shortName,
        emoji,
        description: `${name} em homologação.`,
        spreadsheetFile,
        sheetName,
        imageRange,
        fleetColumn,
        implementColumn,
        statusColumn,
        descriptionColumn,
        timeColumn,
        fleetCount,
        allowedStatuses: ["RODANDO", "PARADO", "MANUTENCAO", "DISPONIVEL"],
        shifts: ["A", "B", "C"],
        monitor: true,
        status: "active",
        active: true,
        requiresApproval: true
      }
    });
  }
}

async function seedWorkbook(workbook: WorkbookAnalysis) {
  const spreadsheet = await prisma.spreadsheet.upsert({
    where: { path: workbook.fullPath },
    update: {
      fileName: workbook.fileName,
      sizeBytes: workbook.sizeBytes,
      macrosDetected: workbook.vba.hasVbaProject,
      externalLinksDetected: workbook.externalLinks.length > 0,
      risks: workbook.risks,
      lastAnalysisAt: new Date()
    },
    create: {
      fileName: workbook.fileName,
      path: workbook.fullPath,
      sizeBytes: workbook.sizeBytes,
      macrosDetected: workbook.vba.hasVbaProject,
      externalLinksDetected: workbook.externalLinks.length > 0,
      risks: workbook.risks,
      lastAnalysisAt: new Date()
    }
  });

  for (const sheet of workbook.sheets) {
    const existing = await prisma.spreadsheetSheet.findFirst({
      where: { spreadsheetId: spreadsheet.id, name: sheet.name }
    });
    const payload = {
      state: sheet.state,
      usedRange: sheet.dimension,
      formulas: sheet.formulas.length,
      mergedCells: sheet.mergedCells.length,
      protected: sheet.protected,
      candidateColumns: sheet.candidateColumns,
      candidateImageArea: sheet.printArea ?? sheet.dimension ?? "necessita confirmação"
    };
    if (existing) {
      await prisma.spreadsheetSheet.update({ where: { id: existing.id }, data: payload });
    } else {
      await prisma.spreadsheetSheet.create({
        data: { spreadsheetId: spreadsheet.id, name: sheet.name, ...payload }
      });
    }
  }
}

async function seedIntegrationsAndSettings() {
  for (const [kind, message] of [
    [IntegrationKind.API, "API em desenvolvimento"],
    [IntegrationKind.DATABASE, "PostgreSQL configurado"],
    [IntegrationKind.WHATSAPP, "WhatsApp em simulação"],
    [IntegrationKind.EXCEL_AGENT, "Agente Excel em simulação"],
    [IntegrationKind.SPREADSHEET, "Planilhas em somente leitura"]
  ] as const) {
    await prisma.integrationStatus.upsert({
      where: { kind },
      update: { state: IntegrationState.SIMULATED, message },
      create: { kind, state: IntegrationState.SIMULATED, message }
    });
  }

  await prisma.generalSetting.upsert({
    where: { key: "SIMULATION_MODE" },
    update: { value: true },
    create: { key: "SIMULATION_MODE", value: true }
  });
}

async function main() {
  await seedRolesAndAdmin();
  await seedOperations();
  await seedWorkbook(plantio);
  await seedWorkbook(tratos);
  await seedIntegrationsAndSettings();
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
