import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useApp } from "../app/providers";
import { TechnicalDetails } from "../components/common/TechnicalDetails";
import { SpreadsheetCard } from "../components/spreadsheets/SpreadsheetCard";
import { SpreadsheetDetails } from "../components/spreadsheets/SpreadsheetDetails";
import { useLoadable } from "../hooks/useLoadable";
import { SpreadsheetFile, SpreadsheetResponse } from "../types";

export default function SpreadsheetsPage() {
  const { api, notify } = useApp();
  const [selected, setSelected] = useState<SpreadsheetFile | null>(null);
  const { data, error, loading, reload } = useLoadable(() => api.request<SpreadsheetResponse>("/spreadsheets"));
  if (loading) return <section className="panel">Carregando...</section>;
  if (error || !data) return <section className="panel error-box"><p>{error}</p><button onClick={reload}>Tentar novamente</button></section>;
  return (
    <section>
      <div className="header"><div><h1>Planilhas</h1><p className="muted">Metadados persistidos. Arquivos reais seguem somente leitura.</p></div><button onClick={async () => { const response = await api.request<{ message: string }>("/spreadsheets/reanalyze", { method: "POST", body: "{}" }); notify("success", response.message); await reload(); }}><RefreshCw size={18} />Reanalisar em modo leitura</button></div>
      <div className="cards">{data.files.map((file) => <SpreadsheetCard key={file.file} file={file} onDetails={() => setSelected(file)} />)}</div>
      <LocalTurnWorkbooks />
      {selected && <SpreadsheetDetails file={selected} onClose={() => setSelected(null)} />}
      <MappingConfirmation files={data.files} />
      <TechnicalDetails data={data} />
    </section>
  );
}

function LocalTurnWorkbooks() {
  const { api, notify } = useApp();
  const [opening, setOpening] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, string>>({});
  const books = [
    { id: "planilha-plantio-cana-dev-xlsm", label: "Plantio", file: "Planilha Plantio cana.dev.xlsm" },
    { id: "acompanhamento-tratos-culturais-dev-xlsm", label: "Tratos", file: "Acompanhamento Tratos Culturais.dev.xlsm" },
    { id: "local-all", label: "Todas", file: "Planilhas locais do turno (.dev)" },
    { id: "local-folder", label: "Pasta", file: "planilhas-homologacao" }
  ];
  useEffect(() => { api.request<{ workbooks: Array<{ id: string; status: string }> }>("/excel/local-workbooks").then(value => setStatus(Object.fromEntries(value.workbooks.map(item => [item.id, item.status])))).catch(() => undefined); }, []);
  async function openWorkbook(book: typeof books[number]) {
    setOpening(book.id);
    try {
      const endpoint = book.id === "local-all" ? "/excel/local-workbooks/open-all" : book.id === "local-folder" ? "/excel/local-workbooks/open-folder" : `/excel/local-workbooks/${book.id}/open`;
      await api.request(endpoint, { method: "POST", body: "{}" });
      setStatus(value => ({ ...value, [book.id]: "OPEN" }));
      notify("success", `${book.label}: Planilha aberta com sucesso.`);
    } catch (error) { notify("error", error instanceof Error ? error.message : "Falha ao abrir planilha local."); }
    finally { setOpening(null); }
  }
  return <section className="panel local-turn-workbooks">
    <div className="row"><div><h2>Planilhas do Turno</h2><p className="muted">Operação LOCAL_OPERATIONAL · somente cópias .dev</p></div><span className="badge badge-warning">LOCAL_OPERATIONAL</span></div>
    <p className="notice">A planilha oficial não está integrada. A abertura é manual e qualquer alteração deve ser feita com Ctrl+C/V. Nenhuma escrita oficial será executada.</p>
    <div className="sheet-list">{books.map(book => <article className="sheet-card" key={book.id}><div className="row"><div><strong>{book.label}</strong><p className="muted">{book.file}</p></div><span className="badge">{opening === book.id ? "abrindo…" : status[book.id] === "OPEN" ? "aberta no Excel" : "fechada"}</span></div><div className="actions"><button disabled={Boolean(opening)} onClick={() => openWorkbook(book)}>Abrir {book.label}</button></div></article>)}</div>
  </section>;
}

function MappingConfirmation({ files }: { files: SpreadsheetFile[] }) {
  const rows = files.flatMap((file) => file.sheetDetails.slice(0, 4).map((sheet) => ({ file: file.file, sheet })));
  return (
    <section className="panel">
      <h2>Confirmação de mapeamento</h2>
      <p className="muted">Nenhum mapeamento é oficial até confirmação manual.</p>
      <div className="sheet-list">{rows.map(({ file, sheet }) => (
        <article className="sheet-card" key={`${file}-${sheet.name}`}>
          <strong>{sheet.name}</strong><p>{file}</p>
          <p>Área candidata: {sheet.candidateImageArea}</p>
          <p>Status: {sheet.confirmationStatus ?? "NEEDS_ANALYSIS"}</p>
          <div className="actions"><button>Confirmar</button><button>Editar</button><button>Rejeitar</button><button>Necessita análise</button></div>
        </article>
      ))}</div>
    </section>
  );
}
