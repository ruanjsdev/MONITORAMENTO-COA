import { Clock3, Database, RefreshCw, Signal, UserCircle } from "lucide-react";
import { useApp } from "../app/providers";
import { AttentionNow } from "../components/operational/AttentionNow";
import { EventFeed } from "../components/operational/EventFeed";
import { OperationRow } from "../components/operational/OperationRow";
import { RelativeTime } from "../components/common/RelativeTime";
import { SemanticStatusBadge } from "../components/common/SemanticStatusBadge";
import { useLoadable } from "../hooks/useLoadable";
import { OperationalSnapshot } from "../types";

export default function DashboardPage() {
  const { api } = useApp();
  const { data, error, loading, reload } = useLoadable(() => api.request<OperationalSnapshot>("/operational/snapshot"));
  if (loading) return <section className="panel loading-panel">Carregando Meu Turno...</section>;
  if (error || !data) return <section className="panel error-box"><p>{error}</p><button onClick={reload}>Tentar novamente</button></section>;

  const stopped = data.fleets.filter(item => item.status === "PARADO").length;
  const running = data.fleets.filter(item => item.status === "RODANDO").length;
  const stale = data.fleets.filter(item => Date.now() - new Date(item.updatedAt).getTime() > 30 * 60_000).length;
  const pending = data.pendencies.filter(item => item.status === "open").length;
  const lastUpdate = latestDate([...data.fleets.map(item => item.updatedAt), ...data.timeline.map(item => item.timestamp)]);
  const apiOnline = data.systems.find(item => item.name === "API")?.state === "online";
  const hasServiceFailure = data.systems.some(item => ["offline", "error", "erro"].includes(item.state.toLowerCase()));

  return (
    <section className="shift-home">
      <div className="shift-bar">
        <div>
          <h1>Meu Turno</h1>
          <div className="shift-meta">
            <span><Clock3 size={16} />{new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
            <span>Turno {data.shift}</span>
            <span><UserCircle size={16} />Operador Admin</span>
          </div>
        </div>
        <div className="shift-status">
          <SemanticStatusBadge status={hasServiceFailure ? "OFFLINE" : apiOnline ? "ONLINE" : "SIMULATED"}>{hasServiceFailure ? "Serviços em atenção" : apiOnline ? "Operação local ativa" : "Ambiente simulado"}</SemanticStatusBadge>
          <span><Database size={15} />Atualizado <RelativeTime value={lastUpdate} /></span>
          <button onClick={reload} aria-label="Atualizar"><RefreshCw size={18} /></button>
        </div>
      </div>

      <AttentionNow snapshot={data} onOpen={() => location.assign("/pendencias")} />

      <div className="prime-metrics" aria-label="Métricas principais">
        <PrimeMetric label="Parados" value={stopped} status="PARADO" detail="críticos" />
        <PrimeMetric label="Pendências" value={pending} status="PENDENTE" detail="atenção" />
        <PrimeMetric label="Rodando" value={running} status="RODANDO" detail="normal" />
        <PrimeMetric label="Sem atualização" value={stale} status="SEM INFORMACAO" detail="> 30 min" />
      </div>

      <div className="shift-grid">
        <section className="panel operations-compact-panel">
          <div className="section-title">
            <h2>Operações</h2>
            <button onClick={() => location.assign("/operacoes")}>Ver todas</button>
          </div>
          <div className="operation-rows">
            {data.operationSummary.map(item => (
              <OperationRow
                key={item.operation}
                item={item}
                pendingCount={data.pendencies.filter(pendingItem => pendingItem.operation === item.operation && pendingItem.status === "open").length}
                onOpen={() => location.assign("/operacoes")}
              />
            ))}
          </div>
        </section>

        <section className="panel happened-now-panel">
          <div className="section-title">
            <h2>Aconteceu agora</h2>
            <button onClick={() => location.assign("/historico")}>Ver tudo</button>
          </div>
          <EventFeed events={data.timeline} limit={8} />
        </section>
      </div>

      <details className="panel recent-reports">
        <summary><Signal size={18} />Relatórios recentes</summary>
        <div className="report-list">
          {data.messages.slice(0, 5).map(item => (
            <article key={item.id}>
              <strong>{item.text}</strong>
              <span>{item.status}</span>
              <RelativeTime value={item.receivedAt} />
            </article>
          ))}
          {!data.messages.length && <p className="muted">Nenhum relatório recente.</p>}
        </div>
      </details>
    </section>
  );
}

function PrimeMetric({ label, value, status, detail }: { label: string; value: number; status: string; detail: string }) {
  return (
    <article className="prime-metric">
      <SemanticStatusBadge status={status} />
      <strong>{value}</strong>
      <span>{label}</span>
      <small>{detail}</small>
    </article>
  );
}

function latestDate(values: string[]) {
  const latest = values.map(value => new Date(value).getTime()).filter(Boolean).sort((a, b) => b - a)[0];
  return latest ? new Date(latest).toISOString() : undefined;
}

export function MessageState({ status }: { status: string }) {
  const labels: Record<string, string> = {
    READ: "Lida",
    PENDING_APPROVAL: "Aguardando aprovação",
    PROCESSED: "Processada",
    REJECTED: "Rejeitada",
    FAILED: "Falhou"
  };
  return <SemanticStatusBadge status={status}>{labels[status] ?? status}</SemanticStatusBadge>;
}
