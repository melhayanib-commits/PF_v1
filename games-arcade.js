/* Pantalla Focus · Arcade Lab — 4 jocs d'acció cognitius, sense dependències (Canvas 2D). */
(()=>{'use strict';
const $=s=>document.querySelector(s),rnd=(a,b)=>a+Math.random()*(b-a),ri=(a,b)=>Math.floor(rnd(a,b+1)),pick=a=>a[ri(0,a.length-1)],shuf=a=>a.map(x=>[Math.random(),x]).sort((p,q)=>p[0]-q[0]).map(x=>x[1]);
const menu=$('#game-menu'),cont=$('#game-container'),host=$('#game-canvas-wrap');if(!menu||!cont||!host)return;
const PAL=['#ff6b8b','#ffd36f','#7df59b','#6fe7ff','#c79cff','#ff9f5a','#5ab0ff','#e86bff','#b4f55a'];
const BANK='poma,casa,gat,sol,lluna,arbre,riu,pa,llibre,clau,porta,barca,peix,flor,mar,cotxe,tren,sabata,cadira,taula,ou,pera,gos,ocell,illa,roca,cim,ona,vent,núvol,llum,paper,mà,peu,nas,ull,camí,pont,torre'.split(',');
const INFO={visual:{t:'Temple dels Patrons',i:'🧩',d:'Els pilars s’il·luminen en un ordre. Memoritza’l i repeteix-lo saltant de pilar en pilar. A partir de la ronda 4 algunes seqüències s’han de repetir AL REVÉS.',c:'Toca els pilars (o tecles 1-9).'},
 numbers:{t:'Volcà dels Números',i:'🌋',d:'Memoritza l’ordre dels números i corre pel pont de lava: a cada fila només un número és el que toca. Canvia de carril i recull-los en ordre.',c:'← → o A D · toca un carril · llisca.'},
 words:{t:'Illes de Paraules',i:'⛵',d:'Memoritza les paraules de les illes. Després navega entre boies: recull només les paraules que has vist i esquiva les noves.',c:'Arrossega / WASD / fletxes per moure la barca.'},
 anomaly:{t:'Món obert: Observació',i:'🚇',d:'Explora una estació de metro en 3D, compara cada sala i detecta canvis. Si t’equivoques, una criatura t’encalçarà.',c:'WASD/fletxes · ratolí per girar la càmera · Shift córrer · E interactuar.'},
 world:{t:'Illa dels Encàrrecs',i:'🏝️',d:'Món obert: camina per l’illa. El veí et dona una llista d’encàrrecs (objecte → lloc) que desapareix. Recorda-la, busca els objectes pel mapa i porta cada un al lloc correcte. Equivocar-te costa una vida; la pista costa punts.',c:'WASD / fletxes o arrossega el dit · Maj corre · E deixa l’objecte · R pista.'},
 attention:{t:'Ciutat de l’Atenció',i:'🎯',d:'Apareixen símbols a les finestres. Dispara només al que compleix la regla. La regla canvia a mig joc: adapta’t ràpid!',c:'Toca la finestra · tecles 1-9, Q-R.'}};
const MODE={world:'world',anomaly:'anomaly',free:'attention',attention:'numbers',sequence:'words',maze:'visual'};
/* ---------- àudio ---------- */
let AC,snd=true;
function beep(f,d=.12,type='sine',v=.1,to=0){if(!snd)return;try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();const o=AC.createOscillator(),g=AC.createGain();o.type=type;o.frequency.setValueAtTime(f,AC.currentTime);if(to)o.frequency.exponentialRampToValueAtTime(to,AC.currentTime+d);g.gain.setValueAtTime(v,AC.currentTime);g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+d);o.connect(g).connect(AC.destination);o.start();o.stop(AC.currentTime+d)}catch{}}
const SFX={ok:()=>{beep(660,.08,'triangle');setTimeout(()=>beep(990,.14,'triangle'),70)},bad:()=>beep(200,.3,'sawtooth',.12,70),win:()=>[523,659,784,1046].forEach((f,i)=>setTimeout(()=>beep(f,.2,'triangle'),i*110)),tick:()=>beep(900,.04,'square',.04),note:i=>beep(260+i*55,.22,'sine',.14),sw:()=>beep(400,.15,'square',.05,800)};
/* ---------- motor ---------- */
const cv=document.createElement('canvas'),c=cv.getContext('2d'),ov=document.createElement('div'),hud=document.createElement('div');
cv.style.cssText='display:block;width:100%;touch-action:none;border-radius:22px;background:#06101d';
ov.style.cssText='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;padding:12px;background:#020a13ee;backdrop-filter:blur(10px);z-index:9;overflow:auto;border-radius:22px';
hud.style.cssText='position:absolute;top:8px;left:8px;right:8px;display:flex;gap:6px;z-index:5;pointer-events:none;font:800 12px "Space Grotesk",system-ui,sans-serif;color:#fff';
const css=document.createElement('style');css.textContent=`.pa-chip{background:#061422dd;border:1px solid #6de6ff55;border-radius:12px;padding:6px 10px}.pa-chip b{color:#7ceaff;font-size:15px}.pa-b{pointer-events:auto;cursor:pointer;background:#0b263cee;border:1px solid #77e6ff55;color:#fff;border-radius:11px;padding:6px 11px;font:800 12px inherit;min-height:34px}.pa-card{max-width:520px;width:100%;text-align:center;color:#effaff;background:linear-gradient(145deg,#112d47,#091626);border:1px solid #6de7ff66;border-radius:22px;padding:20px}.pa-card h2{margin:6px 0;font-size:26px}.pa-card p{color:#c2d5e4;line-height:1.5;font-size:14px}.pa-go{background:linear-gradient(100deg,#18b8c5,#7469f7);border:0;color:#fff;padding:13px 24px;border-radius:14px;font-weight:900;font-size:15px;cursor:pointer;min-height:48px;margin:4px}.pa-go.sec{background:#10283b;border:1px solid #5b7788}.pa-star{font-size:34px;letter-spacing:6px}.pa-stat{display:inline-block;margin:4px 8px;font-size:12px;color:#9fc}.pa-stat b{display:block;font-size:20px;color:#7ceaff}`;document.head.appendChild(css);
hud.innerHTML='<div class=pa-chip>PUNTS<br><b id=pa-s>0</b></div><div class=pa-chip>VIDES<br><b id=pa-l>♥♥♥</b></div><div class=pa-chip>COMBO<br><b id=pa-c>x1.0</b></div><div style="flex:1"></div><button class=pa-b id=pa-mute>🔊</button><button class=pa-b id=pa-pause>⏸ Pausa</button><button class=pa-b id=pa-exit>✕ Surt</button>';const H1=hud.querySelector('#pa-s'),H2=hud.querySelector('#pa-l'),H3=hud.querySelector('#pa-c'),BM=hud.querySelector('#pa-mute');let hudKey='';host.style.position='relative';host.innerHTML='';host.append(cv,hud,ov);
let W=360,H=560,dpr=1,g=null,raf=0,last=0,diff=1,paused=false,modeId='attention',fx=[],pops=[],beams=[],shake=0,S={};
const ptr={x:0,y:0,down:false,seen:false},keys=new Set();
function resize(){dpr=Math.min(2,devicePixelRatio||1);W=Math.max(300,host.clientWidth||360);H=Math.round(Math.max(480,Math.min(740,innerHeight*.8)));cv.width=W*dpr;cv.height=H*dpr;cv.style.height=H+'px';c.setTransform(dpr,0,0,dpr,0,0)}
addEventListener('resize',()=>{if(!cont.classList.contains('hidden'))resize()});
const burst=(x,y,col,n=16,sp=160)=>{for(let i=0;i<n;i++){const a=rnd(0,6.28),s=rnd(.3,1)*sp;fx.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-40,l:rnd(.4,.9),m:.9,col,r:rnd(2,5)})}};
const pop=(x,y,t,col='#fff')=>pops.push({x,y,t,col,l:1});
function drawFX(dt){for(let i=fx.length-1;i>=0;i--){const p=fx[i];p.l-=dt;if(p.l<=0){fx.splice(i,1);continue}p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=300*dt;c.globalAlpha=Math.min(1,p.l/p.m*1.5);c.fillStyle=p.col;c.beginPath();c.arc(p.x,p.y,p.r,0,7);c.fill()}
 c.globalAlpha=1;for(let i=pops.length-1;i>=0;i--){const p=pops[i];p.l-=dt;if(p.l<=0){pops.splice(i,1);continue}p.y-=40*dt;c.globalAlpha=Math.min(1,p.l*2);c.fillStyle=p.col;c.font='900 20px "Space Grotesk",system-ui';c.textAlign='center';c.fillText(p.t,p.x,p.y)}
 c.globalAlpha=1;for(let i=beams.length-1;i>=0;i--){const b=beams[i];b.l-=dt;if(b.l<=0){beams.splice(i,1);continue}c.strokeStyle=b.col;c.lineWidth=4*b.l/.18;c.shadowColor=b.col;c.shadowBlur=14;c.beginPath();c.moveTo(b.x1,b.y1);c.lineTo(b.x2,b.y2);c.stroke();c.shadowBlur=0}}
