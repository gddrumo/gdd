# 🚀 Guia de Deploy - GDD 2.0

## ⚠️ IMPORTANTE

Você executou a migração do SQL ✅, mas o código ainda não foi deployado ❌.

**Sintomas:**
- Erro: `"relation 'slas' does not exist"`
- Erro: `"null value in column 'id' of relation 'categories'"`

**Causa:** O servidor em produção ainda está rodando código antigo.

---

## 📋 Pré-requisitos

1. ✅ Migração SQL executada (você já fez isso!)
2. ✅ Código atualizado no Git (commit `a0de658`)
3. ⏳ Deploy do código para Cloud Run (você precisa fazer AGORA)

---

## 🚀 Opção 1: Deploy via Console do Google Cloud (RECOMENDADO)

### Passo 1: Acessar Cloud Run
1. Acesse: https://console.cloud.google.com/run
2. Localize o serviço: **`gdd2-service`**
3. Clique em **"EDIT & DEPLOY NEW REVISION"** (topo da página)

### Passo 2: Configurar Deploy
Na seção **"Container"**:
1. **Source Repository**: Selecione o repositório do GitHub `johnwposso/GDD5`
2. **Branch**: `claude/portuguese-language-support-01EdAoK5mrL3VgYmnXysFhu8`
3. **Build Type**: `Dockerfile`
4. **Dockerfile location**: `/Dockerfile`

### Passo 3: Configurar Variáveis
Na seção **"Variables & Secrets"**:
- Certifique-se que `DB_CONNECTION_STRING` está configurada
- **Formato**: `postgresql://gdd_user:SENHA@/gdd_db?host=/cloudsql/PROJETO:REGIAO:gdd2-sql`

### Passo 4: Configurar Cloud SQL
Na seção **"Connections"**:
- ✅ Marque: **Cloud SQL connections**
- Selecione: `PROJETO:REGIAO:gdd2-sql`

### Passo 5: Deploy
1. Clique em **"DEPLOY"** (botão azul no rodapé)
2. Aguarde 3-5 minutos
3. Status mudará para **"✓ Serving traffic"**

---

## 🚀 Opção 2: Deploy via gcloud CLI

```bash
# 1. Fazer login no Google Cloud
gcloud auth login

# 2. Configurar projeto
gcloud config set project SEU_PROJETO_ID

# 3. Build da imagem
gcloud builds submit --tag gcr.io/SEU_PROJETO_ID/gdd2-service

# 4. Deploy no Cloud Run
gcloud run deploy gdd2-service \
  --image gcr.io/SEU_PROJETO_ID/gdd2-service \
  --platform managed \
  --region southamerica-east1 \
  --set-env-vars DB_CONNECTION_STRING="postgresql://gdd_user:SENHA@/gdd_db?host=/cloudsql/PROJETO:REGIAO:gdd2-sql" \
  --add-cloudsql-instances PROJETO:REGIAO:gdd2-sql \
  --allow-unauthenticated
```

**Substitua:**
- `SEU_PROJETO_ID` → ID do seu projeto no Google Cloud
- `PROJETO:REGIAO:gdd2-sql` → Connection name do Cloud SQL

---

## 🚀 Opção 3: Deploy Automático via GitHub (Se configurado)

Se você configurou Cloud Build com GitHub:

```bash
# Apenas faça push (deploy automático)
git push origin claude/portuguese-language-support-01EdAoK5mrL3VgYmnXysFhu8
```

O Cloud Build detectará o push e fará deploy automaticamente.

---

## ✅ Verificar se o Deploy Funcionou

### 1. Verificar Log de Deploy
```bash
gcloud run services logs read gdd2-service --limit 50
```

Procure por:
```
[SERVER] ✓ Servidor iniciado em http://0.0.0.0:8080
[DB] Inicializando Pool de conexões PostgreSQL...
```

### 2. Testar Endpoint de Health
```bash
curl https://gdd2-service-369944332448.southamerica-east1.run.app/api/health
```

**Resposta esperada:**
```json
{
  "ok": true,
  "now": "2025-11-23T...",
  "environment": "production",
  "port": 8080,
  "dbConnected": true
}
```

### 3. Testar SLAs
```bash
curl https://gdd2-service-369944332448.southamerica-east1.run.app/api/slas
```

**✅ SUCESSO se retornar:**
```json
[
  {
    "id": 1,
    "categoryId": "cat-feature",
    "complexity": "Baixa",
    "slaHours": 24
  },
  ...
]
```

**❌ FALHA se retornar:**
```json
{
  "error": "Erro ao buscar SLAs",
  "details": "relation \"slas\" does not exist"
}
```

---

## 🔧 Troubleshooting

### Erro: "Cloud SQL connection failed"
**Causa:** Variável `DB_CONNECTION_STRING` incorreta

**Solução:**
```bash
# Verificar connection name
gcloud sql instances describe gdd2-sql --format="value(connectionName)"

# Atualizar variável de ambiente
gcloud run services update gdd2-service \
  --set-env-vars DB_CONNECTION_STRING="postgresql://gdd_user:SENHA@/gdd_db?host=/cloudsql/CONNECTION_NAME"
```

### Erro: "Build failed"
**Causa:** Problema no Dockerfile ou dependências

**Solução:**
```bash
# Ver logs do build
gcloud builds list --limit 5
gcloud builds log BUILD_ID
```

### Deploy demora mais de 10 minutos
**Causa:** Primeira vez fazendo build da imagem

**Solução:** Aguarde até 15 minutos no primeiro deploy.

---

## 📊 Após o Deploy Bem-Sucedido

1. **Recarregue a aplicação** no browser (Ctrl + Shift + R)
2. Vá para **Configurações do GDD**
3. Teste criar:
   - ✅ Nova categoria → **Deve funcionar!**
   - ✅ Nova regra de SLA → **Deve funcionar!**
   - ✅ Nova área → **Deve funcionar!**
   - ✅ Nova pessoa → **Deve funcionar!**

**Não deve mais aparecer erro 500!** 🎉

---

## 📝 Resumo

| Passo | Status | Descrição |
|-------|--------|-----------|
| 1 | ✅ | Executar migração SQL no Cloud SQL |
| 2 | ✅ | Commit do código atualizado |
| 3 | ⏳ | **FAZER DEPLOY no Cloud Run** ← VOCÊ ESTÁ AQUI |
| 4 | ⏳ | Testar aplicação |

---

**Última atualização**: 2025-11-23
**Branch**: `claude/portuguese-language-support-01EdAoK5mrL3VgYmnXysFhu8`
**Último commit**: `a0de658`
