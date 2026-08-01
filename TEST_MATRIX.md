# Matriz de Casos de Prueba — condominio-admin

> Aplicación en producción: https://condominio-admin-eta.vercel.app
> Última actualización: 2026-08-01

## Leyenda de estados

| Estado | Significado |
|--------|-------------|
| `⏳ PENDIENTE` | No ejecutado aún |
| `✅ PASÓ` | Ejecutado, resultado = esperado |
| `❌ FALLÓ` | Ejecutado, resultado ≠ esperado (bug) |
| `🔧 FIXEADO` | Bug corregido y desplegado (falta re-verificación) |
| `🔁 RE-TEST` | Fix desplegado, pendiente de re-ejecutar |

## Registro de hallazgos

| Bug ID | Módulo | Descripción | Severidad | Estado | Fix (commit) |
|--------|--------|-------------|-----------|--------|--------------|
| BUG-001 | Pagos/Cobros | Montos 0 y negativos aceptados en `payments.submit` y `charges.create` | CRÍTICA | 🔧 FIXEADO | `b736772` |
| MEJORA-001 | Pagos/UX | Saldo no se refresca automáticamente tras aprobar pago (staleTime 5 min) | MEDIA | 🔧 FIXEADO | `8d648fe` |
| BUG-002 | Config/Estructura | Cambiar pisos/aptos en config no afecta la estructura real: `initializeFloorsAndApartments` retorna temprano si ya existen pisos (`if (existingFloors.length > 0) return`) → el dashboard sigue mostrando la estructura vieja y parece "hardcodeada" | ALTA | 🔧 FIXEADO (decisión: estructura inmutable) | `3725299` — `updateCondominiumConfig` rechaza cambios de pisos/aptos si la estructura existe; UI bloquea los campos y oculta el botón destructivo |
| MEJORA-002 | Config/Apartamentos | Vista previa de patrón no coincidía con la generación real (`{numero}` correlativo en preview vs compuesto en resultado); "Generar Todos" usaba el patrón guardado, no el escrito; sobrescribía nombres manuales sin confirmación | MEDIA | 🔧 FIXEADO | `60d0058` — preview replica `apartmentNumber` real; server auto-guarda el patrón enviado; `window.confirm` antes de sobrescribir |
| PEND-BUG-001 | Pagos parciales | Bug reportado por usuario tras limpiar BD — pendiente de reproducir | ? | ⏳ PENDIENTE | — |

---

## 1. AUTENTICACIÓN (AUTH)

| ID | Caso de prueba | Precondiciones | Pasos | Datos | Resultado esperado | Estado | Notas |
|----|----------------|----------------|-------|-------|--------------------|--------|-------|
| AUTH-01 | Login exitoso | Usuario aprobado y activo | Entrar credenciales válidas en `/login` | admin@test / pass | Redirige al dashboard | ✅ PASÓ | QA-01 |
| AUTH-02 | Logout completo | Sesión iniciada | Clic en "Cerrar sesión" | — | Redirige a `/login`, no regresa al dashboard con botón atrás ni F5 | ✅ PASÓ | QA-01 (fix 3 capas) |
| AUTH-03 | Recarga tras logout | Sesión cerrada | F5 en `/login` | — | Permanece en login | ✅ PASÓ | QA-01 |
| AUTH-04 | Acceso directo a ruta protegida sin sesión | Sin sesión | Navegar a `/dashboard` | — | Redirige a `/login` | ✅ PASÓ | QA-01 |
| AUTH-05 | Token inválido en localStorage | Sesión iniciada | Editar token en localStorage → F5 | token corrupto | Expulsa a `/login` (401) | ✅ PASÓ | QA-02 |
| AUTH-06 | Sesión expirada | Token vencido | Recargar app | — | Redirige a `/login` sin crash | ⏳ PENDIENTE | Requiere esperar expiración o manipular exp |
| AUTH-07 | Login con credenciales incorrectas | — | Intentar login inválido | user@x / wrong | Mensaje de error claro, sin redirect | ⏳ PENDIENTE | |
| AUTH-08 | Login de usuario pendiente de aprobación | Usuario `approvalStatus=pending` | Intentar login | — | Mensaje "esperando aprobación" o bloqueo | ⏳ PENDIENTE | |
| AUTH-09 | Login de usuario rechazado | Usuario `approvalStatus=rejected` | Intentar login | — | Mensaje con motivo de rechazo | ⏳ PENDIENTE | |
| AUTH-10 | Login de usuario desactivado | Usuario `isActive=false` | Intentar login | — | Acceso denegado | ⏳ PENDIENTE | |

