import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { InspecaoControleAcesso, Empreendimento } from '@/api/entities';
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
                <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: '20px', color: redColor, letterSpacing: '1px' }}>CONTROLE DE ACESSO</h2>
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
    const labels = relatorio.info_sistema_labels || {};
    return (
        <div className="px-4 pt-1 pb-1">
            {relatorio.equipamentos && relatorio.equipamentos.length > 0 && (
                <div className="mb-1">
                    <h3 className="text-sm font-bold text-center mb-0.5 bg-blue-900 text-white p-0.5">Equipamentos do Sistema</h3>
                    <table className="w-full border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
                        <tbody>
                            {relatorio.equipamentos.map((equip, idx) => (
                                <React.Fragment key={idx}>
                                    <tr>
                                        <td className="border border-black p-0.5 text-xs font-bold bg-gray-100" style={{ width: '25%' }}>Nome do Equipamento</td>
                                        <td className="border border-black p-0.5 text-xs" style={{ width: '25%', wordWrap: 'break-word', wordBreak: 'break-word' }}>{equip.nome_equipamento}</td>
                                        <td className="border border-black p-0.5 text-xs font-bold bg-gray-100" style={{ width: '25%' }}>Localização</td>
                                        <td className="border border-black p-0.5 text-xs" style={{ width: '25%', wordWrap: 'break-word', wordBreak: 'break-word' }}>{equip.localizacao}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-0.5 text-xs font-bold bg-gray-100">Fabricante</td>
                                        <td className="border border-black p-0.5 text-xs" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>{equip.fabricante}</td>
                                        <td className="border border-black p-0.5 text-xs font-bold bg-gray-100">Modelo</td>
                                        <td className="border border-black p-0.5 text-xs" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>{equip.modelo}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-black p-0.5 text-xs font-bold bg-gray-100">Número de Série</td>
                                        <td className="border border-black p-0.5 text-xs" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>{equip.numero_serie}</td>
                                        <td className="border border-black p-0.5 text-xs font-bold bg-gray-100">Quantidade</td>
                                        <td className="border border-black p-0.5 text-xs" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>{equip.quantidade}</td>
                                    </tr>
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {relatorio.info_sistema && (
                <div>
                    <h3 className="text-sm font-bold text-center mb-0.5 bg-blue-900 text-white p-1.5">Sistema de Controle de Acesso - Informações do Sistema</h3>
                    <table className="w-full border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
                        <tbody>
                            {relatorio.info_sistema.ctrl_a && (
                                <tr>
                                    <td className="border border-black p-1.5 text-xs font-bold bg-gray-100" style={{ width: '30%' }}>{labels.ctrl_a || 'Ctrl A'}</td>
                                    <td className="border border-black p-1.5 text-xs" colSpan="3" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>{relatorio.info_sistema.ctrl_a}</td>
                                </tr>
                            )}
                            {relatorio.info_sistema.ctrl_b && (
                                <tr>
                                    <td className="border border-black p-1.5 text-xs font-bold bg-gray-100" style={{ width: '30%' }}>{labels.ctrl_b || 'Ctrl B'}</td>
                                    <td className="border border-black p-1.5 text-xs" colSpan="3" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>{relatorio.info_sistema.ctrl_b}</td>
                                </tr>
                            )}
                            {relatorio.info_sistema.servidores && (
                                <tr>
                                    <td className="border border-black p-1.5 text-xs font-bold bg-gray-100" style={{ width: '30%' }}>{labels.servidores || 'Servidor(es)'}</td>
                                    <td className="border border-black p-1.5 text-xs" colSpan="3" style={{ wordWrap: 'break-word', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{relatorio.info_sistema.servidores}</td>
                                </tr>
                            )}
                            {relatorio.info_sistema.leitoras_cartao && (
                                <tr>
                                    <td className="border border-black p-1.5 text-xs font-bold bg-gray-100" style={{ width: '30%' }}>{labels.leitoras_cartao || 'Leitoras Cartão'}</td>
                                    <td className="border border-black p-1.5 text-xs" colSpan="3" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>{relatorio.info_sistema.leitoras_cartao}</td>
                                </tr>
                            )}
                            {relatorio.info_sistema.leitoras_biometricas && (
                                <tr>
                                    <td className="border border-black p-1.5 text-xs font-bold bg-gray-100" style={{ width: '30%' }}>{labels.leitoras_biometricas || 'Leitoras Biométricas'}</td>
                                    <td className="border border-black p-1.5 text-xs" colSpan="3" style={{ wordWrap: 'break-word', wordBreak: 'break-word' }}>{relatorio.info_sistema.leitoras_biometricas}</td>
                                </tr>
                            )}
                            {relatorio.info_sistema.comentarios && (
                                <tr>
                                    <td className="border border-black p-1.5 text-xs font-bold bg-gray-100" style={{ width: '30%' }}>{labels.comentarios || 'Comentários'}</td>
                                    <td className="border border-black p-1.5 text-xs" colSpan="3" style={{ wordWrap: 'break-word', wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{relatorio.info_sistema.comentarios}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const DocumentacaoPage = ({ itens }) => {
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
        </div>
    );
};

const ContentPage = ({ local, items, isFirstPageOfLocal, combineWithDoc, tituloSecao, labelLocalGlobal }) => {
    const titulo = local.titulo_secao || tituloSecao || 'Testes Funcionais - Sistema de Controle de Acesso';
    const displayItems = items;

    // Usa o label do local específico, ou o global, ou o padrão
    const labelLocalCustom = local.label_local || labelLocalGlobal;
    const labelLocal = labelLocalCustom ? `${labelLocalCustom}: ` : 'Porta Controlada - Local: ';
    const nomeLocal = local.nome_local || '';

    return (
        <div className={combineWithDoc ? "px-4 pb-1" : (isFirstPageOfLocal ? "px-4 pt-1 pb-1" : "px-4 pt-0.5 pb-1")}>
            {displayItems && displayItems.length > 0 ? (
                <div>
                    <h3 className="text-sm font-bold mb-0.5 bg-blue-900 text-white p-1 text-center">{titulo}</h3>
                    {isFirstPageOfLocal && (
                        <div className="mb-1 border border-black">
                            <div className="p-1">
                                <span className="font-bold text-xs">{labelLocal}</span><span className="text-xs">{nomeLocal}</span>
                            </div>
                        </div>
                    )}
                    <p className="text-[9px] text-gray-600 italic mb-1">Tique se for OK ✓, NA - Não se aplica. Caso contrário, faça um comentário.</p>
                    <table className="w-full border-collapse text-xs table-fixed">
                        <thead>
                            <tr className="bg-gray-100">
                                <th className="border border-black p-1 text-left text-xs" style={{ width: '40%' }}>Descrição</th>
                                <th className="border border-black p-1 text-center text-xs" style={{ width: '8%' }}>OK</th>
                                <th className="border border-black p-1 text-center text-xs" style={{ width: '8%' }}>NA</th>
                                <th className="border border-black p-1 text-left text-xs" style={{ width: '44%' }}>Observações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayItems.map((item, idx) => {
                                const isComentario = item.tipo === 'comentario' || item.isComentarioGeral;

                                if (isComentario) {
                                    const comentarioText = item.texto || item.comentarios || '';

                                    return (
                                        <tr key={idx} className="bg-gray-50">
                                            <td className="border border-black p-1 font-bold text-xs" style={{ verticalAlign: 'top' }}>Comentários:</td>
                                            <td className="border border-black p-1 text-xs" colSpan="3" style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap', overflowWrap: 'break-word', wordBreak: 'break-word', maxWidth: '500px' }}>{comentarioText}</td>
                                        </tr>
                                    );
                                }

                                return (
                                    <tr key={idx}>
                                        <td className="border border-black p-1 text-xs" style={{ width: '40%', wordWrap: 'break-word', wordBreak: 'break-word', verticalAlign: 'top' }}>{item.descricao}</td>
                                        <td className="border border-black p-1 text-center text-xs" style={{ width: '8%', verticalAlign: 'top' }}>{item.resultado === 'OK' ? '☑' : '☐'}</td>
                                        <td className="border border-black p-1 text-center text-xs" style={{ width: '8%', verticalAlign: 'top' }}>{item.resultado === 'Não' ? '☑' : '☐'}</td>
                                        <td className="border border-black p-1 text-xs" style={{ width: '44%', wordWrap: 'break-word', wordBreak: 'break-word', verticalAlign: 'top' }}>{item.observacoes || ''}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            ) : (
                // Local com só nome (sem itens)
                <div className="mb-1 border border-black">
                    <div className="p-1 bg-gray-50">
                        <span className="font-bold text-xs">{labelLocal}</span><span className="text-xs">{nomeLocal}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

const ReportPageLayout = ({ children, pageNumber, totalPages, relatorio, empreendimento }) => {
    const logoHorizontalCompressed = useCompressedImage("https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/4bd521d1e_LOGOHORIZONTAl.png", 400, 0.7);
    const HEADER_HEIGHT = pageNumber > 1 ? '60px' : '0px';
    const FOOTER_HEIGHT = '35px';
    const isCover = pageNumber === 1;

    return (
        <div className="report-page">
            {!isCover && (
                <div className="flex justify-between items-center border-b border-gray-200 bg-white" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_HEIGHT, zIndex: 100, padding: '4px 8px', maxWidth: '210mm', boxSizing: 'border-box' }}>
                    <img src={logoHorizontalCompressed} alt="Logo Interativa Engenharia" style={{ height: '32px', maxWidth: '120px', objectFit: 'contain' }} />
                    <div className="text-right" style={{ flex: 1, paddingLeft: '8px', overflow: 'hidden' }}>
                        <h2 className="text-[10px] font-bold text-gray-800 uppercase leading-tight truncate">{relatorio?.titulo_relatorio || 'CONTROLE DE ACESSO'}</h2>
                        <p className="text-[9px] text-gray-600 leading-tight truncate">{empreendimento?.nome_empreendimento} - {relatorio?.cliente}</p>
                        <p className="text-[9px] font-medium text-gray-800 leading-tight">{relatorio?.data_inspecao ? format(new Date(relatorio.data_inspecao), 'dd/MM/yyyy', { locale: ptBR }) : ''}</p>
                    </div>
                </div>
            )}
            <div className="page-content" style={{ paddingTop: HEADER_HEIGHT, paddingBottom: FOOTER_HEIGHT, height: '100%', overflow: 'hidden' }}>
                {children}
            </div>
            <div className="border-t border-gray-200 bg-gray-50 flex justify-between items-center text-[9px] text-gray-500" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: FOOTER_HEIGHT, padding: '4px 8px', maxWidth: '210mm', boxSizing: 'border-box' }}>
                <div className="flex-1 text-left leading-tight truncate" style={{ paddingRight: '8px' }}><span className="font-medium">Arquivo: </span><span>{`ICA-${relatorio.id?.slice(-4)}.pdf`}</span></div>
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
    const hasEquipamentos = (relatorio.equipamentos && relatorio.equipamentos.length > 0) || relatorio.info_sistema;

    const equipamentosRowCount = () => {
        let count = 1;
        if (relatorio.equipamentos && relatorio.equipamentos.length > 0) {
            count += 1 + (relatorio.equipamentos.length * 3);
        }
        if (relatorio.info_sistema) {
            count += 7;
        }
        return count;
    };

    const equipRowCount = hasEquipamentos ? equipamentosRowCount() : 0;
    const docItemsCount = hasDocumentacao ? (relatorio.itens_documentacao.length || 0) : 0;

    const combineEquipamentosWithDoc = hasEquipamentos && hasDocumentacao && (equipRowCount + docItemsCount + 1) < 35;

    const paginateAllLocals = (locais, firstPageLimit = 24) => {
        const pages = [];
        const maxItemsPerPage = 45;
        const maxLocalsPerPage = 3; // Máximo de 3 tabelas por página

        let currentPageLocals = [];
        let currentPageWeight = 0;
        let currentPageCapacity = firstPageLimit;

        locais.forEach((local) => {
            const allItems = [...(local.itens_inspecao || [])];
            if (local.comentarios) {
                allItems.push({ tipo: 'comentario', comentarios: local.comentarios, isComentarioGeral: true });
            }

            // Calcular peso do local
            let localWeight = 1.5; // Header weight
            allItems.forEach((item) => {
                const isComentario = item.tipo === 'comentario' || item.isComentarioGeral;
                const comentarioText = item.texto || item.comentarios || '';
                const observacoesText = item.observacoes || '';

                if (isComentario) {
                    const estimatedLines = Math.ceil(comentarioText.length / 120);
                    localWeight += Math.max(1, estimatedLines / 5);
                } else if (observacoesText.length > 300) {
                    localWeight += 1.5;
                } else if (observacoesText.length > 200) {
                    localWeight += 1.2;
                } else if (observacoesText.length > 100) {
                    localWeight += 1.0;
                } else {
                    localWeight += 0.6;
                }
            });

            // Quebra página se: exceder peso OU já tiver 3 locais na página
            const shouldBreakPage = (currentPageWeight + localWeight > currentPageCapacity) ||
                (currentPageLocals.length >= maxLocalsPerPage);

            if (shouldBreakPage && currentPageLocals.length > 0) {
                pages.push({ locals: currentPageLocals });
                currentPageLocals = [];
                currentPageWeight = 0;
                currentPageCapacity = maxItemsPerPage;
            }

            currentPageLocals.push({
                local: local,
                items: allItems,
                isFirstPageOfLocal: true
            });
            currentPageWeight += localWeight;
        });

        // Adiciona última página
        if (currentPageLocals.length > 0) {
            pages.push({ locals: currentPageLocals });
        }

        return pages;
    };

    const combineDocWithContent = hasDocumentacao && docItemsCount <= 12 && !combineEquipamentosWithDoc;

    const firstPageItemLimit = combineDocWithContent ? Math.max(10, 20 - docItemsCount) : 12;

    const contentPages = paginateAllLocals(relatorio.locais, firstPageItemLimit);

    const hasAssinaturas = relatorio.assinaturas && relatorio.assinaturas.length > 0 &&
        relatorio.assinaturas.some(ass => (ass.nome && ass.nome.trim() !== '') || (ass.parte && ass.parte.trim() !== '') || (ass.assinatura_imagem && ass.assinatura_imagem.trim() !== ''));

    const totalPages = 1 + (combineEquipamentosWithDoc ? 1 : 0) + (hasEquipamentos && !combineEquipamentosWithDoc ? 1 : 0) + (hasDocumentacao && !combineDocWithContent && !combineEquipamentosWithDoc ? 1 : 0) + contentPages.length + 1 + (hasAssinaturas ? 1 : 0);
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
                    <h1 className="text-xl font-semibold text-gray-800">Visualizar Inspeção de Controle de Acesso</h1>
                    <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700 text-white"><Printer className="w-4 h-4 mr-2" />Gerar PDF</Button>
                </div>
            </div>
            <div className="report-container max-w-4xl mx-auto" style={{ padding: 0 }}>
                <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                    <CoverPage relatorio={relatorio} empreendimento={empreendimento} />
                </ReportPageLayout>

                {combineEquipamentosWithDoc ? (
                    <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                        <DocumentacaoPage itens={relatorio.itens_documentacao} />
                        <ProjetoEquipamentosPage relatorio={relatorio} />
                    </ReportPageLayout>
                ) : (
                    <>
                        {hasDocumentacao && !combineDocWithContent && (
                            <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                                <DocumentacaoPage itens={relatorio.itens_documentacao} />
                            </ReportPageLayout>
                        )}
                        {hasEquipamentos && (
                            <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                                <ProjetoEquipamentosPage relatorio={relatorio} />
                            </ReportPageLayout>
                        )}
                    </>
                )}

                {contentPages.map((page, index) => {
                    // Na primeira página de conteúdo, combinar com documentação se aplicável
                    const shouldCombineWithDoc = combineDocWithContent && index === 0 && !combineEquipamentosWithDoc;

                    return (
                        <ReportPageLayout key={index} pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                            {shouldCombineWithDoc && hasDocumentacao && (
                                <DocumentacaoPage itens={relatorio.itens_documentacao} />
                            )}
                            {page.locals.map((localData, localIdx) => (
                                <ContentPage
                                    key={localIdx}
                                    local={localData.local}
                                    items={localData.items}
                                    isFirstPageOfLocal={localData.isFirstPageOfLocal}
                                    combineWithDoc={shouldCombineWithDoc}
                                    tituloSecao={relatorio.titulo_secao_inspecao}
                                    labelLocalGlobal={relatorio.label_local}
                                />
                            ))}
                        </ReportPageLayout>
                    );
                })}

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

export default function VisualizarInspecaoControleAcesso() {
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
                const relatorioData = await InspecaoControleAcesso.get(relatorioId);
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