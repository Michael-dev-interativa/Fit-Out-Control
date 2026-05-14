import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Empreendimento, NaoConformidade } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, ArrowLeft, AlertTriangle, Edit2, Filter, X } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '../lib/dateUtils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { createPageUrl } from '@/utils';
import { AssinaturasPage } from '@/components/relatorios/AssinaturasSection';

const isValidId = (id) => id && typeof id === 'string' && id.length > 0;

const CoverPage = ({ relatorio, empreendimento, pdfMode }) => {
    const year = new Date(relatorio?.data_vistoria || Date.now()).getFullYear();
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
            <div className="absolute w-full h-full bg-center bg-no-repeat z-10" style={{ backgroundImage: `url(${empreendimentoImageUrl})`, backgroundPosition: 'center 15%', backgroundSize: 'cover', opacity: 0.2, top: '-10px', left: '-10px', width: 'calc(100% + 20px)', height: 'calc(100% + 20px)' }}/>
            <div className="absolute top-0 left-0 w-full h-full bg-contain bg-left-top bg-no-repeat z-20" style={{ backgroundImage: `url(${coverFrameOriginalUrl})`, height: '150%' }} />
            <div className="absolute z-50" style={{ top: '25px', left: '11px', width: '350px', height: '170px' }}>
                <img src={logoInterativaUrl} alt="Logo Interativa" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} />
            </div>
            <div className="absolute flex items-center justify-center z-40" style={{ top: '23%', left: '11%', width: '22.7%', height: '25%', transform: 'rotate(27deg)' }}>
                <span className="font-normal text-white" style={{ fontSize: '60px', fontFamily: "'Inter', sans-serif", textShadow: '2px 2px 4px rgba(0,0,0,0.2)' }}>{year}</span>
            </div>
            <div className="absolute z-30" style={{ top: '10%', right: '8%', width: '50%', textAlign: 'right' }}>
                <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: '64px', fontWeight: 'bold', color: '#394557', lineHeight: '1.1', marginBottom: '4px' }}>RELATÓRIO</h1>
                <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: '29.5px', color: redColor, letterSpacing: '4px' }}>GERENCIAMENTO DE OBRAS</h2>
            </div>
            <div className="absolute z-30" style={{ top: '50%', right: '-3%', width: '45%', padding: '1.3% 2.5%', textAlign: 'center' }}>
                <h1 className="font-black uppercase" style={{ fontSize: '28px', lineHeight: '1.0', fontFamily: "'Inter', sans-serif", marginBottom: '6px', color: 'black' }}>{relatorio?.titulo_relatorio || 'Gerenciamento'}</h1>
                <h2 className="text-gray-600 font-medium" style={{ fontSize: '16px', fontFamily: "'Inter', sans-serif" }}>{relatorio?.subtitulo_relatorio || ''}</h2>
            </div>
            <div className="absolute z-20" style={{ top: '-350px', right: '-30%', width: '1700px', height: '1150px', backgroundColor: redColor, WebkitMaskImage: `url(${redDecorativeElementUrl})`, maskImage: `url(${redDecorativeElementUrl})`, WebkitMaskSize: '100% 100%', WebkitMaskRepeat: 'no-repeat', maskPosition: 'center' }}/>
            <div className="absolute z-50" style={{ top: '-10%', right: '-20%', width: '1800px', height: '800px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={logoInterativaBrancoUrl} alt="Logo Interativa" style={{ width: '100%', height: '100%', objectFit: 'contain' }}/>
            </div>
            <div className="absolute right-0 w-full h-full bg-no-repeat z-40" style={{ bottom: '-5%', backgroundImage: `url('${bottomRightFrameUrl}')`, height: '1000%', backgroundSize: '230% auto', backgroundPosition: '65% 100%' }}/>
            <div className="absolute z-10" style={{ bottom: '0%', left: '0%', width: '450px', height: '800px', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', clipPath: 'polygon(0 0%, 100% 23%, 100% 100%, 0% 100%)' }}>
                <img src={empreendimentoImageUrl} alt={empreendimento?.nome_empreendimento || 'Foto do empreendimento'} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
            </div>
            <div className="absolute flex items-center justify-center z-50" style={{ bottom: '0', left: '0', right: '0', height: '65px', backgroundColor: redColor, clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 5% 100%)', paddingLeft: '15%', paddingRight: '5%' }}>
                <span className="text-white w-full font-normal" style={{ ...getTextStyle(responsaveis), fontFamily: 'Poppins', textAlign: 'center', lineHeight: '1.2' }}>{responsaveis}</span>
            </div>
        </>
    );
};

const ITEMS_ON_CHARTS_PAGE = 8;

const ChartsPage = ({ chartData, relatorio, itensMais30Dias, filtroResponsavel }) => {
    const { barChartData, pieChartData, responsavelData } = chartData;
    const itemsToShow = itensMais30Dias ? itensMais30Dias.slice(0, ITEMS_ON_CHARTS_PAGE) : [];
    const hasMore = itensMais30Dias && itensMais30Dias.length > ITEMS_ON_CHARTS_PAGE;

    const PIE_COLORS = {
        OK: '#4A90E2',
        Pendente: '#D0021B',
        Parcial: '#7ED321'
    };

    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
        const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
        if (percent * 100 < 5) return null;
        return (
            <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    const totalPieItems = pieChartData.reduce((sum, d) => sum + d.value, 0);
    const totalBarItens = barChartData.reduce((sum, d) => sum + d.Itens, 0);
    const totalBarCorrigidos = barChartData.reduce((sum, d) => sum + d.Corrigidos, 0);
    
    const totalRespOK = responsavelData.reduce((sum, d) => sum + d.OK, 0);
    const totalRespParcial = responsavelData.reduce((sum, d) => sum + d.Parcial, 0);
    const totalRespPendente = responsavelData.reduce((sum, d) => sum + d.Pendente, 0);
    const totalRespItens = totalRespOK + totalRespParcial + totalRespPendente;

    return (
        <div className="p-3 space-y-2">
            <h2 className="text-sm font-bold mb-4 text-center">RELATÓRIO DE NÃO CONFORMIDADES</h2>
            {filtroResponsavel && (
                <div className="text-center text-[9px] bg-blue-50 border border-blue-200 rounded p-1 mb-2">
                    Filtrado por responsável: <strong>{filtroResponsavel}</strong>
                </div>
            )}
            {/* Primeiro: Gráfico de Pizza - Situação Geral */}
            <div>
                <div className="grid grid-cols-2 gap-3 items-center">
                    <div className="border p-1 rounded-lg bg-gray-50">
                        <ResponsiveContainer width="100%" height={100}>
                             <PieChart>
                                <Pie
                                    data={pieChartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={renderCustomizedLabel}
                                    outerRadius={40}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {pieChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.name]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value, name) => [value, name]} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                     <div>
                         <table className="w-full text-[9px] border-collapse border border-gray-400">
                           <thead className="bg-gray-200">
                             <tr>
                               <th className="border border-gray-300 p-0.5">Situação</th>
                               <th className="border border-gray-300 p-0.5">Qtd</th>
                             </tr>
                           </thead>
                           <tbody>
                             {pieChartData.map(d => (
                               <tr key={d.name} className="odd:bg-white even:bg-gray-50">
                                 <td className="border border-gray-300 p-0.5 flex items-center">
                                    <span className="h-1.5 w-1.5 rounded-full mr-1" style={{ backgroundColor: PIE_COLORS[d.name] }}></span>
                                    {d.name}
                                 </td>
                                 <td className="border border-gray-300 p-0.5 text-center">{d.value}</td>
                               </tr>
                             ))}
                           </tbody>
                            <tfoot className="font-bold bg-gray-200">
                               <tr>
                                   <td className="border border-gray-300 p-0.5">Total</td>
                                   <td className="border border-gray-300 p-0.5 text-center">{totalPieItems}</td>
                               </tr>
                            </tfoot>
                        </table>
                     </div>
                </div>
            </div>

            {/* Segundo: Gráfico de Barras - Resumo por Disciplina */}
            <div className="border-t pt-1.5">
                <h2 className="text-xs font-bold text-center mb-1 text-gray-700">Resumo por Disciplina</h2>
                <div className="grid grid-cols-2 gap-3 items-start">
                    <div className="border p-1 rounded-lg bg-gray-50">
                        <h3 className="font-semibold text-center mb-1 text-gray-600" style={{ fontSize: '9px' }}>Itens vs. Concluídos</h3>
                        <ResponsiveContainer width="100%" height={95}>
                            <BarChart data={barChartData} margin={{ top: 5, right: 15, left: -15, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" fontSize={7} />
                                <YAxis fontSize={7} />
                                <Tooltip />
                                <Legend wrapperStyle={{ fontSize: '8px' }} />
                                <Bar dataKey="Itens" fill="#8884d8" name="Total" />
                                <Bar dataKey="Corrigidos" fill="#82ca9d" name="Concluídos" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                     <div>
                        <table className="w-full text-[9px] border-collapse border border-gray-400">
                           <thead className="bg-gray-200">
                             <tr>
                               <th className="border border-gray-300 p-0.5">Disciplina</th>
                               <th className="border border-gray-300 p-0.5">Itens</th>
                               <th className="border border-gray-300 p-0.5">Concluído</th>
                             </tr>
                           </thead>
                           <tbody>
                             {barChartData.map((d) => (
                               <tr key={d.name} className="odd:bg-white even:bg-gray-50">
                                 <td className="border border-gray-300 p-0.5">{d.name}</td>
                                 <td className="border border-gray-300 p-0.5 text-center">{d.Itens}</td>
                                 <td className="border border-gray-300 p-0.5 text-center">{d.Corrigidos}</td>
                               </tr>
                             ))}
                           </tbody>
                           <tfoot className="font-bold bg-gray-200">
                                <tr>
                                    <td className="border border-gray-300 p-0.5">Total</td>
                                    <td className="border border-gray-300 p-0.5 text-center">{totalBarItens}</td>
                                    <td className="border border-gray-300 p-0.5 text-center">{totalBarCorrigidos}</td>
                                </tr>
                           </tfoot>
                        </table>
                    </div>
                </div>
            </div>

            {/* Terceiro: Tabela por Responsável */}
            {responsavelData.length > 0 && (
                <div className="border-t pt-1.5">
                    <h2 className="text-xs font-bold text-center mb-1 text-gray-700">Resumo por Responsável</h2>
                    <table className="w-full text-[8px] border-collapse border border-gray-400">
                        <thead className="bg-gray-200">
                            <tr>
                                <th className="border border-gray-300 p-0.5 text-left">Responsável</th>
                                <th className="border border-gray-300 p-0.5 text-center" style={{ backgroundColor: '#e8f4fd', color: '#4A90E2' }}>OK</th>
                                <th className="border border-gray-300 p-0.5 text-center" style={{ backgroundColor: '#f0fdf0', color: '#7ED321' }}>Parcial</th>
                                <th className="border border-gray-300 p-0.5 text-center" style={{ backgroundColor: '#fef2f2', color: '#D0021B' }}>Pendente</th>
                                <th className="border border-gray-300 p-0.5 text-center">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {responsavelData.map((d, idx) => (
                                <tr key={idx} className="odd:bg-white even:bg-gray-50">
                                    <td className="border border-gray-300 p-0.5" style={{ whiteSpace: 'pre-line', lineHeight: '1.4' }}>{d.responsavel}</td>
                                    <td className="border border-gray-300 p-0.5 text-center">{d.OK}</td>
                                    <td className="border border-gray-300 p-0.5 text-center">{d.Parcial}</td>
                                    <td className="border border-gray-300 p-0.5 text-center">{d.Pendente}</td>
                                    <td className="border border-gray-300 p-0.5 text-center font-medium">{d.OK + d.Parcial + d.Pendente}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="font-bold bg-gray-200">
                            <tr>
                                <td className="border border-gray-300 p-0.5">Total</td>
                                <td className="border border-gray-300 p-0.5 text-center">{totalRespOK}</td>
                                <td className="border border-gray-300 p-0.5 text-center">{totalRespParcial}</td>
                                <td className="border border-gray-300 p-0.5 text-center">{totalRespPendente}</td>
                                <td className="border border-gray-300 p-0.5 text-center">{totalRespItens}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}

            {/* Quarto: Itens com Status atualizado há mais de 30 dias - primeira parte */}
            <div className="border-t pt-1.5">
                <h2 className="text-xs font-bold text-center mb-1" style={{ color: '#D0021B' }}>
                    ⚠ Itens sem atualização há mais de 30 dias{hasMore ? ` (continua...)` : ''}
                </h2>
                {itemsToShow.length === 0 ? (
                    <p className="text-center text-gray-400 italic text-[9px]">Nenhum item sem atualização há mais de 30 dias</p>
                ) : (
                    <table className="w-full text-[8px] border-collapse border border-gray-400">
                        <thead className="bg-red-100">
                            <tr>
                                <th className="border border-gray-300 p-0.5 text-center">Item</th>
                                <th className="border border-gray-300 p-0.5 text-left">Local</th>
                                <th className="border border-gray-300 p-0.5 text-left">Disciplina</th>
                                <th className="border border-gray-300 p-0.5 text-left">Não Conformidade</th>
                                <th className="border border-gray-300 p-0.5 text-left">Responsável</th>
                                <th className="border border-gray-300 p-0.5 text-center">Último Status</th>
                                <th className="border border-gray-300 p-0.5 text-center">Data Status</th>
                                <th className="border border-gray-300 p-0.5 text-center">Dias sem atualiz.</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itemsToShow.map((item, idx) => {
                                const hoje = new Date();
                                const dataStatus = new Date(item.data_status.includes('T') ? item.data_status : item.data_status + 'T12:00:00');
                                const diffDays = Math.round((hoje - dataStatus) / (1000 * 60 * 60 * 24));
                                return (
                                    <tr key={idx} className="odd:bg-white even:bg-red-50">
                                        <td className="border border-gray-300 px-1 py-1.5 text-center font-bold align-middle" style={{lineHeight:'1.4'}}>{item.itemNumber}</td>
                                        <td className="border border-gray-300 px-1 py-1.5 align-middle" style={{lineHeight:'1.4'}}>{item.local}</td>
                                        <td className="border border-gray-300 px-1 py-1.5 align-middle" style={{lineHeight:'1.4'}}>{item.disciplina}</td>
                                        <td className="border border-gray-300 px-1 py-1.5 align-middle" style={{lineHeight:'1.4'}}>{item.anomalia}</td>
                                        <td className="border border-gray-300 px-1 py-1.5 align-middle" style={{lineHeight:'1.4'}}>{item.responsavel}</td>
                                        <td className="border border-gray-300 px-1 py-1.5 text-center align-middle" style={{lineHeight:'1.4'}}>{item.cronograma_atividade}</td>
                                        <td className="border border-gray-300 px-1 py-1.5 text-center align-middle" style={{lineHeight:'1.4'}}>{format(dataStatus, 'dd/MM/yyyy', { locale: ptBR })}</td>
                                        <td className="border border-gray-300 px-1 py-1.5 text-center font-bold align-middle" style={{ color: '#D0021B', lineHeight:'1.4' }}>{diffDays}d</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

const measure30DiasItemHeight = (item) => {
    const supportsDOM = typeof document !== 'undefined' && document.body;
    if (!supportsDOM) return 30;
    const tempDiv = document.createElement('div');
    // Use narrower width to account for container padding (12px each side) + safety margin
    tempDiv.style.cssText = 'position:absolute;visibility:hidden;width:calc(210mm - 24px);box-sizing:border-box;font-family:Inter,sans-serif;font-size:8px;';
    tempDiv.innerHTML = `<table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:8px;">
        <tr>
            <td style="border:1px solid #ccc;padding:2px;width:4%;word-break:break-word;">${escHtml(item.itemNumber)}</td>
            <td style="border:1px solid #ccc;padding:2px;width:8%;word-break:break-word;">${escHtml(item.local)}</td>
            <td style="border:1px solid #ccc;padding:2px;width:8%;word-break:break-word;">${escHtml(item.disciplina)}</td>
            <td style="border:1px solid #ccc;padding:2px;width:32%;word-break:break-word;">${escHtml(item.anomalia)}</td>
            <td style="border:1px solid #ccc;padding:2px;width:14%;word-break:break-word;">${escHtml(item.responsavel || '')}</td>
            <td style="border:1px solid #ccc;padding:2px;width:8%;">${escHtml(item.cronograma_atividade || '')}</td>
            <td style="border:1px solid #ccc;padding:2px;width:10%;">${escHtml(item.data_status || '')}</td>
            <td style="border:1px solid #ccc;padding:2px;width:8%;">99d</td>
        </tr>
    </table>`;
    document.body.appendChild(tempDiv);
    const height = tempDiv.offsetHeight + 10;
    document.body.removeChild(tempDiv);
    return height;
};

const HEADER_30_HEIGHT = 60; // altura do título + cabeçalho da tabela

const paginate30DiasItems = (items) => {
    const pages = [];
    let currentPage = [];
    let currentHeight = HEADER_30_HEIGHT;
    const usable = USABLE_HEIGHT_NC;

    items.forEach((item) => {
        const h = measure30DiasItemHeight(item);
        if (currentPage.length > 0 && currentHeight + h > usable) {
            pages.push(currentPage);
            currentPage = [];
            currentHeight = HEADER_30_HEIGHT;
        }
        currentPage.push(item);
        currentHeight += h;
    });
    if (currentPage.length > 0) pages.push(currentPage);
    return pages;
};

const ItensMais30DiasPage = ({ items, pageIndex, totalPages30 }) => {
    const hoje = new Date();
    if (!items || items.length === 0) return null;
    return (
        <div style={{ paddingTop: '4px', paddingLeft: '12px', paddingRight: '12px', paddingBottom: '4px' }}>
            <h2 className="text-xs font-bold text-center mb-1" style={{ color: '#D0021B' }}>
                ⚠ Itens sem atualização há mais de 30 dias{totalPages30 > 1 ? ` (continuação ${pageIndex + 1}/${totalPages30})` : ' (continuação)'}
            </h2>
            <table className="w-full text-[8px] border-collapse border border-gray-400">
                <thead className="bg-red-100">
                    <tr>
                        <th className="border border-gray-300 p-0.5 text-center">Item</th>
                        <th className="border border-gray-300 p-0.5 text-left">Local</th>
                        <th className="border border-gray-300 p-0.5 text-left">Disciplina</th>
                        <th className="border border-gray-300 p-0.5 text-left">Não Conformidade</th>
                        <th className="border border-gray-300 p-0.5 text-left">Responsável</th>
                        <th className="border border-gray-300 p-0.5 text-center">Último Status</th>
                        <th className="border border-gray-300 p-0.5 text-center">Data Status</th>
                        <th className="border border-gray-300 p-0.5 text-center">Dias sem atualiz.</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, idx) => {
                        const dataStatus = new Date(item.data_status.includes('T') ? item.data_status : item.data_status + 'T12:00:00');
                        const diffDays = Math.round((hoje - dataStatus) / (1000 * 60 * 60 * 24));
                        return (
                            <tr key={idx} className="odd:bg-white even:bg-red-50">
                                <td className="border border-gray-300 px-1 py-1.5 text-center font-bold align-middle" style={{lineHeight:'1.4'}}>{item.itemNumber}</td>
                                <td className="border border-gray-300 px-1 py-1.5 align-middle" style={{lineHeight:'1.4'}}>{item.local}</td>
                                <td className="border border-gray-300 px-1 py-1.5 align-middle" style={{lineHeight:'1.4'}}>{item.disciplina}</td>
                                <td className="border border-gray-300 px-1 py-1.5 align-middle" style={{lineHeight:'1.4'}}>{item.anomalia}</td>
                                <td className="border border-gray-300 px-1 py-1.5 align-middle" style={{lineHeight:'1.4'}}>{item.responsavel}</td>
                                <td className="border border-gray-300 px-1 py-1.5 text-center align-middle" style={{lineHeight:'1.4'}}>{item.cronograma_atividade}</td>
                                <td className="border border-gray-300 px-1 py-1.5 text-center align-middle" style={{lineHeight:'1.4'}}>{format(dataStatus, 'dd/MM/yyyy', { locale: ptBR })}</td>
                                <td className="border border-gray-300 px-1 py-1.5 text-center font-bold align-middle" style={{ color: '#D0021B', lineHeight:'1.4' }}>{diffDays}d</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

const ContentPage = ({ relatorio, empreendimento, items }) => {
    const secaoNome = items[0]?.secaoNome || relatorio?.titulo_relatorio || 'Não Conformidade / Check List';
    
    return (
        <>
            <div className="p-4 border-b-2 border-black">
                <div className="flex justify-between items-start mb-2">
                    <div className="w-full">
                        <div className="border border-black p-2 text-center">
                            <h1 className="font-bold text-lg">{secaoNome}</h1>
                        </div>
                    </div>
                <div className="text-sm border border-black ml-2 whitespace-nowrap">
                    <div className="p-1 border-b border-black"><strong>ENGª OBRA:</strong> {relatorio?.eng_obra || ''}</div>
                    <div className="p-1 border-b border-black"><strong>DATA:</strong> {relatorio?.data_vistoria ? format(parseLocalDate(relatorio.data_vistoria), 'dd/MM/yyyy', { locale: ptBR }) : ''}</div>
                    <div className="p-1"><strong>REVISÃO:</strong> {relatorio?.revisao || ''}</div>
                </div>
            </div>
        </div>
        <div className="p-4">
            <table className="w-full border-collapse text-xs">
                <thead>
                    <tr className="bg-gray-200">
                        <th className="border border-black p-1">Item</th>
                        <th className="border border-black p-1">Local</th>
                        <th className="border border-black p-1">Disciplina</th>
                        <th className="border border-black p-1">Não Conformidade</th>
                        <th className="border border-black p-1">Relatório</th>
                        <th className="border border-black p-1">Plano de Melhoria</th>
                        <th className="border border-black p-1">Responsável</th>
                        <th className="border border-black p-1">Prazo</th>
                        <th className="border border-black p-1">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {items.map((item, index) => (
                        <tr key={index} className="avoid-break">
                            <td className="border border-black p-1 text-center">{item.itemNumber}</td>
                            <td className="border border-black p-1">{item.local}</td>
                            <td className="border border-black p-1">{item.disciplina}</td>
                            <td className="border border-black p-1">{item.anomalia}</td>
                            <td className="border border-black p-1">{item.complemento || ''}</td>
                            <td className="border border-black p-1">{item.plano_melhoria}</td>
                            <td className="border border-black p-1" style={{ fontFamily: 'Arial, sans-serif', whiteSpace: 'pre-line', minWidth: '120px', lineHeight: '1.8' }}>{item.responsavel || ''}</td>
                            <td className="border border-black p-1 text-center">
                                {item.prazo && format(new Date(item.prazo.includes('T') ? item.prazo : item.prazo + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                            </td>
                            <td className="border border-black p-1 text-center">
                                <div className="font-medium">{item.cronograma_atividade}</div>
                                {item.data_status && (
                                    <div className="text-xs mt-1 text-gray-600">
                                        {format(new Date(item.data_status.includes('T') ? item.data_status : item.data_status + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </>
    );
};

const PAGE_HEIGHT_PX = 1122;
const HEADER_HEIGHT_NC = 80;
const FOOTER_HEIGHT_NC = 45;
const FOOTER_GUARD_PX = 8;
const CONTENT_HEADER_HEIGHT = 100; // header da tabela na primeira página de conteúdo
const USABLE_HEIGHT_NC = PAGE_HEIGHT_PX - HEADER_HEIGHT_NC - FOOTER_HEIGHT_NC - FOOTER_GUARD_PX;

const escHtml = (s) => s ? String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';

const measureNCItemHeightDOM = (item) => {
    const supportsDOM = typeof document !== 'undefined' && document.body;
    if (!supportsDOM) {
        // Fallback: estimativa por caracteres
        const longestCell = Math.max(
            (item.anomalia || '').length,
            (item.plano_melhoria || '').length,
            (item.responsavel || '').length,
        );
        return 30 + Math.max(1, Math.ceil(longestCell / 40)) * 16 + 8;
    }
    const tempDiv = document.createElement('div');
    // Use narrower width to account for p-4 padding (16px each side) + safety margin
    tempDiv.style.cssText = 'position:absolute;visibility:hidden;width:calc(210mm - 32px);box-sizing:border-box;font-family:Inter,sans-serif;font-size:12px;';
    tempDiv.innerHTML = `<table style="width:100%;border-collapse:collapse;table-layout:fixed;font-size:12px;">
        <tr>
            <td style="border:1px solid #000;padding:4px;word-break:break-word;">${escHtml(item.local)}</td>
            <td style="border:1px solid #000;padding:4px;word-break:break-word;">${escHtml(item.disciplina)}</td>
            <td style="border:1px solid #000;padding:4px;word-break:break-word;">${escHtml(item.anomalia)}</td>
            <td style="border:1px solid #000;padding:4px;word-break:break-word;">${escHtml(item.complemento || '')}</td>
            <td style="border:1px solid #000;padding:4px;word-break:break-word;">${escHtml(item.plano_melhoria || '')}</td>
            <td style="border:1px solid #000;padding:4px;word-break:break-word;white-space:pre-line;">${escHtml(item.responsavel || '')}</td>
            <td style="border:1px solid #000;padding:4px;">${escHtml(item.prazo || '')}</td>
            <td style="border:1px solid #000;padding:4px;">${escHtml(item.cronograma_atividade || '')}</td>
        </tr>
    </table>`;
    document.body.appendChild(tempDiv);
    const height = tempDiv.offsetHeight + 12;
    document.body.removeChild(tempDiv);
    return height;
};

const paginateContent = (relatorio) => {
    const pages = [];
    const allItems = relatorio.secoes.flatMap(s =>
        (s.itens || []).map(item => ({ ...item, secaoNome: s.nome_secao }))
    ).map((item, index) => ({ ...item, itemNumber: index + 1 }));

    let currentPage = [];
    let currentHeight = 0;
    const usable = USABLE_HEIGHT_NC - CONTENT_HEADER_HEIGHT;

    allItems.forEach((item) => {
        const itemHeight = measureNCItemHeightDOM(item);

        if (currentPage.length > 0 && currentHeight + itemHeight > usable) {
            pages.push(currentPage);
            currentPage = [];
            currentHeight = 0;
        }

        currentPage.push(item);
        currentHeight += itemHeight;
    });

    if (currentPage.length > 0) pages.push(currentPage);

    return pages;
};

const ReportPageLayout = ({ children, pageNumber, totalPages, relatorio, empreendimento, pdfMode }) => {
    const logoHorizontalCompressed = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/4bd521d1e_LOGOHORIZONTAl.png";
    const HEADER_HEIGHT = pageNumber > 1 ? '80px' : '0px';
    const FOOTER_HEIGHT = '45px';
    const isCover = pageNumber === 1;

    return (
        <div className={`report-page w-full relative bg-white ${pdfMode ? 'pdf-mode' : ''}`}>
            {!isCover && (
                <div className="flex justify-between items-center border-b border-gray-200 bg-white" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_HEIGHT, zIndex: 100, padding: '4px 8px', maxWidth: '210mm', boxSizing: 'border-box' }}>
                    <img src={logoHorizontalCompressed} alt="Logo Interativa Engenharia" style={{ height: '32px', maxWidth: '120px', objectFit: 'contain' }} />
                    <div className="text-right" style={{ flex: 1, paddingLeft: '8px', overflow: 'hidden' }}>
                        <h2 className="text-[10px] font-bold text-gray-800 uppercase leading-tight truncate">{relatorio?.titulo_relatorio || 'NÃO CONFORMIDADE'}</h2>
                        <p className="text-[9px] text-gray-600 leading-tight truncate">{empreendimento?.nome_empreendimento} - {relatorio?.cliente}</p>
                        <p className="text-[9px] font-medium text-gray-800 leading-tight">{relatorio?.data_vistoria ? format(parseLocalDate(relatorio.data_vistoria), 'dd/MM/yyyy', { locale: ptBR }) : ''}</p>
                    </div>
                </div>
            )}
            <div className="overflow-hidden" style={{ paddingTop: HEADER_HEIGHT, paddingBottom: FOOTER_HEIGHT }}>
                {children}
            </div>
            <div className="border-t border-gray-200 bg-gray-50 flex justify-between items-center text-[9px] text-gray-500" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: FOOTER_HEIGHT, padding: '4px 8px', maxWidth: '210mm', boxSizing: 'border-box' }}>
                <div className="flex-1 text-left leading-tight truncate" style={{ paddingRight: '8px' }}><span className="font-medium">Arquivo: </span><span>{relatorio.nome_arquivo ? `${relatorio.nome_arquivo}.pdf` : `NC-${relatorio.id?.slice(-4)}.pdf`}</span></div>
                <div className="flex-1 flex flex-col items-center leading-tight text-[8px]"><span>INTERATIVA ENGENHARIA</span><span>www.interativaengenharia.com.br</span></div>
                <div className="flex-1 text-right leading-tight" style={{ paddingLeft: '8px' }}><span>Página {pageNumber} de {totalPages}</span></div>
            </div>
        </div>
    );
};

const QRCodePage = () => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.href)}`;
    return (
        <div className="p-8 flex flex-col items-center justify-center" style={{ minHeight: 'calc(297mm - 125px)' }}>
            <h2 className="text-xl font-bold text-gray-800 mb-8 text-center">Acesse este Relatório</h2>
            <div className="text-center bg-white p-8 rounded-lg border-2 border-gray-200 max-w-sm w-full">
                <img src={qrUrl} alt="QR Code" className="w-56 h-56 mx-auto mb-6" />
                <p className="text-sm text-gray-600 mb-4">Escaneie o QR Code para acessar este relatório online</p>
                <p className="text-xs text-gray-500 break-all">{window.location.href}</p>
            </div>
        </div>
    );
};

const ReportContent = ({ relatorio: relatorioInitial, empreendimento, navigate }) => {
    const [relatorio, setRelatorio] = useState(relatorioInitial);
    const [isPrintingMode, setIsPrintingMode] = useState(false);
    const [filtroResponsavel, setFiltroResponsavel] = useState('');

    const responsaveisUnicos = useMemo(() => {
        const set = new Set();
        (relatorio.secoes || []).forEach(s => (s.itens || []).forEach(item => {
            const r = item.responsavel?.trim();
            if (r) set.add(r);
        }));
        return Array.from(set).sort();
    }, [relatorio.secoes]);

    const filteredSecoes = useMemo(() => {
        if (!filtroResponsavel) return relatorio.secoes || [];
        return (relatorio.secoes || []).map(s => ({
            ...s,
            itens: (s.itens || []).filter(item => item.responsavel?.trim() === filtroResponsavel)
        }));
    }, [relatorio.secoes, filtroResponsavel]);

    const filteredRelatorio = useMemo(() => ({
        ...relatorio,
        secoes: filteredSecoes
    }), [relatorio, filteredSecoes]);

    const summaryStats = useMemo(() => {
        if (!filteredSecoes.length) return [];

        const disciplineMap = new Map();

        filteredSecoes.forEach(secao => {
            if (secao.itens && Array.isArray(secao.itens)) {
                secao.itens.forEach(item => {
                    const disciplina = item.disciplina || 'Sem Disciplina';
                    
                    if (!disciplineMap.has(disciplina)) {
                        disciplineMap.set(disciplina, {
                            name: disciplina,
                            Itens: 0,
                            Corrigidos: 0
                        });
                    }

                    const stats = disciplineMap.get(disciplina);
                    stats.Itens++;
                    if (item.cronograma_atividade === 'OK') {
                        stats.Corrigidos++;
                    }
                });
            }
        });

        return Array.from(disciplineMap.values()).sort((a, b) =>
            a.name.localeCompare(b.name)
        );
    }, [filteredSecoes]);

    const pieChartData = useMemo(() => {
        const allItems = filteredSecoes.flatMap(s => s.itens || []);
        const statusData = { OK: 0, Pendente: 0, Parcial: 0 };
        allItems.forEach(item => {
            const status = item.cronograma_atividade;
            if (statusData[status] !== undefined) {
                statusData[status]++;
            }
        });
        return [
            { name: 'OK', value: statusData.OK },
            { name: 'Pendente', value: statusData.Pendente },
            { name: 'Parcial', value: statusData.Parcial },
        ].filter(d => d.value > 0);
    }, [filteredSecoes]);

    const responsavelData = useMemo(() => {
        const allItems = filteredSecoes.flatMap(s => s.itens || []);
        const responsavelMap = new Map();

        allItems.forEach(item => {
            const responsavel = item.responsavel?.trim() || 'Não Definido';
            const status = item.cronograma_atividade;

            if (!responsavelMap.has(responsavel)) {
                responsavelMap.set(responsavel, { responsavel, OK: 0, Parcial: 0, Pendente: 0 });
            }

            const stats = responsavelMap.get(responsavel);
            if (status === 'OK') stats.OK++;
            else if (status === 'Parcial') stats.Parcial++;
            else if (status === 'Pendente') stats.Pendente++;
        });

        return Array.from(responsavelMap.values()).sort((a, b) => 
            a.responsavel.localeCompare(b.responsavel)
        );
    }, [filteredSecoes]);

    const chartData = useMemo(() => ({
        barChartData: summaryStats,
        pieChartData: pieChartData,
        responsavelData: responsavelData
    }), [summaryStats, pieChartData, responsavelData]);

    const contentPages = useMemo(() => paginateContent(filteredRelatorio), [filteredRelatorio]);

    const itensMais30Dias = useMemo(() => {
        if (!filteredSecoes.length) return [];
        const hoje = new Date();
        const allItems = filteredSecoes.flatMap(s => s.itens || []).map((item, idx) => ({ ...item, itemNumber: idx + 1 }));
        const filtered = allItems.filter(item => {
            if (item.cronograma_atividade === 'OK') return false;
            if (!item.data_status) return false;
            const dataStatus = new Date(item.data_status.includes('T') ? item.data_status : item.data_status + 'T12:00:00');
            return (hoje - dataStatus) / (1000 * 60 * 60 * 24) >= 30;
        });
        return filtered.map((item, idx) => ({ ...item, itemNumber: idx + 1 }));
    }, [filteredSecoes]);

    const itens30Pages = useMemo(() => {
        const overflow = itensMais30Dias.slice(ITEMS_ON_CHARTS_PAGE);
        if (overflow.length === 0) return [];
        return paginate30DiasItems(overflow);
    }, [itensMais30Dias]);

    const hasAssinaturas = useMemo(() => {
        return relatorio.assinaturas && relatorio.assinaturas.length > 0 && 
            relatorio.assinaturas.some(ass => (ass.nome && ass.nome.trim() !== '') || (ass.parte && ass.parte.trim() !== '') || (ass.assinatura_imagem && ass.assinatura_imagem.trim() !== ''));
    }, [relatorio]);

    const totalPages = 1 + 1 + itens30Pages.length + contentPages.length + 1 + (hasAssinaturas ? 1 : 0);

    const handlePrint = async () => {
        setIsPrintingMode(true);
        await new Promise(resolve => setTimeout(resolve, 500));
        window.print();
        setTimeout(() => setIsPrintingMode(false), 1000);
    };

    let currentPage = 1;

    const [editCoverOpen, setEditCoverOpen] = useState(false);
    const [editedRelatorio, setEditedRelatorio] = useState(relatorio);

    const handleSaveCover = async () => {
        try {
            await NaoConformidade.update(relatorio.id, {
                titulo_capa: editedRelatorio.titulo_capa,
                subtitulo_capa: editedRelatorio.subtitulo_capa,
                texto_rodape_capa: editedRelatorio.texto_rodape_capa,
                titulo_relatorio: editedRelatorio.titulo_relatorio,
                subtitulo_relatorio: editedRelatorio.subtitulo_relatorio,
                cliente: editedRelatorio.cliente,
                eng_obra: editedRelatorio.eng_obra,
                revisao: editedRelatorio.revisao,
                nome_arquivo: editedRelatorio.nome_arquivo
            });
            setRelatorio(editedRelatorio);
            setEditCoverOpen(false);
        } catch (err) {
            console.error('Erro ao salvar:', err);
        }
    };

    return (
        <div className="bg-gray-200 print:bg-white min-h-screen font-sans">
            <div className="no-print shadow-sm border-b p-4 mb-4 bg-white">
                <div className="flex justify-between items-center max-w-4xl mx-auto">
                    <Button onClick={() => navigate(-1)} variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
                    <h1 className="text-xl font-semibold text-gray-800">Visualizar Não Conformidade</h1>
                    <div className="flex gap-2">
                        <Button onClick={() => setEditCoverOpen(true)} variant="outline" className="bg-blue-50"><Edit2 className="w-4 h-4 mr-2" />Editar Capa</Button>
                        <Button onClick={handlePrint} disabled={isPrintingMode} className="bg-green-600 hover:bg-green-700 text-white">
                            {isPrintingMode ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
                            {isPrintingMode ? 'Preparando...' : 'Gerar PDF'}
                        </Button>
                    </div>
                </div>
                {responsaveisUnicos.length > 0 && (
                    <div className="flex items-center gap-2 max-w-4xl mx-auto mt-3 pt-3 border-t border-gray-100">
                        <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
                        <span className="text-sm text-gray-600 flex-shrink-0">Filtrar por Responsável:</span>
                        <Select value={filtroResponsavel || '__all__'} onValueChange={v => setFiltroResponsavel(v === '__all__' ? '' : v)}>
                            <SelectTrigger className="w-64 h-8 text-sm">
                                <SelectValue placeholder="Todos os Responsáveis" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__all__">Todos os Responsáveis</SelectItem>
                                {responsaveisUnicos.map(r => (
                                    <SelectItem key={r} value={r}>{r}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {filtroResponsavel && (
                            <Button variant="ghost" size="sm" onClick={() => setFiltroResponsavel('')} className="h-8 text-xs text-gray-500 gap-1">
                                <X className="w-3 h-3" />Limpar
                            </Button>
                        )}
                    </div>
                )}
            </div>

            <Dialog open={editCoverOpen} onOpenChange={setEditCoverOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Informações Gerais</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-6">
                        {/* Títulos da Capa */}
                        <div className="border rounded-lg p-4 bg-blue-50">
                            <h3 className="font-semibold text-sm mb-4 text-blue-900">Títulos da Capa</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs font-semibold">Título Principal da Capa</Label>
                                    <Input value={editedRelatorio.titulo_capa || 'RELATÓRIO'} onChange={(e) => setEditedRelatorio({...editedRelatorio, titulo_capa: e.target.value})} className="mt-1" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Subtítulo da Capa (vermelho)</Label>
                                    <Input value={editedRelatorio.subtitulo_capa || 'Gerenciamento de Obra'} onChange={(e) => setEditedRelatorio({...editedRelatorio, subtitulo_capa: e.target.value})} className="mt-1" />
                                </div>
                            </div>
                        </div>

                        {/* Informações Centrais da Capa */}
                        <div className="border rounded-lg p-4 bg-blue-50">
                            <h3 className="font-semibold text-sm mb-4 text-blue-900">Informações Centrais da Capa</h3>
                            <div className="space-y-3">
                                <div>
                                    <Label className="text-xs font-semibold">Título do Relatório (grande)</Label>
                                    <Input value={editedRelatorio.titulo_relatorio || ''} onChange={(e) => setEditedRelatorio({...editedRelatorio, titulo_relatorio: e.target.value})} className="mt-1" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Informações Adicionais (pequeno)</Label>
                                    <Input value={editedRelatorio.subtitulo_relatorio || ''} onChange={(e) => setEditedRelatorio({...editedRelatorio, subtitulo_relatorio: e.target.value})} placeholder="Ex: 1º subsolo: Central de água quente Estúdios" className="mt-1" />
                                </div>
                            </div>
                        </div>

                        {/* Rodapé da Capa */}
                        <div className="border rounded-lg p-4 bg-red-50 border-red-200">
                            <h3 className="font-semibold text-sm mb-4 text-red-900">Rodapé da Capa (barra vermelha inferior)</h3>
                            <div>
                                <Label className="text-xs font-semibold">Texto do Rodapé</Label>
                                <Input value={editedRelatorio.texto_rodape_capa || ''} onChange={(e) => setEditedRelatorio({...editedRelatorio, texto_rodape_capa: e.target.value})} placeholder="Ex: Most Moema | Ed. Most Moema | MPD" className="mt-1" />
                                <p className="text-xs text-gray-500 mt-1">Este texto será exibido no rodapé da capa</p>
                            </div>
                        </div>

                        {/* Informações Adicionais */}
                        <div className="border rounded-lg p-4 bg-gray-50">
                            <h3 className="font-semibold text-sm mb-4">Informações Adicionais</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-xs font-semibold">Cliente</Label>
                                    <Input value={editedRelatorio.cliente || ''} onChange={(e) => setEditedRelatorio({...editedRelatorio, cliente: e.target.value})} className="mt-1" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Engenheiro da Obra</Label>
                                    <Input value={editedRelatorio.eng_obra || ''} onChange={(e) => setEditedRelatorio({...editedRelatorio, eng_obra: e.target.value})} className="mt-1" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Revisão</Label>
                                    <Input value={editedRelatorio.revisao || ''} onChange={(e) => setEditedRelatorio({...editedRelatorio, revisao: e.target.value})} className="mt-1" />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold">Nome do Arquivo (sem .pdf)</Label>
                                    <Input value={editedRelatorio.nome_arquivo || ''} onChange={(e) => setEditedRelatorio({...editedRelatorio, nome_arquivo: e.target.value})} className="mt-1" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditCoverOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSaveCover} className="bg-blue-600 hover:bg-blue-700">Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <div className="report-container max-w-4xl mx-auto" style={{ padding: 0 }}>
                {/* Page 1: Cover */}
                <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento} pdfMode={isPrintingMode}>
                    <CoverPage relatorio={relatorio} empreendimento={empreendimento} pdfMode={isPrintingMode} />
                </ReportPageLayout>

                {/* Page 2: Charts */}
                <ReportPageLayout 
                    pageNumber={currentPage++} 
                    totalPages={totalPages} 
                    relatorio={relatorio} 
                    empreendimento={empreendimento}
                    pdfMode={isPrintingMode}
                >
                    <ChartsPage chartData={chartData} relatorio={relatorio} itensMais30Dias={itensMais30Dias} filtroResponsavel={filtroResponsavel} />
                </ReportPageLayout>

                {/* Pages 3+: Itens sem atualização há mais de 30 dias */}
                {itens30Pages.map((pageItems, index) => (
                    <ReportPageLayout key={`30dias-${index}`} pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento} pdfMode={isPrintingMode}>
                        <ItensMais30DiasPage items={pageItems} pageIndex={index} totalPages30={itens30Pages.length} />
                    </ReportPageLayout>
                ))}

                {/* Detailed Sections */}
                {contentPages.map((pageItems, index) => (
                    <ReportPageLayout key={`content-page-${index}`} pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento} pdfMode={isPrintingMode}>
                        <ContentPage relatorio={relatorio} empreendimento={empreendimento} items={pageItems} />
                    </ReportPageLayout>
                ))}

                <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento} pdfMode={isPrintingMode}>
                    <QRCodePage />
                </ReportPageLayout>

                {/* Signatures Page if signatures exist */}
                {relatorio.assinaturas && relatorio.assinaturas.length > 0 &&
                    relatorio.assinaturas.some(ass => (ass.nome && ass.nome.trim() !== '') || (ass.parte && ass.parte.trim() !== '') || (ass.assinatura_imagem && ass.assinatura_imagem.trim() !== '')) && (
                    <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento} pdfMode={isPrintingMode}>
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

                    .no-print, aside, header, nav { display: none !important; }

                    html, body, * { 
                        overflow: visible !important;
                        -ms-overflow-style: none !important;
                        scrollbar-width: none !important;
                    }

                    *::-webkit-scrollbar { display: none !important; }

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

export default function VisualizarNaoConformidade() {
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
                setLoading(true);
                const relatorioData = await NaoConformidade.get(relatorioId);
                if (!relatorioData) throw new Error("Relatório não encontrado.");
                
                const empreendimentoData = await Empreendimento.get(relatorioData.id_empreendimento);
                if (!empreendimentoData) throw new Error("Empreendimento associado não encontrado.");

                setRelatorio(relatorioData);
                setEmpreendimento(empreendimentoData);
                setError(null);
            } catch (err) {
                setError(err.message);
                setRelatorio(null);
                setEmpreendimento(null);
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