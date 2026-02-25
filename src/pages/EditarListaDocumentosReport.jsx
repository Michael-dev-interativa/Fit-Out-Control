import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ListaDocumentosReport, Empreendimento } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from 'lucide-react';
import SignatureField from '@/components/signature/SignatureField';
import SignatureDialog from '@/components/signature/SignatureDialog';

const translations = {
  pt: {
    backToList: "Voltar à Lista",
    editDocument: "Editar Lista de Documentos",
    save: "Salvar",
    saving: "Salvando...",
    generalInfo: "Informações Gerais",
    client: "Cliente",
    project: "Empreendimento",
    title: "Título",
    documentNumber: "Número do Documento",
    revision: "Revisão",
    issueDate: "Data de Aviso",
    documents: "Documentos",
    addDocument: "Adicionar Documento",
    documentCode: "Código do Documento",
    documentRev: "Revisão",
    documentTitle: "Título do Documento",
    documentObservations: "Observações",
    removeDocument: "Remover",
    observations: "Observações Gerais",
    signatures: "Assinaturas",
    addSignature: "Adicionar Assinatura",
    removeSignature: "Remover",
    status: "Status do Documento",
    loading: "Carregando documento..."
  },
  en: {
    backToList: "Back to List",
    editDocument: "Edit Document List",
    save: "Save",
    saving: "Saving...",
    generalInfo: "General Information",
    client: "Client",
    project: "Project",
    title: "Title",
    documentNumber: "Document Number",
    revision: "Revision",
    issueDate: "Issue Date",
    documents: "Documents",
    addDocument: "Add Document",
    documentCode: "Document Code",
    documentRev: "Revision",
    documentTitle: "Document Title",
    documentObservations: "Observations",
    removeDocument: "Remove",
    observations: "General Observations",
    signatures: "Signatures",
    addSignature: "Add Signature",
    removeSignature: "Remove",
    status: "Document Status",
    loading: "Loading document..."
  }
};

