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

## Plan de Acción Sugerido (Auditoría Julio 2026)

Basado en auditoría integral: revisión manual + CODE_REVIEW.md (calidad) + PERFORMANCE_REVIEW.md (rendimiento) + SECURITY_REVIEW.md (seguridad). 55 hallazgos consolidados en 30 acciones priorizadas.

# Fase 1 — Críticas (7/7 Completadas ✅)

1. ✅ **CR-01** — Unificar `SUPABASE_SERVICE_ROLE_KEY` → `SUPABASE_SERVICE_KEY` (5 min)
2. ✅ **CR-02** — CSRF: `sameSite: "lax"` + eliminar `urlencoded` (5 min)
3. ✅ **CR-03** — Storage path traversal sanitization (15 min)
4. ✅ **CR-04** — Pin Zod `^3.24.1` (2 min)
5. ✅ **CR-05** — Eliminar 7 dynamic imports de `drizzle-orm` (15 min)
6. ✅ **CR-06** — `staleTime: 30_000` + `gcTime: 300_000` en React Query + fix Auth header (5 min)
7. ✅ **CR-07** — 9 índices compuestos en BD (30 min)

# Fase 2 — Altas (🟠)

| # | Tarea | Esfuerzo | Reporte | Personalidad |
|---|-------|----------|---------|-------------|
| 8 | **AL-01 — IDOR payments.byApartment**: Validar `ctx.user.role === "admin" \|\| ctx.user.apartmentId === input.apartmentId` | 10 min | Seguridad | 🛡️ security |
| 9 | **AL-02 — Reducir body parser**: Bajar `limit: "50mb"` a `"10mb"` o `"1mb"` según endpoint | 5 min | Seguridad | 🛡️ security |
| 10 | **AL-03 — Helmet + rate limiting**: Agregar `helmet` y `express-rate-limit` al servidor Express | 30 min | Seguridad | 🛡️ security |
| 11 | **AL-04 — ErrorBoundary sin stack en prod**: Solo mostrar stack trace en `NODE_ENV=development` | 5 min | Seguridad | 🛡️ security |
| 12 | **AL-05 — Auth me DTO público**: No exponer `approvedBy`, `rejectionReason`, `openId` en `auth.me` | 15 min | Seguridad | 🏗️ architect |
| 13 | **AL-06 — Transacciones ACID reales**: Usar `db.transaction()` con `SELECT ... FOR UPDATE` en `approvePaymentWithValidations` | 1h | Rendimiento | 🗄️ DBA |
| 14 | **AL-07 — N+1 queries batch**: Reemplazar loop por `INSERT ... ON CONFLICT` en `generateDebtsFromCharge` | 1h | Rendimiento | 🗄️ DBA |
| 15 | **AL-08 — Pool de conexiones**: Usar `postgres` pool con `max: 5-10` en vez de conexión directa | 30 min | Rendimiento | 🔧 devops |
| 16 | **AL-09 — Eliminar duplicación de cálculos**: Extraer `getDebtsSummary(month, sortBy)` compartida para 4 endpoints | 2h | Calidad | 🔧 refactoring |
| 17 | **AL-10 — Auditoría a middleware tRPC**: Mover `createAuditLog` a middleware global | 1h | Calidad | 🏗️ architect |
| 18 | **AL-11 — httpBatchLink limit**: Configurar `maxURLLength` en tRPC client | 10 min | Calidad | 🔧 refactoring |

# Fase 3 — Medias y Bajas (🟡 🔵)

| # | Tarea | Esfuerzo | Reporte | Personalidad |
|---|-------|----------|---------|-------------|
| 19 | **ME-01 — Presigned URLs para uploads**: Migrar de base64 a upload directo a Supabase Storage | 2-3h | Calidad | 🏗️ architect |
| 20 | **ME-02 — Lazy loading frontend**: `React.lazy()` + `<Suspense>` para rutas admin/user | 1h | Rendimiento | 🏗️ architect |
| 21 | **ME-03 — Helmet CSP configurado**: CSP restringido para prevenir XSS | 30 min | Seguridad | 🛡️ security |
| 22 | **ME-04 — Token JWT a httpOnly cookie**: Migrar de localStorage a cookie segura | 2h | Seguridad | 🛡️ security |
| 23 | **ME-05 — Refactor db.ts en módulos**: Separar God Object 1725 líneas en `db/users.ts`, `db/payments.ts`, `db/debts.ts`, etc. | 4-6h | Calidad | 🔧 refactoring |
| 24 | **ME-06 — Sidebar debounce**: Evitar ~60 writes/s a localStorage en resize | 15 min | Calidad | 🔧 refactoring |
| 25 | **ME-07 — Drizzle relations**: Completar `relations.ts` con relaciones entre tablas | 30 min | Calidad | 🏗️ architect |
| 26 | **ME-08 — Tests de integración**: Flujo completo: cobro → deuda → pago → liquidación | 3h | Calidad | 🏗️ architect |
| 27 | **BA-01 — Limpiar `.manus/`**: `git rm -r .manus/` y agregar a `.gitignore` | 5 min | Calidad | 🔧 refactoring |
| 28 | **BA-02 — `.env.example`**: Documentar todas las variables de entorno | 15 min | Calidad | 🔧 refactoring |
| 29 | **BA-03 — Logger estructurado**: Agregar `pino` o `winston` en vez de `console.log/warn/error` | 30 min | Calidad | 🔧 refactoring |
| 30 | **BA-04 — Eliminar `@ts-ignore` y `as any`**: Tipado estricto con tipos Drizzle | 2h | Calidad | 🔧 refactoring |

