import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Empreendimento } from '@/api/entities';
import { VistoriaTerminalidade } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, ArrowLeft, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { createPageUrl } from '@/utils';
import { AssinaturasPage } from '@/components/relatorios/AssinaturasSection';


// Helper function to check if an ID is valid
const isValidId = (id) => id && typeof id === 'string' && id.length > 0;

// Função para comprimir imagens usando dimensões de exibição (150x120px)
const compressImage = (url, quality = 0.6) => {
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

            // Redimensiona para o tamanho de exibição: 150x120px
            canvas.width = 150;
            canvas.height = 120;

            ctx.drawImage(img, 0, 0, 150, 120);

            const compressedUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedUrl);
        };

        img.onerror = () => {
            console.warn(`Erro ao comprimir imagem: ${url}`);
            resolve(url);
        };

        img.src = url;
    });
};

// Hook para comprimir imagens
const useCompressedImage = (url, quality = 0.6) => {
    const [compressedUrl, setCompressedUrl] = React.useState(url);

    React.useEffect(() => {
        if (url && typeof url === 'string' && url.startsWith('http')) {
            compressImage(url, quality).then(setCompressedUrl);
        } else {
            setCompressedUrl(url);
        }
    }, [url, quality]);

    return compressedUrl;
};



// Report Pages Components
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
                <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: '29.5px', color: redColor, letterSpacing: '4px' }}>VISTORIA DE TERMINALIDADE</h2>
            </div>
            <div className="absolute z-30" style={{ top: '50%', right: '-3%', width: '45%', padding: '1.3% 2.5%', textAlign: 'center' }}>
                <h1 className="font-black uppercase" style={{ fontSize: '28px', lineHeight: '1.0', fontFamily: "'Inter', sans-serif", marginBottom: '6px', color: 'black' }}>{relatorio?.titulo_relatorio || 'Gerenciamento'}</h1>
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

