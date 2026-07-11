import fs from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseTagValue: false,
  parseAttributeValue: false
});

type SheetSummary = {
  name: string;
  sheetId?: string;
  relationshipId?: string;
  state: "visible" | "hidden" | "veryHidden";
  order: number;
  path?: string;
  dimension?: string;
  usedRows: number | null;
  usedColumns: number | null;
  mergedCells: string[];
  formulas: Array<{ cell: string; formula: string; shared?: string; array?: boolean }>;
  conditionalFormattingCount: number;
  dataValidationsCount: number;
  tables: string[];
  drawingRelationshipId?: string;
  images: string[];
  charts: string[];
  shapesOrButtons: string[];
  pivotTables: string[];
  hyperlinks: string[];
  externalFormulaReferences: string[];
  crossSheetFormulaReferences: string[];
  protected: boolean;
  lockedCellCountEstimate: number | null;
  unlockedCellCountEstimate: number | null;
  printArea?: string;
  pageBreaks: { rows: number; columns: number };
  pageSetup?: Record<string, unknown>;
  hiddenRows: number[];
  hiddenColumns: string[];
  rowSamples: Array<{ row: number; cells: Array<{ ref: string; column: string; value: string }> }>;
  candidateColumns: Record<string, Array<{ column: string; header: string; row: number }>>;
};

type WorkbookSummary = {
  fileName: string;
  fullPath: string;
  extension: string;
  sizeBytes: number;
  workbookProtection: boolean;
  sheets: SheetSummary[];
  namedRanges: Array<{ name: string; refersTo: string; localSheetId?: string }>;
  externalLinks: string[];
  externalConnections: string[];
  vba: {
    hasVbaProject: boolean;
    files: string[];
    possibleModules: string[];
    possibleEvents: string[];
  };
  mediaFiles: string[];
  drawingFiles: string[];
  pivotCacheFiles: string[];
  risks: string[];
};

const workbookFiles = [
  { key: "plantio", file: "planilhas/Planilha Plantio cana.xlsm" },
  { key: "tratos", file: "planilhas/Acompanhamento Tratos Culturais.xlsm" }
];

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function colToNumber(col: string): number {
  return col.split("").reduce((acc, char) => acc * 26 + char.charCodeAt(0) - 64, 0);
}

function dimensionToSize(dimension?: string): { rows: number | null; cols: number | null } {
  if (!dimension) return { rows: null, cols: null };
  const last = dimension.includes(":") ? dimension.split(":")[1] : dimension;
  const match = /^([A-Z]+)(\d+)$/i.exec(last.replace(/\$/g, ""));
  if (!match) return { rows: null, cols: null };
  return { rows: Number(match[2]), cols: colToNumber(match[1].toUpperCase()) };
}

function extractExternalReferences(formula: string): string[] {
  const matches = formula.match(/\[[^\]]+\]/g) ?? [];
  return [...new Set(matches)];
}

