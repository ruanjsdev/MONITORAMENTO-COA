# 18 - Mapa de Telas

## Objetivo

Documentar o mapa funcional completo do painel desktop e mobile/PWA do COA-BOT, definindo objetivo, informacoes exibidas, botoes, filtros, acoes, permissoes, comportamento no celular e estados esperados de cada tela.

## Descricao completa

O painel do COA-BOT devera funcionar como centro operacional do COA. Ele nao sera apenas uma interface de aprovacao; devera permitir monitoramento em tempo real, revisao de ocorrencias, comparacao entre fontes, consulta historica, configuracao do sistema, acompanhamento de relatorios e suporte a decisoes durante o turno.

A experiencia devera atender dois contextos:

- Desktop: uso operacional completo, com visao ampla, filtros, comparacoes e configuracoes.
- Mobile/PWA: uso rapido em campo ou fora da estacao, priorizando aprovacoes, notificacoes, dashboard resumido, linha do tempo, pesquisa e troca de turno.

## Funcionamento

Cada tela devera respeitar:

- Controle de acesso por perfil.
- Estados de carregamento.
- Estados vazios.
- Estados de erro.
- Confirmacao antes de acoes criticas.
- Registro em historico para acoes relevantes.
- Layout responsivo.
- Linguagem operacional clara.

## Telas

### 1. Login

Objetivo: autenticar usuarios autorizados.

Informacoes exibidas: nome do sistema, campos de acesso, estado de conexao e avisos de seguranca.

Botoes: entrar, recuperar acesso, alternar usuario.

Filtros: nao aplicavel.

Acoes: autenticar, iniciar sessao, registrar tentativa de login.

Permissoes: todos os usuarios cadastrados.

Celular: tela simples, campos grandes e login persistente quando permitido.

Estados: carregando autenticacao, credenciais invalidas, usuario bloqueado, falha de conexao.

Confirmacoes: exigidas apenas para troca de conta ou encerramento de sessao.

### 2. Dashboard

Objetivo: apresentar o estado atual do turno.

Informacoes exibidas: operacoes em andamento, paradas, sem atualizacao, frotas rodando, frotas paradas, frotas disponiveis, pendencias, conflitos, relatorios, status do WhatsApp, Excel, planilhas, agente instalado, proxima troca de turno e proximo relatorio.

Botoes: sincronizar, atualizar, abrir pendencias, abrir conflitos, gerar troca de turno.

Filtros: turno, operacao, grupo, unidade, criticidade.

Acoes: navegar para detalhes, iniciar sincronizacao, abrir linha do tempo.

Permissoes: gestores, administradores e suporte; operadores podem ter visao limitada.

Celular: cards resumidos e contador de pendencias no topo.

Estados: carregando indicadores, sem dados do turno, falha ao consultar fonte, sistema parcialmente offline.

Confirmacoes: sincronizacao nao aplica mudancas automaticamente, portanto nao exige confirmacao destrutiva.

### 3. Monitoramento em tempo real

Objetivo: acompanhar mensagens, eventos e alteracoes conforme chegam.

Informacoes exibidas: feed de mensagens, eventos gerados, confianca da interpretacao, estado de validacao e origem.

Botoes: pausar feed, retomar, abrir mensagem, criar ocorrencia manual, enviar para aprovacao.

Filtros: grupo, operacao, frota, status, confianca, pendencia.

Acoes: revisar mensagem, vincular evento, marcar como irrelevante.

Permissoes: administradores e suporte.

Celular: feed compacto com filtros principais.

Estados: aguardando mensagens, conexao instavel, fonte desconectada.

Confirmacoes: exigidas para descartar ou marcar mensagem como irrelevante.

### 4. Alteracoes pendentes

Objetivo: revisar propostas antes de atualizar banco e Excel.

Informacoes exibidas: operacao, frota, status atual, novo status, descricao, mensagem original, remetente, grupo, horario, confianca e diferenca na planilha.

Botoes: aprovar, editar e aprovar, rejeitar, adiar, marcar duplicada, vincular ocorrencia, abrir mensagem, abrir linha da planilha.

Filtros: operacao, confianca, grupo, turno, status, criticidade.

Acoes: decidir proposta e registrar justificativa.

Permissoes: administradores.

Celular: prioridade para aprovacao rapida com confirmacao.

