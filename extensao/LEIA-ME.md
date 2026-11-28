# Assistente de Combate — como instalar e usar

Extensão pessoal do Chrome para a luta contra Tobias (Missão 1, Cena 6). Ela só existe no seu computador: os jogadores não veem o painel e não sabem que ela existe.

## Instalar (uma vez só, uns 3 minutos)

1. No GitHub, abra o repositório, entre no ramo `ccr-57029135-1flft8` e baixe o arquivo **`assistente-de-combate.zip`** (botão "Download raw file", o ícone de seta para baixo).
2. No computador, **extraia** o .zip numa pasta fixa, por exemplo `Documentos\Assistente de Combate`. Não apague essa pasta depois: o Chrome usa os arquivos dela.
3. No Chrome, digite na barra de endereço: `chrome://extensions` e aperte Enter.
4. No canto de cima, à direita, ligue o **"Modo do desenvolvedor"**.
5. Clique em **"Carregar sem compactação"** e escolha a pasta que você extraiu (a que tem o arquivo `manifest.json` dentro).
6. Pronto. Vai aparecer "Assistente de Combate (pessoal)" na lista.

## Testar antes de sábado (importante)

1. Abra o seu jogo no Roll20, como mestre.
2. O painel aparece do lado direito do mapa.
3. Digite qualquer número nas iniciativas e clique em **"Começar luta"**.
4. Clique em **"Ataque"** de qualquer monstro.
5. Confira se a rolagem apareceu no chat do Roll20 (como sussurro para você).
6. Clique em **"Recomeçar luta"** para zerar o teste.

Se a rolagem **não** aparecer no chat, me avise. Até lá, o painel mostra uma faixa vermelha e copia o comando: é só colar no chat (Ctrl+V) e apertar Enter.

## Usar na luta

- **Iniciativa automática:** role a iniciativa dos monstros no Roll20 (com o token selecionado). Ela entra na ordem de turnos do Roll20 e o painel copia sozinho. Dê aos tokens os mesmos nomes do painel ("Cultista 1", "Raiz 2") para cada um ir ao lugar certo; se o token se chamar só "Cultista", vai para o próximo cultista sem iniciativa. Se não vier, clique em "Puxar iniciativa do Roll20", e se ainda assim não vier, em "Copiar diagnóstico" e mande ao Claude.
- **Antes de começar:** o padrão já está em **5 jogadores** e **Tobias preparado** (Escudo da Fé e Auxílio ativos, mais 2 cultistas). Marque "Ritual completo" se o ritual tiver terminado. Depois digite a iniciativa de cada monstro e clique em "Começar luta".
- **"Próximo ▶"** passa o turno. A ação de covil aparece sozinha na iniciativa 20 de cada rodada.
- **O cartão do turno** mostra os avisos, a melhor jogada, a fala e os botões de rolar. "Ficha completa" abre todas as ações e magias.
- **Ataque e dano são separados:** role o ataque, pergunte ao jogador se acerta e depois clique em "Dano" ou "Dano crítico".
- **Magias:** ao clicar numa magia, o painel gasta o espaço e marca a concentração sozinho.
- **Dano nos monstros:** digite o número no campo "dano" da lista e clique em **−** (ou aperte Enter). O **+** cura.
- **Fé Fraturada:** quando Tobias cair abaixo de 63 PV, o painel pergunta se você quer usá-la. Clique em "Sim", veja a cura no chat e digite o resultado.
- **Abalar Tobias:** quando um jogador passar no teste de CD 16, escreva o nome dele e clique em "Abalado".
- **"Só para mim" ou "Para todos"**, no topo, decide quem vê as rolagens. O padrão é só você.
- **Se a página do Roll20 recarregar,** a luta continua de onde parou.

## Ligar os botões às fichas do Roll20 (o quadro igual ao da ficha)

Cada ataque e magia do painel tem um botão **🔗** ao lado. Ligando, o botão passa a mandar o comando da ficha, e o chat mostra o **quadro da própria ficha**, com os botões "Damage" e "Crit Damage" e a estrela do crítico.

Para ligar uma ação (uma vez só por ação; fica guardado):
1. Na ficha do monstro no Roll20, clique na ação (por exemplo, Maça Sacrílega).
2. Clique no campo do chat, vazio, e aperte a **seta para cima ↑**. Aparece um texto como `%{-P4l-...|repeating_npcaction("...", "action")}`.
3. Copie esse texto (Ctrl+A, Ctrl+C).
4. No painel, clique no **🔗** ao lado do botão dessa ação e cole (Ctrl+V).

O botão fica azul com "✓ ficha". O dano dessa ação passa a sair pelos botões do quadro da ficha no chat. Para desligar, clique no 🔗 e apague o texto.

Cultistas, raízes e lobos: se todos os tokens de um tipo usam a mesma ficha, basta ligar uma vez.

## Novidades da versão 0.7: as lutas da Missão 2

- Na preparação, o primeiro campo agora é **"Luta"**. Escolha:
  - **M1 · Cena 6 — Tobias** (a de sempre);
  - **M2 · Cena 4 — Rãs e Lodo Negro** (Poço Escuro);
  - **M2 · Cena 5 — Servas e Raízes** (Bosque dos Sussurros, com "o sussurro" no começo de cada rodada);
  - **M2 · Cena 6 — O Sussurrador** (Clareira).
