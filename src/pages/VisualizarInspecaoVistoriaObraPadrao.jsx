import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Loader2, AlertTriangle, ArrowLeft, Printer, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Empreendimento, RespostaVistoria } from '../api/entities';
import { createPageUrl } from '@/utils';
import { getUploadUrl } from '@/api/config';
import { compressReportImages } from '@/lib/compressReportImages';
import { parseLocalDate } from '../lib/dateUtils';

// ─── Constants ────────────────────────────────────────────────────────────────
const NAVY = '#1e3751';
const RED  = '#CE2D2D';
const LOGO_WHITE      = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/1a0999f3c_logo_Interativa_letra_branca_sem_fundo_gg.png';
const LOGO_HORIZONTAL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/4bd521d1e_LOGOHORIZONTAl.png';

const isValidId = (id) => id && typeof id === 'string' && id.length > 0;

const toRoman = (n) => {
    const v=[1000,900,500,400,100,90,50,40,10,9,5,4,1];
    const s=['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
    let r=''; for(let i=0;i<v.length;i++) while(n>=v[i]){r+=s[i];n-=v[i];} return r;
};

const fmtDate = (d) => { try { return d ? format(parseLocalDate(d), 'dd/MM/yyyy') : '—'; } catch { return '—'; } };

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

// ─── Image helpers ─────────────────────────────────────────────────────────────
const compressImage = async (url, maxWidth = 600, quality = 0.4) => {
    if (!url || typeof url !== 'string') return url;
    if (url.startsWith('data:image')) return url;
    try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 12000);
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(tid);
        if (!res.ok) return url;
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        return await new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                URL.revokeObjectURL(objectUrl);
                try {
                    const canvas = document.createElement('canvas');
                    let w = img.width, h = img.height;
                    if (maxWidth && w > maxWidth) { h = Math.round(h * maxWidth / w); w = maxWidth; }
                    canvas.width = w; canvas.height = h;
                    canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                } catch { resolve(url); }
            };
            img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(url); };
            img.src = objectUrl;
        });
    } catch { return url; }
};

const useCompressedImage = (url, maxWidth = 600, quality = 0.4) => {
    const [compressed, setCompressed] = useState(url);
    useEffect(() => {
        if (!url || url.startsWith('data:image')) { setCompressed(url); return; }
        let cancelled = false;
        compressImage(url, maxWidth, quality).then(r => { if (!cancelled) setCompressed(r); });
        return () => { cancelled = true; };
    }, [url]);
    return compressed;
};

// ─── Report page layout (copied from VisualizarInspecaoEletrica) ──────────────
const ReportPageLayout = ({ children, pageNumber, totalPages, relatorio, empreendimento }) => {
    const logoUrl = useCompressedImage(LOGO_HORIZONTAL, 300, 0.3);
    const HEADER_HEIGHT = pageNumber > 1 ? '80px' : '0px';
    const FOOTER_HEIGHT = '45px';
    const PAGE_HEIGHT   = '297mm';
    const isCover = pageNumber === 1;

    return (
        <div className="report-page" style={{ height: PAGE_HEIGHT, boxSizing: 'border-box', overflow: 'hidden' }}>
            {!isCover && (
                <div className="flex justify-between items-center border-b border-gray-200 bg-white"
                    style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_HEIGHT, zIndex: 100, padding: '4px 8px', maxWidth: '210mm', boxSizing: 'border-box' }}>
                    <img src={logoUrl} alt="Logo Interativa" style={{ height: '32px', maxWidth: '120px', objectFit: 'contain' }} />
                    <div className="text-right" style={{ flex: 1, paddingLeft: '8px', overflow: 'hidden' }}>
                        <h2 className="text-[10px] font-bold text-gray-800 uppercase leading-tight truncate">
                            {relatorio?.titulo_relatorio || 'VISTORIA DE OBRA PADRÃO'}
                        </h2>
                        <p className="text-[9px] text-gray-600 leading-tight truncate">
                            {empreendimento?.nome_empreendimento}{relatorio?.cliente ? ` — ${relatorio.cliente}` : ''}
                        </p>
                        <p className="text-[9px] font-medium text-gray-800 leading-tight">
                            {fmtDate(relatorio?.data_inspecao)}
                        </p>
                    </div>
                </div>
            )}
            <div className="page-content"
                style={{ paddingTop: HEADER_HEIGHT, paddingBottom: FOOTER_HEIGHT, minHeight: `calc(${PAGE_HEIGHT} - ${HEADER_HEIGHT} - ${FOOTER_HEIGHT})`, overflow: 'hidden', boxSizing: 'border-box' }}>
                {children}
            </div>
            <div className="border-t border-gray-200 bg-gray-50 flex justify-between items-center text-[9px] text-gray-500"
                style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: FOOTER_HEIGHT, padding: '4px 8px', maxWidth: '210mm', boxSizing: 'border-box' }}>
                <div className="flex-1 text-left leading-tight truncate" style={{ paddingRight: '8px' }}>
                    <span className="font-medium">Arquivo: </span>
                    <span>{relatorio?.titulo_relatorio || 'Vistoria de Obra'}</span>
                </div>
                <div className="flex-1 flex flex-col items-center leading-tight text-[8px]">
                    <span>INTERATIVA ENGENHARIA</span>
                    <span>www.interativaengenharia.com.br</span>
                </div>
                <div className="flex-1 text-right leading-tight" style={{ paddingLeft: '8px' }}>
                    <span>Página {pageNumber} de {totalPages}</span>
                </div>
            </div>
        </div>
    );
};

