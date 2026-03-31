# Proyecto: Sistema de Administración de Condominio

## Base de Datos
- [x] Diseñar y crear esquema completo (usuarios, configuración, cobros, pagos, recordatorios)
- [x] Crear migraciones SQL para todas las tablas
- [x] Implementar relaciones y restricciones

## Backend - APIs
- [x] API de autenticación (login, logout, JWT)
- [x] API de configuración del condominio (pisos, apartamentos, moneda)
- [x] API de gestión de cobros (crear, editar, eliminar)
- [x] API de gestión de pagos (cargar, aprobar, rechazar)
- [x] API de historial de pagos
- [x] API de recordatorios (crear, actualizar, enviar)
- [x] API de gestión de usuarios (crear, editar, listar)
- [x] API de dashboard (estado de pagos, deudas)

## Frontend - Autenticación
- [x] Página de login
- [x] Integración JWT
- [x] Protección de rutas

## Frontend - Dashboard
- [x] Dashboard administrativo principal
- [x] Vista de estado de pagos (verde/rojo)
- [x] Visualización de deudas pendientes

## Frontend - Gestión de Usuarios
- [x] Página de listado de usuarios
- [x] Crear nuevo usuario
- [x] Editar usuario
- [x] Asignar apartamentos a usuarios

## Frontend - Gestión de Cobros
- [x] Página de listado de cobros
- [x] Crear cobro adicional
- [x] Editar cobro
- [x] Configurar mensualidad base

## Frontend - Configuración
- [x] Página de configuración del condominio
- [x] Configurar pisos y apartamentos
- [x] Configurar monedas y tasa de cambio
- [x] Configurar recordatorios

## Frontend - Módulo de Pagos
- [x] Página para cargar pagos (usuarios)
- [x] Formulario con número de comprobante e imagen
- [x] Página de revisión de pagos (admin)
- [x] Aprobar/rechazar pagos
- [x] Historial de pagos

## Datos de Prueba
- [x] Crear usuario administrador
- [x] Crear usuarios residentes
- [x] Crear cobros de ejemplo
- [x] Crear pagos de ejemplo
- [x] Configurar recordatorios de ejemplo

## Pruebas y Despliegue
- [ ] Pruebas funcionales completas
- [ ] Verificar flujos de autenticación
- [ ] Verificar cálculos de deudas
- [x] Desplegar en servidor
- [x] Verificar acceso desde internet


## Mejoras Solicitadas - Fase 2
- [x] Agregar campo de aprobación a tabla de usuarios
- [x] Implementar API de aprobación/rechazo de usuarios
- [x] Mejorar página de configuración con formulario editable
- [x] Crear página de gestión de solicitudes de usuarios pendientes
- [x] Crear usuario de prueba para Apartamento 1
- [x] Implementar validación de usuario aprobado en login
- [x] Actualizar menú lateral según rol del usuario


## Fase 3 - Validación de Flujo de Usuario
- [x] Crear usuario sin aprobar para Apartamento 2 (María García)
- [x] Verificar que aparezca en Solicitudes del admin
- [x] Verificar dashboard del usuario (información del apartamento)
- [x] Verificar módulo de carga de pagos del usuario
- [x] Probar flujo completo: solicitud → aprobación → acceso


## Fase 4 - Personalización de Apartamentos
- [x] Agregar campo de patrón de nombres a configuración
- [x] Crear API para generar nombres según patrón
- [x] Crear página de administración de nombres de apartamentos
- [x] Implementar edición manual de nombres individuales
- [x] Integrar en configuración del condominio


## Fase 5 - Mejora de Patrones con Letras
- [x] Agregar soporte para variable {letra} en generación de nombres
- [x] Crear función para convertir números a letras (1→A, 2→B, etc.)
- [x] Mejorar página de Apartamentos con vista previa en tiempo real
- [x] Agregar ejemplos de patrones (PB-A, 1-A, Apt-{piso}{letra}, etc.)
- [x] Probar y validar todos los patrones posibles


