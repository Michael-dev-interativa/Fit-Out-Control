
import React, { useState, useEffect } from "react";
import { AtividadePlanejamento } from "@/api/entities";
import { User } from "@/api/entities";
import { Empreendimento } from "@/api/entities";
import { UnidadeEmpreendimento } from "@/api/entities";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Users, Clock, Target, Trash2 } from "lucide-react";
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
    title: "Editar Atividade",
    activityTitle: "Título da Atividade",
    description: "Descrição",
    responsible: "Responsável",
    startDate: "Data de Início",
    dueDate: "Data de Prazo",
    completionDate: "Data de Conclusão",
    priority: "Prioridade",
    activityType: "Tipo de Atividade",
    status: "Status",
    relatedProject: "Empreendimento Relacionado",
    relatedUnit: "Unidade Relacionada",
    estimatedHours: "Horas Estimadas",
    completedHours: "Horas Realizadas",
    observations: "Observações",
    cancel: "Cancelar",
    save: "Salvar Alterações",
    delete: "Excluir Atividade",
    saving: "Salvando...",
    deleting: "Excluindo...",
    confirmDelete: "Confirmar Exclusão",
    confirmDeleteMessage: "Tem certeza que deseja excluir esta atividade? Esta ação não pode ser desfeita.",
    planned: "Planejada",
    inProgress: "Em Andamento",
    completed: "Concluída",
    delayed: "Atrasada",
    cancelled: "Cancelada"
  },
  en: {
    title: "Edit Activity",
    activityTitle: "Activity Title",
    description: "Description",
    responsible: "Responsible",
    startDate: "Start Date",
    dueDate: "Due Date",
    completionDate: "Completion Date",
    priority: "Priority",
    activityType: "Activity Type",
    status: "Status",
    relatedProject: "Related Project",
    relatedUnit: "Related Unit",
    estimatedHours: "Estimated Hours",
    completedHours: "Completed Hours",
    observations: "Observations",
    cancel: "Cancel",
    save: "Save Changes",
    delete: "Delete Activity",
    saving: "Saving...",
    deleting: "Deleting...",
    confirmDelete: "Confirm Deletion",
    confirmDeleteMessage: "Are you sure you want to delete this activity? This action cannot be undone.",
    planned: "Planned",
    inProgress: "In Progress",
    completed: "Completed",
    delayed: "Delayed",
    cancelled: "Cancelled"
  }
};

