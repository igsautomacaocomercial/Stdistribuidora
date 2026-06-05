const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const CONN = 'postgresql://stadmin:Qrp0dM4IHGgtBbnJUwjWjXu2TT3Rb5vH@dpg-d8h1bs28pkls73bqa27g-a.virginia-postgres.render.com/st_distribuidora';
const pool = new Pool({ connectionString: process.env.DATABASE_URL || CONN, ssl: { rejectUnauthorized: false } });
async function migrate() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'database', 'pdv_caixa.sql'), 'utf8');
  console.log('Executando migration PDV/CAIXA...');
  try {
    await pool.query(sql);
    console.log('Migration concluida!');
  } catch (e) { console.error('Erro:', e.message); }
  await pool.end();
}
migrate();
