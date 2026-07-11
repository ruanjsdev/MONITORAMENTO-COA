export function formatDate(value?: string) {
  if (!value) return "Sem registro";
  return new Date(value).toLocaleString("pt-BR");
}

export function formatBytes(value: number) {
  return `${(value / 1024 / 1024).toFixed(2)} MB`;
}
