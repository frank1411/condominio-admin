# Revisión de Rendimiento y Escalabilidad — condominio-admin

**Fecha:** 2026-07-27  
**Proyecto:** condominio-admin (Express + tRPC + React + Supabase en Vercel Serverless)  
**Archivo generado por:** Hermes Agent — revisión automatizada de código fuente

---

## Resumen Ejecutivo

Se identificaron **18 hallazgos** categorizados por severidad:

| Severidad | Cantidad |
|-----------|----------|
| 🔴 Crítico | 4 |
| 🟡 Alto | 6 |
| 🟠 Medio | 5 |
| 🔵 Bajo | 3 |

---

## 🔴 CRÍTICO

### C1. Sin índices en la base de datos

**Archivo:** `drizzle/schema.ts` (227 líneas, 10 tablas)

**Problema:** Ninguna tabla tiene índices definidos — ni `INDEX`, ni `UNIQUE` (excepto `users.openId`), ni claves foráneas reales. Las 3 queries principales que escanean tablas completas:

- `getDebtsByMonth(month)` — filtro por `monthlyDebts.month` (varchar) **sin índice**
- `getPaymentsByStatus(status)` — filtro por `payments.status` **sin índice**
- `getAllApartmentsWithDebtStatus(month)` — JOIN entre `monthlyDebts` y `apartments` por `apartmentId` **sin índices en ninguna columna FK**
- `getUserByEmail`, `getUserByOpenId`, `getUserById` — columnas de búsqueda frecuente sin índices

Con ~30 apartamentos y ~12 meses de datos (~360 filas en `monthlyDebts`), el problema no se nota ahora. Con **300+ apartamentos y 3+ años** de datos (~10,800 filas), cada consulta hará sequential scans.

**Impacto:** Escalabilidad lineal → colapsa con crecimiento moderado.

**Recomendación:** Agregar índices compuestos en Drizzle:
```ts
// En drizzle/schema.ts, por tabla:
export const monthlyDebts = pgTable("monthlyDebts", {
  // ... columnas
}, (table) => ({
  monthIdx: index("monthly_debts_month_idx").on(table.month),
  apartmentMonthIdx: index("monthly_debts_apt_month_idx").on(table.apartmentId, table.month),
  paidIdx: index("monthly_debts_paid_idx").on(table.isPaid),
  fkChargeIdx: index("monthly_debts_charge_idx").on(table.chargeId),
}));

export const payments = pgTable("payments", { ... }, (table) => ({
  statusIdx: index("payments_status_idx").on(table.status),
  apartmentMonthIdx: index("payments_apt_month_idx").on(table.apartmentId, table.month),
  userIdIdx: index("payments_user_idx").on(table.userId),
}));

export const users = pgTable("users", { ... }, (table) => ({
  emailIdx: index("users_email_idx").on(table.email),
  roleIdx: index("users_role_idx").on(table.role),
  approvalIdx: index("users_approval_idx").on(table.approvalStatus),
}));

export const notifications = pgTable("notifications", { ... }, (table) => ({
  userReadIdx: index("notif_user_read_idx").on(table.userId, table.isRead),
}));
```

---

### C2. Sin `staleTime` en React Query — cada visita = nueva llamada API

**Archivo:** `client/src/main.tsx`

```tsx
const queryClient = new QueryClient();
// Sin defaultOptions — staleTime por defecto = 0
```

**Problema:** React Query por defecto tiene `staleTime: 0`, lo que significa que **cada vez que un componente se monta** (navegación, cambio de pestaña, refocus), se hace una solicitud HTTP nueva. Con `httpBatchLink` las llamadas se agrupan, pero igual viajan a Vercel Serverless cada vez.

**Impacto:** Cada página del dashboard hace 2-3 queries. Cada navegación entre pestañas `admin/*` dispara ~4 queries. Sin cache efectiva, se desperdician cold starts.

**Recomendación:**
```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,    // 30s — datos del dashboard raramente cambian
      gcTime: 5 * 60_000,   // 5min en cache aunque el componente se desmonte
      refetchOnWindowFocus: false, // opcional, según necesidad
    },
  },
});
```

