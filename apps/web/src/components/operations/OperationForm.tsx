import { useState } from "react";
import { Operation } from "../../types";

export function OperationForm({ operation, onCancel, onSave }: { operation: Operation; onCancel: () => void; onSave: (operation: Operation) => Promise<void> }) {
  const [draft, setDraft] = useState(operation);
  const set = (patch: Partial<Operation>) => setDraft({ ...draft, ...patch });
  return (
    <form className="panel form" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}>
      <h2>{operation.id ? "Editar operação" : "Adicionar operação"}</h2>
      <div className="form-grid">
        <label>Nome<input value={draft.name} onChange={(event) => set({ name: event.target.value })} /></label>
        <label>Nome curto<input value={draft.shortName ?? ""} onChange={(event) => set({ shortName: event.target.value })} /></label>
        <label>Emoji<input value={draft.emoji} onChange={(event) => set({ emoji: event.target.value })} /></label>
        <label>Planilha<input value={draft.spreadsheetFile} onChange={(event) => set({ spreadsheetFile: event.target.value })} /></label>
        <label>Aba<input value={draft.sheetName} onChange={(event) => set({ sheetName: event.target.value })} /></label>
        <label>Grupo de origem<input value={draft.groupIds.join(", ")} onChange={(event) => set({ groupIds: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></label>
        <label>Grupo de destino<input value={draft.destinationGroupId ?? ""} onChange={(event) => set({ destinationGroupId: event.target.value })} /></label>
        <label>Coluna da frota<input value={draft.fleetColumn ?? ""} onChange={(event) => set({ fleetColumn: event.target.value })} /></label>
        <label>Coluna do implemento<input value={draft.implementColumn ?? ""} onChange={(event) => set({ implementColumn: event.target.value })} /></label>
        <label>Coluna do status<input value={draft.statusColumn ?? ""} onChange={(event) => set({ statusColumn: event.target.value })} /></label>
        <label>Coluna da descrição<input value={draft.descriptionColumn ?? ""} onChange={(event) => set({ descriptionColumn: event.target.value })} /></label>
        <label>Coluna do horário<input value={draft.timeColumn ?? ""} onChange={(event) => set({ timeColumn: event.target.value })} /></label>
        <label>Intervalo CopyPicture<input value={draft.imageRange ?? ""} onChange={(event) => set({ imageRange: event.target.value })} /></label>
        <label>Status permitidos<input value={draft.allowedStatuses.join(", ")} onChange={(event) => set({ allowedStatuses: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></label>
        <label>Sinônimos<input value={draft.synonyms ?? ""} onChange={(event) => set({ synonyms: event.target.value })} /></label>
        <label>Turnos<input value={(draft.shifts ?? []).join(", ")} onChange={(event) => set({ shifts: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></label>
        <label>Horários de relatório<input value={draft.reportTimes ?? ""} onChange={(event) => set({ reportTimes: event.target.value })} /></label>
      </div>
      <label>Descrição<input value={draft.description ?? ""} onChange={(event) => set({ description: event.target.value })} /></label>
      <label>Modelo da legenda<input value={draft.legendTemplate ?? ""} onChange={(event) => set({ legendTemplate: event.target.value })} /></label>
      <div className="toggle-grid">
        <Checkbox label="Exigir aprovação" checked={Boolean(draft.requiresApproval)} onChange={(value) => set({ requiresApproval: value })} />
        <Checkbox label="Ativa" checked={draft.status === "active"} onChange={(value) => set({ status: value ? "active" : "paused" })} />
        <Checkbox label="Monitoramento ligado" checked={draft.monitor} onChange={(value) => set({ monitor: value })} />
        <Checkbox label="Relatório automático" checked={Boolean(draft.automaticReport)} onChange={(value) => set({ automaticReport: value })} />
      </div>
      <p className="notice">Mapeamento de planilha em homologação. Nenhuma escrita real será feita.</p>
      <div className="actions"><button className="primary">Salvar</button><button type="button" onClick={onCancel}>Cancelar</button></div>
    </form>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="check"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />{label}</label>;
}
