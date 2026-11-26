const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/motor/estado.js');
const I = require('../src/roll20/iniciativa.js');
const R = require('../src/roll20/turnos.js');
const dados = require('../src/dados/m01c06-tobias.js');

function luta() {
  let e = E.criarCombate(dados, { jogadores: 4, chegada: 'normal', ritualCompleto: false });
  for (const id of Object.keys(e.combatentes)) e = E.definirIniciativa(e, id, 5);
  e = E.definirIniciativa(e, 'tobias', 22);
  e = E.definirIniciativa(e, 'cultista-1', 15);
  return E.iniciar(e); // ordem: tobias, covil, cultista-1, cultista-2, raiz-1, raiz-2
}

test('casarEntradas: cada linha vira um id, covil ou null', () => {
  const ids = I.casarEntradas(luta().combatentes, [
    { nome: 'Tobias Greim', valor: 22 }, { nome: 'Covil', valor: 20 }, { nome: 'Véspero', valor: 18 },
    { nome: 'Cultista da Raiz 2', valor: 9 }, { nome: 'Lair Action', valor: 20 },
  ]);
  assert.deepEqual(ids, ['tobias', 'covil', null, 'cultista-2', 'covil']);
});

test('voltar e avançar não devolve a reação nem apaga o abalado', () => {
  let e = luta();
  e = E.proximoTurno(e); // covil
  e = E.proximoTurno(e); // cultista-1
  e = E.marcarAbalado(e, 'tobias', 'Clérigo');
  e = E.turnoAnterior(E.turnoAnterior(e)); // volta até Tobias
  e = E.proximoTurno(E.proximoTurno(e));
  assert.equal(e.combatentes.tobias.reacao, false);
  assert.equal(e.combatentes.tobias.desvantagemProximoAtaque, true);
  // na rodada seguinte, o turno dele devolve a reação
  while (e.ordem[e.indice] !== 'tobias') e = E.proximoTurno(e);
  assert.equal(e.rodada, 2);
  assert.equal(e.combatentes.tobias.reacao, true);
});

test('condição que incapacita encerra a concentração e tira a reação', () => {
  let e = luta();
  e = E.definirConcentracao(e, 'tobias', 'escudoDaFe');
  assert.equal(e.combatentes.tobias.ca, 18);
  const r = E.adicionarCondicao(e, 'tobias', 'paralisado');
  assert.deepEqual(r.eventos, [{ tipo: 'perdeuConcentracao', id: 'tobias', magiaId: 'escudoDaFe' }]);
  assert.equal(r.estado.combatentes.tobias.concentracao, null);
  assert.equal(r.estado.combatentes.tobias.ca, 16);
  assert.equal(r.estado.combatentes.tobias.reacao, false);
  assert.deepEqual(r.estado.combatentes.tobias.condicoes, ['paralisado']);
  assert.equal(E.adicionarCondicao(r.estado, 'tobias', 'paralisado').estado, r.estado, 'não repete');
  const sem = E.removerCondicao(r.estado, 'tobias', 'paralisado');
  assert.deepEqual(sem.combatentes.tobias.condicoes, []);
});

test('derrubado dá desvantagem no ataque; agarrado não', () => {
  const e = luta();
  assert.equal(E.atacaComDesvantagem(e.combatentes['cultista-1']), false);
  const ag = E.adicionarCondicao(e, 'cultista-1', 'agarrado').estado;
  assert.equal(E.atacaComDesvantagem(ag.combatentes['cultista-1']), false);
  const de = E.adicionarCondicao(ag, 'cultista-1', 'derrubado').estado;
  assert.equal(E.atacaComDesvantagem(de.combatentes['cultista-1']), true);
});

test('ações de covil usadas valem só para a rodada', () => {
  let e = luta();
  e = E.usarCovil(E.usarCovil(e, 'pulso'), 'pulso');
  assert.deepEqual(E.covisUsados(e), ['pulso']);
  while (e.rodada === 1) e = E.proximoTurno(e);
  assert.deepEqual(E.covisUsados(e), []);
});

test('sincronizar vai para o turno e conta a rodada', () => {
  let e = luta();
  e = E.sincronizar(e, { id: 'raiz-1' });
  assert.equal(e.ordem[e.indice], 'raiz-1');
  e = E.sincronizar(e, { id: 'tobias', novaRodada: true });
  assert.equal(e.rodada, 2);
  assert.equal(e.ordem[e.indice], 'tobias');
  e = E.sincronizar(e, { novaRodada: false });
  assert.equal(e.rodada, 2);
});

test('turnos: segue o primeiro da ordem do Roll20', () => {
  const e = luta();
  const ordem = (...nomes) => nomes.map(([nome, valor]) => ({ nome, valor }));
  let r = R.passo(null, ordem(['Tobias Greim', 22], ['Véspero', 18], ['Cultista da Raiz 1', 15]), e);
  assert.deepEqual(r.acao, { tipo: 'ir', id: 'tobias', novaRodada: false });
  assert.equal(R.passo(r.memoria, ordem(['Tobias Greim', 22], ['Véspero', 18]), e).acao, null, 'nada mudou');
  r = R.passo(r.memoria, ordem(['Véspero', 18], ['Cultista da Raiz 1', 15], ['Tobias Greim', 22]), e);
  assert.deepEqual(r.acao, { tipo: 'covil', novaRodada: false, depois: null, nome: 'Véspero' }, 'de 22 para 18 passa pelo 20');
  // de 18 para 15 não passa pelo 20
  r = R.passo(r.memoria, ordem(['Cultista da Raiz 1', 15], ['Tobias Greim', 22]), e);
  assert.deepEqual(r.acao, { tipo: 'ir', id: 'cultista-1', novaRodada: false });
  // volta ao topo: nova rodada
  r = R.passo(r.memoria, ordem(['Tobias Greim', 22], ['Cultista da Raiz 1', 15]), e);
  assert.deepEqual(r.acao, { tipo: 'ir', id: 'tobias', novaRodada: true });
});

