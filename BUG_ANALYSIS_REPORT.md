# Bug Analysis Report - Arari PRO v3.0

**Fecha de Análisis:** 2026-01-07
**Rama:** `claude/analyze-app-bugs-dRyP4`

---

## Contexto del Sistema

**Arari PRO v3.0** es un sistema de gestión de márgenes de ganancia (粗利管理) para ユニバーサル企画株式会社, una empresa de staffing (派遣会社) especializada en manufactura (製造派遣).

### Flujo de Negocio Principal
1. **Admin sube Excel** → archivos de nómina en formato ChinginGenerator (.xlsm)
2. **Parser extrae datos** → horas trabajadas, salarios, deducciones, asignaciones
3. **Sistema calcula** → 請求金額 (billing), 会社総コスト (costs), 粗利 (profit)
4. **Dashboard muestra** → KPIs, alertas de margen, rankings por empresa

### Fórmulas Críticas del Negocio
```
請求金額 (Billing) = work_hours × 単価
                   + overtime_hours × 単価 × 1.25  (≤60h)
                   + overtime_over_60h × 単価 × 1.5  (>60h)
                   + night_hours × 単価 × 0.25  (EXTRA, no reemplazo)
                   + holiday_hours × 単価 × 1.35
                   + other_allowances (皆勤手当, etc.)

会社総コスト (Cost) = gross_salary
                    + company_social_insurance (= employee deduction, 労使折半)
                    + gross_salary × 0.90% (雇用保険 2025年度)
                    + gross_salary × 0.30% (労災保険 製造業)

粗利 (Profit) = Billing - Cost
マージン率 = (Profit / Billing) × 100
Target: 12% para manufactura
```

### Reglas de Negocio Importantes
- **Paid leave (有給)** ya está incluido en `gross_salary` - NO duplicar
- **Night hours (深夜)** son EXTRA 0.25× encima del base, no reemplazo
- **Overtime split** se hace en el parser: ≤60h y >60h separados
- **Transport allowance** tiene detección inteligente si está en gross o no

---

## Resumen de Bugs Verificados

| Severidad | Cantidad | Descripción |
|-----------|----------|-------------|
| 🔴 **Críticos** | 7 | Causan crash o vulnerabilidad de seguridad |
| 🟠 **Altos** | 6 | Funcionalidad rota o datos incorrectos |
| 🟡 **Medios** | 5 | Problemas de rendimiento o edge cases |
| **TOTAL** | **18** | Bugs verificados manualmente |

---

## 🔴 BUGS CRÍTICOS (7) - Acción Inmediata

### 1. Missing Import: `run_in_threadpool`
| Campo | Valor |
|-------|-------|
| **Archivo** | `arari-app/api/main.py:894, 929` |
| **Verificación** | ✅ Confirmado - linter deshabilitado en `pyproject.toml:17` |
| **Problema** | Función usada pero nunca importada |
| **Impacto** | `NameError` al acceder a `/api/export/wage-ledger` |
| **Feature afectado** | Exportación de 賃金台帳 (wage ledger) completamente rota |

```python
# Código actual (líneas 894, 929)
file_path = await run_in_threadpool(...)  # NameError!

# Fix requerido - agregar al inicio del archivo:
from starlette.concurrency import run_in_threadpool
```

---

### 2. Missing Method: `get_payroll_by_employee_year`
| Campo | Valor |
|-------|-------|
| **Archivo** | `arari-app/api/main.py:892, 918` |
| **Verificación** | ✅ Confirmado - solo existe `get_payroll_records()` en services.py |
| **Problema** | Método llamado pero no definido en `PayrollService` |
| **Impacto** | `AttributeError` al exportar wage ledger |

```python
# Línea 892 - método no existe
records = payroll_service.get_payroll_by_employee_year(request.employee_id, request.year)

# Opciones de fix:
# A) Implementar método en services.py
# B) Usar get_payroll_records() con filtros apropiados
```

---

### 3. SQL Injection en Agent Commissions
| Campo | Valor |
|-------|-------|
| **Archivo** | `arari-app/api/agent_commissions.py:150, 153` |
| **Verificación** | ✅ Confirmado - user input directo en SQL via f-string |
| **Problema** | `company_filter` del query param insertado sin sanitizar |
| **Impacto** | SQL injection completo - DROP TABLE posible |

