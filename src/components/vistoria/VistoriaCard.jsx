import React from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Eye, Edit, Calendar, User, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { RespostaVistoria } from "@/api/entities";
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

const statusColors = {
  "Em Andamento": "bg-yellow-100 text-yellow-700",
  "Liberado para Ocupação": "bg-green-100 text-green-700",
  "Não Liberado para Ocupação": "bg-red-100 text-red-700"
};

export default function VistoriaCard({ vistoria, unidadeId, empreendimentoId, onUpdate, language, theme }) {
  const isDark = theme === 'dark';

  const handleDelete = async () => {
    try {
      await RespostaVistoria.delete(vistoria.id);
      onUpdate();
    } catch (error) {
      console.error("Erro ao excluir vistoria:", error);
    }
  };

  const linkToEdit = createPageUrl(`PreencherVistoria?unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}&formularioId=${vistoria.id_formulario}&respostaId=${vistoria.id}`);
  const linkToView = createPageUrl(`VisualizarRelatorioVistoria?respostaId=${vistoria.id}&unidadeId=${unidadeId}&empreendimentoId=${empreendimentoId}`);

  return (
    <Card className={`hover:shadow-md transition-shadow ${isDark ? 'bg-gray-800 border-gray-700' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className={`text-lg flex items-center gap-2 ${isDark ? 'text-white' : ''}`}>
            <FileText className="w-5 h-5" />
            {vistoria.nome_vistoria}
          </CardTitle>
          <Badge className={statusColors[vistoria.status_vistoria] || (isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700")}>
            {vistoria.status_vistoria}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2 text-sm">
          <div className={`flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            <Calendar className="w-4 h-4" />
            <span>Data: {format(new Date(vistoria.data_vistoria), "dd/MM/yyyy")}</span>
          </div>
          <div className={`flex items-center gap-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            <User className="w-4 h-4" />
            <span>Consultor: {vistoria.consultor_responsavel}</span>
          </div>
          {vistoria.participantes && (
            <div className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <strong>Participantes:</strong> {vistoria.participantes}
            </div>
          )}
        </div>
        
        <div className="flex gap-2 pt-2">
          <Link to={linkToView} className="flex-1">
            <Button variant="outline" className="w-full">
              <Eye className="w-4 h-4 mr-2" />
              Visualizar
            </Button>
          </Link>
          <Link to={linkToEdit}>
            <Button variant="outline" size="icon" title="Editar vistoria">
              <Edit className="w-4 h-4" />
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="icon" title="Excluir vistoria">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir esta vistoria? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}