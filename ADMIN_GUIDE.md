# Guía del Administrador - CondoAdmin Pro

Esta guía proporciona instrucciones detalladas para administradores del sistema de administración de condominios.

## 📋 Tabla de Contenidos

1. [Acceso y Autenticación](#acceso-y-autenticación)
2. [Dashboard Administrativo](#dashboard-administrativo)
3. [Gestión de Pagos](#gestión-de-pagos)
4. [Gestión de Usuarios](#gestión-de-usuarios)
5. [Gestión de Apartamentos](#gestión-de-apartamentos)
6. [Gestión de Cobros](#gestión-de-cobros)
7. [Generación de Reportes](#generación-de-reportes)
8. [Configuración del Condominio](#configuración-del-condominio)
9. [Troubleshooting](#troubleshooting)

## Acceso y Autenticación

### Iniciar Sesión

1. Navega a `https://condoadmin-y5qqycr7.manus.space`
2. Haz clic en **Iniciar Sesión**
3. Completa el proceso de autenticación de Manus
4. Serás redirigido al dashboard administrativo

### Roles y Permisos

El sistema cuenta con dos roles principales:

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| **Admin** | Administrador del condominio | Acceso completo a todas las funciones |
| **Usuario** | Residente | Solo ver sus propias deudas y pagos |

Solo los administradores pueden acceder a las secciones administrativas. Si intentas acceder sin permisos, serás redirigido a tu dashboard personal.

## Dashboard Administrativo

El dashboard muestra métricas en tiempo real del estado del condominio.

### Tarjetas de Resumen

El dashboard presenta cuatro tarjetas principales:

**Total de Apartamentos:** Número total de unidades en el condominio. Este número se establece en la configuración inicial.

**Al Día:** Cantidad de apartamentos que no tienen deuda pendiente. Estos residentes han pagado todas sus obligaciones.

**Con Deuda:** Cantidad de apartamentos con pagos pendientes. Estos residentes requieren seguimiento.

**Total Pendiente:** Suma total de todas las deudas pendientes en USD. Este monto representa el dinero que aún no ha sido recaudado.

### Ordenamiento de Apartamentos

Puedes cambiar el orden en que se visualizan los apartamentos usando el selector en la esquina superior derecha:

- **Ordenar por Piso:** Agrupa los apartamentos por piso (orden por defecto)
- **Deuda Mayor a Menor:** Muestra primero los apartamentos con mayor deuda
- **Deuda Menor a Mayor:** Muestra primero los apartamentos con menor deuda

Este ordenamiento facilita identificar rápidamente qué apartamentos tienen mayores obligaciones.

### Acciones Rápidas

Desde el dashboard puedes acceder directamente a:

- **Revisión de Pagos:** Ir a la sección donde se revisan pagos cargados por residentes
- **Gestión de Usuarios:** Administrar residentes y sus cuentas
- **Gestión de Apartamentos:** Ver y asignar residentes a apartamentos
- **Gestión de Cobros:** Crear cobros colectivos o individuales

## Gestión de Pagos

### Revisar Pagos Pendientes

Los residentes pueden registrar pagos en el sistema, que quedan pendientes de tu aprobación.

1. Ve a **Pagos** en el sidebar
2. Verás una lista de pagos registrados por residentes
3. Cada pago muestra:
   - Apartamento del residente
   - Mes que está pagando
   - Monto registrado
   - Fecha de registro
   - Estado actual (Pendiente, Aprobado, Rechazado)

### Aprobar un Pago

Para aprobar un pago:

1. Selecciona el pago de la lista
2. Revisa los detalles:
   - Monto del pago
   - Deuda pendiente actual del apartamento
   - Información del residente
3. Haz clic en **Aprobar**
4. (Opcional) Agrega notas sobre la revisión
5. Confirma la acción

**Resultado automático:**
- El pago se marca como aprobado
- La deuda del apartamento se reduce automáticamente
- El residente recibe una notificación de aprobación
- Se crea un registro de auditoría

### Rechazar un Pago

Si un pago tiene problemas:

1. Selecciona el pago
2. Haz clic en **Rechazar**
3. **Obligatorio:** Proporciona una razón clara del rechazo
4. Confirma la acción

**Resultado:**
- El pago se marca como rechazado
- El residente recibe una notificación con la razón
- El residente puede registrar un nuevo pago corregido
- Se crea un registro de auditoría

### Validaciones Automáticas

El sistema valida automáticamente cada pago:

- El monto no supera la deuda pendiente del apartamento
- No existen pagos duplicados del mismo mes
- La fecha del pago es válida
- El monto es positivo

## Gestión de Usuarios

### Ver Usuarios

1. Ve a **Usuarios** en el sidebar
2. Verás lista de todos los residentes registrados
3. Cada usuario muestra:
   - Nombre completo
   - Email
   - Apartamento asignado
   - Rol (Admin o Usuario)
   - Estado (Activo o Inactivo)

### Crear Nuevo Usuario

Los residentes se registran a través del portal de Manus OAuth. Como administrador, puedes:

1. Ver el listado de usuarios pendientes de aprobación
2. Asignar apartamentos a nuevos usuarios
3. Cambiar roles de usuario a admin si es necesario

### Asignar Apartamento a Usuario

1. Ve a **Usuarios**
2. Selecciona el usuario
3. En el selector de apartamento, elige la unidad
4. Confirma la asignación

El usuario recibirá una notificación y podrá ver su apartamento en su perfil.

### Cambiar Rol de Usuario

Para convertir un usuario a administrador:

1. Ve a **Usuarios**
2. Selecciona el usuario
3. Haz clic en el selector de rol
4. Cambia de "Usuario" a "Admin"
5. Confirma

**Nota:** Solo administradores pueden acceder a todas las funciones. Usa esta opción con cuidado.

### Desactivar Usuario

Para desactivar un usuario:

1. Ve a **Usuarios**
2. Selecciona el usuario
3. Haz clic en **Desactivar**
4. Confirma

El usuario no podrá acceder a la plataforma, pero sus datos se conservan.

### Eliminar Usuario

Para eliminar un usuario permanentemente:

1. Ve a **Usuarios**
2. Selecciona el usuario
3. Haz clic en **Eliminar**
4. Confirma (esta acción no se puede deshacer)

**Advertencia:** Esta acción es irreversible y eliminará todos los datos del usuario.

## Gestión de Apartamentos

### Ver Apartamentos

1. Ve a **Apartamentos** en el sidebar
2. Verás lista de todas las unidades del condominio
3. Cada apartamento muestra:
   - Nombre/número del apartamento
   - Residente actual asignado
   - Deuda total
   - Estado de pagos (Pagado/Pendiente)

### Estructura del Condominio

La estructura de pisos y apartamentos se configura en la sección de Configuración. Una vez creada, aparecerá automáticamente en esta sección.

### Asignar Residente a Apartamento

1. Ve a **Apartamentos**
2. Selecciona el apartamento
3. En el selector de residente, elige el usuario
4. Confirma la asignación

El residente verá su apartamento asignado en su perfil.

## Gestión de Cobros

Los cobros son los cargos que los residentes deben pagar. Pueden ser colectivos (para todos) o individuales (para apartamentos específicos).

### Ver Cobros Existentes

1. Ve a **Cobros** en el sidebar
2. Verás lista de todos los cobros creados
3. Cada cobro muestra:
   - Nombre del cobro
   - Monto
   - Tipo (Colectivo o Individual)
   - Moneda (USD o VES)
   - Descripción

### Crear Cobro Colectivo

Un cobro colectivo se aplica a todos los apartamentos:

1. Ve a **Cobros**
2. Haz clic en **Nuevo Cobro**
3. Completa el formulario:
   - **Nombre:** Descripción del cobro (ej: "Cuota Marzo 2026")
   - **Tipo:** Selecciona "Colectivo"
   - **Monto:** Cantidad a cobrar
   - **Moneda:** USD o VES
   - **Descripción:** Detalles adicionales
4. Confirma

**Resultado automático:**
- Se genera una deuda para cada apartamento
- Los residentes recibirán notificaciones
- Las deudas aparecerán en sus dashboards

### Crear Cobro Individual

Un cobro individual se aplica solo a apartamentos específicos:

1. Ve a **Cobros**
2. Haz clic en **Nuevo Cobro**
3. Completa el formulario:
   - **Nombre:** Descripción del cobro
   - **Tipo:** Selecciona "Individual"
   - **Apartamento:** Selecciona la unidad
   - **Monto:** Cantidad a cobrar
   - **Moneda:** USD o VES
   - **Descripción:** Detalles adicionales
4. Confirma

**Resultado automático:**
- Se genera una deuda solo para ese apartamento
- El residente recibirá notificación
- La deuda aparecerá en su dashboard

### Conversión de Moneda

Si creas un cobro en VES, el sistema convierte automáticamente a USD usando la tasa de cambio configurada. Por ejemplo, con tasa 1 USD = 500 VES, un cobro de 3000 VES se convierte a $6.00 USD.

### Eliminar Cobro

Para eliminar un cobro:

1. Ve a **Cobros**
2. Selecciona el cobro
3. Haz clic en **Eliminar**
4. Confirma

**Nota:** Solo puedes eliminar cobros que no tengan pagos asociados.

## Generación de Reportes

### Descargar Reporte en PDF

1. En el dashboard, haz clic en el botón **PDF**
2. Se generará un archivo con:
   - Resumen de estadísticas (total apartamentos, pagados, pendientes)
   - Total adeudado y pendiente
   - Tabla detallada de todos los apartamentos
   - Estado de pago de cada unidad
   - Encabezados y pie de página con fecha de generación
3. El archivo se descargará automáticamente

### Descargar Reporte en Excel

1. En el dashboard, haz clic en el botón **Excel**
2. Se generará un archivo con:
   - Misma información que el PDF
   - Formato de hoja de cálculo para análisis adicional
   - Datos estructurados para importar a otros sistemas
3. El archivo se descargará automáticamente

### Contenido del Reporte

Ambos reportes incluyen:

- **Encabezado:** Nombre del condominio y mes
- **Resumen:** Total de apartamentos, pagados, pendientes, total adeudado, total pendiente
- **Tabla de Detalles:** Cada apartamento con su estado de pago
- **Pie de Página:** Fecha y hora de generación

### Ordenamiento en Reportes

Los reportes se generan con el ordenamiento actual del dashboard. Si quieres un reporte ordenado de forma diferente, cambia el ordenamiento antes de descargar.

## Configuración del Condominio

### Acceder a Configuración

1. Ve a **Configuración** en el sidebar
2. Verás las opciones disponibles

### Información General

En la sección General puedes configurar:

- **Nombre del Condominio:** Nombre que aparecerá en reportes y notificaciones
- **Número de Pisos:** Cantidad de pisos (1-20)
- **Apartamentos por Piso:** Cantidad de unidades por piso (1-50)

### Configuración de Cobros

En la sección de Cobros puedes configurar:

- **Cuota Base Mensual:** Monto que cada residente debe pagar mensualmente
- **Moneda por Defecto:** USD o VES
- **Tasa de Cambio:** Relación entre USD y VES (ej: 1 USD = 500 VES)
- **Día de Recordatorio:** Día del mes en que se envían recordatorios de pago

### Patrón de Nombres de Apartamentos

Puedes personalizar cómo se nombran los apartamentos:

- **Patrón Predeterminado:** Formato automático (ej: PB-A, 1-B, 2-C)
- **Patrón Personalizado:** Define tu propio formato

Después de cambiar el patrón, haz clic en **Generar Nombres** para aplicar el nuevo formato.

### Inicializar Estructura

Si es la primera vez configurando el condominio:

1. Ve a **Configuración**
2. Completa la información general
3. Haz clic en **Inicializar Estructura**
4. El sistema creará automáticamente todos los pisos y apartamentos

## Troubleshooting

### "No puedo aprobar un pago"

**Posibles causas y soluciones:**

El monto del pago supera la deuda pendiente. Solución: Rechaza el pago y pide al residente que registre el monto correcto.

Ya existe un pago del mismo mes aprobado. Solución: Verifica en el historial si ya fue procesado.

El pago está en estado incorrecto. Solución: Recarga la página y verifica el estado actual.

### "La deuda no se redujo después de aprobar"

**Soluciones:**

Recarga la página (F5) para actualizar los datos.

Verifica en el historial de pagos que el pago fue realmente aprobado.

Si persiste, contacta al equipo de soporte.

### "Un usuario no puede acceder"

**Posibles causas y soluciones:**

La cuenta está desactivada. Solución: Ve a Usuarios y reactiva la cuenta.

El usuario no tiene apartamento asignado. Solución: Asigna un apartamento en la sección de Usuarios.

Problemas de autenticación. Solución: Pide al usuario que limpie caché y cookies del navegador.

### "No puedo crear un cobro"

**Posibles causas y soluciones:**

Faltan campos obligatorios. Solución: Verifica que todos los campos estén completos.

El monto es inválido. Solución: Ingresa un monto positivo.

Problemas de permisos. Solución: Verifica que tengas rol de administrador.

### "Los reportes no se descargan"

**Soluciones:**

Espera unos segundos, el proceso de generación toma tiempo.

Verifica tu conexión a internet.

Intenta con otro navegador.

Desactiva bloqueadores de anuncios que puedan interferir con descargas.

### "La conversión de VES a USD es incorrecta"

**Solución:**

Verifica la tasa de cambio configurada en Configuración → Cobros. La conversión se realiza automáticamente usando esa tasa.

Si la tasa es incorrecta, actualízala y crea un nuevo cobro.

## 📞 Soporte

Para problemas técnicos:

1. Revisa esta guía
2. Consulta la sección de Troubleshooting
3. Contacta al equipo de soporte de Manus

---

**Última actualización:** Marzo 2026  
**Versión:** 2.0
