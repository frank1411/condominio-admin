# Migración de CondoAdmin: Eliminar dependencia Manus + Vercel + Supabase

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Desacoplar completamente el proyecto `condominio-admin` de la plataforma Manus y desplegarlo en Vercel (hosting + serverless) con Supabase (PostgreSQL + Storage + Auth).

**Architecture:** Backend Express + tRPC adaptado a Vercel Serverless Functions (vía `@vercel/node`). Frontend React + Vite desplegado como SPA estática en Vercel. Base de datos migrada de MySQL a Supabase PostgreSQL usando Drizzle ORM. Reemplazar Manus OAuth con Supabase Auth (email/password). Reemplazar Manus Storage Forge API con Supabase Storage (S3). Eliminar módulos LLM/IA/Mapas que dependen de Manus Forge.

**Tech Stack:** React 19, Vite 7, TailwindCSS 4, tRPC 11, Drizzle ORM, Supabase (PostgreSQL + Auth + Storage), Vercel (Hosting + Serverless Functions).

---

## Evaluación Exhaustiva del Proyecto

### Dependencias de Manus identificadas

| Archivo/Componente | Dependencia | Acción |
|---|---|---|
| `server/_core/sdk.ts` | SDK de autenticación Manus (ExchangeToken, GetUserInfo, JWT signing) | ELIMINAR |
| `server/_core/oauth.ts` | OAuth callback de Manus | ELIMINAR y reemplazar con Supabase Auth callback |
| `server/_core/context.ts` | Extrae usuario vía `sdk.authenticateRequest()` | REWRITE con Supabase Auth |
| `server/_core/trpc.ts` | Depende del contexto de `sdk` | Actualizar dependencia |
| `server/_core/systemRouter.ts` | `notifyOwner()` usa Manus Forge API | REMOVER o reemplazar |
| `server/_core/notification.ts` | Manus Forge API SendNotification | ELIMINAR |
| `server/_core/llm.ts` | Manus Forge API LLM | ELIMINAR (o mover a módulo opcional) |
| `server/_core/imageGeneration.ts` | Manus Forge API + storage | ELIMINAR |
| `server/_core/map.ts` | Google Maps vía Manus Forge proxy | ELIMINAR (usar Google Maps directo) |
| `server/_core/dataApi.ts` | Manus Forge API proxy genérico | ELIMINAR |
| `server/_core/voiceTranscription.ts` | Manus Forge API | ELIMINAR |
| `server/_core/types/manusTypes.ts` | Tipos protobuf de Manus | ELIMINAR |
| `server/storage.ts` | Manus Forge API storage | REEMPLAZAR con AWS S3 SDK |
| `client/src/_core/hooks/useAuth.ts` | Almacena usuario en `manus-runtime-user-info` | Limpiar legado |
| `client/src/pages/Login.tsx` | `getLoginUrl()` apunta a Manus OAuth portal | REWRITE con Supabase Auth |
| `client/src/const.ts` | `getLoginUrl()` genera URL de Manus OAuth | REEMPLAZAR con Supabase Auth URL |
| `client/src/components/ManusDialog.tsx` | Diálogo de login de Manus | ELIMINAR (no usado directamente) |
| `client/src/components/AIChatBox.tsx` | LLM vía tRPC → Manus Forge | MANTENER pero adaptar backend |
| `vite-plugin-manus-runtime` | Plugin Vite de Manus | ELIMINAR de devDependencies |
| `@builder.io/vite-plugin-jsx-loc` | Plugin de Manus | MANTENER (es de Builder.io) |
| `server/db.ts` | Usa `drizzle-orm/mysql2` | MIGRAR a `drizzle-orm/pg-core` + `postgres` |
| `drizzle/schema.ts` | `mysqlCore`, `mysqlTable`, `int()`, etc. | MIGRAR a `pg-core`, `pgTable`, `serial()`, etc. |
| `drizzle.config.ts` | Dialecto `mysql` | CAMBIAR a `postgresql` |

### Estructura actual de archivos (resumen)

