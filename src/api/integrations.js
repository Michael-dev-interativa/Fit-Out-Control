import { base44 } from './base44Client';
import { apiUrl } from './config';

// Integrações locais mínimas (remoção do Base44)

// Upload de arquivo para nosso backend Express
export async function UploadFile({ file }) {
  const form = new FormData();
  form.append('file', file);
  const r = await fetch(apiUrl('/api/upload'), { method: 'POST', body: form });
  if (!r.ok) {
    let payload = null;
    try { payload = await r.json(); } catch { try { payload = await r.text(); } catch { payload = null; } }
    console.error('UploadFile failed', { status: r.status, payload });
    throw new Error('UploadFile failed');
  }
  return r.json();
}

// Stubs não utilizados atualmente; mantidos apenas para compatibilidade
export const Core = {};
export const InvokeLLM = async () => { throw new Error('InvokeLLM not configured'); };
export const SendEmail = async () => { throw new Error('SendEmail not configured'); };
export const GenerateImage = async () => { throw new Error('GenerateImage not configured'); };
export const ExtractDataFromUploadedFile = async () => { throw new Error('ExtractDataFromUploadedFile not configured'); };
export const CreateFileSignedUrl = async () => { throw new Error('CreateFileSignedUrl not configured'); };
export const UploadPrivateFile = async () => { throw new Error('UploadPrivateFile not configured'); };






