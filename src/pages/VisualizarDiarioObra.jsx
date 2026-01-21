
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { DiarioDeObra } from '@/api/entities';
import { Empreendimento } from '@/api/entities';
import { UnidadeEmpreendimento } from '@/api/entities';
import { User } from '@/api/entities';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Printer, AlertTriangle } from 'lucide-react';

const redColor = '#CE2D2D';
const blueColor = '#2A3E84';

// Helper function for ID validation
const isValidId = (id) => {
    return id && typeof id === 'string' && id.length > 0;
};

// Placeholder for translations and language if they are not coming from context/i18n
const language = 'ptBR';
const translations = {
    ptBR: {}, // Add any necessary translations here if the 't' object is actually used
};

// ************** Funções e Componentes Reutilizados de VisualizarRelatorioVistoria **************

const compressImage = (url, maxWidth = 800, quality = 0.3) => {
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
      const compressedUrl = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedUrl);
    };
    img.onerror = () => {
      resolve(url);
    };
    img.src = url;
  });
};

const useCompressedImage = (url, maxWidth, quality) => {
  const [compressedUrl, setCompressedUrl] = useState(url);
  useEffect(() => {
    if (url && typeof url === 'string' && url.startsWith('http') && !url.startsWith('data:image')) {
      compressImage(url, maxWidth, quality).then(setCompressedUrl);
    } else {
      setCompressedUrl(url);
    }
  }, [url, maxWidth, quality]);
  return compressedUrl;
};

const ReportPage = ({ children, pageNumber, totalPages, diario, unidade, empreendimento, pdfMode, isFlowPage = false }) => {
  const logoHorizontalOriginalUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/4bd521d1e_LOGOHORIZONTAl.png";
  const logoHorizontalCompressed = useCompressedImage(logoHorizontalOriginalUrl, 400, 0.7);
  const HEADER_HEIGHT = '80px';
  const FOOTER_HEIGHT = '45px';

  return (
    <div className={`report-page w-full relative bg-white ${pdfMode ? 'pdf-mode' : ''} ${isFlowPage ? 'flow-page' : ''}`}>
      {pageNumber > 1 && (
        <div className="flex justify-between items-center p-4 border-b border-gray-200" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_HEIGHT }}>
          <img src={logoHorizontalCompressed} alt="Logo Interativa Engenharia" className="h-12" />
          <div className="text-right">
            <h2 className="text-sm font-bold text-gray-800 uppercase">DIÁRIO DE OBRA</h2>
            <p className="text-xs text-gray-600">{empreendimento?.nome_empreendimento} - {unidade?.unidade_empreendimento || diario?.unidade_texto}</p>
            <p className="text-xs font-medium text-gray-800 mt-1">{diario?.data_diario ? format(new Date(diario.data_diario), 'dd/MM/yyyy', { locale: ptBR }) : ''}</p>
          </div>
        </div>
      )}
      <div className={`${isFlowPage ? 'overflow-visible' : 'overflow-hidden'}`} style={{ paddingTop: pageNumber > 1 ? HEADER_HEIGHT : '0px', paddingBottom: FOOTER_HEIGHT }}>
        {children}
      </div>
      <div className="px-3 py-1 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-xs text-gray-500" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: FOOTER_HEIGHT }}>
        <div className="flex-1 text-left"><span className="font-medium">Arquivo:</span><br /><span>{diario?.nome_arquivo || `DO-${diario?.numero_diario || 'S-N'}.pdf`}</span></div>
        <div className="flex-1 flex flex-col items-center"><span>INTERATIVA ENGENHARIA</span><span>www.interativaengenharia.com.br</span></div>
        <div className="flex-1 text-right"><span>Página {pageNumber} de {totalPages}</span></div>
      </div>
    </div>
  );
};

