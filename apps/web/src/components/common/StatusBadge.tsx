export function StatusBadge({ active }: { active: boolean }) {
  return <span className={`badge ${active ? "ok" : "muted-badge"}`}>{active ? "ativo" : "inativo"}</span>;
}
