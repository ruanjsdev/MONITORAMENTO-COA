import {
  ClipboardList,
  FileSpreadsheet,
  History,
  MonitorCog,
  Search,
  Send,
  Settings,
  Shield,
  Smartphone,
  TestTube2,
  Tractor
} from "lucide-react";

const groups = [
  {
    title: "Operação",
    items: [
      { path: "/central", label: "Central de Operações", description: "Atenção operacional, frotas críticas e pendências.", icon: ClipboardList },
      { path: "/equipamentos", label: "Equipamentos", description: "Lista por frota, status, setor e atualização.", icon: Tractor },
      { path: "/relatorios", label: "Troca de Turno", description: "Rascunho, revisão e envio simulado do relatório.", icon: Send },
      { path: "/pesquisa", label: "Pesquisa", description: "Busca por frota, descrição, histórico e eventos.", icon: Search },
      { path: "/historico", label: "Histórico", description: "Linha do tempo completa e registros resolvidos.", icon: History }
    ]
  },
  {
    title: "Configuração e sistema",
    items: [
      { path: "/grupos", label: "Grupos", description: "Grupos autorizados e vínculos operacionais.", icon: Smartphone },
      { path: "/planilhas", label: "Planilhas e Excel", description: "Planilhas oficiais, homologação e agente Excel.", icon: FileSpreadsheet },
      { path: "/diagnostico", label: "Diagnóstico", description: "Estado da API, PostgreSQL, Excel Agent e WhatsApp.", icon: MonitorCog },
      { path: "/testes", label: "Central de Testes", description: "Simulador de mensagem e validações guiadas.", icon: TestTube2 },
      { path: "/operacoes", label: "Cadastro de Operações", description: "Operações agrícolas e configuração operacional.", icon: Shield },
      { path: "/configuracoes", label: "Configurações", description: "Preferências gerais e modo seguro.", icon: Settings }
    ]
  }
];

export default function MorePage() {
  return (
    <section className="more-page">
      <div className="page-heading compact-heading">
        <div>
          <span className="eyebrow">Navegação completa</span>
          <h1>Mais</h1>
        </div>
      </div>
      {groups.map(group => (
        <section className="panel more-section" key={group.title}>
          <h2>{group.title}</h2>
          <div className="more-grid">
            {group.items.map(({ path, label, description, icon: Icon }) => (
              <button className="more-tile" key={path} onClick={() => location.assign(path)} type="button">
                <span><Icon size={22} /></span>
                <strong>{label}</strong>
                <small>{description}</small>
              </button>
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}
