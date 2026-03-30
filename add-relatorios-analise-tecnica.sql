CREATE TABLE IF NOT EXISTS public.relatorios_analise_tecnica (
  id BIGSERIAL PRIMARY KEY,
  id_empreendimento BIGINT NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
  id_unidade BIGINT REFERENCES public.unidades_empreendimento(id) ON DELETE SET NULL,
  numero_os TEXT,
  metragem TEXT,
  edificio_pavimento TEXT,
  nome_arquivo TEXT,
  data_emissao DATE,
  fase_emissao TEXT,
  revisoes JSONB,
  lista_arquivos JSONB,
  projetos JSONB,
  instalacoes_eletricas JSONB,
  instalacoes_hidraulicas JSONB,
  projeto_legal_bombeiro JSONB,
  instalacoes_hvac JSONB,
  conclusao JSONB,
  nota_geral TEXT,
  titulo_capa TEXT,
  subtitulo_capa TEXT,
  texto_rodape_capa TEXT,
  status_relatorio TEXT DEFAULT 'Rascunho',
  consultor_responsavel TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS relatorios_analise_tecnica_set_updated_at ON public.relatorios_analise_tecnica;
CREATE TRIGGER relatorios_analise_tecnica_set_updated_at
BEFORE UPDATE ON public.relatorios_analise_tecnica
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_rat_empreendimento ON public.relatorios_analise_tecnica (id_empreendimento);
CREATE INDEX IF NOT EXISTS idx_rat_unidade ON public.relatorios_analise_tecnica (id_unidade);
CREATE INDEX IF NOT EXISTS idx_rat_data_emissao ON public.relatorios_analise_tecnica (data_emissao);
CREATE INDEX IF NOT EXISTS idx_rat_status ON public.relatorios_analise_tecnica (status_relatorio);
