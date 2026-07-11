import { SpreadsheetFile } from "../../types";

export function SpreadsheetDetails({ file, onClose }: { file: SpreadsheetFile; onClose: () => void }) {
  return (
    <section className="panel details">
      <div className="header"><h2>Detalhes de {file.file}</h2><button onClick={onClose}>Fechar</button></div>
      <div className="sheet-list">
        {file.sheetDetails.map((sheet) => (
          <article key={sheet.name} className="sheet-card">
            <strong>{sheet.name}</strong>
            <span className="badge">{sheet.state}</span>
            <p>Intervalo: {sheet.dimension}</p>
            <p>Fórmulas: {sheet.formulas} · Mesclagens: {sheet.mergedCells} · Proteção: {sheet.protected ? "sim" : "não"}</p>
            <p>Área candidata: {sheet.candidateImageArea}</p>
            <p>Status da confirmação: {sheet.confirmationStatus ?? "NEEDS_ANALYSIS"}</p>
            <p className="muted">Campos ambíguos exigem confirmação humana antes de qualquer automação.</p>
          </article>
        ))}
      </div>
    </section>
  );
}