Para `trpc.config.get.useQuery()` que se llama desde **5 componentes diferentes** con datos casi estáticos, se puede pasar `staleTime: Infinity` directamente en el componente.

---

### C3. Payloads grandes de PDF/Excel en base64 a través de tRPC query

**Archivo:** `server/routers.ts` (líneas 804-880), `server/exports.ts`

**Problema:** `downloadPDF` y `downloadExcel` son **queries de tRPC** que:
1. Generan el PDF/Excel completo en memoria (Buffer)
2. Convierten a base64
3. Envían como string en la respuesta JSON de tRPC
4. El cliente decodifica en JS (`atob → Uint8Array → Blob → URL`)

Esto significa que un PDF de 200KB se serializa a ~270KB de base64 + overhead de JSON + el payload completo viaja dentro del body de la respuesta HTTP como JSON. Además no usa streaming — **todo se construye en RAM del lado serverless**.

**Impacto:** Memory overhead 2x-3x en el serverless, latencia de serialización/deserialización, timeout en 30s de Vercel para PDFs grandes.

**Recomendación (3 opciones de mejor a peor):**
1. **(Mejor)** Servir PDF/Excel como descarga directa desde una ruta Express separada (no tRPC) con `Content-Disposition: attachment` y pipe del stream
2. Usar `Response` de tRPC con `response.headers` para setear Content-Type y enviar raw binary
3. Usar Pre-signed URLs de S3: generar el PDF, subirlo a S3, devolver la URL

---

### C4. Sin transacciones ACID reales en operaciones críticas

**Archivo:** `server/db.ts` — `approvePaymentWithValidations`, `generateDebtsFromCharge`, `applyPaymentToDebts`

**Problema:** Aunque se llama "ACID", ninguna operación usa transacciones SQL reales. El patrón actual:
```
1. SELECT payment (sin lock)
2. UPDATE payment status → "approved"
3. SELECT debts
4. UPDATE debts (una por una)
5. INSERT audit log
```

Si falla entre el paso 2 y 4, el pago queda como "approved" pero las deudas no se actualizan. Tampoco hay `SELECT ... FOR UPDATE` para evitar race conditions.

**Impacto:** Inconsistencias de datos bajo concurrencia (2 admins aprobando simultáneamente). En serverless, las funciones pueden matarse a los 30s, dejando datos inconsistentes.

**Recomendación:**
```ts
// Usar drizzle transaction con Postgres savepoints
await db.transaction(async (tx) => {
  const payment = await tx.select().from(payments)
    .where(eq(payments.id, paymentId))
    .forUpdate() // lock fila
    .limit(1);
  // ... operaciones dentro de la misma transacción
  await tx.update(payments)...;
  await tx.update(monthlyDebts)...;
  await tx.insert(auditLog)...;
});
```

---

## 🟡 ALTO

### H1. Sin pool de conexiones — lazy connection por request

**Archivo:** `server/db.ts` (líneas 19-31), `server/_core/env.ts`

```ts
let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) { ... }
  }
  return _db;
}
```

**Problema:** `postgres` (driver) crea UNA conexión TCP por instancia. En serverless de Vercel, cada cold start crea una nueva conexión a Supabase Postgres. Además, no hay límite de pool, ni lazy disconnect, ni reconexión automática. La conexión se mantiene viva hasta que la Lambda muere.

Para Supabase Postgres, cada conexión usa slots de conexión (típicamente limitados a 15-60 según plan). Con múltiples cold starts simultáneos, se pueden agotar los slots.

**Recomendación:** Configurar pool con `@neondatabase/serverless` o `pg-pool` con límite y timeouts:
```ts
import { Pool } from "@neondatabase/serverless"; // o pg-pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
export async function getDb() {
  if (!_db) _db = drizzle(pool);
  return _db;
}
```

---

### H2. N+1 Query en `generateDebtsFromCharge` y `generateAllApartmentNames`

**Archivo:** `server/db.ts`