const CoverPage = ({ diario, unidade, empreendimento, t, pdfMode }) => {
    const year = new Date(diario?.data_diario || Date.now()).getFullYear();
    const coverFrameOriginalUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/dca667b3d_erasebg-transformed.png";
    const redDecorativeElementUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/513d57969_Designsemnome2.png';
    const bottomRightFrameUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/10e9b2570_erasebg-transformed.png';
    const empreendimentoImageUrl = empreendimento?.foto_empreendimento || 'https://images.unsplash.com/photo-1519947486511-46149fa0a254?w=800&q=80';
    const logoInterativaUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/1a0999f3c_logo_Interativa_letra_branca_sem_fundo_gg.png";
    const logoInterativaBrancoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/22086ec44_LOGOPNG-branco.png";
    
    const defaultResponsaveis = [empreendimento?.cli_empreendimento, empreendimento?.nome_empreendimento].filter(Boolean).join(' | ');
    const responsaveis = empreendimento?.texto_capa_rodape || defaultResponsaveis;

    const formatResponsaveis = (text) => text || 'Clientes';
    const getTextStyle = (text) => {
        const len = text ? text.length : 0;
        if (len <= 25) return { fontSize: '32px', letterSpacing: '1px', fontWeight: 'normal' };
        if (len <= 40) return { fontSize: '26px', letterSpacing: '0.8px', fontWeight: 'normal' };
        return { fontSize: '20px', letterSpacing: '0.5px', fontWeight: 'normal' };
    };
    const textStyle = getTextStyle(responsaveis);

    return (
        <div className="report-page relative w-full h-full bg-white font-sans overflow-hidden" style={{ margin: 0, padding: 5 }}>
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
                <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: '29.5px', color: redColor, letterSpacing: '4px' }}>DIÁRIO DE OBRA</h2>
            </div>
            <div className="absolute z-30" style={{ top: '50%', right: '-3%', width: '45%', padding: '1.3% 2.5%', textAlign: 'center' }}>
                <h1 className="font-black uppercase" style={{ fontSize: '28px', lineHeight: '1.0', fontFamily: "'Inter', sans-serif", marginBottom: '6px', color: 'black' }}>{unidade?.cliente_unidade || 'Gerenciamento'}</h1>
                <h2 className="text-gray-600 font-medium" style={{ fontSize: '16px', fontFamily: "'Inter', sans-serif" }}>{unidade?.unidade_empreendimento || diario?.unidade_texto || ''}</h2>
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
                <span className="text-white w-full" style={{ ...textStyle, fontFamily: 'Poppins', textAlign: 'center', lineHeight: '1.2' }}>{formatResponsaveis(responsaveis)}</span>
            </div>
        </div>
    );
};

const CompressedPhoto = ({ url, legenda, index }) => {
  const compressedUrl = useCompressedImage(url, 500, 0.5);
  return (
    <div className="text-center break-inside-avoid photo-item-print">
      <img src={compressedUrl} alt={legenda || `Foto ${index}`} className="w-full h-auto max-h-80 object-contain rounded border photo-img-print bg-gray-50"/>
      {legenda && <p className="text-xs mt-1 font-medium text-black">{legenda}</p>}
    </div>
  );
};

// ************** Fim dos Componentes Reutilizados **************

