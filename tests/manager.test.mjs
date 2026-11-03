import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {makeLaunchAgent,makeConfig,locations,appRunningIn,runManager} from '../src/manager.mjs';
test('launch config preserves normal app scheduling and safely quotes paths',()=>{
 const home='/tmp/测试 A&B<user>';
 const xml=makeLaunchAgent(home);
 assert.match(xml,/<key>ProcessType<\/key><string>Interactive<\/string>/);
 assert.doesNotMatch(xml,/<string>Background<\/string>/);
 assert.match(xml,/A&amp;B&lt;user&gt;/);
 assert.match(xml,/<key>KeepAlive<\/key><true\/>/);
 const config=makeConfig(home);
 assert.ok(config.catalogDirectory.startsWith(home+'/Library/'));
 assert.equal(config.pollMs,1000);
});
test('running guard matches only official main app and handles arguments',()=>{
 const exe='/Applications/Wispr Flow.app/Contents/MacOS/Wispr Flow';
 assert.equal(appRunningIn(' '+exe+' --remote-debugging-pipe\n'),true);
 assert.equal(appRunningIn(exe),true);
 assert.equal(appRunningIn('/Applications/Wispr Flow.app/Contents/Frameworks/Helper\n/tmp/Other.app'),false);
 assert.equal(appRunningIn('/tmp'+exe),false);
});
async function fixture(t){
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'wispr-installer-'));
 t.after(()=>fs.rm(root,{recursive:true,force:true}));
 const home=path.join(root,'Home 中文 & spaces'),app=path.join(root,'Wispr Flow.app'),payload=path.join(root,'payload');
 await fs.mkdir(path.join(app,'Contents/MacOS'),{recursive:true});await fs.writeFile(path.join(app,'Contents/MacOS/Wispr Flow'),'fixture');
 await fs.mkdir(payload,{recursive:true});
 for(const name of ['manager.mjs','wispr-companion.mjs','runtime-i18n-injector.js','wispr-launch','wispr-launch.c'])await fs.writeFile(path.join(payload,name),'fixture '+name);
 for(const name of ['catalogs','sources']){await fs.mkdir(path.join(payload,name));await fs.writeFile(path.join(payload,name,'hub.json'),'{}');}
 const runtime=path.join(root,'runtime');await fs.writeFile(runtime,'test-only executable fixture');
 const calls=[];let running=false,valid=true,readyOnLaunch=true;
 const exec=async(file,args)=>{
  calls.push({file,args});
  if(args.includes('--launch') && readyOnLaunch) {
   const stateFile=path.join(locations(home).state,'state.json');
   await fs.mkdir(path.dirname(stateFile),{recursive:true});
   await fs.writeFile(stateFile,JSON.stringify({state:'ready',appPid:12345,keysApplied:7264,updatedAt:new Date().toISOString()}));
  }
  if(file==='/bin/ps')return{stdout:running?path.join(app,'Contents/MacOS/Wispr Flow'):''};
  if(file==='/usr/bin/sw_vers')return{stdout:'13.5\n'};
  if(file==='/usr/libexec/PlistBuddy')return{stdout:'1.6.1337\n'};
  if(file==='/usr/bin/codesign'){
   if(!valid)throw new Error('invalid signature');
   return{stdout:'',stderr:args.includes('--display')?'TeamIdentifier=C9VQZ78H85\nIdentifier=com.electron.wispr-flow\n':''};
  }
  return{stdout:'',stderr:''};
 };
 return{root,home,app,payload,runtime,calls,setRunning:x=>running=x,setValid:x=>valid=x,setReady:x=>readyOnLaunch=x,dep:{home,appPath:app,payload,runtime,exec,platform:'darwin',uid:501,print:()=>{}}};
}
test('portable install works under non-ASCII home; uninstall retains catalogs',async t=>{
 const f=await fixture(t);const result=await runManager('install',f.dep);
 assert.equal(result.ready.keysApplied,7264);
 const launches=f.calls.filter(c=>c.args.includes('--launch'));
 assert.equal(launches.length,1,'installation must launch exactly once');
 assert.ok(f.calls.indexOf(launches[0])>f.calls.findIndex(c=>c.args[0]==='bootstrap'),'launch only after service bootstrap');
 const loc=locations(f.home);
 const config=JSON.parse(await fs.readFile(loc.config,'utf8'));
 assert.equal(config.catalogDirectory,path.join(loc.directory,'catalogs'));
 assert.equal(await fs.readFile(path.join(loc.directory,'node'),'utf8'),'test-only executable fixture');
 assert.match(await fs.readFile(loc.plist,'utf8'),/<string>Interactive<\/string>/);
 assert.ok(f.calls.some(c=>c.file==='/usr/bin/plutil'));
 assert.ok(f.calls.some(c=>c.args[0]==='bootstrap'));
 await runManager('disable',f.dep);
 await assert.rejects(fs.access(loc.plist));
 assert.equal(await fs.readFile(path.join(loc.directory,'catalogs/hub.json'),'utf8'),'{}');
});
test('invalid app signature cannot stop existing service or write installation',async t=>{
 const f=await fixture(t);f.setValid(false);
 await assert.rejects(runManager('install',f.dep),/官方签名/);
 assert.ok(!f.calls.some(c=>c.file==='/bin/launchctl'));
 await assert.rejects(fs.access(locations(f.home).directory));
});
test('running app blocks install and disable without interrupting session',async t=>{
 const f=await fixture(t);f.setRunning(true);
 await assert.rejects(runManager('install',f.dep),/完全退出/);
 await assert.rejects(runManager('disable',f.dep),/完全退出/);
 assert.ok(!f.calls.some(c=>c.file==='/bin/launchctl'));
});
test('check is read only and unsupported systems fail before mutation',async t=>{
 const f=await fixture(t);const result=await runManager('check',f.dep);
 assert.equal(result.appVersion,'1.6.1337');
 await assert.rejects(fs.access(locations(f.home).directory));
 await assert.rejects(runManager('install',{...f.dep,platform:'linux'}),/仅支持 macOS/);
 await assert.rejects(runManager('install',{...f.dep,uid:0}),/不要使用 sudo/);
});

test('stale ready state must not report a new installation as successful',async t=>{
 const f=await fixture(t);f.setReady(false);const loc=locations(f.home);
 await fs.mkdir(loc.state,{recursive:true});
 await fs.writeFile(path.join(loc.state,'state.json'),JSON.stringify({state:'ready',appPid:123,keysApplied:7264,updatedAt:'2020-01-01T00:00:00.000Z'}));
 await assert.rejects(runManager('install',{...f.dep,readinessTimeoutMs:0}),/补丁已安装，但尚未确认中文加载完成/);
 assert.equal(f.calls.filter(c=>c.args.includes('--launch')).length,1);
});
test('launch failure cannot print successful Chinese installation',async t=>{
 const f=await fixture(t),messages=[];
 const exec=async(file,args,options)=>{if(args.includes('--launch'))throw new Error('launch failed');return f.dep.exec(file,args,options)};
 await assert.rejects(runManager('install',{...f.dep,exec,print:m=>messages.push(m)}),/launch failed/);
 assert.ok(!messages.some(m=>m.includes('中文界面已打开')));
});
