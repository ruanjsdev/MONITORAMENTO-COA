import { Activity, ClipboardList, FileSpreadsheet, History, Search, Send, Settings, Shield, Smartphone, TestTube2 } from "lucide-react";
import DashboardPage from "../pages/DashboardPage";
import PendingChangesPage from "../pages/PendingChangesPage";
import GroupsPage from "../pages/GroupsPage";
import OperationsPage from "../pages/OperationsPage";
import SpreadsheetsPage from "../pages/SpreadsheetsPage";
import TestCenterPage from "../pages/TestCenterPage";
import HistoryPage from "../pages/HistoryPage";
import SettingsPage from "../pages/SettingsPage";
import AttentionCenterPage from "../pages/AttentionCenterPage";
import SearchPage from "../pages/SearchPage";
import ReportsPage from "../pages/ReportsPage";

export const routes = [
  { path: "/dashboard", label: "Meu Turno", icon: Activity, page: DashboardPage },
  { path: "/central", label: "Central", icon: ClipboardList, page: AttentionCenterPage },
  { path: "/pendencias", label: "Aprovações", icon: ClipboardList, page: PendingChangesPage },
  { path: "/pesquisa", label: "Pesquisa", icon: Search, page: SearchPage },
  { path: "/relatorios", label: "Troca de turno", icon: Send, page: ReportsPage },
  { path: "/grupos", label: "Grupos", icon: Smartphone, page: GroupsPage },
  { path: "/operacoes", label: "Operações", icon: Shield, page: OperationsPage },
  { path: "/planilhas", label: "Planilhas", icon: FileSpreadsheet, page: SpreadsheetsPage },
  { path: "/testes", label: "Testes", icon: TestTube2, page: TestCenterPage },
  { path: "/historico", label: "Histórico", icon: History, page: HistoryPage },
  { path: "/configuracoes", label: "Configurações", icon: Settings, page: SettingsPage }
] as const;
