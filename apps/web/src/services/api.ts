export const API_URL = import.meta.env.VITE_API_URL ?? `${window.location.protocol}//${window.location.hostname}:3333`;

export class ApiClient {
  constructor(private readonly getToken: () => string | null) {}

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers
      }
    });
    if (response.status === 401) {
      localStorage.removeItem("coa_token");
      throw new Error("Sessão expirada. Faça login novamente.");
    }
    if (!response.ok) {
      const raw = await response.text();
      try {
        const parsed = JSON.parse(raw) as { error?: string; message?: string; details?: { code?: string; message?: string } };
        const detail = parsed.details?.message && parsed.details.message !== parsed.error ? ` — ${parsed.details.message}` : "";
        throw new Error(`${parsed.error ?? parsed.message ?? "Falha na API"}${detail}${parsed.details?.code ? ` [${parsed.details.code}]` : ""}`);
      } catch (error) {
        if (error instanceof SyntaxError) throw new Error(raw || `Falha HTTP ${response.status}`);
        throw error;
      }
    }
    return response.json();
  }
}
