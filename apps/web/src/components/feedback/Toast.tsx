export function Toast({ type, message }: { type: "success" | "error"; message: string }) {
  return <div className={`toast ${type}`}>{message}</div>;
}
