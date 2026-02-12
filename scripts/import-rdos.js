import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import readline from 'readline';

dotenv.config();

const { Pool } = pg;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function connectToRender() {
  console.log('📡 Conectando ao PostgreSQL do RENDER...');

  const renderUrl = process.env.DATABASE_URL;

  if (!renderUrl) {
    console.error('❌ DATABASE_URL não configurada!');
    process.exit(1);
  }

  // Tenta sem SSL primeiro
  console.log('🔌 Tentando conectar sem SSL...');
  try {
    const renderPool = new Pool({
      connectionString: renderUrl,
      ssl: false
    });

    await renderPool.query('SELECT 1');
    console.log('✅ Conectado ao PostgreSQL (sem SSL)!\n');
    return renderPool;
  } catch (error) {
    console.log('⚠️  Falhou sem SSL, tentando com SSL...');

    // Se falhar, tenta com SSL
    try {
      const renderPool = new Pool({
        connectionString: renderUrl,
        ssl: { rejectUnauthorized: false }
      });

      await renderPool.query('SELECT 1');
      console.log('✅ Conectado ao PostgreSQL (com SSL)!\n');
      return renderPool;
    } catch (errorSSL) {
      console.error('❌ Erro ao conectar:', errorSSL.message);
      process.exit(1);
    }
  }
}

function loadCSVFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true
    });
    return records;
  } catch (error) {
    console.error(`⚠️  Erro ao ler ${filePath}:`, error.message);
    return null;
  }
}

function mapRDOToPostgres(rdoData) {
  const mapped = {};

  // Campos diretos
  mapped.tipo_documento = rdoData.tipo_documento || null;
  mapped.numero_relatorio = rdoData.numero_relatorio || null;
  mapped.data_relatorio = rdoData.data_relatorio || null;
  mapped.dia_semana = rdoData.dia_semana || null;
  mapped.obra_nome = rdoData.obra_nome || null;
  mapped.obra_local = rdoData.obra_local || null;
  mapped.contratada = rdoData.contratada || null;
  mapped.responsavel = rdoData.responsavel || null;
  mapped.contrato = rdoData.contrato || null;
  mapped.prazo_contratual = rdoData.prazo_contratual || null;
  mapped.prazo_decorrido = rdoData.prazo_decorrido || null;
  mapped.prazo_vencer = rdoData.prazo_vencer || null;
  mapped.observacoes = rdoData.observacoes || null;
  mapped.status_documento = rdoData.status_documento || null;

  // ID do empreendimento
  const idEmp = rdoData.id_empreendimento;
  if (idEmp && idEmp !== '') {
    mapped.id_empreendimento = parseInt(idEmp);
  } else {
    mapped.id_empreendimento = null;
  }

  // Campos JSON
  const jsonFields = ['condicao_climatica', 'equipes_campo', 'atividades_realizadas',
    'ocorrencias', 'fotos', 'assinaturas'];

  jsonFields.forEach(field => {
    const value = rdoData[field];
    if (value && value !== '' && value !== 'null') {
      try {
        // Valida se é JSON válido
        JSON.parse(value);
        mapped[field] = value;
      } catch {
        mapped[field] = null;
      }
    } else {
      mapped[field] = null;
    }
  });

  // Timestamps
  mapped.created_at = new Date();
  mapped.updated_at = new Date();

  return mapped;
}

async function findEmpreendimentoByName(pool, obraNome) {
  if (!obraNome || obraNome === '') return null;

  try {
    const result = await pool.query(`
      SELECT id FROM empreendimentos 
      WHERE titulo ILIKE $1 OR nome_empreendimento ILIKE $1
      LIMIT 1
    `, [`%${obraNome}%`]);

    return result.rows.length > 0 ? result.rows[0].id : null;
  } catch {
    return null;
  }
}

