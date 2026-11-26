// Testes das novidades da 0.5: Roll20 vivo (vez, barras de PV), desfazer, condições, covil, teclas.
// Rodar: node testes/roll20.e2e.js
const { chromium } = require('playwright');
const path = require('path');
const assert = require('node:assert/strict');
const manifest = require('../manifest.json');

const raiz = path.join(__dirname, '..');
const pagina = (nome) => 'file://' + path.join(__dirname, 'paginas', nome);

async function abrir(context, nome = 'roll20-vivo.html') {
  const page = await context.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.erros = erros;
  await page.goto(pagina(nome));
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  for (const css of manifest.content_scripts[0].css) await page.addStyleTag({ path: path.join(raiz, css) });
  for (const cs of manifest.content_scripts) for (const js of cs.js) await page.addScriptTag({ path: path.join(raiz, js) });
  await page.waitForSelector('#assistente-rc input[data-ini]');
  return page;
}
async function comecar(page) {
  for (const c of await page.$$('#assistente-rc input[data-ini]')) await c.fill('8');
  await page.fill('#assistente-rc input[data-ini="tobias"]', '22');
  await page.click('#assistente-rc [data-a="comecar"]');
}
async function dano(page, id, valor) {
  await page.fill(`#assistente-rc input[data-dano="${id}"]`, String(valor));
  await page.click(`#assistente-rc [data-a="aplicar-dano"][data-id="${id}"]`);
}
const texto = (page, sel) => page.textContent(`#assistente-rc ${sel}`);
const ordem = (page, lista) => page.evaluate((l) => { window.ordem = l; }, lista);
const esperar = (page, ms = 1900) => page.waitForTimeout(ms);

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  let passou = 0;
  const caso = async (nome, fn) => { await fn(); passou++; console.log('ok -', nome); };

  await caso('teclas digitadas no painel não chegam aos atalhos do Roll20', async () => {
    const p = await abrir(context);
    await comecar(p);
    await p.click('#assistente-rc input[data-dano="cultista-1"]');
    await p.keyboard.type('12');
    await p.keyboard.press('Backspace');
    await p.keyboard.press('Delete');
    assert.deepEqual(await p.evaluate(() => window.teclasNoDocumento), []);
    await p.close();
  });

  await caso('Desfazer volta o dano aplicado', async () => {
    const p = await abrir(context);
    await comecar(p);
    await dano(p, 'cultista-1', 10);
    assert.equal(await texto(p, '[data-pv="cultista-1"]'), '12/22');
    await p.click('#assistente-rc [data-a="desfazer"]');
    assert.equal(await texto(p, '[data-pv="cultista-1"]'), '22/22');
    await p.close();
  });

  await caso('condição Derrubado: lembrete no turno e ataque com desvantagem', async () => {
    const p = await abrir(context);
    await comecar(p);
    await p.selectOption('#assistente-rc select[data-cond-alvo]', 'cultista-1');
    await p.selectOption('#assistente-rc select[data-cond-add]', 'derrubado');
    assert.match(await texto(p, '.arc-lista'), /Derrubado ×/);
    for (let i = 0; i < 12 && !/Turno: Cultista 1\b/.test(await texto(p, '.arc-corpo')); i++) await p.click('#assistente-rc [data-a="proximo"]');
    assert.match(await texto(p, '.arc-cartao'), /Derrubado: Gasta metade/);
    await p.click('#assistente-rc .arc-cartao button[data-kind="ataque"]');
    await esperar(p, 900);
    const msgs = await p.$$eval('#mensagens li', (l) => l.map((x) => x.textContent));
    assert.match(msgs.at(-1), /2d20kl1\+\d+\]\] \(desvantagem\)/);
    await p.click('#assistente-rc [data-a="tirar-cond"][data-id="cultista-1"]');
    assert.doesNotMatch(await texto(p, '.arc-lista'), /Derrubado ×/);
    await p.close();
  });

  await caso('Paralisado em Tobias encerra o Escudo da Fé', async () => {
    const p = await abrir(context);
    await comecar(p);
    await p.selectOption('#assistente-rc select[data-cond-alvo]', 'tobias');
    await p.selectOption('#assistente-rc select[data-cond-add]', 'paralisado');
    assert.match(await texto(p, '.arc-info'), /perdeu a concentração em Escudo da Fé/);
    assert.match(await texto(p, '.arc-cartao h3'), /CA 16/);
    await p.close();
  });

  await caso('ação de covil usada fica marcada; segunda ação na Fase 1 pergunta antes', async () => {
    const p = await abrir(context);
    await comecar(p);
    await p.click('#assistente-rc [data-a="proximo"]'); // covil
    await p.click('#assistente-rc .arc-covil button[data-covil="pulso"]');
    assert.match(await texto(p, '.arc-covil'), /já usada/);
    assert.match(await texto(p, '.arc-covil button[data-covil="pulso"]'), /✓/);
    let perguntou = false;
    p.once('dialog', (d) => { perguntou = true; d.dismiss(); });
    await p.click('#assistente-rc .arc-covil button[data-covil="raizesQuePrendem"]');
    assert.ok(perguntou);
    await p.close();
  });

  await caso('Fé Fraturada pendente esconde o cartão de Tobias', async () => {
    const p = await abrir(context);
    await comecar(p);
    await dano(p, 'tobias', 70);
    assert.match(await texto(p, '.arc-cartao'), /Responda primeiro à Fé Fraturada/);
    assert.equal(!!(await p.$('#assistente-rc .arc-cartao button[data-kind="ataque"]')), false);
    await p.close();
  });

  await caso('o painel segue a vez da ordem de turnos do Roll20', async () => {
    const p = await abrir(context);
    await comecar(p);
    await ordem(p, [{ id: 't1', pr: 22 }, { id: 'p1', pr: 18 }, { id: 'c2', pr: 8 }]);
    await esperar(p);
    assert.match(await texto(p, '.arc-cartao h3'), /Turno: Tobias/);
    await ordem(p, [{ id: 'p1', pr: 18 }, { id: 'c2', pr: 8 }, { id: 't1', pr: 22 }]);
    await esperar(p);
    assert.match(await texto(p, '.arc-covil h3'), /ação de covil/, 'de 22 para 18 passa pela iniciativa 20');
    await ordem(p, [{ id: 'c2', pr: 8 }, { id: 't1', pr: 22 }, { id: 'p1', pr: 18 }]);
    await esperar(p);
    assert.match(await texto(p, '.arc-cartao h3'), /Turno: Cultista 2/);
    await ordem(p, [{ id: 't1', pr: 22 }, { id: 'p1', pr: 18 }, { id: 'c2', pr: 8 }]);
    await esperar(p);
    assert.match(await texto(p, '.arc-rodada'), /Rodada 2/);
    await ordem(p, [{ id: 'p1', pr: 18 }, { id: 'c2', pr: 8 }, { id: 't1', pr: 22 }, { id: 'x', pr: 20, custom: 'Covil' }]);
    await esperar(p);
    assert.match(await texto(p, '.arc-vez h3'), /Vez de Véspero Vaelorik/);
    await p.close();
  });

  await caso('PV vai para a barra dos tokens; barra ligada à ficha não é mexida', async () => {
    const p = await abrir(context);
    await comecar(p);
    await esperar(p, 1200);
    const tk = (id) => p.evaluate((i) => window.tokens[i].attrs, id);
    assert.equal((await tk('c1')).bar1_value, 22, 'começo da luta corrige 40/22');
    assert.equal((await tk('t1')).bar1_value, 130);
    assert.equal((await tk('t1')).bar2_value, 18, 'a barra de CA fica como estava');
    assert.equal((await tk('p1')).bar1_value, 20, 'token de jogador não é mexido');
    await dano(p, 'cultista-1', 10);
    await esperar(p, 600);
    assert.equal((await tk('c1')).bar1_value, 12);
    assert.equal((await tk('w1')).bar3_value, 30);
    assert.match(await texto(p, '.arc-info'), /ligada à ficha/);
    await p.click('#assistente-rc [data-a="desfazer"]');
    await esperar(p, 600);
    assert.equal((await tk('c1')).bar1_value, 22, 'desfazer também volta a barra');
    assert.deepEqual(p.erros, []);
    await p.close();
  });

  await browser.close();
  console.log(`# pass ${passou}`);
})().catch((e) => { console.error('not ok -', e.message); process.exit(1); });
