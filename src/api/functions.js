import { SendEmail } from './integrations';

// Wrapper local para envio de email (stub)
export const sendCustomEmail = async (opts) => {
  // Aceita campos extras como from_name e ignora-os se não usados
  const { to, subject, body } = opts || {};
  return await SendEmail({ to, subject, body });
};

