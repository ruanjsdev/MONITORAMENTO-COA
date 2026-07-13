import { mkdir, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import makeWASocket, { DisconnectReason, useMultiFileAuthState } from "baileys";
import QRCode from "qrcode";
import terminalQr from "qrcode-terminal";

type QrState = "AWAITING_QR" | "QR_VALID" | "QR_EXPIRED" | "CONNECTED" | "DISCONNECTED";
const here = path.dirname(fileURLToPath(import.meta.url));
const apiUrl = process.env.API_URL ?? "http://localhost:3333";
const token = process.env.WHATSAPP_SHADOW_TOKEN ?? "local-dev-whatsapp-shadow";
const authDir = process.env.WHATSAPP_AUTH_DIR ?? path.resolve(here, "../../../whatsapp-session");
const qrPath = process.env.WHATSAPP_QR_PATH ?? path.resolve(here, "../../../whatsapp-runtime/qr.png");
const headers = { "Content-Type": "application/json", "x-whatsapp-shadow-token": token };
let qrGeneration = 0;
let expiryTimer: ReturnType<typeof setTimeout> | undefined;
let selectedGroupId: string | null = null;
let refreshVersion = 0;
process.stdout.setDefaultEncoding("utf8");
if (process.platform === "win32" && process.stdout.isTTY) spawnSync("chcp", ["65001"], { shell: true, stdio: "ignore" });

async function post(pathname: string, body: unknown) {
  const response = await fetch(apiUrl + pathname, { method: "POST", headers, body: JSON.stringify(body) });
  if (!response.ok) throw new Error(`API SHADOW ${response.status}: ${await response.text()}`);
  return response.json();
}

async function publishState(qrState: QrState, details: Record<string, unknown> = {}) {
  await post("/whatsapp-shadow/local/status", { qrState, ...details, connected: qrState === "CONNECTED" });
}

async function removeQr() {
  await rm(qrPath, { force: true });
}

async function syncGroups(socket: ReturnType<typeof makeWASocket>) {
  const groups = await socket.groupFetchAllParticipating();
  await post("/whatsapp-shadow/local/groups", { groups: Object.values(groups).map(group => ({ id: group.id, name: group.subject, participantCount: group.participants.length })) });
}

async function syncControl(socket: ReturnType<typeof makeWASocket>) {
  const selectedResponse = await fetch(apiUrl + "/whatsapp-shadow/local/selected-group", { headers });
  if (selectedResponse.ok) selectedGroupId = (await selectedResponse.json() as { externalId: string | null }).externalId;
  const refreshResponse = await fetch(apiUrl + "/whatsapp-shadow/local/refresh-request", { headers });
  if (refreshResponse.ok) {
    const requested = (await refreshResponse.json() as { version: number }).version;
    if (requested > refreshVersion) { refreshVersion = requested; await syncGroups(socket); }
  }
}

async function publishQr(qr: string) {
  const generation = ++qrGeneration;
  if (expiryTimer) clearTimeout(expiryTimer);
  await mkdir(path.dirname(qrPath), { recursive: true });
  await QRCode.toFile(qrPath, qr, { type: "png", width: 420, margin: 2, errorCorrectionLevel: "M" });
  console.log("WHATSAPP REAL — MODO SOMENTE LEITURA\nQR válido salvo como PNG e disponibilizado no painel.");
  if (process.stdout.isTTY) {
    console.log("QR UTF-8 no terminal:");
    terminalQr.generate(qr, { small: true });
  }
  await publishState("QR_VALID", { generatedAt: new Date().toISOString(), generation });
  expiryTimer = setTimeout(async () => {
    if (generation !== qrGeneration) return;
    await removeQr();
    await publishState("QR_EXPIRED", { expiredAt: new Date().toISOString(), generation }).catch(console.error);
  }, 55_000);
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
  await publishState("AWAITING_QR");
  const { state, saveCreds } = await useMultiFileAuthState(authDir);
  const socket = makeWASocket({ auth: state, printQRInTerminal: false, markOnlineOnConnect: false, syncFullHistory: false });
  let controlTimer: ReturnType<typeof setInterval> | undefined;
  socket.ev.on("creds.update", saveCreds);
  socket.ev.on("connection.update", async update => {
    if (update.qr) await publishQr(update.qr);
    if (update.connection === "open") {
      qrGeneration++;
      if (expiryTimer) clearTimeout(expiryTimer);
      await removeQr();
      await publishState("CONNECTED", { connectedAt: new Date().toISOString() });
      console.log("WhatsApp SHADOW conectado. Envio, reação, exclusão e alteração de grupos bloqueados.");
      await syncGroups(socket);
      await syncControl(socket);
      controlTimer = setInterval(() => syncControl(socket).catch(error => console.error("Falha ao sincronizar controle SHADOW:", error)), 3_000);
    }
    if (update.connection === "close") {
      qrGeneration++;
      if (expiryTimer) clearTimeout(expiryTimer);
      if (controlTimer) clearInterval(controlTimer);
      await removeQr();
      await publishState("DISCONNECTED", { disconnectedAt: new Date().toISOString() }).catch(() => undefined);
      const code = (update.lastDisconnect?.error as { output?: { statusCode?: number } })?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) setTimeout(connect, 2_000);
    }
  });
  socket.ev.on("messages.upsert", async event => {
    if (event.type !== "notify") return;
    for (const message of event.messages) {
      const groupId = message.key.remoteJid;
      if (!groupId?.endsWith("@g.us") || message.key.fromMe) continue;
      if (!selectedGroupId || groupId !== selectedGroupId) { await post("/whatsapp-shadow/local/ignored", { groupId, messageId: message.key.id }).catch(() => undefined); continue; }
      const text = message.message?.conversation ?? message.message?.extendedTextMessage?.text ?? message.message?.imageMessage?.caption;
      if (!text) continue;
      await post("/whatsapp-shadow/local/messages", { messageId: message.key.id, groupId, sender: message.key.participant, text, receivedAt: new Date(Number(message.messageTimestamp) * 1000).toISOString() }).catch(error => console.error("Falha ao persistir mensagem SHADOW:", error));
    }
  });
}

waitForShadow().then(connect).catch(error => { console.error(error); process.exitCode = 1; });