### Reportes de auditoría generados

| Archivo | Enfoque | Hallazgos |
|---------|---------|-----------|
| `CODE_REVIEW.md` | Calidad de código y arquitectura | 21 hallazgos (7 críticos, 8 medios, 6 menores) |
| `PERFORMANCE_REVIEW.md` | Rendimiento y escalabilidad | 18 hallazgos (4 críticos, 6 altos, 5 medios, 3 bajos) |
| `SECURITY_REVIEW.md` | Seguridad (OWASP) | 16 hallazgos (2 críticos, 3 altos, 4 medios, 3 bajos, 4 informativos) |

---

## Registro de Residentes + Login Fix (Agosto 2026)

### Funcionalidades Implementadas

| Tarea | Commit | Detalle |
|-------|--------|---------|
| Registro abierto (`/register`) | `b9d6aee` | Formulario público: email + password + nombre. SignUp vía Supabase Auth. Cuenta crea con `approvalStatus: pending`. |
| Fix SPA routing (`/register`) | `e304807` | `useRoute` de wouter en App.tsx (window.location.pathname no era reactivo). |
| Fix login bug (doble causa) | `5dc2379` | (1) `getSupabaseAccessToken()` leía `parsed[0]` pero supabase-js v2.110 guarda `{access_token}` → fix dual; (2) fetch directo con `session.access_token` sin `?batch=1` (batch envolvía respuesta en array → `body?.result` = undefined). |
| Desactivar confirmación email | Management API | `mailer_autoconfirm: true` en Supabase — registros no requieren verificación de correo. |
| Admin-residente (menú dinámico) | `b9d6aee` | Si admin tiene `apartmentId`, el menú agrega items de residente (`/mi-apartamento`). |
| Selector apartamento en registro | `69d2351` | Desplegable con 30 apartamentos (PB-A…4-F) via `apartments.listPublic` (público). |
| Usuarios nuevos INACTIVOS | `3b4d8df` | `createUserFromSupabase`: `isActive: false` por defecto. Gate de login solo verifica `isActive`. |
| Fix mensaje login inactivo | `e5bd901` | Login.tsx verifica `!me.isActive` (no `approvalStatus`). Mensaje específico para cuentas pendientes. |

### Flujo de Registro + Activación

```
Residente → /register → crea cuenta (isActive: false)
  → puede hacer login → ve "pendiente de activación"
Admin → Gestión de Usuarios → candado cerrado → clic para activar
  → residente hace login → entra al dashboard
```

### Archivos Modificados (Sesión Agosto 2026)

- `client/src/pages/Register.tsx` — Formulario con desplegable de apartamento
- `client/src/pages/Login.tsx` — Verifica `isActive`, mensajes específicos
- `client/src/App.tsx` — Ruta `/register` pública, menú admin-residente
- `client/src/components/DashboardLayout.tsx` — Menú dinámico según apartmentId
- `server/_core/context.ts` — Gate solo `isActive`, lee apartmentId del metadata
- `server/routers.ts` — Endpoint `apartments.listPublic` (público)
- `server/db/users.ts` — `createUserFromSupabase` acepta `apartmentId`, `isActive: false`

### Estado BD (Post-sesión)

- 30 apartamentos: PB-A…4-F, deuda $40.02 pendiente (apto 001: $31.02)
- Usuarios: admin (id=1), 2 residentes de prueba (id=2,3), QA bug (id=4), Beatriz (id=6, inactivo)
- Supabase: signUp habilitado, `mailer_autoconfirm: true`, email confirmation desactivada
