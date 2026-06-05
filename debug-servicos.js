const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async debugServicosTable() {
  const client = await pool.connect();
  try {
    // Let's get the exact table definition
    const result = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'servicos'
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);
    
    console.log('=== COLUMNS IN SERVICOS TABLE ===');
    result.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? 'DEFAULT ' + col.column_default : ''}`);
    });
    
    // Let's also try a simple select to see if we can query it
    const testSelect = await client.query('SELECT id, nome_servico FROM servicos LIMIT 1');
    console.log('\n=== TEST SELECT WORKS ==');
    console.log(`Found ${testSelect.rowCount} rows`);
    if (testSelect.rowCount > 0) {
      console.log(`First row: id=${testSelect.rows[0].id}, nome_servico=${testSelect.rows[0].nome_servico}`);
    }
    
  } catch (err) {
    console.error('Error:', err);
    console.error('Error code:', err.code);
    console.error('Error detail:', err.detail);
    console.error('Error hint:', err.hint);
  } finally {
    client.release();
    await pool.end();
  }
}

debugServicosTable();