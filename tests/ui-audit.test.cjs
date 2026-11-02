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
test('API response from previous signed-in account is discarded',async()=>{let resolve;let c=fn('function apiGet(','function rawPost(',{S:{url:'https://fixture.invalid',username:'a',password:'test'},fetch:()=>new Promise(r=>resolve=r),Error,JSON,encodeURIComponent});let p=c.apiGet('hiStock');c.S.username='b';resolve({ok:true,json:async()=>({ok:true,stock:[]})});await assert.rejects(p,/Session changed/)});
test('HTTP errors never masquerade as successful stock API replies',async()=>{let c=fn('function apiGet(','function rawPost(',{S:{url:'https://fixture.invalid',username:'a',password:'test'},fetch:async()=>({ok:false,status:503}),Error,JSON,encodeURIComponent});await assert.rejects(c.apiGet('hiStock'),/HTTP 503/)});
test('category clicks preserve the current search text',()=>{assert.ok(!html.includes("STOCK_CATEGORY=b.dataset.category;q.value=''"))});
