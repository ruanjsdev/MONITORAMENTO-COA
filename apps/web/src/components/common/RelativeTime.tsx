export function RelativeTime({ value }: { value?: string }) {
  return <time dateTime={value}>{formatRelativeTime(value)}</time>;
}

export function formatRelativeTime(value?: string) {
  if (!value) return "sem registro";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return "sem registro";
  const diff = Date.now() - then;
  if (diff < 45_000) return "agora";
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "ontem";
  return `há ${days} dias`;
}

export function temporalState(value?: string, resolved = false) {
  if (resolved) return "resolved";
  if (!value) return "old";
  const minutes = Math.floor((Date.now() - new Date(value).getTime()) / 60_000);
  if (minutes <= 2) return "new";
  if (minutes <= 15) return "now";
  if (minutes <= 60) return "recent";
  return "old";
}
