import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const directory=path.join(root,'catalogs/en');
const patterns=[/\{\{.*?\}\}/g,/<\/?[A-Za-z0-9][^<>]*>/g,/https?:\/\/[^\s<>"\)]+/g];
let total=0;
for(const name of fs.readdirSync(directory).filter(x=>x.endsWith('.json')).sort()){
 const en=JSON.parse(fs.readFileSync(path.join(directory,name))),zh=JSON.parse(fs.readFileSync(path.join(root,'catalogs/zh-CN',name)));
 assert.deepEqual(Object.keys(zh).sort(),Object.keys(en).sort(),name+': key coverage');
 for(const [key,value] of Object.entries(en)){
  assert.equal(typeof value,'string');assert.equal(typeof zh[key],'string');
  for(const expression of patterns)assert.deepEqual((value.match(expression)||[]).sort(),(zh[key].match(expression)||[]).sort(),name+'/'+key+': placeholder, markup or URL mismatch');
 }
 total+=Object.keys(en).length;
 console.log(name+': '+Object.keys(en).length+' entries OK');
}
assert.equal(total,7264);console.log('PASS: 7,264 catalog keys; placeholders, markup and URLs preserved.');
