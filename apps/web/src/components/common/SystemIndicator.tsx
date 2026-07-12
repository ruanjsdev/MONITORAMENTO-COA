import { Circle } from "lucide-react";

type SystemIndicatorProps = {
  name: string;
  state?: string;
  message?: string;
};

export function SystemIndicator({ name, state = "sem dados", message }: SystemIndicatorProps) {
  const tone = indicatorTone(state);

  return (
    <span className={`system-indicator indicator-${tone}`} title={message ?? `${name}: ${state}`}>
      <Circle size={9} fill="currentColor" />
      <span>{name}</span>
      <strong>{state}</strong>
    </span>
  );
}

function indicatorTone(state: string) {
  const normalized = state.trim().toLowerCase();
  const tones: Record<string, "online" | "simulation" | "offline" | "waiting"> = {
    online: "online",
    simulated: "simulation",
    simulando: "simulation",
    offline: "offline",
    error: "offline",
    erro: "offline",
    iniciando: "waiting",
    "não configurado": "waiting",
    "nao configurado": "waiting",
    "sem dados": "waiting"
  };
  return tones[normalized] ?? "waiting";
}
