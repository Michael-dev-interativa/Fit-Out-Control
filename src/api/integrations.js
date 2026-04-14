import { base44 } from './base44Client';
import { apiUrl } from './config';

// Integrações locais mínimas (remoção do Base44)

// Upload de arquivo para nosso backend Express
// Compress images in-browser before upload to reduce size and avoid MULTER limits.
async function compressImageFile(file, { maxWidth = 1600, quality = 0.78 } = {}) {
  if (!file || !file.type || !file.type.startsWith('image/')) return file;
  try {
    // load image as bitmap
    const imgBitmap = await createImageBitmap(file);
    const ratio = Math.min(1, maxWidth / imgBitmap.width);
    const width = Math.round(imgBitmap.width * ratio);
    const height = Math.round(imgBitmap.height * ratio);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgBitmap, 0, 0, width, height);
    // Prefer JPEG to massively reduce photo size; preserve as jpeg regardless of original type
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob) return file;
    // preserve original name but change extension
    const name = (file.name || 'image').replace(/\.[^.]+$/, '') + '.jpg';
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() });
  } catch (e) {
    // fallback: return original file
    console.warn('compressImageFile failed, using original', e && (e.message || e));
    return file;
  }
}

function isNetworkLikeError(err) {
  const msg = String(err?.message || '').toLowerCase();
  return (
    !navigator.onLine
    || msg.includes('failed to fetch')
    || msg.includes('networkerror')
    || msg.includes('network error')
    || msg.includes('load failed')
  );
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Falha ao converter arquivo para DataURL'));
    reader.readAsDataURL(file);
  });
}

async function buildOfflineUploadPayload(file) {
  const dataUrl = await fileToDataUrl(file);
  const pseudoId = `offline_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id: pseudoId,
    offline: true,
    queued: true,
    file_url: dataUrl,
    file_path: dataUrl,
    name: file?.name || 'offline-image.jpg',
    size: file?.size || 0,
    mime_type: file?.type || 'image/jpeg'
  };
}

export async function UploadFile({ file }) {
  // If image is larger than threshold, compress it before uploading
  const IMAGE_SIZE_THRESHOLD = 300 * 1024; // 300 KB — comprime praticamente todas as fotos
  let toUpload = file;
  if (file && file.type && file.type.startsWith('image/') && file.size > IMAGE_SIZE_THRESHOLD && typeof window !== 'undefined') {
    try {
      toUpload = await compressImageFile(file, { maxWidth: 800, quality: 0.6 });
      console.log('[UploadFile] compressed image', file.size, '->', toUpload.size);
    } catch (e) {
      console.warn('[UploadFile] image compression failed, uploading original', e && (e.message || e));
      toUpload = file;
    }
  }

  // Se estiver offline, salva como DataURL e segue fluxo sem erro
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    console.warn('[UploadFile] Offline detectado, salvando imagem localmente como DataURL');
    return buildOfflineUploadPayload(toUpload);
  }

  let r;
  try {
    const form = new FormData();
    form.append('file', toUpload);
    r = await fetch(apiUrl('/api/upload'), { method: 'POST', body: form });
  } catch (err) {
    if (!isNetworkLikeError(err)) throw err;
    console.warn('[UploadFile] Falha de rede no upload, usando fallback DataURL:', err?.message || err);
    return buildOfflineUploadPayload(toUpload);
  }
  // tolerant parsing: accept JSON or text; include parsed payload in thrown errors
  const ctype = String(r.headers.get('content-type') || '').toLowerCase();
  let payload = null;
  if (ctype.includes('application/json')) {
    try {
      payload = await r.json();
    } catch (e) {
      // fallback: try parse text
      try {
        const t = await r.text();
        payload = JSON.parse(t);
      } catch (e2) {
        payload = await r.text().catch(() => null);
      }
    }
  } else {
    // not JSON content-type: read as text and attempt JSON.parse
    try {
      const t = await r.text();
      try { payload = JSON.parse(t); } catch { payload = t; }
    } catch (e) {
      payload = null;
    }
  }

  if (!r.ok) {
    console.error('UploadFile failed', { status: r.status, payload });
    // Em indisponibilidade de rede/backend, mantém imagem local para não perder dados
    if (r.status >= 500 || r.status === 0) {
      console.warn('[UploadFile] Backend indisponível, salvando imagem localmente como DataURL');
      return buildOfflineUploadPayload(toUpload);
    }
    const err = new Error('UploadFile failed');
    err.status = r.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}

/**
 * Varre recursivamente um payload e faz upload de qualquer valor que seja
 * um data: URL (imagem salva offline). Retorna o objeto com as URLs reais
 * do servidor. Chamado durante o processamento da fila de sync.
 */
export async function resolveDataUrlsInBody(body) {
  if (!body) return body;

  async function uploadDataUrl(dataUrl) {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], 'sync-image.jpg', { type: blob.type || 'image/jpeg' });
      const form = new FormData();
      form.append('file', file);
      const r = await fetch(apiUrl('/api/upload'), { method: 'POST', body: form });
      if (!r.ok) return dataUrl; // mantém data: URL se o upload falhar
      const result = await r.json();
      return result.file_url || dataUrl;
    } catch {
      return dataUrl; // em caso de erro, mantém o valor original
    }
  }

  async function resolveValue(value) {
    if (typeof value === 'string' && value.startsWith('data:')) {
      return uploadDataUrl(value);
    }
    if (Array.isArray(value)) {
      return Promise.all(value.map(resolveValue));
    }
    if (value && typeof value === 'object') {
      const out = {};
      for (const [k, v] of Object.entries(value)) {
        out[k] = await resolveValue(v);
      }
      return out;
    }
    return value;
  }

  return resolveValue(body);
}

// Stubs não utilizados atualmente; mantidos apenas para compatibilidade
export const Core = {};
export const InvokeLLM = async () => { throw new Error('InvokeLLM not configured'); };
export const SendEmail = async () => { throw new Error('SendEmail not configured'); };
export const GenerateImage = async () => { throw new Error('GenerateImage not configured'); };
export const ExtractDataFromUploadedFile = async () => { throw new Error('ExtractDataFromUploadedFile not configured'); };
export const CreateFileSignedUrl = async () => { throw new Error('CreateFileSignedUrl not configured'); };
export const UploadPrivateFile = async () => { throw new Error('UploadPrivateFile not configured'); };






