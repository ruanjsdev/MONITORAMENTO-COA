import { Circle } from "lucide-react";

type SystemIndicatorProps = {
  name: string;
  state?: string;
  message?: string;
};

export function SystemIndicator({ name, state = "sem dados", message }: SystemIndicatorProps) {
  const normalized = state.toLowerCase();
  const tone = normalized.includes("online") ? "online" : normalized.includes("sim") ? "simulation" : normalized.includes("offline") || normalized.includes("erro") ? "offline" : "waiting";

  return (
    <span className={`system-indicator indicator-${tone}`} title={message ?? `${name}: ${state}`}>
      <Circle size={9} fill="currentColor" />
      <span>{name}</span>
      <strong>{state}</strong>
    </span>
  );
}
