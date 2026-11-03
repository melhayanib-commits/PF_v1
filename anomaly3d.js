/* Món obert d’observació — mode 3D. */
(()=>{'use strict';
const $=s=>document.querySelector(s);let active=false,raf=0,renderer,scene,camera,clock,root,player,monster,cleanup=[],keys=new Set(),started=false,gameOver=false,paused=false,room=0,score=0,camYaw=0,camPitch=.12,velY=0,onGround=true,joystick=null,monsterActive=false,alarmActive=false,decisionOpen=false,roomData=[],lastDecision=-1,moveVec={x:0,y:0},audioCtx=null,playerMixer=null,monsterMixer=null,playerAction=null,monsterAction=null,modelsReady=Promise.resolve(false),loadingModels=false,monsterDoorBreak=null,monsterDoorBreakAt=0;
const style=document.createElement('style');style.textContent=`#anom-game{position:relative;width:100%;height:min(82vh,850px);min-height:560px;background:#080d15;color:#fff;border-radius:18px;overflow:hidden;font-family:system-ui,sans-serif;touch-action:none}#anom-game canvas{display:block;width:100%;height:100%;touch-action:none}#anom-game:fullscreen{width:100vw;height:100vh;min-height:100vh;border-radius:0}#anom-game:fullscreen #anom-controls{bottom:24px}#anom-hud{position:absolute;inset:12px 12px auto;display:flex;gap:8px;flex-wrap:wrap;align-items:flex-start;pointer-events:none;text-shadow:0 2px 5px #000}#anom-hud .stat,#anom-hud button{background:#07111de8;border:1px solid #c4d6e655;border-radius:10px;padding:8px 11px;font-size:12px;font-weight:800;color:#fff}#anom-hud button{pointer-events:auto;cursor:pointer}#anom-message{transition:opacity .35s ease;position:absolute;left:50%;bottom:18px;transform:translateX(-50%);max-width:86%;text-align:center;background:#07111ded;border:1px solid #dce8f333;padding:10px 14px;border-radius:12px;font-size:13px}#anom-controls{position:absolute;inset:auto 12px 65px;display:flex;justify-content:space-between;align-items:end;pointer-events:none}#anom-joy{width:118px;height:118px;border-radius:50%;border:2px solid #ffffff70;background:#07111d88;position:relative;pointer-events:auto;touch-action:none;display:none}#anom-knob{position:absolute;width:42px;height:42px;left:36px;top:36px;border-radius:50%;background:#d9eaffcc;border:1px solid white}#anom-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;max-width:220px}#anom-actions button{pointer-events:auto;touch-action:none;border:1px solid #ffffff88;border-radius:14px;background:#10253bde;color:white;padding:13px 12px;font-weight:900;min-width:66px}#anom-actions #anom-sprint{background:#6744c7}#anom-overlay{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#03070ddf;padding:18px;z-index:4}#anom-card{max-width:560px;width:100%;background:linear-gradient(145deg,#172637,#0b111c);border:1px solid #a5bfd244;border-radius:22px;padding:24px;text-align:center;box-shadow:0 20px 90px #000b}#anom-card h2{font-size:clamp(24px,4vw,36px);margin:8px 0 12px}#anom-card p{color:#d4deea;line-height:1.6}#anom-card button{border:0;border-radius:11px;padding:13px 17px;margin:5px;background:#e4b84c;color:#17120a;font-weight:950;cursor:pointer}#anom-card button.secondary{background:#25394d;color:white;border:1px solid #ffffff33}#anom-choices{position:absolute;inset:0;display:none;z-index:3;align-items:center;justify-content:center;background:#050911c9;padding:18px}#anom-choices .choicebox{width:min(500px,100%);text-align:center;padding:22px;border-radius:20px;background:#101c2af7;border:1px solid #ffffff33}#anom-choices h3{font-size:26px;margin:5px}#anom-choices p{color:#cbd6e3}#anom-choices button{font-size:15px;font-weight:950;border:0;border-radius:12px;padding:15px 18px;margin:7px;cursor:pointer}#anom-changes{background:#e5b748;color:#18140a}#anom-same{background:#d9e5f3;color:#17202b}#anom-aim{position:absolute;left:50%;top:50%;width:5px;height:5px;border:1px solid #fff9;border-radius:50%;transform:translate(-50%,-50%);pointer-events:none;display:none}@media(max-width:650px){#anom-game{min-height:520px;height:76vh}#anom-hud .stat{padding:7px 8px;font-size:11px}#anom-controls{bottom:28px}#anom-actions button{padding:12px 9px;min-width:60px}#anom-message{bottom:155px}}`;
document.head.append(style);
const mat=(color,roughness=.85,extra={})=>new THREE.MeshStandardMaterial({color,roughness,...extra});
function box(w,h,d,color,x,y,z,opts={}){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color,.85,opts));m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m}
function add(obj){scene.add(obj);return obj}
function cylinder(rt,rb,h,color,x,y,z,seg=10){const m=new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg),mat(color));m.position.set(x,y,z);m.castShadow=true;scene.add(m);return m}
function sphere(r,color,x,y,z,seg=16){const m=new THREE.Mesh(new THREE.SphereGeometry(r,seg,12),mat(color));m.position.set(x,y,z);m.castShadow=true;scene.add(m);return m}
function label(text,x,y,z,color='#17202b'){const c=document.createElement('canvas');c.width=512;c.height=160;const g=c.getContext('2d');g.fillStyle='#e8e9e7';g.fillRect(0,0,512,160);g.strokeStyle='#b7b9b7';g.lineWidth=8;g.strokeRect(4,4,504,152);g.fillStyle=color;g.font='bold 48px system-ui';g.textAlign='center';g.fillText(text,256,95);const tex=new THREE.CanvasTexture(c);const m=new THREE.Mesh(new THREE.PlaneGeometry(3.6,1.12),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));m.position.set(x,y,z);scene.add(m);return m}
function tiledWall(x,z,len,side){const wall=box(.35,4.5,len,'#d9dcda',x,2.25,z);const lineMat=mat('#b6bfbd');for(let y=.45;y<4.5;y+=.45){const line=box(.37,.025,len,lineMat.color.getHex(),x,y,z);line.material=lineMat}for(let k=-len/2+.5;k<len/2;k+=.6){box(.37,4.5,.022,'#b6bfbd',x,2.25,z+k)}return wall}
function buildRoom(index){const z=-17-index*34;roomData[index]={z,anomaly:index===0?false:Math.random()<.5,kind:Math.floor(Math.random()*4),resolved:false,lights:[]};const d=roomData[index];
 // Corridor details and door frame
 box(7,.25,34,'#737a7e',0,-.16,z+17);for(let x=-2.8;x<3.1;x+=1.1)for(let zz=z+.5;zz<z+34;zz+=1.1)box(1.04,.025,1.04,((Math.round((x+2.8)/1.1)+Math.round((zz-z)/1.1))%2)?'#8b9294':'#9ba1a2',x,.005,zz);
 tiledWall(-3.7,z+17,34,-1);tiledWall(3.7,z+17,34,1);box(7.7,.35,34,'#b9bfbd',0,4.55,z+17);
 // overhead fluorescent lights
 for(let zz=z+27;zz>z-1;zz-=7){box(1.4,.08,2.1,'#f4f4df',0,4.28,zz,{emissive:'#d7d6b3',emissiveIntensity:.4});const light=new THREE.PointLight(0xdce8ff,1.05,10);light.position.set(0,3.9,zz);scene.add(light);d.lights.push(light)}
 // poster, bench, trash can, exit sign
 const poster=box(.04,1.35,.9,'#ece5d3',-3.48,2.45,z+8);poster.rotation.y=Math.PI/2;const posterInk=box(.05,.12,.52,'#2e6577',-3.44,2.58,z+8);posterInk.rotation.y=Math.PI/2;
 box(1.5,.12,.45,'#44494c',2.75,.68,z+10);for(const x of [2.15,3.3])cylinder(.04,.04,.68,'#3b4145',x,.34,z+10,8);
 cylinder(.26,.26,.72,'#596267',2.9,.38,z+5,12);cylinder(.27,.27,.07,'#b7c0c0',2.9,.76,z+5,12);
 box(1.25,.06,.24,'#e2b83f',0,.035,z+1.5);
 // Station furnishings and signage give every loop a richer, recognisable layout.
 box(.12,1.65,.85,'#b9c2c3',-3.43,1.25,z+18);box(.035,1.2,.66,'#287c8d',-3.35,1.3,z+18);for(let yy=.92;yy<1.8;yy+=.22)box(.025,.025,.48,'#e6d7a7',-3.32,yy,z+18);
 box(.55,1.05,.22,'#6a777c',3.42,.95,z+23);box(.5,.1,.035,'#d4b33f',3.38,1.25,z+22.86);box(.4,.07,.035,'#e6e9e8',3.38,1.05,z+22.86);
 box(.8,.12,.3,'#3c4448',-2.65,.68,z+27);for(const x of [-2.9,-2.4])cylinder(.025,.025,.65,'#42484a',x,.33,z+27,8);
 label('ANDANA 04',2.2,3.55,z+15,'#274c59');
 // room-specific visible change
 if(d.anomaly){switch(d.kind){case 0:box(.08,.5,.45,'#b32c2c',-3.42,2.55,z+8);break;case 1:box(1.5,.12,.45,'#9e3b31',2.75,.68,z+10);break;case 2:cylinder(.28,.28,.75,'#b22c2c',2.9,.38,z+5,12);break;case 3:box(1.4,.08,1.8,'#a7c3dd',0,4.18,z+13,{emissive:'#8db8df',emissiveIntensity:.8});break}}
 // door at far end, controlled by answer
 const door=box(2.25,3.4,.22,'#303a43',0,1.7,z-16.3);box(2.45,.2,.35,'#b9c1c4',0,3.45,z-16.3);const handle=sphere(.055,'#d8b34a',.7,1.6,z-16.14,8);d.door=door;d.handle=handle;
 // back wall segment gives visible station boundary
 box(2.45,4.5,.35,'#d5d8d6',-2.48,2.25,z-17.1);box(2.45,4.5,.35,'#d5d8d6',2.48,2.25,z-17.1);box(2.5,.85,.35,'#d5d8d6',0,4.08,z-17.1);box(2.5,.12,.05,'#b9c0bf',0,3.8,z-16.9);
 // subtle anomaly glow / clue not explicit
 return d}
