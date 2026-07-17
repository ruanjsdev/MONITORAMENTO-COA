import { Copy, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { useApp } from "../app/providers";
import { MetricCard } from "../components/common/MetricCard";
import { SystemIndicator } from "../components/common/SystemIndicator";
import { useLoadable } from "../hooks/useLoadable";
import { OperationalModeStatus, OperationalSnapshot } from "../types";

type Health = { ok: boolean; simulationMode: boolean; banner: string };
type WhatsAppQrStatus = {
  qrState: "AWAITING_QR" | "QR_VALID" | "QR_EXPIRED" | "CONNECTED" | "DISCONNECTED";
  qrDataUrl: string | null;
  updatedAt?: string;
  sendMessage: false;
  sendReaction: false;
  officialExcelWrite: false;
  source?: string;
  monitoredGroup: {
    name: string;
    maskedExternalId: string;
    lastMessage: string | null;
    processedMessages: number;
    monitoring: string;
    operation: string | null;
  } | null;
  pipeline?: {
    lastMessageId: string | null;
    lastPersistedMessage: string | null;
    lastInterpretation: unknown;
    lastPendingId: string | null;
    captured: number;
    processed: number;
    ignored: number;
    duplicates: number;
    lastError: string | null;
  };
};
const qrLabels: Record<WhatsAppQrStatus["qrState"], string> = {
  AWAITING_QR: "Aguardando QR",
  QR_VALID: "QR válido",
  QR_EXPIRED: "QR expirado",
  CONNECTED: "Conectado",
  DISCONNECTED: "Desconectado"
};

export default function DiagnosticsPage() {
  const { api, notify } = useApp();
  const health = useLoadable(() => api.request<Health>("/health"));
  const snapshot = useLoadable(() => api.request<OperationalSnapshot>("/operational/snapshot"));
  const mode = useLoadable(() => api.request<OperationalModeStatus>("/operational-mode"));
  const whatsappQr = useLoadable(() => api.request<WhatsAppQrStatus>("/whatsapp-shadow/status"));
  const systems = snapshot.data?.systems ?? [];
  const logs = snapshot.data?.timeline ?? [];
  useEffect(() => {
    const timer = window.setInterval(() => whatsappQr.reload(), 3_000);
    return () => window.clearInterval(timer);
  }, []);

  function copyLogs() {
    navigator.clipboard?.writeText(JSON.stringify(logs, null, 2));
    notify("success", "Logs copiados para a área de transferência.");
  }

  async function reprocessLastMessage() {
    const id = whatsappQr.data?.pipeline?.lastMessageId;
    if (!id) return;
    try {
      await api.request(`/whatsapp-shadow/messages/${id}/reprocess`, {
        method: "POST",
        body: "{}"
      });
      notify("success", "Mensagem reprocessada sem duplicar pendências.");
      whatsappQr.reload();
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Falha ao reprocessar.");
    }
  }

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Central técnica</span>
          <h1>Diagnóstico</h1>
          <p className="muted">
            Estado dos serviços, da leitura do Excel e do monitoramento do WhatsApp.
          </p>
        </div>
        <button
          onClick={() => {
            health.reload();
            snapshot.reload();
            mode.reload();
            whatsappQr.reload();
          }}
        >
          <RefreshCw size={18} />
          Atualizar
        </button>
      </div>

      <div className="metric-grid">
        <MetricCard label="Web" value="online" detail="PWA carregado" tone="success" />
        <MetricCard
          label="API"
          value={health.data?.ok ? "online" : health.loading ? "verificando" : "sem dados"}
          detail={mode.data?.mode ? `modo ${mode.data.mode}` : "sem dados"}
          tone={health.data?.ok ? "success" : "warning"}
        />
        <MetricCard
          label="Pendências"
          value={
            snapshot.data?.pendencies.filter((item) => item.status === "open").length ?? "Sem dados"
          }
          tone="warning"
        />
        <MetricCard
          label="Última sincronização"
          value={
            snapshot.data?.readAt
              ? new Date(snapshot.data.readAt).toLocaleTimeString("pt-BR")
              : "Sem dados"
          }
          detail={
            snapshot.data?.source === "EXCEL_COM_LOCAL_DEV" ? "Excel real" : "Aguardando Excel"
          }
        />
      </div>

      <section className="panel form">
        <div className="row">
          <div>
            <span className="eyebrow">Modo operacional</span>
            <h2>{mode.data?.mode ?? "Carregando"}</h2>
          </div>
          <span className="badge badge-warning">{mode.data?.banner ?? "Sem dados"}</span>
        </div>
        <div className="diagnostic-grid compact-diagnostics">
          <article>
            <strong>PostgreSQL</strong>
            <span>{mode.data?.postgres ?? "Sem dados"}</span>
          </article>
          <article>
            <strong>WhatsApp</strong>
            <span>{mode.data?.whatsapp ?? "Sem dados"}</span>
          </article>
          <article>
            <strong>Excel oficial</strong>
            <span>{mode.data?.officialExcelReadOnly ? "Somente leitura" : "Desativado"}</span>
          </article>
          <article>
            <strong>Escrita oficial</strong>
            <span>{mode.data?.officialExcelWrite ? "Habilitada" : "Desativada"}</span>
          </article>
          <article>
            <strong>Envio</strong>
            <span>{mode.data?.sendMessage ? "Habilitado" : "Desativado"}</span>
          </article>
          <article>
            <strong>Reação</strong>
            <span>{mode.data?.sendReaction ? "Habilitada" : "Desativada"}</span>
          </article>
        </div>
        {mode.data?.mode === "LOCAL_OPERATIONAL" && (
          <div className="safety-notice">
            <strong>MODO OPERACIONAL LOCAL</strong>
            <span>
              WhatsApp conectado para leitura · Excel real conectado · alterações aplicadas após
              aprovação.
            </span>
          </div>
        )}
        <section className="technical">
          <div className="row">
            <strong>Autenticação WhatsApp</strong>
            <span className="badge badge-warning">
              {whatsappQr.data ? qrLabels[whatsappQr.data.qrState] : "Sem dados"}
            </span>
          </div>
          {whatsappQr.data?.qrDataUrl ? (
            <div>
              <p>
                Escaneie este QR pelo WhatsApp. Ele será substituído automaticamente quando expirar.
              </p>
              <img
                src={whatsappQr.data.qrDataUrl}
                alt="QR de autenticação do WhatsApp"
                width="420"
                height="420"
                style={{ maxWidth: "100%", height: "auto", background: "white", padding: 12 }}
              />
            </div>
          ) : (
            <p className="muted">
              {whatsappQr.data?.qrState === "CONNECTED"
                ? "QR removido após conexão."
                : "Aguardando um QR válido do agente."}
            </p>
          )}
          <small>Monitoramento somente de mensagens recebidas</small>
        </section>
        <section className="technical">
          <strong>Grupo selecionado</strong>
          {whatsappQr.data?.monitoredGroup ? (
            <dl>
              <dt>Status</dt>
              <dd>{whatsappQr.data.monitoredGroup.monitoring}</dd>
              <dt>Grupo</dt>
              <dd>{whatsappQr.data.monitoredGroup.name}</dd>
              <dt>JID</dt>
              <dd>{whatsappQr.data.monitoredGroup.maskedExternalId}</dd>
              <dt>Operação</dt>
              <dd>{whatsappQr.data.monitoredGroup.operation ?? "Não vinculada"}</dd>
              <dt>Última mensagem</dt>
              <dd>{whatsappQr.data.monitoredGroup.lastMessage ?? "Nenhuma"}</dd>
              <dt>Mensagens capturadas</dt>
              <dd>{whatsappQr.data.monitoredGroup.processedMessages}</dd>
            </dl>
          ) : (
            <p className="muted">Nenhum grupo selecionado para monitoramento.</p>
          )}
        </section>
        <section className="technical">
          <div className="row">
            <strong>Pipeline real</strong>
            <button
              disabled={!whatsappQr.data?.pipeline?.lastMessageId}
              onClick={reprocessLastMessage}
            >
              Reprocessar mensagem capturada
            </button>
          </div>
          <dl>
            <dt>Origem</dt>
            <dd>{whatsappQr.data?.source ?? "Sem dados"}</dd>
            <dt>Persistida</dt>
            <dd>{whatsappQr.data?.pipeline?.lastPersistedMessage ?? "Nenhuma"}</dd>
            <dt>Última pendência</dt>
            <dd>{whatsappQr.data?.pipeline?.lastPendingId ?? "Nenhuma"}</dd>
            <dt>Capturadas</dt>
            <dd>{whatsappQr.data?.pipeline?.captured ?? 0}</dd>
            <dt>Processadas</dt>
            <dd>{whatsappQr.data?.pipeline?.processed ?? 0}</dd>
            <dt>Ignoradas</dt>
            <dd>{whatsappQr.data?.pipeline?.ignored ?? 0}</dd>
            <dt>Duplicadas</dt>
            <dd>{whatsappQr.data?.pipeline?.duplicates ?? 0}</dd>
            <dt>Último erro</dt>
            <dd>{whatsappQr.data?.pipeline?.lastError ?? "Nenhum"}</dd>
          </dl>
        </section>
      </section>

      <section className="diagnostic-grid">
        {[
          "Web",
          "API",
          "PostgreSQL",
          "Parser",
          "OperationalEngine",
          "Excel Agent",
          "Microsoft Excel",
          "Planilhas de homologação",
          "WhatsApp",
          "Fila de comandos",
          "Notificações",
          "Última sincronização"
        ].map((name) => {
          const found = systems.find((item) =>
            item.name.toLowerCase().includes(name.toLowerCase().split(" ")[0])
          );
          return (
            <article className="diagnostic-card" key={name}>
              <SystemIndicator
                name={name}
                state={found?.state ?? (name === "Web" ? "online" : "sem dados")}
                message={found?.message}
              />
              <dl>
                <dt>Latência</dt>
                <dd>Sem dados</dd>
                <dt>Última atividade</dt>
                <dd>{found ? new Date().toLocaleTimeString("pt-BR") : "Sem dados"}</dd>
                <dt>Último erro</dt>
                <dd>Sem dados</dd>
                <dt>Modo</dt>
                <dd>{found?.state ?? "aguardando configuração"}</dd>
              </dl>
              <button disabled={!found}>Testar</button>
            </article>
          );
        })}
      </section>

      <section className="panel command-log">
        <div className="row">
          <h2>Logs técnicos</h2>
          <button onClick={copyLogs}>
            <Copy size={16} />
            Copiar
          </button>
        </div>
        <div className="filter-bar">
          <button className="active-filter">Todos</button>
          <button>API</button>
          <button>Excel</button>
          <button>Falhas</button>
          <input aria-label="Buscar logs" placeholder="Buscar nos logs" />
        </div>
        {logs.length ? (
          logs.map((event) => (
            <details key={event.id} className="log-row">
              <summary>
                <time>{new Date(event.timestamp).toLocaleTimeString("pt-BR")}</time>
                <strong>{event.type}</strong>
                <span>{event.fleet ?? event.operation ?? "Sistema"}</span>
              </summary>
              <pre>{JSON.stringify(event, null, 2)}</pre>
            </details>
          ))
        ) : (
          <p className="muted">Sem dados.</p>
        )}
      </section>
    </section>
  );
}
