# Revisión de Calidad de Código — condominio-admin

**Fecha:** Julio 2026  
**Scope:** Backend (Express + tRPC + Drizzle), Frontend (React + shadcn/ui), Shared.  
**Archivos analizados:** ~30 archivos clave, ~7,500 líneas de código.

---

## 🔴 PROBLEMAS CRÍTICOS

### 1. Single Responsibility Violation — `server/db.ts` (1,725 líneas)

**Problema:** Este archivo contiene TODA la lógica de acceso a datos del proyecto: queries, mutaciones, validaciones de negocio, generación de PDF/Excel, notificaciones, S3 storage, y auditoría. No hay separación de concerns.

**Archivo monolítico con responsabilidades mezcladas:**
- `getAllFloors()`, `getAllApartments()` → queries CRUD
- `approvePaymentWithValidations()` → lógica de negocio con validaciones ACID
- `notifyPaymentApproved()` → notificaciones
- `uploadPaymentVoucher()` → S3 storage
- `generateAllApartmentNames()` → lógica de naming
- `getUserPaymentsSummary()` → reportes
- `createAuditLog()` → logging

**Impacto:** Imposible testear unitariamente. Cualquier cambio en pagos puede romper storage o notificaciones. Sin aislamiento de capas.

**Solución:** Separar en:
- `server/db/users.ts`
- `server/db/payments.ts`
- `server/db/debts.ts`
- `server/db/notifications.ts`
- `server/db/reports.ts`
- `server/services/payment.service.ts` (lógica de negocio)
- `server/services/notification.service.ts`

---

### 2. Violación DRY Masiva — Código duplicado entre routers y entre endpoints

#### 2a. Duplicación de cálculo de deudas en 4 lugares

El mismo patrón de "fetch debts → calcular totales" se repite en:

1. `routers.ts` línea 430 — `debts.dashboard`:
   ```ts
   const debts = await db.getAllApartmentsWithDebtStatus(currentMonth, sortBy);
   const totalPending = apartmentsWithDebt.reduce(...)
   const totalDue = debts.reduce(...)
   ```

2. `routers.ts` línea 773 — `reports.paymentStatusExport`:
   ```ts
   const debts = await db.getAllApartmentsWithDebtStatus(month, sortBy);
   const totalPending = apartmentsWithDebt.reduce(...)
   const totalDue = debts.reduce(...)
   ```

3. `routers.ts` línea 804 — `reports.downloadPDF`:
   ```ts
   const debts = await db.getAllApartmentsWithDebtStatus(month, sortBy);
   // mismo cálculo otra vez
   ```

4. `routers.ts` línea 843 — `reports.downloadExcel`:
   ```ts
   const debts = await db.getAllApartmentsWithDebtStatus(month, sortBy);
   // mismo cálculo otra vez
   ```

#### 2b. Duplicación de transformación de datos para exports

El mapeo `debts.map(d => ({ apartmentId, apartmentName, totalDue, ... }))` se repite idéntico en `downloadPDF` y `downloadExcel`.

#### 2c. Duplicación de auditoría en cada mutation

Cada handler de mutation del admin tiene el mismo patrón:
```ts
await db.createAuditLog({ userId: ctx.user.id, action: "...", entityType: "...", details: "..." });
```

Esto debería estar en un middleware global de tRPC, no repetido manualmente.

---

### 3. Violación del Principio Abierto/Cerrado (OCP)

Cada vez que se agrega un nuevo recurso (ej. un nuevo tipo de reporte), hay que:
1. Agregar función en `db.ts`
2. Agregar endpoint en `routers.ts`
3. Agregar página en `client/src/pages/`
4. Agregar import en `App.tsx`
5. Agregar menú en `DashboardLayout.tsx`

No hay abstracciones que permitan extensiones sin modificar código existente. Los routers y handlers están fuertemente acoplados a implementaciones concretas.

---

### 4. Dynamic Imports Innecesarios — Anti-patrón de rendimiento

En `db.ts`, ~15 funciones importan dinámicamente `drizzle-orm`:

```ts
const { eq: drizzleEq } = await import('drizzle-orm');
```

**Problema:** `eq`, `and`, `desc` ya están importados al inicio del archivo (línea 1). Estas importaciones dinámicas son completamente redundantes y añaden latencia innecesaria a cada llamada.

**Líneas afectadas:** 265, 312, 390, 418, 478, 713, 726, 795, 834, 942, 1042, 1068, 1090, 1113, 1141, 1276, 1300, 1323, 1380, 1437, 1496, 1517, 1596, 1618, 1648.

---

### 5. Conexión a BD no gestionada — Sin pool ni lifecycle

`getDb()` crea una conexión `drizzle(process.env.DATABASE_URL)` perezosa pero:
- No hay pool de conexiones (`postgres` simple, no pool)
- No hay cierre graceful de conexiones
- No hay manejo de reconexión
- En serverless (Vercel), las conexiones pueden saturarse

