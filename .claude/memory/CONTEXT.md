# Contexto Actual - Arari PRO v3.0

**Última actualización**: 2026-01-10 (Sesión 2)
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
| Backend (FastAPI) | ✓ Funcional | main.py necesita refactorizar |
| Frontend (Next.js) | ✓ Funcional | Optimización pendiente |
| Base de Datos | ✓ Funcional | SQLite (dev), PostgreSQL (prod) |
| Tests | ⚠️ Parcial | 48+ tests, coverage ~70% |
| Auth | ✓ Funcional | Mejoras de seguridad pendientes |

---

## Trabajo Pendiente (Priorizado)

### Crítico
1. [ ] Migrar rate limiting a Redis
2. [ ] Migrar tokens a HttpOnly cookies
3. [ ] Cambiar credenciales por defecto

### Alto
4. [ ] Refactorizar main.py en routers
5. [ ] Implementar refresh tokens
6. [ ] Aumentar test coverage a 90%

### Medio
7. [ ] Implementar 2FA opcional
8. [ ] Optimizar bundle size frontend
9. [ ] Mejorar documentación API

### Bajo
10. [ ] Internacionalización (JP/EN)
11. [ ] Dashboard personalizable

---

## Últimos Cambios Significativos

### 2026-01-10 (Sesión 2)
- Creados agentes de combate de debilidades:
  - `code-validator.md` - Validación de código
  - `simplicity-agent.md` - Anti sobre-ingeniería
  - `business-context-agent.md` - Contexto de negocio
  - `auto-tester.md` - Testing automático
- Añadido skill `/session-start` para inicializar sesiones
- Actualizado AGENTS.md a versión 2.0

### 2026-01-10 (Sesión 1)
- Creado sistema de agentes y skills
- Implementado formato japonés para números (万, 億)
- Creado sistema de memoria persistente

### Archivos Clave Modificados
- `arari-app/api/reports.py` - Formato japonés
- `arari-app/api/japanese_format.py` - Nuevo módulo
- `.claude/agents/*` - 11 agentes especializados
- `.claude/commands/*` - 14 skills disponibles
- `.claude/memory/*` - 6 archivos de memoria

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

## Notas para Próxima Sesión

1. Completar migración de formato japonés en todos los reportes
2. Revisar sistema de comisiones de agentes
3. Considerar tests E2E con Playwright

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
