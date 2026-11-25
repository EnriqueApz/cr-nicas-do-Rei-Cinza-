const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../src/roll20/chat.js');
const dados = require('../src/dados/m01c06-tobias.js');

const maca = dados.fichas.tobias.acoes.maca;
const mg = dados.fichas.tobias.magias;

test('montarAtaque com sussurro', () => {
  assert.equal(C.montarAtaque('Tobias', maca, { sussurro: true }),
    '/w gm &{template:default} {{name=Tobias — Maça Sacrílega}} {{Ataque=[[1d20+4]]}}');
});

test('montarAtaque para todos e com desvantagem', () => {
  assert.equal(C.montarAtaque('Tobias', maca, { sussurro: false, desvantagem: true }),
    '&{template:default} {{name=Tobias — Maça Sacrílega}} {{Ataque=[[2d20kl1+4]] (desvantagem)}}');
});

test('montarDano normal e crítico', () => {
  assert.equal(C.montarDano('Tobias', maca, { sussurro: true }),
    '/w gm &{template:default} {{name=Tobias — Maça Sacrílega}} {{Dano=[[1d6+1]] concussão + [[2d6]] necrótico}}');
  assert.equal(C.montarDano('Tobias', maca, { sussurro: true, critico: true }),
    '/w gm &{template:default} {{name=Tobias — Maça Sacrílega (crítico)}} {{Dano=[[2d6+1]] concussão + [[4d6]] necrótico}}');
});

test('montarDano inclui efeito extra', () => {
  const mordida = dados.fichas.lobo.acoes.mordida;
  assert.match(C.montarDano('Lobo 1', mordida, { sussurro: true }),
    /\{\{Efeito=O alvo faz salvaguarda de Força CD 12 ou cai Derrubado\.\}\}$/);
});

test('montarMagia com salvaguarda e com ataque', () => {
  assert.equal(C.montarMagia('Tobias', mg.espiritosGuardioes, { sussurro: true }),
    `/w gm &{template:default} {{name=Tobias — Espíritos Guardiões}} {{CD=13 Sabedoria}} {{Efeito=${mg.espiritosGuardioes.efeito}}}`);
  assert.match(C.montarMagia('Tobias', mg.armaEspiritual, { sussurro: false }),
    /^&\{template:default\} \{\{name=Tobias — Arma Espiritual\}\} \{\{Ataque=\[\[1d20\+5\]\]\}\}/);
});

test('montarDanoMagia com metade se passar', () => {
  assert.equal(C.montarDanoMagia('Tobias', mg.espiritosGuardioes, { sussurro: true }),
    '/w gm &{template:default} {{name=Tobias — Espíritos Guardiões}} {{Dano=[[3d8]] necrótico (metade se passar)}}');
});

test('montarCura e montarCovil', () => {
  assert.equal(C.montarCura('Tobias', 'Fé Fraturada', '3d8+4', { sussurro: true }),
    '/w gm &{template:default} {{name=Tobias — Fé Fraturada}} {{Cura=[[3d8+4]]}}');
  const pulso = dados.fichas.tobias.covil.pulso;
  assert.equal(C.montarCovil(pulso, 2, { sussurro: true }),
    `/w gm &{template:default} {{name=Covil — Pulso da Raiz-Mãe}} {{CD=13 Constituição}} {{Dano=[[3d6]] necrótico}} {{Efeito=${pulso.efeito}}}`);
});

test('nenhuma mensagem contém marca da extensão', () => {
  const msgs = [];
  for (const f of Object.values(dados.fichas)) {
    for (const a of Object.values(f.acoes)) {
      msgs.push(C.montarAtaque(f.nome, a, { sussurro: false }), C.montarDano(f.nome, a, { sussurro: false, critico: true }));
    }
    for (const m of Object.values(f.magias || {})) {
      msgs.push(C.montarMagia(f.nome, m, { sussurro: false }));
      if (m.dano) msgs.push(C.montarDanoMagia(f.nome, m, { sussurro: false }));
    }
    for (const cv of Object.values(f.covil || {})) msgs.push(C.montarCovil(cv, 1, { sussurro: false }));
  }
  for (const m of msgs) {
    assert.doesNotMatch(m, /assistente|extens/i);
    assert.doesNotMatch(m, /RC/);
  }
});
