const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if tipo column exists
    const check = await client.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'usuarios' AND column_name = 'tipo'"
    );

    if (!check.rows.length) {
      await client.query(`
        ALTER TABLE usuarios ADD COLUMN tipo VARCHAR(20) DEFAULT 'operador'
      `);
      console.log('✓ Coluna "tipo" adicionada');
    } else {
      console.log('- Coluna "tipo" ja existe');
    }

    // Update default users with tipo
    await client.query(`UPDATE usuarios SET tipo = 'tecnico' WHERE nome = 'PEDRO' AND (tipo IS NULL OR tipo = 'operador')`);
    await client.query(`UPDATE usuarios SET tipo = 'tecnico' WHERE nome = 'GABRIEL' AND (tipo IS NULL OR tipo = 'operador')`);
    await client.query(`UPDATE usuarios SET tipo = 'vendedor' WHERE nome = 'PATRICK' AND (tipo IS NULL OR tipo = 'operador')`);
    await client.query(`UPDATE usuarios SET tipo = 'ambos' WHERE nome = 'GUSTAVO' AND (tipo IS NULL OR tipo = 'operador')`);
    console.log('✓ Tipos atualizados');

    await client.query('COMMIT');
    console.log('✅ Tabela usuarios atualizada');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro:', err);
  } finally {
    client.release();
    await pool.end();
  }
}
fix();