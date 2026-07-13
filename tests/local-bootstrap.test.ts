import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { LOCAL_OPERATIONAL_WORKBOOKS, validateLocalOperationalWorkbook } from "@coa-bot/excel-contracts";

describe("bootstrap local portátil", () => {
  it("mantém os quatro scripts obrigatórios no package.json", async () => {
    const pkg = JSON.parse(await readFile(path.resolve("package.json"), "utf8"));
    expect(pkg.scripts["setup:windows"]).toContain("scripts/setup-windows.ps1");
    expect(pkg.scripts["start:local"]).toContain("scripts/start-local.ps1");
    expect(pkg.scripts["stop:local"]).toContain("scripts/stop-local.ps1");
    expect(pkg.scripts["status:local"]).toContain("scripts/status-local.ps1");
  });

  it("valida somente workbooks .dev da whitelist dentro da pasta local", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "coa-local-"));
    try {
      const file = path.join(root, LOCAL_OPERATIONAL_WORKBOOKS[0].fileName);
      writeFileSync(file, "fake-xlsm");
      const valid = validateLocalOperationalWorkbook({ id: LOCAL_OPERATIONAL_WORKBOOKS[0].id, root });
      expect(valid.exists).toBe(true);
      expect(valid.filePath).toBe(file);
      expect(() => validateLocalOperationalWorkbook({ filePath: path.join(root, "Planilha Plantio cana.xlsm"), root })).toThrow(/whitelist|Somente/i);
      expect(() => validateLocalOperationalWorkbook({ filePath: path.join(root, "..", "Planilha Plantio cana.dev.xlsm"), root })).toThrow(/fora|whitelist/i);
      expect(() => validateLocalOperationalWorkbook({ filePath: "\\\\servidor\\coa\\Planilha Plantio cana.dev.xlsm", root })).toThrow(/rede|UNC/i);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("permite reportar planilha ausente sem abortar listagens", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "coa-local-missing-"));
    try {
      const value = validateLocalOperationalWorkbook({ id: LOCAL_OPERATIONAL_WORKBOOKS[1].id, root, mustExist: false });
      expect(value.exists).toBe(false);
      expect(value.fileName).toBe("Acompanhamento Tratos Culturais.dev.xlsm");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("scripts não imprimem placeholders de segredos fortes", async () => {
    const setup = await readFile(path.resolve("scripts/setup-windows.ps1"), "utf8");
    const common = await readFile(path.resolve("scripts/coa-local-common.ps1"), "utf8");
    expect(common).toContain("New-StrongSecret");
    expect(setup).not.toContain("change-me-in-development");
    expect(setup).not.toContain("replace-with-at-least");
  });
});