// ─── Cover page ────────────────────────────────────────────────────────────────
const CoverPage = ({ relatorio, empreendimento }) => {
    const year = new Date(relatorio?.data_inspecao || Date.now()).getFullYear();
    const rawEmpImg = getUploadUrl(empreendimento?.foto_empreendimento) || 'https://images.unsplash.com/photo-1519947486511-46149fa0a254?w=800&q=80';
    const empImg = useCompressedImage(rawEmpImg, 450, 0.3);
    const coverFrameUrl  = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/dca667b3d_erasebg-transformed.png';
    const redDecoUrl     = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/513d57969_Designsemnome2.png';
    const bottomFrameUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/10e9b2570_erasebg-transformed.png';
    const logoBrancoUrl  = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/22086ec44_LOGOPNG-branco.png';
    const responsaveis   = relatorio?.texto_rodape_capa || empreendimento?.texto_capa_rodape
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
                style={{ backgroundImage: `url(${empImg})`, backgroundPosition: 'center 15%', backgroundSize: 'cover', opacity: 0.2, top: '-10px', left: '-10px', width: 'calc(100% + 20px)', height: 'calc(100% + 20px)' }} />
            <div className="absolute top-0 left-0 w-full h-full bg-contain bg-left-top bg-no-repeat z-20"
                style={{ backgroundImage: `url(${coverFrameUrl})`, height: '150%' }} />
            <div className="absolute z-50" style={{ top: '25px', left: '11px', width: '350px', height: '170px' }}>
                <img src={LOGO_WHITE} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} />
            </div>
            <div className="absolute flex items-center justify-center z-40"
                style={{ top: '23%', left: '11%', width: '22.7%', height: '25%', transform: 'rotate(27deg)' }}>
                <span className="font-normal text-white" style={{ fontSize: '60px', fontFamily: "'Inter',sans-serif", textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}>{year}</span>
            </div>
            <div className="absolute z-30" style={{ top: '10%', right: '8%', width: '50%', textAlign: 'right' }}>
                <h1 style={{ fontFamily: "'Inter',sans-serif", fontSize: '64px', fontWeight: 'bold', color: '#394557', lineHeight: '1.1', marginBottom: '4px' }}>RELATÓRIO</h1>
                <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: '22px', color: RED, letterSpacing: '1px' }}>VISTORIA DE OBRA PADRÃO</h2>
            </div>
            {(relatorio?.cliente || relatorio?.subtitulo_relatorio) && (
                <div className="absolute z-30" style={{ top: '50%', right: '-3%', width: '45%', padding: '1.3% 2.5%', textAlign: 'center' }}>
                    {relatorio?.cliente && (
                        <h1 style={{ fontSize: '28px', lineHeight: '1.0', fontFamily: "'Inter',sans-serif", marginBottom: '6px', color: '#111827', fontWeight: 900, textTransform: 'uppercase' }}>
                            {relatorio.cliente}
                        </h1>
                    )}
                    {relatorio?.subtitulo_relatorio && (
                        <h2 style={{ fontSize: '16px', fontFamily: "'Inter',sans-serif", color: '#4b5563', fontWeight: 500 }}>
                            {relatorio.subtitulo_relatorio}
                        </h2>
                    )}
                </div>
            )}
            <div className="absolute z-20"
                style={{ top: '-350px', right: '-30%', width: '1700px', height: '1150px', backgroundColor: RED, WebkitMaskImage: `url(${redDecoUrl})`, maskImage: `url(${redDecoUrl})`, WebkitMaskSize: '100% 100%', WebkitMaskRepeat: 'no-repeat', maskPosition: 'center' }} />
            <div className="absolute z-50" style={{ top: '-10%', right: '-20%', width: '1800px', height: '800px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={logoBrancoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div className="absolute right-0 w-full h-full bg-no-repeat z-40"
                style={{ bottom: '-5%', backgroundImage: `url('${bottomFrameUrl}')`, height: '1000%', backgroundSize: '230% auto', backgroundPosition: '65% 100%' }} />
            <div className="absolute z-10"
                style={{ bottom: '0%', left: '0%', width: '450px', height: '800px', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', clipPath: 'polygon(0 0%, 100% 23%, 100% 100%, 0% 100%)' }}>
                <img src={empImg} alt={empreendimento?.nome_empreendimento || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div className="absolute flex items-center justify-center z-50"
                style={{ bottom: '0', left: '0', right: '0', height: '65px', backgroundColor: RED, clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 5% 100%)', paddingLeft: '15%', paddingRight: '5%' }}>
                <span className="text-white w-full font-normal"
                    style={{ ...getTextStyle(responsaveis), fontFamily: 'Poppins', textAlign: 'center', lineHeight: '1.2' }}>{responsaveis}</span>
            </div>
        </>
    );
};

// ─── Dados do Projeto ─────────────────────────────────────────────────────────
const DadosProjeto = ({ relatorio, empreendimento }) => {
    const Field = ({ label, value }) => (
        <div style={{ marginBottom: '14px' }}>
            <div style={{ fontWeight: '600', fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' }}>{label}:</div>
            <div style={{ fontSize: '12px', color: '#1f2937' }}>{value || '—'}</div>
        </div>
    );
    return (
        <div className="p-6">
            <div style={{ background: NAVY, color: 'white', textAlign: 'center', padding: '10px 16px', fontWeight: 'bold', fontSize: '13px', letterSpacing: '0.08em', marginBottom: '20px' }}>
                DADOS DO PROJETO
            </div>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '4px', padding: '18px 22px', marginBottom: '18px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 40px' }}>
                    <Field label="Empreendimento"   value={empreendimento?.nome_empreendimento} />
                    <Field label="Administradora"   value={empreendimento?.cli_empreendimento} />
                    <Field label="Cliente"          value={relatorio?.cliente} />
                    <Field label="Data da Vistoria" value={fmtDate(relatorio?.data_inspecao)} />
                    <Field label="Revisão"          value={relatorio?.revisao} />
                    {relatorio?.eng_responsavel && <Field label="Consultoria Técnica" value={relatorio.eng_responsavel} />}
                </div>
            </div>
            {relatorio?.subtitulo_relatorio && (
                <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontWeight: '600', fontSize: '12px', color: '#374151', marginBottom: '6px' }}>Escopo de consultoria:</div>
                    <div style={{ border: '1px solid #e5e7eb', padding: '10px', fontSize: '12px', lineHeight: '1.6', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                        {relatorio.subtitulo_relatorio}
                    </div>
                </div>
            )}
            {relatorio?.eng_responsavel && (
                <div style={{ textAlign: 'center', marginTop: '32px', fontSize: '12px' }}>
                    <div style={{ fontWeight: 'bold' }}>Consultoria Técnica:</div>
                    <div style={{ marginTop: '4px' }}>{relatorio.eng_responsavel}</div>
                </div>
            )}
        </div>
    );
};

// ─── Section (2-column PDF format) ───────────────────────────────────────────
const SecaoVistoria = ({ secao, sectionIndex }) => {
    const isSignature = secao.nome_secao === 'ASSINATURAS';
    const thStyle = { background: '#f3f4f6', border: '1px solid #9ca3af', padding: '6px 10px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#374151' };
    const tdBase  = { border: '1px solid #d1d5db', padding: '7px 10px', fontSize: '11px', verticalAlign: 'top' };

    return (
        <div style={{ marginBottom: '22px', pageBreakInside: 'avoid' }}>
            <div style={{ background: NAVY, color: 'white', padding: '7px 12px', fontWeight: 'bold', fontSize: '12px', letterSpacing: '0.04em' }}>
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
                            <tr>
                                <td style={{ ...tdBase, paddingTop: isSignature ? '16px' : '8px', paddingBottom: isSignature ? '16px' : '8px', verticalAlign: 'middle' }}>
                                    <span style={{ fontWeight: 'bold' }}>{toRoman(idx + 1)}.</span>{' '}{p.pergunta}
                                </td>
                                <td style={{ ...tdBase, textAlign: 'center', fontSize: isSignature ? '15px' : '11px', fontWeight: isSignature ? '500' : 'normal', verticalAlign: 'middle' }}>
                                    {isSignature
                                        ? (p.resposta || '')
                                        : <RespostaBadge resposta={p.resposta} opcoes={p.opcoes} />}
                                </td>
                            </tr>
                            {p.observacao && !isSignature && (
                                <tr>
                                    <td colSpan={2} style={{ ...tdBase, background: '#f9fafb', paddingTop: '7px', paddingBottom: '10px' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '3px', color: '#374151' }}>Comentário:</div>
                                        <div style={{ fontSize: '11px', lineHeight: '1.5', color: '#1f2937' }}>{p.observacao}</div>
                                    </td>
                                </tr>
                            )}
                            {p.foto && !isSignature && (
                                <tr>
                                    <td colSpan={2} style={{ ...tdBase, paddingTop: '10px', paddingBottom: '14px' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '8px', color: '#374151' }}>Registro Fotográfico:</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                            <div style={{ textAlign: 'center' }}>
                                                <img src={getUploadUrl(p.foto)} alt="" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', border: '1px solid #e5e7eb', borderRadius: '2px' }} />
                                                <div style={{ fontSize: '10px', marginTop: '4px', fontWeight: '600', color: '#374151' }}>
                                                    {p.observacao ? p.observacao.slice(0, 60) + (p.observacao.length > 60 ? '...' : '') : p.pergunta?.slice(0, 50)}
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

// ─── Sections content page (variable height, natural print page-breaks) ───────
const SectionsPage = ({ relatorio, empreendimento, pageNumber, totalPages }) => {
    const logoUrl = useCompressedImage(LOGO_HORIZONTAL, 300, 0.3);
    return (
        <div className="report-sections-page bg-white" style={{ padding: '0' }}>
            {/* Header */}
            <div className="flex justify-between items-center border-b border-gray-200 bg-white"
                style={{ padding: '6px 10px 6px 10px', maxWidth: '210mm', boxSizing: 'border-box' }}>
                <img src={logoUrl} alt="Logo" style={{ height: '32px', maxWidth: '120px', objectFit: 'contain' }} />
                <div className="text-right" style={{ flex: 1, paddingLeft: '8px' }}>
                    <h2 className="text-[10px] font-bold text-gray-800 uppercase leading-tight truncate">
                        {relatorio?.titulo_relatorio || 'VISTORIA DE OBRA PADRÃO'}
                    </h2>
                    <p className="text-[9px] text-gray-600 leading-tight truncate">
                        {empreendimento?.nome_empreendimento}{relatorio?.cliente ? ` — ${relatorio.cliente}` : ''}
                    </p>
                    <p className="text-[9px] font-medium text-gray-800 leading-tight">{fmtDate(relatorio?.data_inspecao)}</p>
                </div>
            </div>

            {/* Sections */}
            <div style={{ padding: '16px 20px' }}>
                {(relatorio.secoes || []).map((secao, idx) => (
                    <SecaoVistoria key={idx} secao={secao} sectionIndex={idx} />
                ))}

                {relatorio.observacoes_gerais && (
                    <div style={{ marginBottom: '22px', pageBreakInside: 'avoid' }}>
                        <div style={{ background: NAVY, color: 'white', padding: '7px 12px', fontWeight: 'bold', fontSize: '12px', letterSpacing: '0.04em' }}>
                            OBSERVAÇÕES GERAIS
                        </div>
                        <div style={{ border: '1px solid #d1d5db', padding: '10px 12px', fontSize: '11px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                            {relatorio.observacoes_gerais}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 bg-gray-50 flex justify-between items-center text-[9px] text-gray-500"
                style={{ padding: '6px 10px', maxWidth: '210mm', boxSizing: 'border-box' }}>
                <div className="flex-1 text-left leading-tight truncate">
                    <span className="font-medium">Arquivo: </span>
                    <span>{relatorio?.titulo_relatorio || 'Vistoria de Obra'}</span>
                </div>
                <div className="flex-1 flex flex-col items-center leading-tight text-[8px]">
                    <span>INTERATIVA ENGENHARIA</span>
                    <span>www.interativaengenharia.com.br</span>
                </div>
                <div className="flex-1 text-right leading-tight">
                    <span>Página {pageNumber}+</span>
                </div>
            </div>
        </div>
    );
};

const QRCodePage = () => {
    const reportUrl = import.meta.env.VITE_FRONTEND_URL
        ? `${import.meta.env.VITE_FRONTEND_URL}${window.location.hash}`
        : window.location.href;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(reportUrl)}`;
    return (
        <div className="p-8 flex flex-col items-center justify-center" style={{ minHeight: 'calc(297mm - 125px)' }}>
            <h2 className="text-xl font-bold text-gray-800 mb-8 text-center">Acesse este Relatório</h2>
            <div className="text-center bg-white p-8 rounded-lg border-2 border-gray-200 max-w-sm w-full">
                <img src={qrUrl} alt="QR Code" className="w-56 h-56 mx-auto mb-6" />
                <p className="text-sm text-gray-600 mb-4">Escaneie o QR Code para acessar este relatório online</p>
                <p className="text-xs text-gray-500 break-all">{reportUrl}</p>
            </div>
        </div>
    );
};

// ─── Report content ───────────────────────────────────────────────────────────
const ReportContent = ({ relatorio, empreendimento, navigate }) => {
    const [isPrintingMode, setIsPrintingMode] = useState(false);
    const totalPages = 2 + 1 + 1; // cover + dados + sections + qrcode
    let currentPage = 1;

    const handlePrint = async () => {
        setIsPrintingMode(true);
        await new Promise(resolve => setTimeout(resolve, 50));
        window.print();
        setTimeout(() => setIsPrintingMode(false), 2000);
    };

    return (
        <div className="bg-gray-200 print:bg-white min-h-screen font-sans">
            {/* Toolbar */}
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
                        <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700 text-white">
                            <Printer className="w-4 h-4 mr-2" />Gerar PDF
                        </Button>
                    </div>
                </div>
            </div>

            <div className="report-container max-w-4xl mx-auto" style={{ padding: 0 }}>
                {/* Page 1 — Cover */}
                <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                    <CoverPage relatorio={relatorio} empreendimento={empreendimento} />
                </ReportPageLayout>

                {/* Page 2 — Dados do Projeto */}
                <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                    <DadosProjeto relatorio={relatorio} empreendimento={empreendimento} />
                </ReportPageLayout>

                {/* Pages 3+ — Sections (variable length, natural breaks) */}
                <SectionsPage relatorio={relatorio} empreendimento={empreendimento} pageNumber={currentPage} totalPages={totalPages} />

                <ReportPageLayout pageNumber={totalPages} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
                    <QRCodePage />
                </ReportPageLayout>
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@700&family=Poppins:wght@100;200;300;400;500;600;700;800;900&display=swap');

                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }

                @page { size: A4 portrait; margin: 0; }

                .report-page {
                    width: 210mm;
                    min-height: 297mm;
                    height: auto;
                    position: relative;
                    background: white;
                    overflow: hidden;
                }

                .report-sections-page {
                    width: 210mm;
                    background: white;
                }

                @media screen {
                    .report-page { margin: 20px auto; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
                    .report-sections-page { margin: 20px auto; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
                }

                @media print {
                    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
                    .no-print, aside, header, nav { display: none !important; }
                    html, body, * { overflow: visible !important; -ms-overflow-style: none !important; scrollbar-width: none !important; }
                    *::-webkit-scrollbar { display: none !important; }
                    html, body { margin: 0 !important; padding: 0 !important; background: white !important; width: 210mm !important; height: auto !important; }
                    body, body > div, main { padding: 0 !important; margin: 0 !important; width: 100% !important; }
                    .lg\\:pl-72 { padding-left: 0 !important; }
                    .report-container { max-width: none !important; margin: 0 !important; padding: 0 !important; width: 210mm !important; }

                    .report-page {
                        page-break-after: always;
                        break-after: page;
                        width: 210mm !important;
                        height: 297mm !important;
                        min-height: unset !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        overflow: hidden !important;
                        position: relative !important;
                    }
                    .report-page:last-child { page-break-after: auto; break-after: auto; }

                    .report-sections-page {
                        width: 210mm !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        page-break-before: always;
                        break-before: page;
                    }

                    .page-content { overflow: hidden !important; padding-bottom: 45px !important; box-sizing: border-box !important; }
                    img { max-width: 100%; }
                    table { page-break-inside: auto; border-collapse: collapse; }
                    thead { display: table-header-group; }
                    tr { page-break-inside: avoid; }
                }
            `}</style>
        </div>
    );
};

// ─── Page component ───────────────────────────────────────────────────────────
export default function VisualizarInspecaoVistoriaObraPadrao() {
    const navigate = useNavigate();
    const location = useLocation();
    const relatorioId = new URLSearchParams(location.search).get('relatorioId');

    const [relatorio, setRelatorio]           = useState(null);
    const [empreendimento, setEmpreendimento] = useState(null);
    const [loading, setLoading]               = useState(true);
    const [error, setError]                   = useState(null);

    useEffect(() => {
        if (!isValidId(relatorioId)) { setError('ID do relatório inválido.'); setLoading(false); return; }
        const load = async () => {
            try {
                const raw = await RespostaVistoria.get(relatorioId);
                if (!raw) throw new Error('Relatório não encontrado');
                const emp = raw.id_empreendimento ? await Empreendimento.get(raw.id_empreendimento) : null;
                const ef = raw.estrutura_formulario || {};
                // Mapeia campos de RespostaVistoria para o formato esperado pelo viewer
                const rel = {
                    ...raw,
                    titulo_relatorio:    raw.nome_vistoria || 'Vistoria de Obra Padrão',
                    subtitulo_relatorio: raw.texto_escopo_consultoria || '',
                    cliente:             ef.cliente || '',
                    data_inspecao:       raw.data_vistoria || null,
                    revisao:             raw.revisao || '',
                    eng_responsavel:     raw.consultor_responsavel || '',
                    observacoes_gerais:  ef.observacoes_gerais || '',
                    secoes:              ef.secoes || [],
                };
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

    // Force light color scheme (same as VisualizarInspecaoEletrica)
    useEffect(() => {
        const originalColorScheme = document.documentElement.style.colorScheme;
        document.documentElement.style.colorScheme = 'light';
        let meta = document.querySelector('meta[name="color-scheme"]');
        let created = false;
        if (!meta) { meta = document.createElement('meta'); meta.name = 'color-scheme'; document.head.appendChild(meta); created = true; }
        const originalContent = meta.content;
        meta.content = 'light only';
        return () => {
            document.documentElement.style.colorScheme = originalColorScheme;
            if (created && meta.parentNode) meta.parentNode.removeChild(meta);
            else if (meta) meta.content = originalContent;
        };
    }, []);

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
