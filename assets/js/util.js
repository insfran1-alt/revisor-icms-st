/* Revisor ICMS-ST — utilitários gerais */
(function (global) {
  'use strict';
  const U = {};

  U.uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-5);

  /** Converte número no formato brasileiro ("1.234,56", "10,00%", "R$ 5,00") ou number em Number. */
  U.num = function (v) {
    if (v === null || v === undefined || v === '') return 0;
    if (typeof v === 'number') return isFinite(v) ? v : 0;
    let s = String(v).trim().replace(/\s| /g, '').replace(/^R\$/i, '');
    if (!s || s === '-' || s === '--') return 0;
    let neg = false;
    if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
    if (s.startsWith('-')) { neg = !neg; s = s.slice(1); }
    s = s.replace(/%$/, '');
    const hasComma = s.includes(','), hasDot = s.includes('.');
    if (hasComma && hasDot) {
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) s = s.replace(/\./g, '').replace(',', '.');
      else s = s.replace(/,/g, '');
    } else if (hasComma) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else if (hasDot) {
      const parts = s.split('.');
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3 && /^\d{1,3}$/.test(parts[0]))) s = s.replace(/\./g, '');
    }
    const n = parseFloat(s);
    if (!isFinite(n)) return 0;
    return neg ? -n : n;
  };

  U.isNumBR = s => /^-?\(?R?\$?\s*-?[\d.]*\d,\d+%?\)?$/.test(String(s || '').trim());
  U.round2 = n => Math.round(((n || 0) + Number.EPSILON) * 100) / 100;
  U.round4 = n => Math.round(((n || 0) + Number.EPSILON) * 10000) / 10000;

  const nf2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const brlF = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
  U.brl = n => brlF.format(n || 0);
  U.fmt = (n, d = 2) => d === 2 ? nf2.format(n || 0) : (n || 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  U.pct = (n, d = 2) => U.fmt(n, d) + '%';
  U.int = n => (n || 0).toLocaleString('pt-BR');

  U.digits = s => String(s ?? '').replace(/\D/g, '');
  U.fmtCNPJ = s => {
    const d = U.digits(s);
    if (d.length === 14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
    return s || '';
  };
  U.fmtNCM = s => { const d = U.digits(s); return d.length === 8 ? d.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1.$2.$3') : d; };
  U.fmtCEST = s => { const d = U.digits(s); return d.length === 7 ? d.replace(/^(\d{2})(\d{3})(\d{2})$/, '$1.$2.$3') : ''; };
  U.fmtCNAE = s => { const d = U.digits(s); return d.length === 7 ? d.replace(/^(\d{2})(\d{2})(\d)(\d{2})$/, '$1.$2-$3-$4') : s || ''; };

  /** Normaliza texto: sem acentos, maiúsculo, espaços simples. */
  U.norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  U.normKey = s => U.norm(s).replace(/[^A-Z0-9]/g, '');
  U.tokens = s => U.norm(s).replace(/[^A-Z0-9%]+/g, ' ').trim().split(' ').filter(t => t && (t.length > 1 || /\d/.test(t)));

  /** Similaridade (0..1) entre descrições — Dice sobre tokens, com bônus para prefixo (descrições truncadas). */
  U.similarity = (a, b) => {
    const A = U.tokens(a), B = U.tokens(b);
    if (!A.length || !B.length) return 0;
    const bag = new Map();
    B.forEach(t => bag.set(t, (bag.get(t) || 0) + 1));
    let inter = 0;
    A.forEach(t => { const c = bag.get(t); if (c) { inter++; bag.set(t, c - 1); } });
    let dice = (2 * inter) / (A.length + B.length);
    const na = U.normKey(a), nb = U.normKey(b);
    const shorter = na.length <= nb.length ? na : nb, longer = na.length <= nb.length ? nb : na;
    if (shorter.length >= 12 && longer.startsWith(shorter)) dice = Math.max(dice, 0.92);
    return dice;
  };

  /** "10/2026" → "2026-10" */
  U.refKey = ref => {
    const s = String(ref || '').trim();
    let m = s.match(/^(\d{4})-(\d{1,2})$/);
    if (m) return m[1] + '-' + m[2].padStart(2, '0');
    m = s.match(/(\d{1,2})\s*\/\s*(\d{4})/);
    return m ? m[2] + '-' + m[1].padStart(2, '0') : '';
  };
  /** "2026-10" → "10/2026" */
  U.refLabel = key => { const m = String(key || '').match(/^(\d{4})-(\d{2})$/); return m ? m[2] + '/' + m[1] : (key || '—'); };
  /** "dd/mm/aaaa" → "aaaa-mm-dd" */
  U.isoDate = s => { const m = String(s || '').match(/(\d{2})\/(\d{2})\/(\d{4})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : (/^\d{4}-\d{2}-\d{2}/.test(s || '') ? String(s).slice(0, 10) : ''); };
  U.brDate = iso => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso || ''); };
  U.today = () => new Date().toISOString().slice(0, 10);

  U.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  U.sum = (arr, fn) => (arr || []).reduce((s, x) => s + (fn ? (fn(x) || 0) : (x || 0)), 0);
  U.groupBy = (arr, fn) => (arr || []).reduce((m, x) => { const k = fn(x); (m[k] = m[k] || []).push(x); return m; }, {});
  U.uniq = arr => [...new Set(arr)];
  U.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  U.sleep = ms => new Promise(r => setTimeout(r, ms));

  /** Hash curto de um ArrayBuffer (SHA-256 quando disponível; FNV-1a como alternativa). */
  U.hashBuffer = async buf => {
    try {
      if (global.crypto && crypto.subtle) {
        const h = await crypto.subtle.digest('SHA-256', buf);
        return [...new Uint8Array(h)].slice(0, 12).map(b => b.toString(16).padStart(2, '0')).join('');
      }
    } catch (_) { /* segue para FNV */ }
    const bytes = new Uint8Array(buf);
    let h1 = 0x811c9dc5, h2 = 0x01000193;
    for (let i = 0; i < bytes.length; i++) { h1 ^= bytes[i]; h1 = Math.imul(h1, 16777619) >>> 0; h2 = Math.imul(h2 ^ bytes[i], 2246822519) >>> 0; }
    return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0') + bytes.length.toString(16);
  };
  U.hashText = s => {
    let h = 0x811c9dc5;
    const str = String(s);
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    return h.toString(36);
  };

  U.download = (filename, content, mime = 'application/octet-stream') => {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
  };

  U.copy = async text => {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (_) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      let ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      ta.remove(); return ok;
    }
  };

  U.slug = s => U.norm(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

  /** Posições de 1 a total que não estão no conjunto, em faixas: ["16–30", "61"]. */
  U.faixasFaltantes = (presentes, total) => {
    const out = [];
    let ini = 0;
    for (let i = 1; i <= total + 1; i++) {
      const falta = i <= total && !presentes.has(i);
      if (falta && !ini) ini = i;
      if (!falta && ini) { out.push(ini === i - 1 ? String(ini) : `${ini}–${i - 1}`); ini = 0; }
    }
    return out;
  };
  /** ["a", "b", "c"] → "a, b e c" */
  U.listaTxt = arr => arr.length <= 1 ? (arr[0] || '') : `${arr.slice(0, -1).join(', ')} e ${arr[arr.length - 1]}`;

  /* ---------- Domínio fiscal ---------- */
  U.UF_COD = { 11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO', 21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB', 26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA', 31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP', 41: 'PR', 42: 'SC', 43: 'RS', 50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF' };
  U.UFS = Object.values(U.UF_COD).sort();

  /** Decompõe a chave de acesso (44 dígitos). */
  U.parseChave = chave => {
    const d = U.digits(chave);
    if (d.length !== 44) return null;
    return { chave: d, uf: U.UF_COD[+d.slice(0, 2)] || '', aamm: d.slice(2, 6), cnpj: d.slice(6, 20), modelo: d.slice(20, 22), serie: String(+d.slice(22, 25)), numero: String(+d.slice(25, 34)) };
  };

  /** Alíquota interestadual (Res. SF 22/1989) para mercadoria nacional com destino a MS (Centro-Oeste). */
  U.aliqInterestadualParaMS = uf => {
    uf = String(uf || '').toUpperCase();
    if (!uf) return null;
    if (uf === 'MS') return 0;
    return ['SP', 'RJ', 'MG', 'PR', 'SC', 'RS'].includes(uf) ? 7 : 12;
  };

  /** Converte uma alíquota efetiva em uma das alíquotas interestaduais padrão (4, 7, 12). */
  U.snapAliqInter = p => {
    if (!(p > 0)) return 0;
    const opts = [4, 7, 12];
    let best = opts[0];
    opts.forEach(o => { if (Math.abs(o - p) < Math.abs(best - p)) best = o; });
    return Math.abs(best - p) <= 0.6 ? best : U.round2(p);
  };

  /** CNAE da seção C (indústria de transformação: divisões 10 a 33). */
  U.cnaeIndustrial = cod => { const d = U.digits(cod); const div = +d.slice(0, 2); return d.length >= 2 && div >= 10 && div <= 33; };
  U.cnaeAlimentacao = cod => U.digits(cod).startsWith('56');

  global.RST_U = U;
})(window);
