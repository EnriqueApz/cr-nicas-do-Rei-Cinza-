# Assistente de Combate para Roll20 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extensão pessoal de Chrome que, dentro do editor do Roll20, guia o mestre na luta contra Tobias Greim (Missão 1, Cena 6): melhor jogada por turno, avisos de covil/fase/concentração e botões que rolam no chat do Roll20.

**Architecture:** Manifest V3 com um único content script em `https://app.roll20.net/editor*`. Arquivos JS simples (sem bundler) que se registram em `globalThis.AssistenteRC` e também exportam via `module.exports` para os testes em Node. Separação: dados do encontro → motor de estado puro → motor de táticas puro → envio ao chat → painel (DOM).

**Tech Stack:** JavaScript puro (ES2020), Chrome MV3, `node:test` para testes de lógica, Playwright (já instalado no ambiente) para o teste do painel numa página falsa do Roll20. Nenhuma dependência npm.

**Spec:** `docs/superpowers/specs/2026-11-25-assistente-de-combate-roll20-design.md`

## Global Constraints

- Chrome no computador, Manifest V3, instalada por "Carregar sem compactação". Não vai para a Web Store.
- Todo texto visível ao mestre em português do Brasil.
- Mensagens no chat **sem nome, marca ou assinatura da extensão**: só `&{template:default}` com o nome do monstro e da ação.
- Rolagens saem **só para o mestre (`/w gm`) por padrão**; interruptor "para todos".
- **Ataque e dano em cliques separados**; botão "Dano crítico" com o dobro de dados.
- Os dados rolados são do Roll20: a extensão só escreve no chat (`[[...]]`) e envia.
- Números exatamente como nas Fichas de Combate da Missão 1 (copiados nas tarefas abaixo).
- Estado salvo a cada mudança; recarregar o Roll20 não perde o combate.

## Review Focus

1. **Dano grande que pula o limite de uma vez** (Tobias de 105 a 20, ou direto a 0): a Fé Fraturada ainda é oferecida. Se chegar a 0, ela é oferecida antes de marcá-lo como caído. → teste na Tarefa 2.
2. **Tobias abalado no momento do limite:** sem reação, ele não recupera os 18 PV, mas entra na Fase 2 mesmo assim, e o painel diz isso. → teste na Tarefa 2.
3. **PV temporários:** absorvem o dano primeiro. O limite da Fase 2 olha só os PV normais. → teste na Tarefa 1.
4. **Chat do Roll20 diferente do esperado:** se achar o campo de texto mas não o botão, envia com Enter. Se não achar nada, copia o comando para a área de transferência e mostra o aviso vermelho. → teste na Tarefa 4.
5. **Recarregar a página no meio da luta** restaura rodada, PV, espaços e concentração. E entrada de dano não numérica (vazia, "abc", negativa) é ignorada sem quebrar. → testes nas Tarefas 1 e 4.

---

### Task 1: Dados do encontro e motor de estado

**Files:**
- Create: `extensao/src/dados/m01c06-tobias.js`
- Create: `extensao/src/motor/estado.js`
- Create: `extensao/package.json` (só `{"private":true,"scripts":{"test":"node --test testes/"}}`)
- Test: `extensao/testes/estado.test.js`