## 2. ROLES Y PERMISOS (ROL)

| ID | Caso de prueba | Precondiciones | Pasos | Datos | Resultado esperado | Estado | Notas |
|----|----------------|----------------|-------|-------|--------------------|--------|-------|
| ROL-01 | Usuario `user` accede a ruta admin por URL | Sesión de usuario rol `user` | Navegar a `/configuracion`, `/users`, `/cobros` | — | Acceso denegado (FORBIDDEN) | ✅ PASÓ | QA-02 |
| ROL-02 | UI oculta opciones de admin para rol `user` | Sesión rol `user` | Revisar menú/navegación | — | No aparecen enlaces de admin | ✅ PASÓ | QA-02 |
| ROL-03 | Admin ve todas las rutas | Sesión rol `admin` | Revisar menú | — | Todas las opciones visibles | ⏳ PENDIENTE | |
| ROL-04 | IDOR: user consulta pagos de otro apartamento | Sesión rol `user` con apto A | Llamar `payments.byApartment` con apto B | apto B | FORBIDDEN (solo admin o propio apto) | ⏳ PENDIENTE | Ya hay protección en código, verificar |
| ROL-05 | IDOR: user ve comprobante de otro pago | Sesión rol `user` | `getVoucher` con paymentId ajeno | paymentId otro user | FORBIDDEN | ⏳ PENDIENTE | |
| ROL-06 | Admin cambia rol de otro admin | Dos admins | `updateRole` de admin→user sobre el 2º | — | Permitido (o debería bloquearse) | ⏳ PENDIENTE | Revisar política de negocio |

## 3. PAGOS (PAG)

| ID | Caso de prueba | Precondiciones | Pasos | Datos | Resultado esperado | Estado | Notas |
|----|----------------|----------------|-------|-------|--------------------|--------|-------|
| PAG-01 | Flujo nominal: crear → aprobar | Cobro activo + deuda generada | User crea pago → admin aprueba | monto = deuda | Saldo liquidado, badge "Pagado" | ✅ PASÓ | QA-03 |
| PAG-02 | Refresco automático tras aprobar | Pago pendiente | Aprobar → navegar al dashboard | — | Saldo actualizado sin F5 | ✅ PASÓ | MEJORA-001 (8d648fe) |
| PAG-03 | Concurrencia: doble aprobación simultánea | 1 pago pendiente | 2 pestañas → aprobar a la vez | — | Solo 1 gana; saldo no se duplica | ✅ PASÓ | QA-03 (FOR UPDATE) |
| PAG-04 | Monto 0 | — | Crear pago con monto 0 | 0 | Rechazado: "monto positivo mayor a cero" | 🔧 FIXEADO | BUG-001 → RE-TEST |
| PAG-05 | Monto negativo | — | Crear pago con monto negativo | -100 | Rechazado | 🔧 FIXEADO | BUG-001 → RE-TEST |
| PAG-06 | Monto no numérico | — | Enviar `abc` | abc | Bloqueado (input type=number) | ✅ PASÓ | QA-03 |
| PAG-07 | Pago parcial (menor a deuda) | Deuda $50, pago $30 | Crear + aprobar | 30 | Deuda pendiente $20, `isPaid=false` | ❌ FALLÓ? | ⏳ PENDIENTE de reproducir |
| PAG-08 | Pago exacto de la deuda | Deuda $50, pago $50 | Crear + aprobar | 50 | Deuda liquidada `isPaid=true` | ✅ PASÓ | QA-03 |
| PAG-09 | Pago mayor a deuda | Deuda $50, pago $80 | Crear + aprobar | 80 | Bloqueado (excede pendiente) | ⏳ PENDIENTE | |
| PAG-10 | Pago en mes futuro | Mes actual 2026-08 | Crear pago con mes 2026-09 | 2026-09 | Rechazado (mes futuro) | ⏳ PENDIENTE | |
| PAG-11 | Pago con mes >6 meses antiguo | Mes actual 2026-08 | Crear pago mes 2026-01 | 2026-01 | Rechazado (>6 meses) | ⏳ PENDIENTE | |
| PAG-12 | Pago duplicado mismo mes/apto | 1 pago aprobado | Crear otro pago mismo mes | mismo mes | Detectar duplicado (warning/bloqueo) | ⏳ PENDIENTE | |
| PAG-13 | Rechazo de pago con notas | Pago pendiente | Rechazar con motivo | nota | Pago `rejected`, user notificado, deuda intacta | ✅ PASÓ | QA-03 |
| PAG-14 | Rechazo sin notas | Pago pendiente | Clic "Rechazar" sin escribir | — | Bloqueado: "Debes proporcionar una razón" | ✅ PASÓ | QA-03 |
| PAG-15 | Pago manual (admin) | Apartamento con deuda | Dashboard → registrar pago manual | monto ≤ deuda | Deuda reducida, audit log creado | ✅ PASÓ | QA-03 (cobros individuales/parciales OK) |
| PAG-16 | Pago manual excede deuda | Apto con deuda $50 | Registrar pago manual $80 | 80 | Bloqueado: no excede pendiente | ✅ PASÓ | QA-03 |
| PAG-17 | Pago en VES con conversión | Config con exchangeRate | Crear pago VES | 1000 VES, tasa 100 | Se guarda convertido a USD (10) | ⏳ PENDIENTE | |
| PAG-18 | Doble submit del formulario | — | Clic 2× en "Enviar Pago" | — | Sin pagos duplicados | ⏳ PENDIENTE | |

