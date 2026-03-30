-- Migration: adicionar tabela inspecoes_eletrica
-- Cria a tabela para armazenar os relatórios de Inspeção Elétrica

CREATE TABLE IF NOT EXISTS public.inspecoes_eletrica (
  id BIGSERIAL PRIMARY KEY,
  id_empreendimento BIGINT NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
  data_inspecao DATE,
  titulo_capa TEXT,
  subtitulo_capa TEXT,
  texto_rodape_capa TEXT,
  titulo_inspecao TEXT,
  descricao_inspecao TEXT,
  titulo_relatorio TEXT,
  subtitulo_relatorio TEXT,
  cliente TEXT,
  revisao TEXT,
  eng_responsavel TEXT,
  nome_arquivo TEXT,
  titulo_secao_inspecao TEXT,
  label_local TEXT,
  itens_documentacao JSONB,
  comentarios_documentacao TEXT,
  locais JSONB,
  distribuicao_eletrica JSONB,
  observacoes_gerais TEXT,
  conclusao TEXT,
  conclusao_r01 TEXT,
  conclusao_r02 TEXT,
  assinaturas JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_inspecoes_eletrica_empreendimento
  ON public.inspecoes_eletrica (id_empreendimento);

CREATE INDEX IF NOT EXISTS idx_inspecoes_eletrica_data
  ON public.inspecoes_eletrica (data_inspecao);

CREATE INDEX IF NOT EXISTS idx_inspecoes_eletrica_revisao
  ON public.inspecoes_eletrica (revisao);

DROP TRIGGER IF EXISTS inspecoes_eletrica_set_updated_at ON public.inspecoes_eletrica;
CREATE TRIGGER inspecoes_eletrica_set_updated_at
BEFORE UPDATE ON public.inspecoes_eletrica
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();