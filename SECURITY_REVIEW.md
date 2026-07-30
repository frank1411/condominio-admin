# Revisión de Seguridad — condominio-admin

**Fecha:** 2026-07-27  
**Alcance:** Full-stack app Express + tRPC + React + Supabase  
**Metodología:** Revisión manual de código fuente (OWASP Top 10 + checklist ampliado)

---

## Resumen de Hallazgos

| Severidad | Cantidad |
|-----------|----------|
| 🔴 **Crítico** | 2 |
| 🟠 **Alto** | 3 |
| 🟡 **Medio** | 4 |
| 🔵 **Bajo** | 3 |
| ℹ️ **Informativo** | 4 |

---

## 🔴 CRÍTICO

### C-01: CSRF — sameSite=None + urlencoded parser permite ataques cross-site

**Archivos:** `server/_core/cookies.ts` (línea 45), `server/_core/index.ts` (línea 33-34), `api/_entry.ts` (línea 9-10)

**Problema:**
- `cookies.ts` configura `sameSite: "none"` en todas las cookies de sesión.
- El servidor Express explícitamente carga `express.urlencoded({ extended: true })` con límite de 50MB.
- tRPC procesa tanto JSON como urlencoded. Un atacante externo puede hacer que el navegador de un usuario autenticado envíe una petición POST urlencoded a `/api/trpc` desde un sitio malicioso, y la cookie de sesión será enviada automáticamente (`sameSite: "none"`).
- Las cookies no tienen prefix `__Host-`, no hay tokens CSRF, y no hay verificación de origen.

**Riesgo:** Cualquier mutation tRPC (aprobar pagos, crear cobros, eliminar usuarios, cambiar roles) puede ser ejecutada sin consentimiento del usuario autenticado.

**Solución:**
```typescript
// En cookies.ts — cambiar sameSite
sameSite: "lax", // o "strict"
// En _core/index.ts y _entry.ts — eliminar o restringir urlencoded
// app.use(express.urlencoded({ extended: true })); ← eliminar si no se usa
```

### C-02: Storage — Upsert sin validación de path traversal + contenido público

**Archivos:** `server/storage.ts` (líneas 25-53, 72-74), `server/db.ts` (líneas 1242-1291)

**Problema:**
- `normalizeKey()` solo elimina `/` inicial pero **no sanitiza `../`**:
  ```typescript
  function normalizeKey(relKey: string): string {
    return relKey.replace(/^\/+/, "");
  }
  ```
- La clave S3 se construye parcialmente desde datos del usuario (`paymentId`, `fileName`, `mimeType`). Aunque `paymentId` es un número, `fileName` podría contener `../`.
- `upsert: true` permite sobreescribir archivos existentes.
- `getPublicUrl()` retorna URLs públicas. Si el bucket es público (lo que parece por el nombre `vouchers` en el plan), cualquier archivo subido es legible sin autenticación.
- La validación de tipo MIME solo verifica el header, no el contenido real del archivo. Un SVG con JavaScript incrustado podría subirse si se declara como `image/png`.

**Riesgo:** Path traversal para sobreescribir archivos del bucket. Archivos maliciosos accesible públicamente. Potencial XSS persistente si el archivo es un SVG con scripts.

**Solución:**
```typescript
function normalizeKey(relKey: string): string {
  // Eliminar path traversal y caracteres peligrosos
  return relKey.replace(/^\/+/, "").replace(/\.\.\//g, "").replace(/[<>"'&]/g, "");
}
// Validar contenido real del archivo (magic bytes)
// NO usar upsert: true sin verificar permisos de sobreescritura
// Configurar bucket como privado y usar URLs firmadas (presigned URLs)
```

---

## 🟠 ALTO

### A-01: IDOR (Insecure Direct Object Reference) en payments.byApartment

**Archivo:** `server/routers.ts` (líneas 307-314)

**Problema:**
```typescript
byApartment: protectedProcedure
  .input(z.object({
    apartmentId: z.number(),
    month: z.string().optional(),
  }))
  .query(async ({ input }) => {
    return await db.getPaymentsByApartment(input.apartmentId, input.month);
  }),
```
Cualquier usuario autenticado puede pasar cualquier `apartmentId` y obtener todos los pagos de ese apartamento. No hay verificación de que el usuario sea admin o que el apartamento sea el suyo. Esto expone el historial financiero completo de cualquier residente.

**Riesgo:** Exposición de datos financieros privados de todos los residentes.

