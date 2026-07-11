import { Check, X } from "lucide-react";
import { useApp } from "../app/providers";
import { EmptyState } from "../components/common/EmptyState";
import { useLoadable } from "../hooks/useLoadable";
import { PendingChange } from "../types";

export default function PendingChangesPage() {
  const { api, notify } = useApp();
  const { data, error, loading, reload } = useLoadable(() => api.request<PendingChange[]>("/pending-changes"));
  if (loading) return <section className="panel">Carregando...</section>;
  if (error || !data) return <section className="panel error-box"><p>{error}</p><button onClick={reload}>Tentar novamente</button></section>;
  async function decide(id: string, decision: string) {
    await api.request(`/pending-changes/${id}/decision`, { method: "POST", body: JSON.stringify({ decision }) });
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
            <p>Frota {item.equipment}: {item.currentStatus} → {item.newStatus}</p>
            <p>{item.description}</p><small>{item.group} · {item.sender} · Confiança {(item.confidence * 100).toFixed(0)}%</small>
            <blockquote>{item.originalMessage}</blockquote>
            <div className="actions"><button onClick={() => decide(item.id, "approve")}><Check size={18} />Aprovar</button><button onClick={() => decide(item.id, "approve")}>Editar e aprovar</button><button onClick={() => decide(item.id, "reject")}><X size={18} />Rejeitar</button><button onClick={() => decide(item.id, "defer")}>Adiar</button></div>
          </article>
        ))}</div>
      )}
    </section>
  );
}
