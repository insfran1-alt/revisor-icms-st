/* Revisor ICMS-ST — leitura dos documentos (PDF da SEFAZ/MS, planilhas da memória de cálculo, cartão CNPJ e XML de NF-e) */
(function (global) {
  'use strict';
  const U = global.RST_U;
  const NUM_RE = /^-?[\d.]*\d,\d{2,4}$/;

  /* ============================================================
   * Utilidades de texto
   * ============================================================ */
  const rx = (text, re, g = 1) => { const m = text.match(re); return m ? (m[g] || '').trim() : ''; };
  const lines = text => String(text || '').split(/\r?\n/).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean);

  function numeroDoNomeArquivo(name) {
    const base = String(name || '').replace(/\.[^.]+$/, '');
    const all = base.match(/\d{3,9}/g) || [];
    return all.length ? String(+all[0]) : '';
  }

  /* ============================================================
   * Cartão CNPJ (Comprovante de Inscrição e de Situação Cadastral — RFB)
   * ============================================================ */
  const CNPJ_LABELS = [
    'NUMERO DE INSCRICAO', 'COMPROVANTE DE INSCRICAO E DE SITUACAO', 'CADASTRAL', 'COMPROVANTE DE INSCRICAO E DE SITUACAO CADASTRAL', 'DATA DE ABERTURA',
    'NOME EMPRESARIAL', 'TITULO DO ESTABELECIMENTO (NOME DE FANTASIA)', 'PORTE',
    'CODIGO E DESCRICAO DA ATIVIDADE ECONOMICA PRINCIPAL', 'CODIGO E DESCRICAO DAS ATIVIDADES ECONOMICAS SECUNDARIAS',
    'CODIGO E DESCRICAO DA NATUREZA JURIDICA', 'LOGRADOURO', 'NUMERO', 'COMPLEMENTO', 'CEP', 'BAIRRO/DISTRITO', 'MUNICIPIO', 'UF',
    'ENDERECO ELETRONICO', 'TELEFONE', 'ENTE FEDERATIVO RESPONSAVEL (EFR)', 'SITUACAO CADASTRAL', 'DATA DA SITUACAO CADASTRAL',
    'MOTIVO DE SITUACAO CADASTRAL', 'SITUACAO ESPECIAL', 'DATA DA SITUACAO ESPECIAL'
  ];
  const CNAE_RE = /(\d{2}\.\d{2}-\d-\d{2})\s*-\s*(.+?)(?=\s*\d{2}\.\d{2}-\d-\d{2}\s*-|$)/g;

  function parseCNAEs(text) {
    const out = [];
    const t = String(text || '').replace(/\s+/g, ' ');
    let m;
    CNAE_RE.lastIndex = 0;
    while ((m = CNAE_RE.exec(t))) out.push({ codigo: m[1], descricao: m[2].trim().replace(/\s*\*+$/, '') });
    return out;
  }

  function parseCartaoCNPJ(pdf) {
    const warnings = [];
    const ls = lines(pdf.streamText);
    const stop = ls.findIndex(l => /^Aprovado pela Instru|^Emitido no dia/i.test(l));
    const body = stop > 0 ? ls.slice(0, stop) : ls;
    const fields = {};
    let cur = null;
    body.forEach(l => {
      const n = U.norm(l);
      if (CNPJ_LABELS.includes(n)) { cur = n; if (!fields[cur]) fields[cur] = []; return; }
      if (cur) fields[cur].push(l);
    });
    const f = k => (fields[k] || []).join(' ').replace(/\s+/g, ' ').trim();
    const insc = f('NUMERO DE INSCRICAO');
    let cnpj = U.digits(rx(insc, /(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/));
    if (!cnpj) cnpj = U.digits(rx(pdf.lineText, /(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/));
    const principal = parseCNAEs(f('CODIGO E DESCRICAO DA ATIVIDADE ECONOMICA PRINCIPAL'));
    const secundarias = parseCNAEs(f('CODIGO E DESCRICAO DAS ATIVIDADES ECONOMICAS SECUNDARIAS'));
    let cnaePrincipal = principal[0] || null;
    let cnaesSec = secundarias;
    if (!cnaePrincipal) {
      // alternativa: busca no texto por linhas
      const all = parseCNAEs(pdf.lineText);
      cnaePrincipal = all[0] || null;
      cnaesSec = all.slice(1);
      if (!cnaePrincipal) warnings.push('Não foi possível identificar as atividades (CNAE) no cartão CNPJ.');
    }
    const porteRaw = U.norm(f('PORTE'));
    const porte = /\bEPP\b/.test(porteRaw) ? 'EPP' : /\bME\b/.test(porteRaw) ? 'ME' : /DEMAIS/.test(porteRaw) ? 'DEMAIS' : porteRaw;
    const data = {
      cnpj,
      tipoEstabelecimento: /FILIAL/i.test(insc) ? 'FILIAL' : 'MATRIZ',
      dataAbertura: U.isoDate(f('DATA DE ABERTURA')),
      razaoSocial: f('NOME EMPRESARIAL'),
      nomeFantasia: f('TITULO DO ESTABELECIMENTO (NOME DE FANTASIA)').replace(/^\*+$/, ''),
      porte,
      cnaePrincipal,
      cnaesSecundarios: cnaesSec,
      naturezaJuridica: f('CODIGO E DESCRICAO DA NATUREZA JURIDICA'),
      logradouro: f('LOGRADOURO'), numero: f('NUMERO'), complemento: f('COMPLEMENTO').replace(/^\*+$/, ''),
      cep: f('CEP'), bairro: f('BAIRRO/DISTRITO'), municipio: f('MUNICIPIO'), uf: f('UF').slice(0, 2),
      email: f('ENDERECO ELETRONICO').replace(/^\*+$/, ''), telefone: f('TELEFONE').replace(/^\*+$/, ''),
      situacao: f('SITUACAO CADASTRAL'), dataSituacao: U.isoDate(f('DATA DA SITUACAO CADASTRAL')),
      emitidoEm: U.isoDate(rx(pdf.streamText.replace(/\n/g, ' '), /Emitido no dia\s*(\d{2}\/\d{2}\/\d{4})/i))
    };
    if (!data.razaoSocial) data.razaoSocial = rx(pdf.lineText, /NOME EMPRESARIAL:?\s*\n?\s*([^\n]+)/i);
    if (!cnpj) warnings.push('CNPJ não identificado no cartão.');
    return { kind: 'cnpj', data, warnings };
  }

  /* ============================================================
   * Relatório de Prévia com Cálculos ICMS (SEFAZ/MS) — lista de NFs por tributo
   * ============================================================ */
  function tipoDoTributo(codigo, nome) {
    const n = U.norm(nome);
    if (/EQUALIZA/.test(n) || codigo === '349') return 'EQ';
    if (/\bST\b|SUBSTITUI/.test(n) || ['333', '334', '335'].includes(codigo)) return 'ST';
    if (/DIFERENCIAL|DIFAL/.test(n)) return 'DIFAL';
    return 'OUTRO';
  }

  function parsePrevia(pdf) {
    const warnings = [];
    const text = pdf.lineText;
    const flat = text.replace(/\n/g, ' ');
    let head = text.match(/^(\d{8,14})\s+(.+?)\s+([A-ZÇÃÕÁÉÍÓÚÂÊÔ]+)\s+(\d{2}\/\d{4})\s*$/m);
    if (!head) {
      // alternativa: linha logo abaixo dos rótulos "Insc. Estadual / Razão Social / Situação / Referência"
      const ls = lines(text);
      const i = ls.findIndex(l => /Insc\.?\s*Estadual/i.test(l));
      const m2 = i >= 0 && ls[i + 1] ? ls[i + 1].match(/^(\d{8,14})\s+(.+?)\s+(\d{2}\/\d{4})$/) : null;
      if (m2) {
        const sit = m2[2].match(/\s(ATIV[AO]|SUSPENS[AO]|BAIXAD[AO]|INAPT[AO]|CANCELAD[AO]|PARALISAD[AO]|NULA)$/i);
        head = [null, m2[1], sit ? m2[2].slice(0, sit.index) : m2[2], sit ? sit[1] : '', m2[3]];
      }
    }
    let ie = head ? head[1] : U.digits(rx(flat, /Insc\.?\s*Estadual:?\s*(\d{8,14})/i));
    let razao = head ? head[2] : rx(text, /Raz[ãa]o Social:?\s*([^\n]+)/i).replace(/Situa[çc][ãa]o.*$/i, '').trim();
    const situacao = head ? head[3] : '';
    let ref = head ? head[4] : rx(flat, /Refer[êe]ncia:?\s*(\d{2}\/\d{4})/i);
    if (!ref) ref = rx(flat, /(?:^|\s)(\d{2}\/\d{4})(?:\s|$)/);
    let trib = text.match(/Tributo:?\s*\n?\s*(\d{2,4})\s*-\s*([^\n]+)/i);
    const tributoCodigo = trib ? trib[1] : '';
    const tributoNome = trib ? trib[2].trim() : '';
    const notas = [];
    const rowRe = /^(\d{1,10})\s+(\d{2}\/\d{2}\/\d{4})\s+([\d./-]{11,18})\s+([A-Z]{2})\s+(-?[\d.]*\d,\d{2})\s+(-?[\d.]*\d,\d{2})\s*$/gm;
    let m;
    while ((m = rowRe.exec(text))) {
      notas.push({ numero: String(+m[1]), dataEmissao: U.isoDate(m[2]), cnpjRemetente: U.digits(m[3]), ufRemetente: m[4], valorNF: U.num(m[5]), valorICMS: U.num(m[6]) });
    }
    const totalQtd = +rx(flat, /Quantidade de Notas:?\s*(\d+)/i) || 0;
    const tot = flat.match(/Total:?\s*(-?[\d.]*\d,\d{2})\s+(-?[\d.]*\d,\d{2})/i);
    const totalValorNF = tot ? U.num(tot[1]) : 0, totalValorICMS = tot ? U.num(tot[2]) : 0;
    if (totalQtd && totalQtd !== notas.length) warnings.push(`O relatório informa ${totalQtd} notas, mas ${notas.length} foram lidas.`);
    const somaICMS = U.round2(U.sum(notas, n => n.valorICMS));
    if (totalValorICMS && Math.abs(somaICMS - totalValorICMS) > 0.02) warnings.push(`Soma do ICMS das notas (${U.brl(somaICMS)}) difere do total do relatório (${U.brl(totalValorICMS)}).`);
    if (!tributoCodigo) warnings.push('Tributo não identificado no relatório.');
    if (!ref) warnings.push('Referência (mês/ano) não identificada.');
    return {
      kind: 'previa',
      data: {
        ie: U.digits(ie), razaoSocial: (razao || '').trim(), situacao, referencia: U.refKey(ref),
        tributoCodigo, tributoNome, tipo: tipoDoTributo(tributoCodigo, tributoNome), notas,
        totalQtd, totalValorNF, totalValorICMS,
        dataImpressao: U.isoDate(rx(flat, /Data da Impress[ãa]o:?\s*(\d{2}\/\d{2}\/\d{4})/i))
      },
      warnings
    };
  }

  /* ============================================================
   * "Dados da Nota" (detalhe por item exibido no portal — Equalização)
   * ============================================================ */
  function parseDadosNotaBlocks(pdf) {
    const allLines = [];
    pdf.pages.forEach(p => p.lines.forEach(l => allLines.push(l)));
    // separa em blocos por "Chave de Acesso"
    const blocks = [];
    let cur = null;
    allLines.forEach(l => {
      if (/Chave de Acesso/i.test(l.text)) { cur = { lines: [] }; blocks.push(cur); }
      if (!cur) { cur = { lines: [] }; blocks.push(cur); }
      cur.lines.push(l);
    });
    return blocks.filter(b => b.lines.some(l => /Chave de Acesso|N[úu]mero da Nota/i.test(l.text)))
      .map(b => parseDadosNotaBlock(b.lines));
  }

  function parseDadosNotaBlock(blockLines) {
    const warnings = [];
    const text = blockLines.map(l => l.text).join('\n');
    const flat = text.replace(/\n/g, ' ');
    const nota = {
      chave: U.digits(rx(flat, /Chave de Acesso:?\s*([\d ]{44,60})/i)).slice(0, 44),
      numero: String(+U.digits(rx(flat, /N[úu]mero da Nota:?\s*(\d+)/i)) || ''),
      cnpjRemetente: U.digits(rx(flat, /CPF\/CNPJ Remetente:?\s*([\d./-]{11,18})/i)),
      ufRemetente: rx(flat, /\bUF:?\s*([A-Z]{2})\b/),
      dataEmissao: U.isoDate(rx(flat, /Data da Emiss[ãa]o:?\s*(\d{2}\/\d{2}\/\d{4})/i)),
      valorNF: U.num(rx(flat, /Valor da Nota R\$:?\s*(-?[\d.]*\d,\d{2})/i)),
      valorICMS: U.num(rx(flat, /Valor do ICMS R\$:?\s*(-?[\d.]*\d,\d{2})/i))
    };
    if (nota.chave && nota.chave.length === 44) {
      const ck = U.parseChave(nota.chave);
      if (ck) {
        if (!nota.numero) nota.numero = ck.numero;
        if (!nota.cnpjRemetente) nota.cnpjRemetente = ck.cnpj;
        if (!nota.ufRemetente) nota.ufRemetente = ck.uf;
      }
    }
    const headerIdx = blockLines.findIndex(l => /^NCM\b/i.test(l.text) && /Descri/i.test(l.text));
    const headerText = headerIdx >= 0 ? U.norm(blockLines[headerIdx].text) : '';
    const formatoEQ = /PERCENTU/.test(headerText);
    if (headerIdx >= 0 && !formatoEQ && /MVA|CUSTO|RECOLHER|BC ICMS/.test(headerText)) {
      // memória do ICMS-ST impressa em PDF: layout com dezenas de colunas — a leitura por PDF não é confiável
      return { kind: 'desconhecido', data: { nota }, warnings: [`NF ${nota.numero || '?'}: memória do ICMS-ST em PDF não é lida com segurança. Copie a tabela no portal e use "Colar a tabela do portal" (ou salve em planilha).`] };
    }
    const linhas = [];
    let declarado = 0;
    const vis = flat.match(/Visualizando\s+\d+\s*-\s*\d+\s+de\s+(\d+)/i);
    if (vis) declarado = +vis[1];
    if (headerIdx >= 0) {
      for (let i = headerIdx + 1; i < blockLines.length; i++) {
        const l = blockLines[i];
        if (/^Visualizando/i.test(l.text)) continue;
        const m = l.text.match(/^(.*?)((?:\s*-?[\d.]*\d,\d{2,4}){8})\s*$/);
        if (!m) continue;
        const nums = m[2].trim().split(/\s+/).map(U.num);
        const left = m[1].trim();
        const first = (l.items[0] && l.items[0].str.trim()) || '';
        let ncm = '', desc = left;
        if (/^\d{4,8}$/.test(first)) { ncm = first; desc = left.slice(first.length).trim(); }
        else { const mm = left.match(/^(\d{8})\s*(.*)$/) || left.match(/^(\d{7})\s*(\D.*)$/); if (mm) { ncm = mm[1]; desc = mm[2].trim(); } }
        linhas.push({
          seq: linhas.length + 1, ncm, ncmTruncado: ncm.length > 0 && ncm.length < 8, descricao: desc,
          valorTotal: nums[0], frete: nums[1], seguro: nums[2], ipi: nums[3], outros: nums[4], desconto: nums[5], percentual: nums[6], icms: nums[7]
        });
      }
    }
    if (!linhas.length) warnings.push('Nenhum item foi lido na tabela da nota.');
    if (declarado && declarado > linhas.length) warnings.push(`A página indica ${declarado} itens, mas ${linhas.length} foram lidos — imprima todas as páginas da lista de itens.`);
    if (linhas.some(x => x.ncmTruncado)) warnings.push('NCM exibido com 7 dígitos (coluna cortada na impressão) — a comparação usará o prefixo do NCM.');
    const somaICMS = U.round2(U.sum(linhas, x => x.icms));
    if (nota.valorICMS && linhas.length && Math.abs(somaICMS - nota.valorICMS) > 0.05 && (!declarado || declarado === linhas.length)) {
      warnings.push(`Soma do ICMS dos itens (${U.brl(somaICMS)}) difere do ICMS da nota (${U.brl(nota.valorICMS)}).`);
    }
    return { kind: 'itens', data: { formato: formatoEQ ? 'EQ_DADOS_NOTA' : 'DADOS_NOTA', tipo: formatoEQ ? 'EQ' : null, nota, totalLinhasDeclarado: declarado, linhas }, warnings };
  }

  /* ============================================================
   * Tabelas (XLSX / CSV / texto colado do portal) — memória de cálculo ST e EQ
   * ============================================================ */
  const ST_COLS = [
    [/^DESCRICAO/, 'descricao'], [/^NCM/, 'ncm'], [/^CEST/, 'cest'], [/GTIN|EAN/, 'gtin'],
    [/^CST IBS/, 'cstIbs'], [/^CST\b|^CSOSN/, 'cst'], [/^CFOP/, 'cfop'],
    [/^QUANT\.? TRIB|^QTD\.? TRIB/, 'qtdTrib'], [/^QUANTIDADE|^QTD/, 'qtd'], [/^UN\.? TRIB|^UNIDADE|^UN\.?$/, 'un'],
    [/^VALOR TOTAL|^VL\.? TOTAL|^VALOR DO PRODUTO|^VALOR PRODUTO/, 'valorTotal'],
    [/^BASE CALCULO IBS|^BASE DE CALCULO IBS/, 'bcIbs'],
    [/^BASE (DE )?CALCULO ICMS|^BC ICMS PROPRI|^BASE ICMS PROPRI/, 'bcProprio'],
    [/^ALIQ\.? CRED/, 'aliqCred'], [/^ALIQUOTA IBS UF/, 'aliqIbsUf'], [/^ALIQUOTA IBS MUN/, 'aliqIbsMun'],
    [/^ALIQ\.? \(%\)|^ALIQ\.? ST|^ALIQ\.? INTERNA/, 'aliqST'], [/^ALIQ\.?$|^ALIQ\.? ICMS$|^ALIQUOTA$|^ALIQ\.? PROPRI/, 'aliqProprio'],
    [/^IPI$|^VALOR IPI$|^VL\.? IPI$/, 'ipi'], [/^DESC\.?$|^DESCONTO|^VALOR DESC/, 'desconto'],
    [/FRETE/, 'frete'], [/SEGURO/, 'seguro'], [/OUTROS/, 'outros'], [/^CUSTO FINAL/, 'custoFinal'],
    [/^MVA/, 'mva'], [/^REDUCAO BC OPERACAO PROPRIA|^RED\.? BC OP/, 'redBCProp'], [/^REDUCAO BC|^RED\.? BC/, 'redBC'],
    [/^BC PMPF/, 'bcPmpf'], [/^PMPF/, 'pmpf'], [/^BC ICMS( ST)?$|^BASE ST|^BC ST|^BASE DE CALCULO ST/, 'bcST'],
    [/^CRED\.? ADMITIDO|^CREDITO ADMITIDO|^CREDITO$/, 'credito'],
    [/^ICMS A RECOLHER|^ICMS ST$|^VALOR ICMS ST|^ICMS DEVIDO/, 'icms'],
    [/^PERCENTU/, 'percentual'], [/^VALOR ICM/, 'icmsEq'],
    [/^VALOR IBS UF/, 'valorIbsUf'], [/^VALOR IBS MUN/, 'valorIbsMun'], [/^CLASSIFICACAO TRIB/, 'cClassTrib'], [/^IND\.? DOACAO/, 'indDoacao'], [/^IBS$/, 'ibs']
  ];
  const NUM_FIELDS = ['qtd', 'qtdTrib', 'valorTotal', 'bcProprio', 'aliqProprio', 'ipi', 'desconto', 'frete', 'seguro', 'outros', 'custoFinal', 'mva', 'pmpf', 'redBC', 'bcST', 'bcPmpf', 'aliqST', 'aliqCred', 'redBCProp', 'credito', 'icms', 'percentual', 'icmsEq'];

  function mapHeader(row) {
    const map = {};
    const used = new Set();
    row.forEach((cell, idx) => {
      const n = U.norm(cell);
      if (!n) return;
      for (const [re, key] of ST_COLS) {
        if (re.test(n) && !used.has(key)) { map[idx] = key; used.add(key); break; }
      }
    });
    return map;
  }
  const isHeaderRow = row => {
    const ns = row.map(c => U.norm(c));
    return ns.some(c => /^DESCRICAO/.test(c)) && ns.some(c => /^NCM/.test(c));
  };

  /** Converte linhas (array de arrays) numa memória de cálculo de itens (ST ou EQ). */
  function parseTabelaItens(rows, origem) {
    const warnings = [];
    const hIdx = rows.findIndex(isHeaderRow);
    if (hIdx < 0) return null;
    const map = mapHeader(rows[hIdx]);
    const keys = Object.values(map);
    const isEQ = keys.includes('percentual') && !keys.includes('bcST') && !keys.includes('custoFinal');
    const isST = keys.includes('icms') || keys.includes('bcST') || keys.includes('custoFinal');
    if (!isEQ && !isST) return null;
    const linhas = [];
    for (let r = hIdx + 1; r < rows.length; r++) {
      const row = rows[r];
      if (!row || !row.some(c => String(c ?? '').trim())) continue;
      if (isHeaderRow(row)) continue;
      const o = {};
      Object.entries(map).forEach(([idx, key]) => { o[key] = row[idx]; });
      const desc = String(o.descricao ?? '').trim();
      if (!desc || /^TOTA(L|IS)\b/i.test(U.norm(desc))) continue;
      const item = { seq: linhas.length + 1, descricao: desc };
      NUM_FIELDS.forEach(k => { if (k in o) item[k] = U.num(o[k]); });
      ['ncm', 'cest', 'gtin', 'cst', 'cfop', 'un'].forEach(k => { if (k in o) item[k] = String(o[k] ?? '').trim(); });
      item.ncm = U.digits(item.ncm);
      item.cest = U.digits(item.cest);
      if (isEQ) {
        item.icms = item.icmsEq ?? item.icms ?? 0;
        delete item.icmsEq;
        item.ncmTruncado = item.ncm.length > 0 && item.ncm.length < 8;
      } else {
        if (!item.custoFinal && item.valorTotal) item.custoFinal = U.round2(item.valorTotal + (item.ipi || 0) + (item.frete || 0) + (item.seguro || 0) + (item.outros || 0) - (item.desconto || 0));
        if (!item.bcProprio) item.bcProprio = item.valorTotal || 0;
      }
      linhas.push(item);
    }
    if (!linhas.length) warnings.push('Nenhum item encontrado abaixo do cabeçalho.');
    if (isST) {
      const semIcms = linhas.filter(l => !('icms' in l));
      if (semIcms.length) warnings.push('Coluna "ICMS A RECOLHER" não encontrada.');
    }
    return { formato: isEQ ? 'EQ_TABELA' : 'ST_TABELA', tipo: isEQ ? 'EQ' : 'ST', linhas, warnings, origem };
  }

  function parseCSVText(text) {
    const first = text.split(/\r?\n/).find(l => l.trim()) || '';
    const delim = first.includes('\t') ? '\t' : (first.split(';').length > first.split(',').length ? ';' : ',');
    const rows = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += ch;
      } else if (ch === '"' && cell === '') q = true;
      else if (ch === delim) { row.push(cell); cell = ''; }
      else if (ch === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  /** Texto colado do portal (tabela copiada do navegador) */
  function parseColagem(text, opts = {}) {
    const rows = String(text || '').split(/\r?\n/).map(l => l.split('\t'));
    let res = parseTabelaItens(rows, 'colagem');
    if (!res) {
      // tenta separar por 2+ espaços
      const rows2 = String(text || '').split(/\r?\n/).map(l => l.split(/\s{2,}/));
      res = parseTabelaItens(rows2, 'colagem');
    }
    if (!res) return null;
    const nota = { numero: String(+U.digits(opts.numero) || ''), cnpjRemetente: U.digits(opts.cnpjRemetente), ufRemetente: opts.ufRemetente || '', chave: '', dataEmissao: '', valorNF: 0, valorICMS: 0 };
    return { kind: 'itens', data: { formato: res.formato, tipo: opts.tipo || res.tipo, nota, linhas: res.linhas, totalLinhasDeclarado: 0 }, warnings: res.warnings };
  }

  /* ============================================================
   * XML da NF-e
   * ============================================================ */
  function parseNFeXML(text) {
    const warnings = [];
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) return null;
    const byName = (el, name) => {
      if (!el) return null;
      const all = el.getElementsByTagName('*');
      for (let i = 0; i < all.length; i++) if (all[i].localName === name) return all[i];
      return null;
    };
    const val = (el, name) => { const e = byName(el, name); return e ? e.textContent.trim() : ''; };
    const child = (el, name) => { if (!el) return null; for (const c of el.children) if (c.localName === name) return c; return null; };
    const inf = byName(doc, 'infNFe');
    if (!inf) return null;
    const ide = byName(inf, 'ide'), emit = byName(inf, 'emit'), dest = byName(inf, 'dest'), tot = byName(inf, 'ICMSTot');
    const chave = U.digits(inf.getAttribute('Id') || '') || U.digits(val(doc, 'chNFe'));
    const itens = [];
    const dets = [];
    const all = inf.getElementsByTagName('*');
    for (let i = 0; i < all.length; i++) if (all[i].localName === 'det') dets.push(all[i]);
    dets.forEach(det => {
      const prod = child(det, 'prod');
      const imp = child(det, 'imposto');
      const icmsWrap = child(imp, 'ICMS');
      const g = icmsWrap && icmsWrap.children[0];
      const ipi = child(imp, 'IPI');
      const numXml = (el, name) => { const v = val(el, name); return v ? parseFloat(v) || 0 : 0; };
      itens.push({
        nItem: det.getAttribute('nItem'),
        cProd: val(prod, 'cProd'), gtin: val(prod, 'cEANTrib') || val(prod, 'cEAN'), descricao: val(prod, 'xProd'),
        ncm: val(prod, 'NCM'), cest: val(prod, 'CEST'), cfop: val(prod, 'CFOP'), un: val(prod, 'uCom'),
        qtd: numXml(prod, 'qCom'), valorTotal: numXml(prod, 'vProd'), frete: numXml(prod, 'vFrete'), seguro: numXml(prod, 'vSeg'),
        desconto: numXml(prod, 'vDesc'), outros: numXml(prod, 'vOutro'), ipi: ipi ? numXml(ipi, 'vIPI') : 0,
        grupoICMS: g ? g.localName : '', orig: g ? val(g, 'orig') : '', cst: g ? val(g, 'CST') : '', csosn: g ? val(g, 'CSOSN') : '',
        vBC: g ? numXml(g, 'vBC') : 0, pICMS: g ? numXml(g, 'pICMS') : 0, vICMS: g ? numXml(g, 'vICMS') : 0,
        pMVAST: g ? numXml(g, 'pMVAST') : 0, vBCST: g ? numXml(g, 'vBCST') : 0, pICMSST: g ? numXml(g, 'pICMSST') : 0,
        vICMSST: g ? numXml(g, 'vICMSST') : 0, vFCPST: g ? numXml(g, 'vFCPST') : 0, vICMSSTRet: g ? numXml(g, 'vICMSSTRet') : 0
      });
    });
    const numT = name => { const v = val(tot, name); return v ? parseFloat(v) || 0 : 0; };
    const data = {
      chave, numero: String(+val(ide, 'nNF') || ''), serie: val(ide, 'serie'),
      dataEmissao: (val(ide, 'dhEmi') || val(ide, 'dEmi')).slice(0, 10),
      emitente: { cnpj: U.digits(val(emit, 'CNPJ') || val(emit, 'CPF')), nome: val(emit, 'xNome'), uf: val(byName(emit, 'enderEmit'), 'UF') },
      destinatario: { cnpj: U.digits(val(dest, 'CNPJ') || val(dest, 'CPF')), nome: val(dest, 'xNome'), uf: val(byName(dest, 'enderDest'), 'UF'), ie: val(dest, 'IE') },
      valorNF: numT('vNF'),
      totais: { vProd: numT('vProd'), vICMS: numT('vICMS'), vST: numT('vST'), vFCPST: numT('vFCPST'), vFrete: numT('vFrete'), vSeg: numT('vSeg'), vDesc: numT('vDesc'), vOutro: numT('vOutro'), vIPI: numT('vIPI') },
      infCpl: val(inf, 'infCpl'),
      itens
    };
    if (!itens.length) warnings.push('XML sem itens.');
    return { kind: 'nfe', data, warnings };
  }

  /* ============================================================
   * Entrada principal: um File → lista de documentos
   * ============================================================ */
  async function parseFile(file) {
    const name = file.name || 'arquivo';
    const ext = (name.match(/\.([^.]+)$/) || [, ''])[1].toLowerCase();
    const buf = await file.arrayBuffer();
    const hash = await U.hashBuffer(buf);
    const base = { fileName: name, hash, size: file.size };
    const out = [];
    try {
      if (ext === 'pdf') {
        const pdf = await global.RST_PDF.extract(buf);
        const t = pdf.lineText;
        if (/CADASTRO NACIONAL DA PESSOA JUR[IÍ]DICA/i.test(t) && /NOME EMPRESARIAL/i.test(t)) out.push(parseCartaoCNPJ(pdf));
        else if (/Relat[óo]rio de Pr[ée]via/i.test(t) || (/Tributo:/i.test(t) && /Quantidade de Notas/i.test(t))) out.push(parsePrevia(pdf));
        else if (/Chave de Acesso/i.test(t) && /\bNCM\b/i.test(t)) parseDadosNotaBlocks(pdf).forEach(d => out.push(d));
        else out.push({ kind: 'desconhecido', data: { amostra: t.slice(0, 300) }, warnings: ['Formato de PDF não reconhecido. Envie o Relatório de Prévia, a tela "Dados da Nota", a memória de cálculo em planilha ou o cartão CNPJ.'] });
      } else if (['xlsx', 'xlsm', 'xls', 'ods'].includes(ext)) {
        if (!global.XLSX) throw new Error('Biblioteca de planilhas não carregada (verifique a conexão).');
        const wb = global.XLSX.read(new Uint8Array(buf), { type: 'array' });
        let found = 0;
        wb.SheetNames.forEach(sn => {
          const rows = global.XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, defval: '' });
          const res = parseTabelaItens(rows, 'planilha');
          if (!res) return;
          found++;
          const numSheet = /\d{3,9}/.test(sn) ? String(+sn.match(/\d{3,9}/)[0]) : '';
          const numero = (wb.SheetNames.length > 1 && numSheet) ? numSheet : (numeroDoNomeArquivo(name) || numSheet);
          out.push({ kind: 'itens', data: { formato: res.formato, tipo: res.tipo, nota: { numero, chave: '', cnpjRemetente: '', ufRemetente: '', dataEmissao: '', valorNF: 0, valorICMS: 0 }, linhas: res.linhas, totalLinhasDeclarado: 0, planilha: sn }, warnings: res.warnings.concat(numero ? [] : ['Número da NF não identificado no nome do arquivo — informe-o no vínculo.']) });
        });
        if (!found) out.push({ kind: 'desconhecido', data: {}, warnings: ['Planilha sem o cabeçalho esperado (DESCRIÇÃO, NCM/SH, ...).'] });
      } else if (['csv', 'txt', 'tsv'].includes(ext)) {
        const text = new TextDecoder('utf-8').decode(buf);
        const res = parseTabelaItens(parseCSVText(text), 'csv');
        if (res) {
          const numero = numeroDoNomeArquivo(name);
          out.push({ kind: 'itens', data: { formato: res.formato, tipo: res.tipo, nota: { numero, chave: '', cnpjRemetente: '', ufRemetente: '', dataEmissao: '', valorNF: 0, valorICMS: 0 }, linhas: res.linhas, totalLinhasDeclarado: 0 }, warnings: res.warnings });
        } else out.push({ kind: 'desconhecido', data: {}, warnings: ['Arquivo de texto sem o cabeçalho esperado.'] });
      } else if (ext === 'xml') {
        const text = new TextDecoder('utf-8').decode(buf);
        const res = parseNFeXML(text);
        out.push(res || { kind: 'desconhecido', data: {}, warnings: ['XML não reconhecido como NF-e.'] });
      } else {
        out.push({ kind: 'desconhecido', data: {}, warnings: ['Tipo de arquivo não suportado: .' + ext] });
      }
    } catch (e) {
      out.push({ kind: 'erro', data: {}, warnings: ['Falha ao ler o arquivo: ' + (e && e.message ? e.message : e)] });
    }
    return out.map((d, i) => Object.assign({}, base, d, { part: i }));
  }

  global.RST_PARSERS = { parseFile, parseColagem, parsePrevia, parseCartaoCNPJ, parseDadosNotaBlocks, parseTabelaItens, parseNFeXML, parseCSVText, parseCNAEs, numeroDoNomeArquivo, NUM_RE };
})(window);
