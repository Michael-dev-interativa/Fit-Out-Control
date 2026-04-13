-- Migration: create inspecoes_gas table

CREATE TABLE IF NOT EXISTS public.inspecoes_gas (
  id BIGSERIAL PRIMARY KEY,
  id_empreendimento BIGINT NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
  data_inspecao DATE,
  titulo_capa TEXT,
  subtitulo_capa TEXT,
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

DROP TRIGGER IF EXISTS inspecoes_gas_set_updated_at ON public.inspecoes_gas;
CREATE TRIGGER inspecoes_gas_set_updated_at
BEFORE UPDATE ON public.inspecoes_gas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_inspecoes_gas_empreendimento
  ON public.inspecoes_gas (id_empreendimento);
CREATE INDEX IF NOT EXISTS idx_inspecoes_gas_data
  ON public.inspecoes_gas (data_inspecao);
CREATE INDEX IF NOT EXISTS idx_inspecoes_gas_revisao
  ON public.inspecoes_gas (revisao);
