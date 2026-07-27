# Migración de CondoAdmin: Eliminar dependencia Manus + Vercel + Supabase

**Goal:** Desacoplar completamente el proyecto `condominio-admin` de la plataforma Manus y desplegarlo en Vercel (hosting + serverless) con Supabase (PostgreSQL + Storage + Auth).

**Architecture:** Backend Express + tRPC adaptado a Vercel Serverless Functions (vía `@vercel/node`). Frontend React + Vite desplegado como SPA estática en Vercel. Base de datos migrada de MySQL a Supabase PostgreSQL usando Drizzle ORM. Reemplazar Manus OAuth con Supabase Auth (JWT + OAuth). Reemplazar Manus Storage Forge API con Supabase Storage. Eliminar módulos LLM/IA/Mapas que dependen de Manus Forge.

**Tech Stack:** React 19, Vite 7, TailwindCSS 4, tRPC 11, Drizzle ORM, Supabase (PostgreSQL + Auth + Storage), Vercel (Hosting + Serverless Functions).

---

## Estado Actual (completado)

| Tarea | Estado | Commit |
|-------|--------|--------|
| Task 1: Eliminar dependencias Manus en package.json | ✅ | `chore(deps): remove manus dependencies, add postgres for supabase` |
| Task 2: Migrar schema Drizzle de MySQL a PostgreSQL | ✅ | `feat(db): migrate schema from mysql to postgres` |
| Task 3: Actualizar drizzle.config.ts y conexión DB | ✅ | `feat(db): update drizzle config and connection for postgres` |
| Task 4: Reemplazar Manus OAuth con Supabase Auth | ✅ | `feat(auth): replace manus oauth with supabase auth` |
| Task 5: Eliminar módulos Manus IA/LLM/Mapas/Notificaciones | ✅ | `feat(cleanup): remove manus forge modules` |
| Task 6: Migrar Storage de Manus Forge a Supabase Storage | ✅ | `feat(storage): migrate from manus forge api to supabase storage` |
| Task 7: Configurar Vercel para deploy | ✅ | `feat(vercel): add vercel config, serverless function entry, fix oauth removal` |
| Task 8: Limpiar frontend de referencias Manus | ✅ | `feat(frontend): remove manus references, migrate auth to supabase, clean unused components` |
| Task 9: Verificar compilación | ✅ | Builds: frontend (Vite) 1834 mód. ✓, servidor (esbuild) 81.3kb ✓, api (esbuild) 77.6kb ✓ |

## Tareas Pendientes para Deploy

### Task 10: Configurar proyecto Supabase

**Objetivo:** Crear el proyecto en Supabase y configurar auth + storage.

