import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, AlertTriangle, ArrowLeft, Printer, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Empreendimento, InspecaoVistoriaObraPadrao } from '../api/entities';
import { createPageUrl } from '@/utils';
import { getUploadUrl } from '@/api/config';
import { compressReportImages } from '@/lib/compressReportImages';
import { parseLocalDate } from '../lib/dateUtils';

// ─── Constants ────────────────────────────────────────────────────────────────
const NAVY = '#1e3751';
const RED  = '#CE2D2D';
const LOGO_WHITE = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/1a0999f3c_logo_Interativa_letra_branca_sem_fundo_gg.png';

const isValidId = (id) => id && typeof id === 'string' && id.length > 0;

const toRoman = (n) => {
    const v = [1000,900,500,400,100,90,50,40,10,9,5,4,1];
    const s = ['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
    let r = '';
    for (let i = 0; i < v.length; i++) while (n >= v[i]) { r += s[i]; n -= v[i]; }
    return r;
};

const fmtDate = (d) => {
    try { return d ? format(parseLocalDate(d), 'dd/MM/yyyy') : '—'; }
    catch { return '—'; }
};

// ─── Badge ────────────────────────────────────────────────────────────────────
const COR_BADGE = {
    green:  { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
    blue:   { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
    red:    { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
    yellow: { bg: '#fef9c3', text: '#a16207', border: '#fde047' },
    purple: { bg: '#f3e8ff', text: '#7e22ce', border: '#d8b4fe' },
};

const RespostaBadge = ({ resposta, opcoes }) => {
    if (!resposta) return <span style={{ color: '#9ca3af', fontSize: '11px' }}>—</span>;
    const op = (opcoes || []).find(o => o.texto === resposta);
    const style = op?.cor ? COR_BADGE[op.cor] : null;
    if (!style) return <span style={{ fontSize: '11px' }}>{resposta}</span>;
    return (
        <span style={{
            display: 'inline-block', padding: '3px 10px', borderRadius: '9999px',
            fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap',
            backgroundColor: style.bg, color: style.text, border: `1px solid ${style.border}`,
        }}>{resposta}</span>
    );
};

// ─── Image helpers ─────────────────────────────────────────────────────────
const compressImage = (url, maxWidth = 800, quality = 0.7) =>
    new Promise((resolve) => {
        if (!url || typeof url !== 'string' || url.startsWith('data:image')) { resolve(url); return; }
        if (url.includes('base44.app/api')) { resolve(url); return; }
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let w = img.width, h = img.height;
            if (w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
            canvas.width = w; canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(url);
        img.src = url;
    });

const useCompressedImage = (url, maxWidth = 800, quality = 0.7) => {
    const [comp, setComp] = useState(url);
    useEffect(() => {
        if (url && typeof url === 'string' && url.startsWith('http'))
            compressImage(url, maxWidth, quality).then(setComp);
        else setComp(url);
    }, [url]);
    return comp;
};

// ─── Cover page ────────────────────────────────────────────────────────────
const CoverPage = ({ relatorio, empreendimento }) => {
    const year = new Date(relatorio?.data_inspecao || Date.now()).getFullYear();
    const empreendimentoImageUrl = useCompressedImage(
        empreendimento?.foto_empreendimento || 'https://images.unsplash.com/photo-1519947486511-46149fa0a254?w=800&q=80',
        800, 0.7
    );
    const coverFrameUrl  = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/dca667b3d_erasebg-transformed.png';
    const redDecoUrl     = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/513d57969_Designsemnome2.png';
    const bottomFrameUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/10e9b2570_erasebg-transformed.png';
    const logoBrancoUrl  = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/22086ec44_LOGOPNG-branco.png';

    const responsaveis = empreendimento?.texto_capa_rodape
        || [empreendimento?.cli_empreendimento, empreendimento?.nome_empreendimento].filter(Boolean).join(' | ');

    const getTextStyle = (text) => {
        const len = (text || '').length;
        if (len <= 25) return { fontSize: '32px', letterSpacing: '1px' };
        if (len <= 40) return { fontSize: '26px', letterSpacing: '0.8px' };
        return { fontSize: '20px', letterSpacing: '0.5px' };
    };

    return (
        <>
            <div className="absolute w-full h-full bg-center bg-no-repeat z-10"
                style={{ backgroundImage: `url(${empreendimentoImageUrl})`, backgroundPosition: 'center 15%', backgroundSize: 'cover', opacity: 0.2, top: '-10px', left: '-10px', width: 'calc(100% + 20px)', height: 'calc(100% + 20px)' }} />
            <div className="absolute top-0 left-0 w-full h-full bg-contain bg-left-top bg-no-repeat z-20"
                style={{ backgroundImage: `url(${coverFrameUrl})`, height: '150%' }} />
            <div className="absolute z-50" style={{ top: '25px', left: '11px', width: '350px', height: '170px' }}>
                <img src={LOGO_WHITE} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} />
            </div>
            <div className="absolute flex items-center justify-center z-40"
                style={{ top: '23%', left: '11%', width: '22.7%', height: '25%', transform: 'rotate(27deg)' }}>
                <span className="font-normal text-white" style={{ fontSize: '60px', fontFamily: "'Inter', sans-serif", textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}>{year}</span>
            </div>
            <div className="absolute z-30" style={{ top: '10%', right: '8%', width: '50%', textAlign: 'right' }}>
                <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: '64px', fontWeight: 'bold', color: '#394557', lineHeight: '1.1', marginBottom: '4px' }}>RELATÓRIO</h1>
                <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: '22px', color: RED, letterSpacing: '1px' }}>VISTORIA DE OBRA PADRÃO</h2>
            </div>
            <div className="absolute z-30" style={{ top: '50%', right: '-3%', width: '45%', padding: '1.3% 2.5%', textAlign: 'center' }}>
                <h1 className="font-black uppercase" style={{ fontSize: '28px', lineHeight: '1.0', fontFamily: "'Inter', sans-serif", marginBottom: '6px', color: 'black' }}>
                    {relatorio?.cliente || 'Cliente'}
                </h1>
                <h2 className="text-gray-600 font-medium" style={{ fontSize: '16px', fontFamily: "'Inter', sans-serif" }}>
                    {relatorio?.subtitulo_relatorio || ''}
                </h2>
            </div>
            <div className="absolute z-20"
                style={{ top: '-350px', right: '-30%', width: '1700px', height: '1150px', backgroundColor: RED, WebkitMaskImage: `url(${redDecoUrl})`, maskImage: `url(${redDecoUrl})`, WebkitMaskSize: '100% 100%', WebkitMaskRepeat: 'no-repeat', maskPosition: 'center' }} />
            <div className="absolute z-50" style={{ top: '-10%', right: '-20%', width: '1800px', height: '800px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={logoBrancoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div className="absolute right-0 w-full h-full bg-no-repeat z-40"
                style={{ bottom: '-5%', backgroundImage: `url('${bottomFrameUrl}')`, height: '1000%', backgroundSize: '230% auto', backgroundPosition: '65% 100%' }} />
            <div className="absolute z-10"
                style={{ bottom: '0%', left: '0%', width: '450px', height: '800px', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', clipPath: 'polygon(0 0%, 100% 23%, 100% 100%, 0% 100%)' }}>
                <img src={empreendimentoImageUrl} alt={empreendimento?.nome_empreendimento || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div className="absolute flex items-center justify-center z-50"
                style={{ bottom: '0', left: '0', right: '0', height: '65px', backgroundColor: RED, clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 5% 100%)', paddingLeft: '15%', paddingRight: '5%' }}>
                <span className="text-white w-full font-normal" style={{ ...getTextStyle(responsaveis), fontFamily: 'Poppins', textAlign: 'center', lineHeight: '1.2' }}>{responsaveis}</span>
            </div>
        </>
    );
};

// ─── Page header / footer (content pages) ─────────────────────────────────
const PageHeader = ({ relatorio, empreendimento }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '10px', borderBottom: '1px solid #e5e7eb', marginBottom: '16px' }}>
        <div style={{ background: NAVY, padding: '4px 10px', borderRadius: '2px', display: 'flex', alignItems: 'center' }}>
            <img src={LOGO_WHITE} alt="Interativa" style={{ height: '34px', objectFit: 'contain' }} />
        </div>
        <div style={{ textAlign: 'right', fontSize: '10px', color: '#374151', lineHeight: '1.7' }}>
            <div style={{ fontWeight: 'bold', fontSize: '11px', textTransform: 'uppercase' }}>
                {relatorio?.titulo_relatorio || 'VISTORIA DE OBRA PADRÃO'}
            </div>
            <div>{empreendimento?.nome_empreendimento || ''}</div>
            <div>{fmtDate(relatorio?.data_inspecao)}</div>
        </div>
    </div>
);

const PageFooter = ({ relatorio }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid #e5e7eb', marginTop: '20px', fontSize: '9px', color: '#9ca3af' }}>
        <span>Arquivo: {relatorio?.titulo_relatorio || 'Vistoria de Obra'}</span>
        <span>INTERATIVA ENGENHARIA | www.interativaengenharia.com.br</span>
    </div>
);

// ─── Dados do Projeto page ────────────────────────────────────────────────
const DadosProjeto = ({ relatorio, empreendimento }) => {
    const Field = ({ label, value }) => (
        <div style={{ marginBottom: '14px' }}>
            <div style={{ fontWeight: '600', fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' }}>{label}:</div>
            <div style={{ fontSize: '12px', color: '#1f2937' }}>{value || '—'}</div>
        </div>
    );

    return (
        <div className="bg-white p-8">
            <PageHeader relatorio={relatorio} empreendimento={empreendimento} />

            <div style={{ background: NAVY, color: 'white', textAlign: 'center', padding: '10px 16px', fontWeight: 'bold', fontSize: '13px', letterSpacing: '0.08em', marginBottom: '24px' }}>
                DADOS DO PROJETO
            </div>

            <div style={{ border: '1px solid #e5e7eb', borderRadius: '4px', padding: '20px 24px', marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 40px' }}>
                    <Field label="Empreendimento"      value={empreendimento?.nome_empreendimento} />
                    <Field label="Administradora"      value={empreendimento?.cli_empreendimento} />
                    <Field label="Cliente"             value={relatorio?.cliente} />
                    <Field label="Data da Vistoria"    value={fmtDate(relatorio?.data_inspecao)} />
                    <Field label="Revisão"             value={relatorio?.revisao} />
                    {relatorio?.eng_responsavel && <Field label="Consultoria Técnica" value={relatorio.eng_responsavel} />}
                </div>
            </div>

            {relatorio?.subtitulo_relatorio && (
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontWeight: '600', fontSize: '12px', color: '#374151', marginBottom: '6px' }}>Escopo de consultoria:</div>
                    <div style={{ border: '1px solid #e5e7eb', padding: '12px', fontSize: '12px', lineHeight: '1.6', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                        {relatorio.subtitulo_relatorio}
                    </div>
                </div>
            )}

            {relatorio?.eng_responsavel && (
                <div style={{ textAlign: 'center', marginTop: '48px', fontSize: '12px' }}>
                    <div style={{ fontWeight: 'bold' }}>Consultoria Técnica:</div>
                    <div style={{ marginTop: '4px' }}>{relatorio.eng_responsavel}</div>
                </div>
            )}

            <PageFooter relatorio={relatorio} />
        </div>
    );
};

// ─── Section (matches PDF 2-column table format) ──────────────────────────
const SecaoVistoria = ({ secao, sectionIndex }) => {
    const isSignature = secao.nome_secao === 'ASSINATURAS';

    const thStyle = {
        background: '#f3f4f6',
        border: '1px solid #9ca3af',
        padding: '7px 10px',
        textAlign: 'left',
        fontSize: '11px',
        fontWeight: '600',
        color: '#374151',
    };

    const tdBase = {
        border: '1px solid #d1d5db',
        padding: '8px 10px',
        fontSize: '11px',
        verticalAlign: 'middle',
    };

    return (
        <div style={{ marginBottom: '28px' }}>
            {/* Section header */}
            <div style={{ background: NAVY, color: 'white', padding: '8px 14px', fontWeight: 'bold', fontSize: '13px', letterSpacing: '0.04em' }}>
                {sectionIndex + 1}. {secao.nome_secao}
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th style={thStyle}>Seção</th>
                        <th style={{ ...thStyle, width: isSignature ? '40%' : '34%', textAlign: 'center' }}>Status/Resposta</th>
                    </tr>
                </thead>
                <tbody>
                    {secao.perguntas.map((p, idx) => (
                        <React.Fragment key={idx}>
                            {/* Question row */}
                            <tr>
                                <td style={{ ...tdBase, verticalAlign: 'top', paddingTop: '9px', paddingBottom: '9px' }}>
                                    <span style={{ fontWeight: 'bold' }}>{toRoman(idx + 1)}.</span>{' '}{p.pergunta}
                                </td>
                                <td style={{
                                    ...tdBase,
                                    textAlign: 'center',
                                    fontSize: isSignature ? '15px' : '11px',
                                    fontWeight: isSignature ? '500' : 'normal',
                                    paddingTop: isSignature ? '18px' : '9px',
                                    paddingBottom: isSignature ? '18px' : '9px',
                                }}>
                                    {isSignature
                                        ? (p.resposta || '')
                                        : <RespostaBadge resposta={p.resposta} opcoes={p.opcoes} />
                                    }
                                </td>
                            </tr>

                            {/* Comentário row */}
                            {p.observacao && !isSignature && (
                                <tr>
                                    <td colSpan={2} style={{ ...tdBase, background: '#f9fafb', paddingTop: '8px', paddingBottom: '12px', verticalAlign: 'top' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '4px', color: '#374151' }}>Comentário:</div>
                                        <div style={{ fontSize: '11px', lineHeight: '1.55', color: '#1f2937' }}>{p.observacao}</div>
                                    </td>
                                </tr>
                            )}

                            {/* Registro Fotográfico row */}
                            {p.foto && !isSignature && (
                                <tr>
                                    <td colSpan={2} style={{ ...tdBase, paddingTop: '12px', paddingBottom: '16px', verticalAlign: 'top' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '10px', color: '#374151' }}>Registro Fotográfico:</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <img
                                                    src={getUploadUrl(p.foto)}
                                                    alt=""
                                                    style={{ width: '100%', maxHeight: '220px', objectFit: 'cover', border: '1px solid #e5e7eb', borderRadius: '2px' }}
                                                />
                                                <div style={{ fontSize: '10px', marginTop: '5px', fontWeight: '600', color: '#374151' }}>
                                                    {p.observacao
                                                        ? p.observacao.slice(0, 60) + (p.observacao.length > 60 ? '...' : '')
                                                        : p.pergunta?.slice(0, 50)}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

// ─── Report container ──────────────────────────────────────────────────────
const ReportContent = ({ relatorio, empreendimento, navigate }) => (
    <div className="bg-gray-200 print:bg-white min-h-screen font-sans">
        {/* Toolbar – hidden on print */}
        <div className="no-print shadow-sm border-b p-4 mb-4 bg-white">
            <div className="flex justify-between items-center max-w-4xl mx-auto">
                <Button onClick={() => navigate(-1)} variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />Voltar
                </Button>
                <h1 className="text-xl font-semibold text-gray-800">Vistoria de Obra — Relatório</h1>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => navigate(createPageUrl(`EditarVistoriadeObra?relatorioId=${relatorio.id}`))}>
                        <Pencil className="w-4 h-4 mr-2" />Editar
                    </Button>
                    <Button onClick={() => window.print()} className="bg-green-600 hover:bg-green-700 text-white">
                        <Printer className="w-4 h-4 mr-2" />Gerar PDF
                    </Button>
                </div>
            </div>
        </div>

        <div className="report-container max-w-4xl mx-auto" style={{ padding: 0 }}>
            {/* Page 1 — Cover */}
            <div className="report-page" style={{ height: '297mm', overflow: 'hidden' }}>
                <CoverPage relatorio={relatorio} empreendimento={empreendimento} />
            </div>

            {/* Page 2 — Dados do Projeto */}
            <div className="report-page mt-4">
                <DadosProjeto relatorio={relatorio} empreendimento={empreendimento} />
            </div>

            {/* Pages 3+ — Sections */}
            <div className="bg-white p-8 mt-4">
                <PageHeader relatorio={relatorio} empreendimento={empreendimento} />

                {(relatorio.secoes || []).map((secao, idx) => (
                    <SecaoVistoria key={idx} secao={secao} sectionIndex={idx} />
                ))}

                {/* Observações Gerais */}
                {relatorio.observacoes_gerais && (
                    <div style={{ marginBottom: '28px' }}>
                        <div style={{ background: NAVY, color: 'white', padding: '8px 14px', fontWeight: 'bold', fontSize: '13px', letterSpacing: '0.04em' }}>
                            OBSERVAÇÕES GERAIS
                        </div>
                        <div style={{ border: '1px solid #d1d5db', padding: '12px 14px', fontSize: '11px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                            {relatorio.observacoes_gerais}
                        </div>
                    </div>
                )}

                <PageFooter relatorio={relatorio} />
            </div>
        </div>
    </div>
);

// ─── Page component ────────────────────────────────────────────────────────
export default function VisualizarInspecaoVistoriaObraPadrao() {
    const navigate = useNavigate();
    const location = useLocation();
    const relatorioId = new URLSearchParams(location.search).get('relatorioId');

    const [relatorio, setRelatorio]       = useState(null);
    const [empreendimento, setEmpreendimento] = useState(null);
    const [loading, setLoading]           = useState(true);
    const [error, setError]               = useState(null);

    useEffect(() => {
        if (!isValidId(relatorioId)) { setError('ID do relatório inválido.'); setLoading(false); return; }

        const load = async () => {
            try {
                const rel = await InspecaoVistoriaObraPadrao.get(relatorioId);
                if (!rel) throw new Error('Relatório não encontrado');
                const emp = rel.id_empreendimento ? await Empreendimento.get(rel.id_empreendimento) : null;
                const compressed = await compressReportImages(rel);
                setRelatorio(compressed);
                setEmpreendimento(emp);
            } catch (err) {
                setError(err.message || 'Erro ao carregar relatório');
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [relatorioId]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <p className="mt-4 text-gray-600">Carregando relatório...</p>
        </div>
    );

    if (error) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-4">
            <div className="bg-white p-8 rounded-lg shadow-md text-center">
                <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-red-700 mb-2">Erro ao carregar relatório</h2>
                <p className="text-gray-600 mb-6">{error}</p>
                <Button onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>
            </div>
        </div>
    );

    return <ReportContent relatorio={relatorio} empreendimento={empreendimento} navigate={navigate} />;
}
