import { LogOut, Menu, Search, UserCircle, X } from "lucide-react";
import { SIMULATION_BANNER } from "@coa-bot/shared";
import { routes } from "../../app/router";
import { useApp } from "../../app/providers";
import { useLoadable } from "../../hooks/useLoadable";
import { OperationalSnapshot } from "../../types";
import { SystemIndicator } from "../common/SystemIndicator";
import { useEffect, useState } from "react";

export function AppLayout({ currentPath, navigate, logout, children }: { currentPath: string; navigate: (path: string) => void; logout: () => void; children: React.ReactNode }) {
  const { api } = useApp();
  const { data } = useLoadable(() => api.request<OperationalSnapshot>("/operational/snapshot"));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [clock, setClock] = useState(new Date());
  const active = routes.find((route) => route.path === currentPath);
  const pendingCount = data?.pendencies.filter((item) => item.status === "open").length ?? 0;
  const systems = data?.systems ?? [];

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  function go(path: string) {
    navigate(path);
    setDrawerOpen(false);
  }

  return (
    <div className={`app-shell ${collapsed ? "nav-collapsed" : ""}`}>
      <div className="simulation">{SIMULATION_BANNER}</div>
      <header className="topbar">
        <button className="icon-button mobile-only" aria-label="Abrir menu" onClick={() => setDrawerOpen(true)}><Menu size={20} /></button>
        <div className="brand-block">
          <span className="eyebrow">COA MONITOR</span>
          <strong>{active?.label ?? "Operação"}</strong>
        </div>
        <div className="topbar-context">
          <span>Turno {data?.shift ?? "C"}</span>
          <span>{clock.toLocaleDateString("pt-BR")} · {clock.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
          <span>Operador: Admin</span>
        </div>
        <div className="topbar-indicators">
          <SystemIndicator name="API" state={systems.find((item) => item.name === "API")?.state ?? "sem dados"} />
          <SystemIndicator name="PostgreSQL" state={systems.find((item) => item.name === "Banco de dados")?.state ?? "simulated"} />
          <SystemIndicator name="Excel" state={systems.find((item) => item.name === "Agente Excel")?.state ?? "simulated"} />
          <SystemIndicator name="WhatsApp" state={systems.find((item) => item.name === "WhatsApp")?.state ?? "simulated"} />
        </div>
        <button className="search-trigger" onClick={() => go("/pesquisa")}><Search size={17} />Pesquisa</button>
        <span className="pending-pill">{pendingCount} pendências</span>
        <button className="icon-button" aria-label="Menu do usuário" onClick={logout}><UserCircle size={21} /></button>
      </header>
      <aside className={`sidebar ${drawerOpen ? "drawer-open" : ""}`}>
        <div className="sidebar-head">
          <button className="icon-button desktop-only" aria-label="Recolher menu" onClick={() => setCollapsed(!collapsed)}><Menu size={18} /></button>
          <strong>COA</strong>
          <button className="icon-button mobile-only" aria-label="Fechar menu" onClick={() => setDrawerOpen(false)}><X size={18} /></button>
        </div>
        {routes.map(({ path, label, icon: Icon }) => (
          <button className={currentPath === path ? "active" : ""} key={path} onClick={() => go(path)} title={label}>
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
        <button onClick={logout}>
          <LogOut size={18} />
          <span>Sair</span>
        </button>
      </aside>
      {drawerOpen && <button className="drawer-backdrop" aria-label="Fechar menu" onClick={() => setDrawerOpen(false)} />}
      <main>{children}</main>
      <footer className="statusbar">
        <span>Modo: {data?.simulationMode ? "simulação protegida" : "produção"}</span>
        <span>Última atualização: {clock.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
        <span>Excel/WhatsApp sem execução real em homologação</span>
      </footer>
    </div>
  );
}
