import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { paginateLocaisFlowForVistoriaTecnica } from '@/lib/reportPaginationVistoriaTecnica.js';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, Printer, ArrowLeft, AlertTriangle, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AssinaturasPage } from '@/components/relatorios/AssinaturasSection';
import { toast } from 'sonner';

const isValidId = (id) => id && typeof id === 'string' && id.length > 0;

const escapeHtml = (unsafe) => {
  if (!unsafe && unsafe !== 0) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};



const compressImage = (url, maxWidth = 800, quality = 0.7) => {
    return new Promise((resolve) => {
        if (!url || typeof url !== 'string' || url.startsWith('data:image')) { resolve(url); return; }
        if (url.includes('base44.app/api')) { resolve(url); return; }
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width, height = img.height;
            if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
            canvas.width = width; canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
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
            let cancelled = false;
            compressImage(url, maxWidth, quality).then(r => { if (!cancelled) setCompressedUrl(r); });
            return () => { cancelled = true; };
        } else { setCompressedUrl(url); }
    }, [url, maxWidth, quality]);
    return compressedUrl;
};

const toCssUnit = (value, fallback, defaultUnit = 'px') => {
    if (value === null || value === undefined || value === '') return fallback;
    if (typeof value === 'number') return `${value}${defaultUnit}`;
    return String(value);
};