## 4. DEUDAS (DEU)

| ID | Caso de prueba | Precondiciones | Pasos | Datos | Resultado esperado | Estado | Notas |
|----|----------------|----------------|-------|-------|--------------------|--------|-------|
| DEU-01 | Generación de deuda al crear cobro | Sin deudas (BD limpia) | Crear cobro recurrente | $30/mes | Se generan deudas por apto/mes | ⏳ PENDIENTE | |
| DEU-02 | Cálculo de pendiente tras pago parcial | Deuda $30, pago $10 aprobado | Ver dashboard | — | Pendiente = $20 | ⏳ PENDIENTE | Relacionado con PAG-07 |
| DEU-03 | Suma de múltiples deudas del apto | 2 deudas $20 + $15 | Ver `debts.myDebts` | — | Total due $35, total pending correcto | ⏳ PENDIENTE | |
| DEU-04 | Deuda marcada pagada al liquidar | Deuda $20, pago $20 | Ver estado | — | `isPaid=true`, badge verde | ⏳ PENDIENTE | |
| DEU-05 | Dashboard resumen correcto | Datos mixtos | Ver stats admin | — | total/paid/pending/totalPending cuadran | ⏳ PENDIENTE | |
| DEU-06 | Deuda de cobro individual solo al apto indicado | Cobro individual apto 3 | Ver deudas apto 3 vs apto 4 | — | Solo apto 3 tiene la deuda | ⏳ PENDIENTE | |

## 5. COBROS (COB)

| ID | Caso de prueba | Precondiciones | Pasos | Datos | Resultado esperado | Estado | Notas |
|----|----------------|----------------|-------|-------|--------------------|--------|-------|
| COB-01 | Crear cobro recurrente | Admin | Formulario "Crear cobro" | nombre, $30 | Cobro activo + deudas generadas | ⏳ PENDIENTE | |
| COB-02 | Crear cobro individual | Admin | Marcar "individual" + apto | apto 5 | Deuda solo apto 5 | ✅ PASÓ | QA-03 (cobro individual OK) |
| COB-03 | Crear cobro con monto 0/negativo | Admin | Monto 0 / -50 | 0, -50 | Rechazado | 🔧 FIXEADO | BUG-001 → RE-TEST |
| COB-04 | Editar cobro existente | 1 cobro | Cambiar monto | $30→$40 | Cobro actualizado | ⏳ PENDIENTE | |
| COB-05 | Eliminar cobro | 1 cobro | Eliminar | — | Cobro borrado (deudas asociadas?) | ⏳ PENDIENTE | Revisar efecto en deudas |
| COB-06 | Cobro VES con tasa | Admin | Crear cobro en VES | 3000 VES, tasa 100 | Guardado USD 30 | ⏳ PENDIENTE | |

## 6. CONDOMINIO / CONFIGURACIÓN (CFG)

### 6.1 Información General (CFG-GEN)

