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
function minutes(t){if(!/^\\d{2}:\\d{2}$/.test(t||''))return null;var parts=t.split(':').map(Number);return parts[0]<24&&parts[1]<60?parts[0]*60+parts[1]:null;}
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
 el('p',{'class':'msg',text:'Photo notes and source references are saved with the Job Card. Image files selected here are included in the PDF only during this session; TimeTree attachment download and permanent photo storage require a verified secure server endpoint.'},editor);
 function exportPdf(job){
   var w=window.open('','_blank');
   if(!w){msg.textContent='Enable pop-ups to print or save the Job Card as PDF.';return;}
   function escapeHtml(v){return String(v==null?'':v).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
   var svc=job.sections.service;
   var materialRows=(svc.materials||[]).map(function(x){return '<tr><td>'+escapeHtml(x.name)+'</td><td>'+escapeHtml(x.quantity)+'</td></tr>';}).join('');
   var pictures=['before','after'].map(function(k){return '<h2>'+ (k==='before'?'Before Photos':'After Photos') +'</h2><div class="photos">'+photos[k].map(function(p){return (p.dataUrl?'<figure><img alt="'+escapeHtml(p.name)+'" src="'+p.dataUrl+'"><figcaption>'+escapeHtml(p.note||'')+'</figcaption></figure>':'<p>Photo reference: '+escapeHtml(p.name)+' — '+escapeHtml(p.note||'')+'</p>');}).join('')+'</div>';}).join('');
   var html='<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Hi Service Gas Job Card</title><style>body{font:14px Arial,sans-serif;color:#17201b;padding:20px;max-width:850px;margin:auto}h1{color:#16723c}h2{font-size:16px;border-bottom:1px solid #ccc;padding-bottom:5px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px;text-align:left}.photos{display:flex;flex-wrap:wrap;gap:10px}.photos img{max-width:46%;max-height:300px;object-fit:contain;break-inside:avoid}p{white-space:pre-wrap}@page{size:A4;margin:14mm}</style></head><body>'+
   '<h1>HI SERVICE — GAS JOB CARD</h1><p><b>Job Card:</b> '+escapeHtml(job.number)+'</p><p><b>Client:</b> '+escapeHtml(job.customer)+'</p><p><b>Address:</b> '+escapeHtml(job.site)+'</p><p><b>Contact Person:</b> '+escapeHtml(job.contactPerson)+'</p><p><b>Contact Number:</b> '+escapeHtml(job.contactNumber)+'</p><p><b>Technician:</b> '+escapeHtml(job.technicians)+'</p><p><b>Date:</b> '+escapeHtml(job.date)+'</p>'+
   '<h2>Time on Site</h2><p>Arrived: '+escapeHtml(svc.timeArrived)+' | Departed: '+escapeHtml(svc.timeDeparted)+' | Break: '+escapeHtml(svc.breakMinutes)+' minutes | Total: '+escapeHtml(formatDuration(svc.totalMinutes))+'</p>'+
   '<h2>Work Requested</h2><p>'+escapeHtml(job.jobRequest)+'</p><h2>Work Completed</h2><p>'+escapeHtml(svc.workDescription)+'</p><h2>Materials Used</h2><table><tr><th>Item</th><th>Quantity</th></tr>'+materialRows+'</table>'+pictures+
   '<p style="font-size:11px;color:#777">Generated from Hi Service. Use Print / Save as PDF to share the document.</p></body></html>';
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
 apiGet('jobCards').then(function(result){var old=(result.jobCards||[]).find(function(x){return x.id===bookingId(e);});if(!old){msg.textContent='New Job Card — booking details prefilled.';return;}var j=old.data||{};card=j;customer.value=j.customer||e.customer;site.value=j.site||e.site;contact.value=j.contactPerson||info.contact;phone.value=j.contactNumber||info.phone;technician.value=j.technicians||e.technician;date.value=j.date||e.date;description.value=j.sections&&j.sections.service&&j.sections.service.workDescription||'';var service=j.sections&&j.sections.service||{};arrival.value=service.timeArrived||'';departure.value=service.timeDeparted||'';breakTime.value=service.breakMinutes==null?'0':String(service.breakMinutes);updateDuration();if(service.photoNotes){['before','after'].forEach(function(k){photos[k]=(service.photoNotes[k]||[]).map(function(p){return {name:p.name||'',note:p.note||'',source:p.source||'technician',dataUrl:null};});renderPhotoList(k,photoViews[k]);});}items.replaceChildren();(j.sections&&j.sections.service&&j.sections.service.materials||[]).forEach(function(x){materialRow(x.name,x.quantity);});msg.textContent='Existing Job Card loaded: '+(j.status||'DRAFT');}).catch(function(err){msg.textContent='Cannot check existing Job Cards: '+String(err.message||err)+'; saving may not be available.';save.disabled=submit.disabled=true;});
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
 apiGet('hiCalendar').then(function(r){
  var found=(r.events||[]).find(function(e){return e.id===lastSelectedId;});
  if(!found)throw Error('Booking not available');
  open(found);
 }).catch(function(err){alert('Cannot load booking: '+String(err.message||err));});
});
function launchFromLink(){var p=new URLSearchParams(location.search),id=p.get('booking');if(p.get('source')!=='timetree'||!id)return;var tries=0;function retry(){apiGet('hiCalendar').then(function(r){var e=(r.events||[]).find(function(x){return x.id===id;});if(e){goPage('calendar');open(e);}}).catch(function(){});}retry();}
window.addEventListener('load',launchFromLink);
})();
