/* Revisor ICMS-ST — extração de texto de PDF (pdf.js) com posições, linhas e ordem de fluxo */
(function (global) {
  'use strict';

  const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  function lib() {
    const L = global.pdfjsLib || global['pdfjs-dist/build/pdf'];
    if (!L) throw new Error('Biblioteca de PDF não carregada (verifique a conexão com a internet).');
    if (L.GlobalWorkerOptions && !L.GlobalWorkerOptions.workerSrc) L.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
    return L;
  }

  function joinItems(items) {
    let out = '';
    let prev = null;
    for (const it of items) {
      if (prev) {
        const gap = it.x - (prev.x + prev.w);
        const sizeRef = Math.max(prev.h, it.h, 4);
        if (gap > sizeRef * 0.18 && !out.endsWith(' ') && !it.str.startsWith(' ')) out += ' ';
      }
      out += it.str;
      prev = it;
    }
    return out.replace(/\s+/g, ' ').trim();
  }

  /**
   * Extrai o texto de um PDF.
   * Retorna { numPages, pages:[{items, lines:[{y, items, text}]}], lineText, streamText }
   *  - lineText: linhas reconstruídas pela posição vertical (bom para tabelas)
   *  - streamText: itens na ordem do conteúdo, um por linha (bom para pares rótulo/valor)
   */
  async function extract(arrayBuffer) {
    const L = lib();
    const data = new Uint8Array(arrayBuffer.slice(0));
    const doc = await L.getDocument({ data, isEvalSupported: false, disableFontFace: true }).promise;
    const pages = [];
    const stream = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const tc = await page.getTextContent();
      const items = [];
      for (const it of tc.items) {
        if (typeof it.str !== 'string') continue;
        const str = it.str.replace(/ /g, ' ');
        const x = it.transform[4], y = it.transform[5];
        const h = Math.abs(it.height || it.transform[3] || 0) || 6;
        if (str.trim()) items.push({ str, x, y, w: it.width || 0, h, eol: !!it.hasEOL });
        if (str.trim()) stream.push(str.trim());
      }
      // agrupa em linhas pela coordenada y
      const sorted = items.slice().sort((a, b) => (b.y - a.y) || (a.x - b.x));
      const lines = [];
      for (const it of sorted) {
        const tol = Math.max(1.5, Math.min(it.h, 12) * 0.45);
        let line = null;
        for (let i = lines.length - 1; i >= 0 && i >= lines.length - 3; i--) {
          if (Math.abs(lines[i].y - it.y) <= tol) { line = lines[i]; break; }
        }
        if (!line) { line = { y: it.y, items: [] }; lines.push(line); }
        line.items.push(it);
      }
      lines.forEach(l => { l.items.sort((a, b) => a.x - b.x); l.text = joinItems(l.items); });
      pages.push({ items, lines });
      try { page.cleanup(); } catch (_) { /* ignore */ }
    }
    try { doc.destroy(); } catch (_) { /* ignore */ }
    return {
      numPages: pages.length,
      pages,
      lineText: pages.map(p => p.lines.map(l => l.text).join('\n')).join('\n'),
      streamText: stream.join('\n')
    };
  }

  global.RST_PDF = { extract, joinItems };
})(window);
