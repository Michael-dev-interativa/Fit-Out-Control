import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { RelatorioSaida } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2, AlertTriangle, Download } from 'lucide-react';

const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const downloadImage = async (url, filename) => {
  try {
    if (isMobile()) {
      window.open(url, '_blank');
      return;
    }
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
  } catch {
    window.open(url, '_blank');
  }
};

const extractPhotosFromRelatorioSaida = (relatorio) => {
  const allPhotos = [];

  let fotosSecoes = relatorio?.fotos_secoes;
  if (typeof fotosSecoes === 'string') {
    try { fotosSecoes = JSON.parse(fotosSecoes); } catch { fotosSecoes = {}; }
  }

  if (fotosSecoes && typeof fotosSecoes === 'object') {
    Object.entries(fotosSecoes).forEach(([secao, fotos]) => {
      if (!Array.isArray(fotos)) return;
      fotos.forEach((foto, index) => {
        const url = typeof foto === 'string' ? foto : foto?.url;
        if (!url) return;
        allPhotos.push({
          url,
          legenda: typeof foto === 'object' ? foto?.legenda || '' : '',
          secao,
          index,
        });
      });
    });
  }

  let detalhamento = relatorio?.detalhamento_adequacoes;
  if (typeof detalhamento === 'string') {
    try { detalhamento = JSON.parse(detalhamento); } catch { detalhamento = {}; }
  }

  if (detalhamento && typeof detalhamento === 'object') {
    Object.entries(detalhamento).forEach(([areaKey, areaData]) => {
      ['situacao_atual', 'situacao_adequada'].forEach((situacaoKey) => {
        const fotos = areaData?.[situacaoKey]?.fotos;
        if (!Array.isArray(fotos)) return;
        fotos.forEach((foto, index) => {
          const url = typeof foto === 'string' ? foto : foto?.url;
          if (!url) return;
          allPhotos.push({
            url,
            legenda: typeof foto === 'object' ? foto?.legenda || '' : '',
            secao: `${areaKey} - ${situacaoKey}`,
            index,
          });
        });
      });
    });
  }

  return allPhotos;
};

export default function GaleriaRelatorioSaida() {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const relatorioId = urlParams.get('relatorioId');

  const [relatorio, setRelatorio] = useState(null);
  const [allPhotos, setAllPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      if (!relatorioId) {
        setError('ID do relatório não encontrado');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const relatorioData = await RelatorioSaida.get(relatorioId);
        if (!relatorioData) throw new Error('Relatório de saída não encontrado');

        setRelatorio(relatorioData);
        setAllPhotos(extractPhotosFromRelatorioSaida(relatorioData));
      } catch (err) {
        setError(err?.message || 'Erro ao carregar galeria');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [relatorioId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-8 bg-gray-100">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
        <p className="text-gray-600">Carregando galeria...</p>
      </div>
    );
  }

  if (error || !relatorio) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-8 bg-gray-100">
        <div className="text-center bg-white p-10 rounded-lg shadow-xl max-w-2xl">
          <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-3" />
          <h2 className="text-2xl font-bold mb-3 text-gray-800">Erro ao carregar galeria</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">{error}</p>
          <Button onClick={() => window.history.back()} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
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
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Galeria do Relatório de Saída</h1>
            <p className="text-gray-600 mt-1">
              {relatorio?.locatario || relatorio?.nome_vistoria || 'Relatório'} • {allPhotos.length} foto{allPhotos.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Button onClick={() => window.history.back()} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>

        {allPhotos.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <p className="text-gray-600 text-lg">Nenhuma foto encontrada neste relatório.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {allPhotos.map((foto, index) => (
              <Card key={`${foto.url}-${index}`} className="group hover:shadow-lg transition-shadow duration-300">
                <div className="relative aspect-square overflow-hidden rounded-t-lg">
                  <img
                    src={foto.url}
                    alt={foto.legenda || `Foto ${index + 1}`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <CardContent className="p-4">
                  <p className="font-medium text-sm text-gray-800 mb-2 line-clamp-2">
                    {foto.legenda || `Foto ${index + 1}`}
                  </p>
                  <p className="text-xs text-gray-500 mb-3">{foto.secao}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => downloadImage(foto.url, `relatorio-saida-foto-${index + 1}.jpg`)}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Baixar Foto
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
