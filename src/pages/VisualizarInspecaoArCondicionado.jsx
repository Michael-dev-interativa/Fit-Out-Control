import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { InspecaoArCondicionado, Empreendimento } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, ArrowLeft, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AssinaturasPage } from '@/components/relatorios/AssinaturasSection';

const isValidId = (id) => id && typeof id === 'string' && id.length > 0;

// Helper function for image compression
const compressImage = (url, maxWidth = 800, quality = 0.3) => {
    return new Promise((resolve) => {
        if (!url || typeof url !== 'string' || url.startsWith('data:image')) {
            resolve(url);
            return;
        }
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
            const compressedUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedUrl);
        };
        img.onerror = () => resolve(url);
        img.src = url;
    });
};

const useCompressedImage = (url, maxWidth = 800, quality = 0.7) => {
    const [compressedUrl, setCompressedUrl] = React.useState(url);
    React.useEffect(() => {
        if (url && typeof url === 'string' && url.startsWith('http')) {
            compressImage(url, maxWidth, quality).then(setCompressedUrl);
        } else {
            setCompressedUrl(url);
        }
    }, [url, maxWidth, quality]);
    return compressedUrl;
};

const FotoInspecao = ({ url, legenda }) => {
    const compressedUrl = useCompressedImage(url, 400, 0.5);
    return (
        <div className="text-center">
            <img
                src={compressedUrl}
                alt={legenda || 'Foto da inspeção'}
                style={{
                    width: '100%',
                    height: 'auto',
                    objectFit: 'contain',
                    border: '1px solid #ddd',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact'
                }}
            />
            {legenda && (
                <p className="text-[9px] text-gray-600 mt-1">{legenda}</p>
            )}
        </div>
    );
};

const CoverPage = ({ relatorio, empreendimento }) => {
    const year = new Date(relatorio?.data_inspecao || Date.now()).getFullYear();
    const redColor = '#CE2D2D';
    const empreendimentoImageUrl = empreendimento?.foto_empreendimento || 'https://images.unsplash.com/photo-1519947486511-46149fa0a254?w=800&q=80';
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
                <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: '20px', color: redColor, letterSpacing: '1px' }}>INSPEÇÃO DE AR CONDICIONADO</h2>
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

