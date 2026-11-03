# Proves (v8)
Fetes amb Chromium headless (Playwright):
- Botó «Entrar» i selecció de les 4 zones: OK. Cada joc obre la intro, comença, es pot jugar, pausar (Esc) i sortir.
- Temple dels Patrons, Volcà dels Números, Illes de Paraules, Ciutat de l'Atenció: partides simulades amb encerts i errors, vides, combo i final.
- Resultat desat a l'historial i rècord per joc: OK.
- FocusIA sense backend: mode local respon (anàlisi, exercicis, càlcul, missatge honest per a preguntes obertes): OK.
- `node tests/static-check.mjs`: PASS.
No provades: FocusIA amb clau OpenAI real, Safari/iPhone real, tàctil real (només emulat), so audible.
- v8.1: Illa dels Encàrrecs (món obert) provada amb toc tàctil emulat: briefing, moviment, recollida, entrega correcta i errònia, pista.
- Botons Surt, Pausa, Continua, Tornar a jugar i Menú provats amb tocs reals (no amb .click() programàtic): OK.
