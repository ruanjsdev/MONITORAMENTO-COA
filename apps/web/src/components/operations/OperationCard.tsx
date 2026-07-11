import { Save, Trash2 } from "lucide-react";
import { Operation } from "../../types";
import { formatDate } from "../../utils/format";
import { StatusBadge } from "../common/StatusBadge";

export function OperationCard({ operation, onEdit, onDuplicate, onDelete }: { operation: Operation; onEdit?: () => void; onDuplicate?: () => void; onDelete?: () => void }) {
  return (
    <article className="panel card">
      <div className="row">
        <div className="operation-title"><span>{operation.emoji}</span><strong>{operation.name}</strong></div>
        <StatusBadge active={operation.status === "active"} />
      </div>
      <p>{operation.description || "Sem descrição cadastrada."}</p>
      <div className="facts">
        <span>Grupo: {operation.groupIds[0] ?? "Não vinculado"}</span>
        <span>Planilha: {operation.spreadsheetFile}</span>
        <span>Aba: {operation.sheetName}</span>
        <span>Frotas: {operation.fleetCount ?? 0}</span>
        <span>Última atualização: {formatDate(operation.lastUpdate)}</span>
        <span>Monitoramento: {operation.monitor ? "ligado" : "desligado"}</span>
        <span>Relatório automático: {operation.automaticReport ? "ligado" : "desligado"}</span>
      </div>
      <p><strong>Status permitidos:</strong> {operation.allowedStatuses.join(", ")}</p>
      <div className="actions">
        <button onClick={onEdit}><Save size={18} />Editar</button>
        <button onClick={onDuplicate}>Duplicar configuração</button>
        <button className="danger" onClick={onDelete}><Trash2 size={18} />Excluir</button>
      </div>
    </article>
  );
}
