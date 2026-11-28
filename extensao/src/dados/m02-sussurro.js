// Missão 2 — O Segundo Sussurro. Números das Fichas de Combate da Missão 2.
// Três lutas: Cena 4 (Poço Escuro), Cena 5 (Bosque dos Sussurros) e Cena 6 (O Sussurrador).
(function () {
  const raiz = {
    id: 'raiz', nome: 'Raiz', ca: 12, pv: 13,
    resumo: 'Planta Pequena · ND 1/4 · Vulnerável a fogo (dano dobrado)',
    acoes: {
      chicote: {
        nome: 'Chicote de Espinhos', tipo: 'ataque', bonus: 3, alcance: '3 m',
        dano: [{ dados: '1d6+1', tipo: 'perfurante' }],
        extra: 'Alvo Médio ou menor: Força CD 11 ou fica Agarrado (escapar CD 11).',
      },
    },
  };

  const serva = {
    id: 'serva', nome: 'Serva de Raízes', ca: 13, pv: 52,
    resumo: 'Planta Média · ND 2 · Resistente a perfurante · Vulnerável a fogo · Imune a Enfeitiçado · não se afasta mais de 9 m dos casulos (ou do poço)',
    acoes: {
      galho: {
        nome: 'Golpe de Galho', tipo: 'ataque', bonus: 5, alcance: '3 m',
        dano: [{ dados: '2d6+3', tipo: 'concussão' }],
      },
      prender: {
        nome: 'Prender', tipo: 'ataque', bonus: 5, alcance: '3 m', dano: [],
        extra: 'O alvo fica Agarrado e Impedido (escapar CD 13).',
      },
    },
  };

  const ra = {
    id: 'ra', nome: 'Rã Gigante', ca: 12, pv: 33,
    resumo: 'Fera Média · ND 1 · Salto Anfíbio: salta até 6 m sem provocar ataques de oportunidade · nado 9 m',
    acoes: {
      mordida: {
        nome: 'Mordida', tipo: 'ataque', bonus: 4, alcance: '1,5 m',
        dano: [{ dados: '1d10+2', tipo: 'perfurante' }],
        extra: 'O alvo fica Agarrado (escapar CD 12).',
      },
    },
    magias: {
      engolir: {
        nome: 'Engolir', etiqueta: 'habilidade', tempo: 'acao',
        dano: [{ dados: '2d4', tipo: 'ácido' }],
        efeito: 'Engole um alvo Pequeno ou Médio que esteja agarrando. Engolido: Cego e Impedido, sofre 2d4 de ácido no início de cada turno da rã. Se a rã sofrer 10 de dano num turno, cospe o alvo.',
      },
    },
  };

  const lodo = {
    id: 'lodo', nome: 'Lodo Negro', ca: 10, pv: 45,
    resumo: 'Enxame Grande de musgo vivo · ND 2 · Resistente a concussivo, cortante e perfurante · Vulnerável a fogo · ocupa o espaço de outras criaturas · não recupera PV',
    acoes: {},
    magias: {
      cobrir: {
        nome: 'Cobrir', etiqueta: 'habilidade', tempo: 'acao', cd: '12 Constituição',
        dano: [{ dados: '3d6', tipo: 'necrótico' }], metadeSePassar: true,
        efeito: 'Cada criatura no espaço do lodo faz a salvaguarda. Falha: 3d6 necrótico e não pode falar até o fim do próximo turno. Sucesso: metade. Abaixo da metade dos PV (22), o dano cai pela metade.',
      },
    },
  };

  const sussurrador = {
    id: 'sussurrador', nome: 'O Sussurrador', unico: true, ca: 14, pv: 115, pv5: 140,
    resumo: 'Fragmento Grande do Rei Cinza · ND 4 · preso ao poço (deslocamento 0) · Resistente a concussivo, cortante e perfurante não mágicos · Imune a Amedrontado e Enfeitiçado · não pode ser banido',
    acoes: {
      raiz: {
        nome: 'Ataque de Raiz', tipo: 'ataque', bonus: 5, alcance: '6 m',
        dano: [{ dados: '2d6+3', tipo: 'concussão' }],
      },
    },
    magias: {
      convocar: {
        nome: 'Convocar Raízes', etiqueta: 'recarga 5-6', tempo: 'acao', cd: '13 Destreza', recarga: true,
        dano: [{ dados: '3d6', tipo: 'concussão' }], metadeSePassar: true,
        efeito: 'Círculo de 3 m de raio a até 12 m. Falha: 3d6 concussão e Agarrado (escapar CD 13). Sucesso: metade e livre.',
      },
    },
  };

  const covilSussurrador = {
    broto: {
      nome: 'Broto',
      efeito: 'Chama 1 Raiz Sanguinolenta (máximo 6 em campo; 8 com 5 jogadores).',
    },
    vozQuerida: {
      nome: 'Voz querida', cd: '13 Sabedoria',
      efeito: 'Um personagem ouve a voz de alguém que perdeu. Falha: perde a ação bônus e a reação até o fim da rodada.',
    },
  };

  const registrar = (d) => {
    globalThis.AssistenteRC = globalThis.AssistenteRC || {};
    globalThis.AssistenteRC.dados = globalThis.AssistenteRC.dados || {};
    globalThis.AssistenteRC.dados[d.id] = d;
    return d;
  };

  const repetir = (lista, fichaId, n) => { for (let i = 0; i < n; i++) lista.push({ fichaId }); };

  const m02c04 = registrar({
    id: 'm02c04',
    titulo: 'Missão 2 · Cena 4 — Poço Escuro',
    curto: 'M2 · Cena 4 — Rãs e Lodo Negro',
    fichas: { ra, lodo },
    chefe: null,
    covil: false,
    adicionaveis: ['ra', 'lodo'],
    montar(jogadores) {
      const lista = [];
      repetir(lista, 'ra', jogadores === 5 ? 6 : 5);
      repetir(lista, 'lodo', jogadores === 5 ? 2 : 1);
      return lista;
    },
    avisos: {
      ra: 'Emboscada saindo da água (Percepção ou Sobrevivência CD 14 evita a surpresa). Morda e agarre; no turno seguinte, Engula e volte para o fundo. Quem cair na água: Força CD 13 para sair da correnteza.',
      lodo: 'Deslize sobre quem está caído ou acabou de ser cuspido por uma rã. Não poder falar corta magias com componente verbal: mire no conjurador.',
    },
    textoFim: 'Queimar o musgo depois da luta (30 minutos) conta como uma das três raízes do ritual da Cena 6.',
  });

  const m02c05 = registrar({
    id: 'm02c05',
    titulo: 'Missão 2 · Cena 5 — Bosque dos Sussurros',
    curto: 'M2 · Cena 5 — Servas e Raízes',
    fichas: { serva, raiz },
    chefe: null,
    covil: true,
    tituloCovil: 'Início da rodada — o sussurro',
    covis: {
      sussurro: {
        nome: 'O sussurro', cd: '13 Sabedoria',
        efeito: 'Um personagem à sua escolha faz a salvaguarda. Falha: no próximo turno anda 3 m em direção à árvore morta e perde a reação. Diga uma frase pessoal na voz de alguém que ele perdeu. Cada personagem só uma vez.',
      },
    },
    adicionaveis: ['serva', 'raiz'],
    montar(jogadores) {
      const lista = [];
      repetir(lista, 'serva', jogadores === 5 ? 4 : 3);
      repetir(lista, 'raiz', jogadores === 5 ? 4 : 3);
      return lista;
    },
    avisos: {
      serva: 'Lenta e presa aos casulos: o perigo é o alcance de 3 m. Prenda quem estiver cortando casulos e bata em quem tentar soltá-lo. Não persegue além de 9 m.',
      raiz: 'Agarre quem corre até os casulos.',
    },
    textoFim: 'Medicina CD 12: os resgatados andam sozinhos até Marfoz.',
  });

  const m02c06 = registrar({
    id: 'm02c06',
    titulo: 'Missão 2 · Cena 6 — O Sussurrador',
    curto: 'M2 · Cena 6 — O Sussurrador',
    fichas: { sussurrador, raiz, serva },
    chefe: 'sussurrador',
    covil: true,
    covis: covilSussurrador,
    adicionaveis: ['raiz', 'serva'],
    montar(jogadores) {
      const lista = [{ fichaId: 'sussurrador' }];
      repetir(lista, 'raiz', jogadores === 5 ? 5 : 3);
      repetir(lista, 'serva', jogadores === 5 ? 2 : 1);
      return lista;
    },
    maxRaizes: (jogadores) => (jogadores === 5 ? 8 : 6),
    avisos: {
      raiz: 'Agarre quem tenta fugir da clareira ou queimar as raízes grossas.',
      serva: 'Fique junto ao poço (no máximo 9 m). Prenda quem estiver queimando uma raiz grossa.',
    },
    falas: {
      rodada1: '"Outro pedaço de mim... tão longe... vocês vieram cortar mais raízes, ou vieram, finalmente, escutar?"',
      dialogo: '"Fui cortado... espalhado... e cada pedaço esquece o resto. Vocês também esquecem, um dia. Todos esquecem. Eu só queria que alguém lembrasse comigo."',
      tobias: '"Esse nome... dói... minha irmã sumiu... ela está... dentro de vocês?"',
    },
    textoQueda: 'A luz cinzenta é sugada pelo amuleto. Agora são duas luzes. As raízes param de pulsar e o murmúrio do bosque some.',
  });

  const api = { m02c04, m02c05, m02c06 };
  if (typeof module !== 'undefined') module.exports = api;
})();
