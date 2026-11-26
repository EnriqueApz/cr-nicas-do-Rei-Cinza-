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
  for (const cs of manifest.content_scripts) for (const js of cs.js) await page.addScriptTag({ path: path.join(raiz, js) });
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
    await p.$eval('#assistente-rc .arc-ficha button[data-kind="magia"][data-magia="comando"]', (b) => b.scrollIntoView({ block: 'center' }));
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
    await p.waitForSelector('#assistente-rc .arc-erro-chat', { timeout: 5000 });
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

  await caso('Roll20 com mais de um botão: clica no primeiro, como o Beyond20', async () => {
    const p = await abrir(context, 'roll20-dois-botoes.html');
    await comecar(p);
    await p.click('#assistente-rc .arc-cartao button[data-kind="ataque"][data-acao="maca"]');
    await p.waitForTimeout(600);
    const m = await p.$$eval('#mensagens li', (lis) => lis.map((l) => l.textContent));
    assert.equal(m.length, 1);
    assert.equal(!!(await p.$('#assistente-rc .arc-erro-chat')), false);
    const diag = await p.evaluate(() => AssistenteRC.chat.diagnostico(document));
    assert.match(diag, /#textchat-input: sim/);
    assert.match(diag, /button.*Send/);
    await p.close();
  });

  await caso('a faixa vermelha tem o botão de diagnóstico', async () => {
    const p = await abrir(context, 'roll20-nao-limpa.html');
    await comecar(p);
    await p.click('#assistente-rc .arc-cartao button[data-kind="ataque"][data-acao="maca"]');
    await p.waitForSelector('#assistente-rc .arc-erro-chat [data-a="diagnostico"]', { timeout: 5000 });
    await p.close();
  });

  await caso('Roll20 que ignora cliques sintéticos: envia de dentro da página', async () => {
    const p = await abrir(context, 'roll20-so-pagina.html');
    await comecar(p);
    await p.click('#assistente-rc .arc-cartao button[data-kind="ataque"][data-acao="maca"]');
    await p.waitForTimeout(1500);
    const m = await p.$$eval('#mensagens li', (lis) => lis.map((l) => l.textContent));
    assert.equal(m.length, 1);
    assert.ok(m[0].startsWith('/w gm &{template:default} {{name=Tobias — Maça Sacrílega}}'));
    assert.equal(!!(await p.$('#assistente-rc .arc-erro-chat')), false);
    await p.close();
  });

  await caso('Roll20 real: envia pela página, não limpa o campo, e não aparece faixa vermelha', async () => {
    const p = await abrir(context, 'roll20-real.html');
    await comecar(p);
    await p.fill('#textchat-input textarea', 'rascunho');
    await p.click('#assistente-rc .arc-cartao button[data-kind="ataque"][data-acao="maca"]');
    await p.waitForTimeout(1500);
    const m = await p.$$eval('#mensagens li', (lis) => lis.map((l) => l.textContent));
    assert.equal(m.length, 1);
    assert.equal(!!(await p.$('#assistente-rc .arc-erro-chat')), false);
    assert.equal(await p.inputValue('#textchat-input textarea'), 'rascunho');
    await p.close();
  });

  await caso('ligar o ataque à ficha: o botão manda o comando da ficha', async () => {
    const p = await abrir(context, 'roll20-falso.html');
    const comando = '%{-P4l-PgK3XoGtj47Cqnm|repeating_npcaction("zDjG5RCxH", "action")}';
    p.once('dialog', (d) => d.accept(comando));
    await comecar(p);
    await p.click('#assistente-rc .arc-jogada [data-a="vincular"][data-chave="tobias:acao:maca"]');
    assert.match(await texto(p, '.arc-cartao'), /Ataque ✓ ficha/);
    await p.click('#assistente-rc .arc-jogada button[data-kind="ataque"][data-acao="maca"]');
    await p.waitForTimeout(1000);
    const m = await p.$$eval('#mensagens li', (lis) => lis.map((l) => l.textContent));
    assert.equal(m.at(-1), comando);
    // o dano sai pelos botões do quadro da ficha: o painel esconde os dele para essa ação
    assert.equal(await p.$$eval('#assistente-rc .arc-jogada button[data-kind="dano"][data-acao="maca"]', (els) => els.length), 0);
    // a ligação continua depois de recomeçar a luta
    p.once('dialog', (d) => d.accept());
    await p.click('#assistente-rc [data-a="recomecar"]');
    await comecar(p);
    await p.click('#assistente-rc .arc-jogada button[data-kind="ataque"][data-acao="maca"]');
    await p.waitForTimeout(1000);
    assert.equal((await p.$$eval('#mensagens li', (lis) => lis.map((l) => l.textContent))).at(-1), comando);
    await p.close();
  });

  await caso('ligação com texto errado é recusada', async () => {
    const p = await abrir(context, 'roll20-falso.html');
    p.once('dialog', (d) => d.accept('qualquer coisa'));
    await comecar(p);
    await p.click('#assistente-rc .arc-jogada [data-a="vincular"][data-chave="tobias:acao:maca"]');
    assert.match(await texto(p, '.arc-info'), /não parece um comando da ficha/);
    await p.close();
  });

  await caso('iniciativa da ordem de turnos do Roll20 vai sozinha para o painel', async () => {
    const p = await abrir(context, 'roll20-iniciativa-dom.html');
    await p.waitForFunction(() => document.querySelector('#assistente-rc input[data-ini="cultista-2"]').value === '9', null, { timeout: 5000 });
    assert.equal(await p.inputValue('#assistente-rc input[data-ini="tobias"]'), '22');
    assert.equal(await p.inputValue('#assistente-rc input[data-ini="cultista-1"]'), '14');
    // uma rolagem nova entra na ordem de turnos e aparece no painel
    await p.evaluate(() => {
      const li = document.createElement('li');
      li.innerHTML = '<span class="initiative">7</span><span class="name">Raiz 2</span>';
      document.querySelector('#initiativewindow ul').appendChild(li);
    });
    await p.waitForFunction(() => document.querySelector('#assistente-rc input[data-ini="raiz-2"]').value === '7', null, { timeout: 5000 });
    await p.close();
  });

  await caso('iniciativa lida do Campaign do Roll20 (pela ponte da página)', async () => {
    const p = await abrir(context, 'roll20-iniciativa-campaign.html');
    await p.click('#assistente-rc [data-a="puxar-iniciativa"]');
    await p.waitForFunction(() => document.querySelector('#assistente-rc input[data-ini="raiz-3"]').value === '6', null, { timeout: 5000 });
    assert.equal(await p.inputValue('#assistente-rc input[data-ini="tobias"]'), '21');
    assert.equal(await p.inputValue('#assistente-rc input[data-ini="lobo-1"]'), '15');
    await p.close();
  });

  await browser.close();
  console.log(`# pass ${passou}`);
})().catch((e) => { console.error('not ok -', e.message); process.exit(1); });