function hero(x,y,s,t,col,look=0,air=false){c.save();c.translate(x,y);c.scale(s,s);const w=Math.sin(t*12),b=air?-3:Math.abs(w)*-2;c.fillStyle='#0006';c.beginPath();c.ellipse(0,2,17,5,0,0,7);c.fill();c.strokeStyle='#0a2236';c.lineWidth=6;c.lineCap='round';c.beginPath();c.moveTo(-7,-14);c.lineTo(-7+(air?-3:w*6),-1);c.moveTo(7,-14);c.lineTo(7+(air?3:-w*6),-1);c.stroke();
 c.fillStyle=col;c.beginPath();c.ellipse(0,-28+b,16,19,0,0,7);c.fill();c.fillStyle='#ffffff30';c.beginPath();c.ellipse(-5,-35+b,6,9,-.4,0,7);c.fill();c.fillStyle='#071827';c.beginPath();c.ellipse(look*3,-32+b,11,9,0,0,7);c.fill();c.fillStyle='#8ff';c.fillRect(look*3-7,-35+b,5,6);c.fillRect(look*3+2,-35+b,5,6);
 c.strokeStyle=col;c.lineWidth=2.5;c.beginPath();c.moveTo(0,-47+b);c.quadraticCurveTo(Math.sin(t*5)*6,-54+b,Math.sin(t*5)*8,-58+b);c.stroke();c.fillStyle='#ffd36f';c.beginPath();c.arc(Math.sin(t*5)*8,-59+b,3.5,0,7);c.fill();c.restore()}
const rr=(x,y,w,h,r)=>{c.beginPath();c.roundRect?c.roundRect(x,y,w,h,r):c.rect(x,y,w,h)};
const txt=(t,x,y,sz=16,col='#fff',al='center')=>{c.font=`900 ${sz}px "Space Grotesk",system-ui,sans-serif`;c.textAlign=al;c.fillStyle=col;c.fillText(t,x,y)};
const bar=(x,y,w,h,f,col)=>{c.fillStyle='#0008';rr(x,y,w,h,h/2);c.fill();c.fillStyle=col;rr(x,y,Math.max(h,w*Math.max(0,Math.min(1,f))),h,h/2);c.fill()};
function sky(a,b){const gr=c.createLinearGradient(0,0,0,H);gr.addColorStop(0,a);gr.addColorStop(1,b);c.fillStyle=gr;c.fillRect(0,0,W,H)}
/* ---------- base de joc ---------- */
function base(id){return{id,t:0,score:0,lives:3,combo:1,hits:0,miss:0,ph:'play',ptime:0,rts:[],started:performance.now()}}
function hit(o,pts,x,y){o.hits++;o.combo=Math.min(8,o.combo+.5);const p=Math.round(pts*o.combo);o.score+=p;pop(x,y,'+'+p,'#7ff5b0');burst(x,y,'#7ff5b0');SFX.ok()}
function fail(o,x,y,loseLife=true){o.miss++;o.combo=1;if(loseLife)o.lives--;shake=1;SFX.bad();burst(x,y,'#ff6b6b',14);if(loseLife&&o.lives<=0)setTimeout(()=>finish(false),500)}
function finish(win){if(!g||g.done)return;g.done=true;g.ph='end';const o=g,dur=Math.max(1,Math.round((performance.now()-o.started)/1000)),tot=o.hits+o.miss,acc=tot?Math.round(o.hits/tot*100):0,key='pa-best-'+o.id,best=+(localStorage.getItem(key)||0),nb=o.score>best;if(nb)localStorage.setItem(key,o.score);
 try{const P=window.PF;if(P?.data){const r={id:Date.now().toString(36),mode:INFO[o.id].t,score:o.score,duration:dur,hits:o.hits,misses:o.miss,level:diff,date:new Date().toISOString().slice(0,10),at:new Date().toISOString()};P.data.games.push(r);P.addActivity('game','Partida completada',`${INFO[o.id].t} · ${o.score} punts`);P.save();P.refreshGameHistory()}}catch(e){console.warn(e)}
 const st=acc>=85?3:acc>=60?2:1;if(win)SFX.win();const rt=o.rts.length?Math.round(o.rts.reduce((a,b)=>a+b,0)/o.rts.length)+' ms':'—';
 panel(`<div class=pa-star>${'★'.repeat(st)}${'☆'.repeat(3-st)}</div><h2>${win?'Missió completada!':'Fi de la partida'}</h2><div><span class=pa-stat><b>${o.score}</b>punts</span><span class=pa-stat><b>${acc}%</b>precisió</span><span class=pa-stat><b>${o.hits}/${tot}</b>encerts</span><span class=pa-stat><b>${dur}s</b>temps</span>${o.extra?`<span class=pa-stat><b>${o.extra}</b>detall</span>`:''}${o.id==='attention'?`<span class=pa-stat><b>${rt}</b>reacció mitjana</span>`:''}</div><p>${nb?'🏆 Nou rècord personal!':'Rècord: '+Math.max(best,o.score)}. Resultat desat a l’historial.</p><button class=pa-go data-a=retry>Tornar a jugar</button><button class="pa-go sec" data-a=exit>Menú</button>`)}
