import { CheckCircle2, FileSpreadsheet, MessageSquare, RotateCcw, Send, TriangleAlert, XCircle } from "lucide-react";
import { OperationalEventView } from "../../types";
import { StatusBadge } from "../common/StatusBadge";

const icons: Record<string, typeof MessageSquare> = { STOPPED:TriangleAlert, RETURNED:RotateCcw, DISPLACED:RotateCcw, ERROR:XCircle, WARNING:TriangleAlert, MESSAGE_RECEIVED:MessageSquare, PENDING_CREATED:TriangleAlert, PENDING_APPROVED:CheckCircle2, REPORT_SENT:Send, SHIFT_STARTED:CheckCircle2, STATUS_CHANGED:FileSpreadsheet };
export function Timeline({events}:{events:OperationalEventView[]}) {
  if(!events.length)return <p className="muted">Nenhum evento no período.</p>;
  return <div className="timeline">{events.map(event=>{const Icon=icons[event.type]??MessageSquare;return <article key={event.id} className={`timeline-event priority-${event.priority}`}><time>{new Date(event.timestamp).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</time><span className="timeline-icon"><Icon size={17}/></span><div><div className="row"><strong>{event.operation??event.type}{event.fleet?` · ${event.fleet}`:""}</strong><StatusBadge status={event.type}>{event.type}</StatusBadge></div><p>{event.observation??event.newDescription??event.originalMessage??event.type}</p><details><summary>Detalhes técnicos</summary><small>{event.responsible??event.user??"Sem responsável"} · {event.source} · aprovado: {event.approved?"sim":"não"}</small></details></div></article>})}</div>;
}
