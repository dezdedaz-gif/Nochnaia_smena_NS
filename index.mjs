// NS-05 V117.5 — hardened trusted leaderboard gateway. Node 20+.
// The LootLocker Server API key MUST exist only in the hosting provider's secret environment.
import http from 'node:http';
import crypto from 'node:crypto';
import pg from 'pg';
const { Pool } = pg;

const PORT=Number(process.env.PORT||10000);
const LL='https://api.lootlocker.io/server';
const SERVER_KEY=String(process.env.LOOTLOCKER_SERVER_API_KEY||'').trim();
const DATABASE_URL=String(process.env.DATABASE_URL||'').trim();
const DB_REQUIRED=String(process.env.DB_REQUIRED||'true').toLowerCase()!=='false';
const pool=DATABASE_URL?new Pool({connectionString:DATABASE_URL,ssl:{rejectUnauthorized:false},max:5,idleTimeoutMillis:30000,connectionTimeoutMillis:8000}):null;
const ALLOWED_ORIGIN=String(process.env.ALLOWED_ORIGIN||'').trim();
const SCORE_BOARD=process.env.SCORE_BOARD||'night_shift_score';
const TIME_BOARD=process.env.TIME_BOARD||'night_shift_time';
const GAME_VERSION=process.env.GAME_VERSION||'1.17.5.0';
const MAX_SCORE=108000, MAX_TIME=3600, MAX_RATE_MS=5000, MAX_BODY=12000;
const HEARTBEAT_MS=5000, MAX_HEARTBEAT_GAP_MS=15000, MIN_HEARTBEAT_COVERAGE=0.60;
const recent=new Map();
const usedRuns=new Map();
const activeRuns=new Map();
const runTelemetry=new Map();
const blockedPlayers=new Map();
const playerRisk=new Map();
let serverToken='', serverTokenAt=0;
let dbReady=false;

async function dbInit(){
  if(!pool){ if(DB_REQUIRED) throw new Error('database_not_configured'); return; }
  await pool.query(`CREATE TABLE IF NOT EXISTS ns05_runs (
    player_id TEXT NOT NULL, night INTEGER NOT NULL, challenge TEXT NOT NULL, started_at BIGINT NOT NULL,
    last_heartbeat_at BIGINT NOT NULL, heartbeat_count INTEGER NOT NULL DEFAULT 0, max_seq INTEGER NOT NULL DEFAULT 0,
    last_run_sec DOUBLE PRECISION NOT NULL DEFAULT 0, last_score DOUBLE PRECISION NOT NULL DEFAULT 0,
    suspicious BOOLEAN NOT NULL DEFAULT FALSE, reason TEXT NOT NULL DEFAULT '', integrity_hash TEXT NOT NULL DEFAULT '',
    save_integrity TEXT NOT NULL DEFAULT '', last_snapshot JSONB, status TEXT NOT NULL DEFAULT 'active',
    updated_at BIGINT NOT NULL, PRIMARY KEY(player_id,night)
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS ns05_security_events (
    id BIGSERIAL PRIMARY KEY, player_id TEXT NOT NULL, night INTEGER, reason TEXT NOT NULL,
    at BIGINT NOT NULL, payload JSONB
  )`);
  await pool.query(`CREATE TABLE IF NOT EXISTS ns05_player_risk (
    player_id TEXT PRIMARY KEY, reason TEXT NOT NULL, night INTEGER, at BIGINT NOT NULL, until_at BIGINT NOT NULL
  )`);
  const {rows}=await pool.query(`SELECT * FROM ns05_runs WHERE status='active'`);
  for(const r of rows){ activeRuns.set(r.player_id+':'+r.night,{challenge:r.challenge,at:Number(r.started_at),memberId:r.player_id,night:r.night,lastHeartbeat:Number(r.last_heartbeat_at),heartbeatCount:r.heartbeat_count,maxSeq:r.max_seq,lastRunSec:r.last_run_sec,lastScore:r.last_score,suspicious:r.suspicious,reason:r.reason,integrityHash:r.integrity_hash,saveIntegrity:r.save_integrity,lastSnapshot:r.last_snapshot||null}); }
  const risks=await pool.query(`SELECT * FROM ns05_player_risk WHERE until_at>$1`,[Date.now()]);
  for(const r of risks.rows) playerRisk.set(r.player_id,{at:Number(r.at),reason:r.reason,night:r.night});
  dbReady=true;
}
async function dbRunUpsert(playerId,n,ar){
  if(!pool)return;
  await pool.query(`INSERT INTO ns05_runs(player_id,night,challenge,started_at,last_heartbeat_at,heartbeat_count,max_seq,last_run_sec,last_score,suspicious,reason,integrity_hash,save_integrity,last_snapshot,status,updated_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'active',$15)
    ON CONFLICT(player_id,night) DO UPDATE SET challenge=EXCLUDED.challenge,started_at=EXCLUDED.started_at,last_heartbeat_at=EXCLUDED.last_heartbeat_at,heartbeat_count=EXCLUDED.heartbeat_count,max_seq=EXCLUDED.max_seq,last_run_sec=EXCLUDED.last_run_sec,last_score=EXCLUDED.last_score,suspicious=EXCLUDED.suspicious,reason=EXCLUDED.reason,integrity_hash=EXCLUDED.integrity_hash,save_integrity=EXCLUDED.save_integrity,last_snapshot=EXCLUDED.last_snapshot,status='active',updated_at=EXCLUDED.updated_at`,
    [playerId,n,ar.challenge,ar.at,ar.lastHeartbeat||ar.at,ar.heartbeatCount||0,ar.maxSeq||0,ar.lastRunSec||0,ar.lastScore||0,!!ar.suspicious,ar.reason||'',ar.integrityHash||'',ar.saveIntegrity||'',ar.lastSnapshot||null,Date.now()]);
}
async function dbEvent(playerId,n,reason,payload={}){
  if(!pool)return;
  await pool.query(`INSERT INTO ns05_security_events(player_id,night,reason,at,payload) VALUES($1,$2,$3,$4,$5)`,[playerId,n,reason,Date.now(),payload]);
}
async function dbRisk(playerId,reason,night){
  const at=Date.now(),until=at+30*86400000; playerRisk.set(playerId,{at,reason,night});
  if(!pool)return;
  await pool.query(`INSERT INTO ns05_player_risk(player_id,reason,night,at,until_at) VALUES($1,$2,$3,$4,$5) ON CONFLICT(player_id) DO UPDATE SET reason=EXCLUDED.reason,night=EXCLUDED.night,at=EXCLUDED.at,until_at=EXCLUDED.until_at`,[playerId,reason,night,at,until]);
}
async function dbFinish(playerId,n,accepted,reason=''){
  if(!pool)return;
  await pool.query(`UPDATE ns05_runs SET status=$3,reason=$4,updated_at=$5 WHERE player_id=$1 AND night=$2`,[playerId,n,accepted?'finished':'tainted',reason,Date.now()]);
}

