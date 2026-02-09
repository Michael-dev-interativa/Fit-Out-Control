// Cliente local stub para evitar redirecionamentos/SDK externos do Base44
import { UploadFile as RealUploadFile } from './integrations';

// Usa a função real de upload do integrations.js
async function UploadFile({ file }) {
  return RealUploadFile({ file });
}

async function UploadPrivateFile({ file }) {
  return UploadFile({ file });
}

async function CreateFileSignedUrl({ path }) {
  // Sem storage, retorna eco do path
  return { url: String(path || '') };
}

async function SendEmail({ to, subject, body }) {
  // Stub: não envia email de fato
  return { ok: true, to, subject };
}

async function InvokeLLM({ prompt }) {
  // Stub simples
  return { text: `Resposta simulada: ${String(prompt || '')}` };
}

async function GenerateImage({ prompt }) {
  // Retorna placeholder
  return { image_url: 'https://via.placeholder.com/1024x768?text=Imagem+Gerada' };
}

async function ExtractDataFromUploadedFile({ file }) {
  // Sem OCR/extração, retorna metadados básicos
  return { name: file?.name || '', size: file?.size || 0, type: file?.type || '' };
}

export const base44 = {
  entities: {},
  integrations: {
    Core: {
      UploadFile,
      UploadPrivateFile,
      CreateFileSignedUrl,
      SendEmail,
      InvokeLLM,
      GenerateImage,
      ExtractDataFromUploadedFile,
    },
  },
  auth: {
    async me() {
      return null; // sem autenticação integrada por enquanto
    }
  }
};
