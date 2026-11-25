const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/motor/estado.js');
const T = require('../src/motor/taticas.js');
const dados = require('../src/dados/m01c06-tobias.js');

function combate(opcoes = {}) {
  let e = E.criarCombate(dados, { jogadores: 4, chegada: 'normal', ritualCompleto: false, ...opcoes });
  for (const id of Object.keys(e.combatentes)) e = E.definirIniciativa(e, id, 10);
  e = E.definirIniciativa(e, 'tobias', 15);
  return E.iniciar(e);
}
const titulos = (s) => s.jogadas.map((j) => j.titulo);

test('surpresa rodada 1 sem jogadas', () => {
  const s = T.sugerir(combate({ chegada: 'surpresa' }), 'tobias');
  assert.deepEqual(s.jogadas, []);
  assert.ok(s.avisos.includes('Pego de surpresa: Tobias perde esta rodada, hesitando.'));
});

test('rodada 1 sugere Escudo + Chama e a fala', () => {
  const s = T.sugerir(combate(), 'tobias');
  assert.equal(s.jogadas[0].titulo, 'Escudo da Fé (ação bônus) + Chama Sagrada');
  assert.match(s.fala, /Vocês não deviam ter vindo/);
});

test('rodada 1 preparado: Escudo já ativo, só Chama', () => {
  const s = T.sugerir(combate({ chegada: 'preparado' }), 'tobias');
  assert.equal(s.jogadas[0].titulo, 'Chama Sagrada');
  assert.ok(s.avisos.includes('Concentração ativa: Escudo da Fé'));
});

test('fase 2 sugere Espíritos Guardiões primeiro', () => {
  let e = combate();
  e.rodada = 3;
  e.combatentes.tobias.fase = 2;
  const s = T.sugerir(e, 'tobias');
  assert.equal(s.jogadas[0].titulo, 'Espíritos Guardiões');
  assert.ok(s.avisos.includes('Fase 2: a entidade fala com as vozes dos filhos.'));
});

test('grupo ferido na fase 1 sugere Arma Espiritual', () => {
  let e = combate();
  e.rodada = 2;
  e = E.responder(e, 'grupoFerido', true);
  const s = T.sugerir(e, 'tobias');
  assert.equal(s.jogadas[0].titulo, 'Arma Espiritual (ação bônus) + 2× Maça Sacrílega');
  assert.ok(!titulos(s).includes('Espíritos Guardiões'));
});

test('grupo inteiro na fase 1 sugere Espíritos Guardiões', () => {
  let e = combate();
  e.rodada = 2;
  e = E.responder(e, 'grupoFerido', false);
  assert.equal(T.sugerir(e, 'tobias').jogadas[0].titulo, 'Espíritos Guardiões');
});

test('sem resposta sobre o grupo devolve pergunta', () => {
  const e = combate();
  e.rodada = 2;
  const s = T.sugerir(e, 'tobias');
  assert.deepEqual(s.pergunta, { chave: 'grupoFerido', texto: 'O grupo está ferido?' });
});

test('com concentração ativa não sugere outra sem aviso de troca', () => {
  let e = combate({ chegada: 'preparado' });
  e.rodada = 3;
  e.combatentes.tobias.fase = 2;
  const s = T.sugerir(e, 'tobias');
  const eg = s.jogadas.find((j) => j.titulo === 'Espíritos Guardiões');
  assert.equal(eg.aviso, 'Trocar a concentração: encerra Escudo da Fé.');
});

test('sem espaço de 3º círculo não sugere Espíritos Guardiões', () => {
  let e = combate();
  e.rodada = 3;
  e.combatentes.tobias.fase = 2;
  e.combatentes.tobias.espacos[3] = 0;
  assert.ok(!titulos(T.sugerir(e, 'tobias')).includes('Espíritos Guardiões'));
});

test('maça sempre presente como última opção', () => {
  for (const ajuste of [{}, { rodada: 2, ferido: true }, { rodada: 3, fase: 2 }]) {
    let e = combate();
    if (ajuste.rodada) e.rodada = ajuste.rodada;
    if (ajuste.ferido) e = E.responder(e, 'grupoFerido', true);
    if (ajuste.fase) e.combatentes.tobias.fase = 2;
    const s = T.sugerir(e, 'tobias');
    assert.ok(s.jogadas.length <= 3);
    assert.equal(s.jogadas.at(-1).titulo, '2× Maça Sacrílega no mais ferido');
  }
});