Estados: sem pendencias, carregando propostas, conflito de dados, falha ao abrir planilha.

Confirmacoes: obrigatorias para aprovar, rejeitar e editar/aprovar.

### 5. Central de ocorrencias

Objetivo: organizar todos os acontecimentos operacionais.

Informacoes exibidas: eventos, origem, status, validacao, confianca, vinculos e resolucao.

Botoes: criar ocorrencia, corrigir, vincular, resolver, reabrir, enviar para aprovacao.

Filtros: data, turno, operacao, frota, grupo, status, pendencia, importancia.

Acoes: revisar, corrigir, agrupar e resolver ocorrencias.

Permissoes: administradores e suporte; gestores podem consultar.

Celular: lista por prioridade e pendencias abertas.

Estados: sem ocorrencias, dados incompletos, evento duplicado, erro de validacao.

Confirmacoes: exigidas para corrigir, resolver ou reabrir.

### 6. Linha do tempo

Objetivo: exibir acontecimentos do turno em ordem cronologica.

Informacoes exibidas: horario, evento, operacao, frota, local, mensagem original e status de resolucao.

Botoes: abrir mensagem, corrigir, vincular eventos, marcar resolvida.

Filtros: operacao, frota, grupo, turno, status, somente importantes, somente pendencias.

Acoes: navegar para evento, revisar contexto e resolver pendencias.

Permissoes: administradores, gestores e suporte.

Celular: linha vertical compacta.

Estados: turno sem eventos, carregando, filtros sem resultado.

Confirmacoes: exigidas para correcoes e resolucao.

### 7. Operacoes

Objetivo: consultar e configurar operacoes monitoradas.

Informacoes exibidas: nome, status, grupos associados, planilhas, campos obrigatorios, regras e ultima atualizacao.

Botoes: ativar, desativar, editar, ordenar, abrir historico.

Filtros: ativa, grupo, planilha, criticidade.

Acoes: configurar operacao e associar fontes.

Permissoes: administradores.

Celular: consulta e ativacao simples; configuracoes avancadas podem ser desktop.

Estados: sem operacoes, configuracao incompleta, conflito de regra.

Confirmacoes: exigidas para desativar operacao.

### 8. Frotas

Objetivo: consultar e configurar frotas e equipamentos.

Informacoes exibidas: identificador, estado atual, operacao, local, ultima atualizacao, tempo parado e disponibilidade.

Botoes: abrir historico, editar cadastro, marcar disponibilidade, pesquisar.

Filtros: status, operacao, local, parada aberta, disponivel.

Acoes: consultar frota, corrigir cadastro, abrir eventos.

Permissoes: administradores e suporte; gestores consultam.

Celular: busca direta por frota.

Estados: frota nao encontrada, sem historico, dados divergentes.

Confirmacoes: exigidas para alterar cadastro.

### 9. Historico por frota

Objetivo: mostrar o ciclo de status de uma frota.

Informacoes exibidas: estado atual, operacao atual, local, ultima atualizacao, historico de status, motivos de parada, tempo total parado, quantidade de paradas, mensagens, alteracoes aprovadas/rejeitadas, relatorios e linha do tempo.

Botoes: filtrar periodo, abrir mensagem, corrigir evento, exportar consulta.

Filtros: periodo, operacao, status, motivo.

Acoes: revisar evolucao da frota.

Permissoes: administradores, gestores e suporte.

Celular: foco em estado atual, tempo parado e eventos recentes.

Estados: sem eventos, parada aberta, dados incompletos.

Confirmacoes: exigidas para corrigir evento.

### 10. Comparacao WhatsApp x Excel x Banco

Objetivo: identificar divergencias entre fontes.

Informacoes exibidas: valor no WhatsApp, Excel e banco; tipo de divergencia; ultima atualizacao; origem e recomendacao.

Botoes: revisar, aprovar alteracao, manter Excel, manter banco, usar WhatsApp, editar manualmente, ignorar, registrar justificativa.

Filtros: tipo de conflito, operacao, frota, criticidade, fonte desatualizada.

Acoes: resolver divergencia seguindo fluxo de aprovacao.

Permissoes: administradores e suporte.

Celular: resolucao simples de divergencias prioritarias.

Estados: sistema sincronizado, conflitos encontrados, fonte indisponivel.

Confirmacoes: obrigatorias para qualquer resolucao.

### 11. Relatorios automaticos

