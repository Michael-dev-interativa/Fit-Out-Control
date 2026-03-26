-- Migration: adicionar tabela inspecoes_hidraulica
-- Cria a tabela para armazenar os relatórios de Inspeção Hidráulica

CREATE TABLE IF NOT EXISTS public.inspecoes_hidraulica (
  id BIGSERIAL PRIMARY KEY,
  id_empreendimento BIGINT NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
  data_inspecao DATE NOT NULL,
  titulo_capa TEXT DEFAULT 'RELATÓRIO',
  subtitulo_capa TEXT DEFAULT 'Gerenciamento de Obra',
  texto_rodape_capa TEXT,
  titulo_relatorio TEXT,
  subtitulo_relatorio TEXT,
  cliente TEXT,
  revisao TEXT,
  eng_responsavel TEXT,
  nome_arquivo TEXT,
  itens_documentacao JSONB,
  comentarios_documentacao TEXT,
  locais JSONB,
  observacoes_gerais TEXT,
  conclusao_r01 TEXT,
  conclusao_r02 TEXT,
  assinaturas JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_inspecoes_hidraulica_empreendimento
  ON public.inspecoes_hidraulica (id_empreendimento);

CREATE INDEX IF NOT EXISTS idx_inspecoes_hidraulica_data
  ON public.inspecoes_hidraulica (data_inspecao);

-- Trigger para manter updated_at (assume que a função set_updated_at já existe no schema principal)
DROP TRIGGER IF EXISTS inspecoes_hidraulica_set_updated_at ON public.inspecoes_hidraulica;
CREATE TRIGGER inspecoes_hidraulica_set_updated_at
BEFORE UPDATE ON public.inspecoes_hidraulica
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
