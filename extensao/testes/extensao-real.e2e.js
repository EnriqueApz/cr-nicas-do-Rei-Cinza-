// Carrega a extensão de verdade no Chromium e abre um "app.roll20.net/editor" falso (servido localmente).
// Rodar: node testes/extensao-real.e2e.js
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');
const assert = require('node:assert/strict');

(async () => {
  const ext = path.join(__dirname, '..');
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'perfil-assistente-'));
  const context = await chromium.launchPersistentContext(perfil, {
    headless: true,
    channel: 'chromium',
    args: [`--disable-extensions-except=${ext}`, `--load-extension=${ext}`],
  });
  const arquivo = process.argv[2] || 'roll20-falso.html';
  const html = fs.readFileSync(path.join(__dirname, 'paginas', arquivo), 'utf8');
  await context.route('https://app.roll20.net/**', (rota) => rota.fulfill({ contentType: 'text/html', body: html }));
  const page = await context.newPage();
  await page.goto('https://app.roll20.net/editor/');
  await page.waitForSelector('#assistente-rc input[data-ini]', { timeout: 15000 });
  for (const c of await page.$$('#assistente-rc input[data-ini]')) await c.fill('8');
  await page.fill('#assistente-rc input[data-ini="tobias"]', '22');
  await page.click('#assistente-rc [data-a="comecar"]');
  await page.click('#assistente-rc .arc-cartao button[data-kind="ataque"][data-acao="maca"]');
  await page.waitForTimeout(1500);
  const msgs = await page.$$eval('#mensagens li', (lis) => lis.map((l) => l.textContent));
  assert.ok(msgs.at(-1).startsWith('/w gm &{template:default} {{name=Tobias — Maça Sacrílega}}'));
  await context.close();
  console.log(`ok - extensão carregada no Chromium (${arquivo}): painel aparece e a rolagem chega ao chat`);
})().catch((e) => { console.error('not ok -', e.message); process.exit(1); });
