
import { useState, useEffect } from 'react';
import { Empreendimento } from '@/api/entities';
import { UnidadeEmpreendimento } from '@/api/entities';

export function useUnidadeData(unidadeId, empreendimentoId) {
  const [unidade, setUnidade] = useState(null);
  const [empreendimento, setEmpreendimento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Função para validar IDs - VERSÃO MELHORADA
  const isValidId = (id) => {
    if (id === null || id === undefined) return false;
    const cleanId = String(id).trim();
    // Verifica se não é vazio, não é marcador inválido
    const invalidMarkers = ['-', 'null', 'undefined'];
    if (cleanId === '' || invalidMarkers.includes(cleanId.toLowerCase())) return false;
    return true;
  };

  useEffect(() => {
    const loadData = async () => {
      // Verificar se os IDs são válidos antes de tentar carregar
      if (!isValidId(unidadeId) || !isValidId(empreendimentoId)) {
        setError(new Error(`IDs inválidos - Unidade: '${unidadeId}', Empreendimento: '${empreendimentoId}'`));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Carregar dados da unidade e empreendimento em paralelo
        const [unidadeData, empreendimentoData] = await Promise.all([
          UnidadeEmpreendimento.get(unidadeId),
          Empreendimento.get(empreendimentoId)
        ]);

        if (!unidadeData) {
          throw new Error(`Unidade não encontrada com ID: ${unidadeId}`);
        }

        if (!empreendimentoData) {
          throw new Error(`Empreendimento não encontrado com ID: ${empreendimentoId}`);
        }

        // Verificar se a unidade pertence ao empreendimento (normalizando tipos)
        if (String(unidadeData.id_empreendimento) !== String(empreendimentoId)) {
          throw new Error(`A unidade ${unidadeId} não pertence ao empreendimento ${empreendimentoId}`);
        }

        setUnidade(unidadeData);
        setEmpreendimento(empreendimentoData);

      } catch (err) {
        console.error('Erro ao carregar dados da unidade:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [unidadeId, empreendimentoId]);

  return {
    unidade,
    empreendimento,
    loading,
    error
  };
}
