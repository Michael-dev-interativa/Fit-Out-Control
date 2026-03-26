// Compat layer: reexport implementations from src/api/integrations.js
import * as apiIntegrations from '@/api/integrations';

export const UploadFile = apiIntegrations.UploadFile;
export const UploadPrivateFile = apiIntegrations.UploadPrivateFile || apiIntegrations.UploadPrivateFile;
export const CreateFileSignedUrl = apiIntegrations.CreateFileSignedUrl || apiIntegrations.CreateFileSignedUrl;
export const SendEmail = apiIntegrations.SendEmail || apiIntegrations.SendEmail;
export const InvokeLLM = apiIntegrations.InvokeLLM || apiIntegrations.InvokeLLM;
export const GenerateImage = apiIntegrations.GenerateImage || apiIntegrations.GenerateImage;
export const ExtractDataFromUploadedFile = apiIntegrations.ExtractDataFromUploadedFile || apiIntegrations.ExtractDataFromUploadedFile;

export default {
  UploadFile,
  UploadPrivateFile,
  CreateFileSignedUrl,
  SendEmail,
  InvokeLLM,
  GenerateImage,
  ExtractDataFromUploadedFile
};
