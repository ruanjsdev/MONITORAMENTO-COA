# Fluxo Operacional Simulado

## Sequência

1. A mensagem bruta é preservada no repositório de mensagens.
2. O parser determinístico normaliza e aplica expressões regulares, dicionários e regras.
3. Conjuntos mantêm a frota principal e os implementos vinculados.
4. O workflow compara a interpretação com a projeção confirmada.
5. Repetições sem mudança são ignoradas; duplicidades por chave são bloqueadas.
6. Mudanças e dúvidas geram pendências, nunca alteração direta.
7. A aprovação revalida a linha de base para detectar conflito e adiciona um evento confirmado.
8. A rejeição adiciona somente um evento administrativo e não muda a projeção operacional.
9. Projeções, timeline, tempo parado e troca de turno são reconstruídos dos eventos.

## Status e situações

Status principal e situação operacional são conceitos separados. `AGUARDANDO_AREA`, `DESLOCAMENTO`, `ATOLADO` e demais situações não viram automaticamente `PARADO` ou `DISPONIVEL`. Sem regra segura, o status anterior é mantido e uma pendência de dúvida é criada.

## Repositórios

Mensagens, eventos, pendências, projeções e relatórios possuem contratos separados. A execução atual usa implementações em memória. Os contratos permitem implementação Prisma futura sem alterar o workflow.

## Garantias

- Parser sem IA ou API externa.
- Aprovação humana obrigatória.
- Eventos sem update ou delete.
- Excel e WhatsApp recebem apenas comandos descritivos com `execute: false`.
- Nenhuma ação externa é executada em simulação.
