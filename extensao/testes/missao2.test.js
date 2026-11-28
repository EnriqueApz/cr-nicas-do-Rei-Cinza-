const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/motor/estado.js');
const T = require('../src/motor/taticas.js');
const I = require('../src/roll20/iniciativa.js');
const R = require('../src/roll20/turnos.js');
const M2 = require('../src/dados/m02-sussurro.js');
const C = require('../src/roll20/chat.js');

const luta = (id, jogadores = 5) => E.criarCombate(M2[id], { jogadores });

test('cena 4: 6 rãs e 2 lodos com 5 jogadores, 5 e 1 com 4; sem covil', () => {
  const e5 = luta('m02c04');
  const ids5 = Object.keys(e5.combatentes);
  assert.equal(ids5.filter((i) => i.startsWith('ra-')).length, 6);
  assert.equal(ids5.filter((i) => i.startsWith('lodo-')).length, 2);
  const e4 = luta('m02c04', 4);
  assert.equal(Object.keys(e4.combatentes).length, 6);
  assert.equal(e5.chefeId, null);
  assert.equal(E.temCovil(e5), false);
  const ini = E.iniciar(e5);
  assert.ok(!ini.ordem.includes('covil'));
});

test('cena 5: o sussurro entra na iniciativa 20 e continua sem chefe', () => {
  let e = luta('m02c05');
  assert.equal(Object.keys(e.combatentes).length, 8);
  for (const id of Object.keys(e.combatentes)) e = E.definirIniciativa(e, id, 10);
  e = E.iniciar(e);
  assert.equal(e.ordem[0], 'covil');
  const cv = T.sugerirCovil(e);
  assert.deepEqual(cv.todas, ['sussurro']);
  assert.equal(cv.quantidade, 1);
});

test('cena 6: Sussurrador com 140 PV (5 jogadores) e 115 (4), único e protegido', () => {
  const e = luta('m02c06');
  const s = e.combatentes.sussurrador;
  assert.equal(s.pvMax, 140);
  assert.equal(luta('m02c06', 4).combatentes.sussurrador.pvMax, 115);
  assert.equal(e.chefeId, 'sussurrador');
  assert.equal(Object.keys(e.combatentes).filter((i) => i.startsWith('raiz-')).length, 5);
  assert.equal(Object.keys(e.combatentes).filter((i) => i.startsWith('serva-')).length, 2);
  assert.equal(E.removerCombatente(e, 'sussurrador'), e);
});

test('Submergir nas Raízes: uma vez, ao passar da metade', () => {
  const e = luta('m02c06');
  const r1 = E.aplicarDano(e, 'sussurrador', 60);
  assert.equal(r1.eventos.length, 0);
  const r2 = E.aplicarDano(r1.estado, 'sussurrador', 20);
  assert.deepEqual(r2.eventos.map((x) => x.tipo), ['submergiu']);
  assert.equal(r2.estado.combatentes.sussurrador.usos.submergir, 0);
  const r3 = E.aplicarDano(r2.estado, 'sussurrador', 10);
  assert.equal(r3.eventos.length, 0);
});

test('ritual de Ossian feito: não submerge', () => {
  let e = luta('m02c06');
  e = E.alternarRitualOssian(e, 'sussurrador');
  const r = E.aplicarDano(e, 'sussurrador', 80);
  assert.equal(r.eventos.length, 0);
  assert.ok(T.sugerir(r.estado, 'sussurrador').avisos[0].startsWith('Ritual de Ossian feito'));
});

test('táticas do Sussurrador: fala na rodada 1, Convocar Raízes e ataques', () => {
  let e = luta('m02c06');
  e = E.iniciar(e);
  const s = T.sugerir(e, 'sussurrador');
  assert.ok(s.fala.includes('Outro pedaço de mim'));
  assert.equal(s.jogadas.length, 2);
  assert.deepEqual(s.jogadas[0].botoes.map((b) => b.kind), ['magia', 'danoMagia']);
  assert.deepEqual(s.jogadas[1].botoes.map((b) => b.kind), ['ataque', 'dano', 'danoCritico']);
});

