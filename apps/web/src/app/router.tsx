import { Activity, ClipboardList, FileSpreadsheet, History, MonitorCog, Search, Send, Settings, Shield, Smartphone, TestTube2, Tractor } from "lucide-react";
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
import EquipmentPage from "../pages/EquipmentPage";
import DiagnosticsPage from "../pages/DiagnosticsPage";

export const routes = [
  { path: "/dashboard", label: "Meu Turno", icon: Activity, page: DashboardPage },
  { path: "/central", label: "Central de Operações", icon: ClipboardList, page: AttentionCenterPage },
  { path: "/pendencias", label: "Aprovações", icon: ClipboardList, page: PendingChangesPage },
  { path: "/equipamentos", label: "Equipamentos", icon: Tractor, page: EquipmentPage },
  { path: "/historico", label: "Histórico", icon: History, page: HistoryPage },
  { path: "/relatorios", label: "Troca de Turno", icon: Send, page: ReportsPage },
  { path: "/pesquisa", label: "Pesquisa", icon: Search, page: SearchPage },
  { path: "/planilhas", label: "Excel", icon: FileSpreadsheet, page: SpreadsheetsPage },
  { path: "/testes", label: "Central de Testes", icon: TestTube2, page: TestCenterPage },
  { path: "/diagnostico", label: "Diagnóstico", icon: MonitorCog, page: DiagnosticsPage },
  { path: "/grupos", label: "Grupos", icon: Smartphone, page: GroupsPage },
  { path: "/operacoes", label: "Operações", icon: Shield, page: OperationsPage },
  { path: "/configuracoes", label: "Configurações", icon: Settings, page: SettingsPage }
] as const;
