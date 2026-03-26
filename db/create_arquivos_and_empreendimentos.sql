-- Migration: create arquivos table and ensure fotos_empreendimento column

-- 1) Create arquivos table (stores uploaded file data)
CREATE TABLE IF NOT EXISTS public.arquivos (
  id BIGSERIAL PRIMARY KEY,
  nome_original VARCHAR(255),
  mime_type VARCHAR(100),
  tamanho INTEGER,
  dados BYTEA,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2) Ensure empreendimentos table exists (minimal fields) — safe: IF NOT EXISTS
CREATE TABLE IF NOT EXISTS public.empreendimentos (
  id BIGSERIAL PRIMARY KEY,
  nome_empreendimento TEXT NOT NULL,
  foto_empreendimento TEXT,
  fotos_empreendimento JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3) If empreendimentos exists but missing fotos_empreendimento, add the column
ALTER TABLE IF EXISTS public.empreendimentos
  ADD COLUMN IF NOT EXISTS fotos_empreendimento JSONB DEFAULT '[]'::jsonb;

-- 4) Optional: create index for faster JSONB queries (if you will query by keys)
CREATE INDEX IF NOT EXISTS idx_empreendimentos_fotos ON public.empreendimentos ((fotos_empreendimento));

-- End of migration