async function importRDOs() {
  try {
    console.log('\n📊 IMPORTAÇÃO DE RDOs - CSV → PostgreSQL\n');

    const exportPath = await question('📁 Cole o caminho da pasta com o arquivo RDO.csv:\n> ');

    const rdoFile = path.join(exportPath, 'RDO.csv');

    if (!fs.existsSync(rdoFile)) {
      console.log('❌ Arquivo RDO.csv não encontrado!');
      rl.close();
      process.exit(1);
    }

    console.log('✅ Arquivo encontrado!\n');

    const pool = await connectToRender();

    // Permite NULL em id_empreendimento temporariamente
    console.log('🔧 Ajustando constraint...');
    try {
      await pool.query(`
        ALTER TABLE rdos 
        ALTER COLUMN id_empreendimento DROP NOT NULL;
      `);
      console.log('✅ Constraint ajustada!\n');
    } catch (err) {
      // Já pode estar ajustada
      console.log('⚠️  Constraint já ajustada ou erro:', err.message, '\n');
    }

    console.log('🚀 Iniciando importação...\n');

    const csvData = loadCSVFile(rdoFile);

    if (!csvData) {
      console.log('❌ Erro ao carregar CSV');
      rl.close();
      process.exit(1);
    }

    const records = Array.isArray(csvData) ? csvData : [csvData];
    console.log(`📊 ${records.length} registros encontrados no CSV\n`);

    let imported = 0;
    let errors = 0;
    const errorSamples = [];

    for (const record of records) {
      try {
        const mapped = mapRDOToPostgres(record);

        // Tenta buscar empreendimento por nome se o ID original não existe
        if (mapped.id_empreendimento) {
          const foundId = await findEmpreendimentoByName(pool, mapped.obra_nome);
          if (foundId) {
            mapped.id_empreendimento = foundId;
          }
        }

        // Remove id_empreendimento se for NULL (caso a constraint permita)
        const fields = Object.keys(mapped).filter(key => {
          if (key === 'id_empreendimento' && mapped[key] === null) {
            return false;
          }
          return true;
        });

        const values = fields.map(key => mapped[key]);

        if (fields.length === 0) {
          errors++;
          continue;
        }

        const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

        const sql = `
          INSERT INTO rdos (${fields.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT DO NOTHING
        `;

        await pool.query(sql, values);
        imported++;
      } catch (error) {
        // Se for erro de foreign key, tenta sem id_empreendimento
        if (error.message.includes('foreign key constraint')) {
          try {
            const mapped = mapRDOToPostgres(record);

            // Remove id_empreendimento
            delete mapped.id_empreendimento;

            const fields = Object.keys(mapped);
            const values = fields.map(key => mapped[key]);
            const placeholders = fields.map((_, i) => `$${i + 1}`).join(', ');

            const sql = `
              INSERT INTO rdos (${fields.join(', ')})
              VALUES (${placeholders})
              ON CONFLICT DO NOTHING
            `;

            await pool.query(sql, values);
            imported++;
          } catch (retryError) {
            errors++;
            if (errorSamples.length < 5) {
              errorSamples.push(retryError.message.split('\n')[0]);
            }
          }
        } else {
          errors++;
          if (errorSamples.length < 5) {
            errorSamples.push(error.message.split('\n')[0]);
          }
        }
      }
    }

    console.log(`\n📊 RESUMO:`);
    console.log(`   ✅ Importados: ${imported}`);
    console.log(`   ⚠️  Erros: ${errors}`);

    if (errorSamples.length > 0) {
      console.log(`\n   📋 Exemplos de erros:`);
      errorSamples.forEach((err, idx) => {
        console.log(`      ${idx + 1}. ${err}`);
      });
    }

    await pool.end();
    rl.close();

    console.log('\n🎉 Importação concluída!\n');

  } catch (error) {
    console.error('❌ Erro fatal:', error.message);
    rl.close();
    process.exit(1);
  }
}

importRDOs();
