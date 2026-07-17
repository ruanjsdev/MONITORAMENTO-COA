import { Pencil, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { useApp } from "../app/providers";
import { EmptyState } from "../components/common/EmptyState";
import { RelativeTime } from "../components/common/RelativeTime";
import { SemanticStatusBadge } from "../components/common/SemanticStatusBadge";
import { useLoadable } from "../hooks/useLoadable";
import { PendingChange } from "../types";

export default function PendingChangesPage() {
  const { api, notify } = useApp();
  const changes = useLoadable(() => api.request<PendingChange[]>("/pending-changes"));
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [preparing, setPreparing] = useState<string | null>(null);
  const [localPreviews, setLocalPreviews] = useState<Record<string, any>>({});
  if (changes.loading)
    return <section className="panel loading-panel">Carregando pendências...</section>;
  if (changes.error || !changes.data)
    return (
      <section className="panel error-box">
        <p>{changes.error}</p>
        <button onClick={changes.reload}>Tentar novamente</button>
      </section>
    );

  async function decide(id: string, decision: string) {
    try {
      const result = await api.request<{ externalActions: { reason: string } }>(
        `/pending-changes/${id}/decision`,
        { method: "POST", body: JSON.stringify({ decision, description: observations[id] ?? "" }) }
      );
      notify("success", result.externalActions.reason);
      await changes.reload();
    } catch (error) {
      notify("error", message(error));
    }
  }
  async function prepareLocal(id: string) {
    setPreparing(id);
    try {
      const preview = await api.request<any>(`/excel/local-workbooks/preview/${id}`, {
        method: "POST",
        body: "{}"
      });
      setLocalPreviews((value) => ({ ...value, [id]: preview }));
      notify("success", "Dados atuais e alteração proposta conferidos no Excel.");
    } catch (error) {
      notify("error", message(error));
    } finally {
      setPreparing(null);
    }
  }
  async function applyLocal(id: string) {
    setPreparing(id);
    try {
      const result = await api.request<any>(`/excel/local-workbooks/apply/${id}`, {
        method: "POST",
        body: "{}"
      });
      setLocalPreviews((value) => {
        const next = { ...value };
        delete next[id];
        return next;
      });
      notify("success", "Alteração salva e confirmada pela releitura do Excel.");
      await changes.reload();
    } catch (error) {
      notify("error", message(error));
    } finally {
      setPreparing(null);
    }
  }
  async function generateLocalImage(id: string) {
    setPreparing(id);
    try {
      const result = await api.request<any>(`/excel/local-workbooks/image/${id}`, {
        method: "POST",
        body: "{}"
      });
      notify("success", `Imagem gerada: ${result.image?.path ?? "arquivo temporário"}`);
    } catch (error) {
      notify("error", message(error));
    } finally {
      setPreparing(null);
    }
  }
  return (
    <section className="pending-mobile-page">
      <div className="page-heading compact-heading">
        <div>
          <span className="eyebrow">Aprovação humana obrigatória</span>
          <h1>Pendências</h1>
        </div>
        <SemanticStatusBadge status="PENDENTE">
          {changes.data.length} registradas
        </SemanticStatusBadge>
      </div>
      <div className="safety-notice pilot-banner">
        <ShieldCheck size={20} />
        <div>
          <strong>OPERAÇÃO EXCEL ATIVA</strong>
          <span>
            Mensagens reais do grupo monitorado geram pendências; a aprovação atualiza a planilha e
            confirma por releitura.
          </span>
        </div>
      </div>
      {changes.data.length === 0 ? (
        <EmptyState
          title="Nenhuma pendência aberta."
          action="Atualizar"
          onAction={changes.reload}
        />
      ) : (
        <div className="pending-decision-list">
          {changes.data.map((item) => {
            return (
              <article className="pending-decision-card" key={item.id}>
                <div className="pending-mainline">
                  <strong>{item.equipment}</strong>
                  <SemanticStatusBadge status={item.status}>{item.status}</SemanticStatusBadge>
                  <span>
                    <RelativeTime value={item.receivedAt} />
                  </span>
                </div>
                <div className="pending-route">
                  <span>{item.currentStatus}</span>
                  <strong>→</strong>
                  <span className="proposed">{item.newStatus}</span>
                </div>
                <p>{item.description}</p>
                <div className="pending-facts">
                  <span>{item.operation}</span>
                  <span>Confiança {(item.confidence * 100).toFixed(0)}%</span>
                  <span>{item.sender}</span>
                </div>
                <div className="pilot-entry">
                  <span className="badge badge-success">EXCEL REAL</span>
                  <button disabled={preparing === item.id} onClick={() => prepareLocal(item.id)}>
                    Conferir dados
                  </button>
                  <button
                    className="primary"
                    disabled={preparing === item.id}
                    onClick={() => applyLocal(item.id)}
                  >
                    <ShieldCheck size={18} />
                    {preparing === item.id ? "Atualizando Excel..." : "APROVAR ALTERAÇÃO"}
                  </button>
                </div>
                {localPreviews[item.id] && (
                  <section className="technical local-preview">
                    <strong>CONFERÊNCIA DA ALTERAÇÃO</strong>
                    <dl>
                      <dt>Arquivo</dt>
                      <dd>{localPreviews[item.id].workbook?.name}</dd>
                      <dt>Aba / linha</dt>
                      <dd>
                        {localPreviews[item.id].worksheet} / {localPreviews[item.id].row}
                      </dd>
                      <dt>Células</dt>
                      <dd>{Object.values(localPreviews[item.id].cells ?? {}).join(", ")}</dd>
                      <dt>Status atual</dt>
                      <dd>
                        {localPreviews[item.id].current?.statusCell?.value ?? "(vazio)"} →{" "}
                        {localPreviews[item.id].proposed?.status}
                      </dd>
                      <dt>Descrição</dt>
                      <dd>{localPreviews[item.id].proposed?.description}</dd>
                      <dt>Início</dt>
                      <dd>
                        {localPreviews[item.id].proposed?.startDate || "(vazio)"}{" "}
                        {localPreviews[item.id].proposed?.startTime || ""}
                      </dd>
                      <dt>Previsão</dt>
                      <dd>
                        {localPreviews[item.id].proposed?.forecastDate || "(vazio)"}{" "}
                        {localPreviews[item.id].proposed?.forecastTime || ""}
                      </dd>
                      <dt>Backup planejado</dt>
                      <dd>
                        {localPreviews[item.id].backup?.path ??
                          localPreviews[item.id].backup?.folder ??
                          "Gerado automaticamente ao aprovar"}
                      </dd>
                      <dt>Hash atual</dt>
                      <dd className="hash-value">
                        {localPreviews[item.id].hash ?? "Planilha ausente ou não lida"}
                      </dd>
                    </dl>
                    <p className="muted">
                      A aprovação cria o backup, grava somente as células mapeadas e relê os
                      valores.
                    </p>
                    <div className="actions">
                      <button
                        className="primary"
                        disabled={preparing === item.id}
                        onClick={() => applyLocal(item.id)}
                      >
                        APROVAR ALTERAÇÃO
                      </button>
                      {localPreviews[item.id].confirmed && (
                        <button onClick={() => generateLocalImage(item.id)}>
                          GERAR IMAGEM DA PLANILHA
                        </button>
                      )}
                    </div>
                  </section>
                )}
                <details
                  className="technical-details"
                  open={expanded === item.id}
                  onToggle={(event) => setExpanded(event.currentTarget.open ? item.id : null)}
                >
                  <summary>Ver detalhes</summary>
                  <blockquote>{item.originalMessage}</blockquote>
                  <label>
                    Observação
                    <input
                      value={observations[item.id] ?? ""}
                      onChange={(event) =>
                        setObservations((value) => ({ ...value, [item.id]: event.target.value }))
                      }
                      placeholder="Opcional"
                    />
                  </label>
                  <dl>
                    <dt>Grupo</dt>
                    <dd>{item.group}</dd>
                    <dt>Recebida</dt>
                    <dd>{new Date(item.receivedAt).toLocaleString("pt-BR")}</dd>
                    <dt>Campos</dt>
                    <dd>status, datas e descrição</dd>
                  </dl>
                  <div className="secondary-actions">
                    <button onClick={() => decide(item.id, "defer")}>Atualizar leitura</button>
                    <button
                      onClick={() =>
                        location.assign(`/historico?fleet=${encodeURIComponent(item.equipment)}`)
                      }
                    >
                      Ver histórico
                    </button>
                    <button onClick={() => decide(item.id, "reject")}>Cancelar</button>
                  </div>
                </details>
                <div className="decision-actions">
                  <button onClick={() => setExpanded(expanded === item.id ? null : item.id)}>
                    <Pencil size={18} />
                    Editar
                  </button>
                  <button className="danger" onClick={() => decide(item.id, "reject")}>
                    <X size={18} />
                    Rejeitar
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "Falha inesperada.";
}
