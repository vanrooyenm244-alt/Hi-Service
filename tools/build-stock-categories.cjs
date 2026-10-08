// Run after updating stock-category-source.json to rebuild the release asset and offline shell.
const fs=require('node:fs'),crypto=require('node:crypto');
const source=JSON.parse(fs.readFileSync('stock-category-source.json','utf8'));
let code=fs.readFileSync('stock-categories.js','utf8');
const start=code.indexOf('  var source='),end=code.indexOf('\n  function norm(',start);
if(start<0||end<0)throw Error('Stock module source declaration not found');
code=code.slice(0,start)+'  var source='+JSON.stringify(source)+';'+code.slice(end);
fs.writeFileSync('stock-categories.js',code);
const file='stock-categories.'+crypto.createHash('sha256').update(code).digest('hex').slice(0,12)+'.js';
fs.writeFileSync(file,code);
for(const path of ['index.html','sw.js'])fs.writeFileSync(path,fs.readFileSync(path,'utf8').replace(/stock-categories(?:\.[a-f0-9]{12})?\.js/g,file));
console.log(file);
