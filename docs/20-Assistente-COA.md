# 20 - Assistente COA

## Objetivo

Documentar a tela Assistente COA, uma area de consulta operacional capaz de responder perguntas sobre dados registrados no sistema, sem inventar informacoes e sem executar alteracoes diretas em WhatsApp, Excel ou banco.

## Descricao completa

O Assistente COA sera uma interface de consulta sobre o historico, ocorrencias, frotas, operacoes, aprovacoes, relatorios e divergencias. Ele devera ajudar administradores e gestores a entender rapidamente o que aconteceu durante o dia, quais pendencias permanecem abertas e quais operacoes exigem atencao.

O assistente nao deve ser tratado como autoridade autonoma para alterar dados. Ele pode preparar consultas, indicar registros e sugerir caminhos, mas toda acao de mudanca deve seguir os fluxos formais de aprovacao.

## Funcionamento

O usuario podera fazer perguntas em linguagem natural. O sistema devera:

1. Identificar o escopo da pergunta.
2. Consultar somente dados registrados.
3. Diferenciar informacao confirmada, pendente e ausente.
4. Responder com linguagem clara e operacional.
5. Citar horario da ultima atualizacao relevante.
6. Permitir abrir os registros que originaram a resposta.
7. Indicar quando nao houver dados suficientes.

## Exemplos de perguntas

- Quais maquinas continuam paradas?
- O que aconteceu no Plantio hoje?
- Qual frota ficou mais tempo parada?
- Quais equipamentos mudaram de setor?
- Qual operacao teve mais ocorrencias?
- Mostre somente ocorrencias do Preparo de Solo.
- Gere o relatorio do Turno C.
- Quais pendencias devem ser passadas ao proximo turno?
- Quais operacoes estao sem atualizacao?
- O que mudou desde o ultimo relatorio?

## Regras obrigatorias

- Responder somente com informacoes registradas no sistema.
- Nunca inventar informacao.
- Informar quando nao existirem dados suficientes.
- Diferenciar informacao confirmada de informacao pendente.
- Citar horario da ultima atualizacao.
- Permitir abrir os registros que originaram a resposta.
- Nao alterar Excel ou WhatsApp diretamente por uma pergunta.
- Acoes de alteracao sempre precisam seguir o fluxo de aprovacao.

## Tipos de resposta

### Resposta direta

Usada quando ha dados suficientes e confirmados.

### Resposta com pendencias

Usada quando parte dos dados ainda aguarda aprovacao ou confirmacao.

### Resposta insuficiente

Usada quando o sistema nao possui dados suficientes para responder.

### Resposta com acao sugerida

Usada quando o usuario pode abrir uma tela, revisar ocorrencias ou gerar um rascunho de relatorio.

## Aprendizado de padroes

Funcionalidade futura supervisionada. O sistema podera observar:

- Mensagem recebida.
- Interpretacao sugerida.
- Correcao feita pelo administrador.
- Resultado aprovado.

Com o tempo, podera sugerir:

- Status mais provavel.
- Motivo mais provavel.
- Operacao mais provavel.
- Frota mais provavel.
- Descricao padronizada.

Regras:

- Nunca ativar aprovacao automatica sem autorizacao explicita.
- Mostrar nivel de confianca.
- Permitir apagar padroes aprendidos.
- Permitir revisar exemplos usados.
- Nao aprender com alteracoes rejeitadas.
- Nao aprender com dados incompletos.
- Toda automacao futura devera ser reversivel.

## Responsabilidades

O Assistente COA devera:

- Facilitar consultas operacionais.
- Reduzir tempo para encontrar informacoes.
- Apoiar relatorios e troca de turno.
- Mostrar fontes usadas.
- Preservar limites de permissao.
- Evitar resposta especulativa.

Nao devera:

- Aprovar alteracoes.
- Atualizar planilhas.
- Enviar mensagens sem fluxo proprio.
- Transformar pendencia em fato confirmado.
- Ocultar falta de dados.

## Futuras expansoes

- Consultas por voz.
- Sugestoes proativas.
- Resumos por unidade.
- Respostas com graficos.
- Comparacao entre turnos.
- Exportacao de resposta para relatorio.

## Dependencias

- Historico.
- Central de ocorrencias.
- Banco de dados futuro.
- Controle de permissoes.
- Indicadores.
- Relatorios.

## Observacoes

O Assistente COA deve ser util porque e confiavel, nao porque responde tudo. Quando nao houver dados, a resposta correta e admitir a ausencia de informacao.
