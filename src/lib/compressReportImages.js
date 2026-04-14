/**
 * Utilitário centralizado para compressão de imagens em relatórios
 * Encontra e comprime todas as imagens no objeto de relatório antes da renderização
 */

/**
 * Comprime uma imagem de URL para DataURL em JPEG comprimido
 */
const compressImage = (url, maxWidth = 600, quality = 0.4) => {
  return new Promise((resolve) => {
    if (!url || typeof url !== 'string' || url.startsWith('data:image')) {
      resolve(url);
      return;
    }
    if (url.includes('base44.app/api')) {
      resolve(url);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timeoutId = setTimeout(() => {
      console.warn('[compressImage] Timeout ao carregar:', url);
      resolve(url);
    }, 10000);

    img.onload = () => {
      clearTimeout(timeoutId);
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round(height * maxWidth / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (error) {
        console.warn('[compressImage] Erro ao comprimir:', error);
        resolve(url);
      }
    };

    img.onerror = () => {
      clearTimeout(timeoutId);
      resolve(url);
    };

    img.src = url;
  });
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
  if (key.includes('logo')) return 0.7;
  if (key.includes('capa') || key.includes('cover')) return 0.5;
  if (key.includes('empreendimento') || key.includes('localizacao')) return 0.5;
  return 0.4;
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
          compressImage(item, 600, 0.4).then(compressed => { obj[i] = compressed; })
        );
      } else if (item && typeof item === 'object') {
        promises.push(compressObjectImages(item));
      }
    });
  } else {
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (isImageUrl(value)) {
        promises.push(
          compressImage(value, 600, qualityForKey(key)).then(compressed => { obj[key] = compressed; })
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
