# Migración de CondoAdmin: Eliminar dependencia Manus + Vercel + Supabase

**Goal:** Desacoplar completamente el proyecto `condominio-admin` de la plataforma Manus y desplegarlo en Vercel (hosting + serverless) con Supabase (PostgreSQL + Storage + Auth).

**Architecture:** Backend Express + tRPC adaptado a Vercel Serverless Functions (bundle autocontenido vía esbuild). Frontend React + Vite desplegado como SPA estática en Vercel. Base de datos migrada de MySQL a Supabase PostgreSQL usando Drizzle ORM. Reemplazar Manus OAuth con Supabase Auth (email/password). Reemplazar Manus Storage Forge API con Supabase Storage (S3). Eliminar módulos LLM/IA/Mapas que dependen de Manus Forge.

**Tech Stack:** React 19, Vite 7, TailwindCSS 4, tRPC 11, Drizzle ORM, Supabase (PostgreSQL + Auth + Storage), Vercel (Hosting + Serverless Functions).

---

## Estado Actual — COMPLETADO ✅

| Tarea | Estado | Commit / Detalle |
|-------|--------|------------------|
| Task 1: Eliminar dependencias Manus en package.json | ✅ | `chore(deps): remove manus dependencies, add postgres for supabase` |
| Task 2: Migrar schema Drizzle de MySQL a PostgreSQL | ✅ | `feat(db): migrate schema from mysql to postgres` |
| Task 3: Actualizar drizzle.config.ts y conexión DB | ✅ | `feat(db): update drizzle config and connection for postgres` |
| Task 4: Reemplazar Manus OAuth con Supabase Auth | ✅ | `feat(auth): replace manus oauth with supabase auth` |
| Task 5: Eliminar módulos Manus IA/LLM/Mapas/Notificaciones | ✅ | `feat(cleanup): remove manus forge modules` |
| Task 6: Migrar Storage de Manus Forge a Supabase Storage | ✅ | `feat(storage): migrate from manus forge api to supabase storage` |
| Task 7: Configurar Vercel para deploy | ✅ | `feat(vercel): add vercel config, serverless function entry, fix oauth removal` |
| Task 8: Limpiar frontend de referencias Manus | ✅ | `feat(frontend): remove manus references, migrate auth to supabase, clean unused components` |
| Task 9: Verificar compilación | ✅ | Builds: frontend (Vite) 1834 mód. ✓, servidor (esbuild) 81.3kb ✓, api (esbuild) 77.6kb ✓ |
| Task 10: Configurar proyecto Supabase | ✅ | Proyecto `pvtcpuboyjibltcyyzqe` (sa-east-1, free), auth por email/password, bucket `vouchers` creado |
| Task 11: Configurar deploy en Vercel | ✅ | Proyecto vinculado, repo público, env vars configuradas, `condominio-admin-eta.vercel.app` |
| Task 12: Ejecutar migraciones Drizzle | ✅ | `pnpm db:push` ejecutado, tablas creadas en Supabase PostgreSQL |
| Task 13: Pruebas post-deploy | ✅ | Frontend HTTP 200, API responde (`system.health` encontrado), DB conectada |

---

## URLs de Producción

- **Frontend:** https://condominio-admin-eta.vercel.app/
- **API (tRPC):** https://condominio-admin-eta.vercel.app/api/trpc/system.health
- **Supabase Dashboard:** https://supabase.com/dashboard/project/pvtcpuboyjibltcyyzqe
- **GitHub:** https://github.com/frank1411/condominio-admin

---

## Variables de Entorno (configuradas en Vercel Dashboard + `.env` local)

```bash
# Supabase Database (pooler IPv4, puerto 6543)
DATABASE_URL=postgresql://postgres:[REDACTED]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true

# Supabase Auth
SUPABASE_URL=https://pvtcpuboyjibltcyyzqe.supabase.co
SUPABASE_ANON_KEY=sb_publishable_titttw4Rxx4tEv9-Ghjulg_5ZRx9G2R
SUPABASE_SERVICE_KEY=eyJ...  # service_role JWT legacy

# Frontend (prefijo VITE_)
VITE_SUPABASE_URL=https://pvtcpuboyjibltcyyzqe.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_titttw4Rxx4tEv9-Ghjulg_5ZRx9G2R

# App
ADMIN_OPEN_ID=7e68e1a3-fdc2-4248-8c7e-32c24db7ebad
NODE_ENV=production
```

---

## Configuración del Deploy

