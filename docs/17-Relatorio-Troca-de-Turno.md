# 17 - Relatorio de Troca de Turno

## Objetivo

Documentar a funcionalidade de relatorio automatico de troca de turno do COA-BOT, definindo fontes de informacao, regras de consolidacao, conteudo por operacao, painel de revisao, notificacoes, historico, configuracoes e criterios de teste.

## Descricao completa

O relatorio de troca de turno sera um documento operacional gerado diariamente para entregar ao proximo turno uma visao resumida, clara e confiavel do que aconteceu durante o turno encerrado e de como cada operacao esta no momento da passagem.

O relatorio devera consolidar informacoes de mensagens recebidas nos grupos monitorados, relatorios operacionais completos, mensagens avulsas, alteracoes aprovadas no painel, estado atual das planilhas, historico de mudancas, informacoes digitadas manualmente pelo administrador e pendencias abertas no encerramento.

O sistema podera gerar uma versao inicial automaticamente, mas todo o conteudo devera ser editavel antes do envio. Nenhum relatorio de troca de turno podera ser enviado automaticamente sem configuracao explicita, e o envio podera exigir aprovacao manual.

## Funcionamento

Fluxo previsto:

1. Administrador ou agendador seleciona data e turno.
2. Sistema identifica o periodo correspondente ao turno.
3. Sistema coleta mensagens e eventos do periodo.
4. Sistema consulta alteracoes aprovadas.
5. Sistema consulta estado atual das planilhas.
6. Sistema identifica pendencias abertas.
7. Sistema consolida informacoes por operacao.
8. Sistema gera rascunho do relatorio.
9. Administrador revisa e edita o conteudo.
10. Administrador salva rascunho, aprova ou cancela.
11. Sistema envia para o grupo configurado quando autorizado.
12. Sistema salva exatamente o texto final enviado no historico.

## Operacoes iniciais

O relatorio devera contemplar inicialmente:

- Plantio Mecanizado.
- Colheita de Muda.
- Preparo de Solo.
- CPD.
- Cultivo.
- Correcao de Solo.
- Compostagem.

A lista devera ser totalmente configuravel no futuro. Uma operacao podera ser ativada, desativada ou reordenada sem alteracao de codigo.

## Conteudo por operacao

Para cada operacao, o sistema devera tentar apresentar:

- Situacao atual.
- Setor, fazenda, modulo ou talhao atual.
- Frotas em operacao.
- Frotas paradas.
- Motivos das paradas.
- Equipamentos disponiveis.
- Deslocamentos realizados.
- Mudancas de area.
- Retornos para operacao.
- Principais ocorrencias do turno.
- Ocorrencias ainda nao resolvidas.
- Informacoes importantes para o proximo turno.
- Horario da ultima atualizacao valida.
- Quantidade de alteracoes registradas durante o turno.

Nem todos os campos precisam aparecer quando nao houver informacao. O sistema nao deve inventar dados para preencher lacunas.

Frases permitidas quando nao houver informacao:

- Sem ocorrencia relevante registrada.
- Situacao nao atualizada no encerramento do turno.
- Aguardando confirmacao.
- Informacao nao registrada.

## Estrutura sugerida

Estrutura base:

```text
RELATORIO DE TROCA DE TURNO
Operacoes Agricolas

Data:
Turno encerrado:
Responsavel:
Proximo turno:
Fechamento:

[OPERACAO]

Situacao atual:
- ...

Ocorrencias do turno:
- ...

Pendencias:
- ...

RESUMO PARA O PROXIMO TURNO

Prioridades:
- ...

Pendencias sem confirmacao:
- ...

Responsavel pelo proximo turno:
@Nome
```

## Regras de geracao

1. O relatorio deve considerar somente informacoes pertencentes ao periodo do turno selecionado.
2. Informacoes anteriores poderao ser usadas somente para explicar estado inicial ou pendencia que atravessou turnos.
3. Mensagens mais recentes possuem prioridade sobre mensagens antigas.
4. Mensagem encaminhada ou repetida nao deve criar ocorrencia duplicada.
5. Somente alteracoes aprovadas devem ser tratadas como informacoes confirmadas.
6. Informacoes aguardando aprovacao devem aparecer separadamente como pendentes ou nao confirmadas.
7. O sistema nao deve inventar setor, frota, motivo ou situacao.
8. Ocorrencias repetidas devem ser agrupadas.
9. Uma parada e um retorno da mesma frota devem ser apresentados como sequencia.
10. O estado atual deve representar a informacao confirmada mais recente antes do fechamento.
11. Frota ainda parada ao final do turno deve ser destacada.
12. Ocorrencia resolvida durante o turno deve registrar ocorrencia e resolucao resumidas.
13. O relatorio deve evitar texto excessivamente repetitivo.
14. A linguagem deve ser operacional, clara e profissional.
15. O administrador podera editar todo o relatorio antes do envio.
16. Nenhum relatorio podera ser enviado automaticamente sem configuracao explicita.
17. O envio podera exigir aprovacao manual.
18. O sistema deve salvar exatamente o conteudo enviado no historico.

