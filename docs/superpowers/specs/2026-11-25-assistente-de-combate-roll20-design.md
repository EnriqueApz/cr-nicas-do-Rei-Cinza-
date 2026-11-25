# Assistente de Combate para Roll20 — design

Data: 25/11/2026 · Prazo: pronto para instalar até sexta (28/11), para a sessão de sábado (29/11).

## Por que existe

O mestre esquece as habilidades especiais e as ações de covil no meio do combate, e tem dificuldade de decidir a melhor jogada com a ficha do monstro. A campanha tem dificuldade alta e chefes cheios de detalhes. A extensão resolve isso dizendo, na vez de cada monstro, **o que fazer**, e avisando o que costuma ser esquecido.

O primeiro uso real é a luta contra **Tobias Greim** (Missão 1, Cena 6) no sábado. No futuro, a ideia pode crescer até virar um VTT próprio. Por isso os dados dos monstros ficam separados da interface, num formato que dá para reaproveitar.

## Objetivos

- Na vez de cada monstro, mostrar **a melhor jogada em ordem de prioridade**, com o motivo em uma linha.
- **Avisar automaticamente** sobre:
  - a ação de covil na iniciativa 20 de cada rodada (duas na Fase 2);
  - a Fé Fraturada quando Tobias cair abaixo da metade dos PV (53, ou 63 com 5 jogadores);
  - a concentração (só uma magia por vez) e os espaços de magia gastos;
  - os usos de 1 vez por dia;
  - o limite de Raízes em campo (máximo de 4).
- Botões que **rolam direto no chat do Roll20**: ataques, dano, salvaguardas e magias.
- Mostrar a **fala** do monstro no momento certo ("Ela pode trazer tudo de volta...").
- Controlar PV, PV temporários e magias de cada monstro dentro do painel.
- Não perder o combate se a página do Roll20 recarregar.

## Fora do escopo (agora)

- Ler a página do Roll20: ordem de iniciativa, PV dos tokens, posição no mapa. Isso fica para depois de sábado, testado com o mestre.
- Fichas dos jogadores.
- Outras missões além do encontro de Tobias. Se sobrar tempo, entra o primeiro combate da Missão 2 (Rãs Gigantes Corrompidas e Lodo Negro), sem prometer.
- Celular ou tablet. Extensão de Chrome só roda no computador.
- Uma IA analisando a situação ao vivo.

## O que não pode acontecer (anti-objetivos)

- **Atrasar o mestre no combate.** Cada turno precisa caber em poucos cliques.
- **Falhar sem avisar no sábado.** Se o envio para o chat não funcionar, o mestre precisa ver isso e ter um plano B na hora.
- **Mostrar rolagem secreta para os jogadores sem querer.**
- **Os jogadores perceberem que existe uma extensão.** Eles usam o Beyond20 para rolar e não devem saber do assistente. As mensagens no chat não levam nome, marca nem assinatura da extensão: parecem uma rolagem comum do mestre. Nada é instalado nem mostrado do lado dos jogadores.

## Restrições

- Chrome no computador, Manifest V3, instalada como extensão pessoal ("Carregar sem compactação", no modo do desenvolvedor). Não vai para a Chrome Web Store.
- Não consigo testar no Roll20 de verdade, porque precisaria do login do mestre. Testo numa página que imita o chat do Roll20, e **o mestre testa no Roll20 real na quinta ou na sexta**.
- Regras de D&D 2024. Todos os números vêm das Fichas de Combate da Missão 1 e da bíblia, que já foram conferidas entre si.

## Abordagens consideradas

| | Abordagem | Troca | Decisão |
|---|---|---|---|
| A | Extensão com painel próprio e rolagens no chat; o mestre avança o turno no painel | Simples e confiável, pronta a tempo; um clique a mais por turno | **Escolhida** |
| B | A + leitura automática da iniciativa e dos PV do Roll20 | Menos cliques, mas depende de como a página do Roll20 é montada por dentro e não dá para testar antes de sábado | Depois de sábado |
| C | Página separada, sem extensão | Funciona em qualquer aparelho, mas não rola no chat do Roll20 | Descartada |

O mestre escolheu a A seguindo a recomendação.

## Como funciona

### O painel

Um painel flutuante dentro do editor do Roll20 (`app.roll20.net/editor`), do lado direito. Dá para arrastar, minimizar e reabrir com um botão pequeno.

```
┌─ Missão 1 · Cena 6 — Tobias ──── [_] ─┐
│ Rodada 2   [◀] [Próximo ▶]  4|5 jog.  │
│ Variação: (•) normal ( ) surpresa     │
│           ( ) preparado ( ) ritual    │
├───────────────────────────────────────┤
│ ▶ INICIATIVA 20 — AÇÃO DE COVIL       │
│   Tobias  61/105  CA 16  [conc: —]    │
│   Cultista 1  22/22                   │
│   Cultista 2  ✖ caído                 │
│   Raiz 1  13/13 · Raiz 2  5/13        │
├───────────────────────────────────────┤
│ (cartão do turno atual, abaixo)       │
└───────────────────────────────────────┘
```

**Ordem do turno:** o mestre monta a ordem dos monstros uma vez no começo da luta, digitando a iniciativa de cada um. O painel insere sozinho o passo **"Iniciativa 20 — ação de covil"** em cada rodada. O botão "Próximo" avança. Monstros a 0 PV são pulados.

### O cartão do turno

Para o monstro da vez, o cartão mostra, de cima para baixo:

1. **Avisos** em destaque, se houver. Exemplos: "Abaixo de 53 PV: use a Fé Fraturada (reação)", "Concentração ativa: Espíritos Guardiões".
2. **Melhor jogada agora:** de 2 a 3 opções em ordem, cada uma com o motivo e os botões de rolar.
3. **A ficha resumida** (dá para expandir): ataques, magias com espaços restantes e as habilidades.
4. **Fala sugerida**, quando houver.
5. **PV:** um campo para digitar dano ou cura, com os botões −/+.