/* ---------- JOC 1: PATRONS ---------- */
function mkVisual(){const o=base('visual'),n=[4,6,9][diff-1],cols=n===4?2:3,rows=n/cols,sz=Math.min(120,(W-60)/cols-12,(H*.52)/rows-12),pads=[];
 for(let i=0;i<n;i++){const r=Math.floor(i/cols),k=i%cols;pads.push({x:W/2+(k-(cols-1)/2)*(sz+14),y:H*.2+sz/2+r*(sz+14),lit:0,col:PAL[i]})}
 Object.assign(o,{pads,sz,round:0,seq:[],k:0,show:0,tl:0,rev:false,hx:W/2,hy:H-50,air:0,banner:''});
 o.start=()=>{const len=2+diff+o.round;o.seq=Array.from({length:len},()=>ri(0,n-1));o.rev=o.round>=3&&o.round%2===1;o.k=0;o.show=0;o.ph='show';o.ptime=-.8;o.banner=o.rev?'AL REVÉS!':'Mira…'};
 o.tap=(x,y)=>{if(o.ph!=='input')return;const i=pads.findIndex(p=>Math.abs(x-p.x)<sz/2+6&&Math.abs(y-p.y)<sz/2+6);if(i>=0)o.press(i)};
 o.press=i=>{if(o.ph!=='input')return;const p=pads[i],exp=o.rev?o.seq[o.seq.length-1-o.k]:o.seq[o.k];p.lit=.4;o.air=1;o.tx=p.x;o.ty=p.y+sz/2+14;
  if(i===exp){SFX.note(i);hit(o,10,p.x,p.y);o.k++;if(o.k>=o.seq.length){o.ph='gap';o.ptime=0;o.score+=o.seq.length*5;pop(W/2,H*.12,'Perfecte!','#ffd36f');o.round++;o.banner='Ronda '+(o.round+1)}}
  else{fail(o,p.x,p.y);if(o.lives>0){o.ph='gap';o.ptime=0;o.banner='Torna-ho a provar'}}};
 o.update=dt=>{o.ptime+=dt;pads.forEach(p=>p.lit=Math.max(0,p.lit-dt));o.air=Math.max(0,o.air-dt*2.2);o.hx+=((o.tx??W/2)-o.hx)*Math.min(1,dt*10);o.hy+=((o.ty??H-50)-o.hy)*Math.min(1,dt*10);
  if(o.ph==='show'&&o.ptime>0){const step=Math.max(.34,.75-.05*o.round-.08*diff);const idx=Math.floor(o.ptime/step),f=o.ptime/step-idx;if(idx>=o.seq.length){o.ph='input';o.tl=5+o.seq.length*1.3;o.banner=o.rev?'Repeteix AL REVÉS':'Ara tu!';o.tx=W/2;o.ty=H-50}else if(idx!==o.show-1+0&&f<.12&&o.last!==idx){o.last=idx;o.show=idx+1;pads[o.seq[idx]].lit=step*.8;SFX.note(o.seq[idx])}}
  if(o.ph==='input'){o.tl-=dt;if(o.tl<=0){fail(o,W/2,H/2);if(o.lives>0){o.ph='gap';o.ptime=0;o.banner='Temps esgotat'}}}
  if(o.ph==='gap'&&o.ptime>1.1){if(o.round>=8)finish(true);else{o.last=-1;o.start()}}};
 o.draw=()=>{sky('#1a1240','#06101d');c.fillStyle='#ffffff10';for(let i=0;i<5;i++){c.fillRect(W*(.1+i*.2),0,10,H)}
  pads.forEach((p,i)=>{const l=p.lit>0;c.save();if(l){c.shadowColor=p.col;c.shadowBlur=36}c.fillStyle=l?p.col:p.col+'33';rr(p.x-sz/2,p.y-sz/2,sz,sz,18);c.fill();c.strokeStyle=p.col;c.lineWidth=l?4:2;c.stroke();c.restore();txt(i+1,p.x,p.y+6,18,l?'#0008':'#fff6')});
  hero(o.hx,o.hy-(o.air>0?Math.sin(o.air*3.14)*30:0),1.1,o.t,'#6fe7ff',0,o.air>0);txt(o.banner,W/2,H*.12,24,'#ffd36f');
  for(let i=0;i<o.seq.length;i++){c.fillStyle=i<o.k?'#7ff5b0':'#ffffff33';c.beginPath();c.arc(W/2+(i-(o.seq.length-1)/2)*16,H*.16,5,0,7);c.fill()}
  if(o.ph==='input')bar(W*.2,H-14,W*.6,8,o.tl/(5+o.seq.length*1.3),'#6fe7ff')};
 o.key=e=>{const n=+e.key;if(n>=1&&n<=pads.length)o.press(n-1)};o.start();return o}
