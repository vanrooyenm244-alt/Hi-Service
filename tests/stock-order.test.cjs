const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const source=JSON.parse(fs.readFileSync('stock-category-source.json','utf8')),c={window:{}};vm.createContext(c);vm.runInContext(fs.readFileSync('stock-categories.js','utf8'),c);const cat=c.window.HiStockCategories;
const records=source.codeBindings.map(b=>({code:b.code,item:b.name,category:'Other',cost:source.items[b.order].cost,Stoor:2}));
test('all 371 imported products retain exact Sheet row order across reverse API order and filtering',()=>{
 assert.equal(source.items.length,371);const reversed=records.slice().reverse(),before=JSON.stringify(reversed),ordered=cat.ordered(reversed);
 assert.deepEqual(Array.from(ordered,x=>cat.reference(x).order),Array.from({length:371},(_,i)=>i));
 const gas=cat.select(reversed,'Gas','');assert.equal(cat.name(gas[gas.length-1]),'Nozzle Cleaners');assert.equal(gas.length,173);
 const brass=cat.select(reversed,'Gas','brass fitting');assert.equal(cat.name(brass[0]),source.items[0].name);assert.equal(JSON.stringify(reversed),before);
 assert.equal(cat.name(ordered[173]),'Water Pipes - 15mm Pex Pipe');assert.equal(cat.category(ordered[245]),'Aircon');
});
test('legacy descriptions, fractions and supplier codes retain stock IDs and share reference labels',()=>{
 const old=records.find(x=>x.code==='HS-035');assert.equal(cat.name(old),'Bulkhead With Hosetails And Nuts 100mm Brass');assert.equal(old.item,'Bulk Head With Hosetails And Nuts 100mm Brass');
 assert.equal(cat.reference({item:'Brass Fitting 1/8 Female to Hosetail (T9141DG030)'}).order,0);
 assert.equal(cat.name({item:'Gas Filter ½'}),'Gas Filter ½');assert.notEqual(cat.reference({item:'Gas Filter ½'}).order,cat.reference({item:'Gas Filter ¾'}).order);
 assert.equal(cat.reference({item:'Elbow CXMI 15mm',code:'HS-175'}),null);
});
test('extra stock stays available below the reference list and zero count drafts remain keyed by original codes',()=>{
 const extra={code:'EXTRA',item:'Additional gas stock',category:'Gas',cost:10,Stoor:4},counts={'HS-035':0,EXTRA:3},snapshot=JSON.stringify(counts);
 const items=cat.select([extra,...records.slice().reverse()],'Gas','');assert.equal(items.at(-1),extra);assert.equal(cat.section(extra),'Additional stock');assert.equal(cat.name(items.at(-2)),'Nozzle Cleaners');assert.equal(JSON.stringify(counts),snapshot);
});
test('prices distinguish missing values from zero and accept subsequent backend price updates',()=>{
 const nozzle=records.find(x=>cat.name(x)==='Nozzle Cleaners');assert.equal(cat.price(nozzle),4.78);
 const blank=records.find(x=>cat.reference(x).cost===null);assert.equal(cat.price(blank),null);assert.equal(cat.price({...blank,cost:0}),null);assert.equal(cat.price({...nozzle,cost:9.99}),9.99);
 assert.equal(cat.price({item:'Unlisted',cost:0}),0);assert.equal(cat.price({item:'Unlisted',cost:''}),null);
});
test('stock count, overview, movement and estimate pickers all use the same catalogue order',()=>{
 const html=fs.readFileSync('index.html','utf8');assert.ok(html.includes("HiStockCategories.select(S.items,STOCK_CATEGORY,q.value)"));assert.ok(html.includes('HiStockCategories.ordered(S.items).map'));assert.ok(html.includes("HiStockCategories.select(S.items,'',estSearch.value)"));assert.ok(html.includes("stockPriceLabel_(x)"));assert.ok(html.includes('<th>Unit cost</th>'));
});
test('new catalogue helper bypasses older cached files and is available offline',()=>{
 const bytes=fs.readFileSync('stock-categories.js'),hash=crypto.createHash('sha256').update(bytes).digest('hex').slice(0,12),file='stock-categories.'+hash+'.js';
 assert.ok(fs.readFileSync('index.html','utf8').includes('src="'+file+'"'));assert.ok(fs.readFileSync('sw.js','utf8').includes('./'+file));assert.deepEqual(fs.readFileSync(file),bytes);
});
