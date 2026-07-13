import { describe, expect, it } from "vitest";
import { allowedConfigurationSettings, configurationImportSchema } from "../apps/api/src/modules/configuration/routes";

describe("portabilidade segura de configurações", () => {
  it("aceita schema versionado sem segredos e rejeita formatos desconhecidos", () => {
    const valid = configurationImportSchema.safeParse({
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      configuration: {
        operations: [{ name: "Plantio Mecanizado", emoji: "🚜", allowedStatuses: ["RODANDO", "PARADO"] }],
        mappings: [{ operationName: "Plantio Mecanizado", sheetName: "PLANTIO", fleetColumn: "F" }],
        groups: [{ name: "Grupo de teste", isMonitored: true }],
        settings: { OPERATIONAL_MODE: "LOCAL_OPERATIONAL" },
        visualPreferences: { density: "compact" }
      }
    });
    expect(valid.success).toBe(true);
    expect(configurationImportSchema.safeParse({ schemaVersion: 2, configuration: {} }).success).toBe(false);
  });

  it("filtro de importação não permite tokens, senhas, QR, sessões ou planilhas", () => {
    expect(allowedConfigurationSettings).toContain("OPERATIONAL_MODE");
    expect(allowedConfigurationSettings).not.toContain("JWT_SECRET");
    expect(allowedConfigurationSettings).not.toContain("EXCEL_AGENT_TOKEN");
    expect(allowedConfigurationSettings).not.toContain("WHATSAPP_SHADOW_TOKEN");
    expect(allowedConfigurationSettings).not.toContain("WHATSAPP_QR_PATH");
    expect(allowedConfigurationSettings).not.toContain("OFFICIAL_PLANTIO_WORKBOOK");
  });
});