```
condominio-admin/
├── client/
│   ├── src/
│   │   ├── _core/hooks/useAuth.ts
│   │   ├── components/ (AIChatBox, DashboardLayout, ManusDialog, Map, VoucherUpload, etc.)
│   │   ├── lib/trpc.ts
│   │   ├── pages/ (admin/, user/, Login.tsx, Home.tsx, etc.)
│   │   └── const.ts, App.tsx, main.tsx
│   └── index.html
├── server/
│   ├── _core/
│   │   ├── index.ts (entrypoint Express)
│   │   ├── oauth.ts, sdk.ts, context.ts, trpc.ts
│   │   ├── cookies.ts, env.ts, vite.ts
│   │   ├── llm.ts, imageGeneration.ts, map.ts, dataApi.ts, notification.ts, voiceTranscription.ts
│   │   ├── systemRouter.ts
│   │   ├── types/ (manusTypes.ts, cookie.d.ts)
│   │   └── (llm.ts, imageGeneration.ts, voiceTranscription.ts, map.ts, dataApi.ts)
│   ├── db.ts (1695 líneas — funciones de base de datos)
│   ├── routers.ts (884 líneas — tRPC routers)
│   ├── exports.ts (PDF/Excel), storage.ts (Manus)
│   └── *.test.ts (tests)
├── shared/ (const.ts, types.ts, _core/errors.ts)
├── drizzle/
│   ├── schema.ts (221 líneas, MySQL)
│   ├── migrations/ (SQL files)
│   └── relations.ts
├── package.json, tsconfig.json, vite.config.ts, vercel.json (?)
```

---

## Plan de Trabajo — Tareas Granulares

### Task 1: Limpiar dependencias de Manus en package.json

**Objective:** Eliminar el plugin `vite-plugin-manus-runtime` y dependencias MySQL, agregar dependencias de PostgreSQL.

**Files:**
- Modify: `package.json`

**Step 1: Editar package.json**

```bash
# Desde la raíz del proyecto
pnpm remove vite-plugin-manus-runtime mysql2
pnpm add postgres drizzle-orm @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
pnpm add -D drizzle-kit
# @builder.io/vite-plugin-jsx-loc es de Builder.io, no de Manus — mantener
```

Resultado: `mysql2` eliminado, `postgres` agregado, `vite-plugin-manus-runtime` eliminado.

**Step 2: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "chore(deps): remove manus dependencies, add postgres and s3"
```

---

### Task 2: Migrar esquema Drizzle de MySQL a PostgreSQL

**Objective:** Convertir todas las definiciones de tablas de `mysqlCore` a `pgCore`.

**Files:**
- Modify: `drizzle/schema.ts`

**Step 1: Reemplazar imports en `drizzle/schema.ts`**

Cambiar de:
```typescript
import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, date, longtext } from "drizzle-orm/mysql-core";
```
a:
```typescript
import { integer, pgEnum, pgTable, text, timestamp, varchar, decimal, boolean, date, serial } from "drizzle-orm/pg-core";
```

**Step 2: Convertir cada tabla**

Para cada `mysqlTable("nombre", {...})`:
- Cambiar a `pgTable("nombre", {...})`
- `int("id").autoincrement().primaryKey()` → `serial("id").primaryKey()`
- `mysqlEnum("col", ["a", "b"])` → crear `pgEnum("nombre_enum", ["a", "b"])` y usar `nombre_enum("col")`
- `varchar("col", { length: 320 })` → `varchar("col", { length: 320 })` (igual)
- `text("col")` → `text("col")` (igual)
- `decimal("col", { precision: 10, scale: 2 })` → `decimal("col", { precision: 10, scale: 2 })` (igual)
- `boolean("col")` → `boolean("col")` (igual)
- `timestamp("col")` → `timestamp("col")` (igual)
- `date("col")` → `date("col")` (igual)
- `longtext("col")` → `text("col")` (no existe longtext en pg)

**Step 3: Crear enums de PostgreSQL**

```typescript
export const roleEnum = pgEnum("role", ["user", "admin"]);
export const approvalStatusEnum = pgEnum("approval_status", ["pending", "approved", "rejected"]);
export const currencyEnum = pgEnum("currency", ["USD", "VES"]);
export const methodEnum = pgEnum("method", ["transfer", "cash", "mobile_payment", "other"]);
export const statusEnum = pgEnum("status", ["pending", "paid", "overdue", "cancelled"]);
// ... revisar el schema completo para identificar todos los enums
```

**Step 4: Commit**

```bash
git add drizzle/schema.ts
git commit -m "feat(db): migrate schema from mysql to postgres"
```

---

### Task 3: Actualizar drizzle.config.ts y conexión DB

**Objective:** Cambiar la configuración de Drizzle Kit y la conexión de BD a PostgreSQL.

**Files:**
- Modify: `drizzle.config.ts`
- Modify: `server/db.ts`

**Step 1: Cambiar `drizzle.config.ts`**

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

**Step 2: Cambiar `server/db.ts`**

Cambiar imports y la instancia de drizzle:
```typescript
// Antes (MySQL):
// import { drizzle } from "drizzle-orm/mysql2";

