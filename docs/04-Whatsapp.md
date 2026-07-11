# 04 - WhatsApp

## Objetivo

Definir como o COA-BOT devera interagir com grupos de WhatsApp, incluindo monitoramento, envio de mensagens, controle de usuarios, seguranca, tratamento de erros e limites operacionais.

## Descricao completa

O WhatsApp sera o principal canal de entrada e saida operacional do COA-BOT. Operadores enviarao relatorios nos grupos utilizados pelo COA, e o sistema devera interpretar essas mensagens, responder quando necessario, solicitar aprovacoes e enviar relatorios periodicos.

A integracao devera ser tratada como componente externo e substituivel. O sistema nao deve depender diretamente de um unico mecanismo de conexao. A escolha tecnica futura devera considerar estabilidade, conformidade, continuidade operacional e risco de bloqueio.

## Funcionamento

O modulo WhatsApp devera:

1. Conectar-se aos grupos autorizados.
2. Receber mensagens em tempo proximo ao real.
3. Capturar metadados da mensagem.
4. Encaminhar o conteudo para classificacao.
5. Enviar respostas automaticas quando apropriado.
6. Encaminhar solicitacoes de aprovacao.
7. Enviar relatorios periodicos.
8. Registrar erros de envio ou recebimento.

Metadados minimos:

- Identificador da mensagem.
- Grupo de origem.
- Remetente.
- Data e hora.
- Conteudo textual.
- Tipo de mensagem.
- Anexos, quando existirem.
- Status de processamento.

## Responsabilidades

O modulo WhatsApp devera ser responsavel por:

- Manter conexao com o canal configurado.
- Filtrar grupos permitidos.
- Ignorar conversas nao autorizadas.
- Diferenciar mensagens de operadores, administradores e sistema.
- Evitar processamento duplicado.
- Respeitar janelas de envio.
- Registrar falhas de comunicacao.
- Encaminhar mensagens para os demais modulos.

Nao devera ser responsabilidade do modulo WhatsApp:

- Aplicar regras complexas de negocio.
- Alterar planilhas.
- Decidir aprovacao.
- Armazenar historico completo sozinho.

## Tipos de mensagens

### Mensagens operacionais

Relatorios enviados por operadores com informacoes de plantio, tratos culturais, atividades, equipes, areas, datas, quantidades ou outros dados definidos pelo COA.

### Mensagens administrativas

Comandos de aprovacao, rejeicao, consulta, correcao ou solicitacao de relatorio enviados por usuarios autorizados.

### Mensagens informativas

Confirmacoes, alertas, relatorios e avisos enviados automaticamente pelo COA-BOT.

### Mensagens ignoradas

Conversas informais, midias nao suportadas, mensagens sem padrao operacional ou mensagens de usuarios sem permissao.

## Futuras expansoes

Possibilidades futuras:

- Leitura de audios com transcricao.
- Interpretacao de imagens enviadas no grupo.
- Respostas interativas com botoes, quando disponivel.
- Separacao por multiplos numeros de atendimento.
- Suporte a grupos por unidade agricola.
- Monitoramento de status da conexao em painel.
- Reenvio automatico de notificacoes pendentes.

## Dependencias

- Metodo oficial ou tecnicamente confiavel de integracao com WhatsApp.
- Lista de grupos autorizados.
- Lista de usuarios autorizados.
- Politica de uso do canal.
- Regras de privacidade e seguranca.
- Ambiente com conexao estavel.

## Observacoes

O WhatsApp e um canal operacional, mas nao deve ser a unica fonte de auditoria. Toda informacao relevante recebida pelo canal deve ser persistida em historico proprio do sistema.

Mensagens automaticas devem ser claras, curtas e rastreaveis. O sistema deve evitar excesso de notificacoes para nao atrapalhar a rotina dos grupos.

## Relatorio de troca de turno no WhatsApp

O WhatsApp sera um dos canais de envio do relatorio de troca de turno. O envio devera ocorrer somente para grupo autorizado e configurado. Quando a regra exigir aprovacao manual, o relatorio nao podera ser enviado antes da decisao do administrador.

O sistema devera permitir mencao configuravel ao proximo responsavel pelo turno. Tambem devera registrar o identificador da mensagem enviada, o grupo de destino, o horario de envio, o status do envio e o texto exato transmitido.

Falhas de conexao, envio para grupo incorreto, ausencia de configuracao de destino ou tentativa de envio sem aprovacao deverao bloquear o envio e gerar notificacao ou registro de falha.

## Reacao apos aprovacao

A unica reacao permitida nas mensagens originais do grupo e 👍.

Nao devem ser utilizadas reacoes como olhar, confirmacao visual, alerta, coracao ou qualquer outra reacao. O 👍 somente podera ser enviado depois de:

1. Alteracao aprovada pelo administrador.
2. Banco atualizado com sucesso.
3. Excel atualizado com sucesso.
4. Celulas relidas e confirmadas.
5. Historico registrado com sucesso.

Caso qualquer etapa falhe, nao reagir a mensagem. Em modo de simulacao, o 👍 tambem nao deve ser enviado.

## Eventos vindos do WhatsApp

Mensagens do WhatsApp poderao gerar eventos como frota parada, retorno, deslocamento, atolamento, manutencao, mudanca de setor, inicio ou encerramento de operacao. Cada evento deve manter vinculo com mensagem original, grupo, remetente, horario e identificador da mensagem.
