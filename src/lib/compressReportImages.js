/**
 * Utilitário centralizado para compressão de imagens em relatórios
 * Encontra e comprime todas as imagens no objeto de relatório antes da renderização
 */

/**
 * Comprime uma imagem de URL para DataURL em JPEG comprimido
 * @param {string} url - URL da imagem (http, data:image, etc)
 * @param {number} maxWidth - Largura máxima em pixels (padrão 800)
 * @param {number} quality - Qualidade JPEG 0-1 (padrão 0.6)
 * @returns {Promise<string>} DataURL comprimida ou URL original se falhar
 */
const compressImage = (url, maxWidth = 600, quality = 0.4) => {
  return new Promise((resolve) => {
    // Não comprimir URLs que já são data: ou da API interna
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

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        let width = img.width;
        let height = img.height;

        // Redimensionar se necessário mantendo proporção
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        const compressedUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedUrl);
      } catch (error) {
        console.warn('[compressImage] Erro ao comprimir:', error);
        resolve(url); // Retornar original em caso de erro
      }
    };

    img.onerror = () => {
      resolve(url); // Retornar original em caso de erro
    };

    // Timeout de 10s para evitar travamento
    const timeoutId = setTimeout(() => {
      console.warn('[compressImage] Timeout ao carregar:', url);
      resolve(url);
    }, 10000);

    img.onload = ((onloadFn) => {
      return function () {
        clearTimeout(timeoutId);
        onloadFn.call(this);
      };
    })(img.onload);

    img.onerror = ((onerrorFn) => {
      return function () {
        clearTimeout(timeoutId);
        onerrorFn.call(this);
      };
    })(img.onerror);

    img.src = url;
  });
};

/**
 * Detecta se uma string é URL de imagem (http/https)
 * @param {*} value
 * @returns {boolean}
 */
const isImageUrl = (value) => {
  if (typeof value !== 'string') return false;
  if (value.startsWith('data:image')) return true; // Já comprimida
  if (value.startsWith('http://') || value.startsWith('https://')) {
    return value.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i);
  }
  return false;
};

/**
 * Busca profundamente todas as URLs de imagem em um objeto
 * @param {*} obj - Objeto para buscar
 * @param {Array} found - Array para acumular [{ path, url, maxWidth, quality }, ...]
 * @param {string} prefix - Prefixo do caminho (interno)
 * @returns {Array} Lista de imagens encontradas com seus caminhos
 */
const findImageUrls = (obj, found = [], prefix = '') => {
  if (!obj) return found;

  if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      findImageUrls(item, found, `${prefix}[${idx}]`);
    });
  } else if (typeof obj === 'object') {
    Object.entries(obj).forEach(([key, value]) => {
      const currentPath = prefix ? `${prefix}.${key}` : key;

      if (isImageUrl(value)) {
        // Detectar qualidade por contexto do campo
        let quality = 0.4; // Padrão
        if (key.includes('capa') || key.includes('cover')) quality = 0.5;
        if (key.includes('logo')) quality = 0.7;
        if (key.includes('empreendimento') || key.includes('localizacao')) quality = 0.5;

        found.push({
          path: currentPath,
          url: value,
          quality,
          maxWidth: 600
        });
      } else if (typeof value === 'object') {
        findImageUrls(value, found, currentPath);
      }
    });
  }

  return found;
};

/**
 * Define um valor profundamente em um objeto usando um caminho string
 * Ex: setValueByPath(obj, "inspecao.itens[0].fotos[0].url", "data:image/...")
 * @param {object} obj
 * @param {string} path
 * @param {*} value
 */
const setValueByPath = (obj, path, value) => {
  const parts = path.match(/[^\.\[\]]+|\[\d+\]/g) || [];
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    let key;
    let index = null;

    if (part.startsWith('[')) {
      index = parseInt(part.slice(1, -1));
      key = parts[i - 1]; // key anterior
    } else {
      key = part;
    }

    if (index !== null) {
      current = current[key][index];
    } else {
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }
  }

  const lastPart = parts[parts.length - 1];
  if (lastPart.startsWith('[')) {
    const index = parseInt(lastPart.slice(1, -1));
    const key = parts[parts.length - 2];
    current[key][index] = value;
  } else {
    current[lastPart] = value;
  }
};

/**
 * Comprime TODAS as imagens de um relatório (qualquer tipo)
 * Busca todas as URLs dentro do objeto e as comprime em paralelo
 * @param {object} relatorio - Objeto do relatório (InspecaoArCondicionado, etc)
 * @returns {Promise<object>} Relatório com imagens comprimidas
 */
export const compressReportImages = async (relatorio) => {
  if (!relatorio) return relatorio;

  try {
    // Deep clone para não modificar original durante compressão
    const compressedRelatorio = JSON.parse(JSON.stringify(relatorio));

    // 1. Encontrar todas as URLs de imagem
    const imageUrls = findImageUrls(compressedRelatorio);

    if (imageUrls.length === 0) {
      console.log('[compressReportImages] Nenhuma imagem encontrada');
      return compressedRelatorio;
    }

    console.log(`[compressReportImages] Comprimindo ${imageUrls.length} imagens...`);

    // 2. Comprimir em paralelo com Promise.all
    const compressions = imageUrls.map(({ url, quality, maxWidth }) =>
      compressImage(url, maxWidth, quality)
    );

    const compressedUrls = await Promise.all(compressions);

    // 3. Substituir URLs no objeto
    imageUrls.forEach((img, idx) => {
      setValueByPath(compressedRelatorio, img.path, compressedUrls[idx]);
    });

    // 4. Também comprimir foto do empreendimento (se necessário nos dados do relatorio)
    if (compressedRelatorio.relatorio_empreendimento_foto && isImageUrl(compressedRelatorio.relatorio_empreendimento_foto)) {
      compressedRelatorio.relatorio_empreendimento_foto = await compressImage(
        compressedRelatorio.relatorio_empreendimento_foto,
        600,
        0.5
      );
    }

    console.log(`[compressReportImages] ✓ ${imageUrls.length} imagens comprimidas com sucesso`);
    return compressedRelatorio;
  } catch (error) {
    console.error('[compressReportImages] Erro na compressão:', error);
    return relatorio; // Retornar original em caso de erro crítico
  }
};

/**
 * Função para exportar compressImage isoladamente (uso em componentes se necessário)
 */
export { compressImage };
