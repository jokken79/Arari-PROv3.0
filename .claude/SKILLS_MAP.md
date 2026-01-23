# Skills Map - Arari-PRO v3.0

## 📍 Ubicación de Skills Globales
```
C:\Users\kenji\.gemini\antigravity\global_skills\
```

---

## 🎯 Skills Implementadas por Objetivo

### 1️⃣ AUMENTAR TEST COVERAGE A 90%

| Skill | Ubicación | Propósito | Prioridad |
|-------|-----------|----------|-----------|
| `test-driven-development` | global_skills/ | TDD workflow, ciclo rojo-verde-refactor | 🔴 P0 |
| `test-specialist` | global_skills/ | Especialista pytest/Jest, coverage analysis | 🔴 P0 |
| `auto-tester` | global_skills/ | Ejecutar tests, crear automatizados | 🔴 P0 |
| `code-validator` | global_skills/ | Validar antes de tests | 🟠 P1 |
| `test-fixing` | global_skills/ | Reparar tests fallidos | 🟠 P1 |
| `python-testing-patterns` | global_skills/ | Patrones pytest específicos | 🟡 P2 |
| `javascript-testing-patterns` | global_skills/ | Patrones Jest para frontend | 🟡 P2 |

**Objetivo**: Pasar de 70% → 90% coverage
**Tests actuales**: 311 (backend) + 30 (frontend utils)
**Falta cubrir**: Componentes React, integraciones E2E

---

### 2️⃣ TESTS E2E CON PLAYWRIGHT

| Skill | Ubicación | Propósito | Prioridad |
|-------|-----------|----------|-----------|
| `playwright-skill` | global_skills/ | Playwright best practices | 🔴 P0 |
| `e2e-testing-patterns` | global_skills/ | Patrones E2E generales | 🔴 P0 |
| `browser-automation` | global_skills/ | Automatización web avanzada | 🔴 P0 |
| `webapp-testing` | global_skills/ | Web app testing | 🟠 P1 |
| `test-driven-development` | global_skills/ | TDD para tests E2E | 🟡 P2 |

**Objetivo**: Suite E2E completa con Playwright
**Casos a cubrir**:
- Login/logout flow
- Upload de Excel
- Cálculos de margin
- Reportes
- 2FA

---

### 3️⃣ IMPLEMENTAR 2FA OPCIONAL

| Skill | Ubicación | Propósito | Prioridad |
|-------|-----------|----------|-----------|
| `security-specialist` | global_skills/ | Seguridad general | 🔴 P0 |
| `auth-implementation-patterns` | global_skills/ | Patrones autenticación | 🔴 P0 |
| `secrets-management` | global_skills/ | Gestión TOTP/secrets | 🔴 P0 |
| `frontend-security-coder` | global_skills/ | Security frontend | 🟠 P1 |
| `broken-authentication` | global_skills/ | Identificar vulnerabilidades | 🟠 P1 |

**Objetivo**: 2FA con TOTP para admins
**Tech**: PyOTP (backend), QR codes, recovery codes

---

### 4️⃣ OPTIMIZAR BUNDLE SIZE FRONTEND

| Skill | Ubicación | Propósito | Prioridad |
|-------|-----------|----------|-----------|
| `nextjs-best-practices` | global_skills/ | Next.js optimization | 🔴 P0 |
| `web-performance-optimization` | global_skills/ | Performance web | 🔴 P0 |
| `application-performance-performance-optimization` | global_skills/ | Performance patterns | 🟠 P1 |
| `frontend-dev-guidelines` | global_skills/ | Frontend best practices | 🟠 P1 |
| `typescript-pro` | global_skills/ | Type safety eficiente | 🟡 P2 |

**Objetivo**: Reducir bundle size (actual desconocido → meta: < 200KB gzipped)
**Estrategias**:
- Code splitting automático
- Dynamic imports
- Tree shaking
- Minificación de deps
- Image optimization

---

## 🔧 Skills de Soporte General

| Skill | Uso |
|-------|-----|
| `backend-dev-guidelines` | Calidad backend durante tests |
| `code-review-excellence` | Code review del nuevo código |
| `simplicity-agent` | Evitar over-engineering |
| `business-logic-specialist` | Validar lógica de negocio |

---

## 📝 Flujo de Trabajo

### Fase 1: Setup Skills (AHORA)
1. ✓ Documentar skills necesarias (este archivo)
2. ✓ Crear plan de implementación
3. Crear estructura de tests E2E

### Fase 2: Aumentar Coverage (Test Coverage)
1. Usar `test-specialist` para analizar gaps
2. Usar `auto-tester` para crear nuevos tests
3. Usar `code-validator` para validar
4. Target: 90%

### Fase 3: Tests E2E (Playwright)
1. Setup Playwright config
2. Crear test scenarios principales
3. Integrar en CI/CD

### Fase 4: 2FA
1. Setup PyOTP backend
2. Frontend QR component
3. Tests de 2FA
4. Documentación

### Fase 5: Optimización Bundle
1. Analizar bundle actual
2. Identificar dependencias grandes
3. Aplicar optimizaciones
4. Validar con lighthouse

---

## 🎓 Recursos por Skill

### test-driven-development
- Ciclo TDD: red → green → refactor
- Test coverage metrics
- Integrated test reporting

### playwright-skill
- Locators (data-testid preferred)
- Wait strategies
- Screenshots/videos
- Parallelization

### security-specialist
- OWASP top 10
- Rate limiting
- Input validation
- Token security

### nextjs-best-practices
- Route optimization
- API routes bundling
- Image optimization
- Font loading

---

## ✅ Próximos Pasos

1. **Confirmar con usuario**: ¿Proceder con estas skills?
2. **Crear `.claude/SKILLS_IMPLEMENTATION.md`**: Tracker de implementación
3. **Empezar Fase 2**: Aumentar test coverage

---

**Última actualización**: 2026-01-23
**Estado**: Documentación completa, pendiente ejecución
