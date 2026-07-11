# 11 - Historico

## Objetivo

Definir os requisitos de historico e auditoria do COA-BOT, garantindo rastreabilidade completa de mensagens, interpretacoes, decisoes, atualizacoes e falhas.

## Descricao completa

O historico sera um dos pilares de confiabilidade do COA-BOT. Como o sistema podera alterar planilhas oficiais, toda acao relevante devera ser registrada de forma consultavel e protegida contra perda ou adulteracao indevida.

O historico deve permitir responder perguntas como:

- Qual mensagem originou esta alteracao?
- Quem enviou a informacao?
- Quem aprovou?
- Quando a planilha foi alterada?
- O que mudou exatamente?
- Houve erro durante o processamento?
- Qual versao da planilha existia antes?

## Funcionamento

Eventos que devem ser registrados:

1. Mensagem recebida.
2. Mensagem ignorada e motivo.
3. Dados interpretados.
4. Validacoes executadas.
5. Inconsistencias encontradas.
6. Proposta criada.
7. Solicitacao de aprovacao enviada.
8. Decisao administrativa.
9. Backup criado.
10. Alteracao aplicada.
11. Relatorio enviado.
12. Falha tecnica.

## Responsabilidades

O historico devera:

- Registrar eventos com data e hora.
- Identificar usuarios envolvidos.
- Manter vinculo entre mensagem, proposta, aprovacao e alteracao.
- Permitir consulta posterior.
- Apoiar auditoria interna.
- Apoiar diagnostico tecnico.
- Apoiar reprocessamento quando permitido.

Nao devera:

- Ser editavel sem controle.
- Depender apenas do historico do WhatsApp.
- Ser apagado sem politica formal de retencao.

## Requisitos de auditoria

Cada evento deve conter, quando aplicavel:

- Identificador unico.
- Tipo de evento.
- Data e hora.
- Usuario associado.
- Grupo associado.
- Operacao associada.
- Dados de entrada.
- Resultado.
- Motivo da decisao.
- Origem tecnica.

## Futuras expansoes

- Tela de auditoria.
- Exportacao em CSV, Excel ou PDF.
- Assinatura digital de eventos criticos.
- Retencao por politica corporativa.
- Comparacao antes e depois.
- Busca avancada por operador, fazenda, talhao ou periodo.
- Alertas sobre padroes suspeitos.

## Dependencias

- Banco de dados futuro.
- Politica de retencao.
- Controle de usuarios.
- Relogio confiavel do servidor.
- Mecanismo de backup.

## Observacoes

Historico nao e apenas log tecnico. Ele deve ser compreensivel para suporte, gestores e auditores. Eventos devem ser registrados com linguagem clara e dados suficientes para reconstrucao do fluxo.

## Historico do relatorio de troca de turno

O historico devera registrar todo o ciclo do relatorio de troca de turno:

- Data do relatorio.
- Turno.
- Responsavel.
- Proximo responsavel.
- Horario de geracao.
- Horario de aprovacao.
- Horario de envio.
- Usuario que editou.
- Usuario que aprovou.
- Grupo de destino.
- Texto originalmente gerado.
- Texto final enviado.
- Alteracoes feitas manualmente.
- Operacoes incluidas.
- Pendencias mencionadas.
- Identificador da mensagem enviada no WhatsApp.
- Status do envio.

Esse registro deve permitir comparar o rascunho automatico com o texto final enviado e reconstruir todas as decisoes humanas feitas antes do envio.

## Historico de ocorrencias e consultas

O historico tambem devera registrar eventos operacionais, correcoes, vinculos entre ocorrencias, resolucoes, conflitos entre fontes, sincronizacoes, consultas do Assistente COA e respostas geradas.

Para consultas do Assistente COA, o sistema deve salvar pergunta, usuario, horario, resposta, fontes usadas e indicacao de dados insuficientes quando aplicavel.
