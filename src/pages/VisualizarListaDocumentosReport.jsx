import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ListaDocumentosReport, Empreendimento } from '@/api/entities';
import { ArrowLeft, Loader2, AlertTriangle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { paginateItemsByCount } from '@/lib/reportPagination';

const redColor = '#CE2D2D';

// Formata datas aceitando vários formatos e evitando "Invalid Date"
const formatDate = (value) => {
  if (!value) return '';
  try {
    let d;
    if (typeof value === 'number') {
      d = new Date(value);
    } else if (typeof value === 'string') {
      // ISO date (YYYY-MM-DD) -> normalizar adicionando horário
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) d = new Date(value + 'T00:00:00');
      // dd/mm/yyyy
      else if (/^\d{2}\/\d{2}\/\d{4}$/.test(value)) {
        const [dd, mm, yyyy] = value.split('/');
        d = new Date(`${yyyy}-${mm}-${dd}T00:00:00`);
      } else {
        d = new Date(value);
      }
    } else {
      d = new Date(value);
    }

    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR');
  } catch (e) {
    return '';
  }
};

// Hook para comprimir imagens ao carregar
const useCompressedImage = (imageUrl, maxSize = 1200, quality = 0.8) => {
  const [compressedUrl, setCompressedUrl] = React.useState(imageUrl);

  React.useEffect(() => {
    if (!imageUrl || imageUrl.startsWith('data:')) {
      setCompressedUrl(imageUrl);
      return;
    }

    const compressImage = async (blob) => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target.result;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            const maxWidth = maxSize;
            const maxHeight = maxSize;

            if (width > height) {
              if (width > maxWidth) {
                height *= maxWidth / width;
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width *= maxHeight / height;
                height = maxHeight;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
              (blob) => resolve(URL.createObjectURL(blob)),
              'image/jpeg',
              quality
            );
          };
        };
      });
    };

    fetch(imageUrl)
      .then(r => r.blob())
      .then(blob => compressImage(blob))
      .then(url => setCompressedUrl(url))
      .catch(() => setCompressedUrl(imageUrl));
  }, [imageUrl, maxSize, quality]);

  return compressedUrl;
};

const translations = {
  pt: {
    back: "Voltar",
    print: "Gerar PDF",
    loading: "Carregando relatório...",
    errorTitle: "Erro ao Carregar Relatório",
  },
  en: {
    back: "Back",
    print: "Generate PDF",
    loading: "Loading report...",
    errorTitle: "Error Loading Report",
  }
};