const ChartsPage = ({ chartData, relatorio }) => {
    const { barChartData, pieChartData, responsavelData } = chartData;

    const PIE_COLORS = {
        Concluído: '#4A90E2', // Blue
        Pendente: '#D0021B', // Red
        Parcial: '#7ED321' // Green
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

    // Totais por responsável
    const totalRespOK = responsavelData.reduce((sum, d) => sum + d.OK, 0);
    const totalRespParcial = responsavelData.reduce((sum, d) => sum + d.Parcial, 0);
    const totalRespPendente = responsavelData.reduce((sum, d) => sum + d.Pendente, 0);
    const totalRespItens = totalRespOK + totalRespParcial + totalRespPendente;

    return (
        <div className="p-3 space-y-2">
            <h2 className="text-sm font-bold mb-4 text-center">VISTORIA DE TERMINALIDADE/ CHECK LIST</h2>
            {/* Primeiro: Gráfico de Pizza - Situação Geral */}
            <div>
                <h2 className="text-xs font-bold text-center mb-1 text-gray-700">Situação das Atividades de Terminalidade</h2>
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
                        <h3 className="font-semibold text-center mb-1 text-gray-600" style={{ fontSize: '9px' }}>Itens vs. Corrigidos</h3>
                        <ResponsiveContainer width="100%" height={95}>
                            <BarChart data={barChartData} margin={{ top: 5, right: 15, left: -15, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" fontSize={7} />
                                <YAxis fontSize={7} />
                                <Tooltip />
                                <Legend wrapperStyle={{ fontSize: '8px' }} />
                                <Bar dataKey="Itens" fill="#8884d8" name="Total" />
                                <Bar dataKey="Corrigidos" fill="#82ca9d" name="Corrigidos" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div>
                        <table className="w-full text-[9px] border-collapse border border-gray-400">
                            <thead className="bg-gray-200">
                                <tr>
                                    <th className="border border-gray-300 p-0.5">Instalações</th>
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
                                <th className="border border-gray-300 p-0.5 text-center" style={{ backgroundColor: '#e8f4fd', color: '#4A90E2' }}>Concluído</th>
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
        </div>
    );
};

const ContentPage = ({ relatorio, empreendimento, items }) => {
    // Pega o nome da seção do primeiro item (todos os itens de uma página geralmente são da mesma seção)
    const secaoNome = items[0]?.secaoNome || relatorio?.titulo_relatorio || 'Vistoria de Terminalidade / Check List';

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
                        <div className="p-1 border-b border-black"><strong>DATA:</strong> {relatorio?.data_vistoria ? format(new Date(relatorio.data_vistoria), 'dd/MM/yyyy', { locale: ptBR }) : ''}</div>
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
                            <th className="border border-black p-1 w-40">Imagem</th>
                            <th className="border border-black p-1">Plano de Melhoria</th>
                            <th className="border border-black p-1">Status</th>
                            <th className="border border-black p-1">Responsável</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => {
                            if (item.isContinuation) {
                                return (
                                    <tr key={index} className="avoid-break">
                                        <td className="border border-black p-1 text-center">{item.itemNumber}</td>
                                        <td className="border border-black p-1 text-center italic text-gray-600" colSpan="3">(Continuação)</td>
                                        <td className="border border-black p-1 foto-cell">
                                            {item.fotos && item.fotos.length > 0 && (
                                                <div className="flex flex-col gap-1 foto-container">
                                                    {item.fotos.map((foto, fotoIdx) => (
                                                        <FotoInspecao key={fotoIdx} url={foto.url} alt={`Anomalia ${fotoIdx + 1}`} />
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                        <td className="border border-black p-1 plano-cell"><PlanoCell text={item.plano_melhoria} /></td>
                                        <td className="border border-black p-1" />
                                        <td className="border border-black p-1" />
                                    </tr>
                                );
                            }

                            if (item.isTextContinuation) {
                                return (
                                    <tr key={index} className="avoid-break">
                                        <td className="border border-black p-1 text-center">{item.itemNumber}</td>
                                        <td className="border border-black p-1 text-center italic text-gray-600" colSpan="3">(Continuação)</td>
                                        <td className="border border-black p-1 foto-cell"></td>
                                        <td className="border border-black p-1 plano-cell"><PlanoCell text={item.plano_melhoria} /></td>
                                        <td className="border border-black p-1" colSpan="2"></td>
                                    </tr>
                                );
                            }

                            return (
                                <tr key={index} className="avoid-break">
                                    <td className="border border-black p-1 text-center">{item.itemNumber}</td>
                                    <td className="border border-black p-1">{item.local}</td>
                                    <td className="border border-black p-1">{item.disciplina}</td>
                                    <td className="border border-black p-1">{item.anomalia}</td>
                                    <td className="border border-black p-1 foto-cell">
                                        {item.fotos && item.fotos.length > 0 && (
                                            <div className="flex flex-col gap-1 foto-container">
                                                {item.fotos.map((foto, fotoIdx) => (
                                                    <FotoInspecao key={fotoIdx} url={foto.url} alt={`Anomalia ${fotoIdx + 1}`} />
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="border border-black p-1 plano-cell"><PlanoCell text={item.plano_melhoria} /></td>
                                    <td className="border border-black p-1 text-center">
                                        <div className="font-medium">{item.cronograma_atividade === 'OK' ? 'Concluído' : item.cronograma_atividade}</div>
                                        {item.data_status && (
                                            <div className="text-xs mt-1 text-gray-600">
                                                {format(new Date(item.data_status.includes('T') ? item.data_status : item.data_status + 'T12:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                                            </div>
                                        )}
                                    </td>
                                    <td className="border border-black p-1" style={{ fontFamily: 'Arial, sans-serif', whiteSpace: 'pre-line', minWidth: '120px', lineHeight: '1.8' }}>{item.responsavel || ''}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </>
    );
};

const FotoInspecao = ({ url, alt = 'Foto da inspeção' }) => {
    const compressedUrl = useCompressedImage(url, 0.6);
    return (
        <div className="foto-wrapper">
            <img
                src={compressedUrl}
                alt={alt}
                className="foto-inspecao-print"
                style={{
                    width: '150px',
                    height: '120px',
                    objectFit: 'cover',
                    display: 'block',
                    margin: '0 auto',
                    WebkitPrintColorAdjust: 'exact',
                    printColorAdjust: 'exact',
                    colorAdjust: 'exact'
                }}
            />
        </div>
    );
};

const QRCodesPage = ({ relatorio }) => {
    const allPhotos = relatorio.secoes?.flatMap(s => s.itens?.flatMap(i => i.fotos || []) || []) || [];

    if (allPhotos.length === 0) {
        return (
            <div className="p-6 text-center flex flex-col items-center justify-center h-full">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">Galeria de Imagens</h2>
                <p className="text-gray-600">Nenhuma imagem encontrada neste relatório.</p>
            </div>
        );
    }

    const galleryUrl = `${window.location.origin}${createPageUrl(`GaleriaVistoriaTerminalidade?relatorioId=${relatorio.id}`)}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(galleryUrl)}`;

    return (
        <div className="p-8 flex flex-col items-center justify-center h-full">
            <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">
                Galeria de Imagens do Relatório
            </h2>
            <div className="text-center bg-white p-8 rounded-lg shadow-lg border-2 border-gray-200 max-w-md">
                <img
                    src={qrCodeUrl}
                    alt="QR Code - Galeria de Imagens"
                    className="w-72 h-72 mx-auto mb-6 rounded-lg border"
                />
                <h2 className="text-2xl font-bold mb-2">Acesse a Galeria Completa</h2>
                <p className="text-gray-600 mb-6 border-b pb-4">
                    {allPhotos.length} imagens do relatório
                </p>
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                    <p className="text-sm"><strong>Escaneie o QR Code</strong> para acessar a galeria completa com todas as imagens do relatório em alta resolução.</p>
                </div>
            </div>
        </div>
    );
};


// Conversão simples mm -> px para 96dpi (aprox. 1mm = 3.78px)
const mmToPx = (mm) => mm * 3.78;

// Helper: divide texto grande em chunks preservando palavras
const splitTextIntoChunks = (text, maxChars) => {
    if (!text) return [""];
    const words = String(text).split(/\s+/);
    const chunks = [];
    let current = "";
    words.forEach((w) => {
        if ((current + (current ? " " : "") + w).length > maxChars) {
            if (current) chunks.push(current);
            current = w;
        } else {
            current = current ? current + " " + w : w;
        }
    });
    if (current) chunks.push(current);
    return chunks.length ? chunks : [""];
};

// Calcula estilos para adaptar o texto ao tamanho do campo
const getPlanoFitStyles = (text, fotoCount = 0) => {
    const BASE_FONT = 11; // px
    const MIN_FONT = 7;   // px
    const LINE_HEIGHT_FACTOR = 1.3;
    const CHARS_PER_LINE = 40; // estimativa de largura da coluna

    const totalChars = String(text || '').length;
    const estimatedLines = Math.max(1, Math.ceil(totalChars / CHARS_PER_LINE));

    const imageUnitPx = 128; // 120 img + ~8 gaps
    const baseCellPx = 120;  // altura mínima
    const availablePx = Math.max(baseCellPx, (fotoCount || 0) * imageUnitPx);

    const requiredPx = estimatedLines * (BASE_FONT * LINE_HEIGHT_FACTOR);
    const scale = requiredPx > 0 ? Math.min(1, availablePx / requiredPx) : 1;
    const fontSize = Math.max(MIN_FONT, Math.floor(BASE_FONT * scale));
    const lineHeight = Math.ceil(fontSize * LINE_HEIGHT_FACTOR);

    return {
        height: `${availablePx}px`,
        fontSize: `${fontSize}px`,
        lineHeight: `${lineHeight}px`,
        overflow: 'visible'
    };
};

// Componente que ajusta dinamicamente o texto para caber dentro da célula
const PlanoCell = ({ text }) => {
    const contentRef = React.useRef(null);
    const BASE_FONT = 11; // px
    const MIN_FONT = 7;   // px
    const LINE_HEIGHT_FACTOR = 1.3;

    const fit = React.useCallback(() => {
        const el = contentRef.current;
        if (!el) return;
        const td = el.parentElement; // TD container
        if (!td) return;

        // Primeiro tenta com a fonte base e permite que a linha cresça naturalmente
        el.style.fontSize = `${BASE_FONT}px`;
        el.style.lineHeight = `${Math.ceil(BASE_FONT * LINE_HEIGHT_FACTOR)}px`;
        const baseScroll = el.scrollHeight;
        const tdStyles = window.getComputedStyle(td);
        const padV = (parseFloat(tdStyles.paddingTop) || 0) + (parseFloat(tdStyles.paddingBottom) || 0);
        const baseTd = Math.max(0, (td.clientHeight || 0) - padV);

        // Se o TD acompanha o conteúdo (sem restrição de altura), não reduzimos
        if (baseTd === 0 || baseScroll <= baseTd + 1) {
            return;
        }

        const maxH = baseTd;

        let low = MIN_FONT;
        let high = BASE_FONT;
        let best = MIN_FONT;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            el.style.fontSize = `${mid}px`;
            el.style.lineHeight = `${Math.ceil(mid * LINE_HEIGHT_FACTOR)}px`;
            const scrollH = el.scrollHeight;
            if (scrollH <= maxH) {
                best = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        el.style.fontSize = `${best}px`;
        el.style.lineHeight = `${Math.ceil(best * LINE_HEIGHT_FACTOR)}px`;

        // margem de segurança: reduz 1px por vez se ainda estourar
        let current = best;
        while (el.scrollHeight > maxH && current > MIN_FONT) {
            current -= 1;
            el.style.fontSize = `${current}px`;
            el.style.lineHeight = `${Math.ceil(current * LINE_HEIGHT_FACTOR)}px`;
        }
    }, []);

    React.useEffect(() => {
        fit();
        const el = contentRef.current;
        if (!el) return;
        const td = el.parentElement;
        if (!td) return;
        const ro = new ResizeObserver(() => fit());
        ro.observe(td);
        return () => ro.disconnect();
    }, [text, fit]);

    return <div ref={contentRef} className="plano-content">{text}</div>;
};

// Paginação por contagem: limita fotos por página e divide itens e textos em continuações
const paginateContent = (relatorio) => {
    const pages = [];
    const allItems = relatorio.secoes
        .flatMap(s => (s.itens || []).map(item => ({
            ...item,
            secaoNome: s.nome_secao,
            data_status: item.data_status
        })))
        .map((item, index) => ({ ...item, itemNumber: index + 1 }));

    const MAX_PHOTOS_PER_PAGE = 6;      // número máximo de fotos por página
    const MAX_ROWS_PER_PAGE = 12;       // limite de linhas por página (segurança)

    // Estimativas conservadoras para capacidade de texto por altura
    const IMAGE_UNIT_PX = 140; // 120px de imagem + margem (mais conservador)
    const BASE_CELL_PX = 120;  // altura base sem fotos
    const MIN_FONT = 7;
    const LINE_HEIGHT = Math.ceil(MIN_FONT * 1.3);
    const CHARS_PER_LINE_AT_MIN = 32; // ainda mais conservador

    const charsCapacityForHeight = (px) => {
        const lines = Math.max(1, Math.floor(px / LINE_HEIGHT) - 2); // 2 linhas de folga
        return lines * CHARS_PER_LINE_AT_MIN;
    };
    const takeFirst = (str, n) => {
        const s = String(str || "");
        if (s.length <= n) return [s, ""];
        const spaceIdx = s.lastIndexOf(' ', n);
        if (spaceIdx > n * 0.6) return [s.slice(0, spaceIdx), s.slice(spaceIdx + 1)];
        return [s.slice(0, n), s.slice(n)];
    };

    let currentPage = [];
    let photosInPage = 0;
    let rowsInPage = 0;

    const pushPage = () => {
        if (currentPage.length > 0) {
            pages.push(currentPage);
            currentPage = [];
            photosInPage = 0;
            rowsInPage = 0;
        }
    };

    allItems.forEach((item) => {
        const fotos = Array.isArray(item.fotos) ? item.fotos : [];
        const fotoTotal = fotos.length;
        let remainingText = String(item.plano_melhoria || "");

        // Caso sem fotos: apenas controla número de linhas
        if (fotoTotal === 0) {
            if (rowsInPage + 1 > MAX_ROWS_PER_PAGE) pushPage();
            const cap = charsCapacityForHeight(BASE_CELL_PX);
            let [cut, rest] = takeFirst(remainingText, cap);
            currentPage.push({ ...item, plano_melhoria: cut });
            rowsInPage += 1;
            remainingText = rest;
            while (remainingText && remainingText.length > 0) {
                if (rowsInPage + 1 > MAX_ROWS_PER_PAGE) pushPage();
                [cut, remainingText] = takeFirst(remainingText, cap);
                currentPage.push({ ...item, plano_melhoria: cut, isTextContinuation: true });
                rowsInPage += 1;
            }
            return;
        }

        // Se cabe inteiro na página atual
        if (photosInPage + fotoTotal <= MAX_PHOTOS_PER_PAGE && rowsInPage + 1 <= MAX_ROWS_PER_PAGE) {
            const cap = charsCapacityForHeight(Math.max(BASE_CELL_PX, fotoTotal * IMAGE_UNIT_PX));
            let [cut, rest] = takeFirst(remainingText, cap);
            currentPage.push({ ...item, plano_melhoria: cut });
            photosInPage += fotoTotal;
            rowsInPage += 1;
            remainingText = rest;
            while (remainingText && remainingText.length > 0) {
                if (rowsInPage + 1 > MAX_ROWS_PER_PAGE) pushPage();
                const capText = charsCapacityForHeight(BASE_CELL_PX);
                [cut, remainingText] = takeFirst(remainingText, capText);
                currentPage.push({ ...item, plano_melhoria: cut, isTextContinuation: true });
                rowsInPage += 1;
            }
            return;
        }

        // Caso contrário, dividir em chunks de fotos por página
        let index = 0;
        while (index < fotoTotal) {
            const remainingSlots = MAX_PHOTOS_PER_PAGE - photosInPage;
            // Se não há espaço na página atual, quebrar página
            if (remainingSlots <= 0 || rowsInPage + 1 > MAX_ROWS_PER_PAGE) {
                pushPage();
            }
            const sliceCount = Math.min(Math.max(remainingSlots, 1), fotoTotal - index);
            const chunkFotos = fotos.slice(index, index + sliceCount);
            const isFirst = index === 0;
            const cap = charsCapacityForHeight(Math.max(BASE_CELL_PX, chunkFotos.length * IMAGE_UNIT_PX));
            let [cut, rest] = takeFirst(remainingText, cap);
            currentPage.push(isFirst ? { ...item, fotos: chunkFotos, plano_melhoria: cut } : { ...item, fotos: chunkFotos, plano_melhoria: cut, isContinuation: true });
            photosInPage += chunkFotos.length;
            rowsInPage += 1;
            index += sliceCount;
            remainingText = rest;
        }

        while (remainingText && remainingText.length > 0) {
            if (rowsInPage + 1 > MAX_ROWS_PER_PAGE) pushPage();
            const cap = charsCapacityForHeight(BASE_CELL_PX);
            const [cut, rest] = takeFirst(remainingText, cap);
            currentPage.push({ ...item, plano_melhoria: cut, isTextContinuation: true });
            rowsInPage += 1;
            remainingText = rest;
        }
    });

    pushPage();
    // Fallback: se por algum motivo não houve páginas, dividir por linhas
    if (pages.length === 0 && allItems.length > 0) {
        for (let i = 0; i < allItems.length; i += MAX_ROWS_PER_PAGE) {
            pages.push(allItems.slice(i, i + MAX_ROWS_PER_PAGE));
        }
    }
    try { console.debug('[paginateContent] items:', allItems.length, 'pages:', pages.length); } catch { }
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
                        <h2 className="text-[10px] font-bold text-gray-800 uppercase leading-tight truncate">{relatorio?.titulo_relatorio || 'VISTORIA DE TERMINALIDADE'}</h2>
                        <p className="text-[9px] text-gray-600 leading-tight truncate">{empreendimento?.nome_empreendimento} - {relatorio?.cliente}</p>
                        <p className="text-[9px] font-medium text-gray-800 leading-tight">{relatorio?.data_vistoria ? format(new Date(relatorio.data_vistoria), 'dd/MM/yyyy', { locale: ptBR }) : ''}</p>
                    </div>
                </div>
            )}
            <div className="overflow-hidden" style={{ paddingTop: HEADER_HEIGHT, paddingBottom: FOOTER_HEIGHT }}>
                {children}
            </div>
            <div className="border-t border-gray-200 bg-gray-50 flex justify-between items-center text-[9px] text-gray-500" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: FOOTER_HEIGHT, padding: '4px 8px', maxWidth: '210mm', boxSizing: 'border-box' }}>
                <div className="flex-1 text-left leading-tight truncate" style={{ paddingRight: '8px' }}><span className="font-medium">Arquivo: </span><span>{`VT-${relatorio.id?.slice(-4)}.pdf`}</span></div>
                <div className="flex-1 flex flex-col items-center leading-tight text-[8px]"><span>INTERATIVA ENGENHARIA</span><span>www.interativaengenharia.com.br</span></div>
                <div className="flex-1 text-right leading-tight" style={{ paddingLeft: '8px' }}><span>Página {pageNumber} de {totalPages}</span></div>
            </div>
        </div>
    );
};

const ReportContent = ({ relatorio, empreendimento, navigate }) => {
    const [isPrintingMode, setIsPrintingMode] = useState(false);

    // Compute statistics for the summary table (discipline-based bar chart data)
    const summaryStats = useMemo(() => {
        if (!relatorio?.secoes) return [];

        const disciplineMap = new Map();

        relatorio.secoes.forEach(secao => {
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

        // Convert map to array and sort alphabetically
        return Array.from(disciplineMap.values()).sort((a, b) =>
            a.name.localeCompare(b.name)
        );
    }, [relatorio]);

    // Compute pie chart data (general status)
    const pieChartData = useMemo(() => {
        const allItems = relatorio.secoes.flatMap(s => s.itens || []);
        const statusData = { OK: 0, Pendente: 0, Parcial: 0 };
        allItems.forEach(item => {
            const status = item.cronograma_atividade;
            if (statusData[status] !== undefined) {
                statusData[status]++;
            }
        });
        return [
            { name: 'Concluído', value: statusData.OK },
            { name: 'Pendente', value: statusData.Pendente },
            { name: 'Parcial', value: statusData.Parcial },
        ].filter(d => d.value > 0);
    }, [relatorio]);

    // Compute data by responsável
    const responsavelData = useMemo(() => {
        const allItems = relatorio.secoes.flatMap(s => s.itens || []);
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
    }, [relatorio]);

    // Combine chart data for ChartsPage
    const chartData = useMemo(() => ({
        barChartData: summaryStats,
        pieChartData: pieChartData,
        responsavelData: responsavelData
    }), [summaryStats, pieChartData, responsavelData]);

    const contentPages = useMemo(() => paginateContent(relatorio), [relatorio]);

    const hasPhotos = useMemo(() => {
        return relatorio.secoes?.some(s => s.itens?.some(i => i.fotos?.length > 0));
    }, [relatorio]);

    const hasAssinaturas = useMemo(() => {
        return relatorio.assinaturas && relatorio.assinaturas.length > 0 &&
            relatorio.assinaturas.some(ass => (ass.nome && ass.nome.trim() !== '') || (ass.parte && ass.parte.trim() !== '') || (ass.assinatura_imagem && ass.assinatura_imagem.trim() !== ''));
    }, [relatorio]);

    // Cover (1) + Charts (1) + ContentPages.length + QR (1, if photos exist) + Signatures (1, if signatures exist)
    const totalPages = 1 + 1 + contentPages.length + (hasPhotos ? 1 : 0) + (hasAssinaturas ? 1 : 0);

    const handlePrint = async () => {
        setIsPrintingMode(true);
        await new Promise(resolve => setTimeout(resolve, 500));
        window.print();
        setTimeout(() => setIsPrintingMode(false), 1000);
    };

    let currentPage = 1;

    return (
        <div className="bg-gray-200 print:bg-white min-h-screen font-sans">
            <div className="no-print shadow-sm border-b p-4 mb-4 bg-white">
                <div className="flex justify-between items-center max-w-4xl mx-auto">
                    <Button onClick={() => navigate(-1)} variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
                    <h1 className="text-xl font-semibold text-gray-800">Visualizar Vistoria de Terminalidade</h1>
                    <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700 text-white"><Printer className="w-4 h-4 mr-2" />Gerar PDF</Button>
                </div>
            </div>
            <div className="report-container max-w-4xl mx-auto" style={{ padding: 0 }}>
                {/* Page 1: Cover */}
                <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento} pdfMode={isPrintingMode}>
                    <CoverPage relatorio={relatorio} empreendimento={empreendimento} pdfMode={isPrintingMode} />
                </ReportPageLayout>

                {/* Page 2: Only Charts */}
                <ReportPageLayout
                    pageNumber={currentPage++}
                    totalPages={totalPages}
                    relatorio={relatorio}
                    empreendimento={empreendimento}
                    pdfMode={isPrintingMode}
                >
                    <ChartsPage chartData={chartData} relatorio={relatorio} />
                </ReportPageLayout>

                {/* Pages 3+: Detailed Sections */}
                {contentPages.map((pageItems, index) => (
                    <ReportPageLayout key={`content-page-${index}`} pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento} pdfMode={isPrintingMode}>
                        <ContentPage relatorio={relatorio} empreendimento={empreendimento} items={pageItems} />
                    </ReportPageLayout>
                ))}

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

                {/* QR Code Page if photos exist - LAST PAGE */}
                {hasPhotos && (
                    <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento} pdfMode={isPrintingMode}>
                        <QRCodesPage relatorio={relatorio} />
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

                .foto-inspecao-print {
                    max-width: 150px !important;
                    max-height: 120px !important;
                    width: 150px !important;
                    height: 120px !important;
                    object-fit: cover !important;
                }
                .plano-cell {
                    white-space: pre-wrap;
                    word-break: break-word;
                    overflow-wrap: anywhere;
                    hyphens: auto;
                    vertical-align: middle;
                    text-align: center;
                }
                .plano-content {
                    max-height: 120px;
                    overflow: hidden;
                    text-align: center;
                    display: inline-block;
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

                    /* Wrapper de cada foto individual */
                    .foto-wrapper {
                        margin-bottom: 8px !important;
                        page-break-inside: avoid !important;
                        display: block !important;
                    }

                    /* Força as imagens a ficarem dentro da coluna */
                    .foto-inspecao-print {
                        max-width: 150px !important;
                        max-height: 120px !important;
                        width: 150px !important;
                        height: 120px !important;
                        min-height: 120px !important;
                        display: block !important;
                        margin: 0 auto !important;
                        object-fit: cover !important;
                        page-break-inside: avoid !important;
                    }

                    /* Container das fotos em coluna vertical */
                    .foto-container {
                        display: block !important;
                        width: 100% !important;
                        padding: 8px 0 !important;
                    }

                    /* Garante que a célula de imagem tenha largura fixa */
                    .foto-cell {
                        width: 160px !important;
                        min-width: 160px !important;
                        max-width: 160px !important;
                        overflow: hidden !important;
                        text-align: center !important;
                        padding: 4px !important;
                        vertical-align: top !important;
                        box-sizing: border-box !important;
                        height: auto !important;
                    }
                    .plano-cell {
                        white-space: pre-wrap !important;
                        word-break: break-word !important;
                        overflow-wrap: anywhere !important;
                        hyphens: auto !important;
                        vertical-align: middle !important;
                        text-align: center !important;
                    }
                    .plano-content {
                        max-height: 120px !important;
                        overflow: hidden !important;
                        text-align: center !important;
                        display: inline-block !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default function VisualizarVistoriaTerminalidade() {
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
                const relatorioData = await VistoriaTerminalidade.get(relatorioId);
                if (!relatorioData) throw new Error("Relatório não encontrado.");

                console.log('[FETCH] Dados do relatório carregados:', JSON.stringify(relatorioData.secoes?.[0]?.itens?.[0], null, 2));

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