
CREATE SCHEMA IF NOT EXISTS public;


CREATE TABLE IF NOT EXISTS public.usuarios (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    nome VARCHAR(255),
    password_hash TEXT NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    perfil_cliente BOOLEAN DEFAULT false,
    perfil JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS public.empreendimentos (
    id SERIAL PRIMARY KEY,
    nome_empreendimento VARCHAR(255) NOT NULL,
    cli_empreendimento VARCHAR(255),
    endereco_empreendimento TEXT,
    foto_empreendimento TEXT,
    os_number VARCHAR(100),
    sigla_obra VARCHAR(50),
    data_inicio_contrato DATE,
    termino_obra_previsto DATE,
    data_sem_entrega DATE,
    data_termino_contrato DATE,
    valor_contratual DECIMAL(15,2),
    prazo_contratual_dias INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS public.unidades_empreendimento (
    id SERIAL PRIMARY KEY,
    id_empreendimento INTEGER REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
    unidade_empreendimento VARCHAR(255) NOT NULL,
    cliente_unidade VARCHAR(255),
    metragem_unidade DECIMAL(10,2),
    escopo_unidade TEXT,
    contatos JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS public.usuarios_empreendimentos (
    user_id INTEGER REFERENCES public.usuarios(id) ON DELETE CASCADE,
    empreendimento_id INTEGER REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, empreendimento_id)
);


CREATE TABLE IF NOT EXISTS public.relatorios_semanais (
    id SERIAL PRIMARY KEY,
    id_empreendimento INTEGER REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
    numero_relatorio VARCHAR(100),
    nome_arquivo VARCHAR(255),
    data_inicio_semana DATE,
    data_fim_semana DATE,
    fisico_real_total DECIMAL(5,2),
    efetivo INTEGER,
    avanco_fisico_acumulado DECIMAL(5,2),
    avanco_financeiro_acumulado DECIMAL(5,2),
    principais_atividades_semana TEXT,
    atividades_proxima_semana_tabela TEXT,
    caminho_critico TEXT,
    impedimentos TEXT,
    fotos JSONB,
    vistos JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.diarios_obra (
    id SERIAL PRIMARY KEY,
    id_empreendimento INTEGER REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
    id_unidade INTEGER REFERENCES public.unidades_empreendimento(id) ON DELETE SET NULL,
    unidade_texto VARCHAR(255),
    nome_arquivo VARCHAR(255),
    numero_diario VARCHAR(100),
    data_diario DATE,
    condicao_climatica VARCHAR(100),
    horas_paralisadas DECIMAL(5,2),
    periodo_trabalhado VARCHAR(100),
    efetivo INTEGER,
    principais_atividades TEXT,
    ocorrencias_observacoes TEXT,
    fotos JSONB,
    vistos JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS public.formularios_vistoria (
    id SERIAL PRIMARY KEY,
    nome_formulario VARCHAR(255) NOT NULL,
    descricao_formulario TEXT,
    status_formulario VARCHAR(50) DEFAULT 'Ativo',
    secoes JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS public.respostas_vistoria (
    id SERIAL PRIMARY KEY,
    id_formulario INTEGER REFERENCES public.formularios_vistoria(id) ON DELETE CASCADE,
    id_unidade INTEGER REFERENCES public.unidades_empreendimento(id) ON DELETE SET NULL,
    id_empreendimento INTEGER REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
    estrutura_formulario JSONB,
    nome_vistoria VARCHAR(255),
    nome_arquivo VARCHAR(255),
    data_vistoria DATE,
    data_relatorio DATE,
    consultor_responsavel VARCHAR(255),
    participantes JSONB,
    texto_os_proposta TEXT,
    texto_escopo_consultoria TEXT,
    respostas JSONB,
    fotos_secoes JSONB,
    status_vistoria VARCHAR(50) DEFAULT 'Em Andamento',
    observacoes_secoes JSONB,
    pontuacao_total DECIMAL(10,2),
    pontuacao_maxima DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS public.vistorias_terminalidade (
    id SERIAL PRIMARY KEY,
    id_empreendimento INTEGER REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
    data_vistoria DATE,
    titulo_relatorio VARCHAR(255),
    subtitulo_relatorio VARCHAR(255),
    cliente VARCHAR(255),
    revisao VARCHAR(100),
    eng_obra VARCHAR(255),
    secoes JSONB,
    assinaturas JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


INSERT INTO public.usuarios (email, nome, password_hash, role, perfil_cliente)
VALUES (
    'admin@fitout.com',
    'Administrador',
    '5f9c4ab08cac7457e9111a6e4c:5c4b0f3f79e68b8fa3bf3e5a4e5bb7c7f3f5a4e9c8d7b6a5c4d3e2f1a0b9c8d7',
    'admin',
    false
)
ON CONFLICT (email) DO NOTHING;


CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios(email);
CREATE INDEX IF NOT EXISTS idx_empreendimentos_nome ON public.empreendimentos(nome_empreendimento);
CREATE INDEX IF NOT EXISTS idx_unidades_empreendimento ON public.unidades_empreendimento(id_empreendimento);

-- Concluído!
SELECT 'Database inicializado com sucesso!' as status;
