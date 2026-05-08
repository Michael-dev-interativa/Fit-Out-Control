import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { format } from 'date-fns';
import { createPageUrl } from "@/utils";
import { useUnidadeData } from '@/components/hooks/useUnidadeData';
import { RespostaVistoria, FormularioVistoria, User } from '@/api/entities';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import { getUploadUrl } from '@/api/config';

// ─── Constants ────────────────────────────────────────────────────────────────
const NAVY = '#1e3751';
const RED  = '#CE2D2D';
const LOGO_WHITE      = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/1a0999f3c_logo_Interativa_letra_branca_sem_fundo_gg.png';
const LOGO_HORIZONTAL = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/4bd521d1e_LOGOHORIZONTAl.png';

const toRoman = (n) => {
    const v=[1000,900,500,400,100,90,50,40,10,9,5,4,1];
    const s=['M','CM','D','CD','C','XC','L','XL','X','IX','V','IV','I'];
    let r=''; for(let i=0;i<v.length;i++) while(n>=v[i]){r+=s[i];n-=v[i];} return r;
};

const fmtDate = (d) => {
    if (!d) return '—';
    try { return format(new Date(d), 'dd/MM/yyyy'); } catch { return '—'; }
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

// ─── ReportPageLayout ──────────────────────────────────────────────────────────
const ReportPageLayout = ({ children, pageNumber, totalPages, resposta, empreendimento }) => {
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
                            {resposta?.nome_vistoria || 'RELATÓRIO DE VISTORIA DE OBRAS'}
                        </h2>
                        <p className="text-[9px] text-gray-600 leading-tight truncate">
                            {empreendimento?.nome_empreendimento}
                        </p>
                        <p className="text-[9px] font-medium text-gray-800 leading-tight">
                            {fmtDate(resposta?.data_vistoria)}
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
                    <span>{resposta?.nome_vistoria || 'Relatório de Vistoria'}</span>
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
const CoverPage = ({ resposta, unidade, empreendimento }) => {
    const year = new Date(resposta?.data_vistoria || Date.now()).getFullYear();
    const rawEmpImg = getUploadUrl(empreendimento?.foto_empreendimento) || 'https://images.unsplash.com/photo-1519947486511-46149fa0a254?w=800&q=80';
    const empImg = useCompressedImage(rawEmpImg, 450, 0.3);
    const coverFrameUrl  = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/dca667b3d_erasebg-transformed.png';
    const redDecoUrl     = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/513d57969_Designsemnome2.png';
    const bottomFrameUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/10e9b2570_erasebg-transformed.png';
    const logoBrancoUrl  = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/22086ec44_LOGOPNG-branco.png';
    const cliente = unidade?.cliente_unidade || '';
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
                <h2 style={{ fontFamily: "'Inter',sans-serif", fontSize: '22px', color: RED, letterSpacing: '1px' }}>VISTORIA DE OBRAS</h2>
            </div>
            {(cliente || resposta?.nome_vistoria) && (
                <div className="absolute z-30" style={{ top: '50%', right: '-3%', width: '45%', padding: '1.3% 2.5%', textAlign: 'center' }}>
                    {cliente && (
                        <h1 style={{ fontSize: '28px', lineHeight: '1.0', fontFamily: "'Inter',sans-serif", marginBottom: '6px', color: '#111827', fontWeight: 900, textTransform: 'uppercase' }}>
                            {cliente}
                        </h1>
                    )}
                    {resposta?.nome_vistoria && (
                        <h2 style={{ fontSize: '16px', fontFamily: "'Inter',sans-serif", color: '#4b5563', fontWeight: 500 }}>
                            {resposta.nome_vistoria}
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

// ─── Informações Gerais page ──────────────────────────────────────────────────
const DadosGerais = ({ resposta, unidade, empreendimento, consultor }) => {
    const Field = ({ label, value }) => (
        <div style={{ marginBottom: '14px' }}>
            <div style={{ fontWeight: '600', fontSize: '10px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '3px' }}>{label}:</div>
            <div style={{ fontSize: '12px', color: '#1f2937' }}>{value || '—'}</div>
        </div>
    );
    return (
        <div className="p-6">
            <div style={{ background: NAVY, color: 'white', textAlign: 'center', padding: '10px 16px', fontWeight: 'bold', fontSize: '13px', letterSpacing: '0.08em', marginBottom: '20px' }}>
                INFORMAÇÕES GERAIS
            </div>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: '4px', padding: '18px 22px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 40px' }}>
                    <Field label="Empreendimento"        value={empreendimento?.nome_empreendimento} />
                    <Field label="Unidade"               value={unidade?.unidade_empreendimento} />
                    <Field label="Cliente"               value={unidade?.cliente_unidade} />
                    <Field label="Data da Vistoria"      value={fmtDate(resposta?.data_vistoria)} />
                    <Field label="Consultor Responsável" value={consultor?.full_name || resposta?.consultor_responsavel} />
                    {resposta?.participantes && <Field label="Participantes" value={resposta.participantes} />}
                </div>
            </div>
        </div>
    );
};

// ─── Section (2-column format) ────────────────────────────────────────────────
const SecaoRelatorio = ({ secao, secaoIndex, respostasDataMap, fotosPorSecao }) => {
    const thStyle = { background: '#f3f4f6', border: '1px solid #9ca3af', padding: '6px 10px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#374151' };
    const tdBase  = { border: '1px solid #d1d5db', padding: '7px 10px', fontSize: '11px', verticalAlign: 'top' };

    const perguntasRespondidas = secao.perguntas
        .map((p, idx) => {
            const key = `secao_${secaoIndex}_pergunta_${idx}`;
            return {
                pergunta: p, idx, key,
                resposta:   respostasDataMap[key],
                comentario: respostasDataMap[`${key}_comentario`],
                fotos: (fotosPorSecao[secao.nome_secao] || []).filter(f => f.perguntaKey === key),
            };
        })
        .filter(item => item.resposta);

    if (perguntasRespondidas.length === 0) return null;

    return (
        <div style={{ marginBottom: '22px', pageBreakInside: 'avoid' }}>
            <div style={{ background: NAVY, color: 'white', padding: '7px 12px', fontWeight: 'bold', fontSize: '12px', letterSpacing: '0.04em' }}>
                {secaoIndex + 1}. {secao.nome_secao}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th style={thStyle}>Seção</th>
                        <th style={{ ...thStyle, width: '34%', textAlign: 'center' }}>Resposta</th>
                    </tr>
                </thead>
                <tbody>
                    {perguntasRespondidas.map(({ pergunta, idx, resposta, comentario, fotos }) => (
                        <React.Fragment key={idx}>
                            <tr>
                                <td style={{ ...tdBase, verticalAlign: 'middle' }}>
                                    <span style={{ fontWeight: 'bold' }}>{toRoman(idx + 1)}.</span>{' '}{pergunta.pergunta}
                                </td>
                                <td style={{ ...tdBase, textAlign: 'center', verticalAlign: 'middle' }}>
                                    <span style={{
                                        display: 'inline-block', padding: '3px 10px', borderRadius: '9999px',
                                        fontSize: '11px', fontWeight: 600,
                                        backgroundColor: '#dbeafe', color: '#1d4ed8', border: '1px solid #93c5fd',
                                    }}>{resposta}</span>
                                </td>
                            </tr>
                            {comentario && (
                                <tr>
                                    <td colSpan={2} style={{ ...tdBase, background: '#f9fafb', paddingTop: '7px', paddingBottom: '10px' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '3px', color: '#374151' }}>Comentário:</div>
                                        <div style={{ fontSize: '11px', lineHeight: '1.5', color: '#1f2937', whiteSpace: 'pre-wrap' }}>{comentario}</div>
                                    </td>
                                </tr>
                            )}
                            {fotos.length > 0 && (
                                <tr>
                                    <td colSpan={2} style={{ ...tdBase, paddingTop: '10px', paddingBottom: '14px' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '11px', marginBottom: '8px', color: '#374151' }}>Registro Fotográfico:</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                                            {fotos.map((foto, fi) => (
                                                <div key={fi} style={{ textAlign: 'center' }}>
                                                    <img src={foto.url} alt="" style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', border: '1px solid #e5e7eb', borderRadius: '2px' }} />
                                                    {foto.comentario && (
                                                        <div style={{ fontSize: '10px', marginTop: '4px', color: '#374151', fontStyle: 'italic' }}>{foto.comentario}</div>
                                                    )}
                                                </div>
                                            ))}
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

// ─── Sections page (variable height, natural print breaks) ────────────────────
const SectionsPage = ({ resposta, empreendimento, formulario, respostasDataMap, fotosPorSecao }) => {
    const logoUrl = useCompressedImage(LOGO_HORIZONTAL, 300, 0.3);
    return (
        <div className="report-sections-page bg-white">
            {/* Header */}
            <div className="flex justify-between items-center border-b border-gray-200 bg-white"
                style={{ padding: '6px 10px', maxWidth: '210mm', boxSizing: 'border-box' }}>
                <img src={logoUrl} alt="Logo" style={{ height: '32px', maxWidth: '120px', objectFit: 'contain' }} />
                <div className="text-right" style={{ flex: 1, paddingLeft: '8px' }}>
                    <h2 className="text-[10px] font-bold text-gray-800 uppercase leading-tight truncate">
                        {resposta?.nome_vistoria || 'RELATÓRIO DE VISTORIA DE OBRAS'}
                    </h2>
                    <p className="text-[9px] text-gray-600 leading-tight truncate">{empreendimento?.nome_empreendimento}</p>
                    <p className="text-[9px] font-medium text-gray-800 leading-tight">{fmtDate(resposta?.data_vistoria)}</p>
                </div>
            </div>

            {/* Content */}
            <div style={{ padding: '16px 20px' }}>
                {(formulario?.secoes || []).map((secao, idx) => (
                    <SecaoRelatorio
                        key={idx}
                        secao={secao}
                        secaoIndex={idx}
                        respostasDataMap={respostasDataMap}
                        fotosPorSecao={fotosPorSecao}
                    />
                ))}

                {resposta?.observacoes_gerais && (
                    <div style={{ marginBottom: '22px', pageBreakInside: 'avoid' }}>
                        <div style={{ background: NAVY, color: 'white', padding: '7px 12px', fontWeight: 'bold', fontSize: '12px', letterSpacing: '0.04em' }}>
                            OBSERVAÇÕES GERAIS
                        </div>
                        <div style={{ border: '1px solid #d1d5db', padding: '10px 12px', fontSize: '11px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                            {resposta.observacoes_gerais}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 bg-gray-50 flex justify-between items-center text-[9px] text-gray-500"
                style={{ padding: '6px 10px', maxWidth: '210mm', boxSizing: 'border-box' }}>
                <div className="flex-1 text-left leading-tight truncate">
                    <span className="font-medium">Arquivo: </span>
                    <span>{resposta?.nome_vistoria || 'Relatório de Vistoria'}</span>
                </div>
                <div className="flex-1 flex flex-col items-center leading-tight text-[8px]">
                    <span>INTERATIVA ENGENHARIA</span>
                    <span>www.interativaengenharia.com.br</span>
                </div>
                <div className="flex-1 text-right leading-tight">
                    <span>Página 3+</span>
                </div>
            </div>
        </div>
    );
};

// ─── Report content ───────────────────────────────────────────────────────────
const ReportContent = ({ resposta, unidade, empreendimento, formulario, respostasDataMap, fotosPorSecao, consultor, navigate }) => {
    const totalPages = 3;

    const handlePrint = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        window.print();
    };

    return (
        <div className="bg-gray-200 print:bg-white min-h-screen font-sans">
            {/* Toolbar */}
            <div className="no-print shadow-sm border-b p-4 mb-4 bg-white">
                <div className="flex justify-between items-center max-w-4xl mx-auto">
                    <Button onClick={() => navigate(-1)} variant="outline">
                        <ArrowLeft className="w-4 h-4 mr-2" />Voltar
                    </Button>
                    <h1 className="text-xl font-semibold text-gray-800">Relatório de Vistoria de Obras</h1>
                    <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700 text-white">
                        <Printer className="w-4 h-4 mr-2" />Gerar PDF
                    </Button>
                </div>
            </div>

            <div className="report-container max-w-4xl mx-auto" style={{ padding: 0 }}>
                {/* Page 1 — Cover */}
                <ReportPageLayout pageNumber={1} totalPages={totalPages} resposta={resposta} empreendimento={empreendimento}>
                    <CoverPage resposta={resposta} unidade={unidade} empreendimento={empreendimento} />
                </ReportPageLayout>

                {/* Page 2 — Informações Gerais */}
                <ReportPageLayout pageNumber={2} totalPages={totalPages} resposta={resposta} empreendimento={empreendimento}>
                    <DadosGerais resposta={resposta} unidade={unidade} empreendimento={empreendimento} consultor={consultor} />
                </ReportPageLayout>

                {/* Pages 3+ — Sections (variable length) */}
                <SectionsPage
                    resposta={resposta}
                    empreendimento={empreendimento}
                    formulario={formulario}
                    respostasDataMap={respostasDataMap}
                    fotosPorSecao={fotosPorSecao}
                />
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
export default function RelatorioVistoriaObras({ language = 'pt', theme = 'light' }) {
    const navigate = useNavigate();
    const urlParams = new URLSearchParams(window.location.search);

    const unidadeId        = urlParams.get('unidadeId');
    const empreendimentoId = urlParams.get('empreendimentoId');
    const respostasVistoriaIds = urlParams.get('respostasVistoriaIds')?.split(',');
    const targetRespostaId = respostasVistoriaIds?.[0] || null;

    const [loading, setLoading]                  = useState(true);
    const [resposta, setResposta]                = useState(null);
    const [formulario, setFormulario]            = useState(null);
    const [respostasDataMap, setRespostasDataMap] = useState({});
    const [fotosPorSecao, setFotosPorSecao]      = useState({});
    const [consultor, setConsultor]              = useState(null);

    const { unidade, empreendimento, loading: loadingUnidade, error: unidadeError } = useUnidadeData(unidadeId, empreendimentoId);

    useEffect(() => {
        if (unidadeError) navigate(createPageUrl('Empreendimentos'));
    }, [unidadeError, navigate]);

    useEffect(() => {
        if (loadingUnidade || unidadeError) return;
        const load = async () => {
            setLoading(true);
            try {
                if (!targetRespostaId) { setResposta(null); return; }
                const respostaData = await RespostaVistoria.get(targetRespostaId);
                setResposta(respostaData);
                setRespostasDataMap(typeof respostaData.respostas === 'string' ? JSON.parse(respostaData.respostas) : (respostaData.respostas || {}));
                setFotosPorSecao(typeof respostaData.fotos_secoes === 'string' ? JSON.parse(respostaData.fotos_secoes) : (respostaData.fotos_secoes || {}));
                if (respostaData.id_formulario) {
                    const formData = await FormularioVistoria.get(respostaData.id_formulario);
                    setFormulario(formData);
                }
                if (respostaData.consultor_responsavel) {
                    try {
                        const users = await User.filter({ email: respostaData.consultor_responsavel });
                        if (users.length > 0) setConsultor(users[0]);
                    } catch {}
                }
            } catch (err) {
                console.error('Erro ao carregar relatório:', err);
                setResposta(null);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [loadingUnidade, unidadeError, targetRespostaId]);

    // Force light color scheme
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

    if (loading || loadingUnidade) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
            <p className="mt-4 text-gray-600">Carregando relatório...</p>
        </div>
    );

    if (!resposta) return (
        <div className="p-6 text-center text-gray-600">Relatório não encontrado ou IDs inválidos.</div>
    );

    return (
        <ReportContent
            resposta={resposta}
            unidade={unidade}
            empreendimento={empreendimento}
            formulario={formulario}
            respostasDataMap={respostasDataMap}
            fotosPorSecao={fotosPorSecao}
            consultor={consultor}
            navigate={navigate}
        />
    );
}