Objetivo: configurar, gerar e consultar relatorios periodicos.

Informacoes exibidas: relatorios programados, destino, horario, status, ultima execucao e falhas.

Botoes: gerar agora, editar agenda, pausar, ativar, visualizar historico.

Filtros: tipo, status, destino, horario.

Acoes: configurar e acompanhar relatorios.

Permissoes: administradores e gestores.

Celular: consulta de status e reenvio controlado.

Estados: sem agendamentos, atrasado, falha de envio.

Confirmacoes: exigidas para envio manual e alteracao de destino.

### 12. Troca de turno

Objetivo: gerar, revisar e enviar relatorio de passagem de turno.

Informacoes exibidas: data, turno, responsavel, proximo responsavel, fechamento, operacoes, pre-visualizacao, pendencias e informacoes nao confirmadas.

Botoes: gerar, atualizar informacoes, editar, salvar rascunho, aprovar, enviar WhatsApp, copiar texto, cancelar envio.

Filtros: data, turno, operacao, pendencias.

Acoes: editar relatorio e enviar com historico.

Permissoes: administradores; gestores podem consultar.

Celular: revisao e aprovacao rapida.

Estados: rascunho, aguardando aprovacao, aprovado, enviado, falha de envio.

Confirmacoes: obrigatorias para aprovar e enviar.

### 13. Assistente COA

Objetivo: permitir consultas em linguagem natural sobre dados registrados.

Informacoes exibidas: pergunta, resposta, fontes usadas, horario da ultima atualizacao e registros relacionados.

Botoes: perguntar, abrir fontes, gerar relatorio, limpar conversa.

Filtros: periodo, turno, operacao, fonte.

Acoes: consultar dados, abrir registros, preparar relatorio.

Permissoes: conforme dados consultados.

Celular: caixa de pergunta simples e respostas compactas.

Estados: sem dados suficientes, pergunta ambigua, fonte indisponivel.

Confirmacoes: qualquer acao de alteracao deve sair do assistente e seguir aprovacao.

### 14. Grupos

Objetivo: configurar grupos de WhatsApp monitorados.

Informacoes exibidas: nome, identificador, operacoes associadas, usuarios permitidos, status.

Botoes: adicionar, editar, ativar, desativar, testar envio.

Filtros: ativo, operacao, unidade.

Acoes: gerenciar grupos autorizados.

Permissoes: administradores e suporte.

Celular: consulta e ativacao simples.

Estados: grupo sem permissao, identificador ausente, conexao falhou.

Confirmacoes: exigidas para desativar ou alterar destino.

### 15. Planilhas

Objetivo: consultar planilhas oficiais e status de integridade.

Informacoes exibidas: arquivo, abas, ultima leitura, ultimo backup, bloqueios, macros e status.

Botoes: verificar, abrir mapeamento, consultar backups.

Filtros: status, tipo, operacao.

Acoes: diagnosticar planilhas.

Permissoes: administradores e suporte.

Celular: status resumido.

Estados: arquivo indisponivel, bloqueado, leitura falhou.

Confirmacoes: nenhuma escrita direta pela tela.

### 16. Configuracao do Excel

Objetivo: mapear abas, colunas, intervalos e regioes.

Informacoes exibidas: planilha, aba, coluna, campo, tipo de dado, regra e validacao.

Botoes: adicionar mapeamento, editar, testar leitura, validar.

Filtros: planilha, aba, operacao, campo.

Acoes: configurar integracao futura com Excel.

Permissoes: administradores e suporte.

Celular: consulta; edicao preferencialmente desktop.

Estados: mapeamento incompleto, coluna nao encontrada, teste falhou.

Confirmacoes: exigidas para salvar alteracoes.

### 17. Configuracao do WhatsApp

Objetivo: configurar conexao, grupos, regras de leitura e envio.

Informacoes exibidas: status de conexao, grupos, eventos, filas e falhas.

Botoes: testar conexao, validar grupos, pausar monitoramento, retomar.

Filtros: grupo, status, operacao.

Acoes: diagnosticar e configurar canal.

Permissoes: suporte e administradores.

Celular: status e alertas.

Estados: desconectado, reconectando, sem permissao.

Confirmacoes: exigidas para pausar monitoramento.

### 18. Notificacoes

Objetivo: configurar alertas e destinos.

