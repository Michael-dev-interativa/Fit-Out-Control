
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { RelatorioSemanal } from '@/api/entities';
import { Empreendimento } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Printer, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// UTILS E HOOKS REUTILIZADOS
const isValidId = (id) => id && typeof id === 'string' && id.length > 0;

const useCompressedImage = (url, maxWidth = 800, quality = 0.3) => {
  const [compressedUrl, setCompressedUrl] = useState(url);
  useEffect(() => {
    if (url && typeof url === 'string' && url.startsWith('http') && !url.startsWith('data:image')) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        let width = img.width, height = img.height;
        if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
        canvas.width = width; canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        setCompressedUrl(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => setCompressedUrl(url);
      img.src = url;
    } else {
      setCompressedUrl(url);
    }
  }, [url, maxWidth, quality]);
  return compressedUrl;
};

// COMPONENTES DE PÁGINA E CAPA (ADAPTADOS)
const ReportPage = ({ children, pageNumber, totalPages, relatorio, empreendimento, pdfMode }) => {
  const logoHorizontalOriginalUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/4bd521d1e_LOGOHORIZONTAl.png";
  const logoHorizontalCompressed = useCompressedImage(logoHorizontalOriginalUrl, 400, 0.7);
  const HEADER_HEIGHT = '80px';
  const FOOTER_HEIGHT = '45px';

  return (
    <div className={`report-page w-full relative bg-white ${pdfMode ? 'pdf-mode' : ''}`}>
      <div className="flex justify-between items-center p-4 border-b border-gray-200" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_HEIGHT, zIndex: 10 }}>
        <img src={logoHorizontalCompressed} alt="Logo Interativa Engenharia" className="h-12" />
        <div className="text-right">
          <h2 className="text-sm font-bold text-gray-800 uppercase">RELATÓRIO DE EVOLUÇÃO SEMANAL DE OBRA</h2>
          <p className="text-xs text-gray-600">{empreendimento?.nome_empreendimento}</p>
          <p className="text-xs font-medium text-gray-800 mt-1">Período: {formatDate(relatorio?.data_inicio_semana)} a {formatDate(relatorio?.data_fim_semana)}</p>
        </div>
      </div>
      {/* Main content area: positioned absolutely to fill the space between header and footer */}
      <div
        className="absolute w-full"
        style={{
          top: HEADER_HEIGHT,
          bottom: FOOTER_HEIGHT,
          left: 0,
          right: 0,
          overflowY: pdfMode ? 'visible' : 'auto', // 'visible' for print allows content to break across pages, 'auto' for screen allows scrolling.
        }}
      >
        {children}
      </div>
      <div className="px-3 py-1 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-xs text-gray-500" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: FOOTER_HEIGHT, zIndex: 10 }}>
        <div className="flex-1 text-left"><span className="font-medium">Arquivo:</span><br /><span>{relatorio?.nome_arquivo || `RS-${relatorio.numero_relatorio || '00'}.pdf`}</span></div>
        <div className="flex-1 flex flex-col items-center"><span>INTERATIVA ENGENHARIA</span><span>www.interativaengenharia.com.br</span></div>
        <div className="flex-1 text-right"><span>Página {pageNumber} de {totalPages}</span></div>
      </div>
    </div>
  );
};

