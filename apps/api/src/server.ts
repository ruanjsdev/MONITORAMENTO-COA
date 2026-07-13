import { createApp } from "./app.js";
import { reconcileCompletedOfficialPilotJobs } from "./modules/official-pilot/reconciliation.js";
import { startReportSchedulerWorker } from "./services/reports/report-worker.js";

const port = Number(process.env.API_PORT ?? 3333);
const host = process.env.API_HOST ?? "127.0.0.1";

const app = createApp();
void reconcileCompletedOfficialPilotJobs().catch(error => console.error("Falha ao reconciliar jobs oficiais duráveis na inicialização:", error));
startReportSchedulerWorker();
app.listen(port, host, () => {
  console.log(`COA-BOT API em modo simulacao ouvindo em http://${host}:${port}`);
});
