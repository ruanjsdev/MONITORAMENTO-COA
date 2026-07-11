# 02 - Arquitetura

## Objetivo

Definir a arquitetura inicial do COA-BOT, estabelecendo os principais modulos, responsabilidades, limites entre camadas, fluxo de dados, principios tecnicos e criterios para futuras decisoes de implementacao.

## Descricao completa

A arquitetura do COA-BOT deve ser modular, auditavel e preparada para crescimento. O sistema lidara com mensagens externas, interpretacao automatizada, aprovacao humana, manipulacao de planilhas oficiais e envio de relatorios. Por isso, cada responsabilidade deve ser separada para reduzir risco operacional.

Arquiteturalmente, o sistema deve ser pensado como um conjunto de dominios:

- Comunicacao WhatsApp.
- Interpretacao de mensagens.
- Validacao de regras de negocio.
- Integracao com Excel.
- Aprovacao administrativa.
- Historico e auditoria.
- Notificacoes e relatorios.
- Painel administrativo.
- Seguranca e controle de acesso.

Mesmo que a primeira versao seja simples, a documentacao deve orientar uma evolucao organizada. Componentes internos devem ser projetados para permitir substituicao futura, por exemplo trocar o mecanismo de WhatsApp, mudar o banco de dados ou expandir o painel sem reescrever toda a aplicacao.

## Funcionamento

Fluxo arquitetural recomendado:

1. Entrada de mensagem pelo modulo WhatsApp.
2. Normalizacao da mensagem recebida.
3. Classificacao da mensagem como relevante ou nao relevante.
4. Extracao de dados operacionais.
5. Validacao sintatica e semantica.
6. Comparacao com as planilhas oficiais.
7. Criacao de proposta de alteracao.
8. Registro da proposta no historico.
9. Envio de solicitacao de aprovacao ao administrador.
10. Recebimento da decisao.
11. Execucao da atualizacao aprovada.
12. Confirmacao ao grupo ou usuario.
13. Registro final de auditoria.

Cada etapa deve gerar eventos ou registros suficientes para permitir diagnostico posterior.

## Responsabilidades

### Modulo de WhatsApp

- Receber mensagens.
- Identificar remetente, grupo, data e conteudo.
- Enviar respostas, alertas e solicitacoes.
- Controlar grupos autorizados.

### Modulo de interpretacao

- Identificar padroes de relatorio.
- Extrair campos operacionais.
- Detectar informacoes ausentes.
- Sinalizar baixa confianca de interpretacao.

### Modulo de regras

- Validar campos obrigatorios.
- Aplicar regras por tipo de operacao.
- Identificar conflitos com dados oficiais.
- Definir se uma atualizacao exige aprovacao.

### Modulo Excel

- Ler planilhas oficiais.
- Localizar abas, linhas, colunas e celulas.
- Preparar alteracoes.
- Gerar imagem original de relatorio.
- Salvar alteracoes aprovadas com seguranca.

### Modulo de aprovacao

- Enviar proposta ao administrador.
- Receber aprovacao ou rejeicao.
- Controlar prazo e status.
- Evitar aprovacoes duplicadas.

### Modulo de historico

- Registrar mensagens recebidas.
- Registrar interpretacoes.
- Registrar decisoes.
- Registrar alteracoes realizadas.
- Permitir auditoria.

### Modulo de notificacoes

- Enviar confirmacoes.
- Enviar relatorios periodicos.
- Alertar falhas.
- Alertar inconsistencias.

## Futuras expansoes

A arquitetura deve permitir:

- Substituicao do provedor de WhatsApp.
- Inclusao de novos tipos de planilha.
- Integracao com ERPs, CRMs ou sistemas agricolas.
- Fila de processamento para alto volume.
- Processamento assicrono e reprocessamento.
- Painel com indicadores operacionais.
- Separacao entre ambiente de homologacao e producao.
- Multitenancy para varias unidades da empresa.

## Dependencias

Dependencias arquiteturais esperadas:

- Regras de negocio formalizadas.
- Planilhas oficiais padronizadas.
- Politica de autorizacao de usuarios.
- Repositorio de historico.
- Estrategia de backup.
- Ambiente de execucao estavel.

## Observacoes

A arquitetura deve evitar acoplamento direto entre WhatsApp e Excel. A mensagem recebida deve ser transformada em uma proposta operacional estruturada antes de qualquer acao sobre planilhas. Essa separacao sera essencial para testes, auditoria, seguranca e evolucao do produto.

Toda integracao externa deve ser encapsulada. O restante do sistema nao deve depender diretamente de detalhes de bibliotecas, fornecedores ou protocolos especificos.

## Relatorio de troca de turno na arquitetura

A arquitetura devera incluir um dominio especifico para relatorio de troca de turno. Esse dominio nao deve depender diretamente do WhatsApp ou do Excel; ele deve consumir dados ja normalizados pelo historico, pelas aprovacoes, pelas regras de negocio e pelo modulo Excel.

Responsabilidades arquiteturais desse dominio:

- Identificar o periodo do turno selecionado.
- Consolidar mensagens, eventos, pendencias e alteracoes aprovadas.
- Consultar o estado atual registrado nas planilhas quando necessario.
- Agrupar ocorrencias por operacao.
- Separar informacoes confirmadas de informacoes pendentes.
- Gerar rascunho editavel.
- Registrar texto original, edicoes manuais, aprovacao, envio e status final.

Essa separacao permitira evoluir modelos de texto, criterios de resumo, operacoes monitoradas e canais de envio sem reescrever o restante do sistema.

## Dominios adicionais

### Central de ocorrencias

Dominio responsavel por transformar acontecimentos recebidos pelo WhatsApp, painel ou sincronizacao em eventos estruturados. Esses eventos alimentam estado atual, linha do tempo, historico por frota, tempo parado, relatorios e indicadores.

### Sincronizacao e conflitos

Dominio responsavel por comparar WhatsApp, banco e Excel. Deve diagnosticar diferencas, mas nunca aplicar mudancas automaticamente sem passar pelas regras de aprovacao.

### Indicadores

Dominio responsavel por calcular metricas operacionais a partir de eventos confirmados, incluindo tempo parado, operacoes sem atualizacao, aprovacoes, rejeicoes, falhas e tempos medios.

### Assistente COA

Dominio de consulta sobre dados registrados. Deve responder apenas com informacoes existentes no sistema, indicar fontes e nao executar alteracoes diretas em Excel ou WhatsApp.
