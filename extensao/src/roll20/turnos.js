// Segue a ordem de turnos (Turn Order) do Roll20: o primeiro da lista é quem está na vez.
(function () {
  const I = (typeof module !== 'undefined') ? require('./iniciativa.js') : globalThis.AssistenteRC.iniciativa;

  // memoria: o que o painel viu na última leitura ({chave, pr}) ou null.
  // Devolve {memoria, acao}; acao é null quando nada mudou no Roll20.
  //   {tipo:'ir', id, novaRodada}       vez de um monstro do painel
  //   {tipo:'covil', novaRodada, depois} a vez passou da iniciativa 20: ação de covil antes de "depois"
  //   {tipo:'jogador', nome, novaRodada} vez de alguém que não está no painel
  //   {tipo:'caido', id, novaRodada}    vez de um monstro que já caiu
  function passo(memoria, entradas, estado) {
    if (!estado || !estado.iniciado || !Array.isArray(entradas) || !entradas.length) return { memoria, acao: null };
    const topo = entradas[0];
    const chave = `${topo.tokenId || ''}|${topo.nome || ''}|${topo.valor ?? ''}`;
    if (memoria && memoria.chave === chave) return { memoria, acao: null };
    const pr = I.numero(topo.valor);
    const nova = { chave, pr };
    const ids = I.casarEntradas(estado.combatentes, entradas);
    const id = ids[0];
    const antes = memoria ? memoria.pr : null;
    const novaRodada = antes !== null && pr !== null && pr > antes && id !== 'covil';
    const t = estado.combatentes.tobias;
    const covilVivo = t && !t.caido;
    const covilNaOrdem = ids.includes('covil');
    const cruzou20 = memoria && pr !== null && pr < 20 && antes !== null && (antes >= 20 || novaRodada);
    if (covilVivo && !covilNaOrdem && cruzou20) {
      return { memoria: nova, acao: { tipo: 'covil', novaRodada, depois: id && id !== 'covil' ? id : null, nome: topo.nome } };
    }
    if (id === 'covil') return { memoria: nova, acao: { tipo: 'covil', novaRodada: false, depois: null } };
    if (id) {
      const c = estado.combatentes[id];
      return { memoria: nova, acao: { tipo: c.caido ? 'caido' : 'ir', id, novaRodada } };
    }
    return { memoria: nova, acao: { tipo: 'jogador', nome: topo.nome || '?', novaRodada } };
  }

  const api = { passo };
  globalThis.AssistenteRC = globalThis.AssistenteRC || {};
  globalThis.AssistenteRC.turnos = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
