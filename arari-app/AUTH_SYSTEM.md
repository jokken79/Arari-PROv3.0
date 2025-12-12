# Sistema de Autenticación - 粗利 PRO

## Descripción General

El sistema de autenticación está completamente implementado y puede ser activado/desactivado mediante la variable de entorno `NEXT_PUBLIC_ENABLE_AUTH`.

## Estado Actual

✅ **ACTIVADO** - `NEXT_PUBLIC_ENABLE_AUTH=true` en `.env.local`

## Componentes Implementados

### 1. Hook de Autenticación (`src/hooks/useAuth.ts`)

Hook personalizado que maneja todo el estado de autenticación:

```typescript
const {
  isAuthenticated,  // boolean - Usuario autenticado
  user,             // User | null - Datos del usuario
  isLoading,        // boolean - Estado de carga
  token,            // string | null - Token JWT
  login,            // (credentials) => Promise - Función de login
  logout            // () => Promise - Función de logout
} = useAuth()
```

**Características:**
- Auto-verificación de token al cargar la aplicación
- Almacenamiento en localStorage (auth_token, user)
- Validación de token mediante endpoint `/api/auth/me`
- Manejo automático de tokens expirados

### 2. Componente AuthGuard (`src/components/auth/AuthGuard.tsx`)

Protección de rutas del lado del cliente:

**Funcionalidad:**
- Respeta la variable `NEXT_PUBLIC_ENABLE_AUTH`
- Redirige a `/login` si no está autenticado
- Redirige a `/` si ya está autenticado e intenta acceder a `/login`
- Muestra loading state durante verificación
- Rutas públicas: `/login`

### 3. Middleware (`src/middleware.ts`)

Middleware Next.js (limitado debido a localStorage):

**Limitaciones:**
- No puede verificar tokens de localStorage (client-side)
- Solo excluye rutas estáticas y de API
- La protección real se hace en AuthGuard

### 4. Integración en Header (`src/components/layout/Header.tsx`)

**Cuando auth está activado:**
- Usuario autenticado: Muestra dropdown menu con:
  - Nombre completo y email del usuario
  - Rol (管理者 si es admin)
  - Link a perfil/configuración
  - Botón de logout (rojo)
- Usuario no autenticado: Botón "ログイン" que lleva a `/login`

**Cuando auth está desactivado:**
- Muestra usuario hardcodeado: "管理者 / admin@arari.jp"

### 5. Página de Login (`src/app/login/page.tsx`)

**Características:**
- Usa el hook `useAuth` para login
- Redirige a `/` después de login exitoso
- Muestra errores de autenticación
- UI moderna con Framer Motion
- Muestra credenciales por defecto en desarrollo

### 6. Layout Principal (`src/app/layout.tsx`)

- Integra `AuthGuard` envolviendo todos los children
- El AuthGuard se activa solo si `NEXT_PUBLIC_ENABLE_AUTH=true`

## Credenciales por Defecto

⚠️ **CAMBIAR EN PRODUCCIÓN**

```
Usuario: admin
Contraseña: admin123
```

## Endpoints del Backend

Los siguientes endpoints ya existen en `arari-app/api/auth.py`:

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/auth/login` | POST | Login con username/password |
| `/api/auth/logout` | POST | Logout (invalida sesión) |
| `/api/auth/me` | GET | Obtener usuario actual |
| `/api/auth/register` | POST | Registrar usuario (solo admin) |

## Activar/Desactivar Autenticación

### Activar (Estado actual)

En `/arari-app/.env.local`:
```env
NEXT_PUBLIC_ENABLE_AUTH=true
```

**Comportamiento:**
- Login requerido para todas las rutas excepto `/login`
- Header muestra usuario autenticado o botón de login
- AuthGuard protege todas las páginas
- Tokens verificados automáticamente

### Desactivar

En `/arari-app/.env.local`:
```env
NEXT_PUBLIC_ENABLE_AUTH=false
```

**Comportamiento:**
- Acceso libre a todas las rutas
- Header muestra usuario hardcodeado
- AuthGuard no hace nada (pasa children directamente)
- Sistema funciona como antes

## Flujo de Autenticación

### 1. Primera Carga

```
App Load → useAuth init → Verifica localStorage
          ↓
    ¿Hay token?
          ↓
    Sí → Verifica con /api/auth/me
          ↓
    Token válido? → isAuthenticated=true
          ↓
    Token inválido → Limpia storage, isAuthenticated=false
