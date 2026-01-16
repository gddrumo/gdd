const express = require('express');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 8080;

// ========================================
// CONFIGURAÇÃO DE CORS
// ========================================
const corsOptions = {
  origin: function (origin, callback) {
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Middleware de log
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ========================================
// MIDDLEWARE: ANTI-CACHE PARA APIS
// ========================================
// Garante que respostas de API nunca sejam cacheadas
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// ========================================
// SERVIR ARQUIVOS ESTÁTICOS - PRIMEIRO!
// ========================================
const clientBuildPath = path.join(__dirname, 'client/dist');
const frontendExists = fs.existsSync(clientBuildPath);

if (frontendExists) {
  console.log('[STATIC] Frontend encontrado em:', clientBuildPath);

  // Middleware para MIME types básicos
  app.use((req, res, next) => {
    if (req.path.endsWith('.js')) {
      res.type('application/javascript; charset=utf-8');
    } else if (req.path.endsWith('.css')) {
      res.type('text/css; charset=utf-8');
    } else if (req.path.endsWith('.json')) {
      res.type('application/json; charset=utf-8');
    } else if (req.path.endsWith('.wasm')) {
      res.type('application/wasm');
    }
    next();
  });

  app.use(
    express.static(clientBuildPath, {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        } else if (filePath.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css; charset=utf-8');
        }
      },
    })
  );

  app.use(
    '/assets',
    express.static(path.join(clientBuildPath, 'assets'), {
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.js')) {
          res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        } else if (filePath.endsWith('.css')) {
          res.setHeader('Content-Type', 'text/css; charset=utf-8');
        }
      },
    })
  );
} else {
  console.log('[STATIC] Frontend não encontrado. API rodando em modo standalone.');
}

// ========================================
// HELPERS
// ========================================

// Demand -> formato que o front espera
function mapRowToDemand(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    personId: row.person_id,
    areaId: row.area_id,
    requesterName: row.requester_name,
    requesterAreaId: row.requester_area_id,
    category: row.category,
    type: row.type,
    status: row.status,
    complexity: row.complexity,
    effort: row.effort,
    agreedDeadline: row.agreed_deadline,
    createdAt: row.created_at,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    cancellationReason: row.cancellation_reason,
    delayJustification: row.delay_justification,
    deliverySummary: row.delivery_summary,
    isPriority: row.is_priority,
    logs: row.logs || [],
    history: row.history || [],
    statusTimestamps: row.status_timestamps || {},
  };
}

const mapCategoryRow = (row) => ({
  id: row.id,
  name: row.name,
});

const mapSlaRow = (row) => ({
  id: row.id,
  categoryId: row.category_id,
  complexity: row.complexity,
  slaHours: row.sla_hours,
});

const mapPersonRow = (row) => ({
  id: row.id,
  name: row.name,
  role: row.role || '',
  coordinationId: row.coordination_id,
  email: row.email || '',
});
// Converte IDs vindos do front para integer ou null
function toDbId(value) {
  if (value === undefined || value === null || value === '') return null;
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

// ========================================
// ENDPOINTS DE DIAGNÓSTICO
// ========================================
app.get('/api/health', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS now');
    res.json({
      ok: true,
      now: result.rows[0].now,
      environment: process.env.NODE_ENV || 'development',
      port: PORT,
      dbConnected: true,
    });
  } catch (err) {
    console.error('[HEALTH] Erro ao conectar no banco:', err);
    res.status(500).json({
      ok: false,
      error: 'Falha ao conectar no banco',
      details: err.message,
      port: PORT,
      dbConnected: false,
    });
  }
});