Informacoes exibidas: tipos de notificacao, horarios, destinatarios, status e historico.

Botoes: criar regra, editar, testar, pausar.

Filtros: tipo, destino, severidade.

Acoes: configurar notificacoes.

Permissoes: administradores.

Celular: receber e abrir notificacoes.

Estados: sem regra, envio falhou, destino invalido.

Confirmacoes: exigidas para notificacoes criticas.

### 19. Usuarios

Objetivo: gerenciar usuarios autorizados.

Informacoes exibidas: nome, perfil, numero, status, grupos e permissoes.

Botoes: adicionar, editar, inativar, redefinir acesso.

Filtros: perfil, status, grupo.

Acoes: controlar acesso.

Permissoes: administradores.

Celular: consulta e inativacao emergencial.

Estados: usuario duplicado, permissao incompleta.

Confirmacoes: obrigatorias para inativar ou elevar permissao.

### 20. Permissoes

Objetivo: configurar perfis e permissoes.

Informacoes exibidas: perfis, acoes permitidas, restricoes e auditoria.

Botoes: criar perfil, editar, duplicar, revisar.

Filtros: perfil, modulo, acao.

Acoes: manter controle de acesso.

Permissoes: administradores principais.

Celular: consulta apenas, salvo emergencia.

Estados: regra conflitante, permissao excessiva.

Confirmacoes: obrigatorias para mudancas criticas.

### 21. Logs

Objetivo: consultar eventos tecnicos.

Informacoes exibidas: data, modulo, severidade, erro, contexto e usuario.

Botoes: filtrar, exportar, marcar analisado.

Filtros: periodo, modulo, severidade, status.

Acoes: diagnosticar problemas.

Permissoes: suporte.

Celular: alertas criticos.

Estados: sem logs, excesso de eventos, falha de consulta.

Confirmacoes: exigidas para arquivar.

### 22. Backups

Objetivo: consultar e restaurar backups quando autorizado.

Informacoes exibidas: arquivo, data, motivo, operacao associada, usuario e status.

Botoes: verificar, comparar, solicitar restauracao.

Filtros: planilha, data, status.

Acoes: auditar backups e iniciar restauracao controlada.

Permissoes: suporte e administradores principais.

Celular: consulta emergencial.

Estados: backup ausente, corrompido, restauracao bloqueada.

Confirmacoes: restauracao exige confirmacao reforcada e procedimento formal.

### 23. Configuracoes gerais

Objetivo: centralizar parametros editaveis do sistema.

Informacoes exibidas: grupos, operacoes, planilhas, frotas, status, sinonimos, modelos, horarios, turnos, responsaveis, relatorios, notificacoes, criterios, regras, usuarios e permissoes.

Botoes: salvar, testar, restaurar padrao, exportar configuracao.

Filtros: categoria, modulo, status.

Acoes: configurar o sistema sem alteracao de codigo.

Permissoes: administradores principais e suporte.

Celular: consulta; edicao limitada.

Estados: configuracao invalida, dependencia ausente, conflito.

Confirmacoes: obrigatorias para salvar configuracoes criticas.

### 24. Estado do sistema

Objetivo: mostrar saude operacional e tecnica do COA-BOT.

Informacoes exibidas: WhatsApp, Excel, banco, planilhas, agente instalado, filas, pendencias, ultima sincronizacao e versao.

Botoes: sincronizar, testar conexoes, baixar diagnostico, abrir logs.

Filtros: modulo, severidade.

Acoes: diagnosticar disponibilidade.

Permissoes: suporte, administradores com visao resumida.

Celular: status geral e alertas criticos.

Estados: sincronizado, diferencas encontradas, modulo offline, manutencao.

Confirmacoes: exigidas para acoes que pausem monitoramento.

## Responsabilidades

O mapa de telas deve orientar implementacao futura, priorizacao de UX e definicao de permissoes.

## Futuras expansoes

- Modo escuro.
- Perfis de painel por unidade.
- Layout para sala de controle.
- Atalhos de teclado no desktop.
- Widgets configuraveis por usuario.

## Dependencias

- Cadastro de usuarios e permissoes.
- Modelo de ocorrencias.
- Historico.
- Configuracoes editaveis.
- Modulos de WhatsApp, Excel, banco e notificacoes.

## Observacoes

Este documento descreve comportamento funcional. Nenhuma interface foi implementada nesta etapa.
