# 📚 Estrutura do Banco de Dados - GDD 2.0

## 🎯 Visão Geral

O sistema GDD 2.0 utiliza **4 tabelas de configuração** e **1 tabela principal** de demandas, todas armazenadas em PostgreSQL.

---

## 📋 Tabelas de Configuração

### 1️⃣ **AREAS**
Armazena **TANTO** Áreas Solicitantes quanto Coordenações Técnicas.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | VARCHAR (PK) | Identificador único |
| `name` | VARCHAR | Nome da área/coordenação |
| `description` | TEXT | Descrição detalhada |

**Exemplos:**
```sql
-- Coordenações Técnicas (áreas que executam as demandas)
INSERT INTO areas (id, name, description) VALUES
  ('a1', 'Desenvolvimento', 'Coordenação de Desenvolvimento de Software'),
  ('a2', 'Infraestrutura', 'Coordenação de TI e Infraestrutura'),
  ('a3', 'Marketing', 'Coordenação de Marketing e Comunicação');

-- Áreas Solicitantes (áreas que criam as demandas)
INSERT INTO areas (id, name, description) VALUES
  ('req1', 'Comercial', 'Área Comercial e Vendas'),
  ('req2', 'Financeiro', 'Área Financeira e Contábil'),
  ('req3', 'RH', 'Recursos Humanos');
```

**Diferenciação:**
- **Coordenações Técnicas**: Identificadas por IDs específicos (a1, a2, a3...) OU descrição contendo palavras-chave
- **Áreas Solicitantes**: Todas as demais áreas

---

### 2️⃣ **PEOPLE**
Pessoas vinculadas a **Coordenações Técnicas** (não a áreas solicitantes).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | VARCHAR (PK) | Identificador único |
| `name` | VARCHAR | Nome completo |
| `role` | VARCHAR | Cargo/função |
| `area_id` | VARCHAR (FK) | Coordenação Técnica (referencia `areas.id`) |
| `email` | VARCHAR | Email |

**Importante:**
- `area_id` deve referenciar uma **Coordenação Técnica** (não uma área solicitante)
- Pessoas executam as demandas, por isso estão vinculadas às coordenações técnicas

**Exemplo:**
```sql
INSERT INTO people (id, name, role, area_id, email) VALUES
  ('p1', 'João Silva', 'Desenvolvedor Sênior', 'a1', 'joao.silva@empresa.com'),
  ('p2', 'Maria Santos', 'Analista de Infraestrutura', 'a2', 'maria.santos@empresa.com');
```

---

### 3️⃣ **CATEGORIES**
Categorias de demandas (**apenas nome**, sem descrição).

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | VARCHAR (PK) | Identificador único |
| `name` | VARCHAR | Nome da categoria |

**Exemplo:**
```sql
INSERT INTO categories (id, name) VALUES
  ('cat1', 'Suporte'),
  ('cat2', 'Desenvolvimento'),
  ('cat3', 'Infraestrutura');
```

---

### 4️⃣ **SLA_CONFIGS**
Configurações de SLA (tempo esperado) por categoria e complexidade.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | SERIAL (PK) | Identificador único |
| `category_id` | VARCHAR (FK) | Categoria (referencia `categories.id`) |
| `complexity` | VARCHAR | Complexidade: 'Baixa', 'Média' ou 'Alta' |
| `sla_hours` | INTEGER | Tempo em horas para concluir |

**Exemplo:**
```sql
INSERT INTO sla_configs (category_id, complexity, sla_hours) VALUES
  ('cat1', 'Baixa', 8),    -- Suporte simples: 8h
  ('cat1', 'Média', 24),   -- Suporte médio: 24h
  ('cat2', 'Alta', 120);   -- Desenvolvimento complexo: 120h
```

---

## 📦 Tabela Principal

