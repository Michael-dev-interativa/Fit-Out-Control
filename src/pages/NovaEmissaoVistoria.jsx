import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useUnidadeData } from '../components/hooks/useUnidadeData';
import { VO_unidade } from '@/api/entities';
import { User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, FileText, Edit, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import UnidadeHeader from '@/components/unidade/UnidadeHeader';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const translations = {
  pt: {
    title: "Vistoria de Obras",
    subtitle: "Gerencie as vistorias de obras da unidade",
    backToUnit: "Voltar à Unidade",
    newInspection: "Nova Vistoria",
    item: "Item",
    description: "Descrição",
    comment: "Comentário",
    discipline: "Disciplina",
    status: "Status",
    emission: "Emissão",
    save: "Salvar",
    cancel: "Cancelar",
    edit: "Editar",
    delete: "Excluir",
    confirmDelete: "Confirmar Exclusão",
    deleteMessage: "Tem certeza que deseja excluir esta vistoria? Esta ação não pode ser desfeita.",
    noInspections: "Nenhuma vistoria encontrada",
    addFirstInspection: "Adicione a primeira vistoria de obras",
    inspectionHistory: "Histórico de Vistorias",
    saving: "Salvando...",
    loading: "Carregando..."
  },
  en: {
    title: "Work Inspection",
    subtitle: "Manage unit work inspections",
    backToUnit: "Back to Unit",
    newInspection: "New Inspection",
    item: "Item",
    description: "Description",
    comment: "Comment",
    discipline: "Discipline",
    status: "Status",
    emission: "Emission",
    save: "Save",
    cancel: "Cancel",
    edit: "Edit",
    delete: "Delete",
    confirmDelete: "Confirm Deletion",
    deleteMessage: "Are you sure you want to delete this inspection? This action cannot be undone.",
    noInspections: "No inspections found",
    addFirstInspection: "Add the first work inspection",
    inspectionHistory: "Inspection History",
    saving: "Saving...",
    loading: "Loading..."
  }
};

const disciplinas = ["Arquitetura", "Estrutura", "Civil", "Elétrica", "Hidráulica", "Incêndio", "Climatização"];
const statusOptions = ["Pendente", "Em Andamento", "Concluído"];
const emissaoOptions = ["1ª Emissão", "2ª Emissão", "3ª Emissão", "4ª Emissão", "5ª Emissão"];

export default function NovaEmissaoVistoria({ language = 'pt', theme = 'light' }) {
  const navigate = useNavigate();
  const [vistoriasObras, setVistoriasObras] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingVistoria, setEditingVistoria] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const urlParams = new URLSearchParams(window.location.search);
  const unidadeId = urlParams.get('unidadeId');
  const empreendimentoId = urlParams.get('empreendimentoId');

  const { unidade, empreendimento, loading: loadingUnidade } = useUnidadeData(unidadeId, empreendimentoId);

  const [formData, setFormData] = useState({
    item_vo: '',
    descricao_vo: '',
    comentario_vo: '',
    disciplina_vo: disciplinas[0],
    status: 'Pendente',
    emissao_vo: '1ª Emissão'
  });

  const t = translations[language];
  const isDark = theme === 'dark';

  useEffect(() => {
    loadCurrentUser();
    if (unidadeId) {
      loadVistoriasObras();
    }
  }, [unidadeId]);

  const loadCurrentUser = async () => {
    try {
      const currentUser = await User.me();
      setUser(currentUser);
    } catch (error) {
      console.error("Erro ao carregar usuário:", error);
    }
  };

  const loadVistoriasObras = async () => {
    setLoading(true);
    try {
      const data = await VO_unidade.filter({ 
        id_unidade: unidadeId,
        status: ['!in', ['Editado', 'Excluído']]
      }, "-created_date");
      setVistoriasObras(data);
    } catch (error) {
      console.error("Erro ao carregar vistorias de obras:", error);
    }
    setLoading(false);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormData({
      item_vo: '',
      descricao_vo: '',
      comentario_vo: '',
      disciplina_vo: disciplinas[0],
      status: 'Pendente',
      emissao_vo: '1ª Emissão'
    });
    setEditingVistoria(null);
    setShowForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.item_vo.trim()) return;

    setSaving(true);
    try {
      const vistoriaData = {
        ...formData,
        id_unidade: unidadeId,
        data_inclusao_vo: new Date().toISOString()
      };

      if (editingVistoria) {
        await VO_unidade.update(editingVistoria.id, vistoriaData);
      } else {
        await VO_unidade.create(vistoriaData);
      }

      await loadVistoriasObras();
      resetForm();
    } catch (error) {
      console.error("Erro ao salvar vistoria:", error);
    }
    setSaving(false);
  };

  const handleEdit = (vistoria) => {
    setFormData({
      item_vo: vistoria.item_vo || '',
      descricao_vo: vistoria.descricao_vo || '',
      comentario_vo: vistoria.comentario_vo || '',
      disciplina_vo: vistoria.disciplina_vo || disciplinas[0],
      status: vistoria.status || 'Pendente',
      emissao_vo: vistoria.emissao_vo || '1ª Emissão'
    });
    setEditingVistoria(vistoria);
    setShowForm(true);
  };

  const handleDelete = async (vistoriaId) => {
    try {
      await VO_unidade.delete(vistoriaId);
      await loadVistoriasObras();
    } catch (error) {
      console.error("Erro ao excluir vistoria:", error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      "Pendente": isDark ? "bg-orange-900/50 text-orange-300" : "bg-orange-100 text-orange-700",
      "Em Andamento": isDark ? "bg-blue-900/50 text-blue-300" : "bg-blue-100 text-blue-700",
      "Concluído": isDark ? "bg-green-900/50 text-green-300" : "bg-green-100 text-green-700"
    };
    return colors[status] || (isDark ? "bg-gray-900/50 text-gray-300" : "bg-gray-100 text-gray-700");
  };

  const getUnidadeStats = () => {
    return {
      total: vistoriasObras.length,
      pendente: vistoriasObras.filter(v => v.status === "Pendente").length,
      andamento: vistoriasObras.filter(v => v.status === "Em Andamento").length,
      concluido: vistoriasObras.filter(v => v.status === "Concluído").length,
    };
  };

  if (loadingUnidade) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 md:p-6 space-y-6 ${isDark ? 'bg-gray-900' : ''}`}>
      <UnidadeHeader
        unidade={unidade}
        empreendimento={empreendimento}
        stats={getUnidadeStats()}
        loading={loadingUnidade}
        language={language}
        theme={theme}
      />

      <div className="flex justify-between items-center">
        <div>
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{t.title}</h2>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl(`Unidade?id=${unidadeId}&emp=${empreendimentoId}`))}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.backToUnit}
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t.newInspection}
          </Button>
        </div>
      </div>

      {showForm && (
        <Card className={isDark ? 'bg-gray-800' : ''}>
          <CardHeader>
            <CardTitle className={isDark ? 'text-white' : ''}>
              {editingVistoria ? 'Editar Vistoria' : t.newInspection}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="item" className={isDark ? 'text-gray-300' : ''}>{t.item}</Label>
                  <Input
                    id="item"
                    value={formData.item_vo}
                    onChange={(e) => handleInputChange('item_vo', e.target.value)}
                    placeholder="Digite o item da vistoria..."
                    required
                    className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={isDark ? 'text-gray-300' : ''}>{t.discipline}</Label>
                  <Select 
                    value={formData.disciplina_vo} 
                    onValueChange={(v) => handleInputChange('disciplina_vo', v)}
                  >
                    <SelectTrigger className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {disciplinas.map(disciplina => (
                        <SelectItem key={disciplina} value={disciplina}>{disciplina}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao" className={isDark ? 'text-gray-300' : ''}>{t.description}</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao_vo}
                  onChange={(e) => handleInputChange('descricao_vo', e.target.value)}
                  placeholder="Descreva a vistoria..."
                  className={`h-24 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="comentario" className={isDark ? 'text-gray-300' : ''}>{t.comment}</Label>
                <Textarea
                  id="comentario"
                  value={formData.comentario_vo}
                  onChange={(e) => handleInputChange('comentario_vo', e.target.value)}
                  placeholder="Comentários adicionais..."
                  className={`h-20 ${isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={isDark ? 'text-gray-300' : ''}>{t.status}</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(v) => handleInputChange('status', v)}
                  >
                    <SelectTrigger className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className={isDark ? 'text-gray-300' : ''}>{t.emission}</Label>
                  <Select 
                    value={formData.emissao_vo} 
                    onValueChange={(v) => handleInputChange('emissao_vo', v)}
                  >
                    <SelectTrigger className={isDark ? 'bg-gray-700 border-gray-600 text-white' : ''}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {emissaoOptions.map(emissao => (
                        <SelectItem key={emissao} value={emissao}>{emissao}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                  className={isDark ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : ''}
                >
                  {t.cancel}
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {saving ? t.saving : t.save}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className={isDark ? 'bg-gray-800' : ''}>
        <CardHeader>
          <CardTitle className={isDark ? 'text-white' : ''}>{t.inspectionHistory}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : vistoriasObras.length === 0 ? (
            <div className="text-center py-12">
              <FileText className={`w-16 h-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
              <h3 className={`text-lg font-medium ${isDark ? 'text-white' : 'text-gray-900'} mb-2`}>{t.noInspections}</h3>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-500'} mb-6`}>{t.addFirstInspection}</p>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t.newInspection}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {vistoriasObras.map((vistoria) => (
                <div 
                  key={vistoria.id} 
                  className={`p-4 rounded-lg border transition-colors ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        {vistoria.item_vo}
                      </h4>
                      {vistoria.descricao_vo && (
                        <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {vistoria.descricao_vo}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge className={getStatusColor(vistoria.status)}>
                          {vistoria.status}
                        </Badge>
                        <Badge variant="outline" className={isDark ? 'border-gray-600 text-gray-300' : ''}>
                          {vistoria.disciplina_vo}
                        </Badge>
                        <Badge variant="secondary" className={isDark ? 'bg-gray-600 text-gray-300' : ''}>
                          {vistoria.emissao_vo}
                        </Badge>
                      </div>
                      <p className={`text-xs mt-2 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        {format(new Date(vistoria.created_date), "dd/MM/yyyy 'às' HH:mm")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleEdit(vistoria)}
                        className={isDark ? 'border-gray-600 hover:bg-gray-600' : ''}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="icon">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t.confirmDelete}</AlertDialogTitle>
                            <AlertDialogDescription>{t.deleteMessage}</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t.cancel}</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(vistoria.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              {t.delete}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}