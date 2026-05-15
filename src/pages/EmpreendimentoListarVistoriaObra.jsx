import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Empreendimento, RespostaVistoria, UnidadeEmpreendimento } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, ArrowLeft, Trash2, Eye, FileText, Calendar, Pencil, Home, Copy } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function VistoriaItem({ vistoria, onDelete, onCopyClick, empreendimentoId }) {
  return (
    <Card>
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
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Link to={createPageUrl(`PreencherVistoria?respostaId=${vistoria.id}&unidadeId=${vistoria.id_unidade}&empreendimentoId=${empreendimentoId}`)}>
          <Button variant="outline" size="sm">
            <Pencil className="w-4 h-4 mr-2" />
            Editar
          </Button>
        </Link>
        <Link to={createPageUrl(`VisualizarRelatorioVistoria?respostaId=${vistoria.id}`)}>
          <Button variant="outline" size="sm">
            <Eye className="w-4 h-4 mr-2" />
            Ver Relatório
          </Button>
        </Link>
        <Button variant="outline" size="icon" title="Copiar para outra unidade" onClick={() => onCopyClick(vistoria)}>
          <Copy className="w-4 h-4" />
        </Button>
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
              <AlertDialogAction onClick={() => onDelete(vistoria.id)} className="bg-red-600 hover:bg-red-700">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}

export default function EmpreendimentoListarVistoriaObra() {
  const navigate = useNavigate();
  const location = useLocation();
  const empreendimentoId = new URLSearchParams(location.search).get('empreendimentoId');

  const [empreendimento, setEmpreendimento] = useState(null);
  const [vistorias, setVistorias] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copyDialog, setCopyDialog] = useState({ open: false, vistoria: null });
  const [copyTargetUnidade, setCopyTargetUnidade] = useState('');
  const [copying, setCopying] = useState(false);

  const loadData = async () => {
    if (!empreendimentoId) return;
    setLoading(true);
    try {
      const [emp, lista, units] = await Promise.all([
        Empreendimento.get(empreendimentoId),
        RespostaVistoria.filter({ id_empreendimento: empreendimentoId, nome_arquivo: 'vistoria-obra-padrao' }, '-created_at'),
        UnidadeEmpreendimento.filter({ id_empreendimento: empreendimentoId }),
      ]);
      setEmpreendimento(emp);
      setVistorias(Array.isArray(lista) ? lista : []);
      setUnidades(Array.isArray(units) ? units : []);
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

  const handleCopyClick = (vistoria) => {
    setCopyTargetUnidade('');
    setCopyDialog({ open: true, vistoria });
  };

  const handleCopyConfirm = async () => {
    if (!copyTargetUnidade || !copyDialog.vistoria) return;
    setCopying(true);
    try {
      const { id, created_at, updated_at, ...rest } = copyDialog.vistoria;
      await RespostaVistoria.create({ ...rest, id_unidade: copyTargetUnidade });
      toast.success('Vistoria copiada com sucesso!');
      setCopyDialog({ open: false, vistoria: null });
      loadData();
    } catch (err) {
      console.error('Erro ao copiar vistoria:', err);
      toast.error('Erro ao copiar vistoria.');
    } finally {
      setCopying(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Dialog de cópia */}
      <Dialog open={copyDialog.open} onOpenChange={(open) => !open && setCopyDialog({ open: false, vistoria: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copiar Vistoria para outra Unidade</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-3">
            <p className="text-sm text-gray-600">
              Vistoria: <strong>{copyDialog.vistoria?.nome_vistoria || 'Vistoria de Obra Padrão'}</strong>
            </p>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Selecione a unidade de destino</label>
              <Select value={copyTargetUnidade} onValueChange={setCopyTargetUnidade}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha uma unidade..." />
                </SelectTrigger>
                <SelectContent>
                  {unidades.map(u => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.unidade_empreendimento}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialog({ open: false, vistoria: null })}>
              Cancelar
            </Button>
            <Button onClick={handleCopyConfirm} disabled={!copyTargetUnidade || copying}>
              {copying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              Copiar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
          <Button onClick={() => navigate(createPageUrl(`EmpreendimentoVistoriaObra?empreendimentoId=${empreendimentoId}`))}>
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
              onClick={() => navigate(createPageUrl(`EmpreendimentoVistoriaObra?empreendimentoId=${empreendimentoId}`))}
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeira Vistoria
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-10">
          {unidades
            .filter(u => vistorias.some(v => String(v.id_unidade) === String(u.id)))
            .map(unidade => {
              const vistoriasUnidade = vistorias.filter(v => String(v.id_unidade) === String(unidade.id));
              return (
                <div key={unidade.id}>
                  <div className="flex items-center gap-2 mb-4">
                    <Home className="w-5 h-5 text-blue-700" />
                    <h2 className="text-xl font-semibold text-gray-800">{unidade.unidade_empreendimento}</h2>
                    <span className="text-sm text-gray-400">({vistoriasUnidade.length} vistoria{vistoriasUnidade.length !== 1 ? 's' : ''})</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {vistoriasUnidade.map(vistoria => (
                      <VistoriaItem key={vistoria.id} vistoria={vistoria} onDelete={handleDelete} onCopyClick={handleCopyClick} empreendimentoId={empreendimentoId} />
                    ))}
                  </div>
                </div>
              );
            })}
          {/* Vistorias sem unidade mapeada */}
          {vistorias.filter(v => !unidades.some(u => String(u.id) === String(v.id_unidade))).length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Home className="w-5 h-5 text-gray-400" />
                <h2 className="text-xl font-semibold text-gray-600">Sem Unidade</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {vistorias
                  .filter(v => !unidades.some(u => String(u.id) === String(v.id_unidade)))
                  .map(vistoria => (
                    <VistoriaItem key={vistoria.id} vistoria={vistoria} onDelete={handleDelete} onCopyClick={handleCopyClick} empreendimentoId={empreendimentoId} />
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