function originAllowed(req){
  const o=String(req.headers.origin||'');
  return !!ALLOWED_ORIGIN && o===ALLOWED_ORIGIN;
}
function cors(res,req){
  const o=String(req.headers.origin||'');
  if(ALLOWED_ORIGIN && o===ALLOWED_ORIGIN) res.setHeader('Access-Control-Allow-Origin',o);
  res.setHeader('Vary','Origin');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS,GET');
  res.setHeader('Access-Control-Max-Age','600');
}
function securityHeaders(res){
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
}
function json(res,req,status,obj){securityHeaders(res);cors(res,req);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(obj));}
function clientIp(req){
  // Render terminates TLS; do not trust arbitrary forwarded headers from the browser.
  return String(req.socket.remoteAddress||'unknown').slice(0,80);
}
function cleanup(){
  const now=Date.now();
  for(const [k,v] of recent) if(now-v>120000) recent.delete(k);
  for(const [k,v] of usedRuns) if(now-v>86400000) usedRuns.delete(k);
  for(const [k,v] of activeRuns) if(now-v.at>2*3600000) activeRuns.delete(k);
  for(const [k,v] of runTelemetry) if(now-v.at>2*3600000) runTelemetry.delete(k);
  for(const [k,v] of blockedPlayers) if(now-v>7*86400000) blockedPlayers.delete(k);
  for(const [k,v] of playerRisk) if(now-v.at>30*86400000) playerRisk.delete(k);
}
setInterval(cleanup,60000).unref();

