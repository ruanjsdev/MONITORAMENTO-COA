import { createApp } from "./app.js";

const port = Number(process.env.API_PORT ?? 3333);
const host = process.env.API_HOST ?? "0.0.0.0";

createApp().listen(port, host, () => {
  console.log(`COA-BOT API em modo simulacao ouvindo em http://${host}:${port}`);
});