### Fase 6 - Correción de Bugs y Patrón Mejorado
- [x] Investigar y corregir bug: generación solo en Planta Baja
- [x] Crear función de patrón inteligente (PB para piso 0, números para otros)
- [x] Actualizar patrón por defecto en base de datos
- [x] Probar generación en todos los pisos (PB, 1, 2, 3, 4)


## Fase 7 - Corrección de Consistencia de Nomenclatura
- [x] Verificar que generación de nombres persiste en BD
- [x] Corregir lógica de cálculo de letra (extraer último dígito)
- [x] Actualizar todos los nombres en la BD con patrón correcto
- [x] Actualizar APIs para retornar unitName con JOIN a apartments
- [x] Corregir Dashboard para usar unitName de la BD
- [x] Corregir Gestión de Usuarios para usar unitName de la BD
- [x] Corregir Revisión de Pagos para usar unitName de la BD
- [x] Corregir Gestión de Solicitudes para usar unitName de la BD
- [x] Auditar y corregir todas las secciones


## Fase 8 - Mejoras de Gestión de Usuarios
- [x] Agregar campo isActive a tabla de usuarios
- [x] Crear API para cambiar rol de usuario
- [x] Crear API para eliminar usuario
- [x] Crear API para activar/desactivar usuario
- [x] Validar isActive en login
- [x] Mejorar UI con botones de acción
- [x] Probar todas las funcionalidades


## Fase 9 - Limpieza de Datos y Cobros Individuales
- [x] Limpiar base de datos: eliminar deudas y pagos de prueba
- [x] Agregar campo apartmentId opcional a tabla de cobros
- [x] Actualizar API de creación de cobros para soportar cobros individuales
- [x] Mejorar UI del formulario de cobros con checkbox y selector
- [x] Probar cobros individuales y globales


## Fase 10 - Corrección de Cálculos del Dashboard
- [x] Auditar API del dashboard para identificar problema
- [x] Actualizar cálculo de total de apartamentos desde tabla apartments
- [x] Actualizar cálculo de "Al día" y "Con deuda"
- [x] Probar que los totales sean correctos (30, 30, 0, $0.00)


## Fase 11 - Corrección de Bug de Solicitudes
- [x] Auditar API de rechazo de solicitudes
- [x] Auditar frontend para verificar filtrado
- [x] Corregir API o frontend según sea necesario
- [x] Probar que solicitudes rechazadas desaparecen


## Fase 12 - Generación Automática de Deudas
- [x] Crear función para generar deudas a partir de cobros
- [x] Actualizar API de creación de cobros para generar deudas
- [x] Probar cobros globales generan deudas en todos los apartamentos
- [x] Probar cobros individuales generan deuda en apartamento específico
- [x] Verificar dashboard refleja deudas correctamente


## Fase 13 - Eliminación de Deudas al Eliminar Cobros
- [x] Verificar si existe relación entre charges y monthlyDebts
- [x] Agregar campo chargeId a monthlyDebts si es necesario
- [x] Actualizar función generateDebtsFromCharge para guardar chargeId
- [x] Actualizar API de eliminación de cobros para eliminar deudas asociadas
- [x] Limpiar deudas huérfanas de cobros eliminados previamente


## Fase 14 - Simplificación del Sistema de Cobros
- [x] Eliminar campos baseFeeAmount y additionalCharges de monthlyDebts
- [x] Actualizar generateDebtsFromCharge para usar solo monto del cobro
- [x] Eliminar checkbox isRecurring del formulario
- [x] Simplificar UI para mostrar solo totalDue
- [x] Probar que cobros de $5 generan deudas de $5
- [x] Limpiar base de datos de deudas antiguas


## Fase 15 - Liquidación de Pagos
- [x] Crear función de liquidación de pagos en backend
- [x] Actualizar API de aprobación de pagos para aplicar liquidación
- [x] Probar que deudas se reducen al aprobar pagos
- [x] Verificar que dashboard refleja cambios correctamente


