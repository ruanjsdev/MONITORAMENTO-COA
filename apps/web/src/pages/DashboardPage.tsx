import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { useApp } from "../app/providers";
import { useLoadable } from "../hooks/useLoadable";
import { OperationalSnapshot } from "../types";
import { Timeline } from "../components/operational/Timeline";
import { MetricCard } from "../components/common/MetricCard";
import { StatusBadge } from "../components/common/StatusBadge";

export default function DashboardPage() {
  const { api } = useApp();
  const { data, error, loading, reload } = useLoadable(() => api.request<OperationalSnapshot>("/operational/snapshot"));
  const [windowMinutes, setWindowMinutes] = useState(60);
  if (loading) return <section className="panel loading-panel">Carregando Meu Turno...</section>;
  if (error || !data) return <section className="panel error-box"><p>{error}</p><button onClick={reload}>Tentar novamente</button></section>;
  const recent = data.messages.filter(item => Date.now() - new Date(item.receivedAt).getTime() <= windowMinutes * 60_000);
  const stopped = data.fleets.filter(x => x.status === "PARADO").length;
  const running = data.fleets.filter(x => x.status === "RODANDO").length;
  const available = data.fleets.filter(x => x.status === "DISPONIVEL").length;
  const maintenance = data.fleets.filter(x => x.status.includes("MANUT")).length;
  return <section>
    <div className="page-heading hero-monitor">
      <div>
        <span className="eyebrow">Operação noturna · Turno {data.shift}</span>
        <h1>Meu Turno</h1>
        <p className="muted">Monitoramento em tempo real simulado, com aprovações humanas preservadas.</p>
      </div>
      <button onClick={reload}><RefreshCw size={18}/>Atualizar</button>
    </div>
    <div className="metric-grid shift-summary">
      <MetricCard label="Rodando" value={running} detail={`${data.fleets.length} equipamentos na projeção`} tone="success" />
      <MetricCard label="Parados" value={stopped} detail="requerem atenção operacional" tone={stopped ? "danger" : "neutral"} />
      <MetricCard label="Disponíveis" value={available} tone="info" />
      <MetricCard label="Manutenção" value={maintenance || "Sem dados"} tone="warning" />
      <MetricCard label="Pendências" value={data.pendencies.filter(x => x.status === "open").length} detail="aguardando revisão" tone="warning" />
      <MetricCard label="Próximo relatório" value={data.nextReport} detail={data.shiftReportStatus} tone="info" />
    </div>
    <div className="operations-center">
      <section className="panel zone-current"><div className="section-title"><h2>Situação operacional</h2><StatusBadge status="online">projeção ativa</StatusBadge></div><div className="operation-grid">{operationNames.map(name=>{const item=data.operationSummary.find(x=>x.operation===name);return <article className="operation-card" key={name}><div className="row"><strong>{name}</strong><StatusBadge status={item&&item.stopped>0?"atenção":"online"}>{item&&item.stopped>0?"atenção":"normal"}</StatusBadge></div><p>{item?`${item.machines} equipamentos · ${item.stopped} parados`:"Sem dados"}</p><small>Principal ocorrência: {item&&item.stopped>0?"equipamento parado em acompanhamento":"Sem dados"}</small><time>{item?new Date(item.updatedAt).toLocaleTimeString("pt-BR"):"Sem dados"}</time></article>})}</div></section>
      <section className="panel zone-attention"><div className="section-title"><h2>Pendências prioritárias</h2><span className="badge badge-warning">{data.pendencies.filter(x=>x.status==="open").length} abertas</span></div>{data.pendencies.filter(x=>x.status==="open").slice(0,5).map(item=><article className="priority-item" key={item.id}><div><strong>{item.subject}</strong><p>{item.operation} · {item.reason}</p><small>{new Date(item.since).toLocaleString("pt-BR")}</small></div><button onClick={()=>location.assign("/pendencias")}>Revisar</button></article>)}{!data.pendencies.some(x=>x.status==="open")&&<p className="muted">Sem pendências abertas.</p>}</section>
      <section className="panel zone-activity"><div className="section-title"><h2>O que mudou enquanto eu estava fora</h2><select aria-label="Período" value={windowMinutes} onChange={e=>setWindowMinutes(Number(e.target.value))}><option value="15">15 minutos</option><option value="30">30 minutos</option><option value="60">Última hora</option><option value="480">Turno completo</option></select></div><Timeline events={data.timeline.filter(event=>Date.now()-new Date(event.timestamp).getTime()<=windowMinutes*60_000)}/></section>
      <section className="panel zone-next"><h2>Últimos relatórios recebidos</h2>{recent.map(item => <p key={item.id}><MessageState status={item.status}/> {item.text}</p>)}{!recent.length && <p className="muted">Nada novo neste período.</p>}</section>
    </div>
  </section>;
}

const operationNames = ["Plantio Mecanizado", "Colheita de Muda", "Preparo de Solo", "Cultivo", "Correção de Solo", "Compostagem", "CPD", "Irrigação"];
export function MessageState({status}:{status:string}) { const labels:Record<string,string>={READ:"Lida",PENDING_APPROVAL:"Aguardando aprovação",PROCESSED:"Processada",REJECTED:"Rejeitada",FAILED:"Falhou"}; return <StatusBadge status={status}>{labels[status] ?? status}</StatusBadge>; }
