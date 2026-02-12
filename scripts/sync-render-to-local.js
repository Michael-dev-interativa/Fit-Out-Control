import pg from 'pg';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const { Pool } = pg;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

// Tabelas a copiar (na ordem correta por dependências de foreign key)
const TABLES_TO_COPY = [
  'usuarios',              // Base - sem dependências
  'empreendimentos',       // Depende de usuarios (created_by)
  'unidades_empreendimento',  // Depende de empreendimentos
  'registros_unidade',
  'registros_gerais',
  'disciplinas_gerais',
  'formularios_vistoria',
  'vistorias',
  'relatorios_semanais',
  'aprovacoes_amostra',    // Depende de empreendimentos (id_empreendimento_fkey)
  'arquivos'
];

async function connectToRender() {
  console.log('🔌 Conectando ao PostgreSQL do RENDER...');

  const renderUrl = process.env.DATABASE_URL;

  if (!renderUrl) {
    console.error('❌ DATABASE_URL não configurada!');
    console.error('Configure a DATABASE_URL do Render no arquivo .env\n');
    process.exit(1);
  }

  try {
    const pool = new Pool({
      connectionString: renderUrl,
      ssl: { rejectUnauthorized: false }
    });

    await pool.query('SELECT 1');
    console.log('✅ Conectado ao PostgreSQL do RENDER!\n');
    return pool;
  } catch (error) {
    console.error('❌ Erro ao conectar no Render:', error.message);
    process.exit(1);
  }
}

async function connectToLocal() {
  console.log('🔌 Conectando ao PostgreSQL LOCAL...');

  const localUrl = process.env.DATABASE_URL_LOCAL || 'postgres://postgres:postgres@localhost:5432/fitout';

  const pool = new Pool({
    connectionString: localUrl,
    ssl: false
  });

  try {
    await pool.query('SELECT 1');
    console.log('✅ Conectado ao PostgreSQL LOCAL!\n');
    return pool;
  } catch (error) {
    console.error('❌ Erro ao conectar no PostgreSQL local:', error.message);
    console.error('\n💡 Configure DATABASE_URL_LOCAL no .env');
    console.error('   Exemplo: DATABASE_URL_LOCAL=postgres://postgres:postgres@localhost:5432/fitout\n');
    process.exit(1);
  }
}

async function getTableCount(pool, tableName) {
  try {
    const result = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
    return parseInt(result.rows[0].count);
  } catch (error) {
    return 0;
  }
}

async function getTableColumns(pool, tableName) {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [tableName]);

    return result.rows.map(r => ({
      name: r.column_name,
      type: r.data_type
    }));
  } catch (error) {
    console.error(`   ⚠️  Erro ao consultar colunas de ${tableName}:`, error.message);
    return [];
  }
}

function isValidJSON(value, dataType) {
  // Null, undefined → válido (será NULL)
  if (value === null || value === undefined) {
    return true;
  }

  // Campos JSON/JSONB
  if (dataType === 'json' || dataType === 'jsonb') {
    // Se já é objeto/array, tenta converter para string
    if (typeof value === 'object') {
      try {
        JSON.stringify(value);
        return true;
      } catch {
        return false;
      }
    }

    // Se é string, valida se é JSON válido
    if (typeof value === 'string') {
      // String vazia → inválido para JSON
      if (value.trim() === '') {
        return false;
      }

      try {
        JSON.parse(value);
        return true;
      } catch {
        return false;
      }
    }

    // Outros tipos → inválido
    return false;
  }

  // Outros tipos de dados → aceita qualquer coisa
  return true;
}

