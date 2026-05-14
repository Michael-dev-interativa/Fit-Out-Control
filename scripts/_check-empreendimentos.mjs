import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const { rows } = await pool.query(
  `SELECT id, nome_empreendimento, cli_empreendimento FROM public.empreendimentos ORDER BY nome_empreendimento`
);
console.log(`\n${rows.length} empreendimentos no banco:\n`);
rows.forEach(r => {
  const cli = r.cli_empreendimento ? ` (cli: ${r.cli_empreendimento})` : '';
  console.log(`  ${r.id}: ${r.nome_empreendimento}${cli}`);
});

// Tenta fazer ILIKE nos nomes dos manuais não resolvidos
const termsToTest = [
  'Torre B', 'JK', 'Pq. logistíco', 'Parque Logístico', 'Torre Paineira',
  'Torre Jatobá', 'Jatobá', 'Ed. Centenário', 'Centenário', 'Ed. Nações',
  'Nações 17007', 'FOCUS', 'LEED', 'Rochaverá', 'Corporate',
];

console.log('\nBusca ILIKE por termos:');
for (const term of termsToTest) {
  const { rows: r } = await pool.query(
    `SELECT id, nome_empreendimento FROM public.empreendimentos WHERE nome_empreendimento ILIKE $1 OR cli_empreendimento ILIKE $1 LIMIT 3`,
    [`%${term}%`]
  );
  if (r.length > 0) console.log(`  "${term}" → ${r.map(x => `[${x.id}] ${x.nome_empreendimento}`).join(' | ')}`);
  else console.log(`  "${term}" → (sem match)`);
}

await pool.end();
