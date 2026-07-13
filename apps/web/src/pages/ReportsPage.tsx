import { useEffect, useState } from "react";
import { AlertTriangle, CalendarClock, Clipboard, Eye, FileText, Play, Send, ToggleLeft, ToggleRight } from "lucide-react";
import { useApp } from "../app/providers";
import { useLoadable } from "../hooks/useLoadable";

type Schedule = {
  id: string; operation: string; groupName: string; messageTemplate: string; shift: string; specificTimes: string[];
  intervalHours: number; startTime: string; endTime: string; activeDays: number[]; enabled: boolean; requiresApproval: boolean; futureAutoSend: boolean; testGroup: boolean;
};

export default function ReportsPage() {
  const { api, notify } = useApp();
  const schedulesLoad = useLoadable(() => api.request<{ schedules: Schedule[] }>("/reports/schedules"));
  const forecastLoad = useLoadable(() => api.request<any>("/reports/forecast"));
  const alertsLoad = useLoadable(() => api.request<any>("/reports/alerts"));
  const closingLoad = useLoadable(() => api.request<any>("/reports/shift-closing"));
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [longReport, setLongReport] = useState("Plantio de Cana\n153I/830 = rodando\n164 = mangera estourda\n626 = não gira lado direito");
  const [parseResult, setParseResult] = useState<any>(null);

  useEffect(() => { if (!schedule && schedulesLoad.data?.schedules?.[0]) setSchedule(schedulesLoad.data.schedules[0]); }, [schedulesLoad.data, schedule]);
  useEffect(() => { if (schedule) void generatePreview(schedule); }, [schedule?.id]);

  async function save(next: Schedule) {
    const response = await api.request<{ schedule: Schedule }>(`/reports/schedules/${next.id}`, { method: "PUT", body: JSON.stringify(next) });
    setSchedule(response.schedule);
    notify("success", "Agenda atualizada sem envio externo.");
  }
  async function generatePreview(input = schedule) {
    if (!input) return;
    setPreview(await api.request("/reports/preview", { method: "POST", body: JSON.stringify(input) }));
  }
  async function generateNow(test = false) {
    if (!schedule) return;
    const result = await api.request(test ? "/reports/generate-test" : "/reports/generate-now", { method: "POST", body: JSON.stringify(schedule) });
    setPreview(result);
    notify("success", test ? "Relatório de teste gerado." : "Relatório gerado sem envio ao WhatsApp.");
  }
  async function parseLongReport() {
    setParseResult(await api.request("/reports/parse-long-report", { method: "POST", body: JSON.stringify({ text: longReport, operation: schedule?.operation, shift: schedule?.shift }) }));
  }
  async function copy(text: string) {
    await navigator.clipboard?.writeText(text);
    notify("success", "Texto copiado.");
  }

  if (schedulesLoad.loading || forecastLoad.loading || alertsLoad.loading || closingLoad.loading || !schedule) return <section className="panel">Carregando relatórios...</section>;
  const report = preview?.report ?? preview;
  const closing = closingLoad.data;

  return <section className="reports-page">
    <div className="page-title-row">
      <div>
        <h1>Relatórios</h1>
        <p>Agenda, previsões, parser e fechamento operando em modo seguro.</p>
      </div>
      <span className="badge">WhatsApp bloqueado</span>
    </div>

    <section className="report-grid">
      <div className="panel">
        <div className="row"><h2><CalendarClock size={18}/> Agenda de relatórios</h2><button onClick={() => save({ ...schedule, enabled: !schedule.enabled })}>{schedule.enabled ? <ToggleRight size={18}/> : <ToggleLeft size={18}/>} {schedule.enabled ? "Ativa" : "Inativa"}</button></div>
        <div className="form-grid">
          <label>Operação<input value={schedule.operation} onChange={e => setSchedule({ ...schedule, operation: e.target.value })}/></label>
          <label>Grupo<input value={schedule.groupName} onChange={e => setSchedule({ ...schedule, groupName: e.target.value })}/></label>
          <label>Turno<input value={schedule.shift} onChange={e => setSchedule({ ...schedule, shift: e.target.value })}/></label>
          <label>Horários<input value={schedule.specificTimes.join(", ")} onChange={e => setSchedule({ ...schedule, specificTimes: e.target.value.split(",").map(x => x.trim()).filter(Boolean) })}/></label>
          <label>Início<input value={schedule.startTime} onChange={e => setSchedule({ ...schedule, startTime: e.target.value })}/></label>
          <label>Final<input value={schedule.endTime} onChange={e => setSchedule({ ...schedule, endTime: e.target.value })}/></label>
        </div>
        <label>Modelo da mensagem<textarea value={schedule.messageTemplate} onChange={e => setSchedule({ ...schedule, messageTemplate: e.target.value })}/></label>
        <div className="actions"><button onClick={() => save(schedule)}>Salvar agenda</button><button onClick={() => generatePreview()}><Eye size={16}/> Visualizar prévia</button><button onClick={() => generateNow(true)}><Play size={16}/> Gerar teste</button><button className="primary" onClick={() => generateNow(false)}><Send size={16}/> Gerar agora</button></div>
      </div>

      <div className="panel">
        <h2><FileText size={18}/> Prévia do relatório horário</h2>
        <pre className="report-preview">{report?.text ?? "Sem prévia gerada."}</pre>
        <div className="facts"><span>Resumo operacional: não incluído</span><span>Envio: bloqueado</span><span>Imagem: simulada no Linux</span></div>
      </div>
    </section>

    <section className="report-grid">
      <div className="panel">
        <h2><AlertTriangle size={18}/> Frotas sem previsão</h2>
        <div className="stack-list">{(forecastLoad.data?.withoutForecast ?? []).map((item: any) => <div className="alert-row" key={item.fleet}><strong>{item.fleet}</strong><span>{item.description}</span></div>)}</div>
        <h3>Previsões vencidas</h3>
        <div className="stack-list">{(forecastLoad.data?.expired ?? []).map((item: any) => <div className="alert-row danger" key={item.fleet}><strong>{item.fleet}</strong><span>{item.forecastAt}</span></div>)}</div>
      </div>
      <div className="panel">
        <h2>Alertas do parser</h2>
        <div className="stack-list">{(alertsLoad.data?.alerts ?? []).map((alert: any, index: number) => <div className={`alert-row ${alert.severity}`} key={index}><strong>{alert.code}</strong><span>{alert.message}</span></div>)}</div>
      </div>
    </section>

    <section className="panel">
      <h2>Parser de relatório longo</h2>
      <textarea value={longReport} onChange={e => setLongReport(e.target.value)}/>
      <div className="actions"><button onClick={parseLongReport}>Interpretar relatório</button></div>
      {parseResult && <div className="parse-results"><div><strong>Itens:</strong> {parseResult.items.length}</div><div><strong>Pendências candidatas:</strong> {parseResult.pendingCandidates.length}</div><div><strong>Alertas:</strong> {parseResult.alerts.length + parseResult.comparison.alerts.length}</div></div>}
    </section>

    <section className="panel report-editor">
      <h2>Fechamento do Turno</h2>
      <pre className="report-preview">{closing?.text}</pre>
      <div className="actions"><button onClick={() => copy(closing?.text ?? "")}><Clipboard size={16}/> Copiar texto</button><button onClick={() => notify("success", "Prévia aberta em modo local.")}>Visualizar</button><button onClick={() => notify("success", "Marcado para transferência manual futura.")}>Marcar transferência para oficial</button></div>
    </section>
  </section>;
}
