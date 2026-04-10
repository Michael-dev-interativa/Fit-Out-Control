import { UploadFile } from '@/api/integrations';

function cloneValue(value) {
  if (value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map(cloneValue);
  if (typeof value === 'object') {
    const out = {};
    Object.entries(value).forEach(([k, v]) => {
      out[k] = cloneValue(v);
    });
    return out;
  }
  return value;
}

export function useOfflinePhoto() {
  async function uploadPhoto(file) {
    if (!file) throw new Error('Arquivo invalido');

    const response = await UploadFile({ file });
    const url =
      response?.file_url
      || response?.url
      || response?.file_path
      || response?.path
      || '';

    if (!url) {
      throw new Error('Upload sem URL retornada');
    }

    return { ...response, url };
  }

  async function resolveDataForSave(data) {
    // Mantem formato atual dos formularios; imagens offline ja entram como DataURL.
    return cloneValue(data);
  }

  return {
    uploadPhoto,
    resolveDataForSave,
  };
}
