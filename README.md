# Pantalla Focus

Pantalla Focus és una aplicació web educativa per observar hàbits digitals, practicar habilitats cognitives, explorar quatre mons interactius, estudiar amb targetes i conversar amb FocusIA.

## Què hi ha implementat

- **Diari de 7 dies:** temps de pantalla introduït manualment, son, concentració, estat d’ànim, exercici, circumstàncies i reflexions.
- **Experiment de 7 dies:** progrés real a partir del diari + set reptes diaris marcables + resum de dades.
- **Evolució:** gràfics calculats només amb dades guardades al navegador.
- **Quatre proves cognitives:** atenció, memòria numèrica, memòria de paraules i seqüència visual, amb nivells i historial.
- **Cinc jocs d'acció (Arcade Lab, `games-arcade.js`), un d'ells de món obert (Illa dels Encàrrecs: camines per l'illa, memoritzes una llista d'encàrrecs objecte→lloc i els lliures; hi ha pista limitada i penalització per errors):** Temple dels Patrons (seqüència visual, rondes inverses), Volcà dels Números (carrera per carrils amb memòria numèrica), Illes de Paraules (navegació i memòria verbal) i Ciutat de l'Atenció (go/no-go amb canvi de regla). Sense dependències externes: funcionen sense internet. Guarden resultats, rècords, partícules, sons i pausa.
- **FocusIA:** backend Node.js amb API real i **mode local** (`focusia-local.js`) quan no hi ha backend: analitza resultats, recomana entrenament, genera exercicis i calcula; no simula un model de llenguatge, historial de conversa local, context de resultats, càrrega d’imatges i missatges d’error clars.
- **Targetes d’estudi:** creació, categories i repàs local.
- **Exportació:** JSON i CSV.
- **PWA:** manifest i service worker per instal·lació al dispositiu quan el navegador ho permet.
- **Privacitat:** les dades de l’activitat es guarden localment; les imatges no es guarden permanentment al backend.

Els resultats cognitius i els jocs són activitats de pràctica. **No són proves clíniques, no diagnostiquen i no determinen la intel·ligència o la salut.**

## Requisits

- Node.js 20 o superior per al backend.
- Navegador modern: Safari iOS, Chrome Android/Chromebook, Chrome/Edge/Firefox a ordinador o Safari a macOS.
- Per a FocusIA: una clau d’API del proveïdor configurat.

## Executar localment

```bash
npm install
cp .env.example .env
npm start
```

Si vols que el mateix Node serveixi també el frontend:

```env
SERVE_FRONTEND=true
PORT=3000
```

Després obre:

```text
http://localhost:3000
```

Per separar frontend i backend durant desenvolupament, deixa `SERVE_FRONTEND=false` i serveix els fitxers estàtics amb qualsevol servidor web. A Preferències, indica la URL del backend.

## FocusIA real

La clau **mai** va al JavaScript del navegador.

Al fitxer `.env`:

```env
OPENAI_API_KEY=la_teva_clau
OPENAI_MODEL=gpt-5.5
PORT=3000
ALLOWED_ORIGINS=http://localhost:3000
SERVE_FRONTEND=false
```

Reinicia el backend després de modificar `.env`.

Quan la clau no està configurada, FocusIA **no simula una resposta**: mostra que el backend no està configurat.

El backend:

- manté la clau al servidor;
- limita peticions per IP;
- limita imatges a 5 MB;
- accepta JPG, PNG i WEBP;
- valida origen CORS;
- utilitza Helmet;
- no desa les imatges;
- envia a FocusIA només el context necessari per a la consulta;
- incorpora dades recents de diari, proves, jocs i experiment quan l’usuari demana una anàlisi.

La API pot generar costos segons el proveïdor i el model utilitzat.

## GitHub Pages + backend Node

GitHub Pages només serveix fitxers estàtics. **No executa `server.mjs`.**

### Frontend

Puja a GitHub:

- `index.html`
- `styles.css`
- `app.js`
- `games-enhanced.js`
- `manifest.webmanifest`
- `sw.js`

