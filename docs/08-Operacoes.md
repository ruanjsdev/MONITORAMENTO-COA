# 08 - Operacoes

## Objetivo

Documentar os tipos de operacoes agricolas que o COA-BOT devera tratar, o ciclo de vida de uma informacao operacional e os criterios para validacao, aprovacao e registro.

## Descricao completa

As operacoes representam os eventos praticos acompanhados pelo COA. Nesta fase, o sistema deve considerar principalmente os contextos indicados pelas planilhas oficiais: plantio de cana e tratos culturais.

Cada operacao deve possuir dados obrigatorios, regras de validacao, destino na planilha e impacto operacional. A documentacao devera evoluir conforme novos tipos de atividade forem incorporados.

## Funcionamento

Fluxo de uma operacao:

1. Operador envia relatorio no WhatsApp.
2. Sistema identifica o tipo de operacao.
3. Sistema extrai campos relevantes.
4. Sistema valida completude e coerencia.
5. Sistema localiza referencia na planilha oficial.
6. Sistema cria proposta de atualizacao.
7. Administrador aprova ou rejeita.
8. Sistema atualiza a planilha.
9. Sistema notifica resultado.
10. Sistema registra historico.

## Responsabilidades

O dominio de operacoes devera:

- Definir tipos de atividade suportados.
- Padronizar nomes e codigos.
- Estabelecer campos obrigatorios.
- Determinar planilha de destino.
- Determinar aba e regiao da planilha.
- Indicar regras de conflito.
- Indicar impacto em relatorios.

## Operacoes iniciais

### Plantio de cana

Relacionado a informacoes de plantio registradas na planilha `Planilha Plantio cana.xlsm`. Campos futuros poderao incluir data, area, frente, fazenda, talhao, variedade, equipe, quantidade, status e observacoes.

### Tratos culturais

Relacionado a atividades de acompanhamento registradas na planilha `Acompanhamento Tratos Culturais.xlsm`. Campos futuros poderao incluir data, atividade, area, talhao, equipe, insumo, quantidade, maquina, status e observacoes.

## Estados de uma operacao

- `RECEBIDA`: mensagem capturada.
- `INTERPRETADA`: dados extraidos.
- `INVALIDA`: dados insuficientes ou inconsistentes.
- `PENDENTE_APROVACAO`: proposta aguardando decisao.
- `APROVADA`: autorizada por administrador.
- `REJEITADA`: recusada por administrador.
- `APLICADA`: planilha atualizada.
- `FALHA_APLICACAO`: erro ao atualizar planilha.
- `CANCELADA`: descartada por regra ou decisao administrativa.

## Futuras expansoes

- Novas operacoes agricolas.
- Operacoes por safra.
- Operacoes por unidade ou regiao.
- Priorizacao de atividades criticas.
- Indicadores de produtividade.
- Relatorios de atraso.
- Fluxos especificos por tipo de atividade.

## Dependencias

- Planilhas oficiais.
- Regras de negocio por operacao.
- Padroes de mensagem dos operadores.
- Cadastro de usuarios e grupos.
- Historico operacional.

## Observacoes

O sistema deve ser tolerante a variacoes naturais de texto, mas rigoroso na decisao de atualizar planilhas oficiais. Quando houver duvida, deve solicitar confirmacao.

## Operacoes no relatorio de troca de turno

O relatorio de troca de turno devera contemplar inicialmente:

- Plantio Mecanizado.
- Colheita de Muda.
- Preparo de Solo.
- CPD.
- Cultivo.
- Correcao de Solo.
- Compostagem.

Para cada operacao, o sistema devera tentar apresentar situacao atual, setor, fazenda, modulo ou talhao, frotas em operacao, frotas paradas, motivos das paradas, equipamentos disponiveis, deslocamentos, mudancas de area, retornos, ocorrencias do turno, pendencias, informacoes relevantes para o proximo turno, horario da ultima atualizacao valida e quantidade de alteracoes registradas durante o turno.

Operacoes sem informacao no periodo nao devem receber dados inventados. O relatorio podera usar frases padronizadas como "Sem ocorrencia relevante registrada", "Situacao nao atualizada no encerramento do turno", "Aguardando confirmacao" ou "Informacao nao registrada".

## Estado atual das operacoes

Cada operacao devera possuir estado atual derivado de eventos confirmados. O estado podera indicar operacao em andamento, parada, sem area, aguardando condicao de solo, em deslocamento, encerrada, sem atualizacao recente ou com pendencias.

Eventos de frota, equipamento e mudanca de local devem atualizar a visao operacional somente apos validacao e aprovacao quando exigido. Operacoes sem atualizacao recente devem aparecer no dashboard, na sincronizacao e no relatorio de troca de turno.