// Después (PostgreSQL):
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const queryClient = postgres(process.env.DATABASE_URL, { max: 10 });
      _db = drizzle(queryClient, { schema });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
```

**Nota importante:** `server/db.ts` tiene 1695 líneas con funciones de negocio. El cambio de dialecto debe verificar que las funciones usen operadores compatibles con PostgreSQL (`eq, and, gte, lte, desc, isNull, asc` ya son cross-dialect en Drizzle). Verificar funciones que usen `concat`, `JSON`, o funciones MySQL específicas.

**Step 3: Commit**

```bash
git add drizzle.config.ts server/db.ts
git commit -m "feat(db): update drizzle config and connection for postgres"
```

---

### Task 4: Reemplazar Manus OAuth con Supabase Auth

**Objective:** Implementar autenticación usando Supabase Auth (email/password) en lugar de Manus OAuth.

**Files:**
- Create: `server/_core/supabase.ts`
- Create: `server/auth.ts` (nuevo módulo de autenticación)
- Delete: `server/_core/oauth.ts`
- Modify: `server/_core/context.ts`
- Modify: `server/_core/env.ts`
- Modify: `server/_core/sdk.ts` (eliminar contenido, mantener solo JWT helpers si aplica)
- Modify: `server/_core/cookies.ts`

**Step 1: Crear `server/_core/supabase.ts`**

```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false, // No persistir en server
  },
});
```

**Step 2: Instalar Supabase client**

```bash
pnpm add @supabase/supabase-js
```

**Step 3: Modificar `server/_core/env.ts`**

Agregar:
```typescript
supabaseUrl: process.env.SUPABASE_URL ?? "",
supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? "",
supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
```

Remover variables obsoletas:
- `oAuthServerUrl` (Manus)
- `forgeApiUrl` (Manus)
- `forgeApiKey` (Manus)
- `ownerOpenId` (Manus)

**Step 4: Modificar `server/_core/context.ts`**

Cambiar para verificar sesión con Supabase:
```typescript
import { supabase } from "./supabase";
import * as db from "../db";

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const token = opts.req.cookies?.[COOKIE_NAME];
    if (token) {
      const { data: { user: supabaseUser } } = await supabase.auth.getUser(token);
      if (supabaseUser?.email) {
        user = await db.getUserByEmail(supabaseUser.email);
      }
    }
  } catch (error) {
    user = null;
  }

  return { req: opts.req, res: opts.res, user };
}
```

**Step 5: Modificar Login.tsx del frontend**

Cambiar para usar Supabase Auth:
```typescript
import { supabase } from "@/lib/supabase"; // Nuevo archivo

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) window.location.href = "/";
  };

  return (
    // Formulario de login con email/password
  );
}
```

**Step 6: Eliminar archivos de Manus OAuth**

```bash
rm server/_core/oauth.ts server/_core/types/manusTypes.ts server/_core/sdk.ts
```

**Step 7: Commit**

```bash
git add server/_core/supabase.ts server/auth.ts server/_core/context.ts server/_core/env.ts
git rm server/_core/oauth.ts server/_core/types/manusTypes.ts server/_core/sdk.ts
git commit -m "feat(auth): replace manus oauth with supabase auth"
```

---

### Task 5: Eliminar módulos Manus IA/LLM/Mapas/Notificaciones

**Objective:** Remover todo el código que depende del Manus Forge API.

**Files:**
- Delete: `server/_core/llm.ts`
- Delete: `server/_core/imageGeneration.ts`
- Delete: `server/_core/map.ts`
- Delete: `server/_core/dataApi.ts`
- Delete: `server/_core/notification.ts`
- Delete: `server/_core/voiceTranscription.ts`
- Modify: `server/_core/systemRouter.ts` (remover `notifyOwner`)
- Keep: `client/src/components/AIChatBox.tsx` (es un componente UI reutilizable)
- Keep: `client/src/components/Map.tsx` (es Google Maps directo)

**Step 1: Eliminar archivos**

```bash
rm server/_core/llm.ts server/_core/imageGeneration.ts server/_core/map.ts
rm server/_core/dataApi.ts server/_core/notification.ts server/_core/voiceTranscription.ts
```

**Step 2: Limpiar `systemRouter.ts`**

```typescript
export const systemRouter = router({
  health: publicProcedure
    .input(z.object({ timestamp: z.number().min(0) }))
    .query(() => ({ ok: true })),
  // Eliminar notifyOwner
});
```

**Step 3: Commit**

```bash
git rm server/_core/llm.ts server/_core/imageGeneration.ts server/_core/map.ts
git rm server/_core/dataApi.ts server/_core/notification.ts server/_core/voiceTranscription.ts
git add server/_core/systemRouter.ts
git commit -m "feat: remove manus forge API modules (llm, image, maps, notifications)"
```

---

### Task 6: Migrar Storage de Manus Forge a Supabase Storage

**Objective:** Usar Supabase Storage (S3-compatible) para subida de vouchers/comprobantes.

**Files:**
- Rewrite: `server/storage.ts`
- Modify: `server/routers.ts` (endpoints que usan storage)

**Step 1: Re-escribir `server/storage.ts`**

```typescript
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: process.env.SUPABASE_S3_REGION!,
  endpoint: process.env.SUPABASE_S3_ENDPOINT!, // https://<project>.supabase.co/storage/v1/s3
  credentials: {
    accessKeyId: process.env.SUPABASE_S3_ACCESS_KEY!,
    secretAccessKey: process.env.SUPABASE_S3_SECRET_KEY!,
  },
  forcePathStyle: true,
});

