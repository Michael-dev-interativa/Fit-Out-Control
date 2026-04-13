import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const t = {
  title: 'Nova Inspeção de Gás',
  description:
    'Este módulo ainda está em desenvolvimento. Você pode acompanhar o progresso ou voltar para a lista de inspeções de gás.',
  back: 'Voltar para inspeções',
};

export default function NovaInspecaoGas() {
  const navigate = useNavigate();
  const handleBack = () => navigate(createPageUrl('EmpreendimentoInspecaoGas'));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-2xl rounded-xl border border-dashed border-gray-300 bg-white p-8 shadow-sm text-center">
        <h1 className="text-3xl font-semibold text-gray-800 mb-4">{t.title}</h1>
        <p className="text-gray-600 mb-6">{t.description}</p>
        <Button className="mx-auto" variant="ghost" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t.back}
        </Button>
      </div>
    </div>
  );
}
