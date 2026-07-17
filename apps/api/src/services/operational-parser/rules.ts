import { MainStatus, OperationalSituation } from "./types.js";
export const statusRules: Array<[RegExp, MainStatus]> = [
  [/\b(voltou a rodar|rodando|rodou)\b/, "RODANDO"],
  [/\b(disponivel|liberada?)\b/, "DISPONIVEL"],
  [/\bmanutencao\b/, "MANUTENCAO"],
  [/\b(parad[oa]|quebrad[oa])\b/, "PARADO"],
  [/\b(sem operacao)\b/, "SEM_OPERACAO"]
];
export const situationRules: Array<[RegExp, OperationalSituation]> = [
  [/deslocamento/, "DESLOCAMENTO"],
  [/\b(?:aguardando|ag)\s*\/?\s*area\b/, "AGUARDANDO_AREA"],
  [/atolad[oa]/, "ATOLADO"],
  [/apoio|pessoal da correcao/, "APOIO_OUTRA_OPERACAO"],
  [/solo umido/, "SOLO_UMIDO"],
  [/previsao/, "AGUARDANDO_PREVISAO"]
];
export const operations: Array<[RegExp, string]> = [
  [/plantio/, "Plantio Mecanizado"],
  [/colheita( de muda)?/, "Colheita de Muda"],
  [/preparo( de solo)?/, "Preparo de Solo"],
  [/correcao de solo/, "Correção de Solo"],
  [/cultivo/, "Cultivo"],
  [/compostagem/, "Compostagem"],
  [/\bcpd\b|pre-emergente/, "CPD"]
];
