-- ========================================
-- VALIDAÇÃO PÓS-MIGRAÇÃO
-- Execute DEPOIS de rodar 003_link_people_to_coordinations.sql
-- ========================================

\echo '========================================';
\echo 'PÓS-VALIDAÇÃO: Verificar migração';
\echo '========================================';

-- 1. Verificar estrutura atualizada da tabela people
\echo '';
\echo '1. ESTRUTURA ATUALIZADA DA TABELA PEOPLE:';
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'people'
ORDER BY ordinal_position;

-- 2. Verificar se coluna area_id foi removida
\echo '';
\echo '2. VERIFICAR SE COLUNA area_id FOI REMOVIDA:';
SELECT
    CASE
        WHEN COUNT(*) = 0 THEN '✓ area_id REMOVIDA (migração OK!)'
        ELSE '✗ area_id AINDA EXISTE (migração falhou)'
    END as status
FROM information_schema.columns
WHERE table_name = 'people' AND column_name = 'area_id';

-- 3. Verificar se coluna coordination_id foi criada
\echo '';
\echo '3. VERIFICAR SE COLUNA coordination_id FOI CRIADA:';
SELECT
    CASE
        WHEN COUNT(*) > 0 THEN '✓ coordination_id CRIADA (migração OK!)'
        ELSE '✗ coordination_id NÃO EXISTE (migração falhou)'
    END as status
FROM information_schema.columns
WHERE table_name = 'people' AND column_name = 'coordination_id';

-- 4. Mostrar dados migrados
\echo '';
\echo '4. DADOS MIGRADOS DE PESSOAS (primeiras 10):';
SELECT
    id,
    name,
    role,
    coordination_id,
    email
FROM people
ORDER BY name
LIMIT 10;

-- 5. Contar pessoas por coordination_id
\echo '';
\echo '5. DISTRIBUIÇÃO DE PESSOAS POR COORDINATION_ID:';
SELECT
    COALESCE(coordination_id, '(NULL)') as coordination_id,
    COUNT(*) as quantidade_pessoas
FROM people
GROUP BY coordination_id
ORDER BY quantidade_pessoas DESC;

-- 6. Verificar se todas as coordination_id são válidas
\echo '';
\echo '6. PESSOAS COM coordination_id INVÁLIDA (deve estar vazio!):';
SELECT
    p.id,
    p.name,
    p.coordination_id,
    '✗ ERRO: coordination_id não existe!' as erro
FROM people p
WHERE p.coordination_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM coordinations c WHERE c.id = p.coordination_id
  );

-- 7. Verificar foreign key constraint
\echo '';
\echo '7. VERIFICAR FK CONSTRAINT fk_people_coordination:';
SELECT
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'people'::regclass
  AND conname = 'fk_people_coordination';

-- 8. Verificar índice
\echo '';
\echo '8. VERIFICAR ÍNDICE idx_people_coordination_id:';
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'people'
  AND indexname = 'idx_people_coordination_id';

-- 9. Testar integridade referencial (INSERT deve falhar)
\echo '';
\echo '9. TESTAR INTEGRIDADE REFERENCIAL (deve dar erro):';
BEGIN;
DO $$
BEGIN
    -- Tentar inserir pessoa com coordination_id inválida
    INSERT INTO people (id, name, role, coordination_id, email)
    VALUES ('test-invalid', 'Test User', 'Tester', 'coord-nao-existe', 'test@test.com');

    RAISE EXCEPTION 'ERRO: FK constraint não está funcionando!';
EXCEPTION
    WHEN foreign_key_violation THEN
        RAISE NOTICE '✓ FK constraint funcionando corretamente!';
END $$;
ROLLBACK;

-- 10. Comparar contagens antes/depois
\echo '';
\echo '10. VERIFICAR SE NENHUMA PESSOA FOI PERDIDA:';
SELECT
    COUNT(*) as total_pessoas,
    COUNT(coordination_id) as pessoas_com_coordination,
    COUNT(*) - COUNT(coordination_id) as pessoas_sem_coordination
FROM people;

\echo '';
\echo '========================================';
\echo 'VALIDAÇÃO PÓS-MIGRAÇÃO CONCLUÍDA!';
\echo '';
\echo 'CHECKLIST:';
\echo '[ ] area_id foi removida';
\echo '[ ] coordination_id foi criada';
\echo '[ ] FK constraint existe e funciona';
\echo '[ ] Índice foi criado';
\echo '[ ] Nenhuma pessoa com coordination_id inválida';
\echo '[ ] Total de pessoas não mudou';
\echo '';
\echo 'Se todos os checks passaram: MIGRAÇÃO SUCESSO! ✓';
\echo '========================================';