const CoverPage = ({ documento, empreendimento }) => {
  const year = new Date().getFullYear();
  const coverFrameUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/dca667b3d_erasebg-transformed.png";
  const redDecorativeElementUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/513d57969_Designsemnome2.png';
  const bottomRightFrameUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/10e9b2570_erasebg-transformed.png';
  const logoInterativaUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/1a0999f3c_logo_Interativa_letra_branca_sem_fundo_gg.png";
  const logoInterativaBrancoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/22086ec44_LOGOPNG-branco.png";

  const empreendimentoImageUrl = empreendimento?.foto_empreendimento || 'https://images.unsplash.com/photo-1519947486511-46149fa0a254?w=800&q=80';

  return (
    <div className="report-page relative w-full h-full bg-white font-sans overflow-hidden" style={{ margin: 0, padding: 5 }}>
      <div
        className="absolute w-full h-full bg-center bg-no-repeat z-10 cover-background-image"
        style={{
          backgroundImage: `url(${empreendimentoImageUrl})`,
          backgroundSize: 'cover',
          opacity: 0.2,
          top: '-10px',
          left: '-10px',
          width: 'calc(100% + 20px)',
          height: 'calc(100% + 20px)',
        }}
      />

      <div
        className="absolute top-0 left-0 w-full h-full bg-contain bg-left-top bg-no-repeat z-20"
        style={{
          backgroundImage: `url(${coverFrameUrl})`,
          height: '150%',
        }}
      />

      <div
        className="absolute z-50"
        style={{
          top: '25px',
          left: '11px',
          width: '350px',
          height: '170px',
        }}
      >
        <img
          src={logoInterativaUrl}
          alt="Logo Interativa"
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="80"><rect fill="%23f3f4f6" width="100%" height="100%"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23666" font-size="14">Imagem indisponível</text></svg>'; }}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
          }}
        />
      </div>

      <div
        className="absolute flex items-center justify-center z-40"
        style={{
          top: '23%', left: '11%', width: '22.7%', height: '25%',
          transform: 'rotate(27deg)',
        }}
      >
        <span className="font-normal" style={{ fontSize: '60px', fontFamily: "'Inter', sans-serif", textShadow: '2px 2px 4px rgba(0,0,0,0.2)', color: 'white' }}>
          {year}
        </span>
      </div>

      <div className="absolute z-30" style={{ top: '10%', right: '8%', width: '50%', textAlign: 'right' }}>
        <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: '64px', fontWeight: 'bold', color: '#394557', lineHeight: '1.1', marginBottom: '4px' }}>
          RELATÓRIO
        </h1>
        <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: '29.5px', color: redColor, letterSpacing: '4px' }}>
          LISTA DE DOCUMENTOS
        </h2>
      </div>

      <div className="absolute z-30" style={{ top: '50%', right: '2%', width: '40%', padding: '1.3% 2.5%', textAlign: 'center' }}>
        <h1 className="font-black uppercase" style={{ fontSize: '28px', lineHeight: '1.0', fontFamily: "'Inter', sans-serif", marginBottom: '5px', color: 'black' }}>
          GERENCIAMENTO DE OBRA
        </h1>
      </div>

      <div
        className="absolute z-20"
        style={{
          top: '-350px', right: '-30%', width: '1700px', height: '1150px',
          backgroundColor: redColor,
          WebkitMaskImage: `url(${redDecorativeElementUrl})`,
          maskImage: `url(${redDecorativeElementUrl})`,
          WebkitMaskSize: '100% 100%', maskSize: '100% 100%',
          WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center', maskPosition: 'center',
        }}
      />

      <div
        className="absolute z-50"
        style={{
          top: '-10%', right: '-20%', width: '1800px', height: '800px',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
      >
        <img
          src={logoInterativaBrancoUrl}
          alt="Logo Interativa"
          onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="80"><rect fill="%23f3f4f6" width="100%" height="100%"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23666" font-size="14">Imagem indisponível</text></svg>'; }}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>

      <div
        className="absolute right-0 w-full h-full bg-no-repeat z-40"
        style={{
          bottom: '-5%',
          backgroundImage: `url('${bottomRightFrameUrl}')`,
          height: '1000%', backgroundSize: '230% auto', backgroundPosition: '65% 100%',
        }}
      />

      <div
        className="absolute z-10"
        style={{
          bottom: '0%', left: '0%', width: '450px', height: '800px',
          borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          clipPath: 'polygon(0 0%, 100% 23%, 100% 100%, 0% 100%)'
        }}
      >
        <img
          src={empreendimentoImageUrl}
          alt={empreendimento?.nome_empreendimento || 'Foto do empreendimento'}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      <div className="absolute flex items-center justify-center z-50" style={{ bottom: '0', left: '0', right: '0', height: '65px', backgroundColor: redColor, clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 5% 100%)', paddingLeft: '15%', paddingRight: '5%' }}>
        <span className="text-white w-full" style={{ fontSize: '32px', letterSpacing: '1px', fontWeight: 'normal', fontFamily: 'Poppins', textAlign: 'center', lineHeight: '1.2' }}>
          {empreendimento?.nome_empreendimento || 'Empreendimento'}
        </span>
      </div>
    </div>
  );
};

const ReportPage = ({ children, pageNumber, totalPages, documento, empreendimento, isLastPage }) => {
  const logoHorizontalUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/4bd521d1e_LOGOHORIZONTAl.png";
  const HEADER_HEIGHT = '80px';
  const FOOTER_HEIGHT = '60px';

  return (
    <div className={`report-page w-full relative bg-white`}>
      {pageNumber > 1 && (
        <div
          className="flex justify-between items-center p-4 border-b border-gray-200"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_HEIGHT }}
        >
          <img src={logoHorizontalUrl} alt="Logo Interativa Engenharia" className="h-12" />
          <div className="text-right">
            <h2 className="text-sm font-bold text-gray-800 uppercase">
              LISTA DE DOCUMENTOS
            </h2>
            <p className="text-xs text-gray-600">
              {empreendimento?.nome_empreendimento}
            </p>
            <p className="text-xs font-medium text-gray-800 mt-1">
              {formatDate(documento?.data_aviso)}
            </p>
          </div>
        </div>
      )}

      <div
        className="overflow-hidden"
        style={{
          paddingTop: pageNumber > 1 ? HEADER_HEIGHT : '0px',
          paddingBottom: pageNumber > 1 ? `calc(${FOOTER_HEIGHT} + 15px)` : '0px',
        }}
      >
        {children}
      </div>

      {pageNumber > 1 && (
        <div
          className="px-3 py-2 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-xs text-gray-500"
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: FOOTER_HEIGHT }}
        >
          <div className="flex-1 text-left">
            <span className="font-medium">Arquivo:</span>
            <br />
            <span>{documento?.numero_documento || 'N/A'}</span>
          </div>
          <div className="flex-1 flex flex-col items-center">
            <span>INTERATIVA ENGENHARIA</span>
            <span>www.interativaengenharia.com.br</span>
          </div>
          <div className="flex-1 text-right">
            <span>Página {pageNumber} de {totalPages}</span>
          </div>
        </div>
      )}
    </div>
  );
};

