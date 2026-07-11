# 21 - Indicadores e Tempo Parado

## Objetivo

Documentar os indicadores operacionais do COA-BOT e as regras para calculo de tempo parado por frota, equipamento e operacao.

## Descricao completa

Indicadores e estatisticas servirao como apoio operacional para o COA. Eles devem ajudar a identificar gargalos, pendencias, falhas de comunicacao, operacoes sem atualizacao e equipamentos com maior impacto no turno.

Esses indicadores nao devem ser usados para exposicao indevida de operadores. O objetivo e melhorar acompanhamento e tomada de decisao.

## Tempo parado

O sistema devera calcular tempo parado a partir de eventos confirmados.

Exemplo:

```text
Frota 625
Parou: 01:15
Retornou: 02:02
Tempo parado: 47 minutos
```

## Regras de calculo

- A parada inicia com status confirmado de parada.
- A parada termina quando houver retorno confirmado.
- Uma parada sem retorno permanece aberta.
- Alteracoes rejeitadas nao entram no calculo.
- Correcoes manuais devem recalcular o periodo.
- Mudanca de turno nao encerra automaticamente uma parada.
- Paradas abertas devem aparecer na troca de turno.
- Eventos duplicados nao devem somar tempo duas vezes.
- Eventos pendentes podem aparecer como alerta, mas nao como tempo confirmado.

## Indicadores documentados

Indicadores iniciais:

- Quantidade de alteracoes recebidas.
- Alteracoes aprovadas.
- Alteracoes rejeitadas.
- Alteracoes editadas.
- Alteracoes pendentes.
- Taxa de acerto da interpretacao.
- Quantidade de relatorios enviados.
- Quantidade de falhas.
- Equipamentos com mais paradas.
- Operacoes com mais ocorrencias.
- Tempo total parado por frota.
- Tempo total parado por operacao.
- Operacoes sem atualizacao.
- Tempo medio para aprovacao.
- Tempo medio para retorno de equipamento.

## Dashboard do turno

O dashboard devera exibir rapidamente:

- Operacoes em andamento.
- Operacoes paradas.
- Operacoes sem atualizacao recente.
- Quantidade de frotas rodando.
- Quantidade de frotas paradas.
- Quantidade de frotas disponiveis.
- Alteracoes pendentes.
- Conflitos encontrados.
- Relatorios enviados.
- Relatorios atrasados.
- Ultima atualizacao de cada operacao.
- Status do WhatsApp.
- Status do Excel.
- Status das planilhas.
- Status do agente instalado no computador.
- Proxima troca de turno.
- Proximo relatorio programado.

## Responsabilidades

O modulo de indicadores devera:

- Calcular metricas a partir de eventos confirmados.
- Separar metricas confirmadas de alertas pendentes.
- Mostrar periodo considerado.
- Permitir filtro por turno, operacao, frota e periodo.
- Apoiar dashboard, relatorios e Assistente COA.

Nao devera:

- Usar dados rejeitados em metricas confirmadas.
- Encerrar parada automaticamente por mudanca de turno.
- Expor operadores indevidamente.
- Ocultar fonte ou periodo do indicador.

## Futuras expansoes

- Comparativos entre turnos.
- Indicadores por unidade.
- Alertas de tendencia.
- Graficos historicos.
- Exportacao para BI.
- Metas operacionais configuraveis.

## Dependencias

- Central de ocorrencias.
- Historico.
- Cadastro de frotas.
- Cadastro de operacoes.
- Eventos confirmados.
- Regras de status.

## Observacoes

Indicadores so serao confiaveis se eventos e estados forem bem modelados. Toda metrica deve informar periodo, fonte e criterio de calculo.
