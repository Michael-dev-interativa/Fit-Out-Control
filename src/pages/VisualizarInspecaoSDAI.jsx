import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { InspecaoSDAI, Empreendimento } from '@/api/entities';
import { getUploadUrl } from '@/api/config';
import { compressReportImages } from '@/lib/compressReportImages';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, ArrowLeft, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AssinaturasPage } from '@/components/relatorios/AssinaturasSection';
import { paginateLocalItemsForPrinting } from '@/lib/reportPagination';

const isValidId = (id) => id && typeof id === 'string' && id.length > 0;

const isConclusaoMatching = (val, key) => {
    if (val === null || typeof val === 'undefined') return false;
    const s = String(val).normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
    if (!s) return false;

    if (key === 'totalidade') {
        return s === 'totalidade' || s.includes('totalidade') || s.includes('aprovado') || s === 'ok' || s === 'aprovado com totalidade';
    }
    if (key === 'ressalvas') {
        return s === 'ressalvas' || s.includes('ressalva');
    }
    if (key === 'reprovado') {
        return s === 'reprovado' || s.includes('reprovado');
    }
    return s === key;
};

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
    const empreendimentoImageUrl = useCompressedImage(getUploadUrl(empreendimento?.foto_empreendimento) || 'https://images.unsplash.com/photo-1519947486511-46149fa0a254?w=800&q=80', 800, 0.7);
    const logoInterativaUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/1a0999f3c_logo_Interativa_letra_branca_sem_fundo_gg.png";
    const coverFrameOriginalUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/dca667b3d_erasebg-transformed.png";
    const redDecorativeElementUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/513d57969_Designsemnome2.png';
    const bottomRightFrameUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/10e9b2570_erasebg-transformed.png';
    const logoInterativaBrancoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/22086ec44_LOGOPNG-branco.png";

    const defaultResponsaveis = [empreendimento?.cli_empreendimento, empreendimento?.nome_empreendimento].filter(Boolean).join(' | ');
    const responsaveis = relatorio?.texto_rodape_capa || empreendimento?.texto_capa_rodape || defaultResponsaveis;

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
                <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: '64px', fontWeight: 'bold', color: '#394557', lineHeight: '1.1', marginBottom: '4px' }}>{relatorio?.titulo_capa || 'RELATÓRIO'}</h1>
                <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: '24px', color: redColor, letterSpacing: '1.5px' }}>{relatorio?.subtitulo_capa || 'Gerenciamento de Obra'}</h2>
            </div>
            <div className="absolute z-30" style={{ top: '50%', right: '-3%', width: '45%', padding: '1.3% 2.5%', textAlign: 'center' }}>
                <h1 className="font-black uppercase" style={{ fontSize: '28px', lineHeight: '1.0', fontFamily: "'Inter', sans-serif", marginBottom: '6px', color: 'black' }}>{relatorio?.titulo_inspecao || 'INSPEÇÃO DE CENTRAL SDAI'}</h1>
                <h2 className="text-gray-600 font-medium" style={{ fontSize: '16px', fontFamily: "'Inter', sans-serif" }}>{relatorio?.descricao_inspecao || relatorio?.subtitulo_relatorio || ''}</h2>
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

