# 09 - Banco de Dados

## Objetivo

Definir a visao conceitual do armazenamento persistente do COA-BOT, incluindo entidades, historico, auditoria, rastreabilidade e requisitos de consistencia, sem criar banco de dados nesta etapa.

## Descricao completa

Embora as planilhas Excel sejam a fonte oficial inicial da operacao, o COA-BOT precisara de armazenamento proprio para historico, auditoria, configuracoes, usuarios, mensagens processadas e propostas de alteracao. Esse armazenamento nao substitui as planilhas; ele complementa o controle operacional.

Nesta etapa nao sera criado banco. Este documento serve como guia para modelagem futura.

## Funcionamento

O banco futuro devera registrar:

1. Grupos monitorados.
2. Usuarios autorizados.
3. Mensagens recebidas.
4. Interpretacoes realizadas.
5. Validacoes aplicadas.
6. Propostas de alteracao.
7. Decisoes administrativas.
8. Alteracoes em planilhas.
9. Notificacoes enviadas.
10. Falhas e eventos tecnicos.

## Responsabilidades

O armazenamento persistente devera:

- Permitir auditoria completa.
- Evitar perda de historico.
- Suportar reprocessamento.
- Controlar estados de operacoes.
- Registrar configuracoes.
- Registrar eventos tecnicos.
- Apoiar relatorios futuros.

Nao devera:

- Ser usado para esconder alteracoes sem log.
- Substituir backup das planilhas.
- Armazenar dados sensiveis sem politica de seguranca.

## Entidades conceituais

### Usuario

Representa operador, administrador, gestor ou suporte.

### GrupoWhatsApp

Representa grupo autorizado para monitoramento.

### Mensagem

Representa conteudo recebido do WhatsApp com metadados completos.

### Interpretacao

Representa dados extraidos e nivel de confianca.

### Operacao

Representa uma atividade operacional identificada.

### PropostaAlteracao

Representa uma mudanca planejada em planilha, antes da aplicacao.

### Aprovacao

Representa decisao administrativa sobre proposta.

### AlteracaoPlanilha

Representa modificacao efetivamente aplicada.

### Notificacao

Representa mensagem enviada pelo sistema.

### EventoAuditoria

Representa evento relevante para rastreabilidade.

## Futuras expansoes

- Particionamento por safra ou ano.
- Armazenamento de anexos.
- Busca textual em mensagens.
- Dashboards analiticos.
- Retencao configuravel de dados.
- Replicacao para ambiente de BI.
- Arquivamento historico de longo prazo.

## Dependencias

- Decisao futura de tecnologia de banco.
- Politica de backup.
- Politica de retencao.
- Requisitos de seguranca.
- Volume esperado de mensagens.
- Necessidades de relatorio.

## Observacoes

O desenho do banco deve priorizar rastreabilidade. Mesmo que uma planilha seja restaurada, o sistema deve conseguir explicar o que aconteceu, quando aconteceu, quem aprovou e qual mensagem originou a alteracao.

## Dados do relatorio de troca de turno

O modelo futuro de banco devera armazenar relatorios de troca de turno como registros auditaveis. Entidades conceituais adicionais:

- `RelatorioTrocaTurno`: data, turno, responsavel, proximo responsavel, horario de fechamento, status, grupo de destino e operacoes incluidas.
- `ItemRelatorioTurno`: conteudo consolidado por operacao, incluindo situacao, ocorrencias, pendencias e ultima atualizacao valida.
- `EdicaoRelatorioTurno`: alteracoes manuais realizadas antes do envio.
- `EnvioRelatorioTurno`: horario de envio, canal, grupo de destino, identificador da mensagem e status.

O banco devera preservar texto originalmente gerado, texto final enviado, usuario que editou, usuario que aprovou, pendencias mencionadas e operacoes incluidas.

## Entidades para monitoramento inteligente

Entidades conceituais adicionais:

- `Ocorrencia`: acontecimento operacional estruturado.
- `EventoFrota`: mudanca de status de uma frota ou equipamento.
- `EstadoOperacao`: estado atual consolidado de uma operacao.
- `ConflitoFonte`: divergencia entre WhatsApp, banco e Excel.
- `IndicadorOperacional`: metrica calculada por periodo.
- `ConsultaAssistente`: pergunta, resposta e fontes usadas.
- `ConfiguracaoPainel`: parametros editaveis do sistema.

Essas entidades deverao permitir linha do tempo, historico por frota, pesquisa global, calculo de tempo parado e auditoria de conflitos.
