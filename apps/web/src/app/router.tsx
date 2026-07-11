import { Activity, ClipboardList, FileSpreadsheet, History, Settings, Shield, Smartphone, TestTube2 } from "lucide-react";
import DashboardPage from "../pages/DashboardPage";
import PendingChangesPage from "../pages/PendingChangesPage";
import GroupsPage from "../pages/GroupsPage";
import OperationsPage from "../pages/OperationsPage";
import SpreadsheetsPage from "../pages/SpreadsheetsPage";
import TestCenterPage from "../pages/TestCenterPage";
import HistoryPage from "../pages/HistoryPage";
import SettingsPage from "../pages/SettingsPage";

export const routes = [
  { path: "/dashboard", label: "Dashboard", icon: Activity, page: DashboardPage },
  { path: "/pendencias", label: "Pendências", icon: ClipboardList, page: PendingChangesPage },
  { path: "/grupos", label: "Grupos", icon: Smartphone, page: GroupsPage },
  { path: "/operacoes", label: "Operações", icon: Shield, page: OperationsPage },
  { path: "/planilhas", label: "Planilhas", icon: FileSpreadsheet, page: SpreadsheetsPage },
  { path: "/testes", label: "Testes", icon: TestTube2, page: TestCenterPage },
  { path: "/historico", label: "Histórico", icon: History, page: HistoryPage },
  { path: "/configuracoes", label: "Configurações", icon: Settings, page: SettingsPage }
] as const;
