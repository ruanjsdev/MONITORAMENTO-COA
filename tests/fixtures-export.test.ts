import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("fixtures anonimizadas de relatórios operacionais", () => {
  it("mantém estrutura homologável sem dados pessoais", async () => {
    const file = path.resolve("tests/fixtures/operational-reports/plantio-colheita-muda-turno-c.json");
    const fixture = JSON.parse(await readFile(file, "utf8"));
    expect(fixture).toHaveProperty("name");
    expect(fixture).toHaveProperty("input");
    expect(fixture).toHaveProperty("expected.sections");
    expect(fixture.input).not.toMatch(/@c\.us|\+\d{10,}|jid|telefone/i);
  });
});
