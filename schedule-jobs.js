(function(){
  'use strict';
  var page=document.getElementById('calendar');if(!page)return;
  var button=document.createElement('button');button.type='button';button.className='btn primary';button.id='hiScheduleNew';button.textContent='+ Schedule job';
  page.querySelector('.head').append(button);
  var form=document.createElement('form');form.className='card hidden';form.id='hiScheduleForm';
  form.innerHTML='<h3>Schedule job</h3><div class="grid">'+
    '<label class="field">Customer<input name="customer" required maxlength="500"></label>'+
    '<label class="field">Site / address<input name="site" maxlength="500"></label>'+
    '<label class="field">Date<input name="date" type="date" required></label>'+
    '<label class="field">Technician<input name="technician" maxlength="500"></label>'+
    '<label class="field">Start time<input name="startTime" type="time"></label>'+
    '<label class="field">End time<input name="endTime" type="time"></label>'+
    '<label class="field">Job number (optional)<input name="jobNo" maxlength="500"></label>'+
    '<label class="field">Job type<input name="jobType" maxlength="500"></label>'+
    '</div><label class="field">Notes<textarea name="notes" rows="4" maxlength="10000"></textarea></label>'+
    '<div class="toolbar"><button type="submit" class="btn primary">Save job</button><button type="button" class="btn" data-cancel>Cancel</button></div><p role="status" class="msg"></p>';
  page.querySelector('.card').after(form);
  var requestId=null,save=form.querySelector('[type=submit]'),msg=form.querySelector('[role=status]');
  function permitted(){return S&&S.role!=='Worker'&&hiCan('calendar.edit');}
  function permissions(){button.classList.toggle('hidden',!permitted());if(!permitted())form.classList.add('hidden');}
  button.onclick=function(){if(!permitted())return;form.reset();requestId='hi-cal-'+Date.now()+'-'+Math.random().toString(36).slice(2,10);form.elements.date.value=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Johannesburg',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());msg.textContent='';form.classList.remove('hidden');form.scrollIntoView({behavior:'smooth'});};
  form.querySelector('[data-cancel]').onclick=function(){form.classList.add('hidden');};
  form.onsubmit=async function(event){
    event.preventDefault();if(!permitted()||save.disabled)return;
    var data={id:requestId,company:'Hi Service'};new FormData(form).forEach(function(value,key){data[key]=String(value).trim();});
    if(data.endTime&&(!data.startTime||data.endTime<=data.startTime)){msg.textContent='End time must be after start time.';return;}
    save.disabled=true;msg.textContent='Saving job…';
    try{var result=await api({action:'hiScheduleJob',event:data});if(result.id!==requestId)throw Error('Booking was not acknowledged');form.classList.add('hidden');await loadHiCalendar(true);document.getElementById('hiCalMsg').textContent='Job scheduled and synced.';if(window.loadHiToday)loadHiToday();}
    catch(error){msg.textContent='Could not sync: '+String(error.message||error)+'. Your entries remain here; retry Save job.';}
    finally{save.disabled=false;}
  };
  var oldPermissions=window.applyHiPermissions;if(typeof oldPermissions==='function')window.applyHiPermissions=function(){oldPermissions();permissions();};
  window.addEventListener('load',permissions);permissions();
  // Refresh visible calendars on the same cadence as the server backup.
  setInterval(function(){if(!document.hidden&&page.classList.contains('on')&&S&&S.username)loadHiCalendar(true);},300000);
})();
