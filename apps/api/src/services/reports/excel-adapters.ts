export type ForecastState = "VALID" | "MISSING" | "EXPIRED" | "NOT_APPLICABLE";

export type OperationStateItem = {
  operation: string;
  fleet: string;
  implement?: string | null;
  status: "RODANDO" | "PARADO" | "DESLOCAMENTO" | "MANUTENCAO" | "DISPONIVEL" | "SEM_OPERACAO";
  description: string;
  startedAt?: string | null;
  forecastAt?: string | null;
  forecastState: ForecastState;
  previousForecastAt?: string | null;
  expiredAt?: string | null;
  updatedAt: string;
  history: Array<{ at: string; field: string; before: unknown; after: unknown }>;
};

export type OperationState = {
  adapter: "mock" | "com";
  workbook: string;
  worksheet: string;
  operation: string;
  items: OperationStateItem[];
  readAt: string;
};

export type ChangePreview = {
  workbook: string;
  worksheet: string;
  fleet: string;
  implement?: string | null;
  current: Partial<OperationStateItem>;
  proposed: Partial<OperationStateItem> & {
    forecast?: { state: "MISSING"; displayValue: "SEM PREVISÃO"; mergeCells: true; style: "DANGER" };
  };
  alerts: string[];
  confirmed: false;
};

export type ApplyResult = {
  applied: boolean;
  adapter: "mock" | "com";
  previous: Partial<OperationStateItem>;
  current: Partial<OperationStateItem>;
  history: OperationStateItem["history"];
};

export type PictureResult = {
  generated: boolean;
  adapter: "mock" | "com";
  simulated: boolean;
  path?: string | null;
  message: string;
};

export interface OperationalExcelAdapter {
  readOperationState(input: { operation: string; workbook?: string; worksheet?: string }): Promise<OperationState>;
  prepareChanges(input: { operation: string; fleet: string; implement?: string | null; proposed: Partial<OperationStateItem> }): Promise<ChangePreview>;
  applyChanges(input: { operation: string; fleet: string; implement?: string | null; proposed: Partial<OperationStateItem> }): Promise<ApplyResult>;
  generatePicture(input: { operation: string; range?: string }): Promise<PictureResult>;
}

const now = () => new Date().toISOString();

export class MockOperationalExcelAdapter implements OperationalExcelAdapter {
  private readonly items = new Map<string, OperationStateItem>();

  constructor(seed: OperationStateItem[] = defaultMockState()) {
    for (const item of seed) this.items.set(key(item.operation, item.fleet), { ...item, history: [...item.history] });
  }

  async readOperationState(input: { operation: string; workbook?: string; worksheet?: string }): Promise<OperationState> {
    return {
      adapter: "mock",
      workbook: input.workbook ?? "planilhas-homologacao/Planilha Plantio cana.dev.xlsm",
      worksheet: input.worksheet ?? "PLANTIO",
      operation: input.operation,
      items: [...this.items.values()].filter(item => same(item.operation, input.operation)).map(item => ({ ...item, history: [...item.history] })),
      readAt: now()
    };
  }

  async prepareChanges(input: { operation: string; fleet: string; implement?: string | null; proposed: Partial<OperationStateItem> }): Promise<ChangePreview> {
    const current = this.items.get(key(input.operation, input.fleet));
    const alerts: string[] = [];
    if (!current) alerts.push("FLEET_NOT_FOUND");
    if (current?.implement && input.implement && current.implement !== input.implement) alerts.push("IMPLEMENT_MISMATCH");
    return {
      workbook: "planilhas-homologacao/Planilha Plantio cana.dev.xlsm",
      worksheet: "PLANTIO",
      fleet: input.fleet,
      implement: input.implement ?? current?.implement ?? null,
      current: current ?? {},
      proposed: decorateMissingForecast(input.proposed),
      alerts,
      confirmed: false
    };
  }

