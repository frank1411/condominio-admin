# Guía de Despliegue en VPS

## Resumen del Proyecto

**Condominio Admin** es una aplicación full-stack para la administración de condominios.

### Stack Tecnológico

- **Frontend**: React 19 + Vite + Tailwind CSS + Radix UI
- **Backend**: Express + tRPC
- **Base de datos**: MySQL 8.0+ con Drizzle ORM
- **Gestor de paquetes**: pnpm 10.4.1+
- **Build**: Vite (frontend) + esbuild (backend)

## Requisitos del Servidor

### Sistema Operativo
- Ubuntu 22.04 LTS o superior (recomendado)
- Debian 12+ (alternativa)
- CentOS 8+ / Rocky Linux 8+ (alternativa)

### Recursos Mínimos
- **CPU**: 2 vCPU
- **RAM**: 2 GB (4 GB recomendado)
- **Almacenamiento**: 20 GB SSD
- **Ancho de banda**: 1 TB/mes

### Software Requerido

```bash
# Actualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20+ (recomendado usar nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# Instalar pnpm
npm install -g pnpm@10.4.1

# Instalar MySQL Server
sudo apt install mysql-server -y
sudo mysql_secure_installation

# Instalar Nginx
sudo apt install nginx -y

# Instalar PM2 (para gestión de procesos)
npm install -g pm2
```

## Configuración de Base de Datos MySQL

### 1. Crear Base de Datos y Usuario

```bash
sudo mysql -u root -p
```

```sql
-- Crear base de datos
CREATE DATABASE condominio_admin CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Crear usuario
CREATE USER 'condominio_user'@'localhost' IDENTIFIED BY 'tu_contraseña_segura';

-- Otorgar privilegios
GRANT ALL PRIVILEGES ON condominio_admin.* TO 'condominio_user'@'localhost';

-- Aplicar cambios
FLUSH PRIVILEGES;

-- Salir
EXIT;
```

### 2. Configurar MySQL para Producción

Editar `/etc/mysql/mysql.conf.d/mysqld.cnf`:

```ini
[mysqld]
# Ajustes de rendimiento
max_connections = 200
innodb_buffer_pool_size = 1G
innodb_log_file_size = 256M

# Seguridad
bind-address = 127.0.0.1
```

Reiniciar MySQL:

```bash
sudo systemctl restart mysql
```

## Variables de Entorno

Crear archivo `.env` en el directorio del proyecto:

```bash
# Base de datos
DATABASE_URL="mysql://condominio_user:tu_contraseña_segura@localhost:3306/condominio_admin"

# Seguridad
JWT_SECRET="tu_secreto_jwt_muy_largo_y_aleatorio"

# OAuth
OAUTH_SERVER_URL="https://tu-oauth-server.com"
VITE_APP_ID="tu_app_id"

# Usuario administrador
OWNER_OPEN_ID="open_id_del_admin"

# Almacenamiento (opcional)
BUILT_IN_FORGE_API_URL="https://tu-storage-api.com"
BUILT_IN_FORGE_API_KEY="tu_api_key"

# Servidor
PORT=3000
NODE_ENV=production
```

**Generar JWT_SECRET seguro:**

```bash
openssl rand -base64 64
```

## Despliegue de la Aplicación

### 1. Clonar el Repositorio

```bash
# Clonar el repositorio
cd /var/www
sudo git clone https://github.com/frank1411/condominio-admin.git
cd condominio-admin

# Configurar permisos
sudo chown -R $USER:$USER /var/www/condominio-admin
```

### 2. Instalar Dependencias

```bash
cd /var/www/condominio-admin
pnpm install --frozen-lockfile
```

### 3. Configurar Base de Datos

```bash
# Generar migraciones
pnpm db:push

# (Opcional) Sembrar datos de prueba
node seed-db.mjs
```

### 4. Construir la Aplicación

```bash
pnpm build
```

Esto generará:
- `dist/public/` - Archivos estáticos del frontend
- `dist/index.js` - Backend bundle

### 5. Configurar PM2

Crear archivo de configuración `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'condominio-admin',
    script: './dist/index.js',
    cwd: '/var/www/condominio-admin',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
```

Iniciar con PM2:

```bash
# Crear directorio de logs
mkdir -p logs

# Iniciar aplicación
pm2 start ecosystem.config.js

# Configurar inicio automático
pm2 startup
pm2 save
```

Comandos útiles de PM2:

```bash
pm2 status          # Ver estado
pm2 logs            # Ver logs
pm2 restart all     # Reiniciar
pm2 stop all        # Detener
pm2 delete all      # Eliminar
```

## Configuración de Nginx

### 1. Crear Configuración del Sitio

```bash
sudo nano /etc/nginx/sites-available/condominio-admin
```

