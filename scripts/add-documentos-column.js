import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config();

async function addDocumentosColumn() {
  const { DATABASE_URL } = process.env;
  
  if (!DATABASE_URL) {
    console.error('❌ DATABASE_URL não está configurada no arquivo .env');
    console.log('\nCrie um arquivo .env na raiz do projeto com:');
    console.log('DATABASE_URL=sua_connection_string_postgresql');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: DATABASE_URL });

  try {
    console.log('🔄 Conectando ao banco de dados...');
    
    // Verificar se a tabela existe
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'rdos'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('📝 Tabela rdos não existe. Criando tabela...');
      
      // Criar tabela rdos
      await pool.query(`
        CREATE TABLE IF NOT EXISTS public.rdos (
          id BIGSERIAL PRIMARY KEY,
          id_empreendimento BIGINT NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
          tipo_documento TEXT,
          numero_relatorio TEXT,
          data_relatorio DATE,
          dia_semana TEXT,
          obra_nome TEXT,
          obra_local TEXT,
          contratada TEXT,
          responsavel TEXT,
          contrato TEXT,
          prazo_contratual TEXT,
          prazo_decorrido TEXT,
          prazo_vencer TEXT,
          condicao_climatica JSONB,
          equipes_campo JSONB,
          atividades_realizadas JSONB,
          ocorrencias JSONB,
          documentos JSONB,
          fotos JSONB,
          assinaturas JSONB,
          observacoes TEXT,
          status_documento TEXT,
          created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
        );
      `);
      
      console.log('✅ Tabela rdos criada com sucesso!');
      
      // Criar índices
      await pool.query(`
        CREATE INDEX IF NOT EXISTS idx_rdos_empreendimento ON public.rdos (id_empreendimento);
        CREATE INDEX IF NOT EXISTS idx_rdos_data ON public.rdos (data_relatorio);
        CREATE INDEX IF NOT EXISTS idx_rdos_numero ON public.rdos (numero_relatorio);
        CREATE INDEX IF NOT EXISTS idx_rdos_status ON public.rdos (status_documento);
      `);
      
      console.log('✅ Índices criados com sucesso!');
      
      // Criar trigger para updated_at
      await pool.query(`
        CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger AS $$
        BEGIN
          NEW.updated_at := now();
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS rdos_set_updated_at ON public.rdos;
        CREATE TRIGGER rdos_set_updated_at
        BEFORE UPDATE ON public.rdos
        FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
      `);
      
      console.log('✅ Trigger de updated_at criado com sucesso!');
    } else {
      console.log('✅ Tabela rdos já existe');
      
      // Adicionar coluna documentos se não existir
      await pool.query(`
        ALTER TABLE public.rdos 
        ADD COLUMN IF NOT EXISTS documentos JSONB;
      `);
      
      console.log('✅ Coluna "documentos" verificada/adicionada com sucesso!');
    }
    
    // Verificar se a coluna documentos existe
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'rdos' 
      AND column_name = 'documentos';
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Verificação: Coluna "documentos" encontrada no schema');
      console.log('   Tipo:', result.rows[0].data_type);
    } else {
      console.log('⚠️  Aviso: Coluna "documentos" não encontrada após criação');
    }
    
  } catch (error) {
    console.error('❌ Erro ao adicionar coluna:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n✅ Migração concluída!');
  }
}

addDocumentosColumn();