### Como a "melhor jogada" é escolhida

São regras escritas à mão para cada monstro, a partir das linhas "Na mesa" das fichas e das dicas da bíblia. Cada regra tem uma condição e uma prioridade. Exemplos para Tobias:

- **Rodada 1:** deixe ele falar, depois Escudo da Fé (ação bônus) + Chama Sagrada.
- **Grupo ferido e fora da Fase 2:** Arma Espiritual, e guarde os Espíritos Guardiões.
- **Fase 2, espaço de 3º círculo livre e sem concentração ativa:** Espíritos Guardiões.
- **Sem magia boa disponível:** dois ataques de Maça Sacrílega.
- **Um aliado caído perto:** Curar Ferimentos num cultista, se compensar.

As condições usam só o que o painel sabe: rodada, PV, fase, espaços e usos gastos, concentração e quantos monstros estão de pé. Quando a condição depende de algo que o painel não vê (por exemplo, "o grupo está ferido?"), o cartão mostra uma pergunta de um clique ("O grupo está ferido? [sim] [não]"), que vale até o mestre mudar.

Ações de covil seguem a mesma lógica. Exemplos: Broto quando há poucas Raízes, Pulso quando há um alvo isolado, Raízes que Prendem quando alguém corre até Tobias. Na Fase 2, o painel pede duas ações de covil diferentes.

**Reações fora do turno:** a Fé Fraturada é uma reação. Por isso o aviso aparece **na hora em que o mestre digita o dano** que faz Tobias passar do limite, e não só na vez dele. O painel pergunta "Usar a Fé Fraturada agora? [sim]", rola 3d8+4 e muda para a Fase 2.

**Abalar Tobias:** um botão "Tobias foi abalado", para quando um jogador passar no teste de CD 16. Tobias perde a reação até o próximo turno dele, e o próximo ataque dele sai com desvantagem. O painel lembra os dois efeitos e registra quem já tentou (uma vez por personagem).

**Quando Tobias cai:** o cartão mostra o texto da luz cinzenta sendo sugada pelo amuleto, para o mestre ler.

**Variações da cena (da bíblia):**
- **Pego de surpresa:** Tobias perde a primeira rodada.
- **Preparado:** Escudo da Fé e Auxílio já ativos (CA 18, +5 PV) e mais 2 cultistas.
- **Ritual completo:** +15 PV temporários.
- **5 jogadores:** Tobias com 125 PV e Fase 2 abaixo de 63, +1 Lobo Corrompido e +2 Raízes.

### Rolagens no chat

- **Ataque e dano são cliques separados.** O mestre rola o ataque, pergunta ao jogador ("23 te acerta?") e só então rola o dano: botão **"Dano"** ou **"Dano crítico"** (o dobro de dados, porque o Roll20 não dobra sozinho). O mestre prefere assim, mesmo sendo um pouco mais lento.
- Magias com salvaguarda mostram a CD e têm botão de dano. As salvaguardas são dos jogadores, que rolam pelo Beyond20.
- Quem rola os dados é o próprio Roll20: a extensão só escreve o comando no chat e envia.
- Cada botão monta uma mensagem com o modelo padrão do Roll20 (`&{template:default}`) e rolagens embutidas (`[[1d20+4]]`), escreve no campo do chat do Roll20 e clica em enviar. Funciona com qualquer ficha de personagem.
- **Interruptor no topo: "só para mim (/w gm)" ou "para todos".** O padrão é **só para mim**, para não mostrar rolagem secreta sem querer.
- **Plano B:** se o painel não achar o campo do chat, mostra um aviso vermelho e passa a **copiar o comando para a área de transferência**. O mestre só cola no chat.

### Dados

- Monstros e encontros ficam num arquivo de dados separado da interface: ficha, regras de tática, falas e variações. O formato pensa em reaproveitar depois (mais missões, e talvez um VTT próprio).
- O estado do combate (PV, rodada, espaços gastos) é salvo no armazenamento da extensão a cada mudança. Recarregar o Roll20 não perde nada. Há um botão "Recomeçar luta".

### Instalação

- O mestre baixa a pasta da extensão (um .zip no repositório), abre `chrome://extensions`, liga o "Modo do desenvolvedor" e clica em "Carregar sem compactação".
- Um guia de instalação em português, com passos curtos, fica junto da extensão.

## Testes

- As regras de tática são testadas automaticamente. Exemplos: "abaixo de 53 PV sugere a Fé Fraturada", "com concentração ativa não sugere outra magia de concentração", "na Fase 2 pede duas ações de covil".
- O painel é testado num navegador automático, numa página que imita o chat do Roll20: as rolagens precisam chegar ao chat no formato certo, e o plano B precisa funcionar quando o chat não existe.
- **Teste real:** o mestre instala na quinta ou na sexta, abre o jogo no Roll20 e clica num botão de rolagem. Se não chegar ao chat, ajusto antes de sábado.

## Decisões que tomei (o mestre pode mudar)

- O painel fica do lado direito, flutuante, e pode ser minimizado.
- As rolagens saem **só para o mestre** por padrão.
- A ordem de iniciativa é digitada uma vez no painel, sem ler o Roll20.
- As regras de tática são escritas por mim a partir das fichas e da bíblia, e não geradas por IA.
- O primeiro combate da Missão 2 entra só se sobrar tempo.

## O que fica para quem for construir

- A organização interna dos arquivos e a aparência exata do painel, seguindo o esboço acima.
- Os textos de cada regra de tática, desde que batam com as fichas.
