import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, AlertTriangle, ArrowLeft, Printer, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Empreendimento, InspecaoVistoriaObraPadrao } from '../api/entities';
import { createPageUrl } from '@/utils';
import { compressReportImages } from '@/lib/compressReportImages';

// --- Utilitários de imagem (copiados do padrão)
const isValidId = (id) => id && typeof id === 'string' && id.length > 0;

const compressImage = (url, maxWidth = 800, quality = 0.7) => {
    return new Promise((resolve) => {
        if (!url || typeof url !== 'string' || url.startsWith('data:image')) {
            resolve(url);
            return;
        }
        if (url.includes('base44.app/api')) {
            resolve(url);
            return;
        }
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            let width = img.width;
            let height = img.height;
            if (width > maxWidth) {
                height *= maxWidth / width;
                width = maxWidth;
            }
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => resolve(url);
        img.src = url;
    });
};

const useCompressedImage = (url, maxWidth = 800, quality = 0.7) => {
    const [compressedUrl, setCompressedUrl] = useState(url);
    useEffect(() => {
        if (url && typeof url === 'string' && url.startsWith('http')) {
            compressImage(url, maxWidth, quality).then(setCompressedUrl);
        } else {
            setCompressedUrl(url);
        }
    }, [url, maxWidth, quality]);
    return compressedUrl;
};

