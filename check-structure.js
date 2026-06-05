const { Pool } = require('pg');

// Configure pool without SSL for local connection attempt
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:123@localhost:5432/st_distribuidora' 
});

async function checkTableStructure() {
  let client;
  try {
    client = await pool.connect();
    console.log('Connected to database');
    
    // Check servicos table structure
    const servicosColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'servicos'
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== SERVICOS TABLE STRUCTURE ===');
    servicosColumns.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? 'DEFAULT ' + col.column_default : ''}`);
    });
    
    // Check produtos table structure
    const produtosColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'produtos'
      ORDER BY ordinal_position
    `);
    
    console.log('\n=== PRODUTOS TABLE STRUCTURE ===');
    produtosColumns.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? 'DEFAULT ' + col.column_default : ''}`);
    });
    
    // Check if there's any data in servicos
    const servicosCount = await client.query('SELECT COUNT(*) as count FROM servicos');
    console.log(`\nNumber of servicos records: ${servicosCount.rows[0].count}`);
    
    // Check if there's any data in produtos
    const produtosCount = await client.query('SELECT COUNT(*) as count FROM produtos');
    console.log(`Number of produtos records: ${produtosCount.rows[0].count}`);
    
  } catch (err) {
    console.error('Error checking table structure:', err);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

checkTableStructure();