```

### 2. Login

```
Usuario ingresa credenciales
          ↓
login({ username, password })
          ↓
POST /api/auth/login
          ↓
¿Exitoso?
          ↓
Guarda token + user en localStorage
          ↓
Actualiza estado: isAuthenticated=true
          ↓
Redirige a /
```

### 3. Logout

```
Usuario click en logout
          ↓
logout()
          ↓
POST /api/auth/logout (opcional)
          ↓
Limpia localStorage
          ↓
Actualiza estado: isAuthenticated=false
          ↓
Redirige a /login
```

### 4. Protección de Ruta

```
Usuario navega a ruta protegida
          ↓
AuthGuard verifica isAuthenticated
          ↓
¿Auth desactivado? → Renderiza contenido
          ↓
¿Ruta pública? → Renderiza contenido
          ↓
¿isLoading? → Muestra loading
          ↓
¿No autenticado? → Redirige a /login
          ↓
Autenticado → Renderiza contenido
```

## Seguridad

### Fortalezas
- Token JWT verificado en cada carga
- Tokens expirados se detectan y limpian automáticamente
- Protección de rutas del lado del cliente
- Logout limpia completamente el estado

### Limitaciones
- Tokens en localStorage (no httpOnly cookies)
- No hay refresh tokens
- Verificación solo del lado del cliente
- Middleware limitado por localStorage

### Mejoras Futuras para Producción

1. **httpOnly Cookies** en lugar de localStorage
2. **Refresh Tokens** para sesiones largas
3. **CSRF Protection**
4. **Rate Limiting** en endpoints de login
5. **2FA / MFA** opcional
6. **Logs de auditoría** de login/logout
7. **Session timeout** configurable
8. **Password recovery** flow

## Testing

### Probar Login
1. Iniciar backend: `cd arari-app/api && python3 -m uvicorn main:app --reload --port 8000`
2. Iniciar frontend: `cd arari-app && npm run dev`
3. Ir a `http://localhost:3000`
4. Si no autenticado, redirige a `/login`
5. Ingresar `admin` / `admin123`
6. Debe redirigir a dashboard

### Probar Logout
1. Estando autenticado, click en avatar de usuario
2. Click en "ログアウト" (rojo)
3. Debe limpiar sesión y redirigir a `/login`

### Probar Desactivación
1. Cambiar `.env.local`: `NEXT_PUBLIC_ENABLE_AUTH=false`
2. Reiniciar servidor Next.js
3. Acceso libre a todas las rutas
4. Header muestra usuario hardcodeado

## Archivos Modificados/Creados

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| `src/hooks/useAuth.ts` | NUEVO | Hook de autenticación |
| `src/hooks/index.ts` | MODIFICADO | Export useAuth |
| `src/components/auth/AuthGuard.tsx` | NUEVO | Protección de rutas |
| `src/components/ui/dropdown-menu.tsx` | NUEVO | Componente dropdown (Radix UI) |
| `src/middleware.ts` | NUEVO | Middleware Next.js |
| `src/components/layout/Header.tsx` | MODIFICADO | Integración de auth + dropdown menu |
| `src/app/login/page.tsx` | MODIFICADO | Usa hook useAuth |
| `src/app/layout.tsx` | MODIFICADO | Integra AuthGuard |
| `.env.local` | MODIFICADO | NEXT_PUBLIC_ENABLE_AUTH=true |
| `AUTH_SYSTEM.md` | NUEVO | Esta documentación |

## Soporte

Para preguntas o problemas:
1. Verificar que backend esté corriendo en puerto 8000
2. Verificar que `.env.local` tenga la configuración correcta
3. Revisar consola del navegador para errores
4. Verificar que el usuario `admin` exista en la base de datos
