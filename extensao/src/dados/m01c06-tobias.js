// Missão 1, Cena 6 — Câmara da Raiz-Mãe. Números das Fichas de Combate da Missão 1.
(function () {
  const fichas = {
    tobias: {
      id: 'tobias',
      nome: 'Tobias',
      ca: 16,
      pv: 105,
      pv5: 125,
      limiar: 53,
      limiar5: 63,
      espacos: { 1: 4, 2: 3, 3: 2 },
      resumo: 'Clérigo caído · ND 4 · Salvaguardas Sab +5, Car +4 · Percepção passiva 13',
      acoes: {
        maca: {
          nome: 'Maça Sacrílega', tipo: 'ataque', bonus: 4, alcance: '1,5 m',
          dano: [{ dados: '1d6+1', tipo: 'concussão' }, { dados: '2d6', tipo: 'necrótico' }],
        },
      },
      magias: {
        chamaSagrada: {
          nome: 'Chama Sagrada', circulo: 0, tempo: 'acao', concentracao: false,
          cd: '13 Destreza', alcance: '18 m', dano: [{ dados: '2d8', tipo: 'radiante' }],
          efeito: 'Alvo a até 18 m faz salvaguarda de Destreza. Cobertura não ajuda.',
        },
        comando: {
          nome: 'Comando', circulo: 1, tempo: 'acao', concentracao: false, cd: '13 Sabedoria',
          efeito: 'Se falhar, obedece a uma palavra no próximo turno: Fuja, Largue, Deite, Pare ou Aproxime-se.',
        },
        curarFerimentos: {
          nome: 'Curar Ferimentos', circulo: 1, tempo: 'acao', concentracao: false,
          cura: '2d8+3', efeito: 'Toque: recupera PV em si mesmo ou num cultista.',
        },
        escudoDaFe: {
          nome: 'Escudo da Fé', circulo: 1, tempo: 'bonus', concentracao: true,
          efeito: '+2 na CA (Tobias fica com CA 18). Concentração, 10 minutos.',
        },
        imobilizarPessoa: {
          nome: 'Imobilizar Pessoa', circulo: 2, tempo: 'acao', concentracao: true, cd: '13 Sabedoria',
          efeito: 'Humanoide a até 18 m fica Paralisado se falhar; repete a salvaguarda no fim de cada turno. Corpo a corpo contra paralisado é crítico.',
        },
        armaEspiritual: {
          nome: 'Arma Espiritual', circulo: 2, tempo: 'bonus', concentracao: true,
          ataque: 5, dano: [{ dados: '1d8+3', tipo: 'força' }],
          efeito: 'Arma espectral a até 18 m. Nos turnos seguintes, ação bônus: move 6 m e ataca de novo.',
        },
        auxilio: {
          nome: 'Auxílio', circulo: 2, tempo: 'acao', concentracao: false,
          efeito: 'Até 3 criaturas a até 9 m ganham +5 PV máximos e atuais por 8 horas.',
        },
        espiritosGuardioes: {
          nome: 'Espíritos Guardiões', circulo: 3, tempo: 'acao', concentracao: true,
          cd: '13 Sabedoria', dano: [{ dados: '3d8', tipo: 'necrótico' }], metadeSePassar: true,
          efeito: 'Aura de raízes espectrais de 4,5 m. Inimigos que entram ou começam o turno nela fazem a salvaguarda; deslocamento pela metade na aura.',
        },
        dissiparMagia: {
          nome: 'Dissipar Magia', circulo: 3, tempo: 'acao', concentracao: false,
          efeito: 'Encerra uma magia de 3º círculo ou menor num alvo a até 36 m.',
        },
      },
      feFraturada: { cura: '3d8+4' },
      covil: {
        raizesQuePrendem: {
          nome: 'Raízes que Prendem', cd: '13 Força',
          efeito: 'Um quadrado de 3 m vira terreno difícil. Quem estiver nele faz a salvaguarda ou fica Impedido.',
        },
        pulso: {
          nome: 'Pulso da Raiz-Mãe', cd: '13 Constituição', dano: '2d6', danoFase2: '3d6', tipo: 'necrótico',
          efeito: 'Uma criatura a até 9 m faz a salvaguarda ou sofre o dano.',
        },
        broto: {
          nome: 'Broto',
          efeito: 'Surge 1 Raiz Sanguinolenta ao lado da raiz-mãe (máximo 4 em campo).',
        },
      },
    },
    cultista: {
      id: 'cultista', nome: 'Cultista', ca: 13, pv: 22,
      resumo: 'Humanoide · ND 1/2 · Devoção Cega: vantagem contra Amedrontado com outro cultista a até 9 m',
      acoes: {
        adaga: {
          nome: 'Adaga Ritual', tipo: 'ataque', bonus: 4, alcance: '1,5 m',
          dano: [{ dados: '1d4+2', tipo: 'perfurante' }, { dados: '1d6', tipo: 'necrótico' }],
        },
      },
    },
    raiz: {
      id: 'raiz', nome: 'Raiz', ca: 12, pv: 13,
      resumo: 'Planta Pequena · ND 1/4 · Vulnerável a fogo (dano dobrado)',
      acoes: {
        chicote: {
          nome: 'Chicote de Espinhos', tipo: 'ataque', bonus: 3, alcance: '3 m',
          dano: [{ dados: '1d6+1', tipo: 'perfurante' }],
          extra: 'Alvo Médio ou menor: Força CD 11 ou fica Agarrado (escapar CD 11).',
        },
      },
    },
    lobo: {
      id: 'lobo', nome: 'Lobo', ca: 13, pv: 30,
      resumo: 'Fera Média · ND 1 · Tática de Matilha · ignora quem está untado com a unção do culto',
      acoes: {
        mordida: {
          nome: 'Mordida', tipo: 'ataque', bonus: 4, alcance: '1,5 m',
          dano: [{ dados: '2d4+2', tipo: 'perfurante' }, { dados: '1d6', tipo: 'necrótico' }],
          extra: 'O alvo faz salvaguarda de Força CD 12 ou cai Derrubado.',
        },
      },
    },
  };

  function montar(jogadores, chegada) {
    const lista = [{ fichaId: 'tobias' }];
    const cultistas = 2 + (chegada === 'preparado' ? 2 : 0);
    const raizes = jogadores === 5 ? 4 : 2;
    for (let i = 0; i < cultistas; i++) lista.push({ fichaId: 'cultista' });
    for (let i = 0; i < raizes; i++) lista.push({ fichaId: 'raiz' });
    if (jogadores === 5) lista.push({ fichaId: 'lobo' });
    return lista;
  }

  const dados = {
    id: 'm01c06',
    titulo: 'Missão 1 · Cena 6 — Tobias',
    fichas,
    montar,
    falas: {
      rodada1: '"Vocês não deviam ter vindo." A voz treme. "Ela pode trazer de volta tudo o que a peste levou. Minha esposa, meus filhos."',
      negociar: '"Eu sei o que parece. Sei o que fiz. Mas vocês não ouviram o que ela promete. Não posso parar agora. Não quando estou tão perto."',
      fase2: 'A entidade passa a falar por ele com as vozes dos filhos mortos.',
    },
    textoQueda: 'Tobias desaba sobre a raiz-mãe, chorando baixinho. Uma luz cinzenta sai da raiz e é sugada pelo amuleto no pescoço dele. Descreva como algo bonito e triste, quase um alívio. A luz verde se apaga devagar; o murmúrio vira um último sussurro e some. Por enquanto.',
  };

  globalThis.AssistenteRC = globalThis.AssistenteRC || {};
  globalThis.AssistenteRC.dados = globalThis.AssistenteRC.dados || {};
  globalThis.AssistenteRC.dados.m01c06 = dados;
  if (typeof module !== 'undefined') module.exports = dados;
})();
