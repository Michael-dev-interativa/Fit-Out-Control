-- Schema inicial: tabela empreendimentos
-- Observação: ajuste índices/constraints conforme necessário

CREATE TABLE IF NOT EXISTS public.empreendimentos (
  id BIGSERIAL PRIMARY KEY,
  nome_empreendimento TEXT NOT NULL,
  os_number TEXT,
  sigla_obra TEXT,
  data_inicio_contrato DATE,
  termino_obra_previsto DATE,
  data_sem_entrega DATE,
  data_termino_contrato DATE,
  valor_contratual NUMERIC(14,2),
  prazo_contratual_dias INTEGER,
  endereco_empreendimento TEXT,
  ano_entrega INTEGER,
  idade_imovel INTEGER,
  estilo_arquitetonico TEXT,
  foto_empreendimento TEXT,            -- URL ou caminho
  fotos_empreendimento JSONB,          -- lista de URLs/caminhos
  cli_empreendimento TEXT,             -- pode virar FK futuramente
  texto_capa_rodape TEXT,
  logo_responsavel TEXT,               -- URL ou caminho
  contatos_proprietario JSONB,         -- estrutura livre (lista/objeto)
  bm_contato JSONB,                    -- estrutura livre
  mantenedor_contato JSONB,            -- estrutura livre
  projetistas_contatos JSONB,          -- estrutura livre
  quantidade_pavimentos INTEGER,
  quantidade_conjunto INTEGER,
  particularidades TEXT,
  informacoes_tecnicas TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Trigger para manter updated_at em updates
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS empreendimentos_set_updated_at ON public.empreendimentos;
CREATE TRIGGER empreendimentos_set_updated_at
BEFORE UPDATE ON public.empreendimentos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Tabela: usuarios (autenticação e controle de acesso)
CREATE TABLE IF NOT EXISTS public.usuarios (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  nome TEXT,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user', -- 'admin' | 'cliente' | 'user'
  perfil_cliente BOOLEAN DEFAULT FALSE,
  perfil JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT usuarios_email_unique UNIQUE (email)
);

DROP TRIGGER IF EXISTS usuarios_set_updated_at ON public.usuarios;
CREATE TRIGGER usuarios_set_updated_at
BEFORE UPDATE ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_usuarios_role
  ON public.usuarios (role);
CREATE INDEX IF NOT EXISTS idx_usuarios_perfil_cliente
  ON public.usuarios (perfil_cliente);

-- Tabela: unidades_empreendimento
CREATE TABLE IF NOT EXISTS public.unidades_empreendimento (
  id BIGSERIAL PRIMARY KEY,
  id_empreendimento BIGINT NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
  unidade_empreendimento TEXT NOT NULL,
  cliente_unidade TEXT,
  metragem_unidade NUMERIC(10,2),
  escopo_unidade TEXT,
  contatos JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS unidades_empreendimento_set_updated_at ON public.unidades_empreendimento;
CREATE TRIGGER unidades_empreendimento_set_updated_at
BEFORE UPDATE ON public.unidades_empreendimento
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_unidades_empreendimento_empreendimento
  ON public.unidades_empreendimento (id_empreendimento);
CREATE INDEX IF NOT EXISTS idx_unidades_empreendimento_nome
  ON public.unidades_empreendimento (unidade_empreendimento);

-- Tabela: registros_unidade
CREATE TABLE IF NOT EXISTS public.registros_unidade (
  id BIGSERIAL PRIMARY KEY,
  id_unidade BIGINT NOT NULL REFERENCES public.unidades_empreendimento(id) ON DELETE CASCADE,
  id_registro_anterior BIGINT REFERENCES public.registros_unidade(id) ON DELETE SET NULL,
  item_registro TEXT,
  descricao_registro TEXT,
  comentario_registro TEXT,
  replica_registro TEXT,
  treplica_registro TEXT,
  foto_registro TEXT,
  comentario_foto TEXT,
  status TEXT,
  data_inclusao_registro DATE,
  tipo_registro TEXT,
  disciplina TEXT,
  emissao_registro DATE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS registros_unidade_set_updated_at ON public.registros_unidade;
CREATE TRIGGER registros_unidade_set_updated_at
BEFORE UPDATE ON public.registros_unidade
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_registros_unidade_unidade
  ON public.registros_unidade (id_unidade);
CREATE INDEX IF NOT EXISTS idx_registros_unidade_status
  ON public.registros_unidade (status);
CREATE INDEX IF NOT EXISTS idx_registros_unidade_data
  ON public.registros_unidade (data_inclusao_registro);

-- Tabela: documentos_unidade
CREATE TABLE IF NOT EXISTS public.documentos_unidade (
  id BIGSERIAL PRIMARY KEY,
  id_unidade BIGINT NOT NULL REFERENCES public.unidades_empreendimento(id) ON DELETE CASCADE,
  numero_documento TEXT,
  nome_documento TEXT,
  arquivo TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS documentos_unidade_set_updated_at ON public.documentos_unidade;
CREATE TRIGGER documentos_unidade_set_updated_at
BEFORE UPDATE ON public.documentos_unidade
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_documentos_unidade_unidade
  ON public.documentos_unidade (id_unidade);
CREATE INDEX IF NOT EXISTS idx_documentos_unidade_numero
  ON public.documentos_unidade (numero_documento);

-- Tabela: disciplinas_gerais
CREATE TABLE IF NOT EXISTS public.disciplinas_gerais (
  id BIGSERIAL PRIMARY KEY,
  descricao_disciplina TEXT,
  prefixo_disciplina TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS disciplinas_gerais_set_updated_at ON public.disciplinas_gerais;
CREATE TRIGGER disciplinas_gerais_set_updated_at
BEFORE UPDATE ON public.disciplinas_gerais
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_disciplinas_gerais_prefixo
  ON public.disciplinas_gerais (prefixo_disciplina);
CREATE INDEX IF NOT EXISTS idx_disciplinas_gerais_descricao
  ON public.disciplinas_gerais (descricao_disciplina);

-- Tabela: aps_unidade
CREATE TABLE IF NOT EXISTS public.aps_unidade (
  id BIGSERIAL PRIMARY KEY,
  id_unidade BIGINT NOT NULL REFERENCES public.unidades_empreendimento(id) ON DELETE CASCADE,
  id_anterior BIGINT REFERENCES public.aps_unidade(id) ON DELETE SET NULL,
  item_ap TEXT,
  descricao_ap TEXT,
  comentario_ap TEXT,
  replica_ap TEXT,
  treplica_ap TEXT,
  imagem_ap TEXT,
  comentario_im_ap TEXT,
  disciplina_ap TEXT,
  status TEXT,
  data_inclusao_ap DATE,
  emissao_ap DATE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS aps_unidade_set_updated_at ON public.aps_unidade;
CREATE TRIGGER aps_unidade_set_updated_at
BEFORE UPDATE ON public.aps_unidade
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_aps_unidade_unidade
  ON public.aps_unidade (id_unidade);
CREATE INDEX IF NOT EXISTS idx_aps_unidade_status
  ON public.aps_unidade (status);
CREATE INDEX IF NOT EXISTS idx_aps_unidade_inclusao
  ON public.aps_unidade (data_inclusao_ap);
CREATE INDEX IF NOT EXISTS idx_aps_unidade_emissao
  ON public.aps_unidade (emissao_ap);
CREATE INDEX IF NOT EXISTS idx_aps_unidade_disciplina
  ON public.aps_unidade (disciplina_ap);

-- Tabela: kos_unidade (KO da unidade)
CREATE TABLE IF NOT EXISTS public.kos_unidade (
  id BIGSERIAL PRIMARY KEY,
  id_unidade BIGINT NOT NULL REFERENCES public.unidades_empreendimento(id) ON DELETE CASCADE,
  id_anterior BIGINT REFERENCES public.kos_unidade(id) ON DELETE SET NULL,
  item_ko TEXT,
  descricao_ok TEXT,
  comentario_ko TEXT,
  replica_ko TEXT,
  treplica_ko TEXT,
  imagem_ko TEXT,
  comentario_im_ko TEXT,
  disciplina_ko TEXT,
  status TEXT,
  data_inclusao_ko DATE,
  emissao_ko DATE,
  data_reuniao DATE,
  hora_reuniao TIME,
  participantes_interativa JSONB,
  participantes_condominio JSONB,
  participantes_locatario JSONB,
  os_numero TEXT,
  empreendimento_gerenciador TEXT,
  torre_pavimento_conjunto TEXT,
  metros_quadrados NUMERIC(10,2),
  escopo_servicos_interativa TEXT,
  escopo_servicos_locatario TEXT,
  data_envio_projetos DATE,
  data_inicio_atividades DATE,
  data_previsao_ocupacao DATE,
  particularidades TEXT,
  outras_informacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS kos_unidade_set_updated_at ON public.kos_unidade;
CREATE TRIGGER kos_unidade_set_updated_at
BEFORE UPDATE ON public.kos_unidade
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_kos_unidade_unidade
  ON public.kos_unidade (id_unidade);
CREATE INDEX IF NOT EXISTS idx_kos_unidade_status
  ON public.kos_unidade (status);
CREATE INDEX IF NOT EXISTS idx_kos_unidade_emissao
  ON public.kos_unidade (emissao_ko);
CREATE INDEX IF NOT EXISTS idx_kos_unidade_inclusao
  ON public.kos_unidade (data_inclusao_ko);
CREATE INDEX IF NOT EXISTS idx_kos_unidade_reuniao
  ON public.kos_unidade (data_reuniao);
CREATE INDEX IF NOT EXISTS idx_kos_unidade_os
  ON public.kos_unidade (os_numero);

-- Tabela: vos_unidade (VO da unidade)
CREATE TABLE IF NOT EXISTS public.vos_unidade (
  id BIGSERIAL PRIMARY KEY,
  id_unidade BIGINT NOT NULL REFERENCES public.unidades_empreendimento(id) ON DELETE CASCADE,
  id_anterior BIGINT REFERENCES public.vos_unidade(id) ON DELETE SET NULL,
  item_vo TEXT,
  descricao_vo TEXT,
  comentario_vo TEXT,
  replica_vo TEXT,
  treplica_vo TEXT,
  imagem_vo TEXT,
  comentario_im_vo TEXT,
  disciplina_vo TEXT,
  status TEXT,
  data_inclusao_vo DATE,
  emissao_vo DATE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS vos_unidade_set_updated_at ON public.vos_unidade;
CREATE TRIGGER vos_unidade_set_updated_at
BEFORE UPDATE ON public.vos_unidade
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_vos_unidade_unidade
  ON public.vos_unidade (id_unidade);
CREATE INDEX IF NOT EXISTS idx_vos_unidade_status
  ON public.vos_unidade (status);
CREATE INDEX IF NOT EXISTS idx_vos_unidade_inclusao
  ON public.vos_unidade (data_inclusao_vo);
CREATE INDEX IF NOT EXISTS idx_vos_unidade_emissao
  ON public.vos_unidade (emissao_vo);
CREATE INDEX IF NOT EXISTS idx_vos_unidade_disciplina
  ON public.vos_unidade (disciplina_vo);

-- Tabela: formularios_vistoria
CREATE TABLE IF NOT EXISTS public.formularios_vistoria (
  id BIGSERIAL PRIMARY KEY,
  nome_formulario TEXT,
  descricao_formulario TEXT,
  status_formulario TEXT,
  secoes JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS formularios_vistoria_set_updated_at ON public.formularios_vistoria;
CREATE TRIGGER formularios_vistoria_set_updated_at
BEFORE UPDATE ON public.formularios_vistoria
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_formularios_vistoria_status
  ON public.formularios_vistoria (status_formulario);
CREATE INDEX IF NOT EXISTS idx_formularios_vistoria_nome
  ON public.formularios_vistoria (nome_formulario);

-- Tabela: registros_gerais
CREATE TABLE IF NOT EXISTS public.registros_gerais (
  id BIGSERIAL PRIMARY KEY,
  descricao_registro TEXT,
  tipo_registro TEXT,
  tipo_relatorio TEXT,
  disciplina TEXT,
  emissao_registro DATE,
  numeracao TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS registros_gerais_set_updated_at ON public.registros_gerais;
CREATE TRIGGER registros_gerais_set_updated_at
BEFORE UPDATE ON public.registros_gerais
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_registros_gerais_emissao
  ON public.registros_gerais (emissao_registro);
CREATE INDEX IF NOT EXISTS idx_registros_gerais_tipo
  ON public.registros_gerais (tipo_registro);
CREATE INDEX IF NOT EXISTS idx_registros_gerais_disciplina
  ON public.registros_gerais (disciplina);

-- Tabela: projetos_originais
CREATE TABLE IF NOT EXISTS public.projetos_originais (
  id BIGSERIAL PRIMARY KEY,
  id_empreendimento BIGINT NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
  nome_projeto TEXT,
  disciplina_projeto TEXT,
  arquivo_projeto TEXT,
  descricao_projeto TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS projetos_originais_set_updated_at ON public.projetos_originais;
CREATE TRIGGER projetos_originais_set_updated_at
BEFORE UPDATE ON public.projetos_originais
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_projetos_originais_empreendimento
  ON public.projetos_originais (id_empreendimento);
CREATE INDEX IF NOT EXISTS idx_projetos_originais_nome
  ON public.projetos_originais (nome_projeto);
CREATE INDEX IF NOT EXISTS idx_projetos_originais_disciplina
  ON public.projetos_originais (disciplina_projeto);

-- Tabela: respostas_vistoria
CREATE TABLE IF NOT EXISTS public.respostas_vistoria (
  id BIGSERIAL PRIMARY KEY,
  id_formulario BIGINT NOT NULL REFERENCES public.formularios_vistoria(id) ON DELETE CASCADE,
  id_unidade BIGINT NOT NULL REFERENCES public.unidades_empreendimento(id) ON DELETE CASCADE,
  id_empreendimento BIGINT NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
  estrutura_formulario JSONB,
  nome_vistoria TEXT,
  nome_arquivo TEXT,
  data_vistoria DATE,
  data_relatorio DATE,
  consultor_responsavel TEXT,
  participantes JSONB,
  texto_os_proposta TEXT,
  texto_escopo_consultoria TEXT,
  respostas JSONB,
  fotos_secoes JSONB,
  status_vistoria TEXT,
  observacoes_secoes JSONB,
  pontuacao_total NUMERIC(10,2),
  pontuacao_maxima NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS respostas_vistoria_set_updated_at ON public.respostas_vistoria;
CREATE TRIGGER respostas_vistoria_set_updated_at
BEFORE UPDATE ON public.respostas_vistoria
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_respostas_vistoria_formulario
  ON public.respostas_vistoria (id_formulario);
CREATE INDEX IF NOT EXISTS idx_respostas_vistoria_unidade
  ON public.respostas_vistoria (id_unidade);
CREATE INDEX IF NOT EXISTS idx_respostas_vistoria_empreendimento
  ON public.respostas_vistoria (id_empreendimento);
CREATE INDEX IF NOT EXISTS idx_respostas_vistoria_status
  ON public.respostas_vistoria (status_vistoria);
CREATE INDEX IF NOT EXISTS idx_respostas_vistoria_vistoria
  ON public.respostas_vistoria (data_vistoria);
CREATE INDEX IF NOT EXISTS idx_respostas_vistoria_relatorio
  ON public.respostas_vistoria (data_relatorio);

-- Tabela: manuais_gerais
CREATE TABLE IF NOT EXISTS public.manuais_gerais (
  id BIGSERIAL PRIMARY KEY,
  id_empreendimento BIGINT NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
  nome_manual TEXT,
  tipo_manual TEXT,
  arquivo_manual TEXT,
  descricao_manual TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS manuais_gerais_set_updated_at ON public.manuais_gerais;
CREATE TRIGGER manuais_gerais_set_updated_at
BEFORE UPDATE ON public.manuais_gerais
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_manuais_gerais_empreendimento
  ON public.manuais_gerais (id_empreendimento);
CREATE INDEX IF NOT EXISTS idx_manuais_gerais_nome
  ON public.manuais_gerais (nome_manual);
CREATE INDEX IF NOT EXISTS idx_manuais_gerais_tipo
  ON public.manuais_gerais (tipo_manual);

-- Tabela: particularidades_empreendimento
CREATE TABLE IF NOT EXISTS public.particularidades_empreendimento (
  id BIGSERIAL PRIMARY KEY,
  id_empreendimento BIGINT NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
  titulo_particularidade TEXT,
  descricao_particularidade TEXT,
  meio_formalizacao TEXT,
  data_formalizacao DATE,
  participantes JSONB,
  disciplinas_impactadas JSONB,
  tipo_impacto TEXT,
  prioridade TEXT,
  status TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS particularidades_empreendimento_set_updated_at ON public.particularidades_empreendimento;
CREATE TRIGGER particularidades_empreendimento_set_updated_at
BEFORE UPDATE ON public.particularidades_empreendimento
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_particularidades_empreendimento_empreendimento
  ON public.particularidades_empreendimento (id_empreendimento);
CREATE INDEX IF NOT EXISTS idx_particularidades_empreendimento_status
  ON public.particularidades_empreendimento (status);
CREATE INDEX IF NOT EXISTS idx_particularidades_empreendimento_data
  ON public.particularidades_empreendimento (data_formalizacao);
CREATE INDEX IF NOT EXISTS idx_particularidades_empreendimento_prioridade
  ON public.particularidades_empreendimento (prioridade);

-- Tabela: diarios_obra
CREATE TABLE IF NOT EXISTS public.diarios_obra (
  id BIGSERIAL PRIMARY KEY,
  id_empreendimento BIGINT NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
  id_unidade BIGINT REFERENCES public.unidades_empreendimento(id) ON DELETE SET NULL,
  unidade_texto TEXT,
  nome_arquivo TEXT,
  numero_diario TEXT,
  data_diario DATE,
  condicao_climatica TEXT,
  horas_paralisadas NUMERIC(6,2),
  periodo_trabalhado TEXT,
  efetivo JSONB,
  principais_atividades TEXT,
  ocorrencias_observacoes TEXT,
  fotos JSONB,
  vistos JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS diarios_obra_set_updated_at ON public.diarios_obra;
CREATE TRIGGER diarios_obra_set_updated_at
BEFORE UPDATE ON public.diarios_obra
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_diarios_obra_empreendimento
  ON public.diarios_obra (id_empreendimento);
CREATE INDEX IF NOT EXISTS idx_diarios_obra_unidade
  ON public.diarios_obra (id_unidade);
CREATE INDEX IF NOT EXISTS idx_diarios_obra_data
  ON public.diarios_obra (data_diario);
CREATE INDEX IF NOT EXISTS idx_diarios_obra_numero
  ON public.diarios_obra (numero_diario);

-- Tabela: vistorias_terminalidade
CREATE TABLE IF NOT EXISTS public.vistorias_terminalidade (
  id BIGSERIAL PRIMARY KEY,
  id_empreendimento BIGINT NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
  data_vistoria DATE,
  titulo_relatorio TEXT,
  subtitulo_relatorio TEXT,
  cliente TEXT,
  revisao TEXT,
  eng_obra TEXT,
  secoes JSONB,
  assinaturas JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS vistorias_terminalidade_set_updated_at ON public.vistorias_terminalidade;
CREATE TRIGGER vistorias_terminalidade_set_updated_at
BEFORE UPDATE ON public.vistorias_terminalidade
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_vistorias_terminalidade_empreendimento
  ON public.vistorias_terminalidade (id_empreendimento);
CREATE INDEX IF NOT EXISTS idx_vistorias_terminalidade_data
  ON public.vistorias_terminalidade (data_vistoria);
CREATE INDEX IF NOT EXISTS idx_vistorias_terminalidade_revisao
  ON public.vistorias_terminalidade (revisao);

-- Tabela: relatorios_primeiros_servicos
CREATE TABLE IF NOT EXISTS public.relatorios_primeiros_servicos (
  id BIGSERIAL PRIMARY KEY,
  id_empreendimento BIGINT NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
  cliente TEXT,
  local TEXT,
  solicitante TEXT,
  obra TEXT,
  disciplina TEXT,
  data_relatorio DATE,
  assunto_relatorio TEXT,
  descricao_relatorio TEXT,
  fotos JSONB,
  status TEXT,
  comentarios_status TEXT,
  aprovacoes JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS relatorios_primeiros_servicos_set_updated_at ON public.relatorios_primeiros_servicos;
CREATE TRIGGER relatorios_primeiros_servicos_set_updated_at
BEFORE UPDATE ON public.relatorios_primeiros_servicos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_relatorios_primeiros_servicos_empreendimento
  ON public.relatorios_primeiros_servicos (id_empreendimento);
CREATE INDEX IF NOT EXISTS idx_relatorios_primeiros_servicos_data
  ON public.relatorios_primeiros_servicos (data_relatorio);
CREATE INDEX IF NOT EXISTS idx_relatorios_primeiros_servicos_status
  ON public.relatorios_primeiros_servicos (status);

-- Tabela: inspecoes_hidrantes
CREATE TABLE IF NOT EXISTS public.inspecoes_hidrantes (
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
  comentarios_documentacao TEXT,
  locais JSONB,
  observacoes_gerais TEXT,
  assinaturas JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS inspecoes_hidrantes_set_updated_at ON public.inspecoes_hidrantes;
CREATE TRIGGER inspecoes_hidrantes_set_updated_at
BEFORE UPDATE ON public.inspecoes_hidrantes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_inspecoes_hidrantes_empreendimento
  ON public.inspecoes_hidrantes (id_empreendimento);
CREATE INDEX IF NOT EXISTS idx_inspecoes_hidrantes_data
  ON public.inspecoes_hidrantes (data_inspecao);
CREATE INDEX IF NOT EXISTS idx_inspecoes_hidrantes_revisao
  ON public.inspecoes_hidrantes (revisao);

-- Tabela: relatorios_primeiros_servicos
CREATE TABLE IF NOT EXISTS public.relatorios_primeiros_servicos (
  id BIGSERIAL PRIMARY KEY,
  id_empreendimento BIGINT NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
  cliente TEXT,
  local TEXT,
  solicitante TEXT,
  obra TEXT,
  disciplina TEXT,
  data_relatorio DATE,
  assunto_relatorio TEXT,
  descricao_relatorio TEXT,
  fotos JSONB,
  status TEXT,
  comentarios_status TEXT,
  aprovacoes JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS relatorios_primeiros_servicos_set_updated_at ON public.relatorios_primeiros_servicos;
CREATE TRIGGER relatorios_primeiros_servicos_set_updated_at
BEFORE UPDATE ON public.relatorios_primeiros_servicos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_relatorios_primeiros_servicos_empreendimento
  ON public.relatorios_primeiros_servicos (id_empreendimento);
CREATE INDEX IF NOT EXISTS idx_relatorios_primeiros_servicos_data
  ON public.relatorios_primeiros_servicos (data_relatorio);
CREATE INDEX IF NOT EXISTS idx_relatorios_primeiros_servicos_status
  ON public.relatorios_primeiros_servicos (status);
CREATE INDEX IF NOT EXISTS idx_relatorios_primeiros_servicos_assunto
  ON public.relatorios_primeiros_servicos (assunto_relatorio);

-- Tabela: relatorios_semanais
CREATE TABLE IF NOT EXISTS public.relatorios_semanais (
  id BIGSERIAL PRIMARY KEY,
  id_empreendimento BIGINT NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
  numero_relatorio TEXT,
  nome_arquivo TEXT,
  data_inicio_semana DATE,
  data_fim_semana DATE,
  fisico_real_total NUMERIC(10,2),
  efetivo JSONB,
  avanco_fisico_acumulado JSONB,
  avanco_financeiro_acumulado JSONB,
  principais_atividades_semana JSONB,
  atividades_proxima_semana_tabela JSONB,
  caminho_critico JSONB,
  impedimentos JSONB,
  fotos JSONB,
  vistos JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS relatorios_semanais_set_updated_at ON public.relatorios_semanais;
CREATE TRIGGER relatorios_semanais_set_updated_at
BEFORE UPDATE ON public.relatorios_semanais
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_relatorios_semanais_empreendimento
  ON public.relatorios_semanais (id_empreendimento);
CREATE INDEX IF NOT EXISTS idx_relatorios_semanais_numero
  ON public.relatorios_semanais (numero_relatorio);
CREATE INDEX IF NOT EXISTS idx_relatorios_semanais_inicio
  ON public.relatorios_semanais (data_inicio_semana);
CREATE INDEX IF NOT EXISTS idx_relatorios_semanais_fim
  ON public.relatorios_semanais (data_fim_semana);

-- Tabela: aprovacoes_amostra
CREATE TABLE IF NOT EXISTS public.aprovacoes_amostra (
  id BIGSERIAL PRIMARY KEY,
  id_empreendimento BIGINT NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
  cliente TEXT,
  disciplina TEXT,
  local TEXT,
  obra TEXT,
  assunto_amostra TEXT,
  descricao_amostra TEXT,
  status TEXT,
  comentarios_status TEXT,
  aprovacoes JSONB,
  fotos JSONB,
  nome_arquivo TEXT,
  data_relatorio DATE,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS aprovacoes_amostra_set_updated_at ON public.aprovacoes_amostra;
CREATE TRIGGER aprovacoes_amostra_set_updated_at
BEFORE UPDATE ON public.aprovacoes_amostra
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_aprovacoes_amostra_empreendimento
  ON public.aprovacoes_amostra (id_empreendimento);
CREATE INDEX IF NOT EXISTS idx_aprovacoes_amostra_data
  ON public.aprovacoes_amostra (data_relatorio);

  
-- Tabela: inspecoes_sprinklers
CREATE TABLE IF NOT EXISTS public.inspecoes_sprinklers (
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
  locais JSONB,
  observacoes_gerais TEXT,
  assinaturas JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS inspecoes_sprinklers_set_updated_at ON public.inspecoes_sprinklers;
CREATE TRIGGER inspecoes_sprinklers_set_updated_at
BEFORE UPDATE ON public.inspecoes_sprinklers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_inspecoes_sprinklers_empreendimento
  ON public.inspecoes_sprinklers (id_empreendimento);
CREATE INDEX IF NOT EXISTS idx_inspecoes_sprinklers_data
  ON public.inspecoes_sprinklers (data_inspecao);
CREATE INDEX IF NOT EXISTS idx_inspecoes_sprinklers_revisao
  ON public.inspecoes_sprinklers (revisao);

-- Tabela: inspecoes_alarme_incendio
CREATE TABLE IF NOT EXISTS public.inspecoes_alarme_incendio (
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
  locais JSONB,
  observacoes_gerais TEXT,
  assinaturas JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS inspecoes_alarme_incendio_set_updated_at ON public.inspecoes_alarme_incendio;
CREATE TRIGGER inspecoes_alarme_incendio_set_updated_at
BEFORE UPDATE ON public.inspecoes_alarme_incendio
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_inspecoes_alarme_incendio_empreendimento
  ON public.inspecoes_alarme_incendio (id_empreendimento);
CREATE INDEX IF NOT EXISTS idx_inspecoes_alarme_incendio_data
  ON public.inspecoes_alarme_incendio (data_inspecao);
CREATE INDEX IF NOT EXISTS idx_inspecoes_alarme_incendio_revisao
  ON public.inspecoes_alarme_incendio (revisao);

-- Tabela: inspecoes_ar_condicionado
CREATE TABLE IF NOT EXISTS public.inspecoes_ar_condicionado (
  id BIGSERIAL PRIMARY KEY,
  id_empreendimento BIGINT NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
  data_inspecao DATE,
  projeto TEXT,
  data_projeto DATE,
  titulo_secao_inspecao TEXT,
  evaporadoras JSONB,
  condensadoras JSONB,
  titulo_relatorio TEXT,
  subtitulo_relatorio TEXT,
  cliente TEXT,
  revisao TEXT,
  eng_responsavel TEXT,
  nome_arquivo TEXT,
  itens_documentacao JSONB,
  comentarios_documentacao TEXT,
  inspecao_evaporadora JSONB,
  inspecao_valvulas JSONB,
  inspecao_condensadora JSONB,
  inspecao_eletrica JSONB,
  inspecao_sensores JSONB,
  locais JSONB,
  observacoes_gerais TEXT,
  assinaturas JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS inspecoes_ar_condicionado_set_updated_at ON public.inspecoes_ar_condicionado;
CREATE TRIGGER inspecoes_ar_condicionado_set_updated_at
BEFORE UPDATE ON public.inspecoes_ar_condicionado
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_inspecoes_ar_condicionado_empreendimento
  ON public.inspecoes_ar_condicionado (id_empreendimento);
CREATE INDEX IF NOT EXISTS idx_inspecoes_ar_condicionado_data
  ON public.inspecoes_ar_condicionado (data_inspecao);
CREATE INDEX IF NOT EXISTS idx_inspecoes_ar_condicionado_revisao
  ON public.inspecoes_ar_condicionado (revisao);

-- Tabela: inspecoes_controle_acesso
CREATE TABLE IF NOT EXISTS public.inspecoes_controle_acesso (
  id BIGSERIAL PRIMARY KEY,
  id_empreendimento BIGINT NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
  data_inspecao DATE,
  projeto TEXT,
  data_projeto DATE,
  titulo_secao_inspecao TEXT,
  label_local TEXT,
  equipamentos JSONB,
  info_sistema JSONB,
  info_sistema_labels JSONB,
  titulo_relatorio TEXT,
  subtitulo_relatorio TEXT,
  cliente TEXT,
  revisao TEXT,
  eng_responsavel TEXT,
  itens_documentacao JSONB,
  locais JSONB,
  observacoes_gerais TEXT,
  assinaturas JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS inspecoes_controle_acesso_set_updated_at ON public.inspecoes_controle_acesso;
CREATE TRIGGER inspecoes_controle_acesso_set_updated_at
BEFORE UPDATE ON public.inspecoes_controle_acesso
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_inspecoes_controle_acesso_empreendimento
  ON public.inspecoes_controle_acesso (id_empreendimento);
CREATE INDEX IF NOT EXISTS idx_inspecoes_controle_acesso_data
  ON public.inspecoes_controle_acesso (data_inspecao);
CREATE INDEX IF NOT EXISTS idx_inspecoes_controle_acesso_revisao
  ON public.inspecoes_controle_acesso (revisao);

-- Tabela: inspecoes_cftv
CREATE TABLE IF NOT EXISTS public.inspecoes_cftv (
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
  info_sistema JSONB,
  info_cameras JSONB,
  pavimentos JSONB,
  observacoes_gerais TEXT,
  assinaturas JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS inspecoes_cftv_set_updated_at ON public.inspecoes_cftv;
CREATE TRIGGER inspecoes_cftv_set_updated_at
BEFORE UPDATE ON public.inspecoes_cftv
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_inspecoes_cftv_empreendimento
  ON public.inspecoes_cftv (id_empreendimento);
CREATE INDEX IF NOT EXISTS idx_inspecoes_cftv_data
  ON public.inspecoes_cftv (data_inspecao);
CREATE INDEX IF NOT EXISTS idx_inspecoes_cftv_revisao
  ON public.inspecoes_cftv (revisao);

-- Tabela: inspecoes_sdai
CREATE TABLE IF NOT EXISTS public.inspecoes_sdai (
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
  centrais JSONB,
  instalacoes JSONB,
  ordem_secoes JSONB,
  itens_instalacao JSONB,
  comentarios_instalacao TEXT,
  observacoes_gerais TEXT,
  assinaturas JSONB,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

DROP TRIGGER IF EXISTS inspecoes_sdai_set_updated_at ON public.inspecoes_sdai;
CREATE TRIGGER inspecoes_sdai_set_updated_at
BEFORE UPDATE ON public.inspecoes_sdai
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_inspecoes_sdai_empreendimento
  ON public.inspecoes_sdai (id_empreendimento);
CREATE INDEX IF NOT EXISTS idx_inspecoes_sdai_data
  ON public.inspecoes_sdai (data_inspecao);
CREATE INDEX IF NOT EXISTS idx_inspecoes_sdai_revisao
  ON public.inspecoes_sdai (revisao);


