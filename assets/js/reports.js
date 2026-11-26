/* Revisor ICMS-ST — relatórios, requerimento e exportações */
(function (global) {
  'use strict';
  const U = global.RST_U;
  const L = global.RST_LEGAL;

  const nomeEmpresa = c => c ? (c.razaoSocial || c.nomeFantasia || 'Empresa') : 'Empresa não definida';
  const tribNome = tipo => tipo === 'ST' ? 'ICMS-ST' : tipo === 'EQ' ? 'ICMS Equalização Simples Nacional' : tipo;
  const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const dataExtenso = iso => { const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${+m[3]} de ${MESES[+m[2] - 1]} de ${m[1]}` : ''; };

  /** Valor consolidado a revisar por cobrança, apenas para os achados informados (sem dupla contagem). */
  function consolidar(model, findings) {
    const porCharge = U.groupBy(findings.filter(f => f.valorRevisar > 0), f => f.chargeId);
    const out = [];
    Object.entries(porCharge).forEach(([chargeId, fs]) => {
      const ch = model.chargesById.get(chargeId);
      if (!ch) return;
      let total = 0;
      let integralNF = fs.some(f => f.escopo === 'nota' && f.integral);
      if (integralNF) total = ch.valorICMS;
      else {
        const byItem = U.groupBy(fs.filter(f => f.escopo === 'item'), f => f.itemId);
        Object.entries(byItem).forEach(([itemId, ifs]) => {
          const it = model.itemsById.get(itemId);
          const cap = it ? (it.icms || 0) : U.sum(ifs, f => f.valorRevisar);
          total += ifs.some(f => f.integral) ? cap : Math.min(cap, U.sum(ifs, f => f.valorRevisar));
        });
        total += U.sum(fs.filter(f => f.escopo === 'nota' && !f.integral), f => f.valorRevisar);
        total = Math.min(total, ch.valorICMS || total);
      }
      total = U.round2(total);
      const integral = integralNF || Math.abs(total - (ch.valorICMS || 0)) <= 0.05;
      out.push({ ch, findings: fs, total, integral });
    });
    out.sort((a, b) => String(a.ch.referencia).localeCompare(String(b.ch.referencia)) || (+a.ch.numero - +b.ch.numero));
    return out;
  }

  /* ---------------- Excel ---------------- */
  function setMoneyFormat(ws, cols) {
    const range = global.XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let r = range.s.r + 1; r <= range.e.r; r++) {
      cols.forEach(c => {
        const ref = global.XLSX.utils.encode_cell({ r, c });
        if (ws[ref] && typeof ws[ref].v === 'number') ws[ref].z = '#,##0.00';
      });
    }
  }

  function exportarExcel(model, findings, nomeArquivo) {
    const X = global.XLSX;
    if (!X) throw new Error('Biblioteca de planilhas não carregada.');
    const wb = X.utils.book_new();
    const linhas = findings.map(f => {
      const c = model.companies.get(f.companyId);
      return {
        'Empresa': nomeEmpresa(c), 'CNPJ': c ? U.fmtCNPJ(c.cnpj) : '', 'IE': c ? c.ie || '' : '',
        'Referência': U.refLabel(f.referencia), 'Tributo': `${f.tributoCodigo || ''} - ${tribNome(f.tipo)}`,
        'NF': f.numero, 'Chave de acesso': f.chave || '', 'Emissão': U.brDate(f.dataEmissao), 'Remetente (CNPJ)': U.fmtCNPJ(f.cnpjRemetente), 'UF origem': f.ufRemetente || '',
        'Item': f.descricao || '(NF inteira)', 'NCM': U.fmtNCM(f.ncm), 'CEST': U.fmtCEST(f.cest), 'GTIN': f.gtin || '',
        'Valor da mercadoria (R$)': f.valorItem, 'ICMS cobrado (R$)': f.icmsCobrado, 'Valor a revisar (R$)': f.valorRevisar, 'Valor devido estimado (R$)': f.valorDevido === null ? '' : f.valorDevido,
        'Achado': f.regra, 'Categoria': f.categoria, 'Força': L.FORCAS[f.forca].nome, 'Ação sugerida': f.acao, 'Resumo': f.resumo,
        'Base legal': L.citacoes(f.baseLegal).join('; '), 'Fundamentação': f.fundamentacao, 'Documentos necessários': (f.documentos || []).join('; '),
        'Status': L.STATUS[f.status] || f.status, 'Protocolo': f.protocolo || '', 'Data do pedido': U.brDate(f.dataPedido), 'Observações': f.obs || ''
      };
    });
    const ws = X.utils.json_to_sheet(linhas.length ? linhas : [{ 'Aviso': 'Nenhum achado no filtro atual.' }]);
    ws['!cols'] = [28, 20, 12, 10, 30, 10, 46, 11, 20, 8, 44, 11, 11, 15, 14, 14, 14, 14, 32, 14, 10, 28, 50, 60, 90, 50, 14, 14, 12, 30].map(w => ({ wch: w }));
    setMoneyFormat(ws, [14, 15, 16, 17]);
    ws['!autofilter'] = { ref: ws['!ref'] };
    X.utils.book_append_sheet(wb, ws, 'Itens para revisão');

    const cons = consolidar(model, findings.filter(f => !['descartado', 'indeferido'].includes(f.status)));
    const resumo = cons.map(x => {
      const c = model.companies.get(x.ch.companyId);
      return {
        'Empresa': nomeEmpresa(c), 'Referência': U.refLabel(x.ch.referencia), 'Tributo': `${x.ch.tributoCodigo} - ${tribNome(x.ch.tipo)}`,
        'NF': x.ch.numero, 'Emissão': U.brDate(x.ch.dataEmissao), 'Remetente (CNPJ)': U.fmtCNPJ(x.ch.cnpjRemetente), 'UF': x.ch.ufRemetente,
        'Valor da NF (R$)': x.ch.valorNF, 'ICMS cobrado (R$)': x.ch.valorICMS, 'Valor a revisar (R$)': x.total,
        'Pedido': x.integral ? 'Desvincular a NF da cobrança' : 'Revisão parcial (itens)', 'Achados': U.uniq(x.findings.map(f => f.regra)).join('; ')
      };
    });
    const ws2 = X.utils.json_to_sheet(resumo.length ? resumo : [{ 'Aviso': 'Nenhum valor a revisar no filtro atual.' }]);
    ws2['!cols'] = [28, 10, 34, 10, 11, 20, 6, 16, 16, 16, 30, 60].map(w => ({ wch: w }));
    setMoneyFormat(ws2, [7, 8, 9]);
    X.utils.book_append_sheet(wb, ws2, 'Resumo por NF');

    const usadas = U.uniq(findings.flatMap(f => f.baseLegal || []));
    const ws3 = X.utils.json_to_sheet(usadas.map(id => ({ 'Norma': L.NORMAS[id] ? L.NORMAS[id].cit : id, 'Conteúdo': L.NORMAS[id] ? L.NORMAS[id].texto : '', 'Link': L.NORMAS[id] ? L.NORMAS[id].url : '' })));
    ws3['!cols'] = [{ wch: 48 }, { wch: 120 }, { wch: 60 }];
    X.utils.book_append_sheet(wb, ws3, 'Base legal');
    X.writeFile(wb, nomeArquivo || `revisao-icms-st-${U.today()}.xlsx`);
  }

  /* ---------------- Requerimento ---------------- */
  const CSS_DOC = `
    body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.45;color:#111;margin:28px}
    h1{font-size:13pt;text-align:center;margin:0 0 4px} h2{font-size:11.5pt;margin:18px 0 6px;text-transform:uppercase}
    h3{font-size:11pt;margin:12px 0 4px} p{margin:0 0 8px;text-align:justify}
    .center{text-align:center} .small{font-size:9.5pt;color:#444} .right{text-align:right}
    table{border-collapse:collapse;width:100%;margin:6px 0 12px;font-size:9.5pt}
    th,td{border:1px solid #888;padding:4px 6px;vertical-align:top} th{background:#e9eef3;text-align:left}
    td.num,th.num{text-align:right;white-space:nowrap}
    .ass{margin-top:44px;text-align:center} .ass .linha{border-top:1px solid #333;width:320px;margin:0 auto 4px}
    .anexo p{font-size:10pt} @media print{body{margin:0}}`;

  function requerimentoHTML(model, opts) {
    const c = model.companies.get(opts.companyId) || {};
    const fs = opts.findings.filter(f => f.valorRevisar > 0 || f.integral);
    const cons = consolidar(model, fs);
    const totalRev = U.round2(U.sum(cons, x => x.total));
    const charges = model.charges.filter(ch => ch.companyId === opts.companyId && ch.referencia === opts.referencia && ch.tipo === opts.tipo);
    const totalCobrado = U.round2(U.sum(charges, ch => ch.valorICMS));
    const cod = (charges[0] && charges[0].tributoCodigo) || (opts.tipo === 'ST' ? '333' : '349');
    const trib = `${tribNome(opts.tipo)} (tributo ${cod})`;
    const ref = U.refLabel(opts.referencia);
    const end = [c.logradouro, c.numero, c.complemento, c.bairro].filter(Boolean).join(', ');
    const cnaes = [c.cnaePrincipal].concat(c.cnaesSecundarios || []).filter(Boolean);
    const sig = Object.assign({ nome: '', cargo: '' }, c.signatario || {}, opts.signatario || {});
    const local = (c.municipio ? c.municipio.replace(/\b(\w)(\w*)/g, (m, a, b) => a + b.toLowerCase()) : 'Campo Grande') + '/MS';
    const integrais = cons.filter(x => x.integral), parciais = cons.filter(x => !x.integral);
    const regras = U.uniq(fs.map(f => f.ruleId));
    const docs = U.uniq(fs.flatMap(f => f.documentos || []));
    const e = U.esc;

    const tabNF = cons.map(x => `<tr><td>${e(x.ch.numero)}</td><td>${e(U.brDate(x.ch.dataEmissao))}</td><td>${e(U.fmtCNPJ(x.ch.cnpjRemetente))}/${e(x.ch.ufRemetente || '')}</td><td class="num">${U.brl(x.ch.valorICMS)}</td><td class="num">${U.brl(x.total)}</td><td>${x.integral ? 'Desvincular a NF' : 'Revisão parcial (itens)'}</td></tr>`).join('');
    const tabItens = fs.slice().sort((a, b) => (+a.numero - +b.numero) || (b.valorRevisar - a.valorRevisar)).map(f => `<tr><td>${e(f.numero)}</td><td>${e(f.descricao || '(NF inteira)')}</td><td>${e(U.fmtNCM(f.ncm))}${f.cest ? '<br>' + e(U.fmtCEST(f.cest)) : ''}</td><td class="num">${U.brl(f.icmsCobrado)}</td><td class="num">${U.brl(f.valorRevisar)}</td><td>${e(f.regra)}</td></tr>`).join('');
    const direito = regras.map((rid, i) => {
      const R = L.REGRAS[rid];
      const its = fs.filter(f => f.ruleId === rid);
      const lista = its.slice(0, 12).map(f => `NF ${e(f.numero)}${f.descricao ? ' — ' + e(f.descricao) : ''} (${U.brl(f.valorRevisar)})`).join('; ');
      return `<h3>2.${i + 1}. ${e(R.nome)}</h3><p>${e(R.direito)}</p><p class="small">Ocorrências: ${lista}${its.length > 12 ? `; e mais ${its.length - 12}` : ''}.</p>`;
    }).join('');
    const anexo = fs.map((f, i) => `<p><b>${i + 1}. NF ${e(f.numero)}${f.descricao ? ' — ' + e(f.descricao) : ''}</b> · ${e(f.regra)} · a revisar ${U.brl(f.valorRevisar)}<br>${e(f.fundamentacao)}<br><span class="small">Base legal: ${e(L.citacoes(f.baseLegal).join('; '))}</span></p>`).join('');

    const body = `
      <p class="small right">${e(local)}, ${e(dataExtenso(opts.data || U.today()))}</p>
      <p><b>À Secretaria de Estado de Fazenda de Mato Grosso do Sul — SEFAZ/MS</b><br>Coordenadoria de Fiscalização do ICMS do Comércio, Indústria e Serviços — COFICS</p>
      <h1>PEDIDO DE REVISÃO DA APURAÇÃO DA COBRANÇA DO ${e(trib.toUpperCase())}</h1>
      <p class="center small">Referência ${e(ref)} · Resolução SEFAZ nº 3.033/2019</p>
      <p><b>${e(c.razaoSocial || '')}</b>, optante pelo Simples Nacional, inscrita no CNPJ sob o nº ${e(U.fmtCNPJ(c.cnpj || ''))}${c.ie ? ` e na Inscrição Estadual nº ${e(c.ie)}` : ''}${end ? `, estabelecida em ${e(end)}, ${e(c.municipio || '')}/${e(c.uf || 'MS')}` : ''}${cnaes.length ? `, com atividade principal ${e(cnaes[0].codigo)} — ${e(cnaes[0].descricao)}${cnaes.length > 1 ? ` e atividades secundárias ${e(cnaes.slice(1).map(x => x.codigo + ' — ' + x.descricao).join('; '))}` : ''}` : ''}, vem, respeitosamente, com fundamento na Resolução SEFAZ nº 3.033/2019, requerer a <b>revisão da apuração da cobrança do ${e(trib)}</b> da referência <b>${e(ref)}</b>, pelos fatos e fundamentos a seguir expostos.</p>
      <h2>1. Dos fatos</h2>
      <p>A SEFAZ/MS apurou, na referência ${e(ref)}, o total de ${U.brl(totalCobrado)} a título de ${e(trib)}, relativo a ${charges.length} nota(s) fiscal(is), conforme o Relatório de Prévia com Cálculos ICMS. Da conferência das memórias de cálculo, item a item, foram identificadas as inconsistências abaixo, que somam <b>${U.brl(totalRev)}</b> cobrados indevidamente ou a maior.</p>
      <table><thead><tr><th>NF</th><th>Emissão</th><th>Remetente / UF</th><th class="num">ICMS cobrado</th><th class="num">A revisar</th><th>Pedido</th></tr></thead><tbody>${tabNF}</tbody>
      <tfoot><tr><th colspan="3">Total</th><th class="num">${U.brl(U.sum(cons, x => x.ch.valorICMS))}</th><th class="num">${U.brl(totalRev)}</th><th></th></tr></tfoot></table>
      <h3>1.1. Detalhamento por item</h3>
      <table><thead><tr><th>NF</th><th>Item</th><th>NCM / CEST</th><th class="num">ICMS cobrado</th><th class="num">A revisar</th><th>Motivo</th></tr></thead><tbody>${tabItens}</tbody></table>
      <h2>2. Do direito</h2>${direito}
      <h2>3. Do pedido</h2>
      <p>Diante do exposto, requer:</p>
      <p>a) ${integrais.length ? `a desvinculação, da cobrança do ${e(trib)} da referência ${e(ref)}, das NF ${e(integrais.map(x => x.ch.numero).join(', '))}` : ''}${integrais.length && parciais.length ? '; e ' : ''}${parciais.length ? `a revisão parcial das NF ${e(parciais.map(x => x.ch.numero).join(', '))}, com a exclusão dos itens e valores relacionados no item 1.1` : ''}, reduzindo-se a exigência em ${U.brl(totalRev)};</p>
      <p>b) caso algum valor já tenha sido recolhido, a restituição do indébito, devidamente atualizado (CTN, art. 165, I; Resolução SEFAZ nº 3.426/2025);</p>
      <p>c) a juntada dos documentos anexos e, se necessário, a intimação para apresentação de documentos complementares (Resolução SEFAZ nº 3.033/2019, art. 1º, § 2º).</p>
      <h2>4. Documentos anexos</h2>
      <ul>${docs.map(d => `<li>${e(d)}</li>`).join('')}<li>Relatório de Prévia com Cálculos ICMS da referência ${e(ref)} e respectivas memórias de cálculo.</li></ul>
      <p>Termos em que pede deferimento.</p>
      <div class="ass"><div class="linha"></div>${e(sig.nome || 'Representante legal / contador responsável')}<br>${e(sig.cargo || '')}<br>${e(c.razaoSocial || '')} — CNPJ ${e(U.fmtCNPJ(c.cnpj || ''))}</div>
      <div class="anexo"><h2>Anexo — Fundamentação por item</h2>${anexo}</div>`;
    return { html: wrapDoc(`Pedido de revisão — ${c.razaoSocial || ''} — ${ref}`, body), totalRev, totalCobrado, cons };
  }

  function wrapDoc(title, body) {
    return `<!doctype html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>${U.esc(title)}</title><style>${CSS_DOC}</style></head><body>${body}</body></html>`;
  }

  function baixarWord(html, nome) { U.download(nome, new Blob(['﻿', html], { type: 'application/msword' })); }

  function imprimirHTML(html) {
    const fr = document.createElement('iframe');
    fr.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
    document.body.appendChild(fr);
    const d = fr.contentWindow.document;
    d.open(); d.write(html); d.close();
    setTimeout(() => { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) { /* ignore */ } setTimeout(() => fr.remove(), 2000); }, 350);
  }

  /* ---------------- Lista para o e-Fazenda ---------------- */
  function listaEFazenda(model, findings) {
    const cons = consolidar(model, findings.filter(f => !['descartado', 'indeferido'].includes(f.status)));
    const grupos = U.groupBy(cons, x => `${x.ch.companyId}|${x.ch.referencia}|${x.ch.tipo}`);
    const partes = Object.values(grupos).map(lista => {
      const ch0 = lista[0].ch;
      const c = model.companies.get(ch0.companyId) || {};
      const linhas = [];
      linhas.push(`${nomeEmpresa(c)} — IE ${c.ie || '—'} — Ref. ${U.refLabel(ch0.referencia)} — Tributo ${ch0.tributoCodigo} (${tribNome(ch0.tipo)})`);
      const integ = lista.filter(x => x.integral), parc = lista.filter(x => !x.integral);
      if (integ.length) {
        linhas.push('NFs a desvincular integralmente:');
        integ.forEach(x => linhas.push(`  • NF ${x.ch.numero} | ${U.fmtCNPJ(x.ch.cnpjRemetente)}/${x.ch.ufRemetente || ''} | emissão ${U.brDate(x.ch.dataEmissao)} | ICMS cobrado ${U.brl(x.ch.valorICMS)}`));
      }
      if (parc.length) {
        linhas.push('NFs com revisão parcial (itens):');
        parc.forEach(x => linhas.push(`  • NF ${x.ch.numero} | cobrado ${U.brl(x.ch.valorICMS)} | a revisar ${U.brl(x.total)} | ${U.uniq(x.findings.map(f => f.regra)).join('; ')}`));
      }
      linhas.push(`Total a revisar: ${U.brl(U.sum(lista, x => x.total))}`);
      return linhas.join('\n');
    });
    if (!partes.length) return 'Nenhum valor a revisar no filtro atual.';
    partes.push('Lembretes (Res. SEFAZ nº 3.033/2019): 1 pedido por mês de referência e por tributo (art. 1º, § 1º, II); sem efeito suspensivo (art. 1º, § 1º, III); feito até o vencimento, as NFs ficam desvinculadas até a decisão (art. 2º); decisão em até 15 dias úteis (art. 3º); novos pedidos pelo e-SAP (art. 4º).');
    return partes.join('\n\n');
  }

  /* ---------------- Produtos com ST (PGDAS-D) ---------------- */
  function exportarProdutosST(model, companyId) {
    const X = global.XLSX;
    const contestIntegral = new Set(model.findings.filter(f => f.integral && f.tipo === 'ST' && f.escopo === 'item' && !['descartado', 'indeferido'].includes(f.status)).map(f => f.itemId));
    const itens = model.items.filter(i => i.tipo === 'ST' && (!companyId || i.companyId === companyId) && !contestIntegral.has(i.id));
    const grupos = U.groupBy(itens, i => `${i.companyId}|${U.digits(i.gtin).length >= 8 ? U.digits(i.gtin) : U.normKey(i.descricao)}`);
    const linhas = Object.values(grupos).map(g => {
      const c = model.companies.get(g[0].companyId);
      return {
        'Empresa': nomeEmpresa(c), 'GTIN': U.digits(g[0].gtin).length >= 8 ? g[0].gtin : '', 'Descrição': g[0].descricao, 'NCM': U.fmtNCM(g[0].ncm), 'CEST': U.fmtCEST(g[0].cest),
        'NFs': U.uniq(g.map(i => i.numero)).join(', '), 'Referências': U.uniq(g.map(i => U.refLabel(i.referencia))).join(', '),
        'ICMS-ST cobrado (R$)': U.round2(U.sum(g, i => i.icms)), 'Tratamento na venda': 'CSOSN 500 — ICMS-ST já recolhido; segregar a receita no PGDAS-D como "com substituição tributária" (LC 123/2006, art. 18, § 4º-A, I)'
      };
    }).sort((a, b) => a['Descrição'].localeCompare(b['Descrição']));
    const ws = X.utils.json_to_sheet(linhas.length ? linhas : [{ 'Aviso': 'Nenhum item de ST no filtro.' }]);
    ws['!cols'] = [28, 16, 52, 12, 11, 24, 16, 16, 90].map(w => ({ wch: w }));
    setMoneyFormat(ws, [7]);
    const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, ws, 'Produtos com ST');
    X.writeFile(wb, `produtos-com-icms-st-${U.today()}.xlsx`);
    return linhas.length;
  }

  /* ---------------- Relação de itens para o SOS Reforma ----------------
   * Modelo do SOS Reforma: uma aba ("Sheet1") com CNPJ | NCM | Descrição | GTIN | Código do Produto — um produto por linha. */
  const gtinValido = g => { const d = U.digits(g); return [8, 12, 13, 14].includes(d.length) && !/^0+$/.test(d) ? d : ''; };

  /** Produtos (sem repetição) dos itens de ST e Equalização no escopo; o XML da NF-e, quando houver, completa descrição, GTIN e código. */
  function produtosSOSReforma(model, companyId, referencia) {
    const itens = model.items.filter(i => (i.tipo === 'ST' || i.tipo === 'EQ') && i.companyId && (!companyId || i.companyId === companyId) && (!referencia || i.referencia === referencia));
    const prods = new Map();
    itens.forEach(i => {
      const x = i.xmlItem || null;
      const gtin = gtinValido(x && x.gtin) || gtinValido(i.gtin);
      const ncm = U.digits((x && x.ncm) || i.ncm);
      const desc = String((x && x.descricao) || i.descricao || '').replace(/\s+/g, ' ').trim();
      const cProd = x && x.cProd ? String(x.cProd).trim() : '';
      const id = gtin ? `G${gtin}` : cProd ? `P${U.digits(i.cnpjRemetente)}:${cProd}` : `D${U.normKey(desc).slice(0, 60)}|${ncm}`;
      const chave = `${i.companyId}|${id}`;
      let p = prods.get(chave);
      if (!p) { p = { companyId: i.companyId, id, ncm, desc, gtin, cProd, remetente: U.digits(i.cnpjRemetente), tipos: new Set(), nfs: new Set() }; prods.set(chave, p); }
      if (ncm.length > p.ncm.length) p.ncm = ncm;      // NCM completo prevalece sobre o cortado
      if (desc.length > p.desc.length) p.desc = desc;  // descrição completa prevalece sobre a abreviada
      if (!p.gtin && gtin) p.gtin = gtin;
      if (!p.cProd && cProd) p.cProd = cProd;
      p.tipos.add(i.tipo); p.nfs.add(i.numero);
    });
    const lista = [...prods.values()];
    // código do produto: o da NF-e (XML); repetido entre produtos diferentes, ganha o final do CNPJ do fornecedor;
    // sem XML, um código fixo gerado a partir do produto (o mesmo a cada exportação)
    const usos = U.groupBy(lista.filter(p => p.cProd), p => `${p.companyId}|${p.cProd}`);
    lista.forEach(p => {
      const naDescricao = (p.desc.match(/^(\d{3,7})\s*-\s*(?=\S)/) || [])[1]; // "3377 - Sacola…": código do fornecedor na descrição
      if (p.cProd) p.codigo = usos[`${p.companyId}|${p.cProd}`].length > 1 ? `${p.cProd}-${p.remetente.slice(4, 8)}` : p.cProd;
      else if (naDescricao) p.codigo = naDescricao;
      else p.codigo = 'R' + U.hashText(p.id).toUpperCase();
    });
    return lista.sort((a, b) => a.desc.localeCompare(b.desc, 'pt-BR'));
  }

  /** Gera uma planilha por empresa no modelo do SOS Reforma. Devolve o resumo por empresa. */
  function exportarSOSReforma(model, companyId, referencia) {
    const X = global.XLSX;
    const prods = produtosSOSReforma(model, companyId, referencia);
    const porEmpresa = U.groupBy(prods, p => p.companyId);
    const resumo = [];
    Object.entries(porEmpresa).forEach(([cid, lista]) => {
      const c = model.companies.get(cid);
      const cnpj = U.digits(c && c.cnpj);
      if (cnpj.length !== 14) { resumo.push({ empresa: nomeEmpresa(c), erro: 'sem CNPJ' }); return; }
      const aoa = [['CNPJ', 'NCM', 'Descrição', 'GTIN', 'Código do Produto']].concat(lista.map(p => [cnpj, p.ncm, p.desc, p.gtin, p.codigo]));
      const ws = X.utils.aoa_to_sheet(aoa); // tudo como texto: preserva zeros à esquerda (NCM, CNPJ, GTIN)
      ws['!cols'] = [16, 11, 70, 16, 18].map(w => ({ wch: w }));
      const wb = X.utils.book_new();
      X.utils.book_append_sheet(wb, ws, 'Sheet1');
      const nome = `SOS Reforma - ${nomeEmpresa(c).replace(/[\\/:*?"<>|]+/g, ' ').trim()}${referencia ? ' - ' + U.refLabel(referencia).replace('/', '-') : ''} - itens.xlsx`;
      X.writeFile(wb, nome);
      resumo.push({ empresa: nomeEmpresa(c), produtos: lista.length, semGtin: lista.filter(p => !p.gtin).length, ncmIncompleto: lista.filter(p => p.ncm.length !== 8).length, arquivo: nome });
    });
    return resumo;
  }

  global.RST_REPORTS = { consolidar, exportarExcel, requerimentoHTML, baixarWord, imprimirHTML, listaEFazenda, exportarProdutosST, produtosSOSReforma, exportarSOSReforma, wrapDoc, CSS_DOC };
})(window);