const CoverPage = ({ relatorio, empreendimento }) => {
    const redColor = '#CE2D2D';
    const year = new Date(relatorio?.data_fim_semana || Date.now()).getFullYear();
    const coverFrameOriginalUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/dca667b3d_erasebg-transformed.png";
    const redDecorativeElementUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/513d57969_Designsemnome2.png';
    const bottomRightFrameUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/10e9b2570_erasebg-transformed.png';
    const empreendimentoImageUrl = empreendimento?.foto_empreendimento || 'https://images.unsplash.com/photo-1519947486511-46149fa0a254?w=800&q=80';
    const logoInterativaUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/1a0999f3c_logo_Interativa_letra_branca_sem_fundo_gg.png";
    const logoInterativaBrancoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/22086ec44_LOGOPNG-branco.png";
    
    const responsaveis = empreendimento?.texto_capa_rodape || empreendimento?.nome_empreendimento || '';
    
    const getTextStyle = (text) => {
        const len = text ? text.length : 0;
        if (len <= 25) return { fontSize: '32px', letterSpacing: '1px', fontWeight: 'normal' };
        if (len <= 40) return { fontSize: '26px', letterSpacing: '0.8px', fontWeight: 'normal' };
        return { fontSize: '20px', letterSpacing: '0.5px', fontWeight: 'normal' };
    };
    const textStyle = getTextStyle(responsaveis);

    return (
        <div className="relative w-full h-full bg-white font-sans overflow-hidden" style={{ margin: 0, padding: 5 }}>
            <div className="absolute w-full h-full bg-center bg-no-repeat z-10 cover-background-image" style={{ backgroundImage: `url(${empreendimentoImageUrl})`, backgroundSize: 'cover', opacity: 0.2, top: '-10px', left: '-10px', width: 'calc(100% + 20px)', height: 'calc(100% + 20px)' }}/>
            <div className="absolute top-0 left-0 w-full h-full bg-contain bg-left-top bg-no-repeat z-20" style={{ backgroundImage: `url(${coverFrameOriginalUrl})`, height: '150%' }} />
            <div className="absolute z-50" style={{ top: '25px', left: '11px', width: '350px', height: '170px' }}>
                <img src={logoInterativaUrl} alt="Logo Interativa" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))' }} />
            </div>
            <div className="absolute flex items-center justify-center z-40" style={{ top: '23%', left: '11%', width: '22.7%', height: '25%', transform: 'rotate(27deg)' }}>
                <span className="font-normal" style={{ fontSize: '60px', fontFamily: "'Inter', sans-serif", textShadow: '2px 2px 4px rgba(0,0,0,0.2)', color: 'white' }}>{year}</span>
            </div>
            <div className="absolute z-30" style={{ top: '10%', right: '8%', width: '50%', textAlign: 'right' }}>
                <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: '64px', fontWeight: 'bold', color: '#394557', lineHeight: '1.1', marginBottom: '4px' }}>RELATÓRIO</h1>
                <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: '29.5px', color: redColor, letterSpacing: '4px' }}>SEMANAL</h2>
            </div>
            <div className="absolute z-30" style={{ top: '50%', right: '-3%', width: '45%', padding: '1.3% 2.5%', textAlign: 'center' }}>
                <h1 className="font-black uppercase" style={{ fontSize: '28px', lineHeight: '1.0', fontFamily: "'Inter', sans-serif", marginBottom: '6px', color: 'black' }}>Gerenciamento</h1>
            </div>
            <div className="absolute z-20" style={{ top: '-350px', right: '-30%', width: '1700px', height: '1150px', backgroundColor: redColor, WebkitMaskImage: `url(${redDecorativeElementUrl})`, maskImage: `url(${redDecorativeElementUrl})`, WebkitMaskSize: '100% 100%', maskSize: '100% 100%', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat', WebkitMaskPosition: 'center', maskPosition: 'center' }}/>
            <div className="absolute z-50" style={{ top: '-10%', right: '-20%', width: '1800px', height: '800px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={logoInterativaBrancoUrl} alt="Logo Interativa" style={{ width: '100%', height: '100%', objectFit: 'contain' }}/>
            </div>
            <div className="absolute right-0 w-full h-full bg-no-repeat z-40" style={{ bottom: '-5%', backgroundImage: `url('${bottomRightFrameUrl}')`, height: '1000%', backgroundSize: '230% auto', backgroundPosition: '65% 100%' }}/>
            <div className="absolute z-10" style={{ bottom: '0%', left: '0%', width: '450px', height: '800px', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', clipPath: 'polygon(0 0%, 100% 23%, 100% 100%, 0% 100%)' }}>
                <img src={empreendimentoImageUrl} alt={empreendimento?.nome_empreendimento || 'Foto do empreendimento'} style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
            </div>
            <div className="absolute flex items-center justify-center z-50" style={{ bottom: '0', left: '0', right: '0', height: '65px', backgroundColor: redColor, clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 5% 100%)', paddingLeft: '15%', paddingRight: '5%' }}>
                <span className="text-white w-full" style={{ ...textStyle, fontFamily: 'Poppins', textAlign: 'center', lineHeight: '1.2' }}>{responsaveis}</span>
            </div>
        </div>
    );
};

const formatDate = (dateString) => {
    if (!dateString) return '-';
    return format(new Date(`${dateString}T00:00:00`), 'dd/MM/yyyy', { locale: ptBR });
};

const ActivityTable = ({ title, activities }) => {
    if (!activities || activities.length === 0) {
        return (
            <div className="break-inside-avoid">
                <h4 className="font-bold mb-2 mt-4">{title}</h4>
                <p className="text-center p-2 border">Nenhuma atividade registrada.</p>
            </div>
        );
    }

    return (
        <div className="break-inside-avoid">
            <h4 className="font-bold mb-2 mt-4">{title}</h4>
            <table className="w-full border-collapse text-xs">
                <thead className="bg-gray-100">
                    <tr className="border">
                        <th className="border p-1 font-bold text-left w-2/12">Descrição</th>
                        <th className="border p-1 font-bold">Início Previsto</th>
                        <th className="border p-1 font-bold">Início Real</th>
                        <th className="border p-1 font-bold">Término Previsto</th>
                        <th className="border p-1 font-bold">Término Real</th>
                        <th className="border p-1 font-bold w-1/12">Status</th>
                        <th className="border p-1 font-bold text-left w-3/12">Observação</th>
                    </tr>
                </thead>
                <tbody>
                    {activities.map((item, index) => (
                        <tr key={index} className="border break-inside-avoid">
                            <td className="border p-1 text-left">{item.descricao}</td>
                            <td className="border p-1 text-center">{formatDate(item.data_inicio_previsto)}</td>
                            <td className="border p-1 text-center">{formatDate(item.data_inicio_real)}</td>
                            <td className="border p-1 text-center">{formatDate(item.data_termino_previsto)}</td>
                            <td className="border p-1 text-center">{formatDate(item.data_termino_real)}</td>
                            <td className="border p-1 text-center">{item.status}</td>
                            <td className="border p-1 text-left">{item.observacao}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const PhotoPage = ({ photos }) => (
    <div className="p-8 text-sm bg-white h-full"><h3 className="bg-gray-300 font-bold p-1 text-center">REGISTRO FOTOGRÁFICO</h3><div className="grid grid-cols-2 gap-4 mt-2">{(photos || []).map((foto, index) => (<div key={index} className="border p-1 break-inside-avoid"><img src={foto.url} alt={foto.legenda || `Foto ${index + 1}`} className="w-full h-auto object-cover" /><p className="text-center mt-1 text-xs">{foto.legenda}</p></div>))}</div></div>
);

const StatsChart = ({ data }) => {
    const chartData = useMemo(() => {
        if (!data || data.length === 0) return [];
        
        const sortedData = [...data].sort((a, b) => new Date(a.semana) - new Date(b.semana));

        // Mapeia os dados para as barras
        return sortedData.map(item => ({
            name: formatDate(item.semana),
            'Planejado': item.planejado,
            'Realizado': item.realizado,
        }));
    }, [data]);

    const yAxisTicks = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

    if (chartData.length === 0) {
        return (
            <div className="break-inside-avoid">
                <h3 className="bg-gray-300 font-bold p-1 text-center mt-4">ESTATÍSTICAS DE AVANÇO</h3>
                <p className="text-center p-2 border">Dados insuficientes para gerar o gráfico.</p>
            </div>
        );
    }
    
    return (
        <div className="break-inside-avoid mt-4 w-full">
             <h3 className="bg-gray-300 font-bold p-1 text-center">ESTATÍSTICAS DE AVANÇO</h3>
             <div style={{ width: '100%', height: 600 }} className="p-4 border"> 
                <ResponsiveContainer>
                    <ComposedChart
                        data={chartData}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis yAxisId="left" unit="%" domain={[0, 100]} ticks={yAxisTicks} />
                        <Tooltip formatter={(value) => `${value.toFixed(2)}%`} />
                        <Legend />
                        <Bar yAxisId="left" dataKey="Planejado" barSize={20} fill="#a0aec0" isAnimationActive={false} />
                        <Bar yAxisId="left" dataKey="Realizado" barSize={20} fill="#f6e05e" isAnimationActive={false} />
                        <Line yAxisId="left" type="monotone" dataKey="Planejado" stroke="#4299e1" strokeWidth={2} dot={false} isAnimationActive={false} />
                        <Line yAxisId="left" type="monotone" dataKey="Realizado" stroke="#f56565" strokeWidth={2} dot={false} isAnimationActive={false} />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};


// LÓGICA DE PAGINAÇÃO
const paginateContent = (relatorio, empreendimento) => {
    const pages = [];
    pages.push({ type: 'cover', content: <CoverPage relatorio={relatorio} empreendimento={empreendimento} /> });

    const atividadesSemana = relatorio.principais_atividades_semana || [];
    const atividadesPagina1 = atividadesSemana.slice(0, 8);
    const atividadesRestantes = atividadesSemana.slice(8);

    // Page 1: Infos gerais, tabelas de avanço e os 8 primeiros itens de atividade.
    const initialContent = (
        <div className="p-8 text-sm bg-white h-full space-y-4 print:overflow-visible">
            <section className="text-sm">
                <table className="w-full border-collapse">
                    <tbody>
                        <tr className="border"><td className="font-bold border p-1 w-1/4">Empresa Contratada:</td><td className="border p-1 w-3/4" colSpan="3">INTERATIVA ENGENHARIA</td></tr>
                        <tr className="border"><td className="font-bold border p-1">Escopo:</td><td className="border p-1" colSpan="3">{empreendimento.nome_empreendimento} | {empreendimento.cli_empreendimento}</td></tr>
                        <tr className="border"><td className="font-bold border p-1">Valor Contratual:</td><td className="border p-1" colSpan="3">{empreendimento.valor_contratual || '-'}</td></tr>
                    </tbody>
                </table>
                <table className="w-full border-collapse mt-2 text-center">
                    <thead><tr className="border bg-gray-200 font-bold"><td className="border p-1">Início Obra</td><td className="border p-1">Término Obra Previsto</td><td className="border p-1">Data Sem Entrega</td><td className="border p-1">Término Contratual</td><td className="border p-1">Físico Previsto (%)</td><td className="border p-1">Físico Real (%)</td><td className="border p-1">Efetivo</td></tr></thead>
                    <tbody><tr className="border"><td className="border p-1">{formatDate(empreendimento.data_inicio_contrato)}</td><td className="border p-1">{formatDate(empreendimento.termino_obra_previsto)}</td><td className="border p-1">{formatDate(empreendimento.data_sem_entrega)}</td><td className="border p-1">{formatDate(empreendimento.data_termino_contrato)}</td><td className="border p-1">{relatorio.fisico_previsto_total || 'N/D'}%</td><td className="border p-1">{relatorio.fisico_real_total || 'N/D'}%</td><td className="border p-1">{relatorio.efetivo || '-'}</td></tr></tbody>
                </table>
            </section>
            <section className="text-sm break-inside-avoid mt-4"><h3 className="bg-gray-300 font-bold p-1 text-center">Avanço Físico | Acumulado</h3><table className="w-full border-collapse text-center"><thead><tr className="border"><th className="border p-1 font-normal w-1/5">Semana</th>{(relatorio.avanco_fisico_acumulado || []).map((item, index) => (<th key={index} className="border p-1 font-normal">{formatDate(item.semana)}</th>))}</tr></thead><tbody><tr className="border"><td className="border p-1 font-bold">Planejado</td>{(relatorio.avanco_fisico_acumulado || []).map((item, index) => (<td key={index} className="border p-1">{item.planejado || 0}%</td>))}</tr><tr className="border"><td className="border p-1 font-bold">Realizado</td>{(relatorio.avanco_fisico_acumulado || []).map((item, index) => (<td key={index} className="border p-1">{item.realizado || 0}%</td>))}</tr></tbody></table></section>
            <section className="text-sm break-inside-avoid mt-4"><h3 className="bg-gray-300 font-bold p-1 text-center">Avanço Financeiro - Desembolso | Acumulado</h3><table className="w-full border-collapse text-center"><thead><tr className="border"><th className="border p-1 font-normal w-1/5">Mês</th>{(relatorio.avanco_financeiro_acumulado || []).map((item, index) => (<th key={index} className="border p-1 font-normal">{item.mes}</th>))}</tr></thead><tbody><tr className="border"><td className="border p-1 font-bold">Planejado</td>{(relatorio.avanco_financeiro_acumulado || []).map((item, index) => (<td key={index} className="border p-1">{item.planejado || 0}%</td>))}</tr><tr className="border"><td className="border p-1 font-bold">Realizado</td>{(relatorio.avanco_financeiro_acumulado || []).map((item, index) => (<td key={index} className="border p-1">{item.realizado || 0}%</td>))}</tr></tbody></table></section>
            <section className="text-sm break-inside-avoid">
                 <h3 className="bg-gray-300 font-bold p-1 text-center mt-4">ATIVIDADES</h3>
                 <ActivityTable 
                    title="Principais atividades da semana"
                    activities={atividadesPagina1}
                />
            </section>
        </div>
    );
    pages.push({ type: 'content', content: initialContent });

    // Conteúdo restante para as próximas páginas
    const remainingContent = (
         <div className="p-8 text-sm bg-white h-full space-y-4 print:overflow-visible">
            <section className="text-sm break-inside-avoid">
                 <h3 className="bg-gray-300 font-bold p-1 text-center">ATIVIDADES (continuação)</h3>
                 {atividadesRestantes.length > 0 && (
                     <ActivityTable 
                        title="Principais atividades da semana"
                        activities={atividadesRestantes}
                    />
                 )}
                 <ActivityTable 
                    title="Principais atividades da próxima semana"
                    activities={relatorio.atividades_proxima_semana_tabela}
                />
            </section>
            <section className="text-sm break-inside-avoid"><h3 className="bg-gray-300 font-bold p-1 text-center">Caminho Crítico</h3>{(relatorio.caminho_critico && relatorio.caminho_critico.length > 0) ? (<table className="w-full border-collapse text-center"><thead><tr className="border"><th className="border p-1 font-bold">Item</th><th className="border p-1 font-bold">Info 1</th><th className="border p-1 font-bold">Info 2</th><th className="border p-1 font-bold">Info 3</th></tr></thead><tbody>{relatorio.caminho_critico.map((item, index) => (<tr key={index} className="border break-inside-avoid"><td className="border p-1 text-left">{item.item}</td><td className="border p-1">{item.info1}</td><td className="border p-1">{item.info2}</td><td className="border p-1">{item.info3}</td></tr>))}</tbody></table>) : (<p className="text-center p-2 border">N/A</p>)}<div className="whitespace-pre-wrap p-2 border mt-4 break-inside-avoid"><h3 className="font-bold mb-2">Impedimentos</h3><p>{relatorio.impedimentos || 'Nenhum impedimento relatado.'}</p></div></section>
        </div>
    );
    // Adiciona a página de conteúdo restante apenas se houver algo para mostrar
    if (atividadesRestantes.length > 0 || (relatorio.atividades_proxima_semana_tabela || []).length > 0 || (relatorio.caminho_critico || []).length > 0 || relatorio.impedimentos) {
        pages.push({ type: 'content', content: remainingContent });
    }
    
    // Adiciona a página do gráfico se houver dados para ele, garantindo que ocupe uma página completa
    if (relatorio.avanco_fisico_acumulado && relatorio.avanco_fisico_acumulado.length > 0) {
        pages.push({ type: 'content', content: <div className="p-8 text-sm bg-white h-full flex flex-col justify-center items-center"><StatsChart data={relatorio.avanco_fisico_acumulado} /></div> });
    }

    const photos = relatorio.fotos || [];
    const photosPerPage = 4;
    for (let i = 0; i < photos.length; i += photosPerPage) {
        const photoChunk = photos.slice(i, i + photosPerPage);
        pages.push({ type: 'content', content: <PhotoPage photos={photoChunk} /> });
    }
    
    return pages;
};

// COMPONENTE PRINCIPAL DE RENDERIZAÇÃO
const ReportContent = ({ relatorio, empreendimento, navigate }) => {
    const [isPrintingMode, setIsPrintingMode] = useState(false);
    const paginatedPages = useMemo(() => paginateContent(relatorio, empreendimento), [relatorio, empreendimento]);

    const handlePrint = async () => {
        const originalTitle = document.title;
        document.title = `Relatorio_Semanal_${empreendimento?.nome_empreendimento || ''}_${relatorio?.numero_relatorio || ''}`;
        setIsPrintingMode(true);
        await new Promise(resolve => setTimeout(resolve, 100)); // Give a tiny bit of time for styles to apply
        window.print();
        document.title = originalTitle;
        setTimeout(() => setIsPrintingMode(false), 2000); // Revert print mode after print dialog is likely closed
    };

    return (
        <div className="bg-gray-200 print:bg-white min-h-screen font-sans">
            <div className="no-print shadow-sm border-b p-4 mb-4 bg-white sticky top-0 z-50">
                <div className="flex justify-between items-center max-w-4xl mx-auto">
                    <Button onClick={() => navigate(-1)} variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
                    <h1 className="text-xl font-semibold text-gray-800">Relatório Semanal</h1>
                    <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700 text-white"><Printer className="w-4 h-4 mr-2" />Gerar PDF</Button>
                </div>
            </div>
            <div className="report-container max-w-4xl mx-auto" style={{ padding: 0 }}>
                {paginatedPages.map((page, index) => {
                    if (page.type === 'cover') {
                        // Cover page does not get the header/footer, so it's rendered directly
                        return <div key={`page-${index}`} className="report-page">{React.cloneElement(page.content, { pdfMode: isPrintingMode })}</div>;
                    }
                    // For content pages, calculate the page number relative to content (excluding cover)
                    // The first content page is index 1, so its page number is 1.
                    // The total number of content pages is total pages - 1 (for cover).
                    const contentPageNumber = index; // The cover page is index 0. The first content page is index 1, which should be page number 1.
                    const totalContentPages = paginatedPages.length -1; // total pages excluding cover
                    return (
                        <ReportPage key={`page-${index}`} pageNumber={contentPageNumber} totalPages={totalContentPages} relatorio={relatorio} empreendimento={empreendimento} pdfMode={isPrintingMode}>
                           {React.cloneElement(page.content, { pdfMode: isPrintingMode })}
                        </ReportPage>
                    );
                })}
            </div>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@700&family=Poppins:wght@100;200;300;400;500;600;700;800;900&display=swap');
                .cover-background-image { background-position: center 15% !important; }
                @media print {
                  .no-print { display: none !important; }
                  .report-page { page-break-after: always; width: 210mm; height: 297mm; margin: 0; padding: 0; page-break-inside: avoid; /* overflow: hidden; */ box-shadow: none; position: relative; }
                  .report-page:last-child { page-break-after: auto; }
                  html, body { margin: 0; padding: 0; background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; font-family: 'Poppins', 'Inter', sans-serif; }
                  .break-inside-avoid { page-break-inside: avoid; }
                  .break-before-page { page-break-before: always; }
                  @page { size: A4; margin: 0; }
                }
                @media screen {
                  .report-page { width: 210mm; height: 297mm; margin: 20px auto; padding: 0; box-shadow: 0 0 10px rgba(0,0,0,0.1); background: white; position: relative; /* overflow: hidden; */ }
                }
            `}</style>
        </div>
    );
};

export default function VisualizarRelatorioSemanal() {
    const navigate = useNavigate();
    const location = useLocation();
    const urlParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const relatorioId = urlParams.get('relatorioId');

    const [relatorio, setRelatorio] = useState(null);
    const [empreendimento, setEmpreendimento] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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

    useEffect(() => {
        const loadData = async () => {
            if (!isValidId(relatorioId)) {
                setError("ID do relatório é inválido.");
                setLoading(false);
                return;
            }
            try {
                const relatorioData = await RelatorioSemanal.get(relatorioId);
                if (!relatorioData) throw new Error("Relatório não encontrado.");
                setRelatorio(relatorioData);

                if (isValidId(relatorioData.id_empreendimento)) {
                    const empreendimentoData = await Empreendimento.get(relatorioData.id_empreendimento);
                    setEmpreendimento(empreendimentoData);
                } else {
                    throw new Error("ID do empreendimento associado é inválido.");
                }
            }
             catch (err) {
                console.error("Erro ao carregar dados:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [relatorioId]);

    if (loading) return <div className="flex flex-col items-center justify-center min-h-screen"><Loader2 className="h-12 w-12 animate-spin mb-4" /><p>Carregando relatório...</p></div>;
    if (error) return <div className="flex flex-col items-center justify-center min-h-screen"><AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" /><h2 className="text-xl font-bold text-red-600">Erro</h2><p className="text-gray-700">{error}</p><Button onClick={() => navigate(-1)} className="mt-4">Voltar</Button></div>;
    if (!relatorio || !empreendimento) return <div className="flex flex-col items-center justify-center min-h-screen"><AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" /><h2 className="text-xl font-bold">Dados Incompletos</h2><p>Não foi possível carregar todas as informações do relatório.</p><Button onClick={() => navigate(-1)} className="mt-4">Voltar</Button></div>;
    
    return <ReportContent relatorio={relatorio} empreendimento={empreendimento} navigate={navigate} />;
}
