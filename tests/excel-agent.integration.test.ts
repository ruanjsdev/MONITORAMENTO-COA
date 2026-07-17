import { createHash, randomUUID } from "node:crypto";
import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { executeComCommand } from "../apps/excel-agent/src/com-bridge";
import { homologationRoot, officialBackupRoot } from "../apps/excel-agent/src/security";
import {
  ExcelAgentCommand,
  OFFICIAL_PILOT_ROLLBACK_CONFIRMATION,
  OFFICIAL_PILOT_WRITE_CONFIRMATION,
  officialPilotAddresses
} from "@coa-bot/excel-contracts";

const workbook = path.join(homologationRoot, "Planilha Plantio cana.dev.xlsm");
const temporary: string[] = [];
const previousOfficial = process.env.OFFICIAL_PLANTIO_WORKBOOK;
const command = (
  type: ExcelAgentCommand["type"],
  payload: ExcelAgentCommand["payload"] = {},
  extra: Partial<ExcelAgentCommand> = {}
): ExcelAgentCommand => ({
  commandId: randomUUID(),
  correlationId: randomUUID(),
  requestedAt: new Date().toISOString(),
  requestedBy: "windows-integration-test",
  type,
  payload,
  simulation: true,
  ...extra
});

afterEach(async () => {
  process.env.OFFICIAL_PLANTIO_WORKBOOK = previousOfficial;
  for (const file of temporary.splice(0)) await rm(file, { force: true, recursive: true });
});

async function temporaryDevWorkbook() {
  const folder = path.join(homologationRoot, ".excel-tests", randomUUID());
  const copy = path.join(folder, "Planilha Plantio cana.dev.xlsm");
  await mkdir(folder, { recursive: true });
  await copyFile(workbook, copy);
  temporary.push(folder);
  return copy;
}

