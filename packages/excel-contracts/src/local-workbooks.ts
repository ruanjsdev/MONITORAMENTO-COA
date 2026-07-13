import fs from "node:fs";
import path from "node:path";

export type LocalWorkbookDefinition = {
  id: string;
  fileName: string;
  label: string;
  operations: string[];
};

export const LOCAL_OPERATIONAL_WORKBOOKS: readonly LocalWorkbookDefinition[] = [
  { id: "planilha-plantio-cana-dev-xlsm", fileName: "Planilha Plantio cana.dev.xlsm", label: "Planilha de Plantio", operations: ["Plantio Mecanizado"] },
  { id: "acompanhamento-tratos-culturais-dev-xlsm", fileName: "Acompanhamento Tratos Culturais.dev.xlsm", label: "Tratos Culturais", operations: ["CPD", "Compostagem", "Cultivo", "Correção de Solo"] }
] as const;

export type LocalWorkbookValidation = {
  id: string;
  label: string;
  fileName: string;
  filePath: string;
  exists: boolean;
  operations: string[];
};

export function validateLocalOperationalWorkbook(input: { id?: string; filePath?: string; root: string; officialRoot?: string; mustExist?: boolean }): LocalWorkbookValidation {
  const root = path.resolve(input.root);
  const officialRoot = input.officialRoot ? path.resolve(input.officialRoot) : undefined;
  const candidatePath = input.filePath ? path.resolve(input.filePath) : undefined;
  if (input.filePath && isNetworkPath(input.filePath)) throw localWorkbookError("LOCAL_WORKBOOK_NETWORK_PATH_BLOCKED", "Unidade de rede ou caminho UNC não é permitido.");
  if (candidatePath && officialRoot && (candidatePath === officialRoot || isInside(candidatePath, officialRoot))) throw localWorkbookError("LOCAL_WORKBOOK_OFFICIAL_BLOCKED", "Planilha oficial não pode entrar no fluxo local.");
  const definition = input.id ? LOCAL_OPERATIONAL_WORKBOOKS.find(item => item.id === input.id) : LOCAL_OPERATIONAL_WORKBOOKS.find(item => path.basename(input.filePath ?? "") === item.fileName);
  if (!definition) throw localWorkbookError("LOCAL_WORKBOOK_NOT_WHITELISTED", "Planilha local fora da whitelist operacional.");
  const expectedPath = path.join(root, definition.fileName);
  const filePath = candidatePath ?? path.resolve(input.filePath ?? expectedPath);
  if (isNetworkPath(input.filePath ?? filePath) || isNetworkPath(root)) throw localWorkbookError("LOCAL_WORKBOOK_NETWORK_PATH_BLOCKED", "Unidade de rede ou caminho UNC não é permitido.");
  if (!isInside(filePath, root)) throw localWorkbookError("LOCAL_WORKBOOK_PATH_BLOCKED", "Arquivo fora da pasta planilhas-homologacao.");
  if (officialRoot && (filePath === officialRoot || isInside(filePath, officialRoot))) throw localWorkbookError("LOCAL_WORKBOOK_OFFICIAL_BLOCKED", "Planilha oficial não pode entrar no fluxo local.");
  if (path.basename(filePath) !== definition.fileName) throw localWorkbookError("LOCAL_WORKBOOK_NAME_BLOCKED", "Nome de arquivo local não corresponde à whitelist.");
  if (!filePath.toLowerCase().endsWith(".dev.xlsm")) throw localWorkbookError("LOCAL_WORKBOOK_EXTENSION_BLOCKED", "Somente arquivos .dev.xlsm são permitidos.");
  const exists = fs.existsSync(filePath) && fs.statSync(filePath).isFile();
  if (input.mustExist !== false && !exists) throw localWorkbookError("LOCAL_WORKBOOK_NOT_FOUND", "Planilha local não localizada.");
  return { ...definition, filePath, exists };
}

export function localWorkbookByOperation(operation?: string | null) {
  return LOCAL_OPERATIONAL_WORKBOOKS.find(item => item.operations.includes(String(operation ?? ""))) ?? LOCAL_OPERATIONAL_WORKBOOKS[1];
}

export function maskLocalWorkbookPath(filePath: string, root: string) {
  return path.resolve(filePath).replace(path.resolve(root), "<planilhas-homologacao>");
}

function isInside(filePath: string, root: string) {
  const relative = path.relative(root, filePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function isNetworkPath(value: string) {
  return /^\\\\/.test(value) || /^\/\/[^/]/.test(value);
}

function localWorkbookError(code: string, message: string) {
  return Object.assign(new Error(message), { code });
}