**Solución:**
```typescript
byApartment: protectedProcedure
  .input(z.object({
    apartmentId: z.number(),
    month: z.string().optional(),
  }))
  .query(async ({ input, ctx }) => {
    // Solo admin puede ver cualquier apartamento
    if (ctx.user.role !== "admin" && ctx.user.apartmentId !== input.apartmentId) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return await db.getPaymentsByApartment(input.apartmentId, input.month);
  }),
```

### A-02: Sin headers de seguridad ni CSP (helmet ausente)

**Archivos:** `server/_core/index.ts`, `api/_entry.ts`

**Problema:** El servidor Express no usa `helmet` ni establece ninguno de estos headers:
- `Content-Security-Policy` (CSP) → permite XSS
- `Strict-Transport-Security` (HSTS) → permite SSL stripping
- `X-Frame-Options` → permite clickjacking
- `X-Content-Type-Options` → permite MIME sniffing
- `Referrer-Policy`
- `Permissions-Policy`

**Riesgo:** Múltiples vectores de ataque en el navegador.

**Solución:**
```bash
pnpm add helmet
```
```typescript
import helmet from "helmet";
app.use(helmet());
```

### A-03: Sin rate limiting — ataques de fuerza bruta y enumeración

**Archivos:** Todos los endpoints tRPC

**Problema:** No hay rate limiting en ningún endpoint. Las procedures públicas (`auth.me`, `auth.logout`, `config.get`, etc.) y las administradas pueden ser llamadas sin restricción de frecuencia. Esto permite:
- Enumeración de IDs de usuario válidos
- Ataques de fuerza bruta contra Supabase Auth
- Denegación de servicio por abuso de endpoints costosos (PDF/Excel exports)
- Abuso de costos en Vercel por llamadas ilimitadas

**Riesgo:** Ataques automatizados, enumeración de datos, abuso de recursos.

**Solución:**
```bash
pnpm add express-rate-limit
```
```typescript
import rateLimit from "express-rate-limit";
app.use("/api/trpc", rateLimit({ windowMs: 60 * 1000, max: 60 }));
```

---

## 🟡 MEDIO

### M-01: Exposición de stack traces en producción (ErrorBoundary)

**Archivo:** `client/src/components/ErrorBoundary.tsx` (línea 38)

**Problema:**
```tsx
<pre className="text-sm text-muted-foreground whitespace-break-spaces">
  {this.state.error?.stack}
</pre>
```
En producción, cualquier error no capturado renderiza el stack trace completo al usuario, incluyendo paths internos, nombres de archivo, y potencialmente datos sensibles.

**Solución:**
```tsx
// Solo mostrar mensaje genérico en producción
const isDev = process.env.NODE_ENV === "development";
{isDev && (
  <pre>{this.state.error?.stack}</pre>
)}
```

### M-02: CSRF en tRPC por aceptar urlencoded bodies

**Archivo:** `server/_core/index.ts` (línea 34)

**Problema:** tRPC típicamente exige `Content-Type: application/json`, lo cual protege contra CSRF porque los navegadores no envían JSON automáticamente en formularios cross-site. Sin embargo, el middleware `express.urlencoded` se ejecuta **antes** del middleware tRPC. En Express, si el parser urlencoded procesa el body primero, el request podría llegar a tRPC como objeto plano y ser procesado.

**Solución:** Eliminar `express.urlencoded()` o limitarlo a rutas específicas no-tRPC.

### M-03: Credenciales de Supabase en disco en texto plano

**Archivo:** `.env` (en disco)

**Problema:** El archivo `.env` contiene en texto plano:
```
SUPABASE_SERVICE_KEY="eyJhbG...Yuv4"
SUPABASE_ANON_KEY="sb_publishable_titttw4Rxx4tEv9-Ghjulg_5ZRx9G2R"
DATABASE_URL="postgresql://postgres.pvtcpuboyjibltcyyzqe:password@..."
```
Además, `.env.local` contiene un VERCEL_OIDC_TOKEN válido. Cualquier persona con acceso al servidor o al filesystem del deploy puede leer estas credenciales.

**Riesgo:** Exposición de secrets si alguien accede al servidor o logs.

**Solución:**
- Usar variables de entorno de Vercel/Supabase en vez de archivos `.env` en producción
- Rotar la `SUPABASE_SERVICE_KEY` y el `VERCEL_OIDC_TOKEN`
- El `DATABASE_URL` contiene la password embebida — rotarla

