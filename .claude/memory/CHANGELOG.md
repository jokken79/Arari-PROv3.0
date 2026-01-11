# Changelog - Arari PRO v3.0

Este archivo mantiene un registro cronológico de todos los cambios significativos.
**IMPORTANTE**: Actualizar este archivo después de cada sesión de desarrollo.

---

## [2026-01-11] Correcciones Críticas de Seguridad

### Arreglado
- **CORS Restrictivo** - Regex ahora solo permite `arari-*` dominios de Vercel
- **COOKIE_SECURE Auto-Detectado** - Automáticamente `true` en Railway/Vercel/Render
- **Frontend Migrado a Cookies** - Tokens ya no se guardan en localStorage (XSS fix)
- **Detección de Contraseña Débil** - Redirige a cambiar contraseña si es default

### Modificado
- `api.ts` - Todas las llamadas usan `credentials: 'include'`
- `useAuth.ts` - Usa cookies HttpOnly, no localStorage para tokens
- `login/page.tsx` - Redirige a settings si contraseña es débil
- `settings/page.tsx` - Usa `isAuthenticated` en lugar de `token`
- `auth.py` - Añadida función `is_weak_password()`
- `auth_dependencies.py` - Auto-detecta entorno de producción

### Tests
- 111 tests pasando (backend)
- Build de frontend exitoso

---

## [2026-01-10] Mejoras de Seguridad Completas

### Añadido
- **Rate Limiting con Redis** (`rate_limiter.py`)
  - Backend Redis con fallback a memoria
  - Algoritmo sliding window con scripts Lua
  - Límites configurables por endpoint
  - Variable de entorno `REDIS_URL`

- **Autenticación con HttpOnly Cookies**
  - Tokens en cookies HttpOnly (protección XSS)
  - Compatible con header Authorization
  - Configuración: `COOKIE_DOMAIN`, `COOKIE_SECURE`, `COOKIE_SAMESITE`

- **Refresh Tokens**
  - Nueva tabla `refresh_tokens` en BD
  - Expiración de 7 días con rotación
  - Revocación automática al cambiar contraseña
  - Endpoint `/api/auth/refresh`

- **63 Nuevos Tests de Seguridad**
  - Rate limiting: 28 tests
  - Cookie auth: 14 tests
  - Refresh tokens: 17 tests
  - Integración: 8 tests

### Estadísticas
- **Tests Totales**: 111 (48 existentes + 63 nuevos)
- **Cobertura de Seguridad**: Completa

---

## [2026-01-10] Refactorización Completa de Routers

### Añadido
- **11 Nuevos Routers** (`arari-app/api/routers/`)
  - `auth.py` - 7 endpoints de autenticación
  - `alerts.py` - 6 endpoints de alertas
  - `audit.py` - 3 endpoints de auditoría
  - `reports.py` - 5 endpoints de reportes
  - `budget.py` - 5 endpoints de presupuestos
  - `notifications.py` - 6 endpoints de notificaciones
  - `search.py` - 6 endpoints de búsqueda
  - `validation.py` - 4 endpoints de validación
  - `backup.py` - 5 endpoints de respaldo
  - `roi.py` - 6 endpoints de ROI
  - `cache.py` - 2 endpoints de caché

### Modificado
- `main.py` - Reducido de 2326 a 1308 líneas (44% menos código)
- `routers/__init__.py` - Exporta los 17 routers modulares
- Arquitectura completamente modular para FastAPI

### Estadísticas
- **Total Routers**: 17
- **Endpoints Movidos**: ~75
- **Reducción de Código**: 1018 líneas

---

## [2026-01-10] Sistema de Agentes y Formato Japonés

### Añadido
- **Sistema de Agentes Completo** (`.claude/agents/`)
  - `frontend-specialist.md` - Experto en Next.js/React
  - `backend-specialist.md` - Experto en FastAPI/Python
  - `database-specialist.md` - Experto en SQLite/PostgreSQL
  - `security-specialist.md` - Experto en autenticación y seguridad
  - `business-logic-specialist.md` - Experto en reglas de negocio
  - `test-specialist.md` - Experto en testing
  - `memory-agent.md` - Agente de memoria persistente

