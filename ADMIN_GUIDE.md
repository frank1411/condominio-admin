# Guía del Administrador - CondoAdmin Pro

Esta guía proporciona instrucciones detalladas para administradores del sistema.

## 📋 Tabla de Contenidos

1. [Acceso y Autenticación](#acceso-y-autenticación)
2. [Dashboard](#dashboard)
3. [Gestión de Pagos](#gestión-de-pagos)
4. [Gestión de Usuarios](#gestión-de-usuarios)
5. [Gestión de Apartamentos](#gestión-de-apartamentos)
6. [Generación de Reportes](#generación-de-reportes)
7. [Configuración](#configuración)
8. [Troubleshooting](#troubleshooting)

## Acceso y Autenticación

### Iniciar Sesión

1. Navega a `https://condoadmin-y5qqycr7.manus.space`
2. Haz clic en "Iniciar Sesión"
3. Usa tu correo y contraseña
4. Serás redirigido al dashboard

### Roles y Permisos

| Rol | Permisos |
|-----|----------|
| **Admin** | Acceso completo a todas las funciones |
| **Usuario** | Solo ver sus propias deudas y pagos |

## Dashboard

El dashboard muestra métricas en tiempo real:

- **Total de Apartamentos:** Número total de unidades
- **Al Día:** Apartamentos sin deuda
- **Con Deuda:** Apartamentos con pagos pendientes
- **Total Pendiente:** Suma de todas las deudas

### Acciones Rápidas

- **Revisar Pagos:** Ir a la sección de pagos pendientes
- **Ver Usuarios:** Gestionar residentes
- **Generar Reportes:** Crear reportes mensuales

## Gestión de Pagos

### Revisar Pagos Pendientes

1. Ve a **Pagos** → **Revisión**
2. Verás una lista de pagos cargados por residentes
3. Cada pago muestra:
   - Apartamento
   - Mes
   - Monto
   - Comprobante
   - Estado (Pendiente, Aprobado, Rechazado)

### Aprobar un Pago

1. Selecciona el pago en la lista
2. Revisa los detalles:
   - Monto del pago
   - Deuda pendiente del apartamento
   - Comprobante adjunto
3. Haz clic en **Aprobar**
4. (Opcional) Agrega notas
5. Confirma la acción

**Resultado automático:**
- El pago se marca como aprobado
- La deuda se reduce automáticamente
- Se genera una notificación para el residente
- Se crea un registro de auditoría

### Rechazar un Pago

1. Selecciona el pago
2. Haz clic en **Rechazar**
3. **Obligatorio:** Proporciona una razón
4. Confirma

**Resultado:**
- El pago se marca como rechazado
- Se notifica al residente
- El residente puede cargar un nuevo comprobante

### Validaciones Automáticas

El sistema valida automáticamente:
- ✓ Monto no supera la deuda
- ✓ No hay pagos duplicados del mismo mes
- ✓ Fecha del pago es válida
- ✓ Comprobante es válido (imagen o PDF)

## Gestión de Usuarios

### Ver Usuarios

1. Ve a **Usuarios**
2. Verás lista de todos los residentes
3. Filtra por estado: Activo, Pendiente, Inactivo

### Aprobar Nuevo Usuario

1. Ve a **Solicitudes** (si hay pendientes)
2. Revisa la información del usuario
3. Haz clic en **Aprobar**
4. El usuario recibe notificación y puede acceder

### Desactivar Usuario

1. Selecciona el usuario
2. Haz clic en **Desactivar**
3. El usuario no podrá acceder
4. Sus datos se conservan

### Cambiar Rol

1. Selecciona el usuario
2. Haz clic en **Editar**
3. Cambia el rol (Usuario → Admin)
4. Guarda cambios

## Gestión de Apartamentos

### Ver Apartamentos

1. Ve a **Apartamentos**
2. Verás lista de todas las unidades
3. Cada apartamento muestra:
   - Nombre/número
   - Residente actual
   - Deuda total
   - Estado de pagos

### Asignar Residente

1. Selecciona el apartamento
2. Haz clic en **Asignar Residente**
3. Selecciona el usuario de la lista
4. Confirma

### Crear Cobro

1. Ve a **Cobros**
2. Haz clic en **Nuevo Cobro**
3. Selecciona:
   - Tipo: Global o Individual
   - Monto
   - Mes
   - Descripción
4. Confirma

**Resultado:**
- Se genera automáticamente una deuda para cada apartamento
- Se notifica a los residentes
- Aparece en sus dashboards

## Generación de Reportes

### Reportes Mensuales

1. Ve a **Reportes**
2. Selecciona el mes y año
3. Haz clic en **Generar Reporte**
4. Espera a que se genere (puede tomar 30 segundos)

### Descargar Reporte

1. En la lista de reportes, selecciona uno
2. Haz clic en **Descargar PDF** o **Descargar Excel**
3. El archivo se descarga automáticamente

### Contenido del Reporte

El reporte incluye:
- Resumen ejecutivo (total recaudado, pendiente, etc.)
- Detalles de pagos por apartamento
- Detalles de deudas
- Gráficos de tendencias
- Historial de transacciones

## Configuración

### Información del Condominio

1. Ve a **Configuración** → **General**
2. Edita:
   - Nombre del condominio
   - Dirección
   - Teléfono
   - Email de contacto
3. Guarda cambios

### Configuración de Cobros

1. Ve a **Configuración** → **Cobros**
2. Define:
   - Monto de cuota mensual
   - Moneda (USD, VES)
   - Fecha de vencimiento
3. Guarda cambios

### Notificaciones

1. Ve a **Configuración** → **Notificaciones**
2. Configura:
   - Email de notificaciones
   - Frecuencia de recordatorios
   - Canales (email, in-app)
3. Guarda cambios

## Troubleshooting

### "No puedo aprobar un pago"

**Posibles causas:**
- El monto supera la deuda (Solución: Rechaza y pide comprobante correcto)
- Ya existe un pago del mismo mes (Solución: Revisa si ya fue procesado)
- El comprobante no es válido (Solución: Pide al residente que recargue)

### "La deuda no se redujo después de aprobar"

**Solución:**
- Recarga la página (F5)
- Si persiste, contacta soporte
- Verifica en la auditoría que el pago fue procesado

### "Un usuario no puede acceder"

**Posibles causas:**
- Cuenta no aprobada (Solución: Aprueba en Usuarios)
- Cuenta desactivada (Solución: Reactiva)
- Contraseña olvidada (Solución: Usa "Resetear Contraseña")

### "No puedo ver los reportes"

**Solución:**
- Espera 30 segundos después de hacer clic en Generar
- Recarga la página
- Verifica que haya datos para ese mes

### "El comprobante no se carga"

**Posibles causas:**
- Archivo muy grande (máx 5MB)
- Formato no válido (solo JPG, PNG, PDF)
- Conexión lenta

**Solución:**
- Comprime la imagen
- Intenta con otro formato
- Verifica tu conexión a internet

## 📞 Soporte

Para problemas técnicos:
1. Revisa esta guía
2. Consulta [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
3. Contacta al equipo de soporte

---

**Última actualización:** Marzo 2026
