import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useApp } from "../app/providers";
import { useLoadable } from "../hooks/useLoadable";
import { OperationalSnapshot } from "../types";
import { Timeline } from "../components/operational/Timeline";

export default function DashboardPage() {
  const { api } = useApp();
  const { data, error, loading, reload } = useLoadable(() => api.request<OperationalSnapshot>("/operational/snapshot"));
  const [windowMinutes, setWindowMinutes] = useState(30);
  if (loading) return <section className="panel">Carregando Meu Turno...</section>;
  if (error || !data) return <section className="panel error-box"><p>{error}</p><button onClick={reload}>Tentar novamente</button></section>;
  const recent = data.messages.filter(item => Date.now() - new Date(item.receivedAt).getTime() <= windowMinutes * 60_000);
  return <section>
    <div className="header"><div><h1>Meu Turno</h1><p className="muted">Turno {data.shift} · ambiente de demonstração</p></div><button onClick={reload}><RefreshCw size={18}/>Atualizar</button></div>
    <div className="grid shift-summary">
      <Metric label="Aguardando aprovação" value={String(data.messages.filter(x => x.status === "PENDING_APPROVAL").length)} />
      <Metric label="Mensagens novas" value={String(data.messages.length)} />
      <Metric label="Máquinas paradas" value={String(data.fleets.filter(x => x.status === "PARADO").length)} />
      <Metric label="Pendências" value={String(data.pendencies.filter(x => x.status === "open").length)} />
      <Metric label="Próximo envio" value={data.nextReport} />
      <Metric label="Troca de turno" value={data.shiftReportStatus} />
    </div>
    <div className="operations-center">
      <section className="panel zone-current"><h2>🟢 Situação atual</h2>{data.operationSummary.map(item=><article className="operation-row" key={item.operation}><strong>{item.operation}</strong><span>{item.machines} máquinas · {item.stopped} paradas</span><small>{new Date(item.updatedAt).toLocaleTimeString("pt-BR")}</small></article>)}</section>
      <section className="panel zone-attention"><h2>🟠 Atenção</h2>{data.pendencies.filter(x=>x.status==="open").map(item=><p key={item.id}><strong>{item.subject}</strong> · {item.reason}</p>)}</section>
      <section className="panel zone-activity"><div className="header"><h2>🔵 Atividade</h2><select aria-label="Período" value={windowMinutes} onChange={e=>setWindowMinutes(Number(e.target.value))}><option value="15">15 minutos</option><option value="30">30 minutos</option><option value="60">Última hora</option></select></div><Timeline events={data.timeline.filter(event=>Date.now()-new Date(event.timestamp).getTime()<=windowMinutes*60_000)}/></section>
      <section className="panel zone-next"><h2>🟣 Próximas ações</h2><p><strong>Próximo relatório:</strong> {data.nextReport}</p><p><strong>Troca de turno:</strong> {data.shiftReportStatus}</p><p><strong>Aprovações:</strong> {data.messages.filter(x=>x.status==="PENDING_APPROVAL").length}</p></section>
    </div>
    <section className="panel"><div className="header"><h2>O que mudou enquanto eu estava fora</h2></div>{recent.map(item => <p key={item.id}><MessageState status={item.status}/> {item.text}</p>)}{!recent.length && <p className="muted">Nada novo neste período.</p>}</section>
    <section className="panel"><h2>Status resumido do sistema</h2><div className="status-grid">{data.systems.map(item => <div key={item.id} className="status-item"><strong>{item.name}</strong><span className={`badge state-${item.state}`}>{item.state}</span><small>{item.message}</small></div>)}</div></section>
  </section>;
}

function Metric({label,value}:{label:string;value:string}) { return <div className="panel metric"><span>{label}</span><strong>{value}</strong></div>; }
export function MessageState({status}:{status:string}) { const labels:Record<string,string>={READ:"🟡 Lida",PENDING_APPROVAL:"🟠 Aguardando aprovação",PROCESSED:"🟢 Processada",REJECTED:"🔴 Rejeitada",FAILED:"⚠️ Falhou"}; return <span className="badge">{labels[status] ?? status}</span>; }
