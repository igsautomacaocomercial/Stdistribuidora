const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:123@localhost:5432/st_distribuidora', 
  ssl: { rejectUnauthorized: false } 
});

async function checkColumns() {
  try {
    const result = await pool.query(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'servicos' ORDER BY ordinal_position"
    );
    console.log('Servicos columns:', result.rows.map(r => r.column_name));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await pool.end();
  }
}

checkColumns();