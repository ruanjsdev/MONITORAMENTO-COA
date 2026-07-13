import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Router } from "express";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { enqueueExcelCommand, waitForExcelResult } from "../excel-homologation/routes.js";
import { HttpError } from "../../errors/http-error.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
const configuredRoot = process.env.LOCAL_OPERATIONAL_WORKBOOK_ROOT?.trim() || "planilhas-homologacao";
const root = path.resolve(path.isAbsolute(configuredRoot) ? configuredRoot : path.join(projectRoot, configuredRoot));
export type LocalOperationalWorkbook = { id:string; name:string; filePath:string; operations:string[]; enabled:boolean; writable:boolean };
function registry(): LocalOperationalWorkbook[] {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes:true }).filter(e => e.isFile() && e.name.toLowerCase().endsWith(".dev.xlsm")).map(e => ({ id: e.name.toLowerCase().replace(/[^a-z0-9]+/g,"-"), name:e.name, filePath:path.join(root,e.name), operations:[], enabled:true, writable: process.env.LOCAL_OPERATIONAL_EXCEL_WRITE === "true" }));
}
function find(id:string) { const item = registry().find(w => w.id === id); if (!item) throw new HttpError(404,"Planilha local não cadastrada."); return item; }
async function command(type:any, workbook?:LocalOperationalWorkbook, options: { worksheet?: string; payload?: Record<string, unknown> } = {}) { const c = { commandId:randomUUID(), correlationId:randomUUID(), requestedAt:new Date().toISOString(), requestedBy:"local-operator", type, workbook:workbook?.filePath, worksheet:options.worksheet, payload:options.payload ?? {}, simulation:type === "PREVIEW_CHANGE", timeoutMs:30000 } as any; enqueueExcelCommand(c); return waitForExcelResult(c.commandId, 35000); }
export function localWorkbookRoutes(prisma = new PrismaClient()) {
 const r=Router();
 r.get("/", (_q,res)=>res.json({ mode:"LOCAL_OPERATIONAL", officialExcelWrite:false, localOperationalExcelWrite:process.env.LOCAL_OPERATIONAL_EXCEL_WRITE === "true", workbooks:registry().map(w=>({...w, exists:fs.existsSync(w.filePath), path:w.filePath.replace(root,"<planilhas-homologacao>"), status:"CLOSED"})) }));
 r.get("/status", (_q,res)=>res.json({ mode:"LOCAL_OPERATIONAL", root:root.replace(process.cwd(),"<project>"), workbooks:registry().map(w=>({...w, exists:fs.existsSync(w.filePath), status:"CLOSED"})), officialExcelWrite:false }));
 r.post("/:id/open", async (req,res,next)=>{ try { const w=find(req.params.id); if (!w.enabled) throw new HttpError(409,"Planilha desabilitada."); res.json(await command("OPEN_LOCAL_WORKBOOK",w)); } catch(e){next(e);} });
 r.post("/open-all", async (_req,res,next)=>{ try { const out=[]; for(const w of registry()) out.push(await command("OPEN_LOCAL_WORKBOOK",w)); res.json({results:out}); } catch(e){next(e);} });
 r.post("/open-folder", async (_req,res,next)=>{ try { res.json(await command("OPEN_LOCAL_FOLDER")); } catch(e){next(e);} });
 r.post("/preview/:pendingId", async (req,res,next)=>{ try {
   const pending = await prisma.pendingChange.findUnique({ where:{ id:String(req.params.pendingId) }, include:{ operation:true, incomingMessage:{ include:{ parsedMessages:true } } } });
   if (!pending) throw new HttpError(404,"Pendência não encontrada.");
   const workbook = find(pending.operation?.name === "Plantio Mecanizado" ? "planilha-plantio-cana-dev-xlsm" : "acompanhamento-tratos-culturais-dev-xlsm");
   const worksheet = pending.operation?.sheetName || (pending.operation?.name === "Plantio Mecanizado" ? "PLANTIO" : "CPD");
   const findResult = await command("FIND_EQUIPMENT", workbook, { worksheet, payload:{ fleetColumn:"F", fleet:pending.equipmentCode, headerRow:7 } } as any);
   const match = (findResult.result as any)?.candidates?.[0];
   if (!findResult.success || (findResult.result as any)?.status !== "UNIQUE_MATCH" || !match) throw new HttpError(409,"Frota não localizada de forma única na planilha .dev.",{ code:"AMBIGUOUS_MATCH" });
   const row = Number(match.row);
   const parsed = pending.incomingMessage?.parsedMessages?.map(item => item.parsedJson as any).find(item => String(item.mainEquipment) === pending.equipmentCode) ?? {};
   const normalized = (parsed.normalized ?? {}) as Record<string,unknown>;
   const proposed = { status:pending.newStatus, startDate:normalized.startDate ?? "", startTime:normalized.startTime ?? "", forecastDate:normalized.forecastDate ?? "", forecastTime:normalized.forecastTime ?? "", description:pending.description };
   if (String(proposed.status).toUpperCase() === "R") { proposed.description="RODANDO"; proposed.startDate=""; proposed.startTime=""; proposed.forecastDate=""; proposed.forecastTime=""; }
   const cells = { statusCell:`H${row}`, startDateCell:`K${row}`, startTimeCell:`L${row}`, forecastDateCell:`M${row}`, forecastTimeCell:`N${row}`, descriptionCell:`S${row}` };
   const preview = await command("PREVIEW_CHANGE", workbook, { worksheet, payload:{ ...cells, proposed, mappingConfirmed:false } } as any);
   if (!preview.success) throw new HttpError(409,"Leitura da prévia local falhou.",{ code:preview.error?.code });
   res.json({ mode:"LOCAL_OPERATIONAL", officialExcelWrite:false, confirmed:false, confirmationRequired:"CONFIRMO ALTERAÇÃO NA PLANILHA LOCAL", pendingId:pending.id, workbook:{ id:workbook.id, name:workbook.name, path:workbook.filePath.replace(root,"<planilhas-homologacao>") }, worksheet, fleet:pending.equipmentCode, implement:parsed.attachments?.[0] ?? null, row, cells, current:(preview.result as any)?.current ?? {}, proposed, backup:null, message:"Prévia local pronta; nenhuma célula foi escrita." });
 } catch(e){next(e);} });
 return r;
}
