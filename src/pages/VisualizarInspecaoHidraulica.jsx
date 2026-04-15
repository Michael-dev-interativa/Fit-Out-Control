import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { InspecaoHidraulica, Empreendimento } from '@/api/entities';
import { compressReportImages } from '@/lib/compressReportImages';
import { Button } from '@/components/ui/button';
import { Loader2, Printer, ArrowLeft, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AssinaturasPage } from '@/components/relatorios/AssinaturasSection';
import { paginateLocalItemsForPrinting } from '@/lib/reportPagination';

const isValidId = (id) => id && typeof id === 'string' && id.length > 0;

const compressImage = (url, maxWidth = 800, quality = 0.7) => {
  return new Promise((resolve) => {
    if (!url || typeof url !== 'string' || url.startsWith('data:image')) {
      console.log('[Compressão] Ignorando URL já comprimida ou inválida:', url?.substring(0, 50));
      resolve(url);
      return;
    }
    if (url.includes('base44.app/api')) {
      console.log('[Compressão] Ignorando URL da API:', url);
      resolve(url);
      return;
    }
    console.log('[Compressão] Iniciando compressão de:', url);
    const startTime = Date.now();
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      let width = img.width;
      let height = img.height;
      const originalSize = width * height;
      if (width > maxWidth) {
        height *= maxWidth / width;
        width = maxWidth;
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const compressed = canvas.toDataURL('image/jpeg', quality);
      const endTime = Date.now();
      const newSize = width * height;
      console.log(`[Compressão] ✓ Concluída em ${endTime - startTime}ms - Redução: ${Math.round((1 - newSize / originalSize) * 100)}%`);
      resolve(compressed);
    };
    img.onerror = () => {
      console.error('[Compressão] ✗ Erro ao carregar imagem:', url);
      resolve(url);
    };
    img.src = url;
  });
};

const useCompressedImage = (url, maxWidth = 800, quality = 0.7) => {
  const [compressedUrl, setCompressedUrl] = useState(url);
  const [isCompressing, setIsCompressing] = useState(false);

  useEffect(() => {
    if (url && typeof url === 'string' && url.startsWith('http')) {
      setIsCompressing(true);
      compressImage(url, maxWidth, quality).then((compressed) => {
        setCompressedUrl(compressed);
        setIsCompressing(false);
      });
    } else {
      setCompressedUrl(url);
      setIsCompressing(false);
    }
  }, [url, maxWidth, quality]);

  return compressedUrl;
};

const isConclusaoMatching = (val, key) => {
  if (!val) return false;
  const s = String(val).normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLowerCase();
  if (key === 'totalidade') return s.includes('totalidade');
  if (key === 'ressalvas') return s.includes('ressalva');
  if (key === 'reprovado') return s.includes('reprovado');
  return s === key;
};

const CoverPage = ({ relatorio, empreendimento }) => {
  const year = new Date(relatorio?.data_inspecao || Date.now()).getFullYear();
  const redColor = '#CE2D2D';
  const empreendimentoImageUrl = useCompressedImage(empreendimento?.foto_empreendimento || 'https://images.unsplash.com/photo-1519947486511-46149fa0a254?w=800&q=80', 800, 0.35);
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
        <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: '26px', color: redColor, letterSpacing: '2px' }}>{relatorio?.subtitulo_capa || 'Gerenciamento de Obra'}</h2>
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

