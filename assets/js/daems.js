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
    const m = {
      tipo, findingId: f.id, companyId: f.companyId, referencia: f.referencia, numero: f.numero, cnpjRemetente: f.cnpjRemetente, ufRemetente: f.ufRemetente,
      descricao: f.descricao || it.descricao || '', ncm: f.ncm || it.ncm || '', cest: f.cest || it.cest || '', regra: f.regra,
      icmsCobrado: f.icmsCobrado || it.icms || 0, revisar: f.valorRevisar, valorOperacao: U.round2(v), aliqInter: aInter, aliqIntra: aIntra,
      metodo: '', icmsOrigem: null, bc: null, icmsDestino: null, devido: U.round2(f.valorDevido || 0)
    };
    if (tipo === 'DIFAL' && S.difalMetodo !== 'simples') {
      const icmsOrig = it.credito > 0 ? it.credito : U.round2((it.bcProprio || v) * aInter / 100);
      const bc = (v - icmsOrig) / (1 - aIntra / 100);
      Object.assign(m, { metodo: 'Base "por dentro": BC = (valor − ICMS de origem) ÷ (1 − alíq. interna); devido = BC × alíq. interna − ICMS de origem', icmsOrigem: U.round2(icmsOrig), bc: U.round2(bc), icmsDestino: U.round2(bc * aIntra / 100) });
    } else {
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

    const res = [['Empresa', 'IE', 'Referência', 'Imposto', 'Itens', 'Valor devido (memória)', 'Nº do DAEMS', 'Valor do DAEMS', 'Vencimento', 'Pago em', 'Diferença', 'Fundamento', 'Observação'].map(s)];
    grupos.forEach((g, i) => {
      const r = i + 2, c = model.companies.get(g.companyId) || {};
      res.push([s(nomeEmp(g.companyId)), s(c.ie || ''), s(U.refLabel(g.referencia)), s(TIPOS[g.tipo].nome), num(g.linhas.length, '0'), num(g.total), s(g.daems.numero), num(g.daems.valor), s(U.brDate(g.daems.vencimento)), s(U.brDate(g.daems.pagoEm)),
        g.daems.valor === '' ? s('') : { t: 'n', f: `ROUND(H${r}-F${r},2)`, z: M }, s(TIPOS[g.tipo].base), s(g.daems.obs)]);
    });
    const wsR = X.utils.aoa_to_sheet([[]]); X.utils.sheet_add_aoa(wsR, res, { origin: 'A1' });
    wsR['!cols'] = [30, 12, 10, 34, 7, 16, 20, 14, 11, 11, 11, 60, 40].map(w => ({ wch: w }));

    const hdr = ['Empresa', 'Referência', 'Imposto', 'NF', 'CNPJ remetente', 'UF', 'Item', 'NCM', 'Motivo da revisão', 'ICMS-ST cobrado', 'Valor da operação (custo final)', 'Alíq. interestadual', 'Alíq. interna', 'ICMS de origem', 'Base de cálculo', 'ICMS no destino', 'Valor devido', 'Nº do DAEMS', 'Método de cálculo'];
    const linhas = [hdr.map(s)];
    grupos.forEach(g => g.linhas.forEach(l => {
      const r = linhas.length + 1;
      const dev = l.tipo === 'DIFAL' && l.icmsOrigem !== null ? { t: 'n', f: `ROUND(P${r}-N${r},2)`, z: M } : { t: 'n', f: `ROUND(K${r}*(M${r}-L${r}),2)`, z: M };
      linhas.push([s(nomeEmp(g.companyId)), s(U.refLabel(g.referencia)), s(TIPOS[g.tipo].curto), num(+l.numero, '0'), s(U.fmtCNPJ(l.cnpjRemetente || '')), s(l.ufRemetente || ''), s(l.descricao), s(U.fmtNCM(l.ncm)), s(l.regra),
        num(l.icmsCobrado), num(l.valorOperacao), pct(l.aliqInter), pct(l.aliqIntra), num(l.icmsOrigem), num(l.bc),
        l.icmsOrigem !== null ? { t: 'n', f: `ROUND(O${r}*M${r},2)`, z: M } : s(''), dev, s(g.daems.numero), s(l.metodo)]);
    }));
    const last = linhas.length;
    const tot = Array.from({ length: 19 }, () => s(''));
    tot[0] = s('TOTAL');
    tot[9] = { t: 'n', f: `SUBTOTAL(9,J2:J${last})`, z: M };
    tot[16] = { t: 'n', f: `SUBTOTAL(9,Q2:Q${last})`, z: M };
    linhas.push(tot);
    const wsM = X.utils.aoa_to_sheet([[]]); X.utils.sheet_add_aoa(wsM, linhas, { origin: 'A1' });
    wsM['!cols'] = [28, 10, 11, 9, 19, 5, 44, 11, 34, 13, 15, 10, 10, 12, 13, 13, 13, 20, 70].map(w => ({ wch: w }));
    wsM['!autofilter'] = { ref: `A1:S${last}` };

    const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, wsR, 'DAEMS');
    X.utils.book_append_sheet(wb, wsM, 'Memória de cálculo');
    X.writeFile(wb, nomeArquivo || `memoria-difal-equalizacao-${U.today()}.xlsx`);
    return { grupos: grupos.length, itens: last - 1 };
  }

  global.RST_DAEMS = { TIPOS, tipoDevido, fmtDaems, MASK, chave, memoria, apurar, numeroDo, exportar };
})(window);
