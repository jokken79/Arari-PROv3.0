# Sistema de Agentes y Skills - Arari PRO v3.0

Este documento describe el sistema completo de agentes y skills diseñados para maximizar la productividad en el desarrollo de Arari PRO.

## Tabla de Contenidos

1. [Skills (Slash Commands)](#skills-slash-commands)
2. [Subagentes Especializados](#subagentes-especializados)
3. [Flujos de Trabajo Recomendados](#flujos-de-trabajo-recomendados)
4. [Áreas de Mejora Identificadas](#áreas-de-mejora-identificadas)

---

## Skills (Slash Commands)

Los skills son comandos invocables que ejecutan tareas específicas con conocimiento profundo del sistema.

### Skills de Análisis

| Skill | Descripción | Uso |
|-------|-------------|-----|
| `/analyze-margin` | Analiza márgenes de ganancia | `/analyze-margin [período]` |
| `/perf-analyze` | Analiza rendimiento del sistema | `/perf-analyze [area]` |
| `/code-review` | Revisa código de PR/branch | `/code-review [branch]` |

### Skills de Desarrollo

| Skill | Descripción | Uso |
|-------|-------------|-----|
| `/add-feature` | Implementa nuevas funcionalidades | `/add-feature [descripción]` |
| `/fix-bugs` | Encuentra y corrige bugs | `/fix-bugs [descripción]` |
| `/refactor-api` | Refactoriza el backend | `/refactor-api [módulo]` |
| `/optimize-frontend` | Optimiza rendimiento frontend | `/optimize-frontend [area]` |

### Skills de Operaciones

| Skill | Descripción | Uso |
|-------|-------------|-----|
| `/test-suite` | Ejecuta y analiza tests | `/test-suite [area]` |
| `/deploy-check` | Verifica preparación para deploy | `/deploy-check [env]` |
| `/schema-migrate` | Gestiona migraciones de BD | `/schema-migrate [action]` |
| `/backup-db` | Crea backup de base de datos | `/backup-db` |
| `/update-memory` | Actualiza sistema de memoria | `/update-memory` |
| `/session-start` | Inicializa sesión con contexto | `/session-start` |

### Skills de Reportes

| Skill | Descripción | Uso |
|-------|-------------|-----|
| `/generate-report` | Genera reportes profesionales | `/generate-report [tipo] [período]` |
| `/audit-log` | Ver logs de auditoría | `/audit-log [filtros]` |
| `/check-alerts` | Revisar alertas activas | `/check-alerts` |

### Skills de Seguridad

| Skill | Descripción | Uso |
|-------|-------------|-----|
| `/security-audit` | Auditoría de seguridad | `/security-audit [area]` |
| `/validate-data` | Valida integridad de datos | `/validate-data` |
| `/calculate-roi` | Calcula métricas ROI | `/calculate-roi` |

---

## Subagentes Especializados

Los subagentes son especialistas en dominios específicos que pueden ser invocados para tareas complejas.

### Frontend Specialist

**Archivo**: `.claude/agents/frontend-specialist.md`

**Expertise**:
- Next.js 14 App Router
- React 18 + TypeScript
- TanStack Query
- Zustand
- Recharts
- Tailwind CSS + Radix UI

**Cuándo usar**:
- Crear nuevos componentes
- Optimizar rendimiento frontend
- Integrar nuevos hooks
- Resolver bugs de UI

### Backend Specialist

**Archivo**: `.claude/agents/backend-specialist.md`

**Expertise**:
- FastAPI
- Python 3.11+
- Pydantic
- SQLite/PostgreSQL
- openpyxl
- pytest

**Cuándo usar**:
- Crear nuevos endpoints
- Implementar lógica de negocio
- Optimizar queries
- Añadir tests backend

### Database Specialist

**Archivo**: `.claude/agents/database-specialist.md`

**Expertise**:
- SQLite (desarrollo)
- PostgreSQL (producción)
- Schema design
- Query optimization
- Migrations
- Indexing

**Cuándo usar**:
- Diseñar nuevas tablas
- Optimizar queries lentas
- Crear migraciones
- Resolver problemas de BD

### Security Specialist

**Archivo**: `.claude/agents/security-specialist.md`

**Expertise**:
- Authentication (bcrypt, tokens)
- Authorization (roles, permisos)
- OWASP Top 10
- CORS, CSRF, XSS
- Rate limiting
- Audit logging

**Cuándo usar**:
- Revisar seguridad
- Implementar auth features
- Corregir vulnerabilidades
- Configurar producción

### Business Logic Specialist

**Archivo**: `.claude/agents/business-logic-specialist.md`

**Expertise**:
- Cálculos de nómina japonesa
- Facturación (請求金額)
- Costos de empresa
- Márgenes de ganancia
- Seguros sociales
- Comisiones de agentes

**Cuándo usar**:
- Verificar cálculos
- Implementar nuevas reglas
- Corregir fórmulas
- Actualizar tasas

### Test Specialist

**Archivo**: `.claude/agents/test-specialist.md`

**Expertise**:
- pytest (backend)
- Jest (frontend)
- TDD
- Coverage analysis
- CI/CD integration

**Cuándo usar**:
- Añadir tests
- Mejorar coverage
- Depurar tests fallidos
- Configurar CI

### Memory Agent

**Archivo**: `.claude/agents/memory-agent.md`

**Expertise**:
- Sistema de memoria persistente
- CHANGELOG, CONTEXT, SESSION_LOG
- Continuidad entre sesiones

**Cuándo usar**:
- Actualizar memoria después de cambios
- Registrar errores para futuro
- Mantener contexto actualizado

---

## Agentes de Combate de Debilidades

Agentes diseñados para compensar limitaciones específicas de Claude.

### Code Validator

**Archivo**: `.claude/agents/code-validator.md`

**Combate**: Incapacidad de ejecutar código para verificar

**Expertise**:
- Checklists de validación
- Comandos de verificación de sintaxis
- Patrones de testing manual
- Build verification

**Cuándo usar**:
- Después de escribir código nuevo
- Antes de hacer commit
- Al modificar lógica crítica

### Simplicity Agent

**Archivo**: `.claude/agents/simplicity-agent.md`

**Combate**: Tendencia a sobre-ingenierizar

**Expertise**:
- Principios YAGNI, KISS
- Detección de abstracciones prematuras
- Métricas de complejidad
- Anti-patrones

**Cuándo usar**:
- Al diseñar nuevas features
- Cuando la solución parece compleja
- Para revisar arquitectura propuesta

### Business Context Agent

**Archivo**: `.claude/agents/business-context-agent.md`

**Combate**: Falta de comprensión del negocio

**Expertise**:
- Dominio 派遣会社 (staffing)
- Terminología japonesa de nómina
- Reglas de negocio específicas
- Cálculos de margen

**Cuándo usar**:
- Al modificar lógica de negocio
- Para entender requisitos
- Al validar cálculos

### Auto Tester

**Archivo**: `.claude/agents/auto-tester.md`

**Combate**: Incapacidad de verificar que código funciona

**Expertise**:
- Comandos de pytest/Jest
- Patrones de tests
- Coverage analysis
- CI/CD verification

**Cuándo usar**:
- Para ejecutar tests existentes
- Para crear nuevos tests
- Para verificar cambios

---

## Flujos de Trabajo Recomendados

### Nueva Funcionalidad

```
1. /add-feature "descripción de la feature"
   → Plan de implementación

2. Usar Backend Specialist si hay API
   → Endpoints + servicios

3. Usar Frontend Specialist si hay UI
   → Componentes + hooks

4. /test-suite --fix
   → Añadir tests

5. /code-review
   → Revisar cambios

6. /deploy-check
   → Verificar antes de merge
```

### Corrección de Bug

```
1. /fix-bugs "descripción del bug"
   → Identificar causa raíz

2. Usar Business Logic Specialist si es cálculo
   → Verificar fórmulas

3. /test-suite
   → Ejecutar tests

4. /code-review
   → Revisar fix
```

### Optimización de Rendimiento

```
1. /perf-analyze all
   → Identificar cuellos de botella

2. /optimize-frontend si es frontend
   → Optimizar componentes

3. Usar Database Specialist si es queries
   → Optimizar BD

4. /test-suite
   → Verificar que nada se rompe
```

### Auditoría de Seguridad

```
1. /security-audit all
   → Identificar vulnerabilidades

2. Usar Security Specialist
   → Implementar correcciones

3. /test-suite
   → Verificar auth tests

4. /deploy-check
   → Verificar configuración producción
```

### Deployment

```
1. /test-suite all
   → Todos los tests pasan

2. /deploy-check production
   → Verificar preparación

3. /validate-data
   → Verificar integridad datos

4. git push origin main
   → Deploy automático
```

---

## Áreas de Mejora Identificadas

Basado en el análisis exhaustivo del sistema, estas son las principales áreas de mejora:

### Críticas (Implementar Pronto)

1. **Rate Limiting en Redis**
   - Actual: En memoria (no escala)
   - Solución: Implementar con Redis
   - Skill: `/security-audit auth --fix`

2. **HttpOnly Cookies**
   - Actual: Tokens en localStorage (XSS risk)
   - Solución: Migrar a HttpOnly cookies
   - Skill: `/security-audit frontend --fix`

3. **Credenciales por Defecto**
   - Actual: admin/admin123
   - Solución: Forzar cambio en primer login
   - Skill: `/security-audit config`

### Altas (Próximo Sprint)

4. **Refactorizar main.py**
   - Actual: ~1800 líneas
   - Solución: Dividir en routers
   - Skill: `/refactor-api main`

5. **Refresh Tokens**
   - Actual: Solo access token 24h
   - Solución: Access (15min) + Refresh (7d)
   - Agente: Security Specialist

6. **Mejorar Test Coverage**
   - Actual: ~70% backend, ~40% frontend
   - Objetivo: 90% backend, 80% frontend
   - Skill: `/test-suite --coverage`

### Medias (Cuando Sea Posible)

7. **Two-Factor Authentication**
   - Implementar TOTP opcional
   - Agente: Security Specialist

8. **Performance Optimization**
   - Bundle size frontend
   - Query optimization backend
   - Skill: `/perf-analyze all`

9. **Documentación API**
   - Mejorar OpenAPI docs
   - Añadir ejemplos
   - Skill: `/refactor-api models`

### Bajas (Mejoras Continuas)

10. **Internacionalización**
    - Soporte multi-idioma (JP/EN)
    - Agente: Frontend Specialist

11. **Dashboard Personalizable**
    - Widgets movibles
    - Preferencias de usuario
    - Skill: `/add-feature dashboard-customization`

---

## Uso de Este Documento

Este documento sirve como guía de referencia para:

1. **Desarrolladores**: Saber qué skill/agente usar para cada tarea
2. **Claude Code**: Entender el contexto y capacidades disponibles
3. **Planificación**: Priorizar mejoras basadas en criticidad

### Mantener Actualizado

Cuando se añadan nuevos skills o agentes:
1. Añadir entrada en la tabla correspondiente
2. Crear archivo .md en `.claude/commands/` o `.claude/agents/`
3. Actualizar flujos de trabajo si aplica

---

*Última actualización: 2026-01-10*
*Versión: 2.0 - Añadidos agentes de combate de debilidades*
