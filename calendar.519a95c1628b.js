(function(){
  'use strict';
  var month=new Date(),events=[],generation=0,mode='agenda',day=null,cache=null,inflight=null;
  function owner(){return JSON.stringify([S.url,S.username,S.password]);}
  function cacheKey(){return 'hi-calendar:'+JSON.stringify([S.url,S.username]);}
  function render(){
    $('hiCalTitle').textContent=month.toLocaleString(undefined,{month:'long',year:'numeric'});
    var visible=events.filter(e=>TimeTreeCalendar.visible(e,'Hi Service',S));
    var view=TimeTreeCalendar.layout(visible,month,mode,'data-hi-event',day);
    if(mode==='day')$('hiCalTitle').textContent=new Date(day+'T12:00:00').toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'});
    $('hiCalGrid').innerHTML=view.html;
    $('hiCalGrid').querySelectorAll('[data-cal-day]').forEach(b=>b.onclick=()=>{day=b.dataset.calDay;mode='day';render();});
    $('hiCalAgenda').setAttribute('aria-pressed',String(mode==='agenda'));$('hiCalMonth').setAttribute('aria-pressed',String(mode==='month'));
    if(view.errors.length)$('hiCalMsg').textContent='Some repeating bookings need review: '+view.errors.join('; ');
    $('hiCalGrid').querySelectorAll('[data-hi-event]').forEach(b=>b.onclick=()=>{var e=events.find(e=>e.id===b.dataset.hiEvent);if(!e)return;$('hiCalDetails').textContent=TimeTreeCalendar.details(e);$('hiCalSource').href=e.sourceUrl;$('hiCalDetailCard').classList.remove('hidden');$('hiCalDetailCard').scrollIntoView({behavior:'smooth',block:'nearest'});});
  }
  function status(j){return j.lastImportAt?'TimeTree updated '+new Date(j.lastImportAt).toLocaleString():'No TimeTree import yet.';}
  window.loadHiCalendar=async function(force){
    var who=owner();$('hiCalDetailCard').classList.add('hidden');
    if(!hiCan('calendar.view')){events=[];cache=null;generation++;return;}
    if(!cache||cache.owner!==who){cache=null;events=[];try{var saved=JSON.parse(sessionStorage.getItem(cacheKey()));if(saved&&Array.isArray(saved.events))cache={owner:who,events:saved.events,lastImportAt:saved.lastImportAt,at:0};}catch(e){}}
    if(cache){events=cache.events;render();$('hiCalMsg').textContent=status(cache);}else{events=[];render();}
    if(force!==true&&cache&&Date.now()-cache.at<60000)return;
    if(inflight&&inflight.owner===who)return inflight.promise;
    var mine=++generation;$('hiCalMsg').textContent=cache?'Showing saved bookings · Updating…':'Loading bookings…';
    var request=(async function(){try{
      var j=await apiGet('hiCalendar');if(mine!==generation||who!==owner()||!hiCan('calendar.view'))return;
      if(!Array.isArray(j.events))throw Error('Invalid calendar response');
      cache={owner:who,events:j.events,lastImportAt:j.lastImportAt,at:Date.now()};events=j.events;
      try{sessionStorage.setItem(cacheKey(),JSON.stringify({events:j.events,lastImportAt:j.lastImportAt}));}catch(e){}
      render();$('hiCalMsg').textContent=status(j);
    }catch(e){if(mine===generation&&who===owner())$('hiCalMsg').textContent=(cache?'Showing saved bookings · Update failed: ':'Calendar unavailable: ')+e.message;
    }finally{if(inflight&&inflight.promise===request)inflight=null;}})();
    inflight={owner:who,promise:request};return request;
  };
  $('hiCalPrev').onclick=()=>{month.setDate(1);month.setMonth(month.getMonth()-1);if(mode==='day')mode='agenda';render();};
  $('hiCalNext').onclick=()=>{month.setDate(1);month.setMonth(month.getMonth()+1);if(mode==='day')mode='agenda';render();};
  $('hiCalToday').onclick=()=>{month=new Date();day=month.toISOString().slice(0,10);if(mode==='day')mode='agenda';render();};$('hiCalRefresh').onclick=()=>loadHiCalendar(true);
  $('hiCalAgenda').onclick=()=>{mode='agenda';render();};$('hiCalMonth').onclick=()=>{mode='month';render();};
  $('hiCalClose').onclick=()=>$('hiCalDetailCard').classList.add('hidden');
})();
