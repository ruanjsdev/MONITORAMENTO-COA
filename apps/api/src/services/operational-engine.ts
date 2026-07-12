import { randomUUID } from "node:crypto";
import { FleetProjection, OperationalEvent, OperationalEventType, StopMetrics } from "@coa-bot/shared";

type EventInput = Omit<OperationalEvent, "id" | "timestamp" | "simulated"> & { id?: string; timestamp?: string };
export type TimelineFilter = { since?: string; operation?: string; fleet?: string; shift?: string; group?: string };

export class OperationalEngine {
  readonly simulationMode: boolean;
  #events: OperationalEvent[] = [];

  constructor(options: { simulationMode: boolean; seed?: readonly EventInput[] }) {
    if (!options.simulationMode) throw new Error("OperationalEngine real requer adaptadores homologados.");
    this.simulationMode = options.simulationMode;
    for (const event of options.seed ?? []) this.append(event);
  }

  append(input: EventInput): OperationalEvent {
    const event = Object.freeze({ ...input, id: input.id ?? randomUUID(), timestamp: input.timestamp ?? new Date().toISOString(), simulated: true }) as OperationalEvent;
    this.#events.push(event);
    return event;
  }

  all(): readonly OperationalEvent[] { return [...this.#events].sort((a, b) => a.timestamp.localeCompare(b.timestamp)); }

  timeline(filter: TimelineFilter = {}): OperationalEvent[] {
    return [...this.#events].filter(event => (!filter.since || event.timestamp >= filter.since) && (!filter.operation || event.operation === filter.operation) && (!filter.fleet || event.fleet === filter.fleet) && (!filter.shift || event.shift === filter.shift) && (!filter.group || event.group === filter.group)).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  }

  currentState(fleet?: string): FleetProjection[] {
    const codes = fleet ? [fleet] : [...new Set(this.#events.flatMap(event => event.fleet ? [event.fleet] : []))];
    return codes.flatMap(code => {
      const events = this.#events.filter(event => event.fleet === code && event.approved).sort((a,b) => a.timestamp.localeCompare(b.timestamp));
      if (!events.length) return [];
      const last = events.at(-1)!;
      const latest = <K extends keyof OperationalEvent>(key: K) => [...events].reverse().find(event => event[key])?.[key] as string | undefined;
      return [{ fleet: code, status: latest("newStatus") ?? "SEM INFORMACAO", description: latest("newDescription") ?? "Sem descrição", operation: latest("operation") ?? "Não informada", sector: latest("newSector") ?? "Não informado", updatedAt: last.timestamp, stoppedMinutes: this.stopMetrics(code).runningSince ? Math.floor((Date.now() - new Date(this.stopMetrics(code).runningSince!).getTime()) / 60_000) : 0, stopMetrics: this.stopMetrics(code) }];
    });
  }

  stopMetrics(fleet: string, now = new Date()): StopMetrics {
    const events = this.#events.filter(event => event.fleet === fleet && event.approved && (event.type === "STOPPED" || event.type === "RETURNED")).sort((a,b)=>a.timestamp.localeCompare(b.timestamp));
    const durations: Array<{ start: Date; end: Date }> = []; let open: Date | undefined;
    for (const event of events) { if (event.type === "STOPPED" && !open) open = new Date(event.timestamp); if (event.type === "RETURNED" && open) { durations.push({ start: open, end: new Date(event.timestamp) }); open = undefined; } }
    if (open) durations.push({ start: open, end: now });
    const minutes = (start: Date, end: Date) => Math.max(0, Math.floor((end.getTime()-start.getTime())/60_000));
    const today = new Date(now); today.setHours(0,0,0,0); const week = new Date(today); week.setDate(week.getDate()-6);
    const sumSince = (since: Date) => durations.reduce((total,item)=>total+minutes(new Date(Math.max(item.start.getTime(),since.getTime())),item.end),0);
    const values = durations.map(item=>minutes(item.start,item.end));
    return { todayMinutes: sumSince(today), shiftMinutes: sumSince(new Date(now.getTime()-8*60*60_000)), weekMinutes: sumSince(week), stopCount: events.filter(event=>event.type==="STOPPED").length, longestMinutes: Math.max(0,...values), lastStopAt: [...events].reverse().find(event=>event.type==="STOPPED")?.timestamp, runningSince: open?.toISOString() };
  }

  fleetHistory(fleet: string) { const state = this.currentState(fleet)[0]; const events = this.timeline({fleet}); return { state, events, today: events.filter(e=>e.timestamp>=startOfDays(0)), week: events.filter(e=>e.timestamp>=startOfDays(6)), month: events.filter(e=>e.timestamp>=startOfDays(30)), messages: events.filter(e=>e.type==="MESSAGE_RECEIVED"), pendencies: events.filter(e=>e.type==="PENDING_CREATED"&&!this.hasLater(e,"PENDING_APPROVED")) }; }
  shiftJournal(shift: string) { return this.timeline({shift}).filter(event => event.approved || ["ERROR","WARNING","PENDING_CREATED"].includes(event.type)); }
  search(query: string) { const normalized=query.toLocaleLowerCase("pt-BR"); const events=this.timeline().filter(event=>JSON.stringify(event).toLocaleLowerCase("pt-BR").includes(normalized)); const fleets=[...new Set(events.flatMap(event=>event.fleet?[event.fleet]:[]))]; return { currentState: fleets.flatMap(fleet=>this.currentState(fleet)), events, histories: fleets.map(fleet=>this.fleetHistory(fleet)) }; }
  toExcelCommands(event: OperationalEvent) { return event.approved && event.fleet ? [{ type: "PROJECT_OPERATIONAL_EVENT", eventId: event.id, fleet: event.fleet, status: event.newStatus, description: event.newDescription, sector: event.newSector, execute: false, simulated: true }] : []; }
  toWhatsAppCommands(event: OperationalEvent) { return [{ type: "RECORD_OPERATIONAL_EVENT", eventId: event.id, group: event.group, text: event.observation ?? event.newDescription ?? event.type, execute: false, simulated: true, reaction: null }]; }
  private hasLater(event: OperationalEvent, type: OperationalEventType) { return this.#events.some(candidate=>candidate.type===type&&candidate.fleet===event.fleet&&candidate.timestamp>event.timestamp); }
}

function startOfDays(days:number){const date=new Date();date.setHours(0,0,0,0);date.setDate(date.getDate()-days);return date.toISOString();}

export function rebuildProjections(events: readonly OperationalEvent[]) {
  const engine = new OperationalEngine({ simulationMode: true, seed: events });
  return { currentState: engine.currentState(), shiftJournal: engine.shiftJournal("C"), downtime: Object.fromEntries(engine.currentState().map(item=>[item.fleet,item.stopMetrics])) };
}
