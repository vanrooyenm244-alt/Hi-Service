/* Build a stock-file preview without changing the master list or quantities. */
(function(g){
  function norm(v){return String(v||'').trim().toLowerCase();}
  g.HiStockImport={preview:function(rows,items,places){
    var byCode=Object.create(null),byName=Object.create(null),seenCode=Object.create(null),seenName=Object.create(null),incoming=[],conflicts=[];
    items.forEach(function(it){[[byCode,norm(it.code)],[byName,norm(it.item||it.description)]].forEach(function(pair){if(pair[1]){(pair[0][pair[1]]||(pair[0][pair[1]]=[])).push(it);}});});
    rows.forEach(function(r,i){
      var item=String(r.description||r['stock description']||r.item||r.name||'').trim(),code=String(r.code||r['stock code']||'').trim(),ck=norm(code),nk=norm(item),counts={},errors=[];
      if(!item&&!code)return;
      if(!item)errors.push('Description required');
      if((ck&&seenCode[ck])||seenName[nk])errors.push('Repeated stock row in upload');
      if(ck)seenCode[ck]=true;seenName[nk]=true;
      var matches=(ck&&byCode[ck])||byName[nk]||[];
      if(matches.length>1)errors.push('Duplicate code/description in existing stock');
      places.forEach(function(p){var aliases=[p.toLowerCase(),p==='Stoor'?'store':'',p==='CEY 59799'?'jacobus bakkie':'',p==='CEY 67212'?'andre bakkie':''].filter(Boolean);
        for(var a of aliases)if(r[a]!==undefined&&String(r[a]).trim()!==''){
          var raw=String(r[a]).trim(),q=Number(raw);
          if(!isFinite(q)||q<0||Math.floor(q)!==q)errors.push('Invalid quantity for '+p);else counts[p]=q;break;
        }
      });
      var costRaw=r.cost||r.price||'0',cost=Number(String(costRaw).replace(/[R,\s]/g,''));
      if(!isFinite(cost)||cost<0)errors.push('Invalid supplier cost');
      if(errors.length){conflicts.push({row:i+2,item:item||code,reason:errors.join('; ')});return;}
      incoming.push({item:{code:code,item:item,category:r.category||'Other',supplier:r.supplier||'',cost:cost,unit:r.unit||'each'},match:matches[0]||null,counts:counts});
    });
    return {incoming:incoming,newItems:incoming.filter(function(x){return !x.match;}),updates:incoming.filter(function(x){return !!x.match;}),conflicts:conflicts};
  }};
})(window);
