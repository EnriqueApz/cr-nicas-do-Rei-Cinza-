// Motor de estado do combate. Funções puras: recebem um estado e devolvem outro.
(function () {
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

  function pularInvalidos(e, direcao) {
    const n = e.ordem.length;
    for (let i = 0; i < n && invalido(e, e.ordem[e.indice]); i++) avancar(e, direcao);
    const id = e.ordem[e.indice];
    if (direcao > 0 && id !== 'covil' && e.combatentes[id]) e.combatentes[id].reacao = true;
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
    return { estado: e, eventos };
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
    aplicarDano, curar, gastarEspaco, definirConcentracao, marcarAbalado,
    consumirDesvantagem, responder, alternarSussurro, numeroValido, copiar,
  };
  globalThis.AssistenteRC = globalThis.AssistenteRC || {};
  globalThis.AssistenteRC.estado = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
