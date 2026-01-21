import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { RespostaVistoria } from '@/api/entities';
import { FormularioVistoria as FormularioVistoriaEntity } from '@/api/entities';
import { Empreendimento } from '@/api/entities';
import { UnidadeEmpreendimento } from '@/api/entities';
import { User } from '@/api/entities';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { ArrowLeft, Loader2, AlertTriangle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import EnviarEmailDialog from '@/components/relatorios/EnviarEmailDialog';

// Standardized colors as per request
const redColor = '#CE2D2D';
const blueColor = '#2A3E84';
const grayColor = '#808080';

// Função para comprimir imagens usando Canvas API
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
      console.warn(`Failed to load or compress image: ${url}. Returning original URL.`);
      resolve(url);
    };
    
    img.src = url;
  });
};

// Hook para comprimir imagens
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

const toRoman = (num) => {
  if (isNaN(num) || num <= 0) return '';
  const values = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const symbols = ['M', 'CM', 'D', 'CD', 'C', 'XC', 'L', 'XL', 'X', 'IX', 'V', 'IV', 'I'];
  let result = '';

  for (let i = 0; i < values.length; i++) {
    while (num >= values[i]) {
      result += symbols[i];
      num -= values[i];
    }
  }
  return result;
};

const isValidId = (id) => id && String(id).trim() !== '' && !['null', 'undefined'].includes(String(id).toLowerCase());

const colorMapping = {
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    blue: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
    gray: 'bg-gray-100 text-gray-800',
};

const getStatusBadgeClassFromColor = (color) => {
    return colorMapping[color] || colorMapping['gray'];
};


const translations = {
  pt: {
    title: "Relatório de Vistoria",
    loading: "Carregando relatório...",
    loadingReport: "Carregando relatório...",
    errorTitle: "Erro ao Carregar Relatório",
    back: "Voltar",
    print: "Imprimir",
    projectData: "Dados do Projeto",
    formNotFound: (formId) => `O modelo de formulário (ID: ${formId}) associado a esta vistoria não foi encontrado ou está vazio. Não é possível gerar o relatório.`,
    notApplicable: "N/A",
  },
  en: {
    title: "Inspection Report",
    loading: "Loading report...",
    loadingReport: "Loading report...",
    errorTitle: "Error Loading Report",
    back: "Back",
    print: "Print",
    projectData: "Project Data",
    formNotFound: (formId) => `The form template (ID: ${formId}) associated with this inspection was not found or is empty. The report cannot be generated.`,
    notApplicable: "N/A",
  }
};

const ReportPage = ({ children, pageNumber, totalPages, vistoria, unidade, empreendimento, pdfMode }) => {
  const logoHorizontalOriginalUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/4bd521d1e_LOGOHORIZONTAl.png";
  const logoHorizontalCompressed = useCompressedImage(logoHorizontalOriginalUrl, 400, 0.7); 
  const HEADER_HEIGHT = '80px';
  const FOOTER_HEIGHT = '45px';

  return (
    <div className={`report-page w-full relative bg-white ${pdfMode ? 'pdf-mode' : ''}`}>
      {pageNumber > 1 && (
        <div
          className="flex justify-between items-center p-4 border-b border-gray-200"
          style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HEADER_HEIGHT }}
        >
          <img src={logoHorizontalCompressed} alt="Logo Interativa Engenharia" className="h-12" />
          <div className="text-right">
            <h2 className="text-sm font-bold text-gray-800 uppercase">
              {vistoria?.nome_vistoria || "RELATÓRIO DE VISTORIA"}
            </h2>
            <p className="text-xs text-gray-600">
              {empreendimento?.nome_empreendimento} - {unidade?.unidade_empreendimento}
            </p>
            <p className="text-xs font-medium text-gray-800 mt-1">
                {vistoria?.data_vistoria ? format(new Date(vistoria.data_vistoria), 'dd/MM/yyyy', { locale: pt }) : ''}
            </p>
          </div>
        </div>
      )}

      <div
        className="overflow-hidden"
        style={{
          paddingTop: pageNumber > 1 ? HEADER_HEIGHT : '0px',
          paddingBottom: pageNumber > 1 ? FOOTER_HEIGHT : '0px',
        }}
      >
        {children}
      </div>

      {pageNumber > 1 && (
        <div
          className="px-3 py-1 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-xs text-gray-500"
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: FOOTER_HEIGHT }}
        >
            <div className="flex-1 text-left">
              <span className="font-medium">Arquivo:</span>
              <br/>
              <span>{vistoria?.nome_arquivo || 'N/A'}</span>
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

const CoverPage = ({ vistoria, unidade, empreendimento, items, t, pdfMode }) => {
  const year = new Date(vistoria?.data_vistoria || Date.now()).getFullYear();
  const coverFrameOriginalUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/dca667b3d_erasebg-transformed.png";
  const redDecorativeElementUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/513d57969_Designsemnome2.png';
  const bottomRightFrameUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/10e9b2570_erasebg-transformed.png';

  const empreendimentoRawImageUrl = empreendimento?.foto_empreendimento
    || 'https://images.unsplash.com/photo-1519947486511-46149fa0a254?w=800&q=80';

  const empreendimentoImageUrl = empreendimentoRawImageUrl;
  const logoInterativaUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/1a0999f3c_logo_Interativa_letra_branca_sem_fundo_gg.png";
  const logoInterativaBrancoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/22086ec44_LOGOPNG-branco.png";
  const coverFrameUrl = coverFrameOriginalUrl;
  const redDecorativeElementUrlOriginal = redDecorativeElementUrl;
  const bottomRightFrameUrlOriginal = bottomRightFrameUrl;

  const responsaveis = [
    empreendimento?.cli_empreendimento,
    empreendimento?.nome_empreendimento
  ].filter(Boolean).join(' | ');

  const formatResponsaveis = (text) => {
    if (!text) return 'Clientes';
    return text;
  };

  const getTextStyle = (text) => {
    const len = text ? text.length : 0;
    if (len <= 25) return { fontSize: '32px', letterSpacing: '1px', fontWeight: 'normal' };
    if (len <= 40) return { fontSize: '26px', letterSpacing: '0.8px', fontWeight: 'normal' };
    return { fontSize: '20px', letterSpacing: '0.5px', fontWeight: 'normal' };
  };

  const textStyle = getTextStyle(responsaveis);

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
          VISTORIA DE OBRA
        </h2>
      </div>

      <div className="absolute z-30" style={{ top: '50%', right: '2%', width: '40%', padding: '1.3% 2.5%', textAlign: 'center' }}>
        <h1 className="font-black uppercase" style={{ fontSize: '28px', lineHeight: '1.0', fontFamily: "'Inter', sans-serif", marginBottom: '5px', color: 'black' }}>
          {unidade?.cliente_unidade || 'Locatário'}
        </h1>
        <h2 className="text-gray-600 font-medium" style={{ fontSize: '16px', fontFamily: "'Inter', sans-serif" }}>
          {unidade?.unidade_empreendimento || 'Unidade'}
        </h2>
      </div>

      <div
          className="absolute z-20"
          style={{
              top: '-350px', right: '-30%', width: '1700px', height: '1150px',
              backgroundColor: redColor,
              WebkitMaskImage: `url(${redDecorativeElementUrlOriginal})`,
              maskImage: `url(${redDecorativeElementUrlOriginal})`,
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
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
        />
      </div>

      <div
        className="absolute right-0 w-full h-full bg-no-repeat z-40"
        style={{
          bottom: '-5%',
          backgroundImage: `url('${bottomRightFrameUrlOriginal}')`,
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
        <span className="text-white w-full" style={{ ...textStyle, fontFamily: 'Poppins', textAlign: 'center', lineHeight: '1.2' }}>
          {formatResponsaveis(responsaveis)}
        </span>
      </div>
    </div>
  );
};

const CompressedPhoto = ({ url, legenda, index }) => {
  const [compressedUrl, setCompressedUrl] = useState(url);
  
  useEffect(() => {
    if (url && typeof url === 'string' && url.startsWith('http') && !url.startsWith('data:image')) {
      compressImage(url, 500, 0.5).then(setCompressedUrl);
    }
  }, [url]); 
  
  return (
    <div className="text-center break-inside-avoid photo-item-print">
      <img
        src={compressedUrl}
        alt={legenda || `Foto ${index}`}
        className="w-full h-96 object-cover rounded border photo-img-print"
      />
      {legenda && (
        <p className="text-xs mt-1 font-medium text-black">
          {legenda}
        </p>
      )}
    </div>
  );
};

const CompressedSignatureImage = ({ url, alt, className, pdfMode }) => {
  return <img src={url} alt={alt} className={className} />;
};

const QRCodesPage = ({ allItems, vistoria, pdfMode }) => {
  const allPhotos = [];
  allItems.forEach((item) => {
    if (item.foto && Array.isArray(item.foto)) {
      item.foto.forEach((foto) => {
        if (foto && foto.url) {
          allPhotos.push({
            url: foto.url,
            legenda: foto.legenda || 'Sem legenda',
            secao: item.secao || 'Sem Seção',
          });
        }
      });
    }
  });

  if (allPhotos.length === 0) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Galeria de Imagens</h2>
        <p className="text-gray-600">Nenhuma imagem encontrada neste relatório.</p>
      </div>
    );
  }

  const galleryUrl = `${window.location.origin}${createPageUrl(`GaleriaRelatorio?respostaId=${vistoria.id}`)}`;
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

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
          <p><strong>Escaneie o QR Code</strong> para acessar a galeria completa com todas as imagens do relatório em alta resolução.</p>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg text-left">
          <p className="text-xs font-semibold text-gray-700 mb-2">Link da galeria:</p>
          <p className="text-xs text-gray-600 break-all">
            {galleryUrl}
          </p>
        </div>
      </div>
    </div>
  );
};

