import { ReactNode } from "react";
import { SemanticStatusBadge } from "./SemanticStatusBadge";

type StatusBadgeProps = {
  active?: boolean;
  status?: string;
  children?: ReactNode;
};

export function StatusBadge({ active, status, children }: StatusBadgeProps) {
  const label = children ?? status ?? (active ? "ativo" : "inativo");
  if (active === false) return <span className="semantic-badge semantic-neutral semantic-sm">{label}</span>;
  return <SemanticStatusBadge status={status ?? String(label)}>{label}</SemanticStatusBadge>;
}