```python
# Código vulnerable (línea 150, 153)
company_conditions.append(f"e.dispatch_company LIKE '%{target}%'")
company_conditions = [f"e.dispatch_company LIKE '%{company_filter}%'"]

# Flujo de ataque:
# main.py:1304 → company_filter=company (query param)
# URL: /api/agent-commissions/calculate/maruyama?period=2025年1月&company=' OR 1=1; DROP TABLE employees; --

# Fix requerido - usar queries parametrizadas:
cursor.execute("SELECT ... WHERE dispatch_company LIKE ?", (f"%{company_filter}%",))
```

---

### 4. Incorrect user_id Field Name
| Campo | Valor |
|-------|-------|
| **Archivo** | `arari-app/api/main.py:1644` |
| **Verificación** | ✅ Confirmado - auth.py retorna `"user_id"`, main.py busca `"id"` |
| **Problema** | Key incorrecta causa `user_id=None` en change_password |
| **Impacto** | Ningún usuario puede cambiar su contraseña |

```python
# main.py:1644 (INCORRECTO)
result = service.change_password(
    user_id=current_user.get("id"),  # ← Siempre None
    ...
)

# auth.py:209 (lo que realmente retorna validate_token)
return {
    "user_id": row["id"],  # ← Key correcta es "user_id"
    ...
}

# Fix:
user_id=current_user.get("user_id")  # Cambiar "id" → "user_id"
```

---

### 5. Missing Authentication on `/api/upload`
| Campo | Valor |
|-------|-------|
| **Archivo** | `arari-app/api/main.py:530-534` |
| **Verificación** | ✅ Confirmado - no hay `Depends(require_admin)` |
| **Problema** | Endpoint de upload sin autenticación |
| **Impacto** | Cualquier usuario anónimo puede subir archivos de nómina |

```python
# Código actual (línea 530-534)
@app.post("/api/upload")
async def upload_payroll_file(
    file: UploadFile = File(...),
    db: sqlite3.Connection = Depends(get_db)  # ← Sin auth!
):

# Fix - agregar dependencia:
async def upload_payroll_file(
    file: UploadFile = File(...),
    db: sqlite3.Connection = Depends(get_db),
    current_user: Dict[str, Any] = Depends(require_admin)  # ← Agregar
):
```

---

### 6. Missing Authentication on `/api/import-employees`
| Campo | Valor |
|-------|-------|
| **Archivo** | `arari-app/api/main.py:448-451` |
| **Verificación** | ✅ Similar al anterior |
| **Problema** | Endpoint sin protección de autenticación |
| **Impacto** | Cualquier usuario puede importar/modificar datos de empleados |

---

### 7. Division by Zero in SQL Query
| Campo | Valor |
|-------|-------|
| **Archivo** | `arari-app/api/services.py:982` |
| **Verificación** | ✅ Confirmado en código |
| **Problema** | Sin protección cuando `billing_rate = 0` |
| **Impacto** | Dashboard crash con empleados sin billing_rate |

```sql
-- Código actual (línea 982)
AVG((e.billing_rate - e.hourly_rate) / e.billing_rate * 100) as average_margin
-- Si billing_rate = 0 → División por cero

-- Fix:
AVG((e.billing_rate - e.hourly_rate) / NULLIF(e.billing_rate, 0) * 100) as average_margin
```

---

## 🟠 BUGS DE SEVERIDAD ALTA (6)

### 8. Promise.all Destructuring Mismatch
| Campo | Valor |
|-------|-------|
| **Archivo** | `arari-app/src/store/appStore.ts:275-281` |
| **Problema** | 5 promesas, 4 variables - `loadSettings()` no capturada |
| **Impacto** | Settings se cargan pero el resultado se ignora |

```typescript
// Código actual
const [empResponse, payrollResponse, periodsResponse, statsResponse] = await Promise.all([
  employeeApi.getAll(),         // → empResponse ✓
  payrollApi.getAll(),          // → payrollResponse ✓
  payrollApi.getPeriods(),      // → periodsResponse ✓
  statisticsApi.getDashboard(), // → statsResponse ✓
  get().loadSettings(),         // → ??? (no capturado)
])
```

---

### 9. useMemo for Side Effects
| Campo | Valor |
|-------|-------|
| **Archivo** | `arari-app/src/app/agent-commissions/page.tsx:64-75` |
| **Problema** | `useMemo` usado para `setState` (debería ser `useEffect`) |
| **Impacto** | Auto-selección de agente/periodo puede no funcionar |

---

### 10. N+1 Query Pattern
| Campo | Valor |
|-------|-------|
| **Archivo** | `arari-app/api/services.py:993-1008` |
| **Problema** | Loop ejecuta query por cada empresa |
| **Impacto** | Performance degradada con muchas empresas |

