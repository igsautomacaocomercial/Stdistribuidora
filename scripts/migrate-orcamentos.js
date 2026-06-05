const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const CONN = 'postgresql://stadmin:Qrp0dM4IHGgtBbnJUwjWjXu2TT3Rb5vH@dpg-d8h1bs28pkls73bqa27g-a.virginia-postgres.render.com/st_distribuidora';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || CONN,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'database', 'orcamentos.sql'), 'utf8');
  console.log('Executando migration de orcamentos...');
  try {
    await pool.query(sql);
    console.log('Migration concluida com sucesso!');
  } catch (e) {
    console.error('Erro na migration:', e.message);
  }
  await pool.end();
}

migrate();
