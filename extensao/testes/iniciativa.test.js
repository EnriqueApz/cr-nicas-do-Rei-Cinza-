const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/motor/estado.js');
const I = require('../src/roll20/iniciativa.js');
const dados = require('../src/dados/m01c06-tobias.js');

const combate = () => E.criarCombate(dados, { jogadores: 4, chegada: 'normal', ritualCompleto: false });

test('nomes iguais aos do painel', () => {
  const r = I.casarIniciativa(combate().combatentes, [
    { nome: 'Cultista 2', valor: 14 }, { nome: 'Raiz 1', valor: 3 },
  ]);
  assert.deepEqual(r, { 'cultista-2': 14, 'raiz-1': 3 });
});

test('nome genérico vai para o próximo daquele tipo, na ordem', () => {
  const r = I.casarIniciativa(combate().combatentes, [
    { nome: 'Cultista', valor: 9 }, { nome: 'cultista', valor: 17 }, { nome: 'Raiz Sanguinolenta', valor: 5 },
  ]);
  assert.deepEqual(r, { 'cultista-1': 9, 'cultista-2': 17, 'raiz-1': 5 });
});

test('Tobias Greim, acentos e maiúsculas', () => {
  const r = I.casarIniciativa(combate().combatentes, [{ nome: 'TOBIAS GREIM', valor: 22 }]);
  assert.deepEqual(r, { tobias: 22 });
});

test('jogadores e entradas sem número são ignorados', () => {
  const r = I.casarIniciativa(combate().combatentes, [
    { nome: 'Véspero Vaelorik', valor: 18 }, { nome: 'Cultista 1', valor: 'abc' }, { nome: 'Lobo', valor: 12 },
  ]);
  assert.deepEqual(r, {});
});

test('nome exato tem preferência sobre o genérico', () => {
  const r = I.casarIniciativa(combate().combatentes, [
    { nome: 'Cultista', valor: 9 }, { nome: 'Cultista 1', valor: 20 },
  ]);
  assert.deepEqual(r, { 'cultista-1': 20, 'cultista-2': 9 });
});
