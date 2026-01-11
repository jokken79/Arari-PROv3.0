# Auto Tester Agent (自動テストエージェント)

Un agente especializado en ejecutar y crear tests automáticos.

---

## Propósito

Combatir la incapacidad de verificar que el código funciona. Este agente proporciona comandos y patrones para testing.

---

## Comandos de Testing

### Backend (pytest)

```bash
# Todos los tests
cd arari-app/api
python -m pytest tests/ -v

# Test específico
python -m pytest tests/test_salary_calculations.py -v

# Test con coverage
python -m pytest tests/ -v --cov=. --cov-report=html

# Test single function
python -m pytest tests/test_salary_calculations.py::test_calculate_billing_amount -v

# Tests con output detallado
python -m pytest tests/ -v -s
```

### Frontend (Jest)

```bash
cd arari-app

# Todos los tests
npm test

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage

# Test específico
npm test -- --testPathPattern="utils"
```

---

## Archivos de Test Existentes

### Backend

| Archivo | Qué Prueba |
|---------|------------|
| `test_salary_calculations.py` | Cálculos de nómina y billing |
| `test_auth.py` | Autenticación y autorización |
| `test_database.py` | Operaciones de BD |
| `test_japanese_format.py` | Formato japonés |
| `test_reports.py` | Generación de reportes |
| `test_additional_costs.py` | Costos adicionales |
| `test_agent_commissions.py` | Comisiones de agentes |

### Frontend

| Archivo | Qué Prueba |
|---------|------------|
| `utils.test.ts` | Utilidades (comparePeriods, etc.) |
| `hooks.test.ts` | Custom hooks |
| `components.test.tsx` | Componentes React |

---

## Patrones de Test

### Backend - Test de Cálculo

```python
import pytest
from services import calculate_billing_amount

def test_calculate_billing_amount_normal():
    """Test billing amount with normal hours only."""
    result = calculate_billing_amount(
        work_hours=168,
        overtime_hours=0,
        overtime_over_60h=0,
        night_hours=0,
        holiday_hours=0,
        billing_rate=1500
    )
    assert result == 168 * 1500 * 1.0  # 252,000

def test_calculate_billing_amount_with_overtime():
    """Test billing with overtime under 60h."""
    result = calculate_billing_amount(
        work_hours=168,
        overtime_hours=30,  # Under 60
        overtime_over_60h=0,
        night_hours=0,
        holiday_hours=0,
        billing_rate=1500
    )
    expected = (168 * 1500) + (30 * 1500 * 1.25)
    assert result == expected

def test_calculate_billing_amount_overtime_over_60():
    """Test overtime over 60h uses 1.5x multiplier."""
    result = calculate_billing_amount(
        work_hours=168,
        overtime_hours=60,
        overtime_over_60h=20,  # 20 hours over 60
        night_hours=0,
        holiday_hours=0,
        billing_rate=1500
    )
    expected = (168 * 1500) + (60 * 1500 * 1.25) + (20 * 1500 * 1.5)
    assert result == expected
```

### Backend - Test de API

```python
import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_get_employees():
    """Test GET /api/employees returns list."""
    response = client.get("/api/employees")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_get_statistics():
    """Test GET /api/statistics returns expected structure."""
    response = client.get("/api/statistics")
    assert response.status_code == 200
    data = response.json()
    assert "total_employees" in data
    assert "total_billing" in data
```

### Frontend - Test de Utilidad

```typescript
import { comparePeriods, formatCurrency } from '@/lib/utils'

describe('comparePeriods', () => {
  it('should sort periods chronologically', () => {
    const periods = ['2025年2月', '2025年10月', '2025年1月']
    const sorted = periods.sort(comparePeriods)
    expect(sorted).toEqual(['2025年10月', '2025年2月', '2025年1月'])
  })
})

describe('formatCurrency', () => {
  it('should format yen correctly', () => {
    expect(formatCurrency(870000)).toBe('87万円')
  })
})
```

### Frontend - Test de Hook

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEmployees } from '@/hooks'

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
)

