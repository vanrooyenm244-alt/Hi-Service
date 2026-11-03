const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const html=fs.readFileSync('index.html','utf8');
function fn(start,end,c){vm.createContext(c);vm.runInContext(html.slice(html.indexOf(start),html.indexOf(end,html.indexOf(start))),c);return c}
test('removing a selected movement line preserves the other rows',()=>{
 let rows=[];
 function node(){return {value:'',hidden:false,innerHTML:'',textContent:'',addEventListener(){},appendChild(){},replaceChildren(){},setAttribute(){},querySelector(){return null}};}
 let box={insertAdjacentHTML(){let search=node(),picker=node(),suggestions=node(),selection=node(),button={onclick:null},row={removed:false,querySelector:q=>q==='.stock-item-search'?search:q==='.stock-item-picker'?picker:q==='.stock-suggestions'?suggestions:q==='.stock-selection'?selection:button,remove(){this.removed=true}};rows.push(row);this.lastElementChild=row}};
 let c=fn('function addLine(','addTransfer.onclick',{S:{items:[]},esc:String,document:{createElement:()=>node()},HiStockCategories:{ordered:items=>items,name:item=>item.item||item.description}});
 c.addLine(box,1);c.addLine(box,2);rows[0].querySelector('.btn.danger').onclick();assert.equal(rows[0].removed,true);assert.equal(rows[1].removed,false);
});
test('API response from previous signed-in account is discarded',async()=>{let resolve;let c=fn('var HI_READS_=','function rawPost(',{S:{url:'https://fixture.invalid',username:'a',password:'test'},fetch:()=>new Promise(r=>resolve=r),Error,JSON,encodeURIComponent,setTimeout,clearTimeout});let p=c.apiGet('hiStock');c.S.username='b';resolve({ok:true,json:async()=>({ok:true,stock:[]})});await assert.rejects(p,/Session changed/)});
test('HTTP errors never masquerade as successful stock API replies',async()=>{let c=fn('var HI_READS_=','function rawPost(',{S:{url:'https://fixture.invalid',username:'a',password:'test'},fetch:async()=>({ok:false,status:503}),Error,JSON,encodeURIComponent,setTimeout,clearTimeout});await assert.rejects(c.apiGet('hiStock'),/HTTP 503/)});
test('category clicks preserve the current search text',()=>{assert.ok(!html.includes("STOCK_CATEGORY=b.dataset.category;q.value=''"))});

test('identical concurrent reads share one fetch and release it after completion',async()=>{
 let sends=0,resolve;const c=fn('var HI_READS_=','function rawPost(',{S:{url:'https://fixture.invalid',username:'a',password:'fixture'},fetch:()=>{sends++;return new Promise(r=>resolve=r);},Error,JSON,encodeURIComponent,setTimeout,clearTimeout});
 const a=c.apiGet('hiStock'),b=c.apiGet('hiStock');assert.equal(a,b);assert.equal(sends,1);resolve({ok:true,json:async()=>({ok:true,stock:[]})});await a;assert.equal(Object.keys(c.HI_READS_).length,0);
});
test('timed-out writes report uncertain outcome and are never automatically replayed',async()=>{
 let timeout,sends=0;const c=fn('var HI_READS_=','function rawPost(',{Error,JSON,encodeURIComponent,setTimeout:f=>{timeout=f;return 1;},clearTimeout(){},fetch:()=>{sends++;return new Promise(()=>{});}});
 const request=c.hiFetch_('https://fixture.invalid',{method:'POST'});timeout();await assert.rejects(request,/Check whether it was saved/);assert.equal(sends,1);
});
