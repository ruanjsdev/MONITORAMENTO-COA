# Excel em Homologação no Windows

O agente usa `Excel.Application` por uma ponte PowerShell COM. A ponte tenta conectar à instância aberta e cria uma instância invisível apenas quando necessário. Somente a instância e os workbooks abertos pelo agente são fechados.

## Segurança

- Escrita aceita exclusivamente arquivos `.dev.xlsm` em `planilhas-homologacao/`.
- `planilhas/` e caminhos externos são bloqueados antes da chamada COM.
- Macros são desabilitadas por `AutomationSecurity = 3`; eventos, alertas e atualização de links são desligados.
- Fórmulas não podem ser sobrescritas.
- A escrita exige mapeamento confirmado, campo editável e igualdade com o valor usado na aprovação.
- O mapeamento atual é candidato e permanece `confirmed: false`; portanto nenhuma escrita foi executada.

## Cópias

`npm run excel:prepare-dev` cria duas cópias e um manifesto SHA-256. Cópias existentes não são sobrescritas sem `--force`.

## Testes

`npm test` executa testes seguros sem exigir Excel. `npm run test:excel` executa integração Windows separada. A suíte atual de integração somente detecta Excel, lê uma célula e procura uma frota na cópia de homologação.

## CopyPicture

O comando usa `Range.CopyPicture`, cola em um `ChartObject`, exporta PNG e remove o objeto temporário. O caminho PNG é restrito a `planilhas-homologacao/temp/`. O teste real desse fluxo permanece bloqueado até confirmação do intervalo oficial.
