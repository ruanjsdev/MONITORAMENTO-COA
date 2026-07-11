# 14 - Testes

## Objetivo

Definir a estrategia inicial de testes do COA-BOT, garantindo confiabilidade, seguranca e previsibilidade antes de qualquer uso em ambiente real.

## Descricao completa

O COA-BOT atuara sobre dados operacionais e planilhas oficiais, portanto testes devem ser parte obrigatoria do desenvolvimento. A estrategia deve cobrir desde regras de negocio ate integracao com WhatsApp, manipulacao de Excel, historico, seguranca e notificacoes.

Nesta etapa nao serao criados testes automatizados, apenas a documentacao da estrategia.

## Funcionamento

A estrategia de testes devera incluir:

- Testes unitarios.
- Testes de integracao.
- Testes de regressao.
- Testes com copias das planilhas oficiais.
- Testes de permissao.
- Testes de falha.
- Testes de recuperacao.
- Testes de relatorios.
- Testes manuais homologados pelo COA.

## Responsabilidades

Os testes deverao verificar:

- Interpretacao correta de mensagens.
- Rejeicao de mensagens invalidas.
- Validacao de campos obrigatorios.
- Deteccao de duplicidade.
- Deteccao de divergencias.
- Aprovacao e rejeicao.
- Atualizacao correta das planilhas.
- Preservacao de macros e formulas.
- Registro de historico.
- Envio de notificacoes.
- Comportamento em falhas.

## Tipos de teste

### Testes de interpretacao

Validam se mensagens reais ou simuladas sao convertidas corretamente em dados estruturados.

### Testes de regras

Validam se cada regra de negocio produz o resultado esperado.

### Testes de Excel

Validam leitura, comparacao, backup, escrita e preservacao dos arquivos.

### Testes de aprovacao

Validam se nenhuma alteracao critica ocorre sem decisao autorizada.

### Testes de seguranca

Validam bloqueio de usuarios, grupos e comandos nao autorizados.

### Testes de falha

Simulam erros de conexao, arquivo bloqueado, arquivo corrompido, mensagem duplicada e falha de envio.

## Massa de testes

Deve ser criada futuramente uma colecao de exemplos em `exemplos/`, contendo:

- Mensagens validas.
- Mensagens incompletas.
- Mensagens com erros.
- Mensagens duplicadas.
- Mensagens ambiguas.
- Planilhas de teste.
- Resultados esperados.

## Futuras expansoes

- Pipeline de integracao continua.
- Ambiente de homologacao.
- Testes automatizados de captura visual.
- Testes de carga.
- Testes de longo prazo.
- Testes de compatibilidade com novas versoes do Excel.
- Testes de restauracao de backup.

## Dependencias

- Regras de negocio documentadas.
- Copias seguras das planilhas.
- Exemplos reais anonimizados.
- Ambiente de testes.
- Criterios de aceite do COA.

## Observacoes

Nenhum teste deve usar diretamente planilhas oficiais de producao. O desenvolvimento deve trabalhar com copias controladas e identificadas como ambiente de teste.

Cada bug corrigido deve gerar um teste de regressao correspondente.

## Testes do relatorio de troca de turno

Cenarios que devem ser documentados e futuramente automatizados ou homologados:

- Operacao sem nenhuma atualizacao no turno.
- Frota que parou e voltou a operar.
- Frota que continua parada no encerramento.
- Mensagem avulsa recebida apos o relatorio completo.
- Informacao pendente de aprovacao.
- Informacao rejeitada.
- Mensagem duplicada.
- Mensagem antiga enviada novamente.
- Relatorio gerado com dados de duas planilhas.
- Edicao manual antes do envio.
- Falha de conexao com o WhatsApp.
- Falha do Excel.
- Relatorio salvo como rascunho.
- Envio para grupo incorreto bloqueado.
- Mencao do proximo responsavel.
- Operacao desativada no relatorio.
- Turno encerrado com pendencias.
- Relatorio enviado e armazenado no historico.

Os testes devem validar que o sistema nao inventa informacoes, separa pendencias de dados confirmados, respeita configuracoes de envio e salva exatamente o texto final enviado.

## Testes de monitoramento inteligente

Cenarios adicionais:

- Linha do tempo correta.
- Calculo de tempo parado.
- Parada atravessando turnos.
- Mensagem duplicada.
- Evento corrigido.
- Divergencia entre banco e Excel.
- Divergencia entre WhatsApp e Excel.
- Sincronizacao sem diferencas.
- Sincronizacao com conflitos.
- Pesquisa por frota.
- Historico por operacao.
- Notificacao mobile.
- Aprovacao pelo celular.
- Relatorio de troca de turno resumido.
- Consulta ao Assistente COA.
- Assistente sem dados suficientes.
- Dados pendentes nao apresentados como confirmados.
- Reacao positiva somente apos sucesso completo.
