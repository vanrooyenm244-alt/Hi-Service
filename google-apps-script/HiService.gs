/**
 * Hi Service stock + timesheets module for the SAME Apps Script project used by Flagship.
 * Add this file to that Apps Script project, then add the two router calls shown in README.
 */
var HI_STOCK_SHEET='HiService_Stock';
var HI_COUNT_SHEET='HiService_Stock_Counts';
var HI_MOVE_SHEET='HiService_Stock_Movements';
var HI_TIME_SHEET='Timesheets';
var HI_PLACES=['Stoor','CEY 59799','CEY 67212'];
var HI_STOCK_HEAD=['Code','Description','Category','Supplier','Unit','Cost','Stoor','CEY 59799','CEY 67212','Total Stock','Active','Updated','By'];

function setupHiService(){
  var ss=SpreadsheetApp.getActiveSpreadsheet();
  hiSheet_(ss,HI_STOCK_SHEET,HI_STOCK_HEAD);
  hiSheet_(ss,HI_COUNT_SHEET,['Timestamp','User','Location','Code','Description','Count']);
  hiSheet_(ss,HI_MOVE_SHEET,['Timestamp','User','Type','From','To','Code','Description','Qty','Reason','Reference']);
  hiTotals_();
  return 'Hi Service sheets ready';
}
function hiSheet_(ss,name,head){
  var sh=ss.getSheetByName(name)||ss.insertSheet(name);
  if(sh.getLastRow()<1)sh.getRange(1,1,1,head.length).setValues([head]).setFontWeight('bold').setBackground('#159447').setFontColor('#ffffff');
  sh.setFrozenRows(1);return sh;
}
function hiStockRows_(){
  var sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HI_STOCK_SHEET);if(!sh)return[];
  var n=sh.getLastRow()-1;if(n<1)return[];
  return sh.getRange(2,1,n,HI_STOCK_HEAD.length).getValues().map(function(r,i){
    return {row:i+2,code:String(r[0]||''),item:String(r[1]||''),description:String(r[1]||''),category:String(r[2]||''),supplier:String(r[3]||''),unit:String(r[4]||'each'),cost:Number(r[5])||0,'Stoor':Number(r[6])||0,'CEY 59799':Number(r[7])||0,'CEY 67212':Number(r[8])||0,total:Number(r[9])||0,active:String(r[10]||'Yes').toLowerCase()!=='no'};
  }).filter(function(x){return x.item&&x.active;});
}
function hiTotals_(){
  var sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HI_STOCK_SHEET);if(!sh)return;
  var n=sh.getLastRow()-1;if(n<1)return;var f=[];for(var i=0;i<n;i++)f.push(['=SUM(G'+(i+2)+':I'+(i+2)+')']);sh.getRange(2,10,n,1).setFormulas(f);
}
function hiFind_(codeOrName){
  var q=String(codeOrName||'').toLowerCase();return hiStockRows_().filter(function(x){return x.code.toLowerCase()===q||x.item.toLowerCase()===q;})[0]||null;
}
function hiSetQty_(row,place,qty,user){
  var idx=HI_PLACES.indexOf(place);if(idx<0)throw new Error('Unknown Hi Service location');
  var sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HI_STOCK_SHEET);
  sh.getRange(row,7+idx).setValue(Number(qty));sh.getRange(row,12).setValue(new Date());sh.getRange(row,13).setValue(user.username||user.name||'user');
}
function hiAdd_(u,it){
  var code=String(it.code||'').trim(),name=String(it.item||it.description||'').trim();if(!name)throw new Error('Description required');
  if((code&&hiFind_(code))||hiFind_(name))throw new Error('Item already exists');
  if(!code)code='HS-'+Utilities.getUuid().slice(0,8).toUpperCase();
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HI_STOCK_SHEET).appendRow([code,name,it.category||'Other',it.supplier||'',it.unit||'each',Number(it.cost)||0,0,0,0,'','Yes',new Date(),u.username||'']);
  hiTotals_();return {code:code,item:name};
}
function hiCount_(u,place,counts){
  if(HI_PLACES.indexOf(place)<0)throw new Error('Unknown location');var changed=0,unknown=[];
  Object.keys(counts||{}).forEach(function(key){var it=hiFind_(key),q=Number(counts[key]);if(!it){unknown.push(key);return;}if(isNaN(q)||q<0)return;hiSetQty_(it.row,place,q,u);SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HI_COUNT_SHEET).appendRow([new Date(),u.username||'',place,it.code,it.item,q]);changed++;});
  hiTotals_();return {changed:changed,unknown:unknown};
}
function hiMove_(u,from,to,lines,type,reason,ref){
  if(from&&HI_PLACES.indexOf(from)<0)throw new Error('Unknown source');if(to&&HI_PLACES.indexOf(to)<0)throw new Error('Unknown destination');var done=0;
  (lines||[]).forEach(function(l){var it=hiFind_(l.code||l.item),q=Number(l.qty);if(!it||!q||(type!=='adjust'&&q<0))return;
    if(type==='transfer'){if(it[from]<q)throw new Error(it.item+' only has '+it[from]+' in '+from);hiSetQty_(it.row,from,it[from]-q,u);hiSetQty_(it.row,to,it[to]+q,u);}
    else if(type==='receive'){hiSetQty_(it.row,to,it[to]+q,u);}
    else if(type==='adjust'){var next=it[from]+q;if(next<0)throw new Error(it.item+' would become negative');hiSetQty_(it.row,from,next,u);}
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HI_MOVE_SHEET).appendRow([new Date(),u.username||'',type,from||'',to||'',it.code,it.item,q,reason||'',ref||'']);done++;
  });hiTotals_();return {changed:done};
}
function hiTime_(u,row){
  var ss=SpreadsheetApp.getActiveSpreadsheet(),sh=ss.getSheetByName('Timesheets');
  if(!sh)throw new Error('Timesheets sheet not found');
  var tz=ss.getSpreadsheetTimeZone()||Session.getScriptTimeZone(), today=Utilities.formatDate(new Date(),tz,'yyyy-MM-dd');
  var d=String(row.date||'').trim(); if(!d)throw new Error('Date required');
  var role=String(u.role||'').toLowerCase();
  if(d!==today && role!=='admin')throw new Error('Timesheets may only be submitted for today');
  function mins_(v){var p=String(v||'').split(':');return Number(p[0])*60+Number(p[1]);}
  var ti=mins_(row.timeIn),to=mins_(row.timeOut),lunch=Math.max(0,Number(row.lunch)||0);
  if(!isFinite(ti)||!isFinite(to)||to<=ti)throw new Error('Check Time In and Time Out');
  var dt=new Date(d+'T12:00:00'),day=Utilities.formatDate(dt,tz,'EEEE'),dow=dt.getDay(),weekend=(dow===0||dow===6);
  var worked=Math.max(0,to-ti-lunch),normal=0,ot=0;
  if(weekend){ot=worked;}else{
    var normalStart=360,normalEnd=1020;
    normal=Math.max(0,Math.min(to,normalEnd)-Math.max(ti,normalStart)-lunch);
    normal=Math.min(normal,worked);ot=Math.max(0,worked-normal);
  }
  var worker=String(row.worker||u.name||u.username||'').trim();
  if(!worker)throw new Error('Worker required');
  var submitted=u.username||u.name||worker;
  sh.appendRow([new Date(d+'T12:00:00'),day,weekend?'Weekend':'Weekday',worker,row.job||'',row.timeIn||'',row.timeOut||'',lunch,normal/60,ot/60,worked/60,row.note||'',submitted,new Date()]);
  return {saved:true,normalHours:normal/60,overtimeHours:ot/60,totalHours:worked/60};
}
function hiServiceGet_(p,body){
  if(p.action!=='hiStock')return null;auth_(body);return out_({ok:true,stock:hiStockRows_(),places:HI_PLACES,categories:['Gas','Plumbing','Geyser','Consumable','Tools','Other']});
}
function hiServicePost_(body){
  var a=body.action;if(['hiStockCount','hiStockAdd','hiStockTransfer','hiStockAdjust','hiStockReceive','hiTimesheet'].indexOf(a)<0)return null;
  var u=auth_(body);
  if(a==='hiStockCount'){var r=hiCount_(u,String(body.place||''),body.counts||{});return out_({ok:true,changed:r.changed,unknown:r.unknown,rejected:[]});}
  if(a==='hiStockAdd')return out_({ok:true,added:hiAdd_(u,body.item||{})});
  if(a==='hiStockTransfer')return out_({ok:true,result:hiMove_(u,body.from,body.to,body.lines,'transfer',body.reason,'')});
  if(a==='hiStockAdjust')return out_({ok:true,result:hiMove_(u,body.place,'',body.lines,'adjust',body.reason,'')});
  if(a==='hiStockReceive')return out_({ok:true,result:hiMove_(u,'',body.place,body.lines,'receive','Invoice',body.reference)});
  if(a==='hiTimesheet')return out_({ok:true,result:hiTime_(u,body.row||{})});
}
