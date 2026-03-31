# Troubleshooting y FAQ - CondoAdmin Pro

## 🔧 Problemas Técnicos

### El servidor no inicia

**Error:** `Port 3000 is already in use`

**Solución:**

```bash
# Opción 1: Usar otro puerto
PORT=3001 pnpm dev

# Opción 2: Matar el proceso en puerto 3000
lsof -ti:3000 | xargs kill -9
pnpm dev
```

### Base de datos no conecta

**Error:** `Connection refused` o `ECONNREFUSED`

**Solución:**

1. Verifica que MySQL/TiDB esté ejecutándose
2. Verifica la variable `DATABASE_URL` (en Manus se inyecta automáticamente)
3. Prueba la conexión manualmente:

```bash
mysql -h localhost -u user -p database_name
```

### Migraciones no se aplican

**Error:** `Migration failed`

**Solución:**

En Manus, las migraciones se aplican automáticamente. Si necesitas aplicarlas manualmente en desarrollo:

```bash
# Generar migraciones (si hay cambios en schema)
pnpm drizzle-kit generate

# Aplicar migraciones (solo en desarrollo local)
pnpm drizzle-kit migrate

# Verificar estado
pnpm drizzle-kit studio
```

### Build falla con errores de TypeScript

**Error:** `error TS2307: Cannot find module`

**Solución:**

```bash
# Limpiar caché
rm -rf node_modules .pnpm-store

# Reinstalar dependencias
pnpm install

# Compilar
pnpm run build
```

### Componentes no se renderizan

**Error:** `Component not found` o `Module not found`

**Solución:**

1. Verifica que el archivo existe en la ruta correcta
2. Verifica los imports: `import { Component } from "@/components/..."`
3. Verifica que el alias `@` esté configurado en `tsconfig.json`

## 🔐 Problemas de Autenticación

### No puedo iniciar sesión

CondoAdmin Pro utiliza autenticación OAuth de Manus. Si tienes problemas:

| Problema | Solución |
|----------|----------|
| "Cuenta no encontrada" | Solicita al administrador que cree tu cuenta |
| "Autenticación fallida" | Verifica tu conexión a internet |
| "Página en blanco" | Limpia caché y cookies del navegador |
| "Redireccionamiento infinito" | Intenta en otro navegador |

### Token expirado

**Error:** `Unauthorized` o `Token expired`

**Solución:**

- Recarga la página
- Cierra sesión y vuelve a iniciar
- Limpia cookies del navegador (Ctrl+Shift+Delete)

### OAuth no funciona

**Error:** `OAuth callback failed`

**Solución:**

1. Verifica que tengas conexión a internet
2. Verifica que el servidor de Manus esté disponible
3. Intenta en otro navegador
4. Limpia caché del navegador

## 💾 Problemas de Datos

### Los datos no se guardan

| Causa | Solución |
|-------|----------|
| Conexión a BD perdida | Verifica conexión a MySQL |
| Validación fallida | Revisa los errores en consola (F12) |
| Permisos insuficientes | Verifica que tengas rol de administrador |
| Transacción fallida | Intenta nuevamente |

### Deuda no se reduce después de aprobar pago

**Solución:**

1. Recarga la página (F5) para actualizar datos
2. Verifica en el historial de pagos que fue realmente aprobado
3. Verifica que el monto sea correcto
4. Si persiste, contacta soporte

### Notificaciones no se envían

| Causa | Solución |
|-------|----------|
| Email incorrecto | Verifica email en tu perfil |
| Spam | Revisa carpeta de spam |
| Servidor de notificaciones caído | Espera y intenta después |

### Comprobante de pago no se carga

| Causa | Solución |
|-------|----------|
| Archivo muy grande | Comprime a menos de 5MB |
| Formato no válido | Usa JPG, PNG o PDF |
| Conexión lenta | Intenta con conexión mejor |
| Servidor caído | Espera y intenta después |

## 📊 Problemas de Reportes

### Reporte no se genera o descarga

**Solución:**

1. Espera 5-10 segundos (la generación toma tiempo)
2. Recarga la página
3. Verifica que haya datos para ese mes
4. Verifica que tengas rol de administrador
5. Intenta con otro navegador

### Reporte vacío o con datos incompletos

**Solución:**

- Verifica que haya pagos/deudas en ese mes
- Verifica que el mes seleccionado sea correcto
- Intenta con otro mes
- Recarga la página

### No puedo descargar PDF/Excel

**Solución:**

1. Verifica que el navegador permita descargas
2. Verifica espacio disponible en disco
3. Intenta con otro navegador
4. Verifica permisos de carpeta Descargas
5. Desactiva bloqueadores de anuncios

### Tabla de apartamentos en PDF está mal formateada

**Solución:**

