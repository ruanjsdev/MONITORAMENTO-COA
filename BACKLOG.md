# BACKLOG

## Objetivo

Registrar itens de trabalho futuros do COA-BOT, organizando demandas por prioridade, tema e maturidade, sem iniciar implementacao nesta etapa.

## Descricao completa

O backlog deve servir como lista viva de funcionalidades, tarefas tecnicas, validacoes e pendencias de negocio. Nem todo item do backlog deve ser implementado imediatamente. A priorizacao deve considerar risco operacional, valor para o COA e dependencia tecnica.

## Funcionamento

Cada item futuro devera conter:

- Titulo.
- Descricao.
- Prioridade.
- Area responsavel.
- Dependencias.
- Criterio de aceite.
- Status.

## Responsabilidades

O backlog deve:

- Centralizar demandas.
- Evitar perda de pendencias.
- Apoiar planejamento.
- Separar desejo de compromisso.
- Manter rastreabilidade com roadmap e documentacao.

## Itens iniciais

### Documentacao

- Revisar documentacao com stakeholders.
- Validar termos operacionais usados pelo COA.
- Confirmar regras de aprovacao.
- Documentar padroes reais de mensagens.

### WhatsApp

- Definir metodo de integracao.
- Mapear grupos autorizados.
- Definir politica de mensagens ignoradas.
- Definir modelos de resposta.

### Excel

- Mapear abas e areas das planilhas oficiais.
- Identificar formulas, macros e regioes protegidas.
- Definir estrategia de backup.
- Validar metodo de captura de imagem original.

### Regras

- Definir campos obrigatorios para plantio.
- Definir campos obrigatorios para tratos culturais.
- Definir criterios de duplicidade.
- Definir criterios de divergencia.

### Aprovacao

- Definir administradores.
- Definir formato de solicitacao.
- Definir prazo de resposta.
- Definir comportamento para aprovacao expirada.

### Historico

- Definir eventos obrigatorios.
- Definir politica de retencao.
- Definir consultas necessarias.

### Testes

- Criar exemplos de mensagens validas.
- Criar exemplos de mensagens invalidas.
- Criar copias de planilhas para teste.
- Definir criterios de homologacao.

## Futuras expansoes

- Priorizacao por trimestre.
- Kanban por status.
- Ligacao com issues.
- Estimativa de esforco.
- Responsaveis por item.

## Dependencias

- Roadmap.
- Regras de negocio.
- Validacao do COA.
- Decisoes tecnicas futuras.

## Observacoes

O backlog deve ser mantido atualizado. Itens implementados devem ser marcados como concluidos e, quando necessario, refletidos na documentacao.

## Relatorio de troca de turno

Itens iniciais para planejamento futuro:

- Definir nomes dos turnos.
- Definir horario inicial e final de cada turno.
- Definir responsavel atual e responsavel seguinte.
- Definir operacoes incluidas inicialmente.
- Definir ordem das operacoes.
- Definir titulo oficial do relatorio.
- Definir modelo de texto.
- Definir grupo de destino.
- Definir horario da notificacao.
- Definir horario de envio.
- Definir se exige aprovacao manual.
- Definir se exige mencao do proximo responsavel.
- Definir frases para ausencia de informacao.
- Definir campos obrigatorios.
- Definir quantidade maxima de detalhes por operacao.
- Definir periodo considerado para o resumo.
- Definir criterios para destacar ocorrencias.
- Definir testes de homologacao.

## Painel inteligente e monitoramento

- Especificar Central de Ocorrencias.
- Especificar linha do tempo do turno.
- Especificar historico por frota.
- Especificar dashboard do turno.
- Especificar tela de aprovacoes completa.
- Especificar comparacao WhatsApp x Excel x banco.
- Especificar botao Sincronizar.
- Especificar pesquisa global.
- Especificar calculo de tempo parado.
- Especificar indicadores operacionais.
- Especificar Assistente COA.
- Especificar aprendizado supervisionado.
- Especificar configuracoes editaveis do painel.
- Especificar versao mobile/PWA.
- Definir permissoes por tela e acao.

## Implementacao inicial

- Confirmar mapeamento de colunas em `docs/23-Mapeamento-Real-das-Planilhas.md`.
- Definir banco PostgreSQL local de desenvolvimento.
- Conectar API ao Prisma.
- Substituir dados simulados por persistencia controlada.
- Criar homologacao com copias das planilhas.
- Validar fluxo completo antes de qualquer escrita real.

## Entrega em simulacao — 2026-07-11

- [x] Criar tela mobile `Meu Turno` e visão de mudanças recentes.
- [x] Exibir status detalhado dos subsistemas sem tratar integrações simuladas como falha.
- [x] Criar pesquisa global sobre dados operacionais de demonstração.
- [x] Criar Central de Pendências com ações exclusivamente simuladas.
- [x] Mostrar comparação antes/depois no fluxo de aprovação.
- [x] Criar prévia e histórico de resultado para envio simulado.
- [x] Criar rascunho editável do Relatório de Troca de Turno.
- [x] Cobrir contratos principais com testes de API e interface.
- [ ] Persistir os novos domínios no Prisma após disponibilidade do PostgreSQL.
- [ ] Homologar conteúdo, horários, grupos e mapeamentos com o operador.

## Etapa 8 — Motor Operacional

- [x] Criar domínio append-only `OperationalEvent`.
- [x] Calcular estado atual somente por eventos confirmados.
- [x] Calcular intervalos e indicadores de tempo parado.
- [x] Criar timeline reutilizável e filtros na API.
- [x] Criar histórico consolidado por frota.
- [x] Criar diário automático do turno.
- [x] Transformar Meu Turno em Central de Operações com quatro áreas.
- [x] Derivar pesquisa operacional de eventos e projeções.
- [x] Preparar comandos não executáveis para Excel e WhatsApp.
- [x] Preparar schema e migration Prisma sem executar PostgreSQL.
- [ ] Implementar repositório Prisma append-only após disponibilidade do banco.

## Etapa 9 — Fluxo operacional completo

- [x] Parser determinístico modular, sem IA.
- [x] Separar status principal de situação operacional.
- [x] Preservar conjuntos de frota e implementos.
- [x] Interpretar relatórios multilinha por operação.
- [x] Comparar interpretação com projeção confirmada.
- [x] Bloquear mensagens duplicadas e ignorar repetições sem mudança.
- [x] Aprovar com revalidação e detecção de conflito.
- [x] Rejeitar sem alterar o estado operacional.
- [x] Reconstruir projeções integralmente pelos eventos.
- [x] Integrar pendências não confirmadas ao rascunho de troca de turno.
- [x] Criar caixa de entrada visual para mensagens simuladas.
- [x] Expor endpoints operacionais validados com Zod.
- [ ] Implementar os contratos operacionais no repositório Prisma.

## Etapa 10 — Excel em homologação

- [x] Criar cópias `.dev.xlsm` com manifesto e hashes SHA-256.
- [x] Implementar allowlist de caminhos e bloqueio dos arquivos oficiais.
- [x] Implementar ponte PowerShell COM sem teclado ou mouse.
- [x] Detectar Excel, abrir cópia, ler células e localizar frota.
- [x] Preparar prévia, conflito, escrita autorizada e releitura.
- [x] Preparar `CopyPicture` com PNG temporário autorizado.
- [x] Criar fila, heartbeat, resultado, backoff e cancelamento local.
- [x] Adicionar Central de Testes do Excel.
- [ ] Confirmar mapeamentos e campos editáveis com o operador.
- [ ] Executar teste de escrita e CopyPicture somente após confirmação.
