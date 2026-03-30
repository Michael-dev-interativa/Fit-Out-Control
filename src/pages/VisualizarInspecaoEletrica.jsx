import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { paginateLocalItemsForPrinting } from '@/lib/reportPagination';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, ArrowLeft, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AssinaturasPage } from '@/components/relatorios/AssinaturasSection';

const isValidId = (id) => id && typeof id === 'string' && id.length > 0;


// Componente Checkbox simples usado apenas no visualizador/impressão
const Checkbox = ({ checked }) => {
    return (
        <span style={{ display: 'inline-block', width: '18px', height: '18px', textAlign: 'center', lineHeight: '16px', fontSize: '12px' }}>{checked ? '☑' : '☐'}</span>
    );
};
const matchResultado = (res, target) => {
    if (res === null || typeof res === 'undefined') return false;
    const s = String(res).normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toUpperCase();

    if (target === 'OK') {
        return s === 'OK' || /\bOK\b/.test(s);
    }
    if (target === 'N/OK') {
        return s === 'N/OK' || s === 'NOK' || /N\/?OK/.test(s) || /^N\b/.test(s);
    }
    if (target === 'NAO' || target === 'NÃO' || target === 'NA') {
        return s === 'NAO' || s === 'NA' || s === 'N' || /NAO/.test(s) || /^NÃO$/.test(s);
    }
    return s === String(target).toUpperCase();
};

const isConclusaoMatching = (val, key) => {
    if (val === null || typeof val === 'undefined') return false;
    const s = String(val).normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
    if (!s) return false;

    if (key === 'totalidade') {
        return s === 'totalidade' || s.includes('totalidade') || s.includes('aprovado') || s === 'ok' || s === 'aprovado com totalidade';
    }
    if (key === 'ressalvas') {
        return s === 'ressalvas' || s.includes('ressalva') || s.includes('ressalvas') || s.includes('ressalva') || s.includes('ressalvas') || s.includes('ressalvas') || s.includes('ressalvas');
    }
    if (key === 'reprovado') {
        return s === 'reprovado' || s.includes('reprovado') || s === 'reprovado';
    }
    return s === key;
};