async function getServerToken(){
  if(!SERVER_KEY)throw new Error('server_not_configured');
  if(serverToken && Date.now()-serverTokenAt<45*60*1000)return serverToken;
  const r=await fetch(`${LL}/session`,{method:'POST',headers:{'Content-Type':'application/json','LL-Version':'2021-03-01','x-server-key':SERVER_KEY},body:JSON.stringify({game_version:GAME_VERSION})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok||!j.token)throw new Error('server_session_failed');
  serverToken=j.token;serverTokenAt=Date.now();return serverToken;
}
async function resolvePlayer(sessionToken){
  const tok=String(sessionToken||'').trim();
  if(tok.length<20||tok.length>4096)throw new Error('bad_session');
  const r=await fetch(`${LL}/player/info/token`,{method:'POST',headers:{'Content-Type':'application/json','LL-Version':'2021-03-01','x-auth-token':await getServerToken()},body:JSON.stringify({tokens:[tok]})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error('player_lookup_failed');
  const p=(j.player_info_list||[])[0];
  if(!p)throw new Error('unknown_player');
  return String(p.legacy_id);
}
function body(req){return new Promise((resolve,reject)=>{
  let s='',done=false;
  req.on('data',c=>{if(done)return;s+=c;if(s.length>MAX_BODY){done=true;reject(new Error('body_too_large'));req.destroy();}});
  req.on('end',()=>{if(done)return;try{resolve(JSON.parse(s||'{}'))}catch{reject(new Error('bad_json'))}});
  req.on('error',reject);
})}
function cleanName(v){return String(v||'АНОНИМ').replace(/[^A-Za-zА-Яа-яЁё0-9 _.-]/g,'').trim().slice(0,24)||'АНОНИМ'}
function validate(x){
  if(!x||typeof x!=='object')return 'BAD_BODY';
  const score=Number(x.score), t=Number(x.time), n=Number(x.night);
  const flags=Array.isArray(x.flags)?x.flags:[];
  const kind=String(x.kind||'');
  if(kind!=='score'&&kind!=='time')return 'BAD_KIND';
  if(!Number.isSafeInteger(score)||!Number.isFinite(t)||!Number.isInteger(n))return 'BAD_TYPES';
  if(score<0||score>MAX_SCORE||t<5||t>MAX_TIME||n<1||n>5)return 'BAD_RANGE';
  if(score>t*30+120)return 'IMPOSSIBLE_SCORE';
  if(flags.length)return 'CLIENT_FLAGS';
  if(x.completed!==true)return 'NOT_COMPLETED';
  if(String(x.gameVersion||'')!==GAME_VERSION)return 'BAD_VERSION';
  return null;
}
async function requirePlayer(x){
  const memberId=String(x.playerId||'');
  if(!/^\d+$/.test(memberId))throw new Error('BAD_PLAYER_ID');
  const verifiedPlayer=await resolvePlayer(String(x.sessionToken||''));
  if(verifiedPlayer!==memberId)throw new Error('PLAYER_MISMATCH');
  return memberId;
}
function challengeId(){return crypto.randomBytes(24).toString('base64url')}

async function llSubmit(board,memberId,score,metadata){
  const r=await fetch(`${LL}/leaderboards/${encodeURIComponent(board)}/submit`,{method:'POST',headers:{'Content-Type':'application/json','LL-Version':'2021-03-01','x-auth-token':await getServerToken()},body:JSON.stringify({member_id:memberId,score,metadata})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j.message||j.error||`LootLocker HTTP ${r.status}`);
  return j;
}

const server=http.createServer(async(req,res)=>{
  securityHeaders(res);
  if(req.method==='OPTIONS'){
    if(!originAllowed(req))return json(res,req,403,{error:'origin_denied'});
    cors(res,req);res.writeHead(204);return res.end();
  }
  if(req.method==='GET'&&req.url==='/health')return json(res,req,dbReady?200:503,{ok:dbReady,version:GAME_VERSION,secure:true,persistence:dbReady});
  if(req.method!=='POST'||(req.url!=='/api/submit'&&req.url!=='/api/start'&&req.url!=='/api/heartbeat'&&req.url!=='/api/finalize'))return json(res,req,404,{error:'not_found'});
  if(!originAllowed(req))return json(res,req,403,{accepted:false,error:'origin_denied'});
  if(!SERVER_KEY)return json(res,req,503,{accepted:false,error:'server_not_configured'});
  try{
    const x=await body(req);
    const memberId=await requirePlayer(x);
    if(blockedPlayers.has(memberId))return json(res,req,403,{accepted:false,error:'PLAYER_BLOCKED',suspicious:true});
    if(req.url==='/api/heartbeat'){
      const n=Number(x.night), seq=Number(x.seq), runSec=Number(x.runSec), score=Number(x.score), challenge=String(x.challenge||'');
      if(!Number.isInteger(n)||n<1||n>5||!Number.isInteger(seq)||seq<1||!Number.isFinite(runSec)||runSec<0||runSec>3600||!Number.isFinite(score)||score<0||score>MAX_SCORE||!/^[A-Za-z0-9_-]{32,64}$/.test(challenge))return json(res,req,400,{accepted:false,error:'BAD_HEARTBEAT'});
      const ar=activeRuns.get(memberId+':'+n);
      if(!ar||ar.challenge!==challenge)return json(res,req,403,{accepted:false,error:'INVALID_RUN',suspicious:true});
      const now=Date.now(), elapsed=(now-ar.at)/1000, key=memberId+':'+n;
      const integrityHash=String(x.integrityHash||'').slice(0,64);
      const saveIntegrity=String(x.saveIntegrity||'').slice(0,64);
      let st=runTelemetry.get(key);
      if(!st){st={at:now,seq:0,runSec:0,score:0,events:0,flags:0,ip:clientIp(req),integrityHash:'',saveIntegrity:'',lastSnapshot:null};runTelemetry.set(key,st)}
      let suspicious=false, reason='';
      const flags=Array.isArray(x.flags)?x.flags:[];
      if(seq<=st.seq)suspicious=true,reason='SEQ_ROLLBACK';
      if(runSec+2<st.runSec)suspicious=true,reason='TIME_ROLLBACK';
      if(score+5<st.score)suspicious=true,reason='SCORE_ROLLBACK';
      if(Math.abs(runSec-elapsed)>18)suspicious=true,reason='CLOCK_MISMATCH';
      if(score>elapsed*(11+n*2)+220)suspicious=true,reason='SCORE_RATE';
      if(integrityHash){if(!st.integrityHash)st.integrityHash=integrityHash;else if(st.integrityHash!==integrityHash)suspicious=true,reason='INTEGRITY_CHANGED';}
      if(saveIntegrity){if(!st.saveIntegrity)st.saveIntegrity=saveIntegrity;else if(st.saveIntegrity!==saveIntegrity)suspicious=true,reason='SAVE_INTEGRITY_CHANGED';}
      const snap=x.snapshot&&typeof x.snapshot==='object'?x.snapshot:{};
      const battery=Number(snap.battery),cam=Number(snap.cam);
      if(!Number.isFinite(battery)||battery<0||battery>100)suspicious=true,reason='BAD_BATTERY';
      if(!Number.isInteger(cam)||cam<0||cam>6)suspicious=true,reason='BAD_CAMERA';
      if(st.lastSnapshot){
        const prev=st.lastSnapshot;
        if(battery>Number(prev.battery)+8)suspicious=true,reason='BATTERY_INCREASE';
        if(elapsed>2 && score-Number(prev.score||0)>Math.max(80,elapsed-st.lastSnapshot.elapsed>0?(elapsed-st.lastSnapshot.elapsed)*60:80))suspicious=true,reason='SCORE_JUMP';
      }
      if(flags.length>0)suspicious=true,reason='CLIENT_TAMPER_FLAG';
      st.lastSnapshot={battery,cam,score,elapsed};
      if(suspicious){
        ar.suspicious=true;ar.reason=reason;await dbRisk(memberId,reason,n);st.flags++;st.at=now;st.seq=Math.max(st.seq,seq);st.runSec=Math.max(st.runSec,runSec);st.score=Math.max(st.score,score);ar.lastHeartbeat=now;ar.lastRunSec=Math.max(ar.lastRunSec||0,runSec);ar.lastScore=Math.max(ar.lastScore||0,score);ar.heartbeatCount=(ar.heartbeatCount||0)+1;ar.maxSeq=Math.max(ar.maxSeq||0,seq);ar.integrityHash=integrityHash||ar.integrityHash;ar.saveIntegrity=saveIntegrity||ar.saveIntegrity;ar.lastSnapshot={battery,cam,score,elapsed};await dbRunUpsert(memberId,n,ar);await dbEvent(memberId,n,reason,{seq,runSec,score,state:x.state||'',snapshot:snap});
        return json(res,req,200,{accepted:false,suspicious:true,tainted:true,error:reason});
      }
      st.at=now;st.seq=seq;st.runSec=Math.max(st.runSec,runSec);st.score=Math.max(st.score,score);st.events+=(String(x.event||'')?1:0);st.flags+=flags.length;
      ar.lastHeartbeat=now;ar.lastRunSec=Math.max(ar.lastRunSec||0,runSec);ar.lastScore=Math.max(ar.lastScore||0,score);ar.heartbeatCount=(ar.heartbeatCount||0)+1;ar.maxSeq=Math.max(ar.maxSeq||0,seq);ar.integrityHash=st.integrityHash;ar.saveIntegrity=st.saveIntegrity;ar.lastSnapshot=st.lastSnapshot;await dbRunUpsert(memberId,n,ar);
      return json(res,req,200,{accepted:true,suspicious:false,serverElapsed:elapsed});
    }
    if(req.url==='/api/start'){
      const n=Number(x.night);
      if(!Number.isInteger(n)||n<1||n>5)return json(res,req,400,{accepted:false,error:'BAD_NIGHT'});
      if(String(x.gameVersion||'')!==GAME_VERSION)return json(res,req,400,{accepted:false,error:'BAD_VERSION'});
      const now=Date.now(), key=memberId+':'+n;
      const active=activeRuns.get(key);
      if(active && now-active.at<8000)return json(res,req,429,{accepted:false,error:'RUN_ALREADY_ACTIVE'});
      const challenge=challengeId();
      const run={challenge,at:now,memberId,night:n,lastHeartbeat:now,heartbeatCount:0,maxSeq:0,lastRunSec:0,lastScore:0,suspicious:false,reason:'',integrityHash:'',saveIntegrity:'',lastSnapshot:null};
      activeRuns.set(key,run);
      await dbRunUpsert(memberId,n,run);
      return json(res,req,200,{accepted:true,challenge,serverTime:now,tainted:playerRisk.has(memberId)});
    }
    if(req.url==='/api/finalize'){
      const err=validate(x);if(err)return json(res,req,400,{accepted:false,error:err});
      const n=Number(x.night), challenge=String(x.challenge||''), finalTime=Number(x.time), finalScore=Number(x.score);
      if(!/^[A-Za-z0-9_-]{32,64}$/.test(challenge))return json(res,req,400,{accepted:false,error:'BAD_CHALLENGE'});
      const key=memberId+':'+n, ar=activeRuns.get(key), tele=runTelemetry.get(key), now=Date.now();
      if(!ar||ar.challenge!==challenge)return json(res,req,403,{accepted:false,suspicious:true,error:'INVALID_RUN'});
      if(playerRisk.has(memberId)){ar.suspicious=true;ar.reason='PLAYER_RISK';return json(res,req,200,{accepted:false,suspicious:true,tainted:true,error:'PLAYER_RISK'});}
      const elapsed=(now-ar.at)/1000;
      const hb=Number(ar.heartbeatCount||0);
      const expected=Math.max(1,Math.floor(Math.max(5,elapsed)/HEARTBEAT_MS*1000*MIN_HEARTBEAT_COVERAGE));
      const coverage=hb/expected;
      const lastGap=now-(ar.lastHeartbeat||ar.at);
      let reason='';
      if(ar.suspicious)reason=ar.reason||'RUN_TAINTED';
      else if(!tele||tele.flags>0)reason='TELEMETRY_TAMPER';
      else if((ar.heartbeatCount||0)<1)reason='NO_HEARTBEATS';
      else if(hb<expected)reason='HEARTBEAT_GAP';
      else if(lastGap>MAX_HEARTBEAT_GAP_MS)reason='HEARTBEAT_TIMEOUT';
      else if(Math.abs(finalTime-elapsed)>15)reason='FINAL_TIME_MISMATCH';
      else if(finalTime+2<ar.lastRunSec)reason='FINAL_TIME_ROLLBACK';
      else if(finalScore+5<(tele?.score||0))reason='FINAL_SCORE_ROLLBACK';
      else if(finalScore>elapsed*(11+n*2)+180)reason='FINAL_SCORE_RATE';
      if(reason){
        ar.suspicious=true;ar.reason=reason;await dbRisk(memberId,reason,n);await dbRunUpsert(memberId,n,ar);await dbEvent(memberId,n,reason,{coverage,finalTime,finalScore});await dbFinish(memberId,n,false,reason);
        return json(res,req,200,{accepted:false,suspicious:true,tainted:true,error:reason,coverage});
      }
      const guest=String(x.guestId||'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,80);
      const m=x.metadata&&typeof x.metadata==='object'?x.metadata:{};
      const runId=String(x.runId||'');
      if(!/^[A-Za-z0-9_-]{16,96}$/.test(runId))return json(res,req,400,{accepted:false,error:'BAD_RUN_ID'});
      const metadata=JSON.stringify({n:cleanName(m.n),a:Number(m.a)||0,s:Math.floor(finalScore),t:Math.floor(finalTime),ni:n,se:Number(m.se)||0,ru:Number(m.ru)||0,v:true,g:guest,run:runId,ts:now,sv:GAME_VERSION}).slice(0,900);
      const scoreOut=await llSubmit(SCORE_BOARD,memberId,Math.floor(finalScore),metadata);
      const timeOut=await llSubmit(TIME_BOARD,memberId,Math.floor(finalTime),metadata);
      await dbFinish(memberId,n,true,''); activeRuns.delete(key);runTelemetry.delete(key);
      return json(res,req,200,{accepted:true,verified:true,score:scoreOut.score??Math.floor(finalScore),time:timeOut.score??Math.floor(finalTime),coverage});
    }
    const err=validate(x);if(err)return json(res,req,400,{accepted:false,error:err});
    if(blockedPlayers.has(memberId))return json(res,req,403,{accepted:false,error:'PLAYER_BLOCKED',suspicious:true});
    const now=Date.now(), ip=clientIp(req), rateKey=memberId+':'+ip;
    const last=recent.get(rateKey)||0;
    if(now-last<MAX_RATE_MS)return json(res,req,429,{accepted:false,error:'RATE_LIMIT'});
    recent.set(rateKey,now);
    const runId=String(x.runId||'');
    if(!/^[A-Za-z0-9_-]{16,96}$/.test(runId))return json(res,req,400,{accepted:false,error:'BAD_RUN_ID'});
    const runKey=memberId+':'+runId;
    if(usedRuns.has(runKey))return json(res,req,409,{accepted:false,error:'REPLAY'});
    usedRuns.set(runKey,now);
    const guest=String(x.guestId||'').replace(/[^A-Za-z0-9_-]/g,'').slice(0,80);
    const m=x.metadata&&typeof x.metadata==='object'?x.metadata:{};
    const metadata=JSON.stringify({n:cleanName(m.n),a:Number(m.a)||0,s:Number(m.s)||0,t:Number(m.t)||0,ni:n,se:Number(m.se)||0,ru:Number(m.ru)||0,v:true,g:guest,run:runId,ts:now}).slice(0,900);
    const challenge=String(x.challenge||'');
    if(!/^[A-Za-z0-9_-]{32,64}$/.test(challenge))return json(res,req,400,{accepted:false,error:'BAD_CHALLENGE'});
    const runKey2=memberId+':'+Number(n);
    const activeRun=activeRuns.get(runKey2);
    const tele=runTelemetry.get(runKey2);
    if(tele&&tele.flags>0)return json(res,req,403,{accepted:false,error:'TELEMETRY_TAMPER',suspicious:true});
    if(!activeRun||activeRun.challenge!==challenge)return json(res,req,403,{accepted:false,error:'INVALID_RUN'});
    const serverElapsed=(Date.now()-activeRun.at)/1000;
    if(serverElapsed<Math.max(5,Number(x.time)-12))return json(res,req,400,{accepted:false,error:'TIME_MISMATCH'});
    if(Math.abs(Number(x.time)-serverElapsed)>15)return json(res,req,400,{accepted:false,error:'TIME_TAMPER'});
    // The game awards 11+n*2 points/sec. Keep a small safety margin for frame timing.
    const maxLegitRate=11+Number(n)*2;
    if(Number(x.score)>serverElapsed*maxLegitRate+180)return json(res,req,400,{accepted:false,error:'SCORE_TAMPER'});
    activeRuns.delete(runKey2);
    runTelemetry.delete(runKey2);
    const board=x.kind==='time'?TIME_BOARD:SCORE_BOARD;
    const out=await llSubmit(board,memberId,score,metadata);
    return json(res,req,200,{accepted:true,rank:out.rank??null,score:out.score??score});
  }catch(e){console.error(e);return json(res,req,502,{accepted:false,error:'upstream_error'});}
});
(async()=>{try{await dbInit();server.listen(PORT,'0.0.0.0',()=>console.log(`NS-05 V117.5 persistent secure gateway on :${PORT}`));}catch(e){console.error('Database initialization failed:',e);if(DB_REQUIRED)process.exit(1);server.listen(PORT,'0.0.0.0',()=>console.log(`NS-05 gateway on :${PORT} WITHOUT persistence`));}})();
