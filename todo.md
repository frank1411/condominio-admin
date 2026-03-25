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
