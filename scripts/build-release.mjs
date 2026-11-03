import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {fileURLToPath} from 'node:url';
const exec=promisify(execFile);
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(process.platform!=='darwin')throw new Error('The release builder requires macOS and Xcode Command Line Tools.');
const pkg=JSON.parse(await fs.readFile(path.join(root,'package.json'),'utf8'));
const runtime=JSON.parse(await fs.readFile(path.join(root,'scripts/node-runtime.json'),'utf8'));
const build=path.join(root,'build'),cache=path.join(build,'cache'),dist=path.join(root,'dist');
const label='Wispr-Flow-Chinese-v'+pkg.version,stage=path.join(build,label),app=path.join(stage,'app');
await fs.rm(stage,{recursive:true,force:true});
for(const folder of [cache,dist,app])await fs.mkdir(folder,{recursive:true});
for(const name of ['manager.mjs','wispr-companion.mjs','runtime-i18n-injector.js','wispr-launch.c'])await fs.copyFile(path.join(root,'src',name),path.join(app,name));
for(const [from,to]of[['catalogs/zh-CN','catalogs'],['catalogs/en','sources']])await fs.cp(path.join(root,from),path.join(app,to),{recursive:true});
await exec('/usr/bin/clang',['-O2','-Wall','-Wextra','-Werror','-mmacosx-version-min=13.5','-arch','arm64','-arch','x86_64',path.join(root,'src/wispr-launch.c'),'-o',path.join(app,'wispr-launch')]);
await exec('/usr/bin/codesign',['--force','--sign','-',path.join(app,'wispr-launch')]);
console.log('Built universal launch shim (arm64 + x86_64).');
for(const architecture of ['darwin-arm64','darwin-x64']){
 const entry=runtime[architecture],archive=path.join(cache,entry.archive);
 const hash=async file=>crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
 let valid=false;try{valid=await hash(archive)===entry.sha256}catch{}
 if(!valid){
  console.log('Downloading official Node.js '+runtime.version+' '+architecture+'...');
  await exec('/usr/bin/curl',['--fail','--location','--silent','--show-error','--retry','3','--connect-timeout','15','--max-time','300','https://nodejs.org/dist/v'+runtime.version+'/'+entry.archive,'--output',archive],{timeout:320000});
 }
 if(await hash(archive)!==entry.sha256)throw new Error('Official Node.js SHA-256 mismatch: '+entry.archive);
 const prefix='node-v'+runtime.version+'-'+architecture;
 await exec('/usr/bin/tar',['-xzf',archive,'-C',cache,prefix+'/bin/node',prefix+'/LICENSE']);
 const target=path.join(stage,'runtime',architecture);await fs.mkdir(target,{recursive:true});
 await fs.copyFile(path.join(cache,prefix,'bin/node'),path.join(target,'node'));
 await fs.chmod(path.join(target,'node'),0o755);
 await fs.copyFile(path.join(cache,prefix,'LICENSE'),path.join(target,'LICENSE'));
 console.log('Verified official Node.js checksum for '+architecture+'.');
}
await fs.copyFile(path.join(root,'scripts/bootstrap.sh'),path.join(stage,'bootstrap.sh'));
for(const name of await fs.readdir(path.join(root,'scripts/launchers')))await fs.copyFile(path.join(root,'scripts/launchers',name),path.join(stage,name));
for(const name of ['README.md','README.en.md','LICENSE','THIRD_PARTY_NOTICES.md','CHANGELOG.md'])await fs.copyFile(path.join(root,name),path.join(stage,name));
await fs.cp(path.join(root,'docs'),path.join(stage,'docs'),{recursive:true});
await fs.copyFile(path.join(root,'README.md'),path.join(stage,'先读我.txt'));
for(const name of ['bootstrap.sh',...await fs.readdir(path.join(root,'scripts/launchers'))])await fs.chmod(path.join(stage,name),0o755);
const files={};
async function collect(directory){for(const entry of await fs.readdir(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory())await collect(file);else files[path.relative(stage,file)]=crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex')}}
await collect(stage);
await fs.writeFile(path.join(stage,'manifest.json'),JSON.stringify({version:pkg.version,nodeVersion:runtime.version,minimumMacOS:'13.5',architectures:['arm64','x86_64'],files},null,2)+'\n');
const archiveName=label+'-macOS.zip',archive=path.join(dist,archiveName);
await fs.rm(archive,{force:true});
await exec('/usr/bin/ditto',['-c','-k','--norsrc','--keepParent',stage,archive],{timeout:180000});
const archiveHash=crypto.createHash('sha256').update(await fs.readFile(archive)).digest('hex');
await fs.writeFile(path.join(dist,'SHA256SUMS.txt'),archiveHash+'  '+archiveName+'\n');
await fs.copyFile(path.join(root,'scripts/install-release.sh'),path.join(dist,'install.sh'));
console.log('Created '+archive+' ('+Math.round((await fs.stat(archive)).size/1048576)+' MiB)');
console.log('SHA256 '+archiveHash);