## PLAN UNIFICADO - FASE 1: Transacciones ACID y Validaciones
- [x] Implementar función `approvePaymentWithValidations()` en db.ts
- [x] Validar que monto del pago <= deuda pendiente (validatePaymentAmount)
- [x] Prevenir pagos duplicados (checkDuplicatePayment)
- [x] Validar rango de fechas (validatePaymentMonth)
- [x] Implementar control de concurrencia
- [x] Actualizar routers.ts para usar transacciones en payments.approve
- [x] Crear pruebas unitarias en phase1.validations.test.ts
- [ ] Verificar funcionamiento en navegador
- [ ] Crear checkpoint de Fase 1


## PLAN UNIFICADO - FASE 2: Mejoras de UX - Tablas Avanzadas

- [x] Crear componente reutilizable de tabla avanzada (AdvancedTable.tsx)
- [x] Agregar búsqueda por texto en tablas
- [x] Implementar filtros por estado y mes/fecha
- [x] Implementar ordenamiento por columnas
- [x] Agregar paginación inteligente
- [x] Mejorar UI de tablas con indicadores visuales
- [x] Actualizar PaymentReview.tsx con búsqueda y filtros
- [x] Agregar vista de tabla y vista de tarjetas
- [x] Agregar panel de detalles del pago seleccionado
- [x] Compilación sin errores
- [x] Pruebas unitarias pasando
- [x] Verificar funcionamiento en navegador
- [ ] Crear checkpoint de Fase 2


## PLAN UNIFICADO - FASE 3: Notificaciones

- [x] Crear tabla de notificaciones en schema.ts
- [x] Generar migración SQL con drizzle-kit
- [x] Ejecutar migración en base de datos
- [x] Crear funciones de notificaciones en db.ts
- [x] Crear API de notificaciones en routers.ts (list, unread, unreadCount, markAsRead, markAllAsRead)
- [x] Integrar notificación al aprobar pago
- [x] Integrar notificación al rechazar pago
- [x] Crear componente NotificationCenter en frontend
- [x] Agregar badge de notificaciones sin leer
- [x] Compilación sin errores
- [x] Pruebas unitarias pasando
- [ ] Crear página de historial de notificaciones
- [ ] Crear checkpoint de Fase 3


## PLAN UNIFICADO - FASE 4: Almacenamiento S3

- [x] Agregar columnas voucherImageUrl y voucherImageKey a tabla payments
- [x] Generar migracion SQL con drizzle-kit
- [x] Ejecutar migracion en base de datos
- [x] Crear funcion uploadPaymentVoucher() en db.ts
- [x] Crear funcion getPaymentVoucherUrl() en db.ts
- [x] Crear funcion deletePaymentVoucher() en db.ts
- [x] Crear API payments.uploadVoucher en routers.ts
- [x] Crear API payments.getVoucher en routers.ts
- [x] Agregar validacion de tipo MIME
- [x] Agregar validacion de tamano maximo (5MB)
- [x] Crear componente VoucherUpload.tsx
- [x] Crear componente VoucherViewer.tsx
- [ ] Integrar en PaymentForm.tsx
- [ ] Integrar en PaymentReview.tsx
- [ ] Crear pruebas unitarias
- [ ] Crear checkpoint de Fase 4


## PLAN UNIFICADO - FASE 5: Reportes

- [x] Instalar librerías pdfkit y exceljs
- [x] Crear funciones de reportes en db.ts:
  - [x] getMonthlyReportData()
  - [x] getUserPaymentsSummary()
  - [x] getMonthlyDebtsSummary()
  - [x] getPaymentsByStatus()
  - [x] generateReportJSON()
- [x] Crear APIs en routers.ts:
  - [x] reports.monthlyData
  - [x] reports.userSummary
  - [x] reports.debtsSummary
  - [x] reports.paymentsByStatus
  - [x] reports.exportJSON
- [ ] Crear componente ReportGenerator.tsx
- [ ] Crear componente ReportViewer.tsx
- [ ] Agregar pagina Reports.tsx en admin
- [ ] Agregar pagina MyReports.tsx en user
- [ ] Crear pruebas unitarias
- [ ] Crear checkpoint de Fase 5
