export function paginateLocalItemsForPrinting(local, opts = {}) {
  const pages = [];

  const PAGE_HEIGHT_PX = opts.pageHeightPx || 1122; // A4 297mm ≈ 1122px (96dpi)
  const HEADER_HEIGHT_PX = opts.headerHeightPx || 80;
  const FOOTER_HEIGHT_PX = opts.footerHeightPx || 45;
  const PAGE_PADDING_PX = opts.pagePaddingPx || 8;
  const FOOTER_GUARD_PX = opts.footerGuardPx || 16;
  const BREAK_BEFORE_LIMIT_PX = opts.breakBeforeLimitPx || 24;
  const FIRST_PAGE_EXTRA_HEIGHT_PX = opts.firstPageExtraHeightPx || 0;

  // Backward compatibility with older callers.
  const ITEM_BUFFER_PX = opts.itemBufferPx || opts.itemExtraPaddingPx || 8;
  const LEGACY_SAFETY_MARGIN_PX = opts.safetyMarginPx || 0;
  const PHOTO_MAX_HEIGHT_PX = opts.photoMaxHeightPx || opts.photoPlaceholderHeightPx || 150;

  const getUsableHeight = (isFirstPage) => {
    const base = PAGE_HEIGHT_PX - HEADER_HEIGHT_PX - FOOTER_HEIGHT_PX - PAGE_PADDING_PX - LEGACY_SAFETY_MARGIN_PX;
    if (!isFirstPage) return base;
    return Math.max(120, base - FIRST_PAGE_EXTRA_HEIGHT_PX);
  };

  const getBottomLimit = (isFirstPage) => Math.max(120, getUsableHeight(isFirstPage) - FOOTER_GUARD_PX);

  const supportsDOM = typeof document !== 'undefined' && document.body;

  const escapeHtml = (unsafe) => {
    if (!unsafe && unsafe !== 0) return '';
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  const measureItemHeight = (item) => {
    if (!supportsDOM) {
      if (item.tipo === 'comentario' || item.isComentarioGeral) {
        const len = (item.texto || item.comentarios || '').length;
        return Math.max(40, ITEM_BUFFER_PX + Math.ceil(len / 120) * 18);
      }
      const fotos = (item.fotos && item.fotos.length) || 0;
      const fotoRows = Math.ceil(fotos / 3);
      return ITEM_BUFFER_PX + 28 + (fotos > 0 ? (fotoRows * PHOTO_MAX_HEIGHT_PX) : 0);
    }

    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.visibility = 'hidden';
    tempDiv.style.width = '190mm';
    tempDiv.style.boxSizing = 'border-box';
    tempDiv.style.padding = '12px';
    tempDiv.style.fontFamily = 'Inter, Poppins, sans-serif';
    tempDiv.style.fontSize = '10px';
    tempDiv.style.lineHeight = '1.2';

    let inner = '';
    if (item.tipo === 'comentario' || item.isComentarioGeral) {
      const text = item.texto || item.comentarios || '';
      inner = `<div style="border:1px solid #000; padding:8px; font-size:10px;">${escapeHtml(text)}</div>`;
    } else if (item.showOnlyPhotos) {
      const fotos = item.fotos || [];
      inner = `<div style="font-size:10px; margin-bottom:6px;">${escapeHtml(item.descricao || '')}</div>`;
      inner += '<div style="display:grid; grid-template-columns:repeat(3,1fr); gap:6px;">';
      fotos.forEach(() => {
        inner += `<div style="width:100%; height:${PHOTO_MAX_HEIGHT_PX}px; border:1px solid #ddd; box-sizing:border-box;"></div>`;
      });
      inner += '</div>';
    } else {
      inner = '<div style="display:flex; gap:8px; align-items:flex-start;">';
      inner += `<div style="flex:0 0 40%; font-size:10px;">${escapeHtml(item.descricao || '')}</div>`;
      inner += `<div style="flex:0 0 6%; text-align:center; font-size:10px;">${escapeHtml(item.resultado || '')}</div>`;
      inner += `<div style="flex:1; font-size:10px;">${escapeHtml(item.observacoes || '')}</div>`;
      inner += '</div>';
      if (item.fotos && item.fotos.length > 0) {
        inner += `<div style="display:grid; grid-template-columns:repeat(3,1fr); gap:6px; margin-top:8px;">`;
        item.fotos.forEach(() => {
          inner += `<div style="width:100%; height:${PHOTO_MAX_HEIGHT_PX}px; border:1px solid #ddd; box-sizing:border-box;"></div>`;
        });
        inner += '</div>';
      }
    }

    tempDiv.innerHTML = inner;
    document.body.appendChild(tempDiv);
    const height = tempDiv.offsetHeight + ITEM_BUFFER_PX;
    document.body.removeChild(tempDiv);
    return height;
  };

  const allItems = [...(local.itens_inspecao || [])];
  if (local.comentarios) {
    allItems.push({ tipo: 'comentario', comentarios: local.comentarios, isComentarioGeral: true });
  }

  let currentPage = [];
  let currentHeight = 0;
  let currentMapItems = [];

  const buildPageMap = (itemsMap, usedHeightPx, isFirstPage) => {
    const maxUsableHeightPx = getUsableHeight(isFirstPage);
    const breakLimitPx = getBottomLimit(isFirstPage);
    return {
      maxUsableHeightPx,
      breakLimitPx,
      usedHeightPx,
      remainingHeightPx: Math.max(0, breakLimitPx - usedHeightPx),
      footerGuardPx: FOOTER_GUARD_PX,
      breakBeforeLimitPx: BREAK_BEFORE_LIMIT_PX,
      firstPageExtraHeightPx: isFirstPage ? FIRST_PAGE_EXTRA_HEIGHT_PX : 0,
      items: itemsMap,
    };
  };

  // support numeric second arg for legacy callers: paginateLocalItemsForPrinting(local, maxItemsForFirstPage)
  let firstPageMaxItems = undefined;
  if (typeof opts === 'number') firstPageMaxItems = opts;
  else if (opts && typeof opts.firstPageMaxItems === 'number') firstPageMaxItems = opts.firstPageMaxItems;

  for (const item of allItems) {
    // If configured, enforce an item-count cap on the first page of this local
    if (pages.length === 0 && typeof firstPageMaxItems === 'number' && currentPage.length >= firstPageMaxItems) {
      pages.push({
        local,
        items: currentPage,
        isFirstPageOfLocal: true,
        pageMap: buildPageMap(currentMapItems, currentHeight, true),
      });
      currentPage = [];
      currentHeight = 0;
      currentMapItems = [];
    }

    let itemHeight = 0;
    try {
      itemHeight = measureItemHeight(item);
    } catch (err) {
      const fotos = (item.fotos && item.fotos.length) || 0;
      const fotoRows = Math.ceil(fotos / 3);
      itemHeight = 28 + (fotos > 0 ? (fotoRows * 160) : 0);
    }

    const isFirstPage = pages.length === 0;
    const bottomLimit = getBottomLimit(isFirstPage);
    const projectedHeight = currentHeight + itemHeight;
    const remainingAfterProjection = bottomLimit - projectedHeight;
    const shouldBreakBeforeItem = currentPage.length > 0 && (projectedHeight > bottomLimit || remainingAfterProjection < BREAK_BEFORE_LIMIT_PX);

    if (shouldBreakBeforeItem) {
      pages.push({
        local,
        items: currentPage,
        isFirstPageOfLocal: isFirstPage,
        pageMap: buildPageMap(currentMapItems, currentHeight, isFirstPage),
      });
      currentPage = [];
      currentHeight = 0;
      currentMapItems = [];
    }

    const startHeight = currentHeight;
    currentPage.push(item);
    currentHeight += itemHeight;

    const pageIsFirstAfterPush = pages.length === 0;
    const pageBottomAfterPush = getBottomLimit(pageIsFirstAfterPush);

    currentMapItems.push({
      indexInLocal: currentPage.length - 1,
      tipo: item.tipo || 'item',
      hasPhotos: !!(item.fotos && item.fotos.length > 0),
      photosCount: (item.fotos && item.fotos.length) || 0,
      estimatedHeightPx: itemHeight,
      startPx: startHeight,
      endPx: currentHeight,
      remainingAfterPx: Math.max(0, pageBottomAfterPush - currentHeight),
    });
  }

  if (currentPage.length > 0) {
    const isFirst = pages.length === 0;
    pages.push({
      local,
      items: currentPage,
      isFirstPageOfLocal: isFirst,
      pageMap: buildPageMap(currentMapItems, currentHeight, isFirst),
    });
  }

  return pages;
}