test('covil do Sussurrador: Broto nas rodadas 1 e 2, depois Voz querida; sem Broto no máximo', () => {
  let e = E.iniciar(luta('m02c06'));
  assert.equal(T.sugerirCovil(e).sugestoes[0].covilId, 'broto');
  e = { ...e, rodada: 3 };
  assert.equal(T.sugerirCovil(e).sugestoes[0].covilId, 'vozQuerida');
  for (let i = 0; i < 3; i++) e = E.adicionarCombatente(e, M2.m02c06.fichas.raiz);
  assert.ok(!T.sugerirCovil(e).todas.includes('broto'));
});

test('covil some quando o Sussurrador cai', () => {
  let e = luta('m02c06');
  for (const id of Object.keys(e.combatentes)) e = E.definirIniciativa(e, id, 10);
  e = E.iniciar(e);
  assert.equal(e.ordem[e.indice], 'covil');
  e = E.aplicarDano(e, 'sussurrador', 200).estado;
  assert.equal(E.covilAtivo(e), false);
});

test('capangas da Missão 2: rã, lodo e serva com suas jogadas', () => {
  const e4 = luta('m02c04');
  const ra = T.sugerir(e4, 'ra-1');
  assert.equal(ra.jogadas.length, 2);
  assert.equal(ra.jogadas[1].botoes[0].magiaId, 'engolir');
  const lodo = T.sugerir(e4, 'lodo-1');
  assert.equal(lodo.jogadas[0].botoes[0].magiaId, 'cobrir');
  const lodoFerido = E.aplicarDano(e4, 'lodo-1', 30).estado;
  assert.ok(T.sugerir(lodoFerido, 'lodo-1').avisos.some((a) => a.includes('metade')));
  const serva = T.sugerir(luta('m02c05'), 'serva-1');
  assert.deepEqual(serva.jogadas[0].botoes.map((b) => b.acaoId), ['prender', 'galho', 'galho', 'galho']);
});

test('nomes dos tokens do Roll20 da Missão 2 casam com o painel', () => {
  const e = luta('m02c06');
  const ids = I.casarEntradas(e.combatentes, [
    { nome: 'O Sussurrador' }, { nome: 'Serva de Raízes 2' }, { nome: 'Raiz Sanguinolenta 3' },
    { nome: 'Raiz Grossa 1' }, { nome: 'Casulo 1 (Petre)' }, { nome: 'Raiz Sanguinolenta 6 (reserva)' },
  ]);
  assert.deepEqual(ids, ['sussurrador', 'serva-2', 'raiz-3', null, null, 'raiz-1']);
  const e4 = luta('m02c04');
  assert.deepEqual(I.casarEntradas(e4.combatentes, [{ nome: 'Rã Gigante Corrompida 4' }, { nome: 'Lodo Negro 2' }]), ['ra-4', 'lodo-2']);
});

test('seguir o Roll20: covil do Sussurrador ao passar da iniciativa 20', () => {
  let e = luta('m02c06');
  e = E.definirIniciativa(e, 'sussurrador', 12);
  e = E.iniciar(e);
  let r = R.passo(null, [{ nome: 'Bento', valor: '22' }, { nome: 'O Sussurrador', valor: '12' }], e);
  r = R.passo(r.memoria, [{ nome: 'O Sussurrador', valor: '12' }, { nome: 'Bento', valor: '22' }], e);
  assert.equal(r.acao.tipo, 'covil');
});

test('Convocar Raízes rola a recarga no chat', () => {
  const msg = C.montarMagia('O Sussurrador', M2.m02c06.fichas.sussurrador.magias.convocar, { sussurro: true });
  assert.ok(msg.startsWith('/w gm '));
  assert.ok(msg.includes('{{Recarga=[[1d6]]'));
  assert.ok(msg.includes('{{CD=13 Destreza}}'));
});
