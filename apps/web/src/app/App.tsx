import { useEffect, useState } from "react";
import { routes } from "./router";
import { useApp } from "./providers";
import LoginPage from "../pages/LoginPage";
import NotFoundPage from "../pages/NotFoundPage";
import { AppLayout } from "../components/layout/AppLayout";
import { Toast } from "../components/feedback/Toast";

function normalize(path: string) {
  if (path === "/") return "/dashboard";
  if (path === "/pending-changes") return "/pendencias";
  if (path === "/groups") return "/grupos";
  if (path === "/operations") return "/operacoes";
  if (path === "/spreadsheets") return "/planilhas";
  if (path === "/tests") return "/testes";
  if (path === "/excel") return "/planilhas";
  if (path === "/more") return "/mais";
  return path;
}

export default function App() {
  const { token, logout, toast } = useApp();
  const [path, setPath] = useState(normalize(location.pathname));

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const listener = () => setPath(normalize(location.pathname));
    addEventListener("popstate", listener);
    return () => removeEventListener("popstate", listener);
  }, []);

  function navigate(next: string) {
    history.pushState(null, "", next);
    setPath(normalize(next));
  }

  if (!token || path === "/login") {
    return <><LoginPage redirectTo={path === "/login" ? "/dashboard" : path} />{toast && <Toast type={toast.type} message={toast.message} />}</>;
  }

  const match = routes.find((route) => route.path === path);
  const Page = match?.page;
  return (
    <>
      {toast && <Toast type={toast.type} message={toast.message} />}
      <AppLayout currentPath={path} navigate={navigate} logout={logout}>
        {Page ? <Page /> : <NotFoundPage navigate={navigate} />}
      </AppLayout>
    </>
  );
}
