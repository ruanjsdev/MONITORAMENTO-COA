# 05 - Excel

## Objetivo

Documentar a estrategia de integracao com as planilhas Excel oficiais, incluindo leitura, comparacao, atualizacao, preservacao de estrutura, geracao de imagens e controle de seguranca sobre arquivos criticos.

## Descricao completa

As planilhas Excel sao ativos centrais do COA-BOT. Elas representam a fonte oficial inicial da operacao agricola e devem ser manipuladas com extremo cuidado. Os arquivos existentes em `planilhas/` possuem extensao `.xlsm`, indicando possivel presenca de macros, formulas e estruturas avancadas.

O sistema devera respeitar a estrutura original dos arquivos e evitar qualquer processo que remova macros, formulas, estilos, abas, protecoes, imagens, filtros ou configuracoes internas.

Planilhas oficiais iniciais:

- `Acompanhamento Tratos Culturais.xlsm`
- `Planilha Plantio cana.xlsm`

## Funcionamento

O fluxo de integracao com Excel devera contemplar:

1. Identificacao da planilha correta para o tipo de operacao.
2. Abertura segura do arquivo.
3. Leitura das abas e regioes necessarias.
4. Localizacao dos campos correspondentes.
5. Comparacao entre dados recebidos e dados existentes.
6. Preparacao de alteracao pendente.
7. Backup do arquivo antes da modificacao.
8. Aplicacao da alteracao aprovada.
9. Validacao pos-gravacao.
10. Registro de historico.
11. Geracao de imagem original para relatorio.

## Responsabilidades

O modulo Excel devera:

- Mapear planilhas, abas, linhas e colunas.
- Preservar arquivos originais.
- Evitar escrita concorrente.
- Criar backups antes de alteracoes.
- Validar se o arquivo esta acessivel.
- Detectar alteracoes externas.
- Gerar imagens fieis das areas de relatorio.
- Registrar qual celula foi lida ou modificada.

Nao devera:

- Interpretar mensagens de WhatsApp.
- Aprovar alteracoes.
- Aplicar regras de negocio fora do escopo de planilha.
- Corrigir estrutura de planilha sem autorizacao.

## Cuidados obrigatorios

### Arquivos `.xlsm`

Arquivos com macros exigem cuidado especial. Qualquer ferramenta futura escolhida para manipulacao devera comprovar preservacao de macros e componentes internos.

### Backup

Antes de cada alteracao aprovada, deve existir copia de seguranca identificavel por data, hora, usuario aprovador e operacao.

### Concorrencia

O sistema deve impedir duas escritas simultaneas no mesmo arquivo. Operacoes concorrentes devem ser enfileiradas ou bloqueadas.

### Integridade visual

Quando relatorios forem enviados como imagem da planilha, a imagem deve refletir a aparencia real do Excel, incluindo formatacao, cores, bordas, filtros, graficos e regioes relevantes.

## Futuras expansoes

- Mapeamento configuravel de celulas por painel.
- Suporte a novas planilhas oficiais.
- Comparacao visual antes e depois.
- Exportacao de relatorios em PDF.
- Versionamento automatico de arquivos.
- Integracao com armazenamento em nuvem.
- Validacao de formulas apos alteracao.
- Monitoramento de alteracoes manuais feitas fora do sistema.

## Dependencias

- Estrutura atual das planilhas oficiais.
- Regras de mapeamento por tipo de operacao.
- Permissao de leitura e escrita nos arquivos.
- Estrategia de backup.
- Ferramenta confiavel para manipular `.xlsm`.
- Ferramenta confiavel para capturar imagem real da planilha.

## Observacoes

Alterar planilhas oficiais e uma operacao critica. A primeira versao do sistema deve priorizar seguranca e rastreabilidade acima de velocidade.

Qualquer mudanca manual na estrutura das planilhas deve ser comunicada ao time responsavel pelo COA-BOT, pois pode impactar mapeamentos, validacoes e relatorios.

## Relatorio de troca de turno e Excel

O relatorio de troca de turno podera utilizar o estado atual registrado nas planilhas oficiais como uma das fontes de consolidacao. Essa consulta deve ser apenas leitura durante a geracao do relatorio, exceto quando houver outro fluxo aprovado de atualizacao de planilha.

O sistema devera identificar quais informacoes vieram das planilhas e quais vieram de mensagens, aprovacoes ou observacoes manuais. Essa distincao e importante para auditoria e para evitar que o relatorio apresente como confirmado um dado que ainda dependa de aprovacao.

Falhas na leitura do Excel durante a geracao do relatorio devem ser destacadas para o administrador. O relatorio podera ser salvo como rascunho com alerta de informacao incompleta, mas nao deve mascarar a falha como ausencia normal de ocorrencia.

## Comparacao com banco e WhatsApp

O Excel participara da comparacao entre fontes. O sistema devera identificar planilha desatualizada, linha duplicada, status diferente, frota inexistente, operacao incorreta e diferencas entre o dado da planilha e o dado recebido pelo WhatsApp ou registrado no banco futuro.

A comparacao nao deve alterar o Excel automaticamente. Qualquer atualizacao deve seguir aprovacao, backup, escrita controlada, confirmacao da celula atualizada e registro historico.