export default function EditarListaDocumentosReport({ language: initialLanguage, theme: initialTheme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const documentoId = urlParams.get('documentoId');

  const [empreendimento, setEmpreendimento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [language, setLanguage] = useState(initialLanguage || 'pt');
  const [theme, setTheme] = useState(initialTheme || 'light');

  const [formData, setFormData] = useState({
    id_empreendimento: '',
    cliente: '',
    empreendimento: '',
    titulo: 'LISTA DE DOCUMENTOS',
    numero_documento: '',
    revisao: '',
    data_aviso: '',
    documentos: [],
    assinaturas: [],
    observacoes_gerais: '',
    status_documento: 'Rascunho'
  });

  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [signatureEditIndex, setSignatureEditIndex] = useState(null);

  const t = translations[language];
  const isDark = theme === 'dark';

  useEffect(() => {
    const handleLanguageChange = () => setLanguage(localStorage.getItem('language') || 'pt');
    const handleThemeChange = () => setTheme(localStorage.getItem('theme') || 'light');
    window.addEventListener('language-change', handleLanguageChange);
    window.addEventListener('theme-change', handleThemeChange);
    handleLanguageChange();
    handleThemeChange();
    return () => {
      window.removeEventListener('language-change', handleLanguageChange);
      window.removeEventListener('theme-change', handleThemeChange);
    };
  }, []);

  useEffect(() => {
    if (documentoId) {
      loadData();
    }
  }, [documentoId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const docData = await ListaDocumentosReport.get(documentoId);
      setFormData(docData);

      if (docData.id_empreendimento) {
        const empData = await Empreendimento.get(docData.id_empreendimento);
        setEmpreendimento(empData);
      }
    } catch (error) {
      console.error("Erro ao carregar documento:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Normalizar data antes de enviar
      const payload = { ...formData };
      const normalizeClientDate = (v) => {
        if (!v) return null;
        if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(v)) {
          const [dd, mm, yyyy] = v.split('/');
          return `${yyyy}-${mm}-${dd}`;
        }
        const d = new Date(v);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        }
        return null;
      };

      payload.data_aviso = normalizeClientDate(payload.data_aviso);
      await ListaDocumentosReport.update(documentoId, payload);
      navigate(createPageUrl(`EmpreendimentoListaDocumentosReport?empreendimentoId=${payload.id_empreendimento}`));
    } catch (error) {
      console.error("Erro ao salvar documento:", error);
    } finally {
      setSaving(false);
    }
  };

  const addDocumento = () => {
    setFormData(prev => ({
      ...prev,
      documentos: [
        ...(prev.documentos || []),
        { codigo: '', rev: '', titulo: '', observacoes: '' }
      ]
    }));
  };

  const removeDocumento = (index) => {
    setFormData(prev => ({
      ...prev,
      documentos: prev.documentos.filter((_, i) => i !== index)
    }));
  };

  const updateDocumento = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      documentos: prev.documentos.map((doc, i) =>
        i === index ? { ...doc, [field]: value } : doc
      )
    }));
  };

  const addAssinatura = () => {
    setFormData(prev => ({
      ...prev,
      assinaturas: [...(prev.assinaturas || []), { parte: '', nome: '', assinatura_imagem: '' }]
    }));
  };

  const updateAssinatura = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      assinaturas: prev.assinaturas.map((ass, i) =>
        i === index ? { ...ass, [field]: value } : ass
      )
    }));
  };

  const removeAssinatura = (index) => {
    setFormData(prev => ({
      ...prev,
      assinaturas: prev.assinaturas.filter((_, i) => i !== index)
    }));
  };

  const handleSignatureEdit = (index) => {
    setSignatureEditIndex(index);
    setSignatureDialogOpen(true);
  };

  const handleSignatureSave = (signatureImage) => {
    if (signatureEditIndex !== null) {
      updateAssinatura(signatureEditIndex, 'assinatura_imagem', signatureImage);
    }
    setSignatureDialogOpen(false);
    setSignatureEditIndex(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <p className={`ml-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{t.loading}</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-6 space-y-6`}>
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl(`EmpreendimentoListaDocumentosReport?empreendimentoId=${formData.id_empreendimento}`))}
          className={isDark ? 'text-white border-gray-600 hover:bg-gray-800' : ''}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.backToList}
        </Button>

        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {t.saving}
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {t.save}
            </>
          )}
        </Button>
      </div>

      <Card className={isDark ? 'bg-gray-800' : ''}>
        <CardHeader>
          <CardTitle className={isDark ? 'text-white' : ''}>{t.editDocument}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Informações Gerais */}
          <div>
            <h3 className={`text-lg font-semibold mb-4 ${isDark ? 'text-white' : ''}`}>{t.generalInfo}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className={isDark ? 'text-gray-300' : ''}>{t.client}</Label>
                <Input
                  value={formData.cliente}
                  onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                  className={isDark ? 'bg-gray-700 text-white' : ''}
                />
              </div>
              <div>
                <Label className={isDark ? 'text-gray-300' : ''}>{t.project}</Label>
                <Input
                  value={formData.empreendimento}
                  onChange={(e) => setFormData({ ...formData, empreendimento: e.target.value })}
                  className={isDark ? 'bg-gray-700 text-white' : ''}
                />
              </div>
              <div>
                <Label className={isDark ? 'text-gray-300' : ''}>{t.title}</Label>
                <Input
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  className={isDark ? 'bg-gray-700 text-white' : ''}
                />
              </div>
              <div>
                <Label className={isDark ? 'text-gray-300' : ''}>{t.revision}</Label>
                <Input
                  value={formData.revisao}
                  onChange={(e) => setFormData({ ...formData, revisao: e.target.value })}
                  className={isDark ? 'bg-gray-700 text-white' : ''}
                />
              </div>
              <div>
                <Label className={isDark ? 'text-gray-300' : ''}>{t.issueDate}</Label>
                <Input
                  type="date"
                  value={formData.data_aviso}
                  onChange={(e) => setFormData({ ...formData, data_aviso: e.target.value })}
                  className={isDark ? 'bg-gray-700 text-white' : ''}
                />
              </div>
            </div>
          </div>

          {/* Documentos */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : ''}`}>{t.documents}</h3>
              <Button variant="outline" size="sm" onClick={addDocumento}>
                <Plus className="w-4 h-4 mr-2" />
                {t.addDocument}
              </Button>
            </div>
            <div className="space-y-3">
              {formData.documentos?.map((doc, index) => (
                <div key={index} className={`border rounded-lg p-4 ${isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-50'}`}>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                    <div>
                      <Label className="text-xs">{t.documentCode}</Label>
                      <Input
                        value={doc.codigo}
                        onChange={(e) => updateDocumento(index, 'codigo', e.target.value)}
                        className={isDark ? 'bg-gray-600 text-white' : ''}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">{t.documentRev}</Label>
                      <Input
                        value={doc.rev}
                        onChange={(e) => updateDocumento(index, 'rev', e.target.value)}
                        className={isDark ? 'bg-gray-600 text-white' : ''}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-xs">{t.documentTitle}</Label>
                      <Input
                        value={doc.titulo}
                        onChange={(e) => updateDocumento(index, 'titulo', e.target.value)}
                        className={isDark ? 'bg-gray-600 text-white' : ''}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={doc.observacoes}
                      onChange={(e) => updateDocumento(index, 'observacoes', e.target.value)}
                      placeholder={t.documentObservations}
                      className={isDark ? 'bg-gray-600 text-white' : ''}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => removeDocumento(index)}
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Observações */}
          <div>
            <Label className={isDark ? 'text-gray-300' : ''}>{t.observations}</Label>
            <Textarea
              value={formData.observacoes_gerais}
              onChange={(e) => setFormData({ ...formData, observacoes_gerais: e.target.value })}
              rows={4}
              className={isDark ? 'bg-gray-700 text-white' : ''}
            />
          </div>

          {/* Assinaturas */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : ''}`}>{t.signatures}</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAssinatura}
              >
                <Plus className="w-4 h-4 mr-2" />
                {t.addSignature}
              </Button>
            </div>
            <div className="space-y-3">
              {formData.assinaturas?.map((ass, index) => (
                <SignatureField
                  key={index}
                  assinatura={ass}
                  index={index}
                  onEdit={handleSignatureEdit}
                  onRemove={(idx) => removeAssinatura(idx)}
                  onChange={updateAssinatura}
                />
              ))}
            </div>
            <SignatureDialog
              open={signatureDialogOpen}
              onOpenChange={setSignatureDialogOpen}
              onSave={handleSignatureSave}
            />
          </div>

          {/* Status */}
          <div>
            <Label className={isDark ? 'text-gray-300' : ''}>{t.status}</Label>
            <Select
              value={formData.status_documento}
              onValueChange={(value) => setFormData({ ...formData, status_documento: value })}
            >
              <SelectTrigger className={isDark ? 'bg-gray-700 text-white' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Rascunho">Rascunho</SelectItem>
                <SelectItem value="Em Análise">Em Análise</SelectItem>
                <SelectItem value="Aprovado">Aprovado</SelectItem>
                <SelectItem value="Arquivado">Arquivado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}