test('turnos: passando da iniciativa 20 sem Covil na ordem, lembra a ação de covil', () => {
  const e = luta();
  const m = R.passo(null, [{ nome: 'Tobias Greim', valor: 22 }], e).memoria;
  const r = R.passo(m, [{ nome: 'Véspero', valor: 18 }, { nome: 'Tobias Greim', valor: 22 }], e);
  assert.deepEqual(r.acao, { tipo: 'covil', novaRodada: false, depois: null, nome: 'Véspero' });
  // com uma entrada "Covil" na ordem do Roll20, o covil vem dela
  const m2 = R.passo(null, [{ nome: 'Tobias Greim', valor: 22 }, { nome: 'Covil', valor: 20 }], e).memoria;
  const r2 = R.passo(m2, [{ nome: 'Covil', valor: 20 }, { nome: 'Tobias Greim', valor: 22 }], e);
  assert.equal(r2.acao.tipo, 'covil');
  const r3 = R.passo(r2.memoria, [{ nome: 'Véspero', valor: 18 }, { nome: 'Covil', valor: 20 }], e);
  assert.equal(r3.acao.tipo, 'jogador');
});

test('turnos: monstro caído', () => {
  let e = luta();
  e = E.aplicarDano(e, 'raiz-1', 99).estado;
  const r = R.passo({ chave: 'x', pr: 8 }, [{ nome: 'Raiz Sanguinolenta 1', valor: 5 }], e);
  assert.equal(r.acao.tipo, 'caido');
});

const F = require('../src/roll20/fichas.js');

test('fichas: PV e CA vêm da ficha; sem ficha, PV vem da barra do token', () => {
  assert.deepEqual(F.extrair({ barras: { 1: { valor: 40, max: 22 } }, personagem: { atributos: { hp: { atual: 40, max: 40 }, ac: { atual: '13' } } } }),
    { pv: 40, ca: 13, origemPv: 'ficha', origemCa: 'ficha' });
  assert.deepEqual(F.extrair({ barras: { 1: { valor: 18, max: '' }, 3: { valor: 30, max: 30 } }, personagem: null }),
    { pv: 30, ca: null, origemPv: 'token', origemCa: null });
  assert.deepEqual(F.extrair({ barras: {}, personagem: { atributos: { npc_ac: { atual: 11 }, hp_max: { atual: 59 } } } }),
    { pv: 59, ca: 11, origemPv: 'ficha', origemCa: 'ficha' });
});

test('aplicarFicha troca PV e CA antes da luta; Auxílio e Escudo continuam somando', () => {
  let e = E.criarCombate(dados, { jogadores: 5, chegada: 'preparado', ritualCompleto: false });
  e = E.aplicarFicha(e, 'tobias', { pv: 140, ca: 17 });
  const t = e.combatentes.tobias;
  assert.equal(t.pvMax, 145);
  assert.equal(t.pv, 145);
  assert.equal(t.ca, 19);
  assert.equal(t.origemPv, 'ficha');
  assert.equal(E.aplicarFicha(e, 'tobias', { pv: 140, ca: 17 }), e, 'sem mudança devolve o mesmo estado');
  // limiar da Fé Fraturada: metade de 140
  for (const id of Object.keys(e.combatentes)) e = E.definirIniciativa(e, id, 5);
  e = E.iniciar(e);
  assert.equal(E.aplicarFicha(e, 'tobias', { pv: 1 }), e, 'depois de começar não muda');
  let r = E.aplicarDano(e, 'tobias', 145 - 71);
  const fe = (ev) => ev.some((x) => x.tipo === 'limiarFeFraturada');
  assert.equal(fe(r.eventos), false, '71 PV: ainda acima do limiar de 70');
  r = E.aplicarDano(r.estado, 'tobias', 2);
  assert.equal(fe(r.eventos), true);
});

test('adicionarDoMapa: monstro fora da bíblia entra na luta', () => {
  let e = E.criarCombate(dados, { jogadores: 4, chegada: 'normal', ritualCompleto: false });
  e = E.adicionarDoMapa(e, { nome: 'Ogro', pv: 59, ca: 11, tokenId: 'o1', personagemId: 'ch9', chaveAcoes: 'p:ch9' });
  const o = e.combatentes['mapa-1'];
  assert.equal(o.nome, 'Ogro');
  assert.equal(o.pvMax, 59);
  assert.equal(o.ca, 11);
  assert.equal(E.adicionarDoMapa(e, { nome: 'Sem PV' }), e);
  for (const id of Object.keys(e.combatentes)) e = E.definirIniciativa(e, id, 5);
  e = E.iniciar(e);
  e = E.sincronizar(e, { id: 'mapa-1' });
  assert.deepEqual(require('../src/motor/taticas.js').sugerir(e, 'mapa-1'), { avisos: [], jogadas: [] });
  e = E.adicionarDoMapa(e, { nome: 'Ogro', pv: 59, ca: null });
  assert.equal(e.combatentes['mapa-2'].ca, 10);
  assert.ok(e.ordem.includes('mapa-2'));
});
