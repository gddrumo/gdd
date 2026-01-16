# Instruções de Migração do Banco de Dados

## ⚠️ IMPORTANTE - LEIA ANTES DE CONTINUAR

Este projeto requer a execução de uma migração do banco de dados para corrigir o schema das tabelas de configuração.

## 🔴 Problema Resolvido

As tabelas `areas`, `categories`, `people` e `sla_configs` tinham incompatibilidade de tipos:
- **Antes**: IDs eram INTEGER no banco, mas a aplicação enviava STRING (ex: `"area-1763857387591"`)
- **Depois**: IDs são TEXT no banco (compatível com a aplicação)

## 📋 Pré-requisitos

**ATENÇÃO**: Esta migração irá **RECRIAR** as seguintes tabelas:
- `areas`
- `categories`
- `people`
- `sla_configs` (antiga `slas`)

**⚠️ Dados existentes nestas tabelas serão PERDIDOS!**

A tabela `demands` **NÃO será afetada**.

## 🚀 Como Executar a Migração

### Opção 1: Via cURL (Recomendado)

```bash
curl -X POST https://gdd2-service-369944332448.southamerica-east1.run.app/api/run-migration
```

### Opção 2: Via Browser

Abra esta URL no navegador:
```
https://gdd2-service-369944332448.southamerica-east1.run.app/api/run-migration
```

### Opção 3: Via Postman/Insomnia

```
POST https://gdd2-service-369944332448.southamerica-east1.run.app/api/run-migration
Content-Type: application/json
```

## ✅ Resposta Esperada

Se a migração for bem-sucedida, você verá:

```json
{
  "ok": true,
  "message": "Migração executada com sucesso!",
  "tables": [
    "areas",
    "categories",
    "demands",
    "people",
    "sla_configs"
  ]
}
```

## 🔍 O Que a Migração Faz

1. **Remove tabelas antigas** (se existirem):
   - `slas` (nome antigo)
   - `sla_configs`
   - `categories`
   - `people`
   - `areas`

2. **Cria tabelas novas** com schema correto:
   - `areas` (id: TEXT)
   - `categories` (id: TEXT)
   - `people` (id: TEXT)
   - `sla_configs` (id: SERIAL auto-increment)

3. **Adiciona dados padrão**:
   - 4 áreas exemplo
   - 3 categorias exemplo
   - 6 regras de SLA exemplo

## 📊 Dados Padrão Inseridos

### Áreas
- Desenvolvimento
- Infraestrutura
- Marketing
- Recursos Humanos

### Categorias
- Feature
- Correção de Bug
- Melhoria

### SLAs
- Feature: Baixa (24h), Média (48h), Alta (120h)
- Correção de Bug: Baixa (8h), Média (16h), Alta (48h)

## 🛠️ Em Caso de Erro

Se você receber um erro como:
```
"null value in column 'id' of relation 'categories' violates not-null constraint"
```

Isso significa que a migração ainda **NÃO foi executada**. Execute os passos acima.

## 🔄 Após a Migração

1. Recarregue a aplicação (Ctrl + Shift + R)
2. Vá para **Configurações do GDD**
3. Teste adicionar:
   - Uma nova área
   - Uma nova pessoa
   - Uma nova categoria
   - Uma nova regra de SLA

Todos devem funcionar sem erros 500!

## 📝 Notas Técnicas

- **Endpoint**: `POST /api/run-migration`
- **Idempotente**: Pode ser executado múltiplas vezes (sempre recria as tabelas)
- **Rollback**: Não há rollback automático. Se necessário, restaure backup do banco
- **Duração**: ~2-5 segundos

## ⚡ Perguntas Frequentes

**P: Vou perder minhas demandas?**
R: Não! A tabela `demands` não é afetada.

**P: Posso executar a migração múltiplas vezes?**
R: Sim, mas você perderá os dados de áreas/pessoas/categorias/SLAs a cada execução.

**P: E se eu tiver dados importantes em áreas/pessoas?**
R: Faça backup do banco de dados antes de executar a migração.

**P: Preciso derrubar a aplicação?**
R: Não, a migração pode ser executada com a aplicação rodando.

---

**Última atualização**: 2025-11-23
**Versão do Schema**: 2.0
