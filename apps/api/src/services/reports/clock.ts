export class Clock {
  constructor(private readonly fixed?: Date) {}
  now() { return this.fixed ? new Date(this.fixed) : new Date(); }
}

export const operationalTimezone = process.env.OPERATIONAL_TIMEZONE || "America/Belem";

export function formatOperationalTime(date: Date, timezone = operationalTimezone) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: false }).format(date).replace(":", ":");
}

export function formatOperationalDate(date: Date, timezone = operationalTimezone) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

export function operationalParts(date: Date, timezone = operationalTimezone) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(date);
  const get = (type: string) => parts.find(part => part.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}`, weekday: weekdayIndex(get("weekday")) };
}

export function operationalDateForSchedule(date: Date, startTime: string, endTime: string, timezone = operationalTimezone) {
  const parts = operationalParts(date, timezone);
  const current = parseMinutes(parts.time);
  const start = parseMinutes(startTime);
  const end = parseMinutes(endTime);
  if (end < start && current <= end) {
    const previous = new Date(date.getTime() - 24 * 60 * 60_000);
    return operationalParts(previous, timezone).date;
  }
  return parts.date;
}

export function parseMinutes(time: string) {
  const [h = "0", m = "0"] = time.split(":");
  return Number(h) * 60 + Number(m);
}

export function formatMinutes(value: number) {
  const normalized = ((value % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

function weekdayIndex(value: string) {
  const key = value.slice(0, 3).toLowerCase();
  return ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].indexOf(key);
}
