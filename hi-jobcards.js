(function(){
'use strict';
var selected=null,card=null;
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
 var customer=field(editor,'Client Name',e.customer),site=field(editor,'Client Address',e.site),
 contact=field(editor,'Contact Person',''),technician=field(editor,'Technician',e.technician),
 date=field(editor,'Job Date',e.date);
 el('h3',{text:'Materials Used'},editor);
 var items=el('div',{},editor);var add=el('button',{'type':'button','class':'btn',text:'+ Add Material'},editor);
 function materialRow(name,qty){var line=el('div',{'class':'line'},items);var a=el('input',{placeholder:'Stock code or item description'},line);a.value=name||'';var b=el('input',{type:'number',min:'0',step:'1',placeholder:'Qty'},line);b.value=qty||1;var remove=el('button',{'type':'button','class':'btn',text:'×'},line);remove.onclick=function(){line.remove();};}
 add.onclick=function(){materialRow('',1);};materialRow('',1);
 el('h3',{text:'Work Description'},editor);var description=el('textarea',{rows:'4',placeholder:'Describe work completed'},editor);description.style.width='100%';
 el('p',{'class':'msg',text:'Before/After photo upload is pending secure storage integration. Photos are not saved by this form yet.'},editor);
 var toolbar=el('div',{'class':'toolbar'},editor);
 var save=el('button',{'type':'button','class':'btn primary',text:'Save Draft'},toolbar);
 var submit=el('button',{'type':'button','class':'btn',text:'Submit Job Card'},toolbar);
 el('button',{'type':'button','class':'btn',text:'Close'},toolbar).onclick=function(){host.classList.add('hidden');};
 function collect(status){return {id:bookingId(e),number:bookingId(e),company:'Hi Service',sourceBookingId:e.id,customer:customer.value.trim(),site:site.value.trim(),contactPerson:contact.value.trim(),date:date.value.trim(),technicians:technician.value.trim(),types:['service'],sections:{service:{workDescription:description.value,materials:Array.from(items.children).map(function(row){return {name:row.children[0].value.trim(),quantity:Number(row.children[1].value)||0};}).filter(function(x){return x.name;})}},status:status};}
 function persist(status){if(!customer.value.trim()||!site.value.trim()||!date.value.trim()){msg.textContent='Client name, address and date are required.';return;}save.disabled=submit.disabled=true;msg.textContent='Saving Job Card…';api({action:'jobCardSave',jobCard:collect(status)}).then(function(r){if(!r||r.ok===false)throw Error(r&&r.error||'Save failed');msg.textContent=status==='SUBMITTED'?'Job Card submitted.':'Draft saved.';}).catch(function(err){msg.textContent='Could not save: '+String(err.message||err);}).finally(function(){save.disabled=submit.disabled=false;});}
 save.onclick=function(){persist('DRAFT');};submit.onclick=function(){persist('SUBMITTED');};
 apiGet('jobCards').then(function(result){var old=(result.jobCards||[]).find(function(x){return x.id===bookingId(e);});if(!old){msg.textContent='New Job Card — booking details prefilled.';return;}var j=old.data||{};card=j;customer.value=j.customer||e.customer;site.value=j.site||e.site;contact.value=j.contactPerson||'';technician.value=j.technicians||e.technician;date.value=j.date||e.date;description.value=j.sections&&j.sections.service&&j.sections.service.workDescription||'';items.replaceChildren();(j.sections&&j.sections.service&&j.sections.service.materials||[]).forEach(function(x){materialRow(x.name,x.quantity);});msg.textContent='Existing Job Card loaded: '+(j.status||'DRAFT');}).catch(function(err){msg.textContent='Cannot check existing Job Cards: '+String(err.message||err)+'; saving may not be available.';save.disabled=submit.disabled=true;});
 host.scrollIntoView({behavior:'smooth',block:'start'});
}
window.hiOpenJobCard=open;
function launchFromLink(){var p=new URLSearchParams(location.search),id=p.get('booking');if(p.get('source')!=='timetree'||!id)return;var tries=0;function retry(){if(!window.hiCalendarBookings||!window.hiCalendarBookings.length){if(++tries<10)setTimeout(retry,600);return;}var e=window.hiCalendarBookings.find(function(x){return x.id===id;});if(e){goPage('calendar');open(e);}}retry();}
window.addEventListener('load',launchFromLink);
})();
