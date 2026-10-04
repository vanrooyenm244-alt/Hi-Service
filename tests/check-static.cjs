const fs=require('node:fs'),vm=require('node:vm');
let n=0;
for(let f of fs.readdirSync('.'))if(f.endsWith('.js')){new vm.Script(fs.readFileSync(f,'utf8'),{filename:f});n++;}
for(let m of fs.readFileSync('index.html','utf8').matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)){new vm.Script(m[1],{filename:'index.html'});n++;}
new vm.Script(fs.readFileSync('google-apps-script/HiService.gs','utf8'),{filename:'HiService.gs'});
JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
console.log(n+' frontend script units, backend and manifest pass');
