const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function addIndexes() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_ordens_status ON ordens_servico(status)',
      'CREATE INDEX IF NOT EXISTS idx_ordens_data ON ordens_servico(created_at)',
      'CREATE INDEX IF NOT EXISTS idx_ordens_cliente ON ordens_servico(cliente_id)',
      'CREATE INDEX IF NOT EXISTS idx_ordens_tecnico ON ordens_servico(tecnico_id)',
      'CREATE INDEX IF NOT EXISTS idx_os_itens_os ON os_itens(os_id)',
      'CREATE INDEX IF NOT EXISTS idx_clientes_nome ON clientes(nome_razao_social)',
      'CREATE INDEX IF NOT EXISTS idx_tecnicos_nome ON tecnicos(nome)',
      'CREATE INDEX IF NOT EXISTS idx_produtos_descricao ON produtos(descricao)',
      'CREATE INDEX IF NOT EXISTS idx_produtos_codigo ON produtos(codigo_barras)',
      'CREATE INDEX IF NOT EXISTS idx_servicos_nome ON servicos(nome_servico)',
      'CREATE INDEX IF NOT EXISTS idx_usuarios_nome ON usuarios(nome)'
    ];
    for (const idx of indexes) {
      await client.query(idx);
      console.log('  ' + idx.split('ON ')[1]);
    }
    await client.query('COMMIT');
    console.log('\n✅ Indices criados');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro:', err);
  } finally {
    client.release();
    await pool.end();
  }
}
addIndexes();