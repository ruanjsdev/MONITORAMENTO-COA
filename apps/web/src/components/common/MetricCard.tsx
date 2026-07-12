type MetricCardProps = {
  label: string;
  value: string | number;
  detail?: string;
  tone?: "success" | "info" | "warning" | "danger" | "neutral";
};

export function MetricCard({ label, value, detail, tone = "neutral" }: MetricCardProps) {
  return (
    <article className={`metric-card tone-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}