/* ---------- JOC 2: NÚMEROS ---------- */
function mkNumbers(){const o=base('numbers'),L=diff===3?4:3;Object.assign(o,{L,lane:Math.floor(L/2),hx:W/2,round:0,seq:[],k:0,rows:[],spawn:0,msg:'',lava:Array.from({length:14},()=>({x:rnd(0,W),y:rnd(0,H*.2),r:rnd(3,9),s:rnd(10,30)}))});
 const lx=(lane,p)=>W/2+(lane-(L-1)/2)*(W*.78/L)*(.28+.72*p),py=p=>H*.2+Math.pow(p,1.7)*H*.64;
 o.begin=()=>{const len=2+diff+o.round;o.seq=shuf([1,2,3,4,5,6,7,8,9]).slice(0,len);o.k=0;o.rows=[];o.ph='memo';o.ptime=0;o.memT=1.8+len*.9;o.spawn=0};
 o.mkRow=()=>{const need=o.seq[o.k],d=Array.from({length:L},()=>0),ok=ri(0,L-1);const pool=shuf([...o.seq.filter(x=>x!==need),...[1,2,3,4,5,6,7,8,9].filter(x=>!o.seq.includes(x))]);for(let i=0;i<L;i++)d[i]=i===ok?need:pool[i%pool.length];o.rows.push({p:0,d,ok,k:o.k,done:false})};
 o.move=v=>{o.lane=Math.max(0,Math.min(L-1,o.lane+v));SFX.sw()};
 let sx=null;o.down=(x)=>{sx=x};o.up=x=>{if(sx==null)return;const dx=x-sx;sx=null;if(Math.abs(dx)>30)o.move(dx>0?1:-1);else o.lane=Math.max(0,Math.min(L-1,Math.floor((x-W*.11)/(W*.78/L))))};
 o.key=e=>{if(/arrowleft|^a$/i.test(e.key))o.move(-1);if(/arrowright|^d$/i.test(e.key))o.move(1)};
 o.update=dt=>{o.ptime+=dt;o.hx+=(lx(o.lane,1)-o.hx)*Math.min(1,dt*14);o.lava.forEach(b=>{b.y-=b.s*dt;if(b.y<-10){b.y=H*.2;b.x=rnd(0,W)}});
  if(o.ph==='memo'&&o.ptime>o.memT){o.ph='run';o.ptime=0}
  if(o.ph==='run'){const sp=.36+.05*o.round+.06*diff;o.spawn-=dt;if(o.spawn<=0&&!o.rows.some(r=>!r.done&&r.k===o.k&&r.p<.45)&&o.rows.filter(r=>!r.done).length<3){o.mkRow();o.spawn=1.1}
   for(const r of o.rows){if(r.done)continue;r.p+=dt*sp;if(r.p>=1){r.done=true;const hx=lx(o.lane,1);if(r.k===o.k){if(o.lane===r.ok){hit(o,12,hx,py(1)-40);o.k++;o.rows=o.rows.filter(q=>q.done);if(o.k>=o.seq.length){o.score+=o.seq.length*8;pop(W/2,H*.3,'Seqüència completa!','#ffd36f');o.round++;if(o.round>=5)setTimeout(()=>finish(true),700);else{o.ph='gap';o.ptime=0}}}else{fail(o,hx,py(1)-40);o.rows=[]}}}}
   o.rows=o.rows.filter(r=>!r.done||r.p<1.01)}
  if(o.ph==='gap'&&o.ptime>1.2)o.begin()};
 o.draw=()=>{sky('#3a0d0d','#150505');c.fillStyle='#ff6a1a';c.beginPath();c.moveTo(W*.3,H*.2);c.lineTo(W*.42,H*.04);c.lineTo(W*.58,H*.04);c.lineTo(W*.7,H*.2);c.fill();c.fillStyle='#ffb03a';o.lava.forEach(b=>{c.globalAlpha=.7;c.beginPath();c.arc(b.x,b.y,b.r,0,7);c.fill()});c.globalAlpha=1;
  c.fillStyle='#2b2f45';c.beginPath();c.moveTo(W/2-W*.1,py(0));c.lineTo(W/2+W*.1,py(0));c.lineTo(W*.9,py(1)+30);c.lineTo(W*.1,py(1)+30);c.fill();c.strokeStyle='#ffffff30';c.lineWidth=2;for(let i=1;i<L;i++){c.beginPath();c.moveTo(W/2+(i-L/2)*(W*.78/L)*.28,py(0));c.lineTo(W/2+(i-L/2)*(W*.78/L),py(1)+30);c.stroke()}
  for(const r of o.rows){const p=Math.min(1,r.p),y=py(p),s=.35+.85*p;for(let i=0;i<L;i++){const x=lx(i,p);c.save();c.shadowColor='#6fe7ff';c.shadowBlur=14*s;c.fillStyle='#16435f';c.beginPath();c.arc(x,y-30*s,30*s,0,7);c.fill();c.strokeStyle='#6fe7ff';c.lineWidth=3;c.stroke();c.restore();txt(r.d[i],x,y-30*s+9*s,28*s)}}
  hero(o.hx,py(1)+22,1.3,o.t*(o.ph==='run'?1:.3),'#ffd36f',(o.lane-(L-1)/2)*.6);
  for(let i=0;i<o.seq.length;i++){c.fillStyle=i<o.k?'#7ff5b0':'#ffffff33';c.beginPath();c.arc(W/2+(i-(o.seq.length-1)/2)*16,H*.06+40,5,0,7);c.fill()}
  if(o.ph==='memo'){c.fillStyle='#000a';c.fillRect(0,H*.28,W,H*.3);txt('Memoritza l’ordre',W/2,H*.28+34,18,'#ffd36f');txt(o.seq.join('  '),W/2,H*.28+100,Math.min(64,W/(o.seq.length*1.2)),'#fff');bar(W*.2,H*.28+H*.3-22,W*.6,8,1-o.ptime/o.memT,'#ffd36f')}
  if(o.ph==='run')txt(`Següent: ${o.k+1}º número`,W/2,H*.06+22,14,'#ffd36f')};
 o.begin();return o}
/* ---------- JOC 3: PARAULES ---------- */
function mkWords(){const o=base('words'),N=5+diff*2,all=shuf(BANK),tg=all.slice(0,N),fo=all.slice(N,N*2);
 Object.assign(o,{N,tg,fo,ph:'memo',ptime:0,memT:N*1.3+3,bx:W*.2,by:H*.6,items:[],queue:shuf([...tg.map(w=>({w,t:1})),...fo.map(w=>({w,t:0}))]),sp:0,seen:0,cap:0});
 o.skip=()=>{if(o.ph==='memo'){o.ph='sail';o.ptime=0;SFX.sw()}};
 o.tap=(x,y)=>{if(o.ph==='memo'&&y>H-70&&Math.abs(x-W/2)<90)o.skip()};
 o.key=e=>{if(e.key==='Enter'||e.key===' ')o.skip()};
 o.update=dt=>{o.ptime+=dt;if(o.ph==='memo'&&o.ptime>o.memT)o.skip();
  if(o.ph==='sail'){let mx=0,my=0;if(keys.has('ArrowLeft')||keys.has('a'))mx--;if(keys.has('ArrowRight')||keys.has('d'))mx++;if(keys.has('ArrowUp')||keys.has('w'))my--;if(keys.has('ArrowDown')||keys.has('s'))my++;
   if(mx||my){o.bx+=mx*270*dt;o.by+=my*270*dt}else if(ptr.seen){o.bx+=(ptr.x-o.bx)*Math.min(1,dt*7);o.by+=(ptr.y-o.by)*Math.min(1,dt*7)}
   o.bx=Math.max(40,Math.min(W-40,o.bx));o.by=Math.max(H*.22,Math.min(H-50,o.by));
   o.sp-=dt;if(o.sp<=0&&o.queue.length){const q=o.queue.shift();o.items.push({...q,x:W+60,y:rnd(H*.26,H-60),ph:rnd(0,6)});o.sp=Math.max(.5,1.15-.14*diff)}
   const v=95+35*diff;for(let i=o.items.length-1;i>=0;i--){const it=o.items[i];it.x-=v*dt;const w=c.measureText?Math.max(60,it.w.length*11+26):70;
    if(Math.abs(it.x-o.bx)<w/2+26&&Math.abs(it.y-o.by)<34){o.items.splice(i,1);if(it.t){hit(o,15,it.x,it.y);o.cap++}else fail(o,it.x,it.y)}else if(it.x<-80){o.items.splice(i,1);if(it.t){o.miss++;o.combo=1;pop(60,it.y,'Perduda','#ff9f5a')}}}
   if(!o.queue.length&&!o.items.length){o.extra=o.cap+'/'+o.N;setTimeout(()=>finish(o.lives>0),400);o.ph='wait'}}};
 o.draw=()=>{sky('#0a4a7a','#082a4a');c.fillStyle='#ffffff14';for(let i=0;i<5;i++){c.beginPath();for(let x=0;x<=W;x+=14)c.lineTo(x,H*.3+i*H*.14+Math.sin(x*.04+o.t*2+i)*7);c.stroke()}
  c.fillStyle='#ffd36f';c.beginPath();c.arc(W*.85,H*.12,28,0,7);c.fill();
  if(o.ph==='memo'){txt('Memoritza aquestes paraules',W/2,H*.16,20,'#ffd36f');const cols=W<460?3:4,rows=Math.ceil(N/cols),cw=(W-30)/cols,chh=Math.min(70,(H*.55)/rows);tg.forEach((w,i)=>{const x=15+(i%cols)*cw+cw/2,y=H*.24+Math.floor(i/cols)*(chh+10)+chh/2+Math.sin(o.t*2+i)*3;c.fillStyle='#16435f';rr(x-cw/2+5,y-chh/2,cw-10,chh,16);c.fill();c.strokeStyle='#6fe7ff';c.lineWidth=2;c.stroke();txt(w,x,y+7,Math.min(22,cw/6),'#fff')});bar(W*.2,H-92,W*.6,8,1-o.ptime/o.memT,'#ffd36f');c.fillStyle='#18b8c5';rr(W/2-90,H-70,180,46,14);c.fill();txt('Ja les sé ▶',W/2,H-40,17)}
  else{for(const it of o.items){const w=Math.max(60,it.w.length*11+26),b=Math.sin(o.t*3+it.ph)*5;c.fillStyle='#ff6a4a';c.beginPath();c.arc(it.x-w/2+8,it.y+b+22,6,0,7);c.fill();c.fillStyle='#fff';rr(it.x-w/2,it.y-18+b,w,38,19);c.fill();c.strokeStyle='#ff6a4a';c.lineWidth=3;c.stroke();txt(it.w,it.x,it.y+6+b,17,'#0a2236')}
   c.save();c.translate(o.bx,o.by+Math.sin(o.t*4)*3);c.fillStyle='#b4691f';c.beginPath();c.moveTo(-38,0);c.lineTo(38,0);c.lineTo(26,22);c.lineTo(-26,22);c.fill();c.restore();hero(o.bx,o.by+2,.9,o.t,'#c79cff');txt(`Recollides ${o.cap}/${N}`,W/2,H*.1+20,14,'#ffd36f')}};
 return o}