> Campos: Nombre del Condominio (texto), Cantidad de Pisos (1-20), Apartamentos por Piso (1-50).
> Server: `config.update` con zod (`floors` 1-20, `apartmentsPerFloor` 1-50, `name` sin límite de longitud).

| ID | Caso de prueba | Precondiciones | Pasos | Datos | Resultado esperado | Estado | Notas |
|----|----------------|----------------|-------|-------|--------------------|--------|-------|
| CFG-GEN-01 | Cambiar nombre del condominio | Admin logueado | Config → Información General → editar nombre → Guardar | "Torre A" | Guarda, toast éxito, persiste tras recargar | ⏳ PENDIENTE | |
| CFG-GEN-02 | Nombre vacío | Admin logueado | Borrar nombre → Guardar | "" | Decidir: debe rechazarse (o aceptarse con default). Verificar qué hace | ⏳ PENDIENTE | Sin validación server-side |
| CFG-GEN-03 | Nombre con caracteres especiales | Admin logueado | Nombre con acentos, `&`, `<b>` | "Torre A-1° & <b>Norte</b>" | Sin XSS, sin crash, se muestra escapado | ⏳ PENDIENTE | |
| CFG-GEN-04 | Nombre muy largo | Admin logueado | Pegar 5000 caracteres → Guardar | 5000 chars | Verificar: debe rechazarse o truncarse; hoy NO hay `max` en server | ⏳ PENDIENTE | Riesgo detectado en código |
| CFG-GEN-05 | Pisos válido (cambio) | Admin logueado | Cambiar pisos 5→4 → Guardar | 4 | Persiste, sin crash | ⏳ PENDIENTE | |
| CFG-GEN-06 | Pisos = 0 | Admin logueado | Pisos = 0 → Guardar | 0 | Rechazado (min 1) | ⏳ PENDIENTE | |
| CFG-GEN-07 | Pisos = 21 | Admin logueado | Pisos = 21 → Guardar | 21 | Rechazado (max 20) | ⏳ PENDIENTE | |
| CFG-GEN-08 | Pisos = 20 (límite) | Admin logueado | Pisos = 20 → Guardar | 20 | Aceptado | ⏳ PENDIENTE | |
| CFG-GEN-09 | Pisos = 1 (límite) | Admin logueado | Pisos = 1 → Guardar | 1 | Aceptado | ⏳ PENDIENTE | |
| CFG-GEN-10 | Pisos borrado/vacío | Admin logueado | Borrar campo pisos → Guardar | "" (NaN) | Error controlado (hoy toast genérico; error real se traga) | ⏳ PENDIENTE | Riesgo: toast genérico |
| CFG-GEN-11 | Pisos decimal | Admin logueado | Pisos = 5.5 | 5.5 | Verificar comportamiento (parseInt trunca a 5) | ⏳ PENDIENTE | |
| CFG-GEN-12 | Aptos por piso = 0 | Admin logueado | Aptos = 0 → Guardar | 0 | Rechazado (min 1) | ⏳ PENDIENTE | |
| CFG-GEN-13 | Aptos por piso = 51 | Admin logueado | Aptos = 51 → Guardar | 51 | Rechazado (max 50) | ⏳ PENDIENTE | |
| CFG-GEN-14 | Aptos por piso = 50 (límite) | Admin logueado | Aptos = 50 → Guardar | 50 | Aceptado | ⏳ PENDIENTE | |
| CFG-GEN-15 | Aptos por piso = 1 (límite) | Admin logueado | Aptos = 1 → Guardar | 1 | Aceptado | ⏳ PENDIENTE | |
| CFG-GEN-16 | Guardar solo nombre no toca otros campos | Admin logueado | Anotar baseFee/tasa actuales → cambiar solo nombre → Guardar → verificar otros cards | nombre nuevo | baseFee, tasa y reminderDay intactos (hoy se envían todos juntos: verificar) | ⏳ PENDIENTE | Riesgo: formData compartido |
| CFG-GEN-17 | Persistencia tras recarga | Tras CFG-GEN-01 | F5 en /configuracion | — | Nombre y valores guardados visibles | ⏳ PENDIENTE | |
| CFG-GEN-18 | Acceso rol user a /configuracion | Usuario rol `user` | Navegar a /configuracion | — | FORBIDDEN | ✅ PASÓ | Cubierto por ROL-01 (QA-02) |
| CFG-GEN-19 | Doble submit en Guardar | Admin logueado | Clic 2× rápido en "Guardar Cambios" | — | Sin error; 1 sola actualización | ⏳ PENDIENTE | |