### **DEMANDS**
Demandas criadas e gerenciadas pelo sistema.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | VARCHAR (PK) | Identificador único |
| `title` | VARCHAR | Título resumido |
| `description` | TEXT | Descrição detalhada |
| **Solicitante** | | |
| `requester_name` | VARCHAR | Nome do solicitante |
| `requester_area_id` | VARCHAR (FK) | Área Solicitante (FK → `areas`) |
| **Execução** | | |
| `person_id` | VARCHAR (FK) | Responsável técnico (FK → `people`) |
| `area_id` | VARCHAR (FK) | Coordenação Técnica responsável (FK → `areas`) |
| **Classificação** | | |
| `category` | VARCHAR | Categoria |
| `type` | VARCHAR | 'Sistema' ou 'Tarefa' |
| `complexity` | VARCHAR | 'Baixa', 'Média' ou 'Alta' |
| `effort` | INTEGER | Esforço em horas |
| **Status e Fluxo** | | |
| `status` | VARCHAR | Status atual no fluxo |
| `agreed_deadline` | TIMESTAMP | Prazo combinado |
| `created_at` | TIMESTAMP | Data de criação |
| `started_at` | TIMESTAMP | Data de início |
| `finished_at` | TIMESTAMP | Data de conclusão |
| **Campos de Finalização** | | |
| `cancellation_reason` | TEXT | Motivo do cancelamento |
| `delay_justification` | TEXT | Justificativa de atraso |
| `delivery_summary` | TEXT | Resumo da entrega |
| `is_priority` | BOOLEAN | Se é prioritária |
| **Histórico** | | |
| `logs` | JSONB | Logs de mudança de status |
| `history` | JSONB | Histórico de ações |
| `status_timestamps` | JSONB | Timestamps de cada status |

---

## 🔗 Relacionamentos

```
DEMANDS:
  ├─ requester_area_id → AREAS (Área Solicitante)
  ├─ area_id → AREAS (Coordenação Técnica)
  └─ person_id → PEOPLE
                   └─ area_id → AREAS (Coordenação Técnica)

SLA_CONFIGS:
  └─ category_id → CATEGORIES
```

---

## 🚀 Como Aplicar no Banco

### **Método 1: Executar Script SQL**
```bash
psql -U gdd_user -d gdd_db -f server/migrations/update_schema.sql
```

### **Método 2: Executar Comandos Manualmente**

```sql
-- 1. Adicionar campos em AREAS
ALTER TABLE areas ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

-- 2. Adicionar campos em PEOPLE
ALTER TABLE people ADD COLUMN IF NOT EXISTS role VARCHAR(100) DEFAULT '';
ALTER TABLE people ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT '';

-- 3. Remover description de CATEGORIES (se existir)
ALTER TABLE categories DROP COLUMN IF EXISTS description;

-- 4. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_people_area_id ON people(area_id);
CREATE INDEX IF NOT EXISTS idx_demands_person_id ON demands(person_id);
CREATE INDEX IF NOT EXISTS idx_demands_area_id ON demands(area_id);
CREATE INDEX IF NOT EXISTS idx_demands_status ON demands(status);
```

---

## ✅ Validação

Após aplicar as alterações, valide com:

```sql
-- Verificar estrutura de AREAS
\d areas

-- Verificar estrutura de PEOPLE
\d people

-- Verificar estrutura de CATEGORIES
\d categories

-- Listar todas as tabelas
\dt
```

---

## 📝 Notas Importantes

1. **Coordenações Técnicas vs Áreas Solicitantes:**
   - Ambas ficam na mesma tabela `areas`
   - Diferenciadas por ID ou descrição
   - Pessoas só se vinculam a Coordenações Técnicas

2. **Categories:**
   - Só tem `id` e `name` (sem `description`)
   - Usada para classificar demandas e definir SLAs

3. **People:**
   - Sempre vinculadas a uma Coordenação Técnica via `area_id`
   - Possuem `role` e `email` além de `name`

4. **Demands:**
   - `requester_area_id` → Área Solicitante
   - `area_id` → Coordenação Técnica responsável
   - `person_id` → Pessoa responsável (que pertence à coordenação técnica)