```python
# Código actual - N+1 queries
for c in result:
    cursor.execute("""
        SELECT ... FROM company_additional_costs
        WHERE dispatch_company = ? AND period = ?
    """, (company_name, period))  # ← Query por cada empresa!

# Fix - usar LEFT JOIN en query principal
```

---

### 11. Transaction Incompatibility
| Campo | Valor |
|-------|-------|
| **Archivo** | `arari-app/api/main.py:613, 1027` |
| **Problema** | `BEGIN TRANSACTION` no es estándar en PostgreSQL |
| **Impacto** | Posibles errores en producción (Railway usa PostgreSQL) |

---

### 12. Stale Closures in Keyboard Handler
| Campo | Valor |
|-------|-------|
| **Archivo** | `arari-app/src/components/dashboard/PeriodSelector.tsx:77-99` |
| **Problema** | `handlePrevious`, `handleNext` no en dependency array |
| **Impacto** | Navegación con flechas puede usar estado viejo |

---

### 13. Race Condition in Employee Modal
| Campo | Valor |
|-------|-------|
| **Archivo** | `arari-app/src/components/employees/EmployeeDetailModal.tsx:26-43` |
| **Problema** | Async load + immediate filter = datos potencialmente stale |
| **Impacto** | Modal puede mostrar registros incorrectos |

---

## 🟡 BUGS DE SEVERIDAD MEDIA (5)

### 14. Rate Limit Bypass
- **Archivo:** `arari-app/api/auth_dependencies.py:178-183`
- **Problema:** Rate limiting usa `request.client.host` sin verificar `X-Forwarded-For`
- **Impacto:** Detrás de proxy, rate limit es inefectivo

### 15. Logout No Espera Servidor
- **Archivo:** `arari-app/src/hooks/useAuth.ts:264-292`
- **Problema:** localStorage se limpia antes de confirmar logout en servidor
- **Impacto:** Token puede quedar válido en servidor

### 16. TOCTOU en Commission Registration
- **Archivo:** `arari-app/api/main.py:1330-1334`
- **Problema:** Check-then-act sin transacción - duplicados posibles
- **Impacto:** Comisiones registradas múltiples veces con requests concurrentes

### 17. lastval() Unsafe in PostgreSQL
- **Archivo:** `arari-app/api/additional_costs.py:123-127`
- **Problema:** `lastval()` puede retornar ID de otra tabla
- **Impacto:** IDs incorrectos en foreign keys

### 18. Float Comparison Unreliable
- **Archivo:** `arari-app/api/salary_parser.py:1290`
- **Problema:** `hours != int(hours)` con floating point
- **Impacto:** Minutos pueden perderse en ciertos valores

---

## Recomendaciones de Prioridad

### Fase 1: Fixes Críticos (Inmediato)
1. ✅ Agregar import `run_in_threadpool`
2. ✅ Implementar método `get_payroll_by_employee_year`
3. ✅ Arreglar SQL injection en agent_commissions.py
4. ✅ Corregir `"id"` → `"user_id"` en change_password
5. ✅ Agregar autenticación a `/api/upload` y `/api/import-employees`
6. ✅ Agregar `NULLIF()` a query de statistics

### Fase 2: Fixes de Alta Prioridad (Esta Semana)
1. Corregir Promise.all destructuring
2. Cambiar `useMemo` → `useEffect` para side effects
3. Optimizar N+1 queries con JOINs
4. Corregir transaction handling para PostgreSQL

### Fase 3: Mejoras de Estabilidad (Próximas 2 Semanas)
1. Agregar dependency arrays completos en hooks
2. Corregir race conditions en modals
3. Implementar rate limiting con proxy headers
4. Usar `RETURNING` clause en lugar de `lastval()`

---

## Archivos Más Afectados

| Archivo | Bugs | Severidad |
|---------|------|-----------|
| `arari-app/api/main.py` | 7 | 4 críticos, 2 altos, 1 medio |
| `arari-app/api/services.py` | 2 | 1 crítico, 1 alto |
| `arari-app/api/agent_commissions.py` | 1 | 1 crítico |
| `arari-app/src/store/appStore.ts` | 1 | 1 alto |
| `arari-app/src/app/agent-commissions/page.tsx` | 1 | 1 alto |

---

## Notas

- Todos los bugs fueron verificados manualmente contra el código fuente
- Los números de línea corresponden al estado actual del código
- El reporte anterior contenía 74 bugs potenciales; este reporte contiene 18 verificados
- Priorizar fixes críticos antes del próximo deploy a producción
