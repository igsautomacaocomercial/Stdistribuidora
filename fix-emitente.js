const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function fix() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Delete duplicate records, keep only the most recent one (highest ID)
    await client.query(`
      DELETE FROM emitente WHERE id NOT IN (
        SELECT MAX(id) FROM emitente
      )
    `);
    console.log('✓ Duplicatas removidas');

    // Add a unique constraint or ensure we only have one row
    // Also, for safety, add a CHECK or unique constraint? Not needed, we'll enforce via code

    await client.query('COMMIT');
    console.log('✅ Emitente corrigido - apenas 1 registro mantido');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro:', err);
  } finally {
    client.release();
    await pool.end();
  }
}
fix();