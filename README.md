# COA

## Objetivo

O COA e um sistema de automacao operacional para apoiar o COA no monitoramento de grupos de WhatsApp, interpretacao de relatorios enviados por operadores, comparacao com planilhas Excel oficiais, aprovacao administrativa e atualizacao controlada das informacoes da operacao agricola.

## Problema resolvido

O processo operacional depende de informacoes enviadas em grupos de WhatsApp e registradas em planilhas oficiais. Esse fluxo pode gerar retrabalho, atrasos, duplicidades, perda de contexto entre turnos e risco de erro manual. O COA-BOT busca organizar esse processo com rastreabilidade, aprovacao humana e historico confiavel.

## Arquitetura geral

O sistema sera projetado em modulos independentes:

- WhatsApp: captura mensagens e envia notificacoes.
- Interpretacao: transforma mensagens em dados estruturados.
- Regras de negocio: valida informacoes, conflitos e pendencias.
- Excel: le e atualiza planilhas oficiais com backup e preservacao.
- Aprovacao: controla decisoes administrativas antes de alteracoes.
- Historico: registra mensagens, propostas, decisoes e envios.
- Notificacoes: envia alertas, confirmacoes e relatorios.
- Painel PWA: interface futura para revisao, aprovacao, configuracao e auditoria.
- Central de ocorrencias: organiza acontecimentos do turno como eventos rastreaveis.
- Sincronizacao: compara WhatsApp, banco e Excel sem aplicar mudancas automaticamente.
- Assistente COA: permite consultas sobre dados registrados no sistema.

## Estrutura das pastas

- `docs/`: documentacao tecnica e funcional do projeto.
- `planilhas/`: planilhas oficiais usadas pela operacao agricola.
- `exemplos/`: espaco futuro para mensagens, cenarios e massas de teste.
- `assets/`: espaco futuro para imagens, modelos e materiais auxiliares.
- `prompt/`: espaco futuro para prompts, instrucoes e modelos de interpretacao.
- `AGENTS.md`: orientacoes para agentes e desenvolvedores.
- `ROADMAP.md`: visao executiva das fases do projeto.
- `BACKLOG.md`: lista inicial de demandas futuras.
- `IDEIAS.md`: ideias ainda nao priorizadas.

## Operacoes monitoradas

As operacoes iniciais previstas incluem:

- Plantio Mecanizado.
- Colheita de Muda.
- Preparo de Solo.
- CPD.
- Cultivo.
- Correcao de Solo.
- Compostagem.
- Tratos culturais associados as planilhas oficiais.
- Plantio de cana associado a planilha oficial.

A lista devera ser configuravel futuramente pelo painel, permitindo ativar, desativar e ordenar operacoes sem alteracao de codigo.

## Integracao com WhatsApp

O WhatsApp sera o canal principal de entrada e saida. O COA-BOT devera monitorar apenas grupos autorizados, identificar usuarios permitidos, registrar mensagens recebidas, solicitar aprovacoes e enviar notificacoes ou relatorios.

Nenhuma integracao com WhatsApp foi implementada nesta etapa.

## Integracao com Excel

As planilhas oficiais em `planilhas/` sao a fonte operacional inicial. O sistema devera preservar macros, formulas, formatacoes, abas, filtros, imagens e demais estruturas dos arquivos `.xlsm`.

Nenhuma automacao de Excel foi implementada nesta etapa.

## Fluxo de aprovacao

O fluxo previsto e:

1. Operador envia relatorio no WhatsApp.
2. Sistema interpreta e valida os dados.
3. Sistema compara com a planilha oficial.
4. Sistema gera proposta de alteracao.
5. Administrador aprova ou rejeita.
6. Apenas alteracoes aprovadas sao aplicadas.
7. Historico registra todo o processo.

## Painel PWA

O painel PWA sera a interface futura para:

- Aprovar ou rejeitar propostas.
- Consultar historico.
- Configurar usuarios, grupos e operacoes.
- Revisar relatorios de troca de turno.
- Editar relatorios antes do envio.
- Configurar notificacoes e horarios.
- Acompanhar dashboard do turno.
- Ver linha do tempo.
- Consultar historico por frota.
- Comparar WhatsApp, Excel e banco.
- Pesquisar dados globalmente.
- Usar o Assistente COA.

Nenhuma interface foi implementada nesta etapa.

## Monitoramento inteligente

O COA-BOT devera manter o estado atual das operacoes a partir de eventos como parada, retorno, deslocamento, manutencao, mudanca de setor, aprovacao, rejeicao e envio de relatorio. Esses eventos alimentarao linha do tempo, historico por frota, indicadores, tempo parado, relatorio de troca de turno e consultas do Assistente COA.