- La tabla debe verse correctamente con encabezados y datos alineados
- Si ves páginas en blanco, intenta descargar nuevamente
- Si persiste, contacta soporte

## 🎨 Problemas de Interfaz

### Página no carga correctamente

**Solución:**

1. Limpia caché del navegador (Ctrl+Shift+Delete)
2. Recarga la página (Ctrl+F5)
3. Intenta con otro navegador
4. Verifica conexión a internet

### Elementos desalineados o mal formateados

**Solución:**

1. Verifica que uses navegador moderno (Chrome, Firefox, Safari, Edge)
2. Verifica resolución de pantalla
3. Zoom al 100% (Ctrl+0)
4. Limpia caché

### Botones no responden

**Solución:**

1. Verifica que no haya petición pendiente (espera)
2. Recarga la página
3. Verifica conexión a internet
4. Intenta con otro navegador

### Nombre de apartamento no aparece en sidebar

**Solución:**

1. Recarga la página
2. Verifica que tengas un apartamento asignado
3. Contacta al administrador si no tienes apartamento asignado

## 🔄 Problemas de Performance

### Aplicación lenta

**Solución:**

1. Verifica conexión a internet
2. Verifica que no haya muchas pestañas abiertas
3. Limpia caché del navegador
4. Reinicia el servidor: `pnpm dev`

### Dashboard tarda en cargar

**Solución:**

1. Espera a que cargue completamente
2. Verifica conexión a internet
3. Intenta con otro navegador
4. Limpia caché

### Servidor consume mucha memoria

**Solución:**

```bash
# En desarrollo
pnpm dev

# En producción
pm2 restart condoadmin
```

## 💰 Problemas de Pagos y Deudas

### Cobro en VES se muestra como USD incorrecto

**Solución:**

Verifica la tasa de cambio configurada en Configuración. La conversión se realiza automáticamente. Por ejemplo, con tasa 1 USD = 500 VES, un cobro de 3000 VES se convierte a $6.00 USD.

### Apartamento no aparece en dashboard

**Solución:**

1. Recarga la página
2. Verifica que el apartamento tenga deuda o esté asignado
3. Intenta cambiar el ordenamiento (por Piso, Deuda Mayor/Menor)
4. Si sigue sin aparecer, contacta soporte

### Deuda individual no se suma a deuda total

**Solución:**

1. Recarga la página
2. Verifica que la deuda individual esté creada correctamente
3. Verifica que el apartamento sea el correcto
4. Si persiste, contacta soporte

## 🐛 Reportar Bugs

### Información a proporcionar

Cuando reportes un bug, incluye:

1. **Descripción:** ¿Qué pasó?
2. **Pasos para reproducir:** ¿Cómo lo causaste?
3. **Resultado esperado:** ¿Qué debería pasar?
4. **Resultado actual:** ¿Qué pasó en su lugar?
5. **Navegador:** Chrome, Firefox, Safari, Edge
6. **Sistema Operativo:** Windows, Mac, Linux
7. **Rol:** ¿Eres administrador o residente?
8. **Logs:** Errores de consola (F12 → Console)

### Dónde reportar

Para reportar bugs o solicitar features:

1. Contacta al administrador del condominio
2. Contacta al equipo de soporte de Manus
3. Abre un issue en el repositorio del proyecto

## 📞 Contacto de Soporte

| Canal | Información |
|-------|------------|
| **Administrador del Condominio** | Contacto local |
| **Soporte Manus** | https://help.manus.im |
| **Documentación** | Ver guías en el proyecto |

## ❓ Preguntas Frecuentes

### ¿Cuánto tiempo tarda la aprobación de un pago?

Generalmente entre 24-48 horas. Recibirás una notificación cuando se procese.

### ¿Qué pasa si mi pago es rechazado?

Recibirás una notificación con la razón. Puedes contactar al administrador y registrar un nuevo pago.

### ¿Puedo ver pagos de meses anteriores?

Sí, en tu historial de pagos verás los últimos 12 registros. Para ver más, contacta al administrador.

### ¿Cómo cambio mi apartamento?

No puedes hacerlo directamente. Contacta al administrador del condominio.

### ¿Es segura la plataforma?

Sí. Utiliza autenticación OAuth segura y encriptación para proteger tus datos.

### ¿Qué monedas se soportan?

Se soportan USD y VES. La conversión se realiza automáticamente usando la tasa configurada.

### ¿Puedo descargar comprobantes de pago?

Sí, si tu pago fue aprobado. El administrador puede proporcionarte los comprobantes.

### ¿Qué hago si olvidé mi contraseña?

CondoAdmin Pro usa autenticación OAuth de Manus. Si tienes problemas, contacta al administrador.

---

**Última actualización:** Marzo 2026  
**Versión:** 2.0
