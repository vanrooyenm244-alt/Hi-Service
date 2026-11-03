(function(){
'use strict';
var selected=null,card=null;
// Jacobus' gas bookings may carry his technician label rather than a Hi Service label.
// This only changes the calendar presentation. The backend authorizes every save.
var originalVisibility=TimeTreeCalendar.visible;
TimeTreeCalendar.visible=function(e,company,user){
 if(originalVisibility(e,company,user))return true;
 if(company!=='Hi Service'||e.source!=='timetree'||String(e.status)==='ARCHIVED')return false;
 var label=TimeTreeCalendar.tagKey(e.jobType||'');
 if(label!=='jacobus'||!/(gas|regulator|lpg)/i.test([e.customer,e.notes].join(' ')))return false;
 if(!user||user.role==='Admin')return true;
 return [user.name,user.username].some(function(n){return /^jacobus(?:\s|$)/i.test(String(n||'').trim());});
};
function minutes(t){if(!/^[0-9]{2}:[0-9]{2}$/.test(t||''))return null;var parts=t.split(':').map(Number);return parts[0]<24&&parts[1]<60?parts[0]*60+parts[1]:null;}
function duration(start,end,breakMinutes){var a=minutes(start),b=minutes(end);if(a===null||b===null)return null;var total=b-a;if(total<0)total+=1440;return Math.max(0,total-(Number(breakMinutes)||0));}
function formatDuration(n){return n===null?'Not yet recorded':Math.floor(n/60)+'h '+String(n%60).padStart(2,'0')+'m';}
function el(tag,attrs,parent){var n=document.createElement(tag);Object.keys(attrs||{}).forEach(function(k){if(k==='text')n.textContent=attrs[k];else n.setAttribute(k,attrs[k]);});if(parent)parent.appendChild(n);return n;}
function field(box,label,value){var wrap=el('label',{'class':'field'},box);el('span',{text:label},wrap);var inp=el('input',{},wrap);inp.value=value||'';return inp;}
function bookingId(e){return 'hi:'+e.id;}
function open(e){
 if(!e||e.source!=='timetree'||!TimeTreeCalendar.visible(e,'Hi Service',S))return;
 selected=e;var host=document.getElementById('hiJobCardHost');if(!host)return;
 host.replaceChildren();host.classList.remove('hidden');
 el('h2',{text:'Hi Service Job Card'},host);
 var msg=el('p',{'class':'msg',role:'status',text:'Loading existing Job Card…'},host);
 var editor=el('div',{},host);
 var info=window.HiServiceBookingParse?HiServiceBookingParse.parse(e):{client:e.customer,address:e.site,contact:'',phone:'',workRequest:e.notes||''};
 var customer=field(editor,'Client Name',info.client),site=field(editor,'Client Address',info.address),
 contact=field(editor,'Contact Person',info.contact),phone=field(editor,'Contact Number',info.phone),technician=field(editor,'Technician',e.technician),
 date=field(editor,'Job Date',e.date);
 el('h3',{text:'Time on Site'},editor);
 var arrival=field(editor,'Time Arrived (HH:MM)',''),departure=field(editor,'Time Departed (HH:MM)',''),breakTime=field(editor,'Break (minutes)','0');
 arrival.type='time';departure.type='time';breakTime.type='number';breakTime.min='0';breakTime.step='1';
 var total=el('p',{'class':'msg',text:'Total Time on Site: Not yet recorded'},editor);
 function updateDuration(){total.textContent='Total Time on Site: '+formatDuration(duration(arrival.value,departure.value,breakTime.value));}
 [arrival,departure,breakTime].forEach(function(input){input.addEventListener('input',updateDuration);});
 el('h3',{text:'Materials Used'},editor);
 var items=el('div',{},editor);var add=el('button',{'type':'button','class':'btn',text:'+ Add Material'},editor);
 function materialRow(name,qty){var line=el('div',{'class':'line'},items);var a=el('input',{placeholder:'Stock code or item description'},line);a.value=name||'';var b=el('input',{type:'number',min:'0',step:'1',placeholder:'Qty'},line);b.value=qty||1;var remove=el('button',{'type':'button','class':'btn',text:'×'},line);remove.onclick=function(){line.remove();};}
 add.onclick=function(){materialRow('',1);};materialRow('',1);
 el('h3',{text:'Work Requested (from TimeTree)'},editor);var requested=el('textarea',{rows:'3',readonly:'readonly'},editor);requested.value=info.workRequest||'';requested.style.width='100%';
 el('h3',{text:'Work Completed'},editor);var description=el('textarea',{rows:'4',placeholder:'Describe work completed'},editor);description.style.width='100%';
 var photos={before:[],after:[]};
 function renderPhotoList(key,preview){
  preview.replaceChildren();
  photos[key].forEach(function(p,i){
   var wrap=el('div',{},preview);wrap.style.cssText='width:180px;display:flex;flex-direction:column;gap:6px';
   if(p.dataUrl){var img=el('img',{alt:p.name||'Job photo'},wrap);img.src=p.dataUrl;img.style.cssText='width:100%;height:135px;object-fit:contain;border:1px solid #ddd;border-radius:6px';}
   else el('span',{'class':'small',text:'Source photo reference — image not stored'},wrap);
   var note=el('textarea',{rows:'2',placeholder:'Photo Note (Optional)',maxlength:'500'},wrap);note.value=p.note||'';
   note.addEventListener('input',function(){p.note=note.value;});
   var move=el('button',{type:'button','class':'btn',text:key==='before'?'Move to After':'Move to Before'},wrap);
   move.onclick=function(){var other=key==='before'?'after':'before';photos[key].splice(i,1);photos[other].push(p);renderPhotoList(key,photoViews[key]);renderPhotoList(other,photoViews[other]);};
   var remove=el('button',{type:'button','class':'btn',text:'Remove Photo'},wrap);
   remove.onclick=function(){photos[key].splice(i,1);renderPhotoList(key,preview);};
  });
 }
 var photoViews={};
 function photoPicker(label,key){
  el('h3',{text:label},editor);
  var picker=el('input',{type:'file',accept:'image/*',multiple:'multiple'},editor);
  var preview=el('div',{'class':'toolbar'},editor);photoViews[key]=preview;
  picker.addEventListener('change',async function(){
   for(var file of Array.from(picker.files||[])){
    if(file.size>12*1024*1024){msg.textContent='Photo exceeds 12 MB: '+file.name;continue;}
    var url=await new Promise(function(resolve,reject){var rd=new FileReader();rd.onload=()=>resolve(rd.result);rd.onerror=reject;rd.readAsDataURL(file);});
    photos[key].push({name:file.name,dataUrl:url,note:'',source:'technician'});
   }
   renderPhotoList(key,preview);picker.value='';
  });
 }
 photoPicker('Before Photos','before');photoPicker('After Photos','after');

 function importTimeTreePhotos(refresh){
  if(e.source!=='timetree')return;
  var status=el('p',{'class':'msg',text:'Importing TimeTree booking photos…'},editor);
  apiGet('hiTimeTreePhotos',{bookingId:e.id,refresh:refresh===true}).then(function(result){
   if(!result||result.ok===false)throw Error(result&&result.error||'Import failed');
   (result.photos||[]).forEach(function(p){
    if(!p.dataUrl||!/^data:image\/(?:jpeg|png|webp);base64,/.test(p.dataUrl))return;
    var existing=photos.before.concat(photos.after).find(function(x){return x.name===p.name&&x.source==='timetree';});
    if(existing){existing.dataUrl=p.dataUrl;return;}
    photos.before.push({name:p.name||'TimeTree photo',dataUrl:p.dataUrl,note:'',source:'timetree'});
   });
   renderPhotoList('before',photoViews.before);renderPhotoList('after',photoViews.after);
   status.textContent=result.downloaded?'Imported '+result.downloaded+' TimeTree photo(s). Move individual photos to After if required.':(result.note||'No downloadable TimeTree photos found for this booking.');
  }).catch(function(err){status.textContent='TimeTree photo import unavailable: '+String(err.message||err);});
 }

 el('p',{'class':'msg',text:'Photo notes and source references are saved with the Job Card. Image files selected here are included in the PDF only during this session; TimeTree image import attempts to download source photos automatically; if the source is unavailable, add photos manually. Technician-selected photos are not permanently stored.'},editor);
 function exportPdf(job){
   var w=window.open('','_blank');
   if(!w){msg.textContent='Enable pop-ups to print or save the Job Card as PDF.';return;}
   function escapeHtml(v){return String(v==null?'':v).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
   var svc=job.sections.service;
   var materialRows=(svc.materials||[]).map(function(x){return '<tr><td>'+escapeHtml(x.name)+'</td><td>'+escapeHtml(x.quantity)+'</td></tr>';}).join('');
   var logo=((document.querySelector('.brandLogo')||{}).src)||'';
   var pictures=['before','after'].map(function(k){
     return '<section class="photoSection"><h2>'+(k==='before'?'Before Photos':'After Photos')+'</h2><div class="photos">'+
     (photos[k].length?photos[k].map(function(p){
       return p.dataUrl?'<figure><img alt="'+escapeHtml(p.name)+'" src="'+p.dataUrl+'"><figcaption>'+escapeHtml(p.note||'')+'</figcaption></figure>':
       '<div class="photoMissing">Image not available in this session<br>'+escapeHtml(p.name||'')+'<p>'+escapeHtml(p.note||'')+'</p></div>';
     }).join(''):'<p class="muted">No photos attached</p>')+'</div></section>';
   }).join('');
   var html='<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Hi Service Job Card - '+escapeHtml(job.number)+'</title>'+
   '<style>@page{size:A4;margin:14mm}*{box-sizing:border-box}body{font:12px Arial,Helvetica,sans-serif;color:#17251c;background:white;margin:0;line-height:1.5}.header{display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:4px solid #198448;padding:0 0 16px;margin-bottom:18px}.logo{width:240px;max-height:100px;object-fit:contain;object-position:left}.heading{text-align:right}.heading h1{font-size:25px;letter-spacing:1.5px;color:#156d3f;margin:0}.muted{color:#69736b}.tiny{font-size:10px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px 20px}.card{background:#f5f8f6;border:1px solid #dce8df;border-radius:7px;padding:12px;margin-bottom:15px}.label{font-size:9px;text-transform:uppercase;letter-spacing:.8px;color:#54705b;font-weight:bold}.value{font-size:12px;white-space:pre-wrap}.section{margin-top:16px}h2{font-size:13px;color:#176b3e;border-bottom:2px solid #dce8df;padding-bottom:6px;letter-spacing:.5px;text-transform:uppercase}table{width:100%;border-collapse:collapse}th{background:#eaf5ed;color:#175635}td,th{border:1px solid #dce8df;text-align:left;padding:9px}.photos{display:flex;gap:12px;flex-wrap:wrap}figure{width:47%;margin:0;break-inside:avoid;border:1px solid #e0e8e0;padding:8px;border-radius:7px}figure img{width:100%;max-height:260px;object-fit:contain}figcaption{font-size:11px;white-space:pre-wrap;padding-top:6px}.photoMissing{padding:12px;background:#fafafa;border:1px solid #ddd}.footer{border-top:1px solid #dce8df;margin-top:28px;padding-top:10px;color:#637568;font-size:10px;display:flex;justify-content:space-between}section{break-inside:auto}@media print{.card{print-color-adjust:exact;-webkit-print-color-adjust:exact}th{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head><body>'+
   '<header class="header">'+(logo?'<img class="logo" src="'+logo+'" alt="Hi Service logo">':'<strong>HI SERVICE</strong>')+
   '<div class="heading"><h1>JOB CARD</h1><div class="muted">GAS SERVICE & MAINTENANCE</div><div class="tiny">'+escapeHtml(job.number)+'</div></div></header>'+
   '<div class="card grid"><div><div class="label">Client</div><div class="value">'+escapeHtml(job.customer)+'</div></div><div><div class="label">Job Date</div><div class="value">'+escapeHtml(job.date)+'</div></div>'+
   '<div><div class="label">Site Address</div><div class="value">'+escapeHtml(job.site)+'</div></div><div><div class="label">Technician</div><div class="value">'+escapeHtml(job.technicians)+'</div></div>'+
   '<div><div class="label">Contact Person</div><div class="value">'+escapeHtml(job.contactPerson)+'</div></div><div><div class="label">Contact Number</div><div class="value">'+escapeHtml(job.contactNumber)+'</div></div></div>'+
   '<section class="section"><h2>Time on Site</h2><div class="card grid"><div><div class="label">Arrival</div>'+escapeHtml(svc.timeArrived)+'</div><div><div class="label">Departure</div>'+escapeHtml(svc.timeDeparted)+'</div><div><div class="label">Break</div>'+escapeHtml(svc.breakMinutes)+' minutes</div><div><div class="label">Total Time</div><strong>'+escapeHtml(formatDuration(svc.totalMinutes))+'</strong></div></div></section>'+
   '<section class="section"><h2>Work Requested</h2><p class="value">'+escapeHtml(job.jobRequest||'Not specified')+'</p></section>'+
   '<section class="section"><h2>Work Completed</h2><p class="value">'+escapeHtml(svc.workDescription||'Not specified')+'</p></section>'+
   '<section class="section"><h2>Materials Used</h2><table><thead><tr><th>Material / Description</th><th>Quantity</th></tr></thead><tbody>'+((svc.materials||[]).map(function(x){return '<tr><td>'+escapeHtml(x.name)+'</td><td>'+escapeHtml(x.quantity)+'</td></tr>';}).join('')||'<tr><td colspan="2">No materials recorded</td></tr>')+'</tbody></table></section>'+pictures+
   '<footer class="footer"><span>HI SERVICE SOLUTIONS</span><span>Job Card '+escapeHtml(job.number)+' — '+escapeHtml(new Date().toLocaleDateString('en-ZA'))+'</span></footer></body></html>';
   w.document.open();w.document.write(html);w.document.close();
   w.addEventListener('load',function(){setTimeout(function(){w.focus();w.print();},400);});
 }
 var toolbar=el('div',{'class':'toolbar'},editor);
 var pdf=el('button',{'type':'button','class':'btn',text:'Print / Save PDF'},editor);pdf.onclick=function(){exportPdf(collect('SUBMITTED'));};
 var save=el('button',{'type':'button','class':'btn primary',text:'Save Draft'},toolbar);
 var submit=el('button',{'type':'button','class':'btn',text:'Submit Job Card'},toolbar);
 el('button',{'type':'button','class':'btn',text:'Close'},toolbar).onclick=function(){host.classList.add('hidden');};
 function collect(status){return {id:bookingId(e),number:bookingId(e),company:'Hi Service',sourceBookingId:e.id,customer:customer.value.trim(),site:site.value.trim(),contactPerson:contact.value.trim(),contactNumber:phone.value.trim(),jobRequest:requested.value,sourceNotes:e.notes||'',date:date.value.trim(),technicians:technician.value.trim(),types:['service'],sections:{service:{workDescription:description.value,timeArrived:arrival.value,timeDeparted:departure.value,breakMinutes:Number(breakTime.value)||0,totalMinutes:duration(arrival.value,departure.value,breakTime.value),photoNotes:{before:photos.before.map(function(p){return {name:p.name||'',note:p.note||'',source:p.source||'technician'};}),after:photos.after.map(function(p){return {name:p.name||'',note:p.note||'',source:p.source||'technician'};})},materials:Array.from(items.children).map(function(row){return {name:row.children[0].value.trim(),quantity:Number(row.children[1].value)||0};}).filter(function(x){return x.name;})}},status:status};}
 function persist(status){if(status==='SUBMITTED'&&duration(arrival.value,departure.value,breakTime.value)===null){msg.textContent='Enter Time Arrived and Time Departed before submitting.';return;}if(!customer.value.trim()||!site.value.trim()||!date.value.trim()){msg.textContent='Client name, address and date are required.';return;}save.disabled=submit.disabled=true;msg.textContent='Saving Job Card…';api({action:'jobCardSave',jobCard:collect(status)}).then(function(r){if(!r||r.ok===false)throw Error(r&&r.error||'Save failed');msg.textContent=status==='SUBMITTED'?'Job Card submitted.':'Draft saved.';if(status==='SUBMITTED')exportPdf(collect(status));}).catch(function(err){msg.textContent='Could not save: '+String(err.message||err);}).finally(function(){save.disabled=submit.disabled=false;});}
 save.onclick=function(){persist('DRAFT');};submit.onclick=function(){persist('SUBMITTED');};
 apiGet('jobCards',{id:bookingId(e)}).then(function(result){var old=(result.jobCards||[]).find(function(x){return x.id===bookingId(e);});if(!old){msg.textContent='New Job Card — booking details prefilled.';importTimeTreePhotos();return;}var j=old.data||{};card=j;customer.value=j.customer||e.customer;site.value=j.site||e.site;contact.value=j.contactPerson||info.contact;phone.value=j.contactNumber||info.phone;technician.value=j.technicians||e.technician;date.value=j.date||e.date;description.value=j.sections&&j.sections.service&&j.sections.service.workDescription||'';var service=j.sections&&j.sections.service||{};arrival.value=service.timeArrived||'';departure.value=service.timeDeparted||'';breakTime.value=service.breakMinutes==null?'0':String(service.breakMinutes);updateDuration();if(service.photoNotes){['before','after'].forEach(function(k){photos[k]=(service.photoNotes[k]||[]).map(function(p){return {name:p.name||'',note:p.note||'',source:p.source||'technician',dataUrl:null};});renderPhotoList(k,photoViews[k]);});}items.replaceChildren();(j.sections&&j.sections.service&&j.sections.service.materials||[]).forEach(function(x){materialRow(x.name,x.quantity);});msg.textContent='Existing Job Card loaded: '+(j.status||'DRAFT');importTimeTreePhotos();}).catch(function(err){msg.textContent='Cannot check existing Job Cards: '+String(err.message||err)+'; saving may not be available.';save.disabled=submit.disabled=true;});
 host.scrollIntoView({behavior:'smooth',block:'start'});
}
window.hiOpenJobCard=open;
var lastSelectedId='';
document.addEventListener('click',function(event){
 var bookingButton=event.target.closest&&event.target.closest('[data-hi-event]');
 if(bookingButton)lastSelectedId=bookingButton.getAttribute('data-hi-event')||'';
});
var jobButton=document.getElementById('hiCalJobCard');
if(jobButton)jobButton.addEventListener('click',function(){
 if(!lastSelectedId)return;
 apiGet('hiCalendar',{bookingId:lastSelectedId}).then(function(r){
  var found=(r.events||[]).find(function(e){return e.id===lastSelectedId;});
  if(!found)throw Error('Booking not available');
  open(found);
 }).catch(function(err){alert('Cannot load booking: '+String(err.message||err));});
});
function launchFromLink(){var p=new URLSearchParams(location.search),id=p.get('booking');if(p.get('source')!=='timetree'||!id)return;var tries=0;function retry(){apiGet('hiCalendar',{bookingId:id}).then(function(r){var e=(r.events||[]).find(function(x){return x.id===id;});if(e){goPage('calendar');open(e);}}).catch(function(){});}retry();}
window.addEventListener('load',launchFromLink);
})();