Activa GitHub Pages des de la configuració del repositori.

### Backend

Desplega:

- `server.mjs`
- `package.json`
- `.env` (com a variables secretes del proveïdor, no al repositori)

en un servei que executi Node.js.

Configura:

```env
OPENAI_API_KEY=...
OPENAI_MODEL=...
ALLOWED_ORIGINS=https://EL_TEU_USUARI.github.io
PORT=3000
SERVE_FRONTEND=false
```

A Pantalla Focus → Preferències, desa la URL HTTPS del backend, per exemple:

```text
https://el-teu-backend.example.com
```

No copiïs mai la clau d’API a GitHub Pages, `app.js` ni `index.html`.

## Actualitzar l’aplicació

1. Modifica els fitxers del repositori.
2. Fes commit i push.
3. GitHub Pages publicarà la nova versió.
4. Si canvies el backend, torna a desplegar-lo i comprova `/api/health`.
5. Si canvies fitxers del service worker, incrementa la versió de `CACHE` a `sw.js`.

## Dades i còpies de seguretat

La informació de l’aplicació es desa a `localStorage` del navegador. Això significa:

- no hi ha sincronització automàtica entre dispositius;
- canviar de navegador o esborrar les dades del navegador pot eliminar l’historial local;
- utilitza **Exportar dades** per crear una còpia;
- la sincronització entre iPhone i Chromebook requeriria comptes i un backend de dades addicional, que aquesta versió no implementa.

## Proves de qualitat realitzades en aquesta entrega

S’ha fet una revisió estàtica del projecte original i s’han corregit els punts principals del flux de jocs:

- el botó d’entrada dels jocs queda connectat a un únic gestor;
- cada joc té una introducció abans d’iniciar-se;
- els quatre modes tenen objectius diferents;
- el moviment funciona amb WASD/fletxes i controls tàctils;
- inventari, puntuació i final de partida actualitzen l’estat;
- els resultats de les partides es guarden a les dades locals;
- FocusIA no respon de manera falsa quan no hi ha backend;
- la clau d’API només existeix al servidor;
- s’ha afegit PWA bàsica.

**Important:** en aquesta sessió he pogut fer revisió de codi, sintaxi i integració, però l’entorn no permet fer una prova de navegador real contra aquest fitxer local ni disposa de la teva clau privada d’OpenAI. Per això no afirmo que FocusIA estigui connectat a una API real en aquesta entrega. Quan configuris `OPENAI_API_KEY`, comprova `/api/health` i fes una consulta des de la pantalla de FocusIA.

## Funcions que encara requeririen infraestructura addicional

- Comptes d’usuari i sincronització segura entre dispositius.
- Mesurament automàtic del temps de pantalla del sistema operatiu; un web normal no té accés fiable a aquesta dada a iOS/Android.
- Autenticació i quota d’usuari per a FocusIA en producció.
- Analítica de rendiment del backend.
- Sistema de notificacions push.
- Publicació en un domini propi.


## Correcció de la pantalla de començament dels jocs (v3)

La pantalla d'introducció dels jocs ja no queda atrapada dins d'un contenidor amb alçada fixa. El contenidor del joc pot créixer amb el contingut i la targeta d'introducció té una alçada responsive. El botó **COMENÇAR LA MISSIÓ** és accessible amb clic o toc i el projecte força l'actualització del Service Worker a `v3` per evitar que el navegador conservi la versió antiga.

Si el navegador havia instal·lat una versió anterior de la PWA i encara mostra una pantalla antiga, tanca la pestanya i torna a obrir-la. Amb `v3`, el Service Worker activa la nova versió automàticament.


## Versió v4: jocs i FocusIA

