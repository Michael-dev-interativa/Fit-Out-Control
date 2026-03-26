
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
      // Precisamos do `empreendimentoId` para acessar a página.
      // Se `unidadeId` não for fornecido ou inválido, apenas carregamos o empreendimento.
      if (!isValidId(empreendimentoId)) {
        setError(new Error(`IDs inválidos - Unidade: '${unidadeId}', Empreendimento: '${empreendimentoId}'`));
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Carrega empreendimento sempre — com tentativas em caso de 429/transientes
        const maxAttempts = 3;
        let empreendimentoData = null;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          try {
            empreendimentoData = await Empreendimento.get(empreendimentoId);
            if (empreendimentoData) break;
          } catch (err) {
            console.warn(`Tentativa ${attempt + 1} para Empreendimento falhou:`, err);
            if (attempt < maxAttempts - 1) {
              // backoff
              const delay = 500 * Math.pow(2, attempt);
              await new Promise(res => setTimeout(res, delay));
              continue;
            } else {
              throw err;
            }
          }
        }
        if (!empreendimentoData) {
          throw new Error(`Empreendimento não encontrado com ID: ${empreendimentoId}`);
        }

        setEmpreendimento(empreendimentoData);

        // Se houver unidadeId válido, tentamos buscar a unidade, mas não falhamos se der erro (429, 500, etc.)
        if (isValidId(unidadeId)) {
          try {
            const unidadeData = await UnidadeEmpreendimento.get(unidadeId);
            if (unidadeData && String(unidadeData.id_empreendimento) === String(empreendimentoId)) {
              setUnidade(unidadeData);
            } else {
              // Unidade não pertence ao empreendimento ou não encontrada — apenas logamos e seguimos sem unidade
              console.warn(`Unidade ${unidadeId} não encontrada ou não pertence ao empreendimento ${empreendimentoId}`);
              setUnidade(null);
            }
          } catch (innerErr) {
            // Não convertendo isso em erro global — permitimos a página funcionar sem unidade.
            console.warn('Falha ao carregar unidade (permitido):', innerErr);
            setUnidade(null);
          }
        } else {
          // Sem unidadeId => mantemos unidade nula
          setUnidade(null);
        }

      } catch (err) {
        console.error('Erro ao carregar dados do empreendimento:', err);
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
