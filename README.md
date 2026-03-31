# CondoAdmin Pro - Sistema Integral de Administración de Condominios

**CondoAdmin Pro** es una plataforma web moderna y completa para la administración de condominios, diseñada para simplificar la gestión de pagos, deudas, usuarios y reportes.

## 🎯 Características Principales

### Para Administradores
- **Dashboard ejecutivo** con métricas en tiempo real (total de apartamentos, pagos al día, deudas pendientes)
- **Gestión de pagos** con aprobación/rechazo de comprobantes
- **Liquidación automática** de deudas al aprobar pagos
- **Generación de reportes** mensuales en PDF y Excel
- **Gestión de usuarios** (residentes, admins, aprobación)
- **Auditoría completa** de todas las acciones
- **Notificaciones** en tiempo real

### Para Residentes
- **Dashboard personal** con estado de deudas y pagos
- **Carga de comprobantes** de pago con almacenamiento en S3
- **Historial de pagos** y deudas
- **Notificaciones** de pagos aprobados/rechazados
- **Perfil personal** con información de contacto

### Características Técnicas
- **Transacciones ACID** para integridad de datos
- **Validaciones robustas** de pagos y deudas
- **Paginación inteligente** para mejor performance
- **Almacenamiento en S3** para comprobantes
- **Notificaciones** en tiempo real
- **Autenticación OAuth** segura
- **Suite completa de pruebas** (88+ tests)
- **Responsive design** para móvil y desktop

## 🚀 Inicio Rápido

### Requisitos
- Node.js 22+
- pnpm
- MySQL/TiDB

### Instalación

```bash
# Clonar repositorio
git clone <repository-url>
cd condominio-admin

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env

# Ejecutar migraciones
pnpm drizzle-kit generate
pnpm drizzle-kit migrate

# Iniciar servidor de desarrollo
pnpm dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📊 Estructura del Proyecto

```
condominio-admin/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── pages/         # Páginas por rol (admin, user)
│   │   ├── components/    # Componentes reutilizables
│   │   ├── lib/           # Utilidades y configuración
│   │   └── App.tsx        # Rutas y layout
│   └── public/            # Archivos estáticos
├── server/                # Backend Express + tRPC
│   ├── routers.ts         # APIs tRPC
│   ├── db.ts              # Funciones de base de datos
│   ├── storage.ts         # Integración S3
│   └── _core/             # Configuración interna
├── drizzle/               # Migraciones y schema
└── shared/                # Código compartido
```

## 🔐 Seguridad

- **OAuth 2.0** para autenticación
- **JWT** para sesiones
- **ACID transactions** para consistencia de datos
- **Validaciones** en cliente y servidor
- **Rate limiting** en APIs
- **Auditoría** de todas las acciones

## 📈 Performance

- **Paginación** en todas las listas
- **Lazy loading** de imágenes
- **Caché** en frontend
- **Índices** en base de datos
- **Compresión gzip** en respuestas
- **Bundle size** optimizado

## 🧪 Testing

```bash
# Ejecutar pruebas
pnpm test

# Ejecutar pruebas con cobertura
pnpm test:coverage

# Ejecutar build de producción
pnpm build
```

## 📚 Documentación Adicional

- [Guía del Administrador](./docs/ADMIN_GUIDE.md)
- [Guía del Usuario](./docs/USER_GUIDE.md)
- [Documentación de API](./docs/API_DOCUMENTATION.md)
- [Arquitectura del Sistema](./docs/ARCHITECTURE.md)
- [Procedimientos](./docs/PROCEDURES.md)
- [Troubleshooting](./docs/TROUBLESHOOTING.md)

## 🔄 Roadmap Futuro

### Fase 1: Seguridad (✅ Completado)
- Transacciones ACID
- Validaciones robustas
- Control de concurrencia

### Fase 2: UX (✅ Completado)
- Tablas avanzadas con búsqueda
- Filtros y ordenamiento
- Paginación

### Fase 3: Notificaciones (✅ Completado)
- Sistema de notificaciones in-app
- Email de confirmación
- Recordatorios automáticos

### Fase 4: Almacenamiento (✅ Completado)
- Comprobantes en S3
- Validación de archivos
- Thumbnails

### Fase 5: Reportes (✅ Completado)
- Reportes mensuales
- Exportación PDF/Excel
- Historial de pagos

### Fase 6: Testing (✅ Completado)
- Suite de pruebas unitarias
- 88+ tests pasando
- Cobertura completa

### Fase 7: Performance (🔄 En progreso)
- Paginación avanzada
- Lazy loading
- Caché en frontend

### Fase 8: UX Mejorada (✅ Completado)
- Diálogos de confirmación
- Estados de carga
- Historial de notificaciones

### Fase 9: Documentación (🔄 En progreso)
- Guías de usuario
- Documentación técnica
- Manuales de procedimientos

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor, lee [CONTRIBUTING.md](./CONTRIBUTING.md) para más detalles.

## 📞 Soporte

Para reportar bugs o solicitar features, abre un issue en el repositorio.

## 📄 Licencia

Este proyecto está bajo licencia MIT. Ver [LICENSE](./LICENSE) para más detalles.

## 👥 Autores

Desarrollado por el equipo de CondoAdmin Pro.

---

**Versión:** 1.0.0  
**Última actualización:** Marzo 2026
