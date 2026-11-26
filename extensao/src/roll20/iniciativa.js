// Lê a ordem de turnos (Turn Order) do Roll20 e liga cada entrada a um monstro do painel.
(function () {
  const TIPOS = ['tobias', 'cultista', 'raiz', 'lobo'];

  const normalizar = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

  function numero(v) {
    const n = typeof v === 'string' ? Number(v.replace(',', '.').trim()) : v;
    return typeof n === 'number' && Number.isFinite(n) && String(v).trim() !== '' ? n : null;
  }

  // entradas: [{nome, valor}] na ordem da janela do Roll20. Devolve {idDoCombatente: valor}.
  function casarIniciativa(combatentes, entradas) {
    const lista = Object.values(combatentes);
    const resultado = {};
    const usadas = new Set();
    const validas = entradas.map((e, i) => ({ i, nome: normalizar(e.nome), valor: numero(e.valor) }))
      .filter((e) => e.valor !== null && e.nome);
    // 1) nome igual ao do painel ("Cultista 2")
    for (const e of validas) {
      const c = lista.find((x) => normalizar(x.nome) === e.nome && !(x.id in resultado));
      if (c) { resultado[c.id] = e.valor; usadas.add(e.i); }
    }
    // 2) nome genérico ("Cultista", "Raiz Sanguinolenta", "Tobias Greim"): próximo daquele tipo
    for (const e of validas) {
      if (usadas.has(e.i)) continue;
      const tipo = TIPOS.find((t) => e.nome.includes(t));
      if (!tipo) continue;
      const c = lista.find((x) => x.fichaId === tipo && !(x.id in resultado));
      if (c) { resultado[c.id] = e.valor; usadas.add(e.i); }
    }
    return resultado;
  }

  // Lê a janela de ordem de turnos aberta no Roll20 (#initiativewindow).
  function lerTrackerDom(doc = globalThis.document) {
    const itens = doc.querySelectorAll('#initiativewindow li');
    return [...itens].map((li) => ({
      nome: (li.querySelector('.name') || {}).textContent || '',
      valor: ((li.querySelector('.initiative') || {}).textContent || '').trim(),
    }));
  }

  const api = { casarIniciativa, lerTrackerDom, normalizar };
  globalThis.AssistenteRC = globalThis.AssistenteRC || {};
  globalThis.AssistenteRC.iniciativa = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