**Interfaces:**
- Produces (`AssistenteRC.dados.m01c06`): `{ id, titulo, fichas: {tobias, cultista, raiz, lobo}, montar(jogadores, chegada) -> [{fichaId, nome}] , falas, textoQueda }`. Cada ficha: `{ id, nome, ca, pv, acoes: {[id]: Acao}, magias?: {[id]: Magia}, espacos?: {1,2,3}, covil?: {[id]: AcaoCovil} }`. `Acao = {nome, tipo:'ataque', bonus, dano:[{dados, tipo}], alcance, extra?}`; `Magia = {nome, circulo, tempo:'acao'|'bonus', concentracao:bool, cd?, ataque?, dano?:[{dados,tipo}], metadeSePassar?, efeito}`.
- Produces (`AssistenteRC.estado`):
  - `criarCombate(encontro, {jogadores:4|5, chegada:'normal'|'surpresa'|'preparado', ritualCompleto:bool}) -> Estado`
  - `definirIniciativa(estado, id, valor) -> Estado` e `iniciar(estado) -> Estado` (ordena; insere `'covil'` com iniciativa 20; trava jogadores/variação)
  - `proximoTurno(estado) -> Estado` (pula caídos; covil no lugar dele; ao passar do fim, `rodada+1`)
  - `aplicarDano(estado, id, valor) -> {estado, eventos:[...]}`, `curar(estado, id, valor) -> Estado`
  - `gastarEspaco(estado, id, circulo)`, `definirConcentracao(estado, id, magiaId|null)`, `marcarAbalado(estado, id, personagem)`
  - `Estado = {rodada, indice, ordem:[id], jogadores, chegada, ritualCompleto, iniciado, sussurro:true, perguntas:{grupoFerido:null}, abaladoPor:[], combatentes:{[id]:{fichaId,nome,pv,pvMax,pvTemp,ca,iniciativa,espacos,concentracao,usos:{feFraturada:1},fase:1,reacao:true,desvantagemProximoAtaque:false,caido:false}}}`
  - Eventos de `aplicarDano`: `{tipo:'limiarFeFraturada', id}` quando o PV de Tobias passa a ficar **abaixo de 53** (125 PV: **abaixo de 63**) e `usos.feFraturada === 1`; `{tipo:'caiu', id}` quando chega a 0 (para Tobias, só se não houver Fé Fraturada pendente).

Valores fixos (das fichas):
- Tobias: CA 16, PV 105 (5 jog.: 125). Espaços 1º×4, 2º×3, 3º×2. Maça Sacrílega +4, `1d6+1` concussão + `2d6` necrótico, 1,5 m. Chama Sagrada CD 13 Des, `2d8` radiante, 18 m. Magias: Comando (1º, CD 13 Sab), Curar Ferimentos (1º, `2d8+3`), Escudo da Fé (1º, bônus, conc., CA 18), Imobilizar Pessoa (2º, conc., CD 13 Sab), Arma Espiritual (2º, bônus, conc., ataque +5, `1d8+3` força), Auxílio (2º, +5 PV em até 3), Espíritos Guardiões (3º, conc., CD 13 Sab, `3d8` necrótico, metade se passar, 4,5 m), Dissipar Magia (3º). Fé Fraturada `3d8+4`. Covil: Raízes que Prendem (For CD 13, Impedido, quadrado de 3 m), Pulso da Raiz-Mãe (Con CD 13, `2d6` necrótico, 9 m; Fase 2 `3d6`), Broto (1 Raiz, máximo 4).
- Cultista das Raízes: CA 13, PV 22. Adaga Ritual +4, `1d4+2` perfurante + `1d6` necrótico. Grito de Alarme.
- Raiz Sanguinolenta: CA 12, PV 13, vulnerável a fogo. Chicote de Espinhos +3, 3 m, `1d6+1` perfurante, For CD 11 ou Agarrado (escapar CD 11).
- Lobo Corrompido: CA 13, PV 30. Mordida +4, `2d4+2` perfurante + `1d6` necrótico, For CD 12 ou Derrubado. Tática de Matilha.
- Composição: 4 jog. = Tobias + 2 Raízes + 2 Cultistas. 5 jog. = Tobias 125 + 4 Raízes + 2 Cultistas + 1 Lobo. Preparado: +2 Cultistas; Tobias com CA 18, Escudo da Fé em concentração, +5 PV (máx. e atual), um espaço de 1º e um de 2º já gastos. Ritual completo: Tobias com `pvTemp` 15.
- Nomes numerados: "Cultista 1", "Raiz 2"...

