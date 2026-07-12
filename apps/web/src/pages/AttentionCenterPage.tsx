import { useState } from "react";
import { useApp } from "../app/providers";
import { useLoadable } from "../hooks/useLoadable";
import { OperationalSnapshot } from "../types";
import { EquipmentCard } from "../components/operational/EquipmentCard";
import { FilterBar } from "../components/common/FilterBar";
import { StatusBadge } from "../components/common/StatusBadge";

export default function AttentionCenterPage() {
  const {api,notify}=useApp(); const {data,error,loading,reload}=useLoadable(()=>api.request<OperationalSnapshot>("/operational/snapshot")); const [filter,setFilter]=useState("all"); const [view,setView]=useState("cards");
  if(loading)return <section className="panel loading-panel">Carregando central...</section>; if(error||!data)return <section className="panel error-box">{error}</section>;
  const items=data.pendencies.filter(x=>filter==="all"&&x.status==="open"||filter==="urgent"&&x.priority==="urgent"||filter==="resolved"&&x.status==="resolved");
  async function action(id:string,value:string){await api.request(`/operational/pendencies/${id}/action`,{method:"POST",body:JSON.stringify({action:value})});notify("success",`SIMULADO: ação ${value} registrada.`);reload();}
  return <section><div className="page-heading"><div><span className="eyebrow">Sala de monitoramento</span><h1>Central de Operações</h1><p className="muted">Equipamentos, atenção operacional e pendências do turno.</p></div><div className="segmented-control">{["cards","tabela","compacta"].map(v=><button className={view===v?"active-filter":""} onClick={()=>setView(v)} key={v}>{v}</button>)}</div></div><FilterBar value={filter} onChange={setFilter} options={[{value:"all",label:"Todas abertas"},{value:"urgent",label:"Urgentes"},{value:"resolved",label:"Resolvidas"}]}/><section className="panel"><div className="section-title"><h2>Equipamentos em destaque</h2><StatusBadge status="simulated">simulação</StatusBadge></div><div className={view==="compacta"?"equipment-list compact-list":"equipment-list"}>{data.fleets.slice(0, view==="tabela"?8:6).map(item=><EquipmentCard key={item.fleet} item={item} compact={view==="compacta"}/>)}</div></section><section className="panel"><div className="section-title"><h2>Pendências operacionais</h2><span className="badge badge-warning">{items.length} itens</span></div><div className="cards">{items.map(x=><article className="pending-card" key={x.id}><div className="row"><strong>{x.subject}</strong><span className={`badge priority-${x.priority}`}>{x.priority}</span></div><p>{x.operation} · {x.reason}</p><small>Desde {new Date(x.since).toLocaleString("pt-BR")}</small><div className="actions"><button onClick={()=>action(x.id,"review")}>Revisar</button><button className="primary" onClick={()=>confirm("Confirmar aprovação simulada?")&&action(x.id,"approve")}>Aprovar</button><button onClick={()=>action(x.id,"defer")}>Adiar</button><button onClick={()=>action(x.id,"resolve")}>Resolver</button></div></article>)}</div></section></section>;
}