test('cultista caído: Curar Ferimentos nunca é a primeira', () => {
  let e = combate();
  e.rodada = 2;
  e = E.responder(e, 'grupoFerido', true);
  e = E.aplicarDano(e, 'cultista-1', 30).estado;
  const s = T.sugerir(e, 'tobias');
  const i = titulos(s).indexOf('Curar Ferimentos no cultista');
  assert.ok(i >= 1);
});

test('abalado aparece nos avisos', () => {
  let e = combate();
  e = E.marcarAbalado(e, 'tobias', 'Clérigo');
  assert.ok(T.sugerir(e, 'tobias').avisos.includes('Abalado: sem reação e desvantagem no próximo ataque'));
});

test('capangas: ataque com botões e aviso', () => {
  const e = combate();
  const c = T.sugerir(e, 'cultista-1');
  assert.equal(c.jogadas[0].titulo, 'Adaga Ritual');
  assert.deepEqual(c.jogadas[0].botoes.map((b) => b.kind), ['ataque', 'dano', 'danoCritico']);
  assert.ok(c.avisos.includes('Proteja Tobias: fique entre o grupo e ele.'));
  const r = T.sugerir(e, 'raiz-1');
  assert.ok(r.avisos.includes('Agarre quem corre até Tobias ou até a raiz-mãe.'));
  const l = T.sugerir(combate({ jogadores: 5 }), 'lobo-1');
  assert.ok(l.avisos.includes('Derrube a linha de frente para os cultistas atacarem com vantagem.'));
});

test('covil fase 1 = 1, fase 2 = 2 diferentes', () => {
  const e = combate();
  assert.equal(T.sugerirCovil(e).quantidade, 1);
  e.combatentes.tobias.fase = 2;
  const c = T.sugerirCovil(e);
  assert.equal(c.quantidade, 2);
  assert.equal(c.sugestoes.length, 2);
  assert.notEqual(c.sugestoes[0].covilId, c.sugestoes[1].covilId);
});

test('covil: broto com poucas raízes, pulso com muitas', () => {
  let e = combate();
  e = E.aplicarDano(e, 'raiz-1', 20).estado;
  assert.equal(T.sugerirCovil(e).sugestoes[0].covilId, 'broto');
  assert.equal(T.sugerirCovil(combate()).sugestoes[0].covilId, 'pulso');
});

test('broto some com 4 raízes de pé', () => {
  const c = T.sugerirCovil(combate({ jogadores: 5 }));
  assert.ok(!c.todas.includes('broto'));
  assert.ok(c.todas.includes('raizesQuePrendem'));
});

function noLimiar(opcoes = {}) {
  const e = combate(opcoes);
  return E.aplicarDano(e, 'tobias', 60).estado; // 105 → 45
}

test('fé fraturada com reação: fase 2, uso 0, precisaRolarCura', () => {
  const r = T.resolverFeFraturada(noLimiar(), true);
  const t = r.estado.combatentes.tobias;
  assert.equal(t.fase, 2);
  assert.equal(t.usos.feFraturada, 0);
  assert.equal(t.reacao, false);
  assert.equal(t.pendenteFeFraturada, false);
  assert.equal(r.precisaRolarCura, true);
});

test('fé fraturada abalado: fase 2, sem cura, mensagem exata', () => {
  let e = combate();
  e = E.marcarAbalado(e, 'tobias', 'Mago');
  e = E.aplicarDano(e, 'tobias', 60).estado;
  const r = T.resolverFeFraturada(e, true);
  assert.equal(r.estado.combatentes.tobias.fase, 2);
  assert.equal(r.precisaRolarCura, false);
  assert.equal(r.estado.combatentes.tobias.pv, 45);
  assert.equal(r.mensagem, 'Sem reação (abalado): não recupera os 18 PV, mas entra na Fase 2.');
});

test('fé fraturada recusada a 0 PV: Tobias cai', () => {
  const e = E.aplicarDano(combate(), 'tobias', 200).estado;
  const r = T.resolverFeFraturada(e, false);
  assert.equal(r.estado.combatentes.tobias.caido, true);
  assert.equal(r.caiu, true);
});

test('broto conta as raízes que brotaram', () => {
  let e = combate();
  e = E.adicionarCombatente(e, dados.fichas.raiz);
  e = E.adicionarCombatente(e, dados.fichas.raiz);
  assert.ok(!T.sugerirCovil(e).todas.includes('broto'));
});
