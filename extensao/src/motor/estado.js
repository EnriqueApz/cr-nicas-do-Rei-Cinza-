// Motor de estado do combate. Funções puras: recebem um estado e devolvem outro.
(function () {
  const CONDICOES = (typeof module !== 'undefined')
    ? require('../dados/condicoes.js')
    : globalThis.AssistenteRC.condicoes;
  const copiar = (o) => JSON.parse(JSON.stringify(o));

  function numeroValido(valor) {
    if (typeof valor === 'string') valor = valor.trim() === '' ? NaN : Number(valor);
    if (typeof valor !== 'number' || !Number.isFinite(valor) || valor <= 0) return null;
    return Math.floor(valor);
  }

  function caAtual(c) {
    return c.caBase + (c.concentracao === 'escudoDaFe' ? 2 : 0);
  }

  function criarCombate(encontro, opcoes) {
    const jogadores = opcoes.jogadores === 5 ? 5 : 4;
    const chegada = ['normal', 'surpresa', 'preparado'].includes(opcoes.chegada) ? opcoes.chegada : 'normal';
    const ritualCompleto = !!opcoes.ritualCompleto;
    const lista = encontro.montar(jogadores, chegada);
    const totais = {};
    lista.forEach((m) => { totais[m.fichaId] = (totais[m.fichaId] || 0) + 1; });
    const contagem = {};
    const combatentes = {};
    for (const m of lista) {
      const f = encontro.fichas[m.fichaId];
      contagem[m.fichaId] = (contagem[m.fichaId] || 0) + 1;
      const unico = m.fichaId === 'tobias';
      const id = unico ? m.fichaId : `${m.fichaId}-${contagem[m.fichaId]}`;
      const pv = jogadores === 5 && f.pv5 ? f.pv5 : f.pv;
      combatentes[id] = {
        id,
        fichaId: m.fichaId,
        nome: unico ? f.nome : `${f.nome} ${contagem[m.fichaId]}`,
        pv,
        pvMax: pv,
        pvTemp: 0,
        caBase: f.ca,
        ca: f.ca,
        iniciativa: null,
        espacos: f.espacos ? copiar(f.espacos) : null,
        concentracao: null,
        usos: f.feFraturada ? { feFraturada: 1 } : {},
        fase: 1,
        reacao: true,
        desvantagemProximoAtaque: false,
        caido: false,
        pendenteFeFraturada: false,
        condicoes: [],
      };
    }
    const t = combatentes.tobias;
    if (t && chegada === 'preparado') {
      t.concentracao = 'escudoDaFe';
      t.espacos[1] -= 1;
      t.espacos[2] -= 1;
      t.pv += 5;
      t.pvMax += 5;
      t.ca = caAtual(t);
    }
    if (t && ritualCompleto) t.pvTemp = 15;
    return {
      encontroId: encontro.id,
      jogadores,
      chegada,
      ritualCompleto,
      iniciado: false,
      rodada: 0,
      indice: 0,
      ordem: [],
      sussurro: true,
      perguntas: { grupoFerido: null },
      abaladoPor: [],
      marca: -1,
      covilUsado: { rodada: 0, ids: [] },
      combatentes,
    };
  }

  function definirIniciativa(estado, id, valor) {
    const e = copiar(estado);
    if (!e.combatentes[id]) return estado;
    const n = typeof valor === 'string' ? Number(valor) : valor;
    e.combatentes[id].iniciativa = Number.isFinite(n) ? n : null;
    return e;
  }

  function temCovil(estado) {
    return !!estado.combatentes.tobias;
  }

  function iniciar(estado) {
    const e = copiar(estado);
    const ids = Object.keys(e.combatentes);
    const ordenados = ids
      .map((id, pos) => ({ id, pos, ini: e.combatentes[id].iniciativa ?? 0 }))
      .sort((a, b) => b.ini - a.ini || a.pos - b.pos);
    const ordem = [];
    let covilPosto = !temCovil(e);
    for (const o of ordenados) {
      if (!covilPosto && o.ini < 20) { ordem.push('covil'); covilPosto = true; }
      ordem.push(o.id);
    }
    if (!covilPosto) ordem.push('covil');
    e.ordem = ordem;
    e.iniciado = true;
    e.rodada = 1;
    e.indice = 0;
    return pularInvalidos(e, 1);
  }

  function invalido(e, id) {
    if (id === 'covil') return !e.combatentes.tobias || e.combatentes.tobias.caido;
    return e.combatentes[id].caido;
  }

  // A reação volta no começo do turno, mas só na primeira vez que a luta chega ali:
  // voltar (◀) e avançar de novo não devolve uma reação já gasta nem apaga o "abalado".
  function comecarTurno(e) {
    const pos = e.rodada * 1000 + e.indice;
    if (pos <= (e.marca ?? -1)) return;
    e.marca = pos;
    const id = e.ordem[e.indice];
    const c = id !== 'covil' ? e.combatentes[id] : null;
    if (c && !(c.condicoes || []).some((x) => CONDICOES[x] && CONDICOES[x].incapacita)) c.reacao = true;
  }

  function pularInvalidos(e, direcao) {
    const n = e.ordem.length;
    for (let i = 0; i < n && invalido(e, e.ordem[e.indice]); i++) avancar(e, direcao);
    if (direcao > 0) comecarTurno(e);
    return e;
  }

  // Segue a ordem de turnos do Roll20: vai direto para o turno de id (ou 'covil').
  // novaRodada: o Roll20 voltou ao topo da ordem. Sem id (vez de um jogador), só conta a rodada.
  function sincronizar(estado, { id = null, novaRodada = false } = {}) {
    if (!estado.iniciado) return estado;
    const pos = id ? estado.ordem.indexOf(id) : -1;
    if (pos < 0 && !novaRodada) return estado;
    const e = copiar(estado);
    if (novaRodada) e.rodada += 1;
    if (pos >= 0) {
      e.indice = pos;
      comecarTurno(e);
    }
    return e;
  }

  function avancar(e, direcao) {
    e.indice += direcao;
    if (e.indice >= e.ordem.length) { e.indice = 0; e.rodada += 1; }
    if (e.indice < 0) {
      if (e.rodada > 1) { e.indice = e.ordem.length - 1; e.rodada -= 1; } else e.indice = 0;
    }
  }

  function proximoTurno(estado) {
    if (!estado.iniciado) return estado;
    const e = copiar(estado);
    avancar(e, 1);
    return pularInvalidos(e, 1);
  }

  function turnoAnterior(estado) {
    if (!estado.iniciado) return estado;
    const e = copiar(estado);
    avancar(e, -1);
    return pularInvalidos(e, -1);
  }

  function limiarDe(estado, c) {
    if (c.fichaId !== 'tobias') return null;
    return estado.jogadores === 5 ? 63 : 53;
  }

  function aplicarDano(estado, id, valor) {
    const n = numeroValido(valor);
    if (n === null || !estado.combatentes[id]) return { estado, eventos: [] };
    const e = copiar(estado);
    const c = e.combatentes[id];
    const eventos = [];
    const antes = c.pv;
    let resto = n;
    const absorvido = Math.min(c.pvTemp, resto);
    c.pvTemp -= absorvido;
    resto -= absorvido;
    c.pv = Math.max(0, c.pv - resto);
    const limiar = limiarDe(e, c);
    if (limiar !== null && c.usos.feFraturada === 1 && !c.pendenteFeFraturada && antes >= limiar && c.pv < limiar) {
      c.pendenteFeFraturada = true;
      eventos.push({ tipo: 'limiarFeFraturada', id });
    }
    if (c.pv === 0 && !c.caido && !c.pendenteFeFraturada) {
      c.caido = true;
      eventos.push({ tipo: 'caiu', id });
    }
    if (c.concentracao && c.caido) {
      c.concentracao = null;
      c.ca = caAtual(c);
    } else if (c.concentracao) {
      eventos.push({ tipo: 'concentracao', id, cd: Math.min(30, Math.max(10, Math.floor(n / 2))), magiaId: c.concentracao });
    }
    return { estado: e, eventos };
  }

  function adicionarCombatente(estado, ficha) {
    const e = copiar(estado);
    let n = 1;
    while (e.combatentes[`${ficha.id}-${n}`]) n += 1;
    const id = `${ficha.id}-${n}`;
    e.combatentes[id] = {
      id, fichaId: ficha.id, nome: `${ficha.nome} ${n}`, pv: ficha.pv, pvMax: ficha.pv, pvTemp: 0,
      caBase: ficha.ca, ca: ficha.ca, iniciativa: e.iniciado ? 20 : null, espacos: null, concentracao: null, usos: {},
      fase: 1, reacao: true, desvantagemProximoAtaque: false, caido: false, pendenteFeFraturada: false, condicoes: [],
    };
    const posCovil = e.ordem.indexOf('covil');
    if (e.iniciado) e.ordem.splice(posCovil >= 0 ? posCovil + 1 : e.ordem.length, 0, id);
    return e;
  }

  // Tira um inimigo da luta (só na preparação; Tobias não sai).
  function removerCombatente(estado, id) {
    if (estado.iniciado || id === 'tobias' || !estado.combatentes[id]) return estado;
    const e = copiar(estado);
    delete e.combatentes[id];
    return e;
  }

  function curar(estado, id, valor) {
    const n = numeroValido(valor);
    if (n === null || !estado.combatentes[id]) return estado;
    const e = copiar(estado);
    const c = e.combatentes[id];
    c.pv = Math.min(c.pvMax, c.pv + n);
    if (c.pv > 0) c.caido = false;
    return e;
  }

  function gastarEspaco(estado, id, circulo) {
    const c = estado.combatentes[id];
    if (!c || !c.espacos || !(c.espacos[circulo] > 0)) return estado;
    const e = copiar(estado);
    e.combatentes[id].espacos[circulo] -= 1;
    return e;
  }

  function definirConcentracao(estado, id, magiaId) {
    if (!estado.combatentes[id]) return estado;
    const e = copiar(estado);
    const c = e.combatentes[id];
    c.concentracao = magiaId || null;
    c.ca = caAtual(c);
    return e;
  }

  function marcarAbalado(estado, id, personagem) {
    const nome = String(personagem || '').trim();
    if (!estado.combatentes[id] || !nome || estado.abaladoPor.includes(nome)) return estado;
    const e = copiar(estado);
    e.abaladoPor.push(nome);
    e.combatentes[id].reacao = false;
    e.combatentes[id].desvantagemProximoAtaque = true;
    return e;
  }

  function consumirDesvantagem(estado, id) {
    if (!estado.combatentes[id] || !estado.combatentes[id].desvantagemProximoAtaque) return estado;
    const e = copiar(estado);
    e.combatentes[id].desvantagemProximoAtaque = false;
    return e;
  }

  // Condição num monstro. Uma condição que incapacita encerra a concentração (evento 'perdeuConcentracao').
  function adicionarCondicao(estado, id, condicao) {
    const c = estado.combatentes[id];
    if (!c || !CONDICOES[condicao] || (c.condicoes || []).includes(condicao)) return { estado, eventos: [] };
    const e = copiar(estado);
    const n = e.combatentes[id];
    n.condicoes = [...(n.condicoes || []), condicao];
    const eventos = [];
    if (CONDICOES[condicao].incapacita && n.concentracao) {
      eventos.push({ tipo: 'perdeuConcentracao', id, magiaId: n.concentracao });
      n.concentracao = null;
      n.ca = caAtual(n);
    }
    if (CONDICOES[condicao].incapacita) n.reacao = false;
    return { estado: e, eventos };
  }

  function removerCondicao(estado, id, condicao) {
    const c = estado.combatentes[id];
    if (!c || !(c.condicoes || []).includes(condicao)) return estado;
    const e = copiar(estado);
    e.combatentes[id].condicoes = c.condicoes.filter((x) => x !== condicao);
    return e;
  }

  // Ataca com desvantagem? (abalado ou uma condição que dá desvantagem)
  function atacaComDesvantagem(c) {
    return !!c.desvantagemProximoAtaque || (c.condicoes || []).some((x) => CONDICOES[x] && CONDICOES[x].desvantagemAtaque);
  }

  // Ações de covil já usadas nesta rodada.
  function covisUsados(estado) {
    const u = estado.covilUsado;
    return u && u.rodada === estado.rodada ? u.ids : [];
  }

  function usarCovil(estado, covilId) {
    const e = copiar(estado);
    const ids = covisUsados(estado);
    e.covilUsado = { rodada: e.rodada, ids: ids.includes(covilId) ? ids : [...ids, covilId] };
    return e;
  }

  function responder(estado, chave, valor) {
    const e = copiar(estado);
    e.perguntas[chave] = valor;
    return e;
  }

  function alternarSussurro(estado) {
    const e = copiar(estado);
    e.sussurro = !e.sussurro;
    return e;
  }

  const api = {
    criarCombate, definirIniciativa, iniciar, proximoTurno, turnoAnterior,
    aplicarDano, curar, gastarEspaco, adicionarCombatente, removerCombatente, definirConcentracao, marcarAbalado,
    consumirDesvantagem, responder, alternarSussurro, numeroValido, copiar,
    sincronizar, adicionarCondicao, removerCondicao, atacaComDesvantagem, covisUsados, usarCovil,
  };
  globalThis.AssistenteRC = globalThis.AssistenteRC || {};
  globalThis.AssistenteRC.estado = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