```ts
let _db: ReturnType<typeof drizzle> | null = null;
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    _db = drizzle(process.env.DATABASE_URL);
  }
  return _db;
}
```

**Solución:** Usar `postgres` pool con `max` connections configurable y hook de cierre.

---

### 6. Zod v4 vs Sintaxis v3 — Riesgo de compatibilidad

`package.json` tiene `"zod": "^4.1.12"` pero todo el código usa sintaxis Zod v3:
```ts
import { z } from "zod";
z.object({...})  // API v3
z.enum([...])    // API v3
```

Zod v4 cambió significativamente la API (`z.object` → `z.struct`, etc.). Esto compilaría/ejecutaría con errores en producción si el lockfile resuelve v4.

---

### 7. Tipado Débil — `as any` y `any` dispersos

- `(floorResult as any).insertId` (db.ts:194) — ignora el sistema de tipos de Drizzle
- `const updateSet: Record<string, unknown> = {}` (db.ts:48) — evita tipos concretos
- `const data: any = { status, reviewedAt, ... }` (db.ts:348) — `any` explícito
- `"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"` casteado con `as any` en `exports.ts`
- `parseFloat(debt.totalDue as unknown as string)` — patrón repetido 15+ veces

---

## 🟡 PROBLEMAS MODERADOS

### 8. Transacciones ACID Falsas — Sin transacciones reales

`approvePaymentWithValidations()` se promociona como "ACID validations" pero **no usa transacciones de base de datos**. Si falla la liquidación, hace un "rollback manual" actualizando el pago a `pending`, pero esto no es atómico:

```ts
// No hay BEGIN TRANSACTION / COMMIT / ROLLBACK
await db.update(payments).set({ status: "approved", ... });
const liquidationResult = await applyPaymentToDebts(...);
if (!liquidationResult.success) {
  // "Rollback" manual — no es atómico
  await db.update(payments).set({ status: "pending", ... });
}
```

Entre la línea 978 (set approved) y la línea 985 (set pending), otra petición podría ver el pago como "approved" inconsistentemente.

**Solución:** Usar `db.transaction()` de Drizzle o SQL raw con `BEGIN`/`COMMIT`.

---

### 9. Manejo de Errores Inconsistente

Mezcla de estilos: TRPCError, HttpError (shared), console.error, throw new Error, returns null.

- `db.ts` funciones retornan `null` en error, otras retornan `undefined`, otras `[]`
- El `HttpError` de `shared/_core/errors.ts` **nunca se usa** en todo el código del servidor
- Errores con `console.error` y `console.warn` mezclados sin logger estructurado
- Funciones como `getUserByEmail()` retornan `undefined`, mientras `getUserByOpenId()` retorna `undefined`, pero `getPaymentById()` retorna `null`

---

### 10. Drizzle Relations Incompleto — No se usan relaciones

`drizzle/relations.ts` está vacío:
```ts
import {} from "./schema";
```

No se definen relaciones entre tablas, lo que descarta queries joins declarativas de Drizzle (`.with()`). En su lugar, se hacen joins manuales en cada query con select explícito de columnas.

---

### 11. N+1 Queries en Generación de Deudas

`generateDebtsFromCharge()` hace un query **por cada apartamento** dentro de un loop:

```ts
for (const apt of allApartments) {
  const existingDebt = await db.select().from(monthlyDebts)... // 1 query por apartamento
  // update o insert individual
}
```

Con 30 apartamentos, son 30+ queries. Debería ser un solo `INSERT ... ON CONFLICT` batch.

---

### 12. Sin Repositorios ni Servicios — Lógica de negocio en capa de datos

No hay capa de servicios. La lógica de negocio (conversión de moneda, validación de pagos, liquidación de deudas) está dentro de las funciones de BD en `db.ts`. Esto rompe la separación entre dominio e infraestructura.

---

### 13. Sidebar Width Persistida en localStorage — Sin debounce

`DashboardLayout.tsx` guarda `sidebarWidth` en `localStorage` en cada render del efecto:
```ts
useEffect(() => {
  localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
}, [sidebarWidth]);
```

Durante el resize continuo, escribe en localStorage en cada frame (~60 writes/seg). Debería tener debounce o guardar solo al soltar el mouse.

---

### 14. Base64 para Uploads — Sin streaming

Los comprobantes de pago se manejan como Base64 en las APIs y en BD (`voucherImage: text`). Esto duplica el tamaño de los archivos y no escala. El campo `voucherImage` está marcado como `DEPRECATED` en el schema pero sigue siendo el mecanismo principal en el frontend.

---

### 15. Sin Rate Limiting ni Protección de API

No hay rate limiting, throttling, ni protección contra abusos en los endpoints tRPC. Un atacante podría:
- Crear miles de pagos
- Intentar brute force de endpoints admin
- Subir archivos masivos (el body parser acepta 50MB)

---