const DadosEmpreendimentoPage = ({ vistoria, empreendimento, unidade, t, formulario, pdfMode }) => (
  <div className="px-4 py-2 flex flex-col" style={{ minHeight: 'calc(297mm - 125px)' }}>
    <div>
      <div className="w-full mb-4">
        <div className="text-base font-bold text-white p-3 rounded-md text-center" style={{ backgroundColor: blueColor }}>
          <span>DADOS DO PROJETO</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-8 gap-y-4 p-4 text-sm" style={{ border: '1px solid #e2e8f0', borderRadius: '0.375rem' }}>
        <div>
          <p className="font-semibold text-gray-700">Empreendimento:</p>
          <span>{empreendimento?.nome_empreendimento || t.notApplicable}</span>
        </div>
        <div>
          <p className="font-semibold text-gray-700">Administradora:</p>
          <span>{empreendimento?.cli_empreendimento || t.notApplicable}</span>
        </div>
        <div>
          <p className="font-semibold text-gray-700">Unidade/Conjunto:</p>
          <span>{unidade?.unidade_empreendimento || t.notApplicable}</span>
        </div>
        <div>
          <p className="font-semibold text-gray-700">Locatário:</p>
          <span>{unidade?.cliente_unidade || t.notApplicable}</span>
        </div>
        <div>
          <p className="font-semibold text-gray-700">Data da Vistoria:</p>
          <span>{vistoria?.data_vistoria ? format(new Date(vistoria.data_vistoria), "dd/MM/yyyy", { locale: pt }) : t.notApplicable}</span>
        </div>
        <div>
          <p className="font-semibold text-gray-700">Data do Relatório:</p>
          <span>{vistoria?.data_relatorio ? format(new Date(vistoria.data_relatorio), "dd/MM/yyyy", { locale: pt }) : format(new Date(), "dd/MM/yyyy", { locale: pt })}</span>
        </div>
        <div className="col-span-2">
          <p className="font-semibold text-gray-700">Resp. Gerência:</p>
          <span>Engª Valéria Rodrigues</span>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {(vistoria?.texto_os_proposta && vistoria.texto_os_proposta.trim() !== '') && (
          <div>
            <strong className="text-gray-600 block mb-2">Contrato:</strong>
            <p className="bg-gray-50 p-3 rounded-md border text-gray-700 whitespace-pre-wrap">
              {vistoria.texto_os_proposta}
            </p>
          </div>
        )}

        {(vistoria?.texto_escopo_consultoria && vistoria.texto_escopo_consultoria.trim() !== '') && (
          <div>
            <strong className="text-gray-600 block mb-2">Escopo de consultoria:</strong>
            <div className="bg-gray-50 p-3 rounded-md border text-gray-700">
              <div className="whitespace-pre-wrap">
                {vistoria.texto_escopo_consultoria}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
    
    <div className="flex-grow flex items-end justify-center pb-24">
      <div className="text-center text-sm">
        <p><strong>Consultoria Técnica:</strong></p>
        <p>{formulario?.consultor_responsavel || vistoria?.consultor_responsavel || t.notApplicable}</p>
      </div>
    </div>
  </div>
);

const getStatusBadgeClass = (status, color) => {
  if (color && colorMapping[color]) {
    return colorMapping[color];
  }
  switch (String(status || '').toLowerCase().trim()) {
    case 'finalizado':
    case 'conforme':
    case 'liberado para ocupação':
    case 'concluído':
      return 'bg-green-100 text-green-800';
    case 'não conforme':
    case 'nao conforme':
    case 'não liberado para ocupação':
    case 'nao liberado para ocupação':
      return 'bg-red-100 text-red-800';
    case 'pendente':
      return 'bg-yellow-100 text-yellow-800';
    case 'em andamento':
    case 'andamento':
      return 'bg-blue-100 text-blue-800';
    case 'informativo':
      return 'bg-purple-100 text-purple-800';
    case 'assinado':
      return 'bg-purple-100 text-purple-800';
    case 'não aplicável':
    case 'nao aplicavel':
    case 'não se aplica':
    case 'nao se aplica':
      return 'bg-gray-100 text-gray-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const ContentPage = ({ items, observacoes, sectionOriginalOrder, disciplineStats, sectionsToRenderObservationsOnThisPage, pdfMode, sectionNumberMap }) => {
  return (
    <div className="px-4 py-2" style={{ minHeight: 'calc(297mm - 140px)' }}>
      {items.length === 0 && <p className="text-center text-gray-500">Nenhum item para exibir nesta página.</p>}
      {items.length > 0 && items.map(({ secaoName, items: itensSecao, globalIndex }) => {
        const displayName = secaoName;
        const sectionObservation = observacoes && observacoes[secaoName];
        const isStatusSection = displayName.includes("STATUS") || displayName.includes("Status");
        const sectionNumber = sectionNumberMap?.[globalIndex] ?? (globalIndex + 1);
        
        return (
          <div key={secaoName} className="mb-4 break-inside-avoid">
            <div className="w-full mb-4">
              <div className="text-base font-bold text-white p-3 rounded-md" style={{ backgroundColor: blueColor }}>
                <span>{`${sectionNumber}. ${displayName}`}</span>
              </div>
            </div>

            {sectionsToRenderObservationsOnThisPage.has(secaoName) && sectionObservation && sectionObservation.trim() !== '' && 
              <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 break-inside-avoid">
                <strong className="text-yellow-800">Observação da seção:</strong>
                <p className="mt-1 text-yellow-700">{sectionObservation}</p>
              </div>
            }

            <table className="w-full border-collapse border border-gray-300 text-xs mb-6">
              <thead>
                <tr className="bg-gray-100">
                  {isStatusSection ? (
                    <th className="border border-gray-300 p-2 text-left">Seção</th>
                  ) : (
                    <>
                      <th className="border border-gray-300 p-2 text-left">Seção</th>
                      <th className="border border-gray-300 p-2 text-center w-56">Status/Resposta</th>
                    </>
                    )}
                    </tr>
                    </thead>
                    <tbody className="break-inside-avoid">
                    {itensSecao.map((item) => {
                    const hasDetails = (!item.isContinuation && item.observacao && item.observacao.trim() !== '' && item.observacao.trim() !== '-') || (item.foto && item.foto.length > 0);

                    return (
                    <React.Fragment key={item.uniqueId}>
                      <tr className="break-inside-avoid">
                        {isStatusSection ? (
                          <td className="border border-gray-300 p-2 align-middle text-left">
                            <div>
                              <p className="text-xs font-medium mb-2">{item.pergunta}</p>
                              {item.assinatura ? (
                                <CompressedSignatureImage
                                  url={item.assinatura}
                                  alt="Assinatura"
                                  className="max-w-32 max-h-6 object-contain"
                                  pdfMode={pdfMode}
                                />
                              ) : (
                                item.resposta && item.resposta !== '-' && 
                                  <span className={`px-2 py-1 rounded text-xs font-medium whitespace-pre-wrap ${getStatusBadgeClass(item.resposta, item.cor)}`}>
                                    {item.resposta}
                                  </span>
                              )}
                            </div>
                          </td>
                        ) : (
                          <>
                            <td className="border border-gray-300 p-2 align-middle">
                              {item.numeroRomano && <strong>{`${toRoman(item.numeroRomano)}. `}</strong>}
                              {item.pergunta}
                              {item.isContinuation && <span className="text-gray-500 italic ml-2">(continuação)</span>}
                            </td>
                            <td className="border border-gray-300 p-2 align-middle text-center w-56" style={{ wordWrap: 'break-word', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'normal' }}>
                              {item.assinatura ? (
                                <CompressedSignatureImage
                                  url={item.assinatura}
                                  alt="Assinatura"
                                  className="max-w-32 max-h-6 object-contain mx-auto"
                                  pdfMode={pdfMode}
                                />
                              ) : (
                                item.resposta && item.resposta !== '-' && 
                                  <span className={`px-2 py-1 rounded text-xs font-medium inline-block ${getStatusBadgeClass(item.resposta, item.cor)}`} style={{ wordWrap: 'break-word', wordBreak: 'break-word', overflowWrap: 'break-word', whiteSpace: 'pre-wrap', maxWidth: '100%' }}>
                                    {item.resposta}
                                  </span>
                              )}
                            </td>
                          </>
                        )}
                      </tr>
                      {hasDetails && (
                        <tr className="break-inside-avoid details-row">
                          <td colSpan={isStatusSection ? "1" : "2"} className="border border-gray-300 p-2">
                            <div className="break-inside-avoid">
                              {!item.isContinuation && item.observacao && item.observacao.trim() !== '' && item.observacao.trim() !== '-' && 
                                <div className="p-2 rounded mb-2" style={{ backgroundColor: '#f0f8ff' }}>
                                  <strong className="block mb-1 text-gray-700 text-xs">Comentário:</strong>
                                  <p className="mt-1 text-gray-600 whitespace-pre-wrap leading-tight text-xs">{item.observacao}</p>
                                </div>
                              }

                              {item.foto && item.foto.length > 0 && 
                                <div className={`${(!item.isContinuation && item.observacao && item.observacao.trim() !== '' && item.observacao.trim() !== '-') ? 'mt-2' : ''}`}>
                                  <strong className="block mb-2 text-gray-700 text-xs">Registro Fotográfico:</strong>
                                  <div className="grid grid-cols-2 gap-3">
                                    {item.foto.map((foto, fotoIndex) => (
                                      <CompressedPhoto
                                        key={foto.url + fotoIndex}
                                        url={foto.url}
                                        legenda={foto.legenda}
                                        index={fotoIndex + 1}
                                      />
                                    ))}
                                  </div>
                                </div>
                              }
                            </div>
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
      })}
    </div>
  );
};

// Helper function to calculate the weight of an item (baseado em Inspeção Elétrica)
const calculateItemWeight = (item) => {
  const photoCount = item.foto?.length || 0;
  const observacaoLength = item.observacao?.length || 0;
  
  if (photoCount === 0) {
    let weight = 1.0;
    if (observacaoLength > 100) {
      const estimatedLines = Math.ceil(observacaoLength / 100);
      weight += Math.max(0, Math.ceil(estimatedLines / 2));
    }
    return weight;
  }
  
  const fotoRows = Math.ceil(photoCount / 2);
  let weight = 1.0 + (fotoRows * 2.0);
  
  if (observacaoLength > 100) {
    const estimatedLines = Math.ceil(observacaoLength / 100);
    weight += Math.max(0, Math.ceil(estimatedLines / 2));
  }
  
  return weight;
};

const paginateContent = (allItems, observacoesSecoesProcessadas, vistoria, unidade, empreendimento, t, formulario, disciplineStats) => {
  const pages = [];
  const sectionNameToObservationMap = {};
  if (observacoesSecoesProcessadas) {
    formulario.secoes.forEach((secao) => {
      const secaoName = secao.nome_secao;
      if (observacoesSecoesProcessadas[secaoName] && observacoesSecoesProcessadas[secaoName].trim() !== '') {
        sectionNameToObservationMap[secaoName] = observacoesSecoesProcessadas[secaoName];
      }
    });
  }

  const MAX_ITEMS_PER_PAGE = 6;
  const MAX_FOTOS_PER_ITEM = 4;

  // Page 1: Cover Page
  pages.push(
    <CoverPage
      vistoria={vistoria}
      unidade={unidade}
      empreendimento={empreendimento}
      items={allItems}
      t={t}
    />
  );

  // Page 2: Dados Empreendimento
  if (empreendimento) {
    pages.push(
      <DadosEmpreendimentoPage vistoria={vistoria} empreendimento={empreendimento} unidade={unidade} t={t} formulario={formulario} />
    );
  }

  // Process items with section info
  const allItemsWithSectionInfo = [];
  formulario.secoes.forEach((secao, globalIndex) => {
    const itemsInSection = allItems.filter(item => item.secao === secao.nome_secao);
    let numeroRomanoSequencial = 0;
    itemsInSection.forEach((item, localIndex) => {
      // Calcular número romano sequencial, contando apenas itens que devem ter número
      if (!item.pergunta.includes("Acabamento / Especificação")) {
        numeroRomanoSequencial++;
      }
      allItemsWithSectionInfo.push({
        ...item,
        originalSecaoName: secao.nome_secao,
        globalIndex: globalIndex,
        local_index: localIndex,
        numeroRomano: item.pergunta.includes("Acabamento / Especificação") ? null : numeroRomanoSequencial,
        uniqueId: `${secao.nome_secao}-${localIndex}`,
        isContinuation: false,
      });
    });
  });

  // Create section number map for sequential numbering
  const uniqueGlobalIndices = [...new Set(allItemsWithSectionInfo.map(item => item.globalIndex))].sort((a, b) => a - b);
  const sectionNumberMap = {};
  uniqueGlobalIndices.forEach((globalIdx, sequentialIndex) => {
    sectionNumberMap[globalIdx] = sequentialIndex + 1;
  });

  // Identificar globalIndex das seções especiais
  const firstSectionGlobalIndex = uniqueGlobalIndices.length > 0 ? uniqueGlobalIndices[0] : null;
  const thirdSectionGlobalIndex = uniqueGlobalIndices.length > 2 ? uniqueGlobalIndices[2] : null;
  const fourthSectionGlobalIndex = uniqueGlobalIndices.length > 3 ? uniqueGlobalIndices[3] : null;
  const fifthSectionGlobalIndex = uniqueGlobalIndices.length > 4 ? uniqueGlobalIndices[4] : null;
  const sixthSectionGlobalIndex = uniqueGlobalIndices.length > 5 ? uniqueGlobalIndices[5] : null;
  const seventhSectionGlobalIndex = uniqueGlobalIndices.length > 6 ? uniqueGlobalIndices[6] : null;
  const eighthSectionGlobalIndex = uniqueGlobalIndices.length > 7 ? uniqueGlobalIndices[7] : null;
  const ninthSectionGlobalIndex = uniqueGlobalIndices.length > 8 ? uniqueGlobalIndices[8] : null;
  const tenthSectionGlobalIndex = uniqueGlobalIndices.length > 9 ? uniqueGlobalIndices[9] : null;
  const eleventhSectionGlobalIndex = uniqueGlobalIndices.length > 10 ? uniqueGlobalIndices[10] : null;
  const thirteenthSectionGlobalIndex = uniqueGlobalIndices.length > 12 ? uniqueGlobalIndices[12] : null;
  const sixteenthSectionGlobalIndex = uniqueGlobalIndices.length > 15 ? uniqueGlobalIndices[15] : null;

  // Manter todos os itens para paginação
  let itemsToPaginate = allItemsWithSectionInfo;

  let currentContentPageItemsBuffer = [];
  let currentPageWeight = 0;
  const sectionsObsRenderedGlobally = new Set();
  let currentPagePhotoCount = 0;
  let i = 0;

  while (i < itemsToPaginate.length) {
    const originalItem = itemsToPaginate[i];
    const secaoNameForThisItem = formulario.secoes[originalItem.globalIndex].nome_secao;
    const isNewSectionOnCurrentPageBuffer = currentContentPageItemsBuffer.length === 0 || originalItem.globalIndex !== (currentContentPageItemsBuffer[currentContentPageItemsBuffer.length - 1]?.globalIndex ?? -1);

    // Se estamos iniciando uma nova seção e a página já tem conteúdo com peso >= 8, fecha a página primeiro
    const isThirdSection = originalItem.globalIndex === thirdSectionGlobalIndex;
    const isFourthSection = originalItem.globalIndex === fourthSectionGlobalIndex;
    const isFifthSection = originalItem.globalIndex === fifthSectionGlobalIndex;
    const isSixthSection = originalItem.globalIndex === sixthSectionGlobalIndex;
    const isSeventhSection = originalItem.globalIndex === seventhSectionGlobalIndex;
    const isEighthSection = originalItem.globalIndex === eighthSectionGlobalIndex;
    const isNinthSection = originalItem.globalIndex === ninthSectionGlobalIndex;
    const isTenthSection = originalItem.globalIndex === tenthSectionGlobalIndex;
    const isEleventhSection = originalItem.globalIndex === eleventhSectionGlobalIndex;
    const isThirteenthSection = originalItem.globalIndex === thirteenthSectionGlobalIndex;
    const isSixteenthSection = originalItem.globalIndex === sixteenthSectionGlobalIndex;

    // Se estamos iniciando o tópico 3 e há conteúdo na página, fecha a página primeiro
    if (isThirdSection && isNewSectionOnCurrentPageBuffer && currentContentPageItemsBuffer.length > 0) {
      // Flush current page
      const sectionsToRenderObservationsOnThisPage = new Set();
      const groupedItemsForPage = currentContentPageItemsBuffer.reduce((acc, item) => {
        const secaoName = item.originalSecaoName;
        if (!acc[secaoName]) acc[secaoName] = { items: [], globalIndex: item.globalIndex };
        acc[secaoName].items.push(item);
        return acc;
      }, {});
      const sortedSectionsForPage = Object.entries(groupedItemsForPage).map(([secaoName, data]) => ({
        secaoName, items: data.items, globalIndex: data.globalIndex,
      })).sort((a, b) => a.globalIndex - b.globalIndex);

      sortedSectionsForPage.forEach(sectionGroup => {
        if (sectionNameToObservationMap[sectionGroup.secaoName] && !sectionsObsRenderedGlobally.has(sectionGroup.secaoName)) {
          sectionsToRenderObservationsOnThisPage.add(sectionGroup.secaoName);
          sectionsObsRenderedGlobally.add(sectionGroup.secaoName);
        }
      });

      pages.push(<ContentPage items={sortedSectionsForPage} observacoes={sectionNameToObservationMap} sectionOriginalOrder={formulario.secoes.map(s => s.nome_secao)} disciplineStats={disciplineStats} sectionsToRenderObservationsOnThisPage={sectionsToRenderObservationsOnThisPage} sectionNumberMap={sectionNumberMap} />);
      currentContentPageItemsBuffer = [];
      currentPageWeight = 0;
      currentPagePhotoCount = 0;
    }

    // Se estamos iniciando uma nova seção e a página já tem 3 ou mais fotos, fecha a página primeiro
    if (isNewSectionOnCurrentPageBuffer && currentContentPageItemsBuffer.length > 0 && currentPagePhotoCount >= 3) {
      // Flush current page
      const sectionsToRenderObservationsOnThisPage = new Set();
      const groupedItemsForPage = currentContentPageItemsBuffer.reduce((acc, item) => {
        const secaoName = item.originalSecaoName;
        if (!acc[secaoName]) acc[secaoName] = { items: [], globalIndex: item.globalIndex };
        acc[secaoName].items.push(item);
        return acc;
      }, {});
      const sortedSectionsForPage = Object.entries(groupedItemsForPage).map(([secaoName, data]) => ({
        secaoName, items: data.items, globalIndex: data.globalIndex,
      })).sort((a, b) => a.globalIndex - b.globalIndex);

      sortedSectionsForPage.forEach(sectionGroup => {
        if (sectionNameToObservationMap[sectionGroup.secaoName] && !sectionsObsRenderedGlobally.has(sectionGroup.secaoName)) {
          sectionsToRenderObservationsOnThisPage.add(sectionGroup.secaoName);
          sectionsObsRenderedGlobally.add(sectionGroup.secaoName);
        }
      });

      pages.push(<ContentPage items={sortedSectionsForPage} observacoes={sectionNameToObservationMap} sectionOriginalOrder={formulario.secoes.map(s => s.nome_secao)} disciplineStats={disciplineStats} sectionsToRenderObservationsOnThisPage={sectionsToRenderObservationsOnThisPage} sectionNumberMap={sectionNumberMap} />);
      currentContentPageItemsBuffer = [];
      currentPageWeight = 0;
      currentPagePhotoCount = 0;
    }

    if (isNewSectionOnCurrentPageBuffer && currentContentPageItemsBuffer.length > 0 && currentPageWeight >= 6) {
      // Flush current page
      const sectionsToRenderObservationsOnThisPage = new Set();
      const groupedItemsForPage = currentContentPageItemsBuffer.reduce((acc, item) => {
        const secaoName = item.originalSecaoName;
        if (!acc[secaoName]) acc[secaoName] = { items: [], globalIndex: item.globalIndex };
        acc[secaoName].items.push(item);
        return acc;
      }, {});
      const sortedSectionsForPage = Object.entries(groupedItemsForPage).map(([secaoName, data]) => ({
        secaoName, items: data.items, globalIndex: data.globalIndex,
      })).sort((a, b) => a.globalIndex - b.globalIndex);
      
      sortedSectionsForPage.forEach(sectionGroup => {
        if (sectionNameToObservationMap[sectionGroup.secaoName] && !sectionsObsRenderedGlobally.has(sectionGroup.secaoName)) {
          sectionsToRenderObservationsOnThisPage.add(sectionGroup.secaoName);
          sectionsObsRenderedGlobally.add(sectionGroup.secaoName);
        }
      });
      
      pages.push(<ContentPage items={sortedSectionsForPage} observacoes={sectionNameToObservationMap} sectionOriginalOrder={formulario.secoes.map(s => s.nome_secao)} disciplineStats={disciplineStats} sectionsToRenderObservationsOnThisPage={sectionsToRenderObservationsOnThisPage} sectionNumberMap={sectionNumberMap} />);
      currentContentPageItemsBuffer = [];
      currentPageWeight = 0;
      currentPagePhotoCount = 0;
    }
    
    const itemPhotoCount = originalItem.foto?.length || 0;
    
    // Dividir item se tiver mais de MAX_FOTOS_PER_ITEM fotos
    if (itemPhotoCount > MAX_FOTOS_PER_ITEM) {
      const fotosChunks = [];
      for (let j = 0; j < originalItem.foto.length; j += MAX_FOTOS_PER_ITEM) {
        fotosChunks.push(originalItem.foto.slice(j, j + MAX_FOTOS_PER_ITEM));
      }
      
      const firstItemPart = { ...originalItem, foto: fotosChunks[0], uniqueId: `${originalItem.uniqueId}-part1` };
      const weight = calculateItemWeight(firstItemPart);

      // Se não cabe na página atual, fecha a página e começa nova
      if (currentPageWeight + weight > MAX_ITEMS_PER_PAGE && currentContentPageItemsBuffer.length > 0) {
        // Flush current page
        const sectionsToRenderObservationsOnThisPage = new Set();
        const groupedItemsForPage = currentContentPageItemsBuffer.reduce((acc, item) => {
          const secaoName = item.originalSecaoName;
          if (!acc[secaoName]) acc[secaoName] = { items: [], globalIndex: item.globalIndex };
          acc[secaoName].items.push(item);
          return acc;
        }, {});
        const sortedSectionsForPage = Object.entries(groupedItemsForPage).map(([secaoName, data]) => ({
          secaoName, items: data.items, globalIndex: data.globalIndex,
        })).sort((a, b) => a.globalIndex - b.globalIndex);
        
        sortedSectionsForPage.forEach(sectionGroup => {
          if (sectionNameToObservationMap[sectionGroup.secaoName] && !sectionsObsRenderedGlobally.has(sectionGroup.secaoName)) {
            sectionsToRenderObservationsOnThisPage.add(sectionGroup.secaoName);
            sectionsObsRenderedGlobally.add(sectionGroup.secaoName);
          }
        });
        
        pages.push(<ContentPage items={sortedSectionsForPage} observacoes={sectionNameToObservationMap} sectionOriginalOrder={formulario.secoes.map(s => s.nome_secao)} disciplineStats={disciplineStats} sectionsToRenderObservationsOnThisPage={sectionsToRenderObservationsOnThisPage} sectionNumberMap={sectionNumberMap} />);
        currentContentPageItemsBuffer = [];
        currentPageWeight = 0;
        currentPagePhotoCount = 0;
      }
      
      // Adiciona primeira parte
      currentContentPageItemsBuffer.push(firstItemPart);
      currentPageWeight += weight;
      currentPagePhotoCount += fotosChunks[0].length;
      
      // Marca observação da seção como renderizada se for nova seção
      if (isNewSectionOnCurrentPageBuffer && sectionNameToObservationMap[secaoNameForThisItem] && !sectionsObsRenderedGlobally.has(secaoNameForThisItem)) {
        sectionsObsRenderedGlobally.add(secaoNameForThisItem);
      }
      
      // Processa chunks restantes de fotos
      for (let j = 1; j < fotosChunks.length; j++) {
        // Sempre fecha a página antes de adicionar continuação
        if (currentContentPageItemsBuffer.length > 0) {
          const sectionsToRenderObservationsOnThisPage = new Set();
          const groupedItemsForPage = currentContentPageItemsBuffer.reduce((acc, item) => {
            const secaoName = item.originalSecaoName;
            if (!acc[secaoName]) acc[secaoName] = { items: [], globalIndex: item.globalIndex };
            acc[secaoName].items.push(item);
            return acc;
          }, {});
          const sortedSectionsForPage = Object.entries(groupedItemsForPage).map(([secaoName, data]) => ({
            secaoName, items: data.items, globalIndex: data.globalIndex,
          })).sort((a, b) => a.globalIndex - b.globalIndex);
          
          pages.push(<ContentPage items={sortedSectionsForPage} observacoes={sectionNameToObservationMap} sectionOriginalOrder={formulario.secoes.map(s => s.nome_secao)} disciplineStats={disciplineStats} sectionsToRenderObservationsOnThisPage={sectionsToRenderObservationsOnThisPage} sectionNumberMap={sectionNumberMap} />);
          currentContentPageItemsBuffer = [];
          currentPageWeight = 0;
          currentPagePhotoCount = 0;
        }
        
        // Adiciona continuação na nova página
        const continuationPart = {
          ...originalItem,
          observacao: '',
          foto: fotosChunks[j],
          isContinuation: true,
          uniqueId: `${originalItem.uniqueId}-part${j + 1}`
        };
        currentContentPageItemsBuffer.push(continuationPart);
        currentPageWeight += calculateItemWeight(continuationPart);
        currentPagePhotoCount += fotosChunks[j].length;
      }
      i++;
    } else {
      // Item normal (até 4 fotos)
      const itemWeight = calculateItemWeight(originalItem);
      const has4Photos = itemPhotoCount === MAX_FOTOS_PER_ITEM;

      // Se o item tem 3 ou mais fotos (ou 2 ou mais para tópico 4) e a página não está vazia, fecha a página primeiro
      const photoThreshold = isFourthSection ? 2 : 3;
      if (itemPhotoCount >= photoThreshold && currentContentPageItemsBuffer.length > 0) {
        const sectionsToRenderObservationsOnThisPage = new Set();
        const groupedItemsForPage = currentContentPageItemsBuffer.reduce((acc, item) => {
          const secaoName = item.originalSecaoName;
          if (!acc[secaoName]) acc[secaoName] = { items: [], globalIndex: item.globalIndex };
          acc[secaoName].items.push(item);
          return acc;
        }, {});
        const sortedSectionsForPage = Object.entries(groupedItemsForPage).map(([secaoName, data]) => ({
          secaoName, items: data.items, globalIndex: data.globalIndex,
        })).sort((a, b) => a.globalIndex - b.globalIndex);

        sortedSectionsForPage.forEach(sectionGroup => {
          if (sectionNameToObservationMap[sectionGroup.secaoName] && !sectionsObsRenderedGlobally.has(sectionGroup.secaoName)) {
            sectionsToRenderObservationsOnThisPage.add(sectionGroup.secaoName);
            sectionsObsRenderedGlobally.add(sectionGroup.secaoName);
          }
        });

        pages.push(<ContentPage items={sortedSectionsForPage} observacoes={sectionNameToObservationMap} sectionOriginalOrder={formulario.secoes.map(s => s.nome_secao)} disciplineStats={disciplineStats} sectionsToRenderObservationsOnThisPage={sectionsToRenderObservationsOnThisPage} sectionNumberMap={sectionNumberMap} />);
        currentContentPageItemsBuffer = [];
        currentPageWeight = 0;
        currentPagePhotoCount = 0;
      }

      // Verifica quantos itens restam da mesma seção
      const remainingItemsInSection = itemsToPaginate.slice(i).filter(item => item.globalIndex === originalItem.globalIndex);
      const remainingWeight = remainingItemsInSection.reduce((sum, item) => sum + calculateItemWeight(item), 0);

      // Só fecha página se ultrapassar o limite E não deixaria poucos itens sozinhos na próxima página
      const wouldLeaveOrphans = remainingWeight < 2 && remainingItemsInSection.length === 1;
      // Para a seção 3, usar 15 para 2 páginas; para seção 4, usar 8 para 5 páginas; para seção 5, usar 7 para 5 páginas; para seção 9, usar 12 para 2 páginas; para seções 6, 7, 8, 11 e 13, usar 10 para 3 páginas; para seção 10, usar 8 para 3 páginas; para seção 16, usar 25 para 1 página
      const pageLimit = isThirdSection ? 15 : (isFourthSection ? 8 : (isFifthSection ? 7 : (isNinthSection ? 12 : (isSixthSection || isSeventhSection || isEighthSection || isEleventhSection || isThirteenthSection ? 10 : (isTenthSection ? 8 : (isSixteenthSection ? 25 : 6))))));
      if (currentPageWeight + itemWeight > pageLimit && currentContentPageItemsBuffer.length > 0 && !wouldLeaveOrphans) {
        // Flush current page
        const sectionsToRenderObservationsOnThisPage = new Set();
        const groupedItemsForPage = currentContentPageItemsBuffer.reduce((acc, item) => {
          const secaoName = item.originalSecaoName;
          if (!acc[secaoName]) acc[secaoName] = { items: [], globalIndex: item.globalIndex };
          acc[secaoName].items.push(item);
          return acc;
        }, {});
        const sortedSectionsForPage = Object.entries(groupedItemsForPage).map(([secaoName, data]) => ({
          secaoName, items: data.items, globalIndex: data.globalIndex,
        })).sort((a, b) => a.globalIndex - b.globalIndex);
        
        sortedSectionsForPage.forEach(sectionGroup => {
          if (sectionNameToObservationMap[sectionGroup.secaoName] && !sectionsObsRenderedGlobally.has(sectionGroup.secaoName)) {
            sectionsToRenderObservationsOnThisPage.add(sectionGroup.secaoName);
            sectionsObsRenderedGlobally.add(sectionGroup.secaoName);
          }
        });
        
        pages.push(<ContentPage items={sortedSectionsForPage} observacoes={sectionNameToObservationMap} sectionOriginalOrder={formulario.secoes.map(s => s.nome_secao)} disciplineStats={disciplineStats} sectionsToRenderObservationsOnThisPage={sectionsToRenderObservationsOnThisPage} sectionNumberMap={sectionNumberMap} />);
        currentContentPageItemsBuffer = [];
        currentPageWeight = 0;
        currentPagePhotoCount = 0;
        }

        // Adiciona item na página atual (nova se acabou de fechar)
        currentContentPageItemsBuffer.push(originalItem);
        currentPageWeight += itemWeight;
        currentPagePhotoCount += itemPhotoCount;
      
      // Marca observação da seção como renderizada se for nova seção
      if (isNewSectionOnCurrentPageBuffer && sectionNameToObservationMap[secaoNameForThisItem] && !sectionsObsRenderedGlobally.has(secaoNameForThisItem)) {
        sectionsObsRenderedGlobally.add(secaoNameForThisItem);
      }
      
      // Se o item tem 3 ou mais fotos (ou 2 ou mais para tópico 4), fecha a página imediatamente
      const photoThresholdClose = (originalItem.globalIndex === fourthSectionGlobalIndex) ? 2 : 3;
      if (itemPhotoCount >= photoThresholdClose) {
        const sectionsToRenderObservationsOnThisPage = new Set();
        const groupedItemsForPage = currentContentPageItemsBuffer.reduce((acc, item) => {
          const secaoName = item.originalSecaoName;
          if (!acc[secaoName]) acc[secaoName] = { items: [], globalIndex: item.globalIndex };
          acc[secaoName].items.push(item);
          return acc;
        }, {});
        const sortedSectionsForPage = Object.entries(groupedItemsForPage).map(([secaoName, data]) => ({
          secaoName, items: data.items, globalIndex: data.globalIndex,
        })).sort((a, b) => a.globalIndex - b.globalIndex);
        
        pages.push(<ContentPage items={sortedSectionsForPage} observacoes={sectionNameToObservationMap} sectionOriginalOrder={formulario.secoes.map(s => s.nome_secao)} disciplineStats={disciplineStats} sectionsToRenderObservationsOnThisPage={sectionsToRenderObservationsOnThisPage} sectionNumberMap={sectionNumberMap} />);
        currentContentPageItemsBuffer = [];
        currentPageWeight = 0;
        currentPagePhotoCount = 0;
      }
      
      i++;
    }
  }

  // Finalize the last content page
  if (currentContentPageItemsBuffer.length > 0) {
    const sectionsToRenderObservationsOnThisPage = new Set();
    const groupedItemsForPage = currentContentPageItemsBuffer.reduce((acc, item) => {
      const secaoName = item.originalSecaoName;
      if (!acc[secaoName]) acc[secaoName] = { items: [], globalIndex: item.globalIndex };
      acc[secaoName].items.push(item);
      return acc;
    }, {});

    const sortedSectionsForPage = Object.entries(groupedItemsForPage).map(([secaoName, data]) => ({
      secaoName, items: data.items, globalIndex: data.globalIndex,
    })).sort((a, b) => a.globalIndex - b.globalIndex);

    sortedSectionsForPage.forEach(sectionGroup => {
      if (sectionNameToObservationMap[sectionGroup.secaoName] && !sectionsObsRenderedGlobally.has(sectionGroup.secaoName)) {
        sectionsToRenderObservationsOnThisPage.add(sectionGroup.secaoName);
        sectionsObsRenderedGlobally.add(sectionGroup.secaoName);
      }
    });

    pages.push(<ContentPage items={sortedSectionsForPage} observacoes={sectionNameToObservationMap} sectionOriginalOrder={formulario.secoes.map(s => s.nome_secao)} disciplineStats={disciplineStats} sectionsToRenderObservationsOnThisPage={sectionsToRenderObservationsOnThisPage} sectionNumberMap={sectionNumberMap} />);
  }

  // QR Codes page
  const hasPhotos = allItems.some(item => item.foto && item.foto.length > 0);
  if (hasPhotos) {
    pages.push(<QRCodesPage allItems={allItems} vistoria={vistoria} />);
  }

  // Assinaturas page - sempre em página separada
  const hasAssinaturas = vistoria.assinaturas && vistoria.assinaturas.length > 0;
  if (hasAssinaturas) {
    pages.push(
      <div className="p-4">
        <h2 className="text-xl font-bold text-center mb-4" style={{ backgroundColor: blueColor, color: 'white', padding: '8px' }}>Assinaturas</h2>
        <div className="space-y-6 mt-8">
          {vistoria.assinaturas.map((assinatura, index) => (
            <div key={index} className="flex flex-col items-center">
              <div className="mb-2 border-b-2 border-black w-96 h-32 flex items-end justify-center">
                {assinatura.assinatura_imagem && (
                  <img 
                    src={assinatura.assinatura_imagem} 
                    alt="Assinatura" 
                    className="max-h-28 max-w-full object-contain"
                    style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', colorAdjust: 'exact' }}
                  />
                )}
              </div>
              <div className="text-center">
                <p className="font-bold" style={{ fontSize: '12px' }}>{assinatura.nome}</p>
                {assinatura.parte && (
                  <p className="text-gray-600" style={{ fontSize: '12px' }}>{assinatura.parte}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return pages;
};

const processReportData = (vistoria, formulario) => {
  console.log("=== PROCESSANDO DADOS DO RELATÓRIO ===");
  if (!vistoria?.respostas || !formulario?.secoes) {
    console.log("Dados insuficientes para processar.");
    return {
      allItems: [],
      dashboardData: [],
      summary: { 'Conforme': 0, 'Não Conforme': 0, 'Pendente': 0, 'Não Aplicável': 0 },
      disciplineStats: [],
      totalItens: 0,
      sectionOriginalOrder: [],
      observacoesSecoes: {},
    };
  }

  let respostasProcessadas = {};
  let respostasRaw = vistoria.respostas;

  while (typeof respostasRaw === 'string') {
    try {
      respostasRaw = JSON.parse(respostasRaw);
    } catch (e) {
      console.error("Não foi possível parsear a string de respostas, parando o loop.", e);
      respostasRaw = {};
      break;
    }
  }

  if (typeof respostasRaw === 'object' && respostasRaw !== null) {
    respostasProcessadas = respostasRaw;
  }

  let fotosSecoesProcessadas = {};
  let fotosRaw = vistoria.fotos_secoes;

  while (typeof fotosRaw === 'string') {
    try {
      fotosRaw = JSON.parse(fotosRaw);
    } catch (e) {
      console.error("Não foi possível parsear as fotos das seções, parando o loop.", e);
      fotosRaw = {};
      break;
    }
  }

  if (typeof fotosRaw === 'object' && fotosRaw !== null) {
    fotosSecoesProcessadas = fotosRaw;
  }

  let observacoesSecoesProcessadas = {};
  let observacoesRaw = vistoria.observacoes_secoes;

  if (typeof observacoesRaw === 'string') {
    try {
      observacoesRaw = JSON.parse(observacoesRaw);
    } catch (e) {
      console.error("Não foi possível parsear as observações das seções, parando o loop.", e);
      observacoesRaw = {};
    }
  }
  if (typeof observacoesRaw === 'object' && observacoesRaw !== null) {
    observacoesSecoesProcessadas = observacoesRaw;
  }

  console.log("Respostas Processadas:", respostasProcessadas);
  console.log("Fotos Seções Processadas:", fotosSecoesProcessadas);
  console.log("Observações Seções Processadas:", observacoesSecoesProcessadas);

  const allItems = [];
  const summary = { 'Conforme': 0, 'Não Conforme': 0, 'Pendente': 0, 'Não Aplicável': 0 };
  const disciplineStats = {};
  const sectionOriginalOrder = formulario.secoes.map(s => s.nome_secao);

  const mapLegacyOption = (option) => {
    if (typeof option === 'object' && option && typeof option.texto === 'string') return option;
    if (typeof option !== 'string') return { texto: String(option), cor: 'gray' };

    const lowerCaseOption = option.toLowerCase().trim();
    if (lowerCaseOption === 'finalizado' || lowerCaseOption === 'conforme' || lowerCaseOption === 'liberado para ocupação' || lowerCaseOption === 'concluído') return { texto: option, cor: 'green' };
    if (lowerCaseOption === 'não conforme' || lowerCaseOption === 'nao conforme' || lowerCaseOption === 'não liberado para ocupação' || lowerCaseOption === 'nao liberado para ocupação') return { texto: option, cor: 'red' };
    if (lowerCaseOption === 'pendente') return { texto: option, cor: 'yellow' };
    if (lowerCaseOption === 'em andamento' || lowerCaseOption === 'andamento') return { texto: option, cor: 'blue' };
    if (lowerCaseOption === 'informativo') return { texto: option, cor: 'purple' };
    if (lowerCaseOption === 'não aplicável' || lowerCaseOption === 'nao aplicavel' || lowerCaseOption === 'não se aplica' || lowerCaseOption === 'nao se aplica') return { texto: option, cor: 'gray' };
    if (lowerCaseOption === 'assinado') return { texto: option, cor: 'purple' };
    return { texto: option, cor: 'gray' };
  };

  const extrairValorResposta = (valor, tipo) => {
    if (valor === undefined || valor === null || valor === '') return '-';
    if (tipo === 'signature' && typeof valor === 'string' && valor.startsWith('data:image')) return 'Assinado';
    if (typeof valor === 'object' && valor !== null && valor.type === 'date') {
      try { return format(new Date(valor.value), 'dd/MM/yyyy', { locale: pt }); } catch (e) { return valor.value; }
    }
    if (typeof valor === 'string' && valor.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      try { return format(new Date(valor), 'dd/MM/yyyy', { locale: pt }); } catch (e) { return valor; }
    }
    if (typeof valor === 'string' && valor.match(/^\d{4}-\d{2}-\d{2}$/)) {
      try { return format(new Date(valor), 'dd/MM/yyyy', { locale: pt }); } catch (e) { return valor; }
    }
    if (typeof valor === 'object' && valor !== null) {
      if (valor.value !== undefined) return String(valor.value);
      return JSON.stringify(valor);
    }
    return String(valor);
  };

  formulario.secoes.forEach((secao, secaoIndex) => {
    if (!disciplineStats[secao.nome_secao]) {
      disciplineStats[secao.nome_secao] = { total: 0, 'Conforme': 0, 'Não Conforme': 0, 'Pendente': 0 };
    }

    if (secao.perguntas && Array.isArray(secao.perguntas)) {
      const perguntasProcessadas = secao.perguntas.map(p => ({
          ...p,
          opcoes: (p.opcoes || []).map(mapLegacyOption)
      }));

      perguntasProcessadas.forEach((pergunta, perguntaIndex) => {
        let resposta = '-';
        let assinaturaUrl = null;
        let observacao = '';
        let fotosItem = [];
        let corResposta = 'gray';

        const chaveSecaoPergunta = `secao_${secaoIndex}_pergunta_${perguntaIndex}`;

        let valorRaw = undefined;
        let comentarioRaw = undefined;

        if (respostasProcessadas[chaveSecaoPergunta]) {
          const objetoResposta = respostasProcessadas[chaveSecaoPergunta];
          if (typeof objetoResposta === 'object' && objetoResposta !== null) {
            valorRaw = objetoResposta.resposta;
            comentarioRaw = objetoResposta.comentario;
          } else {
            valorRaw = objetoResposta;
          }
        } else {
          const baseKey = `${secaoIndex}_${perguntaIndex}`;
          const chavesParaTentar = [ baseKey, `${baseKey}_text`, `${baseKey}_textarea`, `${baseKey}_date`, `${baseKey}_signature`, `${baseKey}_select` ];
          for (const chave of chavesParaTentar) {
              if (respostasProcessadas[chave] !== undefined && respostasProcessadas[chave] !== null && respostasProcessadas[chave] !== '') {
                  valorRaw = respostasProcessadas[chave];
              }
          }
        }

        if (comentarioRaw && comentarioRaw.trim() !== '') {
            observacao = comentarioRaw;
        } else {
            const valorObs = respostasProcessadas[`${secaoIndex}_${perguntaIndex}_obs`];
            if (valorObs && valorObs.trim() !== '') {
                observacao = valorObs;
            }
        }

        const chaveImagem = `secao_${secaoIndex}_pergunta_${perguntaIndex}_imagem`;
        const fotosDaPergunta = fotosSecoesProcessadas[chaveImagem];

        if (fotosDaPergunta && Array.isArray(fotosDaPergunta)) {
            fotosItem = fotosDaPergunta;
        }

        if (valorRaw !== undefined && valorRaw !== null && valorRaw !== '') {
            if (pergunta.tipo === 'signature' && typeof valorRaw === 'string' && valorRaw.startsWith('data:image')) {
                assinaturaUrl = valorRaw;
                resposta = 'Assinado';
            } else {
                resposta = extrairValorResposta(valorRaw, pergunta.tipo);
            }
        }
        
        // Para checkbox, combinar as opções marcadas primeiro e depois o texto
        if (pergunta.tipo === 'checkbox') {
            let checkboxContent = '';
            
            // Primeiro as opções marcadas
            if (comentarioRaw && comentarioRaw.trim() !== '') {
                const opcoesMarcadas = comentarioRaw.split(',').map(s => s.trim()).filter(Boolean);
                if (opcoesMarcadas.length > 0) {
                    checkboxContent = opcoesMarcadas.join('\n');
                }
            }
            
            // Depois o texto, se houver
            if (resposta && resposta !== '-') {
                checkboxContent = checkboxContent ? `${checkboxContent}\n${resposta}` : resposta;
            }
            
            if (checkboxContent) {
                resposta = checkboxContent;
            }
            
            // Limpar observação para checkbox (não deve aparecer separadamente)
            observacao = '';
        }
        
        if (pergunta.tipo === 'select' && pergunta.opcoes && resposta && resposta !== '-') {
            const opcaoEncontrada = pergunta.opcoes.find(opt => opt.texto === resposta);
            if (opcaoEncontrada && opcaoEncontrada.cor) {
                corResposta = opcaoEncontrada.cor;
            } else {
                const mappedLegacy = mapLegacyOption(resposta);
                corResposta = mappedLegacy.cor;
            }
        }

        const hasResponse = resposta !== '-';
        const hasObservation = observacao && observacao.trim() !== '' && observacao.trim() !== '-';
        const hasPhoto = fotosItem && fotosItem.length > 0;
        const hasSignature = !!assinaturaUrl;

        if (hasResponse || hasObservation || hasPhoto || hasSignature) {
          console.log(`Pergunta: ${pergunta.pergunta} -> Resposta: ${resposta} -> Assinatura: ${assinaturaUrl ? 'Sim' : 'Não'}, Fotos: ${fotosItem.length}`);

          allItems.push({
            id: `${secaoIndex}-${perguntaIndex}`,
            secao: secao.nome_secao,
            pergunta: pergunta.pergunta,
            resposta: resposta,
            observacao: observacao,
            foto: fotosItem,
            assinatura: assinaturaUrl,
            cor: corResposta,
          });

          if (pergunta.tipo === 'select' && resposta !== '-') {
              const rawStatusText = String(resposta).trim();
              const normalizedStatusText = rawStatusText.toLowerCase();

              let summaryCategory = null;
              if (normalizedStatusText === 'conforme' || normalizedStatusText === 'liberado para ocupação' || normalizedStatusText === 'concluído' || normalizedStatusText === 'finalizado') {
                  summaryCategory = 'Conforme';
              } else if (normalizedStatusText === 'não conforme' || normalizedStatusText === 'nao conforme' || normalizedStatusText === 'não liberado para ocupação' || normalizedStatusText === 'nao liberado para ocupação') {
                  summaryCategory = 'Não Conforme';
              } else if (normalizedStatusText === 'pendente') {
                  summaryCategory = 'Pendente';
              } else if (normalizedStatusText === 'não aplicável' || normalizedStatusText === 'nao aplicavel' || normalizedStatusText === 'não se aplica' || normalizedStatusText === 'nao se aplica') {
                  summaryCategory = 'Não Aplicável';
              }

              if (summaryCategory && summary[summaryCategory] !== undefined) {
                  summary[summaryCategory]++;
              }

              if (summaryCategory === 'Conforme' || summaryCategory === 'Não Conforme' || summaryCategory === 'Pendente') {
                  disciplineStats[secao.nome_secao].total++;
                  disciplineStats[secao.nome_secao][summaryCategory]++;
              }
          }
        }
      });
    }
  });

  const disciplineStatsArray = Object.keys(disciplineStats).map(name => ({
    name,
    ...disciplineStats[name]
  }));

  const dashboardData = [
    { name: 'Conforme', value: summary.Conforme, color: '#00C49F' },
    { name: 'Não Conforme', value: summary['Não Conforme'], color: '#FF8042' },
    { name: 'Pendente', value: summary.Pendente, color: '#FFBB28' },
  ].filter(item => item.value > 0);

  const totalItens = allItems.filter(item => item.resposta !== '-' && item.resposta !== 'Não Aplicável').length;

  const processed = {
    allItems,
    dashboardData,
    summary,
    disciplineStats: disciplineStatsArray,
    totalItens,
    sectionOriginalOrder,
    observacoesSecoes: observacoesSecoesProcessadas,
  };
  console.log("=== DADOS FINAIS PROCESSADOS ===");
  console.log("Total de itens:", allItems.length);
  console.log("Itens com assinaturas:", allItems.filter(item => item.assinatura).length);
  console.log("Itens com fotos:", allItems.filter(item => item.foto && item.foto.length > 0).length);
  console.log("Summary:", summary);
  console.log("Processed Report Data:", processed);
  return processed;
};

const ReportContent = ({ vistoria, formulario, unidade, empreendimento, t, navigate }) => {
    const [isPrintingMode, setIsPrintingMode] = useState(false);
    const [user, setUser] = useState(null);
    const [loadingUser, setLoadingUser] = useState(true);

    const processedReportData = useMemo(() => {
        return processReportData(vistoria, formulario);
    }, [vistoria, formulario]);

    const paginatedPages = useMemo(() => {
        if (!processedReportData.allItems || !processedReportData.sectionOriginalOrder) return [];
        return paginateContent(
            processedReportData.allItems,
            processedReportData.observacoesSecoes,
            vistoria,
            unidade,
            empreendimento,
            t,
            formulario,
            processedReportData.disciplineStats
        );
    }, [processedReportData, vistoria, unidade, empreendimento, t, formulario]);

    useEffect(() => {
        const checkUser = async () => {
            setLoadingUser(true);
            try {
                const currentUser = await User.me();
                setUser(currentUser);
            } catch (error) {
                setUser(null);
            } finally {
                setLoadingUser(false);
            }
        };
        checkUser();
    }, []);

    const handleStartCompressionProcess = async () => {
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

    const reportUrl = `${window.location.origin}${createPageUrl(`VisualizarRelatorioVistoria?respostaId=${vistoria.id}`)}`;

    const totalPages = paginatedPages.length;
    let currentPageCounter = 0;

    return (
        <div className="bg-gray-200 print:bg-white min-h-screen font-sans">
            {!loadingUser && (
              <div className="no-print shadow-sm border-b p-4 mb-4 bg-white">
                  {user ? (
                      <div className="flex justify-between items-center max-w-4xl mx-auto">
                          <Button onClick={handleBackClick} variant="outline">
                              <ArrowLeft className="w-4 h-4 mr-2" />
                              {t.back}
                          </Button>
                          <h1 className="text-xl font-semibold text-gray-800">{t.title}</h1>
                          <div className="flex gap-2">
                              <EnviarEmailDialog
                                  vistoria={vistoria}
                                  unidade={unidade}
                                  empreendimento={empreendimento}
                                  reportUrl={reportUrl}
                                  language={localStorage.getItem('language') || 'pt'}
                                  theme={localStorage.getItem('theme') || 'light'}
                              />
                              <Button 
                                  onClick={handleStartCompressionProcess}
                                  className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                  <Printer className="w-4 h-4 mr-2" />
                                  Gerar PDF
                              </Button>
                          </div>
                      </div>
                  ) : (
                      <div className="flex justify-end items-center max-w-4xl mx-auto">
                          <Button 
                              onClick={handleStartCompressionProcess}
                              className="bg-green-600 hover:bg-green-700 text-white"
                          >
                              <Printer className="w-4 h-4 mr-2" />
                              Gerar PDF
                          </Button>
                      </div>
                  )}
              </div>
            )}

            <div className="report-container max-w-4xl mx-auto" style={{ padding: 0 }}>
                {paginatedPages.map((pageContent, index) => {
                    currentPageCounter++;
                    return (
                        <ReportPage
                            key={`page-${index}`}
                            pageNumber={currentPageCounter}
                            totalPages={totalPages}
                            vistoria={vistoria}
                            empreendimento={empreendimento}
                            unidade={unidade}
                            pdfMode={isPrintingMode}
                        >
                            {React.cloneElement(pageContent, { pdfMode: isPrintingMode })}
                        </ReportPage>
                    );
                })}
            </div>

            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@700&family=Poppins:wght@100;200;300;400;500;600;700;800;900&display=swap');
                
                .cover-background-image {
                  background-position: center 15% !important;
                }

                @media print {
                  .no-print { display: none !important; }
                  .report-page {
                    width: 210mm;
                    height: 297mm;
                    margin: 0;
                    padding: 0;
                    page-break-after: always;
                    page-break-inside: avoid;
                    overflow: hidden;
                    box-shadow: none;
                  }
                  .report-page:last-child { page-break-after: auto; }
                  html, body {
                    margin: 0;
                    padding: 0;
                    background: white !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    font-family: 'Poppins', 'Inter', sans-serif;
                  }
                  .break-inside-avoid { page-break-inside: avoid; }
                  .details-row, .photo-item-print {
                    page-break-inside: avoid !important;
                  }
                  .photo-img-print {
                    height: auto !important;
                    max-height: 320px !important;
                    object-fit: contain !important;
                    background-color: #fafafa;
                    image-rendering: crisp-edges;
                  }
                  .flex {
                    display: flex;
                    flex-wrap: wrap;
                  }
                  .flex > div {
                    page-break-inside: avoid;
                  }
                  table { page-break-inside: auto; }
                  tr { page-break-inside: avoid; }
                  tbody { page-break-inside: avoid; }
                  @page { size: A4; margin: 0; }

                  .hyphens-auto {
                    hyphens: auto;
                    -webkit-hyphens: auto;
                    -ms-hyphens: auto;
                  }

                  [data-base44], .base44-editor, .base44-logo,
                  iframe[src*="base44"], div[id*="base44"],
                  *[class*="base44"], *[id="edit"] {
                    display: none !important;
                    visibility: hidden !important;
                  }
                  
                  .cover-background-image {
                    background-position: center 15% !important;
                  }
                  
                  .report-page:not(:first-child) h1, 
                  .report-page:not(:first-child) h2, 
                  .report-page:not(:first-child) h3, 
                  .report-page:not(:first-child) p, 
                  .report-page:not(:first-child) span {
                     text-shadow: none !important;
                  }
                  
                  .report-page:not(:first-child) div[style*="filter"], 
                  .report-page:not(:first-child) img[style*="filter"] {
                    filter: none !important;
                  }
                  
                  .report-page:not(:first-child) div[style*="-webkit-mask-image"] {
                    -webkit-mask-image: none !important;
                    mask-image: none !important;
                    background-color: transparent !important;
                  }

                  .pdf-mode .photo-img-print {
                    max-height: 240px !important;
                    image-rendering: auto;
                  }
                  
                  .pdf-mode .cover-background-image {
                    background-position: center 15% !important;
                  }
                }
                
                @media screen {
                  .cover-background-image {
                    background-position: center 15% !important;
                  }

                  .report-page {
                    width: 210mm;
                    height: 297mm;
                    margin: 20px auto;
                    padding: 0;
                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                    background: white;
                    position: relative;
                    overflow: hidden;
                  }
                  
                  .report-page:first-child {
                    margin: 0 auto 20px auto;
                  }

                  .photo-img-print {
                    height: auto !important;
                    max-height: 320px !important;
                    object-fit: contain !important;
                    background-color: #fafafa;
                    image-rendering: crisp-edges;
                  }

                  .bg-gray-100 {
                    background-color: #F3F4F6;
                  }
                  .bg-gray-200 {
                    background-color: #E5E7EB;
                  }

                  .hyphens-auto {
                    hyphens: auto;
                    -webkit-hyphens: auto;
                    -ms-hyphens: auto;
                  }

                  [data-base44], .base44-editor, .base44-logo,
                  iframe[src*="base44"], div[id*="base44"],
                  *[class*="base44"], *[id="edit"] {
                    display: none !important;
                    visibility: hidden !important;
                  }
                }
            `}</style>
        </div>
    );
};

export default function VisualizarRelatorioVistoria() {
  const navigate = useNavigate();
  const location = useLocation();

  const [vistoria, setVistoria] = useState(null);
  const [unidade, setUnidade] = useState(null);
  const [empreendimento, setEmpreendimento] = useState(null);
  const [formulario, setFormulario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [language, setLanguage] = useState(localStorage.getItem('language') || 'pt');
  const [theme] = useState(localStorage.getItem('theme') || 'light');

  const t = translations[language];

  const urlParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const respostaId = urlParams.get('respostaId');

  useEffect(() => {
    const handleLanguageChange = () => setLanguage(localStorage.getItem('language') || 'pt');
    window.addEventListener('language-change', handleLanguageChange);
    return () => {
      window.removeEventListener('language-change', handleLanguageChange);
    };
  }, []);

  useEffect(() => {
    const loadVistoriaData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!isValidId(respostaId)) {
          setError("ID da vistoria não fornecido na URL ou inválido.");
          setLoading(false);
          return;
        }

        console.log(`Iniciando carregamento de dados para respostaId: ${respostaId}`);
        const vistoriaData = await RespostaVistoria.get(respostaId);

        if (!vistoriaData) {
          throw new Error("Vistoria não encontrada para o ID fornecido.");
        }
        setVistoria(vistoriaData);

        const [unidadeResult, empreendimentoResult] = await Promise.allSettled([
          vistoriaData.id_unidade ? UnidadeEmpreendimento.get(vistoriaData.id_unidade) : Promise.resolve(null),
          vistoriaData.id_empreendimento ? Empreendimento.get(vistoriaData.id_empreendimento) : Promise.resolve(null),
        ]);

        if (unidadeResult.status === 'fulfilled' && unidadeResult.value) {
          setUnidade(unidadeResult.value);
        } else {
          console.warn(`Não foi possível carregar Unidade (ID: ${vistoriaData.id_unidade}):`, unidadeResult.reason);
          setUnidade(null);
        }

        if (empreendimentoResult.status === 'fulfilled' && empreendimentoResult.value) {
          setEmpreendimento(empreendimentoResult.value);
        } else {
          console.warn(`Não foi possível carregar Empreendimento (ID: ${vistoriaData.id_empreendimento}):`, empreendimentoResult.reason);
          setEmpreendimento(null);
        }

        let loadedForm = null;
        if (vistoriaData.id_formulario) {
          try {
            const fetchedForm = await FormularioVistoriaEntity.get(vistoriaData.id_formulario);
            if (fetchedForm && fetchedForm.secoes && Array.isArray(fetchedForm.secoes) && fetchedForm.secoes.length > 0) {
                loadedForm = fetchedForm;
            } else {
                console.warn('Formulário padrão carregado, mas sem seções válidas ou vazio:', fetchedForm);
            }
          } catch (formError) {
            console.error('Erro ao carregar formulário padrão:', formError);
          }
        }

        if (!loadedForm && vistoriaData.estrutura_formulario && Array.isArray(vistoriaData.estrutura_formulario) && vistoriaData.estrutura_formulario.length > 0) {
          loadedForm = {
            nome_formulario: vistoriaData.nome_vistoria || "Vistoria Avulsa",
            secoes: vistoriaData.estrutura_formulario,
            consultor_responsavel: vistoriaData.consultor_responsavel
          };
        }

        if (loadedForm && loadedForm.secoes && Array.isArray(loadedForm.secoes) && loadedForm.secoes.length > 0) {
          console.log('✓ Estrutura do formulário processada com sucesso.');
          setFormulario(loadedForm);
        } else {
          console.warn('⚠ Nenhuma estrutura de formulário (padrão ou avulsa) encontrada ou válida para esta vistoria.');
          setError(t.formNotFound(vistoriaData?.id_formulario || 'N/A'));
          setFormulario(null);
        }

      } catch (err) {
        console.error("Erro detalhado ao carregar dados do relatório:", err);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    };

    if (respostaId) {
        loadVistoriaData();
    }
  }, [respostaId, t]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
        <Loader2 className="h-12 w-12 animate-spin mb-4" style={{ color: blueColor }} />
        <p className="text-gray-600 text-lg">{t.loadingReport}</p>
        <p className="text-gray-500 text-sm mt-2">Carregando dados do servidor...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <AlertTriangle className="w-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-red-600 mb-4">Erro ao Carregar Relatório</h2>
          <p className="text-gray-700 mb-6">{error}</p>
          <div className="flex gap-3 justify-center">
            <Button
              onClick={() => window.location.reload()}
              style={{ backgroundColor: blueColor, color: 'white' }}
            >
              Tentar Novamente
            </Button>
            <Button
              onClick={() => navigate(-1)}
              variant="outline"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!formulario || !vistoria) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-8">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <AlertTriangle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-orange-600 mb-4">Dados Incompletos</h2>
          <p className="text-gray-700 mb-6">
            Alguns dados necessários para gerar o relatório não foram encontrados ou estão inválidos.
          </p>
          <div className="text-left text-sm text-gray-600 mb-6">
            <p>Status dos dados carregados:</p>
            <ul className="mt-2 space-y-1">
              <li>• Vistoria: {vistoria ? '✓ Carregada' : '✗ Não encontrada'}</li>
              <li>• Unidade: {unidade ? '✓ Carregada' : '✗ Não encontrada'}</li>
              <li>• Empreendimento: {empreendimento ? '✓ Carregado' : '✗ Não encontrado'}</li>
              <li>• Formulário: {formulario ? '✓ Carregado e válido' : '✗ Não encontrado ou inválido'}</li>
            </ul>
          </div>
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ReportContent
      vistoria={vistoria}
      formulario={formulario}
      unidade={unidade}
      empreendimento={empreendimento}
      t={t}
      navigate={navigate}
    />
  );
}