import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { RespostaVistoria } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Loader2, AlertTriangle, Download, ExternalLink } from 'lucide-react';

const translations = {
  pt: {
    title: "Galeria do Relatório",
    loading: "Carregando galeria...",
    errorTitle: "Erro ao Carregar Galeria",
    back: "Voltar",
    noPhotos: "Nenhuma foto encontrada neste relatório.",
    downloadPhoto: "Baixar Foto",
    openPhoto: "Abrir Foto",
    photoFrom: "Foto de",
    downloadAll: "Baixar Todas",
  },
  en: {
    title: "Report Gallery",
    loading: "Loading gallery...",
    errorTitle: "Error Loading Gallery",
    back: "Back",
    noPhotos: "No photos found in this report.",
    downloadPhoto: "Download Photo",
    openPhoto: "Open Photo", 
    photoFrom: "Photo from",
    downloadAll: "Download All",
  }
};

const isMobile = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const downloadImage = async (url, filename) => {
  try {
    if (isMobile()) {
      // Em dispositivos móveis, abre a imagem em nova aba para o usuário salvar manualmente
      window.open(url, '_blank');
    } else {
      // Em desktop, força o download
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    }
  } catch (error) {
    console.error('Erro ao baixar imagem:', error);
    // Fallback: abre a imagem em nova aba
    window.open(url, '_blank');
  }
};

const downloadAllImages = async (photos) => {
  if (isMobile()) {
    // Em mobile, abre cada imagem em nova aba sequencialmente
    photos.forEach((photo, index) => {
      setTimeout(() => {
        window.open(photo.url, '_blank');
      }, index * 500); // Delay de 500ms entre cada abertura
    });
  } else {
    // Em desktop, baixa todas as imagens
    photos.forEach(async (photo, index) => {
      const filename = `foto-${index + 1}-${photo.legenda ? photo.legenda.replace(/[^a-zA-Z0-9]/g, '_') : 'sem_legenda'}.jpg`;
      await downloadImage(photo.url, filename);
    });
  }
};

export default function GaleriaRelatorio(props) {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const respostaId = urlParams.get('respostaId');

  const [vistoria, setVistoria] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [allPhotos, setAllPhotos] = useState([]);

  const [language] = useState('pt');
  const t = translations[language];

  useEffect(() => {
    const loadData = async () => {
      if (!respostaId) {
        setError('ID da vistoria não encontrado');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const vistoriaData = await RespostaVistoria.get(respostaId);
        if (!vistoriaData) throw new Error("Vistoria não encontrada");
        
        setVistoria(vistoriaData);
        
        // Processar fotos
        const fotosProcessadas = [];
        let fotosRaw = vistoriaData.fotos_secoes;
        
        while (typeof fotosRaw === 'string') {
          try {
            fotosRaw = JSON.parse(fotosRaw);
          } catch (e) {
            console.error("Não foi possível parsear as fotos:", e);
            fotosRaw = {};
            break;
          }
        }

        if (typeof fotosRaw === 'object' && fotosRaw !== null) {
          Object.entries(fotosRaw).forEach(([chave, fotos]) => {
            if (Array.isArray(fotos)) {
              fotos.forEach((foto, index) => {
                if (foto && foto.url) {
                  fotosProcessadas.push({
                    ...foto,
                    secao: chave,
                    index: index
                  });
                }
              });
            }
          });
        }
        
        setAllPhotos(fotosProcessadas);
      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [respostaId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-8 bg-gray-100">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-600">{t.loading}</p>
      </div>
    );
  }

  if (error || !vistoria) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-8 bg-gray-100">
        <div className="text-center bg-white p-10 rounded-lg shadow-xl max-w-2xl">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-3" />
          <h2 className="text-2xl font-bold mb-3 text-gray-800">{t.errorTitle}</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            {error}
          </p>
          <Button onClick={() => window.history.back()} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.back}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t.title}</h1>
            <p className="text-gray-600 mt-1">
              {vistoria.nome_vistoria} • {allPhotos.length} foto{allPhotos.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            {allPhotos.length > 0 && (
              <Button 
                onClick={() => downloadAllImages(allPhotos)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Download className="w-4 h-4 mr-2" />
                {t.downloadAll}
              </Button>
            )}
            <Button onClick={() => window.history.back()} variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t.back}
            </Button>
          </div>
        </div>

        {allPhotos.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-gray-600 text-lg">{t.noPhotos}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {allPhotos.map((foto, index) => (
              <Card key={index} className="group hover:shadow-lg transition-shadow duration-300">
                <div className="relative aspect-square overflow-hidden rounded-t-lg">
                  <img
                    src={foto.url}
                    alt={foto.legenda || `Foto ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2 flex gap-1">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="w-8 h-8 bg-white/80 hover:bg-white backdrop-blur-sm"
                      onClick={() => downloadImage(foto.url, `foto-${index + 1}.jpg`)}
                      title={isMobile() ? t.openPhoto : t.downloadPhoto}
                    >
                      {isMobile() ? (
                        <ExternalLink className="w-4 h-4" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <Badge variant="outline" className="text-xs">
                      {t.photoFrom} {foto.secao.replace('secao_', '').replace('_pergunta_', '.')}
                    </Badge>
                    {foto.legenda && (
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {foto.legenda}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}