// ── CAPA ──────────────────────────────────────────────────────────────────────
const CoverPage = ({ relatorio, empreendimento }) => {
    const year = new Date(relatorio?.data_vistoria || Date.now()).getFullYear();
    const redColor = '#CE2D2D';
    const empFoto = useCompressedImage(empreendimento?.foto_empreendimento || 'https://images.unsplash.com/photo-1519947486511-46149fa0a254?w=800&q=80', 800, 0.7);
    const logoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/1a0999f3c_logo_Interativa_letra_branca_sem_fundo_gg.png";
    const coverFrame = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/dca667b3d_erasebg-transformed.png";
    const redDecor = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/513d57969_Designsemnome2.png';
    const bottomFrame = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/10e9b2570_erasebg-transformed.png';
    const logoWhite = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/22086ec44_LOGOPNG-branco.png";
    const rodape = relatorio?.texto_rodape_capa || [empreendimento?.cli_empreendimento, empreendimento?.nome_empreendimento].filter(Boolean).join(' | ');

    // Campos opcionais para customizar a area central da capa (titulo/subtitulo da vistoria).
    const reportAreaStyle = {
        top: toCssUnit(relatorio?.capa_area_top, '50%', '%'),
        right: toCssUnit(relatorio?.capa_area_right, '-3%', '%'),
        left: toCssUnit(relatorio?.capa_area_left, 'auto', '%'),
        width: toCssUnit(relatorio?.capa_area_width, '45%', '%'),
        textAlign: relatorio?.capa_area_align || 'center',
        backgroundColor: relatorio?.capa_area_bg || 'transparent',
        padding: toCssUnit(relatorio?.capa_area_padding, '0', 'px'),
        borderRadius: toCssUnit(relatorio?.capa_area_radius, '0', 'px'),
    };

    const reportTitleStyle = {
        fontSize: toCssUnit(relatorio?.capa_area_titulo_font_size, '26px', 'px'),
        fontFamily: "'Inter', sans-serif",
        color: relatorio?.capa_area_titulo_color || 'black',
        marginBottom: toCssUnit(relatorio?.capa_area_titulo_margin_bottom, '6px', 'px'),
    };

    const reportSubtitleStyle = {
        fontSize: toCssUnit(relatorio?.capa_area_subtitulo_font_size, '16px', 'px'),
        color: relatorio?.capa_area_subtitulo_color || '#4b5563',
    };

    return (
        <>
            <div className="absolute w-full h-full bg-center bg-no-repeat z-10" style={{ backgroundImage: `url(${empFoto})`, backgroundSize: 'cover', opacity: 0.2, top: '-10px', left: '-10px', width: 'calc(100% + 20px)', height: 'calc(100% + 20px)' }} />
            <div className="absolute top-0 left-0 w-full h-full bg-contain bg-left-top bg-no-repeat z-20" style={{ backgroundImage: `url(${coverFrame})`, height: '150%' }} />
            <div className="absolute z-50" style={{ top: '25px', left: '11px', width: '350px', height: '170px' }}>
                <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div className="absolute flex items-center justify-center z-40" style={{ top: '23%', left: '11%', width: '22.7%', height: '25%', transform: 'rotate(27deg)' }}>
                <span className="font-normal text-white" style={{ fontSize: '60px', fontFamily: "'Inter', sans-serif" }}>{year}</span>
            </div>
            <div className="absolute z-30" style={{ top: '10%', right: '8%', width: '50%', textAlign: 'right' }}>
                <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: '64px', fontWeight: 'bold', color: '#394557', lineHeight: '1.1' }}>{relatorio?.titulo_capa || 'RELATÓRIO'}</h1>
                <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: '26px', color: redColor, letterSpacing: '2px' }}>{relatorio?.subtitulo_capa || 'VISTORIA TÉCNICA'}</h2>
            </div>
            <div className="absolute z-30" style={reportAreaStyle}>
                <h1 className="font-black uppercase" style={reportTitleStyle}>{relatorio?.titulo_vistoria || relatorio?.titulo_relatorio || 'RELATÓRIO DE VISTORIA TÉCNICA'}</h1>
                <h2 className="font-medium" style={reportSubtitleStyle}>{relatorio?.descricao_vistoria || ''}</h2>
            </div>
            <div className="absolute z-20" style={{ top: '-350px', right: '-30%', width: '1700px', height: '1150px', backgroundColor: redColor, WebkitMaskImage: `url(${redDecor})`, maskImage: `url(${redDecor})`, WebkitMaskSize: '100% 100%', WebkitMaskRepeat: 'no-repeat' }} />
            <div className="absolute z-50" style={{ top: '-10%', right: '-20%', width: '1800px', height: '800px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={logoWhite} alt="Logo branco" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div className="absolute right-0 w-full h-full bg-no-repeat z-40" style={{ bottom: '-5%', backgroundImage: `url('${bottomFrame}')`, height: '1000%', backgroundSize: '230% auto', backgroundPosition: '65% 100%' }} />
            <div className="absolute z-10" style={{ bottom: '0%', left: '0%', width: '450px', height: '800px', borderRadius: '8px', overflow: 'hidden', clipPath: 'polygon(0 0%, 100% 23%, 100% 100%, 0% 100%)' }}>
                <img src={empFoto} alt={empreendimento?.nome_empreendimento} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div className="absolute flex items-center justify-center z-50" style={{ bottom: '0', left: '0', right: '0', height: '65px', backgroundColor: redColor, clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 5% 100%)', paddingLeft: '15%', paddingRight: '5%' }}>
                <span className="text-white w-full font-normal" style={{ fontSize: '22px', fontFamily: 'Poppins', textAlign: 'center' }}>{rodape}</span>
            </div>
        </>
    );
};

// ── PÁGINA DADOS DO EMPREENDIMENTO ────────────────────────────────────────────
const DadosPage = ({ relatorio, empreendimento }) => (
    <div className="p-4">
        <h2 className="text-base font-bold text-center mb-3 bg-blue-900 text-white p-2">Dados do Empreendimento</h2>
        <table className="w-full border-collapse text-xs">
            <tbody>
                <tr>
                    <td className="border border-black p-2 font-bold bg-gray-50 w-1/4">Cliente</td>
                    <td className="border border-black p-2">{relatorio?.cliente || '-'}</td>
                    <td className="border border-black p-2 font-bold bg-gray-50 w-1/4">Obra</td>
                    <td className="border border-black p-2">{relatorio?.subtitulo_relatorio || empreendimento?.nome_empreendimento || '-'}</td>
                </tr>
                <tr>
                    <td className="border border-black p-2 font-bold bg-gray-50">Endereço</td>
                    <td className="border border-black p-2" colSpan="3">{relatorio?.endereco || empreendimento?.endereco_empreendimento || '-'}</td>
                </tr>
                <tr>
                    <td className="border border-black p-2 font-bold bg-gray-50">Data da Vistoria</td>
                    <td className="border border-black p-2">{relatorio?.data_vistoria ? format(new Date(relatorio.data_vistoria), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</td>
                    <td className="border border-black p-2 font-bold bg-gray-50">Revisão</td>
                    <td className="border border-black p-2">{relatorio?.revisao || '-'}</td>
                </tr>
                <tr>
                    <td className="border border-black p-2 font-bold bg-gray-50">Responsável</td>
                    <td className="border border-black p-2" colSpan="3">{relatorio?.eng_responsavel || '-'}</td>
                </tr>
                {relatorio?.descricao_vistoria && (
                    <tr>
                        <td className="border border-black p-2 font-bold bg-gray-50">Descrição</td>
                        <td className="border border-black p-2 whitespace-pre-wrap" colSpan="3">{relatorio.descricao_vistoria}</td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
);

// ── PAGINAÇÃO DAS CARACTERÍSTICAS GERAIS ────────────────────────────────────
const paginateCaracteristicasSections = (relatorio) => {
    const USABLE = 1122 - 80 - 45 - 8;
    const TITLE_H = 42;
    const estimateHeight = (section) => {
        if (section.type === 'localizacao') return 360;
        if (section.type === 'legenda') return 130;
        const lines = Math.max(1, Math.ceil((section.text || '').length / 85));
        return 34 + lines * 17 + 16;
    };
    const sections = [];
    if (relatorio?.foto_localizacao) sections.push({ type: 'localizacao' });
    if (relatorio?.objetivo) sections.push({ type: 'objetivos', text: relatorio.objetivo });
    if (relatorio?.instalacoes_geral) sections.push({ type: 'instalacoes', text: relatorio.instalacoes_geral });
    sections.push({ type: 'legenda' });

    const pages = [];
    let cur = [], curH = 0, isFirst = true;
    for (const section of sections) {
        const h = estimateHeight(section);
        const extra = isFirst && cur.length === 0 ? TITLE_H : 0;
        if (cur.length > 0 && (curH + h) > USABLE - (isFirst ? TITLE_H : 0)) {
            pages.push({ sections: cur, isFirst });
            cur = []; curH = 0; isFirst = false;
        }
        if (cur.length === 0) curH += extra;
        cur.push(section);
        curH += h;
    }
    if (cur.length > 0) pages.push({ sections: cur, isFirst });
    return pages;
};

// ── TÓPICO 1 — CARACTERÍSTICAS GERAIS ────────────────────────────────────────
const CaracteristicasPage = ({ relatorio, sections, showTitle }) => {
    const fotoUrl = useCompressedImage(relatorio?.foto_localizacao, 700, 0.8);
    return (
        <div className="p-4 space-y-4">
            {showTitle && <h2 className="text-base font-bold text-center bg-blue-900 text-white p-2">Características Gerais</h2>}

            {sections.includes('localizacao') && relatorio?.foto_localizacao && (
                <div>
                    <h3 className="text-xs font-bold bg-gray-100 border border-black p-1 mb-0">Localização do Empreendimento</h3>
                    <div className="border border-black border-t-0 p-2 flex justify-center">
                        <img src={fotoUrl} alt="Localização" style={{ maxHeight: '320px', width: '100%', objectFit: 'contain' }} />
                    </div>
                </div>
            )}

            {sections.includes('objetivos') && relatorio?.objetivo && (
                <div>
                    <h3 className="text-xs font-bold bg-gray-100 border border-black p-1 mb-0">Objetivos</h3>
                    <div className="border border-black border-t-0 p-2 text-xs whitespace-pre-wrap">{relatorio.objetivo}</div>
                </div>
            )}

            {sections.includes('instalacoes') && relatorio?.instalacoes_geral && (
                <div>
                    <h3 className="text-xs font-bold bg-gray-100 border border-black p-1 mb-0">Instalações em Geral</h3>
                    <div className="border border-black border-t-0 p-2 text-xs whitespace-pre-wrap">{relatorio.instalacoes_geral}</div>
                </div>
            )}

            {sections.includes('legenda') && (
                <div>
                    <h3 className="text-xs font-bold bg-gray-100 border border-black p-1 mb-0">Legenda</h3>
                    <div className="border border-black border-t-0">
                        <p className="text-xs p-2 border-b border-black">Foram aplicadas as seguintes abreviações:</p>
                        <table className="w-full text-xs">
                            <tbody>
                                <tr className="border-b border-black">
                                    <td className="border-r border-black p-2 font-bold text-green-700 w-16 text-center">OK</td>
                                    <td className="p-2">Itens em conformidade</td>
                                </tr>
                                <tr className="border-b border-black">
                                    <td className="border-r border-black p-2 font-bold text-yellow-700 text-center">PD</td>
                                    <td className="p-2">Itens pendentes a serem revisados</td>
                                </tr>
                                <tr>
                                    <td className="border-r border-black p-2 font-bold text-blue-700 text-center">SG</td>
                                    <td className="p-2">Itens com sugestão de melhorias</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

// ── FOTO ITEM ─────────────────────────────────────────────────────────────────
const FotoInspecao = ({ url, legenda }) => {
    const compressed = useCompressedImage(url, 600, 0.6);
    return (
        <div className="text-center">
            <div className="foto-inspecao-container" style={{ width: '100%', height: '220px', overflow: 'hidden', border: '1px solid #ddd' }}>
                <img src={compressed} data-original={url} alt={legenda || ''} className="foto-inspecao-img" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
            {legenda && <p className="text-[9px] text-gray-600 mt-1">{legenda}</p>}
        </div>
    );
};

// ── PÁGINA DE INSPEÇÃO ────────────────────────────────────────────────────────
const ContentPage = ({ segments, isFirstPage = false }) => (
    <div className="px-4 pt-6 pb-4">
        {Array.isArray(segments) && segments.length > 0 && (
            <div>
                {isFirstPage && (
                    <h2 className="text-base font-bold text-center bg-blue-900 text-white p-2 mb-3">Inspeção Técnica</h2>
                )}
                {(() => {
                    const renderedTopics = new Set();
                    return segments.map((segment, sIdx) => {
                        const { local, items, showHeader } = segment;
                        const showTableHeader = showHeader && items.some((item) => item.tipo !== 'comentario');
                        const topicKey = (local?.nome_local || 'Inspeção Técnica').trim();
                        const showTopicHeader = showHeader && !renderedTopics.has(topicKey);
                        if (showTopicHeader) renderedTopics.add(topicKey);
                        return (
                            <div key={`${segment.localIndex}-${sIdx}`} className={showHeader ? 'mt-0' : 'mt-3'}>
                                {showHeader && (
                                    <>
                                        {showTopicHeader && (
                                            <div className="text-sm font-bold mb-2 pt-3 pb-1 text-gray-700 uppercase tracking-widest border-b-2 border-gray-400">{local.nome_local || 'Inspeção Técnica'}</div>
                                        )}
                                        {local.nome_local_exibicao && (
                                            <div className="mb-2 text-xs font-bold text-gray-800 bg-gray-100 border border-gray-400 px-3 py-2 uppercase tracking-wide">{local.nome_local_exibicao}</div>
                                        )}
                                        {local.fotos && local.fotos.length > 0 && (
                                            <div className="mb-3 border border-black p-2">
                                                <div className="grid grid-cols-3 gap-2">
                                                    {local.fotos.map((f, fi) => <FotoInspecao key={fi} url={f.url} legenda={f.legenda} />)}
                                                </div>
                                            </div>
                                        )}
                                        {local.descricao_geral && (
                                            <div className="mb-2 border border-black p-2 text-xs whitespace-pre-wrap"><strong>Descrição Geral: </strong>{local.descricao_geral}</div>
                                        )}
                                    </>
                                )}
                                <table className="w-full border-collapse text-xs table-fixed">
                                    {showTableHeader && (
                                        <thead>
                                            <tr className="bg-gray-100">
                                                <th className="border border-black p-2 text-left">Descrição</th>
                                                <th className="border border-black p-2 text-center" style={{ width: '50px' }}>Status</th>
                                            </tr>
                                        </thead>
                                    )}
                                    <tbody>
                                        {items.map((item, idx) => {
                                            if (item.tipo === 'topico') {
                                                return (
                                                    <tr key={idx}>
                                                        <td colSpan="3" style={{ backgroundColor: '#1e3a5f', color: 'white', fontWeight: 'bold', padding: '6px 8px', fontSize: '10px', border: '1px solid #1e3a5f' }}>
                                                            {item.titulo || ''}
                                                        </td>
                                                    </tr>
                                                );
                                            }
                                            if (item.tipo === 'comentario') {
                                                return (
                                                    <tr key={idx}>
                                                        <td colSpan="3" className="border border-black p-2 text-xs whitespace-pre-wrap">
                                                            <strong>Comentários Gerais: </strong>{item.comentarios || ''}
                                                        </td>
                                                    </tr>
                                                );
                                            }
                                            if (item.showOnlyPhotos) {
                                                return (
                                                    <tr key={idx} data-item-group={`item-${idx}`}>
                                                        <td colSpan="3" className="border border-black p-2">
                                                            <div className="text-xs text-gray-500 italic mb-1">{item.descricao}</div>
                                                            <div className="grid grid-cols-3 gap-2">{item.fotos.map((f, fi) => <FotoInspecao key={fi} url={f.url} legenda={f.legenda} />)}</div>
                                                        </td>
                                                    </tr>
                                                );
                                            }
                                            const statusColor = { 'OK': '#16a34a', 'PD': '#dc2626', 'SG': '#2563eb', 'N/OK': '#ea580c' }[item.resultado] || '#6b7280';
                                            return (
                                                <React.Fragment key={idx}>
                                                    <tr data-item-group={`item-${idx}`}>
                                                        <td className="border border-black p-2 align-top font-semibold text-xs">{item.descricao}</td>
                                                        <td className="border border-black p-2 text-center align-top" style={{ width: '50px' }}>
                                                            {item.resultado && <span style={{ color: statusColor, fontWeight: 'bold', fontSize: '11px' }}>{item.resultado}</span>}
                                                        </td>
                                                    </tr>
                                                    {item.observacoes && (
                                                        <tr data-item-group={`item-${idx}`}>
                                                            <td colSpan="2" className="border border-black px-3 py-2 text-xs text-gray-700 whitespace-pre-wrap bg-gray-50"><div className="font-semibold text-gray-500 mb-1">Comentários:</div>{item.observacoes}</td>
                                                        </tr>
                                                    )}
                                                    {item.fotos && item.fotos.length > 0 && (
                                                        <tr data-item-group={`item-${idx}`}>
                                                            <td colSpan="2" className="border border-black p-2">
                                                                <div className="grid grid-cols-3 gap-2">{item.fotos.map((f, fi) => <FotoInspecao key={fi} url={f.url} legenda={f.legenda} />)}</div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        );
                    });
                })()}
            </div>
        )}
    </div>
);

// ── TÓPICO 2 — LISTA MESTRA DE DOCUMENTOS ──────────────────────────────────────
const DOCS_PAGE_HEIGHT = 1122 - 80 - 45 - 8;
const DOCS_HEADER_H = 40 + 34 + 16; // título + thead + padding
const DOCS_ROW_H = 40; // altura conservadora por linha
const DOCS_PER_PAGE = Math.floor((DOCS_PAGE_HEIGHT - DOCS_HEADER_H) / DOCS_ROW_H);

const paginateDocumentos = (documentos) => {
    if (!documentos || documentos.length === 0) return [[]];
    const pages = [];
    for (let i = 0; i < documentos.length; i += DOCS_PER_PAGE) {
        pages.push(documentos.slice(i, i + DOCS_PER_PAGE));
    }
    return pages;
};

const ListaDocumentosPage = ({ documentos }) => (
    <div className="p-4">
        <h2 className="text-base font-bold text-center bg-blue-900 text-white p-2 mb-0">Lista Mestra de Documentos Analisados</h2>
        <table className="w-full border-collapse text-xs table-fixed">
            <thead>
                <tr className="bg-gray-100">
                    <th className="border border-black p-2 text-center" style={{width:'8%'}}>ITEM</th>
                    <th className="border border-black p-2 text-left" style={{width:'30%'}}>DESCRIÇÃO</th>
                    <th className="border border-black p-2 text-left" style={{width:'35%'}}>ARQUIVO</th>
                    <th className="border border-black p-2 text-center" style={{width:'10%'}}>REV</th>
                    <th className="border border-black p-2 text-center" style={{width:'17%'}}>DATA</th>
                </tr>
            </thead>
            <tbody>
                {(documentos || []).map((doc, idx) => (
                    <tr key={idx}>
                        <td className="border border-black p-2 text-center">{doc.des}</td>
                        <td className="border border-black p-2">{doc.descricao}</td>
                        <td className="border border-black p-2 text-black-700">{doc.arquivo}</td>
                        <td className="border border-black p-2 text-center">{doc.rev}</td>
                        <td className="border border-black p-2 text-center">{doc.data}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

// ── TÓPICO 3 — NORMAS TÉCNICAS E CÓDIGOS ────────────────────────────────────────
const NormasTecnicasPage = ({ normas }) => (
    <div className="p-4">
        <h2 className="text-base font-bold text-center bg-blue-900 text-white p-2 mb-0">Normas Técnicas e Códigos</h2>
        <table className="w-full border-collapse text-xs">
            <thead>
                <tr className="bg-gray-100">
                    <th className="border border-black p-2 text-center" style={{width:'30%'}}>NORMA</th>
                    <th className="border border-black p-2 text-center">DESCRIÇÃO</th>
                </tr>
            </thead>
            <tbody>
                {(normas || []).map((n, idx) => (
                    <tr key={idx}>
                        <td className="border border-black p-2 text-center">{n.norma}</td>
                        <td className="border border-black p-2 text-center">{n.descricao}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const estimateQuadroItemHeight = (item) => {
    const descricao = String(item?.descricao || '');
    const comentarios = String(item?.comentarios || '');
    const descricaoLines = Math.max(1, Math.ceil(descricao.length / 90));
    const comentariosLines = comentarios ? Math.max(1, Math.ceil(comentarios.length / 95)) : 0;

    let height = 34 + (descricaoLines - 1) * 14;
    if (comentarios) {
        height += 28 + comentariosLines * 14;
    }
    return height;
};

const paginateQuadroItens = (quadro, opts = {}) => {
    const PAGE_HEIGHT = opts.pageHeightPx || 1122;
    const HEADER = opts.headerHeightPx || 80;
    const FOOTER = opts.footerHeightPx || 45;
    const PADDING = opts.pagePaddingPx || 40;
    const FOOTER_GUARD = opts.footerGuardPx ?? 22;

    const tableHeaderHeight = 34;
    const fotosCount = (quadro?.fotos || []).length;
    const fotoRows = Math.ceil(fotosCount / 3);
    const fotosHeight = fotoRows > 0 ? (fotoRows * 248) + 12 : 0;

    // Reserva conservadora do topo da pagina para evitar estouro no rodape.
    const firstPageOverhead = 120 + fotosHeight;
    const nextPageOverhead = 52;

    const pageLimit = Math.max(120, PAGE_HEIGHT - HEADER - FOOTER - PADDING - FOOTER_GUARD);
    const items = Array.isArray(quadro?.itens) ? quadro.itens : [];

    if (items.length === 0) return [[]];

    const pages = [];
    let current = [];
    let used = 0;
    let pageIndex = 0;

    const getCapacity = (idx) => {
        const overhead = idx === 0 ? firstPageOverhead : nextPageOverhead;
        return Math.max(120, pageLimit - overhead - tableHeaderHeight);
    };

    for (const item of items) {
        const itemHeight = estimateQuadroItemHeight(item);
        const capacity = getCapacity(pageIndex);

        if (current.length > 0 && used + itemHeight > capacity) {
            pages.push(current);
            current = [];
            used = 0;
            pageIndex += 1;
        }

        current.push(item);
        used += itemHeight;
    }

    if (current.length > 0) pages.push(current);
    return pages;
};

// ── LAYOUT PROPOSTO ─────────────────────────────────────────────────────────
const LayoutFotoItem = ({ url, legenda }) => {
    const compressed = useCompressedImage(url, 700, 0.8);
    return (
        <div style={{ width: '100%' }}>
            <img src={compressed} alt={legenda || ''} style={{ maxHeight: '320px', width: '100%', objectFit: 'contain', display: 'block' }} />
            {legenda && <p className="text-[9px] text-gray-600 mt-1 text-center">{legenda}</p>}
        </div>
    );
};

const LayoutPropostoPage = ({ relatorio }) => {
    const fotos = relatorio?.fotos_layout_proposto || [];
    // fallback para campo antigo (foto_layout_proposto)
    const fotosEffective = fotos.length > 0 ? fotos : (relatorio?.foto_layout_proposto ? [{ url: relatorio.foto_layout_proposto, legenda: '' }] : []);
    return (
        <div className="p-4 space-y-4">
            <h2 className="text-base font-bold text-center bg-blue-900 text-white p-2">Layout Proposto</h2>
            {fotosEffective.length > 0 && (
                <div>
                    <h3 className="text-xs font-bold bg-gray-100 border border-black p-1 mb-0">Layout do Empreendimento</h3>
                    <div className="border border-black border-t-0 p-2 flex flex-col gap-4 items-center">
                        {fotosEffective.map((foto, fi) => <LayoutFotoItem key={fi} url={foto.url} legenda={foto.legenda} />)}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── QUADROS GERAIS ───────────────────────────────────────────────────────────
const QuadrosGeraisPage = ({ quadro, itens, showTitle = true, showQuadroHeader = true }) => (
    <div className="p-4 space-y-6">
        {showTitle && <h2 className="text-base font-bold text-center bg-blue-900 text-white p-2">Quadros Gerais</h2>}
        <div>
            <h3 className="text-xs font-bold bg-gray-200 border border-black p-1 mb-0 uppercase">{quadro?.nome_topico || 'Quadro'}</h3>
            {showQuadroHeader ? (
                <>
                    <div className="border border-black border-t-0 p-2 text-xs space-y-1 mb-2">
                        {quadro?.nome_local && <p><strong>Local:</strong> {quadro.nome_local}</p>}
                        {quadro?.nomenclatura && <p><strong>Nomenclatura:</strong> {quadro.nomenclatura}</p>}
                    </div>
                    {quadro?.fotos && quadro.fotos.length > 0 && (
                        <div className="border border-black border-t-0 p-2 mb-2">
                            <div className="grid grid-cols-3 gap-2">
                                {quadro.fotos.map((f, fi) => <FotoInspecao key={fi} url={f.url} legenda={f.legenda} />)}
                            </div>
                        </div>
                    )}
                </>
            ) : (
                <div className="border border-black border-t-0 p-2 text-[10px] text-gray-600 mb-2">
                    Continuação — {quadro?.nomenclatura || quadro?.nome_topico || 'Quadro'}
                </div>
            )}
            {itens && itens.length > 0 && (
                <table className="w-full border-collapse text-xs table-fixed mb-2">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-black p-2 text-left">Descrição</th>
                            <th className="border border-black p-2 text-center" style={{width:'50px'}}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {itens.map((item, iIdx) => {
                            const statusColor = {'OK':'#16a34a','PD':'#dc2626','SG':'#2563eb','N/OK':'#ea580c'}[item.resultado] || '#6b7280';
                            return (
                                <React.Fragment key={iIdx}>
                                    <tr>
                                        <td className="border border-black p-2 font-semibold">{item.descricao}</td>
                                        <td className="border border-black p-2 text-center">
                                            {item.resultado && <span style={{color: statusColor, fontWeight:'bold', fontSize:'11px'}}>{item.resultado}</span>}
                                        </td>
                                    </tr>
                                    {item.comentarios && (
                                        <tr>
                                            <td colSpan="2" className="border border-black px-3 py-2 text-xs text-gray-700 whitespace-pre-wrap bg-gray-50">
                                                <div className="font-semibold text-gray-500 mb-1">Comentários:</div>{item.comentarios}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    </div>
);

// ── CONCLUSÃO ─────────────────────────────────────────────────────────────────

const ReportPageLayout = ({ children, pageNumber, totalPages, relatorio, empreendimento }) => {
    const logo = useCompressedImage("https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/4bd521d1e_LOGOHORIZONTAl.png", 400, 0.7);
    const HEADER = pageNumber > 1 ? '80px' : '0px';
    const FOOTER = '45px';
    const isCover = pageNumber === 1;
    const pageBreakStyle = {
        overflow: isCover ? 'hidden' : 'visible',
        pageBreakAfter: pageNumber === totalPages ? 'auto' : 'always',
        WebkitPageBreakAfter: pageNumber === totalPages ? 'auto' : 'always',
        breakAfter: pageNumber === totalPages ? 'auto' : 'page',
    };

    return (
        <div className="report-page" style={pageBreakStyle}>
            {pageNumber > 1 && (
                <div className="flex justify-between items-center border-b border-gray-200 bg-white" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HEADER, zIndex: 100, padding: '4px 8px' }}>
                    <img src={logo} alt="Logo" style={{ height: '32px', maxWidth: '120px', objectFit: 'contain' }} />
                    <div className="text-right" style={{ flex: 1, paddingLeft: '8px' }}>
                        <h2 className="text-[10px] font-bold text-gray-800 uppercase truncate">{relatorio?.titulo_relatorio || 'VISTORIA TÉCNICA'}</h2>
                        <p className="text-[9px] text-gray-600 truncate">{empreendimento?.nome_empreendimento} - {relatorio?.cliente}</p>
                        <p className="text-[9px] font-medium text-gray-800">{relatorio?.data_vistoria ? format(new Date(relatorio.data_vistoria), 'dd/MM/yyyy', { locale: ptBR }) : ''}</p>
                    </div>
                </div>
            )}
            <div className="page-content" style={{ paddingTop: HEADER, paddingBottom: isCover ? '0px' : FOOTER, height: isCover ? '100%' : 'auto', overflow: isCover ? 'hidden' : 'visible' }}>
                {children}
            </div>
            {!isCover && (
                <div className="border-t border-gray-200 bg-gray-50 flex justify-between items-center text-[9px] text-gray-500" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: FOOTER, padding: '4px 8px' }}>
                    <div className="flex-1 text-left"><span className="font-medium">Arquivo: </span>{relatorio?.nome_arquivo ? `${relatorio.nome_arquivo}.pdf` : `VT-${relatorio?.id?.slice(-4)}.pdf`}</div>
                    <div className="flex-1 flex flex-col items-center text-[8px]"><span>INTERATIVA ENGENHARIA</span><span>www.interativaengenharia.com.br</span></div>
                    <div className="flex-1 text-right">Página {pageNumber} de {totalPages}</div>
                </div>
            )}
        </div>
    );
};

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────
export default function VisualizarVistoriaTecnica() {
    const navigate = useNavigate();
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const vistoriaId = params.get('vistoriaId');
    const empreendimentoId = params.get('empreendimentoId');

    const [relatorio, setRelatorio] = useState(null);
    const [empreendimento, setEmpreendimento] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editCoverOpen, setEditCoverOpen] = useState(false);
    const [savingCover, setSavingCover] = useState(false);
    const [editedCoverData, setEditedCoverData] = useState({});

    useEffect(() => {
        document.documentElement.style.colorScheme = 'light';
        return () => { document.documentElement.style.colorScheme = ''; };
    }, []);

    useEffect(() => {
        if (!isValidId(vistoriaId)) { setError("ID da vistoria inválido."); setLoading(false); return; }
        const fetchData = async () => {
            try {
                const data = await base44.entities.VistoriaTecnica.get(vistoriaId);
                if (!data) throw new Error("Vistoria não encontrada.");
                const emp = await base44.entities.Empreendimento.get(data.id_empreendimento);
                setRelatorio(data);
                setEmpreendimento(emp);
            } catch (err) { setError(err.message); }
            finally { setLoading(false); }
        };
        fetchData();
    }, [vistoriaId]);

    if (loading) return <div className="flex flex-col items-center justify-center min-h-screen"><Loader2 className="h-12 w-12 animate-spin text-blue-600" /><p className="mt-4 text-gray-600">Carregando relatório...</p></div>;
    if (error) return (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
            <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-red-700 mb-2">Erro ao carregar relatório</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
        </div>
    );

    const estimateFirstPageExtra = (local) => {
            // Base: titulo do local + thead + diferenca de padding entre paginas
            let extra = 66;
      if (local.nome_local_exibicao) extra += 26;
      if (local.fotos && local.fotos.length > 0) {
        const rows = Math.ceil(local.fotos.length / 3);
                // 220px imagem + legenda eventual + espacamentos
                extra += rows * 248;
      }
      if (local.descricao_geral) {
        const lines = Math.ceil((local.descricao_geral.length || 0) / 85);
        extra += 24 + lines * 16;
      }
      return extra;
    };

    const hasLocais = relatorio.locais && relatorio.locais.length > 0;
    const hasQuadros = relatorio.quadros_gerais && relatorio.quadros_gerais.length > 0;
    const paginatedQuadros = hasQuadros
        ? relatorio.quadros_gerais.map((quadro) => ({
            quadro,
            itemPages: paginateQuadroItens(quadro, {
                pageHeightPx: 1122,
                headerHeightPx: 80,
                footerHeightPx: 45,
                pagePaddingPx: 40,
                footerGuardPx: 22,
            }),
        }))
        : [];
    const hasAssinaturas = relatorio.assinaturas && relatorio.assinaturas.length > 0 &&
        relatorio.assinaturas.some(ass => (ass.nome && ass.nome.trim() !== '') || (ass.parte && ass.parte.trim() !== '') || (ass.assinatura_imagem && ass.assinatura_imagem.trim() !== ''));
        const contentPages = hasLocais
                ? paginateLocaisFlowForVistoriaTecnica(relatorio.locais, {
                        pageHeightPx: 1122,
                        headerHeightPx: 80,
                        footerHeightPx: 45,
                        pagePaddingPx: 40,
                        footerGuardPx: 22,
                        breakBeforeLimitPx: 16,
                        compactionSlackPx: 36,
                        splitPhotoRows: true,
                        photoChunkSize: 2,
                        photoMaxHeightPx: 220,
                        photoCaptionHeightPx: 14,
                        estimateFirstPageExtra,
                    })
                : [];
    const caracteristicasPages = paginateCaracteristicasSections(relatorio);
    const remainingSectionsCheck = caracteristicasPages.flatMap(p => p.sections).filter(s => s.type !== 'localizacao');
    const hasRemainingPage = remainingSectionsCheck.length > 0;
    const hasListaDocs = relatorio.lista_documentos && relatorio.lista_documentos.length > 0;
    const hasNormas = relatorio.normas_tecnicas && relatorio.normas_tecnicas.length > 0;
    const docPages = hasListaDocs ? paginateDocumentos(relatorio.lista_documentos) : [];
    const docsAndNormasSamePage = hasListaDocs && hasNormas && docPages.length === 1;
    const docsNormasPageCount = docsAndNormasSamePage ? 1 : docPages.length + (hasNormas ? 1 : 0);
    const quadrosPageCount = hasQuadros
        ? paginatedQuadros.reduce((acc, entry) => acc + entry.itemPages.length + (entry.quadro.itens_analisados || (entry.quadro.notas && entry.quadro.notas.length > 0) ? 1 : 0), 0)
        : 0;
    const hasConclusao = relatorio.conclusao_final && relatorio.conclusao_final.trim().length > 0;
    const hasLayoutProposto = (relatorio.fotos_layout_proposto && relatorio.fotos_layout_proposto.length > 0) || !!relatorio.foto_layout_proposto;
    const totalPages = 1 + 1 + (hasRemainingPage ? 1 : 0) + docsNormasPageCount + (hasLayoutProposto ? 1 : 0) + contentPages.length + quadrosPageCount + (hasConclusao ? 1 : 0) + (hasAssinaturas ? 1 : 0);
    let pg = 1;

    const handlePrint = async () => {
        await new Promise(r => setTimeout(r, 100));
        window.print();
    };

    const handleOpenEditCover = () => {
        setEditedCoverData({
            titulo_capa: relatorio?.titulo_capa || 'RELATORIO',
            subtitulo_capa: relatorio?.subtitulo_capa || 'VISTORIA TECNICA',
            texto_rodape_capa: relatorio?.texto_rodape_capa || '',
            capa_area_top: relatorio?.capa_area_top || '50%',
            capa_area_right: relatorio?.capa_area_right || '-3%',
            capa_area_left: relatorio?.capa_area_left || '',
            capa_area_width: relatorio?.capa_area_width || '45%',
            capa_area_align: relatorio?.capa_area_align || 'center',
            capa_area_bg: relatorio?.capa_area_bg || 'transparent',
            capa_area_padding: relatorio?.capa_area_padding || '0',
            capa_area_radius: relatorio?.capa_area_radius || '0',
            capa_area_titulo_font_size: relatorio?.capa_area_titulo_font_size || '26px',
            capa_area_titulo_color: relatorio?.capa_area_titulo_color || '#000000',
            capa_area_titulo_margin_bottom: relatorio?.capa_area_titulo_margin_bottom || '6px',
            capa_area_subtitulo_font_size: relatorio?.capa_area_subtitulo_font_size || '16px',
            capa_area_subtitulo_color: relatorio?.capa_area_subtitulo_color || '#4b5563',
        });
        setEditCoverOpen(true);
    };

    const handleSaveCover = async () => {
        if (!relatorio?.id) return;
        setSavingCover(true);
        try {
            const payload = {
                titulo_capa: editedCoverData.titulo_capa || '',
                subtitulo_capa: editedCoverData.subtitulo_capa || '',
                texto_rodape_capa: editedCoverData.texto_rodape_capa || '',
                capa_area_top: editedCoverData.capa_area_top || '',
                capa_area_right: editedCoverData.capa_area_right || '',
                capa_area_left: editedCoverData.capa_area_left || '',
                capa_area_width: editedCoverData.capa_area_width || '',
                capa_area_align: editedCoverData.capa_area_align || 'center',
                capa_area_bg: editedCoverData.capa_area_bg || 'transparent',
                capa_area_padding: editedCoverData.capa_area_padding || '',
                capa_area_radius: editedCoverData.capa_area_radius || '',
                capa_area_titulo_font_size: editedCoverData.capa_area_titulo_font_size || '',
                capa_area_titulo_color: editedCoverData.capa_area_titulo_color || '',
                capa_area_titulo_margin_bottom: editedCoverData.capa_area_titulo_margin_bottom || '',
                capa_area_subtitulo_font_size: editedCoverData.capa_area_subtitulo_font_size || '',
                capa_area_subtitulo_color: editedCoverData.capa_area_subtitulo_color || '',
            };

            await base44.entities.VistoriaTecnica.update(relatorio.id, payload);
            setRelatorio((prev) => ({ ...prev, ...payload }));
            setEditCoverOpen(false);
            toast.success('Campos da capa atualizados!');
        } catch (saveError) {
            toast.error('Nao foi possivel salvar os campos da capa.');
        } finally {
            setSavingCover(false);
        }
    };

    return (
        <div className="bg-gray-200 print:bg-white min-h-screen font-sans">
            <div className="no-print shadow-sm border-b p-4 mb-4 bg-white">
                <div className="flex justify-between items-center max-w-4xl mx-auto">
                    <Button onClick={() => navigate(empreendimentoId ? createPageUrl(`EmpreendimentoVistoriaTecnica?empreendimentoId=${empreendimentoId}`) : -1)} variant="outline">
                        <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                    </Button>
                    <h1 className="text-xl font-semibold text-gray-800">Visualizar Vistoria Técnica</h1>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={handleOpenEditCover}><Edit2 className="w-4 h-4 mr-2" />Editar Capa</Button>
                        <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700 text-white"><Printer className="w-4 h-4 mr-2" />Gerar PDF</Button>
                    </div>
                </div>
            </div>

            <div className="report-container max-w-4xl mx-auto" style={{ padding: 0 }}>
                {/* Capa */}
                <ReportPageLayout pageNumber={pg++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                    <CoverPage relatorio={relatorio} empreendimento={empreendimento} />
                </ReportPageLayout>

                {/* Dados do Empreendimento + Localização */}
                <ReportPageLayout pageNumber={pg++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                    <div>
                        <DadosPage relatorio={relatorio} empreendimento={empreendimento} />
                        {relatorio?.foto_localizacao && (
                            <CaracteristicasPage
                                relatorio={relatorio}
                                sections={['localizacao']}
                                showTitle={true}
                            />
                        )}
                    </div>
                </ReportPageLayout>

                {/* Tópico 1 — Características Gerais (objetivos, instalações, legenda) */}
                {(() => {
                    const remainingSections = caracteristicasPages
                        .flatMap(p => p.sections)
                        .filter(s => s.type !== 'localizacao');
                    if (remainingSections.length === 0) return null;
                    return (
                        <ReportPageLayout pageNumber={pg++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                            <CaracteristicasPage
                                relatorio={relatorio}
                                sections={remainingSections.map(s => s.type)}
                                showTitle={true}
                            />
                        </ReportPageLayout>
                    );
                })()}

                {/* Tópico 2 + 3 — Lista de Documentos e Normas Técnicas (juntas se possível) */}
                {(hasListaDocs || hasNormas) && (() => {
                    const pages = [];
                    if (hasListaDocs) {
                        docPages.forEach((chunk, chunkIdx) => {
                            const isLastChunk = chunkIdx === docPages.length - 1;
                            const showNormasHere = isLastChunk && docsAndNormasSamePage;
                            pages.push(
                                <ReportPageLayout key={`docs-${chunkIdx}`} pageNumber={pg++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                                    <div>
                                        <ListaDocumentosPage documentos={chunk} />
                                        {showNormasHere && <NormasTecnicasPage normas={relatorio.normas_tecnicas} />}
                                    </div>
                                </ReportPageLayout>
                            );
                        });
                    }
                    if (hasNormas && !docsAndNormasSamePage) {
                        pages.push(
                            <ReportPageLayout key="normas" pageNumber={pg++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                                <NormasTecnicasPage normas={relatorio.normas_tecnicas} />
                            </ReportPageLayout>
                        );
                    }
                    return pages;
                })()}

                {/* Layout Proposto */}
                {hasLayoutProposto && (
                    <ReportPageLayout pageNumber={pg++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                        <LayoutPropostoPage relatorio={relatorio} />
                    </ReportPageLayout>
                )}

                {/* Inspeção por locais */}
                {contentPages.map((page, idx) => {
                    return (
                    <ReportPageLayout key={idx} pageNumber={pg++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                        <ContentPage segments={page.segments} isFirstPage={idx === 0} />
                    </ReportPageLayout>
                    );
                })}

                {/* Quadros Gerais */}
                {hasQuadros && paginatedQuadros.flatMap((entry, qIdx) => {
                    const { quadro, itemPages } = entry;
                    const pages = [
                        ...itemPages.map((itensPage, pIdx) => (
                            <ReportPageLayout key={`quadro-${qIdx}-p-${pIdx}`} pageNumber={pg++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                                <QuadrosGeraisPage
                                    quadro={quadro}
                                    itens={itensPage}
                                    showTitle={qIdx === 0 && pIdx === 0}
                                    showQuadroHeader={pIdx === 0}
                                />
                            </ReportPageLayout>
                        )),
                    ];
                    if (quadro.itens_analisados || (quadro.notas && quadro.notas.length > 0)) {
                        pages.push(
                            <ReportPageLayout key={`quadro-ia-${qIdx}`} pageNumber={pg++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                                <div className="p-4 space-y-4">
                                    {quadro.itens_analisados && (
                                        <div>
                                            <h2 className="text-base font-bold text-center bg-blue-900 text-white p-2 mb-2">Itens Analisados</h2>
                                            <div className="border border-black p-3 text-xs whitespace-pre-wrap">{quadro.itens_analisados}</div>
                                        </div>
                                    )}
                                    {quadro.notas && quadro.notas.length > 0 && (
                                        <div>
                                            <h3 className="text-xs font-bold bg-gray-100 border border-black p-1 mb-0">Notas:</h3>
                                            <table className="w-full border-collapse text-xs">
                                                <tbody>
                                                    {quadro.notas.map((nota, nIdx) => (
                                                        <tr key={nIdx}>
                                                            <td className="border border-black p-2 text-center w-8 font-bold">{nIdx + 1}</td>
                                                            <td className="border border-black p-2">{nota}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </ReportPageLayout>
                        );
                    }
                    return pages;
                })}

                {/* Conclusão Final */}
                {hasConclusao && (
                    <ReportPageLayout pageNumber={pg++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                        <div className="p-4">
                            <h2 className="text-base font-bold text-center bg-blue-900 text-white p-2 mb-3">Conclusão Final</h2>
                            <div className="border border-black p-3 text-xs whitespace-pre-wrap leading-relaxed">{relatorio.conclusao_final}</div>
                        </div>
                    </ReportPageLayout>
                )}

                {/* Assinaturas */}
                {hasAssinaturas && (
                    <ReportPageLayout pageNumber={pg++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                        <AssinaturasPage assinaturas={relatorio.assinaturas.filter(ass =>
                            (ass.nome && ass.nome.trim() !== '') ||
                            (ass.parte && ass.parte.trim() !== '') ||
                            (ass.assinatura_imagem && ass.assinatura_imagem.trim() !== '')
                        )} />
                    </ReportPageLayout>
                )}
            </div>

            <Dialog open={editCoverOpen} onOpenChange={setEditCoverOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Editar Capa</DialogTitle>
                        <DialogDescription>Configure os campos da capa do relatorio</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="border rounded-lg p-4 bg-blue-50">
                            <h3 className="font-semibold text-sm mb-4 text-blue-900">Titulos da Capa</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs font-semibold">Titulo Principal</Label>
                                    <Input value={editedCoverData?.titulo_capa || ''} onChange={(e) => setEditedCoverData((p) => ({ ...p, titulo_capa: e.target.value }))} className="mt-1" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Subtitulo (vermelho)</Label>
                                    <Input value={editedCoverData?.subtitulo_capa || ''} onChange={(e) => setEditedCoverData((p) => ({ ...p, subtitulo_capa: e.target.value }))} className="mt-1" />
                                </div>
                            </div>
                        </div>

                        <div className="border rounded-lg p-4 bg-green-50 border-green-200">
                            <h3 className="font-semibold text-sm mb-4 text-green-900">Area Central da Vistoria</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs font-semibold">Top</Label>
                                    <Input value={editedCoverData?.capa_area_top || ''} onChange={(e) => setEditedCoverData((p) => ({ ...p, capa_area_top: e.target.value }))} placeholder="Ex: 50%" className="mt-1" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Right</Label>
                                    <Input value={editedCoverData?.capa_area_right || ''} onChange={(e) => setEditedCoverData((p) => ({ ...p, capa_area_right: e.target.value }))} placeholder="Ex: -3%" className="mt-1" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Left (opcional)</Label>
                                    <Input value={editedCoverData?.capa_area_left || ''} onChange={(e) => setEditedCoverData((p) => ({ ...p, capa_area_left: e.target.value }))} placeholder="Ex: auto ou 55%" className="mt-1" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Largura</Label>
                                    <Input value={editedCoverData?.capa_area_width || ''} onChange={(e) => setEditedCoverData((p) => ({ ...p, capa_area_width: e.target.value }))} placeholder="Ex: 45%" className="mt-1" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Alinhamento</Label>
                                    <select
                                        value={editedCoverData?.capa_area_align || 'center'}
                                        onChange={(e) => setEditedCoverData((p) => ({ ...p, capa_area_align: e.target.value }))}
                                        className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                    >
                                        <option value="left">left</option>
                                        <option value="center">center</option>
                                        <option value="right">right</option>
                                    </select>
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Fundo da Area</Label>
                                    <Input value={editedCoverData?.capa_area_bg || ''} onChange={(e) => setEditedCoverData((p) => ({ ...p, capa_area_bg: e.target.value }))} placeholder="Ex: transparent ou #ffffffcc" className="mt-1" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Padding</Label>
                                    <Input value={editedCoverData?.capa_area_padding || ''} onChange={(e) => setEditedCoverData((p) => ({ ...p, capa_area_padding: e.target.value }))} placeholder="Ex: 8px" className="mt-1" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Raio</Label>
                                    <Input value={editedCoverData?.capa_area_radius || ''} onChange={(e) => setEditedCoverData((p) => ({ ...p, capa_area_radius: e.target.value }))} placeholder="Ex: 8px" className="mt-1" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Fonte Titulo</Label>
                                    <Input value={editedCoverData?.capa_area_titulo_font_size || ''} onChange={(e) => setEditedCoverData((p) => ({ ...p, capa_area_titulo_font_size: e.target.value }))} placeholder="Ex: 26px" className="mt-1" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Cor Titulo</Label>
                                    <Input value={editedCoverData?.capa_area_titulo_color || ''} onChange={(e) => setEditedCoverData((p) => ({ ...p, capa_area_titulo_color: e.target.value }))} placeholder="Ex: #000000" className="mt-1" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Margem abaixo do Titulo</Label>
                                    <Input value={editedCoverData?.capa_area_titulo_margin_bottom || ''} onChange={(e) => setEditedCoverData((p) => ({ ...p, capa_area_titulo_margin_bottom: e.target.value }))} placeholder="Ex: 6px" className="mt-1" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Fonte Subtitulo</Label>
                                    <Input value={editedCoverData?.capa_area_subtitulo_font_size || ''} onChange={(e) => setEditedCoverData((p) => ({ ...p, capa_area_subtitulo_font_size: e.target.value }))} placeholder="Ex: 16px" className="mt-1" />
                                </div>
                                <div className="col-span-2">
                                    <Label className="text-xs font-semibold">Cor Subtitulo</Label>
                                    <Input value={editedCoverData?.capa_area_subtitulo_color || ''} onChange={(e) => setEditedCoverData((p) => ({ ...p, capa_area_subtitulo_color: e.target.value }))} placeholder="Ex: #4b5563" className="mt-1" />
                                </div>
                            </div>
                        </div>

                        <div className="border rounded-lg p-4 bg-red-50 border-red-200">
                            <h3 className="font-semibold text-sm mb-4 text-red-900">Rodape da Capa</h3>
                            <div>
                                <Label className="text-xs font-semibold">Texto do Rodape</Label>
                                <Input value={editedCoverData?.texto_rodape_capa || ''} onChange={(e) => setEditedCoverData((p) => ({ ...p, texto_rodape_capa: e.target.value }))} className="mt-1" />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setEditCoverOpen(false)} disabled={savingCover}>Cancelar</Button>
                        <Button type="button" onClick={handleSaveCover} disabled={savingCover}>
                            {savingCover ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</> : 'Salvar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@700&family=Poppins:wght@400;600;700&display=swap');
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                @page { size: A4 portrait; margin: 0; }
                .report-page { width: 210mm; height: 297mm; position: relative; background: white; overflow: visible; }
                @media screen { .report-page { margin: 20px auto; box-shadow: 0 0 10px rgba(0,0,0,0.1); } }
                @media print {
                    .no-print, aside, header, nav { display: none !important; }
                    html, body { margin: 0 !important; padding: 0 !important; background: white !important; width: 210mm !important; height: auto !important; }
                    body, body > div, main { padding: 0 !important; margin: 0 !important; width: 100% !important; }
                    .lg\\:pl-72 { padding-left: 0 !important; }
                    .report-container { max-width: none !important; margin: 0 !important; padding: 0 !important; width: 210mm !important; }
                    .report-page { page-break-after: always; break-after: page; page-break-inside: avoid; width: 210mm !important; min-height: 297mm !important; height: 297mm !important; margin: 0 !important; box-shadow: none !important; overflow: hidden !important; position: relative !important; }
                    .report-page:last-child { page-break-after: auto; break-after: auto; }
                    .page-content { overflow: hidden !important; padding-bottom: 45px !important; box-sizing: border-box !important; }
                    html, body, * { overflow: visible !important; scrollbar-width: none !important; }
                    *::-webkit-scrollbar { display: none !important; }
                    .foto-inspecao-container { height: 220px !important; width: 100% !important; overflow: hidden !important; }
                    .report-page .foto-inspecao-img { height: 100% !important; object-fit: cover !important; width: 100% !important; display: block !important; }
                }
            `}</style>
        </div>
    );
}