**`generateDebtsFromCharge` (líneas 662-699)** — cuando un cargo es global:
```ts
const allApartments = await db.select().from(apartments);  // 1 query
for (const apt of allApartments) {
  const existingDebt = await db.select()...  // 1 query POR apartamento
  // ...
  await db.update()... o db.insert()...       // 1 write POR apartamento
}
// Para N=30 apartamentos → 1 + 30 + 30 = 61 queries
```

**`generateAllApartmentNames` (líneas 543-573):**
```ts
const allApartments = await getAllApartments(); // 1 query
for (const apartment of allApartments) {
  // find en memoria (bien)
  await db.update(apartments)...; // 1 update POR apartamento
}
// Para N=30 → 1 + 30 = 31 queries cuando podría ser 1 bulk UPDATE
```

**Recomendación:** Usar batch updates de Drizzle o queries masivas:
```ts
// En generateAllApartmentNames:
const updates = allApartments.map(apt => ({
  id: apt.id,
  unitName: generateApartmentName(...),
}));
// Usar SQL raw batch o drizzle batch API
await Promise.all(updates.map(u => 
  db.update(apartments).set({ unitName: u.unitName }).where(eq(apartments.id, u.id))
));
// Mejor aún: usar UPDATE ... FROM con JOIN si el driver lo soporta
```

Para `generateDebtsFromCharge`, usar batch INSERT/UPDATE:
```ts
const debtsToUpsert = allApartments.map(apt => ({
  apartmentId: apt.id,
  chargeId,
  month,
  totalDue: chargeAmount.toString(),
  pendingAmount: chargeAmount.toString(),
  isPaid: false,
}));
await db.insert(monthlyDebts).values(debtsToUpsert)
  .onConflictDoUpdate({ ... });
```

---

### H3. Eliminación en cascada manual (sin CASCADE de BD)

**Archivo:** `server/db.ts` — `deleteCharge` (línea 245)
```ts
export async function deleteCharge(id: number) {
  const db = await getDb();
  // Eliminar todas las deudas generadas por este cobro
  await db.delete(monthlyDebts).where(eq(monthlyDebts.chargeId, id));
  // Marcar el cobro como inactivo
  return await db.update(charges).set({ isActive: false }).where(eq(charges.id, id));
}
```

**Problema:** La eliminación de deudas asociadas se hace como query separada y no como CASCADE a nivel BD ni dentro de una transacción. Si falla la segunda query, las deudas quedan huérfanas.

**Impacto:** Inconsistencias de datos y trabajo extra para la aplicación.

---

### H4. Tiempo máximo de ejecución Vercel (30s) sin configuración de timeout

**Archivo:** `vercel.json`

**Problema:** Vercel Serverless Functions tienen timeout default de 10s (Hobby) o 30s configurado. `generatePDF` y `generateExcel` pueden exceder este límite si hay muchos apartamentos (p.ej., 200+). Al ser queries de tRPC que devuelven base64, el tiempo de serialización + generación compite con el límite.

**Recomendación:**
- Configurar `maxDuration: 60` en vercel.json para funciones pesadas
- Mover exportaciones a endpoints HTTP directos (no tRPC) con streaming
- Agregar un límite de apartamentos por exportación con paginación

---

### H5. `getDb()` evalúa `process.env` en cada llamada (lectura redundante de ENV)

**Archivo:** `server/db.ts`

Cada una de las ~45 funciones exportadas llama a `getDb()` al inicio. `getDb()` lee `process.env.DATABASE_URL` cada vez (aunque sea un singleton). No es un problema de performance, pero la estructura obliga a poner guard `if (!db) return ...` en **cada función**, duplicando lógica 45 veces.

**Recomendación:** Centralizar en un módulo `server/_core/database.ts` que exponga un `db` inicializado al módulo, con manejo centralizado de errores y reconexión.

---

### H6. `httpBatchLink` sin path grouping — cada request lleva el batch entero

**Archivo:** `client/src/main.tsx`

**Problema:** `httpBatchLink` agrupa queries en una sola petición HTTP, pero si se hacen muchas queries independientes (p.ej., `config.get` y `apartments.list` y `charges.list`), el link envía todas en un POST al mismo endpoint. Esto es correcto para batching, pero el link actual **no tiene configurado maxBatchSize**. El default es `Infinity`, lo que puede enviar batches enormes en páginas complejas.

