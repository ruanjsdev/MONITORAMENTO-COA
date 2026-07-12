import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  Clock3,
  ClipboardCheck,
  FileWarning,
  Map,
  PauseOctagon,
  PlayCircle,
  Route,
  Tractor,
  Wrench
} from "lucide-react";
import { OperationalEventView } from "../types";

export type SemanticTone = "success" | "danger" | "warning" | "info" | "neutral" | "maintenance" | "support";

export type SemanticDefinition = {
  label: string;
  tone: SemanticTone;
  icon: typeof CircleHelp;
};

const statusMap: Record<string, SemanticDefinition> = {
  RODANDO: { label: "RODANDO", tone: "success", icon: PlayCircle },
  PARADO: { label: "PARADO", tone: "danger", icon: PauseOctagon },
  DISPONIVEL: { label: "DISPONÍVEL", tone: "info", icon: CheckCircle2 },
  MANUTENCAO: { label: "MANUTENÇÃO", tone: "maintenance", icon: Wrench },
  "MANUTENÇÃO": { label: "MANUTENÇÃO", tone: "maintenance", icon: Wrench },
  SEM_OPERACAO: { label: "SEM OPERAÇÃO", tone: "neutral", icon: Clock3 },
  "SEM OPERAÇÃO": { label: "SEM OPERAÇÃO", tone: "neutral", icon: Clock3 },
  "SEM INFORMACAO": { label: "SEM ATUALIZAÇÃO", tone: "neutral", icon: Clock3 },
  DESLOCAMENTO: { label: "DESLOCAMENTO", tone: "info", icon: Route },
  AGUARDANDO_AREA: { label: "AGUARDANDO ÁREA", tone: "warning", icon: Clock3 },
  ATOLADO: { label: "ATOLADO", tone: "danger", icon: AlertTriangle },
  APOIO_OUTRA_OPERACAO: { label: "APOIO", tone: "support", icon: Map },
  PENDENTE: { label: "PENDENTE", tone: "warning", icon: ClipboardCheck },
  APROVADO: { label: "APROVADO", tone: "success", icon: CheckCircle2 },
  REJEITADO: { label: "REJEITADO", tone: "neutral", icon: FileWarning },
  FALHA: { label: "FALHA", tone: "danger", icon: AlertTriangle },
  PROCESSADO: { label: "PROCESSADO", tone: "success", icon: CheckCircle2 },
  OPEN: { label: "PENDENTE", tone: "warning", icon: ClipboardCheck },
  RESOLVED: { label: "RESOLVIDO", tone: "neutral", icon: CheckCircle2 },
  PROCESSED: { label: "PROCESSADO", tone: "success", icon: CheckCircle2 },
  FAILED: { label: "FALHA", tone: "danger", icon: AlertTriangle },
  ONLINE: { label: "ONLINE", tone: "success", icon: CheckCircle2 },
  OFFLINE: { label: "OFFLINE", tone: "danger", icon: AlertTriangle },
  SIMULATED: { label: "SIMULADO", tone: "warning", icon: FileWarning }
};

const eventMap: Record<string, SemanticDefinition> = {
  STOPPED: { label: "PAROU", tone: "danger", icon: PauseOctagon },
  RETURNED: { label: "VOLTOU", tone: "success", icon: PlayCircle },
  DISPLACED: { label: "DESLOCAMENTO", tone: "info", icon: Route },
  PENDING_CREATED: { label: "PENDÊNCIA", tone: "warning", icon: ClipboardCheck },
  PENDING_APPROVED: { label: "APROVADO", tone: "success", icon: CheckCircle2 },
  STATUS_CHANGED: { label: "STATUS", tone: "info", icon: Tractor },
  MESSAGE_RECEIVED: { label: "MENSAGEM", tone: "info", icon: FileWarning },
  REPORT_SENT: { label: "RELATÓRIO", tone: "success", icon: ClipboardCheck },
  SHIFT_REPORT_SENT: { label: "TROCA DE TURNO", tone: "success", icon: ClipboardCheck },
  SHIFT_REPORT_CREATED: { label: "RASCUNHO", tone: "info", icon: ClipboardCheck },
  ERROR: { label: "FALHA", tone: "danger", icon: AlertTriangle },
  WARNING: { label: "ATENÇÃO", tone: "warning", icon: AlertTriangle },
  CONFIRMED: { label: "CONFIRMADO", tone: "success", icon: CheckCircle2 }
};

export function semanticForStatus(status?: string | null): SemanticDefinition {
  if (!status) return { label: "SEM DADOS", tone: "neutral", icon: CircleHelp };
  const normalized = normalizeKey(status);
  return statusMap[normalized] ?? { label: status.replaceAll("_", " "), tone: "neutral", icon: CircleHelp };
}

export function semanticForEvent(event: Pick<OperationalEventView, "type" | "newStatus">): SemanticDefinition {
  return eventMap[normalizeKey(event.type)] ?? semanticForStatus(event.newStatus ?? event.type);
}

export function eventSentence(event: OperationalEventView) {
  const fleet = event.fleet ?? event.operation ?? "Operação";
  if (event.type === "STOPPED") return `${fleet} parou`;
  if (event.type === "RETURNED") return `${fleet} voltou a rodar`;
  if (event.type === "DISPLACED") return `${fleet} iniciou deslocamento`;
  if (event.type === "PENDING_CREATED") return `Pendência em ${fleet}`;
  if (event.type === "PENDING_APPROVED") return `${fleet} aprovado`;
  if (event.type === "STATUS_CHANGED") return `${fleet} mudou para ${event.newStatus ?? "novo status"}`;
  if (event.type === "MESSAGE_RECEIVED") return "Mensagem operacional recebida";
  if (event.type === "SHIFT_REPORT_SENT") return "Troca de turno enviada";
  return `${fleet} · ${semanticForEvent(event).label}`;
}

export function eventDetail(event: OperationalEventView) {
  return event.newDescription ?? event.observation ?? event.originalMessage ?? event.operation ?? event.type;
}

export function normalizeKey(value: string) {
  return value.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[\s-]+/g, "_").toUpperCase();
}
