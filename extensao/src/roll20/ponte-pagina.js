// Roda DENTRO da página do Roll20 (world: MAIN). O Roll20 ignora cliques feitos pela extensão,
// então o painel pede a esta ponte, por window.postMessage, para enviar usando o jQuery da própria página.
(function () {
  if (window.__assistenteRcPonte) return;
  window.__assistenteRcPonte = true;

  function enviar(texto) {
    const campo = document.querySelector('#textchat-input textarea');
    const $ = window.jQuery || window.$;
    if ($ && campo) {
      $(campo).val(texto);
      const botao = document.getElementById('chatSendBtn') || document.querySelector('#textchat-input button');
      if (botao) {
        $(botao).trigger('click');
        return 'jquery-clique';
      }
    }
    const d20 = window.d20;
    if (d20 && d20.textchat && typeof d20.textchat.doChatInput === 'function') {
      d20.textchat.doChatInput(texto);
      if (campo) campo.value = '';
      return 'd20';
    }
    return 'sem-jquery';
  }

  // Ordem de turnos pelo modelo interno do Roll20 (funciona mesmo com a janela Turn Order fechada).
  function lerIniciativa() {
    const C = window.Campaign;
    if (!C || typeof C.get !== 'function') return null;
    let ordem = C.get('turnorder');
    if (typeof ordem === 'string') ordem = ordem ? JSON.parse(ordem) : [];
    if (!Array.isArray(ordem)) return null;
    const pagina = typeof C.activePage === 'function' ? C.activePage() : null;
    return ordem.map((t) => {
      let nome = t.custom || '';
      if (!nome && t.id && pagina && pagina.thegraphics && typeof pagina.thegraphics.get === 'function') {
        const g = pagina.thegraphics.get(t.id);
        if (g && typeof g.get === 'function') nome = g.get('name') || '';
      }
      return { nome, valor: t.pr, tokenId: t.id || null };
    });
  }

  function paginaAtiva() {
    const C = window.Campaign;
    const p = C && typeof C.activePage === 'function' ? C.activePage() : null;
    return p && p.thegraphics ? p : null;
  }

  // Tokens com nome na página aberta: [{tokenId, nome}].
  function lerTokens() {
    const p = paginaAtiva();
    if (!p) return null;
    const lista = p.thegraphics.models || [];
    return lista.map((g) => ({ tokenId: g.id, nome: g.get('name') || '' })).filter((t) => t.nome);
  }

  // Escreve PV/PV máx. na barra do token. barra: 1, 2, 3 ou 'auto' (a barra com o maior máximo,
  // que é a de PV: a de CA, quando existe, tem máximo pequeno ou vazio).
  function escreverPv({ tokenId, pv, pvMax, barra, permitirLigada }) {
    const p = paginaAtiva();
    const g = p && tokenId ? p.thegraphics.get(tokenId) : null;
    if (!g) return { ok: false, motivo: 'sem-token' };
    let n = Number(barra);
    if (![1, 2, 3].includes(n)) {
      const maximos = [1, 2, 3].map((i) => ({ i, max: Number(g.get(`bar${i}_max`)) || 0 }));
      const melhor = maximos.sort((a, b) => b.max - a.max)[0];
      if (!melhor.max) return { ok: false, motivo: 'sem-barra' };
      n = melhor.i;
    }
    // Barra ligada a um atributo da ficha: vários tokens da mesma ficha mudariam juntos.
    if (!permitirLigada && g.get(`bar${n}_link`)) return { ok: false, motivo: 'ligada' };
    const mudanca = { [`bar${n}_value`]: pv, [`bar${n}_max`]: pvMax };
    if (typeof g.save === 'function') g.save(mudanca); else g.set(mudanca);
    return { ok: true, barra: n };
  }

  window.addEventListener('message', (ev) => {
    const d = ev.data;
    if (ev.source !== window || !d || d.origem !== 'assistente-rc') return;
    if (d.tipo === 'iniciativa') {
      let entradas = null;
      try { entradas = lerIniciativa(); } catch (_) { entradas = null; }
      window.postMessage({ origem: 'assistente-rc-ponte', tipo: 'iniciativa-resultado', entradas }, '*');
      return;
    }
    if (d.tipo === 'tokens') {
      let tokens = null;
      try { tokens = lerTokens(); } catch (_) { tokens = null; }
      window.postMessage({ origem: 'assistente-rc-ponte', tipo: 'tokens-resultado', pedido: d.pedido, tokens }, '*');
      return;
    }
    if (d.tipo === 'pv') {
      let r;
      try { r = escreverPv(d); } catch (e) { r = { ok: false, motivo: 'erro: ' + e.message }; }
      window.postMessage({ origem: 'assistente-rc-ponte', tipo: 'pv-resultado', pedido: d.pedido, tokenId: d.tokenId, ...r }, '*');
      return;
    }
    if (d.tipo !== 'enviar') return;
    let via;
    try { via = enviar(String(d.texto)); } catch (e) { via = 'erro: ' + e.message; }
    window.postMessage({ origem: 'assistente-rc-ponte', tipo: 'resultado', via }, '*');
  });
})();
