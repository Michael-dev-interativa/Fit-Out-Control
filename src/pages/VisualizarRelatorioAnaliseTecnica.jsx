import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Empreendimento, RelatorioAnaliseTecnica, User } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Printer, Loader2, AlertTriangle, MessageSquare, Check } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TabelaProjetos from '@/components/analises/TabelaProjetos';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_BADGE = {
  'OK': { bg: '#16a34a', label: 'OK – Aprovado' },
  'PD': { bg: '#d97706', label: 'PD – Pendente' },
  'IM': { bg: '#2563eb', label: 'IN – Informativo' },
};

const LEGENDA_NOTE = 'OK - Aprovado | PD - Pendente | IN - Informativo';

const logoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/1a0999f3c_logo_Interativa_letra_branca_sem_fundo_gg.png";
const logoHorizUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/4bd521d1e_LOGOHORIZONTAl.png";

const CabecalhoRelatorio = ({ relatorio, empreendimento }) => (
  <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '10px', marginBottom: '12px' }}>
    {/* Header com logo e título */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #d1d5db', borderRadius: '10px', padding: '10px 14px', marginBottom: '10px', backgroundColor: '#f9fafb' }}>
      <img src={logoHorizUrl} alt="Logo" style={{ height: '38px', objectFit: 'contain', flexShrink: 0 }} />
      <div style={{ flex: 1, textAlign: 'center', fontWeight: 'bold', fontSize: '11px', color: '#0c2461', lineHeight: '1.4' }}>
        RELATÓRIO DE ANÁLISE TÉCNICA DE PROJETOS DE ENGENHARIA PARA OBRAS DE FIT OUT
      </div>
    </div>

    {/* Dados do relatório em cards */}
    <div style={{ border: '1px solid #d1d5db', borderRadius: '10px', overflow: 'hidden', marginBottom: '12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ padding: '6px 12px', borderRight: '1px solid #e5e7eb' }}>
          <span style={{ fontWeight: 'bold', color: '#374151' }}>OS: </span>
          <span>{relatorio?.numero_os}</span>
        </div>
        <div style={{ padding: '6px 12px' }}>
          <span style={{ fontWeight: 'bold', color: '#374151' }}>Metragem: </span>
          <span>{relatorio?.metragem ? `${relatorio.metragem}m²` : ''}</span>
        </div>
      </div>
      <div style={{ padding: '6px 12px', borderBottom: '1px solid #e5e7eb' }}>
        <span style={{ fontWeight: 'bold', color: '#374151' }}>Unidade: </span>
        <span>{relatorio?.edificio_pavimento}</span>
      </div>
      <div style={{ padding: '6px 12px', borderBottom: '1px solid #e5e7eb' }}>
        <span style={{ fontWeight: 'bold', color: '#374151' }}>Foco de Emissão: </span>
        <span>{relatorio?.nome_arquivo}</span>
      </div>
      <div style={{ padding: '6px 12px' }}>
        <span style={{ fontWeight: 'bold', color: '#374151' }}>Fase de Emissão: </span>
        <span>{relatorio?.fase_emissao || '1ª Emissão'}</span>
      </div>
    </div>

    {/* Datas de Emissão */}
    <div style={{ border: '1px solid #d1d5db', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px' }}>
      <div style={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: '#0c2461', color: '#fff', padding: '6px' }}>
        REVISÕES E DATAS DE EMISSÃO DO RELATÓRIO
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ backgroundColor: '#e5e7eb', color: '#111827' }}>
            <th style={{ padding: '5px 8px', width: '8%', textAlign: 'center', borderBottom: '1px solid #d1d5db' }}>Rev.</th>
            <th style={{ padding: '5px 8px', textAlign: 'left', borderBottom: '1px solid #d1d5db', borderLeft: '1px solid #e5e7eb' }}>Descrição</th>
            <th style={{ padding: '5px 8px', width: '15%', textAlign: 'center', borderBottom: '1px solid #d1d5db', borderLeft: '1px solid #e5e7eb' }}>Data</th>
          </tr>
        </thead>
        <tbody>
          {(relatorio?.revisoes || []).map((rev, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
              <td style={{ padding: '5px 8px', textAlign: 'center' }}>{rev.rev}</td>
              <td style={{ padding: '5px 8px', borderLeft: '1px solid #e5e7eb' }}>{rev.descricao}</td>
              <td style={{ padding: '5px 8px', textAlign: 'center', borderLeft: '1px solid #e5e7eb' }}>
                {rev.data ? format(new Date(rev.data.includes('T') ? rev.data : rev.data + 'T12:00:00'), 'dd/MM/yyyy') : ''}
              </td>
            </tr>
          ))}
          {(relatorio?.revisoes?.length === 0 || !relatorio?.revisoes) && (
            <tr><td colSpan={3} style={{ padding: '8px', textAlign: 'center', color: '#9ca3af', fontStyle: 'italic' }}>Nenhuma revisão registrada</td></tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

const TabelaRevisoes = ({ revisoes }) => (
  <div style={{ border: '1px solid #d1d5db', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px' }}>
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px' }}>
      <thead>
        <tr>
          <th colSpan="3" style={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: '#0c2461', color: '#fff', padding: '8px', fontSize: '11px' }}>
            REVISÕES
          </th>
        </tr>
        <tr style={{ backgroundColor: '#e5e7eb', color: '#111827' }}>
          <th style={{ padding: '6px 8px', width: '12%', textAlign: 'center', borderBottom: '1px solid #d1d5db' }}>Rev.</th>
          <th style={{ padding: '6px 8px', textAlign: 'left', borderBottom: '1px solid #d1d5db', borderLeft: '1px solid #e5e7eb' }}>Descrição</th>
          <th style={{ padding: '6px 8px', width: '18%', textAlign: 'center', borderBottom: '1px solid #d1d5db', borderLeft: '1px solid #e5e7eb' }}>Data</th>
        </tr>
      </thead>
      <tbody>
        {(revisoes || []).map((rev, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #e5e7eb', backgroundColor: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
            <td style={{ padding: '6px 8px', textAlign: 'center' }}>{rev.rev}</td>
            <td style={{ padding: '6px 8px', borderLeft: '1px solid #e5e7eb' }}>{rev.descricao}</td>
            <td style={{ padding: '6px 8px', textAlign: 'center', borderLeft: '1px solid #e5e7eb' }}>
              {rev.data ? format(new Date(rev.data.includes('T') ? rev.data : rev.data + 'T12:00:00'), 'dd/MM/yyyy') : ''}
            </td>
          </tr>
        ))}
        {(!revisoes || revisoes.length === 0) && (
          <tr>
            <td colSpan={3} style={{ padding: '10px', textAlign: 'center', color: '#9ca3af', fontStyle: 'italic' }}>
              Nenhuma revisão registrada.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  </div>
);

const TabelaArquivos = ({ arquivos, isCliente, onResponder }) => {
  const [respostas, setRespostas] = useState({});

  const handleSubmitResposta = (i) => {
    if (!respostas[i]) return;
    onResponder(i, respostas[i]);
    setRespostas(prev => ({ ...prev, [i]: '' }));
  };

  const gruposPorDisciplina = arquivos.reduce((acc, arq, idx) => {
    if (!acc[arq.disciplina]) acc[arq.disciplina] = [];
    acc[arq.disciplina].push({ ...arq, _idx: idx });
    return acc;
  }, {});

  return (
    <div className="lista-mestra-wrapper" style={{ border: '1px solid #d1d5db', borderRadius: '10px', overflow: 'hidden', marginBottom: '8px' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '9px' }}>
        <thead>
          <tr>
            <th colSpan="5" style={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: '#0c2461', color: '#fff', padding: '6px', fontSize: '11px', letterSpacing: '0.5px' }}>
              LISTA MESTRA DE ARQUIVOS ANALISADOS
            </th>
          </tr>
          <tr style={{ backgroundColor: '#0c2461', color: '#fff' }}>
            <th style={{ padding: '5px 8px', width: '14%', textAlign: 'center', borderTop: '1px solid #1e3a8a' }}>DES</th>
            <th style={{ padding: '5px 8px', width: '22%', textAlign: 'center', borderTop: '1px solid #1e3a8a', borderLeft: '1px solid #1e3a8a' }}>DESCRIÇÃO</th>
            <th style={{ padding: '5px 8px', textAlign: 'center', borderTop: '1px solid #1e3a8a', borderLeft: '1px solid #1e3a8a' }}>ARQUIVO</th>
            <th style={{ padding: '5px 8px', width: '5%', textAlign: 'center', borderTop: '1px solid #1e3a8a', borderLeft: '1px solid #1e3a8a' }}>REV</th>
            <th style={{ padding: '5px 8px', width: '10%', textAlign: 'center', borderTop: '1px solid #1e3a8a', borderLeft: '1px solid #1e3a8a' }}>DATA DE CADASTRO</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(gruposPorDisciplina).map(([disciplina, items]) =>
            items.map((arq, j) => (
              <React.Fragment key={arq._idx}>
                <tr style={{ backgroundColor: j % 2 === 0 ? '#fff' : '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '4px 8px', fontWeight: j === 0 ? 'bold' : 'normal', color: j === 0 ? '#0c2461' : '#374151' }}>
                    {j === 0 ? disciplina : ''}
                  </td>
                  <td style={{ padding: '4px 8px', borderLeft: '1px solid #e5e7eb' }}>{arq.descricao}</td>
                  <td style={{ padding: '4px 8px', fontSize: '8px', borderLeft: '1px solid #e5e7eb' }}>{arq.arquivo}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'center', borderLeft: '1px solid #e5e7eb' }}>{arq.ref}</td>
                  <td style={{ padding: '4px 8px', textAlign: 'center', borderLeft: '1px solid #e5e7eb' }}>
                    {arq.data_cadastro ? format(new Date(arq.data_cadastro.includes('T') ? arq.data_cadastro : arq.data_cadastro + 'T12:00:00'), 'dd/MM/yyyy') : ''}
                  </td>
                </tr>
                {/* Comentário técnico */}
                {arq.comentario_tecnico && (
                  <tr>
                    <td colSpan="5" style={{ padding: '4px 8px', backgroundColor: '#fffde7', fontSize: '9px', borderBottom: '1px solid #e5e7eb' }}>
                      <strong>📋 Comentário técnico:</strong> {arq.comentario_tecnico}
                    </td>
                  </tr>
                )}
                {/* Resposta do cliente existente */}
                {arq.resposta_cliente && (
                  <tr>
                    <td colSpan="5" style={{ padding: '4px 8px', backgroundColor: '#f0fdf4', fontSize: '9px', borderBottom: '1px solid #e5e7eb' }}>
                      <strong>💬 Resposta do cliente:</strong> {arq.resposta_cliente}
                      <span style={{ marginLeft: '8px', color: '#16a34a', fontWeight: 'bold' }}>[{arq.status_resposta}]</span>
                    </td>
                  </tr>
                )}
                {/* Campo para cliente responder */}
                {isCliente && !arq.resposta_cliente && arq.comentario_tecnico && (
                  <tr className="no-print">
                    <td colSpan="5" style={{ padding: '6px 8px', backgroundColor: '#eff6ff', borderBottom: '1px solid #e5e7eb' }}>
                      <div className="flex gap-2 items-start">
                        <Textarea
                          placeholder="Escreva sua resposta ao comentário técnico..."
                          value={respostas[arq._idx] || ''}
                          onChange={e => setRespostas(prev => ({ ...prev, [arq._idx]: e.target.value }))}
                          rows={2}
                          className="text-xs flex-1"
                        />
                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white"
                          onClick={() => handleSubmitResposta(arq._idx)}>
                          <Check className="w-3 h-3 mr-1" />Responder
                        </Button>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default function VisualizarRelatorioAnaliseTecnica() {
  const navigate = useNavigate();
  const location = useLocation();
  const id = new URLSearchParams(location.search).get('id');

  const [relatorio, setRelatorio] = useState(null);
  const [empreendimento, setEmpreendimento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [saving, setSaving] = useState(false);
  const isCliente = user?.perfil_cliente === true;

  useEffect(() => {
    if (!id) { setError('ID não fornecido'); setLoading(false); return; }
    const load = async () => {
      const rel = await RelatorioAnaliseTecnica.get(id);
      if (!rel) { setError('Relatório não encontrado'); setLoading(false); return; }
      const emp = await Empreendimento.get(rel.id_empreendimento);
      const me = await User.me();
      setRelatorio(rel);
      setEmpreendimento(emp);
      setUser(me);
      setLoading(false);
    };
    load().catch(err => { setError(err.message); setLoading(false); });
  }, [id]);

  useEffect(() => {
    document.documentElement.style.colorScheme = 'light';
    return () => { document.documentElement.style.colorScheme = ''; };
  }, []);

  const handleResponder = async (idx, resposta) => {
    setSaving(true);
    const updated = [...relatorio.lista_arquivos];
    updated[idx] = { ...updated[idx], resposta_cliente: resposta, status_resposta: 'Respondido' };
    const novoStatus = 'Respondido';
    await RelatorioAnaliseTecnica.update(id, { lista_arquivos: updated, status_relatorio: novoStatus });
    setRelatorio(prev => ({ ...prev, lista_arquivos: updated, status_relatorio: novoStatus }));
    setSaving(false);
  };

  const handleResponderProjeto = async (idx, tipo, resposta) => {
    setSaving(true);
    try {
      const sectionKey = 'projetos'; // default
      const updated = [...(relatorio[sectionKey] || [])];
      
      if (tipo === 'replica') {
        updated[idx] = { ...updated[idx], replica: resposta };
      } else if (tipo === 'treplica') {
        updated[idx] = { ...updated[idx], treplica: resposta };
      } else if (tipo === 'comentarios') {
        updated[idx] = { ...updated[idx], comentarios: resposta };
      }
      
      await RelatorioAnaliseTecnica.update(id, { [sectionKey]: updated });
      setRelatorio(prev => ({ ...prev, [sectionKey]: updated }));
    } finally {
      setSaving(false);
    }
  };

  const handleResponderComentario = async (projIdx, comIdx, resposta, respostas) => {
    setSaving(true);
    try {
      const updated = [...(relatorio.projetos || [])];
      updated[projIdx] = { ...updated[projIdx] };
      updated[projIdx].comentarios = [...(updated[projIdx].comentarios || [])];
      const comentario = updated[projIdx].comentarios[comIdx];
      
      if (respostas) {
        comentario.respostas = respostas;
      } else {
        comentario.resposta = resposta;
      }
      
      console.log('Salvando resposta:', { projIdx, comIdx, resposta });
      
      const result = await RelatorioAnaliseTecnica.update(id, { projetos: updated });
      console.log('Resposta salva:', result);
      
      setRelatorio(prev => ({ ...prev, projetos: updated }));
    } catch (error) {
      console.error('Erro ao salvar resposta:', error);
      alert('Erro ao salvar resposta: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      <p className="mt-3 text-gray-500">Carregando relatório...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <AlertTriangle className="w-12 h-12 text-red-500 mb-3" />
      <p className="text-red-600 font-semibold">{error}</p>
      <Button onClick={() => navigate(createPageUrl('Empreendimentos'))} className="mt-4"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
    </div>
  );

  return (
    <div className="bg-gray-200 print:bg-white min-h-screen">
      {/* Barra de controle */}
      <div className="no-print bg-white border-b shadow-sm p-3 mb-4">
        <div className="flex justify-between items-center max-w-5xl mx-auto">
          <Button onClick={() => navigate(-1)} variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              relatorio.status_relatorio === 'Respondido' ? 'bg-green-100 text-green-700' :
              relatorio.status_relatorio === 'Aguardando Resposta' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-700'
            }`}>{relatorio.status_relatorio}</span>
            {isCliente && <span className="text-sm text-blue-600 font-medium flex items-center gap-1"><MessageSquare className="w-4 h-4" />Você pode responder os comentários técnicos</span>}
          </div>
          <Button onClick={() => window.print()} className="bg-green-600 hover:bg-green-700 text-white">
            <Printer className="w-4 h-4 mr-2" />Gerar PDF
          </Button>
        </div>
      </div>

      {/* Relatório */}
      <div className="report-container max-w-5xl mx-auto bg-white shadow p-8 print:shadow-none print:p-4">
        <CabecalhoRelatorio relatorio={relatorio} empreendimento={empreendimento} />

        <Tabs defaultValue="revisoes" className="w-full" style={{ marginBottom: '12px' }}>
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1 h-auto">
            <TabsTrigger value="revisoes" className="text-xs">Revisões</TabsTrigger>
            <TabsTrigger value="arquivos" className="text-xs">Lista de Arquivos</TabsTrigger>
            <TabsTrigger value="projetos" className="text-xs">Projeto Arquitetura</TabsTrigger>
            <TabsTrigger value="eletricas" className="text-xs">Elétricas</TabsTrigger>
            <TabsTrigger value="hidraulicas" className="text-xs">Hidráulicas</TabsTrigger>
            <TabsTrigger value="bombeiro" className="text-xs">Legal Bombeiro</TabsTrigger>
            <TabsTrigger value="hvac" className="text-xs">HVAC</TabsTrigger>
            <TabsTrigger value="conclusao" className="text-xs">Conclusão</TabsTrigger>
          </TabsList>

          <TabsContent value="revisoes" style={{ marginTop: '12px' }}>
            <TabelaRevisoes revisoes={relatorio.revisoes} />
          </TabsContent>

          <TabsContent value="arquivos" style={{ marginTop: '12px' }}>
            {relatorio.lista_arquivos?.length > 0 && (
              <TabelaArquivos
                arquivos={relatorio.lista_arquivos}
                isCliente={isCliente}
                onResponder={handleResponder}
              />
            )}
            {(!relatorio.lista_arquivos || relatorio.lista_arquivos.length === 0) && (
              <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                Nenhum arquivo disponível neste relatório.
              </div>
            )}
          </TabsContent>

          <TabsContent value="projetos" style={{ marginTop: '12px' }}>
            {relatorio.projetos?.length > 0 ? (
              <TabelaProjetos
                projetos={relatorio.projetos}
                isCliente={isCliente}
                onResponder={handleResponderProjeto}
                saving={saving}
                onResponderComentario={handleResponderComentario}
              />
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                Nenhum projeto disponível neste relatório.
              </div>
            )}
          </TabsContent>

          <TabsContent value="eletricas" style={{ marginTop: '12px' }}>
            {relatorio.instalacoes_eletricas?.length > 0 ? (
              <TabelaProjetos
                projetos={relatorio.instalacoes_eletricas}
                isCliente={isCliente}
                onResponder={handleResponderProjeto}
                saving={saving}
                onResponderComentario={handleResponderComentario}
              />
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                Nenhuma instalação elétrica disponível neste relatório.
              </div>
            )}
          </TabsContent>

          <TabsContent value="hidraulicas" style={{ marginTop: '12px' }}>
            {relatorio.instalacoes_hidraulicas?.length > 0 ? (
              <TabelaProjetos
                projetos={relatorio.instalacoes_hidraulicas}
                isCliente={isCliente}
                onResponder={handleResponderProjeto}
                saving={saving}
                onResponderComentario={handleResponderComentario}
              />
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                Nenhuma instalação hidráulica disponível neste relatório.
              </div>
            )}
          </TabsContent>

          <TabsContent value="bombeiro" style={{ marginTop: '12px' }}>
            {relatorio.projeto_legal_bombeiro?.length > 0 ? (
              <TabelaProjetos
                projetos={relatorio.projeto_legal_bombeiro}
                isCliente={isCliente}
                onResponder={handleResponderProjeto}
                saving={saving}
                onResponderComentario={handleResponderComentario}
              />
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                Nenhum projeto legal bombeiro disponível neste relatório.
              </div>
            )}
          </TabsContent>

          <TabsContent value="hvac" style={{ marginTop: '12px' }}>
            {relatorio.instalacoes_hvac?.length > 0 ? (
              <TabelaProjetos
                projetos={relatorio.instalacoes_hvac}
                isCliente={isCliente}
                onResponder={handleResponderProjeto}
                saving={saving}
                onResponderComentario={handleResponderComentario}
              />
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                Nenhuma instalação HVAC disponível neste relatório.
              </div>
            )}
          </TabsContent>

          <TabsContent value="conclusao" style={{ marginTop: '12px' }}>
            {relatorio.conclusao?.length > 0 ? (
              <TabelaProjetos
                projetos={relatorio.conclusao}
                isCliente={isCliente}
                onResponder={handleResponderProjeto}
                saving={saving}
                onResponderComentario={handleResponderComentario}
              />
            ) : (
              <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                Nenhuma conclusão disponível neste relatório.
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Seção apenas para impressão - mostra todos os conteúdos */}
        <div style={{ display: 'none' }} className="print:block">
          <div style={{ marginBottom: '16px' }}>
            <TabelaRevisoes revisoes={relatorio.revisoes} />
          </div>

          {/* Análise Técnica */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: '#0c2461', color: '#fff', padding: '8px', marginBottom: '12px', borderRadius: '6px', fontSize: '11px' }}>LISTA DE ARQUIVOS</div>
            {relatorio.lista_arquivos?.length > 0 ? (
              <TabelaArquivos
                arquivos={relatorio.lista_arquivos}
                isCliente={false}
                onResponder={() => {}}
              />
            ) : (
              <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af', fontSize: '10px' }}>Nenhum arquivo disponível</div>
            )}
          </div>

          {/* Projetos */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: '#0c2461', color: '#fff', padding: '8px', marginBottom: '12px', borderRadius: '6px', fontSize: '11px' }}>PROJETO DE ARQUITETURA</div>
            {relatorio.projetos?.length > 0 ? (
              <TabelaProjetos
                projetos={relatorio.projetos}
                isCliente={false}
                onResponder={() => {}}
                saving={false}
                onResponderComentario={() => {}}
              />
            ) : (
              <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af', fontSize: '10px' }}>Nenhum projeto disponível</div>
            )}
          </div>

          {/* Instalações Elétricas */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: '#0c2461', color: '#fff', padding: '8px', marginBottom: '12px', borderRadius: '6px', fontSize: '11px' }}>INSTALAÇÕES ELÉTRICAS</div>
            {relatorio.instalacoes_eletricas?.length > 0 ? (
              <TabelaProjetos
                projetos={relatorio.instalacoes_eletricas}
                isCliente={false}
                onResponder={() => {}}
                saving={false}
                onResponderComentario={() => {}}
              />
            ) : (
              <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af', fontSize: '10px' }}>Nenhuma instalação elétrica disponível</div>
            )}
          </div>

          {/* Instalações Hidráulicas */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: '#0c2461', color: '#fff', padding: '8px', marginBottom: '12px', borderRadius: '6px', fontSize: '11px' }}>INSTALAÇÕES HIDRÁULICAS</div>
            {relatorio.instalacoes_hidraulicas?.length > 0 ? (
              <TabelaProjetos
                projetos={relatorio.instalacoes_hidraulicas}
                isCliente={false}
                onResponder={() => {}}
                saving={false}
                onResponderComentario={() => {}}
              />
            ) : (
              <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af', fontSize: '10px' }}>Nenhuma instalação hidráulica disponível</div>
            )}
          </div>

          {/* Projeto Legal Bombeiro */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: '#0c2461', color: '#fff', padding: '8px', marginBottom: '12px', borderRadius: '6px', fontSize: '11px' }}>PROJETO LEGAL BOMBEIRO</div>
            {relatorio.projeto_legal_bombeiro?.length > 0 ? (
              <TabelaProjetos
                projetos={relatorio.projeto_legal_bombeiro}
                isCliente={false}
                onResponder={() => {}}
                saving={false}
                onResponderComentario={() => {}}
              />
            ) : (
              <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af', fontSize: '10px' }}>Nenhum projeto legal bombeiro disponível</div>
            )}
          </div>

          {/* Instalações HVAC */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: '#0c2461', color: '#fff', padding: '8px', marginBottom: '12px', borderRadius: '6px', fontSize: '11px' }}>INSTALAÇÕES HVAC</div>
            {relatorio.instalacoes_hvac?.length > 0 ? (
              <TabelaProjetos
                projetos={relatorio.instalacoes_hvac}
                isCliente={false}
                onResponder={() => {}}
                saving={false}
                onResponderComentario={() => {}}
              />
            ) : (
              <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af', fontSize: '10px' }}>Nenhuma instalação HVAC disponível</div>
            )}
          </div>

          {/* Conclusão */}
          <div style={{ marginBottom: '16px' }}>
            <div style={{ textAlign: 'center', fontWeight: 'bold', backgroundColor: '#0c2461', color: '#fff', padding: '8px', marginBottom: '12px', borderRadius: '6px', fontSize: '11px' }}>CONCLUSÃO</div>
            {relatorio.conclusao?.length > 0 ? (
              <TabelaProjetos
                projetos={relatorio.conclusao}
                isCliente={false}
                onResponder={() => {}}
                saving={false}
                onResponderComentario={() => {}}
              />
            ) : (
              <div style={{ padding: '12px', textAlign: 'center', color: '#9ca3af', fontSize: '10px' }}>Nenhuma conclusão disponível</div>
            )}
          </div>
          </div>

        {/* Nota Geral */}
        {relatorio.nota_geral && (
          <div style={{ marginTop: '12px', border: '1px solid #d1d5db', borderRadius: '10px', padding: '8px 12px', fontSize: '9px' }}>
            <strong style={{ color: '#0c2461' }}>NOTA GERAL</strong>
            <p style={{ marginTop: '4px', whiteSpace: 'pre-wrap', color: '#374151' }}>{relatorio.nota_geral}</p>
          </div>
        )}

        {/* Legenda */}
        <div style={{ marginTop: '8px', border: '1px solid #d1d5db', borderRadius: '10px', padding: '6px', fontSize: '9px', textAlign: 'center', fontWeight: 'bold', color: '#0c2461' }}>
          LEGENDA — {LEGENDA_NOTE}
        </div>
      </div>

      <style>{`
        @page { size: A4 portrait; margin: 15mm; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .report-container { box-shadow: none !important; max-width: none !important; margin: 0 !important; padding: 0 !important; }
          .lista-mestra-wrapper {
            border-radius: 10px !important;
            overflow: hidden !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .lista-mestra-wrapper table {
            border-collapse: separate !important;
            border-spacing: 0 !important;
          }
          .lista-mestra-wrapper thead { display: table-header-group; }
          /* Cantos arredondados nas células extremas */
          .lista-mestra-wrapper thead tr:first-child th:first-child { border-top-left-radius: 9px !important; }
          .lista-mestra-wrapper thead tr:first-child th:last-child { border-top-right-radius: 9px !important; }
          .lista-mestra-wrapper tbody tr:last-child td:first-child { border-bottom-left-radius: 9px !important; }
          .lista-mestra-wrapper tbody tr:last-child td:last-child { border-bottom-right-radius: 9px !important; }
        }
        @media screen {
          .report-container { margin: 20px auto; }
        }
      `}</style>
    </div>
  );
}