### M-04: Secret mal tipiado en archivo .env

**Archivo:** `.env` (última línea)

**Problema:**
```
SUPABASE_SERVICE_KEY=\="eyJhbG...Yuv4"
```
Hay una doble asignación de `SUPABASE_SERVICE_KEY` con un `=\=` en vez de `=`. Esto podría causar que la variable no se cargue correctamente en algunos contextos.

---

## 🔵 BAJO

### B-01: MIME type no validado por contenido real (file upload)

**Archivos:** `server/db.ts` (líneas 1251-1255), `client/src/components/VoucherUpload.tsx`

**Problema:** La validación de tipo MIME se basa únicamente en el header HTTP `mimeType` que el cliente envía. No hay verificación del contenido real (magic bytes). Un atacante puede declarar un archivo como `image/jpeg` cuando en realidad es un SVG malicioso o un PDF con contenido embebido.

**Solución:** Usar `file-type` o similar para verificar magic bytes del archivo subido.

### B-02: Cookie session sin atributo `__Host-` prefix

**Archivo:** `server/_core/cookies.ts`

**Problema:** Las cookies de sesión no usan el prefijo `__Host-`, que garantiza que la cookie solo se aplica al origen actual y no puede ser sobrescrita por subdominios.

**Solución:** Cambiar el nombre de la cookie a `__Host-app_session_id`.

### B-03: ID de usuario numérico secuencial expuesto

**Archivo:** `drizzle/schema.ts`, `server/db.ts`

**Problema:** Los IDs de usuario son enteros auto-incrementales (`serial`). Algunas responses exponen `userId` en la UI (AdminPaymentReview.tsx línea 211: `ID: {payment.userId}`). Esto facilita la enumeración de usuarios.

**Solución:** Usar UUIDs en vez de integers secuenciales, o no exponer IDs internos en la UI.

---

## ℹ️ INFORMATIVO

### I-01: Uso de service_role key en storage (diseñado así pero riesgoso)

**Archivo:** `server/storage.ts`

`supabaseAdmin` (service_role key) tiene permisos de administrador en todo Supabase, incluyendo bypass de RLS. Si esta clave se filtrara, comprometería toda la base de datos y storage. Recomendación: usar una clave con permisos limitados para subir archivos.

### I-02: Express body limit de 50MB muy alto

**Archivos:** `server/_core/index.ts`, `api/_entry.ts`

`express.json({ limit: "50mb" })` permite bodies de hasta 50MB. Esto podría usarse para ataques de denegación de servicio por agotamiento de memoria. Reducir a un límite razonable (ej. 10MB).

### I-03: Paquete `nanoid` en dependencias pero no versionado con pin

**Archivo:** `package.json` (línea 65)

`"nanoid": "^5.1.5"` con caret permitiría actualizaciones automáticas que podrían introducir cambios inesperados.

### I-04: Vite dev server con `allowedHosts: true`

**Archivo:** `vite.config.ts` (línea 13)

```typescript
server: {
  allowedHosts: ["localhost", "127.0.0.1"],
}
```
`allowedHosts` está limitado a localhost, lo cual es correcto para desarrollo. No hay problema aquí.

---

## Resumen de Acciones Recomendadas

### Inmediatas (críticas/alto)
1. **CSRF** — Cambiar `sameSite: "none"` a `"lax"` en `cookies.ts`
2. **IDOR** — Implementar verificación de permisos en `payments.byApartment`
3. **Security Headers** — Agregar `helmet` middleware
4. **Rate Limiting** — Agregar `express-rate-limit`
5. **Storage** — Sanitizar path en `normalizeKey`, validar contenido real de archivos

### Corto plazo (medio)
6. **Error Boundary** — Ocultar stack traces en producción
7. **Urlencoded parser** — Eliminar `express.urlencoded()` o limitarlo
8. **Rotar secrets** — Rotar SUPABASE_SERVICE_KEY y VERCEL_OIDC_TOKEN
9. **Corregir typo** — Arreglar `SUPABASE_SERVICE_KEY=\=` en `.env`

### Largo plazo (bajo)
10. **UUIDs** — Migrar a IDs no secuenciales
11. **Bucket privado** — Configurar bucket de storage como privado con URLs firmadas
12. **File validation** — Validar magic bytes de archivos subidos
13. **Reducir body limit** — Bajar límite de 50MB a 10MB

---

*Revisión generada el 2026-07-27 basada en el código fuente del repositorio.*
