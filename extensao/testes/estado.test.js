const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/motor/estado.js');
const dados = require('../src/dados/m01c06-tobias.js');

const contar = (est, fichaId) =>
  Object.values(est.combatentes).filter((c) => c.fichaId === fichaId).length;

test('criarCombate 4 jogadores', () => {
  const e = E.criarCombate(dados, { jogadores: 4, chegada: 'normal', ritualCompleto: false });
  const t = e.combatentes.tobias;
  assert.equal(t.pv, 105);
  assert.equal(t.pvMax, 105);
  assert.equal(t.ca, 16);
  assert.equal(contar(e, 'tobias'), 1);
  assert.equal(contar(e, 'cultista'), 2);
  assert.equal(contar(e, 'raiz'), 2);
  assert.equal(contar(e, 'lobo'), 0);
  assert.equal(e.sussurro, true);
  assert.equal(e.combatentes['cultista-1'].nome, 'Cultista 1');
});

test('criarCombate 5 jogadores', () => {
  const e = E.criarCombate(dados, { jogadores: 5, chegada: 'normal', ritualCompleto: false });
  assert.equal(e.combatentes.tobias.pv, 125);
  assert.equal(contar(e, 'raiz'), 4);
  assert.equal(contar(e, 'lobo'), 1);
  assert.equal(contar(e, 'cultista'), 2);
});

test('preparado', () => {
  const e = E.criarCombate(dados, { jogadores: 4, chegada: 'preparado', ritualCompleto: false });
  const t = e.combatentes.tobias;
  assert.equal(t.ca, 18);
  assert.equal(t.pv, 110);
  assert.equal(t.pvMax, 110);
  assert.equal(t.concentracao, 'escudoDaFe');
  assert.deepEqual(t.espacos, { 1: 3, 2: 2, 3: 2 });
  assert.equal(contar(e, 'cultista'), 4);
});

test('ritual completo', () => {
  const e = E.criarCombate(dados, { jogadores: 4, chegada: 'normal', ritualCompleto: true });
  assert.equal(e.combatentes.tobias.pvTemp, 15);
});

test('iniciar ordena por iniciativa e põe covil em 20', () => {
  let e = E.criarCombate(dados, { jogadores: 4, chegada: 'normal', ritualCompleto: false });
  for (const id of Object.keys(e.combatentes)) e = E.definirIniciativa(e, id, 1);
  e = E.definirIniciativa(e, 'tobias', 12);
  e = E.definirIniciativa(e, 'cultista-1', 22);
  e = E.definirIniciativa(e, 'raiz-1', 5);
  e = E.iniciar(e);
  assert.deepEqual(e.ordem.slice(0, 4), ['cultista-1', 'covil', 'tobias', 'raiz-1']);
  assert.equal(e.rodada, 1);
  assert.equal(e.indice, 0);
  assert.equal(e.iniciado, true);
});

test('proximoTurno pula caídos e vira a rodada', () => {
  let e = E.criarCombate(dados, { jogadores: 4, chegada: 'normal', ritualCompleto: false });
  const valores = { 'cultista-1': 22, tobias: 12, 'cultista-2': 10, 'raiz-1': 5, 'raiz-2': 3 };
  for (const [id, v] of Object.entries(valores)) e = E.definirIniciativa(e, id, v);
  e = E.iniciar(e);
  // ordem: cultista-1, covil, tobias, cultista-2, raiz-1, raiz-2
  e = E.aplicarDano(e, 'cultista-2', 50).estado;
  e = E.proximoTurno(e); // covil
  assert.equal(e.ordem[e.indice], 'covil');
  e = E.proximoTurno(e); // tobias
  e = E.proximoTurno(e); // pula cultista-2
  assert.equal(e.ordem[e.indice], 'raiz-1');
  e = E.proximoTurno(e); // raiz-2
  e = E.proximoTurno(e); // nova rodada
  assert.equal(e.rodada, 2);
  assert.equal(e.ordem[e.indice], 'cultista-1');
});

test('pvTemp absorve primeiro', () => {
  const e0 = E.criarCombate(dados, { jogadores: 4, chegada: 'normal', ritualCompleto: true });
  const { estado, eventos } = E.aplicarDano(e0, 'tobias', 20);
  assert.equal(estado.combatentes.tobias.pvTemp, 0);
  assert.equal(estado.combatentes.tobias.pv, 100);
  assert.deepEqual(eventos, []);
});

function tobiasCom(pv, jogadores = 4) {
  const e = E.criarCombate(dados, { jogadores, chegada: 'normal', ritualCompleto: false });
  e.combatentes.tobias.pv = pv;
  return e;
}

test('limiar 4 jogadores', () => {
  const r1 = E.aplicarDano(tobiasCom(60), 'tobias', 8);
  assert.deepEqual(r1.eventos, [{ tipo: 'limiarFeFraturada', id: 'tobias' }]);
  const r2 = E.aplicarDano(tobiasCom(60), 'tobias', 7);
  assert.deepEqual(r2.eventos, []);
});

test('limiar 5 jogadores', () => {
  const r = E.aplicarDano(tobiasCom(70, 5), 'tobias', 8);
  assert.deepEqual(r.eventos, [{ tipo: 'limiarFeFraturada', id: 'tobias' }]);
});

test('dano que pula o limiar até 0', () => {
  const e0 = E.criarCombate(dados, { jogadores: 4, chegada: 'normal', ritualCompleto: false });
  const { estado, eventos } = E.aplicarDano(e0, 'tobias', 110);
  assert.deepEqual(eventos, [{ tipo: 'limiarFeFraturada', id: 'tobias' }]);
  assert.equal(estado.combatentes.tobias.pv, 0);
  assert.equal(estado.combatentes.tobias.caido, false);
});

