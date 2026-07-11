# 23 - Mapeamento Real das Planilhas

## Objetivo

Registrar o resultado da analise real, em modo somente leitura, das planilhas oficiais existentes em `planilhas/`, identificando estrutura, abas, riscos, candidatos de mapeamento, areas candidatas para imagem e duvidas que exigem confirmacao humana antes de qualquer automacao.

## Restricoes respeitadas

- As planilhas nao foram alteradas.
- As planilhas nao foram salvas.
- As planilhas nao foram renomeadas.
- Nenhuma macro foi executada.
- A analise foi feita por leitura do arquivo `.xlsm` como pacote XML/ZIP.
- Mapeamentos ambiguos foram marcados como necessidade de confirmacao.

## Arquivos analisados

### Planilha Plantio cana.xlsm

- Caminho: `planilhas/Planilha Plantio cana.xlsm`
- Extensao: `.xlsm`
- Tamanho: 1.556.609 bytes
- Abas: 6
- Projeto VBA/macros: detectado
- Links externos: detectados
- Celulas mescladas: detectadas
- Protecao de workbook: nao detectada pela analise XML

Abas encontradas:

| Ordem | Aba | Estado | Intervalo usado | Formulas | Mesclagens |
| --- | --- | --- | --- | --- | --- |
| 1 | COLHEITA E TRANSPORTE DE MUDA | visivel | A1:AJ25 | 30 | 25 |
| 2 | PREPARO DE SOLO (2) | oculta | A1:AJ35 | 53 | 39 |
| 3 | PREPARO DE SOLO | visivel | A1:AL37 | 55 | 39 |
| 4 | PLANTIO | visivel | A1:AI26 | 34 | 28 |
| 5 | PRODUCAO DAS OPERACOES | visivel | A1:X28 | 12 | 79 |
| 6 | Controle de Dados | visivel | A1:S22 | 15 | 1 |

### Acompanhamento Tratos Culturais.xlsm

- Caminho: `planilhas/Acompanhamento Tratos Culturais.xlsm`
- Extensao: `.xlsm`
- Tamanho: 1.472.198 bytes
- Abas: 14
- Projeto VBA/macros: nao detectado pela analise XML
- Links externos: nao detectados pela analise XML
- Celulas mescladas: detectadas
- Protecao de workbook: nao detectada pela analise XML

Observacao: o anexo da quarta etapa citava `Acompanhamento Tratos Culturais(1).xlsm`, mas o arquivo existente no workspace e `Acompanhamento Tratos Culturais.xlsm`.

Abas encontradas:

| Ordem | Aba | Estado | Intervalo usado | Formulas | Mesclagens |
| --- | --- | --- | --- | --- | --- |
| 1 | Planilha5 | oculta | A1 | 0 | 0 |
| 2 | Planilha7 | oculta | A1 | 0 | 0 |
| 3 | CPD | visivel | A1:AH51 | 34 | 28 |
| 4 | COMPOSTAGEM | visivel | A1:AH29 | 21 | 14 |
| 5 | CULTIVO | visivel | A1:AH50 | 31 | 31 |
| 6 | CORRECAO DE SOLO | visivel | A1:AH36 | 15 | 14 |
| 7 | QUEBRA LOMBO | visivel | A1:AD31 | 24 | 20 |
| 8 | NUMERO DE VIAGENS | visivel | B1:N22 | 1 | 1 |
| 9 | Planilha6 | oculta | A1 | 0 | 0 |
| 10 | Planilha4 | oculta | B1:R61 | 0 | 4 |
| 11 | PAINEL (6) | oculta | A1:AQ67 | 61 | 57 |
| 12 | Planilha3 | oculta | D3:I23 | 0 | 0 |
| 13 | Planilha2 | oculta | A1 | 0 | 0 |
| 14 | Planilha1 | oculta | B4:P34 | 1 | 30 |

## Operacoes identificadas

### Plantio Mecanizado

- Arquivo: `Planilha Plantio cana.xlsm`
- Aba principal candidata: `PLANTIO`
- Linha de cabecalho candidata: 7
- Coluna de setor candidata: D
- Coluna de frota candidata: F
- Coluna de implemento candidata: G
- Coluna de status candidata: H
- Coluna de rendimento candidata: I
- Coluna de horas candidata: J
- Colunas de datas/horarios de parada e previsao candidatas: K a R
- Coluna de descricao/OS candidata: S
- Campos calculados: formulas detectadas na aba; confirmar antes de escrita
- Campos que nao podem ser alterados: necessita confirmacao
- Chave provavel para localizar linha: combinacao de frota, implemento e setor; necessita confirmacao
- Duplicidade: existem referencias repetidas a frota nos cabecalhos e no corpo; confirmar regra

