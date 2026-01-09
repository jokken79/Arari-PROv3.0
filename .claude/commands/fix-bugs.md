# Fix Bugs Skill

Encuentra y corrige bugs en Arari PRO v3.0 basándose en el conocimiento profundo del sistema.

## Instrucciones

Cuando el usuario invoque este skill:

1. **Identificar el Bug**:
   - Leer descripción del usuario
   - Reproducir mentalmente el flujo
   - Identificar componentes involucrados

2. **Buscar en Código**:
   - Revisar archivos relevantes
   - Verificar lógica de negocio
   - Comprobar tipos y validaciones

3. **Analizar Causa Raíz**:
   - ¿Es bug de cálculo?
   - ¿Es bug de UI/UX?
   - ¿Es bug de datos/BD?
   - ¿Es bug de integración API?

4. **Implementar Fix**:
   - Aplicar corrección mínima
   - Añadir tests si corresponde
   - Verificar que no rompe otros flujos

## Uso

```
/fix-bugs [descripcion]
```

Ejemplos:
- `/fix-bugs El margen se calcula mal`
- `/fix-bugs Login no funciona después de expirar token`
- `/fix-bugs El gráfico de tendencias no muestra datos`

## Bugs Comunes Conocidos

### 1. Paid Leave Double-Counting
```python
# WRONG - paid_leave_amount ya está en gross_salary
total_cost = gross_salary + paid_leave_cost  # ❌

# CORRECT
total_cost = gross_salary  # Ya incluye paid_leave ✓
```
**Archivos**: `services.py:466-548`

### 2. Night Hours Extra (No Replacement)
```python
# Night premium = +0.25× ON TOP de regular/overtime
# NO ES replacement rate
billing += night_hours * billing_rate * 0.25  # EXTRA
```
**Archivos**: `services.py:375-439`

### 3. Overtime Split at 60 Hours
```python
overtime_hours = min(raw_overtime, 60)        # ×1.25
overtime_over_60h = max(0, raw_overtime - 60) # ×1.5
```
**Archivos**: `salary_parser.py`, `services.py`

### 4. Period Sorting (Alfabético falla)
```typescript
// WRONG: "2025年10月" < "2025年2月" alfabéticamente
periods.sort()  // ❌

// CORRECT: Usar comparePeriods()
periods.sort(comparePeriods)  // ✓
```
**Archivos**: `utils.ts`

### 5. Login Token Field Name
```typescript
// Backend retorna "token", NO "access_token"
const token = response.token  // ✓
```
**Archivos**: `useAuth.ts`

### 6. Login Redirect Loop
```typescript
// Usar window.location.href, NO router.push()
window.location.href = '/'  // ✓ Full page reload
```
**Archivos**: `login/page.tsx`, `useAuth.ts`

## Archivos por Área

| Área | Archivos |
|------|----------|
| Cálculos | `services.py`, `salary_parser.py` |
| Auth | `auth.py`, `useAuth.ts`, `AuthGuard.tsx` |
| UI | `components/`, `app/*/page.tsx` |
| API | `main.py`, `hooks/*.ts` |
| BD | `database.py`, `models.py` |

## Output

Para cada bug:
1. Descripción del problema
2. Causa raíz identificada
3. Archivos afectados
4. Código de corrección
5. Test para verificar fix
