import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { RDO, Empreendimento } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import SignatureField from '@/components/signature/SignatureField';
import SignatureDialog from '@/components/signature/SignatureDialog';

const translations = {
  pt: {
    backToProject: "Voltar ao Empreendimento",
    newDocument: "Novo Relatório - Lista de Documentos",
    client: "Cliente",
    project: "Empreendimento",
    title: "Título",
    documentNumber: "Número do Documento",
    revision: "Revisão",
    noticeDate: "Data de Aviso",
    documents: "Documentos",
    addDocument: "Adicionar Documento",
    code: "Código",
    rev: "REV",
    documentTitle: "Título do Documento",
    observations: "Observações",
    signatures: "Assinaturas",
    addSignature: "Adicionar Assinatura",
    generalObservations: "Observações Gerais",
    status: "Status",
    save: "Salvar",
    cancel: "Cancelar",
    draft: "Rascunho",
    inAnalysis: "Em Análise",
    approved: "Aprovado",
    archived: "Arquivado"
  },
  en: {
    backToProject: "Back to Project",
    newDocument: "New Document - Document List",
    client: "Client",
    project: "Project",
    title: "Title",
    documentNumber: "Document Number",
    revision: "Revision",
    noticeDate: "Notice Date",
    documents: "Documents",
    addDocument: "Add Document",
    code: "Code",
    rev: "REV",
    documentTitle: "Document Title",
    observations: "Observations",
    signatures: "Signatures",
    addSignature: "Add Signature",
    generalObservations: "General Observations",
    status: "Status",
    save: "Save",
    cancel: "Cancel",
    draft: "Draft",
    inAnalysis: "In Analysis",
    approved: "Approved",
    archived: "Archived"
  }
};