## Painel de revisao

A tela futura "Relatorio de Troca de Turno" devera prever:

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

Todo o conteudo deve ser editavel antes do envio.

## Notificacao de fechamento

O sistema devera poder notificar o administrador proximo ao horario de troca de turno.

Exemplo de mensagem:

```text
Relatorio do Turno C disponivel para revisao. Existem 3 pendencias e 2 operacoes sem atualizacao recente.
```

O horario da notificacao devera ser configuravel.

Alertas previstos:

- Operacao sem atualizacao ha muito tempo.
- Alteracao pendente de aprovacao.
- Frota ainda parada no encerramento.
- Relatorio nao revisado.
- Horario de troca de turno proximo.
- Falha ao enviar o relatorio.

## Configuracoes editaveis

O painel devera permitir configurar futuramente:

- Nome dos turnos.
- Horario inicial e final de cada turno.
- Responsavel atual.
- Responsavel seguinte.
- Operacoes incluidas.
- Ordem das operacoes.
- Titulo do relatorio.
- Modelo de texto.
- Grupo de destino.
- Horario da notificacao.
- Horario do envio.
- Exigir ou nao aprovacao manual.
- Exigir ou nao mencao do proximo responsavel.
- Frases utilizadas quando nao houver informacao.
- Campos obrigatorios.
- Quantidade maxima de detalhes por operacao.
- Periodo considerado para o resumo.
- Criterios para destacar uma ocorrencia.

## Historico

O historico devera registrar:

- Data do relatorio.
- Turno.
- Responsavel.
- Proximo responsavel.
- Horario de geracao.
- Horario de aprovacao.
- Horario de envio.
- Usuario que editou.
- Usuario que aprovou.
- Grupo de destino.
- Texto originalmente gerado.
- Texto final enviado.
- Alteracoes feitas manualmente.
- Operacoes incluidas.
- Pendencias mencionadas.
- Identificador da mensagem enviada no WhatsApp.
- Status do envio.

## Responsabilidades

O relatorio de troca de turno devera:

- Consolidar informacoes do turno.
- Separar dados confirmados de dados pendentes.
- Destacar pendencias importantes.
- Preservar linguagem operacional.
- Permitir edicao humana antes do envio.
- Registrar exatamente o conteudo enviado.
- Evitar duplicidade e repeticao desnecessaria.

Nao devera:

- Inventar informacoes ausentes.
- Tratar pendencias como confirmadas.
- Enviar automaticamente sem configuracao.
- Substituir a decisao do administrador.
- Omitir alteracoes manuais feitas antes do envio.

## Dependencias

- Historico de mensagens e eventos.
- Cadastro de turnos.
- Cadastro de operacoes.
- Configuracao de grupos de destino.
- Modulo de aprovacao.
- Modulo de notificacoes.
- Modulo de Excel.
- Painel administrativo.

## Testes documentados

Cenarios obrigatorios:

- Operacao sem nenhuma atualizacao no turno.
- Frota que parou e voltou a operar.
- Frota que continua parada no encerramento.
- Mensagem avulsa recebida apos relatorio completo.
- Informacao pendente de aprovacao.
- Informacao rejeitada.
- Mensagem duplicada.
- Mensagem antiga enviada novamente.
- Relatorio gerado com dados de duas planilhas.
- Edicao manual antes do envio.
- Falha de conexao com o WhatsApp.
- Falha do Excel.
- Relatorio salvo como rascunho.
- Envio para grupo incorreto bloqueado.
- Mencao do proximo responsavel.
- Operacao desativada no relatorio.
- Turno encerrado com pendencias.
- Relatorio enviado e armazenado no historico.

## Futuras expansoes

- Modelos diferentes por unidade.
- Comparativo entre turnos.
- Indicadores de qualidade da passagem de turno.
- Aprovacao por multiplos gestores.
- Sugestoes automaticas de prioridades.
- Integracao com BI.
- Exportacao em PDF.
- Assinatura digital do relatorio enviado.

## Observacoes

O relatorio de troca de turno sera uma das entregas mais importantes para continuidade operacional. A prioridade deve ser clareza, confiabilidade e revisao humana. A automacao deve apoiar o administrador, nao substituir o criterio operacional.

## Integracao com central de ocorrencias

O relatorio devera usar a Central de Ocorrencias como fonte principal para acontecimentos do turno. Eventos confirmados alimentarao situacao atual, ocorrencias e pendencias. Eventos pendentes poderao aparecer separados como nao confirmados.

Paradas abertas, operacoes sem atualizacao recente, conflitos entre fontes e mensagens avulsas importantes devem ser destacados para o administrador durante a revisao do relatorio.
