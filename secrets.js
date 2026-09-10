/* NS-05 V117 — lightweight secret discovery system. */
window.SecretSystem=(()=>{
 const defs=[
  {id:'red_signal',name:'КРАСНЫЙ СИГНАЛ',desc:'Увидеть редкий сигнал наблюдения.'},
  {id:'silent_watch',name:'ТИХИЙ НАБЛЮДАТЕЛЬ',desc:'Пережить момент наблюдения без паники.'},
  {id:'last_battery',name:'ПОСЛЕДНИЕ ПРОЦЕНТЫ',desc:'Дожить до конца смены на почти пустом аккумуляторе.'},
  {id:'five_shifts',name:'ПЯТЬ ПОСТОВ',desc:'Завершить все пять смен.'},
  {id:'archive_complete',name:'ЗАКРЫТЫЙ АРХИВ',desc:'Открыть все доступные записи.'}
 ];
 function data(){const d=window.SaveSystem.data;if(!Array.isArray(d.secrets))d.secrets=[];return d}
 function unlock(id){const d=data();if(!defs.some(x=>x.id===id)||d.secrets.includes(id))return false;d.secrets.push(id);window.SaveSystem.save();try{window.AudioFX?.play('click',.25,{group:'ui'})}catch(e){}return true}
 function event(name,payload){
  const d=data();
  if(name==='camera_scare')unlock('red_signal');
  if(name==='watcher'&&Number(payload?.fear||0)<70)unlock('silent_watch');
  if(name==='win'&&Number(payload?.battery||100)<=8)unlock('last_battery');
  if(name==='win'&&Number(payload?.night||0)>=5)unlock('five_shifts');
  if(name==='archive'&&Number(payload?.count||0)>=3)unlock('archive_complete');
  return d.secrets.length;
 }
 return {defs,event,unlock,count:()=>data().secrets.length,has:id=>data().secrets.includes(id)};
})();
