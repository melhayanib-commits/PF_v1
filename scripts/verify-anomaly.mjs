// Verificació funcional real de l'Estació de les anomalies (ràpida).
// Comprova: càrrega dels GLB, moviment, pregunta de canvis, resposta
// incorrecta -> il·luminació vermella real (mesurada en píxels) i captura.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/appjet/browser/node_modules/playwright');

const PORT = 8125;
const BASE = `http://127.0.0.1:${PORT}/`;
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
  cwd: process.cwd(), stdio: 'ignore',
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let failures = 0;
const check = (name, cond, extra = '') => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' :: ' + extra : ''}`);
  if (!cond) failures++;
};

// Mesura el to real de la imatge renderitzada (no una capa DOM)
async function tone(page) {
  const b64 = (await page.screenshot({ type: 'jpeg', quality: 45 })).toString('base64');
  return page.evaluate(async (data) => {
    const img = new Image();
    img.src = 'data:image/jpeg;base64,' + data;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = 160; c.height = 110;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0, 160, 110);
    const d = ctx.getImageData(0, 0, 160, 110).data;
    let r = 0, g = 0, b = 0, n = 0, redish = 0;
    for (let i = 0; i < d.length; i += 4) {
      r += d[i]; g += d[i + 1]; b += d[i + 2]; n++;
      if (d[i] > 70 && d[i] > d[i + 2] * 1.4) redish++;
    }
    return { r: +(r / n).toFixed(1), g: +(g / n).toFixed(1), b: +(b / n).toFixed(1), redishPct: +(redish / n * 100).toFixed(2) };
  }, b64);
}

const state = (page) => page.evaluate(() => ({
  choice: getComputedStyle(document.querySelector('#anom-choices')).display,
  room: document.querySelector('#anom-room')?.textContent,
  score: document.querySelector('#anom-score')?.textContent,
  msg: document.querySelector('#anom-message')?.textContent,
  overlayTitle: document.querySelector('#anom-title')?.textContent,
  overlay: getComputedStyle(document.querySelector('#anom-overlay')).display,
}));

try {
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch {}
    await sleep(100);
  }

  const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 760, height: 560 } });
  const jsErrors = [];
  page.on('pageerror', (e) => jsErrors.push(e.message));

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.click('.nav-link[data-route="juegos"]');
  await page.click('button[data-mode="anomaly"]');
  await page.click('#launch-game');
  await page.waitForSelector('#anom-start');

  // PRUEBA 1: els models reals es carreguen (sense espera infinita)
  const t0 = Date.now();
  await page.waitForFunction(
    () => { const b = document.querySelector('#anom-start'); return b && !b.disabled; },
    null, { timeout: 40000 }
  );
  const loadMs = Date.now() - t0;
  check('PRUEBA 1: Naruto i Terrifying carregats (botó COMENÇAR actiu)',
    /COMENÇAR/.test((await page.textContent('#anom-start')).trim()), `${loadMs} ms`);

  await page.click('#anom-start');
  await sleep(1800);
  let st = await state(page);
  check('PRUEBA 2: partida iniciada a la sala 1', st.overlay === 'none' && st.room === '1');

  const tBefore = await tone(page);

  // PRUEBA 2: moure's (W) i comprovar que la imatge canvia
  await page.keyboard.down('KeyW');
  await sleep(1200);
  await page.keyboard.up('KeyW');
  await sleep(250);
  const tMoved = await tone(page);
  check('PRUEBA 2: el jugador es mou amb W',
    Math.abs(tMoved.r - tBefore.r) > 0.4 || Math.abs(tMoved.b - tBefore.b) > 0.4,
    `abans r=${tBefore.r} b=${tBefore.b} / després r=${tMoved.r} b=${tMoved.b}`);

  // PRUEBA 2/4: córrer fins a la porta del final de la sala 1
  await page.keyboard.down('ShiftLeft');
  await page.keyboard.down('KeyW');
  let arrived = false;
  for (let i = 0; i < 70; i++) {
    await sleep(350);
    st = await state(page);
    if (st.choice === 'flex' || st.overlay !== 'none') { arrived = true; break; }
    if (st.room === '2' && st.choice === 'flex') { arrived = true; break; }
  }
  await page.keyboard.up('KeyW');
  await page.keyboard.up('ShiftLeft');
  await sleep(300);
  st = await state(page);
  console.log(`  [info] sala=${st.room} score=${st.score} msg="${(st.msg || '').slice(0, 60)}"`);
  check('PRUEBA 2: s\'avança de la sala 1 a la sala 2', st.room === '2', `sala=${st.room}`);

  // Arribar a la zona de la porta de la sala 2 perquè aparegui la pregunta
  if (st.choice !== 'flex') {
    await page.keyboard.down('ShiftLeft');
    await page.keyboard.down('KeyW');
    for (let i = 0; i < 40; i++) {
      await sleep(350);
      st = await state(page);
      if (st.choice === 'flex') break;
    }
    await page.keyboard.up('KeyW');
    await page.keyboard.up('ShiftLeft');
  }
  await sleep(400);
  st = await state(page);
  if (st.choice !== 'flex') { await page.keyboard.press('KeyE'); await sleep(700); st = await state(page); }
  check('PRUEBA 4/5: apareixen els botons HI HA CANVIS / NO HI HA CANVIS',
    st.choice === 'flex', `display=${st.choice}`);

  if (st.choice === 'flex') {
    // PRUEBA 5: forçar una resposta incorrecta. Provem totes dues opcions.
    let failed = false, attempts = 0;
    while (attempts < 2 && !failed) {
      const scoreBefore = st.score;
      await page.click('#anom-same');
      await sleep(900);
      st = await state(page);
      if (/incorrecta|alarma/i.test(st.msg || '') || st.score === scoreBefore && st.choice !== 'flex') {
        failed = /incorrecta|alarma/i.test(st.msg || '');
      }
      if (!failed && st.score !== scoreBefore) {
        // Era correcta: avancem a la sala següent i tornem a provar
        await page.keyboard.down('ShiftLeft');
        await page.keyboard.down('KeyW');
        for (let i = 0; i < 40; i++) {
          await sleep(350);
          st = await state(page);
          if (st.choice === 'flex') break;
        }
        await page.keyboard.up('KeyW');
        await page.keyboard.up('ShiftLeft');
        await sleep(400);
        st = await state(page);
        if (st.choice !== 'flex') { await page.keyboard.press('KeyE'); await sleep(700); st = await state(page); }
        if (st.choice !== 'flex') break;
      }
      attempts++;
    }

    check('PRUEBA 5: la resposta incorrecta activa l\'alarma', failed, (st.msg || '').slice(0, 90));

    if (failed) {
      // La il·luminació REAL de l'escena ha de ser vermella (mesurat en píxels)
      await sleep(1200);
      const tAlarm = await tone(page);
      check('PRUEBA 5: la il·luminació real de l\'escena és vermella',
        tAlarm.redishPct > 6 && tAlarm.r > tAlarm.b,
        `vermellós=${tAlarm.redishPct}% r=${tAlarm.r} b=${tAlarm.b}`);
      await page.screenshot({ path: 'verif-alarma.jpg', type: 'jpeg', quality: 60 });

      // PRUEBA 6: la criatura persegueix i acaba atraient el jugador -> Game Over
      let caught = false;
      for (let i = 0; i < 60; i++) {
        await sleep(500);
        st = await state(page);
        if (st.overlay !== 'none' && /atrapat/i.test(st.overlayTitle || '')) { caught = true; break; }
      }
      check('PRUEBA 6: Terrifying persegueix i atrapa el jugador (Game Over)', caught,
        `títol="${st.overlayTitle}"`);
      st = await state(page);
      console.log(`  [info] game over: "${st.overlayTitle}" | sala=${st.room} score=${st.score}`);
    }
  }

  check('Sense errors JavaScript', jsErrors.length === 0, jsErrors.join(' | ').slice(0, 250));

  // PRUEBA 7: sortir i reobrir sense pantalla negra
  await page.click('#anom-exit');
  await sleep(600);
  const afterExit = await page.evaluate(() => ({
    menu: !document.querySelector('#game-menu').classList.contains('hidden'),
    leftover: !!document.querySelector('#anom-game'),
  }));
  check('PRUEBA 7: sortir neteja l\'escena i torna al menú', afterExit.menu && !afterExit.leftover);

  await page.click('button[data-mode="anomaly"]');
  await page.click('#launch-game');
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
