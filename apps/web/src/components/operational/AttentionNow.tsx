import { AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { OperationalSnapshot } from "../../types";
import { RelativeTime } from "../common/RelativeTime";

export function AttentionNow({ snapshot, onOpen }: { snapshot: OperationalSnapshot; onOpen?: () => void }) {
  const stopped = snapshot.fleets.filter(item => item.status === "PARADO");
  const pending = snapshot.pendencies.filter(item => item.status === "open");
  const offlineSystems = snapshot.systems.filter(item => ["offline", "failed"].includes(item.state));
  const stale = snapshot.fleets.filter(item => Date.now() - new Date(item.updatedAt).getTime() > 30 * 60_000);
  const latestIssue = stopped[0] ?? stale[0];
  const total = stopped.length + pending.length + offlineSystems.length + stale.length;

  if (!total) {
    return (
      <section className="attention-now attention-normal">
        <CheckCircle2 size={34} />
        <div>
          <span>TUDO NORMAL</span>
          <strong>Nenhuma ocorrência crítica no momento.</strong>
        </div>
      </section>
    );
  }

  return (
    <button className="attention-now attention-critical" onClick={onOpen} type="button">
      <AlertTriangle size={38} />
      <div className="attention-copy">
        <span>ATENÇÃO AGORA</span>
        <strong>{stopped.length} parados · {pending.length} pendências</strong>
        {latestIssue && <small>{latestIssue.fleet} · {latestIssue.description} · <RelativeTime value={latestIssue.updatedAt} /></small>}
        {!latestIssue && offlineSystems[0] && <small>{offlineSystems[0].name}: {offlineSystems[0].message}</small>}
      </div>
      <ChevronRight size={24} />
    </button>
  );
}