  async applyChanges(input: { operation: string; fleet: string; implement?: string | null; proposed: Partial<OperationStateItem> }): Promise<ApplyResult> {
    const current = this.items.get(key(input.operation, input.fleet));
    if (!current) throw new Error(`FLEET_NOT_FOUND:${input.fleet}`);
    const previous = { ...current };
    const updated: OperationStateItem = {
      ...current,
      ...input.proposed,
      forecastState: input.proposed.status === "RODANDO" ? "NOT_APPLICABLE" : input.proposed.forecastState ?? current.forecastState,
      startedAt: input.proposed.status === "RODANDO" ? null : input.proposed.startedAt ?? current.startedAt,
      forecastAt: input.proposed.status === "RODANDO" ? null : input.proposed.forecastAt ?? current.forecastAt,
      updatedAt: now(),
      history: [...current.history]
    };
    for (const field of ["status", "description", "startedAt", "forecastAt", "forecastState"] as const) {
      if (previous[field] !== updated[field]) updated.history.push({ at: updated.updatedAt, field, before: previous[field], after: updated[field] });
    }
    this.items.set(key(input.operation, input.fleet), updated);
    return { applied: true, adapter: "mock", previous, current: updated, history: updated.history };
  }

  async generatePicture(input: { operation: string; range?: string }): Promise<PictureResult> {
    return { generated: true, adapter: "mock", simulated: true, path: null, message: `Imagem simulada para ${input.operation}${input.range ? ` · ${input.range}` : ""}` };
  }
}

export class ComOperationalExcelAdapter implements OperationalExcelAdapter {
  async readOperationState(): Promise<OperationState> { throw new Error("COM_NOT_VALIDATED_IN_THIS_ENVIRONMENT"); }
  async prepareChanges(): Promise<ChangePreview> { throw new Error("COM_NOT_VALIDATED_IN_THIS_ENVIRONMENT"); }
  async applyChanges(): Promise<ApplyResult> { throw new Error("COM_NOT_VALIDATED_IN_THIS_ENVIRONMENT"); }
  async generatePicture(): Promise<PictureResult> { throw new Error("COM_NOT_VALIDATED_IN_THIS_ENVIRONMENT"); }
}

export function createOperationalExcelAdapter(): OperationalExcelAdapter {
  const configured = (process.env.EXCEL_ADAPTER ?? "mock").toLowerCase();
  if (configured === "com" && process.platform === "win32") return new ComOperationalExcelAdapter();
  return new MockOperationalExcelAdapter();
}

function defaultMockState(): OperationStateItem[] {
  const base = new Date("2026-07-13T02:00:00.000Z").toISOString();
  return [
    { operation: "Plantio de Cana", fleet: "164", implement: "830", status: "PARADO", description: "PROBLEMA MECÂNICO", startedAt: "2026-07-13T00:20:00.000Z", forecastAt: null, forecastState: "MISSING", updatedAt: base, history: [] },
    { operation: "Plantio de Cana", fleet: "626", implement: "831", status: "PARADO", description: "NÃO GIRA LADO DIREITO", startedAt: "2026-07-13T00:40:00.000Z", forecastAt: null, forecastState: "MISSING", updatedAt: base, history: [] },
    { operation: "Plantio de Cana", fleet: "1531", implement: "830", status: "RODANDO", description: "RODANDO", startedAt: null, forecastAt: null, forecastState: "NOT_APPLICABLE", updatedAt: base, history: [] },
    { operation: "Plantio de Cana", fleet: "1529", implement: "829", status: "PARADO", description: "MANGUEIRA ESTOURADA", startedAt: "2026-07-13T00:30:00.000Z", forecastAt: "2026-07-13T01:30:00.000Z", forecastState: "VALID", updatedAt: base, history: [] }
  ];
}

function decorateMissingForecast(proposed: Partial<OperationStateItem>): ChangePreview["proposed"] {
  if (proposed.forecastState !== "MISSING") return proposed;
  return { ...proposed, forecast: { state: "MISSING", displayValue: "SEM PREVISÃO", mergeCells: true, style: "DANGER" } };
}
function key(operation: string, fleet: string) { return `${operation.toUpperCase()}::${fleet}`; }
function same(a: string, b: string) { return a.localeCompare(b, "pt-BR", { sensitivity: "base" }) === 0; }
