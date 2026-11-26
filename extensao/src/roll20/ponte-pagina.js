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
      return { nome, valor: t.pr };
    });
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
    if (d.tipo !== 'enviar') return;
    let via;
    try { via = enviar(String(d.texto)); } catch (e) { via = 'erro: ' + e.message; }
    window.postMessage({ origem: 'assistente-rc-ponte', tipo: 'resultado', via }, '*');
  });
})();
