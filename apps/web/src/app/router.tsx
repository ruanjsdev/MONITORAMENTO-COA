import {
  Activity,
  ClipboardList,
  FileSpreadsheet,
  History,
  MonitorCog,
  MoreHorizontal,
  Search,
  Send,
  Settings,
  Shield,
  Smartphone,
  Tractor
} from "lucide-react";
import DashboardPage from "../pages/DashboardPage";
import PendingChangesPage from "../pages/PendingChangesPage";
import GroupsPage from "../pages/GroupsPage";
import OperationsPage from "../pages/OperationsPage";
import SpreadsheetsPage from "../pages/SpreadsheetsPage";
import HistoryPage from "../pages/HistoryPage";
import SettingsPage from "../pages/SettingsPage";
import AttentionCenterPage from "../pages/AttentionCenterPage";
import SearchPage from "../pages/SearchPage";
import ReportsPage from "../pages/ReportsPage";
import EquipmentPage from "../pages/EquipmentPage";
import DiagnosticsPage from "../pages/DiagnosticsPage";
import MorePage from "../pages/MorePage";

export const routes = [
  {
    path: "/dashboard",
    label: "Meu Turno",
    icon: Activity,
    page: DashboardPage,
    section: "Operação"
  },
  {
    path: "/pendencias",
    label: "Pendências",
    icon: ClipboardList,
    page: PendingChangesPage,
    section: "Operação"
  },
  {
    path: "/operacoes",
    label: "Operações",
    icon: Shield,
    page: OperationsPage,
    section: "Operação"
  },
  {
    path: "/equipamentos",
    label: "Equipamentos",
    icon: Tractor,
    page: EquipmentPage,
    section: "Operação"
  },
  { path: "/historico", label: "Histórico", icon: History, page: HistoryPage, section: "Operação" },
  {
    path: "/relatorios",
    label: "Troca de Turno",
    icon: Send,
    page: ReportsPage,
    section: "Operação"
  },
  {
    path: "/central",
    label: "Central de Operações",
    icon: ClipboardList,
    page: AttentionCenterPage,
    section: "Operação"
  },
  { path: "/pesquisa", label: "Pesquisa", icon: Search, page: SearchPage, section: "Operação" },
  { path: "/mais", label: "Mais", icon: MoreHorizontal, page: MorePage, section: "Operação" },
  {
    path: "/grupos",
    label: "Grupos",
    icon: Smartphone,
    page: GroupsPage,
    section: "Configuração e sistema"
  },
  {
    path: "/planilhas",
    label: "Planilhas",
    icon: FileSpreadsheet,
    page: SpreadsheetsPage,
    section: "Configuração e sistema"
  },
  {
    path: "/diagnostico",
    label: "Diagnóstico",
    icon: MonitorCog,
    page: DiagnosticsPage,
    section: "Configuração e sistema"
  },
  {
    path: "/configuracoes",
    label: "Configurações",
    icon: Settings,
    page: SettingsPage,
    section: "Configuração e sistema"
  }
] as const;
