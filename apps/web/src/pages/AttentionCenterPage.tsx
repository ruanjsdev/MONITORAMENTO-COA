import { useState } from "react";
import { useApp } from "../app/providers";
import { useLoadable } from "../hooks/useLoadable";
import { OperationalSnapshot } from "../types";

export default function AttentionCenterPage() {
  const {api,notify}=useApp(); const {data,error,loading,reload}=useLoadable(()=>api.request<OperationalSnapshot>("/operational/snapshot")); const [filter,setFilter]=useState("all");
  if(loading)return <section className="panel">Carregando...</section>; if(error||!data)return <section className="panel error-box">{error}</section>;
  const items=data.pendencies.filter(x=>filter==="all"&&x.status==="open"||filter==="urgent"&&x.priority==="urgent"||filter==="resolved"&&x.status==="resolved");
  async function action(id:string,value:string){await api.request(`/operational/pendencies/${id}/action`,{method:"POST",body:JSON.stringify({action:value})});notify("success",`SIMULADO: ação ${value} registrada.`);reload();}
  return <section><h1>Central de Pendências</h1><div className="filter-bar">{[["all","Todas"],["urgent","Urgentes"],["resolved","Resolvidas"]].map(([v,l])=><button className={filter===v?"primary":""} onClick={()=>setFilter(v)} key={v}>{l}</button>)}</div><div className="cards">{items.map(x=><article className="panel" key={x.id}><div className="row"><strong>{x.subject}</strong><span className={`badge priority-${x.priority}`}>{x.priority}</span></div><p>{x.operation} · {x.reason}</p><small>Desde {new Date(x.since).toLocaleString("pt-BR")}</small><div className="actions"><button onClick={()=>action(x.id,"review")}>Revisar</button><button onClick={()=>action(x.id,"approve")}>Aprovar</button><button onClick={()=>action(x.id,"defer")}>Adiar</button><button onClick={()=>action(x.id,"resolve")}>Resolver</button></div></article>)}</div></section>;
}
