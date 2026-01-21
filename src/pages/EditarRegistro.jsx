import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { RegistroUnidade } from '@/api/entities';
import { Empreendimento } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Save, Trash2, Loader2 } from 'lucide-react';
import { UploadFile } from '@/api/integrations';

const translations = {
  pt: {
    title: "Editar Registro",
    back: "Voltar",
    item: "Item do Registro",
    description: "Descrição",
    comment: "Comentário",
    reply: "Réplica",
    finalReply: "Tréplica",
    photo: "Foto do Registro",
    photoComment: "Comentário da Foto",
    status: "Status",
    discipline: "Disciplina",
    emission: "Emissão",
    save: "Salvar Alterações",
    delete: "Excluir Registro",
    loading: "Carregando...",
    saving: "Salvando...",
    deleting: "Excluindo...",
    uploadPhoto: "Enviar Nova Foto"
  },
  en: {
    title: "Edit Record",
    back: "Back",
    item: "Record Item",
    description: "Description",
    comment: "Comment",
    reply: "Reply",
    finalReply: "Final Reply",
    photo: "Record Photo",
    photoComment: "Photo Comment",
    status: "Status",
    discipline: "Discipline",
    emission: "Emission",
    save: "Save Changes",
    delete: "Delete Record",
    loading: "Loading...",
    saving: "Saving...",
    deleting: "Deleting...",
    uploadPhoto: "Upload New Photo"
  }
};

export default function EditarRegistro() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const registroId = urlParams.get('registroId');
  const tipoRegistro = urlParams.get('tipo');
  const empreendimentoId = urlParams.get('empreendimentoId');
  
  const [registro, setRegistro] = useState(null);
  const [empreendimento, setEmpreendimento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [language] = useState('pt');
  const [theme] = useState('light');
  
  const t = translations[language];
  const isDark = theme === 'dark';

  useEffect(() => {
    const loadData = async () => {
      if (!registroId || !empreendimentoId) {
        console.error("ID do registro ou empreendimento inválido:", { registroId, empreendimentoId });
        navigate(createPageUrl("Empreendimentos"));
        return;
      }

      try {
        setLoading(true);
        const [registroData, empData] = await Promise.all([
          RegistroUnidade.get(registroId),
          Empreendimento.get(empreendimentoId)
        ]);
        setRegistro(registroData);
        setEmpreendimento(empData);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        navigate(createPageUrl("Empreendimentos"));
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [registroId, empreendimentoId, navigate]);

  const handleInputChange = (field, value) => {
    setRegistro(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      handleInputChange('foto_registro', file_url);
    } catch (error) {
      console.error("Erro ao fazer upload:", error);
    }
    setUploading(false);
  };

  const handleSalvar = async () => {
    if (!registro) return;

    setSaving(true);
    try {
      await RegistroUnidade.update(registro.id, registro);
      navigate(createPageUrl(`Unidade?unidadeId=${registro.id_unidade}&empreendimentoId=${empreendimentoId}`));
    } catch (error) {
      console.error("Erro ao salvar:", error);
    }
    setSaving(false);
  };

  const handleExcluir = async () => {
    if (!registro) return;

    setDeleting(true);
    try {
      await RegistroUnidade.update(registro.id, { ...registro, status: "Obsoleto" });
      navigate(createPageUrl(`Unidade?unidadeId=${registro.id_unidade}&empreendimentoId=${empreendimentoId}`));
    } catch (error) {
      console.error("Erro ao excluir:", error);
    }
    setDeleting(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="ml-4">{t.loading}</p>
      </div>
    );
  }

  return (
    <div className={`p-6 space-y-6 ${isDark ? 'bg-gray-900 text-white' : ''}`}>
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => navigate(createPageUrl(`Unidade?unidadeId=${registro?.id_unidade}&empreendimentoId=${empreendimentoId}`))}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.back}
        </Button>
        <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : ''}`}>{t.title}</h1>
      </div>

      {registro && (
        <Card className={isDark ? 'bg-gray-800' : ''}>
          <CardHeader>
            <CardTitle className={isDark ? 'text-white' : ''}>{registro.item_registro}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className={isDark ? 'text-gray-300' : ''}>{t.item}</Label>
                <Input
                  value={registro.item_registro || ''}
                  onChange={(e) => handleInputChange('item_registro', e.target.value)}
                  className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                />
              </div>
              
              <div className="space-y-2">
                <Label className={isDark ? 'text-gray-300' : ''}>{t.status}</Label>
                <Select value={registro.status || ''} onValueChange={(value) => handleInputChange('status', value)}>
                  <SelectTrigger className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                    <SelectItem value="Concluído">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className={isDark ? 'text-gray-300' : ''}>{t.description}</Label>
              <Textarea
                value={registro.descricao_registro || ''}
                onChange={(e) => handleInputChange('descricao_registro', e.target.value)}
                className={`min-h-[100px] ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
              />
            </div>

            <div className="space-y-2">
              <Label className={isDark ? 'text-gray-300' : ''}>{t.comment}</Label>
              <Textarea
                value={registro.comentario_registro || ''}
                onChange={(e) => handleInputChange('comentario_registro', e.target.value)}
                className={`min-h-[100px] ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
              />
            </div>

            <div className="space-y-2">
              <Label className={isDark ? 'text-gray-300' : ''}>{t.reply}</Label>
              <Textarea
                value={registro.replica_registro || ''}
                onChange={(e) => handleInputChange('replica_registro', e.target.value)}
                className={`min-h-[100px] ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
              />
            </div>

            <div className="space-y-2">
              <Label className={isDark ? 'text-gray-300' : ''}>{t.finalReply}</Label>
              <Textarea
                value={registro.treplica_registro || ''}
                onChange={(e) => handleInputChange('treplica_registro', e.target.value)}
                className={`min-h-[100px] ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
              />
            </div>

            <div className="space-y-4">
              <Label className={isDark ? 'text-gray-300' : ''}>{t.photo}</Label>
              <div className="flex gap-4">
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className={`flex-1 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                />
                {uploading && <Loader2 className="h-5 w-5 animate-spin" />}
              </div>
              {registro.foto_registro && (
                <div className="mt-4">
                  <img
                    src={registro.foto_registro}
                    alt="Foto do registro"
                    className="max-w-md h-auto rounded-lg border"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className={isDark ? 'text-gray-300' : ''}>{t.photoComment}</Label>
              <Textarea
                value={registro.comentario_foto || ''}
                onChange={(e) => handleInputChange('comentario_foto', e.target.value)}
                className={`min-h-[100px] ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
              />
            </div>

            <div className="flex gap-4 pt-6">
              <Button onClick={handleSalvar} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                {saving ? t.saving : t.save}
              </Button>
              <Button variant="destructive" onClick={handleExcluir} disabled={deleting}>
                {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                {deleting ? t.deleting : t.delete}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}