function extractCrossSheetReferences(formula: string): string[] {
  const matches = formula.match(/(?:'[^']+'|[A-Za-z0-9_ ]+)!/g) ?? [];
  return [...new Set(matches.map((item) => item.replace(/!$/, "")))];
}

async function readXml(zip: JSZip, filePath: string): Promise<any | undefined> {
  const file = zip.file(filePath);
  if (!file) return undefined;
  return parser.parse(await file.async("text"));
}

function cellColumn(ref: string): string {
  return ref.replace(/\d+/g, "");
}

function cellText(cell: any, sharedStrings: string[]): string {
  if (!cell) return "";
  if (cell.t === "s") return sharedStrings[Number(cell.v)] ?? "";
  if (cell.t === "inlineStr") {
    const value = cell.is?.t;
    return typeof value === "string" ? value : value?.["#text"] ?? "";
  }
  if (typeof cell.v === "string") return cell.v;
  if (typeof cell.v === "number") return String(cell.v);
  if (cell.v?.["#text"]) return String(cell.v["#text"]);
  return "";
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function candidateColumnsFromSamples(
  samples: Array<{ row: number; cells: Array<{ ref: string; column: string; value: string }> }>
): Record<string, Array<{ column: string; header: string; row: number }>> {
  const fields: Record<string, string[]> = {
    frota: ["frota", "equip", "maquina", "trator", "caminhao"],
    status: ["status", "situacao", "condicao"],
    descricao: ["descricao", "ocorrencia", "motivo"],
    setor: ["setor", "fazenda", "modulo", "talhao", "area"],
    horario: ["hora", "horario", "inicio", "fim"],
    operador: ["operador", "motorista", "lider"],
    implemento: ["implemento", "imp."],
    observacoes: ["observacao", "obs"]
  };
  const result = Object.fromEntries(Object.keys(fields).map((key) => [key, []])) as Record<
    string,
    Array<{ column: string; header: string; row: number }>
  >;
  for (const sample of samples) {
    for (const cell of sample.cells) {
      const normalized = normalizeText(cell.value);
      if (!normalized) continue;
      for (const [field, keywords] of Object.entries(fields)) {
        if (keywords.some((keyword) => normalized.includes(keyword))) {
          result[field].push({ column: cell.column, header: cell.value, row: sample.row });
        }
      }
    }
  }
  return result;
}

async function readSharedStrings(zip: JSZip): Promise<string[]> {
  const xml = await readXml(zip, "xl/sharedStrings.xml");
  return asArray(xml?.sst?.si).map((item: any) => {
    if (typeof item.t === "string") return item.t;
    if (item.t?.["#text"]) return String(item.t["#text"]);
    return asArray(item.r)
      .map((run: any) => (typeof run.t === "string" ? run.t : run.t?.["#text"] ?? ""))
      .join("");
  });
}

function relationshipMap(relsXml: any): Map<string, string> {
  const rels = asArray(relsXml?.Relationships?.Relationship);
  const map = new Map<string, string>();
  for (const rel of rels) map.set(rel.Id, rel.Target);
  return map;
}

async function analyzeWorkbook(filePath: string): Promise<WorkbookSummary> {
  const absolute = path.resolve(filePath);
  const buffer = await fs.readFile(absolute);
  const zip = await JSZip.loadAsync(buffer);
  const stat = await fs.stat(absolute);
  const entries = Object.keys(zip.files);
  const workbook = await readXml(zip, "xl/workbook.xml");
  const sharedStrings = await readSharedStrings(zip);
  const workbookRels = relationshipMap(await readXml(zip, "xl/_rels/workbook.xml.rels"));
  const sheetsRaw = asArray(workbook?.workbook?.sheets?.sheet);
  const definedNamesRaw = asArray(workbook?.workbook?.definedNames?.definedName);
  const workbookProtection = Boolean(workbook?.workbook?.workbookProtection);

  const namedRanges = definedNamesRaw.map((item: any) => ({
    name: item.name,
    localSheetId: item.localSheetId,
    refersTo: typeof item["#text"] === "string" ? item["#text"] : String(item["#text"] ?? "")
  }));

  const sheets: SheetSummary[] = [];
  for (let index = 0; index < sheetsRaw.length; index += 1) {
    const item = sheetsRaw[index];
    const relTarget = workbookRels.get(item["r:id"]);
    const sheetPath = relTarget
      ? `xl/${relTarget.replace(/^\/?xl\//, "").replace(/^\//, "")}`
      : undefined;
    const xml = sheetPath ? await readXml(zip, sheetPath) : undefined;
    const worksheet = xml?.worksheet;
    const dimension = worksheet?.dimension?.ref;
    const size = dimensionToSize(dimension);
    const mergeCells = asArray(worksheet?.mergeCells?.mergeCell).map((merge: any) => merge.ref);
    const rows = asArray(worksheet?.sheetData?.row);
    const formulas: SheetSummary["formulas"] = [];
    const hiddenRows: number[] = [];
    const rowSamples: SheetSummary["rowSamples"] = [];
    let locked = 0;
    let unlocked = 0;

    for (const row of rows) {
      if (row.hidden === "1" || row.hidden === "true") hiddenRows.push(Number(row.r));
      const sampleCells = asArray(row.c)
        .map((cell: any) => ({
          ref: cell.r,
          column: cellColumn(cell.r),
          value: cellText(cell, sharedStrings)
        }))
        .filter((cell) => cell.value !== "");
      if (sampleCells.length && rowSamples.length < 20) {
        rowSamples.push({ row: Number(row.r), cells: sampleCells });
      }
      for (const cell of asArray(row.c)) {
        if (cell.f) {
          const formulaText = typeof cell.f === "string" ? cell.f : cell.f["#text"] ?? "";
          formulas.push({
            cell: cell.r,
            formula: formulaText,
            shared: typeof cell.f === "object" ? cell.f.si : undefined,
            array: typeof cell.f === "object" && cell.f.t === "array"
          });
        }
        if (cell.s) locked += 1;
      }
    }

    const cols = asArray(worksheet?.cols?.col);
    const hiddenColumns = cols
      .filter((col: any) => col.hidden === "1" || col.hidden === "true")
      .map((col: any) => `${col.min}:${col.max}`);
    unlocked = Math.max(0, rows.flatMap((row: any) => asArray(row.c)).length - locked);

    const tableParts = asArray(worksheet?.tableParts?.tablePart).map((part: any) => part["r:id"]);
    const hyperlinks = asArray(worksheet?.hyperlinks?.hyperlink).map((link: any) => link.ref);
    const drawingRelationshipId = worksheet?.drawing?.["r:id"];
    const sheetRelPath = sheetPath?.replace("xl/worksheets/", "xl/worksheets/_rels/") + ".rels";
    const sheetRels = sheetRelPath ? relationshipMap(await readXml(zip, sheetRelPath)) : new Map();
    const drawingTarget = drawingRelationshipId ? sheetRels.get(drawingRelationshipId) : undefined;
    const drawingPath = drawingTarget
      ? `xl/${drawingTarget.replace(/^..\//, "").replace(/^\/?xl\//, "")}`
      : undefined;
    const drawingXml = drawingPath ? await readXml(zip, drawingPath) : undefined;
    const drawingText = drawingXml ? JSON.stringify(drawingXml) : "";

    sheets.push({
      name: item.name,
      sheetId: item.sheetId,
      relationshipId: item["r:id"],
      state: item.state ?? "visible",
      order: index + 1,
      path: sheetPath,
      dimension,
      usedRows: size.rows,
      usedColumns: size.cols,
      mergedCells: mergeCells,
      formulas,
      conditionalFormattingCount: asArray(worksheet?.conditionalFormatting).length,
      dataValidationsCount: Number(worksheet?.dataValidations?.count ?? 0),
      tables: tableParts,
      drawingRelationshipId,
      images: drawingText.includes("pic:pic") ? [drawingPath ?? "drawing"] : [],
      charts: drawingText.includes("c:chart") ? [drawingPath ?? "drawing"] : [],
      shapesOrButtons: drawingText.includes("xdr:sp") || drawingText.includes("macro") ? [drawingPath ?? "drawing"] : [],
      pivotTables: asArray(worksheet?.pivotTableDefinition).map((pivot: any) => String(pivot)),
      hyperlinks,
      externalFormulaReferences: [
        ...new Set(formulas.flatMap((formula) => extractExternalReferences(formula.formula)))
      ],
      crossSheetFormulaReferences: [
        ...new Set(formulas.flatMap((formula) => extractCrossSheetReferences(formula.formula)))
      ],
      protected: Boolean(worksheet?.sheetProtection),
      lockedCellCountEstimate: locked,
      unlockedCellCountEstimate: unlocked,
      printArea: namedRanges.find((range) => range.name === "_xlnm.Print_Area" && range.localSheetId === String(index))?.refersTo,
      pageBreaks: {
        rows: asArray(worksheet?.rowBreaks?.brk).length,
        columns: asArray(worksheet?.colBreaks?.brk).length
      },
      pageSetup: worksheet?.pageSetup,
      hiddenRows,
      hiddenColumns,
      rowSamples,
      candidateColumns: candidateColumnsFromSamples(rowSamples)
    });
  }

  const externalLinks = entries.filter((entry) => entry.startsWith("xl/externalLinks/"));
  const externalConnections = entries.filter((entry) => entry.startsWith("xl/connections"));
  const mediaFiles = entries.filter((entry) => entry.startsWith("xl/media/"));
  const drawingFiles = entries.filter((entry) => entry.startsWith("xl/drawings/"));
  const pivotCacheFiles = entries.filter((entry) => entry.startsWith("xl/pivotCache/") || entry.startsWith("xl/pivotTables/"));
  const vbaFiles = entries.filter((entry) => entry.toLowerCase().includes("vba"));
  const risks: string[] = [];
  if (vbaFiles.length) risks.push("Arquivo contem projeto VBA/macros; preservar estrutura .xlsm e nao executar macros.");
  if (externalLinks.length) risks.push("Arquivo contem links externos que podem impactar calculos e atualizacoes.");
  if (externalConnections.length) risks.push("Arquivo contem conexoes externas.");
  if (sheets.some((sheet) => sheet.protected)) risks.push("Ha abas protegidas; escrita futura deve respeitar protecoes.");
  if (sheets.some((sheet) => sheet.mergedCells.length)) risks.push("Ha celulas mescladas; mapeamento por coluna pode exigir cuidado.");

  return {
    fileName: path.basename(filePath),
    fullPath: absolute,
    extension: path.extname(filePath),
    sizeBytes: stat.size,
    workbookProtection,
    sheets,
    namedRanges,
    externalLinks,
    externalConnections,
    vba: {
      hasVbaProject: vbaFiles.length > 0,
      files: vbaFiles,
      possibleModules: vbaFiles,
      possibleEvents: []
    },
    mediaFiles,
    drawingFiles,
    pivotCacheFiles,
    risks
  };
}

function inferOperationMappings(workbooks: WorkbookSummary[]) {
  const operationTerms = [
    "Plantio Mecanizado",
    "Colheita e Transporte de Muda",
    "Preparo de Solo",
    "Producao das Operacoes",
    "Controle de Dados",
    "CPD",
    "Compostagem",
    "Cultivo",
    "Correcao de Solo",
    "Quebra Lombo",
    "Numero de Viagens",
    "Painel"
  ];
  return operationTerms.map((operation) => {
    const normalized = operation.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const candidates = workbooks.flatMap((workbook) =>
      workbook.sheets
        .filter((sheet) =>
          sheet.name
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .includes(normalized.split(" ")[0])
        )
        .map((sheet) => ({
          file: workbook.fileName,
          sheet: sheet.name,
          confidence: sheet.name.toLowerCase() === operation.toLowerCase() ? "alta" : "necessita confirmacao",
          headerRow:
            Object.values(sheet.candidateColumns).flat()[0]?.row ?? "necessita confirmação",
          fleetColumn: sheet.candidateColumns.frota[0]?.column ?? "necessita confirmação",
          statusColumn: sheet.candidateColumns.status[0]?.column ?? "necessita confirmação",
          descriptionColumn: sheet.candidateColumns.descricao[0]?.column ?? "necessita confirmação",
          sectorColumn: sheet.candidateColumns.setor[0]?.column ?? "necessita confirmação",
          timeColumn: sheet.candidateColumns.horario[0]?.column ?? "necessita confirmação",
          operatorColumn: sheet.candidateColumns.operador[0]?.column ?? "necessita confirmação",
          implementColumn: sheet.candidateColumns.implemento[0]?.column ?? "necessita confirmação",
          observationsColumn: sheet.candidateColumns.observacoes[0]?.column ?? "necessita confirmação",
          candidateColumns: sheet.candidateColumns
        }))
    );
    return { operation, candidates };
  });
}

function candidateImageAreas(workbooks: WorkbookSummary[]) {
  return workbooks.flatMap((workbook) =>
    workbook.sheets
      .filter((sheet) => sheet.printArea || sheet.usedRows || sheet.mergedCells.length || sheet.formulas.length)
      .map((sheet) => ({
        file: workbook.fileName,
        sheet: sheet.name,
        interval: sheet.printArea ?? sheet.dimension ?? "necessita confirmação",
        dimensions: { rows: sheet.usedRows, columns: sheet.usedColumns },
        orientation: sheet.pageSetup?.orientation ?? "necessita confirmação",
        relatedPrintArea: sheet.printArea ?? null,
        containsHiddenInformation: sheet.hiddenRows.length > 0 || sheet.hiddenColumns.length > 0,
        containsFormulas: sheet.formulas.length > 0,
        containsMergedCells: sheet.mergedCells.length > 0,
        copyPictureCandidate: Boolean(sheet.printArea || sheet.usedRows),
        note: "Área candidata; confirmar manualmente antes de usar como relatório oficial."
      }))
  );
}

async function main() {
  await fs.mkdir("analysis", { recursive: true });
  const workbooks = [];
  for (const workbookFile of workbookFiles) {
    const summary = await analyzeWorkbook(workbookFile.file);
    workbooks.push(summary);
    await fs.writeFile(
      `analysis/workbook-${workbookFile.key}.json`,
      JSON.stringify(summary, null, 2)
    );
  }

  const sheetMapping = {
    generatedAt: new Date().toISOString(),
    note: "Mapeamento inferido por nomes de abas e metadados. Colunas ambiguas foram marcadas para confirmação humana.",
    operations: inferOperationMappings(workbooks),
    candidateImageAreas: candidateImageAreas(workbooks)
  };
  const macroInventory = {
    generatedAt: new Date().toISOString(),
    workbooks: workbooks.map((workbook) => ({
      file: workbook.fileName,
      hasVbaProject: workbook.vba.hasVbaProject,
      files: workbook.vba.files,
      possibleEvents: workbook.vba.possibleEvents,
      note: workbook.vba.hasVbaProject
        ? "Projeto VBA detectado como binário. Inventário textual de módulos exige ferramenta especializada sem execução de macros."
        : "Nenhum projeto VBA detectado."
    }))
  };
  const namedRanges = {
    generatedAt: new Date().toISOString(),
    workbooks: workbooks.map((workbook) => ({
      file: workbook.fileName,
      namedRanges: workbook.namedRanges
    }))
  };
  const risks = {
    generatedAt: new Date().toISOString(),
    risks: workbooks.flatMap((workbook) => workbook.risks.map((risk) => ({ file: workbook.fileName, risk }))),
    restrictions: [
      "Não alterar planilhas reais nesta etapa.",
      "Não salvar planilhas reais nesta etapa.",
      "Não executar macros.",
      "Não inventar mapeamentos ambíguos."
    ]
  };

  await fs.writeFile("analysis/sheet-mapping.json", JSON.stringify(sheetMapping, null, 2));
  await fs.writeFile("analysis/macro-inventory.json", JSON.stringify(macroInventory, null, 2));
  await fs.writeFile("analysis/named-ranges.json", JSON.stringify(namedRanges, null, 2));
  await fs.writeFile("analysis/integration-risks.json", JSON.stringify(risks, null, 2));
}

await main();
