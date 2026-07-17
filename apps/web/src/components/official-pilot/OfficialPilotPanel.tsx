import { useState } from "react";
import { OfficialPilotWrite, OperationalModeStatus } from "../../types";

const cellLabels: Record<string, string> = { status: "Status", startDate: "Data inicial", startTime: "Hora inicial", forecastDate: "Data previsão", forecastTime: "Hora previsão", description: "Descrição" };

export function OfficialPilotPanel({ write, mode, onConfirm, onRollback }: { write: OfficialPilotWrite; mode: OperationalModeStatus["mode"]; onConfirm: (confirmation: string) => Promise<void>; onRollback: (confirmation: string) => Promise<void> }) {
  const [confirmation, setConfirmation] = useState("");
  const [rollbackConfirmation, setRollbackConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const ready = write.status === "PREVIEW_READY";

  async function run(action: () => Promise<void>) { setBusy(true); try { await action(); } finally { setBusy(false); } }
  return (
    <section className="official-pilot-panel">
      <div className="row">
        <div><span className="eyebrow">Piloto oficial controlado</span><h3>Prévia da frota {write.fleet}/{write.implement}</h3></div>
        <span className={`badge ${write.status === "VERIFIED" ? "badge-success" : "badge-warning"}`}>{write.status} · confirmed={String(write.confirmed)}</span>
      </div>
      {write.errorCode && <div className="error-box"><strong>{write.errorCode}</strong><p>{write.errorMessage}</p></div>}
      <dl className="pilot-summary">
        <dt>Arquivo oficial</dt><dd>{write.workbook}</dd><dt>Aba</dt><dd>{write.worksheet}</dd>
        <dt>Grupo</dt><dd>{write.groupName} · {write.groupJidMasked}</dd><dt>Operação</dt><dd>{write.operation}</dd>
        <dt>Frota / implemento</dt><dd>{write.fleet} / {write.implement}</dd><dt>Linha</dt><dd>{write.row ?? "Aguardando leitura"}</dd>
        <dt>Backup</dt><dd>{write.backupPath}</dd><dt>Hash</dt><dd className="hash-value">{write.backupHash ?? "Aguardando arquivo ficar livre"}</dd>
      </dl>
      {write.cells.length > 0 && <div className="pilot-cell-table" role="table" aria-label="Comparação das células oficiais">
        <div className="pilot-cell-header" role="row"><strong>Célula</strong><strong>Campo</strong><strong>Atual</strong><strong>Proposto</strong></div>
        {write.cells.map(cell => <div className="pilot-cell-row" role="row" key={cell.field}><code>{cell.address}</code><span>{cellLabels[cell.field] ?? cell.field}</span><span>{display(cell.currentValue)}</span><strong>{display(cell.proposedValue)}</strong></div>)}
      </div>}
      <div className="safety-notice"><strong>WhatsApp continua bloqueado</strong><span>Nenhuma mensagem será enviada · nenhuma reação será enviada.</span></div>
      {ready && <div className="pilot-confirmation">
        {mode !== "LIVE_APPROVAL_PILOT" && <p className="blocked-reason">Ative primeiro o modo em Diagnóstico com a frase exigida. A prévia permanece confirmed=false.</p>}
        <label>Confirmação final da escrita<input value={confirmation} onChange={event => setConfirmation(event.target.value)} placeholder={write.confirmationRequired} /></label>
        <button className="danger" disabled={busy || mode !== "LIVE_APPROVAL_PILOT" || confirmation !== write.confirmationRequired} onClick={() => run(() => onConfirm(confirmation))}>CONFIRMAR ESCRITA OFICIAL</button>
      </div>}
      {write.events.length > 0 && <ol className="pilot-timeline">{write.events.map(event => <li key={event.id} className={event.status === "FAILED" ? "failed" : "done"}><div><strong>{event.label}</strong><span>{new Date(event.createdAt).toLocaleString("pt-BR")}{event.durationMs ? ` · ${event.durationMs} ms` : ""}</span></div>{event.detail && <small>{event.detail}</small>}</li>)}</ol>}
      {write.rollbackAvailable && <div className="pilot-confirmation rollback-box"><label>Confirmação do rollback<input value={rollbackConfirmation} onChange={event => setRollbackConfirmation(event.target.value)} placeholder={write.rollbackConfirmationRequired} /></label><button className="danger" disabled={busy || rollbackConfirmation !== write.rollbackConfirmationRequired} onClick={() => run(() => onRollback(rollbackConfirmation))}>RESTAURAR BACKUP DESTA ESCRITA</button></div>}
    </section>
  );
}

function display(value: unknown) { return value === null || value === undefined || value === "" ? "(vazio)" : String(value); }