const DocumentacaoPage = ({ itens, comentarios }) => {
  return (
    <div className="p-4">
      <h2 className="text-xl font-bold text-center mb-4 bg-blue-900 text-white p-2">Documentação Técnica</h2>
      <table className="w-full border-collapse text-xs table-fixed">
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
              <td className="border border-black p-2" style={{ wordWrap: 'break-word', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{item.descricao}</td>
              <td className="border border-black p-2 text-center">{item.resultado === 'OK' ? '☑' : '☐'}</td>
              <td className="border border-black p-2" style={{ wordWrap: 'break-word', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{item.observacoes}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h4 className="text-sm font-bold mt-4 mb-1 bg-gray-100 p-1 border border-black">Observações Gerais:</h4>
      <div className="border border-black border-t-0 p-2 text-xs min-h-[30px] whitespace-pre-wrap" style={{ wordWrap: 'break-word', wordBreak: 'break-word', overflowWrap: 'break-word' }}>{comentarios || ''}</div>
    </div>
  );
};

const FotoInspecao = ({ url, legenda, maxHeight = '66mm' }) => {
  // URL já vem comprimida pelo compressReportImages
  return (
    <div className="text-center foto-inspecao" style={{ overflow: 'hidden', boxSizing: 'border-box' }}>
      <img src={url} alt={legenda || 'Foto da inspeção'} style={{ width: '100%', height: '250px', objectFit: 'contain', border: '1px solid #ddd', display: 'block', backgroundColor: '#f5f5f5' }} />
      {legenda && (
        <p className="text-[9px] text-gray-600 mt-1">{legenda}</p>
      )}
    </div>
  );
};

const ContentPage = ({ local, itensSlice, showHeader = true }) => {
  return (
    <div className={showHeader ? "p-4" : "px-4 pt-6 pb-4"}>
      {itensSlice && itensSlice.length > 0 && (
        <div>
          {showHeader && (
            <>
              <h3 className="text-lg font-bold mb-2 bg-blue-900 text-white p-2 text-center">Inspeção Física - Hidráulica</h3>
              <div className="mb-4 border border-black">
                <div className="p-2">
                  <span className="font-bold">Local: </span>{local.nome_local}
                </div>
              </div>
              <p className="text-[9px] text-gray-600 italic mb-1">Tique se for OK ✓, NA - Não se aplica. Caso contrário, faça um comentário.</p>
            </>
          )}
          <table className="w-full border-collapse text-xs table-fixed">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-2 text-left" style={{ width: '40%' }}>Descrição</th>
                <th className="border border-black p-2 text-center" style={{ width: '7%' }}>OK</th>
                <th className="border border-black p-2 text-center" style={{ width: '7%' }}>N/OK</th>
                <th className="border border-black p-2 text-center" style={{ width: '7%' }}>NA</th>
                <th className="border border-black p-2 text-left" style={{ width: '39%' }}>Comentários</th>
              </tr>
            </thead>
            <tbody>
              {itensSlice.map((item, idx) => {
                const isComentario = item.tipo === 'comentario';

                if (isComentario) {
                  return (
                    <tr key={idx} className="bg-gray-50 no-break-inside">
                      <td className="border border-black p-2 font-bold">Comentários:</td>
                      <td className="border border-black p-2" colSpan="4">{item.texto || ''}</td>
                    </tr>
                  );
                }

                if (item.showOnlyPhotos) {
                  return (
                    <tr key={idx}>
                      <td colSpan="5" className="border border-black p-2 pt-4">
                        <div className="text-xs text-gray-600 italic mb-2">{item.descricao}</div>
                        <div className="grid grid-cols-3 gap-2 photos-grid">
                          {item.fotos.map((foto, fotoIdx) => (
                            <FotoInspecao key={`${idx}-foto-${fotoIdx}-${foto.url}`} url={foto.url} legenda={foto.legenda} />
                          ))}
                        </div>
                      </td>
                    </tr>
                  );
                }

                return (
                  <>
                    <tr key={idx} className="no-break-inside">
                      <td className="border border-black p-2" style={{ width: '40%' }}>{item.descricao}</td>
                      <td className="border border-black p-2 text-center" style={{ width: '7%' }}>{item.resultado === 'OK' ? '☑' : '☐'}</td>
                      <td className="border border-black p-2 text-center" style={{ width: '7%' }}>{item.resultado === 'N/OK' ? '☑' : '☐'}</td>
                      <td className="border border-black p-2 text-center" style={{ width: '7%' }}>{item.resultado === 'NA' ? '☑' : '☐'}</td>
                      <td className="border border-black p-2" style={{ width: '39%' }}>{item.observacoes || ''}</td>
                    </tr>
                    {item.fotos && item.fotos.length > 0 && (
                      <tr key={`${idx}-fotos`}>
                        <td colSpan="5" className="border border-black p-2">
                          <div className="grid grid-cols-3 gap-2 photos-grid">
                            {item.fotos.map((foto, fotoIdx) => (
                              <FotoInspecao key={`item-${idx}-foto-${fotoIdx}-${foto.url}`} url={foto.url} legenda={foto.legenda} />
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
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
  const logoHorizontalCompressed = useCompressedImage("https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/4bd521d1e_LOGOHORIZONTAl.png", 400, 0.45);
  const isCover = pageNumber === 1;

  // Precise measurements for A4 portrait
  const PAGE_HEIGHT_MM = 297; // mm

  // Convert previous visual px heights to mm approximations for print.
  // 80px @96dpi ≈ 21.17mm, 45px @96dpi ≈ 11.9mm
  const HEADER_HEIGHT_MM = pageNumber > 1 ? 21.17 : 0;
  const FOOTER_HEIGHT_MM = 11.9;

  const headerHeight = `${HEADER_HEIGHT_MM}mm`;
  const footerHeight = `${FOOTER_HEIGHT_MM}mm`;

  // Content area should exactly fill the remaining space between header and footer
  const contentHeight = `calc(${PAGE_HEIGHT_MM}mm - ${HEADER_HEIGHT_MM}mm - ${FOOTER_HEIGHT_MM}mm)`;

  return (
    <div className="report-page" style={{ height: `${PAGE_HEIGHT_MM}mm` }}>
      {!isCover && (
        <div className="flex justify-between items-center border-b border-gray-200 bg-white" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: headerHeight, zIndex: 100, padding: '4px 8px', maxWidth: '210mm', boxSizing: 'border-box' }}>
          <img src={logoHorizontalCompressed} alt="Logo Interativa Engenharia" style={{ height: '32px', maxWidth: '120px', objectFit: 'contain' }} />
          <div className="text-right" style={{ flex: 1, paddingLeft: '8px', overflow: 'hidden' }}>
            <h2 className="text-[10px] font-bold text-gray-800 uppercase leading-tight truncate">{relatorio?.titulo_relatorio || 'INSPEÇÃO HIDRÁULICA'}</h2>
            <p className="text-[9px] text-gray-600 leading-tight truncate">{empreendimento?.nome_empreendimento}</p>
            <p className="text-[9px] font-medium text-gray-800 leading-tight">{relatorio?.data_inspecao ? format(new Date(relatorio.data_inspecao), 'dd/MM/yyyy', { locale: ptBR }) : ''}</p>
          </div>
        </div>
      )}

      <div className="page-content" style={{ paddingTop: headerHeight, paddingBottom: footerHeight, height: contentHeight, overflow: 'hidden', boxSizing: 'border-box' }}>
        {children}
      </div>

      <div className="border-t border-gray-200 bg-gray-50 flex justify-between items-center text-[9px] text-gray-500" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: footerHeight, padding: '4px 8px', maxWidth: '210mm', boxSizing: 'border-box' }}>
        <div className="flex-1 text-left leading-tight truncate" style={{ paddingRight: '8px' }}><span className="font-medium">Arquivo: </span><span>{relatorio.nome_arquivo ? `${relatorio.nome_arquivo}.pdf` : `IHID-${relatorio.id?.slice(-4)}.pdf`}</span></div>
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
      <div className="border border-black p-4 text-sm whitespace-pre-wrap min-h-[100px]">{observacoes || ''}</div>
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
          <p className="text-xs font-bold mb-2">1ª Vistoria</p>
          {opcoes.map(opcao => (
            <div key={opcao.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
              <span style={{ display: 'inline-block', width: '13px', height: '13px', minWidth: '13px', border: '1px solid #555', textAlign: 'center', lineHeight: '12px', fontSize: '11px', flexShrink: 0, backgroundColor: isConclusaoMatching(conclusaoR01, opcao.key) ? '#1d4ed8' : 'white', color: 'white' }}>
                {isConclusaoMatching(conclusaoR01, opcao.key) ? '✓' : ''}
              </span>
              <span className="text-xs">{opcao.label}</span>
            </div>
          ))}
        </div>
        <div style={{ flex: 1 }}>
          <p className="text-xs font-bold mb-2">2ª Vistoria</p>
          {opcoes.map(opcao => (
            <div key={opcao.key} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
              <span style={{ display: 'inline-block', width: '13px', height: '13px', minWidth: '13px', border: '1px solid #555', textAlign: 'center', lineHeight: '12px', fontSize: '11px', flexShrink: 0, backgroundColor: isConclusaoMatching(conclusaoR02, opcao.key) ? '#1d4ed8' : 'white', color: 'white' }}>
                {isConclusaoMatching(conclusaoR02, opcao.key) ? '✓' : ''}
              </span>
              <span className="text-xs">{opcao.label}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="p-3 text-xs bg-gray-50" style={{ border: '1px solid #ccc' }}>
        <p className="font-bold mb-1">Observação:</p>
        <p>Em caso de sistema não aprovado com totalidade na 1º vistoria, a inspeção deverá ser refeita para confirmação de correções apontadas nas Observações Gerais deste relatório.</p>
      </div>
    </div>
  );
};

const ReportContent = ({ relatorio, empreendimento, navigate }) => {
  const [isPrintingMode, setIsPrintingMode] = useState(false);

  const hasDocumentacao = relatorio.itens_documentacao && relatorio.itens_documentacao.length > 0;
  const hasAssinaturas = relatorio.assinaturas && relatorio.assinaturas.length > 0 &&
    relatorio.assinaturas.some(ass => ass.assinatura_imagem && ass.assinatura_imagem.trim() !== '');

  const paginateLocalItems = (local) => paginateLocalItemsForPrinting(local, {
    pageHeightPx: 1122,
    headerHeightPx: 80,
    footerHeightPx: 45,
    pagePaddingPx: 12,
    footerGuardPx: 16,
    breakBeforeLimitPx: 20,
    itemBufferPx: 10,
    photoMaxHeightPx: 250,
    maxPhotosPerItem: 6,
    splitPhotoRows: true,
    photoChunkSize: 3,
  }).map((page) => ({
    ...page,
    isFirst: page.isFirstPageOfLocal,
  }));

  const contentPages = (relatorio.locais && relatorio.locais.length > 0)
    ? relatorio.locais.flatMap((local) => paginateLocalItems(local))
    : [];

  const totalPages = 1 + (hasDocumentacao ? 1 : 0) + contentPages.length + 1 + (hasAssinaturas ? 1 : 0);
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
          <h1 className="text-xl font-semibold text-gray-800">Visualizar Inspeção Hidráulica</h1>
          <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700 text-white"><Printer className="w-4 h-4 mr-2" />Gerar PDF</Button>
        </div>
      </div>
      <div className="report-container max-w-4xl mx-auto" style={{ padding: 0 }}>
        <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
          <CoverPage relatorio={relatorio} empreendimento={empreendimento} />
        </ReportPageLayout>

        {hasDocumentacao && (
          <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
            <DocumentacaoPage itens={relatorio.itens_documentacao} comentarios={relatorio.comentarios_documentacao} />
          </ReportPageLayout>
        )}

        {contentPages.map((page, index) => (
          <ReportPageLayout key={index} pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
            <ContentPage
              local={page.local}
              itensSlice={page.items}
              showHeader={page.isFirst}
            />
          </ReportPageLayout>
        ))}

        <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
          <ObservacoesGeraisPage observacoes={relatorio.observacoes_gerais} />
          <ConclusaoPage conclusaoR01={relatorio?.conclusao_r01} conclusaoR02={relatorio?.conclusao_r02} />
        </ReportPageLayout>

        {hasAssinaturas && (
          <ReportPageLayout pageNumber={currentPage++} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
            <AssinaturasPage assinaturas={relatorio.assinaturas} />
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
                      /* Ensure each report page is clipped to A4 when printing */
                      page-break-inside: avoid !important;
                      width: 210mm !important; 
                      height: 297mm !important; 
                      margin: 0 !important; 
                      padding: 0 !important; 
                      box-shadow: none !important; 
                      overflow: hidden !important;
                      -webkit-transform: translateZ(0);
                    }

                    /* Avoid breaking rows and photo groups across pages */
                    .no-break-inside {
                      page-break-inside: avoid !important;
                      break-inside: avoid !important;
                      -webkit-column-break-inside: avoid !important;
                      -moz-column-break-inside: avoid !important;
                    }

                    /* Make the photo grid an atomic block so browser will move it to next page if it doesn't fit */
                    .photos-grid {
                      page-break-inside: avoid !important;
                      break-inside: avoid !important;
                      -webkit-column-break-inside: avoid !important;
                      -moz-column-break-inside: avoid !important;
                      margin-bottom: 12mm; /* safe space for footer */
                      display: grid;
                      grid-template-columns: repeat(3, 1fr);
                      gap: 8px;
                    }

                    .photos-grid > div {
                      page-break-inside: avoid !important;
                      break-inside: avoid !important;
                    }

                    .photos-grid img {
                      width: 100%;
                      max-width: 100%;
                      height: auto !important;
                      max-height: 66mm !important;
                      object-fit: contain;
                      display: block;
                      border: 1px solid #ddd;
                    }

                    /* Ensure content area reserves space for footer on print */
                    .page-content { padding-bottom: 11.9mm !important; box-sizing: border-box !important; overflow: hidden !important; }
                    
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

export default function VisualizarInspecaoHidraulica() {
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
        const relatorioData = await InspecaoHidraulica.get(relatorioId);
        if (!relatorioData) throw new Error("Relatório não encontrado.");

        const empreendimentoData = await Empreendimento.get(relatorioData.id_empreendimento);
        if (!empreendimentoData) throw new Error("Empreendimento associado não encontrado.");

        // Comprimir as imagens do relatório ANTES de renderizar
        const compressedRelatorio = await compressReportImages(relatorioData);

        setRelatorio(compressedRelatorio);
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