/* ---------- JOC 4: ATENCIÓ ---------- */
function mkAttention(){const o=base('attention'),dur=50,cols=4,rows=3,RULES=[{s:'d',c:'g',t:'Dispara NOMÉS els ◆ verds'},{s:'c',c:'b',t:'CANVI! Ara NOMÉS els ● blaus'},{s:'d',c:'o',t:'CANVI! Ara NOMÉS els ◆ taronja'}],COL={g:'#5dff9a',o:'#ff9f5a',b:'#5ab0ff'};
 const ww=Math.min(W-30,520),wh=Math.min(95,(H*.5)/rows),cell=i=>({x:W/2-ww/2+(i%cols+.5)*ww/cols,y:H*.18+Math.floor(i/cols)*(wh+12)+wh/2});
 Object.assign(o,{dur,rule:0,items:[],spawn:.6,flash:0,hx:W/2,look:0});
 o.fire=i=>{if(o.ph!=='play')return;const it=o.items.find(q=>q.i===i),p=cell(i);beams.push({x1:o.hx,y1:H-60,x2:p.x,y2:p.y,col:'#7ceaff',l:.18});o.look=Math.sign(p.x-o.hx);if(!it){return}
  const R=RULES[o.rule],ok=it.s===R.s&&it.c===R.c;o.items=o.items.filter(q=>q!==it);if(ok){o.rts.push((o.t-it.born)*1000);hit(o,10,p.x,p.y)}else fail(o,p.x,p.y)};
 o.tap=(x,y)=>{for(let i=0;i<cols*rows;i++){const p=cell(i);if(Math.abs(x-p.x)<ww/cols/2&&Math.abs(y-p.y)<wh/2+6){o.fire(i);return}}};
 o.key=e=>{const m='123456789qwer',i=m.indexOf(e.key.toLowerCase());if(i>=0&&i<cols*rows)o.fire(i)};
 o.update=dt=>{const prev=o.rule;o.rule=Math.min(RULES.length-1,Math.floor(o.t/(dur/3)));if(o.rule!==prev){o.flash=1.8;SFX.sw();pop(W/2,H*.12,'Nova regla','#ffd36f')}o.flash=Math.max(0,o.flash-dt);
  o.spawn-=dt;const life=Math.max(.8,2.1-.25*diff-o.t/60);if(o.spawn<=0){o.spawn=Math.max(.45,1-.12*diff-o.t/120);const free=[...Array(cols*rows).keys()].filter(i=>!o.items.some(q=>q.i===i));if(free.length){const R=RULES[o.rule],isT=Math.random()<.45,i=pick(free);let s,col;if(isT){s=R.s;col=R.c}else{do{s=pick(['d','c']);col=pick(['g','o','b'])}while(s===R.s&&col===R.c)}o.items.push({i,s,c:col,born:o.t,life})}}
  for(let k=o.items.length-1;k>=0;k--){const it=o.items[k];if(o.t-it.born>it.life){const R=RULES[o.rule];if(it.s===R.s&&it.c===R.c){o.miss++;o.combo=1;pop(cell(it.i).x,cell(it.i).y,'Perdut','#ff9f5a')}o.items.splice(k,1)}}
  if(o.t>=dur&&o.ph==='play'){o.ph='end';finish(o.lives>0||true)}};
 o.draw=()=>{sky('#10263f','#05101c');c.fillStyle='#0d1a2c';rr(W/2-ww/2-14,H*.18-wh/2-10,ww+28,rows*(wh+12)+16,16);c.fill();
  for(let i=0;i<cols*rows;i++){const p=cell(i);c.fillStyle='#16304a';rr(p.x-ww/cols/2+5,p.y-wh/2,ww/cols-10,wh,10);c.fill();c.fillStyle='#ffffff40';c.font='700 11px system-ui';c.textAlign='left';c.fillText('1234567 89qwer'.replace(' ','')[i],p.x-ww/cols/2+10,p.y-wh/2+14)}
  for(const it of o.items){const p=cell(it.i),f=1-(o.t-it.born)/it.life,col=COL[it.c];c.save();c.translate(p.x,p.y);c.scale(Math.min(1,(o.t-it.born)*8+.2),Math.min(1,(o.t-it.born)*8+.2));c.shadowColor=col;c.shadowBlur=22;c.fillStyle=col;c.beginPath();if(it.s==='d'){c.moveTo(0,-26);c.lineTo(26,0);c.lineTo(0,26);c.lineTo(-26,0)}else c.arc(0,0,24,0,7);c.fill();c.restore();c.strokeStyle='#fff8';c.lineWidth=3;c.beginPath();c.arc(p.x,p.y,34,-1.57,-1.57+6.28*f);c.stroke()}
  const R=RULES[o.rule];c.fillStyle=o.flash>0&&Math.floor(o.t*8)%2?'#ffd36f':'#0b263c';rr(W/2-Math.min(W-20,340)/2,H*.64,Math.min(W-20,340),44,14);c.fill();txt(R.t,W/2,H*.64+28,Math.min(16,W/22),o.flash>0&&Math.floor(o.t*8)%2?'#0a2236':'#ffd36f');
  o.hx+=(W/2-o.hx)*.1;hero(W/2,H-24,1.5,o.t,'#7df59b',o.look);bar(W*.15,H-10,W*.7,6,1-o.t/dur,'#6fe7ff')};
 return o}

