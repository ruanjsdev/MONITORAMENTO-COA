import { Check, Clock3, Eye, X } from "lucide-react";
import { useState } from "react";
import { useApp } from "../app/providers";
import { FilterBar } from "../components/common/FilterBar";
import { RelativeTime } from "../components/common/RelativeTime";
import { SemanticStatusBadge } from "../components/common/SemanticStatusBadge";
import { EquipmentCard } from "../components/operational/EquipmentCard";
import { useLoadable } from "../hooks/useLoadable";
import { OperationalSnapshot } from "../types";

export default function AttentionCenterPage() {
  const { api, notify } = useApp();
  const { data, error, loading, reload } = useLoadable(() =>
    api.request<OperationalSnapshot>("/operational/snapshot")
  );
  const [filter, setFilter] = useState("all");
  if (loading) return <section className="panel loading-panel">Carregando central...</section>;
  if (error || !data) return <section className="panel error-box">{error}</section>;

  const pendencies = data.pendencies.filter(
    (item) =>
      (filter === "all" && item.status === "open") ||
      (filter === "urgent" && item.priority === "urgent") ||
      (filter === "resolved" && item.status === "resolved")
  );
  const attentionFleets = [...data.fleets]
    .sort((a, b) => Number(b.status === "PARADO") - Number(a.status === "PARADO"))
    .slice(0, 8);

  async function action(id: string, value: string) {
    await api.request(`/operational/pendencies/${id}/action`, {
      method: "POST",
      body: JSON.stringify({ action: value })
    });
    notify("success", `Ação ${value} registrada.`);
    reload();
  }

  return (
    <section className="attention-page">
      <div className="page-heading compact-heading">
        <div>
          <span className="eyebrow">Sala de monitoramento</span>
          <h1>Central de Operações</h1>
        </div>
        <SemanticStatusBadge status="ONLINE">Excel real</SemanticStatusBadge>
      </div>

      <section className="panel">
        <div className="section-title">
          <h2>Equipamentos em destaque</h2>
          <span className="muted">Críticos primeiro</span>
        </div>
        <div className="equipment-list compact-list">
          {attentionFleets.map((item) => (
            <EquipmentCard key={item.fleet} item={item} compact />
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>Pendências operacionais</h2>
          <SemanticStatusBadge status="PENDENTE">{pendencies.length} itens</SemanticStatusBadge>
        </div>
        <FilterBar
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "Abertas" },
            { value: "urgent", label: "Urgentes" },
            { value: "resolved", label: "Resolvidas" }
          ]}
        />
        <div className="pending-decision-list">
          {pendencies.map((item) => (
            <article className="pending-decision-card compact" key={item.id}>
              <div className="pending-mainline">
                <strong>{item.subject}</strong>
                <SemanticStatusBadge status={item.priority === "urgent" ? "FALHA" : "PENDENTE"}>
                  {item.priority}
                </SemanticStatusBadge>
              </div>
              <p>
                {item.operation} · {item.reason}
              </p>
              <small>
                Desde <RelativeTime value={item.since} />
              </small>
              <div className="decision-actions">
                <button className="primary" onClick={() => action(item.id, "approve")}>
                  <Check size={18} />
                  Aprovar
                </button>
                <button onClick={() => action(item.id, "review")}>
                  <Eye size={18} />
                  Revisar
                </button>
                <button onClick={() => action(item.id, "defer")}>
                  <Clock3 size={18} />
                  Adiar
                </button>
                <button className="danger" onClick={() => action(item.id, "resolve")}>
                  <X size={18} />
                  Resolver
                </button>
              </div>
            </article>
          ))}
          {!pendencies.length && <p className="muted">Nada nesta fila.</p>}
        </div>
      </section>
    </section>
  );
}
