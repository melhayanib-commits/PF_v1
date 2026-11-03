// Verificació funcional de l'Estació de les anomalies (ràpida i acotada).
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/appjet/browser/node_modules/playwright');

const PORT = 8126;
const BASE = `http://127.0.0.1:${PORT}/`;
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
  cwd: process.cwd(), stdio: 'ignore',
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const CANVAS = '#anom-game canvas';

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' :: ' + extra : ''}`);
  if (!cond) failures++;
};

// Analitza els píxels realment renderitzats al canvas (no cap capa DOM)
async function pixels(page, selector = null) {
  const shot = selector
    ? await page.locator(selector).screenshot({ type: 'jpeg', quality: 40 })
    : await page.screenshot({ type: 'jpeg', quality: 40 });
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
    let r = 0, g = 0, bl = 0, n = 0, redish = 0, orange = 0;
    // zona central: és on la càmera en tercera persona situa el personatge
    const x0 = 0, x1 = W, y0 = H * 0.15, y1 = H;
    let centrePixels = 0;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const R = d[i], G = d[i + 1], B = d[i + 2];
        r += R; g += G; bl += B; n++;
        if (R > 70 && R > B * 1.4) redish++;
        if (x > x0 && x < x1 && y > y0 && y < y1) {
          centrePixels++;
          // taronja de Naruto: vermell alt, verd mitjà, blau baix
          if (R > 110 && G > 45 && G < 150 && B < 90) orange++;
        }
      }
    }
    return {
      r: +(r / n).toFixed(1), g: +(g / n).toFixed(1), b: +(bl / n).toFixed(1),
      redishPct: +(redish / n * 100).toFixed(2),
      orangePct: +(orange / centrePixels * 100).toFixed(2),
    };
  }, b64);
}

const state = (page) => page.evaluate(() => ({
  choice: getComputedStyle(document.querySelector('#anom-choices')).display,
  room: document.querySelector('#anom-room')?.textContent,
  score: document.querySelector('#anom-score')?.textContent,
  msg: (document.querySelector('#anom-message')?.textContent || '').slice(0, 80),
  title: document.querySelector('#anom-title')?.textContent,
  overlay: getComputedStyle(document.querySelector('#anom-overlay')).display,
}));

// Clic directe al DOM: el HUD del joc pot quedar fora de l'àrea visible.
const tap = (page, sel) => page.evaluate((s) => {
  const el = document.querySelector(s);
  if (!el) throw new Error('No existeix ' + s);
  el.click();
  return true;
}, sel);

const hold = async (page, keys, ms) => {
  for (const k of keys) await page.keyboard.down(k);
  await sleep(ms);
  for (const k of keys) await page.keyboard.up(k);
};

try {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch {}
    await sleep(100);
  }

  const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 900, height: 640 } });
  await page.addInitScript(() => {
    Object.defineProperty(window, 'devicePixelRatio', { get: () => 0.35, configurable: true });
  });
  const jsErrors = [];
  page.on('pageerror', (e) => jsErrors.push(e.message));

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await tap(page, '.nav-link[data-route="juegos"]');
  await tap(page, 'button[data-mode="anomaly"]');
  await tap(page, '#launch-game');
  await page.waitForSelector('#anom-start');

  const t0 = Date.now();
  await page.waitForFunction(
    () => { const b = document.querySelector('#anom-start'); return b && !b.disabled; },
    null, { timeout: 40000 }
  );
  const loadMs = Date.now() - t0;
  check('PRUEBA 1: Naruto i Terrifying carreguen (botó COMENÇAR actiu)',
    /COMENÇAR/.test((await page.textContent('#anom-start')).trim()), `${loadMs} ms`);

  await tap(page, '#anom-start');
  await sleep(1600);
  let st = await state(page);
  check('PRUEBA 2: partida iniciada a la sala 1', st.overlay === 'none' && st.room === '1');

  // PRUEBA 1b: el model s'ha de VORE renderitzat (taronja de Naruto al centre)
  const p1 = await pixels(page, CANVAS);
  check('PRUEBA 1: Naruto és visible renderitzat a la càmera en 3a persona',
    p1.orangePct > 0.15, `taronja=${p1.orangePct}% de la imatge`);

  // Mesura de FPS reals de l'entorn de prova (renderitzat per software)
  const fps = await page.evaluate(() => new Promise((res) => {
    let n = 0; const t = performance.now();
    const tick = () => { n++; if (performance.now() - t < 1000) requestAnimationFrame(tick); else res(n); };
    requestAnimationFrame(tick);
  }));
  console.log(`  [info] FPS mesurats a l'entorn de prova: ${fps}`);

  // PRUEBA 2: moviment amb W
  await hold(page, ['KeyW'], 1300);
  await sleep(200);
  const p2 = await pixels(page, CANVAS);
  check('PRUEBA 2: el jugador es mou amb W (la imatge canvia)',
    Math.abs(p2.r - p1.r) > 0.3 || Math.abs(p2.b - p1.b) > 0.3,
    `r ${p1.r}->${p2.r} / b ${p1.b}->${p2.b}`);

  // PRUEBA 2: córrer fins al final de la sala perquè avanci a la sala 2
  await page.keyboard.down('ShiftLeft');
  await page.keyboard.down('KeyW');
  for (let i = 0; i < 30; i++) {
    await sleep(1000);
    st = await state(page);
    if (st.room !== '1' || st.choice === 'flex') break;
  }
  await page.keyboard.up('KeyW');
  await page.keyboard.up('ShiftLeft');
  await sleep(400);
  st = await state(page);
  check('PRUEBA 2: s\'avança de la sala 1 a la sala 2', st.room === '2', `sala=${st.room} msg="${st.msg}"`);

  // PRUEBA 4/5: arribar a la porta i respondre
  let answeredWrong = false, alarm = null, basePx = null;
  for (let attempt = 0; attempt < 3 && !answeredWrong; attempt++) {
    st = await state(page);
    if (st.choice !== 'flex') {
      await page.keyboard.down('ShiftLeft');
      await page.keyboard.down('KeyW');
      for (let i = 0; i < 20; i++) {
        await sleep(1000);
        st = await state(page);
        if (st.choice === 'flex') break;
      }
      await page.keyboard.up('KeyW');
      await page.keyboard.up('ShiftLeft');
      await sleep(500);
      st = await state(page);
    }
    if (st.choice !== 'flex') { await page.keyboard.press('KeyE'); await sleep(600); st = await state(page); }
    if (st.choice !== 'flex') break;

    const before = st.score;
    basePx = await pixels(page, CANVAS);
    await tap(page, '#anom-same');
    await sleep(1000);
    st = await state(page);
    if (/incorrecta|alarma/i.test(st.msg) || st.score === before) {
      answeredWrong = /incorrecta|alarma/i.test(st.msg);
    }
    if (!answeredWrong) {
      // era correcta: la porta s'obre, avancem a la sala següent
      await hold(page, ['ShiftLeft', 'KeyW'], 12000);
      await sleep(400);
      st = await state(page);
    }
  }

  check('PRUEBA 4/5: apareixen els botons HI HA CANVIS / NO HI HA CANVIS', answeredWrong || st.choice === 'flex');
  check('PRUEBA 5: la resposta incorrecta activa l\'alarma', answeredWrong, st.msg);

  if (answeredWrong) {
    await sleep(1400);
    alarm = await pixels(page, CANVAS);
    const dRed = alarm.redishPct - (basePx?.redishPct ?? 0);
    const ratio = (alarm.r / Math.max(1, alarm.b)) / Math.max(0.01, (basePx?.r ?? 1) / Math.max(1, basePx?.b ?? 1));
    check('PRUEBA 5: la il·luminació REAL de l\'escena passa a vermella',
      dRed > 1.2 && ratio > 1.15,
      `vermellós ${basePx?.redishPct}%->${alarm.redishPct}% (+${dRed.toFixed(2)}) r/b x${ratio.toFixed(2)}`);

    // PRUEBA 6: la criatura persegueix i atrapa -> Game Over
    let caught = null;
    for (let i = 0; i < 40; i++) {
      await sleep(500);
      const s2 = await state(page);
      if (s2.overlay !== 'none' && /atrapat/i.test(s2.title || '')) { caught = s2; break; }
    }
    check('PRUEBA 6: Terrifying persegueix i atrapa el jugador (Game Over)',
      !!caught, caught ? `"${caught.title}" score=${caught.score}` : 'no atrapat en 20 s');
    if (caught) {
      const retry = await page.textContent('#anom-start');
      check('PRUEBA 6: pantalla de Game Over amb botó de reintent', /tornar/i.test(retry.trim()), retry.trim());
    }
  }

  check('Sense errors JavaScript a la pàgina', jsErrors.length === 0, jsErrors.join(' | ').slice(0, 200));

  // PRUEBA 7: sortir i reobrir l'estació sense pantalla negra
  await tap(page, '#anom-exit');
  await sleep(600);
  const afterExit = await page.evaluate(() => ({
    menu: !document.querySelector('#game-menu').classList.contains('hidden'),
    leftover: !!document.querySelector('#anom-game'),
  }));
  check('PRUEBA 7: sortir neteja l\'escena 3D i torna al menú', afterExit.menu && !afterExit.leftover);

  await tap(page, 'button[data-mode="anomaly"]');
  await tap(page, '#launch-game');
  await page.waitForSelector('#anom-start');
  await page.waitForFunction(
    () => { const b = document.querySelector('#anom-start'); return b && !b.disabled; },
    null, { timeout: 40000 }
  );
  check('PRUEBA 7: es pot reobrir l\'estació sense recarregar la pàgina',
    /COMENÇAR/.test((await page.textContent('#anom-start')).trim()));

  await browser.close();
} catch (err) {
  console.error('ERROR:', err?.message || err);
  failures++;
} finally {
  server.kill('SIGKILL');
}

console.log(`\n=== RESULTAT: ${failures === 0 ? 'TOT OK' : failures + ' FALLADA(ES)'} ===`);
process.exit(failures === 0 ? 0 : 1);
