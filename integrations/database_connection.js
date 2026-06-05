/**
 * ============================================================================
 * CONEXAO COM POSTGRESQL
 * Configuracao centralizada - ambiente de homologacao
 * ============================================================================
 */

const { Pool } = require('pg');

let poolConfig = {};

if (process.env.DATABASE_URL) {
    // Use DATABASE_URL if available (common in Render and other platforms)
    poolConfig = {
        connectionString: process.env.DATABASE_URL,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    };
} else {
    // Fall back to individual variables
    poolConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'st_distribuidora',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '123',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
    };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
    console.error('Erro inesperado no pool do PostgreSQL:', err);
});

/**
 * Executa uma query no banco de dados
 */
async function query(text, params) {
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`Query executada em ${duration}ms | linhas: ${result.rowCount}`);
    return result;
}

/**
 * Retorna um cliente do pool para transacoes
 */
async function getClient() {
    const client = await pool.connect();
    return client;
}

module.exports = { pool, query, getClient };
