import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config();

async function createListaDocumentosReport() {
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
    
    // Criar tabela lista_documentos_report
    console.log('📝 Criando tabela lista_documentos_report...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS public.lista_documentos_report (
        id BIGSERIAL PRIMARY KEY,
        id_empreendimento BIGINT NOT NULL REFERENCES public.empreendimentos(id) ON DELETE CASCADE,
        cliente TEXT,
        empreendimento TEXT,
        titulo TEXT,
        numero_documento TEXT,
        revisao TEXT,
        data_aviso DATE,
        documentos JSONB,
        assinaturas JSONB,
        observacoes_gerais TEXT,
        status_documento TEXT,
        created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
      );
    `);
    
    console.log('✅ Tabela lista_documentos_report criada com sucesso!');
    
    // Criar índices
    console.log('📊 Criando índices...');
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_lista_documentos_report_empreendimento
        ON public.lista_documentos_report (id_empreendimento);
      CREATE INDEX IF NOT EXISTS idx_lista_documentos_report_data
        ON public.lista_documentos_report (data_aviso);
      CREATE INDEX IF NOT EXISTS idx_lista_documentos_report_numero
        ON public.lista_documentos_report (numero_documento);
      CREATE INDEX IF NOT EXISTS idx_lista_documentos_report_status
        ON public.lista_documentos_report (status_documento);
    `);
    
    console.log('✅ Índices criados com sucesso!');
    
    // Criar trigger para updated_at
    console.log('⚙️ Criando trigger de updated_at...');
    await pool.query(`
      DROP TRIGGER IF EXISTS lista_documentos_report_set_updated_at ON public.lista_documentos_report;
      CREATE TRIGGER lista_documentos_report_set_updated_at
      BEFORE UPDATE ON public.lista_documentos_report
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
    `);
    
    console.log('✅ Trigger criado com sucesso!');
    
    // Verificar se a tabela foi criada
    const result = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_name = 'lista_documentos_report' 
      AND table_schema = 'public';
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Verificação: Tabela encontrada no schema');
      
      // Listar colunas
      const columns = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'lista_documentos_report' 
        ORDER BY ordinal_position;
      `);
      
      console.log('\n📋 Colunas da tabela:');
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });
    } else {
      console.log('⚠️  Aviso: Tabela não encontrada após criação');
    }
    
  } catch (error) {
    console.error('❌ Erro ao criar tabela:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('\n✅ Migração concluída!');
    console.log('\n🔄 Agora reinicie o servidor com: npm run dev');
  }
}

createListaDocumentosReport();
