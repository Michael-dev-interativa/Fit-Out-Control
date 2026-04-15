/**
 * Utilitário centralizado para compressão de imagens em relatórios
 * Encontra e comprime todas as imagens no objeto de relatório antes da renderização
 */

/**
 * Comprime uma imagem de URL para DataURL em JPEG comprimido.
 * Usa fetch + blob URL para evitar taint de canvas cross-origin.
 */
const compressImage = async (url, maxWidth = 250, quality = 0.2) => {
  if (!url || typeof url !== 'string') return url;
  if (url.startsWith('data:image')) return url;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) return url;

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const result = await new Promise((resolve) => {
      const img = new Image();

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (maxWidth && width > maxWidth) {
            height = Math.round(height * maxWidth / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch {
          resolve(url);
        }
      };

      img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(url); };
      img.src = objectUrl;
    });

    return result;
  } catch {
    return url;
  }
};

/**
 * Detecta se uma string é URL de imagem
 */
const isImageUrl = (value) => {
  if (typeof value !== 'string') return false;
  if (value.startsWith('data:image')) return true;
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) {
    // URLs com extensão de imagem
    if (/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(value)) return true;
    // Endpoint interno de arquivos do banco (sem extensão)
    if (value.includes('/api/files/')) return true;
    // Uploads locais
    if (value.includes('/uploads/')) return true;
  }
  return false;
};

/**
 * Detecta a qualidade ideal baseada no nome do campo
 */
const qualityForKey = (key) => {
  if (key.includes('logo')) return 0.45;
  if (key.includes('capa') || key.includes('cover')) return 0.35;
  if (key.includes('empreendimento') || key.includes('localizacao')) return 0.35;
  return 0.2;
};

/**
 * Percorre recursivamente o objeto (clone) e comprime todas as imagens em paralelo.
 * Modifica o objeto in-place — não usa path strings, sem risco de erro de travessia.
 */
const compressObjectImages = async (obj) => {
  if (!obj || typeof obj !== 'object') return;

  const promises = [];

  if (Array.isArray(obj)) {
    obj.forEach((item, i) => {
      if (isImageUrl(item)) {
        promises.push(
          compressImage(item, 300, 0.3).then(compressed => { obj[i] = compressed; })
        );
      } else if (item && typeof item === 'object') {
        promises.push(compressObjectImages(item));
      }
    });
  } else {
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (isImageUrl(value)) {
        if (key.includes('assinatura')) return; // preservar assinaturas sem compressão (PNG com transparência)
        promises.push(
          compressImage(value, qualityForKey(key) > 0.15 ? 400 : 250, qualityForKey(key)).then(compressed => { obj[key] = compressed; })
        );
      } else if (value && typeof value === 'object') {
        promises.push(compressObjectImages(value));
      }
    });
  }

  await Promise.all(promises);
};

/**
 * Comprime TODAS as imagens de um relatório (qualquer tipo).
 * Retorna um clone do relatório com todas as imagens comprimidas.
 */
export const compressReportImages = async (relatorio) => {
  if (!relatorio) return relatorio;

  try {
    const clone = JSON.parse(JSON.stringify(relatorio));

    console.log('[compressReportImages] Iniciando compressão...');
    await compressObjectImages(clone);
    console.log('[compressReportImages] ✓ Compressão concluída');

    return clone;
  } catch (error) {
    console.error('[compressReportImages] Erro na compressão:', error);
    return relatorio;
  }
};

export { compressImage };
