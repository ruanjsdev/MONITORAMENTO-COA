import { Clock, MapPin } from "lucide-react";
import { FleetState } from "../../types";
import { RelativeTime } from "../common/RelativeTime";
import { SemanticStatusBadge } from "../common/SemanticStatusBadge";

export function EquipmentCard({ item, compact = false }: { item: FleetState; compact?: boolean }) {
  return (
    <article className={`equipment-card compact-equipment-card ${compact ? "equipment-compact" : ""}`}>
      <div className="equipment-head">
        <div>
          <span className="eyebrow">Frota</span>
          <strong className="fleet-code">{item.fleet}</strong>
        </div>
        <SemanticStatusBadge status={item.status} size="md" />
      </div>
      <p className="equipment-summary">{item.description || "Sem descrição operacional"}</p>
      <div className="equipment-meta">
        <span><MapPin size={14} />{item.operation}</span>
        <span>{item.sector}</span>
        <span><Clock size={14} /><RelativeTime value={item.updatedAt} /></span>
      </div>
      <div className="equipment-state-time">
        <strong>{item.status === "PARADO" ? `${item.stoppedMinutes} min parado` : `atualizado ${formatShort(item.updatedAt)}`}</strong>
        {item.stopMetrics.lastStopAt && <small>última parada <RelativeTime value={item.stopMetrics.lastStopAt} /></small>}
      </div>
      {!compact && (
        <details className="technical-details">
          <summary>Ver detalhes</summary>
          <dl>
            <dt>Setor</dt><dd>{item.sector}</dd>
            <dt>Tempo parado hoje</dt><dd>{item.stopMetrics.todayMinutes} min</dd>
            <dt>Paradas</dt><dd>{item.stopMetrics.stopCount}</dd>
            <dt>Maior parada</dt><dd>{item.stopMetrics.longestMinutes} min</dd>
          </dl>
        </details>
      )}
    </article>
  );
}

function formatShort(value: string) {
  return new Date(value).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}
