// Lê a ordem de turnos (Turn Order) do Roll20 e liga cada entrada a um monstro do painel.
(function () {
  // Palavras que identificam cada tipo no nome do token (a ordem importa: "Cultista da Raiz" é cultista).
  const TIPOS = [
    { tipo: 'tobias', palavras: ['tobias'] },
    { tipo: 'cultista', palavras: ['cultista', 'cultist'] },
    { tipo: 'lobo', palavras: ['lobo', 'wolf'] },
    { tipo: 'raiz', palavras: ['raiz', 'root'] },
  ];

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
    // 2) nome do Roll20 ("Raiz Sanguinolenta 3", "Dire Wolf 2"): o tipo vem das palavras e o número
    //    do fim do nome; sem número (ou número sem par no painel), vai para o próximo daquele tipo.
    const pendentes = [];
    for (const e of validas) {
      if (usadas.has(e.i)) continue;
      const achado = TIPOS.find((t) => t.palavras.some((p) => e.nome.includes(p)));
      if (!achado) continue;
      const num = (e.nome.match(/(\d+)\s*$/) || [])[1];
      const id = achado.tipo === 'tobias' ? 'tobias' : `${achado.tipo}-${num}`;
      if (num !== undefined || achado.tipo === 'tobias') {
        if (combatentes[id] && !(id in resultado)) { resultado[id] = e.valor; usadas.add(e.i); continue; }
      }
      pendentes.push({ ...e, tipo: achado.tipo });
    }
    for (const e of pendentes) {
      const c = lista.find((x) => x.fichaId === e.tipo && !(x.id in resultado));
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
