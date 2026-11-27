/* Revisor ICMS-ST — Recolhimentos (DAEMS): o que continua devido nos itens revisados
 * (DIFAL dos bens de uso e consumo/brinde e Equalização dos insumos e dos itens fora da ST),
 * com memória de cálculo, número do DAEMS emitido e exportação em Excel. */
(function (global) {
  'use strict';
  const U = global.RST_U;

  const TIPOS = {
    DIFAL: { nome: 'ICMS diferencial de alíquotas (DIFAL)', curto: 'DIFAL', base: 'LC nº 87/1996, art. 6º e art. 10; Conv. ICMS 142/2018, cláusulas 12ª e 13ª; LC nº 123/2006, art. 13, § 1º, XIII, "h"' },
    EQ: { nome: 'ICMS Equalização (Simples Nacional)', curto: 'Equalização', base: 'Decreto nº 15.055/2018, arts. 3º a 5º' }
  };
  /** Regra do achado → imposto que continua devido e é recolhido à parte (os demais "devidos" são o próprio tributo recalculado). */
  const REGRAS = { ST_USO: 'DIFAL', ST_INSUMO: 'EQ', ST_FORA_TAB: 'EQ' };
  const tipoDevido = f => REGRAS[f.ruleId] || '';
  const MASK = /^\d{2}\.\d{3}\.\d{3}\.\d{3}-\d{2}$/;
  /** "0117077618149" → "01.170.776.181-49" (13 dígitos). */
  function fmtDaems(s) {
    const d = U.digits(s);
    return d.length === 13 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3.$4-$5') : String(s || '').trim();
  }
  const chave = (companyId, referencia, tipo) => `${companyId}|${referencia}|${tipo}`;

  /** Memória de cálculo do valor devido de um achado. */
  function memoria(model, f, S) {
    const it = model.itemsById.get(f.itemId) || {};
    const tipo = tipoDevido(f);
    const v = it.custoFinal || it.base || 0;
    const aInter = it.aliqInter || 7;
    const aIntra = it.aliqIntra || +S.aliqInterna || 17;
    const ch = (model.chargesById && model.chargesById.get(f.chargeId)) || {};
    const nf = (ch.nfKey && model.nfsByKey.get(ch.nfKey)) || {};
    const m = {
      tipo, findingId: f.id, companyId: f.companyId, referencia: f.referencia, numero: f.numero, cnpjRemetente: f.cnpjRemetente, ufRemetente: f.ufRemetente,
      remetente: nf.remetenteNome || '', emissao: ch.dataEmissao || f.dataEmissao || '', chave: ch.chave || f.chave || '', origemCredito: '',
      descricao: f.descricao || it.descricao || '', ncm: f.ncm || it.ncm || '', cest: f.cest || it.cest || '', regra: f.regra,
      icmsCobrado: f.icmsCobrado || it.icms || 0, revisar: f.valorRevisar, valorOperacao: U.round2(v), aliqInter: aInter, aliqIntra: aIntra,
      metodo: '', icmsOrigem: null, bc: null, icmsDestino: null, devido: U.round2(f.valorDevido || 0)
    };
    if (tipo === 'DIFAL' && S.difalMetodo !== 'simples') {
      const icmsOrig = it.credito > 0 ? it.credito : U.round2((it.bcProprio || v) * aInter / 100);
      const bc = (v - icmsOrig) / (1 - aIntra / 100);
      m.origemCredito = it.credito > 0 ? 'Crédito admitido na memória da SEFAZ' : (it.bcProprio ? 'BC do ICMS próprio × alíq. interestadual' : 'Valor × alíq. interestadual');
      Object.assign(m, { metodo: 'Base "por dentro": BC = (valor − ICMS de origem) ÷ (1 − alíq. interna); devido = BC × alíq. interna − ICMS de origem', icmsOrigem: U.round2(icmsOrig), bc: U.round2(bc), icmsDestino: U.round2(bc * aIntra / 100) });
    } else {
      m.origemCredito = 'Valor × alíq. interestadual';
      Object.assign(m, { metodo: tipo === 'DIFAL' ? 'Diferença simples: valor × (alíq. interna − alíq. interestadual)' : 'Valor da operação × (alíq. interna − alíq. interestadual), sem MVA', bc: U.round2(v) });
    }
    return m;
  }

  /** Grupos (empresa × referência × DIFAL/EQ) com os itens que continuam devidos. */
  function apurar(model, findings, S, daems) {
    const fs = findings.filter(f => REGRAS[f.ruleId] && (f.valorDevido || 0) > 0 && f.valorRevisar > 0 && !['descartado', 'indeferido'].includes(f.status) && f.escopo === 'item');
    const grupos = {};
    fs.forEach(f => {
      const m = memoria(model, f, S);
      const k = chave(f.companyId, f.referencia, m.tipo);
      const g = grupos[k] || (grupos[k] = { key: k, companyId: f.companyId, referencia: f.referencia, tipo: m.tipo, linhas: [], total: 0 });
      g.linhas.push(m);
    });
    return Object.values(grupos).map(g => {
      g.linhas.sort((a, b) => (+a.numero - +b.numero) || b.devido - a.devido);
      g.total = U.round2(U.sum(g.linhas, l => l.devido));
      g.daems = Object.assign({ numero: '', valor: '', vencimento: '', pagoEm: '', obs: '' }, (daems || {})[g.key] || {});
      g.ok = MASK.test(g.daems.numero);
      return g;
    }).sort((a, b) => String(b.referencia).localeCompare(String(a.referencia)) || a.tipo.localeCompare(b.tipo));
  }

  /** Número do DAEMS informado para o imposto devido de um achado (ou ''). */
  function numeroDo(daems, f) {
    if (!REGRAS[f.ruleId]) return '';
    const d = (daems || {})[chave(f.companyId, f.referencia, tipoDevido(f))];
    return d && MASK.test(d.numero || '') ? d.numero : '';
  }

  /* ---------------- Excel ---------------- */
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
    const mod = t => t === 'DIFAL' ? 'DIFAL' : 'Equalização';
    const H0 = 6; // linha do cabeçalho das tabelas; dados a partir da 7
    const empresas = U.uniq(grupos.map(g => g.companyId)), refs = U.uniq(grupos.map(g => g.referencia));
    const c1 = empresas.length === 1 ? (model.companies.get(empresas[0]) || {}) : null;
    const cab = titulo => [
      [s(titulo)],
      [s(c1 ? `Empresa: ${c1.razaoSocial || c1.nomeFantasia || ''}` : 'Empresas: várias (ver coluna Empresa)'), s(c1 && c1.cnpj ? `CNPJ: ${U.fmtCNPJ(c1.cnpj)}` : ''), s(c1 && c1.ie ? `IE: ${c1.ie}` : '')],
      [s(`Referência: ${refs.map(U.refLabel).join(', ')}`), s(`Gerado em: ${U.brDate(U.today())}`)],
      [s('Fonte: memórias de cálculo da SEFAZ/MS (ICMS-ST cobrado) e NF-e de entrada; itens revisados por não se destinarem à revenda (uso e consumo, brinde, degustação ou insumo) ou por não estarem sujeitos à ST.')],
      []
    ];

    // ---------- Por item ----------
    const CI = ['Empresa', 'Referência', 'Modalidade', 'CNPJ remetente', 'Remetente', 'UF', 'NF-e', 'Emissão', 'Chave de acesso', 'Item', 'NCM', 'Motivo da revisão', 'ICMS-ST cobrado', 'Produto+Frete+IPI', 'Alíquota Inter.', 'Crédito ICMS', 'Origem do crédito', 'Alíquota Destino', 'B.C ICMS', 'Débito ICMS', 'Total a Recolher', 'Nº do DAEMS'];
    const ci = k => L(CI.indexOf(k));
    const aI = cab('Memória de cálculo por item — ICMS DIFAL e Equalização').concat([CI.map(s)]);
    grupos.forEach(g => g.linhas.forEach(l => {
      const r = aI.length + 1;
      const v = ci('Produto+Frete+IPI'), ai = ci('Alíquota Inter.'), cr = ci('Crédito ICMS'), ad = ci('Alíquota Destino'), bc = ci('B.C ICMS'), db = ci('Débito ICMS');
      const porDentro = l.tipo === 'DIFAL' && l.icmsOrigem !== null;
      aI.push([s(nomeEmp(g.companyId)), s(U.refLabel(g.referencia)), s(mod(l.tipo)), s(U.fmtCNPJ(l.cnpjRemetente || '')), s(l.remetente), s(l.ufRemetente || ''), num(+l.numero, '0'), dt(l.emissao), s(l.chave), s(l.descricao), s(U.fmtNCM(l.ncm)), s(l.regra),
        num(l.icmsCobrado), num(l.valorOperacao), pct(l.aliqInter), porDentro ? num(l.icmsOrigem) : fx(`${v}${r}*${ai}${r}`), s(l.origemCredito), pct(l.aliqIntra),
        porDentro ? fx(`(${v}${r}-${cr}${r})/(1-${ad}${r})`) : fx(`${v}${r}`), fx(`${bc}${r}*${ad}${r}`), fx(`ROUND(${db}${r}-${cr}${r},2)`), s(g.daems.numero)]);
    }));
    const lastI = aI.length, iniI = H0 + 1;
    const totI = CI.map(() => s('')); totI[0] = s('TOTAL');
    ['ICMS-ST cobrado', 'Produto+Frete+IPI', 'Crédito ICMS', 'B.C ICMS', 'Débito ICMS', 'Total a Recolher'].forEach(k => { totI[CI.indexOf(k)] = fx(`SUBTOTAL(9,${ci(k)}${iniI}:${ci(k)}${lastI})`); });
    aI.push(totI);
    const wsI = X.utils.aoa_to_sheet([[]]); X.utils.sheet_add_aoa(wsI, aI, { origin: 'A1', cellDates: true });
    wsI['!cols'] = [26, 10, 11, 19, 30, 5, 9, 11, 46, 44, 11, 34, 13, 15, 10, 12, 34, 10, 14, 13, 14, 20].map(w => ({ wch: w }));
    wsI['!autofilter'] = { ref: `A${H0}:${L(CI.length - 1)}${lastI}` };

    // ---------- Por nota ----------
    const CN = ['Empresa', 'Referência', 'Modalidade', 'CNPJ remetente', 'Remetente', 'UF', 'NF-e', 'Emissão', 'Chave de acesso', 'Itens', 'ICMS-ST cobrado nos itens', 'Produto+Frete+IPI', 'Crédito ICMS', 'B.C ICMS', 'Débito ICMS', 'Total a Recolher', 'Nº do DAEMS'];
    const cn = k => L(CN.indexOf(k));
    const aN = cab('Memória de cálculo por nota fiscal — ICMS DIFAL e Equalização').concat([CN.map(s)]);
    const IT = `'Por item'!`;
    const crit = r => `${IT}$A:$A,$A${r},${IT}$B:$B,$B${r},${IT}$C:$C,$C${r},${IT}$D:$D,$D${r},${IT}$G:$G,$G${r}`;
    const sumI = (k, r) => fx(`SUMIFS(${IT}$${ci(k)}:$${ci(k)},${crit(r)})`);
    grupos.forEach(g => {
      const notas = []; g.linhas.forEach(l => { if (!notas.some(n => n.numero === l.numero && n.cnpjRemetente === l.cnpjRemetente)) notas.push(l); });
      notas.forEach(n => {
        const r = aN.length + 1;
        aN.push([s(nomeEmp(g.companyId)), s(U.refLabel(g.referencia)), s(mod(g.tipo)), s(U.fmtCNPJ(n.cnpjRemetente || '')), s(n.remetente), s(n.ufRemetente || ''), num(+n.numero, '0'), dt(n.emissao), s(n.chave),
          fx(`COUNTIFS(${crit(r)})`, '0'), sumI('ICMS-ST cobrado', r), sumI('Produto+Frete+IPI', r), sumI('Crédito ICMS', r), sumI('B.C ICMS', r), sumI('Débito ICMS', r), sumI('Total a Recolher', r), s(g.daems.numero)]);
      });
    });
    const lastN = aN.length;
    const totN = CN.map(() => s('')); totN[0] = s('TOTAL');
    ['Itens', 'ICMS-ST cobrado nos itens', 'Produto+Frete+IPI', 'Crédito ICMS', 'B.C ICMS', 'Débito ICMS', 'Total a Recolher'].forEach(k => { totN[CN.indexOf(k)] = fx(`SUBTOTAL(9,${cn(k)}${iniI}:${cn(k)}${lastN})`, k === 'Itens' ? '0' : M); });
    aN.push(totN);
    const wsN = X.utils.aoa_to_sheet([[]]); X.utils.sheet_add_aoa(wsN, aN, { origin: 'A1', cellDates: true });
    wsN['!cols'] = [26, 10, 11, 19, 30, 5, 9, 11, 46, 6, 14, 15, 12, 14, 13, 14, 20].map(w => ({ wch: w }));
    wsN['!autofilter'] = { ref: `A${H0}:${L(CN.length - 1)}${lastN}` };

    // ---------- Apuração (por modalidade) ----------
    const CA = ['Empresa', 'Referência', 'Modalidade', 'Notas', 'Itens', 'Produto+Frete+IPI', 'Crédito ICMS', 'B.C ICMS', 'Débito ICMS', 'Total a Recolher', 'Nº do DAEMS', 'Valor do DAEMS', 'Vencimento', 'Pago em', 'Diferença (DAEMS − apurado)', 'Fundamento legal', 'Observação'];
    const ca = k => L(CA.indexOf(k));
    const aA = cab('Apuração do ICMS DIFAL e Equalização — itens retirados da cobrança do ICMS-ST').concat([CA.map(s)]);
    const NT = `'Por nota'!`;
    const critA = r => `${IT}$A:$A,$A${r},${IT}$B:$B,$B${r},${IT}$C:$C,$C${r}`;
    grupos.forEach(g => {
      const r = aA.length + 1;
      const sA = k => fx(`SUMIFS(${IT}$${ci(k)}:$${ci(k)},${critA(r)})`);
      aA.push([s(nomeEmp(g.companyId)), s(U.refLabel(g.referencia)), s(mod(g.tipo)), fx(`COUNTIFS(${NT}$A:$A,$A${r},${NT}$B:$B,$B${r},${NT}$C:$C,$C${r})`, '0'), fx(`COUNTIFS(${critA(r)})`, '0'),
        sA('Produto+Frete+IPI'), sA('Crédito ICMS'), sA('B.C ICMS'), sA('Débito ICMS'), sA('Total a Recolher'),
        s(g.daems.numero || 'a informar'), num(g.daems.valor), dt(g.daems.vencimento), dt(g.daems.pagoEm),
        g.daems.valor === '' ? s('') : fx(`ROUND(${ca('Valor do DAEMS')}${r}-${ca('Total a Recolher')}${r},2)`), s(TIPOS[g.tipo].base), s(g.daems.obs)]);
    });
    const lastA = aA.length;
    const totA = CA.map(() => s('')); totA[0] = s('TOTAL');
    ['Notas', 'Itens', 'Produto+Frete+IPI', 'Crédito ICMS', 'B.C ICMS', 'Débito ICMS', 'Total a Recolher', 'Valor do DAEMS'].forEach(k => { totA[CA.indexOf(k)] = fx(`SUM(${ca(k)}${iniI}:${ca(k)}${lastA})`, ['Notas', 'Itens'].includes(k) ? '0' : M); });
    aA.push(totA);
    const rt = aA.length;
    aA.push([]);
    aA.push([s('Conferência'), s(''), s('Total a recolher')]);
    aA.push([s('Soma por item'), s(''), fx(`${IT}${ci('Total a Recolher')}${lastI + 1}`)]);
    aA.push([s('Soma por nota'), s(''), fx(`${NT}${cn('Total a Recolher')}${lastN + 1}`)]);
    aA.push([s('Apuração'), s(''), fx(`${ca('Total a Recolher')}${rt}`)]);
    aA.push([s('Situação'), s(''), { t: 's', f: `IF(AND(ROUND(C${rt + 3}-C${rt + 4},2)=0,ROUND(C${rt + 4}-C${rt + 5},2)=0),"Conferido: item, nota e apuração iguais","Divergência entre as abas")` }]);
    aA.push([]);
    const sig = c1 && c1.signatario && c1.signatario.nome ? `${c1.signatario.nome}${c1.signatario.cargo ? ' — ' + c1.signatario.cargo : ''}` : '';
    aA.push([s(`Responsável: ${sig || '____________________________________'}`)]);
    const wsA = X.utils.aoa_to_sheet([[]]); X.utils.sheet_add_aoa(wsA, aA, { origin: 'A1', cellDates: true });
    wsA['!cols'] = [30, 11, 12, 7, 7, 15, 13, 14, 13, 14, 20, 14, 11, 11, 14, 60, 30].map(w => ({ wch: w }));

    const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, wsA, 'Apuração');
    X.utils.book_append_sheet(wb, wsN, 'Por nota');
    X.utils.book_append_sheet(wb, wsI, 'Por item');
    X.writeFile(wb, nomeArquivo || `apuracao-difal-equalizacao-${U.today()}.xlsx`);
    return { grupos: grupos.length, itens: lastI - H0 };
  }

  global.RST_DAEMS = { TIPOS, tipoDevido, fmtDaems, MASK, chave, memoria, apurar, numeroDo, exportar };
})(window);
