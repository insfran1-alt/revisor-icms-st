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
  const numerosDoNome = name => (String(name || '').replace(/\.[^.]+$/, '').match(/\d+/g) || []).map(x => String(+x));

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
   * "Dados da Nota" — tela do portal com os itens da NF (Equalização), em páginas de 15 itens
   * ("Visualizando 1 - 15 de 85"). Chega em PDF (uma página por arquivo ou várias num só),
   * em planilha (páginas coladas uma abaixo da outra) ou colada direto no app.
   * As páginas da mesma NF são juntadas pela numeração.
   * ============================================================ */
  const VIS_RE = /Visualizando\s+(\d+)\s*-\s*(\d+)\s+de\s+(\d+)/i;
  const META_RE = /Chave de Acesso|N[úu]mero da Nota|CPF\/CNPJ Remetente|Data da Emiss[ãa]o|Valor da Nota|Valor do ICMS/i;
  const notaVazia = () => ({ numero: '', chave: '', cnpjRemetente: '', ufRemetente: '', dataEmissao: '', valorNF: 0, valorICMS: 0 });

  /** Dados da NF no cabeçalho da tela "Dados da Nota". */
  function notaDoTexto(flat) {
    const nota = {
      chave: U.digits(rx(flat, /Chave de Acesso:?\s*([\d ]{44,60})/i)).slice(0, 44),
      numero: String(+U.digits(rx(flat, /N[úu]mero da Nota:?\s*(\d+)/i)) || ''),
      cnpjRemetente: U.digits(rx(flat, /CPF\/CNPJ Remetente:?\s*([\d./-]{11,18})/i)),
      ufRemetente: rx(flat, /\bUF:?\s*([A-Z]{2})\b/),
      dataEmissao: U.isoDate(rx(flat, /Data da Emiss[ãa]o:?\s*(\d{2}\/\d{2}\/\d{4})/i)),
      valorNF: U.num(rx(flat, /Valor da Nota R\$:?\s*(-?[\d.]*\d,\d{2})/i)),
      valorICMS: U.num(rx(flat, /Valor do ICMS R\$:?\s*(-?[\d.]*\d,\d{2})/i))
    };
    const ck = nota.chave.length === 44 ? U.parseChave(nota.chave) : null;
    if (ck) {
      if (!nota.numero) nota.numero = ck.numero;
      if (!nota.cnpjRemetente) nota.cnpjRemetente = ck.cnpj;
      if (!nota.ufRemetente) nota.ufRemetente = ck.uf;
    }
    return nota;
  }

  /** Junta as páginas de uma NF: ordena pela numeração, ignora página repetida, marca a posição de cada item e aponta o que falta. */
  function juntarPaginas(paginas, warnings, avisarFaltantes) {
    const comVis = paginas.filter(p => p.vis).sort((a, b) => a.vis.de - b.vis.de);
    const semVis = paginas.filter(p => !p.vis);
    const vezes = new Map();
    const usadas = [];
    comVis.forEach(p => {
      const k = `${p.vis.de}–${p.vis.ate}`;
      vezes.set(k, (vezes.get(k) || 0) + 1);
      if (vezes.get(k) === 1) usadas.push(p);
    });
    vezes.forEach((n, k) => { if (n > 1) warnings.push(`A página com os itens ${k} aparece ${n} vezes — foi considerada uma vez só.`); });
    const total = comVis.reduce((m, p) => Math.max(m, p.vis.total || 0), 0);
    const cobertos = new Set();
    const linhas = [];
    usadas.forEach(p => {
      const esperado = p.vis.ate - p.vis.de + 1;
      if (p.linhas.length !== esperado) warnings.push(`Página com os itens ${p.vis.de}–${p.vis.ate}: ${p.linhas.length} de ${esperado} itens lidos.`);
      p.linhas.forEach((l, i) => {
        const pos = p.vis.de + i;
        if (pos <= p.vis.ate) {
          if (cobertos.has(pos)) return; // item já lido em outra página (páginas sobrepostas)
          cobertos.add(pos);
          l.pos = pos;
        }
        linhas.push(l);
      });
    });
    const semPos = [];
    semVis.forEach(p => p.linhas.forEach(l => { linhas.push(l); semPos.push(l); }));
    // página sem "Visualizando" (só o cabeçalho da tabela) junto de páginas numeradas: se a quantidade de itens
    // fecha exatamente com o que falta, é a continuação da lista
    if (total && semPos.length) {
      const livres = [];
      for (let i = 1; i <= total; i++) if (!cobertos.has(i)) livres.push(i);
      if (livres.length === semPos.length) semPos.forEach((l, i) => { l.pos = livres[i]; cobertos.add(l.pos); });
    }
    if (total) linhas.sort((a, b) => (a.pos || 1e9) - (b.pos || 1e9));
    linhas.forEach((l, i) => { l.seq = i + 1; });
    const faltam = total ? U.faixasFaltantes(cobertos, total) : [];
    if (avisarFaltantes && faltam.length && !semPos.length) {
      warnings.push(`Faltam os itens ${U.listaTxt(faltam)} de ${total} — copie também as páginas que faltam da tela "Dados da Nota".`);
    }
    return { linhas, total, faltam, paginas: usadas.map(p => ({ de: p.vis.de, ate: p.vis.ate })) };
  }

  /** Agrupa as páginas por NF (pelo cabeçalho); página sem cabeçalho continua a NF anterior. */
  function agruparPorNota(paginas) {
    const grupos = [];
    let ultimo = null;
    paginas.forEach(p => {
      const n = p.nota || notaVazia();
      let g = null;
      if (n.numero) {
        g = grupos.find(x => x.nota.numero === n.numero && (!x.nota.cnpjRemetente || !n.cnpjRemetente || x.nota.cnpjRemetente === n.cnpjRemetente)) || null;
        if (!g && ultimo && !ultimo.nota.numero) g = ultimo;
      } else g = ultimo;
      if (!g) { g = { nota: notaVazia(), paginas: [] }; grupos.push(g); }
      Object.keys(n).forEach(k => { if (!g.nota[k] && n[k]) g.nota[k] = n[k]; });
      g.paginas.push(p);
      ultimo = g;
    });
    return grupos;
  }

  /** Um resultado por NF: itens na ordem da tela, total de itens informado, páginas lidas e avisos. */
  function montarNotas(paginas, origem) {
    return agruparPorNota(paginas).map(g => {
      const warnings = [];
      const nota = g.nota;
      const isEQ = g.paginas.some(p => p.isEQ);
      const isST = !isEQ && g.paginas.some(p => p.isST);
      const j = juntarPaginas(g.paginas, warnings, origem !== 'pdf');
      const linhas = j.linhas;
      if (!linhas.length) warnings.push('Nenhum item foi lido na tabela da nota.');
      if (isEQ && linhas.some(x => x.ncmTruncado)) warnings.push('NCM com 7 dígitos (cortado na tela ou na impressão) — a comparação usará o prefixo do NCM.');
      if (isST && linhas.some(l => !('icms' in l))) warnings.push('Coluna "ICMS A RECOLHER" não encontrada.');
      const soma = U.round2(U.sum(linhas, x => x.icms));
      // tolerância de arredondamento: cada item vem arredondado ao centavo
      if (nota.valorICMS && linhas.length && !j.faltam.length && Math.abs(soma - nota.valorICMS) > Math.max(0.05, linhas.length * 0.003)) {
        warnings.push(`Soma do ICMS dos itens (${U.brl(soma)}) difere do ICMS da nota (${U.brl(nota.valorICMS)}).`);
      }
      const comCabecalho = !!(nota.numero || nota.chave);
      const formato = isEQ ? (comCabecalho ? 'EQ_DADOS_NOTA' : 'EQ_TABELA') : isST ? 'ST_TABELA' : 'DADOS_NOTA';
      return { formato, tipo: isEQ ? 'EQ' : isST ? 'ST' : null, nota, linhas, totalLinhasDeclarado: j.total, paginas: j.paginas, warnings };
    });
  }

  /** Uma página impressa da tela "Dados da Nota" (PDF). */
  function paginaDoPDF(blockLines) {
    const text = blockLines.map(l => l.text).join('\n');
    const flat = text.replace(/\n/g, ' ');
    const nota = notaDoTexto(flat);
    const headerIdx = blockLines.findIndex(l => /^NCM\b/i.test(l.text) && /Descri/i.test(l.text));
    const headerText = headerIdx >= 0 ? U.norm(blockLines[headerIdx].text) : '';
    const isEQ = /PERCENTU/.test(headerText);
    if (headerIdx >= 0 && !isEQ && /MVA|CUSTO|RECOLHER|BC ICMS/.test(headerText)) {
      // memória do ICMS-ST impressa em PDF: layout com dezenas de colunas — a leitura por PDF não é confiável
      return { erro: { kind: 'desconhecido', data: { nota }, warnings: [`NF ${nota.numero || '?'}: memória do ICMS-ST em PDF não é lida com segurança. Copie a tabela no portal e use "Colar a tabela do portal" (ou salve em planilha).`] } };
    }
    const v = flat.match(VIS_RE);
    const linhas = [];
    if (headerIdx >= 0) {
      for (let i = headerIdx + 1; i < blockLines.length; i++) {
        const l = blockLines[i];
        if (VIS_RE.test(l.text)) continue;
        const m = l.text.match(/^(.*?)((?:\s*-?[\d.]*\d,\d{2,4}){8})\s*$/);
        if (!m) continue;
        const nums = m[2].trim().split(/\s+/).map(U.num);
        const left = m[1].trim();
        const first = (l.items[0] && l.items[0].str.trim()) || '';
        let ncm = '', desc = left;
        if (/^\d{4,8}$/.test(first)) { ncm = first; desc = left.slice(first.length).trim(); }
        else { const mm = left.match(/^(\d{8})\s*(.*)$/) || left.match(/^(\d{7})\s*(\D.*)$/); if (mm) { ncm = mm[1]; desc = mm[2].trim(); } }
        linhas.push({
          ncm, ncmTruncado: ncm.length > 0 && ncm.length < 8, descricao: desc,
          valorTotal: nums[0], frete: nums[1], seguro: nums[2], ipi: nums[3], outros: nums[4], desconto: nums[5], percentual: nums[6], icms: nums[7]
        });
      }
    }
    return { nota, vis: v ? { de: +v[1], ate: +v[2], total: +v[3] } : null, linhas, isEQ, isST: false };
  }

  function parseDadosNotaBlocks(pdf) {
    const allLines = [];
    pdf.pages.forEach(p => p.lines.forEach(l => allLines.push(l)));
    // separa em blocos por "Chave de Acesso" (cada página impressa repete o cabeçalho da NF)
    const blocks = [];
    let cur = null;
    allLines.forEach(l => {
      if (/Chave de Acesso/i.test(l.text)) { cur = { lines: [] }; blocks.push(cur); }
      if (!cur) { cur = { lines: [] }; blocks.push(cur); }
      cur.lines.push(l);
    });
    const erros = [], paginas = [];
    blocks.filter(b => b.lines.some(l => /Chave de Acesso|N[úu]mero da Nota/i.test(l.text))).forEach(b => {
      const p = paginaDoPDF(b.lines);
      if (p.erro) erros.push(p.erro); else paginas.push(p);
    });
    return erros.concat(montarNotas(paginas, 'pdf').map(r => ({
      kind: 'itens',
      data: { formato: r.formato, tipo: r.tipo, nota: r.nota, totalLinhasDeclarado: r.totalLinhasDeclarado, paginas: r.paginas, linhas: r.linhas, numeroNoConteudo: !!r.nota.numero },
      warnings: r.warnings
    })));
  }

  /* ============================================================
   * Tabelas (planilha, CSV ou texto colado do portal) — memória de cálculo ST e EQ
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
  const ehNumero = v => typeof v === 'number' ? isFinite(v) : /^-?\(?(R\$)?\s*-?[\d.]*\d(,\d+)?%?\)?$/i.test(String(v ?? '').trim());
  function tipoDoCabecalho(map) {
    const keys = Object.values(map);
    const isEQ = keys.includes('percentual') && !keys.includes('bcST') && !keys.includes('custoFinal');
    const isST = !isEQ && (keys.includes('icms') || keys.includes('bcST') || keys.includes('custoFinal'));
    return { isEQ, isST };
  }

  /** Converte uma linha da tabela em item — ou null, se não for linha de item (cabeçalho da NF, paginação, total…). */
  function itemDaLinha(row, map, isEQ) {
    const o = {};
    Object.entries(map).forEach(([idx, key]) => { o[key] = row[idx]; });
    const desc = String(o.descricao ?? '').trim();
    if (!desc || /^TOTA(L|IS)\b/.test(U.norm(desc))) return null;
    const txt = row.map(c => String(c ?? '')).join('  ');
    if (META_RE.test(txt) || VIS_RE.test(txt)) return null;
    const comValor = isEQ ? ['valorTotal', 'icmsEq', 'icms'] : ['valorTotal', 'icms', 'bcST', 'custoFinal'];
    if (!comValor.some(k => k in o && ehNumero(o[k]))) return null;
    const item = { descricao: desc };
    NUM_FIELDS.forEach(k => { if (k in o) item[k] = U.num(o[k]); });
    ['ncm', 'cest', 'gtin', 'cst', 'cfop', 'un'].forEach(k => { if (k in o) item[k] = String(o[k] ?? '').trim(); });
    // código gravado como número pela planilha perde o zero à esquerda
    if (typeof o.ncm === 'number' && o.ncm > 0) item.ncm = String(o.ncm).padStart(8, '0');
    if (typeof o.cest === 'number' && o.cest > 0) item.cest = String(o.cest).padStart(7, '0');
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
    return item;
  }

  /** Separa as linhas em páginas: cabeçalho da NF, "Visualizando a - b de N", cabeçalho da tabela e itens. */
  function paginasDeLinhas(rows) {
    const paginas = [];
    let cur = null;
    const nova = () => {
      const ant = cur;
      cur = { meta: [], vis: null, map: ant ? ant.map : null, isEQ: ant ? ant.isEQ : false, isST: ant ? ant.isST : false, linhas: [] };
      paginas.push(cur);
    };
    (rows || []).forEach(row => {
      if (!Array.isArray(row)) return;
      const cells = row.map(c => (typeof c === 'string' ? c.trim() : c));
      const txt = cells.map(c => String(c ?? '').trim()).filter(Boolean).join('  ');
      if (!txt) return;
      const titulo = /^Dados da Nota$/i.test(txt);
      const meta = META_RE.test(txt);
      const vis = txt.match(VIS_RE);
      const cab = isHeaderRow(cells);
      if (!cur || ((titulo || meta || vis || cab) && cur.linhas.length)) nova();
      if (titulo) return;
      if (meta) { cur.meta.push(txt); return; }
      if (vis) { cur.vis = { de: +vis[1], ate: +vis[2], total: +vis[3] }; return; }
      if (cab) { cur.map = mapHeader(cells); Object.assign(cur, tipoDoCabecalho(cur.map)); return; }
      if (!cur.map) return;
      const item = itemDaLinha(cells, cur.map, cur.isEQ);
      if (item) cur.linhas.push(item);
    });
    paginas.forEach(p => { p.nota = notaDoTexto(p.meta.join('  ')); });
    return paginas.filter(p => p.map && (p.isEQ || p.isST));
  }

  /** Lê uma tabela (planilha, CSV ou colagem) e devolve um resultado por NF encontrada. */
  function lerTabela(rows) {
    return montarNotas(paginasDeLinhas(rows), 'tabela');
  }
  /** Primeira NF da tabela (ou null). */
  function parseTabelaItens(rows) {
    return lerTabela(rows)[0] || null;
  }

  function docDaTabela(r, numeroAlternativo, extra) {
    const nota = Object.assign(notaVazia(), r.nota);
    const numeroNoConteudo = !!nota.numero;
    if (!nota.numero) nota.numero = numeroAlternativo || '';
    const warnings = r.warnings.slice();
    if (!nota.numero) warnings.push('Número da NF não identificado no nome do arquivo — informe-o no vínculo.');
    return {
      kind: 'itens',
      data: Object.assign({ formato: r.formato, tipo: r.tipo, nota, linhas: r.linhas, totalLinhasDeclarado: r.totalLinhasDeclarado || 0, paginas: r.paginas || [], numeroNoConteudo }, extra || {}),
      warnings
    };
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

  /** Texto colado do portal (tabela copiada do navegador): um documento por NF encontrada. */
  function parseColagem(text, opts = {}) {
    const ls = String(text || '').split(/\r?\n/);
    let res = lerTabela(ls.map(l => l.split('\t')));
    if (!res.length) res = lerTabela(ls.map(l => l.split(/\s{2,}/))); // tenta separar por 2+ espaços
    return res.map(r => {
      const nota = Object.assign(notaVazia(), r.nota);
      const numeroNoConteudo = !!nota.numero;
      if (!nota.numero) nota.numero = String(+U.digits(opts.numero) || '');
      if (!nota.cnpjRemetente) nota.cnpjRemetente = U.digits(opts.cnpjRemetente);
      if (!nota.ufRemetente) nota.ufRemetente = opts.ufRemetente || '';
      return { kind: 'itens', data: { formato: r.formato, tipo: r.tipo || opts.tipo || null, nota, linhas: r.linhas, totalLinhasDeclarado: r.totalLinhasDeclarado || 0, paginas: r.paginas || [], numeroNoConteudo }, warnings: r.warnings };
    });
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
        wb.SheetNames.forEach(sn => {
          const rows = global.XLSX.utils.sheet_to_json(wb.Sheets[sn], { header: 1, raw: true, defval: '' });
          const numSheet = /\d{3,9}/.test(sn) ? String(+sn.match(/\d{3,9}/)[0]) : '';
          const numAlt = (wb.SheetNames.length > 1 && numSheet) ? numSheet : (numeroDoNomeArquivo(name) || numSheet);
          lerTabela(rows).forEach(r => out.push(docDaTabela(r, numAlt, { planilha: sn })));
        });
        if (!out.length) out.push({ kind: 'desconhecido', data: {}, warnings: ['Planilha sem o cabeçalho esperado (DESCRIÇÃO, NCM/SH… ou a tela "Dados da Nota" com NCM, Descrição, Percentual…).'] });
      } else if (['csv', 'txt', 'tsv'].includes(ext)) {
        const text = new TextDecoder('utf-8').decode(buf);
        lerTabela(parseCSVText(text)).forEach(r => out.push(docDaTabela(r, numeroDoNomeArquivo(name))));
        if (!out.length) out.push({ kind: 'desconhecido', data: {}, warnings: ['Arquivo de texto sem o cabeçalho esperado.'] });
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
    // confere o número da NF lido no conteúdo com os números do nome do arquivo
    const its = out.filter(d => d.kind === 'itens');
    const nums = numerosDoNome(name);
    if (its.length === 1 && nums.length && its[0].data.numeroNoConteudo && !nums.includes(its[0].data.nota.numero)) {
      its[0].warnings = (its[0].warnings || []).concat(`O nome do arquivo não traz o número da NF lida no conteúdo (${its[0].data.nota.numero}) — confira se o arquivo é da nota certa.`);
    }
    return out.map((d, i) => Object.assign({}, base, d, { part: i }));
  }

  global.RST_PARSERS = { parseFile, parseColagem, parsePrevia, parseCartaoCNPJ, parseDadosNotaBlocks, parseTabelaItens, lerTabela, parseNFeXML, parseCSVText, parseCNAEs, numeroDoNomeArquivo, NUM_RE };
})(window);
