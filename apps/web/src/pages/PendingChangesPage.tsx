import { Check, Pencil, X } from "lucide-react";
import { useState } from "react";
import { useApp } from "../app/providers";
import { EmptyState } from "../components/common/EmptyState";
import { RelativeTime } from "../components/common/RelativeTime";
import { SemanticStatusBadge } from "../components/common/SemanticStatusBadge";
import { useLoadable } from "../hooks/useLoadable";
import { PendingChange } from "../types";

export default function PendingChangesPage() {
  const { api, notify } = useApp();
  const { data, error, loading, reload } = useLoadable(() => api.request<PendingChange[]>("/pending-changes"));
  const [observation, setObservation] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  if (loading) return <section className="panel loading-panel">Carregando pendências...</section>;
  if (error || !data) return <section className="panel error-box"><p>{error}</p><button onClick={reload}>Tentar novamente</button></section>;

  async function decide(id: string, decision: string) {
    await api.request(`/pending-changes/${id}/decision`, { method: "POST", body: JSON.stringify({ decision, description: observation }) });
    notify("success", `SIMULADO: decisão ${decision} registrada.`);
    await reload();
  }

  return (
    <section className="pending-mobile-page">
      <div className="page-heading compact-heading">
        <div>
          <span className="eyebrow">Aprovação humana obrigatória</span>
          <h1>Pendências</h1>
        </div>
        <SemanticStatusBadge status="PENDENTE">{data.length} abertas</SemanticStatusBadge>
      </div>

      {data.length === 0 ? <EmptyState title="Nenhuma pendência aberta." action="Atualizar" onAction={reload} /> : (
        <div className="pending-decision-list">
          {data.map(item => (
            <article className="pending-decision-card" key={item.id}>
              <div className="pending-mainline">
                <strong>{item.equipment}</strong>
                <SemanticStatusBadge status={item.status}>{item.status}</SemanticStatusBadge>
                <span><RelativeTime value={item.receivedAt} /></span>
              </div>
              <div className="pending-route">
                <span>{item.currentStatus}</span>
                <strong>→</strong>
                <span className="proposed">{item.newStatus}</span>
              </div>
              <p>{item.description}</p>
              <div className="pending-facts">
                <span>{item.operation}</span>
                <span>Confiança {(item.confidence * 100).toFixed(0)}%</span>
                <span>{item.sender}</span>
              </div>
              <details className="technical-details" open={expanded === item.id} onToggle={event => setExpanded(event.currentTarget.open ? item.id : null)}>
                <summary>Ver detalhes</summary>
                <blockquote>{item.originalMessage}</blockquote>
                <label>Observação<input value={observation} onChange={event => setObservation(event.target.value)} placeholder="Opcional" /></label>
                <dl>
                  <dt>Grupo</dt><dd>{item.group}</dd>
                  <dt>Recebida</dt><dd>{new Date(item.receivedAt).toLocaleString("pt-BR")}</dd>
                  <dt>Campos</dt><dd>status, descrição</dd>
                </dl>
              </details>
              <div className="decision-actions">
                <button className="primary" onClick={() => confirm("Confirmar aprovação simulada desta pendência?") && decide(item.id, "approve")}><Check size={18} />Aprovar</button>
                <button onClick={() => setExpanded(expanded === item.id ? null : item.id)}><Pencil size={18} />Editar</button>
                <button className="danger" onClick={() => decide(item.id, "reject")}><X size={18} />Rejeitar</button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
