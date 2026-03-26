import pg from 'pg';

const conn = process.env.DATABASE_URL || process.env.DATABASE_URL_LOCAL;
if (!conn) {
  console.error('ERRO: variável DATABASE_URL ou DATABASE_URL_LOCAL não setada.');
  process.exit(1);
}

const client = new pg.Client({
  connectionString: conn,
  ssl: { rejectUnauthorized: false }
});

(async () => {
  try {
    await client.connect();
    console.log('Conectado ao banco.');

    const { rows: rCount } = await client.query("SELECT count(*)::int AS total FROM empreendimentos");
    console.log('Empreendimentos - total:', rCount[0] ? rCount[0].total : 0);

    const { rows: sample } = await client.query(`SELECT id, nome_empreendimento, cli_empreendimento
      FROM empreendimentos
      ORDER BY id DESC
      LIMIT 10`);

    console.log('Amostra (até 10):', sample);

    // Se quiser inspecionar outras tabelas, descomente/adicione queries aqui
  } catch (err) {
    console.error('Erro ao consultar DB:', err.message || err);
    console.error(err);
  } finally {
    await client.end();
  }
})();
