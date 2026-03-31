import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { AtaReuniao, Empreendimento as EmpreendimentoEntity } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, ArrowLeft, AlertTriangle, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createPageUrl } from '@/utils';
import { AssinaturasPage } from '@/components/relatorios/AssinaturasSection';
import { paginateBlocksForPrinting } from '@/lib/reportPagination';

const isValidId = (id) => id && typeof id === 'string' && id.length > 0;

const CoverPage = ({ ata, empreendimento, pdfMode }) => {
  const year = new Date(ata?.data_reuniao || Date.now()).getFullYear();
  const redColor = '#CE2D2D';

  const getTextStyle = (text) => {
    const len = text ? text.length : 0;
    if (len <= 25) return { fontSize: '32px', letterSpacing: '1px' };
    if (len <= 40) return { fontSize: '26px', letterSpacing: '0.8px' };
    return { fontSize: '20px', letterSpacing: '0.5px' };
  };
  const empreendimentoImageUrl = empreendimento?.foto_empreendimento || 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&q=80';

  const logoInterativaUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/1a0999f3c_logo_Interativa_letra_branca_sem_fundo_gg.png";
  const coverFrameOriginalUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/dca667b3d_erasebg-transformed.png";
  const redDecorativeElementUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/513d57969_Designsemnome2.png';
  const bottomRightFrameUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/10e9b2570_erasebg-transformed.png';
  const logoInterativaBrancoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/22086ec44_LOGOPNG-branco.png";

  const defaultResponsaveis = [empreendimento?.cli_empreendimento, empreendimento?.nome_empreendimento].filter(Boolean).join(' | ');
  const responsaveis = ata?.texto_rodape_capa || empreendimento?.texto_capa_rodape || defaultResponsaveis;

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
        <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: '64px', fontWeight: 'bold', color: '#394557', lineHeight: '1.1', marginBottom: '4px' }}>{ata?.titulo_capa || 'RELATÓRIO'}</h1>
        <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: '29.5px', color: redColor, letterSpacing: '4px' }}>{ata?.subtitulo_capa || 'GERENCIAMENTO DE OBRA'}</h2>
      </div>
      <div className="absolute z-30" style={{ top: '50%', right: '-3%', width: '45%', padding: '1.3% 2.5%', textAlign: 'center' }}>
        <h1 className="font-black uppercase" style={{ fontSize: '28px', lineHeight: '1.0', fontFamily: "'Inter', sans-serif", marginBottom: '6px', color: 'black' }}>{ata?.titulo_reuniao || 'Reunião'}</h1>
        <h2 className="text-gray-600 font-medium" style={{ fontSize: '16px', fontFamily: "'Inter', sans-serif" }}>{ata?.subtitulo_reuniao || format(new Date(ata?.data_reuniao), 'dd/MM/yyyy', { locale: ptBR })}</h2>
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
        <span className="text-white w-full font-normal" style={{ ...getTextStyle(ata?.texto_rodape_capa || responsaveis), fontFamily: 'Poppins', textAlign: 'center', lineHeight: '1.2' }}>{ata?.texto_rodape_capa || responsaveis}</span>
      </div>
    </>
  );
};

