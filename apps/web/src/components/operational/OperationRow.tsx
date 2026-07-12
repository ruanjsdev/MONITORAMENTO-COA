import { ChevronRight, Leaf, Shovel, Sprout, Tractor } from "lucide-react";
import { OperationalSnapshot } from "../../types";
import { RelativeTime } from "../common/RelativeTime";
import { SemanticStatusBadge } from "../common/SemanticStatusBadge";

const operationIcons = [
  { match: "colheita", icon: Leaf },
  { match: "plantio", icon: Tractor },
  { match: "preparo", icon: Shovel },
  { match: "cultivo", icon: Sprout }
];

type OperationRowProps = {
  item: OperationalSnapshot["operationSummary"][number];
  pendingCount: number;
  onOpen?: () => void;
};

export function OperationRow({ item, pendingCount, onOpen }: OperationRowProps) {
  const status = item.stopped > 0 ? "PARADO" : pendingCount > 0 ? "PENDENTE" : "RODANDO";
  const Icon = operationIcons.find(entry => item.operation.toLocaleLowerCase("pt-BR").includes(entry.match))?.icon ?? Tractor;
  return (
    <button className={`operation-row-card operation-${status.toLowerCase()}`} onClick={onOpen} type="button">
      <span className="operation-mark"><Icon size={22} /></span>
      <div>
        <strong>{item.operation}</strong>
        <small>{summaryText(item, pendingCount)}</small>
      </div>
      <div className="operation-row-meta">
        <SemanticStatusBadge status={status} />
        <small><RelativeTime value={item.updatedAt} /></small>
      </div>
      <ChevronRight size={18} />
    </button>
  );
}

function summaryText(item: OperationRowProps["item"], pendingCount: number) {
  if (item.stopped > 0) return `${item.stopped} parado${item.stopped > 1 ? "s" : ""} · ${item.machines} equipamentos`;
  if (pendingCount > 0) return `${pendingCount} pendência${pendingCount > 1 ? "s" : ""} · ${item.machines} equipamentos`;
  return `normal · ${item.machines} equipamentos`;
}