```nginx
server {
    listen 80;
    server_name tu-dominio.com www.tu-dominio.com;

    # Redirigir HTTP a HTTPS (después de configurar SSL)
    # return 301 https://$server_name$request_uri;

    # Directorio raíz
    root /var/www/condominio-admin/dist/public;
    index index.html;

    # Compresión gzip
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Archivos estáticos
    location / {
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API tRPC
    location /api/trpc {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # OAuth callback
    location /api/oauth/callback {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Límites de subida
    client_max_body_size 50M;
}
```

### 2. Habilitar el Sitio

```bash
# Crear enlace simbólico
sudo ln -s /etc/nginx/sites-available/condominio-admin /etc/nginx/sites-enabled/

# Probar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

## Configuración de SSL (HTTPS)

### Usar Certbot (Let's Encrypt)

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtener certificado
sudo certbot --nginx -d tu-dominio.com -d www.tu-dominio.com

# Renovación automática está configurada
# Verificar con: sudo certbot renew --dry-run
```

Después de obtener SSL, editar la configuración de Nginx para descomentar la redirección HTTPS.

## Configuración del Firewall

```bash
# Habilitar UFW
sudo ufw enable

# Permitir SSH
sudo ufw allow ssh

# Permitir HTTP
sudo ufw allow http

# Permitir HTTPS
sudo ufw allow https

# Verificar estado
sudo ufw status
```

## Actualizaciones y Mantenimiento

### Actualizar la Aplicación

```bash
cd /var/www/condominio-admin

# Obtener últimos cambios
git pull origin main

# Instalar dependencias actualizadas
pnpm install --frozen-lockfile

# Reconstruir
pnpm build

# Ejecutar migraciones si es necesario
pnpm db:push

# Reiniciar PM2
pm2 restart all
```

### Backups de Base de Datos

Crear script de backup `/usr/local/bin/backup-condominio.sh`:

```bash
#!/bin/bash

# Configuración
DB_USER="condominio_user"
DB_PASS="tu_contraseña_segura"
DB_NAME="condominio_admin"
BACKUP_DIR="/var/backups/condominio"
DATE=$(date +%Y%m%d_%H%M%S)

# Crear directorio
mkdir -p $BACKUP_DIR

# Backup
mysqldump -u $DB_USER -p$DB_PASS $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Mantener solo últimos 7 días
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +7 -delete

echo "Backup completado: backup_$DATE.sql.gz"
```

Hacer ejecutable y configurar cron:

```bash
sudo chmod +x /usr/local/bin/backup-condominio.sh

# Editar crontab
crontab -e

# Agregar línea para backup diario a las 2 AM
0 2 * * * /usr/local/bin/backup-condominio.sh >> /var/log/condominio-backup.log 2>&1
```

## Monitoreo

### Ver Logs

```bash
# Logs de la aplicación
pm2 logs

# Logs de Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Logs de MySQL
sudo tail -f /var/log/mysql/error.log
```

### Monitoreo de Recursos

```bash
# Uso de CPU y memoria
htop

# Uso de disco
df -h

# Uso de memoria
free -h

# Procesos escuchando en puertos
sudo netstat -tulpn
```

## Solución de Problemas

### La aplicación no inicia

```bash
# Ver logs de PM2
pm2 logs --err

# Verificar puerto
sudo netstat -tulpn | grep 3000

# Verificar base de datos
mysql -u condominio_user -p -e "USE condominio_admin; SHOW TABLES;"
```

### Error de conexión a base de datos

```bash
# Verificar que MySQL esté corriendo
sudo systemctl status mysql

# Verificar credenciales
mysql -u condominio_user -p -h localhost condominio_admin

# Verificar firewall
sudo ufw status
```

### Error 502 Bad Gateway

```bash
# Verificar que PM2 esté corriendo
pm2 status

# Reiniciar PM2
pm2 restart all

# Verificar configuración de Nginx
sudo nginx -t
```

## Seguridad Adicional

### 1. Deshabilitar login root SSH

Editar `/etc/ssh/sshd_config`:

```ini
PermitRootLogin no
PasswordAuthentication no
```

Reiniciar SSH:

```bash
sudo systemctl restart sshd
```

### 2. Configurar Fail2Ban

```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. Actualizaciones Automáticas de Seguridad

```bash
sudo apt install unattended-upgrades -y
sudo dpkg-reconfigure -plow unattended-upgrades
```

## Escalado

### Para más tráfico

1. **Aumentar recursos**: Actualizar a VPS con más CPU/RAM
2. **Balanceo de carga**: Usar Nginx como load balancer con múltiples instancias
3. **CDN**: Usar Cloudflare para archivos estáticos
4. **Caching**: Implementar Redis para caché de sesiones

### Base de datos

Para producción con alto tráfico, considerar:
- MySQL en servidor separado
- Configuración de replicación
- Optimización de índices

## Contacto y Soporte

Para problemas o preguntas, contactar al equipo de desarrollo o abrir un issue en el repositorio.