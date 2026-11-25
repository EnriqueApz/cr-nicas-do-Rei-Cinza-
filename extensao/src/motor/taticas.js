// Motor de táticas: diz a melhor jogada de cada monstro e da ação de covil.
(function () {
  const raiz = globalThis.AssistenteRC || {};
  const dados = (typeof module !== 'undefined')
    ? require('../dados/m01c06-tobias.js')
    : raiz.dados.m01c06;
  const copiar = (o) => JSON.parse(JSON.stringify(o));
  const fichaTobias = dados.fichas.tobias;

  const botoesAtaque = (acaoId) => [
    { rotulo: 'Ataque', kind: 'ataque', acaoId },
    { rotulo: 'Dano', kind: 'dano', acaoId },
    { rotulo: 'Dano crítico', kind: 'danoCritico', acaoId },
  ];
  const botaoMagia = (magiaId) => {
    const m = fichaTobias.magias[magiaId];
    const botoes = [{ rotulo: m.nome, kind: 'magia', magiaId }];
    if (m.dano) botoes.push({ rotulo: `Dano (${m.nome})`, kind: 'danoMagia', magiaId });
    if (m.ataque && m.dano) botoes.push({ rotulo: `Crítico (${m.nome})`, kind: 'danoMagiaCritico', magiaId });
    return botoes;
  };

  function avisoTroca(t, magiaId) {
    if (!t.concentracao || t.concentracao === magiaId) return undefined;
    return `Trocar a concentração: encerra ${fichaTobias.magias[t.concentracao].nome}.`;
  }

  function sugerirTobias(e) {
    const t = e.combatentes.tobias;
    const avisos = [];
    const res = { avisos, jogadas: [] };
    if (t.concentracao) avisos.push(`Concentração ativa: ${fichaTobias.magias[t.concentracao].nome}`);
    if (t.desvantagemProximoAtaque) avisos.push('Abalado: sem reação e desvantagem no próximo ataque');
    if (t.fase === 2) avisos.push('Fase 2: a entidade fala com as vozes dos filhos.');
    if (e.chegada === 'surpresa' && e.rodada === 1) {
      avisos.unshift('Pego de surpresa: Tobias perde esta rodada, hesitando.');
      return res;
    }
    const outras = [];
    if (e.rodada === 1) {
      res.fala = dados.falas.rodada1;
      if (t.concentracao) {
        outras.push({
          titulo: 'Chama Sagrada',
          motivo: 'Deixe ele falar primeiro. O Escudo da Fé já está ativo.',
          botoes: botaoMagia('chamaSagrada'),
        });
      } else {
        outras.push({
          titulo: 'Escudo da Fé (ação bônus) + Chama Sagrada',
          motivo: 'Deixe ele falar primeiro. CA 18 logo de saída e dano à distância.',
          botoes: [...botaoMagia('escudoDaFe'), ...botaoMagia('chamaSagrada')],
        });
      }
    }
    if (t.fase === 2) res.fala = res.fala || dados.falas.fase2;
    const podeEG = t.espacos[3] > 0 && t.concentracao !== 'espiritosGuardioes';
    const eg = () => ({
      titulo: 'Espíritos Guardiões',
      motivo: t.fase === 2
        ? 'A magia mais perigosa dele; guardada para a Fase 2.'
        : 'O grupo está inteiro: hora da magia mais perigosa dele.',
      aviso: avisoTroca(t, 'espiritosGuardioes'),
      botoes: botaoMagia('espiritosGuardioes'),
    });
    if (t.fase === 2 && podeEG) outras.push(eg());
    if (t.fase === 1 && e.rodada > 1) {
      const ferido = e.perguntas.grupoFerido;
      if (ferido === null) res.pergunta = { chave: 'grupoFerido', texto: 'O grupo está ferido?' };
      if (ferido === true && t.espacos[2] > 0 && t.concentracao !== 'armaEspiritual') {
        outras.push({
          titulo: 'Arma Espiritual (ação bônus) + 2× Maça Sacrílega',
          motivo: 'Grupo ferido: segure Espíritos Guardiões para a Fase 2.',
          aviso: avisoTroca(t, 'armaEspiritual'),
          botoes: [...botaoMagia('armaEspiritual'), ...botoesAtaque('maca')],
        });
      }
      if (ferido === false && podeEG) outras.push(eg());
    }
    const cultistaMal = Object.values(e.combatentes).some(
      (c) => c.fichaId === 'cultista' && (c.caido || c.pv < c.pvMax / 2));
    let curar = null;
    if (cultistaMal && t.espacos[1] > 0) {
      curar = {
        titulo: 'Curar Ferimentos no cultista',
        motivo: 'Um cultista caiu ou está mal: devolva-o à luta (2d8+3).',
        botoes: [{ rotulo: 'Curar Ferimentos', kind: 'magia', magiaId: 'curarFerimentos' }],
      };
    }
    const maca = {
      titulo: '2× Maça Sacrílega no mais ferido',
      motivo: 'Sem magia melhor agora: dois ataques no alvo mais fraco.',
      aviso: t.desvantagemProximoAtaque ? 'O primeiro ataque sai com desvantagem.' : undefined,
      botoes: botoesAtaque('maca'),
    };
    const escolhidas = outras.slice(0, curar ? 1 : 2);
    if (curar && escolhidas.length >= 1) escolhidas.push(curar);
    res.jogadas = [...escolhidas, maca];
    if (curar && escolhidas.length === 0) res.jogadas = [maca, curar];
    return res;
  }

  const capangas = {
    cultista: { acaoId: 'adaga', aviso: 'Proteja Tobias: fique entre o grupo e ele.' },
    raiz: { acaoId: 'chicote', aviso: 'Agarre quem corre até Tobias ou até a raiz-mãe.' },
    lobo: { acaoId: 'mordida', aviso: 'Derrube a linha de frente para os cultistas atacarem com vantagem.' },
  };

  function sugerir(estado, id) {
    const c = estado.combatentes[id];
    if (!c) return { avisos: [], jogadas: [] };
    if (c.fichaId === 'tobias') return sugerirTobias(estado);
    const cfg = capangas[c.fichaId];
    const acao = dados.fichas[c.fichaId].acoes[cfg.acaoId];
    return {
      avisos: [cfg.aviso],
      jogadas: [{ titulo: acao.nome, motivo: acao.extra || 'Ataque básico.', botoes: botoesAtaque(cfg.acaoId) }],
    };
  }

  function sugerirCovil(estado) {
    const t = estado.combatentes.tobias;
    const quantidade = t && t.fase === 2 ? 2 : 1;
    const raizesDePe = Object.values(estado.combatentes).filter((c) => c.fichaId === 'raiz' && !c.caido).length;
    const podeBroto = raizesDePe < 4;
    const motivos = {
      broto: `Só ${raizesDePe} Raiz(es) de pé: mais uma para agarrar o grupo.`,
      pulso: quantidade === 2 ? 'Fase 2: o Pulso causa 3d6. Mire em quem está isolado ou ferido.' : 'Mire em quem está isolado ou ferido.',
      raizesQuePrendem: 'Se alguém estiver correndo até Tobias.',
    };
    const ordem = [];
    if (podeBroto && raizesDePe < 2) ordem.push('broto', 'pulso');
    else ordem.push('pulso', podeBroto ? 'broto' : 'raizesQuePrendem');
    const todas = ['raizesQuePrendem', 'pulso'];
    if (podeBroto) todas.push('broto');
    return {
      quantidade,
      sugestoes: ordem.slice(0, quantidade).map((covilId) => ({ covilId, motivo: motivos[covilId] })),
      todas,
      motivos,
    };
  }

  function resolverFeFraturada(estado, usar) {
    const e = copiar(estado);
    const t = e.combatentes.tobias;
    if (!t || !t.pendenteFeFraturada) return { estado, mensagem: '', precisaRolarCura: false, caiu: false };
    t.pendenteFeFraturada = false;
    t.usos.feFraturada = 0;
    let mensagem = '';
    let precisaRolarCura = false;
    if (usar) {
      t.fase = 2;
      if (t.reacao) {
        t.reacao = false;
        precisaRolarCura = true;
        mensagem = 'Fé Fraturada: role a cura e digite os PV recuperados. Tobias entra na Fase 2.';
      } else {
        mensagem = 'Sem reação (abalado): não recupera os 18 PV, mas entra na Fase 2.';
      }
    }
    let caiu = false;
    if (t.pv === 0 && !precisaRolarCura) { t.caido = true; caiu = true; }
    return { estado: e, mensagem, precisaRolarCura, caiu };
  }

  const api = { sugerir, sugerirCovil, resolverFeFraturada };
  globalThis.AssistenteRC = globalThis.AssistenteRC || {};
  globalThis.AssistenteRC.taticas = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
