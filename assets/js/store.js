/* Revisor ICMS-ST — armazenamento local (IndexedDB, com alternativa em localStorage/memória) */
(function (global) {
  'use strict';
  const DB_NAME = 'revisor-icms-st';
  const STORE = 'kv';
  const KEY = 'estado';
  const VERSION = 1;
  let dbPromise = null;
  let memoria = null;
  let modo = 'indexeddb';

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      try {
        if (!('indexedDB' in global) || !global.indexedDB) return reject(new Error('IndexedDB indisponível'));
        const req = indexedDB.open(DB_NAME, VERSION);
        req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE); };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error('Falha ao abrir IndexedDB'));
        req.onblocked = () => reject(new Error('IndexedDB bloqueado'));
      } catch (e) { reject(e); }
    });
    return dbPromise;
  }

  function idbGet(key) {
    return openDB().then(db => new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readonly');
      const r = tx.objectStore(STORE).get(key);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    }));
  }
  function idbSet(key, val) {
    return openDB().then(db => new Promise((res, rej) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(val, key);
      tx.oncomplete = () => res(true);
      tx.onerror = () => rej(tx.error);
      tx.onabort = () => rej(tx.error || new Error('Transação abortada'));
    }));
  }

  function estadoInicial() {
    return {
      versao: 1,
      criadoEm: new Date().toISOString(),
      companies: [],
      docs: [],
      decisions: {},
      catalog: {},
      mvaTable: [],
      noteFlags: {},
      fornecedores: {},
      settings: {}
    };
  }

  function normalizar(s) {
    const base = estadoInicial();
    if (!s || typeof s !== 'object') return base;
    const out = Object.assign(base, s);
    ['companies', 'docs', 'mvaTable'].forEach(k => { if (!Array.isArray(out[k])) out[k] = []; });
    ['decisions', 'catalog', 'noteFlags', 'fornecedores', 'settings'].forEach(k => { if (!out[k] || typeof out[k] !== 'object' || Array.isArray(out[k])) out[k] = {}; });
    return out;
  }

  async function load() {
    try {
      const v = await idbGet(KEY);
      modo = 'indexeddb';
      return normalizar(v);
    } catch (e) {
      try {
        const s = global.localStorage.getItem(DB_NAME + ':' + KEY);
        modo = 'localstorage';
        return normalizar(s ? JSON.parse(s) : null);
      } catch (_) {
        modo = 'memoria';
        return normalizar(memoria);
      }
    }
  }

  async function save(state) {
    state.atualizadoEm = new Date().toISOString();
    if (modo === 'indexeddb') {
      try { await idbSet(KEY, state); return true; } catch (e) { modo = 'localstorage'; }
    }
    if (modo === 'localstorage') {
      try { global.localStorage.setItem(DB_NAME + ':' + KEY, JSON.stringify(state)); return true; } catch (e) { modo = 'memoria'; }
    }
    memoria = JSON.parse(JSON.stringify(state));
    return false;
  }

  /* Preferências de interface (por navegador) */
  function prefGet(k, def) { try { const v = global.localStorage.getItem(DB_NAME + ':pref:' + k); return v === null ? def : JSON.parse(v); } catch (_) { return def; } }
  function prefSet(k, v) { try { global.localStorage.setItem(DB_NAME + ':pref:' + k, JSON.stringify(v)); } catch (_) { /* sem armazenamento */ } }

  global.RST_STORE = { load, save, estadoInicial, normalizar, prefGet, prefSet, modo: () => modo };
})(window);
