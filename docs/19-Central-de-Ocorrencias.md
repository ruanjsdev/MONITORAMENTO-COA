# 19 - Central de Ocorrencias

## Objetivo

Documentar a Central de Ocorrencias do COA-BOT, responsavel por registrar, organizar, validar, corrigir, vincular e resolver acontecimentos operacionais recebidos pelo WhatsApp, aprovados no painel ou inseridos manualmente.

## Descricao completa

A Central de Ocorrencias sera o nucleo de acompanhamento operacional do COA-BOT. Cada acontecimento relevante devera gerar um evento estruturado, permitindo manter o estado atual das operacoes, reconstruir a linha do tempo do turno, calcular tempo parado, alimentar relatorios e apoiar decisoes.

O sistema deve deixar de tratar mensagens como simples textos isolados. Mensagens, aprovacoes, edicoes e atualizacoes devem ser transformadas em eventos operacionais rastreaveis.

## Funcionamento

Fontes de eventos:

- Mensagens recebidas no WhatsApp.
- Relatorios operacionais completos.
- Mensagens avulsas.
- Alteracoes aprovadas.
- Alteracoes rejeitadas.
- Edicoes feitas no painel.
- Relatorios enviados.
- Informacoes manuais inseridas pelo administrador.
- Dados confirmados por sincronizacao.

Fluxo basico:

1. Informacao chega por uma fonte autorizada.
2. Sistema identifica se ha acontecimento relevante.
3. Sistema gera evento preliminar.
4. Evento passa por validacao e regras de negocio.
5. Evento pode ser confirmado, pendente, rejeitado, duplicado ou corrigido.
6. Evento atualizado alimenta estado atual, historico, linha do tempo, relatorios e indicadores.

## Tipos de eventos

Exemplos iniciais:

- Frota parou.
- Frota voltou a operar.
- Frota ficou disponivel.
- Equipamento entrou em manutencao.
- Equipamento atolou.
- Equipamento foi retirado.
- Operacao mudou de setor.
- Operacao iniciou.
- Operacao encerrou.
- Operacao ficou sem area.
- Operacao ficou aguardando condicao de solo.
- Equipamento iniciou deslocamento.
- Equipamento chegou ao destino.
- Relatorio operacional foi recebido.
- Alteracao foi aprovada.
- Alteracao foi rejeitada.
- Alteracao foi editada.
- Relatorio foi enviado.

## Campos do evento

Cada evento devera registrar:

- Data.
- Horario.
- Turno.
- Operacao.
- Frota ou equipamento.
- Setor, fazenda, modulo ou talhao.
- Status anterior.
- Novo status.
- Descricao.
- Mensagem original.
- Grupo de origem.
- Remetente.
- Usuario que aprovou.
- Horario da aprovacao.
- Origem da informacao.
- Nivel de confianca.
- Estado da validacao.
- Identificador da mensagem no WhatsApp.

## Estados de validacao

Estados recomendados:

- `RECEBIDO`: evento criado a partir de uma fonte.
- `INTERPRETADO`: dados estruturados foram extraidos.
- `PENDENTE_APROVACAO`: aguarda decisao.
- `CONFIRMADO`: aprovado e valido.
- `REJEITADO`: recusado.
- `DUPLICADO`: repeticao de evento ja existente.
- `CORRIGIDO`: ajustado manualmente com justificativa.
- `RESOLVIDO`: pendencia operacional encerrada.
- `ABERTO`: evento ainda sem resolucao.

## Linha do tempo do turno

A linha do tempo devera exibir os principais acontecimentos do turno em ordem cronologica.

Exemplo:

```text
01:15 - Frota 625 parou por falha no bico injetor.
01:48 - Frota 625 retornou a operacao.
02:30 - Frota 1531 atolou durante deslocamento.
03:15 - Frota 1531 foi retirada.
03:40 - Plantio iniciou deslocamento para Chapadinha.
04:10 - Plantio iniciou operacao.
```

Recursos obrigatorios:

- Filtrar por operacao.
- Filtrar por frota.
- Filtrar por grupo.
- Filtrar por turno.
- Filtrar por status.
- Exibir somente ocorrencias importantes.
- Exibir somente pendencias.
- Abrir a mensagem original.
- Corrigir uma ocorrencia.
- Vincular eventos relacionados.
- Marcar ocorrencia como resolvida.

## Historico por frota

A tela de historico por frota devera mostrar a sequencia de estados da frota, por exemplo:

```text
RODANDO
PARADO
MANUTENCAO
DISPONIVEL
RODANDO
```

Informacoes exibidas:

- Estado atual.
- Operacao atual.
- Local atual.
- Ultima atualizacao.
- Historico de status.
- Motivos de parada.
- Tempo total parado.
- Quantidade de paradas.
- Mensagens relacionadas.
- Alteracoes aprovadas.
- Alteracoes rejeitadas.
- Relatorios em que a frota apareceu.
- Linha do tempo completa.
- Pesquisa por periodo.

## Responsabilidades

A Central de Ocorrencias devera:

- Transformar mensagens e acoes em eventos rastreaveis.
- Manter o estado atual operacional.
- Apoiar calculo de tempo parado.
- Alimentar relatorios de troca de turno.
- Permitir correcao com auditoria.
- Evitar duplicidades.
- Vincular eventos relacionados.
- Diferenciar pendencias de fatos confirmados.

Nao devera:

- Atualizar Excel sem aprovacao.
- Tratar interpretacao incerta como confirmada.
- Apagar eventos sem historico.
- Ocultar correcoes manuais.

## Futuras expansoes

- Severidade de ocorrencia.
- SLA por tipo de evento.
- Alertas automaticos por recorrencia.
- Mapa operacional.
- Agrupamento inteligente de eventos.
- Integracao com manutencao.

## Dependencias

- Modulo WhatsApp.
- Regras de negocio.
- Historico.
- Banco de dados futuro.
- Cadastro de frotas.
- Cadastro de operacoes.
- Modulo de aprovacoes.

## Observacoes

A Central de Ocorrencias deve ser a base para todas as visoes operacionais. Se os eventos forem mal definidos, indicadores, relatorios e consultas ficarao inconsistentes.
