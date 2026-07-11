import { Save, TestTube2, Trash2 } from "lucide-react";
import { WhatsAppGroup } from "../../types";
import { formatDate } from "../../utils/format";
import { StatusBadge } from "../common/StatusBadge";

export function GroupCard({ group, operationsLabel, onEdit, onDelete, onTest }: { group: WhatsAppGroup; operationsLabel: string; onEdit?: () => void; onDelete?: () => void; onTest?: () => void }) {
  return (
    <article className="panel card">
      <div className="row">
        <div>
          <strong>{group.name}</strong>
          <p className="muted">{group.externalId || group.id}</p>
        </div>
        <StatusBadge active={group.isActive} />
      </div>
      <div className="facts">
        <span>Monitoramento: {group.isMonitored ? "ligado" : "desligado"}</span>
        <span>Relatórios: {group.receivesReports ? "ligado" : "desligado"}</span>
        <span>Testes: {group.allowTests ? "permitidos" : "bloqueados"}</span>
        <span>Conexão: {group.connectionStatus ?? "simulated"}</span>
      </div>
      <p><strong>Operações:</strong> {operationsLabel}</p>
      <p><strong>Última mensagem:</strong> {group.lastMessage ?? "Nenhuma mensagem processada"}</p>
      <p><strong>Última atividade:</strong> {formatDate(group.lastActivity)}</p>
      <p><strong>Mensagens processadas:</strong> {group.processedMessages ?? 0}</p>
      <div className="actions">
        <button onClick={onEdit}><Save size={18} />Editar</button>
        <button onClick={onTest}><TestTube2 size={18} />Testar configuração</button>
        <button className="danger" onClick={onDelete}><Trash2 size={18} />Excluir</button>
      </div>
    </article>
  );
}