- [ ] **Step 1: Write the failing tests** em `testes/estado.test.js`:
  - `criarCombate 4 jogadores` → combatentes: 1 Tobias (pv 105, pvMax 105, ca 16), 2 cultistas, 2 raízes.
  - `criarCombate 5 jogadores` → Tobias pv 125; 4 raízes; 1 lobo.
  - `preparado` → Tobias ca 18, pv 110/110, concentracao `'escudoDaFe'`, espacos `{1:3,2:2,3:2}`, 4 cultistas.
  - `ritual completo` → Tobias pvTemp 15.
  - `iniciar ordena por iniciativa e põe covil em 20` → iniciativas Tobias 12, Cultista 1 22, Raiz 1 5 → ordem `['cultista-1','covil','tobias','raiz-1']`.
  - `proximoTurno pula caídos e vira a rodada`.
  - `pvTemp absorve primeiro` → Tobias pv 105, pvTemp 15, dano 20 → pvTemp 0, pv 100, sem evento.
  - `limiar 4 jogadores` → dano que leva de 60 a 52 gera `limiarFeFraturada`; de 60 a 53, não.
  - `limiar 5 jogadores` → de 70 a 62 gera o evento.
  - `dano que pula o limiar até 0` → de 105, dano 110: evento `limiarFeFraturada` e **nenhum** `caiu`; pv 0.
  - `dano inválido` → `aplicarDano(e,'tobias', NaN)`, `-5` e `'abc'` retornam o estado igual e `eventos: []`.
  - `iniciar trava jogadores e variação` → `criarCombate` de novo é a única forma de mudar.
- [ ] **Step 2: Run** `cd extensao && npm test` → FAIL (módulos não existem).
- [ ] **Step 3: Implement** `m01c06-tobias.js` e `estado.js` com as interfaces acima. Funções puras: copiar o estado (`structuredClone`) e devolver o novo. Cada arquivo termina com o registro duplo: `globalThis.AssistenteRC = globalThis.AssistenteRC || {}; AssistenteRC.estado = {...}; if (typeof module !== 'undefined') module.exports = AssistenteRC.estado;`. O `estado.js` faz `require` dos dados só quando estiver em Node.
- [ ] **Step 4: Run** `npm test` → PASS.
- [ ] **Step 5: Commit** `git add extensao && git commit -m "Assistente: dados da Cena 6 e motor de estado"`.

### Task 2: Motor de táticas

**Files:**
- Create: `extensao/src/motor/taticas.js`
- Test: `extensao/testes/taticas.test.js`

**Interfaces:**
- Consumes: `Estado`, fichas da Tarefa 1.
- Produces (`AssistenteRC.taticas`):
  - `sugerir(estado, id) -> {avisos:[string], jogadas:[{titulo, motivo, botoes:[{rotulo, acaoId|magiaId, kind:'ataque'|'dano'|'danoCritico'|'magia'|'danoMagia'}]}], pergunta?: {chave:'grupoFerido', texto}, fala?: string}` — no máximo 3 jogadas, em ordem.
  - `sugerirCovil(estado) -> {quantidade:1|2, sugestoes:[{covilId, motivo}], todas:[covilId]}`
  - `resolverFeFraturada(estado, usar:boolean) -> {estado, mensagem}` — se `reacao` for `false` (abalado): não cura, entra na Fase 2, mensagem `"Sem reação (abalado): não recupera os 18 PV, mas entra na Fase 2."`; se tiver reação: `fase=2`, `usos.feFraturada=0`, `reacao=false`; quem rola a cura é a Tarefa 3, que recebe `{precisaRolarCura:true}`.