- Corregit un error crític del botó **COMENÇAR LA MISSIÓ**: l'atribut HTML `hidden` quedava anul·lat per l'estil `display:flex` de la capa del joc. Ara `[hidden]` té una regla explícita i la capa desapareix realment en iniciar la partida.
- Verificats els quatre jocs amb un navegador Chromium automatitzat: inici, moviment, pausa/reprendre i sortir. També s'ha comprovat la finalització de memòria visual, atenció, memòria verbal i laberint.
- FocusIA manté la clau d'OpenAI exclusivament al servidor i usa la Responses API. El frontend de GitHub Pages queda preconfigurat per a `https://pantalla-focus-api.onrender.com`; el backend es pot desplegar amb `render.yaml`.
- **Pas que no puc executar des d'aquest ZIP:** crear un compte/servei extern i introduir la teva clau `OPENAI_API_KEY`. No és segur ni possible fer-ho sense accés al teu compte. Un cop desplegat el servei `pantalla-focus-api` a Render i afegida la clau, `/api/health` i FocusIA quedaran operatius.

## Versió actual — Neon Campus

Aquesta versió substitueix els jocs anteriors per un únic entorn d'aventura educatiu amb mapa central. L'avatar es pot personalitzar, caminar, córrer i saltar. Les quatre zones són: **Ciutat de l’Atenció**, **Volcà dels Números**, **Illes de Paraules** i **Temple dels Patrons**.

Abans d'entrar a cada zona apareix una explicació animada amb objectiu, habilitat cognitiva i controls. Els resultats es desen al mateix historial local de Pantalla Focus.

### FocusIA i desplegament

`render.yaml` està configurat perquè Render executi `npm ci`, arrenqui `npm start`, exposi `/api/health` com a health check i serveixi també el frontend (`SERVE_FRONTEND=true`). Això permet provar tota l'aplicació des d'un únic domini després del desplegament. Render documenta que els web services Node/Express reben una URL `onrender.com` i han d'escoltar el port proporcionat per `PORT`. citeturn302562search1turn302562search3

La URL pública de GitHub Pages continua configurable a `focusia-config.js`; el nom `pantalla-focus-api.onrender.com` només funcionarà quan aquest servei existeixi realment al compte de Render corresponent. No es declara com a actiu abans del desplegament.


## Versió v6 — compatibilitat mòbil i desplegament FocusIA

A partir de la captura d'iPhone s'ha detectat un problema real de responsive: `game-menu` mantenia dues columnes també en pantalles petites, de manera que la il·lustració ocupava la vista i el contingut quedava fora de l'amplada visible. En aquesta versió el menú de jocs passa a una sola columna fins a 900 px i els controls del campus s'adapten a l'àrea segura del mòbil.

També s'ha afegit un botó tàctil de **CORRER**, s'han reforçat els punts de ruptura per a pantalles molt estretes i s'ha actualitzat el Service Worker a `v6`.

### FocusIA

El frontend continua preparat per utilitzar `https://pantalla-focus-api.onrender.com` quan es publica a GitHub Pages. Aquesta URL només serà funcional després de desplegar el servei `pantalla-focus-api` a Render i afegir-hi `OPENAI_API_KEY`. El `render.yaml` ara utilitza `npm install` perquè el projecte no depèn d'un `package-lock.json`.

El temps d'espera de comprovació de l'API s'ha ampliat per tolerar l'arrencada en fred d'un servei gratuït.

**Limitació honesta:** des d'aquest entorn no puc crear ni autenticar un servei extern de Render ni inserir una clau privada d'OpenAI. Sí que puc deixar el projecte preparat perquè, un cop desplegat el backend, la mateixa URL serveixi `/api/health` i `/api/focusia`.


## Versió v7 — Campus 3D real amb Three.js

La zona de joc ara es renderitza amb **Three.js i WebGL**, no amb un mapa 2D. Inclou un campus tridimensional amb terra i graella, camins, plaça central, edificis amb entrades lluminoses, arbres, il·luminació i ombres, avatar humanoide construït amb geometria 3D i càmera en tercera persona que segueix el personatge.

- **Ordinador:** WASD/fletxes per caminar, Shift per córrer, Espai per saltar, Enter per entrar al portal proper i arrossegar amb el ratolí per girar la càmera.
- **Mòbil:** creueta tàctil, botons de salt/acció i córrer; arrossega sobre l'escena per girar la càmera.
- **Zones:** els quatre edificis físics obren les activitats d'atenció, memòria numèrica, memòria verbal i seqüències visuals.
- **Requisit:** Three.js es carrega des de jsDelivr; cal connexió a internet i un navegador amb WebGL.