**Recomendación:**
```tsx
httpBatchLink({
  url: "/api/trpc",
  maxBatchSize: 6, // Limitar a 6 queries por petición HTTP
  // ...
})
```

---

## 🟠 MEDIO

### M1. Sin lazy loading de rutas (React) — bundle de 818 KB en un solo chunk

**Archivo:** `client/src/App.tsx`, `dist/public/assets/index-RATP2J0L.js` (818 KB)

**Problema:** Todas las páginas (admin dashboard, user dashboard, payments, charges, users, config, etc.) se importan estáticamente en App.tsx y se empaquetan en **un solo chunk JS de 818 KB**. Esto incluye `recharts`, `framer-motion`, `lucide-react`, `react-day-picker`, `cmdk`, `vaul`, etc. en el bundle crítico.

Para una app de condominio donde los usuarios frecuentemente solo ven 1-2 páginas, ~600 KB de JS son innecesarios en el primer paint.

**Recomendación:** Usar `React.lazy()` + `Suspense`:
```tsx
const AdminDashboard = lazy(() => import("@/pages/admin/Dashboard"));
const UserDashboard = lazy(() => import("@/pages/user/Dashboard"));
const AdminUsers = lazy(() => import("@/pages/admin/Users"));
// ...
```

Y agregar `manualChunks` en Vite:
```ts
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react': ['react', 'react-dom'],
        'vendor-charts': ['recharts'],
        'vendor-anim': ['framer-motion'],
        'vendor-ui': ['lucide-react', 'react-day-picker'],
      },
    },
  },
}
```

---

### M2. `config.get.useQuery()` llamado desde 5 componentes sin compartir estado

Cada dashboard/página independiente llama `trpc.config.get.useQuery()`. Aunque httpBatchLink lo agrupa, cada montaje del componente causa una re-validación si `staleTime` no está configurado. La configuración del condominio es **esencialmente estática** (cambia una vez al mes como máximo).

**Recomendación:**
```tsx
// En cada componente que use config:
const { data: config } = trpc.config.get.useQuery(undefined, {
  staleTime: 5 * 60_000, // 5 minutos
});
// O mejor aún: usar context/provider que cachee config
```

---

### M3. Generación de ejemplos de patrón no memoizada

**Archivo:** `server/db.ts`, función `generatePatternExamples` (línea 522)

Se generan ejemplos en cada llamada a `config.getPatternExamples`. Para un condominio de 5 pisos × 6 aptos, son 15 ejemplos. Pero no hay caché ni memoización — cada tipeo en el input de patrón (si hay onChange) dispara una query.

**Recomendación:** Cachear en el cliente con `keepPreviousData` o implementar debounce en el input antes de llamar a la query.

---

### M4. Conversión repetida de `parseFloat` en cálculos de resumen

En `routers.ts`, los endpoints `dashboard`, `exportJSON`, `downloadPDF`, `downloadExcel`, y `paymentStatusExport` hacen el mismo patrón de cálculo de totales. Este código se repite 5 veces con la misma lógica:
```ts
const totalApartments = debts.length;
const apartmentsWithDebt = debts.filter(d => !d.isPaid);
const totalPending = apartmentsWithDebt.reduce((sum, d) => sum + parseFloat(d.pendingAmount), 0);
const totalDue = debts.reduce((sum, d) => sum + parseFloat(d.totalDue), 0);
```

**Recomendación:** Extraer a una función compartida `computeDebtSummary(debts)` en un módulo aparte.

---

### M5. `createCharge` usa búsqueda por nombre para obtener el ID del cargo creado

**Archivo:** `server/db.ts` — `createCharge` (línea 231)
```ts
await db.insert(charges).values(data);
const created = await db.select().from(charges)
  .where(eq(charges.name, data.name || ''))
  .orderBy(desc(charges.createdAt)).limit(1);
```

**Problema:** Buscar el cargo recién creado por nombre es frágil (duplicados, colisiones). `drizzle-orm` soporta `.returning()` en Postgres.

