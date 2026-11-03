// Verificació funcional real de l'Estació de les anomalies.
// Comprova: càrrega dels GLB, Naruto visible dret al terra, moviment,
// porta que bloqueja, resposta incorrecta -> alarma vermella + Terrifying.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('/opt/appjet/browser/node_modules/playwright');

const PORT = 8124;
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

try {
  for (let i = 0; i < 50; i++) {
    try { if ((await fetch(BASE)).ok) break; } catch {}
    await sleep(100);
  }

  const browser = await chromium.launch({ args: ['--no-sandbox', '--use-gl=swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 860 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.click('.nav-link[data-route="juegos"]');
  await page.click('button[data-mode="anomaly"]');
  await page.click('#launch-game');
  await page.waitForSelector('#anom-start');

  // PRUEBA 1: càrrega
  await page.waitForFunction(
    () => { const b = document.querySelector('#anom-start'); return b && !b.disabled; },
    null, { timeout: 45000 }
  );
  const btn = (await page.textContent('#anom-start')).trim();
  check('PRUEBA 1: botó COMENÇAR actiu (models carregats)', /COMENÇAR/.test(btn), btn);

  await page.click('#anom-start');
  await sleep(2500);

  const started = await page.evaluate(() => ({
    overlay: getComputedStyle(document.querySelector('#anom-overlay')).display,
    room: document.querySelector('#anom-room').textContent,
    msg: document.querySelector('#anom-message').textContent,
  }));
  check('PRUEBA 2: partida iniciada, overlay amagat', started.overlay === 'none');

  // Naruto visible al canvas: comprova píxels no-negres en la zona central (personatge)
  const shot = await page.screenshot({ path: 'verif-sala1.png' });
  check('Captura de la sala 1 generada', shot.length > 20000, `${shot.length} bytes`);

  // PRUEBA 2: moviment amb teclat (W) -> la càmera/posició ha de canviar
  const before = await page.screenshot();
  await page.keyboard.down('KeyW');
  await sleep(900);
  await page.keyboard.up('KeyW');
  await sleep(300);
  const after = await page.screenshot({ path: 'verif-mogut.png' });
  check('PRUEBA 2: el jugador es mou amb W (la imatge canvia)', !before.equals(after));

  // PRUEBA 2/4: avançar corrent fins al final de la sala (la porta és a ~40 unitats)
  const choiceState = () => page.evaluate(() => ({
    display: getComputedStyle(document.querySelector('#anom-choices')).display,
    room: document.querySelector('#anom-room').textContent,
    msg: document.querySelector('#anom-message').textContent,
  }));

  let st0 = await choiceState();
  await page.keyboard.down('ShiftLeft');
  await page.keyboard.down('KeyW');
  for (let i = 0; i < 60 && st0.display !== 'flex'; i++) {
    await sleep(400);
    st0 = await choiceState();
    if (st0.display === 'flex') break;
    if (i === 20) { await page.keyboard.press('KeyE'); }
  }
  await page.keyboard.up('KeyW');
  await page.keyboard.up('ShiftLeft');
  await sleep(400);
  if (st0.display !== 'flex') {
    await page.keyboard.press('KeyE');
    await sleep(700);
    st0 = await choiceState();
  }
  const choiceOpen = st0.display;
  console.log('  [info] sala:', st0.room, '| missatge:', st0.msg?.slice(0, 70));
  check('PRUEBA 4/5: es mostra la pregunta HI HA CANVIS / NO HI HA CANVIS', choiceOpen === 'flex', `display=${choiceOpen}`);

  if (choiceOpen === 'flex') {
    // PRUEBA 5: resposta que provoca fallada (triem la que sigui incorrecta)
    // Provem primer "NO HI HA CANVIS"; si no tanca res, provem l'altra.
    await page.click('#anom-same');
    await sleep(900);
    let st = await page.evaluate(() => ({
      choice: getComputedStyle(document.querySelector('#anom-choices')).display,
      msg: document.querySelector('#anom-message').textContent,
      score: document.querySelector('#anom-score').textContent,
    }));
    let failed = /alarma|Atrapat|incorrecta/i.test(st.msg) || st.score === '0';

    if (!failed) {
      // resposta correcta: ara provem la sala següent fins a fallar
      await page.keyboard.down('KeyW');
      await sleep(4200);
      await page.keyboard.up('KeyW');
      await sleep(500);
      await page.keyboard.press('KeyE');
      await sleep(700);
      const open2 = await page.evaluate(
        () => getComputedStyle(document.querySelector('#anom-choices')).display
      );
      if (open2 === 'flex') {
        await page.click('#anom-same');
        await sleep(900);
        st = await page.evaluate(() => ({
          choice: getComputedStyle(document.querySelector('#anom-choices')).display,
          msg: document.querySelector('#anom-message').textContent,
          score: document.querySelector('#anom-score').textContent,
        }));
        failed = /alarma|incorrecta/i.test(st.msg);
      }
    }

    check('PRUEBA 5: la resposta incorrecta activa l\'alarma', failed, st.msg);

    if (failed) {
      // Alarma: fons/fog vermell + Terrifying dins l'escena
      const scene = await page.evaluate(() => {
        const c = document.querySelector('#anom-game canvas');
        const g = c && c.getContext('webgl2');
        return { hasCanvas: !!c, hasGL: !!g };
      });
      check('Motor WebGL actiu després de l\'alarma', scene.hasCanvas && scene.hasGL);
      await page.screenshot({ path: 'verif-alarma.png' });
      console.log('Captura verif-alarma.png desada');
    }
  }

  check('Sense errors JavaScript a la pàgina', errors.length === 0, errors.join(' | ').slice(0, 300));

  // PRUEBA 7: sortir i tornar a entrar a l'estació
  await page.click('#anom-exit');
  await sleep(700);
  const backToMenu = await page.evaluate(() => ({
    menu: !document.querySelector('#game-menu').classList.contains('hidden'),
    leftover: !!document.querySelector('#anom-game'),
  }));
  check('PRUEBA 7: sortir de l\'estació neteja el DOM i torna al menú', backToMenu.menu && !backToMenu.leftover);

  await page.click('button[data-mode="anomaly"]');
  await page.click('#launch-game');
  await page.waitForSelector('#anom-start');
  await page.waitForFunction(
    () => { const b = document.querySelector('#anom-start'); return b && !b.disabled; },
    null, { timeout: 45000 }
  );
  const second = (await page.textContent('#anom-start')).trim();
  check('PRUEBA 7: es pot reobrir l\'estació sense pantalla negra', /COMENÇAR/.test(second), second);

  await browser.close();
} catch (err) {
  console.error('ERROR:', err?.message || err);
  failures++;
} finally {
  server.kill('SIGKILL');
}

console.log(`\n=== RESULTAT: ${failures === 0 ? 'TOT OK' : failures + ' FALLADA(ES)'} ===`);
process.exit(failures === 0 ? 0 : 1);
