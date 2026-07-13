import { useEffect, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, Clipboard, Eye, FileText, FlaskConical, Pencil, Play, RefreshCw, Send, XCircle } from "lucide-react";
import { useApp } from "../app/providers";
import { useLoadable } from "../hooks/useLoadable";

type Schedule = { id:string;operation:string;groupName:string;messageTemplate:string;shift:string;specificTimes:string[];intervalHours:number;startTime:string;endTime:string;activeDays:number[];enabled:boolean;requiresApproval:boolean;futureAutoSend:boolean;testGroup:boolean;catchUpWindowMinutes:number;expiredForecastAction:string };
type QueuedReport = { id:string;operation:string;groupName:string;shift:string;scheduledTime:string;generatedAt?:string;text:string;withoutForecast:any[];expired:any[];alerts:any[];imageState:string;imageMessage:string;dataSource:string;status:string;lateGeneration:boolean;missed:boolean };

export default function ReportsPage() {
  const { api, notify } = useApp();
  const schedulesLoad = useLoadable(() => api.request<{ schedules: Schedule[]; timezone: string }>("/reports/schedules"));
  const queueLoad = useLoadable(() => api.request<{ reports: QueuedReport[]; timezone: string }>("/reports/queue"));
  const forecastLoad = useLoadable(() => api.request<any>("/reports/forecast"));
  const alertsLoad = useLoadable(() => api.request<any>("/reports/alerts"));
  const closingLoad = useLoadable(() => api.request<any>("/reports/shift-closing"));
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [editingReport, setEditingReport] = useState<QueuedReport | null>(null);
  const [longReport, setLongReport] = useState("Plantio de Cana\n153I/830 = rodando\n164 = mangera estourda\n626 = não gira lado direito");
  const [parseResult, setParseResult] = useState<any>(null);

  useEffect(() => { if (!schedule && schedulesLoad.data?.schedules?.[0]) setSchedule(schedulesLoad.data.schedules[0]); }, [schedulesLoad.data, schedule]);
  useEffect(() => { if (schedule) void previewReport(schedule); }, [schedule?.id]);

  async function save(next: Schedule) { const response = await api.request<{ schedule: Schedule }>(`/reports/schedules/${next.id}`, { method: "PUT", body: JSON.stringify(next) }); setSchedule(response.schedule); notify("success", "Agenda salva."); }
  async function previewReport(input = schedule) { if (input) setPreview(await api.request("/reports/preview", { method: "POST", body: JSON.stringify(input) })); }
  async function generateNow(test = false) { if (!schedule) return; setPreview(await api.request(test ? "/reports/generate-test" : "/reports/generate-now", { method: "POST", body: JSON.stringify(schedule) })); await queueLoad.reload(); notify("success", test ? "Teste gerado sem envio." : "Relatório entrou na fila."); }
  async function tickScheduler() { await api.request("/reports/scheduler/tick", { method: "POST" }); await queueLoad.reload(); notify("success", "Agendador verificado."); }
  async function action(id: string, path: string, body?: unknown) { await api.request(`/reports/queue/${id}/${path}`, { method: path === "text" ? "PUT" : "POST", body: JSON.stringify(body ?? {}) }); setEditingReport(null); await queueLoad.reload(); notify("success", path === "approve" ? "Relatório aprovado. WhatsApp segue bloqueado." : "Fila atualizada."); }
  async function parseLongReport() { setParseResult(await api.request("/reports/parse-long-report", { method: "POST", body: JSON.stringify({ text: longReport, operation: schedule?.operation, shift: schedule?.shift }) })); }
  async function copy(text: string) { await navigator.clipboard?.writeText(text); notify("success", "Texto copiado."); }

  if (schedulesLoad.loading || queueLoad.loading || forecastLoad.loading || alertsLoad.loading || closingLoad.loading || !schedule) return <section className="panel">Carregando relatórios...</section>;
  const queued = queueLoad.data?.reports ?? [];
  const waiting = queued.filter(item => ["WAITING_APPROVAL", "READY_TO_SEND", "EXPIRED"].includes(item.status));
  const report = preview?.report ?? preview;
  const closing = closingLoad.data;

  return <section className="reports-page">
    <div className="page-title-row"><div><h1>Relatórios</h1><p>Agendador, fila, previsão e laboratório em modo homologação.</p></div><div className="title-actions"><span className="badge">{queueLoad.data?.timezone}</span><button onClick={tickScheduler}><RefreshCw size={16}/> Verificar agenda</button></div></div>

    <section className="queue-board">
      <div className="queue-head"><h2>Relatórios aguardando aprovação</h2><span>{waiting.length} na fila</span></div>
      <div className="queue-list">{waiting.length ? waiting.map(item => <article className={`queue-card status-${item.status.toLowerCase()}`} key={item.id}>
        <div><strong>{item.operation}</strong><span>{item.groupName} · Turno {item.shift} · {item.scheduledTime}{item.lateGeneration ? " · atrasado" : ""}</span></div>
        <div className="queue-meta"><span>{item.status}</span><span>Imagem: {item.imageState}</span><span>Fonte: {item.dataSource}</span></div>
        <pre>{item.text || "Relatório perdido. Use gerar novamente."}</pre>
        <div className="mini-grid"><span>Sem previsão: {item.withoutForecast.length}</span><span>Vencidas: {item.expired.length}</span><span>Alertas: {item.alerts.length}</span></div>
        <div className="actions split-actions"><button onClick={() => setEditingReport(item)}><Pencil size={16}/> Editar texto</button><button onClick={() => action(item.id, "regenerate")}><RefreshCw size={16}/> Gerar novamente</button><button className="danger" onClick={() => action(item.id, "reject")}><XCircle size={16}/> Rejeitar</button><button className="primary" onClick={() => action(item.id, "approve")}><CheckCircle2 size={16}/> Aprovar</button></div>
      </article>) : <div className="empty-state">Nenhum relatório aguardando aprovação.</div>}</div>
    </section>

    <section className="report-grid">
      <div className="panel feature-card">
        <div className="row"><h2><CalendarClock size={18}/> Agenda e modelo</h2><button onClick={() => save({ ...schedule, enabled: !schedule.enabled })}>{schedule.enabled ? "Desativar" : "Ativar"}</button></div>
        <div className="form-grid">
          <label>Operação<input value={schedule.operation} onChange={e => setSchedule({ ...schedule, operation: e.target.value })}/></label>
          <label>Grupo<input value={schedule.groupName} onChange={e => setSchedule({ ...schedule, groupName: e.target.value })}/></label>
          <label>Turno<input value={schedule.shift} onChange={e => setSchedule({ ...schedule, shift: e.target.value })}/></label>
          <label>Horários<input value={schedule.specificTimes.join(", ")} onChange={e => setSchedule({ ...schedule, specificTimes: e.target.value.split(",").map(x => x.trim()).filter(Boolean) })}/></label>
          <label>Início<input value={schedule.startTime} onChange={e => setSchedule({ ...schedule, startTime: e.target.value })}/></label>
          <label>Final<input value={schedule.endTime} onChange={e => setSchedule({ ...schedule, endTime: e.target.value })}/></label>
          <label>Catch-up min<input type="number" value={schedule.catchUpWindowMinutes} onChange={e => setSchedule({ ...schedule, catchUpWindowMinutes: Number(e.target.value) })}/></label>
        </div>
        <label>Modelo da mensagem<textarea value={schedule.messageTemplate} onChange={e => setSchedule({ ...schedule, messageTemplate: e.target.value })}/></label>
        <div className="actions"><button onClick={() => save(schedule)}>Salvar</button><button onClick={() => previewReport()}><Eye size={16}/> Prévia</button><button onClick={() => generateNow(true)}><Play size={16}/> Teste</button><button className="primary" onClick={() => generateNow(false)}><Send size={16}/> Gerar agora</button></div>
      </div>
      <div className="panel feature-card"><h2><FileText size={18}/> Prévia limpa</h2><pre className="report-preview">{report?.text ?? "Sem prévia."}</pre><div className="facts"><span>Sem resumo operacional</span><span>WhatsApp bloqueado</span><span>Imagem mock no Linux</span></div></div>
    </section>

    <section className="report-grid">
      <div className="panel feature-card"><h2><AlertTriangle size={18}/> Previsões</h2><div className="stack-list">{(forecastLoad.data?.withoutForecast ?? []).map((item: any) => <div className="alert-row" key={item.fleet}><strong>{item.fleet}</strong><span>{item.description}</span></div>)}</div><h3>Vencidas</h3><div className="stack-list">{(forecastLoad.data?.expired ?? []).map((item: any) => <div className="alert-row danger" key={item.fleet}><strong>{item.fleet}</strong><span>{item.forecastAt}</span></div>)}</div></div>
      <div className="panel feature-card"><h2>Alertas</h2><div className="stack-list">{(alertsLoad.data?.alerts ?? []).map((alert: any, index: number) => <div className={`alert-row ${alert.severity}`} key={index}><strong>{alert.code}</strong><span>{alert.message}</span></div>)}</div></div>
    </section>

    <section className="panel lab-card"><h2><FlaskConical size={18}/> Laboratório do Parser</h2><textarea value={longReport} onChange={e => setLongReport(e.target.value)}/><div className="actions"><button onClick={parseLongReport}>Interpretar sem aplicar</button><button onClick={() => copy(JSON.stringify({ name: "fixture-anonimizada", input: longReport, expected: parseResult ? { sections: parseResult.sections.map((s:any) => s.operation), items: parseResult.items.map((i:any) => ({ fleet: i.mainEquipment, status: i.proposedStatus })), alerts: parseResult.alerts.map((a:any) => a.code) } : { sections: [], items: [], alerts: [] } }, null, 2))}>Exportar fixture</button></div>{parseResult && <div className="lab-results"><div><strong>Cabeçalho</strong><span>Turno {parseResult.header.shift ?? "-"}</span><span>Setor {parseResult.header.sector ?? "-"}</span></div><div><strong>Resultado</strong><span>Linhas {parseResult.items.length}</span><span>Candidatas {parseResult.pendingCandidates.length}</span><span>Alertas {parseResult.alerts.length + parseResult.comparison.alerts.length}</span></div></div>}</section>

    <section className="panel report-editor"><h2>Fechamento do Turno</h2><pre className="report-preview">{closing?.text}</pre><div className="actions"><button onClick={() => copy(closing?.text ?? "")}><Clipboard size={16}/> Copiar texto</button><button>Visualizar</button><button>Marcar transferência para oficial</button></div></section>

    {editingReport && <div className="modal-backdrop"><div className="modal-card"><h2>Editar relatório</h2><textarea value={editingReport.text} onChange={e => setEditingReport({ ...editingReport, text: e.target.value })}/><div className="actions"><button onClick={() => setEditingReport(null)}>Cancelar</button><button className="primary" onClick={() => action(editingReport.id, "text", { text: editingReport.text })}>Salvar texto</button></div></div></div>}
  </section>;
}
