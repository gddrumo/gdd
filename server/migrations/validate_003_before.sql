-- ========================================
-- VALIDAÇÃO PRÉ-MIGRAÇÃO
-- Execute ANTES de rodar 003_link_people_to_coordinations.sql
-- ========================================

\echo '========================================';
\echo 'PRÉ-VALIDAÇÃO: Estrutura atual';
\echo '========================================';

-- 1. Verificar estrutura atual da tabela people
\echo '';
\echo '1. ESTRUTURA ATUAL DA TABELA PEOPLE:';
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'people'
ORDER BY ordinal_position;

-- 2. Verificar se coluna area_id existe
\echo '';
\echo '2. VERIFICAR SE COLUNA area_id EXISTE:';
SELECT
    CASE
        WHEN COUNT(*) > 0 THEN '✓ area_id EXISTE (OK para migrar)'
        ELSE '✗ area_id NÃO EXISTE (não precisa migrar)'
    END as status
FROM information_schema.columns
WHERE table_name = 'people' AND column_name = 'area_id';

-- 3. Verificar se coluna coordination_id já existe
\echo '';
\echo '3. VERIFICAR SE COLUNA coordination_id JÁ EXISTE:';
SELECT
    CASE
        WHEN COUNT(*) > 0 THEN '✗ coordination_id JÁ EXISTE (migração já foi feita!)'
        ELSE '✓ coordination_id NÃO EXISTE (OK para migrar)'
    END as status
FROM information_schema.columns
WHERE table_name = 'people' AND column_name = 'coordination_id';

-- 4. Mostrar dados atuais de pessoas
\echo '';
\echo '4. DADOS ATUAIS DE PESSOAS (primeiras 10):';
SELECT
    id,
    name,
    role,
    area_id,
    email
FROM people
ORDER BY name
LIMIT 10;

-- 5. Contar pessoas por area_id
\echo '';
\echo '5. DISTRIBUIÇÃO DE PESSOAS POR AREA_ID:';
SELECT
    COALESCE(area_id, '(NULL)') as area_id,
    COUNT(*) as quantidade_pessoas
FROM people
GROUP BY area_id
ORDER BY quantidade_pessoas DESC;

-- 6. Verificar se áreas existem na tabela coordinations
\echo '';
\echo '6. VERIFICAR SE COORDINATIONS EXISTE:';
SELECT
    CASE
        WHEN COUNT(*) > 0 THEN '✓ Tabela coordinations EXISTE'
        ELSE '✗ Tabela coordinations NÃO EXISTE (execute 002_create_coordinations.sql primeiro!)'
    END as status
FROM information_schema.tables
WHERE table_name = 'coordinations';

-- 7. Mostrar coordenações existentes
\echo '';
\echo '7. COORDENAÇÕES TÉCNICAS CADASTRADAS:';
SELECT id, name, description FROM coordinations ORDER BY name;

-- 8. Verificar se há pessoas com area_id que não existe em coordinations
\echo '';
\echo '8. PESSOAS COM area_id QUE NÃO EXISTE EM COORDINATIONS (ATENÇÃO!):';
SELECT
    p.id,
    p.name,
    p.area_id,
    'ATENÇÃO: Esta área não existe em coordinations!' as aviso
FROM people p
WHERE p.area_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM coordinations c WHERE c.id = p.area_id
  );

-- 9. Verificar constraints existentes em people
\echo '';
\echo '9. CONSTRAINTS EXISTENTES EM PEOPLE:';
SELECT
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'people'::regclass
ORDER BY conname;

\echo '';
\echo '========================================';
\echo 'VALIDAÇÃO CONCLUÍDA!';
\echo '';
\echo 'CHECKLIST ANTES DE MIGRAR:';
\echo '[ ] area_id existe e coordination_id não existe';
\echo '[ ] Tabela coordinations existe';
\echo '[ ] Todas as pessoas têm area_id válido ou NULL';
\echo '[ ] Não há pessoas com area_id que não existe';
\echo '';
\echo 'Se todos os checks passaram, execute:';
\echo 'psql $DATABASE_URL -f server/migrations/003_link_people_to_coordinations.sql';
\echo '========================================';
