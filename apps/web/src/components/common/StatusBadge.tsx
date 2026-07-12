import { ReactNode } from "react";

type StatusBadgeProps = {
  active?: boolean;
  status?: string;
  children?: ReactNode;
};

export function StatusBadge({ active, status, children }: StatusBadgeProps) {
  const label = children ?? status ?? (active ? "ativo" : "inativo");
  const normalized = String(status ?? label).toLowerCase();
  const tone = active === false ? "muted" : normalized.includes("parado") || normalized.includes("falha") || normalized.includes("offline") ? "danger" : normalized.includes("sim") || normalized.includes("pend") || normalized.includes("aten") ? "warning" : normalized.includes("online") || normalized.includes("ativo") || normalized.includes("rodando") ? "success" : "info";

  return <span className={`badge badge-${tone}`}>{label}</span>;
}
