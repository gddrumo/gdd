# 🔍 Guia de Validação da Migração 003

Este guia explica como validar se a migração `003_link_people_to_coordinations.sql` pode ser executada com segurança.

---

## 📋 Opções de Validação

Você tem **3 formas** de validar a migração:

### 1️⃣ Script Node.js (Recomendado) ⭐

**Mais completo e visual**

```bash
# Execute no terminal
node server/migrations/validate_migration.js
```

**O que faz:**
- ✅ Verifica estrutura da tabela `people`
- ✅ Verifica se tabela `coordinations` existe
- ✅ Lista dados atuais de pessoas
- ✅ Detecta referências órfãs (area_id inválidas)
- ✅ Simula a migração (sem executar)
- ✅ Gera relatório final colorido

**Saída esperada se tudo estiver OK:**

```
╔══════════════════════════════════════════════════════════╗
║  VALIDADOR DE MIGRAÇÃO 003: PEOPLE → COORDINATIONS      ║
╚══════════════════════════════════════════════════════════╝

============================================================
1. VERIFICANDO ESTRUTURA DA TABELA PEOPLE
============================================================

┌─────────────────┬───────────┬─────────────┐
│  column_name    │ data_type │ is_nullable │
├─────────────────┼───────────┼─────────────┤
│ id              │ text      │ NO          │
│ name            │ text      │ NO          │
│ role            │ varchar   │ YES         │
│ area_id         │ text      │ YES         │
│ email           │ varchar   │ YES         │
└─────────────────┴───────────┴─────────────┘

...

═══════════════════════════════════════════════════════════
✓ TODOS OS CHECKS PASSARAM!
═══════════════════════════════════════════════════════════

Você pode executar a migração com segurança:
psql $DATABASE_URL -f server/migrations/003_link_people_to_coordinations.sql
```

---

### 2️⃣ Script SQL Pré-Migração

**Para validar direto no PostgreSQL**

```bash
psql $DATABASE_URL -f server/migrations/validate_003_before.sql
```

**O que verifica:**
- ✅ Se `area_id` existe (deve existir)
- ✅ Se `coordination_id` NÃO existe (deve não existir)
- ✅ Se tabela `coordinations` existe
- ✅ Se há pessoas com `area_id` inválida
- ✅ Mostra distribuição de pessoas

**Saída esperada:**

```
========================================
PRÉ-VALIDAÇÃO: Estrutura atual
========================================

1. ESTRUTURA ATUAL DA TABELA PEOPLE:
...

2. VERIFICAR SE COLUNA area_id EXISTE:
✓ area_id EXISTE (OK para migrar)

3. VERIFICAR SE COLUNA coordination_id JÁ EXISTE:
✓ coordination_id NÃO EXISTE (OK para migrar)

...

8. PESSOAS COM area_id QUE NÃO EXISTE EM COORDINATIONS:
(nenhum resultado - bom sinal!)

========================================
VALIDAÇÃO CONCLUÍDA!

CHECKLIST ANTES DE MIGRAR:
[✓] area_id existe e coordination_id não existe
[✓] Tabela coordinations existe
[✓] Todas as pessoas têm area_id válido ou NULL
[✓] Não há pessoas com area_id que não existe
========================================
```

---

### 3️⃣ Script SQL Pós-Migração

**Para validar DEPOIS de executar a migração**

```bash
psql $DATABASE_URL -f server/migrations/validate_003_after.sql
```

**O que verifica:**
- ✅ Se `area_id` foi removida
- ✅ Se `coordination_id` foi criada
- ✅ Se FK constraint foi criada
- ✅ Se índice foi criado
- ✅ Se não há pessoas com `coordination_id` inválida
- ✅ Se nenhuma pessoa foi perdida

**Saída esperada:**

```
========================================
PÓS-VALIDAÇÃO: Verificar migração
========================================

2. VERIFICAR SE COLUNA area_id FOI REMOVIDA:
✓ area_id REMOVIDA (migração OK!)

3. VERIFICAR SE COLUNA coordination_id FOI CRIADA:
✓ coordination_id CRIADA (migração OK!)

6. PESSOAS COM coordination_id INVÁLIDA:
(nenhum resultado - migração sucesso!)

7. VERIFICAR FK CONSTRAINT fk_people_coordination:
fk_people_coordination | FOREIGN KEY (coordination_id) REFERENCES coordinations(id)

9. TESTAR INTEGRIDADE REFERENCIAL:
✓ FK constraint funcionando corretamente!

========================================
VALIDAÇÃO PÓS-MIGRAÇÃO CONCLUÍDA!

CHECKLIST:
[✓] area_id foi removida
[✓] coordination_id foi criada
[✓] FK constraint existe e funciona
[✓] Índice foi criado
[✓] Nenhuma pessoa com coordination_id inválida
[✓] Total de pessoas não mudou

Se todos os checks passaram: MIGRAÇÃO SUCESSO! ✓
========================================
```

