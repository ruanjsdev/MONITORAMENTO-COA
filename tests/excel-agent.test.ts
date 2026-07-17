import { createHash, randomUUID } from "node:crypto";
import { copyFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { prepareDevCopies } from "../apps/excel-agent/src/prepare-dev";
import {
  homologationRoot,
  officialRoot,
  tempRoot,
  validateDevWorkbook,
  validateTempImage
} from "../apps/excel-agent/src/security";
import { executeComCommand } from "../apps/excel-agent/src/com-bridge";
import { ExcelAgentCommand } from "@coa-bot/excel-contracts";
const cmd = (overrides: Partial<ExcelAgentCommand>): ExcelAgentCommand => ({
  commandId: randomUUID(),
  correlationId: randomUUID(),
  requestedAt: new Date().toISOString(),
  requestedBy: "test",
  type: "HEALTH_CHECK",
  payload: {},
  simulation: true,
  ...overrides
});
describe("segurança do agente Excel", () => {
  it("bloqueia arquivo oficial", () =>
    expect(() =>
      validateDevWorkbook(path.join(officialRoot, "Planilha Plantio cana.xlsm"))
    ).toThrow(/oficial/));
  it("bloqueia caminho fora da homologação", () =>
    expect(() => validateDevWorkbook(path.resolve("arquivo.dev.xlsm"))).toThrow(/fora/));
  it("aceita somente .dev.xlsm cadastrado na whitelist", () =>
    expect(
      validateDevWorkbook(path.join(homologationRoot, "Planilha Plantio cana.dev.xlsm"))
    ).toContain("planilhas-homologacao"));
  it("limita imagens PNG à pasta temporária", () => {
    expect(validateTempImage(path.join(tempRoot, "preview.png"))).toContain("preview.png");
    expect(() => validateTempImage(path.join(homologationRoot, "preview.png"))).toThrow();
  });
  it("gera uma cópia temporária com hash idêntico sem alterar a planilha", async () => {
    const source = path.join(officialRoot, "Planilha Plantio cana.xlsm");
    const temporary = path.join(homologationRoot, `excel-copy-${randomUUID()}.xlsm`);
    const before = hash(await readFile(source));
    try {
      await copyFile(source, temporary);
      expect(hash(await readFile(temporary))).toBe(before);
      expect(hash(await readFile(source))).toBe(before);
    } finally {
      await rm(temporary, { force: true });
    }
  });
  it("não sobrescreve cópia sem confirmação force", async () => {
    await expect(prepareDevCopies()).rejects.toThrow(/--force/);
  });
  it("bloqueia escrita quando simulação ou mapeamento não confirmado", async () => {
    const result = await executeComCommand(
      cmd({
        type: "APPLY_CHANGE",
        workbook: path.join(homologationRoot, "Planilha Plantio cana.dev.xlsm"),
        worksheet: "PLANTIO",
        payload: { mappingConfirmed: false },
        simulation: true
      })
    );
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("WRITE_NOT_AUTHORIZED");
    expect(result.officialWorkbookTouched).toBe(false);
    expect(result.macrosExecuted).toBe(false);
  });
});
function hash(value: Buffer) {
  return createHash("sha256").update(value).digest("hex");
}