- **Agentes de Combate de Debilidades** (`.claude/agents/`)
  - `code-validator.md` - Validación de código antes de commit
  - `simplicity-agent.md` - Prevención de sobre-ingeniería
  - `business-context-agent.md` - Contexto de negocio de 派遣会社
  - `auto-tester.md` - Testing automático y verificación

- **Nuevos Skills** (`.claude/commands/`)
  - `/optimize-frontend` - Optimización de rendimiento frontend
  - `/security-audit` - Auditoría de seguridad
  - `/refactor-api` - Refactorización del backend
  - `/fix-bugs` - Corrección de bugs
  - `/add-feature` - Implementación de features
  - `/test-suite` - Ejecución de tests
  - `/deploy-check` - Verificación pre-deploy
  - `/schema-migrate` - Migraciones de BD
  - `/code-review` - Revisiones de código
  - `/perf-analyze` - Análisis de rendimiento
  - `/update-memory` - Actualizar sistema de memoria
  - `/session-start` - Inicializar sesión con contexto

- **Formato Japonés** (`arari-app/api/japanese_format.py`)
  - Conversión de números a formato japonés (万, 億, 兆)
  - 870,000 → 87万円
  - 100,000,000 → 1億円
  - Funciones: `format_japanese_yen()`, `format_japanese_yen_short()`

- **Sistema de Memoria** (`.claude/memory/`)
  - `CHANGELOG.md` - Este archivo
  - `CONTEXT.md` - Estado actual del proyecto
  - `SESSION_LOG.md` - Log de sesiones
  - `KNOWN_ERRORS.md` - Errores conocidos para no repetir
  - `ERROR_LOG.md` - Template para errores de runtime
  - `BUSINESS_CONTEXT.md` - Contexto de negocio

- **FastAPI Routers** (`arari-app/api/routers/`)
  - `employees.py` - 5 endpoints CRUD
  - `payroll.py` - 3 endpoints de nómina
  - `statistics.py` - 4 endpoints de estadísticas
  - `settings.py` - 5 endpoints de configuración
  - `additional_costs.py` - 9 endpoints de costos adicionales
  - `MIGRATION_ROUTERS.md` - Guía de migración

### Modificado
- `reports.py` - Integración de formato japonés para PDFs y Excel
- `AGENTS.md` - Versión 2.0 con agentes de combate de debilidades

### Áreas de Mejora Identificadas
1. **Críticas**:
   - Rate limiting debe migrar de memoria a Redis
   - Tokens deben moverse de localStorage a HttpOnly cookies
   - Cambiar credenciales por defecto

2. **Altas**:
   - Refactorizar main.py (1800+ líneas)
   - Implementar refresh tokens
   - Mejorar test coverage

### Debilidades de Claude Identificadas y Combatidas
| Debilidad | Agente/Solución |
|-----------|-----------------|
| No ejecutar código | `code-validator.md` + `auto-tester.md` |
| Sobre-ingeniería | `simplicity-agent.md` |
| Pérdida de memoria | Sistema `.claude/memory/` |
| Falta contexto negocio | `business-context-agent.md` |
| Sesgo hacia patrones | Documentación en KNOWN_ERRORS.md |

---

## [2025-12-26] Producción Deploy

### Añadido
- Deploy a Vercel (frontend)
- Deploy a Railway (backend + PostgreSQL)
- Configuración CORS para producción

### URLs de Producción
- Frontend: https://arari-pr-ov2-0.vercel.app
- Backend: https://arari-prov20-production.up.railway.app

---

## [2025-12-XX] Versión 3.0 Inicial

### Características Principales
- Dashboard con KPIs
- Gestión de empleados
- Análisis de nómina
- Cálculo de márgenes
- Sistema de reportes (Excel/PDF)
- Autenticación con roles
- Costos adicionales
- Comisiones de agentes

---

## Formato de Entradas

```markdown
## [YYYY-MM-DD] Título del Cambio

### Añadido
- Descripción de nuevas características

### Modificado
- Descripción de cambios a código existente

### Corregido
- Descripción de bugs corregidos

### Eliminado
- Descripción de código/features eliminadas

### Notas
- Información adicional relevante
```
