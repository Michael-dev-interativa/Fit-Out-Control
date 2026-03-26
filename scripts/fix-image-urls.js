import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const BACKEND_URL = 'https://backend-fitout.onrender.com';

async function fixImageUrls() {
  console.log('🔧 Iniciando correção de URLs de imagens...\n');

  try {
    // 1. Atualizar relatorios_semanais
    console.log('📋 Verificando relatorios_semanais...');
    const { rows: relatorios } = await pool.query('SELECT id, fotos FROM relatorios_semanais WHERE fotos IS NOT NULL');

    let updatedRelatorios = 0;
    for (const relatorio of relatorios) {
      if (!relatorio.fotos || !Array.isArray(relatorio.fotos)) continue;

      let needsUpdate = false;
      const updatedFotos = relatorio.fotos.map(foto => {
        if (foto.url && foto.url.startsWith('/api/')) {
          needsUpdate = true;
          return { ...foto, url: `${BACKEND_URL}${foto.url}` };
        }
        return foto;
      });

      if (needsUpdate) {
        await pool.query(
          'UPDATE relatorios_semanais SET fotos = $1 WHERE id = $2',
          [JSON.stringify(updatedFotos), relatorio.id]
        );
        console.log(`  ✅ Atualizado relatório ID ${relatorio.id}`);
        updatedRelatorios++;
      }
    }
    console.log(`✅ ${updatedRelatorios} relatórios atualizados\n`);

    // 2. Atualizar lista_documentos_report
    console.log('📋 Verificando lista_documentos_report...');
    const { rows: documentos } = await pool.query('SELECT id, documentos FROM lista_documentos_report WHERE documentos IS NOT NULL');

    let updatedDocumentos = 0;
    for (const doc of documentos) {
      if (!doc.documentos || !Array.isArray(doc.documentos)) continue;

      let needsUpdate = false;
      const updatedDocs = doc.documentos.map(item => {
        if (item.fotos && Array.isArray(item.fotos)) {
          const updatedFotos = item.fotos.map(foto => {
            if (foto.url && foto.url.startsWith('/api/')) {
              needsUpdate = true;
              return { ...foto, url: `${BACKEND_URL}${foto.url}` };
            }
            return foto;
          });
          return { ...item, fotos: updatedFotos };
        }
        return item;
      });

      if (needsUpdate) {
        await pool.query(
          'UPDATE lista_documentos_report SET documentos = $1 WHERE id = $2',
          [JSON.stringify(updatedDocs), doc.id]
        );
        console.log(`  ✅ Atualizado documento ID ${doc.id}`);
        updatedDocumentos++;
      }
    }
    console.log(`✅ ${updatedDocumentos} documentos atualizados\n`);

    console.log('✅ Correção concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

fixImageUrls();
