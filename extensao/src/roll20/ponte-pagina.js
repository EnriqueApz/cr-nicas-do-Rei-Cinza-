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

  window.addEventListener('message', (ev) => {
    const d = ev.data;
    if (ev.source !== window || !d || d.origem !== 'assistente-rc' || d.tipo !== 'enviar') return;
    let via;
    try { via = enviar(String(d.texto)); } catch (e) { via = 'erro: ' + e.message; }
    window.postMessage({ origem: 'assistente-rc-ponte', tipo: 'resultado', via }, '*');
  });
})();
