const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function verifyColumns() {
  const client = await pool.connect();
  try {
    const servicosCols = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'servicos' ORDER BY ordinal_position"
    );
    console.log('=== SERVICOS COLUMNS ===');
    servicosCols.rows.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));

    const produtosCols = await client.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'produtos' ORDER BY ordinal_position"
    );
    console.log('\n=== PRODUTOS COLUMNS ===');
    produtosCols.rows.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));

    const categorias = await client.query('SELECT id, nome FROM categorias_servico');
    console.log('\n=== CATEGORIAS SERVICO ===');
    categorias.rows.forEach(c => console.log(`  ${c.id}: ${c.nome}`));

    const grupos = await client.query('SELECT id, nome FROM grupos_produtos');
    console.log('\n=== GRUPOS PRODUTOS ===');
    grupos.rows.forEach(g => console.log(`  ${g.id}: ${g.nome}`));

    const unidades = await client.query('SELECT id, sigla, descricao FROM unidades_medida');
    console.log('\n=== UNIDADES MEDIDA ===');
    unidades.rows.forEach(u => console.log(`  ${u.id}: ${u.sigla} - ${u.descricao}`));
  } finally {
    client.release();
    await pool.end();
  }
}

verifyColumns();