const ContentPage = ({ ata, empreendimento }) => {
  return (
    <div className="p-6 space-y-6 text-sm">
      <div className="bg-blue-900 text-white p-3 text-center mb-4">
        <h2 className="text-base font-bold">Informações Gerais</h2>
      </div>
      <div className="border-b-2 border-black pb-4">
        <div className="grid grid-cols-2 gap-4">
          <div><strong>Edifício:</strong> {ata?.edificio}</div>
          <div><strong>Cliente:</strong> {ata?.locatario}</div>
          <div><strong>Data:</strong> {format(new Date(ata?.data_reuniao), 'dd/MM/yyyy', { locale: ptBR })}</div>
        </div>
      </div>

      {ata?.participantes && ata.participantes.length > 0 && (
        <div>
          <h3 className="font-bold mb-2">Participantes</h3>
          <table className="w-full border-collapse border border-gray-400 text-xs">
            <thead className="bg-gray-200">
              <tr>
                <th className="border border-gray-300 p-2">Nome</th>
                <th className="border border-gray-300 p-2">Empresa</th>
              </tr>
            </thead>
            <tbody>
              {ata.participantes.map((p, i) => (
                <tr key={i} className="odd:bg-white even:bg-gray-50">
                  <td className="border border-gray-300 p-2">{p.nome}</td>
                  <td className="border border-gray-300 p-2">{p.empresa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ata?.informacoes_obra && ata.informacoes_obra.length > 0 && (
        <div>
          <h3 className="font-bold mb-2">Informações da Obra</h3>
          {ata.informacoes_obra.map((item, i) => (
            <div key={i} className="mb-4 p-3 border rounded bg-gray-50 text-xs">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div><strong>Nome:</strong> {item.nome}</div>
                <div><strong>Email:</strong> {item.email}</div>
              </div>
              <div className="mb-2"><strong>Tipo:</strong> {item.tipo}</div>
              <div className="mb-2"><strong>Observações:</strong> {item.observacoes}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const ItensDiscutidosPage = ({ secao, secoes }) => {
  const secoesParaRenderizar = Array.isArray(secoes) ? secoes : (secao ? [secao] : []);

  return (
    <div className="p-6 space-y-4 text-sm">
      <h3 className="font-bold mb-4 text-base border-b-2 border-gray-300 pb-2">ITENS DISCUTIDOS</h3>
      <div className="space-y-5">
        {secoesParaRenderizar.map((secaoAtual, secaoIndex) => (
          <section key={secaoIndex} className="space-y-2">
            {secaoAtual.titulo_secao && (
              <h4 className="font-bold text-sm mb-3 border-l-4 border-blue-600 pl-2">{secaoAtual.titulo_secao}</h4>
            )}
            <div className="space-y-2">
              {secaoAtual.itens?.map((item, itemIndex) => (
                <div key={itemIndex} className="p-3 rounded bg-gray-50 text-xs">
                  {item.titulo_item && (
                    <p className="font-semibold mb-1">{item.titulo_item}:</p>
                  )}
                  <p className="whitespace-pre-wrap text-gray-700">{item.descricao}</p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

const ReportPageLayout = ({ children, pageNumber, totalPages, ata, empreendimento, pdfMode }) => {
  const logoHorizontalCompressed = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/4bd521d1e_LOGOHORIZONTAl.png";
  const HEADER_HEIGHT = '80px';
  const FOOTER_HEIGHT = '45px';
  const isCover = false;

  return (
    <div className={`report-page w-full relative bg-white ${pdfMode ? 'pdf-mode' : ''}`}>
      <div className="flex justify-between items-center border-b border-gray-200 bg-white" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_HEIGHT, zIndex: 100, padding: '4px 8px', maxWidth: '210mm', boxSizing: 'border-box' }}>
        <img src={logoHorizontalCompressed} alt="Logo Interativa Engenharia" style={{ height: '32px', maxWidth: '120px', objectFit: 'contain' }} />
        <div className="text-right" style={{ flex: 1, paddingLeft: '8px', overflow: 'hidden' }}>
          <h2 className="text-[10px] font-bold text-gray-800 uppercase leading-tight truncate">{ata?.titulo_reuniao || 'ATA DE REUNIÃO'}</h2>
          <p className="text-[9px] text-gray-600 leading-tight truncate">{empreendimento?.nome_empreendimento}</p>
          <p className="text-[9px] font-medium text-gray-800 leading-tight">{ata?.data_reuniao ? format(new Date(ata.data_reuniao), 'dd/MM/yyyy', { locale: ptBR }) : ''}</p>
        </div>
      </div>
      <div className="overflow-hidden" style={{ paddingTop: HEADER_HEIGHT, paddingBottom: FOOTER_HEIGHT }}>
        {children}
      </div>
      <div className="border-t border-gray-200 bg-gray-50 flex justify-between items-center text-[9px] text-gray-500" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: FOOTER_HEIGHT, padding: '4px 8px', maxWidth: '210mm', boxSizing: 'border-box' }}>
        <div className="flex-1 text-left leading-tight truncate" style={{ paddingRight: '8px' }}>
          {ata?.nome_arquivo && <><span className="font-medium">Arquivo: </span><span>{ata.nome_arquivo}.pdf</span></>}
        </div>
        <div className="flex-1 flex flex-col items-center leading-tight text-[8px]"><span>INTERATIVA ENGENHARIA</span><span>www.interativaengenharia.com.br</span></div>
        <div className="flex-1 text-right leading-tight" style={{ paddingLeft: '8px' }}><span>Página {pageNumber} de {totalPages}</span></div>
      </div>
    </div>
  );
};

const ReportContent = ({ ata, empreendimento, navigate }) => {
  const [isPrintingMode, setIsPrintingMode] = useState(false);

  const itensDiscutidosPages = paginateBlocksForPrinting(
    (ata.itens_discutidos || []).map((secao, index) => {
      const itens = Array.isArray(secao?.itens) ? secao.itens : [];
      const textLength = itens.reduce((acc, item) => acc + String(item?.titulo_item || '').length + String(item?.descricao || '').length, 0);
      return {
        secao,
        order: index,
        estimatedHeightPx: 72 + (itens.length * 58) + Math.ceil(textLength / 180) * 18,
      };
    }),
    {
      pageHeightPx: 1122,
      headerHeightPx: 80,
      footerHeightPx: 45,
      pagePaddingPx: 16,
      footerGuardPx: 20,
      breakBeforeLimitPx: 32,
      defaultBlockHeightPx: 180,
    }
  );
  const hasAssinaturas = ata.assinaturas && ata.assinaturas.length > 0 &&
    ata.assinaturas.some(ass => (ass.nome && ass.nome.trim() !== '') || (ass.parte && ass.parte.trim() !== '') || (ass.assinatura_imagem && ass.assinatura_imagem.trim() !== ''));

  const totalPages = 1 + itensDiscutidosPages.length + (hasAssinaturas ? 1 : 0);

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
          <Button onClick={() => navigate(createPageUrl(`EmpreendimentoAtasReuniao?empreendimentoId=${ata.id_empreendimento}`))} variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
          <h1 className="text-xl font-semibold text-gray-800">Visualizar Ata de Reunião</h1>
          <div className="flex gap-2">
            <Button onClick={() => navigate(createPageUrl(`EmpreendimentoAtaReuniao?ataId=${ata.id}&empreendimentoId=${ata.id_empreendimento}`))} variant="outline" className="bg-blue-50"><Edit2 className="w-4 h-4 mr-2" />Editar</Button>
            <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700 text-white"><Printer className="w-4 h-4 mr-2" />Gerar PDF</Button>
          </div>
        </div>
      </div>

      <div className="report-container max-w-4xl mx-auto" style={{ padding: 0 }}>
        {/* Page 1: Content */}
        <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} ata={ata} empreendimento={empreendimento} pdfMode={isPrintingMode}>
          <ContentPage ata={ata} empreendimento={empreendimento} />
        </ReportPageLayout>

        {/* Page 3+: Itens Discutidos - one per page */}
        {itensDiscutidosPages.map((pageBlocks, secaoIndex) => (
          <ReportPageLayout key={secaoIndex} pageNumber={currentPage++} totalPages={totalPages} ata={ata} empreendimento={empreendimento} pdfMode={isPrintingMode}>
            <ItensDiscutidosPage secoes={pageBlocks.map((block) => block.secao)} />
          </ReportPageLayout>
        ))}

        {/* Final Page: Signatures if exist */}
        {hasAssinaturas && (
          <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} ata={ata} empreendimento={empreendimento} pdfMode={isPrintingMode}>
            <AssinaturasPage assinaturas={ata.assinaturas.filter(ass =>
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
                    .no-print, aside, header, nav { display: none !important; }
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
                }
            `}</style>
    </div>
  );
};

export default function VisualizarAtaReuniao() {
  const navigate = useNavigate();
  const location = useLocation();
  const ataId = new URLSearchParams(location.search).get('ataId');

  const [ata, setAta] = useState(null);
  const [empreendimento, setEmpreendimento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isValidId(ataId)) {
      setError("ID da ata é inválido ou não foi fornecido.");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const ataData = await AtaReuniao.get(ataId);
        if (!ataData) throw new Error("Ata não encontrada.");

        const empreendimentoData = await EmpreendimentoEntity.get(ataData.id_empreendimento);
        if (!empreendimentoData) throw new Error("Empreendimento não encontrado.");

        setAta(ataData);
        setEmpreendimento(empreendimentoData);
        setError(null);
      } catch (err) {
        setError(err.message);
        setAta(null);
        setEmpreendimento(null);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [ataId]);

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
    return <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100"><Loader2 className="h-12 w-12 animate-spin text-blue-600" /><p className="mt-4 text-gray-600">Carregando ata...</p></div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-red-50 p-4">
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-700 mb-2">Erro ao carregar ata</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
        </div>
      </div>
    );
  }

  return <ReportContent ata={ata} empreendimento={empreendimento} navigate={navigate} />;
}