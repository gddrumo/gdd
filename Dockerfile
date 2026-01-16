# Use Node 18 LTS
FROM node:18-alpine

# Instalar dependências do sistema
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Criar diretório de trabalho
WORKDIR /app

# Copiar package files do servidor
COPY server/package*.json ./server/
COPY package.json ./

# Instalar dependências apenas do servidor
WORKDIR /app/server
RUN npm ci --only=production

# Copiar código do servidor
COPY server/ ./

# Voltar para o diretório raiz
WORKDIR /app

# Criar usuário não-root para segurança
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

# Usar usuário não-root
USER nodejs

# Expor porta (Cloud Run usa a variável PORT)
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:${PORT:-8080}/api/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Comando para iniciar o servidor
CMD ["node", "server/index.js"]