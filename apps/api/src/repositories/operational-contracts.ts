import{OperationalEvent}from"@coa-bot/shared";import{ParsedOperationalMessage}from"../services/operational-parser/index.js";
export type SimulatedMessage={id:string;idempotencyKey:string;group:string;sender:string;receivedAt:string;shift:string;text:string;interpretations:ParsedOperationalMessage[];status:"PARSED"|"PENDING"|"PROCESSED"|"REJECTED"};
export type OperationalPending={id:string;messageId:string;interpretation:ParsedOperationalMessage;baselineStatus:string|null;baselineDescription:string|null;baselineSector:string|null;status:"OPEN"|"APPROVED"|"REJECTED"|"DUPLICATE";reason:"CHANGE"|"DOUBT"|"CONFLICT";createdAt:string;resolvedAt?:string};
export interface MessageRepository{list():SimulatedMessage[];find(id:string):SimulatedMessage|undefined;save(value:SimulatedMessage):void;findByKey(key:string):SimulatedMessage|undefined}
export interface PendingRepository{list():OperationalPending[];find(id:string):OperationalPending|undefined;save(value:OperationalPending):void}
export interface EventRepository{list():readonly OperationalEvent[];append(event:OperationalEvent):void}
export interface ProjectionRepository<T=unknown>{get():T|undefined;replace(value:T):void;clear():void}
export interface ReportRepository{getDraft():string;saveDraft(value:string):void}
export class MemoryRepository<T extends{id:string}>{#items:T[]=[];list(){return[...this.#items]}find(id:string){return this.#items.find(x=>x.id===id)}save(value:T){this.#items.push(value)}}
export class MemoryMessageRepository extends MemoryRepository<SimulatedMessage> implements MessageRepository{findByKey(key:string){return this.list().find(x=>x.idempotencyKey===key)}}
export class MemoryPendingRepository extends MemoryRepository<OperationalPending> implements PendingRepository{}
export class MemoryProjectionRepository<T> implements ProjectionRepository<T>{#value?:T;get(){return this.#value}replace(value:T){this.#value=value}clear(){this.#value=undefined}}
export class MemoryReportRepository implements ReportRepository{#draft="";getDraft(){return this.#draft}saveDraft(value:string){this.#draft=value}}
