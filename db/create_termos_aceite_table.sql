-- Migration: cria a tabela termos_aceite para armazenar TermoDeAceite
-- Executar: psql "<DATABASE_URL>" -f db/create_termos_aceite_table.sql

CREATE TABLE IF NOT EXISTS termos_aceite (
    id BIGSERIAL PRIMARY KEY,
    id_formulario TEXT,
    id_unidade BIGINT REFERENCES public.unidades_empreendimento(id) ON DELETE SET NULL,
    id_empreendimento BIGINT REFERENCES empreendimentos(id) ON DELETE CASCADE,
    estrutura_formulario JSONB,
    nome_termo TEXT NOT NULL,
    nome_arquivo TEXT,
    data_termo TIMESTAMP WITH TIME ZONE,
    data_relatorio TIMESTAMP WITH TIME ZONE,
    consultor_responsavel TEXT,
    participantes TEXT,
    texto_os_proposta TEXT,
    texto_escopo_consultoria TEXT,
    revisao TEXT,
    respostas JSONB,
    fotos_secoes JSONB,
    status_termo TEXT DEFAULT 'Em Andamento',
    observacoes_secoes JSONB,
    assinaturas JSONB,
    created_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_date TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_termos_aceite_id_empreendimento ON termos_aceite(id_empreendimento);
CREATE INDEX IF NOT EXISTS idx_termos_aceite_id_unidade ON termos_aceite(id_unidade);

-- Trigger para atualizar updated_date automaticamente
CREATE OR REPLACE FUNCTION termos_aceite_set_updated_date()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_date = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_updated_date_termos ON termos_aceite;
CREATE TRIGGER trg_set_updated_date_termos
BEFORE UPDATE ON termos_aceite
FOR EACH ROW
EXECUTE PROCEDURE termos_aceite_set_updated_date();
