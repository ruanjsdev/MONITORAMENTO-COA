export function EmptyState({ title, action, onAction }: { title: string; action: string; onAction: () => void }) {
  return <div className="panel empty"><p>{title}</p><button className="primary" onClick={onAction}>{action}</button></div>;
}
