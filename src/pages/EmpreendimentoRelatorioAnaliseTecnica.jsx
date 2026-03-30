import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Empreendimento, RelatorioAnaliseTecnica } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Edit, Trash2, Eye, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_COLORS = {
  'Rascunho': 'bg-gray-100 text-gray-700',
  'Emitido': 'bg-blue-100 text-blue-700',
  'Aguardando Resposta': 'bg-yellow-100 text-yellow-700',
  'Respondido': 'bg-green-100 text-green-700',
  'Encerrado': 'bg-slate-100 text-slate-700',
};

export default function EmpreendimentoRelatorioAnaliseTecnica({ theme }) {
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const empreendimentoId = params.get('empreendimentoId');

  const [relatorios, setRelatorios] = useState([]);
  const [empreendimento, setEmpreendimento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);

  const isDark = theme === 'dark';

  useEffect(() => {
    if (!empreendimentoId) {
      navigate(createPageUrl('Empreendimentos'));
      return;
    }
    loadData();
  }, [empreendimentoId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [emp, rels] = await Promise.all([
        Empreendimento.get(empreendimentoId),
        RelatorioAnaliseTecnica.filter({ id_empreendimento: empreendimentoId }, '-created_at'),
      ]);
      setEmpreendimento(emp);
      setRelatorios(rels || []);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deseja excluir este relatório?')) return;
    try {
      setDeletingId(id);
      await RelatorioAnaliseTecnica.delete(id);
      setRelatorios(prev => prev.filter(r => r.id !== id));
    } finally {
      setDeletingId(null);
    }
  };

  const handleNew = () => {
    navigate(createPageUrl(`NovaEmissaoAnalise?empreendimentoId=${empreendimentoId}`));
  };

  const contarRespostas = (projetos) => {
    if (!projetos) return 0;
    return projetos.reduce((total, proj) => {
      if (proj.comentarios) {
        return total + proj.comentarios.reduce((sum, com) => sum + (com.respostas?.length || 0), 0);
      }
      return total;
    }, 0);
  };

  const obterStatusDinamico = (relatorio) => {
    const totalRespostas = contarRespostas(relatorio.projetos);
    const totalItens = (relatorio.projetos || []).length;
    
    if (totalRespostas > 0 && totalRespostas >= totalItens) return 'Respondido';
    if (totalRespostas > 0) return 'Aguardando Resposta';
    return relatorio.status_relatorio || 'Rascunho';
  };

  return (
    <div className={`min-h-screen p-6 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Button type="button" variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Relatórios de Análise Técnica</h1>
            {empreendimento && <p className="text-sm text-gray-500">{empreendimento.nome_empreendimento}</p>}
          </div>
          <Button onClick={handleNew} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> Novo Relatório
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : relatorios.length === 0 ? (
          <div className={`text-center py-16 rounded-xl border-2 border-dashed ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
            <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-500">Nenhum relatório de análise técnica encontrado.</p>
            <Button onClick={handleNew} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" /> Criar Primeiro Relatório
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {relatorios.map(rel => (
              <div key={rel.id} className={`rounded-xl border shadow-sm overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                {/* Header do card */}
                <div className={`flex items-center justify-between px-5 py-3 border-b ${isDark ? 'border-gray-700' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-blue-500 shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">{rel.nome_arquivo || 'Sem nome'}</p>
                      <p className="text-xs text-gray-400">
                        {rel.data_emissao ? format(new Date(rel.data_emissao), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                        {rel.edificio_pavimento && ` · ${rel.edificio_pavimento}`}
                        {rel.fase_emissao && ` · ${rel.fase_emissao}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[obterStatusDinamico(rel)] || 'bg-gray-100 text-gray-700'}`}>
                      {obterStatusDinamico(rel)}
                    </span>
                    {contarRespostas(rel.projetos) > 0 && (
                      <span className="flex items-center justify-center w-6 h-6 rounded bg-gray-200 text-gray-800 text-xs font-bold">
                        {contarRespostas(rel.projetos)}
                      </span>
                    )}
                    <Button size="icon" variant="ghost" title="Visualizar" onClick={() => navigate(createPageUrl(`VisualizarRelatorioAnaliseTecnica?id=${rel.id}`))}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" title="Editar" onClick={() => navigate(createPageUrl(`EditarRelatorioAnaliseTecnica?id=${rel.id}&empreendimentoId=${empreendimentoId}`))}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-red-500 hover:text-red-700" title="Excluir"
                      onClick={() => handleDelete(rel.id)} disabled={deletingId === rel.id}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Pills de disciplinas */}
                <div className="px-5 py-3">
                  {rel.lista_arquivos?.length > 0 ? (
                    <div className="flex flex-wrap gap-1 items-center">
                      {Object.entries(
                        rel.lista_arquivos.reduce((acc, arq) => {
                          const dis = arq.disciplina || 'Sem disciplina';
                          acc[dis] = (acc[dis] || 0) + 1;
                          return acc;
                        }, {})
                      ).map(([dis, count]) => (
                        <span key={dis} className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-gray-700 text-gray-300' : 'bg-blue-50 text-blue-700'}`}>
                          <span className="font-medium">{dis}</span>
                          <span className={`rounded-full px-1.5 text-[10px] font-bold ${isDark ? 'bg-gray-600' : 'bg-blue-100 text-blue-800'}`}>{count}</span>
                        </span>
                      ))}
                      <span className="text-xs text-gray-400 ml-1">— {rel.lista_arquivos.length} arquivo{rel.lista_arquivos.length !== 1 ? 's' : ''}</span>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">Nenhum arquivo analisado</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}