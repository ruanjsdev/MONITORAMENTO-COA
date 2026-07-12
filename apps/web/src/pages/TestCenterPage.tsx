import { useState } from "react";
import { useApp } from "../app/providers";
import { EmptyState } from "../components/common/EmptyState";
import { TestResultPanel } from "../components/tests/TestResultPanel";
import { useLoadable } from "../hooks/useLoadable";
import { TestResult } from "../types";
import { MessageSimulator } from "../components/tests/MessageSimulator";
import { ExcelHomologationPanel } from "../components/tests/ExcelHomologationPanel";

export default function TestCenterPage() {
  const { api, notify } = useApp();
  const [operation, setOperation] = useState("Plantio Mecanizado");
  const [group, setGroup] = useState("COA Simulado");
  const [shift, setShift] = useState("C");
  const [legend, setLegend] = useState("Relatório simulado de operação.");
  const [result, setResult] = useState<TestResult | null>(null);
  const history = useLoadable(() => api.request<unknown[]>("/tests"));

  async function run(action: string) {
    if (action.includes("envio") && !confirm("Confirmar simulação de envio? Nenhuma mensagem real será enviada.")) return;
    const response = await api.request<TestResult>("/tests/run", { method: "POST", body: JSON.stringify({ action, operation, group, shift, legend }) });
    setResult(response);
    notify("success", `${response.title} concluído.`);
    await history.reload();
  }

  return (
    <section>
      <div className="header"><div><h1>Testes e Pré-visualização</h1><p className="muted">Execuções agora ficam registradas no banco quando PostgreSQL estiver ativo.</p></div><button onClick={() => result && run(result.action)}>Repetir último teste</button></div>
      <div className="panel form"><div className="form-grid">
        <label>Operação<select value={operation} onChange={(event) => setOperation(event.target.value)}><option>Plantio Mecanizado</option><option>CPD</option><option>Compostagem</option><option>Cultivo</option></select></label>
        <label>Grupo<select value={group} onChange={(event) => setGroup(event.target.value)}><option>COA Simulado</option><option>Grupo de Testes</option></select></label>
        <label>Turno<select value={shift} onChange={(event) => setShift(event.target.value)}><option>A</option><option>B</option><option>C</option></select></label>
        <label>Legenda<input value={legend} onChange={(event) => setLegend(event.target.value)} /></label>
      </div><div className="actions test-actions">
        {["gerar previa", "notificacao de teste", "envio privado", "envio grupo", "alteracao status", "aprovacao", "falha excel", "falha whatsapp"].map((action) => <button key={action} onClick={() => run(action)}>{action}</button>)}
        <button onClick={() => setResult(null)}>Limpar resultado</button>
      </div></div>
      {result ? <TestResultPanel result={result} /> : <EmptyState title="Nenhum teste executado ainda." action="Gerar prévia" onAction={() => run("gerar previa")} />}
      <section className="panel"><h2>Histórico de testes</h2>{history.loading ? <p>Carregando...</p> : history.data?.length ? <p>{history.data.length} execução(ões) registradas.</p> : <p className="muted">Nenhum teste persistido ainda.</p>}</section>
      <MessageSimulator />
      <ExcelHomologationPanel />
    </section>
  );
}
