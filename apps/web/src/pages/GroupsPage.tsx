import { Plus } from "lucide-react";
import { useState } from "react";
import { useApp } from "../app/providers";
import { EmptyState } from "../components/common/EmptyState";
import { TechnicalDetails } from "../components/common/TechnicalDetails";
import { emptyGroup } from "../components/groups/emptyGroup";
import { GroupCard } from "../components/groups/GroupCard";
import { GroupForm } from "../components/groups/GroupForm";
import { useLoadable } from "../hooks/useLoadable";
import { WhatsAppGroup } from "../types";

export default function GroupsPage() {
  const { api, notify } = useApp();
  const [editing, setEditing] = useState<WhatsAppGroup | null>(null);
  const { data, error, loading, reload } = useLoadable(() => api.request<WhatsAppGroup[]>("/groups"));
  if (loading) return <section className="panel">Carregando...</section>;
  if (error || !data) return <section className="panel error-box"><p>{error}</p><button onClick={reload}>Tentar novamente</button></section>;
  return (
    <section>
      <div className="header"><div><h1>Grupos</h1><p className="muted">Gerencie grupos monitorados e destinos de relatórios.</p></div><button className="primary" onClick={() => setEditing(emptyGroup())}><Plus size={18} />Adicionar grupo</button></div>
      {data.length === 0 ? <EmptyState title="Nenhum grupo cadastrado ainda." action="Adicionar primeiro grupo" onAction={() => setEditing(emptyGroup())} /> : (
        <div className="cards">{data.map((group) => <GroupCard key={group.id} group={group} operationsLabel={group.operationIds.join(", ") || "Sem operações"} onEdit={() => setEditing(group)} onDelete={async () => { if (!confirm(`Excluir ${group.name}?`)) return; await api.request(`/groups/${group.id}`, { method: "DELETE" }); notify("success", "Grupo excluído."); await reload(); }} onTest={async () => { const response = await api.request<{ message: string }>(`/groups/${group.id}/test`, { method: "POST", body: "{}" }); notify("success", response.message); }} />)}</div>
      )}
      {editing && <GroupForm group={editing} onCancel={() => setEditing(null)} onSave={async (group) => { await api.request(group.id ? `/groups/${group.id}` : "/groups", { method: group.id ? "PATCH" : "POST", body: JSON.stringify(group) }); notify("success", "Grupo salvo."); setEditing(null); await reload(); }} />}
      <TechnicalDetails data={data} />
    </section>
  );
}
