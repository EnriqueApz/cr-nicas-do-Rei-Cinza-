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

## Cuidados

- **Compartilhando a tela** (Discord, por exemplo)? Minimize o painel com o botão **_**. Para reabrir, clique na bolinha ⚔.
- Dica: no chat do Roll20, escolha o personagem Tobias no campo "Como:" ("As:"), e as rolagens saem em nome dele.
