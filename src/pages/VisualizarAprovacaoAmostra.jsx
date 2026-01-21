
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AprovacaoAmostra } from '@/api/entities';
import { Empreendimento } from '@/api/entities';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Printer, AlertTriangle, CheckSquare, Square } from 'lucide-react';

const redColor = '#CE2D2D';

// Funções e componentes reutilizados de VisualizarDiarioObra
const isValidId = (id) => id && typeof id === 'string' && id.length > 0;

// Normaliza qualquer estrutura de fotos em um array [{url, legenda}]
const normalizePhotos = (input) => {
    if (!input) return [];
    let arr = [];
    if (Array.isArray(input)) {
        arr = input;
    } else if (typeof input === 'object') {
        try { arr = Object.values(input); } catch { arr = []; }
    } else {
        return [];
    }

    return arr
        .map((p) => {
            if (!p) return null;
            if (typeof p === 'string') return { url: p, legenda: '' };
            if (p.url) return { url: p.url, legenda: p.legenda || p.caption || '' };
            if (p.foto_url) return { url: p.foto_url, legenda: p.legenda || '' };
            if (p.image) return { url: p.image, legenda: p.caption || '' };
            return null;
        })
        .filter(Boolean)
        .filter((p) => typeof p.url === 'string' && p.url.length > 0);
};

// Normaliza coleções possivelmente como objeto em array seguro
const toArraySafe = (input) => {
    if (!input) return [];
    if (Array.isArray(input)) return input;
    if (typeof input === 'object') {
        try { return Object.values(input); } catch { return []; }
    }
    return [];
};

const useCompressedImage = (url, maxWidth = 800, quality = 0.3) => {
    const [compressedUrl, setCompressedUrl] = useState(url);
    useEffect(() => {
        if (url && typeof url === 'string' && url.startsWith('http') && !url.startsWith('data:image')) {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                let width = img.width, height = img.height;
                if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
                canvas.width = width; canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                setCompressedUrl(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = () => setCompressedUrl(url);
            img.src = url;
        } else {
            setCompressedUrl(url);
        }
    }, [url, maxWidth, quality]);
    return compressedUrl;
};

const ReportPage = ({ children, pageNumber, totalPages, relatorio, empreendimento, pdfMode }) => {
    const logoHorizontalOriginalUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/4bd521d1e_LOGOHORIZONTAl.png";
    const logoHorizontalCompressed = useCompressedImage(logoHorizontalOriginalUrl, 400, 0.7);
    const HEADER_HEIGHT = '80px';
    const FOOTER_HEIGHT = '45px';

    return (
        <div className={`report-page w-full relative bg-white ${pdfMode ? 'pdf-mode' : ''}`}>
            {pageNumber > 1 && (
                <div className="flex justify-between items-center p-4 border-b border-gray-200" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_HEIGHT }}>
                    <img src={logoHorizontalCompressed} alt="Logo Interativa Engenharia" className="h-12" />
                    <div className="text-right">
                        <h2 className="text-sm font-bold text-gray-800 uppercase">APROVAÇÃO DE AMOSTRAS</h2>
                        <p className="text-xs text-gray-600">{empreendimento?.nome_empreendimento} - {relatorio?.cliente}</p>
                        <p className="text-xs font-medium text-gray-800 mt-1">{relatorio?.data_relatorio ? format(new Date(relatorio.data_relatorio), 'dd/MM/yyyy', { locale: ptBR }) : ''}</p>
                    </div>
                </div>
            )}
            <div className="overflow-hidden" style={{ paddingTop: pageNumber > 1 ? HEADER_HEIGHT : '0px', paddingBottom: FOOTER_HEIGHT }}>
                {children}
            </div>
            <div className="px-3 py-1 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-xs text-gray-500" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: FOOTER_HEIGHT }}>
                <div className="flex-1 text-left"><span className="font-medium">Arquivo:</span><br /><span>{relatorio?.nome_arquivo || `AA-${relatorio.id?.slice(-4)}.pdf`}</span></div>
                <div className="flex-1 flex flex-col items-center"><span>INTERATIVA ENGENHARIA</span><span>www.interativaengenharia.com.br</span></div>
                <div className="flex-1 text-right"><span>Página {pageNumber} de {totalPages}</span></div>
            </div>
        </div>
    );
};

