import { Activity, ClipboardList, History, MoreHorizontal, Shield } from "lucide-react";

const primaryRoutes = [
  { path: "/dashboard", label: "Meu Turno", icon: Activity },
  { path: "/pendencias", label: "Pendências", icon: ClipboardList },
  { path: "/operacoes", label: "Operações", icon: Shield },
  { path: "/historico", label: "Histórico", icon: History },
  { path: "/mais", label: "Mais", icon: MoreHorizontal }
];

const morePaths = new Set(["/mais", "/central", "/equipamentos", "/relatorios", "/pesquisa", "/grupos", "/planilhas", "/diagnostico", "/testes", "/configuracoes"]);

export function MobileBottomNavigation({ currentPath, navigate }: { currentPath: string; navigate: (path: string) => void }) {
  return (
    <nav className="mobile-bottom-nav" aria-label="Navegação principal">
      {primaryRoutes.map(({ path, label, icon: Icon }) => (
        <button key={path} className={isActive(path, currentPath) ? "active" : ""} onClick={() => navigate(path)} type="button">
          <Icon size={22} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function isActive(path: string, currentPath: string) {
  if (path === "/mais") return morePaths.has(currentPath);
  return currentPath === path;
}
