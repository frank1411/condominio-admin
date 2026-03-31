# Guía de Despliegue - CondoAdmin Pro

## 📋 Tabla de Contenidos

1. [Requisitos](#requisitos)
2. [Despliegue en Manus](#despliegue-en-manus)
3. [Despliegue en Producción](#despliegue-en-producción)
4. [Configuración de Dominio](#configuración-de-dominio)
5. [Monitoreo](#monitoreo)
6. [Respaldo y Recuperación](#respaldo-y-recuperación)

## Requisitos

### Requisitos Mínimos
- Node.js 22+
- pnpm
- MySQL 8+ o TiDB
- 2GB RAM
- 10GB almacenamiento

### Requisitos para Producción
- SSL/TLS certificate
- Dominio personalizado
- Backup automático
- Monitoreo 24/7
- CDN para assets estáticos

## Despliegue en Manus

### Paso 1: Preparar el Proyecto

```bash
# Clonar repositorio
git clone <repository-url>
cd condominio-admin

# Instalar dependencias
pnpm install

# Crear archivo .env
cp .env.example .env

# Configurar variables de entorno
# Edita .env con tus valores
```

### Paso 2: Configurar Base de Datos

```bash
# Generar migraciones
pnpm drizzle-kit generate

# Aplicar migraciones
pnpm drizzle-kit migrate

# Verificar estado
pnpm drizzle-kit studio
```

### Paso 3: Compilar

```bash
# Build de producción
pnpm run build

# Verificar que compile sin errores
pnpm run build 2>&1 | grep -i error
```

### Paso 4: Desplegar en Manus

1. Abre el Management UI de tu proyecto
2. Ve a **Settings** → **Publish**
3. Selecciona visibilidad:
   - **Owner:** Solo tú
   - **Team:** Tu equipo
   - **Public:** Cualquiera
4. Haz clic en **Publish**
5. Espera a que se complete (2-5 minutos)

### Paso 5: Verificar Despliegue

1. Abre la URL proporcionada
2. Verifica que la aplicación cargue
3. Prueba login
4. Prueba funcionalidades principales

## Despliegue en Producción

### Opción 1: Manus (Recomendado)

Sigue los pasos anteriores. Manus maneja:
- ✓ SSL/TLS automático
- ✓ Escalado automático
- ✓ Backups automáticos
- ✓ CDN integrado
- ✓ Monitoreo 24/7

### Opción 2: Servidor Propio

#### Requisitos Adicionales
- Ubuntu 22.04 LTS o similar
- Docker (opcional pero recomendado)
- Nginx o Apache
- PM2 para process management

#### Instalación

```bash
# 1. Conectar a servidor
ssh user@your-server.com

# 2. Instalar dependencias
curl -fsSL https://get.pnpm.io/install.sh | sh -
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs mysql-server nginx

# 3. Clonar proyecto
git clone <repository-url>
cd condominio-admin

# 4. Instalar dependencias
pnpm install

# 5. Configurar variables de entorno
cp .env.example .env
nano .env  # Editar con tus valores

# 6. Compilar
pnpm run build

# 7. Instalar PM2
pnpm add -g pm2

# 8. Iniciar aplicación
pm2 start "pnpm start" --name "condoadmin"
pm2 startup
pm2 save
```

#### Configurar Nginx

```nginx
# /etc/nginx/sites-available/condoadmin
server {
    listen 80;
    server_name your-domain.com;

    # Redirigir HTTP a HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # Proxy a Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Cache estático
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### SSL con Let's Encrypt

```bash
# Instalar Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Generar certificado
sudo certbot certonly --nginx -d your-domain.com

# Renovación automática (ya está configurada)
sudo systemctl status certbot.timer
```

## Configuración de Dominio

### Dominio Personalizado en Manus

1. Ve a **Settings** → **Domains**
2. Opción A: Comprar dominio
   - Haz clic en **Buy Domain**
   - Selecciona dominio
   - Completa compra
3. Opción B: Usar dominio existente
   - Haz clic en **Add Custom Domain**
   - Ingresa tu dominio
   - Actualiza DNS records:
     ```
     CNAME: your-domain.com → condoadmin-y5qqycr7.manus.space
     ```

### Dominio en Servidor Propio

1. Compra dominio en registrador (GoDaddy, Namecheap, etc.)
2. Apunta DNS a tu servidor:
   ```
   A record: your-domain.com → your-server-ip
   AAAA record: your-domain.com → your-server-ipv6
   ```
3. Espera propagación DNS (15-48 horas)
4. Verifica: `nslookup your-domain.com`

## Monitoreo

### Monitoreo en Manus

1. Ve a **Dashboard**
2. Verifica:
   - Status del servidor
   - Uptime
   - Errores recientes
   - Uso de recursos

### Monitoreo en Servidor Propio

```bash
# Ver logs
pm2 logs condoadmin

# Ver estado
pm2 status

# Ver recursos
pm2 monit

# Configurar alertas
pm2 web  # Abre http://localhost:9615
```

### Logs Importantes

```bash
# Logs de aplicación
tail -f ~/.pm2/logs/condoadmin-error.log
tail -f ~/.pm2/logs/condoadmin-out.log

# Logs de Nginx
tail -f /var/log/nginx/error.log
tail -f /var/log/nginx/access.log

# Logs de MySQL
tail -f /var/log/mysql/error.log
```

## Respaldo y Recuperación

### Backup Automático en Manus

Manus realiza backups automáticos:
- Diarios: Últimos 7 días
- Semanales: Últimas 4 semanas
- Mensuales: Últimos 12 meses

Para restaurar:
1. Ve a **Dashboard** → **Version History**
2. Selecciona versión anterior
3. Haz clic en **Rollback**

### Backup Manual

```bash
# Backup de base de datos
mysqldump -u user -p database_name > backup-$(date +%Y%m%d).sql

# Backup de archivos
tar -czf backup-$(date +%Y%m%d).tar.gz /home/ubuntu/condominio-admin

# Subir a almacenamiento externo
scp backup-*.sql user@backup-server.com:/backups/
```

### Restaurar desde Backup

```bash
# Restaurar base de datos
mysql -u user -p database_name < backup-20260331.sql

# Restaurar archivos
tar -xzf backup-20260331.tar.gz -C /home/ubuntu/
```

## Variables de Entorno

### Producción

```env
# Base de datos
DATABASE_URL=mysql://user:password@host:3306/database

# OAuth
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://auth.manus.im

# JWT
JWT_SECRET=your-secret-key-min-32-chars

# Storage S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Aplicación
NODE_ENV=production
VITE_APP_TITLE=CondoAdmin Pro
VITE_APP_LOGO=https://cdn.../logo.png
```

## Checklist de Despliegue

- [ ] Base de datos configurada y migraciones aplicadas
- [ ] Variables de entorno configuradas
- [ ] Build compilado sin errores
- [ ] Tests pasando (88+ tests)
- [ ] SSL/TLS configurado
- [ ] Dominio apuntando correctamente
- [ ] Backups configurados
- [ ] Monitoreo activo
- [ ] Logs configurados
- [ ] Usuarios de prueba creados
- [ ] Funcionalidades principales probadas
- [ ] Performance aceptable
- [ ] Seguridad verificada

## Troubleshooting de Despliegue

### Aplicación no inicia

```bash
# Ver logs
pm2 logs condoadmin

# Verificar puerto
lsof -i :3000

# Reiniciar
pm2 restart condoadmin
```

### Base de datos no conecta

```bash
# Verificar conexión
mysql -h host -u user -p database_name

# Verificar variables de entorno
echo $DATABASE_URL
```

### Certificado SSL vencido

```bash
# Renovar certificado
sudo certbot renew --force-renewal

# Reiniciar Nginx
sudo systemctl restart nginx
```

---

**Última actualización:** Marzo 2026
