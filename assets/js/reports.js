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
    // valores a excluir iguais aos do pedido no e-Fazenda (item que vira DIFAL/Equalização sai inteiro da ST)
    const ped = pedidoEFazenda(model, fs, opts.daems || {});
    const excl = new Map(), linhasPed = [];
    ped.forEach(g => {
      g.desvincular.forEach(n => { excl.set(n.chargeId, n.revisar); linhasPed.push({ numero: n.numero, item: '(NF inteira)', ncm: '', cest: '', icms: n.icmsNF, excluir: n.revisar, motivo: n.descricao }); });
      g.alterar.forEach(n => { excl.set(n.chargeId, n.revisar); n.itens.forEach(i => { const it = model.itemsById.get(i.itemId) || {}; linhasPed.push({ numero: n.numero, item: i.descricaoItem, ncm: i.ncm, cest: it.cest || '', icms: i.icms, excluir: i.revisar, motivo: i.descricao.replace(/\.\s*Excluir R\$.*$/, '') }); }); });
    });
    const totalRev = U.round2(U.sum([...excl.values()]));
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

    const tabNF = cons.map(x => `<tr><td>${e(x.ch.numero)}</td><td>${e(U.brDate(x.ch.dataEmissao))}</td><td>${e(U.fmtCNPJ(x.ch.cnpjRemetente))}/${e(x.ch.ufRemetente || '')}</td><td class="num">${U.brl(x.ch.valorICMS)}</td><td class="num">${U.brl(excl.has(x.ch.id) ? excl.get(x.ch.id) : x.total)}</td><td>${x.integral ? 'Desvincular a NF' : 'Revisão parcial (itens)'}</td></tr>`).join('');
    const tabItens = linhasPed.sort((a, b) => (+a.numero - +b.numero) || (b.excluir - a.excluir)).map(l => `<tr><td>${e(l.numero)}</td><td>${e(l.item)}</td><td>${e(U.fmtNCM(l.ncm))}${l.cest ? '<br>' + e(U.fmtCEST(l.cest)) : ''}</td><td class="num">${U.brl(l.icms)}</td><td class="num">${U.brl(l.excluir)}</td><td>${e(l.motivo)}</td></tr>`).join('');
    const direito = regras.map((rid, i) => {
      const R = L.REGRAS[rid];
      const its = fs.filter(f => f.ruleId === rid);
      const lista = its.slice(0, 12).map(f => `NF ${e(f.numero)}${f.descricao ? ' — ' + e(f.descricao) : ''} (${U.brl(f.valorRevisar)})`).join('; ');
      return `<h3>2.${i + 1}. ${e(R.nome)}</h3><p>${e(R.direito)}</p><p class="small">Ocorrências: ${lista}${its.length > 12 ? `; e mais ${its.length - 12}` : ''}.</p>`;
    }).join('');
    // o que continua devido (DIFAL / Equalização) nos itens revisados e os DAEMS emitidos
    const D = global.RST_DAEMS;
    const dev = D && opts.settings ? D.apurar(model, fs, opts.settings, opts.daems || {}) : [];
    const secDev = dev.length ? `<h3>1.2. Valores que continuam devidos e seu recolhimento</h3>
      <p>Sobre os itens revisados permanece devido o imposto abaixo, ${dev.every(g => g.ok) ? 'já recolhido nos DAEMS indicados' : 'a ser recolhido em DAEMS próprio'}. A memória de cálculo, item a item, segue anexa.</p>
      <table><thead><tr><th>Imposto</th><th class="num">Itens</th><th class="num">Valor devido</th><th>Nº do DAEMS</th><th class="num">Valor do DAEMS</th><th>Fundamento</th></tr></thead><tbody>
      ${dev.map(g => `<tr><td>${e(D.TIPOS[g.tipo].nome)}</td><td class="num">${g.linhas.length}</td><td class="num">${U.brl(g.total)}</td><td>${e(g.daems.numero || '(a informar)')}</td><td class="num">${g.daems.valor !== '' ? U.brl(+g.daems.valor) : ''}</td><td class="small">${e(D.TIPOS[g.tipo].base)}</td></tr>`).join('')}</tbody></table>` : '';
    const anexoDev = dev.length ? `<div class="anexo"><h2>Anexo — Memória de cálculo do DIFAL e da Equalização</h2>${dev.map(g => `<h3>${e(D.TIPOS[g.tipo].nome)}${g.daems.numero ? ` — DAEMS nº ${e(g.daems.numero)}` : ''}</h3>
      <table><thead><tr><th>NF</th><th>Item</th><th class="num">Valor da operação</th><th class="num">Alíq. inter.</th><th class="num">Alíq. interna</th><th class="num">ICMS origem</th><th class="num">Base de cálculo</th><th class="num">Devido</th></tr></thead><tbody>
      ${g.linhas.map(l => `<tr><td>${e(l.numero)}</td><td>${e(l.descricao)}</td><td class="num">${U.brl(l.valorOperacao)}</td><td class="num">${U.fmt(l.aliqInter, 2)}%</td><td class="num">${U.fmt(l.aliqIntra, 2)}%</td><td class="num">${l.icmsOrigem !== null ? U.brl(l.icmsOrigem) : '—'}</td><td class="num">${U.brl(l.bc)}</td><td class="num">${U.brl(l.devido)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><th colspan="7">Total</th><th class="num">${U.brl(g.total)}</th></tr></tfoot></table>`).join('')}</div>` : '';
    const anexo = fs.map((f, i) => `<p><b>${i + 1}. NF ${e(f.numero)}${f.descricao ? ' — ' + e(f.descricao) : ''}</b> · ${e(f.regra)} · a revisar ${U.brl(f.valorRevisar)}<br>${e(f.fundamentacao)}<br><span class="small">Base legal: ${e(L.citacoes(f.baseLegal).join('; '))}</span></p>`).join('');

    const body = `
      <p class="small right">${e(local)}, ${e(dataExtenso(opts.data || U.today()))}</p>
      <p><b>À Secretaria de Estado de Fazenda de Mato Grosso do Sul — SEFAZ/MS</b><br>Coordenadoria de Fiscalização do ICMS do Comércio, Indústria e Serviços — COFICS</p>
      <h1>PEDIDO DE REVISÃO DA APURAÇÃO DA COBRANÇA DO ${e(trib.toUpperCase())}</h1>
      <p class="center small">Referência ${e(ref)} · Resolução SEFAZ nº 3.033/2019</p>
      <p><b>${e(c.razaoSocial || '')}</b>, optante pelo Simples Nacional, inscrita no CNPJ sob o nº ${e(U.fmtCNPJ(c.cnpj || ''))}${c.ie ? ` e na Inscrição Estadual nº ${e(c.ie)}` : ''}${end ? `, estabelecida em ${e(end)}, ${e(c.municipio || '')}/${e(c.uf || 'MS')}` : ''}${cnaes.length ? `, com atividade principal ${e(cnaes[0].codigo)} — ${e(cnaes[0].descricao)}${cnaes.length > 1 ? ` e atividades secundárias ${e(cnaes.slice(1).map(x => x.codigo + ' — ' + x.descricao).join('; '))}` : ''}` : ''}, vem, respeitosamente, com fundamento na Resolução SEFAZ nº 3.033/2019, requerer a <b>revisão da apuração da cobrança do ${e(trib)}</b> da referência <b>${e(ref)}</b>, pelos fatos e fundamentos a seguir expostos.</p>
      <h2>1. Dos fatos</h2>
      <p>A SEFAZ/MS apurou, na referência ${e(ref)}, o total de ${U.brl(totalCobrado)} a título de ${e(trib)}, relativo a ${charges.length} nota(s) fiscal(is), conforme o Relatório de Prévia com Cálculos ICMS. Da conferência das memórias de cálculo, item a item, foram identificadas as inconsistências abaixo, que somam <b>${U.brl(totalRev)}</b> cobrados indevidamente ou a maior.</p>
      <table><thead><tr><th>NF</th><th>Emissão</th><th>Remetente / UF</th><th class="num">ICMS cobrado</th><th class="num">A excluir</th><th>Pedido</th></tr></thead><tbody>${tabNF}</tbody>
      <tfoot><tr><th colspan="3">Total</th><th class="num">${U.brl(U.sum(cons, x => x.ch.valorICMS))}</th><th class="num">${U.brl(totalRev)}</th><th></th></tr></tfoot></table>
      <h3>1.1. Detalhamento por item</h3>
      <table><thead><tr><th>NF</th><th>Item</th><th>NCM / CEST</th><th class="num">ICMS cobrado</th><th class="num">A excluir</th><th>Motivo</th></tr></thead><tbody>${tabItens}</tbody></table>
      ${secDev}
      <h2>2. Do direito</h2>${direito}
      <h2>3. Do pedido</h2>
      <p>Diante do exposto, requer:</p>
      <p>a) ${integrais.length ? `a desvinculação, da cobrança do ${e(trib)} da referência ${e(ref)}, das NF ${e(integrais.map(x => x.ch.numero).join(', '))}` : ''}${integrais.length && parciais.length ? '; e ' : ''}${parciais.length ? `a revisão parcial das NF ${e(parciais.map(x => x.ch.numero).join(', '))}, com a exclusão dos itens e valores relacionados no item 1.1` : ''}, reduzindo-se a exigência em ${U.brl(totalRev)};</p>
      <p>b) caso algum valor já tenha sido recolhido, a restituição do indébito, devidamente atualizado (CTN, art. 165, I; Resolução SEFAZ nº 3.426/2025);</p>
      ${dev.length ? `<p>c) o reconhecimento de que o imposto que permanece devido sobre os itens revisados (${e(dev.map(g => `${D.TIPOS[g.tipo].curto} de ${U.brl(g.total)}`).join(' e '))}) ${dev.every(g => g.ok) ? `foi recolhido no(s) DAEMS nº ${e(dev.map(g => g.daems.numero).join(', '))}` : 'será recolhido em DAEMS próprio'}, conforme memória de cálculo anexa;</p>` : ''}
      <p>${dev.length ? 'd' : 'c'}) a juntada dos documentos anexos e, se necessário, a intimação para apresentação de documentos complementares (Resolução SEFAZ nº 3.033/2019, art. 1º, § 2º).</p>
      <h2>4. Documentos anexos</h2>
      <ul>${docs.map(d => `<li>${e(d)}</li>`).join('')}<li>Relatório de Prévia com Cálculos ICMS da referência ${e(ref)} e respectivas memórias de cálculo.</li></ul>
      <p>Termos em que pede deferimento.</p>
      <div class="ass"><div class="linha"></div>${e(sig.nome || 'Representante legal / contador responsável')}<br>${e(sig.cargo || '')}<br>${e(c.razaoSocial || '')} — CNPJ ${e(U.fmtCNPJ(c.cnpj || ''))}</div>
      <div class="anexo"><h2>Anexo — Fundamentação por item</h2>${anexo}</div>${anexoDev}`;
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

  /* ---------------- Pedido no e-Fazenda (Informações Fiscais → Revisão de NF), no formato da tela ----------------
   * Abas "Notas a Desvincular" (NF inteira) e "Notas a Alterar" (item a item), motivo da lista fixa do portal e
   * os campos do quadro "Confirmação de Dados": Descrição (até 99 caracteres) e Justificativa (até 199). */
  const LIM_DESC = 99, LIM_JUST = 199;
  const MOTIVOS = {
    ST_REMETENTE: 'Substituição Tributária - Remetente Inscrito como Substituto Tributário',
    DIFAL: 'Diferencial de Alíquota à vista da operação',
    ISENTO: 'Isento / Não Tributado',
    INSCRICAO: 'Inscrição Divergente',
    TERCEIROS: 'Remessa por Conta de Terceiros',
    TVF: 'TVF / TA',
    EXPORTACAO: 'Mercadoria destinada a Exportação',
    GNRE: 'Tributo já recolhido por GNRE',
    ERRO: 'Erro no cálculo do Tributo',
    OUTROS: 'Outros'
  };
  const MOTIVO_DA_REGRA = {
    NF_DEST: 'INSCRICAO', ST_RETIDO: 'ST_REMETENTE', EQ_ME: 'ISENTO', EQ_MEI: 'ISENTO', EQ_ME_VERIF: 'ISENTO',
    ST_CALCULO: 'ERRO', ST_CREDITO: 'ERRO', ST_MVA_TAB: 'ERRO', ST_MVA_DIV: 'ERRO', ST_DESPESAS: 'ERRO', EQ_PERC: 'ERRO', EQ_CALCULO: 'ERRO', DUP_BASES: 'ERRO'
  };
  /** Corta no limite do campo, numa palavra inteira. */
  function cortar(s, n) {
    s = String(s || '').replace(/\s+/g, ' ').trim();
    if (s.length <= n) return s;
    const c = s.slice(0, n);
    const i = c.lastIndexOf(' ');
    return (i > n * 0.6 ? c.slice(0, i) : c).replace(/[\s,;:–-]+$/, '');
  }
  const semPontoFinal = s => String(s || '').trim().replace(/[.;]+$/, '');
  /** Justificativa curta, escrita para a SEFAZ, de cada tipo de achado (com a norma principal). */
  // com o nº do DAEMS (dae), o texto informa o recolhimento do que continua devido — cabe nos 199 caracteres
  const caber = (comCit, semCit) => comCit.length <= LIM_JUST - 1 ? comCit : semCit;
  const CURTO = {
    ST_USO: (f, dae) => {
      const dest = /degust|brinde|amostra/i.test(f.resumo) ? 'degustação/brinde' : 'uso e consumo';
      if (dae && f.valorDevido) { const t = `Mercadoria para ${dest}, não revendida: ST indevida; devido só o DIFAL de ${U.brl(f.valorDevido)}, recolhido no DAEMS ${dae}`; return caber(`${t} (CF art. 150 §7º; LC 87/96 art. 10)`, t); }
      return `Mercadoria para ${dest}, não revendida: ST indevida${f.valorDevido ? `; devido só o diferencial de alíquotas (${U.brl(f.valorDevido)})` : ''} (CF art. 150 §7º; LC 87/96 art. 10)`;
    },
    ST_INSUMO: (f, dae) => {
      if (dae && f.valorDevido) { const t = `Insumo do preparo de alimentos, não revendido: ST indevida; devida só a Equalização de ${U.brl(f.valorDevido)}, recolhida no DAEMS ${dae}`; return caber(`${t} (CF art. 150 §7º; Dec. 15.055/2018)`, t); }
      return `Insumo usado no preparo de alimentos, não revendido: ST indevida${f.valorDevido ? `; devida só a Equalização (${U.brl(f.valorDevido)})` : ''} (CF art. 150 §7º; Dec. 15.055/2018)`;
    },
    ST_SEM_CEST: () => 'NF sem CEST e produto que não corresponde a item do Subanexo I do Anexo III do RICMS/MS: não sujeito à ST (Conv. ICMS 142/2018, cl. 7ª)',
    ST_FORA_TAB: (f, dae) => {
      if (dae && f.valorDevido) { const t = `NCM ${U.fmtNCM(f.ncm)} fora do Subanexo I do RICMS/MS: não sujeito à ST; Equalização de ${U.brl(f.valorDevido)} recolhida no DAEMS ${dae}`; return caber(`${t} (Conv. ICMS 142/2018, cl. 7ª)`, t); }
      return `NCM ${U.fmtNCM(f.ncm)} fora do Subanexo I do Anexo III do RICMS/MS: mercadoria não sujeita à ST (Conv. ICMS 142/2018, cl. 7ª)`;
    },
    DUP_ST_EQ: () => 'Mesmo item cobrado na ST e na Equalização; a Equalização não se aplica a mercadoria sujeita à ST (Dec. 15.055/2018, art. 3º, §1º, II, a)',
    DUP_ITEM: () => 'Linha repetida na memória de cálculo: o mesmo item foi cobrado mais de uma vez (CTN, art. 165)',
    DUP_PERIODO: f => `${semPontoFinal(f.resumo)}: mesmo fato gerador cobrado duas vezes (CTN, art. 165)`
  };
  /** Texto curto de um achado: o resumo e a norma principal. */
  function curto(f, dae) {
    if (CURTO[f.ruleId]) return CURTO[f.ruleId](f, dae);
    const cit = (global.RST_LEGAL.citacoes(f.baseLegal || [])[0] || '');
    return `${semPontoFinal(f.resumo)}${cit ? ` (${cit})` : ''}`;
  }

  function camposPedido(fs, valor, daems) {
    const ord = fs.slice().sort((a, b) => b.valorRevisar - a.valorRevisar);
    const principal = ord[0];
    const motivoKey = MOTIVO_DA_REGRA[principal.ruleId] || 'OUTROS';
    const descricao = cortar(`${principal.regra}${ord.length > 1 ? ` e mais ${ord.length - 1}` : ''}. Excluir ${U.brl(valor)}`, LIM_DESC);
    // junta achados inteiros enquanto couberem; só o primeiro pode ser cortado. O texto com o nº do DAEMS vem primeiro.
    const D = global.RST_DAEMS;
    const textos = U.uniq(ord.map(f => curto(f, D && daems ? D.numeroDo(daems, f) : '')));
    textos.sort((a, b) => (/DAEMS/.test(b) ? 1 : 0) - (/DAEMS/.test(a) ? 1 : 0));
    let justificativa = '';
    textos.forEach((t, i) => {
      const prox = justificativa ? `${justificativa}; ${t}` : t;
      if (i === 0) justificativa = cortar(prox, LIM_JUST - 1);
      else if (prox.length + 1 <= LIM_JUST) justificativa = prox;
    });
    justificativa = semPontoFinal(justificativa) + '.';
    return { motivo: MOTIVOS[motivoKey], motivoKey, descricao, justificativa };
  }

  function pedidoEFazenda(model, findings, daems) {
    const ativos = findings.filter(f => f.valorRevisar > 0 && !['descartado', 'indeferido'].includes(f.status));
    const cons = consolidar(model, ativos);
    const grupos = U.groupBy(cons, x => `${x.ch.companyId}|${x.ch.referencia}|${x.ch.tipo}`);
    return Object.values(grupos).map(lista => {
      const ch0 = lista[0].ch;
      const c = model.companies.get(ch0.companyId) || {};
      const desvincular = [], alterar = [];
      lista.forEach(x => {
        const ch = x.ch, nf = model.nfsByKey.get(ch.nfKey);
        const base = { chargeId: ch.id, tipo: ch.tipo, numero: ch.numero, cnpj: ch.cnpjRemetente, razao: (nf && nf.remetenteNome) || '', uf: ch.ufRemetente || '', emissao: ch.dataEmissao, icmsNF: ch.valorICMS };
        const daNota = x.findings.filter(f => f.escopo === 'nota');
        if (daNota.some(f => f.integral)) { // motivo da nota inteira (devolução, cancelamento, outro destinatário, ME isenta…)
          const fsN = daNota.filter(f => f.integral);
          desvincular.push(Object.assign(base, { revisar: ch.valorICMS }, camposPedido(fsN.length ? fsN : x.findings, ch.valorICMS, daems)));
          return;
        }
        const porItem = U.groupBy(x.findings.filter(f => f.escopo === 'item'), f => f.itemId);
        const itens = Object.entries(porItem).map(([itemId, ifs]) => {
          const it = model.itemsById.get(itemId) || {};
          const icms = U.round2(it.icms || 0);
          const liquido = U.round2(Math.min(icms, U.sum(ifs, f => f.valorRevisar)));
          const D = global.RST_DAEMS;
          // DIFAL / Equalização: o ICMS-ST do item é todo indevido — exclui-se o item inteiro e o outro imposto vai em DAEMS próprio
          const subst = !!(D && ifs.some(f => D.REGRAS[f.ruleId]));
          // item que continua na ST, revisado em parte: com o DAEMS do ICMS-ST correto informado, exclui-se o item inteiro
          const residual = U.round2(icms - liquido);
          const dae = !subst && D && ch.tipo === 'ST' && residual > 0.005 ? D.numeroPor(daems, ch.companyId, ch.referencia, 'ST') : '';
          const excluir = subst || dae ? icms : liquido;
          const campos = camposPedido(ifs, excluir, daems);
          if (dae) {
            const extra = `ICMS-ST correto de ${U.brl(residual)} recolhido no DAEMS ${dae}`;
            const j = semPontoFinal(campos.justificativa);
            campos.justificativa = (j.length + extra.length + 3 <= LIM_JUST ? `${j}; ${extra}` : `${cortar(j.replace(/\s*\([^)]*\)\s*$/, ''), LIM_JUST - extra.length - 3)}; ${extra}`) + '.';
          }
          return Object.assign({ itemId, ncm: it.ncm || '', descricaoItem: it.descricao || '', valorTotal: it.valorTotal || 0, icms, revisar: excluir, liquido, emGuia: subst || dae ? residual : 0 }, campos);
        }).sort((a, b) => b.revisar - a.revisar);
        // achado da nota sem item (ex.: bases acima do valor da NF): vai como linha da própria nota
        daNota.forEach(f => itens.push(Object.assign({ ncm: '', descricaoItem: '(nota inteira)', valorTotal: ch.valorNF || 0, icms: ch.valorICMS, revisar: f.valorRevisar, liquido: f.valorRevisar, emGuia: 0 }, camposPedido([f], f.valorRevisar, daems))));
        if (itens.length) alterar.push(Object.assign(base, { revisar: U.round2(Math.min(ch.valorICMS || Infinity, U.sum(itens, i => i.revisar))), itens }));
      });
      return {
        empresa: nomeEmpresa(c), ie: c.ie || '', cnpjEmpresa: c.cnpj || '', referencia: ch0.referencia, tipo: ch0.tipo, tributoCodigo: ch0.tributoCodigo,
        desvincular: desvincular.sort((a, b) => b.revisar - a.revisar), alterar: alterar.sort((a, b) => b.revisar - a.revisar),
        total: U.round2(U.sum(desvincular, n => n.revisar) + U.sum(alterar, n => n.revisar))
      };
    }).sort((a, b) => String(b.referencia).localeCompare(String(a.referencia)) || a.empresa.localeCompare(b.empresa));
  }

  /** Planilha do pedido: uma linha por NF a desvincular e por item a alterar, com os campos da tela. */
  function exportarPedidoEFazenda(grupos) {
    const X = global.XLSX;
    const linhas = [];
    grupos.forEach(g => {
      const comum = { 'Empresa': g.empresa, 'IE': g.ie, 'Referência': U.refLabel(g.referencia), 'Tributo': `${g.tributoCodigo} - ${tribNome(g.tipo)}` };
      g.desvincular.forEach(n => linhas.push(Object.assign({}, comum, { 'Aba': 'Notas a Desvincular', 'NF': n.numero, 'CNPJ do remetente': U.fmtCNPJ(n.cnpj), 'Fornecedor': n.razao, 'NCM/SH': '', 'Descrição do item': '', 'Vlr total': '', 'Valor ICMS': n.icmsNF, 'A revisar': n.revisar, 'Motivo': n.motivo, 'Descrição (até 99)': n.descricao, 'Justificativa (até 199)': n.justificativa })));
      g.alterar.forEach(n => n.itens.forEach(i => linhas.push(Object.assign({}, comum, { 'Aba': 'Notas a Alterar', 'NF': n.numero, 'CNPJ do remetente': U.fmtCNPJ(n.cnpj), 'Fornecedor': n.razao, 'NCM/SH': U.digits(i.ncm), 'Descrição do item': i.descricaoItem, 'Vlr total': i.valorTotal, 'Valor ICMS': i.icms, 'A revisar': i.revisar, 'Motivo': i.motivo, 'Descrição (até 99)': i.descricao, 'Justificativa (até 199)': i.justificativa }))));
    });
    const ws = X.utils.json_to_sheet(linhas.length ? linhas : [{ 'Aviso': 'Nada a revisar no filtro.' }]);
    ws['!cols'] = [26, 11, 9, 24, 20, 9, 19, 26, 10, 40, 11, 11, 11, 34, 60, 90].map(w => ({ wch: w }));
    setMoneyFormat(ws, [10, 11, 12]);
    if (linhas.length) ws['!autofilter'] = { ref: ws['!ref'] };
    const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, ws, 'Pedido e-Fazenda');
    X.writeFile(wb, `pedido-efazenda-${U.today()}.xlsx`);
    return linhas.length;
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

  /* ---------------- Lista de itens (com ou sem agrupamento) para conferência em outros portais ---------------- */
  function exportarItens(model, rows, agrupado, referencia) {
    const X = global.XLSX, L = global.RST_LEGAL;
    const linhas = rows.map(r => {
      const it = r.it, c = model.companies.get(it.companyId);
      const o = it.oficial && it.oficial.cands.length ? ((it.oficial.especificos && it.oficial.especificos.length) ? it.oficial.especificos : it.oficial.cands) : [];
      const st = it.tipo === 'ST';
      return {
        'Empresa': nomeEmpresa(c), 'Referência': U.refLabel(it.referencia), 'Tributo': st ? 'ICMS-ST (333)' : 'Equalização (349)',
        'NF': it.numero, 'Emissão': U.brDate((r.nf && r.nf.dataEmissao) || ''), 'CNPJ do remetente': U.fmtCNPJ(it.cnpjRemetente), 'UF': it.ufRemetente || '',
        'Descrição': it.descricao, 'NCM': U.fmtNCM(it.ncm), 'CEST': U.fmtCEST(it.cest), 'GTIN': gtinValido(it.gtin || (it.xmlItem && it.xmlItem.gtin)),
        'CST': it.cst || '', 'CFOP': it.cfop || '',
        'Valor da mercadoria': it.valorTotal || 0, 'Frete': it.frete || 0, 'IPI': it.ipi || 0, 'Outros': it.outros || 0, 'Desconto': it.desconto || 0, 'Base / custo final': it.base || 0,
        'MVA aplicada (%)': st && it.mvaAj !== null && it.mvaAj !== undefined ? it.mvaAj : '',
        'MVA de referência (%)': st && it.mvaTab !== null && it.mvaTab !== undefined ? it.mvaTab : '',
        'Fonte da MVA de referência': st && it.mvaRef ? (it.mvaRef.oficial ? 'Subanexo I' : 'Tabela do usuário') : '',
        'Item do Subanexo I': o.slice(0, 3).map(e => `${e.item} (CEST ${U.fmtCEST(e.cest)})`).join('; '),
        'Alíq. interestadual (%)': st ? (it.aliqInter || '') : '', 'Crédito admitido': st ? (it.credito || 0) : '', 'Percentual EQ (%)': st ? '' : (it.percentual || 0),
        'ICMS cobrado': it.icms || 0, 'ICMS recalculado': it.icmsCalc !== null && it.icmsCalc !== undefined ? it.icmsCalc : '', 'A revisar': r.rev || 0,
        'Situação na revisão': r.forca ? L.FORCAS[r.forca].nome : 'Sem apontamento', 'Achados': U.uniq(r.fs.map(x => L.REGRAS[x.ruleId].nome)).join('; ')
      };
    });
    const wb = X.utils.book_new();
    if (agrupado) {
      const gl = agrupado.grupos.map(g => ({
        [agrupado.nome]: g.rot, 'Itens': g.itens, 'NFs': g.nfs, 'NCM': g.ncms.join(', '), 'CEST': g.cests.join(', '), 'MVA aplicada': g.mvas.join(', '),
        'Descrições': g.descs.slice(0, 5).join(' | ') + (g.descs.length > 5 ? ` (+${g.descs.length - 5})` : ''),
        'Valor da mercadoria': g.valor, 'ICMS cobrado': g.icms, 'A revisar': g.rev, 'Itens com apontamento': g.comAchado
      }));
      const wg = X.utils.json_to_sheet(gl.length ? gl : [{ 'Aviso': 'Nenhum item no filtro.' }]);
      wg['!cols'] = [48, 7, 6, 24, 14, 18, 70, 16, 14, 12, 12].map(w => ({ wch: w }));
      setMoneyFormat(wg, [7, 8, 9]);
      X.utils.book_append_sheet(wb, wg, ('Por ' + agrupado.nome).replace(/[:\\/?*[\]]/g, ' ').slice(0, 31));
    }
    const wi = X.utils.json_to_sheet(linhas.length ? linhas : [{ 'Aviso': 'Nenhum item no filtro.' }]);
    wi['!cols'] = [26, 9, 16, 9, 10, 19, 5, 52, 11, 11, 15, 6, 6, 13, 9, 9, 9, 9, 13, 10, 10, 15, 24, 9, 11, 10, 12, 12, 12, 18, 50].map(w => ({ wch: w }));
    setMoneyFormat(wi, [13, 14, 15, 16, 17, 18, 24, 26, 27, 28]);
    X.utils.book_append_sheet(wb, wi, 'Itens');
    X.writeFile(wb, `itens${agrupado ? '-por-' + U.slug(agrupado.nome) : ''}${referencia ? '-' + referencia : ''}-${U.today()}.xlsx`);
    return { itens: linhas.length, grupos: agrupado ? agrupado.grupos.length : 0 };
  }

  /* ---------------- Memória de cálculo (grade) — as colunas e linhas que estão na tela, com autofiltro ---------------- */
  function exportarMemoria(cols, linhas, agrupado, tipo, referencia) {
    const X = global.XLSX;
    const numerico = c => c.tipo === 'brl' || c.tipo === 'pct' || c.tipo === 'qtd';
    const valor = (c, r) => {
      const v = c.v(r);
      if (numerico(c)) return v === null || v === undefined || v === '' ? '' : (+v || 0);
      return v === null || v === undefined ? '' : String(v);
    };
    const off = agrupado ? 1 : 0;
    const aoa = [(agrupado ? [agrupado.nome] : []).concat(cols.map(c => c.t))];
    if (agrupado) agrupado.grupos.forEach(g => g.rows.forEach(r => aoa.push([g.rot].concat(cols.map(c => valor(c, r))))));
    else linhas.forEach(r => aoa.push(cols.map(c => valor(c, r))));
    const ws = X.utils.aoa_to_sheet(aoa);
    const range = X.utils.decode_range(ws['!ref']);
    for (let R = 1; R <= range.e.r; R++) {
      cols.forEach((c, j) => {
        const cell = ws[X.utils.encode_cell({ r: R, c: j + off })];
        if (cell && typeof cell.v === 'number') cell.z = c.tipo === 'qtd' ? '#,##0.####' : '#,##0.00';
      });
    }
    ws['!cols'] = (agrupado ? [{ wch: 40 }] : []).concat(cols.map(c => ({ wch: c.larga ? 48 : numerico(c) ? 13 : Math.max(9, Math.min(28, c.t.length + 2)) })));
    ws['!autofilter'] = { ref: X.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: range.e.r, c: range.e.c } }) };
    const wb = X.utils.book_new();
    X.utils.book_append_sheet(wb, ws, tipo === 'EQ' ? 'Memória Equalização' : 'Memória ICMS-ST');
    X.writeFile(wb, `memoria-${tipo === 'EQ' ? 'equalizacao' : 'icms-st'}${agrupado ? '-por-' + U.slug(agrupado.nome) : ''}${referencia ? '-' + referencia : ''}-${U.today()}.xlsx`);
    return { linhas: aoa.length - 1 };
  }

  global.RST_REPORTS = { consolidar, exportarExcel, requerimentoHTML, baixarWord, imprimirHTML, listaEFazenda, pedidoEFazenda, exportarPedidoEFazenda, LIM_DESC, LIM_JUST, exportarProdutosST, produtosSOSReforma, exportarSOSReforma, exportarItens, exportarMemoria, wrapDoc, CSS_DOC };
})(window);
