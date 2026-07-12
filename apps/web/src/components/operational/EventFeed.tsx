import { OperationalEventView } from "../../types";
import { eventDetail, eventSentence, semanticForEvent } from "../../utils/operationalSemantics";
import { RelativeTime, temporalState } from "../common/RelativeTime";

type Group = {
  title: string;
  events: OperationalEventView[];
};

export function EventFeed({ events, limit }: { events: OperationalEventView[]; limit?: number }) {
  const ordered = [...events].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const visible = typeof limit === "number" ? ordered.slice(0, limit) : ordered;
  const groups = groupEvents(visible);
  if (!visible.length) return <p className="muted">Nenhum evento operacional no período.</p>;
  return (
    <div className="event-feed">
      {groups.map(group => group.events.length ? <EventGroup key={group.title} title={group.title} events={group.events} /> : null)}
    </div>
  );
}

export function EventGroup({ title, events }: Group) {
  return (
    <section className="event-group">
      <h3>{title}</h3>
      {events.map(event => <EventItem key={event.id} event={event} />)}
    </section>
  );
}

function EventItem({ event }: { event: OperationalEventView }) {
  const semantic = semanticForEvent(event);
  const Icon = semantic.icon;
  const resolved = event.type === "RETURNED" || event.type === "PENDING_APPROVED" || event.type === "CONFIRMED";
  return (
    <article className={`event-item event-${semantic.tone} temporal-${temporalState(event.timestamp, resolved)}`}>
      <span className="event-dot"><Icon size={18} /></span>
      <div>
        <div className="event-line">
          <strong>{eventSentence(event)}</strong>
          <RelativeTime value={event.timestamp} />
        </div>
        <p>{eventDetail(event)}</p>
        <small>{event.operation ?? "Operação não informada"}{event.group ? ` · ${event.group}` : ""}</small>
      </div>
    </article>
  );
}

function groupEvents(events: OperationalEventView[]): Group[] {
  const isResolved = (event: OperationalEventView) => ["RETURNED", "PENDING_APPROVED", "CONFIRMED"].includes(event.type);
  const active = events.filter(event => !isResolved(event));
  return [
    { title: "Agora", events: active.filter(event => ["new", "now"].includes(temporalState(event.timestamp))) },
    { title: "Últimos 15 minutos", events: active.filter(event => temporalState(event.timestamp) === "recent") },
    { title: "Anteriores", events: active.filter(event => temporalState(event.timestamp) === "old") },
    { title: "Resolvidos", events: events.filter(isResolved) }
  ];
}
