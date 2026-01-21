
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Mail, Send, Loader2, CheckCircle, AlertCircle, Copy, ExternalLink, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { sendCustomEmail } from '@/api/functions';
import { Badge } from '@/components/ui/badge'; // Assuming you have a Badge component for displaying recipient emails

const translations = {
  pt: {
    sendReport: "Enviar Relatório por Email",
    recipientEmail: "Email do Destinatário",
    recipientEmails: "Emails dos Destinatários",
    addRecipient: "Adicionar Destinatário",
    subject: "Assunto",
    message: "Mensagem",
    send: "Enviar",
    sending: "Enviando...",
    cancel: "Cancelar",
    emailSent: "Email enviado com sucesso!",
    emailError: "Erro ao enviar email",
    emailNotConfigured: "O serviço de email não está respondendo. Verifique se as 'Backend Functions' estão ativas e se um provedor de email (como SendGrid) foi configurado nas configurações do app.",
    alternativeTitle: "Alternativas para Envio",
    copyLink: "Copiar Link do Relatório",
    openInNewTab: "Abrir em Nova Aba",
    linkCopied: "Link copiado para a área de transferência!",
    copyEmailText: "Copiar Texto do Email",
    textCopied: "Texto copiado! Cole em seu cliente de email.",
    defaultSubject: "Relatório de Vistoria de Obra",
    defaultMessage: `Prezado(a),

Segue em anexo o relatório de vistoria de obra conforme solicitado.

Para visualizar o relatório completo, acesse o link abaixo:
{reportUrl}

Atenciosamente,
Interativa Engenharia`,
    emailRequired: "Email é obrigatório",
    invalidEmail: "Email inválido",
    subjectRequired: "Assunto é obrigatório",
    atLeastOneRecipient: "Adicione pelo menos um destinatário."
  },
  en: {
    sendReport: "Send Report by Email",
    recipientEmail: "Recipient Email",
    recipientEmails: "Recipient Emails",
    addRecipient: "Add Recipient",
    subject: "Subject",
    message: "Message",
    send: "Send",
    sending: "Sending...",
    cancel: "Cancel",
    emailSent: "Email sent successfully!",
    emailError: "Error sending email",
    emailNotConfigured: "The email service is not responding. Please check if 'Backend Functions' are active and if an email provider (like SendGrid) has been configured in the app settings.",
    alternativeTitle: "Sending Alternatives",
    copyLink: "Copy Report Link",
    openInNewTab: "Open in New Tab",
    linkCopied: "Link copied to clipboard!",
    copyEmailText: "Copy Email Text",
    textCopied: "Text copied! Paste it in your email client.",
    defaultSubject: "Inspection Report",
    defaultMessage: `Dear,

Please find attached the inspection report as requested.

To view the complete report, access the link below:
{reportUrl}

Best regards,
Interativa Engenharia`,
    emailRequired: "Email is required",
    invalidEmail: "Invalid email",
    subjectRequired: "Subject is required",
    atLeastOneRecipient: "Add at least one recipient."
  }
};

