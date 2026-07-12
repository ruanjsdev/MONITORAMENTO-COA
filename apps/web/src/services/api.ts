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
    if (!response.ok) throw new Error(await response.text());
    return response.json();
  }
}
