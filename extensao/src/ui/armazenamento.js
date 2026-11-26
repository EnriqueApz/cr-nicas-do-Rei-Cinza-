// Guarda a luta e as preferências do painel no armazenamento do próprio Chrome
// (nas páginas de teste, que não são extensão, usa o da página).
(function () {
  const naExtensao = () => typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

  function gravar(chave, valor) {
    try {
      if (naExtensao()) chrome.storage.local.set({ [chave]: valor });
      else window.localStorage.setItem(chave, JSON.stringify(valor));
    } catch (_) { /* sem armazenamento: vale só nesta visita */ }
  }

  function ler(chave) {
    return new Promise((resolve) => {
      try {
        if (naExtensao()) chrome.storage.local.get(chave, (r) => resolve((r && r[chave]) || null));
        else resolve(JSON.parse(window.localStorage.getItem(chave) || 'null'));
      } catch (_) { resolve(null); }
    });
  }

  function apagar(chave) {
    try {
      if (naExtensao()) chrome.storage.local.remove(chave);
      else window.localStorage.removeItem(chave);
    } catch (_) { /* nada a apagar */ }
  }

  // Cada coisa guardada tem o seu nome. "Recomeçar luta" só apaga a luta.
  const LUTA = 'assistente-m01c06';
  const POSICAO = 'assistente-posicao';
  const LIGACOES = 'assistente-vinculos';
  const PREFERENCIAS = 'assistente-preferencias';

  globalThis.AssistenteRC = globalThis.AssistenteRC || {};
  globalThis.AssistenteRC.armazenamento = {
    salvar: (v) => gravar(LUTA, v),
    carregar: () => ler(LUTA),
    limpar: () => apagar(LUTA),
    salvarPosicao: (v) => gravar(POSICAO, v),
    carregarPosicao: () => ler(POSICAO),
    salvarVinculos: (v) => gravar(LIGACOES, v),
    carregarVinculos: () => ler(LIGACOES),
    salvarPreferencias: (v) => gravar(PREFERENCIAS, v),
    carregarPreferencias: () => ler(PREFERENCIAS),
  };
})();
