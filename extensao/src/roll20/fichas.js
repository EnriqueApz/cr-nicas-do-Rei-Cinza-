// Tira PV e CA do que a ponte leu de um token do Roll20 (barras do token + atributos da ficha).
(function () {
  const NOMES_PV = ['hp', 'npc_hp', 'hit_points', 'hitpoints', 'pv'];
  const NOMES_PV_MAX = ['hp_max', 'npc_hp_max', 'hit_points_max', 'hitpoints_max'];
  const NOMES_CA = ['ac', 'npc_ac', 'armor_class', 'armorclass', 'ca'];

  const num = (v) => {
    const n = typeof v === 'string' ? Number(v.trim()) : v;
    return typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  };

  // A barra de PV do token: a de maior valor máximo (a de CA, quando existe, tem máximo pequeno ou vazio).
  function barraDePv(barras) {
    let melhor = null;
    for (const i of [1, 2, 3]) {
      const b = barras && barras[i];
      const max = b ? num(b.max) : null;
      if (max && (!melhor || max > melhor.max)) melhor = { i, max, valor: num(b.valor) };
    }
    return melhor;
  }

  // lido: {barras: {1: {valor, max, link}, ...}, personagem: {atributos: {nome: {atual, max}}} | null}
  // Devolve {pv, ca, origemPv, origemCa}; pv/ca null quando não deu para ler.
  function extrair(lido) {
    const at = (lido && lido.personagem && lido.personagem.atributos) || {};
    const pega = (nomes, campo) => {
      for (const n of nomes) if (at[n]) { const v = num(at[n][campo]); if (v) return v; }
      return null;
    };
    let pv = pega(NOMES_PV, 'max') || pega(NOMES_PV_MAX, 'atual');
    let origemPv = pv ? 'ficha' : null;
    if (!pv) {
      const b = barraDePv(lido && lido.barras);
      if (b) { pv = b.max; origemPv = 'token'; }
    }
    const ca = pega(NOMES_CA, 'atual');
    return { pv, ca, origemPv, origemCa: ca ? 'ficha' : null };
  }

  const api = { extrair, barraDePv, NOMES_PV, NOMES_PV_MAX, NOMES_CA };
  globalThis.AssistenteRC = globalThis.AssistenteRC || {};
  globalThis.AssistenteRC.fichas = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
