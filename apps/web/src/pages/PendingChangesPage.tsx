import { Check, X } from "lucide-react";
import { useApp } from "../app/providers";
import { EmptyState } from "../components/common/EmptyState";
import { useLoadable } from "../hooks/useLoadable";
import { PendingChange } from "../types";
import { useState } from "react";

export default function PendingChangesPage() {
  const { api, notify } = useApp();
  const { data, error, loading, reload } = useLoadable(() => api.request<PendingChange[]>("/pending-changes"));
  const [observation, setObservation] = useState("");
  if (loading) return <section className="panel">Carregando...</section>;
  if (error || !data) return <section className="panel error-box"><p>{error}</p><button onClick={reload}>Tentar novamente</button></section>;
  async function decide(id: string, decision: string) {
    await api.request(`/pending-changes/${id}/decision`, { method: "POST", body: JSON.stringify({ decision, description: observation }) });
    notify("success", `SIMULADO: decisão ${decision} registrada.`);
    await reload();
  }
  return (
    <section>
      <h1>Alterações pendentes</h1>
      {data.length === 0 ? <EmptyState title="Nenhuma pendência aberta." action="Atualizar" onAction={reload} /> : (
        <div className="cards">{data.map((item) => (
          <article className="panel" key={item.id}>
            <div className="row"><strong>{item.operation}</strong><span className="badge">{item.status}</span></div>
            <div className="comparison"><div><small>ANTES</small><strong>{item.currentStatus}</strong><p>Operação normal</p></div><div className="changed"><small>DEPOIS</small><strong>{item.newStatus}</strong><p>{item.description}</p></div></div><small>{item.group} · {item.sender} · Confiança {(item.confidence * 100).toFixed(0)}%</small>
            <blockquote>{item.originalMessage}</blockquote>
            <label>Observação<input value={observation} onChange={event => setObservation(event.target.value)} placeholder="Opcional" /></label>
            <div className="actions"><button onClick={() => decide(item.id, "approve")}><Check size={18} />Aprovar</button><button onClick={() => decide(item.id, "approve")}>Editar e aprovar</button><button onClick={() => decide(item.id, "reject")}><X size={18} />Rejeitar</button><button onClick={() => decide(item.id, "defer")}>Adiar</button><button onClick={() => decide(item.id, "reject")}>Duplicada</button></div>
          </article>
        ))}</div>
      )}
    </section>
  );
}
