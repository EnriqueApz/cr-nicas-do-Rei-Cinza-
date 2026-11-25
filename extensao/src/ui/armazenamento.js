// Guarda o combate: chrome.storage.local na extensão, localStorage na página de teste.
(function () {
  const CHAVE = 'assistente-m01c06';
  const temChrome = () => typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;

  function salvar(estado) {
    try {
      if (temChrome()) chrome.storage.local.set({ [CHAVE]: estado });
      else localStorage.setItem(CHAVE, JSON.stringify(estado));
    } catch (_) { /* sem armazenamento: a luta continua só na memória */ }
  }

  function carregar() {
    return new Promise((resolve) => {
      try {
        if (temChrome()) chrome.storage.local.get(CHAVE, (r) => resolve((r && r[CHAVE]) || null));
        else resolve(JSON.parse(localStorage.getItem(CHAVE) || 'null'));
      } catch (_) { resolve(null); }
    });
  }

  function limpar() {
    try {
      if (temChrome()) chrome.storage.local.remove(CHAVE);
      else localStorage.removeItem(CHAVE);
    } catch (_) { /* nada a limpar */ }
  }

  globalThis.AssistenteRC = globalThis.AssistenteRC || {};
  globalThis.AssistenteRC.armazenamento = { salvar, carregar, limpar };
})();
