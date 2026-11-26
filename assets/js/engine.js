/* Revisor ICMS-ST — motor de análise (vínculos, conferências e regras de revisão) */
(function (global) {
  'use strict';
  const U = global.RST_U;
  const L = global.RST_LEGAL;

  const DEFAULT_KEYWORDS = {
    insumo: ['INGREDIENTE', 'INSUMO', 'MATERIA PRIMA', 'MATERIA-PRIMA', 'PARA PRODUCAO', 'P/ PRODUCAO'],
    degustacao: ['DEGUSTACAO', 'AMOSTRA', 'BRINDE', 'CORTESIA'],
    uso_consumo: ['DISPLAY', 'EXPOSITOR', 'CARTAZ', 'FAIXA DE GONDOLA', 'REGUA DE GONDOLA', 'BANNER', 'ADESIVO', 'UNIFORME', 'AVENTAL', 'MATERIAL DE LIMPEZA', 'USO E CONSUMO', 'MATERIAL PROMOCIONAL']
  };
  const DEFAULT_SETTINGS = { aliqInterna: 17, tolerancia: 0.05, difalMetodo: 'por_dentro', tabelaSTCompleta: false, usarSubanexo: true, outrosLimitePct: 30, keywords: DEFAULT_KEYWORDS };
  const ORIGEM_IMPORTADA = ['1', '2', '3', '8'];

  const brl = U.brl, pct = v => U.fmt(v, 2) + '%';
  const q = s => `“${s}”`;

  /* ---------- auxiliares ---------- */
  function settingsOf(state) {
    const s = Object.assign({}, DEFAULT_SETTINGS, state.settings || {});
    s.keywords = Object.assign({}, DEFAULT_KEYWORDS, (state.settings || {}).keywords || {});
    s.aliqInterna = +s.aliqInterna || 17;
    s.tolerancia = Math.max(0.01, +s.tolerancia || 0.05);
    return s;
  }

  function lineKey(l) { return [U.normKey(l.descricao).slice(0, 60), U.round2(l.valorTotal || 0), U.round2(l.icms || 0), U.round2(l.custoFinal || 0), U.round2(l.ipi || 0)].join('|'); }

  /** Une as linhas de várias memórias da mesma cobrança (re-importações ou partes), sem repetir linhas idênticas entre arquivos.
   *  Quando a memória traz a numeração da tela ("Visualizando a - b de N"), cada item tem sua posição e as partes se encaixam por ela. */
  function mergeLines(docs) {
    if (!docs.length) return [];
    const sorted = docs.slice().sort((a, b) => b.data.linhas.length - a.data.linhas.length);
    const totais = U.uniq(sorted.filter(d => d.data.linhas.some(l => l.pos)).map(d => d.data.totalLinhasDeclarado || 0));
    const usarPos = totais.length === 1 && totais[0] > 0;
    const out = [];
    const posUsadas = new Set();
    sorted.forEach(d => {
      // linhas já trazidas por outros arquivos (multiconjunto); linhas idênticas dentro do mesmo arquivo são mantidas
      const pool = new Map(), poolSemPos = new Map();
      out.forEach(o => {
        const k = lineKey(o.line);
        pool.set(k, (pool.get(k) || 0) + 1);
        if (!(usarPos && o.line.pos)) poolSemPos.set(k, (poolSemPos.get(k) || 0) + 1);
      });
      d.data.linhas.forEach(line => {
        const key = lineKey(line);
        if (usarPos && line.pos) {
          if (posUsadas.has(line.pos)) return; // posição já lida (página repetida ou parte importada de novo)
          posUsadas.add(line.pos);
          const c = poolSemPos.get(key) || 0; // a mesma linha já veio de um arquivo sem numeração
          if (c > 0) { poolSemPos.set(key, c - 1); return; }
          out.push({ line, docId: d.id });
          return;
        }
        const c = pool.get(key) || 0;
        if (c > 0) { pool.set(key, c - 1); return; }
        out.push({ line, docId: d.id });
      });
    });
    if (usarPos) out.sort((a, b) => (a.line.pos || 1e9) - (b.line.pos || 1e9));
    return out;
  }

  function ncmCompat(a, b) {
    a = U.digits(a); b = U.digits(b);
    if (!a || !b) return false;
    if (a.length === 8 && b.length === 8) return a === b;
    const s = a.length < b.length ? a : b, l = a.length < b.length ? b : a;
    return s.length >= 6 && l.startsWith(s);
  }

  function kwMatch(desc, list) {
    const n = ' ' + U.norm(desc).replace(/[^A-Z0-9/]+/g, ' ') + ' ';
    return (list || []).find(k => { const kk = U.norm(k).replace(/[^A-Z0-9/]+/g, ' ').trim(); return kk && n.includes(' ' + kk + ' '); }) || null;
  }

  function catKeys(companyId, it) {
    const g = U.digits(it.gtin);
    const d = U.normKey(it.descricao).slice(0, 50);
    const ks = [];
    if (g.length >= 8) ks.push(`${companyId}|G${g}`);
    ks.push(`${companyId}|D${d}`);
    if (g.length >= 8) ks.push(`*|G${g}`);
    ks.push(`*|D${d}`);
    return ks;
  }

  function resolveDestinacao(catalog, it, S) {
    for (const k of catKeys(it.companyId || '?', it)) {
      const e = catalog[k];
      if (e && e.destinacao !== undefined) return { valor: e.destinacao, origem: 'usuario', chave: k, palavra: null };
    }
    const kws = S.keywords || {};
    let w;
    if ((w = kwMatch(it.descricao, kws.insumo))) return { valor: 'insumo', origem: 'sugestao', palavra: w };
    if ((w = kwMatch(it.descricao, kws.degustacao))) return { valor: 'degustacao', origem: 'sugestao', palavra: w };
    if ((w = kwMatch(it.descricao, kws.uso_consumo))) return { valor: 'uso_consumo', origem: 'sugestao', palavra: w };
    return { valor: '', origem: '', palavra: null };
  }

  function findMva(table, it) {
    if (!table || !table.length) return null;
    const cest = U.digits(it.cest), ncm = U.digits(it.ncm);
    let best = null, bestLen = -1;
    table.forEach(e => {
      const ec = U.digits(e.cest), en = U.digits(e.ncm);
      if (cest && ec && ec === cest) {
        if (!en || !ncm || ncm.startsWith(en) || en.startsWith(ncm)) { if (100 > bestLen) { best = e; bestLen = 100; } }
      } else if (!ec || !cest) {
        if (en && ncm && ncm.startsWith(en) && en.length > bestLen) { best = e; bestLen = en.length; }
      }
    });
    return best;
  }

  /** Referência de MVA a partir da relação oficial (Subanexo I). Pelo CEST, o item da nota; sem CEST, os itens de NCM mais
   *  específico. Havendo mais de um, vale a maior MVA entre eles; "todos" guarda a maior MVA entre todos os itens possíveis. */
  function refOficial(o) {
    const temMva = c => c.mva !== undefined && c.mva !== null;
    const todos = o.cands.filter(temMva);
    if (!todos.length) return null;
    const esp = (o.especificos || []).filter(temMva);
    const base = esp.length ? esp : todos;
    const maior = (lst, k) => { const v = lst.map(c => c[k]).filter(x => x !== undefined && x !== null); return v.length ? Math.max(...v) : null; };
    const nomes = base.map(c => `item ${c.item} (CEST ${U.fmtCEST(c.cest)}${c.cond ? `; ${c.cond}` : ''})`);
    const ref = {
      oficial: true, por: o.por, itens: base, mvaOriginal: maior(base, 'mva'), mva4: maior(base, 'mva4'), mva7: maior(base, 'mva7'), mva12: maior(base, 'mva12'),
      fonte: `RICMS/MS, Anexo III, Subanexo I, ${base.length > 1 ? `${nomes.join(', ')} — considerada a maior MVA entre eles` : nomes[0]}`
    };
    if (base.length < todos.length) ref.todos = { mvaOriginal: maior(todos, 'mva'), mva4: maior(todos, 'mva4'), mva7: maior(todos, 'mva7'), mva12: maior(todos, 'mva12'), n: todos.length };
    return ref;
  }

  function mvaParaAliq(e, aInter, aIntra) {
    if (aInter === 0 && e.mvaOriginal !== null && e.mvaOriginal !== undefined && e.mvaOriginal !== '') return +e.mvaOriginal; // operação interna
    const col = aInter === 4 ? 'mva4' : aInter === 7 ? 'mva7' : aInter === 12 ? 'mva12' : null;
    const v = col ? e[col] : null;
    if (v !== null && v !== undefined && v !== '' && !isNaN(+v)) return +v;
    if (e.mvaOriginal !== null && e.mvaOriginal !== undefined && e.mvaOriginal !== '' && aInter > 0) {
      return U.round2(((1 + e.mvaOriginal / 100) * (1 - aInter / 100) / (1 - aIntra / 100) - 1) * 100);
    }
    return null;
  }

  /** Situação da empresa quanto à isenção da Equalização (Dec. 16.177/2023) e à dispensa do MEI. */
  function meStatus(company, refKey, dataEmissao) {
    if (!company) return { status: 'nao' };
    if (company.porte === 'MEI') return { status: 'mei' };
    if (company.porte !== 'ME') return { status: 'nao' };
    const anoRef = +String(refKey || '').slice(0, 4) || new Date().getFullYear();
    const anoAb = company.dataAbertura ? +company.dataAbertura.slice(0, 4) : null;
    if (anoAb && anoAb >= anoRef) return { status: 'nao', motivo: 'ano de início de atividades' };
    if (dataEmissao && dataEmissao < '2023-05-01') return { status: 'nao' };
    if (company.beneficiarioME === 'sim') return { status: 'isenta', motivo: 'empresa consta na lista de beneficiários publicada pela SEFAZ/MS (Dec. 16.177/2023, art. 1º, § 4º)' };
    if (company.beneficiarioME === 'nao') return { status: 'nao' };
    const rb = company.receitaAnoAnterior;
    if (rb !== null && rb !== undefined && rb !== '' && !isNaN(+rb)) {
      let limite = 360000;
      if (anoAb && anoAb === anoRef - 1 && company.dataAbertura) {
        const meses = 12 - (+company.dataAbertura.slice(5, 7)) + 1;
        limite = 30000 * meses;
      }
      return +rb <= limite
        ? { status: 'isenta', motivo: `receita bruta do ano anterior de ${brl(+rb)} (limite ${brl(limite)})` }
        : { status: 'nao', motivo: 'receita acima do limite' };
    }
    return { status: 'verificar' };
  }

  function estimarDifal(it, aIntra, metodo) {
    const v = it.custoFinal || it.base || 0;
    const aInter = it.aliqInter || 7;
    if (metodo === 'simples') return U.round2(v * (aIntra - aInter) / 100);
    const icmsOrig = it.credito > 0 ? it.credito : U.round2((it.bcProprio || v) * aInter / 100);
    const bc = (v - icmsOrig) / (1 - aIntra / 100);
    return Math.max(0, U.round2(bc * aIntra / 100 - icmsOrig));
  }

  function nfTxt(ch) {
    const parts = [`NF-e nº ${ch.numero}`];
    if (ch.dataEmissao) parts.push(`emitida em ${U.brDate(ch.dataEmissao)}`);
    if (ch.cnpjRemetente) parts.push(`pelo remetente CNPJ ${U.fmtCNPJ(ch.cnpjRemetente)}${ch.ufRemetente ? '/' + ch.ufRemetente : ''}`);
    return parts.join(', ');
  }
  const tribTxt = ch => ch.tipo === 'ST' ? `ICMS-ST (tributo ${ch.tributoCodigo || '333'})` : ch.tipo === 'EQ' ? `ICMS Equalização Simples Nacional (tributo ${ch.tributoCodigo || '349'})` : `${ch.tributoNome || 'tributo'} (${ch.tributoCodigo || '—'})`;
  const itTxt = it => `${q(it.descricao)}${it.ncm ? ` (NCM ${U.fmtNCM(it.ncm)}${it.cest ? `, CEST ${U.fmtCEST(it.cest)}` : ''})` : ''}`;

  /* ---------- casamento de itens ST × EQ ---------- */
  function matchSTEQ(stItems, eqItems) {
    const cands = [];
    eqItems.forEach(e => {
      stItems.forEach(s => {
        if (!ncmCompat(s.ncm, e.ncm)) return;
        const dv = Math.abs((s.valorTotal || 0) - (e.valorTotal || 0));
        const valMatch = dv <= 0.011;
        const valClose = (s.valorTotal || 0) > 0 && dv / s.valorTotal <= 0.01;
        const sim = U.similarity(s.descricao, e.descricao);
        let score = 0;
        if (valMatch && sim >= 0.35) score = 2 + sim;
        else if (valClose && sim >= 0.6) score = 1 + sim;
        else if (valMatch && sim >= 0.15 && U.digits(s.ncm) === U.digits(e.ncm)) score = 0.5 + sim;
        if (score > 0) cands.push({ e, s, score, sim, dv });
      });
    });
    cands.sort((a, b) => b.score - a.score);
    const usedE = new Set(), usedS = new Set(), pairs = [];
    cands.forEach(c => {
      if (usedE.has(c.e.id) || usedS.has(c.s.id)) return;
      usedE.add(c.e.id); usedS.add(c.s.id); pairs.push(c);
    });
    return pairs;
  }

  function matchXmlItem(xmlItens, it) {
    if (!xmlItens || !xmlItens.length) return null;
    let best = null, bestScore = 0;
    xmlItens.forEach(x => {
      const dv = Math.abs((x.valorTotal || 0) - (it.valorTotal || 0));
      const sim = U.similarity(x.descricao, it.descricao);
      const g = U.digits(it.gtin) && U.digits(it.gtin) === U.digits(x.gtin);
      let s = 0;
      if (dv <= 0.011) s += 1;
      if (g) s += 1;
      s += sim;
      if (ncmCompat(x.ncm, it.ncm)) s += 0.3;
      if (s > bestScore && (dv <= 0.011 || sim >= 0.7 || g)) { best = x; bestScore = s; }
    });
    return best;
  }

  /* ============================================================
   * Construção do modelo
   * ============================================================ */
  function build(state) {
    const S = settingsOf(state);
    const tol = S.tolerancia, aIntra = S.aliqInterna;
    const companies = new Map((state.companies || []).map(c => [c.id, c]));
    const docs = state.docs || [];
    const catalog = state.catalog || {};
    const mvaTable = state.mvaTable || [];
    // relação oficial do Subanexo I: versão importada pelo usuário ou a que acompanha o app
    const SUB = global.RST_SUB;
    const sub = S.usarSubanexo !== false && SUB ? ((state.subanexo && state.subanexo.itens) ? state.subanexo : (global.RST_SUBANEXO_PADRAO || null)) : null;
    const decisions = state.decisions || {};
    const noteFlags = state.noteFlags || {};
    const onlyCompany = companies.size === 1 ? [...companies.keys()][0] : null;
    const pend = [];

    /* 1. Cobranças a partir dos relatórios de prévia */
    const charges = [];
    docs.filter(d => d.kind === 'previa').forEach(d => {
      const p = d.data;
      (p.notas || []).forEach((n, i) => charges.push({
        id: `${d.id}#${i}`, docId: d.id, companyId: (d.link && d.link.companyId) || null, tipo: p.tipo, tributoCodigo: p.tributoCodigo, tributoNome: p.tributoNome,
        referencia: p.referencia || '', numero: String(n.numero), cnpjRemetente: n.cnpjRemetente, ufRemetente: n.ufRemetente, dataEmissao: n.dataEmissao,
        valorNF: n.valorNF, valorICMS: n.valorICMS, itemDocs: [], origem: 'previa', chave: ''
      }));
    });

    /* 2. Vincula as memórias de cálculo (itens) às cobranças */
    const docCharge = new Map();
    docs.filter(d => d.kind === 'itens').forEach(d => {
      const n = d.data.nota || {};
      const lk = d.link || {};
      const numero = String(+U.digits(lk.numero || n.numero) || '');
      const tipo = lk.tipo || d.data.tipo || null;
      const cnpj = U.digits(lk.cnpjRemetente || n.cnpjRemetente || '');
      let cands = charges.filter(c => c.origem === 'previa' && c.numero === numero && (!tipo || c.tipo === tipo)
        && (!cnpj || !c.cnpjRemetente || c.cnpjRemetente === cnpj)
        && (!lk.companyId || c.companyId === lk.companyId) && (!lk.referencia || c.referencia === lk.referencia));
      if (cands.length > 1 && n.valorICMS) { const v = cands.filter(c => Math.abs(c.valorICMS - n.valorICMS) <= 0.05); if (v.length) cands = v; }
      if (cands.length > 1) { const s = U.sum(d.data.linhas, l => l.icms); const v = cands.filter(c => Math.abs(c.valorICMS - s) <= 0.05); if (v.length) cands = v; }
      if (cands.length > 1) {
        // a mesma NF pode ter sido cobrada em mais de uma referência: a memória vale para todas,
        // desde que sejam do mesmo remetente
        cands.sort((a, b) => String(b.referencia).localeCompare(String(a.referencia)));
        const cnpj0 = cands[0].cnpjRemetente;
        cands = cands.filter(c => c.cnpjRemetente === cnpj0);
      }
      let targets = cands;
      if (!targets.length) {
        const companyId = lk.companyId || onlyCompany || null;
        const tp = tipo || 'EQ';
        const key = `orf:${companyId || ''}|${tp}|${lk.referencia || ''}|${cnpj}|${numero}`;
        let ch = charges.find(c => c.id === key);
        if (!ch) {
          ch = { id: key, docId: null, companyId, tipo: tp, tributoCodigo: tp === 'ST' ? '333' : tp === 'EQ' ? '349' : '', tributoNome: tp === 'ST' ? 'ST Comércio' : tp === 'EQ' ? 'Equalização Simples Nacional' : '',
            referencia: lk.referencia || '', numero, cnpjRemetente: cnpj, ufRemetente: n.ufRemetente || '', dataEmissao: n.dataEmissao || '', valorNF: n.valorNF || 0, valorICMS: 0, itemDocs: [], origem: 'itens', chave: n.chave || '' };
          charges.push(ch);
        }
        targets = [ch];
      }
      targets.forEach(ch => {
        ch.itemDocs.push(d);
        if (n.chave && !ch.chave) ch.chave = n.chave;
        if (!ch.cnpjRemetente && cnpj) ch.cnpjRemetente = cnpj;
        if (!ch.ufRemetente && n.ufRemetente) ch.ufRemetente = n.ufRemetente;
        if (!ch.valorNF && n.valorNF) ch.valorNF = n.valorNF;
        if (!ch.dataEmissao && n.dataEmissao) ch.dataEmissao = n.dataEmissao;
      });
      docCharge.set(d.id, targets[0].id);
    });

    /* 3. Agrupa as cobranças por NF física (empresa + remetente + número) */
    const nfs = new Map();
    const groups = U.groupBy(charges, c => `${c.companyId || '?'}|${c.numero}`);
    Object.values(groups).forEach(list => {
      const cnpjs = U.uniq(list.map(c => c.cnpjRemetente).filter(Boolean));
      list.forEach(c => {
        const cnpj = c.cnpjRemetente || (cnpjs.length === 1 ? cnpjs[0] : '');
        const key = `${c.companyId || '?'}|${cnpj || '?'}|${c.numero}`;
        c.nfKey = key;
        let nf = nfs.get(key);
        if (!nf) { nf = { key, companyId: c.companyId, numero: c.numero, cnpjRemetente: cnpj, ufRemetente: c.ufRemetente, dataEmissao: c.dataEmissao, valorNF: c.valorNF, chave: c.chave, charges: [], xml: null }; nfs.set(key, nf); }
        nf.charges.push(c);
        if (!nf.valorNF && c.valorNF) nf.valorNF = c.valorNF;
        if (!nf.chave && c.chave) nf.chave = c.chave;
        if (!nf.ufRemetente && c.ufRemetente) nf.ufRemetente = c.ufRemetente;
        if (!nf.dataEmissao && c.dataEmissao) nf.dataEmissao = c.dataEmissao;
      });
    });
    // propaga dados da NF às cobranças
    nfs.forEach(nf => nf.charges.forEach(c => {
      if (!c.cnpjRemetente) c.cnpjRemetente = nf.cnpjRemetente;
      if (!c.ufRemetente) c.ufRemetente = nf.ufRemetente;
      if (!c.chave) c.chave = nf.chave;
      if (!c.dataEmissao) c.dataEmissao = nf.dataEmissao;
      if (!c.valorNF) c.valorNF = nf.valorNF;
    }));

    /* 4. XML das NF-e */
    const xmlByChave = new Map(), xmlByNum = new Map();
    docs.filter(d => d.kind === 'nfe').forEach(d => {
      const x = d.data;
      if (x.chave) xmlByChave.set(x.chave, d);
      xmlByNum.set(`${x.emitente.cnpj}|${x.numero}`, d);
    });
    nfs.forEach(nf => {
      nf.xml = (nf.chave && xmlByChave.get(nf.chave)) || xmlByNum.get(`${nf.cnpjRemetente}|${nf.numero}`) || null;
      if (nf.xml) {
        const x = nf.xml.data;
        if (!nf.chave) nf.chave = x.chave;
        if (!nf.valorNF) nf.valorNF = x.valorNF;
        if (!nf.ufRemetente) nf.ufRemetente = x.emitente.uf;
        nf.remetenteNome = x.emitente.nome;
        nf.charges.forEach(c => { if (!c.chave) c.chave = x.chave; if (!c.ufRemetente) c.ufRemetente = x.emitente.uf; });
      }
      // razão social: a digitada pelo usuário prevalece; depois a do XML; sem XML, a consultada pelo CNPJ
      const fo = (state.fornecedores || {})[nf.cnpjRemetente];
      if (fo && fo.razao && (fo.fonte === 'usuário' || !nf.remetenteNome)) nf.remetenteNome = fo.razao;
    });

    /* 5. Itens */
    const items = [];
    const itemsById = new Map();
    charges.forEach(ch => {
      const company = companies.get(ch.companyId);
      const nf = nfs.get(ch.nfKey);
      const lines = mergeLines(ch.itemDocs);
      // itens que faltam na memória, pela numeração da tela ("Visualizando a - b de N")
      const totalDecl = ch.itemDocs.reduce((mx, d) => Math.max(mx, d.data.totalLinhasDeclarado || 0), 0);
      ch.totalItensDeclarado = totalDecl;
      const posLidas = new Set(lines.map(l => l.line.pos).filter(Boolean));
      const semPos = lines.length - lines.filter(l => l.line.pos).length;
      ch.itensFaltando = totalDecl && posLidas.size && totalDecl - posLidas.size > semPos ? U.faixasFaltantes(posLidas, totalDecl) : [];
      const occ = new Map();
      ch.itens = lines.map((ln, idx) => {
        const it = Object.assign({}, ln.line, {
          id: `${ch.id}|${idx}`, chargeId: ch.id, docId: ln.docId, companyId: ch.companyId, tipo: ch.tipo, referencia: ch.referencia,
          numero: ch.numero, cnpjRemetente: ch.cnpjRemetente, ufRemetente: ch.ufRemetente, nfKey: ch.nfKey
        });
        const k = `${U.normKey(it.descricao).slice(0, 40)}~${U.round2(it.valorTotal || 0)}~${U.round2(it.icms || 0)}`;
        const o = occ.get(k) || 0; occ.set(k, o + 1); it.stableKey = `${k}~${o}`;
        if (nf && nf.xml) it.xmlItem = matchXmlItem(nf.xml.data.itens, it);
        if (it.xmlItem && !it.cest && it.xmlItem.cest) it.cestXml = it.xmlItem.cest;
        if (ch.tipo === 'ST') {
          it.aliqIntra = it.aliqST > 0 ? it.aliqST : aIntra;
          const efetiva = it.bcProprio > 0 ? (it.credito || 0) / it.bcProprio * 100 : 0;
          const porUF = U.aliqInterestadualParaMS(ch.ufRemetente);
          // origem da mercadoria: XML (orig) ou 1º dígito do CST com origem — 3 dígitos (origem + CST) ou 4 dígitos (origem + CSOSN)
          const cst3 = String(it.cst || '').trim();
          const cstValido = /^\d(00|10|20|30|40|41|50|51|60|70|90)$/.test(cst3) || /^\d(101|102|103|201|202|203|300|400|500|900)$/.test(cst3);
          it.importado = it.xmlItem ? ORIGEM_IMPORTADA.includes(String(it.xmlItem.orig)) : (cstValido && ORIGEM_IMPORTADA.includes(cst3.charAt(0)));
          if (it.aliqProprio > 0) { it.aliqInter = U.snapAliqInter(it.aliqProprio); it.aliqInterFonte = 'alíquota destacada na NF'; }
          else if (efetiva > 0) { it.aliqInter = U.snapAliqInter(efetiva); it.aliqInterFonte = 'crédito admitido pela SEFAZ'; }
          else if (it.importado) { it.aliqInter = 4; it.aliqInterFonte = 'mercadoria importada (Res. SF nº 13/2012)'; }
          else { it.aliqInter = porUF || 0; it.aliqInterFonte = 'UF de origem (Res. SF nº 22/1989)'; }
          it.temPauta = (it.bcPmpf || 0) > 0 || (it.pmpf || 0) > 0;
          const custo = it.custoFinal || 0;
          if (custo > 0 && it.bcST > 0 && !it.temPauta) {
            const redF = (it.redBC > 0 && it.redBC < 100) ? (1 - it.redBC / 100) : 1;
            it.mvaAj = U.round2((it.bcST / (custo * redF) - 1) * 100);
            const ai = it.aliqInter > 0 ? it.aliqInter : (porUF || 7);
            it.mvaOrig = U.round2(((1 + it.mvaAj / 100) * (1 - it.aliqIntra / 100) / (1 - ai / 100) - 1) * 100);
          } else { it.mvaAj = null; it.mvaOrig = null; }
          it.icmsCalc = U.round2(U.round2((it.bcST || 0) * it.aliqIntra / 100) - (it.credito || 0));
          it.base = custo;
          it.dest = resolveDestinacao(catalog, it, S);
          // referência de MVA: a tabela do usuário prevalece; sem ela, a relação oficial (Subanexo I)
          it.mvaRef = findMva(mvaTable, it);
          it.oficial = sub ? SUB.buscarItem(sub, it.cest || it.cestXml, it.ncm) : null;
          if (!it.mvaRef && it.oficial && it.oficial.cands.length) it.mvaRef = refOficial(it.oficial);
          it.mvaTab = it.mvaRef ? mvaParaAliq(it.mvaRef, it.aliqInter, it.aliqIntra) : null;
          it.mvaTabTodos = it.mvaRef && it.mvaRef.todos ? mvaParaAliq(it.mvaRef.todos, it.aliqInter, it.aliqIntra) : it.mvaTab;
        } else {
          it.base = U.round2((it.valorTotal || 0) + (it.frete || 0) + (it.seguro || 0) + (it.ipi || 0) + (it.outros || 0) - (it.desconto || 0));
          it.icmsCalc = U.round2(it.base * (it.percentual || 0) / 100);
          it.dest = resolveDestinacao(catalog, it, S);
          it.mvaRef = findMva(mvaTable, it);
        }
        items.push(it); itemsById.set(it.id, it);
        return it;
      });
      ch.somaItensICMS = U.round2(U.sum(ch.itens, i => i.icms));
      ch.somaBase = U.round2(U.sum(ch.itens, i => i.base));
      if (ch.origem === 'itens') ch.valorICMS = ch.somaItensICMS;
      ch.companyNome = company ? (company.nomeFantasia || company.razaoSocial) : '';
    });
    const chargesById = new Map(charges.map(c => [c.id, c]));

    /* 6. Regras */
    const findings = [];
    const seen = new Set();
    const add = (ruleId, ch, it, vals, txt, extra = {}) => {
      const R = L.REGRAS[ruleId];
      const forca = extra.forca || R.forca;
      const escopo = it ? 'item' : 'nota';
      const id = [ruleId, ch.companyId || '?', ch.referencia || '?', ch.tipo, ch.cnpjRemetente || '?', ch.numero, it ? it.stableKey : 'NF'].join('|');
      if (seen.has(id)) return;
      seen.add(id);
      const dec = decisions[id] || {};
      findings.push({
        id, ruleId, regra: R.nome, categoria: R.categoria, forca, integral: 'integral' in extra ? extra.integral : R.integral, escopo,
        companyId: ch.companyId, referencia: ch.referencia, tipo: ch.tipo, tributoCodigo: ch.tributoCodigo, tributoNome: ch.tributoNome,
        chargeId: ch.id, nfKey: ch.nfKey, numero: ch.numero, cnpjRemetente: ch.cnpjRemetente, ufRemetente: ch.ufRemetente, dataEmissao: ch.dataEmissao, chave: ch.chave,
        itemId: it ? it.id : null, descricao: it ? it.descricao : '', ncm: it ? it.ncm : '', cest: it ? it.cest : '', gtin: it ? it.gtin : '',
        valorItem: it ? U.round2(it.base || it.valorTotal || 0) : U.round2(ch.valorNF || 0), icmsCobrado: U.round2(it ? (it.icms || 0) : (ch.valorICMS || 0)),
        valorRevisar: Math.max(0, U.round2(vals.revisar || 0)), valorDevido: vals.devido !== undefined && vals.devido !== null ? U.round2(vals.devido) : null,
        resumo: txt.resumo, fundamentacao: txt.fund, baseLegal: extra.base || R.base, documentos: extra.docs || R.docs, acao: extra.acao || R.acao,
        status: dec.status || 'novo', protocolo: dec.protocolo || '', dataPedido: dec.data || '', obs: dec.obs || ''
      });
    };

    nfs.forEach(nf => {
      const company = companies.get(nf.companyId);
      const flag = noteFlags[nf.key];
      const stCh = nf.charges.filter(c => c.tipo === 'ST');
      const eqCh = nf.charges.filter(c => c.tipo === 'EQ');

      // Situação informada pelo usuário (devolução, cancelamento, operação não realizada…)
      if (flag && flag.situacao) {
        const sitNome = L.SITUACOES_NF[flag.situacao] || flag.situacao;
        const motivo = {
          devolvida: 'foi objeto de devolução integral, não havendo entrada definitiva das mercadorias no estabelecimento',
          cancelada: 'foi cancelada pelo emitente',
          nao_realizada: 'não se concretizou: as mercadorias não foram recebidas (evento "Operação não Realizada", Ajuste SINIEF 07/2005)',
          desconhecida: 'é desconhecida pelo contribuinte (evento "Desconhecimento da Operação", Ajuste SINIEF 07/2005)'
        }[flag.situacao] || 'não se realizou';
        nf.charges.forEach(ch => add('NF_SITUACAO', ch, null, { revisar: ch.valorICMS }, {
          resumo: `${sitNome}: desvincular a NF da cobrança (${brl(ch.valorICMS)}).`,
          fund: `A operação documentada pela ${nfTxt(ch)} ${motivo}${flag.obs ? ` (${flag.obs})` : ''}. Inexistindo o fato gerador que fundamenta a cobrança antecipada (LC nº 87/1996, art. 12; CTN, art. 114), requer-se a desvinculação da NF da cobrança do ${tribTxt(ch)} da referência ${U.refLabel(ch.referencia)}, no valor de ${brl(ch.valorICMS)} (Res. SEFAZ nº 3.033/2019, art. 2º), ou a restituição, se já recolhido (CTN, art. 165, I).`
        }));
      }

      // NF de outro destinatário (XML)
      if (nf.xml && company && company.cnpj) {
        const dest = nf.xml.data.destinatario || {};
        if (dest.cnpj && dest.cnpj !== company.cnpj) {
          nf.charges.forEach(ch => add('NF_DEST', ch, null, { revisar: ch.valorICMS }, {
            resumo: `XML aponta outro destinatário (${U.fmtCNPJ(dest.cnpj)}).`,
            fund: `O XML da ${nfTxt(ch)} indica como destinatário o CNPJ ${U.fmtCNPJ(dest.cnpj)}${dest.nome ? ` (${dest.nome})` : ''}, diverso do contribuinte (CNPJ ${U.fmtCNPJ(company.cnpj)}). A nota foi vinculada indevidamente à apuração desta inscrição. Requer-se a desvinculação da NF da cobrança do ${tribTxt(ch)} da referência ${U.refLabel(ch.referencia)}, no valor de ${brl(ch.valorICMS)} (Res. SEFAZ nº 3.033/2019, arts. 1º e 2º).`
          }));
        }
      }

      // Mesma NF cobrada em mais de uma referência
      ['ST', 'EQ', 'DIFAL', 'OUTRO'].forEach(tp => {
        const list = nf.charges.filter(c => c.tipo === tp && c.origem === 'previa').sort((a, b) => String(a.referencia).localeCompare(String(b.referencia)));
        for (let i = 1; i < list.length; i++) {
          const ch = list[i], prev = list[0];
          add('DUP_PERIODO', ch, null, { revisar: ch.valorICMS }, {
            resumo: `Já cobrada na referência ${U.refLabel(prev.referencia)} (${brl(prev.valorICMS)}).`,
            fund: `A ${nfTxt(ch)} já foi incluída na cobrança do ${tribTxt(prev)} da referência ${U.refLabel(prev.referencia)} (ICMS de ${brl(prev.valorICMS)}) e voltou a ser cobrada na referência ${U.refLabel(ch.referencia)} (ICMS de ${brl(ch.valorICMS)}). O mesmo fato gerador não pode ser exigido duas vezes. Requer-se a desvinculação da NF da cobrança da referência ${U.refLabel(ch.referencia)} (Res. SEFAZ nº 3.033/2019, art. 2º) ou, se já recolhido, a restituição do valor pago em duplicidade (CTN, art. 165, I; Res. SEFAZ nº 3.426/2025). Confirme que não se trata de cobrança complementar.`
          });
        }
      });

      // Duplicidade item a item: ST × Equalização
      const pairsAll = [];
      eqCh.forEach(ec => stCh.slice().sort((a, b) => (a.referencia === ec.referencia ? 0 : 1) - (b.referencia === ec.referencia ? 0 : 1)).forEach(sc => {
        if (sc.referencia && ec.referencia && sc.referencia !== ec.referencia && Math.abs(monthDiff(sc.referencia, ec.referencia)) > 2) return;
        matchSTEQ(sc.itens.filter(i => !i.dupEQ), ec.itens.filter(i => !i.dupST)).forEach(p => {
          p.sc = sc; p.ec = ec; pairsAll.push(p);
          p.e.dupST = p.s.id; p.s.dupEQ = p.e.id;
          add('DUP_ST_EQ', ec, p.e, { revisar: p.e.icms }, {
            resumo: `Mesmo item cobrado na ST (${brl(p.s.icms)}) e na Equalização (${brl(p.e.icms)}).`,
            fund: `O item ${itTxt(p.e)} da ${nfTxt(ec)} foi incluído simultaneamente na cobrança do ${tribTxt(sc)} (ref. ${U.refLabel(sc.referencia)}, ICMS de ${brl(p.s.icms)}) e na do ${tribTxt(ec)} (ref. ${U.refLabel(ec.referencia)}, ICMS de ${brl(p.e.icms)}), com o mesmo valor de mercadoria (${brl(p.e.valorTotal)}). Nos termos do art. 3º, § 1º, II, "a", do Decreto nº 15.055/2018, a Equalização não se aplica às aquisições de mercadorias submetidas ao regime de substituição tributária. A exigência simultânea dos dois tributos sobre a mesma mercadoria configura bis in idem. Requer-se a exclusão do item da cobrança da Equalização, no valor de ${brl(p.e.icms)} — ou, caso se entenda que a mercadoria não está sujeita à ST, a exclusão do item da cobrança do ICMS-ST (${brl(p.s.icms)}), mantida a Equalização.`
          });
        });
      }));

      // Bases somadas (ST + EQ) acima do valor da NF
      if (nf.valorNF > 0) {
        const byRef = U.groupBy(nf.charges.filter(c => (c.tipo === 'ST' || c.tipo === 'EQ') && c.itens.length), c => c.referencia || '?');
        Object.values(byRef).forEach(list => {
          const baseST = U.round2(U.sum(list.filter(c => c.tipo === 'ST'), c => c.somaBase));
          const baseEQ = U.round2(U.sum(list.filter(c => c.tipo === 'EQ'), c => c.somaBase));
          // o frete (rateio do CT-e, frete FOB) integra a base, mas não o valor da NF
          const frete = U.round2(U.sum(list, c => U.sum(c.itens, i => i.frete || 0)));
          const excesso = U.round2(baseST + baseEQ - frete - nf.valorNF);
          const explicado = U.round2(U.sum(pairsAll.filter(p => list.includes(p.ec)), p => p.e.base));
          const resto = U.round2(excesso - explicado);
          if (resto > Math.max(1, nf.valorNF * 0.002)) {
            const eq = list.find(c => c.tipo === 'EQ');
            const st = list.find(c => c.tipo === 'ST');
            const alvo = eq || st;
            const taxa = eq ? (eq.somaBase > 0 ? U.sum(eq.itens, i => i.icms) / eq.somaBase : 0.1) : (st.somaBase > 0 ? st.somaItensICMS / st.somaBase : 0);
            const est = U.round2(resto * taxa);
            add('DUP_BASES', alvo, null, { revisar: est }, {
              resumo: `ST ${brl(baseST)} + EQ ${brl(baseEQ)}${frete ? ` − frete ${brl(frete)}` : ''} = ${brl(baseST + baseEQ - frete)} > valor da NF ${brl(nf.valorNF)}.`,
              fund: `Na ${nfTxt(alvo)}, de valor total ${brl(nf.valorNF)}, a soma das bases utilizadas nas cobranças da referência ${U.refLabel(alvo.referencia)} — ICMS-ST: ${brl(baseST)}; Equalização: ${brl(baseEQ)} — totaliza ${brl(baseST + baseEQ)}${frete ? ` (${brl(baseST + baseEQ - frete)} sem o frete de ${brl(frete)}, que não integra o valor da nota)` : ''}, superando o valor da própria nota em ${brl(resto)} não explicados por itens já identificados. Como cada mercadoria só pode integrar uma das sistemáticas (art. 3º, § 1º, II, "a", do Decreto nº 15.055/2018) e a base está limitada ao valor da operação (LC nº 87/1996, art. 8º; Decreto nº 15.055/2018, art. 4º), o excedente evidencia itens computados em duplicidade. Requer-se a revisão da apuração com a exclusão dos itens repetidos; valor estimado cobrado a maior: ${brl(est)}.`
            }, { integral: false });
          }
        });
      }
    });

    // Regras por cobrança
    charges.forEach(ch => {
      const company = companies.get(ch.companyId);
      const nf = nfs.get(ch.nfKey);
      const me = meStatus(company, ch.referencia, ch.dataEmissao);
      const industrial = company ? (company.industrial === true || (company.industrial !== false && company.cnaePrincipal && U.cnaeIndustrial(company.cnaePrincipal.codigo))) : false;
      const alimentacao = company ? [company.cnaePrincipal].concat(company.cnaesSecundarios || []).filter(Boolean).find(c => U.cnaeAlimentacao(c.codigo)) : null;

      // Itens repetidos na mesma memória. Sem o XML, se as bases da NF (ST + EQ, sem frete) cabem no valor da nota,
      // as linhas repetidas tendem a ser linhas distintas da própria NF (mesmo produto lançado mais de uma vez)
      const cabeNaNF = !!(nf && nf.valorNF > 0) && U.sum(nf.charges.filter(c => c.referencia === ch.referencia && (c.tipo === 'ST' || c.tipo === 'EQ')),
        c => U.sum(c.itens || [], i => (i.base || 0) - (i.frete || 0))) <= nf.valorNF + 0.05;
      const grp = U.groupBy(ch.itens, it => [U.normKey(it.descricao), it.ncm, U.round2(it.valorTotal || 0), U.round2(it.ipi || 0), U.round2(it.icms || 0), U.round2(it.qtdTrib || it.qtd || 0), U.round2(it.frete || 0)].join('|'));
      Object.values(grp).filter(g => g.length > 1).forEach(g => {
        let xmlCount = null;
        if (nf && nf.xml) xmlCount = nf.xml.data.itens.filter(x => Math.abs((x.valorTotal || 0) - (g[0].valorTotal || 0)) <= 0.011 && U.similarity(x.descricao, g[0].descricao) >= 0.5).length;
        if (xmlCount !== null && xmlCount >= g.length) return;
        const extras = xmlCount !== null ? g.length - Math.max(xmlCount, 1) : g.length - 1;
        g.slice(g.length - extras).forEach(it => add('DUP_ITEM', ch, it, { revisar: it.icms }, {
          resumo: `Linha idêntica aparece ${g.length} vezes na memória${xmlCount !== null ? ` (XML: ${xmlCount})` : ''}.${xmlCount === null && cabeNaNF ? ' As bases cabem no valor da NF: podem ser linhas distintas da nota — confira no XML.' : ''}`,
          fund: `Na memória de cálculo do ${tribTxt(ch)} da ${nfTxt(ch)} (referência ${U.refLabel(ch.referencia)}), o item ${itTxt(it)} aparece ${g.length} vezes com valores idênticos (mercadoria ${brl(it.valorTotal)}, ICMS ${brl(it.icms)} por linha). ${xmlCount !== null ? `O XML da NF-e contém ${xmlCount} ocorrência(s) do item, o que confirma a duplicidade.` : 'Confira no DANFE/XML se o item consta em linhas distintas da nota.'} Requer-se a exclusão da linha repetida, no valor de ${brl(it.icms)}.`
        }, { forca: xmlCount !== null ? 'forte' : (cabeNaNF ? 'atencao' : 'moderada'), integral: true }));
      });

      if (ch.tipo === 'ST') {
        ch.itens.forEach(it => {
          // ST já retido pelo remetente (XML)
          if (it.xmlItem && (it.xmlItem.vICMSST || 0) > 0) {
            add('ST_RETIDO', ch, it, { revisar: it.icms }, {
              resumo: `XML: remetente reteve ICMS-ST de ${brl(it.xmlItem.vICMSST)} no item.`,
              fund: `Conforme o XML da ${nfTxt(ch)}, o remetente reteve o ICMS-ST na própria nota (ICMS-ST destacado de ${brl(it.xmlItem.vICMSST)} no item ${itTxt(it)}), na condição de substituto tributário (Convênio ICMS 142/2018, cláusula oitava; recolhimento por GNRE vinculada à NF-e, cláusula décima oitava). A nova exigência do imposto do destinatário sobre a mesma mercadoria configura duplicidade. Requer-se a exclusão do item da cobrança do ${tribTxt(ch)} da referência ${U.refLabel(ch.referencia)}, no valor de ${brl(it.icms)}, mediante apresentação da GNRE e do comprovante de pagamento.`
            });
          }
          // Erro de cálculo
          if (it.bcST > 0 && (it.icms || 0) - it.icmsCalc > tol) {
            const dif = U.round2(it.icms - it.icmsCalc);
            add('ST_CALCULO', ch, it, { revisar: dif, devido: it.icmsCalc }, {
              resumo: `Recalculado: ${brl(it.icmsCalc)}; cobrado: ${brl(it.icms)}.`,
              fund: `Recalculando a memória do ICMS-ST do item ${itTxt(it)} da ${nfTxt(ch)}: base de cálculo ST de ${brl(it.bcST)} × alíquota interna de ${pct(it.aliqIntra)} = ${brl(U.round2(it.bcST * it.aliqIntra / 100))}, deduzido o crédito admitido de ${brl(it.credito || 0)}, resulta em ${brl(it.icmsCalc)}; contudo, foi exigido ${brl(it.icms)}. Nos termos do art. 8º, § 5º, da LC nº 87/1996 e da cláusula décima terceira do Convênio ICMS 142/2018, o imposto por substituição corresponde à diferença entre o imposto calculado à alíquota interna sobre a base ST e o imposto da operação própria. Requer-se a revisão do item para ${brl(it.icmsCalc)}, com exclusão de ${brl(dif)}.`
            });
          }
          // Crédito da operação própria a menor
          {
            let esperado = null, motivo = '', forte = true;
            if (it.xmlItem && it.xmlItem.vICMS > 0) { esperado = it.xmlItem.vICMS; motivo = 'ICMS destacado no XML da NF-e'; }
            else if (it.aliqProprio > 0) { esperado = U.round2((it.bcProprio || 0) * it.aliqProprio / 100); motivo = `alíquota de ${pct(it.aliqProprio)} destacada na NF`; }
            else if (it.bcProprio > 0) {
              const ai = it.importado ? 4 : U.aliqInterestadualParaMS(ch.ufRemetente);
              if (ai > 0) { esperado = U.round2(it.bcProprio * ai / 100); motivo = it.importado ? 'mercadoria importada — 4% (Res. SF nº 13/2012)' : `remetente em ${ch.ufRemetente} com destino a MS — ${ai}% (Res. SF nº 22/1989)`; forte = false; }
            }
            if (esperado !== null && esperado - (it.credito || 0) > tol) {
              const dif = U.round2(esperado - (it.credito || 0));
              add('ST_CREDITO', ch, it, { revisar: dif }, {
                resumo: `Crédito admitido ${brl(it.credito || 0)}; devido ${brl(esperado)} (${motivo}).`,
                fund: `No item ${itTxt(it)} da ${nfTxt(ch)}, a base da operação própria é ${brl(it.bcProprio)} e o imposto da operação própria corresponde a ${brl(esperado)} (${motivo}); a memória de cálculo admitiu apenas ${brl(it.credito || 0)}. A dedução do imposto da operação própria decorre da não cumulatividade (CF/88, art. 155, § 2º, I) e do art. 8º, § 5º, da LC nº 87/1996 (Convênio ICMS 142/2018, cláusula décima terceira e § 1º). Requer-se a revisão para admitir o crédito integral, reduzindo a cobrança em ${brl(dif)}.`
              }, { forca: forte ? 'forte' : 'moderada' });
            }
          }
          // MVA acima da tabela de referência
          if (it.mvaTab !== null && it.mvaTab !== undefined && it.mvaAj !== null && it.mvaAj > it.mvaTab + 0.05) {
            const bc = U.round2((it.custoFinal || 0) * (1 + it.mvaTab / 100));
            const calc = U.round2(U.round2(bc * it.aliqIntra / 100) - (it.credito || 0));
            const dif = U.round2((it.icms || 0) - calc);
            // sem CEST, a referência é o item de NCM mais específico; se a MVA aplicada não supera a de todos os itens
            // possíveis para o NCM, o pedido depende de o produto corresponder ao item específico (moderada)
            const pelaNcm = !!(it.mvaRef.oficial && it.mvaRef.por === 'ncm' && it.mvaRef.todos);
            const acimaDeTodos = !pelaNcm || it.mvaTabTodos === null || it.mvaTabTodos === undefined || it.mvaAj > it.mvaTabTodos + 0.05;
            if (dif > tol) add('ST_MVA_TAB', ch, it, { revisar: dif, devido: calc }, {
              resumo: `MVA aplicada ${pct(it.mvaAj)} > ${it.mvaRef.oficial ? 'Subanexo I' : 'tabela'} ${pct(it.mvaTab)}.${acimaDeTodos ? '' : ` Sem CEST na nota: vale se o produto corresponder ao item de NCM específico (itens genéricos do NCM chegam a ${pct(it.mvaTabTodos)}).`}`,
              fund: `A base de cálculo do ICMS-ST do item ${itTxt(it)} da ${nfTxt(ch)} foi apurada com MVA ajustada de ${pct(it.mvaAj)}, superior à MVA de ${pct(it.mvaTab)} prevista para a mercadoria${it.mvaRef.fonte ? ` (${it.mvaRef.fonte})` : ''} nas operações interestaduais a ${pct(it.aliqInter)}.${acimaDeTodos ? '' : ` A nota não informa o CEST; pelo NCM ${U.fmtNCM(it.ncm)}, o produto corresponde ao item de classificação específica da relação, que prevalece sobre os itens de descrição genérica (estes com MVA de até ${pct(it.mvaTabTodos)}).`} Pela LC nº 87/1996, art. 8º, II, "c", e § 4º, a margem deve observar a legislação (RICMS/MS, Anexo III, Subanexo I). Recalculada a base (${brl(bc)}), o imposto devido é ${brl(calc)}; requer-se a exclusão da diferença de ${brl(dif)}.`
            }, { forca: acimaDeTodos ? 'forte' : 'moderada' });
          }
          const semCest = !U.digits(it.cest) || /^0+$/.test(U.digits(it.cest));
          // fora da relação oficial: nem o CEST nem o NCM (completo, 8 dígitos) constam do Subanexo I — e o usuário não cadastrou o item
          const foraOficial = !!(it.oficial && !it.oficial.cands.length && U.digits(it.ncm).length === 8 && !findMva(mvaTable, it));
          // Sem CEST
          if (semCest && !foraOficial) {
            const naLista = !!(it.oficial && it.oficial.cands.length);
            const exLista = naLista ? it.oficial.cands.slice(0, 3).map(c => `item ${c.item} (CEST ${U.fmtCEST(c.cest)}) — ${c.desc}`).join('; ') + (it.oficial.cands.length > 3 ? `; e mais ${it.oficial.cands.length - 3}` : '') : '';
            add('ST_SEM_CEST', ch, it, { revisar: it.icms }, naLista ? {
              resumo: `NF sem CEST; o NCM ${U.fmtNCM(it.ncm)} aparece no Subanexo I — confira se o produto corresponde à descrição oficial.`,
              fund: `O item ${itTxt(it)} da ${nfTxt(ch)} foi submetido ao ICMS-ST sem que a nota informasse o CEST. O NCM ${U.fmtNCM(it.ncm)} aparece na relação do Subanexo I do Anexo III do RICMS/MS em: ${exLista}. A substituição tributária alcança apenas os bens que correspondam ao CEST, ao NCM/SH e à descrição da relação (Convênio ICMS 142/2018, cláusula sétima, caput e §§ 1º e 5º): coincidir o NCM não basta. Verificado que o produto não corresponde a nenhuma dessas descrições, requer-se a exclusão do item da cobrança, no valor de ${brl(it.icms)}.`
            } : {
              resumo: `NF sem CEST para o item${it.cestXml ? ` (XML: ${U.fmtCEST(it.cestXml)})` : ''} — conferir enquadramento na ST.`,
              fund: `O item ${itTxt(it)} da ${nfTxt(ch)} foi submetido ao ICMS-ST sem que a nota informasse o CEST. A substituição tributária alcança apenas os bens identificados nos Anexos do Convênio ICMS 142/2018 e reproduzidos na legislação estadual pelo CEST, NCM/SH e descrição (cláusula sétima, caput e §§ 1º e 5º); se a descrição do produto não corresponder à de item da relação, a ST não se aplica. Verificado que o produto não corresponde a nenhum item do Subanexo I do Anexo III do RICMS/MS, requer-se a exclusão do item da cobrança, no valor de ${brl(it.icms)}.`
            }, naLista ? { forca: 'atencao' } : {});
          }
          // Fora da relação de ST: relação oficial (Subanexo I) ou, sem ela, tabela do usuário marcada como completa
          const foraUsuario = !sub && S.tabelaSTCompleta && mvaTable.length && !it.mvaRef;
          if (foraOficial || foraUsuario) {
            const eqDev = me.status === 'isenta' ? 0 : U.round2((it.custoFinal || 0) * Math.max(0, aIntra - (it.aliqInter || 7)) / 100);
            add('ST_FORA_TAB', ch, it, { revisar: U.round2(it.icms - eqDev), devido: eqDev }, foraOficial ? {
              resumo: `${semCest ? 'Sem CEST, e o NCM' : `CEST ${U.fmtCEST(it.cest)} e NCM`} ${U.fmtNCM(it.ncm)} fora da relação do Subanexo I.`,
              fund: `O item ${itTxt(it)} da ${nfTxt(ch)} não consta da relação de mercadorias sujeitas à substituição tributária em MS — RICMS/MS, Anexo III, Subanexo I${sub.ultimoDecreto ? ` (redação com alterações até o ${sub.ultimoDecreto})` : ''}: ${semCest ? 'a nota não informa o CEST e' : `o CEST ${U.fmtCEST(it.cest)} informado na nota não consta da relação e`} nenhum item da relação abrange o NCM ${U.fmtNCM(it.ncm)}. Ausente o enquadramento na legislação estadual e nos Anexos do Convênio ICMS 142/2018 (cláusula sétima), não há fundamento para a exigência do ICMS-ST. Requer-se a exclusão do item da cobrança, sujeitando-se a mercadoria apenas à Equalização (${brl(eqDev)}, Decreto nº 15.055/2018); valor a revisar: ${brl(it.icms - eqDev)}.`
            } : {
              resumo: `NCM/CEST não consta na tabela de ST cadastrada.`,
              fund: `O item ${itTxt(it)} da ${nfTxt(ch)} não consta da relação de mercadorias sujeitas à substituição tributária em MS (RICMS/MS, Anexo III, Subanexo I, conforme tabela cadastrada). Ausente o enquadramento na legislação estadual e nos Anexos do Convênio ICMS 142/2018 (cláusula sétima), não há fundamento para a exigência do ICMS-ST. Requer-se a exclusão do item da cobrança, sujeitando-se a mercadoria apenas à Equalização (${brl(eqDev)}, Decreto nº 15.055/2018); valor a revisar: ${brl(it.icms - eqDev)}.`
            });
          }
          // Destinação: uso e consumo / brinde / degustação / ativo
          const dv = it.dest && it.dest.valor;
          if (['uso_consumo', 'degustacao', 'ativo'].includes(dv)) {
            const isento = me.status === 'isenta' || me.status === 'mei';
            const devido = isento ? 0 : estimarDifal(it, it.aliqIntra, S.difalMetodo);
            const rev = U.round2((it.icms || 0) - devido);
            const destinoTxt = { uso_consumo: 'uso e consumo do estabelecimento', degustacao: 'distribuição gratuita (brinde, amostra ou degustação)', ativo: 'o ativo imobilizado' }[dv];
            if (rev > tol) add('ST_USO', ch, it, { revisar: rev, devido }, {
              resumo: `${it.dest.origem === 'usuario' ? 'Destinação informada' : `Sugestão pela descrição (${it.dest.palavra})`}: ${L.DESTINACOES[dv]}. Devido estimado ${brl(devido)}.`,
              fund: `O item ${itTxt(it)} da ${nfTxt(ch)} foi adquirido para ${destinoTxt}, e não para revenda. A substituição tributária presume operação subsequente que, no caso, não ocorrerá; a Constituição assegura a restituição quando o fato gerador presumido não se realiza (CF/88, art. 150, § 7º; LC nº 87/1996, art. 10). Para bens de uso e consumo ou do ativo, a ST alcança apenas o diferencial de alíquotas, calculado sem MVA (Convênio ICMS 142/2018, cláusulas primeira, § 1º, décima segunda e décima terceira; LC nº 123/2006, art. 13, § 1º, XIII, "h").${isento ? ' A empresa é beneficiária da isenção do Decreto nº 16.177/2023 (art. 1º, II), de modo que nenhum valor é devido.' : ` Valor devido estimado (diferencial de alíquotas${S.difalMetodo === 'simples' ? '' : ', base "por dentro"'}): ${brl(devido)}.`} Requer-se a revisão da cobrança em ${brl(rev)}.`
            });
          }
          if (dv === 'insumo') {
            const isento = me.status === 'isenta' || me.status === 'mei';
            const devido = isento ? 0 : U.round2((it.custoFinal || 0) * Math.max(0, aIntra - (it.aliqInter || 7)) / 100);
            const rev = U.round2((it.icms || 0) - devido);
            const cnaeTxt = industrial ? `atividade industrial — CNAE ${company.cnaePrincipal.codigo}` : alimentacao ? `CNAE ${alimentacao.codigo} — ${alimentacao.descricao}` : 'conforme atividade do estabelecimento';
            if (rev > tol) add('ST_INSUMO', ch, it, { revisar: rev, devido }, {
              resumo: `${it.dest.origem === 'usuario' ? 'Destinação informada' : `Sugestão pela descrição (${it.dest.palavra})`}: insumo. Devido estimado (Equalização) ${brl(devido)}.`,
              fund: `O item ${itTxt(it)} da ${nfTxt(ch)} é insumo utilizado no preparo dos produtos vendidos pelo estabelecimento (${cnaeTxt}) e não será revendido no estado em que foi adquirido. Sem a operação subsequente presumida, não subsiste a exigência do ICMS-ST com MVA (CF/88, art. 150, § 7º; LC nº 87/1996, art. 10)${industrial ? '; tratando-se de estabelecimento industrial, o regime não se aplica às mercadorias destinadas à industrialização (Convênio ICMS 142/2018, cláusula nona, III; Decreto nº 15.055/2018, art. 3º, § 1º, I, e § 2º)' : ''}. Para o optante do Simples Nacional, a aquisição interestadual destinada à comercialização ou industrialização sujeita-se à Equalização, calculada sem MVA (Decreto nº 15.055/2018, arts. 3º a 5º)${isento ? ', da qual a empresa está isenta (Decreto nº 16.177/2023)' : ''}. Valor devido estimado: ${brl(devido)}; requer-se a revisão da cobrança em ${brl(rev)}.`
            }, { forca: industrial ? 'forte' : 'moderada', base: industrial ? ['CF150_7', 'LC87_10', 'CONV142_9', 'DEC15055_IND', 'DEC15055_5', 'CTN165'] : undefined });
          }
          // Despesas acessórias elevadas
          if ((it.outros || 0) > 50 && (it.valorTotal || 0) > 0 && (it.outros / it.valorTotal) * 100 > (+S.outrosLimitePct || 30)) {
            const est = U.round2((it.icms || 0) * it.outros / (it.custoFinal || it.outros));
            add('ST_DESPESAS', ch, it, { revisar: est }, {
              resumo: `"Outros valores" de ${brl(it.outros)} = ${U.fmt(it.outros / it.valorTotal * 100, 0)}% do valor da mercadoria.`,
              fund: `No item ${itTxt(it)} da ${nfTxt(ch)}, as despesas acessórias rateadas ("outros valores" de ${brl(it.outros)}) representam ${U.fmt(it.outros / it.valorTotal * 100, 0)}% do valor da mercadoria (${brl(it.valorTotal)}) e foram incluídas na base do ICMS-ST com aplicação da MVA. Confirme a natureza dessas despesas no DANFE/XML: valores que não correspondam a seguro, frete ou encargos cobrados do adquirente relativos à mercadoria (LC nº 87/1996, art. 8º, II, "b") não devem integrar a base. Impacto estimado, se excluídas: ${brl(est)}.`
            });
          }
        });
      }

      if (ch.tipo === 'EQ') {
        if (me.status === 'isenta') {
          add('EQ_ME', ch, null, { revisar: ch.valorICMS }, {
            resumo: `ME isenta da Equalização (${me.motivo}).`,
            fund: `A empresa é microempresa optante pelo Simples Nacional (${me.motivo}). O art. 1º, III, do Decreto nº 16.177/2023 concede isenção do ICMS Equalização Simples Nacional (código 349) nas aquisições ocorridas a partir de 1º/05/2023 às microempresas com receita bruta acumulada no ano-calendário anterior de até R$ 360.000,00. Requer-se a exclusão da ${nfTxt(ch)} da cobrança da Equalização da referência ${U.refLabel(ch.referencia)}, no valor de ${brl(ch.valorICMS)}.`
          });
        } else if (me.status === 'verificar') {
          add('EQ_ME_VERIF', ch, null, { revisar: ch.valorICMS }, {
            resumo: 'Empresa ME: informe a receita do ano anterior para confirmar a isenção.',
            fund: `A empresa está cadastrada como microempresa. Se a receita bruta acumulada no ano-calendário anterior não ultrapassou R$ 360.000,00 (proporcional, se iniciou atividades no ano anterior) e a empresa não está no ano de início de atividades, a Equalização da ${nfTxt(ch)} (${brl(ch.valorICMS)}) é isenta (Decreto nº 16.177/2023, art. 1º, III, e §§ 1º e 2º). Informe a receita no cadastro da empresa para confirmar.`
          });
        } else if (me.status === 'mei') {
          add('EQ_MEI', ch, null, { revisar: ch.valorICMS }, {
            resumo: 'Microempreendedor individual: Equalização dispensada.',
            fund: `O contribuinte é Microempreendedor Individual (MEI). O Decreto nº 13.115/2011, art. 1º, II, com a redação do Decreto nº 15.184/2019, dispensa a cobrança do ICMS Equalização Simples Nacional nessa hipótese. Requer-se a exclusão da ${nfTxt(ch)} da cobrança da referência ${U.refLabel(ch.referencia)}, no valor de ${brl(ch.valorICMS)}.`
          });
        }
        ch.itens.forEach(it => {
          const importado = it.xmlItem ? ORIGEM_IMPORTADA.includes(String(it.xmlItem.orig)) : false;
          const aInter = importado ? 4 : U.aliqInterestadualParaMS(ch.ufRemetente);
          if (aInter && aInter > 0 && (it.percentual || 0) > 0) {
            const correto = U.round2(aIntra - aInter);
            if (it.percentual > correto + 0.01) {
              // 13% (17% − 4%) é o percentual da mercadoria importada (Res. SF nº 13/2012), que a SEFAZ aplica pela origem
              // informada na NF-e: sem o XML mostrando origem nacional, não há o que contestar
              const possivelImport = !it.xmlItem && Math.abs(it.percentual - (aIntra - 4)) < 0.011;
              const dif = U.round2(it.base * (it.percentual - correto) / 100);
              if (dif > tol && !possivelImport) add('EQ_PERC', ch, it, { revisar: dif, devido: U.round2(it.base * correto / 100) }, {
                resumo: `Aplicado ${pct(it.percentual)}; correto ${pct(correto)} (origem ${ch.ufRemetente}${importado ? ', importado' : ''}).`,
                fund: `Na Equalização do item ${itTxt(it)} da ${nfTxt(ch)}, foi aplicado o percentual de ${pct(it.percentual)}. Pelo art. 5º do Decreto nº 15.055/2018, o percentual é a diferença entre a alíquota interna de MS (${pct(aIntra)}) e a alíquota interestadual da origem (${pct(aInter)} — ${importado ? 'mercadoria importada, Res. SF nº 13/2012' : `remetente em ${ch.ufRemetente}, Res. SF nº 22/1989`}), ou seja, ${pct(correto)}. Requer-se a revisão da cobrança, com exclusão de ${brl(dif)}.`
              }, { forca: 'forte' });
            }
          }
          if ((it.icms || 0) - it.icmsCalc > tol) {
            const dif = U.round2(it.icms - it.icmsCalc);
            add('EQ_CALCULO', ch, it, { revisar: dif, devido: it.icmsCalc }, {
              resumo: `Recalculado: ${brl(it.icmsCalc)}; cobrado: ${brl(it.icms)}.`,
              fund: `Recalculando a Equalização do item ${itTxt(it)} da ${nfTxt(ch)}: base de ${brl(it.base)} (mercadoria, frete, seguro, IPI e outras despesas, menos descontos — Decreto nº 15.055/2018, art. 4º) × ${pct(it.percentual)} = ${brl(it.icmsCalc)}; foi exigido ${brl(it.icms)}. Requer-se a exclusão da diferença de ${brl(dif)}.`
            });
          }
          if (it.xmlItem && (it.xmlItem.vICMSST || 0) > 0) {
            add('ST_RETIDO', ch, it, { revisar: it.icms }, {
              resumo: `XML: ICMS-ST de ${brl(it.xmlItem.vICMSST)} retido pelo remetente — não cabe Equalização.`,
              fund: `Conforme o XML da ${nfTxt(ch)}, o remetente reteve o ICMS-ST do item ${itTxt(it)} (${brl(it.xmlItem.vICMSST)}), na condição de substituto tributário (Convênio ICMS 142/2018, cláusulas oitava e décima oitava). A Equalização não se aplica às mercadorias submetidas ao regime de substituição tributária (Decreto nº 15.055/2018, art. 3º, § 1º, II, "a"). Requer-se a exclusão do item da cobrança da Equalização da referência ${U.refLabel(ch.referencia)}, no valor de ${brl(it.icms)}.`
            });
          }
          if (!it.dupST && it.mvaRef) {
            add('EQ_ITEM_ST', ch, it, { revisar: 0 }, {
              resumo: 'NCM consta na tabela de ST cadastrada — avalie o risco antes de pedir.',
              fund: `A mercadoria ${itTxt(it)} consta da tabela de ST cadastrada${it.mvaRef.fonte ? ` (${it.mvaRef.fonte})` : ''}. Pelo art. 3º, § 1º, II, "a", do Decreto nº 15.055/2018, mercadoria sujeita à ST não se submete à Equalização; porém a SEFAZ/MS poderá exigir o ICMS-ST correspondente, em regra maior. Avalie antes de solicitar a revisão.`
            });
          }
        });
      }
    });

    // MVA divergente para o mesmo produto (sem tabela de referência)
    const stItems = items.filter(i => i.tipo === 'ST' && i.mvaOrig !== null && !i.temPauta && i.custoFinal > 0);
    const byGrp = U.groupBy(stItems, i => `${i.companyId}|${U.digits(i.cest) || 'N' + i.ncm}`);
    Object.values(byGrp).forEach(g => {
      if (g.some(i => i.mvaTab !== null && i.mvaTab !== undefined)) return;
      const min = Math.min(...g.map(i => i.mvaOrig));
      const altos = g.filter(i => i.mvaOrig - min > 0.3);
      if (!altos.length) return;
      const baixos = g.filter(i => i.mvaOrig - min <= 0.3);
      altos.forEach(i => {
        const ch = chargesById.get(i.chargeId);
        const mvaAjMin = ((1 + min / 100) * (1 - i.aliqInter / 100) / (1 - i.aliqIntra / 100) - 1) * 100;
        const bc = U.round2(i.custoFinal * (1 + mvaAjMin / 100));
        const calc = U.round2(U.round2(bc * i.aliqIntra / 100) - (i.credito || 0));
        const rev = U.round2((i.icms || 0) - calc);
        if (rev <= tol) return;
        const ex = baixos.slice(0, 3).map(b => `NF ${b.numero} (ref. ${U.refLabel(b.referencia)}): ${pct(b.mvaOrig)}`).join('; ');
        add('ST_MVA_DIV', ch, i, { revisar: rev, devido: calc }, {
          resumo: `MVA original equivalente ${pct(i.mvaOrig)} × ${pct(min)} em ${baixos.length} outro(s) item(ns).`,
          fund: `A mesma mercadoria (CEST ${U.fmtCEST(i.cest) || '—'}, NCM ${U.fmtNCM(i.ncm)}) foi tributada com margens distintas pela SEFAZ/MS: MVA original equivalente de ${pct(i.mvaOrig)} (MVA ajustada de ${pct(i.mvaAj)}) no item ${itTxt(i)} da ${nfTxt(ch)}, e de ${pct(min)} em ${baixos.length} outro(s) item(ns) (${ex}). A divergência evidencia erro de parametrização da apuração, pois a MVA é definida por mercadoria na legislação (RICMS/MS, Anexo III, Subanexo I; LC nº 87/1996, art. 8º, II, "c"). Requer-se a revisão da base de cálculo com a MVA correta; aplicando-se a menor margem verificada, o imposto devido é ${brl(calc)} e o valor a revisar, ${brl(rev)}. Confirme a MVA vigente no Subanexo I antes do pedido.`
        });
      });
    });

    /* 7. Consolidação (sem dupla contagem) */
    const findingsActive = findings.filter(f => !['descartado', 'indeferido'].includes(f.status) && f.valorRevisar > 0);
    const byCharge = U.groupBy(findingsActive, f => f.chargeId);
    const FORCAS = ['forte', 'moderada', 'atencao'];
    charges.forEach(ch => {
      const fs = byCharge[ch.id] || [];
      const out = { forte: 0, moderada: 0, atencao: 0, total: 0 };
      if (fs.length) {
        // 1) itens: soma por força, sem ultrapassar o ICMS do item (achados integrais esgotam o item)
        const byItem = U.groupBy(fs.filter(f => f.escopo === 'item'), f => f.itemId);
        Object.entries(byItem).forEach(([itemId, ifs]) => {
          const it = itemsById.get(itemId);
          const cap = it ? (it.icms || 0) : U.sum(ifs, f => f.valorRevisar);
          let usado = 0;
          FORCAS.forEach(fc => {
            const lst = ifs.filter(f => f.forca === fc);
            if (!lst.length || usado >= cap) return;
            const v = lst.some(f => f.integral) ? cap - usado : Math.min(cap - usado, U.sum(lst, f => f.valorRevisar));
            out[fc] += v; usado += v;
          });
        });
        fs.filter(f => f.escopo === 'nota' && !f.integral).forEach(f => { out[f.forca] += f.valorRevisar; });
        // 2) achado integral da NF: o restante da cobrança vai para a força desse achado
        const notaInt = fs.filter(f => f.escopo === 'nota' && f.integral);
        if (notaInt.length) {
          const fx = notaInt.slice().sort((a, b) => L.FORCAS[a.forca].ordem - L.FORCAS[b.forca].ordem)[0].forca;
          const maisFortes = FORCAS.filter(fc => L.FORCAS[fc].ordem < L.FORCAS[fx].ordem);
          const manter = Math.min(ch.valorICMS, U.sum(maisFortes, fc => out[fc]));
          FORCAS.forEach(fc => { if (!maisFortes.includes(fc)) out[fc] = 0; });
          out[fx] = Math.max(0, ch.valorICMS - manter);
        }
        const tot = out.forte + out.moderada + out.atencao;
        if (tot > ch.valorICMS && tot > 0) { const k = ch.valorICMS / tot; FORCAS.forEach(fc => { out[fc] = out[fc] * k; }); }
      }
      FORCAS.forEach(fc => { out[fc] = U.round2(out[fc]); });
      out.total = U.round2(out.forte + out.moderada + out.atencao);
      ch.revisao = out;
    });

    /* 8. Pendências */
    charges.forEach(ch => {
      if (ch.origem === 'previa' && !ch.itemDocs.length && (ch.tipo === 'ST' || ch.tipo === 'EQ')) {
        pend.push({ tipo: 'sem_itens', nivel: 'acao', companyId: ch.companyId, referencia: ch.referencia, chargeId: ch.id, nfKey: ch.nfKey,
          texto: `Importe a memória de cálculo da NF ${ch.numero} (${ch.tipo === 'ST' ? 'ICMS-ST' : 'Equalização'}, ref. ${U.refLabel(ch.referencia)}) — ${brl(ch.valorICMS)} cobrados ainda não conferidos item a item.` });
      }
      const faltam = (ch.itensFaltando || []).length > 0;
      if (faltam) {
        pend.push({ tipo: 'itens_faltando', nivel: 'acao', companyId: ch.companyId, referencia: ch.referencia, chargeId: ch.id, nfKey: ch.nfKey,
          texto: `NF ${ch.numero} (${ch.tipo === 'ST' ? 'ICMS-ST' : 'Equalização'}, ref. ${U.refLabel(ch.referencia)}): faltam os itens ${U.listaTxt(ch.itensFaltando)} de ${ch.totalItensDeclarado} — importe as páginas que faltam da tela "Dados da Nota".` });
      }
      if (ch.origem === 'previa' && ch.itemDocs.length && !faltam && Math.abs(ch.somaItensICMS - ch.valorICMS) > Math.max(0.05, ch.itens.length * 0.003)) {
        pend.push({ tipo: 'soma', nivel: 'alerta', companyId: ch.companyId, referencia: ch.referencia, chargeId: ch.id, nfKey: ch.nfKey,
          texto: `NF ${ch.numero} (${ch.tipo}): soma dos itens ${brl(ch.somaItensICMS)} ≠ valor cobrado ${brl(ch.valorICMS)}. ${ch.somaItensICMS < ch.valorICMS ? 'Faltam páginas da memória?' : 'Há itens a mais na memória.'}` });
      }
      if (ch.origem === 'itens') {
        pend.push({ tipo: 'sem_previa', nivel: 'alerta', companyId: ch.companyId, referencia: ch.referencia, chargeId: ch.id, nfKey: ch.nfKey,
          texto: `Memória da NF ${ch.numero} (${ch.tipo}) sem o Relatório de Prévia correspondente — importe o relatório ou ajuste o vínculo.` });
      }
      if (!ch.companyId) pend.push({ tipo: 'sem_empresa', nivel: 'acao', chargeId: ch.id, texto: `NF ${ch.numero}: defina a empresa no vínculo do documento.` });
    });
    companies.forEach(c => {
      if (!c.cnaePrincipal) pend.push({ tipo: 'sem_cnae', nivel: 'info', companyId: c.id, texto: `${c.nomeFantasia || c.razaoSocial || 'Empresa'}: importe o cartão CNPJ para registrar as atividades (CNAE).` });
      if (c.porte === 'ME' && (c.receitaAnoAnterior === null || c.receitaAnoAnterior === undefined || c.receitaAnoAnterior === '') && !c.beneficiarioME) pend.push({ tipo: 'me_receita', nivel: 'acao', companyId: c.id, texto: `${c.nomeFantasia || c.razaoSocial}: informe a receita bruta do ano anterior (possível isenção da Equalização — Dec. 16.177/2023).` });
      if (!c.porte) pend.push({ tipo: 'sem_porte', nivel: 'info', companyId: c.id, texto: `${c.nomeFantasia || c.razaoSocial || 'Empresa'}: porte não informado (ME/EPP/MEI).` });
    });
    const semTab = items.filter(i => i.tipo === 'ST' && !i.mvaRef).length;
    if (semTab && !mvaTable.length && !sub) pend.push({ tipo: 'sem_tabela', nivel: 'info', texto: `${semTab} itens de ST sem MVA de referência cadastrada — a conferência de MVA usa a coerência entre notas. Cadastre a tabela em "Tabelas e regras".` });

    /* 9. Estatísticas por empresa × referência */
    const stats = new Map();
    const sk = (c, r) => `${c || '?'}|${r || '?'}`;
    charges.forEach(ch => {
      const k = sk(ch.companyId, ch.referencia);
      let s = stats.get(k);
      if (!s) { s = { key: k, companyId: ch.companyId, referencia: ch.referencia, cobrado: { ST: 0, EQ: 0, OUTRO: 0 }, notas: new Set(), revisar: { forte: 0, moderada: 0, atencao: 0, total: 0 }, achados: { forte: 0, moderada: 0, atencao: 0 } }; stats.set(k, s); }
      s.cobrado[ch.tipo === 'ST' || ch.tipo === 'EQ' ? ch.tipo : 'OUTRO'] += ch.valorICMS || 0;
      s.notas.add(ch.nfKey);
      FORCAS.forEach(fc => { s.revisar[fc] += ch.revisao[fc]; });
      s.revisar.total += ch.revisao.total;
    });
    findings.forEach(f => {
      const s = stats.get(sk(f.companyId, f.referencia));
      if (s && !['descartado', 'indeferido'].includes(f.status)) s.achados[f.forca]++;
    });

    const refs = U.uniq(charges.map(c => c.referencia).filter(Boolean)).sort().reverse();
    findings.sort((a, b) => (L.FORCAS[a.forca].ordem - L.FORCAS[b.forca].ordem) || (b.valorRevisar - a.valorRevisar));

    return {
      S, companies, charges, chargesById, items, itemsById, nfs: [...nfs.values()], nfsByKey: nfs, findings,
      findingsById: new Map(findings.map(f => [f.id, f])), pend, stats: [...stats.values()], refs, docCharge, subanexo: sub
    };
  }

  function monthDiff(a, b) {
    const [ya, ma] = String(a).split('-').map(Number), [yb, mb] = String(b).split('-').map(Number);
    if (!ya || !yb) return 0;
    return (ya * 12 + ma) - (yb * 12 + mb);
  }

  global.RST_ENGINE = { build, DEFAULT_SETTINGS, DEFAULT_KEYWORDS, catKeys, meStatus, ncmCompat, matchSTEQ, settingsOf, mergeLines };
})(window);
