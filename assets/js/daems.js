/* Revisor ICMS-ST — Recolhimentos (DAEMS): o que continua devido nos itens revisados e é recolhido em guia própria:
 *  - DIFAL dos bens de uso e consumo, brinde e degustação;
 *  - Equalização dos insumos e dos itens fora da ST;
 *  - ICMS-ST residual dos itens revisados só em parte (MVA, crédito, cálculo), que a alteração no e-Fazenda pode não gerar.
 * Com memória de cálculo por item e por nota, número do DAEMS emitido e exportação em Excel. */
(function (global) {
  'use strict';
  const U = global.RST_U;

  const TIPOS = {
    DIFAL: { nome: 'ICMS diferencial de alíquotas (DIFAL)', curto: 'DIFAL', base: 'LC nº 87/1996, art. 6º e art. 10; Conv. ICMS 142/2018, cláusulas 12ª e 13ª; LC nº 123/2006, art. 13, § 1º, XIII, "h"' },
    EQ: { nome: 'ICMS Equalização (Simples Nacional)', curto: 'Equalização', base: 'Decreto nº 15.055/2018, arts. 3º a 5º' },
    ST: { nome: 'ICMS-ST residual (itens revisados em parte)', curto: 'ICMS-ST residual', base: 'LC nº 87/1996, arts. 6º e 8º; RICMS/MS, Anexo III' }
  };
  const ORDEM = ['DIFAL', 'EQ', 'ST'];
  /** Regra do achado → imposto que substitui o ICMS-ST (o item sai inteiro da ST). */
  const REGRAS = { ST_USO: 'DIFAL', ST_INSUMO: 'EQ', ST_FORA_TAB: 'EQ' };
  const tipoDevido = f => REGRAS[f.ruleId] || '';
  const ativo = f => f.valorRevisar > 0 && !['descartado', 'indeferido'].includes(f.status);
  const MASK = /^\d{2}\.\d{3}\.\d{3}\.\d{3}-\d{2}$/;
  /** "0117077618149" → "01.170.776.181-49" (13 dígitos). */
  function fmtDaems(s) {
    const d = U.digits(s);
    return d.length === 13 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3.$4-$5') : String(s || '').trim();
  }
  const chave = (companyId, referencia, tipo) => `${companyId}|${referencia}|${tipo}`;

  function base(model, f, it, tipo, S) {
    const ch = (model.chargesById && model.chargesById.get(f.chargeId)) || {};
    const nf = (ch.nfKey && model.nfsByKey.get(ch.nfKey)) || {};
    return {
      tipo, itemId: f.itemId, companyId: f.companyId, referencia: f.referencia, numero: f.numero, cnpjRemetente: f.cnpjRemetente, ufRemetente: f.ufRemetente,
      remetente: nf.remetenteNome || '', emissao: ch.dataEmissao || '', chave: ch.chave || '',
      descricao: f.descricao || it.descricao || '', ncm: f.ncm || it.ncm || '', cest: f.cest || it.cest || '',
      icmsCobrado: U.round2(it.icms || f.icmsCobrado || 0), valorOperacao: U.round2(it.custoFinal || it.base || 0),
      aliqInter: it.aliqInter || 7, aliqIntra: it.aliqIntra || +S.aliqInterna || 17,
      icmsOrigem: null, bc: null, porDentro: false
    };
  }

  /** Item que sai da ST e passa a DIFAL ou Equalização. */
  function memoriaSubst(model, f, S) {
    const it = model.itemsById.get(f.itemId) || {};
    const m = base(model, f, it, tipoDevido(f), S);
    Object.assign(m, { regra: f.regra, revisado: U.round2(f.valorRevisar), devido: U.round2(f.valorDevido || 0) });
    if (m.tipo === 'DIFAL' && S.difalMetodo !== 'simples') {
      m.porDentro = true;
      m.icmsOrigem = it.credito > 0 ? it.credito : U.round2((it.bcProprio || m.valorOperacao) * m.aliqInter / 100);
      m.bc = (m.valorOperacao - m.icmsOrigem) / (1 - m.aliqIntra / 100);
    } else m.bc = m.valorOperacao;
    return m;
  }

  /** Item que continua na ST, revisado só em parte: o residual (cobrado − revisado) é o ICMS-ST correto. */
  function memoriaResidual(model, fs, S) {
    const f0 = fs[0];
    const it = model.itemsById.get(f0.itemId) || {};
    const m = base(model, f0, it, 'ST', S);
    const revisado = U.round2(Math.min(m.icmsCobrado, U.sum(fs, f => f.valorRevisar)));
    const residual = U.round2(m.icmsCobrado - revisado);
    const cred = U.round2(it.credito || 0);
    Object.assign(m, {
      regra: U.uniq(fs.map(f => f.regra)).join('; '), revisado, devido: residual, porDentro: true,
      icmsOrigem: cred, bcST: U.round2(it.bcST || 0),
      // base do ICMS-ST que resulta no valor correto: (residual + crédito) ÷ alíquota interna
      bc: m.aliqIntra ? (residual + cred) / (m.aliqIntra / 100) : 0
    });
    return m;
  }

  /** Grupos (empresa × referência × modalidade) com os itens que continuam devidos. */
  function apurar(model, findings, S, daems) {
    const ativos = findings.filter(f => ativo(f) && f.escopo === 'item' && f.itemId);
    const linhas = [];
    ativos.filter(f => REGRAS[f.ruleId] && (f.valorDevido || 0) > 0).forEach(f => linhas.push(memoriaSubst(model, f, S)));
    // ICMS-ST residual: itens de ST revisados em parte, sem achado que retire o item da ST
    const porItem = U.groupBy(ativos.filter(f => f.tipo === 'ST'), f => f.itemId);
    Object.values(porItem).forEach(fs => {
      if (fs.some(f => REGRAS[f.ruleId])) return;
      const m = memoriaResidual(model, fs, S);
      if (m.devido > 0.005) linhas.push(m);
    });
    const grupos = {};
    linhas.forEach(m => {
      const k = chave(m.companyId, m.referencia, m.tipo);
      (grupos[k] || (grupos[k] = { key: k, companyId: m.companyId, referencia: m.referencia, tipo: m.tipo, linhas: [] })).linhas.push(m);
    });
    return Object.values(grupos).map(g => {
      g.linhas.sort((a, b) => (+a.numero - +b.numero) || b.devido - a.devido);
      g.total = U.round2(U.sum(g.linhas, l => l.devido));
      g.daems = Object.assign({ numero: '', valor: '', vencimento: '', pagoEm: '', obs: '' }, (daems || {})[g.key] || {});
      g.ok = MASK.test(g.daems.numero);
      return g;
    }).sort((a, b) => String(b.referencia).localeCompare(String(a.referencia)) || ORDEM.indexOf(a.tipo) - ORDEM.indexOf(b.tipo));
  }

  /** Número do DAEMS informado para a modalidade (ou ''). */
  function numeroPor(daems, companyId, referencia, tipo) {
    const d = (daems || {})[chave(companyId, referencia, tipo)];
    return d && MASK.test(d.numero || '') ? d.numero : '';
  }
  /** Número do DAEMS do imposto que substitui o ST no achado (DIFAL/Equalização). */
  function numeroDo(daems, f) {
    return REGRAS[f.ruleId] ? numeroPor(daems, f.companyId, f.referencia, tipoDevido(f)) : '';
  }

  /* ---------------- Excel: memória por nota e por item ---------------- */
  function exportar(model, grupos, nomeArquivo) {
    const X = global.XLSX;
    if (!X) throw new Error('Biblioteca de planilhas não carregada.');
    const nomeEmp = id => { const c = model.companies.get(id) || {}; return c.razaoSocial || c.nomeFantasia || 'Empresa'; };
    const M = '#,##0.00';
    const num = (v, z = M) => (v === null || v === undefined || v === '' ? { t: 's', v: '' } : { t: 'n', v: +v, z });
    const s = v => ({ t: 's', v: String(v ?? '') });
    const pct = v => ({ t: 'n', v: v / 100, z: '0.00%' });
    const dt = iso => (iso && /^\d{4}-\d{2}-\d{2}/.test(iso) ? { t: 'd', v: new Date(iso.slice(0, 10) + 'T12:00:00'), z: 'dd/mm/yyyy' } : s(''));
    const fx = (f, z = M) => ({ t: 'n', f, z });
    const L = i => { let n = i + 1, r = ''; while (n > 0) { const m = (n - 1) % 26; r = String.fromCharCode(65 + m) + r; n = Math.floor((n - m - 1) / 26); } return r; };
    const modN = t => TIPOS[t].curto;
    const H0 = 6, INI = H0 + 1; // cabeçalho das tabelas na linha 6; dados a partir da 7
    const empresas = U.uniq(grupos.map(g => g.companyId)), refs = U.uniq(grupos.map(g => g.referencia));
    const c1 = empresas.length === 1 ? (model.companies.get(empresas[0]) || {}) : null;
    const cab = titulo => [
      [s(titulo)],
      [s(c1 ? `Empresa: ${c1.razaoSocial || c1.nomeFantasia || ''}` : 'Empresas: várias (ver coluna Empresa)'), s(c1 && c1.cnpj ? `CNPJ: ${U.fmtCNPJ(c1.cnpj)}` : ''), s(c1 && c1.ie ? `IE: ${c1.ie}` : '')],
      [s(`Referência: ${refs.map(U.refLabel).join(', ')}`), s(`Gerado em: ${U.brDate(U.today())}`)],
      [s('Fonte: memórias de cálculo da SEFAZ/MS (ICMS-ST cobrado) e NF-e de entrada.')],
      []
    ];
    /** Quadro de totais por modalidade abaixo da tabela (SUMIFS na própria aba). */
    const quadro = (aoa, colMod, cols, last) => {
      aoa.push([]);
      aoa.push([s('Total por modalidade'), s('Nº do DAEMS'), ...cols.map(c => s(c.t))]);
      grupos.filter((g, i, a) => a.findIndex(x => x.tipo === g.tipo) === i).forEach(g0 => {
        const nums = U.uniq(grupos.filter(g => g.tipo === g0.tipo).map(g => g.daems.numero).filter(Boolean)).join(', ');
        aoa.push([s(TIPOS[g0.tipo].nome), s(nums || 'a informar'), ...cols.map(c => fx(`SUMIFS(${c.l}$${INI}:${c.l}$${last},$${colMod}$${INI}:$${colMod}$${last},"${modN(g0.tipo)}")`))]);
      });
    };

    // ---------- Por item ----------
    const CI = ['Empresa', 'Referência', 'Modalidade', 'CNPJ remetente', 'Remetente', 'UF', 'NF-e', 'Emissão', 'Chave de acesso', 'Item', 'NCM', 'Motivo da revisão', 'ICMS-ST excluído', 'Produto+Frete+IPI', 'Alíquota Inter.', 'Crédito ICMS', 'Alíquota Destino', 'B.C ICMS', 'Débito ICMS', 'Total a Recolher', 'Nº do DAEMS'];
    const ci = k => L(CI.indexOf(k));
    const aI = cab('Memória de cálculo por item — ICMS DIFAL, Equalização e ICMS-ST residual').concat([CI.map(s)]);
    grupos.forEach(g => g.linhas.forEach(l => {
      const r = aI.length + 1;
      const v = ci('Produto+Frete+IPI'), ai = ci('Alíquota Inter.'), cr = ci('Crédito ICMS'), ad = ci('Alíquota Destino'), bc = ci('B.C ICMS'), db = ci('Débito ICMS');
      const credito = l.icmsOrigem !== null ? num(l.icmsOrigem) : fx(`${v}${r}*${ai}${r}`);
      const base = l.tipo === 'ST' ? num(l.bc) : l.porDentro ? fx(`(${v}${r}-${cr}${r})/(1-${ad}${r})`) : fx(`${v}${r}`);
      aI.push([s(nomeEmp(g.companyId)), s(U.refLabel(g.referencia)), s(modN(l.tipo)), s(U.fmtCNPJ(l.cnpjRemetente || '')), s(l.remetente), s(l.ufRemetente || ''), num(+l.numero, '0'), dt(l.emissao), s(l.chave), s(l.descricao), s(U.fmtNCM(l.ncm)), s(l.regra),
        num(l.icmsCobrado), num(l.valorOperacao), pct(l.aliqInter), credito, pct(l.aliqIntra), base, fx(`${bc}${r}*${ad}${r}`), fx(`ROUND(${db}${r}-${cr}${r},2)`), s(g.daems.numero)]);
    }));
    const lastI = aI.length;
    const somaI = ['ICMS-ST excluído', 'Produto+Frete+IPI', 'Crédito ICMS', 'B.C ICMS', 'Débito ICMS', 'Total a Recolher'];
    const totI = CI.map(() => s('')); totI[0] = s('TOTAL');
    somaI.forEach(k => { totI[CI.indexOf(k)] = fx(`SUBTOTAL(9,${ci(k)}${INI}:${ci(k)}${lastI})`); });
    aI.push(totI);
    quadro(aI, ci('Modalidade'), [{ t: 'ICMS-ST excluído', l: ci('ICMS-ST excluído') }, { t: 'Total a Recolher', l: ci('Total a Recolher') }], lastI);
    const wsI = X.utils.aoa_to_sheet([[]]); X.utils.sheet_add_aoa(wsI, aI, { origin: 'A1', cellDates: true });
    wsI['!cols'] = [30, 20, 15, 19, 30, 5, 9, 11, 46, 44, 11, 34, 13, 13, 15, 10, 12, 10, 14, 13, 14, 20].map(w => ({ wch: w }));
    wsI['!autofilter'] = { ref: `A${H0}:${L(CI.length - 1)}${lastI}` };

    // ---------- Por nota ----------
    const CN = ['Empresa', 'Referência', 'Modalidade', 'CNPJ remetente', 'Remetente', 'UF', 'NF-e', 'Emissão', 'Chave de acesso', 'Itens', 'ICMS-ST excluído', 'Produto+Frete+IPI', 'Crédito ICMS', 'B.C ICMS', 'Débito ICMS', 'Total a Recolher', 'Nº do DAEMS'];
    const cn = k => L(CN.indexOf(k));
    const aN = cab('Memória de cálculo por nota fiscal — ICMS DIFAL, Equalização e ICMS-ST residual').concat([CN.map(s)]);
    const IT = `'Por item'!`;
    const crit = r => `${IT}$A:$A,$A${r},${IT}$B:$B,$B${r},${IT}$C:$C,$C${r},${IT}$D:$D,$D${r},${IT}$G:$G,$G${r}`;
    const sumI = (k, r) => fx(`SUMIFS(${IT}$${ci(k)}:$${ci(k)},${crit(r)})`);
    grupos.forEach(g => {
      const notas = []; g.linhas.forEach(l => { if (!notas.some(n => n.numero === l.numero && n.cnpjRemetente === l.cnpjRemetente)) notas.push(l); });
      notas.forEach(n => {
        const r = aN.length + 1;
        aN.push([s(nomeEmp(g.companyId)), s(U.refLabel(g.referencia)), s(modN(g.tipo)), s(U.fmtCNPJ(n.cnpjRemetente || '')), s(n.remetente), s(n.ufRemetente || ''), num(+n.numero, '0'), dt(n.emissao), s(n.chave),
          fx(`COUNTIFS(${crit(r)})`, '0'), sumI('ICMS-ST excluído', r), sumI('Produto+Frete+IPI', r), sumI('Crédito ICMS', r), sumI('B.C ICMS', r), sumI('Débito ICMS', r), sumI('Total a Recolher', r), s(g.daems.numero)]);
      });
    });
    const lastN = aN.length;
    const totN = CN.map(() => s('')); totN[0] = s('TOTAL');
    ['Itens', 'ICMS-ST excluído', 'Produto+Frete+IPI', 'Crédito ICMS', 'B.C ICMS', 'Débito ICMS', 'Total a Recolher'].forEach(k => { totN[CN.indexOf(k)] = fx(`SUBTOTAL(9,${cn(k)}${INI}:${cn(k)}${lastN})`, k === 'Itens' ? '0' : M); });
    aN.push(totN);
    quadro(aN, cn('Modalidade'), [{ t: 'ICMS-ST excluído', l: cn('ICMS-ST excluído') }, { t: 'Total a Recolher', l: cn('Total a Recolher') }], lastN);
    const wsN = X.utils.aoa_to_sheet([[]]); X.utils.sheet_add_aoa(wsN, aN, { origin: 'A1', cellDates: true });
    wsN['!cols'] = [30, 20, 15, 19, 30, 5, 9, 11, 46, 6, 14, 14, 15, 12, 14, 13, 14, 20].map(w => ({ wch: w }));
    wsN['!autofilter'] = { ref: `A${H0}:${L(CN.length - 1)}${lastN}` };

    const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, wsN, 'Por nota');
    X.utils.book_append_sheet(wb, wsI, 'Por item');
    X.writeFile(wb, nomeArquivo || `apuracao-difal-equalizacao-st-${U.today()}.xlsx`);
    return { grupos: grupos.length, itens: lastI - H0 };
  }

  /* ---------------- Análise de economia (uso interno — não vai para a SEFAZ) ----------------
   * Por item do pedido: ICMS cobrado (C), valor a revisar (R) e imposto que continua devido (D = C − R),
   * que é o DIFAL, a Equalização ou o próprio tributo residual. Economia = C − D. */
  function analisarEconomia(model, findings, S, daems) {
    const R = global.RST_REPORTS;
    const pedidos = R.pedidoEFazenda(model, findings, daems);
    const devidos = new Map();
    apurar(model, findings, S, daems).forEach(g => g.linhas.forEach(l => devidos.set(l.itemId, { tipo: l.tipo, devido: l.devido })));
    const linhas = [];
    pedidos.forEach(g => {
      const comum = { empresa: g.empresa, referencia: g.referencia, tributo: g.tipo };
      g.desvincular.forEach(n => linhas.push(Object.assign({}, comum, { numero: n.numero, cnpj: n.cnpj, razao: n.razao, acao: 'Desvincular a NF', item: '(nota inteira)', ncm: '', motivo: n.motivo, regra: n.descricao, cobrado: n.icmsNF, excluir: n.revisar, devido: 0, modalidade: 'Exclusão total' })));
      g.alterar.forEach(n => n.itens.forEach(i => {
        const d = devidos.get(i.itemId);
        // o que continua devido: DIFAL/Equalização/ICMS-ST correto em DAEMS próprio, ou o que fica na própria cobrança
        const devido = d ? d.devido : U.round2(Math.max(0, i.icms - (i.liquido ?? i.revisar)));
        const modalidade = d ? TIPOS[d.tipo].curto : devido <= 0.005 ? 'Exclusão total' : g.tipo === 'ST' ? TIPOS.ST.curto : 'Equalização residual (mesmo tributo)';
        linhas.push(Object.assign({}, comum, { numero: n.numero, cnpj: n.cnpj, razao: n.razao, acao: 'Alterar item', item: i.descricaoItem, ncm: i.ncm, motivo: i.motivo, regra: i.descricao, cobrado: i.icms, excluir: i.revisar, devido, modalidade }));
      }));
    });
    linhas.forEach(l => { l.economia = U.round2(l.cobrado - l.devido); });
    return { linhas, cobrado: U.round2(U.sum(linhas, l => l.cobrado)), devido: U.round2(U.sum(linhas, l => l.devido)), economia: U.round2(U.sum(linhas, l => l.economia)), notas: U.uniq(linhas.map(l => l.tributo + l.numero)).length };
  }

  function exportarAnalise(model, an, nomeArquivo, limite = 10) {
    const X = global.XLSX;
    if (!X) throw new Error('Biblioteca de planilhas não carregada.');
    const M = '#,##0.00', P = '0.0%';
    const s = v => ({ t: 's', v: String(v ?? '') });
    const n = (v, z = M) => ({ t: 'n', v: +v || 0, z });
    const fx = (f, z = M) => ({ t: 'n', f, z });
    const H0 = 4, INI = H0 + 1;
    const cab = t => [[s(t)], [s('Uso interno — não integra a memória de cálculo apresentada à SEFAZ. Compara o ICMS cobrado com o imposto que continua devido após a revisão (DIFAL, Equalização ou ICMS-ST residual).')], []];
    const trib = t => t === 'ST' ? 'ICMS-ST (333)' : 'Equalização (349)';

    // Por item
    const CI = ['Empresa', 'Referência', 'Tributo cobrado', 'NF-e', 'Remetente', 'Ação no e-Fazenda', 'Item', 'NCM', 'Motivo da revisão', 'Imposto após a revisão', 'ICMS cobrado', 'Valor a excluir da cobrança', 'Imposto devido após a revisão', 'Economia', '% de economia', 'Avaliação'];
    const aI = cab('Análise de economia por item').concat([CI.map(s)]);
    an.linhas.slice().sort((a, b) => b.economia - a.economia).forEach(l => {
      const r = aI.length + 1;
      aI.push([s(l.empresa), s(U.refLabel(l.referencia)), s(trib(l.tributo)), n(+l.numero, '0'), s(l.razao || U.fmtCNPJ(l.cnpj)), s(l.acao), s(l.item), s(U.fmtNCM(l.ncm)), s(l.regra), s(l.modalidade),
        n(l.cobrado), n(l.excluir), n(l.devido), fx(`ROUND(K${r}-M${r},2)`), fx(`IF(K${r}=0,0,N${r}/K${r})`, P),
        { t: 's', f: `IF(N${r}<${limite},"Economia pequena (< R$ ${limite},00)","Compensa")` }]);
    });
    const lastI = aI.length;
    aI.push([s('TOTAL'), ...Array(9).fill(s('')), fx(`SUBTOTAL(9,K${INI}:K${lastI})`), fx(`SUBTOTAL(9,L${INI}:L${lastI})`), fx(`SUBTOTAL(9,M${INI}:M${lastI})`), fx(`SUBTOTAL(9,N${INI}:N${lastI})`), fx(`IF(K${lastI + 1}=0,0,N${lastI + 1}/K${lastI + 1})`, P), s('')]);
    const wsI = X.utils.aoa_to_sheet([[]]); X.utils.sheet_add_aoa(wsI, aI, { origin: 'A1' });
    wsI['!cols'] = [28, 10, 16, 9, 30, 17, 44, 11, 40, 24, 13, 13, 15, 13, 10, 28].map(w => ({ wch: w }));
    wsI['!autofilter'] = { ref: `A${H0}:P${lastI}` };

    // Por nota (somas da aba Por item)
    const IT = `'Por item'!`;
    const CN = ['Empresa', 'Referência', 'Tributo cobrado', 'NF-e', 'Remetente', 'Itens no pedido', 'ICMS cobrado', 'Valor a excluir da cobrança', 'Imposto devido após a revisão', 'Economia', '% de economia'];
    const aN = cab('Análise de economia por nota fiscal').concat([CN.map(s)]);
    const vistos = new Set();
    an.linhas.forEach(l => {
      const k = `${l.empresa}|${l.referencia}|${l.tributo}|${l.numero}`; if (vistos.has(k)) return; vistos.add(k);
      const r = aN.length + 1;
      const crit = `${IT}$A:$A,$A${r},${IT}$B:$B,$B${r},${IT}$C:$C,$C${r},${IT}$D:$D,$D${r}`;
      aN.push([s(l.empresa), s(U.refLabel(l.referencia)), s(trib(l.tributo)), n(+l.numero, '0'), s(l.razao || U.fmtCNPJ(l.cnpj)), fx(`COUNTIFS(${crit})`, '0'),
        fx(`SUMIFS(${IT}$K:$K,${crit})`), fx(`SUMIFS(${IT}$L:$L,${crit})`), fx(`SUMIFS(${IT}$M:$M,${crit})`), fx(`SUMIFS(${IT}$N:$N,${crit})`), fx(`IF(G${r}=0,0,J${r}/G${r})`, P)]);
    });
    const lastN = aN.length;
    aN.push([s('TOTAL'), s(''), s(''), s(''), s(''), fx(`SUBTOTAL(9,F${INI}:F${lastN})`, '0'), fx(`SUBTOTAL(9,G${INI}:G${lastN})`), fx(`SUBTOTAL(9,H${INI}:H${lastN})`), fx(`SUBTOTAL(9,I${INI}:I${lastN})`), fx(`SUBTOTAL(9,J${INI}:J${lastN})`), fx(`IF(G${lastN + 1}=0,0,J${lastN + 1}/G${lastN + 1})`, P)]);
    const wsN = X.utils.aoa_to_sheet([[]]); X.utils.sheet_add_aoa(wsN, aN, { origin: 'A1' });
    wsN['!cols'] = [28, 10, 16, 9, 30, 9, 13, 13, 15, 13, 10].map(w => ({ wch: w }));
    wsN['!autofilter'] = { ref: `A${H0}:K${lastN}` };

    // Resumo por imposto após a revisão
    const mods = U.uniq(an.linhas.map(l => l.modalidade));
    const aR = cab('Análise de economia — resumo').concat([['Imposto após a revisão', 'Itens', 'ICMS cobrado', 'Valor a excluir da cobrança', 'Imposto devido após a revisão', 'Economia', '% de economia'].map(s)]);
    mods.forEach(m => {
      const r = aR.length + 1, c = `${IT}$J:$J,$A${r}`;
      aR.push([s(m), fx(`COUNTIFS(${c})`, '0'), fx(`SUMIFS(${IT}$K:$K,${c})`), fx(`SUMIFS(${IT}$L:$L,${c})`), fx(`SUMIFS(${IT}$M:$M,${c})`), fx(`SUMIFS(${IT}$N:$N,${c})`), fx(`IF(C${r}=0,0,F${r}/C${r})`, P)]);
    });
    const lastR = aR.length;
    aR.push([s('TOTAL'), fx(`SUM(B${INI}:B${lastR})`, '0'), fx(`SUM(C${INI}:C${lastR})`), fx(`SUM(D${INI}:D${lastR})`), fx(`SUM(E${INI}:E${lastR})`), fx(`SUM(F${INI}:F${lastR})`), fx(`IF(C${lastR + 1}=0,0,F${lastR + 1}/C${lastR + 1})`, P)]);
    aR.push([]);
    aR.push([s('Notas fiscais no pedido'), fx(`COUNTA('Por nota'!D${INI}:D${lastN})`, '0')]);
    aR.push([s('Economia média por nota'), s(''), s(''), s(''), s(''), fx(`IF(B${lastR + 3}=0,0,F${lastR + 1}/B${lastR + 3})`)]);
    aR.push([s(`Itens com economia abaixo de R$ ${limite},00`), fx(`COUNTIFS(${IT}$N$${INI}:$N$${lastI},"<${limite}")`, '0'), s(''), s(''), s(''), fx(`SUMIFS(${IT}$N$${INI}:$N$${lastI},${IT}$N$${INI}:$N$${lastI},"<${limite}")`)]);
    const wsR = X.utils.aoa_to_sheet([[]]); X.utils.sheet_add_aoa(wsR, aR, { origin: 'A1' });
    wsR['!cols'] = [40, 9, 14, 14, 16, 14, 11].map(w => ({ wch: w }));

    const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, wsR, 'Resumo');
    X.utils.book_append_sheet(wb, wsN, 'Por nota');
    X.utils.book_append_sheet(wb, wsI, 'Por item');
    X.writeFile(wb, nomeArquivo || `analise-economia-${U.today()}.xlsx`);
    return { itens: an.linhas.length, economia: an.economia };
  }

  global.RST_DAEMS = { TIPOS, ORDEM, REGRAS, tipoDevido, fmtDaems, MASK, chave, apurar, numeroDo, numeroPor, exportar, analisarEconomia, exportarAnalise };
})(window);