const DocumentacaoPage = ({ itens, comentarios }) => {
    return (
        <div className="px-4 pt-4 pb-2">
            <h2 className="text-xl font-bold text-center mb-4 bg-blue-900 text-white p-2">Documentação Técnica</h2>
            <table className="w-full border-collapse text-xs table-fixed">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-black p-2 text-left" style={{ width: '40%' }}>Descrição</th>
                        <th className="border border-black p-2" style={{ width: '10%', textAlign: 'center' }}>Recebido</th>
                        <th className="border border-black p-2 text-left" style={{ width: '50%' }}>Observações</th>
                    </tr>
                </thead>
                <tbody>
                    {itens.map((item, idx) => (
                        <tr key={idx}>
                            <td className="border border-black p-2 text-left" style={{ width: '40%' }}>{item.descricao}</td>
                            <td className="border border-black p-2 text-center" style={{ width: '10%' }}>{item.resultado === 'OK' ? '☑' : '☐'}</td>
                            <td className="border border-black p-2 text-left" style={{ width: '50%' }}>{item.observacoes}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {comentarios && comentarios.trim() !== '' && (
                <div className="mt-4 p-3 bg-gray-50 border border-gray-300 rounded">
                    <p className="font-bold mb-1" style={{ fontSize: '12px' }}>Comentários:</p>
                    <p className="whitespace-pre-wrap" style={{ fontSize: '12px' }}>{comentarios}</p>
                </div>
            )}
        </div>
    );
};

const FotoInstalacao = ({ url, legenda }) => {
    // URL já vem comprimida pelo compressReportImages
    const imageUrl = getUploadUrl(url);

    return (
        <div style={{ textAlign: 'center', marginBottom: '6px', boxSizing: 'border-box' }}>
            <div
                style={{
                    width: '100%',
                    height: '45mm',
                    border: '1px solid #ddd',
                    backgroundColor: '#f9fafb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <img
                    src={imageUrl}
                    alt={legenda || 'Foto da instalação'}
                    style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        width: 'auto',
                        height: 'auto',
                        objectFit: 'contain',
                        display: 'block',
                    }}
                />
            </div>
            {legenda && (
                <p style={{ fontSize: '7px', color: '#555', marginTop: '4px', lineHeight: '1.1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{legenda}</p>
            )}
        </div>
    );
};

const CentraisInfoPage = ({ centrais }) => {
    return (
        <div className="px-4 pt-2 pb-2">
            {(centrais || []).map((central, idx) => (
                <div key={idx} className={idx > 0 ? "mt-4" : ""}>
                    <h3 className="text-sm font-bold text-center mb-0.5 bg-blue-900 text-white p-1">Dados de Equipamento - Central SDAI</h3>
                    <table className="w-full border-collapse text-xs mb-2" style={{ tableLayout: 'fixed' }}>
                        <tbody>
                            <tr>
                                <td className="border border-black p-1 text-xs font-bold bg-gray-100" style={{ width: '25%' }}>Tag:</td>
                                <td className="border border-black p-1 text-xs" style={{ width: '25%', wordWrap: 'break-word', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{central.tag || ''}</td>
                                <td className="border border-black p-1 text-xs font-bold bg-gray-100" style={{ width: '25%' }}>Localização:</td>
                                <td className="border border-black p-1 text-xs" style={{ width: '25%', wordWrap: 'break-word', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{central.localizacao || ''}</td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-xs font-bold bg-gray-100" colSpan="2">Fabr. e Modelo:</td>
                                <td className="border border-black p-1 text-xs" colSpan="2" style={{ wordWrap: 'break-word', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{central.fabricante_modelo || ''}</td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-xs font-bold bg-gray-100" colSpan="2">Módulos Instalados:</td>
                                <td className="border border-black p-1 text-xs" colSpan="2" style={{ wordWrap: 'break-word', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{central.modulos_instalados || ''}</td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-xs font-bold bg-gray-100" colSpan="2">Baterias Central:</td>
                                <td className="border border-black p-1 text-xs" colSpan="2" style={{ wordWrap: 'break-word', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{central.baterias_central || ''}</td>
                            </tr>
                            <tr>
                                <td className="border border-black p-1 text-xs font-bold bg-gray-100" colSpan="2">Fonte Auxiliar e baterias:</td>
                                <td className="border border-black p-1 text-xs" colSpan="2" style={{ wordWrap: 'break-word', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{central.fonte_auxiliar_baterias || ''}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            ))}
        </div>
    );
};

const ComentarioBlock = ({ texto, isNotFirstChunk }) => (
    <div className="comentario-block" style={{ pageBreakInside: 'auto', breakInside: 'auto' }}>
        {!isNotFirstChunk && <div className="border border-black px-2 py-1 font-bold text-xs bg-gray-100">Comentários:</div>}
        <div className={`border border-black ${!isNotFirstChunk ? 'border-t-0 ' : ''}px-2 py-1 text-xs whitespace-pre-wrap bg-gray-50`} style={{ wordWrap: 'break-word', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{texto}</div>
    </div>
);

const InstalacaoPage = ({ itens_instalacao, comentarios_instalacao, showHeader = true }) => {
    // Separar itens em grupos: itens normais/fotos formam blocos de tabela, comentários ficam fora
    const grupos = [];
    let currentTableItems = [];

    (itens_instalacao || []).forEach((item, idx) => {
        const isComentario = item.tipo === 'comentario' || item.isComentarioGeral;
        if (isComentario) {
            if (currentTableItems.length > 0) {
                grupos.push({ type: 'table', items: currentTableItems });
                currentTableItems = [];
            }
            grupos.push({ type: 'comentario', texto: item.texto || item.comentarios || '', key: idx, isNotFirstChunk: item.isNotFirstChunk });
        } else {
            currentTableItems.push({ ...item, key: idx });
        }
    });
    if (currentTableItems.length > 0) {
        grupos.push({ type: 'table', items: currentTableItems });
    }

    const renderTableItems = (items, showTableHeader) => (
        <table className="w-full border-collapse text-xs mb-0" style={{ tableLayout: 'fixed' }}>
            {showTableHeader && (
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-black p-1 text-left" style={{ width: '46%' }}>Item de verificação</th>
                        <th className="border border-black p-1 text-center" style={{ width: '7%' }}>Ok</th>
                        <th className="border border-black p-1 text-center" style={{ width: '7%' }}>N.A.</th>
                        <th className="border border-black p-1 text-center" style={{ width: '7%' }}>N/OK</th>
                        <th className="border border-black p-1 text-left" style={{ width: '33%' }}>Comentário</th>
                    </tr>
                </thead>
            )}
            <tbody>
                {items.map((item, idx) => {
                    if (item.showOnlyPhotos) {
                        return (
                            <tr key={item.key ?? idx}>
                                <td colSpan="5" className="border border-black p-1 pt-3">
                                    <div className="text-xs text-gray-600 italic mb-2">{item.descricao}</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min((item.fotos || []).length || 1, 3)}, 1fr)`, gap: '4px', maxWidth: '100%', alignItems: 'stretch' }}>
                                        {(item.fotos || []).map((foto, fotoIdx) => (
                                            <FotoInstalacao key={fotoIdx} url={foto.url} legenda={foto.legenda} />
                                        ))}
                                    </div>
                                </td>
                            </tr>
                        );
                    }
                    return (
                        <React.Fragment key={item.key ?? idx}>
                            <tr>
                                <td className="border border-black p-1" style={{ wordWrap: 'break-word', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{item.item_verificacao || item.descricao}</td>
                                <td className="border border-black p-1 text-center">{item.resultado === 'OK' ? '☑' : '☐'}</td>
                                <td className="border border-black p-1 text-center">{item.resultado === 'NA' ? '☑' : '☐'}</td>
                                <td className="border border-black p-1 text-center">{item.resultado === 'N/OK' ? '☑' : '☐'}</td>
                                <td className="border border-black p-1" style={{ wordWrap: 'break-word', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{item.comentario || item.observacoes || ''}</td>
                            </tr>
                            {item.fotos && item.fotos.length > 0 && (
                                <tr>
                                    <td colSpan="5" className="border border-black p-1">
                                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(item.fotos.length, 3)}, 1fr)`, gap: '4px', maxWidth: '100%', alignItems: 'stretch' }}>
                                            {item.fotos.map((foto, fotoIdx) => (
                                                <FotoInstalacao key={fotoIdx} url={foto.url} legenda={foto.legenda} />
                                            ))}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </React.Fragment>
                    );
                })}
            </tbody>
        </table>
    );

    let firstTableRendered = false;

    return (
        <div className="px-4 pt-2 pb-2">
            {showHeader && (
                <>
                    <h3 className="text-base font-bold text-center mb-1 bg-blue-900 text-white p-1">Instalação</h3>
                    <p className="text-[9px] text-gray-600 italic mb-1">Tique se for OK ✓, NA - Não se aplica. Caso contrário, faça um comentário.</p>
                </>
            )}
            {grupos.map((grupo, gIdx) => {
                if (grupo.type === 'table') {
                    const showHead = !firstTableRendered || gIdx === 0;
                    firstTableRendered = true;
                    return <div key={gIdx} className="mb-0">{renderTableItems(grupo.items, true)}</div>;
                }
                return <ComentarioBlock key={grupo.key} texto={grupo.texto} isNotFirstChunk={grupo.isNotFirstChunk} />;
            })}
            {comentarios_instalacao && <ComentarioBlock texto={comentarios_instalacao} />}
        </div>
    );
};

const ReportPageLayout = ({ children, pageNumber, totalPages, relatorio, empreendimento }) => {
    const logoHorizontalCompressed = useCompressedImage("https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/4bd521d1e_LOGOHORIZONTAl.png", 400, 0.7);
    const HEADER_HEIGHT = pageNumber > 1 ? '80px' : '0px';
    const FOOTER_HEIGHT = '45px';
    const isCover = pageNumber === 1;

    return (
        <div className="report-page" style={isCover ? { height: '297mm', overflow: 'hidden' } : {}}>
            {!isCover && (
                <div className="flex justify-between items-center border-b border-gray-200 bg-white" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_HEIGHT, zIndex: 100, padding: '4px 8px', maxWidth: '210mm', boxSizing: 'border-box' }}>
                    <img src={logoHorizontalCompressed} alt="Logo Interativa Engenharia" style={{ height: '32px', maxWidth: '120px', objectFit: 'contain' }} />
                    <div className="text-right" style={{ flex: 1, paddingLeft: '8px', overflow: 'hidden' }}>
                        <h2 className="text-[10px] font-bold text-gray-800 uppercase leading-tight truncate">{relatorio?.titulo_relatorio || 'SISTEMA SDAI'}</h2>
                        <p className="text-[9px] text-gray-600 leading-tight truncate">{empreendimento?.nome_empreendimento} - {relatorio?.cliente}</p>
                        <p className="text-[9px] font-medium text-gray-800 leading-tight">{relatorio?.data_inspecao ? format(new Date(relatorio.data_inspecao), 'dd/MM/yyyy', { locale: ptBR }) : ''}</p>
                    </div>
                </div>
            )}
            <div className="page-content" style={{ paddingTop: HEADER_HEIGHT, paddingBottom: FOOTER_HEIGHT, minHeight: '100%', overflow: 'visible' }}>
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
            <h2 className="text-xl font-bold text-center mb-2 bg-blue-900 text-white p-2">Observações Gerais</h2>
            <div className="observacoes-block" style={{ pageBreakInside: 'auto', breakInside: 'auto' }}>
                <div className="border border-black px-2 py-1 font-bold text-xs bg-gray-100">Observações Gerais:</div>
                <div className="border border-black border-t-0 px-2 py-2 text-xs whitespace-pre-wrap" style={{ wordWrap: 'break-word', wordBreak: 'break-word', overflowWrap: 'break-word', minHeight: '60px' }}>{observacoes || ''}</div>
            </div>
        </div>
    );
};

const ConclusaoPage = ({ conclusaoR01, conclusaoR02 }) => {
    const opcoes = [
        { key: 'totalidade', label: 'Aprovado com totalidade' },
        { key: 'ressalvas', label: 'Aprovado com ressalvas' },
        { key: 'reprovado', label: 'Reprovado' },
    ];

    return (
        <div className="px-4 pb-4">
            <h2 className="text-xl font-bold text-center mb-3 bg-blue-900 text-white p-2">Conclusão</h2>
            <div className="flex mb-3" style={{ border: '1px solid #ccc', padding: '10px 14px', gap: '40px' }}>
                <div style={{ flex: 1 }}>
                    <p className="font-bold mb-2" style={{ fontSize: '12px' }}>1ª Vistoria</p>
                    {opcoes.map((opcao) => (
                        <div key={opcao.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                            <span style={{
                                display: 'inline-block', width: '13px', height: '13px', minWidth: '13px',
                                border: '1px solid #555', textAlign: 'center', lineHeight: '12px', fontSize: '11px',
                                flexShrink: 0,
                                backgroundColor: isConclusaoMatching(conclusaoR01, opcao.key) ? '#1d4ed8' : 'white',
                                color: 'white'
                            }}>
                                {isConclusaoMatching(conclusaoR01, opcao.key) ? '✓' : ''}
                            </span>
                            <span style={{ fontSize: '12px' }}>{opcao.label}</span>
                        </div>
                    ))}
                </div>
                <div style={{ flex: 1 }}>
                    <p className="font-bold mb-2" style={{ fontSize: '12px' }}>2ª Vistoria</p>
                    {opcoes.map((opcao) => (
                        <div key={opcao.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
                            <span style={{
                                display: 'inline-block', width: '13px', height: '13px', minWidth: '13px',
                                border: '1px solid #555', textAlign: 'center', lineHeight: '12px', fontSize: '11px',
                                flexShrink: 0,
                                backgroundColor: isConclusaoMatching(conclusaoR02, opcao.key) ? '#1d4ed8' : 'white',
                                color: 'white'
                            }}>
                                {isConclusaoMatching(conclusaoR02, opcao.key) ? '✓' : ''}
                            </span>
                            <span style={{ fontSize: '12px' }}>{opcao.label}</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="p-3 bg-gray-50" style={{ border: '1px solid #ccc', fontSize: '12px' }}>
                <p className="font-bold mb-1">Observação:</p>
                <p>Em caso de sistema não aprovado com totalidade na 1ª vistoria, a inspeção deverá ser refeita para confirmação de correções e aprovação com totalidade.</p>
            </div>
        </div>
    );
};

const ReportContent = ({ relatorio, empreendimento, navigate }) => {
    const [isPrintingMode, setIsPrintingMode] = useState(false);
    const TAIL_PAGE_LIMIT_PX = 980;

    const hasDocumentacao = relatorio.itens_documentacao && relatorio.itens_documentacao.length > 0;

    // Preparar estruturas para suportar múltiplas instalações e centrais
    let instalacoes = [];
    let centrais = [];
    let ordemSecoes = relatorio.ordem_secoes || [];

    // Migração de dados antigos
    if (relatorio.instalacoes && relatorio.instalacoes.length > 0) {
        instalacoes = relatorio.instalacoes;
    } else if (relatorio.itens_instalacao) {
        instalacoes = [{ itens: relatorio.itens_instalacao, comentarios: relatorio.comentarios_instalacao }];
    }

    if (relatorio.centrais && relatorio.centrais.length > 0) {
        centrais = relatorio.centrais;
    }

    // Se não tem ordem_secoes, criar ordem padrão (instalações primeiro, depois centrais)
    if (ordemSecoes.length === 0) {
        for (let i = 0; i < instalacoes.length; i++) {
            ordemSecoes.push({ tipo: 'instalacao', indice: i });
        }
        for (let i = 0; i < centrais.length; i++) {
            ordemSecoes.push({ tipo: 'central', indice: i });
        }
    }

    // Paginar itens de instalação
    const paginateInstallationItems = (instalacao) => {
        const localLike = {
            itens_inspecao: (instalacao?.itens || []).map((item) => ({
                descricao: item.item_verificacao,
                resultado: item.resultado,
                observacoes: item.comentario || '',
                fotos: Array.isArray(item.fotos) ? item.fotos : [],
            })),
            comentarios: instalacao?.comentarios || '',
        };

        return paginateLocalItemsForPrinting(localLike, {
            pageHeightPx: 1122,
            headerHeightPx: 80,
            footerHeightPx: 45,
            pagePaddingPx: 12,
            footerGuardPx: 16,
            breakBeforeLimitPx: 20,
            itemBufferPx: 8,
            photoMaxHeightPx: 170,
            maxPhotosPerItem: 6,
            splitPhotoRows: true,
            photoChunkSize: 3,
        });
    };

    // Construir páginas de conteúdo seguindo a ordem definida
    const contentPages = [];

    // Processar seções na ordem definida (ordem_secoes)
    ordemSecoes.forEach((secao) => {
        if (secao.tipo === 'central') {
            const central = centrais[secao.indice];
            if (central) {
                contentPages.push([{ type: 'central', data: central }]);
            }
        } else if (secao.tipo === 'instalacao') {
            const instalacao = instalacoes[secao.indice];
            if (instalacao && instalacao.itens && instalacao.itens.length > 0) {
                const paginatedItems = paginateInstallationItems(instalacao);
                paginatedItems.forEach((pageData, pageIndex) => {
                    const isLastInstPage = pageIndex === paginatedItems.length - 1;
                    contentPages.push([{
                        type: 'instalacao',
                        items: pageData.items,
                        comentarios: pageData.items.some((item) => item.tipo === 'comentario' || item.isComentarioGeral) ? null : (isLastInstPage ? instalacao.comentarios : null),
                        showHeader: pageData.isFirstPageOfLocal,
                        remainingHeightPx: isLastInstPage ? (pageData.pageMap?.remainingHeightPx ?? 0) : 0,
                    }]);
                });
            }
        }
    });

    const hasAssinaturas = relatorio.assinaturas && relatorio.assinaturas.length > 0 &&
        relatorio.assinaturas.some(ass => (ass.nome && ass.nome.trim() !== '') || (ass.parte && ass.parte.trim() !== '') || (ass.assinatura_imagem && ass.assinatura_imagem.trim() !== ''));

    const measureObsGeraisHeight = () => {
        if (typeof document === 'undefined' || !document.body) return 420;
        const escHtml = (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const tempDiv = document.createElement('div');
        tempDiv.style.cssText = 'position:absolute;visibility:hidden;width:190mm;box-sizing:border-box;font-family:Inter,Poppins,sans-serif;font-size:12px;left:-9999px;';
        tempDiv.innerHTML = `
            <div style="padding:16px;">
                <div style="font-size:1.25rem;font-weight:bold;text-align:center;background:#1e3a8a;color:white;padding:8px;margin-bottom:8px;">Observações Gerais</div>
                <div style="border:1px solid #000;padding:4px 8px;font-weight:700;font-size:12px;background:#f3f4f6;">Observações Gerais:</div>
                <div style="border:1px solid #000;border-top:0;padding:8px;font-size:12px;white-space:pre-wrap;word-break:break-word;min-height:60px;">${escHtml(relatorio.observacoes_gerais)}</div>
            </div>
        `;
        document.body.appendChild(tempDiv);
        const h = tempDiv.offsetHeight;
        document.body.removeChild(tempDiv);
        return h + 20;
    };

    const measureConclusaoHeight = () => {
        if (typeof document === 'undefined' || !document.body) return 260;
        const tempDiv = document.createElement('div');
        tempDiv.style.cssText = 'position:absolute;visibility:hidden;width:190mm;box-sizing:border-box;font-family:Inter,Poppins,sans-serif;font-size:12px;left:-9999px;';
        tempDiv.innerHTML = `
            <div style="padding:0 16px 16px;">
                <div style="font-size:1.25rem;font-weight:bold;text-align:center;background:#1e3a8a;color:white;padding:8px;margin-bottom:12px;">Conclusão</div>
                <div style="border:1px solid #ccc;padding:10px 14px;min-height:110px;"></div>
                <div style="padding:12px;background:#f9fafb;border:1px solid #ccc;margin-top:12px;min-height:56px;"></div>
            </div>
        `;
        document.body.appendChild(tempDiv);
        const h = tempDiv.offsetHeight;
        document.body.removeChild(tempDiv);
        return h + 20;
    };

    const lastContentPage = contentPages[contentPages.length - 1];
    const lastSection = lastContentPage ? lastContentPage[lastContentPage.length - 1] : null;
    const lastPageRemainingPx = lastSection?.remainingHeightPx ?? 0;
    const obsGeraisHeightPx = measureObsGeraisHeight();
    const conclusaoHeightPx = measureConclusaoHeight();

    const inlineObsGerais = contentPages.length > 0 && lastPageRemainingPx >= obsGeraisHeightPx;
    const remainingAfterInlineObsPx = inlineObsGerais ? (lastPageRemainingPx - obsGeraisHeightPx) : 0;
    const inlineConclusao = inlineObsGerais && remainingAfterInlineObsPx >= conclusaoHeightPx;

    const tailBlocks = [];
    if (!inlineObsGerais) tailBlocks.push({ type: 'observacoes', estimatedHeightPx: obsGeraisHeightPx });
    if (!inlineConclusao) tailBlocks.push({ type: 'conclusao', estimatedHeightPx: conclusaoHeightPx });

    const tailPages = [];
    let currentTailPage = [];
    let currentTailHeight = 0;

    tailBlocks.forEach((block) => {
        const blockHeight = block.estimatedHeightPx || 220;
        if (currentTailPage.length > 0 && (currentTailHeight + blockHeight) > TAIL_PAGE_LIMIT_PX) {
            tailPages.push(currentTailPage);
            currentTailPage = [];
            currentTailHeight = 0;
        }
        currentTailPage.push(block);
        currentTailHeight += blockHeight;
    });

    if (currentTailPage.length > 0) tailPages.push(currentTailPage);

    const totalPages = 1 + (hasDocumentacao ? 1 : 0) + contentPages.length + tailPages.length + (hasAssinaturas ? 1 : 0);
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
                    <h1 className="text-xl font-semibold text-gray-800">Visualizar Inspeção de Central SDAI</h1>
                    <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700 text-white"><Printer className="w-4 h-4 mr-2" />Gerar PDF</Button>
                </div>
            </div>
            <div className="report-container max-w-4xl mx-auto" style={{ padding: 0 }}>
                <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                    <CoverPage relatorio={relatorio} empreendimento={empreendimento} />
                </ReportPageLayout>

                {hasDocumentacao && (
                    <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                        <DocumentacaoPage itens={relatorio.itens_documentacao} comentarios={relatorio.comentarios_documentacao} />
                    </ReportPageLayout>
                )}

                {contentPages.map((pageSections, index) => (
                    <ReportPageLayout key={`content-${index}`} pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                        {pageSections.map((section, sectionIndex) => (
                            <div key={sectionIndex}>
                                {section.type === 'central' ? (
                                    <CentraisInfoPage centrais={[section.data]} />
                                ) : (
                                    <InstalacaoPage
                                        itens_instalacao={section.items}
                                        comentarios_instalacao={section.comentarios}
                                        showHeader={section.showHeader}
                                    />
                                )}
                            </div>
                        ))}
                        {inlineObsGerais && index === contentPages.length - 1 && (
                            <>
                                <ObservacoesGeraisPage observacoes={relatorio.observacoes_gerais} />
                            </>
                        )}
                        {inlineConclusao && index === contentPages.length - 1 && (
                            <>
                                <ConclusaoPage
                                    conclusaoR01={relatorio.conclusao_r01 || relatorio.conclusao}
                                    conclusaoR02={relatorio.conclusao_r02 || relatorio.conclusao}
                                />
                            </>
                        )}
                    </ReportPageLayout>
                ))}

                {tailPages.map((tailPageBlocks, tailPageIndex) => (
                    <ReportPageLayout
                        key={`tail-${tailPageIndex}`}
                        pageNumber={currentPage++}
                        totalPages={totalPages}
                        relatorio={relatorio}
                        empreendimento={empreendimento}
                    >
                        {tailPageBlocks.map((block, blockIndex) => {
                            if (block.type === 'observacoes') {
                                return <ObservacoesGeraisPage key={`tail-obs-${blockIndex}`} observacoes={relatorio.observacoes_gerais} />;
                            }
                            if (block.type === 'conclusao') {
                                return (
                                    <ConclusaoPage
                                        key={`tail-conc-${blockIndex}`}
                                        conclusaoR01={relatorio.conclusao_r01 || relatorio.conclusao}
                                        conclusaoR02={relatorio.conclusao_r02 || relatorio.conclusao}
                                    />
                                );
                            }
                            return null;
                        })}
                    </ReportPageLayout>
                ))}

                {hasAssinaturas && (
                    <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                        <AssinaturasPage assinaturas={relatorio.assinaturas.filter(ass =>
                            (ass.nome && ass.nome.trim() !== '') ||
                            (ass.parte && ass.parte.trim() !== '') ||
                            (ass.assinatura_imagem && ass.assinatura_imagem.trim() !== '')
                        )} />
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
                    .comentario-block { page-break-inside: auto; }
                    .observacoes-block { page-break-inside: auto; }
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

export default function VisualizarInspecaoSDAI() {
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
                const relatorioData = await InspecaoSDAI.get(relatorioId);
                if (!relatorioData) throw new Error("Relatório não encontrado.");

                const empreendimentoData = await Empreendimento.get(relatorioData.id_empreendimento);
                if (!empreendimentoData) throw new Error("Empreendimento associado não encontrado.");

                // Comprimir as imagens do relatório ANTES de renderizar
                const compressedRelatorio = await compressReportImages(relatorioData);

                setRelatorio(compressedRelatorio);
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