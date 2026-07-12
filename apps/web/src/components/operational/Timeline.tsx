import { OperationalEventView } from "../../types";

const emoji: Record<string,string> = { STOPPED:"🔴",RETURNED:"🟢",DISPLACED:"🚜",ERROR:"⚠️",WARNING:"🟠",MESSAGE_RECEIVED:"💬",PENDING_CREATED:"🕒",PENDING_APPROVED:"✅",REPORT_SENT:"📤",SHIFT_STARTED:"👤" };
export function Timeline({events}:{events:OperationalEventView[]}) {
  if(!events.length)return <p className="muted">Nenhum evento no período.</p>;
  return <div className="timeline">{events.map(event=><article key={event.id} className={`timeline-event priority-${event.priority}`}><time>{new Date(event.timestamp).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</time><span className="timeline-icon">{emoji[event.type]??"•"}</span><div><strong>{event.operation??event.type}{event.fleet?` · ${event.fleet}`:""}</strong><p>{event.observation??event.newDescription??event.originalMessage??event.type}</p><small>{event.responsible??event.user} · {event.source} · {event.type}</small></div></article>)}</div>;
}