async function copyTable(renderPool, localPool, tableName) {
  try {
    console.log(`\n📋 Tabela: ${tableName}`);

    // Conta registros no Render
    const renderCount = await getTableCount(renderPool, tableName);
    console.log(`   📊 Render: ${renderCount} registros`);

    if (renderCount === 0) {
      console.log(`   ⏭️  Pulando (vazia)`);
      return { table: tableName, copied: 0, skipped: true };
    }

    // Conta registros no Local
    const localCount = await getTableCount(localPool, tableName);
    console.log(`   📊 Local: ${localCount} registros`);

    // Consulta colunas disponíveis em AMBOS os bancos
    const renderColumns = await getTableColumns(renderPool, tableName);
    const localColumns = await getTableColumns(localPool, tableName);

    // Mapeia colunas do Local para comparação rápida
    const localColumnMap = new Map(localColumns.map(c => [c.name, c.type]));

    // Filtra apenas colunas que existem em AMBOS os bancos
    const commonColumns = renderColumns.filter(col => localColumnMap.has(col.name));

    if (commonColumns.length === 0) {
      console.log(`   ⚠️  Nenhuma coluna compatível entre Render e Local`);
      return { table: tableName, copied: 0, errors: 0 };
    }

    console.log(`   🔍 Colunas compatíveis: ${commonColumns.length} de ${renderColumns.length}`);

    // Busca dados do Render
    const { rows } = await renderPool.query(`SELECT * FROM ${tableName}`);

    console.log(`   📥 Buscados do Render: ${rows.length} registros`);

    if (rows.length === 0) {
      console.log(`   ⏭️  Nenhum dado para copiar`);
      return { table: tableName, copied: 0, skipped: true };
    }

    // Insere no Local
    let copied = 0;
    let errors = 0;
    let errorSamples = [];
    let processed = 0;

    for (const row of rows) {
      processed++;
      try {
        // Usa apenas colunas comuns
        const fields = [];
        const values = [];

        for (const col of commonColumns) {
          const value = row[col.name];

          // Valida JSON antes de inserir
          if (!isValidJSON(value, col.type)) {
            // JSON inválido - converte para NULL
            fields.push(col.name);
            values.push(null);
          } else {
            fields.push(col.name);

            // Se é JSON/JSONB e é objeto, converte para string
            if ((col.type === 'json' || col.type === 'jsonb') && typeof value === 'object' && value !== null) {
              values.push(JSON.stringify(value));
            } else {
              values.push(value);
            }
          }
        }

        if (fields.length === 0) {
          errors++;
          continue;
        }

        const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

        const sql = `
          INSERT INTO ${tableName} (${fields.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT DO NOTHING
        `;

        const result = await localPool.query(sql, values);

        // ON CONFLICT DO NOTHING retorna rowCount = 0 se houve conflito
        if (result.rowCount === 0) {
          errors++;
          if (errorSamples.length < 3) {
            errorSamples.push(`ID ${row.id || row.codigo || 'desconhecido'} já existe`);
          }
        } else {
          copied++;
        }
      } catch (error) {
        errors++;
        if (errorSamples.length < 3) {
          errorSamples.push(`${error.message.split('\n')[0]}`);
        }
      }
    }

    console.log(`   🔄 Processados: ${processed} registros`);

    if (errors > 0) {
      console.log(`   ⚠️  ${copied} copiados, ${errors} pulados/erros`);
      if (errorSamples.length > 0) {
        console.log(`   ℹ️  Exemplos: ${errorSamples.join('; ')}`);
      }
    } else {
      console.log(`   ✅ ${copied} registros copiados`);
    }

    return { table: tableName, copied, errors };

  } catch (error) {
    console.error(`   ❌ Erro ao copiar ${tableName}:`, error.message);
    return { table: tableName, copied: 0, error: error.message };
  }
}

async function main() {
  try {
    console.log('\n🔄 SINCRONIZAÇÃO: PostgreSQL Render → Local\n');
    console.log('⚠️  Este script copia dados do RENDER para o banco LOCAL');
    console.log('   Dados existentes no Local NÃO serão sobrescritos.\n');

    const answer = await question('Deseja continuar? (s/N): ');
    if (answer.toLowerCase() !== 's') {
      console.log('❌ Sincronização cancelada.');
      rl.close();
      process.exit(0);
    }

    const renderPool = await connectToRender();
    const localPool = await connectToLocal();

    console.log('🚀 Iniciando cópia...\n');

    const results = [];

    for (const tableName of TABLES_TO_COPY) {
      const result = await copyTable(renderPool, localPool, tableName);
      results.push(result);
    }

    // Resumo
    console.log('\n\n📊 RESUMO DA SINCRONIZAÇÃO:\n');
    console.log('┌─────────────────────────────────┬────────────┬──────────────┐');
    console.log('│ Tabela                          │ Copiados   │ Status       │');
    console.log('├─────────────────────────────────┼────────────┼──────────────┤');

    results.forEach(r => {
      const paddedTable = r.table.padEnd(31);
      const paddedCopied = String(r.copied).padStart(10);
      let status = '✅ OK        ';

      if (r.skipped) {
        status = '⏭️  Pulado   ';
      } else if (r.errors > 0) {
        status = `⚠️  ${r.errors} dup   `.padEnd(13);
      }

      console.log(`│ ${paddedTable} │ ${paddedCopied} │ ${status} │`);
    });

    console.log('└─────────────────────────────────┴────────────┴──────────────┘');

    const totalCopied = results.reduce((sum, r) => sum + (r.copied || 0), 0);
    console.log(`\n✅ Total de registros copiados: ${totalCopied}\n`);

    await renderPool.end();
    await localPool.end();
    rl.close();

    console.log('🎉 Sincronização concluída!\n');

  } catch (error) {
    console.error('\n❌ Erro fatal:', error.message);
    process.exit(1);
  }
}

main();
