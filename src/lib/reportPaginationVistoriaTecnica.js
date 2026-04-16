/**
 * Sistema de Blocos com Paginação Inteligente
 * 1. Calcula tamanho exato de cada bloco
 * 2. Aloca blocos às páginas respeitando espaço disponível
 */

export function paginateLocalItemsForVistoriaTecnica(local, opts = {}) {
  const PAGE_HEIGHT_PX = opts.pageHeightPx || 1122;
  const HEADER_HEIGHT_PX = opts.headerHeightPx || 80;
  const FOOTER_HEIGHT_PX = opts.footerHeightPx || 45;
  const PAGE_PADDING_PX = opts.pagePaddingPx || 8;
  const FOOTER_GUARD_PX = opts.footerGuardPx ?? 8;
  const BREAK_BEFORE_LIMIT_PX = opts.breakBeforeLimitPx ?? 8;
  const FIRST_PAGE_EXTRA_HEIGHT_PX = opts.firstPageExtraHeightPx || 0;

  const PHOTO_MAX_HEIGHT_PX = opts.photoMaxHeightPx || 220;
  const PHOTO_CAPTION_HEIGHT_PX = opts.photoCaptionHeightPx ?? 14;
  const PHOTO_CHUNK_SIZE = Math.max(1, opts.photoChunkSize || 3);
  const SPLIT_PHOTO_ROWS = opts.splitPhotoRows === true;

  // Calcula altura usável da página
  const getUsableHeight = (isFirstPage) => {
    const base = PAGE_HEIGHT_PX - HEADER_HEIGHT_PX - FOOTER_HEIGHT_PX - PAGE_PADDING_PX;
    if (!isFirstPage) return base;
    return Math.max(120, base - FIRST_PAGE_EXTRA_HEIGHT_PX);
  };

  // Limite inferior para quebra de página
  const getBottomLimit = (isFirstPage) => Math.max(120, getUsableHeight(isFirstPage) - FOOTER_GUARD_PX);

  // Escape HTML para segurança
  const escapeHtml = (unsafe) => {
    if (!unsafe && unsafe !== 0) return '';
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // Calcula altura EXATA de um bloco usando DOM
  const calculateBlockHeight = (item) => {
    const supportsDOM = typeof document !== 'undefined' && document.body;
    
    if (!supportsDOM) {
      // Fallback: estimativa simples
      if (item.tipo === 'comentario') {
        return Math.max(40, 8 + Math.ceil((item.comentarios || '').length / 120) * 18);
      }
      const fotos = (item.fotos && item.fotos.length) || 0;
      const fotoHeight = fotos > 0 ? Math.ceil(fotos / 3) * (PHOTO_MAX_HEIGHT_PX + PHOTO_CAPTION_HEIGHT_PX) : 0;
      return 8 + 28 + 8 + fotoHeight; // buffer + header + gap + fotos
    }

    // Mede com DOM (sem padding no container — itens são <tr> em tabela compartilhada)
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    // Largura: 190mm - 32px padding horizontal do ContentPage (px-4 = 16px cada lado)
    tempDiv.style.width = 'calc(190mm - 32px)';
    tempDiv.style.boxSizing = 'border-box';
    tempDiv.style.padding = '0';
    tempDiv.style.fontFamily = 'Inter, Poppins, sans-serif';
    tempDiv.style.fontSize = '12px';
    tempDiv.style.lineHeight = '1.35';

    let inner = '';
    if (item.tipo === 'comentario') {
      const text = item.comentarios || '';
      inner = `<div style="border:1px solid #000; padding:8px; font-size:12px; line-height:1.35; white-space:pre-wrap; word-break:break-word; overflow-wrap:anywhere;"><strong>Comentarios Gerais: </strong>${escapeHtml(text)}</div>`;
    } else if (item.showOnlyPhotos) {
      const fotos = item.fotos || [];
      const hasLabel = !!(item.descricao && String(item.descricao).trim());
      if (hasLabel) {
        inner = `<div style="font-size:10px; margin-bottom:6px;">${escapeHtml(item.descricao)}</div>`;
      }
      inner += '<div style="display:grid; grid-template-columns:repeat(3,1fr); gap:8px;">';
      fotos.forEach((foto) => {
        const legenda = foto && foto.legenda ? String(foto.legenda) : '';
        inner += '<div style="text-align:center;">';
        inner += `<div style="width:100%; height:${PHOTO_MAX_HEIGHT_PX}px; border:1px solid #ddd; box-sizing:border-box;"></div>`;
        if (legenda) {
          inner += `<p style="font-size:9px; color:#4b5563; margin-top:4px; line-height:1.2; white-space:normal; word-break:break-word;">${escapeHtml(legenda)}</p>`;
        }
        inner += '</div>';
      });
      inner += '</div>';
    } else {
      // Layout: descrição (bold) + status direita; observação abaixo com fundo cinza
      const statusColor = { 'OK': '#16a34a', 'PD': '#dc2626', 'SG': '#2563eb', 'N/OK': '#ea580c' }[item.resultado] || '#6b7280';
      inner = '<table style="width:100%; border-collapse:collapse; table-layout:fixed; font-size:12px; line-height:1.35;"><tbody>';
      // Linha 1: Descrição (bold) + Status
      inner += '<tr>';
      inner += `<td style="border:1px solid #000; padding:8px; vertical-align:top; font-weight:600; word-break:break-word; overflow-wrap:anywhere; white-space:pre-wrap;">${escapeHtml(item.descricao || '')}</td>`;
      inner += `<td style="width:50px; border:1px solid #000; padding:8px; text-align:center; vertical-align:top; color:${statusColor}; font-weight:bold; font-size:12px;">${escapeHtml(item.resultado || '')}</td>`;
      inner += '</tr>';
      // Linha 2: Observação com fundo cinza (se houver)
      if (item.observacoes) {
        inner += '<tr>';
        inner += `<td colspan="2" style="border:1px solid #000; padding:8px 12px; font-size:12px; line-height:1.35; background:#f9fafb; word-break:break-word; overflow-wrap:anywhere; white-space:pre-wrap; color:#374151;"><div style="font-weight:600; color:#6b7280; margin-bottom:4px;">Comentarios:</div>${escapeHtml(item.observacoes)}</td>`;
        inner += '</tr>';
      }
      inner += '</tbody></table>';

      if (item.fotos && item.fotos.length > 0) {
        inner += `<div style="display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-top:8px;">`;
        item.fotos.forEach((foto) => {
          const legenda = foto && foto.legenda ? String(foto.legenda) : '';
          inner += '<div style="text-align:center;">';
          inner += `<div style="width:100%; height:${PHOTO_MAX_HEIGHT_PX}px; border:1px solid #ddd; box-sizing:border-box;"></div>`;
          if (legenda) {
            inner += `<p style="font-size:9px; color:#4b5563; margin-top:4px; line-height:1.2; white-space:normal; word-break:break-word;">${escapeHtml(legenda)}</p>`;
          }
          inner += '</div>';
        });
        inner += '</div>';
      }
    }

    tempDiv.innerHTML = inner;
    document.body.appendChild(tempDiv);
    const height = tempDiv.offsetHeight + 10; // Folga extra para variacoes de fonte/render na impressao
    document.body.removeChild(tempDiv);
    return height;
  };

  // Prepara blocos (item com altura pré-calculada)
  const blocks = [];

  // Comentários gerais como PRIMEIRO bloco (antes dos itens de inspeção)
  if (local.comentarios) {
    const blockComentario = { tipo: 'comentario', comentarios: local.comentarios, isComentarioGeral: true };
    blockComentario.height = calculateBlockHeight(blockComentario);
    blocks.push(blockComentario);
  }

  for (const originalItem of (local.itens_inspecao || [])) {
    const fotos = (originalItem.fotos || []).filter((foto) => foto && typeof foto.url === 'string' && foto.url.trim() !== '');

    if (SPLIT_PHOTO_ROWS && fotos.length > 0) {
      // Bloco sem fotos
      const blockNoPhotos = { ...originalItem, fotos: [] };
      blockNoPhotos.height = calculateBlockHeight(blockNoPhotos);
      blocks.push(blockNoPhotos);

      // Blocos apenas com fotos (em chunks)
      for (let i = 0; i < fotos.length; i += PHOTO_CHUNK_SIZE) {
        const blockPhotos = {
          ...originalItem,
          descricao: '',
          fotos: fotos.slice(i, i + PHOTO_CHUNK_SIZE),
          showOnlyPhotos: true,
        };
        blockPhotos.height = calculateBlockHeight(blockPhotos);
        blocks.push(blockPhotos);
      }
    } else {
      // Bloco normal com todas as fotos
      const block = { ...originalItem, fotos };
      block.height = calculateBlockHeight(block);
      blocks.push(block);
    }
  }

  // Aloca blocos às páginas
  const pages = [];
  let currentPageBlocks = [];
  let currentPageHeight = 0;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const isFirstPage = pages.length === 0;
    const pageLimit = getBottomLimit(isFirstPage);

    // Quebra apenas se estoura o limite ou se sobra menos que o guard E o bloco é grande
    const projectedHeight = currentPageHeight + block.height;
    const remainingAfterProjection = pageLimit - projectedHeight;
    const isLargeBlock = block.tipo === 'comentario' || block.showOnlyPhotos || (block.height || 0) >= 180;
    const shouldBreak = currentPageBlocks.length > 0 &&
      (projectedHeight > pageLimit || (remainingAfterProjection < BREAK_BEFORE_LIMIT_PX && isLargeBlock));

    if (shouldBreak) {
      pages.push({
        local,
        items: currentPageBlocks,
        isFirstPageOfLocal: isFirstPage,
      });
      currentPageBlocks = [];
      currentPageHeight = 0;
    }

    // Adiciona bloco à página atual
    currentPageBlocks.push(block);
    currentPageHeight += block.height;
  }

  // Última página
  if (currentPageBlocks.length > 0) {
    const isFirst = pages.length === 0;
    pages.push({
      local,
      items: currentPageBlocks,
      isFirstPageOfLocal: isFirst,
    });
  }

  // Rebalance final: evita última página com 1 item quando o item cabe na penúltima
  if (pages.length >= 2) {
    const prev = pages[pages.length - 2];
    const last = pages[pages.length - 1];
    if (last.items.length === 1 && prev.items.length > 1) {
      const candidate = prev.items[prev.items.length - 1];
      const lastUsed = last.items.reduce((sum, it) => sum + (it.height || 0), 0);
      if (lastUsed + (candidate.height || 0) <= getBottomLimit(false)) {
        prev.items.pop();
        last.items.unshift(candidate);
      }
    }
  }

  return pages;
}

