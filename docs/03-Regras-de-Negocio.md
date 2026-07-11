# 03 - Regras de Negocio

## Objetivo

Documentar as regras de negocio iniciais que orientarao a interpretacao de relatorios operacionais, validacao de dados, comparacao com planilhas oficiais, aprovacao administrativa e atualizacao controlada das informacoes.

## Descricao completa

As regras de negocio representam o nucleo de confiabilidade do COA-BOT. Elas definem quando uma mensagem pode ser aceita, quando deve ser rejeitada, quando precisa de revisao humana e quando pode gerar uma proposta de alteracao nas planilhas oficiais.

As regras deverao ser documentadas, versionadas e revisadas sempre que houver mudanca na operacao agricola, no formato das planilhas ou no processo interno do COA.

Inicialmente, o sistema devera tratar as planilhas existentes em `planilhas/` como fonte oficial:

- `Acompanhamento Tratos Culturais.xlsm`
- `Planilha Plantio cana.xlsm`

Qualquer atualizacao nessas planilhas devera respeitar a estrutura original, incluindo abas, formulas, macros, formatos e imagens geradas para relatorio.

## Funcionamento

O processamento de uma mensagem operacional devera seguir estas etapas:

1. Verificar se o grupo e autorizado.
2. Verificar se o remetente e autorizado ou reconhecido.
3. Identificar se a mensagem possui formato operacional.
4. Extrair dados relevantes.
5. Validar campos obrigatorios.
6. Validar coerencia dos valores.
7. Comparar com dados ja existentes na planilha.
8. Identificar duplicidade, conflito ou ausencia de referencia.
9. Gerar proposta de atualizacao.
10. Encaminhar para aprovacao quando necessario.
11. Atualizar a planilha apenas apos aprovacao.
12. Registrar toda a decisao.

## Responsabilidades

As regras de negocio devem cobrir:

- Identificacao de tipo de operacao.
- Campos obrigatorios por tipo de relatorio.
- Valores permitidos.
- Formatos aceitos para datas, horas, nomes, codigos e quantidades.
- Tratamento de mensagens incompletas.
- Tratamento de mensagens duplicadas.
- Tratamento de dados divergentes.
- Criterios de aprovacao.
- Criterios de rejeicao.
- Criterios de reprocessamento.

## Regras iniciais

### Fonte oficial

As planilhas oficiais sao a fonte primaria para consolidacao operacional enquanto nao houver outro sistema corporativo definido como origem dos dados.

### Aprovacao

Nenhuma alteracao nas planilhas oficiais deve ser realizada sem aprovacao de administrador quando:

- O dado alterar valor ja existente.
- A mensagem tiver interpretacao incerta.
- O operador nao estiver plenamente autorizado.
- Houver divergencia com informacao anterior.
- O relatorio afetar indicadores consolidados.

### Integridade

O sistema deve preservar formulas, macros, estilos, filtros, imagens, graficos e estruturas existentes nas planilhas.

### Auditoria

Toda atualizacao deve manter registro de:

- Mensagem original.
- Usuario remetente.
- Grupo de origem.
- Data e hora de recebimento.
- Dados extraidos.
- Validacoes aplicadas.
- Administrador aprovador.
- Data e hora da decisao.
- Alteracoes realizadas.
- Resultado final.

### Inconsistencias

Quando houver inconsistencia, o sistema deve preferir solicitar revisao humana em vez de assumir uma correcao automatica.

## Futuras expansoes

No futuro, as regras poderao ser configuradas por painel administrativo, permitindo:

- Criacao de novas regras sem alteracao de codigo.
- Definicao de campos obrigatorios por operacao.
- Controle de tolerancias.
- Mapeamento visual de colunas do Excel.
- Regras por frente, fazenda, unidade ou safra.
- Fluxos de aprovacao personalizados.

## Dependencias

As regras dependem de:

- Conhecimento formal do processo do COA.
- Estrutura das planilhas oficiais.
- Lista de usuarios autorizados.
- Definicao de administradores.
- Padroes de mensagem usados pelos operadores.
- Politica de auditoria da empresa.

## Observacoes

Toda regra de negocio deve ser escrita de forma verificavel. Sempre que possivel, uma regra deve permitir teste objetivo com exemplos de entrada, resultado esperado e motivo da decisao.

Regras ambiguas devem ser tratadas como pendencias de negocio antes da implementacao.

## Regras para relatorio de troca de turno

O relatorio de troca de turno devera obedecer as seguintes regras:

1. Considerar somente informacoes pertencentes ao periodo do turno selecionado.
2. Usar informacoes anteriores apenas para explicar estado inicial ou pendencia que atravessou turnos.
3. Priorizar mensagens mais recentes sobre mensagens antigas.
4. Nao criar ocorrencia duplicada a partir de mensagem encaminhada ou repetida.
5. Tratar somente alteracoes aprovadas como informacoes confirmadas.
6. Apresentar informacoes aguardando aprovacao como pendentes ou nao confirmadas.
7. Nunca inventar setor, frota, motivo, responsavel ou situacao.
8. Agrupar ocorrencias repetidas.
9. Apresentar parada e retorno da mesma frota como sequencia.
10. Representar o estado atual pela informacao confirmada mais recente antes do fechamento.
11. Destacar frotas que continuem paradas ao final do turno.
12. Registrar ocorrencias resolvidas no proprio turno com ocorrencia e resolucao resumidas.
13. Evitar texto excessivamente repetitivo.
14. Usar linguagem operacional, clara e profissional.
15. Permitir edicao integral pelo administrador antes do envio.
16. Exigir configuracao explicita para envio automatico.
17. Permitir exigencia de aprovacao manual.
18. Salvar exatamente o conteudo enviado no historico.

## Regras para ocorrencias, indicadores e assistente

- Cada acontecimento relevante deve gerar evento rastreavel.
- Eventos pendentes nao podem atualizar indicadores confirmados.
- Tempo parado inicia somente com parada confirmada.
- Tempo parado termina somente com retorno confirmado.
- Mudanca de turno nao encerra parada automaticamente.
- Alteracoes rejeitadas nao entram em calculos confirmados.
- Correcoes manuais devem preservar historico e recalcular indicadores impactados.
- O Assistente COA deve responder somente com dados registrados.
- O Assistente COA deve diferenciar informacoes confirmadas e pendentes.
- A funcao Sincronizar deve diagnosticar conflitos, nao aplicar mudancas automaticamente.
- Rankings devem apoiar a operacao sem exposicao indevida de operadores.
