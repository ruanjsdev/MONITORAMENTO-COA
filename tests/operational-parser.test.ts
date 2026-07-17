import { describe, expect, it } from "vitest";
import {
  extractEquipment,
  normalizeMessage,
  parseMessage,
  parseMessages,
  parseReport
} from "../apps/api/src/services/operational-parser/index";
describe("parser operacional sem IA", () => {
  it("normaliza acentos e espaços sem alterar o original", () => {
    expect(normalizeMessage("  Correção   de SOLO ")).toBe("correcao de solo");
  });
  it.each([
    ["625 = rodando", "625", [], "RODANDO", "NORMAL"],
    ["1531/830 = deslocamento para Chapadinha", "1531", ["830"], null, "DESLOCAMENTO"],
    ["1530/2006 = atolada", "1530", ["2006"], null, "ATOLADO"],
    [
      "1506/12016/12017 = deslocamento Chapadinha",
      "1506",
      ["12016", "12017"],
      null,
      "DESLOCAMENTO"
    ],
    ["1602/1063 = aguardando área", "1602", ["1063"], null, "AGUARDANDO_AREA"],
    ["1601 = disponível", "1601", [], "DISPONIVEL", null],
    ["1532/643 = dando apoio à irrigação", "1532", ["643"], null, "APOIO_OUTRA_OPERACAO"]
  ])("interpreta conjunto e situação: %s", (text, fleet, attachments, status, situation) => {
    const p = parseMessage(text, { operation: "Plantio" });
    expect(p.mainEquipment).toBe(fleet);
    expect(p.attachments).toEqual(attachments);
    expect(p.proposedStatus).toBe(status);
    expect(p.operationalSituation).toBe(situation);
  });
  it("preserva conjunto sem dividir ocorrencias", () =>
    expect(extractEquipment("1506/12016/12017 = rodando")).toEqual({
      mainEquipment: "1506",
      attachments: ["12016", "12017"],
      equipmentSet: "1506/12016/12017"
    }));
  it("aplica o mesmo estado a todas as frotas separadas por vírgula e 'e'", () => {
    const parsed = parseMessages("1528, 1530 e 164 rodando coa");
    expect(parsed.map((item) => item.mainEquipment)).toEqual(["1528", "1530", "164"]);
    expect(parsed.map((item) => item.proposedStatus)).toEqual(["RODANDO", "RODANDO", "RODANDO"]);
  });
  it("mantém barra como conjunto de frota e implementos", () => {
    const parsed = parseMessages("1531/830 = rodando");
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({ mainEquipment: "1531", attachments: ["830"] });
  });
  it("extrai quebra, previsão e baixa confiança sem inventar operação", () => {
    const p = parseMessage(
      "626 = cilindro de inclinação divisor de linha quebrado, previsão de liberação 18:00"
    );
    expect(p.proposedStatus).toBe("PARADO");
    expect(new Date(p.forecastAt!).getHours()).toBe(18);
    expect(p.operation).toBeNull();
    expect(p.unresolvedFields).toContain("operation");
  });
  it.each([
    ["Cultivo rodando no D1", "Cultivo", "D1"],
    ["Correção de Solo rodou no J2", "Correção de Solo", "J2"],
    [
      "Compostagem rodando na usina / transporte de torta",
      "Compostagem",
      "usina / transporte de torta"
    ],
    ["CPD aplicando pré-emergente no Ouro Verde 2 com frota 821", "CPD", "ouro verde 2"]
  ])("classifica operação e local: %s", (text, operation, location) => {
    const p = parseMessage(text);
    expect(p.operation).toBe(operation);
    expect(p.location).toBe(location);
  });
  it("mantem status anterior quando identifica só situação", () => {
    const p = parseMessage("1604/100071 = aguardando área", { operation: "Cultivo" });
    expect(p.proposedStatus).toBeNull();
    expect(p.warnings[0]).toMatch(/manter estado anterior/);
  });
  it("separa relatório por operação e herda cabeçalho", () => {
    const report = parseReport(
      `RELATÓRIO PLANTIO E COLHEITA DE MUDA\nData: 10/07/2026\nTurno: C\nVariedade: RB07-818\nPLANTIO\n1531/830 = deslocamento para Chapadinha\nCOLHEITA DE MUDA\n625 = rodando`
    );
    expect(report.items).toHaveLength(2);
    expect(report.items[0].operation).toBe("Plantio Mecanizado");
    expect(report.items[1].operation).toBe("Colheita de Muda");
    expect(report.items[1].variety).toBe("RB07-818");
  });

  it("interpreta o relatório real de Preparo de Solo sem misturar frotas e implementos", () => {
    const report = parseReport(`*RELATÓRIO PREPARO DE SOLO*
🗾*Setor K1*
📅*Data: 16/07/2026*

*TURNO*: C

*🚜✅1602/1063*=Ag / Área Subsolada ⚠️
*🚜✅1603/1095*= Ag / Área Subsolada ⚠️
*🚜✅870392*= RODANDO
🚜✅1604/100071*=rodando
*🚜✅1601/ 837 RODANDO  Subsolador
*🚜❌964/Parado Não Tá Andando Frente Nei Para Trazer
*🚜✅746/ 800.rodando

*Chapadinha*🔻
*🚜✅864*/300 Parado Ag / Área ⚠️

🔻IMPLEMENTOS DISPONÍVEIS
 Quebrado
✅643: disponível
✅600=Disponível
✅100072= Disponível
✅100074=disponível

*Frota🔧⚠️🔻*
❌🚜1605 = Previsão 18/07 As 17 Hrs
*🚜❌1405*=Frota`);

    expect(report.header).toEqual({
      title: "*RELATÓRIO PREPARO DE SOLO*",
      sector: "K1",
      date: "16/07/2026",
      shift: "C",
      variety: null
    });
    expect(report.items.map((item) => item.mainEquipment)).toEqual([
      "1602",
      "1603",
      "870392",
      "1604",
      "1601",
      "964",
      "746",
      "864",
      "1605",
      "1405"
    ]);
    expect(report.items.find((item) => item.mainEquipment === "1602")).toMatchObject({
      operation: "Preparo de Solo",
      attachments: ["1063"],
      proposedStatus: "DISPONIVEL",
      operationalSituation: "AGUARDANDO_AREA",
      location: "K1"
    });
    expect(report.items.find((item) => item.mainEquipment === "1604")).toMatchObject({
      attachments: ["100071"],
      proposedStatus: "RODANDO"
    });
    expect(report.items.find((item) => item.mainEquipment === "964")).toMatchObject({
      proposedStatus: "PARADO",
      location: "K1"
    });
    expect(report.items.find((item) => item.mainEquipment === "864")).toMatchObject({
      attachments: ["300"],
      proposedStatus: "PARADO",
      location: "Chapadinha"
    });
    expect(report.items.find((item) => item.mainEquipment === "1605")).toMatchObject({
      proposedStatus: "PARADO",
      operationalSituation: "AGUARDANDO_PREVISAO"
    });
    expect(report.items.find((item) => item.mainEquipment === "1605")?.forecastAt).toContain(
      "2026-07-18"
    );
    expect(report.items.find((item) => item.mainEquipment === "1405")).toMatchObject({
      proposedStatus: null,
      description: null
    });
    expect(report.inventoryItems.map((item) => item.equipmentCode)).toEqual([
      "643",
      "600",
      "100072",
      "100074"
    ]);
    expect(report.items.some((item) => item.mainEquipment === "643")).toBe(false);
  });
});
