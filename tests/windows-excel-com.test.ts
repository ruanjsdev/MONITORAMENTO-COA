import { describe, expect, it } from "vitest";
import { detectExcelInstalled } from "../apps/excel-agent/src/index";

const windowsOnly = process.platform === "win32" ? describe : describe.skip;

describe.skipIf(process.platform !== "win32")("Excel COM real (Windows-only)", () => {
  it("SKIPPED — requires Windows and Microsoft Excel", () => {
    expect(process.platform).toBe("win32");
  });
});

windowsOnly("Excel COM real com Microsoft Excel instalado", () => {
  it("detecta suporte COM do Excel sem abrir planilha", () => {
    expect(detectExcelInstalled()).not.toBe("unknown");
  });
});