## Sincronizacao e conflitos

A funcao Sincronizar devera verificar WhatsApp, banco, Excel, planilhas abertas, operacoes configuradas, frotas cadastradas, alteracoes pendentes e relatorios atrasados. O resultado podera indicar sistema sincronizado ou diferencas encontradas. A sincronizacao nao aplicara mudancas automaticamente sem seguir as regras de aprovacao.

## Notificacoes

O sistema devera enviar notificacoes para aprovacoes, falhas, pendencias, relatorios periodicos e fechamento de turno. O horario e o destino dessas notificacoes deverao ser configuraveis.

## Estado atual do desenvolvimento

O projeto entrou na primeira fase de implementacao em modo seguro de simulacao. Ja existe estrutura inicial de monorepo, API simulada, web/PWA inicial, agente Excel simulado, contratos, validacoes, schema Prisma, migration inicial, testes e analisador somente leitura das planilhas.

Ainda nao existe conexao real com WhatsApp, automacao real do Excel, envio real de mensagens, reacao real em mensagens ou atualizacao real de celulas.

O painel em modo de simulacao inclui agora `Meu Turno`, Central de Pendencias, aprovacoes com comparacao antes/depois, pesquisa global, status detalhado do sistema, previa de envio e Relatorio de Troca de Turno editavel. Os dados desta camada sao demonstrativos e todas as rotas de acao informam que nenhuma acao externa foi executada.

O fluxo operacional possui parser deterministico sem IA, caixa de entrada simulada, comparacao com estado confirmado, controle de duplicidade, aprovacao com deteccao de conflito e reconstrução de projecoes a partir do log de eventos.

## Requisitos

- Node.js 20 ou superior recomendado.
- npm.
- PostgreSQL para executar migrations e seed reais.
- Windows sera necessario futuramente para o agente Excel com COM Automation.

O ambiente atual usado nesta etapa possui Node.js 18.20.4; algumas dependencias de PWA indicaram preferencia por Node 20.

## Instalacao

```bash
npm install
```

## Variaveis de ambiente

Copie `.env.example` para `.env` quando for executar localmente com configuracoes proprias.

Variaveis principais:

- `SIMULATION_MODE=true`
- `DATABASE_MODE=prisma`
- `DATABASE_URL=postgresql://coa_bot:coa_bot_dev@localhost:5433/coa_bot?schema=public`
- `JWT_SECRET`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `API_PORT`
- `WEB_PORT`
- `VITE_API_URL`
- `EXCEL_AGENT_ID`
- `EXCEL_AGENT_VERSION`

## Execucao local

Executar todos os apps em desenvolvimento:

```bash
npm run dev
```

Executar somente API:

```bash
npm run dev --workspace @coa-bot/api
```

Executar somente web/PWA:

```bash
npm run dev --workspace @coa-bot/web
```

Executar somente agente Excel:

```bash
npm run dev --workspace @coa-bot/excel-agent
```

## Banco de dados

O ambiente de desenvolvimento usa PostgreSQL em Docker com porta externa `5433`, sem interferir em qualquer PostgreSQL local que ja esteja usando a porta `5432`.

Preparar banco, Prisma, migrations e seed:

```bash
npm run setup
```

O setup sobe somente o servico `postgres` do COA-BOT, aguarda o healthcheck, executa `prisma generate`, aplica migrations, executa seed e mostra o login inicial.

Comandos manuais equivalentes:

```bash
docker compose up -d postgres
npx prisma generate --schema packages/database/prisma/schema.prisma
npm run db:migrate
npm run db:seed
```

As migrations usam a `DATABASE_URL` de desenvolvimento:

```bash
postgresql://coa_bot:coa_bot_dev@localhost:5433/coa_bot
```

A API desta etapa usa store de simulacao para permitir testes sem banco real.

## Testes e qualidade

```bash
npm run test
npm run test:integration
npm run lint
npm run build
npm run format
```

## Analise das planilhas

Executar analise somente leitura:

```bash
npm run analyze:workbooks
```

Arquivos gerados:

- `analysis/workbook-plantio.json`
- `analysis/workbook-tratos.json`
- `analysis/sheet-mapping.json`
- `analysis/macro-inventory.json`
- `analysis/named-ranges.json`
- `analysis/integration-risks.json`

## Modo de simulacao

Com `SIMULATION_MODE=true`:

