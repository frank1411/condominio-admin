# Despliegue con Docker

Esta guía explica cómo desplegar Condominio Admin usando Docker y Docker Compose.

## Requisitos Previos

- Docker 20.10+
- Docker Compose 2.0+
- 2 GB de RAM mínimo
- 20 GB de espacio en disco

## Configuración Rápida

### 1. Clonar el Repositorio

```bash
git clone https://github.com/frank1411/condominio-admin.git
cd condominio-admin
```

### 2. Configurar Variables de Entorno

Crear archivo `.env`:

```bash
# Base de datos
MYSQL_ROOT_PASSWORD=tu_contraseña_root_segura
MYSQL_DATABASE=condominio_admin
MYSQL_USER=condominio_user
MYSQL_PASSWORD=tu_contraseña_segura

# Aplicación
JWT_SECRET=$(openssl rand -base64 64)
OAUTH_SERVER_URL=https://tu-oauth-server.com
VITE_APP_ID=tu_app_id
OWNER_OPEN_ID=open_id_del_admin

# Almacenamiento (opcional)
BUILT_IN_FORGE_API_URL=https://tu-storage-api.com
BUILT_IN_FORGE_API_KEY=tu_api_key
```

### 3. Iniciar los Contenedores

```bash
# Construir e iniciar
docker-compose up -d

# Ver logs
docker-compose logs -f

# Ver estado
docker-compose ps
```

### 4. Ejecutar Migraciones

```bash
# Entrar al contenedor de la app
docker-compose exec app sh

# Ejecutar migraciones
pnpm db:push

# (Opcional) Sembrar datos
node seed-db.mjs

# Salir
exit
```

## Comandos Útiles

### Gestión de Contenedores

```bash
# Iniciar
docker-compose up -d

# Detener
docker-compose down

# Reiniciar
docker-compose restart

# Ver logs
docker-compose logs -f app

# Ver logs de todos los servicios
docker-compose logs -f

# Reconstruir después de cambios
docker-compose up -d --build
```

### Base de Datos

```bash
# Entrar a MySQL
docker-compose exec mysql mysql -u condominio_user -p condominio_admin

# Backup de base de datos
docker-compose exec mysql mysqldump -u root -p condominio_admin > backup.sql

# Restaurar backup
docker-compose exec -T mysql mysql -u root -p condominio_admin < backup.sql

# Ver volumen de datos
docker volume ls
```

### Actualización

```bash
# Obtener últimos cambios
git pull origin main

# Reconstruir y reiniciar
docker-compose up -d --build

# Ejecutar migraciones si es necesario
docker-compose exec app pnpm db:push
```

## Configuración de Nginx con Docker

Para usar Nginx con Docker Compose, crear archivo `nginx.conf`:

```nginx
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:3000;
    }

    server {
        listen 80;
        server_name tu-dominio.com;

        location / {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        location /api/trpc {
            proxy_pass http://app;
            proxy_http_version 1.1;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        client_max_body_size 50M;
    }
}
```

Luego descomentar el servicio nginx en `docker-compose.yml`.

## SSL con Let's Encrypt

### Opción 1: Usar Certbot en el host

```bash
# Instalar certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtener certificado
sudo certbot certonly --standalone -d tu-dominio.com

# Los certificados estarán en /etc/letsencrypt/live/tu-dominio.com/
```

Montar el directorio de certificados en docker-compose.yml:

```yaml
nginx:
  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf:ro
    - /etc/letsencrypt:/etc/letsencrypt:ro
```

### Opción 2: Usar imagen de Nginx con Certbot

Modificar `docker-compose.yml`:

```yaml
nginx:
  image: staticfloat/nginx-certbot
  environment:
    CERTBOT_EMAIL: tu@email.com
    CERTBOT_DOMAINS: "tu-dominio.com,www.tu-dominio.com"
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx.conf:/etc/nginx/nginx.conf:ro
    - letsencrypt:/etc/letsencrypt
```

## Monitoreo

### Ver recursos de contenedores

```bash
# Estadísticas en tiempo real
docker stats

# Ver uso de disco
docker system df

# Limpiar recursos no usados
docker system prune -a
```

### Logs

```bash
# Logs de la app
docker-compose logs -f app

# Logs de MySQL
docker-compose logs -f mysql

# Logs de Nginx
docker-compose logs -f nginx

# Últimas 100 líneas
docker-compose logs --tail=100 app
```

## Backup y Restore

### Backup Completo

```bash
# Backup de base de datos
docker-compose exec mysql mysqldump -u root -p${MYSQL_ROOT_PASSWORD} condominio_admin > backup_$(date +%Y%m%d).sql

# Backup de volúmenes
docker run --rm -v condominio_mysql_data:/data -v $(pwd):/backup alpine tar czf /backup/mysql_volume_$(date +%Y%m%d).tar.gz /data
```

### Restore

```bash
# Restaurar base de datos
docker-compose exec -T mysql mysql -u root -p${MYSQL_ROOT_PASSWORD} condominio_admin < backup_YYYYMMDD.sql

# Restaurar volumen
docker run --rm -v condominio_mysql_data:/data -v $(pwd):/backup alpine tar xzf /backup/mysql_volume_YYYYMMDD.tar.gz -C /
```

## Solución de Problemas

### Contenedor no inicia

```bash
# Ver logs del contenedor
docker-compose logs app

# Verificar que los puertos estén disponibles
netstat -tulpn | grep 3000

# Reconstruir desde cero
docker-compose down -v
docker-compose up -d --build
```

### Error de conexión a base de datos

```bash
# Verificar que MySQL esté corriendo
docker-compose ps mysql

# Ver logs de MySQL
docker-compose logs mysql

# Verificar credenciales
docker-compose exec mysql mysql -u condominio_user -p condominio_admin
```

### Limpiar todo y empezar de nuevo

```bash
# Detener y eliminar contenedores
docker-compose down -v

# Eliminar imágenes
docker rmi $(docker images -q condominio-admin*)

# Eliminar volúmenes
docker volume rm $(docker volume ls -q)

# Reconstruir
docker-compose up -d --build
```

## Producción

### Para producción, considerar:

1. **Usar imágenes específicas de versión** en lugar de `latest`
2. **Configurar límites de recursos** en docker-compose.yml
3. **Usar secrets de Docker** para variables sensibles
4. **Configurar health checks** personalizados
5. **Usar un orquestador** como Docker Swarm o Kubernetes para escalado

### Ejemplo de límites de recursos:

```yaml
app:
  deploy:
    resources:
      limits:
        cpus: '1.0'
        memory: 1G
      reservations:
        cpus: '0.5'
        memory: 512M
```

## Soporte

Para más información, ver la documentación principal en `DEPLOYMENT.md`.