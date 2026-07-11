# 10 - Notificacoes

## Objetivo

Definir a estrategia de notificacoes do COA-BOT, incluindo mensagens automaticas, solicitacoes de aprovacao, alertas de falha, confirmacoes e relatorios periodicos.

## Descricao completa

Notificacoes serao essenciais para manter operadores, administradores e gestores informados. O sistema devera comunicar apenas o necessario, de forma clara e rastreavel, evitando excesso de mensagens nos grupos.

As notificacoes poderao ser enviadas pelo WhatsApp inicialmente e, no futuro, por outros canais como email, painel, aplicativo ou integracoes corporativas.

## Funcionamento

Eventos que podem gerar notificacao:

- Mensagem operacional recebida.
- Dados incompletos.
- Proposta aguardando aprovacao.
- Aprovacao realizada.
- Rejeicao realizada.
- Planilha atualizada.
- Falha ao atualizar planilha.
- Relatorio periodico gerado.
- Erro de conexao.
- Inconsistencia detectada.

## Responsabilidades

O modulo de notificacoes devera:

- Enviar mensagens para destinatarios corretos.
- Respeitar perfis e permissoes.
- Registrar status de envio.
- Evitar duplicidade.
- Permitir reenvio controlado.
- Padronizar conteudo.
- Priorizar alertas criticos.

Nao devera:

- Alterar dados operacionais.
- Aprovar propostas automaticamente.
- Expor informacoes sensiveis para grupos nao autorizados.

## Tipos de notificacao

### Confirmacao de recebimento

Informa que uma mensagem operacional foi recebida e esta em processamento.

### Solicitacao de correcao

Informa que dados obrigatorios estao ausentes ou inconsistentes.

### Solicitacao de aprovacao

Envia ao administrador resumo da proposta, impacto e opcoes de decisao.

### Confirmacao de atualizacao

Informa que a planilha foi atualizada com sucesso.

### Alerta de falha

Informa erro tecnico ou operacional que exige atencao.

### Relatorio periodico

Envia imagem original da planilha ou area de relatorio conforme programacao.

## Futuras expansoes

- Templates configuraveis.
- Priorizacao por severidade.
- Envio por email.
- Push no painel.
- Escalonamento automatico.
- Janelas de silencio.
- Resumos diarios e semanais.

## Dependencias

- Modulo WhatsApp.
- Cadastro de usuarios.
- Configuracao de grupos.
- Historico de notificacoes.
- Regras de permissao.
- Agendador de relatorios.

## Observacoes

Mensagens automaticas devem ser objetivas. Em canais operacionais, notificacoes longas demais tendem a ser ignoradas. Detalhes completos devem ficar disponiveis no historico e no futuro painel.

## Notificacao de fechamento de turno

O sistema devera poder notificar o administrador proximo ao horario de troca de turno. O horario da notificacao devera ser configuravel.

Exemplo de mensagem:

```text
Relatorio do Turno C disponivel para revisao. Existem 3 pendencias e 2 operacoes sem atualizacao recente.
```

Alertas relacionados:

- Operacao sem atualizacao ha muito tempo.
- Alteracao pendente de aprovacao.
- Frota ainda parada no encerramento.
- Relatorio nao revisado.
- Horario de troca de turno proximo.
- Falha ao enviar o relatorio.

A notificacao deve respeitar usuarios autorizados e nao deve enviar o relatorio automaticamente se essa permissao nao estiver configurada.

## Notificacoes mobile/PWA

A PWA devera receber notificacoes para alteracoes pendentes, conflitos, operacoes sem atualizacao, frotas ainda paradas, relatorios atrasados, falhas de WhatsApp, falhas de Excel e proximidade de troca de turno.

As notificacoes devem abrir diretamente a tela relacionada quando permitido. Acoes criticas realizadas pelo celular devem exigir confirmacao.
