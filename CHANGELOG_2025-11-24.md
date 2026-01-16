# Changelog - 2025-11-24

## 📋 Resumo das Mudanças

Este release implementa três melhorias críticas no sistema GDD 2.0:

1. ✅ **Pessoas vinculadas a Coordenações Técnicas** (não mais a Áreas Solicitantes)
2. ✅ **Sistema anti-cache completo** (backend + frontend)
3. ✅ **Alerta visual de senha incorreta** melhorado

---

## 1. 🔗 Pessoas Vinculadas a Coordenações Técnicas

### Problema Resolvido
Anteriormente, as pessoas estavam vinculadas a **Áreas Solicitantes** (através de `people.area_id`), causando confusão conceitual:
- **Áreas Solicitantes** = quem PEDE a demanda (Marketing, RH, etc.)
- **Coordenações Técnicas** = quem EXECUTA a demanda (Desenvolvimento, Infraestrutura, etc.)

### Solução Implementada
Agora as pessoas estão corretamente vinculadas a **Coordenações Técnicas**:

```
┌─────────────┐      ┌──────────────────┐
│   people    │──────│  coordinations   │
│             │  FK  │  (Técnicas)      │
└─────────────┘      └──────────────────┘
```

### Arquivos Modificados

#### Backend (`server/`)
- **`migrations/003_link_people_to_coordinations.sql`** ✨ NOVO
  - Remove coluna `people.area_id`
  - Adiciona coluna `people.coordination_id` (FK → coordinations)
  - Migra dados existentes

- **`index.js`**
  - Linha 129: `mapPersonRow` agora retorna `coordinationId`
  - Linhas 668, 682, 698: Queries SQL usam `coordination_id`
  - Endpoints `/api/people` (GET, POST, PUT) atualizados

#### Frontend (`client/`)
- **`types.ts`**
  - Interface `Person` agora tem `coordinationId` ao invés de `areaId`

- **`services/api.ts`**
  - Funções `createPerson` e `updatePerson` usam `coordinationId`

- **`components/SettingsPanel.tsx`**
  - Dropdown "Coordenação" agora usa lista de `coordinations` (não `areas`)
  - Badge da pessoa mostra coordenação técnica (cor azul)

- **`components/InsightsPanel.tsx`**
  - Prop `areas` substituída por `coordinations`
  - Heatmap e alocação agora usam coordenações técnicas

- **`App.tsx`**
  - Passa `coordinations` para `InsightsPanel`

- **`constants.ts`**
  - Geração de mocks usa `person.coordinationId`

### Como Aplicar a Migração

**IMPORTANTE:** Execute a migração SQL antes de iniciar o servidor:

```bash
psql $DATABASE_URL -f server/migrations/003_link_people_to_coordinations.sql
```

Ou conecte-se ao banco Cloud SQL e execute o script manualmente.

---

## 2. 🚫 Sistema Anti-Cache Completo

### Problema Resolvido
O sistema exibia dados desatualizados devido a múltiplos níveis de cache:
- Cache HTTP do navegador
- Cache de proxy/CDN
- Cache de estados internos do React

### Solução Implementada

#### Backend (`server/index.js`)

Novo middleware que adiciona headers anti-cache em **TODAS** as rotas `/api/*`:

```javascript
// Linhas 37-42
app.use('/api', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
```

**Headers aplicados:**
- `Cache-Control: no-cache, no-store, must-revalidate, private, max-age=0`
  - `no-cache`: Revalida com servidor
  - `no-store`: Nunca armazena em cache
  - `must-revalidate`: Força revalidação quando stale
  - `private`: Apenas navegador (não CDN)
  - `max-age=0`: Expira imediatamente

- `Pragma: no-cache`: Compatibilidade HTTP/1.0
- `Expires: 0`: Força expiração imediata

#### Frontend (`client/services/api.ts`)

Todas as requisições fetch agora incluem `cache: 'no-store'`:

```javascript
// Linha 41
const response = await fetch(url, {
  ...options,
  cache: 'no-store', // Nunca usar cache do navegador
  signal: controller.signal,
  headers: {
    'Content-Type': 'application/json',
    ...options.headers,
  },
});
```

### Fluxo de Dados sem Cache

```
┌──────────────┐
│   Frontend   │ (cache: 'no-store')
└──────┬───────┘
       │ fetch('/api/demands')
       ↓
┌──────────────┐
│   Backend    │ (Cache-Control: no-store)
└──────┬───────┘
       │ SELECT * FROM demands
       ↓
┌──────────────┐
│  PostgreSQL  │ (SEMPRE a versão atual)
└──────────────┘
```

### Como Testar

1. **Teste básico de revalidação:**
```bash
# Abra DevTools → Network → Disable cache
# Crie uma demanda
# Verifique se ela aparece IMEDIATAMENTE na lista
```