const ProjetoEquipamentosPage = ({ relatorio }) => {
    return (
        <div className="px-4 pt-1 pb-1">
            {relatorio.evaporadoras && relatorio.evaporadoras.length > 0 && (
                <div className="mb-1">
                    <h3 className="text-sm font-bold text-center mb-0.5 bg-blue-900 text-white p-0.5">Informação do Equipamento - Evaporadora</h3>
                    <table className="w-full border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
                        <tbody>
                            {relatorio.evaporadoras.map((evap, idx) => (
                                <React.Fragment key={idx}>
                                    <tr>
                                        <td className="border border-black p-0.5 text-xs font-bold bg-gray-100" style={{ width: '25%' }}>Nome do Equipamento</td>
                                        <td className="border border-black p-0.5 text-xs" style={{ width: '25%', wordWrap: 'break-word', wordBreak: 'break-word' }}>{evap.nome_equipamento}</td>
                                        <td className="border border-black p-0.5 text-xs font-bold bg-gray-100" style={{ width: '25%' }}>Localização</td>
                                        <td className="border border-black p-0.5 text-xs" style={{ width: '25%', wordWrap: 'break-word', wordBreak: 'break-word' }}>{evap.localizacao}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-0.5 text-xs font-bold bg-gray-100">Fabricante</td>
                                        <td className="border border-black p-0.5 text-xs" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>{evap.fabricante}</td>
                                        <td className="border border-black p-0.5 text-xs font-bold bg-gray-100">Modelo</td>
                                        <td className="border border-black p-0.5 text-xs" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>{evap.modelo}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-0.5 text-xs font-bold bg-gray-100">Número de Série</td>
                                        <td className="border border-black p-0.5 text-xs" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>{evap.numero_serie}</td>
                                        <td className="border border-black p-0.5 text-xs font-bold bg-gray-100">Vazão (m³/h)</td>
                                        <td className="border border-black p-0.5 text-xs" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>{evap.vazao}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-0.5 text-xs font-bold bg-gray-100">Tensão Nominal (V)</td>
                                        <td className="border border-black p-0.5 text-xs" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>{evap.tensao_nominal}</td>
                                        <td className="border border-black p-0.5 text-xs font-bold bg-gray-100">Capacidade</td>
                                        <td className="border border-black p-0.5 text-xs" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>{evap.capacidade}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-0.5 text-xs font-bold bg-gray-100">Corrente Nominal (A)</td>
                                        <td className="border border-black p-0.5 text-xs" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>{evap.corrente_nominal}</td>
                                        <td className="border border-black p-0.5 text-xs font-bold bg-gray-100">Quantidade</td>
                                        <td className="border border-black p-0.5 text-xs" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>{evap.quantidade}</td>
                                    </tr>
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {relatorio.condensadoras && relatorio.condensadoras.length > 0 && (
                <div>
                    <h3 className="text-sm font-bold text-center mb-0.5 bg-blue-900 text-white p-0.5">Informação do Equipamento - Condensadora</h3>
                    <table className="w-full border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
                        <tbody>
                            {relatorio.condensadoras.map((cond, idx) => (
                                <React.Fragment key={idx}>
                                    <tr>
                                        <td className="border border-black p-0.5 text-xs font-bold bg-gray-100" style={{ width: '25%' }}>Nome do Equipamento</td>
                                        <td className="border border-black p-0.5 text-xs" style={{ width: '25%', wordWrap: 'break-word', wordBreak: 'break-word' }}>{cond.nome_equipamento}</td>
                                        <td className="border border-black p-0.5 text-xs font-bold bg-gray-100" style={{ width: '25%' }}>Localização</td>
                                        <td className="border border-black p-0.5 text-xs" style={{ width: '25%', wordWrap: 'break-word', wordBreak: 'break-word' }}>{cond.localizacao}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-0.5 text-xs font-bold bg-gray-100">Fabricante</td>
                                        <td className="border border-black p-0.5 text-xs" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>{cond.fabricante}</td>
                                        <td className="border border-black p-0.5 text-xs font-bold bg-gray-100">Modelo</td>
                                        <td className="border border-black p-0.5 text-xs" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>{cond.modelo}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-0.5 text-xs font-bold bg-gray-100">Número de Série</td>
                                        <td className="border border-black p-0.5 text-xs" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>{cond.numero_serie}</td>
                                        <td className="border border-black p-0.5 text-xs font-bold bg-gray-100">Vazão (m³/h)</td>
                                        <td className="border border-black p-0.5 text-xs" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>{cond.vazao}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-0.5 text-xs font-bold bg-gray-100">Tensão Nominal (V)</td>
                                        <td className="border border-black p-0.5 text-xs" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>{cond.tensao_nominal}</td>
                                        <td className="border border-black p-0.5 text-xs font-bold bg-gray-100">Capacidade</td>
                                        <td className="border border-black p-0.5 text-xs" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>{cond.capacidade}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-0.5 text-xs font-bold bg-gray-100">Corrente Nominal (A)</td>
                                        <td className="border border-black p-0.5 text-xs" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>{cond.corrente_nominal}</td>
                                        <td className="border border-black p-0.5 text-xs font-bold bg-gray-100">Quantidade</td>
                                        <td className="border border-black p-0.5 text-xs" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>{cond.quantidade}</td>
                                    </tr>
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const InspecaoFisicaSection = ({ titulo, items, isFirstPage, comentarios }) => {
    if (!items || items.length === 0) return null;

    return (
        <div className={isFirstPage ? "px-4 pt-2 pb-2" : "px-4 pt-6 pb-2"}>
            {isFirstPage && (
                <>
                    <h3 className="text-lg font-bold mb-1 bg-blue-900 text-white p-1.5 text-center">{titulo}</h3>
                    <p className="text-[9px] text-gray-600 italic mb-1">Tique se for OK ✓, NA - Não se aplica. Caso contrário, faça um comentário.</p>
                </>
            )}
            <table className="w-full border-collapse text-xs table-fixed">
                {isFirstPage && (
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-black p-1.5 text-left" style={{ width: '40%' }}>Descrição</th>
                            <th className="border border-black p-1.5 text-center" style={{ width: '8%' }}>OK</th>
                            <th className="border border-black p-1.5 text-center" style={{ width: '8%' }}>NA</th>
                            <th className="border border-black p-1.5 text-left" style={{ width: '44%' }}>Observações</th>
                        </tr>
                    </thead>
                )}
                <tbody>
                    {items.map((item, idx) => {
                        const isComentario = item.tipo === 'comentario' || item.isComentarioGeral;

                        if (isComentario) {
                            return (
                                <tr key={idx} className="bg-gray-50" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                    <td className="border border-black p-1.5 font-bold" style={{ verticalAlign: 'top' }}>Comentários:</td>
                                    <td className="border border-black p-1.5" colSpan="3" style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{item.texto || item.comentarios || ''}</td>
                                </tr>
                            );
                        }

                        // Se for apenas fotos (continuação)
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
                                <tr key={idx} style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                    <td className="border border-black p-1.5" style={{ width: '40%', wordWrap: 'break-word', wordBreak: 'break-word' }}>{item.descricao}</td>
                                    <td className="border border-black p-1.5 text-center" style={{ width: '8%' }}>{item.resultado === 'OK' ? '☑' : '☐'}</td>
                                    <td className="border border-black p-1.5 text-center" style={{ width: '8%' }}>{item.resultado === 'Não' ? '☑' : '☐'}</td>
                                    <td className="border border-black p-1.5" style={{ width: '44%', wordWrap: 'break-word', wordBreak: 'break-word' }}>{item.observacoes || ''}</td>
                                </tr>
                                {item.fotos && item.fotos.length > 0 && (
                                    <tr key={`${idx}-fotos`}>
                                        <td colSpan="4" className="border border-black p-2">
                                            <div className="grid grid-cols-3 gap-2">
                                                {item.fotos.map((foto, fotoIdx) => (
                                                    <FotoInspecao key={fotoIdx} url={foto.url} legenda={foto.legenda} />
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
            {comentarios && (
                <div className="mt-2">
                    <div className="bg-gray-100 border border-black p-1.5 font-bold text-xs">Comentários:</div>
                    <div className="border border-black border-t-0 p-2 text-xs whitespace-pre-wrap min-h-[40px]">{comentarios}</div>
                </div>
            )}
        </div>
    );
};

const DocumentacaoPage = ({ itens, comentarios }) => {
    return (
        <div className="px-4 pt-2 pb-2">
            <h2 className="text-xl font-bold text-center mb-2 bg-blue-900 text-white p-1.5">Documentação Técnica</h2>
            <table className="w-full border-collapse text-xs table-fixed">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-black p-1.5 text-left" style={{ width: '40%' }}>Descrição</th>
                        <th className="border border-black p-1.5 text-center" style={{ width: '8%' }}>Recebido</th>
                        <th className="border border-black p-1.5 text-left" style={{ width: '52%' }}>Observações</th>
                    </tr>
                </thead>
                <tbody>
                    {itens.map((item, idx) => (
                        <tr key={idx}>
                            <td className="border border-black p-1.5" style={{ width: '40%' }}>{item.descricao}</td>
                            <td className="border border-black p-1.5 text-center" style={{ width: '8%' }}>{item.resultado === 'OK' ? '☑' : '☐'}</td>
                            <td className="border border-black p-1.5" style={{ width: '52%' }}>{item.observacoes}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <h4 className="text-sm font-bold mt-2 mb-1 bg-gray-100 p-1 border border-black">Comentários:</h4>
            <div className="border border-black border-t-0 p-2 text-xs min-h-[30px] whitespace-pre-wrap" style={{ wordWrap: 'break-word', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{comentarios || ''}</div>
        </div>
    );
};

const ReportPageLayout = ({ children, pageNumber, totalPages, relatorio, empreendimento }) => {
    const logoHorizontalUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/4bd521d1e_LOGOHORIZONTAl.png";
    const HEADER_HEIGHT = pageNumber > 1 ? '50px' : '0px';
    const FOOTER_HEIGHT = '30px';
    const isCover = pageNumber === 1;

    return (
        <div className="report-page">
            {!isCover && (
                <div className="flex justify-between items-center border-b border-gray-200 bg-white" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_HEIGHT, zIndex: 100, padding: '4px 8px', maxWidth: '210mm', boxSizing: 'border-box' }}>
                    <img src={logoHorizontalUrl} alt="Logo Interativa Engenharia" style={{ height: '32px', maxWidth: '120px', objectFit: 'contain' }} />
                    <div className="text-right" style={{ flex: 1, paddingLeft: '8px', overflow: 'hidden' }}>
                        <h2 className="text-[10px] font-bold text-gray-800 uppercase leading-tight truncate">{relatorio?.titulo_relatorio || 'INSPEÇÃO DE AR CONDICIONADO'}</h2>
                        <p className="text-[9px] text-gray-600 leading-tight truncate">{empreendimento?.nome_empreendimento} - {relatorio?.cliente}</p>
                        <p className="text-[9px] font-medium text-gray-800 leading-tight">{relatorio?.data_inspecao ? format(new Date(relatorio.data_inspecao), 'dd/MM/yyyy', { locale: ptBR }) : ''}</p>
                    </div>
                </div>
            )}
            <div className="page-content" style={{ paddingTop: HEADER_HEIGHT, paddingBottom: FOOTER_HEIGHT, minHeight: `calc(297mm - ${HEADER_HEIGHT} - ${FOOTER_HEIGHT})` }}>
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
        <div className="px-4 pt-2 pb-2">
            <h2 className="text-xl font-bold text-center mb-2 bg-blue-900 text-white p-1.5">Observações Gerais</h2>
            <div className="border border-black p-2 text-sm whitespace-pre-wrap min-h-[100px]" style={{ wordWrap: 'break-word', overflowWrap: 'break-word', wordBreak: 'break-word' }}>{observacoes || ''}</div>
        </div>
    );
};

const ReportContent = ({ relatorio, empreendimento, navigate }) => {
    const [isPrintingMode, setIsPrintingMode] = useState(false);

    const hasDocumentacao = relatorio.itens_documentacao && relatorio.itens_documentacao.length > 0;
    const hasEquipamentos = (relatorio.evaporadoras && relatorio.evaporadoras.length > 0) || (relatorio.condensadoras && relatorio.condensadoras.length > 0);

    // Função para paginar os itens de cada seção de forma inteligente
    const paginateInspecaoItems = (inspecao, maxItemsForFirstPage = 6) => {
        if (!inspecao || !inspecao.itens || inspecao.itens.length === 0) return [];

        const pages = [];
        const maxItemsPerPage = 8;
        const MAX_FOTOS_PER_ITEM = 6;
        const allItems = [...inspecao.itens];

        if (inspecao.comentarios) {
            allItems.push({ tipo: 'comentario', comentarios: inspecao.comentarios, isComentarioGeral: true });
        }

        let currentPage = [];
        let isFirstPage = true;

        allItems.forEach((item) => {
            const isComentario = item.tipo === 'comentario' || item.isComentarioGeral;

            // Se o item tem mais de 6 fotos, dividir em múltiplas partes
            if (!isComentario && item.fotos && item.fotos.length > MAX_FOTOS_PER_ITEM) {
                const fotosChunks = [];
                for (let i = 0; i < item.fotos.length; i += MAX_FOTOS_PER_ITEM) {
                    fotosChunks.push(item.fotos.slice(i, i + MAX_FOTOS_PER_ITEM));
                }

                // Primeiro chunk
                const firstItemPart = { ...item, fotos: fotosChunks[0] };
                const weight = 1 + (Math.ceil(fotosChunks[0].length / 3) * 2.5);
                const currentWeight = currentPage.reduce((acc, p) => {
                    if (p.tipo === 'comentario' || p.isComentarioGeral) return acc + 1;
                    if (p.fotos && p.fotos.length > 0) {
                        return acc + 1 + (Math.ceil(p.fotos.length / 3) * 2.5);
                    }
                    return acc + 1;
                }, 0);
                const currentLimit = isFirstPage ? maxItemsForFirstPage : maxItemsPerPage;

                if (currentPage.length > 0 && currentWeight + weight > currentLimit) {
                    pages.push({ items: currentPage, isFirstPage });
                    currentPage = [];
                    isFirstPage = false;
                }
                currentPage.push(firstItemPart);

                // Chunks restantes
                for (let i = 1; i < fotosChunks.length; i++) {
                    if (currentPage.length > 0) {
                        pages.push({ items: currentPage, isFirstPage });
                        currentPage = [];
                        isFirstPage = false;
                    }
                    currentPage.push({
                        ...item,
                        descricao: `(Continuação) ${item.descricao}`,
                        fotos: fotosChunks[i],
                        showOnlyPhotos: true
                    });
                }
            } else {
                // Item normal
                let itemWeight = 1;
                if (isComentario) {
                    itemWeight = 1;
                } else if (item.fotos && item.fotos.length > 0) {
                    itemWeight = 1 + (Math.ceil(item.fotos.length / 3) * 2.5);
                }

                const currentWeight = currentPage.reduce((acc, p) => {
                    if (p.tipo === 'comentario' || p.isComentarioGeral) return acc + 1;
                    if (p.fotos && p.fotos.length > 0) {
                        return acc + 1 + (Math.ceil(p.fotos.length / 3) * 2.5);
                    }
                    return acc + 1;
                }, 0);
                const currentLimit = isFirstPage ? maxItemsForFirstPage : maxItemsPerPage;

                if (currentPage.length > 0 && currentWeight + itemWeight > currentLimit) {
                    pages.push({ items: currentPage, isFirstPage });
                    currentPage = [];
                    isFirstPage = false;
                }
                currentPage.push(item);
            }
        });

        if (currentPage.length > 0) {
            pages.push({ items: currentPage, isFirstPage });
        }

        return pages;
    };

    // Seções de inspeção física com paginação
    const inspecaoSections = [
        { key: 'inspecao_evaporadora', titulo: 'INSPEÇÃO FÍSICA - UNIDADE EVAPORADORA', data: relatorio.inspecao_evaporadora },
        { key: 'inspecao_valvulas', titulo: 'INSPEÇÃO FÍSICA - VÁLVULAS E TUBULAÇÃO FRIGORÍGENA', data: relatorio.inspecao_valvulas },
        { key: 'inspecao_condensadora', titulo: 'INSPEÇÃO FÍSICA - UNIDADE CONDENSADORA', data: relatorio.inspecao_condensadora },
        { key: 'inspecao_eletrica', titulo: 'INSPEÇÃO FÍSICA - ELÉTRICA E CONTROLES', data: relatorio.inspecao_eletrica },
        { key: 'inspecao_sensores', titulo: 'INSPEÇÃO FÍSICA - SENSORES E CONTROLES', data: relatorio.inspecao_sensores },
    ].filter(s => s.data && s.data.itens && s.data.itens.length > 0);

    const paginatedSections = inspecaoSections.flatMap(section =>
        paginateInspecaoItems(section.data).map(page => ({
            ...page,
            titulo: section.titulo,
            key: section.key
        }))
    );

    // Calcula quantas linhas os equipamentos ocupam
    const equipamentosRowCount = () => {
        let count = 0;
        if (relatorio.evaporadoras && relatorio.evaporadoras.length > 0) {
            count += 1 + (relatorio.evaporadoras.length * 6);
        }
        if (relatorio.condensadoras && relatorio.condensadoras.length > 0) {
            count += 1 + (relatorio.condensadoras.length * 6);
        }
        return count;
    };

    const equipRowCount = hasEquipamentos ? equipamentosRowCount() : 0;
    const docItemsCount = hasDocumentacao ? (relatorio.itens_documentacao.length || 0) : 0;
    const combineEquipamentosWithDoc = hasEquipamentos && hasDocumentacao && (equipRowCount + docItemsCount + 1) < 35;

    const hasAssinaturas = relatorio.assinaturas && relatorio.assinaturas.length > 0 &&
        relatorio.assinaturas.some(ass => (ass.nome && ass.nome.trim() !== '') || (ass.parte && ass.parte.trim() !== '') || (ass.assinatura_imagem && ass.assinatura_imagem.trim() !== ''));
    const totalPages = 1 + (hasEquipamentos && !combineEquipamentosWithDoc ? 1 : 0) + (combineEquipamentosWithDoc ? 1 : 0) + (hasDocumentacao && !combineEquipamentosWithDoc ? 1 : 0) + paginatedSections.length + 1 + (hasAssinaturas ? 1 : 0);
    let currentPage = 1;

    const handlePrint = async () => {
        setIsPrintingMode(true);
        await new Promise(resolve => setTimeout(resolve, 100));
        window.print();
        setTimeout(() => setIsPrintingMode(false), 2000);
    };

    return (
        <div className="bg-gray-200 print:bg-white min-h-screen font-sans">
            <div className="no-print shadow-sm border-b p-4 mb-4 bg-white">
                <div className="flex justify-between items-center max-w-4xl mx-auto">
                    <Button onClick={() => navigate(-1)} variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
                    <h1 className="text-xl font-semibold text-gray-800">Visualizar Inspeção de Ar Condicionado</h1>
                    <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700 text-white">
                        <Printer className="w-4 h-4 mr-2" />
                        Gerar PDF
                    </Button>
                </div>
            </div>
            <div className="report-container print:!m-0 print:!p-0 max-w-4xl mx-auto" style={{ padding: 0 }}>
                <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                    <CoverPage relatorio={relatorio} empreendimento={empreendimento} />
                </ReportPageLayout>

                {combineEquipamentosWithDoc ? (
                    <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                        <ProjetoEquipamentosPage relatorio={relatorio} />
                        <DocumentacaoPage itens={relatorio.itens_documentacao} comentarios={relatorio.comentarios_documentacao} />
                    </ReportPageLayout>
                ) : (
                    <>
                        {hasEquipamentos && (
                            <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                                <ProjetoEquipamentosPage relatorio={relatorio} />
                            </ReportPageLayout>
                        )}
                    </>
                )}

                {hasDocumentacao && !combineEquipamentosWithDoc && (
                    <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                        <DocumentacaoPage itens={relatorio.itens_documentacao} comentarios={relatorio.comentarios_documentacao} />
                    </ReportPageLayout>
                )}

                {paginatedSections.map((section, index) => (
                    <ReportPageLayout key={`${section.key}-${index}`} pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                        <InspecaoFisicaSection titulo={section.titulo} items={section.items} isFirstPage={section.isFirstPage} comentarios={null} />
                    </ReportPageLayout>
                ))}

                <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                    <ObservacoesGeraisPage observacoes={relatorio.observacoes_gerais} />
                </ReportPageLayout>

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
                
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
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
            `}</style>
        </div>
    );
};

export default function VisualizarInspecaoArCondicionado() {
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
                const relatorioData = await InspecaoArCondicionado.get(relatorioId);
                if (!relatorioData) throw new Error("Relatório não encontrado.");

                let empreendimentoData = null;
                if (relatorioData.id_empreendimento) {
                    empreendimentoData = await Empreendimento.get(relatorioData.id_empreendimento);
                }

                setRelatorio(relatorioData);
                setEmpreendimento(empreendimentoData || {});
            } catch (err) {
                console.error("Erro ao carregar dados:", err);
                setError(err.message || "Erro ao carregar relatório");
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