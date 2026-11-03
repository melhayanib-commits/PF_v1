/* FocusIA local: respostes reals calculades amb les dades del dispositiu (sense servidor). No simula un model de llenguatge. */
(()=>{const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0,rnd=n=>Math.floor(Math.random()*n);
const acc=g=>{const t=(g.hits||0)+(g.misses||0);return t?g.hits/t:0};
function byMode(games){const m={};games.forEach(g=>(m[g.mode]=m[g.mode]||[]).push(g));return m}
function analysis(d){const gs=d.games||[],ts=d.tests||[];if(!gs.length&&!ts.length)return'Encara no tinc dades per analitzar. Juga una partida a Jocs o fes una prova, i torna a preguntar-m’ho.';
 let o='**Anàlisi del que has fet (calculada al teu dispositiu)**\n';const m=byMode(gs);const rows=Object.entries(m).map(([k,v])=>({k,n:v.length,a:avg(v.map(acc)),best:Math.max(...v.map(x=>x.score||0)),tr:v.length>1?(v[v.length-1].score||0)-(v[0].score||0):0}));
 rows.forEach(r=>o+=`- ${r.k}: ${r.n} partides · precisió mitjana ${(r.a*100).toFixed(0)}% · millor puntuació ${r.best}${r.n>1?' · evolució '+(r.tr>=0?'+':'')+r.tr+' punts':''}\n`);
 if(rows.length>1){const s=[...rows].sort((a,b)=>b.a-a.a);o+=`\nPunt fort: **${s[0].k}**. Per reforçar: **${s[s.length-1].k}**.\n`}
 if(ts.length)o+=`\nProves registrades: ${ts.length}.\n`;return o+'\nSón observacions descriptives de pràctica, no una avaluació clínica.'}
function advice(d){const m=byMode(d.games||[]);const w=Object.entries(m).map(([k,v])=>[k,avg(v.map(acc))]).sort((a,b)=>a[1]-b[1])[0];
 return`**Pla d’entrenament recomanat**\n1. ${w?`Dedica 3 sessions curtes a «${w[0]}» (és on tens menys precisió).`:'Prova els quatre jocs una vegada cadascun per tenir una línia base.'}\n2. Prioritza l’exactitud abans de la velocitat; quan superis el 85% de precisió, puja de dificultat.\n3. Sessions de 10-15 minuts, amb descans, millor que una sessió llarga.\n4. Dorm bé: la memòria es consolida durant la nit.`}
function exercises(){const dg=n=>Array.from({length:n},()=>1+rnd(9)).join(' '),W='poma casa gat sol lluna arbre riu pa llibre clau porta barca peix flor mar tren'.split(' ').sort(()=>Math.random()-.5);
 return`**Exercicis nous**\n- Memòria numèrica: memoritza ${dg(6)} durant 5 s, tapa-ho i escriu-ho en ordre; després repeteix-ho al revés.\n- Memòria verbal: llegeix 1 minut aquestes paraules i escriu-ne les que recordis: ${W.slice(0,10).join(', ')}.\n- Atenció: en una pàgina de text, compta quantes vegades apareix la lletra «${'aeios'[rnd(5)]}» en 30 segons.\n- Seqüència: inventa un patró de ${4+rnd(3)} colors, mira’l 10 s i dibuixa’l de memòria.`}
function eval_(e){if(!/^[\d\s+\-*/().,%^]+$/.test(e))return null;try{const v=Function('"use strict";return ('+e.replace(/,/g,'.').replace(/\^/g,'**')+')')();return Number.isFinite(v)?v:null}catch{return null}}
window.FocusLocal={answer(msg,data,hadImage){const q=(msg||'').toLowerCase();const calc=eval_(q.replace(/[=?]|quant és|quant fa/g,'').trim());
 if(hadImage)return'Sense connexió amb el servidor d’IA no puc analitzar imatges. Quan el backend estigui actiu podràs adjuntar-la de nou.';
 if(calc!==null&&/\d/.test(q)&&/[+\-*/^]/.test(q))return`El resultat és **${calc}**.`;
 if(/anali|resultat|rendiment|progr|evoluci|com vaig|informe/.test(q))return analysis(data);
 if(/exerci|repte|desafi|nou|genera|practic/.test(q))return exercises();
 if(/consell|recoman|entren|millor|pla|estudi|concentr|memori/.test(q))return advice(data)+'\n\n'+exercises();
 if(/hola|bon dia|bona/.test(q))return'Hola! Soc FocusIA en mode local. Puc analitzar els teus resultats, recomanar-te un pla d’entrenament, generar exercicis nous i fer càlculs. Per a preguntes obertes necessito el backend.';
 return'Ara mateix no hi ha connexió amb el servidor d’IA, i sense ell no puc respondre preguntes obertes. En mode local sí que puc:\n- **Analitzar** els teus resultats\n- **Recomanar** un pla d’entrenament\n- **Generar exercicis** nous\n- Fer **càlculs** (p. ex. 12*7+3)\nPregunta’m una d’aquestes coses.'}}})();
