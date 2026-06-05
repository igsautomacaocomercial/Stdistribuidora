const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'st_distribuidora',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123',
  max: 10,
  idleTimeoutMillis: 30000
});

pool.on('error', err => console.error('Pool error:', err));

module.exports = {
  query: (text, params) => {
    const start = Date.now();
    return pool.query(text, params).then(res => {
      console.log(`[DB] ${res.rowCount} rows in ${Date.now() - start}ms`);
      return res;
    });
  },
  pool
};
