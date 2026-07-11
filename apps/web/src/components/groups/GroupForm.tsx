import { useState } from "react";
import { WhatsAppGroup } from "../../types";

export function GroupForm({ group, onCancel, onSave }: { group: WhatsAppGroup; onCancel: () => void; onSave: (group: WhatsAppGroup) => Promise<void> }) {
  const [draft, setDraft] = useState(group);
  return (
    <form className="panel form" onSubmit={(event) => { event.preventDefault(); onSave(draft); }}>
      <h2>{group.id ? "Editar grupo" : "Adicionar grupo"}</h2>
      <label>Nome amigável<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <label>Identificador do WhatsApp<input value={draft.externalId ?? ""} onChange={(event) => setDraft({ ...draft, externalId: event.target.value })} /></label>
      <label>Descrição<input value={draft.description ?? ""} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
      <label>Operações vinculadas<input value={draft.operationIds.join(", ")} onChange={(event) => setDraft({ ...draft, operationIds: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></label>
      <label>Horários permitidos<input value={draft.allowedHours ?? ""} onChange={(event) => setDraft({ ...draft, allowedHours: event.target.value })} /></label>
      <label>Mensagem padrão<input value={draft.defaultMessage} onChange={(event) => setDraft({ ...draft, defaultMessage: event.target.value })} /></label>
      <label>Observações<input value={draft.notes ?? ""} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
      <div className="toggle-grid">
        <Checkbox label="Ativo" checked={draft.isActive} onChange={(value) => setDraft({ ...draft, isActive: value })} />
        <Checkbox label="Monitorar mensagens" checked={draft.isMonitored} onChange={(value) => setDraft({ ...draft, isMonitored: value })} />
        <Checkbox label="Receber relatórios" checked={draft.receivesReports} onChange={(value) => setDraft({ ...draft, receivesReports: value })} />
        <Checkbox label="Permitir testes" checked={Boolean(draft.allowTests)} onChange={(value) => setDraft({ ...draft, allowTests: value })} />
        <Checkbox label="Grupo de testes" checked={Boolean(draft.isTestGroup)} onChange={(value) => setDraft({ ...draft, isTestGroup: value })} />
      </div>
      <div className="actions"><button className="primary">Salvar</button><button type="button" onClick={onCancel}>Cancelar</button></div>
    </form>
  );
}

function Checkbox({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="check"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />{label}</label>;
}
