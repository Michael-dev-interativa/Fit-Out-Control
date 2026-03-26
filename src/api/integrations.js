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

export async function UploadFile({ file }) {
  // If image is larger than threshold, compress it before uploading
  const IMAGE_SIZE_THRESHOLD = 2.5 * 1024 * 1024; // 2.5 MB
  let toUpload = file;
  if (file && file.type && file.type.startsWith('image/') && file.size > IMAGE_SIZE_THRESHOLD && typeof window !== 'undefined') {
    try {
      toUpload = await compressImageFile(file, { maxWidth: 1600, quality: 0.78 });
      console.log('[UploadFile] compressed image', file.size, '->', toUpload.size);
    } catch (e) {
      console.warn('[UploadFile] image compression failed, uploading original', e && (e.message || e));
      toUpload = file;
    }
  }

  const form = new FormData();
  form.append('file', toUpload);
  const r = await fetch(apiUrl('/api/upload'), { method: 'POST', body: form });
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
    const err = new Error('UploadFile failed');
    err.status = r.status;
    err.payload = payload;
    throw err;
  }

  return payload;
}

// Stubs não utilizados atualmente; mantidos apenas para compatibilidade
export const Core = {};
export const InvokeLLM = async () => { throw new Error('InvokeLLM not configured'); };
export const SendEmail = async () => { throw new Error('SendEmail not configured'); };
export const GenerateImage = async () => { throw new Error('GenerateImage not configured'); };
export const ExtractDataFromUploadedFile = async () => { throw new Error('ExtractDataFromUploadedFile not configured'); };
export const CreateFileSignedUrl = async () => { throw new Error('CreateFileSignedUrl not configured'); };
export const UploadPrivateFile = async () => { throw new Error('UploadPrivateFile not configured'); };