export default function NovoListaDocumentosReport({ language: initialLanguage, theme: initialTheme }) {
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const empreendimentoId = urlParams.get('empreendimentoId');

  const [empreendimento, setEmpreendimento] = useState(null);
  const [language, setLanguage] = useState(initialLanguage || 'pt');
  const [theme, setTheme] = useState(initialTheme || 'light');
  const [saving, setSaving] = useState(false);
  const [editingSignatureIndex, setEditingSignatureIndex] = useState(null);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    id_empreendimento: empreendimentoId,
    cliente: '',
    empreendimento: '',
    titulo: 'LISTA DE DOCUMENTOS',
    numero_documento: '',
    revisao: '',
    data_aviso: new Date().toISOString().split('T')[0],
    documentos: [],
    assinaturas: [],
    observacoes_gerais: '',
    status_documento: 'Rascunho'
  });

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
    if (empreendimentoId) {
      loadEmpreendimento();
    }
  }, [empreendimentoId]);

  const loadEmpreendimento = async () => {
    try {
      const empData = await Empreendimento.get(empreendimentoId);
      setEmpreendimento(empData);
      setFormData(prev => ({
        ...prev,
        empreendimento: empData.nome_empreendimento || '',
        cliente: empData.cli_empreendimento || ''
      }));
    } catch (error) {
      console.error("Erro ao carregar empreendimento:", error);
    }
  };

  const handleAddDocument = () => {
    setFormData(prev => ({
      ...prev,
      documentos: [...prev.documentos, { codigo: '', rev: '', titulo: '', observacoes: '' }]
    }));
  };

  const handleRemoveDocument = (index) => {
    setFormData(prev => ({
      ...prev,
      documentos: prev.documentos.filter((_, i) => i !== index)
    }));
  };

  const handleDocumentChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      documentos: prev.documentos.map((doc, i) =>
        i === index ? { ...doc, [field]: value } : doc
      )
    }));
  };

  const handleAddSignature = () => {
    setEditingSignatureIndex(null);
    setSignatureDialogOpen(true);
  };

  const handleEditSignature = (index) => {
    setEditingSignatureIndex(index);
    setSignatureDialogOpen(true);
  };

  const handleSignatureSave = (signature) => {
    if (editingSignatureIndex !== null) {
      setFormData(prev => ({
        ...prev,
        assinaturas: prev.assinaturas.map((ass, i) =>
          i === editingSignatureIndex ? signature : ass
        )
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        assinaturas: [...prev.assinaturas, signature]
      }));
    }
    setSignatureDialogOpen(false);
  };

  const handleRemoveSignature = (index) => {
    setFormData(prev => ({
      ...prev,
      assinaturas: prev.assinaturas.filter((_, i) => i !== index)
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      console.log('📝 Salvando documento com dados:', formData);
      console.log('📄 Documentos:', formData.documentos);
      console.log('✍️ Assinaturas:', formData.assinaturas);
      await RDO.create(formData);
      navigate(createPageUrl(`EmpreendimentoListaDocumentosReport?empreendimentoId=${empreendimentoId}`));
    } catch (error) {
      console.error("Erro ao salvar documento:", error);
      alert('Erro ao salvar documento: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gray-50'} p-6 space-y-6`}>
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl(`Empreendimento?empreendimentoId=${empreendimentoId}`))}
          className={isDark ? 'text-white border-gray-600 hover:bg-gray-800' : ''}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.backToProject}
        </Button>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : ''}`}>{t.newDocument}</h1>
        <div className="w-32" />
      </div>

      <Card className={isDark ? 'bg-gray-800' : ''}>
        <CardHeader>
          <CardTitle className={isDark ? 'text-white' : ''}>{t.newDocument}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Informações Gerais */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : ''}`}>{t.client}</label>
              <Input
                value={formData.cliente}
                onChange={(e) => setFormData({ ...formData, cliente: e.target.value })}
                className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : ''}`}>{t.project}</label>
              <Input
                value={formData.empreendimento}
                disabled
                className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : ''}`}>{t.documentNumber}</label>
              <Input
                value={formData.numero_documento}
                onChange={(e) => setFormData({ ...formData, numero_documento: e.target.value })}
                className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : ''}`}>{t.revision}</label>
              <Input
                value={formData.revisao}
                onChange={(e) => setFormData({ ...formData, revisao: e.target.value })}
                className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : ''}`}>{t.noticeDate}</label>
              <Input
                type="date"
                value={formData.data_aviso}
                onChange={(e) => setFormData({ ...formData, data_aviso: e.target.value })}
                className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
              />
            </div>
          </div>

          {/* Documentos */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : ''}`}>{t.documents}</h3>
              <Button onClick={handleAddDocument} size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                {t.addDocument}
              </Button>
            </div>

            <div className="space-y-4">
              {formData.documentos.map((doc, idx) => (
                <div key={idx} className={`p-4 rounded border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="grid grid-cols-4 gap-3 mb-2">
                    <Input
                      placeholder={t.code}
                      value={doc.codigo}
                      onChange={(e) => handleDocumentChange(idx, 'codigo', e.target.value)}
                      className={isDark ? 'bg-gray-600 border-gray-500 text-white' : ''}
                    />
                    <Input
                      placeholder={t.rev}
                      value={doc.rev}
                      onChange={(e) => handleDocumentChange(idx, 'rev', e.target.value)}
                      className={isDark ? 'bg-gray-600 border-gray-500 text-white' : ''}
                    />
                    <Input
                      placeholder={t.documentTitle}
                      value={doc.titulo}
                      onChange={(e) => handleDocumentChange(idx, 'titulo', e.target.value)}
                      className={`col-span-2 ${isDark ? 'bg-gray-600 border-gray-500 text-white' : ''}`}
                    />
                  </div>
                  <Textarea
                    placeholder={t.observations}
                    value={doc.observacoes}
                    onChange={(e) => handleDocumentChange(idx, 'observacoes', e.target.value)}
                    className={`text-sm ${isDark ? 'bg-gray-600 border-gray-500 text-white' : ''}`}
                    rows={2}
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveDocument(idx)}
                    className="mt-2"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Remover
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Assinaturas */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : ''}`}>{t.signatures}</h3>
              <Button onClick={handleAddSignature} size="sm" className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                {t.addSignature}
              </Button>
            </div>

            <div className="space-y-3">
              {formData.assinaturas.map((ass, idx) => (
                <SignatureField
                  key={idx}
                  signature={ass}
                  onEdit={() => handleEditSignature(idx)}
                  onRemove={() => handleRemoveSignature(idx)}
                />
              ))}
            </div>
          </div>

          {/* Observações Gerais */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : ''}`}>{t.generalObservations}</label>
            <Textarea
              value={formData.observacoes_gerais}
              onChange={(e) => setFormData({ ...formData, observacoes_gerais: e.target.value })}
              rows={4}
              className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
            />
          </div>

          {/* Status */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : ''}`}>{t.status}</label>
            <Select value={formData.status_documento} onValueChange={(value) => setFormData({ ...formData, status_documento: value })}>
              <SelectTrigger className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Rascunho">{t.draft}</SelectItem>
                <SelectItem value="Em Análise">{t.inAnalysis}</SelectItem>
                <SelectItem value="Aprovado">{t.approved}</SelectItem>
                <SelectItem value="Arquivado">{t.archived}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Botões de Ação */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl(`Empreendimento?empreendimentoId=${empreendimentoId}`))}
              disabled={saving}
              className={isDark ? 'text-white border-gray-600 hover:bg-gray-800' : ''}
            >
              {t.cancel}
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? 'Salvando...' : t.save}
            </Button>
          </div>
        </CardContent>
      </Card>

      {signatureDialogOpen && (
        <SignatureDialog
          isOpen={signatureDialogOpen}
          onClose={() => setSignatureDialogOpen(false)}
          onSave={handleSignatureSave}
          existingSignature={editingSignatureIndex !== null ? formData.assinaturas[editingSignatureIndex] : null}
        />
      )}
    </div>
  );
}