/* ---------- JOC 5: ILLA DELS ENCÀRRECS (món obert) ---------- */
const ITEMS=[['🍎','poma'],['🔑','clau'],['📖','llibre'],['🐟','peix'],['🌸','flor'],['🍞','pa'],['⚓','àncora'],['🕯️','espelma'],['🧭','brúixola'],['🪙','moneda'],['🥕','pastanaga'],['🎣','canya']];
const WW=2200,WH=1600,CX=1100,CY=800,RX=1000,RY=700;
const PLACES=[{n:'al Far',s:'Far',x:1100,y:250,c:'#ff6b8b'},{n:'al Molí',s:'Molí',x:1850,y:600,c:'#ffd36f'},{n:'al Mercat',s:'Mercat',x:1650,y:1230,c:'#3fbf6a'},{n:'a la Cova',s:'Cova',x:650,y:1280,c:'#a679ff'},{n:'a la Torre',s:'Torre',x:380,y:640,c:'#3fb8e0'},{n:'al Port',s:'Port',x:1150,y:1330,c:'#ff9f5a'}];
const land=(x,y,m=0)=>((x-CX)/(RX-m))**2+((y-CY)/(RY-m))**2<1;
function mkWorld(){const o=base('world');let seed=11;const R=()=>(seed=(seed*16807)%2147483647)/2147483647;const trees=[];
 for(let i=0;i<400&&trees.length<110;i++){const x=R()*WW,y=R()*WH;if(!land(x,y,70)||Math.hypot(x-CX,y-CY)<150||PLACES.some(p=>Math.hypot(x-p.x,y-p.y)<170))continue;trees.push({x,y,s:.8+R()*.7})}
 Object.assign(o,{px:CX,py:CY+90,face:1,mv:0,camx:CX-W/2,camy:CY+90-H/2,round:0,orders:[],items:[],carry:null,ph:'brief',ptime:0,tl:0,hints:0,cd:0,jo:null,showHint:0,extra:'0 rondes',bf:Array.from({length:16},()=>({x:rnd(300,1900),y:rnd(300,1300),p:rnd(0,6)}))});
 o.free=(x,y)=>land(x,y,30)&&!trees.some(t=>Math.hypot(x-t.x,y-t.y)<20*t.s+12)&&!PLACES.some(p=>Math.abs(x-p.x)<62&&y>p.y-70&&y<p.y+8);
 o.begin=()=>{const n=Math.min(6,1+diff+o.round),its=shuf(ITEMS),pl=shuf(PLACES),pts=[];o.orders=Array.from({length:n},(_,i)=>({it:its[i],pl:pl[i],done:false}));o.items=[];o.carry=null;
  const spot=()=>{for(let k=0;k<300;k++){const x=rnd(200,WW-200),y=rnd(200,WH-200);if(!land(x,y,170)||Math.hypot(x-CX,y-CY)<220||PLACES.some(p=>Math.hypot(x-p.x,y-p.y)<190)||pts.some(q=>Math.hypot(x-q[0],y-q[1])<150)||trees.some(t=>Math.hypot(x-t.x,y-t.y)<45))continue;pts.push([x,y]);return[x,y]}return[CX+rnd(-300,300),CY+200]};
  for(let i=0;i<n*2;i++){const[x,y]=spot();o.items.push({it:its[i],x,y,home:[x,y],got:false})}
  o.px=CX;o.py=CY+90;o.ph='brief';o.ptime=0;o.briefT=4+n*2.2;o.tl=45+n*28;o.hints=0;o.showHint=0;o.extra=o.round+' rondes'};
 o.go=()=>{if(o.ph==='brief'){o.ph='play';o.ptime=0;SFX.ok()}};
 o.drop=()=>{if(o.ph!=='play'||!o.carry)return;const it=o.carry;it.got=false;it.x=o.px;it.y=o.py;o.carry=null;o.cd=1;SFX.sw()};
 o.hint=()=>{if(o.ph!=='play'||o.hints>=2)return;o.hints++;o.score=Math.max(0,o.score-10);o.showHint=4;o.combo=1;pop(W/2,H*.5,'Pista: -10 punts','#ff9f5a');SFX.sw()};
 const btnD=()=>[W-48,H-60],btnH=()=>[W-48,H-140],near=(x,y,b)=>Math.hypot(x-b[0],y-b[1])<40;
 o.down=(x,y)=>{if(!near(x,y,btnD())&&!near(x,y,btnH()))o.jo={x,y}};o.up=()=>{o.jo=null};
 o.tap=(x,y)=>{if(o.ph==='brief')return o.go();if(near(x,y,btnD()))o.drop();else if(near(x,y,btnH()))o.hint()};
 o.key=e=>{const k=e.key.toLowerCase();if(k==='e')o.drop();if(k==='r')o.hint();if(k==='enter'||k===' ')o.go()};
 o.update=dt=>{o.ptime+=dt;o.cd=Math.max(0,o.cd-dt);o.showHint=Math.max(0,o.showHint-dt);o.camx+=(o.px-W/2-o.camx)*Math.min(1,dt*6);o.camy+=(o.py-H/2-o.camy)*Math.min(1,dt*6);
  if(o.ph==='brief'){if(o.ptime>o.briefT)o.go();return}
  if(o.ph==='gap'){if(o.ptime>1.8){o.round++;if(o.round>=4)finish(true);else o.begin()}return}
  if(o.ph!=='play')return;o.tl-=dt;
  let mx=0,my=0;const K=k=>keys.has(k);if(K('a')||K('ArrowLeft'))mx--;if(K('d')||K('ArrowRight'))mx++;if(K('w')||K('ArrowUp'))my--;if(K('s')||K('ArrowDown'))my++;let run=K('Shift')?1.5:1;
  if(o.jo&&ptr.down){const dx=ptr.x-o.jo.x,dy=ptr.y-o.jo.y,l=Math.hypot(dx,dy);if(l>12){const f=Math.min(1,l/60);mx=dx/l*f;my=dy/l*f;run=1+Math.max(0,f-.7)*1.6}}
  const l=Math.hypot(mx,my);if(l>1){mx/=l;my/=l}o.mv=l>.05?1:0;if(o.mv&&Math.abs(mx)>.1)o.face=Math.sign(mx);
  const sp=170*run,nx=o.px+mx*sp*dt,ny=o.py+my*sp*dt;if(o.free(nx,o.py))o.px=nx;if(o.free(o.px,ny))o.py=ny;
  const sx=o.px-o.camx,sy=o.py-o.camy-70;
  if(!o.carry){if(o.cd<=0)for(const it of o.items)if(!it.got&&Math.hypot(o.px-it.x,o.py-it.y)<34){o.carry=it;it.got=true;SFX.sw();pop(sx,sy,'Agafat '+it.it[1],'#fff');break}}
  else if(o.cd<=0){const p=PLACES.find(q=>Math.hypot(o.px-q.x,o.py-(q.y+30))<85);if(p){const od=o.orders.find(q=>!q.done&&q.it===o.carry.it&&q.pl===p);
   if(od){od.done=true;o.items=o.items.filter(i=>i!==o.carry);o.carry=null;o.cd=.5;hit(o,25,sx,sy);burst(sx,sy+40,p.c,24);if(o.orders.every(q=>q.done)){const b=Math.round(o.tl)*2;o.score+=b;pop(W/2,H*.35,'Ronda superada! +'+b,'#ffd36f');SFX.win();o.ph='gap';o.ptime=0}}
   else{const it=o.carry;it.got=false;it.x=it.home[0];it.y=it.home[1];o.carry=null;o.cd=1.2;fail(o,sx,sy);pop(sx,sy-30,'No és aquí! L’objecte torna al seu lloc','#ff9f5a')}}}
  if(o.tl<=0&&o.ph==='play'){o.miss+=o.orders.filter(q=>!q.done).length;o.lives--;shake=1;SFX.bad();pop(W/2,H*.4,'Temps esgotat','#ff9f5a');if(o.lives<=0){finish(false);return}o.ph='gap';o.ptime=0}};
 o.card=(title,sub)=>{const w=Math.min(W-24,430),lh=34,h=84+o.orders.length*lh,x=W/2-w/2,y=Math.max(64,H/2-h/2);c.fillStyle='#061422f2';rr(x,y,w,h,20);c.fill();c.strokeStyle='#6de7ff';c.lineWidth=2;c.stroke();txt(title,W/2,y+32,20,'#ffd36f');o.orders.forEach((od,i)=>txt(`${i+1}. ${od.it[0]} ${od.it[1]}  →  ${od.pl.n}`,W/2,y+68+i*lh,Math.min(17,w/20),od.done?'#7ff5b0':'#fff'));txt(sub,W/2,y+h-14,12,'#9fd')};
 o.draw=()=>{c.fillStyle='#0c5a8a';c.fillRect(0,0,W,H);const cx=o.camx,cy=o.camy;c.save();c.translate(-cx,-cy);
  c.strokeStyle='#ffffff26';c.lineWidth=3;for(let i=0;i<3;i++){const d=Math.sin(o.t*1.5+i)*10+i*50;c.beginPath();c.ellipse(CX,CY,RX+60+d,RY+60+d,0,0,7);c.stroke()}
  c.fillStyle='#e8d28a';c.beginPath();c.ellipse(CX,CY,RX+34,RY+34,0,0,7);c.fill();c.save();c.beginPath();c.ellipse(CX,CY,RX,RY,0,0,7);c.clip();
  const x0=Math.floor(cx/80)*80,y0=Math.floor(cy/80)*80;for(let x=x0;x<cx+W+80;x+=80)for(let y=y0;y<cy+H+80;y+=80){c.fillStyle=((x+y)/80)&1?'#5fc24a':'#68cc52';c.fillRect(x,y,80,80)}
  c.strokeStyle='#d9c48a';c.lineWidth=34;c.lineCap='round';PLACES.forEach(p=>{c.beginPath();c.moveTo(CX,CY);c.lineTo(p.x,p.y+40);c.stroke()});c.fillStyle='#cdb77a';c.beginPath();c.arc(CX,CY,70,0,7);c.fill();c.restore();
  PLACES.forEach(p=>{c.strokeStyle=p.c;c.lineWidth=4;c.globalAlpha=.55+Math.sin(o.t*3)*.25;c.setLineDash([12,10]);c.beginPath();c.arc(p.x,p.y+30,85,0,7);c.stroke();c.setLineDash([]);c.globalAlpha=1});
  const D=[];trees.forEach(t=>D.push([t.y,()=>{c.fillStyle='#7a4a22';c.fillRect(t.x-5*t.s,t.y-22*t.s,10*t.s,24*t.s);c.fillStyle='#2f9a3c';c.beginPath();c.arc(t.x,t.y-40*t.s,26*t.s,0,7);c.fill();c.fillStyle='#3cb84a';c.beginPath();c.arc(t.x-6*t.s,t.y-46*t.s,16*t.s,0,7);c.fill()}]));
  PLACES.forEach(p=>D.push([p.y,()=>{c.fillStyle='#0003';c.beginPath();c.ellipse(p.x,p.y+4,70,12,0,0,7);c.fill();c.fillStyle='#f1e2c0';c.fillRect(p.x-52,p.y-66,104,66);c.fillStyle=p.c;c.beginPath();c.moveTo(p.x-66,p.y-64);c.lineTo(p.x,p.y-118);c.lineTo(p.x+66,p.y-64);c.fill();c.fillStyle='#6b4423';c.fillRect(p.x-12,p.y-34,24,34);c.fillStyle='#0a2236dd';rr(p.x-48,p.y-150,96,26,13);c.fill();txt(p.s,p.x,p.y-131,15)}]));
  o.items.forEach(it=>{if(!it.got)D.push([it.y,()=>{const b=Math.sin(o.t*3+it.x)*4;c.fillStyle='#0004';c.beginPath();c.ellipse(it.x,it.y+6,14,5,0,0,7);c.fill();c.strokeStyle='#fff6';c.lineWidth=2;c.beginPath();c.arc(it.x,it.y-12+b,22,0,7);c.stroke();c.font='28px system-ui,serif';c.textAlign='center';c.fillStyle='#fff';c.fillText(it.it[0],it.x,it.y-3+b)}])});
  D.push([CY-20,()=>{hero(CX+70,CY-10,1,0,'#ff9f5a',-1);if(o.ph==='brief'||o.showHint>0)txt('❗',CX+70,CY-75+Math.sin(o.t*5)*3,24)}]);
  D.push([o.py,()=>{hero(o.px,o.py,1.1,o.mv?o.t:0,'#6fe7ff',o.face);if(o.carry){c.font='30px system-ui,serif';c.textAlign='center';c.fillStyle='#fff';c.fillText(o.carry.it[0],o.px,o.py-72+Math.sin(o.t*6)*2)}}]);
  D.sort((a,b)=>a[0]-b[0]).forEach(d=>d[1]());o.bf.forEach(b=>{const f=Math.sin(o.t*14+b.p)*5;c.fillStyle='#ffb3e6';c.beginPath();c.ellipse(b.x+Math.sin(o.t+b.p)*40-f,b.y+Math.cos(o.t*1.3+b.p)*30,5+Math.abs(f)/2,4,0,0,7);c.fill()});c.restore();
  // HUD de món
  const n=o.orders.length,dn=o.orders.filter(q=>q.done).length;txt(`Ronda ${o.round+1}/4 · Encàrrecs ${dn}/${n}`,W/2,H-34,14,'#ffd36f');bar(W*.2,H-24,W*.6,8,o.tl/(45+n*28),o.tl<12?'#ff6b6b':'#6fe7ff');
  const mw=96,mh=68,mx0=W-mw-8,my0=52;c.fillStyle='#061422cc';rr(mx0,my0,mw,mh,10);c.fill();c.fillStyle='#5fc24a';c.beginPath();c.ellipse(mx0+mw/2,my0+mh/2,mw*.46,mh*.46,0,0,7);c.fill();PLACES.forEach(p=>{c.fillStyle=p.c;c.beginPath();c.arc(mx0+p.x/WW*mw,my0+p.y/WH*mh,3.5,0,7);c.fill()});c.fillStyle='#fff';c.beginPath();c.arc(mx0+o.px/WW*mw,my0+o.py/WH*mh,3,0,7);c.fill();
  const bd=btnD(),bh=btnH();[[bd,o.carry?'Deixa':'—','E'],[bh,'Pista','R']].forEach(([b,l,k])=>{c.fillStyle=l==='—'||(l==='Pista'&&o.hints>=2)?'#0b263c88':'#0b263cee';c.beginPath();c.arc(b[0],b[1],34,0,7);c.fill();c.strokeStyle='#77e6ff88';c.lineWidth=2;c.stroke();txt(l,b[0],b[1]+5,13);txt(k,b[0],b[1]-18,10,'#7ceaff')});
  if(o.jo&&ptr.down&&o.ph==='play'){c.strokeStyle='#ffffff77';c.lineWidth=3;c.beginPath();c.arc(o.jo.x,o.jo.y,50,0,7);c.stroke();const dx=ptr.x-o.jo.x,dy=ptr.y-o.jo.y,l=Math.min(50,Math.hypot(dx,dy)),a=Math.atan2(dy,dx);c.fillStyle='#ffffffaa';c.beginPath();c.arc(o.jo.x+Math.cos(a)*l,o.jo.y+Math.sin(a)*l,22,0,7);c.fill()}
  if(o.ph==='brief'){o.card('El veí et demana…','Memoritza-ho! Toca per començar · '+Math.max(0,Math.ceil(o.briefT-o.ptime))+' s');bar(W*.2,H-60,W*.6,6,1-o.ptime/o.briefT,'#ffd36f')}
  else if(o.showHint>0)o.card('Pista (recorda-ho!)','Es tancarà sola');
  if(o.ph==='play'&&o.t<14)txt(o.hints<2?'Camina, agafa objectes i porta’ls al lloc que et van dir':'',W/2,H*.92-30,12,'#ffffffaa')};
 o.begin();return o}