export async function uploadFile(bucket: string, key: string, body: Buffer, contentType: string) {
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));

  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), {
    expiresIn: 3600,
  });
}
```

**Step 2: Commit**

```bash
git add server/storage.ts
git commit -m "feat(storage): migrate from manus forge to supabase s3 storage"
```

---

### Task 7: Configurar Vercel para deploy

**Objective:** Crear la estructura necesaria para deployar en Vercel.

**Files:**
- Create: `vercel.json`
- Create: `api/index.ts`
- Modify: `server/_core/index.ts` (refactorizar para export default)
- Modify: `package.json` (scripts para build Vercel)

**Step 1: Crear `vercel.json`**

```json
{
  "version": 2,
  "buildCommand": "pnpm build",
  "outputDirectory": "dist/client",
  "functions": {
    "api/index.ts": {
      "memory": 256,
      "maxDuration": 30
    }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/index.ts" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Step 2: Crear `api/index.ts`**

```typescript
import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";
import cookieParser from "cookie-parser";

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(cookieParser());

app.use(
  "/api/trpc",
  createExpressMiddleware({ router: appRouter, createContext })
);

export default app;
```

**Step 3: Actualizar scripts en `package.json`**

```json
"scripts": {
  "dev": "tsx watch server/_core/index.ts",
  "build": "vite build --outDir ../dist/client && esbuild api/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist/api",
  "start": "node dist/api/index.js",
  "vercel-build": "vite build --outDir ../dist/client",
  "db:push": "drizzle-kit push",
  "db:generate": "drizzle-kit generate",
  "test": "vitest run"
}
```

**Step 4: Commit**

```bash
git add vercel.json api/index.ts package.json
git commit -m "feat(deploy): configure vercel deployment"
```

---

### Task 8: Limpiar frontend de referencias Manus

**Objective:** Eliminar referencias obsoletas del frontend.

**Files:**
- Delete: `vite.config.ts` (actualizar)
- Modify: `client/src/const.ts`
- Modify: `client/src/pages/Login.tsx`
- Modify: `client/src/_core/hooks/useAuth.ts`
- Delete: `client/src/components/ManusDialog.tsx` (o renombrar)

**Step 1: Actualizar `vite.config.ts`**

Remover `vitePluginManusRuntime()` y `vitePluginManusDebugCollector()` de los plugins.

**Step 2: Re-escribir `client/src/const.ts`**

Simplificar para usar Supabase Auth:
```typescript
export const getLoginUrl = () => "/login";
// o generar URL de Supabase Auth
export const getSupabaseAuthUrl = () => {
  const url = new URL(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/authorize`);
  url.searchParams.set("provider", "email");
  return url.toString();
};
```

**Step 3: Re-escribir `Login.tsx`**

Implementar formulario de login con email/contraseña usando Supabase Auth.

**Step 4: Commit**

```bash
git add vite.config.ts client/src/const.ts client/src/pages/Login.tsx client/src/_core/hooks/useAuth.ts
git rm client/src/components/ManusDialog.tsx
git commit -m "feat(frontend): migrate login from manus oauth to supabase auth"
```

---

### Task 9: Probar compilación y migraciones

**Objective:** Verificar que el proyecto compila y las migraciones funcionan.

**Files:**
- Verify: Todo el proyecto

**Step 1: Verificar TypeScript**

```bash
pnpm run check  # tsc --noEmit
```
Resultado esperado: Sin errores de tipo.

**Step 2: Generar migración**

```bash
pnpm run db:generate
```
Resultado esperado: Nuevo archivo SQL en `drizzle/migrations/`.

**Step 3: Build de frontend**

```bash
pnpm run build
```
Resultado esperado: `dist/client/` con los assets compilados.

---

## Variables de Entorno Requeridas (para Vercel + Supabase)

```
# Supabase
DATABASE_URL=postgresql://postgres:xxx@xxx.supabase.co:5432/postgres
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
SUPABASE_S3_ENDPOINT=https://xxx.supabase.co/storage/v1/s3
SUPABASE_S3_REGION=us-east-1
SUPABASE_S3_ACCESS_KEY=xxx
SUPABASE_S3_SECRET_KEY=xxx

