import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { InspecaoSprinklers } from '@/api/entities';
import { Empreendimento } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, ArrowLeft, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AssinaturasPage } from '@/components/relatorios/AssinaturasSection';

const isValidId = (id) => id && typeof id === 'string' && id.length > 0;

const compressImage = (url, maxWidth = 800, quality = 0.7) => {
    return new Promise((resolve) => {
        if (!url || typeof url !== 'string' || url.startsWith('data:image')) {
            resolve(url);
            return;
        }
        // Skip compression for base44.app/api URLs due to CORS restrictions
        if (url.includes('base44.app/api')) {
            resolve(url);
            return;
        }
        const img = new Image();
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

const CoverPage = ({ relatorio, empreendimento }) => {
    const year = new Date(relatorio?.data_inspecao || Date.now()).getFullYear();
    const redColor = '#CE2D2D';
    const empreendimentoImageUrl = useCompressedImage(empreendimento?.foto_empreendimento || 'https://images.unsplash.com/photo-1519947486511-46149fa0a254?w=800&q=80', 800, 0.7);
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
                <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: '26px', color: redColor, letterSpacing: '2px' }}>INSPEÇÃO DE SPRINKLERS</h2>
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

const DocumentacaoPage = ({ itens }) => {
    return (
        <div className="px-4 pt-4 pb-2">
            <h2 className="text-xl font-bold text-center mb-4 bg-blue-900 text-white p-2">Documentação Técnica</h2>
            <table className="w-full border-collapse text-xs table-fixed">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-black p-2 text-left" style={{ width: '40%' }}>Descrição</th>
                        <th className="border border-black p-2 text-center" style={{ width: '8%' }}>Recebido</th>
                        <th className="border border-black p-2 text-left" style={{ width: '52%' }}>Observações</th>
                    </tr>
                </thead>
                <tbody>
                    {itens.map((item, idx) => (
                        <tr key={`${item?.descricao || 'doc'}-${idx}`}>
                            <td className="border border-black p-2" style={{ width: '40%', wordWrap: 'break-word', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{item.descricao}</td>
                            <td className="border border-black p-2 text-center" style={{ width: '8%' }}>{item.resultado === 'OK' ? '☑' : '☐'}</td>
                            <td className="border border-black p-2" style={{ width: '52%', wordWrap: 'break-word', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{item.observacoes}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const FotoInspecao = ({ url, legenda }) => {
    const compressedUrl = useCompressedImage(url, 600, 0.6);
    return (
        <div className="text-center">
            <img src={compressedUrl} alt={legenda || 'Foto da inspeção'} style={{ width: '100%', height: 'auto', objectFit: 'contain', border: '1px solid #ddd' }} />
            {legenda && (
                <p className="text-[9px] text-gray-600 mt-1">{legenda}</p>
            )}
        </div>
    );
};

const ContentPage = ({ local, items, isFirstPageOfLocal, combineWithDoc }) => {
    return (
        <div className={combineWithDoc ? "px-4 pb-4" : (isFirstPageOfLocal ? "p-4" : "px-4 pt-6 pb-4")}>
            {items && items.length > 0 && (
                <div>
                    <h3 className="text-lg font-bold mb-2 bg-blue-900 text-white p-2 text-center">Inspeção Física - Sprinklers</h3>
                    <div className="mb-4 border border-black">
                        <div className="p-2">
                            <span className="font-bold">Local: </span>{local.nome_local}
                        </div>
                    </div>
                    <p className="text-[9px] text-gray-600 italic mb-1">Tique se for OK ✓, NA - Não se aplica. Caso contrário, faça um comentário.</p>
                    <table className="w-full border-collapse text-xs table-fixed">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-black p-2 text-left" style={{ width: '40%' }}>Descrição</th>
                                <th className="border border-black p-2 text-center" style={{ width: '8%' }}>OK</th>
                                <th className="border border-black p-2 text-center" style={{ width: '8%' }}>NA</th>
                                <th className="border border-black p-2 text-left" style={{ width: '44%' }}>Observações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => {
                                const isComentario = item.tipo === 'comentario' || item.isComentarioGeral;

                                if (isComentario) {
                                    return (
                                        <tr key={idx} className="bg-gray-50" style={{ pageBreakInside: 'avoid', pageBreakAfter: 'auto' }}>
                                            <td className="border border-black p-2 font-bold" style={{ verticalAlign: 'top' }}>Comentários:</td>
                                            <td className="border border-black p-2" colSpan="3" style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'break-word', maxWidth: '500px' }}>{item.texto || item.comentarios || ''}</td>
                                        </tr>
                                    );
                                }

                                // Se for apenas fotos (continuação), não mostrar linha de descrição
                                if (item.showOnlyPhotos) {
                                    return (
                                        <tr key={idx}>
                                            <td colSpan="4" className="border border-black p-2 pt-4">
                                                <div className="text-xs text-gray-600 italic mb-2">{item.descricao}</div>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {item.fotos.map((foto, fotoIdx) => (
                                                        <FotoInspecao key={fotoIdx} url={foto.url} legenda={foto.legenda} />
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }

                                return (
                                    <>
                                        <tr key={idx} style={{ pageBreakInside: 'avoid', pageBreakAfter: 'auto' }}>
                                            <td className="border border-black p-2" style={{ width: '40%', wordWrap: 'break-word', wordBreak: 'break-word' }}>{item.descricao}</td>
                                            <td className="border border-black p-2 text-center" style={{ width: '8%' }}>{item.resultado === 'OK' ? '☑' : '☐'}</td>
                                            <td className="border border-black p-2 text-center" style={{ width: '8%' }}>{item.resultado === 'Não' ? '☑' : '☐'}</td>
                                            <td className="border border-black p-2" style={{ width: '44%', wordWrap: 'break-word', wordBreak: 'break-word' }}>{item.observacoes || ''}</td>
                                        </tr>
                                        {item.fotos && item.fotos.length > 0 && (
                                            <tr key={`fotos-${idx}`}>
                                                <td colSpan="4" className="border border-black p-2">
                                                    <div className="grid grid-cols-3 gap-2">
                                                        {item.fotos.map((foto, fotoIdx) => (
                                                            <FotoInspecao key={`${foto?.url || 'foto'}-${fotoIdx}`} url={foto.url} legenda={foto.legenda} />
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const ReportPageLayout = ({ children, pageNumber, totalPages, relatorio, empreendimento }) => {
    const logoHorizontalCompressed = useCompressedImage("https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/4bd521d1e_LOGOHORIZONTAl.png", 400, 0.7);
    const HEADER_HEIGHT = pageNumber > 1 ? '80px' : '0px';
    const FOOTER_HEIGHT = '45px';
    const isCover = pageNumber === 1;

    return (
        <div className="report-page">
            {!isCover && (
                <div className="flex justify-between items-center border-b border-gray-200 bg-white" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_HEIGHT, zIndex: 100, padding: '4px 8px', maxWidth: '210mm', boxSizing: 'border-box' }}>
                    <img src={logoHorizontalCompressed} alt="Logo Interativa Engenharia" style={{ height: '32px', maxWidth: '120px', objectFit: 'contain' }} />
                    <div className="text-right" style={{ flex: 1, paddingLeft: '8px', overflow: 'hidden' }}>
                        <h2 className="text-[10px] font-bold text-gray-800 uppercase leading-tight truncate">{relatorio?.titulo_relatorio || 'INSPEÇÃO DE SPRINKLERS'}</h2>
                        <p className="text-[9px] text-gray-600 leading-tight truncate">{empreendimento?.nome_empreendimento} - {relatorio?.cliente}</p>
                        <p className="text-[9px] font-medium text-gray-800 leading-tight">{relatorio?.data_inspecao ? format(new Date(relatorio.data_inspecao), 'dd/MM/yyyy', { locale: ptBR }) : ''}</p>
                    </div>
                </div>
            )}
            <div className="page-content" style={{ paddingTop: HEADER_HEIGHT, paddingBottom: FOOTER_HEIGHT, height: '100%', overflow: 'hidden' }}>
                {children}
            </div>
            <div className="border-t border-gray-200 bg-gray-50 flex justify-between items-center text-[9px] text-gray-500" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: FOOTER_HEIGHT, padding: '4px 8px', maxWidth: '210mm', boxSizing: 'border-box' }}>
                {relatorio.nome_arquivo ? (
                    <div className="flex-1 text-left leading-tight truncate" style={{ paddingRight: '8px' }}><span className="font-medium">Arquivo: </span><span>{relatorio.nome_arquivo}.pdf</span></div>
                ) : (
                    <div className="flex-1 text-left"></div>
                )}
                <div className="flex-1 flex flex-col items-center leading-tight text-[8px]"><span>INTERATIVA ENGENHARIA</span><span>www.interativaengenharia.com.br</span></div>
                <div className="flex-1 text-right leading-tight" style={{ paddingLeft: '8px' }}><span>Página {pageNumber} de {totalPages}</span></div>
            </div>
        </div>
    );
};

const ObservacoesGeraisPage = ({ observacoes }) => {
    return (
        <div className="p-4">
            <h2 className="text-xl font-bold text-center mb-4 bg-blue-900 text-white p-2">Observações Gerais</h2>
            <div className="border border-black p-4 text-sm whitespace-pre-wrap min-h-[100px]">{observacoes || ''}</div>
        </div>
    );
};

const ReportContent = ({ relatorio, empreendimento, navigate }) => {
    const [isPrintingMode, setIsPrintingMode] = useState(false);

    const hasDocumentacao = relatorio.itens_documentacao && relatorio.itens_documentacao.length > 0;

    // Função para paginar os itens de cada local de forma inteligente
    const paginateLocalItems = (local, maxItemsForFirstPage = 4) => {
        const pages = [];
        const maxItemsPerPage = 4;
        const MAX_FOTOS_PER_ITEM = 6;
        const allItems = [...(local.itens_inspecao || [])];

        // Adicionar comentários gerais do local ao final
        if (local.comentarios) {
            allItems.push({ tipo: 'comentario', comentarios: local.comentarios, isComentarioGeral: true });
        }

        let currentPage = [];
        let isFirstPage = true;

        allItems.forEach((item) => {
            const isComentario = item.tipo === 'comentario' || item.isComentarioGeral;

            // Se o item tem mais de 4 fotos, dividir em múltiplas partes
            if (!isComentario && item.fotos && item.fotos.length > MAX_FOTOS_PER_ITEM) {
                const fotosChunks = [];
                for (let i = 0; i < item.fotos.length; i += MAX_FOTOS_PER_ITEM) {
                    fotosChunks.push(item.fotos.slice(i, i + MAX_FOTOS_PER_ITEM));
                }

                // Primeiro chunk: item completo com primeiras 4 fotos
                const firstItemPart = {
                    ...item,
                    fotos: fotosChunks[0],
                    isPartial: fotosChunks.length > 1
                };

                // Calcular peso do primeiro chunk
                const fotoRows = Math.ceil(fotosChunks[0].length / 3);
                const itemWeight = 1 + (fotoRows * 2.5);

                const currentWeight = currentPage.reduce((acc, p) => {
                    const isC = p.tipo === 'comentario' || p.isComentarioGeral;
                    if (isC) return acc + 1;
                    if (p.fotos && p.fotos.length > 0) {
                        const fotoRows = Math.ceil(p.fotos.length / 3);
                        return acc + 1 + (fotoRows * 2.5);
                    }
                    return acc + 1;
                }, 0);

                const currentLimit = isFirstPage ? maxItemsForFirstPage : maxItemsPerPage;

                // Verificar se cabe na página atual
                if (currentPage.length > 0 && currentWeight + itemWeight > currentLimit) {
                    pages.push({
                        local: local,
                        items: currentPage,
                        isFirstPageOfLocal: isFirstPage
                    });
                    currentPage = [];
                    isFirstPage = false;
                }

                currentPage.push(firstItemPart);

                // Chunks restantes: apenas fotos (continuação do mesmo item)
                for (let i = 1; i < fotosChunks.length; i++) {
                    const continuationItem = {
                        ...item,
                        descricao: `(Continuação) ${item.descricao}`,
                        fotos: fotosChunks[i],
                        isContinuation: true,
                        showOnlyPhotos: true
                    };

                    // Sempre iniciar nova página para continuações
                    if (currentPage.length > 0) {
                        pages.push({
                            local: local,
                            items: currentPage,
                            isFirstPageOfLocal: isFirstPage
                        });
                        currentPage = [];
                        isFirstPage = false;
                    }

                    currentPage.push(continuationItem);
                }
            } else {
                // Item normal (sem fotos ou com até 4 fotos)
                let itemWeight = 1;
                if (isComentario) {
                    itemWeight = 1;
                } else if (item.fotos && item.fotos.length > 0) {
                    const fotoRows = Math.ceil(item.fotos.length / 3);
                    itemWeight = 1 + (fotoRows * 2.5);
                }

                const currentWeight = currentPage.reduce((acc, p) => {
                    const isC = p.tipo === 'comentario' || p.isComentarioGeral;
                    if (isC) return acc + 1;
                    if (p.fotos && p.fotos.length > 0) {
                        const fotoRows = Math.ceil(p.fotos.length / 3);
                        return acc + 1 + (fotoRows * 2.5);
                    }
                    return acc + 1;
                }, 0);

                const currentLimit = isFirstPage ? maxItemsForFirstPage : maxItemsPerPage;
                const pageHasContent = currentPage.length > 0;

                if (pageHasContent && currentWeight + itemWeight > currentLimit) {
                    pages.push({
                        local: local,
                        items: currentPage,
                        isFirstPageOfLocal: isFirstPage
                    });
                    currentPage = [];
                    isFirstPage = false;
                }

                currentPage.push(item);
            }
        });

        // Adicionar última página se houver itens restantes
        if (currentPage.length > 0) {
            pages.push({
                local: local,
                items: currentPage,
                isFirstPageOfLocal: isFirstPage
            });
        }

        return pages;
    };

    // Documentação sempre em página separada
    const combineDocWithContent = false;

    // Limite de itens para primeira página de conteúdo
    const firstPageItemLimit = 6;

    // Criar todas as páginas de conteúdo
    const contentPages = relatorio.locais.flatMap((local, index) =>
        // Apenas o primeiro local usa o limite reduzido se combinarmos com doc
        paginateLocalItems(local, index === 0 ? firstPageItemLimit : 14)
    );

    const hasAssinaturas = relatorio.assinaturas && relatorio.assinaturas.length > 0;
    const totalPages = 1 + (hasDocumentacao && !combineDocWithContent ? 1 : 0) + contentPages.length + 1 + (hasAssinaturas ? 1 : 0);
    let currentPage = 1;

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
                    <h1 className="text-xl font-semibold text-gray-800">Visualizar Inspeção de Sprinklers</h1>
                    <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700 text-white"><Printer className="w-4 h-4 mr-2" />Gerar PDF</Button>
                </div>
            </div>
            <div className="report-container max-w-4xl mx-auto" style={{ padding: 0 }}>
                <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                    <CoverPage relatorio={relatorio} empreendimento={empreendimento} />
                </ReportPageLayout>

                {hasDocumentacao && combineDocWithContent ? (
                    <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                        <DocumentacaoPage itens={relatorio.itens_documentacao} />
                        <ContentPage local={contentPages[0].local} items={contentPages[0].items} isFirstPageOfLocal={contentPages[0].isFirstPageOfLocal} combineWithDoc={true} />
                    </ReportPageLayout>
                ) : (
                    <>
                        {hasDocumentacao && (
                            <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                                <DocumentacaoPage itens={relatorio.itens_documentacao} />
                            </ReportPageLayout>
                        )}
                    </>
                )}

                {contentPages.map((page, index) => {
                    if (combineDocWithContent && index === 0) return null;
                    return (
                        <ReportPageLayout key={index} pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                            <ContentPage local={page.local} items={page.items} isFirstPageOfLocal={page.isFirstPageOfLocal} combineWithDoc={false} />
                        </ReportPageLayout>
                    );
                })}

                <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                    <ObservacoesGeraisPage observacoes={relatorio.observacoes_gerais} />
                </ReportPageLayout>

                {hasAssinaturas && (
                    <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                        <AssinaturasPage assinaturas={relatorio.assinaturas} />
                    </ReportPageLayout>
                )}
            </div>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@700&family=Poppins:wght@100;200;300;400;500;600;700;800;900&display=swap');
                
                * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    color-adjust: exact !important;
                }
                
                @page { size: A4 portrait; margin: 0; }
                
                .report-page { 
                    width: 210mm; 
                    height: 297mm; 
                    position: relative; 
                    background: white; 
                    overflow: hidden;
                }
                
                @media screen { 
                    .report-page { 
                        margin: 20px auto; 
                        box-shadow: 0 0 10px rgba(0,0,0,0.1);
                    } 
                }
                
                @media print {
                    * { 
                        -webkit-print-color-adjust: exact !important; 
                        print-color-adjust: exact !important; 
                        color-adjust: exact !important; 
                    }
                    
                    /* Hide navigation and scrollbars */
                    .no-print, aside, header, nav { display: none !important; }
                    
                    /* Hide scrollbars */
                    html, body, * { 
                        overflow: visible !important;
                        -ms-overflow-style: none !important;
                        scrollbar-width: none !important;
                    }
                    
                    *::-webkit-scrollbar { display: none !important; }
                    
                    /* Reset body and containers */
                    html, body { 
                        margin: 0 !important; 
                        padding: 0 !important; 
                        background: white !important; 
                        width: 210mm !important;
                        height: auto !important;
                    }
                    
                    body, body > div, main { 
                        padding: 0 !important; 
                        margin: 0 !important; 
                        width: 100% !important;
                    }
                    
                    .lg\\:pl-72 { padding-left: 0 !important; }
                    
                    .report-container { 
                        max-width: none !important; 
                        margin: 0 !important; 
                        padding: 0 !important; 
                        width: 210mm !important; 
                    }
                    
                    .report-page { 
                        page-break-after: always; 
                        page-break-inside: avoid;
                        width: 210mm !important; 
                        height: 297mm !important; 
                        margin: 0 !important; 
                        padding: 0 !important; 
                        box-shadow: none !important; 
                        overflow: hidden !important;
                    }
                    
                    .report-page:last-child { page-break-after: auto; }
                    
                    img { max-width: 100%; }
                    table { page-break-inside: auto; }
                    tr { page-break-inside: avoid; }
                }
                
                @media screen {
                    .report-page {
                        margin: 20px auto;
                        box-shadow: 0 0 10px rgba(0,0,0,0.1);
                    }
                }
            `}</style>
        </div>
    );
};

export default function VisualizarInspecaoSprinklers() {
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
                const relatorioData = await InspecaoSprinklers.get(relatorioId);
                if (!relatorioData) throw new Error("Relatório não encontrado.");

                const empreendimentoData = await Empreendimento.get(relatorioData.id_empreendimento);
                if (!empreendimentoData) throw new Error("Empreendimento associado não encontrado.");

                setRelatorio(relatorioData);
                setEmpreendimento(empreendimentoData);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [relatorioId]);

    useEffect(() => {
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