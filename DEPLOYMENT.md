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

Para ejecutar CondoAdmin Pro necesitas Node.js 22 o superior, pnpm como gestor de paquetes, MySQL 8+ o TiDB como base de datos, 2GB de RAM mínimo, y 10GB de almacenamiento disponible.

### Requisitos para Producción

Para un despliegue en producción se recomienda certificado SSL/TLS válido, dominio personalizado, backups automáticos configurados, monitoreo 24/7 activo, y CDN para assets estáticos.

## Despliegue en Manus

Manus proporciona una plataforma de hosting completamente gestionada que simplifica el despliegue.

### Paso 1: Preparar el Proyecto

```bash
# Clonar repositorio
git clone <repository-url>
cd condominio-admin

# Instalar dependencias
pnpm install

# Las variables de entorno se inyectan automáticamente en Manus
# No necesitas crear .env manualmente
```

### Paso 2: Configurar Base de Datos

```bash
# Generar migraciones (si hay cambios en schema)
pnpm drizzle-kit generate

# Las migraciones se aplican automáticamente en Manus
# No necesitas ejecutar drizzle-kit migrate manualmente
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
   - **Owner:** Solo tú tienes acceso
   - **Team:** Tu equipo tiene acceso
   - **Public:** Cualquiera puede acceder
4. Haz clic en **Publish**
5. Espera a que se complete el despliegue (2-5 minutos)

### Paso 5: Verificar Despliegue

1. Abre la URL proporcionada por Manus
2. Verifica que la aplicación cargue correctamente
3. Prueba el login con una cuenta de administrador
4. Prueba funcionalidades principales como:
   - Ver dashboard
   - Crear un cobro
   - Descargar un reporte
   - Revisar un pago

## Despliegue en Producción

### Opción 1: Manus (Recomendado)

Manus es la opción recomendada para producción porque maneja automáticamente SSL/TLS, escalado automático, backups automáticos diarios, CDN integrado para assets, y monitoreo 24/7 del servidor.

Sigue los pasos en la sección "Despliegue en Manus" anterior.

### Opción 2: Servidor Propio

Si prefieres usar tu propio servidor, aquí están las instrucciones.

#### Requisitos Adicionales

Necesitarás Ubuntu 22.04 LTS o similar, Docker (opcional pero recomendado), Nginx o Apache como reverse proxy, y PM2 para process management.

#### Instalación

```bash
# 1. Conectar a servidor
ssh user@your-server.com

# 2. Instalar dependencias del sistema
curl -fsSL https://get.pnpm.io/install.sh | sh -
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs mysql-server nginx

# 3. Clonar proyecto
git clone <repository-url>
cd condominio-admin

# 4. Instalar dependencias de Node
pnpm install

# 5. Configurar variables de entorno
cp .env.example .env
nano .env  # Editar con tus valores

# 6. Compilar para producción
pnpm run build

# 7. Instalar PM2 globalmente
pnpm add -g pm2

# 8. Iniciar aplicación con PM2
pm2 start "pnpm start" --name "condoadmin"
pm2 startup
pm2 save
```

#### Configurar Nginx

Crea un archivo de configuración para Nginx:

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

Luego habilita el sitio:

```bash
sudo ln -s /etc/nginx/sites-available/condoadmin /etc/nginx/sites-enabled/
sudo systemctl restart nginx
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
   - Selecciona el dominio deseado
   - Completa la compra
3. Opción B: Usar dominio existente
   - Haz clic en **Add Custom Domain**
   - Ingresa tu dominio
   - Actualiza los DNS records en tu registrador:
     ```
     CNAME: your-domain.com → condoadmin-y5qqycr7.manus.space
     ```

### Dominio en Servidor Propio

1. Compra dominio en un registrador (GoDaddy, Namecheap, etc.)
2. Apunta los DNS records a tu servidor:
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
   - Status del servidor (online/offline)
   - Uptime del servicio
   - Errores recientes en logs
   - Uso de recursos (CPU, memoria)

### Monitoreo en Servidor Propio

```bash
# Ver logs de aplicación
pm2 logs condoadmin

# Ver estado de procesos
pm2 status

# Ver uso de recursos
pm2 monit

# Configurar panel web de monitoreo
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

Manus realiza backups automáticos de tu proyecto:

- Backups diarios: Últimos 7 días
- Backups semanales: Últimas 4 semanas
- Backups mensuales: Últimos 12 meses

Para restaurar desde un backup:

1. Ve a **Dashboard** → **Version History**
2. Selecciona la versión anterior que deseas restaurar
3. Haz clic en **Rollback**
4. Confirma la acción

### Backup Manual

```bash
# Backup de base de datos
mysqldump -u user -p database_name > backup-$(date +%Y%m%d).sql

# Backup de archivos del proyecto
tar -czf backup-$(date +%Y%m%d).tar.gz /home/ubuntu/condominio-admin

# Subir a almacenamiento externo
scp backup-*.sql user@backup-server.com:/backups/
scp backup-*.tar.gz user@backup-server.com:/backups/
```

### Restaurar desde Backup

```bash
# Restaurar base de datos
mysql -u user -p database_name < backup-20260331.sql

# Restaurar archivos
tar -xzf backup-20260331.tar.gz -C /home/ubuntu/
```

## Variables de Entorno

### Producción en Manus

Las siguientes variables se inyectan automáticamente:

- `DATABASE_URL` - Conexión a base de datos
- `VITE_APP_ID` - ID de aplicación OAuth
- `OAUTH_SERVER_URL` - URL del servidor OAuth
- `VITE_OAUTH_PORTAL_URL` - URL del portal OAuth
- `JWT_SECRET` - Clave para firmar JWT
- `VITE_APP_TITLE` - Título de la aplicación
- `VITE_APP_LOGO` - URL del logo

No necesitas configurar estas variables manualmente en Manus.

### Producción en Servidor Propio

```env
# Base de datos
DATABASE_URL=mysql://user:password@host:3306/database

# OAuth
VITE_APP_ID=your-app-id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://auth.manus.im

# JWT
JWT_SECRET=your-secret-key-min-32-chars

# Aplicación
NODE_ENV=production
VITE_APP_TITLE=CondoAdmin Pro
VITE_APP_LOGO=https://cdn.../logo.png
PORT=3000
```

## Checklist de Despliegue

- [ ] Código compilado sin errores
- [ ] Base de datos configurada y migraciones aplicadas
- [ ] Variables de entorno configuradas (si es servidor propio)
- [ ] Tests pasando (7 suites activas)
- [ ] SSL/TLS configurado
- [ ] Dominio apuntando correctamente
- [ ] Backups configurados
- [ ] Monitoreo activo
- [ ] Logs configurados
- [ ] Usuarios de prueba creados
- [ ] Funcionalidades principales probadas
- [ ] Performance aceptable (carga < 3 segundos)
- [ ] Seguridad verificada (HTTPS, validaciones)

## Troubleshooting de Despliegue

### Aplicación no inicia

```bash
# Ver logs
pm2 logs condoadmin

# Verificar puerto disponible
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

### Aplicación lenta

```bash
# Ver uso de recursos
pm2 monit

# Verificar logs de errores
pm2 logs condoadmin --err
```

---

**Última actualización:** Marzo 2026  
**Versión:** 2.0
