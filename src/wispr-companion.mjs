#!/usr/bin/env node
/** Local, bundle-preserving Chinese UI companion for Wispr Flow. Built-ins only. */
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
const execFileAsync = promisify(execFile);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const argv = process.argv.slice(2);
const configIndex = argv.indexOf('--config');
if (configIndex < 0 || !argv[configIndex + 1]) {
  console.error('Usage: wispr-companion.mjs --config /absolute/config.json --watch|--launch|--status');
  process.exit(2);
}
const configPath = path.resolve(argv[configIndex + 1]);
const config = JSON.parse(await fsp.readFile(configPath, 'utf8'));
const appPath = path.resolve(config.appPath ?? '/Applications/Wispr Flow.app');
const appExe = path.join(appPath, 'Contents/MacOS/Wispr Flow');
const stateDir = path.resolve(config.stateDirectory ?? path.dirname(configPath));
const logPath = path.resolve(config.logFile ?? path.join(stateDir, 'companion.log'));
const statePath = path.join(stateDir, 'state.json');
const lockPath = path.join(stateDir, 'watcher.lock.json');
const requestPath = path.join(stateDir, 'launch.request.json');
const scriptPath = fileURLToPath(import.meta.url);
const pollMs = Math.max(250, Math.min(5000, Number(config.pollMs ?? 750)));
const earlyWindowMs = Math.max(1000, Math.min(10000, Number(config.earlyTakeoverWindowMs ?? 4000)));
await fsp.mkdir(stateDir, { recursive: true, mode: 0o700 });
function log(event, fields = {}) {
  const row = JSON.stringify({ time: new Date().toISOString(), event, ...fields });
  try {
    try { if (fs.statSync(logPath).size > 2 * 1024 * 1024) fs.renameSync(logPath, logPath + '.previous'); } catch {}
    fs.appendFileSync(logPath, row + '\n', { mode: 0o600 });
  } catch (e) { console.error('Companion log error:', String(e)); }
}
async function atomicJSON(destination, object) {
  const tmp = destination + '.' + process.pid + '.tmp';
  await fsp.writeFile(tmp, JSON.stringify(object, null, 2) + '\n', { mode: 0o600 });
  await fsp.rename(tmp, destination);
}
function alive(pid) { try { process.kill(pid, 0); return true; } catch { return false; } }
async function watcherPID() {
  try {
    const lock = JSON.parse(await fsp.readFile(lockPath, 'utf8'));
    if (!Number.isInteger(lock.pid) || !alive(lock.pid)) return null;
    const { stdout } = await execFileAsync('/bin/ps', ['-p', String(lock.pid), '-o', 'command=']);
    return stdout.includes(scriptPath) && stdout.includes(configPath) ? lock.pid : null;
  } catch { return null; }
}
if (argv.includes('--status')) {
  let state = {};
  try { state = JSON.parse(await fsp.readFile(statePath, 'utf8')); } catch {}
  console.log(JSON.stringify({ watcherPid: await watcherPID(), ...state }, null, 2));
  process.exit(0);
}
if (argv.includes('--launch')) {
  if (!(await watcherPID())) {
    const watcher = spawn(process.execPath, [scriptPath, '--config', configPath, '--watch'], {
      detached: true, stdio: 'ignore', cwd: stateDir,
    });
    watcher.unref();
  }
  await atomicJSON(requestPath, { createdAt: Date.now(), nonce: crypto.randomUUID() });
  console.log('已请求打开 Wispr Flow 中文界面。');
  process.exit(0);
}
if (!argv.includes('--watch')) { console.error('Choose --watch, --launch, or --status'); process.exit(2); }
const existingWatcher = await watcherPID();
if (existingWatcher) { console.log('Companion already running:', existingWatcher); process.exit(0); }
// launchd is the normal single-instance owner; the atomic lock also covers direct starts.
try {
  const handle = await fsp.open(lockPath, 'wx', 0o600);
  await handle.writeFile(JSON.stringify({ pid: process.pid, startedAt: Date.now(), configPath }));
  await handle.close();
} catch (e) {
  if (e.code !== 'EEXIST') throw e;
  if (await watcherPID()) process.exit(0);
  try { if (Date.now() - (await fsp.stat(lockPath)).mtimeMs < 10000) process.exit(0); } catch {}
  await fsp.unlink(lockPath).catch(() => {});
  const handle = await fsp.open(lockPath, 'wx', 0o600);
  await handle.writeFile(JSON.stringify({ pid: process.pid, startedAt: Date.now(), configPath }));
  await handle.close();
}
const catalogDir = path.resolve(config.catalogDirectory);
const catalogs = {};
for (const name of (await fsp.readdir(catalogDir)).filter(n => n.endsWith('.json')).sort()) {
  const namespace = name.slice(0, -5);
  const value = JSON.parse(await fsp.readFile(path.join(catalogDir, name), 'utf8'));
  if (!value || Array.isArray(value) || typeof value !== 'object' || Object.values(value).some(v => typeof v !== 'string')) throw new Error('Invalid catalog: ' + name);
  catalogs[namespace] = value;
}
const injector = (await fsp.readFile(path.resolve(config.injectorPath), 'utf8')).trim().replace(/;\s*$/, '');
const sourceCatalogs = {};
if (config.sourceCatalogDirectory) {
  const directory = path.resolve(config.sourceCatalogDirectory);
  for (const name of (await fsp.readdir(directory)).filter(n => n.endsWith('.json')).sort()) {
    sourceCatalogs[name.slice(0, -5)] = JSON.parse(await fsp.readFile(path.join(directory, name), 'utf8'));
  }
}
const catalogJSON = JSON.stringify(catalogs);
const optionsJSON = JSON.stringify({ waitMs: 1500, sourceCatalogs, observe: false, emitLoaded: false });
const revision = crypto.createHash('sha256').update(catalogJSON).update(optionsJSON).update(injector).digest('hex');
const revisionJSON = JSON.stringify(revision);
const marker = '__wisprChineseCompanionRevision';
const probeExpression = `globalThis[${JSON.stringify(marker)}]===${revisionJSON}`;
const installExpression = `(async()=>{if(globalThis[${JSON.stringify(marker)}]===${revisionJSON})return {installed:true,unchanged:true};const result=await (${injector})(${catalogJSON},${optionsJSON});if(result&&result.installed)globalThis[${JSON.stringify(marker)}]=${revisionJSON};return result;})()`;
let verifiedStamp = null;
async function verifyOfficialApp() {
  const files = [appExe, path.join(appPath, 'Contents/Info.plist'), path.join(appPath, 'Contents/Resources/app.asar')];
  const stamps = await Promise.all(files.map(async file => { const st = await fsp.stat(file); return `${st.dev}:${st.ino}:${st.size}:${st.mtimeMs}`; }));
  const stamp = stamps.join('/');
  if (stamp === verifiedStamp) return;
  await execFileAsync('/usr/bin/codesign', ['--verify', '--deep', '--strict', appPath], { timeout: 60000 });
  const identity = await execFileAsync('/usr/bin/codesign', ['--display', '--verbose=4', appPath], { timeout: 10000 });
  const details = identity.stdout + identity.stderr;
  if (!/^TeamIdentifier=C9VQZ78H85$/m.test(details) || !/^Identifier=com\.electron\.wispr-flow$/m.test(details)) throw new Error('Official Wispr Flow signing identity did not match');
  verifiedStamp = stamp;
  log('app.official_signature_verified');
}
const totalKeys = Object.values(catalogs).reduce((n, obj) => n + Object.keys(obj).length, 0);
class PipeCDP {
  constructor(child) {
    this.input = child.stdio[3]; this.output = child.stdio[4]; this.buffer = ''; this.nextId = 0; this.pending = new Map(); this.listeners = new Set(); this.closed = false;
    this.output.setEncoding('utf8');
    this.output.on('data', data => {
      this.buffer += data;
      if (this.buffer.length > 8 * 1024 * 1024) { this.fail(new Error('CDP response exceeded local transport limit')); return; }
      let boundary;
      while ((boundary = this.buffer.indexOf('\0')) !== -1) {
        const raw = this.buffer.slice(0, boundary); this.buffer = this.buffer.slice(boundary + 1);
        if (!raw) continue;
        let message; try { message = JSON.parse(raw); } catch { log('cdp.invalid_json'); continue; }
        if (message.id !== undefined) {
          const pending = this.pending.get(message.id); if (!pending) continue;
          this.pending.delete(message.id); clearTimeout(pending.timer);
          if (message.error) pending.reject(new Error(message.error.message ?? 'CDP error'));
          else pending.resolve(message.result ?? {});
        } else for (const listener of this.listeners) Promise.resolve(listener(message)).catch(e => log('cdp.event_error', { error: String(e).slice(0, 300) }));
      }
    });
    this.output.on('error', e => this.fail(e)); this.output.on('end', () => this.fail(new Error('CDP pipe closed')));
    this.input.on('error', e => this.fail(e));
  }
  on(listener) { this.listeners.add(listener); }
  call(method, params = {}, sessionId, timeoutMs = 8000) {
    if (this.closed) return Promise.reject(new Error('CDP pipe is closed'));
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      const message = { id, method, params }; if (sessionId) message.sessionId = sessionId;
      this.input.write(JSON.stringify(message) + '\0', error => {
        if (error) { const entry = this.pending.get(id); if (entry) { this.pending.delete(id); clearTimeout(timer); reject(error); } }
      });
    });
  }
  fail(error) {
    if (this.closed) return;
    this.closed = true;
    for (const entry of this.pending.values()) { clearTimeout(entry.timer); entry.reject(error); }
    this.pending.clear();
    log('cdp.closed', { error: String(error).slice(0, 300) });
  }
}
function allowedURL(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'file:' && decodeURIComponent(parsed.pathname).startsWith(path.join(appPath, 'Contents/Resources/app.asar/') );
  } catch { return false; }
}
class Localizer {
  constructor(cdp) { this.cdp = cdp; this.sessions = new Map(); this.completedTargets = new Set(); this.lastStatus = new Map(); this.lastPermissionAt=0; this.lastPermission=undefined; cdp.on(m => this.event(m)); }
  async start() {
    await this.cdp.call('Target.setDiscoverTargets', { discover: true });
    await this.cdp.call('Target.setAutoAttach', { autoAttach: false, waitForDebuggerOnStart: false, flatten: true });
    await this.refreshTargets();
  }
  async refreshTargets() {
    if(this.refreshing){this.refreshPending=true;return;}
    this.refreshing=true;
    try {
    const response = await this.cdp.call('Target.getTargets');
    for (const target of response.targetInfos ?? []) {
      if (target.type !== 'page' || !allowedURL(target.url) || this.completedTargets.has(target.targetId)) continue;
      if ([...this.sessions.values()].some(s => s.targetId === target.targetId)) continue;
      try { const result = await this.cdp.call('Target.attachToTarget', { targetId: target.targetId, flatten: true }); await this.attach(result.sessionId, target); }
      catch (error) { log('target.attach_deferred', { targetId: target.targetId, error: String(error).slice(0, 160) }); }
    }    } finally {
      this.refreshing=false;
      if(this.refreshPending){this.refreshPending=false;await this.refreshTargets();}
    }
  }
  async attach(sessionId, info) {
    if (!sessionId || info.type !== 'page' || !allowedURL(info.url) || this.completedTargets.has(info.targetId)) return;
    let session = this.sessions.get(sessionId);
    if (!session) { session = { sessionId, targetId: info.targetId, url: info.url, contextId: undefined, busy: false, lastAttempt: 0, installed: false }; this.sessions.set(sessionId, session); }
    else session.url = info.url;
    await this.cdp.call('Runtime.enable', {}, sessionId).catch(() => {});
    await this.cdp.call('Page.enable', {}, sessionId).catch(() => {});
    await this.inject(session);
  }
  async event(message) {
    const p = message.params ?? {};
    if (message.method === 'Target.attachedToTarget') return; // Explicit attach result owns initialization.
    if (message.method === 'Target.detachedFromTarget') { this.sessions.delete(p.sessionId); return; }
    if (message.method === 'Target.targetCreated' || message.method === 'Target.targetInfoChanged') {
      const info=p.targetInfo??{};
      if(info.type==='page' && allowedURL(info.url) && !this.completedTargets.has(info.targetId) && ![...this.sessions.values()].some(s=>s.targetId===info.targetId)) await this.refreshTargets();
    }
    if (message.method === 'Target.targetDestroyed') { this.completedTargets.delete(p.targetId); return; }
    if (message.method === 'Target.targetInfoChanged') {
      const info = p.targetInfo ?? {};
      for (const session of this.sessions.values()) if (session.targetId === info.targetId) { session.url = info.url; await this.inject(session); }
      return;
    }
    const session = this.sessions.get(message.sessionId); if (!session) return;
    if (message.method === 'Runtime.executionContextsCleared') { session.contextId = undefined; session.installed=false; session.lastAttempt = 0; this.lastStatus.delete(session.sessionId); }
    if (message.method === 'Runtime.executionContextCreated' && p.context?.auxData?.isDefault) { session.contextId = p.context.id; session.installed=false; session.lastAttempt = 0; await this.inject(session); }
    if (message.method === 'Page.frameNavigated' && p.frame && !p.frame.parentId) { session.url = p.frame.url; session.installed=false; session.lastAttempt = 0; await this.inject(session); }
  }
  async inject(session) {
    if (session.installed || !allowedURL(session.url) || session.busy || Date.now() - session.lastAttempt < 1000 || this.cdp.closed) return;
    session.busy = true; session.lastAttempt = Date.now();
    try {
      const params = { expression: probeExpression, returnByValue: true, awaitPromise: true };
      if (session.contextId !== undefined) params.contextId = session.contextId;
      const probe = await this.cdp.call('Runtime.evaluate', params, session.sessionId);
      if (probe.result?.value === true) { session.installed=true; await this.detach(session); return; }
      const result = await this.cdp.call('Runtime.evaluate', { ...params, expression: installExpression }, session.sessionId, 15000);
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? 'Injector exception');
      const value = result.result?.value ?? {};
      if(value.installed) session.installed=true;
      const status = value.installed ? 'installed' : String(value.reason ?? 'not-ready');
      if (this.lastStatus.get(session.sessionId) !== status) {
        this.lastStatus.set(session.sessionId, status);
        log('renderer.localization', { targetId: session.targetId, status, keysApplied: value.keysApplied ?? value.keys ?? null, revision: revision.slice(0, 12) });
        if (value.installed && /\/hub\/index\.html/.test(session.url)) {
          await saveState({ state: 'ready', appPid: managed?.pid ?? null, keysApplied: value.keysApplied, nativeMenus: false });
          await this.checkAccessibility();

        }
      }
      if (value.installed) await this.detach(session);
    } catch (error) {
      const status = String(error).slice(0, 240);
      if (this.lastStatus.get(session.sessionId) !== status) { this.lastStatus.set(session.sessionId, status); log('renderer.deferred', { targetId: session.targetId, error: status }); }
    } finally { session.busy = false; }
  }
  async detach(session) {
    this.completedTargets.add(session.targetId);
    await this.cdp.call('Runtime.disable',{},session.sessionId).catch(()=>{});
    await this.cdp.call('Page.disable',{},session.sessionId).catch(()=>{});
    await this.cdp.call('Target.detachFromTarget',{sessionId:session.sessionId}).catch(()=>{});
    this.sessions.delete(session.sessionId);
    log('renderer.detached',{targetId:session.targetId});
  }
  async checkAccessibility() {
    if (this.lastPermission===true || Date.now()-this.lastPermissionAt < 10000) return;
    const session=[...this.sessions.values()].find(s=>allowedURL(s.url)&&/\/hub\/index\.html/.test(s.url));
    if (!session) return;
    this.lastPermissionAt=Date.now();
    try {
      const permission=await this.cdp.call('Runtime.evaluate',{expression:'window.electron.ipc.invoke("perms:status","accessibility")',returnByValue:true,awaitPromise:true},session.sessionId);
      const granted=permission.result?.value;
      if (typeof granted==='boolean' && granted!==this.lastPermission) {
        this.lastPermission=granted;
        log('app.accessibility_status',{granted});
        await saveState({accessibilityGranted:granted});
      }
    } catch {}
  }
  async tick() { await Promise.all([...this.sessions.values()].map(session => this.inject(session))); await this.checkAccessibility(); }
}
async function appProcesses() {
  const { stdout } = await execFileAsync('/bin/ps', ['-axo', 'pid=,lstart=,command='], { env: { ...process.env, LC_ALL: 'C' }, maxBuffer: 4 * 1024 * 1024 });
  const found = [];
  for (const line of stdout.split('\n')) {
    const match = line.match(/^\s*(\d+)\s+(\w{3}\s+\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\s+\d{4})\s+(.+)$/);
    if (!match) continue;
    const command = match[3]; if (command !== appExe && !command.startsWith(appExe + ' ')) continue;
    const start = new Date(match[2]).getTime(); if (!Number.isFinite(start)) continue;
    found.push({ pid: Number(match[1]), start, command });
  }
  return found;
}
let managed = null, localizer = null, stopped = false, lastLaunchAt = 0, lastTargetRefreshAt = 0;
const seenExternal = new Set();
let currentState = { state: 'idle', appPath, totalKeys, revision, transport: 'stdio-pipe', updatedAt: new Date().toISOString() };
async function saveState(changes = {}) { currentState = { ...currentState, ...changes, updatedAt: new Date().toISOString() }; await atomicJSON(statePath, currentState); }
async function launchManaged(reason) {
  if (Date.now() - lastLaunchAt < 2000) return;
  lastLaunchAt = Date.now();
  if (!fs.existsSync(appExe)) { log('app.missing', { appPath }); await saveState({ state: 'app-missing', appPid: null }); return; }
  await verifyOfficialApp();
  const appEnv = { ...process.env, ELECTRON_ENABLE_LOGGING: '0' };
  delete appEnv.NODE_OPTIONS;
  delete appEnv.ELECTRON_RUN_AS_NODE;
  const launcher = path.join(path.dirname(scriptPath), 'wispr-launch');
  const child = spawn(launcher, [], { cwd: path.dirname(appExe), stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'], env: appEnv });
  managed = child; const cdp = new PipeCDP(child); localizer = new Localizer(cdp);
  log('app.launched', { pid: child.pid, reason }); await saveState({ state: 'launching', appPid: child.pid ?? null });
  child.on('error', error => {
    log('app.spawn_error', { error: String(error) });
    if (managed === child) { managed = null; localizer = null; saveState({ state: 'launch-failed', appPid: null }).catch(() => {}); }
  });
  child.on('exit', (code, signal) => {
    cdp.fail(new Error('App process exited'));
    if (managed === child) { managed = null; localizer = null; saveState({ state: 'idle', appPid: null }).catch(() => {}); }
    log('app.exited', { pid: child.pid, code, signal });
    // Deliberately do not reopen. A fresh user launch or updater-created process is required.
  });
  localizer.start().catch(error => { log('cdp.start_deferred', { error: String(error).slice(0, 300) }); });
}
async function takeOverFreshApp(app) {
  const identity = app.pid + ':' + app.start;
  if (seenExternal.has(identity)) return;
  seenExternal.add(identity);
  const ageMs = Date.now() - app.start;
  if (ageMs < -1500 || ageMs > earlyWindowMs) {
    log('app.existing_left_running', { pid: app.pid, ageMs });
    await saveState({ state: 'waiting-for-next-app-start', appPid: app.pid });
    return;
  }
  // Recheck the exact executable immediately before signalling; never target helpers or another app.
  const fresh = (await appProcesses()).find(p => p.pid === app.pid && p.start === app.start);
  if (!fresh || Date.now() - fresh.start > earlyWindowMs) return;
  await verifyOfficialApp();
  log('app.early_start_takeover', { pid: app.pid, ageMs });
  process.kill(app.pid, 'SIGTERM');
  const deadline = Date.now() + 8000;
  while (alive(app.pid) && Date.now() < deadline) await sleep(100);
  if (alive(app.pid)) { log('app.takeover_aborted_still_running', { pid: app.pid }); return; }
  // Never use SIGKILL. No new managed launch if a different app instance won the race.
  if ((await appProcesses()).length) return;
  await launchManaged('fresh-external-start');
}
async function requestedLaunch() {
  let request;
  try { request = JSON.parse(await fsp.readFile(requestPath, 'utf8')); await fsp.unlink(requestPath); } catch { return false; }
  if (Date.now() - Number(request.createdAt) > 60000) return false;
  return true;
}
async function shutdown(signal) {
  if (stopped) return; stopped = true;
  log('watcher.stopping', { signal });
  try { const lock = JSON.parse(await fsp.readFile(lockPath, 'utf8')); if (lock.pid === process.pid) await fsp.unlink(lockPath); } catch {}
  await saveState({ state: 'companion-stopped' }).catch(() => {});
  // Do not signal the user app. Parent pipe lifetime is a known Chromium transport constraint.
  process.exit(0);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
log('watcher.started', { pid: process.pid, appPath, totalKeys, revision: revision.slice(0, 12), earlyWindowMs });
await saveState();
while (!stopped) {
  try {
    const apps = managed ? [] : await appProcesses();
    const launchRequested = await requestedLaunch();
    if (managed && managed.exitCode !== null) { managed = null; localizer = null; }
    if (!managed) {
      if (!apps.length) { if (launchRequested) await launchManaged('explicit-request'); }
      else {
        // Existing sessions are left intact even when --launch is requested.
        for (const app of apps) await takeOverFreshApp(app);
      }
    }
    if (localizer) {
      await localizer.tick();
      if (Date.now() - lastTargetRefreshAt > 60000) { lastTargetRefreshAt = Date.now(); await localizer.refreshTargets().catch(() => {}); }
    }
  } catch (error) { log('watcher.cycle_error', { error: String(error).slice(0, 400) }); }
  await sleep(pollMs);
}