/* ---------- control de pantalla ---------- */
function panel(html){ov.innerHTML=`<div class=pa-card>${html}</div>`;ov.hidden=false;ov.style.display='flex';ov.querySelectorAll('[data-a]').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();act(b.dataset.a)}));const sel=ov.querySelector('#pa-diff');if(sel){sel.value=diff;sel.onchange=()=>diff=+sel.value}}
function hidePanel(){ov.hidden=true;ov.style.display='none'}
function act(a){SFX.tick();if(a==='go'||a==='retry'){diff=+(ov.querySelector('#pa-diff')?.value||diff);build()}else if(a==='exit')exit();else if(a==='resume'){paused=false;hidePanel()}}
function intro(){const m=INFO[modeId];g=null;panel(`<div style="font-size:54px">${m.i}</div><h2>${m.t}</h2><p>${m.d}</p><p><b>Controls:</b> ${m.c}</p><label style="font-size:13px">Dificultat <select id=pa-diff style="padding:6px;border-radius:8px"><option value=1>Exploració</option><option value=2>Estàndard</option><option value=3>Desafiament</option></select></label><br><button class=pa-go data-a=go>Comença ▶</button><button class="pa-go sec" data-a=exit>Enrere</button>`)}
function build(){resize();fx=[];pops=[];beams=[];shake=0;paused=false;g=({visual:mkVisual,numbers:mkNumbers,words:mkWords,attention:mkAttention,world:mkWorld})[modeId]();hidePanel()}
function pause(){if(!g||g.done||!ov.hidden)return;paused=true;panel('<h2>Pausa</h2><button class=pa-go data-a=resume>Continua</button><button class="pa-go sec" data-a=exit>Surt al menú</button>')}
function exit(){cancelAnimationFrame(raf);g=null;hidePanel();cont.classList.add('hidden');menu.classList.remove('hidden');menu.scrollIntoView?.({behavior:'smooth',block:'start'})}
function frame(ts){raf=requestAnimationFrame(frame);if(!c){panel('<h2>No s’ha pogut iniciar el joc</h2><p>El navegador no ha pogut crear el llenç gràfic. Torna al menú i prova un altre navegador.</p><button class="pa-go sec" data-a=exit>Menú</button>');cancelAnimationFrame(raf);return}const dt=Math.min(.05,(ts-last)/1e3||0);last=ts;if(!g){c.clearRect(0,0,W,H);sky('#10263f','#05101c');return}
 if(!paused&&ov.hidden){g.t+=dt;try{g.update&&g.update(dt)}catch(e){console.error(e);g=null;panel('<h2>Error intern</h2><p>'+e.message+'</p><button class="pa-go sec" data-a=exit>Menú</button>');return}}
 c.save();c.clearRect(0,0,W,H);if(shake>0){c.translate(rnd(-1,1)*shake*7,rnd(-1,1)*shake*7);shake=Math.max(0,shake-dt*3)}g.draw();if(ov.hidden&&!paused)drawFX(dt);else drawFX(0);c.restore();
 const hk=g.score+'|'+g.lives+'|'+g.combo.toFixed(1)+'|'+snd;if(hk!==hudKey){hudKey=hk;H1.textContent=g.score;H2.textContent='♥'.repeat(Math.max(0,g.lives))||'—';H3.textContent='x'+g.combo.toFixed(1);BM.textContent=snd?'🔊':'🔇'}}
