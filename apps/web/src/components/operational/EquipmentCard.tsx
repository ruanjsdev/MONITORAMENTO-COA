import { Clock, MapPin } from "lucide-react";
import { FleetState } from "../../types";
import { StatusBadge } from "../common/StatusBadge";

export function EquipmentCard({ item, compact = false }: { item: FleetState; compact?: boolean }) {
  return (
    <article className={`equipment-card ${compact ? "equipment-compact" : ""}`}>
      <div className="equipment-head">
        <div>
          <span className="eyebrow">Frota</span>
          <strong className="fleet-code">{item.fleet}</strong>
        </div>
        <StatusBadge status={item.status}>{item.status}</StatusBadge>
      </div>
      <p>{item.description || "Sem descrição operacional"}</p>
      <div className="equipment-meta">
        <span><MapPin size={14} />{item.operation}</span>
        <span>{item.sector}</span>
        <span><Clock size={14} />{new Date(item.updatedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
      </div>
      {!compact && <small>Tempo parado hoje: {item.stopMetrics.todayMinutes} min · ocorrências: {item.stopMetrics.stopCount}</small>}
    </article>
  );
}
