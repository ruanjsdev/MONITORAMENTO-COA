import React, { createContext, useContext, useMemo, useState } from "react";
import { ApiClient } from "../services/api";

type Toast = { type: "success" | "error"; message: string };

type AppContextValue = {
  token: string | null;
  api: ApiClient;
  toast: Toast | null;
  login(token: string): void;
  logout(): void;
  notify(type: Toast["type"], message: string): void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState(localStorage.getItem("coa_token"));
  const [toast, setToast] = useState<Toast | null>(null);
  const api = useMemo(() => new ApiClient(() => localStorage.getItem("coa_token")), [token]);

  function login(newToken: string) {
    localStorage.setItem("coa_token", newToken);
    setToken(newToken);
  }

  function logout() {
    localStorage.removeItem("coa_token");
    setToken(null);
  }

  function notify(type: Toast["type"], message: string) {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3500);
  }

  return <AppContext.Provider value={{ token, api, toast, login, logout, notify }}>{children}</AppContext.Provider>;
}

export function useApp() {
  const value = useContext(AppContext);
  if (!value) throw new Error("useApp deve ser usado dentro de AppProvider");
  return value;
}
