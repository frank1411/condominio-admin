# Migración de CondoAdmin a Vercel y Supabase

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Migrar el despliegue del proyecto `condominio-admin` desde una infraestructura autogestionada/Manus a una arquitectura Serverless usando Vercel para el Frontend/Backend y Supabase para la base de datos MySQL/PostgreSQL.

**Architecture:** El proyecto actualmente usa Vite, Express (servidor backend custom), y Drizzle ORM con MySQL. Vercel espera funciones Serverless o integraciones con frameworks como Next.js, por lo que el servidor Express custom necesita adaptarse o reemplazarse por Vercel Serverless Functions. Supabase usa PostgreSQL, así que si migramos a Supabase, Drizzle debe configurarse para `pg` en lugar de `mysql2`.

**Tech Stack:** React, Vite, Drizzle ORM, Supabase (PostgreSQL), Vercel (Hosting & Serverless Functions).

---

## Evaluación del Proyecto Actual

1. **Frontend:** React + Vite. Perfectamente compatible con Vercel.
2. **Backend:** Un servidor Express custom (`server/index.ts`) que levanta APIs. En Vercel, esto debe migrar a funciones dentro de `api/` o usar el adaptador `@vercel/node`.
3. **Base de Datos:** Drizzle ORM está configurado para `mysql2` (`drizzle.config.ts`, `server/db.ts`). Supabase es **PostgreSQL**. Hay que cambiar el dialecto de Drizzle y adaptar el esquema (`mysqlTable` -> `pgTable`, tipos de datos).
4. **Almacenamiento:** El proyecto parece usar `@aws-sdk/client-s3`. Supabase tiene su propio Storage compatible con S3, así que se pueden reutilizar las credenciales apuntando al endpoint de Supabase.

---

## Tareas de Implementación

### Task 1: Migrar esquema de Drizzle de MySQL a PostgreSQL

**Objective:** Adaptar los archivos de esquema para que usen `pgCore` en lugar de `mysqlCore` para ser compatibles con Supabase.

**Files:**
- Modify: `drizzle/schema.ts`
- Modify: `package.json`

**Step 1: Instalar dependencias de PostgreSQL**

```bash
pnpm add postgres
pnpm add -D @types/pg
pnpm remove mysql2
```

**Step 2: Actualizar el esquema (`drizzle/schema.ts`)**

Cambiar importaciones y definiciones de tablas:

```typescript
// Reemplazar: import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, date, longtext } from "drizzle-orm/mysql-core";
import { 
  serial, 
  pgEnum, 
  pgTable, 
  text, 
  timestamp, 
  varchar,
  decimal,
  boolean,
  date 
} from "drizzle-orm/pg-core";

// Para cada tabla, cambiar mysqlTable a pgTable, int() a serial() para PKs, etc.
// Ejemplo:
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  // ...
});
```

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml drizzle/schema.ts
git commit -m "chore(db): migrate schema from mysql to postgres for supabase"
```

### Task 2: Actualizar conexión de Drizzle a PostgreSQL

**Objective:** Modificar la instancia de conexión para usar el driver de PostgreSQL.

**Files:**
- Modify: `server/db.ts`
- Modify: `drizzle.config.ts`

**Step 1: Modificar `server/db.ts`**

```typescript
// server/db.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      const queryClient = postgres(process.env.DATABASE_URL);
      _db = drizzle(queryClient, { schema });
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}
```

**Step 2: Modificar `drizzle.config.ts`**

```typescript
// drizzle.config.ts
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

**Step 3: Commit**

```bash
git add server/db.ts drizzle.config.ts
git commit -m "chore(db): update drizzle config to use postgres"
```

### Task 3: Adaptar Backend Express para Vercel Serverless

**Objective:** Convertir el servidor Express en una función compatible con Vercel (Serverless Function).

**Files:**
- Create: `api/index.ts`
- Create: `vercel.json`

**Step 1: Crear configuración de Vercel**

```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "api/index.ts",
      "use": "@vercel/node"
    },
    {
      "src": "package.json",
      "use": "@vercel/vite"
    }
  ],
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/index.ts"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**Step 2: Crear el punto de entrada de la API**

```typescript
// api/index.ts
import express from 'express';
// Importar routers desde server/routers.ts u otra ubicación
// import { appRouter } from '../server/routers'; 

const app = express();
app.use(express.json());

// Montar rutas
// app.use('/api', appRouter);

export default app;
```
*(Nota: Ajustar la importación del router según la estructura exacta de `server/index.ts` y `server/routers.ts`)*

**Step 3: Commit**

```bash
git add vercel.json api/index.ts
git commit -m "feat(deploy): configure vercel serverless functions"
```

### Task 4: Configuración de Variables de Entorno y Scripts

**Objective:** Preparar los scripts de NPM para construir el frontend con Vite y manejar las migraciones.

**Files:**
- Modify: `package.json`

**Step 1: Actualizar scripts**

```json
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "db:push": "drizzle-kit push",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx server/migrate.ts"
  }
```

**Step 2: Variables necesarias en Vercel/Supabase (.env)**

Documentar para el usuario:
- `DATABASE_URL`: Connection string de Supabase (modo Transaction / Pooler).
- Credenciales S3 (si aplican) apuntando al bucket S3 de Supabase Storage.

**Step 3: Commit**

```bash
git add package.json
git commit -m "chore: update build scripts for vercel"
```

---

## Riesgos y Consideraciones

1. **Express en Vercel:** Vercel impone un límite de ejecución en las Serverless Functions (ej. 10s en plan gratuito). Rutas lentas podrían dar timeout.
2. **Drizzle MySQL vs Postgres:** Ciertas funciones nativas de MySQL usadas en el código podrían no tener traducción directa 1 a 1 a PostgreSQL (ej. JSON, fechas). Se requerirá revisión detallada de las queries.
3. **WebSockets/Cron:** Si el servidor actual usa WebSockets o cron jobs integrados en Express, Vercel no los soporta. Supabase Edge Functions / Vercel Cron jobs serían la alternativa.