test('caiu gera evento para capanga e para Tobias sem Fé Fraturada', () => {
  const e0 = E.criarCombate(dados, { jogadores: 4, chegada: 'normal', ritualCompleto: false });
  const r1 = E.aplicarDano(e0, 'cultista-1', 30);
  assert.deepEqual(r1.eventos, [{ tipo: 'caiu', id: 'cultista-1' }]);
  assert.equal(r1.estado.combatentes['cultista-1'].caido, true);
  const e1 = tobiasCom(10);
  e1.combatentes.tobias.usos.feFraturada = 0;
  const r2 = E.aplicarDano(e1, 'tobias', 20);
  assert.deepEqual(r2.eventos, [{ tipo: 'caiu', id: 'tobias' }]);
});

test('dano inválido', () => {
  const e0 = E.criarCombate(dados, { jogadores: 4, chegada: 'normal', ritualCompleto: false });
  for (const v of [NaN, -5, 'abc', '', undefined]) {
    const r = E.aplicarDano(e0, 'tobias', v);
    assert.deepEqual(r.estado, e0);
    assert.deepEqual(r.eventos, []);
  }
});

test('curar não passa do máximo e levanta caído', () => {
  let e = E.criarCombate(dados, { jogadores: 4, chegada: 'normal', ritualCompleto: false });
  e = E.aplicarDano(e, 'cultista-1', 30).estado;
  e = E.curar(e, 'cultista-1', 100);
  assert.equal(e.combatentes['cultista-1'].pv, 22);
  assert.equal(e.combatentes['cultista-1'].caido, false);
  assert.deepEqual(E.curar(e, 'cultista-1', 'abc'), e);
});

test('espaço, concentração e abalado', () => {
  let e = E.criarCombate(dados, { jogadores: 4, chegada: 'normal', ritualCompleto: false });
  e = E.gastarEspaco(e, 'tobias', 3);
  assert.equal(e.combatentes.tobias.espacos[3], 1);
  e = E.gastarEspaco(e, 'tobias', 3);
  e = E.gastarEspaco(e, 'tobias', 3);
  assert.equal(e.combatentes.tobias.espacos[3], 0);
  e = E.definirConcentracao(e, 'tobias', 'espiritosGuardioes');
  assert.equal(e.combatentes.tobias.concentracao, 'espiritosGuardioes');
  e = E.marcarAbalado(e, 'tobias', 'Clérigo');
  assert.equal(e.combatentes.tobias.reacao, false);
  assert.equal(e.combatentes.tobias.desvantagemProximoAtaque, true);
  assert.deepEqual(e.abaladoPor, ['Clérigo']);
  const repetido = E.marcarAbalado(e, 'tobias', 'Clérigo');
  assert.deepEqual(repetido.abaladoPor, ['Clérigo']);
});

test('reação volta no turno de Tobias', () => {
  let e = E.criarCombate(dados, { jogadores: 4, chegada: 'normal', ritualCompleto: false });
  for (const id of Object.keys(e.combatentes)) e = E.definirIniciativa(e, id, 1);
  e = E.definirIniciativa(e, 'tobias', 25);
  e = E.iniciar(e); // tobias primeiro
  e = E.marcarAbalado(e, 'tobias', 'Mago');
  while (e.ordem[e.indice] !== 'tobias' || e.rodada === 1) e = E.proximoTurno(e);
  assert.equal(e.combatentes.tobias.reacao, true);
});

test('iniciar trava jogadores e variação', () => {
  let e = E.criarCombate(dados, { jogadores: 5, chegada: 'preparado', ritualCompleto: false });
  e = E.iniciar(e);
  assert.equal(e.iniciado, true);
  assert.equal(e.jogadores, 5);
  assert.equal(e.chegada, 'preparado');
});

test('adicionarCombatente cria a Raiz seguinte logo depois do covil', () => {
  let e = E.criarCombate(dados, { jogadores: 4, chegada: 'normal', ritualCompleto: false });
  for (const id of Object.keys(e.combatentes)) e = E.definirIniciativa(e, id, 8);
  e = E.definirIniciativa(e, 'tobias', 22);
  e = E.iniciar(e);
  e = E.adicionarCombatente(e, dados.fichas.raiz);
  const nova = e.combatentes['raiz-3'];
  assert.equal(nova.nome, 'Raiz 3');
  assert.equal(nova.pv, 13);
  assert.equal(nova.ca, 12);
  assert.equal(e.ordem[e.ordem.indexOf('covil') + 1], 'raiz-3');
});

test('dano com concentração pede teste de Constituição', () => {
  let e = E.criarCombate(dados, { jogadores: 4, chegada: 'preparado', ritualCompleto: false });
  let r = E.aplicarDano(e, 'tobias', 22);
  assert.deepEqual(r.eventos, [{ tipo: 'concentracao', id: 'tobias', cd: 11, magiaId: 'escudoDaFe' }]);
  r = E.aplicarDano(r.estado, 'tobias', 8);
  assert.deepEqual(r.eventos, [{ tipo: 'concentracao', id: 'tobias', cd: 10, magiaId: 'escudoDaFe' }]);
  const sem = E.aplicarDano(E.criarCombate(dados, { jogadores: 4, chegada: 'normal', ritualCompleto: false }), 'tobias', 8);
  assert.deepEqual(sem.eventos, []);
});
