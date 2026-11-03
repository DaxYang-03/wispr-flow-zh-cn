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
const label='Wispr-Flow-Chinese-v'+pkg.version,stage=path.join(build,label);
const bundle=path.join(stage,'Wispr Flow 中文补丁.app'),contents=path.join(bundle,'Contents'),resources=path.join(contents,'Resources'),backend=path.join(resources,'backend');
await fs.rm(stage,{recursive:true,force:true});
for(const folder of [cache,dist,backend,path.join(contents,'MacOS')])await fs.mkdir(folder,{recursive:true});
for(const name of ['manager.mjs','wispr-companion.mjs','runtime-i18n-injector.js','wispr-launch.c'])await fs.copyFile(path.join(root,'src',name),path.join(backend,name));
for(const [from,to]of[['catalogs/zh-CN','catalogs'],['catalogs/en','sources']])await fs.cp(path.join(root,from),path.join(backend,to),{recursive:true});
await exec('/usr/bin/clang',['-O2','-Wall','-Wextra','-Werror','-mmacosx-version-min=13.5','-arch','arm64','-arch','x86_64',path.join(root,'src/wispr-launch.c'),'-o',path.join(backend,'wispr-launch')]);
await exec('/usr/bin/codesign',['--force','--sign','-',path.join(backend,'wispr-launch')]);
for(const arch of ['arm64','x86_64']){
 console.log('Building native macOS app for '+arch+'...');
 await exec('/usr/bin/xcrun',['swiftc','-swift-version','5','-parse-as-library','-O','-target',arch+'-apple-macos13.5','-framework','AppKit',path.join(root,'src/macos/App.swift'),'-o',path.join(build,'native-'+arch)],{timeout:180000,maxBuffer:4*1024*1024});
}
await exec('/usr/bin/lipo',['-create',path.join(build,'native-arm64'),path.join(build,'native-x86_64'),'-output',path.join(contents,'MacOS/WisprFlowChinese')]);
await exec('/usr/bin/xcrun',['swiftc','-O',path.join(root,'src/macos/IconMaker.swift'),'-o',path.join(build,'icon-maker')],{timeout:120000});
const iconset=path.join(build,'AppIcon.iconset');
await fs.rm(iconset,{recursive:true,force:true});
await exec(path.join(build,'icon-maker'),[iconset]);
await exec('/usr/bin/iconutil',['-c','icns',iconset,'-o',path.join(resources,'AppIcon.icns')]);
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
 const target=path.join(resources,'runtime',architecture);await fs.mkdir(target,{recursive:true});
 await fs.copyFile(path.join(cache,prefix,'bin/node'),path.join(target,'node'));
 await fs.chmod(path.join(target,'node'),0o755);
 await fs.copyFile(path.join(cache,prefix,'LICENSE'),path.join(target,'LICENSE'));
 console.log('Verified official Node.js checksum for '+architecture+'.');
}
await fs.writeFile(path.join(contents,'Info.plist'),`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>local.wispr-flow.chinese-patch</string>
<key>CFBundleName</key><string>Wispr Flow 中文补丁</string>
<key>CFBundleDisplayName</key><string>Wispr Flow 中文补丁</string>
<key>CFBundleExecutable</key><string>WisprFlowChinese</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>CFBundleShortVersionString</key><string>${pkg.version}</string>
<key>CFBundleVersion</key><string>${pkg.version}</string>
<key>CFBundleIconFile</key><string>AppIcon</string>
<key>LSMinimumSystemVersion</key><string>13.5</string>
<key>LSUIElement</key><true/>
<key>NSHighResolutionCapable</key><true/>
<key>NSPrincipalClass</key><string>NSApplication</string>
<key>LSApplicationCategoryType</key><string>public.app-category.utilities</string>
</dict></plist>\n`);
const menuBundle=path.join(contents,'Library/LoginItems/Wispr Flow 中文补丁菜单栏.app');
await fs.mkdir(path.join(menuBundle,'Contents/MacOS'),{recursive:true});
await fs.mkdir(path.join(menuBundle,'Contents/Resources'),{recursive:true});
for(const arch of ['arm64','x86_64']) {
 await exec('/usr/bin/xcrun',['swiftc','-D','MENU_SWIFTUI','-swift-version','5','-parse-as-library','-O','-target',arch+'-apple-macos13.5','-framework','AppKit','-framework','SwiftUI',path.join(root,'src/macos/App.swift'),path.join(root,'src/macos/MenuApp.swift'),'-o',path.join(build,'menu-'+arch)],{timeout:180000,maxBuffer:4*1024*1024});
}
await exec('/usr/bin/lipo',['-create',path.join(build,'menu-arm64'),path.join(build,'menu-x86_64'),'-output',path.join(menuBundle,'Contents/MacOS/WisprFlowChinese')]);
await fs.copyFile(path.join(resources,'AppIcon.icns'),path.join(menuBundle,'Contents/Resources/AppIcon.icns'));
let menuInfo=await fs.readFile(path.join(contents,'Info.plist'),'utf8');
menuInfo=menuInfo.replace('<string>local.wispr-flow.chinese-patch</string>','<string>local.wispr-flow.chinese-patch.menu</string>');
await fs.writeFile(path.join(menuBundle,'Contents/Info.plist'),menuInfo);
await exec('/usr/bin/codesign',['--force','--sign','-','--options','runtime',menuBundle]);
for(const name of ['LICENSE','THIRD_PARTY_NOTICES.md','CHANGELOG.md'])await fs.copyFile(path.join(root,name),path.join(resources,name));
await exec('/usr/bin/plutil',['-lint',path.join(contents,'Info.plist')]);
await exec('/usr/bin/codesign',['--force','--sign','-','--options','runtime',bundle]);
await exec('/usr/bin/codesign',['--verify','--deep','--strict',bundle]);
await fs.copyFile(path.join(root,'README.md'),path.join(stage,'先读我.txt'));
const files={};
async function collect(directory){for(const entry of await fs.readdir(directory,{withFileTypes:true})){const file=path.join(directory,entry.name);if(entry.isDirectory())await collect(file);else files[path.relative(stage,file)]=crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex')}}
await collect(stage);
await fs.writeFile(path.join(stage,'manifest.json'),JSON.stringify({version:pkg.version,nodeVersion:runtime.version,minimumMacOS:'13.5',architectures:['arm64','x86_64'],files},null,2)+'\n');
const archiveName=label+'-macOS.zip',archive=path.join(dist,archiveName);
await fs.rm(archive,{force:true});
await exec('/usr/bin/ditto',['-c','-k','--norsrc','--keepParent',stage,archive],{timeout:180000});
const dmgStage=path.join(build,'dmg-'+pkg.version);
await fs.rm(dmgStage,{recursive:true,force:true});await fs.mkdir(dmgStage,{recursive:true});
await fs.cp(bundle,path.join(dmgStage,path.basename(bundle)),{recursive:true});
await fs.symlink('/Applications',path.join(dmgStage,'Applications'));
const dmgName=label+'.dmg',dmg=path.join(dist,dmgName);
console.log('Creating drag-to-install DMG...');
await exec('/usr/bin/hdiutil',['create','-volname','Wispr Flow 中文补丁','-srcfolder',dmgStage,'-ov','-format','UDZO',dmg],{timeout:180000,maxBuffer:4*1024*1024});
const hashes=[];
for(const name of [archiveName,dmgName]){
 const file=path.join(dist,name),sum=crypto.createHash('sha256').update(await fs.readFile(file)).digest('hex');
 hashes.push(sum+'  '+name);console.log('Created '+file+' ('+Math.round((await fs.stat(file)).size/1048576)+' MiB)');
}
await fs.writeFile(path.join(dist,'SHA256SUMS.txt'),hashes.join('\n')+'\n');
