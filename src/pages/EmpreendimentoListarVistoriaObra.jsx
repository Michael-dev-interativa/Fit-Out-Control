import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Empreendimento, RespostaVistoria } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, ArrowLeft, Trash2, Eye, FileText, Calendar, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function EmpreendimentoListarVistoriaObra() {
  const navigate = useNavigate();
  const location = useLocation();
  const empreendimentoId = new URLSearchParams(location.search).get('empreendimentoId');

  const [empreendimento, setEmpreendimento] = useState(null);
  const [vistorias, setVistorias] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (!empreendimentoId) return;
    setLoading(true);
    try {
      const [emp, lista] = await Promise.all([
        Empreendimento.get(empreendimentoId),
        RespostaVistoria.filter({ id_empreendimento: empreendimentoId, nome_arquivo: 'vistoria-obra-padrao' }, '-created_at'),
      ]);
      setEmpreendimento(emp);
      setVistorias(Array.isArray(lista) ? lista : []);
    } catch (err) {
      console.error('Erro ao carregar vistorias de obra:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [empreendimentoId]);

  const handleDelete = async (id) => {
    try {
      await RespostaVistoria.delete(id);
      loadData();
    } catch (err) {
      console.error('Erro ao excluir:', err);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Vistoria de Obra</h1>
          <p className="text-gray-600 mt-1">{empreendimento?.nome_empreendimento}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate(createPageUrl(`Empreendimento?empreendimentoId=${empreendimentoId}`))}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <Button onClick={() => navigate(createPageUrl(`NovoVistoriadeObra?empreendimentoId=${empreendimentoId}`))}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Vistoria de Obra
          </Button>
        </div>
      </div>

      {vistorias.length === 0 ? (
        <Card className="text-center py-16">
          <CardContent>
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Nenhuma vistoria de obra encontrada.</p>
            <Button
              className="mt-4"
              onClick={() => navigate(createPageUrl(`NovoVistoriadeObra?empreendimentoId=${empreendimentoId}`))}
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Vistoria
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vistorias.map((vistoria) => (
            <Card key={vistoria.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {vistoria.nome_vistoria || 'Vistoria de Obra Padrão'}
                </CardTitle>
                {vistoria.texto_escopo_consultoria && (
                  <p className="text-sm text-gray-500">{vistoria.texto_escopo_consultoria}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-gray-600">
                {vistoria.data_vistoria && (
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{format(new Date(vistoria.data_vistoria), 'PPP', { locale: ptBR })}</span>
                  </div>
                )}
                {vistoria.estrutura_formulario?.cliente && <p><span className="font-medium">Cliente:</span> {vistoria.estrutura_formulario.cliente}</p>}
                {vistoria.revisao && <p><span className="font-medium">Revisão:</span> {vistoria.revisao}</p>}
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Link to={createPageUrl(`EditarVistoriadeObra?relatorioId=${vistoria.id}`)}>
                  <Button variant="outline" size="sm">
                    <Pencil className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                </Link>
                <Link to={createPageUrl(`VisualizarInspecaoVistoriaObraPadrao?relatorioId=${vistoria.id}`)}>
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4 mr-2" />
                    Ver Relatório
                  </Button>
                </Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="icon">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza de que deseja excluir esta vistoria? Esta ação não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(vistoria.id)} className="bg-red-600 hover:bg-red-700">
                        Excluir
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