const ContentPage = ({ documento, documentosPagina, isFirstPage, isLastPage }) => {
  return (
    <div className="px-12 py-6">
      {isFirstPage && (
        <>
          <h2 className="text-2xl font-bold mb-6 text-gray-900">{documento.titulo || 'LISTA DE DOCUMENTOS'}</h2>

          {documento.cliente && (
            <div className="mb-4">
              <p className="text-sm"><strong>Cliente:</strong> {documento.cliente}</p>
            </div>
          )}

          {documento.empreendimento && (
            <div className="mb-4">
              <p className="text-sm"><strong>Empreendimento:</strong> {documento.empreendimento}</p>
            </div>
          )}

          {documento.revisao && (
            <div className="mb-4">
              <p className="text-sm"><strong>Revisão:</strong> {documento.revisao}</p>
            </div>
          )}

          {documento.data_aviso && (
            <div className="mb-6">
              <p className="text-sm"><strong>Data:</strong> {formatDate(documento.data_aviso) || '-'}</p>
            </div>
          )}
        </>
      )}

      {documentosPagina && documentosPagina.length > 0 && (
        <div className="mb-8">
          {!isFirstPage && <h3 className="text-lg font-bold mb-4 bg-gray-100 p-2">Documentos</h3>}
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-300 p-2 text-left text-sm font-semibold">Código</th>
                <th className="border border-gray-300 p-2 text-left text-sm font-semibold">Rev</th>
                <th className="border border-gray-300 p-2 text-left text-sm font-semibold">Título</th>
                <th className="border border-gray-300 p-2 text-left text-sm font-semibold">Observações</th>
              </tr>
            </thead>
            <tbody>
              {documentosPagina.map((doc, idx) => (
                <tr key={idx}>
                  <td className="border border-gray-300 p-2 text-sm">{doc.codigo || '-'}</td>
                  <td className="border border-gray-300 p-2 text-sm">{doc.rev || '-'}</td>
                  <td className="border border-gray-300 p-2 text-sm">{doc.titulo || '-'}</td>
                  <td className="border border-gray-300 p-2 text-sm" style={{ wordBreak: 'break-word', whiteSpace: 'normal', maxWidth: '200px' }}>{doc.observacoes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isFirstPage && !documentosPagina?.length && (
        <h3 className="text-lg font-bold mb-4 bg-gray-100 p-2">Documentos</h3>
      )}

      {isLastPage && documento.assinaturas && documento.assinaturas.length > 0 && documentosPagina.length > 0 && (
        <div className="mt-8 pt-6 border-t border-gray-300">
          <h3 className="text-sm font-bold mb-6">Assinaturas</h3>
          <div className="grid grid-cols-2 gap-8">
            {documento.assinaturas.map((ass, idx) => (
              <div key={idx} className="text-center">
                {ass.assinatura_imagem ? (
                  <img
                    src={ass.assinatura_imagem}
                    alt={`Assinatura ${ass.parte || ass.nome}`}
                    className="w-full h-24 object-contain mb-2"
                  />
                ) : (
                  <div className="border-b border-gray-400 h-6 mb-2"></div>
                )}
                <p className="text-xs font-semibold mt-2">{ass.parte || 'Signatário'}</p>
                {ass.nome && <p className="text-xs text-gray-600">{ass.nome}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function VisualizarListaDocumentosReport() {
  const navigate = useNavigate();
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const documentoId = urlParams.get('documentoId');

  const [documento, setDocumento] = useState(null);
  const [empreendimento, setEmpreendimento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'pt');

  const t = translations[language];

  useEffect(() => {
    const handleLanguageChange = () => setLanguage(localStorage.getItem('language') || 'pt');
    window.addEventListener('language-change', handleLanguageChange);
    return () => window.removeEventListener('language-change', handleLanguageChange);
  }, []);

  useEffect(() => {
    if (documentoId) {
      loadData();
    }
  }, [documentoId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const docData = await ListaDocumentosReport.get(documentoId);
      setDocumento(docData);

      if (docData && docData.id_empreendimento) {
        const empData = await Empreendimento.get(docData.id_empreendimento);
        setEmpreendimento(empData);
      }
    } catch (err) {
      console.error("Erro ao carregar documento:", err);
      setError("Erro ao carregar o relatório");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <Loader2 className="h-12 w-12 animate-spin mb-4" style={{ color: redColor }} />
        <p className="text-gray-600 text-lg">{t.loading}</p>
      </div>
    );
  }

  if (error || !documento) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-600 mb-4">{t.errorTitle}</h2>
          <p className="text-gray-700 mb-6">{error || "Documento não encontrado"}</p>
          <Button onClick={() => navigate(-1)} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> {t.back}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="print:hidden bg-white border-b sticky top-0 z-10 px-6 py-4">
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.back}
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            {t.print}
          </Button>
        </div>
      </div>

      <div className="report-container max-w-4xl mx-auto" style={{ padding: 0 }}>
        {/* Capa */}
        <div className="report-page relative w-full bg-white font-sans overflow-hidden">
          <CoverPage documento={documento} empreendimento={empreendimento} />
        </div>

        {/* Conteúdo - Paginado a cada 10 documentos */}
        {documento?.documentos && documento.documentos.length > 0 && (
          (() => {
            const paginasConteudo = [];
                const documentosPaginas = paginateItemsByCount(documento.documentos, { perPageCount: 10 });
                const totalPages = 1 + documentosPaginas.length;
                documentosPaginas.forEach((documentosPagina, pageIndex) => {
                  const isFirstPage = pageIndex === 0;
                  const isLastPage = pageIndex === documentosPaginas.length - 1;
                  const pageNumber = 2 + pageIndex;

              paginasConteudo.push(
                <ReportPage
                  key={`page-${pageNumber}`}
                  pageNumber={pageNumber}
                  totalPages={totalPages}
                  documento={documento}
                  empreendimento={empreendimento}
                  isLastPage={isLastPage}
                >
                  <ContentPage documento={documento} documentosPagina={documentosPagina} isFirstPage={isFirstPage} isLastPage={isLastPage} />
                </ReportPage>
              );
            });
            return paginasConteudo;
          })()
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@700&family=Poppins:wght@100;200;300;400;500;600;700;800;900&display=swap');
        
        .cover-background-image {
          background-position: center 15% !important;
        }
        
        .report-page {
          width: 210mm;
          height: 297mm;
          margin: 0;
          padding: 0;
          background: white;
          position: relative;
          overflow: hidden;
        }

        @media print {
          .print\\:hidden { display: none !important; }
          .report-page {
            width: 210mm;
            height: 297mm;
            margin: 0 !important;
            padding: 0;
            overflow: hidden;
            box-shadow: none;
          }
          .report-page:not(:last-child) {
            page-break-after: always;
            page-break-inside: avoid;
          }
          .report-page:last-child { 
            page-break-after: avoid;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-family: 'Poppins', 'Inter', sans-serif;
          }
          @page { size: A4; margin: 0; }
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
}