// --- CAPA
const CoverPage = ({ relatorio, empreendimento }) => {
    const year = new Date(relatorio?.data_inspecao || Date.now()).getFullYear();
    const redColor = '#CE2D2D';
    const empreendimentoImageUrl = useCompressedImage(
        empreendimento?.foto_empreendimento || 'https://images.unsplash.com/photo-1519947486511-46149fa0a254?w=800&q=80',
        800, 0.7
    );
    const logoInterativaUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/1a0999f3c_logo_Interativa_letra_branca_sem_fundo_gg.png";
    const coverFrameOriginalUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/dca667b3d_erasebg-transformed.png";
    const redDecorativeElementUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/513d57969_Designsemnome2.png';
    const bottomRightFrameUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/10e9b2570_erasebg-transformed.png';
    const logoInterativaBrancoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/22086ec44_LOGOPNG-branco.png";

    const defaultResponsaveis = [empreendimento?.cli_empreendimento, empreendimento?.nome_empreendimento].filter(Boolean).join(' | ');
    const responsaveis = empreendimento?.texto_capa_rodape || defaultResponsaveis;

    const getTextStyle = (text) => {
        const len = text ? text.length : 0;
        if (len <= 25) return { fontSize: '32px', letterSpacing: '1px' };
        if (len <= 40) return { fontSize: '26px', letterSpacing: '0.8px' };
        return { fontSize: '20px', letterSpacing: '0.5px' };
    };

    return (
        <>
            <div className="absolute w-full h-full bg-center bg-no-repeat z-10" style={{ backgroundImage: `url(${empreendimentoImageUrl})`, backgroundPosition: 'center 15%', backgroundSize: 'cover', opacity: 0.2, top: '-10px', left: '-10px', width: 'calc(100% + 20px)', height: 'calc(100% + 20px)' }} />
            <div className="absolute top-0 left-0 w-full h-full bg-contain bg-left-top bg-no-repeat z-20" style={{ backgroundImage: `url(${coverFrameOriginalUrl})`, height: '150%' }} />
            <div className="absolute z-50" style={{ top: '25px', left: '11px', width: '350px', height: '170px' }}>
                <img src={logoInterativaUrl} alt="Logo Interativa" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} />
            </div>
            <div className="absolute flex items-center justify-center z-40" style={{ top: '23%', left: '11%', width: '22.7%', height: '25%', transform: 'rotate(27deg)' }}>
                <span className="font-normal text-white" style={{ fontSize: '60px', fontFamily: "'Inter', sans-serif", textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}>{year}</span>
            </div>
            <div className="absolute z-30" style={{ top: '10%', right: '8%', width: '50%', textAlign: 'right' }}>
                <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: '64px', fontWeight: 'bold', color: '#394557', lineHeight: '1.1', marginBottom: '4px' }}>RELATÓRIO</h1>
                <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: '22px', color: redColor, letterSpacing: '1px' }}>VISTORIA DE OBRA PADRÃO</h2>
            </div>
            <div className="absolute z-30" style={{ top: '50%', right: '-3%', width: '45%', padding: '1.3% 2.5%', textAlign: 'center' }}>
                <h1 className="font-black uppercase" style={{ fontSize: '28px', lineHeight: '1.0', fontFamily: "'Inter', sans-serif", marginBottom: '6px', color: 'black' }}>{relatorio?.cliente || 'Cliente'}</h1>
                <h2 className="text-gray-600 font-medium" style={{ fontSize: '16px', fontFamily: "'Inter', sans-serif" }}>{relatorio?.subtitulo_relatorio || ''}</h2>
            </div>
            <div className="absolute z-20" style={{ top: '-350px', right: '-30%', width: '1700px', height: '1150px', backgroundColor: redColor, WebkitMaskImage: `url(${redDecorativeElementUrl})`, maskImage: `url(${redDecorativeElementUrl})`, WebkitMaskSize: '100% 100%', WebkitMaskRepeat: 'no-repeat', maskPosition: 'center' }} />
            <div className="absolute z-50" style={{ top: '-10%', right: '-20%', width: '1800px', height: '800px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={logoInterativaBrancoUrl} alt="Logo Interativa" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div className="absolute right-0 w-full h-full bg-no-repeat z-40" style={{ bottom: '-5%', backgroundImage: `url('${bottomRightFrameUrl}')`, height: '1000%', backgroundSize: '230% auto', backgroundPosition: '65% 100%' }} />
            <div className="absolute z-10" style={{ bottom: '0%', left: '0%', width: '450px', height: '800px', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', clipPath: 'polygon(0 0%, 100% 23%, 100% 100%, 0% 100%)' }}>
                <img src={empreendimentoImageUrl} alt={empreendimento?.nome_empreendimento || 'Foto do empreendimento'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div className="absolute flex items-center justify-center z-50" style={{ bottom: '0', left: '0', right: '0', height: '65px', backgroundColor: redColor, clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 5% 100%)', paddingLeft: '15%', paddingRight: '5%' }}>
                <span className="text-white w-full font-normal" style={{ ...getTextStyle(responsaveis), fontFamily: 'Poppins', textAlign: 'center', lineHeight: '1.2' }}>{responsaveis}</span>
            </div>
        </>
    );
};


const COR_BADGE = {
    green:  { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
    blue:   { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
    red:    { bg: '#fee2e2', text: '#b91c1c', border: '#fca5a5' },
    yellow: { bg: '#fef9c3', text: '#a16207', border: '#fde047' },
    purple: { bg: '#f3e8ff', text: '#7e22ce', border: '#d8b4fe' },
};

const RespostaBadge = ({ resposta, opcoes }) => {
    if (!resposta) return <span style={{ color: '#9ca3af' }}>—</span>;
    const op = (opcoes || []).find(o => o.texto === resposta);
    const style = op?.cor ? COR_BADGE[op.cor] : null;
    if (!style) return <span>{resposta}</span>;
    return (
        <span style={{
            display: 'inline-block',
            padding: '2px 8px',
            borderRadius: '9999px',
            fontSize: '11px',
            fontWeight: 600,
            backgroundColor: style.bg,
            color: style.text,
            border: `1px solid ${style.border}`,
            whiteSpace: 'nowrap',
        }}>{resposta}</span>
    );
};

const SecaoVistoria = ({ secao }) => {
    const isSignatureSection = secao.nome_secao === 'ASSINATURAS';
    if (isSignatureSection) {
        return (
            <div className="mb-8">
                <h2 className="text-lg font-bold mb-2 bg-blue-900 text-white p-2 rounded">{secao.nome_secao}</h2>
                <div style={{ display: 'flex', gap: '24px', marginTop: '16px' }}>
                    {secao.perguntas.map((p, idx) => (
                        <div key={idx} style={{ flex: 1, textAlign: 'center' }}>
                            <div style={{ borderBottom: '1px solid black', height: '60px', marginBottom: '6px' }}></div>
                            <span style={{ fontSize: '11px' }}>{p.pergunta}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="mb-8">
            <h2 className="text-lg font-bold mb-2 bg-blue-900 text-white p-2 rounded">{secao.nome_secao}</h2>
            <table className="w-full border-collapse text-xs table-fixed mb-2">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-black p-2 text-left" style={{ width: '50%' }}>Item</th>
                        <th className="border border-black p-2 text-center" style={{ width: '18%' }}>Resposta</th>
                        <th className="border border-black p-2 text-center" style={{ width: '12%' }}>Foto</th>
                        <th className="border border-black p-2 text-left" style={{ width: '20%' }}>Observação</th>
                    </tr>
                </thead>
                <tbody>
                    {secao.perguntas.map((p, idx) => (
                        <tr key={idx}>
                            <td className="border border-black p-2">{p.pergunta || '—'}</td>
                            <td className="border border-black p-2 text-center">
                                <RespostaBadge resposta={p.resposta} opcoes={p.opcoes} />
                            </td>
                            <td className="border border-black p-2 text-center">
                                {p.foto
                                    ? <img src={p.foto} alt="" style={{ maxWidth: '80px', maxHeight: '60px', objectFit: 'cover', margin: '0 auto', borderRadius: '4px' }} />
                                    : <span style={{ color: '#d1d5db' }}>—</span>
                                }
                            </td>
                            <td className="border border-black p-2">{p.observacao || '—'}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const ReportContent = ({ relatorio, empreendimento, navigate }) => {
    return (
        <div className="bg-gray-200 print:bg-white min-h-screen font-sans">
            <div className="no-print shadow-sm border-b p-4 mb-4 bg-white">
                <div className="flex justify-between items-center max-w-4xl mx-auto">
                    <Button onClick={() => navigate(-1)} variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
                    <h1 className="text-xl font-semibold text-gray-800">Visualizar Vistoria de Obra Padrão</h1>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => navigate(createPageUrl(`EditarVistoriadeObra?relatorioId=${relatorio.id}`))}
                        >
                            <Pencil className="w-4 h-4 mr-2" />Editar
                        </Button>
                        <Button onClick={() => window.print()} className="bg-green-600 hover:bg-green-700 text-white">
                            <Printer className="w-4 h-4 mr-2" />Gerar PDF
                        </Button>
                    </div>
                </div>
            </div>
            <div className="report-container max-w-4xl mx-auto" style={{ padding: 0 }}>
                {/* Capa */}
                <div className="report-page" style={{ height: '297mm', overflow: 'hidden' }}>
                    <CoverPage relatorio={relatorio} empreendimento={empreendimento} />
                </div>
                {/* Seções do relatório */}
                <div className="bg-white p-8">
                    {(relatorio.secoes || []).map((secao, idx) => (
                        <SecaoVistoria key={idx} secao={secao} />
                    ))}
                </div>
                {/* Observações Gerais */}
                {relatorio.observacoes_gerais && (
                    <div className="bg-white p-8 mt-4">
                        <h2 className="text-lg font-bold mb-2 bg-blue-900 text-white p-2 rounded">Observações Gerais</h2>
                        <div className="border border-black p-4 text-sm whitespace-pre-wrap min-h-[100px]">{relatorio.observacoes_gerais}</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default function VisualizarInspecaoVistoriaObraPadrao() {
    const navigate = useNavigate();
    const location = useLocation();
    const relatorioId = new URLSearchParams(location.search).get('relatorioId');

    const [relatorio, setRelatorio] = useState(null);
    const [empreendimento, setEmpreendimento] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isValidId(relatorioId)) {
            setError("ID do relatório é inválido ou não foi fornecido.");
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                const relatorioData = await InspecaoVistoriaObraPadrao.get(relatorioId);
                if (!relatorioData) throw new Error('Relatório não encontrado');
                const empreendimentoData = await Empreendimento.get(relatorioData.id_empreendimento);
                if (!empreendimentoData) throw new Error('Empreendimento não encontrado');
                const compressedRelatorio = await compressReportImages(relatorioData);
                setRelatorio(compressedRelatorio);
                setEmpreendimento(empreendimentoData);
            } catch (err) {
                setError(err.message || 'Erro ao carregar relatório');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [relatorioId]);

    if (loading) {
        return <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100"><Loader2 className="h-12 w-12 animate-spin text-blue-600" /><p className="mt-4 text-gray-600">Carregando relatório...</p></div>;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-4">
                <div className="bg-white p-8 rounded-lg shadow-md text-center">
                    <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-red-700 mb-2">Erro ao carregar relatório</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <Button onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
                </div>
            </div>
        );
    }

    return <ReportContent relatorio={relatorio} empreendimento={empreendimento} navigate={navigate} />;
}
