import { Plus, RefreshCw, Search } from "lucide-react";
import { useState } from "react";
import { useApp } from "../app/providers";
import { EmptyState } from "../components/common/EmptyState";
import { TechnicalDetails } from "../components/common/TechnicalDetails";
import { emptyGroup } from "../components/groups/emptyGroup";
import { GroupCard } from "../components/groups/GroupCard";
import { GroupForm } from "../components/groups/GroupForm";
import { useLoadable } from "../hooks/useLoadable";
import { Operation, WhatsAppGroup } from "../types";

export type ShadowGroup = {
  id: string;
  externalId: string;
  maskedExternalId: string;
  name: string;
  participantCount: number;
  whatsappUpdatedAt?: string;
  selected: boolean;
  monitored: boolean;
  operation: { id: string; name: string } | null;
};
export function filterWhatsAppGroups(groups: ShadowGroup[], query: string) {
  const normalized = query.trim().toLocaleLowerCase("pt-BR");
  return normalized
    ? groups.filter(
        (group) =>
          group.name.toLocaleLowerCase("pt-BR").includes(normalized) ||
          group.maskedExternalId.toLowerCase().includes(normalized)
      )
    : groups;
}

export default function GroupsPage() {
  const { api, notify } = useApp();
  const [editing, setEditing] = useState<WhatsAppGroup | null>(null);
  const [query, setQuery] = useState("");
  const [selectedJid, setSelectedJid] = useState("");
  const [operationId, setOperationId] = useState("");
  const [monitor, setMonitor] = useState(true);
  const groups = useLoadable(() => api.request<WhatsAppGroup[]>("/groups"));
  const shadow = useLoadable(() => api.request<ShadowGroup[]>("/whatsapp-shadow/groups"));
  const operations = useLoadable(() => api.request<Operation[]>("/operations"));

  async function refreshWhatsAppGroups() {
    try {
      await api.request("/whatsapp-shadow/groups/refresh", { method: "POST", body: "{}" });
      notify("success", "Atualização solicitada à sessão WhatsApp ativa.");
      window.setTimeout(() => shadow.reload(), 1500);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "WhatsApp desconectado.");
    }
  }
  async function savePilotGroup() {
    if (!selectedJid || !operationId || !monitor)
      return notify("error", "Selecione um grupo, uma operação e mantenha o monitoramento ativo.");
    try {
      await api.request("/whatsapp-shadow/groups/select", {
        method: "POST",
        body: JSON.stringify({ externalId: selectedJid, operationId })
      });
      notify("success", "Grupo monitorado atualizado.");
      await Promise.all([shadow.reload(), groups.reload()]);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Falha ao selecionar grupo.");
    }
  }

  if (groups.loading || shadow.loading || operations.loading)
    return <section className="panel">Carregando...</section>;
  if (
    groups.error ||
    shadow.error ||
    operations.error ||
    !groups.data ||
    !shadow.data ||
    !operations.data
  )
    return (
      <section className="panel error-box">
        <p>{groups.error || shadow.error || operations.error}</p>
        <button
          onClick={() => {
            groups.reload();
            shadow.reload();
            operations.reload();
          }}
        >
          Tentar novamente
        </button>
      </section>
    );
  const shadowGroups = shadow.data;
  const visible = filterWhatsAppGroups(shadowGroups, query);
  return (
    <section>
      <div className="header">
        <div>
          <h1>Grupos</h1>
          <p className="muted">
            Selecione o grupo real cujas mensagens serão transformadas em pendências.
          </p>
        </div>
        <button className="primary" onClick={refreshWhatsAppGroups}>
          <RefreshCw size={18} />
          ATUALIZAR GRUPOS DO WHATSAPP
        </button>
      </div>
      <section className="panel form">
        <div className="row">
          <div>
            <span className="eyebrow">WhatsApp real</span>
            <h2>Seleção do grupo monitorado</h2>
          </div>
          <span className="badge badge-warning">Somente um grupo</span>
        </div>
        <div className="safety-notice">
          <strong>GRUPO MONITORADO</strong>
          <br />
          As mensagens recebidas neste grupo criam pendências para aprovação no painel.
        </div>
        <label className="search-box">
          <Search size={17} />
          <input
            aria-label="Pesquisar grupos do WhatsApp"
            placeholder="Pesquisar pelo nome do grupo"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="cards">
          {visible.map((group) => (
            <article
              className={`panel ${group.selected ? "selected-card" : ""}`}
              key={group.externalId}
            >
              <div className="row">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={
                      (selectedJid || shadowGroups.find((item) => item.selected)?.externalId) ===
                      group.externalId
                    }
                    onChange={() => setSelectedJid(group.externalId)}
                  />
                  Selecionar
                </label>
                {group.selected && <span className="badge badge-success">MONITORADO</span>}
              </div>
              <h3>{group.name}</h3>
              <p>{group.participantCount} participantes</p>
              <code>{group.maskedExternalId}</code>
              <p className="muted">Operação: {group.operation?.name ?? "Não vinculada"}</p>
            </article>
          ))}
        </div>
        {!visible.length && (
          <EmptyState
            title="Nenhum grupo encontrado."
            action="Atualizar grupos"
            onAction={refreshWhatsAppGroups}
          />
        )}
        <div className="form-grid">
          <label>
            Operação vinculada
            <select value={operationId} onChange={(event) => setOperationId(event.target.value)}>
              <option value="">Selecione</option>
              {operations.data.map((operation) => (
                <option value={operation.id} key={operation.id}>
                  {operation.name}
                </option>
              ))}
            </select>
          </label>
          <label className="check">
            <input
              type="checkbox"
              checked={monitor}
              onChange={(event) => setMonitor(event.target.checked)}
            />
            Monitorar mensagens
          </label>
        </div>
        <button className="primary" onClick={savePilotGroup}>
          Salvar grupo monitorado
        </button>
      </section>
      <div className="header">
        <h2>Cadastros existentes</h2>
        <button onClick={() => setEditing(emptyGroup())}>
          <Plus size={18} />
          Adicionar manualmente
        </button>
      </div>
      {groups.data.length === 0 ? (
        <EmptyState
          title="Nenhum grupo cadastrado ainda."
          action="Adicionar manualmente"
          onAction={() => setEditing(emptyGroup())}
        />
      ) : (
        <div className="cards">
          {groups.data.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              operationsLabel={group.operationIds.join(", ") || "Sem operações"}
              onEdit={() => setEditing(group)}
              onDelete={async () => {
                if (!confirm(`Excluir ${group.name}?`)) return;
                await api.request(`/groups/${group.id}`, { method: "DELETE" });
                notify("success", "Grupo excluído.");
                await groups.reload();
              }}
              onTest={async () => {
                const response = await api.request<{ message: string }>(
                  `/groups/${group.id}/test`,
                  { method: "POST", body: "{}" }
                );
                notify("success", response.message);
              }}
            />
          ))}
        </div>
      )}
      {editing && (
        <GroupForm
          group={editing}
          onCancel={() => setEditing(null)}
          onSave={async (group) => {
            await api.request(group.id ? `/groups/${group.id}` : "/groups", {
              method: group.id ? "PATCH" : "POST",
              body: JSON.stringify(group)
            });
            notify("success", "Grupo salvo.");
            setEditing(null);
            await groups.reload();
          }}
        />
      )}
      <TechnicalDetails data={shadowGroups} />
    </section>
  );
}
