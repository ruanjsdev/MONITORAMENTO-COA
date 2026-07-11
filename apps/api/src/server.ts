import { createApp } from "./app.js";

const port = Number(process.env.API_PORT ?? 3333);

createApp().listen(port, () => {
  console.log(`COA-BOT API em modo simulacao ouvindo em http://localhost:${port}`);
});
