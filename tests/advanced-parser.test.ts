import { describe, expect, it } from "vitest";
import { compareWithOperationState, parseAdvancedOperationalReport } from "../apps/api/src/services/reports/advanced-parser";

describe("parser avançado de relatórios operacionais", () => {
  it("separa múltiplas seções e preserva cabeçalho", () => {
    const parsed = parseAdvancedOperationalReport("Setor: D1\nTurno: C\n🌱 Plantio de Cana\n1531/830 = rodando\n🚜 Preparo de Solo\n1601 = problema mecânico");
    expect(parsed.header.shift).toBe("C");
    expect(parsed.sections.map(section => section.operation)).toEqual(["Plantio de Cana", "Preparo de Solo"]);
    expect(parsed.items).toHaveLength(2);
  });

  it("consolida duplicata igual e complementar", () => {
    const parsed = parseAdvancedOperationalReport("Plantio de Cana\n164 = problema mecânico\n164 = problema mecânico, previsão 12:00");
    expect(parsed.items).toHaveLength(1);
    expect(parsed.items[0]?.duplicateState).toBe("MERGED");
  });

  it("preserva duplicata contraditória com alerta", () => {
    const parsed = parseAdvancedOperationalReport("Plantio de Cana\n625 = rodando\n625 = parado, vazamento");
    expect(parsed.items).toHaveLength(2);
    expect(parsed.alerts.some(alert => alert.code === "DUPLICATE_CONFLICT")).toBe(true);
  });

  it("normaliza erros de frota e descrição com confiança", () => {
    const parsed = parseAdvancedOperationalReport("Plantio de Cana\n153I = mangera estourda\nl529 = rodando");
    expect(parsed.items[0]?.mainEquipment).toBe("1531");
    expect(parsed.items[0]?.description).toBe("MANGUEIRA ESTOURADA");
    expect(parsed.items[1]?.mainEquipment).toBe("1529");
    expect(parsed.items[0]?.normalized.length).toBeGreaterThan(0);
  });

  it("cria alerta para implemento diferente e não altera automaticamente a coluna", () => {
    const parsed = parseAdvancedOperationalReport("Plantio de Cana\n1531/2006 = vazamento hidráulico");
    const comparison = compareWithOperationState(parsed.items, [{ fleet: "1531", implement: "830", status: "RODANDO", description: "RODANDO" }]);
    expect(comparison.alerts[0]?.code).toBe("IMPLEMENT_MISMATCH");
    expect(comparison.changes[0]?.proposed.description).toContain("IMPLEMENTO INFORMADO: 2006");
  });

  it("ignora item sem mudança", () => {
    const parsed = parseAdvancedOperationalReport("Plantio de Cana\n1531/830 = rodando");
    const comparison = compareWithOperationState(parsed.items, [{ fleet: "1531", implement: "830", status: "RODANDO", description: "RODANDO" }]);
    expect(comparison.changes).toHaveLength(0);
  });

  it("interpreta relatório real com emojis, markdown, descrição na linha seguinte e múltiplos implementos", () => {
    const parsed = parseAdvancedOperationalReport(`*RELATÓRIO PLANTIO E COLHEITA DE MUDA*🎋

🗾*Setor*: *Rafael Pandolf*
📅*Data*: *10/07/2026*
*🎋 VARIEDADE:* *RB07-818*
*TURNO: C*

*PLANTIO*
✅🚜🚟*=1531/830 =*
*Deslocamento para chapadinha*
⚠️🚜🚟= *1530/2006 : Atolada*
⚠️🚜🚟*1529/2003: Atolada*

*COLHEITA DE MUDA*
✅🚜 *= 625*= rodando
❌🚜 *= 626*= *Cilindro de inclinação divisor de linha quebrado pino de suspensão do divisorde linha quebrado previsãode liberação 18:00 Hrs
✅🚜 🚟🚟 *1506-12016/12017= deslocamento chapadinha*
✅🚜🚟🚟 *= 1509 = 12010/1211*= *rodando*
✅🚜🚟🚟 *= 1510 = 12038/12039 =* *Deslocamento chapadinha*
✅ 🚜🚟🚟 *= 1511 = 12020/12021= rodando*
✅🚒 *914*= *rodando*
@COA 🌱`);
    expect(parsed.header).toEqual({ sector: "Rafael Pandolf", date: "10/07/2026", shift: "C", variety: "RB07-818" });
    expect(parsed.sections.map(section => [section.operation, section.items.length])).toEqual([["Plantio Mecanizado", 3], ["Colheita de Muda", 7]]);
    expect(parsed.items.map(item => item.mainEquipment)).toEqual(["1531", "1530", "1529", "625", "626", "1506", "1509", "1510", "1511", "914"]);
    expect(parsed.items.find(item => item.mainEquipment === "1531")?.description).toBe("DESLOCAMENTO PARA CHAPADINHA");
    expect(parsed.items.find(item => item.mainEquipment === "1509")?.informedImplement).toBe("12010/1211");
    expect(parsed.items.find(item => item.mainEquipment === "626")?.forecastAt).toContain("2026-07-10");
  });
});