describe.skipIf(process.platform !== "win32")("integração Excel COM Windows", () => {
  it("detecta Excel por COM", async () => {
    const result = await executeComCommand(command("CHECK_EXCEL_INSTALLED"));
    expect(result.success).toBe(true);
    expect(result.result).toHaveProperty("installed");
    expect(result.macrosExecuted).toBe(false);
  });
  it("abre cópia dev e lê célula sem salvar", async () => {
    const copy = await temporaryDevWorkbook();
    const result = await executeComCommand(
      command("READ_CELL", { cell: "F8" }, { workbook: copy, worksheet: "PLANTIO" })
    );
    expect(result.success).toBe(true);
    expect(result.executed).toBe(true);
    expect(result.officialWorkbookTouched).toBe(false);
  });
  it("localiza frota sem escolher correspondência ambígua", async () => {
    const copy = await temporaryDevWorkbook();
    const result = await executeComCommand(
      command(
        "FIND_EQUIPMENT",
        { fleet: "625", fleetColumn: "F", headerRow: 7 },
        { workbook: copy, worksheet: "PLANTIO" }
      )
    );
    expect(result.success).toBe(true);
    expect(result.result).toHaveProperty("status");
  });

  it("prepara backup idêntico, escreve somente a whitelist, relê e restaura a cópia de teste", async () => {
    const source = path.join(homologationRoot, `official-pilot-${randomUUID()}.xlsm`);
    const backup = path.join(
      officialBackupRoot,
      "integration-tests",
      `backup-${randomUUID()}.xlsm`
    );
    temporary.push(source, backup);
    await mkdir(path.dirname(backup), { recursive: true });
    await copyFile(workbook, source);
    process.env.OFFICIAL_PLANTIO_WORKBOOK = source;

    const prepare = await executeComCommand(
      command(
        "PREPARE_OFFICIAL_PILOT",
        { fleet: "1531", implement: "830", backupPath: backup },
        { workbook: source, worksheet: "PLANTIO", simulation: false }
      )
    );
    expect(prepare.success, prepare.error?.message).toBe(true);
    expect(prepare.officialWorkbookTouched).toBe(true);
    const preview = prepare.result as {
      row: number;
      current: Record<string, unknown>;
      originalHash: string;
      backupHash: string;
    };
    expect(preview.originalHash).toBe(preview.backupHash);
    expect(hash(await readFile(source))).toBe(hash(await readFile(backup)));

    const cells = officialPilotAddresses(preview.row);
    const proposed = {
      status: "R",
      startDate: "",
      startTime: "",
      forecastDate: "",
      forecastTime: "",
      description: "RODANDO"
    };
    const wrongRow = preview.row + 1;
    const wrongCells = officialPilotAddresses(wrongRow);
    const rowConflict = await executeComCommand(
      command(
        "APPLY_OFFICIAL_PILOT",
        {
          fleet: "1531",
          implement: "830",
          row: wrongRow,
          statusCell: wrongCells.status,
          startDateCell: wrongCells.startDate,
          startTimeCell: wrongCells.startTime,
          forecastDateCell: wrongCells.forecastDate,
          forecastTimeCell: wrongCells.forecastTime,
          descriptionCell: wrongCells.description,
          expectedCurrent: preview.current,
          proposed,
          editableFields: Object.keys(proposed),
          mappingConfirmed: true,
          backupPath: backup,
          backupHash: preview.backupHash,
          expectedWorkbookHash: preview.originalHash,
          confirmation: OFFICIAL_PILOT_WRITE_CONFIRMATION
        },
        { workbook: source, worksheet: "PLANTIO", simulation: false }
      )
    );
    expect(rowConflict.success).toBe(false);
    expect(rowConflict.error?.code).toBe("ROW_CONFLICT");

    const apply = await executeComCommand(
      command(
        "APPLY_OFFICIAL_PILOT",
        {
          fleet: "1531",
          implement: "830",
          row: preview.row,
          statusCell: cells.status,
          startDateCell: cells.startDate,
          startTimeCell: cells.startTime,
          forecastDateCell: cells.forecastDate,
          forecastTimeCell: cells.forecastTime,
          descriptionCell: cells.description,
          expectedCurrent: preview.current,
          proposed,
          editableFields: Object.keys(proposed),
          mappingConfirmed: true,
          backupPath: backup,
          backupHash: preview.backupHash,
          expectedWorkbookHash: preview.originalHash,
          confirmation: OFFICIAL_PILOT_WRITE_CONFIRMATION
        },
        { workbook: source, worksheet: "PLANTIO", simulation: false }
      )
    );
    expect(apply.success, apply.error?.message).toBe(true);
    const written = apply.result as {
      saved: boolean;
      verified: boolean;
      values: Record<string, unknown>;
      writtenHash: string;
      eventsRestored: boolean;
    };
    expect(written).toMatchObject({ saved: true, verified: true, eventsRestored: true });
    expect(written.values.status).toBe("R");
    expect(written.values.description).toBe("RODANDO");
    for (const field of ["startDate", "startTime", "forecastDate", "forecastTime"])
      expect(written.values[field] ?? "").toBe("");

    const conflictingRollback = await executeComCommand(
      command(
        "ROLLBACK_OFFICIAL_PILOT",
        {
          fleet: "1531",
          implement: "830",
          backupPath: backup,
          backupHash: preview.backupHash,
          expectedCurrentHash: "0".repeat(64),
          confirmation: OFFICIAL_PILOT_ROLLBACK_CONFIRMATION
        },
        { workbook: source, worksheet: "PLANTIO", simulation: false }
      )
    );
    expect(conflictingRollback.success).toBe(false);
    expect(conflictingRollback.error?.code).toBe("ROLLBACK_CONFLICT");
    expect(hash(await readFile(source))).toBe(written.writtenHash);

    const rollback = await executeComCommand(
      command(
        "ROLLBACK_OFFICIAL_PILOT",
        {
          fleet: "1531",
          implement: "830",
          backupPath: backup,
          backupHash: preview.backupHash,
          expectedCurrentHash: written.writtenHash,
          confirmation: OFFICIAL_PILOT_ROLLBACK_CONFIRMATION
        },
        { workbook: source, worksheet: "PLANTIO", simulation: false }
      )
    );
    expect(rollback.success, rollback.error?.message).toBe(true);
    expect(rollback.result).toMatchObject({ restored: true, restoredHash: preview.backupHash });
    expect(hash(await readFile(source))).toBe(preview.backupHash);
  });

  it("bloqueia conflito de baseline sem alterar a cópia de teste", async () => {
    const source = path.join(homologationRoot, `official-conflict-${randomUUID()}.xlsm`);
    const backup = path.join(
      officialBackupRoot,
      "integration-tests",
      `conflict-${randomUUID()}.xlsm`
    );
    temporary.push(source, backup);
    await mkdir(path.dirname(backup), { recursive: true });
    await copyFile(workbook, source);
    process.env.OFFICIAL_PLANTIO_WORKBOOK = source;
    const prepare = await executeComCommand(
      command(
        "PREPARE_OFFICIAL_PILOT",
        { fleet: "1531", implement: "830", backupPath: backup },
        { workbook: source, worksheet: "PLANTIO", simulation: false }
      )
    );
    expect(prepare.success, prepare.error?.message).toBe(true);
    const preview = prepare.result as {
      row: number;
      current: Record<string, unknown>;
      backupHash: string;
      originalHash: string;
    };
    const before = hash(await readFile(source));
    const cells = officialPilotAddresses(preview.row);
    const proposed = {
      status: "R",
      startDate: "",
      startTime: "",
      forecastDate: "",
      forecastTime: "",
      description: "RODANDO"
    };
    const result = await executeComCommand(
      command(
        "APPLY_OFFICIAL_PILOT",
        {
          fleet: "1531",
          implement: "830",
          row: preview.row,
          statusCell: cells.status,
          startDateCell: cells.startDate,
          startTimeCell: cells.startTime,
          forecastDateCell: cells.forecastDate,
          forecastTimeCell: cells.forecastTime,
          descriptionCell: cells.description,
          expectedCurrent: { ...preview.current, description: "VALOR IMPOSSÍVEL" },
          proposed,
          editableFields: Object.keys(proposed),
          mappingConfirmed: true,
          backupPath: backup,
          backupHash: preview.backupHash,
          expectedWorkbookHash: preview.originalHash,
          confirmation: OFFICIAL_PILOT_WRITE_CONFIRMATION
        },
        { workbook: source, worksheet: "PLANTIO", simulation: false }
      )
    );
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("CELL_CONFLICT");
    expect(hash(await readFile(source))).toBe(before);
  });
});

function hash(value: Buffer) {
  return createHash("sha256").update(value).digest("hex").toUpperCase();
}