const DiarioContentPage = ({ diario, empreendimento, unidade, t }) => {
    // Only use diario.data_diario for relevant calculations for *this* diario
    const hoje = new Date(diario.data_diario);
    
    const totalEfetivo = diario.efetivo?.reduce((acc, item) => {
        return {
            presente: acc.presente + (item.presente || 0),
            aus_com: acc.aus_com + (item.ausente_com_justificativa || 0),
            aus_sem: acc.aus_sem + (item.ausente_sem_justificativa || 0),
        };
    }, { presente: 0, aus_com: 0, aus_sem: 0 }) || { presente: 0, aus_com: 0, aus_sem: 0 };
    
    totalEfetivo.total = totalEfetivo.presente + totalEfetivo.aus_com + totalEfetivo.aus_sem;

    const diaDaSemana = diario.data_diario ? format(new Date(diario.data_diario), 'eeee', { locale: ptBR }) : '';

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        // Adiciona um dia para corrigir o problema de fuso horário
        const date = new Date(dateString);
        // Note: This +1 day adjustment is often a workaround for timezone issues
        // where a date string without time zone info is parsed as UTC midnight,
        // then displayed in local time, shifting it back a day.
        // If date strings always contain timezone, or are consistently UTC, this might not be needed.
        // For robustness, consider using libraries like date-fns-tz or ensuring ISO strings for dates.
        date.setDate(date.getDate() + 1); 
        return format(date, 'dd/MM/yyyy');
    };

    return (
        <div className="p-4 text-xs bg-white">
            <div className="w-full mb-4">
                <div className="text-lg font-bold text-white p-2 rounded-md text-center" style={{ backgroundColor: blueColor }}>
                    <span>DIÁRIO DE OBRA</span>
                </div>
            </div>

            {/* Informações do Contrato */}
            <div className="border border-black mb-2 text-center">
                <div className="grid grid-cols-4">
                    <div className="p-1 border-r border-black"><strong>Contrato nº:</strong><br/>{empreendimento?.os_number || 'N/A'}</div>
                    <div className="p-1 border-r border-black"><strong>Data Início:</strong><br/>{formatDate(empreendimento?.data_inicio_contrato)}</div>
                    <div className="p-1 border-r border-black"><strong>Data Término:</strong><br/>{formatDate(empreendimento?.data_termino_contrato)}</div>
                    <div className="p-1"><strong>Prazo Contratual:</strong><br/>{empreendimento?.prazo_contratual_dias || 0} dias</div>
                </div>
            </div>


            {/* Cabeçalho com Dia da Semana, etc. */}
            <div className="grid grid-cols-3 border-y border-black mb-1">
                <div className="border-r border-black p-1"><strong>Dia da semana:</strong> {diaDaSemana}</div>
                <div className="border-r border-black p-1"><strong>Quantidade de profissionais:</strong> {totalEfetivo.presente}</div>
                <div className="p-1"><strong>Horas Paralisadas:</strong> {diario.horas_paralisadas || 0}</div>
            </div>

            {/* Período */}
            <div className="border-b border-black mb-1 p-1">
                <strong className="mr-4">Período:</strong>
                <span className="mr-4"><input type="checkbox" readOnly checked={diario.periodo_trabalhado?.manha} className="mr-1"/> Manhã</span>
                <span className="mr-4"><input type="checkbox" readOnly checked={diario.periodo_trabalhado?.tarde} className="mr-1"/> Tarde</span>
                <span><input type="checkbox" readOnly checked={diario.periodo_trabalhado?.noite} className="mr-1"/> Noite</span>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-2 gap-8">
                {/* Coluna Esquerda: Efetivo */}
                <div>
                    <h3 className="font-bold text-center mb-2">Contigente PCON</h3>
                    <table className="w-full text-left">
                        <thead>
                            <tr>
                                <th className="border-b border-black font-bold">Categoria</th>
                                <th className="border-b border-black text-center font-bold">Pres.</th>
                                <th className="border-b border-black text-center font-bold">Aus c/ Just.</th>
                                <th className="border-b border-black text-center font-bold">Aus s/ Just.</th>
                                <th className="border-b border-black text-center font-bold">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {diario.efetivo.map((item, index) => {
                                const totalLinha = (item.presente || 0) + (item.ausente_com_justificativa || 0) + (item.ausente_sem_justificativa || 0);
                                return (
                                    <tr key={index}>
                                        <td className="border-b border-dotted border-gray-400">{item.categoria}</td>
                                        <td className="border-b border-dotted border-gray-400 text-center">{item.presente || 0}</td>
                                        <td className="border-b border-dotted border-gray-400 text-center">{item.ausente_com_justificativa || 0}</td>
                                        <td className="border-b border-dotted border-gray-400 text-center">{item.ausente_sem_justificativa || 0}</td>
                                        <td className="border-b border-dotted border-gray-400 text-center font-bold">{totalLinha}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr className="font-bold">
                                <td className="text-left pt-1">TOTAL</td>
                                <td className="text-center pt-1">{totalEfetivo.presente}</td>
                                <td className="text-center pt-1">{totalEfetivo.aus_com}</td>
                                <td className="text-center pt-1">{totalEfetivo.aus_sem}</td>
                                <td className="text-center pt-1">{totalEfetivo.total}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Coluna Direita: Atividades */}
                <div>
                    <h3 className="font-bold text-center mb-2">Andamento da Obra Principais Serviços em Execução</h3>
                    {diario.principais_atividades?.length > 0 && (
                        <ul className="list-inside list-decimal space-y-1">
                            {diario.principais_atividades.map((atividade, index) => (
                                <li key={index} className="border-b border-dotted border-gray-400 pb-1">{atividade}</li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>

            {/* Ocorrências */}
            {/* The occurrences are now moved to AnexosEControlePage. */}
        </div>
    );
};

const AnexosEControlePage = ({ diario, empreendimento, unidade }) => {
    // --- Logic from old AnexoOcorrrenciasPage ---
    const rawOcorrencias = diario.ocorrencias_observacoes || '';
    const ocorrencias = rawOcorrencias.split('\n').filter(line => line.trim() !== '');
    
    // --- Logic from old ControleChuvaPage ---
    const hoje = new Date(diario.data_diario);
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        date.setDate(date.getDate() + 1);
        return format(date, 'dd/MM/yyyy');
    };
    const dataTermino = empreendimento?.data_termino_contrato ? new Date(empreendimento.data_termino_contrato) : null;
    const diasParaTermino = dataTermino ? differenceInDays(dataTermino, hoje) : 'N/A';
    const diaDaSemana = format(hoje, 'eeee', { locale: ptBR });
    const diaDoMes = format(hoje, 'd');
    const legendaChuva = [
        { id: 1, text: 'Dias produtivos', color: '#28a745' },
        { id: 2, text: 'Dias sem atividades', color: '#6c757d' },
        { id: 3, text: 'Dias com trabalhos prejudicados por chuva', color: '#dc3545' },
        { id: 4, text: 'Dias com trabalhos prejudicados por chuva do dia anterior', color: '#ffc107' },
    ];
    const condicaoClimaticaText = diario.condicao_climatica || 'Dias produtivos';
    const statusChuvaAtual = legendaChuva.find(l => l.text === condicaoClimaticaText) || legendaChuva[0];

    return (
        <div className="p-4 text-xs bg-white h-full flex flex-col">
            {/* === Anexo de Ocorrências Part === */}
            <table className="w-full border-collapse border border-black text-center">
                <tbody>
                    <tr>
                        <td className="border border-black p-1 w-1/3"><strong>Obra</strong><br/>{empreendimento?.nome_empreendimento || 'N/A'}</td>
                        <td className="border border-black p-1 w-1/3"><strong>Sigla</strong><br/>{empreendimento?.sigla_obra || 'N/A'}</td>
                        <td className="border border-black p-1 w-1/3"><strong>Data</strong><br/>{diario?.data_diario ? format(new Date(diario.data_diario), 'dd/MM/yyyy') : 'N/A'}</td>
                    </tr>
                    <tr>
                        <td colSpan="3" className="border border-black p-1 text-left"><strong>Cliente:</strong> {unidade?.cliente_unidade || 'N/A'}</td>
                    </tr>
                    <tr>
                        <td colSpan="3" className="border border-black p-1 text-left"><strong>Assunto:</strong> Anexo de Ocorrências e Protocolos</td>
                    </tr>
                </tbody>
            </table>
            
            <div className="border-x border-black mt-4">
                <div className="p-1 border-t border-black font-bold text-red-600">Ocorrências</div>
            </div>

            <div className="border border-black border-t-0 overflow-hidden mb-8 flex-grow">
                {ocorrencias.length > 0 ? (
                    ocorrencias.map((ocorrencia, index) => (
                        <div key={index} className="flex items-center border-b border-dotted border-gray-400 min-h-[24px]">
                            <span className="px-2">{index + 1}</span>
                            <span className="flex-grow px-2">{ocorrencia}</span>
                        </div>
                    ))
                ) : (
                    <div className="p-2 text-gray-500 italic">Nenhuma ocorrência registrada.</div>
                )}
            </div>

            {/* === Controle de Chuva e Vistos Part === */}
            <div className="mt-auto">
                <h3 className="font-bold mb-1">Atividades Prejudicadas pela Chuva</h3>
                <div className="flex justify-between items-start border border-black p-1">
                    <div>
                        <strong>Legenda</strong>
                        {legendaChuva.map(item => (
                            <div key={item.id} className="flex items-center">
                                <div className="w-6 text-center border border-black mr-2" style={{ backgroundColor: item.color, color: item.id === 4 ? 'black' : 'white' }}>{item.id}</div>
                                <span>{item.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <table className="w-full border-collapse border border-black text-center mt-1">
                    <thead>
                        <tr>
                            <th className="border border-black font-bold">Dia (Semana)</th>
                            <th className="border border-black font-bold">Dia (Mês)</th>
                            <th className="border border-black font-bold">Atividades</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border border-black capitalize" style={{ backgroundColor: statusChuvaAtual.color, color: statusChuvaAtual.id === 4 ? 'black' : 'white' }}>{diaDaSemana}</td>
                            <td className="border border-black">{diaDoMes}</td>
                            <td className="border border-black">{condicaoClimaticaText}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="flex mt-4">
                <div className="w-1/2 pr-2">
                    <table className="w-full border-collapse border border-black text-left">
                        <tbody>
                            <tr><td className="border border-black p-1 font-bold">Contrato Nº</td><td className="border border-black p-1">{empreendimento?.os_number || 'N/A'}</td></tr>
                            <tr><td className="border border-black p-1 font-bold">Construção:</td><td className="border border-black p-1">0</td></tr>
                            <tr><td className="border border-black p-1 font-bold">Data Início:</td><td className="border border-black p-1">{formatDate(empreendimento?.data_inicio_contrato)}</td></tr>
                            <tr><td className="border border-black p-1 font-bold">Data Final:</td><td className="border border-black p-1">{formatDate(empreendimento?.data_termino_contrato)}</td></tr>
                            <tr><td className="border border-black p-1 font-bold">nº de dias do projeto</td><td className="border border-black p-1">{empreendimento?.prazo_contratual_dias || 0}</td></tr>
                            <tr><td className="border border-black p-1 font-bold">nº de dias para o término do projeto</td><td className="border border-black p-1">{diasParaTermino}</td></tr>
                        </tbody>
                    </table>
                </div>

                <div className="w-1/2 pl-2">
                    {diario.vistos && diario.vistos.length > 0 && (
                        <div>
                            <h3 className="font-bold mb-1 text-center border-x border-t border-black">Recebido</h3>
                            <table className="w-full text-left border-collapse border border-black">
                                <thead>
                                    <tr>
                                        <th className="p-1 border-b border-black font-bold">Resp.</th>
                                        <th className="p-1 border-b border-black font-bold">Data</th>
                                        <th className="p-1 border-b border-black font-bold">Visto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {diario.vistos.map((visto, index) => (
                                        <tr key={index}>
                                            <td className="p-1 border-b border-dotted border-gray-400">{visto.responsavel || 'N/A'}</td>
                                            <td className="p-1 border-b border-dotted border-gray-400">
                                                {visto.data_visto ? format(new Date(visto.data_visto), 'dd/MM/yyyy') : 'N/A'}
                                            </td>
                                            <td className="p-1 border-b border-dotted border-gray-400">{visto.nome_visto || 'N/A'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// VistosPage is no longer used directly as its content is now part of AnexosEControlePage.
// It is kept here just in case it's referenced elsewhere or for future reuse.
const VistosPage = ({ diario, pdfMode }) => {
    if (!diario.vistos || diario.vistos.length === 0) return null;

    return (
        <div className="p-4 text-xs bg-white">
            <h3 className="font-bold mb-2 text-center">Recebido</h3>
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr>
                        <th className="p-1 border-y border-black font-bold">Resp.</th>
                        <th className="p-1 border-y border-black font-bold">Data</th>
                        <th className="p-1 border-y border-black font-bold">Visto</th>
                    </tr>
                </thead>
                <tbody>
                    {diario.vistos.map((visto, index) => (
                        <tr key={index}>
                            <td className="p-1 border-b border-dotted border-gray-400">{visto.responsavel}</td>
                            <td className="p-1 border-b border-dotted border-gray-400">
                                {visto.data_visto ? format(new Date(visto.data_visto), 'dd/MM/yyyy') : ''}
                            </td>
                            <td className="p-1 border-b border-dotted border-gray-400">{visto.nome_visto}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

const PhotoPage = ({ photos, pdfMode }) => {
    return (
        <div className="p-4 space-y-4">
             <div className="w-full mb-4">
                <div className="text-base font-bold text-white p-3 rounded-md text-center" style={{ backgroundColor: blueColor }}>
                    <span>REGISTRO FOTOGRÁFICO</span>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
                {photos.map((photo, index) => (
                    <CompressedPhoto
                        key={index}
                        url={photo.url}
                        legenda={photo.legenda}
                        index={index + 1}
                    />
                ))}
            </div>
        </div>
    );
};

const paginateDiarioContent = (diario, empreendimento, unidade, t) => {
    const pages = [];
    
    // Page 1: Cover
    pages.push({ content: <CoverPage diario={diario} empreendimento={empreendimento} unidade={unidade} t={t} />, isFlow: false });
    
    // Page 2: Content (Diário)
    pages.push({ content: <DiarioContentPage diario={diario} empreendimento={empreendimento} unidade={unidade} t={t} />, isFlow: false });

    // Page 3: Anexos e Controle (Ocorrências + Chuva + Vistos)
    // Changed isFlow to false so that the internal "footer" (Controle de Chuva e Vistos Part)
    // sticks to the bottom of the page if the content fits, instead of flowing.
    pages.push({ content: <AnexosEControlePage diario={diario} empreendimento={empreendimento} unidade={unidade} />, isFlow: false });

    // Subsequent pages: Photos
    const photos = diario.fotos || [];
    const photosPerPage = 4; // Ajuste conforme necessário
    for (let i = 0; i < photos.length; i += photosPerPage) {
        const photoChunk = photos.slice(i, i + photosPerPage);
        pages.push({ content: <PhotoPage photos={photoChunk} />, isFlow: false });
    }

    return pages;
};

const ReportContent = ({ diario, unidade, empreendimento, t, navigate, user, loadingUser }) => {
    const [isPrintingMode, setIsPrintingMode] = useState(false);

    const paginatedPages = useMemo(() => {
        return paginateDiarioContent(diario, empreendimento, unidade, t);
    }, [diario, empreendimento, unidade, t]);

    const handlePrint = async () => {
        setIsPrintingMode(true);
        await new Promise(resolve => setTimeout(resolve, 50)); 
        window.print();
        setTimeout(() => {
            setIsPrintingMode(false);
        }, 2000);
    };

    const handleBackClick = () => {
        navigate(-1);
    };

    const totalPages = "Múltiplas";

    return (
        <div className="bg-gray-200 print:bg-white min-h-screen font-sans">
            {!loadingUser && (
                <div className="no-print shadow-sm border-b p-4 mb-4 bg-white">
                     <div className="flex justify-between items-center max-w-4xl mx-auto">
                        <Button onClick={handleBackClick} variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
                        <h1 className="text-xl font-semibold text-gray-800">Diário de Obra</h1>
                        <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700 text-white"><Printer className="w-4 h-4 mr-2" />Gerar PDF</Button>
                    </div>
                </div>
            )}

            <div className="report-container max-w-4xl mx-auto" style={{ padding: 0 }}>
                {paginatedPages.map((page, index) => (
                    <ReportPage
                        key={`page-${index}`}
                        pageNumber={index + 1}
                        totalPages={totalPages}
                        diario={diario}
                        empreendimento={empreendimento}
                        unidade={unidade}
                        pdfMode={isPrintingMode}
                        isFlowPage={page.isFlow}
                    >
                        {React.cloneElement(page.content, { pdfMode: isPrintingMode, t: t })}
                    </ReportPage>
                ))}
            </div>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@700&family=Poppins:wght@100;200;300;400;500;600;700;800;900&display=swap');
                
                .cover-background-image { background-position: center 15% !important; }

                @media print {
                  .no-print { display: none !important; }
                  .report-page { page-break-after: always; }
                  .report-page:not(.flow-page) { 
                    width: 210mm; 
                    height: 297mm; 
                    margin: 0; 
                    padding: 0; 
                    page-break-inside: avoid;
                    overflow: hidden; 
                    box-shadow: none; 
                  }
                  .flow-page {
                     width: 210mm;
                     height: auto; /* Allows content to flow */
                     margin: 0;
                     padding: 0;
                     page-break-inside: auto; /* Allow content inside to break across pages */
                     box-shadow: none;
                     overflow: visible; /* Allow content to overflow page boundaries naturally for print to handle */
                  }
                  .report-page:last-child { page-break-after: auto; }
                  html, body { margin: 0; padding: 0; background: white !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; font-family: 'Poppins', 'Inter', sans-serif; }
                  .break-inside-avoid { page-break-inside: avoid !important; }
                  table { page-break-inside: auto; }
                  tr { page-break-inside: avoid; }
                  tbody { page-break-inside: auto; } /* Allow tbody to break */
                  @page { size: A4; margin: 0; }
                }
                
                @media screen {
                  .report-page { width: 210mm; margin: 20px auto; padding: 0; box-shadow: 0 0 10px rgba(0,0,0,0.1); background: white; position: relative; }
                  .report-page:not(.flow-page) { 
                    height: 297mm; 
                    overflow: hidden; 
                  }
                  .flow-page { 
                    height: auto; /* For screen preview, also allow it to grow */
                    overflow: visible;
                  }
                  .report-page:first-child { margin: 0 auto 20px auto; }
                }
            `}</style>
        </div>
    );
};

export default function VisualizarDiarioObra() {
    const navigate = useNavigate();
    const location = useLocation();

    const [diario, setDiario] = useState(null);
    const [unidade, setUnidade] = useState(null);
    const [empreendimento, setEmpreendimento] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [user, setUser] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);

    const urlParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const diarioId = urlParams.get('diarioId');

    const t = translations[language];

    useEffect(() => {
        // Forçar light color-scheme para relatórios (previne dark mode do navegador)
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
            // Restaurar ao sair
            document.documentElement.style.colorScheme = originalColorScheme;
            if (metaWasCreated && metaColorScheme.parentNode) {
                metaColorScheme.parentNode.removeChild(metaColorScheme);
            } else if (metaColorScheme) {
                metaColorScheme.content = originalMetaContent;
            }
        };
    }, []);

    useEffect(() => {
        const loadReportData = async () => {
            try {
                setLoading(true);
                setLoadingUser(true);
                setError(null);

                // Fetch user data first, independent of diarioId
                try {
                    const currentUser = await User.me();
                    setUser(currentUser);
                } catch (userError) {
                    // User not logged in or error fetching user, proceed without user data
                    setUser(null);
                } finally {
                    setLoadingUser(false);
                }

                if (!isValidId(diarioId)) {
                    setError("ID do diário não fornecido na URL ou inválido.");
                    setLoading(false);
                    return;
                }

                const diarioData = await DiarioDeObra.get(diarioId);
                if (!diarioData) {
                    throw new Error("Diário de obra não encontrado.");
                }
                setDiario(diarioData);

                const [unidadeResult, empreendimentoResult] = await Promise.allSettled([
                    diarioData.id_unidade ? UnidadeEmpreendimento.get(diarioData.id_unidade) : Promise.resolve(null),
                    diarioData.id_empreendimento ? Empreendimento.get(diarioData.id_empreendimento) : Promise.resolve(null),
                ]);

                if (unidadeResult.status === 'fulfilled' && unidadeResult.value) {
                    setUnidade(unidadeResult.value);
                } else {
                    console.warn("Could not load Unidade Empreendimento:", unidadeResult.reason);
                    setUnidade(null);
                }

                if (empreendimentoResult.status === 'fulfilled' && empreendimentoResult.value) {
                    setEmpreendimento(empreendimentoResult.value);
                } else {
                    console.warn("Could not load Empreendimento:", empreendimentoResult.reason);
                    setEmpreendimento(null);
                }
            } catch (err) {
                console.error("Erro detalhado ao carregar dados:", err);
                setError(err instanceof Error ? err.message : String(err));
            } finally {
                setLoading(false);
            }
        };

        if (diarioId) {
            loadReportData();
        } else {
            setError("ID do Diário de Obra não fornecido.");
            setLoading(false);
            setLoadingUser(false); // If no diarioId, then user loading is also effectively done for this component's purpose
        }
    }, [diarioId]);

    if (loading || loadingUser) {
        return <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100"><Loader2 className="h-12 w-12 animate-spin mb-4" style={{ color: blueColor }} /><p className="text-gray-600 text-lg">Carregando relatório...</p></div>;
    }

    if (error) {
        return (
             <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
                  <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-red-600 mb-4">Erro ao Carregar Relatório</h2>
                  <p className="text-gray-700 mb-6">{error}</p>
                  <Button onClick={() => navigate(-1)} variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
                </div>
              </div>
        );
    }

    if (!diario) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
            <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-orange-600 mb-4">Dados Incompletos</h2>
            <p className="text-gray-700 mb-6">Não foi possível carregar as informações essenciais para gerar o diário de obra.</p>
            <Button onClick={() => navigate(-1)} variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
          </div>
        </div>
      );
    }
    
    return (
        <ReportContent
            diario={diario}
            unidade={unidade}
            empreendimento={empreendimento}
            t={t}
            navigate={navigate}
            user={user}
            loadingUser={loadingUser}
        />
    );
}
