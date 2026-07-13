import { describe, expect, it } from "vitest";
import { mapAvailableGroups, maskJid, requireConnectedWhatsApp, searchAvailableGroups, selectSingleGroup, shadowGroupPersistence, shouldCaptureShadowMessage } from "../apps/api/src/modules/whatsapp-shadow/group-policy";

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
});