2. **Teste de headers HTTP:**
```bash
curl -I https://seu-dominio.com/api/demands
# Deve retornar:
# Cache-Control: no-cache, no-store, must-revalidate, private, max-age=0
# Pragma: no-cache
# Expires: 0
```

3. **Teste de operações CRUD:**
   - Criar demanda → Lista atualiza instantaneamente
   - Editar demanda → Mudanças refletem na hora
   - Deletar demanda → Remove da lista sem delay
   - Arquivar demanda → Muda status imediatamente

4. **Teste multi-abas:**
   - Abra 2 abas no mesmo navegador
   - Faça uma mudança na aba 1
   - Recarregue a aba 2 (F5)
   - Dados devem estar atualizados

### Cenários de Atualização

| Ação | Comportamento |
|------|---------------|
| **Criar demanda** | Lista recarrega do backend após sucesso |
| **Editar demanda** | Atualiza estado local + revalida com backend |
| **Deletar demanda** | Remove da lista instantaneamente |
| **Mudar status** | Reflete no Kanban/Dashboard sem delay |
| **F5 na página** | Sempre busca versão mais recente |
| **Abrir nova aba** | Sempre carrega dados frescos |

---

## 3. 🚨 Alerta de Senha Incorreta Melhorado

### Problema Resolvido
O alerta de senha incorreta era discreto e passava despercebido.

### Solução Implementada

Novo design visual do alerta (`client/components/Login.tsx`):

#### Antes:
```jsx
<div className="text-red-500 text-xs bg-red-50 p-2 border border-red-100">
  <Lock size={12} /> {error}
</div>
```

#### Depois:
```jsx
<div className="text-red-600 text-sm font-semibold bg-red-50 p-3 rounded-lg border-2 border-red-300 flex items-center gap-2 animate-shake shadow-lg">
  <AlertTriangle size={18} className="text-red-500" />
  {error}
</div>
```

### Melhorias Visuais
- ✅ Fonte maior (text-sm) e negrito (font-semibold)
- ✅ Padding aumentado (p-3)
- ✅ Borda mais grossa e visível (border-2 border-red-300)
- ✅ Ícone de alerta (`AlertTriangle`) ao invés de cadeado
- ✅ Animação shake para chamar atenção
- ✅ Sombra para destacar (shadow-lg)

---

## 🎯 Resumo de Impacto

| Mudança | Impacto | Benefício |
|---------|---------|-----------|
| **Pessoas → Coordenações** | Alto | Correção conceitual, dados mais organizados |
| **Sistema anti-cache** | Crítico | Dados sempre atualizados, sem confusão |
| **Alerta de senha** | Médio | Melhor UX, menos tentativas de login |

---

## 🚀 Deploy Checklist

Antes de fazer deploy:

- [ ] Executar migração SQL: `003_link_people_to_coordinations.sql`
- [ ] Verificar que pessoas existentes foram migradas corretamente
- [ ] Testar login com senha incorreta (deve mostrar alerta visível)
- [ ] Testar operações CRUD (criar, editar, deletar demandas)
- [ ] Verificar que dados não ficam "grudados" após operações
- [ ] Abrir DevTools e confirmar headers `Cache-Control` nas respostas
- [ ] Limpar localStorage se necessário: `localStorage.clear()`

---

## 📝 Notas Técnicas

### Compatibilidade
- ✅ Navegadores modernos (Chrome 90+, Firefox 88+, Safari 14+)
- ✅ HTTP/1.1 e HTTP/2
- ✅ Cloud Run (GCP)
- ✅ PostgreSQL 12+

### Performance
- **Sem impacto negativo**: Headers anti-cache são leves
- **Latência**: +0ms (headers são adicionados no middleware)
- **Banda**: Mesma (tamanho de resposta inalterado)

### Segurança
- ✅ Dados sensíveis nunca ficam em cache de CDN
- ✅ Headers `private` garantem cache apenas no navegador (se houver)
- ✅ Migração SQL usa transações (rollback automático em erro)

---

## 🐛 Troubleshooting

### Problema: "Pessoas não aparecem no dropdown"
**Solução:** Execute a migração SQL e reinicie o servidor.

### Problema: "Dados ainda aparecem desatualizados"
**Solução:**
1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Verifique headers HTTP com `curl -I /api/demands`
3. Desabilite cache em DevTools (Network → Disable cache)

### Problema: "Erro ao criar pessoa: FK constraint"
**Solução:** A pessoa precisa estar vinculada a uma coordenação existente. Verifique se há coordenações cadastradas.

---

**Desenvolvido por:** Claude AI
**Data:** 2025-11-24
**Branch:** `claude/people-coordination-version-display-01N98NbPs9dUpn2g7utypuM7`
