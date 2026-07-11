import { FileSpreadsheet } from "lucide-react";
import { SpreadsheetFile } from "../../types";
import { formatBytes } from "../../utils/format";

export function SpreadsheetCard({ file, onDetails }: { file: SpreadsheetFile; onDetails?: () => void }) {
  return (
    <article className="panel card">
      <div className="row">
        <div>
          <strong>{file.file}</strong>
          <p className="muted">{file.path}</p>
        </div>
        <span className="badge">{file.analysisState}</span>
      </div>
      <div className="facts">
        <span>Tamanho: {formatBytes(file.sizeBytes)}</span>
        <span>Abas: {file.sheetCount}</span>
        <span>Abas ocultas: {file.hiddenSheets}</span>
        <span>Macros: {file.macrosDetected ? "detectadas" : "não detectadas"}</span>
        <span>Links externos: {file.externalLinksDetected ? "detectados" : "não detectados"}</span>
        <span>Agente Excel: {file.excelAgentStatus}</span>
      </div>
      <p><strong>Operações vinculadas:</strong> {file.linkedOperations.join(", ") || "Nenhuma"}</p>
      <p><strong>Riscos:</strong> {file.risks.length ? file.risks.join(" | ") : "Sem risco detectado na análise XML"}</p>
      <div className="actions">
        <button onClick={onDetails}><FileSpreadsheet size={18} />Abrir detalhes</button>
        <button>Confirmar mapeamento</button>
        <button>Testar agente Excel</button>
      </div>
    </article>
  );
}
