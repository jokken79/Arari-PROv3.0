# Contexto Actual - Arari PRO v3.0

**Última actualización**: 2026-01-14 (Sesión 4 - Actualización documentación tests)
**Estado**: Desarrollo activo

---

## Estado del Proyecto

### Versión
- **Versión**: 3.0
- **Branch principal**: main
- **Producción**: Desplegado ✓

### Métricas del Código
| Componente | Estado | Notas |
|------------|--------|-------|
| Backend (FastAPI) | ✓ Funcional | Refactorizado en 17 routers |
| Frontend (Next.js) | ✓ Funcional | Migrado a HttpOnly cookies |
| Base de Datos | ✓ Funcional | SQLite (dev), PostgreSQL (prod) |
| Tests | ✓ Completo | 311 tests (13 test files) |
| Auth | ✓ Seguro | HttpOnly cookies, refresh tokens, rate limiting |

---

## Trabajo Pendiente (Priorizado)

### Crítico
1. [x] Migrar rate limiting a Redis ✓ (2026-01-10)
2. [x] Migrar tokens a HttpOnly cookies ✓ (2026-01-11)
3. [ ] Cambiar credenciales por defecto en producción

### Alto
4. [x] Refactorizar main.py en routers ✓ (2026-01-10) - 17 routers creados
5. [x] Implementar refresh tokens ✓ (2026-01-10)
6. [ ] Aumentar test coverage a 90%

### Medio
7. [ ] Implementar 2FA opcional
8. [ ] Optimizar bundle size frontend
9. [x] Mejorar documentación API ✓ (CLAUDE.md actualizado)

### Bajo
10. [ ] Internacionalización (JP/EN)
11. [ ] Dashboard personalizable

---

## Últimos Cambios Significativos

### 2026-01-14 (Sesión 4)
- Actualizada documentación de tests (111 → 311 tests)
- Corregido CLAUDE.md: módulos críticos ahora tienen tests
- Actualizada sección de Test Coverage con conteos reales
- Marcados TODOs completados (negative net_salary, test coverage)

### 2026-01-13 (Sesión 3)
- Actualizado CLAUDE.md con estado actual del proyecto
- Documentadas mejoras de seguridad (HttpOnly cookies, rate limiting, refresh tokens)
- Actualizada arquitectura con 17 routers modulares
- Actualizado conteo de tests a 111

### 2026-01-11 (Correcciones de Seguridad)
- CORS restrictivo (regex para `arari-*` dominios Vercel)
- COOKIE_SECURE auto-detectado en producción
- Frontend migrado a cookies (XSS fix)
- Detección de contraseña débil

### 2026-01-10 (Sesión 2)
- Creados agentes de combate de debilidades
- Añadido skill `/session-start` para inicializar sesiones
- Rate limiting con Redis implementado
- Refresh tokens implementados
- 63 nuevos tests de seguridad

### Archivos Clave Modificados
- `CLAUDE.md` - Documentación principal actualizada
- `arari-app/api/routers/` - 17 routers modulares
- `arari-app/api/rate_limiter.py` - Rate limiting con Redis
- `arari-app/api/auth.py` - HttpOnly cookies + refresh tokens
- `.claude/memory/CONTEXT.md` - Este archivo

---

## Configuración Actual

### Tasas de Seguro (2025年度)
| Tipo | Tasa |
|------|------|
| 雇用保険 (empresa) | 0.90% |
| 労災保険 | 0.30% |
| 社会保険 | = monto empleado |

### Objetivos de Margen
| Nivel | Rango |
|-------|-------|
| Excelente (優良) | ≥12% |
| Bueno (良好) | 10-12% |
| Mejorar (要改善) | 7-10% |
| Crítico (危険) | <7% |

**Objetivo fabricación**: 12%

---

## Credenciales de Desarrollo

```
Usuario: admin
Password: admin123
Email: admin@arari-pro.local
```

⚠️ **CAMBIAR EN PRODUCCIÓN**

---

## URLs

### Desarrollo
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

### Producción
- Frontend: https://arari-pr-ov2-0.vercel.app
- Backend: https://arari-prov20-production.up.railway.app

---

## Bugs Conocidos

1. **ESLint circular warning** - Cosmético, ignorar
2. **PDF fonts** - Requiere HeiseiKakuGo-W5 instalada

---

## Sesión Actual (2026-01-23): Implementar Skills + Testing

### 🎯 Objetivo Principal
Aumentar calidad con:
- ✅ Implementar skills necesarias (documentado en `.claude/SKILLS_MAP.md`)
- ⏳ Aumentar test coverage a 90% (actual: 70%)
- ⏳ Tests E2E con Playwright
- ⏳ 2FA opcional para admins
- ⏳ Optimizar bundle size

### 📚 Skills a Usar
**Testing**: `test-driven-development`, `test-specialist`, `auto-tester`, `code-validator`
**E2E**: `playwright-skill`, `e2e-testing-patterns`, `browser-automation`
**2FA**: `security-specialist`, `auth-implementation-patterns`, `secrets-management`
**Performance**: `nextjs-best-practices`, `web-performance-optimization`

Ubicación: `C:\Users\kenji\.gemini\antigravity\global_skills\`

### Ver También
- `.claude/SKILLS_MAP.md` - Mapa de skills y su uso
- `CLAUDE.md` - Documentación del proyecto

---

## Reglas Globales para Claude Code

### 🎯 Regla Global #1: Skills Locales Disponibles
**Ubicación**: `C:\Users\kenji\.gemini\antigravity\global_skills\`

Claude tiene acceso a **400+ skills/habilidades** locales que pueden ser aplicadas a cualquier proyecto. Ejemplos:
- `backend-dev-guidelines`, `fastapi-pro`, `python-pro`
- `nextjs-best-practices`, `react-patterns`, `tailwind-patterns`
- `test-driven-development`, `playwright-skill`
- `security-auditor`, `penetration-testing`
- `database-specialist`, `kubernetes-architect`, `docker-expert`
- Y muchos más...

**Acción**: Cuando trabaje en cualquier proyecto (no solo Arari-PRO), consultaré esta carpeta para skills relevantes y los usaré si son aplicables.

### 🤖 Regla Global #2: Skills Nativos de Claude Code
Claude tiene acceso permanente a:
- **Skills integrados**: `/help`, `/commit`, `/review-pr`
- **Agentes especializados**: `backend-specialist`, `frontend-specialist`, `test-specialist`, `security-specialist`, `business-logic-specialist`, etc.
- **Plugins/MCP**: Figma, Greptile, Firebase, Context7, Playwright, etc.

---

## Archivos Importantes

| Archivo | Propósito |
|---------|-----------|
| `CLAUDE.md` | Guía principal para Claude |
| `.claude/AGENTS.md` | Documentación de agentes |
| `.claude/memory/CHANGELOG.md` | Historial de cambios |
| `.claude/memory/CONTEXT.md` | Este archivo |
| `arari-app/api/main.py` | API principal (refactorizar) |
| `arari-app/api/services.py` | Lógica de negocio |
| `arari-app/api/japanese_format.py` | Formato japonés |
