import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Loader2, AlertTriangle, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { paginateBlocksForPrinting } from '@/lib/reportPagination';
import { createPageUrl } from '@/utils';

const isValidId = (id) => id && String(id).trim() !== '' && !['null', 'undefined'].includes(String(id).toLowerCase());

const blueColor = '#2A3E84';
const redColor = '#CE2D2D';

const sanitizeFileName = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  // Remove invalid Windows filename chars and normalize spaces.
  return raw
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
};

const resolvePdfFileName = (relatorio) => {
  const fallback = relatorio?.id ? `RS-${String(relatorio.id).slice(-4)}` : 'relatorio-saida';
  const base = sanitizeFileName(relatorio?.nome_arquivo) || fallback;
  return base.toLowerCase().endsWith('.pdf') ? base : `${base}.pdf`;
};

const resolvePublicAppOrigin = () => {
  const fallbackPublicOrigin = 'https://front-fitout.onrender.com';

  const envOrigin = import.meta.env.VITE_PUBLIC_APP_URL;
  if (typeof envOrigin === 'string' && envOrigin.trim() !== '') {
    return envOrigin.replace(/\/$/, '');
  }

  const currentOrigin = window.location.origin;
  const host = window.location.hostname || '';

  const isLocalOrPrivateHost =
    host === 'localhost' ||
    host === '127.0.0.1' ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(host);

  if (currentOrigin.includes('backend-fitout.onrender.com') || isLocalOrPrivateHost) {
    return fallbackPublicOrigin;
  }

  return currentOrigin;
};

