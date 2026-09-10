// ============================================================================
// V114: НОМЕР 911 — ЭКСТРЕННАЯ ЛИНИЯ С КАТ-СЦЕНОЙ
// ----------------------------------------------------------------------------
// ПОЧЕМУ ТАК БЫЛО: в наборнике не было ни одного номера, который бы что-то
// показывал. Все линии отвечали строкой текста в панели связи — игрок набирал
// цифры и получал субтитр. Никакой сцены, никакого лица, ничего.
//
// СТАЛО: на 911 отвечает живая диспетчерская. Сбоку въезжает кадр с самим
// работником: он сидит за столом ночной смены и прижимает трубку к уху. Снизу
// идут субтитры. Диспетчер говорит по-английски (женский голос службы США),
// работник отвечает по-русски — так, как он и говорил бы. После разговора
// кадр уезжает в ту же сторону и игра продолжается с того же места.
//
// ПОКА ИДЁТ СЦЕНА ИГРА ЗАМОРОЖЕНА. Это принципиально: аниматроники не ходят,
// питание не тратится, умереть во время звонка нельзя. Иначе разговор на
// сорок секунд был бы смертным приговором, а не сценой.
//
// Пропуск — пробел, Escape или клик. Никого не держим силой.
// ============================================================================
window.Call911=(()=>{
 const IMG_SRC='assets/art/call911_cast.jpg';
 // Длительности взяты из самих дорожек, поэтому реплика не обрывается на
 // полуслове и после неё не висит немая пауза.
 const LINES=[
  {who:'d',id:'emg_d1',dur:7.73,text:'Nine one one, emergency services. You have reached the emergency line. What is your emergency?'},
  {who:'w',id:'emg_w1',dur:7.57,text:'Алло... Алло, вы меня слышите? Я на ночной смене. Пиццерия на Заводской, тридцать четыре.'},
  {who:'d',id:'emg_d2',dur:8.09,text:'Sir, I need you to stay calm for me. Can you confirm your exact location, and tell me what is happening right now?'},
  {who:'w',id:'emg_w2',dur:10.85,text:'Я не могу выйти. Двери заперты... и в коридоре кто-то ходит. Оно ходит уже второй час.'},
  {who:'d',id:'emg_d3',dur:7.37,text:'Stay on the line with me, sir. Units have been dispatched to your address. Do not open any doors.'},
  {who:'w',id:'emg_w3',dur:4.85,text:'Никто не приедет. Они никогда не приезжают.'}
 ];
 const GAP=0.34;          // пауза между репликами — дышит, не тараторит
 const SLIDE_IN=0.85;     // кадр въезжает
 const SLIDE_OUT=0.80;    // кадр уезжает
 const TAIL=1.10;         // тишина после последней фразы, прежде чем уйти

 const img=new Image();
 img.decoding='async';
 let imgReady=false;
 img.onload=()=>{imgReady=true};
 let imgStarted=false;
 function ensureImage(){if(!imgStarted){imgStarted=true;img.src=IMG_SRC;}}

 let registered=false;
 function ensureAudio(){
  if(registered)return;registered=true;
  try{
   LINES.forEach(l=>window.AudioFX.register(l.id,'assets/voice/emg/'+l.id.slice(4)+'.mp3','phone'));
  }catch(e){}
 }

 const S={
  active:false,
  phase:'in',      // in | talk | out
  t:0,             // время внутри фазы
  total:0,         // общее время сцены — для таймера звонка на экране
  idx:-1,          // индекс текущей реплики
  lineT:0,         // время внутри реплики
  gapT:0,          // остаток паузы перед следующей репликой
  game:null,
  shake:0
 };

 function isActive(){return S.active}

 function start(game){
  if(S.active)return;
  ensureImage();ensureAudio();
  S.active=true;S.phase='in';S.t=0;S.total=0;S.idx=-1;S.lineT=0;S.gapT=0.25;S.game=game||null;S.shake=0;
  try{window.AudioFX.unlock()}catch(e){}
  try{window.AudioFX.play('phone_line',.45,{group:'phone'})}catch(e){}
  // Экран набора и записка закрываются: они бы висели под кадром.
  try{if(game){game.dialer=false;if(game.note)game.note.open=false;}}catch(e){}
  try{window.Platform?.stopGameplay?.()}catch(e){}
 }

 function stopVoices(){
  try{LINES.forEach(l=>window.AudioFX.stopSound(l.id))}catch(e){}
 }

 function finish(){
  S.active=false;S.phase='in';S.t=0;S.idx=-1;S.game=null;
  stopVoices();
  try{window.Platform?.startGameplay?.()}catch(e){}
 }

 function skip(){
  if(!S.active)return;
  if(S.phase==='out')return;
  stopVoices();
  S.phase='out';S.t=0;
 }

 function playLine(i){
  const l=LINES[i];if(!l)return;
  // Диспетчер звучит из трубки — тише и с лёгким сдвигом вправо, как будто
  // динамик прижат к уху. Работник говорит в комнате, ровно по центру.
  try{
   if(l.who==='d')window.AudioFX.play(l.id,.95,{group:'phone',noDuck:true});
   else window.AudioFX.play(l.id,1,{group:'phone',noDuck:true});
  }catch(e){}
 }

 function update(dt){
  if(!S.active)return;
  S.t+=dt;S.total+=dt;
  if(S.shake>0)S.shake=Math.max(0,S.shake-dt*1.8);
  if(S.phase==='in'){
   if(S.t>=SLIDE_IN){S.phase='talk';S.t=0;}
   return;
  }
  if(S.phase==='out'){
   if(S.t>=SLIDE_OUT)finish();
   return;
  }
  // --- разговор
  if(S.gapT>0){
   S.gapT-=dt;
   if(S.gapT<=0){
    S.idx++;
    if(S.idx>=LINES.length){S.phase='out';S.t=0;return;}
    S.lineT=0;playLine(S.idx);
    if(LINES[S.idx].who==='w')S.shake=.5; // трубку чуть дёргает, когда он говорит
   }
   return;
  }
  S.lineT+=dt;
  const l=LINES[S.idx];
  if(l&&S.lineT>=l.dur){
   S.gapT=(S.idx>=LINES.length-1)?TAIL:GAP;
  }
 }

 // --- перенос текста по ширине, потому что реплики длинные
 function wrap(ctx,text,maxW){
  const words=String(text).split(' ');const out=[];let cur='';
  for(let i=0;i<words.length;i++){
   const test=cur?cur+' '+words[i]:words[i];
   if(ctx.measureText(test).width>maxW&&cur){out.push(cur);cur=words[i];}
   else cur=test;
  }
  if(cur)out.push(cur);
  return out;
 }

 function fmtTime(s){
  const m=Math.floor(s/60),ss=Math.floor(s%60);
  return (m<10?'0':'')+m+':'+(ss<10?'0':'')+ss;
 }

 function draw(ctx,W,H){
  if(!S.active)return;
  // Смещение кадра: въезжает справа, уезжает вправо же.
  let off=0,dim=1;
  if(S.phase==='in'){const p=Math.min(1,S.t/SLIDE_IN);const e=1-Math.pow(1-p,3);off=(1-e)*W;dim=e;}
  else if(S.phase==='out'){const p=Math.min(1,S.t/SLIDE_OUT);const e=p*p;off=e*W;dim=1-p;}

  ctx.save();
  // Затемняем игру под кадром — сцена должна читаться как отдельный момент.
  ctx.fillStyle='rgba(0,0,0,'+(0.965*dim).toFixed(3)+')';
  ctx.fillRect(0,0,W,H);

  const sh=S.shake>0?Math.sin(S.total*47)*S.shake*1.6:0;
  ctx.translate(off+sh,0);

  // ---- КАДР: вписываем «по обрезке», центр важнее краёв
  const fx=0,fy=H*0.055,fw=W,fh=H*0.700;
  ctx.save();
  ctx.beginPath();ctx.rect(fx,fy,fw,fh);ctx.clip();
  ctx.fillStyle='#080a0c';ctx.fillRect(fx,fy,fw,fh);
  if(imgReady&&img.naturalWidth){
   const ir=img.naturalWidth/img.naturalHeight, fr=fw/fh;
   let dw,dh;
   if(ir>fr){dh=fh;dw=fh*ir;}else{dw=fw;dh=fw/ir;}
   ctx.globalAlpha=dim;
   ctx.drawImage(img,fx+(fw-dw)/2,fy+(fh-dh)/2,dw,dh);
   ctx.globalAlpha=1;
  }else{
   // Кадр ещё грузится — не белая дыра, а тёмная комната с точкой света.
   const g=ctx.createRadialGradient(fx+fw*.5,fy+fh*.5,10,fx+fw*.5,fy+fh*.5,fw*.5);
   g.addColorStop(0,'#1a2026');g.addColorStop(1,'#05070a');
   ctx.fillStyle=g;ctx.fillRect(fx,fy,fw,fh);
  }
  // виньетка кадра
  const vg=ctx.createRadialGradient(fx+fw*.5,fy+fh*.45,fh*.25,fx+fw*.5,fy+fh*.5,fh*1.05);
  vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.78)');
  ctx.fillStyle=vg;ctx.fillRect(fx,fy,fw,fh);
  // редкие строки развёртки — кадр как будто с камеры наблюдения
  ctx.fillStyle='rgba(0,0,0,.16)';
  for(let y=fy;y<fy+fh;y+=4)ctx.fillRect(fx,y,fw,1);
  ctx.restore();

  // рамка кадра
  ctx.strokeStyle='rgba(190,205,215,.13)';ctx.lineWidth=1;
  ctx.strokeRect(fx+.5,fy+.5,fw-1,fh-1);

  // ---- ВЕРХНЯЯ ПЛАШКА: линия, номер, таймер
  const pulse=.55+.45*Math.sin(S.total*4.2);
  ctx.save();
  ctx.fillStyle='rgba(6,8,10,.97)';ctx.fillRect(0,0,W,H*0.055);
  ctx.fillStyle='rgba(196,54,48,'+pulse.toFixed(2)+')';
  ctx.beginPath();ctx.arc(W*0.030,H*0.0275,Math.max(4,H*0.007),0,Math.PI*2);ctx.fill();
  ctx.font='600 '+Math.round(Math.max(11,H*0.020))+'px ui-monospace,Consolas,monospace';
  ctx.textAlign='left';ctx.textBaseline='middle';
  ctx.fillStyle='#d8b0a6';
  ctx.fillText('911 · EMERGENCY LINE · ЭКСТРЕННЫЙ ВЫЗОВ',W*0.052,H*0.0275);
  ctx.textAlign='right';
  ctx.fillStyle='#8fa3ad';
  ctx.fillText(fmtTime(S.total),W-W*0.030,H*0.0275);
  ctx.restore();

  // ---- СУБТИТРЫ СНИЗУ
  const sy=H*0.752, sh2=H*0.248;
  ctx.fillStyle='rgba(6,8,10,.97)';ctx.fillRect(0,sy,W,sh2);
  ctx.fillStyle='rgba(190,205,215,.10)';ctx.fillRect(0,sy,W,1);

  const l=(S.phase==='talk'&&S.idx>=0&&S.gapT<=0)?LINES[S.idx]:null;
  if(l){
   const isD=l.who==='d';
   ctx.textAlign='left';ctx.textBaseline='top';
   ctx.font='700 '+Math.round(Math.max(10,H*0.019))+'px ui-monospace,Consolas,monospace';
   ctx.fillStyle=isD?'#c4564a':'#c9b98f';
   ctx.fillText(isD?'911 DISPATCH':'ОХРАННИК',W*0.055,sy+sh2*0.13);

   const fs=Math.round(Math.max(13,H*0.0295));
   ctx.font=(isD?'400 ':'500 ')+fs+'px ui-monospace,Consolas,monospace';
   const maxW=W*0.89;
   // Переводим реплику ЦЕЛИКОМ и только потом режем на строки: если резать
   // раньше, словарь не найдёт обрывки фразы и половина субтитра осталась бы
   // на русском при английской локали. Озвучка при этом не меняется никогда —
   // диспетчер говорит по-английски, работник по-русски, как и задумано.
   let txt=l.text;
   try{if(window.T)txt=window.T(l.text)||l.text}catch(e){}
   const rows=wrap(ctx,txt,maxW).slice(0,3);
   // Реплика мягко проявляется — резкое появление текста выбивает из сцены.
   ctx.globalAlpha=Math.min(1,S.lineT/0.22)*dim;
   ctx.fillStyle=isD?'#cfd8dd':'#e6dcc4';
   rows.forEach((r,i)=>ctx.fillText(r,W*0.055,sy+sh2*0.36+i*fs*1.30));
   ctx.globalAlpha=1;
  }
  ctx.restore();

  // ---- ПОДСКАЗКА ПРОПУСКА (не едет вместе с кадром — она про интерфейс)
  ctx.save();
  ctx.globalAlpha=0.42*dim;
  ctx.font='400 '+Math.round(Math.max(10,H*0.0175))+'px ui-monospace,Consolas,monospace';
  ctx.textAlign='right';ctx.textBaseline='bottom';
  ctx.fillStyle='#8fa3ad';
  ctx.fillText('ПРОБЕЛ — ПРОПУСТИТЬ',W-W*0.030,H-H*0.018);
  ctx.restore();
 }

 return {start,update,draw,skip,isActive,LINES};
})();
