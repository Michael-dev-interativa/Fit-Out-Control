import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const t = {
  title: 'Editar Inspeção de Gás',
  description:
    'A edição de inspeções de gás também está em fase de implantação. Por enquanto apenas visualizamos o relatório e a lista principal.',
  back: 'Retornar à inspeção',
};

export default function EditarInspecaoGas() {
  const navigate = useNavigate();
  const location = useLocation();
  const relatorioId = new URLSearchParams(location.search).get('inspecaoId');

  const handleBack = () => navigate(createPageUrl('EmpreendimentoInspecaoGas'));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-2xl rounded-xl border border-dashed border-gray-300 bg-white p-8 shadow-sm text-center">
        <h1 className="text-3xl font-semibold text-gray-800 mb-4">{t.title}</h1>
        <p className="text-gray-600 mb-4">{t.description}</p>
        {relatorioId && (
          <p className="text-sm text-gray-500 mb-4">
            Relatório aguardando edição: <strong>{relatorioId}</strong>
          </p>
        )}
        <Button className="mx-auto" variant="ghost" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t.back}
        </Button>
      </div>
    </div>
  );
}
