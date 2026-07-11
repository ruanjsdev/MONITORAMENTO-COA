# 07 - Usuarios

## Objetivo

Documentar os tipos de usuarios do COA-BOT, suas permissoes, responsabilidades, limites de acesso e requisitos de auditoria.

## Descricao completa

O COA-BOT devera operar com usuarios de diferentes responsabilidades. O controle de acesso e essencial porque o sistema lidara com dados operacionais e podera alterar planilhas oficiais. Cada usuario deve ter permissao compativel com sua funcao.

Os usuarios poderao interagir pelo WhatsApp, pelo futuro painel administrativo ou por ambos, conforme perfil.

## Funcionamento

O sistema devera identificar usuarios por:

- Numero de WhatsApp.
- Nome operacional.
- Perfil de acesso.
- Grupo autorizado.
- Status ativo ou inativo.
- Unidade, setor ou frente associada, quando aplicavel.

Antes de processar comandos ou relatorios, o sistema devera verificar se o usuario possui permissao adequada.

## Responsabilidades

### Operador

- Enviar relatorios operacionais.
- Corrigir informacoes quando solicitado.
- Responder perguntas de esclarecimento.

### Administrador

- Aprovar ou rejeitar propostas.
- Consultar historico.
- Configurar usuarios.
- Autorizar grupos.
- Revisar falhas e inconsistencias.

### Gestor

- Acompanhar relatorios.
- Consultar indicadores.
- Receber notificacoes consolidadas.
- Validar regras de negocio.

### Suporte tecnico

- Monitorar funcionamento do sistema.
- Diagnosticar falhas.
- Realizar manutencao.
- Restaurar backups quando necessario.

## Perfis iniciais

Perfis recomendados:

- `OPERADOR`: envia informacoes, mas nao aprova alteracoes.
- `ADMINISTRADOR`: aprova, rejeita e configura parametros principais.
- `GESTOR`: consulta informacoes e recebe relatorios.
- `SUPORTE`: acessa diagnosticos tecnicos e manutencao.

## Regras de acesso

- Usuario inativo nao deve gerar atualizacao automatica.
- Numero desconhecido deve ser ignorado ou sinalizado.
- Administrador nao deve aprovar proposta gerada por ele mesmo quando houver regra de segregacao.
- Toda decisao administrativa deve ser registrada.
- Permissoes devem seguir o principio do menor privilegio.

## Futuras expansoes

- Integracao com diretorio corporativo.
- Login com autenticacao multifator.
- Perfis customizados.
- Permissoes por unidade agricola.
- Permissoes por tipo de planilha.
- Escalas de substituicao de aprovadores.
- Trilhas de certificacao de operadores.

## Dependencias

- Cadastro confiavel de usuarios.
- Lista de numeros autorizados.
- Politica de seguranca da empresa.
- Modulo de autenticacao futuro.
- Historico de acoes.

## Observacoes

Controle de usuarios e parte central da seguranca do COA-BOT. Nenhum fluxo critico deve depender apenas do texto da mensagem; a identidade e permissao do remetente sempre devem ser verificadas.

## Permissoes no painel inteligente

Com a evolucao do painel, as permissoes deverao ser controladas por tela, acao e tipo de dado. Exemplos:

- Operadores podem enviar informacoes e consultar retornos limitados.
- Administradores podem aprovar, rejeitar, editar ocorrencias, configurar operacoes e enviar relatorios.
- Gestores podem consultar dashboard, historico, indicadores e relatorios.
- Suporte pode acessar logs, estado do sistema, diagnosticos, backups e configuracoes tecnicas.

A versao mobile/PWA deve respeitar as mesmas permissoes do desktop. Aprovacoes pelo celular, edicoes de status, envio de relatorio e resolucao de conflitos devem exigir confirmacao antes da acao final.

O Assistente COA tambem devera respeitar permissoes. Um usuario nao deve receber resposta sobre dados que nao poderia consultar diretamente no painel.
