import { describe, expect, it } from "vitest";
import { mapAvailableGroups, maskJid, requireConnectedWhatsApp, resolveAuditUserId, searchAvailableGroups, selectSingleGroup, shadowGroupPersistence, shouldCaptureShadowMessage } from "../apps/api/src/modules/whatsapp-shadow/group-policy";
import { parseReport } from "../apps/api/src/services/operational-parser";
import { normalizeOperationalExcelUpdate } from "@coa-bot/excel-contracts";

const groups=[{externalId:"120363001@g.us",name:"COA Plantio",participantCount:12},{externalId:"120363002@g.us",name:"Oficina",participantCount:8}];

describe("seleção de grupos WhatsApp em SHADOW",()=>{
  it("carrega grupos reais com quantidade de participantes",()=>expect(mapAvailableGroups([{id:"120363001@g.us",subject:"COA Plantio",participants:[{},{}]}])).toEqual([{externalId:"120363001@g.us",name:"COA Plantio",participantCount:2}]));
  it("pesquisa grupo por nome",()=>expect(searchAvailableGroups(groups,"plantio").map(group=>group.name)).toEqual(["COA Plantio"]));
  it("seleciona somente um grupo",()=>expect(selectSingleGroup(groups,"120363002@g.us").filter(group=>group.selected)).toHaveLength(1));
  it("persiste o JID e as travas do piloto",()=>expect(shadowGroupPersistence("120363001@g.us")).toMatchObject({externalId:"120363001@g.us",isActive:true,isMonitored:true,receivesReports:false,isTestGroup:true}));
  it("ignora grupos não selecionados",()=>expect(shouldCaptureShadowMessage("120363001@g.us","120363002@g.us")).toBe(false));
  it("captura mensagem somente do grupo monitorado",()=>expect(shouldCaptureShadowMessage("120363001@g.us","120363001@g.us")).toBe(true));
  it("impede seleção com WhatsApp desconectado",()=>expect(()=>requireConnectedWhatsApp("OFFLINE")).toThrow("WHATSAPP_DISCONNECTED"));
  it("oculta parcialmente o JID",()=>expect(maskJid("120363001@g.us")).toBe("1203••••001@g.us"));
  it("resolve o usuário real do PostgreSQL pelo e-mail mesmo com token antigo",async()=>expect(await resolveAuditUserId({user:{findUnique:async()=>({id:"db-user-id"})}},"admin@coa.local")).toBe("db-user-id"));
  it("parser real cria duas propostas para o relatório capturado",()=>{const report=parseReport("Plantio Mecanizado\n\n1531/830 = rodando\n164 = parado, problema mecânico, previsão 13/07 às 12:00");expect(report.items.map(item=>item.mainEquipment)).toEqual(["1531","164"]);expect(report.items.map(item=>item.proposedStatus)).toEqual(["RODANDO","PARADO"])});
  it("proposta R limpa datas e previsão parada recebe início",()=>{const running=normalizeOperationalExcelUpdate({status:"R",receivedAt:"2026-07-13T03:31:49Z"});const stopped=normalizeOperationalExcelUpdate({status:"P",description:"PROBLEMA MECÂNICO",receivedAt:"2026-07-13T03:31:49Z",forecastAt:"2026-07-13T15:00:00Z",forecastInformed:true});expect(running).toMatchObject({description:"RODANDO",startDate:null,forecastDate:null});expect(stopped).toMatchObject({valid:true,startDate:"13/07/2026",startTime:"00:31",forecastTime:"12:00"})});
});
