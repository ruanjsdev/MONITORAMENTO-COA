import { useMemo, useState } from "react";
import { EquipmentCard } from "../components/operational/EquipmentCard";
import { FilterBar } from "../components/common/FilterBar";
import { useLoadable } from "../hooks/useLoadable";
import { useApp } from "../app/providers";
import { OperationalSnapshot } from "../types";
import { SemanticStatusBadge } from "../components/common/SemanticStatusBadge";

export default function EquipmentPage() {
  const { api } = useApp();
  const { data, error, loading, reload } = useLoadable(() => api.request<OperationalSnapshot>("/operational/snapshot"));
  const [operation, setOperation] = useState("all");
  const [status, setStatus] = useState("all");
  const [view, setView] = useState("compacta");

  const operations = useMemo(() => ["all", ...Array.from(new Set(data?.fleets.map((item) => item.operation) ?? []))], [data]);
  const statuses = useMemo(() => ["all", ...Array.from(new Set(data?.fleets.map((item) => item.status) ?? []))], [data]);
  const filtered = (data?.fleets ?? []).filter((item) => (operation === "all" || item.operation === operation) && (status === "all" || item.status === status));

  if (loading) return <section className="panel loading-panel">Carregando equipamentos...</section>;
  if (error || !data) return <section className="panel error-box"><p>{error || "Falha ao carregar equipamentos."}</p><button onClick={reload}>Tentar novamente</button></section>;

  return (
    <section>
      <div className="page-heading">
        <div>
          <span className="eyebrow">Central de Operações</span>
          <h1>Equipamentos</h1>
          <p className="muted">Frotas em leitura rápida, com detalhes recolhidos.</p>
        </div>
        <div className="segmented-control" aria-label="Modo de visualização">
          {["compacta", "cards", "tabela"].map((item) => <button className={view === item ? "active-filter" : ""} key={item} onClick={() => setView(item)}>{item}</button>)}
        </div>
      </div>

      <div className="equipment-summary-strip">
        <span>{data.fleets.length} monitorados</span>
        <SemanticStatusBadge status="RODANDO">{data.fleets.filter((item) => item.status === "RODANDO").length} rodando</SemanticStatusBadge>
        <SemanticStatusBadge status="PARADO">{data.fleets.filter((item) => item.status === "PARADO").length} parados</SemanticStatusBadge>
        <SemanticStatusBadge status="SEM INFORMACAO">SLA visual ativo</SemanticStatusBadge>
      </div>

      <FilterBar value={operation} onChange={setOperation} options={operations.map((item) => ({ value: item, label: item === "all" ? "Todas operações" : item }))} />
      <FilterBar value={status} onChange={setStatus} label="Status" options={statuses.map((item) => ({ value: item, label: item === "all" ? "Todos status" : item }))} />

      {view === "tabela" ? (
        <section className="panel table-panel">
          <table>
            <thead><tr><th>Frota</th><th>Status</th><th>Operação</th><th>Setor</th><th>Descrição</th><th>Atualização</th></tr></thead>
            <tbody>{filtered.map((item) => <tr key={item.fleet}><td className="fleet-code">{item.fleet}</td><td>{item.status}</td><td>{item.operation}</td><td>{item.sector}</td><td>{item.description}</td><td>{new Date(item.updatedAt).toLocaleString("pt-BR")}</td></tr>)}</tbody>
          </table>
        </section>
      ) : (
        <div className={view === "compacta" ? "equipment-list compact-list" : "equipment-list"}>{filtered.map((item) => <EquipmentCard key={item.fleet} item={item} compact={view === "compacta"} />)}</div>
      )}
    </section>
  );
}
