// Diagnòstic real de la càrrega dels personatges 3D de l'estació d'anomalies.
// Inicia un servidor estàtic local, obre la pàgina amb Chromium i informa de
// l'estat real de la càrrega de Naruto i Terrifying (console, errors de xarxa).
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/appjet/browser/node_modules/playwright');

const PORT = 8123;
const BASE = `http://127.0.0.1:${PORT}/`;

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
  cwd: process.cwd(),
  stdio: 'ignore',
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let exitCode = 1;

try {
  // Espera el servidor
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(BASE);
      if (res.ok) break;
    } catch {}
    await sleep(100);
  }

  const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });

  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  page.on('requestfailed', (r) => logs.push(`[reqfailed] ${r.url()} ${r.failure()?.errorText}`));
  page.on('response', (r) => {
    const u = r.url();
    if (/\.glb$|vendor\/three/.test(u)) logs.push(`[http ${r.status()}] ${u}`);
  });

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.click('.nav-link[data-route="juegos"]');
  await page.click('button[data-mode="anomaly"]');
  const t0 = Date.now();
  await page.click('#launch-game');
  await page.waitForSelector('#anom-start');

  // Instrumenta l'estat intern observable des del DOM
  let enabled = false;
  for (let i = 0; i < 120; i++) {
    enabled = await page.evaluate(() => {
      const b = document.querySelector('#anom-start');
      return !!(b && !b.disabled);
    });
    if (enabled) break;
    await sleep(500);
  }
  const elapsed = Date.now() - t0;

  const state = await page.evaluate(() => {
    const b = document.querySelector('#anom-start');
    const canvas = document.querySelector('#anom-game canvas');
    return {
      buttonText: b?.textContent?.trim(),
      buttonDisabled: !!b?.disabled,
      message: document.querySelector('#anom-message')?.textContent?.trim(),
      errorBox: document.querySelector('#anom-model-error')?.textContent?.trim() || null,
      canvas: canvas ? { w: canvas.width, h: canvas.height } : null,
    };
  });

  console.log('=== TEMPS FINS AL BOTÓ HABILITAT (ms):', elapsed, '===');
  console.log('=== ESTAT DOM ===');
  console.log(JSON.stringify(state, null, 2));
  console.log('=== CONSOLE ===');
  console.log(logs.join('\n') || '(cap missatge)');

  const ok = enabled && /COMENÇAR/.test(state.buttonText || '');
  console.log('=== RESULTAT:', ok ? 'CARREGA COMPLETA' : 'CARREGA NO COMPLETADA', '===');
  exitCode = ok ? 0 : 1;

  if (ok) {
    await page.click('#anom-start');
    await sleep(1500);
    const after = await page.evaluate(() => ({
      overlay: document.querySelector('#anom-overlay')?.style.display,
      room: document.querySelector('#anom-room')?.textContent,
      visible: (() => {
        const c = document.querySelector('#anom-game canvas');
        return !!c && c.width > 0;
      })(),
    }));
    console.log('=== DESPRÉS DE COMENÇAR ===');
    console.log(JSON.stringify(after, null, 2));
  }

  await browser.close();
} catch (err) {
  console.error('ERROR DIAGNÒSTIC:', err?.message || err);
  exitCode = 1;
} finally {
  server.kill('SIGKILL');
}

process.exit(exitCode);
