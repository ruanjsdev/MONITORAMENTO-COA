# Parser de relatórios operacionais reais

## Objetivo

Definir o processamento determinístico dos relatórios multilinha recebidos pelo WhatsApp. O mesmo núcleo de interpretação é usado pelo fluxo real, pela prévia de relatórios e pelos testes.

## Regras

1. O texto original e cada linha original são preservados para auditoria.
2. Markdown, emojis e variações de separadores são removidos apenas da cópia usada na interpretação.
3. Operação, setor, data e turno são herdados do cabeçalho e das seções do relatório.
4. Cada linha de frota gera uma interpretação independente.
5. Barras entre códigos numéricos representam frota e implemento; barras antes de texto iniciam a descrição.
6. `RODANDO` propõe status `R` e força a descrição `RODANDO` no fluxo Excel.
7. `PARADO` ou `QUEBRADO` propõe status `P` e usa o recebimento da mensagem como início quando não houver outro horário informado.
8. `AG / ÁREA` propõe status `D`, conforme a regra observada na aba real de Preparo de Solo. Outras situações sem regra explícita preservam o status atual relido da planilha.
9. Uma previsão informada é interpretada usando a data do relatório como referência de ano e o horário operacional local.
10. A seção `IMPLEMENTOS DISPONÍVEIS` é separada do conjunto de frotas e não cria pendências de frota.
11. Uma seção explicitamente marcada como frota indisponível pode fornecer o contexto `PARADO`, mas a linha ainda precisa conter descrição operacional útil.
12. Linhas incompletas, como `1405 = Frota`, são preservadas para revisão e não criam alteração.
13. Antes de criar pendência, a frota deve existir na leitura Excel real e na operação indicada pelo relatório.
14. Divergência de operação ou indisponibilidade da leitura Excel bloqueia a pendência.
15. Divergência de implemento é registrada na interpretação para revisão; a coluna de implemento não é alterada pelo fluxo de status.
16. Se status e descrição já forem iguais aos valores reais do Excel, a linha é marcada como `NO_CHANGE` e não cria pendência.
17. Toda alteração continua dependendo da aprovação no painel.

## Exemplo de separação

- `1604/100071 = rodando`: frota `1604`, implemento `100071`, status `R`.
- `964/Parado ...`: frota `964`, sem implemento, status `P`.
- `643 = disponível` dentro de `IMPLEMENTOS DISPONÍVEIS`: item de inventário, sem pendência de frota.
- `1605 = Previsão 18/07 às 17 Hrs` dentro da seção de frotas indisponíveis: status `P`, previsão informada e início no recebimento.
- `1405 = Frota`: informação insuficiente; revisão sem escrita.

## Garantias

- Nenhum dado ausente é inventado.
- Nenhuma frota é corrigida por aproximação textual no fluxo real.
- Nenhuma pendência de implemento é misturada com pendência de frota.
- Nenhuma planilha é escrita durante interpretação e comparação.
- A mensagem original, validações e motivos de bloqueio permanecem auditáveis.
