import { Check, X } from "lucide-react";
import { useApp } from "../app/providers";
import { EmptyState } from "../components/common/EmptyState";
import { useLoadable } from "../hooks/useLoadable";
import { PendingChange } from "../types";
import { useState } from "react";
import { MetricCard } from "../components/common/MetricCard";
import { StatusBadge } from "../components/common/StatusBadge";

export default function PendingChangesPage() {
  const { api, notify } = useApp();
  const { data, error, loading, reload } = useLoadable(() => api.request<PendingChange[]>("/pending-changes"));
  const [observation, setObservation] = useState("");
  if (loading) return <section className="panel loading-panel">Carregando pendências...</section>;
  if (error || !data) return <section className="panel error-box"><p>{error}</p><button onClick={reload}>Tentar novamente</button></section>;
  async function decide(id: string, decision: string) {
    await api.request(`/pending-changes/${id}/decision`, { method: "POST", body: JSON.stringify({ decision, description: observation }) });
    notify("success", `SIMULADO: decisão ${decision} registrada.`);
    await reload();
  }
  return (
    <section>
      <div className="page-heading"><div><span className="eyebrow">Aprovação humana obrigatória</span><h1>Pendências</h1><p className="muted">Comparativo Antes → Depois para aprovar pelo celular com segurança.</p></div></div>
      <div className="metric-grid"><MetricCard label="Abertas" value={data.length} tone="warning" /><MetricCard label="Alta confiança" value={data.filter(item=>item.confidence>=0.8).length} tone="success" /><MetricCard label="Requer revisão" value={data.filter(item=>item.confidence<0.8).length} tone="danger" /><MetricCard label="Ação real" value="Bloqueada" detail="modo simulação" tone="info" /></div>
      {data.length === 0 ? <EmptyState title="Nenhuma pendência aberta." action="Atualizar" onAction={reload} /> : (
        <div className="cards">{data.map((item) => (
          <article className="panel pending-review" key={item.id}>
            <div className="row"><div><span className="eyebrow">{item.group} · {item.sender}</span><strong>{item.operation} · {item.equipment}</strong></div><StatusBadge status={item.status}>{item.status}</StatusBadge></div>
            <blockquote>{item.originalMessage}</blockquote>
            <div className="comparison"><div><small>ANTES</small><strong>{item.currentStatus}</strong><p>Estado registrado antes da leitura.</p></div><div className="changed"><small>DEPOIS</small><strong>{item.newStatus}</strong><p>{item.description}</p></div></div>
            <div className="facts"><span>Frota {item.equipment}</span><span>Confiança {(item.confidence * 100).toFixed(0)}%</span><span>{new Date(item.receivedAt).toLocaleString("pt-BR")}</span><span>Campos: status, descrição</span></div>
            <label>Observação<input value={observation} onChange={event => setObservation(event.target.value)} placeholder="Opcional" /></label>
            <div className="actions"><button className="primary" onClick={() => confirm("Confirmar aprovação simulada desta pendência?") && decide(item.id, "approve")}><Check size={18} />Aprovar</button><button onClick={() => decide(item.id, "approve")}>Editar</button><button className="danger" onClick={() => decide(item.id, "reject")}><X size={18} />Rejeitar</button><button onClick={() => decide(item.id, "defer")}>Atualizar leitura</button><button>Ver histórico</button><button onClick={() => decide(item.id, "reject")}>Cancelar</button></div>
          </article>
        ))}</div>
      )}
    </section>
  );
}
