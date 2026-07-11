# ROADMAP

## Objetivo

Apresentar uma visao executiva das fases de evolucao do COA-BOT, permitindo planejamento de entregas, alinhamento com stakeholders e controle de maturidade do sistema.

## Descricao completa

O COA-BOT deve evoluir de forma incremental. A primeira prioridade e compreender bem o processo, documentar regras e validar a interpretacao das mensagens antes de permitir atualizacoes automaticas em planilhas oficiais.

## Funcionamento

O roadmap deve ser revisado periodicamente e usado para orientar o backlog. Cada fase deve ter criterios de aceite antes de avancar.

## Responsabilidades

Este roadmap deve:

- Dar clareza sobre a sequencia de desenvolvimento.
- Reduzir risco de automacao prematura.
- Ajudar na priorizacao.
- Servir como guia para gestores e equipe tecnica.

## Fases

### 0. Documentacao inicial

Criar base documental completa do projeto.

### 1. Descoberta operacional

Mapear mensagens reais, usuarios, grupos, formatos e regras.

### 2. Interpretacao sem escrita

Ler mensagens e gerar interpretacoes sem alterar planilhas.

### 3. Propostas e aprovacao

Criar fluxo de aprovacao administrativa.

### 4. Atualizacao segura

Atualizar copias controladas das planilhas com backup e auditoria.

### 5. Homologacao

Validar o processo com usuarios reais e exemplos da operacao.

### 6. Producao assistida

Ativar em ambiente real com monitoramento constante.

### 7. Relatorios automaticos

Enviar imagens originais das planilhas em horarios definidos.

### 8. Relatorio de troca de turno

Gerar rascunho diario por turno, consolidar ocorrencias por operacao, permitir edicao administrativa, aprovar e enviar ao grupo autorizado com historico completo.

### 9. Painel administrativo

Disponibilizar interface de aprovacao, consulta e configuracao.

### 10. Escala e integracoes

Expandir para novas operacoes, unidades e sistemas corporativos.

### 11. Painel inteligente e PWA

Disponibilizar dashboard, central de ocorrencias, linha do tempo, historico por frota, sincronizacao, pesquisa global, indicadores, Assistente COA e experiencia mobile/PWA.

### 12. Implementacao inicial em simulacao

Criar monorepo TypeScript, API simulada, web/PWA inicial, agente Excel simulado, contratos, schema Prisma, migrations, testes e analise somente leitura das planilhas reais.

## Futuras expansoes

- BI operacional.
- Aplicativo movel.
- Regras configuraveis.
- Inteligencia de inconsistencias.
- Integracao com armazenamento corporativo.
- Comparativos e indicadores derivados dos relatorios de troca de turno.
- Aprendizado supervisionado de padroes operacionais.
- Assistente COA para consultas sobre historico e estado atual.

## Dependencias

- Validacao das planilhas oficiais.
- Regras de negocio aprovadas.
- Usuarios e grupos definidos.
- Estrategia tecnica escolhida.
- Ambiente de homologacao.

## Observacoes

Este arquivo resume o caminho de evolucao. Detalhes tecnicos estao em `docs/15-Roadmap.md`.
