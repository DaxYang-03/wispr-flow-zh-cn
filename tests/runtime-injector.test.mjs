import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source = fs.readFileSync(new URL('../src/runtime-i18n-injector.js', import.meta.url), 'utf8');
function fixture(id, initialized=true, lazy=false) {
 const events=[];
 const listeners=new Set();
 const data={en:{hub:{known:'English',new_upstream:'New field'},settings:{title:'Settings'}}};
 const i18n={isInitialized:initialized,language:'en',resolvedLanguage:'en',t:k=>k,
  addResourceBundle(lang,ns,v){data[lang]??={};data[lang][ns]??={};Object.assign(data[lang][ns],v);for(const fn of listeners)fn(lang,ns);},
  getResourceBundle(lang,ns){return data[lang]?.[ns];},emit(...args){events.push(args);},
  store:{on(ev,fn){listeners.add(fn)},off(ev,fn){listeners.delete(fn)}}};
 const modules={};const cache={};
 modules[id]=function(module){/* i18next: addResourceBundle changeLanguage isInitialized createInstance */module.exports={arbitraryName:i18n}};
 modules['not-to-run']=function(){throw new Error('unrelated module executed')};
 const require=id=>{if(cache[id])return cache[id];const m={exports:{}};modules[id](m);return cache[id]=m.exports};require.m=modules;
 const queue=[];
 const setup=()=>queue.push=(payload)=>payload[2](require);
 if(!lazy)setup();else setTimeout(()=>{const pending=[...queue];setup();for(const p of pending)queue.push(p)},50);
 const context=vm.createContext({webpackChunkwispr_flow:queue,Symbol,setTimeout,Math,Date,Promise,Object,JSON});
 const inject=vm.runInContext(source,context);
 return {inject,i18n,data,events,listeners,context};
}
const f=fixture('changed-build-123');
const result=await f.inject({hub:{known:'中文'},settings:{title:'设置'}},{waitMs:1000});
assert.equal(result.installed,true);assert.equal(f.data.en.hub.known,'中文');assert.equal(f.data.en.hub.new_upstream,'New field');
assert.equal(f.i18n.language,'en');assert.equal(result.nativeMenus,false);assert.equal(f.events[0][0],'languageChanged');
const second=await f.inject({hub:{known:'中文'},settings:{title:'设置'}},{waitMs:0});assert.equal(second.unchanged,true);assert.equal(f.listeners.size,1);
f.i18n.addResourceBundle('en','hub',{known:'Server overwrite',new_upstream:'New field'});await new Promise(r=>setTimeout(r,0));assert.equal(f.data.en.hub.known,'中文');
const changed=await f.inject({hub:{known:'更新中文'},settings:{title:'设置'}},{waitMs:0});assert.equal(changed.installed,true);assert.equal(f.data.en.hub.known,'更新中文');assert.equal(f.listeners.size,1);
const lazy=fixture('future-hash-987',true,true);assert.equal((await lazy.inject({hub:{known:'延迟中文'}},{waitMs:1000})).installed,true);
const notReady=fixture('notReady',false);assert.equal((await notReady.inject({hub:{known:'中文'}},{waitMs:0})).reason,'i18next-not-initialized');
const renamed=fixture('new-build');
renamed.data.en.hub={renamed_key:'English',brand_new:'Brand new'};
await renamed.inject({hub:{known:'中文'}},{waitMs:0,sourceCatalogs:{hub:{known:'English'}}});
assert.equal(renamed.data.en.hub.renamed_key,'中文');
assert.equal(renamed.data.en.hub.brand_new,'Brand new');
renamed.i18n.addResourceBundle('en','hub',{renamed_key:'English'});
await new Promise(r=>setTimeout(r,0));assert.equal(renamed.data.en.hub.renamed_key,'中文');
const ambiguous=fixture('ambiguous');ambiguous.data.en.hub.renamed='Same';
await ambiguous.inject({hub:{first:'第一',second:'第二'}},{waitMs:0,sourceCatalogs:{hub:{first:'Same',second:'Same'}}});
assert.equal(ambiguous.data.en.hub.renamed,'Same');
const once=fixture('one-shot');
await once.inject({hub:{known:'一次中文'}},{waitMs:0,observe:false,emitLoaded:false});
assert.equal(once.listeners.size,0);assert.equal(once.events.length,1);assert.equal(once.events[0][0],'languageChanged');
console.log('PASS: one-shot/no observer,  renamed keys, ambiguous source,  dynamic module ID, idempotence, new English keys, loader overwrite, catalog refresh, lazy runtime and initialization boundary');
