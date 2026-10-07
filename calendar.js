(function(){
  'use strict';
  var month=new Date(),events=[],generation=0;
  function key(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
  function owner(){return JSON.stringify([S.url,S.username]);}
  function render(){
    $('hiCalTitle').textContent=month.toLocaleString(undefined,{month:'long',year:'numeric'});
    var first=new Date(month.getFullYear(),month.getMonth(),1),start=new Date(first);start.setDate(1-first.getDay());var end=new Date(start);end.setDate(end.getDate()+41);
    var view=TimeTreeCalendar.entries(events,key(start),key(end)),html='<div class="hiCalGrid">'+['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>'<b>'+d+'</b>').join('');
    for(var i=0;i<42;i++){var day=new Date(start);day.setDate(start.getDate()+i);var date=key(day);html+='<div class="hiCalDay"><b>'+day.getDate()+'</b>'+view.events.filter(e=>e.displayDate===date).map(e=>'<button type="button" data-hi-event="'+esc(e.id)+'"><small>'+esc(e.startTime||'All day')+'</small><br>'+esc(e.customer)+'<br><small>'+esc(e.technician)+'</small></button>').join('')+'</div>';}
    $('hiCalGrid').innerHTML=html+'</div>';
    if(view.errors.length)$('hiCalMsg').textContent='Some repeating bookings need review: '+view.errors.join('; ');
    $('hiCalGrid').querySelectorAll('[data-hi-event]').forEach(b=>b.onclick=()=>{var e=events.find(e=>e.id===b.dataset.hiEvent);$('hiCalDetails').textContent=TimeTreeCalendar.details(e);$('hiCalSource').href=e.sourceUrl;$('hiCalDetailCard').classList.remove('hidden');});
  }
  window.loadHiCalendar=async function(){
    var mine=++generation,who=owner();events=[];$('hiCalDetailCard').classList.add('hidden');render();
    if(!hiCan('calendar.view'))return;
    $('hiCalMsg').textContent='Loading TimeTree bookings…';
    try{
      var j=await apiGet('hiCalendar');if(mine!==generation||who!==owner())return;
      if(!Array.isArray(j.events))throw Error('Invalid calendar response');events=j.events;render();
      $('hiCalMsg').textContent=j.lastImportAt?'Last connector import: '+new Date(j.lastImportAt).toLocaleString():'Connector has not imported any bookings yet.';
    }catch(e){if(mine===generation&&who===owner())$('hiCalMsg').textContent='Calendar unavailable: '+e.message;}
  };
  $('hiCalPrev').onclick=()=>{month.setDate(1);month.setMonth(month.getMonth()-1);render();};
  $('hiCalNext').onclick=()=>{month.setDate(1);month.setMonth(month.getMonth()+1);render();};
  $('hiCalToday').onclick=()=>{month=new Date();render();};$('hiCalRefresh').onclick=loadHiCalendar;
  $('hiCalClose').onclick=()=>$('hiCalDetailCard').classList.add('hidden');
})();
