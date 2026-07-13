import { Check, Pencil, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import { useApp } from "../app/providers";
import { EmptyState } from "../components/common/EmptyState";
import { RelativeTime } from "../components/common/RelativeTime";
import { SemanticStatusBadge } from "../components/common/SemanticStatusBadge";
import { OfficialPilotPanel } from "../components/official-pilot/OfficialPilotPanel";
import { useLoadable } from "../hooks/useLoadable";
import { OfficialPilotStatus, OfficialPilotWrite, PendingChange } from "../types";

export default function PendingChangesPage() {
  const { api, notify } = useApp();
  const changes = useLoadable(() => api.request<PendingChange[]>("/pending-changes"));
  const pilot = useLoadable(() => api.request<OfficialPilotStatus>("/official-pilot/status"));
  const [observations, setObservations] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [preparing, setPreparing] = useState<string | null>(null);
  const [localPreviews, setLocalPreviews] = useState<Record<string, any>>({});
  const [localConfirmations, setLocalConfirmations] = useState<Record<string, string>>({});
  if (changes.loading) return <section className="panel loading-panel">Carregando pendências...</section>;
  if (changes.error || !changes.data) return <section className="panel error-box"><p>{changes.error}</p><button onClick={changes.reload}>Tentar novamente</button></section>;

  async function decide(id: string, decision: string) {
    try {
      const result = await api.request<{externalActions:{reason:string}}>(`/pending-changes/${id}/decision`, { method: "POST", body: JSON.stringify({ decision, description: observations[id] ?? "" }) });
      notify("success", result.externalActions.reason);
      await changes.reload();
    } catch (error) { notify("error", message(error)); }
  }
  async function prepare(id: string) {
    setPreparing(id);
    try { await api.request<OfficialPilotWrite>(`/official-pilot/pending/${id}/prepare`, { method: "POST", body: "{}" }); notify("success", "Backup validado e prévia oficial pronta; confirmed=false."); }
    catch (error) { notify("error", message(error)); }
    finally { setPreparing(null); await pilot.reload(); }
  }
  async function prepareLocal(id: string) {
    setPreparing(id);
    try { const preview = await api.request<any>(`/excel/local-workbooks/preview/${id}`, { method: "POST", body: "{}" }); setLocalPreviews(value => ({ ...value, [id]: preview })); notify("success", "Prévia local .dev pronta; nenhuma célula foi escrita."); }
    catch (error) { notify("error", message(error)); }
    finally { setPreparing(null); }
  }
  async function applyLocal(id: string) {
    setPreparing(id);
    try { const result = await api.request<any>(`/excel/local-workbooks/apply/${id}`, { method: "POST", body: JSON.stringify({ confirmation: localConfirmations[id] ?? "" }) }); setLocalPreviews(value => ({ ...value, [id]: result })); notify("success", "Alteração local .dev salva, relida e registrada."); }
    catch (error) { notify("error", message(error)); }
    finally { setPreparing(null); }
  }
  async function generateLocalImage(id: string) {
    setPreparing(id);
    try { const result = await api.request<any>(`/excel/local-workbooks/image/${id}`, { method: "POST", body: "{}" }); notify("success", `Imagem gerada: ${result.image?.path ?? "arquivo temporário"}`); }
    catch (error) { notify("error", message(error)); }
    finally { setPreparing(null); }
  }
  async function confirmWrite(writeId: string, confirmation: string) {
    try { await api.request(`/official-pilot/writes/${writeId}/confirm`, { method: "POST", body: JSON.stringify({ confirmation }) }); notify("success", "Escrita salva e relida com sucesso."); await Promise.all([pilot.reload(), changes.reload()]); }
    catch (error) { notify("error", message(error)); await pilot.reload(); }
  }
  async function rollback(writeId: string, confirmation: string) {
    try { await api.request(`/official-pilot/writes/${writeId}/rollback`, { method: "POST", body: JSON.stringify({ confirmation }) }); notify("success", "Backup restaurado e hash confirmado."); await pilot.reload(); }
    catch (error) { notify("error", message(error)); await pilot.reload(); }
  }

  return (
    <section className="pending-mobile-page">
      <div className="page-heading compact-heading"><div><span className="eyebrow">Aprovação humana obrigatória</span><h1>Pendências</h1></div><SemanticStatusBadge status="PENDENTE">{changes.data.length} registradas</SemanticStatusBadge></div>
      <div className="safety-notice pilot-banner"><ShieldCheck size={20}/><div><strong>{pilot.data?.mode === "LIVE_APPROVAL_PILOT" ? "LIVE_APPROVAL_PILOT" : "SHADOW — escrita bloqueada"}</strong><span>Whitelist: grupo {pilot.data?.whitelist.groupName ?? "carregando"}, operação Plantio Mecanizado, frota 1531/830, células H/K/L/M/N/S.</span></div></div>
      {changes.data.length === 0 ? <EmptyState title="Nenhuma pendência aberta." action="Atualizar" onAction={changes.reload} /> : <div className="pending-decision-list">
        {changes.data.map(item => {
          const eligible = item.equipment === pilot.data?.whitelist.fleetIds[0] && item.operation === pilot.data?.whitelist.operation && item.group.trim() === pilot.data?.whitelist.groupName;
          const write = pilot.data?.latest?.pendingChangeId === item.id ? pilot.data.latest : null;
          return <article className="pending-decision-card" key={item.id}>
            <div className="pending-mainline"><strong>{item.equipment}{eligible ? `/${pilot.data?.whitelist.expectedImplement}` : ""}</strong><SemanticStatusBadge status={item.status}>{item.status}</SemanticStatusBadge><span><RelativeTime value={item.receivedAt}/></span></div>
            <div className="pending-route"><span>{item.currentStatus}</span><strong>→</strong><span className="proposed">{item.newStatus}</span></div>
            <p>{item.description}</p><div className="pending-facts"><span>{item.operation}</span><span>Confiança {(item.confidence * 100).toFixed(0)}%</span><span>{item.sender}</span></div>
            {eligible ? <div className="pilot-entry">{pilot.data?.mode === "LOCAL_OPERATIONAL" ? <><span className="badge badge-warning">ALTERAÇÃO LOCAL · .DEV</span><button className="primary" disabled={preparing === item.id} onClick={() => prepareLocal(item.id)}><ShieldCheck size={18}/>{preparing === item.id ? "Lendo planilha .dev..." : "PREPARAR PRÉVIA LOCAL"}</button></> : <><span className="badge badge-warning">PILOTO OFICIAL · WHITELIST</span>{(!write || write.status === "FAILED") && <button className="primary" disabled={preparing === item.id} onClick={() => prepare(item.id)}><ShieldCheck size={18}/>{preparing === item.id ? "Validando arquivo e backup..." : write ? "TENTAR PREPARAÇÃO NOVAMENTE" : "PREPARAR PRÉVIA OFICIAL"}</button>}</>}</div> : <p className="blocked-reason">Escrita oficial bloqueada: esta pendência está fora da única frota autorizada no piloto.</p>}
            {localPreviews[item.id] && <section className="technical local-preview"><strong>PRÉVIA DA ALTERAÇÃO LOCAL</strong><dl><dt>Arquivo</dt><dd>{localPreviews[item.id].workbook?.name}</dd><dt>Aba / linha</dt><dd>{localPreviews[item.id].worksheet} / {localPreviews[item.id].row}</dd><dt>Células</dt><dd>{Object.values(localPreviews[item.id].cells ?? {}).join(", ")}</dd><dt>Status atual</dt><dd>{localPreviews[item.id].current?.statusCell?.value ?? "(vazio)"} → {localPreviews[item.id].proposed?.status}</dd><dt>Descrição</dt><dd>{localPreviews[item.id].proposed?.description}</dd><dt>Início</dt><dd>{localPreviews[item.id].proposed?.startDate || "(vazio)"} {localPreviews[item.id].proposed?.startTime || ""}</dd><dt>Previsão</dt><dd>{localPreviews[item.id].proposed?.forecastDate || "(vazio)"} {localPreviews[item.id].proposed?.forecastTime || ""}</dd><dt>Backup planejado</dt><dd>{localPreviews[item.id].backup?.path ?? localPreviews[item.id].backup?.folder ?? "Aguardando confirmação"}</dd><dt>Hash atual</dt><dd className="hash-value">{localPreviews[item.id].hash ?? "Planilha ausente ou não lida"}</dd></dl><p className="blocked-reason">confirmed=false · nenhuma célula foi escrita. A confirmação local exigida é: <strong>CONFIRMO ALTERAÇÃO NA PLANILHA LOCAL</strong>.</p><label>Confirmação local<input value={localConfirmations[item.id] ?? ""} onChange={event => setLocalConfirmations(value => ({ ...value, [item.id]: event.target.value }))} placeholder="CONFIRMO ALTERAÇÃO NA PLANILHA LOCAL" /></label><div className="actions"><button className="danger" disabled={preparing === item.id || localConfirmations[item.id] !== "CONFIRMO ALTERAÇÃO NA PLANILHA LOCAL"} onClick={() => applyLocal(item.id)}>CONFIRMAR ESCRITA LOCAL</button>{localPreviews[item.id].confirmed && <button onClick={() => generateLocalImage(item.id)}>GERAR IMAGEM DA PLANILHA</button>}</div></section>}
            {write && <OfficialPilotPanel write={write} mode={pilot.data?.mode ?? "SHADOW"} onConfirm={confirmation => confirmWrite(write.id, confirmation)} onRollback={confirmation => rollback(write.id, confirmation)}/>}
            <details className="technical-details" open={expanded === item.id} onToggle={event => setExpanded(event.currentTarget.open ? item.id : null)}><summary>Ver detalhes</summary><blockquote>{item.originalMessage}</blockquote><label>Observação<input value={observations[item.id] ?? ""} onChange={event => setObservations(value => ({ ...value, [item.id]: event.target.value }))} placeholder="Opcional"/></label><dl><dt>Grupo</dt><dd>{item.group}</dd><dt>Recebida</dt><dd>{new Date(item.receivedAt).toLocaleString("pt-BR")}</dd><dt>Campos</dt><dd>status, datas e descrição</dd></dl><div className="secondary-actions"><button onClick={() => decide(item.id, "defer")}>Atualizar leitura</button><button onClick={() => location.assign(`/historico?fleet=${encodeURIComponent(item.equipment)}`)}>Ver histórico</button><button onClick={() => decide(item.id, "reject")}>Cancelar</button></div></details>
            {!eligible && <div className="decision-actions"><button className="primary" onClick={() => decide(item.id, "approve")}><Check size={18}/>Registrar aprovação</button><button onClick={() => setExpanded(expanded === item.id ? null : item.id)}><Pencil size={18}/>Editar</button><button className="danger" onClick={() => decide(item.id, "reject")}><X size={18}/>Rejeitar</button></div>}
          </article>;
        })}
      </div>}
    </section>
  );
}

function message(error: unknown) { return error instanceof Error ? error.message : "Falha inesperada."; }
