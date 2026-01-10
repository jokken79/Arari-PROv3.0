# Errores Conocidos y Lecciones Aprendidas

Este archivo documenta errores comunes para evitar repetirlos.

---

## Errores de Formato

### ❌ Formato de Dinero Occidental
```python
# INCORRECTO - No usar para usuarios japoneses
f"¥{value:,.0f}"  # → ¥870,000
f"¥{value/1000000:.1f}M"  # → ¥0.87M
```

```python
# CORRECTO - Usar formato japonés
from japanese_format import format_japanese_yen
format_japanese_yen(870000)  # → 87万円
```

**Lección**: Siempre usar `japanese_format.py` para montos monetarios.

---

## Errores de Autenticación

### ❌ Usar `access_token` en lugar de `token`
```typescript
// INCORRECTO - Backend envía "token", no "access_token"
interface LoginResponse {
  access_token: string  // ❌ NO EXISTE
}
```

```typescript
// CORRECTO
interface LoginResponse {
  token: string  // ✓ Backend envía esto
}
```

**Lección**: Verificar la respuesta real del backend antes de asumir el nombre del campo.

### ❌ Usar router.push() después de login
```typescript
// INCORRECTO - AuthGuard no ve el nuevo token
if (result.success) {
  router.push('/')  // ❌ Causa redirect loop
}
```

```typescript
// CORRECTO - Force page reload para que AuthGuard lea localStorage fresco
if (result.success) {
  window.location.href = '/'  // ✓
}
```

**Lección**: useAuth tiene estado separado por instancia, necesita full page reload.

---

## Errores de Cálculo

### ❌ Doble conteo de licencia pagada
```python
# INCORRECTO - paid_leave ya está en gross_salary
total_cost = gross_salary + paid_leave_amount  # ❌ Doble conteo
```

```python
# CORRECTO
total_cost = gross_salary  # paid_leave ya incluido ✓
```

**Lección**: Leer `services.py` antes de modificar cálculos.

### ❌ Horas extra sin split en 60h
```python
# INCORRECTO - No considera el split
overtime_pay = overtime_hours * rate * 1.25  # ❌
```

```python
# CORRECTO
overtime_under_60 = min(overtime_hours, 60)
overtime_over_60 = max(0, overtime_hours - 60)
overtime_pay = overtime_under_60 * rate * 1.25 + overtime_over_60 * rate * 1.5
```

**Lección**: Horas >60 tienen rate diferente (1.5x vs 1.25x).

### ❌ Deep night como reemplazo
```python
# INCORRECTO - Night es EXTRA, no reemplazo
night_pay = night_hours * rate * 0.25  # ❌ Falta base
```

```python
# CORRECTO - Night es +0.25 ADICIONAL al base
# (night_hours ya están contadas en work_hours)
night_extra = night_hours * rate * 0.25  # Solo el extra
```

**Lección**: Deep night (0.25x) se SUMA al base, no lo reemplaza.

---

## Errores de Base de Datos

### ❌ Asumir SQLite siempre
```python
# INCORRECTO - No funciona en producción (PostgreSQL)
cursor.execute("SELECT * FROM users WHERE id = ?", (id,))
```

```python
# CORRECTO - Usar _q() para compatibilidad
cursor.execute(_q("SELECT * FROM users WHERE id = ?"), (id,))
```

**Lección**: Usar `_q()` de database.py para queries cross-database.

---

## Errores de UI

### ❌ Ordenar períodos alfabéticamente
```typescript
// INCORRECTO - "2025年10月" < "2025年2月" alfabéticamente
periods.sort()  // ❌
```

```typescript
// CORRECTO
import { comparePeriods } from '@/lib/utils'
periods.sort(comparePeriods)  // ✓
```

**Lección**: Usar `comparePeriods()` para ordenar períodos cronológicamente.

---

## Errores de Rate Limiting

### ❌ Rate limiting en memoria
```python
# PROBLEMÁTICO - No escala con múltiples workers
_rate_limit_store: Dict[str, list] = defaultdict(list)
```

**Estado**: Conocido pero no corregido aún. Requiere Redis.

---

## Errores de Seguridad

### ❌ Tokens en localStorage
```typescript
// PROBLEMÁTICO - Vulnerable a XSS
localStorage.setItem('auth_token', token)
```

**Estado**: Conocido. Solución: HttpOnly cookies (pendiente).

---

## Cómo Añadir Nuevos Errores

```markdown
### ❌ Descripción corta del error
\`\`\`código
// INCORRECTO - Explicación
código_malo()
\`\`\`

\`\`\`código
// CORRECTO
código_bueno()
\`\`\`

**Lección**: Resumen de qué aprendimos.
```

---

*Última actualización: 2026-01-10*
