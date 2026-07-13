import { useState } from "react";
import { API_URL } from "../services/api";
import { useApp } from "../app/providers";

export default function LoginPage({ redirectTo }: { redirectTo: string }) {
  const { login } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      if (!response.ok) throw new Error("Credenciais inválidas ou API indisponível.");
      const data = await response.json();
      login(data.token);
      history.pushState(null, "", redirectTo);
      window.dispatchEvent(new PopStateEvent("popstate"));
    } catch (error) {
      setError(error instanceof Error ? error.message : "Falha de login.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login">
      <form onSubmit={submit} className="panel compact">
        <h1>COA-BOT</h1>
        <p>Assistente operacional em modo de simulação.</p>
        <label>Email</label>
        <input value={email} onChange={(event) => setEmail(event.target.value)} />
        <label>Senha</label>
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        {error && <span className="error">{error}</span>}
        <button className="primary" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
      </form>
    </main>
  );
}