Regras de Tobias (ordem de prioridade; a primeira que vale vira a jogada 1, e assim por diante):
1. **Chegada "surpresa" e rodada 1:** aviso `"Pego de surpresa: Tobias perde esta rodada, hesitando."`, sem jogadas.
2. **Rodada 1:** fala `"Vocês não deviam ter vindo. Ela pode trazer de volta tudo o que a peste levou."`; jogada `Escudo da Fé (ação bônus) + Chama Sagrada` (pular o Escudo se já tiver concentração).
3. **Fase 2, espaço de 3º livre, sem concentração em Espíritos Guardiões:** `Espíritos Guardiões` — motivo `"A magia mais perigosa dele; guardada para a Fase 2."`
4. **Fase 1 e `perguntas.grupoFerido === true`:** `Arma Espiritual (ação bônus) + 2× Maça`, motivo `"Grupo ferido: segure Espíritos Guardiões para a Fase 2."`
5. **Fase 1, `grupoFerido === false`, espaço de 3º livre, sem concentração:** `Espíritos Guardiões`.
6. **Algum cultista caído ou abaixo da metade e espaço de 1º livre:** `Curar Ferimentos no cultista` (como jogada 2 ou 3, nunca a 1).
7. **Sempre por último:** `2× Maça Sacrílega no mais ferido`.
- Se `grupoFerido === null` e a regra 4 ou 5 dependeria dela, devolver `pergunta: {chave:'grupoFerido', texto:'O grupo está ferido?'}`.
- Não sugerir magia de concentração se já houver outra ativa, a não ser com o aviso `"Trocar a concentração: encerra <atual>."`
- Avisos sempre presentes quando valem: `"Concentração ativa: <magia>"`, `"Abalado: sem reação e desvantagem no próximo ataque"`, `"Fase 2: a entidade fala com as vozes dos filhos."`
- Cultista: jogada `Adaga Ritual`; quando 2 cultistas já caíram, aviso `"O último cultista tenta fugir para avisar o Padre."` Lobo: `Mordida` + aviso `"Derrube a linha de frente para os cultistas atacarem com vantagem."` Raiz: `Chicote de Espinhos` + aviso `"Agarre quem corre até Tobias ou até a raiz-mãe."`
- Covil: Fase 1 → 1 ação; Fase 2 → 2 **diferentes**. Sugestão: `broto` se houver menos de 2 Raízes de pé e menos de 4 no total; senão `pulso`; `raizesQuePrendem` sempre listada em `todas` com o motivo `"Se alguém estiver correndo até Tobias."` Broto não aparece com 4 Raízes de pé.

- [ ] **Step 1: Write the failing tests:** `surpresa rodada 1 sem jogadas`; `rodada 1 sugere Escudo + Chama e a fala`; `fase 2 sugere Espíritos Guardiões primeiro`; `grupo ferido na fase 1 sugere Arma Espiritual`; `sem resposta sobre o grupo devolve pergunta`; `com concentração ativa não sugere outra sem aviso de troca`; `maça sempre presente como última opção`; `covil fase 1 = 1, fase 2 = 2 diferentes`; `broto some com 4 raízes de pé`; `fé fraturada com reação: fase 2, uso 0, precisaRolarCura`; `fé fraturada abalado: fase 2, sem cura, mensagem exata`; `último cultista avisa fuga`.
- [ ] **Step 2: Run** `npm test` → FAIL.
- [ ] **Step 3: Implement** `taticas.js` (regras como uma lista de `{quando(ctx), jogada(ctx)}` por ficha).
- [ ] **Step 4: Run** `npm test` → PASS.
- [ ] **Step 5: Commit** `git commit -m "Assistente: motor de táticas"`.

### Task 3: Mensagens e envio ao chat do Roll20

**Files:**
- Create: `extensao/src/roll20/chat.js`
- Test: `extensao/testes/chat.test.js`

