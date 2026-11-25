// Testes das correções pedidas pela revisão. Rodar: node testes/correcoes.e2e.js
const { chromium } = require('playwright');
const path = require('path');
const assert = require('node:assert/strict');
const manifest = require('../manifest.json');

const raiz = path.join(__dirname, '..');
const pagina = (nome) => 'file://' + path.join(__dirname, 'paginas', nome);

async function abrir(context, nome) {
  const page = await context.newPage();
  await page.goto(pagina(nome));
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await injetar(page);
  return page;
}
async function injetar(page) {
  for (const css of manifest.content_scripts[0].css) await page.addStyleTag({ path: path.join(raiz, css) });
  for (const js of manifest.content_scripts[0].js) await page.addScriptTag({ path: path.join(raiz, js) });
  await page.waitForSelector('#assistente-rc input[data-ini]');
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

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1400, height: 700 } });
  let passou = 0;
  const caso = async (nome, fn) => { await fn(); passou++; console.log('ok -', nome); };

  await caso('abalado no limiar: entra na Fase 2 sem perguntar', async () => {
    const p = await abrir(context, 'roll20-falso.html');
    await comecar(p);
    await p.fill('#assistente-rc [data-a="nome-abalo"]', 'Clérigo');
    await p.click('#assistente-rc [data-a="abalar"]');
    await dano(p, 'tobias', 70);
    assert.equal(!!(await p.$('#assistente-rc [data-a="fe-sim"]')), false);
    assert.match(await texto(p, '.arc-info'), /Sem reação \(abalado\): não recupera os 18 PV, mas entra na Fase 2\./);
    assert.match(await texto(p, '.arc-cartao'), /Fase 2/);
    await p.close();
  });

  await caso('Broto cria uma Raiz nova na lista', async () => {
    const p = await abrir(context, 'roll20-falso.html');
    await p.selectOption('#assistente-rc [data-a="jogadores"]', '4');
    await comecar(p);
    await p.click('#assistente-rc [data-a="proximo"]'); // covil
    await p.click('#assistente-rc .arc-covil button[data-covil="broto"]');
    assert.ok(await p.$('#assistente-rc [data-pv="raiz-3"]'));
    await p.close();
  });

  await caso('a ficha continua aberta e a rolagem não volta ao topo depois de um clique', async () => {
    const p = await abrir(context, 'roll20-falso.html');
    await comecar(p);
    assert.match(await texto(p, '.arc-cartao'), /Espaços: 1º 3 · 2º 2 · 3º 2/);
    await p.click('#assistente-rc .arc-ficha summary');
    await p.$eval('#assistente-rc .arc-corpo', (el) => { el.scrollTop = 300; });
    const antes = await p.$eval('#assistente-rc .arc-corpo', (el) => el.scrollTop);
    assert.ok(antes > 0);
    await p.click('#assistente-rc .arc-ficha button[data-kind="magia"][data-magia="comando"]');
    assert.equal(await p.$eval('#assistente-rc .arc-ficha', (el) => el.open), true);
    assert.equal(await p.$eval('#assistente-rc .arc-corpo', (el) => el.scrollTop), antes);
    await p.close();
  });

  await caso('chat que não esvazia depois do envio: aparece a faixa vermelha', async () => {
    const p = await abrir(context, 'roll20-nao-limpa.html');
    await comecar(p);
    await p.click('#assistente-rc .arc-cartao button[data-kind="ataque"][data-acao="maca"]');
    await p.waitForSelector('#assistente-rc .arc-erro-chat', { timeout: 3000 });
    assert.match(await texto(p, '.arc-erro-chat'), /Não achei o chat do Roll20|não recebeu/);
    await p.close();
  });

  await caso('rascunho que o mestre digitou no chat volta depois do envio', async () => {
    const p = await abrir(context, 'roll20-falso.html');
    await comecar(p);
    await p.fill('#textchat-input textarea', 'rascunho do mestre');
    await p.click('#assistente-rc .arc-cartao button[data-kind="ataque"][data-acao="maca"]');
    await p.waitForTimeout(500);
    assert.equal(await p.inputValue('#textchat-input textarea'), 'rascunho do mestre');
    await p.close();
  });

  await caso('a posição arrastada continua depois de recarregar', async () => {
    const p = await abrir(context, 'roll20-falso.html');
    const topo = await p.$('#assistente-rc .arc-topo b');
    const caixa = await topo.boundingBox();
    await p.mouse.move(caixa.x + 5, caixa.y + 5);
    await p.mouse.down();
    await p.mouse.move(200, 150, { steps: 5 });
    await p.mouse.up();
    const antes = await p.$eval('#assistente-rc', (el) => el.getBoundingClientRect().left);
    await p.reload();
    await injetar(p);
    await p.waitForTimeout(200);
    const depois = await p.$eval('#assistente-rc', (el) => el.getBoundingClientRect().left);
    assert.ok(Math.abs(antes - depois) < 2, `${antes} vs ${depois}`);
    await p.close();
  });

  await caso('dano em Tobias concentrado lembra o teste de concentração', async () => {
    const p = await abrir(context, 'roll20-falso.html');
    await comecar(p);
    await dano(p, 'tobias', 22);
    assert.match(await texto(p, '.arc-info'), /Teste de concentração: Constituição CD 11 \(Escudo da Fé\)/);
    assert.match(await texto(p, '.arc-lista'), /conc\.: Escudo da Fé/);
    await p.close();
  });

  await caso('editar a luta: tirar 2 cultistas e pôr mais 1 lobo', async () => {
    const p = await abrir(context, 'roll20-falso.html');
    await p.click('#assistente-rc [data-a="remover"][data-id="cultista-4"]');
    await p.click('#assistente-rc [data-a="remover"][data-id="cultista-3"]');
    await p.click('#assistente-rc [data-a="adicionar"][data-ficha="lobo"]');
    const nomes = await p.$$eval('#assistente-rc .arc-prep .arc-nome', (els) => els.map((e) => e.textContent.trim()));
    assert.deepEqual(nomes, ['Tobias', 'Cultista 1', 'Cultista 2', 'Raiz 1', 'Raiz 2', 'Raiz 3', 'Raiz 4', 'Lobo 1', 'Lobo 2']);
    assert.equal(await p.$$eval('#assistente-rc [data-a="remover"][data-id="tobias"]', (els) => els.length), 0);
    await p.reload();
    await injetar(p);
    assert.equal(await p.$$eval('#assistente-rc .arc-prep .arc-nome', (els) => els.length), 9);
    await comecar(p);
    assert.ok(await p.$('#assistente-rc [data-pv="lobo-2"]'));
    await p.close();
  });

  await browser.close();
  console.log(`# pass ${passou}`);
})().catch((e) => { console.error('not ok -', e.message); process.exit(1); });
