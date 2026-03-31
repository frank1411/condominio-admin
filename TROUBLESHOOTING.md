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
2. Verifica la variable `DATABASE_URL` en `.env`
3. Prueba la conexión:
```bash
mysql -h localhost -u user -p database_name
```

### Migraciones no se aplican

**Error:** `Migration failed`

**Solución:**
```bash
# Generar migraciones
pnpm drizzle-kit generate

# Aplicar migraciones
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

**Posibles causas:**

| Causa | Solución |
|-------|----------|
| Cuenta no aprobada | Contacta al administrador |
| Contraseña incorrecta | Usa "Olvidé mi contraseña" |
| Cuenta desactivada | Contacta al administrador |
| Email incorrecto | Verifica que sea el correcto |

### Token expirado

**Error:** `Unauthorized` o `Token expired`

**Solución:**
- Recarga la página
- Cierra sesión y vuelve a iniciar
- Limpia cookies del navegador

### OAuth no funciona

**Error:** `OAuth callback failed`

**Solución:**
1. Verifica que `VITE_OAUTH_PORTAL_URL` esté configurado
2. Verifica que `VITE_APP_ID` sea correcto
3. Verifica la conexión a internet

## 💾 Problemas de Datos

### Los datos no se guardan

**Posibles causas:**

| Causa | Solución |
|-------|----------|
| Conexión a BD perdida | Verifica conexión a MySQL |
| Validación fallida | Revisa los errores en consola |
| Permisos insuficientes | Verifica rol del usuario |
| Transacción fallida | Intenta nuevamente |

### Deuda no se reduce después de aprobar pago

**Solución:**
1. Recarga la página (F5)
2. Verifica en la auditoría que el pago fue procesado
3. Verifica que el monto sea correcto
4. Si persiste, contacta soporte

### Notificaciones no se envían

**Posibles causas:**

| Causa | Solución |
|-------|----------|
| Email incorrecto | Verifica email en perfil |
| Spam | Revisa carpeta de spam |
| Servidor de email caído | Espera y intenta después |
| Notificaciones desactivadas | Activa en Configuración |

### Comprobante no se carga

**Posibles causas:**

| Causa | Solución |
|-------|----------|
| Archivo muy grande | Comprime a menos de 5MB |
| Formato no válido | Usa JPG, PNG o PDF |
| Conexión lenta | Intenta con conexión mejor |
| Servidor S3 caído | Espera y intenta después |

## 📊 Problemas de Reportes

### Reporte no se genera

**Solución:**
1. Espera 30 segundos (generación puede ser lenta)
2. Recarga la página
3. Verifica que haya datos para ese mes
4. Verifica permisos de usuario

### Reporte vacío

**Solución:**
- Verifica que haya pagos/deudas en ese mes
- Verifica que el mes seleccionado sea correcto
- Intenta con otro mes

### No puedo descargar PDF/Excel

**Solución:**
1. Verifica que el navegador permita descargas
2. Verifica espacio en disco
3. Intenta con otro navegador
4. Verifica permisos de carpeta Descargas

## 🎨 Problemas de Interfaz

### Página no carga correctamente

**Solución:**
1. Limpia caché del navegador (Ctrl+Shift+Delete)
2. Recarga la página (Ctrl+F5)
3. Intenta con otro navegador
4. Verifica conexión a internet

### Elementos desalineados o mal formateados

**Solución:**
1. Verifica que uses navegador moderno (Chrome, Firefox, Safari)
2. Verifica resolución de pantalla
3. Zoom al 100% (Ctrl+0)
4. Limpia caché

### Botones no responden

**Solución:**
1. Verifica que no haya petición pendiente (espera)
2. Recarga la página
3. Verifica conexión a internet
4. Intenta con otro navegador

### Imágenes no se cargan

**Solución:**
1. Verifica conexión a internet
2. Verifica que S3 esté disponible
3. Recarga la página
4. Limpia caché

## 🔄 Problemas de Performance

### Aplicación lenta

**Solución:**
1. Verifica conexión a internet
2. Verifica que no haya muchas pestañas abiertas
3. Limpia caché del navegador
4. Reinicia el servidor: `pnpm dev`

### Tablas lentas con muchos datos

**Solución:**
1. Usa paginación (automática)
2. Usa filtros para reducir resultados
3. Usa búsqueda para encontrar datos específicos

### Servidor consume mucha memoria

**Solución:**
```bash
# Reinicia el servidor
pnpm dev

# O en producción
pm2 restart app
```

## 🐛 Reportar Bugs

### Información a proporcionar

Cuando reportes un bug, incluye:

1. **Descripción:** ¿Qué pasó?
2. **Pasos para reproducir:** ¿Cómo lo causaste?
3. **Resultado esperado:** ¿Qué debería pasar?
4. **Resultado actual:** ¿Qué pasó en su lugar?
5. **Navegador:** Chrome, Firefox, Safari, etc.
6. **Versión:** ¿Qué versión de la app?
7. **Logs:** Errores de consola (F12)

### Dónde reportar

1. Abre un issue en GitHub
2. Contacta al equipo de soporte
3. Envía email a support@condoadmin.pro

## 📞 Contacto de Soporte

| Canal | Información |
|-------|------------|
| **Email** | support@condoadmin.pro |
| **Teléfono** | +58 (414) 123-4567 |
| **Chat** | En la aplicación |
| **GitHub** | github.com/condoadmin/issues |

---

**Última actualización:** Marzo 2026
