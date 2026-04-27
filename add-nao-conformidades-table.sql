CREATE TABLE IF NOT EXISTS public.nao_conformidades (
  id BIGSERIAL PRIMARY KEY,
  id_empreendimento BIGINT NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
  data_vistoria DATE,
  titulo_capa TEXT DEFAULT 'RELATÓRIO',
  subtitulo_capa TEXT DEFAULT 'Gerenciamento de Obra',
  texto_rodape_capa TEXT,
  titulo_relatorio TEXT,
  subtitulo_relatorio TEXT,
  cliente TEXT,
  revisao TEXT,
  eng_obra TEXT,
  nome_arquivo TEXT,
  secoes JSONB,
  assinaturas JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS nao_conformidades_set_updated_at ON public.nao_conformidades;
CREATE TRIGGER nao_conformidades_set_updated_at
BEFORE UPDATE ON public.nao_conformidades
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_nao_conformidades_empreendimento
  ON public.nao_conformidades (id_empreendimento);
CREATE INDEX IF NOT EXISTS idx_nao_conformidades_data
  ON public.nao_conformidades (data_vistoria);
CREATE INDEX IF NOT EXISTS idx_nao_conformidades_revisao
  ON public.nao_conformidades (revisao);
