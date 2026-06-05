const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function checkTableStructure() {
  const client = await pool.connect();
  try {
    // Check unidades_medida table
    const unidadesResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'unidades_medida'
      ORDER BY ordinal_position
    `);
    console.log('=== UNIDADES_MEDIDA TABLE ===');
    unidadesResult.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? 'DEFAULT ' + col.column_default : ''}`);
    });
    
    // Check categorias_servico table
    const categoriasResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'categorias_servico'
      ORDER BY ordinal_position
    `);
    console.log('\n=== CATEGORIAS_SERVICO TABLE ===');
    categoriasResult.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? 'DEFAULT ' + col.column_default : ''}`);
    });
    
    // Check grupos_produtos table
    const gruposResult = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'grupos_produtos'
      ORDER BY ordinal_position
    `);
    console.log('\n=== GRUPOS_PRODUTOS TABLE ===');
    gruposResult.rows.forEach(col => {
      console.log(`${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? 'DEFAULT ' + col.column_default : ''}`);
    });
    
  } catch (err) {
    console.error('Error checking table structure:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

checkTableStructure();