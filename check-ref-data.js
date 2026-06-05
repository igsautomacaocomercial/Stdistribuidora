const { Pool } = require('pg');

// Configure pool without SSL for local connection attempt
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:123@localhost:5432/st_distribuidora' 
});

async function checkReferenceData() {
  let client;
  try {
    client = await pool.connect();
    console.log('Connected to database');
    
    // Check service categories
    const categorias = await client.query(`
      SELECT id, nome FROM categorias_servico ORDER BY id
    `);
    console.log('\n=== SERVICE CATEGORIES ===');
    categorias.rows.forEach(cat => {
      console.log(`${cat.id}: ${cat.nome}`);
    });
    
    // Check product groups
    const grupos = await client.query(`
      SELECT id, nome FROM grupos_produtos ORDER BY id
    `);
    console.log('\n=== PRODUCT GROUPS ===');
    grupos.rows.forEach(grp => {
      console.log(`${grp.id}: ${grp.nome}`);
    });
    
    // Check measurement units
    const unidades = await client.query(`
      SELECT id, sigla, nome FROM unidades_medida ORDER BY id
    `);
    console.log('\n=== MEASUREMENT UNITS ===');
    unidades.rows.forEach(uni => {
      console.log(`${uni.id}: ${uni.sigla} - ${uni.nome}`);
    });
    
  } catch (err) {
    console.error('Error checking reference data:', err);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

checkReferenceData();