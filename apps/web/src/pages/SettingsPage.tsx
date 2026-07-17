import { Download, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useApp } from "../app/providers";
import { useLoadable } from "../hooks/useLoadable";

type FirstRun = {
  newInstall: boolean;
  steps: Array<{
    id: string;
    title: string;
    complete: boolean;
    note?: string;
    workbooks?: Array<{ id: string; name: string; complete: boolean }>;
  }>;
};

export default function SettingsPage() {
  const { api, notify } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const firstRun = useLoadable(() => api.request<FirstRun>("/configuration/first-run"));

  async function exportConfig() {
    const data = await api.request<unknown>("/configuration/export");
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `coa-bot-config-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importConfig(file?: File) {
    if (!file) return;
    const data = JSON.parse(await file.text()) as unknown;
    await api.request("/configuration/import", { method: "POST", body: JSON.stringify(data) });
    notify("success", "Configuração importada com segurança.");
    firstRun.reload();
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault();
    if (newPassword.length < 12)
      return notify("error", "A nova senha precisa ter pelo menos 12 caracteres.");
    if (newPassword !== repeatPassword)
      return notify("error", "A confirmação da nova senha não confere.");
    setChangingPassword(true);
    try {
      await api.request("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword })
      });
      setCurrentPassword("");
      setNewPassword("");
      setRepeatPassword("");
      notify("success", "Senha do administrador alterada.");
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Não foi possível alterar a senha.");
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <section className="settings-page">
      <section className="panel">
        <h1>Configurações</h1>
        <p className="muted">
          Configurações operacionais portáteis. Segredos, sessões, mensagens, planilhas e backups
          não são exportados.
        </p>
        <div className="actions">
          <button onClick={exportConfig}>
            <Download size={18} />
            EXPORTAR CONFIGURAÇÕES
          </button>
          <button onClick={() => inputRef.current?.click()}>
            <Upload size={18} />
            IMPORTAR CONFIGURAÇÕES
          </button>
          <input
            ref={inputRef}
            hidden
            type="file"
            accept="application/json,.json"
            onChange={(event) =>
              importConfig(event.target.files?.[0]).catch((error) =>
                notify("error", error instanceof Error ? error.message : "Falha ao importar.")
              )
            }
          />
        </div>
      </section>

      <section className="panel form">
        <div>
          <span className="eyebrow">Segurança da conta</span>
          <h2>Alterar senha do administrador</h2>
          <p className="muted">
            Use pelo menos 12 caracteres. A nova senha não será exibida nem exportada.
          </p>
        </div>
        <form className="form-grid" onSubmit={changePassword}>
          <label>
            Senha atual
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              required
              minLength={8}
            />
          </label>
          <label>
            Nova senha
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              required
              minLength={12}
            />
          </label>
          <label>
            Repetir nova senha
            <input
              type="password"
              autoComplete="new-password"
              value={repeatPassword}
              onChange={(event) => setRepeatPassword(event.target.value)}
              required
              minLength={12}
            />
          </label>
          <button className="primary" type="submit" disabled={changingPassword}>
            {changingPassword ? "Alterando..." : "ALTERAR SENHA"}
          </button>
        </form>
      </section>

      <section className="panel first-run-panel">
        <div className="row">
          <div>
            <span className="eyebrow">Primeira execução</span>
            <h2>Assistente local</h2>
          </div>
          <span
            className={`badge ${firstRun.data?.newInstall ? "badge-warning" : "badge-success"}`}
          >
            {firstRun.data?.newInstall ? "pendente" : "pronto"}
          </span>
        </div>
        <div className="first-run-steps">
          {(firstRun.data?.steps ?? []).map((step, index) => (
            <article className={step.complete ? "done" : "pending"} key={step.id}>
              <span>{index + 1}</span>
              <strong>{step.title}</strong>
              <small>{step.complete ? "Concluído" : (step.note ?? "Requer atenção")}</small>
              {step.workbooks?.map((workbook) => (
                <small key={workbook.id}>
                  {workbook.name}: {workbook.complete ? "encontrada" : "não localizada"}
                </small>
              ))}
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
