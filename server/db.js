const { Pool } = require('pg');
const path = require('path');

// Carrega .env APENAS para ambiente local.
// Em Cloud Run não faz diferença se não existir o arquivo.
require('dotenv').config({
  path: path.join(__dirname, '.env'),
  // se você preferir manter o .env na raiz do projeto:
  // path: path.join(__dirname, '..', '.env'),
});

// Uma única variável de ambiente com a connection string completa.
// Exemplo produção (Cloud SQL via Unix socket):
// postgresql://gdd_user:SENHA@/gdd_db?host=/cloudsql/PROJETO:REGIAO:gdd2-sql
const connectionString = process.env.DB_CONNECTION_STRING;

if (!connectionString) {
  console.error('[DB] ERRO: DB_CONNECTION_STRING não definida. Verifique:');
  console.error('- Em desenvolvimento local: arquivo .env ou variável do terminal');
  console.error('- Em produção (Cloud Run): variável de ambiente DB_CONNECTION_STRING');
  throw new Error('DB_CONNECTION_STRING ausente');
}

console.log('[DB] Inicializando Pool de conexões PostgreSQL...');
const pool = new Pool({ connectionString });

pool.on('error', (err) => {
  console.error('[DB] Erro inesperado no pool', err);
});

module.exports = pool;
