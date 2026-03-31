# CondoAdmin Pro - Sistema Integral de Administración de Condominios

**CondoAdmin Pro** es una plataforma web moderna y completa para la administración de condominios, diseñada para simplificar la gestión de pagos, deudas, usuarios y reportes.

## 🎯 Características Principales

### Para Administradores

CondoAdmin Pro proporciona a los administradores un conjunto completo de herramientas para gestionar eficientemente el condominio. El dashboard ejecutivo muestra métricas en tiempo real incluyendo el total de apartamentos, cantidad de pagos al día, cantidad de deudas pendientes y el monto total adeudado. Los administradores pueden revisar y aprobar pagos cargados por residentes, gestionar usuarios y sus permisos, crear cobros colectivos (para todos) o individuales (para apartamentos específicos), generar reportes mensuales en PDF y Excel, y configurar parámetros del condominio como cuota base, tasa de cambio y patrones de nombres de apartamentos.

### Para Residentes

Los residentes tienen acceso a un portal personalizado donde pueden ver su dashboard con estado de deudas y pagos, consultar el historial de sus últimos 12 pagos registrados, ver el detalle de deudas pendientes organizadas por mes, recibir notificaciones sobre aprobaciones y rechazos de pagos, y acceder a su información de perfil incluyendo el nombre de su apartamento.

### Características Técnicas

La plataforma está construida con tecnología moderna y robusta. Utiliza tRPC para comunicación end-to-end con type-safety, Drizzle ORM para gestión de base de datos con migraciones versionadas, validación de datos con Zod en cliente y servidor, autenticación OAuth segura integrada con Manus, y conversión automática de monedas VES a USD usando tasa de cambio configurable. Incluye suite de pruebas unitarias con 7 suites activas, responsive design para móvil y desktop, y sistema de notificaciones integrado.

## 🚀 Inicio Rápido

### Requisitos

Para ejecutar CondoAdmin Pro necesitas Node.js 22 o superior, pnpm como gestor de paquetes, y una base de datos MySQL 8+ o TiDB.

### Instalación

Para instalar y ejecutar el proyecto localmente:

```bash
# Clonar repositorio
git clone <repository-url>
cd condominio-admin

# Instalar dependencias
pnpm install

# Configurar variables de entorno
# Las variables se inyectan automáticamente en Manus
# Para desarrollo local, copia .env.example a .env

# Ejecutar migraciones de base de datos
pnpm drizzle-kit generate
pnpm drizzle-kit migrate

# Iniciar servidor de desarrollo
pnpm dev
```

La aplicación estará disponible en `http://localhost:3000`. El servidor incluye hot-reload automático para cambios en código.

## 📊 Estructura del Proyecto

```
condominio-admin/
├── client/                 # Frontend React 19 + Tailwind 4
│   ├── src/
│   │   ├── pages/         # Páginas por rol (admin, user)
│   │   ├── components/    # Componentes reutilizables (DashboardLayout, etc)
│   │   ├── lib/           # Utilidades y configuración (tRPC client)
│   │   └── App.tsx        # Rutas y layout principal
│   └── public/            # Archivos estáticos
├── server/                # Backend Express + tRPC
│   ├── routers.ts         # APIs tRPC (34+ procedimientos)
│   ├── db.ts              # Funciones de base de datos
│   ├── exports.ts         # Generación de PDF y Excel
│   └── _core/             # Configuración interna (OAuth, context, etc)
├── drizzle/               # Migraciones y schema de base de datos
└── shared/                # Código compartido entre cliente y servidor
```

## 🔐 Seguridad

CondoAdmin Pro implementa múltiples capas de seguridad. Utiliza OAuth 2.0 para autenticación segura, JWT para sesiones, validaciones en cliente y servidor para prevenir inyecciones, control de acceso basado en roles (admin/usuario), y auditoría de todas las acciones administrativas.

## 📈 Performance

La plataforma está optimizada para performance. Implementa lazy loading de componentes, caché en frontend, índices en base de datos en campos clave, compresión gzip en respuestas, y bundle size optimizado. El ordenamiento flexible en el dashboard permite a administradores ver datos en el orden que prefieran sin recargar la página.

## 🧪 Testing

```bash
# Ejecutar todas las pruebas
pnpm test

# Ejecutar pruebas de un archivo específico
pnpm test phase16

# Ver cobertura de pruebas
pnpm test:coverage

# Build de producción
pnpm build
```

Actualmente hay 7 suites de pruebas unitarias que validan funcionalidades críticas incluyendo validación de deudas, conversión de moneda, y generación de reportes.

## 📚 Documentación Adicional

- [Guía del Administrador](./ADMIN_GUIDE.md) - Instrucciones completas para administradores
- [Guía del Usuario](./USER_GUIDE.md) - Manual para residentes
- [Guía de Despliegue](./DEPLOYMENT.md) - Instrucciones de deployment
- [Troubleshooting](./TROUBLESHOOTING.md) - Solución de problemas comunes

## 🔄 Roadmap Futuro

### Fases Completadas

**Fase 1: Seguridad** - Implementadas transacciones ACID, validaciones robustas y control de concurrencia.

**Fase 2: Gestión de Pagos** - Implementado sistema completo de registro, aprobación y rechazo de pagos.

**Fase 3: Notificaciones** - Sistema de notificaciones in-app integrado.

**Fase 4: Reportes** - Exportación de reportes en PDF y Excel con múltiples formatos.

**Fase 5: Testing** - Suite de pruebas unitarias con 7 suites activas.

**Fase 6: Conversión de Moneda** - Conversión automática VES a USD con tasa configurable.

**Fase 7: Ordenamiento Flexible** - Múltiples opciones de ordenamiento en dashboard.

### Fases Futuras

**Fase 8: Búsqueda y Filtros** - Búsqueda de apartamentos y filtros avanzados en dashboard.

**Fase 9: Recordatorios Automáticos** - Envío automático de recordatorios a residentes con deuda vencida.

**Fase 10: Reportes Históricos** - Reportes por rango de fechas para análisis histórico.

**Fase 11: Comprobantes Descargables** - Residentes puedan descargar comprobantes de pago.

**Fase 12: Notificaciones por Correo** - Envío de notificaciones por correo electrónico.

## 🤝 Contribuir

Las contribuciones son bienvenidas. Por favor, lee [CONTRIBUTING.md](./CONTRIBUTING.md) para más detalles sobre el proceso de contribución.

## 📞 Soporte

Para reportar bugs o solicitar features, abre un issue en el repositorio. Para soporte técnico, contacta al equipo de Manus.

## 📄 Licencia

Este proyecto está bajo licencia MIT. Ver [LICENSE](./LICENSE) para más detalles.

## 👥 Autores

Desarrollado por el equipo de CondoAdmin Pro.

---

**Versión:** 2.0  
**Última actualización:** Marzo 2026
