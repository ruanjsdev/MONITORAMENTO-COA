# Persistência Operacional PostgreSQL

## Objetivo

Registrar em PostgreSQL os dados operacionais antes mantidos apenas em memória: mensagens interpretadas, pendências, eventos append-only, projeções reconstruídas e rascunho de troca de turno.

## Descrição completa

A camada operacional continua usando `OperationalEngine` para calcular timeline, histórico, tempo parado e projeções. A mudança desta etapa é que a inicialização das rotas operacionais reidrata o motor a partir do banco quando `DATABASE_URL` está configurada.

Quando `DATABASE_URL` não existe, a API mantém fallback em memória para testes unitários e execução isolada.

## Funcionamento

1. A rota operacional carrega um contexto persistente preguiçosamente.
2. Eventos salvos em `OperationalEvent` reconstroem o `OperationalEngine`.
3. Mensagens e pendências são carregadas em repositórios compatíveis com o workflow existente.
4. Cada nova mensagem, pendência, aprovação, rejeição, evento, projeção ou rascunho é persistido após a operação.
5. O seed visual de demonstração usa IDs fixos para ser idempotente.

`DATABASE_MODE` define a fonte de dados:

- `prisma`: exige `DATABASE_URL` e usa PostgreSQL.
- `memory`: permitido para testes unitários e execução isolada.
- em produção, `prisma` é obrigatório.

## Responsabilidades

- `OperationalPrismaContext`: carregar e persistir o estado operacional.
- `OperationalWorkflow`: preservar regras de interpretação, pendência, aprovação e conflito.
- `OperationalEngine`: continuar append-only e determinístico.
- Prisma: manter durabilidade e unicidade de mensagens por `idempotencyKey`.

## Transações e concorrência

A aprovação e a rejeição persistentes são executadas em transação Prisma. A aprovação bloqueia a pendência aberta via `updateMany`, cria o evento confirmado, atualiza projeção, mensagem e pendência na mesma transação. Em concorrência, uma aprovação vence e a segunda recebe conflito.

`OperationalEvent` possui proteção append-only no PostgreSQL por triggers que bloqueiam `UPDATE` e `DELETE`.

## Scripts

- `npm run test`: suíte unitária e API simulada, sem exigir Docker.
- `npm run test:integration`: exige `DATABASE_URL` e valida persistência real.
- `npm run db:rebuild-operational-projections`: dry-run por padrão.
- `npm run db:rebuild-operational-projections -- --write`: grava projeção reconstruída sem excluir eventos.

## Futuras expansões

- Transformar os repositórios em interfaces assíncronas nativas.
- Adicionar transações de workflow por operação completa.
- Criar limpeza controlada de dados de demonstração.
- Expor projeções persistidas em endpoint dedicado.

## Dependências

- PostgreSQL em `localhost:5433`.
- Prisma Client gerado.
- Migration `20260712090000_operational_persistence`.
- `DATABASE_URL` de desenvolvimento.

## Observações

Duplicidades são bloqueadas pelo workflow e pela restrição única de `OperationalMessage.idempotencyKey`. A escrita real em Excel e WhatsApp real continuam bloqueadas pelo modo de simulação.
