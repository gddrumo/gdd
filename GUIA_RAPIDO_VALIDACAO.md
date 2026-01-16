# 🚀 Guia Rápido: Validar Migração SQL

## TL;DR - Comandos Principais

```bash
# 1️⃣ VALIDAR (escolha uma opção)
node server/migrations/validate_migration.js                    # ← Recomendado
# OU
psql $DATABASE_URL -f server/migrations/validate_003_before.sql # ← Alternativa SQL

# 2️⃣ BACKUP (OBRIGATÓRIO!)
pg_dump $DATABASE_URL -t people > backup_people_$(date +%Y%m%d).sql

# 3️⃣ EXECUTAR MIGRAÇÃO
psql $DATABASE_URL -f server/migrations/003_link_people_to_coordinations.sql

# 4️⃣ VALIDAR PÓS-MIGRAÇÃO
psql $DATABASE_URL -f server/migrations/validate_003_after.sql
```

---

## 📊 O Que Cada Script Faz

### `validate_migration.js` ⭐ RECOMENDADO
**Script Node.js completo e interativo**

```bash
node server/migrations/validate_migration.js
```

**Output esperado:**
```
✓ Estrutura da tabela people
✓ Tabela coordinations existe
✓ Sem referências órfãs
✓ Simulação bem-sucedida

═══════════════════════════════════════
✓ TODOS OS CHECKS PASSARAM!
═══════════════════════════════════════
```

---

### `validate_003_before.sql`
**Validação pré-migração direto no PostgreSQL**

```bash
psql $DATABASE_URL -f server/migrations/validate_003_before.sql
```

**Verifica:**
- Coluna `area_id` existe? ✅
- Coluna `coordination_id` NÃO existe? ✅
- Tabela `coordinations` existe? ✅
- Há pessoas com `area_id` inválida? ❌

---

### `validate_003_after.sql`
**Validação pós-migração**

```bash
psql $DATABASE_URL -f server/migrations/validate_003_after.sql
```

**Verifica:**
- Coluna `area_id` foi removida? ✅
- Coluna `coordination_id` foi criada? ✅
- FK constraint funciona? ✅
- Índice foi criado? ✅

---

## ⚠️ Cenários de Erro

### Erro: "Tabela coordinations não existe"

```bash
# Execute primeiro:
psql $DATABASE_URL -f server/migrations/002_create_coordinations.sql
```

---

### Erro: "Pessoas com area_id inválida"

```sql
-- Ver pessoas órfãs
SELECT id, name, area_id FROM people
WHERE area_id NOT IN (SELECT id FROM coordinations);

-- Corrigir: setar como NULL
UPDATE people SET area_id = NULL WHERE area_id = 'area-invalida';

-- OU vincular a coordenação válida
UPDATE people SET area_id = 'coord-dev' WHERE area_id = 'area-invalida';
```

---

### Erro: "Migração já foi executada"

```sql
-- Verificar estrutura atual
\d people

-- Se tem coordination_id e não tem area_id: já migrou!
```

---

## 🎯 Checklist Rápido

Antes de executar a migração:

- [ ] Script de validação passou sem erros
- [ ] Backup foi criado
- [ ] Tabela `coordinations` existe com dados
- [ ] Nenhuma pessoa tem `area_id` inválida

Depois de executar a migração:

- [ ] Script pós-validação passou
- [ ] Testei criar pessoa via API
- [ ] Testei frontend (SettingsPanel)
- [ ] Verifico que badges mostram coordenações técnicas

---

## 🆘 Restaurar Backup (Se Necessário)

```bash
# Restaurar apenas tabela people
psql $DATABASE_URL < backup_people_20250124.sql

# OU restaurar banco completo
psql $DATABASE_URL < backup_full_20250124.sql
```

---

## 📚 Documentação Completa

Para mais detalhes:
- `server/migrations/README_VALIDATION.md` - Guia completo
- `server/migrations/EXEMPLO_SAIDA_VALIDACAO.txt` - Exemplos de saídas
- `CHANGELOG_2025-11-24.md` - Todas as mudanças do sistema

---

## 🚀 Fluxo Ideal (Production)

```bash
# Ambiente Local/Staging primeiro
node server/migrations/validate_migration.js
pg_dump $DATABASE_URL -t people > backup_staging.sql
psql $DATABASE_URL -f server/migrations/003_link_people_to_coordinations.sql
psql $DATABASE_URL -f server/migrations/validate_003_after.sql

# Se tudo passou: Production
export DATABASE_URL="postgresql://user:pass@production-host/db"
node server/migrations/validate_migration.js
pg_dump $DATABASE_URL -t people > backup_production.sql
psql $DATABASE_URL -f server/migrations/003_link_people_to_coordinations.sql
psql $DATABASE_URL -f server/migrations/validate_003_after.sql

# Deploy do código
git push origin main
# (seu processo de deploy aqui)
```

---

**Dúvidas?** Consulte `server/migrations/README_VALIDATION.md`
