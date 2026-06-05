const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:123@localhost:5432/st_distribuidora' 
});

async function checkServicosData() {
  let client;
  try {
    client = await pool.connect();
    console.log('Connected to database');

    // Check the servicos table data
    const result = await client.query('SELECT * FROM servicos');
    console.log('\n=== SERVICOS TABLE DATA ===');
    result.rows.forEach(row => {
      console.log(row);
    });

  } catch (err) {
    console.error('Error checking servicos data:', err);
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

checkServicosData();