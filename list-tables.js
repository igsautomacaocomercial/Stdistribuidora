const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function listTables() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log('Tables in database:');
    result.rows.forEach(row => console.log('  - ' + row.table_name));
  } finally {
    client.release();
    await pool.end();
  }
}

listTables();