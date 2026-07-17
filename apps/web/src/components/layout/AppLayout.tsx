import { LogOut, Menu, Search, UserCircle, X } from "lucide-react";
import { routes } from "../../app/router";
import { useApp } from "../../app/providers";
import { useLoadable } from "../../hooks/useLoadable";
import { OperationalModeStatus, OperationalSnapshot, PendingChange } from "../../types";
import { SystemIndicator } from "../common/SystemIndicator";
import { useEffect, useState } from "react";
import { MobileBottomNavigation } from "./MobileBottomNavigation";

export function AppLayout({
  currentPath,
  navigate,
  logout,
  children
}: {
  currentPath: string;
  navigate: (path: string) => void;
  logout: () => void;
  children: React.ReactNode;
}) {
  const { api } = useApp();
  const { data } = useLoadable(() => api.request<OperationalSnapshot>("/operational/snapshot"));
  const mode = useLoadable(() => api.request<OperationalModeStatus>("/operational-mode"));
  const realPending = useLoadable(() => api.request<PendingChange[]>("/pending-changes"));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [clock, setClock] = useState(new Date());
  const active = routes.find((route) => route.path === currentPath);
  const pendingCount = realPending.data?.filter((item) => item.status === "PENDING").length ?? 0;
  const systems = data?.systems ?? [];

  useEffect(() => {
    const timer = window.setInterval(() => setClock(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  function go(path: string) {
    navigate(path);
    setDrawerOpen(false);
  }

  const groupedRoutes = ["Operação", "Configuração e sistema"].map((section) => ({
    section,
    items: routes.filter((route) => route.section === section)
  }));

  return (
    <div className={`app-shell ${collapsed ? "nav-collapsed" : ""}`}>
      <div className="simulation">{mode.data?.banner ?? "Carregando modo operacional..."}</div>
      <header className="topbar">
        <button
          className="icon-button mobile-only"
          aria-label="Abrir menu"
          onClick={() => setDrawerOpen(true)}
        >
          <Menu size={20} />
        </button>
        <div className="brand-block">
          <span className="eyebrow">COA MONITOR</span>
          <strong>{active?.label ?? "Operação"}</strong>
        </div>
        <div className="topbar-context">
          <span>Turno {data?.shift ?? "C"}</span>
          <span>
            {clock.toLocaleDateString("pt-BR")} ·{" "}
            {clock.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
          <span>Operador: Admin</span>
        </div>
        <div className="topbar-indicators">
          <SystemIndicator
            name="API"
            state={systems.find((item) => item.name === "API")?.state ?? "sem dados"}
          />
          <SystemIndicator
            name="PostgreSQL"
            state={systems.find((item) => item.name === "Banco de dados")?.state ?? "sem dados"}
          />
          <SystemIndicator
            name="Excel"
            state={systems.find((item) => item.name === "Agente Excel")?.state ?? "sem dados"}
          />
          <SystemIndicator
            name="WhatsApp"
            state={mode.data?.whatsapp === "CONNECTED" ? "online" : "offline"}
          />
        </div>
        <button className="search-trigger" onClick={() => go("/pesquisa")}>
          <Search size={17} />
          Pesquisa
        </button>
        <span className="pending-pill">{pendingCount} pendências</span>
        <button className="icon-button" aria-label="Menu do usuário" onClick={logout}>
          <UserCircle size={21} />
        </button>
      </header>
      <aside className={`sidebar ${drawerOpen ? "drawer-open" : ""}`}>
        <div className="sidebar-head">
          <button
            className="icon-button desktop-only"
            aria-label="Recolher menu"
            onClick={() => setCollapsed(!collapsed)}
          >
            <Menu size={18} />
          </button>
          <strong>COA</strong>
          <button
            className="icon-button mobile-only"
            aria-label="Fechar menu"
            onClick={() => setDrawerOpen(false)}
          >
            <X size={18} />
          </button>
        </div>
        {groupedRoutes.map((group) => (
          <div className="nav-group" key={group.section}>
            <span className="nav-group-label">{group.section}</span>
            {group.items.map(({ path, label, icon: Icon }) => (
              <button
                className={currentPath === path ? "active" : ""}
                key={path}
                onClick={() => go(path)}
                title={label}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        ))}
        <button onClick={logout}>
          <LogOut size={18} />
          <span>Sair</span>
        </button>
      </aside>
      {drawerOpen && (
        <button
          className="drawer-backdrop"
          aria-label="Fechar menu"
          onClick={() => setDrawerOpen(false)}
        />
      )}
      <main>{children}</main>
      <footer className="statusbar">
        <span>Modo: {mode.data?.mode ?? "carregando"}</span>
        <span>
          Última atualização:{" "}
          {clock.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </span>
        <span>Excel real · aprovação pelo painel · WhatsApp em monitoramento</span>
      </footer>
      <MobileBottomNavigation currentPath={currentPath} navigate={navigate} />
    </div>
  );
}
