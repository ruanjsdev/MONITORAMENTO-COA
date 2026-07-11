import { createRoot } from "react-dom/client";
import App from "./app/App";
import { AppProvider } from "./app/providers";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <AppProvider>
    <App />
  </AppProvider>
);