export default function EnviarEmailDialog({ vistoria, unidade, empreendimento, reportUrl, theme = 'light' }) {
  const [open, setOpen] = useState(false);
  const [destinatarios, setDestinatarios] = useState(() => {
    const initialEmail = unidade?.contatos ? unidade.contatos.split(',')[0]?.trim() : '';
    return initialEmail ? [initialEmail] : [];
  });
  const [novoEmail, setNovoEmail] = useState('');
  const [assunto, setAssunto] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error' | 'not_configured'
  const [errorMessage, setErrorMessage] = useState('');
  const [language] = useState(localStorage.getItem('language') || 'pt');

  const t = translations[language];
  const isDark = theme === 'dark';

  useEffect(() => {
    if (open) {
      // Reset form when dialog opens
      setStatus(null);
      setErrorMessage('');
      setNovoEmail(''); // Clear new email input

      // Initialize destinatarios
      const initialEmail = unidade?.contatos ? unidade.contatos.split(',')[0]?.trim() : '';
      setDestinatarios(initialEmail ? [initialEmail] : []);
      
      // Set default subject
      const defaultSubject = `${t.defaultSubject} - ${empreendimento?.nome_empreendimento || 'Empreendimento'} - ${unidade?.unidade_empreendimento || 'Unidade'}`;
      setAssunto(defaultSubject);
      
      // Set default message with report URL
      const defaultMessage = t.defaultMessage.replace('{reportUrl}', reportUrl);
      setMensagem(defaultMessage);
    }
  }, [open, t, reportUrl, empreendimento, unidade]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleAddRecipient = () => {
    if (novoEmail.trim() && validateEmail(novoEmail.trim()) && !destinatarios.includes(novoEmail.trim())) {
      setDestinatarios([...destinatarios, novoEmail.trim()]);
      setNovoEmail('');
      setStatus(null);
      setErrorMessage('');
    } else if (!novoEmail.trim()) {
      setStatus('error');
      setErrorMessage(t.emailRequired);
    } else if (!validateEmail(novoEmail.trim())) {
      setStatus('error');
      setErrorMessage(t.invalidEmail);
    }
  };

  const handleRemoveRecipient = (emailToRemove) => {
    setDestinatarios(destinatarios.filter(email => email !== emailToRemove));
    setStatus(null);
    setErrorMessage('');
  };

  const handleSend = async () => {
    // Validation
    if (destinatarios.length === 0) {
      setStatus('error');
      setErrorMessage(t.atLeastOneRecipient);
      return;
    }

    for (const recEmail of destinatarios) {
      if (!validateEmail(recEmail)) {
        setStatus('error');
        setErrorMessage(`${t.invalidEmail}: ${recEmail}`);
        return;
      }
    }

    if (!assunto.trim()) {
      setStatus('error');
      setErrorMessage(t.subjectRequired);
      return;
    }

    setEnviando(true);
    setStatus(null);
    setErrorMessage('');

    try {
      await sendCustomEmail({
        to: destinatarios.join(','),
        subject: assunto.trim(),
        body: mensagem.trim(),
        from_name: 'Interativa Engenharia'
      });

      setStatus('success');
      setTimeout(() => {
        setOpen(false);
      }, 2000);

    } catch (error) {
      console.error('Erro detalhado ao enviar email:', error);
      setStatus('error');
      const details = error.response?.data?.details || error.message;
      setErrorMessage(`${t.emailError}: ${details}`);
    } finally {
      setEnviando(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(reportUrl);
      setStatus('success');
      setErrorMessage(t.linkCopied);
      setTimeout(() => {
        setStatus(null);
        setErrorMessage('');
      }, 2000);
    } catch (error) {
      console.error('Erro ao copiar link:', error);
    }
  };

  const handleCopyEmailText = async () => {
    const fullText = `Para: ${destinatarios.join(', ')}\nAssunto: ${assunto}\n\n${mensagem}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setStatus('success');
      setErrorMessage(t.textCopied);
      setTimeout(() => {
        setStatus(null);
        setErrorMessage('');
      }, 2000);
    } catch (error) {
      console.error('Erro ao copiar texto:', error);
    }
  };

  const handleOpenInNewTab = () => {
    window.open(reportUrl, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          className={`${isDark ? 'bg-blue-700 text-blue-100 border-blue-600 hover:bg-blue-600' : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'}`}
        >
          <Mail className="w-4 h-4 mr-2" />
          {t.sendReport}
        </Button>
      </DialogTrigger>
      <DialogContent className={`max-w-lg ${isDark ? 'bg-gray-800' : ''}`}>
        <DialogHeader>
          <DialogTitle className={isDark ? 'text-white' : ''}>{t.sendReport}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {status === 'success' && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {errorMessage || t.emailSent}
              </AlertDescription>
            </Alert>
          )}

          {status === 'error' && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {errorMessage}
              </AlertDescription>
            </Alert>
          )}

          {status === 'not_configured' && (
            <div className="space-y-4">
              <Alert className="border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  {errorMessage}
                </AlertDescription>
              </Alert>
              
              <div className={`p-4 rounded-lg border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                <h4 className={`font-medium mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.alternativeTitle}</h4>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    className="w-full justify-start"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {t.copyLink}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleOpenInNewTab}
                    className="w-full justify-start"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    {t.openInNewTab}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyEmailText}
                    className="w-full justify-start"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    {t.copyEmailText}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {status !== 'not_configured' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="recipient-emails" className={isDark ? 'text-gray-300' : ''}>{t.recipientEmails}</Label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {destinatarios.map((recEmail) => (
                    <Badge key={recEmail} className={`flex items-center ${isDark ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-700'}`}>
                      {recEmail}
                      <X className="ml-1 h-3 w-3 cursor-pointer" onClick={() => handleRemoveRecipient(recEmail)} />
                    </Badge>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Input
                    id="novoEmail"
                    type="email"
                    value={novoEmail}
                    onChange={(e) => setNovoEmail(e.target.value)}
                    placeholder="cliente@exemplo.com"
                    className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                    disabled={enviando}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddRecipient();
                      }
                    }}
                  />
                  <Button 
                    type="button" 
                    onClick={handleAddRecipient} 
                    disabled={enviando || !novoEmail.trim()}
                    variant="secondary"
                    className={isDark ? 'bg-gray-700 text-gray-100 border-gray-600 hover:bg-gray-600' : ''}
                  >
                    {t.addRecipient}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assunto" className={isDark ? 'text-gray-300' : ''}>{t.subject}</Label>
                <Input
                  id="assunto"
                  value={assunto}
                  onChange={(e) => setAssunto(e.target.value)}
                  className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                  disabled={enviando}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mensagem" className={isDark ? 'text-gray-300' : ''}>{t.message}</Label>
                <Textarea
                  id="mensagem"
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  className={`h-32 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                  disabled={enviando}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={enviando}
            className={isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : ''}
          >
            {t.cancel}
          </Button>
          {status !== 'not_configured' && (
            <Button
              onClick={handleSend}
              disabled={enviando || status === 'success' || destinatarios.length === 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {enviando ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t.sending}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  {t.send}
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
