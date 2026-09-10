window.NightShift=(()=>{
 const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
 const __avatar=window.__DEDAZ_AVATAR=new Image();__avatar.decoding='async';__avatar.src='assets/art/dedaz_player.png';
 const __vista=window.__EPILOGUE_VISTA=new Image();__vista.decoding='async';__vista.src='assets/art/epilogue_vista.jpg';
 let W=innerWidth,H=innerHeight,DPR=1,BASE_DPR=1;
 const mobile=/Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent)||Math.min(innerWidth,innerHeight)<720;
 // V88: РАЗРЕШЕНИЕ НА ТЕЛЕФОНАХ ПОДНЯТО ДО FULL HD.
 // Было: на телефоне буфер холста считался как CSS-размер × 1.5 × 0.72, то есть
 // экран 915 CSS-пикселей рисовался в 988 реальных — картинка мылилась, мелкий
 // текст и пиксельные фигуры расплывались. Стало: 'auto' целится в физическое
 // разрешение экрана, но не выше 1920 по длинной стороне — это ровно Full HD,
 // дальше расти незачем, а ниже уже видно мыло.
 // V110: РАЗРЕШЕНИЕ БОЛЬШЕ НЕ РЕЖЕТСЯ СКРЫТЫМ МНОЖИТЕЛЕМ.
 // ПОЧЕМУ ТАК БЫЛО: к выбранному разрешению в resize() применялся скрытый
 // коэффициент 0.78 при quality==='normal', а именно 'normal' стоял по
 // умолчанию у ВСЕХ игроков. Игрок ставил АВТО или 1920 — буфер холста
 // получался на 22% меньше экрана и растягивался обратно: мыло, плывущий
 // мелкий текст, размытые пиксельные фигуры. Плюс предел был 1920 даже на
 // мониторе 2560.
 // СТАЛО: множитель убран совсем, разрешение берётся ровно из настройки, АВТО
 // целится в физические пиксели экрана — до 2560 на компьютере и до 1920 на
 // телефоне (выше смысла нет, ниже уже видно мыло).
 const HD_CAP=mobile?1920:2560;
 // множитель от CSS-пикселей к пикселям буфера
 function resolutionScale(){
   const v=window.SaveSystem.settings.resolution||'auto';
   const long=Math.max(W,H), dp=Math.min(devicePixelRatio||1,3);
   const target=(v==='auto')?Math.min(HD_CAP,Math.round(long*dp)):Number(v)||HD_CAP;
   return Math.max(.5,Math.min(mobile?2.4:2.5,target/long));
 }
 function resize(){
  window.__PERF?.reset?.();
   const rawW=Math.max(320,innerWidth), rawH=Math.max(240,innerHeight);
   const ratio=rawW/rawH;
   // V86: телефон в горизонтали даёт соотношение около 2.4-2.7 (панель браузера
   // съедает высоту). Прежний предел 2.0 обрезал холст по бокам, и игра шла
   // узкой полосой с чёрными поясами слева и справа. Теперь до 2.6 кадр
   // занимает экран целиком, а поясами гасим только совсем экзотические экраны.
   const MAXR=2.6;
   if(ratio>MAXR){W=Math.floor(rawH*MAXR);H=rawH;}else if(ratio<.5){W=rawW;H=Math.floor(rawW*2);}else{W=rawW;H=rawH;}
   BASE_DPR=Math.min(devicePixelRatio||1,mobile?3:2);
   DPR=resolutionScale();
   canvas.width=Math.max(1,Math.floor(W*DPR));canvas.height=Math.max(1,Math.floor(H*DPR));
   canvas.style.width=W+'px';canvas.style.height=H+'px';canvas.style.position='fixed';canvas.style.left='50%';canvas.style.top='50%';canvas.style.transform='translate(-50%,-50%)';
   ctx.setTransform(DPR,0,0,DPR,0,0);
   ctx.imageSmoothingEnabled=true;
   // V110: признак «слабый режим» больше не зависит от скрытого quality —
   // только от выбранного профиля устройства и совсем низкого разрешения.
   document.body.classList.toggle('low-end',DPR<.9||window.SaveSystem.settings.deviceMode==='low');
   applyGfx();
   window.PostFX?.resize?.();
 }
 // ==== V110: ГРАФИЧЕСКИЕ НАСТРОЙКИ ТЕПЕРЬ ДЕЙСТВИТЕЛЬНО РАБОТАЮТ ====
 // ПОЧЕМУ ТАК БЫЛО: строки ТЕНИ, ОТРАЖЕНИЯ, СВЕТ, VSYNC, МАСШТАБ UI и РЕЖИМ
 // сохранялись в настройки, но ни один пиксель от них не менялся — в коде эти
 // ключи не читал никто. Игрок крутил ползунки впустую.
 // СТАЛО: значения собираются в window.GFX, и сцена читает их при отрисовке
 // (мягкие тени, отражения на полу, сила световых пятен), ЯРКОСТЬ применяется
 // к картинке сразу, РЕЖИМ ЭКРАНА действительно включает и выключает полный
 // экран, а мёртвые строки VSYNC и МАСШТАБ UI из настроек убраны.
 const GFX_LV={low:0,medium:1,high:2};
 window.GFX={shadow:1,reflect:1,light:1,bright:1,low:false};
 function applyGfx(){
   const c=window.SaveSystem.settings||{};
   const lv=k=>GFX_LV[String(c[k])]??2;
   const prof=c.deviceMode||'balanced';
   const cap=prof==='low'?0.6:prof==='balanced'?0.85:1;
   const G_=window.GFX;
   G_.shadow=[0,0.6,1][lv('shadows')]*cap;
   G_.reflect=[0,0.5,1][lv('reflections')]*cap;
   G_.light=[0.55,0.8,1][lv('lighting')];
   G_.bright=Math.max(.7,Math.min(1.6,Number(c.brightness)||1));
   G_.low=prof==='low';
   applyBrightness();
 }
 function applyBrightness(){
   const f=window.GFX.bright;
   const css=f===1?'':`brightness(${f.toFixed(2)})`;
   try{canvas.style.filter=css;}catch(e){}
   try{const p=document.getElementById('postfx');if(p)p.style.filter=css;}catch(e){}
 }
 // РЕЖИМ ЭКРАНА: в браузере есть ровно два состояния, и настройка их и даёт.
 function applyDisplayMode(){
   const want=window.SaveSystem.settings.displayMode==='fullscreen';
   try{
     if(want && !document.fullscreenElement){
       if(window.Platform?.fullscreen) window.Platform.fullscreen();
       else document.documentElement.requestFullscreen?.();
     }
     if(!want && document.fullscreenElement) document.exitFullscreen?.();
   }catch(e){}
 }
 function applyAudio(){
   try{
     window.AudioFX?.setMusic?.(Number(window.SaveSystem.settings.music??.42));
     window.AudioFX?.setSfx?.(Number(window.SaveSystem.settings.ui??.4));
     window.AudioFX?.update?.();
   }catch(e){console.warn('Audio settings:',e)}
   try{window.SaveSystem?.applyPlatformSettings?.()}catch(e){}
 }
 addEventListener('resize',resize);resize();
 addEventListener('orientationchange',()=>setTimeout(resize,80));
 addEventListener('fullscreenchange',()=>setTimeout(resize,80));
 // V110: если игрок вышел из полного экрана клавишей Esc или F11, строка
 // РЕЖИМ ЭКРАНА в настройках сама приходит в соответствие с реальностью.
 addEventListener('fullscreenchange',()=>{
   try{
     const want=document.fullscreenElement?'fullscreen':'windowed';
     if(window.SaveSystem.settings.displayMode!==want){
       window.SaveSystem.settings.displayMode=want;window.SaveSystem.saveSettings();
       const su=document.getElementById('settings-ui');if(su){su.dataset.ready='';}
     }
   }catch(e){}
 });

 // V107: ПОЧЕМУ ТАК БЫЛО: единственное обращение к localStorage вне SaveSystem
 // шло без try/catch. В окне площадки (iframe) при заблокированных сторонних
 // данных чтение бросает SecurityError, и вся инициализация game.js падала —
 // чёрный экран вместо игры. СТАЛО: чтение защищено, при ошибке считаем
 // настроек нет и просто подбираем профиль по железу.
 const savedCfgRaw=(()=>{try{return localStorage.getItem('night_shift_v10_settings')}catch(e){return null}})();
 const weakDevice=(navigator.deviceMemory&&navigator.deviceMemory<=4)||(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4);
 function lowProfile(){const s=window.SaveSystem.settings;s.deviceMode='low';s.effects='low';s.shadows='low';s.reflections='low';s.lighting='medium';s.fpsLimit=60;s.resolution='auto';}
 if(!savedCfgRaw){ if(weakDevice){lowProfile();} window.SaveSystem.settings.gfxProfile=110; window.SaveSystem.saveSettings(); }
 // V110: ПЕРЕСБОРКА ПРОФИЛЯ ДЛЯ УЖЕ ИГРАВШИХ.
 // ПОЧЕМУ ТАК БЫЛО: в старых сборках в localStorage уже записаны deviceMode:'low'
 // и quality:'normal' — без миграции такой игрок навсегда остался бы с тёмной
 // мыльной картинкой, даже если машина тянет больше.
 // СТАЛО: один раз поднимаем профиль до сбалансированного на неслабом железе
 // и ставим метку gfxProfile=110, чтобы не трогать выбор игрока впредь.
 else if(Number(window.SaveSystem.settings.gfxProfile||0)<110){
   const s=window.SaveSystem.settings;
   s.quality='high';
   if(!weakDevice && s.deviceMode==='low'){s.deviceMode='balanced';s.shadows='medium';s.reflections='medium';s.lighting='medium';s.effects='medium';}
   if(s.brightness===undefined)s.brightness=1;
   s.gfxProfile=110;
   window.SaveSystem.saveSettings();
 }
 resize();
 // V97: служебный ход для проверки КАЧЕСТВА. Автоопределение на слабой машине
 // (мало ядер) переводит игру в профиль low, и в этом профиле часть сцен
 // рисуется упрощённо. Раньше проверить обе ветки со скриншотов было нельзя:
 // тестовая машина всегда попадала в low. Теперь профиль можно задать адресом:
 //   ?qa=calm&t=14&hq=1  — принудительно высокий профиль
 //   ?qa=calm&t=14&lq=1  — принудительно низкий
 // Работает только вместе с qa, поэтому на обычный запуск не влияет.
 try{const _qp=new URLSearchParams(location.search);
  if(_qp.get('qa')){
   if(_qp.get('hq')==='1'){Object.assign(window.SaveSystem.settings,{deviceMode:'high',quality:'high',effects:'high',shadows:'high',reflections:'high',lighting:'high'});resize();}
   else if(_qp.get('lq')==='1'){Object.assign(window.SaveSystem.settings,{deviceMode:'low',effects:'low'});resize();}
  }}catch(e){}
 const G={
 state:'menu',securityFail:false,securityReason:'',securityTainted:false,finishing:false,night:window.SaveSystem.data.highestNight,time:0,winTimer:0,battery:100,score:0,fear:0,powerHour:0,powerActiveSeconds:0,powerUsage:0,powerPulse:0,speedMult:1,
 cam:1,monitor:false,monitorAnim:0,monitorTarget:false,officeMonitors:[false,false,false,false],look:{x:.5,y:.5,sx:.5,sy:.5},
 doors:{left:false,right:false},
 lights:{left:{on:false,flicker:0},right:{on:false,flicker:0}},
 phone:{state:'idle',active:false,timer:0,line:'',currentCall:null,archive:[],callTriggered:false,subtitle:'',subtitleTimer:0},
 radio:{on:false,timer:7},note:{state:'table',open:false,timer:0},dialer:false,dialed:'',
 event:{timer:0,kind:'',text:'',active:false},special:{type:'',timer:0,active:false,done:false},screamer:{active:false,timer:0,kind:'tarhun',power:0},message:'',messageT:0,mouse:{x:.5,y:.5},
 mask:{available:false,worn:false},ventCreakCd:0,ventDust:0,camEnterCd:0,ventAmbientCd:0,ventAmbientPlays:0,ventAmbientMax:2,viewYaw:0,viewYawTarget:0,viewKeys:{l:0,r:0},yawPos:1,
 monster:window.MonsterAI.make(),monsters:[],ending:0,teaser:0,menuPulse:0,switchFx:0,epilogueTimer:0,
 deskLamp:true,fan:true,mug:3,monLine:{text:'',kind:'',timer:0},death:null,heartCd:0,breathCd:0,fanCoast:0,
 // V111: ВНЕЗАПНОЕ ПРИСУТСТВИЕ. Иногда по офису мелькает тень и гаснет свет —
 // не смерть, а намёк, что кто-то рядом. Срабатывает реже на ранних сменах.
 presence:null,presenceCd:18+Math.random()*22,
 // V112: ЗАПИСНАЯ ДОСКА. Кликабельный планшет на стене офиса — открывает
 // режим рисования. Игрок может рисовать что угодно, выйти — атмосферно
 // (затемнение + шёпот). Пока открыто — игра стоит на паузе.
 sketch:{open:false,strokes:[],cur:null,color:'#c1382f',size:3,fade:0,exitPhase:0,exitT:0,blackA:0,openT:0,rev:0},
 // V83: прогресс хода створок (0 — открыта, 1 — закрыта) и остаточная дрожь
 // после удара о порог, плюс затемнение на смене экранов.
 doorAnim:{left:0,right:0},doorSettle:{left:0,right:0},stateFade:0,lastState:'',
 achievements:window.SaveSystem.data.achievements,achPopups:[],settingTab:0,platformPaused:false,pauseFrom:'game',phoneArchiveOpen:false,menuVariant:(window.SaveSystem.data.menuVariant||'normal')
};
// V111: ОБЩИЙ СПИСОК ДОСТИЖЕНИЙ. Используется и экраном отметок, и всплывающими
// уведомлениями — чтобы название и описание новой ачивки не пришлось править в двух местах.
const ACH_LIST=[
 ['first_blood','ПЕРВАЯ НОЧЬ','Страх — это просто дверь. В первую ночь ты её открыл.'],
 ['call_answered','ЛИНИЯ ОТВЕТА','Голос в трубке. Пустота на другом конце. Ты ответил.'],
 ['radio_listener','РАДИОТЕНЬ','Они говорят. Ты слушаешь. Значит, ты ещё здесь.'],
 ['watcher','НАБЛЮДАТЕЛЬ','Тот, кто смотрит слишком пристально, видит слишком много.'],
 ['power_saver','ЭКОНОМНЫЙ РЕЖИМ','Тьма — не враг. Враг — тот, кто прячется в ней.'],
 ['door_keeper','ПОСТ ОХРАНЫ','Дверь — последний аргумент. Ты его сохранил.'],
 ['felix_signal','КРАСНЫЙ СИГНАЛ','Некоторые сигналы невозможно игнорировать. Ты пробовал.'],
 ['five_nights','ПЯТЬ СМЕН','Пять раз встретил рассвет. Рассвет не встретил тебя.'],
 ['night_owl','БЕЗ СТРАХА','Страх — это компас. Ты шёл, куда он указывал.'],
 ['archive','АРХИВИСТ','Записи — это память умерших. Ты сохранил их голоса.'],
 ['radio_again','ЕЩЁ РАЗ','Молчание стало невыносимым. Ты нарушил его снова.'],
 ['last_shift','ПОСЛЕДНИЙ ПОСТ','Последняя смена всегда кажется первой — изнутри.'],
 ['ending_dawn','РАССВЕТ','Солнце встаёт над всеми. Даже над теми, кто выжил.'],
 ['ending_ash','ПЕПЕЛ','Пепел — честнее, чем молчание. Ты выбрал правду.'],
 ['ending_suit','ЕЩЁ ОДИН КОСТЮМ','Некоторые кресла пустеют навсегда. Теперь ты знаешь — какое.'],
 ['ending_trap','КОСТЮМ-ЛОВУШКА','Он надел это сам. Финал — не наказание. Это — выбор.'],
 ['ending_truth','ПРАВДА','Кассета 1993 года. Он вынес её наружу — и молчание кончилось.'],
 ['too_many_deaths','ПЯТАЯ СМЕРТЬ','Умереть пять раз — значит пять раз решить попробовать ещё.'],
 ['stepa_call','ДЛИННЫЙ НОМЕР','Одиннадцать цифр. Линия мертва с 2003 года. Ты набрал её всё равно.']
];
 // ===== V71: адаптивная производительность =====
 // Игра сама следит за частотой кадров и выбирает уровень нагрузки:
 //   0 — всё включено, 1 — тяжёлые проходы урезаны, 2 — минимум эффектов.
 // Повышается быстро (чтобы лаг ушёл сразу), снимается медленно (без мигания качества).
 const PERF={dt:1/60,fps:60,tier:0,hold:0,warm:0};
 window.__PERF=PERF;
 function perfSample(dt){
  const raw=(dt>0.0002&&dt<0.5)?dt:PERF.dt;
  PERF.dt+=(raw-PERF.dt)*0.06;
  PERF.fps=1/Math.max(1e-4,PERF.dt);
  if(PERF.warm<90){PERF.warm++;return;}
  const f=PERF.fps, slow=raw>1/42; // текущий кадр тоже долгий, а не одиночный провал при загрузке
  if(f<32&&slow&&PERF.tier<2){PERF.hold+=dt;if(PERF.hold>1){PERF.tier=2;PERF.hold=0;}}
  else if(f<46&&slow&&PERF.tier<1){PERF.hold+=dt;if(PERF.hold>1.5){PERF.tier=1;PERF.hold=0;}}
  else if(f>54&&PERF.tier>0){PERF.hold-=dt;if(PERF.hold<-2){PERF.tier--;PERF.hold=0;}}
  else PERF.hold*=0.9;
 }
 // Сброс замеров после загрузок и смены сцен: просадка в меню или во вступлении
 // больше не урезает качество уже в самой смене.
 PERF.reset=()=>{PERF.dt=1/60;PERF.fps=60;PERF.warm=0;PERF.hold=0;PERF.tier=0;};
 // Сколько раз в секунду пересобирать тяжёлый кадр с камеры.
 // Настоящее видеонаблюдение идёт не 60 кадров в секунду — интерфейс остаётся плавным,
 // а сама картинка сигнала обновляется реже и от этого только выигрывает.
 function feedFps(low){return low?(PERF.tier?14:20):(PERF.tier===0?30:PERF.tier===1?22:16);}
 // Discrete camera yaw positions: 0=left door, 1=center, 2=right door.
 const YAW_POS=[-0.95,0,0.95];
 const intro={t:0};
 // Подсказки на экране отключены полностью — текстовых сообщений больше нет.
 function setMessage(t,d=2){G.message='';G.messageT=0}
 // Camera tablet state machine. One source of truth for mouse, touch and keyboard input.
 function toggleCameras(force){
  const want=typeof force==='boolean'?force:!G.monitorTarget;
  if(want){
   if(G.state!=='game'||G.screamer.active||G.state==='lose'||G.state==='win')return false;
   if(G.monitorTarget)return true;
   G.monitorTarget=true;G.monitor=true;G.monitorAnim=Math.max(G.monitorAnim,.05);
   window.AudioFX.unlock();window.AudioFX.play('tabletOpen',.8,{group:'ui'});
   // Случайный скример при входе в камеры: короткая вспышка и резкий звук.
   // Не убивает, только пугает; между испугами есть пауза и защита в начале смены.
   if(G.time>25&&(G.camScareCd||0)<=0&&Math.random()<.16){
     G.screamer={active:true,timer:1.15,dur:1.15,kind:'camera',power:1};
     G.camScareCd=45+Math.random()*40;
     window.AudioFX.playJumpscare?.(1);
     try{navigator.vibrate?.([90,40,120])}catch(e){}
   }
   return true;
  }
  if(!G.monitorTarget&&!G.monitor)return true;
  G.monitorTarget=false;window.AudioFX.play('tabletClose',.75,{group:'ui'});return true;
 }
 function openCameras(){return toggleCameras(true);}
 function closeCameras(){return toggleCameras(false);}
 // ==== V70: аниматроники разговаривают. Голос мрачный и каждый раз чуть другой;
 // голос прошлого охранника (запись с плёнки) этой обработки не касается. ====
 // V83: голос берётся из записанных дорожек (js/voice.js). У каждого
 // аниматроника своя обработка, поэтому МОНСТР, ФЕЛИКС, EXO и LAV звучат
 // по-разному, а не одним синтезатором браузера. Субтитр живёт ровно столько,
 // сколько длится реплика.
 G.monSay=(text,kind,opts)=>{
   if(!text)return;
   const spoken=window.VoiceLines?.playByText?.(text,'monster',1)||null;
   const dur=window.VoiceLines?.durationByText?.(text)||0;
   // V71: opts.subtitle===false — только голос, без красной строки поверх экрана
   // (используется телефонными линиями 404 / 666 / 909, где текст и так виден в панели связи).
   if(!opts||opts.subtitle!==false)G.monLine={text:text.toUpperCase(),kind:kind||'main',timer:Math.max(4.6,dur+1.2),fade:0};
   window.AudioFX.synth?.('sting',spoken?.22:.35);
   if(spoken)return;
   // Запасной путь: если дорожка почему-то не проигралась (жёсткая политика
   // автовоспроизведения), реплику всё равно слышно — синтезатором браузера.
   try{
     const sp=window.speechSynthesis;if(!sp)return;
     const u=new SpeechSynthesisUtterance(text);
     u.lang=(window.I18N?.voiceLang?.()==='en')?'en-US':'ru-RU';
     u.rate=0.62+Math.random()*0.10;               // медленно
     u.pitch=(kind==='exo'?0.18:kind==='lav'?0.34:0.26)+Math.random()*0.10; // низко
     u.volume=Math.max(0,Math.min(1,(window.SaveSystem.settings.monster??0.8)*0.9));
     sp.speak(u);
   }catch(e){}
 };
 G.say=setMessage;G.ach=id=>{if(!window.SaveSystem.data.achievements.includes(id)){window.SaveSystem.data.achievements.push(id);G.achievements=window.SaveSystem.data.achievements;window.SaveSystem.save();
   // V111: всплывающее уведомление о новом достижении. Показывается, если игрок
   // не отключил его в настройках. Ставится в очередь — несколько подряд не
   // накладываются, а выезжают по очереди снизу экрана.
   if(window.SaveSystem.settings.achPopups!==false){
     const meta=ACH_LIST.find(a=>a[0]===id);G.achPopups.push({id,name:meta?meta[1]:'ДОСТИЖЕНИЕ',desc:meta?meta[2]:'',t:0,life:4.2});
   }
 }}
 G.onMonsterMove=room=>{if(room===0)setMessage('ШОРОХ У ДВЕРИ',1.5);else setMessage('Движение: '+window.World.rooms[room].name,1.2)};
 // ==== V70: смерть охранника. Две катсцены, выбор случайный:
 // 1 — аниматроник врывается, удар когтями, кровь на экране (анимация, не просто скример);
 // 2 — его хватают, он теряет сознание, приходит в себя на складе, где его убивают,
 //     экран заливает кровью, и игра выкидывает в «сломанное» главное меню. ====
 G.kill=why=>{
   if(G.death)return;
   const kinds=(G.monsters||[]).filter(m=>m&&m.room===0);
   const kind=(kinds[0]&&kinds[0].kind)||(why&&why!=='power'?why:'main');
   // V93: катсцена выбирается по тому, кто пришёл, а не бросанием монетки.
   // МОНСТР и EXO врываются (1), ФЕЛИКС и LAV уносят на склад (2),
   // темнота от питания — всегда вторая, длинная.
   const VAR={main:1,exo:1,felix:2,lav:2,power:2};
   G.death={variant:VAR[kind]||(Math.random()<0.5?1:2),t:0,kind,phase:-1};
   G.state='death';G.ending=2;
   // V73: счётчик смертей за всё прохождение — он выбирает концовку после 5-й главы.
   window.SaveSystem.data.deaths=Math.max(0,Math.floor(Number(window.SaveSystem.data.deaths)||0))+1;
   if(window.SaveSystem.data.deaths>=5)G.ach?.('too_many_deaths');
   G.adRetryUsed=false;   // V104: на каждую смерть — одно предложение второй попытки за рекламу
   G.monitor=false;G.monitorTarget=false;G.monitorAnim=0;G.dialer=false;G.phoneArchiveOpen=false;G.note.open=false;
   G.menuVariant='broken';window.SaveSystem.data.menuVariant='broken';window.SaveSystem.save();
   try{window.Platform.stopGameplay?.()}catch(e){}
   window.AudioFX.stopAll?.();
   window.AudioFX.synth?.('grab',1);
   window.AudioFX.play('scream',1.15,{group:'monster'});
   // V91: поверх общего крика — голос конкретного аниматроника: у каждого своя
   // нота глотки и своя частота кольцевой модуляции, поэтому слышно, кто именно
   // тебя достал.
   try{window.MonsterAudio?.scream(kind)}catch(e){}
   try{navigator.vibrate?.([70,30,160,40,220])}catch(e){}
 };
 const DEATH1_DUR=5.2, DEATH2_DUR=11.4;
 function deathUpdate(dt){
   const d=G.death;if(!d)return;
   d.t+=dt;
   const ph=(n,fn)=>{if(d.phase<n){d.phase=n;fn();}};
   if(d.variant===1){
     if(d.t>0.55)ph(0,()=>{window.AudioFX.synth?.('bone',.9);window.AudioFX.synth?.('squelch',.8);});
     if(d.t>1.25)ph(1,()=>{window.AudioFX.play('scream',1.1,{group:'monster'});window.AudioFX.synth?.('squelch',.7);});
     if(d.t>2.40)ph(2,()=>{window.AudioFX.synth?.('rumble',.7);});
     if(d.t>=DEATH1_DUR){G.death=null;G.state='lose';window.AudioFX.update();}
   } else {
     if(d.t>1.20)ph(0,()=>{window.AudioFX.synth?.('blackout',.9);});
     if(d.t>2.70)ph(1,()=>{window.AudioFX.synth?.('metalDrag',.8);window.AudioFX.synth?.('drip',.5);});
     if(d.t>4.60)ph(2,()=>{window.AudioFX.play('scream',1.2,{group:'monster'});window.AudioFX.synth?.('bone',.9);});
     if(d.t>6.70)ph(3,()=>{window.AudioFX.synth?.('squelch',1);window.AudioFX.play('scream',1,{group:'monster'});});
     if(d.t>8.20)ph(4,()=>{window.AudioFX.synth?.('rumble',.8);});
     if(d.t>=DEATH2_DUR){G.death=null;goMenu();G.menuVariant='broken';window.AudioFX.update();}
   }
 }
 // Кровь: детерминированные брызги и стекающие потёки (одинаковые в течение катсцены).
 function bloodSplat(c,x,y,r,seed,alpha){
   const rnd=n=>{const v=Math.sin(seed*57.13+n*91.7)*43758.5453;return v-Math.floor(v);};
   c.save();c.globalAlpha=alpha===undefined?0.92:alpha;
   // V82: более тёмная, «настоящая» кровь — влажное ядро, коричневатый ореол, капли с хвостами
   c.fillStyle='#3a0207';c.beginPath();c.ellipse(x,y,r,r*(0.7+rnd(1)*0.5),rnd(2)*3,0,Math.PI*2);c.fill();
   c.fillStyle='#5d0409';c.beginPath();c.ellipse(x,y,r*0.7,r*0.58,rnd(3)*3,0,Math.PI*2);c.fill();
   c.fillStyle='#7a0712';c.beginPath();c.ellipse(x,y,r*0.45,r*0.4,rnd(3)*3,0,Math.PI*2);c.fill();
   // мокрый блик на центре пятна
   c.fillStyle='rgba(255,180,170,.18)';c.beginPath();c.ellipse(x-r*0.2,y-r*0.2,r*0.22,r*0.16,0,0,Math.PI*2);c.fill();
   for(let i=0;i<14;i++){
     const a=rnd(10+i)*Math.PI*2, dd=r*(0.9+rnd(30+i)*2.6), rr=r*(0.07+rnd(50+i)*0.24);
     c.fillStyle=i%3?'#4d050a':'#8c0810';
     c.beginPath();c.arc(x+Math.cos(a)*dd,y+Math.sin(a)*dd,rr,0,Math.PI*2);c.fill();
     // хвост-потёк от капли вниз
     if(rr>r*0.1){c.fillStyle=i%3?'#3a0207':'#6d060c';c.fillRect(x+Math.cos(a)*dd-rr*0.4,y+Math.sin(a)*dd,rr*0.8,r*(0.4+rnd(70+i)*1.2));}
   }
   c.restore();
 }
 // V82: силуэт внутренностей — тёмные извитые формы, намекающие на мясо и
 // органы, но без анатомической наглядности. Кинематографичный хоррор, не вскрытие.
 function viscera(c,x,y,r,seed,alpha){
   const rnd=n=>{const v=Math.sin(seed*31.7+n*64.1)*43758.5453;return v-Math.floor(v);};
   c.save();c.globalAlpha=(alpha===undefined?0.85:alpha);
   for(let i=0;i<6;i++){
     const cx=x+(rnd(i)-0.5)*r*1.6, cy=y+(rnd(7+i)-0.5)*r*1.2;
     c.strokeStyle=i%2?'#2a0306':'#4d050a';c.lineWidth=r*(0.18+0.12*rnd(13+i));
     c.beginPath();
     let px=cx,py=cy;
     for(let s=0;s<5;s++){
       px+=Math.cos(rnd(20+i+s)*6.28)*r*0.3;py+=Math.sin(rnd(30+i+s)*6.28)*r*0.2+r*0.12;
       s?c.lineTo(px,py):c.moveTo(px,py);
     }
     c.stroke();
   }
   c.fillStyle='rgba(80,8,12,.5)';
   for(let i=0;i<5;i++){c.beginPath();c.arc(x+(rnd(50+i)-0.5)*r,y+(rnd(60+i)-0.5)*r*0.8,r*0.3,0,Math.PI*2);c.fill();}
   c.restore();
 }
 function bloodDrips(c,W2,H2,k,seed){
   c.save();
   for(let i=0;i<16;i++){
     const rnd=(n)=>{const v=Math.sin(seed*13.7+i*77.1+n*3.3)*43758.5453;return v-Math.floor(v);};
     const x=W2*(0.03+0.94*rnd(1)), w=6+rnd(2)*20, len=H2*(0.12+0.85*rnd(3))*k;
     c.fillStyle=i%2?'rgba(77,5,10,.90)':'rgba(42,3,6,.88)';
     c.fillRect(x,0,w,len);
     c.beginPath();c.ellipse(x+w*0.5,len,w*0.5,w*0.62,0,0,Math.PI*2);c.fill();
   }
   c.restore();
 }
 function drawDeath(){
   const d=G.death;if(!d)return;
   const t=d.t, low=document.body.classList.contains('low-end');
   ctx.save();
   ctx.fillStyle='#05070a';ctx.fillRect(0,0,W,H);
   if(d.variant===1){
     // ---- КАТСЦЕНА 1: рывок, удар когтями, кровь ----
     const shake=t<2.6?(1-t/2.6)*16:0;
     ctx.save();ctx.translate(Math.sin(t*61)*shake,Math.cos(t*47)*shake*0.7);
     // остатки комнаты: тёмный проём двери и аварийный свет
     const g=ctx.createRadialGradient(W*.5,H*.42,20,W*.5,H*.5,H*1.05);
     g.addColorStop(0,'rgba(74,10,12,.55)');g.addColorStop(1,'rgba(2,3,5,1)');
     ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
     ctx.fillStyle='#0a0d12';ctx.fillRect(W*.06,H*.16,W*.20,H*.62);ctx.fillRect(W*.74,H*.16,W*.20,H*.62);
     // силуэт бросается в кадр
     const k=Math.min(1,t/0.62), sc=(H/230)*(0.55+2.6*k*k);
     const mx=W*(0.5-0.30*(1-k)), my=H*(0.62+0.22*(1-k));
     ctx.save();ctx.globalAlpha=.98;
     drawPixelMonster(ctx,mx,my,{kind:d.kind,state:'attacking'},sc,{noShadow:true});
     ctx.restore();
     // удар когтями: три полосы прочерчивают экран
     if(t>0.52){
       const sk=Math.min(1,(t-0.52)/0.34);
       for(let i=0;i<3;i++){
         const off=i*H*0.11-H*0.06, x0=-W*0.1+ (W*1.3)*sk;
         ctx.save();ctx.globalAlpha=Math.max(0,1-(t-0.52)/1.6);
         ctx.strokeStyle='rgba(255,236,232,.85)';ctx.lineWidth=5-i;
         ctx.beginPath();ctx.moveTo(x0-W*0.5,H*0.32+off);ctx.lineTo(x0,H*0.62+off);ctx.stroke();
         ctx.strokeStyle='rgba(150,8,16,.85)';ctx.lineWidth=13-i*3;
         ctx.beginPath();ctx.moveTo(x0-W*0.5,H*0.34+off);ctx.lineTo(x0,H*0.64+off);ctx.stroke();
         ctx.restore();
       }
     }
     ctx.restore();
     // кровь наползает: брызги, затем потёки
     if(t>0.72){
       const n=Math.min(14,Math.floor((t-0.72)*11));
       for(let i=0;i<n;i++){
         const rnd=(q)=>{const v=Math.sin(i*37.7+q*11.3)*43758.5453;return v-Math.floor(v);};
         bloodSplat(ctx,W*(0.06+0.88*rnd(1)),H*(0.10+0.80*rnd(2)),H*(0.03+0.10*rnd(3)),i+1,Math.min(1,(t-0.72)*2));
       }
     }
     if(t>1.15)bloodDrips(ctx,W,H,Math.min(1,(t-1.15)/2.2),3);
     // V82: внутренности — тёмные извитые массы в месте удара, кинематографично
     if(t>0.85){const n=3;for(let i=0;i<n;i++)viscera(ctx,W*(0.3+0.4*((i*41)%100)/100),H*(0.5+0.3*((i*67)%100)/100),H*(0.10+0.05*((i*23)%100)/100),i+7,Math.min(.9,(t-0.85)*1.4));}
     // V82: стекающая кровь крупным планом — мокрые потёки в нижней трети экрана
     if(t>1.0){
       ctx.save();ctx.globalAlpha=Math.min(.6,(t-1.0)*1.2);
       for(let i=0;i<7;i++){
         const bx=W*(0.08+0.85*(i*53%100)/100), bl=H*(0.12+0.18*((i*29)%100)/100), bw=H*0.02;
         const bg=ctx.createLinearGradient(bx,H-bl,bx,H);
         bg.addColorStop(0,'rgba(40,3,6,.7)');bg.addColorStop(1,'rgba(40,3,6,0)');
         ctx.fillStyle=bg;ctx.fillRect(bx,H-bl,bw,bl);
       }
       ctx.restore();
     }
     // V82: пульсирующий аварийный красный свет + плёночное зерно
     if(t>0.5){
       const pulse=0.5+0.5*Math.sin(t*9);
       ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=0.06+0.04*pulse;
       ctx.fillStyle='#a00810';ctx.fillRect(0,0,W,H);ctx.restore();
       if(!low){ctx.save();ctx.globalAlpha=0.05;ctx.fillStyle='#fff';
         for(let i=0;i<60;i++)ctx.fillRect(W*((i*131)%100)/100,H*((i*71)%100)/100,1,1);
       ctx.restore();}
     }
     // морда вплотную к камере
     if(t>1.5&&t<3.5){
       const a=Math.min(1,(t-1.5)/0.4)*Math.min(1,(3.5-t)/0.5);
       ctx.save();ctx.globalAlpha=a*0.95;
       drawPixelMonster(ctx,W*0.5,H*1.16,{kind:d.kind,state:'attacking'},(H/230)*3.6,{noShadow:true});
       ctx.restore();
     }
     if(t>3.2){ctx.fillStyle=`rgba(0,0,0,${Math.min(1,(t-3.2)/1.5).toFixed(3)})`;ctx.fillRect(0,0,W,H);}
   } else {
     // ---- КАТСЦЕНА 2: схватили → отключился → склад → убивают ----
     if(t<1.25){
       // руки с двух сторон, дёрганая камера
       const shake=12*(1-t/1.25);
       ctx.save();ctx.translate(Math.sin(t*73)*shake,Math.cos(t*59)*shake);
       const g=ctx.createRadialGradient(W*.5,H*.45,20,W*.5,H*.5,H);
       g.addColorStop(0,'rgba(58,8,10,.5)');g.addColorStop(1,'rgba(2,3,5,1)');
       ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
       const k=Math.min(1,t/0.9);
       ctx.fillStyle='#101720';
       ctx.save();ctx.translate(-W*0.12+W*0.28*k,H*0.52);ctx.rotate(0.22);ctx.fillRect(0,-H*0.06,W*0.34,H*0.12);
       ctx.fillStyle='#1a2430';for(let i=0;i<4;i++)ctx.fillRect(W*0.30,-H*0.05+i*H*0.03,W*0.09,H*0.018);ctx.restore();
       ctx.fillStyle='#101720';
       ctx.save();ctx.translate(W*1.12-W*0.28*k,H*0.56);ctx.rotate(-0.22);ctx.fillRect(-W*0.34,-H*0.06,W*0.34,H*0.12);
       ctx.fillStyle='#1a2430';for(let i=0;i<4;i++)ctx.fillRect(-W*0.39,-H*0.05+i*H*0.03,W*0.09,H*0.018);ctx.restore();
       ctx.restore();
       ctx.fillStyle=`rgba(0,0,0,${Math.max(0,(t-0.85)/0.4).toFixed(3)})`;ctx.fillRect(0,0,W,H);
     } else if(t<2.75){
       // темнота: только пульс и красноватая пелена
       const p=0.5+0.5*Math.sin((t-1.25)*7.5);
       ctx.fillStyle='#020304';ctx.fillRect(0,0,W,H);
       const g=ctx.createRadialGradient(W*.5,H*.5,10,W*.5,H*.5,H*0.9);
       g.addColorStop(0,`rgba(110,10,14,${(0.05+0.09*p).toFixed(3)})`);g.addColorStop(1,'rgba(0,0,0,0)');
       ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
     } else if(t<8.3){
       // склад: взгляд лежащего человека — кадр наклонён и приподнят
       const st=t-2.75;
       ctx.save();
       const tilt=0.34-0.05*Math.sin(st*0.7), sway=Math.sin(st*1.6)*6;
       ctx.translate(W*0.5,H*0.5);ctx.rotate(tilt);ctx.scale(1.18,1.18);ctx.translate(-W*0.5+sway,-H*0.5+H*0.06);
       try{window.World.storage(ctx,W,H,performance.now()/1000);}catch(e){ctx.fillStyle='#0b0f13';ctx.fillRect(0,0,W,H);}
       // силуэты, которые подходят ближе
       const app=Math.min(1,st/3.4);
       const kinds=['main','felix','lav'];
       kinds.forEach((kk,i)=>{
         const sc=(H/230)*(0.65+1.5*app), px=W*(0.28+i*0.22), py=H*(0.72+0.16*app);
         ctx.save();ctx.globalAlpha=0.35+0.6*app;
         drawPixelMonster(ctx,px,py,{kind:kk,state:'attacking'},sc,{noShadow:true});
         ctx.restore();
       });
       ctx.restore();
       // тёмная рамка: сознание уходит
       const vg=ctx.createRadialGradient(W*.5,H*.5,H*(0.42-0.22*Math.min(1,st/5.2)),W*.5,H*.5,H*0.95);
       vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.98)');
       ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
       // вспышки удара и первая кровь
       if(st>1.85){
         const n=Math.min(18,Math.floor((st-1.85)*8));
         for(let i=0;i<n;i++){
           const rnd=(q)=>{const v=Math.sin(i*29.3+q*7.7)*43758.5453;return v-Math.floor(v);};
           bloodSplat(ctx,W*(0.04+0.92*rnd(1)),H*(0.08+0.86*rnd(2)),H*(0.025+0.11*rnd(3)),i+11,0.95);
         }
       }
       if(st>2.1&&Math.sin(st*22)>0.7){ctx.fillStyle='rgba(170,14,20,.20)';ctx.fillRect(0,0,W,H);}
       if(st>3.95)bloodDrips(ctx,W,H,Math.min(1,(st-3.95)/1.6),7);
     } else {
       // экран заливает кровью, затем провал в темноту → «сломанное» меню
       const bt=t-8.3;
       ctx.fillStyle='#0a0103';ctx.fillRect(0,0,W,H);
       const fill=Math.min(1,bt/1.5);
       const g=ctx.createLinearGradient(0,H*(1-fill)-H*0.1,0,H);
       g.addColorStop(0,'rgba(90,4,9,0)');g.addColorStop(.25,'rgba(120,6,12,.95)');g.addColorStop(1,'#5c0409');
       ctx.fillStyle=g;ctx.fillRect(0,H*(1-fill)-H*0.1,W,H*fill+H*0.12);
       for(let i=0;i<22;i++){
         const rnd=(q)=>{const v=Math.sin(i*41.9+q*5.1)*43758.5453;return v-Math.floor(v);};
         bloodSplat(ctx,W*rnd(1),H*rnd(2),H*(0.04+0.12*rnd(3)),i+31,Math.min(1,bt/0.8));
       }
       if(bt>1.4){ctx.fillStyle=`rgba(0,0,0,${Math.min(1,(bt-1.4)/1.5).toFixed(3)})`;ctx.fillRect(0,0,W,H);}
     }
   }
   // общий зерновой шум сверху
   if(!low){
     ctx.save();ctx.globalAlpha=.06;
     for(let i=0;i<90;i++){ctx.fillStyle=i%2?'#fff':'#000';ctx.fillRect(Math.random()*W,Math.random()*H,2,2);}
     ctx.restore();
   }
   // ==== V93: У КАЖДОГО СВОЙ КОНЕЦ ====
   // Было: обе катсцены выглядели одинаково, кто бы ни убил, — только модель
   // менялась. Стало: свой оттенок кадра и своя строка. Кто именно тебя нашёл,
   // видно и по цвету, и по тексту.
   {
     const DK={
       main :{tint:'#5a0a0e',cap:'ОН ВОШЁЛ В ОХРАННУЮ. ДВЕРЬ БЫЛА ОТКРЫТА.'},
       felix:{tint:'#3d0a33',cap:'ФЕЛИКС УЗНАЛ ЛИЦО ПОД МАСКОЙ.'},
       exo  :{tint:'#0b2a36',cap:'ЭКЗОСКЕЛЕТ НАШЁЛ ТЕБЯ БЕЗ СВЕТА.'},
       lav  :{tint:'#3a2f06',cap:'МУЗЫКА КОНЧИЛАСЬ. ОН ПРИШЁЛ ЗА ТИШИНОЙ.'},
       power:{tint:'#141416',cap:'ПИТАНИЕ КОНЧИЛОСЬ. ДАЛЬШЕ БЫЛО ТИХО.'}
     };
     const dk=DK[d.kind]||DK.main;
     ctx.save();
     ctx.globalCompositeOperation='overlay';ctx.globalAlpha=0.16;
     ctx.fillStyle=dk.tint;ctx.fillRect(0,0,W,H);
     ctx.restore();
     if(t>1.9){
       const a=Math.min(1,(t-1.9)/1.1);
       ctx.save();
       ctx.font=`700 ${Math.round(Math.max(11,Math.min(19,W/62)))}px "Oswald",Impact,sans-serif`;
       ctx.textAlign='center';
       ctx.fillStyle=`rgba(0,0,0,${(0.6*a).toFixed(3)})`;ctx.fillText(dk.cap,W*.5+1,H*.925+1);
       ctx.fillStyle=`rgba(206,198,190,${(0.72*a).toFixed(3)})`;ctx.fillText(dk.cap,W*.5,H*.925);
       ctx.restore();
     }
   }
   ctx.restore();
 }
 G.syncCloudProgress=()=>{G.night=Math.min(5,Math.max(1,window.SaveSystem.data.highestNight||1));G.achievements=window.SaveSystem.data.achievements||[]};
 // V108: ТРЕБОВАНИЕ 23.3 — GameplayAPI.stop() ПРИ УХОДЕ СО СТРАНИЦЫ.
 // ПОЧЕМУ ТАК БЫЛО: пауза глушила звук и останавливала обновление, но площадке
 // об этом не сообщала: разметка продолжала считать геймплей активным в чужой
 // вкладке — по требованиям это расхождение состояния с разметкой.
 // СТАЛО: пауза сразу отправляет stop(), возврат — start(), как в разделе «Геймплей».
 G.platformPause=()=>{G.platformPaused=true;window.AudioFX.setPlatformMuted?.(true);try{window.Platform?.stopGameplay?.()}catch(e){}};
 G.platformResume=()=>{G.platformPaused=false;window.AudioFX.setPlatformMuted?.(false);if(G.state==='game')window.Platform.startGameplay()};
  // === ДВЕРИ ОХРАННОЙ ===
 // Единственное место, где открывается/закрывается дверь охраны, и единственное,
 // где звучит новый звук двери (assets/sfx/door_move.mp3). Звук панорамируется по
 // стороне двери; когда планшет с камерами открыт, дверь слышно чуть глуше.
 function guardDoorSound(side,closing){
   const pan=side==='left'?-0.7:0.7;
   const vol=G.monitor?0.85:1;
   // Разблокировать аудио на этом же жесте — иначе первый звук за сессию может пропасть.
   try{window.AudioFX.unlock()}catch(e){}
   window.AudioFX.play('door',vol,{group:'ui',pan});
 }
 function toggleGuardDoor(side){
   if(!G.doors)return;
   G.doors[side]=!G.doors[side];
   guardDoorSound(side,G.doors[side]);
   // Без надписи сверху: состояние двери читается по самой створке и звуку.
 }
 // С 3-й смены к троим добавляется четвёртый — LAV.
 function spawnMonsters(){
   const list=[window.MonsterAI.make('main'),window.MonsterAI.make('felix'),window.MonsterAI.make('exo')];
   if(G.night>=3||G.extra)list.push(window.MonsterAI.make('lav'));
   // ==== V93: СМЕНЫ 6 И 7 ====
   // 6 — глухая смена: все четверо злее, чем на пятой.
   // 7 — своя смена: агрессия каждого задана игроком от 0 до 20;
   // ноль значит, что этот из костюма вообще не выходит.
   if(G.extra===6){list.forEach(m=>{m.aggrNight=7});return list}
   if(G.extra===7){
     const lv=G.customLv||{main:10,felix:10,exo:10,lav:10};
     const out=[];
     list.forEach(m=>{
       const v=Math.max(0,Math.min(20,Number(lv[m.kind])||0));
       if(v<=0)return;                       // выключен совсем
       m.aggrNight=1+Math.round((v/20)*9);   // 1..10 — десятка жёстче любой сюжетной смены
       out.push(m);
     });
     return out.length?out:[list[0]];
   }
   return list;
 }

// ================== V102: СКОРОСТЬ РАСХОДА ПО СМЕНАМ ==================
// Смена длится 300 секунд. Полный заряд — 100%.
// Скорость ниже — это расход в процентах за секунду НА ОДИН уровень нагрузки.
// Средний допустимый уровень за ночь = 100 / (RATE * 300). То есть:
//   смена 1 — 3.1   (можно почти не экономить)
//   смена 2 — 2.7
//   смена 3 — 2.4
//   смена 4 — 2.1
//   смена 5 — 1.9
//   смена 6 — 1.8
//   смена 7 — 1.6   (жёстко, но проходимо: базовый 1 плюс одна система
//                    примерно в 60% времени)
// Шаг между сменами одинаковый — 0.016. Никаких скачков, кривая ровная,
// поэтому смены 6 и 7 остаются проходимыми, а не превращаются в стену.
// ==== V105: ДЛИНА СМЕНЫ 360 СЕКУНД ====
// ПОЧЕМУ ТАК БЫЛО: смена длилась 300 секунд, то есть ровно пять минут. По
// пункту 4.4.1 уровень считается ДЛИННЫМ только если взрослому игроку нужно
// БОЛЬШЕ пяти минут, чтобы пройти его без проигрыша. Пять минут ровно — это
// короткий уровень, а в коротких уровнях реклама внутри уровня запрещена
// совсем. Из-за этого игра могла показывать рекламу только в меню и после
// смены, и половина показов терялась.
// СТАЛО: смена длится 210 секунд — три с половиной минуты. Раньше было 360 (шесть
// минут), и игрок уставал ждать. Расход энергии пересчитан под новую длину (умножен
// на 360/210), так что заряда хватает ровно на те же действия, что и раньше —
// короткая смена остаётся такой же напряжённой, а не становится легче от длины.
const NIGHT_LEN=210;
// Расход энергии пересчитан под 210 секунд: значения умножены на 360/210 ≈ 1.714,
// чтобы доля заряда за смену осталась прежней — короткая ночь не стала легче.
const POWER_RATE={1:0.1543,2:0.1771,3:0.2002,4:0.2229,5:0.2457,6:0.2687,7:0.2914};
function powerRate(){
  // смены 6 и 7 живут через G.extra, а G.night у них всё равно равен 5
  const n=(G.extra===7)?7:(G.extra===6?6:Math.min(5,Math.max(1,G.night||1)));
  return POWER_RATE[n]||POWER_RATE[5];
}
// Насколько плохо видно того, кто стоит в проёме. 0 — как раньше, 1 — почти
// ничего. С четвёртой смены лампа бьёт слабее и фигура тонет в темноте,
// с пятой — видно только контур и глаза. На сменах 6 и 7 — как на пятой.
function doorVisPenalty(){
  const n=(G.extra===7||G.extra===6)?5:Math.min(5,Math.max(1,G.night||1));
  return n>=5?0.72:(n>=4?0.38:0);
}
function startNight(nightOverride=null,extra=null){window.AudioFX.stopVictory?.();G.finishing=false;G.securityTainted=!!window.SaveSystem.data.securityTainted;
 // V93: обычный запуск сбрасывает режим дополнительной смены.
 G.extra=(extra===6||extra===7)?extra:null;
 if(G.extra)G.night=5;                       // вся логика смены остаётся пятой, злоба — выше
 else if(nightOverride!==null)G.night=Math.min(5,Math.max(1,Number(nightOverride)||1));G.state='teaser';G.teaser=0;G.time=0;G.battery=100;G.powerHour=0;G.powerActiveSeconds=0;G.powerUsage=0;G.powerPulse=0;G.score=0;G.fear=0;G.speedMult=1;G.cam=1;G.monitor=false;G.monitorTarget=false;G.officeMonitors=[false,false,false,false];G.viewYaw=0;G.viewYawTarget=0;G.viewKeys={l:0,r:0};G.yawPos=1;
 G.doors.left=false;G.doors.right=false;G.doorAnim={left:0,right:0};G.doorSettle={left:0,right:0};
 G.lights.left={on:false,flicker:0,dead:false};G.lights.right={on:false,flicker:0,dead:false};
 // V93: всё новое состояние смены — темнота, кадры-вставки, реле, плакаты.
 G.blackout=null;G.ins=null;G.insCd=25+Math.random()*35;G._relay=null;G.camGrit=0;G.posterSeed=0;G.presence=null;G.presenceCd=18+Math.random()*22;G.runSec=0;G.sketch=resetSketch();
 G.phone={state:'idle',active:false,timer:0,line:'',currentCall:null,archive:G.phone.archive||[],callDelay:7,callTriggered:false,callPlayed:false,subtitle:'',subtitleTimer:0,night2Cutoff:false,night2CutoffTimer:0};
 G.dialed='';G.note={state:'table',open:false,timer:0};G.monsters=spawnMonsters();G.monster=G.monsters[0];G.dialer=false;G.phoneArchiveOpen=false;
 G.event={timer:0,kind:'',text:'',active:false};G.special={type:G.night===2?'tarhun':'',timer:G.night===2?0.7:0,active:G.night===2,done:false};G.screamer={active:false,timer:0,kind:'tarhun',power:0};G.mask={available:G.night>=2,worn:false,t:0};G.ventCreakCd=0;G.ventDust=0;G.camEnterCd=0;G.camScareCd=30+Math.random()*30;G.ventAmbientCd=8+Math.random()*22;G.ventAmbientPlays=0;G.ventAmbientMax=1+Math.floor(Math.random()*2);
 G.night=Math.min(5,Math.max(1,G.night));try{window.NSAC?.start(G.night)}catch(e){}try{window.NetLB?.startRun?.(G.night)}catch(e){}G.aiMem=null;G.death=null;G.deskLamp=true;G.fan=true;G.mug=3;G.monLine={text:'',kind:'',timer:0};window.SaveSystem.data.totalRuns++;G.platformPaused=false;G.adChargeUsed=false;G.adShown=false;G.adWarn=0;/* V105: один показ внутри смены *//* V104: один заряд за рекламу на смену */window.SaveSystem.save();window.AudioFX.unlock()}
 function beginPlay(){window.AudioFX.stopVictory?.();PERF.reset();G.state='game';
  // V108: ТРЕБОВАНИЕ 7 (МОБИЛЬНЫЕ) — ИГРА ЗАНИМАЕТ ВСЮ ПЛОЩАДЬ ЭКРАНА.
  // ПОЧЕМУ ТАК БЫЛО: полный экран включался только вручную в настройках, и на
  // телефоне смена шла в окне с панелью браузера. СТАЛО: старт смены — это
  // нажатие игрока, и ровно в этот момент (только на телефонах/планшетах)
  // запрашивается полный экран средствами SDK. Если площадка отказала — игра
  // продолжается как было, никаких сообщений игроку не показывается.
  if(mobile){try{if(!document.fullscreenElement)window.Platform.fullscreen?.()}catch(e){}}
  G.blackout=null;G.ins=null;G.insCd=25+Math.random()*35;G._relay=null;G.camGrit=0;G.posterSeed=0;G.presence=null;G.presenceCd=18+Math.random()*22;G.runSec=0;G.sketch=resetSketch();   // V93
  G.lights.left.dead=false;G.lights.right.dead=false;
  G.viewYaw=0;G.viewYawTarget=0;G.yawPos=1;window.Platform.startGameplay();G.teaser=0;G.special={type:G.night===2?'tarhun':'',timer:G.night===2?0.7:0,active:G.night===2,done:false};G.screamer={active:false,timer:0,kind:'tarhun',power:0};G.mask={available:G.night>=2,worn:false,t:0};G.ventCreakCd=0;G.ventDust=0;G.camEnterCd=0;G.camScareCd=30+Math.random()*30;G.ventAmbientCd=8+Math.random()*22;try{window.MonsterAudio?.reset()}catch(e){}G.ventAmbientPlays=0;G.ventAmbientMax=1+Math.floor(Math.random()*2);setMessage('Смена началась — 00:00',2);G.monsters=spawnMonsters();G.monster=G.monsters[0];G.aiMem=null;G.death=null;G.deskLamp=true;G.fan=true;G.mug=3;G.monLine={text:'',kind:'',timer:0};try{window.NetLB?.startTelemetry?.(()=>({night:G.night,runSec:G.runSec,score:G.score,state:G.state,snapshot:{battery:G.battery,cam:G.cam,monitor:!!G.monitor,doors:{left:!!G.doors.left,right:!!G.doors.right},power:!!G.blackout},flags:window.NSAC?.flags?.()||[],integrityHash:window.NSAC?.integrityHash?.()||'',saveIntegrity:window.SaveSystem?.data?.integrity||''}))}catch(e){}}
 function goMenu(){
   try{window.Platform.stopGameplay?.()}catch(e){}
   window.AudioFX.stopAll?.();
   G.monitor=false;G.monitorTarget=false;G.officeMonitors=[false,false,false,false];G.viewYaw=0;G.viewYawTarget=0;G.viewKeys={l:0,r:0};G.yawPos=1;G.dialer=false;G.phoneArchiveOpen=false;G.note.open=false;
   const ui=document.getElementById('settings-ui');if(ui){ui.classList.remove('visible');ui.dataset.ready='';}
   G.state='menu';G.pauseFrom='game';window.AudioFX.play('click',.35,{group:'ui'});
   // V104: полноэкранный блок ещё в одной логической паузе — игрок сам вышел из
   // смены в главное меню (п. 4.4.1: неигровое действие, задержки нет). Внутри
   // смены рекламы нет: смена короче пяти минут, там она запрещена. Мост сам не
   // пустит показ чаще, чем раз в 65 секунд, так что подряд она не выскочит.
   try{window.Platform.showAd?.()}catch(e){}
 }
 // V114: НАСТОЯЩИЙ ВЫХОД ИЗ ИГРЫ.
 // ПОЧЕМУ ТАК БЫЛО: пункт «ВЫХОД» был вырезан из меню ради модерации Яндекса, а
 // сама функция осталась заглушкой, которая просто возвращала в главное меню.
 // СТАЛО: кнопка есть и в главном меню, и в паузе. Она честно завершает смену:
 // сохраняет прогресс, глушит звук, сообщает площадке, что геймплей окончен, и
 // пробует закрыть вкладку. Браузер почти всегда закрыть её не даёт, поэтому
 // вместо молчания игрок видит финальный экран «СМЕНА ОКОНЧЕНА» с возможностью
 // вернуться в меню — никаких технических надписей и никакого history.back().
 function exitGame(){
   try{window.SaveSystem.save()}catch(e){}
   try{window.Platform?.stopGameplay?.()}catch(e){}
   try{window.AudioFX?.stopAll?.()}catch(e){}
   try{window.Platform?.exit?.()}catch(e){}
   G.dialer=false;G.phoneArchiveOpen=false;if(G.note)G.note.open=false;if(G.sketch)G.sketch.open=false;
   const ui=document.getElementById('settings-ui');if(ui){ui.classList.remove('visible');ui.dataset.ready='';}
   G.exitT=0;G._exitAt=performance.now();G.exitHover=false;G.state='exited';
   try{window.close()}catch(e){}
 }
 // Финальный экран выхода: тёплый затухающий свет, надпись и один пункт назад.
 function drawExited(){
   // Таймер появления считается прямо здесь: update() для этого состояния не идёт.
   {const now=performance.now();const prev=G._exitAt||now;G._exitAt=now;G.exitT=(G.exitT||0)+Math.min(.1,(now-prev)/1000);}
   ctx.fillStyle='#05070a';ctx.fillRect(0,0,W,H);
   const a=Math.min(1,(G.exitT||0)/0.8);
   const g=ctx.createRadialGradient(W/2,H*0.42,10,W/2,H*0.42,Math.max(W,H)*0.55);
   g.addColorStop(0,'rgba(217,169,58,'+(0.10*a)+')');g.addColorStop(1,'rgba(0,0,0,0)');
   ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
   ctx.globalAlpha=a;
   text2(ctx,'СМЕНА ОКОНЧЕНА',W/2,H*0.40,Math.round(Math.min(W,H)*0.055),'#d9cfa8','center');
   text2(ctx,'ПРОГРЕСС СОХРАНЁН. МОЖНО ЗАКРЫТЬ ВКЛАДКУ.',W/2,H*0.40+Math.round(Math.min(W,H)*0.055),13,'#6d7a82','center');
   const r=exitBackRect();
   const hov=G.exitHover;
   ctx.fillStyle=hov?'rgba(217,169,58,.14)':'rgba(255,255,255,.04)';ctx.fillRect(r.x,r.y,r.w,r.h);
   ctx.strokeStyle=hov?'rgba(217,169,58,.75)':'rgba(255,255,255,.22)';ctx.lineWidth=1;ctx.strokeRect(r.x+.5,r.y+.5,r.w-1,r.h-1);
   text2(ctx,'ВЕРНУТЬСЯ В МЕНЮ',r.x+r.w/2,r.y+r.h/2-7,14,hov?'#e8d9a6':'#9fb2bd','center');
   ctx.globalAlpha=1;
 }
 function exitBackRect(){
   const w=Math.max(200,Math.round(W*0.20)),h=42;
   return {x:Math.round(W/2-w/2),y:Math.round(H*0.62),w,h};
 }
 // ==== V93: 8-БИТНАЯ ВСТАВКА МЕЖДУ СМЕНАМИ ====
 // Примерно в трети случаев после выжитой смены включается короткая
 // пиксельная сценка — кусок того, что было в 1993 году. После неё игра
 // возвращается туда, куда шла (экран успешной смены).
 function maybeMiniGame(next){
   try{
     if(window.MiniGame&&window.MiniGame.available(G.night)&&Math.random()<0.35){
       G.mgNext=next;window.MiniGame.start(G,G.night);return 'minigame';
     }
   }catch(e){console.warn('minigame:',e)}
   return next;
 }
 function securityFail(reason){
  if(G.state==='security_fail')return;
  try{window.NetLB?.stopTelemetry?.()}catch(e){}
  G.securityFail=true;G.securityReason=String(reason||'ПРОВЕРКА БЕЗОПАСНОСТИ');
  try{window.Platform.stopGameplay?.()}catch(e){} try{window.AudioFX.stopAll?.()}catch(e){}
  G.state='security_fail'; G.message='';G.messageT=0;
  try{window.SaveSystem.data.lastRunValidation={ok:false,flags:window.NSAC?.flags?.()||[],at:Date.now()};window.SaveSystem.data.tamperCount=(Number(window.SaveSystem.data.tamperCount)||0)+1;window.SaveSystem.save()}catch(e){}
 }
 async function endNight(win){if(G.state!=='game'||G.finishing)return;G.finishing=true;window.Platform.stopGameplay();window.AudioFX.stopAll?.();
  // ==== V93: СМЕНЫ 6 И 7 НЕ ТРОГАЮТ ОСНОВНОЙ ПРОГРЕСС ====
  // Они не сдвигают highestNight и не переписывают концовку — только
  // свою отметку и лучший счёт.
  if(G.extra){
    if(win){
      window.SaveSystem.data.bestScore=Math.max(window.SaveSystem.data.bestScore,Math.floor(G.score));
      if(G.extra===6)window.SaveSystem.data.night6Done=true;else window.SaveSystem.data.night7Done=true;
      G.winTimer=0;G.message='';G.messageT=0;G.state=maybeMiniGame('win');G.ach('survivor');
    }else G.state='lose';
    try{window.SecretSystem?.event('win',{night:G.extra,battery:G.battery})}catch(e){}window.NSAC?.finish();G.finishing=false;window.SaveSystem.save();window.Platform.save(window.SaveSystem.data);
    return;
  }
  if(win){const vc=window.NSAC?.validate?.({s:Math.floor(G.score),t:Math.floor(G.runSec),n:G.night|0})||{ok:true,flags:[]};
    if(!vc.ok){G.securityTainted=true;try{window.SaveSystem.data.securityTainted=true;window.SaveSystem.data.tamperCount=(Number(window.SaveSystem.data.tamperCount)||0)+1;window.SaveSystem.save()}catch(e){} if(G.night>=5){securityFail((vc.flags||[])[0]?.code||'CLIENT_INTEGRITY');G.finishing=false;return;}}
    if(G.night>=5&&G.securityTainted){securityFail('RUN_TAINTED');G.finishing=false;return;}
    const final=await window.NetLB?.finalizeRun?.({...runMeta(Math.floor(G.score),Math.floor(G.runSec)),s:Math.floor(G.score),t:Math.floor(G.runSec),night:G.night|0,completed:true,flags:[]})||{accepted:true};
    if(!final.accepted){if(final.suspicious||final.error){G.securityTainted=true;try{window.SaveSystem.data.securityTainted=true;window.SaveSystem.save()}catch(e){}} if(G.night>=5){securityFail(final.error||'SERVER_REJECTED');G.finishing=false;return;} }
    try{window.NetLB?.stopTelemetry?.()}catch(e){}
    window.AudioFX.playVictory?.();G.winTimer=0;G.message='';G.messageT=0;window.SaveSystem.data.bestScore=Math.max(window.SaveSystem.data.bestScore,Math.floor(G.score));window.SaveSystem.data.highestNight=Math.min(5,G.night+1);window.SaveSystem.data.completed=G.night>=5;window.SaveSystem.data.chapter=Math.min(5,G.night+1);if(G.night>=5){G.menuVariant='epilogue';window.SaveSystem.data.menuVariant='epilogue';G.epilogueTimer=0;G._epiCues={};/* V84: экран выбора концовки открывается всегда после пятой смены — раньше он появлялся только при 5+ смертях, и два финала игрок вообще не мог выбрать. */ epiStart();}else{G.state=maybeMiniGame('win');}G.ach('survivor');if(G.night>=5)G.ach('five_nights')}else G.state='lose';try{window.SecretSystem?.event('win',{night:G.night,battery:G.battery})}catch(e){}recordRun(!!win);window.NSAC?.finish();window.SaveSystem.save();window.Platform.save(window.SaveSystem.data);}
 // ==== V105: РЕКЛАМА ВНУТРИ СМЕНЫ ПО ПУНКТУ 4.4.1 ====
 // Уровень длинный (шесть минут), значит показ внутри разрешён, но обязателен
 // порядок: пауза -> предупреждение таймером ровно 2 секунды -> реклама.
 // Одна смена — одно предупреждение и один показ, «избыточных предупреждений»
 // правила не допускают.
 // Момент выбираем сами: не раньше середины смены и только в спокойную секунду —
 // никто не стоит в проёме, нет отключения питания, не звенит телефон, не идёт
 // испуг и не открыт планшет камер. Иначе реклама вырезала бы кусок самого
 // напряжённого момента, а это уже порча геймплея, а не логическая пауза.
 function adBreakCalm(){
  if(G.blackout||G.death||G.ins)return false;
  if(G.screamer&&G.screamer.active)return false;
  if(G.monitor||G.monitorTarget)return false;
  if(G.phone&&G.phone.state!=='idle')return false;
  if((G.monsters||[]).some(m=>m&&m.state==='atDoor'))return false;
  if(G.battery<=12)return false;   // на последних процентах заряда не отвлекаем
  return true;
 }
 function adBreakUpdate(dt){
  // Сам обратный отсчёт. Игра в это время не обновляется (см. вход в gameUpdate),
  // то есть стоит на паузе — как требуют правила.
  if(G.adWarn>0){
   G.adWarn=Math.max(0,G.adWarn-dt);
   if(G.adWarn===0){
    G.adShown=true;
    // Если показать не удалось (нет SDK, лимит площадки), разметку геймплея надо
    // вернуть руками: колбэков рекламы в этом случае не будет.
    let started=false;
    try{started=!!window.Platform.showAd?.()}catch(e){started=false;}
    if(!started){try{window.Platform.startGameplay?.()}catch(e){}}
   }
   return true;
  }
  // V108: РЕКЛАМЫ ВНУТРИ СМЕНЫ БОЛЬШЕ НЕТ ВОВСЕ.
  // ПОЧЕМУ ТАК БЫЛО: блок вызывался посредине смены — после двух секунд
  // предупреждения и собственной паузы, но всё равно внутри игрового процесса.
  // Документация Яндекс Игр прямо запрещает: «не вызывайте показ рекламы во
  // время игрового процесса, когда пользователь может нажать на блок рекламы
  // ненамеренно», а пункт 4.4 — частая причина отказа. СТАЛО: полноэкранный
  // блок остаётся только там, где игры уже нет: кнопка «В МЕНЮ» после смены и
  // выход в меню с паузы. За награду (rewarded) игрок жмёт сам — это разрешено.
  return false;
 }
 // Плашка предупреждения. Крупная, по центру, с цифрой секунд — как в примере
 // требований: «Реклама через 2, 1».
 function drawAdWarn(){
  if(!(G.adWarn>0))return;
  const n=Math.max(1,Math.ceil(G.adWarn));
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,.72)';ctx.fillRect(0,0,W,H);
  const pw=Math.min(560,W*.82),ph=Math.min(180,H*.34),px=(W-pw)/2,py=(H-ph)/2;
  panel(px,py,pw,ph);
  text2(ctx,'РЕКЛАМА ЧЕРЕЗ',W*.5,py+ph*.34,Math.max(18,Math.min(30,W/44)),'#e6ebee','center');
  text2(ctx,String(n),W*.5,py+ph*.78,Math.max(40,Math.min(74,W/18)),'#e8d48a','center');
  text2(ctx,'ИГРА НА ПАУЗЕ',W*.5,py+ph-14,11,'#7d8892','center');
  ctx.restore();
 }
 function gameUpdate(dt){
  // V114: АНИМАЦИЯ ДОСКИ ТИКАЕТ ДО ПРОВЕРКИ ПАУЗЫ ПЛАТФОРМЫ.
  // ПОЧЕМУ ТАК БЫЛО: этот блок стоял ПОСЛЕ `if(G.platformPaused)return`, а
  // openSketch() как раз вызывает Platform.stopGameplay() — площадка ставит
  // platformPaused=true, gameUpdate выходит на первой строке, и анимация листа
  // не начинается никогда. fade оставался нулём, а drawSketch() рисует всё
  // через прозрачность fade — то есть лист, штрихи и панель инструментов были
  // полностью невидимы. Выглядело как «рисование не работает».
  // И симметрично: закрытие тоже не доигрывало, exitPhase застревал на 1, а
  // режим оставался открытым и глотал весь ввод.
  // СТАЛО: блок поднят выше проверки паузы и всегда доводит анимацию до конца.
  if(G.sketch&&G.sketch.open){
    const s=G.sketch;
    if(s.exitPhase>0){
      // ВЫХОД. Фаза 1: гасим экран в чёрный (~0.7с) + шёпот. Фаза 2: пауза в
      // темноте (~0.45с). Фаза 3: офис мягко проступает из темноты (~0.6с).
      s.exitT+=dt;
      if(s.exitPhase===1){s.blackA=Math.min(1,s.exitT/0.7);if(s.exitT>=0.7){s.exitPhase=2;s.exitT=0;}}
      else if(s.exitPhase===2){s.blackA=1;if(s.exitT>=0.45){s.exitPhase=3;s.exitT=0;}}
      // V114: раньше здесь стояло s.strokes=[] — выход из режима СТИРАЛ рисунок.
      // Именно поэтому нарисованное не могло появиться на доске: его удаляли
      // ровно в тот момент, когда игрок закрывал лист. Теперь штрихи остаются
      // и уходят в сохранение (finishSketch), а стирает только «ОЧИСТИТЬ».
      else if(s.exitPhase===3){s.blackA=Math.max(0,1-s.exitT/0.6);if(s.exitT>=0.6)finishSketch();}
      return;
    }
    s.openT+=dt;
    s.fade=Math.min(1,s.fade+dt*4.5);
    return;
  }
  if(G.platformPaused)return;
  // V111: таймер всплывающих уведомлений о достижениях тикает всегда,
  // даже в меню и на паузе — чтобы карточка не зависла на экране.
  if(G.achPopups&&G.achPopups.length){for(let i=0;i<G.achPopups.length;i++){G.achPopups[i].t+=dt;}
   while(G.achPopups.length&&G.achPopups[0].t>=G.achPopups[0].life)G.achPopups.shift();}
  // V105: пока идёт предупреждение о рекламе, игровой мир не обновляется.
  if(adBreakUpdate(dt))return;
  // V93: пиксельная вставка живёт своим циклом и сама сообщает, что закончилась.
  if(G.state==='minigame'){
    try{
      window.MiniGame.update(dt,G);
      if(window.MiniGame.done){window.MiniGame.stop();G.state=G.mgNext||'win';}
    }catch(e){console.warn('minigame:',e);G.state=G.mgNext||'win';}
    return;
  }
  if(G.state==='game'){
   dt=Math.min(1.05,dt*(G.speedMult||1));
   G.look.sx+=(G.mouse.x-G.look.sx)*Math.min(1,dt*7);
   G.look.sy+=(G.mouse.y-G.look.sy)*Math.min(1,dt*7);
   // Camera yaw easing toward viewYawTarget.
   // Режим «стрелки»: viewYawTarget задаётся шагом по A/D (лево→центр→право), между нажатиями стоит на месте.
   // Режим «мышь»: viewYawTarget следует за курсором по горизонтали без зажатия кнопки.
   G.viewYaw+=(G.viewYawTarget-G.viewYaw)*Math.min(1,dt*5);
   G.time+=dt;
   // V70: комната охраны читает своё состояние и номер смены отсюда.
   G.fanCoast=G.fan?0:(G.fanCoast||0)*0.985;
   window.__NS_OFFICE={night:G.night,lamp:G.deskLamp,fan:G.fan,mug:G.mug,fanCoast:G.fanCoast};
   if(G.monLine&&G.monLine.timer>0){G.monLine.timer=Math.max(0,G.monLine.timer-dt);G.monLine.fade=Math.min(1,(G.monLine.fade||0)+dt/0.22);}
   // Сердцебиение: чем ближе аниматроник, тем чаще. Дыхание — от страха.
   const near=(G.monsters||[]).some(m=>m&&m.room===0);
   const prep=(G.monsters||[]).some(m=>m&&m.state==='preparingAttack');
   G.heartCd=Math.max(0,(G.heartCd||0)-dt);
   if((near||prep||G.fear>72)&&G.heartCd<=0){
     window.AudioFX.synth?.('heartbeat',prep?0.55:near?0.38:0.24);
     G.heartCd=prep?0.52:near?0.72:1.05;
   }
   G.breathCd=Math.max(0,(G.breathCd||0)-dt);
   if(G.fear>55&&G.breathCd<=0){window.AudioFX.synth?.('breath',0.20+G.fear/500);G.breathCd=6+Math.random()*7;}
   G.ambCd=Math.max(0,(G.ambCd||0)-dt);
   if(G.ambCd<=0){
     const pool=G.night>=3?['metalDrag','squelch','drip','rumble']:['drip','metalDrag'];
     window.AudioFX.synth?.(pool[Math.floor(Math.random()*pool.length)],0.16+G.night*0.03);
     G.ambCd=20+Math.random()*30;
   }
   G.dripCd=Math.max(0,(G.dripCd||0)-dt);
   if(G.dripCd<=0){window.AudioFX.synth?.('drip',0.12);G.dripCd=9+Math.random()*16;}
   if(G.special.active){G.special.timer-=dt;if(G.special.timer<=0){G.special.active=false;G.special.done=true;if(G.special.type==='tarhun'){G.event={timer:3.1,kind:'tarhun',text:'ТАРХУН: «СЪЕШЬ МЕНЯ»',active:true};AudioFX.play('tarhun',1,{group:'monster'});setMessage('КТО-ТО ПРИШЁЛ В ОХРАНУ...',2);G.screamer={active:true,timer:0.62,dur:0.62,kind:'tarhun',power:1};AudioFX.play('scream',1.25,{group:'monster'});}}}
   if(G.screamer.active){G.screamer.timer-=dt;G.screamer.power=Math.max(0,G.screamer.timer/(G.screamer.dur||0.62));if(G.screamer.timer<=0)G.screamer.active=false;}
   G.camScareCd=Math.max(0,(G.camScareCd||0)-dt);
   G.switchFx=Math.max(0,G.switchFx-dt);
   G.ventCreakCd=Math.max(0,(G.ventCreakCd||0)-dt);G.ventDust=Math.max(0,(G.ventDust||0)-dt);G.camEnterCd=Math.max(0,(G.camEnterCd||0)-dt);
   // Random distant ventilation rumble — purely atmospheric, no prompt and no game event.
   G.ventAmbientCd=Math.max(0,(G.ventAmbientCd||0)-dt);if(G.ventAmbientCd<=0&&(G.ventAmbientPlays||0)<(G.ventAmbientMax||2)){window.AudioFX.play('ventAmbient',0.6,{group:'ambience'});G.ventAmbientPlays=(G.ventAmbientPlays||0)+1;G.ventAmbientCd=18+Math.random()*34;}
   if(G.note.open){G.note.timer=0;}
   G.lights.left.flicker=Math.max(0,G.lights.left.flicker-dt);G.lights.right.flicker=Math.max(0,G.lights.right.flicker-dt);
   // ================== V102: ПИТАНИЕ ПО СИСТЕМЕ ФНАФ ==================
   // ПОЧЕМУ ТАК БЫЛО. Расход считался раз в «игровой час» (раз в 60 секунд)
   // и умножался на грубый множитель ночи 1/2/3/5. Из-за этого шкала стояла
   // на месте почти минуту, а потом проваливалась скачком — игрок не мог
   // связать свои действия с потерей заряда и не мог рассчитать смену.
   // Плюс простой вообще ничего не стоил: можно было сидеть с открытыми
   // дверями всю ночь и ни разу не подумать об энергии.
   //
   // СТАЛО — как в ФНАФ:
   //   уровень нагрузки = 1 (сам пост: вентилятор, лампа на столе, монитор
   //   часов) + 1 за каждую закрытую дверь + 1 за каждую включённую лампу
   //   + 1 за поднятый планшет камер. Максимум 5.
   //   Заряд уходит НЕПРЕРЫВНО: скорость = уровень x RATE[смена] в секунду.
   // Так шкала реагирует сразу, а игрок сам решает, за что платить.
   const usage=1+(G.doors.left?1:0)+(G.doors.right?1:0)+(G.monitor?1:0)
                +(G.lights.left.on?1:0)+(G.lights.right.on?1:0);
   G.powerUsage=Math.min(5,usage);
   G.battery=Math.max(0,G.battery-usage*powerRate()*dt);
   G.powerActiveSeconds+=usage*dt;
   // короткий импульс на шкале при смене уровня нагрузки — видно, что стало дороже
   if(G._lastUsage!==usage){if(G._lastUsage!==undefined&&usage>G._lastUsage)G.powerPulse=.65;G._lastUsage=usage;}
   G.powerPulse=Math.max(0,G.powerPulse-dt);
   // V102: насколько плохо видно фигуру в проёме — читает js/world.js
   window.__doorVis=doorVisPenalty();
   // ==== V93: ЩЁЛКАЕТ РЕЛЕ ====
   // Было: любое включение системы было бесплатным на слух — только
   // шелест интерфейса. Стало: каждое действие отдаётся сухим щёлчком в
   // щитке рядом с креслом, а двери щёлкают громче ламп и планшета.
   {
     const cur={dl:!!G.doors.left,dr:!!G.doors.right,mon:!!G.monitorTarget,
                ll:!!G.lights.left.on,lr:!!G.lights.right.on};
     if(!G._relay)G._relay=Object.assign({},cur);
     for(const k in cur){
       if(cur[k]!==G._relay[k]){
         G._relay[k]=cur[k];
         try{window.MonsterAudio?.relay(k==='dl'||k==='dr')}catch(e){}
       }
     }
   }
   // ==== V93: КАДР-ВСТАВКА ====
   // Два-три кадра лица, силуэта или надписи — глаз её едва ловит, но всё
   // тело успевает испугаться. Только когда страх уже высок, и редко.
   G.insCd=Math.max(0,(G.insCd||0)-dt);
   if(!G.ins&&G.insCd<=0&&G.time>30&&G.fear>38&&Math.random()<dt*0.055){
     G.insCd=45+Math.random()*60;
     const kinds=(G.monsters||[]).filter(Boolean);
     const m=kinds.length?kinds[Math.floor(Math.random()*kinds.length)]:null;
     G.ins={f:2+Math.floor(Math.random()*2),kind:m?m.kind:'main',
            mode:Math.random()<0.45?'face':(Math.random()<0.5?'text':'shape'),seed:Math.random()*99};
     try{window.MonsterAudio?.tape(false)}catch(e){}
   }
   // V111: ВНЕЗАПНОЕ ПРИСУТСТВИЕ. Только когда игрок смотрит на офис (не в камерах,
   // без маски). Тень мелькает по панораме, свет дрожит — звук-укол. Не убивает.
   // Реже на ранних сменах, чаще на поздних. Добавляет внезапности поверх обычных
   // вспышек G.ins — эти пугают именно в спокойные моменты, когда ничего не происходит.
   G.presenceCd=Math.max(0,(G.presenceCd||0)-dt);
   if(!G.presence&&G.presenceCd<=0&&G.time>20&&!G.monitor&&!(G.mask&&G.mask.worn)){
     const rate=0.008+G.night*0.004;
     if(Math.random()<dt*rate){
       G.presence={t:0,dur:0.55,side:Math.random()<0.5?-1:1};try{window.NSAC?.event('presence');window.SecretSystem?.event('watcher',{fear:G.fear})}catch(e){}
       G.presenceCd=22+Math.random()*30;
       try{window.AudioFX.play('camera_glitch',.5,{group:'monster'})}catch(e){}
       try{window.MonsterAudio?.tape(G.night>=4)}catch(e){}
     }
   }
   if(G.presence){G.presence.t+=dt;if(G.presence.t>=G.presence.dur)G.presence=null;}
   // Счётчик общего времени в сменах (копится только в активной смене) — показывается на экране достижений.
   window.SaveSystem.data.playSeconds=(window.SaveSystem.data.playSeconds||0)+dt;
   // V115: длительность ТЕКУЩЕЙ смены — вкладка «ПО ВРЕМЕНИ» в таблице результатов.
   G.runSec=(G.runSec||0)+dt;
   G.playFlush=(G.playFlush||0)+dt;
   if(G.playFlush>=20){G.playFlush=0;window.SaveSystem.save();window.Platform.save?.(window.SaveSystem.data);}
   G.score+=dt*(11+G.night*2);try{window.NSAC?.sample(G.score,G.runSec,dt);if(window.NetLB?.serverSuspicious?.())securityFail('SERVER_TAMPER_DETECTED');}catch(e){}if(G.night===1&&G.time>NIGHT_LEN-15)G.ach('first_blood');if(G.night===2)G.ach('felix_signal');if(G.fear>92)G.ach('night_owl');if(G.battery>0&&G.time>NIGHT_LEN-15)G.ach('power_saver');if((G.phone.archive||[]).length>=3)G.ach('archive');try{window.SecretSystem?.event('archive',{count:(G.phone.archive||[]).length})}catch(e){}G.fear=Math.min(100,G.fear+dt*(.45+G.night*.08));
   window.CameraSystem.update(dt,G);window.LightingSystem.update(dt,G);
   // (removed fake camera screamer — only real monster attacks trigger a jumpscare)
   // ==== V93: КОНЕЦ ПИТАНИЯ — НЕ МГНОВЕННАЯ СМЕРТЬ ====
   // Было: на нуле сразу G.kill('power') — игрок даже не понимал, что случилось.
   // Стало как в ФНАФе: гул умирает, всё гаснет, в темноте играет шкатулка,
   // в проёме появляется лицо — и только потом, в тишине, приходит конец.
   if(G.battery<=0&&!G.blackout&&!G.death){
     G.battery=0;
     G.blackout={t:0,phase:-1,kind:(G.monsters||[]).some(m=>m&&m.kind==='lav')?'lav':'main'};
     G.doors.left=false;G.doors.right=false;
     G.lights.left.on=false;G.lights.right.on=false;G.lights.left.dead=false;G.lights.right.dead=false;
     G.monitor=false;G.monitorTarget=false;G.monitorAnim=0;G.dialer=false;G.phoneArchiveOpen=false;
     setMessage('ПИТАНИЕ ОТКЛЮЧЕНО',2.4);
     try{window.PhoneSystem.stop(G,'ended')}catch(e){}
     try{window.MonsterAudio?.powerDown()}catch(e){}
     window.AudioFX.synth?.('blackout',.9);
   }
   if(G.blackout){
     const b=G.blackout;b.t+=dt;
     const ph=(n,fn)=>{if(b.phase<n){b.phase=n;fn();}};
     // V94: у темноты теперь СВОЯ звуковая драматургия, а не одна шкатулка.
     // Он подходит тремя шагами, тянет железо по бетону совсем рядом, и в конце
     // сабтон РАСТЁТ вместо затухания — тишина стала не пустой, а полной им.
     if(b.t>2.4)ph(0,()=>{try{window.MonsterAudio?.song(0.55)}catch(e){}});   // шкатулка в темноте
     if(b.t>5.0)ph(1,()=>{try{window.MonsterAudio?.powerDark(1)}catch(e){}}); // три шага и вдох рядом
     if(b.t>7.6)ph(2,()=>{try{window.MonsterAudio?.song(0.40)}catch(e){}});   // второй завод, ближе
     if(b.t>9.6)ph(3,()=>{try{window.MonsterAudio?.powerDark(2)}catch(e){}}); // железо по бетону
     if(b.t>11.4)ph(4,()=>{try{window.MonsterAudio?.lull(2.2)}catch(e){}});   // тишина перед лицом
     if(b.t>12.6)ph(5,()=>{try{window.MonsterAudio?.powerDark(3)}catch(e){}});// он смотрит
     if(b.t>=15.6){G.blackout=null;G.kill('power');}
     return;   // питания нет: остальная логика смены больше не идёт
   }
   G.monster=G.monster||window.MonsterAI.make();(G.monsters||[G.monster]).forEach(m=>window.MonsterAI.update(m,dt,G.night,G));
   // V91: фон живого здания и присутствие за дверью. Таймеры внутри модуля:
   // далёкий металлический удар, посуда там, где кто-то возится, голос из
   // темноты и механическая шкатулка LAV.
   try{window.MonsterAudio?.update(dt,G)}catch(e){}
   window.PhoneSystem.update(G,dt);window.RadioSystem.update(G,dt);
   // V66: планшет открывается и закрывается мягче (было *4), а переключение камер
   // доживает своё время как плавное перекрытие кадров.
   G.monitorAnim+=(G.monitorTarget?1:-1)*dt*3.1;G.monitorAnim=Math.max(0,Math.min(1,G.monitorAnim));if(!G.monitorTarget&&G.monitorAnim<=0){G.monitor=false;G.monitorAnim=0;}
   // V83: створки едут, а не включаются. Закрывается быстро (тяжёлый сброс
   // вниз), открывается медленнее — мотор тянет плиту наверх. В конце закрытия
   // дверь едва заметно отыгрывает от удара о порог.
   ['left','right'].forEach(s=>{
     const tgt=G.doors[s]?1:0,a=G.doorAnim[s]||0;
     if(a===tgt)return;
     const k=G.doors[s]?10.5:6.2;
     let v=a+(tgt-a)*Math.min(1,dt*k);
     if(Math.abs(tgt-v)<0.004){v=tgt;if(tgt===1)G.doorSettle[s]=0.26;}
     G.doorAnim[s]=v;
   });
   ['left','right'].forEach(s=>{if(G.doorSettle[s]>0)G.doorSettle[s]=Math.max(0,G.doorSettle[s]-dt);});
   if((G.camFadeT||0)>0)G.camFadeT=Math.max(0,G.camFadeT-dt);
   if(G.time>=NIGHT_LEN)endNight(true);
 }
 if(G.state==='death'){deathUpdate(dt);}
 if(G.state==='win'){G.winTimer=(G.winTimer||0)+dt;if(G.night<5&&G.winTimer>=2.8){G.night=Math.min(5,G.night+1);startNight();}}
 if(G.state==='epichoice')G.choiceT=(G.choiceT||0)+dt;
 if(G.state==='epilogue'&&!G._qaFreeze){G.epilogueTimer=(G.epilogueTimer||0)+dt;if(G.epilogueTimer>=(G.epiDur||16.5)){
   // V100: атмосферная подложка концовки живёт ровно столько, сколько сама
   // концовка — иначе гул подвала или ветер пожарища уходили бы в меню.
   try{window.AudioFX.bedStop?.()}catch(e){}
   G.state='menu';G.menuVariant='epilogue';window.SaveSystem.data.menuVariant='epilogue';window.SaveSystem.save();window.AudioFX.update();}}
 if(G.messageT>0)G.messageT-=dt;window.AudioFX.update();}
 // V83: любая смена экрана проходит через короткое затемнение. Раньше меню,
 // настройки, достижения и игра переключались одним кадром — глаз спотыкался.
 function drawStateFade(){
  if(G.lastState!==G.state){G.lastState=G.state;G.stateFade=1;}
  if(!(G.stateFade>0))return;
  // Привязано ко времени, а не к кадрам: на 30 и 144 FPS длится одинаково.
  const now=performance.now();
  const prev=G._fadeAt||now;G._fadeAt=now;
  G.stateFade=Math.max(0,G.stateFade-Math.min(.12,(now-prev)/1000)/0.26);
  const a=G.stateFade*G.stateFade*0.62;
  if(a<=0.004)return;
  ctx.save();ctx.globalAlpha=a;ctx.fillStyle='#020406';ctx.fillRect(0,0,W,H);ctx.restore();
 }
 function draw(){ctx.clearRect(0,0,W,H);if(G.state==='menu'){drawMenu();drawDezMark();}else if(G.state==='teaser')drawTeaser();else if(G.state==='game')drawGame();else if(G.state==='settings')drawSettings();else if(G.state==='ach')drawAch();else if(G.state==='leaders'){drawLeaders();if(G.lbCard)drawLbCard();}else if(G.state==='profile')drawProfile();else if(G.state==='exited')drawExited();else if(G.state==='pause')drawPause();else if(G.state==='epilogue')drawEpilogueSequence();else if(G.state==='epichoice')drawEndingChoice();else if(G.state==='death')drawDeath();else if(G.state==='confirm'){drawMenu();drawConfirm();}else if(G.state==='plan')drawPlan();else if(G.state==='custom')drawCustom();else if(G.state==='minigame'){try{window.MiniGame.draw(ctx,W,H,G)}catch(e){console.warn('minigame:',e)}}else drawEnd();if(G.state==='game'||G.state==='teaser'||G.messageT>0)drawOverlay();if(G.state==='game'&&G.blackout)drawBlackout();if(G.state==='game'&&G.ins)drawInsert();drawAdWarn();/* V105: плашка предупреждения о рекламе рисуется поверх всего */drawStateFade();try{window.Screamer?.draw?.(ctx,W,H)}catch(e){console.warn('screamer:',e)}try{window.Call911?.draw?.(ctx,W,H)}catch(e){console.warn('call911:',e)}try{window.PostFX?.render(canvas,G.state,PERF.tier>=2?'off':(window.SaveSystem.settings.effects||'high'))}catch(e){console.warn('PostFX disabled:',e);document.getElementById('postfx')?.remove()}drawAchPopups();
 // V112: записная доска — рисуется поверх всего, когда открыто.
 if(G.state==='game'&&G.sketch&&G.sketch.open)drawSketch();
}
 function drawMenu(){
  const variant=window.SaveSystem.data.completed?'epilogue':(G.menuVariant||window.SaveSystem.data.menuVariant||'normal');
  if(variant==='epilogue'){
   // V74: главное меню зависит от полученной концовки.
   const le=window.SaveSystem.data.lastEnding||'calm';
   if(le==='trap')drawTrapMenu();
   else if(le==='dark')drawSuitMenu();
   else if(le==='burn')drawAshMenu();
   // V85: у концовки «ПРАВДА» теперь СВОЁ меню. До этого она падала
   // в рассветное меню тишины и ничем не отличалась от мирного финала.
   else if(le==='truth')drawTruthMenu();
   else drawEpilogueMenu();
   return;
  }
  if(variant==='broken'){drawBrokenMenu();return;}
  const t=performance.now()/1000;
  const low=document.body.classList.contains('low-end');
  // ==== ГЛАВНОЕ МЕНЮ: зал пиццерии в перспективе, тёплые лампы, сцена с аниматрониками ====
  const yH=H*.545;            // линия горизонта
  const vx=W*.702, vy=yH;     // точка схода

  // --- Базовый фон ---
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#04070a');bg.addColorStop(.42,'#0a1015');bg.addColorStop(.56,'#0b1116');bg.addColorStop(1,'#020304');
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);

  // легкое «дыхание» камеры
  ctx.save();
  ctx.translate(Math.sin(t*.23)*3,Math.sin(t*.31+1)*2);

  // --- Задняя стена ---
  const wallTop=-2;
  const wg=ctx.createLinearGradient(0,wallTop,0,yH);
  wg.addColorStop(0,'#04080b');wg.addColorStop(.45,'#080f13');wg.addColorStop(1,'#0d171c');
  ctx.fillStyle=wg;ctx.fillRect(-8,wallTop,W+16,yH-wallTop);
  // кафельная сетка на стене
  ctx.strokeStyle='rgba(150,180,190,.028)';ctx.lineWidth=1;
  for(let x=0;x<W+40;x+=54){ctx.beginPath();ctx.moveTo(x,yH*.42);ctx.lineTo(x,yH);ctx.stroke();}
  for(let y=yH*.42;y<yH;y+=27){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  // вишнёвая полоса-фриз и плинтус
  ctx.fillStyle='rgba(88,18,26,.48)';ctx.fillRect(-8,yH-H*.10,W+16,H*.026);
  ctx.fillStyle='rgba(255,255,255,.035)';ctx.fillRect(-8,yH-H*.10,W+16,1);
  ctx.fillStyle='#0a0f12';ctx.fillRect(-8,yH-H*.021,W+16,H*.021);
  // пятна сырости
  ctx.globalAlpha=.5;
  for(let i=0;i<7;i++){const sx=(i*263)%W,sy=wallTop+((i*97)%(yH-wallTop-40));
   const sg=ctx.createRadialGradient(sx,sy,2,sx,sy,46+((i*23)%40));sg.addColorStop(0,'rgba(0,0,0,.30)');sg.addColorStop(1,'rgba(0,0,0,0)');
   ctx.fillStyle=sg;ctx.fillRect(sx-90,sy-90,180,180);}
  ctx.globalAlpha=1;

  // --- Пол: кафельная шашка в перспективе ---
  const rows=low?7:12, cols=low?9:15;
  const colAt=(k,y)=>{const bxp=-W*.55+ (W*2.1)*(k/cols);const tt=(y-yH)/(H-yH);return vx+(bxp-vx)*tt;};
  const rowY=j=>yH+(H-yH)*Math.pow(j/rows,2.15);
  for(let j=0;j<rows;j++){
   const y0=rowY(j), y1=rowY(j+1);
   const shade=.35+.65*(j/rows);
   for(let k=0;k<cols;k++){
    const dark=((j+k)%2===0);
    ctx.fillStyle=dark?`rgba(${Math.round(11*shade+4)},${Math.round(7*shade+4)},${Math.round(9*shade+5)},1)`
                      :`rgba(${Math.round(26*shade+5)},${Math.round(16*shade+5)},${Math.round(18*shade+6)},1)`;
    ctx.beginPath();ctx.moveTo(colAt(k,y0),y0);ctx.lineTo(colAt(k+1,y0),y0);ctx.lineTo(colAt(k+1,y1),y1);ctx.lineTo(colAt(k,y1),y1);ctx.closePath();ctx.fill();
   }
  }
  // швы кафеля
  ctx.strokeStyle='rgba(0,0,0,.5)';ctx.lineWidth=1;
  for(let k=0;k<=cols;k++){ctx.beginPath();ctx.moveTo(colAt(k,yH),yH);ctx.lineTo(colAt(k,H),H);ctx.stroke();}

  // --- Сцена с занавесом ---
  const stX=W*.585, stW=W*.235, stTop=H*.175, stBot=yH-H*.006;
  ctx.fillStyle='#04070a';ctx.fillRect(stX,stTop,stW,stBot-stTop);
  // рампа сцены
  const spot=ctx.createRadialGradient(stX+stW*.5,stTop+H*.02,4,stX+stW*.5,stTop+H*.02,stW*.85);
  spot.addColorStop(0,'rgba(255,200,132,.17)');spot.addColorStop(.5,'rgba(205,132,84,.06)');spot.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=spot;ctx.fillRect(stX,stTop,stW,stBot-stTop);
  // занавес: складки
  for(let s=0;s<2;s++){
   const cw=stW*.20, cx=s===0?stX:stX+stW-cw;
   const cg=ctx.createLinearGradient(cx,0,cx+cw,0);
   cg.addColorStop(0,'#210810');cg.addColorStop(.5,'#3c0e17');cg.addColorStop(1,'#15060a');
   ctx.fillStyle=cg;ctx.fillRect(cx,stTop,cw,stBot-stTop);
   for(let f=0;f<5;f++){ctx.fillStyle=f%2?'rgba(0,0,0,.34)':'rgba(255,150,150,.035)';ctx.fillRect(cx+f*cw/5,stTop,cw/10,stBot-stTop);}
  }
  // ламбрекен
  const lg=ctx.createLinearGradient(0,stTop,0,stTop+H*.05);lg.addColorStop(0,'#42101a');lg.addColorStop(1,'#1f070c');
  ctx.fillStyle=lg;ctx.fillRect(stX,stTop,stW,H*.045);
  for(let a=0;a<7;a++){ctx.beginPath();ctx.arc(stX+stW*(a+.5)/7,stTop+H*.045,stW/16,0,Math.PI);ctx.fillStyle='#300b12';ctx.fill();}
  // подиум
  ctx.fillStyle='#141013';ctx.fillRect(stX+stW*.12,stBot-H*.022,stW*.76,H*.022);
  ctx.fillStyle='rgba(255,190,130,.10)';ctx.fillRect(stX+stW*.12,stBot-H*.022,stW*.76,2);
  // силуэты аниматроников с горящими глазами
  const figs=[{x:stX+stW*.40,s:1.0,eye:'rgba(255,178,86,'},{x:stX+stW*.66,s:.86,eye:'rgba(120,214,255,'}];
  figs.forEach((f,i)=>{
   const base=stBot-H*.022, hgt=(stBot-stTop)*.62*f.s, hw=hgt*.20;
   ctx.fillStyle='rgba(0,0,0,.93)';
   ctx.beginPath();ctx.moveTo(f.x-hw,base);ctx.lineTo(f.x-hw*.8,base-hgt*.62);ctx.lineTo(f.x+hw*.8,base-hgt*.62);ctx.lineTo(f.x+hw,base);ctx.closePath();ctx.fill();
   ctx.beginPath();ctx.arc(f.x,base-hgt*.75,hw*.78,0,Math.PI*2);ctx.fill();
   ctx.beginPath();ctx.ellipse(f.x-hw*.62,base-hgt*.98,hw*.20,hw*.34,-.25,0,Math.PI*2);ctx.fill();
   ctx.beginPath();ctx.ellipse(f.x+hw*.62,base-hgt*.98,hw*.20,hw*.34,.25,0,Math.PI*2);ctx.fill();
   // контровой свет
   ctx.strokeStyle='rgba(255,196,140,.13)';ctx.lineWidth=1.4;ctx.beginPath();ctx.arc(f.x,base-hgt*.75,hw*.78,-2.5,-.7);ctx.stroke();
   // глаза мигают
   const blink=Math.sin(t*(1.4+i*.5)+i*2)>-.82?1:0;
   if(blink){const ea=.55+.45*Math.sin(t*3.1+i);
    ctx.shadowColor=f.eye+'.9)';ctx.shadowBlur=12;
    ctx.fillStyle=f.eye+(.55+.35*ea).toFixed(2)+')';
    ctx.fillRect(f.x-hw*.44,base-hgt*.80,hw*.30,hw*.15);
    ctx.fillRect(f.x+hw*.14,base-hgt*.80,hw*.30,hw*.15);
    ctx.shadowBlur=0;}
  });
  // рамка проёма сцены
  ctx.strokeStyle='rgba(160,180,190,.10)';ctx.lineWidth=2;ctx.strokeRect(stX,stTop,stW,stBot-stTop);

  // --- Неоновая вывеска PIZZA над сценой ---
  const flick=(Math.sin(t*11.3)>.93||Math.sin(t*3.7)>.985)?.35:1;
  ctx.save();ctx.globalAlpha=flick;
  ctx.font='700 '+Math.round(H*.045)+'px "Oswald",Impact,sans-serif';ctx.textAlign='center';ctx.textBaseline='alphabetic';
  ctx.shadowColor='rgba(255,70,110,.95)';ctx.shadowBlur=26;ctx.fillStyle='#ffd6e4';
  ctx.fillText('PIZZA',stX+stW*.5,stTop-H*.045);
  ctx.shadowBlur=12;ctx.fillText('PIZZA',stX+stW*.5,stTop-H*.045);
  ctx.shadowBlur=0;ctx.restore();
  // отсвет вывески на стене
  const ng=ctx.createRadialGradient(stX+stW*.5,stTop-H*.055,6,stX+stW*.5,stTop-H*.055,W*.14);
  ng.addColorStop(0,`rgba(255,60,110,${.10*flick})`);ng.addColorStop(1,'rgba(255,60,110,0)');
  ctx.fillStyle=ng;ctx.fillRect(stX-W*.16,stTop-H*.22,stW+W*.32,H*.24);

  // --- Подвесные лампы с конусами света ---
  const lamps=[{x:W*.50,d:0},{x:W*.80,d:1.7},{x:W*.955,d:3.1}];
  lamps.forEach((L,i)=>{
   const sw=Math.sin(t*.7+L.d)*4;
   const lx=L.x+sw, ly=H*.155;
   ctx.strokeStyle='rgba(140,155,165,.28)';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(L.x,wallTop);ctx.lineTo(lx,ly-H*.018);ctx.stroke();
   // абажур
   ctx.fillStyle='#1b2429';ctx.beginPath();ctx.moveTo(lx-H*.030,ly);ctx.lineTo(lx+H*.030,ly);ctx.lineTo(lx+H*.016,ly-H*.020);ctx.lineTo(lx-H*.016,ly-H*.020);ctx.closePath();ctx.fill();
   ctx.fillStyle='rgba(255,214,150,.95)';ctx.beginPath();ctx.ellipse(lx,ly,H*.028,H*.007,0,0,Math.PI*2);ctx.fill();
   // ореол
   const hg2=ctx.createRadialGradient(lx,ly,2,lx,ly,H*.12);hg2.addColorStop(0,'rgba(255,205,140,.34)');hg2.addColorStop(1,'rgba(255,205,140,0)');
   ctx.fillStyle=hg2;ctx.fillRect(lx-H*.14,ly-H*.14,H*.28,H*.28);
   // конус
   const cone=ctx.createLinearGradient(0,ly,0,yH+H*.10);cone.addColorStop(0,'rgba(255,198,132,.10)');cone.addColorStop(1,'rgba(255,190,120,0)');
   ctx.fillStyle=cone;ctx.beginPath();ctx.moveTo(lx-H*.022,ly);ctx.lineTo(lx+H*.022,ly);ctx.lineTo(lx+H*.15,yH+H*.13);ctx.lineTo(lx-H*.15,yH+H*.13);ctx.closePath();ctx.fill();
   // световая лужа на полу
   const py2=yH+(H-yH)*(.30+i*.10);
   const pg=ctx.createRadialGradient(lx,py2,3,lx,py2,H*.14);pg.addColorStop(0,'rgba(255,190,120,.085)');pg.addColorStop(1,'rgba(255,196,128,0)');
   ctx.fillStyle=pg;ctx.beginPath();ctx.ellipse(lx,py2,H*.15,H*.045,0,0,Math.PI*2);ctx.fill();
  });

  // --- Столики с шарами ---
  const tables=[{x:W*.545,y:yH+(H-yH)*.30,s:.62},{x:W*.87,y:yH+(H-yH)*.52,s:.92}];
  tables.forEach((T,i)=>{
   const tw=H*.115*T.s, th=H*.028*T.s;
   const tsh=ctx.createRadialGradient(T.x,T.y+th*1.6,2,T.x,T.y+th*1.6,tw*1.15);tsh.addColorStop(0,'rgba(0,0,0,.55)');tsh.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=tsh;ctx.save();ctx.translate(T.x,T.y+th*1.6);ctx.scale(1,.42);ctx.beginPath();ctx.arc(0,0,tw*1.15,0,Math.PI*2);ctx.fill();ctx.restore();
   ctx.fillStyle='#120c0e';ctx.fillRect(T.x-tw*.06,T.y,tw*.12,th*2.4);
   const tg2=ctx.createLinearGradient(0,T.y-th,0,T.y+th);tg2.addColorStop(0,'#241a1d');tg2.addColorStop(1,'#100b0d');ctx.fillStyle=tg2;ctx.beginPath();ctx.ellipse(T.x,T.y,tw,th,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(255,200,150,.07)';ctx.lineWidth=1;ctx.stroke();
   ctx.fillStyle='rgba(255,205,150,.06)';ctx.beginPath();ctx.ellipse(T.x-tw*.2,T.y-th*.3,tw*.5,th*.45,0,0,Math.PI*2);ctx.fill();
   // стаканчики
   for(let c=0;c<3;c++){const cx2=T.x-tw*.46+c*tw*.46;ctx.fillStyle='#4d171d';ctx.beginPath();ctx.moveTo(cx2-tw*.05,T.y-th*1.5);ctx.lineTo(cx2+tw*.05,T.y-th*1.5);ctx.lineTo(cx2+tw*.035,T.y-th*.2);ctx.lineTo(cx2-tw*.035,T.y-th*.2);ctx.closePath();ctx.fill();ctx.fillStyle='rgba(255,190,150,.10)';ctx.fillRect(cx2-tw*.05,T.y-th*1.5,tw*.03,th*1.3);}
   // шарик на нитке
   const bx2=T.x+tw*.7+Math.sin(t*.9+i)*4, by2=T.y-H*.11;
   ctx.strokeStyle='rgba(200,210,215,.18)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(T.x+tw*.55,T.y-th);ctx.lineTo(bx2,by2+H*.022);ctx.stroke();
   ctx.fillStyle=i%2?'#6d1e28':'#22485c';ctx.beginPath();ctx.ellipse(bx2,by2,H*.017,H*.021,0,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='rgba(255,255,255,.20)';ctx.beginPath();ctx.ellipse(bx2-H*.005,by2-H*.007,H*.005,H*.006,0,0,Math.PI*2);ctx.fill();
  });

  // --- Гирлянда под потолком ---
  ctx.strokeStyle='rgba(190,200,205,.14)';ctx.lineWidth=1;ctx.beginPath();
  for(let x=W*.42;x<=W;x+=10){const y=H*.085+Math.sin((x/W)*7.2)*H*.016;x===W*.42?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.stroke();
  for(let b=0;b<14;b++){const x=W*.42+(W*.58)*(b/13),y=H*.085+Math.sin((x/W)*7.2)*H*.016+4;
   const on=.45+.55*Math.abs(Math.sin(t*1.6+b*.8));const col=b%3===0?'255,120,120':(b%3===1?'255,205,130':'130,200,235');
   ctx.shadowColor=`rgba(${col},.8)`;ctx.shadowBlur=7*on;ctx.fillStyle=`rgba(${col},${(.28+.4*on).toFixed(2)})`;
   ctx.beginPath();ctx.arc(x,y,2.6,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;}

  // --- Туман у пола и пыль ---
  if(!low){
   for(let i=0;i<3;i++){
    const fy=yH+(H-yH)*(.18+i*.26), fa=.05+.02*Math.sin(t*.5+i);
    const fg=ctx.createLinearGradient(0,fy-H*.05,0,fy+H*.06);
    fg.addColorStop(0,'rgba(150,175,190,0)');fg.addColorStop(.5,`rgba(150,175,190,${fa.toFixed(3)})`);fg.addColorStop(1,'rgba(150,175,190,0)');
    ctx.fillStyle=fg;ctx.fillRect(0,fy-H*.05,W,H*.12);
   }
   for(let i=0;i<54;i++){
    const x=(i*167+t*(7+(i%5)*3))%W, y=(i*91+Math.sin(t*.6+i)*22)%H;
    ctx.fillStyle=`rgba(210,225,230,${(.03+(i%4)*.012).toFixed(3)})`;ctx.fillRect(x,y,1.4,1.4);
   }
  }
  // отражение неона и сцены на кафеле
  // V110: сила отражения берётся из настройки ОТРАЖЕНИЯ (раньше эта строка
  // настроек ни на что не влияла); на НИЗКИХ отражение просто не рисуется.
  const rMul=window.GFX?.reflect??1;
  if(rMul>0.01){
  const rcx=stX+stW*.5, rcy=yH;
  ctx.save();ctx.beginPath();ctx.rect(0,yH,W,H-yH);ctx.clip();
  ctx.translate(rcx,rcy);ctx.scale(1,.55);
  const rfl=ctx.createRadialGradient(0,0,4,0,0,W*.20);
  rfl.addColorStop(0,`rgba(255,96,126,${(.10*flick*rMul).toFixed(3)})`);rfl.addColorStop(.55,`rgba(255,96,126,${(.035*flick*rMul).toFixed(3)})`);rfl.addColorStop(1,'rgba(255,96,126,0)');
  ctx.fillStyle=rfl;ctx.beginPath();ctx.arc(0,0,W*.20,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  // общее ночное затемнение сцены
  const grade=ctx.createLinearGradient(0,0,0,H);
  grade.addColorStop(0,'rgba(4,10,18,.45)');grade.addColorStop(.5,'rgba(4,9,15,.22)');grade.addColorStop(1,'rgba(2,4,7,.55)');
  ctx.fillStyle=grade;ctx.fillRect(0,0,W,H);
  ctx.restore();

  // ==== ЛЕВАЯ ПАНЕЛЬ ====
  // V86: на телефоне в горизонтали высоты не хватает на панель с шапкой,
  // статус-блоком, шестью кнопками и карточкой прогресса — они накладывались
  // друг на друга. В компактном режиме остаются только заголовок, одна строка
  // статуса и кнопки в два столбца.
  const compact=menuLow();
  const px=W*.055, py=H*.095, pw=compact?Math.min(430,W*.44):Math.min(380,W*.36), ph=H*.80;
  if(compact){
   const lw=ctx.createLinearGradient(0,0,W*.62,0);
   lw.addColorStop(0,'rgba(4,8,12,.86)');lw.addColorStop(.55,'rgba(4,8,12,.62)');
   lw.addColorStop(.85,'rgba(4,8,12,.22)');lw.addColorStop(1,'rgba(4,8,12,0)');
   ctx.fillStyle=lw;ctx.fillRect(0,0,W*.62,H);
   // V87: акцентная линия раньше была ровным красным огрызком от левой кромки
   // до 30 процентов ширины — на телефоне это читалось как обрезанная плашка.
   // Теперь она начинается от отступа заголовка и плавно растворяется.
   {const al=ctx.createLinearGradient(W*.055,0,W*.42,0);
    al.addColorStop(0,'rgba(143,34,48,.95)');al.addColorStop(.55,'rgba(143,34,48,.55)');al.addColorStop(1,'rgba(143,34,48,0)');
    ctx.fillStyle=al;ctx.fillRect(W*.055,0,W*.365,2);}
  }else{
  // тень панели
  const psh=ctx.createLinearGradient(px+pw,0,px+pw+60,0);psh.addColorStop(0,'rgba(0,0,0,.55)');psh.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=psh;ctx.fillRect(px+pw,py,60,ph);
  const pg2=ctx.createLinearGradient(px,py,px+pw,py+ph);
  pg2.addColorStop(0,'rgba(7,12,16,.94)');pg2.addColorStop(.5,'rgba(5,9,12,.90)');pg2.addColorStop(1,'rgba(3,5,7,.94)');
  ctx.fillStyle=pg2;ctx.fillRect(px,py,pw,ph);
  ctx.strokeStyle='rgba(168,190,200,.13)';ctx.lineWidth=1;ctx.strokeRect(px+.5,py+.5,pw-1,ph-1);
  // верхняя акцентная линия + бегущий блик
  ctx.fillStyle='#8f2230';ctx.fillRect(px,py,pw,2);
  const sxp=px+((t*90)%(pw+160))-80;
  const shg=ctx.createLinearGradient(sxp-70,0,sxp+70,0);
  shg.addColorStop(0,'rgba(255,120,140,0)');shg.addColorStop(.5,'rgba(255,180,190,.85)');shg.addColorStop(1,'rgba(255,120,140,0)');
  ctx.save();ctx.beginPath();ctx.rect(px,py,pw,3);ctx.clip();ctx.fillStyle=shg;ctx.fillRect(px,py,pw,2);ctx.restore();
  // угловые скобки
  ctx.strokeStyle='rgba(200,60,74,.55)';ctx.lineWidth=2;const cs=16;
  [[px,py,1,1],[px+pw,py,-1,1],[px,py+ph,1,-1],[px+pw,py+ph,-1,-1]].forEach(([cx3,cy3,sx3,sy3])=>{
   ctx.beginPath();ctx.moveTo(cx3+sx3*cs,cy3);ctx.lineTo(cx3,cy3);ctx.lineTo(cx3,cy3+sy3*cs);ctx.stroke();});
  }

  // разреженный текст
  // V83: текст рисуется посимвольно (разреженные буквы), поэтому перевод
  // берётся сразу для всей строки: по отдельной букве словарь ничего не нашёл бы
  // и меню оставалось бы частями по-русски.
  const spaced=(s,x,y,size,fill,sp)=>{ctx.font='700 '+size+'px "Inter",Arial,sans-serif';ctx.textAlign='left';ctx.fillStyle=fill;let cx4=x;
   const str=(window.I18N&&window.I18N.T)?window.I18N.T(s):s;
   for(const ch of str){ctx.fillText(ch,cx4,y);cx4+=ctx.measureText(ch).width+sp;}};

  const ix=compact?W*.055:px+26;
  if(!compact)spaced('СИСТЕМА БЕЗОПАСНОСТИ',ix,py+30,9,'#6d7c85',1.6);
  // заголовок
  ctx.textAlign='left';ctx.textBaseline='alphabetic';
  // V86: кегель заголовка ограничен и по высоте кадра, иначе на низком
  // экране две строки наезжали одна на другую.
  let ts=Math.min(54,(pw-52)/6.1,H*.088);
  ctx.font='700 '+Math.round(ts)+'px "Oswald",Impact,sans-serif';
  while(ctx.measureText('НОЧНАЯ').width>pw-52&&ts>20){ts-=2;ctx.font='700 '+Math.round(ts)+'px "Oswald",Impact,sans-serif';}
  const t1y=Math.max(ts*1.12,py+H*.115), t2y=t1y+ts*1.02;
  ctx.fillStyle='rgba(0,0,0,.8)';ctx.fillText('НОЧНАЯ',ix+2,t1y+2);
  ctx.fillStyle='#eef3f5';ctx.fillText('НОЧНАЯ',ix,t1y);
  const tflick=(Math.sin(t*13.1)>.965)?.45:1;
  ctx.save();ctx.globalAlpha=tflick;ctx.shadowColor='rgba(210,40,56,.75)';ctx.shadowBlur=20;
  ctx.fillStyle='#c22b3a';ctx.fillText('СМЕНА',ix,t2y);ctx.shadowBlur=0;ctx.restore();
  // подчёркивание и подзаголовок
  ctx.fillStyle='rgba(200,60,74,.85)';ctx.fillRect(ix,t2y+12,54,3);
  // V86: в компактном режиме длинная тонкая линия проходила по строке статуса
  // и выглядела как зачёркивание — рисуем её только на большом экране.
  if(!compact){ctx.fillStyle='rgba(160,178,188,.18)';ctx.fillRect(ix+62,t2y+13,pw-52-62,1);}
  // V83: подзаголовок поднят на 6 пикселей — раньше его нижнюю часть срезала
  // кромка статус-блока.
  // V86: на узкой панели строка вылезала за правый край — теперь при недостатке
  // места печатается короткий вариант.
  if(!compact)spaced(pw<330?'NS-04':'NIGHT SECURITY PROTOCOL  ·  NS-04',ix,t2y+28,9,'#5d6a72',1.4);

  // статус-блок
  const sy4=H*.33, shh=40;
  if(!compact){
  ctx.fillStyle='rgba(12,19,24,.9)';ctx.fillRect(px+22,sy4,pw-44,shh);
  ctx.strokeStyle='rgba(150,170,180,.14)';ctx.lineWidth=1;ctx.strokeRect(px+22.5,sy4+.5,pw-45,shh-1);
  const lp=.5+.5*Math.sin(t*2.6);
  ctx.shadowColor='rgba(230,196,84,.9)';ctx.shadowBlur=8+6*lp;ctx.fillStyle=`rgba(232,200,92,${(.6+.4*lp).toFixed(2)})`;
  ctx.beginPath();ctx.arc(px+38,sy4+shh*.5,4.2,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
  spaced('СИСТЕМА ГОТОВА',px+52,sy4+17,10,'#b6c0c6',.8);
  const nightNow=Math.min(5,window.SaveSystem.data.highestNight||1);
  spaced('СМЕНА '+nightNow+' ИЗ 5  ·  23:59',px+52,sy4+31,9,'#66727a',.6);
  // мини-эквалайзер справа
  for(let b=0;b<7;b++){const hb=4+Math.abs(Math.sin(t*2.4+b*.7))*13;
   ctx.fillStyle=`rgba(150,190,205,${(.18+.30*Math.abs(Math.sin(t*2.4+b*.7))).toFixed(2)})`;
   ctx.fillRect(px+pw-36-b*6,sy4+shh*.5+8-hb,3.4,hb);}
  }

  const nightNow2=Math.min(5,window.SaveSystem.data.highestNight||1);
  // кнопки. V83: шаг и высота считаются от свободного места до карточки
  // прогресса. Раньше шаг был жёстким (58 пикселей), и на шести пунктах
  // при невысоком окне последняя кнопка («ВЫХОД») наезжала на полосу прогресса.
  const fh=58, fy2=py+ph-14-fh;
  if(compact){
   // V86: одна строка вместо статус-блока и карточки прогресса.
   const iy=t2y+Math.max(24,H*.066);
   spaced('СМЕНА '+nightNow2+' ИЗ 5  ·  РЕКОРД '+window.SaveSystem.data.bestScore,ix,iy,Math.max(9,Math.round(Math.min(12,H*.028))),'#8b969d',.8);
   const cby=iy+Math.max(14,H*.05);
   menuButtons(ix,cby,56,Math.min(300,Math.max(150,W*.27)),46,undefined,0,{bottom:H*.94,right:W*.965});
   drawResetBanner();
   ctx.textAlign='left';ctx.textBaseline='alphabetic';
   return drawMenuTail(t);
  }
  const bx=px+22,by=H*.398,bw=pw-44;
  const nBtn=Math.max(1,menuItems().length);
  const gapB=Math.min(58,(fy2-16-by)/nBtn);
  const bh=Math.max(32,Math.min(48,gapB-10));
  menuButtons(bx,by,gapB,bw,bh,undefined,0,{bottom:fy2-10,cols:1});
  drawResetBanner();

  // нижняя карточка прогресса
  ctx.fillStyle='rgba(10,16,20,.92)';ctx.fillRect(bx,fy2,bw,fh);
  ctx.strokeStyle='rgba(150,170,180,.14)';ctx.lineWidth=1;ctx.strokeRect(bx+.5,fy2+.5,bw-1,fh-1);
  spaced('ПРОГРЕСС',bx+12,fy2+18,9,'#68747c',1.2);
  ctx.textAlign='right';ctx.font='700 12px "Inter",Arial,sans-serif';ctx.fillStyle='#aab4ba';
  ctx.fillText('РЕКОРД '+window.SaveSystem.data.bestScore,bx+bw-12,fy2+18);
  ctx.textAlign='left';
  // пять сегментов ночей
  const segW=(bw-24-4*6)/5;
  for(let i=0;i<5;i++){
   const sxx=bx+12+i*(segW+6), done=i<nightNow2;
   ctx.fillStyle=done?'#b02a37':'rgba(255,255,255,.06)';ctx.fillRect(sxx,fy2+28,segW,7);
   if(done){ctx.fillStyle='rgba(255,150,160,.35)';ctx.fillRect(sxx,fy2+28,segW,2);}
  }
  ctx.font='700 11px "Inter",Arial,sans-serif';ctx.fillStyle='#d3d9dc';ctx.fillText('НОЧЬ '+nightNow2+' / 5',bx+12,fy2+50);
  ctx.textAlign='right';ctx.fillStyle='#717d85';ctx.fillText(nightNow2>=5?'ФИНАЛЬНАЯ СМЕНА':'ВЫЖИТЬ ДО 06:00',bx+bw-12,fy2+50);
  ctx.textAlign='left';
  drawMenuTail(t);
 }
 // ==== АТМОСФЕРНЫЙ ПОСТ-СЛОЙ ====
 // V86: вынесен в отдельную функцию — его рисует и обычное, и компактное меню.
 function drawMenuTail(t){
  for(let y=0;y<H;y+=4){ctx.fillStyle='rgba(255,255,255,.011)';ctx.fillRect(0,y,W,1)}
  vigFill(.58,.48,menuLow()?.10:W*.10/H,menuLow()?.80:W*.80/H,[[0,'rgba(0,0,0,0)'],[.55,'rgba(0,0,0,.22)'],[.8,'rgba(0,0,0,.52)'],[1,'rgba(0,0,0,.86)']]);
  // аварийный индикатор
  ctx.globalAlpha=.35+.15*Math.sin(t*2.1);ctx.fillStyle='#b52b35';ctx.fillRect(W*.965,H*.10,3,20);ctx.globalAlpha=1;
  if(H>=470){ctx.textAlign='right';ctx.font='700 10px "Inter",Arial,sans-serif';ctx.fillStyle='#59666e';ctx.fillText('NS-04',W-Math.max(16,Math.round(W*.018)),H*.835);ctx.textAlign='left';}
 }

 // ==== V85: пиксельный шрифт для товарного знака DEZ (правый нижний угол меню) ====
 // V82: текст плана изменений — показывается на отдельном экране в меню (кнопка ПЛАН).
 // V103: ЭКРАН «ПЛАН» ПОЛНОСТЬЮ ОЧИЩЕН.
 // ПОЧЕМУ ТАК БЫЛО: здесь лежал внутренний журнал разработки на четыреста
 // строк — список правок по сборкам V82...V93. Игроку он не нужен и выглядел
 // как забытый служебный файл внутри готовой игры.
 // СТАЛО: короткое сообщение о том, что игра вышла, и одно объяснение про
 // низкий профиль устройства, который теперь стоит по умолчанию.
 // ==== V105: ЭКРАН «ПЛАН» — ТОЛЬКО СЛОВА ИГРОКУ ====
 // ПОЧЕМУ ТАК БЫЛО: на экране лежала техническая записка — что игра вышла,
 // как считаются концовки, зачем низкий профиль устройства, как устроена
 // реклама. Игроку это читать незачем: он пришёл играть, а не разбираться в
 // устройстве сборки.
 // СТАЛО: короткая записка от автора. Спасибо, что зашёл; расскажи об ошибках,
 // багах и неровностях анимаций; игра дорабатывается.
 const PLAN_TEXT=[
 'СПАСИБО, ЧТО ЗАШЁЛ',
 '==================',
 '',
 'Спасибо, что зашёл и посмотрел.',
 '',
 'Если заметишь ошибки, баги или неровности анимаций —',
 'скажи об этом, это правда помогает.',
 '',
 'Я работаю над игрой и улучшаю её дальше.',
 '',
 'Ещё раз спасибо тебе, Игрок!'
 ].join('\n');
 // самолётик 14x10 блоков
 const TG_PLANE=[
  '.........WWWW.',
  '.......WWWWWW.',
  '.....WWWWWWW..',
  '...WWWWWWWW...',
  '..WWWWWWWW....',
  '....WWWWW.....',
  '.....WWWW.....',
  '......WWW.....',
  '.......WW.....',
  '..............'
 ];
 // пиксельный шрифт 3x5 для надписи DEZ
 const TG_FONT={D:['110','101','101','101','110'],E:['111','100','110','100','111'],Z:['111','001','010','100','111']};
 // V82: диалог «Начать новую игру». Прогресс глав сбросится, достижения останутся.
 function drawConfirm(){
  const a=Math.min(1,(G.confirmT||0)*3);
  G.confirmT=(G.confirmT||0)+0.016;
  ctx.save();
  ctx.fillStyle=`rgba(0,0,0,${0.74*a})`;ctx.fillRect(0,0,W,H);
  const dw=Math.min(460,W*.86),dh=210,dx=W/2-dw/2,dy=H/2-dh/2;
  const g=ctx.createLinearGradient(0,dy,0,dy+dh);
  g.addColorStop(0,'#161c22');g.addColorStop(1,'#0b0f13');
  ctx.globalAlpha=a;ctx.fillStyle=g;ctx.fillRect(dx,dy,dw,dh);
  ctx.strokeStyle='#3a1e22';ctx.lineWidth=2;ctx.strokeRect(dx,dy,dw,dh);
  ctx.fillStyle='#8a3a44';ctx.font='bold 14px "JetBrains Mono",monospace';ctx.fillText('НАЧАТЬ НОВУЮ ИГРУ',dx+24,dy+36);
  ctx.fillStyle='#c9d2d8';ctx.font='14px "JetBrains Mono",monospace';
  const lines=['Прохождение и концовки будут сброшены.','Начнёте с 1-й смены. Достижения сохранятся.'];
  lines.forEach((ln,i)=>ctx.fillText(ln,dx+24,dy+66+i*20));
  const bw=150,bh=44,by=dy+dh-58;
  const bx1=dx+dw/2-bw-8,bx2=dx+dw/2+8;
  const yesHov=G.confirmHover===1,noHov=G.confirmHover===2;
  ctx.fillStyle=yesHov?'#6b1d27':'#3b1118';ctx.fillRect(bx1,by,bw,bh);ctx.strokeStyle='#8a3a44';ctx.lineWidth=1.5;ctx.strokeRect(bx1,by,bw,bh);
  ctx.fillStyle='#e8c9cd';ctx.font='bold 13px "JetBrains Mono",monospace';ctx.fillText('НАЧАТЬ ЗАНОВО',bx1+bw/2-ctx.measureText('НАЧАТЬ ЗАНОВО').width/2,by+bh/2+4);
  ctx.fillStyle=noHov?'#232b31':'#151c21';ctx.fillRect(bx2,by,bw,bh);ctx.strokeStyle='#39464e';ctx.strokeRect(bx2,by,bw,bh);
  ctx.fillStyle='#9aa6ad';ctx.fillText('ОТМЕНА',bx2+bw/2-ctx.measureText('ОТМЕНА').width/2,by+bh/2+4);
  ctx.restore();
 }
 // ==== V114: ЗНАК DEZ СТАЛ ЖИВОЙ КНОПКОЙ TELEGRAM ====
 // ПОЧЕМУ ТАК БЫЛО: в правом нижнем углу меню висела металлическая табличка с
 // пиксельной надписью DEZ. Красиво, но мертво: на неё нельзя было нажать, и
 // никакой связи со студией из игры не было. Пиксельный самолётик TG_PLANE при
 // этом уже лежал в коде и НИГДЕ не использовался.
 // СТАЛО: на той же табличке слева — пиксельный значок Telegram (кружок с тем
 // самым самолётиком), справа — прежняя надпись DEZ. Табличка кликается и
 // открывает https://t.me/DEZFF1 в новой вкладке. При наведении курсор
 // становится «рукой», подсветка усиливается и подпись меняется на @DEZFF1.
 const TG_URL='https://t.me/DEZFF1';
 // Кружок значка 14x14 в пиксельной сетке (та же сетка, что у самолётика).
 const TG_DISC=[
  '.....CCCC.....',
  '...CCCCCCCC...',
  '..CCCCCCCCCC..',
  '.CCCCCCCCCCCC.',
  '.CCCCCCCCCCCC.',
  'CCCCCCCCCCCCCC',
  'CCCCCCCCCCCCCC',
  'CCCCCCCCCCCCCC',
  'CCCCCCCCCCCCCC',
  '.CCCCCCCCCCCC.',
  '.CCCCCCCCCCCC.',
  '..CCCCCCCCCC..',
  '...CCCCCCCC...',
  '.....CCCC.....'
 ];
 // Прямоугольник таблички для проверки попадания курсора (заполняется при отрисовке).
 let dezRect=null;
 function dezMarkRect(){return dezRect}
 function openDez(){
  try{
   const w=window.open(TG_URL,'_blank','noopener,noreferrer');
   if(!w){const a=document.createElement('a');a.href=TG_URL;a.target='_blank';a.rel='noopener noreferrer';a.click();}
  }catch(e){try{location.href=TG_URL}catch(e2){}}
  try{window.AudioFX.play('click',.4,{group:'ui'})}catch(e){}
 }
 function drawDezMark(){
  const t=performance.now()/1000;
  const s=Math.max(3,Math.round(Math.min(W,H)/150));   // размер пиксельного блока
  const letterW=3,gap=2,word='DEZ';
  const totalW=word.length*letterW+(word.length-1)*gap; // 13 блоков
  const wpx=totalW*s, hpx=5*s;
  const icoN=14, icoPx=icoN*s, icoGap=Math.round(s*3);  // значок + отступ до букв
  const contentW=icoPx+icoGap+wpx, contentH=icoPx;
  // В padY заложен запас под подпись: без него она уезжала за нижнюю кромку кадра.
  const padX=Math.max(18,Math.round(W*.022)), padY=Math.max(16,Math.round(H*.035))+Math.round(s*3.4);
  const cx=W-padX-contentW/2, cy=H-padY-contentH/2;
  const plW=contentW+s*6, plH=contentH+s*4;
  const plX=Math.round(cx-plW/2), plY=Math.round(cy-plH/2);
  dezRect={x:plX,y:plY,w:plW,h:plH};
  const hov=!!G.dezHover;
  // «дыхание» подсветки: знак словно висит над тёмной стеной и подсвечен изнутри
  const breathe=.42+.20*Math.sin(t*.9)+.06*Math.sin(t*3.7);
  const flick=(Math.sin(t*23.3)>.985)?.35:1;           // редкий сбой лампы
  const glow=(hov?1:breathe)*flick;
  const icoX=Math.round(cx-contentW/2), icoY=Math.round(cy-icoPx/2);
  const bx=icoX+icoPx+icoGap, by=Math.round(cy-hpx/2);
  ctx.save();
  ctx.globalAlpha=hov?1:.92;
  // тёмная металлическая табличка с фаской
  const pg=ctx.createLinearGradient(plX,plY,plX,plY+plH);
  if(hov){pg.addColorStop(0,'rgba(30,44,54,.86)');pg.addColorStop(.55,'rgba(16,26,33,.80)');pg.addColorStop(1,'rgba(8,13,17,.86)');}
  else{pg.addColorStop(0,'rgba(24,28,32,.72)');pg.addColorStop(.55,'rgba(13,16,19,.66)');pg.addColorStop(1,'rgba(7,9,11,.72)');}
  ctx.fillStyle=pg;ctx.fillRect(plX,plY,plW,plH);
  ctx.fillStyle='rgba(140,158,170,.10)';ctx.fillRect(plX,plY,plW,1);
  ctx.fillStyle='rgba(0,0,0,.40)';ctx.fillRect(plX,plY+plH-1,plW,1);
  ctx.strokeStyle=hov?'rgba(42,171,238,.55)':'rgba(120,140,152,.16)';ctx.lineWidth=1;ctx.strokeRect(plX+.5,plY+.5,plW-1,plH-1);
  // четыре заклёпки по углам таблички
  ctx.fillStyle='rgba(150,168,180,.16)';
  [[plX+3,plY+3],[plX+plW-4,plY+3],[plX+3,plY+plH-4],[plX+plW-4,plY+plH-4]].forEach(p=>ctx.fillRect(p[0],p[1],1.6,1.6));

  // ---- пиксельный значок Telegram: кружок + самолётик из TG_PLANE ----
  ctx.shadowColor='rgba(42,171,238,'+(.55*glow).toFixed(3)+')';
  ctx.shadowBlur=(8+14*glow);
  // тень кружка вниз-вправо (та же гравировка, что у букв)
  ctx.shadowBlur=0;
  const px=(c,r,ox,oy)=>ctx.fillRect(icoX+c*s+(ox||0),icoY+r*s+(oy||0),s,s);
  ctx.fillStyle='rgba(0,0,0,.62)';
  for(let r=0;r<icoN;r++)for(let c=0;c<icoN;c++)if(TG_DISC[r][c]==='C')px(c,r,Math.round(s*.34),Math.round(s*.34));
  ctx.shadowColor='rgba(42,171,238,'+(.50*glow).toFixed(3)+')';
  ctx.shadowBlur=(9+13*glow);
  // сам кружок: вертикальный градиент фирменного голубого
  for(let r=0;r<icoN;r++){
   const k=r/(icoN-1), lum=(hov?1:.80+.20*breathe)*flick;
   const cr=Math.round((44+(20*(1-k)))*lum), cg2=Math.round((168+(30*(1-k)))*lum), cb=Math.round((232+(18*(1-k)))*lum);
   ctx.fillStyle='rgb('+cr+','+cg2+','+cb+')';
   for(let c=0;c<icoN;c++)if(TG_DISC[r][c]==='C')px(c,r);
  }
  ctx.shadowBlur=0;
  // самолётик поверх кружка: белый, сдвинут в центр диска
  const pOff=2; // строк сверху, чтобы самолётик стоял по центру кружка
  ctx.fillStyle='rgba(255,255,255,'+(hov?.98:.90)+')';
  for(let r=0;r<TG_PLANE.length;r++)for(let c=0;c<14;c++){
   if(TG_PLANE[r][c]!=='W')continue;
   const cc=c-1; if(cc<0||cc>13)continue;
   px(cc,r+pOff);
  }
  // блик по верхней кромке кружка
  ctx.fillStyle='rgba(255,255,255,'+(.14*(hov?1:lumSafe(breathe))).toFixed(3)+')';
  for(let c=0;c<icoN;c++)if(TG_DISC[0][c]==='C')px(c,0);

  // ---- надпись DEZ (прежняя гравировка) ----
  const draw=(col,ox,oy)=>{
   for(let li=0;li<word.length;li++){
    const gl=TG_FONT[word[li]];
    for(let r=0;r<5;r++)for(let c=0;c<3;c++){
     if(gl[r][c]!=='1')continue;
     ctx.fillStyle=col;
     ctx.fillRect(bx+(li*(letterW+gap)+c)*s+ox,by+r*s+oy,s,s);
    }}
  };
  ctx.shadowBlur=0;
  draw('rgba(0,0,0,.62)',Math.round(s*.34),Math.round(s*.34));
  ctx.shadowColor='rgba(126,196,214,'+(.34*glow).toFixed(3)+')';
  ctx.shadowBlur=(9+12*glow);
  const lum=(hov?1:.70+.30*breathe)*flick;
  const mix=(a,b)=>Math.round(a+(b-a)*lum);
  draw('rgb('+mix(122,232)+','+mix(140,246)+','+mix(150,252)+')',0,0);
  ctx.shadowBlur=0;
  draw('rgba(255,255,255,'+(.16*lum).toFixed(3)+')',-Math.round(s*.28),-Math.round(s*.28));
  // подпись под знаком: обычно клеймо, при наведении — сам адрес
  ctx.globalAlpha=hov?.85:(.34+.10*breathe);
  ctx.fillStyle=hov?'#7ec9ee':'#8ea6b2';
  ctx.font='600 '+Math.max(8,Math.round(s*2.1))+'px "JetBrains Mono",monospace';
  const sub=hov?'@DEZFF1':'DEZ\u00A0\u00B7\u00A0NIGHT\u00A0SHIFT';
  {
   const swd=ctx.measureText(sub).width;
   const sxx=Math.max(4,Math.min(Math.round(cx-swd/2),Math.round(W-Math.max(6,padX*.5)-swd)));
   ctx.fillText(sub,sxx,plY+plH+Math.round(s*2.6));
  }
  ctx.restore();
 }
 function lumSafe(v){return Math.max(0,Math.min(1,v))}
 function drawBrokenMenu(){
 ctx.save();
 const t=performance.now()/1000;
 const low=document.body.classList.contains('low-end');
 const hh=(n)=>{const v=Math.sin(n*127.1+Math.floor(n)*0.7913)*43758.5453;return v-Math.floor(v);};
 const pulse=.5+.5*Math.sin(t*1.7);
 // ---- разрушенная комната охраны ----
 const g=ctx.createLinearGradient(0,0,0,H);
 g.addColorStop(0,'#07080a');g.addColorStop(.52,'#0d0b0c');g.addColorStop(1,'#040405');
 ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 // стена с потёками и трещинами
 ctx.save();ctx.globalAlpha=.5;
 for(let i=0;i<7;i++){const wx=W*(.10+i*.13);
  const wg=ctx.createLinearGradient(wx,0,wx,H*.8);
  wg.addColorStop(0,'rgba(40,30,26,.5)');wg.addColorStop(1,'rgba(40,30,26,0)');
  ctx.fillStyle=wg;ctx.fillRect(wx,0,10+hh(i)*26,H*.8);}
 ctx.restore();
 if(!low){ctx.strokeStyle='rgba(0,0,0,.55)';ctx.lineWidth=1.4;
  for(let i=0;i<5;i++){let cx=W*(.30+i*.14),cy=0;ctx.beginPath();ctx.moveTo(cx,cy);
   for(let k=0;k<7;k++){cx+=(hh(i*9+k)-.5)*46;cy+=H*.075;ctx.lineTo(cx,cy);}ctx.stroke();}}
 // аварийный красный свет сверху справа
 const em=ctx.createRadialGradient(W*.80,H*.06,8,W*.80,H*.06,H*1.0);
 em.addColorStop(0,`rgba(190,26,38,${(.26+.10*pulse).toFixed(3)})`);
 em.addColorStop(.42,`rgba(110,14,22,${(.10+.05*pulse).toFixed(3)})`);
 em.addColorStop(1,'rgba(0,0,0,0)');
 ctx.fillStyle=em;ctx.fillRect(0,0,W,H);
 // разбитый монитор
 const mx=W*.58,my=H*.18,mw=W*.28,mh=H*.50;
 roundedRect(ctx,mx-14,my-14,mw+28,mh+28,10,'#12151a','#232a31',2);
 roundedRect(ctx,mx,my,mw,mh,6,'#05070a',null,0);
 ctx.save();roundedRect(ctx,mx,my,mw,mh,6,'rgba(0,0,0,0)',null,0);
 ctx.beginPath();ctx.rect(mx,my,mw,mh);ctx.clip();
 const scr=ctx.createRadialGradient(mx+mw*.5,my+mh*.5,4,mx+mw*.5,my+mh*.5,mw*.8);
 scr.addColorStop(0,`rgba(120,20,28,${(.20+.10*pulse).toFixed(3)})`);scr.addColorStop(1,'rgba(10,4,6,.05)');
 ctx.fillStyle=scr;ctx.fillRect(mx,my,mw,mh);
 // полосы сорванного сигнала
 for(let i=0;i<Math.round(mh/4);i++){const yy=my+i*4;
  ctx.fillStyle=(i%3===0)?'rgba(200,40,50,.055)':'rgba(255,255,255,.018)';ctx.fillRect(mx,yy,mw,1.4);}
 if(!low){for(let i=0;i<3;i++){const byy=my+((t*90+i*180)%mh);
  ctx.fillStyle=`rgba(255,255,255,${(.02+.03*hh(i+Math.floor(t*3))).toFixed(3)})`;
  ctx.fillRect(mx,byy,mw,6+hh(i*5)*14);}}
 // трещины на стекле, расходящиеся из точки удара
 const ix=mx+mw*.62, iy=my+mh*.36;
 ctx.strokeStyle='rgba(190,205,215,.30)';
 for(let i=0;i<11;i++){const an=i*(Math.PI*2/11)+hh(i)*.5, len=mw*(.12+hh(i*3)*.34);
  ctx.lineWidth=1.6-hh(i*7)*.9;ctx.beginPath();ctx.moveTo(ix,iy);
  ctx.lineTo(ix+Math.cos(an)*len,iy+Math.sin(an)*len*.8);ctx.stroke();}
 ctx.fillStyle='rgba(0,0,0,.75)';ctx.beginPath();ctx.arc(ix,iy,7,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='rgba(210,225,235,.18)';ctx.beginPath();ctx.arc(ix,iy,3,0,Math.PI*2);ctx.fill();
 ctx.restore();
 // блик на стекле
 ctx.save();ctx.globalAlpha=.06;const gl=ctx.createLinearGradient(mx,my,mx+mw,my+mh);
 gl.addColorStop(0,'#ffffff');gl.addColorStop(.42,'rgba(255,255,255,0)');ctx.fillStyle=gl;ctx.fillRect(mx,my,mw,mh);ctx.restore();
 // висящие кабели с потолка
 ctx.strokeStyle='#0b0d0f';ctx.lineWidth=3;
 for(let i=0;i<4;i++){const cx=W*(.44+i*.11), sw=Math.sin(t*.6+i)*7;
  ctx.beginPath();ctx.moveTo(cx,0);
  ctx.quadraticCurveTo(cx+sw,H*.10,cx+sw*1.6,H*(.16+i*.02));ctx.stroke();
  ctx.fillStyle='#151a1e';ctx.beginPath();ctx.arc(cx+sw*1.6,H*(.16+i*.02),3.4,0,Math.PI*2);ctx.fill();}
 // искры на оборванном кабеле
 if(!low){const sp=hh(Math.floor(t*4));
  if(sp>.55){const sx=W*.66,sy2=H*.20;
   ctx.save();ctx.globalCompositeOperation='lighter';
   const sg=ctx.createRadialGradient(sx,sy2,0,sx,sy2,26);
   sg.addColorStop(0,'rgba(255,226,160,.55)');sg.addColorStop(1,'rgba(255,180,80,0)');
   ctx.fillStyle=sg;ctx.beginPath();ctx.arc(sx,sy2,26,0,Math.PI*2);ctx.fill();
   for(let i=0;i<7;i++){const a2=hh(i+Math.floor(t*4)*3)*Math.PI*2, d=6+hh(i*5)*22;
    ctx.fillStyle='rgba(255,232,180,.75)';ctx.fillRect(sx+Math.cos(a2)*d,sy2+Math.sin(a2)*d*.7,1.8,1.8);}
   ctx.restore();}}
 // искажённый силуэт в темноте справа
 {const px=W*.465, py=H*.46, ph=H*.26, pw=W*.048;
  const wob=Math.sin(t*.8)*3;
  const rim=ctx.createRadialGradient(px,py+ph*.1,4,px,py+ph*.1,pw*3.4);
  rim.addColorStop(0,`rgba(140,20,28,${(.16+.07*pulse).toFixed(3)})`);rim.addColorStop(1,'rgba(140,20,28,0)');
  ctx.fillStyle=rim;ctx.fillRect(px-pw*3.4,py-ph*.5,pw*6.8,ph*2);
  ctx.save();ctx.globalAlpha=.95;ctx.fillStyle='#030405';
  ctx.beginPath();ctx.moveTo(px-pw,py+ph);ctx.lineTo(px-pw*.62+wob,py+ph*.16);
  ctx.lineTo(px+pw*.62+wob,py+ph*.16);ctx.lineTo(px+pw,py+ph);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.ellipse(px+wob,py+ph*.02,pw*.52,ph*.135,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(px-pw*.42+wob,py-ph*.14,pw*.14,ph*.085,-.22,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(px+pw*.42+wob,py-ph*.14,pw*.14,ph*.085,.22,0,Math.PI*2);ctx.fill();
  ctx.restore();
  const ea=.30+.42*Math.abs(Math.sin(t*1.6));
  ctx.save();ctx.globalCompositeOperation='lighter';
  [[-pw*.24,py-ph*.02],[pw*.24,py-ph*.02]].forEach(e=>{
   const eg=ctx.createRadialGradient(px+e[0]+wob,e[1],0,px+e[0]+wob,e[1],20);
   eg.addColorStop(0,`rgba(214,36,48,${(.55*ea).toFixed(3)})`);eg.addColorStop(1,'rgba(214,36,48,0)');
   ctx.fillStyle=eg;ctx.beginPath();ctx.arc(px+e[0]+wob,e[1],22,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=`rgba(255,150,150,${(.60*ea).toFixed(3)})`;ctx.fillRect(px+e[0]+wob-4.5,e[1]-2,9,3.6);});
  ctx.restore();}
 // пыль в воздухе
 if(!low){for(let i=0;i<34;i++){
   const dx=(i*151+t*8)%W, dy=H*((i*41%94)/100)+Math.sin(t*.55+i)*9;
   ctx.fillStyle=`rgba(200,180,180,${(.03+.06*Math.abs(Math.sin(t*.8+i))).toFixed(3)})`;
   ctx.fillRect(dx,dy,1.5,1.5);}}
 // заголовок: потрёпанный, с красным отсветом и подрагиванием
 const jit=(hh(Math.floor(t*6))>.82)?(hh(Math.floor(t*6)+4)-.5)*6:0;
 const q=endGeom();
 ctx.font='700 '+q.ts+'px "Oswald",Impact,sans-serif';ctx.textAlign='left';
 ctx.save();ctx.shadowColor='rgba(0,0,0,.9)';ctx.shadowBlur=14;
 ctx.fillStyle='#a8adb0';ctx.fillText('НОЧНАЯ',q.bx+jit,q.y1);
 ctx.shadowColor=`rgba(170,30,42,${(.45+.25*pulse).toFixed(2)})`;ctx.shadowBlur=20;
 ctx.fillStyle='#8b3038';ctx.fillText('СМЕНА',q.bx+jit*.6,q.y2);
 ctx.restore();
 text2(ctx,'NS-04 // СИСТЕМА ПОВРЕЖДЕНА',q.bx,q.s1,q.fs1,'#5d666d');
 // тревожный индикатор рядом с подзаголовком
 ctx.fillStyle=`rgba(198,40,50,${(.35+.45*pulse).toFixed(2)})`;
 ctx.beginPath();ctx.arc(q.bx-10,q.s1-5,4,0,Math.PI*2);ctx.fill();
 text2(ctx,'ПОСЛЕ СКРИМЕРА СИСТЕМА БЫЛА ПОВРЕЖДЕНА',q.bx,q.s2,q.fs2,'#6f7478');
 text2(ctx,'ПРОГРЕСС СОХРАНЁН',q.bx,q.s3,q.fs3,'#8c959a');
 const bx=q.bx,by=q.by,bw=q.bw,bh=q.bh;
 menuButtons(bx,by,q.gap,bw,bh,{m:'#9a3239',g:'rgba(160,34,46,.42)',t:'#c9a4a8'},0,{bottom:q.bottom});
 // общая развёртка и виньетка
 for(let y=0;y<H;y+=3){ctx.fillStyle=y%6?'rgba(0,0,0,.15)':'rgba(120,14,20,.035)';ctx.fillRect(0,y,W,1);}
 vigFill(.42,.5,.24,.95,[[0,'rgba(0,0,0,0)'],[1,'rgba(0,0,0,.82)']]);
 ctx.restore();
}
// ==================== V73: КИНЕМАТОГРАФИЧНЫЙ ФИНАЛ ПОСЛЕ 5-Й ГЛАВЫ ====================
// Три концовки, выбор по числу смертей за всё прохождение (SaveSystem.data.deaths):
//   0        — «РАССВЕТ»: охранник выходит на поляну (спокойная концовка).
//   1..4     — «ПЕПЕЛ»: он обливает пиццерию бензином, поджигает её и бежит к выходу.
//   5 и выше — «ЕЩЁ ОДИН КОСТЮМ»: мрачная концовка, выхода больше нет.
function epiDeaths(){return Math.max(0,Number(window.SaveSystem.data.deaths)||0);}
// V103: КОНЦОВКУ БОЛЬШЕ НЕ ВЫБИРАЮТ РУКАМИ — ЕЁ ЗАРАБАТЫВАЮТ.
// ПОЧЕМУ ТАК БЫЛО: после пятой смены открывался экран с пятью карточками, и
// игрок просто щёлкал любой финал. Прохождение ни на что не влияло: аккуратная
// игра без единой смерти и игра с двадцатью смертями заканчивались одинаково.
// СТАЛО: финал определяется числом смертей за всё прохождение.
//   0 смертей   -> 1-я «РАССВЕТ»      — он просто выходит.
//   1-2 смерти  -> 2-я «ПЕПЕЛ»        — он сжигает пиццерию.
//   3-4 смерти  -> 3-я «ПРАВДА»       — он выносит кассету 1993 года.
//   5 и больше  -> 4-я или 5-я, 50 на 50: «ЕЩЁ ОДИН КОСТЮМ» либо «КОСТЮМ-ЛОВУШКА».
// Бросок 50 на 50 делается ОДИН раз и запоминается в сохранении (epiCoin):
// иначе при возврате в финал из меню концовка менялась бы каждый раз.
function epiVariant(){
  const d=epiDeaths();
  if(d>=5){
    let c=window.SaveSystem.data.epiCoin;
    if(c!=='dark'&&c!=='trap'){
      c=(Math.random()<0.5)?'dark':'trap';
      window.SaveSystem.data.epiCoin=c;
      try{window.SaveSystem.save()}catch(e){}
    }
    return c;
  }
  if(d>=3)return 'truth';
  if(d>=1)return 'burn';
  return 'calm';
}
// V103: единая точка входа в финал — считает вариант, обнуляет таймеры,
// пишет достижение и сохранение. Раньше это делал экран выбора (epiChoosePick).
function epiStart(){
  const v=epiVariant();
  G.epiVariant=v;
  G.epiDur=epiDuration(v);
  G.epilogueTimer=0;
  G._epiCues={};
  window.SaveSystem.data.lastEnding=v;
  window.SaveSystem.data.menuVariant='epilogue';
  G.menuVariant='epilogue';
  G.ach({calm:'ending_dawn',burn:'ending_ash',truth:'ending_truth',dark:'ending_suit',trap:'ending_trap'}[v]||'ending_dawn');
  window.SaveSystem.save();
  G.state='epilogue';
}
// V84: пятая концовка «ПРАВДА» — своя длительность раскадровки.
// V94: К КАЖДОМУ ФИНАЛУ ДОБАВЛЕНА КОДА — НОВАЯ ПОСЛЕДНЯЯ СЦЕНА (~8 с).
// Раскадровки код лежат в js/endings_coda.js. Точки старта взяты ровно там,
// где раньше финал уходил в чёрный — получается монтажный стык, а не разрыв.
// V101: ТРИ КОНЦОВКИ ПЕРЕСОБРАНЫ ЗАНОВО (js/end_scenes.js), и длины сцен
// изменились: «Рассвет» 16.5 → 20.4 (добавлен путь через здание, тьма за
// дверью и флэшбэк), «Пепел» 23.0 → 22.0 (биты выровнены), «Ещё один костюм»
// 21.0 → 18.2 (семь равных битов по 2.6 с вместо сцен от 1.4 до 5 с).
const EPI_CODA_AT={burn:22.0,trap:35.6,dark:18.2,truth:30.0,calm:20.4};
// V101: у «Рассвета» коды больше нет. Кода вела его на остановку и показывала
// окно пиццерии — после нового финала (тьма за дверью, флэшбэк и уход в белый
// покой) эта сцена противоречит концовке: он уже не идёт ни на какую остановку.
const EPI_SCENE_NOCODA={calm:1};
function epiDuration(v){
  const key=EPI_CODA_AT[v]!==undefined?v:'calm';
  if(EPI_SCENE_NOCODA[key])return EPI_CODA_AT[key];
  const cod=(window.EndCoda&&window.EndCoda.DUR&&window.EndCoda.DUR[key])||0;
  return EPI_CODA_AT[key]+cod;
}
// Помощники для код: тот же набор, что уходит в endings_truth.js.
function epiCodaArgs(){
  return {ctx,w:W,h:H,low:document.body.classList.contains('low-end'),
    t:performance.now()/1000,
    epiCue,epiRnd,epiStridePhase,epiAnimatron,epiWornSuit,drawGuardChar,
    drawFlames,drawEmbers,drawSmokeColumn,
    epiCard,epiSub,epiGrade,epiBars,epiTimecode,epiSkipHint};
}
// V101: набор помощников для новых раскадровок. Он шире, чем у код: сценам
// нужны привязка фигуры к полу (epiGuardScale/Feet), масштаб робота и
// субъективные кадры из end_pov.js.
function epiSceneArgs(){
  return {ctx,w:W,h:H,low:document.body.classList.contains('low-end'),
    epiCue,epiRnd,epiStridePhase,epiAnimatron,epiWornSuit,epiRackSuit,drawGuardChar,
    drawFlames,drawEmbers,drawSmokeColumn,epiPOVMask,
    epiGuardScale,epiGuardFeet,epiGuardH,epiMonScale,epiFit,
    epiCard,epiSub,epiGrade,epiBars,epiTimecode,epiSkipHint};
}
// Делегирование в js/end_scenes.js. Если файл не подключён, работает старая
// раскадровка ниже — игра не падает.
function epiScene(name,t){
  if(!window.EndScene||!window.EndScene[name]||!window.EndPOV)return false;
  window.EndScene[name](epiSceneArgs(),t);
  return true;
}
function epiCoda(name,t){
  const at=EPI_CODA_AT[name];
  if(at===undefined||t<at)return false;
  if(EPI_SCENE_NOCODA[name])return false;
  if(!window.EndCoda||!window.EndCoda[name])return false;
  window.EndCoda[name](epiCodaArgs(),t-at);
  return true;
}
// ---------------------------------------------------------------------------
// ЖИВОЙ ПЕРСОНАЖ: пиксельный охранник со скелетной анимацией.
// Дыхание, моргание, поворот головы, сгиб коленей и локтей, инерция куртки,
// пыль из-под ботинок, контровой свет от огня, позы: стоит / идёт / бежит /
// лежит / поднимается / льёт бензин / чиркает спичкой / сидит.
// ---------------------------------------------------------------------------
// V76: на планах с БОКОВЫМ движением фаза шага считается от пройденного пути,
// а не от времени — иначе ноги перебирают быстрее, чем персонаж едет по экрану,
// и ступни заметно скользят по полу. На планах «в глубину» (коридор) шаг
// остаётся темповым: там ступни идут к камере и скольжение не читается.
// V94: шаг считается по реальной длине шага нового цикла.
// Было: 2·sin(amp)·20.5 юнитов без множителей роста (GUARD_UP=1.26) и подгонки
// под высоту кадра (FIT) — расчётный шаг не совпадал с нарисованным, и
// ступни подскальзывали по полу. Стало: фактический вынос стопы за шаг
// (расстояние между ступнями в двойной опоре — 12.4 юнита) со всеми множителями.
function epiStridePhase(distPx,sc,amp){
  const FIT=Math.min(1,H/560);
  const stepUnits=12.4*((amp||0.52)/0.52);
  const stridePx=Math.max(1,stepUnits*3*(sc||1)*1.26*FIT);
  return Math.PI*distPx/stridePx;
}
// ---------------------------------------------------------------------------
// V94: ЦИКЛ ШАГА ПО КЛЮЧЕВЫМ КАДРАМ, А НЕ ПО СИНУСУ.
// ПОЧЕМУ ТАК БЫЛО: все углы брались как sin(фаза), а главное — голень
// рисуется под углом (thigh − knee), и при ПОЛОЖИТЕЛЬНОМ knee колено
// выгибалось НАЗАД, по-птичьи (в беге до 1.7 рад — почти 100° переразгиба).
// То же с локтями. Именно поэтому движение не читалось как человеческое.
// СТАЛО: цикл задан ключевыми кадрами по анатомии: контакт пяткой →
// амортизация с подгибом колена → опора на почти прямой ноге → отрыв
// пятки → толчок носком → пронос с коленом вперёд → вынос голени и взятие
// носка на себя. Знаки здесь АНАТОМИЧЕСКИЕ (+ = вперёд / сгиб / носок вниз),
// в канвасовые они переводятся одним местом — в ветках walk/run.
// ---------------------------------------------------------------------------
function gaitKF(u,pts){
  u=((u%1)+1)%1;
  const n=pts.length;
  for(let i=0;i<n;i++){
    const a=pts[i],b=pts[(i+1)%n];
    let u0=a[0],u1=b[0];if(u1<=u0)u1+=1;
    let uu=u;if(uu<u0)uu+=1;
    if(uu>=u0&&uu<=u1){
      const span=u1-u0;if(span<1e-6)return a[1];
      const k=(uu-u0)/span,s=k*k*(3-2*k);       // плавный вход/выход каждого кадра
      return a[1]+(b[1]-a[1])*s;
    }
  }
  return pts[0][1];
}
// Шаг: опора — 62% цикла, пронос — 38%, есть двойная опора.
const GAIT_WALK={
  thigh:[[0,0.40],[0.15,0.24],[0.35,0.02],[0.50,-0.17],[0.62,-0.26],[0.76,0.16],[0.90,0.44]],
  knee: [[0,0.08],[0.12,0.27],[0.32,0.05],[0.50,0.14],[0.62,0.50],[0.72,1.02],[0.84,0.60],[0.94,0.10]],
  foot: [[0,-0.26],[0.09,0.02],[0.32,0.01],[0.46,0.12],[0.56,0.36],[0.63,0.52],[0.71,0.08],[0.82,-0.20],[0.93,-0.28]]
};
// Бег: опора — 32% цикла, дальше фаза полёта; двойной опоры нет.
const GAIT_RUN={
  thigh:[[0,0.54],[0.10,0.31],[0.22,0.01],[0.32,-0.36],[0.46,-0.18],[0.62,0.30],[0.80,0.62],[0.92,0.60]],
  knee: [[0,0.32],[0.12,0.55],[0.24,0.30],[0.32,0.66],[0.44,1.48],[0.58,1.28],[0.74,0.58],[0.90,0.24]],
  foot: [[0,-0.10],[0.06,0.12],[0.20,0.26],[0.32,0.62],[0.44,0.28],[0.60,-0.12],[0.78,-0.32],[0.92,-0.20]]
};
function drawGuardChar(c,x,y,scale,o){
  o=o||{};
  const t=(o.t!==undefined)?o.t:performance.now()/1000;
  const pose=o.pose||'stand';
  const face=(o.face===undefined?1:o.face)>=0?1:-1;
  const lie=Math.max(0,Math.min(1,o.lie||0));      // 1 — лежит, 0 — стоит
  const ph=o.phase||0;                              // фаза шага
  const seed=o.seed||0;
  // V85: ПЕРСОНАЖ СТАЛ КРУПНЕЕ. Во всех сценах фигура терялась в кадре:
  // декорации крупные, а человек маленький, и вся мимика с жестами просто
  // не читалась. Множитель применяется здесь один раз, поэтому все двадцать
  // вызовов в игре и в финалах подросли согласованно, без правки каждой сцены.
  // Фигура растёт вверх от точки y (уровень стоп), так что в пол она не уезжает.
  const GUARD_UP=1.26;
  // V86: размер фигуры был в абсолютных пикселях, поэтому на низком экране
  // телефона охранник закрывал полкадра и его ноги уходили за кромку.
  // Теперь фигура пропорциональна высоте кадра (на обычном экране без изменений).
  const FIT=Math.min(1,H/560);
  const U=3.0*scale*(o.gscale===undefined?GUARD_UP:o.gscale)*FIT; // размер «пикселя»
  const rim=o.rim||null;                            // контровой свет {dir,col,power}
  const dark=Math.max(0,Math.min(1,o.dark||0));     // затемнение фигуры (силуэт)
  // ---- дыхание, микродвижения, моргание ----
  const breath=Math.sin(t*1.55+seed)*0.5+Math.sin(t*0.61+seed*1.7)*0.25;
  // V75: моргание не строго ритмичное — иногда двойное, иногда с задержкой
  const blinkC=(t*0.77+seed)%4.2;
  const blink=(blinkC<0.12||blinkC>4.06||(blinkC>0.30&&blinkC<0.40&&(seed*7|0)%2===0))?1:0;
  // V79: на ходу и на бегу голова обязана смотреть ПО ХОДУ движения.
  // Раньше при отсутствии look голова бесконечно вертелась по синусоиде, а
  // часть сцен передавала отрицательный look — и персонаж бежал вперёд,
  // отвернув лицо в сторону или назад. Теперь взгляд назад разрешён только
  // стоя (там это осознанные кадры «он оборачивается»).
  let headTurn=(o.look!==undefined)?o.look:Math.sin(t*0.38+seed)*0.45+Math.sin(t*0.13)*0.25;
  if(pose==='walk'||pose==='run'){
    const fwdMin=(pose==='run'?0.22:0.10);
    headTurn=Math.max(fwdMin,headTurn)+Math.sin(t*(pose==='run'?5.2:2.6)+seed)*0.04;
  }
  // V77: чистая синусоида давала вечное покачивание. Живой человек стоит
  // на одной ноге, держит стойку, потом переносит вес — поэтому волна
  // подрезана: на краях получаются паузы, между ними плавный переход.
  const swRaw=Math.sin(t*0.42+seed)+0.35*Math.sin(t*0.17+seed*2.1);
  const sway=Math.max(-1,Math.min(1,swRaw*1.9))*0.35*(1-lie);
  // ---- углы конечностей по позе ----
  let thighF=0,thighB=0,kneeF=0,kneeB=0,shF=0,shB=0,elF=0,elB=0,lean=0,bob=0,armLift=0;
  // V75: hipX — перенос веса корпуса в сторону опорной ноги, tilt — наклон плеч,
  // ankF/ankB — доворот стопы (перекат с пятки на носок)
  let hipX=0,tilt=0,ankF=0,ankB=0,hpitch=0;
  // V94: момент удара стопы о пол теперь берётся из цикла шага, а не из sin(ph):
  // раньше пыль взлетала в середине проноса, то есть под ногой в воздухе.
  let pufF=null,pufB=null;
  const S=Math.sin(ph), S2=Math.sin(ph+Math.PI), C1=Math.cos(ph*2);
  if(pose==='walk'){
    // V76: limp — хромота: больная нога делает короче шаг, на неё он «проваливается»
    const lp=Math.max(0,Math.min(1,o.limp||0));
    // V77: stride — множитель длины шага. Широкий шаг нужен там, где персонаж
    // быстро идёт по экрану: иначе, чтобы не скользить, ноги пришлось бы
    // перебирать неправдоподобно часто.
    const st=(o.stride===undefined?1:o.stride);
    // V94: всё тело живёт от одного нормализованного времени цикла u:
    // u=0 — контакт ближней пятки, u=0.62 — отталкивание, дальше пронос.
    const u=ph/(2*Math.PI);
    const gw=GAIT_WALK;
    const leg=(uu,kSt,kFl)=>({th:gaitKF(uu,gw.thigh)*st*kSt,fl:gaitKF(uu,gw.knee)*kFl,ft:gaitKF(uu,gw.foot)});
    const LF=leg(u,1-0.34*lp,1-0.30*lp), LB=leg(u+0.5,1,1);
    // Перевод в канвас: бедро = −угол выноса, knee = −сгиб (именно здесь был
    // перевёрнутый знак), а ankle доводит стопу до АБСОЛЮТНОГО угла к полу,
    // потому стопа в опоре теперь стоит ровно, а не качается вместе с голенью.
    thighF=-LF.th;kneeF=-LF.fl;ankF=LF.ft-(thighF-kneeF)*0.35;
    thighB=-LB.th;kneeB=-LB.fl;ankB=LB.ft-(thighB-kneeB)*0.35;
    // Руки: машут ПРОТИВОФАЗНО своей ноге и отстают на 0.12 цикла.
    // Локоть теперь складывается ВПЕРЁД (отрицательный угол) — раньше положительный
    // угол ломал руку в обратную сторону.
    const uA=u-0.12;
    shF=gaitKF(uA,gw.thigh)*st*0.95;shB=gaitKF(uA+0.5,gw.thigh)*st*0.95;
    elF=-(0.24+0.95*Math.max(0,-shF));elB=-(0.24+0.95*Math.max(0,-shB));
    // Вертикаль: центр масс ниже всего в двойной опоре (u=0 и 0.5),
    // выше всего — на середине опоры, когда нога выпрямлена. Два подъёма на цикл.
    const vertW=-Math.cos(4*Math.PI*(u-0.03));
    const stN=(u%1+1)%1<0.62?1:0;                 // ближняя нога в опоре
    bob=0.60+0.60*vertW-0.55*lp*stN;              // на больную ногу он проваливается
    lean=0.05+0.10*lp*stN;
    // Таз уходит над ОПОРНОЙ ногой, плечи скручиваются против таза.
    hipX=0.50*Math.cos(2*Math.PI*(u-0.31))*(1+0.5*lp);
    tilt=-0.11*shF+0.10*lp*stN;
    // Голова стабилизируется: она гасит подъём корпуса, а не кивает впустую.
    hpitch=-0.020-0.030*vertW;
    // Пыль — только в момент контакта пяткой.
    const hit=(uu)=>{const k=((uu%1)+1)%1;return Math.max(0,1-k/0.16)*0.5;};
    pufF=hit(u);pufB=hit(u+0.5);
  }else if(pose==='run'){
    // V94: те же принципы, но цикл беговой: опора всего 32% цикла, дальше
    // полёт, колено проноса складывается до 1.48 рад ВПЕРЁД (раньше ровно на
    // столько же назад), корпус наклонён, руки сложены у груди.
    const u=ph/(2*Math.PI);
    const gr=GAIT_RUN;
    const leg=(uu)=>({th:gaitKF(uu,gr.thigh),fl:gaitKF(uu,gr.knee),ft:gaitKF(uu,gr.foot)});
    const LF=leg(u), LB=leg(u+0.5);
    thighF=-LF.th;kneeF=-LF.fl;ankF=LF.ft-(thighF-kneeF)*0.35;
    thighB=-LB.th;kneeB=-LB.fl;ankB=LB.ft-(thighB-kneeB)*0.35;
    const uA=u-0.10;
    shF=gaitKF(uA,gr.thigh)*1.05+0.10;shB=gaitKF(uA+0.5,gr.thigh)*1.05+0.10;
    elF=-(0.80+0.85*Math.max(0,-shF));elB=-(0.80+0.85*Math.max(0,-shB));
    // Вертикаль бега: нижняя точка — середина опоры (вес грузит согнутую
    // ногу), верхняя — середина полёта, когда обе стопы в воздухе.
    const vertR=-Math.cos(4*Math.PI*(u-0.16));
    bob=1.25+1.25*vertR;
    const load=Math.max(0,-vertR);
    lean=0.28+0.07*load;
    hipX=0.90*Math.cos(2*Math.PI*(u-0.16));
    tilt=-0.16*shF;
    hpitch=-0.045-0.040*vertR+0.050*load;
    const hit=(uu)=>{const k=((uu%1)+1)%1;return Math.max(0,1-k/0.13);};
    pufF=hit(u);pufB=hit(u+0.5);
  }else if(pose==='pour'){
    // V75: устойчивая стойка, рука выше, кисть подрагивает от веса канистры
    const tr=Math.sin(t*11.0+seed)*0.03;
    thighF=0.22;thighB=-0.20;kneeF=0.14;kneeB=0.12;
    shF=-1.28+Math.sin(t*1.5)*0.10+tr;shB=-0.10+Math.sin(t*1.5+0.6)*0.05;
    elF=0.42+tr;elB=0.16;
    lean=0.14;bob=Math.sin(t*1.5)*0.5;hpitch=-0.10;ankF=0.10;ankB=0.08;
  }else if(pose==='match'){
    thighF=0.06;thighB=-0.06;kneeF=0.04;kneeB=0.04;
    shF=-1.95;shB=-0.26;elF=1.15;elB=0.30;lean=-0.04;armLift=1;
  }else if(pose==='sit'){
    // V75: он не сидит как манекен — плечи опускаются на выдохе, голова кивает
    const slump=(o.slump===undefined?0:o.slump);
    // голень = thigh-knee: чтобы она шла вниз от колена, knee должен быть ≈ thigh
    thighF=-1.42;thighB=-1.28;kneeF=-1.30;kneeB=-1.20;
    // руки почти прямые, ладони ложатся на колени
    shF=-0.58+breath*0.03;shB=-0.50+breath*0.03;
    elF=0.28+breath*0.04;elB=0.24+breath*0.04;
    lean=0.16+0.20*slump+breath*0.015;bob=breath*0.35;
    ankF=-0.22;ankB=-0.18;tilt=breath*0.02;
  }else if(pose==='laugh'){
    // V74: хохот — корпус откинут назад, руки разведены, плечи трясутся.
    const j=Math.sin(t*13.0+seed)*0.16+Math.sin(t*7.3)*0.08;
    thighF=0.16;thighB=-0.14;kneeF=0.10;kneeB=0.08;
    shF=-0.95+j;shB=-0.82-j;elF=1.45+j*0.6;elB=1.38-j*0.6;
    lean=-0.24+j*0.25;bob=Math.abs(Math.sin(t*13.0))*1.6;
    hpitch=0.24+j*0.20;tilt=-0.06+j*0.10;ankF=-0.10;ankB=-0.08;
  }else if(pose==='brace'){
    // V75: вжался спиной в дверь, руками упирается назад, грудь ходит от дыхания
    const pant=Math.sin(t*5.2+seed);
    thighF=0.30;thighB=-0.26;kneeF=0.34;kneeB=0.30;
    shF=1.05+pant*0.10;shB=0.95-pant*0.10;elF=-0.55;elB=-0.50;
    lean=-0.14+pant*0.04;bob=Math.abs(pant)*0.9;ankF=-0.12;ankB=-0.10;tilt=pant*0.03;
    hpitch=0.10+pant*0.04;
  }else if(pose==='reach'){
    // V75: тянет руку к костюму — не хватает одним кадром, а ведёт её плавно
    const k=Math.max(0,Math.min(1,o.reachK===undefined?1:o.reachK));
    thighF=0.18*k;thighB=-0.16*k;kneeF=0.10;kneeB=0.08;
    shF=-1.05*k+0.10;shB=0.16*k;elF=0.55-0.35*k;elB=0.26;
    lean=0.10*k+breath*0.01;bob=breath*0.3;tilt=-0.04*k;
  }else if(pose==='rise'){
    // V75: подъём с пола проходит через опору на руку и колено, а не рывком в стойку
    const k=Math.max(0,Math.min(1,o.riseK===undefined?1:o.riseK));
    const L=(a0,b0)=>a0+(b0-a0)*k;
    const wob=Math.sin(t*7.5+seed)*(1-k)*0.06;
    // передняя нога упирается ступнёй в пол, задняя стоит на колене,
    // ближняя рука отжимается от пола, корпус завален вперёд
    thighF=L(-0.60,0.04)+wob;kneeF=L(0.80,0.03);
    thighB=L(0.20,-0.04);kneeB=L(-1.30,0.03);
    shF=L(-0.55,0.06)+wob;elF=L(0.10,0.22);
    shB=L(0.30,-0.06);elB=L(0.35,0.20);
    lean=L(0.50,0.015)+wob;bob=(1-k)*0.5+breath*0.3;
    ankF=L(0.35,0);ankB=L(-1.40,0);tilt=L(0.08,0)+wob;hpitch=L(-0.22,0);
  }else if(pose==='wear'){
    // V88: НАДЕВАНИЕ РАЗБИТО НА ПЯТЬ ЧИТАЕМЫХ СТАДИЙ И СОГЛАСОВАНО С КОСТЮМОМ.
    // Было: три фазы, привязанные к тому, как раньше проявлялся костюм целиком.
    // Руки взлетали над головой почти сразу, а весь костюм в это время просто
    // набирал прозрачность — действие не читалось. Теперь стадии те же, что в
    // epiWornSuit: он нагибается и вступает в штанины, подтягивает корпус на
    // плечи, вводит руки в рукава, обеими руками опускает голову зайца и только
    // потом оседает в костюме. Границы стадий совпадают один в один.
    const k=Math.max(0,Math.min(1,o.wearK===undefined?1:o.wearK));
    const St=(a,b)=>Math.max(0,Math.min(1,(k-a)/(b-a)));
    const eas=v=>v<.5?2*v*v:1-Math.pow(-2*v+2,2)/2;
    // руки поднимаются РАНЬШЕ, чем маска начинает опускаться (0.52..0.72),
    // иначе голова костюма едет вниз сама, а руки висят по бокам
    const kLeg=eas(St(0.00,0.24)), kBody=eas(St(0.18,0.46)),
          kArm=eas(St(0.40,0.60)), kHead=eas(St(0.52,0.72)), kSet=eas(St(0.90,1.00));
    // каждая стадия доводит угол до своей цели, поэтому переходы без рывков
    const seq=(a,b,cc,d,e,f)=>{let v=a;v+=(b-v)*kLeg;v+=(cc-v)*kBody;v+=(d-v)*kArm;v+=(e-v)*kHead;return v+(f-v)*kSet;};
    const eff=Math.sin(t*8.5+seed)*kHead*(1-kSet);   // усилие на натягивании
    //            покой  штанины корпус рукава голова осадка
    shF   =seq( 0.06, -0.50, -1.55, -0.95, -3.02,  0.02)+eff*0.05;
    elF   =seq( 0.20,  0.75,  1.55,  0.05, -1.60,  0.26);
    shB   =seq(-0.06, -0.42, -1.46, -0.88, -2.92, -0.02)-eff*0.05;
    elB   =seq( 0.18,  0.70,  1.48,  0.04, -1.52,  0.24);
    thighF=seq( 0.04,  0.44,  0.18,  0.10,  0.06,  0.10);
    thighB=seq(-0.04, -0.40, -0.16, -0.10, -0.06, -0.10);
    kneeF =seq( 0.03,  0.76,  0.32,  0.14,  0.10,  0.12);
    kneeB =seq( 0.03,  0.70,  0.29,  0.13,  0.09,  0.11);
    lean  =seq( 0.015, 0.44,  0.17,  0.07, -0.07,  0.03);
    hpitch=seq( 0,     0.32,  0.11,  0.02, -0.30,  0.05);
    ankF  =seq( 0,     0.22,  0.15,  0.10,  0.06,  0.10);
    ankB  =seq( 0,     0.20,  0.13,  0.09,  0.05,  0.09);
    tilt=eff*0.03;
    bob=seq(0,-1.25,-0.45,0,0.55,0)+eff*0.42+breath*0.3*kSet;
  }else if(pose==='crush'){
    // V74: пружинный механизм сжал костюм — судорога, руки прижаты к бокам.
    const sp=Math.sin(t*26.0+seed)*(o.spasm===undefined?1:o.spasm);
    thighF=0.34+sp*0.14;thighB=-0.30+sp*0.12;kneeF=0.46+sp*0.2;kneeB=0.42-sp*0.2;
    shF=-0.42+sp*0.3;shB=-0.36-sp*0.3;elF=1.55;elB=1.50;
    lean=0.36+sp*0.1;bob=Math.abs(sp)*2.2;hpitch=-0.30+sp*0.10;
  }else{ // stand
    thighF=0.04+sway*0.03;thighB=-0.04-sway*0.03;kneeF=0.03+Math.max(0,sway)*0.06;kneeB=0.03+Math.max(0,-sway)*0.06;
    shF=0.06+breath*0.05+sway*0.04;shB=-0.06-breath*0.05+sway*0.04;elF=0.22+breath*0.03;elB=0.20+breath*0.03;
    lean=0.015+breath*0.012;bob=breath*0.45;
    // V75: стоя он переносит вес с ноги на ногу, а не стоит вкопанным
    hipX=sway*0.9;tilt=sway*0.035;
    // V84: БЫТОВЫЕ ЖЕСТЫ В ПРОСТОЕ. Было: стоя охранник только качался из
    // стороны в сторону и дышал — за минуту наблюдения он не делал ничего.
    // Стало: раз в несколько секунд он поправляет фуражку, смотрит на часы,
    // разминает шею. Жесты короткие и не пересекаются между собой.
    // V85: ЖЕСТОВ СТАЛО БОЛЬШЕ И ОНИ НЕ ПОВТОРЯЮТСЯ ПО КРУГУ. Цикл вырос
    // с 11 до 19 секунд, в нём шесть бытовых действий вместо трёх, и каждый
    // прогон цикла сдвигается на свою величину — порядок сбивается, и со стороны
    // не видно анимационного колеса.
    const CYC=19.0;
    const gRun=Math.floor((t*0.62+seed*2.7)/CYC);
    const jig=Math.abs((Math.sin(gRun*12.9898+seed*78.233)*43758.5453)%1);
    const gt=(t*0.62+seed*2.7)%CYC+jig*2.0;
    if(gt<1.30){                       // поправляет фуражку
      const q=Math.sin(gt/1.30*Math.PI);
      shF-=q*1.05;elF+=q*1.25;tilt-=q*0.03;hpitch-=q*0.05;
    }else if(gt>3.20&&gt<5.10){        // глубокий вдох и выдох: плечи вверх, потом оседают
      const q0=(gt-3.20)/1.90, q=Math.sin(q0*Math.PI);
      shF-=q*0.16;shB-=q*0.16;lean+=q*0.030;bob+=q*0.55;
      hpitch+=(q0>0.55?(q0-0.55)/0.45:0)*0.16;
    }else if(gt>6.10&&gt<7.40){        // смотрит на часы
      const q=Math.sin((gt-6.10)/1.30*Math.PI);
      shF-=q*0.62;elF+=q*1.02;hpitch+=q*0.12;headTurn+=q*0.20;
    }else if(gt>8.60&&gt<10.10){       // трёт лицо и глаза — четвёртая ночь подряд
      const q=Math.sin((gt-8.60)/1.50*Math.PI);
      shF-=q*1.32;elF+=q*1.66;hpitch-=q*0.10;tilt-=q*0.02;
    }else if(gt>11.40&&gt<12.50){      // разминает шею
      const q=Math.sin((gt-11.40)/1.10*Math.PI);
      tilt+=q*0.10;hpitch-=q*0.08;shB-=q*0.18;shF-=q*0.10;
    }else if(gt>14.10&&gt<15.60){      // оглядывается через плечо в темноту
      const q=Math.sin((gt-14.10)/1.50*Math.PI);
      headTurn-=q*0.95;tilt-=q*0.05;shB+=q*0.12;
    }else if(gt>16.80&&gt<18.00){      // вытирает ладони о брюки
      const q=Math.sin((gt-16.80)/1.20*Math.PI);
      shF+=q*0.20;elF+=q*0.34;shB+=q*0.16;elB+=q*0.30;lean+=q*0.020;
    }
    // мелкая дрожь кистей — человек не застывает даже в покое
    elF+=Math.sin(t*6.3+seed*3.1)*0.018;elB-=Math.sin(t*5.7+seed*2.3)*0.016;
  }
  // V85: ЖИЗНЬ НА ХОДУ. Раньше шаг был идеальным циклом без единого
  // отклонения. Теперь на ходу он иногда оглядывается в темноту и поправляет
  // ремень — шаг остаётся ровным, но перестаёт быть механическим.
  if(pose==='walk'&&!o.prop){
    const wt=(t*0.5+seed*1.9)%13.0;
    if(wt<1.20){const q=Math.sin(wt/1.20*Math.PI);headTurn-=q*0.50;tilt-=q*0.030;}
    else if(wt>6.40&&wt<7.50){const q=Math.sin((wt-6.40)/1.10*Math.PI);shB-=q*0.30;elB+=q*0.52;}
    else if(wt>10.20&&wt<11.10){const q=Math.sin((wt-10.20)/0.90*Math.PI);hpitch-=q*0.09;headTurn+=q*0.18;}
  }
  // V77: рука с канистрой не должна махать при шаге — иначе тяжёлая канистра
  // заезжала прямо на куртку. Теперь она почти прямая и висит вдоль тела,
  // а второе плечо компенсирует вес.
  if(o.prop==='canister'&&(pose==='walk'||pose==='stand')){
    shF=-0.05+Math.sin(t*1.5+seed)*0.03;elF=0.10;
    shB=shB*1.2-0.04;tilt-=0.045;
  }
  // V95: КАССЕТА В РУКАХ. Было: кассета рисовалась отдельным прямоугольником
  // рядом с фигурой по жёсткому смещению — она висела в воздухе у бедра и
  // никак не была связана с кистью. Стало: предмет держит ИМЕННО кисть, а
  // поза рук собрана под хват: ближняя рука согнута в локте и выведена перед
  // грудью, дальняя поддерживает снизу, кисть чуть подрабатывает от дыхания.
  // tapeUp — насколько он поднимает кассету, чтобы рассмотреть этикетку.
  if(o.prop==='tape'){
    const tu=Math.max(0,Math.min(1,o.tapeUp||0));
    // tapeK — насколько рука уже вышла в хват: поза не щёлкает, а перетекает
    const tk=(o.tapeK===undefined?1:Math.max(0,Math.min(1,o.tapeK)));
    const L=(a0,b0)=>a0+(b0-a0)*tk;
    // Локоть остаётся У ТЕЛА и сильно согнут — иначе рука вытягивалась вперёд и
    // кадр читался как «он указывает кассетой в сторону», а не как хват у груди.
    shF=L(shF,0.22-0.44*tu+Math.sin(t*1.35+seed)*0.020);
    elF=L(elF,-2.40-0.22*tu+Math.sin(t*1.90+seed*1.7)*0.016);
    shB=L(shB,0.16-0.30*tu);
    elB=L(elB,-2.10-0.16*tu);
    tilt-=0.020*(1-tu)*tk;
  }
  // V77: раньше «лежит» = стоячая поза, повёрнутая набок: ноги слипались в одну
  // тёмную полосу, руки были прижаты к телу — фигура читалась как манекен,
  // который просто уронили. Теперь при lie>0 углы конечностей уводятся
  // в раскинутую позу: одна нога подтянута, вторая вытянута, одна рука
  // заброшена за голову, вторая лежит вдоль пола, голова откинута.
  if(lie>0&&pose!=='rise'){
    const L=(a0,b0)=>a0+(b0-a0)*lie;
    const tw=Math.sin(t*1.1+seed)*0.03*lie;      // он дышит и чуть шевелится
    thighF=L(thighF,0.30+tw);kneeF=L(kneeF,0.54);
    thighB=L(thighB,-0.30);kneeB=L(kneeB,0.26+tw);
    shF=L(shF,-1.34+tw);elF=L(elF,0.62);
    shB=L(shB,0.58);elB=L(elB,0.34-tw);
    lean=L(lean,-0.10);hpitch=L(hpitch,0.20);tilt=L(tilt,0);hipX=L(hipX,0);
    ankF=L(ankF,-0.30);ankB=L(ankB,0.24);
  }
  // V81: УПРЕЖДЕНИЕ (anticipation). Перед рывком человек коротко приседает и
  // уводит корпус назад — только после этого выстреливает вперёд. Раньше бег
  // начинался с первого же кадра на полной скорости, будто персонажа
  // подменили. antic идёт 0→1 за последние доли секунды перед рывком.
  if(o.antic){
    const a1=Math.max(0,Math.min(1,o.antic)), q=Math.sin(a1*Math.PI);
    thighF+=q*0.30;thighB-=q*0.26;kneeF+=q*0.44;kneeB+=q*0.40;
    shF-=q*0.34;shB+=q*0.56;elF+=q*0.30;elB+=q*0.24;
    lean-=q*0.15;bob-=q*1.6;ankF+=q*0.10;ankB+=q*0.08;tilt-=q*0.04;
  }
  // V81: ИНЕРЦИЯ (follow through). Когда движение резко кончается, руки и
  // плечи по инерции проходят дальше точки остановки и затухают колебанием,
  // а не замирают в одном кадре. o.settle — секунды с момента остановки.
  if(o.settle!==undefined&&o.settle>=0&&o.settle<1.8){
    const d=Math.exp(-o.settle*4.2)*Math.sin(o.settle*15.0);
    shF+=d*0.32;shB-=d*0.28;elF+=d*0.16;elB-=d*0.13;
    lean+=d*0.05;tilt+=d*0.035;bob+=d*0.35;
  }
  // палитра
  const SH_D='#5e0a15',SH_M='#a8192a',SH_L='#d8323f',SH_H='#f45a62';
  // V84: брюки и ботинки были почти чёрные (#0d121c / #0a0d13), поэтому в
  // тёмных сценах концовок обе ноги и обувь сливались в одну неразличимую
  // полосу. Тона подняты — силуэт остаётся тёмным, но ноги читаются.
  const PANT_D='#151d2b',PANT_M='#27344b',PANT_L='#3d4f6e',PANT_F='#1f2a3d';
  const SKIN='#d9b48c',SKIN_L='#ebc9a2',SKIN_D='#a87d58';
  const CAP_D='#131926',CAP_M='#1f2836',CAP_L='#333e52';
  const BOOT='#171d28',BOOT_D='#111721',SOLE='#525c6e',SOLE_D='#39424f';
  c.save();
  c.translate(x,y);
  // V77: тень рисуется ДО поворота набок — иначе она заваливалась вместе
  // с телом и висела в воздухе рядом с фигурой. Лёжа тень шире и бледнее.
  // V110: прозрачность тени теперь зависит от настройки ТЕНИ: на НИЗКИХ тени
  // не рисуются вовсе (дешевле для слабой машины), на ВЫСОКИХ — в полную силу.
  const shMul=window.GFX?.shadow??1;
  if(!o.noShadow&&shMul>0.01){
    const sdir0=o.shadowDir||1, slen0=o.shadowLen||1;
    c.save();c.scale(3.0*scale*face,3.0*scale);
    c.globalAlpha=(0.42-0.14*lie)*(o.shadowAlpha===undefined?1:o.shadowAlpha)*shMul;
    c.fillStyle='#000';c.beginPath();
    // лёжа пятно уезжает туда, где реально оказалось тело после поворота набок,
    // и становится длинным и мягким
    const sx0=sdir0*5*slen0*(1-lie)+lie*(-5.5), sy0=24-lie*21.5;
    c.ellipse(sx0,sy0,(11+lie*6)*slen0,3.1-lie*0.7,0,0,Math.PI*2);
    c.fill();c.restore();
  }
  // лежит: весь корпус поворачивается на бок
  c.rotate((-Math.PI*0.46)*lie*face);
  c.translate(0,-lie*6*U);
  c.scale(U*face,U);
  c.translate(0,-bob*0.35);
  const hipDX=hipX*0.45;
  const grad=(x0,y0,x1,y1,a,b)=>{const g=c.createLinearGradient(x0,y0,x1,y1);g.addColorStop(0,a);g.addColorStop(1,b);return g;};
  // ---- функция «конечность»: сустав -> сустав, с толщиной и тенью ----
  const limb=(jx,jy,ang,len,w,col,colShade,colEdge)=>{
    c.save();c.translate(jx,jy);c.rotate(ang);
    c.fillStyle=col;c.fillRect(-w/2,0,w,len);
    c.fillStyle=colShade;c.fillRect(w/2-w*0.34,0,w*0.34,len);
    // V84: светлая кромка по внешнему краю — без неё ближняя нога не
    // отделялась от дальней, обе читались как один тёмный столб.
    if(colEdge){c.fillStyle=colEdge;c.fillRect(-w/2,0,w*0.22,len);}
    c.restore();
    return {x:jx+Math.sin(ang)*len*-1*0+Math.sin(-ang)*0, y:0};
  };
  // canvas rotate(a) переводит локальную точку (0,len) в (-sin(a)*len, cos(a)*len),
  // поэтому по X здесь именно минус — иначе кисти и ботинки отрываются от конечностей.
  const jointEnd=(jx,jy,ang,len)=>({x:jx-Math.sin(ang)*len,y:jy+Math.cos(ang)*len});
  // ================= НОГИ (дальняя, затем ближняя) =================
  const hipY=1.5;
  // V84: бёдра стояли на ±2.3 при ширине штанины 4.6 — штанины смыкались
  // ровно по центру, между ними не оставалось ни зазора, ни кромки.
  // Ноги разведены до ±2.9, штанины чуть уже — между ними виден просвет.
  const drawLeg=(hx,thigh,knee,shade,ankle)=>{
    // V84: дальняя нога получила свой тон PANT_F — раньше она красилась в
    // PANT_D, то есть в тот же цвет, что и боковая тень ближней ноги, и на
    // тёмном фоне вообще не отделялась от него.
    const pant=shade?PANT_F:PANT_M;
    const edge=shade?null:PANT_L;                 // кромка только у ближней ноги
    const kn=jointEnd(hx+hipDX,hipY,thigh,10.5);
    limb(hx+hipDX,hipY,thigh,10.5,4.0,pant,PANT_D,edge);
    limb(kn.x,kn.y,thigh-knee,10.0,3.6,pant,PANT_D,edge);
    const ft=jointEnd(kn.x,kn.y,thigh-knee,10.0);
    c.save();c.translate(ft.x,ft.y);c.rotate((thigh-knee)*0.35+(ankle||0));
    // V84: ботинок был плоским чёрным прямоугольником поверх чёрных штанин.
    // Теперь у него есть корпус, светлая подошва, носок и кромка голенища —
    // ступня видна и в темноте, и на светлом полу.
    // V84: ботинок укорочен с 6.6 до 6.0 и сдвинут вперёд — раньше в стойке
    // левый и правый ботинок смыкались в одну широкую плиту.
    c.fillStyle=shade?BOOT_D:BOOT;c.fillRect(-2.0,0,6.0,1.8);
    c.fillStyle=shade?SOLE_D:SOLE;c.fillRect(-2.0,1.8,6.0,0.9);
    c.fillStyle=shade?'#232c3c':'#313c4e';c.fillRect(2.2,0.35,1.7,1.45);
    c.fillStyle='#0a0d14';c.fillRect(-2.0,0,6.0,0.55);
    c.restore();
    return ft;
  };
  const footB=drawLeg(-3.4,thighB,kneeB,true,ankB);
  const footF=drawLeg(3.4,thighF,kneeF,false,ankF);
  // пыль из-под ботинок при беге/ходьбе
  if(o.dust&&pose!=='sit'){
    // V77: пыль привязана к УРОВНЮ ПОЛА, а не к ступне: раньше облачко висело
    // в воздухе рядом с поднятой ногой и читалось как серый камешек.
    // Плотность снижена, частицы гаснут от первой к последней.
    const puff=(fx,k)=>{if(k<=0.06)return;c.save();c.fillStyle='#b8ac96';
      for(let i=0;i<5;i++){const a=i*1.31+t*3;c.globalAlpha=0.13*k*(1-i*0.16);
        c.beginPath();c.arc(fx+Math.cos(a)*3.2*k,24-Math.abs(Math.sin(a))*2.6*k,1.0+i*0.35,0,Math.PI*2);c.fill();}
      c.restore();};
    puff(footB.x,pufB!==null?pufB:Math.max(0,Math.sin(ph)) *(pose==='run'?1:0.45));
    puff(footF.x,pufF!==null?pufF:Math.max(0,-Math.sin(ph))*(pose==='run'?1:0.45));
  }
  // ================= РУКА ДАЛЬНЯЯ (за корпусом) =================
  const shoulderY=-13.5;
  const drawArm=(sx,sh,el,shade,hand)=>{
    c.save();c.translate(hipDX*0.85,lean*-2);c.rotate(tilt*0.6);
    const el0=jointEnd(sx,shoulderY,sh,9.0);
    // V88: noArms — руки формы не рисуются вовсе. Нужно в сцене надевания
    // костюма: там руку изображает уже сам рукав костюма, а красное предплечье
    // формы иначе торчит поверх меха и мелькает у самой маски.
    if(o.noArms){const hd0=jointEnd(el0.x,el0.y,sh+el,8.4);c.restore();if(hand)hand(hd0);return hd0;}
    limb(sx,shoulderY,sh,9.0,3.8,shade?SH_D:SH_M,SH_D);
    limb(el0.x,el0.y,sh+el,8.4,3.4,shade?SH_D:SH_M,SH_D);
    const hd=jointEnd(el0.x,el0.y,sh+el,8.4);
    // V76: кисть больше не «квадратик по осям» — она доворачивается вместе
    // с предплечьем, и у неё видны сжатые пальцы
    c.save();c.translate(hd.x,hd.y);c.rotate(sh+el);
    c.fillStyle=shade?SKIN_D:SKIN;c.fillRect(-1.7,-0.6,3.4,3.2);
    c.fillStyle=shade?'#8b6540':SKIN_D;c.fillRect(-1.7,1.7,3.4,0.9);
    c.restore();
    c.restore();
    if(hand)hand(hd);
    return hd;
  };
  const handB=drawArm(-6.4,shB,elB,true,null);
  // ================= КОРПУС =================
  c.save();
  c.translate(hipDX*0.85,0);
  c.rotate(-lean*0.30+tilt*0.6);
  const chest=1+breath*0.02;
  c.save();c.scale(1,chest);
  // рубашка охранника
  c.fillStyle=grad(-9,-16,9,2,SH_L,SH_D);c.fillRect(-8.6,-16,17.2,18);
  c.fillStyle=SH_H;c.fillRect(-8.6,-16,3.0,18);              // блик со стороны света
  c.fillStyle=SH_D;c.fillRect(5.8,-16,2.8,18);
  c.fillStyle='rgba(0,0,0,.22)';c.fillRect(-0.7,-16,1.4,18); // планка с пуговицами
  for(let i=0;i<4;i++){c.fillStyle='#f7d98a';c.fillRect(-0.4,-13+i*4.2,0.9,0.9);}
  // погоны и нашивка
  c.fillStyle='#e8d38f';c.fillRect(-8.2,-15.4,3.0,1.1);c.fillRect(5.4,-15.4,3.0,1.1);
  c.fillStyle='#20283a';c.fillRect(3.4,-12.6,3.6,2.6);
  c.fillStyle='#ffd23f';c.fillRect(4.0,-12.0,2.4,1.4);
  // ремень и рация
  c.fillStyle='#14181f';c.fillRect(-8.8,1.0,17.6,2.6);
  c.fillStyle='#3a424e';c.fillRect(-1.6,1.2,3.2,2.2);
  c.fillStyle='#222a34';c.fillRect(5.6,0.6,2.6,4.4);
  c.fillStyle='#7de08a';c.globalAlpha=0.5+0.5*Math.abs(Math.sin(t*2.2));c.fillRect(6.2,1.2,1.4,0.8);c.globalAlpha=1;
  // V84: СНАРЯЖЕНИЕ ОХРАННИКА. Было: рубашка, ремень и одна коробочка рации —
  // по фигуре нельзя было понять, что это человек на дежурстве.
  // Стало: наплечная рация с гибкой антенной и мигающим диодом, связка ключей
  // на ремне (качается по инерции шага), фонарь в чехле, нашивка на рукаве
  // и нагрудный бейдж с фотографией.
  // наплечная рация
  c.fillStyle='#1a212b';c.fillRect(4.6,-15.0,2.8,3.6);
  c.fillStyle='#2b3644';c.fillRect(4.9,-14.7,2.2,3.0);
  c.strokeStyle='#8f9aa3';c.lineWidth=0.32;
  c.beginPath();c.moveTo(6.0,-15.0);
  c.quadraticCurveTo(7.2+Math.sin(t*1.9)*0.5,-18.0,6.4+Math.sin(t*1.9)*0.8,-20.4);c.stroke();
  c.globalAlpha=0.45+0.55*Math.abs(Math.sin(t*1.7+1.2));c.fillStyle='#ff6a5c';c.fillRect(5.2,-14.2,0.9,0.7);c.globalAlpha=1;
  // витой провод гарнитуры к воротнику
  c.strokeStyle='rgba(20,26,34,.85)';c.lineWidth=0.30;c.beginPath();
  for(let i=0;i<7;i++){const yy=-14.0+i*0.62;c.moveTo(4.2+(i%2?0.35:-0.35),yy);c.lineTo(4.2+(i%2?-0.35:0.35),yy+0.62);}
  c.stroke();
  // связка ключей на ремне — качается по инерции
  const kSw=(pose==='run'?1.5:pose==='walk'?0.85:0.22)*Math.sin(ph*1.0-0.5)+breath*0.05;
  c.save();c.translate(-6.6,1.9);c.rotate(kSw*0.24);
  c.strokeStyle='#7c848c';c.lineWidth=0.28;c.beginPath();c.arc(0,0.7,0.62,0,Math.PI*2);c.stroke();
  c.fillStyle='#a9b0b7';c.fillRect(-0.7,1.2,0.42,1.5);c.fillRect(0.05,1.2,0.42,1.9);
  c.restore();
  // фонарь в чехле на ремне
  c.fillStyle='#191f27';c.fillRect(-4.4,1.2,1.7,2.9);
  c.fillStyle='#39434f';c.fillRect(-4.2,1.4,1.3,2.1);
  c.fillStyle='#c9c2ac';c.fillRect(-4.1,3.6,1.1,0.5);
  // нашивка на рукаве
  c.fillStyle='#1a2231';c.fillRect(-8.5,-13.6,2.2,1.7);
  c.fillStyle='#c9202e';c.fillRect(-8.3,-13.4,1.8,0.6);
  c.fillStyle='#e8d38f';c.fillRect(-8.3,-12.6,1.8,0.4);
  // нагрудный бейдж с фотографией
  c.fillStyle='#0f141b';c.fillRect(-7.4,-11.2,2.9,2.2);
  c.fillStyle='#cfd6dc';c.fillRect(-7.2,-11.0,1.1,1.8);
  c.fillStyle='#6b7480';c.fillRect(-7.0,-10.7,0.7,0.7);
  c.fillStyle='#8a929a';c.fillRect(-6.0,-10.9,1.2,0.35);c.fillRect(-6.0,-10.2,0.9,0.35);
  // подол куртки с инерцией
  const hem=(pose==='run'?2.6:pose==='walk'?1.1:0.35)*Math.sin(ph*1.0+0.8)+breath*0.2;
  c.fillStyle=SH_D;c.beginPath();c.moveTo(-8.6,1.4);c.lineTo(8.6,1.4);
  c.lineTo(8.6-hem,4.6);c.lineTo(-8.6-hem,4.6+hem*0.3);c.closePath();c.fill();
  c.restore();
  // ================= ГОЛОВА =================
  c.save();
  c.translate(0,-16.4);
  // V75: голова отстаёт от корпуса — при беге и ходьбе она чуть догоняет шаг
  c.rotate(headTurn*0.10+(pose==='run'?0.12:0)+breath*0.010-tilt*0.45+hpitch);
  c.translate(0,bob*0.12);
  const hx=headTurn*1.5;
  // шея
  c.fillStyle=SKIN_D;c.fillRect(-2.4,-1.6,4.8,2.6);
  // V78: под надетой маской костюма череп прятать целиком. Раньше при смехе
  // маска отклонялась вместе с корпусом, а голова оставалась на месте — и
  // из-за маски выглядывал бледный человеческий затылок.
  if(!o.noHead){
  // череп
  c.fillStyle=grad(-8,-14,8,0,SKIN_L,SKIN_D);c.fillRect(-7.4+hx*0.3,-13.6,14.8,13.6);
  c.fillStyle=SKIN_L;c.fillRect(-7.4+hx*0.3,-13.6,14.8,2.2);
  c.fillStyle='rgba(0,0,0,.16)';c.fillRect(-7.4+hx*0.3,-2.2,14.8,2.2);
  // V79: back — вид СО СПИНЫ. Раньше в кадрах, где он убегает от камеры в
  // глубину, персонаж всё равно рисовался профилем с лицом к зрителю: тело
  // «ехало» вглубь, а голова смотрела в зал. Теперь при движении от камеры
  // видно затылок — направление корпуса и взгляда совпадает с движением.
  if(o.back){
    c.fillStyle='#3b2a1e';c.fillRect(-7.4+hx*0.3,-13.6,14.8,9.0);          // затылок в волосах
    c.fillStyle='#4a3527';c.fillRect(-7.4+hx*0.3,-13.6,14.8,2.0);
    c.fillStyle='rgba(0,0,0,.22)';c.fillRect(-2.0+hx*0.3,-11.6,4.0,7.0);   // пробор
    c.fillStyle=SKIN_D;c.fillRect(-7.9+hx*0.3,-8.4,1.3,2.8);               // край уха
    c.fillStyle=SKIN_D;c.fillRect(6.6+hx*0.3,-8.4,1.3,2.8);
    c.fillStyle='rgba(0,0,0,.10)';c.fillRect(-7.4+hx*0.3,-4.6,14.8,4.6);
  }else{
  // ухо
  c.fillStyle=SKIN_D;c.fillRect(-7.9+hx*0.3,-8.2,1.4,3.0);
  // глаза (с моргáнием) + брови
  const eyY=-8.6, eyO=hx*1.1;
  c.fillStyle='#1b1418';
  if(blink){c.fillRect(-5.0+eyO,eyY+1.0,3.4,0.9);c.fillRect(1.6+eyO,eyY+1.0,3.4,0.9);}
  else{
    c.fillStyle='#efe6dc';c.fillRect(-5.0+eyO,eyY,3.4,2.2);c.fillRect(1.6+eyO,eyY,3.4,2.2);
    const pupil=Math.max(-0.9,Math.min(0.9,headTurn*1.4));
    c.fillStyle='#20303c';c.fillRect(-4.0+eyO+pupil,eyY+0.5,1.6,1.6);c.fillRect(2.6+eyO+pupil,eyY+0.5,1.6,1.6);
  }
  c.fillStyle='#7b5a3c';c.fillRect(-5.2+eyO,eyY-1.7,3.8,0.9);c.fillRect(1.4+eyO,eyY-1.7,3.8,0.9);
  // нос и рот (открывается при беге — тяжело дышит)
  c.fillStyle=SKIN_D;c.fillRect(-0.8+eyO,eyY+2.3,1.8,2.4);
  const mouthH=pose==='run'?(1.0+0.9*Math.abs(Math.sin(t*7))):(0.7+0.25*Math.abs(Math.sin(t*1.4)));
  c.fillStyle='#6d3a34';c.fillRect(-2.2+eyO,-3.4,4.4,mouthH);
  // щетина
  c.fillStyle='rgba(40,30,26,.20)';c.fillRect(-5.6+eyO,-4.6,11.2,4.0);
  }
  // V84: гарнитура в ухе — маленькая деталь, но фигура сразу читается как
  // человек на связи, а не просто силуэт в рубашке.
  if(!o.noMask&&!(o.mask>0)){
    c.fillStyle='#12181f';c.fillRect(5.1,-5.4,1.1,1.4);
    c.globalAlpha=0.35+0.45*Math.abs(Math.sin(t*2.6+0.7));c.fillStyle='#7de08a';c.fillRect(5.35,-5.05,0.45,0.4);c.globalAlpha=1;
  }
  // V84: пар от дыхания в холодном воздухе — атмосфера ночной смены.
  if(o.cold){
    const bp=(t*0.55+seed)%1;
    c.globalAlpha=Math.max(0,0.22*(1-bp));
    c.fillStyle='#dfe8f2';
    c.beginPath();c.ellipse(4.4+bp*4.0,-3.2-bp*1.6,1.1+bp*2.2,0.7+bp*1.4,0,0,Math.PI*2);c.fill();
    c.globalAlpha=1;
  }
  // фуражка с козырьком и красной полосой (V74: под маской костюма её не видно)
  if(!o.noCap){
  c.fillStyle=grad(-9,-20,9,-13,CAP_L,CAP_D);c.fillRect(-8.0,-19.4,16.0,6.4);
  c.fillStyle=CAP_M;c.fillRect(-8.0,-19.4,16.0,1.5);
  c.fillStyle='#c9202e';c.fillRect(-8.0,-14.3,16.0,1.5);
  if(o.back){
    // со спины козырёк торчит вперёд, от зрителя — виден только его край
    c.fillStyle='#0e131c';c.fillRect(-8.4,-13.4,16.8,1.4);
  }else{
  c.fillStyle='#0e131c';c.fillRect(-9.4+hx*0.4,-13.2,18.8,1.7);   // козырёк
  // Надпись на фуражке: при face=-1 весь персонаж отражён, поэтому текст
  // разворачиваем обратно — иначе «NS» читалось зеркально.
  c.save();c.translate(hx*0.3,-15.2);c.scale(face,1);
  c.fillStyle='#ffd23f';c.font='800 4.6px "Inter",Arial,sans-serif';c.textAlign='center';
  c.fillText('NS',0,0);c.textAlign='left';c.restore();
  }
  }
  }
  c.restore();
  c.restore(); // конец корпуса
  // ================= РУКА БЛИЖНЯЯ (перед корпусом) + реквизит =================
  const handF=drawArm(6.4,shF,elF,false,(hd)=>{
    if(o.prop==='canister'){
      // V95: Было — просто красный прямоугольник с боковой надписью «95»: в руке он
      // читался как чемодан, горловины не было, а на поливе канистра крутилась
      // носиком ВВЕРХ-ВЛЕВО, то есть бензин физически не мог литься.
      // Стало — канистра с ручкой, ребром и горловиной, наклон положительный —
      // носик смотрит вниз-вперёд, и струя идёт из носика до пола.
      const pouring=pose==='pour';
      const ang=(pouring?1.90:0.06)+Math.sin(t*1.5)*0.03+(pouring?Math.sin(t*3.1+seed)*0.025:0);
      // кисть рисуем ДО канистры: она держит ручку сзади, иначе пятно кожи
      // ложится поверх корпуса и закрывает надпись
      c.fillStyle='#c39a76';
      c.beginPath();c.ellipse(hd.x-0.6,hd.y-0.2,1.7,1.3,0,0,Math.PI*2);c.fill();
      c.save();c.translate(hd.x-0.2,hd.y+1.8);c.rotate(ang);
      c.fillStyle='#8e2f16';c.fillRect(-3.4,-4.6,7.4,9.2);
      c.fillStyle='#b34620';c.fillRect(-3.4,-4.6,2.2,9.2);      // светлая грань
      c.fillStyle='#5d1d0c';c.fillRect(-3.4,2.0,7.4,2.6);       // тёмный низ
      c.fillStyle='#7a230f';c.fillRect(-3.4,-1.3,7.4,0.8);      // ребро жёсткости
      c.fillStyle='#3a1508';c.fillRect(-2.2,-6.0,4.8,1.5);      // ручка
      c.fillStyle='#2a2a2a';c.fillRect(1.3,-6.2,2.0,1.9);       // горловина
      c.fillStyle='#3d3d3d';c.fillRect(2.5,-7.6,1.4,1.7);       // носик
      // надпись всегда стоит ровно и не зеркалится
      c.save();c.rotate(-ang);c.scale(face,1);
      c.fillStyle='#e2dac8';c.font='800 3px "Inter",Arial,sans-serif';
      c.textAlign='center';c.fillText('95',0,0.8);c.textAlign='left';c.restore();
      c.restore();
      // костяшки пальцев поверх верхнего ребра ручки
      c.fillStyle='#b98d69';
      c.beginPath();c.ellipse(hd.x-0.1,hd.y-0.9,1.0,0.7,0,0,Math.PI*2);c.fill();
      if(pouring){
        // струя из носика: точка выхода — конец горловины, повёрнутый на ang;
        // пол лежит на +26.6 ед. от кисти в этой стойке
        const pk=Math.max(0,Math.min(1,o.pourK===undefined?1:o.pourK));
        const ca=Math.cos(ang),sa=Math.sin(ang);
        const sx0=hd.x-0.2+(3.2*ca-(-6.9)*sa), sy0=hd.y+1.8+(3.2*sa+(-6.9)*ca);
        const gy=hd.y+26.6;
        if(gy>sy0+2){
          c.save();c.globalAlpha=Math.min(1,pk*3);
          c.strokeStyle='rgba(198,208,186,.40)';c.lineWidth=1.3;
          c.beginPath();c.moveTo(sx0,sy0);
          c.quadraticCurveTo(sx0+0.7,(sy0+gy)*0.5,sx0+1.4+Math.sin(t*9)*0.7,gy);c.stroke();
          for(let i=0;i<6;i++){const dp=((t*1.7+i*0.17)%1);
            c.fillStyle='rgba(206,214,198,'+(0.36*(1-dp)).toFixed(3)+')';
            c.beginPath();c.arc(sx0+0.8+Math.sin(t*9+i)*0.9,sy0+(gy-sy0)*dp,0.55,0,Math.PI*2);c.fill();}
          c.fillStyle='rgba(198,208,186,.26)';
          c.beginPath();c.ellipse(sx0+1.4,gy,3.0+1.5*Math.abs(Math.sin(t*7)),0.9,0,0,Math.PI*2);c.fill();
          c.restore();
        }
      }
    } else if(o.prop==='match'){
      // спичка: искра, затем пламя, подсвечивающее лицо
      const k=Math.max(0,Math.min(1,o.matchLit||0));
      c.save();c.translate(hd.x+0.8,hd.y-0.4);
      c.fillStyle='#c9a06a';c.fillRect(0,-3.2,0.8,3.4);
      if(k>0){
        c.save();c.globalCompositeOperation='lighter';
        const fg=c.createRadialGradient(0.4,-3.6,0.2,0.4,-3.6,9*k);
        fg.addColorStop(0,'rgba(255,246,200,'+(0.95*k)+')');
        fg.addColorStop(0.35,'rgba(255,168,52,'+(0.55*k)+')');
        fg.addColorStop(1,'rgba(200,60,10,0)');
        c.fillStyle=fg;c.beginPath();c.arc(0.4,-3.6,9*k,0,Math.PI*2);c.fill();
        c.fillStyle='rgba(255,238,180,'+(0.95*k)+')';
        c.beginPath();c.moveTo(0.4,-3.4);
        c.quadraticCurveTo(1.6+Math.sin(t*17)*0.5,-5.4,0.4,-7.2-Math.sin(t*13)*0.6);
        c.quadraticCurveTo(-0.8+Math.sin(t*15)*0.5,-5.4,0.4,-3.4);c.closePath();c.fill();
        c.restore();
      }
      c.restore();
    } else if(o.prop==='flashlight'){
      c.save();c.translate(hd.x+1.0,hd.y+0.8);c.rotate(-0.25);
      c.fillStyle='#2b3138';c.fillRect(-1.2,-1.2,5.4,2.4);
      c.fillStyle='#cfd6dc';c.fillRect(4.0,-1.6,1.4,3.2);
      c.restore();
    } else if(o.prop==='tape'){
      // V95: видеокассета в кисти. Размер взят от фигуры (в её единицах),
      // поэтому она растёт и поворачивается вместе с ней, а не живёт своей жизнью.
      const aF=shF+elF;                                  // угол предплечья
      const blow=Math.max(0,Math.min(1,o.tapeBlow||0));  // он сдувает пыль
      const tkA=(o.tapeK===undefined?1:Math.max(0,Math.min(1,o.tapeK)));
      c.save();c.globalAlpha=Math.min(1,tkA*1.6);
      // центр кассеты смещён по оси предплечья — она лежит В ладони
      // Кассета лежит в ладони ПЛАШМЯ к зрителю: жёсткая привязка поворота к
      // предплечью ставила её торцом вверх — кисть компенсирует угол руки.
      c.translate(hd.x+1.3,hd.y+0.4);
      c.rotate(-0.14+(aF+Math.PI/2)*0.26-blow*0.14+Math.sin(t*1.1+seed)*0.02);
      const TW=8.4,TH=5.1;                               // корпус кассеты
      c.fillStyle='rgba(0,0,0,.38)';c.fillRect(-TW/2-0.3,-TH/2+0.5,TW+0.6,TH);
      c.fillStyle='#0e141a';c.fillRect(-TW/2,-TH/2,TW,TH);
      c.fillStyle='#2f3d49';c.fillRect(-TW/2+0.35,-TH/2+0.35,TW-0.7,TH-0.7);
      c.fillStyle='#48596a';c.fillRect(-TW/2+0.35,TH/2-0.90,TW-0.7,0.45); // блик по нижнему ребру
      c.fillStyle='#0a1015';c.fillRect(-TW*0.30,-TH*0.16,TW*0.60,TH*0.42);
      c.fillStyle='#c9d2d8';
      c.beginPath();c.arc(-TW*0.16,TH*0.05,TH*0.13,0,Math.PI*2);c.fill();
      c.beginPath();c.arc(TW*0.16,TH*0.05,TH*0.13,0,Math.PI*2);c.fill();
      c.fillStyle='#e6dcc0';c.fillRect(-TW/2+0.4,-TH/2+0.4,TW-0.8,TH*0.34); // этикетка
      c.fillStyle='rgba(60,44,30,.55)';c.fillRect(-TW/2+0.7,-TH/2+0.8,TW-1.4,0.22);
      c.save();c.scale(face,1);
      c.fillStyle='#2b2118';c.font='700 1.5px "JetBrains Mono",monospace';c.textAlign='center';
      c.fillText('93',0,-TH/2+1.55);c.textAlign='left';c.restore();
      // пальцы ПОВЕРХ нижнего края и большой палец по фасаду — без них
      // кассета читалась просто приложенной к руке
      c.fillStyle=SKIN_D;c.fillRect(-TW*0.46,TH*0.30,TW*0.52,TH*0.30);
      c.fillStyle=SKIN;
      for(let fi=0;fi<4;fi++)c.fillRect(-TW*0.44+fi*TW*0.13,TH*0.30,TW*0.09,TH*0.28);
      c.fillStyle=SKIN;c.fillRect(-TW*0.50,-TH*0.16,TW*0.16,TH*0.44); // большой палец
      c.fillStyle='rgba(0,0,0,.18)';c.fillRect(-TW*0.50,-TH*0.16,TW*0.16,TH*0.06);
      c.restore();
      // облачко пыли с этикетки — рисуется здесь же, поэтому летит ИМЕННО от кассеты
      if(blow>0.01){
        const pf=Math.sin(blow*Math.PI);
        c.save();c.translate(hd.x-Math.sin(aF)*1.7,hd.y+Math.cos(aF)*1.7);
        for(let i=0;i<14;i++){
          const sp=pf*(0.35+((i*37%100)/100)*0.65);
          c.fillStyle='rgba(206,196,170,'+(0.34*pf*(1-sp)).toFixed(3)+')';
          c.fillRect(2.0+sp*9.0,-1.2-sp*(2.0+((i*53%100)/100)*4.0),0.7,0.7);
        }
        c.restore();
      }
    }
  });
  // ================= V101: КРОВЬ И РАНЫ =================
  // ПОЧЕМУ ЭТО ПОНАДОБИЛОСЬ. В концовках «Пепел» и «Ещё один костюм» героя
  // перед побегом успевают задеть аниматроники, и это нужно ВИДЕТЬ. Раньше
  // рисовать раны было нечем: любая кровь легла бы поверх фигуры в координатах
  // сцены и «поехала» бы при шаге и наклоне. Здесь она живёт в юнит-системе
  // самого персонажа, поэтому едет вместе с корпусом.
  // Слои: рассечение на виске, три борозды от когтей на груди, пятно на рукаве,
  // потёк по бедру и капли, которые срываются на пол по своему циклу.
  {
    const bl=Math.max(0,Math.min(1,o.blood||0));
    if(bl>0){
      // V101: цвета подобраны ПОД КРАСНУЮ КУРТКУ. Первый вариант (122,10,14)
      // почти совпадал с тканью — раны на груди пропадали. Теперь тёмная почти
      // чёрная основа даёт контраст на красном, яркая кромка — свежесть крови,
      // а узкий светлый блик показывает, что кровь мокрая.
      const BR='rgba(38,3,6,', BR2='rgba(196,26,24,', BRW='rgba(255,138,124,';
      c.save();
      // рассечение на виске и потёк по щеке
      c.fillStyle=BR2+(0.80*bl).toFixed(3)+')';
      c.fillRect(3.2,-25.8,1.8,0.9);
      c.fillStyle=BR+(0.72*bl).toFixed(3)+')';
      c.fillRect(3.9,-25.0,0.9,2.2+3.4*bl);
      c.fillRect(3.0,-22.4,2.4,0.8*bl);
      // три борозды от когтей по груди: наискось, разной длины
      for(let i=0;i<3;i++){
        const y0=-13.6+i*2.9, len=8.6-i*1.3;
        c.save();c.translate(-3.8+i*0.6,y0);c.rotate(0.34);
        // порванная ткань: тёмный разрыв, под ним кровь, сверху мокрый блик
        // V101: борозда СУЖАЕТСЯ к концу — коготь входит глубоко и выходит вскользь.
        // Толстые прямые полосы читались как красные палки, приклеенные к куртке.
        const seg=8;
        for(let j=0;j<seg;j++){
          const u=j/seg, th=1.15*(1-u*0.72), xx=len*u;
          c.fillStyle=BR+(0.90*bl).toFixed(3)+')';
          c.fillRect(xx,-th*0.5,len/seg+0.12,th);
          if(u<0.62){
            c.fillStyle=BR2+(0.80*bl).toFixed(3)+')';
            c.fillRect(xx,-th*0.18,len/seg+0.10,th*0.42);
          }
        }
        c.fillStyle=BRW+(0.22*bl).toFixed(3)+')';c.fillRect(0.4,-0.30,len*0.42,0.20);
        c.restore();
      }
      // натёк из-под борозд вниз по куртке — тяжёлое тёмное пятно
      const st=c.createLinearGradient(0,-9.0,0,5.0);
      st.addColorStop(0,BR+(0.85*bl).toFixed(3)+')');
      st.addColorStop(0.55,BR+(0.45*bl).toFixed(3)+')');
      st.addColorStop(1,BR+'0)');
      c.fillStyle=st;c.fillRect(-4.8,-9.0,8.8,14.0);
      // два узких потёка вниз по груди — по ним видно направление
      c.fillStyle=BR+(0.80*bl).toFixed(3)+')';
      c.fillRect(-2.2,-8.0,0.85,7.0+4.0*bl);
      c.fillRect(1.4,-6.4,0.70,6.0+4.6*bl);
      // пятно на рукаве и потёк по бедру
      c.fillStyle=BR+(0.55*bl).toFixed(3)+')';
      c.fillRect(6.4,-9.6,2.4,4.6);
      c.fillRect(1.6,7.2,2.0,5.4*bl);
      c.fillRect(-5.0,9.8,1.6,3.2*bl);
      // капли: у каждой свой цикл падения, поэтому они не идут строем
      if(bl>0.25&&!document.body.classList.contains('low-end')){
        for(let i=0;i<5;i++){
          const r=epiRnd(i*5.7+seed), per=1.15+r*0.9;
          const k=((t*0.85+r*3.1)%per)/per;
          const dx0=[-4.2,1.8,5.6,-1.2,3.2][i];
          const y0=[4.2,6.4,-4.0,10.0,1.2][i];
          c.fillStyle=BR2+(0.70*bl*(1-k*0.7)).toFixed(3)+')';
          c.fillRect(dx0,y0+k*(20-y0*0.5),0.8,1.6+k*1.8);
        }
        // лужица под ботинками
        c.fillStyle=BR+(0.30*bl).toFixed(3)+')';
        c.beginPath();c.ellipse(0,26.6,5.2*bl,1.3*bl,0,0,Math.PI*2);c.fill();
      }
      c.restore();
    }
  }
  // ================= КОНТРОВОЙ СВЕТ (например, от пожара) =================
  if(rim&&rim.power>0){
    // Раньше контровой свет заливался одним прямоугольником 20x46 в режиме 'lighter' —
    // на тёмном фоне он читался как светлая плита рядом с персонажем. Теперь это
    // узкие полосы по освещённому краю фуражки, корпуса и ноги.
    const dir=rim.dir||1, col=rim.col||'255,150,60';
    c.save();c.globalCompositeOperation='lighter';
    const band=(x0,y0,ww,hh,a)=>{
      c.globalAlpha=Math.min(0.9,rim.power)*a;
      const g=c.createLinearGradient(dir>0?x0+ww:x0,0,dir>0?x0:x0+ww,0);
      g.addColorStop(0,'rgba('+col+',.95)');g.addColorStop(1,'rgba('+col+',0)');
      c.fillStyle=g;c.fillRect(x0,y0,ww,hh);
    };
    band(dir>0?5.2:-8.4,-35.4,3.2,7.0,0.85);   // фуражка
    band(dir>0?4.8:-7.6,-28.6,2.8,11.0,0.95);  // голова и шея
    band(dir>0?6.2:-8.8,-16.2,2.6,18.4,1.0);   // корпус
    band(dir>0?3.4:-5.0,1.4,2.0,13.0,0.7);     // нога
    c.restore();
  }
  // ================= ЗАТЕМНЕНИЕ ДО СИЛУЭТА =================
  if(dark>0){
    // V74: раньше накрывался только корпус — голова и фуражка оставались
    // яркими и выбивались из тёмной сцены. Теперь силуэт целиком.
    // V85: был один прямоугольник 23x63 на всю габаритную рамку — на светлом
    // фоне (рассвет, пожар) он читался как тёмная плита за спиной фигуры.
    // Теперь затемнение кладётся по частям тела.
    c.save();c.globalAlpha=dark*0.94;c.fillStyle='#05060a';
    [[-8.6,-36.2,17.2,7.6],   // фуражка
     [-6.6,-28.8,13.2,12.2],  // голова и шея
     [-9.0,-16.8,18.0,19.4],  // корпус
     [-11.0,-15.2,2.4,17.4],  // дальняя рука
     [8.6,-15.2,2.4,17.4],    // ближняя рука
     [-9.2,2.0,18.4,4.2],     // ремень и бёдра
     [-6.8,5.8,5.6,19.0],     // нога
     [1.2,5.8,5.6,19.0],      // нога
     [-7.6,24.2,6.8,2.8],     // ботинок
     [0.8,24.2,6.8,2.8]       // ботинок
    ].forEach(r=>c.fillRect(r[0],r[1],r[2],r[3]));
    c.restore();
  }
  c.restore();
}
// ---------------------------------------------------------------------------
// ОГОНЬ, ИСКРЫ, ДЫМ — процедурные, для концовки с пожаром.
// ---------------------------------------------------------------------------
function epiRnd(n){const v=Math.sin(n*127.1+Math.floor(n)*0.7913)*43758.5453;return v-Math.floor(v);}
function drawFlames(c,x,y,w,h,t,inten,seed){
  if(inten<=0)return;
  const low=document.body.classList.contains('low-end');
  c.save();c.globalCompositeOperation='lighter';
  // Языки пламени узкие и частые — иначе получаются не огонь, а световые пятна.
  // V95: было — редкие широкие языки (шаг 20 px, ширина до 22 px), и огонь
  // читался как ряд плоских жёлтых листьев, наклеенных на стену.
  // Стало — вдвое плотнее и вдвое уже, каждый язык загибается по ветру, а под
  // ними лежит общее марево жара, поэтому пламя выглядит объёмной массой.
  const step=low?34:12;
  const tongues=Math.max(3,Math.min(low?18:72,Math.round(w/step)));
  // общее марево жара над очагом — связывает языки в одну массу
  // важно: марево рисуем радиальным градиентом через сжатие по Y, а не
  // вертикальным по прямоугольнику — иначе по краям видны светлые границы бокса.
  const hzH=Math.max(8,h*inten*0.85), hzR=Math.max(24,w*0.60);
  c.save();
  c.translate(x+w*0.5,y-hzH*0.20);
  c.scale(1,Math.max(0.10,hzH/hzR));
  const hz=c.createRadialGradient(0,0,hzR*0.06,0,0,hzR);
  hz.addColorStop(0,'rgba(255,158,58,'+(0.22*inten).toFixed(3)+')');
  hz.addColorStop(0.48,'rgba(240,104,28,'+(0.09*inten).toFixed(3)+')');
  hz.addColorStop(1,'rgba(190,60,14,0)');
  c.fillStyle=hz;c.beginPath();c.arc(0,0,hzR,0,Math.PI*2);c.fill();
  c.restore();
  for(let i=0;i<tongues;i++){
    const r1=epiRnd(seed+i*3.7), r2=epiRnd(seed+i*9.1), r3=epiRnd(seed+i*17.3);
    const fx=x+w*((i+0.5)/tongues)+ (r1-0.5)*step*0.9;
    const speed=3.2+r2*3.4;
    const flick=0.62+0.38*Math.sin(t*speed+i*2.1)+0.14*Math.sin(t*speed*2.7+i);
    const fh=h*inten*(0.16+0.52*r2)*Math.max(0.22,flick);
    const fw=(4.6+8.4*r3)*(0.78+0.42*inten);
    const lean=Math.sin(t*(0.9+r1*1.4)+i*0.7)*fw*1.7;   // загиб по ветру
    const g=c.createLinearGradient(fx,y,fx,y-fh);
    g.addColorStop(0,'rgba(255,248,222,'+(0.72*inten).toFixed(3)+')');
    g.addColorStop(0.18,'rgba(255,206,96,'+(0.62*inten).toFixed(3)+')');
    g.addColorStop(0.52,'rgba(232,102,26,'+(0.38*inten).toFixed(3)+')');
    g.addColorStop(1,'rgba(120,20,6,0)');
    c.fillStyle=g;
    const tipX=fx+lean+Math.sin(t*speed*0.8+i*1.3)*fw*0.9;
    c.beginPath();c.moveTo(fx-fw,y);
    c.quadraticCurveTo(fx-fw*0.85+Math.sin(t*speed*1.3+i)*fw*0.5,y-fh*0.52,tipX,y-fh);
    c.quadraticCurveTo(fx+fw*0.85+Math.cos(t*speed*1.1+i)*fw*0.5,y-fh*0.50,fx+fw,y);
    c.closePath();c.fill();
    // раскалённое ядро языка
    c.fillStyle='rgba(255,240,190,'+(0.30*inten).toFixed(3)+')';
    c.beginPath();c.moveTo(fx-fw*0.36,y);
    c.quadraticCurveTo(fx-fw*0.2,y-fh*0.34,fx+(tipX-fx)*0.4,y-fh*0.52);
    c.quadraticCurveTo(fx+fw*0.25,y-fh*0.32,fx+fw*0.36,y);
    c.closePath();c.fill();
  }
  // раскалённое основание — тонкая полоса угольного жара
  const base=c.createLinearGradient(0,y-14*inten,0,y+4);
  base.addColorStop(0,'rgba(255,168,54,'+(0.26*inten).toFixed(3)+')');
  base.addColorStop(1,'rgba(255,80,16,0)');
  c.fillStyle=base;c.fillRect(x,y-14*inten,w,18);
  c.restore();
}
function drawEmbers(c,x,y,w,h,t,n,inten){
  if(inten<=0)return;
  c.save();c.globalCompositeOperation='lighter';
  for(let i=0;i<n;i++){
    const r=epiRnd(i*5.3), r2=epiRnd(i*11.7);
    const life=((t*(0.16+r*0.24)+r2)%1);
    const ex=x+w*r+Math.sin(t*(0.8+r2)+i)*w*0.06;
    const ey=y-h*life;
    const a=(1-life)*inten*(0.35+0.65*r2);
    c.fillStyle='rgba(255,'+(140+Math.floor(90*r)).toString()+',60,'+a.toFixed(3)+')';
    c.beginPath();c.arc(ex,ey,0.9+r*1.9,0,Math.PI*2);c.fill();
  }
  c.restore();
}
function drawSmokeColumn(c,x,y,w,h,t,alpha){
  // V97: клубы рисовались плоской заливкой rgba(38,34,32,a) — у каждого овала
  // был резкий край, и на светлом небе (кода «Пепел») ряд из семи столбов
  // читался как крупный «горошек» с обводкой. Теперь каждый клуб — радиальный
  // градиент с нулём по краю, вытянутый по вертикали, и клубы к верху столба
  // светлеют, как настоящий дым, разбавленный воздухом.
  c.save();
  for(let i=0;i<16;i++){
    const r=epiRnd(i*3.1), r2=epiRnd(i*7.9);
    const life=((t*(0.06+r*0.06)+r2)%1);
    const sy=y-h*life, sw=w*(0.20+life*1.05), sa=alpha*(1-life)*(0.40+0.5*r2);
    const sx=x+Math.sin(life*3.4+i)*w*0.35;
    const lum=Math.round(38+58*life), lum2=Math.round(34+56*life), lum3=Math.round(32+54*life);
    const g=c.createRadialGradient(sx,sy,0,sx,sy,sw);
    g.addColorStop(0,'rgba('+lum+','+lum2+','+lum3+','+sa.toFixed(3)+')');
    g.addColorStop(0.55,'rgba('+lum+','+lum2+','+lum3+','+(sa*0.55).toFixed(3)+')');
    g.addColorStop(1,'rgba('+lum+','+lum2+','+lum3+',0)');
    c.fillStyle=g;
    c.beginPath();c.ellipse(sx,sy,sw,sw*0.78,0,0,Math.PI*2);c.fill();
  }
  c.restore();
}
// ---------------------------------------------------------------------------
// ОБЩАЯ КИНЕМАТОГРАФИЧЕСКАЯ ОБВЯЗКА: титры, шторки, зерно, грейд, таймкод.
// ---------------------------------------------------------------------------
function epiCard(c,w,h,t,at,dur,title,sub,col,yoff){
  const k=(t-at)/dur;if(k<0||k>1)return;
  const a=Math.min(1,k*5)*Math.min(1,(1-k)*5);
  // V96: yoff позволяет сдвинуть титр по вертикали. В концовке «Ловушка»
  // фигура в костюме стоит ровно в центре кадра, и заголовок закрывал ей
  // лицо — единственное, что там важно. Теперь этот титр уходит ниже, на
  // пустой пол зала.
  const oy=yoff||0;
  c.save();c.globalAlpha=a;
  // V95: было — титр без подложки, и на светлых финалах («Рассвет»: утреннее
  // небо и бетон) подзаголовок сливался с фоном до нечитаемости.
  // Стало — мягкая тёмная лента под текстом и тень у обеих строк.
  const bandY=h*0.415+oy, bandH=h*0.215;
  const bnd=c.createLinearGradient(0,bandY,0,bandY+bandH);
  bnd.addColorStop(0,'rgba(6,8,10,0)');bnd.addColorStop(.40,'rgba(6,8,10,.60)');
  bnd.addColorStop(.74,'rgba(6,8,10,.54)');bnd.addColorStop(1,'rgba(6,8,10,0)');
  c.fillStyle=bnd;c.fillRect(0,bandY,w,bandH);
  c.textAlign='center';
  c.font='700 '+Math.round(h*0.055)+'px "Oswald",Impact,sans-serif';
  c.fillStyle='rgba(0,0,0,.62)';c.fillText(title,w*0.5+2,h*0.50+2+oy);
  c.fillStyle=col||'#f2ece0';c.fillText(title,w*0.5,h*0.50+oy);
  if(sub){c.font='600 '+Math.round(h*0.022)+'px "JetBrains Mono",monospace';
    c.fillStyle='rgba(0,0,0,.62)';c.fillText(sub,w*0.5+1.4,h*0.565+1.4+oy);
    c.fillStyle='rgba(232,228,218,.96)';c.fillText(sub,w*0.5,h*0.565+oy);}
  c.textAlign='left';c.restore();
}
// ==== V85: в концовках БОЛЬШЕ НЕТ СУБТИТРОВ. Раньше поверх финала шла строка
// текста и объясняла то, что и так видно — это ломало кадр и звучало философски-пусто.
// Вместо текста та же точка времени теперь даёт АТМОСФЕРНЫЙ АКЦЕНТ: дыхание света,
// лёгкое сгущение тени по краям и микродрожание плёнки. Аргумент line сохранён,
// чтобы не править десятки вызовов в пяти финалах, но нигде не рисуется.
function epiSub(c,w,h,t,at,dur,line){
  const k=(t-at)/dur;if(k<0||k>1)return;
  const a=Math.min(1,k*6)*Math.min(1,(1-k)*6);
  // пульс характера — свет слегка «вдыхает» именно на смысловом бите
  const breath=Math.sin(Math.min(1,Math.max(0,k))*Math.PI);
  c.save();
  const vg=c.createRadialGradient(w*0.5,h*0.52,w*0.06,w*0.5,h*0.54,w*0.78);
  vg.addColorStop(0,'rgba(255,246,226,'+(0.030*a*breath).toFixed(4)+')');
  vg.addColorStop(0.55,'rgba(255,246,226,0)');
  vg.addColorStop(1,'rgba(0,0,0,'+(0.16*a*breath).toFixed(4)+')');
  c.fillStyle=vg;c.fillRect(0,0,w,h);
  // микродрожание плёнки — кадр живой, а не стоячий
  c.globalAlpha=0.05*a*breath;
  c.fillStyle='#000';
  const jit=Math.round(Math.sin(t*37.1)*1.5);
  c.fillRect(0,h*0.5+jit,w,1);
  c.restore();
}
function epiGrade(c,w,h,t,low,warm,vig,grainK){
  // V101: ПОЧЕМУ ТАК БЫЛО. Грейд рисовался тем режимом наложения, который
  // остался от предыдущего слоя сцены. Если сцена закончилась на 'lighter'
  // (искры, вспышки, свет лампы), то виньетка и тёплый фильтр не затемняли
  // кадр, а СКЛАДЫВАЛИСЬ с ним: по краям появлялась серая засветка, и вид из
  // костюма в концовке «ловушка» выходил молочно-серым вместо чёрного.
  // СТАЛО: грейд всегда работает в обычном режиме и с полной непрозрачностью.
  c.save();
  c.globalCompositeOperation='source-over';c.globalAlpha=1;
  // цветокоррекция + виньетка + плёночное зерно
  if(warm){c.save();c.fillStyle=warm;c.fillRect(0,0,w,h);c.restore();}
  const vg=c.createRadialGradient(w*.5,h*.50,w*.12,w*.5,h*.52,w*.86);
  vg.addColorStop(0,'rgba(255,255,255,0)');vg.addColorStop(1,'rgba(4,6,8,'+vig.toFixed(3)+')');
  c.fillStyle=vg;c.fillRect(0,0,w,h);
  if(!low){
    const fr=Math.floor(t*24);
    for(let i=0;i<Math.round(200*grainK);i++){
      const gx=epiRnd(i*3.7+fr)*w, gy=epiRnd(i*7.3+fr*1.7)*h, a3=epiRnd(i*11.9+fr*2.3);
      c.fillStyle=a3>.5?'rgba(255,255,255,'+(0.018+0.028*a3).toFixed(3)+')':'rgba(0,0,0,'+(0.020+0.040*a3).toFixed(3)+')';
      c.fillRect(gx,gy,1.4,1.4);
    }
    c.fillStyle='rgba(255,255,255,.014)';for(let y2=0;y2<h;y2+=5)c.fillRect(0,y2,w,1);
  }
  c.restore();
}
function epiBars(c,w,h,k){
  // V89: было — полосы всегда h*0.062. На телефоне в ландшафте (2.2:1 и шире)
  // кадр по высоте очень низкий, линия пола лежит близко к нижней кромке —
  // и нижняя полоса срезала охраннику ступни во всех концовках.
  // стало — на широких экранах полосы тоньше, ступни всегда в кадре.
  const ar=w/Math.max(1,h);
  let bk=0.062;
  if(ar>1.95)bk=0.062-Math.min(0.026,(ar-1.95)*0.095);
  const bar=h*bk*(k===undefined?1:k);if(bar<=0.5)return;
  c.save();c.fillStyle='#000';c.fillRect(0,0,w,bar);c.fillRect(0,h-bar,w,bar);
  const t1=c.createLinearGradient(0,bar,0,bar+14);t1.addColorStop(0,'rgba(0,0,0,.55)');t1.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=t1;c.fillRect(0,bar,w,14);
  const t2=c.createLinearGradient(0,h-bar,0,h-bar-14);t2.addColorStop(0,'rgba(0,0,0,.55)');t2.addColorStop(1,'rgba(0,0,0,0)');
  c.fillStyle=t2;c.fillRect(0,h-bar-14,w,14);
  c.restore();
}
function epiTimecode(c,w,h,label,alpha){
  c.save();c.globalAlpha=alpha===undefined?0.5:alpha;
  c.font='600 '+Math.round(h*0.019)+'px "JetBrains Mono",monospace';
  // V89: было — светлый текст без тени терялся на светлом небе в концовке «УТРО».
  c.shadowColor='rgba(0,0,0,.75)';c.shadowBlur=Math.round(h*0.012);
  c.fillStyle='#d8d2c4';c.fillText(label,w*0.055,h*0.115);
  c.restore();
}
function epiSkipHint(c,w,h,t){
  if(t<1.2)return;
  c.save();c.globalAlpha=0.30+0.12*Math.sin(t*2);
  c.font='600 '+Math.round(h*0.017)+'px "JetBrains Mono",monospace';
  c.textAlign='right';c.fillStyle='#cfc9bb';
  c.shadowColor='rgba(0,0,0,.75)';c.shadowBlur=Math.round(h*0.012);
  c.fillText('ПРОБЕЛ — ПРОПУСТИТЬ',w*0.945,h*0.115);
  c.textAlign='left';c.restore();
}
// звуковые акценты финала: срабатывают один раз по метке времени
function epiCue(t,at,fn){
  if(!G._epiCues)G._epiCues={};
  const key=(G.epiVariant||'x')+'@'+at;
  if(t>=at&&!G._epiCues[key]){G._epiCues[key]=1;try{fn()}catch(e){}}
}
// ---------------------------------------------------------------------------
// РАЗВОДКА ФИНАЛА
// ---------------------------------------------------------------------------
function drawEpilogueSequence(){
  const t=Math.max(0,G.epilogueTimer||0);
  if(!G.epiVariant)G.epiVariant=epiVariant();
  if(G.epiVariant==='burn')epiBurnEnding(t);
  else if(G.epiVariant==='trap')epiTrapEnding(t);
  else if(G.epiVariant==='dark')epiDarkEnding(t);
  else if(G.epiVariant==='truth')epiTruthEnding(t);   // V84
  else epiCalmEnding(t);
  // ==== V100: ВСТУПЛЕНИЕ КОНЦОВКИ ====
  // Общий слой первых пяти секунд: диафрагма из темноты, световая волна,
  // пылинки, нарастание, удар внезапности и атмосферная подложка комнаты.
  // Рисуется ПОСЛЕ сцены, поэтому титульная карточка проявляется вместе с
  // кадром, а не висит на чёрном. Подробности — js/end_intro.js.
  try{
    window.EndIntro?.cues?.(G.epiVariant,t,epiCue);
    window.EndIntro?.draw?.(ctx,W,H,t,G.epiVariant,document.body.classList.contains('low-end'));
  }catch(e){console.warn('end intro:',e)}
}
// ===========================================================================
// КОНЦОВКА «ПЕПЕЛ» (1–4 смерти): он поджигает пиццерию и бежит к выходу.
// Раскадровка: титр -> тёмный зал, охранник с канистрой -> льёт бензин ->
// спичка -> огонь идёт по полу -> бег к выходу -> улица, пиццерия горит ->
// он смотрит на пожар -> финальный титр.
// ===========================================================================
function epiBurnEnding(t){
  const w=W,h=H,low=document.body.classList.contains('low-end');
  // V94: после старого финала идёт кода — новая последняя сцена (js/endings_coda.js).
  if(epiCoda('burn',t))return;
  // V101: раскадровка переписана заново и живёт в js/end_scenes.js.
  // Старый код ниже оставлен как страховка на случай, если файл не загрузился.
  if(epiScene('burn',t))return;
  const cl=v=>Math.min(1,Math.max(0,v));
  const eo=x=>1-Math.pow(1-x,3);
  const eio=x=>x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2;
  // фазы
  const T_CARD=0.0, T_HALL=2.6, T_POUR=5.0, T_MATCH=8.2, T_IGNITE=9.6, T_RUN=11.4, T_OUT=14.6, T_FINAL=19.4;
  const pourK=cl((t-T_POUR)/2.9);
  const matchK=cl((t-T_MATCH)/1.2);
  const igniteK=cl((t-T_IGNITE)/1.7);
  const fireK=cl((t-T_IGNITE)/3.6);
  const runK=eo(cl((t-T_RUN)/2.9));
  const outK=eio(cl((t-T_OUT)/1.5));
  const finalK=cl((t-T_FINAL)/2.0);
  epiCue(t,T_POUR,()=>window.AudioFX.synth?.('sip',.5));
  epiCue(t,T_MATCH,()=>window.AudioFX.synth?.('bone',.5));
  epiCue(t,T_IGNITE,()=>{window.AudioFX.synth?.('ignite',.9);window.AudioFX.synth?.('rumble',.8);});
  epiCue(t,T_IGNITE+1.6,()=>window.AudioFX.synth?.('fire',.85));
  epiCue(t,T_IGNITE+4.0,()=>window.AudioFX.synth?.('fire',.75));
  epiCue(t,T_OUT+1.0,()=>window.AudioFX.synth?.('fire',.9));
  epiCue(t,T_OUT+3.6,()=>window.AudioFX.synth?.('fire',.8));
  epiCue(t,T_RUN,()=>window.AudioFX.synth?.('breath',.7));
  epiCue(t,T_OUT,()=>window.AudioFX.synth?.('metalDrag',.6));
  epiCue(t,T_FINAL,()=>window.AudioFX.synth?.('rumble',.55));
  ctx.save();
  // тряска: слабая при поджоге, сильная при беге
  const shk=(igniteK>0&&igniteK<1?3.4*igniteK:0)+(t>T_RUN&&t<T_OUT?2.2:0);
  ctx.translate(Math.sin(t*1.2)*1.4+Math.sin(t*23)*shk,Math.cos(t*0.8)*1.1+Math.cos(t*29)*shk);
  if(t<T_OUT+0.9){
    // ---------------- ИНТЕРЬЕР: зал пиццерии ----------------
    // медленный наезд камеры, при беге — рывок вперёд и вправо
    const push=1.02+0.10*eio(cl((t-T_HALL)/6.0))+0.30*runK;
    ctx.save();
    ctx.translate(w*0.5,h*0.5);ctx.scale(push,push);
    ctx.translate(-w*0.5-w*0.16*runK,-h*0.5+h*0.02*runK);
    // стены и пол
    const wall=ctx.createLinearGradient(0,0,0,h);
    wall.addColorStop(0,'#080a0d');wall.addColorStop(.52,'#141a20');wall.addColorStop(.68,'#1a2129');wall.addColorStop(1,'#0a0d11');
    ctx.fillStyle=wall;ctx.fillRect(0,0,w,h);
    // потолок с погасшими плафонами
    ctx.fillStyle='#06080b';ctx.fillRect(0,0,w,h*0.13);
    for(let i=0;i<5;i++){const lx=w*(0.10+i*0.20);
      ctx.fillStyle='#1c232b';ctx.fillRect(lx-24,h*0.045,48,7);
      const on=(i===2)?(0.35+0.30*Math.abs(Math.sin(t*7.3))):0.10;
      ctx.fillStyle='rgba(214,224,206,'+on.toFixed(3)+')';ctx.fillRect(lx-20,h*0.048,40,3);}
    // кафель пола в перспективе
    ctx.fillStyle='#0d1116';ctx.fillRect(0,h*0.62,w,h*0.38);
    ctx.strokeStyle='rgba(150,168,178,.10)';ctx.lineWidth=1;
    for(let i=-9;i<=9;i++){ctx.beginPath();ctx.moveTo(w*0.5+i*w*0.07,h*0.62);ctx.lineTo(w*0.5+i*w*0.30,h);ctx.stroke();}
    for(let i=1;i<8;i++){const yy=h*(0.62+Math.pow(i/8,1.9)*0.38);ctx.beginPath();ctx.moveTo(0,yy);ctx.lineTo(w,yy);ctx.stroke();}
    // сцена с аниматрониками в глубине слева
    ctx.fillStyle='#12171d';ctx.fillRect(w*0.06,h*0.44,w*0.26,h*0.20);
    ctx.fillStyle='#7a1e28';ctx.fillRect(w*0.06,h*0.44,w*0.26,h*0.02);
    // V80: на сцене стояли безликие конусы с овальными головами. Теперь там
    // те же четыре аниматроника, что и на камерах: они не двигаются с места,
    // только глаза разгораются вместе с пожаром.
    ['main','felix','exo','lav'].forEach((kd,i)=>{
      const sx=w*(0.096+i*0.0645), sy=h*0.4405;
      epiAnimatron(ctx,sx,sy,(h*0.152)/(160*1.34),t,{
        kind:kd,seed:i*3.1,face:i%2?-1:1,
        dark:0.80-0.34*fireK,
        eye:0.18+0.82*fireK,
        head:(i<2?0.05:-0.05)*(0.3+0.7*fireK),
        fog:0.16-0.10*fireK,fogColor:'40,30,26',
        shadow:0.30,shadowDir:1,alpha:0.92
      });
    });
    // столы, стулья, гирлянда
    for(let i=0;i<4;i++){const bx=w*(0.14+i*0.19),by=h*(0.70+i*0.03);
      ctx.fillStyle='#1a1f26';ctx.fillRect(bx-26,by,52,6);ctx.fillRect(bx-3,by+6,6,20);
      ctx.fillStyle='#141922';ctx.fillRect(bx-34,by+10,10,16);ctx.fillRect(bx+24,by+10,10,16);}
    ctx.strokeStyle='rgba(180,150,90,.20)';ctx.beginPath();
    for(let i=0;i<=20;i++){const gx=w*i/20,gy=h*0.17+Math.sin(i*0.5)*8;i?ctx.lineTo(gx,gy):ctx.moveTo(gx,gy);}ctx.stroke();
    // дверь ВЫХОД справа с зелёной табличкой
    const dx=w*0.845,dy=h*0.40,dw=w*0.085,dh=h*0.30;
    const doorOpen=cl((t-T_RUN-1.4)/1.0);
    ctx.fillStyle='#20272e';ctx.fillRect(dx-10,dy-10,dw+20,dh+20);
    ctx.fillStyle='#0a0e12';ctx.fillRect(dx,dy,dw,dh);
    ctx.fillStyle='#2c343b';ctx.fillRect(dx,dy,dw*(1-doorOpen*0.92),dh);
    ctx.fillStyle='#0a1b0f';ctx.fillRect(dx-4,dy-24,dw+8,16);
    ctx.save();if(!low){ctx.shadowColor='#4de07a';ctx.shadowBlur=12;}
    ctx.fillStyle='#5ef08a';ctx.font='700 '+Math.round(h*0.022)+'px "Inter",Arial,sans-serif';ctx.textAlign='center';
    ctx.fillText('ВЫХОД',dx+dw*0.5,dy-11);ctx.textAlign='left';ctx.restore();
    if(doorOpen>0){
      ctx.save();ctx.globalCompositeOperation='lighter';
      const sp=ctx.createLinearGradient(dx,0,dx+dw,0);
      sp.addColorStop(0,'rgba(120,170,210,'+(0.30*doorOpen).toFixed(3)+')');
      sp.addColorStop(1,'rgba(120,170,210,0)');
      ctx.fillStyle=sp;ctx.fillRect(dx-dw,dy,dw*2,dh);ctx.restore();
    }
    // ---- разлитый бензин: лужи растут, пока он льёт ----
    if(pourK>0){
      ctx.save();
      for(let i=0;i<9;i++){
        const r=epiRnd(i*4.1);
        const k2=cl(pourK*1.4-i*0.10);if(k2<=0)continue;
        const lx=w*(0.30+i*0.055+r*0.02), ly=h*(0.828+((i%3)*0.014));
        ctx.fillStyle='rgba(30,36,30,.55)';
        ctx.beginPath();ctx.ellipse(lx,ly,26*k2,7*k2,0,0,Math.PI*2);ctx.fill();
        ctx.save();ctx.globalCompositeOperation='lighter';
        ctx.fillStyle='rgba(150,170,190,'+(0.10*k2).toFixed(3)+')';
        ctx.beginPath();ctx.ellipse(lx-6,ly-1,14*k2,3*k2,0,0,Math.PI*2);ctx.fill();ctx.restore();
      }
      ctx.restore();
    }
    // V95: струя бензина больше не рисуется здесь. Было: она жила в координатах
    // сцены (w*0.385+46) и шла мимо канистры — тонкой ниткой сквозь бедро, да ещё и
    // за фигурой. Стало: струя прибита к носику канистры в drawGuardChar.
    // ---- ОГОНЬ по полу и по стенам ----
    if(fireK>0){
      const spread=cl(igniteK);
      // огненная дорожка по разлитому бензину
      // V80: раньше дорожка растягивалась вправо и охранник оказывался
      // СТОЯЩИМ В ПЛАМЕНИ ещё до того, как побежит. Теперь огонь по разливу
      // уходит ВЛЕВО, к сцене, — от него, а вправо ползёт только когда он
      // уже сорвался с места.
      const chase=cl((t-T_RUN-0.6)/2.6);
      const fx0=w*(0.345-0.305*spread), fx1=w*(0.362+0.558*chase);
      drawFlames(ctx,fx0,h*0.836,fx1-fx0,h*0.30*(0.5+0.5*fireK),t,0.55+0.45*fireK,11);
      // огонь на сцене и вдоль левой стены
      if(fireK>0.35){
        drawFlames(ctx,w*0.05,h*0.645,w*0.30,h*0.34,t,fireK*0.95,31);
        drawFlames(ctx,w*0.02,h*0.62,w*0.08,h*0.46,t,fireK*0.8,47);
      }
      // V80: вторая дорожка загоралась раньше, чем он через неё пробегал
      if(chase>0.35)drawFlames(ctx,w*0.60,h*0.828,w*0.22,h*0.26,t,(chase-0.35)*1.5,63);
      if(!low){
        drawEmbers(ctx,w*0.10,h*0.86,w*0.75,h*0.72,t,low?12:46,fireK);
        drawSmokeColumn(ctx,w*0.30,h*0.60,w*0.22,h*0.55,t,0.30*fireK);
      }
      // общий тёплый свет пожара на весь зал
      ctx.save();ctx.globalCompositeOperation='lighter';
      const fl=0.06+0.05*Math.abs(Math.sin(t*6.1))+0.05*Math.abs(Math.sin(t*11.3));
      // V80: радиус 0.95w заливал ровным бежевым весь кадр и убивал глубину.
      // Теперь дальняя правая часть зала остаётся тёмной.
      const fg=ctx.createRadialGradient(w*0.30,h*0.86,10,w*0.30,h*0.80,w*0.60);
      fg.addColorStop(0,'rgba(255,168,66,'+(fl*fireK).toFixed(3)+')');
      fg.addColorStop(0.40,'rgba(226,96,26,'+(fl*0.40*fireK).toFixed(3)+')');
      fg.addColorStop(1,'rgba(180,50,10,0)');
      ctx.fillStyle=fg;ctx.fillRect(0,0,w,h);ctx.restore();
      // дым, наползающий с потолка
      ctx.save();const sm=ctx.createLinearGradient(0,0,0,h*0.5);
      sm.addColorStop(0,'rgba(18,14,13,'+(0.86*fireK).toFixed(3)+')');
      sm.addColorStop(1,'rgba(24,20,18,0)');
      ctx.fillStyle=sm;ctx.fillRect(0,0,w,h*0.5);ctx.restore();
    }
    // ---- ОХРАННИК ----
    let px2,py2,sc,pose,prop,facing=1,dust=false,phase=0,antic=0;
    if(t<T_POUR){                       // входит в зал с канистрой
      const k2=cl((t-T_HALL)/2.4);
      px2=w*(0.24+0.14*k2);py2=h*(0.742+0.005*k2);sc=1.06;pose=k2<0.96?'walk':'stand';
      prop='canister';phase=epiStridePhase(w*0.14*k2,1.06,0.52);dust=true;
    }else if(t<T_MATCH){                // льёт бензин
      px2=w*0.385;py2=h*0.745;sc=1.10;pose='pour';prop='canister';phase=t*1.4;
    }else if(t<T_IGNITE+0.5){           // чиркает спичкой
      px2=w*0.385;py2=h*0.745;sc=1.12;pose='match';prop='match';phase=0;
    }else if(t<T_RUN){                  // отшатывается от вспышки
      const k2=cl((t-T_IGNITE-0.5)/(T_RUN-T_IGNITE-0.5));
      px2=w*(0.385+0.082*k2);py2=h*0.745;sc=1.12;pose=k2>0.35?'walk':'stand';phase=-epiStridePhase(w*0.082*k2,1.12,0.52);dust=true;facing=-1;   // отшатывается назад, не отводя глаз от огня
      antic=cl((t-(T_RUN-0.32))/0.32);   // V81: присед-упреждение прямо перед рывком
    }else{                              // бежит к выходу
      px2=w*(0.467+0.368*runK);py2=h*(0.745-0.02*runK);sc=1.12-0.10*runK;
      pose='run';phase=epiStridePhase(Math.hypot(w*0.368,h*0.02)*runK,1.07,0.95);dust=true;
    }
    const rimP=fireK*(0.35+0.25*Math.abs(Math.sin(t*7)));
    drawGuardChar(ctx,px2,py2,sc,{t,pose,prop,face:facing,phase,dust,antic,pourK,
      rim:{dir:-1,col:'255,150,60',power:rimP},
      shadowDir:1,shadowLen:1+1.4*fireK,shadowAlpha:0.5+0.4*fireK,
      // V79: раньше на поливе и на отшатывании look был отрицательным —
      // он отворачивался от того, что делает, и от огня. Отшатываясь спиной
      // вперёд (face:-1) он теперь не сводит глаз с пламени.
      look:pose==='run'?0.55:(t<T_POUR?0.28:(t<T_IGNITE+0.5?0.22:0.55)),seed:1.7});
    // отблеск пожара в луже под ним
    if(fireK>0.2&&!low){
      ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=0.20*fireK;
      ctx.fillStyle='#ff9a3c';ctx.beginPath();ctx.ellipse(px2,py2+78,34,6,0,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    ctx.restore(); // конец наезда
    // вспышка воспламенения
    // V80: вспышка держалась 1.7 с и всё это время заливала кадр ровным
    // кремовым цветом — зал терял глубину и выглядел плоским бежевым фоном.
    // Теперь это короткий удар 0.34 с, а дальше остаётся только тёплый
    // подсвет от самого пламени, локальный и не на весь экран.
    const flashK=cl((t-T_IGNITE)/0.34);
    if(flashK>0&&flashK<1){
      ctx.save();ctx.globalAlpha=Math.pow(1-flashK,2.2)*0.92;
      ctx.fillStyle='#ffe6bb';ctx.fillRect(0,0,w,h);ctx.restore();
    }
    if(igniteK>0&&igniteK<1&&flashK>=1){
      ctx.save();ctx.globalCompositeOperation='lighter';
      const bl=ctx.createRadialGradient(w*0.30,h*0.83,10,w*0.30,h*0.80,w*0.42);
      const ba=Math.pow(1-igniteK,1.4)*0.34;
      bl.addColorStop(0,'rgba(255,206,140,'+ba.toFixed(3)+')');
      bl.addColorStop(1,'rgba(255,140,50,0)');
      ctx.fillStyle=bl;ctx.fillRect(0,0,w,h);ctx.restore();
    }
  }
  if(outK>0){
    // ---------------- ЭКСТЕРЬЕР: пиццерия горит, он смотрит ----------------
    ctx.save();ctx.globalAlpha=outK;
    // ночное небо с отсветом пожара
    const sky=ctx.createLinearGradient(0,0,0,h);
    sky.addColorStop(0,'#080c16');sky.addColorStop(.42,'#1a1520');sky.addColorStop(.62,'#3a2119');sky.addColorStop(1,'#150f0e');
    ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    if(!low){for(let i=0;i<40;i++){const sx=epiRnd(i*2.3)*w,sy=epiRnd(i*5.1)*h*0.4;
      ctx.fillStyle='rgba(220,230,255,'+(0.10+0.35*epiRnd(i*7.7)).toFixed(3)+')';ctx.fillRect(sx,sy,1.4,1.4);}}
    // дальний лес
    // V97: было — ломаная линия с разбросом высоты 1.2 % от кадра: на экране
    // это читалось как низкие холмы, а не как лес. Стало — два плана ёлок:
    // дальний бледнее и мельче, ближний темнее и выше, силуэты разной высоты,
    // и по кромке леса лежит отсвет пожара.
    for(const pl of [[0.575,0.090,'#0b100e',0.62],[0.60,0.135,'#050807',1.0]]){
      ctx.fillStyle=pl[2];
      ctx.beginPath();ctx.moveTo(0,h*0.63);
      const N=Math.round(30/pl[3]);
      for(let i=0;i<=N;i++){
        const tx=i*w/N, tw=w/N*0.62, th=h*pl[1]*(0.55+0.75*epiRnd(i*3.7+pl[1]*100));
        ctx.lineTo(tx-tw*0.5,h*pl[0]);
        ctx.lineTo(tx,h*pl[0]-th);
        ctx.lineTo(tx+tw*0.5,h*pl[0]);
      }
      ctx.lineTo(w,h*0.63);ctx.closePath();ctx.fill();
    }
    ctx.save();ctx.globalCompositeOperation='lighter';
    const fedge=ctx.createLinearGradient(0,h*0.545,0,h*0.615);
    fedge.addColorStop(0,'rgba(255,150,70,0)');fedge.addColorStop(1,'rgba(255,140,60,.10)');
    ctx.fillStyle=fedge;ctx.fillRect(0,h*0.545,w,h*0.07);ctx.restore();
    // земля и парковка
    ctx.fillStyle='#141210';ctx.fillRect(0,h*0.60,w,h*0.40);
    ctx.strokeStyle='rgba(200,190,160,.10)';ctx.setLineDash([16,18]);ctx.lineWidth=3;
    ctx.beginPath();ctx.moveTo(w*0.10,h*0.90);ctx.lineTo(w*0.95,h*0.83);ctx.stroke();ctx.setLineDash([]);
    // V97: перед горящим зданием была одна пунктирная линия на пустом асфальте.
    // Стало: бордюр с полосой газона у стены, разметка парковочных мест и
    // мачта освещения — площадка перестала быть пустотой, и по ней ходит
    // отсвет пожара.
    ctx.fillStyle='#0e1a12';ctx.fillRect(0,h*0.598,w,h*0.016);                 // газон у стены
    ctx.fillStyle='#1b1a17';ctx.fillRect(0,h*0.612,w,Math.max(2,h*0.008));     // бордюр
    ctx.fillStyle='rgba(255,150,70,.05)';ctx.fillRect(0,h*0.612,w,Math.max(1,h*0.004));
    ctx.strokeStyle='rgba(206,196,168,.07)';ctx.lineWidth=2;
    for(let i=0;i<6;i++){                                                      // места
      const x0=w*(0.06+i*0.155);
      ctx.beginPath();ctx.moveTo(x0,h*0.70);ctx.lineTo(x0-w*0.03,h*0.99);ctx.stroke();
    }
    ctx.strokeStyle='rgba(206,196,168,.05)';
    ctx.beginPath();ctx.moveTo(0,h*0.70);ctx.lineTo(w,h*0.685);ctx.stroke();
    {                                                                          // мачта освещения
      const mx=w*0.885, my=h*0.62, mh=h*0.34;
      ctx.fillStyle='#100e0d';ctx.fillRect(mx,my-mh,Math.max(2,w*0.007),mh);
      ctx.fillStyle='#141110';ctx.fillRect(mx-w*0.026,my-mh-h*0.010,w*0.036,Math.max(3,h*0.012));
      ctx.save();ctx.globalCompositeOperation='lighter';
      ctx.fillStyle='rgba(255,150,70,.10)';ctx.fillRect(mx-w*0.024,my-mh-h*0.008,w*0.032,Math.max(2,h*0.004));
      ctx.restore();
      ctx.save();ctx.globalAlpha=0.35;ctx.fillStyle='#000';
      ctx.beginPath();ctx.ellipse(mx+w*0.002,my+2,w*0.02,h*0.006,0,0,Math.PI*2);ctx.fill();ctx.restore();
    }
    // ---- горящая пиццерия ----
    const bx=w*0.20,by=h*0.34,bw=w*0.44,bh=h*0.28;
    const roofH=h*0.13,peakX=bx+bw*0.5,peakY=by-roofH;
    // корпус
    ctx.fillStyle='#181513';ctx.fillRect(bx,by,bw,bh);
    const fac=ctx.createLinearGradient(bx,by,bx+bw,by+bh);
    fac.addColorStop(0,'#2a231e');fac.addColorStop(1,'#120f0d');ctx.fillStyle=fac;ctx.fillRect(bx,by,bw,bh);
    // крыша
    // V97: скат был залит #0f0d0c на почти чёрном небе — крыши в кадре просто
    // не было видно, здание читалось плоской плитой. Стало: скат с градиентом,
    // подсвеченный снизу пожаром, светлый конёк, козырёк по кромке и тень под
    // ним — крыша читается, и сразу видно, что горит именно под ней.
    const rg=ctx.createLinearGradient(peakX,peakY,peakX,by);
    rg.addColorStop(0,'#141110');rg.addColorStop(0.62,'#241812');rg.addColorStop(1,'#4a2415');
    ctx.fillStyle=rg;ctx.beginPath();ctx.moveTo(bx-8,by);ctx.lineTo(bx+bw+8,by);ctx.lineTo(peakX,peakY);ctx.closePath();ctx.fill();
    ctx.save();ctx.globalCompositeOperation='lighter';
    ctx.strokeStyle='rgba(255,150,66,'+(0.16+0.08*Math.abs(Math.sin(t*5.1))).toFixed(3)+')';ctx.lineWidth=2;
    ctx.beginPath();ctx.moveTo(bx-8,by);ctx.lineTo(peakX,peakY);ctx.lineTo(bx+bw+8,by);ctx.stroke();
    ctx.restore();
    ctx.fillStyle='#0a0807';ctx.fillRect(bx-12,by-2,bw+24,Math.max(3,h*0.010));   // козырёк
    ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(bx-8,by+h*0.008,bw+16,Math.max(2,h*0.012));
    // V97: фасад был ровной коричневой заливкой без единой детали — здание
    // читалось как картонная коробка. Ниже: горизонтальный шов панелей, входная
    // группа с выбитым стеклом и копоть, которая тянется из каждого окна вверх.
    ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(bx,by+bh*0.62,bw,Math.max(1,h*0.004));
    ctx.fillStyle='rgba(255,150,70,.05)';ctx.fillRect(bx,by+bh*0.62,bw,Math.max(1,h*0.002));
    {
      const dx3=bx+bw*0.44, dy3=by+bh*0.64, dw3=bw*0.16, dh3=bh*0.36;
      ctx.fillStyle='#0d0b0a';ctx.fillRect(dx3-2,dy3-2,dw3+4,dh3+2);
      ctx.save();ctx.globalCompositeOperation='lighter';
      const dg=ctx.createLinearGradient(dx3,dy3+dh3,dx3,dy3);
      dg.addColorStop(0,'rgba(255,196,120,.28)');dg.addColorStop(1,'rgba(220,110,40,.06)');
      ctx.fillStyle=dg;ctx.fillRect(dx3,dy3,dw3,dh3);ctx.restore();
      ctx.fillStyle='#0a0806';ctx.fillRect(dx3+dw3*0.48,dy3,Math.max(1.6,bw*0.006),dh3);
      ctx.fillStyle='rgba(10,8,6,.7)';ctx.fillRect(dx3,dy3+dh3*0.30,dw3,1.6);
    }
    // окна, из которых рвётся пламя
    for(const q of [0.08,0.34,0.60,0.80]){
      const sx4=bx+bw*q, sy4=by+bh*0.26, sw4=bw*0.14;      // копоть над окном
      const sg2=ctx.createLinearGradient(0,sy4,0,by-2);
      sg2.addColorStop(0,'rgba(10,8,7,.62)');sg2.addColorStop(1,'rgba(10,8,7,0)');
      ctx.fillStyle=sg2;ctx.fillRect(sx4-sw4*0.12,by,sw4*1.24,sy4-by);
    }
    for(const q of [0.08,0.34,0.60,0.80]){
      const wx=bx+bw*q,wy=by+bh*0.26,ww=bw*0.14,wh2=bh*0.24;
      ctx.fillStyle='#0a0806';ctx.fillRect(wx-3,wy-3,ww+6,wh2+6);
      ctx.save();ctx.globalCompositeOperation='lighter';
      // V95: было — ровный жёлтый прямоугольник, окно выглядело наклейкой.
      // Стало — жар мерцает и ярче внизу, а сверху лежит копоть; поперёк идут
      // тёмные переплёты, поэтому за стеклом читается горящее помещение.
      const wfl=0.80+0.20*Math.sin(t*7.3+q*9);
      const wg=ctx.createLinearGradient(wx,wy+wh2,wx,wy);
      wg.addColorStop(0,'rgba(255,222,146,'+(0.86*wfl).toFixed(3)+')');
      wg.addColorStop(.55,'rgba(255,150,52,'+(0.52*wfl).toFixed(3)+')');
      wg.addColorStop(1,'rgba(190,70,18,'+(0.22*wfl).toFixed(3)+')');
      ctx.fillStyle=wg;ctx.fillRect(wx,wy,ww,wh2);ctx.restore();
      ctx.fillStyle='rgba(10,8,6,.75)';
      ctx.fillRect(wx,wy+wh2*0.46,ww,1.6);
      ctx.fillRect(wx+ww*0.48,wy,1.6,wh2);
      drawFlames(ctx,wx-2,wy+wh2*0.9,ww+4,bh*0.62,t,0.9,q*100);
    }
    // вывеска, которая сейчас упадёт
    ctx.save();ctx.translate(peakX,peakY+8);ctx.rotate(Math.sin(t*0.7)*0.05-0.06);
    ctx.fillStyle='#100e0d';ctx.fillRect(-bw*0.22,-h*0.05,bw*0.44,h*0.05);
    ctx.font='700 '+Math.round(h*0.026)+'px "Inter",Arial,sans-serif';ctx.textAlign='center';
    ctx.fillStyle='rgba(247,231,189,'+(0.35+0.35*Math.abs(Math.sin(t*9))).toFixed(2)+')';
    ctx.fillText('GOREВОКСЕД',0,-h*0.014);ctx.textAlign='left';ctx.restore();
    // огонь по крыше и из-за здания
    drawFlames(ctx,bx-10,by+4,bw+20,h*0.34,t,1.0,7);
    drawFlames(ctx,bx+bw*0.2,peakY+h*0.02,bw*0.6,h*0.26,t,0.9,19);
    if(!low){
      drawSmokeColumn(ctx,peakX,peakY,w*0.16,h*0.62,t,0.42);
      drawSmokeColumn(ctx,bx+bw*0.2,by,w*0.12,h*0.50,t,0.30);
      drawEmbers(ctx,bx-20,by+bh,bw+40,h*0.75,t,60,1);
    }
    // отсвет пожара на земле
    ctx.save();ctx.globalCompositeOperation='lighter';
    // V95: было 0.20+0.10+0.08 — вместе с новым маревом огня кадр выцветал в
    // светло-коричневый, ночь переставала быть ночью. Стало — отсвет слабее,
    // пламя ярче фона.
    const fl2=0.12+0.07*Math.abs(Math.sin(t*5.7))+0.05*Math.abs(Math.sin(t*13.1));
    const gg=ctx.createRadialGradient(peakX,by+bh,20,peakX,by+bh,w*0.85);
    gg.addColorStop(0,'rgba(255,168,72,'+fl2.toFixed(3)+')');
    gg.addColorStop(0.5,'rgba(228,96,28,'+(fl2*0.45).toFixed(3)+')');
    gg.addColorStop(1,'rgba(150,40,10,0)');
    ctx.fillStyle=gg;ctx.fillRect(0,0,w,h);ctx.restore();
    // ---- охранник: выбегает, останавливается, оборачивается ----
    const runOut=eo(cl((t-T_OUT)/2.2));
    const watchK=cl((t-T_OUT-2.2)/1.2);
    // V95: было gy2=h*(0.70+0.045) — на широком кадре ступни уходили под нижнюю
    // чёрную полосу. Стало: линия пола выше, ботинки целиком в кадре.
    const gx2=w*(0.60+0.14*runOut), gy2=h*(0.665+0.040*runOut);
    const gsc=1.05+0.34*runOut;
    // V81: раньше он бежал ещё 0.6 с уже на месте, а потом мгновенно вставал
    // в стойку. Теперь бег кончается ровно там, где кончается путь: он
    // останавливается, руки и плечи по инерции догоняют корпус (settle),
    // и только после этого он оборачивается на пожар.
    drawGuardChar(ctx,gx2,gy2,gsc,{t,
      pose:watchK>0?'stand':'run',
      face:watchK>0.5?-1:1,
      settle:watchK>0?(t-(T_OUT+2.2)):-1,
      phase:t*15,dust:watchK<0.25,
      rim:{dir:watchK>0.5?1:-1,col:'255,150,60',power:0.42+0.22*Math.abs(Math.sin(t*6))},
      shadowDir:1,shadowLen:2.0,shadowAlpha:0.55,
      // V79: стоя он развёрнут к пожару (face:-1), значит и голова должна
      // смотреть туда же — раньше отрицательный look отворачивал её от огня
      look:watchK>0.5?0.42:0.6,seed:1.7});
    // его длинная тень от пожара
    ctx.save();ctx.globalAlpha=0.30;ctx.fillStyle='#000';
    ctx.beginPath();ctx.moveTo(gx2-12,gy2+6);ctx.lineTo(gx2+12,gy2+6);
    ctx.lineTo(gx2+w*0.20,h);ctx.lineTo(gx2+w*0.10,h);ctx.closePath();ctx.fill();ctx.restore();
    ctx.restore();
  }
  // финальное затемнение
  if(finalK>0){ctx.save();ctx.globalAlpha=Math.min(1,finalK*1.1);ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);ctx.restore();}
  // грейд, титры
  epiGrade(ctx,w,h,t,low,'rgba(255,150,60,0.05)',0.34,1);
  ctx.restore();
  // V101: ВСТУПИТЕЛЬНОГО ТЕКСТА В КОНЦОВКАХ БОЛЬШЕ НЕТ. Титр «ГЛАВА V — 06:00»
  // с подзаголовком объяснял словами то, что дальше показано кадрами, и первые
  // две секунды каждого финала уходили на чтение, а не на сцену.
  epiSub(ctx,w,h,t,3.1,1.9,'Он нашёл на складе канистру.');
  epiSub(ctx,w,h,t,5.4,2.3,'— Хватит. Больше никто здесь не останется на ночь.');
  epiSub(ctx,w,h,t,8.3,1.6,'Одна спичка.');
  epiSub(ctx,w,h,t,11.6,2.2,'Беги. Не оглядывайся, пока не выйдешь.');
  epiSub(ctx,w,h,t,15.2,2.4,'Пиццерия горит вместе со всем, что в ней жило.');
  // V103: НАЗВАНИЕ КОНЦОВКИ И СЧЁТЧИК СМЕРТЕЙ УБРАНЫ.
  // ПОЧЕМУ ТАК БЫЛО: финал заканчивался служебной карточкой «КОНЦОВКА: ...» и
  // строкой «СМЕРТЕЙ: N». Это разрушало сцену: только что был кадр, а сразу
  // после — отчёт. СТАЛО: финал уходит в чёрный без подписей.
  // epiCard(ctx,w,h,t,T_FINAL+0.6,3.4,'КОНЦОВКА: ПЕПЕЛ','ОН БОЛЬШЕ НИКОГО НЕ ДОЖДЁТСЯ · СМЕРТЕЙ: '+epiDeaths(),'#ffb066');
  epiBars(ctx,w,h,1);
  epiTimecode(ctx,w,h,'NS-04 · СМЕНА 5/5 · 06:0'+Math.min(9,Math.floor(t)),0.42);
  epiSkipHint(ctx,w,h,t);
}
// ===========================================================================
// МРАЧНАЯ КОНЦОВКА «ЕЩЁ ОДИН КОСТЮМ» (5 и больше смертей).
// Раскадровка: титр -> он поднимается в офисе, но за дверью не рассвет, а тьма ->
// коридор, по бокам загораются пары глаз -> табличка ВЫХОД гаснет, выход заложен ->
// он возвращается в кресло, его глаза загораются, как у аниматроника -> титр.
// ===========================================================================
function epiDarkEnding(t){
  const w=W,h=H,low=document.body.classList.contains('low-end');
  // V94: после старого финала идёт кода — новая последняя сцена (js/endings_coda.js).
  if(epiCoda('dark',t))return;
  // V101: раскадровка переписана заново и живёт в js/end_scenes.js.
  // Старый код ниже оставлен как страховка на случай, если файл не загрузился.
  if(epiScene('dark',t))return;
  const cl=v=>Math.min(1,Math.max(0,v));
  const eio=x=>x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2;
  const eo=x=>1-Math.pow(1-x,3);
  const T_OFFICE=2.2, T_WALK=5.0, T_EXIT=9.6, T_BACK=13.2, T_SIT=16.0, T_FINAL=18.0;
  const riseK=eio(cl((t-T_OFFICE)/2.2));
  const walkK=eo(cl((t-T_WALK)/4.2));
  const exitK=cl((t-T_EXIT)/2.0);
  const backK=eo(cl((t-T_BACK)/2.4));
  const sitK=cl((t-T_SIT)/1.4);
  const finalK=cl((t-T_FINAL)/2.4);
  epiCue(t,T_OFFICE,()=>window.AudioFX.synth?.('breath',.6));
  epiCue(t,T_WALK,()=>window.AudioFX.synth?.('drip',.4));
  epiCue(t,T_EXIT,()=>window.AudioFX.synth?.('blackout',.8));
  epiCue(t,T_BACK,()=>window.AudioFX.synth?.('metalDrag',.5));
  epiCue(t,T_SIT,()=>window.AudioFX.synth?.('heartbeat',.7));
  epiCue(t,T_FINAL,()=>window.AudioFX.synth?.('rumble',.7));
  ctx.save();
  const shk=(t>T_EXIT&&t<T_EXIT+1.2)?2.6:0;
  ctx.translate(Math.sin(t*0.9)*1.2+Math.sin(t*27)*shk,Math.cos(t*0.7)*0.9+Math.cos(t*31)*shk);
  // почти чёрный коридор, ползущий мимо камеры
  const push=1.0+0.22*walkK-0.10*backK;
  ctx.save();ctx.translate(w*0.5,h*0.5);ctx.scale(push,push);ctx.translate(-w*0.5,-h*0.5);
  const bgg=ctx.createLinearGradient(0,0,0,h);
  bgg.addColorStop(0,'#030507');bgg.addColorStop(.5,'#080c11');bgg.addColorStop(.68,'#0b1016');bgg.addColorStop(1,'#040609');
  ctx.fillStyle=bgg;ctx.fillRect(0,0,w,h);
  // перспектива коридора
  const vpX=w*0.5, vpY=h*0.46;
  ctx.fillStyle='#070a0e';ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(w,0);ctx.lineTo(vpX+w*0.14,vpY);ctx.lineTo(vpX-w*0.14,vpY);ctx.closePath();ctx.fill();
  ctx.fillStyle='#0a0e13';ctx.beginPath();ctx.moveTo(0,h);ctx.lineTo(w,h);ctx.lineTo(vpX+w*0.14,vpY);ctx.lineTo(vpX-w*0.14,vpY);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(120,140,155,.07)';ctx.lineWidth=1;
  for(let i=1;i<10;i++){const k2=((i/10)+ (t*0.06)%0.1);
    const yy=vpY+(h-vpY)*Math.pow(k2,1.8);
    ctx.beginPath();ctx.moveTo(0,yy);ctx.lineTo(w,yy);ctx.stroke();}
  ctx.beginPath();ctx.moveTo(0,h);ctx.lineTo(vpX-w*0.14,vpY);ctx.moveTo(w,h);ctx.lineTo(vpX+w*0.14,vpY);ctx.stroke();
  // мёртвые плафоны, один дёргается
  for(let i=0;i<4;i++){const k2=(i+1)/5, lx=vpX+(i%2?1:-1)*w*0.12*(1-k2*0.5), ly=vpY-h*0.02+(h*0.06)*k2;
    ctx.fillStyle='#111820';ctx.fillRect(lx-16*(1-k2*0.5),ly,32*(1-k2*0.5),4);
    if(i===1){const fk=(epiRnd(Math.floor(t*9))>0.7)?1:0;
      ctx.save();ctx.globalCompositeOperation='lighter';
      const g=ctx.createRadialGradient(lx,ly+4,2,lx,ly+4,h*0.16);
      g.addColorStop(0,'rgba(180,200,220,'+(0.16*fk).toFixed(3)+')');g.addColorStop(1,'rgba(140,170,200,0)');
      ctx.fillStyle=g;ctx.fillRect(lx-h*0.2,ly,h*0.4,h*0.4);ctx.restore();}}
  // ---- V80: по бокам коридора стоят САМИ аниматроники ----
  // Раньше здесь висели абстрактные пары глаз с треугольной «тенью» — существа,
  // которых в игре нет. Теперь в темноте стоят те же четыре модели, что ходят
  // по камерам: МОНСТР, ФЕЛИКС, EXO и LAV. Они не двигаются с места — только
  // проявляются из темноты по мере того, как он идёт мимо.
  [['main',0.30,-1],['felix',0.44,1],['exo',0.58,-1],['lav',0.71,1]].forEach((a,i)=>{
    const app=cl((t-T_WALK+0.4-i*0.85)/1.3);
    if(app<=0)return;
    const kk=Math.pow(a[1],1.8);
    const fy=vpY+(h-vpY)*kk;
    const fx=vpX+a[2]*(w*0.135+(w*0.46-w*0.135)*kk);
    const hFrac=0.135+0.40*kk;
    epiAnimatron(ctx,fx,fy,(h*hFrac)/(160*1.34),t,{
      kind:a[0],seed:i*2.7,face:-a[2],
      dark:0.945-0.05*app-0.02*backK,
      eye:(0.45+0.55*app)*(0.85+0.15*Math.abs(Math.sin(t*1.3+i))),
      head:a[2]*0.045,fog:0.26-0.10*kk,fogColor:'10,14,20',
      shadow:0.30,shadowDir:-a[2],alpha:(0.62+0.20*app)*(1-0.25*kk)
    });
  });
  // ---- дверь ВЫХОД в глубине: табличка гаснет, проём заложен ----
  const dw2=w*0.10*(0.6+0.9*walkK), dh2=h*0.20*(0.6+0.9*walkK);
  const dx2=vpX-dw2*0.5, dy2=vpY-h*0.01;
  ctx.fillStyle='#0a0e12';ctx.fillRect(dx2-6,dy2-6,dw2+12,dh2+12);
  if(exitK<1){
    // ещё горит
    const flick=(epiRnd(Math.floor(t*11))>0.25?1:0.3)*(1-exitK);
    ctx.save();if(!low){ctx.shadowColor='#4de07a';ctx.shadowBlur=14*flick;}
    ctx.fillStyle='rgba(94,240,138,'+(0.85*flick).toFixed(3)+')';
    ctx.font='700 '+Math.round(h*0.018*(0.6+0.9*walkK))+'px "Inter",Arial,sans-serif';ctx.textAlign='center';
    ctx.fillText('ВЫХОД',vpX,dy2-8);ctx.textAlign='left';ctx.restore();
  }
  if(exitK>0){
    // V95: проём заложен кирпичом.
    // Было: кладка #3a2a26/#2c2020 на почти чёрном коридоре #0a0e13 — светлая
    // плита, которая читалась как прямоугольник, висящий поверх стены.
    // Стало: тёмный кирпич в бетонном откосе, тень от перекрытия сверху и
    // затухание к краям — кладка сидит внутри проёма.
    ctx.save();
    ctx.globalAlpha=Math.min(1,exitK*1.4);
    ctx.fillStyle='#0b1015';ctx.fillRect(dx2-5,dy2-5,dw2+10,dh2+10);   // откос
    ctx.fillStyle='#101720';ctx.fillRect(dx2-2,dy2-2,dw2+4,dh2+4);     // рама
    ctx.fillStyle='#171213';ctx.fillRect(dx2,dy2,dw2,dh2);             // шов
    // V97: было — шахматка из двух цветов (r+q)%2, то есть светлые и тёмные
    // квадраты через один: кладка читалась как клетчатая плитка, а не как
    // заложенный проём. Стало — настоящая перевязка: ряды сдвинуты на
    // ПОЛКИРПИЧА, между кирпичами светлый шов раствора, у каждого кирпича
    // свой оттенок, сверху вниз кладка темнеет, а по свежему раствору идут
    // потёки — видно, что проём заложили недавно и наспех.
    const ROWS=8, BW=dw2/2.5, BH=dh2/ROWS;
    ctx.fillStyle='#2a2724';ctx.fillRect(dx2,dy2,dw2,dh2);            // раствор
    for(let r=0;r<ROWS;r++){
      const off=(r%2)?-BW*0.5:0;                                       // перевязка
      for(let q=-1;q<4;q++){
        const bx3=dx2+off+q*BW, by3=dy2+r*BH;
        const x0=Math.max(dx2,bx3), x1=Math.min(dx2+dw2,bx3+BW-Math.max(1,dw2*0.012));
        if(x1<=x0)continue;
        const v=epiRnd(r*7.3+q*3.1);
        const lum=0.72+0.28*v-0.30*(r/ROWS);                           // низ темнее
        const R=Math.round(46*lum),G2=Math.round(32*lum),B=Math.round(28*lum);
        ctx.fillStyle='rgb('+R+','+G2+','+B+')';
        ctx.fillRect(x0,by3,x1-x0,BH-Math.max(1,dh2*0.012));
        if(v>0.62){                                                    // блик по кромке
          ctx.fillStyle='rgba(120,104,92,.10)';
          ctx.fillRect(x0,by3,x1-x0,Math.max(1,BH*0.10));
        }
      }
    }
    ctx.fillStyle='rgba(150,146,138,.10)';                             // потёки раствора
    for(let i=0;i<5;i++){const sx3=dx2+dw2*(0.12+0.19*i);
      ctx.fillRect(sx3,dy2+dh2*(0.10+0.12*epiRnd(i*4.9)),Math.max(1,dw2*0.02),dh2*(0.06+0.10*epiRnd(i*8.1)));}
    const bs=ctx.createLinearGradient(0,dy2,0,dy2+dh2);
    bs.addColorStop(0,'rgba(0,0,0,.80)');bs.addColorStop(.34,'rgba(0,0,0,.20)');
    bs.addColorStop(1,'rgba(0,0,0,.52)');
    ctx.fillStyle=bs;ctx.fillRect(dx2,dy2,dw2,dh2);
    const bv=ctx.createRadialGradient(dx2+dw2*0.5,dy2+dh2*0.55,dw2*0.18,
                                      dx2+dw2*0.5,dy2+dh2*0.55,dw2*0.90);
    bv.addColorStop(0,'rgba(10,14,19,0)');bv.addColorStop(1,'rgba(10,14,19,.88)');
    ctx.fillStyle=bv;ctx.fillRect(dx2-7,dy2-7,dw2+14,dh2+14);
    ctx.restore();
  }else{
    ctx.fillStyle='#131a20';ctx.fillRect(dx2,dy2,dw2,dh2);
  }
  // ---- кресло охраны, куда он возвращается ----
  if(backK>0){
    ctx.save();ctx.globalAlpha=Math.min(1,backK*1.2);
    const cx2=w*0.5, cy2=h*0.86;
    ctx.fillStyle='#0e1319';ctx.fillRect(cx2-56,cy2-8,112,14);
    ctx.fillStyle='#121820';ctx.fillRect(cx2-46,cy2-92,92,86);
    ctx.fillStyle='#0a0e13';ctx.fillRect(cx2-46,cy2-92,92,8);
    ctx.fillStyle='#0b0f14';ctx.fillRect(cx2-8,cy2+6,16,26);
    ctx.restore();
  }
  // ---- охранник ----
  let px2,py2,sc2,pose2,face2=1,ph2=0,dark2=0,look2=0,lie2=0,dust2=false,rk2=1,sl2=0,lm2=0,bk2=false;
  if(t<T_WALK){                          // V74: он действительно поднимается с пола
    // V74: раньше он «висел» по диагонали в воздухе — точка опоры была на бёдрах.
    // V75: подъём идёт через опору на руку и колено (поза rise), поэтому высота
    // бёдер считается от пола: чем сильнее он согнут, тем ниже они находятся.
    px2=w*(0.255+0.030*riseK);
    py2=h*0.914-(10+14*riseK)*3*1.05;
    sc2=1.05;pose2=riseK>0.94?'stand':'rise';ph2=0;rk2=riseK;
    lie2=cl((0.26-riseK)/0.26)*0.85;      // сначала он ещё лежит на боку
    dark2=0.34-0.06*riseK;look2=0.55-0.75*riseK;
  }else if(t<T_EXIT+1.2){                // идёт по коридору от камеры
    px2=w*(0.32+0.16*walkK);py2=h*(0.86-0.24*walkK);sc2=1.05-0.55*walkK;
    pose2='walk';ph2=t*4.4;   // V76: 1.4 шага/с — он хромает и идёт медленно
    face2=1;dark2=0.55+0.30*walkK;look2=0.10;dust2=true;lm2=0.85;bk2=true;   // V79: уходит от камеры — со спины
  }else if(t<T_SIT){                      // возвращается к камере
    px2=w*(0.48-0.02*backK);py2=h*(0.62+0.26*backK);sc2=0.50+0.62*backK;
    pose2='walk';ph2=t*4.6;
    face2=-1;dark2=0.55-0.35*backK;look2=0.22;dust2=true;lm2=0.85;bk2=false;   // V79: идёт к камере — лицом
  }else{                                  // сидит в кресле
    px2=w*0.5;py2=h*0.855;sc2=1.10;pose2='sit';ph2=0;dark2=0.12;look2=0;
    sl2=cl((t-T_SIT)/3.0);                // оседает в кресле
  }
  drawGuardChar(ctx,px2,py2,sc2,{t,pose:pose2,face:face2,phase:ph2,dark:dark2,look:look2,limp:lm2,back:bk2,
    lie:lie2,dust:dust2,riseK:rk2,slump:sl2,
    shadowDir:-1,shadowLen:1.1+0.5*lie2,shadowAlpha:0.35,seed:1.7,
    rim:{dir:1,col:'90,130,170',power:0.16}});
  // Его глаза загораются, как у аниматроника. Свечение рисуется дважды: до грейда
  // (чтобы подсветить лицо) и после (иначе обесцвечивание съедает красный).
  const drawSitEyes=(mul)=>{
    const ea=sitK*(0.45+0.55*Math.abs(Math.sin(t*1.3)))*mul;
    const ex2=px2, ey2=py2-h*0.088*sc2/1.10;
    ctx.save();ctx.globalCompositeOperation='lighter';
    [[-5.5*sc2,0],[5.5*sc2,0]].forEach(e=>{
      const g=ctx.createRadialGradient(ex2+e[0],ey2,0,ex2+e[0],ey2,22*sc2);
      g.addColorStop(0,'rgba(255,58,70,'+(0.70*ea).toFixed(3)+')');g.addColorStop(1,'rgba(255,40,50,0)');
      ctx.fillStyle=g;ctx.beginPath();ctx.arc(ex2+e[0],ey2,22*sc2,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='rgba(255,196,190,'+(0.80*ea).toFixed(3)+')';
      ctx.fillRect(ex2+e[0]-2.2*sc2,ey2-1.4*sc2,4.4*sc2,2.6*sc2);});
    ctx.restore();
  };
  if(sitK>0)drawSitEyes(0.55);
  ctx.restore(); // конец наезда
  // ---- мрачный грейд: почти обесцвеченный кадр, красный пульс, срыв развёртки ----
  ctx.save();ctx.globalCompositeOperation='saturation';ctx.fillStyle='rgba(128,128,128,'+(0.26+0.18*sitK).toFixed(2)+')';ctx.fillRect(0,0,w,h);ctx.restore();
  const pulse2=0.5+0.5*Math.sin(t*1.7);
  ctx.save();ctx.globalCompositeOperation='lighter';
  const rp=ctx.createRadialGradient(w*0.5,h*1.05,10,w*0.5,h*0.9,h*1.1);
  rp.addColorStop(0,'rgba(150,14,22,'+(0.05+0.05*pulse2+0.08*sitK).toFixed(3)+')');
  rp.addColorStop(1,'rgba(120,10,18,0)');
  ctx.fillStyle=rp;ctx.fillRect(0,0,w,h);ctx.restore();
  if(!low){for(let i=0;i<3;i++){const bandY=((t*60+i*230)%(h+120))-60;
    ctx.fillStyle='rgba(255,255,255,'+(0.010+0.016*epiRnd(i*3+Math.floor(t*3))).toFixed(3)+')';
    ctx.fillRect(0,bandY,w,7+epiRnd(i+Math.floor(t*2))*18);}}
  // красный свет глаз поверх обесцвеченного кадра
  if(sitK>0){ctx.save();ctx.translate(w*0.5,h*0.5);ctx.scale(push,push);ctx.translate(-w*0.5,-h*0.5);drawSitEyes(1.0);ctx.restore();}
  if(finalK>0){ctx.save();ctx.globalAlpha=Math.min(1,finalK*1.1);ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);ctx.restore();}
  epiGrade(ctx,w,h,t,low,'rgba(20,26,40,0.10)',0.52,1.15);
  ctx.restore();
  // V101: ВСТУПИТЕЛЬНОГО ТЕКСТА В КОНЦОВКАХ БОЛЬШЕ НЕТ. Титр «ГЛАВА V — 06:00»
  // с подзаголовком объяснял словами то, что дальше показано кадрами, и первые
  // две секунды каждого финала уходили на чтение, а не на сцену.
  epiSub(ctx,w,h,t,2.4,2.0,'Он поднимается с пола. Сам. Опять.');
  epiSub(ctx,w,h,t,4.8,2.2,'Смена кончилась. Дверь открыта. За ней — ничего.');
  epiSub(ctx,w,h,t,7.4,2.0,'Они не мешают ему идти. Они просто смотрят.');
  epiSub(ctx,w,h,t,9.8,2.2,'Табличка гаснет. Выхода здесь никогда и не было.');
  // V80: субтитр про кресло стоял на 13.6, когда он ещё только разворачивался
  // обратно по коридору. Теперь текст идёт по действию.
  epiSub(ctx,w,h,t,13.4,2.2,'Он поворачивает назад. Идти больше некуда.');
  epiSub(ctx,w,h,t,16.1,2.2,'Он садится обратно в кресло. Так спокойнее.');
  // epiCard(ctx,w,h,t,T_FINAL+0.4,3.6,'КОНЦОВКА: ЕЩЁ ОДИН КОСТЮМ','СМЕНА НЕ КОНЧАЕТСЯ · СМЕРТЕЙ: '+epiDeaths(),'#e2707a');
  epiBars(ctx,w,h,1);
  epiTimecode(ctx,w,h,'NS-04 · ЗАПИСЬ ПРОДОЛЖАЕТСЯ · 06:0'+Math.min(9,Math.floor(t)),0.40);
  epiSkipHint(ctx,w,h,t);
}
// ===========================================================================
// СПОКОЙНАЯ КОНЦОВКА «РАССВЕТ» (без единой смерти) — поляна и пиццерия днём.
// ===========================================================================
function epiCalmEnding(t){
  const w=W,h=H,low=document.body.classList.contains('low-end');
  // V94: после старого финала идёт кода — новая последняя сцена (js/endings_coda.js).
  if(epiCoda('calm',t))return;
  // V101: раскадровка переписана заново и живёт в js/end_scenes.js.
  // Старый код ниже оставлен как страховка на случай, если файл не загрузился.
  if(epiScene('calm',t))return;
  const cl=v=>Math.min(1,Math.max(0,v));
  const eio=x=>x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2;
  const eo=x=>1-Math.pow(1-x,3);
  const riseP=eio(cl((t-1.6)/1.6));
  const approachP=eio(cl((t-3.2)/2.0));  // V77: с разгоном и торможением, а не рывком
  const doorOpenP=eio(cl((t-5.0)/1.2));
  const zoomP=eio(cl((t-6.0)/1.2));
  const flashP=eo(cl((t-7.0)/1.0));
  const meadowP=eio(cl((t-7.8)/1.8));
  const flashAlpha=Math.min(1,flashP)*(1-Math.min(1,meadowP));
  const finalK=cl((t-14.2)/2.0);
  epiCue(t,1.6,()=>window.AudioFX.synth?.('breath',.6));
  epiCue(t,5.0,()=>window.AudioFX.synth?.('switch',.5));
  epiCue(t,7.0,()=>window.AudioFX.synth?.('sting',.25));
  ctx.save();
  ctx.imageSmoothingEnabled=true;
  const shake=(flashP>0&&flashP<1)?2.4:0;
  ctx.translate(Math.sin(t*1.3)*1.5+Math.sin(t*17)*shake,Math.cos(t*0.9)*1.1+Math.cos(t*21)*shake);
  if(flashAlpha<1){
    // ---- офис: он поднимается и идёт к двери ----
    const doorCx=w*.715, doorCy=h*.49, z=1+0.85*zoomP;
    ctx.save();
    // Наезд «привязан» к точке двери: раньше сдвиг считался с плюсом и на зуме
    // вся сцена уезжала за правый край кадра.
    const ax=w*.5+(doorCx-w*.5)*zoomP, ay=h*.5+(doorCy-h*.5)*zoomP;
    ctx.translate(w*.5+(ax-w*.5)*0.35,h*.5+(ay-h*.5)*0.35);ctx.scale(z,z);
    ctx.translate(-ax,-ay);
    const room=ctx.createLinearGradient(0,0,0,h);room.addColorStop(0,'#030506');room.addColorStop(.62,'#111a1e');room.addColorStop(1,'#1d2629');
    ctx.fillStyle=room;ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#0b1013';ctx.fillRect(0,h*.70,w,h*.30);
    ctx.strokeStyle='rgba(120,145,148,.10)';ctx.lineWidth=1;
    for(let i=-8;i<=8;i++){ctx.beginPath();ctx.moveTo(w*.5+i*w*.08,h*.70);ctx.lineTo(w*.5+i*w*.28,h);ctx.stroke()}
    ctx.fillStyle='#0b1013';ctx.fillRect(0,0,w,h*.12);
    for(let i=0;i<5;i++){const x=w*(.12+i*.19);ctx.fillStyle='#222b2f';ctx.fillRect(x-2,h*.025,40,7);
      ctx.fillStyle='#c9b04a';ctx.fillRect(x+2,h*.027,32,3);
      if(!low){ctx.save();ctx.globalAlpha=.5;ctx.shadowColor='#e6cf78';ctx.shadowBlur=14;ctx.fillStyle='#e6cf78';ctx.fillRect(x+2,h*.027,32,3);ctx.restore();}}
    for(let i=0;i<9;i++){ctx.fillStyle='rgba(190,210,214,'+(.02+i*.0022).toFixed(3)+')';ctx.fillRect(0,h*(.24+i*.05),w,2)}
    const dx=w*.64,dy=h*.26,dw=w*.15,dh=h*.46;
    ctx.fillStyle='#303a3d';ctx.fillRect(dx-16,dy-14,dw+32,dh+28);
    ctx.fillStyle='#101417';ctx.fillRect(dx,dy,dw,dh);
    ctx.fillStyle='#394347';ctx.fillRect(dx,dy,dw*(1-doorOpenP),dh);
    if(doorOpenP>0){
      ctx.save();ctx.globalCompositeOperation='lighter';
      const spill=ctx.createRadialGradient(dx+dw*.5,dy+dh*.5,2,dx+dw*.5,dy+dh*.5,dw*1.8);
      spill.addColorStop(0,'rgba(255,224,140,'+(0.55*doorOpenP).toFixed(3)+')');
      spill.addColorStop(.4,'rgba(255,200,90,'+(0.24*doorOpenP).toFixed(3)+')');
      spill.addColorStop(1,'rgba(255,180,40,0)');
      ctx.fillStyle=spill;ctx.fillRect(dx-30,dy-30,dw+60,dh+60);ctx.restore();
      if(!low){ctx.save();ctx.globalCompositeOperation='lighter';
        for(let i=0;i<14;i++){const mx=dx+dw*0.5+Math.sin(t*1.1+i*1.7)*dw*0.4*(0.3+doorOpenP),my=dy+dh*((i*0.13+t*0.12)%1);
          ctx.globalAlpha=.15+.2*Math.abs(Math.sin(t*2+i));ctx.fillStyle='#ffe9a8';ctx.fillRect(mx,my,1.6,1.6);}ctx.restore();}
    }
    ctx.fillStyle='#e3c86c';ctx.shadowColor='#f6de8a';ctx.shadowBlur=22;ctx.fillRect(dx+dw*.48,dy+dh*.08,8,8);ctx.shadowBlur=0;
    // V80: в спокойной концовке аниматроников не было вообще — он уходил из
    // пустого офиса, и «его отпустили» никак не читалось. Теперь двое стоят
    // в темноте у левой стены: не двигаются, не подходят, только провожают.
    [['main',0.165,0.815,0.250,1],['felix',0.315,0.782,0.222,1]].forEach((a2,i)=>{
      epiAnimatron(ctx,w*a2[1],h*a2[2],(h*a2[3])/(160*1.34),t,{
        kind:a2[0],seed:i*4.3,face:a2[4],
        dark:0.90-0.06*doorOpenP,
        eye:0.20+0.10*Math.abs(Math.sin(t*0.9+i)),
        head:0.05,fog:0.22,fogColor:'14,20,24',
        shadow:0.30,shadowDir:1,alpha:0.72
      });
    });
    let px2,py2,sc2,pose2,lie2,ph2;
    if(t<3.2){px2=w*0.515;py2=h*(0.80-0.06*riseP);sc2=0.86;pose2=riseP>0.55?'rise':'stand';lie2=Math.max(0,1-riseP*1.8);ph2=0;}
    else if(t<5.2){px2=w*(0.515+0.12*approachP);py2=h*(0.74-0.06*approachP);sc2=0.86+0.10*approachP;pose2='walk';lie2=0;
      // V77: путь до двери сокращён — на прежней дистанции за 2 секунды ему
      // пришлось бы делать 4 шага в секунду, то есть переходить на бег
      ph2=epiStridePhase(w*0.12*approachP,0.91,0.52*1.25);}
    else{px2=w*0.635;py2=h*0.675;sc2=0.98;pose2='stand';lie2=0;ph2=0;}
    drawGuardChar(ctx,px2,py2,sc2,{t,pose:pose2,lie:lie2,phase:ph2,face:1,dust:pose2==='walk',
      stride:1.25,riseK:cl((riseP-0.55)/0.45),
      look:doorOpenP>0?0.6:0.1,seed:1.7,shadowDir:-1,shadowLen:1.0,
      rim:{dir:1,col:'255,220,150',power:0.30*doorOpenP}});
    ctx.restore();
  }
  if(meadowP>0){
    // ---- поляна: рассвет, пиццерия днём ----
    ctx.save();ctx.globalAlpha=meadowP;
    const sky=ctx.createLinearGradient(0,0,0,h);
    sky.addColorStop(0,'#5fa6c2');sky.addColorStop(.32,'#a9d2dd');sky.addColorStop(.5,'#dfe9c8');sky.addColorStop(.56,'#cfe0a8');sky.addColorStop(1,'#5e7e49');
    ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    const haze=ctx.createLinearGradient(0,h*.42,0,h*.60);haze.addColorStop(0,'rgba(255,250,225,.5)');haze.addColorStop(1,'rgba(220,235,200,0)');
    ctx.fillStyle=haze;ctx.fillRect(0,h*.42,w,h*.20);
    // V97: солнце стояло на 0.80w/0.16h — ровно за пиццерией, диск и вся его
    // засветка оказывались скрыты корпусом здания, и утро читалось серым.
    // Стало: солнце поднимается над КОНЬКОМ крыши, диск виден, лучи идут
    // из-за здания — направление света совпадает с тенью фигуры (влево).
    const sunX=w*.735,sunY=h*.072;
    const sun2=ctx.createRadialGradient(sunX,sunY,2,sunX,sunY,w*.42);
    sun2.addColorStop(0,'rgba(255,250,214,.95)');sun2.addColorStop(.12,'rgba(255,242,180,.6)');
    sun2.addColorStop(.35,'rgba(255,232,150,.22)');sun2.addColorStop(1,'rgba(255,232,150,0)');
    ctx.fillStyle=sun2;ctx.fillRect(0,0,w,h);
    const sun1=ctx.createRadialGradient(sunX,sunY,1,sunX,sunY,w*.16);
    sun1.addColorStop(0,'rgba(255,255,238,1)');sun1.addColorStop(1,'rgba(255,248,210,0)');
    ctx.fillStyle=sun1;ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#fffdf0';ctx.beginPath();ctx.arc(sunX,sunY,w*.02,0,Math.PI*2);ctx.fill();
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(let i=0;i<11;i++){const ang=Math.PI*0.28+i*0.045,len=w*0.7;
      ctx.fillStyle='rgba(255,247,200,'+(0.05+0.04*Math.abs(Math.sin(i*1.3+t*0.3))).toFixed(3)+')';
      ctx.beginPath();ctx.moveTo(sunX,sunY);
      ctx.lineTo(sunX+Math.cos(ang)*len-w*0.04,sunY+Math.sin(ang)*len);
      ctx.lineTo(sunX+Math.cos(ang)*len+w*0.04,sunY+Math.sin(ang)*len);ctx.closePath();ctx.fill();}
    // V97: было — шесть кругов радиусом до 9 px с альфой до 0.18, разбросанных
    // от солнца к левому низу. На кадре это читалось как белые точки, висящие
    // в воздухе над полем, а не как блик в объективе. Стало — четыре плоских
    // «призрака» на прямой солнце → центр кадра: вытянутые по этой прямой,
    // почти прозрачные, и чем дальше от солнца, тем слабее.
    if(!low){
      const cxF=w*0.5, cyF=h*0.5, dxF=cxF-sunX, dyF=cyF-sunY;
      const angF=Math.atan2(dyF,dxF);
      for(let i=1;i<=4;i++){
        const kF=i*0.42, fx=sunX+dxF*kF, fy=sunY+dyF*kF;
        ctx.globalAlpha=0.055-i*0.009;
        ctx.fillStyle=i%2?'rgba(255,242,196,1)':'rgba(206,232,255,1)';
        ctx.beginPath();ctx.ellipse(fx,fy,w*0.016+i*1.6,w*0.006+i*0.6,angF,0,Math.PI*2);ctx.fill();
      }
    }
    ctx.restore();ctx.globalAlpha=1;
    const HL=[['rgba(120,150,140,.40)',.55,.60],['rgba(70,104,76,.55)',.56,.62],['rgba(54,88,62,.72)',.58,.66],['rgba(42,72,52,.90)',.60,.70]];
    HL.forEach((hl,i)=>{ctx.fillStyle=hl[0];ctx.beginPath();ctx.moveTo(0,h*hl[2]);
      for(let k=0;k<=18;k++){const x=k*w/18;ctx.lineTo(x,h*(hl[1]-((k+i)%3)*.012));}
      ctx.lineTo(w,h*hl[2]);ctx.closePath();ctx.fill();
      if(i<3){const fg=ctx.createLinearGradient(0,h*hl[1],0,h*hl[2]);
        fg.addColorStop(0,'rgba(225,235,215,'+(0.28-i*0.07).toFixed(3)+')');fg.addColorStop(1,'rgba(225,235,215,0)');
        ctx.fillStyle=fg;ctx.fillRect(0,h*hl[1],w,(h*hl[2]-h*hl[1]));}});
    ctx.fillStyle='#3f6639';ctx.fillRect(0,h*.57,w,h*.43);
    const grassG=ctx.createLinearGradient(0,h*.58,0,h);grassG.addColorStop(0,'#9cc468');grassG.addColorStop(.5,'#5e8a3a');grassG.addColorStop(1,'#274a26');
    ctx.fillStyle=grassG;ctx.beginPath();ctx.moveTo(0,h);ctx.lineTo(w*.33,h*.58);ctx.lineTo(w*.67,h*.58);ctx.lineTo(w,h);ctx.closePath();ctx.fill();
    ctx.fillStyle='#7f8177';ctx.beginPath();ctx.moveTo(w*.28,h);ctx.lineTo(w*.47,h*.58);ctx.lineTo(w*.60,h*.58);ctx.lineTo(w*.80,h);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.16)';ctx.setLineDash([12,14]);ctx.beginPath();ctx.moveTo(w*.535,h*.60);ctx.lineTo(w*.54,h);ctx.stroke();ctx.setLineDash([]);
    // V97: дорога была ровной серой трапецией без края и без обочины, а поле
    // рядом — пустой заливкой: кадр читался как заготовка. Ниже добавлены
    // гравийная обочина по обеим кромкам, латки и трещины на асфальте,
    // штакетник вдоль поля с проволокой и столб линии до пиццерии.
    const rdL=k=>[w*(0.28+0.19*k), h*(1.00-0.42*k)];   // левая кромка дороги
    const rdR=k=>[w*(0.80-0.20*k), h*(1.00-0.42*k)];   // правая кромка
    if(!low){
      ctx.save();
      for(const side of [rdL,rdR]){                     // обочина: гравий у кромки
        for(let i=0;i<70;i++){
          const kk=(i*37%100)/100, p2=side(kk), sp=(i%2?1:-1)*w*0.004*(1-kk*0.7);
          ctx.fillStyle=(i%3)?'rgba(150,146,132,.30)':'rgba(84,88,72,.34)';
          ctx.fillRect(p2[0]+sp+(i%5)-2,p2[1]-(i%3),1.6+(1-kk)*1.4,1.4+(1-kk));
        }
      }
      for(let i=0;i<7;i++){                             // латки асфальта
        const kk=0.06+i*0.13, a=rdL(kk), b=rdR(kk), mx=a[0]+(b[0]-a[0])*(0.2+0.6*epiRnd(i*5.7));
        ctx.fillStyle='rgba(96,98,94,.20)';
        ctx.beginPath();ctx.ellipse(mx,a[1],(b[0]-a[0])*0.10,h*0.010*(1-kk*0.7),0,0,Math.PI*2);ctx.fill();
      }
      ctx.strokeStyle='rgba(40,44,42,.22)';ctx.lineWidth=1.2;
      for(let i=0;i<5;i++){                             // трещины
        const kk=0.10+i*0.17, a=rdL(kk), b=rdR(kk);
        const x0=a[0]+(b[0]-a[0])*(0.25+0.5*epiRnd(i*9.1));
        ctx.beginPath();ctx.moveTo(x0,a[1]);
        ctx.lineTo(x0+(epiRnd(i*3.3)-0.5)*w*0.03,a[1]-h*0.03*(1-kk));ctx.stroke();
      }
      ctx.restore();
      // штакетник вдоль левого поля + две нитки проволоки
      const fpts=[];
      for(let i=0;i<=13;i++){
        const kk=i/13, p2=rdL(kk);
        const px3=p2[0]-w*0.045*(1-kk*0.72), py3=p2[1]-h*0.012*(1-kk);
        const ph3=h*0.085*(1-kk*0.74);
        fpts.push([px3,py3,ph3]);
      }
      ctx.save();
      fpts.forEach((f,i)=>{
        ctx.fillStyle=i%2?'#5d5442':'#6a6049';
        ctx.fillRect(f[0],f[1]-f[2],Math.max(1.4,w*0.006*(1-i/16)),f[2]);
        ctx.fillStyle='rgba(255,238,190,.16)';           // рассветный блик на столбике
        ctx.fillRect(f[0],f[1]-f[2],Math.max(1,w*0.002),f[2]);
      });
      ctx.strokeStyle='rgba(90,82,66,.55)';ctx.lineWidth=1.1;
      for(const q2 of [0.30,0.72]){
        ctx.beginPath();
        fpts.forEach((f,i)=>{const yy=f[1]-f[2]*(1-q2);i?ctx.lineTo(f[0],yy):ctx.moveTo(f[0],yy);});
        ctx.stroke();
      }
      ctx.restore();
      // столб линии электропередачи: провод уходит к пиццерии
      {
        // V97-2: столб стоял в самом низу кадра (основание 0.965h) при высоте
        // всего 0.30h — для переднего плана он был карликовым, а провода от него
        // взлетали через всё небо и перечёркивали лицо охранника. Столб убран в
        // средний план слева (основание 0.795h), стал выше, и провода теперь
        // идут высоко над головой персонажа.
        const pxP=w*0.072, pyP=h*0.795, phP=h*0.295;
        ctx.fillStyle='#4c4636';ctx.fillRect(pxP,pyP-phP,Math.max(2,w*0.007),phP);
        ctx.fillStyle='#3f3a2c';ctx.fillRect(pxP-w*0.022,pyP-phP+h*0.018,w*0.052,Math.max(2,h*0.007));
        ctx.fillStyle='rgba(255,238,190,.18)';ctx.fillRect(pxP,pyP-phP,Math.max(1,w*0.002),phP);
        ctx.fillStyle='rgba(60,72,54,.30)';                       // тень столба по траве
        ctx.fillRect(pxP+w*0.004,pyP-h*0.004,w*0.030,Math.max(1.5,h*0.005));
        ctx.strokeStyle='rgba(28,32,28,.45)';ctx.lineWidth=1.2;
        // V97: провод раньше обрывался в небе на 0.60w/0.235h — было видно, что
        // он никуда не приходит. Теперь он приходит на КРОНШТЕЙН на фронтоне
        // пиццерии, и кронштейн нарисован; линия тоньше и бледнее, чтобы не
        // резать небо пополам.
        const axP=w*0.585, ayP=h*0.255;
        ctx.strokeStyle='rgba(28,32,28,.30)';ctx.lineWidth=1;
        for(const dd of [-0.016,0.016]){
          ctx.beginPath();ctx.moveTo(pxP+w*dd,pyP-phP+h*0.022);
          ctx.quadraticCurveTo(w*0.33,h*0.395,axP,ayP+(dd>0?h*0.012:0));ctx.stroke();
        }
        ctx.fillStyle='#2a2a24';ctx.fillRect(axP-w*0.004,ayP-h*0.004,w*0.014,Math.max(2,h*0.006));
        ctx.fillStyle='#3a3a32';ctx.fillRect(axP+w*0.008,ayP-h*0.012,Math.max(2,w*0.004),h*0.024);
      }
    }
    // пиццерия
    const bx=w*.56,by=h*.27,bw=w*.35,bh=h*.34;
    const ddx=w*0.055,ddy=-h*0.045,peakX=bx+bw*0.5,roofH=h*0.16,peakY=by-roofH;
    const bpeakX=peakX+ddx,bpeakY=peakY+ddy;
    ctx.save();ctx.globalAlpha=0.34*meadowP;ctx.fillStyle='#000';
    ctx.beginPath();ctx.ellipse(bx+bw*.5+ddx*0.5,by+bh+8,bw*.64,12,0,0,Math.PI*2);ctx.fill();ctx.restore();
    ctx.fillStyle='#3b423d';ctx.beginPath();ctx.moveTo(bx+bw,by);ctx.lineTo(bx+bw+ddx,by+ddy);ctx.lineTo(bx+bw+ddx,by+bh+ddy);ctx.lineTo(bx+bw,by+bh);ctx.closePath();ctx.fill();
    ctx.fillStyle='#2a302c';ctx.beginPath();ctx.moveTo(peakX,peakY);ctx.lineTo(bpeakX,bpeakY);ctx.lineTo(bx+bw+ddx,by+ddy);ctx.lineTo(bx+bw,by);ctx.closePath();ctx.fill();
    const gable=ctx.createLinearGradient(bx,peakY,bx,by);gable.addColorStop(0,'#4a514c');gable.addColorStop(1,'#2c322e');
    ctx.fillStyle=gable;ctx.beginPath();ctx.moveTo(bx,by);ctx.lineTo(bx+bw,by);ctx.lineTo(peakX,peakY);ctx.closePath();ctx.fill();
    const facade=ctx.createLinearGradient(bx,by,bx+bw,by+bh);facade.addColorStop(0,'#5e6560');facade.addColorStop(.55,'#3d433f');facade.addColorStop(1,'#212723');
    ctx.fillStyle=facade;ctx.fillRect(bx,by,bw,bh);
    ctx.fillStyle='#9d423b';ctx.fillRect(bx,by+bh*.20,bw,bh*.05);
    for(const q of [.10,.37,.64]){const wx=bx+bw*q,wy=by+bh*.30,ww=bw*.20,wh2=bh*.12;
      ctx.fillStyle='#3a3026';ctx.fillRect(wx-3,wy-3,ww+6,wh2+6);
      ctx.fillStyle='#e7cf84';ctx.fillRect(wx,wy,ww,wh2);
      ctx.strokeStyle='rgba(20,16,12,.7)';ctx.lineWidth=1;
      ctx.beginPath();ctx.moveTo(wx+ww*.5,wy);ctx.lineTo(wx+ww*.5,wy+wh2);
      ctx.moveTo(wx,wy+wh2*.5);ctx.lineTo(wx+ww,wy+wh2*.5);ctx.stroke();}
    const ex=bx+bw*.43,ey=by+bh*.54,ew=bw*.14,eh=bh*.46;
    ctx.fillStyle='#2a2018';ctx.fillRect(ex-4,ey-4,ew+8,eh+4);
    ctx.fillStyle='#15110d';ctx.fillRect(ex,ey,ew,eh);
    ctx.save();if(!low){ctx.shadowColor='#f7e7bd';ctx.shadowBlur=10;}
    ctx.fillStyle='#151a17';ctx.fillRect(bx+bw*.27,by-roofH*0.55,bw*.46,roofH*0.42);
    text2(ctx,'GOREВОКСЕД',bx+bw*.50,by-roofH*0.28,16,'#f7e7bd','center');ctx.restore();
    // V97: было — шесть серых кружков ровным столбиком на одной вертикали:
    // на кадре это читалось как пунктир из точек у края крыши. Стало — дым из
    // вытяжки: каждая порция всплывает по своему циклу, растёт, уходит в бок по
    // ветру и растворяется, снизу добавлена сама вытяжная труба.
    if(!low){
      // V97: вытяжка стояла на 0.79bw ниже линии крыши, и дым всплывал ПОВЕРХ
      // тёмного фронтона — светлые кружки читались как пятна на скате. Теперь
      // труба стоит на скате, а дым сразу уходит в небо над крышей.
      const vx=bx+bw*.74, vy=by-roofH*0.56;
      ctx.fillStyle='#20261f';ctx.fillRect(vx-w*.006,vy-h*.022,w*.012,h*.026);
      ctx.fillStyle='#2b322a';ctx.fillRect(vx-w*.009,vy-h*.026,w*.018,h*.007);
      ctx.save();ctx.globalCompositeOperation='lighter';   // V97: дым светится на просвет,
      for(let i=0;i<7;i++){                                 // а не мажет тёмный скат серым
        const ph=((t*0.34+i/7)%1);
        const sy2=vy-h*.034-ph*h*.24;
        const sx2=vx+ph*w*.045+Math.sin(t*.7+i)*w*.004;
        ctx.globalAlpha=0.13*(1-ph)*(0.5+0.5*Math.sin(ph*Math.PI));
        ctx.fillStyle='#b9c6bd';
        ctx.beginPath();ctx.ellipse(sx2,sy2,3+ph*14,2.4+ph*10,0,0,Math.PI*2);ctx.fill();
      }
      ctx.restore();
    }
    const sway=Math.sin(t*1.4)*0.6;
    // V97: трава и цветы раскладывались по всей ширине кадра, включая полосу
    // асфальта, — на дороге росли одуванчики. Теперь для каждой точки считается
    // ширина дороги на её высоте, и всё, что попадает на асфальт, не рисуется.
    const onRoad=(x,y)=>{const kk=(h-y)/(h*0.42);if(kk<0||kk>1)return false;
      return x>w*(0.28+0.19*kk)-2 && x<w*(0.80-0.20*kk)+2;};
    if(!low){for(let layer=0;layer<3;layer++)for(let i=0;i<90;i++){
      const x=(i*73+layer*41+t*(.8+layer*.35))%w, y=h*(.61+((i*31+layer*17)%38)/100), len=6+layer*4+(i%5);
      if(onRoad(x,y))continue;
      ctx.strokeStyle=layer===2?'rgba(208,238,155,.52)':'rgba(31,67,32,.44)';ctx.lineWidth=1+layer*.35;
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-2-layer+sway,y-len);ctx.stroke();}}
    if(!low){const fc=['#f2d24a','#e8638f','#ffffff','#c98ad8','#f59a3a'];
      for(let i=0;i<40;i++){const fx2=(i*97+t*(.4+i%3*.2))%w,fy2=h*(.62+((i*43)%34)/100);
        if(onRoad(fx2,fy2))continue;
        ctx.fillStyle=fc[i%5];ctx.beginPath();ctx.arc(fx2,fy2,1.8,0,Math.PI*2);ctx.fill();}}
    if(!low){for(let i=0;i<6;i++){const bfx=(i*191+t*(8+i%2*4))%w,bfy=h*(.55+((i*37)%18)/100)+Math.sin(t*2+i)*6;
      ctx.globalAlpha=.85;ctx.fillStyle=i%2?'#e8638f':'#f2d24a';
      ctx.beginPath();ctx.ellipse(bfx-2,bfy,3,2,t*4+i,0,Math.PI*2);ctx.ellipse(bfx+2,bfy,3,2,t*4+i,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
    // персонаж идёт по дороге от пиццерии к камере
    const walkOut=cl((t-9.4)/4.6);
    // V79: раньше он «уходил в глубину», а корпус стоял правым профилем — шаг
    // шёл вбок от направления движения. Теперь это чистый боковой кадр: он
    // уходит ВЛЕВО от пиццерии (она справа), корпус развёрнут влево, фаза шага
    // привязана к пройденному пути — ноги не проскальзывают.
    const gDist=w*0.30*walkOut, gSc=0.86+0.34*walkOut;
    const gx2=w*0.565-gDist, gy2=h*(0.70+0.10*walkOut);
    drawGuardChar(ctx,gx2,gy2,gSc,{t,
      pose:walkOut<0.92?'walk':'stand',phase:epiStridePhase(gDist,gSc),face:-1,dust:true,
      look:walkOut>0.9?-0.55:0.18,seed:1.7,shadowDir:-1,shadowLen:1.1,shadowAlpha:0.4,
      rim:{dir:1,col:'255,236,170',power:0.34}});
    if(!low){ctx.strokeStyle='rgba(174,214,118,.6)';
      for(let i=0;i<28;i++){const x=w*.30+(i*19)%w,y=h*(.80+((i*11)%14)/100);
        ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+2+sway,y-12-(i%5));ctx.stroke();}}
    {const sf=ctx.createLinearGradient(0,h*.55,0,h*.70);
      sf.addColorStop(0,'rgba(228,238,214,.34)');sf.addColorStop(1,'rgba(228,238,214,0)');
      ctx.fillStyle=sf;ctx.fillRect(0,h*.55,w,h*.16);
      const wg=ctx.createLinearGradient(w,0,0,h);
      wg.addColorStop(0,'rgba(255,236,178,.16)');wg.addColorStop(.5,'rgba(255,242,204,.05)');wg.addColorStop(1,'rgba(46,74,50,.14)');
      ctx.fillStyle=wg;ctx.fillRect(0,0,w,h);}
    ctx.restore();
  }
  if(flashAlpha>0){ctx.save();ctx.globalAlpha=flashAlpha;ctx.fillStyle='#ffffff';ctx.fillRect(0,0,w,h);ctx.restore();}
  if(finalK>0){ctx.save();ctx.globalAlpha=Math.min(1,finalK);ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);ctx.restore();}
  epiGrade(ctx,w,h,t,low,null,0.30-0.14*meadowP,1);
  ctx.restore();
  // V101: ВСТУПИТЕЛЬНОГО ТЕКСТА В КОНЦОВКАХ БОЛЬШЕ НЕТ. Титр «ГЛАВА V — 06:00»
  // с подзаголовком объяснял словами то, что дальше показано кадрами, и первые
  // две секунды каждого финала уходили на чтение, а не на сцену.
  epiSub(ctx,w,h,t,2.4,2.0,'Он поднимается с пола и идёт к двери сам.');
  epiSub(ctx,w,h,t,5.2,1.9,'Дверь открывается. Просто открывается.');
  epiSub(ctx,w,h,t,9.6,2.4,'Пять смен позади. Поляна. Пиццерия. Тишина.');
  epiSub(ctx,w,h,t,13.3,2.3,'Он оглядывается один раз. Больше не нужно.');
  // epiCard(ctx,w,h,t,13.4,3.0,'КОНЦОВКА: РАССВЕТ','ОН ВЫШЕЛ И БОЛЬШЕ НЕ ВЕРНУЛСЯ','#f8f7df');
  epiBars(ctx,w,h,1);
  epiTimecode(ctx,w,h,'NS-04 · СМЕНА 5/5 · 06:0'+Math.min(9,Math.floor(t)),0.4);
  epiSkipHint(ctx,w,h,t);
}
// ===========================================================================
// V74: ЭКРАН ВЫБОРА КОНЦОВКИ (5 И БОЛЬШЕ СМЕРТЕЙ)
// Игрок сам решает, каким будет финал: остаться в кресле или надеть костюм.
// ===========================================================================
// V84: ПЯТЬ КОНЦОВОК ВМЕСТО ДВУХ КАРТОЧЕК.
// Было: экран выбора появлялся только при пяти смертях и предлагал два финала,
// а остальные два включались автоматически по числу смертей — игрок никогда
// не видел их все и не выбирал сам. Пятой концовки не существовало вовсе.
// Стало: после пятой смены всегда открывается экран выбора со всеми пятью
// финалами, у каждого — своя сцена, свой титр и своё достижение.
const EPI_CHOICES=[
  {id:'calm',title:'РАССВЕТ',sub:'ОН ПРОСТО ВЫХОДИТ',
   line1:'Дверь откроется. За ней будет утро и поляна.',
   line2:'Он оглянётся один раз — и уйдёт.',col:'#e8dfa8',glow:'226,206,130'},
  {id:'burn',title:'ПЕПЕЛ',sub:'ОН СЖИГАЕТ ПИЦЦЕРИЮ',
   line1:'Канистра, спичка, огонь по полу зала.',
   line2:'Он смотрит на пожар с улицы и не уходит.',col:'#e88a4a',glow:'226,120,60'},
  {id:'truth',title:'ПРАВДА',sub:'ОН ЗАБИРАЕТ ЗАПИСЬ',
   line1:'В архиве под залом лежит кассета 1993 года.',
   line2:'Он вынесет её к синим огням на парковке.',col:'#7fc7d8',glow:'110,190,214'},
  {id:'dark',title:'ЕЩЁ ОДИН КОСТЮМ',sub:'ОН ВОЗВРАЩАЕТСЯ В КРЕСЛО',
   line1:'Он дойдёт до выхода и увидит, что выхода нет.',
   line2:'Смена не кончится никогда.',col:'#c8545e',glow:'190,60,66'},
  {id:'trap',title:'КОСТЮМ-ЛОВУШКА',sub:'ОН НАДЕВАЕТ КОСТЮМ САМ',
   line1:'Он убежит на склад и найдёт там пустой костюм.',
   line2:'Он засмеётся им в лицо — за секунду до щелчка.',col:'#dfa46a',glow:'214,150,70'}
];
// V84: пять карточек в один ряд — ширина считается от экрана, чтобы на
// узких окнах карточки сжимались, а не уезжали за край.
function epiChoiceRects(){
  const n=EPI_CHOICES.length;
  const gap=Math.max(8,W*0.012), margin=Math.max(14,W*0.030);
  const cw=(W-margin*2-gap*(n-1))/n, ch=H*0.52, y=H*0.255;
  const r=[];
  for(let i=0;i<n;i++)r.push({x:margin+i*(cw+gap),y,w:cw,h:ch});
  return r;
}
function epiChoiceMove(d){
  const n=EPI_CHOICES.length;
  const ni=(G.choiceIdx+d+n)%n;
  if(ni!==G.choiceIdx){G.choiceIdx=ni;try{window.AudioFX.play('click',.22,{group:'ui'})}catch(e){}}
}
function epiChoiceClick(){
  const r=epiChoiceRects();
  const mx=(G.mouse?G.mouse.x:0)*W, my=(G.mouse?G.mouse.y:0)*H;
  for(let i=0;i<r.length;i++){
    if(hitRect(mx,my,r[i].x,r[i].y,r[i].w,r[i].h)){
      if(G.choiceIdx!==i){G.choiceIdx=i;try{window.AudioFX.play('click',.22,{group:'ui'})}catch(e){}return;}
      epiChoosePick();return;
    }
  }
}
function epiChoosePick(){
  if((G.choiceT||0)<0.6)return;                 // защита от случайного клика
  const v=EPI_CHOICES[G.choiceIdx||0].id;
  G.epiVariant=v;
  G.epiDur=epiDuration(v);
  G.epilogueTimer=0;
  G._epiCues={};
  window.SaveSystem.data.lastEnding=v;
  window.SaveSystem.data.menuVariant='epilogue';
  G.menuVariant='epilogue';
  // V84: у каждой из пяти концовок своё достижение
  G.ach({calm:'ending_dawn',burn:'ending_ash',truth:'ending_truth',dark:'ending_suit',trap:'ending_trap'}[v]||'ending_dawn');
  window.SaveSystem.save();
  try{window.AudioFX.synth?.('sting',.55)}catch(e){}
  G.state='epilogue';
}
// ===========================================================================
// V84: ПЯТАЯ КОНЦОВКА — «ПРАВДА».
// Раньше финалов было четыре, и все четыре кончались либо пожаром, либо
// костюмом: игра ни разу не отвечала, что вообще случилось в этой пиццерии.
// Здесь охранник спускается в архив под залом, вскрывает шкаф, находит
// кассету 1993 года, смотрит запись на служебном мониторе и выносит её
// наружу — к мигалкам на парковке. Аниматроники стоят у него за спиной
// и не мешают: запись нужна и им.
// Раскадровка: титр -> архив, он идёт с фонарём -> вскрывает шкаф ->
// кассета -> монитор и отчёт -> четверо за спиной -> выход к мигалкам -> титр.
// ===========================================================================
function epiTruthEnding(t){
  // V84: раскадровка живёт в js/endings_truth.js — см. комментарий в этом файле
  // про оптимизацию V8. Здесь остаётся только передача помощников.
  // V94: после 30-й секунды идёт кода «шестое имя» (js/endings_coda.js).
  if(epiCoda('truth',t))return;
  if(!window.EndingTruth)return;
  window.EndingTruth({ctx,w:W,h:H,low:document.body.classList.contains('low-end'),
    epiCue,epiRnd,epiStridePhase,epiAnimatron,drawGuardChar,
    epiCard,epiSub,epiGrade,epiBars,epiTimecode,epiSkipHint},t);
}
// V84: перенос текста по центру внутри узкой карточки. Возвращает Y последней
// строки, чтобы следующий блок текста не наезжал на предыдущий.
function epiWrapCenter(c,txt,cx,y,maxW,lh){
  // V84: строка переводится ДО переноса по словам. Раньше перенос резал русскую
  // фразу на куски, и словарь её уже не узнавал: на карточках финалов половина
  // описаний оставалась русской, а отдельные слова подменялись по фрагментам
  // («на склад» превращалось в «на Storage»). Теперь переводится вся фраза.
  try{txt=window.T?window.T(String(txt)):txt;}catch(e){}
  const words=String(txt).split(/\s+/);
  let line='',cy=y;
  for(const w of words){
    const test=line?line+' '+w:w;
    if(c.measureText(test).width>maxW&&line){c.fillText(line,cx,cy);line=w;cy+=lh;}
    else line=test;
  }
  if(line)c.fillText(line,cx,cy);
  return cy+lh;   // Y следующей свободной строки
}
// V84: превью-иллюстрация карточки для каждой из пяти концовок.
function epiChoicePreview(id,pvx,pvy,pvw,pvh,t,low){
  const c=ctx;
  const base=c.createLinearGradient(pvx,pvy,pvx,pvy+pvh);
  const tone={calm:['#16202a','#050810'],burn:['#1c1210','#080405'],
    truth:['#0c1720','#03080c'],dark:['#0c1016','#04060a'],trap:['#141014','#04060a']}[id]||['#0c1016','#04060a'];
  base.addColorStop(0,tone[0]);base.addColorStop(1,tone[1]);
  c.fillStyle=base;c.fillRect(pvx,pvy,pvw,pvh);
  const glowRect=(cx,cy,r,col,a)=>{c.save();c.globalCompositeOperation='lighter';
    const g=c.createRadialGradient(cx,cy,1,cx,cy,r);
    g.addColorStop(0,'rgba('+col+','+a+')');g.addColorStop(1,'rgba('+col+',0)');
    c.fillStyle=g;c.fillRect(pvx,pvy,pvw,pvh);c.restore();};
  if(id==='calm'){
    // открытая дверь, за ней утро
    c.fillStyle='#0a0f14';c.fillRect(pvx,pvy+pvh*0.72,pvw,pvh*0.28);
    c.fillStyle='#20282e';c.fillRect(pvx+pvw*0.52,pvy+pvh*0.18,pvw*0.30,pvh*0.62);
    c.fillStyle='#f4e3a6';c.fillRect(pvx+pvw*0.56,pvy+pvh*0.22,pvw*0.22,pvh*0.56);
    glowRect(pvx+pvw*0.67,pvy+pvh*0.48,pvw*0.55,'255,226,150',0.42);
    drawGuardChar(c,pvx+pvw*0.34,pvy+pvh*0.80,pvh/150,{t,pose:'walk',phase:t*2.2,face:1,
      seed:1.7,shadowDir:-1,shadowAlpha:0.35,rim:{dir:1,col:'255,226,160',power:0.34}});
  }else if(id==='burn'){
    // силуэт в огне зала
    c.fillStyle='#0b0706';c.fillRect(pvx,pvy+pvh*0.70,pvw,pvh*0.30);
    for(let q=0;q<3;q++){c.fillStyle='#150d0a';c.fillRect(pvx+pvw*(0.08+q*0.32),pvy+pvh*0.36,pvw*0.14,pvh*0.36);}
    drawFlames(c,pvx,pvy+pvh*0.52,pvw,pvh*0.48,t,0.85,3.1);
    glowRect(pvx+pvw*0.5,pvy+pvh*0.82,pvw*0.75,'255,140,50',0.5);
    drawGuardChar(c,pvx+pvw*0.30,pvy+pvh*0.86,pvh/165,{t,pose:'run',phase:t*4.6,face:-1,
      dark:0.55,seed:2.2,shadowAlpha:0.25,rim:{dir:-1,col:'255,150,60',power:0.5}});
  }else if(id==='truth'){
    // архив: полки и кассета в свете фонаря
    c.fillStyle='#070d12';c.fillRect(pvx,pvy+pvh*0.74,pvw,pvh*0.26);
    for(let q=0;q<4;q++){c.fillStyle='#0e161d';c.fillRect(pvx+pvw*(0.05+q*0.24),pvy+pvh*0.16,pvw*0.18,pvh*0.58);
      for(let r=0;r<4;r++){c.fillStyle=r%2?'#1b2730':'#16212a';c.fillRect(pvx+pvw*(0.06+q*0.24),pvy+pvh*(0.20+r*0.13),pvw*0.16,pvh*0.09);}}
    glowRect(pvx+pvw*0.62,pvy+pvh*0.42,pvw*0.5,'110,190,214',0.34);
    c.fillStyle='#0b1116';c.fillRect(pvx+pvw*0.56,pvy+pvh*0.40,pvw*0.16,pvh*0.11);
    c.fillStyle='#8fd6e6';c.fillRect(pvx+pvw*0.585,pvy+pvh*0.425,pvw*0.11,pvh*0.06);
    drawGuardChar(c,pvx+pvw*0.34,pvy+pvh*0.82,pvh/155,{t,pose:'stand',face:1,
      seed:0.9,look:0.5,shadowDir:1,shadowAlpha:0.3,rim:{dir:1,col:'150,210,230',power:0.4}});
  }else if(id==='dark'){
    // коридор и заложенная дверь
    c.fillStyle='#0a0e13';c.beginPath();c.moveTo(pvx,pvy+pvh);c.lineTo(pvx+pvw,pvy+pvh);
    c.lineTo(pvx+pvw*0.62,pvy+pvh*0.52);c.lineTo(pvx+pvw*0.38,pvy+pvh*0.52);c.closePath();c.fill();
    c.fillStyle='#291d1c';c.fillRect(pvx+pvw*0.42,pvy+pvh*0.30,pvw*0.16,pvh*0.24);
    for(let q=0;q<5;q++){c.fillStyle=q%2?'#3a2a26':'#2c2020';
      c.fillRect(pvx+pvw*0.42,pvy+pvh*(0.30+q*0.048),pvw*0.16,pvh*0.038);}
    drawGuardChar(c,pvx+pvw*0.50,pvy+pvh*0.95,pvh/175,{t,pose:'sit',face:-1,dark:0.35,
      shadowAlpha:0.3,seed:3.1,rim:{dir:1,col:'150,40,44',power:0.22}});
    glowRect(pvx+pvw*0.50,pvy+pvh*0.86,pvw*0.35,'255,58,66',(0.5+0.3*Math.sin(t*2.4)).toFixed(3));
  }else{
    // склад и висящий костюм
    c.fillStyle='#100d0c';c.fillRect(pvx,pvy+pvh*0.62,pvw,pvh*0.38);
    for(let q=0;q<3;q++){c.fillStyle='#171310';c.fillRect(pvx+pvw*(0.06+q*0.30),pvy+pvh*0.24,pvw*0.16,pvh*0.40);}
    // V88: у костюма выросли уши, поэтому делитель увеличен — иначе кончики
    // ушей срезались верхней кромкой превью
    epiRackSuit(c,pvx+pvw*0.5,pvy+pvh*0.92,pvh/235,t,{sway:0.5});
    glowRect(pvx+pvw*0.5,pvy+pvh*0.10,pvw*0.5,'255,206,150',0.30);
  }
}
function drawEndingChoice(){
  const w=W,h=H,t=G.choiceT||0;
  const low=document.body.classList.contains('low-end');
  const cl=v=>Math.min(1,Math.max(0,v));
  const eo=x=>1-Math.pow(1-x,3);
  const inK=eo(cl(t/1.1));
  // фон: чёрный зал, две дальние двери, к каждой ведёт своя дорога
  const bg=ctx.createLinearGradient(0,0,0,h);
  bg.addColorStop(0,'#04060a');bg.addColorStop(.55,'#080b11');bg.addColorStop(1,'#020304');
  ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
  ctx.save();ctx.globalAlpha=0.42;
  for(let i=0;i<EPI_CHOICES.length;i++){
    const cxx=w*(0.12+i*0.19), col=EPI_CHOICES[i].glow;
    const g=ctx.createRadialGradient(cxx,h*0.52,10,cxx,h*0.52,h*0.72);
    g.addColorStop(0,'rgba('+col+',0.14)');g.addColorStop(1,'rgba('+col+',0)');
    ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  }
  ctx.restore();
  if(!low){for(let i=0;i<40;i++){
    const dx=(i*137+t*9)%w, dy=h*((i*53%96)/100)+Math.sin(t*0.6+i)*8;
    ctx.fillStyle='rgba(190,190,200,'+(0.02+0.05*Math.abs(Math.sin(t*0.9+i))).toFixed(3)+')';
    ctx.fillRect(dx,dy,1.5,1.5);}}
  // заголовок
  ctx.save();ctx.globalAlpha=cl(t/0.8);ctx.textAlign='center';
  ctx.font='700 '+Math.round(h*0.048)+'px "Oswald",Impact,sans-serif';
  ctx.fillStyle='rgba(0,0,0,.6)';ctx.fillText('ПЯТЬ СМЕН ПРОЙДЕНЫ',w*0.5+2,h*0.155+2);
  ctx.fillStyle='#ece5d8';ctx.fillText('ПЯТЬ СМЕН ПРОЙДЕНЫ',w*0.5,h*0.155);
  ctx.font='600 '+Math.round(h*0.021)+'px "JetBrains Mono",monospace';
  ctx.fillStyle='rgba(206,200,190,.78)';
  ctx.fillText('СМЕРТЕЙ ЗА ПРОХОЖДЕНИЕ: '+epiDeaths()+'  ·  ПЯТЬ ФИНАЛОВ  ·  ВЫБЕРИТЕ, ЧЕМ ЭТО КОНЧИТСЯ',w*0.5,h*0.205);
  ctx.textAlign='left';ctx.restore();
  // карточки
  const rects=epiChoiceRects();
  const mx=(G.mouse?G.mouse.x:0)*w, my=(G.mouse?G.mouse.y:0)*h;
  // V84: массив подсветки заводится по числу карточек — при пяти финалах
  // старый [0,0] давал undefined и вся отрисовка падала на третьей карточке.
  if(!G._choiceHoverT||G._choiceHoverT.length!==EPI_CHOICES.length)G._choiceHoverT=EPI_CHOICES.map(()=>0);
  rects.forEach((r,i)=>{
    const C=EPI_CHOICES[i];
    const over=hitRect(mx,my,r.x,r.y,r.w,r.h)?1:0;
    if(over&&G.choiceIdx!==i)G.choiceIdx=i;
    const act=G.choiceIdx===i?1:0;
    G._choiceHoverT[i]+=(act-G._choiceHoverT[i])*0.18;
    const hv=G._choiceHoverT[i];
    const p=cl((t-0.2-i*0.16)/0.7), e=p<=0?0:eo(p);
    if(e<=0)return;
    ctx.save();ctx.globalAlpha=e;
    const rx=r.x, ry=r.y+(1-e)*40-hv*8, rw=r.w, rh=r.h;
    // подсветка выбранной карточки
    if(hv>0.02){ctx.save();ctx.globalAlpha=e*(0.16+0.20*hv)*(0.75+0.25*Math.sin(t*3));
      ctx.fillStyle='rgba('+C.glow+',1)';
      if(!low){ctx.shadowColor='rgba('+C.glow+',1)';ctx.shadowBlur=34*hv;}
      roundedRect(ctx,rx-6,ry-6,rw+12,rh+12,16,'rgba('+C.glow+',0.30)');ctx.restore();}
    roundedRect(ctx,rx,ry,rw,rh,14,'rgba(10,13,18,0.92)','rgba('+C.glow+','+(0.30+0.55*hv).toFixed(2)+')',2);
    // V84: превью и подписи пересчитаны под пять узких карточек: картинка
    // занимает верх, заголовок переносится по словам, кнопка не вылезает.
    ctx.save();
    ctx.beginPath();
    const pvx=rx+8,pvy=ry+8,pvw=rw-16,pvh=rh*0.40;
    if(typeof ctx.roundRect==='function'){ctx.roundRect(pvx,pvy,pvw,pvh,9);}else{ctx.rect(pvx,pvy,pvw,pvh);}
    ctx.clip();
    epiChoicePreview(C.id,pvx,pvy,pvw,pvh,t,low);
    ctx.fillStyle='rgba(0,0,0,.30)';ctx.fillRect(pvx,pvy,pvw,pvh*0.16);
    ctx.restore();
    // текст карточки
    ctx.textAlign='center';
    const cx=rx+rw*0.5;
    let ty=ry+pvh+Math.round(h*0.046);
    ctx.font='700 '+Math.round(h*0.0245)+'px "Oswald",Impact,sans-serif';
    ctx.fillStyle=hv>0.5?'#fff6ea':'#ded6c8';
    ty=epiWrapCenter(ctx,C.title,cx,ty,rw-20,Math.round(h*0.029))+Math.round(h*0.006);
    ctx.font='600 '+Math.round(h*0.0128)+'px "JetBrains Mono",monospace';
    ctx.fillStyle='rgba('+C.glow+',0.95)';
    ty=epiWrapCenter(ctx,C.sub,cx,ty,rw-16,Math.round(h*0.019))+Math.round(h*0.010);
    ctx.font=Math.round(h*0.0145)+'px "Inter",Arial,sans-serif';
    ctx.fillStyle='rgba(196,192,186,.86)';
    ty=epiWrapCenter(ctx,C.line1,cx,ty,rw-22,Math.round(h*0.022));
    ctx.fillStyle='rgba(170,166,160,.76)';
    epiWrapCenter(ctx,C.line2,cx,ty,rw-22,Math.round(h*0.022));
    // кнопка внутри карточки
    const bh2=Math.max(28,rh*0.088), by2=ry+rh-bh2-11;
    roundedRect(ctx,rx+rw*0.10,by2,rw*0.80,bh2,9,
      hv>0.5?'rgba('+C.glow+',0.26)':'rgba(255,255,255,0.05)',
      'rgba('+C.glow+','+(0.35+0.5*hv).toFixed(2)+')',1.5);
    ctx.font='700 '+Math.round(h*0.0165)+'px "Inter",Arial,sans-serif';
    ctx.fillStyle=hv>0.5?'#fff':'#b9b3aa';
    ctx.fillText('ВЫБРАТЬ ['+(i+1)+']',cx,by2+bh2*0.68);
    ctx.textAlign='left';ctx.restore();
  });
  // подсказка управления
  ctx.save();ctx.globalAlpha=cl((t-1.0)/0.8)*(0.55+0.2*Math.sin(t*2.2));ctx.textAlign='center';
  ctx.font='600 '+Math.round(h*0.018)+'px "JetBrains Mono",monospace';
  ctx.fillStyle='#cbc5b8';
  ctx.fillText('← → ВЫБОР   ·   1…5 — БЫСТРЫЙ ВЫБОР   ·   ENTER / ПРОБЕЛ — ПОДТВЕРДИТЬ',w*0.5,h*0.845);
  ctx.textAlign='left';ctx.restore();
  ctx.save();ctx.globalAlpha=0.8*inK;epiBars(ctx,w,h,0.6);ctx.restore();
  epiGrade(ctx,w,h,t,low,'rgba(14,16,24,0.10)',0.46,0.8);
  scan();
}
// ===========================================================================
// V74: РЕКВИЗИТ ДЛЯ КОНЦОВКИ «КОСТЮМ-ЛОВУШКА»
// ===========================================================================
// Пустой пружинный костюм на стойке: голова медведя, обвисшее тело, крюк.
// ===========================================================================
// V88: ЕДИНАЯ МЕТРИКА РОСТА В КОНЦОВКАХ
// ---------------------------------------------------------------------------
// Раньше рост охранника и рост аниматроника задавались независимыми
// множителями «на глаз», и в кадре человек то оказывался выше робота, то
// проваливался ногами ниже линии пола: якорь фигуры считали как 24*3*scale,
// хотя ступни на самом деле лежат на 93*scale пикселя ниже точки якоря, да ещё
// и с поправкой FIT=min(1,H/560) на низком экране телефона. Отсюда и брались
// «глупые» пропорции. Теперь и человек, и робот задаются РОСТОМ В ПИКСЕЛЯХ,
// а масштаб выводится из него — фигуры сходятся на одной линии пола на любом
// экране. Значения EPI_G_* сняты замером спрайта, а не подобраны.
const EPI_G_FEET=93, EPI_G_H=229;   // ступни ниже якоря / полный рост при scale=1
const EPI_MON_H=214.4;              // 160 юнитов модели × 1.34 внутри epiAnimatron
function epiFit(){return Math.min(1,H/560);}
function epiGuardScale(px){return px/(EPI_G_H*epiFit());}
function epiGuardFeet(sc){return EPI_G_FEET*sc*epiFit();}
function epiGuardH(sc){return EPI_G_H*sc*epiFit();}
function epiMonScale(px){return px/EPI_MON_H;}
// Палитра костюма ЗАЙЦА. V88: раньше на стойке висел медведь — круглые уши,
// широкая морда, бурый мех. В тексте концовки и в маске игрока это заяц,
// поэтому костюм переписан: длинные стоячие уши, узкая морда, два передних
// зуба, выгоревший золотисто-горчичный мех.
const SUIT_D='#4a3f1c', SUIT_M='#68592a', SUIT_L='#877234', SUIT_H='#a38c3f',
      SUIT_EAR='#7a4a54', SUIT_TEETH='#ded6bd', SUIT_NOSE='#191309',
      SUIT_SOCK='#08070a', SUIT_MECH='#3c4450';
function epiCl01(v){return v<0?0:v>1?1:v;}
// Костюм зайца на стойке: обвисший, пустой, уши свесились набок.
function epiRackSuit(c,x,y,scale,t,o){
  o=o||{};
  const U=3.0*scale;
  const sw=Math.sin(t*0.7)*(o.sway===undefined?1:o.sway);
  c.save();c.translate(x,y);c.scale(U,U);c.rotate(sw*0.02);
  // крюк и трос
  c.strokeStyle='#2a2622';c.lineWidth=0.8;
  c.beginPath();c.moveTo(0,-30);c.lineTo(0,-48);c.stroke();
  // тело костюма (обвисшее)
  c.fillStyle=SUIT_M;c.fillRect(-9,-30,18,20);
  c.fillStyle=SUIT_D;c.fillRect(4,-30,5,20);
  c.fillStyle=SUIT_L;c.fillRect(-9,-30,3,20);
  c.fillStyle=SUIT_H;c.fillRect(-6,-22,12,7);              // светлое брюхо
  // руки болтаются
  c.fillStyle='#5b4d24';c.fillRect(-13,-29,4,17);c.fillRect(9,-29,4,17);
  c.fillStyle=SUIT_D;c.fillRect(-13.5,-13,5,3);c.fillRect(8.5,-13,5,3);
  // ноги
  c.fillStyle='#544823';c.fillRect(-7,-11,5.5,11);c.fillRect(1.5,-11,5.5,11);
  c.fillStyle=SUIT_D;c.fillRect(-8.4,-1,7.6,2.6);c.fillRect(0.8,-1,7.6,2.6);
  // ---- голова зайца ----
  c.fillStyle=SUIT_M;c.fillRect(-7,-42,14,12);
  c.fillStyle=SUIT_D;c.fillRect(3,-42,4,12);
  c.fillStyle=SUIT_L;c.fillRect(-7,-42,2.6,12);
  // длинные уши: на пустом костюме они свесились и заломились
  [[-3.6,-0.30],[3.0,0.22]].forEach(E=>{
    c.save();c.translate(E[0],-41);c.rotate(E[1]+sw*0.05);
    c.fillStyle=SUIT_M;c.fillRect(-1.8,-15,3.6,15);
    c.fillStyle=SUIT_L;c.fillRect(-1.8,-15,1.1,15);
    c.fillStyle=SUIT_EAR;c.fillRect(-0.9,-13.4,1.8,11.4);
    c.restore();});
  // узкая морда и два передних зуба
  c.fillStyle=SUIT_H;c.fillRect(-3.8,-34.4,7.6,4.6);
  c.fillStyle=SUIT_NOSE;c.fillRect(-1.3,-34.0,2.6,1.8);
  c.fillStyle=SUIT_TEETH;c.fillRect(-1.9,-30.6,1.6,2.4);c.fillRect(0.3,-30.6,1.6,2.4);
  // пустые глазницы — внутри виден механизм
  c.fillStyle=SUIT_SOCK;c.fillRect(-5.0,-39.4,3.4,2.8);c.fillRect(1.6,-39.4,3.4,2.8);
  c.fillStyle=SUIT_MECH;c.fillRect(-4.4,-38.6,1.0,1.5);c.fillRect(2.2,-38.6,1.0,1.5);
  // усы-щетинки
  c.strokeStyle='rgba(226,214,180,.30)';c.lineWidth=0.22;
  for(let i=0;i<3;i++){c.beginPath();c.moveTo(-3.6,-32.6+i*1.1);c.lineTo(-7.2,-33.4+i*1.4);c.stroke();
    c.beginPath();c.moveTo(3.6,-32.6+i*1.1);c.lineTo(7.2,-33.4+i*1.4);c.stroke();}
  // пружины и стержни, выглядывающие из швов
  c.strokeStyle='#7d8794';c.lineWidth=0.35;
  for(let i=0;i<4;i++){c.beginPath();
    const bx=-7+i*4.6;
    for(let q=0;q<6;q++){const yy=-28+q*0.9;q?c.lineTo(bx+(q%2?1.1:-1.1),yy):c.moveTo(bx,yy);}
    c.stroke();}
  c.restore();
}
// Аниматроник-силуэт для финальной сцены: тёмный корпус, горящие глаза.
// V80: раньше в эпилоге стояли самодельные куклы-медведи (три палитры, плоские
// прямоугольники), а на камерах в игре — совсем другие модели: МОНСТР, ФЕЛИКС,
// EXO и LAV. Из-за этого концовки выглядели как другая игра. Теперь epiAnimatron
// — тонкая обёртка над той же drawGroundedMonster/drawPixelMonster, что рисует
// аниматроников на камерах: одна модель, одна палитра, одни глаза.
const EPI_KINDS=['main','felix','exo','lav'];
function epiAnimatron(c,x,y,scale,t,o){
  o=o||{};
  const kind=(typeof o.kind==='string')?o.kind:EPI_KINDS[((o.kind|0)%4+4)%4];
  const seed=o.seed||0;
  // модель на камерах шире кукольной, поэтому масштаб приведён так, чтобы
  // фигура занимала в кадре ровно столько же места, сколько прежняя.
  const sc=scale*1.34;
  const mon={kind,state:o.alarmed?'preparingAttack':'moving',warning:0};
  // У LAV на футболке написано «LAV» — при зеркальном развороте надпись читалась
  // задом наперёд, поэтому его модель никогда не отражается.
  const face=(kind==='lav')?1:o.face;
  drawGroundedMonster(c,x,y,mon,sc,{
    face:face,
    dark:(o.dark===undefined?0.72:o.dark)*0.82,
    eyeK:(o.eye===undefined?1:o.eye),
    lean:(o.head||0)*0.55+Math.sin(t*0.5+seed)*0.006,
    footTint:0.62,topTint:0.24,
    fog:Math.max(0,Math.min(0.34,o.fog===undefined?0.10:o.fog)),
    fogColor:o.fogColor||'30,26,32',
    aura:o.aura,
    shadow:o.shadow===undefined?0.72:o.shadow,
    shadowDir:o.shadowDir===undefined?((face===undefined?1:face)>=0?-1:1):o.shadowDir,
    alpha:o.alpha===undefined?0.97:o.alpha
  });
}
// ===========================================================================
// V88: КОСТЮМ, НАДЕТЫЙ НА ОХРАННИКА — ПЕРЕПИСАН ЦЕЛИКОМ
// ---------------------------------------------------------------------------
// Что было не так:
//  1) юнит костюма считался как 3.0*scale, а у drawGuardChar — 3.0*scale*1.26*FIT.
//     Костюм выходил на 79% от размера тела: голова садилась маленькой шапочкой,
//     из-под корпуса торчали джинсы и ботинки охранника. Именно это и выглядело
//     «глупо». Теперь юнит ОДИН И ТОТ ЖЕ, костюм садится по фигуре.
//  2) штанин у костюма не было вовсе — только корпус и рукава.
//  3) весь костюм проявлялся одним куском по alpha=k, поэтому «надевание»
//     читалось как наклейка, а не как действие. Теперь пять стадий:
//     штанины → корпус на плечи → руки в рукава → голова опускается → осадка.
//  4) голова была медвежьей. Теперь заяц: длинные стоячие уши, узкая морда.
//  5) добавлен yaw — доворот головы костюма в сторону. Без него на кадре смеха
//     маска смотрела строго в зал, хотя аниматроники стоят слева.
function epiWornSuit(c,x,y,scale,t,o){
  o=o||{};
  const FIT=Math.min(1,H/560);
  const U=3.0*scale*1.26*FIT;
  const k=epiCl01(o.k===undefined?1:o.k);
  if(k<=0)return;
  const face=(o.face===undefined?1:o.face)>=0?1:-1;
  const lean=o.lean||0, bob=o.bob||0, tilt=o.tilt||0;
  const yaw=Math.max(-1,Math.min(1,o.yaw||0));
  // Сглаживание стадий ровно то же, что в позе 'wear' у drawGuardChar, иначе
  // руки и опускающаяся голова расходятся во времени: маска уже поехала вниз,
  // а руки её ещё не подняли.
  const eas=v=>v<.5?2*v*v:1-Math.pow(-2*v+2,2)/2;
  const S=(a,b)=>eas(epiCl01((k-a)/(b-a)));
  const legK=S(0.00,0.24), bodyK=S(0.18,0.52), armK=S(0.44,0.72),
        headK=S(0.60,0.94), setK=S(0.90,1.00);
  // Метрика тела в тех же юнитах: ступни +24.6, бёдра 0, плечи -18, макушка -36.
  const FEET=24.6;
  // V96: у костюма не было ни тени под ногами, ни затемнения. На сцене в коде
  // «Ловушка» четверо старых рисуются через epiAnimatron с shadow и dark, а
  // пятый выходил ярче всех и без тени — он читался как наклейка поверх кадра.
  const wsDark=Math.max(0,Math.min(1,o.dark||0));
  if(o.shadow>0){
    c.save();c.globalAlpha=Math.min(0.55,o.shadow*0.5);c.fillStyle='#000';
    c.beginPath();c.ellipse(x,y+U*1.1,U*13.5,U*2.6,0,0,Math.PI*2);c.fill();c.restore();
  }
  c.save();c.translate(x,y);c.scale(U*face,U);c.translate(0,-bob*0.3);
  c.rotate(-lean*0.28);
  // ---------- 1) ШТАНИНЫ: он вступает в костюм, край ползёт вверх ----------
  if(legK>0){
    c.save();c.globalAlpha=Math.min(1,legK*1.7);
    const top=FEET-19.5*legK;
    c.fillStyle=SUIT_M;c.fillRect(-7.8,top,6.8,FEET-top);c.fillRect(1.0,top,6.8,FEET-top);
    c.fillStyle=SUIT_L;c.fillRect(-7.8,top,2.2,FEET-top);c.fillRect(1.0,top,2.2,FEET-top);
    c.fillStyle=SUIT_D;c.fillRect(-1.0,top,2.0,FEET-top);        // шов между штанинами
    // мягкие лапы вместо ботинок — появляются, когда штанина села
    if(legK>0.70){c.save();c.globalAlpha=Math.min(1,(legK-0.70)/0.30);
      c.fillStyle=SUIT_L;c.fillRect(-9.4,FEET-2.6,9.0,3.4);c.fillRect(0.4,FEET-2.6,9.0,3.4);
      c.fillStyle=SUIT_D;c.fillRect(-9.4,FEET+0.2,9.0,0.9);c.fillRect(0.4,FEET+0.2,9.0,0.9);
      c.restore();}
    c.restore();
  }
  // ---------- 2) КОРПУС: подтягивает на плечи ----------
  if(bodyK>0){
    c.save();c.globalAlpha=Math.min(1,bodyK*1.6);
    // пока тянет — корпус сидит ниже плеч и доезжает вверх
    c.translate(0,(1-bodyK)*9.5);
    c.fillStyle=SUIT_M;c.fillRect(-10.8,-18,21.6,23);
    c.fillStyle=SUIT_D;c.fillRect(5.6,-18,5.2,23);
    c.fillStyle=SUIT_L;c.fillRect(-10.8,-18,3.0,23);
    c.fillStyle=SUIT_H;c.fillRect(-6.6,-10.5,13.2,9.5);          // светлое брюхо
    c.fillStyle='rgba(0,0,0,.22)';c.fillRect(-10.8,-18,21.6,1.6);
    // застёжка на спине — та, до которой не дотянуться самому
    c.fillStyle=SUIT_D;c.fillRect(-10.4,-14,1.4,17);
    c.restore();
  }
  // ---------- 3) РУКИ В РУКАВА ----------
  if(armK>0){
    c.save();c.globalAlpha=Math.min(1,armK*1.7);
    const sl=16.4*armK;                                  // длина натянутого рукава
    // V88: рукава ВРАЩАЮТСЯ вместе с руками. Раньше они были жёсткими
    // прямоугольниками вдоль тела, поэтому на кадре, где охранник поднимает
    // маску над головой, руки уходили вверх, а рукава оставались висеть внизу —
    // и из-под них торчало красное предплечье формы.
    const upK=eas(epiCl01((k-0.52)/0.20))*(1-eas(epiCl01((k-0.90)/0.10)));
    c.fillStyle=SUIT_L;c.fillRect(-13.4,-19.4,7.4,3.6);c.fillRect(6.0,-19.4,7.4,3.6);
    [[-1,-12.9],[1,12.9]].forEach(A=>{
      c.save();c.translate(A[1],-17.6);c.rotate(-A[0]*upK*2.42);
      c.fillStyle='#5b4d24';c.fillRect(-3.0,0,6.0,sl);
      c.fillStyle=SUIT_L;c.fillRect(A[0]<0?-3.0:1.2,0,1.8,sl);
      if(armK>0.82){c.save();c.globalAlpha=Math.min(1,(armK-0.82)/0.18);
        c.fillStyle=SUIT_H;c.fillRect(-3.5,sl-1.2,7.0,4.2);c.restore();}
      c.restore();});
    c.restore();
  }
  // ---------- воротник и кокетка: часть корпуса, а не головы ----------
  // Привязан к bodyK: пока он поднимает руки к маске, красные плечи формы
  // должны быть уже закрыты мехом, иначе поверх костюма мелькает форма.
  if(bodyK>0.45){
    c.save();c.globalAlpha=Math.min(1,(bodyK-0.45)/0.35);
    c.fillStyle=SUIT_M;c.fillRect(-11.4,-21.6,22.8,5.2);
    c.fillStyle=SUIT_L;c.fillRect(-11.4,-21.6,22.8,1.6);
    c.fillStyle=SUIT_D;c.fillRect(-11.4,-17.0,22.8,1.4);
    c.restore();
  }
  // ---------- 4) ГОЛОВА ЗАЙЦА ОПУСКАЕТСЯ НА ГОЛОВУ ----------
  if(headK>0){
    c.save();
    // маска висит над макушкой и уезжает вниз; на осадке чуть добирает
    const drop=0.82*headK+0.18*setK;
    c.globalAlpha=Math.min(1,headK*2.2);
    c.translate(0,-15-20*(1-drop));
    c.rotate(tilt);
    // доворот головы: морда, глаза и уши смещаются в сторону взгляда,
    // а сама голова слегка сужается — это и читается как поворот
    const yx=yaw*3.4, nar=1-Math.abs(yaw)*0.16;
    c.save();c.scale(nar,1);
    // черепная коробка (макушка на -25 от точки посадки = -40 от бёдер)
    c.fillStyle=SUIT_M;c.fillRect(-8.4,-25,16.8,25);
    c.fillStyle=SUIT_D;c.fillRect(4.2,-25,4.2,25);
    c.fillStyle=SUIT_L;c.fillRect(-8.4,-25,2.8,25);
    c.fillStyle='rgba(0,0,0,.20)';c.fillRect(-8.4,-25,16.8,1.8);
    // ---- длинные стоячие уши ----
    [[-4.2,-0.13],[3.4,0.15]].forEach((E,i)=>{
      c.save();c.translate(E[0]+yx*0.5,-24.2);
      c.rotate(E[1]+yaw*0.10+Math.sin(t*1.7+i*2.1)*0.018);
      c.fillStyle=SUIT_M;c.fillRect(-2.2,-17.5,4.4,18);
      c.fillStyle=SUIT_L;c.fillRect(-2.2,-17.5,1.4,18);
      c.fillStyle=SUIT_EAR;c.fillRect(-1.1,-15.6,2.2,14);
      c.fillStyle='rgba(0,0,0,.18)';c.fillRect(-2.2,-17.5,4.4,1.2);
      c.restore();});
    // ---- узкая морда, нос, два передних зуба ----
    c.fillStyle=SUIT_H;c.fillRect(-4.4+yx,-6.8,8.8,5.4);
    c.fillStyle=SUIT_NOSE;c.fillRect(-1.5+yx,-6.2,3.0,2.1);
    c.fillStyle=SUIT_TEETH;c.fillRect(-2.2+yx,-1.9,2.0,2.6);c.fillRect(0.2+yx,-1.9,2.0,2.6);
    c.fillStyle='rgba(0,0,0,.30)';c.fillRect(-0.2+yx,-1.9,0.4,2.6);
    c.strokeStyle='rgba(226,214,180,.26)';c.lineWidth=0.24;
    for(let i=0;i<3;i++){c.beginPath();c.moveTo(-4.4+yx,-4.6+i*1.2);c.lineTo(-8.6+yx,-5.4+i*1.5);c.stroke();
      c.beginPath();c.moveTo(4.4+yx,-4.6+i*1.2);c.lineTo(8.6+yx,-5.4+i*1.5);c.stroke();}
    // ---- глазницы: внутри видны глаза человека ----
    c.fillStyle=SUIT_SOCK;c.fillRect(-6.0+yx,-13.6,4.6,3.6);c.fillRect(1.4+yx,-13.6,4.6,3.6);
    if(o.humanEyes!==false){
      // зрачок ведёт в ту же сторону, куда доворачивается голова
      const pp=yaw*0.9;
      c.fillStyle='#e8dcc6';c.fillRect(-5.0+yx,-12.8,1.6,1.7);c.fillRect(2.4+yx,-12.8,1.6,1.7);
      c.fillStyle='#15100c';c.fillRect(-4.7+yx+pp,-12.4,0.8,1.1);c.fillRect(2.7+yx+pp,-12.4,0.8,1.1);
    }
    if(o.blood>0){
      c.fillStyle='rgba(120,10,14,'+Math.min(0.95,o.blood).toFixed(3)+')';
      c.fillRect(-6.0+yx,-10.6,4.6,1.8);c.fillRect(1.4+yx,-10.6,4.6,1.8);
      c.fillRect(-2.2+yx,-1.4,4.4,3.6+3.4*o.blood);
    }
    c.restore();
    c.restore();
  }
  // ---------- V96: ДОПОЛНИТЕЛЬНАЯ ФАКТУРА СИДЯЩЕГО КОСТЮМА ----------
  // Рядом с четырьмя аниматронами костюм читался плоским набором
  // жёлтых прямоугольников. Добавлены швы по брюху и корпусу, сгибы на
  // коленях, пальцы на лапах и верхний свет от прожектора на плечах и макушке.
  if(k>0.985&&o.detail!==false){
    c.save();
    c.strokeStyle='rgba(30,24,10,.34)';c.lineWidth=0.30;
    c.strokeRect(-6.6,-10.5,13.2,9.5);                     // шов вокруг брюха
    c.setLineDash([0.7,0.7]);
    c.strokeStyle='rgba(226,214,180,.16)';c.lineWidth=0.22;
    c.strokeRect(-7.4,-11.3,14.8,11.1);                    // строчка по краю
    c.setLineDash([]);
    c.strokeStyle='rgba(30,24,10,.26)';c.lineWidth=0.26;
    c.beginPath();c.moveTo(0,-16.4);c.lineTo(0,-11.0);c.stroke();   // шов по груди
    c.beginPath();c.moveTo(-4.4,13.2);c.lineTo(-1.0,13.2);c.stroke();// сгибы колен
    c.beginPath();c.moveTo(1.0,13.2);c.lineTo(4.4,13.2);c.stroke();
    for(let i=0;i<2;i++){                                  // пальцы на лапах
      const px=i?0.4:-9.4;
      for(let j=1;j<3;j++){c.beginPath();
        c.moveTo(px+j*3.0,FEET-2.2);c.lineTo(px+j*3.0,FEET+0.4);c.stroke();}
    }
    c.globalCompositeOperation='lighter';                  // свет сверху
    c.fillStyle='rgba(255,226,150,.07)';
    c.fillRect(-8.4,-40.0,16.8,1.8);
    c.fillRect(-11.4,-21.6,22.8,1.5);
    c.fillRect(-6.6,-10.5,13.2,1.2);
    c.restore();
  }
  // ---------- V96: затемнение по частям тела (как у drawGuardChar) ----------
  if(wsDark>0&&k>0.985){
    c.save();c.globalAlpha=wsDark*0.92;c.fillStyle='#05060a';
    [[-11.4,-21.6,22.8,5.4],   // кокетка и плечи
     [-10.8,-18.0,21.6,23.0],  // корпус
     [-13.6,-19.6,7.8,3.8],    // дальнее плечо
     [5.8,-19.6,7.8,3.8],      // ближнее плечо
     [-7.8,5.1,6.8,19.5],      // нога
     [1.0,5.1,6.8,19.5],       // нога
     [-9.4,22.0,9.0,3.4],      // лапа
     [0.4,22.0,9.0,3.4],       // лапа
     [-8.4,-40.0,16.8,25.0],   // черепная коробка
     [-7.0,-56.4,5.2,17.6],    // ухо
     [1.4,-56.4,5.2,17.6]      // ухо
    ].forEach(r=>c.fillRect(r[0],r[1],r[2],r[3]));
    c.restore();
  }
  // ---------- пружины, вылезшие после срабатывания ----------
  if(o.spring>0){
    const sp=Math.min(1,o.spring);
    // V88: пружины были почти белыми и читались как рисованные зигзаги поверх
    // костюма; теперь это тусклый металл в темноте
    c.strokeStyle='rgba(126,136,148,'+(0.42*sp).toFixed(2)+')';c.lineWidth=0.32;
    for(let i=0;i<5;i++){
      const bx=-9+i*4.5;
      c.beginPath();for(let q=0;q<7;q++){const yy=-17+q*1.3;q?c.lineTo(bx+(q%2?1.4:-1.4)*sp,yy):c.moveTo(bx,yy);}
      c.stroke();}
    c.fillStyle='rgba(140,12,16,'+(0.75*sp).toFixed(2)+')';
    c.fillRect(-9,-3,18,2.6*sp);
    c.fillRect(-7,10,14,2.2*sp);
  }
  c.restore();
}
// Внутренний вид маски костюма: рамка глазниц, сетка, пар от дыхания, кровь.
function epiPOVMask(c,w,h,t,o){
  o=o||{};
  const blood=o.blood||0, shake=o.shake||0;
  c.save();
  // затемнение по краям — мы смотрим через две прорези
  const ex=w*0.5, ey=h*0.47, rw=w*0.235, rh=h*0.235;
  c.save();
  c.fillStyle='#05050a';
  // ВАЖНО: ellipse() дотягивает линию от текущей точки к началу дуги,
  // поэтому перед каждой прорезью ставим moveTo в её стартовую точку —
  // иначе через кадр тянется диагональный клин.
  const eRX=rw*0.55, eRY=rh*0.70;
  c.beginPath();c.rect(0,0,w,h);
  c.moveTo(ex-w*0.152+eRX,ey);c.ellipse(ex-w*0.152,ey,eRX,eRY,0,0,Math.PI*2);
  c.moveTo(ex+w*0.152+eRX,ey);c.ellipse(ex+w*0.152,ey,eRX,eRY,0,0,Math.PI*2);
  c.fill('evenodd');
  c.restore();
  // мягкие края прорезей
  [-1,1].forEach(s=>{
    const cx2=ex+s*w*0.152;
    const g=c.createRadialGradient(cx2,ey,rw*0.40,cx2,ey,rw*0.60);
    g.addColorStop(0,'rgba(6,6,10,0)');g.addColorStop(1,'rgba(6,6,10,.98)');
    c.fillStyle=g;c.beginPath();c.ellipse(cx2,ey,rw*0.70,rh*0.80,0,0,Math.PI*2);c.fill();
  });
  // сетка в глазницах
  c.save();c.globalAlpha=0.22;c.strokeStyle='#0b0d12';c.lineWidth=1;
  for(let s=-1;s<=1;s+=2){const cx2=ex+s*w*0.152;
    for(let i=-9;i<=9;i++){c.beginPath();c.moveTo(cx2+i*7,ey-rh*0.8);c.lineTo(cx2+i*7,ey+rh*0.8);c.stroke();}
    for(let i=-9;i<=9;i++){c.beginPath();c.moveTo(cx2-rw*0.7,ey+i*7);c.lineTo(cx2+rw*0.7,ey+i*7);c.stroke();}}
  c.restore();
  // ---- V88: ВНУТРЕННОСТЬ ГОЛОВЫ ЗАЙЦА, А НЕ ПУСТОЙ ЧЁРНЫЙ КАДР ----
  // Было: тело маски заливалось чистым чёрным, и кадр читался как выключенный
  // экран с двумя овальными дырками. Стало: видна подсвеченная изнутри скорлупа,
  // переносица, силуэт узкой морды снизу и две длинные уши сверху — сразу ясно,
  // что мы смотрим из головы зайца.
  // подсвеченная изнутри скорлупа — но ТОЛЬКО вне прорезей, иначе она затягивает
  // сами прорези мутной плёнкой и через них перестаёт быть видно зал
  c.save();
  c.beginPath();c.rect(0,0,w,h);
  c.moveTo(ex-w*0.152+eRX,ey);c.ellipse(ex-w*0.152,ey,eRX*1.02,eRY*1.02,0,0,Math.PI*2);
  c.moveTo(ex+w*0.152+eRX,ey);c.ellipse(ex+w*0.152,ey,eRX*1.02,eRY*1.02,0,0,Math.PI*2);
  c.clip('evenodd');
  const shell=c.createRadialGradient(ex,ey,rw*0.2,ex,ey,w*0.62);
  shell.addColorStop(0,'rgba(74,62,28,.10)');
  shell.addColorStop(0.42,'rgba(34,28,13,.13)');
  shell.addColorStop(1,'rgba(4,4,6,.86)');
  c.fillStyle=shell;c.fillRect(0,0,w,h);
  c.restore();
  // переносица между глазницами
  const nb=c.createLinearGradient(ex-w*0.02,0,ex+w*0.02,0);
  nb.addColorStop(0,'#07070b');nb.addColorStop(.5,'#191509');nb.addColorStop(1,'#07070b');
  c.fillStyle=nb;c.fillRect(ex-w*0.017,h*0.16,w*0.034,h*0.56);
  // основания ушей уходят вверх за кадр — две тёмные полосы у потолка маски
  c.fillStyle='rgba(9,8,12,.92)';
  c.beginPath();c.moveTo(ex-w*0.20,0);c.lineTo(ex-w*0.075,0);
  c.lineTo(ex-w*0.105,h*0.19);c.lineTo(ex-w*0.185,h*0.17);c.closePath();c.fill();
  c.beginPath();c.moveTo(ex+w*0.075,0);c.lineTo(ex+w*0.20,0);
  c.lineTo(ex+w*0.185,h*0.17);c.lineTo(ex+w*0.105,h*0.19);c.closePath();c.fill();
  // низ маски: силуэт узкой морды с выемкой под зубы
  c.fillStyle='#07070b';
  c.beginPath();c.moveTo(0,h*0.78);
  c.quadraticCurveTo(w*0.26,h*0.66,ex-w*0.075,h*0.70);
  c.lineTo(ex-w*0.075,h*0.86);c.lineTo(ex+w*0.075,h*0.86);
  c.lineTo(ex+w*0.075,h*0.70);
  c.quadraticCurveTo(w*0.74,h*0.66,w,h*0.78);
  c.lineTo(w,h);c.lineTo(0,h);c.closePath();c.fill();
  // два передних зуба изнутри — светлые пятна на самом низу кадра
  c.save();c.globalAlpha=0.13;c.fillStyle='#cdc4a8';
  c.fillRect(ex-w*0.058,h*0.705,w*0.048,h*0.055);
  c.fillRect(ex+w*0.010,h*0.705,w*0.048,h*0.055);c.restore();
  // пар от дыхания у нижнего края
  if(!document.body.classList.contains('low-end')){
    c.save();c.globalAlpha=0.16+0.10*Math.sin(t*2.6);
    const fg=c.createLinearGradient(0,h*0.70,0,h*0.86);
    fg.addColorStop(0,'rgba(210,220,230,0)');fg.addColorStop(1,'rgba(210,220,230,.5)');
    c.fillStyle=fg;c.fillRect(0,h*0.70,w,h*0.18);c.restore();
  }
  // кровь на внутренней стороне маски
  if(blood>0){
    c.save();c.globalAlpha=Math.min(1,blood);
    // V101: ПОЧЕМУ ТАК БЫЛО: каждая капля была ровным овалом с тонкой
    // вертикальной палочкой под ним, и в кадре висели красные «булавки».
    // СТАЛО: пятно собирается из трёх смещённых овалов и переходит в потёк,
    // который сужается вниз, — это мазок на внутренней стороне маски.
    for(let i=0;i<26;i++){
      const r1=epiRnd(i*3.1),r2=epiRnd(i*7.7),r3=epiRnd(i*13.3);
      const bx=w*(0.12+0.76*r1), by=h*(0.20+0.55*r2);
      const rr=(3+16*r3)*Math.min(1,blood*1.4);
      c.save();c.globalAlpha=Math.min(1,blood)*(0.30+0.45*r2);
      c.fillStyle='rgb('+(96+Math.floor(50*r3))+',8,12)';
      for(let j=0;j<3;j++){
        const jx=bx+(epiRnd(i*2.3+j)-0.5)*rr*1.5, jy=by+j*rr*0.5;
        c.beginPath();
        c.ellipse(jx,jy,rr*(1-j*0.22),rr*(0.5+0.4*r1)*(1-j*0.16),r3*3,0,Math.PI*2);
        c.fill();
      }
      if(r3>0.6){                                 // потёк: сужается вниз
        const dl=rr*(1.4+3*blood);
        c.beginPath();
        c.moveTo(bx-rr*0.30,by);c.lineTo(bx+rr*0.30,by);
        c.lineTo(bx+rr*0.06,by+dl);c.lineTo(bx-rr*0.06,by+dl);
        c.closePath();c.fill();
      }
      c.restore();
    }
    c.restore();
    c.save();c.globalCompositeOperation='multiply';
    c.fillStyle='rgba(120,14,18,'+(0.30*blood).toFixed(3)+')';c.fillRect(0,0,w,h);c.restore();
  }
  // V101: ПОЧЕМУ ТАК БЫЛО: тело маски выходило светло-серым — свет зала,
  // подсветка скорлупы, пар и зерно накладывались друг на друга, и вместо
  // чёрной изнутри головы получался молочный кадр, в котором прорези почти не
  // отличались от маски. СТАЛО: в самом конце по телу маски (весь кадр, кроме
  // двух прорезей) проходит умножение на тёмный тон — структура (переносица,
  // уши, зубы, потёки) сохраняется, но всё это уходит в темноту, как и должно
  // быть внутри костюма. Прорези не затрагиваются.
  {
   c.save();
   c.beginPath();c.rect(0,0,w,h);
   c.moveTo(ex-w*0.152+eRX,ey);c.ellipse(ex-w*0.152,ey,eRX*1.02,eRY*1.02,0,0,Math.PI*2);
   c.moveTo(ex+w*0.152+eRX,ey);c.ellipse(ex+w*0.152,ey,eRX*1.02,eRY*1.02,0,0,Math.PI*2);
   c.clip('evenodd');
   c.globalCompositeOperation='multiply';
   c.fillStyle='rgb(74,72,80)';c.fillRect(0,0,w,h);
   c.restore();
  }
  // тряска в виде смещения зерна маски
  if(shake>0){c.save();c.globalAlpha=0.10*shake;c.fillStyle='#000';
    c.fillRect(0,0,w,h*0.06*shake);c.fillRect(0,h-h*0.06*shake,w,h*0.06*shake);c.restore();}
  c.restore();
}
// ===========================================================================
// КОНЦОВКА «КОСТЮМ-ЛОВУШКА» (5+ смертей, выбор игрока).
// Раскадровка: титр -> он бежит по коридору от аниматроников -> захлопывает
// дверь склада -> видит пружинный костюм -> надевает его -> они входят ->
// он смеётся им в лицо -> ВИД ОТ ПЕРВОГО ЛИЦА на них -> срабатывает механизм,
// ломаются рёбра -> он падает -> камера отъезжает, они смотрят, как он умирает
// -> камера уходит дальше назад, и всё замолкает.
// ===========================================================================
function epiTrapEnding(t){
  const w=W,h=H,low=document.body.classList.contains('low-end');
  // V94: после старого финала идёт кода — новая последняя сцена (js/endings_coda.js).
  if(epiCoda('trap',t))return;
  const cl=v=>Math.min(1,Math.max(0,v));
  const eo=x=>1-Math.pow(1-x,3);
  const eio=x=>x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2;
  // V88: окно надевания костюма выросло с 2.4 до 5.4 секунды — за 2.4 секунды
  // пять стадий (штанины, корпус, рукава, голова, осадка) физически не успевали
  // прочитаться, и надевание выглядело рывком. Всё, что идёт после, сдвинуто
  // ровно на 3 секунды, поэтому паузы между действиями сохранены как были.
  const T_RUN=2.2, T_DOOR=6.4, T_SEE=8.2, T_WEAR=10.6, WEAR_DUR=5.4,
        T_ENTER=16.6, T_LAUGH=18.6, T_POV=20.8, T_LOCK=23.8, T_FALL=26.8,
        T_PULL=28.8, T_SILENT=32.0, T_FINAL=32.6;
  const runK=eo(cl((t-T_RUN)/3.6));
  const doorK=cl((t-T_DOOR)/1.2);
  const seeK=eo(cl((t-T_SEE)/2.0));
  const wearK=eio(cl((t-T_WEAR)/WEAR_DUR));
  const enterK=eo(cl((t-T_ENTER)/1.8));
  const laughK=cl((t-T_LAUGH)/1.4);
  const povK=cl((t-T_POV)/0.5);
  const lockK=cl((t-T_LOCK)/0.35);
  const crushK=cl((t-T_LOCK)/2.6);
  const fallK=eio(cl((t-T_FALL)/1.5));
  const pullK=eio(cl((t-T_PULL)/3.2));
  const silK=cl((t-T_SILENT)/2.2);
  const finalK=cl((t-T_FINAL)/2.6);
  // ---- звук ----
  epiCue(t,T_RUN,()=>window.AudioFX.synth?.('breath',.75));
  epiCue(t,T_RUN+1.6,()=>window.AudioFX.synth?.('heartbeat',.6));
  epiCue(t,T_DOOR,()=>{window.AudioFX.synth?.('grab',.5);window.AudioFX.play?.('door',.6);});
  epiCue(t,T_SEE,()=>window.AudioFX.synth?.('metalDrag',.45));
  // V101: РЕАЛЬНАЯ СИСТЕМА КОСТЮМА. Раньше на всё надевание шёл один 'squelch',
  // а на срабатывание — один 'springlock': механизм не читался как механизм.
  // Теперь каждая стадия надевания даёт СВОЮ защёлку (ригель встал на место),
  // на осадке костюма воздух выходит из корпуса, а на срабатывании уходит
  // каскад из двадцати четырёх защёлок и два звуковых извержения пара.
  epiCue(t,T_WEAR,()=>{window.AudioFX.synth?.('squelch',.30);window.AudioFX.synth?.('metalGroan',.30);});
  epiCue(t,T_WEAR+0.85,()=>window.AudioFX.synth?.('doorLatch',.42));
  epiCue(t,T_WEAR+1.80,()=>window.AudioFX.synth?.('doorLatch',.46));
  epiCue(t,T_WEAR+2.75,()=>window.AudioFX.synth?.('doorLatch',.50));
  epiCue(t,T_WEAR+3.70,()=>window.AudioFX.synth?.('doorLatch',.54));
  epiCue(t,T_WEAR+4.60,()=>window.AudioFX.synth?.('doorLatch',.58));
  epiCue(t,T_WEAR+WEAR_DUR,()=>window.AudioFX.synth?.('pressureBurst',.42));
  epiCue(t,T_ENTER,()=>{window.AudioFX.synth?.('rumble',.6);window.AudioFX.synth?.('metalGroan',.34);});
  epiCue(t,T_LAUGH,()=>window.AudioFX.synth?.('laugh',.8));
  epiCue(t,T_LAUGH+1.1,()=>window.AudioFX.synth?.('laugh',.7));
  epiCue(t,T_POV,()=>window.AudioFX.synth?.('breath',.5));
  epiCue(t,T_LOCK,()=>{window.AudioFX.synth?.('springArray',.95);window.AudioFX.synth?.('springlock',.60);});
  epiCue(t,T_LOCK+0.35,()=>window.AudioFX.synth?.('ribcrack',.9));
  epiCue(t,T_LOCK+0.55,()=>window.AudioFX.synth?.('pressureBurst',.80));
  epiCue(t,T_LOCK+1.2,()=>window.AudioFX.synth?.('bone',.8));
  epiCue(t,T_LOCK+1.8,()=>window.AudioFX.synth?.('gurgle',.7));
  epiCue(t,T_LOCK+2.60,()=>window.AudioFX.synth?.('pressureBurst',.55));
  epiCue(t,T_LOCK+3.40,()=>window.AudioFX.synth?.('metalGroan',.40));
  epiCue(t,T_FALL,()=>{window.AudioFX.play?.('thud',.7);window.AudioFX.synth?.('squelch',.5);});
  epiCue(t,T_PULL,()=>window.AudioFX.synth?.('heartbeat',.35));
  epiCue(t,T_SILENT,()=>window.AudioFX.stopAll?.());
  const POV=(t>=T_POV&&t<T_FALL);
  ctx.save();
  // общая тряска: бег, удар двери, срабатывание механизма
  let shk=0;
  if(t>T_RUN&&t<T_DOOR)shk=1.1;
  if(t>T_DOOR&&t<T_DOOR+0.5)shk=4.2;
  if(t>T_LOCK&&t<T_LOCK+2.2)shk=6.5*(1-cl((t-T_LOCK)/2.2))+1.2;
  if(t>T_FALL&&t<T_FALL+0.5)shk=3.4;
  ctx.translate(Math.sin(t*31)*shk+Math.sin(t*1.1)*1.1,Math.cos(t*37)*shk*0.8+Math.cos(t*0.9)*0.8);
  if(POV){
    // ================== ВИД ОТ ПЕРВОГО ЛИЦА ИЗ КОСТЮМА ==================
    const pk=povK;
    const bg=ctx.createLinearGradient(0,0,0,h);
    bg.addColorStop(0,'#0a0806');bg.addColorStop(.5,'#120e0a');bg.addColorStop(1,'#060504');
    ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
    // стены склада вблизи + лампа сверху
    ctx.fillStyle='#15100c';ctx.fillRect(0,h*0.10,w,h*0.62);
    for(let i=0;i<9;i++){ctx.fillStyle=i%2?'rgba(255,255,255,.012)':'rgba(0,0,0,.16)';
      ctx.fillRect(0,h*(0.10+i*0.069),w,h*0.034);}
    ctx.fillStyle='#0d0a08';ctx.fillRect(0,h*0.72,w,h*0.28);
    // качающаяся лампа
    const sway=Math.sin(t*1.5)*w*0.03;
    const lx=w*0.5+sway, ly=h*0.06;
    ctx.strokeStyle='#26201a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(w*0.5,0);ctx.lineTo(lx,ly);ctx.stroke();
    ctx.save();ctx.globalCompositeOperation='lighter';
    const lg=ctx.createRadialGradient(lx,ly,4,lx,ly,h*0.72);
    // V101: ПОЧЕМУ ТАК БЫЛО: лампа светила на 0.44 по всему кадру, и общий
    // bloom растаскивал этот свет поверх маски — тело маски выцветало в серый,
    // прорези почти не читались. СТАЛО: свет вдвое слабее и падает короче,
    // маска снова чёрная, а зал в прорезях остаётся видимым.
    lg.addColorStop(0,'rgba(255,226,168,.22)');lg.addColorStop(.4,'rgba(255,200,130,.06)');lg.addColorStop(1,'rgba(255,190,120,0)');
    ctx.fillStyle=lg;ctx.fillRect(0,0,w,h);ctx.restore();
    ctx.fillStyle='#ffe9bd';ctx.beginPath();ctx.arc(lx,ly,7,0,Math.PI*2);ctx.fill();
    // ---- аниматроники прямо перед нами ----
    // прорези маски лежат вокруг h*0.47, поэтому фигуры ставим крупно и высоко,
    // иначе через глазницы видна только пустая стена
    // V88: фигуры были слишком крупными и обрезались краями прорезей — видно
    // только куски корпуса. Масштаб выведен из высоты кадра общей метрикой:
    // рост робота = h*MON_K, поэтому все четверо целиком попадают в прорези.
    // Прорези лежат по x на 0.219..0.477w и 0.523..0.781w, по y на 0.305..0.635h,
    // поэтому по два робота на прорезь, ступни на 0.615h, рост около 0.27h —
    // фигура целиком укладывается в овал, а не торчит из него одной головой.
    const trio=[[0.290,0.612,epiMonScale(h*0.255),'lav'],
                [0.418,0.620,epiMonScale(h*0.275),'main'],
                [0.585,0.622,epiMonScale(h*0.285),'exo'],
                [0.712,0.612,epiMonScale(h*0.258),'felix']];
    trio.forEach((a,i)=>{
      const step=crushK>0?cl((t-T_LOCK-0.6-i*0.25)/1.4):0;   // подходят ближе, когда он умирает
      const ax=w*(a[0]+(a[0]-0.5)*0.10*step);
      const ay=h*(a[1]+0.02*step);
      const asc=a[2]*(0.96+0.16*step)*(0.92+0.08*pk);
      const head=(crushK>0?-0.10*step:0)+Math.sin(t*0.5+i)*0.03;
      epiAnimatron(ctx,ax,ay,asc,t,{kind:a[3],seed:i*1.7,face:a[0]>0.5?-1:1,
        dark:0.52-0.10*pk,eye:0.85+0.15*Math.abs(Math.sin(t*1.6+i)),head});
    });
    // маска изнутри
    epiPOVMask(ctx,w,h,t,{blood:crushK*0.95,shake:t>T_LOCK?cl((t-T_LOCK)/1.0):0});
    // вспышка щелчка механизма
    if(lockK>0&&t<T_LOCK+0.6){
      ctx.save();ctx.globalCompositeOperation='lighter';
      ctx.fillStyle='rgba(255,240,220,'+(0.55*(1-cl((t-T_LOCK)/0.6))).toFixed(3)+')';
      ctx.fillRect(0,0,w,h);ctx.restore();
    }
    // V101: МЕХАНИЗМ ВИДНО, А НЕ ТОЛЬКО СЛЫШНО. Раньше на срабатывании была
    // одна белая вспышка на весь кадр — звук защёлок шёл «из ниоткуда».
    // Теперь у самой маски работают три вещи: искры от сорвавшихся ригелей
    // (летят внутрь кадра из-за кромок прорезей), струи пара из корпуса и
    // толчки — то самое «звуковое извержение», только видимое.
    if(!low&&t>T_LOCK&&t<T_LOCK+3.6){
      const mk=cl((t-T_LOCK)/3.6);
      ctx.save();ctx.globalCompositeOperation='lighter';
      for(let i=0;i<26;i++){
        const r=epiRnd(i*5.3), per=0.24+r*0.30;
        const kk=(((t-T_LOCK)*1.4+r*2.7)%per)/per;
        if(kk>0.9)continue;
        const side=i%4;
        let sx,sy,vx,vy;
        if(side===0){sx=w*(0.10+0.80*r);sy=h*0.10;vx=(r-0.5)*w*0.10;vy=h*0.22;}
        else if(side===1){sx=w*(0.10+0.80*r);sy=h*0.90;vx=(r-0.5)*w*0.10;vy=-h*0.20;}
        else if(side===2){sx=w*0.08;sy=h*(0.16+0.68*r);vx=w*0.22;vy=(r-0.5)*h*0.10;}
        else{sx=w*0.92;sy=h*(0.16+0.68*r);vx=-w*0.20;vy=(r-0.5)*h*0.10;}
        ctx.globalAlpha=Math.min(1,(1-kk)*(1-mk*0.7)*(0.5+0.5*r));
        ctx.fillStyle=r>0.55?'#ffd9a0':'#ff9a3c';
        ctx.fillRect(sx+vx*kk,sy+vy*kk+h*0.10*kk*kk,1.8+2.6*r,1.8+2.6*r);
      }
      ctx.restore();
      const jet=Math.max(cl(1-Math.abs((t-T_LOCK)-0.55)/0.45),cl(1-Math.abs((t-T_LOCK)-2.60)/0.55));
      if(jet>0.02){
        ctx.save();ctx.globalAlpha=0.26*jet;
        for(const sgn of [-1,1]){
          const jx=w*(0.5+sgn*0.36);
          const jg=ctx.createLinearGradient(jx,h*0.94,jx,h*0.40);
          jg.addColorStop(0,'rgba(226,232,236,.85)');jg.addColorStop(1,'rgba(226,232,236,0)');
          ctx.fillStyle=jg;
          ctx.beginPath();
          ctx.moveTo(jx-w*0.020,h*0.96);ctx.lineTo(jx+w*0.020,h*0.96);
          ctx.lineTo(jx+w*0.075*jet,h*0.42);ctx.lineTo(jx-w*0.060*jet,h*0.44);
          ctx.closePath();ctx.fill();
        }
        ctx.restore();
      }
    }
    // «падение» зрения: кадр валится вбок к концу
    if(t>T_LOCK+1.4){
      const dk=cl((t-T_LOCK-1.4)/(T_FALL-T_LOCK-1.4));
      ctx.save();ctx.globalAlpha=dk;ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);ctx.restore();
    }
    // V101: ПОЧЕМУ ТАК БЫЛО. Вид изнутри костюма получал тот же грейд, что и
    // обычные планы: тёплую заливку поверх всего кадра и плотное зерно. Но
    // внутри головы почти нет собственной яркости, поэтому заливка не
    // «подкрашивала», а поднимала весь чёрный корпус маски до серого —
    // прорези переставали читаться и кадр выглядел молочным.
    // СТАЛО: у субъективного кадра свой грейд — без тёплой заливки, с более
    // сильной виньеткой и вдвое меньшим зерном. Темнота остаётся темнотой.
    epiGrade(ctx,w,h,t,low,null,0.74,0.55);
  }else{
    // ================== ТРЕТЬЕ ЛИЦО ==================
    // камера: наезд на бегущего, потом отъезд после падения
    const zoom=(1.06+0.10*runK)*(1-0.44*pullK)*(1-0.12*silK);
    const camY=h*(0.02*runK)- h*0.05*pullK;
    // при отъезде камеры кадр уменьшается — вокруг должна быть чернота,
    // а сама комната обрезается по кадру, иначе стеллажи вылезают за края
    ctx.fillStyle='#000';ctx.fillRect(-w*0.3,-h*0.3,w*1.6,h*1.6);
    ctx.save();ctx.translate(w*0.5,h*0.62+camY);ctx.scale(zoom,zoom);ctx.translate(-w*0.5,-h*0.62);
    if(t<T_DOOR+0.4){
      // ================= V88: КОРИДОР — БЕГ РОВНО ВПРАВО =================
      // Было: коридор строился в перспективе с точкой схода в центре кадра, а
      // охранник «убегал в глубину» спиной к камере (back:true). Со стороны это
      // читалось как сломанная поза: корпус боком, руки в стороны, ноги
      // скрещиваются, а фигура при этом почти не смещается по экрану. Плюс
      // аниматроники висели по четырём углам крошечными фигурками.
      // Стало: чистый вид сбоку. Он бежит ВПРАВО к двери склада, коридор
      // проезжает мимо влево, аниматроники гонятся сзади слева. Направление
      // корпуса, взгляда, тени и движения кадра совпадают.
      const flC=h*0.815;                      // линия пола коридора
      const sx=-runK*w*2.25;                  // коридор уезжает влево
      const bg=ctx.createLinearGradient(0,0,0,h);
      bg.addColorStop(0,'#04060a');bg.addColorStop(.5,'#080c12');bg.addColorStop(1,'#030507');
      ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
      // задняя стена с бетонными панелями
      ctx.fillStyle='#0a0e14';ctx.fillRect(-w,h*0.10,w*3,flC-h*0.10);
      ctx.fillStyle='#070a0f';ctx.fillRect(-w,h*0.10,w*3,h*0.026);
      for(let i=-2;i<10;i++){
        const px=sx+i*w*0.34;
        ctx.fillStyle='rgba(0,0,0,.30)';ctx.fillRect(px,h*0.10,3,flC-h*0.10);
        ctx.fillStyle='rgba(150,168,186,.020)';ctx.fillRect(px+3,h*0.10,w*0.34-3,h*0.012);
      }
      // плинтус и пол
      ctx.fillStyle='#131922';ctx.fillRect(-w,flC-h*0.026,w*3,h*0.026);
      ctx.fillStyle='#0b0f15';ctx.fillRect(-w,flC,w*3,h-flC);
      ctx.strokeStyle='rgba(140,160,180,.05)';ctx.lineWidth=1;
      for(let i=-4;i<16;i++){const px=sx*1.35+i*w*0.16;
        ctx.beginPath();ctx.moveTo(px,flC);ctx.lineTo(px-w*0.05,h);ctx.stroke();}
      // двери и плафоны проезжают мимо — это и создаёт ощущение скорости
      for(let i=-1;i<9;i++){
        const px=sx+i*w*0.68;
        // дверной проём в стене
        ctx.fillStyle='#0d1218';ctx.fillRect(px,flC-h*0.40,w*0.085,h*0.40);
        ctx.strokeStyle='rgba(130,150,168,.10)';ctx.lineWidth=1.5;
        ctx.strokeRect(px,flC-h*0.40,w*0.085,h*0.40);
        // плафон под потолком
        const lxx=px+w*0.34, lyy=h*0.155;
        const fk=(epiRnd(Math.floor(t*12)+i)>0.34)?1:0.16;
        ctx.fillStyle='#111820';ctx.fillRect(lxx-w*0.028,lyy,w*0.056,4);
        ctx.save();ctx.globalCompositeOperation='lighter';
        const g=ctx.createRadialGradient(lxx,lyy+4,2,lxx,lyy+4,h*0.34);
        g.addColorStop(0,'rgba(196,214,232,'+(0.20*fk).toFixed(3)+')');g.addColorStop(1,'rgba(150,180,210,0)');
        ctx.fillStyle=g;ctx.fillRect(lxx-h*0.36,lyy,h*0.72,h*0.62);ctx.restore();
        // отблеск плафона на полу
        ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=0.10*fk;
        ctx.fillStyle='#9fb6cc';ctx.beginPath();
        ctx.ellipse(lxx,flC+h*0.045,w*0.075,h*0.020,0,0,Math.PI*2);ctx.fill();ctx.restore();
      }
      // ---- дверь склада: въезжает справа, он бежит именно к ней ----
      const dcx=w*(1.42-0.88*runK), dw2=w*0.145, dh2=h*0.455;
      const dy2=flC-dh2;
      ctx.fillStyle='#12161b';ctx.fillRect(dcx-dw2*0.5-6,dy2-6,dw2+12,dh2+6);
      ctx.strokeStyle='rgba(130,150,168,.18)';ctx.lineWidth=1.5;
      ctx.strokeRect(dcx-dw2*0.5-6,dy2-6,dw2+12,dh2+6);
      const dgr=ctx.createLinearGradient(dcx-dw2*0.5,dy2,dcx+dw2*0.5,flC);
      dgr.addColorStop(0,doorK>0.4?'#0a0d11':'#1a2026');dgr.addColorStop(1,'#080a0e');
      ctx.fillStyle=dgr;ctx.fillRect(dcx-dw2*0.5,dy2,dw2,dh2);
      ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(dcx-dw2*0.5,dy2,dw2,dh2*0.10);
      ctx.fillStyle='rgba(150,166,180,.26)';ctx.fillRect(dcx+dw2*0.28,flC-dh2*0.50,dw2*0.10,dh2*0.035);
      ctx.save();ctx.globalAlpha=Math.min(1,runK*1.6);ctx.textAlign='center';
      ctx.font='700 '+Math.round(h*0.030)+'px "Inter",Arial,sans-serif';
      ctx.fillStyle='rgba(168,180,192,.55)';ctx.fillText('СКЛАД',dcx,dy2-14);
      ctx.textAlign='left';ctx.restore();
      // ---- единая метрика роста: робот выше человека примерно на 15% ----
      const MON_PXC=h*0.470, G_PXC=MON_PXC*0.855;
      const gscC=epiGuardScale(G_PXC);
      // ---- аниматроники гонятся сзади, слева, вне зоны охранника ----
      [[-0.10,1.00,'main'],[-0.34,0.93,'felix'],[-0.58,0.86,'exo'],[-0.80,0.80,'lav']].forEach((a,i)=>{
        const app=cl((t-T_RUN-0.3-i*0.45)/2.2);
        if(app<=0)return;
        // они догоняют: подтягиваются к левому краю кадра, но не обгоняют его
        const ax=w*(a[0]+0.40*app);
        const gy=flC-h*0.030*(1-a[1])*3.4;
        ctx.save();ctx.globalAlpha=Math.min(1,app*1.4);
        epiAnimatron(ctx,ax,gy,epiMonScale(MON_PXC*a[1]),t,
          {kind:a[2],seed:i*2.3,face:1,dark:0.80-0.14*app,
           eye:0.55+0.45*app,fog:0.14,shadowDir:-1});
        ctx.restore();});
      // ---- охранник: вид сбоку, бежит ровно вправо ----
      const gx=w*(0.30+0.15*runK), gy=flC-epiGuardFeet(gscC);
      const slam=t>T_DOOR?cl((t-T_DOOR)/0.4):0;
      drawGuardChar(ctx,gx,gy,gscC,{t,pose:slam>0.5?'brace':'run',face:1,
        // V88: back убран — он бежит В ПРОФИЛЬ вправо, а не в глубину кадра.
        // Упреждение перед рывком: первые полсекунды он приседает и уводит корпус.
        antic:t<T_RUN+0.45?cl((t-T_RUN+0.45)/0.45):0,
        settle:slam>0.5?(t-(T_DOOR+0.2)):-1,
        phase:t*16,dust:true,dark:0.30+0.24*runK,look:slam>0.5?0.85:0.30,
        shadowDir:-1,shadowLen:1.25,shadowAlpha:0.44,seed:1.7,cold:true,
        rim:{dir:1,col:'150,170,200',power:0.20+0.10*Math.abs(Math.sin(t*8))}});
      // ---- полосы смаза по ходу движения: скорость читается даже на стопкадре ----
      if(!low&&runK>0.05&&slam<0.5){
        ctx.save();ctx.globalCompositeOperation='lighter';
        for(let i=0;i<14;i++){
          const yy=h*(0.16+((i*29)%64)/100), ln=w*(0.06+0.10*epiRnd(i*5.3));
          const xx=(w*1.2-((t*1900+i*211)%(w*1.9)))*1;
          ctx.fillStyle='rgba(150,175,205,'+(0.020+0.030*runK).toFixed(3)+')';
          ctx.fillRect(xx,yy,ln,1.4);
        }
        ctx.restore();
      }
    }else{
      // ---------- СКЛАД ----------
      const bg=ctx.createLinearGradient(0,0,0,h);
      bg.addColorStop(0,'#0a0806');bg.addColorStop(.52,'#110d09');bg.addColorStop(1,'#050403');
      ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
      const flY=h*0.755;
      // оверскан: комната рисуется шире кадра, иначе при отъезде камеры
      // по краям торчит пустота вместо продолжения склада
      const OX=-w*0.7, OW=w*2.4;
      ctx.fillStyle='#050406';ctx.fillRect(OX,-h*0.7,OW,h*2.4);
      // задняя стена: тёмный бетон, свет лампы её едва достаёт
      ctx.fillStyle='#0d0a08';ctx.fillRect(OX,h*0.14,OW,flY-h*0.14);
      for(let i=0;i<6;i++){ctx.fillStyle='rgba(0,0,0,.26)';ctx.fillRect(OX,h*(0.17+i*0.10),OW,h*0.018);}
      // стеллажи только по краям — центр кадра оставлен под костюм
      [[0.02,0.155],[0.185,0.130],[0.795,0.150],[0.945,0.075]].forEach((R,r)=>{
        const rx=w*R[0], rw2=w*R[1];
        ctx.fillStyle='#120e0a';ctx.fillRect(rx,h*0.30,rw2,flY-h*0.30);
        ctx.fillStyle='#0a0806';ctx.fillRect(rx,h*0.30,rw2,h*0.012);
        for(let q=0;q<3;q++){
          const shY=h*(0.40+q*0.125);
          ctx.fillStyle='#1a1510';ctx.fillRect(rx,shY,rw2,h*0.013);
          for(let b=0;b<2;b++){
            const bw2=rw2*0.44, bh2=h*0.052;
            ctx.fillStyle=(r+q+b)%2?'#241c14':'#1d1610';
            ctx.fillRect(rx+rw2*0.04+b*rw2*0.50,shY-bh2,bw2,bh2);
            ctx.fillStyle='rgba(0,0,0,.34)';ctx.fillRect(rx+rw2*0.04+b*rw2*0.50,shY-bh2,bw2,bh2*0.22);
            ctx.fillStyle='rgba(255,255,255,.02)';ctx.fillRect(rx+rw2*0.04+b*rw2*0.50,shY-bh2,bw2*0.10,bh2);}
        }
      });
      // пол
      ctx.fillStyle='#0b0908';ctx.fillRect(OX,flY,OW,h*1.4-flY);
      ctx.strokeStyle='rgba(255,255,255,.018)';ctx.lineWidth=1;
      for(let i=0;i<7;i++){ctx.beginPath();ctx.moveTo(OX,flY+i*((h-flY)/7));ctx.lineTo(OX+OW,flY+i*((h-flY)/7));ctx.stroke();}
      ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(OX,flY,OW,3);
      // качающаяся лампа: узкое пятно света, а не общая засветка
      const sway=Math.sin(t*1.4)*w*0.022;
      const lx=w*0.50+sway, ly=h*0.115;
      ctx.strokeStyle='#1c1712';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(w*0.50,0);ctx.lineTo(lx,ly);ctx.stroke();
      ctx.save();ctx.globalCompositeOperation='lighter';
      const lg=ctx.createRadialGradient(lx,ly,4,lx,ly,h*0.52);
      lg.addColorStop(0,'rgba(255,224,166,.30)');lg.addColorStop(.22,'rgba(255,196,126,.09)');lg.addColorStop(1,'rgba(255,188,118,0)');
      ctx.fillStyle=lg;ctx.fillRect(0,0,w,h);ctx.restore();
      // конус света на полу
      ctx.save();ctx.globalCompositeOperation='lighter';
      const cone=ctx.createLinearGradient(0,ly,0,flY+h*0.06);
      cone.addColorStop(0,'rgba(255,214,150,.055)');cone.addColorStop(.55,'rgba(255,204,136,.022)');cone.addColorStop(1,'rgba(255,196,124,0)');
      ctx.fillStyle=cone;ctx.beginPath();ctx.moveTo(lx-10,ly);ctx.lineTo(lx+10,ly);
      ctx.lineTo(lx+w*0.16,flY+h*0.06);ctx.lineTo(lx-w*0.16,flY+h*0.06);ctx.closePath();ctx.fill();ctx.restore();
      ctx.fillStyle='#ffe9bd';ctx.beginPath();ctx.arc(lx,ly,5.5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#2a231a';ctx.fillRect(lx-9,ly-9,18,5);
      // дверь склада слева: закрыта, потом открывается и входят они
      const ddx=w*0.055, ddy=h*0.335, ddw=w*0.105, ddh=flY-h*0.335;
      ctx.fillStyle='#1c1710';ctx.fillRect(ddx-6,ddy-6,ddw+12,ddh+12);
      const open=enterK;
      ctx.fillStyle='#08090c';ctx.fillRect(ddx,ddy,ddw,ddh);
      ctx.fillStyle='#241d15';ctx.fillRect(ddx+ddw*open,ddy,ddw*(1-open),ddh);
      if(open>0.05){ctx.save();ctx.globalCompositeOperation='lighter';
        const og=ctx.createLinearGradient(ddx,0,ddx+ddw*1.8,0);
        og.addColorStop(0,'rgba(120,150,180,'+(0.10*open).toFixed(3)+')');og.addColorStop(1,'rgba(120,150,180,0)');
        ctx.fillStyle=og;ctx.fillRect(ddx,ddy,ddw*1.8,ddh);ctx.restore();}
      // ---- костюм на стойке (пока он его не надел) ----
      const suitX=w*0.605, suitY=flY-h*0.012;
      if(wearK<0.5){
        // стойка — позади костюма, иначе штанга перечёркивает его насквозь
        // V88: стойка подтянута под рост костюма. Раньше пустой костюм висел
        // заметно мельче человека, и надетый вариант «вырастал» из ниоткуда.
        // RSC выведен из того же роста, что и охранник (h*0.415*0.855),
        // делённого на высоту спрайта костюма (60 юнитов × 3).
        const RSC=h*0.415*0.855/180;
        ctx.fillStyle='#181410';ctx.fillRect(suitX-3.5,suitY-h*0.415,7,h*0.415);
        ctx.fillStyle='#221c15';ctx.fillRect(suitX-32,suitY-h*0.418,64,7);
        ctx.fillStyle='#121009';ctx.fillRect(suitX-30,suitY-2,60,7);
        // V88: пустой костюм должен исчезнуть РАНЬШЕ, чем на охраннике появятся
        // штанины, иначе в кадре одновременно два костюма
        ctx.save();ctx.globalAlpha=Math.max(0,1-wearK*5.0);
        epiRackSuit(ctx,suitX,suitY-h*0.020,RSC,t,{sway:0.6});
        ctx.restore();
      }
      // ---- V88: ЕДИНАЯ МЕТРИКА РОСТА ДЛЯ ВСЕЙ СЦЕНЫ ----
      // Аниматроник — примерно 2.1 м, человек — 1.8 м, отсюда 0.855.
      const MON_PX=h*0.415, G_PX=MON_PX*0.855;
      const GSC=epiGuardScale(G_PX);
      // ступни точно на линии пола: раньше якорь считали как 24*3*scale и фигура
      // уходила в пол на телефоне и висела над полом на широком экране
      const gGND=flY-epiGuardFeet(GSC);
      // ---- аниматроники входят в дверь ----
      // Было: четыре фигуры на одной линии с разбросом масштаба 0.99..1.22 и
      // сдвигом вправо, из-за которого ближайший наезжал прямо на охранника.
      // Стало: они занимают ЛЕВУЮ половину кадра, стоят на разной глубине
      // (дальние выше линии пола и мельче) и не доходят до костюма.
      if(enterK>0.02){
        [[0.115,1.00,'main'],[0.265,0.93,'felix'],[0.035,0.86,'exo'],[0.375,0.80,'lav']].forEach((a,i)=>{
          const app=cl((t-T_ENTER-i*0.55)/1.6);
          if(app<=0)return;
          const step=crushK>0?cl((t-T_LOCK-0.5-i*0.3)/1.6):0;
          const ax=w*(a[0]+0.075*app+0.045*step);
          const ay=flY-h*0.030*(1-a[1])*3.4;
          ctx.save();ctx.globalAlpha=Math.min(1,app*1.5);
          epiAnimatron(ctx,ax,ay,epiMonScale(MON_PX*a[1]),t,
            {kind:a[2],seed:i*1.9,face:1,dark:0.66-0.16*app-0.08*step,
             eye:0.6+0.4*app,head:step*0.12+pullK*0.13,
             armLift:app<1?Math.sin(t*3+i)*0.2:0});
          ctx.restore();});
      }
      // ---- охранник ----
      const gx0=w*0.20, gxSee=w*0.52;
      if(t<T_SEE){
        // прижался к закрытой двери, тяжело дышит
        const bk=cl((t-T_DOOR)/0.6);
        drawGuardChar(ctx,w*(0.18+0.02*bk),gGND,GSC,{t,pose:bk>0.35?'brace':'run',face:1,
          phase:t*17,dark:0.34,look:0.75,shadowDir:1,shadowLen:1.1,shadowAlpha:0.4,seed:1.7,
          cold:true,rim:{dir:-1,col:'255,206,150',power:0.24}});
      }else if(t<T_WEAR){
        // идёт к костюму
        drawGuardChar(ctx,gx0+(gxSee-gx0-w*0.055)*seeK,gGND,GSC,{t,pose:seeK<0.86?'walk':'reach',
          reachK:cl((seeK-0.86)/0.14),
          face:1,phase:epiStridePhase((gxSee-gx0-w*0.055)*seeK,GSC,0.52),
          dust:true,dark:0.28,look:seeK>0.8?0.35:0.15,
          shadowDir:1,shadowLen:1.2,shadowAlpha:0.42,seed:1.7,
          rim:{dir:-1,col:'255,210,158',power:0.26}});
      }else{
        // надевает костюм и остаётся в нём
        // V88: он стоит чуть левее стойки, а не ровно перед ней — иначе штанга
        // и висящий костюм рисуются прямо сквозь его голову
        const gxx=suitX-w*0.075, gyy=gGND;
        let pose='wear', lie=0, spasm=0;
        if(t>=T_LAUGH&&t<T_LOCK){pose='laugh';}
        else if(t>=T_LOCK&&t<T_FALL){pose='crush';spasm=1-cl((t-T_LOCK)/2.4)*0.7;}
        else if(t>=T_FALL){pose='crush';lie=fallK;spasm=0.25*(1-fallK);}
        const wk=cl((t-T_WEAR)/WEAR_DUR);
        // после входа аниматроников он разворачивается к ним (они слева от него)
        const gFace=(t>=T_ENTER+0.6)?-1:1;
        // V88: ОН ДЕЙСТВИТЕЛЬНО СМОТРИТ НА НИХ. Раньше на смехе передавалось
        // look:-0.2 — то есть взгляд ОТ них, да ещё и слабый, а голова костюма
        // вообще не имела доворота и смотрела строго в зал. Теперь голова зайца
        // доворачивается к вошедшим и медленно ведёт по группе, пока он хохочет.
        const gaze=cl((t-T_ENTER-0.3)/1.1);
        const scan=(t>=T_LAUGH)?Math.sin((t-T_LAUGH)*0.62)*0.30:0;
        const yaw=(pose==='crush')?0.30*(1-fallK):gaze*(0.66+scan);
        // Падение: тело и костюм должны валиться ОДНИМ куском, поэтому оба
        // рисуются внутри общего поворота вокруг точки опоры на полу.
        ctx.save();
        if(lie>0){ctx.translate(gxx,flY);ctx.rotate(lie*(-Math.PI*0.44)*gFace);ctx.translate(-gxx,-flY);}
        drawGuardChar(ctx,gxx,gyy,GSC,{t,pose,face:gFace,
          wearK:wk,spasm,lie:0,dark:0.22+0.20*wk,
          // взгляд в сторону поворота корпуса, то есть на аниматроников
          look:pose==='laugh'?0.55+scan*0.5:(pose==='crush'?0.30:0.15),
          // кепку снимает перед тем, как надеть голову, а не в начале
          noCap:wk>0.52,noHead:wk>0.74,noArms:wk>0.58,
          shadowDir:1,shadowLen:1.25,shadowAlpha:0.45,seed:1.7,
          rim:{dir:-1,col:'255,212,160',power:0.28},noShadow:lie>0.15});
        epiWornSuit(ctx,gxx,gyy,GSC,t,{k:wk,face:gFace,yaw,
          lean:pose==='laugh'?-0.22:(pose==='crush'?0.30:0),
          bob:pose==='laugh'?Math.abs(Math.sin(t*13))*1.4:0,
          tilt:(pose==='laugh'?-0.14:0)+(pose==='crush'?Math.sin(t*24)*0.05*spasm:0),
          humanEyes:crushK<0.5,
          blood:crushK*0.9,spring:lockK*Math.min(1,crushK*1.6)});
        ctx.restore();
        // тень лежащего тела
        if(lie>0.15){
          ctx.save();ctx.globalAlpha=0.34*lie;ctx.fillStyle='#000';ctx.beginPath();
          ctx.ellipse(gxx-w*0.02*gFace,flY+3,w*0.055*lie+18,h*0.011,0,0,Math.PI*2);ctx.fill();ctx.restore();
        }
        // кровь на полу под костюмом
        if(crushK>0.25){
          const bk=cl((crushK-0.25)/0.75);
          ctx.save();ctx.globalAlpha=0.85;
          const bx0=gxx-w*0.045*lie*gFace;
          const pg=ctx.createRadialGradient(bx0,flY+2,2,bx0,flY+2,w*0.10*bk);
          pg.addColorStop(0,'rgba(96,6,10,.85)');pg.addColorStop(1,'rgba(70,4,8,0)');
          ctx.fillStyle=pg;ctx.beginPath();
          ctx.ellipse(bx0,flY+3,w*0.095*bk,h*0.020*bk,0,0,Math.PI*2);ctx.fill();ctx.restore();
        }
      }
      // тёплый свет лампы поверх сцены
      ctx.save();ctx.globalCompositeOperation='lighter';
      const wg=ctx.createRadialGradient(lx,ly+h*0.2,10,lx,ly+h*0.2,h*0.9);
      wg.addColorStop(0,'rgba(255,186,110,.10)');wg.addColorStop(1,'rgba(255,170,100,0)');
      ctx.fillStyle=wg;ctx.fillRect(0,0,w,h);ctx.restore();
      // пыль
      if(!low){for(let i=0;i<30;i++){
        const dx=(i*163+t*7)%w, dy=h*((i*37%86)/100)+Math.sin(t*0.5+i)*9;
        ctx.fillStyle='rgba(226,204,168,'+(0.03+0.07*Math.abs(Math.sin(t*0.8+i))).toFixed(3)+')';
        ctx.fillRect(dx,dy,1.6,1.6);}}
    }
    ctx.restore(); // конец камеры
    // холодный обесцвеченный грейд, усиливающийся к финалу
    ctx.save();ctx.globalCompositeOperation='saturation';
    ctx.fillStyle='rgba(128,128,128,'+(0.10+0.30*pullK+0.25*silK).toFixed(3)+')';
    ctx.fillRect(0,0,w,h);ctx.restore();
    epiGrade(ctx,w,h,t,low,'rgba(28,20,14,0.12)',0.50+0.24*pullK,1.15);
    // «замолкает»: кадр уходит в чёрный по краям и глохнет
    if(silK>0){ctx.save();ctx.globalAlpha=Math.min(1,silK*0.9);
      const vg=ctx.createRadialGradient(w*0.5,h*0.56,h*0.10,w*0.5,h*0.56,h*0.62);
      vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,1)');
      ctx.fillStyle=vg;ctx.fillRect(0,0,w,h);ctx.restore();}
  }
  if(finalK>0){ctx.save();ctx.globalAlpha=Math.min(1,finalK);ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);ctx.restore();}
  ctx.restore();
  // ---- титры и субтитры ----
  // V101: ВСТУПИТЕЛЬНОГО ТЕКСТА В КОНЦОВКАХ БОЛЬШЕ НЕТ. Титр «ГЛАВА V — 06:00»
  // с подзаголовком объяснял словами то, что дальше показано кадрами, и первые
  // две секунды каждого финала уходили на чтение, а не на сцену.
  epiSub(ctx,w,h,t,2.6,2.4,'Он не идёт к выходу. Он бежит.');
  epiSub(ctx,w,h,t,6.6,1.6,'Дверь склада. Засов. Тишина за спиной.');
  epiSub(ctx,w,h,t,8.4,2.0,'На стойке висит костюм. Пустой.');
  epiSub(ctx,w,h,t,10.8,2.3,'Внутри — пружины. Он знает это. И всё равно надевает.');
  // V88: реплика на само надевание — окно выросло до 5.4 с, и его надо занять
  epiSub(ctx,w,h,t,13.3,2.5,'Штанины. Плечи. Рукава. Голову — последней.');
  epiSub(ctx,w,h,t,16.8,1.7,'Засов не держит. Они входят.');
  epiSub(ctx,w,h,t,18.8,1.9,'И тогда он смеётся им в лицо.');
  epiSub(ctx,w,h,t,21.0,2.4,'Он смотрит на них через прорези маски. Он победил.');
  epiSub(ctx,w,h,t,24.2,2.2,'Щелчок. Рёбра складываются внутрь.');
  epiSub(ctx,w,h,t,27.0,1.8,'Он падает. Смех обрывается.');
  epiSub(ctx,w,h,t,29.0,2.6,'Они не подходят. Они просто смотрят, как он умирает.');
  epiSub(ctx,w,h,t,32.0,1.8,'И всё замолкает.');
  // epiCard(ctx,w,h,t,T_FINAL+0.6,3.8,'КОНЦОВКА: КОСТЮМ-ЛОВУШКА','ОН НАДЕЛ ЕГО САМ · СМЕРТЕЙ: '+epiDeaths(),'#dfa46a');
  epiBars(ctx,w,h,1);
  epiTimecode(ctx,w,h,POV?'NS-04 · КАМЕРА КОСТЮМА · СИГНАЛ ВНУТРИ':'NS-04 · СКЛАД · ЗАПИСЬ 06:0'+Math.min(9,Math.floor(t/3)),0.38);
  epiSkipHint(ctx,w,h,t);
}
// ===========================================================================
// V74: ГЛАВНОЕ МЕНЮ МЕНЯЕТСЯ В ЗАВИСИМОСТИ ОТ ПОЛУЧЕННОЙ КОНЦОВКИ
// ===========================================================================
// «ПЕПЕЛ»: то, что осталось от пиццерии к утру.
function drawAshMenu(){
  const t=performance.now()/1000;
  const low=document.body.classList.contains('low-end');
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#4a2a1c');g.addColorStop(.34,'#7a442a');g.addColorStop(.52,'#a9633a');
  g.addColorStop(.62,'#3a2a20');g.addColorStop(1,'#120c09');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // низкое солнце в дыму
  const sunX=W*0.30, sunY=H*0.46;
  ctx.save();ctx.globalCompositeOperation='lighter';
  const sg=ctx.createRadialGradient(sunX,sunY,4,sunX,sunY,W*0.42);
  sg.addColorStop(0,'rgba(255,214,150,.55)');sg.addColorStop(.3,'rgba(255,168,92,.18)');sg.addColorStop(1,'rgba(255,140,70,0)');
  ctx.fillStyle=sg;ctx.fillRect(0,0,W,H);ctx.restore();
  // силуэт руин
  const flY=H*0.70;
  ctx.fillStyle='#1b120d';
  ctx.beginPath();ctx.moveTo(W*0.44,flY);
  const rp=[[0.46,0.52],[0.50,0.56],[0.54,0.44],[0.58,0.50],[0.61,0.40],[0.66,0.47],[0.70,0.43],[0.75,0.55],[0.80,0.50],[0.86,0.60],[0.92,0.56]];
  rp.forEach(p=>ctx.lineTo(W*p[0],H*p[1]));
  ctx.lineTo(W*0.96,flY);ctx.closePath();ctx.fill();
  // обугленные балки
  ctx.strokeStyle='#0d0907';ctx.lineWidth=4;
  for(let i=0;i<7;i++){const bx=W*(0.47+i*0.065);
    ctx.beginPath();ctx.moveTo(bx,flY);ctx.lineTo(bx+(i%2?12:-14),H*(0.44+((i*13)%9)/100));ctx.stroke();}
  // вывеска, упавшая в пепел
  // V85: вывеска уведена из-под колонки кнопок и получила верный текст
  // вместо смешанного латинско-кириллического набора.
  ctx.save();ctx.translate(W*0.435,flY-6);ctx.rotate(-0.22);
  ctx.fillStyle='#150f0c';ctx.fillRect(-96,-30,192,34);
  ctx.strokeStyle='rgba(255,150,80,.35)';ctx.lineWidth=1.5;ctx.strokeRect(-96,-30,192,34);
  text2(ctx,'PIZZA',0,-8,17,'rgba(224,150,92,.72)','center');
  ctx.restore();
  // пол-пепелище
  ctx.fillStyle='#171110';ctx.fillRect(0,flY,W,H-flY);
  for(let i=0;i<90;i++){const ax=(i*137)%W, ay=flY+((i*53)%Math.max(1,H-flY));
    ctx.fillStyle=(i%3)?'rgba(0,0,0,.35)':'rgba(212,200,190,.05)';
    ctx.fillRect(ax,ay,2+(i%4),2);}
  // тлеющие очаги, дым и искры
  drawFlames(ctx,W*0.50,flY,W*0.16,H*0.10,t,0.42,3.1);
  drawFlames(ctx,W*0.72,flY,W*0.11,H*0.07,t,0.30,7.7);
  drawEmbers(ctx,W*0.44,flY,W*0.42,H*0.46,t,low?12:34,0.55);
  // V85: столб дыма уведён в сторону — раньше он проходил ровно по фигуре
  // и читался как тёмный прямоугольник за его спиной.
  if(!low){drawSmokeColumn(ctx,W*0.70,flY-10,W*0.10,H*0.62,t,0.30);
    drawSmokeColumn(ctx,W*0.86,flY-6,W*0.07,H*0.50,t,0.22);}
  // охранник смотрит на пепелище
  // V85: фигура была на W*0.30 и целиком уходила под кнопки меню.
  drawGuardChar(ctx,W*(menuLow()?0.74:0.575),flY+H*(menuLow()?-0.06:0.045),1.28,{t,pose:'stand',face:1,dark:0.36,look:0.5,
    shadowDir:-1,shadowLen:2.0,shadowAlpha:0.5,seed:1.7,
    rim:{dir:1,col:'255,158,80',power:0.34+0.16*Math.abs(Math.sin(t*5))}});
  // заголовок и кнопки. V86: шапка от высоты кадра.
  const q=endGeom();
  // V87: светлые строки шапки терялись на ярком оранжевом небе — добавлен
  // мягкий верхний градиент дыма.
  {const hh=Math.min(H*.72,q.s3+q.fs3*2.2);
   const sg=ctx.createLinearGradient(0,0,0,hh);
   sg.addColorStop(0,'rgba(18,8,4,.46)');sg.addColorStop(.62,'rgba(18,8,4,.22)');sg.addColorStop(1,'rgba(18,8,4,0)');
   ctx.fillStyle=sg;ctx.fillRect(0,0,W,hh);}
  ctx.save();ctx.font='700 '+q.ts+'px "Oswald",Impact,sans-serif';ctx.textAlign='left';
  ctx.shadowColor='rgba(0,0,0,.8)';ctx.shadowBlur=16;
  ctx.fillStyle='#fbe7cf';ctx.fillText('НОЧНАЯ',q.bx,q.y1);
  ctx.fillStyle='#e08a4a';ctx.fillText('СМЕНА',q.bx,q.y2);
  ctx.restore();
  ctx.save();ctx.shadowColor='rgba(0,0,0,.7)';ctx.shadowBlur=8;
  text2(ctx,'ПИЦЦЕРИИ БОЛЬШЕ НЕТ',q.bx,q.s1,q.fs1,'#f0d6b8');ctx.restore();
  ctx.save();ctx.shadowColor='rgba(0,0,0,.75)';ctx.shadowBlur=8;
  text2(ctx,'ОН УШЁЛ ДО ТОГО, КАК ПРИЕХАЛИ ПОЖАРНЫЕ.',q.bx,q.s2,q.fs2,'#f0dcc4');
  text2(ctx,'ФИНАЛЬНОЕ МЕНЮ // КОНЦОВКА «ПЕПЕЛ»',q.bx,q.s3,q.fs3,'#f0c69c');ctx.restore();
  menuButtons(q.bx,q.by,q.gap,q.bw,q.bh,{m:'#e07a3a',g:'rgba(224,122,58,.42)',t:'#f2dcc6'},1,{bottom:q.bottom});
  const wgg=ctx.createLinearGradient(0,0,W,H);
  wgg.addColorStop(0,'rgba(255,180,110,.10)');wgg.addColorStop(1,'rgba(30,14,8,.20)');
  ctx.fillStyle=wgg;ctx.fillRect(0,0,W,H);
  vigFill(.5,.52,.28,.98,[[0,'rgba(0,0,0,0)'],[1,'rgba(12,6,4,.72)']]);
  scan();
}
// «ЕЩЁ ОДИН КОСТЮМ»: он так и сидит в кресле, и смена не кончается.
function drawSuitMenu(){
  const t=performance.now()/1000;
  const low=document.body.classList.contains('low-end');
  const pulse=0.5+0.5*Math.sin(t*1.6);
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#04060a');g.addColorStop(.5,'#080c12');g.addColorStop(1,'#020304');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // офис: стол, монитор, заложенная дверь в глубине
  const flY=H*0.80;
  ctx.fillStyle='#0a0e13';ctx.fillRect(0,H*0.18,W,flY-H*0.18);
  for(let i=0;i<6;i++){ctx.fillStyle='rgba(0,0,0,.24)';ctx.fillRect(0,H*(0.20+i*0.10),W,H*0.018);}
  ctx.fillStyle='#080b0f';ctx.fillRect(0,flY,W,H-flY);
  // заложенная кирпичом дверь
  const dx=W*0.60,dy=H*0.30,dw=W*0.13,dh=H*0.42;
  ctx.fillStyle='#0a0d11';ctx.fillRect(dx-14,dy-14,dw+28,dh+14);
  ctx.fillStyle='#1b2129';ctx.fillRect(dx-11,dy-11,dw+22,dh+11);
  ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(dx-11,dy-11,dw+22,6);
  ctx.fillStyle='rgba(150,170,190,.10)';ctx.fillRect(dx-11,dy-11,4,dh+11);
  for(let r=0;r<9;r++)for(let q=0;q<5;q++){
    ctx.fillStyle=(r+q)%2?'#1d1512':'#15100e';
    ctx.fillRect(dx+q*dw/5+(r%2?2:0),dy+r*dh/9,dw/5-2,dh/9-1.5);}
  ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(dx,dy,dw,dh*0.16);
  // мёртвая табличка «ВЫХОД» в корпусе над проёмом
  ctx.fillStyle='#0d1114';ctx.fillRect(dx+dw*0.5-34,dy-38,68,20);
  ctx.fillStyle='rgba(20,40,26,.85)';ctx.fillRect(dx+dw*0.5-31,dy-35,62,14);
  ctx.save();ctx.globalAlpha=0.55;text2(ctx,'ВЫХОД',dx+dw*0.5,dy-24,11,'#3f6b4c','center');ctx.restore();
  // V85: ПОСТ ОХРАНЫ СПРАВА. Раньше правая треть кадра была пустой
  // чёрной стеной: стол, два монитора, шкафчики и коробки.
  {
    const sx=W*0.755, sy=flY-H*0.008, sw=W*0.235, sh=H*0.042;
    // два шкафчика у самого края
    for(let i=0;i<2;i++){
      const lx=W*(0.905+i*0.052), lw=W*0.048, lh=H*0.30;
      ctx.fillStyle='#18202a';ctx.fillRect(lx,flY-lh,lw,lh);
      ctx.fillStyle='rgba(170,192,214,.14)';ctx.fillRect(lx,flY-lh,2.5,lh);
      ctx.fillStyle='rgba(0,0,0,.42)';ctx.fillRect(lx+lw*0.48,flY-lh,2,lh);
      ctx.fillStyle='#161d24';ctx.fillRect(lx+lw*0.30,flY-lh*0.56,lw*0.10,lh*0.05);
      ctx.fillRect(lx+lw*0.62,flY-lh*0.56,lw*0.10,lh*0.05);
    }
    // столешница и тумба
    ctx.fillStyle='rgba(0,0,0,.40)';ctx.fillRect(sx-6,flY,sw+12,H*0.012);
    ctx.fillStyle='#1e2733';ctx.fillRect(sx,sy,sw,sh);
    ctx.fillStyle='rgba(178,202,224,.18)';ctx.fillRect(sx,sy,sw,2.5);
    ctx.fillStyle='#131a22';ctx.fillRect(sx+sw*0.06,sy+sh,sw*0.34,flY-sy-sh);
    ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(sx+sw*0.06,sy+sh+H*0.028,sw*0.34,2);
    // два погасших монитора, один ещё держит тлеющий шум
    for(let i=0;i<2;i++){
      const mw=sw*0.36, mh=H*0.115, mx=sx+sw*0.05+i*(mw+sw*0.10), my=sy-mh;
      ctx.fillStyle='#10161c';ctx.fillRect(mx,my,mw,mh);
      const live=i===0?(0.055+0.045*epiRnd(Math.floor(t*4))):0.022;
      ctx.fillStyle='#0b1014';ctx.fillRect(mx+4,my+4,mw-8,mh-8);
      ctx.fillStyle='rgba(112,152,182,'+live.toFixed(3)+')';ctx.fillRect(mx+4,my+4,mw-8,mh-8);
      ctx.fillStyle='rgba(170,192,214,.13)';ctx.fillRect(mx,my,mw,2);
      ctx.fillStyle='#0a0e12';ctx.fillRect(mx+mw*0.42,sy-H*0.012,mw*0.16,H*0.012);
    }
    // коробки под столом
    for(let i=0;i<3;i++){
      const bxx=sx+sw*(0.52+i*0.15), bhh=H*(0.034-i*0.004);
      ctx.fillStyle=i%2?'#251d15':'#1d1720';
      ctx.fillRect(bxx,flY-bhh,W*0.036,bhh);
      ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(bxx,flY-bhh,W*0.036,2);
    }
  }
  // мёртвый плафон, редкий срыв
  const fk=(epiRnd(Math.floor(t*7))>0.82)?1:0.12;
  ctx.fillStyle='#111820';ctx.fillRect(W*0.40-24,H*0.16,48,5);
  ctx.save();ctx.globalCompositeOperation='lighter';
  const lg=ctx.createRadialGradient(W*0.40,H*0.17,3,W*0.40,H*0.17,H*0.5);
  lg.addColorStop(0,'rgba(178,198,220,'+(0.16*fk).toFixed(3)+')');lg.addColorStop(1,'rgba(140,170,200,0)');
  ctx.fillStyle=lg;ctx.fillRect(0,0,W,H);ctx.restore();
  // кресло охраны
  // V85: кресло стояло на W*0.33 и целиком пряталось за колонкой кнопок.
  const GS=1.30;
  // V86: на низком экране меню идёт в два столбца, и кресло пряталось за кнопками.
  const cx=W*(menuLow()?0.70:0.435), cy=flY-H*(menuLow()?0.12:0.045);
  // V85: кресло рисуется в том же масштабе, что и фигура — иначе увеличенный
  // охранник не влезал в старое сиденье.
  // V87: drawGuardChar сам сжимает фигуру на низком кадре (FIT=H/560), а кресло
  // считалось в пикселях под 720p — охранник сидел «мимо» сиденья. Теперь кресло
  // сжимается тем же коэффициентом.
  const CK=GS*Math.min(1,H/560)/1.16;
  // V87: на низком кадре кресло и фигура терялись в черноте — сзади добавлен
  // холодный подсвет, чтобы силуэт сидящего читался.
  if(menuLow()){ctx.save();ctx.globalCompositeOperation='lighter';
   const bl=ctx.createRadialGradient(cx,cy-H*0.10,4,cx,cy-H*0.10,H*0.30);
   bl.addColorStop(0,'rgba(96,126,164,.16)');bl.addColorStop(1,'rgba(96,126,164,0)');
   ctx.fillStyle=bl;ctx.fillRect(0,0,W,H);ctx.restore();}
  ctx.save();ctx.translate(cx,cy);ctx.scale(CK,CK);ctx.translate(-cx,-cy);
  ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.ellipse(cx,cy+36,74,11,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#181f28';ctx.fillRect(cx-50,cy-100,100,92);         // спинка
  ctx.fillStyle='#0c1116';ctx.fillRect(cx-50,cy-100,100,9);          // валик спинки
  ctx.fillStyle='rgba(160,182,204,'+(menuLow()?.24:.13)+')';ctx.fillRect(cx-50,cy-100,3,92);
  ctx.fillStyle='#141b23';ctx.fillRect(cx-62,cy-10,124,15);          // сиденье
  ctx.fillStyle='rgba(160,182,204,'+(menuLow()?.22:.11)+')';ctx.fillRect(cx-62,cy-10,124,3);
  ctx.fillStyle='#0c1116';ctx.fillRect(cx-66,cy-34,10,26);           // подлокотники
  ctx.fillRect(cx+56,cy-34,10,26);
  ctx.fillStyle='#0b0f14';ctx.fillRect(cx-9,cy+5,18,28);             // стойка
  ctx.fillStyle='#0d1218';ctx.fillRect(cx-46,cy+31,92,7);            // крестовина
  ctx.fillStyle='#0a0e13';[-42,-14,14,38].forEach(o=>ctx.fillRect(cx+o,cy+37,8,7));
  ctx.restore();
  // охранник сидит в кресле, глаза горят
  drawGuardChar(ctx,cx,cy-2,GS,{t,pose:'sit',face:1,dark:0.74,look:0.18,
    shadowDir:1,shadowLen:1.1,shadowAlpha:0.35,seed:1.7,
    rim:{dir:1,col:'96,128,164',power:0.16}});
  // V85: ореол глаз считается от масштаба фигуры — раньше был жёсткий
  // сдвиг под старый масштаб и огоньки уезжали на грудь.
  const ey=cy-2-H*0.173;
  ctx.save();ctx.globalCompositeOperation='lighter';
  [-6.2*CK,6.2*CK].forEach(dxx=>{
    // ореол узкий: широкий градиент раньше заливал всё лицо розовым
    const eg=ctx.createRadialGradient(cx+dxx,ey,0,cx+dxx,ey,13);
    eg.addColorStop(0,'rgba(255,58,68,'+(0.62+0.28*pulse).toFixed(3)+')');eg.addColorStop(1,'rgba(255,40,50,0)');
    ctx.fillStyle=eg;ctx.beginPath();ctx.arc(cx+dxx,ey,13,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(255,200,194,'+(0.72+0.2*pulse).toFixed(3)+')';
    ctx.fillRect(cx+dxx-2.6,ey-1.6,5.2,3.0);});
  ctx.restore();
  // пары глаз в темноте по бокам
  for(let i=0;i<6;i++){
    const side=i%2?1:-1, k=0.2+((i*0.13)%0.7);
    const ex2=W*0.5+side*W*(0.20+0.26*k), ey2=H*(0.42+0.22*k);
    if(epiRnd(i*3.1+Math.floor(t*1.5))>0.80)continue;
    const pl=0.5+0.5*Math.abs(Math.sin(t*(1.0+i*0.2)+i));
    ctx.save();ctx.globalCompositeOperation='lighter';
    [-5,5].forEach(dxx=>{
      const eg=ctx.createRadialGradient(ex2+dxx,ey2,0,ex2+dxx,ey2,13);
      eg.addColorStop(0,'rgba(206,52,42,'+(0.42*pl).toFixed(3)+')');eg.addColorStop(1,'rgba(200,40,34,0)');
      ctx.fillStyle=eg;ctx.beginPath();ctx.arc(ex2+dxx,ey2,13,0,Math.PI*2);ctx.fill();});
    ctx.restore();}
  // заголовок и кнопки. V86: шапка от высоты кадра.
  const q=endGeom();
  ctx.save();ctx.font='700 '+q.ts+'px "Oswald",Impact,sans-serif';ctx.textAlign='left';
  ctx.shadowColor='rgba(0,0,0,.9)';ctx.shadowBlur=16;
  ctx.fillStyle='#b9bec2';ctx.fillText('НОЧНАЯ',q.bx,q.y1);
  ctx.shadowColor='rgba(180,32,44,'+(0.4+0.3*pulse).toFixed(2)+')';ctx.shadowBlur=22;
  ctx.fillStyle='#a03a44';ctx.fillText('СМЕНА',q.bx,q.y2);
  ctx.restore();
  text2(ctx,'СМЕНА НЕ КОНЧАЕТСЯ',q.bx,q.s1,q.fs1,'#8e979d');
  ctx.fillStyle='rgba(198,40,50,'+(0.35+0.45*pulse).toFixed(2)+')';
  ctx.beginPath();ctx.arc(q.bx-11,q.s1-5,4,0,Math.PI*2);ctx.fill();
  text2(ctx,'ОН ДОШЁЛ ДО ДВЕРИ. ДВЕРИ БОЛЬШЕ НЕТ.',q.bx,q.s2,q.fs2,'#8d9499');
  text2(ctx,'ФИНАЛЬНОЕ МЕНЮ // КОНЦОВКА «ЕЩЁ ОДИН КОСТЮМ»',q.bx,q.s3,q.fs3,'#6f777c');
  menuButtons(q.bx,q.by,q.gap,q.bw,q.bh,{m:'#9a3239',g:'rgba(160,34,46,.42)',t:'#c9a4a8'},1,{bottom:q.bottom});
  if(!low){for(let i=0;i<3;i++){const bandY=((t*50+i*260)%(H+120))-60;
    ctx.fillStyle='rgba(255,255,255,'+(0.008+0.014*epiRnd(i*3+Math.floor(t*3))).toFixed(3)+')';
    ctx.fillRect(0,bandY,W,6+epiRnd(i+Math.floor(t*2))*16);}}
  ctx.save();ctx.globalCompositeOperation='saturation';
  ctx.fillStyle='rgba(128,128,128,.34)';ctx.fillRect(0,0,W,H);ctx.restore();
  vigFill(.42,.5,.22,.95,[[0,'rgba(0,0,0,0)'],[1,'rgba(0,0,0,.86)']]);
  scan();
}
// «КОСТЮМ-ЛОВУШКА»: склад, костюм и то, что в нём осталось.
function drawTrapMenu(){
  const t=performance.now()/1000;
  const low=document.body.classList.contains('low-end');
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#0b0806');g.addColorStop(.5,'#150f0a');g.addColorStop(1,'#050403');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  const flY=H*0.78;
  ctx.fillStyle='#14100c';ctx.fillRect(0,H*0.14,W,flY-H*0.14);
  for(let i=0;i<6;i++){ctx.fillStyle='rgba(0,0,0,.22)';ctx.fillRect(0,H*(0.17+i*0.105),W,H*0.02);}
  // стеллажи
  for(let r=0;r<3;r++){
    const rx=W*(0.52+r*0.17), rw=W*0.13;
    ctx.fillStyle='#100d0a';ctx.fillRect(rx,H*0.30,rw,flY-H*0.30);
    for(let q=0;q<3;q++){ctx.fillStyle='#161109';ctx.fillRect(rx,H*(0.33+q*0.145),rw,H*0.016);
      for(let b=0;b<2;b++){ctx.fillStyle=(r+q+b)%2?'#1d1710':'#17120c';
        ctx.fillRect(rx+rw*0.05+b*rw*0.48,H*(0.33+q*0.145)-H*0.055,rw*0.42,H*0.055);}}
  }
  ctx.fillStyle='#0e0b09';ctx.fillRect(0,flY,W,H-flY);
  // качающаяся лампа
  const sway=Math.sin(t*1.3)*W*0.022;
  const lx=W*0.62+sway, ly=H*0.085;
  ctx.strokeStyle='#26201a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(W*0.62,0);ctx.lineTo(lx,ly);ctx.stroke();
  ctx.save();ctx.globalCompositeOperation='lighter';
  const lg=ctx.createRadialGradient(lx,ly,4,lx,ly,H*0.56);
  lg.addColorStop(0,'rgba(255,222,162,.30)');lg.addColorStop(.24,'rgba(255,192,120,.07)');lg.addColorStop(1,'rgba(255,186,116,0)');
  ctx.fillStyle=lg;ctx.fillRect(0,0,W,H);ctx.restore();
  ctx.fillStyle='#ffe9bd';ctx.beginPath();ctx.arc(lx,ly,6,0,Math.PI*2);ctx.fill();
  // костюм лежит на полу, из швов торчат пружины, под ним пятно
  // V87: на низком кадре костюм сдвинут правее столбцов кнопок и приподнят,
  // иначе он налезал на кнопку и обрезался нижней кромкой.
  const sx=W*(menuLow()?0.765:0.655), sy=flY+H*(menuLow()?0.005:0.035);
  ctx.save();ctx.globalAlpha=0.9;
  const pg=ctx.createRadialGradient(sx,sy+4,3,sx,sy+4,W*0.13);
  pg.addColorStop(0,'rgba(88,5,9,.9)');pg.addColorStop(1,'rgba(60,3,6,0)');
  ctx.fillStyle=pg;ctx.beginPath();ctx.ellipse(sx,sy+5,W*0.115,H*0.026,0,0,Math.PI*2);ctx.fill();
  ctx.restore();
  // V87: лежащий костюм тоже масштабируется от высоты кадра.
  const SF=1.16*Math.min(1,H/560+0.12);
  // V88: смещение считается в тех же юнитах, что и сам спрайт (юнит охранника
  // = 3*SF*1.26*FIT). Раньше здесь стояло эмпирическое -18*SF/1.16, подобранное
  // под старый, заниженный размер костюма, и после выравнивания метрики лежащая
  // фигура уезжала из пепельной кучи и читалась как обломки.
  const AU=3*SF*1.26*Math.min(1,H/560);
  ctx.save();ctx.translate(sx,sy);ctx.rotate(-Math.PI*0.5);ctx.translate(0,-6.0*AU);
  drawGuardChar(ctx,0,0,SF,{t,pose:'crush',face:1,spasm:0,dark:0.52,look:0,
    noShadow:true,noCap:true,seed:1.7,rim:{dir:-1,col:'255,204,150',power:0.18}});
  epiWornSuit(ctx,0,0,SF,t,{k:1,face:1,lean:0.2,tilt:-0.1,humanEyes:false,blood:0.62,spring:0.45});
  ctx.restore();
  // аниматроники стоят в темноте и смотрят.
  // V87: на низком широком кадре фигуры считались в тех же единицах, что на 720p,
  // поэтому упирались в нижнюю кромку и залезали под столбцы кнопок. Теперь их
  // масштаб привязан к высоте кадра, а сами они сдвинуты правее кнопок.
  const FITa=Math.min(1,H/560);
  const spots=menuLow()
    ?[[0.700,0.76,'main'],[0.800,0.70,'felix'],[0.625,0.64,'exo'],[0.895,0.60,'lav']]
    :[[0.395,0.76,'main'],[0.535,0.70,'felix'],[0.290,0.64,'exo'],[0.650,0.60,'lav']];
  spots.forEach((a,i)=>{
    epiAnimatron(ctx,W*a[0],flY+H*0.02+H*0.012*i,a[1]*1.05*FITa,t,
      {kind:a[2],seed:i*2.1,face:1,dark:0.60,eye:0.55+0.35*Math.abs(Math.sin(t*1.2+i)),head:0.06});
  });
  // пыль в свете лампы
  if(!low){for(let i=0;i<26;i++){
    const dx=(i*151+t*6)%W, dy=H*((i*43%80)/100)+Math.sin(t*0.5+i)*8;
    ctx.fillStyle='rgba(232,208,168,'+(0.03+0.07*Math.abs(Math.sin(t*0.8+i))).toFixed(3)+')';
    ctx.fillRect(dx,dy,1.6,1.6);}}
  // заголовок и кнопки. V86: вся шапка считается от высоты кадра (endGeom).
  const q=endGeom();
  ctx.save();ctx.font='700 '+q.ts+'px "Oswald",Impact,sans-serif';ctx.textAlign='left';
  ctx.shadowColor='rgba(0,0,0,.9)';ctx.shadowBlur=16;
  ctx.fillStyle='#e8dcc6';ctx.fillText('НОЧНАЯ',q.bx,q.y1);
  ctx.fillStyle='#c98d4e';ctx.fillText('СМЕНА',q.bx,q.y2);
  ctx.restore();
  text2(ctx,'ОН НАДЕЛ КОСТЮМ САМ',q.bx,q.s1,q.fs1,'#c5ad8e');
  const capG=ctx.createLinearGradient(0,H*.80,0,H);
  capG.addColorStop(0,'rgba(4,3,2,0)');capG.addColorStop(.45,'rgba(4,3,2,.72)');capG.addColorStop(1,'rgba(4,3,2,.90)');
  ctx.fillStyle=capG;ctx.fillRect(0,H*.80,W,H*.20);
  // V85: подписи подняты над кнопками — раньше лежали на последней кнопке.
  text2(ctx,'ОН СМЕЯЛСЯ. МЕХАНИЗМ ДОСМЕЯЛСЯ ЗА НЕГО.',q.bx,q.s2,q.fs2,'#d8c3a6');
  text2(ctx,'ФИНАЛЬНОЕ МЕНЮ // КОНЦОВКА «КОСТЮМ-ЛОВУШКА»',q.bx,q.s3,q.fs3,'#a58a6a');
  menuButtons(q.bx,q.by,q.gap,q.bw,q.bh,{m:'#c98d4e',g:'rgba(201,141,78,.40)',t:'#e6d5bc'},1,{bottom:q.bottom});
  ctx.save();ctx.globalCompositeOperation='saturation';
  ctx.fillStyle='rgba(128,128,128,.22)';ctx.fillRect(0,0,W,H);ctx.restore();
  const wgg=ctx.createLinearGradient(0,0,W,H);
  wgg.addColorStop(0,'rgba(255,196,128,.04)');wgg.addColorStop(1,'rgba(16,9,5,.40)');
  ctx.fillStyle=wgg;ctx.fillRect(0,0,W,H);
  vigFill(.56,.56,.22,.96,[[0,'rgba(0,0,0,0)'],[1,'rgba(6,4,3,.86)']]);
  scan();
}

// ===========================================================================
// V85: МЕНЮ КОНЦОВКИ «ПРАВДА».
// Кассета вышла из здания — и меню теперь не зал пиццерии, а чужой
// кабинет на рассвете: жалюзи, лампа на шарнире, кассета «93» на столе
// в пакете для вещдоказательств, стывший кофе и он сам — впервые сидящий
// при свете и не один. Сине-красные отблески с улицы ещё ходят по стене.
// ===========================================================================
function drawTruthMenu(){
  const t=performance.now()/1000;
  const low=document.body.classList.contains('low-end');
  // ---- воздух кабинета: холодный рассвет снаружи ----
  const g=ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#0a161f');g.addColorStop(.34,'#132633');g.addColorStop(.56,'#1a3140');
  g.addColorStop(.70,'#121e26');g.addColorStop(1,'#070c10');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // ---- окно с жалюзи: свет ложится полосами на стену и на стол ----
  const wx=W*0.50,wy=H*0.14,ww=W*0.42,wh=H*0.34;
  ctx.fillStyle='#0c1620';ctx.fillRect(wx-10,wy-10,ww+20,wh+20);
  const sky=ctx.createLinearGradient(0,wy,0,wy+wh);
  sky.addColorStop(0,'#2b4a63');sky.addColorStop(.55,'#5c7e8c');sky.addColorStop(1,'#8aa79e');
  ctx.fillStyle=sky;ctx.fillRect(wx,wy,ww,wh);
  // город за окном
  ctx.fillStyle='rgba(10,18,24,.85)';
  for(let i=0;i<9;i++){
    const bh2=wh*(0.18+((i*37)%11)/34);
    ctx.fillRect(wx+i*ww/9,wy+wh-bh2,ww/9-3,bh2);
  }
  // мигалка во дворе ещё работает
  const beat=Math.floor(t*2.4)%2, bcol=beat?'70,140,255':'255,80,88';
  ctx.save();ctx.globalCompositeOperation='lighter';
  const fg=ctx.createRadialGradient(wx+ww*0.72,wy+wh*0.82,4,wx+ww*0.72,wy+wh*0.82,W*0.30);
  fg.addColorStop(0,'rgba('+bcol+',.20)');fg.addColorStop(1,'rgba('+bcol+',0)');
  ctx.fillStyle=fg;ctx.fillRect(0,0,W,H);ctx.restore();
  // ламели жалюзи
  for(let i=0;i<16;i++){
    ctx.fillStyle='rgba(12,20,26,.80)';
    ctx.fillRect(wx,wy+i*wh/16,ww,wh/16*0.52);
  }
  ctx.fillStyle='#16242e';ctx.fillRect(wx+ww*0.49,wy,W*0.008,wh);
  // световые полосы от жалюзи на полу и стене
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(let i=0;i<12;i++){
    ctx.fillStyle='rgba(150,196,216,'+(0.030+0.012*Math.sin(t*0.6+i)).toFixed(3)+')';
    ctx.fillRect(W*0.10,H*(0.50+i*0.038),W*0.86,H*0.014);
  }
  ctx.restore();
  // ---- стена слева: доска с делом, кнопки меню лягут поверх неё ----
  // Мягкий градиент вместо резкой заливки: раньше на границе W*0.46
  // был виден вертикальный шов по всей высоте кадра.
  {
    const lw=ctx.createLinearGradient(0,0,W*0.60,0);
    lw.addColorStop(0,'rgba(9,15,20,.62)');lw.addColorStop(.62,'rgba(9,15,20,.52)');
    lw.addColorStop(.86,'rgba(9,15,20,.22)');lw.addColorStop(1,'rgba(9,15,20,0)');
    ctx.fillStyle=lw;ctx.fillRect(0,0,W*0.60,H);
  }
  {
    // Доска сдвинута вверх и лишена чёткого контура: ранее её рамка торчала
    // из-под кнопок как случайный пустой прямоугольник.
    const dx=W*0.045,dy=H*0.285,dw=W*0.36,dh=H*0.50;
    ctx.fillStyle='rgba(16,26,33,.40)';ctx.fillRect(dx,dy,dw,dh);
    ctx.fillStyle='rgba(127,199,216,.07)';ctx.fillRect(dx,dy,dw,2);
    ctx.fillStyle='rgba(0,0,0,.30)';ctx.fillRect(dx,dy+dh-2,dw,2);
    // бумаги, приколотые к доске, и нить между ними
    const pins=[[0.14,0.12],[0.52,0.20],[0.24,0.52],[0.68,0.62],[0.40,0.80]];
    ctx.strokeStyle='rgba(200,90,96,.22)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(dx+dw*pins[0][0],dy+dh*pins[0][1]);
    pins.forEach(p=>ctx.lineTo(dx+dw*p[0],dy+dh*p[1]));ctx.stroke();
    pins.forEach((p,i)=>{
      const ppx=dx+dw*p[0],ppy=dy+dh*p[1];
      ctx.save();ctx.translate(ppx,ppy);ctx.rotate(((i%2)?1:-1)*0.05);
      ctx.fillStyle='rgba(214,208,190,.16)';ctx.fillRect(-W*0.028,-H*0.022,W*0.056,H*0.044);
      ctx.fillStyle='rgba(214,208,190,.24)';ctx.fillRect(-W*0.020,-H*0.014,W*0.040,2);
      ctx.fillRect(-W*0.020,-H*0.006,W*0.030,2);
      ctx.restore();
    });
  }
  // ---- ОБСТАНОВКА КАБИНЕТА: рама, подоконник, радиатор, шкафы, часы ----
  // V85: раньше окно было плоским прямоугольником в полоску, а правая часть кадра пустовала.
  {
    // толстая рама с фаской и крестовиной
    const fr=Math.max(6,W*0.007);
    ctx.fillStyle='#1d2b34';
    ctx.fillRect(wx-fr,wy-fr,ww+fr*2,fr);ctx.fillRect(wx-fr,wy+wh,ww+fr*2,fr);
    ctx.fillRect(wx-fr,wy,fr,wh);ctx.fillRect(wx+ww,wy,fr,wh);
    ctx.fillStyle='rgba(150,196,216,.16)';ctx.fillRect(wx-fr,wy-fr,ww+fr*2,2);
    ctx.fillStyle='#16222a';ctx.fillRect(wx,wy+wh*0.50-2,ww,4);
    // подоконник с предметами
    const sillY=wy+wh+fr;
    ctx.fillStyle='#243139';ctx.fillRect(wx-fr*2,sillY,ww+fr*4,H*0.016);
    ctx.fillStyle='rgba(160,206,226,.12)';ctx.fillRect(wx-fr*2,sillY,ww+fr*4,2);
    ctx.fillStyle='#1a2831';ctx.fillRect(wx+ww*0.10,sillY-H*0.030,W*0.016,H*0.030);
    ctx.fillStyle='#22323c';ctx.fillRect(wx+ww*0.16,sillY-H*0.022,W*0.030,H*0.022);
    // радиатор под окном
    const rY=sillY+H*0.020;
    for(let i=0;i<14;i++){
      ctx.fillStyle=i%2?'#1b262e':'#202d36';
      ctx.fillRect(wx+ww*0.04+i*ww*0.062,rY,ww*0.044,H*0.075);
    }
    ctx.fillStyle='#26343d';ctx.fillRect(wx+ww*0.03,rY-3,ww*0.90,4);
    // шкафы-картотеки в дальнем правом углу
    for(let d=0;d<2;d++){
      const cx2=W*0.945-d*W*0.058, cy2=H*0.34+d*H*0.02, cw2=W*0.055, ch2=H*0.40-d*H*0.03;
      ctx.fillStyle=d?'#141f26':'#182430';ctx.fillRect(cx2,cy2,cw2,ch2);
      ctx.fillStyle='rgba(150,196,216,.10)';ctx.fillRect(cx2,cy2,cw2,2);
      for(let r=0;r<4;r++){
        ctx.fillStyle='rgba(10,16,20,.55)';ctx.fillRect(cx2+3,cy2+H*0.018+r*ch2*0.235,cw2-6,ch2*0.185);
        ctx.fillStyle='rgba(180,206,220,.16)';ctx.fillRect(cx2+cw2*0.36,cy2+H*0.018+r*ch2*0.235+ch2*0.085,cw2*0.28,3);
      }
      ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(cx2-3,cy2,3,ch2);
    }
    // стенные часы: секундная шевелится — меню живое, а не картинка
    {
      const ox=W*0.465,oy=H*0.115,orr=Math.max(16,H*0.036);
      ctx.fillStyle='#16222a';ctx.beginPath();ctx.arc(ox,oy,orr,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#0c141a';ctx.beginPath();ctx.arc(ox,oy,orr*0.82,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='rgba(160,206,226,.30)';ctx.lineWidth=2;
      ctx.beginPath();ctx.arc(ox,oy,orr*0.82,0,Math.PI*2);ctx.stroke();
      ctx.strokeStyle='rgba(214,232,240,.55)';ctx.lineWidth=2.4;
      ctx.beginPath();ctx.moveTo(ox,oy);ctx.lineTo(ox+Math.cos(-1.05)*orr*0.42,oy+Math.sin(-1.05)*orr*0.42);ctx.stroke();
      ctx.beginPath();ctx.moveTo(ox,oy);ctx.lineTo(ox+Math.cos(1.9)*orr*0.60,oy+Math.sin(1.9)*orr*0.60);ctx.stroke();
      const sa=Math.floor(t)*(Math.PI/30)-Math.PI/2;
      ctx.strokeStyle='rgba(200,90,96,.70)';ctx.lineWidth=1.4;
      ctx.beginPath();ctx.moveTo(ox,oy);ctx.lineTo(ox+Math.cos(sa)*orr*0.68,oy+Math.sin(sa)*orr*0.68);ctx.stroke();
    }
  }
  // ---- стол справа: лампа, кассета в пакете, папка, стывший кофе ----
  const tx=W*0.575,ty=H*0.72,tw=W*0.405,th2=H*0.042;
  ctx.fillStyle='#1b262d';ctx.fillRect(tx,ty,tw,th2);
  ctx.fillStyle='#243139';ctx.fillRect(tx,ty,tw,H*0.009);
  ctx.fillStyle='rgba(160,206,226,.14)';ctx.fillRect(tx,ty,tw,2);
  ctx.fillStyle='#131c22';ctx.fillRect(tx,ty+th2,tw,H*0.010);
  // тумба стола с ящиками — стол больше не выглядит тонкой планкой
  ctx.fillStyle='#16212a';ctx.fillRect(tx+tw*0.62,ty+th2,tw*0.30,H*0.185);
  for(let r=0;r<3;r++){
    ctx.fillStyle='rgba(10,16,20,.60)';ctx.fillRect(tx+tw*0.635,ty+th2+H*0.014+r*H*0.058,tw*0.27,H*0.044);
    ctx.fillStyle='rgba(180,206,220,.16)';ctx.fillRect(tx+tw*0.735,ty+th2+H*0.032+r*H*0.058,tw*0.07,3);
  }
  ctx.fillStyle='#0d1418';ctx.fillRect(tx+tw*0.06,ty+th2,W*0.012,H*0.20);
  ctx.fillStyle='#0d1418';ctx.fillRect(tx+tw*0.86,ty+th2,W*0.012,H*0.20);
  // настольная лампа на шарнире (пересобрана: раньше читалась как летающая трапеция)
  const lx=tx+tw*0.78,ly=ty;
  ctx.fillStyle='#28353d';ctx.beginPath();
  ctx.ellipse(lx,ly-2,W*0.020,H*0.008,0,0,Math.PI*2);ctx.fill();   // основание
  ctx.strokeStyle='#33424b';ctx.lineWidth=Math.max(4,H*0.008);
  ctx.beginPath();ctx.moveTo(lx,ly-4);ctx.lineTo(lx-W*0.006,ly-H*0.135);ctx.stroke();
  ctx.beginPath();ctx.moveTo(lx-W*0.006,ly-H*0.135);ctx.lineTo(lx-W*0.062,ly-H*0.192);ctx.stroke();
  ctx.fillStyle='#3d4c55';ctx.beginPath();
  ctx.arc(lx-W*0.006,ly-H*0.135,Math.max(3,H*0.008),0,Math.PI*2);ctx.fill(); // шарнир
  // абажур — конус, раскрытый вниз к столу, со светящимся устьем
  ctx.save();ctx.translate(lx-W*0.062,ly-H*0.192);ctx.rotate(0.30);
  ctx.fillStyle='#4a5b64';ctx.beginPath();
  ctx.moveTo(-W*0.011,-H*0.006);ctx.lineTo(W*0.011,-H*0.006);
  ctx.lineTo(W*0.026,H*0.030);ctx.lineTo(-W*0.026,H*0.030);ctx.closePath();ctx.fill();
  ctx.fillStyle='rgba(190,222,238,.22)';ctx.fillRect(-W*0.011,-H*0.007,W*0.022,2);
  ctx.fillStyle='#2a353b';
  ctx.beginPath();ctx.ellipse(0,H*0.030,W*0.026,H*0.006,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(255,240,206,.95)';
  ctx.beginPath();ctx.ellipse(0,H*0.029,W*0.021,H*0.0045,0,0,Math.PI*2);ctx.fill();
  ctx.restore();
  ctx.save();ctx.globalCompositeOperation='lighter';
  const lg=ctx.createRadialGradient(lx-W*0.062,ly-H*0.155,4,lx-W*0.062,ly-H*0.155,W*0.28);
  lg.addColorStop(0,'rgba(255,236,196,.34)');lg.addColorStop(.5,'rgba(255,226,180,.08)');
  lg.addColorStop(1,'rgba(255,226,180,0)');
  ctx.fillStyle=lg;ctx.fillRect(W*0.30,H*0.28,W*0.70,H*0.62);
  // тёплое пятно на столе от лампы
  const lp=ctx.createRadialGradient(lx-W*0.075,ty+4,4,lx-W*0.075,ty+4,W*0.16);
  lp.addColorStop(0,'rgba(255,232,186,.20)');lp.addColorStop(1,'rgba(255,232,186,0)');
  ctx.fillStyle=lp;
  ctx.beginPath();ctx.ellipse(lx-W*0.075,ty+6,W*0.15,H*0.030,0,0,Math.PI*2);ctx.fill();
  ctx.restore();
  // кассета «93» в прозрачном пакете — главный предмет кадра
  {
    const u=Math.max(2.6,H*0.0075), cx=tx+tw*0.44, cy=ty-u*1.2;
    ctx.save();ctx.translate(cx,cy);ctx.rotate(-0.04);
    ctx.fillStyle='rgba(180,206,220,.10)';ctx.fillRect(-6.6*u,-4.4*u,13.2*u,8.8*u);
    ctx.strokeStyle='rgba(190,216,230,.22)';ctx.lineWidth=1;ctx.strokeRect(-6.6*u,-4.4*u,13.2*u,8.8*u);
    ctx.fillStyle='#151c22';ctx.fillRect(-5*u,-3*u,10*u,6*u);
    ctx.fillStyle='#232f38';ctx.fillRect(-4.4*u,-2.4*u,8.8*u,4.8*u);
    ctx.fillStyle='#0a1015';ctx.fillRect(-3*u,-1.4*u,6*u,2.8*u);
    ctx.fillStyle='#c9d2d8';ctx.beginPath();ctx.arc(-1.6*u,0,0.7*u,0,Math.PI*2);ctx.fill();
    ctx.beginPath();ctx.arc(1.6*u,0,0.7*u,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#e6dcc0';ctx.fillRect(-4.4*u,-2.4*u,8.8*u,1.1*u);
    ctx.fillStyle='#2b2118';ctx.font='700 '+(1.5*u).toFixed(1)+'px "JetBrains Mono",monospace';
    ctx.textAlign='center';ctx.fillText('93',0,-1.5*u);ctx.textAlign='left';
    // ярлык вещдоказательства
    ctx.fillStyle='rgba(226,196,120,.55)';ctx.fillRect(-6.6*u,3.2*u,5.2*u,1.6*u);
    ctx.restore();
    // блик лампы на плёнке и тень от кассеты на столе
    ctx.fillStyle='rgba(0,0,0,.35)';
    ctx.beginPath();ctx.ellipse(cx+u*2,ty+H*0.004,7.4*u,1.5*u,0,0,Math.PI*2);ctx.fill();
  }
  // папка с делом и стывший кофе
  ctx.save();ctx.translate(tx+tw*0.15,ty-H*0.006);ctx.rotate(-0.03);
  ctx.fillStyle='#3a3428';ctx.fillRect(0,0,W*0.075,H*0.006);
  ctx.fillStyle='#4a4436';ctx.fillRect(0,-H*0.004,W*0.075,H*0.005);
  ctx.restore();
  {
    const cux=tx+tw*0.66, cuy=ty;
    ctx.fillStyle='#c8c2b4';ctx.beginPath();
    ctx.moveTo(cux,cuy);ctx.lineTo(cux+W*0.022,cuy);
    ctx.lineTo(cux+W*0.018,cuy-H*0.042);ctx.lineTo(cux+W*0.004,cuy-H*0.042);ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(60,44,30,.75)';ctx.fillRect(cux+W*0.005,cuy-H*0.040,W*0.012,H*0.006);
    if(!low){ // едва заметный пар — кофе принесли недавно
      ctx.save();ctx.globalCompositeOperation='lighter';
      for(let i=0;i<9;i++){
        const k=((t*0.35+i*0.11)%1);
        ctx.fillStyle='rgba(220,232,240,'+(0.06*(1-k)).toFixed(3)+')';
        ctx.fillRect(cux+W*0.010+Math.sin(t*1.2+i)*W*0.006,cuy-H*0.044-k*H*0.075,2,2.4);
      }
      ctx.restore();
    }
  }
  // ---- он сам: сидит у стола, впервые при свете ----
  // Поднят выше и посажен на реальный стул: раньше фигура висела в воздухе
  // и её ноги уходили за нижнюю кромку кадра.
  // Стоит слева от стола и смотрит на кассету. Фигура видна целиком:
  // и сидящая поза, и попытка спрятать ноги за столешницей давали обрезки.
  drawGuardChar(ctx,W*(menuLow()?0.72:0.505),H*(menuLow()?0.66:0.775),1.42,{t,pose:'stand',face:1,dark:0.30,look:0.40,
    seed:1.7,shadowDir:1,shadowLen:1.3,shadowAlpha:0.34,
    rim:{dir:1,col:'150,205,224',power:0.32+0.10*Math.abs(Math.sin(t*0.7))}});
  // пыль в конусе лампы
  if(!low){ctx.save();ctx.globalCompositeOperation='lighter';
    for(let i=0;i<40;i++){
      const dxx=W*(0.42+((i*17)%53)/100), dyy=H*(0.36+((i*29)%48)/100);
      ctx.fillStyle='rgba(255,242,216,'+(0.04+0.06*Math.abs(Math.sin(t*0.5+i))).toFixed(3)+')';
      ctx.fillRect(dxx+Math.sin(t*0.3+i)*4,dyy+Math.cos(t*0.22+i)*3,1.6,1.6);
    }
    ctx.restore();}
  // ---- заголовок и кнопки. V86: шапка от высоты кадра ----
  const q=endGeom();
  ctx.save();ctx.font='700 '+q.ts+'px "Oswald",Impact,sans-serif';ctx.textAlign='left';
  ctx.shadowColor='rgba(0,0,0,.85)';ctx.shadowBlur=16;
  ctx.fillStyle='#e6f2f6';ctx.fillText('НОЧНАЯ',q.bx,q.y1);
  ctx.fillStyle='#7fc7d8';ctx.fillText('СМЕНА',q.bx,q.y2);
  ctx.restore();
  // Надписи стоят в шапке, как в остальных финальных меню: внизу на низком
  // экране их накрывала последняя кнопка.
  ctx.save();ctx.shadowColor='rgba(0,0,0,.85)';ctx.shadowBlur=10;
  text2(ctx,'ДЕЛО ОТКРЫЛИ ЗАНОВО',q.bx,q.s1,q.fs1,'#cfe8f0');
  text2(ctx,'КАССЕТА 93-ГО — НА СТОЛЕ',q.bx,q.s2,q.fs2,'#dcecf2');
  text2(ctx,'КОНЦОВКА «ПРАВДА»',q.bx,q.s3,q.fs3,'#8ec3d4');ctx.restore();
  menuButtons(q.bx,q.by,q.gap,q.bw,q.bh,{m:'#7fc7d8',g:'rgba(110,190,214,.42)',t:'#dff0f6'},1,{bottom:q.bottom});
  const wgg=ctx.createLinearGradient(0,0,W,H);
  wgg.addColorStop(0,'rgba(140,200,224,.08)');wgg.addColorStop(1,'rgba(6,12,18,.24)');
  ctx.fillStyle=wgg;ctx.fillRect(0,0,W,H);
  vigFill(.52,.54,.26,.98,[[0,'rgba(0,0,0,0)'],[1,'rgba(3,8,12,.80)']]);
  scan();
}

function drawEpilogueMenu(){
 const t=performance.now()/1000;
 const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#6fa6c0');g.addColorStop(.26,'#9dc6c6');g.addColorStop(.46,'#dfe6b8');g.addColorStop(.54,'#c6d99d');g.addColorStop(1,'#28472e');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 // soft volumetric haze / green shader-like bloom.
 const haze=ctx.createRadialGradient(W*.72,H*.40,10,W*.72,H*.40,W*.55);haze.addColorStop(0,'rgba(255,248,206,.22)');haze.addColorStop(1,'rgba(120,180,140,0)');ctx.fillStyle=haze;ctx.fillRect(0,0,W,H);
 const low=document.body.classList.contains('low-end');
 // ---- солнце с ореолом и лучами ----
 const sunX=W*.45,sunY=H*.10;
 {const s2=ctx.createRadialGradient(sunX,sunY,2,sunX,sunY,W*.40);
  s2.addColorStop(0,'rgba(255,252,220,.92)');s2.addColorStop(.11,'rgba(255,244,186,.52)');
  s2.addColorStop(.34,'rgba(255,236,158,.18)');s2.addColorStop(1,'rgba(255,236,158,0)');
  ctx.fillStyle=s2;ctx.fillRect(0,0,W,H);
  const s1=ctx.createRadialGradient(sunX,sunY,1,sunX,sunY,W*.13);
  s1.addColorStop(0,'rgba(255,255,244,1)');s1.addColorStop(1,'rgba(255,250,216,0)');
  ctx.fillStyle=s1;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#fffef4';ctx.beginPath();ctx.arc(sunX,sunY,W*.017,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(let i=0;i<13;i++){const an=Math.PI*0.20+i*0.075, len=W*0.72;
   ctx.fillStyle='rgba(255,248,206,'+(0.020+0.018*Math.abs(Math.sin(i*1.3+t*0.3))).toFixed(3)+')';
   ctx.beginPath();ctx.moveTo(sunX,sunY);
   ctx.lineTo(sunX+Math.cos(an)*len-W*0.035,sunY+Math.sin(an)*len);
   ctx.lineTo(sunX+Math.cos(an)*len+W*0.035,sunY+Math.sin(an)*len);ctx.closePath();ctx.fill();}
  ctx.restore();}
 // ---- дымка у горизонта ----
 {const hz=ctx.createLinearGradient(0,H*.44,0,H*.62);
  hz.addColorStop(0,'rgba(255,252,228,.45)');hz.addColorStop(1,'rgba(222,236,202,0)');
  ctx.fillStyle=hz;ctx.fillRect(0,H*.44,W,H*.20);}
 // ---- слои холмов с воздушной перспективой ----
 {const HL=[['rgba(126,156,146,.42)',.505,.60],['rgba(74,108,80,.56)',.520,.62],['rgba(56,92,64,.74)',.545,.65],['rgba(44,76,54,.92)',.570,.66]];
  HL.forEach((hl,i)=>{
   ctx.fillStyle=hl[0];ctx.beginPath();ctx.moveTo(0,H*hl[2]);
   for(let k=0;k<=18;k++){const x=k*W/18;ctx.lineTo(x,H*(hl[1]-((k+i)%3)*.013-Math.sin(k*.7+i)*.008));}
   ctx.lineTo(W,H*hl[2]);ctx.closePath();ctx.fill();
   if(i<3){const fg=ctx.createLinearGradient(0,H*hl[1],0,H*hl[2]);
    fg.addColorStop(0,'rgba(228,238,218,'+(0.26-i*0.07).toFixed(3)+')');fg.addColorStop(1,'rgba(228,238,218,0)');
    ctx.fillStyle=fg;ctx.fillRect(0,H*hl[1],W,H*hl[2]-H*hl[1]);}
   ctx.strokeStyle='rgba(255,246,198,'+(0.28-i*0.05).toFixed(3)+')';ctx.lineWidth=2;ctx.beginPath();
   for(let k=0;k<=18;k++){const x=k*W/18, yy=H*(hl[1]-((k+i)%3)*.013-Math.sin(k*.7+i)*.008);k?ctx.lineTo(x,yy):ctx.moveTo(x,yy);}
   ctx.stroke();});}
 // ---- облака и птицы ----
 if(!low){ctx.save();ctx.globalAlpha=.6;
  for(let i=0;i<5;i++){const cx2=(i*W*.26+t*(5+i*1.4))%(W+120)-60, cy2=H*(.07+((i*29)%8)/100);
   ctx.fillStyle='rgba(255,255,255,.72)';ctx.beginPath();
   ctx.ellipse(cx2,cy2,28+(i%2)*10,9,0,0,Math.PI*2);ctx.ellipse(cx2+20,cy2-4,17,7,0,0,Math.PI*2);ctx.fill();}
  ctx.restore();
  ctx.strokeStyle='rgba(52,64,52,.5)';ctx.lineWidth=1.5;
  for(let i=0;i<5;i++){const bx2=(i*181+t*(9+i%2*3))%W, by2=H*(.17+((i*17)%9)/100);
   ctx.beginPath();ctx.moveTo(bx2-4,by2);ctx.quadraticCurveTo(bx2,by2-3,bx2+4,by2);
   ctx.quadraticCurveTo(bx2+8,by2-3,bx2+12,by2);ctx.stroke();}}
 // ---- туман, стелющийся по полю ----
 {ctx.save();ctx.globalAlpha=.5;
  const gf=ctx.createLinearGradient(0,H*.56,0,H*.72);
  gf.addColorStop(0,'rgba(212,226,202,0)');gf.addColorStop(.5,'rgba(216,230,206,.40)');gf.addColorStop(1,'rgba(202,218,192,0)');
  ctx.fillStyle=gf;
  for(let i=0;i<5;i++){const fx=(i*W*.28+t*4)%(W+220)-110, fy=H*(.60+((i*7)%6)/100);
   ctx.beginPath();ctx.ellipse(fx,fy,100,9,0,0,Math.PI*2);ctx.fill();}
  ctx.restore();}
 // volumetric 3D pizzeria (facade + receding side wall + gable roof)
 const px=W*.58,py=H*.31,pw=W*.31,ph=H*.28;
 const ddx=W*0.045, ddy=-H*0.04;
 const peakX=px+pw*0.5, roofH=H*0.13, peakY=py-roofH;
 const bpeakX=peakX+ddx, bpeakY=peakY+ddy;
 ctx.fillStyle='rgba(0,0,0,.22)';ctx.beginPath();ctx.ellipse(px+pw*.5+ddx*0.5,py+ph+6,pw*.6,10,0,0,Math.PI*2);ctx.fill();
 // right side wall (recedes)
 ctx.fillStyle='#2f3631';ctx.beginPath();ctx.moveTo(px+pw,py);ctx.lineTo(px+pw+ddx,py+ddy);ctx.lineTo(px+pw+ddx,py+ph+ddy);ctx.lineTo(px+pw,py+ph);ctx.closePath();ctx.fill();
 const sideG=ctx.createLinearGradient(px+pw,py,px+pw+ddx,py);sideG.addColorStop(0,'rgba(0,0,0,0)');sideG.addColorStop(1,'rgba(0,0,0,.30)');ctx.fillStyle=sideG;ctx.beginPath();ctx.moveTo(px+pw,py);ctx.lineTo(px+pw+ddx,py+ddy);ctx.lineTo(px+pw+ddx,py+ph+ddy);ctx.lineTo(px+pw,py+ph);ctx.closePath();ctx.fill();
 // side window (parallelogram, lit)
 const sideQuad=(f1,vy1,f2,vy2)=>{ctx.beginPath();ctx.moveTo(px+pw+f1*ddx,py+vy1*ph+f1*ddy);ctx.lineTo(px+pw+f2*ddx,py+vy1*ph+f2*ddy);ctx.lineTo(px+pw+f2*ddx,py+vy2*ph+f2*ddy);ctx.lineTo(px+pw+f1*ddx,py+vy2*ph+f1*ddy);ctx.closePath();};
 ctx.fillStyle='#5a3320';sideQuad(0.20,0.34,0.80,0.62);ctx.fill();
 ctx.fillStyle='#e7cf84';sideQuad(0.24,0.37,0.76,0.59);ctx.fill();
 ctx.strokeStyle='rgba(20,16,12,.6)';ctx.lineWidth=1;sideQuad(0.50,0.37,0.50,0.59);ctx.stroke();
 // roof: right slope + front gable
 ctx.fillStyle='#1f2622';ctx.beginPath();ctx.moveTo(peakX,peakY);ctx.lineTo(bpeakX,bpeakY);ctx.lineTo(px+pw+ddx,py+ddy);ctx.lineTo(px+pw,py);ctx.closePath();ctx.fill();
 const roofG=ctx.createLinearGradient(peakX,peakY,px+pw,py);roofG.addColorStop(0,'rgba(255,255,255,.06)');roofG.addColorStop(1,'rgba(0,0,0,.22)');ctx.fillStyle=roofG;ctx.beginPath();ctx.moveTo(peakX,peakY);ctx.lineTo(bpeakX,bpeakY);ctx.lineTo(px+pw+ddx,py+ddy);ctx.lineTo(px+pw,py);ctx.closePath();ctx.fill();
 ctx.strokeStyle='rgba(20,24,20,.4)';ctx.lineWidth=1;for(let i=1;i<5;i++){const f=i/5;ctx.beginPath();ctx.moveTo(peakX+(px+pw-peakX)*f,peakY+(py-peakY)*f);ctx.lineTo(bpeakX+(px+pw+ddx-bpeakX)*f,bpeakY+(py+ddy-bpeakY)*f);ctx.stroke();}
 const gable=ctx.createLinearGradient(px,peakY,px,py);gable.addColorStop(0,'#3d4440');gable.addColorStop(1,'#262c28');ctx.fillStyle=gable;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(px+pw,py);ctx.lineTo(peakX,peakY);ctx.closePath();ctx.fill();
 ctx.strokeStyle='rgba(255,255,255,.10)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(peakX,peakY);ctx.lineTo(bpeakX,bpeakY);ctx.stroke();
 // front facade
 const facade=ctx.createLinearGradient(px,py,px+pw,py+ph);facade.addColorStop(0,'#4a514c');facade.addColorStop(.55,'#363c38');facade.addColorStop(1,'#1f2522');ctx.fillStyle=facade;ctx.fillRect(px,py,pw,ph);
 ctx.fillStyle='#4a4f48';ctx.fillRect(px-3,py+ph-6,pw+6,8);
 ctx.fillStyle='#a44b40';ctx.fillRect(px,py+ph*.22,pw,ph*.05);
 // windows: frame + sill + mullion + silhouette
 const glow=ctx.createRadialGradient(px+pw*.5,py+ph*.40,2,px+pw*.5,py+ph*.40,pw*.46);glow.addColorStop(0,'rgba(255,235,155,.48)');glow.addColorStop(1,'rgba(255,235,155,0)');ctx.fillStyle=glow;ctx.fillRect(px,py,pw,ph);
 for(const q of [.10,.37,.64]){const wx=px+pw*q,wy=py+ph*.29,ww=pw*.20,wh=ph*.10;
   ctx.fillStyle='#3a3026';ctx.fillRect(wx-2,wy-2,ww+4,wh+4);
   ctx.fillStyle='#e0cc86';ctx.fillRect(wx,wy,ww,wh);
   ctx.strokeStyle='rgba(20,16,12,.6)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(wx+ww*.5,wy);ctx.lineTo(wx+ww*.5,wy+wh);ctx.moveTo(wx,wy+wh*.5);ctx.lineTo(wx+ww,wy+wh*.5);ctx.stroke();
   ctx.fillStyle='#6a5a44';ctx.fillRect(wx-3,wy+wh,ww+6,2);
   const sx=wx+ww*.5,sy=wy+wh;ctx.fillStyle='rgba(18,12,16,.7)';ctx.beginPath();ctx.ellipse(sx,sy-wh*.5,ww*.2,wh*.5,0,0,Math.PI*2);ctx.fill();ctx.fillRect(sx-ww*.1,sy-wh*.25,ww*.2,wh*.25);
 }
 // entrance + awning
 const ex=px+pw*.43,ey=py+ph*.55,ew=pw*.14,eh=ph*.45;
 ctx.fillStyle='#2a2018';ctx.fillRect(ex-3,ey-3,ew+6,eh+3);ctx.fillStyle='#101612';ctx.fillRect(ex,ey,ew,eh);
 const doorG=ctx.createLinearGradient(ex,ey,ex+ew,ey);doorG.addColorStop(0,'#332619');doorG.addColorStop(1,'#1a130c');ctx.fillStyle=doorG;ctx.fillRect(ex+1,ey+1,ew*0.6,eh-2);
 ctx.fillStyle='#3a3f3a';ctx.fillRect(ex-5,py+ph,ew+10,4);
 const adx=ex,ady=ey-2,adw=ew;for(let i=0;i<5;i++){ctx.fillStyle=i%2?'#c9b04a':'#7a2a33';ctx.fillRect(adx+adw*i/5,ady,adw/5+1,8);}
 // sign board on the gable
 ctx.save();ctx.shadowColor='#f3e7c6';ctx.shadowBlur=8;ctx.fillStyle='#151b17';ctx.fillRect(px+pw*.28,py-roofH*0.5,pw*.44,roofH*0.4);text2(ctx,'PIZZA',px+pw*.50,py-roofH*0.25,15,'#f3e7c6','center');ctx.restore();
 // chimney + smoke + flag
 ctx.fillStyle='#1b211d';ctx.fillRect(px+pw*.78,py-ph*.08,pw*.022,ph*.08);
 ctx.save();ctx.globalAlpha=.2;for(let i=0;i<5;i++){const sx=px+pw*.79+pw*.011,sy=py-ph*.08-i*8-Math.sin(t*.8+i)*4;ctx.fillStyle='#cfd6cc';ctx.beginPath();ctx.arc(sx,sy,3+i*0.7,0,Math.PI*2);ctx.fill();}ctx.restore();
 ctx.fillStyle='#2c342e';ctx.fillRect(px+pw*.5-1,py-roofH-5,2,7);
 ctx.fillStyle='#e6242f';const flagF=Math.sin(t*2)*0.2;ctx.beginPath();ctx.moveTo(px+pw*.5,py-roofH-5);ctx.lineTo(px+pw*.5+12,py-roofH-1+flagF);ctx.lineTo(px+pw*.5,py-roofH+2);ctx.closePath();ctx.fill();
 // bushes around the base
 for(let i=0;i<5;i++){const bshx=px-8+i*(pw/4),bshy=py+ph+2;ctx.fillStyle='#3a5a30';ctx.beginPath();ctx.arc(bshx,bshy,7+(i%3),0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#4c7240';ctx.beginPath();ctx.arc(bshx-3,bshy-2,5+(i%2),0,0,Math.PI*2);ctx.fill();}
 // foreground grass field.
 ctx.fillStyle='#476e3c';ctx.fillRect(0,H*.61,W,H*.39);for(let i=0;i<320;i++){const x=(i*83+t*(1.2+i%3*.4))%W,y=H*(.62+((i*29)%35)/100);ctx.strokeStyle=i%3===0?'rgba(205,238,151,.50)':'rgba(26,60,29,.44)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-2,y-7-(i%5)*2);ctx.stroke();}
 // wildflowers scattered across the meadow
 {const fc=['#f2d24a','#e8638f','#ffffff','#c98ad8','#f59a3a'];for(let i=0;i<50;i++){const fx=(i*97+t*(.4+i%3*.2))%W,fy=H*(.63+((i*43)%32)/100);ctx.fillStyle=fc[i%5];ctx.beginPath();ctx.arc(fx,fy,1.8,0,Math.PI*2);ctx.fill();}}
 // fireflies around the continue area.
 for(let i=0;i<46;i++){const fx=(i*101+t*(7+i%5))%W,fy=H*(.48+((i*43)%48)/100),pulse=.5+.5*Math.sin(t*2.2+i*.7);ctx.globalAlpha=.16+.58*pulse;ctx.fillStyle='#c9f08a';ctx.shadowColor='#b8ef79';ctx.shadowBlur=7;ctx.beginPath();ctx.arc(fx,fy,1.2+(i%3)*.35,0,Math.PI*2);ctx.fill();}ctx.shadowBlur=0;ctx.globalAlpha=1;
 // calm final title. V86: шапка от высоты кадра.
 const q=endGeom();
 // V87: светлые строки шапки лежали на ярком небе и почти не читались.
 // Добавлен мягкий верхний градиент — он же прижимает пересвет неба.
 {const hh=Math.min(H*.72,q.s3+q.fs3*2.2);
  const sg=ctx.createLinearGradient(0,0,0,hh);
  sg.addColorStop(0,'rgba(10,24,14,.44)');sg.addColorStop(.62,'rgba(10,24,14,.20)');sg.addColorStop(1,'rgba(10,24,14,0)');
  ctx.fillStyle=sg;ctx.fillRect(0,0,W,hh);}
 ctx.save();ctx.font='700 '+q.ts+'px "Oswald",Impact,sans-serif';ctx.textAlign='left';
 ctx.shadowColor='rgba(20,44,24,.72)';ctx.shadowBlur=16;ctx.shadowOffsetY=2;
 ctx.fillStyle='#fbfff6';ctx.fillText('НОЧНАЯ',q.bx,q.y1);
 ctx.fillStyle='#cfe9cd';ctx.fillText('СМЕНА',q.bx,q.y2);
 ctx.restore();
 ctx.save();ctx.shadowColor='rgba(20,44,24,.6)';ctx.shadowBlur=8;text2(ctx,'ПОСЛЕДНЯЯ ГЛАВА ЗАВЕРШЕНА',q.bx,q.s1,q.fs1,'#eef7ec');ctx.restore();
 // Green translucent forms around CONTINUE: they react to hover-like pulse and remain below the label.
 const bx=q.bx,by=q.by,bw=q.bw,bh=q.bh;const pulse=.5+.5*Math.sin(t*2.1);
 if(!menuLow()){
  ctx.save();ctx.globalAlpha=.20+.10*pulse;ctx.fillStyle='#7fe36e';ctx.shadowColor='#6ee85d';ctx.shadowBlur=26;ctx.beginPath();ctx.roundRect(bx-10,by+57,bw+20,96,18);ctx.fill();ctx.restore();
  for(let i=0;i<14;i++){const sx=bx+12+(i*37)%bw,sy=by+66+(i*13)%70;ctx.fillStyle='rgba(176,248,119,.18)';ctx.beginPath();ctx.arc(sx,sy,2+(i%3),0,Math.PI*2);ctx.fill();}
 }
 ctx.save();ctx.shadowColor='rgba(12,30,16,.75)';ctx.shadowBlur=8;
 // V85: подписи подняты над кнопками. Раньше они лежали на H*.84/.875 и
 // накрывались последней кнопкой шестипунктного меню.
 text2(ctx,'ПОСЛЕ ВСЕГО, ЧТО ПРОИЗОШЛО, ЗДЕСЬ НАКОНЕЦ ТИХО.',q.bx,q.s2,q.fs2,'#eaf3e6');
 text2(ctx,'ФИНАЛЬНОЕ МЕНЮ // СПОКОЙНЫЙ РЕЖИМ',q.bx,q.s3,q.fs3,'#dcecd6');ctx.restore();
 menuButtons(bx,by,q.gap,bw,bh,{m:'#7fe36e',g:'rgba(126,227,110,.45)',t:'#dfeedd'},1,{bottom:q.bottom});
 // V85: в кадре появился сам охранник — раньше спокойное меню было
 // единственным без живой фигуры.
 drawGuardChar(ctx,W*(menuLow()?0.74:0.545),H*(menuLow()?0.68:0.795),1.34,{t,pose:'stand',face:1,dark:0.10,look:0.34,
   seed:1.7,shadowDir:-1,shadowLen:1.5,shadowAlpha:0.30,
   rim:{dir:-1,col:'255,246,206',power:0.30+0.10*Math.abs(Math.sin(t*0.8))}});
 // ---- пылинки в солнечном свете ----
 if(!low){ctx.save();ctx.globalAlpha=.55;
  for(let i=0;i<28;i++){const dx=sunX+(i*43)%(W*0.62), dy=sunY+(i*27)%(H*0.42);
   const tx=dx+Math.sin(t*0.6+i)*7, ty=dy+Math.cos(t*0.5+i)*5;
   ctx.fillStyle='rgba(255,250,214,'+(0.28+0.5*Math.abs(Math.sin(t*1.2+i))).toFixed(3)+')';
   ctx.beginPath();ctx.arc(tx,ty,0.9+(i%3)*0.4,0,Math.PI*2);ctx.fill();}
  ctx.restore();}
 // ---- тёплая цветокоррекция и виньетка ----
 {const wg=ctx.createLinearGradient(0,0,W,H);
  wg.addColorStop(0,'rgba(255,238,186,.12)');wg.addColorStop(.55,'rgba(255,240,200,.04)');wg.addColorStop(1,'rgba(40,70,44,.10)');
  ctx.fillStyle=wg;ctx.fillRect(0,0,W,H);
  vigFill(.5,.50,.30,.98,[[0,'rgba(0,0,0,0)'],[1,'rgba(18,34,20,.42)']]);}
 scan();
}
const TEASER_LOAD_DUR=4.2,TEASER_STORY_DUR=12.7,TEASER_TOTAL_DUR=TEASER_LOAD_DUR+TEASER_STORY_DUR;
function drawTeaser(){
 if(G.teaser<TEASER_LOAD_DUR){drawLoadingCard(G.teaser);return;}
 drawIntroCinematic(G.teaser-TEASER_LOAD_DUR);
}
function drawLoadingCard(t){
 ctx.fillStyle='#040506';ctx.fillRect(0,0,W,H);
 ctx.fillStyle='#171b20';ctx.fillRect(W*.58,H*.17,W*.28,H*.56);
 ctx.fillStyle='#050709';ctx.beginPath();ctx.moveTo(W*.65,H*.27);ctx.lineTo(W*.72,H*.24);ctx.lineTo(W*.80,H*.29);ctx.lineTo(W*.83,H*.57);ctx.lineTo(W*.75,H*.62);ctx.lineTo(W*.67,H*.59);ctx.closePath();ctx.fill();
 ctx.fillStyle='#c92335';ctx.fillRect(W*.71,H*.37,17,7);ctx.fillRect(W*.76,H*.37,17,7);
 ctx.font='700 36px "Oswald",Impact,sans-serif';ctx.fillStyle='#dfe5e8';ctx.textAlign='left';ctx.fillText('НОЧНАЯ СМЕНА',W*.08,H*.22);
 ctx.fillStyle='#b52b35';ctx.font='700 32px "Oswald",Impact,sans-serif';ctx.fillText('GOREВОКСЕД // NS-04',W*.08,H*.275);
 const lines=['Ты принят на ночную смену.','Объект: пиццерия GOREВОКСЕД.','Следи за камерами и двумя дверями.','Не доверяй тишине.'];
 lines.forEach((s,i)=>{ctx.globalAlpha=Math.min(1,Math.max(0,(t-1.2-i*.7)/.6));text2(s,W*.08,H*(.39+i*.055),17,i===0?'#ddd':'#9ca7b1')});
 ctx.globalAlpha=Math.min(1,Math.max(0,(t-3.0)/.9));text2('РЕКОМЕНДУЕТСЯ НАДЕТЬ НАУШНИКИ',W*.5,H*.78,21,'#f0f0f0','center');text2('ДЛЯ ЛУЧШЕГО ОЩУЩЕНИЯ АТМОСФЕРЫ',W*.5,H*.82,13,'#7f8a94','center');
 text2(t>TEASER_LOAD_DUR-0.5?'НАЖМИТЕ, ЧТОБЫ ПРОДОЛЖИТЬ':'ЗАГРУЗКА ПРОТОКОЛА...',W*.5,H*.91,14,t>TEASER_LOAD_DUR-0.5?'#d8dde2':'#65717b','center');
 ctx.globalAlpha=1;scan();
}
const INTRO_STORIES={
  1:{skyA:'#7fc0dc',skyB:'#cfe6ef',ground:'#6f9a4e',title:'ОТКРЫТИЕ',lines:['Пиццерия GOREВОКСЕД открыла двери.','Все аниматроники на местах.','Семьи заполняют зал.']},
  2:{skyA:'#6a7fae',skyB:'#c9b6d0',ground:'#5c7e46',title:'СПУСТЯ ГОД',lines:['Кто-то оставил МАСКУ ЗАЙЦА у входа.','Её никто не забирал.','По ночам она меняет положение.']},
  3:{skyA:'#33406a',skyB:'#5a5274',ground:'#314026',title:'ЛИШНИЙ СИЛУЭТ',lines:['В зале появился четвёртый.','Его не должно быть в программе.','Он знает, где охрана.']},
  4:{skyA:'#2a1320',skyB:'#5a1f30',ground:'#241018',title:'ПОВРЕЖДЁННЫЕ ЗАПИСИ',lines:['Архив повреждён. Кадры искажены.','Того, что здесь происходит,','не должно существовать.']},
  5:{skyA:'#0c0a14',skyB:'#1a0f24',ground:'#0a0a10',title:'ПОСЛЕДНЯЯ СМЕНА',lines:['Здесь больше нет никого живого.','Кроме тебя.','И того, кто ждёт в зале.']}
 };
// V70: интро собрано из трёх кинематографичных кадров. Это первый — общий план пиццерии.
function introExterior(st,zoom,fx,fy){
 const w=W,h=H,t=st,n=Math.min(5,Math.max(1,G.night||1));
 const low=document.body.classList.contains('low-end');
 const clamp=v=>Math.min(1,Math.max(0,v));
 const eio=x=>x<.5?2*x*x:1-Math.pow(-2*x+2,2)/2;
 const eo=x=>1-Math.pow(1-x,3);
 // Per-night pre-story: the pizzeria and its animatronics, with the plot unfolding and gaining color/detail each chapter.

 const s=INTRO_STORIES[n]||INTRO_STORIES[1];
 // corruption level rises with the night (N4+ glitch/red), saturation grows N1->N3 then corrupts
 const corrupt=n>=4?(n-3):0;
 const sat=1+(n-1)*0.12; // "обрастала красками" — richer palette each chapter
 ctx.save();
 // slow cinematic push-in
 const cam=(zoom||1)*(1+0.10*eio(clamp(t/7.5)));
 const panX=w*0.015*eio(clamp(t/7.5));
 const cxF=(fx===undefined?0.5:fx)*w, cyF=(fy===undefined?0.5:fy)*h;
 ctx.translate(w*0.5+panX,h*0.5);ctx.scale(cam,cam);ctx.translate(-cxF,-cyF);
 // sky
 const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,s.skyA);sky.addColorStop(.6,s.skyB);sky.addColorStop(1,s.ground);ctx.fillStyle=sky;ctx.fillRect(-40,-40,w+80,h+80);
 // звёзды (ночные главы) и облака (дневные)
 if(n>=3){for(let i=0;i<90;i++){const sxx=(i*167.7)%w,syy=(i*73.3)%(h*.55);const tw2=.35+.65*Math.abs(Math.sin(t*1.6+i));ctx.fillStyle=`rgba(226,234,255,${(.16+.5*tw2*(1-syy/(h*.6))).toFixed(3)})`;ctx.fillRect(sxx,syy,1.3,1.3);}}
 if(!low){for(let i=0;i<6;i++){const cw2=w*(.16+(i%3)*.07),cx5=((i*311)+t*(5+i*2))%(w+cw2*2)-cw2,cy5=h*(.08+(i%4)*.055),ca=n>=4?.05:.13;
  ctx.fillStyle=`rgba(255,255,255,${ca})`;ctx.beginPath();
  for(let k=0;k<5;k++)ctx.ellipse(cx5+cw2*k*.18,cy5+Math.sin(k*1.7+i)*h*.008,cw2*(.16-Math.abs(k-2)*.03),h*(.020-Math.abs(k-2)*.003),0,0,Math.PI*2);
  ctx.fill();}}
 // celestial body
 const moon=n>=3;const cbx=w*0.80,cby=h*0.16,cr=w*0.05;
 const cg=ctx.createRadialGradient(cbx,cby,2,cbx,cby,cr*4);cg.addColorStop(0,moon?'rgba(220,210,255,.9)':'rgba(255,248,196,.9)');cg.addColorStop(.3,moon?'rgba(180,170,230,.3)':'rgba(255,236,160,.3)');cg.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=cg;ctx.fillRect(-40,-40,w+80,h+80);
 ctx.fillStyle=moon?'#e6e0f5':'#fff6c8';ctx.beginPath();ctx.arc(cbx,cby,cr,0,Math.PI*2);ctx.fill();
 // distant hills (more layers as story deepens)
 const hillLayers=n>=2?3:1;
 // V98: цвет холмов задавался строкой `rgba(40+30*l,...)` — арифметика внутри
 // литерала не вычисляется, значение считалось некорректным и браузер молча
 // оставлял ПРЕДЫДУЩИЙ цвет, то есть кремовый цвет луны. Из-за этого у горизонта
 // лежала бежевая плита. Стало: каналы считаются в числах и уходят в дымку.
 for(let l=0;l<hillLayers;l++){const hr=40+18*l,hgc=55+16*l,hb=48+14*l;ctx.fillStyle=`rgba(${hr},${hgc},${hb},${(0.50+0.14*l).toFixed(2)})`;ctx.beginPath();ctx.moveTo(-40,h*(0.58+l*0.02));for(let i=0;i<=18;i++){const x=i*w/18;ctx.lineTo(x,h*(0.56+l*0.02-Math.abs(Math.sin(i*1.3+l))*0.03));}ctx.lineTo(w+40,h*0.7);ctx.lineTo(-40,h*0.7);ctx.closePath();ctx.fill();}
 // силуэт леса на горизонте
 // V98: лес был одной ломаной из 34 одинаковых остроконечных треугольников —
 // ровная пила по всей ширине кадра. Стало: два плана (дальний светлее и ниже),
 // у каждого дерева своя высота, ширина и наклон, у ближнего плана — ярусы ветвей
 // и стволы, между планами лежит дымка.
 (()=>{
   const rnd=(k)=>{const v=Math.sin(k*127.1+n*31.7)*43758.5453;return v-Math.floor(v);};
   const planes=[
     {base:h*.672,scale:.72,step:(w+80)/26,col:n>=4?'rgba(26,18,28,.62)':'rgba(46,62,54,.55)',k:0,trunk:false},
     {base:h*.700,scale:1.00,step:(w+80)/19,col:n>=4?'rgba(12,9,14,.94)':'rgba(17,26,21,.90)',k:500,trunk:true}
   ];
   planes.forEach(pl=>{
     ctx.fillStyle=pl.col;
     ctx.beginPath();ctx.moveTo(-40,h*.74);ctx.lineTo(-40,pl.base);ctx.lineTo(w+40,pl.base);ctx.lineTo(w+40,h*.74);ctx.closePath();ctx.fill();
     for(let x=-40;x<w+40;x+=pl.step){
       const r1=rnd(x+pl.k),r2=rnd(x*1.7+pl.k+9),r3=rnd(x*2.3+pl.k+21);
       const tw2=pl.step*(0.62+r1*0.75), th2=h*pl.scale*(.032+r2*.052);
       const cx2=x+pl.step*.5+(r3-.5)*pl.step*.35, lean=(r3-.5)*tw2*.16;
       ctx.fillStyle=pl.col;
       // ярусы ветвей: три перекрывающихся треугольника разной ширины
       const tiers=r1>.55?3:2;
       for(let ti=0;ti<tiers;ti++){
         const f=1-ti/(tiers+0.6), tipY=pl.base-th2*(1-ti*0.26), halfW=tw2*.5*(0.45+0.55*(1-f)+ti*0.10);
         ctx.beginPath();
         ctx.moveTo(cx2+lean*f,tipY);
         ctx.lineTo(cx2+halfW,pl.base-th2*0.10*ti);
         ctx.lineTo(cx2-halfW,pl.base-th2*0.10*ti);
         ctx.closePath();ctx.fill();
       }
       if(pl.trunk&&th2>h*.05){ctx.fillRect(cx2-1.2,pl.base-th2*0.10,2.4,h*.012);}
     }
   });
 })();
 // дымка над горизонтом
 const hz=ctx.createLinearGradient(0,h*.60,0,h*.73);hz.addColorStop(0,'rgba(255,255,255,0)');hz.addColorStop(.6,n>=4?'rgba(120,60,80,.10)':'rgba(210,225,235,.16)');hz.addColorStop(1,'rgba(255,255,255,0)');
 ctx.fillStyle=hz;ctx.fillRect(-40,h*.60,w+80,h*.14);
 // pizzeria building
 const bx=w*0.30,by=h*0.42,bw=w*0.40,bh=h*0.34;
 // shadow
 ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(bx+bw*0.5,by+bh+6,bw*0.5,12,0,0,Math.PI*2);ctx.fill();
 const wallG=ctx.createLinearGradient(bx,by,bx+bw,by+bh);wallG.addColorStop(0,'#333944');wallG.addColorStop(.6,'#272c36');wallG.addColorStop(1,'#1b1f27');
 ctx.fillStyle=wallG;ctx.fillRect(bx,by,bw,bh);
 // кирпичная кладка
 ctx.save();ctx.beginPath();ctx.rect(bx,by,bw,bh);ctx.clip();
 const brH=Math.max(6,bh/22);
 for(let r=0;r*brH<bh;r++){ctx.fillStyle='rgba(0,0,0,.16)';ctx.fillRect(bx,by+r*brH,bw,1);
  for(let c=0;c<14;c++){const off=(r%2)?brH*1.2:0;ctx.fillStyle='rgba(0,0,0,.10)';ctx.fillRect(bx+off+c*(bw/14),by+r*brH,1,brH);}}
 ctx.fillStyle='rgba(255,255,255,.03)';ctx.fillRect(bx,by,bw,bh*.10);
 ctx.restore();
 // цоколь
 ctx.fillStyle='#15181e';ctx.fillRect(bx,by+bh-bh*.06,bw,bh*.06);
 // extruded side for 3D feel
 ctx.fillStyle='#1c2029';ctx.beginPath();ctx.moveTo(bx+bw,by);ctx.lineTo(bx+bw+w*0.05,by-h*0.03);ctx.lineTo(bx+bw+w*0.05,by+bh-h*0.03);ctx.lineTo(bx+bw,by+bh);ctx.closePath();ctx.fill();
 // roof
 ctx.fillStyle='#3a1f2a';ctx.beginPath();ctx.moveTo(bx-w*0.02,by);ctx.lineTo(bx+bw*0.5,by-h*0.10);ctx.lineTo(bx+bw+w*0.02,by);ctx.closePath();ctx.fill();
 // sign
 const flick=n>=5&&(Math.floor(t*8)%5===0);
 ctx.font='700 '+Math.round(w*0.022)+'px "Oswald",Impact,sans-serif';ctx.textAlign='center';
 ctx.fillStyle=flick?'#3a1430':'#ff5b8a';ctx.shadowColor='#c4409a';ctx.shadowBlur=n>=3?14:6;ctx.fillText('GOREВОКСЕД',bx+bw*0.5,by-h*0.04);ctx.shadowBlur=0;
 // windows (lit, more detail each night)
 const winN=4;for(let i=0;i<winN;i++){const wx=bx+bw*(0.12+i*0.21),wy=by+bh*0.20,ww=bw*0.14,wh=bh*0.30;ctx.fillStyle='#0c0f14';ctx.fillRect(wx,wy,ww,wh);const lit=n>=3?Math.sin(i*3.7+t)>-0.2:true;if(lit){const wg=ctx.createLinearGradient(wx,wy,wx,wy+wh);wg.addColorStop(0,'rgba(255,200,90,.9)');wg.addColorStop(1,'rgba(120,70,30,.5)');ctx.fillStyle=wg;ctx.fillRect(wx,wy,ww,wh);}
 // animatronic silhouettes inside windows (appear N1, extra shadow N3+)
 if(lit){
  // V98: силуэт в витрине был вертикальным эллипсом с прямоугольником под ним —
  // на общем плане это читалось как коричневое яйцо, а не как фигура. Стало:
  // плечи трапецией, шея, круглая голова с ушами (у каждой витрины свой типаж),
  // тёмные провалы глаз и переплёт рамы поверх стекла.
  const sx=wx+ww*0.5, sy=wy+wh*0.96;
  const shW=ww*0.42, hipY=sy, shY=sy-wh*0.34, headR=ww*0.155, headY=shY-headR*1.15;
  ctx.fillStyle='rgba(18,11,16,.86)';
  ctx.beginPath();
  ctx.moveTo(sx-shW*.5,hipY);ctx.lineTo(sx-shW*.42,shY+wh*.03);
  ctx.quadraticCurveTo(sx-shW*.50,shY,sx-shW*.20,shY-wh*.01);
  ctx.lineTo(sx+shW*.20,shY-wh*.01);
  ctx.quadraticCurveTo(sx+shW*.50,shY,sx+shW*.42,shY+wh*.03);
  ctx.lineTo(sx+shW*.5,hipY);ctx.closePath();ctx.fill();
  ctx.fillRect(sx-ww*.055,headY+headR*.55,ww*.11,wh*.05);
  ctx.beginPath();ctx.arc(sx,headY,headR,0,Math.PI*2);ctx.fill();
  if(i%2===0){ // длинные уши
    [-1,1].forEach(sd=>{ctx.save();ctx.translate(sx+sd*headR*.45,headY-headR*.55);ctx.rotate(sd*0.22);
      ctx.beginPath();ctx.ellipse(0,-headR*.85,headR*.30,headR*.95,0,0,Math.PI*2);ctx.fill();ctx.restore();});
  }else{ // круглые уши
    [-1,1].forEach(sd=>{ctx.beginPath();ctx.arc(sx+sd*headR*.82,headY-headR*.62,headR*.42,0,Math.PI*2);ctx.fill();});
  }
  ctx.fillStyle='rgba(255,214,150,.30)';
  ctx.beginPath();ctx.arc(sx-headR*.36,headY-headR*.08,headR*.16,0,Math.PI*2);ctx.arc(sx+headR*.36,headY-headR*.08,headR*.16,0,Math.PI*2);ctx.fill();
  if(n>=3&&i===2){ // лишний силуэт сбоку
   ctx.fillStyle='rgba(52,9,26,.92)';
   ctx.beginPath();ctx.moveTo(wx+ww*.02,sy);ctx.lineTo(wx+ww*.04,sy-wh*.30);
   ctx.quadraticCurveTo(wx+ww*.02,sy-wh*.36,wx+ww*.16,sy-wh*.34);ctx.lineTo(wx+ww*.20,sy);ctx.closePath();ctx.fill();
   ctx.beginPath();ctx.arc(wx+ww*.11,sy-wh*.44,ww*.11,0,Math.PI*2);ctx.fill();
  }
 }
 // переплёт и рама витрины
 ctx.fillStyle='rgba(28,22,18,.55)';ctx.fillRect(wx+ww*.485,wy,Math.max(1,ww*.03),wh);ctx.fillRect(wx,wy+wh*.44,ww,Math.max(1,wh*.022));
 ctx.strokeStyle='rgba(232,222,198,.28)';ctx.lineWidth=1.5;ctx.strokeRect(wx+.75,wy+.75,ww-1.5,wh-1.5);
 ctx.fillStyle='rgba(0,0,0,.28)';ctx.fillRect(wx,wy,ww,Math.max(1,wh*.06));
 ctx.fillStyle='#1a1d24';ctx.fillRect(wx-ww*.04,wy+wh,ww*1.08,Math.max(2,wh*.05));}
 // door
  // полосатый навес над витринами
 const awY=by+bh*0.185, awH=bh*0.055;
 for(let i=0;i<winN;i++){const wx=bx+bw*(0.12+i*0.21),ww=bw*0.14;
  for(let k=0;k<6;k++){ctx.fillStyle=k%2?'#7d1c28':'#d9d2c4';ctx.fillRect(wx-ww*.10+k*(ww*1.2/6),awY-awH,ww*1.2/6,awH);}
  ctx.fillStyle='rgba(0,0,0,.30)';ctx.fillRect(wx-ww*.10,awY-2,ww*1.2,3);}
 // вход: козырёк и две настенные лампы
 ctx.fillStyle='#070a0d';ctx.fillRect(bx+bw*0.42,by+bh*0.55,bw*0.16,bh*0.45);ctx.fillStyle='#c9a23a';ctx.fillRect(bx+bw*0.55,by+bh*0.78,4,7);
 ctx.fillStyle='#241a1e';ctx.fillRect(bx+bw*0.38,by+bh*0.52,bw*0.24,bh*0.035);
 ctx.fillStyle='rgba(255,255,255,.06)';ctx.fillRect(bx+bw*0.38,by+bh*0.52,bw*0.24,2);
 [bx+bw*0.365,bx+bw*0.635].forEach(lx2=>{const ly2=by+bh*0.47;
  ctx.fillStyle='#2b3038';ctx.fillRect(lx2-3,ly2-6,6,8);
  ctx.fillStyle='rgba(255,214,150,.95)';ctx.beginPath();ctx.arc(lx2,ly2+1,3.4,0,Math.PI*2);ctx.fill();
  const lgr=ctx.createRadialGradient(lx2,ly2,1,lx2,ly2,bh*.22);lgr.addColorStop(0,'rgba(255,200,130,.30)');lgr.addColorStop(1,'rgba(255,200,130,0)');
  ctx.fillStyle=lgr;ctx.fillRect(lx2-bh*.24,ly2-bh*.24,bh*.48,bh*.48);});
 // rabbit mask hanging by the entrance (appears N2+)
 if(n>=2){const mx=bx+bw*0.12,my=by+bh*0.30;ctx.strokeStyle='rgba(180,170,150,.5)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(mx,my-10);ctx.lineTo(mx,my-22);ctx.stroke();ctx.save();ctx.translate(mx,my);ctx.scale(0.5,0.5);drawMaskTexture(0,0,1,n>=5);ctx.restore();}
 // ground / path
  const grG=ctx.createLinearGradient(0,h*0.7,0,h);grG.addColorStop(0,s.ground);grG.addColorStop(.35,'rgba(0,0,0,.34)');grG.addColorStop(1,'rgba(0,0,0,.80)');
 ctx.fillStyle=grG;ctx.fillRect(-40,h*0.7,w+80,h*0.3);
 // асфальт
 const asG=ctx.createLinearGradient(0,h*0.7,0,h);asG.addColorStop(0,'#3d372f');asG.addColorStop(1,'#191512');
 ctx.fillStyle=asG;ctx.beginPath();ctx.moveTo(w*0.42,h*0.7);ctx.lineTo(w*0.58,h*0.7);ctx.lineTo(w*0.72,h);ctx.lineTo(w*0.28,h);ctx.closePath();ctx.fill();
 ctx.save();ctx.beginPath();ctx.moveTo(w*0.42,h*0.7);ctx.lineTo(w*0.58,h*0.7);ctx.lineTo(w*0.72,h);ctx.lineTo(w*0.28,h);ctx.closePath();ctx.clip();
 // бордюры и пунктир по центру
 ctx.strokeStyle='rgba(220,215,200,.16)';ctx.lineWidth=2;
 ctx.beginPath();ctx.moveTo(w*0.42,h*0.7);ctx.lineTo(w*0.28,h);ctx.moveTo(w*0.58,h*0.7);ctx.lineTo(w*0.72,h);ctx.stroke();
 for(let k=0;k<6;k++){const p1=k/6+.03,p2=p1+.085;
  const yy1=h*0.7+(h*0.3)*p1, yy2=h*0.7+(h*0.3)*Math.min(1,p2);
  ctx.strokeStyle=`rgba(232,224,190,${(.12+.14*p1).toFixed(2)})`;ctx.lineWidth=1.5+4*p1;
  ctx.beginPath();ctx.moveTo(w*0.5,yy1);ctx.lineTo(w*0.5,yy2);ctx.stroke();}
 ctx.restore();
 // фонарные столбы вдоль подъезда
 [[w*0.235,1],[w*0.775,-1]].forEach(([lx3,dir])=>{
  const base=h*0.90, top=h*0.44;
  ctx.fillStyle='#14181d';ctx.fillRect(lx3-3,top,6,base-top);
  ctx.fillRect(lx3,top,dir*w*0.035,5);
  const hx=lx3+dir*w*0.035, hy=top+8;
  ctx.fillStyle='#1d2228';ctx.fillRect(hx-9,hy-4,18,7);
  ctx.fillStyle='rgba(255,220,160,.95)';ctx.beginPath();ctx.ellipse(hx,hy+3,8,3.4,0,0,Math.PI*2);ctx.fill();
  const cg2=ctx.createLinearGradient(0,hy,0,base+h*.03);cg2.addColorStop(0,'rgba(255,206,140,.22)');cg2.addColorStop(1,'rgba(255,196,120,0)');
  ctx.fillStyle=cg2;ctx.beginPath();ctx.moveTo(hx-9,hy+3);ctx.lineTo(hx+9,hy+3);ctx.lineTo(hx+w*.055,base+h*.03);ctx.lineTo(hx-w*.055,base+h*.03);ctx.closePath();ctx.fill();
  const pgl=ctx.createRadialGradient(hx,base+h*.02,2,hx,base+h*.02,w*.06);pgl.addColorStop(0,'rgba(255,198,130,.16)');pgl.addColorStop(1,'rgba(255,198,130,0)');
  ctx.fillStyle=pgl;ctx.beginPath();ctx.ellipse(hx,base+h*.02,w*.06,h*.022,0,0,Math.PI*2);ctx.fill();});
 // одинокая машина на парковке
 const carX=w*0.845, carY=h*0.795, cwd=w*0.085, chd=h*0.042;
 ctx.fillStyle='rgba(0,0,0,.45)';ctx.beginPath();ctx.ellipse(carX,carY+chd*.75,cwd*.58,chd*.22,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#1b2b33';roundedRect(ctx,carX-cwd*.5,carY-chd*.35,cwd,chd*.75,4,'#1b2b33',null,1);
 ctx.fillStyle='#243a44';ctx.beginPath();ctx.moveTo(carX-cwd*.26,carY-chd*.35);ctx.lineTo(carX-cwd*.12,carY-chd*.95);ctx.lineTo(carX+cwd*.18,carY-chd*.95);ctx.lineTo(carX+cwd*.30,carY-chd*.35);ctx.closePath();ctx.fill();
 ctx.fillStyle='rgba(180,215,230,.22)';ctx.fillRect(carX-cwd*.16,carY-chd*.88,cwd*.28,chd*.45);
 ctx.fillStyle='#0d1013';ctx.beginPath();ctx.arc(carX-cwd*.28,carY+chd*.42,chd*.20,0,Math.PI*2);ctx.arc(carX+cwd*.28,carY+chd*.42,chd*.20,0,Math.PI*2);ctx.fill();
 // grass tufts (more with nights)
 if(!low){for(let i=0;i<n*8;i++){const gx=(i*97%100)/100*w,gy=h*0.72+((i*31)%40);ctx.strokeStyle=`rgba(120,160,90,${0.3+0.1*Math.sin(i)})`;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(gx,gy);ctx.lineTo(gx+1+Math.sin(i)*2,gy-6-(i%4));ctx.stroke();}}
 // rain/embers N4+
 if(n>=4){for(let i=0;i<60;i++){const rx=(i*173%100)/100*w,ry=((t*120+i*37)%100)/100*h;ctx.fillStyle=n>=5?'rgba(200,60,90,.3)':'rgba(180,160,200,.2)';ctx.fillRect(rx,ry,1,8);}}
 // corruption glitch bands N4+
 if(corrupt>0){ctx.fillStyle='rgba(180,20,50,.08)';for(let i=0;i<6;i++){const yy=h*((i*0.16+t*0.4)%1);ctx.fillRect(-40,yy,w+80,2+(i%3)*2);}}
 ctx.restore();
}
// ==== V70: второй/третий кадры и монтаж ====
// Кадр 3: тёмный зал изнутри, силуэты аниматроников подходят к камере.
function introInterior(lt,n){
 const w=W,h=H,t=performance.now()/1000;
 const zoom=1.10+0.10*Math.min(1,lt/4.6);
 ctx.save();
 ctx.translate(w*0.5,h*0.5);ctx.scale(zoom,zoom);ctx.translate(-w*0.5,-h*0.52);
 try{window.World.pizza(ctx,w,h,t);}catch(e){ctx.fillStyle='#0a0d11';ctx.fillRect(0,0,w,h);}
 // затемнение: зал почти не освещён
 ctx.fillStyle='rgba(3,5,8,.40)';ctx.fillRect(0,0,w,h);
 // ===== V88: СИЛУЭТЫ В ГЛУБИНЕ ЗАЛА =====
 // Баг, который здесь починен: масштаб считался как (h/230)*(0.42+1.05*k). При k=1
 // и высоте кадра 720 это давало множитель около 4.6, а сам спрайт аниматроника
 // — 160 юнитов высотой. Три-четыре фигуры ростом почти в три экрана наезжали
 // друг на друга, и их розово-голубые неоновые свечения слагались в белую кашу —
 // то самое «пол экрана в засвете». А так как k у каждого свой и ползёт со своей
 // задержкой, засвет ещё и «сам менялся» по ходу кадра.
 // Причина лагов — ctx.filter='brightness(...)' на каждый кадр на каждую фигуру:
 // Canvas2D из-за него сбрасывает аппаратный путь и гонит весь слой через процессор.
 // Стало: та же drawGroundedMonster, что рисует аниматроников на камерах — она
 // затемняет силуэт своим оффскрин-проходом без ctx.filter, а рост фигуры задан
 // в долях высоты кадра, а не в случайном множителе.
 const cast=n>=3?['main','felix','exo','lav']:['main','felix','exo'];
 // глубина: двое ближе к камере, остальные глубже и мельче — ряд из одинаковых
 // фигур читался как наклеенные стикеры
 // линия пола взята выше столиков зала: стоя на 0.86 фигуры прятались за красными
 // столами и уезжали ногами за нижнюю кромку кадра
 const LAY=[[0.235,0.735,1.00],[0.735,0.755,1.06],[0.415,0.680,0.80],[0.885,0.665,0.72]];
 cast.forEach((kk,i)=>{
   const L=LAY[i]||LAY[0];
   const delay=i*0.55, k=Math.max(0,Math.min(1,(lt-delay)/3.0));
   if(k<=0)return;
   // рост в кадре: от 0.20 до 0.34 высоты — они выходят из глубины, но не врезаются в объектив
   const hpx=h*(0.200+0.140*k)*L[2];
   const sc=hpx/(MON_FEET-MON_TOP);
   const px=w*(L[0]+(L[0]-0.5)*0.16*k), gy=h*(L[1]-0.045*(1-k));
   drawGroundedMonster(ctx,px,gy,{kind:kk,state:'watching',warning:0},sc,{
     face:L[0]>0.5?-1:1,
     // пока они в глубине — почти чёрные силуэты, к концу лишь чуть проявляются
     dark:0.88-0.22*k, eyeK:0.45+0.55*k,
     fog:0.16-0.06*k, fogColor:'22,20,28',
     footTint:0.70, topTint:0.30,
     aura:false,
     shadow:0.52, shadowDir:L[0]>0.5?1:-1,
     alpha:0.42+0.52*k,
     lean:Math.sin(t*0.5+i)*0.008
   });
 });
 ctx.restore();
 ctx.fillStyle='rgba(2,3,6,'+(0.14+0.10*Math.sin(lt*0.7)).toFixed(3)+')';ctx.fillRect(0,0,w,h);
 // аварийный свет из коридора — чтобы зал читался
 const em=ctx.createRadialGradient(w*0.5,h*0.30,w*0.02,w*0.5,h*0.30,w*0.55);
 em.addColorStop(0,'rgba(190,60,60,.20)');em.addColorStop(1,'rgba(0,0,0,0)');
 ctx.fillStyle=em;ctx.fillRect(0,0,w,h);
}
const INTRO_SHOTS=[4.2,3.6,4.9];
const INTRO_TOTAL=INTRO_SHOTS[0]+INTRO_SHOTS[1]+INTRO_SHOTS[2];
const introCue={key:''};
function introSound(key,fn){if(introCue.key===key)return;introCue.key=key;fn();}
function drawIntroCinematic(st){
 const w=W,h=H,n=Math.min(5,Math.max(1,G.night||1)),low=document.body.classList.contains('low-end');
 const s=INTRO_STORIES[n]||INTRO_STORIES[1];
 const t=Math.max(0,st);
 // раскадровка: общий план → вход крупно → зал изнутри
 let shot=0, lt=t;
 if(t>=INTRO_SHOTS[0]+INTRO_SHOTS[1]){shot=2;lt=t-INTRO_SHOTS[0]-INTRO_SHOTS[1];}
 else if(t>=INTRO_SHOTS[0]){shot=1;lt=t-INTRO_SHOTS[0];}
 // звук: гул, гроза на стыке, глухой удар перед залом
 if(t<0.25)introSound('s'+n+'-0',()=>{window.AudioFX.play('hum',.35,{group:'ambience'});window.AudioFX.synth?.('rumble',.55);});
 if(shot===1&&lt<0.25)introSound('s'+n+'-1',()=>{window.AudioFX.synth?.('thunder',.85);});
 if(shot===2&&lt<0.25)introSound('s'+n+'-2',()=>{window.AudioFX.synth?.('sting',.6);window.AudioFX.synth?.('rumble',.5);});
 ctx.save();
 // легкое дрожание кадра (как у плёнки)
 const wv=low?0:1;
 ctx.translate(Math.sin(t*7.3)*1.2*wv,Math.cos(t*5.1)*1.0*wv);
 if(shot===0)introExterior(lt,1.0,0.5,0.5);
 else if(shot===1){
   introExterior(lt*0.55+2.2,2.05,0.5,0.47);
   // вспышка молнии на крупном плане
   ctx.fillStyle='rgba(8,12,26,.30)';ctx.fillRect(0,0,w,h);
   const fl=Math.max(0,Math.sin(lt*8.5))*Math.max(0,1-lt/1.3);
   if(fl>0.15){ctx.fillStyle=`rgba(196,214,236,${(fl*0.28).toFixed(3)})`;ctx.fillRect(0,0,w,h);}
 }
 else introInterior(lt,n);
 ctx.restore();
 // цветокоррекция по главе
 ctx.save();ctx.globalCompositeOperation='soft-light';
 ctx.fillStyle=n>=5?'rgba(120,10,26,.34)':n>=4?'rgba(96,16,34,.26)':n>=3?'rgba(28,36,74,.24)':'rgba(24,34,46,.18)';
 ctx.fillRect(0,0,w,h);ctx.restore();
 // виньетка
 const vig=ctx.createRadialGradient(w*0.5,h*0.5,w*0.12,w*0.5,h*0.5,w*0.72);
 vig.addColorStop(0,'rgba(0,0,0,0)');vig.addColorStop(1,n>=4?'rgba(16,0,8,.68)':'rgba(6,9,16,.55)');
 ctx.fillStyle=vig;ctx.fillRect(0,0,w,h);
 // зерно плёнки
 if(!low){ctx.save();ctx.globalAlpha=.055;for(let i=0;i<120;i++){ctx.fillStyle=i%2?'#fff':'#000';ctx.fillRect(Math.random()*w,Math.random()*h,2,2);}ctx.restore();}
 // склейки: короткий провал в чёрное между кадрами
 const cut=(edge)=>{const d=Math.abs(t-edge);if(d<0.16){ctx.fillStyle=`rgba(0,0,0,${(1-d/0.16).toFixed(3)})`;ctx.fillRect(0,0,w,h);}};
 cut(INTRO_SHOTS[0]);cut(INTRO_SHOTS[0]+INTRO_SHOTS[1]);
 if(t<0.5){ctx.fillStyle=`rgba(0,0,0,${(1-t/0.5).toFixed(3)})`;ctx.fillRect(0,0,w,h);}
 // кинематографичные полосы сверху и снизу
 const bar=h*0.075;
 ctx.fillStyle='#000';ctx.fillRect(0,0,w,bar);ctx.fillRect(0,h-bar,w,bar);
 // титр главы (первый кадр) и строки истории (третий)
 ctx.textAlign='left';
 if(shot===0){
   const a=Math.min(1,lt/0.9)*Math.min(1,Math.max(0,(INTRO_SHOTS[0]-lt)/0.7));
   ctx.save();ctx.globalAlpha=a;
   // V98: базовые линии стояли на 0.205h и 0.25h — при кегле 0.036w заголовок
   // «ОТКРЫТИЕ» садился на подзаголовок, а серый #a9bac6 поверх светлого неба
   // почти не читался. Строки разведены, добавлена тень и тонкая линейка.
   ctx.font='700 '+Math.round(w*0.036)+'px "Oswald",Impact,sans-serif';
   ctx.shadowColor='rgba(0,0,0,.70)';ctx.shadowBlur=10;ctx.shadowOffsetY=2;
   ctx.fillStyle='#f2f7f9';ctx.fillText(s.title,w*0.065,h*0.195);
   ctx.shadowBlur=6;
   ctx.font='700 '+Math.round(w*0.015)+'px "Inter",Arial,sans-serif';ctx.fillStyle='#dfe9ef';
   ctx.fillText('GOREВОКСЕД // СМЕНА '+n,w*0.065,h*0.272);
   ctx.shadowColor='transparent';ctx.shadowBlur=0;ctx.shadowOffsetY=0;
   ctx.fillStyle='rgba(226,60,70,.85)';ctx.fillRect(w*0.065,h*0.222,w*0.075,2);
   ctx.restore();
 }
 if(shot===2){
   // тёмная подложка, чтобы текст читался поверх зала
   const sc=ctx.createLinearGradient(0,h*0.55,0,h);
   sc.addColorStop(0,'rgba(0,0,0,0)');sc.addColorStop(1,'rgba(0,0,0,.72)');
   ctx.fillStyle=sc;ctx.fillRect(0,h*0.55,w,h*0.45);
   s.lines.forEach((ln,i)=>{
     const p=Math.min(1,Math.max(0,(lt-0.4-i*0.95)/0.4));if(p<=0)return;
     const typed=ln.slice(0,Math.max(0,Math.floor(ln.length*Math.min(1,(lt-0.4-i*0.95)/0.9))));
     ctx.save();ctx.globalAlpha=p;
     ctx.font='500 '+Math.round(w*0.019)+'px "Inter",Arial,sans-serif';
     ctx.fillStyle=i===s.lines.length-1?'#e6c9f0':'#d3dbe0';
     ctx.shadowColor='rgba(0,0,0,.9)';ctx.shadowBlur=8;
     ctx.fillText(typed,w*0.065,h*(0.705+i*0.058));
     ctx.restore();
   });
 }
 if(t>2.0){
   ctx.save();ctx.globalAlpha=Math.min(1,(t-2.0)/0.6)*(0.5+0.4*Math.abs(Math.sin(t*3)));
   ctx.fillStyle='#9fb0c4';ctx.font='700 '+Math.round(w*0.013)+'px "Inter",Arial,sans-serif';ctx.textAlign='center';
   ctx.fillText(t>INTRO_TOTAL-1.2?'НАЧАТЬ СМЕНУ':'ПРОПУСТИТЬ ВВЕДЕНИЕ',w*0.5,h*0.965);
   ctx.restore();
 }
 ctx.textAlign='left';
 scan();
}
 // V62: доля заполнения ползунка -> CSS-переменная, чтобы шкала светилась тёплым до бегунка.
 function setRangeFill(el){
  const mn=Number(el.min||0), mx=Number(el.max||1), v=Number(el.value);
  const f=mx>mn?Math.max(0,Math.min(1,(v-mn)/(mx-mn))):0;
  el.style.setProperty('--fill',(f*100).toFixed(1)+'%');
 }
 function syncSettingsUI(){
  const el=document.getElementById('settings-ui'); if(!el)return;
  if(G.state!=='settings'){el.classList.remove('visible');return;}
  el.classList.add('visible');
  const c=window.SaveSystem.settings||{};
  const L=s=>window.I18N?window.I18N.T(s):s;
  const pct=(v)=>Math.round(Number(v)*100)+'%';
  // V83: значения выпадающих списков тоже переводятся — раньше игрок видел
  // технические LOW / WINDOWED / AUTO даже в русском интерфейсе.
  const VAL={low:'НИЗКОЕ',medium:'СРЕДНЕЕ',high:'ВЫСОКОЕ',balanced:'СБАЛАНСИРОВАННОЕ',
    auto:'АВТО',windowed:'В ОКНЕ',borderless:'БЕЗ РАМКИ',fullscreen:'ПОЛНЫЙ ЭКРАН',
    'true':'ВКЛ','false':'ВЫКЛ','стрелки':'СТРЕЛКИ','мышь':'МЫШЬ'};
  // V114: в «ПРОФИЛЕ УСТРОЙСТВА» вариант «НИЗКОЕ» звучит как приговор железу —
// переименован в «ПРОИЗВОДИТЕЛЬНОСТЬ» (режим ради fps, а не «плохой компьютер»).
// Остальные списки (тени, свет и т.д.) пользуются общими подписями VAL как раньше.
const vlabel=(v,over)=>{const k=String(v);return L((over&&over[k])||VAL[k]||k).toUpperCase();};
  const slider=(key,label,min,max,step)=>`<div class="setting-row"><label for="set-${key}">${L(label)}</label><input id="set-${key}" data-key="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${c[key]??min}"><output id="out-${key}">${pct(c[key]??min)}</output></div>`;
  const select=(key,label,vals,over)=>`<div class="setting-row"><label for="set-${key}">${L(label)}</label><select id="set-${key}" data-key="${key}">${vals.map(v=>`<option value="${v}" ${String(c[key])===String(v)?'selected':''}>${vlabel(v,over)}</option>`).join('')}</select><output></output></div>`;
  // Языки подписаны на самих себя — POLSKI остаётся POLSKI в любом интерфейсе.
  const langRow=()=>{const cur=window.I18N?window.I18N.lang:'ru';
    const list=window.I18N?window.I18N.langs():[{code:'ru',native:'РУССКИЙ'}];
    return `<div class="setting-row"><label for="set-lang">${L('ЯЗЫК')}</label><select id="set-lang" data-lang-select="1">${list.map(l=>`<option value="${l.code}" ${l.code===cur?'selected':''}>${l.native}</option>`).join('')}</select><output></output></div>`;};
  const toggle=(key,label)=>`<div class="setting-row effect-toggle-row"><label>${L(label)}</label><button type="button" class="effect-toggle ${c[key]?'is-on':''}" data-effect-toggle="${key}" aria-pressed="${!!c[key]}"><span class="effect-led"></span><span class="effect-state">${L(c[key]?'ВКЛ':'ВЫКЛ')}</span></button><output></output></div>`;
  const build=()=>{
    el.innerHTML=`<div class="settings-head"><div><div class="settings-title">${L('НАСТРОЙКИ ИГРЫ')}</div><div class="settings-head-hint">${L('ИЗМЕНЕНИЯ СОХРАНЯЮТСЯ АВТОМАТИЧЕСКИ')}</div></div><button type="button" class="settings-close" data-settings-action="back" aria-label="${L('НАЗАД')}">${L('НАЗАД')}</button></div>
      <div class="settings-subtitle">${L('ЯЗЫК ИНТЕРФЕЙСА')}</div>
      ${langRow()}
      <div class="settings-hint">${L('Текст интерфейса, записки, субтитры и достижения переводятся сразу. Голоса звучат на русском или английском языке.')}</div>
      <div class="settings-subtitle">${L('ЗВУК')}</div>
      ${slider('music','МУЗЫКА',0,1,.01)}${slider('ambience','ОКРУЖЕНИЕ',0,1,.01)}${slider('monster','МОНСТРЫ',0,1,.01)}${slider('radio','РАДИО',0,1,.01)}${slider('phone','ТЕЛЕФОН',0,1,.01)}
      <div class="settings-subtitle">${L('ГРАФИКА')}</div>
      ${select('resolution','РАЗРЕШЕНИЕ',['auto','2560','1920','1600','1280','960'])}${slider('brightness','ЯРКОСТЬ',.7,1.6,.01)}${select('fpsLimit','FPS',[30,60,90,120,144])}${select('displayMode','РЕЖИМ ЭКРАНА',['windowed','fullscreen'])}
      ${select('deviceMode','ПРОФИЛЬ УСТРОЙСТВА',['low','balanced','high'],{low:'ПРОИЗВОДИТЕЛЬНОСТЬ'})}${select('shadows','ТЕНИ',['low','medium','high'])}${select('reflections','ОТРАЖЕНИЯ',['low','medium','high'])}${select('lighting','СВЕТ',['low','medium','high'])}${select('effects','КАЧЕСТВО ЭФФЕКТОВ',['low','medium','high'])}
      <div class="settings-subtitle">${L('ЭФФЕКТЫ В ИГРЕ')}</div>
      ${toggle('effectGlitch','ГЛИТЧ')}
      ${toggle('effectScanlines','СКАНЛАЙНЫ')}
      ${toggle('effectGrain','ЗЕРНО')}
      ${toggle('effectVignette','ВИНЬЕТКА')}
      ${toggle('effectChromatic','RGB СМЕЩЕНИЕ')}
      <div class="settings-subtitle">${L('УПРАВЛЕНИЕ')}</div>
      ${select('camMode','УПРАВЛЕНИЕ КАМЕРОЙ',['стрелки','мышь'])}
      ${toggle('sideButtons','БОКОВЫЕ КНОПКИ ДВЕРИ/СВЕТА')}
      <div class="settings-hint">${L('ВЫКЛ: закрывайте дверь и включайте свет прямым нажатием на них в офисе. ВКЛ: вернуть старые кнопки по краям экрана.')}</div>
      ${toggle('achPopups','УВЕДОМЛЕНИЯ О ДОСТИЖЕНИЯХ')}
      <div class="settings-hint">${L('Показывать всплывающую карточку при получении новой отметки.')}</div>
      <div class="settings-hint">${L('СТРЕЛКИ: клавиши A / D или ←/→ поворачивают камеру шагом (лево → центр → право). МЫШЬ: камера плавно следит за курсором по горизонтали — зажимать кнопку не нужно. Двери закрываются кликом мыши по ним.')}</div>
      <div class="settings-subtitle">${L('ШЕЙДЕРЫ')}</div>
      ${slider('shaderIntensity','ОБЩАЯ СИЛА',0,1,.01)}${slider('scanlines','СКАНЛАЙНЫ',0,1,.01)}${slider('grain','ЗЕРНО',0,1,.01)}${slider('vignette','ВИНЬЕТКА',0,1,.01)}${slider('chromatic','RGB СМЕЩЕНИЕ',0,1,.01)}${slider('glitch','ГЛИТЧ',0,1,.01)}
      <div class="settings-hint">${L('Изменения применяются сразу и сохраняются автоматически.')}</div>
      <div class="settings-footer">
        <button type="button" data-settings-action="apply">${L('ПРИМЕНИТЬ')}</button>
        <button type="button" data-settings-action="reset">${L('СБРОСИТЬ')}</button>
        <button type="button" data-settings-action="fullscreen">${L('ПОЛНЫЙ ЭКРАН')}</button>
      </div>`;
    el.dataset.ready='1';
  };
  if(!el.dataset.ready || !el.querySelector('[data-key]')) build();
  el.querySelectorAll('[data-key]').forEach(e=>{
    const k=e.dataset.key;
    if(e.type==='range'){
      e.value=c[k]??e.min;
      const o=document.getElementById('out-'+k); if(o)o.textContent=pct(c[k]??e.min);
      setRangeFill(e);
    }else e.value=String(c[k] ?? e.value);
  });
  el.querySelectorAll('[data-effect-toggle]').forEach(b=>{const k=b.dataset.effectToggle;const on=!!c[k];b.classList.toggle('is-on',on);b.setAttribute('aria-pressed',String(on));const st=b.querySelector('.effect-state');if(st)st.textContent=L(on?'ВКЛ':'ВЫКЛ');});
  const ls=el.querySelector('[data-lang-select]'); if(ls)ls.value=(window.I18N?window.I18N.lang:'ru');
  if(!el.dataset.bound){
    const update=(e)=>{
      // V83: смена языка перестраивает панель целиком, чтобы подписи и
      // значения списков сразу были на новом языке.
      if(e.target?.dataset?.langSelect){
        window.I18N?.setLang(e.target.value);
        el.dataset.ready='';syncSettingsUI();
        return;
      }
      const key=e.target?.dataset?.key;if(!key)return;
      let v=e.target.type==='range'?Number(e.target.value):e.target.value;
      if(key==='fpsLimit')v=Number(v);
      if(key==='brightness')v=Math.max(.7,Math.min(1.6,v));
      c[key]=v;window.SaveSystem.saveSettings();
      // V110: режим экрана переключается сразу по выбору в списке, а не только
      // кнопкой «полный экран».
      if(key==='displayMode')applyDisplayMode();
      if(key==='camMode'){if(v==='стрелки'){G.yawPos=G.viewYawTarget<-0.3?0:(G.viewYawTarget>0.3?2:1);G.viewYawTarget=YAW_POS[G.yawPos];}else if(v==='мышь'){G.yawPos=1;}}
      const out=document.getElementById('out-'+key);if(out&&e.target.type==='range')out.textContent=pct(v);
      if(e.target.type==='range')setRangeFill(e.target);
      applyAudio();resize();window.PostFX?.resize?.();
    };
    const action=(e)=>{
      const btn=e.target.closest('[data-settings-action],[data-effect-toggle]');if(!btn)return;
      e.preventDefault();e.stopPropagation();
      const toggleKey=btn.dataset.effectToggle;
      if(toggleKey){
        c[toggleKey]=!c[toggleKey];
        window.SaveSystem.saveSettings();
        syncSettingsUI();
        applyAudio();
        window.PostFX?.resize?.();
        return;
      }
      const a=btn.dataset.settingsAction;
      window.AudioFX.unlock();window.AudioFX.play('click',.35,{group:'ui'});
      if(a==='apply'){window.SaveSystem.saveSettings();applyAudio();resize();window.PostFX?.resize?.();return;}
      if(a==='reset'){
        /* V110: СБРОС ДАЁТ РОВНО ТО ЖЕ, ЧТО ПЕРВЫЙ ЗАПУСК НА ЭТОЙ МАШИНЕ.
           ПОЧЕМУ ТАК БЫЛО: сброс жёстко ставил низкий профиль и quality:'normal',
           то есть на любой машине после сброса картинка становилась тёмнее и
           мыльнее. СТАЛО: база сбалансированная, а на слабом железе сразу же
           применяется низкий профиль — как при чистом первом запуске. */
        Object.assign(c,{music:.42,ambience:.35,monster:.8,radio:.55,phone:.7,ui:.4,crt:.35,shake:true,quality:'high',deviceMode:'balanced',shaderIntensity:.45,scanlines:.55,grain:.35,vignette:.45,chromatic:.18,glitch:.15,resolution:'auto',displayMode:'windowed',fpsLimit:60,brightness:1,gfxProfile:110,shadows:'medium',reflections:'medium',lighting:'medium',effects:'medium',leftInterface:true,rightInterface:true,effectsEnabled:true,effectGlitch:true,effectScanlines:true,effectGrain:true,effectVignette:true,effectChromatic:true,camMode:'стрелки',doorKeys:true,sideButtons:false,achPopups:true});
        if(weakDevice)lowProfile();
        window.SaveSystem.saveSettings();el.dataset.ready='';syncSettingsUI();applyAudio();resize();applyDisplayMode();window.PostFX?.resize?.();return;
      }
      // V110: КНОПКА ПОЛНОГО ЭКРАНА РАБОТАЕТ В ОБЕ СТОРОНЫ И ВЕЗДЕ.
      // ПОЧЕМУ ТАК БЫЛО: вызывалась только функция площадки и только на вход —
      // выйти той же кнопкой было нельзя, и состояние в настройках не менялось.
      // СТАЛО: кнопка переключает режим и туда, и обратно, синхронно со списком
      // РЕЖИМ ЭКРАНА.
      if(a==='fullscreen'){
        // отталкиваемся от собственной настройки, а не от состояния браузера: на части
        // площадок и в окне iframe запрос полного экрана может быть отклонён,
        // и тогда кнопка залипала бы в одном положении.
        c.displayMode=(c.displayMode==='fullscreen')?'windowed':'fullscreen';
        window.SaveSystem.saveSettings();applyDisplayMode();el.dataset.ready='';syncSettingsUI();return;
      }
      if(a==='back'){
        const fromPause=G.pauseFrom==='pause';
        el.classList.remove('visible');
        el.dataset.ready='';
        G.state=fromPause?'pause':'menu';
        if(!fromPause)G.pauseFrom='game';
        return;
      }
    };
    el.addEventListener('input',update);el.addEventListener('change',update);el.addEventListener('click',action);
    el.addEventListener('wheel',e=>{ if(G.state==='settings'){ e.stopPropagation(); } },{passive:true});
    el.dataset.bound='1';
  }
 }
 function drawSettings(){screenBackdrop([120,142,160],0.87);screenTitle('НАСТРОЙКИ','ПУЛЬТ ОХРАНЫ // ЗВУК • ГРАФИКА • ЭФФЕКТЫ',[120,142,160],W*.055,H*.062);syncSettingsUI();
 }
 // V82: экран «ПЛАН ИЗМЕНЕНИЙ» — читаемый лог того, что сделано в сборке V82.
// ==== V93: ЭКРАН СМЕН 6 И 7 ====
// Открывается из меню после пройденной игры. Шестая — глухая смена,
// седьмая — своя: агрессия каждого от 0 до 20.
const CUSTOM_ROWS=[['main','МОНСТР'],['felix','ФЕЛИКС'],['exo','EXO'],['lav','LAV']];
function customLv(){
 if(!G.customLv)G.customLv={main:12,felix:12,exo:12,lav:12};
 return G.customLv;
}
function customGeom(){
 const low=menuLow();
 const x=W*.055, y=H*.20;
 const rowH=low?Math.max(22,H*.105):Math.max(30,H*.115);
 const bw=low?Math.max(24,W*.055):Math.max(30,W*.05);
 const btnY=low?H-34:Math.min(H-48,H*.90), bh=low?28:38;
 return {low,x,y,rowH,bw,btnY,bh};
}
function drawCustom(){
 const ACC=[168,86,72];
 screenBackdrop(ACC,0.88);
 const g=customGeom();
 screenTitle('СМЕНЫ 6 И 7',(window.SaveSystem.data.night6Done?'ШЕСТАЯ ПРОЙДЕНА // ':'')+'АГРЕССИЯ 0-20',ACC,W*.055,g.low?H*.085:H*.062);
 const lv=customLv();
 const sz=Math.max(10,Math.min(16,W/78));
 CUSTOM_ROWS.forEach((r,i)=>{
   const ry=g.y+i*g.rowH;
   ctx.font=`700 ${Math.round(sz)}px "Oswald",Impact,sans-serif`;ctx.textAlign='left';
   ctx.fillStyle='#c9d0d4';ctx.fillText(r[1],g.x,ry+g.rowH*.42);
   const bx=g.x+W*.20, bwid=W*.40, bhh=Math.max(7,g.rowH*.20), by=ry+g.rowH*.18;
   roundedRect(ctx,bx,by,bwid,bhh,3,'rgba(0,0,0,.55)',null,0);
   const k=Math.max(0,Math.min(20,lv[r[0]]))/20;
   ctx.fillStyle=`rgba(${ACC[0]},${ACC[1]},${ACC[2]},.85)`;ctx.fillRect(bx+1,by+1,(bwid-2)*k,bhh-2);
   ctx.font=`700 ${Math.round(sz)}px "Oswald",Impact,sans-serif`;ctx.textAlign='right';
   ctx.fillStyle=lv[r[0]]<=0?'#7d868c':'#e6e1da';
   ctx.fillText(lv[r[0]]<=0?'НЕТ':String(lv[r[0]]),bx+bwid+W*.052,ry+g.rowH*.42);
   [['−',bx+bwid+W*.075],['+',bx+bwid+W*.075+g.bw+W*.014]].forEach(b=>{
     roundedRect(ctx,b[1],by-g.rowH*.10,g.bw,Math.max(20,g.rowH*.52),4,'rgba(255,255,255,.06)','rgba(255,255,255,.14)',1);
     ctx.textAlign='center';ctx.fillStyle='#d9dde0';
     ctx.font=`700 ${Math.round(sz*1.15)}px "Oswald",Impact,sans-serif`;
     ctx.fillText(b[0],b[1]+g.bw/2,by+g.rowH*.30);
   });
 });
 const labels=[['НАЗАД',g.x,W*.20],['СМЕНА 6',g.x+W*.225,W*.24],['СВОЯ СМЕНА',g.x+W*.49,W*.31]];
 labels.forEach((b,i)=>{
   roundedRect(ctx,b[1],g.btnY,b[2],g.bh,5,i===0?'rgba(255,255,255,.05)':`rgba(${ACC[0]},${ACC[1]},${ACC[2]},.22)`,'rgba(255,255,255,.16)',1);
   ctx.textAlign='center';ctx.textBaseline='middle';
   ctx.font=`700 ${Math.round(Math.max(11,Math.min(16,W/86)))}px "Oswald",Impact,sans-serif`;
   ctx.fillStyle='#e6e1da';ctx.fillText(b[0],b[1]+b[2]/2,g.btnY+g.bh/2);
   ctx.textBaseline='alphabetic';
 });
 ctx.textAlign='left';
}
function customClick(x,y){
 const g=customGeom(), lv=customLv();
 for(let i=0;i<CUSTOM_ROWS.length;i++){
   const ry=g.y+i*g.rowH, by=ry+g.rowH*.18, bx=g.x+W*.20, bwid=W*.40;
   const h=Math.max(20,g.rowH*.52), yy=by-g.rowH*.10;
   const k=CUSTOM_ROWS[i][0];
   if(hitRect(x,y,bx+bwid+W*.075,yy,g.bw,h)){lv[k]=Math.max(0,lv[k]-1);window.AudioFX.play('click',.4,{group:'ui'});return}
   if(hitRect(x,y,bx+bwid+W*.075+g.bw+W*.014,yy,g.bw,h)){lv[k]=Math.min(20,lv[k]+1);window.AudioFX.play('click',.4,{group:'ui'});return}
 }
 if(hitRect(x,y,g.x,g.btnY,W*.20,g.bh)){G.state='menu';window.AudioFX.play('click');return}
 if(hitRect(x,y,g.x+W*.225,g.btnY,W*.24,g.bh)){window.AudioFX.play('click');startNight(5,6);return}
 if(hitRect(x,y,g.x+W*.49,g.btnY,W*.31,g.bh)){window.AudioFX.play('click');startNight(5,7);return}
}
// ==== V93: ТЕМНОТА ПОСЛЕ ОТКЛЮЧЕНИЯ ПИТАНИЯ ====
// Рисуется ПОВЕРХ обычного кабинета: сначала гаснет всё, потом в правом
// проёме начинает проявляться силуэт и два бледных глаза.
function drawBlackout(){
 const b=G.blackout;if(!b)return;
 const t=b.t;
 // 1) Свет уходит за 0.9 с до полной темноты.
 const dark=Math.min(1,t/0.9);
 ctx.save();
 ctx.fillStyle=`rgba(0,0,0,${0.965*dark})`;ctx.fillRect(0,0,W,H);
 // 2) Слабый серый проём справа — глаз привыкает к темноте.
 const adapt=Math.max(0,Math.min(1,(t-1.6)/5.0));
 const dx=W*.735,dy=H*.30,dw=W*.20,dh=H*.52;
 const g=ctx.createLinearGradient(dx,dy,dx,dy+dh);
 g.addColorStop(0,`rgba(30,38,44,${0.16*adapt})`);g.addColorStop(1,`rgba(8,10,12,${0.02*adapt})`);
 ctx.fillStyle=g;ctx.fillRect(dx,dy,dw,dh);
 // 3) После второго завода шкатулки — силуэт и глаза.
 // V94: после 12.6 с силуэт ПОДХОДИТ: раньше он стоял на одном месте до самого
 // конца, и последние секунды темноты были статичными.
 if(t>8.2){
   const k=Math.min(1,(t-8.2)/3.6);
   const near=Math.max(0,Math.min(1,(t-12.6)/3.0));
   const jit=(t>11.4?1:0)*(Math.random()-0.5)*3.2*(1+near*2.2);
   const cx=dx+dw*.5+jit-near*W*0.10, base=dy+dh*.98+near*H*0.06, hh=dh*(.62+.10*k)*(1+near*0.65);
   ctx.fillStyle=`rgba(0,0,0,${0.55*k})`;
   ctx.beginPath();
   ctx.moveTo(cx-dw*.30,base);ctx.lineTo(cx-dw*.22,base-hh*.62);
   ctx.quadraticCurveTo(cx,base-hh*1.06,cx+dw*.22,base-hh*.62);
   ctx.lineTo(cx+dw*.30,base);ctx.closePath();ctx.fill();
   const ey=base-hh*.80, er=Math.max(1.6,W*.0042)*(1+near*1.15);
   const eg=0.20+0.68*k+(t>11.4?0.12*Math.sin(t*9):0)+near*0.10;
   for(const s of[-1,1]){
     ctx.fillStyle=`rgba(226,232,236,${Math.min(1,eg)})`;
     ctx.beginPath();ctx.ellipse(cx+s*dw*.115*(1+near*0.5),ey,er*1.25,er,0,0,Math.PI*2);ctx.fill();
     ctx.fillStyle=`rgba(120,20,24,${(0.35*k+0.25*near).toFixed(3)})`;
     ctx.beginPath();ctx.ellipse(cx+s*dw*.115*(1+near*0.5),ey,er*2.4,er*1.9,0,0,Math.PI*2);ctx.fill();
   }
 }
 // 4) Зерно и сетка страха.
 ctx.globalAlpha=0.05+0.05*Math.random();
 ctx.fillStyle='#0b1012';
 for(let i=0;i<26;i++){const rx=Math.random()*W,ry=Math.random()*H;ctx.fillRect(rx,ry,2,2);}
 ctx.globalAlpha=1;
 // 5) Надпись только в самом начале.
 if(t<3.2){
   const a=t<2.2?1:Math.max(0,1-(t-2.2));
   ctx.font=`700 ${Math.round(Math.max(13,Math.min(22,W/44)))}px "Oswald",Impact,sans-serif`;
   ctx.textAlign='center';ctx.fillStyle=`rgba(150,42,44,${0.62*a})`;
   ctx.fillText('ПИТАНИЕ ОТКЛЮЧЕНО',W*.5,H*.5);
   ctx.textAlign='left';
 }
 ctx.restore();
}
// ==== V93: КАДР-ВСТАВКА ====
// Живёт 2-3 кадра и сама себя гасит. Всё рисуется кодом — никаких файлов.
function drawInsert(){
 const f=G.ins;if(!f)return;
 const TINT={main:'#3a0d10',felix:'#2a0f26',exo:'#0d2530',lav:'#2c2408'};
 ctx.save();
 ctx.fillStyle=TINT[f.kind]||'#2a0b0d';ctx.globalAlpha=0.90;ctx.fillRect(0,0,W,H);
 ctx.globalAlpha=1;
 if(f.mode==='text'){
   const TXT={main:'ОН ВСЁ ЕЩЁ ЗДЕСЬ',felix:'ПОСЛУШАЙ МЕНЯ',exo:'НЕ СМОТРИ ВВЕРХ',lav:'ЗАВЕДИ ЕГО'};
   ctx.font=`700 ${Math.round(Math.max(18,Math.min(46,W/17)))}px "Oswald",Impact,sans-serif`;
   ctx.textAlign='center';ctx.fillStyle='rgba(232,226,220,.92)';
   ctx.fillText(TXT[f.kind]||TXT.main,W*.5+(Math.random()-.5)*6,H*.53);
   ctx.textAlign='left';
 }else if(f.mode==='shape'){
   ctx.fillStyle='rgba(0,0,0,.86)';
   const cx=W*(.30+((f.seed%7)/7)*.42),base=H*1.02,hh=H*.86;
   ctx.beginPath();ctx.moveTo(cx-W*.11,base);ctx.lineTo(cx-W*.075,base-hh*.60);
   ctx.quadraticCurveTo(cx,base-hh*1.02,cx+W*.075,base-hh*.60);
   ctx.lineTo(cx+W*.11,base);ctx.closePath();ctx.fill();
 }else{
   // Лицо во весь кадр: тёмная маска, белые глаза, ряд зубов.
   const cx=W*.5,cy=H*.47,r=Math.min(W,H)*.34;
   ctx.fillStyle='rgba(6,6,7,.92)';
   ctx.beginPath();ctx.ellipse(cx,cy,r*.86,r*1.06,0,0,Math.PI*2);ctx.fill();
   for(const s of[-1,1]){
     ctx.fillStyle='rgba(238,240,240,.95)';
     ctx.beginPath();ctx.ellipse(cx+s*r*.34,cy-r*.16,r*.17,r*.12,0,0,Math.PI*2);ctx.fill();
     ctx.fillStyle='#14181a';
     ctx.beginPath();ctx.ellipse(cx+s*r*.34+(Math.random()-.5)*3,cy-r*.16,r*.055,r*.055,0,0,Math.PI*2);ctx.fill();
   }
   ctx.fillStyle='rgba(228,226,220,.88)';
   for(let i=0;i<9;i++){const tw=r*.075;ctx.fillRect(cx-r*.34+i*tw*1.02,cy+r*.34,tw*.82,r*.13);}
 }
 // Полосы развёртки — будто кадр пробился через ленту.
 ctx.fillStyle='rgba(0,0,0,.28)';
 for(let y=0;y<H;y+=3)ctx.fillRect(0,y,W,1);
 ctx.restore();
 f.f--;if(f.f<=0)G.ins=null;
}
// ==== V112: ЗАПИСНАЯ ДОСКА — режим рисования. ====
// Геометрия листа бумаги: по центру экрана, ~78% ширины и ~74% высоты.
function sketchGeo(){
 const pw=Math.min(W*.78,W*1.0), ph=Math.min(H*.74,H*1.0);
 const px=W*.5-pw*.5, py=H*.5-ph*.5;
 return {px,py,pw,ph};
}
// V114: НОВАЯ СМЕНА БОЛЬШЕ НЕ СТИРАЕТ РИСУНОК.
// ПОЧЕМУ ТАК БЫЛО: и startNight(), и beginPlay() каждый раз создавали G.sketch
// заново со strokes:[]. Всё нарисованное исчезало при старте любой смены — и
// на доске в офисе, разумеется, тоже ничего не появлялось.
// СТАЛО: сбрасывается только состояние режима (открыт/анимация/текущий штрих),
// а сами штрихи переносятся из прошлого состояния или поднимаются из
// сохранения. Стереть рисунок можно только кнопкой «ОЧИСТИТЬ».
function resetSketch(){
 const prev=G&&G.sketch;
 let strokes=(prev&&Array.isArray(prev.strokes))?prev.strokes:null;
 if(!strokes){
  try{const st=window.SaveSystem.data.sketch;
   if(Array.isArray(st))strokes=st.map(x=>({color:x.c||'#c1382f',size:x.w||3,pts:Array.isArray(x.p)?x.p:[]}));
  }catch(e){}
 }
 return {open:false,strokes:strokes||[],cur:null,
  color:(prev&&prev.color)||'#c1382f',size:(prev&&prev.size)||3,
  fade:0,exitPhase:0,exitT:0,blackA:0,openT:0,rev:((prev&&prev.rev)|0)+1,_at:0,_loaded:!!(prev&&prev._loaded)};
}
function openSketch(){
 if(G.sketch.open)return;
 if(G.sketch.exitPhase>0)return; // ещё доигрывает выход — второй раз не открываем
 loadSketch();
 G.sketch.open=true;G.sketch.cur=null;G.sketch.openT=0;G.sketch.fade=0;G.sketch.exitPhase=0;G.sketch.exitT=0;G.sketch.blackA=0;G.sketch._at=performance.now();
 window.AudioFX.synth?.('paper',.7); // шорох бумаги — достал планшет
 try{window.Platform?.stopGameplay?.()}catch(e){}
}
function finishSketch(){
 const s=G.sketch;
 s.open=false;s.cur=null;s.exitPhase=0;s.exitT=0;s.blackA=0;s.fade=0;
 saveSketch();
 try{window.MonsterAudio?.tape(false)}catch(e){}
 try{if(G.state==='game')window.Platform?.startGameplay?.()}catch(e){}
}
// V114: рисунок переживает выход из смены и перезапуск игры — он лежит в
// сохранении рядом с прогрессом. Координаты округляются до тысячных, чтобы
// строка в localStorage не разрасталась.
function saveSketch(){
 try{
  const st=(G.sketch.strokes||[]).filter(x=>x&&x.pts&&x.pts.length)
   .map(x=>({c:x.color,w:x.size,p:x.pts.map(pt=>[Math.round(pt[0]*1000)/1000,Math.round(pt[1]*1000)/1000])}));
  window.SaveSystem.data.sketch=st;
  window.SaveSystem.save();
 }catch(e){}
}
function loadSketch(){
 if(G.sketch._loaded)return; G.sketch._loaded=true;
 try{
  const st=window.SaveSystem.data.sketch;
  if(Array.isArray(st)){G.sketch.strokes=st.map(x=>({color:x.c||'#c1382f',size:x.w||3,pts:Array.isArray(x.p)?x.p:[]}));G.sketch.rev=(G.sketch.rev|0)+1;}
 }catch(e){}
}
// Атмосферный выход: экран гаснет в чёрный, звучит шёпот, пауза, потом
// офис мягко проступает из темноты. Не резко, а с задержкой — будто
// приходится возвращаться из своих мыслей обратно в ночную смену.
function closeSketch(){
 if(G.sketch.exitPhase>0)return;
 G.sketch.exitPhase=1;G.sketch.exitT=0;G.sketch.blackA=0;
 window.AudioFX.synth?.('paper',.6);
 try{window.MonsterAudio?.tape(true)}catch(e){}
 try{window.MonsterAudio?.whisper?.()}catch(e){}
}
// Нормализованные координаты штриха: [0..1] относительно листа бумаги.
function sketchToPaper(x,y){
 const g=sketchGeo();return [Math.max(0,Math.min(1,(x-g.px)/g.pw)),Math.max(0,Math.min(1,(y-g.py)/g.ph))];
}
function sketchInPaper(x,y){
 const g=sketchGeo();return x>=g.px&&x<=g.px+g.pw&&y>=g.py&&y<=g.py+g.ph;
}
function handleSketchClick(x,y){
 if(G.sketch.exitPhase>0)return; // идёт затемнение выхода — нажатия не принимаем
 const g=sketchGeo();
 const tbY=g.py+g.ph+H*.03; // ряд инструментов под листом
 // кнопка ВЫХОД (справа)
 const ex=g.px+g.pw-120, ey=tbY, ew=120, eh=H*.06;
 if(hitRect(x,y,ex,ey,ew,eh)){closeSketch();return;}
 // кнопка ОЧИСТИТЬ
 const cx=g.px+g.pw-250, cy=tbY;
 if(hitRect(x,y,cx,cy,120,eh)){G.sketch.strokes=[];G.sketch.cur=null;G.sketch.rev=(G.sketch.rev|0)+1;saveSketch();window.AudioFX.synth?.('paper',.5);return;}
 // ряд цветов (5 образцов)
 const colors=['#c1382f','#d9a93a','#3a8e5a','#3a6a8e','#d9d3c0'];
 const cw=Math.min(46,W*.07),gap=8,startX=g.px;
 for(let i=0;i<colors.length;i++){
   const sx=startX+i*(cw+gap), sy=tbY;
   if(hitRect(x,y,sx,sy,cw,eh)){G.sketch.color=colors[i];window.AudioFX.play('click',.2,{group:'ui'});return;}
 }
 // кнопка размера кисти
 const szx=g.px+colors.length*(cw+gap), szy=tbY;
 if(hitRect(x,y,szx,szy,cw,eh)){G.sketch.size=G.sketch.size>=7?2:G.sketch.size+1;window.AudioFX.play('click',.2,{group:'ui'});return;}
 // иначе — начать штрих прямо по бумаге
 if(sketchInPaper(x,y)){
   if(G.sketch.strokes.length>=60)G.sketch.strokes.shift(); // ограничение памяти
   const p=sketchToPaper(x,y);
   G.sketch.cur={color:G.sketch.color,size:G.sketch.size,pts:[p]};
   G.sketch.strokes.push(G.sketch.cur);G.sketch.rev=(G.sketch.rev|0)+1;
   try{canvas.setPointerCapture&&canvas.setPointerCapture(window._sketchPid||1)}catch(e){}
 }
}
function drawSketch(){
 const s=G.sketch;if(!s.open)return;
 const g=sketchGeo();
 const black=s.blackA||0;
 const paperA=Math.max(0,(s.fade||0)*(1-black)); // бумага гаснет, когда поднимается чёрный
 if(paperA<=0.002){
  // Только чёрная пелена — лист уже погас, экономим целый проход отрисовки.
  if(black>0){ctx.save();ctx.fillStyle='rgba(2,3,4,'+black.toFixed(3)+')';ctx.fillRect(0,0,W,H);ctx.restore();}
  return;
 }
 // тёмная виньетка-затемнение вокруг листа
 ctx.save();ctx.fillStyle='rgba(4,6,8,'+(0.78*paperA)+')';ctx.fillRect(0,0,W,H);
 ctx.restore();
 // тень под листом
 ctx.save();ctx.fillStyle='rgba(0,0,0,'+(0.45*paperA)+')';ctx.fillRect(g.px+6,g.py+8,g.pw,g.ph);ctx.restore();
 // лист бумаги
 ctx.save();ctx.globalAlpha=paperA;
 const pg=ctx.createLinearGradient(g.px,g.py,g.px,g.py+g.ph);pg.addColorStop(0,'#e3ddca');pg.addColorStop(1,'#cdc6b1');
 ctx.fillStyle=pg;ctx.fillRect(g.px,g.py,g.pw,g.ph);
 // лёгкая сштриховка-линии
 ctx.fillStyle='rgba(60,60,50,.10)';
 for(let r=0;r<Math.floor(g.ph/14);r++)ctx.fillRect(g.px+g.pw*.06,g.py+14+r*14,g.pw*.88,1);
 ctx.strokeStyle='rgba(0,0,0,.30)';ctx.lineWidth=2;ctx.strokeRect(g.px,g.py,g.pw,g.ph);
 // штрихи
 ctx.lineCap='round';ctx.lineJoin='round';
 s.strokes.forEach(st=>{
   if(!st||st.pts.length<1)return;
   ctx.strokeStyle=st.color;ctx.lineWidth=st.size;
   ctx.beginPath();
   const p0=st.pts[0];ctx.moveTo(g.px+p0[0]*g.pw,g.py+p0[1]*g.ph);
   for(let i=1;i<st.pts.length;i++){const p=st.pts[i];ctx.lineTo(g.px+p[0]*g.pw,g.py+p[1]*g.ph);}
   ctx.stroke();
 });
 ctx.restore();
 // панель инструментов
 const tbY=g.py+g.ph+H*.03;const eh=H*.06;
 ctx.save();ctx.globalAlpha=paperA;
 const colors=['#c1382f','#d9a93a','#3a8e5a','#3a6a8e','#d9d3c0'];
 const cw=Math.min(46,W*.07),gap=8;
 for(let i=0;i<colors.length;i++){
   const sx=g.px+i*(cw+gap);
   ctx.fillStyle='rgba(20,24,28,.8)';ctx.fillRect(sx,tbY,cw,eh);
   ctx.strokeStyle=G.sketch.color===colors[i]?'rgba(217,169,58,.95)':'rgba(90,100,108,.5)';ctx.lineWidth=G.sketch.color===colors[i]?2:1;ctx.strokeRect(sx+.5,tbY+.5,cw-1,eh-1);
   ctx.fillStyle=colors[i];ctx.beginPath();ctx.arc(sx+cw*.5,tbY+eh*.5,cw*.26,0,Math.PI*2);ctx.fill();
 }
 // размер кисти
 const szx=g.px+colors.length*(cw+gap);
 ctx.fillStyle='rgba(20,24,28,.8)';ctx.fillRect(szx,tbY,cw,eh);
 ctx.strokeStyle='rgba(90,100,108,.5)';ctx.lineWidth=1;ctx.strokeRect(szx+.5,tbY+.5,cw-1,eh-1);
 ctx.fillStyle='#d9d3c0';ctx.beginPath();ctx.arc(szx+cw*.5,tbY+eh*.5,G.sketch.size*1.4,0,Math.PI*2);ctx.fill();
 // ОЧИСТИТЬ
 const clx=g.px+g.pw-250;
 ctx.fillStyle='rgba(20,24,28,.8)';ctx.fillRect(clx,tbY,120,eh);
 ctx.strokeStyle='rgba(90,100,108,.5)';ctx.lineWidth=1;ctx.strokeRect(clx+.5,tbY+.5,119,eh-1);
 ctx.fillStyle='#c0c6c4';ctx.font=`700 ${Math.round(eh*.42)}px "Oswald",Impact,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.fillText('ОЧИСТИТЬ',clx+60,tbY+eh*.5);
 // ВЫХОД
 const ex=g.px+g.pw-120;
 ctx.fillStyle='rgba(60,20,24,.85)';ctx.fillRect(ex,tbY,120,eh);
 ctx.strokeStyle='rgba(217,169,58,.6)';ctx.lineWidth=1;ctx.strokeRect(ex+.5,tbY+.5,119,eh-1);
 ctx.fillStyle='#e9e3d0';ctx.fillText('ВЫЙТИ',ex+60,tbY+eh*.5);
 ctx.textAlign='left';ctx.textBaseline='alphabetic';
 // подсказка
 ctx.fillStyle='rgba(180,180,170,.5)';ctx.font=`500 ${Math.round(H*.018)}px "Inter",sans-serif`;ctx.textAlign='center';
 ctx.fillText('рисуй по листу · инструменты снизу · рисунок останется на доске',W*.5,Math.min(H-H*.016,tbY+eh+H*.028));
 ctx.textAlign='left';
 ctx.restore();
 // чёрная пелена выхода поверх всего
 if(black>0){ctx.save();ctx.fillStyle='rgba(2,3,4,'+black.toFixed(3)+')';ctx.fillRect(0,0,W,H);ctx.restore();}
}
function drawPlan(){
 const ACC=[120,142,160];
 screenBackdrop(ACC,0.87);
 const lowP=menuLow();
 // V103: заголовок был «ПЛАН ИЗМЕНЕНИЙ / СБОРКА V93» — служебная надпись из
 // разработки. Теперь экран говорит игроку то, что его касается.
 screenTitle('ПЛАН','СЛОВО ИГРОКУ',ACC,W*.055,lowP?H*.085:H*.062);
 if(G.planScroll===undefined)G.planScroll=0;
 // V86: карточка текста на низком экране начинается ниже подзаголовка и заканчивается над кнопкой.
 // V104: карточка текста начиналась на доле высоты (H*.115), а подзаголовок —
 // на H*.062. При высоте около 480 px эти две доли сходились, и первая строка
 // текста налезала на подзаголовок. Теперь начало карточки не выше, чем
 // подзаголовок плюс 46 px, а высота обрезается, чтобы не наехать на кнопку.
 const x=W*.055,y=lowP?H*.17:Math.max(H*.115,H*.062+46),cardW=W*.89;
 // V105: карточка больше не растягивается на весь экран. Текст стал короткой
 // запиской, и прежняя высота оставляла под ним огромное пустое поле — экран
 // выглядел недоделанным. Теперь высота равна высоте текста, но не больше
 // свободного места до кнопки «НАЗАД».
 const _sz0=Math.max(10,Math.min(15,W/95)),_lh0=_sz0+6,_need=PLAN_TEXT.split('\n').length*_lh0+24,
  cardH=Math.min(lowP?(H-42-H*.17):Math.min(H*.765,H-52-y),Math.max(120,_need));
 roundedRect(ctx,x,y,cardW,cardH,8,'rgba(0,0,0,.55)',null,0);
 ctx.save();ctx.beginPath();ctx.roundRect(x,y,cardW,cardH,8);ctx.clip();
 const sz=Math.max(10,Math.min(15,W/95));
 const lh=sz+6;
 const lines=PLAN_TEXT.split('\n');
 const innerH=cardH-24;
 const maxScroll=Math.max(0,lines.length*lh-innerH);
 G.planScroll=Math.max(0,Math.min(G.planScroll,maxScroll));
 ctx.fillStyle='#c9d0d4';ctx.font=`${sz}px "Inter",Arial,sans-serif`;ctx.textAlign='left';ctx.textBaseline='top';
 let cy=y+12-G.planScroll;
 for(const ln of lines){
   if(cy>=y-30&&cy<y+cardH){
     if(ln.startsWith('===')||ln.startsWith('---')){ctx.fillStyle='#8e99a3';ctx.font=`${sz}px "Inter",Arial,sans-serif`;}
     else if(ln.startsWith('[')){ctx.fillStyle='#d9a44e';ctx.font=`bold ${sz}px "Inter",Arial,sans-serif`;}
     else{ctx.fillStyle='#c9d0d4';ctx.font=`${sz}px "Inter",Arial,sans-serif`;}
     // обёртка длинных строк
     const words=String(ln).split(' ');let line='';
     for(const w of words){const test=line?line+' '+w:w;if(ctx.measureText(test).width>cardW-24&&line){ctx.fillText(line,x+12,cy);cy+=lh;line=w;}else line=test;}
     if(line)ctx.fillText(line,x+12,cy);
   }
   cy+=lh;
 }
 ctx.textBaseline='alphabetic';
 // V87: нижняя строка обрезалась ровно посередине букв — теперь у кромки
 // карточки стоит мягкое затухание, и обрыв текста читается как «есть ещё».
 if(maxScroll>0){const fh=lh+18;
  const fg=ctx.createLinearGradient(0,y+cardH-fh,0,y+cardH);
  fg.addColorStop(0,'rgba(0,0,0,0)');fg.addColorStop(0.55,'rgba(0,0,0,.72)');fg.addColorStop(1,'rgba(0,0,0,.97)');
  ctx.fillStyle=fg;ctx.fillRect(x,y+cardH-fh,cardW,fh);
  if(G.planScroll>2){const tg=ctx.createLinearGradient(0,y,0,y+18);
   tg.addColorStop(0,'rgba(0,0,0,.92)');tg.addColorStop(1,'rgba(0,0,0,0)');
   ctx.fillStyle=tg;ctx.fillRect(x,y,cardW,18);}}
 ctx.restore();
 // полоса прокрутки
 if(maxScroll>0){
   const sbH=Math.max(20,innerH*(innerH/(lines.length*lh)));
   const sbY=y+12+(G.planScroll/maxScroll)*(innerH-sbH);
   ctx.fillStyle='rgba(255,255,255,.12)';ctx.fillRect(x+cardW-8,sbY,4,sbH);
 }
 const backY=lowP?H-34:Math.min(H-48,H*.91);
 button(W*.055,backY,W*.22,lowP?28:38,'НАЗАД');
}
function drawAch(){
 const tt=performance.now()/1000;
 const low=document.body.classList.contains('low-end');
 const ACC=[196,158,72];
 screenBackdrop(ACC);
 const gotN=window.SaveSystem.data.achievements.length;
 drawScrTabs(ACC);
 screenTitle('ДОСТИЖЕНИЯ',menuLow()
  ?('ОТМЕТОК: '+gotN+' / '+ACH_LIST.length+' · В СМЕНАХ: '+fmtPlayTime(window.SaveSystem.data.playSeconds))
  :'ЖУРНАЛ СМЕН // ОТМЕТКИ О ВЫПОЛНЕНИИ',ACC,W*.055,H*.095);
 // V111: список достижений вынесен в общий ACH_LIST — его же использует всплывающее
 // уведомление. Раньше массив лежал только здесь, и добавить ачивку значило править два места.
 const names=ACH_LIST;
 G.achNames=names;
 // V86: было жёстко 2 столбца и карточка не меньше 48 px — на телефоне в ландшафте
 // 9 рядов не влезали в кадр: таблички уезжали за нижний край и наезжали на
 // сводку и кнопки. Теперь при малой высоте сетка 3×6, карточка компактная
 // (только название и статус, без цитаты), а сводка ушла в подзаголовок.
 const lowH=menuLow();
 // V116: сетка опустилась — над ней появился ряд вкладок журнала.
 const cols=lowH?3:2, rowsCount=Math.ceil(names.length/cols), left=W*.055, top=lowH?H*.245:H*.215;
 const gapX=lowH?Math.max(10,W*.016):Math.max(18,W*.028), gapY=lowH?Math.max(4,H*.012):Math.max(10,H*.014);
 const cardW=lowH?(W-left*2-gapX*(cols-1))/cols:Math.min(W*.40,(W-left*2-gapX)/2);
 const footerY=lowH?H-36:H*.91, footerSpace=lowH?10:Math.max(86,H*.13);
 const maxCardH=(footerY-top-footerSpace-gapY*(rowsCount-1))/rowsCount;
 // на 720p порог 48 px тоже был велик: последний ряд подрезала нижняя сводка.
 // V116: над сеткой появился ряд вкладок, места стало меньше — нижний предел
 // высоты карточки снижен, иначе последний ряд уезжал под нижнюю сводку.
 const cardH=lowH?Math.max(22,Math.min(42,maxCardH)):Math.max(32,Math.min(66,maxCardH));
 const hh=(n)=>{const v=Math.sin(n*127.1+Math.floor(n)*0.7913)*43758.5453;return v-Math.floor(v);};
 names.forEach((a,i)=>{
  const col=i%cols,row=Math.floor(i/cols);
  const x=left+col*(cardW+gapX),y=top+row*(cardH+gapY);
  const ok=window.SaveSystem.data.achievements.includes(a[0]);
  const r=Math.min(10,cardH*.22);
  const pl=.5+.5*Math.sin(tt*1.5+i*.6);
  // тёплое свечение вокруг полученной награды
  if(ok){const gg=ctx.createRadialGradient(x+cardW*.5,y+cardH*.5,4,x+cardW*.5,y+cardH*.5,cardW*.62);
   gg.addColorStop(0,`rgba(214,168,74,${(.10+.04*pl).toFixed(3)})`);gg.addColorStop(1,'rgba(214,168,74,0)');
   ctx.fillStyle=gg;ctx.fillRect(x-16,y-14,cardW+32,cardH+28);}
  // табличка
  roundedRect(ctx,x+2,y+4,cardW,cardH,r,'rgba(0,0,0,.42)',null,0);
  const bg=ctx.createLinearGradient(x,y,x,y+cardH);
  if(ok){bg.addColorStop(0,'#39301c');bg.addColorStop(.48,'#241d10');bg.addColorStop(1,'#130f07');}
  else{bg.addColorStop(0,'#1a1f24');bg.addColorStop(.48,'#11151a');bg.addColorStop(1,'#080b0e');}
  roundedRect(ctx,x,y,cardW,cardH,r,bg,null,0);
  // фактура металла и фаска
  ctx.save();ctx.beginPath();
  if(typeof ctx.roundRect==='function')ctx.roundRect(x,y,cardW,cardH,r);else ctx.rect(x,y,cardW,cardH);
  ctx.clip();
  if(!low){for(let k=0;k<Math.round(cardH*.8);k++){const yy=y+1+k*(cardH-2)/Math.round(cardH*.8),v=hh(i*17+k*3.1);
   ctx.fillStyle=v>.62?`rgba(255,255,255,${(0.008+0.014*v).toFixed(3)})`:`rgba(0,0,0,${(0.02+0.04*v).toFixed(3)})`;
   ctx.fillRect(x+1,yy,cardW-2,1);}}
  const sh=ctx.createLinearGradient(x,y,x,y+cardH);
  sh.addColorStop(0,'rgba(255,255,255,.06)');sh.addColorStop(.28,'rgba(255,255,255,0)');
  sh.addColorStop(.74,'rgba(0,0,0,.16)');sh.addColorStop(1,'rgba(0,0,0,.32)');
  ctx.fillStyle=sh;ctx.fillRect(x,y,cardW,cardH);
  if(ok){ // латунный отблеск по диагонали
   const br=ctx.createLinearGradient(x,y,x+cardW,y+cardH);
   br.addColorStop(0,'rgba(255,226,150,.10)');br.addColorStop(.45,'rgba(255,226,150,0)');
   ctx.fillStyle=br;ctx.fillRect(x,y,cardW,cardH);
   // светящаяся полоска слева
   ctx.fillStyle=`rgba(232,196,96,${(.60+.30*pl).toFixed(2)})`;ctx.fillRect(x+4,y+cardH*.22,2,cardH*.56);
  }else{
   // мелкие царапины на закрытой табличке
   if(!low)for(let k=0;k<3;k++){const v=hh(i*29+k*7.7),v2=hh(i*31+k*11.3);
    ctx.strokeStyle=`rgba(190,205,215,${(0.020+0.030*v).toFixed(3)})`;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(x+6+v*(cardW-14),y+4+v2*(cardH-10));
    ctx.lineTo(x+6+v*(cardW-14)+10+v2*18,y+4+v2*(cardH-10)-2+v*5);ctx.stroke();}
   ctx.fillStyle='rgba(120,132,142,.35)';ctx.fillRect(x+4,y+cardH*.30,2,cardH*.40);
  }
  ctx.restore();
  roundedRect(ctx,x,y,cardW,cardH,r,null,ok?`rgba(216,176,86,${(.52+.22*pl).toFixed(2)})`:'rgba(72,86,96,.34)',1.5);
  // заклёпки
  const rr=Math.max(1.5,Math.min(2.4,cardH*.045));
  rivet(x+9,y+9,rr,ok?'#9a7f42':'#68727a');rivet(x+cardW-9,y+9,rr,ok?'#9a7f42':'#68727a');
  rivet(x+9,y+cardH-9,rr,ok?'#9a7f42':'#68727a');rivet(x+cardW-9,y+cardH-9,rr,ok?'#9a7f42':'#68727a');
  // V82: процедурная иконка достижения (уникальная для каждого ачивки)
  const ix=x+(lowH?20:26),iy=y+cardH*.5;
  drawAchievementIcon(ctx,a[0],ix,iy,ok,pl);
  // текст
  const titleSize=lowH?Math.max(9,Math.min(12,cardW/22)):Math.max(11,Math.min(15,W/110));
  const descSize=Math.max(8,Math.min(10,W/150));
  const tx=x+(lowH?38:46);
  if(lowH){
   // компактная карточка: название и статус в одну строку по центру высоты
   ctx.save();ctx.shadowColor='rgba(0,0,0,.75)';ctx.shadowBlur=5;
   text2(ctx,a[1],tx,y+cardH*.62,titleSize,ok?'#f0d68a':'#78828b');
   ctx.restore();
   text2(ctx,ok?'ПОЛУЧЕНО':'ЗАКРЫТО',x+cardW-14,y+cardH*.62,8,ok?'#8fe3ab':'#5a646d','right');
  }else{
  ctx.save();ctx.shadowColor='rgba(0,0,0,.75)';ctx.shadowBlur=5;
  text2(ctx,a[1],tx,y+Math.min(18,cardH*.27),titleSize,ok?'#f0d68a':'#78828b');
  ctx.restore();
  // V82: цитата-философия — обёртка по ширине карточки
  ctx.save();ctx.fillStyle=ok?'#c9d0d4':'#6b757e';
  wrapText(ctx,a[2],tx,y+Math.min(32,cardH*.50),cardW-tx+x-14,Math.max(11,descSize+0.5),descSize);
  ctx.restore();
  text2(ctx,ok?'ПОЛУЧЕНО':'ЗАКРЫТО',x+cardW-16,y+Math.min(18,cardH*.27),9,ok?'#8fe3ab':'#5a646d','right');
  }
  // индикатор-светодиод справа
  const lx2=x+cardW-9,ly2=y+Math.min(21,cardH*.31)-4;
  ctx.save();ctx.globalCompositeOperation='lighter';
  const lg2=ctx.createRadialGradient(lx2,ly2,0,lx2,ly2,7);
  lg2.addColorStop(0,ok?`rgba(120,226,150,${(.55+.25*pl).toFixed(2)})`:'rgba(140,150,160,.18)');
  lg2.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=lg2;ctx.beginPath();ctx.arc(lx2,ly2,7,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.fillStyle=ok?'#8fe3ab':'#3f484f';ctx.beginPath();ctx.arc(lx2,ly2,2.2,0,Math.PI*2);ctx.fill();
 });
 const statY=top+rowsCount*(cardH+gapY)+8;
 const backY=lowH?H-34:Math.min(H-48,footerY);
 if(lowH){
  // На низком экране сводка уже в подзаголовке — остаются только две кнопки.
  button(W*.055,backY,W*.20,28,'НАЗАД');
  return;
 }
 // Нижняя панель не пересекается с карточками.
 // ---- нижняя сводка: полоса прогресса ----
 {const got=window.SaveSystem.data.achievements.length, tot=names.length, fr=got/tot;
  const pbx=W*.055, pby=backY-44, pbw=Math.min(W*.50,W-pbx*2), pbh=8;
  roundedRect(ctx,pbx,pby,pbw,pbh,4,'rgba(6,9,12,.9)','rgba(72,86,96,.45)',1);
  if(fr>0){const fg=ctx.createLinearGradient(pbx,0,pbx+pbw*fr,0);
   fg.addColorStop(0,'rgba(180,140,60,.9)');fg.addColorStop(1,'rgba(240,206,120,.95)');
   roundedRect(ctx,pbx+1,pby+1,Math.max(4,(pbw-2)*fr),pbh-2,3,fg,null,0);
   ctx.save();ctx.globalCompositeOperation='lighter';
   const eg=ctx.createRadialGradient(pbx+pbw*fr,pby+pbh*.5,0,pbx+pbw*fr,pby+pbh*.5,16);
   eg.addColorStop(0,'rgba(255,224,150,.45)');eg.addColorStop(1,'rgba(255,224,150,0)');
   ctx.fillStyle=eg;ctx.beginPath();ctx.arc(pbx+pbw*fr,pby+pbh*.5,16,0,Math.PI*2);ctx.fill();ctx.restore();}
  ctx.save();ctx.shadowColor='rgba(0,0,0,.8)';ctx.shadowBlur=6;
  text2(ctx,'ОТМЕТОК: '+got+' / '+tot,pbx,backY-14,12,'#cbb173');
  text2(ctx,'ВРЕМЯ В СМЕНАХ: '+fmtPlayTime(window.SaveSystem.data.playSeconds),pbx+pbw,backY-14,12,'#8e99a3','right');
  ctx.restore();}
 button(W*.055,backY,W*.22,38,'НАЗАД');
}
// Секунды -> "12 ч 34 м" (или "7 м 12 с" для малых значений).
function fmtPlayTime(sec){
 const s=Math.max(0,Math.floor(Number(sec)||0));
 const h=Math.floor(s/3600),m=Math.floor((s%3600)/60);
 // V83: сокращения единиц времени тоже зависят от языка интерфейса,
 // иначе в английской версии оставалось русское «с».
 const U=(window.I18N&&window.I18N.lang&&window.I18N.lang!=='ru')?{h:'h',m:'m',s:'s'}:{h:'ч',m:'м',s:'с'};
 if(h>0)return h+' '+U.h+' '+String(m).padStart(2,'0')+' '+U.m;
 if(m>0)return m+' '+U.m+' '+String(s%60).padStart(2,'0')+' '+U.s;
 return s+' '+U.s;
}
// ===== V115: ТОП ИГРОКОВ. РАБОТАЕТ НА itch.io =====
// ПОЧЕМУ ТАК БЫЛО: старая таблица жила на лидербордах Яндекс Игр. Вне Яндекса она
// показывала одну строку и надпись «рейтинг доступен на Яндекс Играх», то есть на
// itch.io была бесполезна: там нет ни игрового SDK, ни сервера, ни аккаунтов —
// страница это просто статические файлы в iframe.
// СТАЛО: таблица двухслойная и пустой не бывает никогда.
//   1) Локальный слой — список законченных смен в localStorage. Работает всегда,
//      включая itch.io и просто открытый с диска index.html.
//   2) Общий слой — таблица площадки через Playgama Bridge, если площадка это
//      умеет. Включается сам, строки помечаются как глобальные.
// Две вкладки: по счёту и по времени, проведённому в смене.
const LB_TABS=[['score','ПО СЧЁТУ'],['time','ПО ВРЕМЕНИ']];

// Одна законченная смена -> в локальную таблицу. Вызывается и при победе, и при
// смерти: список рекордов должен помнить любую доигранную смену, а не только
// удачные, иначе таблица у большинства игроков осталась бы пустой.
function recordRun(completed=false){
 try{
  const d=window.SaveSystem.data;
  if(!Array.isArray(d.runs))d.runs=[];
  const sec=Math.floor(Math.max(0,G.runSec||0));
  const sc=Math.floor(Math.max(0,G.score||0));
  if(sec<5&&sc<5)return;                       // случайный вход-выход не пишем
  const check=window.NSAC?.validate({s:sc,t:sec,n:G.night|0})||{ok:true,flags:[]};
  const verified=!!check.ok&&!G.securityTainted;
  d.lastRunValidation={ok:verified,flags:check.flags||[],at:Date.now()};
  if(!verified){d.tamperCount=(Number(d.tamperCount)||0)+1;window.SaveSystem.save();window.NSAC?.finish();return;}
  d.runs.push({s:sc,t:sec,n:G.night|0,d:Date.now(),v:1});
  // Держим только 40 лучших по счёту: список не должен расти бесконечно и
  // раздувать сохранение.
  d.runs.sort((a,b)=>(b.s|0)-(a.s|0));
  if(d.runs.length>40)d.runs.length=40;
  window.SaveSystem.save();
  const bestS=Math.max(sc,d.bestScore||0), bestT=Math.max(sec,...d.runs.map(r=>r.t|0));
  // Общая таблица площадки (Playgama Bridge), если игра открыта на портале.
  window.Platform?.lbSet?.('score',bestS);
  window.Platform?.lbSet?.('time',bestT);
  // V116: интернет-таблица LootLocker — работает на itch.io и вообще везде.
  // Вместе со счётом уезжает профиль: ник, аватар и статистика, из них
  // собирается карточка игрока в таблице.
  if(completed&&verified&&window.NetLB?.enabled?.()&&profile().online!==false){
   const meta=runMeta(bestS,bestT);
   window.NetLB.setName(meta.n);
   // V117.1: backend receives the actual session token and validates the
   // player before forwarding the score to LootLocker Server API.
   window.NetLB.submit('score',bestS,{...meta,t:bestT,night:G.night|0,completed:true,flags:[]});
   window.NetLB.submit('time',bestT,{...meta,s:bestS,t:bestT,night:G.night|0,completed:true,flags:[]});
  }
 }catch(e){console.warn('recordRun:',e)}
}

// Локальные строки для выбранной вкладки.
function localRows(kind){
 const d=window.SaveSystem.data;
 const runs=(Array.isArray(d.runs)?d.runs:[]).slice();
 runs.sort(kind==='time'?((a,b)=>(b.t|0)-(a.t|0)):((a,b)=>(b.s|0)-(a.s|0)));
 const p=profile(),d2=window.SaveSystem.data;
 return runs.slice(0,10).map((r,i)=>({
  rank:i+1,
  name:'СМЕНА '+(r.n||1)+' · '+new Date(r.d||0).toLocaleDateString(),
  score:r.s|0, seconds:r.t|0, you:i===0, global:false,
  avatar:p.avatar|0,
  // V116: метаданные локальной строки собираются на месте — карточка забега
  // открывается так же, как карточка игрока из интернет-таблицы.
  meta:{n:p.name,a:p.avatar|0,s:r.s|0,t:r.t|0,ni:r.n||1,
        ac:(d2.achievements||[]).length,de:d2.deaths|0,pt:d2.playSeconds|0,se:(d2.secrets||[]).length,
        ru:runs.length,v:d2.lastRunValidation?.ok!==false,ts:r.d||0}
 }));
}

function openLeaders(){
 G.state='leaders';
 closeNameEdit(false);   // V116: уходим с профиля — скрытое поле ввода не должно остаться
 G.lbCard=null;
 const tab=(G.leaders&&G.leaders.tab)||'score';
 G.leaders={tab,loading:true,rows:null,global:false};
 window.SaveSystem.save();
 loadLeaders(tab);
}

// Локальные строки показываются сразу, без ожидания сети. Если площадка отдаст
// общую таблицу — строки заменятся на неё. Так экран не мигает пустотой.
function loadLeaders(tab){
 const local=localRows(tab);
 G.leaders={tab,loading:false,rows:local,global:false,src:'local'};
 G.lbRowHover=-1;G.lbCard=null;
 // V116: три источника по приоритету. Интернет-таблица LootLocker важнее всех:
 // только она даёт общий список игроков на itch.io. Если её нет или сеть молчит,
 // берём таблицу площадки, а на самый худой конец — локальные забеги. Экран при
 // этом не мигает пустотой: локальные строки показаны сразу.
 const net=window.NetLB?.enabled?.();
 const bridge=window.Platform?.lbReady?.();
 if(!net&&!bridge)return;
 G.leaders.loading=true;
 const fetchRows=net
   ? Promise.resolve(window.NetLB.top(tab,25)).then(r=>({rows:r,src:'net'}))
       .catch(()=>({rows:null,src:'net'}))
   : Promise.resolve(null);
 fetchRows.then(res=>{
   if(!G.leaders||G.leaders.tab!==tab)return null;   // игрок успел переключить вкладку
   if(res&&res.rows&&res.rows.length){
    G.leaders={tab,loading:false,rows:res.rows,global:true,src:'net'};
    return null;
   }
   if(!bridge){G.leaders={tab,loading:false,rows:local,global:false,src:net?'net-fail':'local'};return null}
   return Promise.resolve(window.Platform.lbTop(tab,10)).catch(()=>null);
 }).then(rows=>{
   if(rows===null||!G.leaders||G.leaders.tab!==tab)return;
   const ok=rows&&rows.length;
   G.leaders={tab,loading:false,rows:ok?rows:local,global:!!ok,src:ok?'bridge':'local'};
 }).catch(()=>{
   if(G.leaders&&G.leaders.tab===tab)G.leaders={tab,loading:false,rows:local,global:false,src:'local'};
 });
}

// Подпись под таблицей: игрок должен понимать, что именно он видит.
function lbSourceLabel(L){
 const src=L&&L.src;
 if(src==='net')return 'ОБЩАЯ ИНТЕРНЕТ-ТАБЛИЦА · ИГРОКИ СО ВСЕГО МИРА';
 if(src==='bridge')return 'ОБЩАЯ ТАБЛИЦА ПЛОЩАДКИ';
 if(src==='net-fail')return 'НЕТ СВЯЗИ С ОБЩЕЙ ТАБЛИЦЕЙ · РЕЗУЛЬТАТЫ ЭТОГО УСТРОЙСТВА';
 return 'РЕЗУЛЬТАТЫ НА ЭТОМ УСТРОЙСТВЕ';
}

function lbTabRects(){
 if(G.state!=='leaders')return [];
 const lowL=menuLow();
 // На низких экранах подвкладки «ПО СЧЁТУ/ПО ВРЕМЕНИ» налезали на ряд вкладок
 // журнала — опускаем их сильнее.
 const left=W*.055, top=lowL?H*.238:H*.196;
 const bw=Math.min(W*.19,150), bh=lowL?20:26, gap=8;
 return LB_TABS.map((t,i)=>({x:left+i*(bw+gap),y:top,w:bw,h:bh,key:t[0],label:t[1]}));
}

function drawLeaders(){
 const tt=performance.now()/1000;
 const low=document.body.classList.contains('low-end');
 const ACC=[86,150,178];
 screenBackdrop(ACC,0.68);
 const lowL=menuLow();
 const L=G.leaders||{tab:'score',loading:true};
 const kind=L.tab||'score';
 screenTitle('ТОП ИГРОКОВ',lowL?'':(kind==='time'
   ?'ПО ВРЕМЕНИ, ПРОВЕДЁННОМУ В ОДНОЙ СМЕНЕ'
   :'ПО СЧЁТУ ЗА ОДНУ СМЕНУ'),ACC,W*.055,H*.095);
 drawScrTabs(ACC);
 // ---- вкладки ----
 lbTabRects().forEach(r=>{
  const on=r.key===kind;
  const hov=G.lbHover===r.key;
  roundedRect(ctx,r.x,r.y,r.w,r.h,4,
   on?'rgba(86,150,178,.26)':(hov?'rgba(86,150,178,.12)':'rgba(10,16,20,.72)'),
   on?'rgba(140,210,235,.85)':'rgba(86,150,178,.35)',on?1.6:1);
  text2(ctx,r.label,r.x+r.w*.5,r.y+r.h*.5+4,lowL?9:11,on?'#dff0f7':'#8ea0ab','center');
 });
 const left=W*.055,top=lowL?H*.310:H*.262,wid=Math.min(W*.62,W-left*2);
 const rowH=lowL?Math.max(15,Math.min(40,(H-40-H*.310)/11.4)):Math.max(26,Math.min(36,(H*.560)/11));
 const panH=rowH*11.4;
 panel2(left,top,wid,panH,ACC,true);
 rivet(left+11,top+11,2.4,'#5d6a72');rivet(left+wid-11,top+11,2.4,'#5d6a72');
 rivet(left+11,top+panH-11,2.4,'#5d6a72');rivet(left+wid-11,top+panH-11,2.4,'#5d6a72');
 ctx.save();
 ctx.beginPath();
 if(typeof ctx.roundRect==='function')ctx.roundRect(left,top,wid,panH,12);else ctx.rect(left,top,wid,panH);
 ctx.clip();
 const ph=ctx.createLinearGradient(0,top,0,top+panH);
 ph.addColorStop(0,'rgba(86,150,178,.10)');ph.addColorStop(.5,'rgba(86,150,178,.02)');ph.addColorStop(1,'rgba(86,150,178,0)');
 ctx.fillStyle=ph;ctx.fillRect(left,top,wid,panH);
 for(let k=0;k<10;k++){if(k%2)continue;
  ctx.fillStyle='rgba(255,255,255,.016)';
  ctx.fillRect(left+6,top+rowH*(1.10+k),wid-12,rowH*.92);}
 if(!low)for(let y=top;y<top+panH;y+=3){ctx.fillStyle=(y-top)%6?'rgba(0,0,0,.10)':'rgba(120,190,215,.015)';ctx.fillRect(left,y,wid,1);}
 ctx.restore();
 // ---- шапка ----
 ctx.save();ctx.shadowColor='rgba(0,0,0,.8)';ctx.shadowBlur=5;
 text2(ctx,'#',left+22,top+rowH*.66,11,'#7f8f99');
 text2(ctx,L.global?'ИГРОК':'ЗАБЕГ',left+62,top+rowH*.66,11,'#7f8f99');
 text2(ctx,kind==='time'?'ВРЕМЯ В СМЕНЕ':'СЧЁТ',left+wid-20,top+rowH*.66,11,'#7f8f99','right');
 ctx.restore();
 {const hg=ctx.createLinearGradient(left+14,0,left+wid-14,0);
  hg.addColorStop(0,'rgba(120,190,215,.45)');hg.addColorStop(1,'rgba(120,190,215,.05)');
  ctx.fillStyle=hg;ctx.fillRect(left+14,top+rowH*.90,wid-28,1);}
 const badge=(bx,by,place,c1,c2)=>{
  const pl=.5+.5*Math.sin(tt*1.7+place);
  ctx.save();ctx.globalCompositeOperation='lighter';
  const gg=ctx.createRadialGradient(bx,by,0,bx,by,15);
  gg.addColorStop(0,`rgba(${c1},${(.26+.12*pl).toFixed(3)})`);gg.addColorStop(1,`rgba(${c1},0)`);
  ctx.fillStyle=gg;ctx.beginPath();ctx.arc(bx,by,15,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.fillStyle=`rgb(${c2})`;ctx.beginPath();ctx.arc(bx,by,9,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=`rgb(${c1})`;ctx.beginPath();ctx.arc(bx,by,6.6,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(12,16,20,.85)';ctx.font='800 10px "Inter",Arial,sans-serif';ctx.textAlign='center';
  ctx.fillText(String(place),bx,by+3.6);ctx.textAlign='left';
 };
 const rows=L.rows||[];
 // V116: прямоугольники строк — по ним открывается карточка профиля игрока.
 G.lbRowRects=[];
 if(rows.length){
  rows.slice(0,10).forEach((r,i)=>{
   const y=top+rowH*(1.62+i);
   G.lbRowRects.push({x:left+8,y:y-rowH*.52,w:wid-16,h:rowH*.88,row:r});
   const hovR=G.lbRowHover===i;
   if(hovR&&!r.you){roundedRect(ctx,left+8,y-rowH*.52,wid-16,rowH*.88,5,'rgba(86,150,178,.10)','rgba(120,190,215,.35)',1);}
   const top3=i<3;
   if(r.you){
    const gy=y-rowH*.52;
    const gg=ctx.createLinearGradient(left+8,0,left+wid-8,0);
    gg.addColorStop(0,'rgba(150,40,52,.55)');gg.addColorStop(1,'rgba(94,24,32,.22)');
    roundedRect(ctx,left+8,gy,wid-16,rowH*.88,5,gg,'rgba(209,72,85,.85)',1.5);
    ctx.fillStyle='rgba(255,140,150,.85)';ctx.fillRect(left+10,gy+3,2,rowH*.88-6);
   }
   const c=r.you?'#ffd9dd':(i===0?'#f0d68a':i===1?'#dfe6ec':i===2?'#dba272':'#c3ccd3');
   if(top3){
    badge(left+24,y-1,r.rank||i+1,i===0?'232,200,110':i===1?'214,226,236':'204,146,92',
                                  i===0?'138,108,40':i===1?'112,126,138':'112,72,40');
   }else{
    ctx.save();ctx.font='700 13px "JetBrains Mono",monospace';ctx.fillStyle=c;
    ctx.textAlign='center';ctx.fillText(String(r.rank||i+1),left+24,y+4);ctx.textAlign='left';ctx.restore();
   }
   const name=String(r.name||'АНОНИМ');
   // V116: у каждой строки свой аватар — таблица читается как список людей.
   const avS=Math.min(rowH*.74,21);
   drawAvatarIcon(ctx,r.avatar|0,left+44,y-avS*.72,avS);
   ctx.save();ctx.shadowColor='rgba(0,0,0,.8)';ctx.shadowBlur=5;
   const nmMax=lowL?18:22;
   text2(ctx,name.length>nmMax?name.slice(0,nmMax-1)+'…':name,left+52+avS,y+4,lowL?11:13,c);
   ctx.restore();
   ctx.save();ctx.font='700 13px "JetBrains Mono",monospace';ctx.fillStyle=c;
   ctx.textAlign='right';
   ctx.fillText(kind==='time'?fmtPlayTime(r.seconds):String(r.score|0),left+wid-20,y+4);
   ctx.textAlign='left';ctx.restore();
   if(i<9){ctx.fillStyle='rgba(120,150,170,.07)';ctx.fillRect(left+18,y+rowH*.36,wid-36,1);}
  });
 } else if(L.loading){
  const dots='.'.repeat(1+Math.floor(tt*2)%3);
  ctx.save();ctx.globalAlpha=.65+.35*Math.abs(Math.sin(tt*1.8));
  text2(ctx,'ЗАГРУЗКА РЕЙТИНГА'+dots,left+wid*.5,top+rowH*3.4,15,'#9fb2bd','center');
  ctx.restore();
 } else {
  // Смен ещё не было — объясняем, как попасть в таблицу, вместо пустого табло.
  const nx=left+wid*.5, ny=top+rowH*3.6;
  ctx.save();ctx.globalAlpha=.55+.30*Math.abs(Math.sin(tt*1.4));
  const ng=ctx.createRadialGradient(nx,ny,2,nx,ny,wid*.30);
  ng.addColorStop(0,'rgba(86,150,178,.16)');ng.addColorStop(1,'rgba(86,150,178,0)');
  ctx.fillStyle=ng;ctx.beginPath();ctx.arc(nx,ny,wid*.30,0,Math.PI*2);ctx.fill();ctx.restore();
  text2(ctx,'ТАБЛИЦА ПУСТА',nx,ny,15,'#9fb2bd','center');
  text2(ctx,'ДОИГРАЙТЕ ЛЮБУЮ СМЕНУ ДО КОНЦА — РЕЗУЛЬТАТ ПОПАДЁТ СЮДА',nx,ny+rowH*.95,11,'#75838d','center');
 }
 // ---- нижняя строка ----
 const backY=lowL?H-34:Math.min(H-48,H*.91);
 if(!lowL){ctx.save();ctx.shadowColor='rgba(0,0,0,.8)';ctx.shadowBlur=6;
  const d=window.SaveSystem.data;
  text2(ctx,'РЕКОРД: '+(d.bestScore|0)+'   ·   ВСЕГО В СМЕНАХ: '+fmtPlayTime(d.playSeconds||0),left,backY-18,12,'#9fb2bd');
  text2(ctx,lbSourceLabel(L),left+wid,backY-18,11,'#6d7b85','right');
  text2(ctx,L.global?'НАЖМИТЕ НА СТРОКУ — ПРОФИЛЬ ИГРОКА':'НАЖМИТЕ НА СТРОКУ — ПОДРОБНОСТИ ЗАБЕГА',left,backY-36,10,'#5f6c75');
  ctx.restore();}
 button(left,backY,W*.22,lowL?28:38,'НАЗАД');
}
// ===== V116: ОБЩИЕ ВКЛАДКИ ЖУРНАЛА + ПРОФИЛЬ ИГРОКА =====
// ПОЧЕМУ ТАК БЫЛО: «ТОП ИГРОКОВ» был отдельным пунктом главного меню, а профиля
// не было вовсе — в таблице стояли безымянные «СМЕНА 3 · дата», и посмотреть,
// кто это, было нельзя.
// СТАЛО: из главного меню пункт убран. Достижения, топ и профиль — три вкладки
// одного журнала: заходишь в «ДОСТИЖЕНИЯ» и переключаешься внутри. По строке
// топа можно нажать и открыть карточку профиля этого игрока.
const SCR_TABS=[['ach','ДОСТИЖЕНИЯ'],['leaders','ТОП ИГРОКОВ'],['profile','ПРОФИЛЬ']];

function scrTabRects(){
 const lowL=menuLow();
 // ПОЧЕМУ ТАК: ряд вкладок стоит ниже подзаголовка экрана, иначе он налезал
 // на строку «КАРТОЧКА ОХРАННИКА // ...» и текст читался кашей.
 const left=W*.055, top=lowL?H*.158:H*.148;
 const bw=Math.min(W*.205,164), bh=lowL?21:26, gap=7;
 return SCR_TABS.map((t,i)=>({x:left+i*(bw+gap),y:top,w:bw,h:bh,key:t[0],label:t[1]}));
}

function drawScrTabs(acc){
 const lowL=menuLow(), cur=G.state, A=acc||[196,158,72];
 const rgb=A[0]+','+A[1]+','+A[2];
 scrTabRects().forEach(r=>{
  const on=r.key===cur, hov=G.scrHover===r.key;
  roundedRect(ctx,r.x,r.y,r.w,r.h,4,
   on?`rgba(${rgb},.26)`:(hov?`rgba(${rgb},.13)`:'rgba(10,14,18,.74)'),
   on?`rgba(${rgb},.9)`:`rgba(${rgb},.34)`,on?1.6:1);
  if(on){ // маленькая метка активной вкладки слева
   ctx.fillStyle=`rgba(${rgb},.9)`;ctx.fillRect(r.x+4,r.y+5,2,r.h-10);
  }
  text2(ctx,r.label,r.x+r.w*.5,r.y+r.h*.5+3.5,lowL?9:11,on?'#eef4f8':'#8b98a2','center');
 });
}

// true, если клик попал по вкладке (тогда вызывающий код дальше не идёт).
function scrTabsClick(x,y){
 for(const r of scrTabRects()){
  if(!hitRect(x,y,r.x,r.y,r.w,r.h))continue;
  if(r.key!==G.state){
   window.AudioFX.play('click');
   if(r.key==='ach'){G.state='ach';G.lbCard=null;closeNameEdit(false)}
   else if(r.key==='leaders'){openLeaders()}
   else openProfile();
  }
  return true;
 }
 return false;
}

// ---------- ПРОФИЛЬ ----------
// Ник по умолчанию считается из постоянного гостевого идентификатора, поэтому
// он не меняется при каждом запуске и совпадает с ником в общей таблице.
function defaultNick(){
 let seed=0;
 const id=String((window.NetLB&&window.NetLB.ident&&window.NetLB.ident())||'');
 for(let i=0;i<id.length;i++)seed=(seed*31+id.charCodeAt(i))>>>0;
 if(!id)seed=Math.floor(Math.random()*1e9);
 return 'ОХРАННИК-'+String(1000+seed%9000);
}

function profile(){
 const d=window.SaveSystem.data;
 if(!d.profile||typeof d.profile!=='object')d.profile={name:'',avatar:0,online:true};
 if(!d.profile.name){d.profile.name=defaultNick();window.SaveSystem.save()}
 d.profile.avatar=Math.max(0,Math.min(AVATARS.length-1,d.profile.avatar|0));
 if(d.profile.online===undefined)d.profile.online=true;
 return d.profile;
}

// Пиксельные аватары 8×8. Цифра в строке — номер цвета из палитры, точка — прозрачно.
const AVATARS=[
 {n:'ФУРАЖКА',pal:['#2b3a4a','#4d6a80','#161e27','#d9c08a'],px:[
  '..1111..','.114411.','11144111','11111111','33333333','.333333.','........','........']},
 {n:'ФОНАРЬ',pal:['#3d4a55','#ffe9a8','#8a949c','#fff3c4'],px:[
  '.....22.','....2224','11112224','13312224','11112224','....2224','.....22.','........']},
 {n:'КОФЕ',pal:['#d5d9dc','#6b3a20','#9aa4ab','#ffffff'],px:[
  '........','.111111.','.1222211','.122221.','.111111.','.1111113','..1111..','........']},
 {n:'ПИЦЦА',pal:['#c98a3c','#f0c878','#b03a2e','#8a5a22'],px:[
  '...11...','..1221..','..1231..','.122221.','.123221.','12222221','11111111','........']},
 {n:'РАЦИЯ',pal:['#2f3a44','#7c8a95','#cfd6db','#d1484f'],px:[
  '......3.','...1113.','..111143','..122211','..122211','..111111','..111111','........']},
 {n:'КАМЕРА',pal:['#2b3540','#6fb0c8','#dff0f7','#d1484f'],px:[
  '...111..','.1111114','11222211','11233211','11222211','11111111','.111111.','........']}
];

function drawAvatarIcon(c,idx,x,y,size){
 const a=AVATARS[Math.max(0,Math.min(AVATARS.length-1,idx|0))];
 const s=size/8;
 for(let r=0;r<8;r++){
  const row=a.px[r]||'';
  for(let q=0;q<8;q++){
   const ch=row[q];
   if(!ch||ch==='.')continue;
   c.fillStyle=a.pal[(+ch)-1]||'#888';
   c.fillRect(Math.round(x+q*s),Math.round(y+r*s),Math.ceil(s),Math.ceil(s));
  }
 }
}

function openProfile(){
 G.state='profile';G.lbCard=null;
 profile();
 // Ранг в общей таблице показываем, если сеть настроена.
 if(window.NetLB&&window.NetLB.enabled()){
  G.profNet={loading:true,rank:0};
  Promise.resolve(window.NetLB.top('score',50)).then(rows=>{
   if(G.state!=='profile'&&!G.profNet)return;
   const me=(rows||[]).find(r=>r.you);
   G.profNet={loading:false,rank:me?me.rank:0,total:(rows||[]).length};
  }).catch(()=>{G.profNet={loading:false,rank:0}});
 }else G.profNet=null;
}

// ---------- РЕДАКТИРОВАНИЕ НИКА ----------
// ПОЧЕМУ ТАК: игра рисуется на canvas, у него нет полей ввода. Поэтому под
// курсором создаётся невидимый <input> — он даёт и обычный ввод с клавиатуры,
// и экранную клавиатуру на телефоне, а canvas просто рисует его значение.
function nickInput(){return document.getElementById('nick-input')}

function openNameEdit(){
 const p=profile();
 G.nameEdit={buf:p.name};
 let el=nickInput();
 if(!el){
  el=document.createElement('input');
  el.id='nick-input';el.type='text';el.maxLength=16;
  el.autocomplete='off';el.spellcheck=false;
  el.setAttribute('aria-label','Ник игрока');
  el.style.cssText='position:fixed;left:50%;top:50%;width:2px;height:2px;opacity:.01;'+
   'border:0;padding:0;background:transparent;color:transparent;z-index:50;';
  document.body.appendChild(el);
  el.addEventListener('input',()=>{
   const v=sanitizeNick(el.value);
   if(v!==el.value)el.value=v;
   if(G.nameEdit)G.nameEdit.buf=v;
  });
  el.addEventListener('keydown',ev=>{
   if(ev.key==='Enter'){ev.preventDefault();closeNameEdit(true)}
   else if(ev.key==='Escape'){ev.preventDefault();closeNameEdit(false)}
  });
 }
 el.value=p.name;
 // ПОЧЕМУ ОТЛОЖЕННО: фокус ставится не сразу, а на следующем кадре. Нажатие по
 // кнопке приходит из обработчика мыши на canvas, и браузер после него доводит
 // своё действие по умолчанию до конца — фокус, поставленный внутри того же
 // события, тут же слетал на <body>, и ник не набирался.
 // Текст выделяется целиком: игрок начинает печатать и старый ник заменяется.
 const focus=()=>{try{el.focus({preventScroll:true});el.setSelectionRange(0,el.value.length)}catch(e){}};
 focus();
 requestAnimationFrame(()=>{focus();setTimeout(focus,60)});
}

function sanitizeNick(v){
 return String(v||'').toUpperCase()
  .replace(/[^A-ZА-ЯЁ0-9 _.\-]/g,'')
  .replace(/\s{2,}/g,' ')
  .slice(0,16);
}

function closeNameEdit(commit){
 const el=nickInput();
 if(commit&&G.nameEdit){
  const v=sanitizeNick(G.nameEdit.buf).trim();
  const p=profile();
  if(v&&v!==p.name){
   p.name=v;window.SaveSystem.save();
   submitProfile();
   window.AudioFX.play('click',.4,{group:'ui'});
  }
 }
 G.nameEdit=null;
 if(el){try{el.blur()}catch(e){} el.remove()}
}

// Ник и аватар едут на сервер вместе с лучшим результатом: иначе в общей
// таблице у игрока осталось бы старое имя до следующей доигранной смены.
function submitProfile(){
 if(!(window.NetLB&&window.NetLB.enabled()))return;
 const p=profile();
 if(p.online===false)return;
 const d=window.SaveSystem.data;
 const runs=Array.isArray(d.runs)?d.runs:[];
 const bestS=Math.max(0,d.bestScore|0,...runs.map(r=>r.s|0));
 const bestT=Math.max(0,...runs.map(r=>r.t|0));
 window.NetLB.setName(p.name);
 if(bestS>0)window.NetLB.submit('score',bestS,runMeta(bestS,bestT));
 if(bestT>0)window.NetLB.submit('time',bestT,runMeta(bestS,bestT));
}

function runMeta(sc,sec){
 const d=window.SaveSystem.data,p=profile();
 return {
  g:String((window.NetLB&&window.NetLB.ident&&window.NetLB.ident())||''),
  n:p.name,a:p.avatar|0,
  s:sc|0,t:sec|0,ni:G.night|0,
  ac:(d.achievements||[]).length,de:d.deaths|0,pt:d.playSeconds|0,
  ru:(Array.isArray(d.runs)?d.runs.length:0),se:(d.secrets||[]).length,tc:d.tamperCount|0,v:d.lastRunValidation?.ok!==false,ts:Date.now()
 };
}

// ---------- ЭКРАН ПРОФИЛЯ ----------
function profRects(){
 const lowL=menuLow();
 const left=W*.055, top=lowL?H*.215:H*.215;
 const wid=Math.min(W*.62,W-left*2);
 const cardH=lowL?H*.20:H*.24;
 const avS=lowL?Math.min(56,cardH*.62):Math.min(84,cardH*.62);
 const rects={
  card:{x:left,y:top,w:wid,h:cardH},
  av:{x:left+18,y:top+(cardH-avS)/2,w:avS,h:avS},
  rename:{x:left+18+avS+16,y:top+cardH*.55,w:Math.min(150,wid*.30),h:lowL?22:26},
  online:{x:left+18+avS+16+Math.min(150,wid*.30)+10,y:top+cardH*.55,w:Math.min(150,wid*.30),h:lowL?22:26},
  picks:[],
  stats:{x:left,y:top+cardH+(lowL?8:14),w:wid,h:0},
  back:{x:left,y:lowL?H-34:Math.min(H-48,H*.91),w:W*.22,h:lowL?28:38}
 };
 const ps=lowL?24:30, pg=lowL?6:8;
 // На низких экранах подпись «АВАТАР» налезала на последнюю строку статистики,
 // поэтому ряд аватаров там опущен сильнее.
 const px0=left+18, py0=rects.stats.y+ (lowL?H*.200:H*.140);
 rects.stats.h=(lowL?H*.160:H*.135);
 for(let i=0;i<AVATARS.length;i++)rects.picks.push({x:px0+i*(ps+pg),y:py0,w:ps,h:ps,idx:i});
 return rects;
}

function drawProfile(){
 const tt=performance.now()/1000;
 const ACC=[196,158,72];
 screenBackdrop(ACC,0.62);
 const lowL=menuLow();
 const d=window.SaveSystem.data,p=profile();
 screenTitle('ПРОФИЛЬ',lowL?'':'КАРТОЧКА ОХРАННИКА // ДАННЫЕ ДЛЯ ОБЩЕЙ ТАБЛИЦЫ',ACC,W*.055,H*.095);
 drawScrTabs(ACC);
 const R=profRects();
 // ---- карточка ----
 panel2(R.card.x,R.card.y,R.card.w,R.card.h,ACC,true);
 rivet(R.card.x+11,R.card.y+11,2.4,'#5d6a72');rivet(R.card.x+R.card.w-11,R.card.y+11,2.4,'#5d6a72');
 rivet(R.card.x+11,R.card.y+R.card.h-11,2.4,'#5d6a72');rivet(R.card.x+R.card.w-11,R.card.y+R.card.h-11,2.4,'#5d6a72');
 // рамка аватара
 roundedRect(ctx,R.av.x-6,R.av.y-6,R.av.w+12,R.av.h+12,6,'rgba(8,12,16,.85)','rgba(196,158,72,.45)',1.4);
 drawAvatarIcon(ctx,p.avatar,R.av.x,R.av.y,R.av.w);
 // ник (или редактирование)
 const nx=R.av.x+R.av.w+22, ny=R.card.y+R.card.h*.34;
 const editing=!!G.nameEdit;
 const shown=editing?(G.nameEdit.buf||''):p.name;
 ctx.save();ctx.shadowColor='rgba(0,0,0,.85)';ctx.shadowBlur=6;
 text2(ctx,'ПОЗЫВНОЙ',nx,ny-(lowL?16:22),lowL?9:10,'#8b7a4c');
 const caret=editing&&(Math.floor(tt*2)%2===0)?'_':'';
 text2(ctx,(shown||'—')+caret,nx,ny+(lowL?4:6),lowL?15:20,editing?'#ffe9b0':'#e8eef2');
 ctx.restore();
 if(editing){
  text2(ctx,'ENTER — СОХРАНИТЬ · ESC — ОТМЕНА',nx,ny+(lowL?18:26),lowL?8:10,'#8b98a2');
 }
 button(R.rename.x,R.rename.y,R.rename.w,R.rename.h,editing?'СОХРАНИТЬ':'ИЗМЕНИТЬ ИМЯ');
 // ПОЧЕМУ НЕ button(): у обычной кнопки «активное» состояние красное, и
 // включённый онлайн выглядел как ошибка. Свой переключатель: зелёный — включено,
 // серый — выключено.
 {
  const o=!!p.online, r=R.online;
  const hovO=hitRect(G.mouse.x*W,G.mouse.y*H,r.x,r.y,r.w,r.h);
  roundedRect(ctx,r.x+2,r.y+3,r.w,r.h,6,'rgba(0,0,0,.40)',null,0);
  roundedRect(ctx,r.x,r.y,r.w,r.h,6,
   o?(hovO?'rgba(60,132,88,.55)':'rgba(46,104,70,.45)'):(hovO?'rgba(40,50,58,.9)':'rgba(20,26,31,.9)'),
   o?'rgba(143,227,171,.75)':'rgba(120,130,140,.35)',1.4);
  const dot=r.y+r.h*.5;
  ctx.beginPath();ctx.arc(r.x+13,dot,3.6,0,6.283);
  ctx.fillStyle=o?'#8fe3ab':'#5d6a72';ctx.fill();
  if(o){ctx.save();ctx.shadowColor='rgba(143,227,171,.9)';ctx.shadowBlur=8;ctx.fill();ctx.restore()}
  text2(ctx,o?'ОНЛАЙН: ВКЛ':'ОНЛАЙН: ВЫКЛ',r.x+24,dot+3.5,lowL?9:10.5,o?'#d8f5e2':'#8b98a2');
 }
 // ---- выбор аватара ----
 text2(ctx,'АВАТАР',R.picks[0].x,R.picks[0].y-(lowL?7:9),lowL?9:10,'#8b7a4c');
 R.picks.forEach(r=>{
  const on=r.idx===(p.avatar|0), hov=G.avaHover===r.idx;
  roundedRect(ctx,r.x,r.y,r.w,r.h,5,
   on?'rgba(196,158,72,.22)':(hov?'rgba(196,158,72,.10)':'rgba(8,12,16,.8)'),
   on?'rgba(240,206,120,.9)':'rgba(120,130,140,.32)',on?1.6:1);
  drawAvatarIcon(ctx,r.idx,r.x+r.w*.16,r.y+r.h*.16,r.w*.68);
 });
 // Пояснение: игрок должен понимать, что попадает в общую таблицу и что видят
 // другие. Без этой строки экран выглядел пустым и непонятным.
 if(!lowL){
  const hy=R.picks[0].y+R.picks[0].h+26;
  ctx.save();ctx.fillStyle='#77848d';ctx.textBaseline='top';
  // ПОЧЕМУ T() ВРУЧНУЮ: wrapText печатает текст построчно, и автоперевод по
  // целой строке не срабатывал — подсказка оставалась русской в других языках.
  wrapText(ctx,(window.T?window.T('ПОЗЫВНОЙ И АВАТАР ВИДЯТ ВСЕ ИГРОКИ В ОБЩЕЙ ТАБЛИЦЕ. НАЖМИТЕ НА ЛЮБУЮ СТРОКУ ВО ВКЛАДКЕ «ТОП ИГРОКОВ» — ОТКРОЕТСЯ КАРТОЧКА ТОГО ОХРАННИКА: ЕГО СЧЁТ, ВРЕМЯ СМЕНЫ, ДОСТИЖЕНИЯ И СМЕРТИ.'):'ПОЗЫВНОЙ И АВАТАР ВИДЯТ ВСЕ ИГРОКИ В ОБЩЕЙ ТАБЛИЦЕ.'),
   R.picks[0].x,hy,Math.min(R.card.w-36,W*.52),15,10.5);
  ctx.restore();ctx.textBaseline='alphabetic';
 }
 // ---- статистика ----
 const runs=Array.isArray(d.runs)?d.runs:[];
 const bestT=Math.max(0,...runs.map(r=>r.t|0));
 const net=window.NetLB&&window.NetLB.enabled();
 const rankTxt=!net?'—':(G.profNet&&G.profNet.loading?'…':((G.profNet&&G.profNet.rank)?('#'+G.profNet.rank):'—'));
 const rows=[
  ['РЕКОРД СЧЁТА',String(d.bestScore|0)],
  ['ЛУЧШЕЕ ВРЕМЯ В СМЕНЕ',bestT?fmtPlayTime(bestT):'—'],
  ['ВСЕГО В СМЕНАХ',fmtPlayTime(d.playSeconds||0)],
  ['СМЕН ДОИГРАНО',String(runs.length)],
  ['ДОСТИЖЕНИЙ',(d.achievements||[]).length+' / '+(G.achNames?G.achNames.length:15)],
  ['СМЕРТЕЙ',String(d.deaths|0)],
  ['СЕКРЕТОВ',(d.secrets||[]).length+' / '+(window.SecretSystem?.defs?.length||5)],
  ['ОТКРЫТО СМЕН',String(Math.min(5,d.highestNight||1))+' / 5'],
  ['МЕСТО В ОБЩЕЙ ТАБЛИЦЕ',rankTxt],
  ['ПРОВЕРКА РЕКОРДА',d.lastRunValidation?.ok===false?'ПОДОЗРИТЕЛЬНЫЙ':'НОРМА'],
  ['ЗАЩИЩЁННЫЙ ТОП',window.NetLB?.secureWrites?.()?'СЕРВЕР':'НЕ НАСТРОЕН']
 ];
 const sx=R.stats.x, sy=R.stats.y, sw=R.stats.w;
 const cols=2, perCol=Math.ceil(rows.length/cols), lh=lowL?15:19;
 rows.forEach((r,i)=>{
  const c=Math.floor(i/perCol), k=i%perCol;
  const x=sx+c*(sw/2)+2, y=sy+k*lh+lh*.8;
  ctx.save();ctx.shadowColor='rgba(0,0,0,.8)';ctx.shadowBlur=4;
  text2(ctx,r[0],x,y,lowL?9:11,'#8b98a2');
  ctx.font='700 '+(lowL?11:13)+'px "JetBrains Mono",monospace';
  ctx.fillStyle='#e0d3a8';ctx.textAlign='right';
  ctx.fillText(r[1],x+sw/2-16,y);ctx.textAlign='left';ctx.restore();
 });
 // ---- статус сети ----
 const stY=R.back.y-(lowL?12:18);
 let stTxt,stCol;
 if(!net){stTxt='ОНЛАЙН-ТОП НЕ НАСТРОЕН · РЕЗУЛЬТАТЫ ХРАНЯТСЯ НА ЭТОМ УСТРОЙСТВЕ';stCol='#8b98a2'}
 else{
  const s=window.NetLB.status();
  if(s==='online'){stTxt='ОНЛАЙН-ТОП: ПОДКЛЮЧЁН · ВАШ РЕЗУЛЬТАТ ВИДЯТ ВСЕ';stCol='#8fe3ab'}
  else if(s==='connecting'){stTxt='ОНЛАЙН-ТОП: ПОДКЛЮЧЕНИЕ…';stCol='#e0d3a8'}
  else if(s==='error'){stTxt='ОНЛАЙН-ТОП: НЕТ СВЯЗИ · ПОКАЗАНЫ ЛОКАЛЬНЫЕ РЕЗУЛЬТАТЫ';stCol='#d1848a'}
  else {stTxt='ОНЛАЙН-ТОП: ОЖИДАНИЕ';stCol='#8b98a2'}
 }
 if(!lowL){ctx.save();ctx.shadowColor='rgba(0,0,0,.8)';ctx.shadowBlur=6;
  text2(ctx,stTxt,R.card.x,stY,11,stCol);ctx.restore();}
 button(R.back.x,R.back.y,R.back.w,R.back.h,'НАЗАД');
}

function profileClick(x,y){
 if(scrTabsClick(x,y))return;
 const R=profRects(),p=profile();
 if(hitRect(x,y,R.rename.x,R.rename.y,R.rename.w,R.rename.h)){
  window.AudioFX.play('click');
  if(G.nameEdit)closeNameEdit(true);else openNameEdit();
  return;
 }
 if(hitRect(x,y,R.online.x,R.online.y,R.online.w,R.online.h)){
  p.online=!p.online;window.SaveSystem.save();window.AudioFX.play('click');
  if(p.online)submitProfile();
  return;
 }
 for(const r of R.picks){
  if(hitRect(x,y,r.x,r.y,r.w,r.h)){
   if((p.avatar|0)!==r.idx){p.avatar=r.idx;window.SaveSystem.save();submitProfile()}
   window.AudioFX.play('click');return;
  }
 }
 if(hitRect(x,y,R.back.x,R.back.y,R.back.w,R.back.h)){
  closeNameEdit(false);G.state='menu';window.AudioFX.play('click');return;
 }
}

// ---------- КАРТОЧКА ПРОФИЛЯ ИГРОКА ИЗ ТАБЛИЦЫ ----------
function drawLbCard(){
 const row=G.lbCard;if(!row)return;
 const lowL=menuLow();
 ctx.save();ctx.fillStyle='rgba(4,6,9,.72)';ctx.fillRect(0,0,W,H);ctx.restore();
 const cw=Math.min(W*.62,lowL?W*.86:520), ch=lowL?H*.66:Math.min(H*.44,270);
 const cx=(W-cw)/2, cy=(H-ch)/2;
 const ACC=[86,150,178];
 panel2(cx,cy,cw,ch,ACC,true);
 rivet(cx+12,cy+12,2.6,'#5d6a72');rivet(cx+cw-12,cy+12,2.6,'#5d6a72');
 rivet(cx+12,cy+ch-12,2.6,'#5d6a72');rivet(cx+cw-12,cy+ch-12,2.6,'#5d6a72');
 const m=row.meta||{};
 const avS=lowL?52:68;
 roundedRect(ctx,cx+22-5,cy+26-5,avS+10,avS+10,6,'rgba(8,12,16,.85)','rgba(86,150,178,.45)',1.4);
 drawAvatarIcon(ctx,row.avatar|0,cx+22,cy+26,avS);
 ctx.save();ctx.shadowColor='rgba(0,0,0,.85)';ctx.shadowBlur=6;
 text2(ctx,row.global?'ИГРОК ОБЩЕЙ ТАБЛИЦЫ':'ЗАПИСЬ ЭТОГО УСТРОЙСТВА',cx+22+avS+18,cy+42,lowL?9:10,'#7f9aa8');
 const nm=String(row.name||'АНОНИМ');
 text2(ctx,nm.length>18?nm.slice(0,17)+'…':nm,cx+22+avS+18,cy+(lowL?64:70),lowL?15:20,row.you?'#ffd9dd':'#e8eef2');
 if(row.you)text2(ctx,'ЭТО ВЫ',cx+cw-22,cy+42,lowL?9:11,'#ffb0b8','right');
 ctx.restore();
 text2(ctx,'МЕСТО #'+(row.rank||'—'),cx+cw-22,cy+(lowL?64:70),lowL?13:16,'#dfe6ec','right');
 // список показателей
 const rows=[
  ['СЧЁТ',String(row.score|0)],
  ['ВРЕМЯ В СМЕНЕ',row.seconds?fmtPlayTime(row.seconds):'—'],
  ['СМЕНА',m.ni?String(m.ni):'—'],
  ['ДОСТИЖЕНИЙ',m.ac!==undefined?String(m.ac|0):'—'],
  ['СМЕН ДОИГРАНО',m.ru!==undefined?String(m.ru|0):'—'],
  ['СМЕРТЕЙ',m.de!==undefined?String(m.de|0):'—'],
  ['ВСЕГО В СМЕНАХ',m.pt?fmtPlayTime(m.pt|0):'—'],
  ['РЕЗУЛЬТАТ ОТ',m.ts?new Date(m.ts).toLocaleDateString():'—']
 ];
 const sy=cy+(lowL?96:110), lh=lowL?17:21, colW=(cw-44)/2;
 rows.forEach((r,i)=>{
  const c=i%2, k=Math.floor(i/2);
  const x=cx+22+c*colW, y=sy+k*lh;
  text2(ctx,r[0],x,y,lowL?9:10,'#7f9aa8');
  ctx.save();ctx.font='700 '+(lowL?11:13)+'px "JetBrains Mono",monospace';
  ctx.fillStyle='#dfe6ec';ctx.textAlign='right';
  ctx.fillText(r[1],x+colW-18,y);ctx.textAlign='left';ctx.restore();
 });
 const br={x:cx+cw*.5-Math.min(140,cw*.34)*.5,y:cy+ch-(lowL?36:46),w:Math.min(140,cw*.34),h:lowL?26:32};
 G.lbCardBtn=br;
 button(br.x,br.y,br.w,br.h,'ЗАКРЫТЬ');
}

function drawGame(){
 const office=!G.monitor;
 // Smooth first-person-like office look: the room subtly follows the mouse.
 // FNAF-style pseudo-3D office: render a wide panorama offscreen, then show a yaw-rotated slice.
 if(!G.monitor){
   const PM=window.OfficePano;PM.render();PM.display();
   // V111: ВНЕЗАПНОЕ ПРИСУТСТВИЕ — тень мелькает поперёк офиса на долю секунды,
   // и свет дрожит. Рисуется поверх панорамы, но под предметами. Не убивает.
   if(G.presence){
     const p=G.presence,prog=p.t/p.dur;
     const vis=Math.sin(prog*Math.PI); // входит и выходит плавно
     const dir=p.side;
     ctx.save();ctx.globalAlpha=0.5*vis;ctx.globalCompositeOperation='multiply';
     // тёмный силуэт ростом с дверной проём, скользящий поперёк кадра
     const cx=W*(0.5+dir*(prog-0.5)*1.6),cy=H*0.46,hh=H*0.52;
     ctx.fillStyle='#050709';
     ctx.beginPath();ctx.ellipse(cx,cy,hh*0.16,hh*0.5,0,0,Math.PI*2);ctx.fill();
     ctx.restore();
     // лёгкое мерцание света на кадре
     if(Math.random()<0.5){ctx.save();ctx.globalAlpha=0.12*vis;ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);ctx.restore();}
   }
   // Hanging rabbit mask on the upper-right wall (night 2). Drawn as an overlay at its screen position.
   if(G.mask&&G.mask.available&&!G.mask.worn&&G.mask.t<0.01){const m=PM.metrics(),ly=(G.look.sy-.5)*12;drawMaskHangingAt(m.panW*0.78-m.offsetX,H*0.12+8+ly);}
   // Desk radio model (replaces the РАДИО button): click it to toggle; red LED glows when on.
   if(!(G.mask&&G.mask.worn)){const rm=PM.metrics(),rly=(G.look.sy-.5)*12;drawRadioModel(rm.panW*0.50-rm.offsetX,H*0.55+rly,G.radio.on);}
 }
 if(G.monitor){
  // Opaque backdrop: without it the canvas stays transparent behind the tablet and the
  // WebGL post-processing pass can sample undefined pixels (red/black full-screen artefacts).
  const mb=ctx.createLinearGradient(0,0,0,H);mb.addColorStop(0,'#05080b');mb.addColorStop(1,'#020406');ctx.fillStyle=mb;ctx.fillRect(0,0,W,H);
  // ---- V64: сигнал занимает весь экран ----
  const low=document.body.classList.contains('low-end');
  const cam=window.CameraSystem.get(G.cam), now=performance.now()/1000, vo=window.CameraSystem.viewOffset(G.cam,now,G.mouse);
  const alertLvl=window.CameraSystem.corridorAlert(G,G.cam);
  // V66: открытие плавное — прозрачность идёт по мягкой кривой, а кадр слегка
  // «наезжает» с небольшого приближения вместо резкого включения.
  // V83: кривая разная на открытие и закрытие: планшет выбрасывается быстро и
  // мягко встаёт на место (с крошечным перелётом в конце хода), а гаснет ровно.
  const mRaw=G.monitorAnim;
  let mEase=G.monitorTarget?1-Math.pow(1-mRaw,2.7):mRaw*mRaw*(3-2*mRaw);
  const settle=(G.monitorTarget&&mRaw>0.80&&mRaw<1)?Math.sin((mRaw-0.80)/0.20*Math.PI)*0.035:0;
  mEase=Math.max(0,Math.min(1,mEase));
  ctx.save();ctx.globalAlpha=mEase;
  // кадр рисуется с запасом за краями экрана, чтобы изгиб стекла не оставлял чёрных клиньев
  const opz=1+(1-mEase)*0.045-settle;
  const baseW=W*1.06, baseH=H*1.12;
  const OW=baseW*opz, OH=baseH*opz;
  const OX=-W*.03-(OW-baseW)*.5, OY=-H*.06-(OH-baseH)*.5;
  // V71: разрешение буфера сигнала подстраивается под реальную производительность.
  const fsc=low?0.60:(PERF.tier===0?0.86:PERF.tier===1?0.70:0.56);
  const FW=Math.max(8,Math.round(OW*fsc)),FH=Math.max(8,Math.round(OH*fsc));
  const c2=camFB(FW,FH);
  // V71: тяжёлый кадр (комната + оптика + артефакты) собирается не каждый кадр,
  // а с частотой видеосигнала. Стекло, рамка и интерфейс рисуются каждый кадр,
  // поэтому планшет остаётся отзывчивым, а тяжелёйшая часть стоит вдвое-втрое дешевле.
  const _ff=feedFps(low);
  const rebuild=(G._feedW!==FW||G._feedH!==FH||G._feedCam!==G.cam||!G._feedAt||(now-G._feedAt)>=1/_ff);
  if(rebuild){
  G._feedW=FW;G._feedH=FH;G._feedCam=G.cam;G._feedAt=now;
  c2.setTransform(1,0,0,1,0,0);
  c2.fillStyle='#05080b';c2.fillRect(0,0,FW,FH);
  if(cam.state==='broken'){
   c2.fillStyle='#070a0c';c2.fillRect(0,0,FW,FH);
   // V71: «снег» берётся из готовых плиток вместо трёх тысяч прямоугольников на кадр
   const _st=staticTile(Math.floor(now*12)%4), _sp=c2.createPattern(_st,'repeat');
   c2.save();c2.translate(-((Math.floor(now*97))%128),-((Math.floor(now*61))%128));
   c2.fillStyle=_sp;c2.fillRect(0,0,FW+128,FH+128);c2.restore();
   c2.fillStyle='rgba(4,6,8,.74)';c2.fillRect(0,FH*.42,FW,FH*.16);
   c2.font='700 '+Math.round(FH*.055)+'px "Inter",Arial,sans-serif';c2.textAlign='center';c2.fillStyle='#e33a49';
   c2.fillText('НЕТ СИГНАЛА',FW*.5,FH*.487);
   c2.font='700 '+Math.round(FH*.026)+'px "JetBrains Mono",monospace';c2.fillStyle='#c5ccd1';
   c2.fillText('АВТОВОССТАНОВЛЕНИЕ: '+Math.ceil(cam.breakTimer)+' С',FW*.5,FH*.535);
   c2.textAlign='left';
  }else{
   // свой ракурс камеры: высота подвеса, наклон объектива, крен и приближение
   const av=CAM_VIEW[G.cam]||{z:1.06,sk:0,tx:0,ty:0};
   const zz=(av.z||1.06)+Math.abs(av.sk||0)*1.8;
   const camSide=G.cam===6?'left':G.cam===7?'right':null;
   const camDoorState=camSide?{closed:!!G.doors[camSide],lightOn:!!G.lights[camSide].on,renderOff:!!G.lights[camSide].renderOff,flicker:G.lights[camSide].flicker||0}:null;
   // V72: тёмный коридор — свет с этой стороны выключен. Флаг гасит красный налёт
   // тревоги, подъём АРУ, дымку и зерно: иначе они заливали чёрный кадр розовым молоком.
   G._darkCam=!!(camSide&&camDoorState&&!(camDoorState.lightOn&&!camDoorState.renderOff));
   const cs=camScene(FW,FH);
   cs.setTransform(1,0,0,1,0,0);
   cs.fillStyle='#05080b';cs.fillRect(0,0,FW,FH);
   cs.save();
   cs.translate(FW*.5,FH*.5);
   cs.transform(1,(av.sk||0),0,1,0,0);
   cs.scale(zz*vo.zoom,zz*vo.zoom);
   cs.translate((av.tx||0)*FW+vo.x*FW,(av.ty||0)*FH+vo.y*FH);
   cs.translate(-FW*.5,-FH*.5);
   window.World[cam.name==='Зал'?'pizza':cam.name==='Выход'?'exit':cam.name==='Склад'?'storage':cam.name==='Сцена'?'stage':cam.name==='Служебная'?'service':cam.name==='Коридор А'?'corridorA':'corridorB'](cs,FW,FH,now,window.CameraSystem.doorAlert(G,G.cam),camDoorState);
   cs.save();cs.scale(FW/W,FH/H);drawMonsterOnCam(G.cam,cs);cs.restore();
   cs.restore();
   drawPerspectiveFeed(c2,_camScn,FW,FH,av,low);
   if(alertLvl>0){
    const pulse=0.5+0.5*Math.abs(Math.sin(now*(alertLvl>1?9:5)));
    c2.save();c2.globalCompositeOperation='lighter';
    const wk=G._darkCam?0.30:1; // V72: в темноте налёт тревоги почти не поднимает чёрный
    c2.fillStyle=`rgba(220,20,30,${(((alertLvl>1?0.05:0.03)+(alertLvl>1?0.06:0.03)*pulse)*wk).toFixed(4)})`;
    c2.fillRect(0,0,FW,FH);c2.restore();
   }
  }
  const CINE=!window.__noCine;
  if(CINE&&cam.state!=='broken'){
   const cm=drawCineBase(c2,FW,FH,now,cam,low,G.cam);
   G._camGain=cm.gain;
  }else{G._camGain=1;}
  drawFeedFx(c2,FW,FH,now,cam,low);
  if(CINE&&cam.state!=='broken')drawCineTop(c2,FW,FH,now,cam,low,G.cam,G._camGain);
  // V66: перекрытие кадров при переключении камеры — вместо мгновенной подмены
  // предыдущий кадр ещё коротко тает поверх нового.
  if((G.camFadeT||0)>0&&_camPrev&&_camPrev.width===FW&&_camPrev.height===FH){
   const k=Math.min(1,Math.max(0,G.camFadeT/(G.camFadeD||0.26)));
   const fe=k*k*(3-2*k);
   c2.save();c2.globalAlpha=fe*0.9;c2.drawImage(_camPrev,0,0,FW,FH);c2.restore();
   c2.save();c2.fillStyle=`rgba(3,7,10,${(0.30*Math.sin(Math.PI*(1-k))).toFixed(3)})`;
   c2.fillRect(0,0,FW,FH);c2.restore();
  }
  }
  // V69: «дыхание» подвеса — кадр очень слабо плывёт, как на реальном кронштейне
  const gwx=Math.sin(now*0.53)*0.9+Math.sin(now*1.27)*0.4;
  const gwy=Math.cos(now*0.41)*0.8+Math.sin(now*1.73)*0.3;
  drawWarpedFeed(_camFB,OX+gwx,OY+gwy,OW,OH,low);
  drawCamFrameFS(alertLvl,now,low);
  drawCamHUDFS(cam,now,alertLvl,low);
  ctx.restore();drawMap();
 }
 if(!(G.mask&&(G.mask.worn||G.mask.t>0.01)))drawControls();
 if(G.mask&&G.mask.t>0.01)drawMaskWorn(G.mask.t);
 if(G.ventDust>0)drawVentDust();
 if(G.special.active&&G.special.type==='tarhun') drawTarhunArrival(G.special);
 if(G.note.open)drawNote();
 if(G.dialer)drawDialer();
 if(G.phone.state==='ringing'||G.phone.state==='connected')drawPhone();
 // Скример рисуется поверх всего — ни телефон, ни записка его не закрывают.
 if(G.screamer.active) drawScreamer(G.screamer);
}
function drawMaskTexture(cx,cy,scale,corrupt=false){
 // Detailed pixel-art animatronic-style rabbit mask (pink-purple). Blocky Minecraft-style
 // pixels with dithered volume shading, long ears, a raised muzzle with teeth, big eyes.
 const s=scale||1, t=performance.now()/1000;
 ctx.save();ctx.translate(cx,cy);ctx.scale(s,s);ctx.rotate(Math.sin(t*0.6)*0.02);
 const P=3.2; // pixel block size
 const blk=(gx,gy,gw,gh,c)=>{ctx.fillStyle=c;ctx.fillRect(gx*P,gy*P,gw*P,gh*P);};
 const pc=(gx,gy,c)=>{ctx.fillStyle=c;ctx.fillRect(gx*P,gy*P,P,P);};
 // palette
 const L='#ffa6de',M='#d65aaf',D='#9a3fc6',DD='#6a219a',SH='#3a1248';
 const SN='#ffd6ee',SN2='#e9c0dc',NO='#4a1a2e',TE='#fff7fb',IR='#ff5fc6',PU='#260a1e',BLK='#14070f',BLUSH='#e87aa6',WH='#ffffff';
 // ---- ears (long, blocky, with shading columns + inner stripe) ----
 const ear=(gx0)=>{
   for(let r=0;r<15;r++)for(let c=0;c<5;c++){
     if(r===0&&(c===0||c===4))continue; // round the tip
     let col; if(c===0)col=L; else if(c===1)col=M; else if(c===2)col=D; else if(c===3)col=M; else col=DD;
     if(r>=13)col=DD; if(r>=11&&c===4)col=DD;
     pc(gx0+c,-30+r,col);
   }
   // inner ear light stripe
   for(let r=0;r<11;r++)pc(gx0+2,-26+r,SN);
   // cast shadow at the base (ear meets head)
   for(let c=0;c<5;c++)pc(gx0+c,-15,SH);
 };
 ear(-9);ear(4);
 // golden bow on the left ear
 ctx.save();ctx.translate(-9*P,-30*P);ctx.fillStyle='#ffd23f';ctx.beginPath();ctx.ellipse(-4,0,4,3,0.5,0,Math.PI*2);ctx.ellipse(4,0,4,3,-0.5,0,Math.PI*2);ctx.fill();ctx.fillStyle='#b8861f';ctx.beginPath();ctx.arc(0,0,1.6,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(255,255,255,.6)';ctx.beginPath();ctx.arc(-3.5,-1.2,0.9,0,Math.PI*2);ctx.fill();ctx.restore();
 // ---- head (blocky rounded, dithered volume) ----
 const hx=-9,hy=-15,hw=18,hh=16;
 for(let r=0;r<hh;r++)for(let c=0;c<hw;c++){
   if((r===0||r===hh-1)&&(c<2||c>hw-3))continue;
   if((r<2||r>hh-3)&&(c<1||c>hw-2))continue;
   let col;
   const lit=(c<9&&r<8);
   if(lit){ col=(c<5&&r<4)?L:M; }
   else { col=(c>13&&r>11)?DD:D; }
   if(!lit&&c<9)col=D;
   pc(hx+c,hy+r,col);
 }
 // top-edge highlight (rim light)
 for(let c=2;c<hw-2;c++)pc(hx+c,hy,L);
 // ---- muzzle / snout (raised, lighter) ----
 const mx=-4,my=1,mw=10,mh=8;
 for(let r=0;r<mh;r++)for(let c=0;c<mw;c++){
   if((r===0||r===mh-1)&&(c<2||c>mw-3))continue;
   let col=(c<5&&r<4)?SN:SN2;
   if(c>6&&r>5)col=SN2;
   pc(mx+c,my+r,col);
 }
 // nose (dark glossy block + highlight)
 blk(-1,1,2,1,NO);
 pc(-1,1,'rgba(255,255,255,.5)');
 // teeth (row of small white blocks under the nose)
 for(let i=0;i<4;i++)pc(-3+i*2,3,TE);
 pc(-3,3,SN2);pc(3,3,SN2);
 // ---- big blocky FNAF-style eyes ----
 const eye=(gx0)=>{
   // dark socket (5x5) with stitched outline
   for(let r=0;r<5;r++)for(let c=0;c<5;c++){
     const edge=(r===0||r===4||c===0||c===4);
     pc(gx0+c,-12+r, edge?SH:BLK);
   }
   // iris (3x3 magenta glow)
   for(let r=0;r<3;r++)for(let c=0;c<3;c++)pc(gx0+1+c,-11+r,IR);
   // pupil
   pc(gx0+2,-10,PU);
   // catchlights
   pc(gx0+1,-11,WH);
   pc(gx0+3,-9,'rgba(255,255,255,.6)');
 };
 eye(-7);eye(2);
 // rosy pixel cheeks
 for(const ex of [-6,7]){pc(ex,-2,BLUSH);pc(ex+1,-2,BLUSH);}
 // ---- blocky stitched seams along the head edges ----
 for(let r=2;r<hh-2;r+=2)pc(hx-1,hy+r,SH);
 for(let r=2;r<hh-2;r+=2)pc(hx+hw,hy+r,SH);
 for(let c=3;c<hw-3;c+=2)pc(hx+c,hy+hh-1,SH);
 // ---- floating sparkles ----
 for(let i=0;i<4;i++){const sx=-13+i*9,sy=-26+((i*13)%18);const a=0.4+0.6*Math.abs(Math.sin(t*2+i));ctx.globalAlpha=a;ctx.fillStyle='#fff6fb';pc(Math.round(sx/P),Math.round(sy/P),'#fff6fb');ctx.globalAlpha=1;}
 if(corrupt){ctx.fillStyle='rgba(180,20,90,.25)';for(let i=0;i<10;i++)pc(hx+((i*5)%hw),hy+((i*3)%hh),'rgba(180,20,90,.25)');}
 ctx.restore();
}
function drawMaskHangingAt(cx,cy){
 const t=performance.now()/1000;
 const low=document.body.classList.contains('low-end');
 const sway=Math.sin(t*0.6)*0.045-0.05+Math.sin(t*1.7)*0.008;
 ctx.save();ctx.translate(cx,cy);
 // тёмный карман стены за маской: маска висит в тени, а не приклеена к светлой стене
 {
   for(let p=0;p<2;p++){
     const rr=112+p*34;
     const pk=ctx.createRadialGradient(0,2,4,0,2,rr);
     pk.addColorStop(0,`rgba(2,3,7,${p?.16:.46})`);pk.addColorStop(.28,`rgba(2,3,7,${p?.13:.34})`);
     pk.addColorStop(.60,`rgba(2,3,7,${p?.07:.15})`);pk.addColorStop(1,'rgba(2,3,7,0)');
     ctx.fillStyle=pk;ctx.beginPath();ctx.ellipse(0,2,rr*0.86,rr*1.06,0,0,Math.PI*2);ctx.fill();
   }
 }
 // гвоздь в стене и тень от него
 ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(-2,-78,6,4);
 ctx.fillStyle='#8d94a0';ctx.fillRect(-2,-80,5,4);
 ctx.fillStyle='rgba(255,255,255,.20)';ctx.fillRect(-2,-80,2,2);
 ctx.save();ctx.rotate(sway);ctx.scale(1.36,1.36);
 // шнур: провисает и качается вместе с маской
 ctx.strokeStyle='rgba(150,142,126,.55)';ctx.lineWidth=1.2;
 ctx.beginPath();ctx.moveTo(0,-49);ctx.quadraticCurveTo(2.5,-40,0,-30);ctx.stroke();
 // падающая тень маски на стену (смещена в сторону от лампы)
 {ctx.save();ctx.translate(6,8);
   const sh=ctx.createRadialGradient(0,0,4,0,0,44);
   sh.addColorStop(0,'rgba(0,0,0,.42)');sh.addColorStop(.55,'rgba(0,0,0,.22)');sh.addColorStop(1,'rgba(0,0,0,0)');
   ctx.fillStyle=sh;ctx.beginPath();ctx.ellipse(0,2,34,36,0,0,Math.PI*2);ctx.fill();
   const se=ctx.createLinearGradient(0,-46,0,-14);
   se.addColorStop(0,'rgba(0,0,0,0)');se.addColorStop(1,'rgba(0,0,0,.26)');
   ctx.fillStyle=se;ctx.fillRect(-12,-46,9,32);ctx.fillRect(4,-46,9,32);
   ctx.restore();}
 drawMaskTexture(0,0,0.62,false);
 // холодная ночная градуировка поверх маски: гасим «конфетную» яркость
 {
   ctx.save();
   ctx.beginPath();ctx.ellipse(0,-4,40,54,0,0,Math.PI*2);ctx.clip();
   const gr=ctx.createLinearGradient(0,-56,0,40);
   gr.addColorStop(0,'rgba(9,11,26,.46)');gr.addColorStop(.45,'rgba(7,9,22,.60)');gr.addColorStop(1,'rgba(3,4,11,.80)');
   ctx.fillStyle=gr;ctx.fillRect(-42,-58,84,102);
   ctx.restore();
 }
 // глаза тлеют в темноте
 const eg=.6+.4*Math.abs(Math.sin(t*1.3));
 ctx.save();ctx.globalCompositeOperation='lighter';
 [[-9.9,-20.8],[7.9,-20.8]].forEach(e=>{
   const g=ctx.createRadialGradient(e[0],e[1],0,e[0],e[1],11);
   g.addColorStop(0,`rgba(255,120,215,${(.8*eg).toFixed(2)})`);g.addColorStop(1,'rgba(255,120,215,0)');
   ctx.fillStyle=g;ctx.beginPath();ctx.arc(e[0],e[1],16,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=`rgba(255,205,245,${(.85*eg).toFixed(2)})`;ctx.fillRect(e[0]-3,e[1]-2,6,4);
 });
 ctx.restore();
 ctx.restore();
 // паутина в углу крепления и редкая пыль в воздухе
 if(!low){
   ctx.strokeStyle='rgba(190,195,205,.10)';ctx.lineWidth=1;
   ctx.beginPath();ctx.moveTo(-40,-72);ctx.lineTo(3,-78);ctx.lineTo(37,-62);ctx.stroke();
   ctx.beginPath();ctx.moveTo(-22,-75);ctx.lineTo(-3,-58);ctx.lineTo(22,-70);ctx.stroke();
   for(let i=0;i<8;i++){const a=(i*79)%100/100*Math.PI*2;const r=40+((i*17)%30);
     const x=Math.cos(a+t*.35)*r, y=Math.sin(a+t*.5)*r*.7+Math.sin(t*.8+i)*3;
     ctx.fillStyle=`rgba(200,190,205,${(.06+.06*Math.abs(Math.sin(t+i))).toFixed(3)})`;ctx.fillRect(x,y,1.4,1.4);}
 }
 ctx.restore();
}
function drawMaskHanging(){drawMaskHangingAt(W*0.78,H*0.12+8);}
// Stylish chunky PIXEL-ART retro desk radio (replaces the old РАДИО button). Red LED glows when on.
function drawRadioModel(cx,cy,on){
 const t=performance.now()/1000;
 ctx.save();ctx.translate(cx,cy);ctx.imageSmoothingEnabled=false;
 const px=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
 // contact shadow
 ctx.fillStyle='rgba(0,0,0,.4)';ctx.beginPath();ctx.ellipse(0,24,52,8,0,0,7);ctx.fill();
 // chunky body — layered pixel blocks for a retro plastic/wood look
 px(-52,-26,104,52,'#2a1a10');            // outer dark frame
 px(-48,-22,96,44,'#6a4226');            // body base
 px(-48,-22,96,6,'#8a5a32');              // top highlight strip
 px(-48,18,96,4,'#3a2412');              // bottom shadow strip
 px(-46,-20,8,40,'#432817'); // left side shading
 px(38,-20,8,40,'#3a2412');              // right side shading
 // wood-grain pixel dashes
 ctx.fillStyle='#5a3a22';for(let i=0;i<5;i++)px(-44+i*19,-8+((i%2)*3),16,1,'#5a3a22');
 // SPEAKER GRILLE (left) — pixel square holes
 px(-40,-16,34,32,'#140c06');            // grille recess
 for(let gy=-12;gy<=12;gy+=5)for(let gx=-36;gx<=-10;gx+=5){px(gx,gy,3,3,'#3a2a18');px(gx,gy,1,1,'#7a5a36');}
 // TUNING DIAL (right) — pixel display
 px(2,-16,40,32,'#08100c');              // dial recess
 px(4,-14,36,28,'#0c1a14');              // dial face
 // pixel frequency ticks
 for(let i=0;i<6;i++){px(8+i*6,-12,1,4,on?'#7be0a0':'#2c4a38');px(8+i*6,6,1,4,on?'#5a9a78':'#1c2a22');}
 // tuning needle (pixel)
 const np=on?0.5+Math.sin(t*0.9)*0.42:0.3;
 px(6+np*30,-14,3,28,on?'#ffae3c':'#5a3c22');
 if(on){px(6+np*30,-14,3,3,'#ffe6a0');}    // needle highlight
 // dial glass glare
 ctx.fillStyle='rgba(255,255,255,.06)';ctx.fillRect(4,-14,36,4);
 // KNOBS — chunky pixel dials
 const knob=(kx,ky,on2,col)=>{px(kx-7,ky-7,14,14,'#1a120a');px(kx-6,ky-6,12,12,col||'#3a2a18');px(kx-5,ky-5,4,4,'#5a3a22');px(kx-1,ky-1,3,3,'#1a120a');};
 knob(0,18,false,'#4a2c1a');               // volume knob (bottom-left of dial)
 // chrome top trim (pixel)
 px(-52,-28,104,4,'#9aa6b2');px(-52,-28,104,1,'#c6d0da');
 // antenna — pixel staircase
 ctx.strokeStyle='#9aa6b2';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(34,-26);ctx.lineTo(50,-50);ctx.stroke();
 px(48,-52,4,4,'#c6d0da');px(34,-28,6,3,'#7a8692');
 // handle (top) pixel arc
 px(-18,-32,36,4,'#2a1a10');px(-20,-34,4,4,'#2a1a10');px(16,-34,4,4,'#2a1a10');
 // POWER LED — big pixel, glows red when on
 const pulse=on?(0.55+Math.sin(t*7)*0.45):0;
 if(on){ctx.fillStyle='rgba(255,30,50,'+(0.2+0.3*pulse)+')';ctx.beginPath();ctx.arc(-34,-20,11,0,7);ctx.fill();}
 px(-37,-23,7,7,on?`rgba(255,${40+30*pulse|0},${50+20*pulse|0},1)`:'#5a1c14');
 px(-37,-23,3,3,on?'#ffd0d6':'#3a120c');   // LED core highlight
 // speaker dust cap pixel
 px(-22,0,8,8,'#4a2c1a');px(-20,-2,4,4,'#6a4226');
 ctx.restore();
}
function drawMaskWorn(anim){
 // Rounded 3D mask styled after the reference: a bright magenta-purple surface (radial
 // gradient + white speckles), two horizontal eye slits ringed by thin concentric dark
 // ellipses (portal look) with a soft pink glow rim, and THROUGH the slits you see the real
 // security room — darkened by a translucent veil so it reads like the reference's dim
 // interior, with subtle accent cues (pale ceiling lights, a golden icon, an "OFF" label).
 anim=(anim===undefined?1:Math.max(0,Math.min(1,anim)));
 const t=performance.now()/1000;
 const a=anim;
 const am=Math.min(1,anim*1.5);
 const cx=W*0.5,cy=H*0.5;
 const ew=Math.min(W*0.19,250),eh=Math.min(H*0.135,98),ey=H*0.47;
 const blinkPhase=(t%3.6)/0.34;const bk=blinkPhase<1?Math.sin(Math.PI*blinkPhase):0;const ehe=Math.max(eh*0.06,eh*(1-bk*0.96));
 const rr=(c,x,y,w,h,r)=>{c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();};
 ctx.save();ctx.globalAlpha=am;
 // 1) dark veil over the whole screen — darkens the office seen through the eye holes
 const veil=ctx.createLinearGradient(0,0,0,H);veil.addColorStop(0,'rgba(14,3,20,0.56)');veil.addColorStop(0.5,'rgba(8,2,13,0.60)');veil.addColorStop(1,'rgba(3,0,7,0.70)');ctx.fillStyle=veil;ctx.fillRect(0,0,W,H);
 // 2) build the mask layer offscreen: opaque bright magenta rounded surface + speckles,
 //    then punch the eye interiors so they are transparent (reveal the darkened room behind)
 if(!window.__maskOff)window.__maskOff=document.createElement('canvas');
 // V88: раньше oc.width/oc.height присваивались КАЖДЫЙ кадр, а любая запись в них
 // заново выделяет буфер во всю площадь экрана и чистит его — на Full HD это
 // мегабайты аллокаций 60 раз в секунду. Теперь размер меняется только при смене
 // размера кадра, а в остальных кадрах буфер просто очищается.
 const oc=window.__maskOff;const octx=oc.getContext('2d');
 if(oc.width!==W||oc.height!==H){oc.width=W;oc.height=H;}
 octx.clearRect(0,0,W,H);
 rr(octx,0,0,W,H,64);
 const mg=octx.createRadialGradient(W*0.42,H*0.34,4,cx,cy,Math.max(W,H)*0.74);
 mg.addColorStop(0,'#4e1c48');mg.addColorStop(0.30,'#3c1338');mg.addColorStop(0.62,'#210a2a');mg.addColorStop(1,'#06020b');
 octx.fillStyle=mg;octx.fill();
 const hl=octx.createRadialGradient(W*0.4,H*0.28,2,W*0.4,H*0.28,W*0.5);hl.addColorStop(0,'rgba(255,190,235,.10)');hl.addColorStop(1,'rgba(255,255,255,0)');octx.fillStyle=hl;octx.fill();
 const sheen=octx.createLinearGradient(0,0,W,0);sheen.addColorStop(0,'rgba(255,255,255,0)');sheen.addColorStop(0.5,'rgba(255,255,255,.025)');sheen.addColorStop(1,'rgba(255,255,255,0)');octx.fillStyle=sheen;octx.fill();
 // ворс плюша: мелкая крошка света и тени по всей поверхности
 for(let i=0;i<520;i++){const nx=(i*137)%W,ny=(i*89)%H;octx.fillStyle=((i*37)%4===0)?'rgba(255,200,240,.07)':'rgba(10,0,9,.30)';octx.fillRect(nx,ny,2,(i%3)?1:2);}
 // мягкая тень морды снизу — низ маски почти чёрный
 const muz=octx.createLinearGradient(0,H*0.55,0,H);muz.addColorStop(0,'rgba(4,0,8,0)');muz.addColorStop(1,'rgba(4,0,8,.85)');
 octx.fillStyle=muz;octx.fillRect(0,H*0.55,W,H*0.45);
 // затемнённые углы внутри маски
 const cor=octx.createRadialGradient(W*.5,H*.48,Math.min(W,H)*.22,W*.5,H*.5,Math.max(W,H)*.66);
 cor.addColorStop(0,'rgba(0,0,0,0)');cor.addColorStop(.55,'rgba(0,0,0,.40)');cor.addColorStop(1,'rgba(0,0,0,.92)');
 octx.fillStyle=cor;octx.fillRect(0,0,W,H);
 // шов по кромке: строчка нитками внутри маски
 octx.strokeStyle='rgba(255,190,235,.10)';octx.lineWidth=2;octx.setLineDash([7,9]);
 rr(octx,26,26,W-52,H-52,52);octx.stroke();octx.setLineDash([]);
 octx.globalCompositeOperation='lighter';
 for(const sgn of [-1,1]){const hx=cx+sgn*ew*1.18;
   const sp=octx.createRadialGradient(hx,ey,ehe*0.35,hx,ey,ew*1.05);
   sp.addColorStop(0,'rgba(198,160,212,.20)');sp.addColorStop(.22,'rgba(160,116,180,.11)');
   sp.addColorStop(.52,'rgba(110,72,140,.045)');sp.addColorStop(.78,'rgba(70,40,95,.015)');sp.addColorStop(1,'rgba(0,0,0,0)');
   octx.save();octx.translate(hx,ey);octx.scale(1,0.62);octx.translate(-hx,-ey);
   octx.fillStyle=sp;octx.beginPath();octx.arc(hx,ey,ew*1.05,0,Math.PI*2);octx.fill();octx.restore();}
 octx.globalCompositeOperation='destination-out';octx.fillStyle='#000';
 for(const sgn of [-1,1]){const hx=cx+sgn*ew*1.18;octx.beginPath();octx.ellipse(hx,ey,ew*0.86,ehe*0.86,0,0,Math.PI*2);octx.fill();}
 octx.globalCompositeOperation='source-over';
 // draw the mask layer onto the main canvas with zoom-settle + fade (eyes stay transparent)
 const sc=1+(1-anim)*0.18;
 ctx.save();ctx.translate(cx,cy);ctx.scale(sc,sc);ctx.translate(-cx,-cy);ctx.globalAlpha=am;ctx.drawImage(oc,0,0);ctx.restore();
 // 3) on top: subtle reference accents clipped to each eye + concentric dark rings + pink rim
 ctx.save();ctx.translate(cx,cy);ctx.scale(sc,sc);ctx.translate(-cx,-cy);ctx.globalAlpha=am;
 for(const sgn of [-1,1]){const hx=cx+sgn*ew*1.18;
   // accent cues inside the eye (the darkened room stays visible behind them)
   ctx.save();ctx.beginPath();ctx.ellipse(hx,ey,ew*0.84,ehe*0.84,0,0,Math.PI*2);ctx.clip();
   ctx.fillStyle='rgba(225,222,205,0.45)';for(let i=-2;i<=2;i++){ctx.beginPath();ctx.arc(hx+i*ew*0.3,ey-ehe*0.5,2,0,Math.PI*2);ctx.fill();}
   ctx.fillStyle='rgba(228,178,58,0.8)';ctx.fillRect(hx-ew*0.45,ey+ehe*0.04,7,5);
   if(sgn<0){ctx.fillStyle='rgba(150,150,140,0.8)';ctx.font='7px "JetBrains Mono",monospace';ctx.textAlign='center';ctx.fillText('OFF',hx+ew*0.25,ey-ehe*0.18);}
   ctx.restore();
   // concentric thin dark rings (portal / layered look)
   for(let i=0;i<4;i++){const k=1+i*0.05;ctx.strokeStyle=i%2?'rgba(22,6,28,0.9)':'rgba(0,0,0,0.85)';ctx.lineWidth=1.4;ctx.beginPath();ctx.ellipse(hx,ey,ew*0.86*k,ehe*0.86*k,0,0,Math.PI*2);ctx.stroke();}
   // soft pink glow rim
   ctx.save();ctx.shadowColor='#ff8fd8';ctx.shadowBlur=16;ctx.strokeStyle='rgba(255,143,216,0.45)';ctx.lineWidth=1.4;ctx.beginPath();ctx.ellipse(hx,ey,ew*0.86,ehe*0.86,0,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
 ctx.restore();
 // sparkles
 // дыхание: тёплая испарина у нижней кромки, пульсирует в такт вдохам
 const br=0.5+0.5*Math.sin(t*1.25);
 ctx.save();ctx.globalAlpha=am;
 const fog=ctx.createLinearGradient(0,H*0.72,0,H);
 fog.addColorStop(0,'rgba(210,190,220,0)');fog.addColorStop(1,`rgba(214,196,226,${(.05+.05*br).toFixed(3)})`);
 ctx.fillStyle=fog;ctx.fillRect(0,H*0.72,W,H*0.28);
 // пыль в воздухе перед глазами, медленно всплывает
 for(let i=0;i<22;i++){const fx=(i*173+t*9)%W,fy=(H*1.1-((i*67+t*13)%(H*1.1)));
   const sa=(0.05+0.10*Math.abs(Math.sin(t*1.1+i))).toFixed(3);
   ctx.fillStyle=`rgba(228,214,232,${sa})`;ctx.fillRect(fx,fy,1.5,1.5);}
 ctx.restore();
 // редкий скачок сигнала — маска «дышит» вместе с камерами
 if(Math.random()<0.03){ctx.save();ctx.globalAlpha=.06*am;ctx.fillStyle='#ffb0e6';ctx.fillRect(0,Math.random()*H,W,2+Math.random()*5);ctx.restore();}
 ctx.restore();
}
function drawVentDust(){
 const t=performance.now()/1000,p=G.ventDust/0.7;
 const ly=(G.look.sy-.5)*12;
 const m=window.OfficePano.metrics();
 const cx=m.panW*0.5-m.offsetX, cy=H*0.082+ly;
 ctx.save();ctx.globalAlpha=p;
 for(let i=0;i<14;i++){const a=(i*97)%100/100*Math.PI*2;const r=4+((i*31)%18)+p*22;const x=cx+Math.cos(a+t*0.5)*r;const y=cy+Math.sin(a+t*0.5)*r*0.5+((i*7)%6);ctx.fillStyle=`rgba(190,180,160,${0.3*p})`;ctx.fillRect(x,y,1.6,1.6);}
 ctx.restore();
}
// ===== V63: ТАРХУН (2-я смена) — подробная фигура в контровом свете =====
// Гость выходит из темноты коридора: за спиной болезненно-зелёное свечение,
// на корпусе — облезшая краска, трещины, потёки; глаза наливаются светом.
// ===== V67: ТАРХУН — ЦВЕТОК. СТРАШНЫЙ =====
// Не персонаж-бутылка, а больной цветок в полный рост: узловатый стебель с шипами,
// корни-когти в полу, обвисшие листья вместо рук, а вместо головы — раскрытый венчик
// из рваных бледных лепестков. В сердцевине чёрная воронка с кольцом игольчатых
// зубов и два светящихся глаза. Он дышит, дёргается, лепестки шевелятся, со стебля
// капает сок.
function drawTarhunSprite(c,P,t,opts){
 opts=opts||{};
 const breath=Math.sin(t*1.7);
 const sway=Math.sin(t*0.9)+0.3*Math.sin(t*2.3);
 const twitch=(Math.sin(t*11.0)>0.88)?1:0;
 const tilt=Math.sin(t*0.55)*0.07+twitch*0.06;
 const px=(gx,gy,gw,gh,col)=>{c.fillStyle=col;c.fillRect(Math.round(gx*P),Math.round(gy*P),Math.max(1,Math.round(gw*P)),Math.max(1,Math.round(gh*P)));};
 // палитра: бледные лепестки мёртвого цвета + тёмно-зелёный стебель
 const PT='#cdd8a2',PT2='#96a473',PTD='#525d35',PTX='#161c0c';
 const ST='#415c24',STL='#6f9440',STD='#2b3d16',STX='#131d09';
 const CORE='#05100a',THR='#20400f',TOOTH='#f0f5da',EYE='#c9ff7a',PUP='#0b1a05';
 // рваный пиксельный клин: лепесток или лист. Растёт вверх от точки (0,0).
 const blade=(len,wid,pal,curl)=>{
  const n=Math.max(4,Math.round(len));
  curl=curl||0;
  for(let r=0;r<n;r++){
   const k=(r+0.5)/n;
   let hw=Math.max(0.5,Math.sin(Math.PI*Math.pow(k,0.55))*wid);
   // рваный край: местами лепесток «выкушен»
   const rag=((r*7+n)%5===0)?0.62:1;
   hw*=rag;
   const dx=curl*k*k*len*0.16;              // кончик загибается — лепесток обвис
   const gy=-r-1, tip=k>0.60;
   px(-hw+dx,gy,hw*2,1,tip?pal[2]:pal[1]);
   px(-hw+dx,gy,Math.max(0.8,hw*0.5),1,tip?pal[1]:pal[0]);
   px(hw+dx-0.9,gy,0.9,1,tip?pal[3]:pal[2]);
   px(-hw+dx-0.8,gy,0.8,1,pal[3]);px(hw+dx,gy,0.8,1,pal[3]);
   if(r%4===2){px(-0.4+dx,gy,0.8,1,pal[2]);}       // жилка
  }
 };
 const PET=[PT,PT2,PTD,PTX], LEF=[STL,ST,STD,STX];
 c.save();
 c.imageSmoothingEnabled=false;
 c.translate(0,(-0.25+0.25*breath)*P);
 // ---- корни-когти ----
 [-7,-3.2,0.6,4.4].forEach((rx,i)=>{
  const wob=Math.sin(t*1.25+i*1.7)*0.35;
  px(rx,-2.4,3,2.4,STD);
  px(rx+wob,-1.1,2.4,1.1,STX);
  px(rx-0.9+wob,-1,1.3,1,STX);
 });
 px(-5,-4.4,10,2,ST);px(-5,-4.4,10,0.9,STD);px(-5,-2.6,10,0.8,STX);
 // ---- стебель: узловатый, с шипами, слегка ведёт из стороны в сторону ----
 const H0=25;
 const sx=(r)=>Math.sin(t*0.9+r*0.11)*1.35*(r/H0)+sway*0.3*(r/H0)+twitch*0.5*(r/H0);
 for(let r=0;r<H0;r++){
  const gy=-4-r,dx=sx(r),hw=1.9-0.5*(r/H0);
  px(-hw+dx,gy,hw*2,1,ST);
  px(-hw+dx,gy,0.9,1,STL);
  px(hw+dx-1,gy,1,1,STD);
  px(-hw+dx-0.9,gy,0.9,1,STX);px(hw+dx,gy,0.9,1,STX);
  if(r%7===3){px(-hw+dx-0.3,gy,hw*2+0.6,1,STD);}      // узлы
  if(r%5===1){const s=(r%10<5)?1:-1;px(dx+(s>0?hw:-hw-1.1),gy-0.2,1.1,0.9,STD);} // шипы
 }
 // ---- обвисшие листья вместо рук ----
 [[11,-1,2.35],[16,1,-2.35],[7,1,-2.05]].forEach((L,i)=>{
  const r=L[0],sg=L[1],base=L[2];
  const dx=sx(r),swing=Math.sin(t*1.15+i*1.4)*0.10;
  c.save();c.translate((dx+sg*2.1)*P,(-4-r)*P);c.rotate(base+swing);
  blade(8.5-i*0.8,2.5,LEF);
  c.restore();
 });
 // ---- капли сока со стебля ----
 for(let i=0;i<3;i++){
  const ph=(t*0.42+i*0.41)%1;
  c.globalAlpha=0.15+0.45*Math.sin(ph*Math.PI);
  px(sx(9+i*4)+(i%2?1.6:-2.4),-12-i*4+ph*7,0.9,1.6,'#8fbe52');
  c.globalAlpha=1;
 }
 // ================= ВЕНЧИК =================
 c.save();
 c.translate(sx(H0)*P,(-4-H0)*P);
 c.rotate(tilt);
 // лепестки по кругу — разной длины, часть надорвана
 const LN=[15,18,12.5,19,16,11,17.5,14,19,13,16.5];
 for(let i=0;i<LN.length;i++){
  const a=(i/LN.length)*Math.PI*2+Math.PI+Math.sin(t*0.8+i*0.9)*0.07;
  const ln=LN[i]*(0.93+0.07*Math.sin(t*1.6+i));
  c.save();c.translate(0,-9.5*P);c.rotate(a);
  blade(ln,ln*0.21,PET,(i%2?1:-1)*(1.0+0.4*Math.sin(t*1.1+i)));
  c.restore();
 }
 // ---- сердцевина: чёрная воронка ----
 for(let r=0;r<13;r++){
  const gy=-15.5+r;
  const k=(r-6)/7;
  const hw=Math.sqrt(Math.max(0,1-k*k))*7.8;
  if(hw<0.6)continue;
  px(-hw,gy,hw*2,1,CORE);
  px(-hw,gy,1,1,THR);px(hw-1,gy,1,1,'#0d1f07');
  px(-hw-0.9,gy,0.9,1,PTD);px(hw,gy,0.9,1,PTD);
 }
 // тёплое гнилое свечение из глубины
 if(opts.glow!==false){
  c.save();c.globalCompositeOperation='lighter';
  const g0=c.createRadialGradient(0,-8*P,0,0,-8*P,9*P);
  g0.addColorStop(0,`rgba(150,225,90,${(0.16+0.07*Math.abs(breath)).toFixed(2)})`);
  g0.addColorStop(1,'rgba(150,225,90,0)');
  c.fillStyle=g0;c.beginPath();c.arc(0,-8*P,9*P,0,Math.PI*2);c.fill();
  c.restore();
 }
 // ---- кольцо игольчатых зубов вокруг пасти ----
 const NT=13;
 for(let i=0;i<NT;i++){
  const a=(i/NT)*Math.PI*2+Math.sin(t*2.1)*0.04;
  if(((i*7)%5)===0)continue;                      // часть зубов выломана
  const rr=6.0, ln=2.6+((i*5)%3)*1.3+0.35*Math.sin(t*3+i);
  c.save();c.translate(Math.sin(a)*rr*P,(-7.6-Math.cos(a)*rr)*P);c.rotate(a+Math.PI);
  for(let r=0;r<Math.round(ln*2);r++){
   const w=Math.max(0.5,1.15*(1-r/(ln*2)));
   px(-w/2,-r-1,w,1,r>ln*0.55?'#8d9873':(i%2?TOOTH:'#c8d2ab'));
  }
  c.restore();
 }
 // сама пасть: чёрный провал с пульсирующим горлом
 px(-2.6,-9.4,5.2,4,CORE);
 c.globalAlpha=0.35+0.25*Math.abs(Math.sin(t*2.4));
 px(-1.6,-8.6,3.2,2.4,THR);
 c.globalAlpha=1;
 // ---- глаза: глубоко в венчике, светятся и дёргаются ----
 const gz=Math.sin(t*0.75)>0?0.9:-0.3, jt=twitch?0.6:0;
 [[-4.4,-12.6],[1.6,-12.9]].forEach((e,i)=>{
  px(e[0]-0.9,e[1]-0.7,4.4,3.4,'#020701');
  px(e[0],e[1],2.4,1.7,EYE);
  px(e[0]+0.9+gz*0.4+jt,e[1]-0.1,0.7,1.9,PUP);
  px(e[0],e[1],2.4,0.7,'#5f8c2d');
 });
 if(opts.glow!==false){
  c.save();c.globalCompositeOperation='lighter';
  [[-3,-11.5],[3,-11.8]].forEach(e=>{
   const g2=c.createRadialGradient(e[0]*P,e[1]*P,0,e[0]*P,e[1]*P,6*P);
   g2.addColorStop(0,`rgba(190,255,120,${(0.22+0.10*Math.abs(breath)).toFixed(2)})`);
   g2.addColorStop(1,'rgba(190,255,120,0)');
   c.fillStyle=g2;c.beginPath();c.arc(e[0]*P,e[1]*P,6*P,0,Math.PI*2);c.fill();
  });
  c.restore();
 }
 // пыльца/споры вокруг венчика
 for(let i=0;i<6;i++){
  const ph=(t*0.33+i*0.29)%1, a=i*1.05+t*0.25;
  c.globalAlpha=0.10+0.35*Math.sin(ph*Math.PI);
  px(Math.sin(a)*(7+ph*4),-9-Math.cos(a)*4-ph*6,0.9,0.9,'#dcf6a8');
  c.globalAlpha=1;
 }
 c.restore();
 c.restore();
}
// Приход Тархуна: комната гаснет, за спиной светится проём, из темноты выходит он сам.
function drawTarhunArrival(sp){
 const p=Math.max(0,Math.min(1,1-sp.timer/0.7));
 const t=performance.now()/1000,low=document.body.classList.contains('low-end');
 const ease=p*p*(3-2*p);
 const cx=W*.5, feet=H*.715, hgt=H*.40*(0.90+0.10*ease);
 const P=hgt/41;                                  // размер пиксельного блока
 const flick=0.88+0.12*Math.sin(t*7.3)+0.04*Math.sin(t*23.1);
 const GRN='138,214,96';
 ctx.save();
 ctx.globalAlpha=Math.min(1,0.40+1.35*p);
 // ---- комната тонет в темноте ----
 const dk=ctx.createRadialGradient(cx,H*.52,H*.10,cx,H*.52,H*.95);
 dk.addColorStop(0,'rgba(2,6,4,.50)');dk.addColorStop(.5,'rgba(1,4,3,.84)');dk.addColorStop(1,'rgba(0,1,1,.97)');
 ctx.fillStyle=dk;ctx.fillRect(0,0,W,H);
 // ---- проём двери за спиной ----
 const dw=hgt*.60,dh=hgt*1.06;
 ctx.save();ctx.translate(cx,feet-dh*.44);ctx.scale(1,dh/dw);
 const dg=ctx.createRadialGradient(0,0,dw*.05,0,0,dw*.62);
 dg.addColorStop(0,`rgba(${GRN},${(0.24*flick).toFixed(3)})`);
 dg.addColorStop(.45,`rgba(${GRN},${(0.11*flick).toFixed(3)})`);
 dg.addColorStop(1,'rgba(18,38,24,0)');
 ctx.fillStyle=dg;ctx.beginPath();ctx.arc(0,0,dw*.62,0,Math.PI*2);ctx.fill();ctx.restore();
 ctx.save();ctx.globalCompositeOperation='lighter';
 const hl=ctx.createRadialGradient(cx,feet-hgt*.55,hgt*.05,cx,feet-hgt*.55,hgt*.90);
 hl.addColorStop(0,`rgba(${GRN},${(0.15*flick).toFixed(3)})`);hl.addColorStop(1,'rgba(0,0,0,0)');
 ctx.fillStyle=hl;ctx.fillRect(0,0,W,H);ctx.restore();
 // ---- контактная тень и зелёный отсвет на полу ----
 const sh=ctx.createRadialGradient(cx,feet+4,4,cx,feet+4,hgt*.34);
 sh.addColorStop(0,'rgba(0,0,0,.82)');sh.addColorStop(1,'rgba(0,0,0,0)');
 ctx.save();ctx.translate(cx,feet+4);ctx.scale(1,0.24);
 ctx.fillStyle=sh;ctx.beginPath();ctx.arc(0,0,hgt*.34,0,Math.PI*2);ctx.fill();ctx.restore();
 ctx.save();ctx.globalCompositeOperation='lighter';
 const rf=ctx.createLinearGradient(0,feet,0,feet+hgt*.20);
 rf.addColorStop(0,`rgba(${GRN},${(0.11*flick).toFixed(3)})`);rf.addColorStop(1,'rgba(0,0,0,0)');
 ctx.fillStyle=rf;ctx.fillRect(cx-hgt*.30,feet,hgt*.60,hgt*.20);ctx.restore();
 // ---- сам Тархун: выходит из темноты, чуть подаётся вперёд ----
 ctx.save();
 ctx.globalAlpha=Math.min(1,0.25+2.2*p);
 ctx.translate(cx,feet+(1-ease)*10);
 drawTarhunSprite(ctx,P,t,{glow:true,low});
 ctx.restore();
 // ---- воздух: редкие светящиеся пузырьки-спорки ----
 if(!low){
  const hs=(n)=>{const v=Math.sin(n*127.1+Math.floor(n)*0.7913)*43758.5453;return v-Math.floor(v);};
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(let i=0;i<32;i++){
   const a=(t*0.18+hs(i*5.1))%1;
   const mx=cx+(hs(i*3.7)-.5)*hgt*0.70, my=feet-a*hgt*1.05;
   ctx.fillStyle=`rgba(198,240,164,${(0.05+0.13*(1-a)).toFixed(3)})`;
   ctx.fillRect(mx,my,2,2);
  }
  ctx.restore();
 }
 ctx.restore();
}
// Стабильные «случайные» отклонения, чтобы форма морды не кипела каждый кадр.
const SCR_J=Array.from({length:64},(_,i)=>{const v=Math.sin(i*12.9898)*43758.5453;return v-Math.floor(v);});
function scrJ(i){return SCR_J[i%64];}
// ===== V66: НОВЫЙ СКРИМЕР — ПИКСЕЛЬНАЯ МОРДА В УПОР =====
// Старый скример был гладкой векторной мордой с подтёками. Теперь это резкая
// пиксельная маска, которая вылетает в объектив: рваный череп из блоков, горящие
// глаза, пасть с кривыми зубами. У Тархуна над головой рвётся лист — узнаётся сразу.
function drawScreamFace(c,P,t,p,PAL,leafy){
 const px=(gx,gy,gw,gh,col)=>{c.fillStyle=col;c.fillRect(Math.round(gx*P),Math.round(gy*P),Math.max(1,Math.round(gw*P)),Math.max(1,Math.round(gh*P)));};
 const j=scrJ;
 // ---- V67: венчик вокруг морды (Тархун-цветок) — рисуется первым, позади ----
 if(leafy){
  const PT='#c3cf97',PT2='#8b9a68',PTD='#4a5530',PTX='#101508';
  const thrash=Math.sin(t*9.5)*0.07;
  for(let i=0;i<13;i++){
   const a=(i/13)*Math.PI*2+Math.PI+thrash*(i%2?1:-1);
   const len=34+j(i*3)*18, wid=len*0.19;
   c.save();c.translate(0,2*P);c.rotate(a);
   const n=Math.round(len);
   for(let r=0;r<n;r++){
    const k=(r+0.5)/n;
    let hw=Math.max(0.6,Math.sin(Math.PI*Math.pow(k,0.6))*wid);
    if(((r*7+i)%6)===0)hw*=0.62;                 // рваный край
    const gy=-r-1, far=k>0.66;
    px(-hw,gy,hw*2,1,far?PTD:PT2);
    px(-hw,gy,Math.max(0.8,hw*0.5),1,far?PT2:PT);
    px(hw-0.9,gy,0.9,1,PTD);
    px(-hw-0.8,gy,0.8,1,PTX);px(hw,gy,0.8,1,PTX);
    if(r%5===2)px(-0.4,gy,0.8,1,PTD);
   }
   c.restore();
  }
 }
 // ---- череп: пиксельные ряды с рваным краем ----
 for(let r=0;r<36;r++){
  const k=r/35;
  let hw=21-Math.pow(Math.abs(k-0.40)*2.05,2.5)*8-j(r)*1.6;
  hw=Math.max(6,hw);
  const gy=-18+r;
  px(-hw,gy,hw*2,1,PAL.G1);
  px(-hw,gy,3,1,PAL.M);px(-hw,gy,1.2,1,PAL.L);
  px(hw-3,gy,3,1,PAL.D);px(hw-1.2,gy,1.2,1,PAL.DD);
 }
 // стыки плит и трещины
 for(let i=1;i<5;i++)px(-20,-16+i*8,40,0.7,'rgba(0,0,0,.45)');
 for(let i=0;i<10;i++){
  const crx=-18+j(i*3)*36, cry=-16+j(i*3+1)*30;
  for(let s=0;s<4;s++)px(crx+ (j(i*5+s)-.5)*3,cry+s*1.4,0.9,1.4,'rgba(0,0,0,.5)');
 }
 // ---- глазницы: рваные провалы с горящими зрачками ----
 const flick=.7+.3*Math.abs(Math.sin(t*21));
 [-15.5,6.5].forEach((ex,i)=>{
  px(ex-0.6,-12.4,10,7.6,'#04060a');
  const wob=Math.round(Math.sin(t*12+i*1.7)*1.3);
  c.save();c.globalCompositeOperation='lighter';
  const g2=c.createRadialGradient((ex+4.5)*P,(-8.6)*P,0,(ex+4.5)*P,(-8.6)*P,11*P);
  g2.addColorStop(0,`rgba(${PAL.A},${(0.55*flick).toFixed(2)})`);g2.addColorStop(1,`rgba(${PAL.A},0)`);
  c.fillStyle=g2;c.beginPath();c.arc((ex+4.5)*P,-8.6*P,11*P,0,Math.PI*2);c.fill();
  c.restore();
  if(leafy){
   px(ex+3.2+wob,-10.6,2.6,3.4,PAL.GLW);
   px(ex+3.8+wob,-9.6,1,1.4,'#ffffff');
   px(ex-0.6,-12.4,10,2.2,'#02060a');           // тяжёлое веко сверху
  }else{
   px(ex+2.4+wob,-11,4.4,4.4,PAL.GLW);
   px(ex+3.4+wob,-10,2,2,'#ffffff');
  }
 });
 const TW1=leafy?'#b9c496':'#eef4e2', TW2=leafy?'#98a377':'#d9e2cc';
 // ---- пасть: рваный провал, кривые зубы, глотка ----
 const open=8+p*5+Math.abs(Math.sin(t*12))*0.9;
 px(-14,1.5,28,open+7,PAL.MAW);
 c.save();c.globalCompositeOperation='lighter';
 const th=c.createRadialGradient(0,(4+open*.5)*P,0,0,(4+open*.5)*P,13*P);
 th.addColorStop(0,`rgba(${PAL.THR},.40)`);th.addColorStop(1,`rgba(${PAL.THR},0)`);
 c.fillStyle=th;c.fillRect(-14*P,1.5*P,28*P,(open+7)*P);
 c.restore();
 // верхние зубы
 for(let i=0;i<9;i++){
  if(j(i+17)>.87)continue;
  const tx=-13.4+i*3.05, hgt=2+Math.round(j(i)*3);
  for(let r=0;r<hgt;r++)px(tx+r*0.32,1.5+r,Math.max(0.7,2.7-r*(2.0/hgt)),1,i%2?TW1:TW2);
 }
 // нижние зубы
 const by=1.5+open+7;
 for(let i=0;i<9;i++){
  if(j(i+41)>.88)continue;
  const tx=-13+i*3.0, hgt=2+Math.round(j(i+29)*3);
  for(let r=0;r<hgt;r++)px(tx+r*0.32,by-1-r,Math.max(0.7,2.5-r*(1.9/hgt)),1,i%2?TW2:TW1);
 }
 // ---- обвод силуэта светом из темноты ----
 c.save();c.globalCompositeOperation='lighter';
 c.fillStyle=`rgba(${PAL.A},.10)`;
 for(let r=0;r<36;r+=2){
  const k=r/35;let hw=21-Math.pow(Math.abs(k-0.40)*2.05,2.5)*8-j(r)*1.6;hw=Math.max(6,hw);
  px(-hw-1,-18+r,1.2,2,`rgba(${PAL.A},.22)`);
  px(hw-0.2,-18+r,1.2,2,`rgba(${PAL.A},.14)`);
 }
 c.restore();
 // ---- V67: пыльца и тонкие тычинки над пастью (только цветок) ----
 if(leafy){
  for(let i=0;i<7;i++){
   const a=-1.35+i*0.45+Math.sin(t*7.5+i)*0.05;
   c.save();c.translate((-8+i*2.7)*P,-13*P);c.rotate(a*0.35);
   for(let r=0;r<5;r++)px(-0.45,-r-1,0.9,1,'#5f6d3d');
   px(-0.9,-6.2,1.8,1.6,'#c3cf97');
   c.restore();
  }
 }
}
function drawScreamer(sc){
 const p=Math.max(0,Math.min(1,sc.power)),t=performance.now()/1000;
 const low=document.body.classList.contains('low-end');
 // Палитры: Тархун — травянисто-зелёный и мельче; камера — фиолетовая; атака — красная.
 const PAL=sc.kind==='camera'
   ?{A:'226,124,255',L:'f0c6ff',GLW:'#f0b6ff',M:'#7e3bb0',G1:'#5a2482',D:'#3a1256',DD:'#1e0530',MAW:'#170322',THR:'190,70,240',bg:'#050208',sc:0.94,jit:1.0,vig:.58,leaf:false}
   :sc.kind==='tarhun'
   ?{A:'150,225,95',L:'#cfeaa2',GLW:'#c2f77e',M:'#4e8a28',G1:'#356f1c',D:'#1e4a11',DD:'#0d2607',MAW:'#050f05',THR:'110,200,95',bg:'#010401',sc:0.62,jit:1.9,vig:.80,leaf:true}
   :{A:'246,60,74',L:'#ffd0d4',GLW:'#ff9aa2',M:'#a8202e',G1:'#7d1420',D:'#560c14',DD:'#2c060a',MAW:'#140306',THR:'220,40,60',bg:'#040203',sc:0.96,jit:1.1,vig:.60,leaf:false};
 PAL.L=PAL.L.startsWith('#')?PAL.L:'#'+PAL.L;
 ctx.save();
 // тряска: пиксельная, шагами по блоку — картинка не «плывёт», а бьёт
 const jit=((1-p)*3+p*20)*PAL.jit;
 const q=Math.floor(t*24);
 const hs=(n)=>{const v=Math.sin(n*127.1+Math.floor(n)*0.7913)*43758.5453;return v-Math.floor(v);};
 ctx.translate(Math.round((hs(q*1.3)-.5)*jit),Math.round((hs(q*2.7)-.5)*jit));
 // фон: почти чёрный, за головой тлеет свет
 ctx.fillStyle=PAL.bg;ctx.fillRect(-60,-60,W+120,H+120);
 const bgg=ctx.createRadialGradient(W*.5,H*.46,18,W*.5,H*.5,Math.max(W,H)*.62);
 bgg.addColorStop(0,`rgba(${PAL.A},.18)`);bgg.addColorStop(.42,'rgba(6,10,8,.86)');bgg.addColorStop(1,'#000');
 ctx.fillStyle=bgg;ctx.fillRect(0,0,W,H);
 // ---- морда ----
 ctx.save();
 ctx.imageSmoothingEnabled=false;
 ctx.translate(W*.5,H*.50);
 const P=(H/44)*(1+p*0.55)*PAL.sc*Math.min(1.25,Math.max(0.8,W/1280+0.34));
 drawScreamFace(ctx,P,t,p,PAL,PAL.leaf);
 ctx.restore();
 // ---- брызги и пыль блоками ----
 ctx.save();ctx.globalCompositeOperation='lighter';
 const nsp=low?10:(sc.kind==='tarhun'?20:34);
 for(let i=0;i<nsp;i++){
  const a=hs(q*3.1+i*7.7), b=hs(q*5.3+i*3.3);
  const sx=W*.5+(a-.5)*W*(sc.kind==='tarhun'?.42:.78), sy=H*.5+(b-.5)*H*.82;
  ctx.fillStyle=`rgba(${PAL.A},${(0.06+0.16*hs(i*2.2+q)).toFixed(3)})`;
  ctx.fillRect(Math.round(sx),Math.round(sy),2+Math.round(hs(i*4.4)*3),2+Math.round(hs(i*6.6)*3));
 }
 ctx.restore();
 // ---- срыв сигнала: широкие блочные полосы, шагами по 1/16 секунды ----
 const qq=Math.floor(t*16);
 ctx.save();ctx.globalAlpha=.30+.35*p;
 for(let i=0;i<(low?4:8);i++){
  const yy=Math.round(hs(qq*1.9+i*3.7)*H), hh2=Math.round(3+hs(qq*2.9+i*5.1)*16);
  ctx.fillStyle=i%3?`rgba(${PAL.A},.42)`:'rgba(150,225,255,.22)';
  ctx.fillRect(Math.round((hs(qq*4.1+i)-.5)*W*.12),yy,W,hh2);
 }
 ctx.restore();
 // ---- пиксельные сканлайны поверх всего ----
 ctx.save();ctx.fillStyle='rgba(0,0,0,.22)';
 for(let y=0;y<H;y+=4)ctx.fillRect(0,y,W,2);
 ctx.restore();
 // ---- тяжёлая виньетка и вспышка в первый миг ----
 const vg=ctx.createRadialGradient(W*.5,H*.48,Math.min(W,H)*.20,W*.5,H*.5,Math.max(W,H)*.72);
 vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(.42,`rgba(0,0,0,${PAL.vig.toFixed(2)})`);vg.addColorStop(1,'rgba(0,0,0,.98)');
 ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
 if(p>.86){const f=(p-.86)/.14;ctx.fillStyle=`rgba(${PAL.A},${(0.34*f).toFixed(3)})`;ctx.fillRect(0,0,W,H);}
 ctx.restore();
}
// ===== ГРУНТОВКА АНИМАТРОНИКОВ НА КАМЕРАХ =====
// Фигура больше не висит поверх картинки: ступни ставятся точно на пол, размер считается
// от глубины комнаты, под ногами есть мягкая контактная тень, а сам спрайт затемняется
// под освещённость сцены (снизу темнее, сверху свет потолочных ламп).
const MON_FEET=70, MON_TOP=-90, MON_HALFW=58;   // локальные границы спрайта
let _monTmp=null;
function monPalette(kind){
 return kind==='felix'?{glow:'255,111,176',eye:'255,208,232'}
      : kind==='exo'  ?{glow:'121,236,255',eye:'230,254,255'}
      : kind==='lav'  ?{glow:'255,208,72', eye:'255,246,190'}
      :                {glow:'255,70,88',  eye:'255,102,114'};
}
// Мелкий пиксельный шрифт 3x5 — нужен для надписи LAV на футболке четвёртого.
const PIXFONT={L:['100','100','100','100','111'],A:['111','101','111','101','101'],V:['101','101','101','101','010']};
function pixText3x5(ctx,text,x,y,px,color){
 ctx.fillStyle=color;
 let cx=x;
 for(const ch of text.toUpperCase()){
   const g=PIXFONT[ch];
   if(g){for(let r=0;r<5;r++)for(let c=0;c<3;c++)if(g[r][c]==='1')ctx.fillRect(cx+c*px,y+r*px,px,px);}
   cx+=px*4;
 }
}
// V82: обёртка текста по ширине
function wrapText(c,txt,x,y,maxW,lh,size){
 c.font=`${size}px "Inter",Arial,sans-serif`;c.textAlign='left';c.textBaseline='top';
 const words=String(txt).split(/\s+/);let line='',cy=y;
 for(const w of words){const test=line?line+' '+w:w; if(c.measureText(test).width>maxW && line){c.fillText(line,x,cy);line=w;cy+=lh;}
   else line=test;}
 if(line)c.fillText(line,x,cy);c.textBaseline='alphabetic';
}
// V82: процедурная иконка достижения — каждая ачивка получает свой значок
function drawAchievementIcon(ctx,id,ix,iy,ok,pl){
 const col=ok?'#e8c96f':'#5a646d', dim=ok?'#6a4f16':'#3f484f';
 // мягкое свечение для полученных
 if(ok){ctx.save();ctx.globalCompositeOperation='lighter';
   const mg=ctx.createRadialGradient(ix,iy,0,ix,iy,17);
   mg.addColorStop(0,`rgba(238,200,104,${(.34+.14*pl).toFixed(3)})`);mg.addColorStop(1,'rgba(238,200,104,0)');
   ctx.fillStyle=mg;ctx.beginPath();ctx.arc(ix,iy,17,0,Math.PI*2);ctx.fill();ctx.restore();}
 ctx.save();ctx.lineWidth=1.6;ctx.strokeStyle=col;ctx.fillStyle=col;
 const L=8.5;
 const draw=(id)=>{
  switch(id){
   case 'first_blood': // луна
     ctx.beginPath();ctx.arc(ix,iy+1,L,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();
     ctx.fillStyle=dim;ctx.beginPath();ctx.arc(ix+3,iy-2,1.6,0,Math.PI*2);ctx.fill();
     ctx.beginPath();ctx.arc(ix-2,iy+3,1.2,0,Math.PI*2);ctx.fill();
     break;
   case 'call_answered': // телефонная трубка
     ctx.beginPath();ctx.moveTo(ix-L,iy-L*0.4);ctx.lineTo(ix-L+3,iy-2);
     ctx.lineTo(ix-2,iy-2);ctx.lineTo(ix,iy);ctx.lineTo(ix+2,iy-2);
     ctx.lineTo(ix+L-3,iy-2);ctx.lineTo(ix+L,iy-L*0.4);
     ctx.lineTo(ix+L-2,iy+L*0.5);ctx.lineTo(ix+2,iy+1);
     ctx.lineTo(ix,iy+3);ctx.lineTo(ix-2,iy+1);
     ctx.lineTo(ix+2-L,iy+L*0.5);ctx.closePath();ctx.fill();
     break;
   case 'radio_listener': // радиоволны
     ctx.beginPath();ctx.arc(ix-3,iy,2.5,0,Math.PI*2);ctx.fill();
     for(let r=4;r<=10;r+=3){ctx.beginPath();ctx.arc(ix-3,iy,r,-0.6,0.6);ctx.stroke();}
     break;
   case 'watcher': // глаз
     ctx.beginPath();ctx.ellipse(ix,iy,L,L*0.6,0,0,Math.PI*2);ctx.stroke();
     ctx.beginPath();ctx.arc(ix,iy,3,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();
     break;
   case 'power_saver': // молния
     ctx.beginPath();ctx.moveTo(ix+2,iy-L);ctx.lineTo(ix-3,iy);
     ctx.lineTo(ix+1,iy);ctx.lineTo(ix-2,iy+L);ctx.lineTo(ix+4,iy-2);
     ctx.lineTo(ix,iy-2);ctx.closePath();ctx.fillStyle=col;ctx.fill();
     break;
   case 'door_keeper': // дверь с засовом
     ctx.fillStyle=dim;ctx.fillRect(ix-4,iy-L,8,L*2);
     ctx.strokeStyle=col;ctx.strokeRect(ix-4,iy-L,8,L*2);
     ctx.beginPath();ctx.moveTo(ix,iy-2);ctx.lineTo(ix+6,iy-2);ctx.stroke();
     break;
   case 'felix_signal': // кроличьи уши + сигнал
     ctx.beginPath();ctx.moveTo(ix-5,iy+2);ctx.lineTo(ix-6,iy-L);ctx.lineTo(ix-2,iy+1);ctx.fill();
     ctx.beginPath();ctx.moveTo(ix+5,iy+2);ctx.lineTo(ix+6,iy-L);ctx.lineTo(ix+2,iy+1);ctx.fill();
     ctx.beginPath();ctx.arc(ix,iy+3,2,0,Math.PI*2);ctx.fill();
     break;
   case 'five_nights': // 5 полосок
     for(let i=0;i<5;i++){ctx.fillRect(ix-8+i*3.4,iy-L+(i%2)*2,2.4,L*2-(i%2)*2);}
     break;
   case 'night_owl': // сова
     ctx.beginPath();ctx.arc(ix,iy+1,5,0,Math.PI*2);ctx.fill();
     ctx.fillStyle=dim;ctx.fillRect(ix-4,iy-1,2,2);ctx.fillRect(ix+2,iy-1,2,2);
     ctx.beginPath();ctx.moveTo(ix-6,iy-3);ctx.lineTo(ix-4,iy+1);ctx.lineTo(ix-6,iy+2);ctx.fill();
     ctx.beginPath();ctx.moveTo(ix+6,iy-3);ctx.lineTo(ix+4,iy+1);ctx.lineTo(ix+6,iy+2);ctx.fill();
     break;
   case 'archive': // кассета
     ctx.fillStyle=dim;ctx.fillRect(ix-L,iy-3,L*2,6);ctx.strokeRect(ix-L,iy-3,L*2,6);
     ctx.fillStyle=col;ctx.beginPath();ctx.arc(ix-3,iy,1.6,0,Math.PI*2);ctx.fill();
     ctx.beginPath();ctx.arc(ix+3,iy,1.6,0,Math.PI*2);ctx.fill();
     break;
   case 'radio_again': // стрелка повтора
     ctx.beginPath();ctx.arc(ix,iy,6,-0.9,Math.PI*1.6);ctx.stroke();
     ctx.beginPath();ctx.moveTo(ix+4,iy-6);ctx.lineTo(ix+6,iy-2);ctx.lineTo(ix+2,iy-2);ctx.fill();
     break;
   case 'last_shift': // закат над линией
     ctx.beginPath();ctx.arc(ix,iy,4,0,Math.PI,true);ctx.fill();
     ctx.beginPath();ctx.moveTo(ix-L,iy);ctx.lineTo(ix+L,iy);ctx.stroke();
     break;
   case 'ending_dawn': // рассвет
     ctx.beginPath();ctx.arc(ix,iy,4,0,Math.PI,true);ctx.fill();
     for(let a=0;a<4;a++){const an=a*Math.PI/4;ctx.beginPath();ctx.moveTo(ix+Math.cos(an)*5,iy-Math.sin(an)*5);ctx.lineTo(ix+Math.cos(an)*8,iy-Math.sin(an)*8);ctx.stroke();}
     ctx.beginPath();ctx.moveTo(ix-L,iy);ctx.lineTo(ix+L,iy);ctx.stroke();
     break;
   case 'ending_truth': // V84: кассета — концовка «ПРАВДА»
     ctx.strokeRect(ix-L,iy-L*0.62,L*2,L*1.24);
     ctx.fillStyle=dim;ctx.fillRect(ix-L*0.62,iy-L*0.24,L*1.24,L*0.5);
     ctx.fillStyle=col;ctx.beginPath();ctx.arc(ix-L*0.34,iy,1.5,0,Math.PI*2);ctx.fill();
     ctx.beginPath();ctx.arc(ix+L*0.34,iy,1.5,0,Math.PI*2);ctx.fill();
     break;
   case 'ending_ash': // пламя
     ctx.beginPath();ctx.moveTo(ix,iy-L);ctx.quadraticCurveTo(ix-L,iy,ix-L*0.5,iy+L);
     ctx.quadraticCurveTo(ix,iy+L*0.4,ix+L*0.5,iy+L);ctx.quadraticCurveTo(ix+L,iy,ix,iy-L);ctx.fill();
     break;
   case 'ending_suit': // силуэт аниматроника
     ctx.beginPath();ctx.moveTo(ix,iy-L);ctx.lineTo(ix-5,iy-3);ctx.lineTo(ix-5,iy+L);
     ctx.lineTo(ix+5,iy+L);ctx.lineTo(ix+5,iy-3);ctx.closePath();ctx.fill();
     ctx.fillStyle=dim;ctx.fillRect(ix-2,iy-1,4,2);
     break;
   case 'ending_trap': // цепь-ловушка
     ctx.beginPath();ctx.arc(ix-L*0.5,iy,3,0,Math.PI*2);ctx.stroke();
     ctx.beginPath();ctx.arc(ix+L*0.5,iy,3,0,Math.PI*2);ctx.stroke();
     ctx.beginPath();ctx.moveTo(ix-L*0.5+3,iy);ctx.lineTo(ix+L*0.5-3,iy);ctx.stroke();
     break;
   case 'too_many_deaths': // пять черт + череп
     for(let i=0;i<5;i++)ctx.fillRect(ix-9+i*4.4,iy+2,1.6,6);
     ctx.beginPath();ctx.arc(ix,iy-3,3,0,Math.PI*2);ctx.fill();
     break;
   case 'stepa_call': // V111: телефонная трубка с разрывом линии — длинный номер
     ctx.strokeRect(ix-L,iy-L*0.5,L*2,L);
     ctx.beginPath();ctx.arc(ix-L*0.6,iy,2.4,0,Math.PI*2);ctx.stroke();
     ctx.beginPath();ctx.moveTo(ix-L*0.36,iy);ctx.lineTo(ix+L*0.5,iy);ctx.stroke();
     // три искры обрыва связи
     for(let k=0;k<3;k++)ctx.fillRect(ix+L*0.54+k*2,iy-0.6,1.2,1.2);
     break;
   default: // медаль
     ctx.beginPath();ctx.arc(ix,iy,7,0,Math.PI*2);ctx.fill();
     ctx.fillStyle=dim;ctx.beginPath();ctx.arc(ix,iy,4,0,Math.PI*2);ctx.fill();
  }
 };
 if(!ok){ // «закрыто» — затемнённый значок + замок
   ctx.globalAlpha=0.45;
   draw(id);
   ctx.globalAlpha=1;
   ctx.strokeStyle='rgba(120,132,142,.7)';
   ctx.beginPath();ctx.arc(ix,iy-4,3.5,Math.PI,0);ctx.stroke();
   ctx.fillStyle='rgba(96,108,118,.6)';ctx.fillRect(ix-4,iy-1,8,6);
 }else draw(id);
 ctx.restore();
}
function drawGroundedMonster(ctx,x,groundY,mon,scale,opts){
 opts=opts||{};
 const t=performance.now()/1000, pal=monPalette(mon&&mon.kind), low=document.body.classList.contains('low-end');
 // V80: те же опции, что были у кукольного epiAnimatron, теперь работают на
 // настоящей модели — поэтому в эпилоге и на камерах стоит один и тот же
 // аниматроник, а не две разные фигуры.
 const mirror=(opts.face===undefined?1:opts.face)>=0?1:-1;   // разворот влево/вправо
 const silh=Math.max(0,Math.min(1,opts.dark||0));            // затемнение до силуэта
 const eyeK=opts.eyeK===undefined?1:opts.eyeK;               // яркость глазниц
 const lean=opts.lean||0;                                    // наклон корпуса к жертве
 const hh=(MON_FEET-MON_TOP)*scale;                 // полный рост фигуры
 const seed=(x%97)/97*6.28;
 const alarmed=mon&&mon.state==='preparingAttack';
 // сумрак вокруг фигуры: тёмный ореол, из которого она выступает
 if(opts.aura!==false){
   const ag=ctx.createRadialGradient(x,groundY-hh*.48,hh*.08,x,groundY-hh*.48,hh*.95);
   ag.addColorStop(0,'rgba(2,3,5,.44)');ag.addColorStop(.55,'rgba(2,3,5,.22)');ag.addColorStop(1,'rgba(2,3,5,0)');
   ctx.fillStyle=ag;ctx.fillRect(x-hh,groundY-hh*1.5,hh*2,hh*2);
 }
 // контактная тень + вытянутая тень от фигуры
 const sw=Math.max(6,52*scale), sh=Math.max(2,sw*0.28);
 ctx.save();ctx.translate(x,groundY);ctx.scale(1,sh/sw);
 const sg=ctx.createRadialGradient(0,0,1,0,0,sw);
 sg.addColorStop(0,`rgba(0,0,0,${opts.shadow===undefined?.86:opts.shadow})`);sg.addColorStop(.55,'rgba(0,0,0,.36)');sg.addColorStop(1,'rgba(0,0,0,0)');
 ctx.fillStyle=sg;ctx.fillRect(-sw,-sw,sw*2,sw*2);ctx.restore();
 ctx.save();ctx.globalAlpha=.34;ctx.fillStyle='#000';
 ctx.beginPath();ctx.moveTo(x-sw*.30,groundY);ctx.lineTo(x+sw*.30,groundY);
 ctx.lineTo(x+sw*.10+(opts.shadowDir||-1)*sw*1.5,groundY-sh*.55);ctx.lineTo(x-sw*.16+(opts.shadowDir||-1)*sw*1.5,groundY-sh*.55);
 ctx.closePath();ctx.fill();ctx.restore();
 // спрайт в оффскрин, чтобы наложить тональную подгонку только на его пиксели
 const pad=14, bw=Math.ceil((MON_HALFW*2+pad*2)*scale), bh=Math.ceil((MON_FEET-MON_TOP+pad*2)*scale);
 if(bw<2||bh<2)return;
 try{
  if(!_monTmp)_monTmp=document.createElement('canvas');
  const tc=_monTmp;if(tc.width!==bw)tc.width=bw;if(tc.height!==bh)tc.height=bh;
  const tx=tc.getContext('2d');tx.setTransform(1,0,0,1,0,0);tx.clearRect(0,0,bw,bh);
  tx.save();tx.translate((MON_HALFW+pad)*scale,(-MON_TOP+pad)*scale);
  drawPixelMonster(tx,0,0,mon,scale,{noShadow:true});
  tx.restore();
  tx.globalCompositeOperation='source-atop';
  // тональная подгонка: свет сверху, ноги тонут в темноте
  const tg=tx.createLinearGradient(0,0,0,bh);
  tg.addColorStop(0,`rgba(20,28,36,${opts.topTint===undefined?.20:opts.topTint})`);
  tg.addColorStop(.55,'rgba(6,9,13,.40)');
  tg.addColorStop(1,`rgba(2,4,6,${opts.footTint===undefined?.70:opts.footTint})`);
  tx.fillStyle=tg;tx.fillRect(0,0,bw,bh);
  // воздушная дымка: чем дальше фигура, тем сильнее она растворяется в цвете комнаты
  const fog=Math.max(0,Math.min(.5,opts.fog===undefined?.16:opts.fog));
  if(fog>0){tx.fillStyle=`rgba(${opts.fogColor||'26,36,46'},${fog.toFixed(3)})`;tx.fillRect(0,0,bw,bh);}
  // холодная десатурация корпуса
  tx.fillStyle='rgba(16,24,32,.16)';tx.fillRect(0,0,bw,bh);
  // V80: силуэт затемняется ПО ПИКСЕЛЯМ фигуры (source-atop), поэтому в темноте
  // виден контур аниматроника, а не чёрный прямоугольник вокруг него.
  if(silh>0){tx.fillStyle='rgba(3,5,10,'+silh.toFixed(3)+')';tx.fillRect(0,0,bw,bh);}
  tx.globalCompositeOperation='source-over';
  const dx=x-(MON_HALFW+pad)*scale, dy=groundY-(MON_FEET-MON_TOP+pad)*scale;
  // дыхание: фигура едва заметно колышется, поэтому не выглядит наклейкой
  const breath=1+Math.sin(t*(alarmed?3.1:1.25)+seed)*(alarmed?.020:.011);
  const swayX=Math.sin(t*(alarmed?2.2:.75)+seed)*hh*(alarmed?.012:.006);
  ctx.save();
  ctx.translate(x,groundY);ctx.scale(mirror,breath);ctx.rotate(lean);ctx.translate(-x+swayX*mirror,-groundY);
  ctx.imageSmoothingEnabled=false;
  // холодный контурный ореол вокруг силуэта
  if(!low){
    ctx.save();
    ctx.shadowColor=`rgba(${pal.glow},${alarmed?.38:.26})`;
    ctx.shadowBlur=Math.max(5,hh*(alarmed?.10:.07));
    ctx.globalAlpha=.85;ctx.drawImage(tc,dx,dy);
    ctx.restore();
  }
  ctx.globalAlpha=opts.alpha===undefined?.97:opts.alpha;
  ctx.drawImage(tc,dx,dy);
  ctx.restore();
  // свет из глазниц: мягкое пятно и два узких луча вперёд
  if(!low&&eyeK>0){
    const ex=x+swayX*mirror+Math.sin(lean)*hh*0.74, ey=groundY-hh*.74*Math.cos(lean);
    ctx.save();ctx.globalCompositeOperation='lighter';
    const pulse=alarmed?(.65+.35*Math.abs(Math.sin(t*6.2))):(.55+.20*Math.sin(t*1.6+seed));
    const eg=ctx.createRadialGradient(ex,ey,1,ex,ey,hh*.30);
    eg.addColorStop(0,`rgba(${pal.eye},${(.30*pulse*eyeK).toFixed(3)})`);
    eg.addColorStop(.35,`rgba(${pal.glow},${(.12*pulse*eyeK).toFixed(3)})`);
    eg.addColorStop(1,`rgba(${pal.glow},0)`);
    ctx.fillStyle=eg;ctx.beginPath();ctx.arc(ex,ey,hh*.30,0,Math.PI*2);ctx.fill();
    // отблеск на груди от собственных глаз
    const cg=ctx.createRadialGradient(ex,ey+hh*.22,1,ex,ey+hh*.22,hh*.20);
    cg.addColorStop(0,`rgba(${pal.glow},${(.10*pulse*eyeK).toFixed(3)})`);cg.addColorStop(1,`rgba(${pal.glow},0)`);
    ctx.fillStyle=cg;ctx.beginPath();ctx.ellipse(ex,ey+hh*.22,hh*.20,hh*.14,0,0,Math.PI*2);ctx.fill();
    ctx.restore();
    // редкий подёргивающийся глитч по фигуре
    if(Math.floor(t*9)%23===0){
      ctx.save();ctx.globalAlpha=.35;ctx.imageSmoothingEnabled=false;
      const sy=dy+bh*((Math.floor(t*9)%7)/7);
      ctx.drawImage(tc,0,Math.max(0,sy-dy),bw,Math.max(2,bh*.08),dx+hh*.03,sy,bw,Math.max(2,bh*.08));
      ctx.restore();
    }
  }
 }catch(e){ // если оффскрин недоступен — рисуем напрямую
  drawPixelMonster(ctx,x,groundY-MON_FEET*scale,mon,scale,{noShadow:true});
 }
}
// Точка на полу комнаты по глубине k (0 — у задней стены, 1 — у камеры) и боковому сдвигу a.
function floorSpot(hz,k,a,vpX){
 const hzy=H*hz, gy=hzy+(H-hzy)*k, sp=0.10+0.90*k;
 return {x:W*(vpX===undefined?0.5:vpX)+a*W*sp, y:gy, k};
}
// V84: МЕЛОЧИ И РОБОТИЧЕСКИЕ АКСЕССУАРЫ АНИМАТРОНИКОВ.
// Было: все четверо отличались только цветом корпуса и формой головы — в кадре они
// читались как один и тот же силуэт, и «живого» в них не было ничего.
// Стало: у каждого свой набор навесного железа — бейдж смены с мигающим диодом,
// бабочка на болтах, сервомотор на плече, шлейф проводов, ошейник с бубенцом,
// радиомодуль с бегущей шкалой, свисток, наручные часы. Всё нарисовано теми же
// пиксельными прямоугольниками и живёт: диоды мигают, шкала бежит, бубенец качается.
function monsterAccessories(ctx,m,t,pal){
 const kind=m.kind||'main';
 const blink=(x)=>0.35+0.65*Math.abs(Math.sin(t*x));
 // ---- общее для всех: бейдж смены на груди с мигающим диодом ----
 ctx.fillStyle='#0b1014';ctx.fillRect(-27,-12,13,9);
 ctx.fillStyle='#2b3742';ctx.fillRect(-26,-11,11,7);
 ctx.fillStyle='#8f9aa3';ctx.fillRect(-25,-10,9,2);
 ctx.globalAlpha=blink(3.4);ctx.fillStyle='#63e08a';ctx.fillRect(-18,-6,3,2);ctx.globalAlpha=1;
 // винты по кромке корпуса
 ctx.fillStyle='rgba(190,200,208,.35)';
 [[-28,-16],[26,-16],[-28,30],[26,30]].forEach(p=>ctx.fillRect(p[0],p[1],2,2));
 if(kind==='main'){
  // бабочка на болтах под мордой
  ctx.fillStyle='#6b1119';ctx.fillRect(-14,-24,10,9);ctx.fillRect(4,-24,10,9);
  ctx.fillStyle='#9c1c26';ctx.fillRect(-13,-23,8,7);ctx.fillRect(5,-23,8,7);
  ctx.fillStyle='#2a2f34';ctx.fillRect(-4,-25,8,11);
  ctx.fillStyle='#c9d2d8';ctx.fillRect(-2,-22,3,3);
  // наплечник с номером смены
  ctx.fillStyle='#2b2024';ctx.fillRect(-38,-20,17,9);
  ctx.fillStyle='#3d2c31';ctx.fillRect(-37,-19,15,7);
  pixText3x5(ctx,'04',-35,-18,2,'#d8c9a8');
  // сервомотор на правом плече, крутится
  const sp=(t*2.2)%1;
  ctx.fillStyle='#161c22';ctx.fillRect(26,-22,13,12);
  ctx.fillStyle='#39464f';ctx.fillRect(27,-21,11,10);
  ctx.fillStyle='#8ea3b0';ctx.fillRect(31+Math.round(Math.cos(sp*6.28)*3),-17+Math.round(Math.sin(sp*6.28)*3),3,3);
  // шлейф проводов от затылка к спине
  ctx.strokeStyle='rgba(120,60,40,.75)';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(24,-58);ctx.quadraticCurveTo(38,-44+Math.sin(t*1.6)*2,30,-24);ctx.stroke();
  ctx.strokeStyle='rgba(60,90,120,.7)';
  ctx.beginPath();ctx.moveTo(21,-57);ctx.quadraticCurveTo(36,-42+Math.sin(t*1.6+1)*2,27,-22);ctx.stroke();
 }else if(kind==='felix'){
  // ошейник с бубенцом, качается
  ctx.fillStyle='#3a0d1f';ctx.fillRect(-24,-22,48,7);
  ctx.fillStyle='#5d1631';ctx.fillRect(-23,-21,46,5);
  ctx.fillStyle='rgba(255,215,232,.35)';for(let i=0;i<7;i++)ctx.fillRect(-21+i*7,-20,3,3);
  const bx=Math.round(Math.sin(t*2.1)*3);
  ctx.fillStyle='#c8a52c';ctx.fillRect(-4+bx,-14,9,9);
  ctx.fillStyle='#f0d76a';ctx.fillRect(-3+bx,-13,7,4);
  ctx.fillStyle='#2a1c05';ctx.fillRect(-2+bx,-8,5,2);
  // передатчик-наушник на левом ухе
  ctx.fillStyle='#14181d';ctx.fillRect(-27,-62,10,8);
  ctx.fillStyle='#2e3841';ctx.fillRect(-26,-61,8,6);
  ctx.globalAlpha=blink(5.2);ctx.fillStyle='#ff6fb0';ctx.fillRect(-24,-59,3,2);ctx.globalAlpha=1;
  // шестерёнка на плече и торчащая пружина
  ctx.fillStyle='#3a2430';ctx.fillRect(27,-20,11,11);
  ctx.fillStyle='#8e2a5a';ctx.fillRect(30,-17,5,5);
  ctx.strokeStyle='rgba(200,190,200,.55)';ctx.lineWidth=1.4;ctx.beginPath();
  for(let i=0;i<4;i++){ctx.moveTo(16,-72+i*3);ctx.lineTo(22,-70+i*3);}
  ctx.stroke();
 }else if(kind==='exo'){
  // радиомодуль на груди с бегущей шкалой
  ctx.fillStyle='#08131a';ctx.fillRect(-16,-14,32,13);
  ctx.fillStyle='#1c2f39';ctx.fillRect(-15,-13,30,11);
  const run=Math.floor((t*7)%8);
  for(let i=0;i<8;i++){ctx.fillStyle=i===run?'#79ecff':'rgba(121,236,255,.20)';ctx.fillRect(-13+i*3.6,-10,2,6);}
  // катушка кабелей на поясе
  ctx.strokeStyle='rgba(121,236,255,.35)';ctx.lineWidth=1.2;
  for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(-22,22,4+i*2.4,0,Math.PI*2);ctx.stroke();}
  // зажим-манипулятор вместо кисти
  ctx.fillStyle='#26343c';ctx.fillRect(33,42,12,7);
  const gr=Math.round(Math.abs(Math.sin(t*1.4))*3);
  ctx.fillStyle='#9fb6c2';ctx.fillRect(36,49,3,7-gr);ctx.fillRect(41,49,3,7-gr);
  // маячок на антенне
  ctx.globalAlpha=blink(4.6);ctx.fillStyle='#e6feff';ctx.fillRect(-5,-91,6,3);ctx.globalAlpha=1;
 }else if(kind==='lav'){
  // свисток на шнурке
  ctx.strokeStyle='rgba(230,220,190,.55)';ctx.lineWidth=1.4;
  ctx.beginPath();ctx.moveTo(-16,-20);ctx.lineTo(-4,-4);ctx.lineTo(10,-20);ctx.stroke();
  ctx.fillStyle='#b9c0c6';ctx.fillRect(-7,-5,10,6);ctx.fillStyle='#e8edf1';ctx.fillRect(-6,-4,5,3);
  // наручные часы, стрелка идёт
  ctx.fillStyle='#20262c';ctx.fillRect(-45,26,12,9);
  ctx.fillStyle='#c9d2d8';ctx.fillRect(-44,27,10,7);
  ctx.fillStyle='#20262c';ctx.fillRect(-40+Math.round(Math.cos(t)*2),29+Math.round(Math.sin(t)*2),2,2);
  // кассетный плеер на поясе, диод мигает
  ctx.fillStyle='#141a20';ctx.fillRect(16,18,15,11);
  ctx.fillStyle='#2c3a44';ctx.fillRect(17,19,13,9);
  ctx.fillStyle='#0a0e12';ctx.fillRect(19,21,9,5);
  ctx.globalAlpha=blink(2.8);ctx.fillStyle='#ffe07a';ctx.fillRect(28,26,2,2);ctx.globalAlpha=1;
  // помпон на колпаке уже есть — добавим ленту через корпус
  ctx.fillStyle='rgba(120,30,40,.55)';ctx.fillRect(-26,-6,52,4);
 }
}
function drawPixelMonster(ctx,x,y,m,scale=1,opts){
 const felix=m.kind==='felix', exo=m.kind==='exo', lav=m.kind==='lav', t=performance.now()/1000;
 // Felix = the "rabbit": dark-pink pelt, long floppy ears, mask-like concentric eye rings.
 // EXO = голый экзоскелет без обшивки: сталь, голубой свет в сервоприводах, визор-щель.
 const main=exo?'#5f7d8b':felix?'#c4478f':lav?'#e0b52c':'#a52332',
       dark=exo?'#0e171c':felix?'#2a0a18':lav?'#3c2c05':'#24070b',
       mid=exo?'#3d5b68':felix?'#8e2a5a':lav?'#a5811a':'#6f1723',
       hi=exo?'#79ecff':felix?'#ff6fb0':lav?'#ffe07a':'#ff4658',
       eye=exo?'#e6feff':felix?'#ffd0e8':lav?'#fff6be':'#ff6672';
 const glitch=(Math.floor(t*12)%7===0);
 ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.imageSmoothingEnabled=false;
 // Felix: long floppy rabbit ears (drawn first, behind the head) — swaying slightly.
 if(felix){
   const sw=Math.sin(t*1.6)*0.12;
   ctx.fillStyle=dark;
   ctx.save();ctx.translate(-20,-58);ctx.rotate(-0.5+sw);ctx.fillRect(-6,0,12,46);ctx.fillStyle=mid;ctx.fillRect(-5,2,10,38);ctx.fillStyle=hi;ctx.fillRect(-3,6,3,16);ctx.restore();
   ctx.save();ctx.translate(20,-58);ctx.rotate(0.5-sw);ctx.fillRect(-6,0,12,46);ctx.fillStyle=mid;ctx.fillRect(-5,2,10,38);ctx.fillStyle=hi;ctx.fillRect(0,6,3,16);ctx.restore();
 }
 // floor shadow (отключается, когда тень рисует drawGroundedMonster)
 if(!(opts&&opts.noShadow)){ctx.fillStyle='rgba(0,0,0,.78)';ctx.fillRect(-30,68,60,6);ctx.fillRect(-42,71,84,3);}
 // long pixel legs
 ctx.fillStyle=dark;ctx.fillRect(-24,27,14,43);ctx.fillRect(10,27,14,43);
 ctx.fillStyle=main;ctx.fillRect(-27,43,19,11);ctx.fillRect(8,45,20,11);
 ctx.fillStyle=hi;ctx.fillRect(-22,29,7,6);ctx.fillRect(14,30,7,6);
 // torso broken geometry
 ctx.fillStyle=dark;ctx.fillRect(-30,-18,60,52);ctx.fillRect(-24,-25,48,8);
 ctx.fillStyle=mid;ctx.fillRect(-24,-14,48,39);ctx.fillRect(-18,-20,36,8);
 ctx.fillStyle=main;ctx.fillRect(-15,-5,30,25);
 ctx.fillStyle=dark;ctx.fillRect(-8,-1,16,29);
 for(let i=0;i<4;i++){ctx.fillStyle=hi;ctx.fillRect(-5,3+i*7,10,3);}
 // ==== V70: LAV — жёлтый аниматроник в пиксельной футболке «LAV» ====
 if(lav){
   // мятая футболка поверх корпуса
   ctx.fillStyle='#1f2c57';ctx.fillRect(-28,-18,56,34);
   ctx.fillStyle='#2b3a6b';ctx.fillRect(-26,-16,52,30);
   ctx.fillStyle='#182347';ctx.fillRect(-28,12,56,5);                 // тень на подоле
   ctx.fillStyle='#38487e';ctx.fillRect(-26,-18,52,4);                // воротник
   ctx.fillStyle='#101833';ctx.fillRect(-10,-18,20,5);
   pixText3x5(ctx,'LAV',-19,-9,4,'#f4f1e4');                          // надпись
   ctx.fillStyle='rgba(0,0,0,.22)';ctx.fillRect(-26,6,52,2);
   ctx.fillStyle='rgba(90,20,20,.35)';ctx.fillRect(6,-4,9,12);        // пятно на футболке
   // рваный подол
   ctx.fillStyle=mid;for(let i=0;i<7;i++)ctx.fillRect(-26+i*8,16,4,4);
 }
 // asymmetric arms / extra joints
 ctx.fillStyle=dark;ctx.fillRect(-39,-12,11,42);ctx.fillRect(28,-8,12,46);
 ctx.fillStyle=main;ctx.fillRect(-43,6,14,9);ctx.fillRect(29,10,15,9);
 ctx.fillStyle=hi;ctx.fillRect(-43,24,8,4);ctx.fillRect(36,27,8,4);
 // claw pixels
 ctx.fillStyle=dark;ctx.fillRect(-44,31,9,13);ctx.fillRect(35,34,10,13);
 ctx.fillStyle=hi;for(let i=0;i<3;i++){ctx.fillRect(-45+i*4,43,2,8);ctx.fillRect(38+i*3,45,2,8);}
 // jagged head
 ctx.fillStyle=dark;
 ctx.fillRect(-31,-63,62,43);ctx.fillRect(-25,-70,50,9);ctx.fillRect(-39,-55,8,25);ctx.fillRect(31,-54,8,23);
 ctx.fillRect(-23,-75,10,8);ctx.fillRect(12,-78,11,10);
 ctx.fillStyle=mid;ctx.fillRect(-25,-58,50,30);ctx.fillRect(-18,-66,36,8);
 // eye sockets + eyes
 ctx.fillStyle='#09070b';ctx.fillRect(-22,-51,15,11);ctx.fillRect(7,-51,15,11);
 const blinkOff=(Math.floor(t*1.7)%11===0)?1:0;
 if(!blinkOff){const eb=.75+.25*Math.sin(t*3.1);ctx.globalAlpha=eb;ctx.fillStyle=eye;ctx.shadowColor=hi;ctx.shadowBlur=20;ctx.fillRect(-18,-48,9,5);ctx.fillRect(10,-48,9,5);ctx.shadowBlur=9;ctx.fillStyle='#fff';ctx.fillRect(-16,-47,4,3);ctx.fillRect(12,-47,4,3);ctx.shadowBlur=0;ctx.globalAlpha=1;}
 // Felix: mask-like concentric rings around the eyes (portal look, like the rabbit mask).
 if(felix){ctx.strokeStyle='rgba(255,215,232,.55)';ctx.lineWidth=1;for(let r=1;r<=2;r++){ctx.beginPath();ctx.rect(-23-r,-52-r,15+r*2,11+r*2);ctx.rect(6-r,-52-r,15+r*2,11+r*2);ctx.stroke();}}
 // EXO: визор-щель через всю голову, открытые рёбра и антенна вместо шерсти.
 if(exo){
   ctx.fillStyle='#050b0e';ctx.fillRect(-27,-49,54,7);
   ctx.fillStyle=hi;ctx.shadowColor=hi;ctx.shadowBlur=14;ctx.fillRect(-24,-47,48,3);ctx.shadowBlur=0;
   ctx.fillStyle='#7d8f98';for(let i=0;i<5;i++)ctx.fillRect(-20+i*9,-20+i%2,4,26);
   ctx.fillStyle=dark;ctx.fillRect(-3,-84,3,14);ctx.fillStyle=hi;ctx.fillRect(-4,-88,5,5);
   ctx.strokeStyle='rgba(121,236,255,.45)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(-30,-8);ctx.lineTo(-16,4);ctx.lineTo(-30,16);ctx.moveTo(30,-8);ctx.lineTo(16,4);ctx.lineTo(30,16);ctx.stroke();
 }
 // LAV: круглая голова, праздничный колпак, один потухший глаз, широкая ухмылка
 if(lav){
   ctx.fillStyle=main;ctx.fillRect(-29,-62,58,34);ctx.fillRect(-25,-68,50,7);
   ctx.fillStyle=mid;ctx.fillRect(-25,-59,50,26);
   ctx.fillStyle=dark;ctx.fillRect(-29,-34,58,5);
   // «шерсть»-пиксели по контуру головы
   ctx.fillStyle=hi;for(let i=0;i<8;i++)ctx.fillRect(-27+i*7,-70,4,4);
   // праздничный колпак
   ctx.fillStyle='#b6323f';ctx.beginPath();ctx.moveTo(-14,-70);ctx.lineTo(14,-70);ctx.lineTo(0,-100);ctx.closePath();ctx.fill();
   ctx.fillStyle='#e2d4a0';for(let i=0;i<3;i++)ctx.fillRect(-9+i*7,-78-i*4,4,4);
   ctx.fillStyle='#f2e7c2';ctx.fillRect(-3,-104,6,6);
   // глаза: правый горит, левый выбит
   ctx.fillStyle='#09070b';ctx.fillRect(-22,-53,16,12);ctx.fillRect(7,-53,16,12);
   ctx.fillStyle=eye;ctx.shadowColor=hi;ctx.shadowBlur=16;ctx.fillRect(10,-50,10,6);ctx.shadowBlur=0;
   ctx.fillStyle='#fff';ctx.fillRect(12,-49,4,3);
   ctx.strokeStyle='rgba(60,44,5,.85)';ctx.lineWidth=2;
   ctx.beginPath();ctx.moveTo(-22,-53);ctx.lineTo(-6,-41);ctx.moveTo(-6,-53);ctx.lineTo(-22,-41);ctx.stroke();
   // ухмылка во всю морду
   ctx.fillStyle='#08060a';ctx.fillRect(-21,-30,42,10);
   ctx.fillStyle='#fff8d8';for(let i=0;i<8;i++)ctx.fillRect(-19+i*5,-29+(i%2),3,7);
   // порванная щека, видно каркас
   ctx.fillStyle='#7d8f98';ctx.fillRect(18,-40,7,9);ctx.fillStyle=hi;ctx.fillRect(20,-38,3,5);
 }
 // black mouth, teeth
 // подтёки ржавчины по корпусу
 ctx.fillStyle='rgba(24,12,8,.35)';ctx.fillRect(-21,-16,3,22);ctx.fillRect(13,-12,2,26);ctx.fillRect(-6,20,2,14);
 // пасть слегка подрагивает
 const jaw=Math.round(Math.abs(Math.sin(t*1.9))*2);
 if(!lav){
   ctx.fillStyle='#030204';ctx.fillRect(-23,-27,46,17+jaw);
   ctx.fillStyle=exo?'#cfe9f2':felix?'#f0d4ff':'#ffe2e5';for(let i=0;i<7;i++)ctx.fillRect(-20+i*6,-25+(i%2),3,7);
 }
 // pixel cracks / exposed frame
 ctx.fillStyle=hi;ctx.fillRect(-30,-36,4,12);ctx.fillRect(26,-40,4,16);ctx.fillRect(-4,25,8,5);
 // V82: объёмная заливка/затенение корпуса для глубины (мягкая тень справа)
 ctx.save();ctx.globalCompositeOperation='multiply';
 const sh=ctx.createLinearGradient(-30,0,30,0);
 sh.addColorStop(0,'rgba(255,255,255,1)');sh.addColorStop(.55,'rgba(210,210,220,1)');sh.addColorStop(1,'rgba(150,150,160,1)');
 ctx.fillStyle=sh;ctx.fillRect(-30,-18,60,52);
 ctx.restore();
 // лёгкий правый блик для объёма (свет "сбоку")
 ctx.fillStyle='rgba(220,230,238,.10)';ctx.fillRect(22,-18,8,52);
 // V82: открытые поршни/сервоприводы в местах порванной обшивки
 ctx.fillStyle='#0a0e12';
 ctx.fillRect(-20,2,5,14);ctx.fillRect(15,0,4,16);
 ctx.strokeStyle='#4a5a64';ctx.lineWidth=1.4;
 for(let i=0;i<3;i++){
   ctx.beginPath();ctx.moveTo(-20,5+i*5);ctx.lineTo(-15,5+i*5);ctx.stroke();
   ctx.beginPath();ctx.moveTo(15,3+i*5);ctx.lineTo(19,3+i*5);ctx.stroke();
 }
 ctx.fillStyle=hi;ctx.fillRect(-20,2,3,2);ctx.fillRect(15,0,2,2);
 // V82: потёртые швы обшивки — тонкие тёмные линии вдоль корпуса
 ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=1;
 ctx.beginPath();ctx.moveTo(-15,-5);ctx.lineTo(-15,20);ctx.moveTo(15,-5);ctx.lineTo(15,20);ctx.stroke();
 // V82: асимметричная грязь на голове
 ctx.fillStyle='rgba(18,12,8,.40)';
 ctx.fillRect(8,-58,14,12);ctx.fillRect(-25,-50,8,6);
 // V82: более глубокая тёмная тень под глазами
 ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(-24,-52,18,3);ctx.fillRect(5,-52,18,3);
 // V82: влажный блик на металлических частях
 ctx.fillStyle='rgba(220,230,238,.18)';ctx.fillRect(-42,7,10,3);ctx.fillRect(30,11,11,3);
 // V84: навесное железо конкретного аниматроника
 monsterAccessories(ctx,m,t,{main,dark,mid,hi,eye});
 // glitch strips
 if(glitch){ctx.globalAlpha=.7;ctx.fillStyle=hi;ctx.fillRect(-45,-12,90,3);ctx.fillRect(-34,18,68,2);ctx.globalAlpha=1;}
 // small floor sparks
 if(m.state==='preparingAttack'){ctx.fillStyle=hi;ctx.fillRect(-50,61,4,3);ctx.fillRect(46,57,3,3);}
 ctx.restore(); // V83: закрывает трансформ идл-анимации корпуса
 ctx.restore();
}
// Силуэт аниматроника, который уже стоит у двери охраны: рисуется в глубине коридора,
// у самой двери ОХРАНА, поэтому по камере видно, кто именно подошёл и с какой стороны.
function drawDoorMonsterOnCam(room,c){
 c=c||ctx;
 const atDoor=window.CameraSystem.doorMonsters(G,room);if(!atDoor.length)return false;
 const anchor=window.World.corridorDoorAnchor(W,H,room===6);
 const side=window.CameraSystem.sideForCorridor(room);
 // V72: коридор тёмный. Пока лампа с этой стороны выключена, на камере видны
 // только глаза одного из пришедших — ни фигуры, ни тени. Включите свет — увидите всех.
 if(!window.CameraSystem.corridorLit(G,room)){
  // V111: ГЛАЗА 50/50. Решение о том, видны ли глаза в темноте, принимается
  // один раз при приходе к двери (m.eyesVisible), а не каждый кадр. Если глаза
  // скрыты — коридор абсолютно чёрный, будто там никого. Страшнее: свет
  // выключен, и даже глаз не видно.
  const mon=atDoor[0];
  if(mon&&mon.eyesVisible===false){
    // изредка мерцает одна искра-намёк, но без самой фигуры
    if(Math.random()<0.02){const gx=anchor.x+(Math.random()-.5)*W*.03,gy=H*0.44+H*0.028+(Math.random()-.5)*H*.02;c.save();c.globalCompositeOperation='lighter';c.fillStyle='rgba(190,40,40,.25)';c.beginPath();c.arc(gx,gy,1.4,0,Math.PI*2);c.fill();c.restore();}
    return true;
  }
  const gy0=H*0.44+H*0.028, sc0=(H*0.235)/(MON_FEET-MON_TOP);
  window.World.eyesInDark(c,anchor.x,gy0,mon,sc0);
  return true;
 }
 // V111: ТЕНЬ ПОД СВЕТОМ НА 5-Й СМЕНЕ. Лампа горит, но тень может не проступить
 // вовсе ('none') — коридор пуст, будто никого и не было, — либо проступить ярче
 // и чётче ('distinct'). На ранних сменах тень всегда обычная ('normal').
 const sh=(side&&G.lightShadow)?G.lightShadow[side]:null;
 const shadowMode=sh?sh.mode:'normal';
 if(shadowMode==='none'){
   // света нет никого — рисуем пустой освещённый проём, без фигуры. Лёгкий намёк
   // на присутствие — иногда тёплая искра в глубине, чтобы держать в напряжении.
   if(Math.random()<0.04){const gx=anchor.x+(Math.random()-.5)*W*.05,gy=H*0.44+H*0.028-H*.02;c.save();c.globalCompositeOperation='lighter';c.fillStyle='rgba(200,60,60,.18)';c.beginPath();c.arc(gx,gy,1.6,0,Math.PI*2);c.fill();c.restore();}
   return true;
 }
 // Аниматроник стоит в глубине коридора, перед самой дверью ОХРАНА: ступни на
 // пороге двери, рост — около 0.8 её высоты, поэтому масштаб совпадает с перспективой.
 const groundY=H*0.44+H*0.028;
 const scale=(H*0.235)/(MON_FEET-MON_TOP);
 atDoor.forEach((mon,i)=>{
  const x=anchor.x+(atDoor.length>1?(i-(atDoor.length-1)/2)*W*.052:0), y=groundY;
  // тёмный ореол за силуэтом — чтобы фигура читалась поверх красной тревоги
  const hh=(MON_FEET-MON_TOP)*scale;
  const hg=c.createRadialGradient(x,y-hh*.45,2,x,y-hh*.45,hh*.72);hg.addColorStop(0,'rgba(3,4,6,.70)');hg.addColorStop(1,'rgba(3,4,6,0)');
  c.fillStyle=hg;c.fillRect(x-hh*.72,y-hh*1.2,hh*1.44,hh*1.5);
  // V111: 'distinct' — тень проступает ярче и чётче: меньше тумана, светлее фигура,
  // горящие глаза. 'normal' — обычный вид.
  const distinct=shadowMode==='distinct';
  drawGroundedMonster(c,x,y,mon,scale,{footTint:distinct?.74:.52,topTint:distinct?.40:.24,fog:distinct?.06:.18,fogColor:'52,42,30',shadowDir:room===6?1:-1});
  if(distinct){ // горящие глаза поверх яркой тени
    const pal=monPalette(mon.kind);c.save();c.globalCompositeOperation='lighter';c.fillStyle=`rgba(${pal.eye},.9)`;c.shadowColor=`rgba(${pal.glow},.9)`;c.shadowBlur=8;c.beginPath();c.arc(x-hh*.06,y-hh*.72,2.1,0,Math.PI*2);c.fill();c.beginPath();c.arc(x+hh*.06,y-hh*.72,2.1,0,Math.PI*2);c.fill();c.restore();
  }
 });
 return false;
}
function drawMonsterOnCam(room,c){
 c=c||ctx;
 // Глаза в темноте горят только у ОДНОГО аниматроника на кадр: если кто-то уже
 // стоит у двери охраны, остальные в этом коридоре остаются невидимыми.
 let eyesShown=drawDoorMonsterOnCam(room,c)===true;
 const corridorLit=window.CameraSystem.CORRIDOR_ROOMS.indexOf(room)<0||window.CameraSystem.corridorLit(G,room);
 const seen=window.CameraSystem.shouldShowMonster(G,room);
 // V84: если в комнате пусто — камере не за кем вести, ориентир снимается.
 if(!seen.length){const _c0=window.CameraSystem.get(room);if(_c0)_c0.focusLat=null;return;}
 const activeMonsters=(G.monsters||[]).filter(m=>m&&m.room===room&&m.state!=='hidden');
 // Геометрия каждой комнаты: hz — линия стыка стены и пола (как в World.roomShell),
 // k — глубина, на которой стоит аниматроник, a — боковой сдвиг в плоскости пола.
 // V63: фигуры отодвинуты в глубину комнаты и уведены от центра кадра — они по-прежнему
 // повёрнуты лицом к камере, но стоят в дальней части помещения, у стен и колонн.
 const CAM_GEO={1:{hz:.44,k:.26,a:-.30},2:{hz:.46,k:.24,a:.34},3:{hz:.40,k:.27,a:.36},4:{hz:.46,k:.22,a:.30},5:{hz:.44,k:.26,a:-.38},6:{hz:.44,k:.30,a:.30,vpX:.54},7:{hz:.44,k:.30,a:-.30,vpX:.46}};
 const geo=CAM_GEO[room]||{hz:.44,k:.44,a:0};
 seen.forEach((kind,i)=>{
   const mon=activeMonsters.find(m=>m.kind===kind)||{kind,state:'moving'};
   // Фигуры расставлены по плоскости пола: соседние стоят чуть глубже и в стороне,
   // поэтому выглядят стоящими в комнате, а не приклеенными рядом.
   const n=seen.length;
   // устойчивый разброс по виду аниматроника: каждый занимает своё место в комнате,
   // а не выстраивается ровно по центру.
   const hsh=(str)=>{let v=0;for(let q=0;q<str.length;q++)v=(v*31+str.charCodeAt(q))%997;return v/997;};
   const jit=hsh(String(kind)+room);
   const corridor=window.CameraSystem.CORRIDOR_ROOMS.indexOf(room)>=0;
   let k,lat;
   if(corridor){
     // V72: в коридоре два места: угол у стены (прячется, тревоги нет)
     // или сам проход к двери охраны в глубине кадра.
     const dir=room===6?1:-1;
     if(mon.corner){
       k=Math.max(.24,Math.min(.60,0.44+(jit-.5)*.12-i*.04));
       lat=dir*(0.28+(jit-.5)*.06); // V72: угловая фигура целиком в кадре, а не обрезана краем
     }else{
       k=Math.max(.10,Math.min(.30,0.17+(jit-.5)*.06-i*.03));
       lat=dir*0.05+(jit-.5)*.10+(n>1?(i-(n-1)/2)*.16:0);
     }
   }else{
     k=Math.max(.10,Math.min(.92,geo.k+(jit-.5)*.10-i*.05));
     const side=(i%2?-1:1);
     lat=geo.a*side+(jit-.5)*.30+(n>1?(i-(n-1)/2)*.34:0);
   }
   // V84: точный ориентир для ровного панорамирования — по первой фигуре в кадре.
   if(i===0){const _cf=window.CameraSystem.get(room);if(_cf)_cf.focusLat=Math.max(-1,Math.min(1,lat/0.40));}
   const spot=floorSpot(geo.hz,k,Math.max(-.46,Math.min(.46,lat)),geo.vpX);
   const x=spot.x, y=spot.y;
   // рост растёт с приближением к камере — прямая линейная перспектива пола
   const hFrac=(corridor?0.20:0.15)+(corridor?0.52:0.40)*k;
   const s=(H*hFrac)/(MON_FEET-MON_TOP);
   if(corridor&&!corridorLit){
     // Свет выключен: тот, кто забился в угол, не виден совсем; у того, кто стоит
     // у прохода, видны только глаза — и только у одного.
     if(mon.corner)return;
     if(eyesShown)return;
     eyesShown=true;
     window.World.eyesInDark(c,x,y,mon,s);
     return;
   }
   drawGroundedMonster(c,x,y,mon,s,{footTint:corridor?.50:.54,topTint:corridor?.22:.18,fog:Math.max(.06,.30-.24*k),fogColor:corridor?'46,40,30':'34,30,42',shadowDir:x<W*.5?1:-1});
   if(mon.state==='preparingAttack' && (mon.warning||0)>0){
     // Без текста: только пульсирующее свечение вокруг фигуры.
     const pulse=.55+.45*Math.abs(Math.sin(performance.now()/120));
     const col=kind==='felix'?'199,92,255':kind==='exo'?'87,216,245':'255,54,72';
     const r=(MON_FEET-MON_TOP)*s*1.1;
     c.save();c.globalCompositeOperation='lighter';c.translate(x,y-(MON_FEET-MON_TOP)*s*0.5);
     const hg=c.createRadialGradient(0,0,2,0,0,r);
     hg.addColorStop(0,`rgba(${col},${.15*pulse})`);hg.addColorStop(1,`rgba(${col},0)`);
     c.fillStyle=hg;c.beginPath();c.arc(0,0,r,0,Math.PI*2);c.fill();c.restore();
   }
 });
}
// ===== V63: КАМЕРЫ КАК ИЗОГНУТЫЙ CRT-МОНИТОР =====
// Картинка комнаты рисуется в отдельный буфер, а затем накладывается на экран
// вертикальными полосами с бочкообразным искажением и лёгким разворотом —
// получается объёмное стекло, а не плоский прямоугольник.
let _camFB=null,_camFBc=null;
// Снимок предыдущего кадра камеры — нужен для плавного перекрытия при переключении.
let _camPrev=null,_camPrevc=null;
function camSnapshot(){
 if(!_camFB||!_camFB.width)return false;
 if(!_camPrev){_camPrev=document.createElement('canvas');_camPrevc=_camPrev.getContext('2d');}
 if(_camPrev.width!==_camFB.width||_camPrev.height!==_camFB.height){_camPrev.width=_camFB.width;_camPrev.height=_camFB.height;}
 _camPrevc.clearRect(0,0,_camPrev.width,_camPrev.height);
 _camPrevc.drawImage(_camFB,0,0);
 return true;
}
// Единая точка переключения камеры: снимок старого кадра, мягкое перекрытие,
// короткий слабый срыв сигнала и щелчок. Раньше камера менялась рывком.
function switchCam(n,vol){
 n=Number(n);
 if(!window.CameraSystem.cameras[n]||n===G.cam)return;
 camSnapshot();
 // V93: плакаты в зале перевешиваются, пока камера смотрит в другую сторону.
 // Было: набор плакатов был жёстким и не менялся никогда.
 if(G.cam===1&&n!==1&&Math.random()<0.42)G.posterSeed=(G.posterSeed||0)+1;
 G.camFadeT=0.26;G.camFadeD=0.26;
 G.cam=n;G.switchFx=.20;
 window.CameraSystem.cameras[G.cam].glitch=.06;
 window.AudioFX.play('cam');
 window.AudioFX.play('camera_glitch',vol||.3,{group:'ambience'});
 // V91: если в кадре кто-то есть — помеха в тракте и голос вплотную к микрофону
 // камеры. Раньше переключение звучало одинаково, стоит там кто-то или нет.
 try{
   const seen=(G.monsters||[]).find(m=>m&&m.room===G.cam&&!m.corner);
   // V93: чем он ближе к охранной и чем позже смена, тем грязнее тракт:
   // к шуму добавляются рваные строки и высокий писк строчной развёртки.
   if(seen&&Math.random()<0.62){
     const NEAR={6:1.0,7:1.0,1:0.55,3:0.42,5:0.42,4:0.28,2:0.22,0:1.0};
     const grit=Math.max(0,Math.min(1,(NEAR[seen.room]!==undefined?NEAR[seen.room]:0.4)*0.72+(G.night-1)*0.09));
     window.MonsterAudio?.camSeen(seen.kind,seen.room,grit);
     G.camGrit=grit;
   }else G.camGrit=Math.max(0,(G.camGrit||0)-0.25);
 }catch(e){}
}
// V64: у каждой камеры свой ракурс — наклон, приближение и сдвиг кадра,
// поэтому одна и та же комната на разных камерах видна под разным углом.
// V67: у каждой камеры свой ракурс — высота подвеса, наклон объектива и разворот.
// kx  — трапеция: >0 низ кадра шире (камера смотрит вниз), <0 верх шире (смотрит вверх)
// sh  — боковой сдвиг перспективы: камера висит слева/справа от оси комнаты
// p   — сжатие по вертикали (насколько «далеко» уходит дальний план)
// rot — небольшой крен, будто кронштейн прикручен криво
const CAM_VIEW={
 1:{z:1.08,sk: 0.018,tx:-0.050,ty: 0.045,kx: 0.34,sh:-0.11,p:1.20,rot:-0.021},
 2:{z:1.12,sk:-0.014,tx: 0.045,ty:-0.030,kx:-0.26,sh: 0.10,p:0.88,rot: 0.026},
 3:{z:1.06,sk: 0.022,tx: 0.055,ty: 0.040,kx: 0.22,sh: 0.21,p:1.10,rot: 0.037},
 4:{z:1.16,sk:-0.010,tx:-0.015,ty:-0.020,kx: 0.40,sh:-0.02,p:1.28,rot:-0.011},
 5:{z:1.05,sk:-0.020,tx:-0.045,ty: 0.030,kx: 0.15,sh:-0.25,p:1.04,rot:-0.041},
 6:{z:1.10,sk: 0.012,tx: 0.028,ty: 0.020,kx: 0.29,sh:-0.07,p:1.15,rot: 0.017},
 7:{z:1.10,sk:-0.012,tx:-0.028,ty: 0.020,kx: 0.29,sh: 0.07,p:1.15,rot:-0.017}
};
let _camScn=null,_camScnc=null;
function camScene(w,h){
 if(!_camScn){_camScn=document.createElement('canvas');_camScnc=_camScn.getContext('2d');}
 if(_camScn.width!==w||_camScn.height!==h){_camScn.width=w;_camScn.height=h;}
 return _camScnc;
}
// Перспективная развёртка кадра: комната рисуется ровно, а на монитор кладётся
// полосами с трапецией — так каждая камера выглядит как повешенная под своим углом.
function drawPerspectiveFeed(c,src,w,h,av,low){
 const kx=av.kx||0,sh=av.sh||0,pw=av.p||1,rot=av.rot||0;
 if(!kx&&!sh&&pw===1&&!rot){c.drawImage(src,0,0,w,h);return;}
 // V71: толщина полосы развёртки подстраивается под нагрузку.
 const _t=window.__PERF?window.__PERF.tier:0;
 const step=low?4:(_t===0?2:_t===1?3:4);
 // запас, чтобы узкий край трапеции не оставлял пустых клиньев по бокам
 const norm=1/Math.max(0.55,1-Math.abs(kx)*0.5-Math.abs(sh)*0.55);
 c.save();
 if(rot){const os=1+Math.abs(rot)*1.9;c.translate(w*.5,h*.5);c.rotate(rot);c.scale(os,os);c.translate(-w*.5,-h*.5);}
 for(let y=0;y<h;y+=step){
  const t=(y+step*0.5)/h;
  const sy=Math.pow(t,pw)*(h-1);
  const sy2=Math.pow(Math.min(1,t+step/h),pw)*(h-1);
  const ssh=Math.max(1,sy2-sy);
  const sc=(1+kx*(t-0.5))*norm;
  const dw=w*sc;
  const dx=(w-dw)*0.5+sh*(t-0.5)*w*norm;
  c.drawImage(src,0,sy,w,ssh,dx,y,dw,step+1);
 }
 c.restore();
}
function camFB(w,h){
 if(!_camFB){_camFB=document.createElement('canvas');_camFBc=_camFB.getContext('2d');}
 if(_camFB.width!==w||_camFB.height!==h){_camFB.width=w;_camFB.height=h;}
 return _camFBc;
}
// Коэффициент высоты полосы: выпуклость по центру + небольшой разворот вправо.
const CAM_CURV=0.105, CAM_TILT=0.026;
function camWarpS(u){return ((1+CAM_CURV*(1-u*u))/(1+CAM_CURV))*(1-CAM_TILT*u);}
function camWarpDY(u){return 0.012*u;}
// Верхняя и нижняя кромки стекла для рамки.
function camEdge(x,y,w,h,u){
 const sc=camWarpS(u),dh=h*sc,cy=y+h*.5+h*camWarpDY(u);
 return {x:x+(u+1)*.5*w,top:cy-dh*.5,bot:cy+dh*.5};
}
// V84: изгиб стекла больше не пересобирается каждый кадр. Раньше здесь было
// до 88 масштабированных drawImage на КАЖДЫЙ кадр, хотя сам кадр сигнала
// обновляется реже (feedFps) — именно это давало основные лаги в камерах.
// Теперь полосы собираются один раз на новый кадр сигнала в отдельный буфер,
// а каждый кадр остаётся один blit со «дыханием» подвеса.
let _warpFB=null,_warpFBc=null,_warpSig='';
function drawWarpedFeed(src,x,y,w,h,low){
 const _t=window.__PERF?window.__PERF.tier:0;
 const N=low?40:(_t===0?88:_t===1?60:44);
 const pad=Math.ceil(h*0.10);
 const cw=Math.max(8,Math.round(w)),chh=Math.max(8,Math.round(h)+pad*2);
 if(!_warpFB){_warpFB=document.createElement('canvas');_warpFBc=_warpFB.getContext('2d');}
 if(_warpFB.width!==cw||_warpFB.height!==chh){_warpFB.width=cw;_warpFB.height=chh;_warpSig='';}
 const sig=N+'|'+cw+'|'+chh+'|'+src.width+'x'+src.height+'|'+(G._feedAt||0)+'|'+((G.camFadeT||0)>0?1:0);
 if(_warpSig!==sig){
  _warpSig=sig;
  _warpFBc.setTransform(1,0,0,1,0,0);
  _warpFBc.clearRect(0,0,cw,chh);
  const sw=src.width/N,dw=w/N;
  for(let i=0;i<N;i++){
   const u=(i+.5)/N*2-1,sc=camWarpS(u),dh=h*sc;
   const dy=pad+h*.5+h*camWarpDY(u)-dh*.5;
   _warpFBc.drawImage(src,i*sw,0,sw+0.8,src.height,i*dw,dy,dw+0.8,dh);
  }
 }
 ctx.drawImage(_warpFB,x,y-pad);
}
// Корпус монитора: стальная рамка по кривой стекла, винты, вентиляционные щели.
function drawCamBezel(x,y,w,h,alertLvl,now){
 const pad=Math.max(16,w*.024);
 const bx=x-pad,by=y-pad,bw=w+pad*2,bh=h+pad*2;
 // тень корпуса
 roundedRect(ctx,bx+3,by+6,bw,bh,16,'rgba(0,0,0,.55)',null,0);
 const mg=ctx.createLinearGradient(bx,by,bx,by+bh);
 mg.addColorStop(0,'#3b4650');mg.addColorStop(.07,'#232c34');mg.addColorStop(.5,'#161d24');mg.addColorStop(1,'#0d1218');
 roundedRect(ctx,bx,by,bw,bh,16,mg,'#55636e',2);
 // фаска и блик по верхней кромке
 ctx.save();ctx.beginPath();
 if(typeof ctx.roundRect==='function')ctx.roundRect(bx,by,bw,bh,16);else ctx.rect(bx,by,bw,bh);
 ctx.clip();
 ctx.fillStyle='rgba(255,255,255,.07)';ctx.fillRect(bx+2,by+2,bw-4,1.5);
 ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(bx+2,by+bh-3,bw-4,2);
 // вентиляционные щели по правому краю рамки
 for(let i=0;i<7;i++){ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(bx+bw-pad*.72,by+bh*.30+i*7,pad*.5,3);}
 ctx.restore();
 // винты по углам
 [[bx+pad*.55,by+pad*.55],[bx+bw-pad*.55,by+pad*.55],[bx+pad*.55,by+bh-pad*.55],[bx+bw-pad*.55,by+bh-pad*.55]].forEach(p=>{
  ctx.fillStyle='rgba(0,0,0,.55)';ctx.beginPath();ctx.arc(p[0],p[1]+.7,3.1,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#6d777f';ctx.beginPath();ctx.arc(p[0],p[1],3.1,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(20,26,30,.9)';ctx.lineWidth=1.1;
  ctx.beginPath();ctx.moveTo(p[0]-2,p[1]-1);ctx.lineTo(p[0]+2,p[1]+1);ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.22)';ctx.beginPath();ctx.arc(p[0]-1,p[1]-1,1.1,0,Math.PI*2);ctx.fill();});
 // индикатор питания на рамке
 const pl=.5+.5*Math.sin(now*2.2);
 const px=bx+pad*.55+16,py=by+bh-pad*.55;
 ctx.save();ctx.globalCompositeOperation='lighter';
 const pg=ctx.createRadialGradient(px,py,0,px,py,9);
 pg.addColorStop(0,alertLvl>0?`rgba(255,70,80,${(.45+.3*pl).toFixed(2)})`:`rgba(120,230,160,${(.30+.15*pl).toFixed(2)})`);
 pg.addColorStop(1,'rgba(0,0,0,0)');
 ctx.fillStyle=pg;ctx.beginPath();ctx.arc(px,py,9,0,Math.PI*2);ctx.fill();ctx.restore();
 ctx.fillStyle=alertLvl>0?'#ff5a66':'#7ce6a0';ctx.beginPath();ctx.arc(px,py,2.1,0,Math.PI*2);ctx.fill();
 // чёрная маска экрана под изогнутым стеклом
 ctx.save();ctx.beginPath();
 const N=48;
 for(let i=0;i<=N;i++){const e=camEdge(x,y,w,h,i/N*2-1);i?ctx.lineTo(e.x,e.top-1):ctx.moveTo(e.x,e.top-1);}
 for(let i=N;i>=0;i--){const e=camEdge(x,y,w,h,i/N*2-1);ctx.lineTo(e.x,e.bot+1);}
 ctx.closePath();ctx.fillStyle='#010203';ctx.fill();ctx.restore();
}
// V64: камеры на весь экран. Тонкая рамка по краям экрана, уголковые метки,
// затемнение углов — корпус монитора больше не нужен, кадр занимает весь экран.
function drawCamFrameFS(alertLvl,now,low){
 // V66: по краям по-прежнему ничего нет — ни рамки, ни полос. Осталась только
 // атмосфера: свет по углам медленно «дышит», в кадре стоит ночной холодный воздух.
 const breathe=0.5+0.5*Math.sin(now*0.42);
 const vg=ctx.createRadialGradient(W*.5,H*.5,Math.min(W,H)*.58,W*.5,H*.5,Math.max(W,H)*.90);
 vg.addColorStop(0,'rgba(0,0,0,0)');
 vg.addColorStop(1,`rgba(0,2,4,${(0.19+0.05*breathe).toFixed(3)})`);
 ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
 // ночной воздух перед объективом: сверху чуть холоднее, к полу гуще
 ctx.save();ctx.globalCompositeOperation='lighter';
 const air=ctx.createLinearGradient(0,0,0,H);
 air.addColorStop(0,`rgba(96,150,172,${(0.016+0.006*breathe).toFixed(3)})`);
 air.addColorStop(.55,'rgba(72,122,142,0.010)');
 air.addColorStop(1,'rgba(38,68,90,0.004)');
 ctx.fillStyle=air;ctx.fillRect(0,0,W,H);ctx.restore();
 if(alertLvl>0){
  // тревога по-прежнему не рисуется по краям: только плавная волна подкраса,
  // без резкого мигания — глазу спокойнее, а тревожность остаётся
  const pulse=.5+.5*Math.sin(now*(alertLvl>1?5.2:3.2));
  const base=alertLvl>1?.030:.015;
  ctx.save();ctx.globalCompositeOperation='lighter';
  ctx.fillStyle=`rgba(190,30,38,${(base+base*pulse).toFixed(3)})`;
  ctx.fillRect(0,0,W,H);ctx.restore();
 }
}
// Служебные данные поверх кадра: REC, номер камеры, время, сигнал.
function drawCamHUDFS(cam,now,alertLvl,low){
 // V66: в кадре осталось только необходимое — точка записи, номер камеры и время.
 // Убраны: название комнаты, «SIG» с полосками, «СМЕНА N» и служебная строка
 // «CH01 · 25 FPS · IR ON · AUX-...». Надписи слабо дышат вместе с кадром.
 const i0=Math.max(10,W*.016), tx=i0+14, ty=i0+34;
 const soft=0.70+0.22*(0.5+0.5*Math.sin(now*0.7));
 const rec=0.5+0.5*Math.sin(now*2.1);
 ctx.save();
 ctx.globalAlpha=soft;
 ctx.shadowColor='rgba(0,0,0,.85)';ctx.shadowBlur=9;ctx.textAlign='left';
 // точка записи наливается и гаснет плавно, без щелчкового мигания
 ctx.save();ctx.globalCompositeOperation='lighter';
 const rg=ctx.createRadialGradient(tx,ty-7,0,tx,ty-7,14);
 rg.addColorStop(0,`rgba(255,72,82,${(0.26+0.30*rec).toFixed(3)})`);rg.addColorStop(1,'rgba(255,72,82,0)');
 ctx.fillStyle=rg;ctx.beginPath();ctx.arc(tx,ty-7,14,0,Math.PI*2);ctx.fill();ctx.restore();
 ctx.fillStyle=`rgba(232,92,100,${(0.42+0.48*rec).toFixed(3)})`;
 ctx.beginPath();ctx.arc(tx,ty-7,4.4,0,Math.PI*2);ctx.fill();
 // номер камеры
 ctx.font='700 16px "JetBrains Mono",monospace';
 ctx.fillStyle='rgba(212,230,238,.80)';
 ctx.fillText('CAM '+String(G.cam).padStart(2,'0'),tx+13,ty);
 // время смены
 ctx.textAlign='right';
 ctx.font='700 27px "JetBrains Mono",monospace';
 ctx.fillStyle='rgba(212,230,238,.70)';
 ctx.fillText(timeString(),W-i0-13,ty);
 if(alertLvl>0){
  const pulse=.5+.5*Math.sin(now*(alertLvl>1?5.2:3.2));
  ctx.font='700 12px "JetBrains Mono",monospace';
  ctx.fillStyle=`rgba(240,98,106,${(0.42+0.40*pulse).toFixed(2)})`;
  ctx.fillText(alertLvl>1?'У ДВЕРИ':'ДВИЖЕНИЕ',W-i0-13,ty+22);
 }
 ctx.restore();
}
// Кнопка выхода из камер: тёмная пластина, только слово ЗАКРЫТЬ, без иконок по бокам.
function closeBarGeo(){return {x:Math.max(14,W*.028),y:H-Math.max(52,H*.088),w:Math.min(230,W*.155),h:Math.max(40,H*.052)};}
function closeBar(){
 const g0=closeBarGeo(),t=performance.now()/1000;
 const mx=(G.mouse?G.mouse.x:0)*W,my=(G.mouse?G.mouse.y:0)*H;
 const hov=hitRect(mx,my,g0.x,g0.y,g0.w,g0.h)?1:0;
 const fl=0.84+0.16*Math.abs(Math.sin(t*2.1));
 ctx.save();
 roundedRect(ctx,g0.x+2,g0.y+4,g0.w,g0.h,6,'rgba(0,0,0,.5)',null,0);
 const g=ctx.createLinearGradient(g0.x,g0.y,g0.x,g0.y+g0.h);
 g.addColorStop(0,'#2a1216');g.addColorStop(.46,'#1a0b0e');g.addColorStop(1,'#0b0507');
 roundedRect(ctx,g0.x,g0.y,g0.w,g0.h,6,g,null,0);
 ctx.save();bpath(ctx,g0.x,g0.y,g0.w,g0.h,6);ctx.clip();
 const sh=ctx.createLinearGradient(g0.x,g0.y,g0.x,g0.y+g0.h);
 sh.addColorStop(0,'rgba(255,255,255,.07)');sh.addColorStop(.5,'rgba(255,255,255,0)');sh.addColorStop(1,'rgba(0,0,0,.35)');
 ctx.fillStyle=sh;ctx.fillRect(g0.x,g0.y,g0.w,g0.h);
 const gl=ctx.createLinearGradient(g0.x,g0.y+g0.h,g0.x,g0.y);
 gl.addColorStop(0,`rgba(220,60,72,${(0.16*fl+0.10*hov).toFixed(3)})`);gl.addColorStop(1,'rgba(220,60,72,0)');
 ctx.fillStyle=gl;ctx.fillRect(g0.x,g0.y,g0.w,g0.h);
 ctx.restore();
 ctx.strokeStyle=`rgba(226,74,88,${(0.42*fl+0.25*hov).toFixed(2)})`;ctx.lineWidth=1.6;
 bpath(ctx,g0.x+.8,g0.y+.8,g0.w-1.6,g0.h-1.6,6);ctx.stroke();
 ctx.shadowColor='rgba(0,0,0,.9)';ctx.shadowBlur=6;
 ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.font='800 '+Math.round(Math.min(17,g0.h*.40))+'px "Inter",Arial,sans-serif';
 ctx.fillStyle=hov?'#ffeef0':'#e6d3d5';
 ctx.fillText('ЗАКРЫТЬ',g0.x+g0.w*.5,g0.y+g0.h*.5+1);
 ctx.textBaseline='alphabetic';
 ctx.restore();
}
// V69: «киношный» слой камер — оптика, автоэкспозиция, глубина резкости,
// хроматические аберрации, галация, артефакты сжатия и дефекты матрицы.
// Всё считается на уменьшенных копиях кадра, поэтому стоит дешёво.
function cineTmp(key,w,h){
 const F=drawCineBase;
 if(!F._c)F._c={};
 let o=F._c[key];
 if(!o){o={cv:document.createElement('canvas')};o.cx=o.cv.getContext('2d');F._c[key]=o;}
 if(o.cv.width!==w||o.cv.height!==h){o.cv.width=w;o.cv.height=h;}
 return o;
}
// Автоэкспозиция: раз в ~0.3 с измеряем среднюю яркость кадра (свёртка в 1×1)
// и плавно подтягиваем усиление, как настоящая камера с AGC.
function camMeter(c,w,h,now,id){
 const F=drawCineBase;
 if(!F._m)F._m={};
 let m=F._m[id];
 if(!m){m={lum:42,gain:1,next:0};F._m[id]=m;}
 if(now>=m.next){
  m.next=now+0.30;
  const t=cineTmp('meter',1,1);
  t.cx.clearRect(0,0,1,1);
  try{
   t.cx.drawImage(c.canvas,0,0,w,h,0,0,1,1);
   const d=t.cx.getImageData(0,0,1,1).data;
   m.lum=0.2126*d[0]+0.7152*d[1]+0.0722*d[2];
  }catch(e){}
 }
 // цель по яркости — «ночной» уровень; усиление ползёт медленно (инерция AGC)
 // V72: усиление ограничено — иначе в тёмных коридорах 06/07 камера вытягивала
 // почти чёрный кадр в молочно-шумную кашу и вся темнота пропадала.
 const target=40, want=Math.max(0.85,Math.min(1.55,target/Math.max(7,m.lum)));
 m.gain+=(want-m.gain)*0.045;
 return m;
}
// Базовый слой: глубина резкости, дымка дальнего плана, автоусиление, автофокус.
function drawCineBase(c,w,h,now,cam,low,id){
 const F=drawCineBase;
 if(!F._foc)F._foc={};
 let fo=F._foc[id];
 if(!fo){fo={next:now+4+Math.random()*10,t:0};F._foc[id]=fo;}
 // ---- глубина резкости: дальний план (верх кадра) размыт ----
 const dw=Math.max(8,Math.round(w/5)),dh=Math.max(6,Math.round(h/5));
 const bl=cineTmp('dof',dw,dh);
 bl.cx.clearRect(0,0,dw,dh);
 bl.cx.imageSmoothingEnabled=true;
 bl.cx.drawImage(c.canvas,0,0,w,h,0,0,dw,dh);
 const farH=Math.round(h*0.46);
 c.save();
 c.imageSmoothingEnabled=true;
 c.globalAlpha=low?0.12:0.19;
 c.drawImage(bl.cv,0,0,dw,Math.round(dh*0.46),0,0,w,farH);
 c.restore();
 // V71: здесь раньше заливался полностью прозрачный градиент на весь кадр —
 // никакого эффекта он не давал, только ещё одна заливка экрана на каждый кадр.
 // ---- дымка воздуха на дальнем плане (градиент кэшируется) ----
 if(!F._hz||F._hzh!==h){
  const hz=c.createLinearGradient(0,0,0,h*0.62);
  hz.addColorStop(0,'rgba(122,150,172,0.022)');
  hz.addColorStop(0.55,'rgba(110,138,160,0.008)');
  hz.addColorStop(1,'rgba(110,138,160,0)');
  F._hz=hz;F._hzh=h;
 }
 // V72: в тёмном коридоре дымка слабее — на чёрном фоне она читалась как молочная пелена.
 c.save();c.globalCompositeOperation='lighter';c.globalAlpha=G._darkCam?0.35:1;c.fillStyle=F._hz;c.fillRect(0,0,w,h*0.62);c.restore();
 // ---- автофокус: изредка камера «щупает» резкость ----
 if(now>=fo.next){fo.next=now+9+Math.random()*13;fo.t=0.55;}
 if((window.__PERF?window.__PERF.tier:0)>=2)fo.t=0;
 if(fo.t>0){
  fo.t=Math.max(0,fo.t-1/60);
  const k=Math.sin(Math.PI*Math.min(1,fo.t/0.55));
  c.save();c.imageSmoothingEnabled=true;c.globalAlpha=0.45*k;
  c.drawImage(bl.cv,0,0,dw,dh,0,0,w,h);c.restore();
 }
 // ---- автоусиление: тёмный кадр камера вытягивает и шумит сильнее ----
 const m=camMeter(c,w,h,now,id);
 const lift=Math.max(0,Math.min(0.042,(m.gain-1)*0.038))*(G._darkCam?0.25:1); // V72
 if(lift>0.002){
  c.save();c.globalCompositeOperation='lighter';
  c.fillStyle=`rgba(150,176,192,${lift.toFixed(3)})`;c.fillRect(0,0,w,h);
  c.restore();
 }
 return m;
}
// Верхний слой: оптика и «цифровая» грязь. Кладётся после зерна и сканлайнов.
function drawCineTop(c,w,h,now,cam,low,id,gain){
 const F=drawCineBase;
 const hh=(n)=>{const v=Math.sin(n*127.1+Math.floor(n)*0.7913)*43758.5453;return v-Math.floor(v);};
 // Авто-облегчение: если частота кадров просела, тяжёлые проходы выключаются сами.
 if(F._pt===undefined){F._pt=now;F._dt=1/60;}
 else{const d=Math.max(0.001,Math.min(0.5,now-F._pt));F._pt=now;F._dt+=(d-F._dt)*0.08;}
 const tier=window.__PERF?window.__PERF.tier:0;
 const lite=low||tier>0;
 G._cineLite=lite;
 // ---- хроматические аберрации: к краям кадра расходятся каналы ----
 if(!lite){
  const aw=Math.max(16,Math.round(w/2)),ah=Math.max(12,Math.round(h/2));
  const src=cineTmp('caSrc',aw,ah), tin=cineTmp('caTin',aw,ah);
  src.cx.clearRect(0,0,aw,ah);src.cx.imageSmoothingEnabled=true;
  src.cx.drawImage(c.canvas,0,0,w,h,0,0,aw,ah);
  const pass=(col,sc,al)=>{
   tin.cx.setTransform(1,0,0,1,0,0);
   tin.cx.globalCompositeOperation='source-over';
   tin.cx.clearRect(0,0,aw,ah);
   tin.cx.drawImage(src.cv,0,0);
   tin.cx.globalCompositeOperation='multiply';
   tin.cx.fillStyle=col;tin.cx.fillRect(0,0,aw,ah);
   tin.cx.globalCompositeOperation='source-over';
   c.save();c.globalCompositeOperation='lighter';c.globalAlpha=al;c.imageSmoothingEnabled=true;
   c.drawImage(tin.cv,-(w*(sc-1))*0.5,-(h*(sc-1))*0.5,w*sc,h*sc);
   c.restore();
  };
  pass('#ff5a4a',1.0055,0.10);   // красный канал шире
  pass('#4aa8ff',0.9945,0.09);   // синий уже
 }
 // ---- галация и анаморфный след от ярких пятен ----
 if(tier<2){
 const bw=Math.max(10,Math.round(w/12)),bh=Math.max(8,Math.round(h/12));
 const hb=cineTmp('halo',bw,bh);
 hb.cx.setTransform(1,0,0,1,0,0);
 hb.cx.globalCompositeOperation='source-over';
 hb.cx.clearRect(0,0,bw,bh);
 hb.cx.drawImage(c.canvas,0,0,w,h,0,0,bw,bh);
 // оставляем только светлые области
 hb.cx.globalCompositeOperation='multiply';
 hb.cx.fillStyle='#5a5a5a';hb.cx.fillRect(0,0,bw,bh);
 hb.cx.globalCompositeOperation='source-over';
 c.save();c.globalCompositeOperation='lighter';c.imageSmoothingEnabled=true;
 // V84: галация была вдвое сильнее и «поднимала» весь кадр в молоко.
 c.globalAlpha=low?0.05:0.075;
 c.drawImage(hb.cv,-w*0.14,h*0.004,w*1.28,h*0.992);   // растяжка по горизонтали
 if(!lite){c.globalAlpha=0.042;c.drawImage(hb.cv,-w*0.03,-h*0.03,w*1.06,h*1.06);}
 c.restore();
 }
 // ---- строчный сдвиг (rolling shutter): одна полоса «уезжает» ----
 const rs=((now*0.42)%1)*h;
 const rsH=Math.max(6,h*0.045);
 const rsO=Math.sin(now*7.3)*1.8+(hh(Math.floor(now*8))-0.5)*1.2;
 c.drawImage(c.canvas,0,rs,w,rsH,rsO,rs,w,rsH);
 // ---- артефакты сжатия: блоки 16×16 срываются на доли секунды ----
 const q=Math.floor(now*3.2);
 if(!lite&&hh(q*2.13+id*0.7)>0.72){
  const bs=low?24:16, n=low?8:12;
  const rx=hh(q*3.7)*w*0.7, ry=hh(q*5.1)*h*0.7;
  for(let i=0;i<n;i++){
   const bx=rx+Math.floor(hh(q*7.3+i*1.7)*6)*bs;
   const by=ry+Math.floor(hh(q*9.1+i*2.3)*5)*bs;
   const ox=(hh(q*11.3+i*3.1)-0.5)*bs*0.9, oy=(hh(q*13.7+i*4.3)-0.5)*bs*0.5;
   c.drawImage(c.canvas,bx,by,bs,bs,bx+ox,by+oy,bs,bs);
  }
 }
 // ---- битые пиксели матрицы (у каждой камеры свои, всегда на месте) ----
 for(let i=0;i<5;i++){
  const px=Math.floor(hh(i*4.7+id*13.1)*w), py=Math.floor(hh(i*8.3+id*7.9)*h);
  const hot=hh(i*2.1+id*3.3)>0.5;
  c.fillStyle=hot?`rgba(236,244,250,${(0.35+0.25*Math.sin(now*4+i)).toFixed(2)})`:'rgba(2,4,6,0.75)';
  c.fillRect(px,py,2,2);
 }
 // ---- жирное пятно на объективе: локальная дымка ----
 // V71: оба градиента собираются один раз на камеру, а не каждый кадр.
 if(!F._gr)F._gr={};
 let gr=F._gr[id];
 if(!gr||gr.w!==w||gr.h!==h){
  const sx=w*(0.20+0.6*hh(id*5.3)), sy=h*(0.18+0.5*hh(id*9.7));
  const sm=c.createRadialGradient(sx,sy,0,sx,sy,Math.min(w,h)*0.26);
  sm.addColorStop(0,'rgba(186,208,224,0.020)');
  sm.addColorStop(0.6,'rgba(186,208,224,0.007)');
  sm.addColorStop(1,'rgba(186,208,224,0)');
  const tg=c.createLinearGradient(0,0,0,h);
  tg.addColorStop(0,'rgba(74,104,134,0.10)');
  tg.addColorStop(0.55,'rgba(48,68,88,0.07)');
  tg.addColorStop(1,'rgba(28,34,44,0.14)');
  gr={w,h,sm,tg};F._gr[id]=gr;
 }
 c.save();c.globalCompositeOperation='lighter';c.fillStyle=gr.sm;c.fillRect(0,0,w,h);c.restore();
 // ---- киношная тональность: холодные тени, чуть тёплые блики ----
 c.save();
 c.globalCompositeOperation=lite?'overlay':'soft-light';
 c.fillStyle=gr.tg;c.fillRect(0,0,w,h);
 c.restore();
 // ---- лёгкое «дыхание» экспозиции ----
 const br=0.006*Math.sin(now*0.9)+0.004*Math.sin(now*2.7);
 if(br>0){c.save();c.globalCompositeOperation='lighter';c.fillStyle=`rgba(140,164,182,${br.toFixed(3)})`;c.fillRect(0,0,w,h);c.restore();}
 else{c.save();c.fillStyle=`rgba(2,5,8,${(-br).toFixed(3)})`;c.fillRect(0,0,w,h);c.restore();}
}
// V71: готовые плитки телевизионного «снега» — собираются один раз за всю игру.
let _stTiles=null;
function staticTile(i){
 if(!_stTiles){
  _stTiles=[];
  for(let k=0;k<4;k++){
   const cv=document.createElement('canvas');cv.width=128;cv.height=128;
   const tc=cv.getContext('2d'),im=tc.createImageData(128,128);
   for(let p=0;p<128*128;p++){const a=Math.random(),lit=a>.5;
    im.data[p*4]=lit?225:10;im.data[p*4+1]=lit?232:12;im.data[p*4+2]=lit?238:14;
    im.data[p*4+3]=Math.round(255*(0.10+0.55*a));}
   tc.putImageData(im,0,0);_stTiles.push(cv);
  }
 }
 return _stTiles[i%_stTiles.length];
}
// Эффекты «внутри сигнала»: сканлайны, шум, бегущая полоса, пыль на объективе.
function drawFeedFx(c,w,h,now,cam,low){
 const tier=window.__PERF?window.__PERF.tier:0;
 // V66: картинка стала спокойнее и атмосфернее.
 //  · зерно больше не пересобирается каждый кадр (не «кипит»), а сменяется 10 раз в секунду
 //  · сканлайны реже и мягче
 //  · добавлено цветение света (bloom): лампы и блики мягко расплываются
 //  · срывы кадра держатся 1/12 секунды, а не дрожат на каждом кадре
 const F=drawFeedFx;
 const hh=(n)=>{const v=Math.sin(n*127.1+Math.floor(n)*0.7913)*43758.5453;return v-Math.floor(v);};
 // ---- цветение света ----
 if(!low&&tier<2){
  const bw=Math.max(24,Math.round(w/10)), bh=Math.max(16,Math.round(h/10));
  if(!F._bl||F._bl.width!==bw||F._bl.height!==bh){
   F._bl=document.createElement('canvas');F._bl.width=bw;F._bl.height=bh;F._blc=F._bl.getContext('2d');
  }
  const bc=F._blc;
  bc.setTransform(1,0,0,1,0,0);
  bc.globalCompositeOperation='source-over';
  bc.clearRect(0,0,bw,bh);
  bc.drawImage(c.canvas,0,0,w,h,0,0,bw,bh);
  // V84: bright-pass — в цветение попадают только светлые области, а не весь кадр.
  bc.globalCompositeOperation='multiply';
  bc.fillStyle='#666666';bc.fillRect(0,0,bw,bh);
  bc.globalCompositeOperation='source-over';
  c.save();c.globalCompositeOperation='lighter';c.globalAlpha=.13;c.imageSmoothingEnabled=true;
  c.drawImage(F._bl,0,0,bw,bh,0,0,w,h);c.restore();
 }
 // ---- мягкое свечение люминофора по краям (градиент кэшируется) ----
 if(!F._vg||F._vgw!==w||F._vgh!==h){
  const g=c.createRadialGradient(w*.5,h*.48,Math.min(w,h)*.26,w*.5,h*.5,Math.max(w,h)*.72);
  g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(.62,'rgba(2,6,9,.44)');g.addColorStop(1,'rgba(0,1,2,.90)');
  F._vg=g;F._vgw=w;F._vgh=h;F._ov=null;
 }
 c.fillStyle=F._vg;c.fillRect(0,0,w,h);
 // ---- статичный слой: сканлайны + пыль + царапина на объективе ----
 // V71: раньше это было около трёхсот отдельных операций на каждый кадр,
 // теперь — одна картинка, собранная один раз.
 if(!F._ov||F._ovw!==w||F._ovh!==h){
  const cv=document.createElement('canvas');cv.width=Math.max(1,w);cv.height=Math.max(1,h);
  const oc=cv.getContext('2d');
  oc.fillStyle='rgba(0,0,0,.12)';
  for(let y=0;y<h;y+=4)oc.fillRect(0,y,w,1.6);
  for(let i=0;i<10;i++){
   const dx=hh(i*3.3)*w,dy=hh(i*7.7)*h,dr=1+hh(i*11.1)*2.4;
   oc.fillStyle=`rgba(206,224,236,${(0.02+0.04*hh(i*5.5)).toFixed(3)})`;
   oc.beginPath();oc.arc(dx,dy,dr,0,Math.PI*2);oc.fill();
  }
  oc.strokeStyle='rgba(206,224,236,.035)';oc.lineWidth=1;
  oc.beginPath();oc.moveTo(w*.18,0);oc.lineTo(w*.27,h);oc.stroke();
  F._ov=cv;F._ovw=w;F._ovh=h;
 }
 c.drawImage(F._ov,0,0);
 // ---- медленная кадровая полоса (градиент кэшируется, сдвиг через translate) ----
 const rb=((now*.085)%1)*(h+200)-100;
 if(!F._rg){
  const g=c.createLinearGradient(0,0,0,144);
  g.addColorStop(0,'rgba(172,214,236,0)');g.addColorStop(.5,'rgba(172,214,236,.038)');g.addColorStop(1,'rgba(172,214,236,0)');
  F._rg=g;
 }
 c.save();c.translate(0,rb-72);c.fillStyle=F._rg;c.fillRect(0,0,w,144);c.restore();
 // ---- ровное спокойное зерно из заранее собранных плиток ----
 const TS=96;
 if(!F._tiles){
  F._tiles=[];
  for(let k=0;k<4;k++){
   const cv=document.createElement('canvas');cv.width=TS;cv.height=TS;
   const tc=cv.getContext('2d'), im=tc.createImageData(TS,TS);
   for(let i=0;i<TS*TS;i++){
    const v=Math.random(), lit=v>.5;
    const a=lit?Math.round(26*(v-.5)*2):Math.round(30*(.5-v)*2);
    im.data[i*4]=lit?232:0;im.data[i*4+1]=lit?240:0;im.data[i*4+2]=lit?246:2;im.data[i*4+3]=a;
   }
   tc.putImageData(im,0,0);F._tiles.push(cv);
  }
 }
 const step=Math.floor(now*10);
 const tile=F._tiles[step%F._tiles.length];
 // V71: зерно кладётся одной заливкой узором вместо сотен отдельных копирований.
 c.save();c.globalAlpha=(low?.45:.8)*Math.min(1.7,Math.max(0.85,G._camGain||1))*(G._darkCam?0.55:1); // V72: меньше зерна в темноте
 const ox=-((step*37)%TS), oy=-((step*53)%TS);
 c.translate(ox,oy);
 c.fillStyle=c.createPattern(tile,'repeat');
 c.fillRect(0,0,w-ox+TS,h-oy+TS);
 c.restore();
 // ---- срыв кадра: полосы живут по 1/12 секунды ----
 // V93: в кадре с близким монстром тракт рвёт сильнее — картинка совпадает со звуком.
 const gl=Math.max(cam.glitch||0,G.switchFx||0)*(1+(G.camGrit||0)*0.85);
 if(gl>0.002){
  const q=Math.floor(now*12), bands=low?2:(tier===0?5:3);
  for(let i=0;i<bands;i++){
   const by=hh(q*1.7+i*3.1)*h, bh2=2+hh(q*2.3+i*5.7)*13, off=(hh(q*3.9+i*7.3)-.5)*w*.06*gl;
   c.drawImage(c.canvas,0,by,w,bh2,off,by,w,bh2);
  }
  c.fillStyle=`rgba(200,222,236,${(0.030*gl).toFixed(3)})`;
  c.fillRect(0,hh(q*4.4)*h,w,1+hh(q*5.5)*4);
 }
}
// Интерфейс поверх стекла: REC, время, номер камеры, уровень сигнала, блик.
function drawCamHUD(x,y,w,h,cam,now,alertLvl,low){
 const eL=camEdge(x,y,w,h,-1),eR=camEdge(x,y,w,h,1),eC=camEdge(x,y,w,h,0);
 // блик на стекле
 ctx.save();ctx.beginPath();
 const N=40;
 for(let i=0;i<=N;i++){const e=camEdge(x,y,w,h,i/N*2-1);i?ctx.lineTo(e.x,e.top):ctx.moveTo(e.x,e.top);}
 for(let i=N;i>=0;i--){const e=camEdge(x,y,w,h,i/N*2-1);ctx.lineTo(e.x,e.bot);}
 ctx.closePath();ctx.clip();
 const gr=ctx.createLinearGradient(x,y,x+w*.75,y+h);
 gr.addColorStop(0,'rgba(255,255,255,.055)');gr.addColorStop(.22,'rgba(255,255,255,.012)');
 gr.addColorStop(.45,'rgba(255,255,255,0)');
 ctx.fillStyle=gr;ctx.fillRect(x,y,w,h);
 // изогнутый световой отблеск сверху
 const hg=ctx.createLinearGradient(0,eC.top,0,eC.top+h*.22);
 hg.addColorStop(0,'rgba(200,230,255,.075)');hg.addColorStop(1,'rgba(200,230,255,0)');
 ctx.fillStyle=hg;ctx.fillRect(x,eC.top,w,h*.22);
 ctx.restore();
 // уголковые метки кадра
 const cl=Math.max(14,w*.024);
 ctx.strokeStyle='rgba(190,215,230,.40)';ctx.lineWidth=2;
 [[eL.x+8,eL.top+10,1,1],[eR.x-8,eR.top+10,-1,1],[eL.x+8,eL.bot-10,1,-1],[eR.x-8,eR.bot-10,-1,-1]].forEach(c0=>{
  ctx.beginPath();ctx.moveTo(c0[0],c0[1]+c0[3]*cl);ctx.lineTo(c0[0],c0[1]);ctx.lineTo(c0[0]+c0[2]*cl,c0[1]);ctx.stroke();});
 // ---- верхняя строка: REC + номер камеры + название ----
 const tx=eL.x+18,ty=eL.top+30;
 const blink=(now%1.4)<0.78;
 if(blink){
  ctx.save();ctx.globalCompositeOperation='lighter';
  const rg=ctx.createRadialGradient(tx+5,ty-5,0,tx+5,ty-5,11);
  rg.addColorStop(0,'rgba(255,60,70,.55)');rg.addColorStop(1,'rgba(255,60,70,0)');
  ctx.fillStyle=rg;ctx.beginPath();ctx.arc(tx+5,ty-5,11,0,Math.PI*2);ctx.fill();ctx.restore();
  ctx.fillStyle='#ff4a58';ctx.beginPath();ctx.arc(tx+5,ty-5,4,0,Math.PI*2);ctx.fill();
 }
 ctx.save();ctx.shadowColor='rgba(0,0,0,.9)';ctx.shadowBlur=6;
 ctx.font='700 13px "JetBrains Mono",monospace';ctx.textAlign='left';
 ctx.fillStyle=blink?'#ff8a92':'#7c5257';ctx.fillText('REC',tx+16,ty);
 ctx.fillStyle='#dfe8ee';ctx.font='700 15px "JetBrains Mono",monospace';
 ctx.fillText('CAM '+String(G.cam).padStart(2,'0'),tx+58,ty);
 ctx.fillStyle='#93a5b0';ctx.font='700 12px "JetBrains Mono",monospace';
 ctx.fillText('// '+cam.name.toUpperCase(),tx+140,ty);
 // ---- верхний правый угол: время смены и дата-заглушка ----
 ctx.textAlign='right';
 ctx.fillStyle='#dfe8ee';ctx.font='700 15px "JetBrains Mono",monospace';
 ctx.fillText(timeString(),eR.x-18,ty);
 ctx.fillStyle='#7f8f9a';ctx.font='700 10px "JetBrains Mono",monospace';
 ctx.fillText('NIGHT '+G.night+'  /  IR ON',eR.x-18,ty+14);
 // ---- нижняя строка: уровень сигнала и служебные метки ----
 // уровень сигнала — второй строкой под номером камеры, чтобы не спорить с обстановкой комнаты
 const byy=ty+20;
 ctx.textAlign='left';ctx.fillStyle='#7f8f9a';ctx.font='700 10px "JetBrains Mono",monospace';
 ctx.fillText('SIG',tx+16,byy);
 const bars=cam.state==='broken'?0:(cam.glitch>0?2:4);
 for(let i=0;i<4;i++){
  const bxx=tx+42+i*7,bhh=4+i*3;
  ctx.fillStyle=i<bars?'rgba(140,225,180,.85)':'rgba(120,135,145,.28)';
  ctx.fillRect(bxx,byy-bhh+2,4,bhh);}
 ctx.textAlign='right';
 ctx.fillStyle='#6f7d87';
 ctx.fillText('CH'+String(G.cam).padStart(2,'0')+'  ·  25 FPS  ·  AUX-'+String(600+G.cam*7),eR.x-18,eR.bot-16);
 ctx.restore();
 // ---- тревога: рамка по кривой стекла ----
 if(alertLvl>0){
  const pulse=.5+.5*Math.abs(Math.sin(now*(alertLvl>1?9:5)));
  ctx.save();ctx.beginPath();
  for(let i=0;i<=N;i++){const e=camEdge(x,y,w,h,i/N*2-1);i?ctx.lineTo(e.x,e.top):ctx.moveTo(e.x,e.top);}
  for(let i=N;i>=0;i--){const e=camEdge(x,y,w,h,i/N*2-1);ctx.lineTo(e.x,e.bot);}
  ctx.closePath();
  ctx.strokeStyle=`rgba(255,40,50,${((alertLvl>1?.55:.35)+(alertLvl>1?.45:.30)*pulse).toFixed(2)})`;
  ctx.lineWidth=(alertLvl>1?3:2)+2*pulse;ctx.stroke();ctx.restore();
  ctx.save();ctx.shadowColor='rgba(0,0,0,.9)';ctx.shadowBlur=6;
  ctx.font='700 13px "Inter",Arial,sans-serif';ctx.textAlign='right';
  ctx.fillStyle=`rgba(255,90,100,${(0.7+0.3*pulse).toFixed(2)})`;
  ctx.fillText(alertLvl>1?'\u26A0 ТРЕВОГА — У ДВЕРИ':'\u26A0 ДВИЖЕНИЕ В КОРИДОРЕ',eR.x-18,eR.top+52);
  ctx.restore();
 }
}
// V64: компактный переключатель камер в правом нижнем углу — как маленький план
// помещения на планшете: кнопки-таблички КАМ, линии коридоров и метка охраны.
function mapGeo(){
 const pw=Math.min(330,Math.max(210,W*.225)), ph=pw*.64;
 return {px:W-pw-Math.max(14,W*.028), py:H-ph-Math.max(52,H*.088)-Math.max(14,H*.022), pw, ph};
}
const MAP_ROOMS=[
 {cam:4,x:.50,y:.09},
 {cam:1,x:.50,y:.36},
 {cam:3,x:.13,y:.36},
 {cam:5,x:.87,y:.36},
 {cam:2,x:.50,y:.62},
 {cam:6,x:.28,y:.86},
 {cam:7,x:.72,y:.86}
];
function mapBox(){const g=mapGeo();const bw=Math.max(36,g.pw*.185);return {bw,bh:bw*.52};}
function drawMap(){
 const g=mapGeo(),b=mapBox(),t=performance.now()/1000;
 const X=r=>g.px+r.x*g.pw, Y=r=>g.py+r.y*g.ph;
 ctx.save();
 // подложка: тёмное матовое стекло с тонкой рамкой
 roundedRect(ctx,g.px-10,g.py-10,g.pw+20,g.ph+20,6,'rgba(4,7,10,.62)','rgba(180,205,215,.22)',1.4);
 // линии переходов
 ctx.strokeStyle='rgba(140,170,185,.30)';ctx.lineWidth=2;ctx.lineCap='round';
 const yx=g.px+.50*g.pw, yy=g.py+g.ph;
 ctx.beginPath();
 ctx.moveTo(X(MAP_ROOMS[0]),Y(MAP_ROOMS[0]));ctx.lineTo(X(MAP_ROOMS[4]),Y(MAP_ROOMS[4]));
 ctx.moveTo(X(MAP_ROOMS[2]),Y(MAP_ROOMS[2]));ctx.lineTo(X(MAP_ROOMS[3]),Y(MAP_ROOMS[3]));
 ctx.moveTo(X(MAP_ROOMS[2]),Y(MAP_ROOMS[2]));ctx.lineTo(X(MAP_ROOMS[5]),Y(MAP_ROOMS[5]));
 ctx.moveTo(X(MAP_ROOMS[3]),Y(MAP_ROOMS[3]));ctx.lineTo(X(MAP_ROOMS[6]),Y(MAP_ROOMS[6]));
 ctx.moveTo(X(MAP_ROOMS[5]),Y(MAP_ROOMS[5]));ctx.lineTo(yx,yy);
 ctx.moveTo(X(MAP_ROOMS[6]),Y(MAP_ROOMS[6]));ctx.lineTo(yx,yy);
 ctx.stroke();
 // красные метки только у коридоров и у двери охраны
 // V73: аниматроник, забившийся в угол коридора, не попадает в зону датчика —
 // значит и на карте его метка не горит. Тревога только когда он вышел к проходу.
 const monsterRooms=new Set((G.monsters||[]).filter(m=>m&&m.state!=='hidden'&&!m.corner&&window.CameraSystem.CORRIDOR_ROOMS.indexOf(m.room)>=0).map(m=>m.room));
 (G.monsters||[]).filter(m=>m&&m.state!=='hidden'&&m.room===0).map(m=>window.CameraSystem.corridorForSide(m.doorSide)).filter(r=>r>0).forEach(r=>monsterRooms.add(r));
 const pulse=0.5+0.5*Math.abs(Math.sin(t*9));
 // метка охраны
 ctx.fillStyle='rgba(200,215,225,.85)';ctx.fillRect(yx-5,yy-5,10,10);
 ctx.strokeStyle='rgba(200,215,225,.45)';ctx.lineWidth=1;ctx.strokeRect(yx-8,yy-8,16,16);
 // таблички камер
 MAP_ROOMS.forEach(r=>{
  const bx=X(r)-b.bw*.5, by=Y(r)-b.bh*.5;
  const cur=G.cam===r.cam, occ=monsterRooms.has(r.cam);
  if(occ){ctx.fillStyle=`rgba(255,40,50,${(0.14+0.20*pulse).toFixed(3)})`;
   ctx.fillRect(bx-5,by-5,b.bw+10,b.bh+10);}
  const bg=ctx.createLinearGradient(bx,by,bx,by+b.bh);
  if(cur){bg.addColorStop(0,'#d8e2e8');bg.addColorStop(1,'#9fb0bb');}
  else{bg.addColorStop(0,'#1b242c');bg.addColorStop(1,'#0b1015');}
  ctx.fillStyle=bg;ctx.fillRect(bx,by,b.bw,b.bh);
  ctx.strokeStyle=occ?`rgba(255,60,70,${(0.6+0.4*pulse).toFixed(2)})`:(cur?'rgba(255,120,130,.9)':'rgba(150,175,190,.42)');
  ctx.lineWidth=cur?2:1.2;ctx.strokeRect(bx+.6,by+.6,b.bw-1.2,b.bh-1.2);
  // V66: слово «КАМ» с табличек убрано — остался только номер камеры.
  ctx.textAlign='center';
  ctx.font='700 '+Math.round(b.bh*.56)+'px "JetBrains Mono",monospace';
  ctx.fillStyle=cur?'#101820':'#b8c6cf';
  ctx.fillText(String(r.cam).padStart(2,'0'),bx+b.bw*.5,by+b.bh*.70);
 });
 ctx.restore();
}
function drawTabletBar(){button(W*.06,H*.755,W*.22,40,G.monitor?'ЗАКРЫТЬ КАМЕРЫ':'КАМЕРЫ',G.monitor);}
// V86: геометрия нижних кнопок вынесена в одну функцию. Раньше рисование и обработка
// нажатий считали её по отдельности двумя рядами, и на низком экране (телефон в
// ландшафте, высота около 340 px) второй ряд с «ЗАПИСКОЙ» уходил за нижний край.
// Теперь при малой высоте всё встаёт в один ряд, а клики берут те же прямоугольники.
function hudRow(){
 const low=menuLow();
 const gap=Math.max(low?8:10,W*(low?.012:.018));
 const main=[{k:'cam',l:'КАМЕРЫ',a:false},
  {k:'phone',l:'ТЕЛЕФОН',a:G.phone.state!=='idle'||G.dialer||G.phoneArchiveOpen},
  {k:'pause',l:'ПАУЗА',a:G.state==='pause'}];
 const extra=[];
 if(G.note.state!=='gone')extra.push({k:'note',l:'ЗАПИСКА',a:G.note.open});
 if(G.mask&&G.mask.available)extra.push({k:'mask',l:'МАСКА',a:G.mask.worn});
 if(low){
  const all=main.concat(extra),n=all.length;
  const bh=Math.max(32,Math.min(42,H*.13));
  const bw=Math.min(150,(W*.80-gap*(n-1))/n);
  const y=Math.min(H*.72,H-bh-Math.max(26,H*.10));
  const x0=(W-(bw*n+gap*(n-1)))*.5;
  all.forEach((b,i)=>{b.x=x0+i*(bw+gap);b.y=y;b.w=bw;b.h=bh;});
  return all;
 }
 const y=H*.72,bw=Math.min(150,(W*.84-gap*2)/3),rowX=(W-(bw*3+gap*2))*.5;
 main.forEach((b,i)=>{b.x=rowX+i*(bw+gap);b.y=y;b.w=bw;b.h=46;});
 const y2=y+56,bw2=Math.min(170,(W*.84-gap*2)/3),row2X=(W-(bw2*3+gap*2))*.5;
 extra.forEach((b,i)=>{b.x=row2X+i*(bw2+gap);b.y=y2;b.w=bw2;b.h=40;});
 return main.concat(extra);
}
 function drawControls(){
 // Normal mode: full bottom HUD (speed, cameras, phone, pause, note, mask, energy, power usage).
 // Camera mode: ONLY the close-cameras button (everything else hidden while in cameras).
 if(G.monitor){
  closeBar();
  return;
 }
 const low=menuLow();
 button(W*.04,low?H*.07:H*.12,low?78:92,low?34:40,'X'+(G.speedMult||1),G.speedMult>1);
 hudRow().forEach(b=>button(b.x,b.y,b.w,b.h,b.l,b.a));
 text2(ctx,'ЭНЕРГИЯ '+Math.max(0,Math.floor(G.battery))+'%',18,low?H*.875:H*.89,low?12:14,G.battery<20?'#d94b57':'#aeb8c0');
 drawPowerUsage();
 text2(ctx,'СМЕНА '+(G.extra||G.night)+'  '+timeString(),W*.5,H*.965,13,G.battery<20?'#d94b57':'#9fb0c4');
 if(G.battery<20){ctx.fillStyle='rgba(193,46,62,.10)';ctx.fillRect(0,H*.95,W,H*.05);}
 drawAdButtons();   // V104: кнопка «реклама за заряд», если заряд на исходе
 drawSideButtons();
 drawTurnArrows();
}
// ==== V104: РЕКЛАМА ЗА НАГРАДУ — ГЕОМЕТРИЯ КНОПОК ====
// ПОЧЕМУ ТАК: у площадки два вида рекламы, и второй (за награду) игрок включает
// сам. Значит нужна кнопка, и она обязана появляться только тогда, когда награда
// реально нужна, иначе это назойливость.
// Кнопка заряда: видна в смене, если заряд упал ниже 26%, ролик доступен и в этой
// смене её ещё не использовали. Стоит справа снизу — там пусто: боковые кнопки
// двери и света висят на 0.28-0.42 высоты, стрелки поворота — на 0.63.
function adChargeRect(){
 if(G.state!=='game')return null;
 if(G.monitor||(G.mask&&G.mask.worn))return null;
 if(G.adChargeUsed)return null;
 if(!(G.battery<26))return null;
 if(!window.Platform?.rewardReady?.())return null;
 const low=menuLow();
 // Ширина под самую длинную подпись; на узком экране подпись короче, иначе текст
 // прижимался к краям кнопки.
 const bw=Math.min(low?170:222,W*(low?.30:.25)),bh=low?30:36;
 return {x:W-12-bw,y:low?H*.855:H*.865,w:bw,h:bh};
}
// Кнопка второй попытки на экране проигрыша: под кнопкой «В МЕНЮ».
function adRetryRect(){
 if(G.state!=='lose')return null;
 if(G.adRetryUsed)return null;
 if(!window.Platform?.rewardReady?.())return null;
 // 300 px, а не 260: подпись длиннее, чем «В МЕНЮ», и в узкой кнопке текст
 // прижимался к самым бортам.
 const bw=Math.min(300,W*.72);
 return {x:W*.5-bw/2,y:H*.55+58,w:bw,h:44};
}
function drawAdButtons(){
 const r=adChargeRect();
 if(r)button(r.x,r.y,r.w,r.h,(menuLow()||W<1150)?'РЕКЛАМА +25%':'РЕКЛАМА: +25% ЗАРЯДА',true);
}
// Заряд за ролик: начисляем только по факту награды.
function adChargeGo(){
 const r=adChargeRect(); if(!r)return false;
 window.AudioFX.play('click',.3,{group:'ui'});
 window.Platform.rewarded(()=>{
   G.adChargeUsed=true;
   G.battery=Math.min(100,(G.battery||0)+25);
   window.SaveSystem.save();
   setMessage('ГЕНЕРАТОР ПОДКЛЮЧЁН: +25% ЗАРЯДА',3);
 },(ok)=>{ if(!ok)setMessage('РОЛИК НЕ ДОСМОТРЕН — ЗАРЯД НЕ ИЗМЕНИЛСЯ',2.4); });
 return true;
}
// Вторая попытка за ролик: смерть не идёт в счёт (а значит и на выбор концовки),
// и смена начинается заново с начала.
function adRetryGo(){
 const r=adRetryRect(); if(!r)return false;
 window.AudioFX.play('click',.35,{group:'ui'});
 window.Platform.rewarded(()=>{
   G.adRetryUsed=true;
   const d=Math.max(0,Math.floor(Number(window.SaveSystem.data.deaths)||0));
   window.SaveSystem.data.deaths=Math.max(0,d-1);
   window.SaveSystem.save();
   startNight(G.night,G.extra||null);
   // Вступительную сценку пропускаем: игрок эту смену уже начинал.
   beginPlay();
   setMessage('СМЕНА НАЧАТА ЗАНОВО. ЭТА СМЕРТЬ НЕ УЧТЕНА',3.4);
 },(ok)=>{ if(!ok)setMessage('РОЛИК НЕ ДОСМОТРЕН — ПОПЫТКА НЕ ВЫДАНА',2.4); });
 return true;
}
function drawPowerUsage(){
 // V102: пять делений вместо шести — ровно столько уровней нагрузки и бывает
 // (сам пост + две двери + две лампы/планшет). Последние деления краснеют,
 // чтобы было сразу видно: так до утра не дотянуть.
 const bars=Math.max(1,Math.min(5,G.powerUsage||1));
 const x=18,y=menuLow()?H*.975:H*.91; text2(ctx,'РАСХОД',x,y,10,'#66727c');
 for(let i=0;i<5;i++){
   const on=i<bars;
   ctx.fillStyle=on?(i>=4?'#d94b57':(i>=3?'#e08a2e':'#d2a92d')):'#273038';
   ctx.fillRect(x+58+i*14,y-9,10,7);
 }
 if(G.powerPulse>0){ctx.fillStyle='rgba(210,169,45,'+(.12+G.powerPulse*.2)+')';ctx.fillRect(x-4,y-19,150,24);}
}
function timeString(){const mins=Math.floor(G.time),h=Math.floor(mins/60),m=mins%60;return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')}
// Shared 3-position camera turn used by keyboard (A/D) AND mobile touch arrows.
// V84: ЭКРАННЫЕ КНОПКИ ДВЕРИ И СВЕТА (без подписей).
// Было: створку и лампу приходилось нажимать прямо по стене офиса, попасть можно
// было только развернувшись в проём, а на телефоне промах был почти всегда.
// Стало: у каждого края экрана стоит пара кнопок — сверху красная (закрыть/открыть
// дверь), под ней жёлтая (включить/выключить лампу). Текста на кнопках нет:
// состояние читается по свечению, символу и звуку.
function sideButtonZones(){
 const s=Math.max(44,Math.min(62,W*0.042));
 const gap=Math.max(9,s*0.20);
 const yTop=Math.round(H*0.285);
 return {s,gap,
  left:{door:{x:10,y:yTop,w:s,h:s},light:{x:10,y:yTop+s+gap,w:s,h:s}},
  right:{door:{x:W-10-s,y:yTop,w:s,h:s},light:{x:W-10-s,y:yTop+s+gap,w:s,h:s}}};
}
function sideButtonPlate(r,active,hue,pulse){
 const rr=Math.max(8,r.w*0.22);
 ctx.save();
 ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,rr);
 const g=ctx.createLinearGradient(0,r.y,0,r.y+r.h);
 g.addColorStop(0,'rgba(20,25,33,.88)');g.addColorStop(.55,'rgba(8,11,16,.94)');g.addColorStop(1,'rgba(20,25,33,.88)');
 ctx.fillStyle=g;ctx.fill();
 if(active){ctx.fillStyle='rgba('+hue+',0.13)';ctx.fill();}
 ctx.strokeStyle='rgba(255,255,255,.06)';ctx.lineWidth=1;ctx.stroke();
 ctx.strokeStyle='rgba('+hue+','+(active?0.90:0.34)+')';ctx.lineWidth=1.5;
 if(active){ctx.shadowColor='rgba('+hue+','+(0.40+0.30*pulse)+')';ctx.shadowBlur=13;}
 ctx.beginPath();ctx.roundRect(r.x+.5,r.y+.5,r.w-1,r.h-1,rr);ctx.stroke();
 ctx.shadowBlur=0;ctx.restore();
}
function drawDoorIcon(r,closed,pulse){
 const cx=r.x+r.w/2,cy=r.y+r.h/2,s=r.w*0.30;
 ctx.save();ctx.translate(cx,cy);
 ctx.lineJoin='round';ctx.lineCap='round';
 // проём
 ctx.strokeStyle=closed?'rgba(236,96,88,.95)':'rgba(150,84,80,.60)';
 ctx.lineWidth=Math.max(1.8,r.w*0.055);
 if(closed){ctx.shadowColor='rgba(214,58,52,'+(0.45+0.30*pulse)+')';ctx.shadowBlur=10;}
 ctx.strokeRect(-s,-s*1.12,s*2,s*2.24);
 // створка: закрыта — залита полосами, открыта — сдвинута к краю
 if(closed){
  ctx.fillStyle='rgba(214,58,52,.30)';ctx.fillRect(-s,-s*1.12,s*2,s*2.24);
  ctx.strokeStyle='rgba(246,140,132,.85)';ctx.lineWidth=Math.max(1.2,r.w*0.032);
  for(let i=0;i<3;i++){const yy=-s*0.62+i*s*0.62;ctx.beginPath();ctx.moveTo(-s*0.78,yy);ctx.lineTo(s*0.78,yy);ctx.stroke();}
 }else{
  ctx.fillStyle='rgba(120,66,62,.22)';ctx.fillRect(-s,-s*1.12,s*0.62,s*2.24);
  ctx.strokeStyle='rgba(150,84,80,.75)';ctx.lineWidth=Math.max(1.2,r.w*0.032);
  ctx.beginPath();ctx.moveTo(-s*0.38,-s*1.12);ctx.lineTo(-s*0.38,s*1.12);ctx.stroke();
 }
 ctx.shadowBlur=0;ctx.restore();
}
function drawLampIcon(r,on,pulse){
 const cx=r.x+r.w/2,cy=r.y+r.h/2,s=r.w*0.26;
 ctx.save();ctx.translate(cx,cy);
 ctx.lineJoin='round';ctx.lineCap='round';
 const col=on?'rgba(246,211,94,.98)':'rgba(126,116,74,.62)';
 ctx.strokeStyle=col;ctx.lineWidth=Math.max(1.8,r.w*0.055);
 if(on){ctx.shadowColor='rgba(240,194,74,'+(0.45+0.30*pulse)+')';ctx.shadowBlur=11;}
 // корпус плафона
 ctx.beginPath();ctx.moveTo(-s,-s*0.30);ctx.lineTo(s,-s*0.30);ctx.lineTo(s*0.62,s*0.28);ctx.lineTo(-s*0.62,s*0.28);ctx.closePath();ctx.stroke();
 if(on){ctx.fillStyle='rgba(246,211,94,.26)';ctx.fill();}
 // крепление
 ctx.beginPath();ctx.moveTo(0,-s*0.30);ctx.lineTo(0,-s*0.92);ctx.stroke();
 // лучи вниз, только когда горит
 if(on){
  ctx.lineWidth=Math.max(1.2,r.w*0.032);
  for(let i=-1;i<=1;i++){
   ctx.globalAlpha=0.55+0.35*pulse;
   ctx.beginPath();ctx.moveTo(i*s*0.42,s*0.42);ctx.lineTo(i*s*0.72,s*1.02);ctx.stroke();
  }
  ctx.globalAlpha=1;
 }
 ctx.shadowBlur=0;ctx.restore();
}
function drawSideButtons(){
 if(G.monitor)return;
 if(G.mask&&G.mask.worn)return;
 // V111: боковые кнопки двери/света по умолчанию ВЫКЛ — игрок нажимает прямо
 // на дверь и лампу в офисе. Старые кнопки включаются в настройках.
 if(window.SaveSystem.settings.sideButtons!==true)return;
 const z=sideButtonZones(),t=performance.now()/1000;
 const pulse=0.5+0.5*Math.sin(t*2.4);
 ['left','right'].forEach(side=>{
  const closed=!!(G.doors&&G.doors[side]);
  const on=!!(G.lights&&G.lights[side]&&G.lights[side].on);
  sideButtonPlate(z[side].door,closed,'214,58,52',pulse);
  drawDoorIcon(z[side].door,closed,pulse);
  sideButtonPlate(z[side].light,on,'226,178,52',pulse);
  drawLampIcon(z[side].light,on,pulse);
 });
}
function hitSideButtons(x,y){
 if(G.monitor)return false;
 if(G.mask&&G.mask.worn)return false;
 // V111: если боковые кнопки выключены в настройках — клики по ним не ловим,
 // иначе получились бы невидимые зоны-перехватчики.
 if(window.SaveSystem.settings.sideButtons!==true)return false;
 const z=sideButtonZones();
 for(const side of ['left','right']){
  const d=z[side].door,l=z[side].light;
  if(hitRect(x,y,d.x,d.y,d.w,d.h)){toggleGuardDoor(side);window.AudioFX.play('click',.22,{group:'ui'});return true;}
  if(hitRect(x,y,l.x,l.y,l.w,l.h)){if(window.LightingSystem.canUse())window.LightingSystem.toggle(G,side);return true;}
 }
 return false;
}
// V111: ПРЯМОЕ НАЖАТИЕ НА ДВЕРЬ И ЛАМПУ В ОФИСЕ. Двери и выключатели нарисованы в
// пространстве панорамы офиса (World.office), поэтому клик переводится в координаты
// панорамы через OfficePano.screenToOffice() и сверяется с прямоугольниками дверных
// проёмов и выключателей. Так игрок жмёт именно на дверь, а не на кнопку на экране.
function officeDoorZones(){
 const PW=window.OfficePano.panW();
 // Дверные проёмы (из World.office: drawDoorBay на W*.02/H*.20/W*.23/H*.38 и W*.75/...)
 return {
  left:{x:PW*0.02,y:H*0.20,w:PW*0.23,h:H*0.38},
  right:{x:PW*0.75,y:H*0.20,w:PW*0.23,h:H*0.38},
  // Выключатели света (drawLightSwitch на W*.235/H*.62 и W*.765/H*.62, корпус 48×34)
  leftSwitch:{x:PW*0.235-26,y:H*0.62-20,w:52,h:40},
  rightSwitch:{x:PW*0.765-26,y:H*0.62-20,w:52,h:40}
 };
}
function hitOfficeControls(x,y){
 if(G.monitor)return false;
 if(G.mask&&G.mask.worn)return false;
 if(!window.OfficePano||typeof window.OfficePano.screenToOffice!=='function')return false;
 const op=window.OfficePano.screenToOffice(x,y);
 const z=officeDoorZones();
 const inR=(r)=>op.x>=r.x&&op.x<=r.x+r.w&&op.y>=r.y&&op.y<=r.y+r.h;
 // Сначала выключатели — они меньше, дверь не должна перехватить нажатие по лампе.
 if(inR(z.leftSwitch)){window.LightingSystem.toggle(G,'left');return true;}
 if(inR(z.rightSwitch)){window.LightingSystem.toggle(G,'right');return true;}
 if(inR(z.left)){toggleGuardDoor('left');window.AudioFX.play('click',.22,{group:'ui'});return true;}
 if(inR(z.right)){toggleGuardDoor('right');window.AudioFX.play('click',.22,{group:'ui'});return true;}
 return false;
}
function stepYaw(dir){G.yawPos=Math.max(0,Math.min(2,G.yawPos+dir));G.viewYawTarget=YAW_POS[G.yawPos];window.AudioFX.play('click',.3,{group:'ui'})}
// Боковые стрелки поворота камеры (режим «стрелки», офис): по бокам экрана.
// Клик/тап по левой — поворот влево, по правой — вправо. В режиме «мышь» и в камерах скрыты.
function turnArrowZones(){const aw=Math.max(34,Math.min(54,W*0.045)),ah=Math.max(56,Math.min(84,H*0.12));const ay=H*0.63;return {aw,ah,left:{x:8,y:ay-ah/2,w:aw,h:ah},right:{x:W-8-aw,y:ay-ah/2,w:aw,h:ah}};}
function drawTurnArrows(){if(G.monitor)return;if(window.SaveSystem.settings.camMode!=='стрелки')return;const z=turnArrowZones(),t=performance.now()/1000;
 const draw=(r,dir,canTurn)=>{
  const cx=r.x+r.w/2,cy=r.y+r.h/2;const rr=Math.min(r.w*0.5,r.h/2);const pulse=0.5+0.5*Math.sin(t*2.6+(dir<0?0:1.7));
  ctx.save();
  ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,rr);
  const g=ctx.createLinearGradient(0,r.y,0,r.y+r.h);g.addColorStop(0,'rgba(18,23,32,.82)');g.addColorStop(.5,'rgba(7,10,15,.90)');g.addColorStop(1,'rgba(18,23,32,.82)');ctx.fillStyle=g;ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.07)';ctx.lineWidth=1;ctx.stroke();
  const col=canTurn?'#f0c24a':'#39434e';
  if(canTurn){ctx.shadowColor='rgba(240,194,74,'+(0.35+0.3*pulse)+')';ctx.shadowBlur=14;}
  ctx.strokeStyle=col;ctx.lineWidth=1.4;ctx.beginPath();ctx.roundRect(r.x,r.y,r.w,r.h,rr);ctx.stroke();ctx.shadowBlur=0;
  const s=r.w*0.20;ctx.translate(cx,cy);if(dir<0)ctx.scale(-1,1);
  const chc=canTurn?'#f6d35e':'#465059';
  ctx.strokeStyle=chc;ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=Math.max(2.2,r.w*0.10);
  if(canTurn){ctx.shadowColor='rgba(240,194,74,'+(0.5+0.3*pulse)+')';ctx.shadowBlur=9;}
  ctx.beginPath();ctx.moveTo(-s,-s*0.85);ctx.lineTo(0,0);ctx.lineTo(-s,s*0.85);ctx.stroke();
  ctx.beginPath();ctx.moveTo(0,-s*0.85);ctx.lineTo(s,0);ctx.lineTo(0,s*0.85);ctx.stroke();
  ctx.shadowBlur=0;ctx.restore();
 };
 draw(z.left,-1,G.yawPos>0);draw(z.right,1,G.yawPos<2);}
// Corner HUD icon geometry (cameras / phone / pause). Kept tiny and out of the bottom bar.
function cornerIcons(){const sz=Math.min(50,W*.032),gap=8,ix=W-sz-12,iy=12;const c={cam:ix,phone:ix-(sz+gap),pause:ix-(sz+gap)*2,sz,iy};return c;}
 function drawNote(){
 const n=Math.min(5,Math.max(1,G.night||1));
 const low=document.body.classList.contains('low-end');
 const cx=W*.5, cy=H*.43;
 const pw=Math.min(W*.58,760), ph=Math.min(H*.68,570);
 const t=performance.now()/1000;
 const hw=pw/2, hh=ph/2;
 // 1) комната гаснет: игрок поднёс листок к настольной лампе
 ctx.save();
 ctx.fillStyle='rgba(2,3,6,.52)';ctx.fillRect(0,0,W,H);
 const room=ctx.createRadialGradient(cx,cy-ph*.12,ph*.30,cx,cy,Math.max(W,H)*.62);
 room.addColorStop(0,'rgba(0,0,0,0)');room.addColorStop(1,'rgba(0,0,0,.72)');
 ctx.fillStyle=room;ctx.fillRect(0,0,W,H);
 ctx.restore();
 ctx.save();
 // 2) сам листок: бумага, а не окно интерфейса — рваные края, дрожь в руках
 ctx.translate(cx,cy);
 ctx.rotate(Math.sin(t*.7)*.004+Math.sin(t*2.3)*.0012+(n-1)*-.006);
 ctx.shadowColor='rgba(0,0,0,.8)';ctx.shadowBlur=44;ctx.shadowOffsetY=22;
 ctx.fillStyle='#c9bfa4';
 const edge=()=>{ctx.beginPath();
  ctx.moveTo(-hw,-hh+10);ctx.lineTo(-hw*.55,-hh+5);ctx.lineTo(-hw*.12,-hh+9);ctx.lineTo(hw*.35,-hh+3);ctx.lineTo(hw,-hh+11);
  ctx.lineTo(hw-5,hh*.58);ctx.lineTo(hw-13,hh);ctx.lineTo(hw*.35,hh-5);ctx.lineTo(-hw*.25,hh-1);ctx.lineTo(-hw,hh-12);ctx.closePath();};
 edge();ctx.fill();
 ctx.shadowBlur=0;ctx.shadowOffsetY=0;
 ctx.save();edge();ctx.clip();
 // 3) свет лампы сверху слева, дальний угол уходит в тень
 const lamp=ctx.createRadialGradient(-hw*.45,-hh*.55,10,-hw*.2,-hh*.1,pw*.95);
 lamp.addColorStop(0,'rgba(255,242,208,.34)');lamp.addColorStop(.40,'rgba(240,214,166,.08)');lamp.addColorStop(1,'rgba(26,16,7,.52)');
 ctx.fillStyle=lamp;ctx.fillRect(-hw,-hh,pw,ph);
 const fall=ctx.createLinearGradient(-hw,-hh,hw,hh);
 fall.addColorStop(0,'rgba(255,252,238,.12)');fall.addColorStop(.32,'rgba(90,64,34,.16)');fall.addColorStop(.70,'rgba(30,20,10,.40)');fall.addColorStop(1,'rgba(10,6,3,.62)');
 ctx.fillStyle=fall;ctx.fillRect(-hw,-hh,pw,ph);
 // затемнение к краям листка: центр под лампой, периферия уходит в тень
 const pv=ctx.createRadialGradient(-hw*.30,-hh*.34,ph*.10,-hw*.10,0,pw*.72);
 pv.addColorStop(0,'rgba(0,0,0,0)');pv.addColorStop(.55,'rgba(18,12,6,.20)');pv.addColorStop(1,'rgba(12,8,4,.52)');
 ctx.fillStyle=pv;ctx.fillRect(-hw,-hh,pw,ph);
 // 4) следы жизни листка: линовка, сгибы, кофейное кольцо, дырки от степлера
 ctx.strokeStyle='rgba(70,64,52,.10)';ctx.lineWidth=1;
 for(let y=-ph*.20;y<hh*.72;y+=28){ctx.beginPath();ctx.moveTo(-hw*.80,y);ctx.lineTo(hw*.80,y+1);ctx.stroke();}
 ctx.strokeStyle='rgba(120,30,40,.10)';ctx.beginPath();ctx.moveTo(-hw*.86,-hh);ctx.lineTo(-hw*.86,hh);ctx.stroke();
 // сгибы: тень с одной стороны, засветка с другой
 [-hh*.22,hh*.24].forEach(fy=>{
   const cg=ctx.createLinearGradient(0,fy-9,0,fy+9);
   cg.addColorStop(0,'rgba(255,250,230,.14)');cg.addColorStop(.5,'rgba(90,74,52,.20)');cg.addColorStop(1,'rgba(255,250,230,.07)');
   ctx.fillStyle=cg;ctx.fillRect(-hw,fy-9,pw,18);});
 const vg2=ctx.createLinearGradient(-6,0,6,0);
 vg2.addColorStop(0,'rgba(255,250,230,.10)');vg2.addColorStop(.5,'rgba(90,74,52,.16)');vg2.addColorStop(1,'rgba(255,250,230,.06)');
 ctx.fillStyle=vg2;ctx.fillRect(-6,-hh,12,ph);
 // кофейное кольцо
 ctx.save();ctx.strokeStyle='rgba(112,74,34,.20)';ctx.lineWidth=6;
 ctx.beginPath();ctx.ellipse(hw*.52,hh*.44,52,20,-.2,0,Math.PI*2);ctx.stroke();
 ctx.strokeStyle='rgba(112,74,34,.10)';ctx.lineWidth=2;
 ctx.beginPath();ctx.ellipse(hw*.52,hh*.44,44,15,-.2,.4,Math.PI*1.7);ctx.stroke();ctx.restore();
 // дырки от степлера и ржавая скрепка
 ctx.fillStyle='rgba(30,26,20,.45)';ctx.fillRect(-hw*.72,-hh*.80,3,7);ctx.fillRect(-hw*.72+9,-hh*.80,3,7);
 ctx.fillStyle='rgba(150,140,120,.55)';ctx.fillRect(-hw*.74,-hh*.86,16,3);
 ctx.fillStyle='rgba(96,52,28,.30)';ctx.fillRect(-hw*.74,-hh*.83,16,2);
 // зерно бумаги и пятна
 for(let i=0;i<90+n*24;i++){
   const rx=-hw+((i*83)%1000)/1000*pw, ry=-hh+((i*47)%1000)/1000*ph;
   ctx.fillStyle=i%3?'rgba(55,48,40,.05)':'rgba(96,70,42,.08)';
   ctx.fillRect(rx,ry,2+(i%4)*2,1+(i%3));
 }
 // смазанный оттиск печати (буквы не читаются — только след краски)
 ctx.save();ctx.translate(hw*.42,-hh*.62);ctx.rotate(-.22);ctx.globalAlpha=.22;
 ctx.strokeStyle='#5b2340';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,0,44,26,0,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle='#5b2340';
 for(let i=0;i<7;i++)ctx.fillRect(-30+i*9,-6+((i*5)%7),6,3);
 ctx.restore();
 // 5) порча растёт от ночи к ночи
 if(n>=2){
   for(let i=0;i<n*8;i++){
     const gx=-hw*.86+((i*61)%92)/100*pw, gy=-hh*.72+((i*37)%84)/100*ph;
     ctx.fillStyle=i%2?'rgba(20,20,24,.30)':'rgba(125,24,37,.34)';
     ctx.fillRect(gx,gy,4+(i%6)*3,2+(i%4)*3);
   }
   ctx.strokeStyle=`rgba(102,18,27,${.35+n*.08})`;ctx.lineWidth=2+n*.45;
   ctx.beginPath();ctx.moveTo(hw*.48,-hh*.42);ctx.bezierCurveTo(hw*.38,-hh*.05,hw*.55,.04*ph,hw*.40,.30*ph);ctx.stroke();
   ctx.fillStyle='rgba(105,18,27,.68)';
   for(let i=0;i<n*3;i++){ctx.fillRect(-hw*.75+((i*41)%70)/100*pw,ph*.28+((i*23)%20)/100*ph,3+(i%3)*2,5+(i%4)*3)}
 }
 // подпалина в углу к пятой смене
 if(n>=4){
   const bn=ctx.createRadialGradient(hw*.92,hh*.86,4,hw*.92,hh*.86,pw*.30);
   bn.addColorStop(0,'rgba(18,10,6,.85)');bn.addColorStop(.45,'rgba(70,38,16,.45)');bn.addColorStop(1,'rgba(70,38,16,0)');
   ctx.fillStyle=bn;ctx.fillRect(-hw,-hh,pw,ph);
 }
 // тень от загнутых краёв листка
 const em=ctx.createLinearGradient(0,hh-42,0,hh);
 em.addColorStop(0,'rgba(30,22,12,0)');em.addColorStop(1,'rgba(30,22,12,.34)');
 ctx.fillStyle=em;ctx.fillRect(-hw,hh-42,pw,42);
 ctx.restore();
 ctx.restore();
 // 6) текст: чернила с лёгким растеканием, тон зависит от ночи
 const inner=hw*.78;
 ctx.save();ctx.translate(cx,cy);ctx.textAlign='left';ctx.textBaseline='middle';
 const ink=(str,x,y,col)=>{ctx.fillStyle='rgba(60,50,40,.22)';ctx.fillText(str,x+.9,y+.9);ctx.fillStyle=col;ctx.fillText(str,x,y);};
 ctx.font='800 18px "Inter",Arial,sans-serif';
 ink('СЛУЖЕБНАЯ ЗАПИСКА  //  СМЕНА '+n,-inner,-ph*.31,'#20242a');
 ctx.strokeStyle='rgba(40,44,50,.35)';ctx.lineWidth=1;
 ctx.beginPath();ctx.moveTo(-inner,-ph*.31+15);ctx.lineTo(inner*.86,-ph*.31+15);ctx.stroke();
 ctx.font='500 14px "Inter",Arial,sans-serif';
 const base=-ph*.10;
 const noteLines={
  1:['Не оставляй пост без присмотра.','Проверяй камеры каждые несколько минут.','Если услышишь шаги — не спеши открывать дверь.'],
  2:['Смена проходит не так, как обещали.','Если кто-то зовёт из коридора — не отвечай.','На камерах иногда появляется лишний силуэт.','На стене висит МАСКА ЗАЙЦА. Надень её, если кто-то придёт.'],
  3:['Они уже знают, где находится охрана.','Не верь тому, что видишь на одном кадре.','Если свет мигает — сначала проверь дверь.'],
  4:['Запись повреждена. Не пытайся восстановить её.','Кто-то оставляет следы рядом с постом.','Не открывай дверь после третьего сигнала.'],
  5:['ЭТО НЕ ПОХОЖЕ НА ОБЫЧНУЮ СМЕНУ.','Не отвечай голосу за дверью.','Если записка исчезнет — не ищи её снова.']
 };
 (noteLines[n]||noteLines[1]).forEach((v,i)=>{const purpleLine=(n===2&&i===3);ink(v,-inner,base+i*28,purpleLine?'#7b3fd6':((i>=2&&n>=4)?'#5a1a22':'#2b3034'));});
 // приписка карандашом от руки, «дрожащая» линия
 ctx.save();ctx.strokeStyle='rgba(60,56,48,.45)';ctx.lineWidth=1.4;
 ctx.beginPath();ctx.moveTo(-inner,ph*.16);
 for(let i=0;i<9;i++)ctx.lineTo(-inner+i*22,ph*.16+Math.sin(i*1.7)*3);
 ctx.stroke();
 ctx.beginPath();ctx.moveTo(-inner+200,ph*.16+4);
 for(let i=0;i<5;i++)ctx.lineTo(-inner+200+i*18,ph*.16+4+Math.cos(i*2.1)*3);
 ctx.stroke();ctx.restore();
 ctx.font='700 10px "Inter",Arial,sans-serif';
 if(n>=3)ink(n===5?'ОТДЕЛ НАБЛЮДЕНИЯ // КАРТА ПАЦИЕНТА: NS-04':'ПРИМЕЧАНИЕ: НЕИЗВЕСТНЫЙ ИСТОЧНИК',-inner,ph*.28,'#6f2830');
 ctx.restore();
 // 7) пыль в луче лампы перед листком
 {
   ctx.save();
   for(let i=0;i<26;i++){
     const dx=cx+((i*151+t*11)%(pw*1.2))-pw*.6, dy=cy+((i*97+t*7)%(ph*1.1))-ph*.55;
     ctx.fillStyle=`rgba(238,226,198,${(.05+.09*Math.abs(Math.sin(t*1.2+i))).toFixed(3)})`;
     ctx.fillRect(dx,dy,1.6,1.6);
   }
   ctx.restore();
 }
}

// Общая пластика телефонного корпуса: тёмный бакелит, тёплый свет лампы, пыль.
function phoneBody(x,y,w,h,t){
 ctx.save();
 ctx.shadowColor='rgba(0,0,0,.85)';ctx.shadowBlur=40;ctx.shadowOffsetY=16;
 roundedRect(ctx,x,y,w,h,16,'#15100c','#3a2a1c',2);
 ctx.restore();
 ctx.save();
 roundedRect(ctx,x,y,w,h,16,'rgba(0,0,0,0)',null,0);
 ctx.beginPath();
 if(typeof ctx.roundRect==='function')ctx.roundRect(x,y,w,h,16);else ctx.rect(x,y,w,h);
 ctx.clip();
 const lg=ctx.createLinearGradient(x,y,x+w*.7,y+h);
 lg.addColorStop(0,'rgba(255,214,150,.13)');lg.addColorStop(.45,'rgba(90,60,30,.05)');lg.addColorStop(1,'rgba(0,0,0,.42)');
 ctx.fillStyle=lg;ctx.fillRect(x,y,w,h);
 // фактура бакелита
 for(let i=0;i<180;i++){const nx=x+((i*97)%Math.max(1,w|0)),ny=y+((i*61)%Math.max(1,h|0));
   ctx.fillStyle=(i%4)?'rgba(0,0,0,.16)':'rgba(255,220,170,.045)';ctx.fillRect(nx,ny,2,1);}
 // блик по верхней кромке и тень по нижней
 ctx.fillStyle='rgba(255,228,180,.10)';ctx.fillRect(x,y+2,w,2);
 ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(x,y+h-4,w,4);
 ctx.restore();
}
// Трубка на корпусе: слегка дрожит, когда телефон звонит.
function phoneHandset(x,y,w,shake){
 const h=22;
 ctx.save();ctx.translate(x+w/2,y);ctx.rotate(shake*0.02);ctx.translate(-(x+w/2),-y);
 ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(x+8,y+h-2,w-16,5);
 roundedRect(ctx,x,y,w,h,9,'#1b1410','#463322',2);
 roundedRect(ctx,x+2,y+2,w*.22,h-4,7,'#2a1f16',null,0);
 roundedRect(ctx,x+w-2-w*.22,y+2,w*.22,h-4,7,'#2a1f16',null,0);
 ctx.fillStyle='rgba(255,225,180,.10)';ctx.fillRect(x+6,y+3,w-12,2);
 // сеточка микрофона
 ctx.fillStyle='rgba(0,0,0,.55)';for(let i=0;i<5;i++)ctx.fillRect(x+w*.10+i*4,y+h*.45,2,2);
 ctx.restore();
}
// V86: геометрия телефонного набора. Было: клавиши и кнопки заданы в пикселях
// (54×40, шаг 66/54) при том, что строки расставлены в долях высоты (H*.28, H*.55,
// H*.62). На телефоне в ландшафте это давало кашу: ряд 7-8-9 перекрывался
// кнопками «ПОЗВОНИТЬ/ОЧИСТИТЬ», «ЗАКРЫТЬ» лежала поверх подписи, а ряд *0#
// вываливался из корпуса. Теперь вся раскладка считается одной функцией и масштабируется
// по высоте кадра, а на низком экране клавиатура становится 4×3 вместо 3×4.
function dialerGeom(){
 const low=menuLow();
 const cols=low?4:3,rows=Math.ceil(12/cols);
 const keysH=(rows-1)*54+40;
 const T=214+keysH;
 const s=Math.max(.5,Math.min(1,(H*(low?0.90:0.94))/T));
 const kw=54*s,kh=40*s,sx=66*s,sy=54*s;
 const keysW=(cols-1)*sx+kw;
 const bh2=T*s;
 const bw2=Math.max(keysW+30*s,Math.min(340,W*(low?0.33:0.24)));
 const bx=low?W*0.10:(W*.16+93-bw2/2);
 const by=low?(H-bh2)/2:H*.13;
 const kx0=bx+(bw2-keysW)/2;
 let y=by+10*s;
 const headY=y;y+=26*s+6*s;
 const dispY=y,dispH=44*s;y+=dispH+6*s;
 const ky0=y;y+=keysH*s+6*s;
 const actY=y,actH=42*s;y+=actH+6*s;
 const closeY=y,closeH=40*s;
 return {s,cols,rows,kw,kh,sx,sy,keysW,keysH:keysH*s,bx,by,bw2,bh2,kx0,ky0,headY,dispY,dispH,actY,actH,closeY,closeH,labelY:by+bh2-9*s};
}
function drawDialer(){
 const t=performance.now()/1000;
 const q=dialerGeom(),s=q.s;
 const bx=q.bx,by=q.by,bw2=q.bw2,bh2=q.bh2;
 // комната гаснет, свет собирается на телефоне
 ctx.fillStyle='rgba(2,3,6,.50)';ctx.fillRect(0,0,W,H);
 const pool=ctx.createRadialGradient(bx+bw2*.5,by+bh2*.42,16,bx+bw2*.5,by+bh2*.45,bw2*1.05);
 pool.addColorStop(0,'rgba(255,206,140,.11)');pool.addColorStop(.45,'rgba(186,128,58,.05)');pool.addColorStop(.78,'rgba(0,0,0,.36)');pool.addColorStop(1,'rgba(0,0,0,.62)');
 ctx.fillStyle=pool;ctx.fillRect(0,0,W,H);
 phoneBody(bx,by,bw2,bh2,t);
 phoneHandset(bx+bw2*.12,by-18*s,bw2*.76,Math.sin(t*1.1)*.15);
 // табличка с названием линии
 roundedRect(ctx,bx+bw2*.16,q.headY,bw2*.68,26*s,6,'#0d0b07','#3b2c18',1);
 ctx.font='700 '+Math.round(13*Math.max(.8,s))+'px "JetBrains Mono",monospace';ctx.fillStyle='#d8a94e';ctx.textAlign='center';
 ctx.fillText('ТЕЛЕФОН',bx+bw2*.5,q.headY+18*s);
 // окно набора: амбровый люминофор, строчная развёртка, дрожь сигнала
 const dx=bx+bw2*.10,dy=q.dispY,dw=bw2*.80,dh=q.dispH;
 roundedRect(ctx,dx,dy,dw,dh,7,'#0a0d09','#2c3a26',2);
 const gl=ctx.createLinearGradient(dx,dy,dx,dy+dh);
 gl.addColorStop(0,'rgba(255,180,40,.06)');gl.addColorStop(1,'rgba(120,60,10,.03)');
 ctx.fillStyle=gl;ctx.fillRect(dx+2,dy+2,dw-4,dh-4);
 ctx.fillStyle='rgba(0,0,0,.20)';for(let yy=dy+4;yy<dy+dh-4;yy+=3)ctx.fillRect(dx+4,yy,dw-8,1);
 ctx.save();ctx.shadowColor='rgba(255,150,60,.8)';ctx.shadowBlur=12;
 // V89: номер может быть длиной до 11 знаков — кегль подгоняется под окно,
 // иначе длинная строка вылезала за амбровое стекло.
 const dtxt=G.dialed||'— — — —';
 let dfs=Math.round(26*Math.max(.7,s));
 ctx.font='700 '+dfs+'px "JetBrains Mono",monospace';
 const dmax=dw-18;
 if(ctx.measureText(dtxt).width>dmax){
   dfs=Math.max(9,Math.floor(dfs*dmax/ctx.measureText(dtxt).width));
   ctx.font='700 '+dfs+'px "JetBrains Mono",monospace';
 }
 ctx.fillStyle='#ffb44a';ctx.textAlign='center';
 ctx.fillText(dtxt,dx+dw*.5,dy+dh*.70);
 ctx.restore();
 if(Math.floor(t*2)%2===0){ctx.fillStyle='rgba(255,180,74,.75)';ctx.fillRect(Math.min(dx+dw-12,dx+dw*.5+ctx.measureText(dtxt).width/2+6),dy+dh*.50,8,3);}
 // клавиши: физические кнопки с фаской
 const keys='123456789*0#'.split('');
 keys.forEach((k,i)=>{
   const kx=q.kx0+(i%q.cols)*q.sx,ky=q.ky0+Math.floor(i/q.cols)*q.sy;
   ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(kx+2,ky+3,q.kw,q.kh);
   roundedRect(ctx,kx,ky,q.kw,q.kh,5,'#c2b79c','#3a3128',1);
   const kg=ctx.createLinearGradient(kx,ky,kx,ky+q.kh);
   kg.addColorStop(0,'rgba(255,255,255,.30)');kg.addColorStop(.55,'rgba(255,255,255,0)');kg.addColorStop(1,'rgba(40,30,20,.28)');
   ctx.fillStyle=kg;ctx.fillRect(kx+1,ky+1,q.kw-2,q.kh-2);
   ctx.font='700 '+Math.round(17*Math.max(.8,s))+'px "Inter",Arial,sans-serif';ctx.fillStyle='#1a1712';ctx.textAlign='center';
   ctx.fillText(k,kx+q.kw/2,ky+q.kh*.68);
 });
 // действия
 const mk=(x,y,w,h,label,hot)=>{
   ctx.fillStyle='rgba(0,0,0,.5)';ctx.fillRect(x+2,y+3,w,h);
   roundedRect(ctx,x,y,w,h,6,hot?'#5c1a20':'#241c14',hot?'#b0424c':'#4a3a26',hot?2:1);
   if(hot){ctx.save();ctx.shadowColor='rgba(210,70,80,.75)';ctx.shadowBlur=14;roundedRect(ctx,x+1,y+1,w-2,h-2,5,'rgba(0,0,0,0)','rgba(210,70,80,.55)',1.5);ctx.restore();}
   ctx.font='700 '+Math.round(13*Math.max(.82,s))+'px "Inter",Arial,sans-serif';ctx.fillStyle=hot?'#ffd9dc':'#c9bda6';ctx.textAlign='center';
   ctx.fillText(label,x+w/2,y+h/2+5*Math.max(.8,s));
 };
 const aw=(q.keysW-8*s)/2;
 mk(q.kx0,q.actY,aw,q.actH,'ПОЗВОНИТЬ',!!G.dialed);
 mk(q.kx0+aw+8*s,q.actY,aw,q.actH,'ОЧИСТИТЬ',false);
 mk(q.kx0,q.closeY,q.keysW,q.closeH,'ЗАКРЫТЬ',false);
 // витой шнур, уходящий за корпус
 ctx.save();ctx.strokeStyle='rgba(20,16,12,.9)';ctx.lineWidth=4;ctx.beginPath();
 ctx.moveTo(bx+bw2,by+bh2*.62);
 for(let i=0;i<8;i++)ctx.quadraticCurveTo(bx+bw2+16+((i%2)?8:-8),by+bh2*.62+i*11+5,bx+bw2+14,by+bh2*.62+i*11+11);
 ctx.stroke();ctx.restore();
 ctx.font='700 10px "Inter",Arial,sans-serif';ctx.fillStyle='#7a6a52';ctx.textAlign='center';
 ctx.fillText('СЛУЖЕБНЫЕ ЛИНИИ',bx+bw2*.5,q.labelY);
 ctx.textAlign='left';
}

 function drawPhone(){
 const ringing=G.phone.state==='ringing';
 if(ringing){
   const t=performance.now()/1000;
   const low=document.body.classList.contains('low-end');
   const pw=Math.min(430,W*.54), ph=170, px=(W-pw)/2, py=H*.16;
   const rng=Math.abs(Math.sin(t*6.0));                 // такт звонка
   const trem=(Math.random()-.5)*rng*2.2;               // дрожь корпуса
   rect2(ctx,0,0,W,H,'rgba(1,2,5,.46)');
   // свет от лампы стекает на телефон, вокруг темнота
   const pool=ctx.createRadialGradient(px+pw*.5,py+ph*.5,16,px+pw*.5,py+ph*.5,pw*.82);
   pool.addColorStop(0,`rgba(255,196,110,${(.11+.05*rng).toFixed(3)})`);
   pool.addColorStop(.45,`rgba(190,132,64,${(.05+.03*rng).toFixed(3)})`);
   pool.addColorStop(.75,'rgba(0,0,0,.34)');pool.addColorStop(1,'rgba(0,0,0,.62)');
   ctx.fillStyle=pool;ctx.fillRect(0,0,W,H);
   // расходящиеся волны звука
   for(let i=0;i<3;i++){
     const k=((t*1.1+i/3)%1);
     ctx.strokeStyle=`rgba(228,201,91,${(.22*(1-k)*rng).toFixed(3)})`;ctx.lineWidth=2;
     ctx.beginPath();ctx.ellipse(px+pw*.5,py+ph*.5,pw*(.44+k*.34),ph*(.55+k*.5),0,0,Math.PI*2);ctx.stroke();
   }
   ctx.save();ctx.translate(trem,trem*.6);
   phoneBody(px,py,pw,ph,t);
   phoneHandset(px+pw*.13,py-20,pw*.74,rng*(Math.random()-.5)*3);
   // диск набора слева
   const dcx=px+56,dcy=py+ph*.52;
   ctx.fillStyle='rgba(0,0,0,.55)';ctx.beginPath();ctx.arc(dcx+2,dcy+3,42,0,Math.PI*2);ctx.fill();
   ctx.fillStyle='#241a12';ctx.beginPath();ctx.arc(dcx,dcy,42,0,Math.PI*2);ctx.fill();
   ctx.strokeStyle='rgba(255,220,170,.16)';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(dcx,dcy,42,0,Math.PI*2);ctx.stroke();
   for(let i=0;i<10;i++){const a=-Math.PI*.72+i*(Math.PI*1.44/9);
     const hx2=dcx+Math.cos(a)*29,hy2=dcy+Math.sin(a)*29;
     ctx.fillStyle='#0b0805';ctx.beginPath();ctx.arc(hx2,hy2,6,0,Math.PI*2);ctx.fill();
     ctx.fillStyle='rgba(255,222,170,.12)';ctx.beginPath();ctx.arc(hx2,hy2-1.5,5.4,Math.PI,Math.PI*2);ctx.fill();}
   ctx.fillStyle='#12100b';ctx.beginPath();ctx.arc(dcx,dcy,15,0,Math.PI*2);ctx.fill();
   // мигающая лампа вызова
   const lampOn=Math.floor(t*3)%2===0;
   const lx=px+pw-34,ly=py+22;
   if(lampOn){ctx.fillStyle='rgba(226,54,58,.28)';ctx.beginPath();ctx.arc(lx,ly,16,0,Math.PI*2);ctx.fill();}
   ctx.fillStyle=lampOn?'#ff5a5f':'#5a1a1c';ctx.beginPath();ctx.arc(lx,ly,6,0,Math.PI*2);ctx.fill();
   ctx.fillStyle=lampOn?'rgba(255,220,220,.9)':'rgba(120,60,60,.5)';ctx.beginPath();ctx.arc(lx-2,ly-2,2,0,Math.PI*2);ctx.fill();
   // табличка вызова
   const tx=px+112, tw=pw-150;
   roundedRect(ctx,tx,py+26,tw,54,6,'#0c0a06','#3b2c18',1);
   ctx.font='700 19px "JetBrains Mono",monospace';ctx.fillStyle='#e4c95b';ctx.textAlign='center';
   ctx.fillText('ВХОДЯЩИЙ ЗВОНОК',tx+tw/2,py+50);
   ctx.font='11px "JetBrains Mono",monospace';ctx.fillStyle='#96a0a8';
   ctx.fillText('БЫВШИЙ ОХРАННИК',tx+tw/2,py+70);
   ctx.textAlign='left';
   // кнопка приёма — координаты нажатия не изменились
   const bw=Math.min(190,pw*.58),bh=48,bx3=W*.5-bw/2-trem,by3=py+96-trem*.6;
   ctx.fillStyle='rgba(0,0,0,.55)';ctx.fillRect(bx3+2,by3+3,bw,bh);
   roundedRect(ctx,bx3,by3,bw,bh,7,'#5c1a20','#c04a54',2);
   ctx.save();ctx.shadowColor=`rgba(226,80,90,${(.35+.45*rng).toFixed(2)})`;ctx.shadowBlur=18;
   roundedRect(ctx,bx3+1,by3+1,bw-2,bh-2,6,'rgba(0,0,0,0)',`rgba(232,96,104,${(.45+.4*rng).toFixed(2)})`,1.6);ctx.restore();
   ctx.font='700 15px "Inter",Arial,sans-serif';ctx.fillStyle='#ffe2e4';ctx.textAlign='center';
   ctx.fillText('ПРИНЯТЬ',bx3+bw/2,by3+bh/2+5);ctx.textAlign='left';
   // витой шнур вниз за кадр
   ctx.save();ctx.strokeStyle='rgba(16,12,9,.9)';ctx.lineWidth=4;ctx.beginPath();
   ctx.moveTo(px+pw*.5,py+ph);
   for(let i=0;i<7;i++)ctx.quadraticCurveTo(px+pw*.5+((i%2)?12:-12),py+ph+i*13+7,px+pw*.5,py+ph+i*13+13);
   ctx.stroke();ctx.restore();
   ctx.restore();
   // пыль в тёплом свете
   if(!low){for(let i=0;i<18;i++){
     const ddx=px+((i*137+t*13)%pw), ddy=py-30+((i*73+t*9)%(ph+70));
     ctx.fillStyle=`rgba(240,214,170,${(.05+.08*Math.abs(Math.sin(t+i))).toFixed(3)})`;ctx.fillRect(ddx,ddy,1.5,1.5);}}
 }else if(G.phone.state==='connected'){
   // no button: click anywhere to dismiss the subtitle / end the call
 }
 if(G.phone.state==='connected'&&G.phone.subtitle){
   const sw=Math.min(760,W*.82),sh=70,sx=(W-sw)/2,sy=H*.86;
   const sub=G.phone.subtitle||'';
   // typewriter reveal: progress grows from 0..1 as the call elapses
   const max=G.phone.subtitleMax||12, el=Math.max(0,max-(G.phone.timer||0));
   const prog=Math.min(1,el/(max*0.55));
   const reveal=Math.max(0,Math.floor(sub.length*prog));
   const shown=sub.slice(0,reveal);
   // wrap to at most 2 lines
   const maxw=sw-26, fs=14, lineH=18;
   const words=shown.split(' ');let lines=[],cur='';
   ctx.font=fs+'px "JetBrains Mono",monospace';
   for(const wd of words){const test=cur?cur+' '+wd:wd;if(ctx.measureText(test).width>maxw){if(cur)lines.push(cur);cur=wd;if(lines.length===2){lines[1]=(lines[1]||'')+'…';break}}else cur=test;}
   if(cur&&lines.length<2)lines.push(cur);
   if(!lines.length)lines=[''];
   // old-phone terminal panel: dark body, amber phosphor, scanlines, signal bar
   ctx.save();
   ctx.shadowColor='rgba(0,0,0,.95)';ctx.shadowBlur=14;
   roundedRect(ctx,sx,sy,sw,sh,8,'#0c0a05','#3a2c10',2);
   ctx.restore();
   // faint inner CRT glow
   const gl=ctx.createLinearGradient(sx,sy,sx,sy+sh);gl.addColorStop(0,'rgba(255,180,40,.05)');gl.addColorStop(1,'rgba(120,60,10,.03)');ctx.fillStyle=gl;ctx.beginPath();if(typeof ctx.roundRect==='function'){ctx.roundRect(sx+2,sy+2,sw-4,sh-4,6);ctx.fill()}else{ctx.fillRect(sx+2,sy+2,sw-4,sh-4)}
   // scanlines
   ctx.fillStyle='rgba(0,0,0,.16)';for(let y=sy+4;y<sy+sh-4;y+=3)ctx.fillRect(sx+4,y,sw-8,1);
   // signal indicator + label
   const blink=Math.floor(performance.now()/420)%2===0;
   ctx.fillStyle=blink?'#e8a33a':'#7a5a22';ctx.beginPath();ctx.arc(sx+14,sy+14,4,0,Math.PI*2);ctx.fill();
   ctx.font='700 9px "JetBrains Mono",monospace';ctx.fillStyle='#8a6a2a';ctx.textAlign='left';ctx.fillText('ВХОДЯЩИЙ СИГНАЛ // СВЯЗЬ',sx+24,sy+17);ctx.textAlign='left';
   // phosphor text
   ctx.font=fs+'px "JetBrains Mono",monospace';ctx.fillStyle='#ffb44a';ctx.textAlign='left';ctx.textBaseline='middle';
   const baseY=sy+sh/2-lineH*(lines.length-1)/2+2;
   lines.forEach((ln,i)=>ctx.fillText(ln,sx+14,baseY+i*lineH));
   // caret blink while typing
   if(prog<1&&Math.floor(performance.now()/300)%2===0){const w=ctx.measureText(lines[lines.length-1]).width;ctx.fillRect(sx+14+w,baseY+(lines.length-1)*lineH-7,7,2)}
   ctx.textBaseline='alphabetic';
 }
}
// V86: геометрия паузы теперь одна на рисование и клики. Шаг между кнопками был
// задан в долях высоты (H*.08), а сама кнопка — в пикселях (48). На телефоне в
// ландшафте шаг становился 23 px при высоте кнопки 48 — кнопки наезжали друг на
// друга и на подсказку. При малой высоте меню паузы стало сеткой 2×2.
function pauseGeom(){
 // V114: в паузе снова есть «ВЫЙТИ» — четвёртым пунктом. Четыре кнопки как раз
 // заполняют сетку 2x2 на низком экране без пустой клетки.
 const L=['ВЕРНУТЬСЯ','НАСТРОЙКИ','ГЛАВНОЕ МЕНЮ','ВЫЙТИ'];
 if(menuLow()){
  const bw=Math.min(230,W*.30),bh=Math.max(32,Math.min(44,H*.13)),cg=Math.max(12,W*.02);
  const x0=(W-(bw*2+cg))*.5,y0=H*.38,rg=bh+Math.max(8,H*.03);
  return {low:true,px:W*.14,py:H*.10,pw:W*.72,ph:H*.80,ts:Math.max(19,Math.min(34,H*.11)),ty:H*.27,hy:H*.85,
   items:L.map((l,i)=>({l,x:x0+(i%2)*(bw+cg),y:y0+Math.floor(i/2)*rg,w:bw,h:bh}))};
 }
 return {low:false,px:W*.30,py:H*.16,pw:W*.40,ph:H*.62,ts:34,ty:H*.25,hy:H*.66,
  items:L.map((l,i)=>({l,x:W*.35,y:H*(.31+i*.08),w:W*.30,h:48}))};
}
function drawPause(){
 const g=pauseGeom();
 ctx.fillStyle='rgba(0,0,0,.78)';ctx.fillRect(0,0,W,H);panel(g.px,g.py,g.pw,g.ph);
 text2(ctx,'ПАУЗА',W*.5,g.ty,g.ts,'#e6ebee','center');
 g.items.forEach((b,i)=>button(b.x,b.y,b.w,b.h,b.l,i===0));
 text2(ctx,g.low?'Прогресс ночи сохранён.':'Игра остановлена. Прогресс текущей ночи сохранён.',W*.5,g.hy,11,'#7d8892','center');
}
function drawPhoneArchive(){
 rect2(ctx,0,0,W,H,'rgba(0,0,0,.72)');panel(W*.18,H*.10,W*.64,H*.76);
 text2(ctx,'АРХИВ ТЕЛЕФОНА',W*.5,H*.17,26,'#e6ebee','center');
 const calls=G.phone.archive||[];
 if(!calls.length)text2(ctx,'СОХРАНЁННЫХ СООБЩЕНИЙ НЕТ',W*.5,H*.35,14,'#7d8790','center');
 calls.forEach((n,i)=>{const y=H*(.22+i*.055);button(W*.26,y,W*.48,38,'НОМЕР '+n,false);});
 button(W*.38,H*.72,W*.24,42,'ЗАКРЫТЬ');
}
function drawEnd(){
 const t=performance.now()/1000;
 const low=document.body.classList.contains('low-end');
 const lose=G.state==='lose';
 const hh=(n)=>{const v=Math.sin(n*127.1+Math.floor(n)*0.7913)*43758.5453;return v-Math.floor(v);};
 ctx.save();
 if(lose){
  // ---- ПРОИГРЫШ: темнота, аварийный свет, сорванный сигнал ----
  const pulse=.5+.5*Math.sin(t*1.9);
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#0a0204');bg.addColorStop(.45,'#120306');bg.addColorStop(1,'#050102');
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  // аварийная лампа сверху
  const lamp=ctx.createRadialGradient(W*.5,-H*.06,10,W*.5,-H*.06,H*.95);
  lamp.addColorStop(0,`rgba(196,26,38,${(.22+.10*pulse).toFixed(3)})`);
  lamp.addColorStop(.45,`rgba(120,14,22,${(.10+.05*pulse).toFixed(3)})`);
  lamp.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=lamp;ctx.fillRect(0,0,W,H);
  // силуэт в глубине: голова и плечи, глаза тлеют
  const scx=W*.795, sy=H*.70, shw=W*.135;
  ctx.save();ctx.globalAlpha=.94;ctx.fillStyle='#020102';
  ctx.beginPath();ctx.moveTo(scx-shw,H);ctx.lineTo(scx-shw*.60,sy);ctx.lineTo(scx+shw*.60,sy);ctx.lineTo(scx+shw,H);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.ellipse(scx,sy-H*.085,shw*.42,H*.098,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(scx-shw*.34,sy-H*.175,shw*.11,H*.050,-.22,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(scx+shw*.34,sy-H*.175,shw*.11,H*.050,.22,0,Math.PI*2);ctx.fill();
  ctx.restore();
  {const ea=.35+.45*Math.abs(Math.sin(t*.9));
   ctx.save();ctx.globalCompositeOperation='lighter';
   [[-shw*.20,sy-H*.098],[shw*.20,sy-H*.098]].forEach(e=>{
    const eg=ctx.createRadialGradient(scx+e[0],e[1],0,scx+e[0],e[1],22);
    eg.addColorStop(0,`rgba(226,42,54,${(.50*ea).toFixed(3)})`);eg.addColorStop(1,'rgba(226,42,54,0)');
    ctx.fillStyle=eg;ctx.beginPath();ctx.arc(scx+e[0],e[1],24,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=`rgba(255,150,150,${(.50*ea).toFixed(3)})`;ctx.fillRect(scx+e[0]-4,e[1]-2,8,3.4);
   });ctx.restore();}
  // дым/пыль в аварийном свете
  if(!low){for(let i=0;i<26;i++){
    const dx=(i*137+t*9)%W, dy=H*((i*53%90)/100)+Math.sin(t*.7+i)*8;
    ctx.fillStyle=`rgba(220,180,180,${(.03+.05*Math.abs(Math.sin(t+i))).toFixed(3)})`;
    ctx.fillRect(dx,dy,1.6,1.6);}}
  // сорванная развёртка: полосы шума и смещённые срезы
  if(!low){for(let i=0;i<3;i++){
    const bandY=((t*70+i*260)%(H+120))-60, bh2=8+hh(i+Math.floor(t*2))*22;
    ctx.fillStyle=`rgba(255,255,255,${(.012+.02*hh(i*3+Math.floor(t*3))).toFixed(3)})`;
    ctx.fillRect(0,bandY,W,bh2);}}
  for(let y=0;y<H;y+=3){ctx.fillStyle=y%6?'rgba(0,0,0,.16)':'rgba(120,10,16,.05)';ctx.fillRect(0,y,W,1);}
  // заголовок с хроматическим расслоением и дрожью
  const jit=(hh(Math.floor(t*7))>.75)?(hh(Math.floor(t*7)+9)-.5)*10:0;
  const dim=(hh(Math.floor(t*11))>.93)?.35:1;
  ctx.save();ctx.globalAlpha=dim;ctx.textAlign='center';
  ctx.font='700 46px "Oswald",Impact,sans-serif';
  ctx.globalCompositeOperation='lighter';
  ctx.fillStyle='rgba(226,30,42,.85)';ctx.fillText('СИСТЕМА НАРУШЕНА',W*.5+jit-3,H*.30);
  ctx.fillStyle='rgba(40,190,220,.35)';ctx.fillText('СИСТЕМА НАРУШЕНА',W*.5+jit+3,H*.30+1);
  ctx.globalCompositeOperation='source-over';
  ctx.fillStyle='#f0c6c9';ctx.fillText('СИСТЕМА НАРУШЕНА',W*.5+jit,H*.30);
  ctx.restore();
  // тонкая линия под заголовком, местами оборванная
  for(let i=0;i<16;i++){if(hh(i+Math.floor(t*2))<.22)continue;
   ctx.fillStyle='rgba(196,40,50,.45)';ctx.fillRect(W*.28+i*(W*.44/16),H*.325,W*.44/16-4,1);}
  ctx.textAlign='center';
  ctx.font='20px "Inter",Arial,sans-serif';ctx.fillStyle='rgba(214,198,200,.92)';
  ctx.fillText('Он тебя нашёл.',W*.5+jit*.3,H*.42);
  ctx.font='11px "JetBrains Mono",monospace';ctx.fillStyle='rgba(150,96,100,.75)';
  ctx.fillText('NS-04 // ЗАПИСЬ СМЕНЫ ОБОРВАНА',W*.5,H*.465);
  ctx.textAlign='left';
  button(W*.5-130,H*.55,260,50,'В МЕНЮ',true);
  // V104: вторая попытка за просмотр ролика — по желанию игрока, не навязано.
  {const ar=adRetryRect();if(ar){button(ar.x,ar.y,ar.w,ar.h,'РЕКЛАМА: ВТОРАЯ ПОПЫТКА',false);
   ctx.textAlign='center';text2(ctx,'СМЕРТЬ НЕ ПОЙДЁТ В СЧЁТ',W*.5,ar.y+ar.h+16,11,'rgba(150,140,142,.8)','center');ctx.textAlign='left';}}
  // виньетка
  vigFill(.5,.5,.22,.86,[[0,'rgba(0,0,0,0)'],[1,'rgba(0,0,0,.86)']]);
 }else{
  // ---- СМЕНА ПРОЙДЕНА: рассвет за окном ----
  const bg=ctx.createLinearGradient(0,0,0,H);
  bg.addColorStop(0,'#050a12');bg.addColorStop(.52,'#0b131c');bg.addColorStop(.78,'#1d2028');bg.addColorStop(1,'#070a0e');
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  // тёплая заря у горизонта
  const dawn=ctx.createRadialGradient(W*.5,H*.86,10,W*.5,H*.86,H*.95);
  dawn.addColorStop(0,'rgba(255,186,96,.30)');dawn.addColorStop(.35,'rgba(226,132,64,.14)');dawn.addColorStop(1,'rgba(255,170,90,0)');
  ctx.fillStyle=dawn;ctx.fillRect(0,0,W,H);
  // жалюзи: свет пробивается полосами
  ctx.save();
  for(let i=0;i<22;i++){const yy=H*.10+i*H*.033;
   ctx.fillStyle=`rgba(255,206,140,${(.030+.020*Math.sin(i*.7+t*.5)).toFixed(3)})`;ctx.fillRect(W*.14,yy,W*.72,3);
   ctx.fillStyle='rgba(0,0,0,.16)';ctx.fillRect(W*.14,yy+3,W*.72,H*.033-3);}
  ctx.restore();
  // пыль в утреннем свете
  if(!low){for(let i=0;i<30;i++){
    const dx=(i*173+t*7)%W, dy=H*((i*37%92)/100)+Math.sin(t*.6+i)*10;
    ctx.fillStyle=`rgba(255,232,196,${(.05+.09*Math.abs(Math.sin(t*.9+i))).toFixed(3)})`;
    ctx.fillRect(dx,dy,1.6,1.6);}}
  ctx.textAlign='center';
  ctx.save();ctx.shadowColor='rgba(240,206,110,.75)';ctx.shadowBlur=26;
  ctx.font='700 64px "Oswald",Impact,sans-serif';ctx.fillStyle='#f4e08a';
  ctx.fillText('5:00',W*.5,H*.30);ctx.restore();
  ctx.font='20px "Inter",Arial,sans-serif';ctx.fillStyle='#d6dde2';
  ctx.fillText(G.night<5?'СМЕНА '+G.night+' ЗАВЕРШЕНА':'ПОСЛЕДНЯЯ СМЕНА ЗАВЕРШЕНА',W*.5,H*.42);
  ctx.fillStyle='rgba(240,206,110,.55)';ctx.fillRect(W*.5-90,H*.445,180,1);
  if(G.night<5){
   const dots='.'.repeat(1+Math.floor(t*2)%3);
   ctx.font='14px "Inter",Arial,sans-serif';ctx.fillStyle='#98a4ac';
   ctx.fillText('ПОДГОТОВКА К СМЕНЕ '+(G.night+1)+dots,W*.5,H*.52);
   ctx.textAlign='left';
  }else{ctx.textAlign='left';button(W*.5-130,H*.55,260,50,'В МЕНЮ',true);}
  vigFill(.5,.5,.26,.92,[[0,'rgba(0,0,0,0)'],[1,'rgba(0,0,0,.72)']]);
 }
 ctx.restore();
}

 function drawOverlay(){if(G.messageT>0){panel(W*.33,H*.02,W*.34,38);text2(ctx,G.message,W*.5,H*.045,13,'#e7edf0','center')}
  // V70: субтитр реплики аниматроника — внизу, красным, с дрожанием.
  if(G.state==='game'&&G.monLine&&G.monLine.timer>0){
   // V83: субтитр не вспыхивает, а проявляется и угасает; в момент появления
   // текст ещё и чуть поднимается из-под нижней кромки.
   const fin=G.monLine.fade===undefined?1:G.monLine.fade;
   const a=Math.min(1,G.monLine.timer/0.6)*(fin*fin*(3-2*fin));
   const pal=monPalette(G.monLine.kind);
   // V70: если снизу показывается панель телефонной связи, субтитр уезжает наверх, чтобы не перекрывать её.
   const phoneBusy=!!(G.phone&&G.phone.subtitle&&(G.phone.timer||0)>0);
   const y=(phoneBusy?H*.145:H*.885)+(1-fin)*H*.018, jt=performance.now()/1000;
   ctx.save();ctx.globalAlpha=a;
   ctx.textAlign='center';ctx.font='700 '+Math.round(H*.024)+'px "JetBrains Mono",monospace';
   ctx.fillStyle='rgba(0,0,0,.72)';
   const tw=ctx.measureText(G.monLine.text).width;
   ctx.fillRect(W*.5-tw/2-14,y-H*.028,tw+28,H*.040);
   ctx.fillStyle=`rgba(${pal.eye},${a.toFixed(2)})`;
   ctx.shadowColor=`rgba(${pal.glow},.8)`;ctx.shadowBlur=12;
   ctx.fillText(G.monLine.text,W*.5+Math.sin(jt*24)*1.4,y);
   ctx.shadowBlur=0;ctx.textAlign='left';ctx.restore();
  }
  scan();}
 // V111: ВСПЛЫВАЮЩЕЕ УВЕДОМЛЕНИЕ О ДОСТИЖЕНИИ. Выезжает снизу справа, держится
 // несколько секунд и уезжает обратно. Несколько подряд выстраиваются в очередь
 // и показываются по очереди — не накладываются друг на друга.
 function drawAchPopups(){
  if(!G.achPopups||!G.achPopups.length)return;
  const tt=performance.now()/1000;
  const cw=Math.min(360,W*.62),ch=Math.max(58,Math.min(74,H*.10));
  const gap=10;
  G.achPopups.forEach((p,i)=>{
   // анимация входа/выхода: первые 0.35с выезд, последние 0.45с затухание
   const t=p.t,life=p.life;
   let a=1;
   if(t<0.35)a=t/0.35;else if(t>life-0.45)a=Math.max(0,(life-t)/0.45);
   const slide=(1-a)*cw*0.5;
   const x=W-cw-14+slide, y=H-ch-14-(i)*(ch+gap);
   ctx.save();ctx.globalAlpha=a;
   // тень-подложка
   ctx.shadowColor='rgba(0,0,0,.6)';ctx.shadowBlur=14;ctx.shadowOffsetY=4;
   const rr=Math.min(12,ch*.18);
   ctx.beginPath();ctx.roundRect(x,y,cw,ch,rr);
   const g=ctx.createLinearGradient(x,y,x,y+ch);
   g.addColorStop(0,'#3a2f18');g.addColorStop(.5,'#241c0e');g.addColorStop(1,'#120d05');
   ctx.fillStyle=g;ctx.fill();
   ctx.shadowBlur=0;ctx.shadowOffsetY=0;
   // латунная рамка с пульсацией
   const pl=.5+.5*Math.sin(tt*2.4+i);
   ctx.strokeStyle=`rgba(220,180,86,${(.6+.3*pl).toFixed(2)})`;ctx.lineWidth=1.6;
   ctx.beginPath();ctx.roundRect(x+.5,y+.5,cw-1,ch-1,rr);ctx.stroke();
   // светящаяся полоска слева
   ctx.fillStyle=`rgba(232,196,96,${(.7+.3*pl).toFixed(2)})`;ctx.fillRect(x+5,y+ch*.2,2.4,ch*.6);
   ctx.clip();
   // иконка достижения
   const ix=x+26,iy=y+ch*.5;
   ctx.save();ctx.translate(ix,iy);ctx.strokeStyle='#e8c460';ctx.fillStyle='#e8c460';ctx.lineWidth=1.8;ctx.lineJoin='round';ctx.lineCap='round';
   drawAchievementIcon(ctx,p.id,0,0,true,pl);ctx.restore();
   // текст
   ctx.textAlign='left';
   ctx.fillStyle='#f0d98a';ctx.font='700 '+Math.round(ch*.20)+'px "Oswald",Arial,sans-serif';
   ctx.fillText(p.name,x+46,y+ch*.42);
   ctx.fillStyle='rgba(231,237,240,.72)';ctx.font='600 '+Math.round(ch*.13)+'px "Inter",Arial,sans-serif';
   // описание обрезается по ширине
   let desc=p.desc;const maxW=cw-58;while(ctx.measureText(desc).width>maxW&&desc.length>4)desc=desc.slice(0,-2);
   if(desc!==p.desc)desc=desc.slice(0,-1)+'…';
   ctx.fillText(desc,x+46,y+ch*.72);
   // метка «ДОСТИЖЕНИЕ»
   ctx.fillStyle='rgba(220,180,86,.55)';ctx.font='700 '+Math.round(ch*.10)+'px "JetBrains Mono",monospace';
   ctx.fillText('ДОСТИЖЕНИЕ',x+46,y+ch*.20);
   ctx.restore();
  });
 }
 function scan(){if(document.body.classList.contains('low-end'))return;if(window.SaveSystem.settings.effectsEnabled===false)return;if(window.SaveSystem.settings.effectScanlines===false&&window.SaveSystem.settings.crt<=0)return;if(window.SaveSystem.settings.crt>0&&window.SaveSystem.settings.effectScanlines!==false){ctx.fillStyle=`rgba(0,0,0,${.035*window.SaveSystem.settings.crt})`;for(let y=0;y<H;y+=5)ctx.fillRect(0,y,W,1)}if(window.SaveSystem.settings.crt>.2&&window.SaveSystem.settings.effectScanlines!==false){ctx.fillStyle='rgba(255,0,30,.012)';ctx.fillRect(1,0,W,H)} }
 function panel(x,y,w,h){const r=Math.min(10,h*.22,w*.08);roundedRect(ctx,x,y,w,h,r,'rgba(7,10,15,.94)','#303a44',2);}
 // ===== Общий атмосферный фон для экранов меню (настройки / достижения / топ) =====
 // accent: [r,g,b] цвет служебного света на этом экране.
 function screenBackdrop(accent,lampF){
  const t=performance.now()/1000;
  const low=document.body.classList.contains('low-end');
  const hh=(n)=>{const v=Math.sin(n*127.1+Math.floor(n)*0.7913)*43758.5453;return v-Math.floor(v);};
  const A=accent||[86,150,178];
  const ac=(a)=>`rgba(${A[0]},${A[1]},${A[2]},${a})`;
  ctx.save();
  // бетонная стена подсобки
  const bg=ctx.createLinearGradient(0,0,W*.35,H);
  bg.addColorStop(0,'#0b0f13');bg.addColorStop(.45,'#0a0d11');bg.addColorStop(1,'#040608');
  ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  // вертикальные потёки на штукатурке
  ctx.save();ctx.globalAlpha=.55;
  for(let i=0;i<11;i++){const wx=W*(.03+i*.092)+hh(i)*30;
   const wg=ctx.createLinearGradient(wx,0,wx,H);
   wg.addColorStop(0,'rgba(36,42,46,.55)');wg.addColorStop(.7,'rgba(28,32,36,.18)');wg.addColorStop(1,'rgba(28,32,36,0)');
   ctx.fillStyle=wg;ctx.fillRect(wx,0,14+hh(i*3)*40,H);}
  ctx.restore();
  // редкие пятна сырости
  if(!low){for(let i=0;i<7;i++){
   const sx=hh(i*5.5)*W, sy=hh(i*9.1)*H, sr=60+hh(i*13)*140;
   const sg=ctx.createRadialGradient(sx,sy,4,sx,sy,sr);
   sg.addColorStop(0,'rgba(24,30,28,.30)');sg.addColorStop(1,'rgba(24,30,28,0)');
   ctx.fillStyle=sg;ctx.beginPath();ctx.arc(sx,sy,sr,0,Math.PI*2);ctx.fill();}}
  // горизонтальный стык плит
  ctx.fillStyle='rgba(0,0,0,.35)';ctx.fillRect(0,H*.205,W,2);
  ctx.fillStyle='rgba(150,170,180,.05)';ctx.fillRect(0,H*.205+2,W,1);
  // висящая лампа сверху слева и её конус
  const lx=W*(lampF||0.40), ly=-H*.02, sway=Math.sin(t*.55)*6;
  ctx.strokeStyle='#0d1114';ctx.lineWidth=2.5;
  ctx.beginPath();ctx.moveTo(lx,0);ctx.quadraticCurveTo(lx+sway*.4,H*.035,lx+sway,H*.062);ctx.stroke();
  const flick=(hh(Math.floor(t*7))>.965)?.35:1;
  const cone=ctx.createRadialGradient(lx+sway,ly+H*.06,6,lx+sway,ly+H*.06,H*1.15);
  cone.addColorStop(0,ac((.20*flick).toFixed(3)));
  cone.addColorStop(.30,ac((.075*flick).toFixed(3)));
  cone.addColorStop(1,ac(0));
  ctx.fillStyle=cone;ctx.fillRect(0,0,W,H);
  // абажур и раскалённая нить
  ctx.fillStyle='#151a1e';ctx.beginPath();
  ctx.moveTo(lx+sway-20,H*.062);ctx.lineTo(lx+sway+20,H*.062);
  ctx.lineTo(lx+sway+13,H*.082);ctx.lineTo(lx+sway-13,H*.082);ctx.closePath();ctx.fill();
  ctx.save();ctx.globalCompositeOperation='lighter';
  const bulb=ctx.createRadialGradient(lx+sway,H*.086,0,lx+sway,H*.086,26);
  bulb.addColorStop(0,ac((.55*flick).toFixed(3)));bulb.addColorStop(1,ac(0));
  ctx.fillStyle=bulb;ctx.beginPath();ctx.arc(lx+sway,H*.086,26,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=`rgba(255,250,235,${(.72*flick).toFixed(2)})`;ctx.beginPath();ctx.arc(lx+sway,H*.086,3.4,0,Math.PI*2);ctx.fill();
  ctx.restore();
  // пыль, плавающая в свете лампы
  if(!low){for(let i=0;i<40;i++){
   const dx=(i*163+t*7)%W, dy=H*((i*37%96)/100)+Math.sin(t*.5+i)*10;
   const near=1-Math.min(1,Math.abs(dx-lx)/(W*.5));
   ctx.fillStyle=`rgba(${A[0]+120},${A[1]+90},${A[2]+70},${(.02+.10*near*Math.abs(Math.sin(t*.9+i))).toFixed(3)})`;
   ctx.fillRect(dx,dy,1.5,1.5);}}
  // служебная сетка-миллиметровка очень слабо
  ctx.save();ctx.globalAlpha=.35;ctx.strokeStyle=ac(.035);ctx.lineWidth=1;
  for(let x=0;x<W;x+=48){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=0;y<H;y+=48){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
  ctx.restore();
  // сканлайны и виньетка
  for(let y=0;y<H;y+=3){ctx.fillStyle=y%6?'rgba(0,0,0,.14)':ac(.018);ctx.fillRect(0,y,W,1);}
  const vg=ctx.createRadialGradient(W*.35,H*.42,H*.30,W*.35,H*.42,H*1.0);
  vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.80)');
  ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
  // зерно
  if(!low){const fr=Math.floor(t*24);
   for(let i=0;i<170;i++){const gx=hh(i*3.7+fr)*W, gy=hh(i*7.3+fr*1.7)*H, a3=hh(i*11.9+fr*2.3);
    ctx.fillStyle=a3>.5?`rgba(255,255,255,${(0.014+0.020*a3).toFixed(3)})`:`rgba(0,0,0,${(0.016+0.030*a3).toFixed(3)})`;
    ctx.fillRect(gx,gy,1.3,1.3);}}
  ctx.restore();
 }
 // Заголовок экрана: гравировка + акцентная черта + служебная строка.
 function screenTitle(title,sub,accent,x,y){
  const t=performance.now()/1000;
  const A=accent||[86,150,178];
  const ac=(a)=>`rgba(${A[0]},${A[1]},${A[2]},${a})`;
  const pulse=.5+.5*Math.sin(t*1.6);
  ctx.save();
  // V86: заголовок был жёстко 40 px при базовой линии H*.095 — на телефоне в
  // ландшафте буквы обрезало верхним краем кадра.
  const low=menuLow();
  const fs=low?Math.max(19,Math.min(30,H*.085)):40;
  // V87: базовая линия не может быть выше кегля — иначе верх букв срезала
  // кромка кадра (экраны «ПЛАН» и «ДОСТИЖЕНИЯ» на телефоне).
  y=Math.max(y,fs*1.06);
  ctx.font='700 '+Math.round(fs)+'px "Oswald",Impact,sans-serif';ctx.textAlign='left';
  ctx.fillStyle='rgba(0,0,0,.72)';ctx.fillText(title,x+2,y+2);
  ctx.shadowColor=ac((.30+.16*pulse).toFixed(2));ctx.shadowBlur=22;
  ctx.fillStyle='#e8eef2';ctx.fillText(title,x,y);
  ctx.restore();
  // акцентная черта с затуханием
  const lg=ctx.createLinearGradient(x,0,x+W*.30,0);
  lg.addColorStop(0,ac((.75+.20*pulse).toFixed(2)));lg.addColorStop(1,ac(0));
  ctx.fillStyle=lg;ctx.fillRect(x,y+(low?7:10),W*.30,2);
  if(sub){ctx.save();ctx.shadowColor='rgba(0,0,0,.8)';ctx.shadowBlur=6;
   text2(ctx,sub,x,y+(low?21:30),low?10:11,'#7c8a94');ctx.restore();}
 }
 // Панель-планшет: тёмный металл с фаской и заклёпками по углам.
 function panel2(x,y,w,h,accent,glow){
  const A=accent||[86,150,178];
  const r=Math.min(12,h*.22,w*.08);
  roundedRect(ctx,x+2,y+4,w,h,r,'rgba(0,0,0,.45)',null,0);
  const g=ctx.createLinearGradient(x,y,x,y+h);
  g.addColorStop(0,'rgba(24,30,36,.96)');g.addColorStop(.5,'rgba(14,19,24,.96)');g.addColorStop(1,'rgba(8,11,15,.97)');
  roundedRect(ctx,x,y,w,h,r,g,null,0);
  if(glow){const gg=ctx.createLinearGradient(x,y,x,y+h);
   gg.addColorStop(0,`rgba(${A[0]},${A[1]},${A[2]},.10)`);gg.addColorStop(1,`rgba(${A[0]},${A[1]},${A[2]},0)`);
   roundedRect(ctx,x,y,w,h,r,gg,null,0);}
  roundedRect(ctx,x,y,w,h,r,null,`rgba(${A[0]},${A[1]},${A[2]},.30)`,1.4);
  ctx.save();ctx.beginPath();
  if(typeof ctx.roundRect==='function')ctx.roundRect(x,y,w,h,r);else ctx.rect(x,y,w,h);
  ctx.clip();
  ctx.fillStyle='rgba(255,255,255,.07)';ctx.fillRect(x+1,y+1,w-2,1);
  ctx.fillStyle='rgba(0,0,0,.40)';ctx.fillRect(x+1,y+h-2,w-2,1);
  ctx.restore();
 }
 // Заклёпка.
 function rivet(x,y,r,col){
  ctx.fillStyle='rgba(0,0,0,.55)';ctx.beginPath();ctx.arc(x,y+.6,r,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=col||'#6f7a82';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='rgba(255,255,255,.24)';ctx.beginPath();ctx.arc(x-r*.34,y-r*.34,r*.34,0,Math.PI*2);ctx.fill();
 }
 // Детерминированный шум: одинаковый кадр за кадром, чтобы фактура не «кипела».
 function hash01(n){const v=Math.sin(n*127.1+Math.floor(n)*0.7913)*43758.5453;return v-Math.floor(v);}
 function bpath(c,x,y,w,h,r){r=Math.max(0,Math.min(r,Math.min(w,h)/2));if(typeof c.roundRect==='function'){c.beginPath();c.roundRect(x,y,w,h,r);}else{c.beginPath();c.rect(x,y,w,h);}}
 // Кнопка-панелька: тёмный металл с фаской, винтами, царапинами и подсветкой.
 // Геометрия (x,y,w,h) не меняется — попадания курсора остаются прежними.
 function button(x,y,w,h,label,active=false){
  const t=performance.now()/1000;
  const low=document.body.classList.contains('low-end');
  const r=Math.min(10,h*.28,w*.10);
  const seed=Math.round(x*3.7+y*11.3+w*0.7);
  const mx=(G.mouse?G.mouse.x:0)*W, my=(G.mouse?G.mouse.y:0)*H;
  const hov=hitRect(mx,my,x,y,w,h)?1:0;
  // подсветка активной кнопки живёт: дышит и иногда «дёргается»
  const glitch=(hash01(Math.floor(t*9)+seed)>0.94)?0.35:1;
  const fl=active?(0.80+0.20*Math.abs(Math.sin(t*2.3+seed)))*glitch:1;
  ctx.save();
  // тень под панелькой
  roundedRect(ctx,x+2,y+4,w,h,r,'rgba(0,0,0,.42)',null,0);
  // корпус
  const g=ctx.createLinearGradient(x,y,x,y+h);
  if(active){g.addColorStop(0,'#43141a');g.addColorStop(.44,'#2a0b10');g.addColorStop(1,'#150607');}
  else{g.addColorStop(0,'#222a31');g.addColorStop(.46,'#151c21');g.addColorStop(1,'#0a0f13');}
  roundedRect(ctx,x,y,w,h,r,g,null,0);
  ctx.save();bpath(ctx,x,y,w,h,r);ctx.clip();
  // шлифованный металл: горизонтальные штрихи
  if(!low){for(let i=0;i<Math.round(h*0.9);i++){
    const yy=y+1+i*(h-2)/Math.round(h*0.9), a=hash01(seed+i*3.11);
    ctx.fillStyle=a>0.62?`rgba(255,255,255,${(0.010+0.018*a).toFixed(3)})`:`rgba(0,0,0,${(0.03+0.05*a).toFixed(3)})`;
    ctx.fillRect(x+1,yy,w-2,1);
  }}
  // мягкий свет сверху и падение к низу
  const sh=ctx.createLinearGradient(x,y,x,y+h);
  sh.addColorStop(0,'rgba(255,255,255,.07)');sh.addColorStop(.30,'rgba(255,255,255,0)');
  sh.addColorStop(.72,'rgba(0,0,0,.16)');sh.addColorStop(1,'rgba(0,0,0,.34)');
  ctx.fillStyle=sh;ctx.fillRect(x,y,w,h);
  // тёплая полоса от наведения
  if(hov){
    const hg=ctx.createLinearGradient(x,y,x,y+h);
    hg.addColorStop(0,active?'rgba(255,150,150,.16)':'rgba(190,220,240,.13)');
    hg.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=hg;ctx.fillRect(x,y,w,h);
  }
  // внутренняя подсветка активной кнопки
  if(active){
    const ag=ctx.createRadialGradient(x+w*.5,y+h*.62,2,x+w*.5,y+h*.62,w*.62);
    ag.addColorStop(0,`rgba(226,72,84,${(.20*fl).toFixed(3)})`);ag.addColorStop(1,'rgba(226,72,84,0)');
    ctx.fillStyle=ag;ctx.fillRect(x,y,w,h);
    // светящаяся полоска-индикатор слева
    ctx.fillStyle=`rgba(255,110,120,${(.75*fl).toFixed(3)})`;ctx.fillRect(x+5,y+h*.28,2,h*.44);
  }
  // царапины и потёртости
  if(!low){for(let i=0;i<4;i++){
    const a=hash01(seed+i*17.7), b2=hash01(seed+i*31.3);
    ctx.strokeStyle=`rgba(210,225,235,${(0.03+0.04*a).toFixed(3)})`;ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(x+4+a*(w-10),y+3+b2*(h-8));
    ctx.lineTo(x+4+a*(w-10)+8+b2*14,y+3+b2*(h-8)-2+a*4);ctx.stroke();
  }}
  ctx.restore();
  // фаска: светлый верх, тёмный низ, тонкая рамка
  roundedRect(ctx,x,y,w,h,r,null,active?`rgba(214,74,86,${(.55+.35*fl).toFixed(2)})`:(hov?'rgba(150,175,190,.42)':'rgba(96,116,128,.30)'),1.6);
  ctx.save();bpath(ctx,x,y,w,h,r);ctx.clip();
  ctx.fillStyle='rgba(255,255,255,.10)';ctx.fillRect(x+1,y+1,w-2,1);
  ctx.fillStyle='rgba(0,0,0,.40)';ctx.fillRect(x+1,y+h-2,w-2,1);
  ctx.restore();
  // винты по углам
  const sr=Math.max(1.6,Math.min(2.6,h*.055));
  [[x+7,y+7],[x+w-7,y+7],[x+7,y+h-7],[x+w-7,y+h-7]].forEach((p,i)=>{
    ctx.fillStyle='rgba(0,0,0,.55)';ctx.beginPath();ctx.arc(p[0],p[1]+.6,sr,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=active?'#8b6a6c':'#7d8890';ctx.beginPath();ctx.arc(p[0],p[1],sr,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(10,14,18,.75)';ctx.lineWidth=1;ctx.beginPath();
    const an=(i%2)?0.7:-0.6;ctx.moveTo(p[0]-Math.cos(an)*sr,p[1]-Math.sin(an)*sr);ctx.lineTo(p[0]+Math.cos(an)*sr,p[1]+Math.sin(an)*sr);ctx.stroke();
    ctx.fillStyle='rgba(255,255,255,.22)';ctx.beginPath();ctx.arc(p[0]-sr*.35,p[1]-sr*.35,sr*.34,0,Math.PI*2);ctx.fill();
  });
  // подпись: гравировка (тёмный оттиск + светлый верх), у активной — тёплое свечение
  const fs=Math.max(12,Math.min(17,w/14));
  ctx.font=`700 ${fs}px "Inter",Arial,sans-serif`;ctx.textAlign='center';
  ctx.fillStyle='rgba(0,0,0,.62)';ctx.fillText(label,x+w/2,y+h/2+fs*.36+1);
  if(active){ctx.save();ctx.shadowColor=`rgba(232,96,104,${(.75*fl).toFixed(2)})`;ctx.shadowBlur=12;}
  ctx.fillStyle=active?`rgba(255,${Math.round(214*fl+30)},${Math.round(216*fl+30)},1)`:(hov?'#eef4f8':'#c7d2d9');
  ctx.fillText(label,x+w/2,y+h/2+fs*.36);
  if(active)ctx.restore();
  ctx.textAlign='left';
  ctx.restore();
 }
 // V84: ЛОГИКА ГЛАВНОГО МЕНЮ.
 // Было: «ПРОДОЛЖИТЬ» висела всегда, даже когда продолжать было нечего, а по
 // «НАЧАТЬ СМЕНУ» вызывались confirmNewGame() и doNewGame(), которых в коде вообще
 // не существовало — кнопка молча падала с ошибкой и ничего не делала.
 // Стало: «ПРОДОЛЖИТЬ» появляется только после первой пройденной смены и всегда
 // ведёт на самый свежий прогресс; «НАЧАТЬ СМЕНУ» честно обнуляет прохождение
 // (со спросом, если терять есть что) и сообщает «ПРОГРЕСС ОБНУЛЁН».
 function hasSavedProgress(){const d=window.SaveSystem.data;return (Number(d.highestNight)||1)>1||!!d.completed;}
 // ==== V85: подписи кнопок главного меню зависят от полученной концовки. ====
 // Клик разбирается по КОДУ действия (третий элемент), а не по тексту, иначе любое
 // переименование ломало бы кнопки.
 const MENU_LABELS={
  normal:{start:'НАЧАТЬ СМЕНУ',cont:'ПРОДОЛЖИТЬ',top:'ТОП ИГРОКОВ',ach:'ДОСТИЖЕНИЯ',plan:'ПЛАН',set:'НАСТРОЙКИ',exit:'ВЫХОД'},
  calm:{top:'ТОП ИГРОКОВ',start:'СНОВА В СМЕНУ',cont:'ВЕРНУТЬСЯ НА ПОСТ',ach:'ДОСТИЖЕНИЯ',plan:'СМЕННЫЙ ЖУРНАЛ',set:'НАСТРОЙКИ',exit:'СДАТЬ КЛЮЧИ'},
  burn:{top:'ТОП ИГРОКОВ',start:'ЗАЖЕЧЬ ЗАНОВО',cont:'ВЕРНУТЬСЯ НА ПЕПЕЛ',ach:'ЧТО УЦЕЛЕЛО',plan:'АКТ О ПОЖАРЕ',set:'НАСТРОЙКИ',exit:'УЙТИ ОТ ОГНЯ'},
  truth:{top:'ТОП ИГРОКОВ',start:'НОВАЯ ЗАПИСЬ',cont:'ВЕРНУТЬСЯ К ДЕЛУ',ach:'МАТЕРИАЛЫ ДЕЛА',plan:'ПРОТОКОЛ',set:'НАСТРОЙКИ',exit:'ЗАКРЫТЬ АРХИВ'},
  dark:{top:'ТОП ИГРОКОВ',start:'НАДЕТЬ СНОВА',cont:'ОСТАТЬСЯ В КОСТЮМЕ',ach:'СЛЕДЫ',plan:'ОПИСЬ КОСТЮМОВ',set:'НАСТРОЙКИ',exit:'ЗАМОЛЧАТЬ'},
  trap:{top:'ТОП ИГРОКОВ',start:'ЗАПЕРЕТЬСЯ СНОВА',cont:'ВЕРНУТЬСЯ В ЗАЛ',ach:'СЧЁТЧИК НОЧЕЙ',plan:'СХЕМА ЗАМКОВ',set:'НАСТРОЙКИ',exit:'ОСТАВИТЬ СВЕТ'}
 };
 function menuLabelSet(){
  const v=(G.menuVariant||window.SaveSystem.data.menuVariant||'normal');
  if(!window.SaveSystem.data.completed||v!=='epilogue')return MENU_LABELS.normal;
  return MENU_LABELS[window.SaveSystem.data.lastEnding||'calm']||MENU_LABELS.calm;
 }
 function menuItems(){
  const L=menuLabelSet();
  const items=[[L.start,true,'start']];
  if(hasSavedProgress())items.push([L.cont,false,'continue']);
  // V93: смены 6 и 7 открываются только после пройденной пятой.
  if(window.SaveSystem.data.completed)items.push(['СМЕНЫ 6 И 7',false,'custom']);
  // V114: КНОПКА «ВЫХОД» ВЕРНУЛАСЬ В ГЛАВНОЕ МЕНЮ (последним пунктом).
  // Подпись меняется вместе с вариантом меню (МЕНЮ_LABELS.exit): «СДАТЬ КЛЮЧИ»,
  // «ЗАКРЫТЬ АРХИВ» и т. д. — чтобы пункт не выбивался из тона концовки.
  // V116: «ТОП ИГРОКОВ» больше не пункт главного меню — он стал вкладкой
  // внутри «ДОСТИЖЕНИЙ» вместе с профилем игрока.
  items.push([L.ach,false,'ach'],[L.plan,false,'plan'],[L.set,false,'settings'],[L.exit,false,'exit']);
  return items;
 }
 function menuDo(act){
  if(act==='start'){if(hasSavedProgress()){confirmNewGame()}else{startNight(1)}return true}
  if(act==='continue'){startNight(window.SaveSystem.data.highestNight||1);return true}
  if(act==='leaders'){window.AudioFX.play('click');openLeaders();return true}
  if(act==='ach'){G.state='ach';window.AudioFX.play('click');return true}
  if(act==='plan'){G.state='plan';window.AudioFX.play('click');return true}
  if(act==='custom'){G.state='custom';customLv();window.AudioFX.play('click');return true}
  if(act==='settings'){G.pauseFrom='menu';G.state='settings';requestAnimationFrame(syncSettingsUI);return true}
  if(act==='exit'){exitGame();return true}
  return false;
 }
 function confirmNewGame(){G.state='confirm';G.confirmT=0;G.confirmHover=0;window.AudioFX.play('click',.35,{group:'ui'});}
 function doNewGame(){
  window.SaveSystem.startNewGame();
  G.menuVariant='normal';
  G.night=1;
  G.resetBanner=2.6;           // плашка «ПРОГРЕСС ОБНУЛЁН» в меню
  G.state='menu';G.confirmT=0;G.confirmHover=0;
  _menuAnimKey='';             // кнопки заезжают заново: список пунктов изменился
  try{window.AudioFX.play('lightClick',.4,{group:'ui'})}catch(e){}
 }
 // ===== Анимация меню: кнопки выезжают слева по очереди, реагируют на курсор =====
 let _menuAnimKey='', _menuAnimStart=0, _menuHover=-1;
 // Возвращает время в секундах с момента входа в это меню; при смене экрана анимация начинается заново.
 function menuAnimTime(key){
  if(_menuAnimKey!==key){_menuAnimKey=key;_menuAnimStart=performance.now();_menuHover=-1;}
  return (performance.now()-_menuAnimStart)/1000;
 }
 // Плавный выезд с лёгким перелётом (ease-out-back).
 function easeOutBack(p){const c=1.70158+1;return 1+ (c+1)*Math.pow(p-1,3)+c*Math.pow(p-1,2);}
 // Красивая кнопка меню: тёмное стекло, левая акцентная полоса со свечением, рамка. active=главная кнопка.
 function menuButton(x,y,w,h,label,active,accent,anim){
  const ax=accent||{m:'#c8323f',g:'rgba(200,50,63,.45)',t:'#cdd6dd'};const r=Math.min(8,h*.2,w*.05);const t=performance.now()/1000;const pulse=0.5+0.5*Math.sin(t*2.2+(active?0:1.3));
  const A=anim||{p:1,dx:0,alpha:1,hover:0,shine:1};
  if(A.alpha<=0.01)return;
  ctx.save();
  ctx.globalAlpha=A.alpha;
  // выезд слева + подача вправо под курсором
  x+=A.dx+A.hover*10;
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);
  const bg=ctx.createLinearGradient(0,y,0,y+h);if(active){bg.addColorStop(0,'#2c1519');bg.addColorStop(1,'#140a0c');}else{bg.addColorStop(0,'rgba(19,24,29,.90)');bg.addColorStop(1,'rgba(8,11,14,.90)');}ctx.fillStyle=bg;ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.05)';ctx.lineWidth=1;ctx.stroke();
  // подсветка под курсором: тёплый градиент внутри кнопки
  if(A.hover>0.01){
   ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.clip();
   const hg=ctx.createLinearGradient(x,y,x+w,y+h);
   hg.addColorStop(0,`rgba(${active?'210,60,72':'150,170,185'},${.22*A.hover})`);
   hg.addColorStop(1,'rgba(0,0,0,0)');
   ctx.fillStyle=hg;ctx.fillRect(x,y,w,h);
   ctx.restore();
  }
  // блик-пробежка по кнопке в момент появления
  if(A.shine<1){
   ctx.save();ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.clip();
   const sxp=x-w*.35+ (w*1.7)*A.shine, sg=ctx.createLinearGradient(sxp-w*.16,0,sxp+w*.16,0);
   sg.addColorStop(0,'rgba(255,255,255,0)');sg.addColorStop(.5,`rgba(255,255,255,${.13*(1-Math.abs(A.shine*2-1))})`);sg.addColorStop(1,'rgba(255,255,255,0)');
   ctx.fillStyle=sg;ctx.fillRect(x,y,w,h);
   ctx.restore();
  }
  // левая акцентная полоса
  const barW=4+3*A.hover;
  ctx.save();if(active||A.hover>0.01){ctx.shadowColor=ax.g;ctx.shadowBlur=(active?12+4*pulse:6)+10*A.hover;}ctx.fillStyle=ax.m;ctx.beginPath();ctx.roundRect(x,y,barW,h,[Math.min(r,4),0,0,Math.min(r,4)]);ctx.fill();ctx.restore();
  // рамка
  if(active||A.hover>0.01){ctx.shadowColor=ax.g;ctx.shadowBlur=10+8*A.hover;}
  ctx.strokeStyle=active?ax.m:`rgba(150,165,170,${.16+.44*A.hover})`;ctx.lineWidth=active?1.4:1+0.4*A.hover;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.stroke();ctx.shadowBlur=0;
  // V85: подпись автоматически сжимается, если не влезает в кнопку (подписи
  // меню меняются от концовки и бывают длинными).
  let fs=Math.max(12,Math.min(16,w/12));
  // V87: подпись центруется по свободному полю между акцентной полосой и
  // зоной стрелки. Раньше центр брался по всей кнопке со сдвигом вправо,
  // и длинная подпись касалась стрелки («СМЕННЫЙ ЖУРНАЛ▸»).
  const padL=16, padR=28;
  const maxW=Math.max(40,w-padL-padR);
  ctx.font=fs+'px "Inter",Arial,sans-serif';
  let tw=ctx.measureText(String(label)).width;
  if(tw>maxW){fs=Math.max(9,fs*maxW/tw);}
  text2(ctx,label,x+padL+maxW/2+A.hover*3,y+h/2+Math.round(fs*.36),fs,active?'#ffffff':(A.hover>.5?'#eef3f6':ax.t),'center');
  // стрелка-указатель справа под курсором
  if(A.hover>0.02){
   ctx.globalAlpha=A.alpha*A.hover;ctx.fillStyle=ax.m;
   const axx=x+w-14-3*(1-A.hover), ayy=y+h/2;
   ctx.beginPath();ctx.moveTo(axx,ayy-5);ctx.lineTo(axx+6,ayy);ctx.lineTo(axx,ayy+5);ctx.closePath();ctx.fill();
  }
  ctx.restore();
 }
 // Кнопки меню с поочерёдным выездом слева и реакцией на курсор.
// V84: плашка «ПРОГРЕСС ОБНУЛЁН». Раньше по сбросу не было никакого отклика —
// игрок не понимал, сработала кнопка или нет. Теперь в меню на пару секунд
// появляется короткое сообщение, потом само гаснет.
function drawResetBanner(){
 if(!G.resetBanner||G.resetBanner<=0)return;
 G.resetBanner=Math.max(0,G.resetBanner-0.016);
 const a=Math.min(1,G.resetBanner*1.6)*Math.min(1,(2.6-G.resetBanner)*4);
 const txt='ПРОГРЕСС ОБНУЛЁН';
 ctx.save();
 ctx.globalAlpha=Math.max(0,Math.min(1,a));
 ctx.font='bold 15px "JetBrains Mono",monospace';
 const w=ctx.measureText(txt).width+40,h=40;
 const x=W*.5-w/2,y=H*.115;
 ctx.fillStyle='rgba(9,13,17,.92)';ctx.fillRect(x,y,w,h);
 ctx.strokeStyle='rgba(196,166,54,.55)';ctx.lineWidth=1.5;ctx.strokeRect(x+.5,y+.5,w-1,h-1);
 ctx.fillStyle='#e8d79a';ctx.textAlign='center';ctx.textBaseline='middle';
 ctx.fillText(txt,W*.5,y+h/2+1);
 ctx.textAlign='left';ctx.textBaseline='alphabetic';
 ctx.restore();
 // V112: чёрный экран атмосферного выхода — поверх всего, даже когда бумага
 // уже погасла. В фазе 3 он плавно убывает, открывая офис.
 if(black>0){ctx.save();ctx.fillStyle='rgba(2,3,5,'+black+')';ctx.fillRect(0,0,W,H);ctx.restore();}
}
 // ==== V86: раскладка меню под низкие экраны (телефон в горизонтали) ====
 // Признак «низкого» кадра: высоты не хватает на шесть кнопок в один столбец.
 function menuLow(){return H<470;}
 // V87: радиус виньеток раньше считался только от высоты кадра (H*0.98).
 // На телефоне в ландшафте (915x340) это 333 px, а до угла кадра — 488 px,
 // поэтому левый край экрана вместе с левым столбцом кнопок затемнялся почти
 // до 80 процентов: подписи выглядели серыми и «погасшими».
 // На 720p геометрия виньетки остаётся той же (круг радиуса H*f).
 // На низком широком кадре виньетка становится эллиптической и повторяет
 // форму кадра: темнеют только края и углы, а не левая треть с кнопками.
 function vigFill(cxf,cyf,f0,f1,stops){
  const cx=W*cxf, cy=H*cyf;
  if(!menuLow()){
   const g=ctx.createRadialGradient(cx,cy,H*f0,cx,cy,H*f1);
   stops.forEach(s=>g.addColorStop(s[0],s[1]));
   ctx.fillStyle=g;ctx.fillRect(0,0,W,H);return;
  }
  const Ry=H*.60, Rx=W*.60, inner=Ry*.62;
  ctx.save();ctx.translate(cx,cy);ctx.scale(Rx/Ry,1);
  const g=ctx.createRadialGradient(0,0,inner,0,0,Ry);
  stops.forEach(s=>g.addColorStop(s[0],s[1]));
  ctx.fillStyle=g;ctx.fillRect(-4*W,-4*H,8*W,8*H);ctx.restore();
 }
 // Шапка финального меню считается от высоты кадра, а не от жёстких 42 пикселей.
 // Раньше заголовок был фиксированного кегля, а строки стояли на долях высоты:
 // на телефоне «НОЧНАЯ» и «СМЕНА» наезжали друг на друга, подписи ложились на
 // кнопки, а столбец кнопок уходил за нижнюю кромку.
 function endGeom(){
  const ts=Math.max(17,Math.min(42,H*.062,W*.050));
  const y1=Math.max(ts*1.10,H*.105);
  const y2=y1+ts*1.06;
  const fs1=Math.max(9,Math.min(13,H*.026));
  const s1=y2+Math.max(fs1*1.5,H*.048);
  const fs2=Math.max(9,Math.min(11,H*.023));
  const s2=s1+Math.max(fs2*1.5,H*.045);
  const fs3=Math.max(8,Math.min(10,H*.021));
  const s3=s2+Math.max(fs3*1.5,H*.042);
  return {ts:Math.round(ts),y1:Math.round(y1),y2:Math.round(y2),
          fs1:Math.round(fs1),s1:Math.round(s1),fs2:Math.round(fs2),s2:Math.round(s2),
          fs3:Math.round(fs3),s3:Math.round(s3),
          bx:W*.07,bw:Math.min(330,Math.max(148,W*.28)),bh:52,gap:64,
          by:Math.round(s3+Math.max(14,H*.048)),bottom:H*.93};
 }
 function menuButtons(bx,by,gap,bw,bh,accent,activeIdx=0,opts){
  const key='menu:'+G.state+':'+(G.menuVariant||window.SaveSystem.data.menuVariant||'normal');
  const el=menuAnimTime(key);
  const mx=(G.mouse?G.mouse.x:0)*W, my=(G.mouse?G.mouse.y:0)*H;
  const ITEMS=menuItems();
  if(!G._menuHoverT||G._menuHoverT.length!==ITEMS.length)G._menuHoverT=ITEMS.map(()=>0);
  // ---- V86: столбец сам вписывается в свободную высоту ----
  // На низком экране шесть пунктов раскладываются в два столбца: так кнопки
  // остаются пригодными для пальца, а не сжимаются в полоски по 22 пикселя.
  const o=opts||{};
  const n=Math.max(1,ITEMS.length);
  const bottom=(o.bottom!==undefined?o.bottom:H*.93);
  const cols=(o.cols===1||n<=4)?1:(menuLow()?2:1);
  const rows=Math.ceil(n/cols);
  // Правая граница двух столбцов по умолчанию — середина кадра: дальше стоит фигура
  // охранника, и кнопки ложились ему на лицо.
  // V87: зазор между столбцами считается от левого отступа, а не от ширины
  // кнопки: раньше он выходил около 12 px против 64 px поля слева,
  // и столбцы выглядели слипшимися.
  let colGap=0;
  if(cols>1){
   const room=(o.right!==undefined?o.right:W*.53)-bx;
   colGap=Math.min(30,Math.max(18,bx*.30));
   bw=Math.min(bw,Math.max(120,(room-colGap)/2));
  }
  const avail=Math.max(56,bottom-by);
  const need=bh+(rows-1)*gap;
  if(need>avail){const k=avail/need;gap*=k;bh=Math.max(22,bh*k);}
  const posX=i=>bx+Math.floor(i/rows)*(bw+colGap);
  const posY=i=>by+(i%rows)*gap;
  G._menuRects=[];G._menuLabels=ITEMS.map(it=>it[0]);G._menuActions=ITEMS.map(it=>it[2]);let hoverIdx=-1;
  ITEMS.forEach((it,i)=>{
   const bxi=posX(i), byi=posY(i);
   const p=Math.max(0,Math.min(1,(el-(0.08+i*0.10))/0.46));
   const e=p<=0?0:easeOutBack(p);
   const dx=-(1-e)*(bw*0.85+40);
   const alpha=Math.max(0,Math.min(1,p*1.6));
   // наведение — только когда кнопка почти доехала
   const over=p>0.75&&hitRect(mx,my,bxi+dx,byi,bw,bh)?1:0;
   if(over)hoverIdx=i;
   G._menuHoverT[i]+=(over-G._menuHoverT[i])*0.22;
   G._menuRects.push({x:bxi+dx+G._menuHoverT[i]*10,y:byi,w:bw,h:bh});
   const shine=Math.max(0,Math.min(1,(el-(0.10+i*0.10))/0.55));
   menuButton(bxi,byi,bw,bh,it[0],i===activeIdx,accent,{p,dx,alpha,hover:G._menuHoverT[i],shine});
  });
  // мягкий щёлчок при наведении на новую кнопку
  if(hoverIdx!==_menuHover){if(hoverIdx>=0)try{window.AudioFX.play('click',.14,{group:'ui'})}catch(e){}_menuHover=hoverIdx;}
 }
 // Rounded rectangle helper — feature-detects ctx.roundRect (modern browsers) and falls back to fillRect/strokeRect on older engines / node-canvas.
 function roundedRect(ctx,x,y,w,h,r,fillStyle,strokeStyle,lineWidth){r=Math.max(0,Math.min(r,Math.min(w,h)/2));if(typeof ctx.roundRect==='function'){ctx.beginPath();ctx.roundRect(x,y,w,h,r);if(fillStyle){ctx.fillStyle=fillStyle;ctx.fill();}if(strokeStyle){ctx.lineWidth=lineWidth||2;ctx.strokeStyle=strokeStyle;ctx.stroke();}}else{if(fillStyle){ctx.fillStyle=fillStyle;ctx.fillRect(x,y,w,h);}if(strokeStyle){ctx.lineWidth=lineWidth||2;ctx.strokeStyle=strokeStyle;ctx.strokeRect(x,y,w,h);}}}
 function text2(a,b,c,d,e,fill='#eee',align='left'){let tctx,s,x,y,size;if(a&&typeof a.fillText==='function'){tctx=a;s=b;x=c;y=d;size=e}else{tctx=ctx;s=a;x=b;y=c;size=d;fill=e;align=arguments[5]||'left'}tctx.font=`${size}px "Inter",Arial,sans-serif`;tctx.fillStyle=fill||'#eee';tctx.textAlign=align||'left';tctx.fillText(String(s),x,y)}
 function rect2(ctx,x,y,w,h,fill){ctx.fillStyle=fill;ctx.fillRect(x,y,w,h)}
 function hitRect(x,y,rx,ry,rw,rh){return x>=rx&&x<=rx+rw&&y>=ry&&y<=ry+rh;}
function interact(x,y){
 // V89: пока идёт скример, весь ввод уходит ему — иначе можно случайно
 // нажать кнопку меню под кадром.
 if(window.Screamer?.isActive?.()){window.Screamer.skip();return}
 // V114: пока идёт разговор с 911, весь ввод уходит сцене — клик её пропускает.
 if(window.Call911?.isActive?.()){window.Call911.skip();return}
 if(G.state==='death')return;
 // V82: диалог «Новая игра» перехватывает клики раньше меню.
 if(G.state==='confirm'){
  const dw=Math.min(460,W*.86),dh=210,dx=W/2-dw/2,dy=H/2-dh/2;
  const bw=150,bh=44,by=dy+dh-58;
  const bx1=dx+dw/2-bw-8,bx2=dx+dw/2+8;
  if(hitRect(x,y,bx1,by,bw,bh)){window.AudioFX.play('click',.35,{group:'ui'});doNewGame();return;}
  if(hitRect(x,y,bx2,by,bw,bh)){window.AudioFX.play('click',.35,{group:'ui'});G.state='menu';G.confirmT=0;return;}
  return;
 }
 // V73: финальную катсцену можно пропустить — щелчком или пробелом.
 if(G.state==='epilogue'){G.epilogueTimer=Math.max(G.epilogueTimer||0,(G.epiDur||16.5)-0.55);return;}
 if(G.state==='epichoice'){epiChoiceClick();return;}
 window.AudioFX.unlock();window.AudioFX.play('button',.25,{group:'ui'});
 if(G.state==='teaser'){if(G.teaser>TEASER_LOAD_DUR+2.0){beginPlay();}return;}
 if(G.state==='menu'){window.AudioFX.unlock();window.AudioFX.update();
  // V114: знак DEZ в правом нижнем углу — кнопка Telegram. Проверяется первым,
  // он лежит поверх меню и ни с какими пунктами не пересекается.
  {const dr=dezMarkRect(); if(dr&&hitRect(x,y,dr.x,dr.y,dr.w,dr.h)){openDez();return}}
  const variant=window.SaveSystem.data.completed?'epilogue':(G.menuVariant||window.SaveSystem.data.menuVariant||'normal');
  let bx,by,bw,bh,gap=58;
  if(variant==='normal'){const px=W*.055,pw=Math.min(380,W*.36);bx=px+22;by=H*.405;bw=pw-44;bh=48;gap=58;}
  else {bx=W*.07;by=variant==='broken'?H*.37:H*.38;bw=Math.min(320,W*.27);bh=52;gap=64;}
  // пока кнопки выезжают, клик сверяется с их фактическим положением на экране
  // V84: пунктов в меню может быть 5 или 6 (кнопка «ПРОДОЛЖИТЬ» появляется только
  // при наличии прогресса), поэтому клик разбирается по ПОДПИСИ кнопки, а не по её
  // номеру — раньше жёсткие индексы разъезжались, стоило списку измениться.
  const R=G._menuRects,ACT=G._menuActions||[];
  if(R&&R.length){
   const hit=R.findIndex(b=>hitRect(x,y,b.x,b.y,b.w,b.h));
   if(hit>=0){menuDo(ACT[hit]);return}
  }
  // V84: резервная сетка (если кнопки ещё не успели зарегистрироваться) тоже
  // считается по актуальному списку пунктов.
  const FB=menuItems();
  for(let i=0;i<FB.length;i++){
   if(!hitRect(x,y,bx,by+gap*i,bw,bh))continue;
   menuDo(FB[i][2]);
   return;
  }
 }
 else if(G.state==='teaser'){if(G.teaser>TEASER_TOTAL_DUR)beginPlay()}
 else if(G.state==='security_fail'){
   ctx.fillStyle='#050609';ctx.fillRect(0,0,W,H);
   const a=0.5+0.5*Math.sin(performance.now()/520); 
   ctx.fillStyle='rgba(170,35,35,'+(0.035+0.025*a)+')';ctx.fillRect(0,0,W,H);
   text2(ctx,'ИЗВИНИ, НО НЕТ',W/2,H*.40,Math.round(Math.min(W,H)*.075),'#d9cfa8','center');
   text2(ctx,'ПРОВЕРКА СМЕНЫ НЕ ПРОЙДЕНА.',W/2,H*.48,16,'#9b7474','center');
   text2(ctx,'РЕЗУЛЬТАТ НЕ БУДЕТ ЗАСЧИТАН.',W/2,H*.48+28,13,'#68747b','center');
   const r={x:W/2-130,y:H*.62,w:260,h:48};
   ctx.fillStyle='rgba(255,255,255,.045)';ctx.fillRect(r.x,r.y,r.w,r.h);ctx.strokeStyle='rgba(255,255,255,.2)';ctx.strokeRect(r.x+.5,r.y+.5,r.w-1,r.h-1);
   text2(ctx,'В МЕНЮ',W/2,r.y+29,14,'#b6c1c6','center');
 }
 else if(G.state==='security_fail'){if(hitRect(x,y,W/2-130,H*.62,260,48)){G.state='menu';G.night=window.SaveSystem.data.highestNight;G.menuVariant=window.SaveSystem.data.menuVariant||'normal';window.AudioFX.play('click');}return;}
 else if(G.state==='win'||G.state==='lose'){
  // V104: сначала «вторая попытка за рекламу» — она нарисована ниже кнопки меню.
  {const ar=adRetryRect();if(ar&&hitRect(x,y,ar.x,ar.y,ar.w,ar.h)){adRetryGo();return}}
  if(hitRect(x,y,W*.5-130,H*.55,260,50)){
  G.state='menu';G.night=window.SaveSystem.data.highestNight;G.menuVariant=window.SaveSystem.data.menuVariant||'normal';window.AudioFX.update();
  // V103: РЕКЛАМА ПО ПРАВИЛАМ ЯНДЕКС ИГР (п. 4.4.1).
  // ПОЧЕМУ ТАК БЫЛО: showAd() в мосте был написан, но не вызывался нигде —
  // монетизации в игре не было вообще.
  // СТАЛО: полноэкранный блок показывается ТОЛЬКО здесь: смена уже кончилась
  // (уровень завершён), игрок сам нажал кнопку возврата в меню — это неигровое
  // действие в логической паузе. Вызов идёт сразу, без задержки: правила дают
  // не больше 0,33 с между нажатием и началом рекламы. Разметку геймплея
  // останавливает endNight() ещё раньше, так что stop() уже отправлен.
  try{window.Platform.showAd?.()}catch(e){}
  return}}
 else if(G.state==='pause'){
  // V86: та же геометрия, что и в drawPause().
  const pg=pauseGeom().items;
  for(let i=0;i<pg.length;i++){
   const b=pg[i];if(!hitRect(x,y,b.x,b.y,b.w,b.h))continue;
   if(i===0){G.state='game';window.Platform.startGameplay();window.AudioFX.play('click');return}
   if(i===1){G.state='settings';G.pauseFrom='pause';requestAnimationFrame(syncSettingsUI);return}
   if(i===2){goMenu();return}
   if(i===3){window.AudioFX.play('click');exitGame();return}
   return;
  }
  return;
 }
 else if(G.state==='settings'){
  // All settings interaction is handled by the HTML overlay (#settings-ui) built in syncSettingsUI().
  // The legacy canvas grid below is intentionally a no-op: it conflicted with the overlay and could
  // silently reset/apply settings or exit when the user clicked canvas areas not covered by the panel.
  return;
 }
 else if(G.state==='leaders'){
   const lowL=menuLow();
   const left=W*.055, backY=lowL?H-34:Math.min(H-48,H*.91), bhL=lowL?28:38;
   // V116: открытая карточка игрока перехватывает все нажатия — иначе клик
   // «сквозь» неё переключал бы вкладки под затемнением.
   if(G.lbCard){
    const b=G.lbCardBtn;
    const cw=Math.min(W*.62,lowL?W*.86:520), ch=lowL?H*.66:Math.min(H*.44,270);
    const onBtn=b&&hitRect(x,y,b.x,b.y,b.w,b.h);
    const inCard=hitRect(x,y,(W-cw)/2,(H-ch)/2,cw,ch);
    // Закрываем и по кнопке, и по клику мимо карточки — так привычнее.
    if(onBtn||!inCard){G.lbCard=null;window.AudioFX.play('click',.35,{group:'ui'})}
    return;
   }
   // V116: вкладки журнала (достижения / топ / профиль) — выше подвкладок.
   if(scrTabsClick(x,y))return;
   // Вкладки проверяем ПЕРВЫМИ: они выше кнопки «НАЗАД» и не перекрываются.
   const tabs=lbTabRects();
   for(const r of tabs){
    if(hitRect(x,y,r.x,r.y,r.w,r.h)){
     if((G.leaders?.tab)!==r.key){window.AudioFX.play('click');loadLeaders(r.key);}
     return;
    }
   }
   // Клик по строке — карточка профиля игрока.
   for(const r of (G.lbRowRects||[])){
    if(hitRect(x,y,r.x,r.y,r.w,r.h)){G.lbCard=r.row;window.AudioFX.play('click',.4,{group:'ui'});return}
   }
   if(hitRect(x,y,left,backY,W*.22,bhL)){G.state='menu';window.AudioFX.play('click');return}
   return;
 }
 else if(G.state==='profile'){profileClick(x,y);return}
 else if(G.state==='ach'){
   // V86: на низком экране кнопки ниже и площе — области нажатия такие же.
   const lowA=menuLow();
   if(scrTabsClick(x,y))return;   // V116: вкладки журнала
   const backX=W*.055, backY=lowA?H-34:Math.min(H-48,H*.91), bhA=lowA?28:38;
   if(hitRect(x,y,backX,backY,lowA?W*.20:W*.22,bhA)){G.state='menu';window.AudioFX.play('click');return}
   return;
 }
 else if(G.state==='exited'){
   // V114: финальный экран выхода — одна кнопка возврата в меню.
   const r=exitBackRect();
   if(hitRect(x,y,r.x,r.y,r.w,r.h)){G.state='menu';G.pauseFrom='menu';window.AudioFX.play('click',.35,{group:'ui'});}
   return;
 }
 else if(G.state==='custom'){customClick(x,y);return}
 else if(G.state==='minigame'){try{window.MiniGame.pointer(x,y,W,H,true)}catch(e){}return}
 else if(G.state==='plan'){
   const lowP=menuLow();
   const backY=lowP?H-34:Math.min(H-48,H*.91);
   if(hitRect(x,y,W*.055,backY,W*.22,lowP?28:38)){G.state='menu';window.AudioFX.play('click');return}
   return;
 }
 else if(G.state==='game'){
  // V105: во время предупреждения о рекламе игровые действия приостановлены —
  // требование 4.4.1 («взаимодействие с игрой приостановлено»). Нажатия по
  // дверям, лампам, камерам и предметам в эти две секунды не проходят.
  if(G.adWarn>0)return;
  // V112: ЗАПИСНАЯ ДОСКА — пока открыто рисование, перехватываем все нажатия
  // тут: инструмент / цвет / очистка / выход. Игра в это время стоит на паузе.
  if(G.sketch&&G.sketch.open){handleSketchClick(x,y);return;}
  if(G.phone.state==='ringing'){
   const bw=Math.min(190,W*.54*.58),bh=48,py=H*.16+96,px=W*.5-bw/2;
   if(hitRect(x,y,px,py,bw,bh)){window.PhoneSystem.answer(G);return;}
   // Non-answer clicks fall through so the player can still use cameras/doors/buttons
   // while the phone rings.
  }
  // Connected calls: the subtitle is non-dismissable and non-blocking — it sits at the
  // bottom of the screen (below the HUD buttons) and never intercepts clicks. The call
  // ends on its own timer (see PhoneSystem.update), so the player can keep playing.
  if(G.note.open){ G.note.open=false;G.note.state='gone';G.note.timer=0;window.AudioFX.noteSound?.(false);window.AudioFX.play('click',.25,{group:'ui'});return; }
  if(G.dialer){handleDialer(x,y);return}
  // V84: экранные кнопки двери/света перехватывают клик раньше всего остального.
  if(hitSideButtons(x,y))return;
  // V111: если боковые кнопки выключены — игрок нажимает прямо на дверь/лампу
  // в офисе. Проверяем до предметов стола, чтобы дверь не «съедала» нажатия по лампе.
  if(hitOfficeControls(x,y))return;
  // V110: СТРЕЛКИ ПОВОРОТА ПЕРЕСТАЛИ ТЕРЯТЬ НАЖАТИЯ.
  // ПОЧЕМУ ТАК БЫЛО: проверка стрелок шла ПОСЛЕ предметов офиса
  // (лампа, вентилятор, кружка, мониторы), а их зоны считаются в координатах
  // панорамы и ездят вместе с поворотом. При взгляде влево под правой
  // стрелкой оказывался вентилятор, и нажатие уходило ему — камера не
  // поворачивалась вовсе. СТАЛО: стрелки разбираются сразу после боковых
  // кнопок — ровно в том порядке, в каком они нарисованы поверх сцены.
  if(!G.monitor&&window.SaveSystem.settings.camMode==='стрелки'&&!(G.mask&&G.mask.worn)){
   const z=turnArrowZones();
   if(hitRect(x,y,z.left.x,z.left.y,z.left.w,z.left.h)){stepYaw(-1);return}
   if(hitRect(x,y,z.right.x,z.right.y,z.right.w,z.right.h)){stepYaw(1);return}
  }
  // V104: кнопка рекламы за заряд — проверяем до всех кликов по панораме офиса.
  {const ar=adChargeRect();if(ar&&hitRect(x,y,ar.x,ar.y,ar.w,ar.h)){adChargeGo();return}}
  // Office-panorama space coords (used by office monitors, vent, mask, radio interactions).
  const PW=window.OfficePano.panW(),op=window.OfficePano.screenToOffice(x,y);
  // Physical office monitors: click a screen to power it on/off. Only meaningful while
  // viewing the office — when the camera tablet is open this is skipped so the map-panel
  // node clicks (esp. Коридор А / Б, which sit in the same screen band as the monitor row)
  // are not intercepted by stale office-space hitboxes.
  if(!G.monitor&&!G.dialer&&!G.note.open){
   // V70: настольная лампа — тёплый свет на столе, мягкий щелчок. (panorama-space)
   if(!(G.mask&&G.mask.worn)){
    const dlx=PW*0.325, dly=H*0.578;
    if(op.x>dlx-PW*0.020&&op.x<dlx+PW*0.026&&op.y>dly-H*0.010&&op.y<dly+H*0.048){
      G.deskLamp=!G.deskLamp;window.AudioFX.synth?.('switch',.8);window.AudioFX.play('lightClick',.35,{group:'ui'});return;
    }
    // V70: вентилятор — можно выключить, лопасти дожужжат и встанут.
    const ffx=PW*0.688, ffy=H*0.500;
    if(op.x>ffx-PW*0.026&&op.x<ffx+PW*0.026&&op.y>ffy-H*0.040&&op.y<ffy+H*0.062){
      G.fan=!G.fan;if(G.fan){G.fanCoast=0;window.AudioFX.synth?.('fan',.7);}else{G.fanCoast=performance.now()/1000*7.5;window.AudioFX.synth?.('switch',.7);}
      return;
    }
    // V70: кружка — три глотка, каждый немного снижает страх.
    const mgx=PW*0.596, mgy=H*0.612;
    if(op.x>mgx-PW*0.016&&op.x<mgx+PW*0.022&&op.y>mgy-H*0.024&&op.y<mgy+H*0.024){
      if((G.mug||0)>0){G.mug--;G.fear=Math.max(0,G.fear-7);window.AudioFX.synth?.('sip',.9);}
      else window.AudioFX.synth?.('paper',.5);
      return;
    }
   }
  }
  if(!G.monitor){
   const monitorRects=[
    // V98: геометрия экранов изменена в world.js (пропорции ближе к 4:3) —
    // зоны нажатия повторяют новые числа.
    [PW*.3255,H*.455,PW*.044,H*.105],[PW*.4205,H*.455,PW*.044,H*.105],[PW*.5155,H*.455,PW*.044,H*.105],[PW*.6105,H*.455,PW*.044,H*.105]
   ];
   for(let mi=0;mi<monitorRects.length;mi++){const r=monitorRects[mi];if(op.x>r[0]&&op.x<r[0]+r[2]&&op.y>r[1]&&op.y<r[1]+r[3]){G.officeMonitors[mi]=!G.officeMonitors[mi];window.AudioFX.play(G.officeMonitors[mi]?'camera_click':'tabletClose',.45,{group:'ui'});return;}}
  }
  if(G.phoneArchiveOpen){
   if(y>H*.72){G.phoneArchiveOpen=false;return}
   if(x>W*.70&&y>H*.20&&y<H*.78){const i=Math.floor((y-H*.20)/(H*.055));window.PhoneSystem.playArchive(G,i);return}
   return;
  }
  if(G.monitor){
   // Exit-cameras button (mirrors drawControls camera-mode button).
   const cb=closeBarGeo();
   if(hitRect(x,y,cb.x,cb.y,cb.w,cb.h)){closeCameras();return}
   const g=mapGeo(),b=mapBox();
   for(const r of MAP_ROOMS){
    const bx=g.px+r.x*g.pw-b.bw*.5, by=g.py+r.y*g.ph-b.bh*.5;
    if(hitRect(x,y,bx-4,by-4,b.bw+8,b.bh+8)){switchCam(r.cam,.32);return;}}
   return}
  // Worn mask: a click anywhere first removes it (returns it to the wall).
  if(G.mask&&G.mask.worn&&G.mask.t>0.5){G.mask.worn=false;window.AudioFX.play('click',.3,{group:'ui'});window.AudioFX.synth?.('paper',.5);return;}
  // Clickable ventilation tunnel on the upper wall — emits a creak and puffs dust. (panorama-space)
  if(!G.dialer&&!G.note.open){
   const vx=PW*0.345, vy=H*0.082, vw=PW*0.31, vh=H*0.072;
   if(op.x>vx&&op.x<vx+vw&&op.y>vy-vh*0.6&&op.y<vy+vh*1.2){
    G.ventCreakCd=(G.ventCreakCd||0);if(G.ventCreakCd<=0){window.AudioFX.playVentCreak?.(0.9);G.ventDust=0.7;setMessage('ВЕНТИЛЯЦИЯ СКРИПИТ',1.2);G.ventCreakCd=0.8;}return;
   }
   // Hanging rabbit mask (night 2): click to wear it (FNAF-style). (panorama-space)
   if(G.mask&&G.mask.available&&!G.mask.worn&&G.mask.t<0.01){const mx=PW*0.78,my=H*0.12+8;if(op.x>mx-26&&op.x<mx+26&&op.y>my-30&&op.y<my+18){G.mask.worn=true;window.AudioFX.play('click',.35,{group:'ui'});return;}}
   // V114: РИСОВАНИЕ ОТКРЫВАЕТСЯ ТОЛЬКО С ПРОБКОВОЙ ДОСКИ — ТОЙ, ГДЕ ВИСИТ КАРАНДАШ.
   // ПОЧЕМУ ТАК БЫЛО: вторая точка входа была на планшете справа (sbx/sby), где
   // никакого карандаша нет. Игрок тыкал в планшет и внезапно проваливался в
   // рисование, а на доску с карандашом это никак не намекало.
   // СТАЛО: работает только доска с карандашом на верёвочке. Область захвата
   // растянута вниз, чтобы попадал и сам карандаш.
   if(!(G.mask&&G.mask.worn)){
    const kbx=PW*0.315,kby=H*0.250,kbw=PW*0.036,kbh=H*0.092;
    const hitCork=op.x>kbx-kbw*0.30&&op.x<kbx+kbw*1.30&&op.y>kby-kbh*0.15&&op.y<kby+kbh*1.55;
    if(hitCork){openSketch();return;}
   }
   // Desk radio model: click to toggle the channel (red LED when on). (panorama-space)
   if(!(G.mask&&G.mask.worn)){const rx=PW*0.50,ry=H*0.55;if(op.x>rx-54&&op.x<rx+54&&op.y>ry-30&&op.y<ry+30){window.RadioSystem.toggle(G);return;}}
  }
  // Speed control: starts at X1 and cycles X1 -> X2 -> ... -> X20 -> X1.
  const spY=menuLow()?H*.07:H*.12,spW=menuLow()?78:92,spH=menuLow()?34:40;
  if(x>W*.04&&x<W*.04+spW&&y>spY&&y<spY+spH){G.speedMult=(G.speedMult||1)+1;if(G.speedMult>20)G.speedMult=1;window.AudioFX.play('click');setMessage('СКОРОСТЬ ИГРЫ: X'+G.speedMult,1.0);return}
  // Bottom HUD buttons (screen-space, normal mode only — we are past the monitor early-return).
  // V86: нажатия сверяются с hudRow() — той же геометрией, по которой кнопки рисуются.
  const hb=hudRow().find(b=>x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h);
  if(hb){
   if(hb.k==='cam'){if(!G.monitorTarget){openCameras()}else{closeCameras()}return}
   if(hb.k==='phone'){G.dialer=true;return}
   if(hb.k==='pause'){G.state='pause';G.pauseFrom='game';window.AudioFX.synth?.('switch',.7);window.Platform.stopGameplay();return}
   if(hb.k==='note'){G.note.open=true;G.note.timer=30;window.AudioFX.noteSound?.(true);setMessage('ЗАПИСКА: СМЕНА '+G.night,1.2);return}
   if(hb.k==='mask'){G.mask.worn=true;window.AudioFX.play('click',.35,{group:'ui'});return}
  }
  // Door hitboxes: click directly on the visible door. (panorama-space)
  const doorY=H*.20,doorH=H*.38;
  if(op.x<PW*.26&&op.y>doorY&&op.y<doorY+doorH){toggleGuardDoor('left');return}
  if(op.x>PW*.74&&op.y>doorY&&op.y<doorY+doorH){toggleGuardDoor('right');return}
  // Yellow physical light switches are placed beside each door. (panorama-space)
  if(op.y>H*.56&&op.y<H*.76){
   if(op.x>PW*.16&&op.x<PW*.34){window.LightingSystem.toggle(G,'left');return}
   if(op.x>PW*.66&&op.x<PW*.84){window.LightingSystem.toggle(G,'right');return}
  }
  // Note (служебная записка): reachable via N key or by clicking the bottom-center hint strip.
  if(G.note.state!=='gone'&&x>=W*.5-90&&x<=W*.5+90&&y>=H*.93){G.note.open=true;G.note.timer=30;window.AudioFX.noteSound?.(true);setMessage('ЗАПИСКА: СМЕНА '+G.night,1.2);return}
 }
}
function handleDialer(x,y){
 const keys='123456789*0#'.split('');
 const q=dialerGeom();
 // V71: номер ограничен 4 знаками — раньше набор рос бесконечно и вылезал за рамки окна.
 // V86: клики считаются по dialerGeom() — той же сетке, что и рисуется.
 for(let i=0;i<12;i++){
  const bx=q.kx0+(i%q.cols)*q.sx,by=q.ky0+Math.floor(i/q.cols)*q.sy;
  if(x>bx&&x<bx+q.kw&&y>by&&y<by+q.kh){
   // V89: было 4 знака. Скрытая линия «СТЁПА» — одиннадцатизначная, поэтому
  // предел поднят до 11; служебные линии по-прежнему набираются в 3-4 знака.
  if(G.dialed.length<11){G.dialed+=keys[i];window.AudioFX.play('button');}else{window.AudioFX.play('button',.3);}
   return;
  }
 }
 const aw=(q.keysW-8*q.s)/2;
 if(y>q.actY&&y<q.actY+q.actH){
  if(x>=q.kx0&&x<=q.kx0+aw){if(G.dialed){window.PhoneSystem.dial(G,G.dialed);G.dialed=''}return}
  if(x>=q.kx0+aw+8*q.s&&x<=q.kx0+q.keysW){G.dialed='';return}
  return;
 }
 if(y>q.closeY&&y<q.closeY+q.closeH&&x>=q.kx0&&x<=q.kx0+q.keysW){G.dialer=false}
}

 function tick(now){
  requestAnimationFrame(tick);
  // V71: ограничение частоты кадров из настроек теперь действительно работает
  // (раньше значение сохранялось, но ни на что не влияло).
  const lim=Number(window.SaveSystem.settings.fpsLimit)||0;
  if(lim>=24&&lim<=240&&tick.last!==undefined&&(now-tick.last)<(1000/lim-1.4))return;
  try{const dt=Math.min(.05,(now-(tick.last||now))/1000);tick.last=now;perfSample(dt);window.Screamer?.update?.(dt);const _c911=!!window.Call911?.isActive?.();if(_c911)window.Call911.update(dt);if(G.state==='teaser'){G.teaser+=dt;if(G.teaser>TEASER_TOTAL_DUR)beginPlay();}if(!_c911)gameUpdate(dt);if(G.mask){G.mask.t+=((G.mask.worn?1:0)-G.mask.t)*Math.min(1,dt*14);if(G.mask.t<0.001)G.mask.t=0;if(G.mask.t>0.999)G.mask.t=1;}draw();}catch(e){console.error('tick error:',e)}}
 canvas.addEventListener('pointermove',e=>{const r=canvas.getBoundingClientRect();G.mouse.x=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width));G.mouse.y=Math.max(0,Math.min(1,(e.clientY-r.top)/r.height));if(G.state==='game'&&!G.monitor&&window.SaveSystem.settings.camMode==='мышь'){G.viewYawTarget=Math.max(-0.95,Math.min(0.95,(G.mouse.x-0.5)*2.2));}if(G.state==='confirm'){const dw=Math.min(460,W*.86),dh=210,dx=W/2-dw/2,dy=H/2-dh/2,bw=150,bh=44,by=dy+dh-58;const bx1=dx+dw/2-bw-8,bx2=dx+dw/2+8,xx=G.mouse.x*W,yy=G.mouse.y*H;G.confirmHover=hitRect(xx,yy,bx1,by,bw,bh)?1:(hitRect(xx,yy,bx2,by,bw,bh)?2:0);}
  // V114: подсветка единственной кнопки на финальном экране выхода.
  if(G.state==='exited'){const r=exitBackRect(),xx=G.mouse.x*W,yy=G.mouse.y*H;G.exitHover=hitRect(xx,yy,r.x,r.y,r.w,r.h);}
  // V114: наведение на знак DEZ — подсветка таблички и курсор-рука.
  {const xx=G.mouse.x*W,yy=G.mouse.y*H,dr=(G.state==='menu')?dezMarkRect():null;
   const over=!!(dr&&hitRect(xx,yy,dr.x,dr.y,dr.w,dr.h));
   if(over!==!!G.dezHover){G.dezHover=over;canvas.style.cursor=over?'pointer':'';}}
  // V115/V116: подсветка вкладок, строк таблицы, аватаров профиля.
  if(G.state==='leaders'||G.state==='ach'||G.state==='profile'){
   const xx=G.mouse.x*W,yy=G.mouse.y*H;
   let hand=false;
   let sk=null;
   for(const r of scrTabRects())if(hitRect(xx,yy,r.x,r.y,r.w,r.h)){sk=r.key;break}
   if(sk!==G.scrHover)G.scrHover=sk;
   if(sk&&sk!==G.state)hand=true;
   if(G.state==='leaders'){
    let k=null;
    for(const r of lbTabRects())if(hitRect(xx,yy,r.x,r.y,r.w,r.h)){k=r.key;break}
    if(k!==G.lbHover)G.lbHover=k;
    if(k&&k!==(G.leaders?.tab))hand=true;
    let ri=-1;
    if(!G.lbCard)(G.lbRowRects||[]).forEach((r,i)=>{if(hitRect(xx,yy,r.x,r.y,r.w,r.h))ri=i});
    if(ri!==G.lbRowHover)G.lbRowHover=ri;
    if(ri>=0)hand=true;
   }
   if(G.state==='profile'){
    let ai=-1;
    const R=profRects();
    R.picks.forEach(r=>{if(hitRect(xx,yy,r.x,r.y,r.w,r.h))ai=r.idx});
    if(ai!==G.avaHover)G.avaHover=ai;
    if(ai>=0)hand=true;
    if(hitRect(xx,yy,R.rename.x,R.rename.y,R.rename.w,R.rename.h)||
       hitRect(xx,yy,R.online.x,R.online.y,R.online.w,R.online.h))hand=true;
   }
   if(!!hand!==!!G._tabHand){G._tabHand=hand;canvas.style.cursor=hand?'pointer':'';}
  }
  // V112: рисование по записной доске — добавляем точки к текущему штриху.
  if(G.state==='game'&&G.sketch&&G.sketch.open&&G.sketch.cur&&!G.sketch.exitPhase){G.sketch.rev=(G.sketch.rev|0)+1;
    const x=G.mouse.x*r.width,y=G.mouse.y*r.height;
    if(sketchInPaper(x,y)){const p=sketchToPaper(x,y),pts=G.sketch.cur.pts,last=pts[pts.length-1];
      if(!last||Math.hypot(p[0]-last[0],p[1]-last[1])>0.004){if(pts.length<400)pts.push(p);}}
  }
});
 canvas.addEventListener('pointerdown',e=>{window.AudioFX.unlock();const r=canvas.getBoundingClientRect();const x=e.clientX-r.left,y=e.clientY-r.top;G.mouse.x=Math.max(0,Math.min(1,x/r.width));G.mouse.y=Math.max(0,Math.min(1,y/r.height));window._sketchPid=e.pointerId;if(G.state==='game'&&G.sketch&&G.sketch.open){try{canvas.setPointerCapture&&canvas.setPointerCapture(e.pointerId)}catch(_){}}interact(x,y);});
 canvas.addEventListener('pointerup',e=>{if(G.sketch&&G.sketch.cur){G.sketch.cur=null;try{canvas.releasePointerCapture&&canvas.releasePointerCapture(e.pointerId)}catch(_){}}});
 canvas.addEventListener('pointercancel',e=>{if(G.sketch&&G.sketch.cur){G.sketch.cur=null;try{canvas.releasePointerCapture&&canvas.releasePointerCapture(e.pointerId)}catch(_){}}});
 canvas.addEventListener('pointerleave',e=>{if(G.sketch&&G.sketch.cur){G.sketch.cur=null;try{canvas.releasePointerCapture&&canvas.releasePointerCapture(e.pointerId)}catch(_){}}});
 // V82: прокрутка колесиком мыши на экране ПЛАН
 canvas.addEventListener('wheel',e=>{if(G.state==='plan'){G.planScroll=(G.planScroll||0)+e.deltaY*0.6;e.preventDefault();}},{passive:false});
 addEventListener('keydown',e=>{window.AudioFX.unlock();
  // V89: скример перехватывает клавиатуру целиком.
  if(window.Screamer?.isActive?.()){e.preventDefault();window.Screamer.skip();return}
  // V114: сцена 911 — пробел/Escape/Enter пропускают, остальные клавиши гасим.
  if(window.Call911?.isActive?.()){e.preventDefault();if(e.key===' '||e.key==='Escape'||e.key==='Enter')window.Call911.skip();return}
  if(G.state==='epichoice'){
    if(e.key==='ArrowLeft'||e.key==='a'||e.key==='A'){e.preventDefault();epiChoiceMove(-1);return;}
    if(e.key==='ArrowRight'||e.key==='d'||e.key==='D'){e.preventDefault();epiChoiceMove(1);return;}
    // V84: цифрами выбирается любая из пяти концовок
    if(e.key>='1'&&e.key<='9'){const k=parseInt(e.key,10)-1;
      if(k<EPI_CHOICES.length){e.preventDefault();G.choiceIdx=k;epiChoosePick();return;}}
    if(e.key===' '||e.key==='Enter'){e.preventDefault();epiChoosePick();return;}
    return;
  }
  if(G.state==='epilogue'&&(e.key===' '||e.key==='Escape'||e.key==='Enter')){e.preventDefault();G.epilogueTimer=Math.max(G.epilogueTimer||0,(G.epiDur||16.5)-0.55);return;}/* V103: ТРЕБОВАНИЕ ЯНДЕКС ИГР (десктоп, п.6) — игра не занимает горячие клавиши браузера и ОС. ПОЧЕМУ ТАК БЫЛО: F11 перехватывалась через preventDefault и включала полный экран сама. Это ровно та клавиша, которой браузер разворачивает окно, и игрок терял привычное поведение. СТАЛО: F11 отдана браузеру, а полный экран включается кнопкой НАСТРОЙКИ -> ПОЛНЫЙ ЭКРАН. */if(G.state==='game'){if(G.adWarn>0){e.preventDefault();return}/* V105: клавиши тоже не работают во время предупреждения о рекламе */
   /* V113: пока открыт режим рисования — только Escape закрывает доску
      (атмосферно), остальные игровые клавиши не срабатывают. */
   if(G.sketch&&G.sketch.open){if(e.key==='Escape'){e.preventDefault();closeSketch();}return}
   if(e.key==='Escape'){G.state='pause';G.pauseFrom='game';window.Platform.stopGameplay();return}if(e.key==='c'||e.key==='C'){if(!G.monitorTarget){openCameras()}else{closeCameras()}}if(e.key==='r'||e.key==='R')window.RadioSystem.toggle(G);
if(e.key==='p'||e.key==='P'){G.dialer=!G.dialer}
if(e.key==='m'||e.key==='M'){if(G.mask&&G.mask.available){if(G.mask.t<0.01){G.mask.worn=true;}else if(G.mask.worn&&G.mask.t>0.5){G.mask.worn=false;}window.AudioFX.play('click',.3,{group:'ui'})}}
if(e.key==='n'||e.key==='N'){if(G.note.state!=='gone'){G.note.open=true;G.note.timer=30;window.AudioFX.noteSound?.(true)}}
if(e.key==='q'||e.key==='Q')window.LightingSystem.toggle(G,'left');
if(e.key==='e'||e.key==='E')window.LightingSystem.toggle(G,'right');
if(e.key==='a'||e.key==='A'||e.key==='ArrowLeft'){if(window.SaveSystem.settings.camMode==='стрелки')stepYaw(-1);return}
if(e.key==='d'||e.key==='D'||e.key==='ArrowRight'){if(window.SaveSystem.settings.camMode==='стрелки')stepYaw(1);return}
if(e.key>='1'&&e.key<='7'){switchCam(Number(e.key),.28)}}else if(G.state==='teaser'&&G.teaser>TEASER_LOAD_DUR+2.0&&(e.key==='Enter'||e.key===' '))beginPlay();else if(G.state==='settings'&&e.key==='Escape'){const ui=document.getElementById('settings-ui');if(ui){ui.classList.remove('visible');ui.dataset.ready='';}G.state=G.pauseFrom==='pause'?'pause':'menu'}else if(G.state==='ach'&&e.key==='Escape'){G.state='menu'}else if(G.state==='leaders'){if(e.key==='Escape'){if(G.lbCard)G.lbCard=null;else G.state='menu'}else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){const cur=(G.leaders?.tab)==='time'?'score':'time';window.AudioFX.play('click');loadLeaders(cur)}}else if(G.state==='profile'){/* V116: ввод ника идёт в скрытое поле #nick-input, здесь только выход */ if(e.key==='Escape'){if(G.nameEdit)closeNameEdit(false);else G.state='menu'}}else if(G.state==='plan'&&e.key==='Escape'){G.state='menu'}else if(G.state==='custom'&&e.key==='Escape'){G.state='menu'}else if(G.state==='minigame'){try{window.MiniGame.key(e)}catch(err){}}else if(G.state==='exited'&&(e.key==='Escape'||e.key==='Enter'||e.key===' ')){G.state='menu';G.pauseFrom='menu'}});
 addEventListener('keyup',e=>{});
 // V108: ТРЕБОВАНИЕ 1.4 — ПРИ СВОРАЧИВАНИИ СТРАНИЦЫ ЗВУК ПРОПАДАЕТ.
 // ПОЧЕМУ ТАК БЫЛО: обработчик blur был пустым, а звук глушился только по
 // visibilitychange. Свёрнутое окно браузера или переход в другое приложение
 // в части браузеров (и на macOS при смене окна) это событие не бросает — игра
 // продолжала шуметь из фона. СТАЛО: потеря фокуса глушит звук и останавливает
 // разметку геймплея, возврат фокуса всё возвращает — ровно так же, как уже
 // сделано для событий площадки game_api_pause / game_api_resume.
 window.addEventListener('blur',()=>{try{G.platformPause()}catch(e){}});
 window.addEventListener('focus',()=>{try{if(!document.hidden)G.platformResume()}catch(e){}});
 window.Platform.init();
 window.AudioFX.setMusic(window.SaveSystem.settings.music);window.AudioFX.setSfx(window.SaveSystem.settings.ui);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)G.platformPause();else {G.platformPaused=false;window.AudioFX.setPlatformMuted?.(false);if(G.state==='game')window.Platform.startGameplay();}});
 window.addEventListener('contextmenu',e=>e.preventDefault());
 window.addEventListener('selectstart',e=>e.preventDefault());
 // ===== FNAF-style pseudo-3D pannable office camera (v46.48) =====
 window.OfficePano=(()=>{
  const PAN=2.1, MAXYAW=0.95;
  let pano=null,octx=null,cw=0,ch=0;
  function panW(){return Math.round(W*PAN);}
  function ensure(w,h){if(!pano){pano=document.createElement('canvas');octx=pano.getContext('2d');}if(cw!==w||ch!==h){pano.width=w;pano.height=h;cw=w;ch=h;}}
  function render(){
   const w=panW(),h=H;
   const resized=(cw!==w||ch!==h);
   ensure(w,h);
   // V71: панорама офиса шириной в два с лишним экрана — самый дорогой проход
   // вне камер. При просадке кадров она пересобирается реже, а поворот головы
   // остаётся плавным, потому что сдвиг считается при выводе, а не при рисовании.
   const _t=PERF.tier;
   if(_t>0&&!resized){
    const fps=_t===1?30:22,tn=performance.now();
    if(render._at&&(tn-render._at)<1000/fps)return;
    render._at=tn;
   }
   octx.setTransform(1,0,0,1,0,0);octx.clearRect(0,0,w,h);
   const ly=(G.look.sy-.5)*12;
   octx.save();octx.translate(0,ly);
   // V83: кроме самого состояния дверей передаём прогресс их хода с остаточной
   // дрожью — так створка видимо едет и чуть отыгрывает на пороге.
   const _dw=s=>{const p=G.doorAnim[s]||0,st=G.doorSettle[s]||0;return st>0?Math.max(0,p-Math.sin(st/0.26*Math.PI*2)*0.012):p;};
   window.World.office(octx,w,h,G.mouse,{left:G.doors.left,right:G.doors.right,leftA:_dw('left'),rightA:_dw('right')},{left:G.lights.left,right:G.lights.right},G.monitor,G.monsters,G.screamer,G.officeMonitors);
   octx.restore();
  }
  function metrics(){
   const w=panW();const yaw=Math.max(-MAXYAW,Math.min(MAXYAW,G.viewYaw||0));
   const center=w/2+yaw*(w/2-W/2);
   const offsetX=Math.max(0,Math.min(w-W,center-W/2));
   return {panW:w,offsetX,yaw};
  }
  function display(){
   const m=metrics(),yaw=m.yaw;
   ctx.save();
   // 3D-in-2D: skew + perspective stretch so the scene tilts as you turn (covers rotation feel).
   const stretchY = 1 - Math.abs(yaw)*0.018; // slight vertical compression at the turn extremes for depth
   ctx.translate(W/2,H/2);ctx.transform(1,0,yaw*0.04,1,0,0);ctx.scale(1, stretchY);ctx.translate(-W/2,-H/2);
   // overscan a touch so the skew never exposes canvas edges.
   ctx.drawImage(pano,m.offsetX,0,W,H,-W*0.04,-H*0.04,W*1.08,H*1.08);
   ctx.restore();
   // far-side vignette: darken the edge you're turning away from.
   ctx.save();
   const vg=ctx.createLinearGradient(yaw<0?0:W,0,yaw<0?W*0.42:W*0.58,0);
   vg.addColorStop(0,'rgba(2,1,6,'+(0.12+Math.abs(yaw)*0.24)+')');vg.addColorStop(1,'rgba(0,0,0,0)');
   ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
   ctx.restore();
  }
  function screenToOffice(x,y){const m=metrics();const ly=(G.look.sy-.5)*12;return {x:x+m.offsetX,y:y-ly};}
  return {panW,render,display,metrics,screenToOffice};
 })();
 // V83: служебный ход для проверки вёрстки: позволяет быстро открыть любой экран
 // на любом языке и сравнить длину надписей. На игровой процесс не влияет.
 // V84: в служебный ход добавлены отрисовщики фигур — так можно проверять
 // аниматроников и охранника по отдельности, не гоняя всю смену.
 // V85: служебный ход для проверки ФИНАЛОВ и ФИНАЛЬНЫХ МЕНЮ без прохождения
 // пяти смен. Работает только при явном параметре в адресе страницы, поэтому
 // на обычный запуск (и на запуск на Яндекс Играх) не влияет никак:
 //   ?qa=menu&ending=truth   — открыть финальное меню конкретной концовки
 //   ?qa=truth&t=12&freeze=1 — остановить финал на двенадцатой секунде
 try{
  const qp=new URLSearchParams(location.search), qa=qp.get('qa');
  if(qa==='menu'){
   const e2=qp.get('ending')||'truth';
   window.SaveSystem.data.completed=true;
   window.SaveSystem.data.lastEnding=e2;
   window.SaveSystem.data.menuVariant='epilogue';
   G.menuVariant='epilogue';G.state='menu';
  }else if(qa){
   G.epiVariant=qa;G.epiDur=epiDuration(qa);
   G.epilogueTimer=parseFloat(qp.get('t')||'0')||0;
   G._epiCues={};G._qaFreeze=(qp.get('freeze')==='1');
   G.state='epilogue';
  }
 }catch(e){}
 // V86: при отладочном адресе (?qa=...) интерфейс выносится наружу — нужен только
 // для автоматических скриншотов при проверке вёрстки; на обычном запуске не создаётся.
 // V110: геометрия игровых кнопок отдаётся в служебный интерфейс (только при ?qa=),
 // чтобы автопроверка могла нажать каждую кнопку смены и сверить реакцию.
 G.__qa={startNight,beginPlay,setState:s=>{G.state=s;},draw:()=>draw(),
  hud:()=>hudRow(),sides:()=>sideButtonZones(),arrows:()=>turnArrowZones(),
  // V87: переключение варианта главного меню для проверки вёрстки.
  variant:v=>{G.menuVariant=v;window.SaveSystem.data.menuVariant=v;window.SaveSystem.data.completed=(v==='epilogue');},
  info:()=>({state:G.state,monitor:G.monitor,monitorTarget:G.monitorTarget,time:G.time,cam:G.cam,scream:!!(G.screamer&&G.screamer.active),mask:G.mask&&G.mask.worn,
    // V102: заряд, уровень нагрузки и штраф видимости — для проверки баланса
    battery:G.battery,usage:G.powerUsage,rate:powerRate(),night:G.extra||G.night,doorVis:doorVisPenalty()}),
  doors:(l,r)=>{G.doors.left=!!l;G.doors.right=!!r;},
  // V103: проверка правила «концовка по числу смертей»
  pick:(d)=>{window.SaveSystem.data.deaths=d;window.SaveSystem.data.epiCoin='';return epiVariant();},
  plan:()=>{G.state='plan';G.planScroll=0;},
  // V104: проверка кнопок рекламы — задать заряд и посмотреть прямоугольники
  batt:(v)=>{G.battery=Math.max(0,Math.min(100,+v||0));return G.battery;},
  ads:()=>({charge:adChargeRect(),retry:adRetryRect(),chargeUsed:!!G.adChargeUsed,retryUsed:!!G.adRetryUsed}),
  adGo:(w)=>(w==='retry'?adRetryGo():adChargeGo()),
  adBreak:()=>({warn:G.adWarn||0,shown:!!G.adShown,calm:adBreakCalm(),len:NIGHT_LEN}),
  time:(t)=>{if(t!=null)G.time=+t;return G.time;},
  deaths:(d)=>{if(d!=null)window.SaveSystem.data.deaths=d;return window.SaveSystem.data.deaths;},
  end:(w)=>endNight(!!w),
  // V102: поставить аниматроника в проём — иначе видимость в дверях не снять
  atDoor:(side,kind)=>{const m=(G.monsters||[]).find(x=>x&&(!kind||x.kind===kind));
    if(!m)return false;m.room=0;m.doorSide=side||'left';m.state='atDoor';return m.kind;},
  lamps:(l,r)=>{G.lights.left.on=!!l;G.lights.right.on=!!r;},
  // V94: служебный ход для проверки СЦЕНЫ ОТКЛЮЧЕНИЯ ПИТАНИЯ на любой секунде —
  // без него кадры приближения силуэта пришлось бы ждать по 15 секунд игры.
  blackout:(tt)=>{G.blackout={t:(+tt||0),phase:5,kind:'main'};},
  cams:v=>toggleCameras(!!v),
  // V98: служебный выбор камеры — иначе зал и сцену приходилось искать вручную
  // мышью по кнопкам монитора при каждой съёмке кадров.
  setCam:i=>{const rr=window.World.rooms||[];G.cam=Math.max(1,Math.min(rr.length-1,+i||1));},
  drawMon:(c,x,y,kind,sc)=>drawPixelMonster(c,x,y,{kind,state:'moving'},sc||1,{noShadow:false}),
  drawGuard:(c,x,y,sc,o)=>drawGuardChar(c,x,y,sc||1,o||{}),
  // V115: отладочные хуки экрана результатов.
  lbTabs:()=>lbTabRects(),scrTabs:()=>scrTabRects(),profRects:()=>profRects(),openProfile:()=>openProfile(),lbOpen:()=>openLeaders(),lbLoad:k=>loadLeaders(k),lbRec:()=>recordRun()};
 try{if(location.search.indexOf('qa')>=0)window.__qa=G.__qa;}catch(e){}
 // V114: рисунок с доски поднимается из сохранения СРАЗУ при старте — иначе на
 // пробковой доске висел бы пустой лист до первого захода в режим рисования.
 try{loadSketch()}catch(e){}
 requestAnimationFrame(tick);
 return G;
})();
