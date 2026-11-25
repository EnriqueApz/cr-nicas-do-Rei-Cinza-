// Teste do painel numa página que imita o chat do Roll20. Rodar: node testes/painel.e2e.js
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

const mensagens = (page) => page.$$eval('#mensagens li', (lis) => lis.map((l) => l.textContent));

async function preencherIniciativas(page) {
  const campos = await page.$$('#assistente-rc input[data-ini]');
  for (const c of campos) await c.fill('8');
  await page.fill('#assistente-rc input[data-ini="tobias"]', '22');
}

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  let passou = 0;
  const caso = async (nome, fn) => { await fn(); passou++; console.log('ok -', nome); };

  await page.goto(pagina('roll20-falso.html'));
  await injetar(page);

  await caso('o painel aparece com o padrão 5 jogadores e preparado', async () => {
    assert.equal(await page.inputValue('#assistente-rc [data-a="jogadores"]'), '5');
    assert.equal(await page.inputValue('#assistente-rc [data-a="chegada"]'), 'preparado');
  });

  await caso('começar a luta mostra a rodada 1 e o turno de Tobias', async () => {
    await preencherIniciativas(page);
    await page.click('#assistente-rc [data-a="comecar"]');
    await page.waitForSelector('#assistente-rc .arc-rodada');
    assert.match(await page.textContent('#assistente-rc .arc-rodada'), /Rodada 1/);
    assert.match(await page.textContent('#assistente-rc .arc-cartao'), /Tobias/);
  });

  await caso('ataque da Maça vai para o chat sussurrado', async () => {
    await page.click('#assistente-rc .arc-cartao button[data-kind="ataque"][data-acao="maca"]');
    const m = await mensagens(page);
    assert.ok(m.at(-1).startsWith('/w gm &{template:default} {{name=Tobias — Maça Sacrílega}}'), m.at(-1));
  });

  await caso('"Para todos" tira o /w gm', async () => {
    await page.click('#assistente-rc [data-a="sussurro"]');
    await page.click('#assistente-rc .arc-cartao button[data-kind="dano"][data-acao="maca"]');
    const m = await mensagens(page);
    assert.ok(m.at(-1).startsWith('&{template:default} {{name=Tobias — Maça Sacrílega}} {{Dano='), m.at(-1));
  });

  await caso('dano inválido é ignorado e 70 de dano oferece a Fé Fraturada', async () => {
    const pv = () => page.textContent('#assistente-rc [data-pv="tobias"]');
    const antes = await pv();
    await page.fill('#assistente-rc input[data-dano="tobias"]', 'abc');
    await page.click('#assistente-rc [data-a="aplicar-dano"][data-id="tobias"]');
    assert.equal(await pv(), antes);
    await page.fill('#assistente-rc input[data-dano="tobias"]', '70');
    await page.click('#assistente-rc [data-a="aplicar-dano"][data-id="tobias"]');
    assert.match(await pv(), /^60\/130/); // preparado com 5 jogadores: 125 + 5; limiar 63
    assert.match(await page.textContent('#assistente-rc .arc-fe'), /Usar a Fé Fraturada agora\?/);
  });

  await caso('usar a Fé Fraturada rola a cura e aplica os PV', async () => {
    await page.click('#assistente-rc [data-a="fe-sim"]');
    const m = await mensagens(page);
    assert.match(m.at(-1), /Tobias — Fé Fraturada\}\} \{\{Cura=\[\[3d8\+4\]\]\}\}/);
    await page.fill('#assistente-rc input[data-a="fe-pv"]', '18');
    await page.click('#assistente-rc [data-a="fe-aplicar"]');
    assert.match(await page.textContent('#assistente-rc [data-pv="tobias"]'), /^78\/130/);
  });

  await caso('recarregar a página mantém a luta', async () => {
    await page.click('#assistente-rc [data-a="proximo"]');
    const rodadaAntes = await page.textContent('#assistente-rc .arc-rodada');
    await page.reload();
    await injetar(page);
    assert.equal(await page.textContent('#assistente-rc .arc-rodada'), rodadaAntes);
    assert.match(await page.textContent('#assistente-rc [data-pv="tobias"]'), /^78\/130/);
  });

  await caso('passo de covil aparece na iniciativa 20', async () => {
    for (let i = 0; i < 20; i++) {
      if (await page.$('#assistente-rc .arc-covil')) break;
      await page.click('#assistente-rc [data-a="proximo"]');
    }
    assert.match(await page.textContent('#assistente-rc .arc-covil'), /ação de covil/i);
    assert.match(await page.textContent('#assistente-rc .arc-covil'), /Escolha 2/);
    await page.click('#assistente-rc .arc-covil button[data-covil="pulso"]');
    assert.match((await mensagens(page)).at(-1), /Covil — Pulso da Raiz-Mãe.*\[\[3d6\]\]/);
  });

  await caso('captura de tela do painel', async () => {
    await page.screenshot({ path: path.join(__dirname, 'painel.png') });
  });

  await caso('página com campo e sem botão envia com Enter', async () => {
    const p2 = await context.newPage();
    await p2.goto(pagina('roll20-sem-botao.html'));
    await p2.evaluate(() => localStorage.clear());
    await p2.reload();
    await injetar(p2);
    await preencherIniciativas(p2);
    await p2.click('#assistente-rc [data-a="comecar"]');
    await p2.click('#assistente-rc .arc-cartao button[data-kind="ataque"]');
    assert.equal((await mensagens(p2)).length, 1);
    await p2.close();
  });

  await caso('sem chat aparece a faixa vermelha', async () => {
    const p3 = await context.newPage();
    await p3.goto(pagina('sem-chat.html'));
    await p3.evaluate(() => localStorage.clear());
    await p3.reload();
    await injetar(p3);
    await preencherIniciativas(p3);
    await p3.click('#assistente-rc [data-a="comecar"]');
    await p3.click('#assistente-rc .arc-cartao button[data-kind="ataque"]');
    assert.match(await p3.textContent('#assistente-rc .arc-erro-chat'), /Não achei o chat do Roll20/);
    await p3.close();
  });

  await caso('nenhum erro de JavaScript na página', async () => {
    assert.deepEqual(erros, []);
  });

  await browser.close();
  console.log(`# pass ${passou}`);
})().catch((e) => { console.error('not ok -', e.message); process.exit(1); });
