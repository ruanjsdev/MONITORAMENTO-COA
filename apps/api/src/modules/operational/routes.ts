import { Router } from "express";
import { OperationalEventType } from "@coa-bot/shared";
import { OperationalEngine } from "../../services/operational-engine.js";
import { OperationalWorkflow, WorkflowError } from "../../services/operational-workflow.js";
import { operationalDecisionSchema, operationalParseSchema, operationalSimulateSchema } from "@coa-bot/validation";
import { HttpError } from "../../errors/http-error.js";

export function operationalRoutes() {
  const router = Router(); const now = new Date(); const ago=(minutes:number)=>new Date(now.getTime()-minutes*60_000).toISOString();
  const common={shift:"C",user:"Operador Simulado",responsible:"Operador Simulado",source:"SIMULATION" as const,simulated:true,approved:true,priority:"normal" as const};
  const engine = new OperationalEngine({ simulationMode:true, seed:[
    {...common,type:"SHIFT_STARTED",timestamp:ago(120),observation:"Turno C iniciado"},
    {...common,type:"STOPPED",timestamp:ago(42),fleet:"626",operation:"Plantio Mecanizado",newStatus:"PARADO",newDescription:"Cilindro de inclinação quebrado",newSector:"D1",priority:"high"},
    {...common,type:"STOPPED",timestamp:ago(31),fleet:"1530/2006",implement:"2006",operation:"Colheita de Muda",newStatus:"PARADO",newDescription:"Atolada",newSector:"Chapadinha",priority:"high"},
    {...common,type:"MESSAGE_RECEIVED",timestamp:ago(19),fleet:"625",operation:"Plantio Mecanizado",group:"Plantio / Muda / Preparo",originalMessage:"Frota 625 parada, bico injetor e fumaça preta",observation:"Mensagem recebida"},
    {...common,type:"PENDING_CREATED",timestamp:ago(18),fleet:"625",operation:"Plantio Mecanizado",group:"Plantio / Muda / Preparo",newStatus:"PARADO",newDescription:"Bico injetor / fumaça preta",newSector:"D1",approved:false,priority:"urgent"},
    {...common,type:"STOPPED",timestamp:ago(18),fleet:"625",operation:"Plantio Mecanizado",newStatus:"PARADO",newDescription:"Bico injetor / fumaça preta",newSector:"D1",priority:"urgent"},
    {...common,type:"DISPLACED",timestamp:ago(12),fleet:"1531/830",implement:"830",operation:"Colheita de Muda",newStatus:"DESLOCAMENTO",newDescription:"Deslocamento para Chapadinha",newSector:"Estrada"},
    {...common,type:"STATUS_CHANGED",timestamp:ago(8),fleet:"1601",operation:"Preparo de Solo",newStatus:"DISPONIVEL",newDescription:"Disponível",newSector:"J2"},
    {...common,type:"ERROR",timestamp:ago(4),operation:"CPD",group:"CPD",originalMessage:"Informação sem identificação da frota",observation:"Falha de processamento",priority:"high"}
  ]});
  const workflow=new OperationalWorkflow(engine);
  const pendencies=[{id:"pen-625",eventId:engine.timeline({fleet:"625"}).find(e=>e.type==="PENDING_CREATED")!.id,operation:"Plantio Mecanizado",subject:"Frota 625",reason:"Alteração aguardando aprovação",since:ago(18),priority:"urgent",status:"open"},{id:"pen-626",operation:"Plantio Mecanizado",subject:"Frota 626",reason:"Máquina continua parada",since:ago(42),priority:"high",status:"open"},{id:"pen-cpd",operation:"CPD",subject:"Mensagem sem frota",reason:"Falha de processamento",since:ago(4),priority:"high",status:"open"}];
  const systems=[["API","online","API local respondendo"],["Banco de dados","simulated","Eventos em memória; contrato Prisma preparado"],["WhatsApp","simulated","Comandos não executáveis"],["Excel","simulated","Comandos não executáveis"],["Agente Excel","simulated","Execução bloqueada"],["Monitoramento","online","OperationalEngine ativo"],["Notificações","simulated","Registros locais"],["Modo de simulação","online","Proteção externa ativa"]].map(([name,state,message],i)=>({id:`sys-${i}`,name,state,message,updatedAt:now.toISOString(),testable:true}));
  const messages=engine.timeline().filter(e=>e.type==="MESSAGE_RECEIVED"||e.type==="ERROR").map(e=>({id:e.id,text:e.originalMessage??e.observation,sender:e.user,group:e.group,operation:e.operation,status:e.type==="ERROR"?"FAILED":"PENDING_APPROVAL",receivedAt:e.timestamp}));

  router.get("/snapshot",(_req,res)=>{const fleets=engine.currentState();const grouped=Object.values(fleets.reduce<Record<string,{operation:string;machines:number;stopped:number;updatedAt:string}>>((acc,item)=>{const row=acc[item.operation]??={operation:item.operation,machines:0,stopped:0,updatedAt:item.updatedAt};row.machines++;if(item.status==="PARADO")row.stopped++;if(item.updatedAt>row.updatedAt)row.updatedAt=item.updatedAt;acc[item.operation]=row;return acc;},{}));res.json({simulationMode:true,shift:"C",shiftEndsAt:new Date(now.getTime()+3_600_000).toISOString(),fleets,messages,pendencies,systems,operations:grouped.map(x=>`${x.operation}: ${x.machines} máquinas · ${x.stopped} paradas`),operationSummary:grouped,timeline:engine.timeline().slice(0,12),nextReport:"21:45 · Plantio",shiftReportStatus:"Aguardando revisão"});});
  router.get("/timeline",(req,res)=>res.json(engine.timeline({since:req.query.since as string|undefined,operation:req.query.operation as string|undefined,fleet:req.query.fleet as string|undefined,shift:req.query.shift as string|undefined,group:req.query.group as string|undefined})));
  router.post("/messages/parse",(req,res)=>{const input=operationalParseSchema.safeParse(req.body);if(!input.success)throw new HttpError(400,"Mensagem inválida.",input.error.issues);res.json(workflow.parse(input.data.text,input.data));});
  router.post("/messages/simulate",(req,res,next)=>{try{const input=operationalSimulateSchema.safeParse(req.body);if(!input.success)throw new HttpError(400,"Mensagem inválida.",input.error.issues);res.status(201).json(workflow.simulate(input.data))}catch(error){if(error instanceof WorkflowError)return res.status(error.status).json({message:error.message});next(error)}});
  router.get("/messages",(_req,res)=>res.json(workflow.messages.list()));
  router.get("/messages/:id",(req,res)=>{const item=workflow.messages.find(String(req.params.id));if(!item)throw new HttpError(404,"Mensagem não encontrada.");res.json(item)});
  router.post("/messages/:id/create-pending-change",(req,res,next)=>{try{res.status(201).json(workflow.createPendings(String(req.params.id)))}catch(error){if(error instanceof WorkflowError)return res.status(error.status).json({message:error.message});next(error)}});
  router.get("/events",(_req,res)=>res.json(engine.timeline()));
  router.get("/equipment/:fleet/history",(req,res)=>res.json(engine.fleetHistory(String(req.params.fleet))));
  router.get("/equipment/:fleet/current-state",(req,res)=>res.json(engine.currentState(String(req.params.fleet))[0]??null));
  router.get("/equipment/:fleet/downtime",(req,res)=>res.json(engine.stopMetrics(String(req.params.fleet))));
  router.get("/pending",(_req,res)=>res.json(workflow.pendings.list()));
  router.post("/pending/:id/approve",(req,res,next)=>{try{const input=operationalDecisionSchema.parse(req.body);res.json(workflow.approve(String(req.params.id),input.responsible))}catch(error){if(error instanceof WorkflowError)return res.status(error.status).json({message:error.message});next(error)}});
  router.post("/pending/:id/reject",(req,res,next)=>{try{const input=operationalDecisionSchema.parse(req.body);res.json(workflow.reject(String(req.params.id),input.responsible,input.reason))}catch(error){if(error instanceof WorkflowError)return res.status(error.status).json({message:error.message});next(error)}});
  router.post("/projections/rebuild",(_req,res)=>res.json(workflow.rebuild()));
  router.get("/shift-report/draft",(_req,res)=>res.json(workflow.shiftDraft()));
  router.get("/fleets/:fleet",(req,res)=>res.json(engine.fleetHistory(String(req.params.fleet))));
  router.get("/shift-journal",(req,res)=>res.json(engine.shiftJournal(String(req.query.shift??"C"))));
  router.get("/search",(req,res)=>res.json(engine.search(String(req.query.q??""))));
  router.post("/events",(req,res)=>{const event=engine.append({...req.body,type:req.body.type as OperationalEventType,source:"PANEL",approved:Boolean(req.body.approved),priority:req.body.priority??"normal",responsible:res.locals.user?.name??"Operador",user:res.locals.user?.name??"Operador"});res.status(201).json({event,excelCommands:engine.toExcelCommands(event),whatsAppCommands:engine.toWhatsAppCommands(event),externalActionExecuted:false});});
  router.post("/pendencies/:id/action",(req,res)=>{const item=pendencies.find(x=>x.id===req.params.id);if(item&&["resolve","reject","duplicate","approve"].includes(String(req.body.action)))item.status="resolved";const event=engine.append({...common,type:req.body.action==="approve"?"PENDING_APPROVED":"CONFIRMED",fleet:item?.subject.replace("Frota ",""),operation:item?.operation,source:"PANEL",observation:`Pendência ${req.body.action}`});res.json({simulated:true,externalActionExecuted:false,item,event,action:req.body.action});});
  router.post("/system/:id/test",(req,res)=>res.json({simulated:true,externalActionExecuted:false,id:req.params.id,testedAt:new Date().toISOString()}));
  router.get("/send-preview",(_req,res)=>res.json({operation:"Plantio Mecanizado",group:"Plantio / Muda / Preparo",shift:"C",scheduledAt:"21:45",spreadsheet:"Planilha Plantio cana.xlsm",sheet:"PLANTIO",range:"A1:AI26",legend:"🚜 Plantio — situação atual do turno",imagePreview:"Prévia simulada da área A1:AI26",simulationMode:true}));
  router.post("/send-preview/confirm",(req,res)=>{const event=engine.append({...common,type:"REPORT_SENT",source:"PANEL",operation:"Plantio Mecanizado",group:req.body.destination,observation:req.body.legend});res.json({simulated:true,externalActionExecuted:false,status:"PROCESSED",event,destination:req.body.destination,legend:req.body.legend,simulatedAt:event.timestamp});});
  router.get("/shift-report",(_req,res)=>res.json({status:"DRAFT",journal:engine.shiftJournal("C"),text:"*📋 RELATÓRIO DE TROCA DE TURNO*\n\n🚜 *PLANTIO*\n625 e 626 paradas, aguardando revisão.\n\n⚠️ *PENDÊNCIAS*\nRevisar paradas e mensagem sem identificação."}));
  router.post("/shift-report",(req,res)=>{const event=engine.append({...common,type:req.body.action==="confirm"?"SHIFT_REPORT_SENT":"SHIFT_REPORT_CREATED",source:"PANEL",observation:"Relatório de troca de turno"});res.json({simulated:true,externalActionExecuted:false,status:req.body.action==="confirm"?"CONFIRMED":"DRAFT",text:req.body.text,event,savedAt:event.timestamp});});
  return router;
}
