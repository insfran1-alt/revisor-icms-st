/* Revisor ICMS-ST — relação oficial das mercadorias sujeitas à ST em MS (RICMS/MS, Anexo III, Subanexo I):
 * leitura do documento (.docx) e consulta por CEST e NCM. */
(function (global) {
  'use strict';
  const U = global.RST_U;
  const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

  /* ============================================================
   * Leitura do Subanexo I em .docx (o .doc da SEFAZ/MS pode ser salvo como .docx no Word)
   * ============================================================ */
  const filho = (el, nome) => { if (!el) return null; for (const c of el.children) if (c.localName === nome) return c; return null; };
  const attr = (el, nome) => el ? (el.getAttributeNS(W, nome) || el.getAttribute('w:' + nome) || '') : '';

  /** Texto de um parágrafo: quebras de linha viram " ; ". */
  function textoPar(p) {
    let t = '';
    const els = p.getElementsByTagNameNS(W, '*');
    for (let i = 0; i < els.length; i++) {
      const n = els[i].localName;
      if (n === 't') t += els[i].textContent;
      else if (n === 'tab') t += ' ';
      else if (n === 'br' || n === 'cr') t += ' ; ';
    }
    return t.replace(/\s+/g, ' ').replace(/^[\s;]+|[\s;]+$/g, '');
  }
  /** Texto de uma célula: parágrafos separados por " / ". */
  function textoCel(tc) {
    const ps = tc.getElementsByTagNameNS(W, 'p');
    const out = [];
    for (let i = 0; i < ps.length; i++) { const t = textoPar(ps[i]); if (t) out.push(t); }
    return out.join(' / ');
  }
  /** Células de uma linha com a posição na grade (para tratar mesclagens). */
  function celulas(tr) {
    const out = [];
    let col = 0;
    const gb = filho(filho(tr, 'trPr'), 'gridBefore');
    if (gb) col += +attr(gb, 'val') || 0;
    for (const tc of tr.children) {
      if (tc.localName !== 'tc') continue;
      const pr = filho(tc, 'tcPr');
      const gs = filho(pr, 'gridSpan');
      const span = gs ? (+attr(gs, 'val') || 1) : 1;
      const vmEl = filho(pr, 'vMerge');
      const vm = vmEl ? (attr(vmEl, 'val') === 'restart' ? 'restart' : 'cont') : null;
      out.push({ txt: textoCel(tc), ini: col, fim: col + span - 1, vm });
      col += span;
    }
    return out;
  }

  const ROTULOS = [
    [/^ITEM\b/, 'item'], [/^CEST\b/, 'cest'], [/^NCM/, 'ncm'], [/OPER\.?\s*INTERNA/, 'mva'],
    [/ALIQ\.?\s*4\s*%/, 'mva4'], [/ALIQ\.?\s*7\s*%/, 'mva7'], [/ALIQ\.?\s*12\s*%/, 'mva12'],
    [/^DESCRICAO/, 'desc'], [/^DISPOSITIVO/, 'disp']
  ];
  const ITEM_RE = /^\d{1,3}(\.\d{1,2})?$/;
  const CEST_RE = /^(\d{2})\.(\d{3})\.(\d{2})$/;
  const mvaNum = s => { const t = String(s || '').trim(); return /^-?\d{1,3}(\.\d{3})*,\d{1,2}$/.test(t) ? U.num(t) : null; };
  /** Códigos NCM de uma célula: "3815.12.10 ; 3815.12.90", "2205 / 2208.90.00", "22089000" e posições escritas como "16.02" ou "008.13". */
  function ncmsDe(s) {
    const out = [];
    const resto = String(s || '').replace(/\b\d{4,8}(?:\.\d{1,2}){0,2}\b/g, m => { out.push(U.digits(m)); return ' '; });
    resto.replace(/(?<![\d.])(\d{2,3})\.(\d{2})(?![\d.])/g, (m, a, b) => { out.push(a.slice(-2) + b); return ' '; });
    return U.uniq(out.filter(n => n.length >= 4 && n.length <= 8));
  }

  /** Lê uma tabela do Subanexo: cabeçalho (2 linhas) e itens; células mescladas na vertical herdam o valor de cima. */
  function lerTabela(tbl, tabela, itens) {
    const trs = [];
    for (const c of tbl.children) if (c.localName === 'tr') trs.push(c);
    const cols = []; // { key, ini, fim }
    let r = 0;
    for (; r < Math.min(trs.length, 4); r++) {
      const cs = celulas(trs[r]);
      const achou = cs.filter(c => ROTULOS.some(([re]) => re.test(U.norm(c.txt))));
      if (!achou.length) break;
      cs.forEach(c => {
        const n = U.norm(c.txt);
        const rot = ROTULOS.find(([re]) => re.test(n));
        if (rot && !cols.some(x => x.key === rot[1])) cols.push({ key: rot[1], ini: c.ini, fim: c.fim });
      });
    }
    if (!cols.some(c => c.key === 'cest') || !cols.some(c => c.key === 'ncm')) return 0;
    const colDe = c => {
      let best = null, bestOv = 0;
      cols.forEach(k => { const ov = Math.min(c.fim, k.fim) - Math.max(c.ini, k.ini) + 1; if (ov > bestOv) { bestOv = ov; best = k.key; } });
      return best;
    };
    // ordem das colunas; linha com o número esperado de células é lida pela ordem (as grades do Word variam de linha para linha)
    const ordem = cols.slice().sort((a, b) => a.ini - b.ini).map(c => c.key);
    const ultimo = {};
    let n = 0;
    for (; r < trs.length; r++) {
      const o = {};
      const cs = celulas(trs[r]);
      while (cs.length > ordem.length && !cs[cs.length - 1].txt && !cs[cs.length - 1].vm) cs.pop();
      const porOrdem = cs.length === ordem.length || (cs.length === ordem.length - 1 && ordem[ordem.length - 1] === 'disp');
      cs.forEach((c, i) => {
        const key = porOrdem ? ordem[i] : colDe(c);
        if (!key || key in o) return;
        if (c.vm === 'cont') o[key] = ultimo[key] || '';
        else { o[key] = c.txt; if (c.vm === 'restart') ultimo[key] = c.txt; else delete ultimo[key]; }
      });
      const item = String(o.item || '').trim();
      const cest = String(o.cest || '').replace(/\s+/g, '').match(CEST_RE);
      if (!ITEM_RE.test(item) || !cest) continue; // notas de alteração e itens revogados
      if (/REVOGAD/i.test(o.desc || '') && !mvaNum(o.mva)) continue;
      itens.push({
        seg: cest[1], tab: tabela ? tabela.id : '', cond: tabela && tabela.cond.length ? tabela.cond.join('; ') : '',
        item, cest: cest[1] + cest[2] + cest[3], ncm: ncmsDe(o.ncm),
        mva: mvaNum(o.mva), mva4: mvaNum(o.mva4), mva7: mvaNum(o.mva7), mva12: mvaNum(o.mva12),
        mvaTxt: mvaNum(o.mva) === null && o.mva ? String(o.mva).slice(0, 120) : '',
        desc: String(o.desc || '').replace(/\s*\/\s*/g, ' ').trim(), disp: String(o.disp || '').replace(/\s*\/\s*/g, ' ').trim().slice(0, 160)
      });
      n++;
    }
    return n;
  }

  /** Lê o document.xml do Subanexo. Só o texto em vigor: para no primeiro "REDAÇÃO VIGENTE ATÉ …" depois das tabelas. */
  function lerDocumentXml(xml) {
    const doc = new DOMParser().parseFromString(xml, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('Documento do Word inválido.');
    const body = doc.getElementsByTagNameNS(W, 'body')[0];
    if (!body) throw new Error('Documento do Word sem conteúdo.');
    const segmentos = {}, itens = [];
    let tabela = null, viuTabela = false, titulo = '';
    const decretos = [];
    for (const el of body.children) {
      if (el.localName === 'p') {
        const t = textoPar(el);
        if (!t) continue;
        if (viuTabela && /^REDA[ÇC][ÃA]O (VIGENTE AT[ÉE]|ANTERIOR)/i.test(t)) break;
        if (!titulo && /SUBANEXO/i.test(t)) titulo = t;
        (t.match(/Decreto n[º°o]\s*[\d.]+\/\d{4}/gi) || []).forEach(d => decretos.push(d));
        let m;
        if (!viuTabela && (m = t.match(/^(\d{2})\.\s+(.+)$/))) { segmentos[m[1]] = m[2].replace(/\s*\(.*$/, '').trim(); continue; }
        if ((m = t.match(/^TABELA\s+([IVXL]+(?:-[A-Z])?)\s*$/i))) { tabela = { id: m[1].toUpperCase(), nome: '', cond: [] }; continue; }
        if (tabela && /^\((UFs|Nos casos)/i.test(t)) { tabela.cond.push(t.replace(/^\(|\)$/g, '').trim()); continue; }
      } else if (el.localName === 'tbl') {
        viuTabela = true;
        lerTabela(el, tabela, itens);
        (el.textContent.match(/Decreto n[º°o]\s*[\d.]+\/\d{4}/gi) || []).forEach(d => decretos.push(d));
      }
    }
    if (!itens.length) throw new Error('Nenhum item encontrado — o arquivo é o Subanexo I do Anexo III do RICMS/MS?');
    // decreto mais recente citado no texto em vigor (indica até quando o arquivo está atualizado)
    const num = d => { const m = d.match(/([\d.]+)\/(\d{4})/); return m ? +m[2] * 1e6 + +U.digits(m[1]) : 0; };
    const ultimoDecreto = decretos.sort((a, b) => num(b) - num(a))[0] || '';
    return { segmentos, itens, ultimoDecreto: ultimoDecreto.replace(/n[º°o]\s*/i, 'nº '), titulo };
  }

  /** Lê o Subanexo I a partir do arquivo .docx (ArrayBuffer). */
  function lerDocx(buf) {
    if (!global.XLSX || !global.XLSX.CFB) throw new Error('Biblioteca de leitura não carregada (verifique a conexão).');
    const cfb = global.XLSX.CFB.read(new Uint8Array(buf), { type: 'array' });
    const e = global.XLSX.CFB.find(cfb, 'word/document.xml') || global.XLSX.CFB.find(cfb, '/word/document.xml');
    if (!e) throw new Error('O arquivo não é um .docx. Abra o .doc no Word e salve como "Documento do Word (.docx)".');
    return lerDocumentXml(new TextDecoder('utf-8').decode(e.content));
  }

  /* ============================================================
   * Consulta
   * ============================================================ */
  const cacheIdx = new WeakMap();
  function indice(dados) {
    if (!dados || !dados.itens) return null;
    let idx = cacheIdx.get(dados);
    if (idx) return idx;
    const porCest = new Map(), porNcm = new Map();
    dados.itens.forEach(e => {
      if (!porCest.has(e.cest)) porCest.set(e.cest, []);
      porCest.get(e.cest).push(e);
      (e.ncm || []).forEach(n => { if (!porNcm.has(n)) porNcm.set(n, []); if (!porNcm.get(n).includes(e)) porNcm.get(n).push(e); });
    });
    idx = { dados, porCest, porNcm, ncms: [...porNcm.keys()] };
    cacheIdx.set(dados, idx);
    return idx;
  }

  /** Itens da relação para o produto: pelo CEST informado; sem CEST conhecido, pelo NCM — todos os itens que abrangem o NCM
   *  (cands) e, entre eles, os de código mais específico (especificos: "7013.37.00" é mais específico que "7013"). */
  function buscarItem(dados, cest, ncm) {
    const idx = indice(dados);
    if (!idx) return { por: '', cands: [], especificos: [], cestFora: false };
    cest = U.digits(cest); ncm = U.digits(ncm);
    const temCest = cest.length === 7 && !/^0+$/.test(cest);
    if (temCest && idx.porCest.has(cest)) { const l = idx.porCest.get(cest); return { por: 'cest', cands: l, especificos: l, cestFora: false }; }
    const cands = [], especificos = [];
    if (ncm.length >= 4) {
      for (let n = Math.min(8, ncm.length); n >= 4; n--) {
        const l = idx.porNcm.get(ncm.slice(0, n)) || [];
        if (l.length && !especificos.length) l.forEach(e => especificos.push(e));
        l.forEach(e => { if (!cands.includes(e)) cands.push(e); });
      }
      // NCM truncado (7 dígitos): códigos da relação que começam por ele
      if (!cands.length && ncm.length === 7) idx.ncms.filter(k => k.startsWith(ncm)).forEach(k => idx.porNcm.get(k).forEach(e => { if (!cands.includes(e)) { cands.push(e); especificos.push(e); } }));
    }
    return { por: cands.length ? 'ncm' : '', cands, especificos, cestFora: temCest };
  }

  /** Pesquisa livre (CEST, NCM ou palavras da descrição). */
  function pesquisar(dados, q, limite = 40) {
    if (!dados || !dados.itens) return [];
    const d = U.digits(q);
    const toks = U.tokens(q).filter(t => !/^\d+$/.test(t));
    return dados.itens.filter(e => {
      if (d.length >= 4 && (e.cest.startsWith(d) || (e.ncm || []).some(n => n.startsWith(d) || d.startsWith(n)))) return true;
      if (toks.length) { const n = U.norm(e.desc); return toks.every(t => n.includes(t)); }
      return false;
    }).slice(0, limite);
  }

  const fmtItem = e => `item ${e.item} (CEST ${U.fmtCEST(e.cest)})`;

  global.RST_SUB = { lerDocx, lerDocumentXml, indice, buscarItem, pesquisar, fmtItem };
})(window);
