import { OperationalEventView } from "../../types";
import { EventFeed } from "./EventFeed";

export function Timeline({ events }: { events: OperationalEventView[] }) {
  return <EventFeed events={events} />;
}
