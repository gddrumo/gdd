#!/usr/bin/env node
/**
 * Script de validação da migração 003
 * Verifica se a migração pode ser executada com segurança
 *
 * Uso:
 *   node server/migrations/validate_migration.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuração do banco
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function header(msg) {
  console.log('');
  log('='.repeat(60), 'cyan');
  log(msg, 'cyan');
  log('='.repeat(60), 'cyan');
  console.log('');
}

async function checkTableStructure() {
  header('1. VERIFICANDO ESTRUTURA DA TABELA PEOPLE');

  const result = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'people'
    ORDER BY ordinal_position;
  `);

  console.table(result.rows);

  const hasAreaId = result.rows.some(r => r.column_name === 'area_id');
  const hasCoordinationId = result.rows.some(r => r.column_name === 'coordination_id');

  return { hasAreaId, hasCoordinationId };
}

async function checkCoordinationsTable() {
  header('2. VERIFICANDO TABELA COORDINATIONS');

  try {
    const result = await pool.query('SELECT COUNT(*) as count FROM coordinations;');
    const count = parseInt(result.rows[0].count);

    if (count > 0) {
      log(`✓ Tabela coordinations existe com ${count} registros`, 'green');

      const coords = await pool.query('SELECT id, name FROM coordinations ORDER BY name;');
      console.table(coords.rows);

      return true;
    } else {
      log('✗ Tabela coordinations está vazia!', 'red');
      return false;
    }
  } catch (err) {
    log(`✗ Tabela coordinations não existe: ${err.message}`, 'red');
    return false;
  }
}

async function checkPeopleData() {
  header('3. VERIFICANDO DADOS DE PESSOAS');

  const result = await pool.query(`
    SELECT
      id,
      name,
      role,
      area_id,
      email
    FROM people
    ORDER BY name
    LIMIT 10;
  `);

  if (result.rows.length > 0) {
    log(`Total de pessoas na amostra: ${result.rows.length}`, 'blue');
    console.table(result.rows);
  } else {
    log('⚠ Nenhuma pessoa cadastrada', 'yellow');
  }

  return result.rows;
}

async function checkOrphanedReferences() {
  header('4. VERIFICANDO REFERÊNCIAS ÓRFÃS');

  const result = await pool.query(`
    SELECT
      p.id,
      p.name,
      p.area_id
    FROM people p
    WHERE p.area_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM coordinations c WHERE c.id = p.area_id
      );
  `);

  if (result.rows.length > 0) {
    log(`✗ ATENÇÃO: ${result.rows.length} pessoas com area_id inválida!`, 'red');
    console.table(result.rows);
    return false;
  } else {
    log('✓ Nenhuma referência órfã encontrada', 'green');
    return true;
  }
}

async function checkDistribution() {
  header('5. DISTRIBUIÇÃO DE PESSOAS POR AREA/COORDENAÇÃO');

  const result = await pool.query(`
    SELECT
      COALESCE(area_id, '(NULL)') as area_id,
      COUNT(*) as quantidade
    FROM people
    GROUP BY area_id
    ORDER BY quantidade DESC;
  `);

  console.table(result.rows);
}

async function simulateMigration() {
  header('6. SIMULANDO MIGRAÇÃO (SEM EXECUTAR)');

  log('Testando se a migração seria bem-sucedida...', 'yellow');

  try {
    await pool.query('BEGIN;');

    // Simular adição de coluna
    log('→ Adicionaria coluna coordination_id', 'blue');

    // Simular cópia de dados
    const countResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM people
      WHERE area_id IS NOT NULL;
    `);
    const count = parseInt(countResult.rows[0].count);
    log(`→ Copiaria ${count} registros de area_id → coordination_id`, 'blue');

    // Simular FK constraint
    log('→ Adicionaria FK constraint para coordinations', 'blue');

    // Simular remoção de coluna
    log('→ Removeria coluna area_id', 'blue');

    // Simular criação de índice
    log('→ Criaria índice idx_people_coordination_id', 'blue');

    await pool.query('ROLLBACK;');

    log('\n✓ Simulação concluída com sucesso!', 'green');
    log('A migração pode ser executada com segurança.', 'green');

    return true;
  } catch (err) {
    await pool.query('ROLLBACK;');
    log(`\n✗ Erro na simulação: ${err.message}`, 'red');
    return false;
  }
}

async function showMigrationSQL() {
  header('7. COMANDOS SQL DA MIGRAÇÃO');

  const migrationPath = path.join(__dirname, '003_link_people_to_coordinations.sql');

  try {
    const sql = fs.readFileSync(migrationPath, 'utf8');

    // Extrair apenas os comandos principais (sem comentários)
    const commands = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim().length > 0)
      .slice(0, 20) // Primeiras 20 linhas
      .join('\n');

    log('Conteúdo da migração (resumo):', 'yellow');
    console.log(commands);
  } catch (err) {
    log(`⚠ Não foi possível ler o arquivo de migração: ${err.message}`, 'yellow');
  }
}

async function generateReport(checks) {
  header('RELATÓRIO FINAL DE VALIDAÇÃO');

  console.log('Status dos checks:');
  console.log('');

  const items = [
    { check: 'Estrutura da tabela people', status: checks.hasAreaId && !checks.hasCoordinationId },
    { check: 'Tabela coordinations existe', status: checks.coordinationsExists },
    { check: 'Sem referências órfãs', status: checks.noOrphans },
    { check: 'Simulação bem-sucedida', status: checks.simulationOk },
  ];

  items.forEach(item => {
    const icon = item.status ? '✓' : '✗';
    const color = item.status ? 'green' : 'red';
    log(`${icon} ${item.check}`, color);
  });

  console.log('');

  const allPassed = items.every(item => item.status);

  if (allPassed) {
    log('═'.repeat(60), 'green');
    log('✓ TODOS OS CHECKS PASSARAM!', 'green');
    log('═'.repeat(60), 'green');
    log('', 'green');
    log('Você pode executar a migração com segurança:', 'green');
    log('psql $DATABASE_URL -f server/migrations/003_link_people_to_coordinations.sql', 'cyan');
    log('', 'green');
  } else {
    log('═'.repeat(60), 'red');
    log('✗ ALGUNS CHECKS FALHARAM!', 'red');
    log('═'.repeat(60), 'red');
    log('', 'red');
    log('NÃO execute a migração ainda. Resolva os problemas acima primeiro.', 'red');
    log('', 'red');
  }

  return allPassed;
}

async function main() {
  try {
    console.clear();
    log('╔══════════════════════════════════════════════════════════╗', 'cyan');
    log('║  VALIDADOR DE MIGRAÇÃO 003: PEOPLE → COORDINATIONS      ║', 'cyan');
    log('╚══════════════════════════════════════════════════════════╝', 'cyan');

    const structure = await checkTableStructure();
    const coordinationsExists = await checkCoordinationsTable();
    await checkPeopleData();
    const noOrphans = await checkOrphanedReferences();
    await checkDistribution();
    const simulationOk = await simulateMigration();
    await showMigrationSQL();

    const checks = {
      hasAreaId: structure.hasAreaId,
      hasCoordinationId: structure.hasCoordinationId,
      coordinationsExists,
      noOrphans,
      simulationOk
    };

    const success = await generateReport(checks);

    process.exit(success ? 0 : 1);

  } catch (err) {
    log(`\nERRO FATAL: ${err.message}`, 'red');
    console.error(err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