const compressImage = (url, maxWidth = 800, quality = 0.7) => {
  return new Promise((resolve) => {
    if (!url || typeof url !== 'string' || url.startsWith('data:image')) { resolve(url); return; }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width, height = img.height;
      if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
};

const useCompressedImage = (url, maxWidth = 400, quality = 0.7) => {
  const [compressed, setCompressed] = useState(url);
  useEffect(() => {
    if (url && url.startsWith('http')) compressImage(url, maxWidth, quality).then(setCompressed);
    else setCompressed(url);
  }, [url]);
  return compressed;
};

const CoverPage = ({ relatorio, empreendimento, unidade }) => {
  const year = new Date(relatorio?.data_saida || Date.now()).getFullYear();
  const coverFrameUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/dca667b3d_erasebg-transformed.png";
  const redDecorUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/513d57969_Designsemnome2.png';
  const bottomRightUrl = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/10e9b2570_erasebg-transformed.png';
  const logoUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/1a0999f3c_logo_Interativa_letra_branca_sem_fundo_gg.png";
  const logoWhiteUrl = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/22086ec44_LOGOPNG-branco.png";
  const fotoEmp = empreendimento?.foto_empreendimento || 'https://images.unsplash.com/photo-1519947486511-46149fa0a254?w=800&q=80';
  const responsaveis = relatorio?.endereco_capa || empreendimento?.texto_capa_rodape || [empreendimento?.cli_empreendimento, empreendimento?.nome_empreendimento].filter(Boolean).join(' | ');

  return (
    <div className="report-page relative w-full h-full bg-white font-sans overflow-hidden" style={{ margin: 0, padding: 5 }}>
      <div className="absolute w-full h-full bg-center bg-no-repeat z-10" style={{ backgroundImage: `url(${fotoEmp})`, backgroundSize: 'cover', opacity: 0.2, top: '-10px', left: '-10px', width: 'calc(100% + 20px)', height: 'calc(100% + 20px)' }} />
      <div className="absolute top-0 left-0 w-full h-full bg-contain bg-left-top bg-no-repeat z-20" style={{ backgroundImage: `url(${coverFrameUrl})`, height: '150%' }} />
      <div className="absolute z-50" style={{ top: '25px', left: '11px', width: '350px', height: '170px' }}>
        <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
      <div className="absolute flex items-center justify-center z-40" style={{ top: '23%', left: '11%', width: '22.7%', height: '25%', transform: 'rotate(27deg)' }}>
        <span className="font-normal" style={{ fontSize: '60px', fontFamily: "'Inter', sans-serif", color: 'white' }}>{year}</span>
      </div>
      <div className="absolute z-30" style={{ top: '8%', right: '8%', width: '50%', textAlign: 'right' }}>
        <h1 style={{ fontFamily: "'Inter', sans-serif", fontSize: '64px', fontWeight: 'bold', color: '#394557', lineHeight: '1.1' }}>LAUDO</h1>
        <h2 style={{ fontFamily: "'Inter', sans-serif", fontSize: '29.5px', color: redColor, letterSpacing: '4px' }}>{relatorio?.subtitulo_capa || 'SAÍDA DE LOCATÁRIO'}</h2>
      </div>
      <div className="absolute z-30" style={{ top: '50%', right: '2%', width: '40%', textAlign: 'center' }}>
        <h1 className="font-black uppercase" style={{ fontSize: '28px', fontFamily: "'Inter', sans-serif", color: 'black' }}>{relatorio?.locatario || unidade?.cliente_unidade || 'Locatário'}</h1>
        <h2 className="text-gray-600 font-medium" style={{ fontSize: '16px' }}>{relatorio?.unidade_exibicao || unidade?.unidade_empreendimento || ''}</h2>
      </div>
      <div className="absolute z-20" style={{ top: '-350px', right: '-30%', width: '1700px', height: '1150px', backgroundColor: redColor, WebkitMaskImage: `url(${redDecorUrl})`, maskImage: `url(${redDecorUrl})`, WebkitMaskSize: '100% 100%', maskSize: '100% 100%', WebkitMaskRepeat: 'no-repeat', maskRepeat: 'no-repeat' }} />
      <div className="absolute z-50" style={{ top: '-10%', right: '-20%', width: '1800px', height: '800px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={logoWhiteUrl} alt="Logo branco" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
      </div>
      <div className="absolute right-0 w-full h-full bg-no-repeat z-40" style={{ bottom: '-5%', backgroundImage: `url('${bottomRightUrl}')`, height: '1000%', backgroundSize: '230% auto', backgroundPosition: '65% 100%' }} />
      <div className="absolute z-10" style={{ bottom: '0%', left: '0%', width: '450px', height: '800px', borderRadius: '8px', overflow: 'hidden', clipPath: 'polygon(0 0%, 100% 23%, 100% 100%, 0% 100%)' }}>
        <img src={fotoEmp} alt={empreendimento?.nome_empreendimento} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
      <div className="absolute flex items-center justify-center z-50" style={{ bottom: '0', left: '0', right: '0', height: '65px', backgroundColor: redColor, clipPath: 'polygon(15% 0, 100% 0, 100% 100%, 5% 100%)', paddingLeft: '15%', paddingRight: '5%' }}>
        <span className="text-white w-full" style={{ fontSize: '20px', fontFamily: 'Poppins', textAlign: 'center' }}>{responsaveis}</span>
      </div>
    </div>
  );
};

const DadosPage = ({ relatorio, empreendimento, unidade }) => (
  <div className="px-4 py-2">
    <div className="text-base font-bold text-white p-3 rounded-md text-center mb-4" style={{ backgroundColor: blueColor }}>DADOS DO EMPREENDIMENTO E VISTORIA</div>
    <div className="grid grid-cols-2 gap-x-8 gap-y-4 p-4 text-sm border rounded-md">
      <div><p className="font-semibold text-gray-700">Empreendimento:</p><span>{empreendimento?.nome_empreendimento || '-'}</span></div>
      <div><p className="font-semibold text-gray-700">Endereço:</p><span>{empreendimento?.endereco_empreendimento || '-'}</span></div>
      <div><p className="font-semibold text-gray-700">Unidade:</p><span>{unidade?.unidade_empreendimento || '-'}</span></div>
      <div><p className="font-semibold text-gray-700">Locatário:</p><span>{relatorio?.locatario || '-'}</span></div>
      <div><p className="font-semibold text-gray-700">Data da 1ª Vistoria:</p><span>{relatorio?.data_saida ? format(new Date(relatorio.data_saida), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</span></div>
      <div><p className="font-semibold text-gray-700">Data da 2ª Vistoria:</p><span>{relatorio?.data_relatorio ? format(new Date(relatorio.data_relatorio), 'dd/MM/yyyy', { locale: ptBR }) : '-'}</span></div>
      <div><p className="font-semibold text-gray-700">Consultor:</p><span>{relatorio?.consultor_responsavel || '-'}</span></div>
      <div><p className="font-semibold text-gray-700">Revisão:</p><span>{relatorio?.revisao || '-'}</span></div>
      {relatorio?.representantes && <div className="col-span-2"><p className="font-semibold text-gray-700">Representantes:</p><span>{relatorio.representantes}</span></div>}
      {relatorio?.texto_os_proposta && <div className="col-span-2"><p className="font-semibold text-gray-700">OS / Proposta:</p><span>{relatorio.texto_os_proposta}</span></div>}
    </div>
  </div>
);

const CompressedPhoto = ({ url, legenda }) => {
  const [compressed, setCompressed] = useState(url);
  useEffect(() => { if (url && url.startsWith('http')) compressImage(url, 1200, 0.9).then(setCompressed); }, [url]);
  return (
    <div className="text-center">
      <div className="photo-container" style={{ width: '100%', height: '220px', border: '1px solid #ddd', borderRadius: '4px', padding: '8px', backgroundColor: '#f9fafb', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={compressed} alt={legenda || ''} className="photo-img" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }} />
      </div>
      {legenda && <p className="text-xs mt-1 font-medium text-black" style={{ marginTop: '4px' }}>{legenda}</p>}
    </div>
  );
};

const DeclaracoesGrid = ({ items }) => {
  const declarativeText = items.find(i => i.isDeclarativeText);
  const sigs = items.filter(i => i.isSignatureBlock);

  // Find by label regardless of page split
  const locatario      = sigs.find(s => s.pergunta?.includes('LOCAT'));
  const consultor      = sigs.find(s => s.pergunta?.includes('CONSULTOR'));
  const proprietarios  = sigs.filter(s => s.pergunta?.includes('PROPRIET'));
  const prop1b         = proprietarios[0];
  const prop2          = proprietarios[1];
  const condominios    = sigs.filter(s => s.pergunta?.includes('CONDOM'));
  const cond1          = condominios[0];
  const cond2          = condominios[1];

  const SigCell = ({ item }) => {
    if (!item) return <div className="border border-gray-300 p-2 bg-gray-50"></div>;
    return (
      <div className="border border-gray-300 p-2">
        <div className="font-semibold text-gray-800 mb-1 text-xs">{item.pergunta}</div>
        {item.assinatura ? (
          <div className="mb-1"><img src={item.assinatura} alt="Assinatura" style={{maxHeight:'48px',objectFit:'contain'}} /></div>
        ) : (
          <div className="border-b border-gray-400 my-6"></div>
        )}
        {item.observacao && <div className="text-blue-700 font-medium text-xs">{item.observacao}</div>}
        {item.resposta && item.resposta !== '-' && item.resposta !== '' && <div className="text-gray-700 text-xs">{item.resposta}</div>}
      </div>
    );
  };

  return (
    <div className="border border-gray-300 rounded text-xs overflow-hidden">
      {declarativeText && (
        <div className="border-b border-gray-300 p-2 bg-blue-50">
          <ul className="list-disc list-inside text-gray-700"><li>{declarativeText.pergunta}</li></ul>
        </div>
      )}
      {(locatario || consultor) && (
        <div className="grid grid-cols-2 border-b border-gray-300">
          <SigCell item={locatario} />
          <SigCell item={consultor} />
        </div>
      )}
      {(prop1b || prop2) && (
        <div className="grid grid-cols-2 border-b border-gray-300">
          <SigCell item={prop1b} />
          <SigCell item={prop2} />
        </div>
      )}
      {cond1 && <div className="border-b border-gray-300"><SigCell item={cond1} /></div>}
      {cond2 && <div><SigCell item={cond2} /></div>}
    </div>
  );
};

const ContentPage = ({ sections }) => (
  <div className="px-4 py-1">
    {sections.map(({ secaoName, items }, sIdx) => {
      const isDocChecklistSecao = secaoName === 'CHECK-LIST DE DOCUMENTAÇÃO';
      return (
        <div key={sIdx} className="mb-2">
          <div className="text-base font-bold text-white p-2 rounded-md mb-2" style={{ backgroundColor: blueColor }}>{secaoName}</div>
          {secaoName === 'CHECK-LIST INICIAL DE VISTORIA' ? (
            <div className="border border-gray-300 rounded mb-3 text-xs overflow-hidden">
              {items.map((item, idx) => (
                <div key={idx} className="border-b border-gray-300 last:border-b-0">
                  <div className="p-3 bg-white">
                    <p className="font-semibold text-gray-700">{item.pergunta}</p>
                  </div>
                  {item.resposta && item.resposta !== '-' && ['Sim', 'Não'].includes(item.resposta) && (
                    <div className="p-3 bg-gray-100 border-t border-gray-300 flex items-center gap-2">
                      <span className="text-xs text-gray-500 font-medium">Resposta:</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        item.resposta === 'Sim' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>{item.resposta}</span>
                    </div>
                  )}
                  {item.observacao && item.observacao.trim() !== '' && (
                    <div className="p-3 bg-gray-50 border-t border-gray-200">
                      <p className="text-gray-600" style={{ fontStyle: 'italic' }}>{item.observacao}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : isDocChecklistSecao ? (
            <div className="border border-gray-300 rounded mb-3 text-xs overflow-hidden">
              {items.map((item, idx) => {
                const isSimNao = item.resposta === 'Conforme' || item.resposta === 'Pendente' || ['Sim', 'Não', 'N/A'].includes(item.resposta);
                return (
                  <div key={idx} className="border-b border-gray-300 last:border-b-0">
                    <div className="p-3 bg-gray-50 font-semibold text-gray-700 border-b border-gray-300 flex items-center justify-between">
                      <span>{item.pergunta}</span>
                      {item.resposta && item.resposta !== '-' && isSimNao && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ml-2 flex-shrink-0 ${
                          item.resposta === 'Sim' || item.resposta === 'Conforme' ? 'bg-green-100 text-green-800' :
                          item.resposta === 'Não' || item.resposta === 'Pendente' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-700'
                        }`}>{item.resposta}</span>
                      )}
                    </div>
                    <div className="p-3">
                      {item.resposta && item.resposta !== '-' && !isSimNao && (
                        <div className="mb-2">
                          <p className="text-gray-700">{item.resposta}</p>
                        </div>
                      )}
                    {item.observacao && item.observacao.trim() !== '' && (
                      <p className="text-gray-600" style={{ fontStyle: 'italic' }}>{item.observacao}</p>
                    )}
                  </div>
                </div>
                  );
                })}
            </div>
          ) : secaoName === 'DECLARAÇÕES (1º VISTORIA)' ? (
            <DeclaracoesGrid items={items} />
          ) : secaoName === 'DETALHAMENTO DAS ADEQUAÇÕES' ? (
            <div className="border border-gray-300 rounded mb-3 text-xs overflow-hidden">
              {items.map((item, idx) => {
                if (item.tipo === 'descricao_geral') {
                  return (
                    <div key={idx} className="border-b border-gray-300 last:border-b-0">
                      <div className="p-2 font-bold text-gray-800" style={{ backgroundColor: '#e8edf3' }}>{item.pergunta}</div>
                      {item.titulo && item.titulo !== '' && (
                        <div className="px-3 pt-2 pb-1">
                          <p className="text-xs text-gray-500 font-medium mb-0.5">Título da Área</p>
                          <p className="text-sm font-semibold text-gray-800">{item.titulo}</p>
                        </div>
                      )}
                      {item.resposta && item.resposta.trim() !== '' && (
                        <div className="px-3 pt-1 pb-2" style={{ borderTop: (item.titulo && item.titulo !== '') ? '1px solid #e5e7eb' : 'none' }}>
                          <p className="text-xs text-gray-500 font-medium mb-0.5">Comentário Geral</p>
                          <p className="text-xs text-gray-700 whitespace-pre-wrap">{item.resposta}</p>
                        </div>
                      )}
                    </div>
                  );
                }
                const statusColor =
                  item.resposta === 'Conforme' ? 'bg-green-100 text-green-800' :
                  item.resposta === 'Pendente' ? 'bg-red-100 text-red-800' :
                  item.resposta && item.resposta !== '-' ? 'bg-gray-100 text-gray-700' : null;
                const hasDetails = item.fotos && item.fotos.length > 0;
                return (
                  <div key={idx} className="border-b border-gray-300 last:border-b-0">
                    <div className="p-2 bg-gray-50 flex items-center justify-between" style={{ borderBottom: hasDetails ? '1px solid #e5e7eb' : 'none' }}>
                      <span className="font-semibold text-gray-700">{item.pergunta}</span>
                      {item.resposta && item.resposta !== '-' && statusColor && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold flex-shrink-0 ml-2 ${statusColor}`}>{item.resposta}</span>
                      )}
                    </div>
                    {hasDetails && (
                      <div className="p-2 bg-white">
                        {item.fotos && item.fotos.length > 0 && (
                          <div>
                            <strong className="text-xs text-gray-700 block mb-2">Registro Fotográfico:</strong>
                            <div className="grid grid-cols-2 gap-3">
                              {item.fotos.map((foto, fIdx) => (
                                <CompressedPhoto key={fIdx} url={typeof foto === 'string' ? foto : foto.url} legenda={foto.legenda} />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <table className="w-full border-collapse border border-gray-300 text-xs mb-3">
              <tbody>
                {items.map((item, idx) => {
                  const hasDetails = (item.observacao && item.observacao.trim() !== '') || (item.fotos && item.fotos.length > 0) || item.assinatura;
                  return (
                    <React.Fragment key={idx}>
                      <tr className="bg-gray-50">
                        <td className="border border-gray-300 p-2 font-semibold text-gray-700" style={{ width: '100%' }}>{item.pergunta}</td>
                      </tr>
                      <tr>
                        <td className="border border-gray-300 p-2">
                          {item.assinatura ? (
                            <img src={item.assinatura} alt="Assinatura" className="max-h-16 object-contain" />
                          ) : (
                            item.resposta && item.resposta !== '-' ? (
                              ['Sim', 'Não', 'N/A'].includes(item.resposta) ? (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                  item.resposta === 'Sim' ? 'bg-green-100 text-green-800' :
                                  item.resposta === 'Não' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-700'
                                }`}>{item.resposta}</span>
                              ) : (
                                <span className="text-gray-800" style={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>{item.resposta}</span>
                              )
                            ) : null
                          )}
                          {hasDetails && (
                            <div className="mt-2">
                              {item.observacao && item.observacao.trim() !== '' && (
                                <div className="p-1 rounded mb-1" style={{ backgroundColor: '#f0f8ff' }}>
                                  <strong className="text-xs text-gray-700">Comentário:</strong>
                                  <p className="text-xs text-gray-600 whitespace-pre-wrap mt-1">{item.observacao}</p>
                                </div>
                              )}
                              {item.fotos && item.fotos.length > 0 && (
                                <div>
                                  <strong className="text-xs text-gray-700 block mb-2">Registro Fotográfico:</strong>
                                  <div className="grid grid-cols-2 gap-3">
                                    {item.fotos.map((foto, fIdx) => (
                                      <CompressedPhoto key={fIdx} url={typeof foto === 'string' ? foto : foto.url} legenda={foto.legenda} />
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      );
    })}
  </div>
);

const extractSaidaGalleryPhotos = (relatorio) => {
  if (!relatorio) return [];

  const photos = [];

  let fotosSecoes = relatorio.fotos_secoes;
  if (typeof fotosSecoes === 'string') {
    try { fotosSecoes = JSON.parse(fotosSecoes); } catch { fotosSecoes = {}; }
  }
  if (fotosSecoes && typeof fotosSecoes === 'object') {
    Object.values(fotosSecoes).forEach((fotos) => {
      if (!Array.isArray(fotos)) return;
      fotos.forEach((foto) => {
        const url = typeof foto === 'string' ? foto : foto?.url;
        if (!url) return;
        photos.push({ url, legenda: typeof foto === 'object' ? foto?.legenda || '' : '' });
      });
    });
  }

  let detalhamento = relatorio.detalhamento_adequacoes;
  if (typeof detalhamento === 'string') {
    try { detalhamento = JSON.parse(detalhamento); } catch { detalhamento = {}; }
  }
  if (detalhamento && typeof detalhamento === 'object') {
    Object.values(detalhamento).forEach((areaData) => {
      ['situacao_atual', 'situacao_adequada'].forEach((key) => {
        const fotos = areaData?.[key]?.fotos;
        if (!Array.isArray(fotos)) return;
        fotos.forEach((foto) => {
          const url = typeof foto === 'string' ? foto : foto?.url;
          if (!url) return;
          photos.push({ url, legenda: typeof foto === 'object' ? foto?.legenda || '' : '' });
        });
      });
    });
  }

  return photos;
};

const QRCodesPage = ({ relatorio, photosCount }) => {
  const galleryRoute = createPageUrl(`GaleriaRelatorioSaida?relatorioId=${relatorio?.id}`);
  const galleryUrl = `${resolvePublicAppOrigin()}/#${galleryRoute}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(galleryUrl)}`;

  return (
    <div className="p-8 flex flex-col items-center justify-center h-full">
      <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">Galeria de Imagens do Relatório</h2>

      <div className="text-center bg-white p-8 rounded-lg shadow-lg border-2 border-gray-200 max-w-md">
        <img src={qrCodeUrl} alt="QR Code - Galeria de Imagens" className="w-72 h-72 mx-auto mb-6 rounded-lg border" />

        <h2 className="text-2xl font-bold mb-2">Acesse a Galeria Completa</h2>
        <p className="text-gray-600 mb-6 border-b pb-4">{photosCount} imagens do relatório</p>

        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
          <p><strong>Escaneie o QR Code</strong> para acessar a galeria completa com todas as imagens do relatório em alta resolução.</p>
        </div>

        <div className="bg-gray-50 p-3 rounded-lg text-left">
          <p className="text-xs font-semibold text-gray-700 mb-2">Link da galeria:</p>
          <p className="text-xs text-gray-600 break-all">{galleryUrl}</p>
        </div>
      </div>
    </div>
  );
};

const ReportPageLayout = ({ children, pageNumber, totalPages, relatorio, empreendimento }) => {
  const logo = useCompressedImage("https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6844adf31622c5524c42a141/4bd521d1e_LOGOHORIZONTAl.png");
  const HEADER = pageNumber > 1 ? '60px' : '0px';
  const FOOTER = '35px';
  return (
    <div className="report-page">
      {pageNumber > 1 && (
        <div className="flex justify-between items-center border-b border-gray-200 bg-white" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: HEADER, zIndex: 100, padding: '4px 8px' }}>
          <img src={logo} alt="Logo" style={{ height: '32px', maxWidth: '120px', objectFit: 'contain' }} />
          <div className="text-right" style={{ flex: 1, paddingLeft: '8px' }}>
            <p className="text-[9px] text-gray-600 truncate">{empreendimento?.nome_empreendimento} - {relatorio?.locatario}</p>
            <p className="text-[9px] font-medium text-gray-800">{relatorio?.data_saida ? format(new Date(relatorio.data_saida), 'dd/MM/yyyy', { locale: ptBR }) : ''}</p>
          </div>
        </div>
      )}
      <div className="page-content" style={{ paddingTop: HEADER, paddingBottom: FOOTER, height: '100%', overflow: 'hidden' }}>
        {children}
      </div>
      <div className="border-t border-gray-200 bg-gray-50 flex justify-between items-center text-[9px] text-gray-500" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: FOOTER, padding: '4px 8px' }}>
        <div className="flex-1 text-left"><span className="font-medium">Arquivo: </span><span>{relatorio?.nome_arquivo || `RS-${relatorio?.id?.slice(-4)}.pdf`}</span></div>
        <div className="flex-1 flex flex-col items-center"><span>INTERATIVA ENGENHARIA</span><span>www.interativaengenharia.com.br</span></div>
        <div className="flex-1 text-right">Página {pageNumber} de {totalPages}</div>
      </div>
    </div>
  );
};

const CHECKLIST_KEYS = [

  { pergunta: 'Utiliza depósitos em áreas comuns da edificação?', key: 'depositos_areas_comuns' },
  { pergunta: 'Possui sistema de Ar Condicionado adicional, além do disponibilizado pelo condomínio?', key: 'ar_condicionado_adicional' },
  { pergunta: 'Possui sistema de Geração de Energia adicional, além do disponibilizado pelo condomínio?', key: 'geracao_energia_adicional' },
  { pergunta: 'Possui outras intervenções, ambientes ou equipamentos em áreas comuns da edificação?', key: 'intervencoes_areas_comuns' },
  { pergunta: 'Existem sanitários adicionais no pavimento, além dos existentes na edificação?', key: 'sanitarios_adicionais' },
  { pergunta: 'Existem copas adicionais no pavimento, além das existentes na edificação?', key: 'copas_adicionais' },
  { pergunta: 'Existe CPD/IDF/MDF no pavimento?', key: 'cpd_idf_mdf' },
  { pergunta: 'Existem escadas adicionais, além das existentes na edificação?', key: 'escadas_adicionais' },
  { pergunta: 'Existem ambientes com uso atípico no pavimento ou em área comum?', key: 'uso_atipico' },
  { pergunta: 'Foi realizada intervenção em Hall de Elevadores do pavimento?', key: 'intervencao_hall_elevadores' },
  { pergunta: 'Locatário alterou alguma instalação original que deve ser adequada para a original?', key: 'alteracao_instalacao_original' },
  { pergunta: 'Pavimento deverá ser retornado em "conjunto", sendo que as instalações devem ser adequadas para não atravessarem a parede de divisão?', key: 'retorno_conjunto' },
];

const SECTION_HEADER_HEIGHT_PX = 50;
const SECTION_CONTENT_PADDING_PX = 12;

const estimateDadosPageHeightPx = (relatorio) => {
  let height = 220;

  if (relatorio?.representantes) {
    height += 22 + (Math.ceil(String(relatorio.representantes).length / 110) * 16);
  }

  if (relatorio?.texto_os_proposta) {
    height += 22 + (Math.ceil(String(relatorio.texto_os_proposta).length / 110) * 16);
  }

  return Math.min(340, height);
};

const measureChecklistInicialItemHeight = (item) => {
  let height = 58; // pergunta (linha branca)

  if (item?.resposta && item.resposta !== '-' && ['Sim', 'Não'].includes(item.resposta)) {
    height += 44; // resposta (linha cinza + badge)
  }

  if (item?.observacao && item.observacao.trim() !== '') {
    const obsLines = Math.max(1, Math.ceil(String(item.observacao).length / 95));
    height += 24 + (obsLines * 16);
  }

  // Buffer para bordas/margens e variações de fonte no print.
  return height + 12;
};

const paginateSaidaContent = (sections, opts = {}) => {
  const MAX_PHOTOS_PER_ITEM_WITH_TEXT = 4;
  const MAX_PHOTOS_PER_PHOTO_ONLY_ITEM = 4;
  const blocks = [];

  (sections || []).forEach((section) => {
    const sourceItems = Array.isArray(section?.items) ? section.items : [];
    const items = [];

    // Split long photo lists into continuation blocks to avoid overflow in a single table row.
    sourceItems.forEach((item) => {
      const fotos = Array.isArray(item?.fotos) ? item.fotos.filter(Boolean) : [];
      if (fotos.length <= MAX_PHOTOS_PER_ITEM_WITH_TEXT) {
        items.push(item);
        return;
      }

      items.push({ ...item, fotos: fotos.slice(0, MAX_PHOTOS_PER_ITEM_WITH_TEXT) });

      for (let i = MAX_PHOTOS_PER_ITEM_WITH_TEXT; i < fotos.length; i += MAX_PHOTOS_PER_PHOTO_ONLY_ITEM) {
        items.push({
          ...item,
          resposta: '-',
          observacao: '',
          assinatura: null,
          fotos: fotos.slice(i, i + MAX_PHOTOS_PER_PHOTO_ONLY_ITEM),
          pergunta: `${item.pergunta} (continuação)`,
        });
      }
    });

    if (!section?.secaoName || items.length === 0) return;

    // Keep declaration block together to preserve signature grid layout.
    if (section.secaoName === 'DECLARAÇÕES (1º VISTORIA)') {
      blocks.push({
        secaoName: section.secaoName,
        items,
        estimatedHeightPx: 420,
        keepTogether: true,
      });
      return;
    }

    const isInitialChecklistSection = section.secaoName === 'CHECK-LIST INICIAL DE VISTORIA';

    items.forEach((item) => {
      const estimatedHeight = isInitialChecklistSection
        ? measureChecklistInicialItemHeight(item)
        : measureItemHeight(item);

      blocks.push({
        secaoName: section.secaoName,
        items: [item],
        estimatedHeightPx: Math.max(56, Number(estimatedHeight) || 100),
      });
    });
  });

  const pages = paginateBlocksForPrinting(blocks, {
    pageHeightPx: 1122,
    headerHeightPx: 60,
    footerHeightPx: 50,
    pagePaddingPx: 32,
    footerGuardPx: 24,
    breakBeforeLimitPx: 20,
    // First content page shares space with DadosPage.
    firstPageExtraHeightPx: opts.firstPageExtraHeightPx ?? 155,
    defaultBlockHeightPx: 180,
    measureBlockHeight: (block, { currentPage = [] } = {}) => {
      if (block?.keepTogether) return block.estimatedHeightPx || 420;

      const previousBlock = currentPage[currentPage.length - 1];
      const startsSectionOnPage = !previousBlock || previousBlock.secaoName !== block.secaoName;
      const headerHeight = startsSectionOnPage ? SECTION_HEADER_HEIGHT_PX : 0;
      const paddingHeight = startsSectionOnPage ? SECTION_CONTENT_PADDING_PX : 0;

      return headerHeight + paddingHeight + (Number(block?.estimatedHeightPx) || 180);
    },
  });

  return pages.map((pageBlocks) => {
    const groupedSections = [];

    (pageBlocks || []).forEach((block) => {
      const lastSection = groupedSections[groupedSections.length - 1];
      if (lastSection && lastSection.secaoName === block.secaoName) {
        lastSection.items.push(...(block.items || []));
        return;
      }

      groupedSections.push({
        secaoName: block.secaoName,
        items: [...(block.items || [])],
      });
    });

    return groupedSections;
  });
};

const measureItemHeight = (item) => {
  // Items especiais de declarações
  if (item.isDeclarativeText) return 80;
  if (item.isSignatureBlock) return 220;

  if (typeof document === 'undefined') {
    let h = 50;
    h += Math.ceil((item.pergunta?.length || 0) / 80) * 16;
    h += Math.ceil((item.resposta?.length || 0) / 80) * 16;
    if (item.observacao?.trim()) h += 30 + Math.ceil(item.observacao.length / 80) * 16;
    if (item.fotos?.length) h += Math.ceil(item.fotos.length / 2) * 244;
    if (item.assinatura) h += 70;
    return h;
  }
  const div = document.createElement('div');
  div.style.cssText = 'position:absolute;visibility:hidden;width:680px;font-size:12px;font-family:Inter,sans-serif;line-height:1.4;box-sizing:border-box;';
  const esc = (s) => String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  let inner = `<table style="width:100%;border-collapse:collapse;">`;
  inner += `<tr style="background:#f3f4f6"><td style="padding:6px 8px;border:1px solid #d1d5db;font-weight:600;color:#374151;">${esc(item.pergunta)}</td></tr>`;
  let respCell = '';
  if (item.assinatura) {
    respCell = `<img src="${esc(item.assinatura)}" style="max-height:64px;" />`;
  } else if (item.resposta && item.resposta !== '-') {
    respCell = `<span style="white-space:pre-wrap;word-break:break-word">${esc(item.resposta)}</span>`;
  }
  if (item.observacao?.trim()) {
    respCell += `<div style="margin-top:6px;padding:4px 6px;background:#f0f8ff;font-size:11px;"><strong>Comentário:</strong> ${esc(item.observacao)}</div>`;
  }
  if (item.fotos?.length) {
    respCell += `<div style="margin-top:6px;display:grid;grid-template-columns:1fr 1fr;gap:8px;">`;
    item.fotos.forEach(() => { respCell += `<div style="height:236px;background:#eee;"></div>`; });
    respCell += `</div>`;
  }
  inner += `<tr><td style="padding:6px 8px;border:1px solid #d1d5db;">${respCell}</td></tr>`;
  inner += `</table>`;
  div.innerHTML = inner;
  document.body.appendChild(div);
  const h = div.offsetHeight + 4;
  document.body.removeChild(div);
  return h;
};

const processData = (relatorio, formulario) => {
  if (!relatorio?.respostas || !formulario?.secoes) return [];

  let respostas = relatorio.respostas;
  if (typeof respostas === 'string') { try { respostas = JSON.parse(respostas); } catch { respostas = {}; } }

  let fotos = relatorio.fotos_secoes;
  if (typeof fotos === 'string') { try { fotos = JSON.parse(fotos); } catch { fotos = {}; } }

  const filteredSections = formulario.secoes.filter(s =>
    s.nome_secao !== 'CHECK-LIST INICIAL DE VISTORIA' &&
    !s.nome_secao?.toUpperCase().includes('DADOS DO EMPREENDIMENTO') &&
    !s.nome_secao?.toUpperCase().includes('DESCRIÇÃO GERAL DAS ADEQUAÇÕES') &&
    !s.nome_secao?.toUpperCase().includes('DECLARAÇÕES') &&
    !s.nome_secao?.toUpperCase().includes('OBJETIVOS')
  );

  const DADOS_SKIP_PERGUNTAS = [
    'representantes', 'data da 2ª vistoria', 'data da 2a vistoria',
    'data 1º relatório', 'data 1o relatório', 'data 1° relatório',
    'data 2º relatório', 'data 2o relatório', 'data 2° relatório',
  ];

  let descricaoGeralData = relatorio.descricao_geral_adequacoes;
  if (typeof descricaoGeralData === 'string') { try { descricaoGeralData = JSON.parse(descricaoGeralData); } catch { descricaoGeralData = {}; } }
  
  let detalhamentoData = relatorio.detalhamento_adequacoes;
  if (typeof detalhamentoData === 'string') { try { detalhamentoData = JSON.parse(detalhamentoData); } catch { detalhamentoData = {}; } }

  const allSections = [];

  // 1. OBJETIVOS (primeira seção do formulário)
  const objetivosSecao = formulario.secoes.find(s => s.nome_secao?.toUpperCase().includes('OBJETIVOS'));
  if (objetivosSecao) {
    const objetivosIdx = formulario.secoes.indexOf(objetivosSecao);
    const items = [];
    (objetivosSecao.perguntas || []).forEach((perg, pIdx) => {
      const key = `secao_${objetivosIdx}_pergunta_${pIdx}`;
      const rawResp = respostas[key] || {};
      const valorRaw = typeof rawResp === 'object' ? rawResp.resposta : rawResp;
      const comentario = typeof rawResp === 'object' ? rawResp.comentario : '';
      const fotosItem = (fotos[`${key}_imagem`] || []);
      let resposta = '-';
      if (valorRaw && valorRaw !== '') resposta = String(valorRaw);
      const observacao = comentario || '';
      const hasContent = resposta !== '-' || fotosItem.length > 0 || (observacao && observacao.trim() !== '');
      if (hasContent) items.push({ pergunta: perg.pergunta, resposta, assinatura: null, observacao, fotos: fotosItem });
    });
    if (items.length > 0) allSections.push({ secaoName: objetivosSecao.nome_secao, items });
  }

  // 2. BUILD CHECK-LIST INICIAL
  let checklistData = relatorio.checklist_inicial;
  if (typeof checklistData === 'string') { try { checklistData = JSON.parse(checklistData); } catch { checklistData = {}; } }
  if (checklistData && Object.keys(checklistData).length > 0) {
    const checkItems = [];
    CHECKLIST_KEYS.forEach(item => {
      const d = checklistData[item.key];
      if (!d) return;
      if (d.resposta) checkItems.push({ pergunta: item.pergunta, resposta: d.resposta, assinatura: null, observacao: d.comentario || '', fotos: [] });
      if (d.mantido) checkItems.push({ pergunta: 'Se sim, será mantido?', resposta: d.mantido, assinatura: null, observacao: d.comentario_mantido || '', fotos: [] });
    });
    if (checkItems.length > 0) allSections.push({ secaoName: 'CHECK-LIST INICIAL DE VISTORIA', items: checkItems });
  }

  // 3. ADD FILTERED SECTIONS (incluindo CHECK-LIST DE DOCUMENTAÇÃO)
  filteredSections.forEach((secao, sIdx) => {
    const originalIdx = formulario.secoes.indexOf(secao);
    const isDadosSection = secao.nome_secao?.toUpperCase().includes('DADOS DO EMPREENDIMENTO');
    const items = [];
    (secao.perguntas || []).forEach((perg, pIdx) => {
      if (isDadosSection && DADOS_SKIP_PERGUNTAS.some(s => perg.pergunta?.toLowerCase().includes(s))) return;
      const key = `secao_${originalIdx}_pergunta_${pIdx}`;
      const rawResp = respostas[key] || {};
      const valorRaw = typeof rawResp === 'object' ? rawResp.resposta : rawResp;
      const comentario = typeof rawResp === 'object' ? rawResp.comentario : '';
      const fotosItem = (fotos[`${key}_imagem`] || []);

      let resposta = '-';
      let assinatura = null;

      if (valorRaw && valorRaw !== '') {
        if (perg.tipo === 'signature' && typeof valorRaw === 'string' && (valorRaw.startsWith('data:image') || valorRaw.startsWith('http'))) {
          assinatura = valorRaw;
          resposta = 'Assinado';
        } else if (perg.tipo === 'checkbox') {
          const parts = [];
          if (comentario) parts.push(comentario);
          if (valorRaw && valorRaw !== '-') parts.push(valorRaw);
          resposta = parts.join('\n') || '-';
        } else if (perg.tipo === 'name_company') {
          resposta = valorRaw + (comentario ? `\nEmpresa: ${comentario}` : '');
        } else {
          resposta = String(valorRaw);
        }
      }

      const observacao = (perg.tipo !== 'checkbox' && perg.tipo !== 'name_company') ? (comentario || '') : '';
      const hasContent = resposta !== '-' || assinatura || fotosItem.length > 0 || (observacao && observacao.trim() !== '');
      if (hasContent) items.push({ pergunta: perg.pergunta, resposta, assinatura, observacao, fotos: fotosItem });
    });

    if (items.length > 0) allSections.push({ secaoName: secao.nome_secao, items });
  });

  // 4. ADD MERGED ADEQUAÇÕES (DESCRIÇÃO GERAL + DETALHAMENTO)
  {
    const mergedItems = [];
    for (let i = 1; i <= 15; i++) {
      const areaKey = `area_${i}`;
      const descText = descricaoGeralData?.[areaKey];
      const areaDetData = detalhamentoData?.[areaKey];
      const situacaoAtual = areaDetData?.situacao_atual;
      const situacaoAdequada = areaDetData?.situacao_adequada;
      const hasDescText = descText && String(descText).trim() !== '';
      const hasSituacaoAtual = situacaoAtual && (situacaoAtual.status || situacaoAtual.fotos?.length > 0);
      const hasSituacaoAdequada = situacaoAdequada && (situacaoAdequada.status || situacaoAdequada.fotos?.length > 0);

      const tituloArea = areaDetData?.titulo ? String(areaDetData.titulo).trim() : '';
      const hasTitulo = tituloArea !== '';

      if (!hasDescText && !hasTitulo && !hasSituacaoAtual && !hasSituacaoAdequada) continue;

      mergedItems.push({
        pergunta: `ÁREA ${i} CONFORME PLANTA`,
        resposta: String(descText || ''),
        titulo: tituloArea,
        assinatura: null,
        observacao: '',
        fotos: [],
        tipo: 'descricao_geral',
      });

      if (hasSituacaoAtual) {
        mergedItems.push({
          pergunta: 'SITUAÇÃO ATUAL',
          resposta: situacaoAtual.status || '-',
          assinatura: null,
          observacao: '',
          fotos: situacaoAtual.fotos || [],
          tipo: 'situacao',
        });
      }
      if (hasSituacaoAdequada) {
        mergedItems.push({
          pergunta: 'SITUAÇÃO ADEQUADA',
          resposta: situacaoAdequada.status || '-',
          assinatura: null,
          observacao: '',
          fotos: situacaoAdequada.fotos || [],
          tipo: 'situacao',
        });
      }
    }
    if (mergedItems.length > 0) allSections.push({ secaoName: 'DETALHAMENTO DAS ADEQUAÇÕES', items: mergedItems });
  }

  // 6. ADD DECLARAÇÕES (always last)
  let declaracoesData = relatorio.declaracoes;
  if (typeof declaracoesData === 'string') { try { declaracoesData = JSON.parse(declaracoesData); } catch { declaracoesData = null; } }
  if (declaracoesData && typeof declaracoesData === 'object' && Object.keys(declaracoesData).length > 0) {
    const tipos = ['locatario', 'proprietario', 'condominio', 'condominio_2', 'consultor', 'proprietario_2'];
    const labels = ['Representante LOCATÁRIO', 'Representante PROPRIETÁRIO', 'Representante CONDOMÍNIO', 'Representante CONDOMÍNIO', 'CONSULTOR RESPONSÁVEL', 'Representante PROPRIETÁRIO'];
    const decItems = [{
      pergunta: 'Os representantes abaixo declaram ter participado da 1ª vistoria de devolução de unidade e informam que estão de acordo com as informações apresentadas neste laudo',
      resposta: '-',
      assinatura: null,
      observacao: '',
      fotos: [],
      isDeclarativeText: true
    }];
    tipos.forEach((tipo, idx) => {
      const dadosTipo = declaracoesData[tipo] || {};
      decItems.push({
        pergunta: labels[idx],
        resposta: dadosTipo.nome || '',
        assinatura: dadosTipo.assinatura || null,
        observacao: dadosTipo.empresa || '',
        fotos: [],
        isSignatureBlock: true
      });
    });
    allSections.push({ secaoName: 'DECLARAÇÕES (1º VISTORIA)', items: decItems });
  }

  return allSections;
};

export default function VisualizarRelatorioSaida() {
  const navigate = useNavigate();
  const location = useLocation();
  const relatorioId = new URLSearchParams(location.search).get('relatorioId');

  const [relatorio, setRelatorio] = useState(null);
  const [empreendimento, setEmpreendimento] = useState(null);
  const [unidade, setUnidade] = useState(null);
  const [formulario, setFormulario] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.documentElement.style.colorScheme = 'light';
    return () => { document.documentElement.style.colorScheme = ''; };
  }, []);

  useEffect(() => {
    if (!isValidId(relatorioId)) { setError('ID do relatório inválido.'); setLoading(false); return; }
    const fetch = async () => {
      try {
        const rel = await base44.entities.RelatorioSaida.get(relatorioId);
        if (!rel) throw new Error('Relatório não encontrado.');
        setRelatorio(rel);

        const [emp, uni] = await Promise.allSettled([
          rel.id_empreendimento ? base44.entities.Empreendimento.get(rel.id_empreendimento) : Promise.resolve(null),
          rel.id_unidade ? base44.entities.UnidadeEmpreendimento.get(rel.id_unidade) : Promise.resolve(null),
        ]);
        if (emp.status === 'fulfilled') setEmpreendimento(emp.value);
        if (uni.status === 'fulfilled') setUnidade(uni.value);

        let form = null;
        if (rel.id_formulario) {
          try { form = await base44.entities.FormularioVistoria.get(rel.id_formulario); } catch {}
        }
        if (!form && rel.estrutura_formulario?.length > 0) {
          form = { secoes: rel.estrutura_formulario };
        }
        setFormulario(form);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [relatorioId]);

  const [contentPages, setContentPages] = useState([]);
  useEffect(() => {
    if (!relatorio || !formulario) return;
    const timer = setTimeout(() => {
      const allSections = processData(relatorio, formulario);
      setContentPages(paginateSaidaContent(allSections, {
        firstPageExtraHeightPx: estimateDadosPageHeightPx(relatorio),
      }));
    }, 100);
    return () => clearTimeout(timer);
  }, [relatorio, formulario]);

  const galleryPhotos = extractSaidaGalleryPhotos(relatorio);
  const hasGalleryPhotos = galleryPhotos.length > 0;
  const contentPageCount = Math.max(1, contentPages.length);
  const totalPages = 1 + contentPageCount + (hasGalleryPhotos ? 1 : 0); // cover + content + optional QR page

  useEffect(() => {
    if (!relatorio) return;
    const previousTitle = document.title;
    document.title = resolvePdfFileName(relatorio);
    return () => {
      document.title = previousTitle;
    };
  }, [relatorio]);

  const handlePrint = async () => {
    await new Promise(r => setTimeout(r, 50));
    window.print();
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      <p className="mt-4 text-gray-600">Carregando relatório...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
      <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
      <h2 className="text-xl font-bold text-red-700 mb-2">Erro ao carregar relatório</h2>
      <p className="text-gray-600 mb-6">{error}</p>
      <Button onClick={() => navigate(-1)}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button>
    </div>
  );

  return (
    <div className="bg-gray-200 print:bg-white min-h-screen font-sans">
      <div className="no-print shadow-sm border-b p-4 mb-4 bg-white">
        <div className="flex justify-between items-center max-w-4xl mx-auto">
          <Button onClick={() => navigate(-1)} variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Button>
          <h1 className="text-xl font-semibold text-gray-800">Visualizar Relatório de Saída</h1>
          <Button onClick={handlePrint} className="bg-green-600 hover:bg-green-700 text-white"><Printer className="w-4 h-4 mr-2" />Gerar PDF</Button>
        </div>
      </div>

      <div className="report-container max-w-4xl mx-auto" style={{ padding: 0 }}>
        <ReportPageLayout pageNumber={1} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
          <CoverPage relatorio={relatorio} empreendimento={empreendimento} unidade={unidade} />
        </ReportPageLayout>

        <ReportPageLayout pageNumber={2} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
          <div>
            <DadosPage relatorio={relatorio} empreendimento={empreendimento} unidade={unidade} />
            {contentPages.length > 0 && <ContentPage sections={contentPages[0]} />}
          </div>
        </ReportPageLayout>

        {contentPages.slice(1).map((sections, idx) => (
          <ReportPageLayout key={idx} pageNumber={3 + idx} totalPages={totalPages} relatorio={relatorio} empreendimento={empreendimento}>
            <ContentPage sections={sections} />
          </ReportPageLayout>
        ))}

        {hasGalleryPhotos && (
          <ReportPageLayout
            pageNumber={2 + contentPageCount}
            totalPages={totalPages}
            relatorio={relatorio}
            empreendimento={empreendimento}
          >
            <QRCodesPage relatorio={relatorio} photosCount={galleryPhotos.length} />
          </ReportPageLayout>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@700&family=Poppins:wght@400;600;700&display=swap');
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        @page { size: A4 portrait; margin: 0; }
        .report-page { width: 210mm; height: 297mm; position: relative; background: white; overflow: hidden; }
        @media screen { .report-page { margin: 20px auto; box-shadow: 0 0 10px rgba(0,0,0,0.1); } }
        @media print {
          .no-print, aside, header, nav { display: none !important; }
          html, body { margin: 0 !important; padding: 0 !important; background: white !important; width: 210mm !important; }
          body, body > div, main { padding: 0 !important; margin: 0 !important; }
          .lg\\:pl-72 { padding-left: 0 !important; }
          .report-container { max-width: none !important; margin: 0 !important; padding: 0 !important; width: 210mm !important; }
          .report-page { page-break-after: always; width: 210mm !important; height: 297mm !important; margin: 0 !important; box-shadow: none !important; overflow: hidden !important; }
          .report-page:last-child { page-break-after: auto; }
          html, body, * { overflow: visible !important; scrollbar-width: none !important; }
          *::-webkit-scrollbar { display: none !important; }
        }
      `}</style>
    </div>
  );
}