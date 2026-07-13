import makeWASocket, { DisconnectReason, useMultiFileAuthState } from "baileys";
import path from "node:path";
import qrcode from "qrcode-terminal";

const apiUrl = process.env.API_URL ?? "http://localhost:3333";
const token = process.env.WHATSAPP_SHADOW_TOKEN ?? "local-dev-whatsapp-shadow";
const authDir = process.env.WHATSAPP_AUTH_DIR ?? path.resolve(process.cwd(), "../../whatsapp-session");
const headers = { "Content-Type": "application/json", "x-whatsapp-shadow-token": token };

async function post(pathname: string, body: unknown) {
  const response = await fetch(apiUrl + pathname, { method: "POST", headers, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`API SHADOW ${response.status}: ${await response.text()}`);
  return response.json();
}

async function waitForShadow() {
  for (;;) {
    try {
      const response = await fetch(apiUrl + "/whatsapp-shadow/local/mode", { headers });
      if (response.ok && (await response.json() as { mode: string }).mode === "SHADOW") return;
    } catch (error) { console.log("API ainda indisponível para consultar o modo SHADOW.", error); }
    console.log("WhatsApp aguardando ativação explícita do modo SHADOW no painel.");
    await new Promise(resolve => setTimeout(resolve, 10_000));
  }
}

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const socket = makeWASocket({ auth: state, printQRInTerminal: false, markOnlineOnConnect: false, syncFullHistory: false });
  socket.ev.on("creds.update", saveCreds);
  socket.ev.on("connection.update", async update => {
    if (update.qr) { console.log("WHATSAPP REAL — MODO SOMENTE LEITURA\nEscaneie o QR abaixo:"); qrcode.generate(update.qr, { small: true }); }
    if (update.connection === "open") {
      console.log("WhatsApp SHADOW conectado. Envio, reação, exclusão e alteração de grupos bloqueados.");
      await post("/whatsapp-shadow/local/status", { connected: true });
      const groups = await socket.groupFetchAllParticipating();
      await post("/whatsapp-shadow/local/groups", { groups: Object.values(groups).map(group => ({ id: group.id, name: group.subject })) });
    }
    if (update.connection === "close") {
      await post("/whatsapp-shadow/local/status", { connected: false }).catch(() => undefined);
      const code = (update.lastDisconnect?.error as { output?: { statusCode?: number } })?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) setTimeout(connect, 2_000);
    }
  });
  socket.ev.on("messages.upsert", async event => {
    if (event.type !== "notify") return;
    for (const message of event.messages) {
      const groupId = message.key.remoteJid;
      if (!groupId?.endsWith("@g.us") || message.key.fromMe) continue;
      const text = message.message?.conversation ?? message.message?.extendedTextMessage?.text ?? message.message?.imageMessage?.caption;
      if (!text) continue;
      await post("/whatsapp-shadow/local/messages", { messageId: message.key.id, groupId, sender: message.key.participant, text, receivedAt: new Date(Number(message.messageTimestamp) * 1000).toISOString() }).catch(error => console.error("Falha ao persistir mensagem SHADOW:", error));
    }
  });
}

waitForShadow().then(connect).catch(error => { console.error(error); process.exitCode = 1; });
