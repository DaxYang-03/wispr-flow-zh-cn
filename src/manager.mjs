#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import crypto from 'node:crypto';
const execute = promisify(execFile);
export const SERVICE = 'local.wispr-flow.chinese-companion';
export const APP_PATH = '/Applications/Wispr Flow.app';
const PAYLOAD_FILES = ['manager.mjs', 'wispr-companion.mjs', 'runtime-i18n-injector.js', 'wispr-launch', 'wispr-launch.c'];
export function locations(home) {
  const directory = path.join(home, 'Library/Application Support/Wispr Flow 中文助手');
  return { directory, config: path.join(directory, 'config.json'), state: path.join(directory, 'state'), plist: path.join(home, 'Library/LaunchAgents', SERVICE + '.plist') };
}
export function makeConfig(home, appPath = APP_PATH) {
  const loc = locations(home);
  return { appPath, catalogDirectory: path.join(loc.directory, 'catalogs'), sourceCatalogDirectory: path.join(loc.directory, 'sources'), injectorPath: path.join(loc.directory, 'runtime-i18n-injector.js'), stateDirectory: loc.state, pollMs: 1000, earlyTakeoverWindowMs: 4000 };
}
export function makeLaunchAgent(home) {
  const loc = locations(home);
  const xml = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  const text = value => '<string>' + xml(value) + '</string>';
  const args = [path.join(loc.directory, 'node'), path.join(loc.directory, 'wispr-companion.mjs'), '--config', loc.config, '--watch'];
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>Label</key>${text(SERVICE)}<key>ProgramArguments</key><array>${args.map(text).join('')}</array><key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>10</integer><key>ProcessType</key><string>Interactive</string><key>WorkingDirectory</key>${text(loc.directory)}<key>StandardOutPath</key>${text(path.join(loc.state, 'agent.log'))}<key>StandardErrorPath</key>${text(path.join(loc.state, 'agent-error.log'))}</dict></plist>\n`;
}
export function appRunningIn(output, appPath = APP_PATH) {
  const exe = path.join(appPath, 'Contents/MacOS/Wispr Flow');
  return output.split('\n').some(line => { const value = line.trim(); return value === exe || value.startsWith(exe + ' '); });
}
async function exists(file) { try { await fs.access(file); return true; } catch { return false; } }
async function writeAtomic(file, content, mode = 0o600) {
  await fs.mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
  const temporary = file + '.' + crypto.randomUUID() + '.tmp';
  await fs.writeFile(temporary, content, { mode });
  await fs.rename(temporary, file);
}
export async function runManager(action, dependencies = {}) {
  const home = dependencies.home ?? os.homedir();
  const platform = dependencies.platform ?? process.platform;
  const uid = dependencies.uid ?? process.getuid();
  const payload = dependencies.payload ?? path.dirname(fileURLToPath(import.meta.url));
  const runtime = dependencies.runtime ?? process.execPath;
  const appPath = dependencies.appPath ?? APP_PATH;
  const exec = dependencies.exec ?? execute;
  const print = dependencies.print ?? console.log;
  const loc = locations(home), domain = 'gui/' + uid, service = domain + '/' + SERVICE;
  const options = { timeout: 60000, maxBuffer: 4 * 1024 * 1024 };
  if (platform !== 'darwin') throw new Error('此补丁仅支持 macOS。Windows、iPhone 和 Linux 暂不支持。');
  if (uid === 0) throw new Error('请用当前登录用户运行，不要使用 sudo。');
  if (!['install', 'disable', 'launch', 'status', 'check'].includes(action)) throw new Error('可用操作：install / disable / launch / status / check');
  const isRunning = async () => appRunningIn((await exec('/bin/ps', ['-axo', 'command='], options)).stdout, appPath);
  if (action === 'status') {
    let state = {};
    try { state = JSON.parse(await fs.readFile(path.join(loc.state, 'state.json'), 'utf8')); } catch {}
    let active = false;
    try { await exec('/bin/launchctl', ['print', service], options); active = true; } catch {}
    print('中文助手：' + (active ? '已启用' : '已停用或未安装'));
    print('最近启动记录：' + ({ ready: '中文已加载', idle: '等待应用启动', launching: '正在启动', 'waiting-for-next-app-start': '请完全退出 Wispr Flow 后重新打开', 'companion-stopped': '已停止' }[state.state] ?? '尚无记录'));
    if (typeof state.accessibilityGranted === 'boolean') print('最近一次辅助功能检测：' + (state.accessibilityGranted ? '已授权' : '未授权'));
    if (state.updatedAt) print('记录时间：' + new Date(state.updatedAt).toLocaleString('zh-CN'));
    print('安装位置：' + loc.directory);
    print('记录反映最近一次启动，不是实时权限检测。顶部 macOS 原生菜单仍可能为英文。');
    return { active, state };
  }
  if (action === 'launch') {
    if (!await exists(loc.config)) throw new Error('请先双击“安装中文补丁.command”。');
    try { await exec('/bin/launchctl', ['print', service], options); }
    catch { await exec('/bin/launchctl', ['bootstrap', domain, loc.plist], options); }
    await exec(path.join(loc.directory, 'node'), [path.join(loc.directory, 'wispr-companion.mjs'), '--config', loc.config, '--launch'], options);
    print('已请求打开中文界面。如果应用已经打开，请先完全退出，再重新打开。');
    return;
  }
  if (action === 'disable') {
    if (await isRunning()) throw new Error('请先从 Wispr Flow 菜单选择 Quit 完全退出，再运行恢复工具。助手不会强行中断应用。');
    await exec('/bin/launchctl', ['bootout', service], options).catch(() => {});
    await fs.unlink(loc.plist).catch(error => { if (error.code !== 'ENOENT') throw error; });
    print('已关闭中文助手并取消登录启动。现在正常打开 Wispr Flow 即为官方界面。');
    print('词库与助手文件已保留，重新安装可以恢复：' + loc.directory);
    return;
  }
  const mac = (await exec('/usr/bin/sw_vers', ['-productVersion'], options)).stdout.trim();
  const [major, minor] = mac.split('.').map(Number);
  if (!(major > 13 || (major === 13 && minor >= 5))) throw new Error('安装包需要 macOS 13.5 或更新版本。');
  const exe = path.join(appPath, 'Contents/MacOS/Wispr Flow');
  if (!await exists(exe)) throw new Error('没有找到官方 Wispr Flow。请先安装到 /Applications/Wispr Flow.app 并正常登录一次。');
  try {
    await exec('/usr/bin/codesign', ['--verify', '--deep', '--strict', appPath], options);
    const identity = await exec('/usr/bin/codesign', ['--display', '--verbose=4', appPath], options);
    const details = identity.stdout + identity.stderr;
    if (!/^TeamIdentifier=C9VQZ78H85$/m.test(details) || !/^Identifier=com\.electron\.wispr-flow$/m.test(details)) throw new Error('identity');
  } catch { throw new Error('Wispr Flow 的官方签名校验未通过。请用官网原版替换曾被修改或重新签名的应用，再安装补丁。'); }
  const version = await exec('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleShortVersionString', path.join(appPath, 'Contents/Info.plist')], options);
  print('官方应用校验通过：Wispr Flow ' + version.stdout.trim() + '；macOS ' + mac);
  if (action === 'check') return { mac, appVersion: version.stdout.trim() };
  if (await isRunning()) throw new Error('请先从 Wispr Flow 菜单选择 Quit 完全退出，再重新运行安装工具。');
  for (const name of [...PAYLOAD_FILES, 'catalogs', 'sources']) if (!await exists(path.join(payload, name))) throw new Error('安装包不完整，或下载的是源码。请在 GitHub Releases 下载完整 ZIP 安装包。');
  await exec('/bin/launchctl', ['bootout', service], options).catch(() => {});
  await fs.mkdir(loc.directory, { recursive: true, mode: 0o700 });
  await fs.mkdir(loc.state, { recursive: true, mode: 0o700 });
  for (const [source, name] of [[runtime, 'node'], ...PAYLOAD_FILES.map(name => [path.join(payload, name), name])]) {
    const temporary = path.join(loc.directory, name + '.installing');
    await fs.copyFile(source, temporary);
    await fs.chmod(temporary, name === 'node' || name === 'wispr-launch' ? 0o755 : 0o600);
    await fs.rename(temporary, path.join(loc.directory, name));
  }
  for (const name of ['catalogs', 'sources']) await fs.cp(path.join(payload, name), path.join(loc.directory, name), { recursive: true, force: true });
  await writeAtomic(loc.config, JSON.stringify(makeConfig(home, appPath), null, 2) + '\n');
  await writeAtomic(loc.plist, makeLaunchAgent(home));
  await exec('/usr/bin/plutil', ['-lint', loc.plist], options);
  await exec('/bin/launchctl', ['bootstrap', domain, loc.plist], options);
  print('安装完成，已设置登录后自动运行。无需修改 Wispr Flow 的官方应用或签名。');
  print('双击“打开中文版.command”，或正常点击原来的 Wispr Flow 图标。');
  return { directory: loc.directory, plist: loc.plist };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await runManager(process.argv[2] ?? 'status'); }
  catch (error) { console.error('操作未完成：' + error.message); process.exitCode = 1; }
}
