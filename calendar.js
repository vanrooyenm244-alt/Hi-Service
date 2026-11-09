(function(){
  'use strict';
  var month=new Date(),events=[],generation=0,mode='month',day=null,cache=null,inflight=null,searchCache=null,searchInflight=null;
  function owner(){return JSON.stringify([S.url,S.username,S.password]);}
  function requestWindow(){function key(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}var today=new Date(),from=new Date(month.getFullYear(),month.getMonth(),-6),to=new Date(month.getFullYear(),month.getMonth()+1,7);return {from:key(from),to:key(to)};}
  function cacheKey(){return 'hi-calendar:'+JSON.stringify([S.url,S.username]);}
  function showDetails(e){if(!e)return;if(window.AppCalendarTools){$('hiCalDetailCard').classList.add('hidden');return AppCalendarTools.open(e);}$('hiCalDetails').textContent=TimeTreeCalendar.details(e);$('hiCalSource').hidden=!e.sourceUrl;if(e.sourceUrl)$('hiCalSource').href=e.sourceUrl;$('hiCalDetailCard').classList.remove('hidden');$('hiCalDetailCard').scrollIntoView({behavior:'smooth',block:'nearest'});}
  function renderGlobalSearch(all,q){var grid=$('hiCalGrid'),visible=all.filter(e=>TimeTreeCalendar.visible(e,'Hi Service',S)).filter(e=>!q||[e.customer,e.title,e.name,e.site,e.address].filter(Boolean).join(' ').toLocaleLowerCase().indexOf(q)!==-1).sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));grid.replaceChildren();if(!visible.length){grid.textContent='No bookings match your search.';return;}var list=document.createElement('div');list.className='cal-agenda';visible.forEach(e=>{var row=document.createElement('div');row.className='cal-booking';var button=document.createElement('button');button.type='button';button.className='cal-event';button.setAttribute('data-hi-event',e.id);var date=document.createElement('small');date.textContent=[e.date,e.startTime||e.time].filter(Boolean).join(' · ');var name=document.createElement('strong');name.textContent=e.customer||e.title||e.name||e.jobType||'Booking';var address=document.createElement('small');address.textContent=[e.jobType,e.technician,e.site||e.address].filter(Boolean).join(' · ');button.append(date,name,address);button.addEventListener('click',()=>showDetails(e));row.appendChild(button);list.appendChild(row);});grid.appendChild(list);}
  function loadSearchAll(){var who=owner();if(searchCache&&searchCache.owner===who&&Date.now()-searchCache.at<120000)return Promise.resolve(searchCache.events);if(searchInflight&&searchInflight.owner===who)return searchInflight.promise;$('hiCalGrid').textContent='Searching all bookings…';var request=apiGet('hiCalendar',{}).then(j=>{if(owner()!==who||!hiCan('calendar.view'))return;if(!Array.isArray(j.events))throw Error('Invalid calendar response');searchCache={owner:who,events:j.events,at:Date.now()};if(String($('hiCalSearch').value||'').trim())render();else render();return j.events;}).catch(e=>{if(owner()===who&&String($('hiCalSearch').value||'').trim())$('hiCalGrid').textContent='Could not search all bookings: '+e.message;}).finally(()=>{if(searchInflight&&searchInflight.promise===request)searchInflight=null;});searchInflight={owner:who,promise:request};return request;}
  function render(){
    var query=String($('hiCalSearch').value||'').trim().toLocaleLowerCase();
    if(query){$('hiCalTitle').textContent='Search results';if(searchCache&&searchCache.owner===owner()&&Date.now()-searchCache.at<120000){renderGlobalSearch(searchCache.events,query);return;}loadSearchAll();return;}
    $('hiCalTitle').textContent=month.toLocaleString(undefined,{month:'long',year:'numeric'});
    var visible=events.filter(e=>TimeTreeCalendar.visible(e,'Hi Service',S));
    var view=TimeTreeCalendar.layout(visible,month,mode,'data-hi-event',day);
    if(mode==='day')$('hiCalTitle').textContent=new Date(day+'T12:00:00').toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long'});
    $('hiCalGrid').innerHTML=view.html;
    $('hiCalGrid').querySelectorAll('[data-cal-day]').forEach(b=>b.onclick=()=>{day=b.dataset.calDay;mode='day';render();});
    $('hiCalAgenda').setAttribute('aria-pressed',String(mode==='agenda'));$('hiCalMonth').setAttribute('aria-pressed',String(mode==='month'));
    if(view.errors.length)$('hiCalMsg').textContent='Some repeating bookings need review: '+view.errors.join('; ');
    $('hiCalGrid').querySelectorAll('[data-hi-event]').forEach(b=>b.onclick=()=>showDetails(events.find(e=>e.id===b.dataset.hiEvent)));
  }
  function renderToday(todayEvents){
    var box=document.getElementById('hsTodayBookings');if(!box)return;
    var dateParts=new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Johannesburg',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()),p={};
    dateParts.forEach(function(v){p[v.type]=v.value;});
    var today=p.year+'-'+p.month+'-'+p.day;
    var visible=(todayEvents||events).filter(function(e){return TimeTreeCalendar.visible(e,'Hi Service',S);});
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
  function status(j){return (j.googleCalendar?(j.googleCalendar.connected?'Google Calendar connected · mjflagship@gmail.com':'Google Calendar unavailable: '+j.googleCalendar.error):'Google Calendar backend update required')+(j.lastImportAt?' · TimeTree archive '+new Date(j.lastImportAt).toLocaleString():'')+(j.archiveWarning?' · '+j.archiveWarning:'');}
  window.loadHiCalendar=async function(force){
    var who=owner(),window=requestWindow(),rangeKey=window.from+'|'+window.to;$('hiCalDetailCard').classList.add('hidden');
    if(!hiCan('calendar.view')){events=[];cache=null;generation++;return;}
    if(!cache||cache.owner!==who){cache=null;events=[];try{var saved=JSON.parse(sessionStorage.getItem(cacheKey()));if(saved&&Array.isArray(saved.events))cache={owner:who,events:saved.events,lastImportAt:saved.lastImportAt,at:0};}catch(e){}}
    if(cache){events=cache.events;render();renderToday();$('hiCalMsg').textContent=status(cache);}else{events=[];render();}
    if(force!==true&&cache&&cache.rangeKey===rangeKey&&Date.now()-cache.at<60000)return;
    if(inflight&&inflight.owner===who&&inflight.rangeKey===rangeKey)return inflight.promise;
    var mine=++generation;$('hiCalMsg').textContent=cache?'Showing saved bookings · Updating…':'Loading bookings…';
    var request=(async function(){try{
      var j=await apiGet('hiCalendar',window);if(mine!==generation||who!==owner()||!hiCan('calendar.view'))return;
      if(!Array.isArray(j.events))throw Error('Invalid calendar response');
      cache={owner:who,rangeKey:rangeKey,events:j.events,lastImportAt:j.lastImportAt,at:Date.now()};events=j.events;
      try{sessionStorage.setItem(cacheKey(),JSON.stringify({events:j.events,lastImportAt:j.lastImportAt}));}catch(e){}
      render();renderToday();$('hiCalMsg').textContent=status(j);
    }catch(e){if(mine===generation&&who===owner())$('hiCalMsg').textContent=(cache?'Showing saved bookings · Update failed: ':'Calendar unavailable: ')+e.message;
    }finally{if(inflight&&inflight.promise===request)inflight=null;}})();
    inflight={owner:who,rangeKey:rangeKey,promise:request};return request;
  };
  var searchBox=$('hiCalSearch');if(searchBox&&typeof searchBox.addEventListener==='function')searchBox.addEventListener('input',render);
  $('hiCalPrev').onclick=()=>{month.setDate(1);month.setMonth(month.getMonth()-1);if(mode==='day')mode='month';loadHiCalendar();};
  $('hiCalNext').onclick=()=>{month.setDate(1);month.setMonth(month.getMonth()+1);if(mode==='day')mode='month';loadHiCalendar();};
  $('hiCalToday').onclick=()=>{month=new Date();day=month.toISOString().slice(0,10);if(mode==='day')mode='month';loadHiCalendar();};$('hiCalRefresh').onclick=()=>{searchCache=null;loadHiCalendar(true);};
  $('hiCalAgenda').onclick=()=>{mode='month';loadHiCalendar();};$('hiCalMonth').onclick=()=>{mode='month';render();};
  $('hiCalClose').onclick=()=>$('hiCalDetailCard').classList.add('hidden');
  window.addEventListener('load',function(){if(S&&S.username&&hiCan('calendar.view'))loadHiCalendar();});
  var todayRead=null,todayAt=0,todayOwner='';
  window.loadHiToday=function(){
    var who=owner();if(!hiCan('calendar.view'))return Promise.resolve();
    if(todayOwner===who&&Date.now()-todayAt<60000)return Promise.resolve();
    if(todayRead&&todayRead.owner===who)return todayRead.promise;
    var date=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Johannesburg',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
    var request=apiGet('hiCalendar',{from:date,to:date}).then(function(j){if(owner()!==who)return;renderToday(j.events||[]);todayOwner=who;todayAt=Date.now();}).catch(function(e){var box=$('hsTodayBookings');if(box&&owner()===who)box.textContent='Could not load today’s bookings: '+e.message;}).finally(function(){if(todayRead&&todayRead.promise===request)todayRead=null;});
    todayRead={owner:who,promise:request};return request;
  };
  var previousGoPage=window.goPage;
  window.goPage=function(id){previousGoPage(id);if(id==='home'&&S&&S.username&&hiCan('calendar.view'))loadHiToday();};
})();