app.post('/api/run-migration', async (req, res) => {
  console.log('[MIGRATION] Executando migração do schema...');

  const migrationSQL = `
-- Drop existing conflicting tables
DROP TABLE IF EXISTS slas CASCADE;
DROP TABLE IF EXISTS sla_configs CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS people CASCADE;
DROP TABLE IF EXISTS coordinations CASCADE;
DROP TABLE IF EXISTS areas CASCADE;

-- Create areas table with TEXT ids
CREATE TABLE areas (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT ''
);

-- Create coordinations table with TEXT ids (Technical Coordinations)
CREATE TABLE coordinations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT DEFAULT ''
);

-- Create categories table with TEXT ids
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- Create people table with TEXT ids
CREATE TABLE people (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT DEFAULT '',
  area_id TEXT REFERENCES areas(id) ON DELETE SET NULL,
  email TEXT DEFAULT ''
);

-- Create sla_configs table (unified name)
CREATE TABLE sla_configs (
  id SERIAL PRIMARY KEY,
  category_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
  complexity TEXT NOT NULL CHECK (complexity IN ('Baixa', 'Média', 'Alta')),
  sla_hours INTEGER NOT NULL,
  UNIQUE(category_id, complexity)
);

-- Add indexes
CREATE INDEX idx_people_area_id ON people(area_id);
CREATE INDEX idx_sla_configs_category_id ON sla_configs(category_id);
CREATE INDEX idx_coordinations_name ON coordinations(name);

-- Insert default data
INSERT INTO areas (id, name, description) VALUES
  ('area-marketing', 'Marketing', 'Área de Marketing'),
  ('area-rh', 'Recursos Humanos', 'Área de RH'),
  ('area-financas', 'Finanças', 'Área de Finanças'),
  ('area-vendas', 'Vendas', 'Área de Vendas');

INSERT INTO coordinations (id, name, description) VALUES
  ('coord-dev', 'Desenvolvimento', 'Coordenação Técnica de Desenvolvimento'),
  ('coord-infra', 'Infraestrutura', 'Coordenação Técnica de Infraestrutura'),
  ('coord-data', 'Dados e Analytics', 'Coordenação Técnica de Dados'),
  ('coord-sec', 'Segurança', 'Coordenação Técnica de Segurança');

INSERT INTO categories (id, name) VALUES
  ('cat-feature', 'Feature'),
  ('cat-bugfix', 'Correção de Bug'),
  ('cat-improvement', 'Melhoria');

INSERT INTO sla_configs (category_id, complexity, sla_hours) VALUES
  ('cat-feature', 'Baixa', 24),
  ('cat-feature', 'Média', 48),
  ('cat-feature', 'Alta', 120),
  ('cat-bugfix', 'Baixa', 8),
  ('cat-bugfix', 'Média', 16),
  ('cat-bugfix', 'Alta', 48);
  `;

  try {
    await pool.query(migrationSQL);

    // Verify tables
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `);

    console.log('[MIGRATION] ✓ Migração concluída!');
    console.log('[MIGRATION] Tabelas:', result.rows.map(r => r.table_name).join(', '));

    res.json({
      ok: true,
      message: 'Migração executada com sucesso!',
      tables: result.rows.map(r => r.table_name)
    });
  } catch (err) {
    console.error('[MIGRATION] ✗ Erro:', err.message);
    res.status(500).json({
      ok: false,
      error: 'Erro ao executar migração',
      details: err.message
    });
  }
});

app.get('/api/test-crud', async (req, res) => {
  const results = {
    select: false,
    insert: false,
    update: false,
    delete: false,
    details: {},
    errors: [],
  };

  const testId = `test-${Date.now()}`;

  try {
    console.log('[TEST-CRUD] Testando SELECT...');
    await pool.query('SELECT 1;');
    results.select = true;
    results.details.select = 'OK';

    console.log('[TEST-CRUD] Testando INSERT...');
    await pool.query(
      `INSERT INTO demands (id, title, description, person_id, area_id, requester_name, requester_area_id, 
       category, type, status, complexity, effort, created_at, logs, history, status_timestamps)
       VALUES ($1, 'TEST', 'TEST', null, null, 'TEST', null, 'TEST', 'Tarefa', 'Fila de Avaliação', 
       'Baixa', 0, NOW(), '[]'::jsonb, '[]'::jsonb, '{}'::jsonb);`,
      [testId]
    );
    results.insert = true;
    results.details.insert = 'OK - ID: ' + testId;

    console.log('[TEST-CRUD] Testando UPDATE...');
    const updateResult = await pool.query(
      `UPDATE demands SET title = 'TEST_UPDATED' WHERE id = $1 RETURNING id;`,
      [testId]
    );
    results.update = true;
    results.details.update = `OK - Rows affected: ${updateResult.rowCount}`;

    console.log('[TEST-CRUD] Testando DELETE...');
    const deleteResult = await pool.query(
      `DELETE FROM demands WHERE id = $1 RETURNING id;`,
      [testId]
    );
    results.delete = true;
    results.details.delete = `OK - Rows affected: ${deleteResult.rowCount}`;

    console.log('[TEST-CRUD] Todos os testes passaram!');
    res.json({
      ok: true,
      permissions: results,
      message: 'Todas as operações CRUD estão funcionando!',
    });
  } catch (err) {
    results.errors.push(err.message);
    console.error('[TEST-CRUD] Erro:', err.message);

    try {
      await pool.query(`DELETE FROM demands WHERE id = $1;`, [testId]);
    } catch (cleanupErr) {
      console.error('[TEST-CRUD] Erro no cleanup:', cleanupErr.message);
    }

    res.status(500).json({
      ok: false,
      permissions: results,
      error: err.message,
      hint: 'Verifique as permissões do usuário do banco de dados',
    });
  }
});

// ========================================
// CRUD: DEMANDS
// ========================================
app.get('/api/demands', async (req, res) => {
  console.log('[GET /api/demands] Iniciando busca...');
  try {
    const result = await pool.query('SELECT * FROM demands ORDER BY created_at DESC;');
    const demands = result.rows.map(mapRowToDemand);
    console.log(`[GET /api/demands] Retornando ${demands.length} demandas`);
    res.json(demands);
  } catch (err) {
    console.error('[GET /api/demands] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao buscar demandas', details: err.message });
  }
});

app.post('/api/demands', async (req, res) => {
  const demand = req.body;
  console.log('[POST /api/demands] Criando demanda:', demand.id);

  // converte IDs para integer ou null
  const dbPersonId = toDbId(demand.personId);
  const dbAreaId = toDbId(demand.areaId);
  const dbRequesterAreaId = toDbId(demand.requesterAreaId);

  const query = `
    INSERT INTO demands (
      id, title, description, person_id, area_id,
      requester_name, requester_area_id, category, type, status,
      complexity, effort, agreed_deadline, created_at,
      started_at, finished_at, cancellation_reason, delay_justification,
      delivery_summary, is_priority, logs, history, status_timestamps
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, $16, $17, $18,
      $19, $20, $21::jsonb, $22::jsonb, $23::jsonb
    )
    RETURNING *;
  `;

  const values = [
    demand.id,
    demand.title,
    demand.description || '',
    dbPersonId,
    dbAreaId,
    demand.requesterName || null,
    dbRequesterAreaId,
    demand.category || null,
    demand.type || null,
    demand.status || null,
    demand.complexity || null,
    demand.effort ?? null,
    demand.agreedDeadline || null,
    demand.createdAt || new Date().toISOString(),
    demand.startedAt || null,
    demand.finishedAt || null,
    demand.cancellationReason || null,
    demand.delayJustification || null,
    demand.deliverySummary || null,
    demand.isPriority ?? false,
    JSON.stringify(demand.logs || []),
    JSON.stringify(demand.history || []),
    JSON.stringify(demand.statusTimestamps || {}),
  ];

  try {
    const result = await pool.query(query, values);
    const created = mapRowToDemand(result.rows[0]);
    console.log('[POST /api/demands] Demanda criada:', created.id);
    res.status(201).json(created);
  } catch (err) {
    console.error('[POST /api/demands] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao criar demanda', details: err.message });
  }
});


app.put('/api/demands/:id', async (req, res) => {
  const { id } = req.params;
  const demand = req.body;
  console.log('[PUT /api/demands/:id] Atualizando demanda:', id);

  const dbPersonId = toDbId(demand.personId);
  const dbAreaId = toDbId(demand.areaId);
  const dbRequesterAreaId = toDbId(demand.requesterAreaId);

  const query = `
    UPDATE demands SET
      title = $2, description = $3, person_id = $4, area_id = $5,
      requester_name = $6, requester_area_id = $7, category = $8, type = $9, status = $10,
      complexity = $11, effort = $12, agreed_deadline = $13, created_at = $14,
      started_at = $15, finished_at = $16, cancellation_reason = $17, delay_justification = $18,
      delivery_summary = $19, is_priority = $20, logs = $21::jsonb, history = $22::jsonb,
      status_timestamps = $23::jsonb
    WHERE id = $1
    RETURNING *;
  `;

  const values = [
    id,
    demand.title,
    demand.description || '',
    dbPersonId,
    dbAreaId,
    demand.requesterName || null,
    dbRequesterAreaId,
    demand.category || null,
    demand.type || null,
    demand.status || null,
    demand.complexity || null,
    demand.effort ?? null,
    demand.agreedDeadline || null,
    demand.createdAt || new Date().toISOString(),
    demand.startedAt || null,
    demand.finishedAt || null,
    demand.cancellationReason || null,
    demand.delayJustification || null,
    demand.deliverySummary || null,
    demand.isPriority ?? false,
    JSON.stringify(demand.logs || []),
    JSON.stringify(demand.history || []),
    JSON.stringify(demand.statusTimestamps || {}),
  ];

  try {
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      console.log('[PUT /api/demands/:id] Demanda não encontrada:', id);
      return res.status(404).json({ error: 'Demanda não encontrada' });
    }
    const updated = mapRowToDemand(result.rows[0]);
    console.log('[PUT /api/demands/:id] Demanda atualizada:', id);
    res.json(updated);
  } catch (err) {
    console.error('[PUT /api/demands/:id] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao atualizar demanda', details: err.message });
  }
});


app.delete('/api/demands/:id', async (req, res) => {
  const { id } = req.params;
  console.log('[DELETE /api/demands/:id] Deletando demanda:', id);

  try {
    const result = await pool.query('DELETE FROM demands WHERE id = $1 RETURNING id;', [id]);
    if (result.rowCount === 0) {
      console.log('[DELETE /api/demands/:id] Demanda não encontrada:', id);
      return res.status(404).json({ error: 'Demanda não encontrada' });
    }
    console.log('[DELETE /api/demands/:id] Demanda deletada:', id);
    res.status(204).send();
  } catch (err) {
    console.error('[DELETE /api/demands/:id] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao deletar demanda', details: err.message });
  }
});

// ========================================
// CONFIGURAÇÕES: AREAS
// ========================================
app.get('/api/areas', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, description FROM areas ORDER BY name;');
    res.json(result.rows);
  } catch (err) {
    console.error('[GET /api/areas] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao buscar áreas', details: err.message });
  }
});

app.post('/api/areas', async (req, res) => {
  const { id, name, description } = req.body;

  try {
    const newId = id || `area-${Date.now()}`;
    const result = await pool.query(
      'INSERT INTO areas (id, name, description) VALUES ($1, $2, $3) RETURNING id, name, description;',
      [newId, name, description || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[POST /api/areas] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao criar área', details: err.message });
  }
});

app.put('/api/areas/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  try {
    const result = await pool.query(
      'UPDATE areas SET name = $2, description = $3 WHERE id = $1 RETURNING id, name, description;',
      [id, name, description || '']
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Área não encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[PUT /api/areas/:id] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao atualizar área', details: err.message });
  }
});

app.delete('/api/areas/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM areas WHERE id = $1 RETURNING id;', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Área não encontrada' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('[DELETE /api/areas/:id] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao deletar área', details: err.message });
  }
});

// ========================================
// COORDINATIONS (Technical Coordinations)
// ========================================
app.get('/api/coordinations', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, description FROM coordinations ORDER BY name;');
    res.json(result.rows);
  } catch (err) {
    console.error('[GET /api/coordinations] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao buscar coordenações', details: err.message });
  }
});

app.post('/api/coordinations', async (req, res) => {
  const { id, name, description } = req.body;

  try {
    const newId = id || `coord-${Date.now()}`;
    const result = await pool.query(
      'INSERT INTO coordinations (id, name, description) VALUES ($1, $2, $3) RETURNING id, name, description;',
      [newId, name, description || '']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[POST /api/coordinations] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao criar coordenação', details: err.message });
  }
});

app.put('/api/coordinations/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description } = req.body;
  try {
    const result = await pool.query(
      'UPDATE coordinations SET name = $2, description = $3 WHERE id = $1 RETURNING id, name, description;',
      [id, name, description || '']
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Coordenação não encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[PUT /api/coordinations/:id] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao atualizar coordenação', details: err.message });
  }
});

app.delete('/api/coordinations/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM coordinations WHERE id = $1 RETURNING id;', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Coordenação não encontrada' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('[DELETE /api/coordinations/:id] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao deletar coordenação', details: err.message });
  }
});

// ========================================
// AUTHENTICATION
// ========================================
app.post('/api/auth/login', async (req, res) => {
  const { profileType, password } = req.body;

  // Por enquanto, manter a mesma lógica, mas movida para o backend
  // TODO: Implementar auth real com hash de senhas e JWT
  const validCredentials = {
    'GESTAO': 'rumo@2026',
    'TIME': 'rumo@2030'
  };

  if (validCredentials[profileType] === password) {
    const user = profileType === 'GESTAO' ? {
      id: 'u-gestao',
      name: 'Gestor Executivo',
      email: 'gestao@gdd.com',
      role: 'GESTAO'
    } : {
      id: 'u-time',
      name: 'Especialista Técnico',
      email: 'time@gdd.com',
      role: 'TIME'
    };

    res.json({ success: true, user });
  } else {
    res.status(401).json({ success: false, error: 'Credenciais inválidas' });
  }
});

// ========================================
// CONFIGURAÇÕES: PEOPLE
// ========================================
app.get('/api/people', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, name, role, coordination_id, email FROM people ORDER BY name;');
    res.json(result.rows.map(mapPersonRow));
  } catch (err) {
    console.error('[GET /api/people] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao buscar pessoas', details: err.message });
  }
});

app.post('/api/people', async (req, res) => {
  const { id, name, role, coordinationId, email } = req.body;

  try {
    const newId = id || `person-${Date.now()}`;
    const result = await pool.query(
      'INSERT INTO people (id, name, role, coordination_id, email) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, role, coordination_id, email;',
      [newId, name, role || '', coordinationId || null, email || '']
    );
    res.status(201).json(mapPersonRow(result.rows[0]));
  } catch (err) {
    console.error('[POST /api/people] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao criar pessoa', details: err.message });
  }
});

app.put('/api/people/:id', async (req, res) => {
  const { id } = req.params;
  const { name, role, coordinationId, email } = req.body;

  try {
    const result = await pool.query(
      'UPDATE people SET name = $2, role = $3, coordination_id = $4, email = $5 WHERE id = $1 RETURNING id, name, role, coordination_id, email;',
      [id, name, role || '', coordinationId || null, email || '']
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }
    res.json(mapPersonRow(result.rows[0]));
  } catch (err) {
    console.error('[PUT /api/people/:id] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao atualizar pessoa', details: err.message });
  }
});

app.delete('/api/people/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('DELETE FROM people WHERE id = $1 RETURNING id;', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('[DELETE /api/people/:id] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao deletar pessoa', details: err.message });
  }
});

// ========================================
// CONFIGURAÇÕES: CATEGORIES
// ========================================
app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name FROM categories ORDER BY name;'
    );
    res.json(result.rows.map(mapCategoryRow));
  } catch (err) {
    console.error('[GET /api/categories] Erro:', err.message);
    res.status(500).json({
      error: 'Erro ao buscar categorias',
      details: err.message,
    });
  }
});

// Criar categoria
app.post('/api/categories', async (req, res) => {
  const { id, name } = req.body;

  try {
    const newId = id || `cat-${Date.now()}`;
    const result = await pool.query(
      'INSERT INTO categories (id, name) VALUES ($1, $2) RETURNING id, name;',
      [newId, name]
    );
    res.status(201).json(mapCategoryRow(result.rows[0]));
  } catch (err) {
    console.error('[POST /api/categories] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao criar categoria', details: err.message });
  }
});

// Atualizar categoria
app.put('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    const result = await pool.query(
      'UPDATE categories SET name = $2 WHERE id = $1 RETURNING id, name;',
      [id, name]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('[PUT /api/categories/:id] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao atualizar categoria', details: err.message });
  }
});

// Deletar categoria
app.delete('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM categories WHERE id = $1 RETURNING id;',
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('[DELETE /api/categories/:id] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao deletar categoria', details: err.message });
  }
});


// ========================================
// CONFIGURAÇÕES: SLAS (tabela sla_configs)
// ========================================
app.get('/api/slas', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, category_id, complexity, sla_hours FROM sla_configs ORDER BY category_id, complexity;'
    );
    res.json(result.rows.map(mapSlaRow));
  } catch (err) {
    console.error('[GET /api/slas] Erro:', err.message);
    res.status(500).json({
      error: 'Erro ao buscar SLAs',
      details: err.message,
    });
  }
});

// Criar SLA
app.post('/api/slas', async (req, res) => {
  const { categoryId, complexity, slaHours } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO sla_configs (category_id, complexity, sla_hours) VALUES ($1, $2, $3) RETURNING id, category_id, complexity, sla_hours;',
      [categoryId, complexity, slaHours]
    );

    const row = result.rows[0];
    const sla = {
      id: row.id,
      categoryId: row.category_id,
      complexity: row.complexity,
      slaHours: row.sla_hours,
    };
    res.status(201).json(sla);
  } catch (err) {
    console.error('[POST /api/slas] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao criar SLA', details: err.message });
  }
});

// Atualizar SLA
app.put('/api/slas/:id', async (req, res) => {
  const { id } = req.params;
  const { categoryId, complexity, slaHours } = req.body;
  try {
    const result = await pool.query(
      'UPDATE sla_configs SET category_id = $2, complexity = $3, sla_hours = $4 WHERE id = $1 RETURNING id, category_id, complexity, sla_hours;',
      [id, categoryId, complexity, slaHours]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'SLA não encontrado' });
    }

    const row = result.rows[0];
    const sla = {
      id: row.id,
      categoryId: row.category_id,
      complexity: row.complexity,
      slaHours: row.sla_hours,
    };
    res.json(sla);
  } catch (err) {
    console.error('[PUT /api/slas/:id] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao atualizar SLA', details: err.message });
  }
});

// Deletar SLA
app.delete('/api/slas/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'DELETE FROM sla_configs WHERE id = $1 RETURNING id;',
      [id]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'SLA não encontrado' });
    }
    res.status(204).send();
  } catch (err) {
    console.error('[DELETE /api/slas/:id] Erro:', err.message);
    res.status(500).json({ error: 'Erro ao deletar SLA', details: err.message });
  }
});


// ========================================
// FALLBACK PARA INDEX.HTML - POR ÚLTIMO!
// ========================================
if (frontendExists) {
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
      return res.status(404).json({ error: 'Endpoint não encontrado' });
    }
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
} else {
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api/')) {
      res.json({
        message: 'GDD 2.0 API está rodando',
        status: 'ok',
        frontend: 'não disponível (modo API standalone)',
        endpoints: {
          health: '/api/health',
          testCrud: '/api/test-crud',
          demands: '/api/demands',
          areas: '/api/areas',
          people: '/api/people',
        },
      });
    }
  });
}

// ========================================
// ERROR HANDLING
// ========================================
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// ========================================
// START SERVER
// ========================================

// A Vercel precisa que o 'app' seja exportado para transformá-lo em Serverless Function
module.exports = app;

// Verificação Mágica:
// Se este arquivo for o "principal" (rodando via 'node index.js' ou no Render), iniciamos o servidor.
// Se ele for importado pela Vercel, ignoramos o listen (a Vercel cuida disso).
if (require.main === module) {
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`╔═══════════════════════════════════════╗`);
    console.log(`║  GDD 2.0 Backend Server               ║`);
    console.log(`║  Porta: ${PORT.toString().padEnd(29)} ║`);
    console.log(`║  Host: 0.0.0.0                        ║`);
    console.log(`║  Ambiente: ${(process.env.NODE_ENV || 'development').padEnd(23)} ║`);
    console.log(
      `║  Frontend: ${(frontendExists ? 'Disponível' : 'Não encontrado').padEnd(23)} ║`
    );
    console.log(`╠═══════════════════════════════════════╣`);
    console.log(`║  Endpoints de Teste:                  ║`);
    console.log(`║  GET  /api/health                     ║`);
    console.log(`║  GET  /api/test-crud                  ║`);
    console.log(`╚═══════════════════════════════════════╝`);
    console.log(`\n[SERVER] Servidor iniciado em http://0.0.0.0:${PORT}`);
  });

  // Graceful shutdown (Só faz sentido se o servidor estiver rodando por conta própria)
  process.on('SIGTERM', () => {
    console.log('[SERVER] SIGTERM recebido. Encerrando gracefully...');
    server.close(() => {
      console.log('[SERVER] Servidor encerrado');
      pool.end(() => {
        console.log('[DB] Pool de conexões encerrado');
        process.exit(0);
      });
    });
  });
}

module.exports = app;
