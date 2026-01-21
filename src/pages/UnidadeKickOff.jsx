
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { KO_unidade } from '@/api/entities';
import UnidadeHeader from '@/components/unidade/UnidadeHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Download, Plus, Search, Edit } from 'lucide-react';
import GerarRelatorioKickOffDialog from '@/components/kickoff/GerarRelatorioKickOffDialog';
import NovoKickOffDialog from '@/components/kickoff/NovoKickOffDialog';
import EditarKickOffDialog from '@/components/kickoff/EditarKickOffDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useUnidadeData } from '@/components/hooks/useUnidadeData';

const translations = {
  pt: {
    title: "Kick-Off",
    records: "Registros de Kick-Off",
    generateReport: "Gerar Relatório",
    newRecord: "Novo Registro",
    searchPlaceholder: "Buscar por disciplina ou status...",
    discipline: "Disciplina",
    emission: "Emissão", 
    status: "Status",
    actions: "Ações",
    edit: "Editar",
    noRecords: "Nenhum registro de Kick-Off encontrado.",
    backToUnit: "Voltar à Unidade"
  },
  en: {
    title: "Kick-Off",
    records: "Kick-Off Records",
    generateReport: "Generate Report",
    newRecord: "New Record",
    searchPlaceholder: "Search by discipline or status...",
    discipline: "Discipline",
    emission: "Emission",
    status: "Status", 
    actions: "Actions",
    edit: "Edit",
    noRecords: "No Kick-Off records found.",
    backToUnit: "Back to Unit"
  },
};

export default function UnidadeKickOff({ language: initialLanguage = 'pt', theme: initialTheme = 'light' }) {
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showGerarRelatorioDialog, setShowGerarRelatorioDialog] = useState(false);
  const [showNovoKickOffDialog, setShowNovoKickOffDialog] = useState(false);
  const [editingKickOff, setEditingKickOff] = useState(null);
  const [showEditarKickOffDialog, setShowEditarKickOffDialog] = useState(false);

  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const unidadeId = urlParams.get('unidadeId');
  const empreendimentoId = urlParams.get('empreendimentoId');
  
  const { unidade, empreendimento, loading: loadingUnidadeData } = useUnidadeData(unidadeId, empreendimentoId);

  const language = initialLanguage;
  const theme = initialTheme;
  const isDark = theme === 'dark';
  const t = translations[language];

  useEffect(() => {
    if (unidadeId) {
        fetchRegistros();
    }
  }, [unidadeId]);

  const fetchRegistros = async () => {
    setLoading(true);
    try {
      const koData = await KO_unidade.filter({ id_unidade: unidadeId });
      setRegistros(koData.filter(r => r.status !== 'Excluído'));
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (registro) => {
    setEditingKickOff(registro);
    setShowEditarKickOffDialog(true);
  };
  
  const handleSuccess = () => {
      fetchRegistros();
      setShowNovoKickOffDialog(false);
      setShowEditarKickOffDialog(false);
  }

  const filteredRegistros = registros.filter(
    (r) =>
      (r.disciplina_ko || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.status || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getUnidadeStats = () => {
    const total = registros.length;
    const pendente = registros.filter(r => r.status === 'Pendente').length;
    const andamento = registros.filter(r => r.status === 'Em Andamento').length;
    const concluido = registros.filter(r => r.status === 'Concluído').length;
    return { total, pendente, andamento, concluido };
  };

  return (
    <div className={`p-4 md:p-6 space-y-6 ${isDark ? 'bg-gray-900' : ''}`}>
        <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => navigate(createPageUrl(`Unidade?id=${unidadeId}&emp=${empreendimentoId}`))}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold">{t.title}</h1>
        </div>

        <UnidadeHeader 
            unidade={unidade} 
            empreendimento={empreendimento} 
            stats={getUnidadeStats()}
            loading={loadingUnidadeData} 
            language={language}
            theme={theme}
        />

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-1/3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder={t.searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
            </div>
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowGerarRelatorioDialog(true)}>
                    <Download className="w-4 h-4 mr-2" />
                    {t.generateReport}
                </Button>
                <Button onClick={() => setShowNovoKickOffDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    {t.newRecord}
                </Button>
            </div>
        </div>

        <div className="border rounded-lg overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t.discipline}</TableHead>
                        <TableHead>{t.emission}</TableHead>
                        <TableHead>{t.status}</TableHead>
                        <TableHead>{t.actions}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow><TableCell colSpan="4" className="text-center">Carregando...</TableCell></TableRow>
                    ) : filteredRegistros.length === 0 ? (
                        <TableRow><TableCell colSpan="4" className="text-center">{t.noRecords}</TableCell></TableRow>
                    ) : (
                        filteredRegistros.map(registro => (
                            <TableRow key={registro.id}>
                                <TableCell>{registro.disciplina_ko}</TableCell>
                                <TableCell>{registro.emissao_ko}</TableCell>
                                <TableCell><Badge>{registro.status}</Badge></TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" onClick={() => handleEdit(registro)}>
                                        <Edit className="w-4 h-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>

        {unidade && (
            <GerarRelatorioKickOffDialog
                open={showGerarRelatorioDialog}
                onOpenChange={setShowGerarRelatorioDialog}
                unidade={unidade}
                empreendimento={empreendimento}
                registros={registros}
            />
        )}
        
        {unidade && (
            <NovoKickOffDialog
                open={showNovoKickOffDialog}
                onOpenChange={setShowNovoKickOffDialog}
                unidadeId={unidade.id}
                onSuccess={handleSuccess}
            />
        )}

        {editingKickOff && (
            <EditarKickOffDialog
                open={showEditarKickOffDialog}
                onOpenChange={setShowEditarKickOffDialog}
                kickOff={editingKickOff}
                onSuccess={handleSuccess}
            />
        )}
    </div>
  );
}