export default function EditarAtividadeDialog({ atividade, onOpenChange, onSuccess, language = 'pt' }) {
  const [formData, setFormData] = useState({});
  const [usuarios, setUsuarios] = useState([]);
  const [empreendimentos, setEmpreendimentos] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const t = translations[language];
  const open = !!atividade;

  const loadUnidades = React.useCallback(async (empreendimentoId) => {
    try {
      const unidadesData = await UnidadeEmpreendimento.filter({ 
        id_empreendimento: empreendimentoId 
      });
      setUnidades(unidadesData);
    } catch (error) {
      console.error("Erro ao carregar unidades:", error);
      setUnidades([]);
    }
  }, []); // Empty dependency array as it only uses `empreendimentoId` passed as argument and `UnidadeEmpreendimento` entity.

  const loadData = React.useCallback(async () => {
    try {
      const [usuariosData, empreendimentosData] = await Promise.all([
        User.list(),
        Empreendimento.list("-created_date")
      ]);
      setUsuarios(usuariosData);
      setEmpreendimentos(empreendimentosData);

      // Load units if project is selected
      if (atividade?.id_empreendimento) {
        loadUnidades(atividade.id_empreendimento);
      }
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  }, [atividade?.id_empreendimento, loadUnidades]); // `atividade?.id_empreendimento` and `loadUnidades` are dependencies.

  useEffect(() => {
    if (atividade) {
      setFormData({
        titulo_atividade: atividade.titulo_atividade || "",
        descricao_atividade: atividade.descricao_atividade || "",
        responsavel_email: atividade.responsavel_email || "",
        data_inicio: atividade.data_inicio || "",
        data_prazo: atividade.data_prazo || "",
        data_conclusao: atividade.data_conclusao ? new Date(atividade.data_conclusao).toISOString().substr(0, 16) : "",
        prioridade: atividade.prioridade || "Média",
        tipo_atividade: atividade.tipo_atividade || "",
        status_atividade: atividade.status_atividade || "Planejada",
        id_empreendimento: atividade.id_empreendimento || "",
        id_unidade: atividade.id_unidade || "",
        horas_estimadas: atividade.horas_estimadas || "",
        horas_realizadas: atividade.horas_realizadas || "",
        observacoes: atividade.observacoes || ""
      });
      loadData();
    }
  }, [atividade, loadData]); // `atividade` and `loadData` are dependencies.

  useEffect(() => {
    if (formData.id_empreendimento && formData.id_empreendimento !== atividade?.id_empreendimento) {
      loadUnidades(formData.id_empreendimento);
      setFormData(prev => ({ ...prev, id_unidade: "" }));
    } else if (!formData.id_empreendimento) {
      setUnidades([]);
      setFormData(prev => ({ ...prev, id_unidade: "" }));
    }
  }, [formData.id_empreendimento, atividade?.id_empreendimento, loadUnidades]); // `formData.id_empreendimento`, `atividade?.id_empreendimento`, and `loadUnidades` are dependencies.

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.titulo_atividade || !formData.responsavel_email || !formData.data_prazo || !formData.tipo_atividade) {
      return;
    }

    setSaving(true);
    try {
      // Get responsible user name
      const responsavelUser = usuarios.find(u => u.email === formData.responsavel_email);
      
      // Get project and unit names if selected
      const empreendimento = formData.id_empreendimento 
        ? empreendimentos.find(e => e.id === formData.id_empreendimento)
        : null;
      
      const unidade = formData.id_unidade
        ? unidades.find(u => u.id === formData.id_unidade)
        : null;

      const dataToSave = {
        ...formData,
        responsavel_nome: responsavelUser?.full_name || '',
        nome_empreendimento: empreendimento?.nome_empreendimento || '',
        nome_unidade: unidade?.unidade_empreendimento || '',
        horas_estimadas: formData.horas_estimadas ? parseFloat(formData.horas_estimadas) : null,
        horas_realizadas: formData.horas_realizadas ? parseFloat(formData.horas_realizadas) : null,
        data_conclusao: formData.status_atividade === "Concluída" && !formData.data_conclusao 
          ? new Date().toISOString()
          : formData.data_conclusao || null
      };

      await AtividadePlanejamento.update(atividade.id, dataToSave);
      onSuccess();
    } catch (error) {
      console.error("Erro ao salvar atividade:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await AtividadePlanejamento.delete(atividade.id);
      onSuccess();
    } catch (error) {
      console.error("Erro ao excluir atividade:", error);
    } finally {
      setDeleting(false);
    }
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            {t.title}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t.activityTitle}</Label>
              <Input
                value={formData.titulo_atividade || ""}
                onChange={(e) => handleInputChange("titulo_atividade", e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>{t.status}</Label>
              <Select
                value={formData.status_atividade}
                onValueChange={(value) => handleInputChange("status_atividade", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Planejada">{t.planned}</SelectItem>
                  <SelectItem value="Em Andamento">{t.inProgress}</SelectItem>
                  <SelectItem value="Concluída">{t.completed}</SelectItem>
                  <SelectItem value="Atrasada">{t.delayed}</SelectItem>
                  <SelectItem value="Cancelada">{t.cancelled}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t.description}</Label>
            <Textarea
              value={formData.descricao_atividade || ""}
              onChange={(e) => handleInputChange("descricao_atividade", e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t.responsible}</Label>
              <Select
                value={formData.responsavel_email}
                onValueChange={(value) => handleInputChange("responsavel_email", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {usuarios.map(user => (
                    <SelectItem key={user.email} value={user.email}>
                      {user.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t.priority}</Label>
              <Select
                value={formData.prioridade}
                onValueChange={(value) => handleInputChange("prioridade", value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Baixa">Baixa</SelectItem>
                  <SelectItem value="Média">Média</SelectItem>
                  <SelectItem value="Alta">Alta</SelectItem>
                  <SelectItem value="Urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>{t.startDate}</Label>
              <Input
                type="date"
                value={formData.data_inicio || ""}
                onChange={(e) => handleInputChange("data_inicio", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t.dueDate}</Label>
              <Input
                type="date"
                value={formData.data_prazo || ""}
                onChange={(e) => handleInputChange("data_prazo", e.target.value)}
                required
              />
            </div>

            {formData.status_atividade === "Concluída" && (
              <div className="space-y-2">
                <Label>{t.completionDate}</Label>
                <Input
                  type="datetime-local"
                  value={formData.data_conclusao || ""}
                  onChange={(e) => handleInputChange("data_conclusao", e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t.estimatedHours}</Label>
              <Input
                type="number"
                step="0.5"
                value={formData.horas_estimadas || ""}
                onChange={(e) => handleInputChange("horas_estimadas", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>{t.completedHours}</Label>
              <Input
                type="number"
                step="0.5"
                value={formData.horas_realizadas || ""}
                onChange={(e) => handleInputChange("horas_realizadas", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t.relatedProject}</Label>
              <Select
                value={formData.id_empreendimento || "none"}
                onValueChange={(value) => handleInputChange("id_empreendimento", value === "none" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {empreendimentos.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.nome_empreendimento}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.id_empreendimento && (
              <div className="space-y-2">
                <Label>{t.relatedUnit}</Label>
                <Select
                  value={formData.id_unidade || "none"}
                  onValueChange={(value) => handleInputChange("id_unidade", value === "none" ? "" : value)}
                  disabled={!unidades.length} // Disable if no units are loaded
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {unidades.map(unidade => (
                      <SelectItem key={unidade.id} value={unidade.id}>
                        {unidade.unidade_empreendimento}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>{t.observations}</Label>
            <Textarea
              value={formData.observacoes || ""}
              onChange={(e) => handleInputChange("observacoes", e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-between pt-6 border-t">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" type="button">
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t.delete}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t.confirmDelete}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t.confirmDeleteMessage}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    disabled={deleting}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {deleting ? t.deleting : "Excluir"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t.cancel}
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {saving ? t.saving : t.save}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
