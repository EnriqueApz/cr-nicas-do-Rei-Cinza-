// Teste de tela da Missão 2: escolher a luta, começar e rolar. Rodar: node testes/missao2.e2e.js
const { chromium } = require('playwright');
const path = require('path');
const assert = require('node:assert/strict');
const manifest = require('../manifest.json');

const raiz = path.join(__dirname, '..');
const pagina = (nome) => 'file://' + path.join(__dirname, 'paginas', nome);
const scripts = manifest.content_scripts[0].js;
const estilos = manifest.content_scripts[0].css;

async function injetar(page) {
  for (const css of estilos) await page.addStyleTag({ path: path.join(raiz, css) });
  for (const js of scripts) await page.addScriptTag({ path: path.join(raiz, js) });
  await page.waitForSelector('#assistente-rc');
}

const mensagens = async (page) => {
  await page.waitForTimeout(1000);
  return page.$$eval('#mensagens li', (lis) => lis.map((l) => l.textContent));
};

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('dialog', (d) => d.accept());
  let passou = 0;
  const caso = async (nome, fn) => { await fn(); passou++; console.log('ok -', nome); };

  await page.goto(pagina('roll20-falso.html'));
  await injetar(page);

  await caso('o seletor de luta lista as 4 lutas e começa na do Tobias', async () => {
    const opcoes = await page.$$eval('#assistente-rc [data-a="luta"] option', (os) => os.map((o) => o.value));
    assert.deepEqual(opcoes, ['m01c06', 'm02c04', 'm02c05', 'm02c06']);
    assert.equal(await page.inputValue('#assistente-rc [data-a="luta"]'), 'm01c06');
  });

  await caso('escolher a Cena 6 monta Sussurrador (140 PV), 5 raízes e 2 servas, sem "Chegada"', async () => {
    await page.selectOption('#assistente-rc [data-a="luta"]', 'm02c06');
    await page.waitForSelector('#assistente-rc input[data-ini="sussurrador"]');
    assert.equal(await page.$('#assistente-rc [data-a="chegada"]'), null);
    const texto = await page.textContent('#assistente-rc .arc-prep');
    assert.match(texto, /O Sussurrador\s*PV 140 · CA 14/);
    assert.equal((await page.$$('#assistente-rc input[data-ini^="raiz-"]')).length, 5);
    assert.equal((await page.$$('#assistente-rc input[data-ini^="serva-"]')).length, 2);
    assert.match(await page.textContent('#assistente-rc .arc-topo'), /O Sussurrador/);
  });

  await caso('começar: covil na iniciativa 20 sugere Broto; rolar Broto põe uma Raiz nova', async () => {
    for (const c of await page.$$('#assistente-rc input[data-ini]')) await c.fill('8');
    await page.fill('#assistente-rc input[data-ini="sussurrador"]', '12');
    await page.click('#assistente-rc [data-a="comecar"]');
    await page.waitForSelector('#assistente-rc .arc-covil');
    assert.match(await page.textContent('#assistente-rc .arc-covil'), /Sugestão: Broto/);
    await page.click('#assistente-rc .arc-covil button[data-covil="broto"]');
    const m = await mensagens(page);
    assert.ok(m.at(-1).includes('{{name=Covil — Broto}}'), m.at(-1));
    assert.match(await page.textContent('#assistente-rc .arc-lista'), /Raiz 6/);
  });

  await caso('turno do Sussurrador: fala, Convocar Raízes com recarga e Ataque de Raiz', async () => {
    await page.click('#assistente-rc [data-a="proximo"]'); // a Raiz que brotou age logo depois do covil
    assert.match(await page.textContent('#assistente-rc .arc-cartao'), /Turno: Raiz 6/);
    await page.click('#assistente-rc [data-a="proximo"]');
    await page.waitForSelector('#assistente-rc .arc-fala');
    assert.match(await page.textContent('#assistente-rc .arc-cartao'), /Turno: O Sussurrador/);
    await page.click('#assistente-rc .arc-cartao .arc-jogada button[data-kind="magia"][data-magia="convocar"]');
    let m = await mensagens(page);
    assert.ok(m.at(-1).includes('{{Recarga=[[1d6]]'), m.at(-1));
    await page.click('#assistente-rc .arc-cartao .arc-jogada button[data-kind="ataque"][data-acao="raiz"]');
    m = await mensagens(page);
    assert.ok(m.at(-1).startsWith('/w gm &{template:default} {{name=O Sussurrador — Ataque de Raiz}}'), m.at(-1));
  });

  await caso('80 de dano: avisa Submergir nas Raízes', async () => {
    await page.fill('#assistente-rc input[data-dano="sussurrador"]', '80');
    await page.click('#assistente-rc [data-a="aplicar-dano"][data-id="sussurrador"]');
    assert.match(await page.textContent('#assistente-rc .arc-info'), /afunda nas raízes/);
  });

  await caso('Ritual de Ossian marca e aparece como aviso', async () => {
    await page.click('#assistente-rc [data-a="ritual-ossian"]');
    assert.match(await page.textContent('#assistente-rc .arc-cartao'), /✓ Ritual de Ossian feito/);
  });

  await caso('Recomeçar e trocar para a Cena 4: rãs e lodo, sem covil', async () => {
    await page.click('#assistente-rc [data-a="recomecar"]');
    await page.waitForSelector('#assistente-rc [data-a="luta"]');
    await page.selectOption('#assistente-rc [data-a="luta"]', 'm02c04');
    await page.waitForSelector('#assistente-rc input[data-ini="lodo-2"]');
    for (const c of await page.$$('#assistente-rc input[data-ini]')) await c.fill('8');
    await page.click('#assistente-rc [data-a="comecar"]');
    await page.waitForSelector('#assistente-rc .arc-cartao');
    assert.match(await page.textContent('#assistente-rc .arc-cartao'), /Turno: Rã Gigante 1/);
    await page.click('#assistente-rc .arc-cartao .arc-jogada button[data-kind="ataque"][data-acao="mordida"]');
    const m = await mensagens(page);
    assert.ok(m.at(-1).includes('{{name=Rã Gigante 1 — Mordida}}'), m.at(-1));
  });

  await caso('recarregar a página mantém a luta da Missão 2', async () => {
    await page.reload();
    await injetar(page);
    await page.waitForSelector('#assistente-rc .arc-topo');
    assert.match(await page.textContent('#assistente-rc .arc-topo'), /Poço Escuro/);
  });

  await caso('nenhum erro de JavaScript na página', async () => {
    assert.deepEqual(erros, []);
  });

  console.log(`# pass ${passou}`);
  await browser.close();
})().catch((e) => { console.error('not ok -', e.message); process.exit(1); });
