// Ponto de entrada: monta o painel uma vez quando o editor do Roll20 carrega.
(function () {
  if (document.getElementById('assistente-rc')) return;
  globalThis.AssistenteRC.painel.montar(document.body);
})();
