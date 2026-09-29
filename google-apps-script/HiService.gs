/**
 * Hi Service stock + timesheets module for the SAME Apps Script project used by Flagship.
 * Add this file to that Apps Script project, then add the two router calls shown in README.
 */
var HI_STOCK_SHEET='HiService_Stock';
var HI_COUNT_SHEET='HiService_Stock_Counts';
var HI_MOVE_SHEET='HiService_Stock_Movements';
var HI_TIME_SHEET='HiService_Timesheets';
var HI_PLACES=['Stoor','CEY 59799','CEY 67212'];
var HI_STOCK_HEAD=['Code','Description','Category','Supplier','Cost','Stoor','CEY 59799','CEY 67212','Total Stock','Active','Updated','By'];

function setupHiService(){
  var ss=SpreadsheetApp.getActiveSpreadsheet();
  hiSheet_(ss,HI_STOCK_SHEET,HI_STOCK_HEAD);
  hiSheet_(ss,HI_COUNT_SHEET,['Timestamp','User','Location','Code','Description','Count']);
  hiSheet_(ss,HI_MOVE_SHEET,['Timestamp','User','Type','From','To','Code','Description','Qty','Reason','Reference']);
  hiSheet_(ss,HI_TIME_SHEET,['Timestamp','User','Worker','Date','Time In','Time Out','Lunch Minutes','Job','Note']);
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
    return {row:i+2,code:String(r[0]||''),item:String(r[1]||''),description:String(r[1]||''),category:String(r[2]||''),supplier:String(r[3]||''),cost:Number(r[4])||0,'Stoor':Number(r[5])||0,'CEY 59799':Number(r[6])||0,'CEY 67212':Number(r[7])||0,total:Number(r[8])||0,active:String(r[9]||'Yes').toLowerCase()!=='no'};
  }).filter(function(x){return x.item&&x.active;});
}
function hiTotals_(){
  var sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HI_STOCK_SHEET);if(!sh)return;
  var n=sh.getLastRow()-1;if(n<1)return;var f=[];for(var i=0;i<n;i++)f.push(['=SUM(F'+(i+2)+':H'+(i+2)+')']);sh.getRange(2,9,n,1).setFormulas(f);
}
function hiFind_(codeOrName){
  var q=String(codeOrName||'').toLowerCase();return hiStockRows_().filter(function(x){return x.code.toLowerCase()===q||x.item.toLowerCase()===q;})[0]||null;
}
function hiSetQty_(row,place,qty,user){
  var idx=HI_PLACES.indexOf(place);if(idx<0)throw new Error('Unknown Hi Service location');
  var sh=SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HI_STOCK_SHEET);
  sh.getRange(row,6+idx).setValue(Number(qty));sh.getRange(row,11).setValue(new Date());sh.getRange(row,12).setValue(user.username||user.name||'user');
}
function hiAdd_(u,it){
  var code=String(it.code||'').trim(),name=String(it.item||it.description||'').trim();if(!name)throw new Error('Description required');
  if((code&&hiFind_(code))||hiFind_(name))throw new Error('Item already exists');
  if(!code)code='HS-'+Utilities.getUuid().slice(0,8).toUpperCase();
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HI_STOCK_SHEET).appendRow([code,name,it.category||'Other',it.supplier||'',Number(it.cost)||0,0,0,0,'','Yes',new Date(),u.username||'']);
  hiTotals_();return {code:code,item:name};
}
function hiCount_(u,place,counts){
  if(HI_PLACES.indexOf(place)<0)throw new Error('Unknown location');var changed=0,unknown=[];
  Object.keys(counts||{}).forEach(function(key){var it=hiFind_(key),q=Number(counts[key]);if(!it){unknown.push(key);return;}if(isNaN(q)||q<0)return;hiSetQty_(it.row,place,q,u);SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HI_COUNT_SHEET).appendRow([new Date(),u.username||'',place,it.code,it.item,q]);changed++;});
  hiTotals_();return {changed:changed,unknown:unknown};
}
function hiMove_(u,from,to,lines,type,reason,ref){
  if(from&&HI_PLACES.indexOf(from)<0)throw new Error('Unknown source');if(to&&HI_PLACES.indexOf(to)<0)throw new Error('Unknown destination');var done=0;
  (lines||[]).forEach(function(l){var it=hiFind_(l.code||l.item),q=Number(l.qty);if(!it||!q||q<0)return;
    if(type==='transfer'){if(it[from]<q)throw new Error(it.item+' only has '+it[from]+' in '+from);hiSetQty_(it.row,from,it[from]-q,u);hiSetQty_(it.row,to,it[to]+q,u);}
    else if(type==='receive'){hiSetQty_(it.row,to,it[to]+q,u);}
    else if(type==='adjust'){var next=it[from]+q;if(next<0)throw new Error(it.item+' would become negative');hiSetQty_(it.row,from,next,u);}
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HI_MOVE_SHEET).appendRow([new Date(),u.username||'',type,from||'',to||'',it.code,it.item,q,reason||'',ref||'']);done++;
  });hiTotals_();return {changed:done};
}
function hiTime_(u,row){
  SpreadsheetApp.getActiveSpreadsheet().getSheetByName(HI_TIME_SHEET).appendRow([new Date(),u.username||'',row.worker||u.name||u.username||'',row.date||'',row.timeIn||'',row.timeOut||'',Number(row.lunch)||0,row.job||'',row.note||'']);return {saved:true};
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
