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

  const COVIL = ['covil', 'lair'];

  // Para cada entrada (na ordem do Roll20), diz qual combatente ela é: um id, 'covil' ou null (jogador).
  // Com exigirValor, entradas sem iniciativa numérica ficam null.
  function casarEntradas(combatentes, entradas, exigirValor = false) {
    const lista = Object.values(combatentes);
    const ids = entradas.map(() => null);
    const tomados = new Set();
    const validas = entradas.map((e, i) => ({ i, nome: normalizar(e.nome), valor: numero(e.valor) }))
      .filter((e) => e.nome && (!exigirValor || e.valor !== null));
    const restantes = [];
    // 1) nome igual ao do painel ("Cultista 2"); "Covil"/"Lair" é a ação de covil
    for (const e of validas) {
      if (COVIL.some((p) => e.nome.includes(p))) { ids[e.i] = 'covil'; continue; }
      const c = lista.find((x) => normalizar(x.nome) === e.nome && !tomados.has(x.id));
      if (c) { ids[e.i] = c.id; tomados.add(c.id); } else restantes.push(e);
    }
    // 2) nome do Roll20 ("Raiz Sanguinolenta 3", "Dire Wolf 2"): o tipo vem das palavras e o número
    //    do fim do nome; sem número (ou número sem par no painel), vai para o próximo daquele tipo.
    const pendentes = [];
    for (const e of restantes) {
      const achado = TIPOS.find((t) => t.palavras.some((p) => e.nome.includes(p)));
      if (!achado) continue;
      const num = (e.nome.match(/(\d+)\s*$/) || [])[1];
      const id = achado.tipo === 'tobias' ? 'tobias' : `${achado.tipo}-${num}`;
      if ((num !== undefined || achado.tipo === 'tobias') && combatentes[id] && !tomados.has(id)) {
        ids[e.i] = id; tomados.add(id); continue;
      }
      pendentes.push({ ...e, tipo: achado.tipo });
    }
    for (const e of pendentes) {
      const c = lista.find((x) => x.fichaId === e.tipo && !tomados.has(x.id));
      if (c) { ids[e.i] = c.id; tomados.add(c.id); }
    }
    return ids;
  }

  // entradas: [{nome, valor}] na ordem da janela do Roll20. Devolve {idDoCombatente: valor}.
  function casarIniciativa(combatentes, entradas) {
    const ids = casarEntradas(combatentes, entradas, true);
    const resultado = {};
    ids.forEach((id, i) => { if (id && id !== 'covil') resultado[id] = numero(entradas[i].valor); });
    return resultado;
  }

  // Lê a janela de ordem de turnos aberta no Roll20 (#initiativewindow).
  function lerTrackerDom(doc = globalThis.document) {
    const itens = doc.querySelectorAll('#initiativewindow li');
    return [...itens].map((li) => ({
      nome: (li.querySelector('.name') || {}).textContent || '',
      valor: ((li.querySelector('.initiative') || {}).textContent || '').trim(),
      tokenId: li.getAttribute('data-tokenid') || null,
    }));
  }

  const api = { casarIniciativa, casarEntradas, lerTrackerDom, normalizar, numero };
  globalThis.AssistenteRC = globalThis.AssistenteRC || {};
  globalThis.AssistenteRC.iniciativa = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
