# 13 - Fluxos

## Objetivo

Documentar os principais fluxos operacionais do COA-BOT, permitindo que desenvolvedores, gestores e usuarios entendam o ciclo completo das interacoes do sistema.

## Descricao completa

Os fluxos descrevem como as partes do sistema interagem em situacoes reais. Eles servem como base para implementacao, testes, treinamento e validacao com usuarios do COA.

Cada fluxo deve ser rastreavel, possuir inicio e fim claros, definir responsaveis e prever tratamentos de erro.

## Funcionamento

Os fluxos iniciais cobrem:

- Recebimento de relatorio operacional.
- Interpretacao e validacao.
- Aprovacao administrativa.
- Atualizacao de planilha.
- Envio de relatorio periodico.
- Tratamento de erro.
- Rejeicao ou correcao de dados.

## Responsabilidades

Cada fluxo deve indicar:

- Evento inicial.
- Usuario envolvido.
- Modulos participantes.
- Validacoes executadas.
- Resultado esperado.
- Registros historicos gerados.
- Notificacoes enviadas.

## Fluxo 1: relatorio operacional aprovado

1. Operador envia mensagem no grupo autorizado.
2. COA-BOT registra mensagem.
3. Sistema identifica tipo de operacao.
4. Sistema extrai dados.
5. Sistema valida campos obrigatorios.
6. Sistema compara com planilha oficial.
7. Sistema cria proposta de alteracao.
8. Administrador recebe solicitacao.
9. Administrador aprova.
10. Sistema cria backup da planilha.
11. Sistema atualiza planilha.
12. Sistema registra alteracao.
13. Sistema confirma atualizacao.

## Fluxo 2: mensagem incompleta

1. Operador envia relatorio sem campo obrigatorio.
2. Sistema registra mensagem.
3. Sistema identifica ausencia de dados.
4. Sistema nao cria atualizacao.
5. Sistema solicita correcao ao operador.
6. Historico registra motivo da pendencia.

## Fluxo 3: divergencia com planilha

1. Operador envia informacao.
2. Sistema encontra dado diferente na planilha.
3. Sistema cria alerta de divergencia.
4. Sistema envia ao administrador com comparacao.
5. Administrador aprova, rejeita ou solicita revisao.
6. Sistema registra decisao.

## Fluxo 4: rejeicao administrativa

1. Proposta e enviada ao administrador.
2. Administrador rejeita com motivo.
3. Sistema registra rejeicao.
4. Sistema notifica operador ou grupo quando aplicavel.
5. Nenhuma alteracao e feita na planilha.

## Fluxo 5: envio de relatorio periodico

1. Agendador identifica horario configurado.
2. Sistema abre planilha oficial.
3. Sistema captura imagem original da area definida.
4. Sistema envia imagem ao destino autorizado.
5. Sistema registra envio e resultado.

## Fluxo 6: falha ao atualizar planilha

1. Proposta aprovada e enviada para aplicacao.
2. Sistema cria backup.
3. Sistema tenta atualizar planilha.
4. Ocorre erro tecnico.
5. Sistema bloqueia nova escrita no arquivo afetado.
6. Sistema registra falha.
7. Sistema notifica administrador e suporte.
8. Sistema preserva backup para recuperacao.

## Futuras expansoes

- Fluxos por tipo de operacao.
- Fluxos de aprovacao em multiplos niveis.
- Fluxos de correcao via painel.
- Fluxos de reprocessamento.
- Fluxos de emergencia.
- Fluxos de manutencao programada.

## Dependencias

- Regras de negocio.
- Modulo WhatsApp.
- Modulo Excel.
- Modulo de aprovacao.
- Historico.
- Notificacoes.

## Observacoes

Fluxos devem ser usados como base para testes. Cada fluxo documentado deve futuramente possuir cenarios de teste positivos, negativos e de falha.

## Fluxo 7: relatorio de troca de turno

1. Administrador seleciona data e turno ou o agendador inicia o processo.
2. Sistema identifica o periodo do turno.
3. Sistema coleta mensagens, eventos, alteracoes aprovadas, pendencias e dados das planilhas.
4. Sistema consolida informacoes por operacao.
5. Sistema separa dados confirmados de dados pendentes.
6. Sistema gera rascunho do relatorio.
7. Administrador revisa e edita o texto.
8. Administrador salva rascunho, aprova ou cancela.
9. Sistema envia para o grupo autorizado quando permitido.
10. Sistema registra texto original, texto final, responsaveis, destino e status de envio.

## Fluxo 8: notificacao de fechamento

1. Sistema identifica proximidade do horario de troca de turno.
2. Sistema verifica pendencias, operacoes sem atualizacao e frotas paradas.
3. Sistema envia notificacao ao administrador autorizado.
4. Administrador acessa o painel para revisar o relatorio.
5. Sistema registra notificacao e resultado.

## Fluxo 9: mensagem recebida e evento gerado

1. WhatsApp recebe mensagem em grupo autorizado.
2. Sistema registra mensagem original.
3. Sistema interpreta acontecimento.
4. Sistema cria evento preliminar.
5. Sistema valida confianca, usuario, grupo e regras.
6. Evento segue para aprovacao quando necessario.
7. Evento confirmado atualiza estado operacional e historico.

## Fluxo 10: aprovacao, Excel e reacao

1. Administrador aprova proposta.
2. Sistema atualiza banco futuro.
3. Sistema atualiza Excel com backup e controle.
4. Sistema confirma celula atualizada.
5. Sistema registra historico.
6. Sistema reage com 👍 na mensagem original.
7. Se qualquer etapa falhar, a reacao nao deve ser enviada.
8. Nenhuma outra reacao e permitida.
9. Em modo de simulacao, o 👍 nao deve ser enviado.

## Fluxo 11: sincronizacao e conflito

1. Administrador aciona Sincronizar.
2. Sistema verifica WhatsApp, banco, Excel, planilhas abertas, operacoes, frotas, pendencias e relatorios.
3. Sistema apresenta resultado sincronizado ou lista de conflitos.
4. Administrador revisa diferenca.
5. Resolucao segue aprovacao quando altera dado oficial.
6. Sistema registra justificativa.

## Fluxo 12: consulta no Assistente COA

1. Usuario pergunta sobre operacao, frota, turno ou pendencia.
2. Sistema consulta dados registrados permitidos.
3. Sistema diferencia confirmados e pendentes.
4. Sistema responde com fontes e ultima atualizacao.
5. Usuario pode abrir registros de origem.
6. Qualquer alteracao deve seguir fluxo de aprovacao.

## Fluxo 13: notificacao no celular

1. Sistema identifica evento notificavel.
2. Sistema valida destinatario e permissao.
3. PWA exibe notificacao.
4. Usuario abre a tela relacionada.
5. Acoes criticas exigem confirmacao.
6. Resultado fica registrado no historico.
