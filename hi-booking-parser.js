(function(root){
'use strict';
function parse(event){
 var title=String(event.customer||''),site=String(event.site||''),notes=String(event.notes||'');
 var blocks=notes.split(/\n\s*\n/).map(function(x){return x.trim();}).filter(Boolean);
 var lines=notes.split(/\r?\n/).map(function(x){return x.trim();}).filter(Boolean);
 var phoneLine=lines.findIndex(function(x){return /(?:\+?27|0)\d[\d\s-]{7,}/.test(x);});
 var phone=phoneLine>=0?(lines[phoneLine].match(/(?:\+?27|0)\d[\d\s-]{7,}/)||[''])[0].trim():'';
 var person=phoneLine>0?lines[phoneLine-1]:'';
 var address=site||((phoneLine>=0&&lines.length>phoneLine+1)?lines.slice(phoneLine+1).join(', '):'');
 // Future/planned work is not proof that anything was installed or used.
 var workRequest=(phoneLine>=0?lines.slice(0,Math.max(0,phoneLine-1)):blocks.slice(0,1)).join(' ').trim();
 if(!workRequest)workRequest=blocks[0]||'';
 var client=title.split(/\s+-\s+/)[0].trim()||title;
 return {client:client,jobTitle:title,address:address,contact:person,phone:phone,workRequest:workRequest,sourceNotes:notes,materials:[],workCompleted:''};
}
root.HiServiceBookingParse={parse:parse};
})(typeof window!=='undefined'?window:globalThis);
