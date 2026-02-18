import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AtaReuniao, Empreendimento as EmpreendimentoEntity } from '@/api/entities';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';

export default function EmpreendimentoAtasReuniao() {
  const navigate = useNavigate();
  const location = useLocation();
  const empreendimentoId = new URLSearchParams(location.search).get('empreendimentoId');
  const [atas, setAtas] = useState([]);
  const [empreendimento, setEmpreendimento] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (empreendimentoId) {
          const emp = await EmpreendimentoEntity.get(empreendimentoId);
          setEmpreendimento(emp);
        }
        const list = await AtaReuniao.filter({ id_empreendimento: empreendimentoId });
        setAtas(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('Erro ao carregar atas:', err);
        setAtas([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [empreendimentoId]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Atas de Reunião {empreendimento ? `- ${empreendimento.nome_empreendimento}` : ''}</h1>
        <div className="flex gap-2">
          <Button onClick={() => navigate(createPageUrl(`EmpreendimentoAtaReuniao?empreendimentoId=${empreendimentoId}`))}>Nova Ata</Button>
        </div>
      </div>

      {loading ? (
        <div>Carregando...</div>
      ) : (
        <div className="space-y-3">
          {atas.length === 0 && <div className="text-gray-500">Nenhuma ata encontrada.</div>}
          {atas.map((a) => (
            <div key={a.id} className="p-4 border rounded bg-white flex items-center justify-between">
              <div>
                <div className="font-semibold">{a.titulo_reuniao || a.titulo_capa || `Ata ${a.id}`}</div>
                <div className="text-sm text-gray-600">{a.data_reuniao ? format(new Date(a.data_reuniao), 'dd/MM/yyyy') : ''}</div>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => navigate(createPageUrl(`VisualizarAtaReuniao?ataId=${a.id}`))}>Visualizar</Button>
                <Button onClick={() => navigate(createPageUrl(`EditarAtaReuniao?ataId=${a.id}`))} variant="outline">Editar</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
