/* Revisor ICMS-ST — Vendas × ST: lê o Registro de Saídas e o Controle de Cálculo do Simples (Makro),
 * aponta as vendas de mercadorias sujeitas à ST que saíram tributadas no Simples e mede o ICMS pago a mais no DAS. */
(function (global) {
  'use strict';
  const U = global.RST_U;

  /* ============================================================
   * Leitura dos relatórios
   * ============================================================ */
  const nh = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const num = v => {
    if (typeof v === 'number') return v;
    const s = String(v ?? '').trim();
    if (!s) return 0;
    // "1.234,56" (pt-BR) ou "1234.56"
    const t = /,\d{1,}$/.test(s) ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
    const n = parseFloat(t);
    return isNaN(n) ? 0 : n;
  };
  const isoDe = v => {
    if (typeof v === 'number' && v > 20000 && v < 80000) { const d = new Date(Math.round((v - 25569) * 864e5)); return d.toISOString().slice(0, 10); }
    const m = String(v ?? '').match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    const m2 = String(v ?? '').match(/(\d{4})-(\d{2})-(\d{2})/);
    return m2 ? m2[0] : '';
  };
  /** Referência (AAAA-MM) mais frequente entre as datas. */
  function refMaisFrequente(isos) {
    const cont = {};
    isos.forEach(d => { if (d) { const k = d.slice(0, 7); cont[k] = (cont[k] || 0) + 1; } });
    return Object.entries(cont).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
  }
  /** "575 - KAGIRA COMERCIO LTDA - RegSaidasDetalhado 10 2026.xlsx" → { cod: '575', nome: 'KAGIRA COMERCIO LTDA', ref: '2026-10' } */
  function infoDoNome(fileName) {
    const base = String(fileName || '').replace(/\.[^.]+$/, '');
    const partes = base.split(/\s+-\s+/);
    const out = { cod: '', nome: '', ref: '' };
    if (partes.length >= 3 && /^\d{1,6}$/.test(partes[0].trim())) { out.cod = partes[0].trim(); out.nome = partes.slice(1, -1).join(' - ').trim(); }
    else if (partes.length >= 2) out.nome = partes.slice(0, -1).join(' - ').trim();
    const m = base.match(/(?:^|\D)(0?[1-9]|1[0-2])[ ._\-/](20\d{2})(?:\D|$)/);
    if (m) out.ref = `${m[2]}-${String(m[1]).padStart(2, '0')}`;
    return out;
  }

  // cabeçalhos do Registro de Saídas Detalhado (ordem importa: o primeiro padrão que casar fica com a coluna)
  const COLS_SAIDAS = [
    ['ean', /^(codigo )?(ean|gtin)/],
    ['ncm', /^(codigo do )?ncm/],
    ['codigo', /^codigo( produto| do produto)?$/],
    ['nome', /^(nome produto|descricao( do produto)?|produto)$/],
    ['tipo', /^tipo produto/],
    ['nf', /^(n|no|num|numero) ?(da )?(nf|nota)/],
    ['mod', /^mod/],
    ['data', /^(dt|data)/],
    ['unid', /^unid/],
    ['qtd', /^quant/],
    ['cfop', /^cfop/],
    ['cst', /^(cst icms|csosn|cst)$/],
    ['cliente', /^nome (forn|cliente)/],
    ['doc', /^cnpj/],
    ['cest', /^cest/],
    ['valor', /^(vr|valor) total item|^(vr|valor) do item|^valor total/],
    ['desconto', /^(vr )?desconto/]
  ];

  function lerRegSaidas(rows, fileName) {
    let hi = -1, map = null;
    for (let i = 0; i < Math.min(rows.length, 40); i++) {
      const cells = rows[i].map(nh);
      if (cells.includes('nome produto') && cells.some(c => /ncm/.test(c)) && cells.some(c => /^cfop/.test(c))) {
        map = {};
        cells.forEach((c, j) => {
          if (!c) return;
          const k = COLS_SAIDAS.find(([key, re]) => !(key in map) && re.test(c));
          if (k) map[k[0]] = j;
        });
        hi = i; break;
      }
    }
    if (hi < 0 || !('codigo' in map || 'nome' in map) || !('valor' in map)) return null;
    const g = (r, k) => (k in map ? r[map[k]] : '');
    const produtos = {}, linhas = [];
    const warnings = [];
    for (let i = hi + 1; i < rows.length; i++) {
      const r = rows[i];
      const nome = String(g(r, 'nome') ?? '').trim();
      const nf = U.digits(g(r, 'nf'));
      if (!nome || !nf) continue;
      let cod = String(g(r, 'codigo') ?? '').trim() || U.normKey(nome).slice(0, 30);
      if (!produtos[cod]) {
        produtos[cod] = { nome, ean: String(g(r, 'ean') ?? '').trim(), tipo: String(g(r, 'tipo') ?? '').trim(), ncm: U.digits(g(r, 'ncm')), cest: U.digits(g(r, 'cest')) };
      }
      // [código, NF, modelo, data, qtd, CFOP, CST/CSOSN, valor, desconto]
      linhas.push([cod, nf, String(g(r, 'mod') ?? '').trim(), isoDe(g(r, 'data')), U.round2(num(g(r, 'qtd')) * 1000) / 1000, U.digits(g(r, 'cfop')), U.digits(g(r, 'cst')), U.round2(num(g(r, 'valor'))), U.round2(num(g(r, 'desconto')))]);
    }
    if (!linhas.length) return null;
    const info = infoDoNome(fileName);
    const refDatas = refMaisFrequente(linhas.map(l => l[3]));
    if (info.ref && refDatas && info.ref !== refDatas) warnings.push(`O nome do arquivo indica ${U.refLabel(info.ref)}, mas as vendas são de ${U.refLabel(refDatas)}; usei ${U.refLabel(refDatas)}.`);
    const total = U.round2(U.sum(linhas, l => l[7] - l[8]));
    return {
      kind: 'saidas',
      data: { formato: 'makro-reg-saidas', empresaNome: info.nome, codEscritorio: info.cod, referencia: refDatas || info.ref, produtos, linhas, total, nProdutos: Object.keys(produtos).length },
      warnings
    };
  }

  /** Controle de Cálculo do Simples Nacional (Makro): receita do período, devoluções e notas fora do cálculo. */
  function lerControleSimples(wb, fileName) {
    const X = global.XLSX;
    const secoes = {};
    let achou = false;
    wb.SheetNames.forEach(sn => {
      const rows = X.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, defval: '' });
      const topo = rows.slice(0, 8).map(r => r.map(nh).join(' ')).join(' ');
      if (!/controle calculo simples nacional/.test(topo)) return;
      achou = true;
      let titulo = '', hdr = null;
      rows.forEach(r => {
        const cells = r.map(nh);
        const txt = cells.filter(Boolean).join(' ');
        if (/^notas fiscais|^relacao de saldo/.test(txt)) { titulo = txt; hdr = null; return; }
        if (titulo && !hdr && cells.some(c => /^total/.test(c))) { hdr = cells; return; }
        if (!titulo || !hdr) return;
        const sec = secoes[titulo] || (secoes[titulo] = { linhas: [], total: null, datas: [] });
        const iTot = hdr.findIndex(c => /^total/.test(c));
        if (cells[0] === 'totais') { sec.total = num(r[iTot]); return; }
        if (!cells.filter(Boolean).length) return;
        const iTrib = hdr.findIndex(c => /^trib/.test(c));
        const iCfop = hdr.findIndex(c => /^cfop/.test(c));
        const iData = hdr.findIndex(c => /^(emissao|entrada|data)/.test(c));
        sec.linhas.push({ total: num(r[iTot]), trib: iTrib >= 0 ? String(r[iTrib]).trim() : '', cfop: iCfop >= 0 ? U.digits(r[iCfop]) : '' });
        if (iData >= 0) sec.datas.push(isoDe(r[iData]));
      });
    });
    if (!achou) return null;
    const sec = re => Object.entries(secoes).find(([k]) => re.test(k))?.[1] || null;
    const agrup = sec(/agrupadas/), indiv = sec(/^notas fiscais do periodo$/), fora = sec(/nao entraram/), dev = sec(/devolucao de venda/);
    const tot = s => s ? (s.total !== null ? s.total : U.round2(U.sum(s.linhas, l => l.total))) : 0;
    const base = agrup || indiv;
    const porTrib = {};
    (base ? base.linhas : []).forEach(l => { const k = l.trib || 'Normal'; porTrib[k] = U.round2((porTrib[k] || 0) + l.total); });
    const info = infoDoNome(fileName);
    const refDatas = refMaisFrequente((indiv ? indiv.datas : []).concat(dev ? dev.datas : []));
    return {
      kind: 'simples',
      data: { formato: 'makro-controle-simples', empresaNome: info.nome, codEscritorio: info.cod, referencia: refDatas || info.ref, receita: U.round2(tot(base)), porTrib, devolucoes: U.round2(tot(dev)), naoComputadas: U.round2(tot(fora)), notas: indiv ? indiv.linhas.length : 0 },
      warnings: base ? [] : ['Não encontrei a relação de notas do período no Controle de Cálculo.']
    };
  }

  /* ============================================================
   * Domínio: "Relação de Produtos por Nota" (entradas e saídas, item a item)
   * ============================================================ */
  const COLS_DOMINIO = [
    ['tipo', /^tipo$/], ['situacao', /^situacao da nota/], ['dataES', /^data (saida|entrada)/], ['emissao', /^data emissao/],
    ['nf', /^n[oº]? nf/], ['especie', /^especie/], ['serie', /^serie/], ['valorNota', /^valor contabil$/], ['codPart', /^codigo$/],
    ['part', /^nome (fornecedor|cliente)/], ['uf', /^uf$/], ['doc', /^inscricao/], ['codigo', /^codigo produto/], ['nome', /^nome do produto/],
    ['cfop', /^cfop produto/], ['cfopNota', /^cfop nota/], ['ncm', /^ncm/], ['cst', /^cst csosn/], ['unid', /^unidade/], ['qtd', /^quantidade/],
    ['valor', /^valor produto/], ['bcST', /^b c icms st/], ['icmsST', /^valor icms st/], ['despesas', /^despesas acessorias/],
    ['desconto', /^valor desconto/], ['chave', /^chave/]
  ];
  const CFOP_ENT_ST = ['1401', '1403', '2401', '2403'];
  const ehVendaCfop = cf => /^[56](1\d\d|40[1-5])$/.test(cf);

  /** Lê a Relação de Produtos por Nota da Domínio e devolve dois documentos: saídas (vendas) e entradas. */
  function lerDominioProdutosNota(rows, fileName) {
    const topo = rows.slice(0, 6).map(r => r.map(c => String(c ?? '').trim()).filter(Boolean).join(' '));
    if (!topo.some(t => /rela[cç][aã]o de produtos por nota/i.test(t))) return null;
    let hi = -1, map = null;
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const cells = rows[i].map(nh);
      if (cells.includes('codigo produto') && cells.includes('nome do produto') && cells.includes('tipo')) {
        map = {};
        cells.forEach((c, j) => { if (!c) return; const k = COLS_DOMINIO.find(([key, re]) => !(key in map) && re.test(c)); if (k) map[k[0]] = j; });
        hi = i; break;
      }
    }
    if (hi < 0 || !('nf' in map) || !('valor' in map)) return null;
    const g = (r, k) => (k in map ? r[map[k]] : '');
    const s = (r, k) => String(g(r, k) ?? '').trim();
    const nomeEmp = topo[0] || '';
    const cnpj = U.digits((topo.find(t => /CNPJ/i.test(t)) || '').replace(/^[^\d]*/, ''));
    const per = (topo.find(t => /per[ií]odo/i.test(t)) || '').match(/(\d{2}\/\d{2}\/\d{4})\D+(\d{2}\/\d{2}\/\d{4})/);
    const ini = per ? isoDe(per[1]) : '', fim = per ? isoDe(per[2]) : '';
    const modDe = e => ({ 36: '55', 41: '65', 1: '01' }[+e] || String(e || ''));

    const sProd = {}, linhas = [], eProd = {}, parts = {}, notasMap = new Map();
    let canc = 0, foraVenda = 0, foraVendaValor = 0, devol = 0;
    for (let i = hi + 1; i < rows.length; i++) {
      const r = rows[i];
      const tipo = nh(g(r, 'tipo'));
      if (tipo !== 'saida' && tipo !== 'entrada') continue;
      if (!/regular/i.test(s(r, 'situacao'))) { canc++; continue; }
      const nf = U.digits(g(r, 'nf'));
      const nome = s(r, 'nome');
      if (!nf || !nome) continue;
      const cod = s(r, 'codigo') || U.normKey(nome).slice(0, 30);
      const cfop = U.digits(g(r, 'cfop')) || U.digits(g(r, 'cfopNota'));
      const qtd = U.round2(num(g(r, 'qtd')) * 1000) / 1000, valor = U.round2(num(g(r, 'valor'))), desc = U.round2(num(g(r, 'desconto')));
      if (tipo === 'saida') {
        if (!ehVendaCfop(cfop)) { foraVenda++; foraVendaValor += valor - desc; continue; }
        if (!sProd[cod]) sProd[cod] = { nome, ean: '', tipo: '', ncm: U.digits(g(r, 'ncm')), cest: '' };
        // [código, NF, modelo, data, qtd, CFOP, CST/CSOSN, valor, desconto]
        linhas.push([cod, String(+nf), modDe(g(r, 'especie')), isoDe(g(r, 'emissao')) || isoDe(g(r, 'dataES')), qtd, cfop, U.digits(g(r, 'cst')), valor, desc]);
      } else {
        const codPart = s(r, 'codPart') || U.digits(g(r, 'doc')) || s(r, 'part');
        if (!parts[codPart]) parts[codPart] = { nome: s(r, 'part'), cnpj: U.digits(g(r, 'doc')), ie: '', uf: s(r, 'uf').toUpperCase() };
        if (!eProd[cod]) eProd[cod] = { nome, gtin: '', ncm: U.digits(g(r, 'ncm')), cest: '' };
        const chave = U.digits(g(r, 'chave'));
        const k = chave.length === 44 ? chave : `${codPart}|${+nf}`;
        let n = notasMap.get(k);
        if (!n) {
          n = { nf: String(+nf), serie: s(r, 'serie'), mod: modDe(g(r, 'especie')), part: codPart, chave: chave.length === 44 ? chave : '', emissao: isoDe(g(r, 'emissao')), entrada: isoDe(g(r, 'dataES')), valor: 0, cfops: [], itens: [], _seg: new Set() };
          notasMap.set(k, n);
        }
        // cada CFOP da nota vem como um "segmento" com o seu valor contábil
        const cfN = U.digits(g(r, 'cfopNota'));
        const seg = `${cfN}|${num(g(r, 'valorNota'))}`;
        if (!n._seg.has(seg)) { n._seg.add(seg); n.valor = U.round2(n.valor + num(g(r, 'valorNota'))); }
        if (cfN && !n.cfops.includes(cfN)) n.cfops.push(cfN);
        if (/^[12](20[12]|41[01])$/.test(cfop)) devol += valor - desc;
        // ICMS-ST: campo próprio ou, nas compras com CFOP de ST, o valor lançado em despesas acessórias
        const st = num(g(r, 'icmsST')) || (CFOP_ENT_ST.includes(cfop) ? num(g(r, 'despesas')) : 0);
        n.itens.push([n.itens.length + 1, cod, '', qtd, valor, desc, U.digits(g(r, 'cst')), cfop, U.round2(st)]);
      }
    }
    const notas = [...notasMap.values()].map(n => { delete n._seg; return n; });
    if (!linhas.length && !notas.length) return null;
    const ref = (ini || '').slice(0, 7) || refMaisFrequente(linhas.map(l => l[3]).concat(notas.map(n => n.entrada || n.emissao)));
    const base = { formato: 'dominio-produtos-nota', empresaNome: nomeEmp, cnpj, referencia: ref, periodo: { ini, fim } };
    const out = [];
    if (linhas.length) {
      const w = [];
      if (foraVenda) w.push(`${foraVenda} item(ns) de saída com CFOP que não é de venda (ex.: 5949, devolução de compra) ficaram fora: ${U.brl(U.round2(foraVendaValor))}.`);
      if (canc) w.push(`${canc} linha(s) de notas canceladas ou numeração inutilizada ignoradas.`);
      if (devol > 0) w.push(`Há devoluções de venda nas entradas (${U.brl(U.round2(devol))}); sem o Controle do Simples, a receita do mês não as desconta.`);
      out.push({ kind: 'saidas', data: Object.assign({}, base, { produtos: sProd, linhas, total: U.round2(U.sum(linhas, l => l[7] - l[8])), nProdutos: Object.keys(sProd).length }), warnings: w });
    }
    if (notas.length) {
      out.push({
        kind: 'entradas',
        data: Object.assign({}, base, { uf: 'MS', participantes: parts, produtos: eProd, notas, nNotas: notas.length, nItens: U.sum(notas, n => n.itens.length), total: U.round2(U.sum(notas, n => n.valor)) }),
        warnings: []
      });
    }
    return out;
  }

  /** Reconhece as planilhas da Makro e da Domínio; devolve o documento (ou a lista de documentos) ou null. */
  function lerPlanilhaMakro(wb, fileName) {
    const X = global.XLSX;
    const simples = lerControleSimples(wb, fileName);
    if (simples) return simples;
    for (const sn of wb.SheetNames) {
      const rows = X.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, defval: '' });
      const dom = lerDominioProdutosNota(rows, fileName);
      if (dom) { dom.forEach(d => { d.data.planilha = sn; }); return dom; }
      const topo = rows.slice(0, 12).map(r => r.map(nh).join(' ')).join(' ');
      if (!/registro de saidas/.test(topo) && !rows.slice(0, 40).some(r => r.map(nh).includes('nome produto'))) continue;
      const d = lerRegSaidas(rows, fileName);
      if (d) { d.data.planilha = sn; return d; }
    }
    return null;
  }

  /* ============================================================
   * SPED Fiscal (EFD ICMS/IPI): notas de entrada
   * ============================================================ */
  const UF_IBGE = { 11: 'RO', 12: 'AC', 13: 'AM', 14: 'RR', 15: 'PA', 16: 'AP', 17: 'TO', 21: 'MA', 22: 'PI', 23: 'CE', 24: 'RN', 25: 'PB', 26: 'PE', 27: 'AL', 28: 'SE', 29: 'BA', 31: 'MG', 32: 'ES', 33: 'RJ', 35: 'SP', 41: 'PR', 42: 'SC', 43: 'RS', 50: 'MS', 51: 'MT', 52: 'GO', 53: 'DF' };
  const dataEFD = s => { const d = U.digits(s); return d.length === 8 ? `${d.slice(4)}-${d.slice(2, 4)}-${d.slice(0, 2)}` : ''; };
  const ehEFD = text => /^﻿?\|0000\|/.test(String(text || '').slice(0, 20));

  /** Lê o arquivo do SPED Fiscal e guarda só as notas de entrada (C100 com IND_OPER = 0) e seus itens (C170). */
  function lerEFD(text, fileName) {
    const prods = {}, parts = {}, notas = [];
    let cab = null, nota = null;
    String(text || '').split(/\r?\n/).forEach(ln => {
      const p = ln.replace(/^﻿/, '').split('|');
      const reg = p[1];
      if (!reg) return;
      if (reg !== 'C100' && !/^C1\d\d$/.test(reg)) nota = null;
      if (reg === '0000') cab = { ini: dataEFD(p[4]), fim: dataEFD(p[5]), nome: String(p[6] || '').trim(), cnpj: U.digits(p[7]), uf: String(p[9] || '').trim(), ie: U.digits(p[10]) };
      else if (reg === '0150') parts[p[2]] = { nome: String(p[3] || '').trim(), cnpj: U.digits(p[5]) || U.digits(p[6]), ie: U.digits(p[7]), uf: UF_IBGE[String(p[8] || '').slice(0, 2)] || '' };
      else if (reg === '0200') prods[p[2]] = { nome: String(p[3] || '').trim(), gtin: U.digits(p[4]), ncm: U.digits(p[8]), cest: U.digits(p[13]) };
      else if (reg === 'C100') {
        nota = null;
        if (p[2] !== '0' || ['02', '03', '04', '05'].includes(p[6])) return;
        nota = { nf: String(+U.digits(p[8]) || p[8]), serie: String(p[7] || '').trim(), mod: p[5], part: p[4], chave: U.digits(p[9]), emissao: dataEFD(p[10]), entrada: dataEFD(p[11]), valor: num(p[12]), cfops: [], itens: [] };
        notas.push(nota);
      } else if (reg === 'C170' && nota) {
        // [nº item, código, descrição complementar, qtd, valor, desconto, CST/CSOSN, CFOP, ICMS-ST destacado]
        nota.itens.push([+p[2] || nota.itens.length + 1, String(p[3] || '').trim(), String(p[4] || '').trim(), num(p[5]), num(p[7]), num(p[8]), U.digits(p[10]), U.digits(p[11]), num(p[18])]);
      } else if (reg === 'C190' && nota) {
        const cf = U.digits(p[3]);
        if (cf && !nota.cfops.includes(cf)) nota.cfops.push(cf);
      }
    });
    if (!cab) return null;
    const warnings = [];
    if (!notas.length) warnings.push('O SPED não tem notas de entrada (C100 com indicador de entrada).');
    const usados = new Set(), partsUsadas = new Set();
    notas.forEach(n => { partsUsadas.add(n.part); n.itens.forEach(i => usados.add(i[1])); if (!n.itens.length) warnings.push(`NF ${n.nf}: escriturada sem itens (C170); só os totais por CFOP.`); });
    const produtos = {}, participantes = {};
    usados.forEach(c => { if (prods[c]) produtos[c] = prods[c]; });
    partsUsadas.forEach(c => { if (parts[c]) participantes[c] = parts[c]; });
    return {
      kind: 'entradas',
      data: {
        formato: 'efd-icms-ipi', empresaNome: cab.nome, cnpj: cab.cnpj, ie: cab.ie, uf: cab.uf, referencia: cab.ini.slice(0, 7), periodo: { ini: cab.ini, fim: cab.fim },
        participantes, produtos, notas, nNotas: notas.length, nItens: U.sum(notas, n => n.itens.length), total: U.round2(U.sum(notas, n => n.valor))
      },
      warnings: warnings.slice(0, 6)
    };
  }

  /** CFOP de entrada para mercadoria com ICMS-ST já retido/cobrado. */
  const ehCompraCfop = cf => /^[12](10[12]|11[0-8]|12[0-2]|40[13]|65[2-9])$/.test(cf) || ['2401', '1401'].includes(cf);
  const cfopEntST = cf => ({ 1102: '1403', 2102: '2403', 1101: '1401', 2101: '2401', 1403: '1403', 2403: '2403', 1401: '1401', 2401: '2401', 1202: '1411', 2202: '2411', 1411: '1411', 2411: '2411' }[cf] || '');

  /** Notas de entrada (SPEDs importados até a referência) cruzadas com as cobranças da SEFAZ. */
  function entradasDaEmpresa(state, model, company, ref) {
    const cid = company.id;
    const porRef = {};
    state.docs.filter(d => d.kind === 'entradas' && d.link && d.link.companyId === cid && (d.link.referencia || d.data.referencia) <= ref)
      .sort((a, b) => String(b.importedAt).localeCompare(String(a.importedAt)))
      .forEach(d => { const r = d.link.referencia || d.data.referencia; if (!porRef[r]) porRef[r] = d; });
    const docs = Object.values(porRef);
    if (!docs.length) return null;
    const charges = model.charges.filter(c => c.companyId === cid);
    const cobDa = (nf, cnpj) => charges.filter(c => String(+c.numero) === String(+nf) && (!(U.digits(c.cnpjRemetente).length === 14 && cnpj.length === 14) || U.digits(c.cnpjRemetente) === cnpj));
    const ufEmp = company.uf || '';
    const notas = [], porGtin = new Map(), porNome = new Map(), porCod = new Map();
    const add = (map, k, e) => { if (!k) return; const l = map.get(k); if (l) l.push(e); else map.set(k, [e]); };
    docs.forEach(d => {
      const r = d.link.referencia || d.data.referencia;
      d.data.notas.forEach(n => {
        const pt = d.data.participantes[n.part] || {};
        const cob = cobDa(n.nf, pt.cnpj || '');
        const N = Object.assign({}, n, { ref: r, fornecedor: pt.nome || '', cnpj: pt.cnpj || '', uf: pt.uf || '', interna: !!pt.uf && pt.uf === (d.data.uf || ufEmp), cobST: cob.some(c => c.tipo === 'ST'), cobEQ: cob.some(c => c.tipo === 'EQ') });
        const cfs = n.cfops.length ? n.cfops : U.uniq(n.itens.map(i => i[7]).filter(Boolean));
        N.natureza = !cfs.length || cfs.some(ehCompraCfop) ? 'compra' : cfs.every(c => /^[12](20[12]|41[01])$/.test(c)) ? 'devolucao' : 'outra';
        notas.push(N);
        n.itens.forEach(it => {
          // só compras para revenda servem de origem do produto (devolução de cliente, frete, remessa etc. ficam de fora)
          if (it[7] && !ehCompraCfop(it[7])) return;
          const pr = d.data.produtos[it[1]] || { nome: it[2], gtin: '', ncm: '', cest: '' };
          const e = { nota: N, item: it, prod: pr };
          if (temGtin(pr.gtin)) add(porGtin, pr.gtin.replace(/^0+/, ''), e);
          add(porNome, U.normKey(pr.nome || it[2]), e);
          // na Domínio, entradas e saídas usam o mesmo cadastro de produtos
          if (d.data.formato === 'dominio-produtos-nota') add(porCod, it[1], e);
        });
      });
    });
    notas.sort((a, b) => String(a.entrada || a.emissao).localeCompare(String(b.entrada || b.emissao)) || (+a.nf - +b.nf));
    const refs = U.uniq(docs.map(d => d.link.referencia || d.data.referencia)).sort();
    const nfs = new Set(notas.map(n => String(+n.nf)));
    const vistos = new Set();
    const semNota = charges.filter(c => refs.includes(c.referencia) && !nfs.has(String(+c.numero)) && !vistos.has(c.tipo + c.numero) && vistos.add(c.tipo + c.numero))
      .sort((a, b) => a.tipo.localeCompare(b.tipo) || (+a.numero - +b.numero));
    return { docs, refs, notas, porGtin, porNome, porCod, semNota };
  }

  /* ============================================================
   * Simples Nacional — Anexo I (comércio)
   * ============================================================ */
  // [limite da faixa, alíquota nominal, parcela a deduzir, % do ICMS na partilha]
  const ANEXO_I = [[180000, 0.04, 0, 0.34], [360000, 0.073, 5940, 0.34], [720000, 0.095, 13860, 0.335], [1800000, 0.107, 22500, 0.335], [3600000, 0.143, 87300, 0.335], [4800000, 0.19, 378000, 0]];
  function aliquotaAnexoI(rbt12) {
    if (!(rbt12 > 0)) return { faixa: 1, nominal: 0.04, deducao: 0, efetiva: 0.04, pIcms: 0.34 };
    let i = ANEXO_I.findIndex(f => rbt12 <= f[0]);
    if (i < 0) i = ANEXO_I.length - 1;
    const f = ANEXO_I[i];
    return { faixa: i + 1, nominal: f[1], deducao: f[2], efetiva: (rbt12 * f[1] - f[2]) / rbt12, pIcms: f[3] };
  }
  const refAdd = (ref, n) => { const [y, m] = ref.split('-').map(Number); const d = new Date(Date.UTC(y, m - 1 + n, 1)); return d.toISOString().slice(0, 7); };
  const mesesEntre = (a, b) => { const [ya, ma] = a.split('-').map(Number), [yb, mb] = b.split('-').map(Number); return (yb - ya) * 12 + (mb - ma); };

  /** Receita de cada mês da empresa: Controle do Simples (preferência) ou total do Registro de Saídas. */
  function receitasPorMes(state, companyId) {
    const out = {};
    state.docs.filter(d => d.kind === 'saidas' && d.link && d.link.companyId === companyId).forEach(d => { const r = d.link.referencia || d.data.referencia; if (r) out[r] = { valor: d.data.total, fonte: 'Registro de Saídas' }; });
    state.docs.filter(d => d.kind === 'simples' && d.link && d.link.companyId === companyId).forEach(d => { const r = d.link.referencia || d.data.referencia; if (r) out[r] = { valor: U.round2(d.data.receita - (d.data.devolucoes || 0)), fonte: 'Controle do Simples' }; });
    return out;
  }

  /** RBT12 sugerida (LC 123/2006, art. 3º, § 2º e art. 18, §§ 1º e 2º): proporcionalizada no início de atividade. */
  function rbt12Sugerida(state, company, ref, receitaMes) {
    const rec = receitasPorMes(state, company.id);
    const ab = String(company.dataAbertura || '').slice(0, 7);
    if (ab && /^\d{4}-\d{2}$/.test(ab)) {
      const n = mesesEntre(ab, ref);
      if (n <= 0) return { valor: U.round2(receitaMes * 12), nota: 'Primeiro mês de atividade: receita do próprio mês × 12.', faltam: [] };
      if (n < 12) {
        const meses = Array.from({ length: n }, (_, i) => refAdd(ab, i));
        const faltam = meses.filter(m => !rec[m]);
        const soma = U.sum(meses, m => rec[m] ? rec[m].valor : 0);
        return { valor: U.round2(soma / n * 12), nota: `Início de atividade em ${U.refLabel(ab)}: média dos ${n} mês(es) anteriores × 12${faltam.length ? ` (sem relatório de ${faltam.map(U.refLabel).join(', ')}: considerados sem receita)` : ''}.`, faltam };
      }
    }
    const meses = Array.from({ length: 12 }, (_, i) => refAdd(ref, -12 + i));
    const faltam = meses.filter(m => !rec[m]);
    if (faltam.length === 12) return { valor: null, nota: 'Sem relatórios dos 12 meses anteriores: informe a RBT12 que consta no PGDAS-D.', faltam };
    return { valor: U.round2(U.sum(meses, m => rec[m] ? rec[m].valor : 0)), nota: faltam.length ? `Soma dos 12 meses anteriores — faltam ${faltam.length} mês(es) (${faltam.map(U.refLabel).join(', ')}); confira com o PGDAS-D.` : 'Soma da receita dos 12 meses anteriores.', faltam };
  }

  /* ============================================================
   * Classificação das vendas
   * ============================================================ */
  const SIT = {
    st_cobrado: { nome: 'ST - ICMS-ST cobrado na entrada', st: true, cls: 'forte' },
    st_retido: { nome: 'ST - ICMS-ST retido antes (NF de entrada)', st: true, cls: 'forte' },
    st_conferir: { nome: 'ST - conferir a NF de entrada', st: true, cls: 'moderada' },
    st_manual: { nome: 'ST - definido manualmente', st: true, cls: 'forte' },
    st_ja: { nome: 'Já vendido como ST (CSOSN 500 / CST 60)', st: true, cls: 'ok' },
    eq: { nome: 'Não ST - Equalização (não encerra a tributação)', st: false, cls: 'neutro' },
    prep: { nome: 'Não ST - produção própria / preparado na loja', st: false, cls: 'neutro' },
    contestado: { nome: 'Não ST - cobrança de ST contestada', st: false, cls: 'neutro' },
    nao: { nome: 'Não ST - fora do Subanexo I', st: false, cls: 'neutro' },
    nao_manual: { nome: 'Não ST - definido manualmente', st: false, cls: 'neutro' }
  };
  const FORTES = ['st_cobrado', 'st_retido', 'st_manual'];
  const AJUSTES = [['', 'Automático'], ['st', 'É ST'], ['prep', 'Preparado na loja (não ST)'], ['nao', 'Não é ST']];
  const PREP_NCM = ['2202', '2106', '1901', '2101', '0403', '2105'];
  // palavras comuns que não ajudam a escolher o CEST
  const STOP = new Set(['EMBAL', 'CONTE', 'INFER', 'SUPER', 'IGUAL', 'EXCET', 'CLASS', 'OUTRO', 'OUTRA', 'INCLU', 'DEMAI', 'MESMO', 'CONTI', 'UNIDA', 'PRODU', 'PREPA']);
  const stems = s => new Set(U.norm(s).replace(/[^A-Z ]/g, ' ').split(' ').filter(w => w.length >= 4).map(w => w.slice(0, 5)).filter(w => !STOP.has(w)));
  /** Item do Subanexo cuja descrição mais se parece com o nome do produto (null se nenhuma palavra em comum ou empate). */
  function melhorCest(nome, cands) {
    const sp = stems(nome);
    const pont = cands.map(e => { let n = 0; stems(e.desc).forEach(w => { if (sp.has(w)) n++; }); return { e, n }; }).sort((a, b) => b.n - a.n);
    if (!pont.length || !pont[0].n || (pont[1] && pont[1].n === pont[0].n && pont[1].e.cest !== pont[0].e.cest)) return null;
    return pont[0].e;
  }
  const jaST = cst => { const d = U.digits(cst); return d.length >= 4 ? d.slice(-3) === '500' : d.length >= 2 && d.slice(-2) === '60'; };
  /** Linha de venda já tratada como ST: pelo CSOSN/CST ou, quando o relatório não traz o CST (Domínio), pelo CFOP 5401/5403/5405/6401/6403/6404. */
  const jaSTL = l => U.digits(l[6]) ? jaST(l[6]) : /^[56]40[1-5]$/.test(l[5]);
  const cfopST = cfop => ({ 5101: '5401', 5102: '5405', 5403: '5403', 5405: '5405', 6101: '6401', 6102: '6404', 6403: '6403', 6404: '6404' }[cfop] || cfop);
  const csosnST = cst => { const d = U.digits(cst); return d.length >= 4 ? d.charAt(0) + '500' : '500'; };
  const temGtin = e => { const d = U.digits(e); return d.length >= 8 && !/^0+$/.test(d); };
  const cnaesDe = c => [c.cnaePrincipal].concat(c.cnaesSecundarios || []).filter(Boolean).map(x => U.digits(x.codigo || x.cod || x));

  /** O que se sabe dos produtos pelas cobranças da empresa (memórias de ICMS-ST e de Equalização). */
  function conhecimento(model, companyId) {
    const contest = new Set(model.findings.filter(f => f.integral && f.escopo === 'item' && !['descartado', 'indeferido'].includes(f.status)).map(f => f.itemId));
    const porGtin = new Map(), porNome = new Map();
    const add = (map, k, it) => {
      if (!k) return;
      let e = map.get(k);
      if (!e) { e = { ST: [], EQ: [], contest: [] }; map.set(k, e); }
      if (it.tipo === 'ST' && contest.has(it.id)) e.contest.push(it); else if (it.tipo === 'ST') e.ST.push(it); else if (it.tipo === 'EQ') e.EQ.push(it);
    };
    model.items.filter(i => i.companyId === companyId).forEach(it => {
      if (temGtin(it.gtin)) add(porGtin, U.digits(it.gtin).replace(/^0+/, ''), it);
      add(porNome, U.normKey(it.descricao), it);
    });
    return { porGtin, porNome, add };
  }

  /** Relatórios sem GTIN (Domínio): liga o item da nota de entrada ao item da memória da SEFAZ da mesma NF
   * (mesmo NCM; havendo vários, a descrição mais parecida) e devolve, por código do produto, o que se sabe dele. */
  function conhecimentoPorEntrada(model, companyId, E, kn) {
    const porCod = new Map();
    if (!E) return porCod;
    const porNF = new Map();
    model.items.filter(i => i.companyId === companyId).forEach(i => { const k = String(+i.numero); const l = porNF.get(k); if (l) l.push(i); else porNF.set(k, [i]); });
    E.porCod.forEach((ents, cod) => {
      ents.forEach(e => {
        const cands = (porNF.get(String(+e.nota.nf)) || []).filter(i => U.digits(i.ncm).slice(0, 8) === e.prod.ncm);
        if (!cands.length) return;
        ['ST', 'EQ'].forEach(tipo => {
          const ct = cands.filter(i => i.tipo === tipo);
          if (!ct.length) return;
          let it = ct.find(i => U.normKey(i.descricao) === U.normKey(e.prod.nome));
          if (!it && ct.length === 1) it = ct[0];
          if (!it) { const m = melhorCest(e.prod.nome, ct.map(i => ({ desc: i.descricao, cest: i.id, i }))); it = m ? m.i : null; }
          if (it) kn.add(porCod, cod, it);
        });
      });
    });
    return porCod;
  }

  function analisar(state, model, companyId, ref) {
    const company = model.companies.get(companyId) || state.companies.find(c => c.id === companyId);
    const docS = state.docs.filter(d => d.kind === 'saidas' && d.link && d.link.companyId === companyId && (d.link.referencia || d.data.referencia) === ref).sort((a, b) => String(b.importedAt).localeCompare(String(a.importedAt)))[0];
    if (!company || !docS) return null;
    const docC = state.docs.filter(d => d.kind === 'simples' && d.link && d.link.companyId === companyId && (d.link.referencia || d.data.referencia) === ref).sort((a, b) => String(b.importedAt).localeCompare(String(a.importedAt)))[0] || null;
    const sub = global.RST_SUB && ((state.subanexo && state.subanexo.itens) ? state.subanexo : global.RST_SUBANEXO_PADRAO);
    const kn = conhecimento(model, companyId);
    const alim = cnaesDe(company).some(c => c.startsWith('56'));
    const ajustes = ((state.vendas || {}).ajustes || {})[companyId] || {};
    const sd = docS.data;
    const E = entradasDaEmpresa(state, model, company, ref);
    const knC = conhecimentoPorEntrada(model, companyId, sd.formato === 'dominio-produtos-nota' ? E : null, kn);
    const nomeForn = s => String(s || '').replace(/[^\p{L}\p{N}& ]+/gu, ' ').trim().split(/\s+/).slice(0, 3).join(' ');
    const nfsTxt = list => { const u = U.uniq(list.map(e => `${e.nota.nf}${e.nota.fornecedor ? ` (${nomeForn(e.nota.fornecedor)}${e.nota.uf ? '/' + e.nota.uf : ''})` : ''}`)); return u.slice(0, 4).join(', ') + (u.length > 4 ? '…' : ''); };

    // totais por produto
    const porCod = {};
    sd.linhas.forEach(l => {
      const p = porCod[l[0]] || (porCod[l[0]] = { qtd: 0, bruto: 0, desc: 0, liq: 0, liqJa: 0, csts: new Set(), cfops: new Set(), nfs: new Set() });
      const liq = l[7] - l[8];
      p.qtd += l[4]; p.bruto += l[7]; p.desc += l[8]; p.liq += liq; if (jaSTL(l)) p.liqJa += liq;
      p.csts.add(l[6]); p.cfops.add(l[5]); p.nfs.add(l[1]);
    });

    const produtos = Object.entries(sd.produtos).map(([cod, pr]) => {
      const t = porCod[cod] || { qtd: 0, bruto: 0, desc: 0, liq: 0, liqJa: 0, csts: new Set(), cfops: new Set(), nfs: new Set() };
      const gt = U.digits(pr.ean).length >= 8 ? U.digits(pr.ean) : (/^\d{8,14}$/.test(cod) ? cod : '');
      const ent = (temGtin(gt) && kn.porGtin.get(gt.replace(/^0+/, ''))) || knC.get(cod) || kn.porNome.get(U.normKey(pr.nome)) || null;
      const ofic = sub && pr.ncm ? global.RST_SUB.buscarItem(sub, pr.cest, pr.ncm) : { cands: [], especificos: [] };
      let sit = 'nao', cest = U.digits(pr.cest), notas = [], obs = '';
      const aj = ajustes[cod] || {};
      if (ent && ent.ST.length) {
        sit = 'st_cobrado'; cest = cest || U.digits(ent.ST[0].cest || ent.ST[0].cestXml);
        notas = U.uniq(ent.ST.map(i => i.numero)).sort((a, b) => +a - +b);
        obs = temGtin(gt) && kn.porGtin.get(gt.replace(/^0+/, '')) ? 'Mesmo GTIN cobrado com ICMS-ST nas NFs de entrada indicadas.'
          : knC.get(cod) === ent ? 'Item da NF de entrada (mesmo NCM e descrição) cobrado com ICMS-ST na memória da SEFAZ.'
          : 'Mesmo produto (descrição) cobrado com ICMS-ST nas NFs de entrada indicadas.';
      } else if (ent && ent.contest.length) {
        sit = 'contestado'; obs = 'A cobrança de ICMS-ST deste produto está sendo contestada como indevida no app; por coerência, a venda segue tributada no Simples.';
      } else if (ent && ent.EQ.length) {
        sit = 'eq'; obs = 'Cobrado com Equalização (Dec. 15.055/2018), que não encerra a tributação: a venda segue tributada no Simples (CSOSN 102).';
      } else if (alim && !temGtin(gt) && PREP_NCM.some(n => pr.ncm.startsWith(n))) {
        sit = 'prep'; obs = 'Sem GTIN e sem entrada correspondente numa empresa de alimentação (CNAE 56): provável item preparado na loja, tributado no Simples. Confirme e ajuste se for mercadoria revendida.';
      } else if (ofic.cands.length) {
        const esp = ofic.especificos.length ? ofic.especificos : ofic.cands;
        const exato = esp.some(e => (e.ncm || []).some(n => U.digits(n).length >= 8 && pr.ncm.startsWith(U.digits(n))));
        const melhor = melhorCest(pr.nome, esp);
        if (!exato && !melhor) {
          sit = 'nao';
          obs = `O NCM só coincide com posição genérica do Subanexo I (${U.uniq(esp.map(e => `CEST ${U.fmtCEST(e.cest)} - ${e.desc}`)).slice(0, 2).join('; ').slice(0, 160)}…), sem relação aparente com o produto. Marque "É ST" se for o caso.`;
        } else {
          sit = 'st_conferir';
          if (!cest) cest = esp.length === 1 ? esp[0].cest : (melhor ? melhor.cest : '');
          obs = `NCM listado no Subanexo I (${U.uniq(esp.map(e => `CEST ${U.fmtCEST(e.cest)}`)).slice(0, 4).join(', ')}${esp.length > 4 ? '…' : ''}), mas o produto não aparece nas memórias de ICMS-ST da empresa. Confira a descrição do CEST e se a NF de entrada teve o ST retido ou cobrado.`;
        }
      } else {
        obs = pr.ncm ? 'NCM fora da relação do Subanexo I.' : 'Produto sem NCM no relatório.';
      }
      // entradas do SPED: resolve os "conferir" e mostra de onde veio o produto
      const ents = E ? ((temGtin(gt) && E.porGtin.get(gt.replace(/^0+/, ''))) || (sd.formato === 'dominio-produtos-nota' && E.porCod.get(cod)) || E.porNome.get(U.normKey(pr.nome)) || []) : [];
      // NCM fora do Subanexo (ou só em posição genérica), mas o fornecedor destacou ICMS-ST na NF de entrada
      if (E && sit === 'nao' && !(ent && (ent.EQ.length || ent.contest.length))) {
        const dest = ents.filter(e => e.item[8] > 0);
        if (dest.length) {
          sit = 'st_retido'; notas = U.uniq(dest.map(e => e.nota.nf));
          obs = `ICMS-ST destacado pelo fornecedor na NF de entrada ${nfsTxt(dest)} (CFOP ${U.uniq(dest.map(e => e.item[7])).join('/')}). ${obs} Confira o enquadramento antes de alterar o cadastro.`;
        }
      }
      if (E && sit === 'st_conferir') {
        const retido = ents.filter(e => e.item[8] > 0);
        const cfST = ents.filter(e => CFOP_ENT_ST.includes(e.item[7]));
        const internas = ents.filter(e => e.nota.interna);
        const cobST = ents.filter(e => e.nota.cobST);
        const cobEQ = ents.filter(e => e.nota.cobEQ);
        if (retido.length) {
          sit = 'st_retido'; notas = U.uniq(retido.map(e => e.nota.nf));
          obs = `ICMS-ST destacado pelo fornecedor na NF de entrada ${nfsTxt(retido)}.`;
        } else if (cfST.length) {
          sit = 'st_retido'; notas = U.uniq(cfST.map(e => e.nota.nf));
          obs = `Entrada escriturada com CFOP ${U.uniq(cfST.map(e => e.item[7])).join('/')} (mercadoria com ICMS-ST) na NF ${nfsTxt(cfST)}.`;
        } else if (cobST.length) {
          obs = `A NF de entrada ${nfsTxt(cobST)} tem cobrança de ICMS-ST no app, mas a memória importada não traz este produto. Confira se o item foi cobrado e importe a memória completa.`;
        } else if (internas.length) {
          sit = 'st_retido'; notas = U.uniq(internas.map(e => e.nota.nf));
          obs = `Comprado dentro do estado, na NF ${nfsTxt(internas)}: o ICMS-ST já foi retido ou recolhido antes na cadeia. Confira na NF se o fornecedor é varejista ou se reteve o imposto.`;
        } else if (ents.length) {
          obs = `Entrou na NF ${nfsTxt(ents)}, mas essa nota não tem cobrança de ICMS-ST importada no app${cobEQ.length ? ' (só de Equalização)' : ''}. Confira no portal da SEFAZ se o ICMS-ST foi cobrado e importe a memória.`;
        } else {
          obs += ' Não há entrada deste produto nas notas de entrada importadas (SPED ou Domínio) — pode ter sido comprado em mês anterior.';
        }
      }
      const entrada = ents.length ? {
        nfs: U.uniq(ents.map(e => e.nota.nf)).sort((a, b) => +a - +b),
        fornecedores: U.uniq(ents.map(e => `${e.nota.fornecedor}${e.nota.uf ? '/' + e.nota.uf : ''}`)),
        cfops: U.uniq(ents.map(e => e.item[7]).filter(Boolean)).sort(),
        txt: nfsTxt(ents)
      } : null;
      if (aj.sit === 'st') { sit = 'st_manual'; obs = 'Definido como ST pelo usuário. ' + obs; }
      else if (aj.sit === 'prep') { sit = 'prep'; obs = 'Definido pelo usuário como preparado na loja.'; }
      else if (aj.sit === 'nao') { sit = 'nao_manual'; obs = 'Definido pelo usuário como não sujeito à ST. ' + obs; }
      if (aj.cest) cest = U.digits(aj.cest);
      if (SIT[sit].st && t.liq > 0 && Math.abs(t.liqJa - t.liq) < 0.005) sit = 'st_ja';
      const descCest = cest && sub ? ((global.RST_SUB.indice(sub).porCest.get(cest) || [])[0] || {}).desc || '' : '';
      return {
        cod, nome: pr.nome, ean: pr.ean, tipo: pr.tipo, ncm: pr.ncm, cest, descCest, sit, ajuste: aj.sit || '', cestAjuste: aj.cest || '',
        csts: [...t.csts].sort(), cfops: [...t.cfops].sort(), nNFs: t.nfs.size,
        qtd: U.round2(t.qtd * 1000) / 1000, bruto: U.round2(t.bruto), desc: U.round2(t.desc), liq: U.round2(t.liq), liqJa: U.round2(t.liqJa),
        notas, obs, entrada, cands: ofic.especificos.length ? ofic.especificos : ofic.cands
      };
    });
    const ordem = Object.keys(SIT);
    produtos.sort((a, b) => ordem.indexOf(a.sit) - ordem.indexOf(b.sit) || b.liq - a.liq);

    // parâmetros do DAS
    const receitaMes = docC ? U.round2(docC.data.receita - (docC.data.devolucoes || 0)) : sd.total;
    const key = `${companyId}|${ref}`;
    const par = ((state.vendas || {}).params || {})[key] || {};
    const sug = rbt12Sugerida(state, company, ref, receitaMes);
    const rbt12 = par.rbt12 !== undefined && par.rbt12 !== '' && par.rbt12 !== null ? +par.rbt12 : sug.valor;
    const calc = aliquotaAnexoI(rbt12 || 0);
    const aliq = par.aliq !== undefined && par.aliq !== '' && par.aliq !== null ? +par.aliq / 100 : calc.efetiva;
    const pIcms = par.pIcms !== undefined && par.pIcms !== '' && par.pIcms !== null ? +par.pIcms / 100 : calc.pIcms;
    const fator = aliq * pIcms;

    const soma = f => U.round2(U.sum(produtos.filter(f), p => p.liq - p.liqJa));
    const forte = p => FORTES.includes(p.sit);
    const tot = {
      receitaMes, receitaSaidas: sd.total,
      cobrado: soma(forte),
      conferir: soma(p => p.sit === 'st_conferir'),
      jaST: U.round2(U.sum(produtos, p => p.liqJa)),
      naoST: U.round2(U.sum(produtos.filter(p => !SIT[p.sit].st), p => p.liq))
    };
    tot.icmsCobrado = U.round2(U.sum(produtos.filter(forte), p => U.round2((p.liq - p.liqJa) * fator)));
    tot.icmsConferir = U.round2(U.sum(produtos.filter(p => p.sit === 'st_conferir'), p => U.round2((p.liq - p.liqJa) * fator)));
    tot.icms = U.round2(tot.icmsCobrado + tot.icmsConferir);

    // itens das notas de entrada com a situação do produto (para a aba do Excel e a tela)
    let entradas = null;
    if (E) {
      const pG = new Map(), pN = new Map(), pC = new Map();
      const dom = sd.formato === 'dominio-produtos-nota';
      produtos.forEach(p => {
        if (dom) pC.set(p.cod, p);
        const g = U.digits(p.ean).length >= 8 ? U.digits(p.ean) : (/^\d{8,14}$/.test(p.cod) ? p.cod : '');
        if (temGtin(g) && !pG.has(g.replace(/^0+/, ''))) pG.set(g.replace(/^0+/, ''), p);
        const k = U.normKey(p.nome); if (k && !pN.has(k)) pN.set(k, p);
      });
      const itens = [];
      E.notas.forEach(n => n.itens.forEach(it => {
        const d = E.docs.find(x => (x.link.referencia || x.data.referencia) === n.ref);
        const pr = (d && d.data.produtos[it[1]]) || { nome: it[2], gtin: '', ncm: '', cest: '' };
        const gk = temGtin(pr.gtin) ? pr.gtin.replace(/^0+/, '') : '';
        const pv = (gk && pG.get(gk)) || (d && d.data.formato === 'dominio-produtos-nota' && pC.get(it[1])) || pN.get(U.normKey(pr.nome || it[2])) || null;
        let situacao, st, talvez = false;
        if (pv) { situacao = SIT[pv.sit].nome; st = SIT[pv.sit].st; talvez = pv.sit === 'st_conferir'; }
        else {
          const k = (gk && kn.porGtin.get(gk)) || kn.porNome.get(U.normKey(pr.nome || it[2])) || null;
          if (k && k.ST.length) { situacao = 'Não vendido no mês - ICMS-ST cobrado na entrada'; st = true; }
          else if (k && k.contest.length) { situacao = 'Não vendido no mês - cobrança de ST contestada'; st = false; }
          else if (k && k.EQ.length) { situacao = 'Não vendido no mês - Equalização'; st = false; }
          else if (it[8] > 0) { situacao = 'Não vendido no mês - ICMS-ST destacado na NF de entrada'; st = true; }
          else { situacao = 'Não vendido no mês'; st = false; }
        }
        const cfC = st ? (cfopEntST(it[7]) || (!it[7] || ehCompraCfop(it[7]) ? (n.interna ? '1403' : '2403') : '')) : '';
        itens.push({ nota: n, item: it, prod: pr, situacao, st, cfopCorreto: cfC ? cfC + (talvez ? ' (se confirmado o ST)' : '') : '' });
      }));
      entradas = { refs: E.refs, notas: E.notas, semNota: E.semNota, itens, docs: E.docs };
    }
    return { company, ref, docS, docC, produtos, tot, entradas, param: { rbt12, sug, calc, aliq, pIcms, fator, manual: { rbt12: par.rbt12, aliq: par.aliq, pIcms: par.pIcms } }, alim };
  }

  /* ============================================================
   * Excel
   * ============================================================ */
  function exportar(an, filtroSit) {
    const X = global.XLSX;
    if (!X) throw new Error('Biblioteca de planilhas não carregada.');
    const c = an.company;
    const nomeEmp = c.razaoSocial || c.nomeFantasia || 'Empresa';
    const prods = an.produtos;
    const cell = (v, z) => (typeof v === 'number' ? { t: 'n', v, z } : { t: 's', v: String(v ?? '') });
    const fml = (f, z) => ({ t: 'n', f, z });
    const M = '#,##0.00', P = '0.0000%';
    const CAD = "'Cadastro ERP'";
    const L = SIT;

    // --- Cadastro ERP ---
    const hCad = ['Situação', 'Código', 'Produto', 'EAN/GTIN', 'NCM no ERP', 'CEST a informar', 'Descrição do CEST (Subanexo I)', 'CST/CSOSN emitido', 'CSOSN correto', 'CFOP emitido', 'CFOP correto', 'Qtd vendida', 'Receita líquida (R$)', 'Receita já emitida como ST (R$)', 'ICMS do DAS pago a mais (R$)', 'NFs de entrada com ICMS-ST', 'NFs de entrada no SPED', 'Fornecedor/UF', 'CFOP de entrada escriturado', 'CFOP de entrada correto', 'Observação'];
    const aCad = [hCad.map(v => cell(v))];
    const temEnt = !!an.entradas;
    prods.forEach((p, i) => {
      const r = i + 2, st = L[p.sit].st, e = p.entrada;
      const cfEnt = e ? e.cfops : [];
      aCad.push([cell(L[p.sit].nome), cell(p.cod), cell(p.nome), cell(p.ean), cell(U.fmtNCM(p.ncm)), cell(U.fmtCEST(p.cest) || (st ? 'conferir' : '')), cell(p.descCest),
        cell(p.csts.join(' / ')), cell(st ? U.uniq(p.csts.map(csosnST)).join(' / ') + ' (CSOSN 500)' : 'sem alteração'), cell(p.cfops.join(' / ')), cell(st ? U.uniq(p.cfops.map(cfopST)).join(' / ') : 'sem alteração'),
        cell(p.qtd, '#,##0.###'), cell(p.liq, M), cell(p.liqJa, M), fml(`IF(LEFT(A${r},2)="ST",ROUND((M${r}-N${r})*Resumo!$C$18,2),0)`, M), cell(p.notas.join(', ')),
        cell(e ? e.nfs.join(', ') : (temEnt ? 'sem entrada no SPED' : '')), cell(e ? e.fornecedores.join('; ') : ''), cell(cfEnt.join(' / ')),
        cell(e ? (st ? U.uniq(cfEnt.map(c => cfopEntST(c) || c)).join(' / ') + (p.sit === 'st_conferir' ? ' (se confirmado o ST)' : '') : 'sem alteração') : ''), cell(p.obs)]);
    });
    const lc = prods.length + 1;
    aCad.push([cell('TOTAL'), ...Array(11).fill(cell('')), fml(`SUBTOTAL(9,M2:M${lc})`, M), fml(`SUBTOTAL(9,N2:N${lc})`, M), fml(`SUBTOTAL(9,O2:O${lc})`, M), ...Array(6).fill(cell(''))]);
    const wsCad = X.utils.aoa_to_sheet([[]]);
    X.utils.sheet_add_aoa(wsCad, aCad, { origin: 'A1' });
    wsCad['!cols'] = [34, 15, 46, 16, 11, 13, 40, 12, 22, 10, 12, 10, 14, 14, 15, 20, 20, 30, 12, 12, 80].map(w => ({ wch: w }));
    wsCad['!autofilter'] = { ref: `A1:U${lc}` };

    // --- Entradas (SPED) ---
    let wsE = null;
    if (temEnt) {
      const E = an.entradas;
      const hE = ['NF', 'Série', 'Modelo', 'Emissão', 'Entrada', 'Fornecedor', 'CNPJ', 'UF', 'Chave de acesso', 'Item', 'Código no ERP', 'Produto', 'EAN/GTIN', 'NCM', 'Qtd', 'Valor (R$)', 'ICMS-ST destacado (R$)', 'CST/CSOSN escriturado', 'CFOP escriturado', 'CFOP correto', 'Situação do produto', 'Cobrança da SEFAZ na NF'];
      const aE = [hE.map(v => cell(v))];
      const dtc = iso => iso ? { t: 'd', v: new Date(iso + 'T12:00:00'), z: 'dd/mm/yyyy' } : cell('');
      const cobTxt = n => n.cobST && n.cobEQ ? 'ICMS-ST e Equalização' : n.cobST ? 'ICMS-ST' : n.cobEQ ? 'Equalização' : n.natureza === 'devolucao' ? 'Devolução de venda (sem cobrança)' : n.natureza === 'outra' ? 'Não é compra para revenda' : n.interna ? 'Compra interna (sem cobrança)' : 'Não localizada no app';
      E.itens.forEach(x => {
        const n = x.nota, it = x.item;
        aE.push([cell(+n.nf || n.nf), cell(n.serie), cell(n.mod), dtc(n.emissao), dtc(n.entrada), cell(n.fornecedor), cell(U.fmtCNPJ(n.cnpj)), cell(n.uf), cell(n.chave), cell(it[0]), cell(it[1]), cell(x.prod.nome || it[2]), cell(x.prod.gtin), cell(U.fmtNCM(x.prod.ncm)),
          cell(it[3], '#,##0.###'), cell(it[4], M), cell(it[8], M), cell(it[6]), cell(it[7]), cell(x.cfopCorreto || 'sem alteração'), cell(x.situacao), cell(cobTxt(n))]);
      });
      const le = E.itens.length + 1;
      aE.push([cell('TOTAL'), ...Array(13).fill(cell('')), fml(`SUBTOTAL(9,O2:O${le})`, '#,##0.###'), fml(`SUBTOTAL(9,P2:P${le})`, M), fml(`SUBTOTAL(9,Q2:Q${le})`, M)]);
      const semItens = E.notas.filter(n => !n.itens.length);
      if (semItens.length) {
        aE.push([], [cell('Notas escrituradas sem itens (só totais por CFOP)')], [cell('NF'), cell('Emissão'), cell('Fornecedor'), cell('UF'), cell('Valor (R$)'), cell('CFOP'), cell('Cobrança da SEFAZ na NF')]);
        semItens.forEach(n => aE.push([cell(+n.nf || n.nf), dtc(n.emissao), cell(n.fornecedor), cell(n.uf), cell(n.valor, M), cell(n.cfops.join(' / ')), cell(cobTxt(n))]));
      }
      aE.push([], [cell(`Cobranças da SEFAZ sem nota de entrada escriturada no SPED (${E.refs.map(U.refLabel).join(', ')})`)]);
      if (E.semNota.length) {
        aE.push([cell('NF'), cell('Tributo'), cell('Referência'), cell('CNPJ remetente'), cell('UF'), cell('Valor da NF (R$)'), cell('ICMS cobrado (R$)')]);
        E.semNota.forEach(c => aE.push([cell(+c.numero || c.numero), cell(c.tipo === 'EQ' ? 'Equalização (349)' : 'ICMS-ST (333)'), cell(U.refLabel(c.referencia)), cell(U.fmtCNPJ(c.cnpjRemetente)), cell(c.ufRemetente || ''), cell(+c.valorNF || 0, M), cell(+c.valorICMS || 0, M)]));
      } else aE.push([cell('Nenhuma: todas as notas cobradas estão escrituradas.')]);
      wsE = X.utils.aoa_to_sheet([[]], { cellDates: true });
      X.utils.sheet_add_aoa(wsE, aE, { origin: 'A1', cellDates: true });
      wsE['!cols'] = [9, 6, 7, 11, 11, 34, 19, 5, 46, 6, 10, 46, 16, 11, 9, 12, 12, 10, 9, 10, 40, 24].map(w => ({ wch: w }));
      wsE['!autofilter'] = { ref: `A1:V${le}` };
    }

    // --- Vendas ST por NF ---
    const porCod = new Map(prods.map(p => [p.cod, p]));
    const hV = ['NF', 'Modelo', 'Data', 'Código', 'Produto', 'EAN/GTIN', 'NCM', 'CEST', 'Situação', 'CSOSN emitido', 'CSOSN correto', 'CFOP emitido', 'CFOP correto', 'Qtd', 'Valor (R$)', 'Desconto (R$)', 'Líquido (R$)'];
    const aV = [hV.map(v => cell(v))];
    const linhas = an.docS.data.linhas.filter(l => { const p = porCod.get(l[0]); return p && L[p.sit].st && p.sit !== 'st_ja' && !jaSTL(l) && (!filtroSit || filtroSit.includes(p.sit)); })
      .sort((a, b) => String(a[3]).localeCompare(String(b[3])) || (+a[1] - +b[1]) || String(a[0]).localeCompare(String(b[0])));
    linhas.forEach((l, i) => {
      const p = porCod.get(l[0]), r = i + 2;
      const dt = l[3] ? { t: 'd', v: new Date(l[3] + 'T12:00:00'), z: 'dd/mm/yyyy' } : cell('');
      aV.push([cell(+l[1]), cell(l[2]), dt, cell(p.cod), cell(p.nome), cell(p.ean), cell(U.fmtNCM(p.ncm)), cell(U.fmtCEST(p.cest)), cell(L[p.sit].nome), cell(l[6]), cell(csosnST(l[6])), cell(l[5]), cell(cfopST(l[5])), cell(l[4], '#,##0.###'), cell(l[7], M), cell(l[8], M), fml(`ROUND(O${r}-P${r},2)`, M)]);
    });
    const lv = linhas.length + 1;
    aV.push([cell('TOTAL'), ...Array(12).fill(cell('')), fml(`SUBTOTAL(9,N2:N${lv})`, '#,##0.###'), fml(`SUBTOTAL(9,O2:O${lv})`, M), fml(`SUBTOTAL(9,P2:P${lv})`, M), fml(`SUBTOTAL(9,Q2:Q${lv})`, M)]);
    const wsV = X.utils.aoa_to_sheet([[]], { cellDates: true });
    X.utils.sheet_add_aoa(wsV, aV, { origin: 'A1', cellDates: true });
    wsV['!cols'] = [9, 7, 11, 15, 46, 16, 11, 11, 32, 10, 10, 9, 9, 8, 12, 12, 12].map(w => ({ wch: w }));
    wsV['!autofilter'] = { ref: `A1:Q${lv}` };

    // --- Resumo ---
    const p = an.param;
    const sit = k => `"${L[k].nome}"`;
    const somaSit = (col, ks) => ks.map(k => `SUMIFS(${CAD}!${col}:${col},${CAD}!A:A,${sit(k)})`).join('+');
    const R = [
      [cell(`Vendas de ${U.refLabel(an.ref)} que deveriam ter saído como ST`)],
      [cell(`${nomeEmp}${c.cnpj ? ' - CNPJ ' + U.fmtCNPJ(c.cnpj) : ''}${c.ie ? ' - IE ' + c.ie : ''} - Simples Nacional${c.porte ? ' (' + c.porte + ')' : ''}${c.municipio ? ' - ' + c.municipio + '/' + (c.uf || '') : ''}`)],
      [cell(`Fontes: ${U.uniq([an.docS.fileName].concat(an.docC ? [an.docC.fileName] : [], an.entradas ? an.entradas.docs.map(d => d.fileName) : [])).join('; ')}; memórias de cálculo do ICMS-ST e da Equalização importadas no Revisor ICMS-ST; Subanexo I do Anexo III do RICMS/MS.`)],
      [],
      [cell('1. Receitas do mês')],
      [cell(an.docC ? 'Receita bruta do mês no Controle do Simples (líquida de devoluções)' : 'Receita do mês (Registro de Saídas)'), cell(''), cell(an.tot.receitaMes, M)],
      [cell('Receita líquida no Registro de Saídas (conferência)'), cell(''), cell(an.tot.receitaSaidas, M)],
      [cell('Vendas ST - ICMS-ST cobrado ou retido na entrada (ou definido como ST)'), cell(''), fml(`${somaSit('M', FORTES)}-(${somaSit('N', FORTES)})`, M)],
      [cell('Vendas ST - conferir a NF de entrada'), cell(''), fml(`SUMIFS(${CAD}!M:M,${CAD}!A:A,${sit('st_conferir')})-SUMIFS(${CAD}!N:N,${CAD}!A:A,${sit('st_conferir')})`, M)],
      [cell('Total que deveria ser segregado como ST no PGDAS-D'), cell(''), fml('C8+C9', M)],
      [cell('Vendas de produtos ST já emitidas como ST (sem ajuste)'), cell(''), fml(`SUM(${CAD}!N2:N${lc})`, M)],
      [cell('Participação das vendas a segregar na receita do mês'), cell(''), fml('IF(C6=0,0,C10/C6)', P)],
      [],
      [cell('2. Alíquota do DAS (confira no extrato do PGDAS-D e altere C16 e C17 se for diferente)')],
      [cell('RBT12 considerada'), cell(''), cell(p.rbt12 || 0, M), cell(p.sug.nota)],
      [cell('Alíquota efetiva do Anexo I'), cell(''), cell(p.aliq, P), cell(`Faixa ${p.calc.faixa}: nominal ${U.fmt(p.calc.nominal * 100, 2)}%, dedução ${U.brl(p.calc.deducao)}${p.manual.aliq !== undefined && p.manual.aliq !== '' ? ' (valor informado manualmente)' : ''}`)],
      [cell('Percentual do ICMS na partilha da faixa'), cell(''), cell(p.pIcms, P)],
      [cell('ICMS embutido no DAS sobre cada R$ 1,00 vendido'), cell(''), fml('C16*C17', P)],
      [],
      [cell('3. ICMS do Simples pago a mais nas vendas ST')],
      [cell('Sobre vendas com ICMS-ST cobrado ou retido na entrada'), cell(''), fml(somaSit('O', FORTES), M)],
      [cell('Sobre vendas a conferir (depende da NF de entrada)'), cell(''), fml(`SUMIFS(${CAD}!O:O,${CAD}!A:A,${sit('st_conferir')})`, M)],
      [cell('Total estimado de ICMS pago a mais no DAS'), cell(''), fml('C21+C22', M)],
      [],
      [cell('4. O que ajustar no ERP')],
      [cell('a) Produtos com situação "ST": CSOSN 500 (ICMS cobrado anteriormente por ST), CEST indicado e CFOP 5405 (6404 interestadual). A receita passa a sair segregada como "com substituição tributária" no PGDAS-D e o ICMS deixa de ser cobrado no DAS (LC 123/2006, art. 18, § 4º-A, I).')],
      [cell('b) "Conferir a NF de entrada": só trate como ST depois de confirmar a retenção/cobrança do ICMS-ST na entrada; confira também se a descrição do CEST corresponde ao produto.')],
      [cell('c) Itens preparados na loja e produtos da Equalização continuam com CSOSN 102.')],
      [cell('d) Confira o "Tipo de produto" no cadastro: mercadoria revendida deve estar como "Mercadoria para revenda".')],
      [cell(an.entradas ? 'e) Entradas: mercadoria com ICMS-ST cobrado ou retido na entrada deve ser escriturada com CFOP 2403 (interestadual) ou 1403 (dentro do estado), e não 2102/1102. Veja as colunas "CFOP de entrada" no Cadastro ERP e a aba "Entradas (SPED)", que também lista as cobranças da SEFAZ sem nota escriturada.' : 'e) Importe o SPED Fiscal (EFD ICMS/IPI) do mês para conferir as notas de entrada e o CFOP escriturado.')]
    ];
    const wsR = X.utils.aoa_to_sheet([[]]);
    X.utils.sheet_add_aoa(wsR, R, { origin: 'A1' });
    wsR['!cols'] = [{ wch: 62 }, { wch: 2 }, { wch: 16 }, { wch: 90 }];

    const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, wsR, 'Resumo');
    X.utils.book_append_sheet(wb, wsCad, 'Cadastro ERP');
    X.utils.book_append_sheet(wb, wsV, 'Vendas ST por NF');
    if (wsE) X.utils.book_append_sheet(wb, wsE, 'Entradas (SPED)');
    X.writeFile(wb, `vendas-que-deveriam-ser-st-${U.slug(c.nomeFantasia || c.razaoSocial || 'empresa')}-${an.ref}.xlsx`);
    return { produtos: prods.length, linhas: linhas.length };
  }

  global.RST_VENDAS = { lerPlanilhaMakro, lerRegSaidas, lerControleSimples, lerEFD, ehEFD, infoDoNome, analisar, exportar, aliquotaAnexoI, rbt12Sugerida, receitasPorMes, SIT, FORTES, AJUSTES, ANEXO_I };
})(window);