- Trocar de luta só funciona na preparação. No meio de uma luta, clique em **"Recomeçar luta"** e depois troque.
- **O Sussurrador:**
  - a melhor jogada: Convocar Raízes (o botão rola a recarga 1d6: 5 ou 6 pode usar) ou 2 Ataques de Raiz;
  - covil na iniciativa 20: **Broto** (chama uma Raiz, até 6, ou 8 com 5 jogadores) ou **Voz querida**;
  - ao passar da metade dos PV, o painel avisa o **Submergir nas Raízes**;
  - botão **"Ritual de Ossian feito"**: tira o Submergir e lembra a vulnerabilidade a radiante.
- Rãs: Mordida e Engolir. Lodo Negro: Cobrir (avisa quando o dano cai pela metade). Servas: Prender + Golpe de Galho.
- No Roll20, os tokens da Missão 2 já estão com os nomes certos ("Rã Gigante Corrompida 1", "Serva de Raízes 2", "O Sussurrador"). As "Raiz Grossa" e os "Casulo" são ignorados pelo painel.

## Novidades da versão 0.6: os números vêm das fichas do Roll20

- **PV e CA saem da ficha do Roll20** de cada token. Se a ficha não tiver o PV, o painel usa a barra de PV do token. Se não der para ler nada, usa a bíblia. Na preparação, cada linha mostra de onde veio cada número: "(ficha)", "(token)" ou "(bíblia)".
- Para isso funcionar, os tokens precisam estar **ligados à ficha** (no token: "Represents", ou "Representa") e ter nomes parecidos com os do painel ("Cultista da Raiz 1", "Dire Wolf 2").
- Mudou alguma ficha? Clique em **"Ler fichas do Roll20"**. O painel também lê sozinho ao abrir e ao clicar em "Começar luta".
- O Auxílio (+5 PV) e o Escudo da Fé (+2 CA) de Tobias continuam somando por cima da ficha. A Fé Fraturada passa a ser oferecida na metade do PV dele, seja qual for o PV da ficha.
- **Monstro novo, sem falar com o Claude:**
  1. Ponha o token no mapa, ligado à ficha.
  2. Clique em **"+ Do mapa"** (na preparação ou na lista "Combatentes") e escolha o monstro.
  3. No turno dele, clique em **"🔗 Ligar ação da ficha"**: na ficha, clique na ação, aperte ↑ no chat vazio, copie, cole e dê um nome ao botão.
  4. Isso vale uma vez por ficha: todos os tokens daquela ficha ganham os botões. O ✎ troca ou apaga uma ação.
- Monstros novos não têm "melhor jogada" (isso só existe para Tobias e seus capangas). O cartão deles mostra os botões das ações, as condições, e o dano vai para a barra do token como nos outros.
- Para voltar a usar só a bíblia: em "⚙ Roll20", desmarque "PV e CA das fichas do Roll20".
- Se o PV ou a CA não vierem da ficha, clique em **"Copiar diagnóstico"** e mande ao Claude: ele mostra como a sua ficha guarda os números.

## Novidades da versão 0.5

- **↶ Desfazer** (no topo): volta o último passo: dano no monstro errado, turno passado sem querer, magia clicada por engano. Pode apertar várias vezes.
- **Teclas protegidas:** enquanto você digita no painel, Backspace e Delete não chegam ao Roll20 (não apagam o token selecionado).
- **Condições:** na lista "Combatentes", em "Pôr condição em", escolha o monstro e a condição (Agarrado, Derrubado, Impedido, Amedrontado, Envenenado, Cego, Paralisado, Atordoado, Incapacitado). Ela aparece na linha dele e, no turno dele, o lembrete do que muda. Derrubado, Impedido, Envenenado e Cego já rolam o ataque com desvantagem. Paralisado, Atordoado e Incapacitado encerram a concentração de Tobias. Para tirar, clique na etiqueta roxa (×).
- **Covil:** a ação usada fica verde com ✓. Na Fase 2 o painel não deixa repetir a mesma.
- **Imobilizar Pessoa:** enquanto Tobias mantém a magia, o painel lembra que o alvo repete a salvaguarda no fim de cada turno dele.
- **O painel segue a ordem de turnos do Roll20:** quando você passa a vez no Roll20, o painel vai junto. Na vez de um jogador ele mostra "Vez de (nome)". Quando a vez passa da iniciativa 20, ele mostra a ação de covil. Se preferir, ponha na ordem de turnos uma entrada "Covil" com 20 ("Add Custom Item"), e o covil vem dela. O botão "Próximo ▶" do painel continua funcionando.
- **Barra de PV dos tokens:** o dano e a cura do painel vão sozinhos para a barra de PV do token no mapa. No começo da luta, as barras são acertadas com o PV do painel (isso corrige o "40/22" dos cultistas). O painel usa a barra com o maior valor máximo; para escolher outra, abra "⚙ Roll20", no fim do painel. Se a barra estiver ligada à ficha, o painel não mexe nela (senão todos os tokens daquela ficha mudariam juntos) e avisa.
- Em **"⚙ Roll20"** você liga e desliga as duas coisas acima.

## Cuidados

- **Compartilhando a tela** (Discord, por exemplo)? Minimize o painel com o botão **_**. Para reabrir, clique na bolinha ⚔.
- Dica: no chat do Roll20, escolha o personagem Tobias no campo "Como:" ("As:"), e as rolagens saem em nome dele.
