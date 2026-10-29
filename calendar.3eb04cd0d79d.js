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
  function renderToday(){
    var box=document.getElementById('hsTodayBookings');if(!box)return;
    var dateParts=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Johannesburg',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),p={};
    dateParts.forEach(function(v){p[v.type]=v.value;});
    var today=p.year+'-'+p.month+'-'+p.day;
    var visible=events.filter(function(e){return TimeTreeCalendar.visible(e,'Hi Service',S);});
    var view=TimeTreeCalendar.entries(visible,today,today);
    box.replaceChildren();
    if(view.errors.length){var warning=document.createElement('p');warning.textContent='Recurring calendar warning: '+view.errors.join('; ');box.append(warning);}
    if(!view.events.length){var msg=document.createElement('p');msg.textContent='No bookings shown for today. Open Calendar to see all appointments.';box.append(msg);return;}
    view.events.forEach(function(e){
      var row=document.createElement('div');row.className='hs-today-row';row.style.flexWrap='wrap';
      var time=document.createElement('b');
      time.textContent=e.source==='timetree'&&e.occurrenceStart?new Date(e.occurrenceStart).toLocaleTimeString('en-ZA',{timeZone:'Africa/Johannesburg',hour:'2-digit',minute:'2-digit'}):String(e.startTime||e.time||'').slice(0,5)||'Today';
      var name=document.createElement('span');name.textContent=String(e.title||e.customer||e.name||e.jobType||'Booking');
      var action=document.createElement('label');action.style.cssText='width:100%;display:flex;align-items:center;gap:8px;margin-left:8px;font-size:12px';
      var tick=document.createElement('input');tick.type='checkbox';
      var prior=e.completionByDate&&e.completionByDate[today];tick.checked=!!(prior&&prior.completed);
      var caption=document.createElement('span');caption.textContent=tick.checked?'Job completed':'Mark job completed';action.append(tick,caption);
      tick.addEventListener('change',function(){
        var done=tick.checked;tick.disabled=true;caption.textContent='Saving…';
        api({action:'calendarCompletionSet',company:'Hi Service',eventId:e.id,occurrenceDate:today,completed:done})
          .then(function(result){
            if(!result||result.ok===false)throw Error(result&&result.error||'Update failed');
            caption.textContent=done?'Job completed':'Mark job completed';
            if(!e.completionByDate)e.completionByDate={};
            e.completionByDate[today]={completed:done,completedBy:result.completedBy||S.username};
          }).catch(function(error){tick.checked=!done;caption.textContent='Could not save: '+String(error.message||error);})
          .finally(function(){tick.disabled=false;});
      });
      row.append(time,name,action);box.append(row);
    });
  }
  function status(j){return j.lastImportAt?'TimeTree updated '+new Date(j.lastImportAt).toLocaleString():'No TimeTree import yet.';}
  window.loadHiCalendar=async function(force){
    var who=owner();$('hiCalDetailCard').classList.add('hidden');
    if(!hiCan('calendar.view')){events=[];cache=null;generation++;return;}
    if(!cache||cache.owner!==who){cache=null;events=[];try{var saved=JSON.parse(sessionStorage.getItem(cacheKey()));if(saved&&Array.isArray(saved.events))cache={owner:who,events:saved.events,lastImportAt:saved.lastImportAt,at:0};}catch(e){}}
    if(cache){events=cache.events;render();renderToday();$('hiCalMsg').textContent=status(cache);}else{events=[];render();}
    if(force!==true&&cache&&Date.now()-cache.at<60000)return;
    if(inflight&&inflight.owner===who)return inflight.promise;
    var mine=++generation;$('hiCalMsg').textContent=cache?'Showing saved bookings · Updating…':'Loading bookings…';
    var request=(async function(){try{
      var j=await apiGet('hiCalendar');if(mine!==generation||who!==owner()||!hiCan('calendar.view'))return;
      if(!Array.isArray(j.events))throw Error('Invalid calendar response');
      cache={owner:who,events:j.events,lastImportAt:j.lastImportAt,at:Date.now()};events=j.events;
      try{sessionStorage.setItem(cacheKey(),JSON.stringify({events:j.events,lastImportAt:j.lastImportAt}));}catch(e){}
      render();renderToday();$('hiCalMsg').textContent=status(j);
    }catch(e){if(mine===generation&&who===owner())$('hiCalMsg').textContent=(cache?'Showing saved bookings · Update failed: ':'Calendar unavailable: ')+e.message;
    }finally{if(inflight&&inflight.promise===request)inflight=null;}})();
    inflight={owner:who,promise:request};return request;
  };
  $('hiCalPrev').onclick=()=>{month.setDate(1);month.setMonth(month.getMonth()-1);if(mode==='day')mode='agenda';render();};
  $('hiCalNext').onclick=()=>{month.setDate(1);month.setMonth(month.getMonth()+1);if(mode==='day')mode='agenda';render();};
  $('hiCalToday').onclick=()=>{month=new Date();day=month.toISOString().slice(0,10);if(mode==='day')mode='agenda';render();};$('hiCalRefresh').onclick=()=>loadHiCalendar(true);
  $('hiCalAgenda').onclick=()=>{mode='agenda';render();};$('hiCalMonth').onclick=()=>{mode='month';render();};
  $('hiCalClose').onclick=()=>$('hiCalDetailCard').classList.add('hidden');
  window.addEventListener('load',function(){if(S&&S.username&&hiCan('calendar.view'))loadHiCalendar();});
  var previousGoPage=window.goPage;
  window.goPage=function(id){previousGoPage(id);if(id==='home'&&S&&S.username&&hiCan('calendar.view'))loadHiCalendar();};
})();
