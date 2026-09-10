window.SaveSystem=(()=>{
 const KEY='night_shift_v117_save', SETTINGS='night_shift_v10_settings', BACKUP='night_shift_v117_backup';
 const defaults={
   bestScore:0, highestNight:1,chapter:1,totalRuns:0,completed:false,achievements:[],
   // Общее время в сменах (секунды) — показывается на экране достижений.
   playSeconds:0,
   // V73: сколько раз охранника убили за всё время. От этого числа зависит,
   // какую концовку игрок увидит после 5-й главы (0 / 1-4 / 5+).
   deaths:0, lastEnding:'',
   // V103: результат броска 50 на 50 между 4-й и 5-й концовкой. Пишется один
   // раз за прохождение, чтобы финал не менялся при каждом заходе в него.
   // «Новая игра» его стирает — бросок делается заново.
   epiCoin:'',
   // V114: рисунок игрока с пробковой доски. Массив штрихов вида
   // {c:цвет, w:толщина, p:[[x,y],...]} в нормализованных координатах листа.
   // Он же показывается вместо детского рисунка на самой доске в офисе.
   sketch:null,
   // V115: список забегов для экрана «ТОП ИГРОКОВ». Один элемент — одна
   // законченная смена: {s:счёт, t:секунды в смене, n:номер смены, d:время}.
   // Хранится локально, потому что на itch.io нет ни сервера, ни аккаунтов,
   // и это единственный способ показать таблицу, которая работает всегда.
   runs:[],
   // V116: профиль игрока для интернет-топа. name — ник (по умолчанию
   // «ОХРАННИК-1234», меняется на экране профиля), avatar — номер пиксельной
   // иконки, online — разрешение отправлять результат в общую таблицу.
   profile:{name:'',avatar:0,online:true},
   secrets:[],
   integrityVersion:1,
   tamperCount:0,
   securityTainted:false,
   // V82: таймстамп последнего сохранения — чтобы облако не затёрло
   // локальный прогресс более старой версией.
   updatedAt:0
 };
 const settings={
   music:.42, ambience:.35, monster:.8, radio:.55, phone:.7, ui:.4,
   // V103: ПРОФИЛЬ УСТРОЙСТВА ПО УМОЛЧАНИЮ — НИЗКИЙ.
   // ПОЧЕМУ ТАК БЫЛО: по умолчанию стоял высокий профиль со всеми эффектами.
   // На слабых машинах и в браузере на встроенной графике игра проваливала
   // кадры и ловила ошибки отрисовки именно в напряжённые моменты.
   // СТАЛО: низкий профиль сразу при первом запуске; кто хочет полной
   // картинки — включает высокий в НАСТРОЙКАХ, перезапуск не нужен.
   // V110: ПРОФИЛЬ ПО УМОЛЧАНИЮ — СБАЛАНСИРОВАННЫЙ, А НЕ НИЗКИЙ.
   // ПОЧЕМУ ТАК БЫЛО: низкий профиль + quality:'normal' включались у всех
   // без разбора машины: разрешение падало на 22%, шейдеры отключались
   // целиком (PostFX глушится при deviceMode==='low'), свет и отражения шли в
   // упрощённом виде — игра сразу выглядела тёмной и мыльной.
   // СТАЛО: сбалансированный профиль со средними тенями/светом/эффектами; на
   // слабом железе игра сама опускает его до низкого при первом запуске и
   // дополнительно снимает нагрузку по замерам кадров.
   crt:.35, shake:true, quality:'high', deviceMode:'balanced', resolution:'auto',
   displayMode:'windowed', fpsLimit:60, brightness:1,
   shadows:'medium', reflections:'medium', lighting:'medium', effects:'medium', shaderIntensity:.45, scanlines:.55, grain:.35, vignette:.45, chromatic:.18, glitch:.15,
   leftInterface:true, rightInterface:true,
   effectsEnabled:true, effectGlitch:true, effectScanlines:true, effectGrain:true, effectVignette:true, effectChromatic:true,
   camMode:'стрелки', doorKeys:true,
  // V111: ЭКРАННЫЕ КНОПКИ ДВЕРИ/СВЕТА. По умолчанию ВЫКЛ — игрок нажимает прямо на
  // дверь и лампу в офисе. Кто хочет старые боковые кнопки — включает их тут.
  sideButtons:false,
  // V111: ВСПЛЫВАЮЩИЕ УВЕДОМЛЕНИЯ О ДОСТИЖЕНИЯХ. По умолчанию ВКЛ — при получении
  // отметки снизу выезжает карточка с иконкой и названием. Можно отключить.
  achPopups:true,
   // V83: язык интерфейса. Пустая строка = ещё не выбран, тогда язык
   // определяется по платформе/браузеру при первом запуске.
   lang:''
 };
 let data={...defaults}; let cfg={...settings};
 function checksum(obj){try{const s=JSON.stringify(obj,(k,v)=>k==='integrity' ? undefined:v);let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16)}catch(e){return ''}}
 function normalize(){
   data.highestNight=Math.min(5,Math.max(1,Number(data.highestNight)||1));
   data.chapter=Math.min(5,Math.max(1,Number(data.chapter)||data.highestNight||1));
   data.bestScore=Math.max(0,Math.floor(Number(data.bestScore)||0));
   data.playSeconds=Math.max(0,Math.floor(Number(data.playSeconds)||0));
   data.deaths=Math.max(0,Math.floor(Number(data.deaths)||0));
   data.totalRuns=Math.max(0,Math.floor(Number(data.totalRuns)||0));
   if(!Array.isArray(data.achievements))data.achievements=[];
   if(!Array.isArray(data.runs))data.runs=[];
   if(!Array.isArray(data.secrets))data.secrets=[];
 }
 function integrityObject(){const c={...data};delete c.integrity;return c}
 function save(){try{normalize();data.updatedAt=Date.now();data.integrity=checksum(integrityObject());const raw=JSON.stringify(data);localStorage.setItem(KEY,raw);localStorage.setItem(BACKUP,raw)}catch(e){}}
 try{
   let raw=localStorage.getItem(KEY)||''; let parsed=raw?JSON.parse(raw):{};
   let integrityBroken=false;
   const valid=parsed && parsed.integrity && parsed.integrity===checksum(parsed);
   if(raw && !valid){integrityBroken=true;
     const backup=localStorage.getItem(BACKUP)||'';
     try{const b=backup?JSON.parse(backup):null;if(b&&b.integrity===checksum(b)){parsed=b;data.tamperCount=(Number(b.tamperCount)||0)+1}else data.tamperCount=1}catch(e){data.tamperCount=1}
   }
   Object.assign(data,parsed||{}); if(integrityBroken)data.tamperCount=(Number(data.tamperCount)||0)+1; normalize(); data.updatedAt=Number(data.updatedAt)||0;
 }catch(e){}
 try{Object.assign(cfg,JSON.parse(localStorage.getItem(SETTINGS)||'{}'))}catch(e){}
 function saveSettings(){try{localStorage.setItem(SETTINGS,JSON.stringify(cfg))}catch(e){}}
 function reset(){Object.keys(data).forEach(k=>delete data[k]);Object.assign(data,JSON.parse(JSON.stringify(defaults)));save()}
 function set(key,value){if(key in cfg){cfg[key]=value;saveSettings()}}
 // V82: сохранение в облаке больше не может откатить локальный прогресс.
 // Раньше Object.assign(data,cloud) затирал всё: если в облаке лежало
 // устаревшее сохранение, прохождение возвращалось на 1-ю главу, а
 // «Продолжить» открывало первую смену. Теперь: достижения всегда
 // объеди­няются (ни одно не теряется), а поля прохождения берутся из
 // облака только если облако НОВЕЕ локального (по updatedAt).
 function mergeCloud(cloud){
   if(!cloud||typeof cloud!=='object')return;
   const ach=new Set(data.achievements||[]);
   if(Array.isArray(cloud.achievements))(cloud.achievements||[]).forEach(a=>ach.add(a));
   data.achievements=[...ach];
   const localTs=Number(data.updatedAt)||0, cloudTs=Number(cloud.updatedAt)||0;
   if(cloudTs>localTs){
     ['highestNight','chapter','completed','lastEnding','menuVariant','deaths','bestScore','playSeconds','totalRuns','epiCoin','profile','secrets','tamperCount','updatedAt'].forEach(k=>{
       if(cloud[k]!==undefined)data[k]=cloud[k];
     });
   }
   data.updatedAt=Math.max(localTs,cloudTs,Date.now());
   save();
   window.NightShift?.syncCloudProgress?.();
 }
 // V82: «Новая игра» сбрасывает прохождение на 1-ю смену, но НЕ стирает
 // достижения и общие показатели (bestScore, playSeconds, totalRuns). Так
 // прогресс действительно обнуляется «до начала», но кубки остаются.
 function startNewGame(){
   const keepAch=data.achievements||[];
   const keepBest=Number(data.bestScore)||0;
   const keepTime=Number(data.playSeconds)||0;
   const keepRuns=Number(data.totalRuns)||0;
   // V84: раньше здесь стояло data={...defaults} — локальная ссылка подменялась,
   // а SaveSystem.data наружу отдавался СТАРЫЙ объект, и прогресс на самом деле
   // не обнулялся: меню продолжало показывать прежнюю смену. Теперь тот же самый
   // объект очищается на месте, поэтому сброс видят все, кто на него смотрит.
   Object.keys(data).forEach(k=>{delete data[k];});
   Object.assign(data,JSON.parse(JSON.stringify(defaults)));
   data.achievements=keepAch;
   data.bestScore=keepBest;
   data.playSeconds=keepTime;
   data.totalRuns=keepRuns;
   data.updatedAt=Date.now();
   save();
   if(window.Platform&&typeof window.Platform.save==='function'){try{window.Platform.save(data)}catch(e){}}
 }
 function applyPlatformSettings(){try{document.body.classList.toggle('low-end',cfg.quality==='normal'||cfg.effects==='low')}catch(e){}}
 return {data,settings:cfg,save,saveSettings,reset,set,mergeCloud,startNewGame,applyPlatformSettings,keys:{KEY,SETTINGS}};
})();
