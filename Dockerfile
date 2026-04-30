# Multi-stage build para optimizar tamaño de imagen

# Stage 1: Build
FROM node:20-alpine AS builder

# Instalar pnpm
RUN npm install -g pnpm@10.4.1

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración
COPY package.json pnpm-lock.yaml ./

# Instalar dependencias
RUN pnpm install --frozen-lockfile

# Copiar código fuente
COPY . .

# Construir aplicación
RUN pnpm build

# Stage 2: Production
FROM node:20-alpine AS production

# Instalar pnpm
RUN npm install -g pnpm@10.4.1

# Crear usuario no root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración
COPY package.json pnpm-lock.yaml ./

# Instalar solo dependencias de producción
RUN pnpm install --prod --frozen-lockfile

# Copiar archivos construidos desde builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist

# Cambiar a usuario no root
USER nodejs

# Exponer puerto
EXPOSE 3000

# Comando de inicio
CMD ["node", "dist/index.js"]