const CoverPage = ({ relatorio, empreendimento }) => {
    const year = new Date(relatorio?.data_relatorio || Date.now()).getFullYear();
    const coverFrameOriginalUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/dca667b3d_erasebg-transformed.png";
    const redDecorativeElementUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/513d57969_Designsemnome2.png';
    const bottomRightFrameUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/10e9b2570_erasebg-transformed.png';
    const empreendimentoImageUrl = empreendimento?.foto_empreendimento || 'https://images.unsplash.com/photo-1519947486511-46149fa0a254?w=800&q=80';
    const logoInterativaUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/1a0999f3c_logo_Interativa_letra_branca_sem_fundo_gg.png";
    const logoInterativaBrancoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/22086ec44_LOGOPNG-branco.png";

    const responsaveis = empreendimento?.texto_capa_rodape || empreendimento?.nome_empreendimento || '';

    const getTextStyle = (text) => {
        const len = text ? text.length : 0;
        if (len <= 25) return { fontSize: '32px', letterSpacing: '1px', fontWeight: 'normal' };
        if (len <= 40) return { fontSize: '26px', letterSpacing: '0.8px', fontWeight: 'normal' };
        return { fontSize: '20px', letterSpacing: '0.5px', fontWeight: 'normal' };
    };
    const textStyle = getTextStyle(responsaveis);

    return (
        <div className="report-page relative w-full h-full bg-white font-sans overflow-hidden" style={{ margin: 0, padding: 5 }}>
            <div className="absolute w-full h-full bg-center bg-no-repeat z-10 cover-background-image" style={{ backgroundImage: `url(${empreendimentoImageUrl})`, backgroundSize: 'cover', opacity: 0.2, top: '-10px', left: '-10px', width: 'calc(100% + 20px)', height: 'calc(100% + 20px)' }} />
            <div className="absolute top-0 left-0 w-full h-full bg-contain bg-left-top bg-no-repeat z-20" style={{ backgroundImage: `url(${coverFrameOriginalUrl})`, height: '150%' }} />
            <div className="absolute z-50" style={{ top: '25px', left: '11px', width: '350px', height: '170px' }}>
                <img src={logoInterativaUrl} alt="Logo Interativa" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} />
            </div>
            <div className="absolute flex items-center justify-center z-40" style={{ top: '23%', left: '11%', width: '22.7%', height: '25%', transform: 'rotate(27deg)' }}>
                <span className="font-normal" style={{ fontSize: '60px', fontFamily: "'Inter', sans-serif", textShadow: '2px 2px 4px rgba(0,0,0,0.2)', color: 'white' }}>{year}</span>
            </div>
            <div className="absolute z-30" style={{ top: '10%', right: '8%', width: '50%', textAlign: 'right' }}>
                <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: '64px', fontWeight: 'bold', color: '#394557', lineHeight: '1.1', marginBottom: '4px' }}>RELATÓRIO</h1>
                <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: '29.5px', color: redColor, letterSpacing: '4px' }}>APROVAÇÃO DE AMOSTRAS</h2>
            </div>
            <div className="absolute z-30" style={{ top: '50%', right: '-3%', width: '45%', padding: '1.3% 2.5%', textAlign: 'center' }}>
                <h1 className="font-black uppercase" style={{ fontSize: '28px', lineHeight: '1.0', fontFamily: "'Inter', sans-serif", marginBottom: '6px', color: 'black' }}>Gerenciamento</h1>
            </div>
            <div className="absolute z-20" style={{ top: '-350px', right: '-30%', width: '1700px', height: '1150px', backgroundColor: redColor, WebkitMaskImage: `url(${redDecorativeElementUrl})`, maskImage: `url(${redDecorativeElementUrl})`, WebkitMaskSize: '100% 100%', maskSize: '100% 100%', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center' }} />
            <div className="absolute z-50" style={{ top: '-10%', right: '-20%', width: '1800px', height: '800px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={logoInterativaBrancoUrl} alt="Logo Interativa" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div className="absolute right-0 w-full h-full bg-no-repeat z-40" style={{ bottom: '-5%', backgroundImage: `url('${bottomRightFrameUrl}')`, height: '1000%', backgroundSize: '230% auto', backgroundPosition: '65% 100%' }} />
            <div className="absolute z-10" style={{ bottom: '0%', left: '0%', width: '450px', height: '800px', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', clipPath: 'polygon(0 0%, 100% 23%, 100% 100%, 0% 100%)' }}>
                <img src={empreendimentoImageUrl} alt={empreendimento?.nome_empreendimento || 'Foto do empreendimento'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div className="absolute flex items-center justify-center z-50" style={{ bottom: '0', left: '0', right: '0', height: '65px', backgroundColor: redColor, clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 5% 100%)', paddingLeft: '15%', paddingRight: '5%' }}>
                <span className="text-white w-full" style={{ ...textStyle, fontFamily: 'Poppins', textAlign: 'center', lineHeight: '1.2' }}>{responsaveis}</span>
            </div>
        </div>
    );
};

const AmostraContentPage = ({ relatorio, photos }) => {
    return (
        <div className="p-8 text-sm bg-white h-full">
            <div className="border-t border-l grid grid-cols-4">
                <div className="border-b border-r p-2 col-span-2"><p className="text-xs font-bold text-gray-600">Cliente</p><p>{relatorio?.cliente}</p></div>
                <div className="border-b border-r p-2"><p className="text-xs font-bold text-gray-600">Disciplina</p><p>{relatorio?.disciplina}</p></div>
                <div className="border-b border-r p-2"><p className="text-xs font-bold text-gray-600">Data</p><p>{relatorio?.data_relatorio ? format(new Date(relatorio.data_relatorio), 'dd/MM/yyyy') : ''}</p></div>
                <div className="border-b border-r p-2 col-span-2"><p className="text-xs font-bold text-gray-600">Local</p><p>{relatorio?.local}</p></div>
                <div className="border-b border-r p-2 col-span-2"><p className="text-xs font-bold text-gray-600">Assunto da Amostra</p><p>{relatorio?.assunto_amostra}</p></div>
                <div className="border-b border-r p-2"><p className="text-xs font-bold text-gray-600">Solicitante</p><p>{relatorio?.solicitante}</p></div>
                <div className="border-b border-r p-2 col-span-3"><p className="text-xs font-bold text-gray-600">Obra</p><p>{relatorio?.obra}</p></div>
            </div>
            <div className="border-l border-r border-b p-2 min-h-[100px]"><p className="text-xs font-bold text-gray-600">Descrição da Amostra</p><p>{relatorio?.descricao_amostra}</p></div>

            {photos && photos.length > 0 && (
                <div className="mt-8">
                    <h2 className="text-lg font-bold mb-4 text-center">Fotos</h2>
                    <div className="grid grid-cols-2 gap-4">
                        {(photos).map((foto, index) => (
                            <div key={index} className="text-center break-inside-avoid">
                                <img src={foto.url} alt={foto.legenda || `Foto ${index + 1}`} className="w-full h-auto object-contain border max-h-64" />
                                {foto.legenda && <p className="text-center text-xs mt-1">{foto.legenda}</p>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const PhotoPage = ({ photos }) => (
    // Removed h-full to allow combination with other components on the same page if needed
    <div className="p-8 text-sm bg-white">
        <h2 className="text-lg font-bold mb-4 text-center">Fotos</h2>
        <div className="grid grid-cols-2 gap-4">
            {(photos || []).map((foto, index) => (
                <div key={index} className="text-center break-inside-avoid">
                    <img src={foto.url} alt={foto.legenda || `Foto ${index + 1}`} className="w-full h-auto object-contain border max-h-64" />
                    {foto.legenda && <p className="text-center text-xs mt-1">{foto.legenda}</p>}
                </div>
            ))}
        </div>
    </div>
);

const AprovacaoPage = ({ relatorio }) => {
    const status = relatorio?.status || 'Pendente';
    const aprovacoes = toArraySafe(relatorio?.aprovacoes);
    return (
        // Removed h-full to allow combination with other components on the same page if needed
        // Added break-inside-avoid as requested in the outline
        <div className="p-8 text-sm bg-white break-inside-avoid">
            <div className="flex items-stretch border-t border-l">
                <div className="flex-1 p-2 border-b border-r">
                    <div className="flex flex-col space-y-2">
                        <div className="flex items-center gap-2">{status === 'Aprovado' ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />} Aprovado</div>
                        <div className="flex items-center gap-2">{status === 'Aprovado com Comentários' ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />} Aprovado com Comentários</div>
                        <div className="flex items-center gap-2">{status === 'Reprovado' ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />} Reprovado</div>
                    </div>
                </div>
                <div className="flex-1 p-2 border-b border-r"><p className="text-xs font-bold text-gray-600">Comentários</p><p>{relatorio?.comentarios_status}</p></div>
            </div>
            <div className="mt-8 border-t pt-4 flex-grow"><h2 className="text-center font-bold mb-2">APROVAÇÕES</h2>
                <div className="grid grid-cols-3 gap-[-1px]">
                    {aprovacoes.slice(0, 3).map((aprov, index) => (
                        <div key={index} className="border p-2 flex flex-col justify-between min-h-[120px]">
                            <p className="text-center font-bold text-sm">{aprov.parte}</p>
                            <div className="flex-grow"></div>
                            <p className="border-t text-center text-sm pt-1 mt-2">Nome / Assinatura</p>
                            <p className="text-center text-sm h-6">{aprov.nome_assinatura}</p>
                        </div>
                    ))}
                    {[...Array(Math.max(0, 3 - aprovacoes.length))].map((_, i) => (
                        <div key={`empty-${i}`} className="border p-2 flex flex-col justify-between min-h-[120px]">
                            <p className="text-center font-bold text-sm h-6"></p>
                            <div className="flex-grow"></div>
                            <p className="border-t text-center text-sm pt-1 mt-2">Nome / Assinatura</p>
                            <p className="text-center text-sm h-6"></p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const paginateAmostraContent = (relatorio, empreendimento) => {
    const pages = [];
    pages.push({ content: <CoverPage relatorio={relatorio} empreendimento={empreendimento} /> });

    const allPhotos = normalizePhotos(relatorio?.fotos);
    const photosOnFirstPageCount = 4; // Changed from 2 to 4
    const photosOnSubsequentPagesCount = 4; // Changed from 6 to 4

    const firstPagePhotos = allPhotos.slice(0, photosOnFirstPageCount);
    const remainingPhotos = allPhotos.slice(photosOnFirstPageCount);

    pages.push({ content: <AmostraContentPage relatorio={relatorio} photos={firstPagePhotos} /> });

    // Se não houver mais fotos, a página de aprovação vem logo em seguida
    if (remainingPhotos.length === 0) {
        pages.push({ content: <AprovacaoPage relatorio={relatorio} /> });
        return pages;
    }

    // Separa as fotos restantes em blocos
    const photoChunks = [];
    for (let i = 0; i < remainingPhotos.length; i += photosOnSubsequentPagesCount) {
        photoChunks.push(remainingPhotos.slice(i, i + photosOnSubsequentPagesCount));
    }

    // Combina o último bloco de fotos com a página de aprovação
    const lastPhotoChunk = photoChunks.pop();

    // Renderiza as páginas de fotos intermediárias
    for (const chunk of photoChunks) {
        pages.push({ content: <PhotoPage photos={chunk} /> });
    }

    // Cria um componente para a página final que agrupa o último bloco de fotos e a aprovação
    const FinalPageContent = ({ photos, relatorioData }) => (
        <>
            {photos && photos.length > 0 && <PhotoPage photos={photos} />}
            <AprovacaoPage relatorio={relatorioData} />
        </>
    );

    // Adiciona a página final
    pages.push({ content: <FinalPageContent photos={lastPhotoChunk} relatorioData={relatorio} /> });

    return pages;
};

const ReportContent = ({ relatorio, empreendimento, navigate }) => {
    const [isPrintingMode, setIsPrintingMode] = useState(false);

    const paginatedPages = useMemo(() => {
        return paginateAmostraContent(relatorio, empreendimento);
    }, [relatorio, empreendimento]);

    const handlePrint = async () => {
        setIsPrintingMode(true);
        await new Promise(resolve => setTimeout(resolve, 50));
        window.print();
        setTimeout(() => setIsPrintingMode(false), 2000);
    };

    return (
        <div className="bg-gray-200 print:bg-white min-h-screen font-sans">
            <div className="no-print shadow-sm border-b p-4 mb-4 bg-white">
                <div className="flex justify-between items-center max-w-4xl mx-auto">
                    <Button onClick={() => navigate(-1)} variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
                    <h1 className="text-xl font-semibold text-gray-800">Aprovação de Amostra</h1>
                    <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700 text-white"><Printer className="w-4 h-4 mr-2" />Gerar PDF</Button>
                </div>
            </div>
            <div className="report-container max-w-4xl mx-auto" style={{ padding: 0 }}>
                {paginatedPages.map((page, index) => (
                    <ReportPage
                        key={`page-${index}`}
                        pageNumber={index + 1}
                        totalPages={paginatedPages.length}
                        relatorio={relatorio}
                        empreendimento={empreendimento}
                        pdfMode={isPrintingMode}
                    >
                        {React.cloneElement(page.content, { pdfMode: isPrintingMode })}
                    </ReportPage>
                ))}
            </div>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@700&family=Poppins:wght@100;200;300;400;500;600;700;800;900&display=swap');
                .cover-background-image { background-position: center 15% !important; }
                @media print {
                  .no-print { display: none !important; }
                  .report-page { page-break-after: always; width: 210mm; height: 297mm; margin: 0; padding: 0; page-break-inside: avoid; overflow: hidden; box-shadow: none; }
                  .report-page:last-child { page-break-after: auto; }
                  html, body { margin: 0; padding: 0; background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; font-family: 'Poppins', 'Inter', sans-serif; }
                  @page { size: A4; margin: 0; }
                }
                @media screen {
                  .report-page { width: 210mm; height: 297mm; margin: 20px auto; padding: 0; box-shadow: 0 0 10px rgba(0,0,0,0.1); background: white; position: relative; overflow: hidden; }
                  .report-page:first-child { margin: 0 auto 20px auto; }
                }
            `}</style>
        </div>
    );
};

export default function VisualizarAprovacaoAmostra() {
    const navigate = useNavigate();
    const location = useLocation();
    const urlParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const relatorioId = urlParams.get('relatorioId');

    const [relatorio, setRelatorio] = useState(null);
    const [empreendimento, setEmpreendimento] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Forçar light color-scheme para relatórios
        const originalColorScheme = document.documentElement.style.colorScheme;
        document.documentElement.style.colorScheme = 'light';

        let metaColorScheme = document.querySelector('meta[name="color-scheme"]');
        let metaWasCreated = false;
        if (!metaColorScheme) {
            metaColorScheme = document.createElement('meta');
            metaColorScheme.name = 'color-scheme';
            document.head.appendChild(metaColorScheme);
            metaWasCreated = true;
        }
        const originalMetaContent = metaColorScheme.content;
        metaColorScheme.content = 'light only';

        return () => {
            document.documentElement.style.colorScheme = originalColorScheme;
            if (metaWasCreated && metaColorScheme.parentNode) {
                metaColorScheme.parentNode.removeChild(metaColorScheme);
            } else if (metaColorScheme) {
                metaColorScheme.content = originalMetaContent;
            }
        };
    }, []);

    useEffect(() => {
        const loadData = async () => {
            if (!isValidId(relatorioId)) {
                setError("ID do relatório é inválido.");
                setLoading(false);
                return;
            }
            try {
                const relatorioData = await AprovacaoAmostra.get(relatorioId);
                if (!relatorioData) throw new Error("Relatório não encontrado.");
                setRelatorio(relatorioData);

                if (isValidId(relatorioData.id_empreendimento)) {
                    const empreendimentoData = await Empreendimento.get(relatorioData.id_empreendimento);
                    setEmpreendimento(empreendimentoData);
                }
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [relatorioId]);

    if (loading) return <div className="flex flex-col items-center justify-center min-h-screen"><Loader2 className="h-12 w-12 animate-spin mb-4" /><p>Carregando relatório...</p></div>;
    if (error) return <div className="flex flex-col items-center justify-center min-h-screen"><AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" /><h2 className="text-xl font-bold text-red-600">Erro</h2><p className="text-gray-700">{error}</p><Button onClick={() => navigate(-1)} className="mt-4">Voltar</Button></div>;
    if (!relatorio || !empreendimento) return <div className="flex flex-col items-center justify-center min-h-screen"><AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" /><h2 className="text-xl font-bold">Dados Incompletos</h2><p>Não foi possível carregar todas as informações do relatório.</p><Button onClick={() => navigate(-1)} className="mt-4">Voltar</Button></div>;

    return <ReportContent relatorio={relatorio} empreendimento={empreendimento} navigate={navigate} />;
}