La verificació automatitzada comprova sintaxi i presència del motor WebGL, càmera i avatar 3D. No s'ha pogut fer una prova gràfica interactiva real en aquest entorn, així que cal comprovar el renderitzat en el navegador del dispositiu.

## Motor 3D addicional

El fitxer `world3d.js` es conserva al projecte per compatibilitat amb modes anteriors, però no apareix com una opció separada al menú principal de jocs.

### FocusIA: desplegament real

El frontend no pot crear una connexió amb un servei d'IA que no estigui desplegat, ni pot fabricar una clau API. Per a una connexió real:

1. Desplega aquest directori com a servei Node a Render.
2. Afegeix `OPENAI_API_KEY` com a variable secreta al panell del servei (mai dins dels fitxers públics).
3. Comprova `https://EL-TEU-SERVEI.onrender.com/api/health`; ha de retornar `ok: true` i `configured: true`.
4. A Pantalla Focus, Preferències, desa la URL exacta del servei si no és `https://pantalla-focus-api.onrender.com`.

Si `/api/health` respon `configured: false`, falta la clau al servidor. Si la petició no arriba, el servei no està desplegat/despert o la URL és incorrecta. Cap canvi de JavaScript al navegador pot substituir aquestes condicions.

## Mundo 3D: portales de memoria

La escena `world3d.js` incluye tres retos activados al acercarse a sus portales: secuencia de cristales, recuerdo de palabras y detección de anomalías. El joystick hacia arriba avanza en la dirección de la cámara; arrastrar sobre la escena en móvil permite orientar la cámara. El botón ⛶ solicita pantalla completa cuando el navegador lo permite.

### FocusIA: comprobación real del backend

El endpoint `GET /api/health` informa `ok` y `configured`; `configured: false` significa que falta `OPENAI_API_KEY` en el entorno del servidor. La clave debe guardarse únicamente en el entorno privado del backend, nunca en JavaScript del navegador. `POST /api/focusia` necesita un modelo compatible configurado mediante `OPENAI_MODEL` (el valor predeterminado actual es `gpt-5.5`). Una respuesta HTTP 503 indica que no hay clave configurada; 429 suele indicar límite/cuota; 400 indica que la petición no se ha podido procesar. La disponibilidad final depende de la clave, los permisos de API, el modelo y el despliegue.

## Món obert: Observació (mode 3D)

El menú de jocs incorpora el mode **Món obert: Observació**, un joc de tercera persona amb cinc sales connectades d'una estació de metro. Cal observar els cartells, els seients, els elements de les parets i la il·luminació, i respondre amb **CAMBIOS** o **SIN CAMBIOS**. Una resposta incorrecta activa una criatura perseguidora. Inclou controls WASD/fletxes, ratolí per girar la càmera, Shift per córrer, Espai per saltar, E/interactuar, joystick tàctil, pausa i pantalla completa. Three.js es carrega sota demanda des d'un CDN quan s'inicia aquest mode; cal connexió a internet per carregar la biblioteca.

Per validar els fitxers JavaScript i els elements principals, executa `node tests/static-check.mjs`.


### Personajes 3D animados
El modo Món obert: Observació incluye Naruto y la criatura en `assets/characters/`. Ambos archivos GLB contienen un esqueleto y una animación, que el juego intenta reproducir con GLTFLoader y AnimationMixer. La sala 1 es la referencia inicial y la primera decisión aparece en la sala 2.


### Build Naruto + Terrifying
The anomaly mode loads the optimized animated Naruto GLB (18 MiB, same embedded skeleton/70-channel animation as the 124 MiB texture-heavy variant) and the original Terrifying GLB from `assets/characters/`. Three.js and GLTFLoader use the same esm.sh module graph to avoid duplicate THREE constructors. For GitHub Pages, publish the contents of this project at the repository root.