**Interfaces:**
- Produces (`AssistenteRC.chat`):
  - `montarAtaque(nomeMonstro, acao, {sussurro, desvantagem}) -> string` → `"/w gm &{template:default} {{name=Tobias — Maça Sacrílega}} {{Ataque=[[1d20+4]]}}"`; com desvantagem: `[[2d20kl1+4]]`; sem `/w gm ` quando `sussurro=false`.
  - `montarDano(nomeMonstro, acao, {sussurro, critico}) -> string` → `{{Dano=[[1d6+1]] concussão + [[2d6]] necrótico}}`; crítico dobra só os dados: `[[2d6+1]]` e `[[4d6]]`.
  - `montarMagia(nomeMonstro, magia, {sussurro}) -> string` → linha `{{CD=13 Sabedoria}}`, `{{Efeito=...}}` e, se houver, `{{Dano=[[3d8]] necrótico (metade se passar)}}`.
  - `montarCovil(covil, fase, {sussurro})`, `montarCura(nome, dados, {sussurro})` (Fé Fraturada `3d8+4`, Curar Ferimentos `2d8+3`).
  - `enviar(texto, doc=document) -> {ok:true, via:'botao'|'enter'} | {ok:false, via:'copiado'|'falhou'}` — procura o campo nos seletores `#textchat-input textarea`, `textarea[name="chatInput"]`, `#textchat-input [contenteditable]`; escreve, dispara `input`, clica `#textchat-input button[type=submit], #textchat-input .btn`; sem botão, dispara `keydown` Enter. Sem campo: `navigator.clipboard.writeText(texto)` → `'copiado'`.
- Nenhuma string montada pode conter "Assistente", "extensão" ou "RC".

- [ ] **Step 1: Write the failing tests** dos montadores com as strings exatas acima, mais `nenhuma mensagem contém marca da extensão` (todas as ações das 4 fichas).
- [ ] **Step 2: Run** `npm test` → FAIL.
- [ ] **Step 3: Implement** `chat.js`. `enviar` é testado na Tarefa 4 (precisa de DOM).
- [ ] **Step 4: Run** `npm test` → PASS.
- [ ] **Step 5: Commit** `git commit -m "Assistente: mensagens e envio ao chat"`.

### Task 4: Painel, armazenamento e manifest

**Files:**
- Create: `extensao/manifest.json` (MV3; `content_scripts` em `https://app.roll20.net/editor*`, na ordem: dados, estado, taticas, chat, armazenamento, painel, conteudo; `css: [src/ui/painel.css]`; `permissions: ["storage","clipboardWrite"]`; nome "Assistente de Combate (pessoal)")
- Create: `extensao/src/ui/armazenamento.js` — `salvar(estado)`, `carregar() -> Promise<Estado|null>`, `limpar()`; usa `chrome.storage.local` e, sem `chrome`, `localStorage` (página de teste). Chave `assistente-m01c06`.
- Create: `extensao/src/ui/painel.js`, `extensao/src/ui/painel.css`, `extensao/src/conteudo.js`
- Create: `extensao/testes/pagina-falsa-roll20.html` (um `#textchat-input` com `<textarea>` e `<button type=submit class="btn">`, que acrescenta o texto enviado numa `<ul id="mensagens">`) e `extensao/testes/pagina-sem-chat.html`
- Test: `extensao/testes/painel.e2e.js` (Playwright, rodado com `node testes/painel.e2e.js`)

**Interfaces:**
- Consumes: tudo das Tarefas 1 a 3.
- Produces: `AssistenteRC.painel.montar(raiz=document.body)`. `conteudo.js` chama `montar()` quando a página carrega.

