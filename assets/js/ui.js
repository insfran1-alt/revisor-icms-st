/* Revisor ICMS-ST — interface */
(function (global) {
  'use strict';
  const U = global.RST_U, L = global.RST_LEGAL, E = global.RST_ENGINE, P = global.RST_PARSERS, ST = global.RST_STORE, R = global.RST_REPORTS;
  const $ = (s, el = document) => el.querySelector(s);
  const h = U.esc;

  /* ---------- Ícones ---------- */
  const ICONS = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    upload: '<path d="M12 16V4m0 0l-4 4m4-4l4 4"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
    checklist: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5L7.5 11M3.5 18l1.5 1.5L7.5 17"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
    building: '<path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h2a2 2 0 0 1 2 2v10M3 21h18M8 7h4M8 11h4M8 15h4"/>',
    sliders: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5M12 17h.01"/>',
    download: '<path d="M12 4v12m0 0l-4-4m4 4l4-4"/><path d="M4 20h16"/>',
    printer: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
    copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    alert: '<path d="M12 3l9.5 17H2.5z"/><path d="M12 10v4M12 17h.01"/>',
    check: '<path d="M5 12l5 5L20 7"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h3"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    logo: '<path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h4"/><path d="M13 3v5h5v2"/><circle cx="16.5" cy="16.5" r="3.5"/><path d="M19 19l2.5 2.5"/>',
    save: '<path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z"/><path d="M8 3v5h7M8 21v-7h8v7"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>'
  };
  const ic = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[n] || ''}</svg>`;

  const VIEWS = [
    { id: 'painel', nome: 'Painel', icon: 'grid' },
    { id: 'importar', nome: 'Importar', icon: 'upload' },
    { id: 'revisao', nome: 'Revisão', icon: 'checklist' },
    { id: 'notas', nome: 'Notas e itens', icon: 'file' },
    { id: 'empresas', nome: 'Empresas', icon: 'building' },
    { id: 'tabelas', nome: 'Tabelas e regras', icon: 'sliders' },
    { id: 'ajuda', nome: 'Como usar', icon: 'help' }
  ];
  const TIPO_DOC = { previa: 'Relatório de prévia', itens: 'Memória de cálculo', cnpj: 'Cartão CNPJ', nfe: 'XML da NF-e' };
  const PAGE = 50;

  const App = { state: null, model: null, ui: null, sel: new Set(), lastImport: null, reqOpts: null };

  function defaultUI() {
    return {
      view: 'painel', empresa: '', ref: '',
      rev: { q: '', tipo: '', forca: ['forte', 'moderada', 'atencao'], regra: '', status: '', uf: '', min: '', page: 1, sort: 'forca' },
      notas: { q: '', tipo: '', achados: false, page: 1 },
      docs: { kind: '' }
    };
  }

  /* ---------- Helpers ---------- */
  const nomeCurto = c => c ? (c.nomeFantasia || c.razaoSocial || 'Empresa sem nome') : 'Sem empresa';
  const inScope = x => (!App.ui.empresa || x.companyId === App.ui.empresa) && (!App.ui.ref || x.referencia === App.ui.ref);
  const tipoPill = (tipo, cod) => `<span class="pill ${tipo === 'ST' ? 'st' : tipo === 'EQ' ? 'eq' : 'neutro'}">${tipo === 'ST' ? 'ST' : tipo === 'EQ' ? 'EQ' : h(tipo)}${cod ? ' · ' + h(cod) : ''}</span>`;
  const forcaPill = f => `<span class="pill ${f}"><span class="dot ${f}"></span>${L.FORCAS[f].nome}</span>`;
  const statusPill = s => `<span class="pill ${s === 'deferido' ? 'ok' : s === 'indeferido' ? 'forte' : s === 'solicitado' || s === 'pedir' ? 'atencao' : 'neutro'}">${h(L.STATUS[s] || s)}</span>`;
  const ncmCest = (ncm, cest) => [ncm ? 'NCM ' + U.fmtNCM(ncm) : '', U.fmtCEST(cest) ? 'CEST ' + U.fmtCEST(cest) : ''].filter(Boolean).join(' · ');
  const opt = (v, label, cur) => `<option value="${h(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${h(label)}</option>`;

  function toast(msg, type = '', ms = 4200) {
    const el = document.createElement('div');
    el.className = 'toast ' + type;
    el.innerHTML = `${ic(type === 'err' ? 'alert' : type === 'ok' ? 'check' : 'info')}<div>${msg}</div>`;
    $('#toasts').appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 320); }, ms);
  }

  const savePrefs = U.debounce(() => ST.prefSet('ui', { view: App.ui.view, empresa: App.ui.empresa, ref: App.ui.ref, rev: Object.assign({}, App.ui.rev, { page: 1 }), notas: Object.assign({}, App.ui.notas, { page: 1 }) }), 300);
  const persist = U.debounce(() => ST.save(App.state).then(updateStorageInfo), 350);

  function recompute() {
    try { App.model = E.build(App.state); }
    catch (e) { console.error(e); toast('Erro ao analisar os dados: ' + h(e.message), 'err', 8000); App.model = E.build(ST.estadoInicial()); }
    if (App.ui.empresa && !App.model.companies.has(App.ui.empresa)) App.ui.empresa = '';
  }
  function commit(opts = {}) {
    recompute();
    persist();
    if (opts.render !== false) renderAll();
  }

  /* ---------- Tema ---------- */
  function applyTheme(t) {
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
    else document.documentElement.removeAttribute('data-theme');
  }
  function effectiveTheme() {
    const t = document.documentElement.getAttribute('data-theme');
    if (t) return t;
    return global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  /* ============================================================
   * Renderização principal
   * ============================================================ */
  function renderAll() {
    renderNav();
    renderScope();
    const v = VIEWS.find(x => x.id === App.ui.view) || VIEWS[0];
    $('#view-title').textContent = v.nome;
    document.title = `${v.nome} · Revisor ICMS-ST`;
    const fn = { painel: viewPainel, importar: viewImportar, revisao: viewRevisao, notas: viewNotas, empresas: viewEmpresas, tabelas: viewTabelas, ajuda: viewAjuda }[v.id];
    $('#view').innerHTML = fn();
    if (v.id === 'revisao') renderRevResults();
    if (v.id === 'notas') renderNotasResults();
    updateStorageInfo();
  }

  function renderNav() {
    const n = App.model.findings.filter(f => inScope(f) && f.forca === 'forte' && f.status === 'novo' && f.valorRevisar > 0).length;
    $('#nav').innerHTML = VIEWS.map(v => `<button type="button" data-view="${v.id}" class="${App.ui.view === v.id ? 'active' : ''}" ${App.ui.view === v.id ? 'aria-current="page"' : ''} title="${h(v.nome)}">${ic(v.icon)}<span class="lbl">${h(v.nome)}</span>${v.id === 'revisao' && n ? `<span class="count" title="Achados fortes a analisar">${n}</span>` : ''}</button>`).join('');
  }

  function renderScope() {
    const comps = [...App.model.companies.values()].sort((a, b) => nomeCurto(a).localeCompare(nomeCurto(b)));
    $('#scope-empresa').innerHTML = opt('', 'Todas as empresas', App.ui.empresa) + comps.map(c => opt(c.id, nomeCurto(c), App.ui.empresa)).join('');
    const refs = U.uniq(App.model.charges.filter(c => !App.ui.empresa || c.companyId === App.ui.empresa).map(c => c.referencia).filter(Boolean)).sort().reverse();
    if (App.ui.ref && !refs.includes(App.ui.ref)) refs.unshift(App.ui.ref);
    $('#scope-ref').innerHTML = opt('', 'Todas as referências', App.ui.ref) + refs.map(r => opt(r, 'Ref. ' + U.refLabel(r), App.ui.ref)).join('');
  }

  function updateStorageInfo() {
    const el = $('#storage-info');
    if (!el || !App.state) return;
    const modo = { indexeddb: 'neste navegador', localstorage: 'neste navegador (modo simples)', memoria: 'somente nesta sessão — faça backup' }[ST.modo()] || '';
    el.innerHTML = `Dados salvos ${h(modo)} · ${App.state.docs.length} documento(s)${App.state.ultimoBackup ? `<br>Último backup: ${h(U.brDate(App.state.ultimoBackup))}` : ''}`;
  }

  function setView(view, extra = {}) {
    App.ui.view = view;
    if ('empresa' in extra) App.ui.empresa = extra.empresa || '';
    if ('ref' in extra) App.ui.ref = extra.ref || '';
    if (extra.regra !== undefined) { App.ui.rev.regra = extra.regra; App.ui.rev.page = 1; }
    if (extra.forca) { App.ui.rev.forca = [extra.forca]; App.ui.rev.page = 1; }
    savePrefs();
    closeDrawer();
    renderAll();
    global.scrollTo({ top: 0 });
  }

  /* ============================================================
   * Painel
   * ============================================================ */
  function emptyHome() {
    return `<div class="card empty">
      <div class="ico">${ic('logo')}</div>
      <h3>Revise as cobranças de ICMS-ST e de Equalização da SEFAZ/MS</h3>
      <p>Importe os relatórios de prévia, as memórias de cálculo e o cartão CNPJ das suas empresas. O sistema confere item a item, aponta duplicidades e erros e monta o pedido de revisão com base legal e fundamentação.</p>
      <div class="row" style="justify-content:center"><button class="btn primary" type="button" data-act="pick-files">${ic('upload')} Importar arquivos</button><button class="btn" type="button" data-go="ajuda">${ic('help')} Como usar</button></div>
      <div class="how">
        <div class="card"><span class="n">1</span><b>Importe</b><span class="muted small">Relatório de Prévia (PDF), tela "Dados da Nota" (Excel, PDF ou colagem), memória de cálculo do ST (planilha ou colagem), XML da NF-e e cartão CNPJ.</span></div>
        <div class="card"><span class="n">2</span><b>Revise</b><span class="muted small">Duplicidade ST × Equalização, cálculo, MVA, crédito, CEST, destinação dos produtos, isenção de ME e outras checagens.</span></div>
        <div class="card"><span class="n">3</span><b>Peça a revisão</b><span class="muted small">Relatório com base legal e fundamentação, requerimento em Word e lista das NFs para desvincular no e-Fazenda.</span></div>
      </div>
    </div>`;
  }

  function viewPainel() {
    const m = App.model;
    if (!App.state.docs.length && !App.state.companies.length) return emptyHome();
    const chs = m.charges.filter(inScope);
    const fs = m.findings.filter(inScope).filter(f => !['descartado', 'indeferido'].includes(f.status));
    const rev = { forte: 0, moderada: 0, atencao: 0 };
    chs.forEach(c => { rev.forte += c.revisao.forte; rev.moderada += c.revisao.moderada; rev.atencao += c.revisao.atencao; });
    rev.total = rev.forte + rev.moderada + rev.atencao;
    const cobST = U.sum(chs.filter(c => c.tipo === 'ST'), c => c.valorICMS);
    const cobEQ = U.sum(chs.filter(c => c.tipo === 'EQ'), c => c.valorICMS);
    const cobTot = U.sum(chs, c => c.valorICMS);
    const nfKeys = U.uniq(chs.map(c => c.nfKey));
    const ambos = nfKeys.filter(k => chs.some(c => c.nfKey === k && c.tipo === 'ST') && chs.some(c => c.nfKey === k && c.tipo === 'EQ'));
    const conferidas = chs.filter(c => c.itens.length).length;
    const dupSTEQ = fs.filter(f => f.ruleId === 'DUP_ST_EQ' || f.ruleId === 'DUP_BASES');
    const dupOutras = fs.filter(f => ['DUP_PERIODO', 'DUP_ITEM', 'ST_RETIDO'].includes(f.ruleId));
    const den = Math.max(cobTot, rev.total, 1);
    const w = k => (rev[k] / den * 100).toFixed(2);
    const stats = m.stats.filter(s => inScope(s)).sort((a, b) => String(b.referencia).localeCompare(String(a.referencia)) || nomeCurto(m.companies.get(a.companyId)).localeCompare(nomeCurto(m.companies.get(b.companyId))));
    const pend = m.pend.filter(p => (!App.ui.empresa || !p.companyId || p.companyId === App.ui.empresa) && (!App.ui.ref || !p.referencia || p.referencia === App.ui.ref));
    const porRegra = Object.entries(U.groupBy(fs, f => f.ruleId)).map(([rid, l]) => ({ rid, n: l.length, v: U.sum(l, f => f.valorRevisar), forca: L.REGRAS[rid].forca })).sort((a, b) => b.v - a.v);
    const sumBases = ambos.map(k => m.nfsByKey.get(k)).filter(Boolean);
    const okBases = sumBases.filter(nf => { const cs = nf.charges.filter(inScope); return cs.every(c => c.itens.length) && Math.abs(U.sum(cs, c => c.somaBase) - nf.valorNF) <= 1; }).length;

    return `<div class="stack">
      <div class="card hero">
        <div>
          <div class="muted small">Potencial de revisão no escopo selecionado</div>
          <div class="big">${U.brl(rev.total)}</div>
          <p class="lead">${cobTot ? U.fmt(rev.total / cobTot * 100, 1) + '% de ' + U.brl(cobTot) + ' cobrados' : 'Nenhuma cobrança importada'} · ${fs.length} achado(s) em ${nfKeys.length} nota(s)</p>
          <div class="stackbar" style="margin-top:14px" title="Proporção do valor cobrado"><span class="forte" style="width:${w('forte')}%"></span><span class="moderada" style="width:${w('moderada')}%"></span><span class="atencao" style="width:${w('atencao')}%"></span></div>
          <div class="legend"><span><i class="dot forte"></i>Forte ${U.brl(rev.forte)}</span><span><i class="dot moderada"></i>Moderada ${U.brl(rev.moderada)}</span><span><i class="dot atencao"></i>Atenção ${U.brl(rev.atencao)}</span></div>
        </div>
        <div class="stack">
          <div class="callout ${dupSTEQ.length ? 'warn' : 'ok'}"><b>Duplicidade ST × Equalização:</b> ${dupSTEQ.length ? `${dupSTEQ.length} ocorrência(s), ${U.brl(U.sum(dupSTEQ, f => f.valorRevisar))} a revisar.` : ambos.length ? `nenhuma encontrada. ${ambos.length} NF foram cobradas nos dois tributos e, em ${okBases}, a soma das bases bate com o valor da nota (itens distintos em cada cobrança).` : 'nenhuma NF foi cobrada nos dois tributos no escopo.'}${dupOutras.length ? `<br><b>Outras duplicidades:</b> ${dupOutras.length} (períodos, linhas repetidas ou ST já retido).` : ''}</div>
          <div class="row"><button class="btn primary" type="button" data-go="revisao">${ic('checklist')} Ver itens para revisão</button><button class="btn" type="button" data-act="open-req">${ic('doc')} Gerar requerimento</button></div>
        </div>
      </div>

      <div class="kpis">
        <div class="card kpi forte"><div class="lb"><i class="dot forte"></i>Indício forte</div><div class="vl">${U.brl(rev.forte)}</div><div class="sb">base legal direta · pedir revisão</div></div>
        <div class="card kpi moderada"><div class="lb"><i class="dot moderada"></i>Moderado</div><div class="vl">${U.brl(rev.moderada)}</div><div class="sb">depende de documento ou confirmação</div></div>
        <div class="card kpi neutro"><div class="lb">ICMS-ST cobrado (333)</div><div class="vl">${U.brl(cobST)}</div><div class="sb">${U.uniq(chs.filter(c => c.tipo === 'ST').map(c => c.nfKey)).length} NF</div></div>
        <div class="card kpi neutro"><div class="lb">Equalização cobrada (349)</div><div class="vl">${U.brl(cobEQ)}</div><div class="sb">${U.uniq(chs.filter(c => c.tipo === 'EQ').map(c => c.nfKey)).length} NF</div></div>
        <div class="card kpi ${conferidas === chs.length ? 'ok' : 'atencao'}"><div class="lb">Cobranças conferidas item a item</div><div class="vl">${conferidas}/${chs.length}</div><div class="sb">${chs.length - conferidas ? `${chs.length - conferidas} sem memória de cálculo` : 'todas com memória de cálculo'}</div></div>
      </div>

      <div class="card">
        <div class="card-head"><h3>Por empresa e referência</h3><div class="sp"><button class="btn sm" type="button" data-go="empresas">${ic('building')} Empresas</button></div></div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Empresa</th><th>Ref.</th><th class="num">ICMS-ST</th><th class="num">Equalização</th><th class="num">Forte</th><th class="num">Moderada</th><th class="num">Atenção</th><th class="num">NF</th><th></th></tr></thead>
          <tbody>${stats.length ? stats.map(s => {
            const c = m.companies.get(s.companyId);
            return `<tr><td><b>${h(nomeCurto(c))}</b><div class="sub">${h(c ? U.fmtCNPJ(c.cnpj) || ('IE ' + (c.ie || '—')) : 'Defina a empresa')}</div></td><td>${h(U.refLabel(s.referencia))}</td>
              <td class="num">${U.brl(s.cobrado.ST)}</td><td class="num">${U.brl(s.cobrado.EQ)}</td>
              <td class="num" style="color:var(--forte)">${U.brl(s.revisar.forte)}</td><td class="num" style="color:var(--moderada)">${U.brl(s.revisar.moderada)}</td><td class="num" style="color:var(--atencao)">${U.brl(s.revisar.atencao)}</td>
              <td class="num">${s.notas.size}</td>
              <td class="nowrap"><button class="btn sm" type="button" data-go="revisao" data-empresa="${h(s.companyId || '')}" data-ref="${h(s.referencia)}">Revisar</button> <button class="btn sm ghost" type="button" data-act="open-req" data-cid="${h(s.companyId || '')}" data-ref="${h(s.referencia)}">${ic('doc')}</button></td></tr>`;
          }).join('') : '<tr class="empty-row"><td colspan="9">Nenhuma cobrança no escopo.</td></tr>'}</tbody>
        </table></div>
      </div>

      <div class="grid g2">
        <div class="card">
          <div class="card-head"><h3>Pendências</h3><span class="pill ${pend.length ? 'moderada' : 'ok'}">${pend.length}</span></div>
          <div class="list">${pend.length ? pend.slice(0, 14).map(p => `<div class="li"><span class="ic ${p.nivel}">${ic(p.nivel === 'info' ? 'info' : 'alert')}</span><div class="small">${h(p.texto)}</div></div>`).join('') + (pend.length > 14 ? `<div class="li small muted">e mais ${pend.length - 14}…</div>` : '') : `<div class="li"><span class="ic ok">${ic('check')}</span><div class="small">Tudo conferido: todas as cobranças têm memória de cálculo e as somas batem.</div></div>`}</div>
        </div>
        <div class="card">
          <div class="card-head"><h3>Achados por tipo</h3></div>
          <div class="list">${porRegra.length ? porRegra.map(r => `<div class="li" style="align-items:center"><i class="dot ${r.forca}"></i><a href="#" data-go="revisao" data-regra="${r.rid}" style="color:inherit;text-decoration:none" class="small"><b>${h(L.REGRAS[r.rid].nome)}</b> · ${r.n}</a><span class="num small" style="margin-left:auto">${U.brl(r.v)}</span></div>`).join('') : '<div class="li small muted">Nenhum achado ainda. Importe as memórias de cálculo para a conferência item a item.</div>'}</div>
        </div>
      </div>

      <div class="card card-pad">
        <h3>Rito da revisão na SEFAZ/MS (Res. SEFAZ nº 3.033/2019)</h3>
        <ul class="steps small">
          <li>Pedido eletrônico no e-Fazenda, módulo <b>Informações Fiscais</b> — <b>uma única solicitação por mês de referência e por tributo</b>: consolide tudo antes de enviar.</li>
          <li>Feito <b>até o vencimento</b>, as NFs contestadas ficam desvinculadas da cobrança até a decisão; o DAEMS do restante é gerado automaticamente.</li>
          <li>O pedido não suspende a cobrança; a decisão sai em até <b>15 dias úteis</b>. Novos pedidos ou reconsideração: <b>e-SAP</b> com documentos anexos.</li>
          <li>Valores já pagos: restituição do indébito pelo e-SAP (Res. SEFAZ nº 3.426/2025; CTN, art. 165).</li>
        </ul>
      </div>
    </div>`;
  }

  /* ============================================================
   * Importar
   * ============================================================ */
  function docInfo(d) {
    const m = App.model;
    let companyId = d.link && d.link.companyId, ref = '', tipo = '', nf = '', itens = '', valor = null, vinc = '', vincOk = true, partes = '';
    if (d.kind === 'previa') { ref = d.data.referencia; tipo = d.data.tipo; nf = `${d.data.notas.length} NF`; valor = d.data.totalValorICMS || U.sum(d.data.notas, n => n.valorICMS); vinc = 'Empresa'; }
    if (d.kind === 'itens') {
      const ch = m.chargesById.get(m.docCharge.get(d.id));
      tipo = (ch && ch.tipo) || d.data.tipo || '';
      nf = 'NF ' + ((ch && ch.numero) || d.data.nota.numero || '?');
      itens = d.data.linhas.length; valor = U.sum(d.data.linhas, l => l.icms);
      // itens da tela "Dados da Nota" presentes neste arquivo (pela numeração "Visualizando a - b de N"), em faixas contínuas
      const tot = d.data.totalLinhasDeclarado || 0;
      const ps = tot ? [...new Set(d.data.linhas.map(l => l.pos).filter(Boolean))].sort((a, b) => a - b) : [];
      if (ps.length) {
        const fx = [];
        ps.forEach(p => { const u = fx[fx.length - 1]; if (u && p === u.ate + 1) u.ate = p; else fx.push({ de: p, ate: p }); });
        partes = fx.length === 1 && fx[0].de === 1 && fx[0].ate >= tot ? `todos os ${tot} itens` : `itens ${fx.map(f => f.de === f.ate ? f.de : `${f.de}–${f.ate}`).join(', ')} de ${tot}`;
      }
      if (ch) { companyId = ch.companyId; ref = ch.referencia; vincOk = ch.origem === 'previa'; vinc = vincOk ? 'Prévia' : 'Sem prévia'; }
      else { vincOk = false; vinc = 'Não vinculado'; }
    }
    if (d.kind === 'nfe') { nf = 'NF ' + d.data.numero; itens = d.data.itens.length; valor = d.data.valorNF; const nfm = m.nfs.find(x => x.xml && x.xml.id === d.id); vincOk = !!nfm; vinc = nfm ? 'Cobrança' : 'Sem cobrança'; if (nfm) companyId = nfm.companyId; }
    if (d.kind === 'cnpj') { nf = U.fmtCNPJ(d.data.cnpj); vinc = 'Empresa'; }
    return { companyId, ref, tipo, nf, itens, valor, vinc, vincOk, partes };
  }

  function viewImportar() {
    const m = App.model;
    const comps = [...m.companies.values()];
    const kind = App.ui.docs.kind;
    const docs = App.state.docs.filter(d => !kind || d.kind === kind).slice().sort((a, b) => String(b.importedAt).localeCompare(String(a.importedAt)));
    const counts = U.groupBy(App.state.docs, d => d.kind);
    const li = App.lastImport;
    const refDefault = App.ui.ref || (m.refs[0] || '');
    return `<div class="stack">
      ${li ? `<div class="callout ${li.erros.length ? 'warn' : 'ok'}"><b>Última importação:</b> ${li.ok.length} documento(s) lido(s)${li.dup.length ? `, ${li.dup.length} já importado(s)` : ''}${li.subst.length ? `, ${li.subst.length} relatório(s) substituído(s) pela versão nova` : ''}${li.erros.length ? `, ${li.erros.length} não reconhecido(s)` : ''}.
        ${li.erros.length || li.avisos.length ? `<ul class="steps tiny" style="margin-top:6px">${li.erros.concat(li.avisos).slice(0, 8).map(x => `<li>${h(x)}</li>`).join('')}</ul>` : ''}
        <div class="row" style="margin-top:6px"><button class="btn sm" type="button" data-go="revisao">Ver revisão</button><button class="btn sm ghost" type="button" data-act="dismiss-import">Fechar</button></div></div>` : ''}
      <div class="grid g2">
        <div class="dropzone" id="dropzone" data-act="pick-files" tabindex="0" role="button" aria-label="Selecionar arquivos para importar">
          <div class="ico">${ic('upload')}</div>
          <h3>Arraste e solte os arquivos aqui</h3>
          <div class="muted">ou clique para selecionar — vários de uma vez, de várias empresas</div>
          <div class="types"><span>Relatório de Prévia (PDF)</span><span>Dados da Nota (Excel ou PDF)</span><span>Memória ST (XLSX/CSV)</span><span>XML da NF-e</span><span>Cartão CNPJ (PDF)</span></div>
          <div class="progress hidden" id="imp-progress"><span></span></div>
          <div class="tiny muted" id="imp-status"></div>
        </div>
        <div class="card card-pad stack">
          <div><h3>Colar a tabela do portal</h3><div class="muted small">Selecione a tabela da memória de cálculo no portal da SEFAZ, copie (Ctrl+C) e cole abaixo — sem montar planilha. Copie também o cabeçalho. Na Equalização, cole as páginas da tela "Dados da Nota" uma depois da outra: o nº da NF e o tributo vêm da própria colagem.</div></div>
          <div class="grid g3">
            <label class="field"><span>Empresa</span><select id="paste-emp">${opt('', comps.length === 1 ? nomeCurto(comps[0]) : 'Pelo relatório de prévia', '')}${comps.map(c => opt(c.id, nomeCurto(c), App.ui.empresa)).join('')}</select></label>
            <label class="field"><span>Referência</span><input type="month" id="paste-ref" value="${h(refDefault)}"></label>
            <label class="field"><span>Tributo</span><select id="paste-tipo">${opt('ST', 'ICMS-ST (333)', 'ST')}${opt('EQ', 'Equalização (349)', '')}</select></label>
            <label class="field"><span>Nº da NF</span><input type="text" id="paste-nf" inputmode="numeric" placeholder="Se não vier na colagem"></label>
            <label class="field"><span>CNPJ do remetente</span><input type="text" id="paste-cnpj" placeholder="opcional"></label>
            <label class="field"><span>UF de origem</span><select id="paste-uf">${opt('', '—', '')}${U.UFS.map(u => opt(u, u, '')).join('')}</select></label>
          </div>
          <textarea id="paste-text" rows="5" placeholder="Cole aqui (Ctrl+V)…" aria-label="Tabela colada"></textarea>
          <div class="row"><button class="btn primary" type="button" data-act="import-paste">${ic('plus')} Importar colagem</button><span class="muted small">Se o relatório de prévia já foi importado, a empresa e a referência são identificadas pelo nº da NF.</span></div>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><h3>Documentos importados</h3><span class="pill neutro">${App.state.docs.length}</span>
          <div class="sp chips">${[['', 'Todos'], ['previa', 'Prévias'], ['itens', 'Memórias'], ['nfe', 'XML'], ['cnpj', 'Cartões CNPJ']].map(([k, n]) => `<button type="button" class="chip ${kind === k ? 'on' : ''}" data-act="doc-kind" data-v="${k}">${n}${k ? ` (${(counts[k] || []).length})` : ''}</button>`).join('')}</div></div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Arquivo</th><th>Tipo</th><th>Empresa</th><th>Ref.</th><th>NF</th><th class="num">Itens</th><th class="num">ICMS / valor</th><th>Vínculo</th><th>Avisos</th><th></th></tr></thead>
          <tbody>${docs.length ? docs.map(d => {
            const i = docInfo(d);
            const c = m.companies.get(i.companyId);
            const warn = (d.warnings || []).length;
            return `<tr><td class="desc"><b class="small">${h(d.fileName)}</b>${d.data && d.data.planilha ? `<div class="sub">aba ${h(d.data.planilha)}</div>` : ''}<div class="sub">${h(U.brDate((d.importedAt || '').slice(0, 10)))}</div></td>
              <td><div class="small">${h(TIPO_DOC[d.kind] || d.kind)}</div>${i.tipo ? tipoPill(i.tipo, d.kind === 'previa' ? d.data.tributoCodigo : '') : ''}</td>
              <td class="small">${h(c ? nomeCurto(c) : '—')}</td><td class="small">${h(U.refLabel(i.ref))}</td><td class="small nowrap">${h(i.nf)}${i.partes ? `<div class="sub">${h(i.partes)}</div>` : ''}</td>
              <td class="num">${i.itens === '' ? '' : i.itens}</td><td class="num">${i.valor === null ? '' : U.brl(i.valor)}</td>
              <td>${i.vinc ? `<span class="pill ${i.vincOk ? 'ok' : 'moderada'}">${h(i.vinc)}</span>` : ''}</td>
              <td>${warn ? `<span class="pill moderada" title="${h(d.warnings.join('\n'))}">${warn} aviso(s)</span>` : '<span class="sub">—</span>'}</td>
              <td class="nowrap">${d.kind === 'itens' || d.kind === 'previa' ? `<button class="btn sm ghost" type="button" data-act="edit-link" data-doc="${h(d.id)}" title="Ajustar vínculo">${ic('edit')}</button>` : ''}<button class="btn sm ghost danger" type="button" data-act="rm-doc" data-doc="${h(d.id)}" title="Remover documento">${ic('trash')}</button></td></tr>`;
          }).join('') : '<tr class="empty-row"><td colspan="10">Nenhum documento importado.</td></tr>'}</tbody>
        </table></div>
      </div>
    </div>`;
  }

  function newCompany(o = {}) {
    return Object.assign({
      id: U.uid(), cnpj: '', ie: '', razaoSocial: '', nomeFantasia: '', porte: '', porteManual: false, regime: 'SN', dataAbertura: '',
      cnaePrincipal: null, cnaesSecundarios: [], receitaAnoAnterior: '', beneficiarioME: '', industrial: null, signatario: { nome: '', cargo: '' },
      logradouro: '', numero: '', complemento: '', bairro: '', cep: '', municipio: '', uf: 'MS', fonte: 'manual', criadoEm: new Date().toISOString()
    }, o);
  }

  function upsertCompanyFromCartao(d) {
    let c = App.state.companies.find(x => x.cnpj && x.cnpj === d.cnpj) || App.state.companies.find(x => !x.cnpj && d.razaoSocial && U.normKey(x.razaoSocial) === U.normKey(d.razaoSocial));
    if (!c) { c = newCompany(); App.state.companies.push(c); }
    const porte = c.porteManual ? c.porte : (d.porte || c.porte);
    Object.assign(c, {
      cnpj: d.cnpj, razaoSocial: d.razaoSocial || c.razaoSocial, nomeFantasia: d.nomeFantasia || c.nomeFantasia, dataAbertura: d.dataAbertura || c.dataAbertura,
      cnaePrincipal: d.cnaePrincipal || c.cnaePrincipal, cnaesSecundarios: (d.cnaesSecundarios && d.cnaesSecundarios.length) ? d.cnaesSecundarios : c.cnaesSecundarios,
      naturezaJuridica: d.naturezaJuridica, tipoEstabelecimento: d.tipoEstabelecimento, logradouro: d.logradouro, numero: d.numero, complemento: d.complemento,
      bairro: d.bairro, cep: d.cep, municipio: d.municipio, uf: d.uf || c.uf, email: d.email, telefone: d.telefone, situacao: d.situacao, dataSituacao: d.dataSituacao,
      cartaoEmitidoEm: d.emitidoEm, fonte: 'cartao', atualizadoEm: new Date().toISOString(), porte
    });
    return c;
  }

  function companyForPrevia(p) {
    let c = App.state.companies.find(x => x.ie && p.ie && x.ie === p.ie) || App.state.companies.find(x => p.razaoSocial && U.normKey(x.razaoSocial) === U.normKey(p.razaoSocial));
    if (!c) { c = newCompany({ razaoSocial: p.razaoSocial, ie: p.ie, fonte: 'previa' }); App.state.companies.push(c); }
    if (!c.ie && p.ie) c.ie = p.ie;
    if (!c.razaoSocial && p.razaoSocial) c.razaoSocial = p.razaoSocial;
    return c;
  }

  function addDoc(d, res) {
    if (d.kind === 'desconhecido' || d.kind === 'erro') { res.erros.push(`${d.fileName}: ${(d.warnings || []).join(' ')}`); return null; }
    if (App.state.docs.some(x => x.hash === d.hash && (x.part || 0) === (d.part || 0))) { res.dup.push(d.fileName); return null; }
    const doc = Object.assign({ id: U.uid(), importedAt: new Date().toISOString(), link: {} }, d);
    if (doc.kind === 'cnpj') { const c = upsertCompanyFromCartao(doc.data); doc.link = { companyId: c.id }; res.empresas.push(nomeCurto(c)); }
    if (doc.kind === 'previa') {
      const c = companyForPrevia(doc.data);
      doc.link = { companyId: c.id };
      const old = App.state.docs.filter(x => x.kind === 'previa' && x.link && x.link.companyId === c.id && x.data.referencia === doc.data.referencia && x.data.tributoCodigo === doc.data.tributoCodigo);
      if (old.length) { App.state.docs = App.state.docs.filter(x => !old.includes(x)); res.subst.push(doc.fileName); }
    }
    App.state.docs.push(doc);
    res.ok.push(doc.fileName);
    if (doc.warnings && doc.warnings.length) res.avisos.push(`${doc.fileName}: ${doc.warnings.join(' ')}`);
    return doc;
  }

  async function importFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    if (App.ui.view !== 'importar') setView('importar');
    const res = { ok: [], dup: [], subst: [], erros: [], avisos: [], empresas: [] };
    const prog = $('#imp-progress'), st = $('#imp-status');
    if (prog) prog.classList.remove('hidden');
    for (let i = 0; i < files.length; i++) {
      if (prog) prog.firstElementChild.style.width = `${(i / files.length) * 100}%`;
      if (st) st.textContent = `Lendo ${files[i].name} (${i + 1}/${files.length})…`;
      try {
        const docs = await P.parseFile(files[i]);
        docs.forEach(d => addDoc(d, res));
      } catch (e) { res.erros.push(`${files[i].name}: ${e.message}`); }
    }
    App.lastImport = res;
    commit();
    const msg = `${res.ok.length} documento(s) importado(s)${res.dup.length ? ` · ${res.dup.length} repetido(s)` : ''}${res.erros.length ? ` · ${res.erros.length} não reconhecido(s)` : ''}.`;
    toast(msg, res.erros.length ? '' : 'ok');
  }

  function importPaste() {
    const text = $('#paste-text').value;
    const numero = U.digits($('#paste-nf').value);
    if (!text.trim()) return toast('Cole a tabela no campo de texto.', 'err');
    const tipoSel = $('#paste-tipo').value;
    const lidos = P.parseColagem(text, { tipo: tipoSel, numero, cnpjRemetente: $('#paste-cnpj').value, ufRemetente: $('#paste-uf').value });
    if (!lidos.length) return toast('Não reconheci a tabela. Copie também a linha de cabeçalho (DESCRIÇÃO, NCM/SH… ou NCM, Descrição, Percentual…).', 'err', 6000);
    if (lidos.some(d => !d.data.nota.numero)) return toast('Informe o número da NF.', 'err');
    const ref = U.refKey($('#paste-ref').value);
    const res = { ok: [], dup: [], subst: [], erros: [], avisos: [], empresas: [] };
    lidos.forEach((d, i) => {
      // o tributo reconhecido pelo cabeçalho da tabela prevalece sobre a seleção
      const tipo = d.data.tipo || tipoSel;
      const num = d.data.nota.numero;
      const doc = Object.assign(d, {
        fileName: `Colagem — NF ${num} (${tipo})`, hash: 'colagem-' + U.hashText(tipo + num + text), size: text.length, part: i,
        link: { companyId: $('#paste-emp').value || '', referencia: '', tipo, numero: num, cnpjRemetente: U.digits($('#paste-cnpj').value) }
      });
      // usa a referência só se não houver prévia com esse número
      const temPrevia = App.model.charges.some(c => c.origem === 'previa' && c.numero === String(+num) && c.tipo === tipo);
      if (!temPrevia) doc.link.referencia = ref;
      addDoc(doc, res);
    });
    App.lastImport = res;
    commit();
    const nItens = U.sum(lidos, d => d.data.linhas.length);
    const outroTipo = lidos.find(d => d.data.tipo && d.data.tipo !== tipoSel);
    toast(res.ok.length ? `Colagem importada: ${nItens} item(ns) da NF ${U.uniq(lidos.map(d => d.data.nota.numero)).join(', ')}${outroTipo ? ` (reconhecida como ${outroTipo.data.tipo === 'EQ' ? 'Equalização' : 'ICMS-ST'})` : ''}.` : 'Essa colagem já havia sido importada.', res.ok.length ? 'ok' : '', 6000);
  }

  function openEditLink(docId) {
    const d = App.state.docs.find(x => x.id === docId);
    if (!d) return;
    const m = App.model;
    const comps = [...m.companies.values()];
    const ch = d.kind === 'itens' ? m.chargesById.get(m.docCharge.get(d.id)) : null;
    const lk = d.link || {};
    const body = d.kind === 'previa' ? `
      <label class="field"><span>Empresa</span><select id="lk-emp">${comps.map(c => opt(c.id, nomeCurto(c), lk.companyId)).join('')}</select></label>` : `
      <div class="callout">Normalmente o vínculo é automático pelo número da NF e pelo relatório de prévia. Ajuste só se o documento ficou sem prévia ou em outra empresa.</div>
      <div class="grid g2">
        <label class="field"><span>Empresa</span><select id="lk-emp">${opt('', 'Automático', '')}${comps.map(c => opt(c.id, nomeCurto(c), lk.companyId)).join('')}</select></label>
        <label class="field"><span>Referência</span><input type="month" id="lk-ref" value="${h(lk.referencia || '')}"></label>
        <label class="field"><span>Tributo</span><select id="lk-tipo">${opt('', 'Automático', lk.tipo || '')}${opt('ST', 'ICMS-ST (333)', lk.tipo || '')}${opt('EQ', 'Equalização (349)', lk.tipo || '')}</select></label>
        <label class="field"><span>Nº da NF</span><input type="text" id="lk-nf" value="${h(lk.numero || d.data.nota.numero || '')}"></label>
        <label class="field"><span>CNPJ do remetente</span><input type="text" id="lk-cnpj" value="${h(U.fmtCNPJ(lk.cnpjRemetente || d.data.nota.cnpjRemetente || ''))}"></label>
      </div>
      <div class="small muted">Vínculo atual: ${ch ? `NF ${h(ch.numero)} · ${ch.tipo} · ref. ${h(U.refLabel(ch.referencia))} · ${ch.origem === 'previa' ? 'com relatório de prévia' : 'sem relatório de prévia'}` : 'não vinculado'}</div>`;
    openDrawer(`<div class="dh"><div><h3>Vínculo do documento</h3><div class="sub">${h(d.fileName)}</div></div><button class="btn icon ghost close" type="button" data-act="close-drawer" aria-label="Fechar">${ic('x')}</button></div>
      <div class="db">${body}<div class="row"><button class="btn primary" type="button" data-act="save-link" data-doc="${h(d.id)}">${ic('save')} Salvar vínculo</button><button class="btn" type="button" data-act="close-drawer">Cancelar</button></div></div>`);
  }

  function saveLink(docId) {
    const d = App.state.docs.find(x => x.id === docId);
    if (!d) return;
    if (d.kind === 'previa') d.link = { companyId: $('#lk-emp').value };
    else d.link = { companyId: $('#lk-emp').value, referencia: U.refKey($('#lk-ref').value), tipo: $('#lk-tipo').value, numero: U.digits($('#lk-nf').value), cnpjRemetente: U.digits($('#lk-cnpj').value) };
    closeDrawer();
    commit();
    toast('Vínculo atualizado.', 'ok');
  }

  /* ============================================================
   * Revisão
   * ============================================================ */
  function filteredFindings() {
    const f = App.ui.rev;
    const q = U.norm(f.q);
    const min = f.min ? U.num(f.min) : 0;
    let list = App.model.findings.filter(x => inScope(x)
      && (!f.tipo || x.tipo === f.tipo)
      && f.forca.includes(x.forca)
      && (!f.regra || x.ruleId === f.regra)
      && (f.status === 'todos' ? true : f.status ? x.status === f.status : x.status !== 'descartado')
      && (!f.uf || x.ufRemetente === f.uf)
      && (!min || x.valorRevisar >= min)
      && (!q || U.norm([x.numero, x.descricao, x.ncm, U.fmtNCM(x.ncm), x.cest, U.fmtCEST(x.cest), x.regra, x.resumo, x.cnpjRemetente, U.fmtCNPJ(x.cnpjRemetente), x.chave, x.gtin].join(' ')).includes(q)));
    if (f.sort === 'valor') list = list.slice().sort((a, b) => b.valorRevisar - a.valorRevisar);
    else if (f.sort === 'nf') list = list.slice().sort((a, b) => String(a.referencia).localeCompare(String(b.referencia)) || (+a.numero - +b.numero) || (b.valorRevisar - a.valorRevisar));
    return list;
  }

  function viewRevisao() {
    const f = App.ui.rev;
    const all = App.model.findings.filter(inScope);
    const regras = U.uniq(all.map(x => x.ruleId));
    const ufs = U.uniq(all.map(x => x.ufRemetente).filter(Boolean)).sort();
    return `<div class="stack">
      <div class="card">
        <div class="toolbar">
          <div class="search">${ic('search')}<input type="search" data-f="rev.q" value="${h(f.q)}" placeholder="Buscar NF, produto, NCM, CEST, CNPJ, chave…" aria-label="Buscar"></div>
          <select data-f="rev.tipo" aria-label="Tributo">${opt('', 'ST e Equalização', f.tipo)}${opt('ST', 'Somente ICMS-ST', f.tipo)}${opt('EQ', 'Somente Equalização', f.tipo)}</select>
          <select data-f="rev.regra" aria-label="Tipo de achado">${opt('', 'Todos os achados', f.regra)}${regras.map(r => opt(r, L.REGRAS[r].nome, f.regra)).join('')}</select>
          <select data-f="rev.status" aria-label="Status">${opt('', 'Ativos (exceto descartados)', f.status)}${Object.entries(L.STATUS).map(([k, v]) => opt(k, v, f.status)).join('')}${opt('todos', 'Todos os status', f.status)}</select>
          <select data-f="rev.uf" aria-label="UF de origem">${opt('', 'Todas as UF', f.uf)}${ufs.map(u => opt(u, u, f.uf)).join('')}</select>
          <input type="text" data-f="rev.min" value="${h(f.min)}" placeholder="Valor mín. R$" style="width:120px" inputmode="decimal" aria-label="Valor mínimo">
          <select data-f="rev.sort" aria-label="Ordenar">${opt('forca', 'Ordenar: força e valor', f.sort)}${opt('valor', 'Ordenar: maior valor', f.sort)}${opt('nf', 'Ordenar: NF', f.sort)}</select>
        </div>
        <div class="toolbar" style="padding-top:0">
          <span class="small muted">Força:</span>
          <div class="chips">${['forte', 'moderada', 'atencao'].map(k => `<button type="button" class="chip ${f.forca.includes(k) ? 'on ' + k : ''}" data-act="toggle-forca" data-v="${k}" title="${h(L.FORCAS[k].desc)}"><i class="dot ${k}"></i>${L.FORCAS[k].nome}</button>`).join('')}</div>
          <button class="btn sm ghost" type="button" data-act="clear-filters">${ic('x')} Limpar filtros</button>
        </div>
        <div id="rev-results"></div>
      </div>
    </div>`;
  }

  function renderRevResults() {
    const box = $('#rev-results');
    if (!box) return;
    const list = filteredFindings();
    const f = App.ui.rev;
    const pages = Math.max(1, Math.ceil(list.length / PAGE));
    if (f.page > pages) f.page = pages;
    const slice = list.slice((f.page - 1) * PAGE, f.page * PAGE);
    const cons = R.consolidar(App.model, list.filter(x => !['descartado', 'indeferido'].includes(x.status)));
    const totCons = U.sum(cons, x => x.total);
    const byF = { forte: 0, moderada: 0, atencao: 0 };
    list.forEach(x => { byF[x.forca] += x.valorRevisar; });
    const selN = [...App.sel].filter(id => App.model.findingsById.has(id)).length;
    const allSel = slice.length && slice.every(x => App.sel.has(x.id));
    box.innerHTML = `
      <div class="sumline"><b>${list.length} achado(s)</b><span>· a revisar (consolidado, sem dupla contagem): <b>${U.brl(totCons)}</b></span>
        <span class="muted small">forte ${U.brl(byF.forte)} · moderada ${U.brl(byF.moderada)} · atenção ${U.brl(byF.atencao)}</span>
        <div class="sp">
          <button class="btn sm" type="button" data-act="export-xlsx" title="Planilha com base legal e fundamentação">${ic('download')} Excel</button>
          <button class="btn sm" type="button" data-act="open-req">${ic('doc')} Requerimento</button>
          <button class="btn sm" type="button" data-act="open-efazenda" title="Lista das NFs para o pedido no e-Fazenda">${ic('list')} Lista e-Fazenda</button>
          <button class="btn sm" type="button" data-act="export-produtos" title="Produtos com ICMS-ST para segregar no PGDAS-D">${ic('download')} Produtos c/ ST</button>
          <button class="btn sm" type="button" data-act="export-sos" title="Relação dos itens no modelo do SOS Reforma (CNPJ, NCM, Descrição, GTIN, Código do Produto)">${ic('download')} SOS Reforma</button>
          <button class="btn sm ghost" type="button" data-act="print" title="Imprimir esta lista">${ic('printer')}</button>
        </div></div>
      ${selN ? `<div class="bulk"><b>${selN} selecionado(s)</b> — marcar como:
        ${['pedir', 'solicitado', 'deferido', 'indeferido', 'descartado', 'novo'].map(s => `<button class="btn sm" type="button" data-act="bulk-status" data-v="${s}">${h(L.STATUS[s])}</button>`).join('')}
        <button class="btn sm ghost" type="button" data-act="clear-sel">Limpar seleção</button></div>` : ''}
      <div class="table-wrap"><table class="data">
        <thead><tr><th><input type="checkbox" data-selall ${allSel ? 'checked' : ''} aria-label="Selecionar página"></th><th>Força</th><th>NF</th><th>Tributo</th><th>Item</th><th class="num">ICMS cobrado</th><th class="num">A revisar</th><th>Achado</th><th>Base legal</th><th>Fundamentação</th><th>Status</th></tr></thead>
        <tbody>${slice.length ? slice.map(x => `<tr class="click ${App.sel.has(x.id) ? 'sel' : ''}" data-fid="${h(x.id)}" tabindex="0">
          <td><input type="checkbox" data-sel="${h(x.id)}" ${App.sel.has(x.id) ? 'checked' : ''} aria-label="Selecionar"></td>
          <td>${forcaPill(x.forca)}</td>
          <td class="nowrap"><b>${h(x.numero)}</b><div class="sub">${h(U.refLabel(x.referencia))}${x.ufRemetente ? ' · ' + h(x.ufRemetente) : ''}</div></td>
          <td>${tipoPill(x.tipo, x.tributoCodigo)}</td>
          <td class="desc"><div class="clamp2">${x.descricao ? h(x.descricao) : '<i class="muted">NF inteira</i>'}</div><div class="sub">${h(ncmCest(x.ncm, x.cest))}</div></td>
          <td class="num">${U.brl(x.icmsCobrado)}</td>
          <td class="num strong">${U.brl(x.valorRevisar)}</td>
          <td style="min-width:200px"><div class="strong small">${h(x.regra)}</div><div class="sub clamp2">${h(x.resumo)}</div></td>
          <td class="small" style="min-width:190px;max-width:260px">${h(L.citacoes(x.baseLegal).slice(0, 3).join('; '))}${x.baseLegal.length > 3 ? '…' : ''}</td>
          <td class="fund"><div class="clamp3">${h(x.fundamentacao)}</div></td>
          <td>${statusPill(x.status)}${x.protocolo ? `<div class="sub">${h(x.protocolo)}</div>` : ''}</td></tr>`).join('') : `<tr class="empty-row"><td colspan="11">${App.model.findings.length ? 'Nenhum achado com esses filtros.' : 'Nenhum achado ainda. Importe os relatórios de prévia e as memórias de cálculo.'}</td></tr>`}</tbody>
      </table></div>
      ${pages > 1 ? `<div class="pager">Página ${f.page} de ${pages}<button class="btn sm" type="button" data-act="page" data-t="rev" data-p="${f.page - 1}" ${f.page <= 1 ? 'disabled' : ''}>Anterior</button><button class="btn sm" type="button" data-act="page" data-t="rev" data-p="${f.page + 1}" ${f.page >= pages ? 'disabled' : ''}>Próxima</button></div>` : ''}`;
  }

  /** Itens da relação oficial (Subanexo I) correspondentes ao item de ST. */
  function oficialHTML(it) {
    const o = it.oficial;
    if (!o) return '';
    if (!o.cands.length) return `<div class="sec"><h4>Relação oficial (Subanexo I do Anexo III do RICMS/MS)</h4><div class="callout warn small">Nem o CEST${U.digits(it.cest) ? ` ${h(U.fmtCEST(it.cest))}` : ''} nem o NCM ${h(U.fmtNCM(it.ncm))} constam da relação de mercadorias sujeitas à ST em MS.</div></div>`;
    const mv = v => v === undefined || v === null ? '—' : U.fmt(v, 2);
    return `<div class="sec"><h4>Relação oficial (Subanexo I do Anexo III do RICMS/MS)</h4>
      <div class="muted small" style="margin-bottom:6px">${o.por === 'cest' ? `Encontrado pelo CEST ${h(U.fmtCEST(it.cest || it.cestXml))}.` : `Sem CEST na relação: itens que abrangem o NCM ${h(U.fmtNCM(it.ncm))} — confira qual descrição corresponde ao produto.`}</div>
      <div class="table-wrap"><table class="data"><thead><tr><th>Item / CEST</th><th>Descrição oficial</th><th class="num">MVA orig.</th><th class="num">4%</th><th class="num">7%</th><th class="num">12%</th></tr></thead><tbody>
      ${o.cands.slice(0, 6).map(c => `<tr><td class="small nowrap">${h(c.item)}<div class="sub">${h(U.fmtCEST(c.cest))}</div></td><td class="small">${h(c.desc)}${c.cond ? `<div class="sub">${h(c.cond)}</div>` : ''}${c.mvaTxt ? `<div class="sub">MVA: ${h(c.mvaTxt)}</div>` : ''}<div class="sub">NCM ${h((c.ncm || []).map(U.fmtNCM).join(', ') || '—')}</div></td><td class="num">${mv(c.mva)}</td><td class="num">${mv(c.mva4)}</td><td class="num">${mv(c.mva7)}</td><td class="num">${mv(c.mva12)}</td></tr>`).join('')}
      ${o.cands.length > 6 ? `<tr><td colspan="6" class="small muted">e mais ${o.cands.length - 6} item(ns)</td></tr>` : ''}
      </tbody></table></div></div>`;
  }

  function itemKV(it) {
    if (!it) return '';
    const kv = (lb, v) => `<div><span>${h(lb)}</span><b>${v}</b></div>`;
    if (it.tipo === 'ST') {
      return `<div class="sec"><h4>Dados do item (memória ST)</h4><div class="kv card card-pad">
        ${kv('NCM / CEST', h(ncmCest(it.ncm, it.cest) || '—'))}${kv('GTIN', h(it.gtin || '—'))}${kv('CST / CFOP', h(`${it.cst || '—'} / ${it.cfop || '—'}`))}
        ${kv('Quantidade', h(`${U.fmt(it.qtd || 0, 2)} ${it.un || ''}`))}${kv('Valor da mercadoria', U.brl(it.valorTotal))}${kv('IPI', U.brl(it.ipi))}
        ${kv('Frete / outros', `${U.brl(it.frete)} / ${U.brl(it.outros)}`)}${kv('Custo final', U.brl(it.custoFinal))}${kv('MVA ajustada aplicada', it.mvaAj === null ? (it.temPauta ? 'pauta (PMPF)' : '—') : U.pct(it.mvaAj))}
        ${kv('MVA original equivalente', it.mvaOrig === null ? '—' : U.pct(it.mvaOrig))}${kv('MVA de referência', it.mvaTab === null || it.mvaTab === undefined ? (it.oficial && it.oficial.cands.length ? 'sem MVA na relação' : 'não encontrada') : `${U.pct(it.mvaTab)} <span class="sub">(${it.mvaRef && it.mvaRef.oficial ? 'Subanexo I' : 'sua tabela'})</span>`)}${kv('Base ST', U.brl(it.bcST))}
        ${kv('Alíquota interna', U.pct(it.aliqIntra))}${kv('Alíq. interestadual', `${U.pct(it.aliqInter || 0)} <span class="sub">(${h(it.aliqInterFonte || '')})</span>`)}${kv('Crédito admitido', U.brl(it.credito))}
        ${kv('ICMS cobrado', U.brl(it.icms))}${kv('ICMS recalculado', U.brl(it.icmsCalc))}${it.xmlItem ? kv('XML: ICMS-ST retido', U.brl(it.xmlItem.vICMSST || 0)) : ''}
      </div></div>${oficialHTML(it)}`;
    }
    return `<div class="sec"><h4>Dados do item (memória Equalização)</h4><div class="kv card card-pad">
      ${kv('NCM', h(U.fmtNCM(it.ncm) + (it.ncmTruncado ? ' (truncado)' : '')))}${kv('Valor da mercadoria', U.brl(it.valorTotal))}${kv('Frete / seguro', `${U.brl(it.frete)} / ${U.brl(it.seguro)}`)}
      ${kv('IPI / outros', `${U.brl(it.ipi)} / ${U.brl(it.outros)}`)}${kv('Desconto', U.brl(it.desconto))}${kv('Base', U.brl(it.base))}
      ${kv('Percentual', U.pct(it.percentual || 0))}${kv('ICMS cobrado', U.brl(it.icms))}${kv('ICMS recalculado', U.brl(it.icmsCalc))}
    </div></div>`;
  }

  function destSelect(it) {
    const d = it.dest || { valor: '', origem: '' };
    const cur = d.origem === 'usuario' ? d.valor : '';
    const sug = d.origem === 'sugestao' ? ` (sugestão: ${L.DESTINACOES[d.valor]})` : '';
    return `<select data-dest="${h(it.id)}" aria-label="Destinação do produto">${Object.entries(L.DESTINACOES).map(([k, v]) => opt(k, k === '' ? 'Automático' + sug : v, cur)).join('')}</select>`;
  }

  function openFinding(id) {
    const m = App.model;
    const f = m.findingsById.get(id);
    if (!f) return;
    const it = f.itemId ? m.itemsById.get(f.itemId) : null;
    const c = m.companies.get(f.companyId);
    const R_ = L.REGRAS[f.ruleId];
    openDrawer(`<div class="dh"><div>
        <div class="row">${forcaPill(f.forca)}${tipoPill(f.tipo, f.tributoCodigo)}<span class="pill neutro">${h(f.categoria)}</span></div>
        <h3 style="margin-top:8px">${h(f.regra)}</h3>
        <div class="sub">NF ${h(f.numero)} · ${h(U.fmtCNPJ(f.cnpjRemetente))}${f.ufRemetente ? '/' + h(f.ufRemetente) : ''} · ref. ${h(U.refLabel(f.referencia))} · ${h(nomeCurto(c))}</div>
      </div><button class="btn icon ghost close" type="button" data-act="close-drawer" aria-label="Fechar">${ic('x')}</button></div>
      <div class="db">
        <div class="kv card card-pad">
          <div><span>ICMS cobrado</span><b>${U.brl(f.icmsCobrado)}</b></div>
          <div><span>Valor a revisar</span><b style="color:var(--${f.forca})">${U.brl(f.valorRevisar)}</b></div>
          <div><span>Devido estimado</span><b>${f.valorDevido === null ? '—' : U.brl(f.valorDevido)}</b></div>
          <div><span>Ação sugerida</span><b>${h(f.acao)}</b></div>
        </div>
        <div class="sec"><h4>Resumo</h4><div>${h(f.resumo)}</div>${f.descricao ? `<div class="small" style="margin-top:4px"><b>${h(f.descricao)}</b> <span class="sub">${h(ncmCest(f.ncm, f.cest))}</span></div>` : ''}</div>
        ${itemKV(it)}
        ${it && it.tipo === 'ST' ? `<div class="sec"><h4>Destinação do produto</h4><div class="row">${destSelect(it)}<span class="small muted">Vale para as próximas análises desta empresa (por GTIN ou descrição).</span></div></div>` : ''}
        <div class="sec"><h4>Fundamentação</h4><div class="fundbox">${h(f.fundamentacao)}</div>
          <div class="row" style="margin-top:8px"><button class="btn sm" type="button" data-act="copy-fund" data-fid="${h(f.id)}">${ic('copy')} Copiar fundamentação</button></div></div>
        <div class="sec"><h4>Base legal</h4><div class="lawlist">${f.baseLegal.map(id2 => { const n = L.NORMAS[id2]; return n ? `<div class="law"><b>${h(n.cit)}${n.url ? ` <a href="${h(n.url)}" target="_blank" rel="noopener" title="Abrir a norma">${ic('external')}</a>` : ''}</b><span>${h(n.texto)}</span></div>` : ''; }).join('')}</div></div>
        <div class="sec"><h4>Documentos para anexar</h4><ul class="steps small">${(f.documentos || []).map(d => `<li>${h(d)}</li>`).join('')}</ul></div>
        <div class="sec card card-pad"><h4>Acompanhamento do pedido</h4>
          <div class="grid g2">
            <label class="field"><span>Status</span><select data-dec="status" data-fid="${h(f.id)}">${Object.entries(L.STATUS).map(([k, v]) => opt(k, v, f.status)).join('')}</select></label>
            <label class="field"><span>Protocolo</span><input type="text" data-dec="protocolo" data-fid="${h(f.id)}" value="${h(f.protocolo)}" placeholder="nº do pedido"></label>
            <label class="field"><span>Data do pedido</span><input type="date" data-dec="data" data-fid="${h(f.id)}" value="${h(f.dataPedido)}"></label>
            <label class="field"><span>Observações</span><input type="text" data-dec="obs" data-fid="${h(f.id)}" value="${h(f.obs)}"></label>
          </div>
        </div>
        <div class="row"><button class="btn" type="button" data-act="open-nf" data-nf="${h(f.nfKey)}">${ic('file')} Ver a NF completa</button><span class="sub">${h(R_.categoria)} · ${h(L.FORCAS[f.forca].desc)}</span></div>
      </div>`);
  }

  function saveDecision(el) {
    const id = el.dataset.fid, k = el.dataset.dec;
    const dec = App.state.decisions[id] || {};
    dec[k] = el.value;
    if (k === 'status' && el.value === 'solicitado' && !dec.data) dec.data = U.today();
    dec.atualizadoEm = new Date().toISOString();
    App.state.decisions[id] = dec;
    recompute(); persist();
    renderNav();
    if (App.ui.view === 'revisao') renderRevResults();
    if (k === 'status' && el.value === 'solicitado') { const inp = document.querySelector(`[data-dec="data"][data-fid="${CSS.escape(id)}"]`); if (inp && !inp.value) inp.value = dec.data; }
  }

  function setDestinacao(el) {
    const it = App.model.itemsById.get(el.dataset.dest);
    if (!it) return;
    const g = U.digits(it.gtin);
    const key = g.length >= 8 ? `${it.companyId}|G${g}` : `${it.companyId}|D${U.normKey(it.descricao).slice(0, 50)}`;
    E.catKeys(it.companyId, it).filter(k => !k.startsWith('*|')).forEach(k => { delete App.state.catalog[k]; });
    if (el.value) App.state.catalog[key] = { destinacao: el.value, descricao: it.descricao, ncm: it.ncm, gtin: g, companyId: it.companyId, atualizadoEm: new Date().toISOString() };
    commit({ render: false });
    renderNav();
    if (App.ui.view === 'revisao') renderRevResults();
    if (App.ui.view === 'notas') renderNotasResults();
    toast(el.value ? `Destinação "${L.DESTINACOES[el.value]}" registrada para este produto.` : 'Destinação voltou para automático.', 'ok');
    const dr = $('#drawer');
    if (dr.classList.contains('open') && dr.dataset.nf) openNF(dr.dataset.nf);
  }

  /* ============================================================
   * Notas e itens
   * ============================================================ */
  function nfRows() {
    const m = App.model;
    const f = App.ui.notas;
    const q = U.norm(f.q);
    return m.nfs.map(nf => {
      const chs = nf.charges.filter(inScope);
      if (!chs.length) return null;
      const st = chs.filter(c => c.tipo === 'ST'), eq = chs.filter(c => c.tipo === 'EQ');
      const fs = m.findings.filter(x => x.nfKey === nf.key && inScope(x) && !['descartado', 'indeferido'].includes(x.status));
      return {
        nf, chs, st, eq, stICMS: U.sum(st, c => c.valorICMS), eqICMS: U.sum(eq, c => c.valorICMS),
        baseST: U.sum(st, c => c.somaBase), baseEQ: U.sum(eq, c => c.somaBase), semItens: chs.some(c => !c.itens.length),
        rev: U.sum(chs, c => c.revisao.total), fs, flag: (App.state.noteFlags || {})[nf.key]
      };
    }).filter(Boolean).filter(r => (!f.tipo || (f.tipo === 'AMBOS' ? r.st.length && r.eq.length : f.tipo === 'ST' ? r.st.length : r.eq.length))
      && (!f.achados || r.rev > 0)
      && (!q || U.norm([r.nf.numero, r.nf.cnpjRemetente, U.fmtCNPJ(r.nf.cnpjRemetente), r.nf.chave, r.nf.remetenteNome, r.nf.ufRemetente].concat(r.chs.flatMap(c => c.itens.map(i => i.descricao + ' ' + i.ncm + ' ' + (i.cest || '')))).join(' ')).includes(q)))
      .sort((a, b) => b.rev - a.rev || (+a.nf.numero - +b.nf.numero));
  }

  function viewNotas() {
    const f = App.ui.notas;
    return `<div class="card">
      <div class="toolbar">
        <div class="search">${ic('search')}<input type="search" data-f="notas.q" value="${h(f.q)}" placeholder="Buscar NF, CNPJ, chave, produto, NCM…" aria-label="Buscar notas"></div>
        <select data-f="notas.tipo" aria-label="Tributo">${opt('', 'Todas as cobranças', f.tipo)}${opt('ST', 'Com ICMS-ST', f.tipo)}${opt('EQ', 'Com Equalização', f.tipo)}${opt('AMBOS', 'Cobradas nos dois (ST e EQ)', f.tipo)}</select>
        <label class="check small"><input type="checkbox" data-f="notas.achados" ${f.achados ? 'checked' : ''}> Somente com valor a revisar</label>
      </div>
      <div id="notas-results"></div>
    </div>`;
  }

  function coverBar(r) {
    const v = r.nf.valorNF || 0;
    if (!v) return '<span class="sub">—</span>';
    const s = Math.min(100, r.baseST / v * 100), e = Math.min(100 - s, r.baseEQ / v * 100);
    const tot = (r.baseST + r.baseEQ) / v * 100;
    const over = tot > 100.2;
    return `<div class="cover" title="Base ST ${U.brl(r.baseST)} · Base EQ ${U.brl(r.baseEQ)} · Valor NF ${U.brl(v)} (${U.fmt(tot, 1)}%)"><div class="bar"><span class="st" style="width:${s.toFixed(1)}%"></span><span class="${over ? 'over' : 'eq'}" style="width:${(over ? 100 - s : e).toFixed(1)}%"></span></div><div class="sub">${r.semItens ? 'sem memória' : U.fmt(tot, 1) + '% da NF'}${over ? ' · <b style="color:var(--forte)">excede</b>' : ''}</div></div>`;
  }

  function renderNotasResults() {
    const box = $('#notas-results');
    if (!box) return;
    const rows = nfRows();
    const f = App.ui.notas;
    const pages = Math.max(1, Math.ceil(rows.length / PAGE));
    if (f.page > pages) f.page = pages;
    const slice = rows.slice((f.page - 1) * PAGE, f.page * PAGE);
    box.innerHTML = `<div class="sumline"><b>${rows.length} nota(s)</b><span class="muted small">· ICMS-ST ${U.brl(U.sum(rows, r => r.stICMS))} · Equalização ${U.brl(U.sum(rows, r => r.eqICMS))} · a revisar ${U.brl(U.sum(rows, r => r.rev))}</span>
      <div class="sp"><span class="small muted"><i class="dot" style="background:#6366f1"></i> base ST <i class="dot" style="background:#db2777;margin-left:8px"></i> base EQ</span></div></div>
      <div class="table-wrap"><table class="data">
      <thead><tr><th>NF</th><th>Remetente</th><th>Emissão</th><th class="num">Valor da NF</th><th class="num">ICMS-ST</th><th class="num">Equalização</th><th>Bases × valor da NF</th><th class="num">A revisar</th><th>Achados</th><th>Situação</th></tr></thead>
      <tbody>${slice.length ? slice.map(r => {
        const cnt = U.groupBy(r.fs, x => x.forca);
        return `<tr class="click" data-nf="${h(r.nf.key)}" tabindex="0">
          <td class="nowrap"><b>${h(r.nf.numero)}</b><div class="sub">${r.chs.map(c => U.refLabel(c.referencia)).filter((v, i, a) => a.indexOf(v) === i).join(', ')}</div></td>
          <td class="small">${h(r.nf.remetenteNome || U.fmtCNPJ(r.nf.cnpjRemetente))}<div class="sub">${h(r.nf.ufRemetente || '')}</div></td>
          <td class="small nowrap">${h(U.brDate(r.nf.dataEmissao))}</td>
          <td class="num">${U.brl(r.nf.valorNF)}</td>
          <td class="num">${r.st.length ? U.brl(r.stICMS) : '<span class="sub">—</span>'}</td>
          <td class="num">${r.eq.length ? U.brl(r.eqICMS) : '<span class="sub">—</span>'}</td>
          <td>${coverBar(r)}</td>
          <td class="num strong">${r.rev ? U.brl(r.rev) : '<span class="sub">—</span>'}</td>
          <td class="nowrap">${['forte', 'moderada', 'atencao'].filter(k => cnt[k]).map(k => `<span class="pill ${k}">${cnt[k].length}</span>`).join(' ') || '<span class="sub">—</span>'}</td>
          <td class="small">${r.flag && r.flag.situacao ? `<span class="pill forte">${h(L.SITUACOES_NF[r.flag.situacao])}</span>` : '<span class="sub">Normal</span>'}</td></tr>`;
      }).join('') : '<tr class="empty-row"><td colspan="10">Nenhuma nota no filtro.</td></tr>'}</tbody></table></div>
      ${pages > 1 ? `<div class="pager">Página ${f.page} de ${pages}<button class="btn sm" type="button" data-act="page" data-t="notas" data-p="${f.page - 1}" ${f.page <= 1 ? 'disabled' : ''}>Anterior</button><button class="btn sm" type="button" data-act="page" data-t="notas" data-p="${f.page + 1}" ${f.page >= pages ? 'disabled' : ''}>Próxima</button></div>` : ''}`;
  }

  function openNF(key) {
    const m = App.model;
    const nf = m.nfsByKey.get(key);
    if (!nf) return;
    const c = m.companies.get(nf.companyId);
    const flag = (App.state.noteFlags || {})[key] || {};
    const fsNF = m.findings.filter(x => x.nfKey === key && !['descartado'].includes(x.status));
    const fByItem = U.groupBy(fsNF.filter(x => x.itemId), x => x.itemId);
    const chs = nf.charges.slice().sort((a, b) => a.tipo.localeCompare(b.tipo) || String(a.referencia).localeCompare(String(b.referencia)));
    const baseST = U.sum(chs.filter(x => x.tipo === 'ST'), x => x.somaBase), baseEQ = U.sum(chs.filter(x => x.tipo === 'EQ'), x => x.somaBase);
    const sinais = it => {
      const l = fByItem[it.id] || [];
      return (it.dupEQ || it.dupST ? '<div class="tag-dup">Duplicado ST × EQ</div>' : '') + l.map(x => `<a href="#" data-act="open-finding" data-fid="${h(x.id)}" class="pill ${x.forca}" style="text-decoration:none;margin:1px 2px 1px 0" title="${h(x.resumo)}">${h(L.REGRAS[x.ruleId].nome)}</a>`).join('');
    };
    const tabela = ch => {
      if (!ch.itens.length) return `<div class="callout warn">Memória de cálculo desta cobrança não importada. <a href="#" data-go="importar">Importar</a></div>`;
      if (ch.tipo === 'ST') return `<div class="table-wrap"><table class="data"><thead><tr><th>Item</th><th class="num">Custo final</th><th class="num">MVA aj.</th><th class="num">Crédito</th><th class="num">ICMS</th><th>Destinação</th><th>Sinais</th></tr></thead><tbody>${ch.itens.map(it => `<tr>
        <td class="desc"><div class="small strong">${h(it.descricao)}</div><div class="sub">${h(ncmCest(it.ncm, it.cest) || 'sem NCM/CEST')}</div></td>
        <td class="num">${U.brl(it.custoFinal)}</td><td class="num">${it.mvaAj === null ? '—' : U.pct(it.mvaAj)}</td><td class="num">${U.brl(it.credito)}</td><td class="num strong">${U.brl(it.icms)}</td>
        <td>${destSelect(it)}</td><td style="min-width:140px">${sinais(it)}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td>Total (${ch.itens.length} itens)</td><td class="num">${U.brl(ch.somaBase)}</td><td></td><td></td><td class="num">${U.brl(ch.somaItensICMS)}</td><td colspan="2"></td></tr></tfoot></table></div>`;
      return `<div class="table-wrap"><table class="data"><thead><tr><th>Item</th><th class="num">Base</th><th class="num">%</th><th class="num">ICMS</th><th>Sinais</th></tr></thead><tbody>${ch.itens.map(it => `<tr>
        <td class="desc"><div class="small strong">${h(it.descricao)}</div><div class="sub">NCM ${h(U.fmtNCM(it.ncm))}${it.ncmTruncado ? ' (truncado)' : ''}</div></td>
        <td class="num">${U.brl(it.base)}</td><td class="num">${U.fmt(it.percentual || 0, 2)}</td><td class="num strong">${U.brl(it.icms)}</td><td style="min-width:140px">${sinais(it)}</td></tr>`).join('')}</tbody>
        <tfoot><tr><td>Total (${ch.itens.length} itens)</td><td class="num">${U.brl(ch.somaBase)}</td><td></td><td class="num">${U.brl(ch.somaItensICMS)}</td><td></td></tr></tfoot></table></div>`;
    };
    const somaBases = baseST + baseEQ;
    openDrawer(`<div class="dh"><div>
        <h3>NF ${h(nf.numero)}${nf.remetenteNome ? ' · ' + h(nf.remetenteNome) : ''}</h3>
        <div class="sub">${h(U.fmtCNPJ(nf.cnpjRemetente))}${nf.ufRemetente ? '/' + h(nf.ufRemetente) : ''} · emissão ${h(U.brDate(nf.dataEmissao))} · ${h(nomeCurto(c))}</div>
        ${nf.chave ? `<div class="mono sub" style="margin-top:4px">${h(nf.chave)} <a href="#" data-act="copy-text" data-text="${h(nf.chave)}" title="Copiar chave">${ic('copy')}</a></div>` : ''}
      </div><button class="btn icon ghost close" type="button" data-act="close-drawer" aria-label="Fechar">${ic('x')}</button></div>
      <div class="db">
        <div class="kv card card-pad">
          <div><span>Valor da NF</span><b>${U.brl(nf.valorNF)}</b></div>
          <div><span>Base ST + base EQ</span><b style="color:${somaBases - nf.valorNF > 1 ? 'var(--forte)' : 'inherit'}">${U.brl(somaBases)}</b></div>
          <div><span>Conferência</span><b>${!nf.valorNF ? '—' : Math.abs(somaBases - nf.valorNF) <= 1 ? 'Bases = valor da NF' : somaBases > nf.valorNF ? `Excede em ${U.brl(somaBases - nf.valorNF)}` : `${U.fmt(somaBases / nf.valorNF * 100, 1)}% da NF cobrada`}</b></div>
          <div><span>A revisar</span><b>${U.brl(U.sum(chs, x => x.revisao.total))}</b></div>
        </div>
        <div class="sec card card-pad"><h4>Situação da NF</h4>
          <div class="grid g2"><label class="field"><span>Situação</span><select data-nfflag="situacao" data-nf="${h(key)}">${Object.entries(L.SITUACOES_NF).map(([k, v]) => opt(k, v, flag.situacao || '')).join('')}</select></label>
          <label class="field"><span>Observação / documento</span><input type="text" data-nfflag="obs" data-nf="${h(key)}" value="${h(flag.obs || '')}" placeholder="Ex.: NF-e de devolução nº 123"></label></div>
          <div class="sub" style="margin-top:6px">Se a NF foi devolvida, cancelada ou a mercadoria não chegou, marque aqui: o pedido de desvinculação é gerado com a fundamentação.</div>
        </div>
        ${chs.map(ch => `<div class="sec"><div class="row" style="margin-bottom:8px">${tipoPill(ch.tipo, ch.tributoCodigo)}<b>${h(ch.tributoNome || '')}</b><span class="sub">ref. ${h(U.refLabel(ch.referencia))} · cobrado ${U.brl(ch.valorICMS)}${ch.itens.length ? ` · soma dos itens ${U.brl(ch.somaItensICMS)}` : ''}</span>${ch.revisao.total ? `<span class="pill forte" style="margin-left:auto">a revisar ${U.brl(ch.revisao.total)}</span>` : ''}</div>${tabela(ch)}</div>`).join('')}
        ${nf.xml ? `<div class="callout ok">XML da NF-e importado: destinatário ${h(U.fmtCNPJ(nf.xml.data.destinatario.cnpj))}, ${nf.xml.data.itens.length} itens, ICMS-ST destacado ${U.brl(nf.xml.data.totais.vST)}.</div>` : '<div class="callout">Dica: importe o XML desta NF-e para confirmar ICMS-ST retido pelo remetente, destinatário e linhas repetidas.</div>'}
      </div>`, { nf: key });
  }

  function setNfFlag(el) {
    const key = el.dataset.nf;
    const cur = App.state.noteFlags[key] || {};
    cur[el.dataset.nfflag] = el.value;
    if (!cur.situacao && !cur.obs) delete App.state.noteFlags[key]; else App.state.noteFlags[key] = cur;
    commit({ render: false });
    renderNav();
    if (App.ui.view === 'notas') renderNotasResults();
    if (App.ui.view === 'revisao') renderRevResults();
    if (el.dataset.nfflag === 'situacao') toast(el.value ? 'Situação registrada: a NF entrou na lista de revisão.' : 'Situação normal restaurada.', 'ok');
  }

  /* ============================================================
   * Empresas
   * ============================================================ */
  function viewEmpresas() {
    const comps = [...App.model.companies.values()].sort((a, b) => nomeCurto(a).localeCompare(nomeCurto(b)));
    const card = c => {
      const ini = nomeCurto(c).split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
      const cnaes = [c.cnaePrincipal].concat(c.cnaesSecundarios || []).filter(Boolean);
      const ind = c.industrial === true || (c.industrial !== false && c.cnaePrincipal && U.cnaeIndustrial(c.cnaePrincipal.codigo));
      const ali = cnaes.some(x => U.cnaeAlimentacao(x.codigo));
      const me = E.meStatus(c, App.ui.ref || App.model.refs[0] || '', '');
      const field = (k, lb, val, type = 'text', extra = '') => `<label class="field"><span>${h(lb)}</span><input type="${type}" data-comp="${k}" data-cid="${h(c.id)}" value="${h(val ?? '')}" ${extra}></label>`;
      return `<div class="card company">
        <div class="top"><div class="avatar">${h(ini || '?')}</div><div style="min-width:0"><h3>${h(nomeCurto(c))}</h3><div class="sub">${h(c.razaoSocial || '')}</div>
          <div class="row" style="margin-top:6px"><span class="pill ok">Simples Nacional</span>${c.porte ? `<span class="pill neutro">${h(c.porte)}</span>` : '<span class="pill moderada">porte?</span>'}${ind ? '<span class="pill atencao">Industrial</span>' : ''}${ali ? '<span class="pill neutro">Alimentação</span>' : ''}${me.status === 'isenta' ? '<span class="pill ok">Isenta EQ (Dec. 16.177)</span>' : ''}</div></div></div>
        <div class="meta">
          <div><span>CNPJ</span>${h(U.fmtCNPJ(c.cnpj) || '—')}</div><div><span>Inscrição estadual</span>${h(c.ie || '—')}</div>
          <div><span>Município/UF</span>${h([c.municipio, c.uf].filter(Boolean).join('/') || '—')}</div><div><span>Abertura</span>${h(U.brDate(c.dataAbertura) || '—')}</div>
          <div><span>Situação</span>${h(c.situacao || '—')}</div><div><span>Fonte</span>${c.fonte === 'cartao' ? `Cartão CNPJ de ${h(U.brDate(c.cartaoEmitidoEm) || '')}` : c.fonte === 'previa' ? 'Relatório de prévia' : 'Cadastro manual'}</div>
        </div>
        <div class="cnaes"><div class="small strong">Atividades (CNAE)${cnaes.length ? '' : ' — <span class="muted">importe o cartão CNPJ</span>'}</div>
          ${cnaes.map((x, i) => `<div class="cnae ${i === 0 ? 'principal' : ''}"><code>${h(x.codigo)}</code><span>${h(x.descricao)}${i === 0 ? ' <span class="sub">(principal)</span>' : ''}</span></div>`).join('')}</div>
        <div class="edit">
          ${c.fonte !== 'cartao' ? field('razaoSocial', 'Razão social', c.razaoSocial) + field('nomeFantasia', 'Nome fantasia', c.nomeFantasia) + field('cnpj', 'CNPJ', U.fmtCNPJ(c.cnpj)) : ''}
          ${field('ie', 'Inscrição estadual', c.ie)}
          <label class="field"><span>Porte</span><select data-comp="porte" data-cid="${h(c.id)}">${opt('', '—', c.porte)}${opt('ME', 'ME', c.porte)}${opt('EPP', 'EPP', c.porte)}${opt('MEI', 'MEI', c.porte)}${opt('DEMAIS', 'Demais', c.porte)}</select></label>
          ${field('receitaAnoAnterior', 'Receita bruta do ano anterior (R$)', c.receitaAnoAnterior, 'text', 'inputmode="decimal" placeholder="para a isenção de ME"')}
          <label class="field"><span>Na lista de beneficiários (Dec. 16.177)?</span><select data-comp="beneficiarioME" data-cid="${h(c.id)}">${opt('', 'Não sei', c.beneficiarioME)}${opt('sim', 'Sim', c.beneficiarioME)}${opt('nao', 'Não', c.beneficiarioME)}</select></label>
          <label class="field"><span>Estabelecimento industrial?</span><select data-comp="industrial" data-cid="${h(c.id)}">${opt('', 'Automático (pelo CNAE)', c.industrial === null || c.industrial === undefined ? '' : String(c.industrial))}${opt('true', 'Sim', String(c.industrial))}${opt('false', 'Não', String(c.industrial))}</select></label>
          ${field('signatario.nome', 'Signatário do requerimento', (c.signatario || {}).nome)}
          ${field('signatario.cargo', 'Cargo / CRC', (c.signatario || {}).cargo)}
        </div>
        <div class="foot"><button class="btn sm" type="button" data-go="revisao" data-empresa="${h(c.id)}">${ic('checklist')} Revisão</button><button class="btn sm" type="button" data-act="pick-files">${ic('upload')} Atualizar pelo cartão CNPJ</button><button class="btn sm ghost danger" type="button" data-act="rm-company" data-cid="${h(c.id)}" style="margin-left:auto">${ic('trash')} Remover</button></div>
      </div>`;
    };
    return `<div class="stack">
      <div class="row"><div class="muted small" style="margin-right:auto">As atividades (CNAE) do cartão CNPJ ficam salvas e orientam a análise: insumos para lanchonete/indústria, isenção de ME, estabelecimento industrial.</div>
        <button class="btn" type="button" data-act="pick-files">${ic('upload')} Importar cartão CNPJ</button><button class="btn" type="button" data-act="add-company">${ic('plus')} Nova empresa</button></div>
      ${comps.length ? `<div class="companies">${comps.map(card).join('')}</div>` : `<div class="card empty"><div class="ico">${ic('building')}</div><h3>Nenhuma empresa cadastrada</h3><p>Importe o cartão CNPJ (PDF da Receita Federal) ou um relatório de prévia da SEFAZ/MS — a empresa é criada automaticamente.</p></div>`}
    </div>`;
  }

  function setCompanyField(el) {
    const c = App.state.companies.find(x => x.id === el.dataset.cid);
    if (!c) return;
    const k = el.dataset.comp;
    let v = el.value;
    if (k === 'cnpj') v = U.digits(v);
    if (k === 'ie') v = U.digits(v);
    if (k === 'receitaAnoAnterior') v = v.trim() ? U.num(v) : '';
    if (k === 'industrial') v = v === '' ? null : v === 'true';
    if (k === 'porte') c.porteManual = true;
    if (k.startsWith('signatario.')) { c.signatario = c.signatario || {}; c.signatario[k.split('.')[1]] = v; }
    else c[k] = v;
    commit();
  }

  function removeCompany(cid) {
    const c = App.state.companies.find(x => x.id === cid);
    if (!c) return;
    const m = App.model;
    const docs = App.state.docs.filter(d => (d.link && d.link.companyId === cid) || (d.kind === 'itens' && (m.chargesById.get(m.docCharge.get(d.id)) || {}).companyId === cid));
    if (!global.confirm(`Remover "${nomeCurto(c)}" e ${docs.length} documento(s) vinculado(s)? Esta ação não pode ser desfeita (exceto por backup).`)) return;
    App.state.companies = App.state.companies.filter(x => x.id !== cid);
    App.state.docs = App.state.docs.filter(d => !docs.includes(d));
    if (App.ui.empresa === cid) App.ui.empresa = '';
    commit();
    toast('Empresa removida.', 'ok');
  }

  /* ============================================================
   * Tabelas e regras
   * ============================================================ */
  function observedMva() {
    const its = App.model.items.filter(i => i.tipo === 'ST' && i.mvaOrig !== null);
    const g = U.groupBy(its, i => U.digits(i.cest) || 'N' + i.ncm);
    return Object.entries(g).map(([k, l]) => {
      const vals = U.uniq(l.map(i => U.round2(i.mvaOrig))).sort((a, b) => a - b);
      const clusters = [];
      vals.forEach(v => { const last = clusters[clusters.length - 1]; if (last && v - last[last.length - 1] <= 0.3) last.push(v); else clusters.push([v]); });
      return { key: k, cest: U.digits(l[0].cest), ncms: U.uniq(l.map(i => i.ncm)), ex: l[0].descricao, n: l.length, clusters: clusters.map(c => c[0]), ajs: U.uniq(l.map(i => `${U.fmt(i.mvaAj, 2)}% (${i.aliqInter}%)`)), temTab: l.some(i => i.mvaRef) };
    }).sort((a, b) => b.n - a.n);
  }

  /* ---------- Relação oficial (Subanexo I do Anexo III do RICMS/MS) ---------- */
  const subanexoAtual = () => (App.state.subanexo && App.state.subanexo.itens) ? App.state.subanexo : (global.RST_SUBANEXO_PADRAO || null);

  function subResultados() {
    const sub = subanexoAtual();
    const q = String(App.ui.subQ || '').trim();
    if (!sub || q.length < 3) return '<div class="muted small">Digite ao menos 3 caracteres.</div>';
    const res = global.RST_SUB.pesquisar(sub, q, 40);
    if (!res.length) return '<div class="muted small">Nada encontrado na relação.</div>';
    const mv = v => v === undefined || v === null ? '—' : U.fmt(v, 2);
    return `<div class="table-wrap"><table class="data"><thead><tr><th>Item / CEST</th><th>NCM</th><th>Descrição</th><th class="num">MVA orig.</th><th class="num">4%</th><th class="num">7%</th><th class="num">12%</th></tr></thead><tbody>
      ${res.map(e => `<tr><td class="small nowrap">${h(e.item)}<div class="sub">${h(U.fmtCEST(e.cest))} · seg. ${h(e.seg)}</div></td><td class="small">${h((e.ncm || []).map(U.fmtNCM).join(', ') || '—')}</td><td class="small">${h(e.desc)}${e.cond ? `<div class="sub">${h(e.cond)}</div>` : ''}${e.mvaTxt ? `<div class="sub">MVA: ${h(e.mvaTxt)}</div>` : ''}</td><td class="num">${mv(e.mva)}</td><td class="num">${mv(e.mva4)}</td><td class="num">${mv(e.mva7)}</td><td class="num">${mv(e.mva12)}</td></tr>`).join('')}
      </tbody></table></div>${res.length === 40 ? '<div class="tiny muted">Mostrando os 40 primeiros — refine a busca.</div>' : ''}`;
  }

  function cardSubanexo(S) {
    const sub = subanexoAtual();
    if (!sub || !global.RST_SUB) return '';
    const proprio = !!(App.state.subanexo && App.state.subanexo.itens);
    const emUso = S.usarSubanexo !== false;
    const nSeg = U.uniq(sub.itens.map(e => e.seg)).length;
    return `<div class="card">
      <div class="card-head"><h3>Relação oficial de mercadorias com ST — Subanexo I do Anexo III do RICMS/MS</h3><span class="pill ${emUso ? 'ok' : 'neutro'}">${emUso ? 'em uso' : 'desligada'}</span></div>
      <div class="card-pad stack">
        <div class="muted small">${U.int(sub.itens.length)} itens em ${nSeg} segmentos · ${proprio ? 'versão importada por você' : 'versão que acompanha o app'}${sub.obtidoEm ? `, obtida em ${h(U.brDate(sub.obtidoEm))}` : ''}${sub.ultimoDecreto ? `, com alterações até o ${h(sub.ultimoDecreto)}` : ''}. Com ela, o app confere a MVA de cada item de ST, aponta mercadoria fora da lista e mostra a descrição oficial do item. Itens que você cadastrar na tabela de MVA abaixo prevalecem sobre a relação.</div>
        <div class="row" style="flex-wrap:wrap;gap:8px">
          <label class="check"><input type="checkbox" data-set="usarSubanexo" ${emUso ? 'checked' : ''}> Usar a relação oficial nas conferências</label>
          <span class="sp"></span>
          <button class="btn sm" type="button" data-act="sub-importar">${ic('upload')} Atualizar com nova versão (.docx)</button>
          ${proprio ? '<button class="btn sm ghost" type="button" data-act="sub-padrao">Voltar à versão do app</button>' : ''}
        </div>
        <div class="tiny muted">Para atualizar: baixe o Subanexo I no site da SEFAZ/MS, abra no Word e salve como "Documento do Word (.docx)"; depois clique em "Atualizar". O app lê só a redação em vigor (ignora as redações anteriores).</div>
        <label class="field"><span>Consultar a relação (NCM, CEST ou palavras da descrição)</span><input type="search" id="sub-q" value="${h(App.ui.subQ || '')}" placeholder="Ex.: 3924, 14.006.00, cadeado" autocomplete="off"></label>
        <div id="sub-res">${String(App.ui.subQ || '').trim().length >= 3 ? subResultados() : ''}</div>
      </div>
    </div>`;
  }

  /** Relação dos itens no modelo do SOS Reforma — uma planilha por empresa, no escopo do topo (empresa e referência). */
  function exportarSOS() {
    try {
      const res = R.exportarSOSReforma(App.model, App.ui.empresa, App.ui.ref);
      if (!res.length) return toast('Nenhum item de ST ou de Equalização na empresa e referência escolhidas no topo.', 'err', 6000);
      const ok = res.filter(r => !r.erro), semCnpj = res.filter(r => r.erro);
      const partes = ok.map(r => `${r.empresa}: ${r.produtos} produto(s)${r.ncmIncompleto ? `, ${r.ncmIncompleto} com NCM incompleto` : ''}`);
      if (semCnpj.length) partes.push(`não exportado, empresa sem CNPJ: ${semCnpj.map(r => r.empresa).join(', ')} (importe o cartão CNPJ ou informe o CNPJ em Empresas)`);
      toast(h(`${ok.length ? 'Relação para o SOS Reforma gerada — ' : ''}${partes.join(' · ')}.`), ok.length ? 'ok' : 'err', 9000);
    } catch (e) { toast('Erro: ' + h(e.message), 'err'); }
  }

  async function importarSubanexo() {
    const inp = document.createElement('input');
    inp.type = 'file'; inp.accept = '.docx,.doc';
    inp.addEventListener('change', async () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      try {
        const dados = global.RST_SUB.lerDocx(await f.arrayBuffer());
        const atual = subanexoAtual();
        const nSeg = U.uniq(dados.itens.map(e => e.seg)).length;
        if (!global.confirm(`Relação lida: ${dados.itens.length} itens em ${nSeg} segmentos${dados.ultimoDecreto ? `, com alterações até o ${dados.ultimoDecreto}` : ''}.${atual ? ` A versão em uso tem ${atual.itens.length} itens.` : ''}\n\nUsar esta versão nas conferências?`)) return;
        App.state.subanexo = Object.assign({ fonte: 'RICMS/MS, Anexo III, Subanexo I', arquivo: f.name, obtidoEm: U.today() }, dados);
        commit();
        toast(`Relação oficial atualizada: ${dados.itens.length} itens.`, 'ok');
      } catch (err) { toast('Não foi possível ler o arquivo: ' + h(err.message), 'err', 8000); }
    });
    inp.click();
  }

  function viewTabelas() {
    const S = E.settingsOf(App.state);
    const mv = App.state.mvaTable;
    const obs = observedMva();
    const cat = Object.entries(App.state.catalog || {});
    const comps = App.model.companies;
    const kw = S.keywords;
    const num = (k, lb, v, step, suf) => `<label class="field"><span>${h(lb)}</span><input type="number" step="${step}" data-set="${k}" value="${h(v)}">${suf ? `<span class="tiny muted">${h(suf)}</span>` : ''}</label>`;
    return `<div class="stack">
      <div class="card card-pad stack">
        <h3>Parâmetros da análise</h3>
        <div class="grid g3">
          ${num('aliqInterna', 'Alíquota interna de MS (%)', S.aliqInterna, '0.01', 'usada quando a memória não traz a alíquota')}
          ${num('tolerancia', 'Tolerância de arredondamento (R$)', S.tolerancia, '0.01', 'diferenças menores são ignoradas')}
          ${num('outrosLimitePct', 'Alerta de "outros valores" acima de (%)', S.outrosLimitePct, '1', 'do valor da mercadoria')}
          <label class="field"><span>Cálculo do diferencial (uso e consumo)</span><select data-set="difalMetodo">${opt('por_dentro', 'Base "por dentro" (conservador)', S.difalMetodo)}${opt('simples', 'Diferença simples de alíquotas', S.difalMetodo)}</select></label>
          ${S.usarSubanexo === false ? `<label class="check" style="margin-top:20px"><input type="checkbox" data-set="tabelaSTCompleta" ${S.tabelaSTCompleta ? 'checked' : ''}> A tabela de ST abaixo é completa (itens fora dela = fora da ST)</label>` : ''}
        </div>
      </div>

      ${cardSubanexo(S)}

      <div class="card">
        <div class="card-head"><h3>Sua tabela de MVA (ajustes)</h3><span class="pill neutro">${mv.length}</span>
          <div class="sp"><button class="btn sm" type="button" data-act="mva-add">${ic('plus')} Linha</button><button class="btn sm" type="button" data-act="mva-export" ${mv.length ? '' : 'disabled'}>${ic('download')} CSV</button><button class="btn sm ghost danger" type="button" data-act="mva-clear" ${mv.length ? '' : 'disabled'}>${ic('trash')} Limpar</button></div></div>
        <div class="card-pad stack">
          <div class="muted small">Use para ajustes: uma MVA específica (regime especial, protocolo) ou um produto que você queira tratar de outro modo. O que for cadastrado aqui prevalece sobre a relação oficial. Colunas para colar: <b>CEST; NCM; Descrição; MVA original; MVA 4%; MVA 7%; MVA 12%; Fonte</b>.</div>
          <textarea id="mva-paste" rows="3" placeholder="17.003.00	1806.32.10	Chocolate em barras…	53,23	77,23	71,69	62,46	Subanexo I, item …"></textarea>
          <div class="row"><button class="btn sm primary" type="button" data-act="mva-import">${ic('plus')} Importar colagem</button></div>
        </div>
        ${mv.length ? `<div class="table-wrap"><table class="data"><thead><tr><th>CEST</th><th>NCM</th><th>Descrição</th><th class="num">MVA orig.</th><th class="num">MVA 4%</th><th class="num">MVA 7%</th><th class="num">MVA 12%</th><th>Fonte</th><th></th></tr></thead><tbody>
          ${mv.map((e, i) => `<tr>${['cest', 'ncm', 'descricao', 'mvaOriginal', 'mva4', 'mva7', 'mva12', 'fonte'].map(k => `<td><input type="text" data-mva="${k}" data-idx="${i}" value="${h(k === 'cest' ? U.fmtCEST(e[k]) || e[k] : k === 'ncm' ? U.fmtNCM(e[k]) : (typeof e[k] === 'number' ? U.fmt(e[k], 2) : e[k] ?? ''))}" style="width:${k === 'descricao' ? '220px' : k === 'fonte' ? '160px' : '96px'}"></td>`).join('')}<td><button class="btn sm ghost danger" type="button" data-act="mva-rm" data-idx="${i}" aria-label="Remover linha">${ic('trash')}</button></td></tr>`).join('')}
        </tbody></table></div>` : ''}
      </div>

      <div class="card">
        <div class="card-head"><h3>MVAs observadas nas memórias da SEFAZ</h3><span class="muted small">confira com o Subanexo I antes de usar como referência</span></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>CEST / NCM</th><th>Exemplo de produto</th><th class="num">Itens</th><th>MVA ajustada aplicada (alíq. inter.)</th><th>MVA original equivalente</th><th></th></tr></thead><tbody>
          ${obs.length ? obs.map(o => `<tr><td class="small nowrap">${h(o.cest ? U.fmtCEST(o.cest) : '—')}<div class="sub">${h(o.ncms.map(U.fmtNCM).join(', '))}</div></td><td class="small">${h(o.ex)}</td><td class="num">${o.n}</td><td class="small">${h(o.ajs.join(' · '))}</td>
            <td class="small">${o.clusters.length > 1 ? `<span class="pill moderada">divergente</span> ${h(o.clusters.map(v => U.pct(v)).join(' × '))}` : U.pct(o.clusters[0])}</td>
            <td>${o.temTab ? '<span class="pill ok">com referência</span>' : `<button class="btn sm" type="button" data-act="mva-from-obs" data-key="${h(o.key)}" ${o.clusters.length > 1 ? 'title="Valores divergentes: será usado o menor — confirme no Subanexo I"' : ''}>Usar como referência</button>`}</td></tr>`).join('') : '<tr class="empty-row"><td colspan="6">Importe memórias de cálculo do ST para ver as MVAs aplicadas.</td></tr>'}
        </tbody></table></div>
      </div>

      <div class="grid g2">
        <div class="card">
          <div class="card-head"><h3>Destinação dos produtos</h3><span class="pill neutro">${cat.length}</span></div>
          <div class="card-pad muted small" style="padding-bottom:0">Quando você define a destinação de um produto (insumo, uso e consumo, brinde/degustação, revenda), o sistema lembra e aplica nas próximas análises.</div>
          <div class="table-wrap"><table class="data"><thead><tr><th>Produto</th><th>Empresa</th><th>Destinação</th><th></th></tr></thead><tbody>
            ${cat.length ? cat.map(([k, e]) => `<tr><td class="small">${h(e.descricao || k)}<div class="sub">${h([e.gtin, U.fmtNCM(e.ncm)].filter(Boolean).join(' · '))}</div></td><td class="small">${h(e.companyId === '*' ? 'Todas' : nomeCurto(comps.get(e.companyId)))}</td>
              <td><select data-cat="${h(k)}">${Object.entries(L.DESTINACOES).filter(([kk]) => kk).map(([kk, v]) => opt(kk, v, e.destinacao)).join('')}</select></td>
              <td><button class="btn sm ghost danger" type="button" data-act="cat-rm" data-key="${h(k)}" aria-label="Remover">${ic('trash')}</button></td></tr>`).join('') : '<tr class="empty-row"><td colspan="4">Defina a destinação na tela da NF ou do achado.</td></tr>'}
          </tbody></table></div>
        </div>
        <div class="card card-pad stack">
          <h3>Palavras que sugerem a destinação</h3>
          <div class="muted small">Uma por linha. A sugestão aparece como achado "moderado" para você confirmar.</div>
          <label class="field"><span>Insumo / ingrediente</span><textarea rows="3" data-kw="insumo">${h((kw.insumo || []).join('\n'))}</textarea></label>
          <label class="field"><span>Brinde / degustação</span><textarea rows="3" data-kw="degustacao">${h((kw.degustacao || []).join('\n'))}</textarea></label>
          <label class="field"><span>Uso e consumo</span><textarea rows="3" data-kw="uso_consumo">${h((kw.uso_consumo || []).join('\n'))}</textarea></label>
        </div>
      </div>

      <div class="card card-pad stack">
        <h3>Dados e backup</h3>
        <div class="muted small">Os dados ficam salvos neste navegador. Para usar em outro computador ou guardar com segurança, exporte o backup (arquivo .json) — por exemplo, na pasta do OneDrive — e restaure onde precisar.</div>
        <div class="row"><button class="btn" type="button" data-act="backup">${ic('download')} Exportar backup</button><button class="btn" type="button" data-act="restore">${ic('upload')} Restaurar backup</button><button class="btn ghost danger" type="button" data-act="wipe">${ic('trash')} Apagar todos os dados</button></div>
      </div>
    </div>`;
  }

  function setSetting(el) {
    const k = el.dataset.set;
    App.state.settings = App.state.settings || {};
    App.state.settings[k] = el.type === 'checkbox' ? el.checked : el.type === 'number' ? (+el.value || 0) : el.value;
    commit();
  }
  function setKeywords(el) {
    const S = E.settingsOf(App.state);
    const kws = Object.assign({}, S.keywords);
    kws[el.dataset.kw] = el.value.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    App.state.settings = App.state.settings || {};
    App.state.settings.keywords = kws;
    commit({ render: false });
    toast('Palavras-chave salvas.', 'ok');
  }
  const numOrEmpty = v => (v === undefined || v === null || String(v).trim() === '') ? '' : U.num(v);
  function parseMvaPaste(text) {
    const rows = P.parseCSVText(String(text || '').trim());
    if (!rows.length) return [];
    let start = 0;
    let map = { cest: 0, ncm: 1, descricao: 2, mvaOriginal: 3, mva4: 4, mva7: 5, mva12: 6, fonte: 7 };
    const head = rows[0].map(c => U.norm(c));
    if (head.some(c => /[A-Z]{3,}/.test(c) && !/^\d/.test(c)) && !head.some(c => /^\d{2}\.?\d{3}\.?\d{2}$/.test(c))) {
      start = 1; map = {};
      head.forEach((c, i) => {
        if (/CEST/.test(c)) map.cest = i; else if (/NCM/.test(c)) map.ncm = i; else if (/DESCRI/.test(c)) map.descricao = i;
        else if (/ORIG/.test(c)) map.mvaOriginal = i; else if (/(^|\D)4(\D|$)/.test(c)) map.mva4 = i; else if (/(^|\D)7(\D|$)/.test(c)) map.mva7 = i; else if (/12/.test(c)) map.mva12 = i;
        else if (/FONTE|ITEM|REF|BASE LEGAL/.test(c)) map.fonte = i; else if (/MVA/.test(c) && map.mvaOriginal === undefined) map.mvaOriginal = i;
      });
    }
    return rows.slice(start).filter(r => r.some(x => String(x).trim())).map(r => ({
      id: U.uid(), cest: U.digits(r[map.cest]), ncm: U.digits(r[map.ncm]), descricao: String(r[map.descricao] ?? '').trim(),
      mvaOriginal: numOrEmpty(r[map.mvaOriginal]), mva4: numOrEmpty(r[map.mva4]), mva7: numOrEmpty(r[map.mva7]), mva12: numOrEmpty(r[map.mva12]),
      fonte: String(r[map.fonte] ?? '').trim() || 'Informado pelo usuário'
    })).filter(e => e.cest || e.ncm);
  }

  /* ============================================================
   * Ajuda
   * ============================================================ */
  function viewAjuda() {
    const regras = Object.entries(L.REGRAS);
    return `<div class="grid g2">
      <div class="card card-pad prose">
        <h3 style="margin-top:0">Passo a passo</h3>
        <ol class="steps">
          <li><b>Cartão CNPJ</b> de cada empresa (PDF da Receita): grava as atividades (CNAE), o porte e a data de abertura.</li>
          <li><b>Relatório de Prévia com Cálculos ICMS</b> de cada tributo — 333 (ST Comércio) e 349 (Equalização Simples Nacional) — em PDF.</li>
          <li><b>Memória de cálculo de cada NF</b>: para a Equalização, copie as páginas da tela "Dados da Nota" (cabeçalho da nota e tabela, 15 itens por página) e cole uma abaixo da outra no Excel — ou direto em <i>Importar → Colar a tabela</i>; o PDF da tela também serve, um arquivo por página. O app junta as páginas pela numeração "Visualizando 1 - 15 de N", ignora página repetida e avisa se faltar alguma. Para o ST, copie a tabela do portal e cole em <i>Importar → Colar a tabela</i> (ou salve em planilha com o nº da NF no nome, ex.: <i>NOTA 19192.xlsx</i>).</li>
          <li>Opcional: <b>XML das NF-e</b> — confirma ICMS-ST já retido pelo fornecedor, destinatário, CEST e linhas repetidas.</li>
          <li>Abra <b>Revisão</b>: filtre, confira cada achado, ajuste a destinação dos produtos e marque o status.</li>
          <li>Gere o <b>Excel</b> (com base legal e fundamentação), o <b>requerimento</b> (Word/PDF) e a <b>lista para o e-Fazenda</b>.</li>
          <li>Botão <b>SOS Reforma</b> (tela Revisão): gera a relação dos produtos no modelo do SOS Reforma — CNPJ, NCM, Descrição, GTIN e Código do Produto, um produto por linha — para conferir NCM e classificação. Vale a empresa e a referência escolhidas no topo; a empresa precisa ter CNPJ cadastrado.</li>
        </ol>
        <h3>Relação oficial de mercadorias com ST</h3>
        <p>O app traz a relação do <b>Subanexo I do Anexo III do RICMS/MS</b> (CEST, NCM, descrição e MVA original e ajustada a 4%, 7% e 12%). Com ela, confere a MVA aplicada pela SEFAZ em cada item de ST, aponta mercadoria fora da lista e mostra a descrição oficial para comparar com o produto. Item sem CEST na nota é procurado pelo NCM, valendo o item de classificação mais específica. Para usar uma versão mais nova, salve o Subanexo como .docx no Word e importe em <i>Tabelas e regras</i>.</p>
        <h3>O pedido na SEFAZ/MS</h3>
        <p>Pela Resolução SEFAZ nº 3.033/2019, o optante pelo Simples Nacional pede a revisão eletrônica no e-Fazenda (módulo Informações Fiscais). É <b>um pedido por mês de referência e por tributo</b> — por isso o sistema consolida tudo antes. Até o vencimento, as NFs contestadas ficam desvinculadas até a decisão (15 dias úteis). Depois, use o e-SAP (nova revisão, reconsideração ou restituição — Res. SEFAZ nº 3.426/2025).</p>
        <h3>Dica para o Simples Nacional</h3>
        <p>Os produtos cujo ICMS-ST foi pago devem sair com <b>CSOSN 500</b> e ter a receita segregada no PGDAS-D como "com substituição tributária" (LC nº 123/2006, art. 18, § 4º-A, I) — assim o ICMS não é pago de novo no DAS. Use o botão <b>Produtos c/ ST</b> na tela de Revisão para gerar a lista.</p>
        <div class="callout warn">Ferramenta de apoio. Os textos de fundamentação são modelos: confira a redação vigente das normas, as MVAs do Subanexo I do RICMS/MS e os documentos antes de protocolar.</div>
      </div>
      <div class="card">
        <div class="card-head"><h3>Checagens realizadas</h3><span class="pill neutro">${regras.length}</span></div>
        <div class="list">${regras.map(([id, r]) => `<div class="li"><i class="dot ${r.forca}" style="margin-top:6px"></i><div class="small"><b>${h(r.nome)}</b> <span class="sub">· ${h(r.categoria)} · ${h(L.FORCAS[r.forca].nome)}</span><div class="sub">${h(L.citacoes(r.base).join('; '))}</div></div></div>`).join('')}</div>
      </div>
    </div>`;
  }

  /* ============================================================
   * Requerimento e lista e-Fazenda
   * ============================================================ */
  function reqCandidates() {
    const fs = App.model.findings.filter(f => !['descartado', 'indeferido'].includes(f.status) && f.valorRevisar > 0);
    return U.groupBy(fs, f => `${f.companyId}|${f.referencia}|${f.tipo}`);
  }

  function openRequerimento(preset = {}) {
    const groups = reqCandidates();
    const keys = Object.keys(groups);
    if (!keys.length) return toast('Não há achados com valor a revisar para montar o requerimento.', 'err');
    const pick = keys.find(k => { const [c, r, t] = k.split('|'); return (!preset.companyId || c === preset.companyId) && (!preset.referencia || r === preset.referencia) && (!preset.tipo || t === preset.tipo); })
      || keys.find(k => { const [c, r] = k.split('|'); return (!App.ui.empresa || c === App.ui.empresa) && (!App.ui.ref || r === App.ui.ref); }) || keys[0];
    const [cid, ref, tipo] = pick.split('|');
    const c = App.model.companies.get(cid) || {};
    App.reqOpts = { companyId: cid, referencia: ref, tipo, forcas: ['forte', 'moderada'], somentePedir: false, data: U.today(), signatario: Object.assign({ nome: '', cargo: '' }, c.signatario || {}) };
    renderRequerimento();
  }

  function reqFindings() {
    const o = App.reqOpts;
    const all = (reqCandidates()[`${o.companyId}|${o.referencia}|${o.tipo}`] || []);
    const temPedir = all.some(f => f.status === 'pedir');
    return all.filter(f => o.forcas.includes(f.forca) && (!o.somentePedir || !temPedir || f.status === 'pedir'));
  }

  function renderRequerimento() {
    const o = App.reqOpts;
    const groups = reqCandidates();
    const keys = Object.keys(groups).sort();
    const fs = reqFindings();
    const res = fs.length ? R.requerimentoHTML(App.model, { companyId: o.companyId, referencia: o.referencia, tipo: o.tipo, findings: fs, data: o.data, signatario: o.signatario }) : null;
    App.reqHTML = res ? res.html : '';
    const label = k => { const [c, r, t] = k.split('|'); return `${nomeCurto(App.model.companies.get(c))} · ref. ${U.refLabel(r)} · ${t === 'ST' ? 'ICMS-ST' : 'Equalização'}`; };
    openModal(`<div class="mh"><h3>Requerimento de revisão</h3>
        <select data-req="grupo" aria-label="Empresa, referência e tributo">${keys.map(k => opt(k, label(k), `${o.companyId}|${o.referencia}|${o.tipo}`)).join('')}</select>
        <button class="btn primary" type="button" data-act="req-word" ${res ? '' : 'disabled'}>${ic('download')} Word (.doc)</button>
        <button class="btn" type="button" data-act="req-print" ${res ? '' : 'disabled'}>${ic('printer')} Imprimir / PDF</button>
        <button class="btn" type="button" data-act="req-mark" ${res ? '' : 'disabled'} title="Marca os achados incluídos como Solicitado">${ic('check')} Marcar como solicitado</button>
        <button class="btn icon ghost" type="button" data-act="close-modal" aria-label="Fechar">${ic('x')}</button></div>
      <div class="mb">
        <div class="row">
          <span class="small muted">Incluir:</span>
          ${['forte', 'moderada', 'atencao'].map(k => `<label class="check small"><input type="checkbox" data-req="forca" value="${k}" ${o.forcas.includes(k) ? 'checked' : ''}> ${L.FORCAS[k].nome}</label>`).join('')}
          <label class="check small"><input type="checkbox" data-req="somentePedir" ${o.somentePedir ? 'checked' : ''}> Somente achados marcados "Incluir no pedido"</label>
          <label class="field" style="flex-direction:row;align-items:center;gap:6px"><span>Data</span><input type="date" data-req="data" value="${h(o.data)}"></label>
          <label class="field" style="flex-direction:row;align-items:center;gap:6px"><span>Signatário</span><input type="text" data-req="sig-nome" value="${h(o.signatario.nome)}" placeholder="Nome"></label>
          <input type="text" data-req="sig-cargo" value="${h(o.signatario.cargo)}" placeholder="Cargo / CRC" aria-label="Cargo">
        </div>
        ${res ? `<div class="small"><b>${fs.length}</b> achado(s) · total a revisar <b>${U.brl(res.totalRev)}</b> de ${U.brl(res.totalCobrado)} cobrados · ${res.cons.filter(x => x.integral).length} NF para desvincular e ${res.cons.filter(x => !x.integral).length} com revisão parcial</div>` : '<div class="callout warn">Nenhum achado com os filtros escolhidos.</div>'}
        <iframe id="req-frame" title="Pré-visualização do requerimento" sandbox=""></iframe>
      </div>`);
    const fr = $('#req-frame');
    if (fr) fr.srcdoc = App.reqHTML || '<p style="font-family:sans-serif;color:#666;padding:20px">Sem conteúdo.</p>';
  }

  function onReqChange(el) {
    const o = App.reqOpts;
    const k = el.dataset.req;
    if (k === 'grupo') { const [c, r, t] = el.value.split('|'); o.companyId = c; o.referencia = r; o.tipo = t; const comp = App.model.companies.get(c) || {}; o.signatario = Object.assign({ nome: '', cargo: '' }, comp.signatario || {}); }
    if (k === 'forca') o.forcas = Array.from(document.querySelectorAll('[data-req="forca"]:checked')).map(x => x.value);
    if (k === 'somentePedir') o.somentePedir = el.checked;
    if (k === 'data') o.data = el.value;
    if (k === 'sig-nome') o.signatario.nome = el.value;
    if (k === 'sig-cargo') o.signatario.cargo = el.value;
    if (k === 'sig-nome' || k === 'sig-cargo') {
      const comp = App.state.companies.find(x => x.id === o.companyId);
      if (comp) { comp.signatario = Object.assign({}, o.signatario); persist(); }
    }
    renderRequerimento();
  }

  function openEFazenda() {
    const fs = filteredFindings().filter(f => f.valorRevisar > 0);
    const txt = R.listaEFazenda(App.model, fs);
    openModal(`<div class="mh"><h3>Lista para o pedido no e-Fazenda</h3><button class="btn primary" type="button" data-act="copy-efaz">${ic('copy')} Copiar</button><button class="btn icon ghost" type="button" data-act="close-modal" aria-label="Fechar">${ic('x')}</button></div>
      <div class="mb"><div class="callout">Use esta lista no módulo <b>Informações Fiscais</b> do e-Fazenda. Ela considera os achados do filtro atual da tela de Revisão (sem os descartados). Lembre-se: um pedido por mês de referência e por tributo.</div>
      <textarea id="efaz-text" rows="22" readonly>${h(txt)}</textarea></div>`);
  }

  /* ============================================================
   * Drawer / modal
   * ============================================================ */
  function openDrawer(html, data = {}) {
    const d = $('#drawer');
    d.innerHTML = html;
    d.dataset.nf = data.nf || '';
    d.classList.add('open'); d.setAttribute('aria-hidden', 'false');
    $('#overlay').classList.add('open');
    const first = d.querySelector('.close'); if (first) first.focus({ preventScroll: true });
  }
  function closeDrawer() {
    const d = $('#drawer');
    if (!d.classList.contains('open')) return;
    d.classList.remove('open'); d.setAttribute('aria-hidden', 'true'); d.dataset.nf = '';
    if (!$('#modal').classList.contains('open')) $('#overlay').classList.remove('open');
  }
  function openModal(html) {
    const m = $('#modal');
    m.innerHTML = html;
    m.classList.add('open'); m.setAttribute('aria-hidden', 'false');
    $('#overlay').classList.add('open');
  }
  function closeModal() {
    const m = $('#modal');
    if (!m.classList.contains('open')) return;
    m.classList.remove('open'); m.setAttribute('aria-hidden', 'true');
    if (!$('#drawer').classList.contains('open')) $('#overlay').classList.remove('open');
  }

  /* ============================================================
   * Ações
   * ============================================================ */
  const ACTIONS = {
    'pick-files': () => $('#file-input').click(),
    'toggle-theme': () => { const t = effectiveTheme() === 'dark' ? 'light' : 'dark'; applyTheme(t); ST.prefSet('tema', t); },
    'close-drawer': () => closeDrawer(),
    'close-modal': () => closeModal(),
    'dismiss-import': () => { App.lastImport = null; renderAll(); },
    'import-paste': () => importPaste(),
    'doc-kind': el => { App.ui.docs.kind = el.dataset.v; renderAll(); },
    'edit-link': el => openEditLink(el.dataset.doc),
    'save-link': el => saveLink(el.dataset.doc),
    'rm-doc': el => {
      const d = App.state.docs.find(x => x.id === el.dataset.doc);
      if (!d || !global.confirm(`Remover o documento "${d.fileName}"?`)) return;
      App.state.docs = App.state.docs.filter(x => x.id !== d.id);
      commit(); toast('Documento removido.', 'ok');
    },
    'toggle-forca': el => {
      const f = App.ui.rev, v = el.dataset.v;
      f.forca = f.forca.includes(v) ? f.forca.filter(x => x !== v) : f.forca.concat(v);
      if (!f.forca.length) f.forca = [v];
      f.page = 1; savePrefs();
      $$chips(el);
      renderRevResults();
    },
    'clear-filters': () => { App.ui.rev = defaultUI().rev; savePrefs(); renderAll(); },
    'page': el => { const t = el.dataset.t; App.ui[t].page = Math.max(1, +el.dataset.p); t === 'rev' ? renderRevResults() : renderNotasResults(); },
    'clear-sel': () => { App.sel.clear(); renderRevResults(); },
    'bulk-status': el => {
      const s = el.dataset.v;
      App.sel.forEach(id => { const dec = App.state.decisions[id] || {}; dec.status = s; if (s === 'solicitado' && !dec.data) dec.data = U.today(); dec.atualizadoEm = new Date().toISOString(); App.state.decisions[id] = dec; });
      const n = App.sel.size; App.sel.clear();
      commit(); toast(`${n} achado(s) marcados como "${L.STATUS[s]}".`, 'ok');
    },
    'open-finding': el => openFinding(el.dataset.fid),
    'open-nf': el => openNF(el.dataset.nf),
    'copy-fund': async el => { const f = App.model.findingsById.get(el.dataset.fid); if (f && await U.copy(f.fundamentacao)) toast('Fundamentação copiada.', 'ok'); },
    'copy-text': async el => { if (await U.copy(el.dataset.text)) toast('Copiado.', 'ok'); },
    'export-xlsx': () => {
      const list = filteredFindings();
      try { R.exportarExcel(App.model, list, `revisao-icms-st${App.ui.ref ? '-' + App.ui.ref : ''}-${U.today()}.xlsx`); toast(`Planilha gerada com ${list.length} achado(s).`, 'ok'); }
      catch (e) { toast('Não foi possível gerar a planilha: ' + h(e.message), 'err'); }
    },
    'export-sos': () => exportarSOS(),
    'export-produtos': () => { try { const n = R.exportarProdutosST(App.model, App.ui.empresa); toast(`Lista com ${n} produto(s) com ICMS-ST gerada.`, 'ok'); } catch (e) { toast('Erro: ' + h(e.message), 'err'); } },
    'print': () => global.print(),
    'open-req': el => openRequerimento({ companyId: el.dataset.cid || App.ui.empresa || '', referencia: el.dataset.ref || App.ui.ref || '' }),
    'req-word': () => { const o = App.reqOpts; const c = App.model.companies.get(o.companyId) || {}; R.baixarWord(App.reqHTML, `requerimento-revisao-${o.tipo}-${o.referencia}-${U.slug(c.nomeFantasia || c.razaoSocial || 'empresa')}.doc`); toast('Requerimento baixado (abre no Word).', 'ok'); },
    'req-print': () => R.imprimirHTML(App.reqHTML),
    'req-mark': () => {
      const fs = reqFindings();
      fs.forEach(f => { const dec = App.state.decisions[f.id] || {}; dec.status = 'solicitado'; dec.data = dec.data || App.reqOpts.data || U.today(); dec.atualizadoEm = new Date().toISOString(); App.state.decisions[f.id] = dec; });
      commit({ render: false }); renderNav(); if (App.ui.view === 'revisao') renderRevResults();
      toast(`${fs.length} achado(s) marcados como Solicitado. Informe o protocolo em cada um quando tiver.`, 'ok', 6000);
      renderRequerimento();
    },
    'open-efazenda': () => openEFazenda(),
    'copy-efaz': async () => { if (await U.copy($('#efaz-text').value)) toast('Lista copiada.', 'ok'); },
    'add-company': () => { App.state.companies.push(newCompany({ razaoSocial: 'Nova empresa' })); commit(); toast('Empresa criada — preencha os dados no cartão.', 'ok'); },
    'rm-company': el => removeCompany(el.dataset.cid),
    'mva-add': () => { App.state.mvaTable.push({ id: U.uid(), cest: '', ncm: '', descricao: '', mvaOriginal: '', mva4: '', mva7: '', mva12: '', fonte: 'Informado pelo usuário' }); commit(); },
    'mva-rm': el => { App.state.mvaTable.splice(+el.dataset.idx, 1); commit(); },
    'mva-clear': () => { if (global.confirm('Apagar toda a tabela de MVA?')) { App.state.mvaTable = []; commit(); } },
    'sub-importar': () => importarSubanexo(),
    'sub-padrao': () => {
      if (!global.confirm('Voltar a usar a versão da relação oficial que acompanha o app?')) return;
      delete App.state.subanexo; commit(); toast('Usando a versão da relação que acompanha o app.', 'ok');
    },
    'mva-import': () => {
      const rows = parseMvaPaste($('#mva-paste').value);
      if (!rows.length) return toast('Não encontrei linhas com CEST ou NCM na colagem.', 'err');
      App.state.mvaTable = App.state.mvaTable.concat(rows);
      commit(); toast(`${rows.length} linha(s) adicionada(s) à tabela.`, 'ok');
    },
    'mva-export': () => {
      const linhas = [['CEST', 'NCM', 'Descricao', 'MVA original', 'MVA 4%', 'MVA 7%', 'MVA 12%', 'Fonte']].concat(App.state.mvaTable.map(e => [U.fmtCEST(e.cest) || e.cest, U.fmtNCM(e.ncm), e.descricao, e.mvaOriginal, e.mva4, e.mva7, e.mva12, e.fonte].map(v => typeof v === 'number' ? U.fmt(v, 2) : v)));
      U.download(`tabela-mva-ms-${U.today()}.csv`, '﻿' + linhas.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\r\n'), 'text/csv');
    },
    'mva-from-obs': el => {
      const o = observedMva().find(x => x.key === el.dataset.key);
      if (!o) return;
      const orig = o.clusters[0];
      const aj = a => U.round2(((1 + orig / 100) * (1 - a / 100) / (1 - E.settingsOf(App.state).aliqInterna / 100) - 1) * 100);
      App.state.mvaTable.push({ id: U.uid(), cest: o.cest, ncm: o.cest ? '' : o.ncms[0], descricao: o.ex, mvaOriginal: orig, mva4: aj(4), mva7: aj(7), mva12: aj(12), fonte: o.clusters.length > 1 ? 'Menor MVA observada — CONFIRMAR no Subanexo I' : 'Observada nas memórias — CONFIRMAR no Subanexo I' });
      commit(); toast('Linha adicionada à tabela de MVA. Confirme o valor na legislação.', 'ok');
    },
    'cat-rm': el => { delete App.state.catalog[el.dataset.key]; commit(); },
    'backup': () => {
      App.state.ultimoBackup = new Date().toISOString();
      U.download(`backup-revisor-icms-st-${U.today()}.json`, JSON.stringify(App.state), 'application/json');
      persist(); updateStorageInfo(); toast('Backup exportado.', 'ok');
    },
    'restore': () => $('#backup-input').click(),
    'wipe': () => {
      if (!global.confirm('Apagar TODOS os dados (empresas, documentos, decisões e tabelas) deste navegador?')) return;
      if (!global.confirm('Confirma? Sem backup não será possível recuperar.')) return;
      App.state = ST.estadoInicial(); App.sel.clear(); App.ui.empresa = ''; App.ui.ref = '';
      commit(); toast('Dados apagados.', 'ok');
    }
  };
  function $$chips(el) {
    const f = App.ui.rev;
    el.parentElement.querySelectorAll('[data-act="toggle-forca"]').forEach(b => { const v = b.dataset.v; b.className = `chip ${f.forca.includes(v) ? 'on ' + v : ''}`; });
  }

  function setFilter(el) {
    const [grp, k] = el.dataset.f.split('.');
    App.ui[grp][k] = el.type === 'checkbox' ? el.checked : el.value;
    App.ui[grp].page = 1;
    savePrefs();
    if (grp === 'rev') renderRevResults(); else renderNotasResults();
  }
  const setFilterDebounced = U.debounce(setFilter, 220);

  /* ============================================================
   * Eventos
   * ============================================================ */
  function onClick(e) {
    const go = e.target.closest('[data-go]');
    if (go) {
      e.preventDefault();
      const extra = {};
      if ('empresa' in go.dataset) extra.empresa = go.dataset.empresa;
      if ('ref' in go.dataset) extra.ref = go.dataset.ref;
      if ('regra' in go.dataset) extra.regra = go.dataset.regra;
      closeModal();
      return setView(go.dataset.go, extra);
    }
    const nav = e.target.closest('[data-view]');
    if (nav) return setView(nav.dataset.view);
    const act = e.target.closest('[data-act]');
    if (act) {
      if (act.tagName === 'A') e.preventDefault();
      const fn = ACTIONS[act.dataset.act];
      if (fn && !act.disabled) fn(act, e);
      return;
    }
    if (e.target.closest('input,select,textarea,button,a,label')) return;
    const fr = e.target.closest('tr[data-fid]');
    if (fr) return openFinding(fr.dataset.fid);
    const nr = e.target.closest('tr[data-nf]');
    if (nr) return openNF(nr.dataset.nf);
  }

  function onChange(e) {
    const t = e.target;
    if (t.matches('[data-sel]')) { t.checked ? App.sel.add(t.dataset.sel) : App.sel.delete(t.dataset.sel); return renderRevResults(); }
    if (t.matches('[data-selall]')) {
      const box = $('#rev-results');
      box.querySelectorAll('[data-sel]').forEach(cb => { t.checked ? App.sel.add(cb.dataset.sel) : App.sel.delete(cb.dataset.sel); });
      return renderRevResults();
    }
    if (t.matches('[data-f]')) return setFilter(t);
    if (t.matches('[data-dec]')) return saveDecision(t);
    if (t.matches('[data-dest]')) return setDestinacao(t);
    if (t.matches('[data-nfflag]')) return setNfFlag(t);
    if (t.matches('[data-comp]')) return setCompanyField(t);
    if (t.matches('[data-set]')) return setSetting(t);
    if (t.matches('[data-kw]')) return setKeywords(t);
    if (t.matches('[data-cat]')) { const e2 = App.state.catalog[t.dataset.cat]; if (e2) { e2.destinacao = t.value; commit(); } return; }
    if (t.matches('[data-mva]')) {
      const e2 = App.state.mvaTable[+t.dataset.idx]; if (!e2) return;
      const k = t.dataset.mva;
      e2[k] = ['cest', 'ncm'].includes(k) ? U.digits(t.value) : ['mvaOriginal', 'mva4', 'mva7', 'mva12'].includes(k) ? numOrEmpty(t.value) : t.value;
      return commit({ render: false });
    }
    if (t.matches('[data-req]')) return onReqChange(t);
    if (t.id === 'scope-empresa') { App.ui.empresa = t.value; App.sel.clear(); savePrefs(); return renderAll(); }
    if (t.id === 'scope-ref') { App.ui.ref = t.value; App.sel.clear(); savePrefs(); return renderAll(); }
  }

  const subBuscaDebounced = U.debounce(v => { App.ui.subQ = v; const box = $('#sub-res'); if (box) box.innerHTML = subResultados(); }, 200);
  function onInput(e) {
    const t = e.target;
    if (t.matches('[data-f]') && (t.type === 'search' || t.type === 'text')) setFilterDebounced(t);
    if (t.id === 'sub-q') subBuscaDebounced(t.value);
  }

  function bind() {
    document.addEventListener('click', onClick);
    document.addEventListener('change', onChange);
    document.addEventListener('input', onInput);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeModal(); closeDrawer(); }
      if ((e.key === 'Enter' || e.key === ' ') && e.target.id === 'dropzone') { e.preventDefault(); $('#file-input').click(); }
      if (e.key === 'Enter' && e.target.matches && e.target.matches('tr[data-fid]')) openFinding(e.target.dataset.fid);
      if (e.key === 'Enter' && e.target.matches && e.target.matches('tr[data-nf]')) openNF(e.target.dataset.nf);
    });
    $('#overlay').addEventListener('click', () => { closeModal(); closeDrawer(); });
    $('#file-input').addEventListener('change', e => { const f = e.target.files; importFiles(f).finally(() => { e.target.value = ''; }); });
    $('#backup-input').addEventListener('change', async e => {
      const f = e.target.files[0];
      e.target.value = '';
      if (!f) return;
      try {
        const obj = JSON.parse(await f.text());
        if (!obj || !Array.isArray(obj.docs) || !Array.isArray(obj.companies)) throw new Error('arquivo não é um backup do Revisor ICMS-ST');
        if (!global.confirm(`Substituir os dados atuais pelo backup (${obj.companies.length} empresa(s), ${obj.docs.length} documento(s))?`)) return;
        App.state = ST.normalizar(obj); App.sel.clear();
        commit(); toast('Backup restaurado.', 'ok');
      } catch (err) { toast('Backup inválido: ' + h(err.message), 'err'); }
    });
    const hasFiles = e => e.dataTransfer && Array.from(e.dataTransfer.types || []).includes('Files');
    let depth = 0;
    document.addEventListener('dragenter', e => { if (!hasFiles(e)) return; depth++; const dz = $('#dropzone'); if (dz) dz.classList.add('over'); });
    document.addEventListener('dragover', e => { if (hasFiles(e)) e.preventDefault(); });
    document.addEventListener('dragleave', e => { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (!depth) { const dz = $('#dropzone'); if (dz) dz.classList.remove('over'); } });
    document.addEventListener('drop', e => { if (!hasFiles(e)) return; e.preventDefault(); depth = 0; const dz = $('#dropzone'); if (dz) dz.classList.remove('over'); importFiles(e.dataTransfer.files); });
  }

  async function init() {
    applyTheme(ST.prefGet('tema', 'auto'));
    App.ui = Object.assign(defaultUI(), ST.prefGet('ui', {}));
    App.ui.rev = Object.assign(defaultUI().rev, App.ui.rev || {});
    App.ui.notas = Object.assign(defaultUI().notas, App.ui.notas || {});
    App.ui.docs = { kind: '' };
    App.state = await ST.load();
    recompute();
    bind();
    renderAll();
    if (!global.pdfjsLib || !global.XLSX) toast('Não foi possível carregar as bibliotecas de leitura (PDF/planilha). Verifique a conexão com a internet e recarregue a página.', 'err', 10000);
  }

  global.RST_APP = App;
  global.RST_UI = { importFiles, recompute, renderAll, openFinding, openNF, setView };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(window);