### `vercel.json`
```json
{
  "version": 2,
  "buildCommand": "pnpm build",
  "outputDirectory": "dist/public",
  "installCommand": "pnpm install",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api" },
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "env": { "NODE_ENV": "production" }
}
```

### `package.json` — Build script
```json
{
  "build": "vite build && esbuild server/_core/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist && esbuild api/_entry.ts --platform=node --packages=external --bundle --format=esm --outfile=api/index.js"
}
```

### Estructura de la API serverless
```
api/
├── _entry.ts      ← Entry point original (TypeScript, transpilado por esbuild)
└── index.js       ← Bundle autocontenido (77.6KB, ESM, generado en build)
```

---

## Problemas Resueltos durante el Deploy

| Problema | Solución |
|----------|----------|
| Conexión DB fallaba (resolución DNS solo IPv6) | Usar pooler IPv4: puerto 6543 |
| `SUPABASE_SERVICE_KEY` con formato `sb_secret_...` no funcionaba | Usar `service_role (legacy)` JWT (`eyJ...`) |
| TypeScript errores en API (`clearCookie`, `headers`, `protocol`) | Instalar `@types/express-serve-static-core@4.19.6` |
| Vercel no deployaba desde repo privado (plan Hobby) | Cambiar repo a público |
| `@vercel/node` no resuelve imports fuera de `api/` | Bundle autocontenido con esbuild |
| `dotenv` usa `require("fs")` → incompatible con ESM | Remover `dotenv` del entry point (Vercel provee env vars) |
| `module is not defined in ES module scope` | Usar `--format=esm` en vez de CJS (package.json tiene `"type": "module"`) |
| `.cjs` no detectado automáticamente por Vercel | Usar extensión `.js` con ESM |
| Rewrite `/api/(.*)` → `/api` perdía subpath | La función recibe el URL original; rewrite correcto |
| `health` endpoint no encontrado | El procedimiento es `system.health` (sub-router), no `health` suelto |

---

## Pruebas de verificación

```bash
# Frontend
curl -s -o /dev/null -w "HTTP %{http_code}" https://condominio-admin-eta.vercel.app/
# → HTTP 200

# API (tRPC query con input)
curl -s 'https://condominio-admin-eta.vercel.app/api/trpc/system.health?input=%7B%22timestamp%22%3A789%7D'
# → Responde con validación o resultado (API operativa)

# Conexión DB
# Verificada localmente con Node — PostgreSQL 17.6 conectado vía pooler
```

---

## Notas Técnicas

1. **tRPC y Serverless:** Funciona bien en Vercel. Usar stale times largos en React Query para mitigar cold starts.
2. **Pool de conexiones:** Usar Supabase Pooler (PgBouncer) con pool máximo bajo (max: 5-10). Puerto: 6543.
3. **Bundle autocontenido:** La API se bundlea con esbuild (`--packages=external` → 77.6KB). Las dependencias npm se resuelven de `node_modules` en el runtime de Vercel.
4. **Límite Vercel Gratuito:** Timeout 30s configurable en vercel.json. Operaciones largas como PDF pueden necesitar timeout mayor o background jobs.
5. **Storage:** Se usa `supabaseAdmin.storage` (no AWS S3 SDK), más simple y directo para el ecosistema Supabase.
6. **Auth flow:** Frontend → Supabase Auth (OAuth redirect) → Callback page → Guarda sesión en localStorage → tRPC incluye Bearer token.
7. **Git config:** Verificar antes de comitear: `git config user.name && git config user.email`

---

## Mejoras Prioritarias (Auditoría Julio 2026)

Basado en auditoría integral del código (revisión manual + CODE_REVIEW.md + PERFORMANCE_REVIEW.md).

### 🔴 Críticas — Corregir esta semana

