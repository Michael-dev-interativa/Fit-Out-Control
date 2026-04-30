-- Tabela: inspecoes_vistoria_obra_padrao
CREATE TABLE IF NOT EXISTS public.inspecoes_vistoria_obra_padrao (
  id BIGSERIAL PRIMARY KEY,
  id_empreendimento BIGINT NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
  data_inspecao DATE,
  titulo_relatorio TEXT,
  subtitulo_relatorio TEXT,
  cliente TEXT,
  revisao TEXT,
  eng_responsavel TEXT,
  nome_arquivo TEXT,
  itens_documentacao JSONB,
  secoes JSONB, -- Estrutura das seções e perguntas
  observacoes_gerais TEXT,
  assinaturas JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS inspecoes_vistoria_obra_padrao_set_updated_at ON public.inspecoes_vistoria_obra_padrao;
CREATE TRIGGER inspecoes_vistoria_obra_padrao_set_updated_at
BEFORE UPDATE ON public.inspecoes_vistoria_obra_padrao
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_inspecoes_vistoria_obra_padrao_empreendimento
  ON public.inspecoes_vistoria_obra_padrao (id_empreendimento);
CREATE INDEX IF NOT EXISTS idx_inspecoes_vistoria_obra_padrao_data
  ON public.inspecoes_vistoria_obra_padrao (data_inspecao);
CREATE INDEX IF NOT EXISTS idx_inspecoes_vistoria_obra_padrao_revisao
  ON public.inspecoes_vistoria_obra_padrao (revisao);
