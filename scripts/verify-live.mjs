// Verificació EN VIU del desplegament: CSP, càrrega real dels personatges i renderitzat.
// Complementa scripts/verify-anomaly.mjs (que corre en local sense servidor express, per tant sense CSP).
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/appjet/browser/node_modules/playwright');

const BASE = process.env.LIVE_URL || process.argv[2];
if (!BASE) {
  console.error('Falta la URL: node scripts/verify-live.mjs https://...');
  process.exit(2);
}

const CANVAS = '#anom-game canvas';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let failures = 0;
const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' :: ' + extra : ''}`);
  if (!cond) failures++;
};

// Analitza els píxels realment renderitzats (no cap capa DOM)
async function pixels(page, selector) {
  const shot = await page.locator(selector).screenshot({ type: 'jpeg', quality: 40 });
  const b64 = shot.toString('base64');
  return page.evaluate(async (data) => {
    const img = new Image();
    img.src = 'data:image/jpeg;base64,' + data;
    await img.decode();
    const W = 400, H = 280;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, W, H);
    const d = ctx.getImageData(0, 0, W, H).data;
    let r = 0, g = 0, b = 0, n = 0, orange = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const R = d[i], G = d[i + 1], B = d[i + 2];
        r += R; g += G; b += B; n++;
        // taronja de Naruto: vermell alt, verd mitjà, blau baix
        if (y > H * 0.15 && R > 110 && G > 45 && G < 150 && B < 90) orange++;
      }
    }
    return { r: +(r / n).toFixed(1), g: +(g / n).toFixed(1), b: +(b / n).toFixed(1), orangePct: +(orange / n * 100).toFixed(2) };
  }, b64);
}

const tap = (page, sel) => page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) throw new Error('No existeix ' + s);
  el.click();
  return true;
}, sel);

try {
  // 1) Capçalera CSP real del servidor
  const res = await fetch(BASE);
  const csp = res.headers.get('content-security-policy') || '';
  const connect = (csp.match(/connect-src([^;]*)/i) || [, ''])[1];
  check('EN VIU: la pàgina respon', res.ok, `HTTP ${res.status}`);
  check('EN VIU: connect-src permet blob: (textures dels GLB)', connect.includes('blob:'), connect.trim().slice(0, 90));
  check('EN VIU: script-src no permet scripts inline', !/script-src[^;]*unsafe-inline/i.test(csp));

  const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1000, height: 720 } });
  const cspViolations = [];
  const pageErrors = [];
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' && /Content Security Policy|Refused to connect|Refused to (load|execute)/i.test(t)) cspViolations.push(t.slice(0, 150));
  });
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await tap(page, '.nav-link[data-route="juegos"]');
  await tap(page, 'button[data-mode="anomaly"]');
  await tap(page, '#launch-game');
  await page.waitForSelector('#anom-start');

  const t0 = Date.now();
  await page.waitForFunction(
    () => { const b = document.querySelector('#anom-start'); return b && !b.disabled; },
    null, { timeout: 45000 }
  );
  const loadMs = Date.now() - t0;
  const label = (await page.textContent('#anom-start')).trim();
  check('EN VIU: PRUEBA 1 · Naruto i Terrifying carreguen (botó actiu)', /COMENÇAR/.test(label), `${loadMs} ms`);

  // 2) Cap violació de CSP: les textures incrustades s'han pogut descodificar
  check('EN VIU: cap bloqueig de Content-Security-Policy', cspViolations.length === 0,
    cspViolations.slice(0, 2).join(' | '));

  await tap(page, '#anom-start');
  await sleep(2200);
  const st = await page.evaluate(() => ({
    overlay: getComputedStyle(document.querySelector('#anom-overlay')).display,
    room: document.querySelector('#anom-room')?.textContent,
    msg: (document.querySelector('#anom-message')?.textContent || '').slice(0, 70),
    canvas: !!document.querySelector('#anom-game canvas'),
  }));
  check('EN VIU: PRUEBA 2 · la partida arrenca a la sala 1', st.overlay === 'none' && st.room === '1' && st.canvas,
    `msg="${st.msg}"`);

  // 3) Naruto visible de debò al canvas (píxels, no DOM)
  const px = await pixels(page, CANVAS);
  check('EN VIU: PRUEBA 1 · Naruto és visible renderitzat (textures carregades)',
    px.orangePct > 0.15, `taronja=${px.orangePct}%`);

  // 4) Moviment real
  await page.keyboard.down('KeyW');
  await sleep(1200);
  await page.keyboard.up('KeyW');
  await sleep(200);
  const px2 = await pixels(page, CANVAS);
  check('EN VIU: PRUEBA 2 · el jugador es mou amb W',
    Math.abs(px2.r - px.r) > 0.3 || Math.abs(px2.b - px.b) > 0.3,
    `r ${px.r}->${px2.r} / b ${px.b}->${px2.b}`);

  check('EN VIU: sense errors JavaScript a la pàgina', pageErrors.length === 0, pageErrors.slice(0, 2).join(' | '));

  await browser.close();
} catch (err) {
  console.log('FAIL  error inesperat :: ' + String(err.message || err).slice(0, 300));
  failures++;
}

console.log(failures === 0 ? '\n=== EN VIU: TOT OK ===' : `\n=== EN VIU: ${failures} FALLADA(ES) ===`);
process.exit(failures === 0 ? 0 : 1);