const compressImage = (url, maxWidth = null, quality = 0.2) => {
    return new Promise((resolve) => {
        if (!url || typeof url !== 'string') {
            console.log("Imagem inválida ou já data URL:", url?.substring(0, 50));
            resolve(url);
            return;
        }

        // Se já é data URL comprimida, retorna
        if (url.startsWith('data:image')) {
            resolve(url);
            return;
        }

        // Skip compression for base44.app/api URLs due to CORS restrictions
        if (url.includes('base44.app/api')) {
            console.log("Pulando compressão (base44.app/api):", url);
            resolve(url);
            return;
        }

        console.log(`Comprimindo imagem: maxWidth=${maxWidth}, quality=${quality}, url=${url.substring(0, 60)}...`);
        const img = new Image();
        img.crossOrigin = 'anonymous';

        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                let width = img.width;
                let height = img.height;

                // Reduz proporcionalmente apenas quando houver limite explícito
                if (maxWidth && width > maxWidth) {
                    height *= maxWidth / width;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
                const originalSize = url.length;
                const compressedSize = compressedDataUrl.length;
                console.log(`✓ Imagem comprimida: ${originalSize} → ${compressedSize} bytes (${Math.round(compressedSize / originalSize * 100)}%)`);

                resolve(compressedDataUrl);
            } catch (error) {
                console.error("Erro ao comprimir imagem:", error);
                resolve(url);
            }
        };

        img.onerror = (error) => {
            console.warn("Erro ao carregar imagem (CORS ou URL inválida):", url, error);
            resolve(url);
        };

        img.src = url;
    });
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
                <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: '20px', color: redColor, letterSpacing: '1px' }}>{relatorio?.subtitulo_capa || 'Gerenciamento de Obra'}</h2>
            </div>
            <div className="absolute z-30" style={{ top: '50%', right: '-3%', width: '45%', padding: '1.3% 2.5%', textAlign: 'center' }}>
                <h1 className="font-black uppercase" style={{ fontSize: '28px', lineHeight: '1.0', fontFamily: "'Inter', sans-serif", marginBottom: '6px', color: 'black' }}>{relatorio?.titulo_inspecao || 'INSPEÇÃO DAS INSTALAÇÕES ELÉTRICAS'}</h1>
                <h2 className="text-gray-600 font-medium" style={{ fontSize: '16px', fontFamily: "'Inter', sans-serif" }}>{relatorio?.descricao_inspecao || ''}</h2>
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
            <table className="w-full border-collapse table-fixed" style={{ fontSize: '12px' }}>
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-black p-2 text-left" style={{ width: '40%' }}>Descrição</th>
                        <th className="border border-black p-2 text-center" style={{ width: '8%' }}>Recebido</th>
                        <th className="border border-black p-2 text-left" style={{ width: '52%' }}>Observações</th>
                    </tr>
                </thead>
                <tbody>
                    {itens.map((item, idx) => (
                        <tr key={idx}>
                            <td className="border border-black p-2" style={{ width: '40%' }}>{item.descricao}</td>
                            <td className="border border-black p-2 text-center" style={{ width: '8%' }}>
                                <span style={{ display: 'inline-block', width: '12px', height: '12px', minWidth: '12px', minHeight: '12px', border: '1px solid #555', backgroundColor: item.resultado === 'OK' ? '#1d4ed8' : 'white', color: 'white', fontSize: '9px', lineHeight: '12px', textAlign: 'center', boxSizing: 'border-box' }}>{item.resultado === 'OK' ? '✓' : ''}</span>
                            </td>
                            <td className="border border-black p-2" style={{ width: '52%' }}>{item.observacoes}</td>
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

const FotoInspecao = ({ url, legenda }) => {
    return (
        <div className="imagem-box" style={{ textAlign: 'left', marginBottom: '0px', boxSizing: 'border-box' }}>
            <img src={url} alt={legenda || 'Foto da inspeção'} />
            {legenda && (
                <p style={{ fontSize: '7px', color: '#555', marginTop: '4px', lineHeight: '1.1', overflowWrap: 'anywhere', whiteSpace: 'normal' }}>{legenda}</p>
            )}
        </div>
    );
};

const ContentPage = ({ local, items, isFirstPageOfLocal, combineWithDoc, relatorio }) => {
    const chunkFotos = (fotos, size = 3) => {
        const chunks = [];
        for (let i = 0; i < fotos.length; i += size) {
            chunks.push(fotos.slice(i, i + size));
        }
        return chunks;
    };

    return (
        <div className={combineWithDoc ? "px-4 pb-4" : (isFirstPageOfLocal ? "p-4" : "px-4 pt-6 pb-4")}>
            {items && items.length > 0 && (
                <div>
                    {isFirstPageOfLocal && (
                        <>
                            <h3 className="text-lg font-bold mb-2 bg-blue-900 text-white p-2 text-center">{relatorio?.titulo_secao_inspecao || 'Inspeção Física – Quadros'}</h3>
                            <div className="mb-4 border border-black">
                                <div className="p-2">
                                    <span className="font-bold">{relatorio?.label_local || 'LOCAL:'} </span>{local.nome_local}
                                </div>
                            </div>
                            <p className="text-[9px] text-gray-600 italic mb-1">Tique se for OK ✓, NA - Não se aplica. Caso contrário, faça um comentário.</p>
                        </>
                    )}
                    <table className="w-full border-collapse text-xs table-fixed">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-black p-2 text-left" style={{ width: '40%' }}>Descrição</th>
                                <th className="border border-black p-2 text-center" style={{ width: '6%' }}>OK</th>
                                <th className="border border-black p-2 text-center" style={{ width: '6%' }}>N/OK</th>
                                <th className="border border-black p-2 text-center" style={{ width: '6%' }}>NA</th>
                                <th className="border border-black p-2 text-left" style={{ width: '42%' }}>Observações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, idx) => {
                                const isComentario = item.tipo === 'comentario' || item.isComentarioGeral;
                                const fotosValidas = (item.fotos || []).filter((foto) => foto && typeof foto.url === 'string' && foto.url.trim() !== '');

                                if (isComentario) {
                                    return (
                                        <tr key={idx} className="bg-gray-50" style={{ pageBreakInside: 'avoid', pageBreakAfter: 'auto' }}>
                                            <td className="border border-black p-2 font-bold" style={{ verticalAlign: 'top', fontSize: '12px' }}>Comentários:</td>
                                            <td className="border border-black p-2" colSpan="4" style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'break-word', maxWidth: '500px', fontSize: '12px' }}>{item.texto || item.comentarios || ''}</td>
                                        </tr>
                                    );
                                }

                                if (item.showOnlyPhotos) {
                                    const linhasDeFotos = chunkFotos(fotosValidas, 3);
                                    return (
                                        <React.Fragment key={idx}>
                                            {linhasDeFotos.map((linha, linhaIdx) => (
                                                <tr key={`${idx}-linha-${linhaIdx}`} className="photo-row" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
                                                    <td colSpan="5" className="border border-black p-0" style={{ verticalAlign: 'top' }}>
                                                        {linhaIdx === 0 && (
                                                            item.descricao ? <div style={{ fontSize: '9px', color: '#666', fontStyle: 'italic', margin: '4px 4px 3px 4px' }}>{item.descricao}</div> : null
                                                        )}
                                                        <div className="imagens-container">
                                                            {linha.map((foto, fotoIdx) => (
                                                                <FotoInspecao key={`${idx}-${linhaIdx}-${fotoIdx}`} url={foto.url} legenda={foto.legenda} />
                                                            ))}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                }

                                return (
                                    <React.Fragment key={idx}>
                                        <tr style={{ pageBreakInside: 'avoid' }}>
                                            <td className="border border-black p-2" style={{ width: '40%', wordWrap: 'break-word', wordBreak: 'break-word', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap', verticalAlign: 'top', fontSize: '11px' }}>{item.descricao}</td>
                                            <td className="border border-black p-2 text-center" style={{ width: '6%', verticalAlign: 'middle' }}>
                                                <span style={{ display: 'inline-block', width: '12px', height: '12px', minWidth: '12px', minHeight: '12px', border: '1px solid #555', backgroundColor: item.resultado === 'OK' ? '#1d4ed8' : 'white', color: 'white', fontSize: '9px', lineHeight: '12px', textAlign: 'center', boxSizing: 'border-box' }}>{item.resultado === 'OK' ? '✓' : ''}</span>
                                            </td>
                                            <td className="border border-black p-2 text-center" style={{ width: '6%', verticalAlign: 'middle' }}>
                                                <span style={{ display: 'inline-block', width: '12px', height: '12px', minWidth: '12px', minHeight: '12px', border: '1px solid #555', backgroundColor: item.resultado === 'N/OK' ? '#1d4ed8' : 'white', color: 'white', fontSize: '9px', lineHeight: '12px', textAlign: 'center', boxSizing: 'border-box' }}>{item.resultado === 'N/OK' ? '✓' : ''}</span>
                                            </td>
                                            <td className="border border-black p-2 text-center" style={{ width: '6%', verticalAlign: 'middle' }}>
                                                <span style={{ display: 'inline-block', width: '12px', height: '12px', minWidth: '12px', minHeight: '12px', border: '1px solid #555', backgroundColor: item.resultado === 'Não' ? '#1d4ed8' : 'white', color: 'white', fontSize: '9px', lineHeight: '12px', textAlign: 'center', boxSizing: 'border-box' }}>{item.resultado === 'Não' ? '✓' : ''}</span>
                                            </td>
                                            <td className="border border-black p-2" style={{ width: '42%', wordWrap: 'break-word', wordBreak: 'break-word', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap', verticalAlign: 'top', fontSize: '11px' }}>{item.observacoes || ''}</td>
                                        </tr>
                                        {fotosValidas.length > 0 && chunkFotos(fotosValidas, 3).map((linha, linhaIdx) => (
                                            <tr key={`${idx}-fotos-${linhaIdx}`} className="photo-row" style={{ pageBreakInside: 'avoid', breakInside: 'avoid', pageBreakBefore: 'auto' }}>
                                                <td colSpan="5" className="border border-black p-0" style={{ verticalAlign: 'top' }}>
                                                    <div className="imagens-container">
                                                        {linha.map((foto, fotoIdx) => (
                                                            <FotoInspecao key={`${idx}-${linhaIdx}-${fotoIdx}`} url={foto.url} legenda={foto.legenda} />
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
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
    const logoHorizontalUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/4bd521d1e_LOGOHORIZONTAl.png";
    const HEADER_HEIGHT = pageNumber > 1 ? '80px' : '0px';
    const FOOTER_HEIGHT = '45px';
    const PAGE_HEIGHT = '297mm';
    const isCover = pageNumber === 1;

    return (
        <div className="report-page" style={{ height: PAGE_HEIGHT, boxSizing: 'border-box', pageBreakAfter: 'always', WebkitPageBreakAfter: 'always', breakAfter: 'page', overflow: isCover ? 'hidden' : 'visible' }}>
            {!isCover && (
                <div className="flex justify-between items-center border-b border-gray-200 bg-white" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_HEIGHT, zIndex: 100, padding: '4px 8px', maxWidth: '210mm', boxSizing: 'border-box' }}>
                    <img src={logoHorizontalUrl} alt="Logo Interativa Engenharia" style={{ height: '32px', maxWidth: '120px', objectFit: 'contain' }} />
                    <div className="text-right" style={{ flex: 1, paddingLeft: '8px', overflow: 'hidden' }}>
                        <h2 className="text-[10px] font-bold text-gray-800 uppercase leading-tight truncate">{relatorio?.titulo_relatorio || 'INSPEÇÃO DE INSTALAÇÕES ELÉTRICAS'}</h2>
                        <p className="text-[9px] text-gray-600 leading-tight truncate">{empreendimento?.nome_empreendimento} - {relatorio?.cliente}</p>
                        <p className="text-[9px] font-medium text-gray-800 leading-tight">{relatorio?.data_inspecao ? format(new Date(relatorio.data_inspecao), 'dd/MM/yyyy', { locale: ptBR }) : ''}</p>
                    </div>
                </div>
            )}
            <div className="page-content" style={{ paddingTop: HEADER_HEIGHT, paddingBottom: FOOTER_HEIGHT, minHeight: `calc(${PAGE_HEIGHT} - ${HEADER_HEIGHT} - ${FOOTER_HEIGHT})`, overflow: 'visible', boxSizing: 'border-box' }}>
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
            <div className="border border-black p-4 whitespace-pre-wrap min-h-[100px]" style={{ fontSize: '12px' }}>{observacoes || ''}</div>
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
                    {opcoes.map(opcao => (
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
                    {opcoes.map(opcao => (
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

    const hasDocumentacao = relatorio.itens_documentacao && relatorio.itens_documentacao.length > 0;

    // Paginação por altura real para quebrar no ponto exato antes do overflow
    const paginateLocalItems = (local, opts) => paginateLocalItemsForPrinting(local, opts);

    const combineDocWithContent = false;

    const contentPages = (relatorio.locais && relatorio.locais.length > 0)
        ? relatorio.locais.flatMap((local) =>
            paginateLocalItems(local, {
                pageHeightPx: 1122,
                headerHeightPx: 80,
                footerHeightPx: 45,
                pagePaddingPx: 12,
                // Keep estimate aligned with fixed photo box height (180px) plus spacing/caption.
                photoMaxHeightPx: 200,
                maxPhotosPerItem: 3,
                itemBufferPx: 10,
                // Conservative values were creating large blank areas before breaking.
                safetyMarginPx: 24,
                footerGuardPx: 16,
                breakBeforeLimitPx: 24,
                firstPageExtraHeightPx: 90,
            })
        )
        : [];

    const hasAssinaturas = relatorio.assinaturas && relatorio.assinaturas.length > 0 &&
        relatorio.assinaturas.some(ass => (ass.nome && ass.nome.trim() !== '') || (ass.parte && ass.parte.trim() !== '') || (ass.assinatura_imagem && ass.assinatura_imagem.trim() !== ''));

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
                    <h1 className="text-xl font-semibold text-gray-800">Visualizar Inspeção Elétrica</h1>
                    <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700 text-white"><Printer className="w-4 h-4 mr-2" />Gerar PDF</Button>
                </div>
            </div>
            <div className="report-container max-w-4xl mx-auto" style={{ padding: 0 }}>
                <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                    <CoverPage relatorio={relatorio} empreendimento={empreendimento} />
                </ReportPageLayout>

                {hasDocumentacao && combineDocWithContent && contentPages.length > 0 ? (
                    <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                        <DocumentacaoPage itens={relatorio.itens_documentacao} comentarios={relatorio.comentarios_documentacao} />
                        <ContentPage local={contentPages[0].local} items={contentPages[0].items} isFirstPageOfLocal={contentPages[0].isFirstPageOfLocal} combineWithDoc={true} relatorio={relatorio} />
                    </ReportPageLayout>
                ) : (
                    <>
                        {hasDocumentacao && (
                            <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                                <DocumentacaoPage itens={relatorio.itens_documentacao} comentarios={relatorio.comentarios_documentacao} />
                            </ReportPageLayout>
                        )}
                    </>
                )}

                {contentPages.map((page, index) => {
                    if (combineDocWithContent && index === 0) return null;
                    return (
                        <ReportPageLayout key={index} pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                            <ContentPage local={page.local} items={page.items} isFirstPageOfLocal={page.isFirstPageOfLocal} combineWithDoc={false} relatorio={relatorio} />
                        </ReportPageLayout>
                    );
                })}

                <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                    <ObservacoesGeraisPage observacoes={relatorio.observacoes_gerais} />
                    <ConclusaoPage
                        conclusaoR01={relatorio.conclusao_r01}
                        conclusaoR02={relatorio.conclusao_r02}
                    />
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
                
                * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    color-adjust: exact !important;
                }
                
                @page { size: A4 portrait; margin: 0; }
                
                .report-page { 
                    width: 210mm; 
                    min-height: 297mm;
                    height: auto;
                    position: relative; 
                    background: white; 
                    overflow: visible;
                }

                .imagens-container {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 8px;
                    width: 100%;
                    align-items: flex-start;
                    break-inside: avoid;
                    page-break-inside: avoid;
                }

                .imagem-box {
                    flex: 0 0 calc((100% - 16px) / 3);
                    max-width: calc((100% - 16px) / 3);
                    width: calc((100% - 16px) / 3);
                    height: 180px;
                    overflow: hidden;
                    break-inside: avoid;
                    page-break-inside: avoid;
                }

                .imagem-box img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    border-radius: 6px;
                    break-inside: avoid;
                    page-break-inside: avoid;
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
                        break-after: page;
                        width: 210mm !important; 
                        height: 297mm !important;
                        min-height: unset !important;
                        margin: 0 !important; 
                        padding: 0 !important; 
                        box-shadow: none !important; 
                        /* Restore clipping so each report page occupies full A4 */
                        overflow: hidden !important;
                        position: relative !important;
                    }
                    
                    .report-page:last-child { 
                        page-break-after: auto;
                        break-after: auto;
                    }
                    
                    .page-content {
                        overflow: hidden !important;
                        padding-bottom: 45px !important;
                        box-sizing: border-box !important;
                    }
                    
                    img { max-width: 100%; }
                    table { page-break-inside: auto; border-collapse: collapse; }
                    thead { display: table-header-group; }
                    tr { page-break-inside: avoid; }
                    .photo-row { page-break-inside: avoid !important; break-inside: avoid !important; }
                    .imagens-container {
                        display: flex !important;
                        flex-wrap: wrap !important;
                        gap: 8px !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    .imagem-box {
                        flex: 0 0 calc((100% - 16px) / 3) !important;
                        max-width: calc((100% - 16px) / 3) !important;
                        width: calc((100% - 16px) / 3) !important;
                        height: 180px !important;
                        overflow: hidden !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    .imagem-box img {
                        width: 100% !important;
                        height: 100% !important;
                        object-fit: cover !important;
                        border-radius: 6px !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
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

export default function VisualizarInspecaoEletrica() {
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
                const relatorioData = await base44.entities.InspecaoEletrica.get(relatorioId);
                if (!relatorioData) throw new Error("Relatório não encontrado.");

                const empreendimentoData = await base44.entities.Empreendimento.get(relatorioData.id_empreendimento);
                if (!empreendimentoData) throw new Error("Empreendimento associado não encontrado.");

                // Pré-comprimir todas as imagens antes de usar
                console.log("==== INICIANDO COMPRESSÃO DE IMAGENS ====");

                // Preserve original project/inspection images for print fidelity.
                // Previous aggressive JPEG compression changed visual appearance in PDFs.

                // Comprimir imagens de assinaturas
                if (relatorioData.assinaturas && relatorioData.assinaturas.length > 0) {
                    console.log("Comprimindo assinaturas...");
                    for (const assinatura of relatorioData.assinaturas) {
                        if (assinatura.assinatura_imagem) {
                            assinatura.assinatura_imagem = await compressImage(assinatura.assinatura_imagem, null, 0.2);
                        }
                    }
                }

                console.log("==== TODAS AS IMAGENS COMPRIMIDAS! ====");
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