import { Copy, RefreshCw } from "lucide-react";
import { useApp } from "../app/providers";
import { MetricCard } from "../components/common/MetricCard";
import { SystemIndicator } from "../components/common/SystemIndicator";
import { useLoadable } from "../hooks/useLoadable";
import { OperationalSnapshot } from "../types";

type Health = { ok: boolean; simulationMode: boolean; banner: string };

export default function DiagnosticsPage() {
  const { api, notify } = useApp();
  const health = useLoadable(() => api.request<Health>("/health"));
  const snapshot = useLoadable(() => api.request<OperationalSnapshot>("/operational/snapshot"));
  const systems = snapshot.data?.systems ?? [];
  const logs = snapshot.data?.timeline ?? [];

  function copyLogs() {
    navigator.clipboard?.writeText(JSON.stringify(logs, null, 2));
    notify("success", "Logs copiados para a área de transferência.");
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Central técnica</span>
          <h1>Diagnóstico</h1>
          <p className="muted">Estado de serviços, simulação, homologação e sinais operacionais disponíveis.</p>
        </div>
        <button onClick={() => { health.reload(); snapshot.reload(); }}><RefreshCw size={18} />Atualizar</button>
      </div>

      <div className="metric-grid">
        <MetricCard label="Web" value="online" detail="PWA carregado" tone="success" />
        <MetricCard label="API" value={health.data?.ok ? "online" : health.loading ? "verificando" : "sem dados"} detail={health.data?.simulationMode ? "modo simulação" : "sem dados"} tone={health.data?.ok ? "success" : "warning"} />
        <MetricCard label="Pendências" value={snapshot.data?.pendencies.filter((item) => item.status === "open").length ?? "Sem dados"} tone="warning" />
        <MetricCard label="Última sincronização" value="Sem dados" detail="endpoint ainda não disponível" />
      </div>

      <section className="diagnostic-grid">
        {["Web", "API", "PostgreSQL", "Parser", "OperationalEngine", "Excel Agent", "Microsoft Excel", "Planilhas de homologação", "WhatsApp", "Fila de comandos", "Notificações", "Última sincronização"].map((name) => {
          const found = systems.find((item) => item.name.toLowerCase().includes(name.toLowerCase().split(" ")[0]));
          return <article className="diagnostic-card" key={name}><SystemIndicator name={name} state={found?.state ?? (name === "Web" ? "online" : "sem dados")} message={found?.message} /><dl><dt>Latência</dt><dd>Sem dados</dd><dt>Última atividade</dt><dd>{found ? new Date().toLocaleTimeString("pt-BR") : "Sem dados"}</dd><dt>Último erro</dt><dd>Sem dados</dd><dt>Modo</dt><dd>{found?.state ?? "aguardando configuração"}</dd></dl><button disabled={!found}>Testar</button></article>;
        })}
      </section>

      <section className="panel command-log">
        <div className="row"><h2>Logs técnicos</h2><button onClick={copyLogs}><Copy size={16} />Copiar</button></div>
        <div className="filter-bar"><button className="active-filter">Todos</button><button>API</button><button>Excel</button><button>Falhas</button><input aria-label="Buscar logs" placeholder="Buscar nos logs" /></div>
        {logs.length ? logs.map((event) => <details key={event.id} className="log-row"><summary><time>{new Date(event.timestamp).toLocaleTimeString("pt-BR")}</time><strong>{event.type}</strong><span>{event.fleet ?? event.operation ?? "Sistema"}</span></summary><pre>{JSON.stringify(event, null, 2)}</pre></details>) : <p className="muted">Sem dados.</p>}
      </section>
    </section>
  );
}
