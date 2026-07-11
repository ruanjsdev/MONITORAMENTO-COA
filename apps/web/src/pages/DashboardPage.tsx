import { Activity, Bell, Database, FileSpreadsheet, RefreshCw, Smartphone } from "lucide-react";
import { useApp } from "../app/providers";
import { useLoadable } from "../hooks/useLoadable";
import { Dashboard } from "../types";

export default function DashboardPage() {
  const { api, notify } = useApp();
  const { data, error, loading, reload } = useLoadable(() => api.request<Dashboard>("/dashboard"));
  if (loading) return <section className="panel">Carregando...</section>;
  if (error || !data) return <section className="panel error-box"><p>{error}</p><button onClick={reload}>Tentar novamente</button></section>;
  return (
    <section>
      <div className="header"><div><h1>Dashboard do turno</h1><p className="muted">Status operacional em simulação.</p></div><button onClick={reload}><RefreshCw size={18} />Atualizar</button></div>
      <div className="grid">
        <Metric icon={<Activity />} label="API" value={data.api} />
        <Metric icon={<Database />} label="Banco" value={data.database} />
        <Metric icon={<Smartphone />} label="WhatsApp" value={data.whatsapp} />
        <Metric icon={<FileSpreadsheet />} label="Agente Excel" value={data.excelAgent} />
        <Metric label="Grupos" value={String(data.groupsCount)} />
        <Metric label="Operações" value={String(data.operationsCount)} />
        <Metric label="Pendências" value={String(data.pendingChanges)} />
        <Metric label="Próxima troca" value={data.nextShiftChange} />
      </div>
      <div className="columns"><List title="Últimas mensagens" items={data.latestMessages} /><List title="Últimos eventos" items={data.latestEvents} /></div>
      <button className="primary" onClick={async () => { await api.request("/notifications/test", { method: "POST", body: "{}" }); notify("success", "SIMULADO: notificação de teste registrada."); }}><Bell size={18} />Enviar notificação de teste</button>
    </section>
  );
}

function Metric({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return <div className="metric">{icon}<span>{label}</span><strong>{value}</strong></div>;
}

function List({ title, items }: { title: string; items: string[] }) {
  return <div className="panel"><h2>{title}</h2>{items.length ? items.map((item) => <p key={item}>{item}</p>) : <p className="muted">Sem registros.</p>}</div>;
}