# Aplicación
JWT_SECRET=xxx
NODE_ENV=production
```

## Riesgos y Consideraciones

1. **tRPC y Serverless:** tRPC funciona bien en funciones serverless de Vercel. La conexión fría (cold start) puede agregar latencia. Usar `@tanstack/react-query` con stale times largos ayuda.

2. **Pool de conexiones:** Usar `postgres` con pool máximo bajo (max: 5-10) y habilitar Supabase Pooler (PgBouncer) para evitar saturar conexiones.

3. **Migración de datos:** Las migraciones existentes de MySQL (SQL en `drizzle/migrations/`) no son directamente aplicables a PostgreSQL. Conviene generar una migración fresh con `drizzle-kit generate` después del schema en pg-core.

4. **Límite de ejecución Vercel:** El plan gratuito tiene timeout de 10s para serverless functions. Si alguna operación es lenta (generar PDF, exportar Excel), puede exceder el límite. Considerar usar Vercel Pro o mover esas operaciones a tareas asíncronas.

5. **AIChatBox:** El componente existe pero el backend de LLM se eliminó. Si se desea mantener, se puede conectar a OpenAI/Anthropic directamente más adelante.

6. **Atención con `server/db.ts`:** 1695 líneas con funciones de negocio. Verificar que todas las queries sean cross-dialect. Drizzle abstrae la mayoría de las diferencias, pero `concat`, `json_extract`, o funciones de fecha específicas de MySQL necesitan adaptación.**

## Orden de ejecución recomendado

```
Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7 → Task 8 → Task 9
```

Cada tarea es autocontenida y commiteable. No avanzar a la siguiente sin verificar que la anterior compila.

💚 **Estado de ejecución:** Tasks 1-9 completadas. Tasks 10-13 pendientes para deploy.

---

## Despliegue (Tasks 10-13)

### Task 10: Configurar proyecto Supabase

**Objetivo:** Crear el proyecto en Supabase y configurar auth + storage.

1. Ir a [supabase.com](https://supabase.com) → New Project → nombre `condominio-admin`
2. **Auth** → Habilitar Google OAuth o email/password como proveedor
3. **URL Configuration** → Site URL: `https://<app>.vercel.app`, Redirect URLs: `https://<app>.vercel.app/auth/callback`
4. **Storage** → Crear bucket `vouchers` con RLS policies para usuarios autenticados
5. **Obtener credenciales:**
   - `SUPABASE_URL` → Project Settings → API → Project URL
   - `SUPABASE_ANON_KEY` → Project Settings → API → anon public key
   - `SUPABASE_SERVICE_KEY` → Project Settings → API → service_role key
   - `DATABASE_URL` → Project Settings → Database → Connection string (usar pooler puerto 6543)

### Task 11: Configurar deploy en Vercel

**Objetivo:** Desplegar el proyecto en Vercel conectado al repositorio GitHub.

1. Pushear a GitHub: `git push origin main`
2. Importar en [vercel.com/new](https://vercel.com/new) desde `frank1411/condominio-admin`
3. **Build Command:** `pnpm build`
4. **Output Directory:** `dist/public`
5. **Install Command:** `pnpm install`
6. Configurar environment variables (ver sección arriba) en Vercel Dashboard
7. Si se desea dominio personalizado: Project → Domains → Add

### Task 12: Ejecutar migraciones Drizzle

**Objetivo:** Aplicar el esquema de base de datos a Supabase PostgreSQL.

```bash
# Generar migraciones desde el schema
pnpm run db:generate

# Aplicar vía Drizzle Kit
pnpm run db:push
```
O copiar el SQL generado en Supabase SQL Editor.

### Task 13: Pruebas post-deploy

**Objetivo:** Verificar que todo funciona en producción.

1. Frontend carga en `https://<app>.vercel.app`
2. Login redirige a Supabase Auth y vuelve al dashboard
3. `curl https://<app>.vercel.app/api/trpc/health` → `{"status":"ok"}`
4. Subir voucher → se guarda en bucket `vouchers`
5. Usuarios nuevos se crean al hacer login
6. Verificar cold starts y timeouts en operaciones largas
