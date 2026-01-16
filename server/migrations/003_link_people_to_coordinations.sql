-- ========================================
-- MIGRAÇÃO: Vincular Pessoas a Coordenações Técnicas
-- Data: 2025-11-24
-- Descrição: Remove vínculo de pessoas com áreas solicitantes
--            e vincula com coordenações técnicas
-- ========================================

-- 1. Adicionar nova coluna coordination_id
ALTER TABLE people
ADD COLUMN coordination_id TEXT;

-- 2. Migrar dados existentes: copiar area_id → coordination_id
-- (assumindo que as pessoas já estão vinculadas a coordenações técnicas)
UPDATE people
SET coordination_id = area_id
WHERE area_id IS NOT NULL;

-- 3. Adicionar foreign key para coordinations
ALTER TABLE people
ADD CONSTRAINT fk_people_coordination
FOREIGN KEY (coordination_id) REFERENCES coordinations(id) ON DELETE SET NULL;

-- 4. Remover antiga coluna area_id
ALTER TABLE people
DROP COLUMN area_id;

-- 5. Criar índice para performance
CREATE INDEX idx_people_coordination_id ON people(coordination_id);

-- ========================================
-- RESULTADO ESPERADO:
-- - people.area_id removido
-- - people.coordination_id criado (FK → coordinations)
-- - Pessoas agora vinculadas a Coordenações Técnicas
-- ========================================
