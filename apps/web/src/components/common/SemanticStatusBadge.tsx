import { ReactNode } from "react";
import { semanticForStatus } from "../../utils/operationalSemantics";

type Props = {
  status?: string | null;
  children?: ReactNode;
  size?: "sm" | "md";
};

export function SemanticStatusBadge({ status, children, size = "sm" }: Props) {
  const semantic = semanticForStatus(status ?? String(children ?? ""));
  const Icon = semantic.icon;
  return (
    <span className={`semantic-badge semantic-${semantic.tone} semantic-${size}`}>
      <Icon size={size === "sm" ? 14 : 16} />
      {children ?? semantic.label}
    </span>
  );
}