- Excel nao e atualizado.
- WhatsApp nao recebe mensagens reais.
- Nenhuma reacao real e enviada.
- Macros nao sao executadas.
- Aprovacoes atualizam somente estado simulado.
- Acoes simuladas sao registradas claramente.

O painel exibe:

```text
MODO DE SIMULAÇÃO ATIVO — nenhuma alteração externa será executada.
```

## Regra de reacao no WhatsApp

A unica reacao permitida nas mensagens originais do grupo e 👍.

O 👍 somente podera ser enviado depois de alteracao aprovada, banco atualizado, Excel atualizado, celulas relidas e confirmadas e historico registrado. Em modo de simulacao, o 👍 nao deve ser enviado.

## Estrutura do monorepo

- `apps/web`: painel React/Vite/PWA.
- `apps/web/src/app`: bootstrap da aplicacao, providers e roteamento protegido.
- `apps/web/src/pages`: telas do painel.
- `apps/web/src/components`: componentes visuais por dominio.
- `apps/web/src/services`: cliente HTTP.
- `apps/api`: API Node/Express com rotas modulares e Prisma como persistencia principal.
- `apps/api/src/modules`: auth, grupos, operacoes, planilhas, pendencias, testes, logs e integracoes.
- `apps/api/src/repositories`: data sources Prisma e memoria para testes isolados.
- `apps/excel-agent`: agente Excel simulado, preparado para Windows/COM futuramente.
- `packages/database`: Prisma schema, migrations e seed.
- `packages/shared`: tipos, constantes e regras compartilhadas.
- `packages/validation`: schemas Zod.
- `packages/whatsapp`: contrato e cliente simulado do WhatsApp.
- `packages/excel-contracts`: contratos de comandos futuros do agente Excel.
- `packages/ui`: base futura de componentes compartilhados.

## Rotas do painel

- `/login`
- `/dashboard`
- `/pendencias`
- `/grupos`
- `/operacoes`
- `/planilhas`
- `/testes`
- `/historico`
- `/configuracoes`

As rotas sao protegidas no frontend e na API. Usuarios nao autenticados sao redirecionados para login.

## Docker PostgreSQL

O Docker Compose do projeto expoe o PostgreSQL em `localhost:5433` e mantem a porta interna do container em `5432`.

Configuracao de desenvolvimento:

- Banco: `coa_bot`
- Usuario: `coa_bot`
- Senha: `coa_bot_dev`
- Host: `localhost`
- Porta externa: `5433`

Subir banco de desenvolvimento manualmente:

```bash
docker compose up -d postgres
```

Ou executar a preparacao completa:

```bash
npm run setup
```

Login inicial de desenvolvimento apos o seed:

- Email: `admin@coa.local`
- Senha: `change-me-dev-only`

Essas credenciais sao apenas para desenvolvimento local e nao devem ser usadas em producao.

## Como consultar a documentacao

Comece por:

1. `docs/01-Visao-Geral.md`
2. `docs/02-Arquitetura.md`
3. `docs/03-Regras-de-Negocio.md`
4. `docs/17-Relatorio-Troca-de-Turno.md`
5. `docs/18-Mapa-de-Telas.md`
6. `docs/27-Persistencia-Operacional-PostgreSQL.md`
6. `docs/19-Central-de-Ocorrencias.md`
7. `docs/20-Assistente-COA.md`
8. `docs/21-Indicadores-e-Tempo-Parado.md`
9. `docs/22-Sincronizacao-e-Conflitos.md`
10. `docs/23-Mapeamento-Real-das-Planilhas.md`

## Limitacoes atuais

- A API usa store em memoria para simulacao.
- Migrations existem, mas exigem PostgreSQL local para execucao.
- A PWA possui manifest e service worker basicos.
- Notificacao push real ainda nao possui backend de push.
- Baileys esta encapsulado apenas como contrato/cliente simulado. A dependencia real foi adiada porque a versao corrigida exige Node 20+ e a versao instalavel em Node 18 apresentou alerta de seguranca.
- Agente Excel nao executa COM Automation nesta etapa.
- Mapeamentos de colunas ambiguos ainda precisam de confirmacao humana.

## Proximas etapas

- Confirmar mapeamento real das colunas e areas de imagem.
- Definir PostgreSQL local ou container.
- Conectar API ao Prisma de forma controlada.
- Evoluir telas para dados persistentes.
- Implementar homologacao com copias das planilhas.

Depois consulte os documentos especificos conforme a area de interesse: WhatsApp, Excel, painel, usuarios, operacoes, banco de dados, notificacoes, historico, seguranca, fluxos, testes, roadmap e ideias futuras.