## 🟢 PROBLEMAS MENORES

### 16. Nombres de Archivos Inconsistentes

- Mezcla de PascalCase (`DashboardLayout.tsx`), camelCase (`useAuth.ts`), kebab-case (ninguno) 
- Componentes UI de shadcn en `/components/ui/` — correcto
- Pero las pages no siguen convención: `PaymentReview.tsx`, `UserRequests.tsx`

### 17. `shared/const.ts` Infrautilizado

Solo 5 líneas. Constantes como `NOT_ADMIN_ERR_MSG` y `UNAUTHED_ERR_MSG` están definidas aquí pero los colores, estados de pago, tipos de notificación, etc., están hardcodeados en toda la app.

### 18. Comentarios en Español mezclados con Código

Mantener comments en español es válido pero hay inconsistencia. Algunos comments están en inglés (`// DEPRECATED`, `// Verify user is active`), otros en español.

### 19. Sin Tests de Integración

Hay tests unitarios (`phase1.validations.test.ts`, etc.) pero ningún test de integración que verifique el flujo completo (crear cobro → generar deuda → pagar → liquidar).

### 20. Carpeta `.manus/` en Repo

`.manus/db/db-query-*.json` — archivos de caché/queries de una sesión anterior, probablemente no deberían estar en el repo.

### 21. Sin Dockerfile ni docker-compose.yml

No hay manera estandarizada de levantar el entorno. Las variables de entorno no están documentadas en un `.env.example`.

---

## 📊 MÉTRICAS DE CALIDAD

| Métrica | Valor | Evaluación |
|---------|-------|------------|
| Archivos TS/TSX | ~60 (app) | Moderado |
| server/db.ts | 1,725 líneas | 🔴 Excesivo |
| server/routers.ts | 884 líneas | 🔴 Excesivo |
| Funciones > 50 líneas en db.ts | 12+ | 🔴 Alta |
| `any` casts explícitos | 20+ en db.ts sola | 🟡 Moderado |
| `as unknown as string` casts | 15+ | 🟡 Code smell |
| Dynamic imports redundantes | ~25 | 🔴 Anti-patrón |
| Archivos > 200 líneas | 10+ | 🟡 Alta densidad |
| Tests unitarios | Sí (varios .test.ts) | 🟢 Bien |
| Test de integración | No | 🟡 Ausente |
| Logger estructurado | No (console.log) | 🟡 Ausente |

---

## 📋 RECOMENDACIONES PRIORIZADAS

### Inmediatas (bloqueantes)
1. ✅ Separar `db.ts` en módulos por dominio (usuarios, pagos, deudas, notificaciones, reportes)
2. ✅ Eliminar dynamic imports redundantes de `drizzle-orm`
3. ✅ Migrar a transacciones reales ACID en `approvePaymentWithValidations`
4. ✅ Usar pool de conexiones postgres en lugar de conexión simple
5. ✅ Fijar versión de Zod (v3) o migrar a sintaxis v4

### Corto plazo
6. Refactorizar la duplicación de cálculos en `routers.ts` a funciones compartidas
7. Crear capa de servicios (`server/services/`) para lógica de negocio
8. Mover auditoría a middleware global de tRPC
9. Agregar `drizzle/relations.ts` con relaciones entre tablas
10. Reemplazar N+1 queries en `generateDebtsFromCharge` con batch operations

### Mediano plazo
11. Agregar rate limiting (express-rate-limit)
12. Implementar upload de archivos vía streaming en lugar de Base64
13. Debounce en escritura de localStorage del sidebar
14. Agregar tests de integración
15. Documentar variables de entorno (`.env.example`)

---

## 🔍 DIAGNÓSTICO DE PRINCIPIOS SOLID

| Principio | Estado | Hallazgo |
|-----------|--------|----------|
| **S** — Single Responsibility | 🔴 VIOLADO | db.ts (1,725 líneas) — datos, negocio, notificaciones, storage, naming |
| **O** — Open/Closed | 🔴 VIOLADO | Sin abstracciones; cada nuevo recurso requiere modificar múltiples archivos |
| **L** — Liskov Substitution | 🟢 OK | TypeScript estricto, subtipos bien definidos |
| **I** — Interface Segregation | 🟡 PARCIAL | Interfaces de Drizzle limpias, pero `UpdateUser` toma `Partial<typeof users.$inferInsert>` muy amplio |
| **D** — Dependency Inversion | 🔴 VIOLADO | Routers dependen directamente de `db.*` funciones, no de interfaces abstractas |

---

**Conclusión:** El proyecto tiene una arquitectura funcional pero con alta deuda técnica. El mayor problema es la concentración de responsabilidades en `db.ts` (violación SRP + DRY + DIP). La falta de transacciones reales, el tipado laxo con `any`, y los dynamic imports redundantes son arreglos rápidos de alto impacto. Se recomienda una refactorización por capas (controller → service → repository) antes de agregar nuevas features.
