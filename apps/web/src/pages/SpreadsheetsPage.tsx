import { RefreshCw } from "lucide-react";
import { useState } from "react";
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
      {selected && <SpreadsheetDetails file={selected} onClose={() => setSelected(null)} />}
      <MappingConfirmation files={data.files} />
      <TechnicalDetails data={data} />
    </section>
  );
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
