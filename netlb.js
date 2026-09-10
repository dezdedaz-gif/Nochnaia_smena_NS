/* NS-05 V117.5 — online leaderboard client.
 * Primary score writes use the trusted HTTPS backend.
 * Score writes are backend-only. There is deliberately NO client-side write
 * fallback: a browser is untrusted and must never be allowed to write scores
 * directly to the leaderboard.
 */
(function(){
 const CFG=Object.assign({
  gameKey:'',devMode:false,gameVersion:'1.17.5.0',
  host:'https://api.lootlocker.com/game',
  backendUrl:'',
  boards:{score:'night_shift_score',time:'night_shift_time'},count:50,
  clientWriteFallback:false
 },window.NETLB_CONFIG||{});
 const TIMEOUT=9000, ID_KEY='night_shift_guest_id';
 const S={status:'off',token:'',playerId:'',uid:'',ident:'',name:'',err:'',tries:0,challenge:'',challengeNight:0,serverSuspicious:false,telemetryTimer:0,telemetrySeq:0};
 function key(){return String((window.NETLB_CONFIG?.gameKey)||CFG.gameKey||'').trim()}
 function backend(){return String((window.NETLB_CONFIG?.backendUrl)||CFG.backendUrl||'').trim().replace(/\/$/,'')}
 function enabled(){return !!key()}
 function secureWrites(){return !!backend()}
 function ident(){
  if(S.ident)return S.ident; let v='';
  try{v=localStorage.getItem(ID_KEY)||''}catch(e){}
  if(!v){v='ns05-'+cryptoRandom()+cryptoRandom();try{localStorage.setItem(ID_KEY,v)}catch(e){}}
  S.ident=v;return v;
 }
 function runId(){return 'r-'+cryptoRandom()+cryptoRandom()+Date.now().toString(36)}
 function cryptoRandom(){try{const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0].toString(36).slice(0,8)}catch(e){return Math.random().toString(36).slice(2,10)}}
 async function api(path,method,body,auth){
  const ctl=new AbortController(), t=setTimeout(()=>ctl.abort(),TIMEOUT);
  try{
   const h={'Content-Type':'application/json'};
   if(auth)h['x-session-token']=S.token;
   const res=await fetch(CFG.host.replace(/\/+$/,'')+'/'+path,{method,headers:h,signal:ctl.signal,body:body?JSON.stringify(body):undefined});
   let js=null;try{js=await res.json()}catch(e){}
   if(!res.ok){const e=new Error((js&&(js.message||js.error))||('HTTP '+res.status));e.code=res.status;throw e}
   return js||{};
  }finally{clearTimeout(t)}
 }
 let loginPromise=null;
 function login(){
  if(!enabled()){S.status='off';return Promise.resolve(false)}
  if(S.token)return Promise.resolve(true);
  if(loginPromise)return loginPromise;
  S.status='connecting';
  loginPromise=api('v2/session/guest','POST',{game_key:key(),game_version:CFG.gameVersion,player_identifier:ident(),development_mode:!!CFG.devMode},false)
   .then(js=>{
    S.token=js.session_token||'';
    S.playerId=String(js.player_id||js.player_ulid||'');
    S.uid=String(js.public_uid||js.player_public_uid||'');
    S.name=js.player_name||js.name||'';
    S.status=S.token?'online':'error';
    return !!S.token;
   })
   .catch(e=>{S.status='error';S.err=String(e?.message||e);S.tries++;console.warn('NetLB login:',S.err);return false})
   .finally(()=>{loginPromise=null});
  return loginPromise;
 }
 async function setName(name){
  const n=String(name||'').trim().slice(0,32);
  if(!n||!await login())return false;
  try{await api('player/name','PATCH',{name:n},true);S.name=n;return true}
  catch(e){console.warn('NetLB setName:',e.message);return false}
 }
 function parseMeta(m){if(!m)return null;if(typeof m==='object')return m;try{return JSON.parse(m)}catch(e){return null}}
 function norm(items,kind){
  return (items||[]).map((it,i)=>{
   const meta=parseMeta(it.metadata),pl=it.player||{};
   const mine=(S.playerId&&String(pl.id||pl.player_id||'')===S.playerId)||(S.uid&&String(pl.public_uid||'')===S.uid)||(S.ident&&meta&&meta.g===S.ident);
   const sc=kind==='time'?((meta&&meta.s)|0):(it.score|0);
   const sec=kind==='time'?(it.score|0):((meta&&meta.t)|0);
   return {rank:it.rank||i+1,name:String((meta&&meta.n)||pl.name||pl.public_uid||'АНОНИМ').slice(0,24),score:sc,seconds:sec,you:!!mine,global:true,meta:meta||null,avatar:(meta&&meta.a|0)||0};
  });
 }
 async function top(kind,count){
  const board=CFG.boards[kind];
  if(!board||!await login())return null;
  const n=Math.max(1,Math.min(200,count||CFG.count||50));
  try{
   const js=await api('leaderboards/'+encodeURIComponent(board)+'/list?count='+n,'GET',null,true);
   return norm(js.items||js.scores||[],kind);
  }catch(e){console.warn('NetLB top:',e.message);return null}
 }
 async function startRun(night){
  if(!secureWrites()||!await login())return false;
  const n=Math.max(1,Math.min(5,Number(night)||1));
  try{
   const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),TIMEOUT);
   const r=await fetch(backend()+'/api/start',{method:'POST',headers:{'Content-Type':'application/json'},signal:ctl.signal,body:JSON.stringify({playerId:S.playerId,sessionToken:S.token,night:n,gameVersion:CFG.gameVersion})});
   clearTimeout(t); const j=await r.json().catch(()=>({}));
   if(!r.ok||j.accepted!==true)throw new Error(j.error||('HTTP '+r.status));
   S.challenge=String(j.challenge||'');S.challengeNight=n;return !!S.challenge;
  }catch(e){S.challenge='';console.warn('NetLB startRun:',e.message);return false}
 }
 async function secureSubmit(kind,value,meta){
  if(!secureWrites()||!await login())return false;
  const board=CFG.boards[kind];if(!board)return false;
  const m=meta&&typeof meta==='object'?meta:{};
  if(S.serverSuspicious)return false;
  if(!S.challenge||S.challengeNight!==Number(m.night??m.ni??1))return false;
  const payload={kind,board,score:Math.max(0,Math.floor(Number(value)||0)),playerId:S.playerId,publicUid:S.uid,guestId:ident(),sessionToken:S.token,metadata:m,gameVersion:CFG.gameVersion,runId:runId(),night:Number(m.night??m.ni??1),time:Number(m.t??0),completed:m.completed===true,challenge:S.challenge,flags:Array.isArray(m.flags)?m.flags:[]};
  try{
   const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),TIMEOUT);
   const r=await fetch(backend()+'/api/submit',{method:'POST',headers:{'Content-Type':'application/json'},signal:ctl.signal,body:JSON.stringify(payload)});
   clearTimeout(t);
   const j=await r.json().catch(()=>({}));
   if(!r.ok)throw new Error(j.error||('HTTP '+r.status));
   return j.accepted===true;
  }catch(e){console.warn('NetLB secure submit:',e.message);return false}
 }
 async function finalizeRun(meta){
  if(!secureWrites()||!await login())return {accepted:false,error:'OFFLINE'};
  if(S.serverSuspicious)return {accepted:false,suspicious:true,error:'SERVER_TAMPER_DETECTED'};
  const m=meta&&typeof meta==='object'?meta:{};
  const n=Number((m.night??m.ni??S.challengeNight??1)), t=Number(m.t??0), sc=Math.max(0,Math.floor(Number(m.s??0)));
  if(!S.challenge||S.challengeNight!==n)return {accepted:false,error:'NO_CHALLENGE'};
  const payload={kind:'finalize',board:CFG.boards.score,score:sc,playerId:S.playerId,publicUid:S.uid,guestId:ident(),sessionToken:S.token,metadata:m,gameVersion:CFG.gameVersion,runId:runId(),night:n,time:t,completed:m.completed===true,challenge:S.challenge,flags:Array.isArray(m.flags)?m.flags:[]};
  try{
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),TIMEOUT);
    const r=await fetch(backend()+'/api/finalize',{method:'POST',headers:{'Content-Type':'application/json'},signal:ctl.signal,body:JSON.stringify(payload)});
    clearTimeout(timer); const j=await r.json().catch(()=>({}));
    if(j.suspicious===true||j.tainted===true)S.serverSuspicious=true;
    return {accepted:r.ok&&j.accepted===true,suspicious:j.suspicious===true,error:j.error||''};
  }catch(e){return {accepted:false,error:String(e?.message||e)}}
 }
 async function telemetry(state){
  if(!secureWrites()||!S.challenge||!await login())return false;
  const x=state&&typeof state==='object'?state:{};
  const payload={playerId:S.playerId,sessionToken:S.token,night:Number(x.night||S.challengeNight||1),challenge:S.challenge,seq:++S.telemetrySeq,clientMs:Math.floor(performance.now()),runSec:Number(x.runSec||0),score:Number(x.score||0),state:String(x.state||'').slice(0,24),event:String(x.event||'').slice(0,64),snapshot:x.snapshot&&typeof x.snapshot==='object'?x.snapshot:{},flags:Array.isArray(x.flags)?x.flags:[],integrityHash:String(x.integrityHash||window.NSAC?.integrityHash?.()||''),saveIntegrity:String(x.saveIntegrity||window.SaveSystem?.data?.integrity||''),gameVersion:CFG.gameVersion};
  try{
    const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),TIMEOUT);
    const r=await fetch(backend()+'/api/heartbeat',{method:'POST',headers:{'Content-Type':'application/json'},signal:ctl.signal,body:JSON.stringify(payload)}); clearTimeout(t);
    const j=await r.json().catch(()=>({}));
    if(j.suspicious===true){S.serverSuspicious=true;return false;}
    return r.ok&&j.accepted===true;
  }catch(e){return false}
 }
 function startTelemetry(getState){
  stopTelemetry(); if(!secureWrites())return;
  S.telemetryTimer=setInterval(()=>{try{const x=typeof getState==='function'?getState():{};telemetry(x)}catch(e){}},5000);
 }
 function stopTelemetry(){if(S.telemetryTimer){clearInterval(S.telemetryTimer);S.telemetryTimer=0;}}
 async function submit(kind,value,meta){
  // Strict mode: only the trusted backend may write scores.
  if(!await login())return false;
  return secureSubmit(kind,value,meta);
 }
 window.NetLB={enabled,login,startRun,finalizeRun,setName,submit,top,status:()=>S.status,error:()=>S.err,ident,playerId:()=>S.playerId,boards:()=>CFG.boards,cfg:()=>CFG,secureWrites,backendUrl:backend,telemetry,startTelemetry,stopTelemetry,serverSuspicious:()=>S.serverSuspicious};
})();