function makeCharacter(){const g=new THREE.Group();g.position.set(0,0,7);g.userData={limbs:[],cape:{rotation:{x:0}}};scene.add(g);return g}

// Càrrega robusta dels models GLB originals (amb errors recuperables i reintent).
let GLTFLoaderClass=null;
async function loadRiggedModel(target,assetPath,desiredHeight,kind){
 target.visible=false;
 const label=kind==='player'?'Naruto':'Terrifying';
 const url=new URL(assetPath,document.baseURI).href;
 try{
  if(!GLTFLoaderClass){
   const mod=await import('./vendor/three/GLTFLoader.js');
   GLTFLoaderClass=mod.GLTFLoader;
  }
  const loader=new GLTFLoaderClass();
  message(`Descarregant ${label}…`,0);
  const gltf=await Promise.race([
   loader.loadAsync(url,progress=>{
    if(progress?.total){const pct=Math.round(progress.loaded/progress.total*100);message(`Carregant ${label}: ${pct}%`,0);}
    else message(`Descarregant ${label}…`,0);
   }),
   new Promise((_,reject)=>setTimeout(()=>reject(new Error('Temps d’espera esgotat (35 s). Comprova que el fitxer sigui públic i que la ruta sigui correcta.')),35000))
  ]);
  if(!target||!target.parent)throw new Error('El contenidor del personatge ja no existeix.');
  const model=gltf.scene;model.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(model);const size=bounds.getSize(new THREE.Vector3());const center=bounds.getCenter(new THREE.Vector3());
  if(!Number.isFinite(size.y)||size.y<=0)throw new Error('El model no té una mida vàlida.');
  const scale=desiredHeight/size.y;model.scale.setScalar(scale);model.rotation.y=Math.PI;
  model.position.set(-center.x*scale,-bounds.min.y*scale,-center.z*scale);
  model.traverse(obj=>{if(obj.isMesh){obj.castShadow=true;obj.receiveShadow=true;const mats=Array.isArray(obj.material)?obj.material:[obj.material];mats.forEach(m=>{if(m){if('roughness' in m)m.roughness=Math.max(.45,m.roughness??.8);if('metalness' in m)m.metalness=Math.min(.25,m.metalness??0);m.needsUpdate=true;}})}});
  target.clear();target.add(model);target.userData.imported=true;target.userData.model=model;target.userData.loadError=null;target.userData.limbs=[];target.userData.cape={rotation:{x:0}};
  const clip=gltf.animations?.[0];if(clip){const mixer=new THREE.AnimationMixer(model);const action=mixer.clipAction(clip);action.enabled=true;action.setEffectiveWeight(1);action.play();action.paused=(kind==='player');target.userData.mixer=mixer;target.userData.action=action;if(kind==='player'){playerMixer=mixer;playerAction=action;}else{monsterMixer=mixer;monsterAction=action;}}
  // Verificació real: malla present, model dins de l'escena i animació engegada.
  let meshes=0;model.traverse(o=>{if(o.isMesh)meshes++});
  if(!meshes)throw new Error('El model s’ha descarregat però no conté cap malla visible.');
  if(!target.parent)throw new Error('El personatge no s’ha pogut afegir a l’escena.');
  const inScene=scene&&scene.getObjectById(target.id)===target;
  if(!inScene)throw new Error('El personatge no forma part de l’escena 3D.');
  target.userData.meshes=meshes;
  target.userData.animations=(gltf.animations||[]).map(a=>a.name);
  target.visible=kind==='player'||(kind==='monster'&&monsterActive);
  console.info(`${label} carregat`,url,`malles:${meshes}`,'animacions:',target.userData.animations.length,target.userData.animations.join(', '));
  return true;
 }catch(err){
  target.visible=false;target.userData.imported=false;target.userData.meshes=0;
  target.userData.loadError=String(err?.message||err);
  console.error(`Error carregant ${label}:`,url,err);
  return false;
 }
}
function modelsInScene(){
 return !!(player&&monster&&player.userData.imported&&monster.userData.imported&&player.userData.meshes>0&&monster.userData.meshes>0&&scene&&scene.getObjectById(player.id)===player&&scene.getObjectById(monster.id)===monster);
}
function makeMonster(){const g=new THREE.Group();g.visible=false;g.userData={limbs:[]};scene.add(g);return g}
function playTone(freq=440,duration=.12,type='sine',gain=.035){try{audioCtx=audioCtx||new(window.AudioContext||window.webkitAudioContext)();const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.value=freq;g.gain.value=gain;g.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);o.connect(g);g.connect(audioCtx.destination);o.start();o.stop(audioCtx.currentTime+duration)}catch{}}
let messageTimer=0;function message(s,duration=3200){const e=$('#anom-message');if(!e)return;e.textContent=s;e.classList.remove('anom-message-hide');e.style.opacity='1';clearTimeout(messageTimer);if(duration>0)messageTimer=setTimeout(()=>{e.style.opacity='0';},duration)}
function setChoice(open){decisionOpen=open;$('#anom-choices').style.display=open?'flex':'none'}
function start(){if(!modelsInScene()){message('Els personatges encara no estan preparats. Torna-ho a provar quan acabi la càrrega.',4000);return;}started=true;gameOver=false;paused=false;room=0;score=0;lastDecision=-1;monsterActive=false;alarmActive=false;monsterDoorBreak=null;monsterDoorBreakAt=0;scene.fog.color.set('#090e16');scene.background.set('#090e16');scene.traverse(o=>{if(o.isPointLight&&o.userData.normalIntensity!==undefined){o.color.set('#dce8ff');o.intensity=o.userData.normalIntensity}});monster.visible=false;keys.clear();if(playerAction){playerAction.reset();playerAction.play();playerAction.paused=true}if(monsterAction){monsterAction.reset();monsterAction.play();}moveVec={x:0,y:0};velY=0;onGround=true;player.position.set(0,0,7);camYaw=0;camPitch=.12;$('#anom-room').textContent='1';$('#anom-score').textContent='0';roomData.forEach(d=>{if(d.door){d.door.position.y=1.7;d.door.position.x=0;d.door.rotation.z=0;d.door.userData.closed=false;d.door.userData.monsterCanPass=false;}});$('#anom-overlay').style.display='none';setChoice(false);message('Sala 1: observa i memoritza els detalls.',2600);clock.start()}
function buildAllRooms(){// Five connected versions of the same station layout, each with a fresh random state.
 for(let i=0;i<5;i++)buildRoom(i)}
