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

  const CHAVE_POS = 'assistente-posicao';

  function salvarPosicao(pos) {
    try {
      if (temChrome()) chrome.storage.local.set({ [CHAVE_POS]: pos });
      else localStorage.setItem(CHAVE_POS, JSON.stringify(pos));
    } catch (_) { /* posição só nesta visita */ }
  }

  function carregarPosicao() {
    return new Promise((resolve) => {
      try {
        if (temChrome()) chrome.storage.local.get(CHAVE_POS, (r) => resolve((r && r[CHAVE_POS]) || null));
        else resolve(JSON.parse(localStorage.getItem(CHAVE_POS) || 'null'));
      } catch (_) { resolve(null); }
    });
  }

  // Ligações dos botões às ações das fichas do Roll20. Ficam separadas da luta: "Recomeçar" não apaga.
  const CHAVE_VINC = 'assistente-vinculos';

  function salvarVinculos(v) {
    try {
      if (temChrome()) chrome.storage.local.set({ [CHAVE_VINC]: v });
      else localStorage.setItem(CHAVE_VINC, JSON.stringify(v));
    } catch (_) { /* ligações só nesta visita */ }
  }

  function carregarVinculos() {
    return new Promise((resolve) => {
      try {
        if (temChrome()) chrome.storage.local.get(CHAVE_VINC, (r) => resolve((r && r[CHAVE_VINC]) || null));
        else resolve(JSON.parse(localStorage.getItem(CHAVE_VINC) || 'null'));
      } catch (_) { resolve(null); }
    });
  }

  // Preferências do mestre (seguir o Roll20, barra de PV). "Recomeçar" não apaga.
  const CHAVE_PREF = 'assistente-preferencias';

  function salvarPreferencias(v) {
    try {
      if (temChrome()) chrome.storage.local.set({ [CHAVE_PREF]: v });
      else localStorage.setItem(CHAVE_PREF, JSON.stringify(v));
    } catch (_) { /* só nesta visita */ }
  }

  function carregarPreferencias() {
    return new Promise((resolve) => {
      try {
        if (temChrome()) chrome.storage.local.get(CHAVE_PREF, (r) => resolve((r && r[CHAVE_PREF]) || null));
        else resolve(JSON.parse(localStorage.getItem(CHAVE_PREF) || 'null'));
      } catch (_) { resolve(null); }
    });
  }

  globalThis.AssistenteRC = globalThis.AssistenteRC || {};
  globalThis.AssistenteRC.armazenamento = {
    salvar, carregar, limpar, salvarPosicao, carregarPosicao, salvarVinculos, carregarVinculos,
    salvarPreferencias, carregarPreferencias,
  };
})();
