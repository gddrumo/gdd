-- ========================================
-- SCRIPT DE ATUALIZAÇÃO DA ESTRUTURA DO BANCO
-- GDD 2.0 - Gestão de Demandas
-- ========================================

-- 1. TABELA: AREAS
-- Serve tanto para Áreas Solicitantes quanto Coordenações Técnicas
-- ========================================
ALTER TABLE areas ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

COMMENT ON TABLE areas IS 'Armazena tanto Áreas Solicitantes quanto Coordenações Técnicas';
COMMENT ON COLUMN areas.id IS 'ID único da área';
COMMENT ON COLUMN areas.name IS 'Nome da área ou coordenação';
COMMENT ON COLUMN areas.description IS 'Descrição detalhada da área/coordenação';

-- 2. TABELA: PEOPLE
-- Pessoas vinculadas a Coordenações Técnicas
-- ========================================
ALTER TABLE people ADD COLUMN IF NOT EXISTS role VARCHAR(100) DEFAULT '';
ALTER TABLE people ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT '';

COMMENT ON TABLE people IS 'Pessoas vinculadas a Coordenações Técnicas (não a áreas solicitantes)';
COMMENT ON COLUMN people.id IS 'ID único da pessoa';
COMMENT ON COLUMN people.name IS 'Nome completo da pessoa';
COMMENT ON COLUMN people.role IS 'Cargo da pessoa';
COMMENT ON COLUMN people.area_id IS 'FK para areas - deve referenciar uma Coordenação Técnica';
COMMENT ON COLUMN people.email IS 'Email da pessoa';

-- 3. TABELA: CATEGORIES
-- Categorias de demandas (apenas nome)
-- ========================================
-- Remove coluna description se existir (apenas nome é necessário)
ALTER TABLE categories DROP COLUMN IF EXISTS description;

COMMENT ON TABLE categories IS 'Categorias de demandas (ex: Suporte, Desenvolvimento, Infraestrutura)';
COMMENT ON COLUMN categories.id IS 'ID único da categoria';
COMMENT ON COLUMN categories.name IS 'Nome da categoria';

-- 4. TABELA: SLA_CONFIGS
-- Configurações de SLA por categoria e complexidade
-- ========================================
COMMENT ON TABLE sla_configs IS 'Configurações de SLA (tempo esperado) por categoria e complexidade';
COMMENT ON COLUMN sla_configs.id IS 'ID único da configuração de SLA';
COMMENT ON COLUMN sla_configs.category_id IS 'FK para categories';
COMMENT ON COLUMN sla_configs.complexity IS 'Complexidade (Baixa, Média, Alta)';
COMMENT ON COLUMN sla_configs.sla_hours IS 'Tempo em horas para concluir a demanda';

-- 5. TABELA: DEMANDS
-- Demandas do sistema
-- ========================================
COMMENT ON TABLE demands IS 'Demandas criadas e gerenciadas pelo sistema';
COMMENT ON COLUMN demands.id IS 'ID único da demanda';
COMMENT ON COLUMN demands.title IS 'Título resumido da demanda';
COMMENT ON COLUMN demands.description IS 'Descrição detalhada da demanda';
COMMENT ON COLUMN demands.person_id IS 'FK para people - Responsável técnico';
COMMENT ON COLUMN demands.area_id IS 'FK para areas - Coordenação Técnica responsável';
COMMENT ON COLUMN demands.requester_name IS 'Nome do solicitante';
COMMENT ON COLUMN demands.requester_area_id IS 'FK para areas - Área Solicitante';
COMMENT ON COLUMN demands.category IS 'Categoria da demanda';
COMMENT ON COLUMN demands.type IS 'Tipo: Sistema ou Tarefa';
COMMENT ON COLUMN demands.status IS 'Status atual da demanda no fluxo';
COMMENT ON COLUMN demands.complexity IS 'Complexidade: Baixa, Média ou Alta';
COMMENT ON COLUMN demands.effort IS 'Esforço estimado em horas';
COMMENT ON COLUMN demands.agreed_deadline IS 'Prazo combinado para entrega';
COMMENT ON COLUMN demands.created_at IS 'Data/hora de criação';
COMMENT ON COLUMN demands.started_at IS 'Data/hora de início da execução';
COMMENT ON COLUMN demands.finished_at IS 'Data/hora de conclusão';
COMMENT ON COLUMN demands.cancellation_reason IS 'Motivo do cancelamento (se cancelada)';
COMMENT ON COLUMN demands.delay_justification IS 'Justificativa de atraso (se SLA excedido)';
COMMENT ON COLUMN demands.delivery_summary IS 'Resumo do que foi entregue';
COMMENT ON COLUMN demands.is_priority IS 'Se a demanda é prioritária';
COMMENT ON COLUMN demands.logs IS 'Logs de mudança de status (JSONB)';
COMMENT ON COLUMN demands.history IS 'Histórico de ações (JSONB)';
COMMENT ON COLUMN demands.status_timestamps IS 'Timestamps de cada status (JSONB)';

-- ========================================
-- ÍNDICES PARA PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_people_area_id ON people(area_id);
CREATE INDEX IF NOT EXISTS idx_demands_person_id ON demands(person_id);
CREATE INDEX IF NOT EXISTS idx_demands_area_id ON demands(area_id);
CREATE INDEX IF NOT EXISTS idx_demands_requester_area_id ON demands(requester_area_id);
CREATE INDEX IF NOT EXISTS idx_demands_status ON demands(status);
CREATE INDEX IF NOT EXISTS idx_demands_created_at ON demands(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sla_configs_category ON sla_configs(category_id, complexity);

-- ========================================
-- VALIDAÇÕES E CONSTRAINTS
-- ========================================

-- Garantir que people.area_id aponta para uma área existente
ALTER TABLE people DROP CONSTRAINT IF EXISTS fk_people_area;
ALTER TABLE people ADD CONSTRAINT fk_people_area
  FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL;

-- Garantir que demands.area_id aponta para uma área existente
ALTER TABLE demands DROP CONSTRAINT IF EXISTS fk_demands_area;
ALTER TABLE demands ADD CONSTRAINT fk_demands_area
  FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL;

-- Garantir que demands.requester_area_id aponta para uma área existente
ALTER TABLE demands DROP CONSTRAINT IF EXISTS fk_demands_requester_area;
ALTER TABLE demands ADD CONSTRAINT fk_demands_requester_area
  FOREIGN KEY (requester_area_id) REFERENCES areas(id) ON DELETE SET NULL;

-- Garantir que demands.person_id aponta para uma pessoa existente
ALTER TABLE demands DROP CONSTRAINT IF EXISTS fk_demands_person;
ALTER TABLE demands ADD CONSTRAINT fk_demands_person
  FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE SET NULL;

-- ========================================
-- FIM DO SCRIPT
-- ========================================
COMMENT ON DATABASE gdd_db IS 'GDD 2.0 - Sistema de Gestão de Demandas';