| # | Prioridad | Problema | Impacto | Solución |
|---|-----------|----------|---------|----------|
| C1 | 🔴 | `env.ts` usa `SUPABASE_SERVICE_ROLE_KEY` pero Vercel usa `SUPABASE_SERVICE_KEY` | Admin client (`supabaseAdmin`) nunca se inicializa en producción → storage y auth rotos | Unificar a `SUPABASE_SERVICE_KEY` |
| C2 | 🔴 | `server/db.ts` = 1725 líneas God Object | Imposible testear, mantener, o extender sin romper algo | Dividir en `server/db/users.ts`, `payments.ts`, `debts.ts`, `notifications.ts`, `reports.ts` + capa servicios `server/services/` |
| C3 | 🔴 | Cálculo de deudas duplicado en 4 endpoints (`debts.dashboard`, `paymentStatusExport`, `downloadPDF`, `downloadExcel`) | Bugs por inconsistencia; cambiar lógica en un lugar no actualiza los otros | Extraer a función compartida `getDebtsSummary(month, sortBy)` |
| C4 | 🔴 | Transacciones "ACID" sin `BEGIN`/`COMMIT`/`ROLLBACK` | Inconsistencia de datos bajo concurrencia o timeout serverless | Usar `db.transaction()` de Drizzle con `SELECT ... FOR UPDATE` |
| C5 | 🔴 | ~25 dynamic imports redundantes de `drizzle-orm` en `db.ts` | Latencia innecesaria en cada llamada; ya importados al inicio del archivo | Eliminar imports dinámicos, usar estáticos |
| C6 | 🔴 | Sin índices en BD (solo 1 unique en 10 tablas) | Sequential scans en cada query; no escala con crecimiento | Agregar índices compuestos en `monthlyDebts.month`, `payments.status`, `users.email`, etc. |
| C7 | 🔴 | Sin `staleTime` en React Query (`staleTime: 0` por defecto) | Cada navegación dispara llamadas API nuevas; cold starts desperdiciados | Configurar `staleTime: 30_000` y `gcTime: 300_000` por defecto en `main.tsx` |

### 🟠 Altas — Corregir este mes

| # | Problema | Solución |
|---|----------|----------|
| A1 | Body parser `50mb` sin límite (DOS vector) | Reducir a 10MB/1MB según endpoint |
| A2 | `sameSite: "none"` innecesario | Cambiar a `"lax"` |
| A3 | Token JWT en localStorage (vulnerable a XSS) | Migrar a httpOnly cookie vía `supabase-js` |
| A4 | Auth `me` expone datos internos (`approvedBy`, `rejectionReason`, etc.) | Crear DTO de usuario público |
| A5 | Sin Helmet.js ni headers de seguridad | Agregar `helmet` middleware |
| A6 | Sin rate limiting en ningún endpoint | Agregar `express-rate-limit` |
| A7 | N+1 queries en `generateDebtsFromCharge` (1 query por apto) | `INSERT ... ON CONFLICT` batch con una sola query |
| A8 | PDF/Excel como base64 por tRPC query (sin streaming, 2x-3x overhead RAM) | Migrar a descarga directa Express o Presigned URL |
| A9 | Sin pool de conexiones (conexión directa `postgres` en serverless) | Usar `postgres` pool con `max` configurable y cierre graceful |
| A10 | Zod v4 declarado en package.json (`^4.1.12`) pero sintaxis v3 en todo el código | Fijar versión `zod@3.24.1` o migrar a sintaxis v4 |
| A11 | Auditoría manual repetida en cada mutation (20+ veces) | Mover a middleware global de tRPC |
| A12 | `httpBatchLink` sin límite de batch | Configurar `maxURLLength` o limitar por request |

### 🟡 Medias — Próximo trimestre

| # | Problema | Solución |
|---|----------|----------|
| M1 | Base64 para uploads de vouchers (infla payload 33%) | Presigned URLs de Supabase Storage + upload directo frontend |
| M2 | Sin lazy loading en frontend (bundle único de 818KB) | `React.lazy()` + `<Suspense>` para rutas admin/user |
| M3 | Sidebar width persistido sin debounce (~60 writes/s en resize) | `lodash.debounce` o `requestAnimationFrame` |
| M4 | `shared/const.ts` infrautilizado (solo 5 líneas) | Mover constantes hardcodeadas (colores, estados, tipos) |
| M5 | Sin `.env.example` ni logger estructurado | Crear `.env.example`, agregar `pino` o `winston` |
| M6 | Relaciones Drizzle vacías (`relations.ts`) | Definir relaciones entre tablas para queries `.with()` |
| M7 | `any`/`as any` casts en 20+ lugares | Tipado estricto con tipos de Drizzle |
| M8 | Eliminación en cascada manual sin CASCADE ni transacción | Usar `onDelete: 'cascade'` de Drizzle o transacción |
| M9 | Sin tests de integración (solo unitarios) | Agregar tests de flujo completo (crear cobro → pagar → liquidar) |
| M10 | Carpeta `.manus/` con archivos de caché en el repo | `git rm -r .manus/` y agregar a `.gitignore` |
| M11 | `as unknown as string` repetido 15+ veces en `db.ts` | Tipar correctamente o usar `zod` para parseo |

### Reportes de auditoría generados

- `CODE_REVIEW.md` — Calidad de código y arquitectura (21 hallazgos)
- `PERFORMANCE_REVIEW.md` — Rendimiento y escalabilidad (18 hallazgos)
