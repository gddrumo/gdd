const { Pool } = require('pg');
require('dotenv').config();

// Tenta pegar a variável padrão (DATABASE_URL) ou a específica (DB_CONNECTION_STRING)
const connectionString = process.env.DATABASE_URL || process.env.DB_CONNECTION_STRING;

if (!connectionString) {
  console.error('[DB] ERRO CRÍTICO: Nenhuma string de conexão encontrada.');
  console.error('Verifique se a variável DATABASE_URL está definida nas configurações da Vercel.');
  throw new Error('DATABASE_URL ausente');
}

console.log('[DB] Inicializando Pool de conexões PostgreSQL...');

const pool = new Pool({
  connectionString,
  // IMPORTANTE: Supabase exige SSL habilitado
  ssl: {
    rejectUnauthorized: false
  }
});

pool.on('error', (err) => {
  console.error('[DB] Erro inesperado no pool', err);
});

module.exports = pool;
