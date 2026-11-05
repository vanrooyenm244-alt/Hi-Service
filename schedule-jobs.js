(function(){
  'use strict';
  var page=document.getElementById('calendar');if(!page)return;
  var button=document.createElement('button');button.type='button';button.className='btn primary';button.id='hiScheduleNew';button.textContent='+ Schedule job';
  var notifyButton=document.createElement('button');notifyButton.type='button';notifyButton.className='btn';notifyButton.id='hiEnableNotifications';notifyButton.textContent='Enable notifications';
  var notifyStatus=document.createElement('span');notifyStatus.className='small';notifyStatus.id='hiNotificationStatus';notifyStatus.setAttribute('role','status');
  page.querySelector('.head').append(button,notifyButton,notifyStatus);
  var form=document.createElement('form');form.className='card hidden';form.id='hiScheduleForm';
  form.innerHTML='<h3>Schedule job</h3><div class="grid">'+
    '<label class="field">Customer<input name="customer" required maxlength="500"></label>'+
    '<label class="field">Site / address<input name="site" maxlength="500"></label>'+
    '<label class="field">Date<input name="date" type="date" required></label>'+
    '<div class="field"><label>Technicians</label><details id="hiTechPicker"><summary id="hiTechSummary">Choose technicians</summary><div id="hiTechOptions" style="display:grid;gap:8px;padding:10px 4px"></div></details><small class="small">Select each person assigned to this job.</small></div>'+
    '<label class="field">Start time<input name="startTime" type="time"></label>'+
    '<label class="field">End time<input name="endTime" type="time"></label>'+
    '<label class="field">Job number (optional)<input name="jobNo" maxlength="500"></label>'+
    '<label class="field">Job type<input name="jobType" maxlength="500"></label>'+
    '</div><label class="field">Notes<textarea name="notes" rows="4" maxlength="10000"></textarea></label>'+
    '<div class="toolbar"><button type="submit" class="btn primary">Save job</button><button type="button" class="btn" data-cancel>Cancel</button></div><p role="status" class="msg"></p>';
  page.querySelector('.card').after(form);
  var requestId=null,save=form.querySelector('[type=submit]'),msg=form.querySelector('[role=status]');
  function refreshTechSummary(){var picked=Array.from(form.querySelectorAll('#hiTechOptions input:checked')).map(function(x){return x.dataset.name;});$('hiTechSummary').textContent=picked.length?picked.join(', '):'Choose technicians';}
  async function loadTechs(){var options=$('hiTechOptions');options.textContent='Loading active technicians…';try{var result=await api({action:'hiCalendarTechnicians'});var users=Array.isArray(result.technicians)?result.technicians:[];var teams=[{company:'Hi Service',names:['Andre','Kai','Freddie','Allistair','Jeanie','Garth']},{company:'Flagship',names:['Michael','Jacobus','Frank','Ian','Sangwani']}];options.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:10px 4px';options.replaceChildren();teams.forEach(function(team){var section=document.createElement('section');section.style.cssText='min-width:0;border:1px solid #dfe6e2;border-radius:10px;padding:10px;background:#fff';var heading=document.createElement('h4');heading.textContent=team.company;heading.style.cssText='margin:0 0 8px;font-size:14px;color:#263b31';section.append(heading);team.names.forEach(function(displayName){var wanted=displayName.toLowerCase();if(wanted==='allistair')wanted='alistair';var person=users.find(function(p){var first=String(p.name||'').trim().split(/\\s+/)[0].toLowerCase();if(first==='allistair')first='alistair';return first===wanted;});var label=document.createElement('label');label.style.cssText='display:flex;align-items:center;gap:7px;width:100%;min-width:0;font-weight:500;font-size:14px;padding:4px 0;color:'+(person?'#33433b':'#929a95');var input=document.createElement('input');input.type='checkbox';input.style.cssText='width:18px;height:18px;flex:0 0 18px;padding:0;margin:0';input.value=person?person.username:'';input.disabled=!person;input.title=person?'':'No active calendar account';if(person){input.dataset.name=person.name;input.checked=(form.quoteJobLink&&form.quoteJobLink.booking&&form.quoteJobLink.booking.assignedUsernames||[]).some(function(id){return id.toLowerCase()===person.username.toLowerCase();});}var text=document.createElement('span');text.style.cssText='flex:1;min-width:0;text-align:left;overflow-wrap:anywhere';text.textContent=displayName;label.append(input,text);section.append(label);if(person)input.addEventListener('change',refreshTechSummary);});options.append(section);});refreshTechSummary();}catch(error){options.textContent='Could not load users: '+String(error.message||error);}}
  function updateNotifyStatus(){if(!('Notification' in window)){notifyButton.disabled=true;notifyStatus.textContent='This browser does not support notifications.';return;}var p=Notification.permission;notifyButton.textContent=p==='granted'?'Notifications enabled':p==='denied'?'Notifications blocked':'Enable notifications';notifyStatus.textContent=p==='granted'?'Appointment alerts are on.':p==='denied'?'Allow notifications in browser settings.':'Turn this on to receive job and appointment alerts.';}
  async function enableNotifications(){if(!('Notification' in window)){updateNotifyStatus();return;}try{var p=await Notification.requestPermission();updateNotifyStatus();if(p==='granted')pollNotifications();}catch(e){notifyStatus.textContent='Could not enable notifications.';}}
  function showNotification(n){if(Notification.permission!=='granted')return Promise.resolve(false);var options={body:n.body||'',tag:n.id,data:{url:location.origin+location.pathname+'#app-calendar'},icon:'./icon.svg',badge:'./icon.svg'};if('serviceWorker' in navigator)return navigator.serviceWorker.ready.then(function(reg){return reg.showNotification(n.title||'Appointment',options)}).then(function(){return true});new Notification(n.title||'Appointment',options);return Promise.resolve(true);}
  async function pollNotifications(){if(!S||!S.username||!('Notification' in window)||Notification.permission!=='granted'||!hiCan('calendar.view'))return;try{var result=await api({action:'hiCalendarNotifications'}),items=Array.isArray(result.notifications)?result.notifications:[];if(!items.length)return;var delivered=[];for(var i=0;i<items.length;i++)if(await showNotification(items[i]))delivered.push(items[i].id);if(delivered.length)await api({action:'hiCalendarNotificationsAck',notificationIds:delivered});}catch(e){}}
  notifyButton.addEventListener('click',enableNotifications);updateNotifyStatus();
  function permitted(){return S&&S.role!=='Worker'&&hiCan('calendar.edit');}
  function permissions(){button.classList.toggle('hidden',!permitted());if(!permitted())form.classList.add('hidden');}
  button.onclick=function(){if(!permitted())return;form.quoteJobLink=null;if(window.QuoteJobCalendar)QuoteJobCalendar.clear();['customer','site','jobNo','jobType'].forEach(function(k){form.elements[k].readOnly=false;});form.reset();requestId='hi-cal-'+Date.now()+'-'+Math.random().toString(36).slice(2,10);form.elements.date.value=new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Johannesburg',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());msg.textContent='';$('hiTechOptions').textContent='';$('hiTechSummary').textContent='Choose technicians';form.classList.remove('hidden');loadTechs();form.scrollIntoView({behavior:'smooth'});};
  window.hiOpenQuoteJob=function(job,booking){button.click();form.quoteJobLink={job:job,booking:booking};requestId=job.bookingId;var data={customer:job.customer,site:job.site,jobNo:job.jobNo,jobType:'Site Visit',notes:booking?booking.notes:job.notes};if(booking){data.date=booking.date;data.startTime=booking.startTime;data.endTime=booking.endTime;}Object.keys(data).forEach(function(k){form.elements[k].value=data[k]||'';});['customer','site','jobNo','jobType'].forEach(function(k){form.elements[k].readOnly=true;});};
  form.querySelector('[data-cancel]').onclick=function(){form.quoteJobLink=null;if(window.QuoteJobCalendar)QuoteJobCalendar.clear();form.classList.add('hidden');};
  form.onsubmit=async function(event){
    event.preventDefault();if(!permitted()||save.disabled)return;
    var data={id:requestId,company:'Hi Service'};new FormData(form).forEach(function(value,key){data[key]=String(value).trim();});
    if(form.quoteJobLink)data.jobListId=form.quoteJobLink.job.jobListId;
    var selected=Array.from(form.querySelectorAll('#hiTechOptions input:checked'));data.assignedUsernames=selected.map(function(x){return x.value;});data.technician=selected.map(function(x){return x.dataset.name;}).join(', ');
    if(!data.assignedUsernames.length){msg.textContent='Select at least one technician.';return;}
    if(data.endTime&&(!data.startTime||data.endTime<=data.startTime)){msg.textContent='End time must be after start time.';return;}
    save.disabled=true;msg.textContent='Saving job…';
    try{var result=await api({action:'hiScheduleJob',event:data});if(result.id!==requestId)throw Error('Booking was not acknowledged');form.classList.add('hidden');form.quoteJobLink=null;if(window.QuoteJobCalendar)QuoteJobCalendar.clear();await loadHiCalendar(true);document.getElementById('hiCalMsg').textContent='Job scheduled and synced.';if(window.loadHiToday)loadHiToday();}
    catch(error){msg.textContent='Could not sync: '+String(error.message||error)+'. Your entries remain here; retry Save job.';}
    finally{save.disabled=false;}
  };
  var oldPermissions=window.applyHiPermissions;if(typeof oldPermissions==='function')window.applyHiPermissions=function(){oldPermissions();permissions();};
  window.addEventListener('load',permissions);permissions();
  // Refresh visible calendars on the same cadence as the server backup.
  setInterval(function(){if(!document.hidden&&page.classList.contains('on')&&S&&S.username)loadHiCalendar(true);},300000);
  updateNotifyStatus();pollNotifications();setInterval(pollNotifications,30000);
})();