Comportamento do painel (segue o esboço da spec):
- Topo: título do encontro, botão minimizar (vira uma bolinha no canto que reabre), arrastável pelo título, interruptor "Só para mim / Para todos", seletor 4|5 jogadores, chegada (normal/surpresa/preparado), caixa "ritual completo". Bloqueados depois de "Começar luta". Botão "Recomeçar luta" pede confirmação.
- Antes de começar: lista de combatentes com campo de iniciativa e o botão "Começar luta".
- Durante: "Rodada N", `[◀] [Próximo ▶]`, lista de combatentes com PV/CA/concentração (caídos riscados), e o cartão do turno com avisos, a pergunta (botões Sim/Não), as jogadas e os botões (Ataque → depois Dano / Dano crítico), a fala, a ficha resumida expansível e o campo de dano/cura de cada combatente.
- Ao digitar dano que gera `limiarFeFraturada`: caixa em destaque "Usar a Fé Fraturada agora?" com [Sim] (rola a cura no chat e aplica o resultado digitado pelo mestre num campo "PV recuperados") e [Não].
- Botão "Tobias foi abalado" com um campo para o nome do personagem; recusa repetido (uma vez por personagem).
- Quando Tobias cai: mostra `textoQueda` (a luz cinzenta sugada pelo amuleto).
- Passo de covil: cartão próprio com as sugestões e um botão por ação de covil.
- Se `enviar` devolver `copiado` ou `falhou`: faixa vermelha fixa "Não achei o chat do Roll20. O comando foi copiado: cole no chat (Ctrl+V)."
- Salva o estado após cada mudança e restaura ao montar.

- [ ] **Step 1: Write the failing e2e** (`painel.e2e.js`, Chromium do Playwright, abre a página falsa via `file://` e injeta os scripts na mesma ordem do manifest):
  - o painel aparece;
  - preencher as iniciativas, clicar em "Começar luta" e ver "Rodada 1";
  - no turno de Tobias, clicar "Ataque" da Maça → `#mensagens` recebe um item começando por `/w gm &{template:default} {{name=Tobias — Maça Sacrílega}}`;
  - alternar para "Para todos" → o próximo envio não tem `/w gm`;
  - digitar `abc` no dano → nada muda; digitar `60` → PV 45 e aparece "Usar a Fé Fraturada agora?";
  - recarregar a página e reinjetar → continua na mesma rodada, com PV 45;
  - na `pagina-sem-chat.html`, clicar num botão → aparece a faixa vermelha;
  - página com textarea e sem botão → a mensagem chega via Enter (a página falsa escuta `keydown` Enter).
- [ ] **Step 2: Run** `cd extensao && node testes/painel.e2e.js` → FAIL.
- [ ] **Step 3: Implement** manifest, armazenamento, painel, CSS e conteudo. O CSS fica todo debaixo de `#assistente-rc` para não mexer no visual do Roll20. Tema escuro, fonte do sistema, largura de 360 px.
- [ ] **Step 4: Run** `node testes/painel.e2e.js` e `npm test` → tudo PASS. Tirar uma captura de tela do painel na página falsa para conferência.
- [ ] **Step 5: Commit** `git commit -m "Assistente: painel, armazenamento e manifest"`.

### Task 5: Pacote e guia de instalação

**Files:**
- Create: `extensao/LEIA-ME.md` — guia em português, em passos curtos: baixar o .zip, extrair, `chrome://extensions`, ligar o "Modo do desenvolvedor", "Carregar sem compactação", escolher a pasta `extensao`, abrir o jogo no Roll20, onde aparece o painel, como testar uma rolagem, o que fazer se aparecer a faixa vermelha, e lembrar de minimizar o painel ao compartilhar a tela.
- Create: `extensao/empacotar.sh` → gera `assistente-de-combate.zip` na raiz do repositório só com `manifest.json` e `src/`.
- Create: `assistente-de-combate.zip` (gerado e versionado, para baixar pelo GitHub).

- [ ] **Step 1:** Rodar `bash extensao/empacotar.sh` e conferir com `unzip -l assistente-de-combate.zip` que o zip tem `manifest.json` e `src/` (e nada de `testes/`).
- [ ] **Step 2:** Carregar a extensão desempacotada no Chromium do Playwright (`launchPersistentContext` com `--load-extension`) numa página local servida como `app.roll20.net`, se der. Se o ambiente não permitir, registrar isso no relatório final; não fingir o teste.
- [ ] **Step 3: Commit e push** `git add extensao assistente-de-combate.zip && git commit -m "Assistente: pacote e guia de instalação" && git push`.
