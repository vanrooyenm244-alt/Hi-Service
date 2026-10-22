(function(){
'use strict';
var screen=document.getElementById('settings');if(!screen)return;
var panel=document.createElement('div');panel.className='card';
panel.innerHTML='<div class="head"><h2>App Updates</h2></div><button type="button" class="btn" id="hiUpdatesToggle" style="width:100%;margin-top:10px">Version history & Test Checklist ▾</button><div id="hiUpdatesBody" class="hidden" style="margin-top:14px"><div id="hiInstalledVersion" class="small">Checking installed version…</div><div class="toolbar"><button class="btn primary" id="hiCheckUpdate" type="button">Check for updates</button></div><div class="msg" id="hiUpdateMessage"></div><h3>Wat het verander?</h3><div id="hiReleaseChanges">Loading…</div><h3>Wat moet ek toets?</h3><div id="hiReleaseTests">Loading…</div><button type="button" class="btn" id="hiResetTests">Reset toetslys</button></div>';
screen.appendChild(panel);
var body=panel.querySelector('#hiUpdatesBody'),status=panel.querySelector('#hiUpdateMessage'),label=panel.querySelector('#hiInstalledVersion');
panel.querySelector('#hiUpdatesToggle').onclick=function(){body.classList.toggle('hidden');if(!body.classList.contains('hidden')){showInstalled();loadNotes();}};
function currentCache(){return caches.keys().then(function(keys){return keys.filter(function(k){return /^hi-service-/.test(k);}).join(', ')||'Not cached';});}
function showInstalled(){if(!('caches' in window)){label.textContent='Offline cache not supported';return;}currentCache().then(function(v){label.textContent='Installed cached release: '+v;}).catch(function(e){label.textContent='Cache check failed: '+e.message;});}
function renderNotes(d){
var changed=panel.querySelector('#hiReleaseChanges'),tests=panel.querySelector('#hiReleaseTests');changed.replaceChildren();tests.replaceChildren();
if(!Array.isArray(d.changes)||!Array.isArray(d.tests))throw Error('Invalid release notes.');
var version=document.createElement('p');version.textContent=(d.version||'')+' · '+(d.date||'');changed.appendChild(version);
var ul=document.createElement('ul');d.changes.forEach(function(x){var li=document.createElement('li');li.textContent=x;ul.appendChild(li);});changed.appendChild(ul);
d.tests.forEach(function(x,i){var row=document.createElement('label');row.style.cssText='display:flex;gap:9px;align-items:flex-start;margin:10px 0';var input=document.createElement('input');input.type='checkbox';var key='hi-test-'+d.version+'-'+i;try{input.checked=localStorage.getItem(key)==='yes';}catch(e){}input.onchange=function(){try{localStorage.setItem(key,input.checked?'yes':'no');}catch(e){}};var title=document.createElement('span');title.textContent=x;row.append(input,title);tests.appendChild(row);});
panel.querySelector('#hiResetTests').onclick=function(){tests.querySelectorAll('input').forEach(function(x){x.checked=false;x.onchange();});};
}
function loadNotes(){fetch('./release-notes.json?t='+Date.now(),{cache:'no-store'}).then(function(r){if(!r.ok)throw Error('HTTP '+r.status);return r.json();}).then(renderNotes).catch(function(e){panel.querySelector('#hiReleaseChanges').textContent='Release notes unavailable: '+e.message;panel.querySelector('#hiReleaseTests').textContent='Test list unavailable.';});}
panel.querySelector('#hiCheckUpdate').onclick=async function(){
var btn=this;btn.disabled=true;status.textContent='Checking for updates…';
try{var res=await fetch('./sw.js?t='+Date.now(),{cache:'no-store'});if(!res.ok)throw Error('HTTP '+res.status);var m=(await res.text()).match(/const CACHE\s*=\s*['"]([^'"]+)/);if(!m)throw Error('Published version unavailable');var latest=m[1];var registration=await navigator.serviceWorker.getRegistration();if(registration)await registration.update();var current=await currentCache();showInstalled();status.textContent=current.includes(latest)?'Latest version cached: '+latest+'. Close and reopen if you still see old screens.':'Latest published: '+latest+'. Local cache: '+current+'. Save work, close and reopen to finish updating.';loadNotes();}catch(e){status.textContent='Update check failed: '+e.message;}finally{btn.disabled=false;}
};
})();