hud.addEventListener('click',e=>{const id=(e.target.closest('button')||{}).id;if(id==='pa-pause')pause();if(id==='pa-exit')exit();if(id==='pa-mute'){snd=!snd}});
const at=e=>{const r=cv.getBoundingClientRect();return[e.clientX-r.left,(e.clientY-r.top)*(H/r.height)]};
cv.addEventListener('pointerdown',e=>{const[x,y]=at(e);ptr.x=x;ptr.y=y;ptr.down=ptr.seen=true;g?.down?.(x,y);if(ov.hidden&&!paused)g?.tap?.(x,y)});
cv.addEventListener('pointermove',e=>{const[x,y]=at(e);ptr.x=x;ptr.y=y;if(e.pointerType==='mouse')ptr.seen=true});
addEventListener('pointerup',e=>{if(ptr.down){ptr.down=false;g?.up?.(ptr.x)}});
addEventListener('keydown',e=>{if(cont.classList.contains('hidden'))return;if(e.key==='Escape'){paused?act('resume'):pause();return}if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)&&ov.hidden)e.preventDefault();keys.add(e.key.length===1?e.key.toLowerCase():e.key);if(g&&ov.hidden&&!paused)g.key?.(e)});
addEventListener('keyup',e=>keys.delete(e.key.length===1?e.key.toLowerCase():e.key));
document.querySelectorAll('.mode-card').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.mode-card').forEach(x=>x.classList.toggle('selected',x===b));modeId=MODE[b.dataset.mode]||'attention';const h=$('.game-menu-content p.small.muted');if(h)h.textContent=INFO[modeId].t+': '+INFO[modeId].c}));
$('#launch-game')?.addEventListener('click',e=>{e.preventDefault();const sel=document.querySelector('.mode-card.selected');modeId=MODE[sel?.dataset.mode]||modeId;diff=Math.max(1,Math.min(3,+($('#game-difficulty')?.value)||1));menu.classList.add('hidden');cont.classList.remove('hidden');resize();intro();cancelAnimationFrame(raf);last=performance.now();raf=requestAnimationFrame(frame);cont.scrollIntoView?.({behavior:'smooth',block:'start'})});
window.PFArcade={state:()=>g,build:m=>{modeId=m;build()},info:INFO};
})();
