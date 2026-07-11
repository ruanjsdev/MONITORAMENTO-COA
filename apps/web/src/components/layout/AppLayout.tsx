import { LogOut } from "lucide-react";
import { SIMULATION_BANNER } from "@coa-bot/shared";
import { routes } from "../../app/router";

export function AppLayout({ currentPath, navigate, logout, children }: { currentPath: string; navigate: (path: string) => void; logout: () => void; children: React.ReactNode }) {
  return (
    <div>
      <div className="simulation">{SIMULATION_BANNER}</div>
      <aside className="sidebar">
        <strong>COA-BOT</strong>
        {routes.map(({ path, label, icon: Icon }) => (
          <button className={currentPath === path ? "active" : ""} key={path} onClick={() => navigate(path)}>
            <Icon size={18} />
            {label}
          </button>
        ))}
        <button onClick={logout}>
          <LogOut size={18} />
          Sair
        </button>
      </aside>
      <main>{children}</main>
    </div>
  );
}
