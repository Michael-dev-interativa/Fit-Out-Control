import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
    InspecaoHidrantes, InspecaoHidraulica, InspecaoSprinklers,
    InspecaoAlarmeIncendio, InspecaoArCondicionado, InspecaoControleAcesso,
    InspecaoCFTV, InspecaoSDAI, InspecaoEletrica, InspecaoGas,
} from '@/api/entities';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2, AlertTriangle, Download, ExternalLink } from 'lucide-react';

const ENTITY_MAP = {
    InspecaoHidrantes,
    InspecaoHidraulica,
    InspecaoSprinklers,
    InspecaoAlarmeIncendio,
    InspecaoArCondicionado,
    InspecaoControleAcesso,
    InspecaoCFTV,
    InspecaoSDAI,
    InspecaoEletrica,
    InspecaoGas,
};

const ENTITY_LABELS = {
    InspecaoHidrantes: 'Inspeção de Hidrantes',
    InspecaoHidraulica: 'Inspeção Hidráulica',
    InspecaoSprinklers: 'Inspeção de Sprinklers',
    InspecaoAlarmeIncendio: 'Inspeção de Alarme de Incêndio',
    InspecaoArCondicionado: 'Inspeção de Ar-Condicionado',
    InspecaoControleAcesso: 'Inspeção de Controle de Acesso',
    InspecaoCFTV: 'Inspeção de CFTV',
    InspecaoSDAI: 'Inspeção de SDAI',
    InspecaoEletrica: 'Inspeção Elétrica',
    InspecaoGas: 'Inspeção de Gás',
};

function extractAllFotos(obj) {
    const fotos = [];
    if (!obj || typeof obj !== 'object') return fotos;
    if (Array.isArray(obj)) {
        obj.forEach(item => fotos.push(...extractAllFotos(item)));
        return fotos;
    }
    Object.entries(obj).forEach(([key, value]) => {
        if (key === 'fotos' && Array.isArray(value)) {
            value.forEach(foto => {
                if (foto && foto.url) fotos.push(foto);
            });
        } else if (typeof value === 'object' && value !== null) {
            fotos.push(...extractAllFotos(value));
        }
    });
    return fotos;
}

const isMobile = () => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

const downloadImage = async (url, filename) => {
    try {
        if (isMobile()) {
            window.open(url, '_blank');
        } else {
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
    } catch {
        window.open(url, '_blank');
    }
};

export default function GaleriaInspecao() {
    const location = useLocation();
    const urlParams = new URLSearchParams(location.search);
    const tipo = urlParams.get('tipo');
    const id = urlParams.get('id');

    const [relatorio, setRelatorio] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [allPhotos, setAllPhotos] = useState([]);

    useEffect(() => {
        const loadData = async () => {
            if (!tipo || !id) {
                setError('Parâmetros inválidos');
                setLoading(false);
                return;
            }
            const entity = ENTITY_MAP[tipo];
            if (!entity) {
                setError(`Tipo de inspeção desconhecido: ${tipo}`);
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const data = await entity.get(id);
                if (!data) throw new Error('Relatório não encontrado');
                setRelatorio(data);
                setAllPhotos(extractAllFotos(data));
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [tipo, id]);

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
                    <h2 className="text-2xl font-bold mb-3 text-gray-800">Erro ao Carregar Galeria</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
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
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Galeria de Fotos</h1>
                        <p className="text-gray-600 mt-1">
                            {ENTITY_LABELS[tipo] || tipo} • {allPhotos.length} foto{allPhotos.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {allPhotos.length > 0 && (
                            <Button
                                onClick={() => allPhotos.forEach((foto, i) => {
                                    setTimeout(() => downloadImage(foto.url, `foto-${i + 1}.jpg`), i * 300);
                                })}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Baixar Todas
                            </Button>
                        )}
                        <Button onClick={() => window.history.back()} variant="outline">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Voltar
                        </Button>
                    </div>
                </div>

                {allPhotos.length === 0 ? (
                    <Card className="text-center py-12">
                        <CardContent>
                            <p className="text-gray-600 text-lg pt-6">Nenhuma foto encontrada neste relatório.</p>
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
                                    <div className="absolute top-2 right-2">
                                        <Button
                                            size="icon"
                                            variant="secondary"
                                            className="w-8 h-8 bg-white/80 hover:bg-white backdrop-blur-sm"
                                            onClick={() => downloadImage(foto.url, `foto-${index + 1}.jpg`)}
                                        >
                                            {isMobile() ? (
                                                <ExternalLink className="w-4 h-4" />
                                            ) : (
                                                <Download className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                                {foto.legenda && (
                                    <CardContent className="p-4">
                                        <p className="text-sm text-gray-600">{foto.legenda}</p>
                                    </CardContent>
                                )}
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