/**
 * Pagina todos os locais em fluxo contínuo.
 * Permite que o próximo local use o espaço restante da página anterior.
 */
export function paginateLocaisFlowForVistoriaTecnica(locais = [], opts = {}) {
  if (!Array.isArray(locais) || locais.length === 0) return [];

  const PAGE_HEIGHT_PX = opts.pageHeightPx || 1122;
  const HEADER_HEIGHT_PX = opts.headerHeightPx || 80;
  const FOOTER_HEIGHT_PX = opts.footerHeightPx || 45;
  const PAGE_PADDING_PX = opts.pagePaddingPx || 40;
  const FOOTER_GUARD_PX = opts.footerGuardPx ?? 8;
  const COMPACTION_SLACK_PX = Math.max(0, Number(opts.compactionSlackPx ?? 36));
  const estimateFirstPageExtra = typeof opts.estimateFirstPageExtra === 'function'
    ? opts.estimateFirstPageExtra
    : () => 0;

  const pageLimit = Math.max(
    120,
    PAGE_HEIGHT_PX - HEADER_HEIGHT_PX - FOOTER_HEIGHT_PX - PAGE_PADDING_PX - FOOTER_GUARD_PX,
  );

  const FOTO_CHUNK_SIZE_LOCAL = 12; // máximo de 12 fotos por bloco extra (1 página)
  const MAX_FOTOS_PER_HEADER = 9; // max 3 linhas de 3 fotos no cabeçalho (3×248px=744px, cabe na página)
  const FOTO_ROW_H = (opts.photoMaxHeightPx || 220) + (opts.photoCaptionHeightPx ?? 14) + 8;

  const normalizedLocais = locais.map((local, localIndex) => {
    // Limita fotos do cabeçalho a MAX_FOTOS_PER_HEADER; excedente vira blocos paginados
    const allFotos = (local.fotos || []).filter(
      (f) => f && typeof f.url === 'string' && f.url.trim() !== '',
    );
    const headerFotos = allFotos.slice(0, MAX_FOTOS_PER_HEADER);
    const extraFotos = allFotos.slice(MAX_FOTOS_PER_HEADER);
    const localForHeader = extraFotos.length > 0 ? { ...local, fotos: headerFotos } : local;

    // Reusa o mesmo medidor/splitter da função principal para obter os blocos já medidos
    const measured = paginateLocalItemsForVistoriaTecnica(localForHeader, {
      ...opts,
      pageHeightPx: 999999,
      headerHeightPx: 0,
      footerHeightPx: 0,
      pagePaddingPx: 0,
      footerGuardPx: 0,
      breakBeforeLimitPx: 0,
      firstPageExtraHeightPx: 0,
    });

    // Cria blocos para fotos excedentes (aparecem antes dos itens de inspeção)
    const extraFotoBlocks = [];
    for (let i = 0; i < extraFotos.length; i += FOTO_CHUNK_SIZE_LOCAL) {
      const chunk = extraFotos.slice(i, i + FOTO_CHUNK_SIZE_LOCAL);
      const rows = Math.ceil(chunk.length / 3);
      extraFotoBlocks.push({
        tipo: 'foto_local_extra',
        descricao: '',
        fotos: chunk,
        showOnlyPhotos: true,
        height: rows * FOTO_ROW_H + 20,
      });
    }

    const blocks = [...extraFotoBlocks, ...measured.flatMap((p) => p.items || [])];
    return {
      local: localForHeader,
      localIndex,
      firstExtra: Math.max(0, Number(estimateFirstPageExtra(localForHeader) || 0)),
      blocks,
    };
  });

  const pages = [];
  let currentPage = { segments: [] };
  let usedHeight = 0;

  const getPageUsedHeight = (page) => {
    if (!page || !Array.isArray(page.segments)) return 0;
    return page.segments.reduce((pageSum, segment) => {
      const header = Number(segment?.headerHeight || 0);
      const itemsHeight = (segment?.items || []).reduce((sum, item) => sum + Number(item?.height || 0), 0);
      return pageSum + header + itemsHeight;
    }, 0);
  };

  const getPageItemCount = (page) => {
    if (!page || !Array.isArray(page.segments)) return 0;
    return page.segments.reduce((sum, segment) => sum + (segment?.items?.length || 0), 0);
  };

  const flushCurrentPage = () => {
    if (currentPage.segments.length > 0) {
      pages.push(currentPage);
      currentPage = { segments: [] };
      usedHeight = 0;
    }
  };

  for (const localData of normalizedLocais) {
    let hasRenderedHeader = false;

    for (const block of localData.blocks) {
      // Tenta encaixar o bloco na página atual; se não couber, abre nova página e tenta novamente
      while (true) {
        const lastSegment = currentPage.segments[currentPage.segments.length - 1];
        const canAppendToLastSegment = lastSegment && lastSegment.localIndex === localData.localIndex;
        const willOpenSegment = !canAppendToLastSegment;
        const headerCost = willOpenSegment && !hasRenderedHeader ? localData.firstExtra : 0;
        const blockHeight = Number(block?.height || 0);
        const projected = usedHeight + headerCost + blockHeight;

        // Quebra de página normal: há conteúdo e o bloco não cabe
        if (usedHeight > 0 && projected > pageLimit) {
          // Se o cabeçalho do novo local ainda cabe na página atual (mas o bloco não),
          // coloca o cabeçalho aqui para o local começar junto aos itens anteriores.
          if (willOpenSegment && !hasRenderedHeader && headerCost > 0 && (usedHeight + headerCost) <= pageLimit) {
            currentPage.segments.push({
              local: localData.local,
              localIndex: localData.localIndex,
              showHeader: true,
              headerHeight: headerCost,
              items: [],
            });
            hasRenderedHeader = true;
          }
          flushCurrentPage();
          continue;
        }

        // Caso especial: página vazia, mas o header (fotos do local) + bloco não cabe.
        // Cria uma página só com o header e manda o bloco para a próxima.
        if (usedHeight === 0 && willOpenSegment && !hasRenderedHeader && headerCost > 0 && projected > pageLimit && blockHeight <= pageLimit) {
          currentPage.segments.push({
            local: localData.local,
            localIndex: localData.localIndex,
            showHeader: true,
            headerHeight: headerCost,
            items: [],
          });
          usedHeight += headerCost;
          hasRenderedHeader = true;
          flushCurrentPage();
          continue;
        }

        if (willOpenSegment) {
          currentPage.segments.push({
            local: localData.local,
            localIndex: localData.localIndex,
            showHeader: !hasRenderedHeader,
            headerHeight: headerCost,
            items: [],
          });
          usedHeight += headerCost;
          if (!hasRenderedHeader) hasRenderedHeader = true;

          // Se o cabeçalho ocupou quase toda a página, não vale colocar itens aqui.
          // Faz flush imediato para que os itens comecem numa página fresca.
          const MIN_USABLE_AFTER_HEADER = 180;
          if (headerCost > 0 && (pageLimit - usedHeight) < MIN_USABLE_AFTER_HEADER) {
            flushCurrentPage();
            continue;
          }
        }

        const targetSegment = currentPage.segments[currentPage.segments.length - 1];
        targetSegment.items.push(block);
        usedHeight += blockHeight;
        break;
      }
    }
  }

  flushCurrentPage();

  // Evita "pagina orfa" com 1 unico item quando e possivel puxar mais 1 item
  // do mesmo local da pagina anterior sem estourar o limite.
  for (let i = 1; i < pages.length; i++) {
    const current = pages[i];
    const previous = pages[i - 1];

    if (getPageItemCount(current) !== 1) continue;

    const currentSegment = (current.segments || []).find((segment) => (segment?.items?.length || 0) > 0);
    if (!currentSegment) continue;

    const previousSegment = [...(previous.segments || [])]
      .reverse()
      .find((segment) => segment.localIndex === currentSegment.localIndex && (segment?.items?.length || 0) > 1);

    if (!previousSegment) continue;

    const candidate = previousSegment.items[previousSegment.items.length - 1];
    const candidateHeight = Number(candidate?.height || 0);
    const currentUsed = getPageUsedHeight(current);

    if (currentUsed + candidateHeight > (pageLimit + COMPACTION_SLACK_PX)) continue;

    previousSegment.items.pop();
    currentSegment.items.unshift(candidate);

    previous.segments = (previous.segments || []).filter((segment) => (segment?.items?.length || 0) > 0);
  }

  // Compactacao: puxa itens da pagina de baixo para a de cima quando
  // ambos pertencem ao mesmo local e ainda ha espaco na pagina anterior.
  for (let i = 1; i < pages.length; i++) {
    const previous = pages[i - 1];
    const current = pages[i];

    const previousLastSegment = (previous.segments || [])[previous.segments.length - 1];
    const currentFirstSegment = (current.segments || []).find((segment) => (segment?.items?.length || 0) > 0);

    if (!previousLastSegment || !currentFirstSegment) continue;
    if (previousLastSegment.localIndex !== currentFirstSegment.localIndex) continue;

    while ((currentFirstSegment.items || []).length > 0) {
      const candidate = currentFirstSegment.items[0];
      const candidateHeight = Number(candidate?.height || 0);
      const previousUsed = getPageUsedHeight(previous);

      if (previousUsed + candidateHeight > (pageLimit + COMPACTION_SLACK_PX)) break;

      previousLastSegment.items.push(candidate);
      currentFirstSegment.items.shift();
    }

    current.segments = (current.segments || []).filter((segment) => (segment?.items?.length || 0) > 0);

    if ((current.segments || []).length === 0) {
      pages.splice(i, 1);
      i--;
    }
  }

  return pages;
}