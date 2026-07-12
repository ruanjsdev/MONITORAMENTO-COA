# Motor Operacional

O `OperationalEngine` é o núcleo append-only do COA-BOT. Entradas viram `OperationalEvent`; telas e integrações consomem projeções calculadas desses eventos.

## Fluxo

`entrada -> evento -> OperationalEngine -> projeções -> API -> painel`

O estado de uma frota é calculado pelo evento confirmado mais recente. Eventos não aprovados permanecem na timeline, mas não alteram a projeção atual. Paradas são intervalos formados por `STOPPED` e `RETURNED`.

## Segurança desta etapa

- O motor recusa inicialização real sem adaptadores homologados.
- Comandos derivados para Excel e WhatsApp usam `execute: false` e `simulated: true`.
- Nenhum comando é entregue ao agente Excel ou ao cliente WhatsApp.
- O modelo Prisma `OperationalEvent` não possui fluxo de update/delete na aplicação.

## Persistência futura

A migration cria uma tabela indexada por frota, operação, tipo e timestamp. Neste ambiente, as rotas continuam usando eventos em memória e a migration não é executada.