### 6.2 Configuración general (CFG)

| ID | Caso de prueba | Precondiciones | Pasos | Datos | Resultado esperado | Estado | Notas |
|----|----------------|----------------|-------|-------|--------------------|--------|-------|
| CFG-01 | Actualizar nombre del condominio | Admin | Editar config | "Torre A" | Persistido y visible | ⏳ PENDIENTE | |
| CFG-02 | Actualizar mensualidad base | Admin | Editar baseFee | 45 | Persistido; afecta nuevas deudas | ⏳ PENDIENTE | |
| CFG-03 | Pisos fuera de rango | Admin | floors = 0 o 25 | 0 / 25 | Rechazado (min 1, max 20) | ⏳ PENDIENTE | |
| CFG-04 | Apartamentos por piso fuera de rango | Admin | aptsPerFloor = 0 o 60 | 0 / 60 | Rechazado (min 1, max 50) | ⏳ PENDIENTE | |
| CFG-05 | Inicializar estructura pisos/aptos | Admin | `initializeStructure` | — | Pisos + aptos creados según config | ✅ PASÓ | QA-03 (estructura 5×6 creada) |
| CFG-06 | Generar nombres de apartamentos | Admin | `generateApartmentNames` | patrón | Nombres según patrón | ✅ PASÓ | MEJORA-002 (`60d0058`): preview = resultado, auto-guarda patrón |
| CFG-07 | Patrón de nombres inválido | Admin | getPatternExamples con patrón raro | `{piso}-{numero}` | Ejemplos generados sin crash | ✅ PASÓ | MEJORA-002; detalle menor de patrones pendiente (decisión futura) |

## 7. USUARIOS (USR)

| ID | Caso de prueba | Precondiciones | Pasos | Datos | Resultado esperado | Estado | Notas |
|----|----------------|----------------|-------|-------|--------------------|--------|-------|
| USR-01 | Aprobar usuario pendiente | 1 user pending | Aprobar | — | User aprobado, puede loguear | ⏳ PENDIENTE | |
| USR-02 | Rechazar usuario con motivo | 1 user pending | Rechazar + razón | razón | User rechazado, ve motivo al loguear | ⏳ PENDIENTE | |
| USR-03 | Asignar apartamento | Admin | `assignApartment` | apto 7 | User vinculado a apto | ⏳ PENDIENTE | |
| USR-04 | Cambiar rol user↔admin | Admin | `updateRole`/`changeRole` | admin | Rol actualizado | ⏳ PENDIENTE | |
| USR-05 | Desactivar usuario | Admin | `toggleActive(false)` | — | User no puede loguear | ⏳ PENDIENTE | |
| USR-06 | Eliminar usuario | Admin | `delete` | — | User borrado | ⏳ PENDIENTE | Ojo: FK con pagos/notifs |

## 8. NOTIFICACIONES (NOT)

| ID | Caso de prueba | Precondiciones | Pasos | Datos | Resultado esperado | Estado | Notas |
|----|----------------|----------------|-------|-------|--------------------|--------|-------|
| NOT-01 | Notificación al aprobar pago | Pago aprobado | Ver centro de notificaciones | — | "Pago aprobado" visible | ⏳ PENDIENTE | |
| NOT-02 | Contador de no leídas | 2 notifs nuevas | Ver badge | — | Badge = 2 | ⏳ PENDIENTE | |
| NOT-03 | Marcar como leída | 1 notif | Clic "marcar leída" | — | Badge decrementa | ⏳ PENDIENTE | |
| NOT-04 | Marcar todas como leídas | 3 notifs | Clic "marcar todas" | — | Badge = 0 | ⏳ PENDIENTE | |
| NOT-05 | Notificación al rechazar pago | Pago rechazado | Ver notifs | — | "Pago rechazado" con motivo | ⏳ PENDIENTE | |
| NOT-06 | Notificación de deuda creada | Cobro nuevo | Ver notifs | — | "Nueva deuda" | ⏳ PENDIENTE | |

## 9. REPORTES / EXPORTACIÓN (REP)

