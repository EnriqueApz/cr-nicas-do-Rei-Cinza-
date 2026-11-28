# Crônicas do Rei Cinza

Campanha de D&D 5e (regras de 2024) mestrada no Roll20. Este repositório guarda o material do mestre, a extensão de combate do Chrome e o site do mestre.

**Antes de qualquer coisa, leia `docs/contexto-completo.md`.** Ele tem tudo o que foi conversado: a mesa, os personagens, o que mudou na história, as decisões em aberto, a extensão, o site e os próximos passos.

## Como falar com o mestre

- Em português do Brasil, simples e em tópicos, sem jargão técnico.
- Ele tem TDAH: respostas curtas, diretas, com o próximo passo claro.
- Os jogadores **não podem saber** da extensão nem dos segredos da campanha. Não publique nada com spoilers de forma pública.

## Onde está cada coisa

- `mestre/herancas-do-alvorecer.md`: o material do mestre (heranças, calendário de cada personagem, o drow, o mapa e o apito).
- `jogadores/herancas-do-alvorecer.md`: os cartões para os jogadores, entregues só depois de aceitarem a herança.
- `extensao/`: a extensão "Assistente de Combate" (versão 0.6.1). Para testar, rode `npm run tudo` dentro de `extensao/`. O guia de uso está em `extensao/LEIA-ME.md`.
- `ferramentas/site/`: o site do mestre (https://claude.ai/artifact/3xdodd6t57cqEszUnB7Y2L). Como remontar: `ferramentas/site/LEIA-ME.md`.
- A bíblia em PDF **não** está no repositório: fica no PC do mestre, na pasta "Cronicas Rei Cinza".

## Regras de trabalho

- Ramo de trabalho: `ccr-57029135-1flft8` (ainda não juntado ao `main`).
- Rode os testes da extensão antes de dizer que algo funciona. O que só foi testado em páginas falsas do Roll20 precisa ser confirmado pelo mestre no Roll20 de verdade.
- Para mudar a extensão: suba a versão no `manifest.json` e gere o zip de novo.
