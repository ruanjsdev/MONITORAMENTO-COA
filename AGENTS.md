# AGENTS

## Objetivo

Orientar desenvolvedores, agentes de IA e colaboradores tecnicos que atuarem no projeto COA-BOT, definindo principios de trabalho, limites, responsabilidades e padroes de manutencao.

## Descricao completa

O COA-BOT e um projeto empresarial voltado para automacao operacional do COA. Qualquer agente ou desenvolvedor que atue neste repositorio deve priorizar confiabilidade, rastreabilidade, seguranca e respeito as planilhas oficiais.

Antes de implementar qualquer funcionalidade, a documentacao em `docs/` deve ser lida e considerada. Mudancas tecnicas devem preservar a arquitetura modular e o controle de aprovacao.

## Funcionamento

Diretrizes para contribuicao:

1. Ler a documentacao relevante antes de alterar o projeto.
2. Nunca modificar planilhas oficiais sem regra e backup.
3. Nunca criar automacao que ignore aprovacao exigida.
4. Registrar decisoes tecnicas importantes.
5. Manter alteracoes pequenas e revisaveis.
6. Criar testes para comportamentos criticos.
7. Preservar compatibilidade com evolucoes futuras.

## Responsabilidades

Agentes e desenvolvedores devem:

- Respeitar os limites de escopo definidos pelo usuario.
- Evitar implementacoes improvisadas.
- Proteger dados operacionais.
- Documentar novas regras.
- Validar impacto em Excel, WhatsApp, historico e seguranca.
- Tratar falhas como parte normal do sistema.

## Regras de ouro

- Planilhas oficiais sao ativos criticos.
- Historico e auditoria nao sao opcionais.
- Aprovacao humana deve ser preservada quando exigida.
- Mensagens ambiguas devem gerar revisao, nao atualizacao automatica.
- Toda integracao externa deve ser encapsulada.
- Toda funcionalidade critica deve ser testavel.

## Futuras expansoes

Este arquivo podera incluir futuramente:

- Padroes de branch.
- Padroes de commit.
- Convencoes de codigo.
- Fluxo de revisao.
- Checklist de release.
- Procedimento de incidente.

## Dependencias

- Documentacao em `docs/`.
- Roadmap do projeto.
- Backlog priorizado.
- Politicas da empresa.

## Observacoes

Este arquivo deve ser consultado por qualquer pessoa ou agente antes de atuar no projeto. Ele existe para manter coerencia tecnica ao longo de muitos anos.

## Relatorio de troca de turno

Agentes e desenvolvedores devem tratar o relatorio de troca de turno como documento operacional auditavel. Qualquer implementacao futura devera preservar:

- Separacao entre rascunho automatico e texto final enviado.
- Edicao humana antes do envio quando configurada.
- Registro de usuario que editou e aprovou.
- Registro do grupo de destino.
- Registro do identificador da mensagem enviada.
- Bloqueio de envio para grupo nao autorizado.
- Proibicao de inventar informacoes ausentes.
- Separacao clara entre dados confirmados e pendentes.

## Monitoramento inteligente

Ao trabalhar no projeto, agentes e desenvolvedores devem preservar a ideia de que o COA-BOT e um assistente operacional. Novas funcionalidades devem se integrar a Central de Ocorrencias, historico, aprovacoes, sincronizacao e permissoes.

Nenhum recurso de aprendizado, assistente ou sincronizacao deve aplicar mudancas automaticamente sem fluxo de aprovacao documentado.