### Colheita e Transporte de Muda

- Arquivo: `Planilha Plantio cana.xlsm`
- Aba principal candidata: `COLHEITA E TRANSPORTE DE MUDA`
- Linha de cabecalho candidata: 7
- Coluna de setor candidata: D
- Coluna de frota candidata: F
- Coluna de implemento candidata: G
- Coluna de status candidata: H
- Coluna de descricao/OS candidata: S
- Demais campos: seguem estrutura semelhante a aba `PLANTIO`
- Necessita confirmacao: uso de lideres de turno, totais e campos de programacao

### Preparo de Solo

- Arquivo: `Planilha Plantio cana.xlsm`
- Abas candidatas: `PREPARO DE SOLO` e `PREPARO DE SOLO (2)`
- Observacao: existe uma aba visivel e uma aba oculta com nome semelhante. A relacao entre elas precisa de confirmacao humana.
- Linha de cabecalho candidata: 7
- Coluna de setor candidata: D
- Coluna de frota candidata: F
- Coluna de implemento candidata: G
- Coluna de status candidata: H
- Coluna de descricao/OS candidata: S
- Risco: duas abas semelhantes podem indicar versao auxiliar, historico ou modelo oculto.

### Producao das Operacoes

- Arquivo: `Planilha Plantio cana.xlsm`
- Aba principal candidata: `PRODUCÃO DAS OPERAÇÕES`
- Estrutura: blocos por turno e operacao
- Colunas candidatas de horario: D, J, O e repeticoes posteriores
- Colunas candidatas de lider: G, M, R e repeticoes posteriores
- Frota/status: nao identificados como colunas diretas nessa aba
- Uso provavel: resumo/producao; necessita confirmacao

### Controle de Dados

- Arquivo: `Planilha Plantio cana.xlsm`
- Aba principal candidata: `Controle de Dados`
- Estrutura identificada: data, producao e meta
- Uso provavel: apoio a indicadores e metas
- Necessita confirmacao: se pode ou nao receber escrita futura

### CPD

- Arquivo: `Acompanhamento Tratos Culturais.xlsm`
- Aba principal candidata: `CPD`
- Linha de cabecalho candidata: 7
- Coluna de frota candidata: F
- Coluna de implemento candidata: G
- Coluna de status candidata: H
- Coluna de horas candidata: J
- Coluna de descricao candidata: S
- Setor: nao identificado com seguranca no cabecalho principal

### Compostagem

- Arquivo: `Acompanhamento Tratos Culturais.xlsm`
- Aba principal candidata: `COMPOSTAGEM`
- Linha de cabecalho candidata: 7
- Coluna de setor candidata: E
- Coluna de frota candidata: F
- Coluna de equipamento candidata: G
- Coluna de status candidata: H
- Coluna de descricao candidata: S
- Possui referencias de lideranca no corpo; confirmar uso operacional

### Cultivo

- Arquivo: `Acompanhamento Tratos Culturais.xlsm`
- Aba principal candidata: `CULTIVO`
- Linhas de cabecalho candidatas: 7 e 27
- Coluna de setor candidata: E ou D, conforme bloco
- Coluna de frota candidata: F
- Coluna de implemento candidata: G
- Coluna de status candidata: H
- Coluna de descricao candidata: S
- Risco: mais de um bloco estrutural na mesma aba

### Correcao de Solo

- Arquivo: `Acompanhamento Tratos Culturais.xlsm`
- Aba principal candidata: `CORREÇÃO DE SOLO`
- Linha de cabecalho candidata: 7
- Coluna de setor candidata: E
- Coluna de frota candidata: F
- Coluna de implemento candidata: G
- Coluna de status candidata: H
- Coluna de descricao candidata: S

### Quebra Lombo

- Arquivo: `Acompanhamento Tratos Culturais.xlsm`
- Aba principal candidata: `QUEBRA LOMBO`
- Linhas de cabecalho candidatas: 7 e 19
- Coluna de setor candidata: E
- Coluna de frota candidata: F
- Coluna de implemento candidata: G
- Coluna de status candidata: H
- Coluna de descricao candidata: O
- Risco: existem multiplos blocos e referencias repetidas a frota

### Numero de Viagens

- Arquivo: `Acompanhamento Tratos Culturais.xlsm`
- Aba principal candidata: `NÚMERO DE VIAGENS`
- Linha de cabecalho candidata: 5
- Coluna de data candidata: B
- Coluna de turno candidata: C
- Coluna de setor candidata: D
- Coluna de frota candidata: E
- Coluna de numero de viagens candidata: F
- Coluna de toneladas candidata: G
- Coluna de material candidata: H

### Painel