#### Paso 1: Crear proyecto
- Ir a [https://supabase.com](https://supabase.com) → New Project
- Nombre: `condominio-admin` (o el que quieras)
- Database password: guardarla en lugar seguro
- Región: elegir la más cercana a los usuarios

#### Paso 2: Configurar Auth
- **Settings → Auth**: Deshabilitar "Confirm email" si quieres flujo simple
- **Authentication → Providers**: Habilitar al menos un proveedor (Google, GitHub, o email/password)
  - Para email/password: permitir registro con email + contraseña
  - Para Google OAuth: configurar Client ID y Client Secret desde Google Cloud Console
- **URL Configuration**: 
  - Site URL: `https://<tu-app>.vercel.app`
  - Redirect URLs: `https://<tu-app>.vercel.app/auth/callback`

#### Paso 3: Configurar Storage
- **Storage → New Bucket** con nombre `vouchers` (coincide con el usado en `server/storage.ts`)
- Configuración: público o privado según necesidad
- **RLS Policies**: Crear política que permita a usuarios autenticados leer/subir

#### Paso 4: Obtener credenciales
| Variable | Dónde obtenerla |
|----------|-----------------|
| `SUPABASE_URL` | Project Settings → API → Project URL |
| `SUPABASE_ANON_KEY` | Project Settings → API → anon public key |
| `SUPABASE_SERVICE_KEY` | Project Settings → API → service_role key (secreta) |
| `DATABASE_URL` | Project Settings → Database → Connection string (con password) |

> Nota: Para el pooler de conexiones usar `DATABASE_URL` con el pooler de Supabase (puerto 6543).

#### Paso 5: Seed data (opcional)
Si hay datos de prueba, ejecutar seed SQL después de aplicar migraciones.

---

### Task 11: Configurar deploy en Vercel

**Objetivo:** Desplegar el proyecto en Vercel conectado al repositorio GitHub.

#### Paso 1: Push a GitHub
```bash
# Verificar que el remote apunta a frank1411/condominio-admin
git remote -v

# Si es necesario, cambiar el remote
# git remote set-url origin https://github.com/frank1411/condominio-admin.git

# Push
git push origin main
```

#### Paso 2: Importar proyecto en Vercel
1. Ir a [https://vercel.com/new](https://vercel.com/new)
2. Importar repositorio `frank1411/condominio-admin`
3. **Framework Preset:** Other (o Vite, detectará automáticamente)
4. **Build Command:** `pnpm build`
5. **Output Directory:** `dist/public`
6. **Install Command:** `pnpm install`

#### Paso 3: Configurar variables de entorno en Vercel

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | `postgresql://postgres:***@xxx.supabase.co:5432/postgres` |
| `SUPABASE_URL` | `https://xxx.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJ...` (anon public key) |
| `SUPABASE_SERVICE_KEY` | `eyJ...` (service_role key) |
| `ADMIN_OPEN_ID` | `admin` (o el email del admin) |
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` (prefijo VITE_ para exp. en frontend) |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` |
| `VITE_GOOGLE_MAPS_API_KEY` | Opcional, para mapas |
| `NODE_ENV` | `production` |
| `JWT_SECRET` | Opcional, solo si se usa en alguna parte |

#### Paso 4: Configurar dominio personalizado (opcional)
- Ir a Project → Domains → Add
- Seguir instrucciones de configuración DNS

#### Paso 5: Deploy
- Vercel hace deploy automático al pushear a `main`
- También se puede trigger manual desde Dashboard → Deployments

---

### Task 12: Ejecutar migraciones Drizzle

**Objetivo:** Aplicar el esquema de base de datos a Supabase PostgreSQL.

#### Opción A: Usando Supabase SQL Editor (recomendado para deploy inicial)
```bash
# Generar migraciones desde el schema
pnpm run db:generate

# Ver el archivo SQL generado en drizzle/migrations/
# Copiar y pegar en Supabase SQL Editor
```

#### Opción B: Usando Drizzle Kit (si tienes acceso a la DB)
```bash
pnpm run db:push
```

#### Opción C: Usando migraciones manuales
```bash
# Conectar a la DB y ejecutar el archivo SQL
psql "$DATABASE_URL" -f drizzle/migrations/0000_*.sql
```

#### Verificar
```sql
-- En Supabase SQL Editor
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;
```
Deberías ver: `users`, `payments`, `charges`, `apartments`, `requests`, etc.

---

### Task 13: Pruebas post-deploy

**Objetivo:** Verificar que todo funciona en producción.

#### Prueba 1: Frontend
- Acceder a `https://<tu-app>.vercel.app`
- Verificar que carga la página de login
- Verificar que el SPA routing funciona (navegar a `/login` directamente)

#### Prueba 2: Auth
- Hacer clic en "Iniciar Sesión"
- Verificar que redirige a Supabase Auth UI
- Completar login (Google o email/password)
- Verificar que redirige a `/auth/callback` y luego al dashboard

#### Prueba 3: API
```bash
curl -v https://<tu-app>.vercel.app/api/trpc/health | jq
```
Respuesta esperada: `{"status":"ok"}`

#### Prueba 4: Storage
- Subir un voucher/comprobante
- Verificar que se guarda en Supabase Storage bucket `vouchers`
- Verificar que se puede descargar/ver

#### Prueba 5: Base de datos
- Verificar que usuarios nuevos se crean al hacer login
- Verificar que datos existentes son accesibles

#### Prueba 6: Rendimiento
- Verificar cold starts (primera carga después de inactividad)
- Verificar timeouts en operaciones largas (PDF, Excel)

---

## Variables de Entorno Requeridas

```bash
# Supabase Database
DATABASE_URL=postgresql://postgres:***@xxx.supabase.co:5432/postgres

# Supabase Auth
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...  # anon public (segura para frontend)
SUPABASE_SERVICE_KEY=eyJ...  # service_role (SECRETA, solo backend)

# Frontend (prefijo VITE_)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_GOOGLE_MAPS_API_KEY=xxx  # opcional

# App
ADMIN_OPEN_ID=admin  # o email del admin
NODE_ENV=production
```

## Notas Técnicas

1. **tRPC y Serverless:** Funciona bien en Vercel. Usar stale times largos en React Query para mitigar cold starts.
2. **Pool de conexiones:** Usar Supabase Pooler (PgBouncer) con pool máximo bajo (max: 5-10). Puerto: 6543.
3. **Migración de datos:** Las migraciones MySQL existentes no son aplicables. Generar migración fresh con `drizzle-kit generate`.
4. **Límite Vercel Gratuito:** Timeout 30s configurado en vercel.json para la función serverless. Operaciones largas como PDF pueden necesitar timeout mayor o background jobs.
5. **Storage:** Se usa `supabaseAdmin.storage` (no AWS S3 SDK), más simple y directo para el ecosistema Supabase.
6. **Auth flow:** Frontend → Supabase Auth (OAuth redirect) → Callback page → Guarda sesión en localStorage → tRPC incluye Bearer token.
