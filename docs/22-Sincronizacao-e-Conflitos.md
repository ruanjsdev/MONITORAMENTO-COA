# 22 - Sincronizacao e Conflitos

## Objetivo

Documentar a funcao Sincronizar e a comparacao entre WhatsApp, Excel e banco, definindo divergencias detectadas, acoes permitidas, limites de automacao e regras de aprovacao.

## Descricao completa

O COA-BOT devera comparar as principais fontes de informacao operacional para identificar divergencias. As fontes iniciais sao:

- WhatsApp: mensagens e relatorios recebidos.
- Banco: estado estruturado e historico futuro do sistema.
- Excel: planilhas oficiais da operacao.

A sincronizacao nao deve aplicar mudancas automaticamente. Ela devera diagnosticar diferencas, apresentar riscos e encaminhar resolucoes pelo fluxo de aprovacao.

## Comparacao WhatsApp x Excel x Banco

O sistema devera identificar:

- Status diferente.
- Descricao diferente.
- Frota inexistente.
- Frota em operacao incorreta.
- Informacao sem atualizacao.
- Linha duplicada.
- Planilha desatualizada.
- Banco desatualizado.
- Mensagem ainda nao aprovada.

Exemplo:

```text
Frota 625
WhatsApp: Parado
Excel: Rodando
Banco: Rodando
```

## Tela de comparacao

A tela devera permitir:

- Revisar diferenca.
- Aprovar alteracao.
- Manter Excel.
- Manter banco.
- Usar informacao do WhatsApp.
- Editar manualmente.
- Ignorar diferenca.
- Registrar justificativa.

Toda decisao deve gerar historico e, quando alterar dado oficial, seguir fluxo de aprovacao.

## Botao Sincronizar

A funcao Sincronizar devera verificar:

- WhatsApp.
- Banco.
- Excel.
- Planilhas abertas.
- Operacoes configuradas.
- Frotas cadastradas.
- Alteracoes pendentes.
- Relatorios atrasados.

Resultados esperados:

```text
Sistema sincronizado.
```

ou:

```text
5 diferencas encontradas.
```

A sincronizacao nunca devera aplicar mudancas automaticamente sem seguir as regras de aprovacao definidas.

## Estados de conflito

Estados recomendados:

- `SEM_CONFLITO`: fontes consistentes.
- `DIVERGENCIA_STATUS`: status diferente entre fontes.
- `DIVERGENCIA_DESCRICAO`: descricao diferente.
- `FROTA_INEXISTENTE`: frota citada nao cadastrada.
- `OPERACAO_INCORRETA`: frota associada a operacao divergente.
- `FONTE_DESATUALIZADA`: fonte nao recebeu atualizacao recente.
- `LINHA_DUPLICADA`: Excel ou banco possui duplicidade.
- `PENDENTE_APROVACAO`: WhatsApp trouxe dado ainda nao aprovado.
- `FALHA_CONSULTA`: fonte indisponivel.

## Pesquisa global

O painel devera oferecer pesquisa geral por:

- Frota.
- Operacao.
- Setor.
- Fazenda.
- Talhao.
- Pessoa.
- Status.
- Motivo de parada.
- Texto de mensagem.
- Data.
- Turno.

Ao pesquisar uma frota, exibir:

- Estado atual.
- Historico.
- Mensagens.
- Alteracoes.
- Tempo parado.
- Relatorios.
- Operacoes em que apareceu.

## Responsabilidades

A sincronizacao devera:

- Diagnosticar diferencas.
- Indicar fonte divergente.
- Abrir caminho para aprovacao.
- Registrar justificativas.
- Apoiar suporte e administradores.
- Evitar aplicacao automatica indevida.

Nao devera:

- Corrigir Excel automaticamente.
- Corrigir banco automaticamente.
- Tratar mensagem nao aprovada como verdade final.
- Ignorar diferencas sem registro.

## Futuras expansoes

- Sincronizacao programada.
- Alertas por conflito critico.
- Comparacao historica.
- Sugestao de resolucao baseada em regras.
- Exportacao de diagnostico.

## Dependencias

- Banco de dados futuro.
- Modulo WhatsApp.
- Modulo Excel.
- Historico.
- Regras de negocio.
- Central de ocorrencias.
- Controle de aprovacao.

## Observacoes

Sincronizar significa verificar consistencia, nao aplicar mudancas automaticamente. Essa distincao deve permanecer clara em toda a interface.
