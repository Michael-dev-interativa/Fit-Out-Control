export function chunkItems(items = [], chunkSize = 1) {
  const safeChunkSize = Math.max(1, Number(chunkSize) || 1);
  const safeItems = Array.isArray(items) ? items : [];
  const chunks = [];

  for (let i = 0; i < safeItems.length; i += safeChunkSize) {
    chunks.push(safeItems.slice(i, i + safeChunkSize));
  }

  return chunks;
}

export function paginateItemsByCount(items = [], opts = {}) {
  const safeItems = Array.isArray(items) ? items : [];
  if (safeItems.length === 0) return [];

  const firstPageCount = Math.max(1, Number(opts.firstPageCount ?? opts.perPageCount ?? safeItems.length) || safeItems.length);
  const perPageCount = Math.max(1, Number(opts.perPageCount ?? firstPageCount) || firstPageCount);

  const pages = [];
  let cursor = 0;

  const firstItems = safeItems.slice(cursor, cursor + firstPageCount);
  if (firstItems.length > 0) {
    pages.push(firstItems);
    cursor += firstPageCount;
  }

  while (cursor < safeItems.length) {
    pages.push(safeItems.slice(cursor, cursor + perPageCount));
    cursor += perPageCount;
  }

  return pages;
}

export function paginateBlocksForPrinting(blocks = [], opts = {}) {
  const safeBlocks = Array.isArray(blocks) ? blocks.filter(Boolean) : [];
  if (safeBlocks.length === 0) return [];

  const PAGE_HEIGHT_PX = opts.pageHeightPx || 1122;
  const HEADER_HEIGHT_PX = opts.headerHeightPx || 80;
  const FOOTER_HEIGHT_PX = opts.footerHeightPx || 45;
  const PAGE_PADDING_PX = opts.pagePaddingPx || 8;
  const FOOTER_GUARD_PX = opts.footerGuardPx || 16;
  const BREAK_BEFORE_LIMIT_PX = opts.breakBeforeLimitPx || 24;
  const FIRST_PAGE_EXTRA_HEIGHT_PX = opts.firstPageExtraHeightPx || 0;
  const LEGACY_SAFETY_MARGIN_PX = opts.safetyMarginPx || 0;
  const DEFAULT_BLOCK_HEIGHT_PX = opts.defaultBlockHeightPx || 80;
  const MEASURE_BLOCK = typeof opts.measureBlockHeight === 'function'
    ? opts.measureBlockHeight
    : (block) => Number(block?.estimatedHeightPx) || DEFAULT_BLOCK_HEIGHT_PX;

  const getUsableHeight = (isFirstPage) => {
    const base = PAGE_HEIGHT_PX - HEADER_HEIGHT_PX - FOOTER_HEIGHT_PX - PAGE_PADDING_PX - LEGACY_SAFETY_MARGIN_PX;
    if (!isFirstPage) return base;
    return Math.max(120, base - FIRST_PAGE_EXTRA_HEIGHT_PX);
  };

  const getBottomLimit = (isFirstPage) => Math.max(120, getUsableHeight(isFirstPage) - FOOTER_GUARD_PX);

  const pages = [];
  let currentPage = [];
  let currentHeight = 0;

  safeBlocks.forEach((block, index) => {
    const isFirstPage = pages.length === 0;
    const bottomLimit = getBottomLimit(isFirstPage);
    const blockHeight = Math.max(24, Number(MEASURE_BLOCK(block, { index, isFirstPage, currentPage, currentHeight })) || DEFAULT_BLOCK_HEIGHT_PX);
    const projectedHeight = currentHeight + blockHeight;
    const remainingAfterProjection = bottomLimit - projectedHeight;
    const forceBreak = currentPage.length > 0 && (projectedHeight > bottomLimit || remainingAfterProjection < BREAK_BEFORE_LIMIT_PX || block.breakBefore === true);

    if (forceBreak) {
      pages.push(currentPage);
      currentPage = [];
      currentHeight = 0;
    }

    currentPage.push(block);
    currentHeight += blockHeight;
  });

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}

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
  const MAX_PHOTOS_PER_ITEM = opts.maxPhotosPerItem || 6;
  const SPLIT_PHOTO_ROWS = opts.splitPhotoRows === true;
  const PHOTO_CHUNK_SIZE = Math.max(1, opts.photoChunkSize || 3);

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

      const descricaoLen = (item.descricao || '').length;
      const observacoesLen = (item.observacoes || '').length;
      const descricaoLines = Math.max(1, Math.ceil(descricaoLen / 42));
      const observacoesLines = Math.max(1, Math.ceil(observacoesLen / 46));
      const textHeight = Math.max(descricaoLines, observacoesLines) * 14;

      const fotos = (item.fotos && item.fotos.length) || 0;
      const fotoRows = Math.ceil(fotos / 3);
      return ITEM_BUFFER_PX + 20 + textHeight + (fotos > 0 ? (fotoRows * PHOTO_MAX_HEIGHT_PX) : 0);
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
      inner = `<div style="border:1px solid #000; padding:8px; font-size:11px; line-height:1.2; white-space:pre-wrap; word-break:break-word; overflow-wrap:anywhere;">${escapeHtml(text)}</div>`;
    } else if (item.showOnlyPhotos) {
      const fotos = item.fotos || [];
      const hasLabel = !!(item.descricao && String(item.descricao).trim());
      inner = hasLabel ? `<div style="font-size:10px; margin-bottom:6px;">${escapeHtml(item.descricao || '')}</div>` : '';
      inner += '<div style="display:grid; grid-template-columns:repeat(3,1fr); gap:6px;">';
      fotos.forEach(() => {
        inner += `<div style="width:100%; height:${PHOTO_MAX_HEIGHT_PX}px; border:1px solid #ddd; box-sizing:border-box;"></div>`;
      });
      inner += '</div>';
    } else {
      const isOk = item.resultado === 'OK' ? '✓' : '';
      const isNok = item.resultado === 'N/OK' ? '✓' : '';
      const isNa = item.resultado === 'Não' ? '✓' : '';

      inner = '<table style="width:100%; border-collapse:collapse; table-layout:fixed; font-size:11px;">';
      inner += '<tbody><tr>';
      inner += `<td style="width:40%; border:1px solid #000; padding:8px; vertical-align:top; word-break:break-word; overflow-wrap:anywhere; white-space:pre-wrap;">${escapeHtml(item.descricao || '')}</td>`;
      inner += `<td style="width:6%; border:1px solid #000; padding:8px; text-align:center; vertical-align:middle;">${isOk}</td>`;
      inner += `<td style="width:6%; border:1px solid #000; padding:8px; text-align:center; vertical-align:middle;">${isNok}</td>`;
      inner += `<td style="width:6%; border:1px solid #000; padding:8px; text-align:center; vertical-align:middle;">${isNa}</td>`;
      inner += `<td style="width:42%; border:1px solid #000; padding:8px; vertical-align:top; word-break:break-word; overflow-wrap:anywhere; white-space:pre-wrap;">${escapeHtml(item.observacoes || '')}</td>`;
      inner += '</tr></tbody></table>';

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

  const allItems = [];
  for (const originalItem of (local.itens_inspecao || [])) {
    const fotos = (originalItem.fotos || []).filter((foto) => foto && typeof foto.url === 'string' && foto.url.trim() !== '');

    // Split in render blocks (text row + photo rows) to fit the remaining page space more precisely.
    if (SPLIT_PHOTO_ROWS && fotos.length > 0 && !originalItem.showOnlyPhotos) {
      allItems.push({ ...originalItem, fotos: [] });
      for (const photoChunk of chunkItems(fotos, PHOTO_CHUNK_SIZE)) {
        allItems.push({
          ...originalItem,
          descricao: '',
          fotos: photoChunk,
          showOnlyPhotos: true,
        });
      }
      continue;
    }

    if (fotos.length > MAX_PHOTOS_PER_ITEM) {
      const firstChunk = fotos.slice(0, MAX_PHOTOS_PER_ITEM);
      allItems.push({ ...originalItem, fotos: firstChunk });

      for (const photoChunk of chunkItems(fotos.slice(MAX_PHOTOS_PER_ITEM), MAX_PHOTOS_PER_ITEM)) {
        allItems.push({
          ...originalItem,
          descricao: `(Continuação) ${originalItem.descricao || ''}`.trim(),
          fotos: photoChunk,
          showOnlyPhotos: true,
        });
      }
    } else {
      allItems.push({ ...originalItem, fotos });
    }
  }

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
