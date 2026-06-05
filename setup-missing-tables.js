const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false } 
});

async function setupMissingTables() {
  let client;
  try {
    client = await pool.connect();
    console.log('Connected to database');
    
    // Start transaction
    await client.query('BEGIN');
    
    // 1. Check if categorias_servico exists, create if not
    const catCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'categorias_servico'
      );
    `);
    
    if (!catCheck.rows[0].exists) {
      console.log('Creating categorias_servico table...');
      await client.query(`
        CREATE TABLE categorias_servico (
          id SERIAL PRIMARY KEY,
          nome VARCHAR(100) NOT NULL UNIQUE,
          descricao TEXT,
          data_cadastro TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✓ Created categorias_servico table');
    } else {
      console.log('- categorias_servico table already exists');
    }
    
    // Commit transaction
    await client.query('COMMIT');
    console.log('✅ Setup completed successfully!');
    
  } catch (err) {
    // Rollback on error
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('❌ Error setting up tables:', err);
    throw err;
  } finally {
    if (client) {
      client.release();
    }
    await pool.end();
  }
}

// Run the setup
setupMissingTables()
  .then(() => {
    console.log('Setup script finished.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Setup script failed:', err);
    process.exit(1);
  });