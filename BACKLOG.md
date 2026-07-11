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
