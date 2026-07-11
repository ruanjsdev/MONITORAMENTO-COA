# 06 - Painel

## Objetivo

Definir a visao funcional do futuro painel administrativo do COA-BOT, sem implementar interface nesta etapa, estabelecendo telas, responsabilidades, permissoes e comportamentos esperados.

## Descricao completa

O painel sera a interface administrativa do COA-BOT para acompanhamento, configuracao, aprovacao e auditoria. Embora nao seja implementado nesta etapa, sua documentacao e importante para orientar a arquitetura e evitar que o sistema fique dependente apenas de comandos via WhatsApp.

O painel devera permitir que administradores visualizem mensagens processadas, propostas de alteracao, historico, status das planilhas, relatorios, usuarios autorizados e configuracoes operacionais.

## Funcionamento

Funcionalidades esperadas:

1. Login de usuario autorizado.
2. Visualizacao de fila de aprovacoes.
3. Detalhamento de cada proposta.
4. Comparacao entre dado recebido e dado existente.
5. Aprovacao ou rejeicao com justificativa.
6. Consulta ao historico.
7. Visualizacao de status das planilhas.
8. Configuracao de usuarios e grupos.
9. Configuracao de relatorios periodicos.
10. Monitoramento de falhas.

## Responsabilidades

O painel devera:

- Dar visibilidade operacional ao administrador.
- Reduzir dependencia de comandos manuais no WhatsApp.
- Facilitar auditoria.
- Exibir pendencias com clareza.
- Permitir decisoes rastreaveis.
- Apresentar indicadores de saude do sistema.

O painel nao devera:

- Permitir alteracoes sem controle de permissao.
- Ocultar historico de decisoes.
- Substituir backups e auditoria.
- Permitir edicao direta irrestrita das planilhas.

## Areas previstas

### Dashboard

Visao resumida de mensagens recebidas, pendencias, falhas, atualizacoes realizadas e relatorios enviados.

### Aprovacoes

Fila de propostas pendentes, com detalhes da mensagem original, dados extraidos, validacoes e impacto esperado na planilha.

### Historico

Consulta auditavel de todas as mensagens, decisoes e alteracoes.

### Planilhas

Status das planilhas oficiais, ultima atualizacao, ultimo backup, bloqueios e alertas.

### Usuarios

Cadastro e manutencao de operadores, administradores e perfis.

### Configuracoes

Parametros de grupos, relatorios periodicos, regras e notificacoes.

## Futuras expansoes

- Aprovacao em lote.
- Comparacao visual de planilha antes e depois.
- Indicadores agricolas e graficos.
- Controle de versoes de regras.
- Exportacao de auditoria.
- Modo de homologacao.
- Alertas em tempo real.
- Painel mobile para aprovacao rapida.

## Dependencias

- Sistema de autenticacao.
- Banco de dados historico.
- Modulo de aprovacoes.
- Modulo de regras.
- Modulo de Excel.
- Politica de perfis e permissoes.

## Observacoes

O painel deve ser pensado como ferramenta operacional, nao como pagina promocional. A prioridade deve ser clareza, densidade informacional, rastreabilidade e agilidade de decisao.

Toda acao critica realizada pelo painel deve gerar log de auditoria.

## Relatorio de Troca de Turno

O painel devera incluir uma tela chamada "Relatorio de Troca de Turno". Essa tela devera permitir gerar, revisar, editar, salvar, aprovar, copiar, cancelar e enviar o relatorio ao WhatsApp.

Campos e controles previstos:

- Selecao da data.
- Selecao do turno.
- Nome do responsavel pelo turno.
- Nome do proximo responsavel.
- Horario de fechamento.
- Operacoes incluidas.
- Pre-visualizacao do relatorio.
- Botao gerar relatorio.
- Botao atualizar informacoes.
- Botao editar.
- Botao salvar rascunho.
- Botao aprovar.
- Botao enviar para o WhatsApp.
- Botao copiar texto.
- Botao cancelar envio.
- Historico de relatorios anteriores.
- Indicador de informacoes nao confirmadas.
- Indicador de operacoes sem atualizacao.
- Campo de observacao manual.
- Selecao do grupo de destino.
- Configuracao de mencao ao proximo responsavel.

Todo o conteudo do relatorio devera ser editavel antes do envio. O painel tambem devera permitir configurar nomes de turnos, horarios, operacoes incluidas, ordem das operacoes, modelo de texto, grupo de destino, horario de notificacao, horario de envio, exigencia de aprovacao manual, frases para ausencia de informacao, campos obrigatorios e criterios para destacar ocorrencias.

## Painel como central operacional

O painel devera incluir dashboard do turno, monitoramento em tempo real, alteracoes pendentes, central de ocorrencias, linha do tempo, operacoes, frotas, historico por frota, comparacao WhatsApp x Excel x banco, relatorios automaticos, troca de turno, Assistente COA, grupos, planilhas, configuracoes, notificacoes, usuarios, permissoes, logs, backups e estado do sistema.

Nada importante devera ficar fixo no codigo. O painel devera permitir configurar grupos monitorados, operacoes de cada grupo, planilhas, abas, colunas, intervalos, frotas, status, sinonimos, modelos de mensagem, horarios, turnos, responsaveis, relatorios, notificacoes, criterios de alerta, tempo de atualizacao antiga, criticidade, regras de aprovacao, usuarios e permissoes.

## Mobile e PWA

A versao mobile/PWA devera priorizar alteracoes pendentes, notificacoes, aprovacao rapida, edicao de status e descricao, dashboard resumido, linha do tempo, pesquisa, relatorio de troca de turno, status do WhatsApp e Excel e historico.

A PWA devera prever icone na tela inicial, tela cheia, login persistente, notificacao push, contador de pendencias, atualizacao em tempo real, layout responsivo, botoes grandes e confirmacao antes de acoes criticas.