function anomalyExplanation(d){const details=['El cartell de la paret tenia una marca vermella que no apareixia a la sala anterior.','El banc de la dreta havia canviat de color: ara tenia una franja vermellosa.','La paperera metàl·lica de la dreta era diferent de la de la sala anterior.','La lluminària del sostre tenia una llum blavosa que abans no hi era.'];return d.anomaly?details[d.kind]:'No hi havia cap canvi: els cartells, els bancs, la paperera i la il·luminació eren iguals que a la sala anterior.'}
function resolveChoice(answer){
 if(!decisionOpen||gameOver)return;setChoice(false);const d=roomData[room];const correct=(answer===d.anomaly);d.resolved=true;lastDecision=room;
 if(correct){score+=100;$('#anom-score').textContent=score;message('Correcte! La porta s’obre. Avança i la sala anterior quedarà tancada.',2600);playTone(740,.14,'sine');d.door.position.x=2.65;d.door.userData.closed=false;room++;$('#anom-room').textContent=Math.min(room+1,5);if(room>=5){win();}else{player.position.set(0,0,d.z-19);camYaw=0;camPitch=.12;d.door.userData.closed=true;d.door.position.x=0;}}
 else{
  message('Resposta incorrecta. '+anomalyExplanation(d)+' S’ha activat l’alarma: les portes queden bloquejades.',5200);playTone(95,.5,'sawtooth',.06);alarmActive=true;
  scene.fog.color.set('#3b080b');scene.background.set('#260609');scene.traverse(o=>{if(o.isPointLight){o.userData.normalIntensity=o.userData.normalIntensity??o.intensity;o.color.set('#ff2020');o.intensity=Math.max(o.intensity,1.8)}});
  roomData.forEach(rd=>{if(rd.door){rd.door.position.x=0;rd.door.position.y=1.7;rd.door.rotation.z=0;rd.door.userData.closed=true;rd.door.userData.monsterCanPass=false;}});
  monsterActive=true;monster.userData.targetRoom=room;const previousDoor=roomData[Math.max(0,room-1)]?.door;const spawnZ=previousDoor?previousDoor.position.z+4:player.position.z+7;monster.position.set(0,0,spawnZ);monster.visible=!!monster.userData.imported;
  if(monsterAction){monsterAction.reset();monsterAction.play();monsterAction.paused=false;}
  if(!monster.userData.imported)message('Error: Terrifying no està carregat. Revisa la ruta del model.',0);
  // La criatura trenca la primera porta que troba; el bloqueig del jugador es manté.
  monsterDoorBreak=previousDoor&&previousDoor.userData.closed?previousDoor:(roomData.find(rd=>rd.door&&rd.door.userData.closed)?.door||null);
  monsterDoorBreakAt=performance.now()+900;
 }
}
function win(){gameOver=true;started=false;message('Has superat totes les sales!');$('#anom-title').textContent='Has superat el recorregut';$('#anom-result').textContent=`Puntuació: ${score} · Sales superades: 5/5`;$('#anom-start').textContent='Tornar a jugar';$('#anom-overlay').style.display='flex';}
function lose(){gameOver=true;started=false;message('La criatura t’ha atrapat.');$('#anom-title').textContent='T’han atrapat';$('#anom-result').textContent=`Puntuació: ${score} · Sales superades: ${room}/5`;$('#anom-start').textContent='Tornar a intentar-ho';$('#anom-overlay').style.display='flex';playTone(70,.55,'sawtooth',.07)}
function showDecision(){if(room===0||decisionOpen||room>=roomData.length)return;const d=roomData[room];if(d.resolved)return;setChoice(true);message('Atura’t i fixa’t en els detalls abans de respondre.');}
function teardown(){active=false;loadingModels=false;cancelAnimationFrame(raf);cleanup.forEach(f=>{try{f()}catch{}});cleanup=[];try{renderer?.dispose()}catch{};renderer=null;scene=null;keys.clear();}
function boot(){const menu=$('#game-menu'),container=$('#game-container');menu.classList.add('hidden');container.classList.remove('hidden');$('#game-canvas-wrap').classList.add('hidden');container.insertAdjacentHTML('beforeend','<div id="anom-game"><div id="anom-hud"><div class="stat">SALA <span id="anom-room">1</span>/5</div><div class="stat">PUNTUACIÓ <span id="anom-score">0</span></div><button id="anom-pause">Ⅱ PAUSA</button><button id="anom-full">⛶ PANTALLA COMPLETA</button><button id="anom-exit">✕ SORTIR</button></div><div id="anom-message">Preparant l’estació…</div><div id="anom-aim"></div><div id="anom-controls"><div id="anom-joy"><div id="anom-knob"></div></div><div id="anom-actions"><button id="anom-sprint">CÓRRER</button><button id="anom-jump">SALTAR</button><button id="anom-interact">INTERACTUAR</button></div></div><div id="anom-choices"><div class="choicebox"><div style="font-size:34px">◈</div><h3>Has observat algun canvi respecte a la sala anterior?</h3><p>Compara aquesta sala amb la sala anterior: objectes, cartells, bancs i il·luminació.</p><button id="anom-changes">HI HA CANVIS</button><button id="anom-same">NO HI HA CANVIS</button></div></div><div id="anom-overlay"><div id="anom-card"><div style="font-size:42px">🚇 ◈</div><div style="letter-spacing:2px;font-size:11px;color:#e6bf56;font-weight:900">MÓN OBERT · OBSERVACIÓ</div><h2 id="anom-title">OBSERVA LA SALA 1</h2><p id="anom-result">Observa la primera sala i memoritza els detalls: cartells, bancs, llums i objectes. Encara no hauràs de respondre. A la segona sala hauràs de comparar-les.</p><p><b>PC:</b> WASD o fletxes · ratolí per girar · Maj per córrer · espai per saltar · E per interactuar · Esc per pausar.<br><b>Mòbil:</b> joystick i botons tàctils.</p><button id="anom-start">COMENÇAR</button><button class="secondary" id="anom-back">TORNAR ALS JOCS</button></div></div></div>');
 root=$('#anom-game');if(matchMedia('(pointer:coarse)').matches){$('#anom-joy').style.display='block';$('#anom-aim').style.display='none'}else $('#anom-aim').style.display='block';
 scene=new THREE.Scene();scene.background=new THREE.Color('#090e16');scene.fog=new THREE.Fog('#090e16',28,105);camera=new THREE.PerspectiveCamera(68,root.clientWidth/root.clientHeight,.1,220);try{renderer=new THREE.WebGLRenderer({antialias:!matchMedia('(pointer:coarse)').matches,alpha:false});}catch(err){container.innerHTML='<div class="panel" style="padding:28px;color:white"><h2>No s’ha pogut iniciar el motor 3D</h2><p>El navegador o dispositiu no ha pogut crear WebGL. Torna-ho a provar en Safari/Chrome actualitzat o en un dispositiu compatible.</p><button class="btn btn-primary" id="anom-render-back">Tornar als jocs</button></div>';$('#anom-render-back').onclick=()=>{container.classList.add('hidden');menu.classList.remove('hidden')};return;}renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.setSize(root.clientWidth,root.clientHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;root.insertBefore(renderer.domElement,root.firstChild);
 scene.add(new THREE.HemisphereLight(0xb8cce4,0x1b1d21,1.05));const key=new THREE.DirectionalLight(0xcbd7e5,1.25);key.position.set(1,8,6);key.castShadow=true;scene.add(key);const ambient=new THREE.PointLight(0xd3e1f8,.55,32);ambient.position.set(0,3.5,4);scene.add(ambient);
 // Starter corridor to first room, floor/walls/ceiling
 box(7,.25,24,'#777e81',0,-.16,12);for(let x=-2.8;x<3.1;x+=1.1)for(let z=1;z<25;z+=1.1)box(1.04,.025,1.04,'#969d9e',x,.005,z);
 tiledWall(-3.7,12,24,-1);tiledWall(3.7,12,24,1);box(7.7,.35,24,'#c3c7c4',0,4.55,12);for(let z=4;z<25;z+=7){box(1.5,.08,2,'#f0f0dd',0,4.28,z,{emissive:'#d7d6b3',emissiveIntensity:.4});const l=new THREE.PointLight(0xdce8ff,.9,9);l.position.set(0,3.8,z);scene.add(l)}
 label('SORTIDA',0,3.5,19,'#26704c');box(1.3,.08,.5,'#e1b93e',0,.035,0);
 player=makeCharacter();monster=makeMonster();clock=new THREE.Clock();roomData=[];buildAllRooms();loadCharacters();
 async function loadCharacters(){
  const button=$('#anom-start');button.disabled=true;button.textContent='CARREGANT PERSONATGES…';
  player.userData.imported=false;monster.userData.imported=false;player.visible=false;monster.visible=false;
  message('Descarregant Naruto…',0);
  loadingModels=true;
  modelsReady=Promise.all([
   loadRiggedModel(player,'assets/characters/naruto_low_poly_rigged.glb',2.05,'player'),
   loadRiggedModel(monster,'assets/characters/terrifying_hooded_horror_woman.glb',3.5,'monster')
  ]);
  const results=await modelsReady;
  loadingModels=false;
  if(!active)return;
  // Només es permet començar si tots dos models són realment a l'escena.
  const ready=results.every(Boolean)&&modelsInScene();
  button.disabled=false;
  button.textContent=ready?'COMENÇAR':'TORNAR A CARREGAR PERSONATGES';
  if(ready){
   console.info('Personatges preparats:',{naruto:player.userData.meshes,terrifying:monster.userData.meshes,anims:{naruto:player.userData.animations,terrifying:monster.userData.animations}});
   message('Naruto i Terrifying estan preparats.',2600);
   const hint=$('#anom-model-error');if(hint)hint.remove();
  }else{
   const errors=[player.userData.loadError&&`Naruto: ${player.userData.loadError}`,monster.userData.loadError&&`Terrifying: ${monster.userData.loadError}`].filter(Boolean).join(' · ');
   const detail=errors||'Els models no han quedat afegits a l’escena.';
   console.error('Errors de càrrega dels personatges:',detail);
   message('No s’han pogut carregar els personatges. Toca «TORNAR A CARREGAR PERSONATGES».',8000);
   const box=document.createElement('div');
   box.id='anom-model-error';
   box.style.cssText='position:absolute;left:50%;top:12%;transform:translateX(-50%);max-width:min(560px,92%);padding:12px 16px;border-radius:12px;background:rgba(70,10,14,.94);border:1px solid #ff4d5a;color:#ffdfe2;font-size:13px;line-height:1.45;z-index:60;box-shadow:0 10px 30px rgba(0,0,0,.5)';
   box.innerHTML='<b style="display:block;margin-bottom:6px;color:#fff">No s’han pogut carregar els personatges</b>'+detail.replace(/</g,'&lt;');
   root.appendChild(box);
  }
 }
 // Pointer look; drag on canvas (desktop and mobile)
 let lookPointer=null,lastX=0,lastY=0;const canvas=renderer.domElement;canvas.addEventListener('pointerdown',e=>{if(e.pointerType==='mouse'&&e.button!==0)return;lookPointer=e.pointerId;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture?.(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(lookPointer!==e.pointerId||decisionOpen||!started)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;camYaw-=dx*.004;camPitch=Math.max(-.15,Math.min(.65,camPitch+dy*.003));});const endLook=e=>{if(lookPointer===e.pointerId)lookPointer=null};canvas.addEventListener('pointerup',endLook);canvas.addEventListener('pointercancel',endLook);
 const joy=$('#anom-joy'),knob=$('#anom-knob');let joyId=null;function joyMove(e){const r=joy.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let dx=e.clientX-cx,dy=e.clientY-cy,l=Math.hypot(dx,dy),max=38;if(l>max){dx=dx/l*max;dy=dy/l*max}moveVec.x=dx/max;moveVec.y=-dy/max;knob.style.transform=`translate(${dx}px,${dy}px)`}function joyEnd(){joyId=null;moveVec={x:0,y:0};knob.style.transform=''}joy.addEventListener('pointerdown',e=>{joyId=e.pointerId;joy.setPointerCapture?.(e.pointerId);joyMove(e)});joy.addEventListener('pointermove',e=>{if(joyId===e.pointerId)joyMove(e)});joy.addEventListener('pointerup',joyEnd);joy.addEventListener('pointercancel',joyEnd);
 const hold=(id,key)=>{const el=$('#'+id);el.addEventListener('pointerdown',e=>{e.preventDefault();keys.add(key)});['pointerup','pointercancel','pointerleave'].forEach(ev=>el.addEventListener(ev,()=>keys.delete(key)))};hold('anom-sprint','shift');hold('anom-jump',' ');$('#anom-interact').onclick=()=>{if(started&&!decisionOpen){const d=roomData[room];if(room===0)message('Sala 1: observa els detalls. La primera pregunta apareixerà a la sala 2.');else if(d&&Math.abs(player.position.z-(d.z+2))<8)showDecision();else message('Acosta’t a la porta del final de la sala per decidir.')}};
 $('#anom-changes').onclick=()=>resolveChoice(true);$('#anom-same').onclick=()=>resolveChoice(false);$('#anom-start').onclick=()=>{if($('#anom-start').disabled)return;if(modelsInScene())start();else loadCharacters();};$('#anom-back').onclick=()=>{teardown();clearTimeout(messageTimer);$('#anom-game')?.remove();$('#game-canvas-wrap')?.classList.remove('hidden');container.classList.add('hidden');menu.classList.remove('hidden')};$('#anom-exit').onclick=()=>{$('#anom-back').click()};$('#anom-pause').onclick=()=>{if(!started||gameOver)return;paused=!paused;message(paused?'Pausa · prem de nou per continuar':'Continua explorant');$('#anom-pause').textContent=paused?'▶ CONTINUAR':'Ⅱ PAUSA'};$('#anom-full').onclick=()=>{if(!document.fullscreenElement){const r=root.requestFullscreen?.();if(r&&r.catch)r.catch(()=>message('La pantalla completa no està disponible en aquest navegador.'))}else document.exitFullscreen?.()};
 const kd=e=>{if(!active)return;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key))e.preventDefault();if(e.key==='Escape'){if(started&&!gameOver){paused=!paused;message(paused?'Pausa':'Continua explorant')}return}if(e.key.toLowerCase()==='e'&&started&&!decisionOpen){const d=roomData[room];if(room>0&&d&&Math.abs(player.position.z-(d.z+2))<8)showDecision()}keys.add(e.key===' ' ? ' ' : e.key.toLowerCase())};const ku=e=>keys.delete(e.key===' '?' ':e.key.toLowerCase());window.addEventListener('keydown',kd);window.addEventListener('keyup',ku);cleanup.push(()=>window.removeEventListener('keydown',kd),()=>window.removeEventListener('keyup',ku));
 active=true;const ro=new ResizeObserver(()=>{if(!active)return;camera.aspect=root.clientWidth/root.clientHeight;camera.updateProjectionMatrix();renderer.setSize(root.clientWidth,root.clientHeight)});ro.observe(root);cleanup.push(()=>ro.disconnect());
 function loop(){if(!active)return;raf=requestAnimationFrame(loop);if(loadingModels){clock.getDelta();return;}const dt=Math.min(clock.getDelta()||.016,.04);if(alarmActive){const pulse=1.45+Math.abs(Math.sin(performance.now()*.009))*.9;scene.traverse(o=>{if(o.isPointLight&&o.color.r>.7)o.intensity=pulse});}if(started&&!paused&&!gameOver&&!decisionOpen){const f=(keys.has('w')||keys.has('arrowup')?1:0)-(keys.has('s')||keys.has('arrowdown')?1:0)+moveVec.y;const s=(keys.has('d')||keys.has('arrowright')?1:0)-(keys.has('a')||keys.has('arrowleft')?1:0)+moveVec.x;const mag=Math.hypot(f,s);const speed=(keys.has('shift')?6.8:3.4);if(mag>.08){if(playerAction){playerAction.paused=false;playerAction.timeScale=1}const n=Math.min(1,mag),dx=(Math.sin(camYaw)*f+Math.cos(camYaw)*s)/Math.max(1,mag)*speed*dt*n,dz=(-Math.cos(camYaw)*f+Math.sin(camYaw)*s)/Math.max(1,mag)*speed*dt*n;player.position.x+=dx;player.position.z+=dz;player.rotation.y=Math.atan2(dx,-dz);(player.userData.limbs||[]).forEach((limb,i)=>{limb.rotation.x=Math.sin(performance.now()*.012+i*Math.PI)*.55});if(player.userData.cape)player.userData.cape.rotation.x=Math.sin(performance.now()*.008)*.06;if(player.userData.model)player.userData.model.rotation.z=Math.sin(performance.now()*.012)*.025}else{(player.userData.limbs||[]).forEach(l=>l.rotation.x*=.8);if(playerAction){playerAction.paused=true}}if(playerMixer)playerMixer.update(dt);
 if(keys.has(' ')&&onGround){velY=5.2;onGround=false}velY-=13*dt;player.position.y+=velY*dt;if(player.position.y<=0){player.position.y=0;velY=0;onGround=true}
 player.position.x=Math.max(-2.7,Math.min(2.7,player.position.x));
 // Les portes tancades són sòlides: el jugador no les pot travessar.
 for(const rd of roomData){if(rd.door?.userData.closed){const doorZ=rd.door.position.z;if(Math.abs(player.position.z-doorZ)<1.35){player.position.z=player.position.z>=doorZ?doorZ+1.35:doorZ-1.35;velY=0;}}}
 // La sala 1 es solo de observación: se abre sola y sirve de referencia. Las decisiones empiezan en la sala 2.
 const first=roomData[0];
 if(room===0&&first&&!first.resolved&&player.position.z<first.z-8){first.resolved=true;first.door.position.x=2.65;room=1;$('#anom-room').textContent='2';message('Sala 1 memorizada. Entra en la sala 2 y compara todos los detalles con la anterior.');}
 const d=roomData[room];if(room>0&&d&&!d.resolved&&player.position.z<d.z+2&&player.position.z>d.z-7){showDecision()}
 if(monsterActive&&monster.visible&&monster.userData.imported){
  if(monsterMixer)monsterMixer.update(dt);
  if(monsterDoorBreak&&performance.now()>=monsterDoorBreakAt){monsterDoorBreak.userData.monsterCanPass=true;monsterDoorBreak.rotation.z=Math.min(1.15,monsterDoorBreak.rotation.z+dt*2.5);monsterDoorBreak.position.x=Math.min(.65,monsterDoorBreak.position.x+dt*1.2);if(monsterDoorBreak.rotation.z>=1.1)monsterDoorBreak=null;}
  const to=new THREE.Vector3(player.position.x-monster.position.x,0,player.position.z-monster.position.z);const dist=to.length();
  if(dist>0.001){to.normalize();const nextX=monster.position.x+to.x*dt*4.6,nextZ=monster.position.z+to.z*dt*4.6;let doorBlock=null;for(const rd of roomData){const door=rd.door;if(door?.userData.closed&&!door.userData.monsterCanPass&&Math.abs(nextZ-door.position.z)<1.5){doorBlock=door;break;}}
   if(doorBlock){if(!monsterDoorBreak){monsterDoorBreak=doorBlock;monsterDoorBreakAt=performance.now()+350;}}else{monster.position.x=Math.max(-2.55,Math.min(2.55,nextX));monster.position.z=nextZ;}monster.rotation.y=Math.atan2(to.x,to.z);
  }
  if(dist<1.25)lose();
 }
 }
 // camera follows behind, with freely controlled yaw
 const target=new THREE.Vector3(player.position.x,player.position.y+1.55,player.position.z);const off=new THREE.Vector3(Math.sin(camYaw)*5.6,2.3+camPitch*3,Math.cos(camYaw)*5.6);camera.position.lerp(target.clone().add(off),.12);camera.lookAt(target);renderer.render(scene,camera)}loop();
}
// Capture the menu's launch event before the arcade handler, but leave every other mode unchanged.
const launch=$('#launch-game');if(launch)launch.addEventListener('click',async e=>{if($('.mode-card.selected')?.dataset.mode!=='anomaly')return;e.preventDefault();e.stopImmediatePropagation();try{if(!window.THREE)window.THREE=await import('./vendor/three/three.module.min.js');teardown();boot()}catch(err){console.error(err);alert('No s’ha pogut carregar el joc 3D. Comprova la connexió i torna-ho a provar.')}} ,true);
})();