**Recomendación:**
```ts
const [created] = await db.insert(charges).values(data).returning();
return created;
```

---

## 🔵 BAJO

### B1. Import dinámico innecesario de `drizzle-orm` en tiempo de ejecución

Múltiples funciones en `db.ts` hacen:
```ts
const { eq: drizzleEq, and } = await import('drizzle-orm');
```

Esto es un import dinámico que añade latencia a cada handler. El módulo `drizzle-orm` debería importarse estáticamente al inicio del archivo (ya hay un import estático en la línea 1).

**Recomendación:** Eliminar todos los `await import('drizzle-orm')` internos — las importaciones de línea 1 ya cubren todas las funciones necesarias.

---

### B2. Subida de voucher como base64 en lugar de multipart/form-data

**Archivo:** `server/_core/index.ts` (body parser 50MB), `client/src/main.tsx.txt`

Los vouchers se envían como base64 en el body de JSON. Un archivo de 5MB se convierte en ~6.7MB de base64 + 2x en RAM para decodificar (cliente: base64 → server: Buffer.from base64). Además el body parser tiene `limit: "50mb"`, aceptando payloads enormes.

**Recomendación:** Usar `multipart/form-data` con `busboy` o `multer` para subida de archivos directamente a Supabase Storage, reduciendo la carga en el serverless.

---

### B3. `getPendingPayments` reporta `total: data.length` en lugar del conteo real

**Archivo:** `server/db.ts` línea 337
```ts
return { data, total: data.length };
```

`total` siempre es igual a `limit` (20 por defecto) cuando hay suficientes datos, no el conteo real en BD. Para paginación correcta se necesita `COUNT(*)` aparte.

**Recomendación:** Agregar un `SELECT COUNT(*)` separado (o usar window functions como `COUNT(*) OVER()`).

---

## 📊 Métricas Clave

| Métrica | Valor | Evaluación |
|---------|-------|------------|
| Bundle JS cliente | **818 KB** (single chunk) | 🔴 Muy grande, sin code-splitting |
| Bundle serverless (api/index.js) | **78 KB** | 🟢 Aceptable |
| Bundle server (dist/index.js) | **82 KB** | 🟢 Aceptable |
| Bundle CSS | **120 KB** | 🟠 Moderado |
| Líneas db.ts | **1725** | 🟠 Archivo monolítico, difícil de mantener |
| Queries por `generateDebtsFromCharge` (30 aptos) | **61 queries** | 🔴 N+1 severo |
| Llamadas a `config.get.useQuery` | **5 componentes** | 🟡 Sin staleTime, duplicadas |
| Índices en BD | **1** (unique en openId) | 🔴 Prácticamente sin índices |
| Transacciones BD | **0** | 🔴 Riesgo de inconsistencia |
| Pool de conexiones | **No** | 🟡 Conexión directa por instancia |
| Lazy loading | **No** | 🟠 Todo en un chunk |

---

## Prioridad de Acción

1. **Inmediata (semana 1):**
   - Agregar índices a la BD (C1)
   - Configurar `staleTime` en React Query (C2)
   - Eliminar imports dinámicos de `drizzle-orm` (B1)

2. **Corta (semana 2):**
   - Implementar transacciones ACID reales en `approvePaymentWithValidations` (C4)
   - Refactorizar PDF/Excel a streaming/download directo (C3)
   - Agregar pool de conexiones (H1)

3. **Media (semana 3-4):**
   - Refactorizar N+1 en `generateDebtsFromCharge` (H2)
   - Implementar lazy loading + code splitting (M1)
   - Reemplazar base64 por multipart upload (B2)

4. **Larga (mes 2):**
   - Refactorizar db.ts en módulos separados
   - Agregar CASCADE y constraints a nivel BD
   - Implementar caché con Edge Config de Vercel para datos casi-estáticos

---

*Revisión generada automáticamente mediante análisis de código fuente. Los hallazgos se basan en el código estático; se recomienda verificar con profiling real (Vercel Analytics, Supabase Query Performance) para confirmar impactos.*
