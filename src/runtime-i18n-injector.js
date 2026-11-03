/* Expression for Runtime.evaluate, followed by (catalogs, options).
   In-memory only: never writes application files, preferences or permissions. */
(async function installWisprChinese(catalogs, options) {
  'use strict';
  options = options || {};
  const VERSION = 1;
  const STATE_KEY = Symbol.for('wispr.localChinese.runtime.v1');
  const root = globalThis;
  const isRecord = value => value && typeof value === 'object' && !Array.isArray(value);
  if (!isRecord(catalogs)) return { installed: false, reason: 'invalid-catalogs' };
  const clean = Object.create(null);
  let suppliedKeys = 0;
  for (const [namespace, entries] of Object.entries(catalogs)) {
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(namespace) || !isRecord(entries)) continue;
    const values = Object.create(null);
    for (const [key, value] of Object.entries(entries)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      if (typeof value !== 'string') continue;
      values[key] = value;
      suppliedKeys += 1;
    }
    clean[namespace] = values;
  }
  if (!suppliedKeys) return { installed: false, reason: 'empty-catalogs' };
  if (suppliedKeys > 100000 || Object.keys(clean).length > 80) {
    return { installed: false, reason: 'catalog-limit' };
  }
  let state = root[STATE_KEY];
  if (!state || state.version !== VERSION) {
    state = {
      version: VERSION, require: null, chunkName: null, pendingChunk: false,
      i18n: null, moduleId: null, lastDigest: null, lastLanguages: null,
      applying: false, observedStore: null, lastResult: null,
      namespaces: null, catalogs: clean, observer: null
    };
    Object.defineProperty(root, STATE_KEY, { value: state, configurable: true });
  }
  state.catalogs = clean;
  state.sourceCatalogs = isRecord(options.sourceCatalogs) ? options.sourceCatalogs : {};
  state.originals = state.originals || Object.create(null);
  const text = JSON.stringify([clean, state.sourceCatalogs]);
  let digest = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    digest ^= text.charCodeAt(i);
    digest = Math.imul(digest, 16777619);
  }
  digest = String(options.catalogDigest || (digest >>> 0).toString(16));
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const maxWait = Math.max(0, Math.min(15000, Number(options.waitMs ?? 6000) || 0));
  const deadline = Date.now() + maxWait;
  function captureRequire() {
    if (state.require && state.require.m) return true;
    if (state.pendingChunk) return false;
    const names = Object.getOwnPropertyNames(root).filter(name =>
      /^webpackChunk/.test(name) && /wispr|flow/i.test(name)
    );
    // A future Webpack build may rename its chunk global. Only use an array
    // whose push handler is already Webpack's runtime callback, never arbitrary APIs.
    if (!names.length) {
      for (const name of Object.getOwnPropertyNames(root)) {
        if (/^webpackChunk/.test(name)) names.push(name);
      }
    }
    for (const name of names) {
      let queue;
      try { queue = root[name]; } catch { continue; }
      if (!Array.isArray(queue) || typeof queue.push !== 'function') continue;
      state.pendingChunk = true;
      state.chunkName = name;
      const chunkId = `wispr_local_chinese_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      try {
        queue.push([[chunkId], {}, require => {
          if (typeof require === 'function' && require.m) state.require = require;
          state.pendingChunk = false;
        }]);
      } catch {
        state.pendingChunk = false;
      }
      return Boolean(state.require && state.require.m);
    }
    return false;
  }
  function looksLikeI18n(value) {
    return value && typeof value === 'object' &&
      typeof value.addResourceBundle === 'function' &&
      typeof value.getResourceBundle === 'function' &&
      typeof value.emit === 'function' &&
      typeof value.t === 'function';
  }
  function findI18n() {
    if (looksLikeI18n(state.i18n)) return true;
    const require = state.require;
    if (!require?.m) return false;
    let candidates = 0;
    for (const id of Object.keys(require.m)) {
      const factory = require.m[id];
      if (typeof factory !== 'function') continue;
      const source = Function.prototype.toString.call(factory);
      // Identify the self-contained i18next implementation, rather than invoke
      // all factories or rely on build-specific module IDs/export names.
      if (source.length > 1000000 || !source.includes('i18next:') ||
          !source.includes('addResourceBundle') || !source.includes('changeLanguage') ||
          !source.includes('isInitialized') || !source.includes('createInstance')) continue;
      candidates += 1;
      if (candidates > 4) return false;
      let exports;
      try { exports = require(id); } catch { continue; }
      const values = [exports];
      if ((typeof exports === 'object' && exports) || typeof exports === 'function') {
        for (const key of Object.getOwnPropertyNames(exports).slice(0, 64)) {
          try { values.push(exports[key]); } catch { /* inaccessible export */ }
        }
      }
      const instance = values.find(looksLikeI18n);
      if (instance) {
        state.i18n = instance;
        state.moduleId = String(id);
        return true;
      }
    }
    return false;
  }
  while (!(captureRequire() && findI18n() && state.i18n.isInitialized)) {
    if (Date.now() >= deadline) {
      return {
        installed: false,
        reason: !state.require ? 'webpack-runtime-not-ready' :
          !state.i18n ? 'i18next-instance-not-found' : 'i18next-not-initialized',
        suppliedKeys, retryable: true
      };
    }
    await wait(100);
  }
  const i18n = state.i18n;
  const languages = options.englishOnly ? ['en'] :
    [...new Set(['en', i18n.language, i18n.resolvedLanguage].filter(value =>
      typeof value === 'string' && /^[A-Za-z0-9_-]{1,50}$/.test(value)))];
  const languageIdentity = languages.join(',');
  function applyResources(force = false) {
    if (state.applying) return state.lastResult;
    if (!force && state.lastDigest === digest && state.lastLanguages === languageIdentity) {
      return { ...state.lastResult, unchanged: true };
    }
    state.applying = true;
    let matchedExisting = 0;
    let keysApplied = 0;
    try {
      for (const [namespace, translations] of Object.entries(state.catalogs)) {
        const existing = i18n.getResourceBundle('en', namespace) || {};
        const source = state.sourceCatalogs[namespace] || {};
        const originals = state.originals[namespace] || (state.originals[namespace] = Object.create(null));
        const byText = new Map();
        for (const [key, english] of Object.entries(source)) {
          const chinese = translations[key];
          if (typeof english !== 'string' || !english.trim() || typeof chinese !== 'string') continue;
          if (!byText.has(english)) byText.set(english, chinese);
          else if (byText.get(english) !== chinese) byText.set(english, null);
        }
        const overlay = { ...translations };
        for (const [key, value] of Object.entries(existing)) {
          if (!(key in originals) && typeof value === 'string') originals[key] = value;
          if (Object.prototype.hasOwnProperty.call(translations, key)) matchedExisting += 1;
          else {
            const match = byText.get(originals[key]);
            if (typeof match === 'string') overlay[key] = match;
          }
        }
        for (const language of languages) {
          // Deep merge plus overwrite keeps new upstream keys intact while
          // restoring known translations. Only display resources are changed.
          i18n.addResourceBundle(language, namespace, overlay, true, true);
        }
        keysApplied += Object.keys(overlay).length;
      }
      state.lastDigest = digest;
      state.lastLanguages = languageIdentity;
      state.namespaces = Object.keys(state.catalogs);
      state.lastResult = {
        installed: true, version: VERSION, namespaces: state.namespaces,
        keysApplied, matchedExisting, languages, nativeMenus: false,
        backend: 'webpack-i18next', unchanged: false
      };
      // react-i18next listens for languageChanged. Emit without calling
      // changeLanguage or changing the account/dictation language preferences.
      if (options.notify !== false && typeof i18n.language === 'string') i18n.emit('languageChanged', i18n.language);
      const loaded = {};
      for (const language of languages) {
        loaded[language] = Object.fromEntries(state.namespaces.map(namespace => [namespace, true]));
      }
      if (options.notify !== false && options.emitLoaded !== false) i18n.emit('loaded', loaded);
      return state.lastResult;
    } catch (error) {
      return { installed: false, reason: 'resource-overlay-failed', error: String(error).slice(0, 240) };
    } finally {
      state.applying = false;
    }
  }
  const result = applyResources(Boolean(options.force));
  const store = i18n.store || i18n.services?.resourceStore;
  if (result?.installed && options.observe !== false && store && typeof store.on === 'function' && (state.observedStore !== store || state.observerIdentity !== digest + '/' + languageIdentity)) {
    if (state.observedStore && state.observer && typeof state.observedStore.off === 'function') {
      state.observedStore.off('added', state.observer);
    }
    state.observer = (language, namespace) => {
      if (state.applying || !languages.includes(language) || !state.catalogs[namespace]) return;
      // Loading a lazy catalog must not overwrite a previously translated key.
      // A microtask waits until the source loader finishes its merge.
      if (state.refreshQueued) return;
      state.refreshQueued=true;
      Promise.resolve().then(() => {state.refreshQueued=false;applyResources(true);});
    };
    state.observedStore = store;
    state.observerIdentity = digest + '/' + languageIdentity;
    store.on('added', state.observer);
  }
  return result;
})
