// Condições (regras de 2024), com o lembrete que aparece no turno do monstro.
(function () {
  const condicoes = {
    agarrado: { nome: 'Agarrado', texto: 'Deslocamento 0. Desvantagem em ataques contra quem não for quem o agarra.' },
    derrubado: { nome: 'Derrubado', texto: 'Gasta metade do deslocamento para levantar. Ataca com desvantagem; corpo a corpo contra ele tem vantagem, à distância tem desvantagem.', desvantagemAtaque: true },
    impedido: { nome: 'Impedido', texto: 'Deslocamento 0. Ataca com desvantagem; ataques contra ele têm vantagem. Desvantagem em salvaguardas de Destreza.', desvantagemAtaque: true },
    amedrontado: { nome: 'Amedrontado', texto: 'Desvantagem em ataques e testes enquanto vê a fonte do medo. Não se aproxima dela.' },
    envenenado: { nome: 'Envenenado', texto: 'Desvantagem em ataques e testes de atributo.', desvantagemAtaque: true },
    cego: { nome: 'Cego', texto: 'Ataca com desvantagem; ataques contra ele têm vantagem. Falha em testes que dependem de visão.', desvantagemAtaque: true },
    paralisado: { nome: 'Paralisado', texto: 'Não age, não se move, não fala. Falha em salvaguardas de Força e Destreza. Ataques contra ele têm vantagem; corpo a corpo a até 1,5 m é crítico. Se veio de magia, repete a salvaguarda no fim do turno.', incapacita: true },
    atordoado: { nome: 'Atordoado', texto: 'Não age e não reage. Falha em salvaguardas de Força e Destreza. Ataques contra ele têm vantagem.', incapacita: true },
    incapacitado: { nome: 'Incapacitado', texto: 'Não faz ações, ações bônus nem reações.', incapacita: true },
  };
  globalThis.AssistenteRC = globalThis.AssistenteRC || {};
  globalThis.AssistenteRC.condicoes = condicoes;
  if (typeof module !== 'undefined') module.exports = condicoes;
})();