| ID | Caso de prueba | Precondiciones | Pasos | Datos | Resultado esperado | Estado | Notas |
|----|----------------|----------------|-------|-------|--------------------|--------|-------|
| REP-01 | Exportar PDF | Datos de deudas | Clic "PDF" | mes actual | Archivo válido, encabezados OK | ⏳ PENDIENTE | |
| REP-02 | Exportar Excel | Datos de deudas | Clic "Excel" | mes actual | Archivo .xlsx válido, verticalAlign OK | ⏳ PENDIENTE | Fix previo (83b871c) |
| REP-03 | Exportar con BD vacía | Sin deudas | Exportar | — | No crash; archivo con 0 filas o mensaje | ⏳ PENDIENTE | |
| REP-04 | Exportar con caracteres especiales | Nombre "Torre A-1°" | Exportar | — | Sin corrupción de encoding | ⏳ PENDIENTE | |
| REP-05 | Exportar mes sin datos | Mes sin movimientos | Exportar ese mes | — | No crash | ⏳ PENDIENTE | |

## 10. STORAGE / COMPROBANTES (STO)

| ID | Caso de prueba | Precondiciones | Pasos | Datos | Resultado esperado | Estado | Notas |
|----|----------------|----------------|-------|-------|--------------------|--------|-------|
| STO-01 | Subir comprobante imagen válida | Pago creado | Adjuntar imagen | JPG/PNG <5MB | Se sube y previsualiza | ⏳ PENDIENTE | |
| STO-02 | Subir archivo no permitido | Pago creado | Adjuntar `.exe`/`.txt` | exe | Rechazado (solo image/*, pdf) | ⏳ PENDIENTE | |
| STO-03 | Subir archivo >5MB | Pago creado | Adjuntar imagen 6MB | 6MB | Rechazado (límite 5MB) | ⏳ PENDIENTE | |
| STO-04 | Ver comprobante de pago propio | User | `getVoucher` | — | Imagen visible | ⏳ PENDIENTE | |
| STO-05 | Ver comprobante de otro (IDOR) | User | `getVoucher` pago ajeno | — | FORBIDDEN | ⏳ PENDIENTE | |

## 11. CASOS BORDE Y UX (EDG)

| ID | Caso de prueba | Precondiciones | Pasos | Datos | Resultado esperado | Estado | Notas |
|----|----------------|----------------|-------|-------|--------------------|--------|-------|
| EDG-01 | Formularios con inputs vacíos | — | Enviar sin datos | — | Mensaje "completa campos requeridos" | ✅ PASÓ | QA-03 |
| EDG-02 | Caracteres especiales en nombre cobro | Admin | Nombre `Agua & <b>Mantenimiento</b>` | — | Sin XSS (escape), sin crash | ⏳ PENDIENTE | |
| EDG-03 | Doble submit crear cobro | Admin | Clic 2× "Crear cobro" | — | Sin cobros duplicados | ⏳ PENDIENTE | |
| EDG-04 | Red offline | Sesión iniciada | DevTools → offline → recargar | — | Mensaje de error claro, no pantalla blanca | ⏳ PENDIENTE | |
| EDG-05 | Responsive móvil | — | Ver 375px | — | Navegación y tablas usables | ⏳ PENDIENTE | |
| EDG-06 | Fechas inválidas en mes | — | Mes malformado `2026-13` | 2026-13 | Validación (input type=month lo limita) | ⏳ PENDIENTE | |
| EDG-07 | Estado de carga visible | — | Navegar a páginas | — | Spinners/loaders en todas las cargas | ⏳ PENDIENTE | |
| EDG-08 | Error de servidor visible | Mutación falla | Forzar error | — | Toast con mensaje real (no genérico) | ⏳ PENDIENTE | Mejora aplicada en PAG/COB |

---

## Cómo agregar casos

Formato de cada caso nuevo (una fila por caso):

```
| ID | Caso | Precondiciones | Pasos | Datos | Resultado esperado | ⏳ PENDIENTE | notas |
```

- `ID`: prefijo de módulo + número correlativo (`PAG-19`, `EDG-09`, ...).
- Al ejecutar un caso: cambiar estado a `✅ PASÓ` o `❌ FALLÓ`; si falla, abrir fila en "Registro de hallazgos" con severidad y commit del fix.
- Los bugs críticos (auth/pagos) se arreglan el mismo día.
