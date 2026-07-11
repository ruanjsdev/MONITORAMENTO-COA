import { TestResult } from "../../types";
import { formatDate } from "../../utils/format";

export function TestResultPanel({ result }: { result: TestResult }) {
  return (
    <article className="panel">
      <div className="row"><strong>{result.title}</strong><span className="badge">SIMULADO</span></div>
      <p>Operação: {result.operation} · Grupo: {result.group} · Turno: {result.shift}</p>
      <p>Horário usado: {formatDate(result.usedAt)}</p>
      <p>Planilha: {result.spreadsheet} · Aba: {result.sheet} · Intervalo: {result.range}</p>
      <h3>Logs do teste</h3>
      {result.logs.map((log) => <p key={log}>{log}</p>)}
    </article>
  );
}
