/* NS-05 V117.5 — client telemetry + tamper detection.
 * Client checks are signals only; the Render gateway remains the authority.
 */
window.NSAC=(()=>{
 const S={flags:[],started:0,lastSample:0,lastScore:0,lastRun:0,active:false,events:0,integrity:[],baseline:null,scriptCount:0};
 const MAX_NIGHT=5, MAX_RUN=3600, MAX_SCORE_RATE=30;
 function flag(code,detail){
  const c=String(code||'UNKNOWN');
  if(!S.flags.some(x=>x.code===c)) S.flags.push({code:c,detail:String(detail||'').slice(0,120),at:Date.now()});
 }
 function fingerprint(v){try{return String(v).replace(/\s+/g,' ').slice(0,180)}catch(e){return ''}}
 function makeBaseline(){
  const names=['startNight','beginPlay','endNight','recordRun'];
  const b={}; for(const n of names){try{b[n]=fingerprint(window[n])}catch(e){b[n]=''}}
  try{b.netSubmit=fingerprint(window.NetLB?.submit);b.netStart=fingerprint(window.NetLB?.startRun);b.save=fingerprint(window.SaveSystem?.save)}catch(e){}
  S.baseline=b;S.scriptCount=document.scripts.length;
 }
 function integrityCheck(){
  if(!S.active||!S.baseline)return;
  const b=S.baseline;
  for(const n of ['startNight','beginPlay','endNight','recordRun']){try{if(b[n]&&fingerprint(window[n])!==b[n])flag('RUNTIME_FUNCTION_CHANGED',n)}catch(e){}}
  try{if(b.netSubmit&&fingerprint(window.NetLB?.submit)!==b.netSubmit)flag('NETLB_CHANGED','submit')}catch(e){}
  try{if(b.netStart&&fingerprint(window.NetLB?.startRun)!==b.netStart)flag('NETLB_CHANGED','startRun')}catch(e){}
  try{if(b.save&&fingerprint(window.SaveSystem?.save)!==b.save)flag('SAVE_FUNCTION_CHANGED')}catch(e){}
  if(document.scripts.length>S.scriptCount+1)flag('SCRIPT_INJECTION','script_count');
 }
 function start(n){
  S.flags=[];S.started=performance.now();S.lastSample=S.started;S.lastScore=0;S.lastRun=0;S.active=true;S.events=0;S.integrity=[];makeBaseline();
  if((n|0)<1||(n|0)>MAX_NIGHT)flag('BAD_NIGHT',n);
 }
 function event(code){if(S.active){S.events++;if(code)flag('EVENT_'+String(code).slice(0,32));}}
 function sample(score,runSec,dt){
  if(!S.active)return;
  const s=Number(score),t=Number(runSec),d=Number(dt)||0;
  if(!Number.isFinite(s)||s<0||s>108000)flag('BAD_SCORE',s);
  if(!Number.isFinite(t)||t<0||t>MAX_RUN)flag('BAD_TIME',t);
  if(s+0.5<S.lastScore)flag('SCORE_ROLLBACK');
  if(t+1<S.lastRun)flag('TIME_ROLLBACK');
  if(d>1.5)flag('FRAME_GAP',d.toFixed(2));
  const ds=s-S.lastScore,max=MAX_SCORE_RATE*Math.max(.1,d||1);
  if(ds>max+20)flag('SCORE_SPIKE',ds.toFixed(1));
  S.lastScore=Math.max(S.lastScore,s);S.lastRun=Math.max(S.lastRun,t);S.lastSample=performance.now();
  if((S.events&31)===0)integrityCheck();
 }
 function validate(run){
  integrityCheck();
  const r=run||{},s=Number(r.s),t=Number(r.t),n=Number(r.n);
  if(!Number.isFinite(s)||!Number.isFinite(t)||!Number.isFinite(n))flag('NON_FINITE_RUN');
  if(s<0||t<5||n<1||n>5)flag('INVALID_RUN_RANGE');
  if(t>3600)flag('RUN_TOO_LONG');
  if(s>t*30+120)flag('IMPOSSIBLE_SCORE');
  return {ok:S.flags.length===0,flags:S.flags.slice(),events:S.events};
 }
 function finish(){S.active=false;}
 function integrityHash(){
  try{
    const src=['startNight','beginPlay','endNight','recordRun'].map(n=>fingerprint(window[n])).join('|');
    const net=fingerprint(window.NetLB?.submit)+'|'+fingerprint(window.NetLB?.startRun)+'|'+fingerprint(window.NetLB?.finalizeRun);
    const scripts=[...document.scripts].map(x=>String(x.src||x.textContent||'').slice(0,260)).join('|');
    const raw=src+'||'+net+'||'+scripts+'||'+String(document.scripts.length);
    let h=2166136261;for(let i=0;i<raw.length;i++){h^=raw.charCodeAt(i);h=Math.imul(h,16777619)}return (h>>>0).toString(16);
  }catch(e){return ''}
 }
 function status(){return S.flags.length?'SUSPICIOUS':'CLEAN'}
 return {start,event,sample,validate,finish,status,flags:()=>S.flags.slice(),integrityCheck,integrityHash};
})();