- Arquivo: `Acompanhamento Tratos Culturais.xlsm`
- Aba candidata: `PAINEL (6)`
- Estado: oculta
- Intervalo usado: A1:AQ67
- Formulas: 61
- Mesclagens: 57
- Uso provavel: painel ou consolidacao visual; necessita confirmacao antes de uso

## Areas candidatas para copiar como imagem

As areas candidatas foram identificadas por intervalo usado, area de impressao quando existir, formulas e celulas mescladas. Nenhuma area foi definida como oficial.

Principais candidatas:

- `Planilha Plantio cana.xlsm` / `COLHEITA E TRANSPORTE DE MUDA` / A1:AJ25
- `Planilha Plantio cana.xlsm` / `PREPARO DE SOLO` / A1:AL37
- `Planilha Plantio cana.xlsm` / `PLANTIO` / A1:AI26
- `Planilha Plantio cana.xlsm` / `PRODUCÃO DAS OPERAÇÕES` / A1:X28
- `Acompanhamento Tratos Culturais.xlsm` / `CPD` / A1:AH51
- `Acompanhamento Tratos Culturais.xlsm` / `COMPOSTAGEM` / A1:AH29
- `Acompanhamento Tratos Culturais.xlsm` / `CULTIVO` / A1:AH50
- `Acompanhamento Tratos Culturais.xlsm` / `CORREÇÃO DE SOLO` / A1:AH36
- `Acompanhamento Tratos Culturais.xlsm` / `QUEBRA LOMBO` / A1:AD31
- `Acompanhamento Tratos Culturais.xlsm` / `NÚMERO DE VIAGENS` / B1:N22
- `Acompanhamento Tratos Culturais.xlsm` / `PAINEL (6)` / A1:AQ67

Todas as areas acima precisam de validacao humana antes de uso com `Range.CopyPicture`.

## Macros encontradas

- `Planilha Plantio cana.xlsm`: projeto VBA detectado no pacote do arquivo.
- `Acompanhamento Tratos Culturais.xlsm`: projeto VBA nao detectado pela analise XML.

O inventario textual de modulos e eventos VBA nao foi extraido porque o VBA fica em binario. A leitura textual segura exigira ferramenta especializada que nao execute macros.

## Riscos de automacao

- Arquivo de plantio contem VBA/macros.
- Arquivo de plantio contem links externos.
- Existem muitas celulas mescladas.
- Existem abas ocultas com possivel papel auxiliar.
- Existem cabecalhos repetidos e multiplos blocos na mesma aba.
- Algumas abas usam formulas e consolidacoes.
- A escrita futura pode quebrar formulas, visuais ou areas de relatorio se nao for mapeada com precisao.
- O arquivo informado no anexo para tratos culturais possui nome diferente do arquivo real encontrado.

## Dependencias externas

O arquivo `Planilha Plantio cana.xlsm` possui indicio de links externos. Detalhes completos estao em `analysis/workbook-plantio.json`.

## Arquivos estruturados gerados

- `analysis/workbook-plantio.json`
- `analysis/workbook-tratos.json`
- `analysis/sheet-mapping.json`
- `analysis/macro-inventory.json`
- `analysis/named-ranges.json`
- `analysis/integration-risks.json`

## Duvidas para resposta humana

- Confirmar se `PREPARO DE SOLO (2)` e aba auxiliar, historica, modelo ou deve ser ignorada.
- Confirmar quais abas sao fonte oficial para cada operacao.
- Confirmar quais linhas representam cabecalho oficial quando ha mais de um bloco.
- Confirmar chaves para localizar linha correta: frota, implemento, setor, turno ou combinacao.
- Confirmar se uma frota pode aparecer em mais de uma linha na mesma aba.
- Confirmar como conjuntos de maquinas devem ser representados.
- Confirmar quais celulas podem ser alteradas.
- Confirmar quais celulas nunca podem ser alteradas.
- Confirmar areas oficiais para envio como imagem.
- Confirmar se abas ocultas podem ser lidas pelo sistema.
- Confirmar como tratar links externos no arquivo de plantio.

## Recomendacao de estrategia para integracao

1. Manter as planilhas oficiais sempre em modo protegido ate concluir homologacao.
2. Criar copias de homologacao para testes de escrita.
3. Mapear manualmente cada operacao com aprovacao do COA.
4. Usar leitura por celula/intervalo antes de qualquer escrita.
5. Preservar macros e estrutura `.xlsm`.
6. Validar celulas apos escrita futura por releitura.
7. Executar `CopyPicture` somente por agente Windows e apenas em areas confirmadas.
8. Registrar toda divergencia entre WhatsApp, banco e Excel.
9. Nunca usar aba oculta ou bloco ambiguo sem confirmacao.
