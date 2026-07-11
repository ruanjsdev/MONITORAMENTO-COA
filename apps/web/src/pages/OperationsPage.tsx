import { Plus } from "lucide-react";
import { useState } from "react";
import { useApp } from "../app/providers";
import { TechnicalDetails } from "../components/common/TechnicalDetails";
import { emptyOperation } from "../components/operations/emptyOperation";
import { OperationCard } from "../components/operations/OperationCard";
import { OperationForm } from "../components/operations/OperationForm";
import { useLoadable } from "../hooks/useLoadable";
import { Operation } from "../types";

export default function OperationsPage() {
  const { api, notify } = useApp();
  const [editing, setEditing] = useState<Operation | null>(null);
  const { data, error, loading, reload } = useLoadable(() => api.request<Operation[]>("/operations"));
  if (loading) return <section className="panel">Carregando...</section>;
  if (error || !data) return <section className="panel error-box"><p>{error}</p><button onClick={reload}>Tentar novamente</button></section>;
  return (
    <section>
      <div className="header"><div><h1>Operações</h1><p className="muted">Configurações persistentes em homologação.</p></div><button className="primary" onClick={() => setEditing(emptyOperation())}><Plus size={18} />Adicionar operação</button></div>
      <div className="cards operations">{data.map((operation) => <OperationCard key={operation.id} operation={operation} onEdit={() => setEditing(operation)} onDuplicate={() => setEditing({ ...operation, id: "", name: `${operation.name} cópia` })} onDelete={async () => { if (!confirm(`Excluir ${operation.name}?`)) return; await api.request(`/operations/${operation.id}`, { method: "DELETE" }); notify("success", "Operação excluída."); await reload(); }} />)}</div>
      {editing && <OperationForm operation={editing} onCancel={() => setEditing(null)} onSave={async (operation) => { await api.request(operation.id ? `/operations/${operation.id}` : "/operations", { method: operation.id ? "PATCH" : "POST", body: JSON.stringify(operation) }); notify("success", "Operação salva."); setEditing(null); await reload(); }} />}
      <TechnicalDetails data={data} />
    </section>
  );
}