describe('useEmployees', () => {
  it('should fetch employees', async () => {
    const { result } = renderHook(() => useEmployees(), { wrapper })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toBeDefined()
  })
})
```

---

## Casos de Test Esenciales

### Para Cálculos de Margen

1. [ ] Margen con solo horas normales
2. [ ] Margen con overtime < 60h
3. [ ] Margen con overtime > 60h
4. [ ] Margen con deep night
5. [ ] Margen con holiday
6. [ ] Margen con combinación de todo
7. [ ] Edge: 0 horas
8. [ ] Edge: valores negativos
9. [ ] Edge: valores None/null

### Para Autenticación

1. [ ] Login exitoso
2. [ ] Login fallido - contraseña incorrecta
3. [ ] Login fallido - usuario no existe
4. [ ] Token válido
5. [ ] Token expirado
6. [ ] Token inválido
7. [ ] Rate limiting (5 intentos/minuto)
8. [ ] Cambio de contraseña
9. [ ] Permisos admin vs viewer

### Para Reportes

1. [ ] Generar reporte mensual
2. [ ] Reporte con período vacío
3. [ ] Formato de números (japonés)
4. [ ] PDF genera correctamente
5. [ ] Excel genera correctamente

---

## Crear Nuevo Test

### Paso 1: Identificar Función a Probar

```python
# Ejemplo: nueva función en services.py
def calculate_night_premium(hours: float, rate: float) -> float:
    return hours * rate * 0.25
```

### Paso 2: Crear Archivo de Test

```python
# tests/test_night_premium.py
import pytest
from services import calculate_night_premium

class TestNightPremium:
    def test_basic_calculation(self):
        result = calculate_night_premium(10, 1500)
        assert result == 10 * 1500 * 0.25  # 3,750

    def test_zero_hours(self):
        result = calculate_night_premium(0, 1500)
        assert result == 0

    def test_decimal_hours(self):
        result = calculate_night_premium(10.5, 1500)
        assert result == 10.5 * 1500 * 0.25
```

### Paso 3: Ejecutar Test

```bash
python -m pytest tests/test_night_premium.py -v
```

---

## Verificación de Coverage

```bash
# Generar reporte de coverage
cd arari-app/api
python -m pytest tests/ --cov=. --cov-report=html

# Ver reporte
open htmlcov/index.html
```

### Targets de Coverage

| Módulo | Target | Actual |
|--------|--------|--------|
| services.py | 90% | ~85% |
| auth.py | 80% | ~75% |
| database.py | 80% | ~70% |
| japanese_format.py | 95% | ~90% |

---

## Errores Comunes en Tests

### 1. Fixtures No Limpiados

```python
# MAL - datos persisten entre tests
def test_create_employee():
    create_employee("Test")  # Queda en BD

# BIEN - usar fixture con cleanup
@pytest.fixture
def clean_db():
    yield
    cleanup_test_data()
```

### 2. Tests Dependientes

```python
# MAL - test depende de otro
def test_a_create():
    create_item()

def test_b_get():
    get_item()  # Falla si test_a no corrió

# BIEN - tests independientes
def test_create_and_get():
    item = create_item()
    result = get_item(item.id)
    assert result == item
```

### 3. Hardcoded URLs

```python
# MAL
client.get("http://localhost:8000/api/employees")

# BIEN
client.get("/api/employees")
```

---

## Output del Agente

Después de ejecutar tests, reportar:

```markdown
## Resultado de Tests

### Backend (pytest)
- Total: 48 tests
- Passed: 46 ✓
- Failed: 2 ✗
- Coverage: 78%

### Errores Encontrados
1. `test_auth.py::test_token_expired` - Timeout
2. `test_reports.py::test_pdf_font` - Font not found

### Recomendaciones
1. Agregar mock para tests de auth
2. Instalar font HeiseiKakuGo-W5 para tests de PDF
```

---

*Agente creado: 2026-01-10*
*Propósito: Automatizar verificación de código con tests*