---

## 🚀 Fluxo Completo de Migração

### Passo 1: Validação Pré-Migração

```bash
# Opção A: Script Node.js (recomendado)
node server/migrations/validate_migration.js

# Opção B: Script SQL
psql $DATABASE_URL -f server/migrations/validate_003_before.sql
```

**Se todos os checks passarem, prossiga.**

---

### Passo 2: Backup (IMPORTANTE!)

```bash
# Backup da tabela people
pg_dump $DATABASE_URL -t people > backup_people_$(date +%Y%m%d_%H%M%S).sql

# OU backup completo do banco
pg_dump $DATABASE_URL > backup_full_$(date +%Y%m%d_%H%M%S).sql
```

---

### Passo 3: Executar Migração

```bash
psql $DATABASE_URL -f server/migrations/003_link_people_to_coordinations.sql
```

**Se houver erro, a migração faz ROLLBACK automático.**

---

### Passo 4: Validação Pós-Migração

```bash
psql $DATABASE_URL -f server/migrations/validate_003_after.sql
```

**Se todos os checks passarem: SUCESSO! ✅**

---

## 🐛 Troubleshooting

### Problema: "Tabela coordinations não existe"

**Solução:**
```bash
# Execute primeiro a migração de coordinations
psql $DATABASE_URL -f server/migrations/002_create_coordinations.sql
```

---

### Problema: "Pessoas com area_id inválida"

**Causa:** Há pessoas vinculadas a áreas que não existem na tabela `coordinations`.

**Solução:**

```sql
-- 1. Ver quais pessoas estão órfãs
SELECT id, name, area_id
FROM people
WHERE area_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM coordinations WHERE id = area_id);

-- 2. Opções:
-- Opção A: Criar as coordenações faltantes
INSERT INTO coordinations (id, name, description)
VALUES ('area-id-aqui', 'Nome da Coordenação', 'Descrição');

-- Opção B: Setar area_id como NULL (pessoas sem coordenação)
UPDATE people
SET area_id = NULL
WHERE area_id = 'area-id-invalida';

-- Opção C: Vincular a uma coordenação existente
UPDATE people
SET area_id = 'coord-dev' -- ou outra coordenação válida
WHERE area_id = 'area-id-invalida';
```

---

### Problema: "Migration já foi executada"

**Como verificar:**

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'people'
ORDER BY ordinal_position;
```

Se aparecer `coordination_id` e NÃO aparecer `area_id`, a migração já foi feita.

---

### Problema: "Erro ao executar migração"

**Solução:**

1. Verifique os logs de erro do PostgreSQL
2. Restaure o backup:

```bash
psql $DATABASE_URL < backup_people_20250124_120000.sql
```

3. Corrija o problema e tente novamente

---

## 📊 Queries Úteis

### Ver estrutura atual de people

```sql
\d people
```

### Ver todas as coordenações

```sql
SELECT * FROM coordinations ORDER BY name;
```

### Ver pessoas com suas coordenações

```sql
SELECT
  p.id,
  p.name,
  p.role,
  c.name as coordination_name
FROM people p
LEFT JOIN coordinations c ON c.id = p.coordination_id
ORDER BY p.name;
```

### Contar pessoas por coordenação

```sql
SELECT
  c.name as coordination,
  COUNT(p.id) as total_pessoas
FROM coordinations c
LEFT JOIN people p ON p.coordination_id = c.id
GROUP BY c.id, c.name
ORDER BY total_pessoas DESC;
```

---

## ✅ Checklist Final

Antes de fazer deploy em produção:

- [ ] Validação pré-migração passou
- [ ] Backup foi criado
- [ ] Migração executou sem erros
- [ ] Validação pós-migração passou
- [ ] Testei criar uma pessoa via API
- [ ] Testei editar uma pessoa via API
- [ ] Testei no SettingsPanel (frontend)
- [ ] Verifiquei que não há dados órfãos
- [ ] Deploy do código novo (frontend + backend)

---

## 📞 Suporte

Se encontrar problemas:

1. Verifique os logs: `server/migrations/validate_migration.js`
2. Execute os scripts SQL de validação
3. Consulte o `CHANGELOG_2025-11-24.md`

---

**Desenvolvido por:** Claude AI
**Data:** 2025-11-24
**Versão:** 1.0.0
